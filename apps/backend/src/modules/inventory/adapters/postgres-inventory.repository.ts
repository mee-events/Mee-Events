import { Inject, Injectable } from "@nestjs/common";
import type {
  AddInventoryNoteRequest,
  AllocateInventoryRequest,
  CreateInventoryItemRequest,
  CreateWarehouseRequest,
  EventTimelineEntry,
  InventoryAllocationDetailResponse,
  InventoryAllocationStatus,
  InventoryAllocationSummary,
  InventoryCondition,
  InventoryDashboardResponse,
  InventoryDamageReportSummary,
  InventoryDamageSeverity,
  InventoryItemDetailResponse,
  InventoryItemStatus,
  InventoryMaintenanceStatus,
  InventoryMaintenanceSummary,
  InventoryMovementSummary,
  InventoryMovementType,
  InventoryNoteSummary,
  InventoryOwnershipType,
  ReportInventoryDamageRequest,
  ReturnInventoryRequest,
  StartInventoryMaintenanceRequest,
  UpdateInventoryAllocationRequest,
  UpdateInventoryItemRequest,
  UpdateWarehouseRequest,
  WarehouseDashboardResponse,
  WarehouseDetailResponse,
  WarehouseLocationSummary,
  WarehouseStatus,
  WarehouseSummary,
  WarehouseType,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  appendEventActivity,
  appendEventTimeline,
  writeAuditOutbox,
} from "../../../common/pattern-b/append-event-pattern-b";
import { appendModuleTimelineAndActivity } from "../../../common/pattern-b/append-module-pattern-b";
import {
  generateInventoryCode,
  generateWarehouseCode,
} from "../application/inventory-code";
import {
  buildInventoryNotificationPayload,
  INVENTORY_NOTIFICATION_TOPICS,
} from "../application/notification-intents";
import type {
  InventoryListOptions,
  InventoryMutationContext,
  InventoryRepository,
} from "../ports/inventory-repository";

@Injectable()
export class PostgresInventoryRepository implements InventoryRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listWarehouses(
    branchId: string,
  ): Promise<readonly WarehouseSummary[]> {
    const result = await this.pool.query<WarehouseRow>(
      `SELECT * FROM warehouses
       WHERE branch_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [branchId],
    );
    return result.rows.map(mapWarehouse);
  }

  public async getWarehouse(
    warehouseId: string,
  ): Promise<WarehouseDetailResponse | undefined> {
    const result = await this.pool.query<WarehouseRow>(
      `SELECT * FROM warehouses WHERE id = $1`,
      [warehouseId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const locations = await this.pool.query<{
      id: string;
      location_code: string;
      name: string;
      zone: string | null;
      aisle: string | null;
      shelf: string | null;
      status: string;
    }>(
      `SELECT id, location_code, name, zone, aisle, shelf, status
       FROM warehouse_locations
       WHERE warehouse_id = $1
       ORDER BY location_code`,
      [warehouseId],
    );
    return {
      ...mapWarehouse(row),
      locations: locations.rows.map(
        (l): WarehouseLocationSummary => ({
          id: l.id,
          locationCode: l.location_code,
          name: l.name,
          status: l.status,
          ...(l.zone === null ? {} : { zone: l.zone }),
          ...(l.aisle === null ? {} : { aisle: l.aisle }),
          ...(l.shelf === null ? {} : { shelf: l.shelf }),
        }),
      ),
      ...(row.notes === null ? {} : { notes: row.notes }),
    };
  }

  public async createWarehouse(
    input: InventoryMutationContext & { readonly body: CreateWarehouseRequest },
  ): Promise<WarehouseDetailResponse> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const code = generateWarehouseCode();
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO warehouses (
           branch_id, warehouse_code, name, warehouse_type, address_line,
           city, state, pincode, notes, created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
         RETURNING id`,
        [
          input.branchId,
          code,
          input.body.name,
          input.body.warehouseType ?? "main",
          input.body.addressLine ?? null,
          input.body.city,
          input.body.state,
          input.body.pincode ?? null,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const warehouseId = inserted.rows[0]?.id;
      if (warehouseId === undefined) throw new Error("Warehouse create failed");

      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.warehouseCreated,
        { warehouseId, warehouseCode: code },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: warehouseId,
        entityType: "warehouse",
        action: "warehouse.created",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await client.query("COMMIT");
      const loaded = await this.getWarehouse(warehouseId);
      if (loaded === undefined) throw new Error("Warehouse create lost");
      return loaded;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateWarehouse(
    input: InventoryMutationContext & {
      readonly warehouseId: string;
      readonly body: UpdateWarehouseRequest;
    },
  ): Promise<WarehouseDetailResponse | undefined> {
    const existing = await this.getWarehouse(input.warehouseId);
    if (existing === undefined) return undefined;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE warehouses SET
           name = COALESCE($2, name),
           warehouse_type = COALESCE($3, warehouse_type),
           address_line = CASE WHEN $4::boolean THEN $5 ELSE address_line END,
           city = COALESCE($6, city),
           state = COALESCE($7, state),
           pincode = CASE WHEN $8::boolean THEN $9 ELSE pincode END,
           status = COALESCE($10, status),
           notes = CASE WHEN $11::boolean THEN $12 ELSE notes END,
           updated_by_user_id = $13,
           version = version + 1
         WHERE id = $1`,
        [
          input.warehouseId,
          input.body.name ?? null,
          input.body.warehouseType ?? null,
          input.body.addressLine !== undefined,
          input.body.addressLine ?? null,
          input.body.city ?? null,
          input.body.state ?? null,
          input.body.pincode !== undefined,
          input.body.pincode ?? null,
          input.body.status ?? null,
          input.body.notes !== undefined,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.warehouseUpdated,
        { warehouseId: input.warehouseId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.warehouseId,
        entityType: "warehouse",
        action: "warehouse.updated",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.getWarehouse(input.warehouseId);
  }

  public async getWarehouseDashboard(
    branchId: string,
  ): Promise<WarehouseDashboardResponse> {
    const [warehouseCounts, itemCounts, warehouses, highlights] =
      await Promise.all([
        this.pool.query<{
          total_warehouses: number;
          active_warehouses: number;
        }>(
          `SELECT COUNT(*)::int AS total_warehouses,
                  COUNT(*) FILTER (WHERE status = 'active')::int AS active_warehouses
           FROM warehouses WHERE branch_id = $1`,
          [branchId],
        ),
        this.pool.query<{
          total_items: number;
          available_items: number;
        }>(
          `SELECT COUNT(*)::int AS total_items,
                  COUNT(*) FILTER (WHERE status = 'available')::int AS available_items
           FROM inventory_items WHERE branch_id = $1`,
          [branchId],
        ),
        this.listWarehouses(branchId),
        this.listItems({ branchId, limit: 20, offset: 0 }),
      ]);
    const wh = warehouseCounts.rows[0];
    const it = itemCounts.rows[0];
    return {
      totalWarehouses: wh?.total_warehouses ?? 0,
      activeWarehouses: wh?.active_warehouses ?? 0,
      totalItems: it?.total_items ?? 0,
      availableItems: it?.available_items ?? 0,
      warehouses,
      stockHighlights: highlights.items.map(toItemSummary),
    };
  }

  public async listItems(options: InventoryListOptions): Promise<{
    readonly items: readonly InventoryItemDetailResponse[];
    readonly total: number;
  }> {
    const clauses = [`i.branch_id = $1`];
    const params: unknown[] = [options.branchId];
    if (options.warehouseId !== undefined) {
      params.push(options.warehouseId);
      clauses.push(`i.warehouse_id = $${params.length}`);
    }
    if (options.status !== undefined) {
      params.push(options.status);
      clauses.push(`i.status = $${params.length}`);
    }
    if (options.search !== undefined && options.search.length > 0) {
      params.push(`%${options.search}%`);
      clauses.push(
        `(i.name ILIKE $${params.length} OR i.inventory_code ILIKE $${params.length} OR COALESCE(i.sku, '') ILIKE $${params.length})`,
      );
    }
    const where = clauses.join(" AND ");
    const limit = options.limit ?? 200;
    const offset = options.offset ?? 0;
    params.push(limit, offset);
    const result = await this.pool.query<ItemRow & { total_count: number }>(
      `SELECT i.*, w.name AS warehouse_name, l.name AS location_name,
              c.code AS category_code, c.display_name AS category_name,
              COUNT(*) OVER()::int AS total_count
       FROM inventory_items i
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       LEFT JOIN warehouse_locations l ON l.id = i.location_id
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       WHERE ${where}
       ORDER BY i.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return {
      items: result.rows.map(mapItem),
      total: result.rows[0]?.total_count ?? 0,
    };
  }

  public async getItem(
    itemId: string,
  ): Promise<InventoryItemDetailResponse | undefined> {
    const result = await this.pool.query<ItemRow>(
      `SELECT i.*, w.name AS warehouse_name, l.name AS location_name,
              c.code AS category_code, c.display_name AS category_name
       FROM inventory_items i
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       LEFT JOIN warehouse_locations l ON l.id = i.location_id
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       WHERE i.id = $1`,
      [itemId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    return mapItem(row);
  }

  public async createItem(
    input: InventoryMutationContext & {
      readonly body: CreateInventoryItemRequest;
    },
  ): Promise<InventoryItemDetailResponse> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let categoryId: string | null = null;
      if (input.body.categoryCode !== undefined) {
        const cat = await client.query<{ id: string }>(
          `INSERT INTO inventory_categories (branch_id, code, display_name)
           VALUES ($1,$2,$3)
           ON CONFLICT (branch_id, code) DO UPDATE SET display_name = EXCLUDED.display_name
           RETURNING id`,
          [input.branchId, input.body.categoryCode, input.body.categoryCode],
        );
        categoryId = cat.rows[0]?.id ?? null;
      }
      const code = generateInventoryCode();
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO inventory_items (
           branch_id, inventory_code, sku, barcode_placeholder, qr_placeholder,
           name, category_id, brand, description, purchase_date, purchase_cost,
           rental_cost, current_value, warehouse_id, location_id, condition,
           ownership_type, owner_label, quantity_on_hand, photo_placeholders,
           created_by_user_id, updated_by_user_id
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21,$21
         ) RETURNING id`,
        [
          input.branchId,
          code,
          input.body.sku ?? null,
          input.body.barcodePlaceholder ?? null,
          input.body.qrPlaceholder ?? null,
          input.body.name,
          categoryId,
          input.body.brand ?? null,
          input.body.description ?? null,
          input.body.purchaseDate ?? null,
          input.body.purchaseCost ?? null,
          input.body.rentalCost ?? null,
          input.body.currentValue ?? null,
          input.body.warehouseId ?? null,
          input.body.locationId ?? null,
          input.body.condition ?? "good",
          input.body.ownershipType ?? "owned",
          input.body.ownerLabel ?? null,
          input.body.quantityOnHand ?? 1,
          JSON.stringify(input.body.photoPlaceholders ?? []),
          input.actorUserId,
        ],
      );
      const itemId = inserted.rows[0]?.id;
      if (itemId === undefined) throw new Error("Item create failed");

      if (input.body.warehouseId !== undefined) {
        await client.query(
          `INSERT INTO inventory_stock (
             item_id, warehouse_id, location_id, quantity_available
           ) VALUES ($1,$2,$3,$4)
           ON CONFLICT (item_id, warehouse_id, location_id) DO UPDATE
           SET quantity_available = EXCLUDED.quantity_available,
               version = inventory_stock.version + 1`,
          [
            itemId,
            input.body.warehouseId,
            input.body.locationId ?? null,
            input.body.quantityOnHand ?? 1,
          ],
        );
      }

      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.created,
        { itemId, inventoryCode: code },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: itemId,
        entityType: "inventory_item",
        action: "inventory.created",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await appendModuleTimelineAndActivity(client, "inventory", {
        aggregateId: itemId,
        actorUserId: input.actorUserId,
        entryType: "created",
        title: "Inventory item created",
        activityType: "created",
        content: input.body.name,
        customerVisible: false,
      });
      await client.query("COMMIT");
      const loaded = await this.getItem(itemId);
      if (loaded === undefined) throw new Error("Item create lost");
      return loaded;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateItem(
    input: InventoryMutationContext & {
      readonly itemId: string;
      readonly body: UpdateInventoryItemRequest;
    },
  ): Promise<InventoryItemDetailResponse | undefined> {
    if ((await this.getItem(input.itemId)) === undefined) return undefined;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE inventory_items SET
           name = COALESCE($2, name),
           sku = CASE WHEN $3::boolean THEN $4 ELSE sku END,
           brand = CASE WHEN $5::boolean THEN $6 ELSE brand END,
           description = CASE WHEN $7::boolean THEN $8 ELSE description END,
           condition = COALESCE($9, condition),
           status = COALESCE($10, status),
           ownership_type = COALESCE($11, ownership_type),
           owner_label = CASE WHEN $12::boolean THEN $13 ELSE owner_label END,
           quantity_on_hand = COALESCE($14, quantity_on_hand),
           warehouse_id = CASE WHEN $15::boolean THEN $16 ELSE warehouse_id END,
           location_id = CASE WHEN $17::boolean THEN $18 ELSE location_id END,
           photo_placeholders = CASE WHEN $19::boolean THEN $20::jsonb ELSE photo_placeholders END,
           updated_by_user_id = $21,
           version = version + 1
         WHERE id = $1`,
        [
          input.itemId,
          input.body.name ?? null,
          input.body.sku !== undefined,
          input.body.sku ?? null,
          input.body.brand !== undefined,
          input.body.brand ?? null,
          input.body.description !== undefined,
          input.body.description ?? null,
          input.body.condition ?? null,
          input.body.status ?? null,
          input.body.ownershipType ?? null,
          input.body.ownerLabel !== undefined,
          input.body.ownerLabel ?? null,
          input.body.quantityOnHand ?? null,
          input.body.warehouseId !== undefined,
          input.body.warehouseId ?? null,
          input.body.locationId !== undefined,
          input.body.locationId ?? null,
          input.body.photoPlaceholders !== undefined,
          JSON.stringify(input.body.photoPlaceholders ?? []),
          input.actorUserId,
        ],
      );
      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.updated,
        { itemId: input.itemId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.itemId,
        entityType: "inventory_item",
        action: "inventory.updated",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await appendModuleTimelineAndActivity(client, "inventory", {
        aggregateId: input.itemId,
        actorUserId: input.actorUserId,
        entryType: "updated",
        title: "Inventory item updated",
        activityType: "updated",
        customerVisible: false,
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.getItem(input.itemId);
  }

  public async allocate(
    input: InventoryMutationContext & {
      readonly body: AllocateInventoryRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const event = await client.query<{
        id: string;
        branch_id: string;
        version: number;
        event_number: string;
      }>(
        `SELECT id, branch_id, version, event_number
         FROM event_records WHERE id = $1 FOR UPDATE`,
        [input.body.eventRecordId],
      );
      const locked = event.rows[0];
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const item = await client.query<{
        id: string;
        name: string;
        status: string;
        warehouse_id: string | null;
        quantity_on_hand: number;
      }>(
        `SELECT id, name, status, warehouse_id, quantity_on_hand
         FROM inventory_items WHERE id = $1 FOR UPDATE`,
        [input.body.itemId],
      );
      const itemRow = item.rows[0];
      if (
        itemRow === undefined ||
        !["available", "returned", "reserved"].includes(itemRow.status)
      ) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const status = input.body.status ?? "reserved";
      const itemStatus = status === "allocated" ? "allocated" : "reserved";
      const warehouseId =
        input.body.warehouseId ?? itemRow.warehouse_id ?? null;

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO inventory_allocations (
           event_record_id, item_id, unit_id, warehouse_id, quantity, status,
           allocated_by_user_id, expected_dispatch_at, expected_return_at, notes,
           allocated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
           CASE WHEN $6 = 'allocated' THEN now() ELSE NULL END)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.itemId,
          input.body.unitId ?? null,
          warehouseId,
          input.body.quantity ?? 1,
          status,
          input.actorUserId,
          input.body.expectedDispatchAt ?? null,
          input.body.expectedReturnAt ?? null,
          input.body.notes ?? null,
        ],
      );
      const allocationId = inserted.rows[0]?.id;
      if (allocationId === undefined) throw new Error("Allocate failed");

      await client.query(
        `UPDATE inventory_items SET status = $2, version = version + 1 WHERE id = $1`,
        [input.body.itemId, itemStatus],
      );

      if (warehouseId !== null) {
        await client.query(
          `UPDATE inventory_stock SET
             quantity_available = GREATEST(quantity_available - $3, 0),
             quantity_reserved = quantity_reserved + CASE WHEN $4 = 'reserved' THEN $3 ELSE 0 END,
             quantity_allocated = quantity_allocated + CASE WHEN $4 = 'allocated' THEN $3 ELSE 0 END,
             version = version + 1
           WHERE item_id = $1 AND warehouse_id = $2`,
          [input.body.itemId, warehouseId, input.body.quantity ?? 1, status],
        );
      }

      await insertMovement(client, {
        allocationId,
        itemId: input.body.itemId,
        eventRecordId: input.body.eventRecordId,
        movementType: status === "allocated" ? "allocate" : "reserve",
        fromPlace: "warehouse",
        toPlace: status === "allocated" ? "allocated" : "reserved",
        fromWarehouseId: warehouseId,
        quantity: input.body.quantity ?? 1,
        actorUserId: input.actorUserId,
        ...(input.body.notes === undefined ? {} : { notes: input.body.notes }),
      });

      const timelineType =
        status === "allocated" ? "inventory_allocated" : "inventory_reserved";
      await appendEventTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: timelineType,
        title:
          status === "allocated" ? "Inventory allocated" : "Inventory reserved",
        content: `${itemRow.name} × ${input.body.quantity ?? 1}`,
        customerVisible: false,
      });
      await appendEventActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "inventory_allocation",
        content: `${itemRow.name} ${status}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "inventory", {
        aggregateId: input.body.itemId,
        actorUserId: input.actorUserId,
        entryType: timelineType,
        title:
          status === "allocated" ? "Inventory allocated" : "Inventory reserved",
        activityType: "inventory_allocation",
        content: `${itemRow.name} × ${input.body.quantity ?? 1}`,
        customerVisible: false,
      });

      const topic =
        status === "allocated"
          ? INVENTORY_NOTIFICATION_TOPICS.allocated
          : INVENTORY_NOTIFICATION_TOPICS.reserved;
      const notify = buildInventoryNotificationPayload(topic, {
        allocationId,
        itemId: input.body.itemId,
        eventRecordId: input.body.eventRecordId,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: topic,
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadAllocationSummary(client, allocationId);
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateAllocation(
    input: InventoryMutationContext & {
      readonly allocationId: string;
      readonly body: UpdateInventoryAllocationRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockAllocation(client, input.allocationId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const nextStatus = input.body.status ?? locked.status;
      const movementType = movementTypeForStatus(nextStatus);

      await client.query(
        `UPDATE inventory_allocations SET
           status = $2,
           expected_dispatch_at = CASE WHEN $3::boolean THEN $4 ELSE expected_dispatch_at END,
           expected_return_at = CASE WHEN $5::boolean THEN $6 ELSE expected_return_at END,
           notes = CASE WHEN $7::boolean THEN $8 ELSE notes END,
           allocated_at = CASE WHEN $2 = 'allocated' THEN COALESCE(allocated_at, now()) ELSE allocated_at END,
           dispatched_at = CASE WHEN $2 = 'dispatched' THEN COALESCE(dispatched_at, now()) ELSE dispatched_at END,
           on_site_at = CASE WHEN $2 = 'on_site' THEN COALESCE(on_site_at, now()) ELSE on_site_at END,
           returned_at = CASE WHEN $2 = 'returned' THEN COALESCE(returned_at, now()) ELSE returned_at END,
           version = version + 1
         WHERE id = $1`,
        [
          input.allocationId,
          nextStatus,
          input.body.expectedDispatchAt !== undefined,
          input.body.expectedDispatchAt ?? null,
          input.body.expectedReturnAt !== undefined,
          input.body.expectedReturnAt ?? null,
          input.body.notes !== undefined,
          input.body.notes ?? null,
        ],
      );

      const itemStatus = itemStatusForAllocation(nextStatus);
      await client.query(
        `UPDATE inventory_items SET status = $2, version = version + 1 WHERE id = $1`,
        [locked.item_id, itemStatus],
      );

      if (movementType !== undefined) {
        await insertMovement(client, {
          allocationId: input.allocationId,
          itemId: locked.item_id,
          eventRecordId: locked.event_record_id,
          movementType,
          fromPlace: locked.status,
          toPlace: nextStatus,
          fromWarehouseId: locked.warehouse_id,
          quantity: locked.quantity,
          actorUserId: input.actorUserId,
          ...(input.body.vehiclePlaceholder === undefined
            ? {}
            : { vehiclePlaceholder: input.body.vehiclePlaceholder }),
          ...(input.body.venuePlaceholder === undefined
            ? {}
            : { venuePlaceholder: input.body.venuePlaceholder }),
          ...(typeof input.body.notes === "string"
            ? { notes: input.body.notes }
            : {}),
        });
      }

      const timelineType = timelineTypeForStatus(nextStatus);
      if (timelineType !== undefined) {
        await appendEventTimeline(client, {
          eventRecordId: locked.event_record_id,
          actorUserId: input.actorUserId,
          entryType: timelineType,
          title: timelineType.replaceAll("_", " "),
          content: `${locked.item_name} → ${nextStatus}`,
          customerVisible: false,
        });
        await appendEventActivity(client, {
          eventRecordId: locked.event_record_id,
          actorUserId: input.actorUserId,
          activityType: "inventory_movement",
          content: `${locked.item_name} → ${nextStatus}`,
          customerVisible: false,
        });
        await appendModuleTimelineAndActivity(client, "inventory", {
          aggregateId: locked.item_id,
          actorUserId: input.actorUserId,
          entryType: timelineType,
          title: timelineType.replaceAll("_", " "),
          activityType: "inventory_movement",
          content: `${locked.item_name} → ${nextStatus}`,
          customerVisible: false,
        });
      }

      const topic = outboxTopicForStatus(nextStatus);
      if (topic !== undefined) {
        const notify = buildInventoryNotificationPayload(topic, {
          allocationId: input.allocationId,
          itemId: locked.item_id,
          eventRecordId: locked.event_record_id,
        });
        await writeAuditOutbox(client, {
          requestId: input.requestId,
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          branchId: locked.branch_id,
          entityId: locked.event_record_id,
          entityType: "event_record",
          action: topic,
          version: locked.version + 1,
          payload: notify.payload,
          outboxTopic: notify.topic,
        });
      }

      const summary = await loadAllocationSummary(client, input.allocationId);
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async returnAllocation(
    input: InventoryMutationContext & {
      readonly allocationId: string;
      readonly body: ReturnInventoryRequest;
    },
  ): Promise<InventoryAllocationSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockAllocation(client, input.allocationId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const warehouseId = input.body.warehouseId ?? locked.warehouse_id ?? null;

      await client.query(
        `INSERT INTO inventory_returns (
           allocation_id, item_id, returned_quantity, condition_on_return,
           warehouse_id, notes, returned_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          input.allocationId,
          locked.item_id,
          input.body.returnedQuantity ?? locked.quantity,
          input.body.conditionOnReturn ?? "good",
          warehouseId,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );

      await client.query(
        `UPDATE inventory_allocations SET
           status = 'returned',
           returned_at = now(),
           notes = COALESCE($2, notes),
           version = version + 1
         WHERE id = $1`,
        [input.allocationId, input.body.notes ?? null],
      );

      await client.query(
        `UPDATE inventory_items SET
           status = 'available',
           condition = $2,
           warehouse_id = COALESCE($3, warehouse_id),
           version = version + 1
         WHERE id = $1`,
        [locked.item_id, input.body.conditionOnReturn ?? "good", warehouseId],
      );

      if (warehouseId !== null) {
        await client.query(
          `UPDATE inventory_stock SET
             quantity_available = quantity_available + $3,
             quantity_allocated = GREATEST(quantity_allocated - $3, 0),
             quantity_reserved = GREATEST(quantity_reserved - $3, 0),
             version = version + 1
           WHERE item_id = $1 AND warehouse_id = $2`,
          [
            locked.item_id,
            warehouseId,
            input.body.returnedQuantity ?? locked.quantity,
          ],
        );
      }

      await insertMovement(client, {
        allocationId: input.allocationId,
        itemId: locked.item_id,
        eventRecordId: locked.event_record_id,
        movementType: "return",
        fromPlace: "venue",
        toPlace: "warehouse",
        toWarehouseId: warehouseId,
        quantity: input.body.returnedQuantity ?? locked.quantity,
        actorUserId: input.actorUserId,
        ...(input.body.notes === undefined ? {} : { notes: input.body.notes }),
      });

      await appendEventTimeline(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "inventory_returned",
        title: "Inventory returned",
        content: `${locked.item_name} returned`,
        customerVisible: false,
      });
      await appendEventActivity(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "inventory_allocation",
        content: `${locked.item_name} returned`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "inventory", {
        aggregateId: locked.item_id,
        actorUserId: input.actorUserId,
        entryType: "inventory_returned",
        title: "Inventory returned",
        activityType: "inventory_allocation",
        content: `${locked.item_name} returned`,
        customerVisible: false,
      });

      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.returned,
        {
          allocationId: input.allocationId,
          itemId: locked.item_id,
          eventRecordId: locked.event_record_id,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: locked.event_record_id,
        entityType: "event_record",
        action: "inventory.returned",
        version: locked.version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadAllocationSummary(client, input.allocationId);
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listAllocations(filters?: {
    readonly eventRecordId?: string;
    readonly itemId?: string;
    readonly branchId?: string;
    readonly limit?: number;
    readonly openOnly?: boolean;
  }): Promise<readonly InventoryAllocationSummary[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`a.event_record_id = $${params.length}`);
    }
    if (filters?.itemId !== undefined) {
      params.push(filters.itemId);
      clauses.push(`a.item_id = $${params.length}`);
    }
    if (filters?.branchId !== undefined) {
      params.push(filters.branchId);
      clauses.push(`i.branch_id = $${params.length}`);
    }
    if (filters?.openOnly === true) {
      clauses.push(`a.status NOT IN ('returned', 'cancelled')`);
    }
    const where = clauses.length === 0 ? "" : `WHERE ${clauses.join(" AND ")}`;
    const limit = filters?.limit ?? 200;
    params.push(limit);
    const result = await this.pool.query<AllocationRow>(
      `SELECT a.*, e.event_number, e.event_name, i.name AS item_name,
              i.inventory_code, w.name AS warehouse_name
       FROM inventory_allocations a
       INNER JOIN event_records e ON e.id = a.event_record_id
       INNER JOIN inventory_items i ON i.id = a.item_id
       LEFT JOIN warehouses w ON w.id = a.warehouse_id
       ${where}
       ORDER BY a.reserved_at DESC
       LIMIT $${params.length}`,
      params,
    );
    return result.rows.map(mapAllocationRow);
  }

  public async getAllocation(
    allocationId: string,
  ): Promise<InventoryAllocationDetailResponse | undefined> {
    const summary = await loadAllocationSummary(this.pool, allocationId);
    if (summary === undefined) return undefined;

    const [movements, notes, timeline] = await Promise.all([
      this.listMovements({ itemId: summary.itemId }),
      this.pool.query<NoteRow>(
        `SELECT * FROM inventory_notes
         WHERE allocation_id = $1
         ORDER BY created_at DESC`,
        [allocationId],
      ),
      this.pool.query<{
        id: string;
        entry_type: string;
        title: string;
        content: string | null;
        customer_visible: boolean;
        occurred_at: Date;
      }>(
        `SELECT id, entry_type, title, content, customer_visible, occurred_at
         FROM event_timelines
         WHERE event_record_id = $1
           AND entry_type LIKE 'inventory_%'
         ORDER BY occurred_at DESC
         LIMIT 50`,
        [summary.eventRecordId],
      ),
    ]);

    return {
      ...summary,
      movements: movements.filter((m) => m.allocationId === allocationId),
      noteEntries: notes.rows.map(toNote),
      timeline: timeline.rows.map(
        (t): EventTimelineEntry => ({
          id: t.id,
          entryType: t.entry_type as EventTimelineEntry["entryType"],
          title: t.title,
          customerVisible: t.customer_visible,
          occurredAt: t.occurred_at.toISOString(),
          ...(t.content === null ? {} : { content: t.content }),
        }),
      ),
    };
  }

  public async listMovements(filters?: {
    readonly itemId?: string;
    readonly eventRecordId?: string;
    readonly branchId?: string;
    readonly limit?: number;
  }): Promise<readonly InventoryMovementSummary[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.itemId !== undefined) {
      params.push(filters.itemId);
      clauses.push(`m.item_id = $${params.length}`);
    }
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`m.event_record_id = $${params.length}`);
    }
    if (filters?.branchId !== undefined) {
      params.push(filters.branchId);
      clauses.push(`i.branch_id = $${params.length}`);
    }
    const where = clauses.length === 0 ? "" : `WHERE ${clauses.join(" AND ")}`;
    const limit = filters?.limit ?? 200;
    params.push(limit);
    const result = await this.pool.query<{
      id: string;
      allocation_id: string | null;
      item_id: string;
      item_name: string | null;
      event_record_id: string | null;
      movement_type: InventoryMovementType;
      from_place: string | null;
      to_place: string | null;
      vehicle_placeholder: string | null;
      venue_placeholder: string | null;
      quantity: number;
      notes: string | null;
      occurred_at: Date;
    }>(
      `SELECT m.*, i.name AS item_name
       FROM inventory_movements m
       INNER JOIN inventory_items i ON i.id = m.item_id
       ${where}
       ORDER BY m.occurred_at DESC
       LIMIT $${params.length}`,
      params,
    );
    return result.rows.map(
      (m): InventoryMovementSummary => ({
        id: m.id,
        itemId: m.item_id,
        movementType: m.movement_type,
        quantity: m.quantity,
        occurredAt: m.occurred_at.toISOString(),
        ...(m.allocation_id === null ? {} : { allocationId: m.allocation_id }),
        ...(m.item_name === null ? {} : { itemName: m.item_name }),
        ...(m.event_record_id === null
          ? {}
          : { eventRecordId: m.event_record_id }),
        ...(m.from_place === null ? {} : { fromPlace: m.from_place }),
        ...(m.to_place === null ? {} : { toPlace: m.to_place }),
        ...(m.vehicle_placeholder === null
          ? {}
          : { vehiclePlaceholder: m.vehicle_placeholder }),
        ...(m.venue_placeholder === null
          ? {}
          : { venuePlaceholder: m.venue_placeholder }),
        ...(m.notes === null ? {} : { notes: m.notes }),
      }),
    );
  }

  public async reportDamage(
    input: InventoryMutationContext & {
      readonly body: ReportInventoryDamageRequest;
    },
  ): Promise<InventoryDamageReportSummary | undefined> {
    const item = await this.getItem(input.body.itemId);
    if (item === undefined) return undefined;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{
        id: string;
        created_at: Date;
        status: string;
        severity: InventoryDamageSeverity;
      }>(
        `INSERT INTO inventory_damage_reports (
           item_id, allocation_id, event_record_id, severity, summary,
           photo_placeholders, reported_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
         RETURNING id, created_at, status, severity`,
        [
          input.body.itemId,
          input.body.allocationId ?? null,
          input.body.eventRecordId ?? null,
          input.body.severity ?? "minor",
          input.body.summary,
          JSON.stringify(input.body.photoPlaceholders ?? []),
          input.actorUserId,
        ],
      );
      const row = inserted.rows[0];
      if (row === undefined) throw new Error("Damage report failed");

      await client.query(
        `UPDATE inventory_items SET status = 'damaged', condition = 'damaged', version = version + 1
         WHERE id = $1`,
        [input.body.itemId],
      );

      if (input.body.eventRecordId !== undefined) {
        await appendEventTimeline(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          entryType: "inventory_damage_reported",
          title: "Inventory damage reported",
          content: input.body.summary,
          customerVisible: false,
        });
        await appendEventActivity(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          activityType: "inventory_damage",
          content: input.body.summary,
          customerVisible: false,
        });
        await appendModuleTimelineAndActivity(client, "inventory", {
          aggregateId: input.body.itemId,
          actorUserId: input.actorUserId,
          entryType: "inventory_damage_reported",
          title: "Inventory damage reported",
          activityType: "inventory_damage",
          content: input.body.summary,
          customerVisible: false,
        });
      }

      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.damageReported,
        { itemId: input.body.itemId, reportId: row.id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.body.itemId,
        entityType: "inventory_item",
        action: "inventory.damage_reported",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await client.query("COMMIT");
      return {
        id: row.id,
        itemId: input.body.itemId,
        itemName: item.name,
        severity: row.severity,
        summary: input.body.summary,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        ...(input.body.allocationId === undefined
          ? {}
          : { allocationId: input.body.allocationId }),
        ...(input.body.eventRecordId === undefined
          ? {}
          : { eventRecordId: input.body.eventRecordId }),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async startMaintenance(
    input: InventoryMutationContext & {
      readonly body: StartInventoryMaintenanceRequest;
    },
  ): Promise<InventoryMaintenanceSummary | undefined> {
    const item = await this.getItem(input.body.itemId);
    if (item === undefined) return undefined;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{
        id: string;
        created_at: Date;
        status: InventoryMaintenanceStatus;
        started_at: Date | null;
      }>(
        `INSERT INTO inventory_maintenance (
           item_id, summary, status, started_at, notes, created_by_user_id
         ) VALUES ($1,$2,'in_progress',now(),$3,$4)
         RETURNING id, created_at, status, started_at`,
        [
          input.body.itemId,
          input.body.summary,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const row = inserted.rows[0];
      if (row === undefined) throw new Error("Maintenance start failed");

      await client.query(
        `UPDATE inventory_items SET status = 'maintenance', version = version + 1
         WHERE id = $1`,
        [input.body.itemId],
      );

      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.maintenanceStarted,
        { itemId: input.body.itemId, maintenanceId: row.id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.body.itemId,
        entityType: "inventory_item",
        action: "inventory.maintenance_started",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await client.query("COMMIT");
      return {
        id: row.id,
        itemId: input.body.itemId,
        itemName: item.name,
        summary: input.body.summary,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        ...(row.started_at === null
          ? {}
          : { startedAt: row.started_at.toISOString() }),
        ...(input.body.notes === undefined ? {} : { notes: input.body.notes }),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listMaintenance(): Promise<
    readonly InventoryMaintenanceSummary[]
  > {
    const result = await this.pool.query<{
      id: string;
      item_id: string;
      item_name: string | null;
      summary: string;
      status: InventoryMaintenanceStatus;
      started_at: Date | null;
      completed_at: Date | null;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT m.*, i.name AS item_name
       FROM inventory_maintenance m
       INNER JOIN inventory_items i ON i.id = m.item_id
       ORDER BY m.created_at DESC
       LIMIT 200`,
    );
    return result.rows.map((m) => ({
      id: m.id,
      itemId: m.item_id,
      summary: m.summary,
      status: m.status,
      createdAt: m.created_at.toISOString(),
      ...(m.item_name === null ? {} : { itemName: m.item_name }),
      ...(m.started_at === null
        ? {}
        : { startedAt: m.started_at.toISOString() }),
      ...(m.completed_at === null
        ? {}
        : { completedAt: m.completed_at.toISOString() }),
      ...(m.notes === null ? {} : { notes: m.notes }),
    }));
  }

  public async addNote(
    input: InventoryMutationContext & {
      readonly itemId: string;
      readonly body: AddInventoryNoteRequest;
    },
  ): Promise<InventoryNoteSummary | undefined> {
    if ((await this.getItem(input.itemId)) === undefined) return undefined;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<NoteRow>(
        `INSERT INTO inventory_notes (
           item_id, allocation_id, event_record_id, note_type, content,
           created_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          input.itemId,
          input.body.allocationId ?? null,
          input.body.eventRecordId ?? null,
          input.body.noteType ?? "internal",
          input.body.content,
          input.actorUserId,
        ],
      );
      const note = inserted.rows[0];
      if (note === undefined) throw new Error("Note insert failed");

      if (input.body.eventRecordId !== undefined) {
        await appendEventTimeline(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          entryType: "inventory_note_added",
          title: "Inventory note added",
          content: input.body.content,
          customerVisible: false,
        });
        await appendEventActivity(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          activityType: "inventory_note",
          content: input.body.content,
          customerVisible: false,
        });
        await appendModuleTimelineAndActivity(client, "inventory", {
          aggregateId: input.itemId,
          actorUserId: input.actorUserId,
          entryType: "inventory_note_added",
          title: "Inventory note added",
          activityType: "inventory_note",
          content: input.body.content,
          customerVisible: false,
        });
      }

      const notify = buildInventoryNotificationPayload(
        INVENTORY_NOTIFICATION_TOPICS.noteAdded,
        { itemId: input.itemId, noteId: note.id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.itemId,
        entityType: "inventory_item",
        action: "inventory.note_added",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await client.query("COMMIT");
      return toNote(note);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async getInventoryDashboard(
    branchId: string,
  ): Promise<InventoryDashboardResponse> {
    const [itemCounts, openCount, items, allocations, movements] =
      await Promise.all([
        this.pool.query<{
          total_items: number;
          available_items: number;
          reserved_items: number;
          on_site_items: number;
          maintenance_items: number;
        }>(
          `SELECT COUNT(*)::int AS total_items,
                  COUNT(*) FILTER (WHERE status = 'available')::int AS available_items,
                  COUNT(*) FILTER (WHERE status = 'reserved')::int AS reserved_items,
                  COUNT(*) FILTER (WHERE status = 'on_site')::int AS on_site_items,
                  COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance_items
           FROM inventory_items WHERE branch_id = $1`,
          [branchId],
        ),
        this.pool.query<{ open_allocations: number }>(
          `SELECT COUNT(*)::int AS open_allocations
           FROM inventory_allocations a
           INNER JOIN inventory_items i ON i.id = a.item_id
           WHERE i.branch_id = $1
             AND a.status NOT IN ('returned', 'cancelled')`,
          [branchId],
        ),
        this.listItems({ branchId, limit: 50, offset: 0 }),
        this.listAllocations({ branchId, limit: 50, openOnly: true }),
        this.listMovements({ branchId, limit: 30 }),
      ]);
    const counts = itemCounts.rows[0];
    return {
      totalItems: counts?.total_items ?? 0,
      availableItems: counts?.available_items ?? 0,
      reservedItems: counts?.reserved_items ?? 0,
      onSiteItems: counts?.on_site_items ?? 0,
      maintenanceItems: counts?.maintenance_items ?? 0,
      openAllocations: openCount.rows[0]?.open_allocations ?? 0,
      items: items.items.map(toItemSummary),
      allocations,
      recentMovements: movements,
    };
  }
}

interface WarehouseRow {
  id: string;
  warehouse_code: string;
  name: string;
  warehouse_type: WarehouseType;
  city: string;
  state: string;
  status: WarehouseStatus;
  address_line: string | null;
  pincode: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  inventory_code: string;
  name: string;
  sku: string | null;
  barcode_placeholder: string | null;
  qr_placeholder: string | null;
  status: InventoryItemStatus;
  condition: InventoryCondition;
  ownership_type: InventoryOwnershipType;
  quantity_on_hand: number;
  warehouse_id: string | null;
  warehouse_name: string | null;
  location_id: string | null;
  location_name: string | null;
  category_code: string | null;
  category_name: string | null;
  brand: string | null;
  description: string | null;
  purchase_date: Date | string | null;
  purchase_cost: string | null;
  rental_cost: string | null;
  current_value: string | null;
  owner_label: string | null;
  photo_placeholders: unknown;
  created_at: Date;
  updated_at: Date;
}

interface NoteRow {
  id: string;
  item_id: string;
  allocation_id: string | null;
  event_record_id: string | null;
  note_type: string;
  content: string;
  created_by_user_id: string | null;
  created_at: Date;
}

function mapWarehouse(row: WarehouseRow): WarehouseSummary {
  return {
    id: row.id,
    warehouseCode: row.warehouse_code,
    name: row.name,
    warehouseType: row.warehouse_type,
    city: row.city,
    state: row.state,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.address_line === null ? {} : { addressLine: row.address_line }),
    ...(row.pincode === null ? {} : { pincode: row.pincode }),
  };
}

function mapItem(row: ItemRow): InventoryItemDetailResponse {
  const photos = Array.isArray(row.photo_placeholders)
    ? row.photo_placeholders.filter((p): p is string => typeof p === "string")
    : [];
  const purchaseDate =
    row.purchase_date === null
      ? undefined
      : typeof row.purchase_date === "string"
        ? row.purchase_date
        : row.purchase_date.toISOString().slice(0, 10);
  return {
    id: row.id,
    inventoryCode: row.inventory_code,
    name: row.name,
    status: row.status,
    condition: row.condition,
    ownershipType: row.ownership_type,
    quantityOnHand: row.quantity_on_hand,
    photoPlaceholders: photos,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.sku === null ? {} : { sku: row.sku }),
    ...(row.barcode_placeholder === null
      ? {}
      : { barcodePlaceholder: row.barcode_placeholder }),
    ...(row.qr_placeholder === null
      ? {}
      : { qrPlaceholder: row.qr_placeholder }),
    ...(row.warehouse_id === null ? {} : { warehouseId: row.warehouse_id }),
    ...(row.warehouse_name === null
      ? {}
      : { warehouseName: row.warehouse_name }),
    ...(row.location_id === null ? {} : { locationId: row.location_id }),
    ...(row.location_name === null ? {} : { locationName: row.location_name }),
    ...(row.category_code === null ? {} : { categoryCode: row.category_code }),
    ...(row.category_name === null ? {} : { categoryName: row.category_name }),
    ...(row.brand === null ? {} : { brand: row.brand }),
    ...(row.description === null ? {} : { description: row.description }),
    ...(purchaseDate === undefined ? {} : { purchaseDate }),
    ...(row.purchase_cost === null ? {} : { purchaseCost: row.purchase_cost }),
    ...(row.rental_cost === null ? {} : { rentalCost: row.rental_cost }),
    ...(row.current_value === null ? {} : { currentValue: row.current_value }),
    ...(row.owner_label === null ? {} : { ownerLabel: row.owner_label }),
  };
}

function toItemSummary(
  detail: InventoryItemDetailResponse,
): InventoryItemDetailResponse {
  return detail;
}

function toNote(row: NoteRow): InventoryNoteSummary {
  return {
    id: row.id,
    itemId: row.item_id,
    noteType: row.note_type,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    ...(row.allocation_id === null ? {} : { allocationId: row.allocation_id }),
    ...(row.event_record_id === null
      ? {}
      : { eventRecordId: row.event_record_id }),
    ...(row.created_by_user_id === null
      ? {}
      : { createdByUserId: row.created_by_user_id }),
  };
}

function itemStatusForAllocation(
  status: InventoryAllocationStatus,
): InventoryItemStatus {
  switch (status) {
    case "reserved":
      return "reserved";
    case "allocated":
      return "allocated";
    case "dispatched":
      return "in_transit";
    case "on_site":
      return "on_site";
    case "returned":
      return "available";
    case "cancelled":
      return "available";
    default:
      return "allocated";
  }
}

function movementTypeForStatus(
  status: InventoryAllocationStatus,
): InventoryMovementType | undefined {
  switch (status) {
    case "allocated":
      return "allocate";
    case "dispatched":
      return "dispatch";
    case "on_site":
      return "arrive_site";
    case "returned":
      return "return";
    case "reserved":
      return "reserve";
    default:
      return undefined;
  }
}

function timelineTypeForStatus(
  status: InventoryAllocationStatus,
): string | undefined {
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

function outboxTopicForStatus(
  status: InventoryAllocationStatus,
):
  | typeof INVENTORY_NOTIFICATION_TOPICS.reserved
  | typeof INVENTORY_NOTIFICATION_TOPICS.allocated
  | typeof INVENTORY_NOTIFICATION_TOPICS.dispatched
  | typeof INVENTORY_NOTIFICATION_TOPICS.onSite
  | typeof INVENTORY_NOTIFICATION_TOPICS.returned
  | typeof INVENTORY_NOTIFICATION_TOPICS.cancelled
  | undefined {
  switch (status) {
    case "reserved":
      return INVENTORY_NOTIFICATION_TOPICS.reserved;
    case "allocated":
      return INVENTORY_NOTIFICATION_TOPICS.allocated;
    case "dispatched":
      return INVENTORY_NOTIFICATION_TOPICS.dispatched;
    case "on_site":
      return INVENTORY_NOTIFICATION_TOPICS.onSite;
    case "returned":
      return INVENTORY_NOTIFICATION_TOPICS.returned;
    case "cancelled":
      return INVENTORY_NOTIFICATION_TOPICS.cancelled;
    default:
      return undefined;
  }
}

async function lockAllocation(
  client: PoolClient,
  allocationId: string,
): Promise<
  | {
      id: string;
      event_record_id: string;
      item_id: string;
      item_name: string;
      warehouse_id: string | null;
      status: InventoryAllocationStatus;
      quantity: number;
      version: number;
      branch_id: string;
    }
  | undefined
> {
  const result = await client.query<{
    id: string;
    event_record_id: string;
    item_id: string;
    item_name: string;
    warehouse_id: string | null;
    status: InventoryAllocationStatus;
    quantity: number;
    version: number;
    branch_id: string;
  }>(
    `SELECT a.id, a.event_record_id, a.item_id, i.name AS item_name,
            a.warehouse_id, a.status, a.quantity, a.version, e.branch_id
     FROM inventory_allocations a
     INNER JOIN inventory_items i ON i.id = a.item_id
     INNER JOIN event_records e ON e.id = a.event_record_id
     WHERE a.id = $1
     FOR UPDATE OF a`,
    [allocationId],
  );
  return result.rows[0];
}

interface AllocationRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  event_name: string | null;
  item_id: string;
  item_name: string | null;
  inventory_code: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  quantity: number;
  status: InventoryAllocationStatus;
  allocated_by_user_id: string | null;
  expected_dispatch_at: Date | null;
  expected_return_at: Date | null;
  notes: string | null;
  reserved_at: Date;
  allocated_at: Date | null;
  dispatched_at: Date | null;
  on_site_at: Date | null;
  returned_at: Date | null;
  version: number;
}

function mapAllocationRow(row: AllocationRow): InventoryAllocationSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    itemId: row.item_id,
    quantity: row.quantity,
    status: row.status,
    reservedAt: row.reserved_at.toISOString(),
    version: row.version,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.event_name === null ? {} : { eventName: row.event_name }),
    ...(row.item_name === null ? {} : { itemName: row.item_name }),
    ...(row.inventory_code === null
      ? {}
      : { inventoryCode: row.inventory_code }),
    ...(row.warehouse_id === null ? {} : { warehouseId: row.warehouse_id }),
    ...(row.warehouse_name === null
      ? {}
      : { warehouseName: row.warehouse_name }),
    ...(row.allocated_by_user_id === null
      ? {}
      : { allocatedByUserId: row.allocated_by_user_id }),
    ...(row.expected_dispatch_at === null
      ? {}
      : { expectedDispatchAt: row.expected_dispatch_at.toISOString() }),
    ...(row.expected_return_at === null
      ? {}
      : { expectedReturnAt: row.expected_return_at.toISOString() }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(row.allocated_at === null
      ? {}
      : { allocatedAt: row.allocated_at.toISOString() }),
    ...(row.dispatched_at === null
      ? {}
      : { dispatchedAt: row.dispatched_at.toISOString() }),
    ...(row.on_site_at === null
      ? {}
      : { onSiteAt: row.on_site_at.toISOString() }),
    ...(row.returned_at === null
      ? {}
      : { returnedAt: row.returned_at.toISOString() }),
  };
}

async function loadAllocationSummary(
  db: Pool | PoolClient,
  allocationId: string,
): Promise<InventoryAllocationSummary | undefined> {
  const result = await db.query<AllocationRow>(
    `SELECT a.*, e.event_number, e.event_name, i.name AS item_name,
            i.inventory_code, w.name AS warehouse_name
     FROM inventory_allocations a
     INNER JOIN event_records e ON e.id = a.event_record_id
     INNER JOIN inventory_items i ON i.id = a.item_id
     LEFT JOIN warehouses w ON w.id = a.warehouse_id
     WHERE a.id = $1`,
    [allocationId],
  );
  const row = result.rows[0];
  if (row === undefined) return undefined;
  return mapAllocationRow(row);
}

async function insertMovement(
  client: PoolClient,
  input: {
    readonly allocationId?: string | null;
    readonly itemId: string;
    readonly eventRecordId?: string | null;
    readonly movementType: InventoryMovementType;
    readonly fromPlace?: string;
    readonly toPlace?: string;
    readonly fromWarehouseId?: string | null;
    readonly toWarehouseId?: string | null;
    readonly vehiclePlaceholder?: string;
    readonly venuePlaceholder?: string;
    readonly quantity: number;
    readonly actorUserId: string;
    readonly notes?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO inventory_movements (
       allocation_id, item_id, event_record_id, movement_type,
       from_place, to_place, from_warehouse_id, to_warehouse_id,
       vehicle_placeholder, venue_placeholder, quantity, notes,
       created_by_user_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      input.allocationId ?? null,
      input.itemId,
      input.eventRecordId ?? null,
      input.movementType,
      input.fromPlace ?? null,
      input.toPlace ?? null,
      input.fromWarehouseId ?? null,
      input.toWarehouseId ?? null,
      input.vehiclePlaceholder ?? null,
      input.venuePlaceholder ?? null,
      input.quantity,
      input.notes ?? null,
      input.actorUserId,
    ],
  );
}
