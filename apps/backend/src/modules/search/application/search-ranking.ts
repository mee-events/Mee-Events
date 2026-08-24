import type { SearchResultType } from "@me-event/api-contracts";

/** Lower type-priority number = higher rank (after exact-match boost). */
export const TYPE_PRIORITY: Readonly<Record<SearchResultType, number>> = {
  occasion: 2,
  service: 3,
  package: 4,
  product: 4,
  vendor: 5,
  venue: 6,
  category: 7,
  stage: 8,
  theme: 9,
  offer: 9,
  city: 9,
  collection: 9,
  blog: 9,
  faq: 9,
  help: 9,
  coupon: 9,
  artist: 9,
  saved: 9,
  other: 10,
};

export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/gu, " ").toLowerCase();
}

export function tokenize(query: string): readonly string[] {
  return normalizeQuery(query)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Score a candidate name against the query. Higher is better. */
export function scoreMatch(input: {
  readonly name: string;
  readonly query: string;
  readonly type: SearchResultType;
  readonly similarity?: number;
}): number {
  const name = input.name.trim().toLowerCase();
  const query = normalizeQuery(input.query);
  if (name.length === 0 || query.length === 0) {
    return 0;
  }

  let matchBoost = 0;
  if (name === query) {
    matchBoost = 1000;
  } else if (name.startsWith(query)) {
    matchBoost = 800;
  } else if (name.split(/\s+/u).some((part) => part.startsWith(query))) {
    matchBoost = 650;
  } else if (name.includes(query)) {
    matchBoost = 500;
  } else {
    const sim = input.similarity ?? 0;
    if (sim >= 0.35) {
      matchBoost = Math.round(sim * 400);
    } else {
      return 0;
    }
  }

  const typePenalty = (TYPE_PRIORITY[input.type] ?? 10) * 10;
  return matchBoost - typePenalty;
}

export function compareHits(
  a: {
    readonly score: number;
    readonly type: SearchResultType;
    readonly name: string;
  },
  b: {
    readonly score: number;
    readonly type: SearchResultType;
    readonly name: string;
  },
): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  const typeDiff =
    (TYPE_PRIORITY[a.type] ?? 10) - (TYPE_PRIORITY[b.type] ?? 10);
  if (typeDiff !== 0) {
    return typeDiff;
  }
  return a.name.localeCompare(b.name);
}
