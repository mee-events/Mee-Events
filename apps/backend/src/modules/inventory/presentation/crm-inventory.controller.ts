import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  addInventoryNoteSchema,
  allocateInventorySchema,
  createInventoryItemSchema,
  createWarehouseSchema,
  reportInventoryDamageSchema,
  returnInventorySchema,
  startInventoryMaintenanceSchema,
  updateInventoryAllocationSchema,
  updateInventoryItemSchema,
  updateWarehouseSchema,
  type AddInventoryNoteRequest,
  type AllocateInventoryRequest,
  type CreateInventoryItemRequest,
  type CreateWarehouseRequest,
  type InventoryAllocationDetailResponse,
  type InventoryAllocationListResponse,
  type InventoryAllocationSummary,
  type InventoryDashboardResponse,
  type InventoryDamageReportSummary,
  type InventoryItemDetailResponse,
  type InventoryListResponse,
  type InventoryMaintenanceListResponse,
  type InventoryMaintenanceSummary,
  type InventoryMovementListResponse,
  type InventoryNoteSummary,
  type ReportInventoryDamageRequest,
  type ReturnInventoryRequest,
  type StartInventoryMaintenanceRequest,
  type UpdateInventoryAllocationRequest,
  type UpdateInventoryItemRequest,
  type UpdateWarehouseRequest,
  type WarehouseDashboardResponse,
  type WarehouseDetailResponse,
  type WarehouseListResponse,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { InventoryService } from "../application/inventory.service";

@ApiTags("CRM Inventory")
@ApiBearerAuth()
@Controller("crm")
@UseGuards(CapabilityGuard)
export class CrmInventoryController {
  public constructor(private readonly inventory: InventoryService) {}

  @Get("warehouses")
  @RequireCapability("warehouse.read")
  @ApiOperation({ summary: "List warehouses" })
  public listWarehouses(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WarehouseListResponse> {
    return this.inventory.listWarehouses(principalOf(request));
  }

  @Post("warehouses")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("warehouse.manage")
  @ApiOperation({ summary: "Create warehouse" })
  public createWarehouse(
    @Body(new ZodValidationPipe(createWarehouseSchema))
    body: CreateWarehouseRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WarehouseDetailResponse> {
    return this.inventory.createWarehouse(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("warehouses/dashboard")
  @RequireCapability("warehouse.read")
  @ApiOperation({ summary: "Warehouse dashboard" })
  public warehouseDashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WarehouseDashboardResponse> {
    return this.inventory.getWarehouseDashboard(principalOf(request));
  }

  @Get("warehouses/:id")
  @RequireCapability("warehouse.read")
  @ApiOperation({ summary: "Warehouse detail" })
  public getWarehouse(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<WarehouseDetailResponse> {
    return this.inventory.getWarehouse(id);
  }

  @Patch("warehouses/:id")
  @RequireCapability("warehouse.manage")
  @ApiOperation({ summary: "Update warehouse" })
  public updateWarehouse(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema))
    body: UpdateWarehouseRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WarehouseDetailResponse> {
    return this.inventory.updateWarehouse(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Get("inventory")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "List inventory items" })
  public listItems(
    @Req() request: AuthenticatedPlatformRequest,
    @Query() query: Record<string, unknown>,
    @Query("warehouseId") warehouseId?: string,
    @Query("status") status?: string,
  ): Promise<InventoryListResponse> {
    return this.inventory.listItems(principalOf(request), {
      ...query,
      ...(warehouseId === undefined ? {} : { warehouseId }),
      ...(status === undefined ? {} : { status }),
    });
  }

  @Post("inventory")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("inventory.manage")
  @ApiOperation({ summary: "Create inventory item" })
  public createItem(
    @Body(new ZodValidationPipe(createInventoryItemSchema))
    body: CreateInventoryItemRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryItemDetailResponse> {
    return this.inventory.createItem(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("inventory/dashboard")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Inventory dashboard" })
  public inventoryDashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryDashboardResponse> {
    return this.inventory.getInventoryDashboard(principalOf(request));
  }

  @Get("inventory/allocations")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "List inventory allocations" })
  public listAllocations(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
    @Query("itemId") itemId?: string,
  ): Promise<InventoryAllocationListResponse> {
    return this.inventory.listAllocations(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
      ...(itemId === undefined ? {} : { itemId }),
    });
  }

  @Post("inventory/allocations")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("inventory.allocate")
  @ApiOperation({ summary: "Reserve/allocate inventory to an event record" })
  public allocate(
    @Body(new ZodValidationPipe(allocateInventorySchema))
    body: AllocateInventoryRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryAllocationSummary> {
    return this.inventory.allocate(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("inventory/allocations/:allocationId")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Allocation detail" })
  public getAllocation(
    @Param("allocationId", new ParseUUIDPipe()) allocationId: string,
  ): Promise<InventoryAllocationDetailResponse> {
    return this.inventory.getAllocation(allocationId);
  }

  @Patch("inventory/allocations/:allocationId")
  @RequireCapability("inventory.allocate")
  @ApiOperation({ summary: "Update allocation status (dispatch / on-site)" })
  public updateAllocation(
    @Param("allocationId", new ParseUUIDPipe()) allocationId: string,
    @Body(new ZodValidationPipe(updateInventoryAllocationSchema))
    body: UpdateInventoryAllocationRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryAllocationSummary> {
    return this.inventory.updateAllocation(
      principalOf(request),
      allocationId,
      body,
      requestIdOf(request),
    );
  }

  @Post("inventory/allocations/:allocationId/return")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("inventory.allocate")
  @ApiOperation({ summary: "Return allocated inventory" })
  public returnAllocation(
    @Param("allocationId", new ParseUUIDPipe()) allocationId: string,
    @Body(new ZodValidationPipe(returnInventorySchema))
    body: ReturnInventoryRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryAllocationSummary> {
    return this.inventory.returnAllocation(
      principalOf(request),
      allocationId,
      body,
      requestIdOf(request),
    );
  }

  @Get("inventory/movements")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Movement history" })
  public listMovements(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("itemId") itemId?: string,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<InventoryMovementListResponse> {
    return this.inventory.listMovements(principalOf(request), {
      ...(itemId === undefined ? {} : { itemId }),
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Get("inventory/maintenance")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Maintenance list" })
  public listMaintenance(): Promise<InventoryMaintenanceListResponse> {
    return this.inventory.listMaintenance();
  }

  @Post("inventory/maintenance")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("inventory.manage")
  @ApiOperation({ summary: "Start maintenance" })
  public startMaintenance(
    @Body(new ZodValidationPipe(startInventoryMaintenanceSchema))
    body: StartInventoryMaintenanceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryMaintenanceSummary> {
    return this.inventory.startMaintenance(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Post("inventory/damage-reports")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("inventory.manage")
  @ApiOperation({ summary: "Report inventory damage" })
  public reportDamage(
    @Body(new ZodValidationPipe(reportInventoryDamageSchema))
    body: ReportInventoryDamageRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryDamageReportSummary> {
    return this.inventory.reportDamage(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("inventory/:id")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Inventory item detail" })
  public getItem(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<InventoryItemDetailResponse> {
    return this.inventory.getItem(id);
  }

  @Patch("inventory/:id")
  @RequireCapability("inventory.manage")
  @ApiOperation({ summary: "Update inventory item" })
  public updateItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateInventoryItemSchema))
    body: UpdateInventoryItemRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryItemDetailResponse> {
    return this.inventory.updateItem(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post("inventory/:id/notes")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("inventory.manage")
  @ApiOperation({ summary: "Add inventory note" })
  public addNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addInventoryNoteSchema))
    body: AddInventoryNoteRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryNoteSummary> {
    return this.inventory.addNote(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }
}

@ApiTags("Inventory Ops")
@ApiBearerAuth()
@Controller("inventory")
@UseGuards(CapabilityGuard)
export class InventoryOpsController {
  public constructor(private readonly inventory: InventoryService) {}

  @Get("me/dashboard")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Manager inventory dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryDashboardResponse> {
    return this.inventory.getInventoryDashboard(principalOf(request));
  }

  @Get("me/allocations")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Open allocations for ops" })
  public allocations(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<InventoryAllocationListResponse> {
    return this.inventory.listAllocations(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Get("me/allocations/:allocationId")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Allocation detail with movement timeline" })
  public getAllocation(
    @Param("allocationId", new ParseUUIDPipe()) allocationId: string,
  ): Promise<InventoryAllocationDetailResponse> {
    return this.inventory.getAllocation(allocationId);
  }

  @Post("me/allocations")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("inventory.allocate")
  @ApiOperation({ summary: "Reserve/allocate inventory (manager)" })
  public allocate(
    @Body(new ZodValidationPipe(allocateInventorySchema))
    body: AllocateInventoryRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryAllocationSummary> {
    return this.inventory.allocate(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Patch("me/allocations/:allocationId")
  @RequireCapability("inventory.allocate")
  @ApiOperation({ summary: "Advance allocation status" })
  public updateAllocation(
    @Param("allocationId", new ParseUUIDPipe()) allocationId: string,
    @Body(new ZodValidationPipe(updateInventoryAllocationSchema))
    body: UpdateInventoryAllocationRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryAllocationSummary> {
    return this.inventory.updateAllocation(
      principalOf(request),
      allocationId,
      body,
      requestIdOf(request),
    );
  }

  @Post("me/allocations/:allocationId/return")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("inventory.allocate")
  @ApiOperation({ summary: "Return inventory (manager)" })
  public returnAllocation(
    @Param("allocationId", new ParseUUIDPipe()) allocationId: string,
    @Body(new ZodValidationPipe(returnInventorySchema))
    body: ReturnInventoryRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<InventoryAllocationSummary> {
    return this.inventory.returnAllocation(
      principalOf(request),
      allocationId,
      body,
      requestIdOf(request),
    );
  }

  @Get("me/movements")
  @RequireCapability("inventory.read")
  @ApiOperation({ summary: "Movement timeline" })
  public movements(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<InventoryMovementListResponse> {
    return this.inventory.listMovements(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }
}

function principalOf(
  request: AuthenticatedPlatformRequest,
): AuthenticatedPrincipal {
  const principal = request.user;
  if (principal === undefined) {
    throw new UnauthorizedException("Authenticated principal is required");
  }
  return principal;
}

function requestIdOf(
  request: AuthenticatedPlatformRequest,
): string | undefined {
  const id: unknown = request.id;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}
