import type {
  BookingDetailResponse,
  ConfirmAdvanceResult,
  PaymentMethod,
  PaymentSummary,
  SubmitAdvancePaymentRequest,
} from "@me-event/api-contracts";

export interface SubmitAdvanceInput {
  readonly quotationId: string;
  readonly customerUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly method: PaymentMethod;
  readonly notes?: string;
  readonly referenceCode: string;
}

export interface ConfirmAdvanceInput {
  readonly paymentId: string;
  readonly branchId: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly bookingNumber: string;
  readonly eventNumber: string;
}

export type { ConfirmAdvanceResult };

export const PAYMENT_REPOSITORY = Symbol("PAYMENT_REPOSITORY");

export interface PaymentRepository {
  submitAdvance(input: SubmitAdvanceInput): Promise<PaymentSummary | undefined>;
  confirmAdvance(
    input: ConfirmAdvanceInput,
  ): Promise<ConfirmAdvanceResult | undefined>;
  listForCustomerUser(userId: string): Promise<readonly PaymentSummary[]>;
  findById(
    paymentId: string,
    branchId: string,
  ): Promise<PaymentSummary | undefined>;
  listPendingAdvancesForQuotation(
    quotationId: string,
    branchId: string,
  ): Promise<readonly PaymentSummary[]>;
}

export type { BookingDetailResponse, SubmitAdvancePaymentRequest };
