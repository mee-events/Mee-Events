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
  ReceiptSummary,
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

export const FINANCE_REPOSITORY = Symbol("FINANCE_REPOSITORY");

export interface FinanceMutationContext {
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
}

export interface FinanceRepository {
  getDashboard(branchId: string): Promise<FinanceDashboardResponse>;
  listEventFinance(branchId: string): Promise<readonly EventFinancialSummary[]>;
  getEventFinance(
    eventRecordId: string,
  ): Promise<EventFinanceDetailResponse | undefined>;
  ensureEventFinance(
    input: FinanceMutationContext & { readonly eventRecordId: string },
  ): Promise<EventFinancialSummary>;
  updateEventFinance(
    input: FinanceMutationContext & {
      readonly eventRecordId: string;
      readonly body: UpdateEventFinanceRequest;
    },
  ): Promise<EventFinancialSummary | undefined>;

  recordCustomerPayment(
    input: FinanceMutationContext & {
      readonly body: RecordCustomerPaymentRequest;
    },
  ): Promise<CustomerPaymentFinanceSummary | undefined>;
  recordRefund(
    input: FinanceMutationContext & { readonly body: RecordRefundRequest },
  ): Promise<CustomerRefundSummary | undefined>;
  listCustomerPayments(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly CustomerPaymentFinanceSummary[]>;
  listCustomerPaymentsForUser(
    branchId: string,
    userId: string,
  ): Promise<readonly CustomerPaymentFinanceSummary[]>;

  createExpense(
    input: FinanceMutationContext & { readonly body: CreateExpenseRequest },
  ): Promise<EventExpenseSummary | undefined>;
  listExpenses(branchId: string): Promise<readonly EventExpenseSummary[]>;

  createVendorSettlement(
    input: FinanceMutationContext & {
      readonly body: CreateVendorSettlementRequest;
    },
  ): Promise<VendorSettlementSummary | undefined>;
  updateVendorSettlement(
    input: FinanceMutationContext & {
      readonly settlementId: string;
      readonly body: UpdateVendorSettlementRequest;
    },
  ): Promise<VendorSettlementSummary | undefined>;
  listVendorSettlements(
    branchId: string,
  ): Promise<readonly VendorSettlementSummary[]>;

  createWorkerPayout(
    input: FinanceMutationContext & {
      readonly body: CreateWorkerPayoutRequest;
    },
  ): Promise<WorkerPayoutSummary | undefined>;
  updateWorkerPayout(
    input: FinanceMutationContext & {
      readonly payoutId: string;
      readonly body: UpdateWorkerPayoutRequest;
    },
  ): Promise<WorkerPayoutSummary | undefined>;
  listWorkerPayouts(branchId: string): Promise<readonly WorkerPayoutSummary[]>;

  issueInvoice(
    input: FinanceMutationContext & { readonly body: IssueInvoiceRequest },
  ): Promise<InvoiceSummary | undefined>;
  listInvoices(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
      readonly userId?: string;
    },
  ): Promise<readonly InvoiceSummary[]>;
  listReceipts(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
      readonly userId?: string;
    },
  ): Promise<readonly ReceiptSummary[]>;
  listLedger(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<LedgerListResponse>;
}

export type {
  CustomerPaymentFinanceListResponse,
  EventExpenseListResponse,
  EventFinanceListResponse,
  FinanceDashboardResponse,
  InvoiceListResponse,
  ReceiptListResponse,
  VendorSettlementListResponse,
  WorkerPayoutListResponse,
};
