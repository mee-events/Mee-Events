import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import {
  claimOutboxBatch,
  markOutboxAttemptFailed,
  markOutboxPublished,
  OUTBOX_LEASE_SECONDS,
  OUTBOX_MAX_ATTEMPTS,
} from "../src/common/outbox/outbox-delivery";

/**
 * SQL-shape tests with a mocked Pool/PoolClient.
 * These do not start PostgreSQL and are not live database integration tests.
 */
describe("outbox delivery helper (transaction-unit tests, mocked PoolClient)", () => {
  function normalize(sql: string): string {
    return sql.replace(/\s+/g, " ").trim();
  }

  function createHarness(options?: {
    readonly claimRows?: { id: string; payload: unknown; attempts: number }[];
    readonly publishRows?: { id: string }[];
    readonly failRows?: { status: "failed" | "pending" }[];
  }): {
    readonly pool: Pool;
    readonly statements: string[];
    readonly claimParams: unknown[][];
    readonly completeParams: unknown[][];
  } {
    const statements: string[] = [];
    const claimParams: unknown[][] = [];
    const completeParams: unknown[][] = [];
    const clientQuery = vi.fn(async (sql: string, params?: unknown[]) => {
      const normalized = normalize(sql);
      statements.push(normalized);
      if (normalized === "BEGIN" || normalized === "COMMIT") {
        return { rows: [] };
      }
      if (normalized === "ROLLBACK") {
        return { rows: [] };
      }
      if (normalized.includes("FOR UPDATE SKIP LOCKED")) {
        claimParams.push(params ?? []);
        return { rows: options?.claimRows ?? [] };
      }
      return { rows: [] };
    });
    const poolQuery = vi.fn(async (sql: string, params?: unknown[]) => {
      const normalized = normalize(sql);
      statements.push(normalized);
      completeParams.push(params ?? []);
      if (normalized.includes("status = 'published'")) {
        return { rows: options?.publishRows ?? [] };
      }
      if (normalized.includes("WHEN attempts >=")) {
        return { rows: options?.failRows ?? [] };
      }
      return { rows: [] };
    });
    const client = {
      query: clientQuery,
      release: vi.fn(),
    } as unknown as PoolClient;
    const pool = {
      connect: vi.fn(async () => client),
      query: poolQuery,
    } as unknown as Pool;
    return { pool, statements, claimParams, completeParams };
  }

  it("claims pending and lease-expired processing rows with SKIP LOCKED and a lease", async () => {
    const harness = createHarness({
      claimRows: [
        { id: "outbox-1", payload: { enquiryId: "enq-1" }, attempts: 1 },
      ],
    });
    const claimed = await claimOutboxBatch(
      harness.pool,
      "enquiry.submitted",
      20,
    );
    expect(claimed).toEqual([
      { id: "outbox-1", payload: { enquiryId: "enq-1" }, attempts: 1 },
    ]);
    const claimSql = harness.statements.find((sql) =>
      sql.includes("FOR UPDATE SKIP LOCKED"),
    );
    expect(claimSql).toContain("status IN ('pending', 'processing')");
    expect(claimSql).toContain("available_at <= now()");
    expect(claimSql).toContain("FOR UPDATE SKIP LOCKED");
    expect(claimSql).toContain(
      "available_at = now() + make_interval(secs => $3::int)",
    );
    expect(harness.claimParams[0]).toEqual([
      "enquiry.submitted",
      20,
      OUTBOX_LEASE_SECONDS,
    ]);
    expect(harness.statements).toContain("BEGIN");
    expect(harness.statements).toContain("COMMIT");
  });

  it("publishes only the claimed processing generation", async () => {
    const harness = createHarness({
      publishRows: [{ id: "outbox-1" }],
    });
    await expect(
      markOutboxPublished(harness.pool, "outbox-1", 3),
    ).resolves.toBe(true);
    const publishSql = harness.statements.find((sql) =>
      sql.includes("status = 'published'"),
    );
    expect(publishSql).toContain("status = 'processing'");
    expect(publishSql).toContain("attempts = $2");
    expect(harness.completeParams[0]).toEqual(["outbox-1", 3]);
  });

  it("ignores publish and fail CAS when another worker stole the lease", async () => {
    const harness = createHarness({
      publishRows: [],
      failRows: [],
    });
    await expect(
      markOutboxPublished(harness.pool, "outbox-1", 1),
    ).resolves.toBe(false);
    await expect(
      markOutboxAttemptFailed(harness.pool, "outbox-1", 1, "boom"),
    ).resolves.toBe("ignored");
  });

  it("dead-letters at max attempts and otherwise returns the row to pending", async () => {
    const failed = createHarness({
      failRows: [{ status: "failed" }],
    });
    await expect(
      markOutboxAttemptFailed(failed.pool, "outbox-1", 8, "poison"),
    ).resolves.toBe("failed");
    expect(failed.completeParams[0]).toEqual([
      "outbox-1",
      8,
      "poison",
      OUTBOX_MAX_ATTEMPTS,
    ]);

    const pending = createHarness({
      failRows: [{ status: "pending" }],
    });
    await expect(
      markOutboxAttemptFailed(pending.pool, "outbox-1", 2, "transient"),
    ).resolves.toBe("pending");
  });
});
