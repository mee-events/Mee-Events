import { Inject, Injectable } from "@nestjs/common";
import type {
  AddEventNoteRequest,
  ChangeEventStatusRequest,
  CreateEventRecordRequest,
  EventActivityListResponse,
  EventNoteSummary,
  EventRecordDetailResponse,
  EventRecordListResponse,
  EventTimelineResponse,
  UpdateEventNoteRequest,
  UpdateEventRecordRequest,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import { HYDERABAD_BRANCH } from "../../platform-foundation/domain/platform-foundation";
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

  public async listCrm(): Promise<EventRecordListResponse> {
    const events = await this.events.listForBranch(HYDERABAD_BRANCH.id);
    return { events };
  }

  public async getCrm(eventRecordId: string): Promise<EventRecordDetailResponse> {
    const event = await this.events.findById(eventRecordId);
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
    return this.getCrm(created.id);
  }

  public async update(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    patch: UpdateEventRecordRequest,
    requestId: string = randomUUID(),
  ): Promise<EventRecordDetailResponse> {
    const updated = await this.events.update({
      eventRecordId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
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
    const existing = await this.events.findById(eventRecordId);
    if (existing === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    const updated = await this.events.changeStatus({
      eventRecordId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
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
      eventRecordId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
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
      eventRecordId,
      noteId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      body,
    });
    if (note === undefined) {
      throw new DomainError("EVENT_NOTE_NOT_FOUND", "Event note not found", 404);
    }
    return note;
  }

  public async timelineCrm(eventRecordId: string): Promise<EventTimelineResponse> {
    await this.getCrm(eventRecordId);
    const timeline = await this.events.getTimeline(eventRecordId, false);
    return { timeline };
  }

  public async activitiesCrm(
    eventRecordId: string,
  ): Promise<EventActivityListResponse> {
    await this.getCrm(eventRecordId);
    const activities = await this.events.getActivities(eventRecordId, false);
    return { activities };
  }
}
