import { Inject, Injectable } from "@nestjs/common";
import type {
  LeadListResponse,
  LeadRequirementsRequest,
  LeadSummary,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import { HYDERABAD_BRANCH } from "../../platform-foundation/domain/platform-foundation";
import { LEAD_REPOSITORY, type LeadRepository } from "../ports/lead-repository";

@Injectable()
export class CrmService {
  public constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leads: LeadRepository,
  ) {}

  public async listLeads(): Promise<LeadListResponse> {
    const leads = await this.leads.listForBranch(HYDERABAD_BRANCH.id);
    return { leads };
  }

  public async getLead(leadId: string): Promise<LeadSummary> {
    const lead = await this.leads.findById(leadId);
    if (lead === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return lead;
  }

  public async claimLead(
    principal: AuthenticatedPrincipal,
    leadId: string,
    requestId: string = randomUUID(),
  ): Promise<LeadSummary> {
    const existing = await this.leads.findById(leadId);
    if (existing === undefined) {
      throw new DomainError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    const claimed = await this.leads.claimLead(
      leadId,
      principal.userId,
      principal.activeRole,
      requestId,
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
    const existing = await this.leads.findById(leadId);
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
}
