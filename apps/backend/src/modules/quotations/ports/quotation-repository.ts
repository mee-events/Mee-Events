import type {
  QuotationActivitySummary,
  QuotationDetailResponse,
  QuotationItemInput,
  QuotationItemSummary,
  QuotationItemType,
  QuotationRevisionReason,
  QuotationRevisionSummary,
  QuotationStatus,
  QuotationSummary,
} from "@me-event/api-contracts";

export interface ComputedTotals {
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly discountPercent: number;
  readonly gstPercent: number;
  readonly gstAmount: number;
  readonly finalAmount: number;
  readonly advancePercent: number;
  readonly advanceAmount: number;
}

export interface CreateQuotationInput {
  readonly branchId: string;
  readonly leadId: string;
  readonly enquiryId: string;
  readonly customerId: string;
  readonly referenceCode: string;
  readonly ownerUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly items: readonly QuotationItemInput[];
  readonly totals: ComputedTotals;
  readonly validUntil?: string;
  readonly terms?: string;
  readonly internalNotes?: string;
  readonly customerNotes?: string;
}

export interface UpdateDraftQuotationInput {
  readonly quotationId: string;
  readonly branchId: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly items: readonly QuotationItemInput[];
  readonly totals: ComputedTotals;
  readonly validUntil?: string | null;
  readonly terms?: string | null;
  readonly internalNotes?: string | null;
  readonly customerNotes?: string | null;
}

export interface ReviseQuotationInput {
  readonly quotationId: string;
  readonly branchId: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly reason: QuotationRevisionReason;
  readonly items: readonly QuotationItemInput[];
  readonly totals: ComputedTotals;
  readonly validUntil?: string | null;
  readonly terms?: string | null;
  readonly internalNotes?: string | null;
  readonly customerNotes?: string | null;
}

export interface SendQuotationInput {
  readonly quotationId: string;
  readonly branchId: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
}

export interface CustomerDecisionInput {
  readonly quotationId: string;
  readonly customerUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly reason?: string;
  readonly message?: string;
}

export interface LeadContext {
  readonly leadId: string;
  readonly enquiryId: string;
  readonly customerId: string;
  readonly branchId: string;
  readonly status: string;
  readonly ownerUserId?: string;
}

export const QUOTATION_REPOSITORY = Symbol("QUOTATION_REPOSITORY");

export interface QuotationRepository {
  findLeadContext(
    leadId: string,
    branchId: string,
  ): Promise<LeadContext | undefined>;
  createDraft(input: CreateQuotationInput): Promise<string>;
  updateDraft(input: UpdateDraftQuotationInput): Promise<boolean>;
  revise(input: ReviseQuotationInput): Promise<boolean>;
  send(input: SendQuotationInput): Promise<boolean>;
  approve(input: CustomerDecisionInput): Promise<boolean>;
  reject(input: CustomerDecisionInput): Promise<boolean>;
  requestRevision(input: CustomerDecisionInput): Promise<boolean>;
  listForBranch(branchId: string): Promise<readonly QuotationSummary[]>;
  listForCustomerUser(userId: string): Promise<readonly QuotationSummary[]>;
  findById(
    quotationId: string,
    branchId: string,
  ): Promise<QuotationDetailResponse | undefined>;
  findForCustomerUser(
    userId: string,
    quotationId: string,
  ): Promise<QuotationDetailResponse | undefined>;
  listTimeline(
    quotationId: string,
  ): Promise<readonly QuotationActivitySummary[]>;
  ensurePdfPlaceholder(
    quotationId: string,
  ): Promise<{ documentId: string; status: "pending"; message: string }>;
}

export type {
  QuotationActivitySummary,
  QuotationDetailResponse,
  QuotationItemInput,
  QuotationItemSummary,
  QuotationItemType,
  QuotationRevisionReason,
  QuotationRevisionSummary,
  QuotationStatus,
  QuotationSummary,
};
