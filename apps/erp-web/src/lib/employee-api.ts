import type {
  AddEventNoteRequest,
  ApiError,
  BookingDetailResponse,
  BookingListResponse,
  ChangeEventStatusRequest,
  ConfirmAdvanceResult,
  CreateQuotationRequest,
  EventActivityListResponse,
  EventNoteSummary,
  EventRecordDetailResponse,
  EventRecordListResponse,
  EventTimelineResponse,
  LeadListResponse,
  LeadRequirementsRequest,
  LeadSummary,
  PaymentListResponse,
  QuotationDetailResponse,
  QuotationListResponse,
  RequestOtpResponse,
  UpdateEventRecordRequest,
  UpdateQuotationRequest,
  VerifyOtpResponse,
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
  body: UpdateQuotationRequest & { reason?: "employee_revise" | "customer_request" },
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
