import { Inject, Injectable } from "@nestjs/common";
import type {
  AddInventoryNoteRequest,
  AllocateInventoryRequest,
  CreateInventoryItemRequest,
  CreateWarehouseRequest,
  InventoryAllocationDetailResponse,
  InventoryAllocationListResponse,
  InventoryAllocationSummary,
  InventoryDashboardResponse,
  InventoryDamageReportSummary,
  InventoryItemDetailResponse,
  InventoryListResponse,
  InventoryMaintenanceListResponse,
  InventoryMaintenanceSummary,
  InventoryMovementListResponse,
  InventoryNoteSummary,
  ReportInventoryDamageRequest,
  ReturnInventoryRequest,
  StartInventoryMaintenanceRequest,
  UpdateInventoryAllocationRequest,
  UpdateInventoryItemRequest,
  UpdateWarehouseRequest,
  WarehouseDashboardResponse,
  WarehouseDetailResponse,
  WarehouseListResponse,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import {
  buildPaginationMeta,
  paginatedCollection,
  parsePagination,
  type PaginationQueryInput,
} from "../../../common/pagination/pagination";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  INVENTORY_REPOSITORY,
  type InventoryMutationContext,
  type InventoryRepository,
} from "../ports/inventory-repository";

@Injectable()
export class InventoryService {
  public constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventory: InventoryRepository,
  ) {}

  public async listWarehouses(
    principal: AuthenticatedPrincipal,
  ): Promise<WarehouseListResponse> {
    return {
      warehouses: await this.inventory.listWarehouses(
        resolveBranchId(principal),
      ),
    };
  }

  public async getWarehouse(
    warehouseId: string,
  ): Promise<WarehouseDetailResponse> {
    const warehouse = await this.inventory.getWarehouse(warehouseId);
    if (warehouse === undefined) {
      throw new DomainError("WAREHOUSE_NOT_FOUND", "Warehouse not found", 404);
    }
    return warehouse;
  }

  public createWarehouse(
    principal: AuthenticatedPrincipal,
    body: CreateWarehouseRequest,
    requestId: string = randomUUID(),
  ): Promise<WarehouseDetailResponse> {
    return this.inventory.createWarehouse({
      body,
      ...mutationContext(principal, requestId),
    });
  }

  public async updateWarehouse(
    principal: AuthenticatedPrincipal,
    warehouseId: string,
    body: UpdateWarehouseRequest,
    requestId: string = randomUUID(),
  ): Promise<WarehouseDetailResponse> {
    const warehouse = await this.inventory.updateWarehouse({
      warehouseId,
      body,
      ...mutationContext(principal, requestId),
    });
    if (warehouse === undefined) {
      throw new DomainError("WAREHOUSE_NOT_FOUND", "Warehouse not found", 404);
    }
    return warehouse;
  }

  public getWarehouseDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<WarehouseDashboardResponse> {
    return this.inventory.getWarehouseDashboard(resolveBranchId(principal));
  }

  public async listItems(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly warehouseId?: string;
      readonly status?: string;
    } & PaginationQueryInput,
  ): Promise<InventoryListResponse> {
    const pagination = parsePagination(filters);
    const { items, total } = await this.inventory.listItems({
      branchId: resolveBranchId(principal),
      limit: pagination.requested ? pagination.limit : 200,
      offset: pagination.requested ? pagination.offset : 0,
      ...(filters?.warehouseId === undefined
        ? {}
        : { warehouseId: filters.warehouseId }),
      ...(filters?.status === undefined ? {} : { status: filters.status }),
      ...(pagination.search === undefined ? {} : { search: pagination.search }),
    });
    const summaries = items.map((item) => ({
      id: item.id,
      inventoryCode: item.inventoryCode,
      name: item.name,
      status: item.status,
      condition: item.condition,
      ownershipType: item.ownershipType,
      quantityOnHand: item.quantityOnHand,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...(item.sku === undefined ? {} : { sku: item.sku }),
      ...(item.warehouseId === undefined
        ? {}
        : { warehouseId: item.warehouseId }),
      ...(item.warehouseName === undefined
        ? {}
        : { warehouseName: item.warehouseName }),
      ...(item.categoryCode === undefined
        ? {}
        : { categoryCode: item.categoryCode }),
      ...(item.categoryName === undefined
        ? {}
        : { categoryName: item.categoryName }),
      ...(item.brand === undefined ? {} : { brand: item.brand }),
    }));
    return paginatedCollection(
      "items",
      summaries,
      pagination.requested
        ? buildPaginationMeta({
            page: pagination.page,
            limit: pagination.limit,
            total,
          })
        : undefined,
    ) as InventoryListResponse;
  }

  public async getItem(itemId: string): Promise<InventoryItemDetailResponse> {
    const item = await this.inventory.getItem(itemId);
    if (item === undefined) {
      throw new DomainError(
        "INVENTORY_NOT_FOUND",
        "Inventory item not found",
        404,
      );
    }
    return item;
  }

  public createItem(
    principal: AuthenticatedPrincipal,
    body: CreateInventoryItemRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryItemDetailResponse> {
    return this.inventory.createItem({
      body,
      ...mutationContext(principal, requestId),
    });
  }

  public async updateItem(
    principal: AuthenticatedPrincipal,
    itemId: string,
    body: UpdateInventoryItemRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryItemDetailResponse> {
    const item = await this.inventory.updateItem({
      itemId,
      body,
      ...mutationContext(principal, requestId),
    });
    if (item === undefined) {
      throw new DomainError(
        "INVENTORY_NOT_FOUND",
        "Inventory item not found",
        404,
      );
    }
    return item;
  }

  public async allocate(
    principal: AuthenticatedPrincipal,
    body: AllocateInventoryRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryAllocationSummary> {
    const allocation = await this.inventory.allocate({
      body,
      ...mutationContext(principal, requestId),
    });
    if (allocation === undefined) {
      throw new DomainError(
        "INVENTORY_ALLOCATE_FAILED",
        "Event or inventory item not found / unavailable",
        404,
      );
    }
    return allocation;
  }

  public async updateAllocation(
    principal: AuthenticatedPrincipal,
    allocationId: string,
    body: UpdateInventoryAllocationRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryAllocationSummary> {
    const allocation = await this.inventory.updateAllocation({
      allocationId,
      body,
      ...mutationContext(principal, requestId),
    });
    if (allocation === undefined) {
      throw new DomainError(
        "INVENTORY_ALLOCATION_NOT_FOUND",
        "Allocation not found",
        404,
      );
    }
    return allocation;
  }

  public async returnAllocation(
    principal: AuthenticatedPrincipal,
    allocationId: string,
    body: ReturnInventoryRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryAllocationSummary> {
    const allocation = await this.inventory.returnAllocation({
      allocationId,
      body,
      ...mutationContext(principal, requestId),
    });
    if (allocation === undefined) {
      throw new DomainError(
        "INVENTORY_ALLOCATION_NOT_FOUND",
        "Allocation not found",
        404,
      );
    }
    return allocation;
  }

  public async listAllocations(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
      readonly itemId?: string;
    },
  ): Promise<InventoryAllocationListResponse> {
    return {
      allocations: await this.inventory.listAllocations({
        branchId: resolveBranchId(principal),
        ...(filters?.eventRecordId === undefined
          ? {}
          : { eventRecordId: filters.eventRecordId }),
        ...(filters?.itemId === undefined ? {} : { itemId: filters.itemId }),
      }),
    };
  }

  public async getAllocation(
    allocationId: string,
  ): Promise<InventoryAllocationDetailResponse> {
    const allocation = await this.inventory.getAllocation(allocationId);
    if (allocation === undefined) {
      throw new DomainError(
        "INVENTORY_ALLOCATION_NOT_FOUND",
        "Allocation not found",
        404,
      );
    }
    return allocation;
  }

  public async listMovements(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly itemId?: string;
      readonly eventRecordId?: string;
    },
  ): Promise<InventoryMovementListResponse> {
    return {
      movements: await this.inventory.listMovements({
        branchId: resolveBranchId(principal),
        ...(filters?.itemId === undefined ? {} : { itemId: filters.itemId }),
        ...(filters?.eventRecordId === undefined
          ? {}
          : { eventRecordId: filters.eventRecordId }),
      }),
    };
  }

  public async reportDamage(
    principal: AuthenticatedPrincipal,
    body: ReportInventoryDamageRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryDamageReportSummary> {
    const report = await this.inventory.reportDamage({
      body,
      ...mutationContext(principal, requestId),
    });
    if (report === undefined) {
      throw new DomainError(
        "INVENTORY_NOT_FOUND",
        "Inventory item not found",
        404,
      );
    }
    return report;
  }

  public async startMaintenance(
    principal: AuthenticatedPrincipal,
    body: StartInventoryMaintenanceRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryMaintenanceSummary> {
    const row = await this.inventory.startMaintenance({
      body,
      ...mutationContext(principal, requestId),
    });
    if (row === undefined) {
      throw new DomainError(
        "INVENTORY_NOT_FOUND",
        "Inventory item not found",
        404,
      );
    }
    return row;
  }

  public async listMaintenance(): Promise<InventoryMaintenanceListResponse> {
    return { maintenance: await this.inventory.listMaintenance() };
  }

  public async addNote(
    principal: AuthenticatedPrincipal,
    itemId: string,
    body: AddInventoryNoteRequest,
    requestId: string = randomUUID(),
  ): Promise<InventoryNoteSummary> {
    const note = await this.inventory.addNote({
      itemId,
      body,
      ...mutationContext(principal, requestId),
    });
    if (note === undefined) {
      throw new DomainError(
        "INVENTORY_NOT_FOUND",
        "Inventory item not found",
        404,
      );
    }
    return note;
  }

  public getInventoryDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<InventoryDashboardResponse> {
    return this.inventory.getInventoryDashboard(resolveBranchId(principal));
  }
}

function mutationContext(
  principal: AuthenticatedPrincipal,
  requestId: string,
): InventoryMutationContext {
  return {
    actorUserId: principal.userId,
    actorRole: principal.activeRole,
    requestId,
    branchId: resolveBranchId(principal),
  };
}
