import type { OperationsNotificationTopic } from "@me-event/api-contracts";

/** Outbox-only notification topics. Push is not integrated in this slice. */
export const OPERATIONS_NOTIFICATION_TOPICS = {
  taskCreated: "operations.task_created",
  taskUpdated: "operations.task_updated",
  taskAssigned: "operations.task_assigned",
  attendanceRecorded: "operations.attendance_recorded",
  issueCreated: "operations.issue_created",
  issueUpdated: "operations.issue_updated",
  photoUploaded: "operations.photo_uploaded",
  materialRecorded: "operations.material_recorded",
  progressUpdated: "operations.progress_updated",
  eventCompleted: "operations.event_completed",
} as const satisfies Record<string, OperationsNotificationTopic>;

export function buildOperationsNotificationPayload(
  topic: OperationsNotificationTopic,
  payload: Record<string, unknown>,
): {
  readonly topic: OperationsNotificationTopic;
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
