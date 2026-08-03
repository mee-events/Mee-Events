import { describe, expect, it } from "vitest";
import {
  buildPaginationMeta,
  parsePagination,
  paginatedCollection,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "../src/common/pagination/pagination";

describe("pagination helpers", () => {
  it("defaults to page 1 / limit 20 when no params are sent", () => {
    const parsed = parsePagination({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(DEFAULT_LIMIT);
    expect(parsed.requested).toBe(false);
  });

  it("clamps limit to 100", () => {
    const parsed = parsePagination({ page: "2", limit: "500" });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(MAX_LIMIT);
    expect(parsed.offset).toBe(100);
    expect(parsed.requested).toBe(true);
  });

  it("builds meta with hasNext / hasPrevious", () => {
    const meta = buildPaginationMeta({ page: 2, limit: 20, total: 55 });
    expect(meta).toEqual({
      page: 2,
      limit: 20,
      total: 55,
      totalPages: 3,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it("keeps resource key and omits meta when not requested", () => {
    const body = paginatedCollection("vendors", [{ id: "1" }], undefined);
    expect(body).toEqual({ vendors: [{ id: "1" }] });
    expect("meta" in body).toBe(false);
    expect("data" in body).toBe(false);
  });

  it("adds data alias + meta when paginated", () => {
    const meta = buildPaginationMeta({ page: 1, limit: 20, total: 1 });
    const body = paginatedCollection("vendors", [{ id: "1" }], meta);
    expect(body.vendors).toEqual([{ id: "1" }]);
    expect(body.data).toEqual([{ id: "1" }]);
    expect(body.meta).toEqual(meta);
  });
});
