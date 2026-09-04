import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AddInventoryNoteRequest,
  AllocateInventoryRequest,
  CreateInventoryItemRequest,
  CreateWarehouseRequest,
  EventTimelineEntry,
  InventoryAllocationDetailResponse,
  InventoryAllocationSummary,
  InventoryDashboardResponse,
  InventoryDamageReportSummary,
  InventoryItemDetailResponse,
  InventoryMaintenanceSummary,
  InventoryMovementSummary,
  InventoryNoteSummary,
  ReportInventoryDamageRequest,
  ReturnInventoryRequest,
  StartInventoryMaintenanceRequest,
  UpdateInventoryAllocationRequest,
  UpdateInventoryItemRequest,
  UpdateWarehouseRequest,
  WarehouseDashboardResponse,
  WarehouseDetailResponse,
  WarehouseSummary,
} from "@me-event/api-contracts";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import { InventoryService } from "../src/modules/inventory/application/inventory.service";
import type {
  InventoryListOptions,
  InventoryMutationContext,
  InventoryRepository,
} from "../src/modules/inventory/ports/inventory-repository";
import { PatternBSideEffects } from "./helpers/pattern-b-side-effects";

function timelineTypeForAllocationStatus(
  status: string,
): EventTimelineEntry["entryType"] | undefined {
  switch (status) {
    case "reserved":
      return "inventory_reserved";
    case "allocated":
      return "inventory_allocated";
    case "dispatched":
      return "inventory_dispatched";
    case "on_site":
      return "inventory_on_site";
    case "returned":
      return "inventory_returned";
    case "cancelled":
      return "inventory_cancelled";
    default:
      return undefined;
  }
}

function outboxTopicForAllocationStatus(status: string): string | undefined {
  switch (status) {
    case "reserved":
      return "inventory.reserved";
    case "allocated":
      return "inventory.allocated";
    case "dispatched":
      return "inventory.dispatched";
    case "on_site":
      return "inventory.on_site";
    case "returned":
      return "inventory.returned";
    case "cancelled":
      return "inventory.cancelled";
    default:
      return undefined;
  }
}

class FakeInventoryRepository implements InventoryRepository {
  public warehouses = new Map<string, WarehouseDetailResponse>();
  public items = new Map<string, InventoryItemDetailResponse>();
  public allocations = new Map<string, InventoryAllocationDetailResponse>();
  public movements: InventoryMovementSummary[] = [];
  public maintenance: InventoryMaintenanceSummary[] = [];
  public patternB = new PatternBSideEffects();

  public async listWarehouses(
    _branchId: string,
  ): Promise<readonly WarehouseSummary[]> {
    return [...this.warehouses.values()].map(
      ({ locations: _l, notes: _n, ...summary }) => summary,
    );
  }

  public async getWarehouse(
    warehouseId: string,
    branchId: string,
  ): Promise<WarehouseDetailResponse | undefined> {
    if (branchId !== "00000000-0000-4000-8000-000000000001") {
      return undefined;
    }
    return this.warehouses.get(warehouseId);
  }

  public async createWarehouse(
    input: InventoryMutationContext & { readonly body: CreateWarehouseRequest },
  ): Promise<WarehouseDetailResponse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const warehouse: WarehouseDetailResponse = {
      id,
      warehouseCode: "WH-TEST",
      name: input.body.name,
      warehouseType: input.body.warehouseType ?? "main",
      city: input.body.city,
      state: input.body.state,
      status: "active",
      locations: [],
      createdAt: now,
      updatedAt: now,
    };
    this.warehouses.set(id, warehouse);
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "warehouse",
      entityId: id,
      action: "warehouse.created",
      outboxTopic: "warehouse.created",
    });
    return warehouse;
  }

  public async updateWarehouse(
    input: InventoryMutationContext & {
      readonly warehouseId: string;
      readonly body: UpdateWarehouseRequest;
    },
  ): Promise<WarehouseDetailResponse | undefined> {
    const current = this.warehouses.get(input.warehouseId);
    if (current === undefined) return undefined;
    const updated = {
      ...current,
      name: input.body.name ?? current.name,
      updatedAt: new Date().toISOString(),
    };
    this.warehouses.set(input.warehouseId, updated);
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "warehouse",
      entityId: input.warehouseId,
      action: "warehouse.updated",
      outboxTopic: "warehouse.updated",
    });
    return updated;
  }

  public async getWarehouseDashboard(
    branchId: string,
  ): Promise<WarehouseDashboardResponse> {
    const warehouses = await this.listWarehouses(branchId);
    return {
      totalWarehouses: warehouses.length,
      activeWarehouses: warehouses.length,
      totalItems: this.items.size,
      availableItems: [...this.items.values()].filter(
        (i) => i.status === "available",
      ).length,
      warehouses,
      stockHighlights: [...this.items.values()],
    };
  }

  public async listItems(options: InventoryListOptions): Promise<{
    readonly items: readonly InventoryItemDetailResponse[];
    readonly total: number;
  }> {
    void options;
    const items = [...this.items.values()];
    return { items, total: items.length };
  }

  public async getItem(
    itemId: string,
    branchId: string,
  ): Promise<InventoryItemDetailResponse | undefined> {
    if (branchId !== "00000000-0000-4000-8000-000000000001") {
      return undefined;
    }
    return this.items.get(itemId);
  }

  public async createItem(
    input: InventoryMutationContext & {
      readonly body: CreateInventoryItemRequest;
    },
  ): Promise<InventoryItemDetailResponse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const item: InventoryItemDetailResponse = {
      id,
      inventoryCode: "INV-TEST",
      name: input.body.name,
      status: "available",
      condition: input.body.condition ?? "good",
      ownershipType: input.body.ownershipType ?? "owned",
      quantityOnHand: input.body.quantityOnHand ?? 1,
      photoPlaceholders: input.body.photoPlaceholders ?? [],
      createdAt: now,
      updatedAt: now,
      ...(input.body.warehouseId === undefined
        ? {}
        : { warehouseId: input.body.warehouseId }),
    };
    this.items.set(id, item);
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "inventory_item",
      entityId: id,
      action: "inventory.created",
      outboxTopic: "inventory.created",
    });
    return item;
  }

  public async updateItem(
    input: InventoryMutationContext & {
      readonly itemId: string;
      readonly body: UpdateInventoryItemRequest;
    },
  ): Promise<InventoryItemDetailResponse | undefined> {
    const current = this.items.get(input.itemId);
    if (current === undefined) return undefined;
    const updated = {
      ...current,
      name: input.body.name ?? current.name,
      status: input.body.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(input.itemId, updated);
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "inventory_item",
      entityId: input.itemId,
      action: "inventory.updated",
      outboxTopic: "inventory.updated",
    });
    return updated;
  }

  public async allocate(
    input: InventoryMutationContext & {
      readonly body: AllocateInventoryRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined> {
    const item = this.items.get(input.body.itemId);
    if (item === undefined) return undefined;
    const id = randomUUID();
    const now = new Date().toISOString();
    const status = input.body.status ?? "reserved";
    const timelineType =
      status === "allocated" ? "inventory_allocated" : "inventory_reserved";
    const timelineEntry = this.patternB.appendTimeline(
      input.body.eventRecordId,
      {
        entryType: timelineType,
        title:
          status === "allocated" ? "Inventory allocated" : "Inventory reserved",
        content: `${item.name} × ${input.body.quantity ?? 1}`,
        customerVisible: false,
        actorUserId: input.actorUserId,
      },
    );
    this.patternB.appendActivity(input.body.eventRecordId, {
      activityType: "inventory_allocation",
      content: `${item.name} ${status}`,
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: input.body.eventRecordId,
      action:
        status === "allocated" ? "inventory.allocated" : "inventory.reserved",
      outboxTopic:
        status === "allocated" ? "inventory.allocated" : "inventory.reserved",
    });
    const detail: InventoryAllocationDetailResponse = {
      id,
      eventRecordId: input.body.eventRecordId,
      itemId: input.body.itemId,
      itemName: item.name,
      quantity: input.body.quantity ?? 1,
      status,
      reservedAt: now,
      version: 1,
      eventNumber: "EV-TEST",
      movements: [
        {
          id: randomUUID(),
          itemId: item.id,
          allocationId: id,
          eventRecordId: input.body.eventRecordId,
          movementType: status === "allocated" ? "allocate" : "reserve",
          quantity: input.body.quantity ?? 1,
          occurredAt: now,
        },
      ],
      noteEntries: [],
      timeline: [timelineEntry],
    };
    this.allocations.set(id, detail);
    this.items.set(item.id, {
      ...item,
      status: status === "allocated" ? "allocated" : "reserved",
    });
    this.movements.push(detail.movements[0]!);
    return detail;
  }

  public async updateAllocation(
    input: InventoryMutationContext & {
      readonly allocationId: string;
      readonly body: UpdateInventoryAllocationRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined> {
    const current = this.allocations.get(input.allocationId);
    if (current === undefined) return undefined;
    const now = new Date().toISOString();
    const status = input.body.status ?? current.status;
    const timelineType = timelineTypeForAllocationStatus(status);
    const timelineEntry =
      timelineType === undefined
        ? undefined
        : this.patternB.appendTimeline(current.eventRecordId, {
            entryType: timelineType,
            title: timelineType.replaceAll("_", " "),
            content: `${current.itemName} → ${status}`,
            customerVisible: false,
            actorUserId: input.actorUserId,
          });
    if (timelineType !== undefined) {
      this.patternB.appendActivity(current.eventRecordId, {
        activityType: "inventory_movement",
        content: `${current.itemName} → ${status}`,
        customerVisible: false,
        actorUserId: input.actorUserId,
      });
    }
    const topic = outboxTopicForAllocationStatus(status);
    if (topic !== undefined) {
      this.patternB.writeAuditOutbox({
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        entityType: "event_record",
        entityId: current.eventRecordId,
        action: topic,
        outboxTopic: topic,
      });
    }
    const updated: InventoryAllocationDetailResponse = {
      ...current,
      status,
      version: current.version + 1,
      timeline:
        timelineEntry === undefined
          ? current.timeline
          : [timelineEntry, ...current.timeline],
      movements: [
        {
          id: randomUUID(),
          itemId: current.itemId,
          allocationId: current.id,
          eventRecordId: current.eventRecordId,
          movementType:
            status === "dispatched"
              ? "dispatch"
              : status === "on_site"
                ? "arrive_site"
                : "allocate",
          quantity: current.quantity,
          occurredAt: now,
        },
        ...current.movements,
      ],
    };
    this.allocations.set(input.allocationId, updated);
    this.movements.unshift(updated.movements[0]!);
    return updated;
  }

  public async returnAllocation(
    input: InventoryMutationContext & {
      readonly allocationId: string;
      readonly body: ReturnInventoryRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined> {
    const current = this.allocations.get(input.allocationId);
    if (current === undefined) return undefined;
    const now = new Date().toISOString();
    const timelineEntry = this.patternB.appendTimeline(current.eventRecordId, {
      entryType: "inventory_returned",
      title: "Inventory returned",
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(current.eventRecordId, {
      activityType: "inventory_movement",
      content: "Inventory returned",
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: current.eventRecordId,
      action: "inventory.returned",
      outboxTopic: "inventory.returned",
    });
    const updated: InventoryAllocationDetailResponse = {
      ...current,
      status: "returned",
      returnedAt: now,
      version: current.version + 1,
      timeline: [timelineEntry, ...current.timeline],
    };
    this.allocations.set(input.allocationId, updated);
    const item = this.items.get(current.itemId);
    if (item !== undefined) {
      this.items.set(current.itemId, { ...item, status: "available" });
    }
    return updated;
  }

  public async listAllocations(): Promise<
    readonly InventoryAllocationSummary[]
  > {
    return [...this.allocations.values()];
  }

  public async getAllocation(
    allocationId: string,
    branchId: string,
  ): Promise<InventoryAllocationDetailResponse | undefined> {
    if (branchId !== "00000000-0000-4000-8000-000000000001") {
      return undefined;
    }
    return this.allocations.get(allocationId);
  }

  public async listMovements(): Promise<readonly InventoryMovementSummary[]> {
    return this.movements;
  }

  public async reportDamage(
    input: InventoryMutationContext & {
      readonly body: ReportInventoryDamageRequest;
    },
  ): Promise<InventoryDamageReportSummary | undefined> {
    const item = this.items.get(input.body.itemId);
    if (item === undefined) return undefined;
    this.items.set(item.id, { ...item, status: "damaged" });
    return {
      id: randomUUID(),
      itemId: item.id,
      itemName: item.name,
      severity: input.body.severity ?? "minor",
      summary: input.body.summary,
      status: "open",
      createdAt: new Date().toISOString(),
    };
  }

  public async startMaintenance(
    input: InventoryMutationContext & {
      readonly body: StartInventoryMaintenanceRequest;
    },
  ): Promise<InventoryMaintenanceSummary | undefined> {
    const item = this.items.get(input.body.itemId);
    if (item === undefined) return undefined;
    this.items.set(item.id, { ...item, status: "maintenance" });
    const row: InventoryMaintenanceSummary = {
      id: randomUUID(),
      itemId: item.id,
      itemName: item.name,
      summary: input.body.summary,
      status: "in_progress",
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };
    this.maintenance.push(row);
    return row;
  }

  public async listMaintenance(): Promise<
    readonly InventoryMaintenanceSummary[]
  > {
    return this.maintenance;
  }

  public async addNote(
    input: InventoryMutationContext & {
      readonly itemId: string;
      readonly body: AddInventoryNoteRequest;
    },
  ): Promise<InventoryNoteSummary | undefined> {
    if (!this.items.has(input.itemId)) return undefined;
    return {
      id: randomUUID(),
      itemId: input.itemId,
      noteType: input.body.noteType ?? "internal",
      content: input.body.content,
      createdAt: new Date().toISOString(),
    };
  }

  public async getInventoryDashboard(
    _branchId: string,
  ): Promise<InventoryDashboardResponse> {
    const items = [...this.items.values()];
    const allocations = [...this.allocations.values()];
    return {
      totalItems: items.length,
      availableItems: items.filter((i) => i.status === "available").length,
      reservedItems: items.filter((i) => i.status === "reserved").length,
      onSiteItems: items.filter((i) => i.status === "on_site").length,
      maintenanceItems: items.filter((i) => i.status === "maintenance").length,
      openAllocations: allocations.filter(
        (a) => !["returned", "cancelled"].includes(a.status),
      ).length,
      items,
      allocations,
      recentMovements: this.movements,
    };
  }
}

const manager: AuthenticatedPrincipal = {
  userId: "manager-1",
  sessionId: "s1",
  activeRole: "manager",
  roleAssignments: [
    {
      role: "manager",
      active: true,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
  ],
};

describe("Inventory & Warehouse Foundation", () => {
  let repo: FakeInventoryRepository;
  let service: InventoryService;

  beforeEach(() => {
    repo = new FakeInventoryRepository();
    service = new InventoryService(repo);
  });

  it("runs reserve → allocate → dispatch → return with timeline", async () => {
    const eventRecordId = randomUUID();
    const warehouse = await service.createWarehouse(manager, {
      name: "Hyderabad Main",
      warehouseType: "main",
      city: "Hyderabad",
      state: "Telangana",
    });
    const item = await service.createItem(manager, {
      name: "Backdrop Panel",
      warehouseId: warehouse.id,
      quantityOnHand: 2,
      condition: "good",
      ownershipType: "owned",
    });

    const reserved = await service.allocate(manager, {
      eventRecordId,
      itemId: item.id,
      quantity: 1,
      status: "reserved",
    });
    await service.updateAllocation(manager, reserved.id, {
      status: "allocated",
    });
    await service.updateAllocation(manager, reserved.id, {
      status: "dispatched",
      vehiclePlaceholder: "Tempo-01",
    });
    await service.updateAllocation(manager, reserved.id, {
      status: "on_site",
      venuePlaceholder: "Venue hall",
    });
    await service.returnAllocation(manager, reserved.id, {
      returnedQuantity: 1,
      conditionOnReturn: "good",
      warehouseId: warehouse.id,
    });

    const detail = await service.getAllocation(manager, reserved.id);
    const types = detail.timeline.map((e) => e.entryType);

    expect(types).toContain("inventory_reserved");
    expect(types).toContain("inventory_allocated");
    expect(types).toContain("inventory_dispatched");
    expect(types).toContain("inventory_on_site");
    expect(types).toContain("inventory_returned");
    expect(detail.status).toBe("returned");
    expect(repo.patternB.activityTypes(eventRecordId)).toContain(
      "inventory_allocation",
    );
    expect(repo.patternB.activityTypes(eventRecordId)).toContain(
      "inventory_movement",
    );
    expect(repo.patternB.outboxTopics()).toContain("inventory.reserved");
    expect(repo.patternB.outboxTopics()).toContain("inventory.returned");
    expect(repo.patternB.auditActions()).toContain("inventory.dispatched");
    expect(repo.patternB.audits.some((a) => a.actorUserId && a.requestId)).toBe(
      true,
    );
  });

  it("exposes inventory dashboard counts", async () => {
    await service.createItem(manager, {
      name: "Chair set",
      quantityOnHand: 10,
      condition: "good",
      ownershipType: "owned",
    });
    const dashboard = await service.getInventoryDashboard(manager);
    expect(dashboard.totalItems).toBe(1);
    expect(dashboard.availableItems).toBe(1);
  });

  it("denies other-branch inventory allocation detail as 404", async () => {
    const item = await service.createItem(manager, {
      name: "Chair set",
      quantityOnHand: 10,
      condition: "good",
      ownershipType: "owned",
    });
    const reserved = await service.allocate(manager, {
      eventRecordId: randomUUID(),
      itemId: item.id,
      quantity: 1,
      status: "reserved",
    });
    const other: AuthenticatedPrincipal = {
      ...manager,
      userId: "other-branch",
      branchId: "00000000-0000-4000-8000-000000000002",
    };
    await expect(
      service.getAllocation(manager, reserved.id),
    ).resolves.toMatchObject({ id: reserved.id });
    await expect(
      service.getAllocation(other, reserved.id),
    ).rejects.toMatchObject({
      code: "INVENTORY_ALLOCATION_NOT_FOUND",
      status: 404,
    });
  });
});
