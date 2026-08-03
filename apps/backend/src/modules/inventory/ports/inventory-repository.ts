import type {
  AddInventoryNoteRequest,
  AllocateInventoryRequest,
  CreateInventoryItemRequest,
  CreateWarehouseRequest,
  InventoryAllocationDetailResponse,
  InventoryAllocationListResponse,
  InventoryAllocationSummary,
  InventoryDashboardResponse,
  InventoryItemDetailResponse,
  InventoryListResponse,
  InventoryMaintenanceListResponse,
  InventoryMaintenanceSummary,
  InventoryMovementListResponse,
  InventoryMovementSummary,
  InventoryNoteSummary,
  InventoryDamageReportSummary,
  ReportInventoryDamageRequest,
  ReturnInventoryRequest,
  StartInventoryMaintenanceRequest,
  UpdateInventoryAllocationRequest,
  UpdateInventoryItemRequest,
  UpdateWarehouseRequest,
  WarehouseDashboardResponse,
  WarehouseDetailResponse,
  WarehouseListResponse,
  WarehouseSummary,
} from "@me-event/api-contracts";

export const INVENTORY_REPOSITORY = Symbol("INVENTORY_REPOSITORY");

export interface InventoryMutationContext {
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly branchId: string;
}

export interface InventoryListOptions {
  readonly branchId: string;
  readonly warehouseId?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly search?: string;
}

export interface InventoryRepository {
  listWarehouses(branchId: string): Promise<readonly WarehouseSummary[]>;
  getWarehouse(
    warehouseId: string,
  ): Promise<WarehouseDetailResponse | undefined>;
  createWarehouse(
    input: InventoryMutationContext & { readonly body: CreateWarehouseRequest },
  ): Promise<WarehouseDetailResponse>;
  updateWarehouse(
    input: InventoryMutationContext & {
      readonly warehouseId: string;
      readonly body: UpdateWarehouseRequest;
    },
  ): Promise<WarehouseDetailResponse | undefined>;
  getWarehouseDashboard(branchId: string): Promise<WarehouseDashboardResponse>;

  listItems(options: InventoryListOptions): Promise<{
    readonly items: readonly InventoryItemDetailResponse[];
    readonly total: number;
  }>;
  getItem(itemId: string): Promise<InventoryItemDetailResponse | undefined>;
  createItem(
    input: InventoryMutationContext & {
      readonly body: CreateInventoryItemRequest;
    },
  ): Promise<InventoryItemDetailResponse>;
  updateItem(
    input: InventoryMutationContext & {
      readonly itemId: string;
      readonly body: UpdateInventoryItemRequest;
    },
  ): Promise<InventoryItemDetailResponse | undefined>;

  allocate(
    input: InventoryMutationContext & {
      readonly body: AllocateInventoryRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined>;
  updateAllocation(
    input: InventoryMutationContext & {
      readonly allocationId: string;
      readonly body: UpdateInventoryAllocationRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined>;
  returnAllocation(
    input: InventoryMutationContext & {
      readonly allocationId: string;
      readonly body: ReturnInventoryRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined>;

  listAllocations(filters?: {
    readonly eventRecordId?: string;
    readonly itemId?: string;
    readonly branchId?: string;
    readonly limit?: number;
    readonly openOnly?: boolean;
  }): Promise<readonly InventoryAllocationSummary[]>;
  getAllocation(
    allocationId: string,
  ): Promise<InventoryAllocationDetailResponse | undefined>;

  listMovements(filters?: {
    readonly itemId?: string;
    readonly eventRecordId?: string;
    readonly branchId?: string;
    readonly limit?: number;
  }): Promise<readonly InventoryMovementSummary[]>;

  reportDamage(
    input: InventoryMutationContext & {
      readonly body: ReportInventoryDamageRequest;
    },
  ): Promise<InventoryDamageReportSummary | undefined>;
  startMaintenance(
    input: InventoryMutationContext & {
      readonly body: StartInventoryMaintenanceRequest;
    },
  ): Promise<InventoryMaintenanceSummary | undefined>;
  listMaintenance(): Promise<readonly InventoryMaintenanceSummary[]>;

  addNote(
    input: InventoryMutationContext & {
      readonly itemId: string;
      readonly body: AddInventoryNoteRequest;
    },
  ): Promise<InventoryNoteSummary | undefined>;

  getInventoryDashboard(branchId: string): Promise<InventoryDashboardResponse>;
}

export type {
  InventoryAllocationListResponse,
  InventoryDashboardResponse,
  InventoryListResponse,
  InventoryMaintenanceListResponse,
  InventoryMovementListResponse,
  WarehouseDashboardResponse,
  WarehouseListResponse,
};
