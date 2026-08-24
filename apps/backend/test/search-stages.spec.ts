import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { PostgresSearchRepository } from "../src/modules/search/adapters/postgres-search.repository";

describe("search stage parent context", () => {
  it("returns structured parent occasion fields and customer-facing subtitle", async () => {
    const pool = {
      query: async (sql: string) => {
        expect(sql).toContain("parent_occasion_code");
        expect(sql).toContain("event_types");
        expect(sql).not.toContain("Stage ·");
        return {
          rows: [
            {
              id: "st-1",
              code: "mehndi",
              display_name: "Mehndi",
              subtitle: "Function or ceremony",
              image_url: null,
              similarity: 1,
              parent_occasion_code: "wedding",
              parent_occasion_name: "Wedding",
            },
          ],
        };
      },
    } as unknown as Pool;
    const repo = new PostgresSearchRepository(pool);
    const hits = await repo.searchStages(["mehndi"], 10);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.code).toBe("mehndi");
    expect(hits[0]?.name).toBe("Mehndi");
    expect(hits[0]?.subtitle).toBe("Function or ceremony");
    expect(hits[0]?.parentOccasionCode).toBe("wedding");
    expect(hits[0]?.parentOccasionName).toBe("Wedding");
  });

  it("does not invent parent codes when the join yields none", async () => {
    const pool = {
      query: async () => ({ rows: [] }),
    } as unknown as Pool;
    const repo = new PostgresSearchRepository(pool);
    expect(await repo.searchStages(["unknown"], 10)).toEqual([]);
  });
});
