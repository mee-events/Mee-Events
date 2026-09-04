import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  CreateExpenseRequest,
  CreateVendorSettlementRequest,
  CreateWorkerPayoutRequest,
  CustomerPaymentFinanceSummary,
  CustomerRefundSummary,
  EventExpenseSummary,
  EventFinanceDetailResponse,
  EventFinancialSummary,
  EventActivitySummary,
  EventTimelineEntry,
  FinanceDashboardResponse,
  InvoiceSummary,
  IssueInvoiceRequest,
  LedgerListResponse,
  ReceiptSummary,
  RecordCustomerPaymentRequest,
  RecordRefundRequest,
  UpdateEventFinanceRequest,
  UpdateVendorSettlementRequest,
  UpdateWorkerPayoutRequest,
  VendorSettlementSummary,
  WorkerPayoutSummary,
} from "@me-event/api-contracts";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import { FinanceService } from "../src/modules/finance/application/finance.service";
import type {
  FinanceMutationContext,
  FinanceRepository,
} from "../src/modules/finance/ports/finance-repository";
import { PatternBSideEffects } from "./helpers/pattern-b-side-effects";

class FakeFinanceRepository implements FinanceRepository {
  public summaries = new Map<string, EventFinanceDetailResponse>();

  public patternB = new PatternBSideEffects();

  private recordFinanceEventSideEffects(
    input: FinanceMutationContext,
    eventRecordId: string,
    side: {
      readonly entryType: string;
      readonly title: string;
      readonly content?: string;
      readonly customerVisible?: boolean;
      readonly activityType: string;
      readonly activityContent?: string;
      readonly action: string;
      readonly outboxTopic: string;
    },
  ): EventTimelineEntry {
    const timelineEntry = this.patternB.appendTimeline(eventRecordId, {
      entryType: side.entryType as EventTimelineEntry["entryType"],
      title: side.title,
      ...(side.content === undefined ? {} : { content: side.content }),
      customerVisible: side.customerVisible ?? false,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(eventRecordId, {
      activityType: side.activityType as EventActivitySummary["activityType"],
      content: side.activityContent ?? side.title,
      customerVisible: side.customerVisible ?? false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: eventRecordId,
      action: side.action,
      outboxTopic: side.outboxTopic,
    });
    return timelineEntry;
  }

  public async getDashboard(
    _branchId: string,
  ): Promise<FinanceDashboardResponse> {
    const summaries = [...this.summaries.values()];
    return {
      totalEvents: summaries.length,
      openSettlements: summaries.filter((s) => s.settlementStatus === "open")
        .length,
      totalAdvanceReceived: summaries
        .reduce((sum, s) => sum + Number(s.advanceReceived), 0)
        .toFixed(2),
      totalExpenses: summaries
        .reduce((sum, s) => sum + Number(s.totalExpense), 0)
        .toFixed(2),
      totalProfit: summaries
        .reduce((sum, s) => sum + Number(s.profitAmount), 0)
        .toFixed(2),
      pendingVendorSettlements: summaries.reduce(
        (n, s) =>
          n + s.vendorSettlements.filter((v) => v.status === "pending").length,
        0,
      ),
      pendingWorkerPayouts: summaries.reduce(
        (n, s) =>
          n + s.workerPayouts.filter((w) => w.status === "pending").length,
        0,
      ),
      summaries,
      recentPayments: summaries.flatMap((s) => s.payments).slice(0, 20),
      recentSettlements: summaries
        .flatMap((s) => s.vendorSettlements)
        .slice(0, 20),
    };
  }

  public async listEventFinance(
    _branchId: string,
  ): Promise<readonly EventFinancialSummary[]> {
    return [...this.summaries.values()];
  }

  public async getEventFinance(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventFinanceDetailResponse | undefined> {
    if (branchId !== "00000000-0000-4000-8000-000000000001") {
      return undefined;
    }
    return this.summaries.get(eventRecordId);
  }

  public async ensureEventFinance(
    input: FinanceMutationContext & { readonly eventRecordId: string },
  ): Promise<EventFinancialSummary | undefined> {
    if (input.branchId !== "00000000-0000-4000-8000-000000000001") {
      return undefined;
    }
    const existing = this.summaries.get(input.eventRecordId);
    if (existing !== undefined) return existing;
    const now = new Date().toISOString();
    const detail: EventFinanceDetailResponse = {
      id: randomUUID(),
      eventRecordId: input.eventRecordId,
      eventNumber: "EV-TEST",
      eventName: "Test Event",
      currencyCode: "INR",
      budgetAmount: "100000.00",
      revenueAmount: "100000.00",
      advanceReceived: "0.00",
      balancePending: "100000.00",
      vendorCost: "0.00",
      workerCost: "0.00",
      inventoryCost: "0.00",
      otherExpenses: "0.00",
      totalExpense: "0.00",
      profitAmount: "100000.00",
      lossAmount: "0.00",
      settlementStatus: "open",
      updatedAt: now,
      version: 1,
      payments: [],
      refunds: [],
      vendorSettlements: [],
      workerPayouts: [],
      expenses: [],
      invoices: [],
      receipts: [],
      ledger: [],
      timeline: [],
    };
    this.summaries.set(input.eventRecordId, detail);
    return detail;
  }

  public async updateEventFinance(
    input: FinanceMutationContext & {
      readonly eventRecordId: string;
      readonly body: UpdateEventFinanceRequest;
    },
  ): Promise<EventFinancialSummary | undefined> {
    const current = this.summaries.get(input.eventRecordId);
    if (current === undefined) return undefined;
    const content = [
      input.body.budgetAmount !== undefined
        ? `budget=${input.body.budgetAmount}`
        : undefined,
      input.body.revenueAmount !== undefined
        ? `revenue=${input.body.revenueAmount}`
        : undefined,
      input.body.settlementStatus !== undefined
        ? `settlement=${input.body.settlementStatus}`
        : undefined,
    ]
      .filter((part): part is string => part !== undefined)
      .join(", ");
    const timelineEntry = this.patternB.appendTimeline(input.eventRecordId, {
      entryType: "finance_summary_updated",
      title: "Finance summary updated",
      content,
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(input.eventRecordId, {
      activityType: "finance_document",
      content: "Event finance summary updated",
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: input.eventRecordId,
      action: "finance.summary_updated",
      outboxTopic: "finance.summary_updated",
    });
    const updated = {
      ...current,
      revenueAmount:
        input.body.revenueAmount !== undefined
          ? input.body.revenueAmount.toFixed(2)
          : current.revenueAmount,
      budgetAmount:
        input.body.budgetAmount !== undefined
          ? input.body.budgetAmount.toFixed(2)
          : current.budgetAmount,
      settlementStatus: input.body.settlementStatus ?? current.settlementStatus,
      version: current.version + 1,
      timeline: [timelineEntry, ...current.timeline],
    };
    const recalculated = this.recalc(updated);
    this.summaries.set(input.eventRecordId, recalculated);
    return recalculated;
  }

  public async recordCustomerPayment(
    input: FinanceMutationContext & {
      readonly body: RecordCustomerPaymentRequest;
    },
  ): Promise<CustomerPaymentFinanceSummary | undefined> {
    await this.ensureEventFinance({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const detail = this.summaries.get(input.body.eventRecordId);
    if (detail === undefined) return undefined;
    const now = new Date().toISOString();
    const payment: CustomerPaymentFinanceSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      ...(detail.eventNumber === undefined
        ? {}
        : { eventNumber: detail.eventNumber }),
      paymentKind: input.body.paymentKind ?? "advance",
      amount: input.body.amount.toFixed(2),
      methodCode: input.body.methodCode ?? "upi",
      status: "recorded",
      referenceCode: `PAY-${Date.now()}`,
      createdAt: now,
    };
    const receipts =
      input.body.issueReceipt === false
        ? detail.receipts
        : [
            {
              id: randomUUID(),
              eventRecordId: input.body.eventRecordId,
              receiptNumber: `RCP-${Date.now()}`,
              amount: payment.amount,
              status: "issued",
              issuedAt: now,
              createdAt: now,
            } satisfies ReceiptSummary,
            ...detail.receipts,
          ];
    const timelineEntry = this.recordFinanceEventSideEffects(
      input,
      input.body.eventRecordId,
      {
        entryType: "finance_payment_recorded",
        title: "Payment recorded",
        activityType: "finance_payment",
        activityContent: `Payment ${payment.referenceCode}: ${payment.amount}`,
        action: "finance.payment_recorded",
        outboxTopic: "finance.payment_recorded",
      },
    );
    const updated: EventFinanceDetailResponse = {
      ...detail,
      payments: [payment, ...detail.payments],
      receipts,
      timeline: [timelineEntry, ...detail.timeline],
    };
    const recalculated = this.recalc(updated);
    this.summaries.set(input.body.eventRecordId, recalculated);
    return payment;
  }

  public async recordRefund(
    input: FinanceMutationContext & { readonly body: RecordRefundRequest },
  ): Promise<CustomerRefundSummary | undefined> {
    const detail = this.summaries.get(input.body.eventRecordId);
    if (detail === undefined) return undefined;
    const refund: CustomerRefundSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      amount: input.body.amount.toFixed(2),
      status: "approved",
      reason: input.body.reason,
      referenceCode: `REF-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const timelineEntry = this.recordFinanceEventSideEffects(
      input,
      input.body.eventRecordId,
      {
        entryType: "finance_refund_recorded",
        title: "Refund recorded",
        content: `${refund.referenceCode} — ${refund.amount}`,
        customerVisible: true,
        activityType: "finance_payment",
        activityContent: `Refund ${refund.referenceCode}: ${refund.amount}`,
        action: "finance.refund_recorded",
        outboxTopic: "finance.refund_recorded",
      },
    );
    const updated = {
      ...detail,
      refunds: [refund, ...detail.refunds],
      timeline: [timelineEntry, ...detail.timeline],
    };
    const recalculated = this.recalc(updated);
    this.summaries.set(input.body.eventRecordId, recalculated);
    return refund;
  }

  public async listCustomerPayments(
    _branchId: string,
  ): Promise<readonly CustomerPaymentFinanceSummary[]> {
    return [...this.summaries.values()].flatMap((s) => s.payments);
  }

  public async listCustomerPaymentsForUser(
    branchId: string,
    _userId: string,
  ): Promise<readonly CustomerPaymentFinanceSummary[]> {
    return this.listCustomerPayments(branchId);
  }

  public async createExpense(
    input: FinanceMutationContext & { readonly body: CreateExpenseRequest },
  ): Promise<EventExpenseSummary | undefined> {
    await this.ensureEventFinance({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const detail = this.summaries.get(input.body.eventRecordId);
    if (detail === undefined) return undefined;
    const expense: EventExpenseSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      expenseType: input.body.expenseType ?? "other",
      amount: input.body.amount.toFixed(2),
      description: input.body.description,
      status: "recorded",
      createdAt: new Date().toISOString(),
    };
    const timelineEntry = this.recordFinanceEventSideEffects(
      input,
      input.body.eventRecordId,
      {
        entryType: "finance_expense_added",
        title: "Expense added",
        content: expense.description,
        activityType: "finance_expense",
        activityContent: expense.description,
        action: "finance.expense_added",
        outboxTopic: "finance.expense_added",
      },
    );
    const updated = {
      ...detail,
      expenses: [expense, ...detail.expenses],
      timeline: [timelineEntry, ...detail.timeline],
    };
    const recalculated = this.recalc(updated);
    this.summaries.set(input.body.eventRecordId, recalculated);
    return expense;
  }

  public async listExpenses(
    _branchId: string,
  ): Promise<readonly EventExpenseSummary[]> {
    return [...this.summaries.values()].flatMap((s) => s.expenses);
  }

  public async createVendorSettlement(
    input: FinanceMutationContext & {
      readonly body: CreateVendorSettlementRequest;
    },
  ): Promise<VendorSettlementSummary | undefined> {
    await this.ensureEventFinance({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const detail = this.summaries.get(input.body.eventRecordId);
    if (detail === undefined) return undefined;
    const settlement: VendorSettlementSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      vendorId: input.body.vendorId,
      amount: input.body.amount.toFixed(2),
      status: input.body.status ?? "pending",
      referenceCode: `VST-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const timelineEntry = this.recordFinanceEventSideEffects(
      input,
      input.body.eventRecordId,
      {
        entryType: "finance_vendor_settlement",
        title: "Vendor settlement",
        activityType: "finance_settlement",
        activityContent: `Vendor settlement ${settlement.referenceCode}`,
        action: "finance.vendor_settlement",
        outboxTopic: "finance.vendor_settlement",
      },
    );
    const updated = {
      ...detail,
      vendorSettlements: [settlement, ...detail.vendorSettlements],
      timeline: [timelineEntry, ...detail.timeline],
    };
    const recalculated = this.recalc(updated);
    this.summaries.set(input.body.eventRecordId, recalculated);
    return settlement;
  }

  public async updateVendorSettlement(
    input: FinanceMutationContext & {
      readonly settlementId: string;
      readonly body: UpdateVendorSettlementRequest;
    },
  ): Promise<VendorSettlementSummary | undefined> {
    for (const [eventId, detail] of this.summaries) {
      const idx = detail.vendorSettlements.findIndex(
        (s) => s.id === input.settlementId,
      );
      if (idx < 0) continue;
      const current = detail.vendorSettlements[idx]!;
      const settlement = { ...current, status: input.body.status };
      const settlements = [...detail.vendorSettlements];
      settlements[idx] = settlement;
      const updated = { ...detail, vendorSettlements: settlements };
      this.summaries.set(eventId, this.recalc(updated));
      return settlement;
    }
    return undefined;
  }

  public async listVendorSettlements(
    _branchId: string,
  ): Promise<readonly VendorSettlementSummary[]> {
    return [...this.summaries.values()].flatMap((s) => s.vendorSettlements);
  }

  public async createWorkerPayout(
    input: FinanceMutationContext & {
      readonly body: CreateWorkerPayoutRequest;
    },
  ): Promise<WorkerPayoutSummary | undefined> {
    await this.ensureEventFinance({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const detail = this.summaries.get(input.body.eventRecordId);
    if (detail === undefined) return undefined;
    const payout: WorkerPayoutSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      workerId: input.body.workerId,
      amount: input.body.amount.toFixed(2),
      status: "pending",
      referenceCode: `WPO-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const timelineEntry = this.recordFinanceEventSideEffects(
      input,
      input.body.eventRecordId,
      {
        entryType: "finance_worker_payout",
        title: "Worker payout",
        activityType: "finance_payout",
        activityContent: `Worker payout ${payout.referenceCode}`,
        action: "finance.worker_payout",
        outboxTopic: "finance.worker_payout",
      },
    );
    const updated = {
      ...detail,
      workerPayouts: [payout, ...detail.workerPayouts],
      timeline: [timelineEntry, ...detail.timeline],
    };
    const recalculated = this.recalc(updated);
    this.summaries.set(input.body.eventRecordId, recalculated);
    return payout;
  }

  public async updateWorkerPayout(
    input: FinanceMutationContext & {
      readonly payoutId: string;
      readonly body: UpdateWorkerPayoutRequest;
    },
  ): Promise<WorkerPayoutSummary | undefined> {
    for (const [eventId, detail] of this.summaries) {
      const idx = detail.workerPayouts.findIndex(
        (p) => p.id === input.payoutId,
      );
      if (idx < 0) continue;
      const current = detail.workerPayouts[idx]!;
      const payout = { ...current, status: input.body.status };
      const payouts = [...detail.workerPayouts];
      payouts[idx] = payout;
      const updated = { ...detail, workerPayouts: payouts };
      this.summaries.set(eventId, this.recalc(updated));
      return payout;
    }
    return undefined;
  }

  public async listWorkerPayouts(
    _branchId: string,
  ): Promise<readonly WorkerPayoutSummary[]> {
    return [...this.summaries.values()].flatMap((s) => s.workerPayouts);
  }

  public async issueInvoice(
    input: FinanceMutationContext & { readonly body: IssueInvoiceRequest },
  ): Promise<InvoiceSummary | undefined> {
    await this.ensureEventFinance({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const detail = this.summaries.get(input.body.eventRecordId);
    if (detail === undefined) return undefined;
    const invoice: InvoiceSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      invoiceNumber: `INV-${Date.now()}`,
      amount: input.body.amount.toFixed(2),
      status: "issued",
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const timelineEntry = this.recordFinanceEventSideEffects(
      input,
      input.body.eventRecordId,
      {
        entryType: "finance_invoice_issued",
        title: "Invoice issued",
        customerVisible: true,
        activityType: "finance_document",
        activityContent: `Invoice ${invoice.invoiceNumber}`,
        action: "finance.invoice_issued",
        outboxTopic: "finance.invoice_issued",
      },
    );
    const updated = {
      ...detail,
      invoices: [invoice, ...detail.invoices],
      timeline: [timelineEntry, ...detail.timeline],
    };
    this.summaries.set(input.body.eventRecordId, updated);
    return invoice;
  }

  public async listInvoices(
    _branchId: string,
  ): Promise<readonly InvoiceSummary[]> {
    return [...this.summaries.values()].flatMap((s) => s.invoices);
  }

  public async listReceipts(
    _branchId: string,
  ): Promise<readonly ReceiptSummary[]> {
    return [...this.summaries.values()].flatMap((s) => s.receipts);
  }

  public async listLedger(_branchId: string): Promise<LedgerListResponse> {
    return {
      entries: [...this.summaries.values()].flatMap((s) => s.ledger),
    };
  }

  private recalc(
    detail: EventFinanceDetailResponse,
  ): EventFinanceDetailResponse {
    const advance = detail.payments
      .filter((p) => ["advance", "balance", "partial"].includes(p.paymentKind))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const refunds = detail.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    const vendorCost = detail.vendorSettlements
      .filter((s) => s.status !== "cancelled")
      .reduce((sum, s) => sum + Number(s.amount), 0);
    const workerCost = detail.workerPayouts
      .filter((p) => p.status !== "cancelled")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const inventoryCost = detail.expenses
      .filter((e) => e.expenseType === "inventory" && e.status !== "cancelled")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const otherExpenses = detail.expenses
      .filter((e) => e.expenseType === "other" && e.status !== "cancelled")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpense =
      vendorCost + workerCost + inventoryCost + otherExpenses;
    const revenue = Number(detail.revenueAmount);
    const netAdvance = Math.max(advance - refunds, 0);
    const profit = Math.max(revenue - totalExpense, 0);
    const loss = Math.max(totalExpense - revenue, 0);
    return {
      ...detail,
      advanceReceived: netAdvance.toFixed(2),
      balancePending: (revenue - netAdvance).toFixed(2),
      vendorCost: vendorCost.toFixed(2),
      workerCost: workerCost.toFixed(2),
      inventoryCost: inventoryCost.toFixed(2),
      otherExpenses: otherExpenses.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      profitAmount: profit.toFixed(2),
      lossAmount: loss.toFixed(2),
    };
  }
}

const financeUser: AuthenticatedPrincipal = {
  userId: "finance-1",
  sessionId: "s1",
  activeRole: "finance",
  roleAssignments: [
    {
      role: "finance",
      active: true,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
  ],
};

describe("Finance & Settlement Foundation", () => {
  let repo: FakeFinanceRepository;
  let service: FinanceService;
  let eventId: string;

  beforeEach(() => {
    repo = new FakeFinanceRepository();
    service = new FinanceService(repo);
    eventId = randomUUID();
  });

  it("updates event finance through payment → settlement → payout → expense", async () => {
    await service.ensureEventFinance(financeUser, eventId);
    await service.updateEventFinance(financeUser, eventId, {
      revenueAmount: 100000,
    });

    await service.recordCustomerPayment(financeUser, {
      eventRecordId: eventId,
      amount: 30000,
      paymentKind: "advance",
      methodCode: "upi",
      issueReceipt: true,
    });

    const settlement = await service.createVendorSettlement(financeUser, {
      eventRecordId: eventId,
      vendorId: randomUUID(),
      amount: 15000,
      status: "pending",
    });
    await service.updateVendorSettlement(financeUser, settlement.id, {
      status: "paid",
    });

    const payout = await service.createWorkerPayout(financeUser, {
      eventRecordId: eventId,
      workerId: randomUUID(),
      amount: 5000,
    });
    await service.updateWorkerPayout(financeUser, payout.id, {
      status: "paid",
    });

    await service.createExpense(financeUser, {
      eventRecordId: eventId,
      expenseType: "other",
      amount: 2000,
      description: "Transport",
    });

    const detail = await service.getEventFinance(financeUser, eventId);
    const types = detail.timeline.map((e) => e.entryType);

    expect(types).toContain("finance_payment_recorded");
    expect(types).toContain("finance_vendor_settlement");
    expect(types).toContain("finance_worker_payout");
    expect(types).toContain("finance_expense_added");
    expect(Number(detail.advanceReceived)).toBe(30000);
    expect(Number(detail.vendorCost)).toBe(15000);
    expect(Number(detail.workerCost)).toBe(5000);
    expect(Number(detail.otherExpenses)).toBe(2000);
    expect(Number(detail.totalExpense)).toBe(22000);
    expect(Number(detail.profitAmount)).toBe(78000);
    expect(repo.patternB.timelineTypes(eventId)).toContain(
      "finance_summary_updated",
    );
    expect(repo.patternB.activityTypes(eventId)).toContain("finance_payment");
    expect(repo.patternB.activityTypes(eventId)).toContain("finance_expense");
    expect(repo.patternB.activityTypes(eventId)).toContain("finance_document");
    expect(repo.patternB.outboxTopics()).toContain("finance.payment_recorded");
    expect(repo.patternB.outboxTopics()).toContain("finance.summary_updated");
    expect(repo.patternB.auditActions()).toContain("finance.vendor_settlement");
    expect(repo.patternB.auditActions()).toContain("finance.worker_payout");
    expect(repo.patternB.audits.some((a) => a.actorUserId && a.requestId)).toBe(
      true,
    );
  });

  it("exposes finance dashboard counts", async () => {
    await service.ensureEventFinance(financeUser, eventId);
    await service.recordCustomerPayment(financeUser, {
      eventRecordId: eventId,
      amount: 10000,
      paymentKind: "advance",
      methodCode: "cash",
      issueReceipt: true,
    });
    const dashboard = await service.getDashboard(financeUser);
    expect(dashboard.totalEvents).toBe(1);
    expect(Number(dashboard.totalAdvanceReceived)).toBe(10000);
  });

  it("denies other-branch event finance detail as 404", async () => {
    await service.ensureEventFinance(financeUser, eventId);
    const other: AuthenticatedPrincipal = {
      ...financeUser,
      userId: "other-branch",
      branchId: "00000000-0000-4000-8000-000000000002",
    };
    await expect(
      service.getEventFinance(financeUser, eventId),
    ).resolves.toMatchObject({ eventRecordId: eventId });
    await expect(service.getEventFinance(other, eventId)).rejects.toMatchObject(
      {
        code: "EVENT_FINANCE_NOT_FOUND",
        status: 404,
      },
    );
  });
});
