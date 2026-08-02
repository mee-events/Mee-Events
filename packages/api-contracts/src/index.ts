import { z } from "zod";
import type { AuthenticatedUser, PlatformRole } from "@me-event/shared-types";

export const requestOtpSchema = z.object({
  mobileNumber: z.string().trim().min(7).max(32),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
});
export type RequestOtpRequest = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
  deviceId: z.string().trim().min(8).max(128),
  deviceName: z.string().trim().min(1).max(100).optional(),
});
export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;

export interface RequestOtpResponse {
  readonly challengeId: string;
  readonly expiresInSeconds: number;
  readonly resendAfterSeconds: number;
  /** Present only when APP_ENV=development and OTP_PROVIDER=local. */
  readonly debugCode?: string;
}

export interface VerifyOtpResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresInSeconds: number;
  readonly user: AuthenticatedUser;
}

export const refreshSessionSchema = z.object({
  refreshToken: z.string().trim().min(32).max(512),
});
export type RefreshSessionRequest = z.infer<typeof refreshSessionSchema>;

export interface RefreshSessionResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresInSeconds: number;
}

export interface LogoutResponse {
  readonly revoked: true;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly requestId: string;
  readonly details?: ReadonlyArray<{ path: string; message: string }>;
}

export interface EventTypeSummary {
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
}

export interface ServiceCategorySummary {
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
}

export const enquiryStatuses = [
  "draft",
  "submitted",
  "received",
  "contact_pending",
  "in_discussion",
  "proposal_expected",
  "closed",
  "cancelled",
] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

export const contactPreferences = ["phone", "whatsapp", "email"] as const;
export type ContactPreference = (typeof contactPreferences)[number];

export const createEnquirySchema = z.object({
  eventTypeCode: z.string().trim().min(1).max(100),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  location: z.string().trim().min(1).max(300).optional(),
  guestCount: z.number().int().positive().max(1000000).optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  notes: z.string().trim().max(4000).optional(),
  serviceCategoryCodes: z
    .array(z.string().trim().min(1).max(100))
    .max(50)
    .default([]),
  contactPreference: z.enum(contactPreferences).default("phone"),
});
export type CreateEnquiryRequest = z.infer<typeof createEnquirySchema>;

export interface EnquirySummary {
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

export interface EnquiryDetailResponse extends EnquirySummary {
  readonly budgetMin?: number;
  readonly budgetMax?: number;
  readonly notes?: string;
  readonly serviceCategoryCodes: readonly string[];
  readonly contactPreference: ContactPreference;
}

export const leadStatuses = [
  "new",
  "claimed",
  "contacted",
  "qualified",
  "quoted",
  "converted",
  "lost",
  "closed",
] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadSources = [
  "mobile_app",
  "walk_in",
  "phone",
  "referral",
  "campaign",
  "other",
] as const;
export type LeadSource = (typeof leadSources)[number];

export interface LeadSummary {
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

export interface LeadListResponse {
  readonly leads: readonly LeadSummary[];
}

export const clientSurfaces = [
  "customer_mobile",
  "vendor_mobile",
  "worker_mobile",
  "employee_web",
] as const;
export type ClientSurface = (typeof clientSurfaces)[number];

export const platformAreas = [
  "self_service",
  "crm",
  "erp",
  "governance",
] as const;
export type PlatformArea = (typeof platformAreas)[number];

export const quotationStatuses = [
  "draft",
  "sent",
  "revision_requested",
  "approved",
  "rejected",
  "expired",
  "superseded",
] as const;
export type QuotationStatus = (typeof quotationStatuses)[number];

export const quotationRevisionReasons = [
  "initial",
  "employee_revise",
  "customer_request",
] as const;
export type QuotationRevisionReason = (typeof quotationRevisionReasons)[number];

export const quotationItemTypes = [
  "package",
  "service",
  "product",
  "custom",
] as const;
export type QuotationItemType = (typeof quotationItemTypes)[number];

export const paymentStatuses = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentKinds = ["advance", "balance", "refund"] as const;
export type PaymentKind = (typeof paymentKinds)[number];

export const paymentMethods = ["cash", "upi", "bank_transfer"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const bookingStatuses = ["confirmed", "cancelled"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const eventRecordStatuses = [
  "created",
  "planning",
  "requirements_confirmed",
  "quotation_approved",
  "booking_confirmed",
  "manager_assigned",
  "vendor_assigned",
  "worker_assigned",
  "preparation",
  "ready",
  "event_running",
  "completed",
  "settlement_pending",
  "closed",
  "cancelled",
] as const;
export type EventRecordStatus = (typeof eventRecordStatuses)[number];

export const eventRecordPriorities = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;
export type EventRecordPriority = (typeof eventRecordPriorities)[number];

export const eventNoteVisibilities = ["internal", "customer"] as const;
export type EventNoteVisibility = (typeof eventNoteVisibilities)[number];

export const eventTimelineEntryTypes = [
  "booking_created",
  "event_record_created",
  "status_changed",
  "note_added",
  "note_updated",
  "document_added",
  "details_updated",
  "manager_assigned",
  "vendor_assigned",
  "worker_assigned",
  "payment_updated",
  "event_completed",
  "milestone",
] as const;
export type EventTimelineEntryType = (typeof eventTimelineEntryTypes)[number];

export const eventActivityTypes = [
  "created",
  "updated",
  "status_change",
  "note",
  "document",
  "assignment_placeholder",
  "payment",
  "milestone",
] as const;
export type EventActivityType = (typeof eventActivityTypes)[number];

export const quotationItemSchema = z.object({
  itemType: z.enum(quotationItemTypes).default("custom"),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  quantity: z.number().positive().max(1000000),
  unitPrice: z.number().nonnegative().max(100000000),
  sortOrder: z.number().int().nonnegative().max(10000).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

export const createQuotationSchema = z.object({
  leadId: z.string().uuid(),
  items: z.array(quotationItemSchema).min(1).max(100),
  gstPercent: z.number().nonnegative().max(100).default(18),
  discountAmount: z.number().nonnegative().max(100000000).default(0),
  discountPercent: z.number().nonnegative().max(100).default(0),
  advancePercent: z.number().positive().max(100).default(30),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  terms: z.string().trim().max(8000).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  customerNotes: z.string().trim().max(4000).optional(),
});
export type CreateQuotationRequest = z.infer<typeof createQuotationSchema>;

export const updateQuotationSchema = z.object({
  items: z.array(quotationItemSchema).min(1).max(100).optional(),
  gstPercent: z.number().nonnegative().max(100).optional(),
  discountAmount: z.number().nonnegative().max(100000000).optional(),
  discountPercent: z.number().nonnegative().max(100).optional(),
  advancePercent: z.number().positive().max(100).optional(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  terms: z.string().trim().max(8000).nullable().optional(),
  internalNotes: z.string().trim().max(4000).nullable().optional(),
  customerNotes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateQuotationRequest = z.infer<typeof updateQuotationSchema>;

export const reviseQuotationSchema = updateQuotationSchema.extend({
  reason: z.enum(["employee_revise", "customer_request"]).default("employee_revise"),
});
export type ReviseQuotationRequest = z.infer<typeof reviseQuotationSchema>;

export const rejectQuotationSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export type RejectQuotationRequest = z.infer<typeof rejectQuotationSchema>;

export const requestQuotationRevisionSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});
export type RequestQuotationRevisionRequest = z.infer<
  typeof requestQuotationRevisionSchema
>;

export const leadRequirementsSchema = z.object({
  notes: z.string().trim().min(1).max(4000),
  status: z.enum(["contacted", "qualified"]).default("contacted"),
});
export type LeadRequirementsRequest = z.infer<typeof leadRequirementsSchema>;

export const submitAdvancePaymentSchema = z.object({
  quotationId: z.string().uuid(),
  method: z.enum(paymentMethods),
  notes: z.string().trim().max(1000).optional(),
});
export type SubmitAdvancePaymentRequest = z.infer<
  typeof submitAdvancePaymentSchema
>;

export const createEventRecordSchema = z.object({
  bookingId: z.string().uuid(),
});
export type CreateEventRecordRequest = z.infer<typeof createEventRecordSchema>;

export const updateEventRecordSchema = z.object({
  eventName: z.string().trim().min(1).max(200).optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  venueName: z.string().trim().max(200).nullable().optional(),
  venueAddress: z.string().trim().max(500).nullable().optional(),
  mapsLocationPlaceholder: z.string().trim().max(1000).nullable().optional(),
  guestCount: z.number().int().positive().max(1000000).nullable().optional(),
  priority: z.enum(eventRecordPriorities).optional(),
  notes: z.string().trim().max(8000).nullable().optional(),
});
export type UpdateEventRecordRequest = z.infer<typeof updateEventRecordSchema>;

export const changeEventStatusSchema = z.object({
  status: z.enum(eventRecordStatuses),
  reason: z.string().trim().max(2000).optional(),
});
export type ChangeEventStatusRequest = z.infer<typeof changeEventStatusSchema>;

export const addEventNoteSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  visibility: z.enum(eventNoteVisibilities).default("internal"),
});
export type AddEventNoteRequest = z.infer<typeof addEventNoteSchema>;

export const updateEventNoteSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});
export type UpdateEventNoteRequest = z.infer<typeof updateEventNoteSchema>;

export interface QuotationItemSummary {
  readonly id: string;
  readonly itemType: QuotationItemType;
  readonly title: string;
  readonly description?: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly lineTotal: string;
  readonly sortOrder: number;
}

export interface QuotationRevisionSummary {
  readonly id: string;
  readonly revisionNumber: number;
  readonly reason: QuotationRevisionReason;
  readonly subtotal: string;
  readonly discountAmount: string;
  readonly discountPercent: string;
  readonly gstPercent: string;
  readonly gstAmount: string;
  readonly finalAmount: string;
  readonly advancePercent: string;
  readonly advanceAmount: string;
  readonly validUntil?: string;
  readonly terms?: string;
  readonly internalNotes?: string;
  readonly customerNotes?: string;
  readonly sentAt?: string;
  readonly createdAt: string;
}

export interface QuotationActivitySummary {
  readonly id: string;
  readonly activityType: string;
  readonly content?: string;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface QuotationSummary {
  readonly id: string;
  readonly referenceCode: string;
  readonly leadId: string;
  readonly enquiryId: string;
  readonly enquiryReferenceCode?: string;
  readonly customerId: string;
  readonly status: QuotationStatus;
  readonly currentRevisionId?: string;
  readonly finalAmount?: string;
  readonly advanceAmount?: string;
  readonly validUntil?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuotationDetailResponse extends QuotationSummary {
  readonly revision?: QuotationRevisionSummary;
  readonly items: readonly QuotationItemSummary[];
  readonly activities: readonly QuotationActivitySummary[];
  readonly paymentPlanId?: string;
  readonly bookingId?: string;
}

export interface QuotationListResponse {
  readonly quotations: readonly QuotationSummary[];
}

export interface QuotationPdfPlaceholderResponse {
  readonly status: "pending";
  readonly message: string;
  readonly documentId?: string;
}

export interface PaymentPlanSummary {
  readonly id: string;
  readonly quotationId: string;
  readonly totalAmount: string;
  readonly advanceAmount: string;
  readonly balanceAmount: string;
  readonly currencyCode: string;
}

export interface PaymentSummary {
  readonly id: string;
  readonly paymentPlanId: string;
  readonly quotationId: string;
  readonly kind: PaymentKind;
  readonly method: PaymentMethod;
  readonly amount: string;
  readonly status: PaymentStatus;
  readonly referenceCode: string;
  readonly notes?: string;
  readonly confirmedAt?: string;
  readonly createdAt: string;
}

export interface PaymentListResponse {
  readonly payments: readonly PaymentSummary[];
}

export interface BookingSummary {
  readonly id: string;
  readonly bookingNumber: string;
  readonly quotationId: string;
  readonly quotationReferenceCode?: string;
  readonly leadId: string;
  readonly enquiryId: string;
  readonly status: BookingStatus;
  readonly finalAmount: string;
  readonly advancePaid: string;
  readonly confirmedAt?: string;
  readonly createdAt: string;
  readonly eventRecordId?: string;
  readonly eventNumber?: string;
}

export interface BookingActivitySummary {
  readonly id: string;
  readonly activityType: string;
  readonly content?: string;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface BookingDetailResponse extends BookingSummary {
  readonly activities: readonly BookingActivitySummary[];
}

export interface BookingListResponse {
  readonly bookings: readonly BookingSummary[];
}

export interface EventRecordSummary {
  readonly id: string;
  readonly eventNumber: string;
  readonly bookingId: string;
  readonly bookingNumber?: string;
  readonly quotationId: string;
  readonly leadId: string;
  readonly enquiryId: string;
  readonly customerId: string;
  readonly customerDisplayName?: string;
  readonly eventTypeName: string;
  readonly eventName: string;
  readonly eventDate?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly venueName?: string;
  readonly venueAddress?: string;
  readonly mapsLocationPlaceholder?: string;
  readonly guestCount?: number;
  readonly budgetAmount: string;
  readonly advancePaid: string;
  readonly pendingAmount: string;
  readonly status: EventRecordStatus;
  readonly priority: EventRecordPriority;
  readonly assignedManagerUserId?: string;
  readonly generalNotes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EventTimelineEntry {
  readonly id: string;
  readonly entryType: EventTimelineEntryType | string;
  readonly title: string;
  readonly content?: string;
  readonly customerVisible: boolean;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface EventActivitySummary {
  readonly id: string;
  readonly activityType: EventActivityType | string;
  readonly content?: string;
  readonly customerVisible: boolean;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface EventNoteSummary {
  readonly id: string;
  readonly visibility: EventNoteVisibility;
  readonly content: string;
  readonly createdByUserId?: string;
  readonly updatedByUserId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface EventNoteRevisionSummary {
  readonly id: string;
  readonly content: string;
  readonly revisedByUserId?: string;
  readonly revisedAt: string;
}

export interface EventDocumentSummary {
  readonly id: string;
  readonly docType: string;
  readonly status: string;
  readonly visibility: EventNoteVisibility;
  readonly storageKey?: string;
  readonly fileName?: string;
  readonly createdAt: string;
}

export interface EventStatusHistoryEntry {
  readonly id: string;
  readonly fromStatus?: EventRecordStatus | string;
  readonly toStatus: EventRecordStatus | string;
  readonly reason?: string;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface EventRecordDetailResponse extends EventRecordSummary {
  readonly timeline: readonly EventTimelineEntry[];
  readonly activities: readonly EventActivitySummary[];
  readonly notes: readonly EventNoteSummary[];
  readonly documents: readonly EventDocumentSummary[];
  readonly statusHistory: readonly EventStatusHistoryEntry[];
  readonly upcomingActions: readonly string[];
}

export interface EventRecordListResponse {
  readonly events: readonly EventRecordSummary[];
}

export interface EventTimelineResponse {
  readonly timeline: readonly EventTimelineEntry[];
}

export interface EventActivityListResponse {
  readonly activities: readonly EventActivitySummary[];
}

export interface ConfirmAdvanceResult {
  readonly payment: PaymentSummary;
  readonly booking: BookingSummary;
  readonly eventRecord: EventRecordSummary;
}

export const capabilityIds = [
  "enquiry.create_own",
  "enquiry.read_own",
  "quotation.read_own",
  "quotation.approve_own",
  "quotation.reject_own",
  "quotation.request_revision_own",
  "booking.read_own",
  "payment.submit_own",
  "payment.read_own",
  "event.track_own",
  "change_request.create_own",
  "support.contact_assigned_manager",
  "vendor_profile.manage_own",
  "vendor_availability.manage_own",
  "vendor_proposal.submit_own",
  "vendor_work_order.read_assigned",
  "vendor_work_order.update_assigned",
  "vendor_evidence.submit_assigned",
  "vendor_invoice.submit_own",
  "vendor_payment.read_own",
  "worker_assignment.read_own",
  "worker_assignment.respond_own",
  "worker_attendance.check_in_own",
  "worker_duty.update_own",
  "worker_payment.read_own",
  "crm_lead.read",
  "crm_lead.update",
  "crm_lead.assign",
  "crm_customer.read",
  "crm_quotation.manage",
  "erp_event.read",
  "erp_event.manage",
  "erp_vendor.read",
  "erp_vendor.manage",
  "erp_vendor_price.approve",
  "erp_worker.read",
  "erp_worker.manage",
  "erp_warehouse.read",
  "erp_warehouse.manage",
  "erp_finance.read",
  "erp_finance.manage",
  "erp_payment.approve",
  "erp_refund.approve",
  "erp_approval.read",
  "erp_approval.decide",
  "report.operational.read",
  "report.financial.read",
  "platform_user.manage",
  "platform_policy.manage",
  "audit.read",
] as const;
export type CapabilityId = (typeof capabilityIds)[number];

export const platformModuleIds = [
  "customer_home",
  "customer_enquiries",
  "customer_quotations",
  "customer_bookings",
  "customer_payments",
  "customer_event_tracking",
  "customer_changes",
  "customer_support",
  "vendor_home",
  "vendor_opportunities",
  "vendor_proposals",
  "vendor_work_orders",
  "vendor_availability",
  "vendor_documents",
  "vendor_payments",
  "worker_home",
  "worker_assignments",
  "worker_attendance",
  "worker_duties",
  "worker_payments",
  "employee_dashboard",
  "crm_leads",
  "crm_customers",
  "crm_quotations",
  "erp_events",
  "erp_vendors",
  "erp_workers",
  "erp_warehouse",
  "erp_finance",
  "erp_approvals",
  "erp_reports",
  "platform_administration",
  "audit_log",
] as const;
export type PlatformModuleId = (typeof platformModuleIds)[number];

export interface PlatformModuleDefinition {
  readonly id: PlatformModuleId;
  readonly label: string;
  readonly area: PlatformArea;
}

export interface PlatformBootstrapResponse {
  readonly schemaVersion: string;
  readonly policyVersion: string;
  readonly generatedAt: string;
  readonly requestId: string;
  readonly actor: {
    readonly userId: string;
    readonly sessionId: string;
    readonly activeRole: PlatformRole;
  };
  readonly branch: {
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly city: string;
    readonly state: string;
    readonly countryCode: string;
    readonly timezone: string;
    readonly currencyCode: string;
    readonly status: "active";
  };
  readonly client: {
    readonly surface: ClientSurface;
    readonly landingModule: PlatformModuleId;
  };
  readonly access: {
    readonly assignedActiveRoles: readonly {
      readonly role: PlatformRole;
      readonly surface: ClientSurface;
      readonly scopeId: string;
    }[];
    readonly capabilities: readonly CapabilityId[];
    readonly modules: readonly PlatformModuleDefinition[];
  };
  readonly controls: {
    readonly roleVisibility: "assigned-active-only";
    readonly dataScope: "hyderabad-branch-and-assignment";
    readonly mutationAudit: "required";
    readonly serverAuthorization: "required";
  };
}
