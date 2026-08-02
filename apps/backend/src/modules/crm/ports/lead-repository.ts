import type { LeadSource, LeadStatus } from "@me-event/api-contracts";

export interface LeadListItem {
  readonly id: string;
  readonly enquiryId?: string;
  readonly enquiryReferenceCode?: string;
  readonly customerMobile: string;
  readonly customerName?: string;
  readonly eventTypeName?: string;
  readonly eventDate?: string;
  readonly status: LeadStatus;
  readonly source: LeadSource;
  readonly ownerUserId?: string;
  readonly firstResponseDueAt?: string;
  readonly firstRespondedAt?: string;
  readonly createdAt: string;
}

export const LEAD_REPOSITORY = Symbol("LEAD_REPOSITORY");

export interface LeadRepository {
  listForBranch(branchId: string): Promise<readonly LeadListItem[]>;
  findById(leadId: string): Promise<LeadListItem | undefined>;
  /**
   * Assigns ownership to the claiming employee, marks the first response,
   * moves the customer-visible enquiry status to contact_pending, and records
   * the lead activity and audit events in one transaction.
   * Returns undefined when the lead is already owned.
   */
  claimLead(
    leadId: string,
    ownerUserId: string,
    ownerRole: string,
    requestId: string,
  ): Promise<LeadListItem | undefined>;
  /**
   * Records requirements notes and advances lead/enquiry discussion statuses.
   */
  saveRequirements(
    leadId: string,
    actorUserId: string,
    actorRole: string,
    notes: string,
    status: "contacted" | "qualified",
    requestId: string,
  ): Promise<LeadListItem | undefined>;
}
