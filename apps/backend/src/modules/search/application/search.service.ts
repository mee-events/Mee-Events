import { Inject, Injectable } from "@nestjs/common";
import type { SearchHit, SearchResponse } from "@me-event/api-contracts";
import { PostgresSearchRepository } from "../adapters/postgres-search.repository";
import { compareHits, normalizeQuery, tokenize } from "./search-ranking";
import {
  SEARCH_PROVIDERS,
  type SearchProvider,
} from "../ports/search-provider";

const DEFAULT_PER_PROVIDER = 10;
const DEFAULT_PAGE_SIZE = 30;

@Injectable()
export class SearchService {
  public constructor(
    private readonly repo: PostgresSearchRepository,
    @Inject(SEARCH_PROVIDERS)
    private readonly providers: readonly SearchProvider[],
  ) {}

  public async search(input: {
    readonly q: string;
    readonly limit?: number;
    readonly cursor?: string;
  }): Promise<SearchResponse> {
    const query = normalizeQuery(input.q);
    if (query.length === 0) {
      return { query: "", results: [], nextCursor: null };
    }

    const limit = Math.min(Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1), 50);
    const offset = decodeCursor(input.cursor);
    const tokens = tokenize(query);
    const aliasTerms = await this.repo.resolveAliasTerms(query);
    const terms =
      aliasTerms.length > 0 ? aliasTerms : ([query, ...tokens] as const);

    const batches = await Promise.all(
      this.providers.map((provider) =>
        provider.search({
          query,
          tokens,
          aliasTerms: terms,
          limit: DEFAULT_PER_PROVIDER,
        }),
      ),
    );

    const merged = new Map<string, SearchHit>();
    for (const batch of batches) {
      for (const hit of batch) {
        if (hit.score <= 0) {
          continue;
        }
        const key = `${hit.type}:${hit.code}`;
        const existing = merged.get(key);
        if (existing === undefined || hit.score > existing.score) {
          merged.set(key, hit);
        }
      }
    }

    const ranked = [...merged.values()].sort(compareHits);
    const page = ranked.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const nextCursor =
      nextOffset < ranked.length ? encodeCursor(nextOffset) : null;

    return {
      query,
      results: page,
      nextCursor,
    };
  }

  public async trending(): Promise<readonly string[]> {
    return this.repo.listTrendingTerms();
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): number {
  if (cursor === undefined || cursor.trim().length === 0) {
    return 0;
  }
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}
