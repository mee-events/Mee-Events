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

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface LeadListResponse {
  readonly leads: readonly LeadSummary[];
  readonly meta?: PaginationMeta;
  readonly data?: readonly LeadSummary[];
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
  "task_created",
  "task_updated",
  "task_completed",
  "progress_added",
  "manager_reassigned",
  "vendor_accepted",
  "vendor_rejected",
  "vendor_progress_updated",
  "vendor_completed",
  "vendor_note_added",
  "worker_accepted",
  "worker_rejected",
  "worker_checked_in",
  "worker_progress_updated",
  "worker_checked_out",
  "worker_task_completed",
  "worker_note_added",
  "inventory_reserved",
  "inventory_allocated",
  "inventory_dispatched",
  "inventory_on_site",
  "inventory_returned",
  "inventory_cancelled",
  "inventory_damage_reported",
  "inventory_maintenance_started",
  "inventory_note_added",
  "finance_payment_recorded",
  "finance_refund_recorded",
  "finance_expense_added",
  "finance_vendor_settlement",
  "finance_worker_payout",
  "finance_invoice_issued",
  "finance_receipt_issued",
  "finance_summary_updated",
  "ops_task_created",
  "ops_task_updated",
  "ops_task_assigned",
  "ops_task_progress",
  "ops_task_completed",
  "ops_attendance_check_in",
  "ops_attendance_check_out",
  "ops_issue_created",
  "ops_issue_updated",
  "ops_photo_uploaded",
  "ops_material_recorded",
  "ops_progress_recalculated",
  "ops_completion_ready",
  "ops_event_completed",
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
  "manager_assignment",
  "task",
  "progress",
  "vendor_assignment",
  "vendor_progress",
  "vendor_note",
  "worker_assignment",
  "worker_attendance",
  "worker_progress",
  "worker_note",
  "inventory_allocation",
  "inventory_movement",
  "inventory_damage",
  "inventory_maintenance",
  "inventory_note",
  "finance_payment",
  "finance_settlement",
  "finance_expense",
  "finance_payout",
  "finance_document",
  "ops_task",
  "ops_assignment",
  "ops_attendance",
  "ops_issue",
  "ops_photo",
  "ops_material",
  "ops_progress",
  "ops_completion",
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
  reason: z
    .enum(["employee_revise", "customer_request"])
    .default("employee_revise"),
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

export const addEventTimelineEntrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().max(4000).optional(),
  entryType: z
    .enum(["milestone", "details_updated", "document_added"])
    .default("milestone"),
  customerVisible: z.boolean().default(true),
});
export type AddEventTimelineEntryRequest = z.infer<
  typeof addEventTimelineEntrySchema
>;

// ─── Manager Operations Foundation ─────────────────────────────────────────

export const managerAssignmentStatuses = [
  "active",
  "reassigned",
  "released",
  "completed",
] as const;
export type ManagerAssignmentStatus =
  (typeof managerAssignmentStatuses)[number];

export const eventTaskStatuses = [
  "pending",
  "planning",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type EventTaskStatus = (typeof eventTaskStatuses)[number];

export const eventTaskPriorities = ["low", "normal", "high", "urgent"] as const;
export type EventTaskPriority = (typeof eventTaskPriorities)[number];

export const eventProgressUpdateKinds = [
  "morning",
  "afternoon",
  "evening",
  "completion_summary",
] as const;
export type EventProgressUpdateKind = (typeof eventProgressUpdateKinds)[number];

export const managerNotificationTopics = [
  "manager.assigned",
  "manager.reassigned",
  "task.created",
  "task.assigned",
  "task.updated",
  "task.completed",
  "task.status_changed",
  "progress.added",
  "event.status_changed",
] as const;
export type ManagerNotificationTopic =
  (typeof managerNotificationTopics)[number];

export const assignEventManagerSchema = z.object({
  managerUserId: z.string().uuid(),
  priority: z.enum(eventTaskPriorities).default("normal"),
  managerNotes: z.string().trim().max(4000).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  expectedCompletionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type AssignEventManagerRequest = z.infer<
  typeof assignEventManagerSchema
>;

export const updateManagerAssignmentSchema = z.object({
  priority: z.enum(eventTaskPriorities).optional(),
  managerNotes: z.string().trim().max(4000).nullable().optional(),
  internalNotes: z.string().trim().max(4000).nullable().optional(),
  expectedCompletionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(["released", "completed"]).optional(),
});
export type UpdateManagerAssignmentRequest = z.infer<
  typeof updateManagerAssignmentSchema
>;

export const createEventTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  priority: z.enum(eventTaskPriorities).default("normal"),
  status: z.enum(eventTaskStatuses).default("pending"),
  assignedToUserId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().positive().max(100000).optional(),
  dueAt: z.string().min(10).max(40).optional(),
});
export type CreateEventTaskRequest = z.infer<typeof createEventTaskSchema>;

export const updateEventTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  priority: z.enum(eventTaskPriorities).optional(),
  status: z.enum(eventTaskStatuses).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  estimatedMinutes: z
    .number()
    .int()
    .positive()
    .max(100000)
    .nullable()
    .optional(),
  actualMinutes: z
    .number()
    .int()
    .nonnegative()
    .max(100000)
    .nullable()
    .optional(),
  dueAt: z.string().min(10).max(40).nullable().optional(),
});
export type UpdateEventTaskRequest = z.infer<typeof updateEventTaskSchema>;

export const completeEventTaskSchema = z.object({
  actualMinutes: z.number().int().nonnegative().max(100000).optional(),
  summary: z.string().trim().max(2000).optional(),
});
export type CompleteEventTaskRequest = z.infer<typeof completeEventTaskSchema>;

export const addEventTaskCommentSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});
export type AddEventTaskCommentRequest = z.infer<
  typeof addEventTaskCommentSchema
>;

export const createEventProgressSchema = z.object({
  updateKind: z.enum(eventProgressUpdateKinds),
  summary: z.string().trim().min(1).max(8000),
  blockers: z.string().trim().max(4000).optional(),
  nextSteps: z.string().trim().max(4000).optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  photoPlaceholders: z.array(z.string().trim().max(500)).max(20).optional(),
  attachmentPlaceholders: z
    .array(z.string().trim().max(500))
    .max(20)
    .optional(),
});
export type CreateEventProgressRequest = z.infer<
  typeof createEventProgressSchema
>;

export const updateEventProgressSchema = z.object({
  summary: z.string().trim().min(1).max(8000).optional(),
  blockers: z.string().trim().max(4000).nullable().optional(),
  nextSteps: z.string().trim().max(4000).nullable().optional(),
  percentComplete: z.number().int().min(0).max(100).nullable().optional(),
  photoPlaceholders: z.array(z.string().trim().max(500)).max(20).optional(),
  attachmentPlaceholders: z
    .array(z.string().trim().max(500))
    .max(20)
    .optional(),
});
export type UpdateEventProgressRequest = z.infer<
  typeof updateEventProgressSchema
>;

export interface ManagerCandidateSummary {
  readonly userId: string;
  readonly displayName: string;
  readonly mobileE164?: string;
  readonly role: string;
}

export interface ManagerAssignmentSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly managerUserId: string;
  readonly managerDisplayName?: string;
  readonly assignedByUserId?: string;
  readonly status: ManagerAssignmentStatus;
  readonly priority: EventTaskPriority;
  readonly managerNotes?: string;
  readonly internalNotes?: string;
  readonly expectedCompletionDate?: string;
  readonly assignedAt: string;
  readonly releasedAt?: string;
  readonly version: number;
}

export interface EventTaskCommentSummary {
  readonly id: string;
  readonly taskId: string;
  readonly content: string;
  readonly createdByUserId?: string;
  readonly createdAt: string;
}

export interface EventTaskHistoryEntry {
  readonly id: string;
  readonly taskId: string;
  readonly changeType: string;
  readonly fromStatus?: string;
  readonly toStatus?: string;
  readonly summary: string;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface EventTaskSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly eventName?: string;
  readonly title: string;
  readonly description?: string;
  readonly priority: EventTaskPriority;
  readonly status: EventTaskStatus;
  readonly assignedToUserId?: string;
  readonly estimatedMinutes?: number;
  readonly actualMinutes?: number;
  readonly dueAt?: string;
  readonly completedAt?: string;
  readonly createdByUserId?: string;
  readonly updatedByUserId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly overdue: boolean;
}

export interface EventTaskDetailResponse extends EventTaskSummary {
  readonly comments: readonly EventTaskCommentSummary[];
  readonly history: readonly EventTaskHistoryEntry[];
}

export interface EventProgressUpdateSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly updateKind: EventProgressUpdateKind;
  readonly summary: string;
  readonly blockers?: string;
  readonly nextSteps?: string;
  readonly percentComplete?: number;
  readonly photoPlaceholders: readonly string[];
  readonly attachmentPlaceholders: readonly string[];
  readonly reportDate: string;
  readonly createdByUserId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface EventDailyReportSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly reportDate: string;
  readonly overallSummary?: string;
  readonly morningProgressId?: string;
  readonly afternoonProgressId?: string;
  readonly eveningProgressId?: string;
  readonly completionProgressId?: string;
}

export interface ManagerDashboardResponse {
  readonly assignedEvents: number;
  readonly activeTasks: number;
  readonly overdueTasks: number;
  readonly completedTasksToday: number;
  readonly progressUpdatesToday: number;
  readonly upcomingTasks: readonly EventTaskSummary[];
  readonly overdueTaskList: readonly EventTaskSummary[];
  readonly myEvents: readonly EventRecordSummary[];
}

export interface EventManagerDashboardResponse {
  readonly event: EventRecordSummary;
  readonly assignment?: ManagerAssignmentSummary;
  readonly tasks: readonly EventTaskSummary[];
  readonly upcomingTasks: readonly EventTaskSummary[];
  readonly overdueTasks: readonly EventTaskSummary[];
  readonly progressUpdates: readonly EventProgressUpdateSummary[];
  readonly timeline: readonly EventTimelineEntry[];
  readonly activities: readonly EventActivitySummary[];
}

export interface ManagerAssignmentListResponse {
  readonly assignments: readonly ManagerAssignmentSummary[];
}

export interface ManagerCandidateListResponse {
  readonly candidates: readonly ManagerCandidateSummary[];
}

export interface EventTaskListResponse {
  readonly tasks: readonly EventTaskSummary[];
}

export interface EventProgressListResponse {
  readonly updates: readonly EventProgressUpdateSummary[];
  readonly dailyReports: readonly EventDailyReportSummary[];
}

// ─── Vendor Management Foundation ──────────────────────────────────────────

export const vendorVerificationStatuses = [
  "pending",
  "documents_requested",
  "verified",
  "rejected",
  "suspended",
] as const;
export type VendorVerificationStatus =
  (typeof vendorVerificationStatuses)[number];

export const vendorActiveStatuses = [
  "active",
  "inactive",
  "suspended",
] as const;
export type VendorActiveStatus = (typeof vendorActiveStatuses)[number];

export const vendorAssignmentStatuses = [
  "invited",
  "assigned",
  "accepted",
  "rejected",
  "planning",
  "travelling",
  "on_site",
  "working",
  "completed",
  "cancelled",
] as const;
export type VendorAssignmentStatus = (typeof vendorAssignmentStatuses)[number];

export const vendorNoteTypes = ["internal", "progress", "vendor"] as const;
export type VendorNoteType = (typeof vendorNoteTypes)[number];

export const vendorNotificationTopics = [
  "vendor.created",
  "vendor.updated",
  "vendor.assigned",
  "vendor.accepted",
  "vendor.rejected",
  "vendor.progress_updated",
  "vendor.completed",
  "vendor.note_added",
] as const;
export type VendorNotificationTopic = (typeof vendorNotificationTopics)[number];

export const createVendorSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  ownerName: z.string().trim().min(1).max(200),
  phoneE164: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(200).optional(),
  gstNumber: z.string().trim().max(30).optional(),
  panNumber: z.string().trim().max(20).optional(),
  addressLine: z.string().trim().max(500).optional(),
  city: z.string().trim().min(1).max(100).default("Hyderabad"),
  state: z.string().trim().min(1).max(100).default("Telangana"),
  pincode: z.string().trim().max(12).optional(),
  upiId: z.string().trim().max(100).optional(),
  categoryCodes: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  bankAccount: z
    .object({
      accountHolderName: z.string().trim().min(1).max(200),
      bankName: z.string().trim().min(1).max(200),
      accountNumberMasked: z.string().trim().min(4).max(40),
      ifscCode: z.string().trim().min(4).max(20),
      upiId: z.string().trim().max(100).optional(),
    })
    .optional(),
  ownerUserId: z.string().uuid().optional(),
});
export type CreateVendorRequest = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = z.object({
  businessName: z.string().trim().min(1).max(200).optional(),
  ownerName: z.string().trim().min(1).max(200).optional(),
  phoneE164: z.string().trim().min(8).max(20).optional(),
  email: z.string().trim().email().max(200).nullable().optional(),
  gstNumber: z.string().trim().max(30).nullable().optional(),
  panNumber: z.string().trim().max(20).nullable().optional(),
  addressLine: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().min(1).max(100).optional(),
  pincode: z.string().trim().max(12).nullable().optional(),
  upiId: z.string().trim().max(100).nullable().optional(),
  verificationStatus: z.enum(vendorVerificationStatuses).optional(),
  activeStatus: z.enum(vendorActiveStatuses).optional(),
  categoryCodes: z
    .array(z.string().trim().min(1).max(80))
    .min(1)
    .max(30)
    .optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateVendorRequest = z.infer<typeof updateVendorSchema>;

export const assignVendorSchema = z.object({
  eventRecordId: z.string().uuid(),
  vendorId: z.string().uuid(),
  serviceCategoryCode: z.string().trim().min(1).max(80).optional(),
  assignedManagerUserId: z.string().uuid().optional(),
  expectedArrivalAt: z.string().min(10).max(40).optional(),
  expectedCompletionAt: z.string().min(10).max(40).optional(),
  assignmentNotes: z.string().trim().max(4000).optional(),
  status: z.enum(["invited", "assigned"]).default("assigned"),
});
export type AssignVendorRequest = z.infer<typeof assignVendorSchema>;

export const updateVendorAssignmentSchema = z.object({
  status: z.enum(vendorAssignmentStatuses).optional(),
  expectedArrivalAt: z.string().min(10).max(40).nullable().optional(),
  expectedCompletionAt: z.string().min(10).max(40).nullable().optional(),
  assignmentNotes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateVendorAssignmentRequest = z.infer<
  typeof updateVendorAssignmentSchema
>;

export const rejectVendorAssignmentSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export type RejectVendorAssignmentRequest = z.infer<
  typeof rejectVendorAssignmentSchema
>;

export const vendorProgressUpdateSchema = z.object({
  summary: z.string().trim().min(1).max(8000),
  status: z
    .enum(["planning", "travelling", "on_site", "working", "completed"])
    .optional(),
});
export type VendorProgressUpdateRequest = z.infer<
  typeof vendorProgressUpdateSchema
>;

export const addVendorNoteSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  noteType: z.enum(vendorNoteTypes).default("internal"),
  assignmentId: z.string().uuid().optional(),
  eventRecordId: z.string().uuid().optional(),
});
export type AddVendorNoteRequest = z.infer<typeof addVendorNoteSchema>;

export interface VendorCategorySummary {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly isPrimary: boolean;
}

export interface VendorBankAccountSummary {
  readonly id: string;
  readonly accountHolderName: string;
  readonly bankName: string;
  readonly accountNumberMasked: string;
  readonly ifscCode: string;
  readonly upiId?: string;
  readonly isPrimary: boolean;
}

export interface VendorContactSummary {
  readonly id: string;
  readonly contactName: string;
  readonly phoneE164?: string;
  readonly email?: string;
  readonly designation?: string;
  readonly isPrimary: boolean;
}

export interface VendorSummary {
  readonly id: string;
  readonly vendorCode: string;
  readonly businessName: string;
  readonly ownerName: string;
  readonly phoneE164: string;
  readonly email?: string;
  readonly city: string;
  readonly state: string;
  readonly verificationStatus: VendorVerificationStatus;
  readonly activeStatus: VendorActiveStatus;
  readonly ratingAverage: string;
  readonly ratingCount: number;
  readonly categories: readonly VendorCategorySummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VendorDetailResponse extends VendorSummary {
  readonly gstNumber?: string;
  readonly panNumber?: string;
  readonly addressLine?: string;
  readonly pincode?: string;
  readonly upiId?: string;
  readonly notes?: string;
  readonly bankAccounts: readonly VendorBankAccountSummary[];
  readonly contacts: readonly VendorContactSummary[];
  readonly documents: readonly {
    readonly id: string;
    readonly docType: string;
    readonly status: string;
    readonly fileName?: string;
    readonly createdAt: string;
  }[];
}

export interface VendorAssignmentSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly eventName?: string;
  readonly vendorId: string;
  readonly vendorBusinessName?: string;
  readonly serviceCategoryId?: string;
  readonly serviceCategoryName?: string;
  readonly assignedByUserId?: string;
  readonly assignedManagerUserId?: string;
  readonly status: VendorAssignmentStatus;
  readonly expectedArrivalAt?: string;
  readonly expectedCompletionAt?: string;
  readonly assignmentNotes?: string;
  readonly rejectionReason?: string;
  readonly latestProgressSummary?: string;
  readonly assignedAt: string;
  readonly acceptedAt?: string;
  readonly completedAt?: string;
  readonly version: number;
}

export interface VendorAssignmentHistoryEntry {
  readonly id: string;
  readonly assignmentId: string;
  readonly changeType: string;
  readonly fromStatus?: string;
  readonly toStatus?: string;
  readonly summary: string;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface VendorNoteSummary {
  readonly id: string;
  readonly vendorId: string;
  readonly assignmentId?: string;
  readonly eventRecordId?: string;
  readonly noteType: VendorNoteType;
  readonly content: string;
  readonly createdByUserId?: string;
  readonly createdAt: string;
}

export interface VendorAssignmentDetailResponse
  extends VendorAssignmentSummary {
  readonly history: readonly VendorAssignmentHistoryEntry[];
  readonly notes: readonly VendorNoteSummary[];
  readonly timeline: readonly EventTimelineEntry[];
}

export interface VendorDashboardResponse {
  readonly totalVendors: number;
  readonly activeAssignments: number;
  readonly pendingAcceptances: number;
  readonly completedAssignments: number;
  readonly vendors: readonly VendorSummary[];
  readonly openAssignments: readonly VendorAssignmentSummary[];
}

export interface VendorListResponse {
  readonly vendors: readonly VendorSummary[];
  /** Present when the client requested pagination (`page` / `limit` / …). */
  readonly meta?: PaginationMeta;
  /** Alias of `vendors` when paginated — common pagination envelope. */
  readonly data?: readonly VendorSummary[];
}

export interface VendorAssignmentListResponse {
  readonly assignments: readonly VendorAssignmentSummary[];
}

// ─── Worker Management Foundation ──────────────────────────────────────────

export const workerStatuses = ["active", "inactive", "suspended"] as const;
export type WorkerStatus = (typeof workerStatuses)[number];

export const workerAvailabilityStatuses = [
  "available",
  "busy",
  "on_leave",
  "unavailable",
] as const;
export type WorkerAvailabilityStatus =
  (typeof workerAvailabilityStatuses)[number];

export const workerEmploymentTypes = ["vendor", "company"] as const;
export type WorkerEmploymentType = (typeof workerEmploymentTypes)[number];

export const workerTaskStatuses = [
  "assigned",
  "accepted",
  "rejected",
  "travelling",
  "checked_in",
  "working",
  "completed",
  "checked_out",
  "cancelled",
] as const;
export type WorkerTaskStatus = (typeof workerTaskStatuses)[number];

export const workerNoteTypes = ["internal", "progress", "worker"] as const;
export type WorkerNoteType = (typeof workerNoteTypes)[number];

export const workerAttendanceStatuses = [
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
] as const;
export type WorkerAttendanceStatus = (typeof workerAttendanceStatuses)[number];

export const workerNotificationTopics = [
  "worker.created",
  "worker.updated",
  "worker.assigned",
  "worker.accepted",
  "worker.rejected",
  "worker.checked_in",
  "worker.progress_updated",
  "worker.checked_out",
  "worker.task_completed",
  "worker.note_added",
] as const;
export type WorkerNotificationTopic = (typeof workerNotificationTopics)[number];

export const createWorkerSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  phoneE164: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(200).optional(),
  photoPlaceholder: z.string().trim().max(500).optional(),
  vendorId: z.string().uuid().optional(),
  employmentType: z.enum(workerEmploymentTypes).default("vendor"),
  experienceYears: z.number().int().min(0).max(60).optional(),
  emergencyContactName: z.string().trim().max(200).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  bankAccountHolder: z.string().trim().max(200).optional(),
  bankName: z.string().trim().max(200).optional(),
  accountNumberMasked: z.string().trim().max(40).optional(),
  ifscCode: z.string().trim().max(20).optional(),
  upiId: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(4000).optional(),
  skills: z
    .array(
      z.object({
        skillCode: z.string().trim().min(1).max(80),
        skillLabel: z.string().trim().min(1).max(120),
        proficiency: z
          .enum(["junior", "standard", "senior", "expert"])
          .default("standard"),
      }),
    )
    .max(30)
    .optional(),
  userId: z.string().uuid().optional(),
});
export type CreateWorkerRequest = z.infer<typeof createWorkerSchema>;

export const updateWorkerSchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
  phoneE164: z.string().trim().min(8).max(20).optional(),
  email: z.string().trim().email().max(200).nullable().optional(),
  photoPlaceholder: z.string().trim().max(500).nullable().optional(),
  status: z.enum(workerStatuses).optional(),
  availabilityStatus: z.enum(workerAvailabilityStatuses).optional(),
  experienceYears: z.number().int().min(0).max(60).nullable().optional(),
  emergencyContactName: z.string().trim().max(200).nullable().optional(),
  emergencyContactPhone: z.string().trim().max(20).nullable().optional(),
  bankAccountHolder: z.string().trim().max(200).nullable().optional(),
  bankName: z.string().trim().max(200).nullable().optional(),
  accountNumberMasked: z.string().trim().max(40).nullable().optional(),
  ifscCode: z.string().trim().max(20).nullable().optional(),
  upiId: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(4000).nullable().optional(),
  skills: z
    .array(
      z.object({
        skillCode: z.string().trim().min(1).max(80),
        skillLabel: z.string().trim().min(1).max(120),
        proficiency: z
          .enum(["junior", "standard", "senior", "expert"])
          .default("standard"),
      }),
    )
    .max(30)
    .optional(),
});
export type UpdateWorkerRequest = z.infer<typeof updateWorkerSchema>;

export const assignWorkerSchema = z.object({
  eventRecordId: z.string().uuid(),
  workerId: z.string().uuid(),
  vendorId: z.string().uuid().optional(),
  vendorAssignmentId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  expectedStartAt: z.string().min(10).max(40).optional(),
  expectedEndAt: z.string().min(10).max(40).optional(),
});
export type AssignWorkerRequest = z.infer<typeof assignWorkerSchema>;

export const rejectWorkerTaskSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export type RejectWorkerTaskRequest = z.infer<typeof rejectWorkerTaskSchema>;

export const workerCheckInSchema = z.object({
  gpsPlaceholder: z.string().trim().max(200).optional(),
  locationPlaceholder: z.string().trim().max(500).optional(),
  photoPlaceholder: z.string().trim().max(500).optional(),
  devicePlaceholder: z.string().trim().max(200).optional(),
});
export type WorkerCheckInRequest = z.infer<typeof workerCheckInSchema>;

export const workerCheckOutSchema = z.object({
  completionNotes: z.string().trim().max(4000).optional(),
  completionPhotoPlaceholders: z
    .array(z.string().trim().max(500))
    .max(20)
    .optional(),
  markCompleted: z.boolean().default(true),
});
export type WorkerCheckOutRequest = z.infer<typeof workerCheckOutSchema>;

export const workerProgressUpdateSchema = z.object({
  summary: z.string().trim().min(1).max(8000),
  percentComplete: z.number().int().min(0).max(100).optional(),
  photoPlaceholders: z.array(z.string().trim().max(500)).max(20).optional(),
  status: z
    .enum(["travelling", "checked_in", "working", "completed"])
    .optional(),
});
export type WorkerProgressUpdateRequest = z.infer<
  typeof workerProgressUpdateSchema
>;

export const addWorkerNoteSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  noteType: z.enum(workerNoteTypes).default("internal"),
  taskId: z.string().uuid().optional(),
  eventRecordId: z.string().uuid().optional(),
});
export type AddWorkerNoteRequest = z.infer<typeof addWorkerNoteSchema>;

export interface WorkerSkillSummary {
  readonly id: string;
  readonly skillCode: string;
  readonly skillLabel: string;
  readonly proficiency: string;
}

export interface WorkerMembershipSummary {
  readonly id: string;
  readonly vendorId?: string;
  readonly vendorBusinessName?: string;
  readonly employmentType: WorkerEmploymentType;
  readonly membershipRole: string;
  readonly status: string;
  readonly isPrimary: boolean;
}

export interface WorkerSummary {
  readonly id: string;
  readonly workerCode: string;
  readonly displayName: string;
  readonly phoneE164: string;
  readonly email?: string;
  readonly photoPlaceholder?: string;
  readonly status: WorkerStatus;
  readonly availabilityStatus: WorkerAvailabilityStatus;
  readonly primaryVendorId?: string;
  readonly primaryVendorName?: string;
  readonly skills: readonly WorkerSkillSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkerDetailResponse extends WorkerSummary {
  readonly userId?: string;
  readonly experienceYears?: number;
  readonly emergencyContactName?: string;
  readonly emergencyContactPhone?: string;
  readonly bankAccountHolder?: string;
  readonly bankName?: string;
  readonly accountNumberMasked?: string;
  readonly ifscCode?: string;
  readonly upiId?: string;
  readonly bio?: string;
  readonly memberships: readonly WorkerMembershipSummary[];
  readonly documents: readonly {
    readonly id: string;
    readonly docType: string;
    readonly status: string;
    readonly fileName?: string;
    readonly createdAt: string;
  }[];
}

export interface WorkerTaskSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly eventName?: string;
  readonly workerId: string;
  readonly workerDisplayName?: string;
  readonly vendorId?: string;
  readonly vendorBusinessName?: string;
  readonly vendorAssignmentId?: string;
  readonly title: string;
  readonly description?: string;
  readonly status: WorkerTaskStatus;
  readonly assignedByUserId?: string;
  readonly expectedStartAt?: string;
  readonly expectedEndAt?: string;
  readonly rejectionReason?: string;
  readonly latestProgressSummary?: string;
  readonly assignedAt: string;
  readonly acceptedAt?: string;
  readonly checkedInAt?: string;
  readonly completedAt?: string;
  readonly checkedOutAt?: string;
  readonly version: number;
}

export interface WorkerTaskHistoryEntry {
  readonly id: string;
  readonly taskId: string;
  readonly changeType: string;
  readonly fromStatus?: string;
  readonly toStatus?: string;
  readonly summary: string;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface WorkerCheckInSummary {
  readonly id: string;
  readonly taskId: string;
  readonly workerId: string;
  readonly checkType: "check_in" | "check_out";
  readonly checkedAt: string;
  readonly gpsPlaceholder?: string;
  readonly locationPlaceholder?: string;
  readonly photoPlaceholder?: string;
  readonly devicePlaceholder?: string;
  readonly completionNotes?: string;
  readonly completionPhotoPlaceholders: readonly string[];
}

export interface WorkerProgressSummary {
  readonly id: string;
  readonly taskId: string;
  readonly workerId: string;
  readonly summary: string;
  readonly percentComplete?: number;
  readonly photoPlaceholders: readonly string[];
  readonly createdByUserId?: string;
  readonly createdAt: string;
}

export interface WorkerNoteSummary {
  readonly id: string;
  readonly workerId: string;
  readonly taskId?: string;
  readonly eventRecordId?: string;
  readonly noteType: WorkerNoteType;
  readonly content: string;
  readonly createdByUserId?: string;
  readonly createdAt: string;
}

export interface WorkerAttendanceSummary {
  readonly id: string;
  readonly workerId: string;
  readonly workerDisplayName?: string;
  readonly eventRecordId?: string;
  readonly taskId?: string;
  readonly attendanceDate: string;
  readonly status: WorkerAttendanceStatus;
  readonly notes?: string;
  readonly createdAt: string;
}

export interface WorkerTaskDetailResponse extends WorkerTaskSummary {
  readonly history: readonly WorkerTaskHistoryEntry[];
  readonly checkins: readonly WorkerCheckInSummary[];
  readonly progress: readonly WorkerProgressSummary[];
  readonly notes: readonly WorkerNoteSummary[];
  readonly timeline: readonly EventTimelineEntry[];
}

export interface WorkerDashboardResponse {
  readonly totalWorkers: number;
  readonly activeTasks: number;
  readonly pendingAcceptances: number;
  readonly checkedInToday: number;
  readonly completedTasks: number;
  readonly workers: readonly WorkerSummary[];
  readonly openTasks: readonly WorkerTaskSummary[];
  readonly recentAttendance: readonly WorkerAttendanceSummary[];
}

export interface WorkerListResponse {
  readonly workers: readonly WorkerSummary[];
  readonly meta?: PaginationMeta;
  readonly data?: readonly WorkerSummary[];
}

export interface WorkerTaskListResponse {
  readonly tasks: readonly WorkerTaskSummary[];
}

export interface WorkerAttendanceListResponse {
  readonly attendance: readonly WorkerAttendanceSummary[];
}

// ─── Inventory & Warehouse Foundation ──────────────────────────────────────

export const warehouseTypes = [
  "main",
  "branch",
  "partner",
  "temporary",
  "rental_partner",
] as const;
export type WarehouseType = (typeof warehouseTypes)[number];

export const warehouseStatuses = ["active", "inactive", "closed"] as const;
export type WarehouseStatus = (typeof warehouseStatuses)[number];

export const inventoryItemStatuses = [
  "available",
  "reserved",
  "allocated",
  "in_transit",
  "on_site",
  "returned",
  "damaged",
  "maintenance",
  "disposed",
] as const;
export type InventoryItemStatus = (typeof inventoryItemStatuses)[number];

export const inventoryConditions = [
  "new",
  "good",
  "fair",
  "poor",
  "damaged",
] as const;
export type InventoryCondition = (typeof inventoryConditions)[number];

export const inventoryOwnershipTypes = ["owned", "rented", "partner"] as const;
export type InventoryOwnershipType = (typeof inventoryOwnershipTypes)[number];

export const inventoryAllocationStatuses = [
  "reserved",
  "allocated",
  "dispatched",
  "on_site",
  "returned",
  "cancelled",
] as const;
export type InventoryAllocationStatus =
  (typeof inventoryAllocationStatuses)[number];

export const inventoryMovementTypes = [
  "reserve",
  "allocate",
  "dispatch",
  "arrive_site",
  "return",
  "transfer",
  "maintenance",
  "damage",
  "dispose",
] as const;
export type InventoryMovementType = (typeof inventoryMovementTypes)[number];

export const inventoryMaintenanceStatuses = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type InventoryMaintenanceStatus =
  (typeof inventoryMaintenanceStatuses)[number];

export const inventoryDamageSeverities = [
  "minor",
  "major",
  "total_loss",
] as const;
export type InventoryDamageSeverity =
  (typeof inventoryDamageSeverities)[number];

export const inventoryNotificationTopics = [
  "inventory.created",
  "inventory.updated",
  "inventory.reserved",
  "inventory.allocated",
  "inventory.dispatched",
  "inventory.on_site",
  "inventory.returned",
  "inventory.cancelled",
  "inventory.damage_reported",
  "inventory.maintenance_started",
  "inventory.note_added",
  "warehouse.created",
  "warehouse.updated",
] as const;
export type InventoryNotificationTopic =
  (typeof inventoryNotificationTopics)[number];

export const createWarehouseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  warehouseType: z.enum(warehouseTypes).default("main"),
  addressLine: z.string().trim().max(500).optional(),
  city: z.string().trim().min(1).max(100).default("Hyderabad"),
  state: z.string().trim().min(1).max(100).default("Telangana"),
  pincode: z.string().trim().max(12).optional(),
  notes: z.string().trim().max(4000).optional(),
});
export type CreateWarehouseRequest = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  warehouseType: z.enum(warehouseTypes).optional(),
  addressLine: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().min(1).max(100).optional(),
  pincode: z.string().trim().max(12).nullable().optional(),
  status: z.enum(warehouseStatuses).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateWarehouseRequest = z.infer<typeof updateWarehouseSchema>;

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(80).optional(),
  barcodePlaceholder: z.string().trim().max(200).optional(),
  qrPlaceholder: z.string().trim().max(200).optional(),
  categoryCode: z.string().trim().min(1).max(80).optional(),
  brand: z.string().trim().max(120).optional(),
  description: z.string().trim().max(4000).optional(),
  purchaseDate: z.string().min(8).max(40).optional(),
  purchaseCost: z.number().nonnegative().max(100000000).optional(),
  rentalCost: z.number().nonnegative().max(100000000).optional(),
  currentValue: z.number().nonnegative().max(100000000).optional(),
  warehouseId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  condition: z.enum(inventoryConditions).default("good"),
  ownershipType: z.enum(inventoryOwnershipTypes).default("owned"),
  ownerLabel: z.string().trim().max(200).optional(),
  quantityOnHand: z.number().int().min(0).max(100000).default(1),
  photoPlaceholders: z.array(z.string().trim().max(500)).max(20).optional(),
});
export type CreateInventoryItemRequest = z.infer<
  typeof createInventoryItemSchema
>;

export const updateInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sku: z.string().trim().max(80).nullable().optional(),
  barcodePlaceholder: z.string().trim().max(200).nullable().optional(),
  qrPlaceholder: z.string().trim().max(200).nullable().optional(),
  categoryCode: z.string().trim().min(1).max(80).nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  purchaseDate: z.string().min(8).max(40).nullable().optional(),
  purchaseCost: z.number().nonnegative().max(100000000).nullable().optional(),
  rentalCost: z.number().nonnegative().max(100000000).nullable().optional(),
  currentValue: z.number().nonnegative().max(100000000).nullable().optional(),
  warehouseId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  condition: z.enum(inventoryConditions).optional(),
  status: z.enum(inventoryItemStatuses).optional(),
  ownershipType: z.enum(inventoryOwnershipTypes).optional(),
  ownerLabel: z.string().trim().max(200).nullable().optional(),
  quantityOnHand: z.number().int().min(0).max(100000).optional(),
  photoPlaceholders: z.array(z.string().trim().max(500)).max(20).optional(),
});
export type UpdateInventoryItemRequest = z.infer<
  typeof updateInventoryItemSchema
>;

export const allocateInventorySchema = z.object({
  eventRecordId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000).default(1),
  unitId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  expectedDispatchAt: z.string().min(10).max(40).optional(),
  expectedReturnAt: z.string().min(10).max(40).optional(),
  notes: z.string().trim().max(4000).optional(),
  status: z.enum(["reserved", "allocated"]).default("reserved"),
});
export type AllocateInventoryRequest = z.infer<typeof allocateInventorySchema>;

export const updateInventoryAllocationSchema = z.object({
  status: z
    .enum([
      "reserved",
      "allocated",
      "dispatched",
      "on_site",
      "returned",
      "cancelled",
    ])
    .optional(),
  expectedDispatchAt: z.string().min(10).max(40).nullable().optional(),
  expectedReturnAt: z.string().min(10).max(40).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  vehiclePlaceholder: z.string().trim().max(200).optional(),
  venuePlaceholder: z.string().trim().max(500).optional(),
});
export type UpdateInventoryAllocationRequest = z.infer<
  typeof updateInventoryAllocationSchema
>;

export const returnInventorySchema = z.object({
  returnedQuantity: z.number().int().min(1).max(100000).default(1),
  conditionOnReturn: z.enum(inventoryConditions).default("good"),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().trim().max(4000).optional(),
});
export type ReturnInventoryRequest = z.infer<typeof returnInventorySchema>;

export const reportInventoryDamageSchema = z.object({
  itemId: z.string().uuid(),
  allocationId: z.string().uuid().optional(),
  eventRecordId: z.string().uuid().optional(),
  severity: z.enum(inventoryDamageSeverities).default("minor"),
  summary: z.string().trim().min(1).max(4000),
  photoPlaceholders: z.array(z.string().trim().max(500)).max(20).optional(),
});
export type ReportInventoryDamageRequest = z.infer<
  typeof reportInventoryDamageSchema
>;

export const startInventoryMaintenanceSchema = z.object({
  itemId: z.string().uuid(),
  summary: z.string().trim().min(1).max(4000),
  notes: z.string().trim().max(4000).optional(),
});
export type StartInventoryMaintenanceRequest = z.infer<
  typeof startInventoryMaintenanceSchema
>;

export const addInventoryNoteSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  noteType: z
    .enum(["internal", "ops", "damage", "maintenance"])
    .default("internal"),
  allocationId: z.string().uuid().optional(),
  eventRecordId: z.string().uuid().optional(),
});
export type AddInventoryNoteRequest = z.infer<typeof addInventoryNoteSchema>;

export interface WarehouseLocationSummary {
  readonly id: string;
  readonly locationCode: string;
  readonly name: string;
  readonly zone?: string;
  readonly aisle?: string;
  readonly shelf?: string;
  readonly status: string;
}

export interface WarehouseSummary {
  readonly id: string;
  readonly warehouseCode: string;
  readonly name: string;
  readonly warehouseType: WarehouseType;
  readonly city: string;
  readonly state: string;
  readonly status: WarehouseStatus;
  readonly addressLine?: string;
  readonly pincode?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WarehouseDetailResponse extends WarehouseSummary {
  readonly notes?: string;
  readonly locations: readonly WarehouseLocationSummary[];
}

export interface InventoryCategorySummary {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
}

export interface InventoryItemSummary {
  readonly id: string;
  readonly inventoryCode: string;
  readonly name: string;
  readonly sku?: string;
  readonly status: InventoryItemStatus;
  readonly condition: InventoryCondition;
  readonly ownershipType: InventoryOwnershipType;
  readonly quantityOnHand: number;
  readonly warehouseId?: string;
  readonly warehouseName?: string;
  readonly categoryCode?: string;
  readonly categoryName?: string;
  readonly brand?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryItemDetailResponse extends InventoryItemSummary {
  readonly barcodePlaceholder?: string;
  readonly qrPlaceholder?: string;
  readonly description?: string;
  readonly purchaseDate?: string;
  readonly purchaseCost?: string;
  readonly rentalCost?: string;
  readonly currentValue?: string;
  readonly locationId?: string;
  readonly locationName?: string;
  readonly ownerLabel?: string;
  readonly photoPlaceholders: readonly string[];
}

export interface InventoryAllocationSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly eventName?: string;
  readonly itemId: string;
  readonly itemName?: string;
  readonly inventoryCode?: string;
  readonly warehouseId?: string;
  readonly warehouseName?: string;
  readonly quantity: number;
  readonly status: InventoryAllocationStatus;
  readonly allocatedByUserId?: string;
  readonly expectedDispatchAt?: string;
  readonly expectedReturnAt?: string;
  readonly notes?: string;
  readonly reservedAt: string;
  readonly allocatedAt?: string;
  readonly dispatchedAt?: string;
  readonly onSiteAt?: string;
  readonly returnedAt?: string;
  readonly version: number;
}

export interface InventoryMovementSummary {
  readonly id: string;
  readonly allocationId?: string;
  readonly itemId: string;
  readonly itemName?: string;
  readonly eventRecordId?: string;
  readonly movementType: InventoryMovementType;
  readonly fromPlace?: string;
  readonly toPlace?: string;
  readonly vehiclePlaceholder?: string;
  readonly venuePlaceholder?: string;
  readonly quantity: number;
  readonly notes?: string;
  readonly occurredAt: string;
}

export interface InventoryDamageReportSummary {
  readonly id: string;
  readonly itemId: string;
  readonly itemName?: string;
  readonly allocationId?: string;
  readonly eventRecordId?: string;
  readonly severity: InventoryDamageSeverity;
  readonly summary: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface InventoryMaintenanceSummary {
  readonly id: string;
  readonly itemId: string;
  readonly itemName?: string;
  readonly summary: string;
  readonly status: InventoryMaintenanceStatus;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdAt: string;
}

export interface InventoryNoteSummary {
  readonly id: string;
  readonly itemId: string;
  readonly allocationId?: string;
  readonly eventRecordId?: string;
  readonly noteType: string;
  readonly content: string;
  readonly createdByUserId?: string;
  readonly createdAt: string;
}

export interface InventoryAllocationDetailResponse
  extends InventoryAllocationSummary {
  readonly movements: readonly InventoryMovementSummary[];
  readonly noteEntries: readonly InventoryNoteSummary[];
  readonly timeline: readonly EventTimelineEntry[];
}

export interface InventoryDashboardResponse {
  readonly totalItems: number;
  readonly availableItems: number;
  readonly reservedItems: number;
  readonly onSiteItems: number;
  readonly maintenanceItems: number;
  readonly openAllocations: number;
  readonly items: readonly InventoryItemSummary[];
  readonly allocations: readonly InventoryAllocationSummary[];
  readonly recentMovements: readonly InventoryMovementSummary[];
}

export interface WarehouseDashboardResponse {
  readonly totalWarehouses: number;
  readonly activeWarehouses: number;
  readonly totalItems: number;
  readonly availableItems: number;
  readonly warehouses: readonly WarehouseSummary[];
  readonly stockHighlights: readonly InventoryItemSummary[];
}

export interface WarehouseListResponse {
  readonly warehouses: readonly WarehouseSummary[];
}

export interface InventoryListResponse {
  readonly items: readonly InventoryItemSummary[];
  readonly meta?: PaginationMeta;
  readonly data?: readonly InventoryItemSummary[];
}

export interface InventoryAllocationListResponse {
  readonly allocations: readonly InventoryAllocationSummary[];
}

export interface InventoryMovementListResponse {
  readonly movements: readonly InventoryMovementSummary[];
}

export interface InventoryMaintenanceListResponse {
  readonly maintenance: readonly InventoryMaintenanceSummary[];
}

// ─── Finance & Settlement Foundation ───────────────────────────────────────

export const financeSettlementStatuses = [
  "open",
  "partially_settled",
  "settled",
  "closed",
] as const;
export type FinanceSettlementStatus =
  (typeof financeSettlementStatuses)[number];

export const customerPaymentKinds = [
  "advance",
  "balance",
  "partial",
  "refund",
  "cancelled",
] as const;
export type CustomerPaymentKind = (typeof customerPaymentKinds)[number];

export const vendorSettlementStatuses = [
  "pending",
  "partially_paid",
  "paid",
  "cancelled",
] as const;
export type VendorSettlementStatus = (typeof vendorSettlementStatuses)[number];

export const workerPayoutStatuses = [
  "pending",
  "approved",
  "paid",
  "cancelled",
] as const;
export type WorkerPayoutStatus = (typeof workerPayoutStatuses)[number];

export const expenseTypes = ["vendor", "worker", "inventory", "other"] as const;
export type ExpenseType = (typeof expenseTypes)[number];

export const financeNotificationTopics = [
  "finance.payment_recorded",
  "finance.refund_recorded",
  "finance.expense_added",
  "finance.vendor_settlement",
  "finance.worker_payout",
  "finance.invoice_issued",
  "finance.receipt_issued",
  "finance.summary_updated",
] as const;
export type FinanceNotificationTopic =
  (typeof financeNotificationTopics)[number];

export const recordCustomerPaymentSchema = z.object({
  eventRecordId: z.string().uuid(),
  paymentKind: z.enum(["advance", "balance", "partial"]).default("advance"),
  amount: z.number().positive().max(100000000),
  methodCode: z.string().trim().min(1).max(40).default("upi"),
  notes: z.string().trim().max(4000).optional(),
  sourcePaymentId: z.string().uuid().optional(),
  issueReceipt: z.boolean().default(true),
});
export type RecordCustomerPaymentRequest = z.infer<
  typeof recordCustomerPaymentSchema
>;

export const recordRefundSchema = z.object({
  eventRecordId: z.string().uuid(),
  amount: z.number().positive().max(100000000),
  reason: z.string().trim().min(1).max(2000),
  customerPaymentId: z.string().uuid().optional(),
});
export type RecordRefundRequest = z.infer<typeof recordRefundSchema>;

export const createExpenseSchema = z.object({
  eventRecordId: z.string().uuid(),
  expenseType: z.enum(expenseTypes).default("other"),
  categoryCode: z.string().trim().min(1).max(80).optional(),
  amount: z.number().positive().max(100000000),
  description: z.string().trim().min(1).max(2000),
});
export type CreateExpenseRequest = z.infer<typeof createExpenseSchema>;

export const createVendorSettlementSchema = z.object({
  eventRecordId: z.string().uuid(),
  vendorId: z.string().uuid(),
  amount: z.number().positive().max(100000000),
  status: z.enum(vendorSettlementStatuses).default("pending"),
  notes: z.string().trim().max(4000).optional(),
  vendorBillId: z.string().uuid().optional(),
});
export type CreateVendorSettlementRequest = z.infer<
  typeof createVendorSettlementSchema
>;

export const updateVendorSettlementSchema = z.object({
  status: z.enum(vendorSettlementStatuses),
  notes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateVendorSettlementRequest = z.infer<
  typeof updateVendorSettlementSchema
>;

export const createWorkerPayoutSchema = z.object({
  eventRecordId: z.string().uuid(),
  workerId: z.string().uuid(),
  amount: z.number().positive().max(100000000),
  notes: z.string().trim().max(4000).optional(),
});
export type CreateWorkerPayoutRequest = z.infer<
  typeof createWorkerPayoutSchema
>;

export const updateWorkerPayoutSchema = z.object({
  status: z.enum(workerPayoutStatuses),
  notes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateWorkerPayoutRequest = z.infer<
  typeof updateWorkerPayoutSchema
>;

export const issueInvoiceSchema = z.object({
  eventRecordId: z.string().uuid(),
  amount: z.number().positive().max(100000000),
  notes: z.string().trim().max(4000).optional(),
});
export type IssueInvoiceRequest = z.infer<typeof issueInvoiceSchema>;

export const updateEventFinanceSchema = z.object({
  budgetAmount: z.number().nonnegative().max(100000000).optional(),
  revenueAmount: z.number().nonnegative().max(100000000).optional(),
  settlementStatus: z.enum(financeSettlementStatuses).optional(),
});
export type UpdateEventFinanceRequest = z.infer<
  typeof updateEventFinanceSchema
>;

export interface EventFinancialSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly eventName?: string;
  readonly currencyCode: string;
  readonly budgetAmount: string;
  readonly revenueAmount: string;
  readonly advanceReceived: string;
  readonly balancePending: string;
  readonly vendorCost: string;
  readonly workerCost: string;
  readonly inventoryCost: string;
  readonly otherExpenses: string;
  readonly totalExpense: string;
  readonly profitAmount: string;
  readonly lossAmount: string;
  readonly settlementStatus: FinanceSettlementStatus;
  readonly updatedAt: string;
  readonly version: number;
}

export interface CustomerPaymentFinanceSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly paymentKind: CustomerPaymentKind;
  readonly amount: string;
  readonly methodCode: string;
  readonly status: string;
  readonly referenceCode: string;
  readonly notes?: string;
  readonly createdAt: string;
}

export interface CustomerRefundSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly amount: string;
  readonly status: string;
  readonly reason: string;
  readonly referenceCode: string;
  readonly createdAt: string;
}

export interface VendorSettlementSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly vendorId: string;
  readonly vendorBusinessName?: string;
  readonly amount: string;
  readonly status: VendorSettlementStatus;
  readonly referenceCode: string;
  readonly notes?: string;
  readonly settledAt?: string;
  readonly createdAt: string;
}

export interface WorkerPayoutSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly workerId: string;
  readonly workerDisplayName?: string;
  readonly amount: string;
  readonly status: WorkerPayoutStatus;
  readonly referenceCode: string;
  readonly notes?: string;
  readonly paidAt?: string;
  readonly createdAt: string;
}

export interface EventExpenseSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly expenseType: ExpenseType;
  readonly categoryCode?: string;
  readonly amount: string;
  readonly description: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface InvoiceSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly invoiceNumber: string;
  readonly amount: string;
  readonly status: string;
  readonly issuedAt?: string;
  readonly createdAt: string;
}

export interface ReceiptSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly receiptNumber: string;
  readonly amount: string;
  readonly status: string;
  readonly issuedAt: string;
  readonly createdAt: string;
}

export interface LedgerEntrySummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly entrySide: "debit" | "credit";
  readonly amount: string;
  readonly description: string;
  readonly occurredAt: string;
}

export interface EventFinanceDetailResponse extends EventFinancialSummary {
  readonly payments: readonly CustomerPaymentFinanceSummary[];
  readonly refunds: readonly CustomerRefundSummary[];
  readonly vendorSettlements: readonly VendorSettlementSummary[];
  readonly workerPayouts: readonly WorkerPayoutSummary[];
  readonly expenses: readonly EventExpenseSummary[];
  readonly invoices: readonly InvoiceSummary[];
  readonly receipts: readonly ReceiptSummary[];
  readonly ledger: readonly LedgerEntrySummary[];
  readonly timeline: readonly EventTimelineEntry[];
}

export interface FinanceDashboardResponse {
  readonly totalEvents: number;
  readonly openSettlements: number;
  readonly totalAdvanceReceived: string;
  readonly totalExpenses: string;
  readonly totalProfit: string;
  readonly pendingVendorSettlements: number;
  readonly pendingWorkerPayouts: number;
  readonly summaries: readonly EventFinancialSummary[];
  readonly recentPayments: readonly CustomerPaymentFinanceSummary[];
  readonly recentSettlements: readonly VendorSettlementSummary[];
}

export interface EventFinanceListResponse {
  readonly summaries: readonly EventFinancialSummary[];
}

export interface CustomerPaymentFinanceListResponse {
  readonly payments: readonly CustomerPaymentFinanceSummary[];
}

export interface VendorSettlementListResponse {
  readonly settlements: readonly VendorSettlementSummary[];
}

export interface WorkerPayoutListResponse {
  readonly payouts: readonly WorkerPayoutSummary[];
}

export interface EventExpenseListResponse {
  readonly expenses: readonly EventExpenseSummary[];
}

export interface InvoiceListResponse {
  readonly invoices: readonly InvoiceSummary[];
}

export interface ReceiptListResponse {
  readonly receipts: readonly ReceiptSummary[];
}

export interface LedgerListResponse {
  readonly entries: readonly LedgerEntrySummary[];
}

// ---------------------------------------------------------------------------
// Operations (Event Execution) Foundation
// ---------------------------------------------------------------------------

export const operationsTaskPriorities = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;
export type OperationsTaskPriority = (typeof operationsTaskPriorities)[number];

export const operationsTaskStatuses = [
  "pending",
  "planning",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type OperationsTaskStatus = (typeof operationsTaskStatuses)[number];

export const operationsTaskCategories = [
  "stage_setup",
  "decorations",
  "catering",
  "photography",
  "dj",
  "welcome",
  "food_service",
  "cleanup",
  "other",
] as const;
export type OperationsTaskCategory = (typeof operationsTaskCategories)[number];

export const taskAssigneeTypes = [
  "manager",
  "supervisor",
  "vendor",
  "worker",
] as const;
export type TaskAssigneeType = (typeof taskAssigneeTypes)[number];

export const taskAssignmentStatuses = [
  "active",
  "released",
  "completed",
] as const;
export type TaskAssignmentStatus = (typeof taskAssignmentStatuses)[number];

export const attendanceLogStatuses = [
  "checked_in",
  "checked_out",
  "absent",
  "finalized",
] as const;
export type AttendanceLogStatus = (typeof attendanceLogStatuses)[number];

export const eventIssueTypes = [
  "vendor_late",
  "material_missing",
  "equipment_failure",
  "rain",
  "staff_absent",
  "emergency",
  "other",
] as const;
export type EventIssueType = (typeof eventIssueTypes)[number];

export const eventIssuePriorities = [
  "low",
  "normal",
  "high",
  "critical",
] as const;
export type EventIssuePriority = (typeof eventIssuePriorities)[number];

export const eventIssueStatuses = [
  "open",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type EventIssueStatus = (typeof eventIssueStatuses)[number];

export const eventPhotoCategories = [
  "before",
  "during",
  "after",
  "completion_proof",
] as const;
export type EventPhotoCategory = (typeof eventPhotoCategories)[number];

export const materialUsageStatuses = ["open", "finalized"] as const;
export type MaterialUsageStatus = (typeof materialUsageStatuses)[number];

export const eventCompletionStatuses = [
  "in_progress",
  "ready",
  "completed",
  "blocked",
] as const;
export type EventCompletionStatus = (typeof eventCompletionStatuses)[number];

export const eventProgressStatuses = [
  "not_started",
  "in_progress",
  "completed",
] as const;
export type EventProgressStatus = (typeof eventProgressStatuses)[number];

export const operationsNotificationTopics = [
  "operations.task_created",
  "operations.task_updated",
  "operations.task_assigned",
  "operations.attendance_recorded",
  "operations.issue_created",
  "operations.issue_updated",
  "operations.photo_uploaded",
  "operations.material_recorded",
  "operations.progress_updated",
  "operations.event_completed",
] as const;
export type OperationsNotificationTopic =
  (typeof operationsNotificationTopics)[number];

export const createOperationsTaskSchema = z.object({
  eventRecordId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  priority: z.enum(operationsTaskPriorities).default("normal"),
  category: z.enum(operationsTaskCategories).default("other"),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().positive().max(10080).optional(),
  isMandatory: z.boolean().default(false),
  notes: z.string().trim().max(4000).optional(),
});
export type CreateOperationsTaskRequest = z.infer<
  typeof createOperationsTaskSchema
>;

export const updateOperationsTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  priority: z.enum(operationsTaskPriorities).optional(),
  status: z.enum(operationsTaskStatuses).optional(),
  category: z.enum(operationsTaskCategories).optional(),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  estimatedMinutes: z
    .number()
    .int()
    .positive()
    .max(10080)
    .nullable()
    .optional(),
  completionPercent: z.number().int().min(0).max(100).optional(),
  isMandatory: z.boolean().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateOperationsTaskRequest = z.infer<
  typeof updateOperationsTaskSchema
>;

export const assignOperationsTaskSchema = z.object({
  assigneeType: z.enum(taskAssigneeTypes),
  managerUserId: z.string().uuid().optional(),
  supervisorUserId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  notes: z.string().trim().max(4000).optional(),
});
export type AssignOperationsTaskRequest = z.infer<
  typeof assignOperationsTaskSchema
>;

export const updateTaskAssignmentSchema = z.object({
  status: z.enum(taskAssignmentStatuses).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  managerUserId: z.string().uuid().nullable().optional(),
  supervisorUserId: z.string().uuid().nullable().optional(),
  vendorId: z.string().uuid().nullable().optional(),
  workerId: z.string().uuid().nullable().optional(),
});
export type UpdateTaskAssignmentRequest = z.infer<
  typeof updateTaskAssignmentSchema
>;

export const checkInAttendanceSchema = z.object({
  eventRecordId: z.string().uuid(),
  workerId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  gpsPlaceholder: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CheckInAttendanceRequest = z.infer<typeof checkInAttendanceSchema>;

export const checkOutAttendanceSchema = z.object({
  attendanceLogId: z.string().uuid(),
  gpsPlaceholder: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CheckOutAttendanceRequest = z.infer<
  typeof checkOutAttendanceSchema
>;

export const finalizeAttendanceSchema = z.object({
  eventRecordId: z.string().uuid(),
});
export type FinalizeAttendanceRequest = z.infer<
  typeof finalizeAttendanceSchema
>;

export const createEventIssueSchema = z.object({
  eventRecordId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  issueType: z.enum(eventIssueTypes).default("other"),
  priority: z.enum(eventIssuePriorities).default("normal"),
  description: z.string().trim().min(1).max(4000),
  attachmentPlaceholders: z
    .array(z.string().trim().max(500))
    .max(20)
    .optional(),
});
export type CreateEventIssueRequest = z.infer<typeof createEventIssueSchema>;

export const updateEventIssueSchema = z.object({
  status: z.enum(eventIssueStatuses).optional(),
  priority: z.enum(eventIssuePriorities).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  attachmentPlaceholders: z
    .array(z.string().trim().max(500))
    .max(20)
    .optional(),
});
export type UpdateEventIssueRequest = z.infer<typeof updateEventIssueSchema>;

export const uploadEventPhotoSchema = z.object({
  eventRecordId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  category: z.enum(eventPhotoCategories),
  storageKey: z.string().trim().min(1).max(500).optional(),
  caption: z.string().trim().max(1000).optional(),
});
export type UploadEventPhotoRequest = z.infer<typeof uploadEventPhotoSchema>;

export const recordMaterialUsageSchema = z.object({
  eventRecordId: z.string().uuid(),
  inventoryItemId: z.string().uuid().optional(),
  allocationId: z.string().uuid().optional(),
  itemLabel: z.string().trim().min(1).max(200),
  quantityIssued: z.number().nonnegative().max(1000000).default(0),
  quantityUsed: z.number().nonnegative().max(1000000).default(0),
  quantityReturned: z.number().nonnegative().max(1000000).default(0),
  quantityDamaged: z.number().nonnegative().max(1000000).default(0),
  quantityLost: z.number().nonnegative().max(1000000).default(0),
  notes: z.string().trim().max(4000).optional(),
});
export type RecordMaterialUsageRequest = z.infer<
  typeof recordMaterialUsageSchema
>;

export const updateMaterialUsageSchema = z.object({
  quantityIssued: z.number().nonnegative().max(1000000).optional(),
  quantityUsed: z.number().nonnegative().max(1000000).optional(),
  quantityReturned: z.number().nonnegative().max(1000000).optional(),
  quantityDamaged: z.number().nonnegative().max(1000000).optional(),
  quantityLost: z.number().nonnegative().max(1000000).optional(),
  status: z.enum(materialUsageStatuses).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateMaterialUsageRequest = z.infer<
  typeof updateMaterialUsageSchema
>;

export const updateCompletionChecklistSchema = z.object({
  checklist: z.record(z.boolean()).optional(),
  notes: z.string().trim().max(4000).optional(),
});
export type UpdateCompletionChecklistRequest = z.infer<
  typeof updateCompletionChecklistSchema
>;

export const completeEventOperationsSchema = z.object({
  notes: z.string().trim().max(4000).optional(),
});
export type CompleteEventOperationsRequest = z.infer<
  typeof completeEventOperationsSchema
>;

export interface OperationsTaskAssignmentSummary {
  readonly id: string;
  readonly taskId: string;
  readonly eventRecordId: string;
  readonly assigneeType: TaskAssigneeType;
  readonly status: TaskAssignmentStatus;
  readonly managerUserId?: string;
  readonly supervisorUserId?: string;
  readonly vendorId?: string;
  readonly workerId?: string;
  readonly notes?: string;
  readonly assignedAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface OperationsTaskSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly title: string;
  readonly description?: string;
  readonly priority: OperationsTaskPriority;
  readonly status: OperationsTaskStatus;
  readonly category: OperationsTaskCategory;
  readonly startAt?: string;
  readonly endAt?: string;
  readonly estimatedMinutes?: number;
  readonly completionPercent: number;
  readonly isMandatory: boolean;
  readonly notes?: string;
  readonly assignments: readonly OperationsTaskAssignmentSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface OperationsTaskDetailResponse extends OperationsTaskSummary {
  readonly timeline: readonly EventTimelineEntry[];
}

export interface OperationsTaskListResponse {
  readonly tasks: readonly OperationsTaskSummary[];
}

export interface AttendanceLogSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly workerId: string;
  readonly workerName?: string;
  readonly taskId?: string;
  readonly checkInAt?: string;
  readonly checkOutAt?: string;
  readonly gpsPlaceholder?: string;
  readonly workingMinutes?: number;
  readonly status: AttendanceLogStatus;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface AttendanceLogListResponse {
  readonly logs: readonly AttendanceLogSummary[];
}

export interface EventIssueSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly taskId?: string;
  readonly issueType: EventIssueType;
  readonly priority: EventIssuePriority;
  readonly status: EventIssueStatus;
  readonly description: string;
  readonly attachmentPlaceholders: readonly string[];
  readonly reportedByUserId?: string;
  readonly reportedByRole?: string;
  readonly resolvedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface EventIssueListResponse {
  readonly issues: readonly EventIssueSummary[];
}

export interface EventPhotoSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly taskId?: string;
  readonly category: EventPhotoCategory;
  readonly storageKey?: string;
  readonly caption?: string;
  readonly uploadedByUserId?: string;
  readonly createdAt: string;
}

export interface EventPhotoListResponse {
  readonly photos: readonly EventPhotoSummary[];
}

export interface MaterialUsageSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly inventoryItemId?: string;
  readonly allocationId?: string;
  readonly itemLabel: string;
  readonly quantityIssued: number;
  readonly quantityUsed: number;
  readonly quantityReturned: number;
  readonly quantityDamaged: number;
  readonly quantityLost: number;
  readonly status: MaterialUsageStatus;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface MaterialUsageListResponse {
  readonly materials: readonly MaterialUsageSummary[];
}

export interface EventProgressSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly eventName?: string;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly pendingTasks: number;
  readonly overallCompletionPercent: number;
  readonly status: EventProgressStatus;
  readonly lastCalculatedAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface OperationsProgressListResponse {
  readonly progress: readonly EventProgressSummary[];
}

export interface EventCompletionSummary {
  readonly id: string;
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly status: EventCompletionStatus;
  readonly mandatoryTasksComplete: boolean;
  readonly attendanceFinalized: boolean;
  readonly materialsFinalized: boolean;
  readonly finalPhotosUploaded: boolean;
  readonly checklistFinished: boolean;
  readonly checklist: Readonly<Record<string, boolean>>;
  readonly notes?: string;
  readonly completedAt?: string;
  readonly completedByUserId?: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface EventOperationsDetailResponse {
  readonly eventRecordId: string;
  readonly eventNumber?: string;
  readonly eventName?: string;
  readonly progress: EventProgressSummary;
  readonly completion: EventCompletionSummary;
  readonly tasks: readonly OperationsTaskSummary[];
  readonly attendance: readonly AttendanceLogSummary[];
  readonly issues: readonly EventIssueSummary[];
  readonly photos: readonly EventPhotoSummary[];
  readonly materials: readonly MaterialUsageSummary[];
  readonly timeline: readonly EventTimelineEntry[];
}

export interface EventOperationsListResponse {
  readonly events: readonly EventProgressSummary[];
}

export interface OperationsDashboardResponse {
  readonly totalEvents: number;
  readonly inProgressEvents: number;
  readonly completedEvents: number;
  readonly openIssues: number;
  readonly pendingTasks: number;
  readonly checkedInWorkers: number;
  readonly progress: readonly EventProgressSummary[];
  readonly recentIssues: readonly EventIssueSummary[];
  readonly recentTasks: readonly OperationsTaskSummary[];
}

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
  readonly meta?: PaginationMeta;
  readonly data?: readonly QuotationSummary[];
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
  readonly meta?: PaginationMeta;
  readonly data?: readonly BookingSummary[];
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
  readonly entryType: EventTimelineEntryType;
  readonly title: string;
  readonly content?: string;
  readonly customerVisible: boolean;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface EventActivitySummary {
  readonly id: string;
  readonly activityType: EventActivityType;
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
  readonly fromStatus?: EventRecordStatus;
  readonly toStatus: EventRecordStatus;
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
  readonly meta?: PaginationMeta;
  readonly data?: readonly EventRecordSummary[];
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
  "vendor_own.read",
  "vendor_own.update",
  "worker_assignment.read_own",
  "worker_assignment.respond_own",
  "worker_attendance.check_in_own",
  "worker_duty.update_own",
  "worker_payment.read_own",
  "worker_own.read",
  "worker_own.update",
  "crm_lead.read",
  "crm_lead.update",
  "crm_lead.assign",
  "crm_customer.read",
  "crm_quotation.read",
  "crm_quotation.manage",
  "crm_booking.read",
  "crm_booking.manage",
  "crm_payment.read",
  "crm_payment.approve",
  "crm_vendor.read",
  "crm_vendor.manage",
  "crm_worker.read",
  "crm_worker.manage",
  "crm_operations.read",
  "crm_operations.manage",
  "erp_event.read",
  "erp_event.manage",
  "manager_event.read",
  "manager_event.manage",
  "manager_task.read",
  "manager_task.manage",
  "manager_progress.manage",
  "manager_dashboard.read",
  "erp_vendor.read",
  "erp_vendor.manage",
  "erp_vendor_price.approve",
  "erp_worker.read",
  "erp_worker.manage",
  "inventory.read",
  "inventory.manage",
  "inventory.allocate",
  "warehouse.read",
  "warehouse.manage",
  "erp_warehouse.read",
  "erp_warehouse.manage",
  "finance.read",
  "finance.manage",
  "finance.settlement",
  "finance.dashboard",
  "erp_finance.read",
  "erp_finance.manage",
  "operations_assigned.read",
  "operations_assigned.update",
  "operations.dashboard",
  "operations.task.read",
  "operations.task.manage",
  "operations.attendance.manage",
  "operations.issue.manage",
  "operations.photo.upload",
  "operations.complete",
  "erp_operations.read",
  "erp_operations.manage",
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
  "erp_manager_ops",
  "erp_vendors",
  "erp_workers",
  "erp_warehouse",
  "erp_finance",
  "erp_operations",
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
