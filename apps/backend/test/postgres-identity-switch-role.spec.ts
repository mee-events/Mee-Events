import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { PostgresIdentityRepository } from "../src/modules/identity/adapters/postgres-identity.repository";
import type { RoleSwitchPersistence } from "../src/modules/identity/ports/identity-repository";

/**
 * Transaction-unit tests with a mocked Pool/PoolClient.
 * These do not start PostgreSQL and are not live database integration tests.
 */
describe("PostgresIdentityRepository persistRoleSwitch (transaction-unit tests, mocked PoolClient)", () => {
  const persistence: RoleSwitchPersistence = {
    userId: "user-1",
    role: "worker",
    expectedVersion: 1,
    requestId: "req-switch-1",
    actorUserId: "user-1",
    actorRole: "customer",
    fromRole: "customer",
    toRole: "worker",
  };

  const updatedRow = {
    id: "user-1",
    mobile_e164: "+919876543210",
    last_active_role: "worker",
    created_at: new Date("2026-01-01T00:00:00Z"),
    updated_at: new Date("2026-08-14T00:00:00Z"),
    version: 2,
  };

  function normalize(sql: string): string {
    return sql.replace(/\s+/g, " ").trim();
  }

  function createHarness(options?: {
    updateRows?: unknown[];
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
    const query = vi.fn(async (sql: string, values?: unknown[]) => {
      const normalized = normalize(sql);
      statements.push(normalized);
      if (normalized === "BEGIN" || normalized === "COMMIT") {
        return { rows: [] };
      }
      if (normalized === "ROLLBACK") {
        return { rows: [] };
      }
      if (normalized.includes("UPDATE app_users")) {
        return { rows: options?.updateRows ?? [updatedRow], values };
      }
      if (normalized.includes("INSERT INTO audit_events")) {
        if (options?.failAudit === true) {
          throw new Error("audit insert failed");
        }
        return { rows: [], values };
      }
      if (normalized.includes("FROM role_assignments")) {
        return {
          rows: [
            {
              role: "customer",
              state: "active",
              scope_id: "00000000-0000-4000-8000-000000000001",
              verified_at: new Date("2026-01-01T00:00:00Z"),
            },
            {
              role: "worker",
              state: "active",
              scope_id: "00000000-0000-4000-8000-000000000001",
              verified_at: new Date("2026-01-01T00:00:00Z"),
            },
          ],
        };
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

  it("writes the role update and audit inside one transaction on the connected PoolClient", async () => {
    const { repository, client, poolQuery, statements } = createHarness();
    const updated = await repository.persistRoleSwitch(persistence);

    expect(updated?.lastActiveRole).toBe("worker");
    expect(updated?.version).toBe(2);
    expect(statements[0]).toBe("BEGIN");
    expect(statements[1]).toContain("UPDATE app_users");
    expect(statements[1]).toContain("WHERE id = $1 AND version = $3");
    expect(statements[2]).toContain("INSERT INTO audit_events");
    expect(statements[statements.length - 1]).toBe("COMMIT");
    expect(statements.indexOf("ROLLBACK")).toBe(-1);
    expect(client.query).toHaveBeenCalled();
    expect(poolQuery).not.toHaveBeenCalled();

    const updateCall = client.query.mock.calls.find((call) =>
      normalize(String(call[0])).includes("UPDATE app_users"),
    );
    const auditCall = client.query.mock.calls.find((call) =>
      normalize(String(call[0])).includes("INSERT INTO audit_events"),
    );
    expect(updateCall?.[1]).toEqual(["user-1", "worker", 1]);
    expect(auditCall?.[1]).toEqual([
      "req-switch-1",
      "user-1",
      "customer",
      null,
      "app_user",
      "user-1",
      "identity.role.switched",
      1,
      2,
      null,
      JSON.stringify({ fromRole: "customer", toRole: "worker" }),
    ]);
    const serialized = JSON.stringify(auditCall?.[1]);
    expect(serialized).not.toMatch(/accessToken|refreshToken|otp/i);
    expect(serialized).not.toContain("+919876543210");
  });

  it("rolls back and does not commit when audit insertion fails", async () => {
    const { repository, statements, poolQuery } = createHarness({
      failAudit: true,
    });

    await expect(repository.persistRoleSwitch(persistence)).rejects.toThrow(
      "audit insert failed",
    );
    expect(statements[0]).toBe("BEGIN");
    expect(statements.some((sql) => sql.includes("UPDATE app_users"))).toBe(
      true,
    );
    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("returns undefined on optimistic version mismatch without inserting audit", async () => {
    const { repository, statements, client } = createHarness({
      updateRows: [],
    });
    await expect(
      repository.persistRoleSwitch(persistence),
    ).resolves.toBeUndefined();
    expect(statements).toContain("BEGIN");
    expect(statements).toContain("COMMIT");
    expect(
      client.query.mock.calls.some((call) =>
        normalize(String(call[0])).includes("INSERT INTO audit_events"),
      ),
    ).toBe(false);
  });
});
