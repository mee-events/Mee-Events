import type { VendorNotificationTopic } from "@me-event/api-contracts";

/** Outbox-only notification topics. Push is not integrated in this slice. */
export const VENDOR_NOTIFICATION_TOPICS = {
  created: "vendor.created",
  updated: "vendor.updated",
  assigned: "vendor.assigned",
  accepted: "vendor.accepted",
  rejected: "vendor.rejected",
  progressUpdated: "vendor.progress_updated",
  completed: "vendor.completed",
  noteAdded: "vendor.note_added",
} as const satisfies Record<string, VendorNotificationTopic>;

export function buildVendorNotificationPayload(
  topic: VendorNotificationTopic,
  payload: Record<string, unknown>,
): {
  readonly topic: VendorNotificationTopic;
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
