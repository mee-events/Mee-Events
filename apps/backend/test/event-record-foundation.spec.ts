import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AddEventNoteRequest,
  AddEventTimelineEntryRequest,
  ChangeEventStatusRequest,
  EventActivitySummary,
  EventNoteSummary,
  EventRecordDetailResponse,
  EventRecordSummary,
  EventTimelineEntry,
  UpdateEventNoteRequest,
  UpdateEventRecordRequest,
} from "@me-event/api-contracts";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import { EventRecordService } from "../src/modules/event-records/application/event-record.service";
import type {
  CreateEventRecordFromBookingInput,
  EventRecordMutationContext,
  EventRecordRepository,
} from "../src/modules/event-records/ports/event-record-repository";

class FakeEventRecordRepository implements EventRecordRepository {
  public readonly records = new Map<string, EventRecordDetailResponse>();
  public createCalls = 0;

  public async listForCustomerUser(
    userId: string,
  ): Promise<readonly EventRecordSummary[]> {
    return [...this.records.values()].filter(
      (event) => event.customerId === userId,
    );
  }

  public async listForBranch(): Promise<readonly EventRecordSummary[]> {
    return [...this.records.values()];
  }

  public async findById(
    eventRecordId: string,
  ): Promise<EventRecordDetailResponse | undefined> {
    return this.records.get(eventRecordId);
  }

  public async findForCustomerUser(
    userId: string,
    eventRecordId: string,
  ): Promise<EventRecordDetailResponse | undefined> {
    const event = this.records.get(eventRecordId);
    if (event === undefined || event.customerId !== userId) {
      return undefined;
    }
    return event;
  }

  public async findByBookingId(
    bookingId: string,
  ): Promise<EventRecordSummary | undefined> {
    return [...this.records.values()].find(
      (event) => event.bookingId === bookingId,
    );
  }

  public async createFromBooking(
    input: CreateEventRecordFromBookingInput,
  ): Promise<EventRecordSummary | undefined> {
    this.createCalls += 1;
    const existing = await this.findByBookingId(input.bookingId);
    if (existing !== undefined) {
      return existing;
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const bookingCreated: EventTimelineEntry = {
      id: randomUUID(),
      entryType: "booking_created",
      title: "Booking created",
      content: "Booking confirmed",
      customerVisible: true,
      occurredAt: now,
      actorUserId: input.actorUserId,
    };
    const eventCreated: EventTimelineEntry = {
      id: randomUUID(),
      entryType: "event_record_created",
      title: "Event record created",
      content: `Event ${input.eventNumber} created`,
      customerVisible: true,
      occurredAt: now,
      actorUserId: input.actorUserId,
    };
    const detail: EventRecordDetailResponse = {
      id,
      eventNumber: input.eventNumber,
      bookingId: input.bookingId,
      bookingNumber: "BK-TEST-001",
      quotationId: randomUUID(),
      leadId: randomUUID(),
      enquiryId: randomUUID(),
      customerId: "customer-1",
      customerDisplayName: "Test Customer",
      eventTypeName: "Wedding",
      eventName: "Wedding",
      eventDate: "2026-09-01",
      venueName: "Hyderabad Banquet",
      venueAddress: "Banjara Hills",
      guestCount: 200,
      budgetAmount: "150000.00",
      advancePaid: "45000.00",
      pendingAmount: "105000.00",
      status: "booking_confirmed",
      priority: "normal",
      createdAt: now,
      updatedAt: now,
      timeline: [eventCreated, bookingCreated],
      activities: [
        {
          id: randomUUID(),
          activityType: "created",
          content: "Event record created",
          customerVisible: true,
          occurredAt: now,
          actorUserId: input.actorUserId,
        },
      ],
      notes: [],
      documents: [],
      statusHistory: [
        {
          id: randomUUID(),
          toStatus: "booking_confirmed",
          reason: "Created from booking",
          occurredAt: now,
          actorUserId: input.actorUserId,
        },
      ],
      upcomingActions: ["Confirm requirements", "Assign manager"],
    };
    this.records.set(id, detail);
    return detail;
  }

  public async update(
    input: EventRecordMutationContext & {
      readonly patch: UpdateEventRecordRequest;
    },
  ): Promise<EventRecordDetailResponse | undefined> {
    const current = this.records.get(input.eventRecordId);
    if (current === undefined) return undefined;

    let next: EventRecordDetailResponse = {
      ...current,
      updatedAt: new Date().toISOString(),
    };
    if (typeof input.patch.venueName === "string") {
      next = { ...next, venueName: input.patch.venueName };
    } else if (input.patch.venueName === null) {
      const { venueName: _removed, ...rest } = next;
      next = rest;
    }
    if (typeof input.patch.venueAddress === "string") {
      next = { ...next, venueAddress: input.patch.venueAddress };
    } else if (input.patch.venueAddress === null) {
      const { venueAddress: _removed, ...rest } = next;
      next = rest;
    }

    this.records.set(input.eventRecordId, next);
    return next;
  }

  public async changeStatus(
    input: EventRecordMutationContext & {
      readonly body: ChangeEventStatusRequest;
    },
  ): Promise<EventRecordDetailResponse | undefined> {
    const current = this.records.get(input.eventRecordId);
    if (current === undefined) return undefined;
    if (current.status === input.body.status) return undefined;

    const now = new Date().toISOString();
    const content = `${current.status} → ${input.body.status}`;
    const timelineEntry: EventTimelineEntry = {
      id: randomUUID(),
      entryType: "status_changed",
      title: "Status updated",
      content,
      customerVisible: true,
      occurredAt: now,
      actorUserId: input.actorUserId,
    };
    const updated: EventRecordDetailResponse = {
      ...current,
      status: input.body.status,
      updatedAt: now,
      timeline: [timelineEntry, ...current.timeline],
      activities: [
        {
          id: randomUUID(),
          activityType: "status_change",
          content,
          customerVisible: true,
          occurredAt: now,
          actorUserId: input.actorUserId,
        },
        ...current.activities,
      ],
      statusHistory: [
        {
          id: randomUUID(),
          fromStatus: current.status,
          toStatus: input.body.status,
          occurredAt: now,
          actorUserId: input.actorUserId,
          ...(input.body.reason === undefined
            ? {}
            : { reason: input.body.reason }),
        },
        ...current.statusHistory,
      ],
    };
    this.records.set(input.eventRecordId, updated);
    return updated;
  }

  public async addNote(
    input: EventRecordMutationContext & {
      readonly body: AddEventNoteRequest;
    },
  ): Promise<EventNoteSummary | undefined> {
    const current = this.records.get(input.eventRecordId);
    if (current === undefined) return undefined;
    const now = new Date().toISOString();
    const note: EventNoteSummary = {
      id: randomUUID(),
      visibility: input.body.visibility,
      content: input.body.content,
      createdAt: now,
      updatedAt: now,
      version: 1,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    };
    const timelineEntry: EventTimelineEntry = {
      id: randomUUID(),
      entryType: "note_added",
      title: "Internal note added",
      content: note.content,
      customerVisible: input.body.visibility === "customer",
      occurredAt: now,
      actorUserId: input.actorUserId,
    };
    this.records.set(input.eventRecordId, {
      ...current,
      notes: [note, ...current.notes],
      timeline: [timelineEntry, ...current.timeline],
    });
    return note;
  }

  public async updateNote(
    input: EventRecordMutationContext & {
      readonly noteId: string;
      readonly body: UpdateEventNoteRequest;
    },
  ): Promise<EventNoteSummary | undefined> {
    const current = this.records.get(input.eventRecordId);
    if (current === undefined) return undefined;
    const existing = current.notes.find((note) => note.id === input.noteId);
    if (existing === undefined) return undefined;
    const updated: EventNoteSummary = {
      ...existing,
      content: input.body.content,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
      updatedByUserId: input.actorUserId,
    };
    this.records.set(input.eventRecordId, {
      ...current,
      notes: current.notes.map((note) =>
        note.id === input.noteId ? updated : note,
      ),
    });
    return updated;
  }

  public async addTimelineEntry(
    input: EventRecordMutationContext & {
      readonly body: AddEventTimelineEntryRequest;
    },
  ): Promise<EventTimelineEntry | undefined> {
    const current = this.records.get(input.eventRecordId);
    if (current === undefined) return undefined;
    const entry: EventTimelineEntry = {
      id: randomUUID(),
      entryType: input.body.entryType,
      title: input.body.title,
      customerVisible: input.body.customerVisible,
      occurredAt: new Date().toISOString(),
      actorUserId: input.actorUserId,
      ...(input.body.content === undefined
        ? {}
        : { content: input.body.content }),
    };
    const activity: EventActivitySummary = {
      id: randomUUID(),
      activityType: "updated",
      content: entry.title,
      customerVisible: entry.customerVisible,
      occurredAt: entry.occurredAt,
      actorUserId: input.actorUserId,
    };
    this.records.set(input.eventRecordId, {
      ...current,
      timeline: [entry, ...current.timeline],
      activities: [activity, ...current.activities],
    });
    return entry;
  }

  public async getTimeline(
    eventRecordId: string,
    customerVisibleOnly: boolean,
  ): Promise<readonly EventTimelineEntry[]> {
    const event = this.records.get(eventRecordId);
    if (event === undefined) return [];
    return customerVisibleOnly
      ? event.timeline.filter((entry) => entry.customerVisible)
      : event.timeline;
  }

  public async getActivities(
    eventRecordId: string,
    customerVisibleOnly: boolean,
  ): Promise<readonly EventActivitySummary[]> {
    const event = this.records.get(eventRecordId);
    if (event === undefined) return [];
    return customerVisibleOnly
      ? event.activities.filter((activity) => activity.customerVisible)
      : event.activities;
  }
}

const principal: AuthenticatedPrincipal = {
  userId: "crm-user-1",
  sessionId: "session-1",
  activeRole: "employee",
  roleAssignments: [{ role: "employee", active: true }],
};

describe("Event Record Foundation", () => {
  let repo: FakeEventRecordRepository;
  let service: EventRecordService;

  beforeEach(() => {
    repo = new FakeEventRecordRepository();
    service = new EventRecordService(repo);
  });

  it("creates an event record from a confirmed booking with seed timeline", async () => {
    const bookingId = randomUUID();
    const created = await service.createFromBooking(principal, { bookingId });

    expect(created.bookingId).toBe(bookingId);
    expect(created.status).toBe("booking_confirmed");
    expect(
      created.timeline.some((e) => e.entryType === "booking_created"),
    ).toBe(true);
    expect(
      created.timeline.some((e) => e.entryType === "event_record_created"),
    ).toBe(true);
    expect(repo.createCalls).toBe(1);
  });

  it("is idempotent when creating from the same booking", async () => {
    const bookingId = randomUUID();
    const first = await service.createFromBooking(principal, { bookingId });
    const second = await service.createFromBooking(principal, { bookingId });

    expect(second.id).toBe(first.id);
    expect(repo.records.size).toBe(1);
  });

  it("updates status and appends a status timeline entry", async () => {
    const created = await service.createFromBooking(principal, {
      bookingId: randomUUID(),
    });
    const updated = await service.changeStatus(principal, created.id, {
      status: "planning",
      reason: "Kickoff started",
    });

    expect(updated.status).toBe("planning");
    expect(updated.timeline[0]?.entryType).toBe("status_changed");
  });

  it("adds an internal note and timeline entry", async () => {
    const created = await service.createFromBooking(principal, {
      bookingId: randomUUID(),
    });
    const note = await service.addNote(principal, created.id, {
      content: "Confirm florist availability",
      visibility: "internal",
    });
    const detail = await service.getCrm(created.id);

    expect(note.content).toBe("Confirm florist availability");
    expect(detail.notes[0]?.id).toBe(note.id);
    expect(detail.timeline.some((e) => e.entryType === "note_added")).toBe(
      true,
    );
  });

  it("adds an immutable timeline milestone", async () => {
    const created = await service.createFromBooking(principal, {
      bookingId: randomUUID(),
    });
    const entry = await service.addTimelineEntry(principal, created.id, {
      title: "Site survey completed",
      content: "Venue walkthrough done",
      entryType: "milestone",
      customerVisible: true,
    });
    const timeline = await service.timelineCrm(created.id);

    expect(entry.entryType).toBe("milestone");
    expect(timeline.timeline[0]?.title).toBe("Site survey completed");
  });
});
