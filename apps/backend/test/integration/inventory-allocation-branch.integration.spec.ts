import type { InventoryItemDetailResponse } from "@me-event/api-contracts";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresInventoryRepository } from "../../src/modules/inventory/adapters/postgres-inventory.repository";
import { InventoryService } from "../../src/modules/inventory/application/inventory.service";
import type { AuthenticatedPrincipal } from "../../src/modules/platform-foundation/domain/platform-foundation";
import { createIntegrationPool } from "./support/database";
import { insertSyntheticBranch } from "./support/fixtures";
import {
  confirmPendingAdvance,
  createPendingAdvanceFlow,
} from "./support/workflow";

interface AllocationSideEffects {
  readonly allocations: number;
  readonly item_status: string;
  readonly item_version: number;
  readonly quantity_available: number;
  readonly quantity_reserved: number;
  readonly quantity_allocated: number;
  readonly stock_version: number;
  readonly movements: number;
  readonly event_timelines: number;
  readonly event_activities: number;
  readonly inventory_timelines: number;
  readonly inventory_activities: number;
  readonly outbox: number;
  readonly audits: number;
}

async function readAllocationSideEffects(
  pool: Pool,
  eventRecordId: string,
  itemId: string,
  requestId: string,
): Promise<AllocationSideEffects> {
  const result = await pool.query<AllocationSideEffects>(
    `SELECT
       (SELECT count(*)::int FROM inventory_allocations
        WHERE event_record_id = $1 OR item_id = $2) AS allocations,
       (SELECT status FROM inventory_items WHERE id = $2) AS item_status,
       (SELECT version FROM inventory_items WHERE id = $2) AS item_version,
       (SELECT quantity_available FROM inventory_stock WHERE item_id = $2) AS quantity_available,
       (SELECT quantity_reserved FROM inventory_stock WHERE item_id = $2) AS quantity_reserved,
       (SELECT quantity_allocated FROM inventory_stock WHERE item_id = $2) AS quantity_allocated,
       (SELECT version FROM inventory_stock WHERE item_id = $2) AS stock_version,
       (SELECT count(*)::int FROM inventory_movements
        WHERE event_record_id = $1 OR item_id = $2) AS movements,
       (SELECT count(*)::int FROM event_timelines
        WHERE event_record_id = $1
          AND entry_type IN ('inventory_reserved', 'inventory_allocated')) AS event_timelines,
       (SELECT count(*)::int FROM event_activities
        WHERE event_record_id = $1
          AND activity_type = 'inventory_allocation') AS event_activities,
       (SELECT count(*)::int FROM inventory_timelines
        WHERE item_id = $2
          AND entry_type IN ('inventory_reserved', 'inventory_allocated')) AS inventory_timelines,
       (SELECT count(*)::int FROM inventory_activities
        WHERE item_id = $2
          AND activity_type = 'inventory_allocation') AS inventory_activities,
       (SELECT count(*)::int FROM outbox_events
        WHERE aggregate_id = $1
          AND topic IN ('inventory.reserved', 'inventory.allocated')) AS outbox,
       (SELECT count(*)::int FROM audit_events
        WHERE request_id = $3) AS audits`,
    [eventRecordId, itemId, requestId],
  );
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error("Inventory allocation side-effect snapshot is missing");
  }
  return row;
}

function createInventoryItem(
  service: InventoryService,
  principal: AuthenticatedPrincipal,
  warehouseId: string,
  label: string,
  quantityOnHand: number,
): Promise<InventoryItemDetailResponse> {
  return service.createItem(
    principal,
    {
      name: `Synthetic ${label} inventory`,
      warehouseId,
      quantityOnHand,
      condition: "good",
      ownershipType: "owned",
    },
    `dbint-inventory-${label}-item`,
  );
}

async function expectBranchDeniedWithoutSideEffects(
  service: InventoryService,
  pool: Pool,
  principal: AuthenticatedPrincipal,
  eventRecordId: string,
  itemId: string,
  requestId: string,
  quantity: number,
): Promise<void> {
  const before = await readAllocationSideEffects(
    pool,
    eventRecordId,
    itemId,
    requestId,
  );
  await expect(
    service.allocate(
      principal,
      { eventRecordId, itemId, quantity, status: "reserved" },
      requestId,
    ),
  ).rejects.toMatchObject({
    code: "INVENTORY_ALLOCATE_FAILED",
    status: 404,
  });
  await expect(
    readAllocationSideEffects(pool, eventRecordId, itemId, requestId),
  ).resolves.toEqual(before);
}

describe("DBINT-14 inventory allocation branch isolation", () => {
  let pool: Pool;
  let service: InventoryService;
  let branchAPrincipal: AuthenticatedPrincipal;
  let branchBPrincipal: AuthenticatedPrincipal;
  let branchAEventId: string;
  let branchBEventId: string;
  let branchASuccessItem: InventoryItemDetailResponse;
  let branchADenialItem: InventoryItemDetailResponse;
  let branchBItem: InventoryItemDetailResponse;
  let concurrentItem: InventoryItemDetailResponse;

  beforeAll(async () => {
    pool = createIntegrationPool();
    service = new InventoryService(new PostgresInventoryRepository(pool));

    const branchAFlow = await createPendingAdvanceFlow(
      pool,
      "inventory-branch-a-event",
    );
    const branchAEvent = await confirmPendingAdvance(
      branchAFlow,
      "inventory-branch-a-event",
    );
    branchAPrincipal = branchAFlow.employee.principal;
    branchAEventId = branchAEvent.eventRecord.id;

    const branchB = await insertSyntheticBranch(pool, "inventory-branch-b");
    const branchBFlow = await createPendingAdvanceFlow(
      pool,
      "inventory-branch-b-event",
      branchB,
    );
    const branchBEvent = await confirmPendingAdvance(
      branchBFlow,
      "inventory-branch-b-event",
    );
    branchBPrincipal = branchBFlow.employee.principal;
    branchBEventId = branchBEvent.eventRecord.id;

    const branchAWarehouse = await service.createWarehouse(
      branchAPrincipal,
      {
        name: "Synthetic DBINT branch A warehouse",
        warehouseType: "branch",
        city: "Hyderabad",
        state: "Telangana",
      },
      "dbint-inventory-branch-a-warehouse",
    );
    const branchBWarehouse = await service.createWarehouse(
      branchBPrincipal,
      {
        name: "Synthetic DBINT branch B warehouse",
        warehouseType: "branch",
        city: "Secunderabad",
        state: "Telangana",
      },
      "dbint-inventory-branch-b-warehouse",
    );

    branchASuccessItem = await createInventoryItem(
      service,
      branchAPrincipal,
      branchAWarehouse.id,
      "same-branch",
      7,
    );
    branchADenialItem = await createInventoryItem(
      service,
      branchAPrincipal,
      branchAWarehouse.id,
      "branch-a-denial",
      5,
    );
    branchBItem = await createInventoryItem(
      service,
      branchBPrincipal,
      branchBWarehouse.id,
      "branch-b",
      5,
    );
    concurrentItem = await createInventoryItem(
      service,
      branchAPrincipal,
      branchAWarehouse.id,
      "concurrent",
      10,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("allows a same-branch event and item with the requested quantity", async () => {
    const requestId = "dbint-inventory-same-branch-allocate";
    const allocation = await service.allocate(
      branchAPrincipal,
      {
        eventRecordId: branchAEventId,
        itemId: branchASuccessItem.id,
        quantity: 3,
        status: "reserved",
      },
      requestId,
    );

    expect(allocation).toMatchObject({
      eventRecordId: branchAEventId,
      itemId: branchASuccessItem.id,
      quantity: 3,
      status: "reserved",
    });
    const evidence = await pool.query<{
      allocations: number;
      movements: number;
      event_timelines: number;
      event_activities: number;
      inventory_timelines: number;
      inventory_activities: number;
      audits: number;
      outbox: number;
      item_status: string;
      quantity_available: number;
      quantity_reserved: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM inventory_allocations WHERE id = $1) AS allocations,
         (SELECT count(*)::int FROM inventory_movements WHERE allocation_id = $1) AS movements,
         (SELECT count(*)::int FROM event_timelines
          WHERE event_record_id = $2 AND entry_type = 'inventory_reserved') AS event_timelines,
         (SELECT count(*)::int FROM event_activities
          WHERE event_record_id = $2 AND activity_type = 'inventory_allocation') AS event_activities,
         (SELECT count(*)::int FROM inventory_timelines
          WHERE item_id = $3 AND entry_type = 'inventory_reserved') AS inventory_timelines,
         (SELECT count(*)::int FROM inventory_activities
          WHERE item_id = $3 AND activity_type = 'inventory_allocation') AS inventory_activities,
         (SELECT count(*)::int FROM audit_events WHERE request_id = $4) AS audits,
         (SELECT count(*)::int FROM outbox_events
          WHERE aggregate_id = $2 AND topic = 'inventory.reserved'
            AND payload->>'allocationId' = $1::text) AS outbox,
         (SELECT status FROM inventory_items WHERE id = $3) AS item_status,
         (SELECT quantity_available FROM inventory_stock WHERE item_id = $3) AS quantity_available,
         (SELECT quantity_reserved FROM inventory_stock WHERE item_id = $3) AS quantity_reserved`,
      [allocation.id, branchAEventId, branchASuccessItem.id, requestId],
    );
    expect(evidence.rows[0]).toEqual({
      allocations: 1,
      movements: 1,
      event_timelines: 1,
      event_activities: 1,
      inventory_timelines: 1,
      inventory_activities: 1,
      audits: 1,
      outbox: 1,
      item_status: "reserved",
      quantity_available: 4,
      quantity_reserved: 3,
    });
  });

  it("denies a branch-A principal using a branch-B event as not found with no durable side effects", async () => {
    await expectBranchDeniedWithoutSideEffects(
      service,
      pool,
      branchAPrincipal,
      branchBEventId,
      branchADenialItem.id,
      "dbint-inventory-cross-branch-event",
      2,
    );
  });

  it("denies a branch-A principal using a branch-B item as not found with no durable side effects", async () => {
    await expectBranchDeniedWithoutSideEffects(
      service,
      pool,
      branchAPrincipal,
      branchAEventId,
      branchBItem.id,
      "dbint-inventory-cross-branch-item",
      2,
    );
  });

  it("denies an event and item that are both outside the principal branch", async () => {
    await expectBranchDeniedWithoutSideEffects(
      service,
      pool,
      branchAPrincipal,
      branchBEventId,
      branchBItem.id,
      "dbint-inventory-cross-branch-pair",
      1,
    );
  });

  it("serializes concurrent same-branch allocations and preserves both quantities", async () => {
    const allocations = await Promise.all([
      service.allocate(
        branchAPrincipal,
        {
          eventRecordId: branchAEventId,
          itemId: concurrentItem.id,
          quantity: 2,
          status: "reserved",
        },
        "dbint-inventory-concurrent-a",
      ),
      service.allocate(
        branchAPrincipal,
        {
          eventRecordId: branchAEventId,
          itemId: concurrentItem.id,
          quantity: 3,
          status: "reserved",
        },
        "dbint-inventory-concurrent-b",
      ),
    ]);

    expect(allocations.map((allocation) => allocation.quantity).sort()).toEqual(
      [2, 3],
    );
    const state = await pool.query<{
      item_status: string;
      item_version: number;
      quantity_available: number;
      quantity_reserved: number;
      quantity_allocated: number;
      stock_version: number;
      allocation_count: number;
      allocated_quantity: number;
    }>(
      `SELECT
         (SELECT status FROM inventory_items WHERE id = $1) AS item_status,
         (SELECT version FROM inventory_items WHERE id = $1) AS item_version,
         (SELECT quantity_available FROM inventory_stock WHERE item_id = $1) AS quantity_available,
         (SELECT quantity_reserved FROM inventory_stock WHERE item_id = $1) AS quantity_reserved,
         (SELECT quantity_allocated FROM inventory_stock WHERE item_id = $1) AS quantity_allocated,
         (SELECT version FROM inventory_stock WHERE item_id = $1) AS stock_version,
         (SELECT count(*)::int FROM inventory_allocations WHERE item_id = $1) AS allocation_count,
         (SELECT sum(quantity)::int FROM inventory_allocations WHERE item_id = $1) AS allocated_quantity`,
      [concurrentItem.id],
    );
    expect(state.rows[0]).toEqual({
      item_status: "reserved",
      item_version: 3,
      quantity_available: 5,
      quantity_reserved: 5,
      quantity_allocated: 0,
      stock_version: 3,
      allocation_count: 2,
      allocated_quantity: 5,
    });
  });
});
