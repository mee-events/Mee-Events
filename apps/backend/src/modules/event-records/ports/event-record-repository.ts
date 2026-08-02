import type {
  AddEventNoteRequest,
  ChangeEventStatusRequest,
  EventActivityListResponse,
  EventActivitySummary,
  EventNoteSummary,
  EventRecordDetailResponse,
  EventRecordSummary,
  EventTimelineEntry,
  EventTimelineResponse,
  UpdateEventNoteRequest,
  UpdateEventRecordRequest,
} from "@me-event/api-contracts";

export const EVENT_RECORD_REPOSITORY = Symbol("EVENT_RECORD_REPOSITORY");

export interface CreateEventRecordFromBookingInput {
  readonly bookingId: string;
  readonly eventNumber: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
}

export interface EventRecordMutationContext {
  readonly eventRecordId: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
}

export interface EventRecordRepository {
  listForCustomerUser(userId: string): Promise<readonly EventRecordSummary[]>;
  listForBranch(branchId: string): Promise<readonly EventRecordSummary[]>;
  findById(
    eventRecordId: string,
  ): Promise<EventRecordDetailResponse | undefined>;
  findForCustomerUser(
    userId: string,
    eventRecordId: string,
  ): Promise<EventRecordDetailResponse | undefined>;
  findByBookingId(
    bookingId: string,
  ): Promise<EventRecordSummary | undefined>;
  createFromBooking(
    input: CreateEventRecordFromBookingInput,
  ): Promise<EventRecordSummary | undefined>;
  update(
    input: EventRecordMutationContext & {
      readonly patch: UpdateEventRecordRequest;
    },
  ): Promise<EventRecordDetailResponse | undefined>;
  changeStatus(
    input: EventRecordMutationContext & {
      readonly body: ChangeEventStatusRequest;
    },
  ): Promise<EventRecordDetailResponse | undefined>;
  addNote(
    input: EventRecordMutationContext & {
      readonly body: AddEventNoteRequest;
    },
  ): Promise<EventNoteSummary | undefined>;
  updateNote(
    input: EventRecordMutationContext & {
      readonly noteId: string;
      readonly body: UpdateEventNoteRequest;
    },
  ): Promise<EventNoteSummary | undefined>;
  getTimeline(
    eventRecordId: string,
    customerVisibleOnly: boolean,
  ): Promise<readonly EventTimelineEntry[]>;
  getActivities(
    eventRecordId: string,
    customerVisibleOnly: boolean,
  ): Promise<readonly EventActivitySummary[]>;
}

export type {
  EventActivityListResponse,
  EventRecordDetailResponse,
  EventRecordSummary,
  EventTimelineResponse,
};
