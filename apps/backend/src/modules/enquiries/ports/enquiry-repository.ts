import type { ContactPreference, EnquiryStatus } from "@me-event/api-contracts";

export interface CreateEnquiryWithLeadInput {
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
  readonly serviceCategoryCodes: readonly string[];
  readonly contactPreference: ContactPreference;
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
  readonly serviceCategoryCodes: readonly string[];
  readonly contactPreference: ContactPreference;
}

export const ENQUIRY_REPOSITORY = Symbol("ENQUIRY_REPOSITORY");

export interface EnquiryRepository {
  /**
   * Creates the customer profile if missing, the enquiry, the CRM lead, the
   * lead activity, the audit events, and the outbox event in one transaction.
   */
  createEnquiryWithLead(
    input: CreateEnquiryWithLeadInput,
  ): Promise<{ enquiryId: string; leadId: string }>;
  listForCustomerUser(userId: string): Promise<readonly EnquiryListItem[]>;
  findForCustomerUser(
    userId: string,
    enquiryId: string,
  ): Promise<EnquiryDetail | undefined>;
  getLeadFirstResponseSlaMinutes(branchId: string): Promise<number>;
}
