import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateEnquiryRequest,
  EnquiryDetailResponse,
  EnquirySummary,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { DomainError } from "../../../common/errors/domain.error";
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from "../../catalog/ports/catalog-repository";
import { HYDERABAD_BRANCH } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  ENQUIRY_REPOSITORY,
  type EnquiryRepository,
} from "../ports/enquiry-repository";

@Injectable()
export class EnquiryService {
  public constructor(
    @Inject(ENQUIRY_REPOSITORY)
    private readonly enquiries: EnquiryRepository,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalog: CatalogRepository,
  ) {}

  public async create(
    principal: AuthenticatedPrincipal,
    request: CreateEnquiryRequest,
    requestId: string = randomUUID(),
  ): Promise<EnquiryDetailResponse> {
    const eventType = await this.catalog.findEventTypeByCode(
      request.eventTypeCode,
    );
    if (eventType === undefined) {
      throw new DomainError(
        "EVENT_TYPE_UNKNOWN",
        "Event type is not available",
        422,
      );
    }
    if (
      request.budgetMin !== undefined &&
      request.budgetMax !== undefined &&
      request.budgetMin > request.budgetMax
    ) {
      throw new DomainError(
        "BUDGET_RANGE_INVALID",
        "Minimum budget cannot exceed maximum budget",
        422,
      );
    }
    await this.assertServiceCategoryCodes(request.serviceCategoryCodes);

    const branchId = HYDERABAD_BRANCH.id;
    const slaMinutes =
      await this.enquiries.getLeadFirstResponseSlaMinutes(branchId);
    const referenceCode = generateReferenceCode();

    const { enquiryId } = await this.enquiries.createEnquiryWithLead({
      branchId,
      userId: principal.userId,
      eventTypeId: eventType.id,
      referenceCode,
      serviceCategoryCodes: request.serviceCategoryCodes,
      contactPreference: request.contactPreference,
      firstResponseDueAt: new Date(Date.now() + slaMinutes * 60 * 1000),
      requestId,
      ...(request.eventDate === undefined
        ? {}
        : { eventDate: request.eventDate }),
      ...(request.location === undefined ? {} : { location: request.location }),
      ...(request.guestCount === undefined
        ? {}
        : { guestCount: request.guestCount }),
      ...(request.budgetMin === undefined
        ? {}
        : { budgetMin: request.budgetMin }),
      ...(request.budgetMax === undefined
        ? {}
        : { budgetMax: request.budgetMax }),
      ...(request.notes === undefined ? {} : { notes: request.notes }),
    });

    const detail = await this.enquiries.findForCustomerUser(
      principal.userId,
      enquiryId,
    );
    if (detail === undefined) {
      throw new DomainError(
        "ENQUIRY_NOT_FOUND",
        "Enquiry could not be loaded after creation",
        500,
      );
    }
    return detail;
  }

  public async listOwn(
    principal: AuthenticatedPrincipal,
  ): Promise<readonly EnquirySummary[]> {
    return this.enquiries.listForCustomerUser(principal.userId);
  }

  public async getOwn(
    principal: AuthenticatedPrincipal,
    enquiryId: string,
  ): Promise<EnquiryDetailResponse> {
    const detail = await this.enquiries.findForCustomerUser(
      principal.userId,
      enquiryId,
    );
    if (detail === undefined) {
      throw new DomainError("ENQUIRY_NOT_FOUND", "Enquiry not found", 404);
    }
    return detail;
  }

  private async assertServiceCategoryCodes(
    codes: readonly string[],
  ): Promise<void> {
    if (codes.length === 0) {
      return;
    }
    const known = await this.catalog.listServiceCategories();
    const knownCodes = new Set(known.map((category) => category.code));
    const unknown = codes.filter((code) => !knownCodes.has(code));
    if (unknown.length > 0) {
      throw new DomainError(
        "SERVICE_CATEGORY_UNKNOWN",
        `Unknown service categories: ${unknown.join(", ")}`,
        422,
      );
    }
  }
}

function generateReferenceCode(): string {
  const token = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `ENQ-${token}`;
}
