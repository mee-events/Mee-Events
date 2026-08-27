import { Inject, Injectable } from "@nestjs/common";
import type {
  AddEventNoteRequest,
  AddEventTimelineEntryRequest,
  ChangeEventStatusRequest,
  CreateEventRecordRequest,
  EventActivityListResponse,
  EventNoteSummary,
  EventRecordDetailResponse,
  EventRecordListResponse,
  EventTimelineEntry,
  EventTimelineResponse,
  UpdateEventNoteRequest,
  UpdateEventRecordRequest,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  EVENT_RECORD_REPOSITORY,
  type EventRecordRepository,
} from "../ports/event-record-repository";
import { generateEventNumber } from "./event-number";

@Injectable()
export class EventRecordService {
  public constructor(
    @Inject(EVENT_RECORD_REPOSITORY)
    private readonly events: EventRecordRepository,
  ) {}

  public async listOwn(
    principal: AuthenticatedPrincipal,
  ): Promise<EventRecordListResponse> {
    const events = await this.events.listForCustomerUser(principal.userId);
    return { events };
  }

  public async getOwn(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventRecordDetailResponse> {
    const event = await this.events.findForCustomerUser(
      principal.userId,
      eventRecordId,
    );
    if (event === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return event;
  }

  public async timelineOwn(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventTimelineResponse> {
    await this.getOwn(principal, eventRecordId);
    const timeline = await this.events.getTimeline(eventRecordId, true);
    return { timeline };
  }

  public async activitiesOwn(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventActivityListResponse> {
    await this.getOwn(principal, eventRecordId);
    const activities = await this.events.getActivities(eventRecordId, true);
    return { activities };
  }

  public async listCrm(
    principal: AuthenticatedPrincipal,
  ): Promise<EventRecordListResponse> {
    const events = await this.events.listForBranch(resolveBranchId(principal));
    return { events };
  }

  public async getCrm(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventRecordDetailResponse> {
    const event = await this.events.findById(
      eventRecordId,
      resolveBranchId(principal),
    );
    if (event === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return event;
  }

  public async createFromBooking(
    principal: AuthenticatedPrincipal,
    body: CreateEventRecordRequest,
    requestId: string = randomUUID(),
  ): Promise<EventRecordDetailResponse> {
    const created = await this.events.createFromBooking({
      bookingId: body.bookingId,
      branchId: resolveBranchId(principal),
      eventNumber: generateEventNumber(),
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (created === undefined) {
      throw new DomainError(
        "EVENT_RECORD_NOT_CREATABLE",
        "Event record cannot be created for this booking",
        409,
      );
    }
    return this.getCrm(principal, created.id);
  }

  public async update(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    patch: UpdateEventRecordRequest,
    requestId: string = randomUUID(),
  ): Promise<EventRecordDetailResponse> {
    const updated = await this.events.update({
      ...eventMutation(principal, eventRecordId, requestId),
      patch,
    });
    if (updated === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return updated;
  }

  public async changeStatus(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: ChangeEventStatusRequest,
    requestId: string = randomUUID(),
  ): Promise<EventRecordDetailResponse> {
    const existing = await this.events.findById(
      eventRecordId,
      resolveBranchId(principal),
    );
    if (existing === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    const updated = await this.events.changeStatus({
      ...eventMutation(principal, eventRecordId, requestId),
      body,
    });
    if (updated === undefined) {
      throw new DomainError(
        "EVENT_STATUS_INVALID",
        "Event status transition is not allowed",
        409,
      );
    }
    return updated;
  }

  public async addNote(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: AddEventNoteRequest,
    requestId: string = randomUUID(),
  ): Promise<EventNoteSummary> {
    const note = await this.events.addNote({
      ...eventMutation(principal, eventRecordId, requestId),
      body,
    });
    if (note === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return note;
  }

  public async updateNote(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    noteId: string,
    body: UpdateEventNoteRequest,
    requestId: string = randomUUID(),
  ): Promise<EventNoteSummary> {
    const note = await this.events.updateNote({
      ...eventMutation(principal, eventRecordId, requestId),
      noteId,
      body,
    });
    if (note === undefined) {
      throw new DomainError(
        "EVENT_NOTE_NOT_FOUND",
        "Event note not found",
        404,
      );
    }
    return note;
  }

  public async addTimelineEntry(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: AddEventTimelineEntryRequest,
    requestId: string = randomUUID(),
  ): Promise<EventTimelineEntry> {
    const entry = await this.events.addTimelineEntry({
      ...eventMutation(principal, eventRecordId, requestId),
      body,
    });
    if (entry === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return entry;
  }

  public async timelineCrm(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventTimelineResponse> {
    await this.getCrm(principal, eventRecordId);
    const timeline = await this.events.getTimeline(eventRecordId, false);
    return { timeline };
  }

  public async activitiesCrm(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventActivityListResponse> {
    await this.getCrm(principal, eventRecordId);
    const activities = await this.events.getActivities(eventRecordId, false);
    return { activities };
  }
}

function eventMutation(
  principal: AuthenticatedPrincipal,
  eventRecordId: string,
  requestId: string,
): {
  readonly eventRecordId: string;
  readonly branchId: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
} {
  return {
    eventRecordId,
    branchId: resolveBranchId(principal),
    actorUserId: principal.userId,
    actorRole: principal.activeRole,
    requestId,
  };
}
