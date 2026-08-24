import type {
  ContactPreference,
  EnquiryStatus,
  LeadStatus,
  PlanItemSnapshot,
} from "@me-event/api-contracts";
export interface CreateEnquiryInput {
  readonly branchId: string;
  readonly userId: string;
  readonly eventTypeId: string;
  readonly referenceCode: string;
  readonly eventDate?: string;
  readonly location?: string;
  readonly guestCount?: number;
  readonly budgetMin?: number;
  readonly budgetMax?: number;
  readonly notes?: string;
  readonly preferredExternalVendor?: string;
  readonly serviceCategoryCodes: readonly string[];
  readonly planItems: readonly PlanItemSnapshot[];
  readonly contactPreference: ContactPreference;
  /** SLA deadline forwarded to CRM via `enquiry.submitted` outbox payload. */
  readonly firstResponseDueAt: Date;
  readonly requestId: string;
}

export interface EnquiryListItem {
  readonly id: string;
  readonly referenceCode: string;
  readonly eventTypeCode: string;
  readonly eventTypeName: string;
  readonly eventDate?: string;
  readonly location?: string;
  readonly guestCount?: number;
  readonly status: EnquiryStatus;
  readonly submittedAt?: string;
  readonly createdAt: string;
}

export interface EnquiryDetail extends EnquiryListItem {
  readonly budgetMin?: number;
  readonly budgetMax?: number;
  readonly notes?: string;
  readonly preferredExternalVendor?: string;
  readonly serviceCategoryCodes: readonly string[];
  readonly planItems: readonly PlanItemSnapshot[];
  readonly contactPreference: ContactPreference;
}

export const ENQUIRY_REPOSITORY = Symbol("ENQUIRY_REPOSITORY");

export interface EnquiryRepository {
  /**
   * Creates the customer profile if missing, the enquiry, enquiry audit, and
   * `enquiry.submitted` outbox event in one transaction. CRM lead creation is
   * handled asynchronously by the CRM outbox processor.
   */
  createEnquiry(input: CreateEnquiryInput): Promise<{ enquiryId: string }>;
  listForCustomerUser(userId: string): Promise<readonly EnquiryListItem[]>;
  findForCustomerUser(
    userId: string,
    enquiryId: string,
  ): Promise<EnquiryDetail | undefined>;
  getLeadFirstResponseSlaMinutes(branchId: string): Promise<number>;
  /**
   * Applies customer-visible enquiry status changes driven by CRM lead updates
   * (`crm.lead.updated` outbox).
   */
  syncStatusFromCrmLead(
    enquiryId: string,
    leadStatus: LeadStatus,
  ): Promise<void>;
}
