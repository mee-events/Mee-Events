import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateExpenseRequest,
  CreateVendorSettlementRequest,
  CreateWorkerPayoutRequest,
  CustomerPaymentFinanceListResponse,
  CustomerPaymentFinanceSummary,
  CustomerRefundSummary,
  EventExpenseListResponse,
  EventExpenseSummary,
  EventFinanceDetailResponse,
  EventFinanceListResponse,
  EventFinancialSummary,
  FinanceDashboardResponse,
  InvoiceListResponse,
  InvoiceSummary,
  IssueInvoiceRequest,
  LedgerListResponse,
  ReceiptListResponse,
  RecordCustomerPaymentRequest,
  RecordRefundRequest,
  UpdateEventFinanceRequest,
  UpdateVendorSettlementRequest,
  UpdateWorkerPayoutRequest,
  VendorSettlementListResponse,
  VendorSettlementSummary,
  WorkerPayoutListResponse,
  WorkerPayoutSummary,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  FINANCE_REPOSITORY,
  type FinanceRepository,
} from "../ports/finance-repository";

@Injectable()
export class FinanceService {
  public constructor(
    @Inject(FINANCE_REPOSITORY)
    private readonly finance: FinanceRepository,
  ) {}

  public getDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<FinanceDashboardResponse> {
    return this.finance.getDashboard(resolveBranchId(principal));
  }

  public async listEventFinance(
    principal: AuthenticatedPrincipal,
  ): Promise<EventFinanceListResponse> {
    return {
      summaries: await this.finance.listEventFinance(
        resolveBranchId(principal),
      ),
    };
  }

  public async getEventFinance(
    eventRecordId: string,
  ): Promise<EventFinanceDetailResponse> {
    const detail = await this.finance.getEventFinance(eventRecordId);
    if (detail === undefined) {
      throw new DomainError(
        "EVENT_FINANCE_NOT_FOUND",
        "Event finance summary not found",
        404,
      );
    }
    return detail;
  }

  public ensureEventFinance(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    requestId: string = randomUUID(),
  ): Promise<EventFinancialSummary> {
    return this.finance.ensureEventFinance({
      eventRecordId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
  }

  public async updateEventFinance(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: UpdateEventFinanceRequest,
    requestId: string = randomUUID(),
  ): Promise<EventFinancialSummary> {
    const summary = await this.finance.updateEventFinance({
      eventRecordId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (summary === undefined) {
      throw new DomainError(
        "EVENT_FINANCE_NOT_FOUND",
        "Event finance summary not found",
        404,
      );
    }
    return summary;
  }

  public async recordCustomerPayment(
    principal: AuthenticatedPrincipal,
    body: RecordCustomerPaymentRequest,
    requestId: string = randomUUID(),
  ): Promise<CustomerPaymentFinanceSummary> {
    const payment = await this.finance.recordCustomerPayment({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (payment === undefined) {
      throw new DomainError(
        "FINANCE_PAYMENT_FAILED",
        "Event record not found",
        404,
      );
    }
    return payment;
  }

  public async recordRefund(
    principal: AuthenticatedPrincipal,
    body: RecordRefundRequest,
    requestId: string = randomUUID(),
  ): Promise<CustomerRefundSummary> {
    const refund = await this.finance.recordRefund({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (refund === undefined) {
      throw new DomainError(
        "FINANCE_REFUND_FAILED",
        "Event record not found",
        404,
      );
    }
    return refund;
  }

  public async listCustomerPayments(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<CustomerPaymentFinanceListResponse> {
    return {
      payments: await this.finance.listCustomerPayments(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async listOwnCustomerPayments(
    principal: AuthenticatedPrincipal,
  ): Promise<CustomerPaymentFinanceListResponse> {
    return {
      payments: await this.finance.listCustomerPaymentsForUser(
        resolveBranchId(principal),
        principal.userId,
      ),
    };
  }

  public async createExpense(
    principal: AuthenticatedPrincipal,
    body: CreateExpenseRequest,
    requestId: string = randomUUID(),
  ): Promise<EventExpenseSummary> {
    const expense = await this.finance.createExpense({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (expense === undefined) {
      throw new DomainError(
        "FINANCE_EXPENSE_FAILED",
        "Event record not found",
        404,
      );
    }
    return expense;
  }

  public async listExpenses(
    principal: AuthenticatedPrincipal,
  ): Promise<EventExpenseListResponse> {
    return {
      expenses: await this.finance.listExpenses(resolveBranchId(principal)),
    };
  }

  public async createVendorSettlement(
    principal: AuthenticatedPrincipal,
    body: CreateVendorSettlementRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorSettlementSummary> {
    const settlement = await this.finance.createVendorSettlement({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (settlement === undefined) {
      throw new DomainError(
        "FINANCE_SETTLEMENT_FAILED",
        "Event or vendor not found",
        404,
      );
    }
    return settlement;
  }

  public async updateVendorSettlement(
    principal: AuthenticatedPrincipal,
    settlementId: string,
    body: UpdateVendorSettlementRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorSettlementSummary> {
    const settlement = await this.finance.updateVendorSettlement({
      settlementId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (settlement === undefined) {
      throw new DomainError(
        "FINANCE_SETTLEMENT_NOT_FOUND",
        "Settlement not found",
        404,
      );
    }
    return settlement;
  }

  public async listVendorSettlements(
    principal: AuthenticatedPrincipal,
  ): Promise<VendorSettlementListResponse> {
    return {
      settlements: await this.finance.listVendorSettlements(
        resolveBranchId(principal),
      ),
    };
  }

  public async createWorkerPayout(
    principal: AuthenticatedPrincipal,
    body: CreateWorkerPayoutRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerPayoutSummary> {
    const payout = await this.finance.createWorkerPayout({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (payout === undefined) {
      throw new DomainError(
        "FINANCE_PAYOUT_FAILED",
        "Event or worker not found",
        404,
      );
    }
    return payout;
  }

  public async updateWorkerPayout(
    principal: AuthenticatedPrincipal,
    payoutId: string,
    body: UpdateWorkerPayoutRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerPayoutSummary> {
    const payout = await this.finance.updateWorkerPayout({
      payoutId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (payout === undefined) {
      throw new DomainError(
        "FINANCE_PAYOUT_NOT_FOUND",
        "Payout not found",
        404,
      );
    }
    return payout;
  }

  public async listWorkerPayouts(
    principal: AuthenticatedPrincipal,
  ): Promise<WorkerPayoutListResponse> {
    return {
      payouts: await this.finance.listWorkerPayouts(resolveBranchId(principal)),
    };
  }

  public async issueInvoice(
    principal: AuthenticatedPrincipal,
    body: IssueInvoiceRequest,
    requestId: string = randomUUID(),
  ): Promise<InvoiceSummary> {
    const invoice = await this.finance.issueInvoice({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (invoice === undefined) {
      throw new DomainError(
        "FINANCE_INVOICE_FAILED",
        "Event record not found",
        404,
      );
    }
    return invoice;
  }

  public async listInvoices(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<InvoiceListResponse> {
    return {
      invoices: await this.finance.listInvoices(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async listOwnInvoices(
    principal: AuthenticatedPrincipal,
  ): Promise<InvoiceListResponse> {
    return {
      invoices: await this.finance.listInvoices(resolveBranchId(principal), {
        userId: principal.userId,
      }),
    };
  }

  public async listReceipts(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<ReceiptListResponse> {
    return {
      receipts: await this.finance.listReceipts(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async listOwnReceipts(
    principal: AuthenticatedPrincipal,
  ): Promise<ReceiptListResponse> {
    return {
      receipts: await this.finance.listReceipts(resolveBranchId(principal), {
        userId: principal.userId,
      }),
    };
  }

  public listLedger(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<LedgerListResponse> {
    return this.finance.listLedger(resolveBranchId(principal), filters);
  }
}
