import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  sort: z.string().trim().min(1).max(64).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly offset: number;
  readonly sort?: string;
  readonly order: "asc" | "desc";
  readonly search?: string;
  /** True when the client sent any pagination-related query param. */
  readonly requested: boolean;
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

/**
 * Parse list query params.
 * When no pagination params are sent, returns defaults with `requested: false`
 * so callers can preserve legacy full-list behaviour for existing clients.
 * Oversized `limit` values are clamped to MAX_LIMIT (not rejected).
 */
export function parsePagination(
  query: PaginationQueryInput | Record<string, unknown> | undefined,
): PaginationParams {
  const raw = query ?? {};
  const parsed = paginationQuerySchema.safeParse(raw);
  const value = parsed.success ? parsed.data : {};
  const requested =
    "page" in raw ||
    "limit" in raw ||
    "sort" in raw ||
    "order" in raw ||
    "search" in raw;
  const page = value.page ?? DEFAULT_PAGE;
  const limit = Math.min(value.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    order: value.order ?? "desc",
    requested,
    ...(value.sort === undefined ? {} : { sort: value.sort }),
    ...(value.search === undefined ? {} : { search: value.search }),
  };
}

export function buildPaginationMeta(input: {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}): PaginationMeta {
  const totalPages =
    input.limit <= 0 ? 0 : Math.max(1, Math.ceil(input.total / input.limit));
  const page = Math.min(Math.max(input.page, 1), Math.max(totalPages, 1));
  return {
    page,
    limit: input.limit,
    total: input.total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1 && input.total > 0,
  };
}

/**
 * Non-breaking paginated envelope.
 * Keeps the existing resource key (e.g. `vendors`) for clients, adds optional
 * `data` alias + `meta` when pagination was requested.
 */
export function paginatedCollection<K extends string, T>(
  resourceKey: K,
  items: readonly T[],
  meta: PaginationMeta | undefined,
): Record<K, readonly T[]> & {
  readonly data?: readonly T[];
  readonly meta?: PaginationMeta;
} {
  if (meta === undefined) {
    return { [resourceKey]: items } as Record<K, readonly T[]>;
  }
  return {
    [resourceKey]: items,
    data: items,
    meta,
  } as Record<K, readonly T[]> & {
    readonly data: readonly T[];
    readonly meta: PaginationMeta;
  };
}

/** SQL LIMIT/OFFSET fragment helpers — params appended by caller. */
export function sqlLimitOffset(params: {
  readonly limit: number;
  readonly offset: number;
  readonly startIndex: number;
}): { readonly sql: string; readonly values: readonly number[] } {
  return {
    sql: `LIMIT $${params.startIndex} OFFSET $${params.startIndex + 1}`,
    values: [params.limit, params.offset],
  };
}
