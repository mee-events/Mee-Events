import type { ManagerNotificationTopic } from "@me-event/api-contracts";

/**
 * Notification architecture foundation only.
 * Topics are written to outbox_events for future push/email consumers.
 * Do not integrate FCM/APNs/SMS in this slice.
 */
export const MANAGER_NOTIFICATION_TOPICS = {
  managerAssigned: "manager.assigned",
  managerReassigned: "manager.reassigned",
  taskCreated: "task.created",
  taskAssigned: "task.assigned",
  taskUpdated: "task.updated",
  taskCompleted: "task.completed",
  taskStatusChanged: "task.status_changed",
  progressAdded: "progress.added",
  eventStatusChanged: "event.status_changed",
} as const satisfies Record<string, ManagerNotificationTopic>;

export function buildNotificationOutboxPayload(
  topic: ManagerNotificationTopic,
  payload: Record<string, unknown>,
): {
  readonly topic: ManagerNotificationTopic;
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
