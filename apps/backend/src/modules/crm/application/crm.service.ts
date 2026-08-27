import { Inject, Injectable } from "@nestjs/common";
import type {
  LeadDetailResponse,
  LeadListResponse,
  LeadRequirementsRequest,
  LeadSummary,
  LeadSummaryResponse,
  UpdateLeadStatusRequest,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import {
  buildPaginationMeta,
  paginatedCollection,
  type PaginationMeta,
  type PaginationParams,
} from "../../../common/pagination/pagination";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  LEAD_REPOSITORY,
  type LeadDetailItem,
  type LeadRepository,
} from "../ports/lead-repository";

@Injectable()
export class CrmService {
  public constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leads: LeadRepository,
  ) {}

  public async listLeads(
    principal: AuthenticatedPrincipal,
    pagination?: PaginationParams,
  ): Promise<
    LeadListResponse & {
      readonly data?: readonly LeadSummaryResponse[];
      readonly meta?: PaginationMeta;
    }
  > {
    const leads = await this.leads.listForBranch(resolveBranchId(principal));
    if (pagination?.requested !== true) {
      return { leads };
    }
    const total = leads.length;
    const items = leads.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    );
    return paginatedCollection(
      "leads",
      items,
      buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    );
  }

  public async getLead(
    principal: AuthenticatedPrincipal,
    leadId: string,
  ): Promise<LeadDetailResponse> {
    const lead = await this.leads.findDetailById(
      leadId,
      resolveBranchId(principal),
    );
    if (lead === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return toDetailResponse(lead);
  }

  public async claimLead(
    principal: AuthenticatedPrincipal,
    leadId: string,
    requestId: string = randomUUID(),
  ): Promise<LeadSummary> {
    const branchId = resolveBranchId(principal);
    const existing = await this.leads.findById(leadId, branchId);
    if (existing === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    const claimed = await this.leads.claimLead(
      leadId,
      principal.userId,
      principal.activeRole,
      requestId,
      branchId,
    );
    if (claimed === undefined) {
      throw new DomainError(
        "LEAD_ALREADY_OWNED",
        "Lead already has an owner",
        409,
      );
    }
    return claimed;
  }

  public async saveRequirements(
    principal: AuthenticatedPrincipal,
    leadId: string,
    request: LeadRequirementsRequest,
    requestId: string = randomUUID(),
  ): Promise<LeadSummary> {
    const branchId = resolveBranchId(principal);
    const existing = await this.leads.findById(leadId, branchId);
    if (existing === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    const updated = await this.leads.saveRequirements(
      leadId,
      principal.userId,
      principal.activeRole,
      request.notes,
      request.status,
      requestId,
      branchId,
    );
    if (updated === undefined) {
      throw new DomainError(
        "LEAD_NOT_READY",
        "Lead must be claimed before requirements can be saved",
        409,
      );
    }
    return updated;
  }

  public async updateStatus(
    principal: AuthenticatedPrincipal,
    leadId: string,
    request: UpdateLeadStatusRequest,
    requestId: string = randomUUID(),
  ): Promise<LeadDetailResponse> {
    const branchId = resolveBranchId(principal);
    const existing = await this.leads.findById(leadId, branchId);
    if (existing === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    const updated = await this.leads.updateStatus(
      leadId,
      request.status,
      principal.userId,
      principal.activeRole,
      requestId,
      branchId,
    );
    if (updated === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return toDetailResponse(updated);
  }
}

function toDetailResponse(lead: LeadDetailItem): LeadDetailResponse {
  return {
    ...lead,
    requestedServices: [...lead.requestedServices],
  };
}
