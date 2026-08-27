import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { QuotationService } from "../src/modules/quotations/application/quotation.service";
import type {
  CreateQuotationInput,
  CustomerDecisionInput,
  LeadContext,
  QuotationRepository,
  ReviseQuotationInput,
  SendQuotationInput,
  UpdateDraftQuotationInput,
} from "../src/modules/quotations/ports/quotation-repository";
import type {
  QuotationActivitySummary,
  QuotationDetailResponse,
  QuotationSummary,
} from "@me-event/api-contracts";
import {
  HYDERABAD_BRANCH,
  type AuthenticatedPrincipal,
} from "../src/modules/platform-foundation/domain/platform-foundation";
import { PaymentService } from "../src/modules/payments/application/payment.service";
import type {
  ConfirmAdvanceInput,
  ConfirmAdvanceResult,
  PaymentRepository,
  SubmitAdvanceInput,
} from "../src/modules/payments/ports/payment-repository";
import type { PaymentSummary } from "@me-event/api-contracts";

class FakeQuotationRepository implements QuotationRepository {
  public readonly quotes = new Map<string, QuotationDetailResponse>();
  public readonly quoteBranches = new Map<string, string>();
  public lead: LeadContext | undefined;

  public async findLeadContext(
    leadId: string,
    branchId: string,
  ): Promise<LeadContext | undefined> {
    if (
      this.lead === undefined ||
      this.lead.leadId !== leadId ||
      this.lead.branchId !== branchId
    ) {
      return undefined;
    }
    return this.lead;
  }

  public async createDraft(input: CreateQuotationInput): Promise<string> {
    const id = randomUUID();
    this.quotes.set(id, {
      id,
      referenceCode: input.referenceCode,
      leadId: input.leadId,
      enquiryId: input.enquiryId,
      customerId: input.customerId,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finalAmount: String(input.totals.finalAmount),
      advanceAmount: String(input.totals.advanceAmount),
      items: input.items.map((item, index) => ({
        id: randomUUID(),
        itemType: item.itemType,
        title: item.title,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        lineTotal: String(item.quantity * item.unitPrice),
        sortOrder: index,
      })),
      activities: [],
      revision: {
        id: randomUUID(),
        revisionNumber: 1,
        reason: "initial",
        subtotal: String(input.totals.subtotal),
        discountAmount: String(input.totals.discountAmount),
        discountPercent: String(input.totals.discountPercent),
        gstPercent: String(input.totals.gstPercent),
        gstAmount: String(input.totals.gstAmount),
        finalAmount: String(input.totals.finalAmount),
        advancePercent: String(input.totals.advancePercent),
        advanceAmount: String(input.totals.advanceAmount),
        createdAt: new Date().toISOString(),
      },
    });
    this.quoteBranches.set(id, input.branchId);
    return id;
  }

  public async updateDraft(input: UpdateDraftQuotationInput): Promise<boolean> {
    const quote = this.quotes.get(input.quotationId);
    if (
      quote === undefined ||
      quote.status !== "draft" ||
      this.quoteBranches.get(input.quotationId) !== input.branchId
    ) {
      return false;
    }
    this.quotes.set(input.quotationId, {
      ...quote,
      finalAmount: String(input.totals.finalAmount),
      advanceAmount: String(input.totals.advanceAmount),
      items: input.items.map((item, index) => ({
        id: randomUUID(),
        itemType: item.itemType,
        title: item.title,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        lineTotal: String(item.quantity * item.unitPrice),
        sortOrder: index,
      })),
    });
    return true;
  }

  public async revise(input: ReviseQuotationInput): Promise<boolean> {
    const quote = this.quotes.get(input.quotationId);
    if (
      quote === undefined ||
      this.quoteBranches.get(input.quotationId) !== input.branchId
    ) {
      return false;
    }
    this.quotes.set(input.quotationId, {
      ...quote,
      status: "draft",
      finalAmount: String(input.totals.finalAmount),
    });
    return true;
  }

  public async send(input: SendQuotationInput): Promise<boolean> {
    const quote = this.quotes.get(input.quotationId);
    if (
      quote === undefined ||
      quote.status !== "draft" ||
      this.quoteBranches.get(input.quotationId) !== input.branchId
    ) {
      return false;
    }
    this.quotes.set(input.quotationId, {
      ...quote,
      status: "sent",
      paymentPlanId: randomUUID(),
    });
    return true;
  }

  public async approve(input: CustomerDecisionInput): Promise<boolean> {
    const quote = this.quotes.get(input.quotationId);
    if (quote === undefined || quote.status !== "sent") return false;
    this.quotes.set(input.quotationId, { ...quote, status: "approved" });
    return true;
  }

  public async reject(input: CustomerDecisionInput): Promise<boolean> {
    const quote = this.quotes.get(input.quotationId);
    if (quote === undefined || quote.status !== "sent") return false;
    this.quotes.set(input.quotationId, { ...quote, status: "rejected" });
    return true;
  }

  public async requestRevision(input: CustomerDecisionInput): Promise<boolean> {
    const quote = this.quotes.get(input.quotationId);
    if (quote === undefined || quote.status !== "sent") return false;
    this.quotes.set(input.quotationId, {
      ...quote,
      status: "revision_requested",
    });
    return true;
  }

  public async listForBranch(): Promise<readonly QuotationSummary[]> {
    return [...this.quotes.values()];
  }

  public async listForCustomerUser(): Promise<readonly QuotationSummary[]> {
    return [...this.quotes.values()].filter((q) => q.status !== "draft");
  }

  public async findById(
    quotationId: string,
    branchId: string,
  ): Promise<QuotationDetailResponse | undefined> {
    if (this.quoteBranches.get(quotationId) !== branchId) {
      return undefined;
    }
    return this.quotes.get(quotationId);
  }

  public async findForCustomerUser(
    _userId: string,
    quotationId: string,
  ): Promise<QuotationDetailResponse | undefined> {
    const quote = this.quotes.get(quotationId);
    if (quote === undefined || quote.status === "draft") return undefined;
    return quote;
  }

  public async listTimeline(): Promise<readonly QuotationActivitySummary[]> {
    return [];
  }

  public async ensurePdfPlaceholder(_quotationId: string): Promise<{
    documentId: string;
    status: "pending";
    message: string;
  }> {
    return {
      documentId: randomUUID(),
      status: "pending",
      message: "PDF generation is not available yet.",
    };
  }
}

class FakePaymentRepository implements PaymentRepository {
  public payments = new Map<string, PaymentSummary>();
  public paymentBranches = new Map<string, string>();
  public approvedQuotationId: string | undefined;

  public async submitAdvance(
    input: SubmitAdvanceInput,
  ): Promise<PaymentSummary | undefined> {
    if (input.quotationId !== this.approvedQuotationId) return undefined;
    const payment: PaymentSummary = {
      id: randomUUID(),
      paymentPlanId: randomUUID(),
      quotationId: input.quotationId,
      kind: "advance",
      method: input.method,
      amount: "3000.00",
      status: "pending",
      referenceCode: input.referenceCode,
      createdAt: new Date().toISOString(),
    };
    this.payments.set(payment.id, payment);
    this.paymentBranches.set(
      payment.id,
      "00000000-0000-4000-8000-000000000001",
    );
    return payment;
  }

  public async confirmAdvance(
    input: ConfirmAdvanceInput,
  ): Promise<ConfirmAdvanceResult | undefined> {
    const payment = this.payments.get(input.paymentId);
    if (
      payment === undefined ||
      payment.status !== "pending" ||
      this.paymentBranches.get(input.paymentId) !== input.branchId
    ) {
      return undefined;
    }
    const paid = { ...payment, status: "paid" as const };
    this.payments.set(payment.id, paid);
    const bookingId = randomUUID();
    const eventId = randomUUID();
    return {
      payment: paid,
      booking: {
        id: bookingId,
        bookingNumber: input.bookingNumber,
        quotationId: payment.quotationId,
        leadId: randomUUID(),
        enquiryId: randomUUID(),
        status: "confirmed",
        finalAmount: "10000.00",
        advancePaid: payment.amount,
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        eventRecordId: eventId,
        eventNumber: input.eventNumber,
      },
      eventRecord: {
        id: eventId,
        eventNumber: input.eventNumber,
        bookingId,
        bookingNumber: input.bookingNumber,
        quotationId: payment.quotationId,
        leadId: randomUUID(),
        enquiryId: randomUUID(),
        customerId: randomUUID(),
        eventTypeName: "Wedding",
        eventName: "Wedding",
        budgetAmount: "10000.00",
        advancePaid: payment.amount,
        pendingAmount: "7000.00",
        status: "booking_confirmed",
        priority: "normal",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  public async listForCustomerUser(): Promise<readonly PaymentSummary[]> {
    return [...this.payments.values()];
  }

  public async findById(
    paymentId: string,
    branchId: string,
  ): Promise<PaymentSummary | undefined> {
    if (this.paymentBranches.get(paymentId) !== branchId) {
      return undefined;
    }
    return this.payments.get(paymentId);
  }

  public async listPendingAdvancesForQuotation(
    quotationId: string,
    branchId: string,
  ): Promise<readonly PaymentSummary[]> {
    return [...this.payments.values()].filter(
      (p) =>
        p.quotationId === quotationId &&
        p.status === "pending" &&
        this.paymentBranches.get(p.id) === branchId,
    );
  }
}

function employee(
  branchId: string = HYDERABAD_BRANCH.id,
): AuthenticatedPrincipal {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    activeRole: "employee",
    roleAssignments: [{ role: "employee", active: true, scopeId: branchId }],
    branchId,
  };
}

function customer(userId = randomUUID()): AuthenticatedPrincipal {
  return {
    userId,
    sessionId: randomUUID(),
    activeRole: "customer",
    roleAssignments: [{ role: "customer", active: true }],
  };
}

describe("QuotationService + PaymentService workflow", () => {
  let quotes: FakeQuotationRepository;
  let quotationService: QuotationService;
  let payments: FakePaymentRepository;
  let paymentService: PaymentService;

  beforeEach(() => {
    quotes = new FakeQuotationRepository();
    quotes.lead = {
      leadId: randomUUID(),
      enquiryId: randomUUID(),
      customerId: randomUUID(),
      branchId: "00000000-0000-4000-8000-000000000001",
      status: "claimed",
    };
    quotationService = new QuotationService(quotes);
    payments = new FakePaymentRepository();
    paymentService = new PaymentService(payments);
  });

  it("creates, sends, approves, and confirms advance into a booking", async () => {
    const created = await quotationService.create(employee(), {
      leadId: quotes.lead!.leadId,
      items: [
        {
          itemType: "package",
          title: "Wedding decor",
          quantity: 1,
          unitPrice: 10000,
        },
      ],
      gstPercent: 18,
      discountAmount: 0,
      discountPercent: 0,
      advancePercent: 30,
    });

    expect(created.status).toBe("draft");
    expect(Number(created.finalAmount)).toBe(11800);

    const sent = await quotationService.send(employee(), created.id);
    expect(sent.status).toBe("sent");

    const cust = customer();
    const approved = await quotationService.approve(cust, created.id);
    expect(approved.status).toBe("approved");

    payments.approvedQuotationId = created.id;
    const advance = await paymentService.submitAdvance(cust, {
      quotationId: created.id,
      method: "upi",
    });
    expect(advance.status).toBe("pending");

    const confirmed = await paymentService.confirmAdvance(
      employee(),
      advance.id,
    );
    expect(confirmed.payment.status).toBe("paid");
    expect(confirmed.booking.bookingNumber).toMatch(/^BK-/);
    expect(confirmed.eventRecord.eventNumber).toMatch(/^EV-/);
    expect(confirmed.booking.eventRecordId).toBe(confirmed.eventRecord.id);
  });

  it("allows customer revision request then employee revise/send", async () => {
    const created = await quotationService.create(employee(), {
      leadId: quotes.lead!.leadId,
      items: [
        {
          itemType: "service",
          title: "Photography",
          quantity: 1,
          unitPrice: 5000,
        },
      ],
      gstPercent: 18,
      discountAmount: 0,
      discountPercent: 0,
      advancePercent: 30,
    });
    await quotationService.send(employee(), created.id);

    const revisedRequest = await quotationService.requestRevision(
      customer(),
      created.id,
      { message: "Please reduce decor cost" },
    );
    expect(revisedRequest.status).toBe("revision_requested");

    const revised = await quotationService.revise(employee(), created.id, {
      reason: "customer_request",
      items: [
        {
          itemType: "service",
          title: "Photography",
          quantity: 1,
          unitPrice: 4500,
        },
      ],
      gstPercent: 18,
      discountAmount: 0,
      discountPercent: 0,
      advancePercent: 30,
    });
    expect(revised.status).toBe("draft");

    const resent = await quotationService.send(employee(), created.id);
    expect(resent.status).toBe("sent");
  });

  it("denies other-branch quotation and payment detail as 404", async () => {
    const created = await quotationService.create(employee(), {
      leadId: quotes.lead!.leadId,
      items: [
        {
          itemType: "package",
          title: "Wedding decor",
          quantity: 1,
          unitPrice: 10000,
        },
      ],
      gstPercent: 18,
      discountAmount: 0,
      discountPercent: 0,
      advancePercent: 30,
    });
    const other = employee("00000000-0000-4000-8000-000000000002");
    await expect(
      quotationService.getCrm(employee(), created.id),
    ).resolves.toMatchObject({ id: created.id });
    await expect(
      quotationService.getCrm(other, created.id),
    ).rejects.toMatchObject({ code: "QUOTATION_NOT_FOUND", status: 404 });
    await expect(
      quotationService.send(other, created.id),
    ).rejects.toMatchObject({
      code: "QUOTATION_NOT_FOUND",
      status: 404,
    });

    await quotationService.send(employee(), created.id);
    await quotationService.approve(customer(), created.id);
    payments.approvedQuotationId = created.id;
    const advance = await paymentService.submitAdvance(customer(), {
      quotationId: created.id,
      method: "upi",
    });
    await expect(
      paymentService.confirmAdvance(other, advance.id),
    ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND", status: 404 });
  });
});
