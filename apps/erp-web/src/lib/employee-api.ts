import type {
  AddEventNoteRequest,
  AddEventTimelineEntryRequest,
  ApiError,
  AssignEventManagerRequest,
  BookingDetailResponse,
  BookingListResponse,
  ChangeEventStatusRequest,
  CompleteEventTaskRequest,
  ConfirmAdvanceResult,
  CreateEventProgressRequest,
  CreateEventTaskRequest,
  CreateQuotationRequest,
  EventActivityListResponse,
  EventManagerDashboardResponse,
  EventNoteSummary,
  EventProgressListResponse,
  EventProgressUpdateSummary,
  EventRecordDetailResponse,
  EventRecordListResponse,
  EventTaskCommentSummary,
  EventTaskDetailResponse,
  EventTaskListResponse,
  EventTaskSummary,
  EventTimelineEntry,
  EventTimelineResponse,
  LeadListResponse,
  LeadRequirementsRequest,
  LeadSummary,
  ManagerAssignmentListResponse,
  ManagerAssignmentSummary,
  ManagerCandidateListResponse,
  ManagerDashboardResponse,
  PaymentListResponse,
  QuotationDetailResponse,
  QuotationListResponse,
  RequestOtpResponse,
  UpdateEventRecordRequest,
  UpdateEventTaskRequest,
  UpdateManagerAssignmentRequest,
  UpdateQuotationRequest,
  VerifyOtpResponse,
  AddEventTaskCommentRequest,
  AssignVendorRequest,
  CreateVendorRequest,
  ServiceCategorySummary,
  UpdateVendorAssignmentRequest,
  UpdateVendorRequest,
  VendorAssignmentDetailResponse,
  VendorAssignmentListResponse,
  VendorAssignmentSummary,
  VendorDashboardResponse,
  VendorDetailResponse,
  VendorListResponse,
  VendorNoteSummary,
  AddVendorNoteRequest,
  AddWorkerNoteRequest,
  AssignWorkerRequest,
  CreateWorkerRequest,
  UpdateWorkerRequest,
  WorkerAttendanceListResponse,
  WorkerDashboardResponse,
  WorkerDetailResponse,
  WorkerListResponse,
  WorkerNoteSummary,
  WorkerTaskDetailResponse,
  WorkerTaskListResponse,
  WorkerTaskSummary,
  AddInventoryNoteRequest,
  AllocateInventoryRequest,
  CreateInventoryItemRequest,
  CreateWarehouseRequest,
  InventoryAllocationDetailResponse,
  InventoryAllocationListResponse,
  InventoryAllocationSummary,
  InventoryDashboardResponse,
  InventoryItemDetailResponse,
  InventoryListResponse,
  InventoryMaintenanceListResponse,
  InventoryMaintenanceSummary,
  InventoryMovementListResponse,
  InventoryNoteSummary,
  ReturnInventoryRequest,
  StartInventoryMaintenanceRequest,
  UpdateInventoryAllocationRequest,
  UpdateInventoryItemRequest,
  UpdateWarehouseRequest,
  WarehouseDashboardResponse,
  WarehouseDetailResponse,
  WarehouseListResponse,
  CreateExpenseRequest,
  CreateVendorSettlementRequest,
  CreateWorkerPayoutRequest,
  CustomerPaymentFinanceListResponse,
  CustomerPaymentFinanceSummary,
  CustomerRefundSummary,
  EventExpenseListResponse,
  EventExpenseSummary,
  EventFinanceDetailResponse,
  EventFinanceListResponse,
  EventFinancialSummary,
  FinanceDashboardResponse,
  InvoiceListResponse,
  InvoiceSummary,
  IssueInvoiceRequest,
  LedgerListResponse,
  ReceiptListResponse,
  RecordCustomerPaymentRequest,
  RecordRefundRequest,
  UpdateEventFinanceRequest,
  UpdateVendorSettlementRequest,
  UpdateWorkerPayoutRequest,
  VendorSettlementListResponse,
  VendorSettlementSummary,
  WorkerPayoutListResponse,
  WorkerPayoutSummary,
  OperationsDashboardResponse,
  EventOperationsListResponse,
  EventOperationsDetailResponse,
  EventProgressSummary,
  OperationsProgressListResponse,
  OperationsTaskListResponse,
  OperationsTaskSummary,
  CreateOperationsTaskRequest,
  UpdateOperationsTaskRequest,
  AssignOperationsTaskRequest,
  OperationsTaskAssignmentSummary,
  AttendanceLogListResponse,
  CheckInAttendanceRequest,
  CheckOutAttendanceRequest,
  FinalizeAttendanceRequest,
  AttendanceLogSummary,
  EventIssueListResponse,
  CreateEventIssueRequest,
  UpdateEventIssueRequest,
  EventIssueSummary,
  EventPhotoListResponse,
  UploadEventPhotoRequest,
  EventPhotoSummary,
  MaterialUsageListResponse,
  RecordMaterialUsageRequest,
  UpdateMaterialUsageRequest,
  MaterialUsageSummary,
  EventCompletionSummary,
  UpdateCompletionChecklistRequest,
  CompleteEventOperationsRequest,
} from "@me-event/api-contracts";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api/v1"
).replace(/\/+$/, "");

const SESSION_STORAGE_KEY = "mee-events.employee-session";

export interface EmployeeSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly userId: string;
  readonly mobileNumber: string;
  readonly lastActiveRole: string;
}

export class EmployeeApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "EmployeeApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, ...rest } = init;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(rest.body === undefined ? {} : { "Content-Type": "application/json" }),
    ...(accessToken === undefined
      ? {}
      : { Authorization: `Bearer ${accessToken}` }),
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as Partial<ApiError> & {
        message?: string;
      };
      if (typeof body.message === "string" && body.message.length > 0) {
        message = body.message;
      }
      if (typeof body.code === "string") {
        code = body.code;
      }
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new EmployeeApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}

export function requestOtp(mobileNumber: string): Promise<RequestOtpResponse> {
  return request<RequestOtpResponse>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ mobileNumber, countryCode: "IN" }),
  });
}

export async function verifyOtp(
  challengeId: string,
  code: string,
): Promise<EmployeeSession> {
  const response = await request<VerifyOtpResponse>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({
      challengeId,
      code,
      deviceId: browserDeviceId(),
      deviceName: "ERP Web",
    }),
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    userId: response.user.id,
    mobileNumber: response.user.mobileNumber,
    lastActiveRole: response.user.lastActiveRole,
  };
}

export async function logout(session: EmployeeSession): Promise<void> {
  try {
    await request<{ revoked: true }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
      accessToken: session.accessToken,
    });
  } finally {
    clearStoredSession();
  }
}

export function listLeads(session: EmployeeSession): Promise<LeadListResponse> {
  return request<LeadListResponse>("/crm/leads", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function claimLead(
  session: EmployeeSession,
  leadId: string,
): Promise<LeadSummary> {
  return request<LeadSummary>(`/crm/leads/${leadId}/claim`, {
    method: "POST",
    body: JSON.stringify({}),
    accessToken: session.accessToken,
  });
}

export function getLead(
  session: EmployeeSession,
  leadId: string,
): Promise<LeadSummary> {
  return request<LeadSummary>(`/crm/leads/${leadId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function saveLeadRequirements(
  session: EmployeeSession,
  leadId: string,
  body: LeadRequirementsRequest,
): Promise<LeadSummary> {
  return request<LeadSummary>(`/crm/leads/${leadId}/requirements`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listQuotations(
  session: EmployeeSession,
): Promise<QuotationListResponse> {
  return request<QuotationListResponse>("/crm/quotations", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getQuotation(
  session: EmployeeSession,
  quotationId: string,
): Promise<QuotationDetailResponse> {
  return request<QuotationDetailResponse>(`/crm/quotations/${quotationId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createQuotation(
  session: EmployeeSession,
  body: CreateQuotationRequest,
): Promise<QuotationDetailResponse> {
  return request<QuotationDetailResponse>("/crm/quotations", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateQuotation(
  session: EmployeeSession,
  quotationId: string,
  body: UpdateQuotationRequest,
): Promise<QuotationDetailResponse> {
  return request<QuotationDetailResponse>(`/crm/quotations/${quotationId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function reviseQuotation(
  session: EmployeeSession,
  quotationId: string,
  body: UpdateQuotationRequest & {
    reason?: "employee_revise" | "customer_request";
  },
): Promise<QuotationDetailResponse> {
  return request<QuotationDetailResponse>(
    `/crm/quotations/${quotationId}/revise`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function sendQuotation(
  session: EmployeeSession,
  quotationId: string,
): Promise<QuotationDetailResponse> {
  return request<QuotationDetailResponse>(
    `/crm/quotations/${quotationId}/send`,
    {
      method: "POST",
      body: JSON.stringify({}),
      accessToken: session.accessToken,
    },
  );
}

export function listPendingPayments(
  session: EmployeeSession,
  quotationId: string,
): Promise<PaymentListResponse> {
  return request<PaymentListResponse>(
    `/crm/payments/quotation/${quotationId}`,
    {
      method: "GET",
      accessToken: session.accessToken,
    },
  );
}

export function confirmAdvancePayment(
  session: EmployeeSession,
  paymentId: string,
): Promise<ConfirmAdvanceResult> {
  return request<ConfirmAdvanceResult>(`/crm/payments/${paymentId}/confirm`, {
    method: "POST",
    body: JSON.stringify({}),
    accessToken: session.accessToken,
  });
}

export function getBooking(
  session: EmployeeSession,
  bookingId: string,
): Promise<BookingDetailResponse> {
  return request<BookingDetailResponse>(`/crm/bookings/${bookingId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listBookings(
  session: EmployeeSession,
): Promise<BookingListResponse> {
  return request<BookingListResponse>("/crm/bookings", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listEvents(
  session: EmployeeSession,
): Promise<EventRecordListResponse> {
  return request<EventRecordListResponse>("/crm/events", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getEvent(
  session: EmployeeSession,
  eventId: string,
): Promise<EventRecordDetailResponse> {
  return request<EventRecordDetailResponse>(`/crm/events/${eventId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function updateEvent(
  session: EmployeeSession,
  eventId: string,
  body: UpdateEventRecordRequest,
): Promise<EventRecordDetailResponse> {
  return request<EventRecordDetailResponse>(`/crm/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function changeEventStatus(
  session: EmployeeSession,
  eventId: string,
  body: ChangeEventStatusRequest,
): Promise<EventRecordDetailResponse> {
  return request<EventRecordDetailResponse>(`/crm/events/${eventId}/status`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function addEventNote(
  session: EmployeeSession,
  eventId: string,
  body: AddEventNoteRequest,
): Promise<EventNoteSummary> {
  return request<EventNoteSummary>(`/crm/events/${eventId}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function addEventTimelineEntry(
  session: EmployeeSession,
  eventId: string,
  body: AddEventTimelineEntryRequest,
): Promise<EventTimelineEntry> {
  return request<EventTimelineEntry>(`/crm/events/${eventId}/timeline`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getEventTimeline(
  session: EmployeeSession,
  eventId: string,
): Promise<EventTimelineResponse> {
  return request<EventTimelineResponse>(`/crm/events/${eventId}/timeline`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getEventActivities(
  session: EmployeeSession,
  eventId: string,
): Promise<EventActivityListResponse> {
  return request<EventActivityListResponse>(
    `/crm/events/${eventId}/activities`,
    {
      method: "GET",
      accessToken: session.accessToken,
    },
  );
}

export function listManagerCandidates(
  session: EmployeeSession,
): Promise<ManagerCandidateListResponse> {
  return request<ManagerCandidateListResponse>("/crm/manager/candidates", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getManagerDashboard(
  session: EmployeeSession,
): Promise<ManagerDashboardResponse> {
  return request<ManagerDashboardResponse>("/crm/manager/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getEventManagerDashboard(
  session: EmployeeSession,
  eventId: string,
): Promise<EventManagerDashboardResponse> {
  return request<EventManagerDashboardResponse>(
    `/crm/manager/events/${eventId}/dashboard`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function getActiveManagerAssignment(
  session: EmployeeSession,
  eventId: string,
): Promise<ManagerAssignmentListResponse> {
  return request<ManagerAssignmentListResponse>(
    `/crm/manager/events/${eventId}/assignment`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function assignEventManager(
  session: EmployeeSession,
  eventId: string,
  body: AssignEventManagerRequest,
): Promise<ManagerAssignmentSummary> {
  return request<ManagerAssignmentSummary>(
    `/crm/manager/events/${eventId}/assign`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function updateManagerAssignment(
  session: EmployeeSession,
  assignmentId: string,
  body: UpdateManagerAssignmentRequest,
): Promise<ManagerAssignmentSummary> {
  return request<ManagerAssignmentSummary>(
    `/crm/manager/assignments/${assignmentId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listEventTasks(
  session: EmployeeSession,
  eventId: string,
): Promise<EventTaskListResponse> {
  return request<EventTaskListResponse>(
    `/crm/manager/events/${eventId}/tasks`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function createEventTask(
  session: EmployeeSession,
  eventId: string,
  body: CreateEventTaskRequest,
): Promise<EventTaskSummary> {
  return request<EventTaskSummary>(`/crm/manager/events/${eventId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getEventTask(
  session: EmployeeSession,
  taskId: string,
): Promise<EventTaskDetailResponse> {
  return request<EventTaskDetailResponse>(`/crm/manager/tasks/${taskId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function updateEventTask(
  session: EmployeeSession,
  taskId: string,
  body: UpdateEventTaskRequest,
): Promise<EventTaskSummary> {
  return request<EventTaskSummary>(`/crm/manager/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function completeEventTask(
  session: EmployeeSession,
  taskId: string,
  body: CompleteEventTaskRequest = {},
): Promise<EventTaskSummary> {
  return request<EventTaskSummary>(`/crm/manager/tasks/${taskId}/complete`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function addEventTaskComment(
  session: EmployeeSession,
  taskId: string,
  body: AddEventTaskCommentRequest,
): Promise<EventTaskCommentSummary> {
  return request<EventTaskCommentSummary>(
    `/crm/manager/tasks/${taskId}/comments`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listEventProgress(
  session: EmployeeSession,
  eventId: string,
): Promise<EventProgressListResponse> {
  return request<EventProgressListResponse>(
    `/crm/manager/events/${eventId}/progress`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function createEventProgress(
  session: EmployeeSession,
  eventId: string,
  body: CreateEventProgressRequest,
): Promise<EventProgressUpdateSummary> {
  return request<EventProgressUpdateSummary>(
    `/crm/manager/events/${eventId}/progress`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listServiceCategories(
  session: EmployeeSession,
): Promise<{ readonly serviceCategories: readonly ServiceCategorySummary[] }> {
  return request<{
    readonly serviceCategories: readonly ServiceCategorySummary[];
  }>("/catalog/service-categories", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listVendors(
  session: EmployeeSession,
): Promise<VendorListResponse> {
  return request<VendorListResponse>("/crm/vendors", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getVendorDashboard(
  session: EmployeeSession,
): Promise<VendorDashboardResponse> {
  return request<VendorDashboardResponse>("/crm/vendors/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getVendor(
  session: EmployeeSession,
  vendorId: string,
): Promise<VendorDetailResponse> {
  return request<VendorDetailResponse>(`/crm/vendors/${vendorId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createVendor(
  session: EmployeeSession,
  body: CreateVendorRequest,
): Promise<VendorDetailResponse> {
  return request<VendorDetailResponse>("/crm/vendors", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateVendor(
  session: EmployeeSession,
  vendorId: string,
  body: UpdateVendorRequest,
): Promise<VendorDetailResponse> {
  return request<VendorDetailResponse>(`/crm/vendors/${vendorId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listVendorAssignments(
  session: EmployeeSession,
  query?: { readonly eventRecordId?: string; readonly vendorId?: string },
): Promise<VendorAssignmentListResponse> {
  const params = new URLSearchParams();
  if (query?.eventRecordId !== undefined) {
    params.set("eventRecordId", query.eventRecordId);
  }
  if (query?.vendorId !== undefined) {
    params.set("vendorId", query.vendorId);
  }
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<VendorAssignmentListResponse>(
    `/crm/vendors/assignments${suffix}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function assignVendor(
  session: EmployeeSession,
  body: AssignVendorRequest,
): Promise<VendorAssignmentSummary> {
  return request<VendorAssignmentSummary>("/crm/vendors/assignments", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getVendorAssignment(
  session: EmployeeSession,
  assignmentId: string,
): Promise<VendorAssignmentDetailResponse> {
  return request<VendorAssignmentDetailResponse>(
    `/crm/vendors/assignments/${assignmentId}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function updateVendorAssignment(
  session: EmployeeSession,
  assignmentId: string,
  body: UpdateVendorAssignmentRequest,
): Promise<VendorAssignmentSummary> {
  return request<VendorAssignmentSummary>(
    `/crm/vendors/assignments/${assignmentId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function addVendorNote(
  session: EmployeeSession,
  vendorId: string,
  body: AddVendorNoteRequest,
): Promise<VendorNoteSummary> {
  return request<VendorNoteSummary>(`/crm/vendors/${vendorId}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listWorkers(
  session: EmployeeSession,
  query?: { readonly vendorId?: string },
): Promise<WorkerListResponse> {
  const params = new URLSearchParams();
  if (query?.vendorId !== undefined) params.set("vendorId", query.vendorId);
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<WorkerListResponse>(`/crm/workers${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getWorkerDashboard(
  session: EmployeeSession,
): Promise<WorkerDashboardResponse> {
  return request<WorkerDashboardResponse>("/crm/workers/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getWorker(
  session: EmployeeSession,
  workerId: string,
): Promise<WorkerDetailResponse> {
  return request<WorkerDetailResponse>(`/crm/workers/${workerId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createWorker(
  session: EmployeeSession,
  body: CreateWorkerRequest,
): Promise<WorkerDetailResponse> {
  return request<WorkerDetailResponse>("/crm/workers", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateWorker(
  session: EmployeeSession,
  workerId: string,
  body: UpdateWorkerRequest,
): Promise<WorkerDetailResponse> {
  return request<WorkerDetailResponse>(`/crm/workers/${workerId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listWorkerTasks(
  session: EmployeeSession,
  query?: {
    readonly eventRecordId?: string;
    readonly workerId?: string;
    readonly vendorId?: string;
  },
): Promise<WorkerTaskListResponse> {
  const params = new URLSearchParams();
  if (query?.eventRecordId !== undefined) {
    params.set("eventRecordId", query.eventRecordId);
  }
  if (query?.workerId !== undefined) params.set("workerId", query.workerId);
  if (query?.vendorId !== undefined) params.set("vendorId", query.vendorId);
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<WorkerTaskListResponse>(`/crm/workers/tasks${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function assignWorker(
  session: EmployeeSession,
  body: AssignWorkerRequest,
): Promise<WorkerTaskSummary> {
  return request<WorkerTaskSummary>("/crm/workers/tasks", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getWorkerTask(
  session: EmployeeSession,
  taskId: string,
): Promise<WorkerTaskDetailResponse> {
  return request<WorkerTaskDetailResponse>(`/crm/workers/tasks/${taskId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listWorkerAttendance(
  session: EmployeeSession,
  query?: { readonly workerId?: string },
): Promise<WorkerAttendanceListResponse> {
  const params = new URLSearchParams();
  if (query?.workerId !== undefined) params.set("workerId", query.workerId);
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<WorkerAttendanceListResponse>(
    `/crm/workers/attendance${suffix}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function addWorkerNote(
  session: EmployeeSession,
  workerId: string,
  body: AddWorkerNoteRequest,
): Promise<WorkerNoteSummary> {
  return request<WorkerNoteSummary>(`/crm/workers/${workerId}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getWarehouseDashboard(
  session: EmployeeSession,
): Promise<WarehouseDashboardResponse> {
  return request<WarehouseDashboardResponse>("/crm/warehouses/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listWarehouses(
  session: EmployeeSession,
): Promise<WarehouseListResponse> {
  return request<WarehouseListResponse>("/crm/warehouses", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createWarehouse(
  session: EmployeeSession,
  body: CreateWarehouseRequest,
): Promise<WarehouseDetailResponse> {
  return request<WarehouseDetailResponse>("/crm/warehouses", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateWarehouse(
  session: EmployeeSession,
  warehouseId: string,
  body: UpdateWarehouseRequest,
): Promise<WarehouseDetailResponse> {
  return request<WarehouseDetailResponse>(`/crm/warehouses/${warehouseId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getInventoryDashboard(
  session: EmployeeSession,
): Promise<InventoryDashboardResponse> {
  return request<InventoryDashboardResponse>("/crm/inventory/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listInventory(
  session: EmployeeSession,
): Promise<InventoryListResponse> {
  return request<InventoryListResponse>("/crm/inventory", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getInventoryItem(
  session: EmployeeSession,
  itemId: string,
): Promise<InventoryItemDetailResponse> {
  return request<InventoryItemDetailResponse>(`/crm/inventory/${itemId}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createInventoryItem(
  session: EmployeeSession,
  body: CreateInventoryItemRequest,
): Promise<InventoryItemDetailResponse> {
  return request<InventoryItemDetailResponse>("/crm/inventory", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateInventoryItem(
  session: EmployeeSession,
  itemId: string,
  body: UpdateInventoryItemRequest,
): Promise<InventoryItemDetailResponse> {
  return request<InventoryItemDetailResponse>(`/crm/inventory/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listInventoryAllocations(
  session: EmployeeSession,
  query?: { readonly eventRecordId?: string; readonly itemId?: string },
): Promise<InventoryAllocationListResponse> {
  const params = new URLSearchParams();
  if (query?.eventRecordId !== undefined) {
    params.set("eventRecordId", query.eventRecordId);
  }
  if (query?.itemId !== undefined) params.set("itemId", query.itemId);
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<InventoryAllocationListResponse>(
    `/crm/inventory/allocations${suffix}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function allocateInventory(
  session: EmployeeSession,
  body: AllocateInventoryRequest,
): Promise<InventoryAllocationSummary> {
  return request<InventoryAllocationSummary>("/crm/inventory/allocations", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getInventoryAllocation(
  session: EmployeeSession,
  allocationId: string,
): Promise<InventoryAllocationDetailResponse> {
  return request<InventoryAllocationDetailResponse>(
    `/crm/inventory/allocations/${allocationId}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function updateInventoryAllocation(
  session: EmployeeSession,
  allocationId: string,
  body: UpdateInventoryAllocationRequest,
): Promise<InventoryAllocationSummary> {
  return request<InventoryAllocationSummary>(
    `/crm/inventory/allocations/${allocationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function returnInventoryAllocation(
  session: EmployeeSession,
  allocationId: string,
  body: ReturnInventoryRequest,
): Promise<InventoryAllocationSummary> {
  return request<InventoryAllocationSummary>(
    `/crm/inventory/allocations/${allocationId}/return`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listInventoryMovements(
  session: EmployeeSession,
): Promise<InventoryMovementListResponse> {
  return request<InventoryMovementListResponse>("/crm/inventory/movements", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listInventoryMaintenance(
  session: EmployeeSession,
): Promise<InventoryMaintenanceListResponse> {
  return request<InventoryMaintenanceListResponse>(
    "/crm/inventory/maintenance",
    { method: "GET", accessToken: session.accessToken },
  );
}

export function startInventoryMaintenance(
  session: EmployeeSession,
  body: StartInventoryMaintenanceRequest,
): Promise<InventoryMaintenanceSummary> {
  return request<InventoryMaintenanceSummary>("/crm/inventory/maintenance", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function addInventoryNote(
  session: EmployeeSession,
  itemId: string,
  body: AddInventoryNoteRequest,
): Promise<InventoryNoteSummary> {
  return request<InventoryNoteSummary>(`/crm/inventory/${itemId}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function getFinanceDashboard(
  session: EmployeeSession,
): Promise<FinanceDashboardResponse> {
  return request<FinanceDashboardResponse>("/crm/finance/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listEventFinance(
  session: EmployeeSession,
): Promise<EventFinanceListResponse> {
  return request<EventFinanceListResponse>("/crm/finance/events", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getEventFinance(
  session: EmployeeSession,
  eventRecordId: string,
): Promise<EventFinanceDetailResponse> {
  return request<EventFinanceDetailResponse>(
    `/crm/finance/events/${eventRecordId}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function ensureEventFinance(
  session: EmployeeSession,
  eventRecordId: string,
): Promise<EventFinancialSummary> {
  return request<EventFinancialSummary>(
    `/crm/finance/events/${eventRecordId}/ensure`,
    { method: "POST", body: "{}", accessToken: session.accessToken },
  );
}

export function updateEventFinance(
  session: EmployeeSession,
  eventRecordId: string,
  body: UpdateEventFinanceRequest,
): Promise<EventFinancialSummary> {
  return request<EventFinancialSummary>(
    `/crm/finance/events/${eventRecordId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function recordFinancePayment(
  session: EmployeeSession,
  body: RecordCustomerPaymentRequest,
): Promise<CustomerPaymentFinanceSummary> {
  return request<CustomerPaymentFinanceSummary>("/crm/finance/payments", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listFinancePayments(
  session: EmployeeSession,
): Promise<CustomerPaymentFinanceListResponse> {
  return request<CustomerPaymentFinanceListResponse>("/crm/finance/payments", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function recordFinanceRefund(
  session: EmployeeSession,
  body: RecordRefundRequest,
): Promise<CustomerRefundSummary> {
  return request<CustomerRefundSummary>("/crm/finance/refunds", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listFinanceExpenses(
  session: EmployeeSession,
): Promise<EventExpenseListResponse> {
  return request<EventExpenseListResponse>("/crm/finance/expenses", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createFinanceExpense(
  session: EmployeeSession,
  body: CreateExpenseRequest,
): Promise<EventExpenseSummary> {
  return request<EventExpenseSummary>("/crm/finance/expenses", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listVendorSettlements(
  session: EmployeeSession,
): Promise<VendorSettlementListResponse> {
  return request<VendorSettlementListResponse>("/crm/finance/vendors", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createVendorSettlement(
  session: EmployeeSession,
  body: CreateVendorSettlementRequest,
): Promise<VendorSettlementSummary> {
  return request<VendorSettlementSummary>("/crm/finance/vendors", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateVendorSettlement(
  session: EmployeeSession,
  settlementId: string,
  body: UpdateVendorSettlementRequest,
): Promise<VendorSettlementSummary> {
  return request<VendorSettlementSummary>(
    `/crm/finance/vendors/${settlementId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listWorkerPayouts(
  session: EmployeeSession,
): Promise<WorkerPayoutListResponse> {
  return request<WorkerPayoutListResponse>("/crm/finance/workers", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createWorkerPayout(
  session: EmployeeSession,
  body: CreateWorkerPayoutRequest,
): Promise<WorkerPayoutSummary> {
  return request<WorkerPayoutSummary>("/crm/finance/workers", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateWorkerPayout(
  session: EmployeeSession,
  payoutId: string,
  body: UpdateWorkerPayoutRequest,
): Promise<WorkerPayoutSummary> {
  return request<WorkerPayoutSummary>(`/crm/finance/workers/${payoutId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listFinanceInvoices(
  session: EmployeeSession,
): Promise<InvoiceListResponse> {
  return request<InvoiceListResponse>("/crm/finance/invoices", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function issueFinanceInvoice(
  session: EmployeeSession,
  body: IssueInvoiceRequest,
): Promise<InvoiceSummary> {
  return request<InvoiceSummary>("/crm/finance/invoices", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listFinanceReceipts(
  session: EmployeeSession,
): Promise<ReceiptListResponse> {
  return request<ReceiptListResponse>("/crm/finance/receipts", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listFinanceLedger(
  session: EmployeeSession,
): Promise<LedgerListResponse> {
  return request<LedgerListResponse>("/crm/finance/ledger", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getOperationsDashboard(
  session: EmployeeSession,
): Promise<OperationsDashboardResponse> {
  return request<OperationsDashboardResponse>("/crm/operations/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function listOperationsEvents(
  session: EmployeeSession,
): Promise<EventOperationsListResponse> {
  return request<EventOperationsListResponse>("/crm/operations/events", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function getEventOperations(
  session: EmployeeSession,
  eventRecordId: string,
): Promise<EventOperationsDetailResponse> {
  return request<EventOperationsDetailResponse>(
    `/crm/operations/events/${eventRecordId}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function ensureEventOperations(
  session: EmployeeSession,
  eventRecordId: string,
): Promise<EventProgressSummary> {
  return request<EventProgressSummary>(
    `/crm/operations/events/${eventRecordId}/ensure`,
    { method: "POST", body: "{}", accessToken: session.accessToken },
  );
}

export function listOperationsTasks(
  session: EmployeeSession,
  eventRecordId?: string,
): Promise<OperationsTaskListResponse> {
  const params = new URLSearchParams();
  if (eventRecordId !== undefined) {
    params.set("eventRecordId", eventRecordId);
  }
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<OperationsTaskListResponse>(`/crm/operations/tasks${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createOperationsTask(
  session: EmployeeSession,
  body: CreateOperationsTaskRequest,
): Promise<OperationsTaskSummary> {
  return request<OperationsTaskSummary>("/crm/operations/tasks", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateOperationsTask(
  session: EmployeeSession,
  taskId: string,
  body: UpdateOperationsTaskRequest,
): Promise<OperationsTaskSummary> {
  return request<OperationsTaskSummary>(`/crm/operations/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function assignOperationsTask(
  session: EmployeeSession,
  taskId: string,
  body: AssignOperationsTaskRequest,
): Promise<OperationsTaskAssignmentSummary> {
  return request<OperationsTaskAssignmentSummary>(
    `/crm/operations/tasks/${taskId}/assign`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listOperationsAttendance(
  session: EmployeeSession,
  eventRecordId?: string,
): Promise<AttendanceLogListResponse> {
  const params = new URLSearchParams();
  if (eventRecordId !== undefined) {
    params.set("eventRecordId", eventRecordId);
  }
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<AttendanceLogListResponse>(
    `/crm/operations/attendance${suffix}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function checkInOperationsAttendance(
  session: EmployeeSession,
  body: CheckInAttendanceRequest,
): Promise<AttendanceLogSummary> {
  return request<AttendanceLogSummary>("/crm/operations/attendance/check-in", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function checkOutOperationsAttendance(
  session: EmployeeSession,
  body: CheckOutAttendanceRequest,
): Promise<AttendanceLogSummary> {
  return request<AttendanceLogSummary>("/crm/operations/attendance/check-out", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function finalizeOperationsAttendance(
  session: EmployeeSession,
  body: FinalizeAttendanceRequest,
): Promise<EventCompletionSummary> {
  return request<EventCompletionSummary>(
    "/crm/operations/attendance/finalize",
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listOperationsIssues(
  session: EmployeeSession,
  eventRecordId?: string,
): Promise<EventIssueListResponse> {
  const params = new URLSearchParams();
  if (eventRecordId !== undefined) {
    params.set("eventRecordId", eventRecordId);
  }
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<EventIssueListResponse>(`/crm/operations/issues${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function createOperationsIssue(
  session: EmployeeSession,
  body: CreateEventIssueRequest,
): Promise<EventIssueSummary> {
  return request<EventIssueSummary>("/crm/operations/issues", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateOperationsIssue(
  session: EmployeeSession,
  issueId: string,
  body: UpdateEventIssueRequest,
): Promise<EventIssueSummary> {
  return request<EventIssueSummary>(`/crm/operations/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listOperationsPhotos(
  session: EmployeeSession,
  eventRecordId?: string,
): Promise<EventPhotoListResponse> {
  const params = new URLSearchParams();
  if (eventRecordId !== undefined) {
    params.set("eventRecordId", eventRecordId);
  }
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<EventPhotoListResponse>(`/crm/operations/photos${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function uploadOperationsPhoto(
  session: EmployeeSession,
  body: UploadEventPhotoRequest,
): Promise<EventPhotoSummary> {
  return request<EventPhotoSummary>("/crm/operations/photos", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function listOperationsMaterials(
  session: EmployeeSession,
  eventRecordId?: string,
): Promise<MaterialUsageListResponse> {
  const params = new URLSearchParams();
  if (eventRecordId !== undefined) {
    params.set("eventRecordId", eventRecordId);
  }
  const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
  return request<MaterialUsageListResponse>(
    `/crm/operations/materials${suffix}`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function recordOperationsMaterial(
  session: EmployeeSession,
  body: RecordMaterialUsageRequest,
): Promise<MaterialUsageSummary> {
  return request<MaterialUsageSummary>("/crm/operations/materials", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: session.accessToken,
  });
}

export function updateOperationsMaterial(
  session: EmployeeSession,
  materialId: string,
  body: UpdateMaterialUsageRequest,
): Promise<MaterialUsageSummary> {
  return request<MaterialUsageSummary>(
    `/crm/operations/materials/${materialId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function listOperationsProgress(
  session: EmployeeSession,
): Promise<OperationsProgressListResponse> {
  return request<OperationsProgressListResponse>("/crm/operations/progress", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export function recalculateOperationsProgress(
  session: EmployeeSession,
  eventRecordId: string,
): Promise<EventProgressSummary> {
  return request<EventProgressSummary>(
    `/crm/operations/events/${eventRecordId}/recalculate`,
    { method: "POST", body: "{}", accessToken: session.accessToken },
  );
}

export function getOperationsCompletion(
  session: EmployeeSession,
  eventRecordId: string,
): Promise<EventCompletionSummary> {
  return request<EventCompletionSummary>(
    `/crm/operations/events/${eventRecordId}/completion`,
    { method: "GET", accessToken: session.accessToken },
  );
}

export function updateOperationsChecklist(
  session: EmployeeSession,
  eventRecordId: string,
  body: UpdateCompletionChecklistRequest,
): Promise<EventCompletionSummary> {
  return request<EventCompletionSummary>(
    `/crm/operations/events/${eventRecordId}/completion`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function completeEventOperations(
  session: EmployeeSession,
  eventRecordId: string,
  body: CompleteEventOperationsRequest,
): Promise<EventCompletionSummary> {
  return request<EventCompletionSummary>(
    `/crm/operations/events/${eventRecordId}/complete`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: session.accessToken,
    },
  );
}

export function storeSession(session: EmployeeSession): void {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readStoredSession(): EmployeeSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<EmployeeSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.userId !== "string"
    ) {
      return null;
    }
    return parsed as EmployeeSession;
  } catch {
    return null;
  }
}

export function clearStoredSession(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function browserDeviceId(): string {
  const key = "mee-events.device-id";
  const existing = window.localStorage.getItem(key);
  if (existing !== null && existing.length >= 8) {
    return existing;
  }
  const generated = `erp-web-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, generated);
  return generated;
}
