import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { PostgresIdentityRepository } from "../src/modules/identity/adapters/postgres-identity.repository";
import type { CompleteOtpVerificationInput } from "../src/modules/identity/ports/identity-repository";

/**
 * Transaction-unit tests with a mocked Pool/PoolClient.
 * These do not start PostgreSQL and are not live database integration tests.
 */
describe("PostgresIdentityRepository completeOtpVerification (transaction-unit tests, mocked PoolClient)", () => {
  const input: CompleteOtpVerificationInput = {
    challengeId: "challenge-1",
    deviceId: "device-1",
    sessionId: "session-1",
    refreshTokenDigest: "digest-1",
    now: new Date("2026-08-28T12:00:00.000Z"),
    expiresAt: new Date("2026-09-27T12:00:00.000Z"),
    requestId: "req-otp-1",
    defaultRole: "customer",
  };

  const challengeRow = {
    id: "challenge-1",
    mobile_e164: "+919876543210",
    code_digest: "digest",
    created_at: new Date("2026-08-28T11:55:00.000Z"),
    expires_at: new Date("2026-08-28T12:05:00.000Z"),
    resend_after: new Date("2026-08-28T11:56:00.000Z"),
    attempts_remaining: 5,
    consumed_at: new Date("2026-08-28T12:00:00.000Z"),
  };

  const userRow = {
    id: "user-1",
    mobile_e164: "+919876543210",
    last_active_role: "customer",
    created_at: new Date("2026-08-28T12:00:00.000Z"),
    updated_at: new Date("2026-08-28T12:00:00.000Z"),
    version: 1,
  };

  function normalize(sql: string): string {
    return sql.replace(/\s+/g, " ").trim();
  }

  function createHarness(options?: {
    consumeRows?: unknown[];
    failAudit?: boolean;
  }): {
    repository: PostgresIdentityRepository;
    client: PoolClient & {
      query: ReturnType<typeof vi.fn>;
      release: ReturnType<typeof vi.fn>;
    };
    poolQuery: ReturnType<typeof vi.fn>;
    statements: string[];
  } {
    const statements: string[] = [];
    const query = vi.fn(async (sql: string) => {
      const normalized = normalize(sql);
      statements.push(normalized);
      if (normalized === "BEGIN" || normalized === "COMMIT") {
        return { rows: [] };
      }
      if (normalized === "ROLLBACK") {
        return { rows: [] };
      }
      if (normalized.includes("UPDATE otp_challenges")) {
        return { rows: options?.consumeRows ?? [challengeRow] };
      }
      if (normalized.includes("INSERT INTO app_users")) {
        return { rows: [userRow] };
      }
      if (normalized.includes("INSERT INTO role_assignments")) {
        return {
          rows: [
            {
              role: "customer",
              state: "active",
              scope_id: "00000000-0000-4000-8000-000000000001",
              verified_at: new Date("2026-08-28T12:00:00.000Z"),
            },
          ],
        };
      }
      if (normalized.includes("INSERT INTO audit_events")) {
        if (options?.failAudit === true) {
          throw new Error("audit insert failed");
        }
        return { rows: [] };
      }
      return { rows: [] };
    });
    const client = {
      query,
      release: vi.fn(),
    };
    const poolQuery = vi.fn();
    const pool = {
      connect: vi.fn(async () => client),
      query: poolQuery,
    } as unknown as Pool;
    const repository = new PostgresIdentityRepository(pool);
    return {
      repository,
      client: client as unknown as PoolClient & {
        query: ReturnType<typeof vi.fn>;
        release: ReturnType<typeof vi.fn>;
      },
      poolQuery,
      statements,
    };
  }

  it("consumes the challenge, writes user/session/audit, and commits on one client", async () => {
    const { repository, client, poolQuery, statements } = createHarness();
    const result = await repository.completeOtpVerification(input);

    expect(result.outcome).toBe("completed");
    expect(statements[0]).toBe("BEGIN");
    expect(
      statements.some((sql) => sql.includes("UPDATE otp_challenges")),
    ).toBe(true);
    expect(
      statements.some((sql) => sql.includes("INSERT INTO app_users")),
    ).toBe(true);
    expect(
      statements.some((sql) => sql.includes("INSERT INTO device_sessions")),
    ).toBe(true);
    expect(
      statements.filter((sql) => sql.includes("INSERT INTO audit_events")),
    ).toHaveLength(2);
    expect(statements[statements.length - 1]).toBe("COMMIT");
    expect(statements.indexOf("ROLLBACK")).toBe(-1);
    expect(poolQuery).not.toHaveBeenCalled();
    const auditValues: unknown[] = [];
    for (const call of client.query.mock.calls) {
      if (normalize(String(call[0])).includes("INSERT INTO audit_events")) {
        auditValues.push(call[1]);
      }
    }
    const serialized = JSON.stringify(auditValues);
    expect(serialized).not.toMatch(/accessToken|refreshToken/i);
    expect(serialized).not.toContain("digest-1");
  });

  it("rolls back consume and session when audit insertion fails", async () => {
    const { repository, statements, poolQuery } = createHarness({
      failAudit: true,
    });
    await expect(repository.completeOtpVerification(input)).rejects.toThrow(
      "audit insert failed",
    );
    expect(statements[0]).toBe("BEGIN");
    expect(
      statements.some((sql) => sql.includes("UPDATE otp_challenges")),
    ).toBe(true);
    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("returns invalid without inserting a session when consume loses", async () => {
    const { repository, statements, client } = createHarness({
      consumeRows: [],
    });
    await expect(repository.completeOtpVerification(input)).resolves.toEqual({
      outcome: "invalid",
    });
    expect(statements).toContain("BEGIN");
    expect(statements).toContain("COMMIT");
    expect(
      client.query.mock.calls.some((call) =>
        normalize(String(call[0])).includes("INSERT INTO device_sessions"),
      ),
    ).toBe(false);
  });
});
