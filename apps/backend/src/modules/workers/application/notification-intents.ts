import type { WorkerNotificationTopic } from "@me-event/api-contracts";

/** Outbox-only notification topics. Push is not integrated in this slice. */
export const WORKER_NOTIFICATION_TOPICS = {
  created: "worker.created",
  updated: "worker.updated",
  assigned: "worker.assigned",
  accepted: "worker.accepted",
  rejected: "worker.rejected",
  checkedIn: "worker.checked_in",
  progressUpdated: "worker.progress_updated",
  checkedOut: "worker.checked_out",
  taskCompleted: "worker.task_completed",
  noteAdded: "worker.note_added",
} as const satisfies Record<string, WorkerNotificationTopic>;

export function buildWorkerNotificationPayload(
  topic: WorkerNotificationTopic,
  payload: Record<string, unknown>,
): {
  readonly topic: WorkerNotificationTopic;
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
