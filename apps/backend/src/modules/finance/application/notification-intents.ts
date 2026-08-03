import type { FinanceNotificationTopic } from "@me-event/api-contracts";

/** Outbox-only notification topics. Push is not integrated in this slice. */
export const FINANCE_NOTIFICATION_TOPICS = {
  paymentRecorded: "finance.payment_recorded",
  refundRecorded: "finance.refund_recorded",
  expenseAdded: "finance.expense_added",
  vendorSettlement: "finance.vendor_settlement",
  workerPayout: "finance.worker_payout",
  invoiceIssued: "finance.invoice_issued",
  receiptIssued: "finance.receipt_issued",
  summaryUpdated: "finance.summary_updated",
} as const satisfies Record<string, FinanceNotificationTopic>;

export function buildFinanceNotificationPayload(
  topic: FinanceNotificationTopic,
  payload: Record<string, unknown>,
): {
  readonly topic: FinanceNotificationTopic;
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

export function generateFinanceReference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${stamp}${rand}`.slice(0, 28);
}
