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

/** Full slide-over projection joined from enquiry cart fields. */
export interface LeadDetailItem extends LeadListItem {
  readonly location?: string;
  readonly guestCount?: number;
  readonly notes?: string;
  readonly preferredExternalVendor?: string;
  readonly requestedServices: readonly string[];
  readonly updatedAt?: string;
}

export const LEAD_REPOSITORY = Symbol("LEAD_REPOSITORY");

export interface EnquirySubmittedPayload {
  readonly enquiryId: string;
  readonly branchId: string;
  readonly customerId: string;
  readonly firstResponseDueAt: string;
}

export interface LeadRepository {
  listForBranch(branchId: string): Promise<readonly LeadListItem[]>;
  findById(leadId: string): Promise<LeadListItem | undefined>;
  findDetailById(leadId: string): Promise<LeadDetailItem | undefined>;
  /**
   * Idempotent CRM reaction to `enquiry.submitted`: creates the lead + activity
   * + audit when no lead exists for the enquiry yet.
   */
  createFromEnquirySubmitted(
    payload: EnquirySubmittedPayload,
  ): Promise<{ leadId: string; created: boolean }>;
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
  /**
   * Updates lead pipeline status for Kanban moves; syncs enquiry status and
   * records activity + audit in one transaction.
   */
  updateStatus(
    leadId: string,
    status: LeadStatus,
    actorUserId: string,
    actorRole: string,
    requestId: string,
  ): Promise<LeadDetailItem | undefined>;
}
