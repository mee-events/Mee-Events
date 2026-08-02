import { Inject, Injectable } from "@nestjs/common";
import type {
  PaymentListResponse,
  PaymentSummary,
  SubmitAdvancePaymentRequest,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { ConfirmAdvanceResult } from "@me-event/api-contracts";
import { generateEventNumber } from "../../event-records/application/event-number";
import {
  PAYMENT_REPOSITORY,
  type PaymentRepository,
} from "../ports/payment-repository";

@Injectable()
export class PaymentService {
  public constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
  ) {}

  public async submitAdvance(
    principal: AuthenticatedPrincipal,
    request: SubmitAdvancePaymentRequest,
    requestId: string = randomUUID(),
  ): Promise<PaymentSummary> {
    const payment = await this.payments.submitAdvance({
      quotationId: request.quotationId,
      customerUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      method: request.method,
      referenceCode: generatePaymentReference(),
      ...(request.notes === undefined ? {} : { notes: request.notes }),
    });
    if (payment === undefined) {
      throw new DomainError(
        "ADVANCE_NOT_SUBMITTABLE",
        "Advance payment cannot be submitted for this quotation",
        409,
      );
    }
    return payment;
  }

  public async confirmAdvance(
    principal: AuthenticatedPrincipal,
    paymentId: string,
    requestId: string = randomUUID(),
  ): Promise<ConfirmAdvanceResult> {
    const existing = await this.payments.findById(paymentId);
    if (existing === undefined) {
      throw new DomainError("PAYMENT_NOT_FOUND", "Payment not found", 404);
    }
    if (existing.status !== "pending" || existing.kind !== "advance") {
      throw new DomainError(
        "PAYMENT_NOT_CONFIRMABLE",
        "Payment cannot be confirmed",
        409,
      );
    }

    const result = await this.payments.confirmAdvance({
      paymentId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      bookingNumber: generateBookingNumber(),
      eventNumber: generateEventNumber(),
    });
    if (result === undefined) {
      throw new DomainError(
        "PAYMENT_NOT_CONFIRMABLE",
        "Payment cannot be confirmed",
        409,
      );
    }
    return result;
  }

  public async listOwn(
    principal: AuthenticatedPrincipal,
  ): Promise<PaymentListResponse> {
    const payments = await this.payments.listForCustomerUser(principal.userId);
    return { payments };
  }

  public async listPendingForQuotation(
    quotationId: string,
  ): Promise<PaymentListResponse> {
    const payments =
      await this.payments.listPendingAdvancesForQuotation(quotationId);
    return { payments };
  }
}

function generatePaymentReference(): string {
  const token = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `PAY-${token}`;
}

function generateBookingNumber(): string {
  const token = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `BK-${token}`;
}
