import type {
  ConfirmAdvanceResult,
  PaymentSummary,
  QuotationDetailResponse,
} from "@me-event/api-contracts";
import type { Pool } from "pg";
import { PostgresPaymentRepository } from "../../../src/modules/payments/adapters/postgres-payment.repository";
import { PaymentService } from "../../../src/modules/payments/application/payment.service";
import { PostgresQuotationRepository } from "../../../src/modules/quotations/adapters/postgres-quotation.repository";
import { QuotationService } from "../../../src/modules/quotations/application/quotation.service";
import {
  HYDERABAD_BRANCH_ID,
  type SyntheticLeadFlow,
  createSyntheticLeadFlow,
} from "./fixtures";

export interface SentQuotationFlow extends SyntheticLeadFlow {
  readonly quotation: QuotationDetailResponse;
  readonly quotationRepository: PostgresQuotationRepository;
  readonly quotationService: QuotationService;
}

export interface ApprovedQuotationFlow extends SentQuotationFlow {
  readonly approved: QuotationDetailResponse;
}

export interface PendingAdvanceFlow extends ApprovedQuotationFlow {
  readonly payment: PaymentSummary;
  readonly paymentRepository: PostgresPaymentRepository;
  readonly paymentService: PaymentService;
}

export async function createSentQuotationFlow(
  pool: Pool,
  label: string,
  branchId: string = HYDERABAD_BRANCH_ID,
): Promise<SentQuotationFlow> {
  const flow = await createSyntheticLeadFlow(pool, label, branchId);
  const quotationRepository = new PostgresQuotationRepository(pool);
  const quotationService = new QuotationService(quotationRepository);
  const draft = await quotationService.create(
    flow.employee.principal,
    {
      leadId: flow.leadId,
      items: [
        {
          itemType: "service",
          title: `Synthetic DBINT service ${label}`,
          description: "Synthetic integration-only quotation line",
          quantity: 2,
          unitPrice: 1_000,
          sortOrder: 0,
        },
      ],
      gstPercent: 18,
      discountAmount: 0,
      discountPercent: 0,
      advancePercent: 30,
      validUntil: "2027-02-01",
      terms: "Synthetic integration terms",
      internalNotes: "Synthetic internal note",
      customerNotes: "Synthetic customer note",
    },
    `dbint-quotation-create-${label}`,
  );
  const quotation = await quotationService.send(
    flow.employee.principal,
    draft.id,
    `dbint-quotation-send-${label}`,
  );
  return {
    ...flow,
    quotation,
    quotationRepository,
    quotationService,
  };
}

export async function createApprovedQuotationFlow(
  pool: Pool,
  label: string,
  branchId: string = HYDERABAD_BRANCH_ID,
): Promise<ApprovedQuotationFlow> {
  const flow = await createSentQuotationFlow(pool, label, branchId);
  const approved = await flow.quotationService.approve(
    flow.user.principal,
    flow.quotation.id,
    `dbint-quotation-approve-${label}`,
  );
  return { ...flow, approved };
}

export async function createPendingAdvanceFlow(
  pool: Pool,
  label: string,
  branchId: string = HYDERABAD_BRANCH_ID,
): Promise<PendingAdvanceFlow> {
  const flow = await createApprovedQuotationFlow(pool, label, branchId);
  const paymentRepository = new PostgresPaymentRepository(pool);
  const paymentService = new PaymentService(paymentRepository);
  const payment = await paymentService.submitAdvance(
    flow.user.principal,
    {
      quotationId: flow.approved.id,
      method: "upi",
      notes: `Synthetic advance ${label}`,
    },
    `dbint-payment-submit-${label}`,
  );
  return {
    ...flow,
    payment,
    paymentRepository,
    paymentService,
  };
}

export async function confirmPendingAdvance(
  flow: PendingAdvanceFlow,
  label: string,
): Promise<ConfirmAdvanceResult> {
  return flow.paymentService.confirmAdvance(
    flow.employee.principal,
    flow.payment.id,
    `dbint-payment-confirm-${label}`,
  );
}
