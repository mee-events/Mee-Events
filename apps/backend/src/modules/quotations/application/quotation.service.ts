import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateQuotationRequest,
  QuotationActivitySummary,
  QuotationDetailResponse,
  QuotationItemInput,
  QuotationListResponse,
  QuotationPdfPlaceholderResponse,
  QuotationSummary,
  RejectQuotationRequest,
  RequestQuotationRevisionRequest,
  ReviseQuotationRequest,
  UpdateQuotationRequest,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  QUOTATION_REPOSITORY,
  type ComputedTotals,
  type QuotationRepository,
} from "../ports/quotation-repository";

@Injectable()
export class QuotationService {
  public constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotations: QuotationRepository,
  ) {}

  public async create(
    principal: AuthenticatedPrincipal,
    request: CreateQuotationRequest,
    requestId: string = randomUUID(),
  ): Promise<QuotationDetailResponse> {
    const lead = await this.quotations.findLeadContext(request.leadId);
    if (lead === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    if (lead.branchId !== resolveBranchId(principal)) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }

    const totals = computeTotals(request.items, {
      gstPercent: request.gstPercent,
      discountAmount: request.discountAmount,
      discountPercent: request.discountPercent,
      advancePercent: request.advancePercent,
    });

    const quotationId = await this.quotations.createDraft({
      branchId: lead.branchId,
      leadId: lead.leadId,
      enquiryId: lead.enquiryId,
      customerId: lead.customerId,
      referenceCode: generateQuoteReference(),
      ownerUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      items: request.items,
      totals,
      ...(request.validUntil === undefined
        ? {}
        : { validUntil: request.validUntil }),
      ...(request.terms === undefined ? {} : { terms: request.terms }),
      ...(request.internalNotes === undefined
        ? {}
        : { internalNotes: request.internalNotes }),
      ...(request.customerNotes === undefined
        ? {}
        : { customerNotes: request.customerNotes }),
    });

    return this.requireDetail(quotationId);
  }

  public async updateDraft(
    principal: AuthenticatedPrincipal,
    quotationId: string,
    request: UpdateQuotationRequest,
    requestId: string = randomUUID(),
  ): Promise<QuotationDetailResponse> {
    const existing = await this.quotations.findById(quotationId);
    if (existing === undefined) {
      throw new DomainError("QUOTATION_NOT_FOUND", "Quotation not found", 404);
    }
    if (existing.status !== "draft") {
      throw new DomainError(
        "QUOTATION_NOT_DRAFT",
        "Only draft quotations can be updated",
        409,
      );
    }

    const items = request.items ?? (await this.itemsAsInput(existing));
    const revision = existing.revision;
    const totals = computeTotals(items, {
      gstPercent: request.gstPercent ?? Number(revision?.gstPercent ?? 18),
      discountAmount:
        request.discountAmount ?? Number(revision?.discountAmount ?? 0),
      discountPercent:
        request.discountPercent ?? Number(revision?.discountPercent ?? 0),
      advancePercent:
        request.advancePercent ?? Number(revision?.advancePercent ?? 30),
    });

    const updated = await this.quotations.updateDraft({
      quotationId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      items,
      totals,
      validUntil:
        request.validUntil === undefined
          ? (revision?.validUntil ?? null)
          : request.validUntil,
      terms:
        request.terms === undefined ? (revision?.terms ?? null) : request.terms,
      internalNotes:
        request.internalNotes === undefined
          ? (revision?.internalNotes ?? null)
          : request.internalNotes,
      customerNotes:
        request.customerNotes === undefined
          ? (revision?.customerNotes ?? null)
          : request.customerNotes,
    });
    if (!updated) {
      throw new DomainError(
        "QUOTATION_NOT_DRAFT",
        "Only draft quotations can be updated",
        409,
      );
    }
    return this.requireDetail(quotationId);
  }

  public async revise(
    principal: AuthenticatedPrincipal,
    quotationId: string,
    request: ReviseQuotationRequest,
    requestId: string = randomUUID(),
  ): Promise<QuotationDetailResponse> {
    const existing = await this.quotations.findById(quotationId);
    if (existing === undefined) {
      throw new DomainError("QUOTATION_NOT_FOUND", "Quotation not found", 404);
    }
    if (!["sent", "revision_requested", "approved"].includes(existing.status)) {
      throw new DomainError(
        "QUOTATION_NOT_REVISABLE",
        "Quotation cannot be revised in its current status",
        409,
      );
    }

    const items = request.items ?? (await this.itemsAsInput(existing));
    const revision = existing.revision;
    const totals = computeTotals(items, {
      gstPercent: request.gstPercent ?? Number(revision?.gstPercent ?? 18),
      discountAmount:
        request.discountAmount ?? Number(revision?.discountAmount ?? 0),
      discountPercent:
        request.discountPercent ?? Number(revision?.discountPercent ?? 0),
      advancePercent:
        request.advancePercent ?? Number(revision?.advancePercent ?? 30),
    });

    const revised = await this.quotations.revise({
      quotationId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      reason: request.reason,
      items,
      totals,
      validUntil:
        request.validUntil === undefined
          ? (revision?.validUntil ?? null)
          : request.validUntil,
      terms:
        request.terms === undefined ? (revision?.terms ?? null) : request.terms,
      internalNotes:
        request.internalNotes === undefined
          ? (revision?.internalNotes ?? null)
          : request.internalNotes,
      customerNotes:
        request.customerNotes === undefined
          ? (revision?.customerNotes ?? null)
          : request.customerNotes,
    });
    if (!revised) {
      throw new DomainError(
        "QUOTATION_NOT_REVISABLE",
        "Quotation cannot be revised in its current status",
        409,
      );
    }
    return this.requireDetail(quotationId);
  }

  public async send(
    principal: AuthenticatedPrincipal,
    quotationId: string,
    requestId: string = randomUUID(),
  ): Promise<QuotationDetailResponse> {
    const existing = await this.quotations.findById(quotationId);
    if (existing === undefined) {
      throw new DomainError("QUOTATION_NOT_FOUND", "Quotation not found", 404);
    }
    if (existing.status !== "draft") {
      throw new DomainError(
        "QUOTATION_NOT_SENDABLE",
        "Only draft quotations can be sent",
        409,
      );
    }
    if (existing.items.length === 0) {
      throw new DomainError(
        "QUOTATION_EMPTY",
        "Quotation must include at least one line item",
        422,
      );
    }

    const sent = await this.quotations.send({
      quotationId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (!sent) {
      throw new DomainError(
        "QUOTATION_NOT_SENDABLE",
        "Only draft quotations can be sent",
        409,
      );
    }
    return this.requireDetail(quotationId);
  }

  public async listCrm(
    principal: AuthenticatedPrincipal,
  ): Promise<QuotationListResponse> {
    const quotations = await this.quotations.listForBranch(
      resolveBranchId(principal),
    );
    return { quotations };
  }

  public async getCrm(quotationId: string): Promise<QuotationDetailResponse> {
    return this.requireDetail(quotationId);
  }

  public async listOwn(
    principal: AuthenticatedPrincipal,
  ): Promise<QuotationListResponse> {
    const quotations = await this.quotations.listForCustomerUser(
      principal.userId,
    );
    return { quotations };
  }

  public async getOwn(
    principal: AuthenticatedPrincipal,
    quotationId: string,
  ): Promise<QuotationDetailResponse> {
    const detail = await this.quotations.findForCustomerUser(
      principal.userId,
      quotationId,
    );
    if (detail === undefined) {
      throw new DomainError("QUOTATION_NOT_FOUND", "Quotation not found", 404);
    }
    return detail;
  }

  public async timelineCrm(
    quotationId: string,
  ): Promise<readonly QuotationActivitySummary[]> {
    await this.requireDetail(quotationId);
    return this.quotations.listTimeline(quotationId);
  }

  public async timelineOwn(
    principal: AuthenticatedPrincipal,
    quotationId: string,
  ): Promise<readonly QuotationActivitySummary[]> {
    await this.getOwn(principal, quotationId);
    return this.quotations.listTimeline(quotationId);
  }

  public async approve(
    principal: AuthenticatedPrincipal,
    quotationId: string,
    requestId: string = randomUUID(),
  ): Promise<QuotationDetailResponse> {
    const ok = await this.quotations.approve({
      quotationId,
      customerUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (!ok) {
      throw new DomainError(
        "QUOTATION_NOT_APPROVABLE",
        "Quotation cannot be approved in its current status",
        409,
      );
    }
    return this.getOwn(principal, quotationId);
  }

  public async reject(
    principal: AuthenticatedPrincipal,
    quotationId: string,
    request: RejectQuotationRequest,
    requestId: string = randomUUID(),
  ): Promise<QuotationDetailResponse> {
    const ok = await this.quotations.reject({
      quotationId,
      customerUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      reason: request.reason,
    });
    if (!ok) {
      throw new DomainError(
        "QUOTATION_NOT_REJECTABLE",
        "Quotation cannot be rejected in its current status",
        409,
      );
    }
    return this.getOwn(principal, quotationId);
  }

  public async requestRevision(
    principal: AuthenticatedPrincipal,
    quotationId: string,
    request: RequestQuotationRevisionRequest,
    requestId: string = randomUUID(),
  ): Promise<QuotationDetailResponse> {
    const ok = await this.quotations.requestRevision({
      quotationId,
      customerUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      message: request.message,
    });
    if (!ok) {
      throw new DomainError(
        "QUOTATION_NOT_REVISABLE",
        "Quotation cannot request revision in its current status",
        409,
      );
    }
    return this.getOwn(principal, quotationId);
  }

  public async pdfPlaceholder(
    quotationId: string,
  ): Promise<QuotationPdfPlaceholderResponse> {
    await this.requireDetail(quotationId);
    return this.quotations.ensurePdfPlaceholder(quotationId);
  }

  public async pdfPlaceholderOwn(
    principal: AuthenticatedPrincipal,
    quotationId: string,
  ): Promise<QuotationPdfPlaceholderResponse> {
    await this.getOwn(principal, quotationId);
    return this.quotations.ensurePdfPlaceholder(quotationId);
  }

  private async requireDetail(
    quotationId: string,
  ): Promise<QuotationDetailResponse> {
    const detail = await this.quotations.findById(quotationId);
    if (detail === undefined) {
      throw new DomainError("QUOTATION_NOT_FOUND", "Quotation not found", 404);
    }
    return detail;
  }

  private async itemsAsInput(
    detail: QuotationDetailResponse,
  ): Promise<QuotationItemInput[]> {
    return detail.items.map((item, index) => ({
      itemType: item.itemType,
      title: item.title,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      sortOrder: item.sortOrder ?? index,
      ...(item.description === undefined
        ? {}
        : { description: item.description }),
    }));
  }
}

export function computeTotals(
  items: readonly QuotationItemInput[],
  options: {
    readonly gstPercent: number;
    readonly discountAmount: number;
    readonly discountPercent: number;
    readonly advancePercent: number;
  },
): ComputedTotals {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const discountFromPercent = roundMoney(
    (subtotal * options.discountPercent) / 100,
  );
  const discountAmount = roundMoney(
    options.discountAmount > 0 ? options.discountAmount : discountFromPercent,
  );
  const taxable = roundMoney(Math.max(0, subtotal - discountAmount));
  const gstAmount = roundMoney((taxable * options.gstPercent) / 100);
  const finalAmount = roundMoney(taxable + gstAmount);
  const advanceAmount = roundMoney(
    (finalAmount * options.advancePercent) / 100,
  );

  return {
    subtotal,
    discountAmount,
    discountPercent: options.discountPercent,
    gstPercent: options.gstPercent,
    gstAmount,
    finalAmount,
    advancePercent: options.advancePercent,
    advanceAmount,
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function generateQuoteReference(): string {
  const token = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `QT-${token}`;
}

export type { QuotationSummary };
