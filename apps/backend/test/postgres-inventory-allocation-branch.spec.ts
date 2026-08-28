import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { PostgresInventoryRepository } from "../src/modules/inventory/adapters/postgres-inventory.repository";
import { InventoryService } from "../src/modules/inventory/application/inventory.service";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";

const BRANCH_A = "00000000-0000-4000-8000-000000000001";
const EVENT_ID = "10000000-0000-4000-8000-000000000001";
const ITEM_ID = "20000000-0000-4000-8000-000000000001";

const principal: AuthenticatedPrincipal = {
  userId: "30000000-0000-4000-8000-000000000001",
  sessionId: "40000000-0000-4000-8000-000000000001",
  activeRole: "employee",
  roleAssignments: [{ role: "employee", active: true, scopeId: BRANCH_A }],
  branchId: BRANCH_A,
};

function normalize(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function createHarness(options: {
  readonly eventFound: boolean;
  readonly itemFound: boolean;
}): {
  readonly service: InventoryService;
  readonly client: PoolClient & { query: ReturnType<typeof vi.fn> };
  readonly statements: readonly string[];
} {
  const statements: string[] = [];
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    const normalized = normalize(sql);
    statements.push(normalized);
    if (normalized.includes("FROM event_records")) {
      return {
        rows: options.eventFound
          ? [
              {
                id: EVENT_ID,
                branch_id: BRANCH_A,
                version: 1,
                event_number: "EV-TEST",
              },
            ]
          : [],
        values,
      };
    }
    if (normalized.includes("FROM inventory_items")) {
      return {
        rows: options.itemFound
          ? [
              {
                id: ITEM_ID,
                name: "Test inventory item",
                status: "available",
                warehouse_id: null,
                quantity_on_hand: 1,
              },
            ]
          : [],
        values,
      };
    }
    return { rows: [] };
  });
  const client = { query, release: vi.fn() };
  const pool = {
    connect: vi.fn(async () => client),
    query: vi.fn(),
  } as unknown as Pool;
  const repository = new PostgresInventoryRepository(pool);
  return {
    service: new InventoryService(repository),
    client: client as unknown as PoolClient & {
      query: ReturnType<typeof vi.fn>;
    },
    statements,
  };
}

function expectNoMutation(statements: readonly string[]): void {
  expect(
    statements.filter((statement) =>
      /^(INSERT|UPDATE|DELETE) /.test(statement),
    ),
  ).toEqual([]);
}

describe("PostgresInventoryRepository allocation branch locks", () => {
  it("treats an event outside the active branch as not found before reading or writing inventory", async () => {
    const { service, client, statements } = createHarness({
      eventFound: false,
      itemFound: true,
    });

    await expect(
      service.allocate(
        principal,
        {
          eventRecordId: EVENT_ID,
          itemId: ITEM_ID,
          quantity: 1,
          status: "reserved",
        },
        "inventory-cross-event",
      ),
    ).rejects.toMatchObject({
      code: "INVENTORY_ALLOCATE_FAILED",
      status: 404,
    });

    const eventLock = client.query.mock.calls.find((call) =>
      normalize(String(call[0])).includes("FROM event_records"),
    );
    expect(normalize(String(eventLock?.[0]))).toContain(
      "WHERE id = $1 AND branch_id = $2 FOR UPDATE",
    );
    expect(eventLock?.[1]).toEqual([EVENT_ID, BRANCH_A]);
    expect(
      statements.some((statement) =>
        statement.includes("FROM inventory_items"),
      ),
    ).toBe(false);
    expect(statements).toEqual([
      "BEGIN",
      expect.stringContaining("FROM event_records"),
      "ROLLBACK",
    ]);
    expectNoMutation(statements);
  });

  it("treats an inventory item outside the active branch as not found before any mutation", async () => {
    const { service, client, statements } = createHarness({
      eventFound: true,
      itemFound: false,
    });

    await expect(
      service.allocate(
        principal,
        {
          eventRecordId: EVENT_ID,
          itemId: ITEM_ID,
          quantity: 1,
          status: "reserved",
        },
        "inventory-cross-item",
      ),
    ).rejects.toMatchObject({
      code: "INVENTORY_ALLOCATE_FAILED",
      status: 404,
    });

    const itemLock = client.query.mock.calls.find((call) =>
      normalize(String(call[0])).includes("FROM inventory_items"),
    );
    expect(normalize(String(itemLock?.[0]))).toContain(
      "WHERE id = $1 AND branch_id = $2 FOR UPDATE",
    );
    expect(itemLock?.[1]).toEqual([ITEM_ID, BRANCH_A]);
    expect(statements.at(-1)).toBe("ROLLBACK");
    expectNoMutation(statements);
  });
});
