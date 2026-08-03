import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateExpenseRequest,
  CreateVendorSettlementRequest,
  CreateWorkerPayoutRequest,
  CustomerPaymentFinanceSummary,
  CustomerRefundSummary,
  EventExpenseSummary,
  EventFinanceDetailResponse,
  EventFinancialSummary,
  EventTimelineEntry,
  ExpenseType,
  FinanceDashboardResponse,
  FinanceSettlementStatus,
  InvoiceSummary,
  IssueInvoiceRequest,
  LedgerEntrySummary,
  LedgerListResponse,
  ReceiptSummary,
  RecordCustomerPaymentRequest,
  RecordRefundRequest,
  UpdateEventFinanceRequest,
  UpdateVendorSettlementRequest,
  UpdateWorkerPayoutRequest,
  VendorSettlementStatus,
  VendorSettlementSummary,
  WorkerPayoutStatus,
  WorkerPayoutSummary,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  buildFinanceNotificationPayload,
  FINANCE_NOTIFICATION_TOPICS,
  generateFinanceReference,
} from "../application/notification-intents";
import type {
  FinanceMutationContext,
  FinanceRepository,
} from "../ports/finance-repository";
import {
  appendEventActivity as appendActivity,
  appendEventTimeline as appendTimeline,
  writeAuditOutbox,
} from "../../../common/pattern-b/append-event-pattern-b";
import { appendModuleTimelineAndActivity } from "../../../common/pattern-b/append-module-pattern-b";

@Injectable()
export class PostgresFinanceRepository implements FinanceRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async getDashboard(
    branchId: string,
  ): Promise<FinanceDashboardResponse> {
    const summaries = await this.listEventFinance(branchId);
    const [recentPayments, recentSettlements, pendingVendor, pendingWorker] =
      await Promise.all([
        this.pool.query<PaymentRow>(
          `SELECT p.*, e.event_number
           FROM customer_payments p
           INNER JOIN event_records e ON e.id = p.event_record_id
           WHERE p.branch_id = $1
           ORDER BY p.created_at DESC
           LIMIT 20`,
          [branchId],
        ),
        this.pool.query<SettlementRow>(
          `SELECT s.*, e.event_number, v.business_name
           FROM vendor_settlements s
           INNER JOIN event_records e ON e.id = s.event_record_id
           INNER JOIN vendors v ON v.id = s.vendor_id
           WHERE s.branch_id = $1
           ORDER BY s.created_at DESC
           LIMIT 20`,
          [branchId],
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM vendor_settlements
           WHERE branch_id = $1 AND status IN ('pending', 'partially_paid')`,
          [branchId],
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM worker_payouts
           WHERE branch_id = $1 AND status IN ('pending', 'approved')`,
          [branchId],
        ),
      ]);

    const totalAdvance = summaries.reduce(
      (sum, s) => sum + parseAmount(s.advanceReceived),
      0,
    );
    const totalExpenses = summaries.reduce(
      (sum, s) => sum + parseAmount(s.totalExpense),
      0,
    );
    const totalProfit = summaries.reduce(
      (sum, s) => sum + parseAmount(s.profitAmount),
      0,
    );

    return {
      totalEvents: summaries.length,
      openSettlements: summaries.filter(
        (s) =>
          s.settlementStatus === "open" ||
          s.settlementStatus === "partially_settled",
      ).length,
      totalAdvanceReceived: formatAmount(totalAdvance),
      totalExpenses: formatAmount(totalExpenses),
      totalProfit: formatAmount(totalProfit),
      pendingVendorSettlements: Number(pendingVendor.rows[0]?.count ?? 0),
      pendingWorkerPayouts: Number(pendingWorker.rows[0]?.count ?? 0),
      summaries: summaries.slice(0, 50),
      recentPayments: recentPayments.rows.map(mapPayment),
      recentSettlements: recentSettlements.rows.map(mapSettlement),
    };
  }

  public async listEventFinance(
    branchId: string,
  ): Promise<readonly EventFinancialSummary[]> {
    const result = await this.pool.query<SummaryRow>(
      `SELECT s.*, e.event_number, e.event_name
       FROM event_financial_summary s
       INNER JOIN event_records e ON e.id = s.event_record_id
       WHERE s.branch_id = $1
       ORDER BY s.updated_at DESC
       LIMIT 200`,
      [branchId],
    );
    return result.rows.map(mapSummary);
  }

  public async getEventFinance(
    eventRecordId: string,
  ): Promise<EventFinanceDetailResponse | undefined> {
    const summary = await loadSummary(this.pool, eventRecordId);
    if (summary === undefined) return undefined;
    const branchId = await loadEventBranchId(this.pool, eventRecordId);
    if (branchId === undefined) return undefined;

    const [
      payments,
      refunds,
      vendorSettlements,
      workerPayouts,
      expenses,
      invoices,
      receipts,
      ledger,
      timeline,
    ] = await Promise.all([
      this.listCustomerPayments(branchId, { eventRecordId }),
      loadRefunds(this.pool, eventRecordId),
      this.listVendorSettlementsForEvent(eventRecordId),
      this.listWorkerPayoutsForEvent(eventRecordId),
      this.listExpensesForEvent(eventRecordId),
      this.listInvoices(branchId, { eventRecordId }),
      this.listReceipts(branchId, { eventRecordId }),
      this.listLedger(branchId, { eventRecordId }),
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
           AND entry_type LIKE 'finance_%'
         ORDER BY occurred_at DESC
         LIMIT 100`,
        [eventRecordId],
      ),
    ]);

    return {
      ...summary,
      payments,
      refunds,
      vendorSettlements,
      workerPayouts,
      expenses,
      invoices,
      receipts,
      ledger: ledger.entries,
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

  public async ensureEventFinance(
    input: FinanceMutationContext & { readonly eventRecordId: string },
  ): Promise<EventFinancialSummary> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        throw new Error("Event record not found");
      }
      const summary = await ensureEventFinance(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
      });
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateEventFinance(
    input: FinanceMutationContext & {
      readonly eventRecordId: string;
      readonly body: UpdateEventFinanceRequest;
    },
  ): Promise<EventFinancialSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventFinance(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
      });
      await client.query(
        `UPDATE event_financial_summary SET
           budget_amount = COALESCE($2, budget_amount),
           revenue_amount = COALESCE($3, revenue_amount),
           settlement_status = COALESCE($4, settlement_status),
           updated_by_user_id = $5,
           version = version + 1
         WHERE event_record_id = $1`,
        [
          input.eventRecordId,
          input.body.budgetAmount ?? null,
          input.body.revenueAmount ?? null,
          input.body.settlementStatus ?? null,
          input.actorUserId,
        ],
      );
      await recalculateSummary(client, input.eventRecordId);
      const summary = await loadSummary(client, input.eventRecordId);
      if (summary === undefined) throw new Error("Summary lost after update");

      const summaryContent = [
        input.body.budgetAmount !== undefined
          ? `budget=${String(input.body.budgetAmount)}`
          : undefined,
        input.body.revenueAmount !== undefined
          ? `revenue=${String(input.body.revenueAmount)}`
          : undefined,
        input.body.settlementStatus !== undefined
          ? `settlement=${input.body.settlementStatus}`
          : undefined,
      ]
        .filter((part): part is string => part !== undefined)
        .join(", ");
      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_summary_updated",
        title: "Finance summary updated",
        content: summaryContent,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "finance_document",
        content: "Event finance summary updated",
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_summary_updated",
        title: "Finance summary updated",
        activityType: "finance_document",
        content: summaryContent,
        customerVisible: false,
      });

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.summaryUpdated,
        { eventRecordId: input.eventRecordId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "finance.summary_updated",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async recordCustomerPayment(
    input: FinanceMutationContext & {
      readonly body: RecordCustomerPaymentRequest;
    },
  ): Promise<CustomerPaymentFinanceSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.body.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventFinance(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
      });

      const referenceCode = generateFinanceReference("PAY");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO customer_payments (
           event_record_id, branch_id, source_payment_id, payment_kind,
           amount, method_code, status, reference_code, notes,
           recorded_by_user_id, confirmed_at
         ) VALUES ($1,$2,$3,$4,$5,$6,'recorded',$7,$8,$9,now())
         RETURNING id`,
        [
          input.body.eventRecordId,
          locked.branch_id,
          input.body.sourcePaymentId ?? null,
          input.body.paymentKind ?? "advance",
          input.body.amount,
          input.body.methodCode ?? "upi",
          referenceCode,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const paymentId = inserted.rows[0]?.id;
      if (paymentId === undefined) throw new Error("Payment insert failed");

      if (input.body.issueReceipt !== false) {
        const receiptNumber = generateFinanceReference("RCP");
        await client.query(
          `INSERT INTO receipts (
             event_record_id, customer_payment_id, branch_id,
             receipt_number, amount, status, issued_at, created_by_user_id
           ) VALUES ($1,$2,$3,$4,$5,'issued',now(),$6)`,
          [
            input.body.eventRecordId,
            paymentId,
            locked.branch_id,
            receiptNumber,
            input.body.amount,
            input.actorUserId,
          ],
        );
        await appendTimeline(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          entryType: "finance_receipt_issued",
          title: "Payment receipt issued",
          content: `${receiptNumber} — ${input.body.amount}`,
          customerVisible: true,
        });
        const receiptNotify = buildFinanceNotificationPayload(
          FINANCE_NOTIFICATION_TOPICS.receiptIssued,
          { eventRecordId: input.body.eventRecordId, paymentId, receiptNumber },
        );
        await writeAuditOutbox(client, {
          requestId: input.requestId,
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          branchId: locked.branch_id,
          entityId: paymentId,
          entityType: "customer_payment",
          action: "finance.receipt_issued",
          version: 1,
          payload: receiptNotify.payload,
          outboxTopic: receiptNotify.topic,
        });
      }

      await insertFinanceTransactionWithLedger(client, {
        eventRecordId: input.body.eventRecordId,
        branchId: locked.branch_id,
        actorUserId: input.actorUserId,
        transactionType: "customer_payment",
        direction: "in",
        amount: input.body.amount,
        referenceCode,
        description: `Customer ${input.body.paymentKind ?? "advance"} payment`,
        methodCode: input.body.methodCode ?? "upi",
        relatedEntityType: "customer_payment",
        relatedEntityId: paymentId,
      });

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_payment_recorded",
        title: "Payment recorded",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "finance_payment",
        content: `Payment ${referenceCode}: ${input.body.amount}`,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_payment_recorded",
        title: "Payment recorded",
        activityType: "finance_payment",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: true,
      });

      await recalculateSummary(client, input.body.eventRecordId);

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.paymentRecorded,
        {
          eventRecordId: input.body.eventRecordId,
          paymentId,
          referenceCode,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "finance.payment_recorded",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const payment = await loadPayment(client, paymentId);
      await client.query("COMMIT");
      return payment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async recordRefund(
    input: FinanceMutationContext & { readonly body: RecordRefundRequest },
  ): Promise<CustomerRefundSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.body.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventFinance(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
      });

      const referenceCode = generateFinanceReference("REF");
      const inserted = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO customer_refunds (
           event_record_id, customer_payment_id, branch_id,
           amount, status, reason, reference_code, created_by_user_id
         ) VALUES ($1,$2,$3,$4,'approved',$5,$6,$7)
         RETURNING id, created_at`,
        [
          input.body.eventRecordId,
          input.body.customerPaymentId ?? null,
          locked.branch_id,
          input.body.amount,
          input.body.reason,
          referenceCode,
          input.actorUserId,
        ],
      );
      const row = inserted.rows[0];
      if (row === undefined) throw new Error("Refund insert failed");

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_refund_recorded",
        title: "Refund recorded",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "finance_payment",
        content: `Refund ${referenceCode}: ${input.body.amount}`,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_refund_recorded",
        title: "Refund recorded",
        activityType: "finance_payment",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: true,
      });

      await recalculateSummary(client, input.body.eventRecordId);

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.refundRecorded,
        {
          eventRecordId: input.body.eventRecordId,
          refundId: row.id,
          referenceCode,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "finance.refund_recorded",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await client.query("COMMIT");
      return {
        id: row.id,
        eventRecordId: input.body.eventRecordId,
        amount: String(input.body.amount),
        status: "approved",
        reason: input.body.reason,
        referenceCode,
        createdAt: row.created_at.toISOString(),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listCustomerPayments(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly CustomerPaymentFinanceSummary[]> {
    const clauses = [`p.branch_id = $1`];
    const params: unknown[] = [branchId];
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`p.event_record_id = $${params.length}`);
    }
    const result = await this.pool.query<PaymentRow>(
      `SELECT p.*, e.event_number
       FROM customer_payments p
       INNER JOIN event_records e ON e.id = p.event_record_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY p.created_at DESC
       LIMIT 200`,
      params,
    );
    return result.rows.map(mapPayment);
  }

  public async listCustomerPaymentsForUser(
    branchId: string,
    userId: string,
  ): Promise<readonly CustomerPaymentFinanceSummary[]> {
    const result = await this.pool.query<PaymentRow>(
      `SELECT p.*, e.event_number
       FROM customer_payments p
       INNER JOIN event_records e ON e.id = p.event_record_id
       WHERE p.branch_id = $1
         AND e.customer_id IN (
           SELECT id FROM customers WHERE user_id = $2
         )
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [branchId, userId],
    );
    return result.rows.map(mapPayment);
  }

  public async createExpense(
    input: FinanceMutationContext & { readonly body: CreateExpenseRequest },
  ): Promise<EventExpenseSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.body.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventFinance(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
      });

      let categoryId: string | null = null;
      if (input.body.categoryCode !== undefined) {
        const cat = await client.query<{ id: string }>(
          `INSERT INTO expense_categories (branch_id, code, display_name)
           VALUES ($1,$2,$3)
           ON CONFLICT (branch_id, code) DO UPDATE SET display_name = EXCLUDED.display_name
           RETURNING id`,
          [locked.branch_id, input.body.categoryCode, input.body.categoryCode],
        );
        categoryId = cat.rows[0]?.id ?? null;
      }

      const referenceCode = generateFinanceReference("EXP");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO event_expenses (
           event_record_id, branch_id, category_id, expense_type,
           amount, description, status, created_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,'recorded',$7)
         RETURNING id`,
        [
          input.body.eventRecordId,
          locked.branch_id,
          categoryId,
          input.body.expenseType ?? "other",
          input.body.amount,
          input.body.description,
          input.actorUserId,
        ],
      );
      const expenseId = inserted.rows[0]?.id;
      if (expenseId === undefined) throw new Error("Expense insert failed");

      await insertFinanceTransactionWithLedger(client, {
        eventRecordId: input.body.eventRecordId,
        branchId: locked.branch_id,
        actorUserId: input.actorUserId,
        transactionType: "expense",
        direction: "out",
        amount: input.body.amount,
        referenceCode,
        description: input.body.description,
        methodCode: "cash",
        relatedEntityType: "event_expense",
        relatedEntityId: expenseId,
      });

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_expense_added",
        title: "Expense added",
        content: `${input.body.description} — ${input.body.amount}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "finance_expense",
        content: input.body.description,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_expense_added",
        title: "Expense added",
        activityType: "finance_expense",
        content: `${input.body.description} — ${input.body.amount}`,
        customerVisible: false,
      });

      await recalculateSummary(client, input.body.eventRecordId);

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.expenseAdded,
        { eventRecordId: input.body.eventRecordId, expenseId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "finance.expense_added",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const expense = await loadExpense(client, expenseId);
      await client.query("COMMIT");
      return expense;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listExpenses(
    branchId: string,
  ): Promise<readonly EventExpenseSummary[]> {
    const result = await this.pool.query<ExpenseRow>(
      `SELECT ex.*, e.event_number, c.code AS category_code
       FROM event_expenses ex
       INNER JOIN event_records e ON e.id = ex.event_record_id
       WHERE ex.branch_id = $1
       ORDER BY ex.created_at DESC
       LIMIT 200`,
      [branchId],
    );
    return result.rows.map(mapExpense);
  }

  public async createVendorSettlement(
    input: FinanceMutationContext & {
      readonly body: CreateVendorSettlementRequest;
    },
  ): Promise<VendorSettlementSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.body.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const vendor = await client.query<{ id: string }>(
        `SELECT id FROM vendors WHERE id = $1 AND branch_id = $2`,
        [input.body.vendorId, locked.branch_id],
      );
      if (vendor.rows[0] === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await ensureEventFinance(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
      });

      const status = input.body.status ?? "pending";
      const referenceCode = generateFinanceReference("VST");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO vendor_settlements (
           event_record_id, vendor_id, vendor_bill_id, branch_id,
           amount, status, reference_code, notes, settled_by_user_id, settled_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
           CASE WHEN $6 = 'paid' THEN now() ELSE NULL END)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.vendorId,
          input.body.vendorBillId ?? null,
          locked.branch_id,
          input.body.amount,
          status,
          referenceCode,
          input.body.notes ?? null,
          status === "paid" ? input.actorUserId : null,
        ],
      );
      const settlementId = inserted.rows[0]?.id;
      if (settlementId === undefined)
        throw new Error("Settlement insert failed");

      if (status === "paid") {
        await insertFinanceTransactionWithLedger(client, {
          eventRecordId: input.body.eventRecordId,
          branchId: locked.branch_id,
          actorUserId: input.actorUserId,
          transactionType: "vendor_settlement",
          direction: "out",
          amount: input.body.amount,
          referenceCode,
          description: "Vendor settlement",
          methodCode: "bank_transfer",
          relatedEntityType: "vendor_settlement",
          relatedEntityId: settlementId,
        });
      }

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_vendor_settlement",
        title: "Vendor settlement recorded",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "finance_settlement",
        content: `Vendor settlement ${referenceCode}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_vendor_settlement",
        title: "Vendor settlement recorded",
        activityType: "finance_settlement",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: false,
      });

      await recalculateSummary(client, input.body.eventRecordId);

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.vendorSettlement,
        { eventRecordId: input.body.eventRecordId, settlementId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "finance.vendor_settlement",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const settlement = await loadSettlement(client, settlementId);
      await client.query("COMMIT");
      return settlement;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateVendorSettlement(
    input: FinanceMutationContext & {
      readonly settlementId: string;
      readonly body: UpdateVendorSettlementRequest;
    },
  ): Promise<VendorSettlementSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockSettlement(client, input.settlementId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const wasPaid = locked.status === "paid";
      await client.query(
        `UPDATE vendor_settlements SET
           status = $2,
           notes = CASE WHEN $3::boolean THEN $4 ELSE notes END,
           settled_by_user_id = CASE WHEN $2 = 'paid' THEN $5 ELSE settled_by_user_id END,
           settled_at = CASE WHEN $2 = 'paid' THEN COALESCE(settled_at, now()) ELSE settled_at END,
           version = version + 1
         WHERE id = $1`,
        [
          input.settlementId,
          input.body.status,
          input.body.notes !== undefined,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );

      if (input.body.status === "paid" && !wasPaid) {
        await insertFinanceTransactionWithLedger(client, {
          eventRecordId: locked.event_record_id,
          branchId: locked.branch_id,
          actorUserId: input.actorUserId,
          transactionType: "vendor_settlement",
          direction: "out",
          amount: parseAmount(String(locked.amount)),
          referenceCode: locked.reference_code,
          description: "Vendor settlement paid",
          methodCode: "bank_transfer",
          relatedEntityType: "vendor_settlement",
          relatedEntityId: input.settlementId,
        });
      }

      await appendTimeline(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "finance_vendor_settlement",
        title: "Vendor settlement updated",
        content: `${locked.reference_code} → ${input.body.status}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "finance_settlement",
        content: `Settlement ${locked.reference_code}: ${input.body.status}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "finance_vendor_settlement",
        title: "Vendor settlement updated",
        activityType: "finance_settlement",
        content: `${locked.reference_code} → ${input.body.status}`,
        customerVisible: false,
      });

      await recalculateSummary(client, locked.event_record_id);

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.vendorSettlement,
        {
          eventRecordId: locked.event_record_id,
          settlementId: input.settlementId,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: locked.event_record_id,
        entityType: "event_record",
        action: "finance.vendor_settlement",
        version: locked.event_version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const settlement = await loadSettlement(client, input.settlementId);
      await client.query("COMMIT");
      return settlement;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listVendorSettlements(
    branchId: string,
  ): Promise<readonly VendorSettlementSummary[]> {
    const result = await this.pool.query<SettlementRow>(
      `SELECT s.*, e.event_number, v.business_name
       FROM vendor_settlements s
       INNER JOIN event_records e ON e.id = s.event_record_id
       INNER JOIN vendors v ON v.id = s.vendor_id
       WHERE s.branch_id = $1
       ORDER BY s.created_at DESC
       LIMIT 200`,
      [branchId],
    );
    return result.rows.map(mapSettlement);
  }

  public async createWorkerPayout(
    input: FinanceMutationContext & {
      readonly body: CreateWorkerPayoutRequest;
    },
  ): Promise<WorkerPayoutSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.body.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const worker = await client.query<{ id: string }>(
        `SELECT id FROM workers WHERE id = $1 AND branch_id = $2`,
        [input.body.workerId, locked.branch_id],
      );
      if (worker.rows[0] === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await ensureEventFinance(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
      });

      const referenceCode = generateFinanceReference("WPY");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO worker_payouts (
           event_record_id, worker_id, branch_id, amount, status,
           reference_code, notes, created_by_user_id
         ) VALUES ($1,$2,$3,$4,'pending',$5,$6,$7)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.workerId,
          locked.branch_id,
          input.body.amount,
          referenceCode,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const payoutId = inserted.rows[0]?.id;
      if (payoutId === undefined) throw new Error("Payout insert failed");

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_worker_payout",
        title: "Worker payout recorded",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "finance_payout",
        content: `Worker payout ${referenceCode}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_worker_payout",
        title: "Worker payout recorded",
        activityType: "finance_payout",
        content: `${referenceCode} — ${input.body.amount}`,
        customerVisible: false,
      });

      await recalculateSummary(client, input.body.eventRecordId);

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.workerPayout,
        { eventRecordId: input.body.eventRecordId, payoutId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "finance.worker_payout",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const payout = await loadPayout(client, payoutId);
      await client.query("COMMIT");
      return payout;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateWorkerPayout(
    input: FinanceMutationContext & {
      readonly payoutId: string;
      readonly body: UpdateWorkerPayoutRequest;
    },
  ): Promise<WorkerPayoutSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockPayout(client, input.payoutId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const wasPaid = locked.status === "paid";
      await client.query(
        `UPDATE worker_payouts SET
           status = $2,
           notes = CASE WHEN $3::boolean THEN $4 ELSE notes END,
           approved_by_user_id = CASE WHEN $2 IN ('approved','paid') THEN $5 ELSE approved_by_user_id END,
           paid_at = CASE WHEN $2 = 'paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
           version = version + 1
         WHERE id = $1`,
        [
          input.payoutId,
          input.body.status,
          input.body.notes !== undefined,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );

      if (input.body.status === "paid" && !wasPaid) {
        await insertFinanceTransactionWithLedger(client, {
          eventRecordId: locked.event_record_id,
          branchId: locked.branch_id,
          actorUserId: input.actorUserId,
          transactionType: "worker_payout",
          direction: "out",
          amount: parseAmount(String(locked.amount)),
          referenceCode: locked.reference_code,
          description: "Worker payout paid",
          methodCode: "bank_transfer",
          relatedEntityType: "worker_payout",
          relatedEntityId: input.payoutId,
        });
      }

      await appendTimeline(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "finance_worker_payout",
        title: "Worker payout updated",
        content: `${locked.reference_code} → ${input.body.status}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "finance_payout",
        content: `Payout ${locked.reference_code}: ${input.body.status}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "finance_worker_payout",
        title: "Worker payout updated",
        activityType: "finance_payout",
        content: `${locked.reference_code} → ${input.body.status}`,
        customerVisible: false,
      });

      await recalculateSummary(client, locked.event_record_id);

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.workerPayout,
        {
          eventRecordId: locked.event_record_id,
          payoutId: input.payoutId,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: locked.event_record_id,
        entityType: "event_record",
        action: "finance.worker_payout",
        version: locked.event_version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const payout = await loadPayout(client, input.payoutId);
      await client.query("COMMIT");
      return payout;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listWorkerPayouts(
    branchId: string,
  ): Promise<readonly WorkerPayoutSummary[]> {
    const result = await this.pool.query<PayoutRow>(
      `SELECT p.*, e.event_number, w.display_name
       FROM worker_payouts p
       INNER JOIN event_records e ON e.id = p.event_record_id
       INNER JOIN workers w ON w.id = p.worker_id
       WHERE p.branch_id = $1
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [branchId],
    );
    return result.rows.map(mapPayout);
  }

  public async issueInvoice(
    input: FinanceMutationContext & { readonly body: IssueInvoiceRequest },
  ): Promise<InvoiceSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(client, input.body.eventRecordId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventFinance(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
      });

      const invoiceNumber = generateFinanceReference("INV");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO invoices (
           event_record_id, branch_id, invoice_number, amount,
           status, issued_at, notes, created_by_user_id
         ) VALUES ($1,$2,$3,$4,'issued',now(),$5,$6)
         RETURNING id`,
        [
          input.body.eventRecordId,
          locked.branch_id,
          invoiceNumber,
          input.body.amount,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const invoiceId = inserted.rows[0]?.id;
      if (invoiceId === undefined) throw new Error("Invoice insert failed");

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_invoice_issued",
        title: "Invoice issued",
        content: `${invoiceNumber} — ${input.body.amount}`,
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "finance_document",
        content: `Invoice ${invoiceNumber}`,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "finance", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "finance_invoice_issued",
        title: "Invoice issued",
        activityType: "finance_document",
        content: `${invoiceNumber} — ${input.body.amount}`,
        customerVisible: true,
      });

      const notify = buildFinanceNotificationPayload(
        FINANCE_NOTIFICATION_TOPICS.invoiceIssued,
        { eventRecordId: input.body.eventRecordId, invoiceId, invoiceNumber },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "finance.invoice_issued",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const invoice = await loadInvoice(client, invoiceId);
      await client.query("COMMIT");
      return invoice;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listInvoices(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
      readonly userId?: string;
    },
  ): Promise<readonly InvoiceSummary[]> {
    const clauses = [`i.branch_id = $1`];
    const params: unknown[] = [branchId];
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`i.event_record_id = $${params.length}`);
    }
    if (filters?.userId !== undefined) {
      params.push(filters.userId);
      clauses.push(
        `i.event_record_id IN (
           SELECT e.id FROM event_records e
           WHERE e.customer_id IN (
             SELECT id FROM customers WHERE user_id = $${params.length}
           )
         )`,
      );
    }
    const result = await this.pool.query<InvoiceRow>(
      `SELECT i.*, e.event_number
       FROM invoices i
       INNER JOIN event_records e ON e.id = i.event_record_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY i.created_at DESC
       LIMIT 200`,
      params,
    );
    return result.rows.map(mapInvoice);
  }

  public async listReceipts(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
      readonly userId?: string;
    },
  ): Promise<readonly ReceiptSummary[]> {
    const clauses = [`r.branch_id = $1`];
    const params: unknown[] = [branchId];
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`r.event_record_id = $${params.length}`);
    }
    if (filters?.userId !== undefined) {
      params.push(filters.userId);
      clauses.push(
        `r.event_record_id IN (
           SELECT e.id FROM event_records e
           WHERE e.customer_id IN (
             SELECT id FROM customers WHERE user_id = $${params.length}
           )
         )`,
      );
    }
    const result = await this.pool.query<ReceiptRow>(
      `SELECT r.*, e.event_number
       FROM receipts r
       INNER JOIN event_records e ON e.id = r.event_record_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY r.created_at DESC
       LIMIT 200`,
      params,
    );
    return result.rows.map(mapReceipt);
  }

  public async listLedger(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<LedgerListResponse> {
    const clauses = [`l.branch_id = $1`];
    const params: unknown[] = [branchId];
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`l.event_record_id = $${params.length}`);
    }
    const result = await this.pool.query<LedgerRow>(
      `SELECT l.*, e.event_number
       FROM ledger_entries l
       INNER JOIN event_records e ON e.id = l.event_record_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY l.occurred_at DESC
       LIMIT 500`,
      params,
    );
    return { entries: result.rows.map(mapLedger) };
  }

  private async listVendorSettlementsForEvent(
    eventRecordId: string,
  ): Promise<readonly VendorSettlementSummary[]> {
    const result = await this.pool.query<SettlementRow>(
      `SELECT s.*, e.event_number, v.business_name
       FROM vendor_settlements s
       INNER JOIN event_records e ON e.id = s.event_record_id
       INNER JOIN vendors v ON v.id = s.vendor_id
       WHERE s.event_record_id = $1
       ORDER BY s.created_at DESC`,
      [eventRecordId],
    );
    return result.rows.map(mapSettlement);
  }

  private async listWorkerPayoutsForEvent(
    eventRecordId: string,
  ): Promise<readonly WorkerPayoutSummary[]> {
    const result = await this.pool.query<PayoutRow>(
      `SELECT p.*, e.event_number, w.display_name
       FROM worker_payouts p
       INNER JOIN event_records e ON e.id = p.event_record_id
       INNER JOIN workers w ON w.id = p.worker_id
       WHERE p.event_record_id = $1
       ORDER BY p.created_at DESC`,
      [eventRecordId],
    );
    return result.rows.map(mapPayout);
  }

  private async listExpensesForEvent(
    eventRecordId: string,
  ): Promise<readonly EventExpenseSummary[]> {
    const result = await this.pool.query<ExpenseRow>(
      `SELECT ex.*, e.event_number, c.code AS category_code
       FROM event_expenses ex
       INNER JOIN event_records e ON e.id = ex.event_record_id
       LEFT JOIN expense_categories c ON c.id = ex.category_id
       WHERE ex.event_record_id = $1
       ORDER BY ex.created_at DESC`,
      [eventRecordId],
    );
    return result.rows.map(mapExpense);
  }
}

interface SummaryRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  event_name: string | null;
  currency_code: string;
  budget_amount: string;
  revenue_amount: string;
  advance_received: string;
  balance_pending: string;
  vendor_cost: string;
  worker_cost: string;
  inventory_cost: string;
  other_expenses: string;
  total_expense: string;
  profit_amount: string;
  loss_amount: string;
  settlement_status: FinanceSettlementStatus;
  updated_at: Date;
  version: number;
}

interface PaymentRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  payment_kind: string;
  amount: string;
  method_code: string;
  status: string;
  reference_code: string;
  notes: string | null;
  created_at: Date;
}

interface SettlementRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  vendor_id: string;
  business_name: string | null;
  amount: string;
  status: VendorSettlementStatus;
  reference_code: string;
  notes: string | null;
  settled_at: Date | null;
  created_at: Date;
}

interface PayoutRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  worker_id: string;
  display_name: string | null;
  amount: string;
  status: WorkerPayoutStatus;
  reference_code: string;
  notes: string | null;
  paid_at: Date | null;
  created_at: Date;
}

interface ExpenseRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  expense_type: ExpenseType;
  category_code: string | null;
  amount: string;
  description: string;
  status: string;
  created_at: Date;
}

interface InvoiceRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  invoice_number: string;
  amount: string;
  status: string;
  issued_at: Date | null;
  created_at: Date;
}

interface ReceiptRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  receipt_number: string;
  amount: string;
  status: string;
  issued_at: Date;
  created_at: Date;
}

interface LedgerRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  entry_side: "debit" | "credit";
  amount: string;
  description: string;
  occurred_at: Date;
}

function mapSummary(row: SummaryRow): EventFinancialSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    currencyCode: row.currency_code,
    budgetAmount: String(row.budget_amount),
    revenueAmount: String(row.revenue_amount),
    advanceReceived: String(row.advance_received),
    balancePending: String(row.balance_pending),
    vendorCost: String(row.vendor_cost),
    workerCost: String(row.worker_cost),
    inventoryCost: String(row.inventory_cost),
    otherExpenses: String(row.other_expenses),
    totalExpense: String(row.total_expense),
    profitAmount: String(row.profit_amount),
    lossAmount: String(row.loss_amount),
    settlementStatus: row.settlement_status,
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.event_name === null ? {} : { eventName: row.event_name }),
  };
}

function mapPayment(row: PaymentRow): CustomerPaymentFinanceSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    paymentKind:
      row.payment_kind as CustomerPaymentFinanceSummary["paymentKind"],
    amount: String(row.amount),
    methodCode: row.method_code,
    status: row.status,
    referenceCode: row.reference_code,
    createdAt: row.created_at.toISOString(),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.notes === null ? {} : { notes: row.notes }),
  };
}

function mapSettlement(row: SettlementRow): VendorSettlementSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    vendorId: row.vendor_id,
    amount: String(row.amount),
    status: row.status,
    referenceCode: row.reference_code,
    createdAt: row.created_at.toISOString(),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.business_name === null
      ? {}
      : { vendorBusinessName: row.business_name }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(row.settled_at === null
      ? {}
      : { settledAt: row.settled_at.toISOString() }),
  };
}

function mapPayout(row: PayoutRow): WorkerPayoutSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    workerId: row.worker_id,
    amount: String(row.amount),
    status: row.status,
    referenceCode: row.reference_code,
    createdAt: row.created_at.toISOString(),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.display_name === null
      ? {}
      : { workerDisplayName: row.display_name }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(row.paid_at === null ? {} : { paidAt: row.paid_at.toISOString() }),
  };
}

function mapExpense(row: ExpenseRow): EventExpenseSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    expenseType: row.expense_type,
    amount: String(row.amount),
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.category_code === null ? {} : { categoryCode: row.category_code }),
  };
}

function mapInvoice(row: InvoiceRow): InvoiceSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    invoiceNumber: row.invoice_number,
    amount: String(row.amount),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.issued_at === null
      ? {}
      : { issuedAt: row.issued_at.toISOString() }),
  };
}

function mapReceipt(row: ReceiptRow): ReceiptSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    receiptNumber: row.receipt_number,
    amount: String(row.amount),
    status: row.status,
    issuedAt: row.issued_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
  };
}

function mapLedger(row: LedgerRow): LedgerEntrySummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    entrySide: row.entry_side,
    amount: String(row.amount),
    description: row.description,
    occurredAt: row.occurred_at.toISOString(),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
  };
}

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

async function loadEventBranchId(
  db: Pool | PoolClient,
  eventRecordId: string,
): Promise<string | undefined> {
  const result = await db.query<{ branch_id: string }>(
    `SELECT branch_id FROM event_records WHERE id = $1`,
    [eventRecordId],
  );
  return result.rows[0]?.branch_id;
}

async function loadSummary(
  db: Pool | PoolClient,
  eventRecordId: string,
): Promise<EventFinancialSummary | undefined> {
  const result = await db.query<SummaryRow>(
    `SELECT s.*, e.event_number, e.event_name
     FROM event_financial_summary s
     INNER JOIN event_records e ON e.id = s.event_record_id
     WHERE s.event_record_id = $1`,
    [eventRecordId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapSummary(row);
}

async function loadPayment(
  db: Pool | PoolClient,
  paymentId: string,
): Promise<CustomerPaymentFinanceSummary | undefined> {
  const result = await db.query<PaymentRow>(
    `SELECT p.*, e.event_number
     FROM customer_payments p
     INNER JOIN event_records e ON e.id = p.event_record_id
     WHERE p.id = $1`,
    [paymentId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapPayment(row);
}

async function loadRefunds(
  db: Pool | PoolClient,
  eventRecordId: string,
): Promise<readonly CustomerRefundSummary[]> {
  const result = await db.query<{
    id: string;
    event_record_id: string;
    amount: string;
    status: string;
    reason: string;
    reference_code: string;
    created_at: Date;
  }>(
    `SELECT id, event_record_id, amount, status, reason, reference_code, created_at
     FROM customer_refunds
     WHERE event_record_id = $1
     ORDER BY created_at DESC`,
    [eventRecordId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    eventRecordId: r.event_record_id,
    amount: String(r.amount),
    status: r.status,
    reason: r.reason,
    referenceCode: r.reference_code,
    createdAt: r.created_at.toISOString(),
  }));
}

async function loadExpense(
  db: Pool | PoolClient,
  expenseId: string,
): Promise<EventExpenseSummary | undefined> {
  const result = await db.query<ExpenseRow>(
    `SELECT ex.*, e.event_number, c.code AS category_code
     FROM event_expenses ex
     INNER JOIN event_records e ON e.id = ex.event_record_id
     LEFT JOIN expense_categories c ON c.id = ex.category_id
     WHERE ex.id = $1`,
    [expenseId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapExpense(row);
}

async function loadSettlement(
  db: Pool | PoolClient,
  settlementId: string,
): Promise<VendorSettlementSummary | undefined> {
  const result = await db.query<SettlementRow>(
    `SELECT s.*, e.event_number, v.business_name
     FROM vendor_settlements s
     INNER JOIN event_records e ON e.id = s.event_record_id
     INNER JOIN vendors v ON v.id = s.vendor_id
     WHERE s.id = $1`,
    [settlementId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapSettlement(row);
}

async function loadPayout(
  db: Pool | PoolClient,
  payoutId: string,
): Promise<WorkerPayoutSummary | undefined> {
  const result = await db.query<PayoutRow>(
    `SELECT p.*, e.event_number, w.display_name
     FROM worker_payouts p
     INNER JOIN event_records e ON e.id = p.event_record_id
     INNER JOIN workers w ON w.id = p.worker_id
     WHERE p.id = $1`,
    [payoutId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapPayout(row);
}

async function loadInvoice(
  db: Pool | PoolClient,
  invoiceId: string,
): Promise<InvoiceSummary | undefined> {
  const result = await db.query<InvoiceRow>(
    `SELECT i.*, e.event_number
     FROM invoices i
     INNER JOIN event_records e ON e.id = i.event_record_id
     WHERE i.id = $1`,
    [invoiceId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapInvoice(row);
}

async function lockEventRecord(
  client: PoolClient,
  eventRecordId: string,
): Promise<
  | { id: string; branch_id: string; version: number; budget_amount: string }
  | undefined
> {
  const result = await client.query<{
    id: string;
    branch_id: string;
    version: number;
    budget_amount: string;
    advance_paid: string;
  }>(
    `SELECT id, branch_id, version, budget_amount, advance_paid
     FROM event_records
     WHERE id = $1
     FOR UPDATE`,
    [eventRecordId],
  );
  return result.rows[0];
}

async function lockSettlement(
  client: PoolClient,
  settlementId: string,
): Promise<
  | {
      id: string;
      event_record_id: string;
      branch_id: string;
      amount: string;
      status: VendorSettlementStatus;
      reference_code: string;
      event_version: number;
    }
  | undefined
> {
  const result = await client.query<{
    id: string;
    event_record_id: string;
    branch_id: string;
    amount: string;
    status: VendorSettlementStatus;
    reference_code: string;
    event_version: number;
  }>(
    `SELECT s.id, s.event_record_id, s.branch_id, s.amount, s.status,
            s.reference_code, e.version AS event_version
     FROM vendor_settlements s
     INNER JOIN event_records e ON e.id = s.event_record_id
     WHERE s.id = $1
     FOR UPDATE OF s`,
    [settlementId],
  );
  return result.rows[0];
}

async function lockPayout(
  client: PoolClient,
  payoutId: string,
): Promise<
  | {
      id: string;
      event_record_id: string;
      branch_id: string;
      amount: string;
      status: WorkerPayoutStatus;
      reference_code: string;
      event_version: number;
    }
  | undefined
> {
  const result = await client.query<{
    id: string;
    event_record_id: string;
    branch_id: string;
    amount: string;
    status: WorkerPayoutStatus;
    reference_code: string;
    event_version: number;
  }>(
    `SELECT p.id, p.event_record_id, p.branch_id, p.amount, p.status,
            p.reference_code, e.version AS event_version
     FROM worker_payouts p
     INNER JOIN event_records e ON e.id = p.event_record_id
     WHERE p.id = $1
     FOR UPDATE OF p`,
    [payoutId],
  );
  return result.rows[0];
}

async function ensureEventFinance(
  client: PoolClient,
  input: {
    readonly eventRecordId: string;
    readonly actorUserId: string;
  },
): Promise<EventFinancialSummary> {
  const existing = await loadSummary(client, input.eventRecordId);
  if (existing !== undefined) return existing;

  await client.query(
    `INSERT INTO event_financial_summary (
       event_record_id, branch_id, budget_amount, revenue_amount,
       advance_received, created_by_user_id, updated_by_user_id
     )
     SELECT e.id, e.branch_id, e.budget_amount, e.budget_amount,
            e.advance_paid, $2, $2
     FROM event_records e
     WHERE e.id = $1`,
    [input.eventRecordId, input.actorUserId],
  );

  await recalculateSummary(client, input.eventRecordId);
  const summary = await loadSummary(client, input.eventRecordId);
  if (summary === undefined) throw new Error("Failed to ensure event finance");
  return summary;
}

async function recalculateSummary(
  client: PoolClient,
  eventRecordId: string,
): Promise<void> {
  const totals = await client.query<{
    payments: string;
    refunds: string;
    vendor_settlements: string;
    worker_payouts: string;
    expense_vendor: string;
    expense_worker: string;
    expense_inventory: string;
    expense_other: string;
    revenue_amount: string;
  }>(
    `WITH payment_totals AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM customer_payments
       WHERE event_record_id = $1
         AND payment_kind IN ('advance', 'balance', 'partial')
         AND status IN ('recorded', 'confirmed')
     ),
     refund_totals AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM customer_refunds
       WHERE event_record_id = $1
         AND status IN ('approved', 'paid')
     ),
     vendor_settlement_totals AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM vendor_settlements
       WHERE event_record_id = $1 AND status <> 'cancelled'
     ),
     worker_payout_totals AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM worker_payouts
       WHERE event_record_id = $1 AND status <> 'cancelled'
     ),
     expense_vendor AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM event_expenses
       WHERE event_record_id = $1
         AND expense_type = 'vendor' AND status <> 'cancelled'
     ),
     expense_worker AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM event_expenses
       WHERE event_record_id = $1
         AND expense_type = 'worker' AND status <> 'cancelled'
     ),
     expense_inventory AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM event_expenses
       WHERE event_record_id = $1
         AND expense_type = 'inventory' AND status <> 'cancelled'
     ),
     expense_other AS (
       SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total
       FROM event_expenses
       WHERE event_record_id = $1
         AND expense_type = 'other' AND status <> 'cancelled'
     )
     SELECT
       pt.total AS payments,
       rt.total AS refunds,
       vst.total AS vendor_settlements,
       wpt.total AS worker_payouts,
       ev.total AS expense_vendor,
       ew.total AS expense_worker,
       ei.total AS expense_inventory,
       eo.total AS expense_other,
       s.revenue_amount
     FROM event_financial_summary s
     CROSS JOIN payment_totals pt
     CROSS JOIN refund_totals rt
     CROSS JOIN vendor_settlement_totals vst
     CROSS JOIN worker_payout_totals wpt
     CROSS JOIN expense_vendor ev
     CROSS JOIN expense_worker ew
     CROSS JOIN expense_inventory ei
     CROSS JOIN expense_other eo
     WHERE s.event_record_id = $1`,
    [eventRecordId],
  );

  const row = totals.rows[0];
  if (row === undefined) return;

  const payments = parseAmount(String(row.payments));
  const refunds = parseAmount(String(row.refunds));
  const advanceReceived = Math.max(0, payments - refunds);
  const revenue = parseAmount(String(row.revenue_amount));
  const vendorCost =
    parseAmount(String(row.vendor_settlements)) +
    parseAmount(String(row.expense_vendor));
  const workerCost =
    parseAmount(String(row.worker_payouts)) +
    parseAmount(String(row.expense_worker));
  const inventoryCost = parseAmount(String(row.expense_inventory));
  const otherExpenses = parseAmount(String(row.expense_other));
  const totalExpense = vendorCost + workerCost + inventoryCost + otherExpenses;
  const balancePending = revenue - advanceReceived;
  const profitAmount = Math.max(revenue - totalExpense, 0);
  const lossAmount = Math.max(totalExpense - revenue, 0);

  await client.query(
    `UPDATE event_financial_summary SET
       advance_received = $2,
       balance_pending = $3,
       vendor_cost = $4,
       worker_cost = $5,
       inventory_cost = $6,
       other_expenses = $7,
       total_expense = $8,
       profit_amount = $9,
       loss_amount = $10,
       version = version + 1
     WHERE event_record_id = $1`,
    [
      eventRecordId,
      formatAmount(advanceReceived),
      formatAmount(balancePending),
      formatAmount(vendorCost),
      formatAmount(workerCost),
      formatAmount(inventoryCost),
      formatAmount(otherExpenses),
      formatAmount(totalExpense),
      formatAmount(profitAmount),
      formatAmount(lossAmount),
    ],
  );
}

async function getAccountIdForMethod(
  client: PoolClient,
  branchId: string,
  methodCode: string,
): Promise<string | undefined> {
  const accountCode =
    methodCode === "cash"
      ? "ACC-CASH"
      : methodCode === "bank_transfer"
        ? "ACC-BANK"
        : "ACC-UPI";
  const result = await client.query<{ id: string }>(
    `SELECT id FROM finance_accounts
     WHERE branch_id = $1 AND account_code = $2 AND status = 'active'
     LIMIT 1`,
    [branchId, accountCode],
  );
  return result.rows[0]?.id;
}

async function insertFinanceTransactionWithLedger(
  client: PoolClient,
  input: {
    readonly eventRecordId: string;
    readonly branchId: string;
    readonly actorUserId: string;
    readonly transactionType: string;
    readonly direction: "in" | "out";
    readonly amount: number;
    readonly referenceCode: string;
    readonly description: string;
    readonly methodCode: string;
    readonly relatedEntityType: string;
    readonly relatedEntityId: string;
  },
): Promise<void> {
  const accountId = await getAccountIdForMethod(
    client,
    input.branchId,
    input.methodCode,
  );
  const tx = await client.query<{ id: string }>(
    `INSERT INTO finance_transactions (
       event_record_id, branch_id, account_id, transaction_type,
       direction, amount, reference_code, description,
       related_entity_type, related_entity_id, created_by_user_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      input.eventRecordId,
      input.branchId,
      accountId ?? null,
      input.transactionType,
      input.direction,
      input.amount,
      input.referenceCode,
      input.description,
      input.relatedEntityType,
      input.relatedEntityId,
      input.actorUserId,
    ],
  );
  const transactionId = tx.rows[0]?.id;
  if (transactionId === undefined) throw new Error("Transaction insert failed");

  const debitSide = input.direction === "in" ? "debit" : "credit";
  const creditSide = input.direction === "in" ? "credit" : "debit";

  await client.query(
    `INSERT INTO ledger_entries (
       event_record_id, branch_id, account_id, transaction_id,
       entry_side, amount, description, created_by_user_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      input.eventRecordId,
      input.branchId,
      accountId ?? null,
      transactionId,
      debitSide,
      input.amount,
      input.description,
      input.actorUserId,
    ],
  );
  await client.query(
    `INSERT INTO ledger_entries (
       event_record_id, branch_id, account_id, transaction_id,
       entry_side, amount, description, created_by_user_id
     ) VALUES ($1,$2,NULL,$3,$4,$5,$6,$7)`,
    [
      input.eventRecordId,
      input.branchId,
      transactionId,
      creditSide,
      input.amount,
      `${input.description} (offset)`,
      input.actorUserId,
    ],
  );
}
