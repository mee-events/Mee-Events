import type { InventoryNotificationTopic } from "@me-event/api-contracts";

/** Outbox-only notification topics. Push is not integrated in this slice. */
export const INVENTORY_NOTIFICATION_TOPICS = {
  created: "inventory.created",
  updated: "inventory.updated",
  reserved: "inventory.reserved",
  allocated: "inventory.allocated",
  dispatched: "inventory.dispatched",
  onSite: "inventory.on_site",
  returned: "inventory.returned",
  cancelled: "inventory.cancelled",
  damageReported: "inventory.damage_reported",
  maintenanceStarted: "inventory.maintenance_started",
  noteAdded: "inventory.note_added",
  warehouseCreated: "warehouse.created",
  warehouseUpdated: "warehouse.updated",
} as const satisfies Record<string, InventoryNotificationTopic>;

export function buildInventoryNotificationPayload(
  topic: InventoryNotificationTopic,
  payload: Record<string, unknown>,
): {
  readonly topic: InventoryNotificationTopic;
  readonly payload: Record<string, unknown>;
} {
  return {
    topic,
    payload: {
      ...payload,
      notificationReady: true,
      pushIntegrated: false,
      channel: "outbox_only",
    },
  };
}
