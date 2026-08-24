import type { SearchHit, SearchResultType } from "@me-event/api-contracts";

export const SEARCH_PROVIDERS = Symbol("SEARCH_PROVIDERS");

export interface SearchProviderContext {
  readonly query: string;
  /** Normalized lowercase query tokens. */
  readonly tokens: readonly string[];
  /** Alias expansions resolved from catalog_aliases. */
  readonly aliasTerms: readonly string[];
  readonly limit: number;
}

export interface SearchProvider {
  readonly type: SearchResultType;
  search(context: SearchProviderContext): Promise<readonly SearchHit[]>;
}
