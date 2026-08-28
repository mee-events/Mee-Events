import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { PostgresLeadRepository } from "../src/modules/crm/adapters/postgres-lead.repository";

/**
 * Transaction-unit tests with a mocked Pool/PoolClient.
 * These do not start PostgreSQL and are not live database integration tests.
 */
describe("PostgresLeadRepository createFromEnquirySubmitted (transaction-unit tests, mocked PoolClient)", () => {
  const payload = {
    enquiryId: "enq-1",
    branchId: "branch-1",
    customerId: "cust-1",
    firstResponseDueAt: "2026-08-26T13:00:00.000Z",
  };

  function normalize(sql: string): string {
    return sql.replace(/\s+/g, " ").trim();
  }

  function createHarness(options: {
    readonly selectRows: { id: string }[];
    readonly insertError?: Error & { code: string };
    readonly racedSelectRows?: { id: string }[];
  }): PostgresLeadRepository {
    const clientQuery = vi.fn(async (sql: string) => {
      const normalized = normalize(sql);
      if (normalized === "BEGIN" || normalized === "COMMIT") {
        return { rows: [] };
      }
      if (normalized === "ROLLBACK") {
        return { rows: [] };
      }
      if (normalized.includes("SELECT id FROM leads WHERE enquiry_id")) {
        return { rows: options.selectRows };
      }
      if (normalized.includes("INSERT INTO leads")) {
        if (options.insertError !== undefined) {
          throw options.insertError;
        }
        return { rows: [{ id: "lead-new", version: 1 }] };
      }
      if (normalized.includes("INSERT INTO lead_activities")) {
        return { rows: [] };
      }
      if (normalized.includes("INSERT INTO audit_events")) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const poolQuery = vi.fn(async (sql: string) => {
      const normalized = normalize(sql);
      if (normalized.includes("SELECT id FROM leads WHERE enquiry_id")) {
        return { rows: options.racedSelectRows ?? [] };
      }
      return { rows: [] };
    });
    const pool = {
      connect: vi.fn(async () => {
        return {
          query: clientQuery,
          release: vi.fn(),
        } as unknown as PoolClient;
      }),
      query: poolQuery,
    } as unknown as Pool;
    return new PostgresLeadRepository(pool);
  }

  it("returns the existing lead without inserting when enquiry_id already has a row", async () => {
    const repository = createHarness({
      selectRows: [{ id: "lead-existing" }],
    });
    await expect(
      repository.createFromEnquirySubmitted(payload),
    ).resolves.toEqual({ leadId: "lead-existing", created: false });
  });

  it("treats a concurrent enquiry_id unique violation as an idempotent hit", async () => {
    const repository = createHarness({
      selectRows: [],
      insertError: Object.assign(new Error("duplicate key"), { code: "23505" }),
      racedSelectRows: [{ id: "lead-winner" }],
    });
    await expect(
      repository.createFromEnquirySubmitted(payload),
    ).resolves.toEqual({ leadId: "lead-winner", created: false });
  });

  it("rethrows a unique violation when no lead exists for the enquiry", async () => {
    const repository = createHarness({
      selectRows: [],
      insertError: Object.assign(new Error("duplicate key"), { code: "23505" }),
      racedSelectRows: [],
    });
    await expect(
      repository.createFromEnquirySubmitted(payload),
    ).rejects.toMatchObject({ code: "23505" });
  });
});
