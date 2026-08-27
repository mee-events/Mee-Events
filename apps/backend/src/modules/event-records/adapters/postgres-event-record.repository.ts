import { Inject, Injectable } from "@nestjs/common";
import type {
  AddEventNoteRequest,
  AddEventTimelineEntryRequest,
  ChangeEventStatusRequest,
  EventActivitySummary,
  EventDocumentSummary,
  EventNoteSummary,
  EventNoteVisibility,
  EventRecordDetailResponse,
  EventRecordPriority,
  EventRecordStatus,
  EventRecordSummary,
  EventStatusHistoryEntry,
  EventTimelineEntry,
  UpdateEventNoteRequest,
  UpdateEventRecordRequest,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  appendEventActivity as appendActivity,
  appendEventTimeline as appendTimeline,
  writeAuditOutbox,
} from "../../../common/pattern-b/append-event-pattern-b";
import type {
  CreateEventRecordFromBookingInput,
  EventRecordMutationContext,
  EventRecordRepository,
} from "../ports/event-record-repository";

interface EventRow {
  readonly id: string;
  readonly event_number: string;
  readonly booking_id: string;
  readonly booking_number: string | null;
  readonly quotation_id: string;
  readonly lead_id: string;
  readonly enquiry_id: string;
  readonly customer_id: string;
  readonly customer_display_name: string | null;
  readonly event_type_name: string;
  readonly event_name: string;
  readonly event_date: Date | string | null;
  readonly start_time: string | null;
  readonly end_time: string | null;
  readonly venue_name: string | null;
  readonly venue_address: string | null;
  readonly maps_location_placeholder: string | null;
  readonly guest_count: number | null;
  readonly budget_amount: string;
  readonly advance_paid: string;
  readonly pending_amount: string;
  readonly status: EventRecordStatus;
  readonly priority: EventRecordPriority;
  readonly assigned_manager_user_id: string | null;
  readonly notes: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly version: number;
}

interface TimelineRow {
  readonly id: string;
  readonly entry_type: string;
  readonly title: string;
  readonly content: string | null;
  readonly customer_visible: boolean;
  readonly actor_user_id: string | null;
  readonly occurred_at: Date;
}

interface ActivityRow {
  readonly id: string;
  readonly activity_type: string;
  readonly content: string | null;
  readonly customer_visible: boolean;
  readonly actor_user_id: string | null;
  readonly occurred_at: Date;
}

interface NoteRow {
  readonly id: string;
  readonly visibility: EventNoteVisibility;
  readonly content: string;
  readonly created_by_user_id: string | null;
  readonly updated_by_user_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly version: number;
}

interface DocumentRow {
  readonly id: string;
  readonly doc_type: string;
  readonly status: string;
  readonly visibility: EventNoteVisibility;
  readonly storage_key: string | null;
  readonly file_name: string | null;
  readonly created_at: Date;
}

interface StatusHistoryRow {
  readonly id: string;
  readonly from_status: string | null;
  readonly to_status: string;
  readonly reason: string | null;
  readonly actor_user_id: string | null;
  readonly occurred_at: Date;
}

const SELECT_EVENT = `
  SELECT
    e.id,
    e.event_number,
    e.booking_id,
    b.booking_number,
    e.quotation_id,
    e.lead_id,
    e.enquiry_id,
    e.customer_id,
    c.display_name AS customer_display_name,
    e.event_type_name,
    e.event_name,
    e.event_date,
    e.start_time::text AS start_time,
    e.end_time::text AS end_time,
    e.venue_name,
    e.venue_address,
    e.maps_location_placeholder,
    e.guest_count,
    e.budget_amount,
    e.advance_paid,
    e.pending_amount,
    e.status,
    e.priority,
    e.assigned_manager_user_id,
    e.notes,
    e.created_at,
    e.updated_at,
    e.version
  FROM event_records e
  JOIN bookings b ON b.id = e.booking_id
  JOIN customers c ON c.id = e.customer_id`;

@Injectable()
export class PostgresEventRecordRepository implements EventRecordRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listForCustomerUser(
    userId: string,
  ): Promise<readonly EventRecordSummary[]> {
    const result = await this.pool.query<EventRow>(
      `${SELECT_EVENT}
       WHERE c.user_id = $1
       ORDER BY e.created_at DESC`,
      [userId],
    );
    return result.rows.map(toSummary);
  }

  public async listForBranch(
    branchId: string,
  ): Promise<readonly EventRecordSummary[]> {
    const result = await this.pool.query<EventRow>(
      `${SELECT_EVENT}
       WHERE e.branch_id = $1
       ORDER BY e.created_at DESC`,
      [branchId],
    );
    return result.rows.map(toSummary);
  }

  public async findById(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventRecordDetailResponse | undefined> {
    return this.loadDetail(eventRecordId, { branchId });
  }

  public async findForCustomerUser(
    userId: string,
    eventRecordId: string,
  ): Promise<EventRecordDetailResponse | undefined> {
    return this.loadDetail(eventRecordId, { customerUserId: userId });
  }

  public async findByBookingId(
    bookingId: string,
    branchId: string,
  ): Promise<EventRecordSummary | undefined> {
    const result = await this.pool.query<EventRow>(
      `${SELECT_EVENT} WHERE e.booking_id = $1 AND e.branch_id = $2`,
      [bookingId, branchId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toSummary(row);
  }

  public async createFromBooking(
    input: CreateEventRecordFromBookingInput,
  ): Promise<EventRecordSummary | undefined> {
    const existing = await this.findByBookingId(
      input.bookingId,
      input.branchId,
    );
    if (existing !== undefined) {
      return existing;
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const booking = await client.query<{
        id: string;
        branch_id: string;
        booking_number: string;
        enquiry_id: string;
        lead_id: string;
        quotation_id: string;
        revision_id: string;
        customer_id: string;
        final_amount: string;
        advance_paid: string;
        event_type_id: string;
        event_type_name: string;
        event_date: Date | string | null;
        location: string | null;
        guest_count: number | null;
      }>(
        `SELECT
           b.id, b.branch_id, b.booking_number, b.enquiry_id, b.lead_id,
           b.quotation_id, b.revision_id, b.customer_id,
           b.final_amount, b.advance_paid,
           en.event_type_id, et.display_name AS event_type_name,
           en.event_date, en.location, en.guest_count
         FROM bookings b
         JOIN enquiries en ON en.id = b.enquiry_id
         JOIN event_types et ON et.id = en.event_type_id
         WHERE b.id = $1 AND b.branch_id = $2
         FOR UPDATE OF b`,
        [input.bookingId, input.branchId],
      );
      const source = booking.rows[0];
      if (source === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const pending = (
        Number(source.final_amount) - Number(source.advance_paid)
      ).toFixed(2);

      const inserted = await client.query<{
        id: string;
        event_number: string;
        version: number;
      }>(
        `INSERT INTO event_records (
           branch_id, event_number, booking_id, enquiry_id, lead_id,
           quotation_id, revision_id, customer_id, event_type_id,
           event_type_name, event_name, event_date, venue_address,
           guest_count, budget_amount, advance_paid, pending_amount,
           status, priority, created_by_user_id, updated_by_user_id
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           $10, $11, $12, $13, $14, $15, $16, $17,
           'booking_confirmed', 'normal', $18, $18
         )
         RETURNING id, event_number, version`,
        [
          source.branch_id,
          input.eventNumber,
          source.id,
          source.enquiry_id,
          source.lead_id,
          source.quotation_id,
          source.revision_id,
          source.customer_id,
          source.event_type_id,
          source.event_type_name,
          source.event_type_name,
          source.event_date,
          source.location,
          source.guest_count,
          source.final_amount,
          source.advance_paid,
          pending,
          input.actorUserId,
        ],
      );
      const event = inserted.rows[0];
      if (event === undefined) {
        throw new Error("INSERT INTO event_records returned no row");
      }

      await seedEventCreatedArtifacts(client, {
        eventRecordId: event.id,
        eventNumber: event.event_number,
        bookingNumber: source.booking_number,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        requestId: input.requestId,
        branchId: source.branch_id,
        version: event.version,
        bookingId: source.id,
      });

      await client.query("COMMIT");
      return await this.findByBookingId(input.bookingId, input.branchId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async update(
    input: EventRecordMutationContext & {
      readonly patch: UpdateEventRecordRequest;
    },
  ): Promise<EventRecordDetailResponse | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (current === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const updated = await client.query<{ id: string; version: number }>(
        `UPDATE event_records SET
           event_name = COALESCE($2, event_name),
           event_date = CASE WHEN $3::boolean THEN $4::date ELSE event_date END,
           start_time = CASE WHEN $5::boolean THEN $6::time ELSE start_time END,
           end_time = CASE WHEN $7::boolean THEN $8::time ELSE end_time END,
           venue_name = CASE WHEN $9::boolean THEN $10 ELSE venue_name END,
           venue_address = CASE WHEN $11::boolean THEN $12 ELSE venue_address END,
           maps_location_placeholder = CASE WHEN $13::boolean THEN $14 ELSE maps_location_placeholder END,
           guest_count = CASE WHEN $15::boolean THEN $16::integer ELSE guest_count END,
           priority = COALESCE($17, priority),
           notes = CASE WHEN $18::boolean THEN $19 ELSE notes END,
           updated_by_user_id = $20,
           version = version + 1
         WHERE id = $1
         RETURNING id, version`,
        [
          input.eventRecordId,
          input.patch.eventName ?? null,
          input.patch.eventDate !== undefined,
          input.patch.eventDate ?? null,
          input.patch.startTime !== undefined,
          input.patch.startTime ?? null,
          input.patch.endTime !== undefined,
          input.patch.endTime ?? null,
          input.patch.venueName !== undefined,
          input.patch.venueName ?? null,
          input.patch.venueAddress !== undefined,
          input.patch.venueAddress ?? null,
          input.patch.mapsLocationPlaceholder !== undefined,
          input.patch.mapsLocationPlaceholder ?? null,
          input.patch.guestCount !== undefined,
          input.patch.guestCount ?? null,
          input.patch.priority ?? null,
          input.patch.notes !== undefined,
          input.patch.notes ?? null,
          input.actorUserId,
        ],
      );
      const row = updated.rows[0];
      if (row === undefined) {
        throw new Error("Failed to update event record");
      }

      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "details_updated",
        title: "Event details updated",
        content: "Operational details were updated",
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "updated",
        content: "Event details updated",
        customerVisible: true,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: current.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "event_record.updated",
        version: row.version,
        payload: { eventRecordId: input.eventRecordId },
        outboxTopic: "event_record.updated",
      });

      await client.query("COMMIT");
      return await this.findById(input.eventRecordId, input.branchId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async changeStatus(
    input: EventRecordMutationContext & {
      readonly body: ChangeEventStatusRequest;
    },
  ): Promise<EventRecordDetailResponse | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (current === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      if (current.status === input.body.status) {
        await client.query("ROLLBACK");
        return await this.findById(input.eventRecordId, input.branchId);
      }
      if (!isAllowedTransition(current.status, input.body.status)) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const updated = await client.query<{ id: string; version: number }>(
        `UPDATE event_records
         SET status = $2,
             updated_by_user_id = $3,
             version = version + 1
         WHERE id = $1
         RETURNING id, version`,
        [input.eventRecordId, input.body.status, input.actorUserId],
      );
      const row = updated.rows[0];
      if (row === undefined) {
        throw new Error("Failed to change event status");
      }

      await client.query(
        `INSERT INTO event_status_history (
           event_record_id, from_status, to_status, actor_user_id, reason
         ) VALUES ($1, $2, $3, $4, $5)`,
        [
          input.eventRecordId,
          current.status,
          input.body.status,
          input.actorUserId,
          input.body.reason ?? null,
        ],
      );

      const title = `Status changed to ${input.body.status.replaceAll("_", " ")}`;
      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType:
          input.body.status === "completed"
            ? "event_completed"
            : "status_changed",
        title,
        content: input.body.reason ?? title,
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "status_change",
        content: title,
        customerVisible: true,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: current.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "event_record.status_changed",
        version: row.version,
        payload: {
          eventRecordId: input.eventRecordId,
          fromStatus: current.status,
          toStatus: input.body.status,
        },
        outboxTopic: "event_record.status_changed",
      });

      await client.query("COMMIT");
      return await this.findById(input.eventRecordId, input.branchId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async addNote(
    input: EventRecordMutationContext & {
      readonly body: AddEventNoteRequest;
    },
  ): Promise<EventNoteSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (current === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const inserted = await client.query<NoteRow>(
        `INSERT INTO event_notes (
           event_record_id, visibility, content,
           created_by_user_id, updated_by_user_id
         )
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id, visibility, content, created_by_user_id,
                   updated_by_user_id, created_at, updated_at, version`,
        [
          input.eventRecordId,
          input.body.visibility,
          input.body.content,
          input.actorUserId,
        ],
      );
      const note = inserted.rows[0];
      if (note === undefined) {
        throw new Error("Failed to add event note");
      }

      await client.query(
        `INSERT INTO event_note_revisions (note_id, content, revised_by_user_id)
         VALUES ($1, $2, $3)`,
        [note.id, note.content, input.actorUserId],
      );

      const customerVisible = input.body.visibility === "customer";
      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "note_added",
        title: customerVisible
          ? "Note shared with customer"
          : "Internal note added",
        content: note.content,
        customerVisible,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "note",
        content: note.content,
        customerVisible,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: current.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "event_record.note_added",
        version: current.version,
        payload: {
          eventRecordId: input.eventRecordId,
          noteId: note.id,
          visibility: note.visibility,
        },
        outboxTopic: "event_record.note_added",
      });

      await client.query("COMMIT");
      return toNote(note);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateNote(
    input: EventRecordMutationContext & {
      readonly noteId: string;
      readonly body: UpdateEventNoteRequest;
    },
  ): Promise<EventNoteSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (current === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const updated = await client.query<NoteRow>(
        `UPDATE event_notes
         SET content = $3,
             updated_by_user_id = $4,
             version = version + 1
         WHERE id = $1 AND event_record_id = $2
         RETURNING id, visibility, content, created_by_user_id,
                   updated_by_user_id, created_at, updated_at, version`,
        [
          input.noteId,
          input.eventRecordId,
          input.body.content,
          input.actorUserId,
        ],
      );
      const note = updated.rows[0];
      if (note === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `INSERT INTO event_note_revisions (note_id, content, revised_by_user_id)
         VALUES ($1, $2, $3)`,
        [note.id, note.content, input.actorUserId],
      );

      const customerVisible = note.visibility === "customer";
      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "note_updated",
        title: "Note updated",
        content: note.content,
        customerVisible,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "note",
        content: `Note updated: ${note.content}`,
        customerVisible,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: current.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "event_record.note_updated",
        version: current.version,
        payload: {
          eventRecordId: input.eventRecordId,
          noteId: note.id,
        },
        outboxTopic: "event_record.note_updated",
      });

      await client.query("COMMIT");
      return toNote(note);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async addTimelineEntry(
    input: EventRecordMutationContext & {
      readonly body: AddEventTimelineEntryRequest;
    },
  ): Promise<EventTimelineEntry | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (current === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const content = input.body.content ?? "";
      const inserted = await client.query<TimelineRow>(
        `INSERT INTO event_timelines (
           event_record_id, actor_user_id, entry_type, title, content, customer_visible
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, entry_type, title, content, customer_visible,
                   actor_user_id, occurred_at`,
        [
          input.eventRecordId,
          input.actorUserId,
          input.body.entryType,
          input.body.title,
          content,
          input.body.customerVisible,
        ],
      );
      const row = inserted.rows[0];
      if (row === undefined) {
        throw new Error("Failed to add event timeline entry");
      }

      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "updated",
        content: input.body.title,
        customerVisible: input.body.customerVisible,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: current.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "event_record.timeline_added",
        version: current.version,
        payload: {
          eventRecordId: input.eventRecordId,
          timelineEntryId: row.id,
          entryType: row.entry_type,
          title: row.title,
        },
        outboxTopic: "event_record.timeline_added",
      });

      await client.query("COMMIT");
      return toTimeline(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async getTimeline(
    eventRecordId: string,
    customerVisibleOnly: boolean,
  ): Promise<readonly EventTimelineEntry[]> {
    const result = await this.pool.query<TimelineRow>(
      `SELECT id, entry_type, title, content, customer_visible,
              actor_user_id, occurred_at
       FROM event_timelines
       WHERE event_record_id = $1
         AND ($2::boolean = false OR customer_visible = true)
       ORDER BY occurred_at DESC`,
      [eventRecordId, customerVisibleOnly],
    );
    return result.rows.map(toTimeline);
  }

  public async getActivities(
    eventRecordId: string,
    customerVisibleOnly: boolean,
  ): Promise<readonly EventActivitySummary[]> {
    const result = await this.pool.query<ActivityRow>(
      `SELECT id, activity_type, content, customer_visible,
              actor_user_id, occurred_at
       FROM event_activities
       WHERE event_record_id = $1
         AND ($2::boolean = false OR customer_visible = true)
       ORDER BY occurred_at DESC`,
      [eventRecordId, customerVisibleOnly],
    );
    return result.rows.map(toActivity);
  }

  private async loadDetail(
    eventRecordId: string,
    scope: { readonly customerUserId: string } | { readonly branchId: string },
  ): Promise<EventRecordDetailResponse | undefined> {
    const params: unknown[] = [eventRecordId];
    let sql: string;
    if ("customerUserId" in scope) {
      params.push(scope.customerUserId);
      sql = `${SELECT_EVENT} WHERE e.id = $1 AND c.user_id = $2`;
    } else {
      params.push(scope.branchId);
      sql = `${SELECT_EVENT} WHERE e.id = $1 AND e.branch_id = $2`;
    }

    const result = await this.pool.query<EventRow>(sql, params);
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }

    const customerVisibleOnly = "customerUserId" in scope;
    const [timeline, activities, notes, documents, statusHistory] =
      await Promise.all([
        this.getTimeline(eventRecordId, customerVisibleOnly),
        this.getActivities(eventRecordId, customerVisibleOnly),
        this.pool.query<NoteRow>(
          `SELECT id, visibility, content, created_by_user_id,
                  updated_by_user_id, created_at, updated_at, version
           FROM event_notes
           WHERE event_record_id = $1
             AND ($2::boolean = false OR visibility = 'customer')
           ORDER BY created_at DESC`,
          [eventRecordId, customerVisibleOnly],
        ),
        this.pool.query<DocumentRow>(
          `SELECT id, doc_type, status, visibility, storage_key, file_name, created_at
           FROM event_documents
           WHERE event_record_id = $1
             AND ($2::boolean = false OR visibility = 'customer')
           ORDER BY created_at DESC`,
          [eventRecordId, customerVisibleOnly],
        ),
        this.pool.query<StatusHistoryRow>(
          `SELECT id, from_status, to_status, reason, actor_user_id, occurred_at
           FROM event_status_history
           WHERE event_record_id = $1
           ORDER BY occurred_at DESC`,
          [eventRecordId],
        ),
      ]);

    return {
      ...toSummary(row),
      timeline,
      activities,
      notes: notes.rows.map(toNote),
      documents: documents.rows.map(toDocument),
      statusHistory: statusHistory.rows.map(toStatusHistory),
      upcomingActions: computeUpcomingActions(row.status),
    };
  }
}

async function lockEvent(
  client: PoolClient,
  eventRecordId: string,
  branchId: string,
): Promise<
  { branch_id: string; status: EventRecordStatus; version: number } | undefined
> {
  const result = await client.query<{
    branch_id: string;
    status: EventRecordStatus;
    version: number;
  }>(
    `SELECT branch_id, status, version
     FROM event_records
     WHERE id = $1 AND branch_id = $2
     FOR UPDATE`,
    [eventRecordId, branchId],
  );
  return result.rows[0];
}

async function seedEventCreatedArtifacts(
  client: PoolClient,
  input: {
    readonly eventRecordId: string;
    readonly eventNumber: string;
    readonly bookingNumber: string;
    readonly actorUserId: string;
    readonly actorRole: string;
    readonly requestId: string;
    readonly branchId: string;
    readonly version: number;
    readonly bookingId: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO event_status_history (
       event_record_id, from_status, to_status, actor_user_id, reason
     ) VALUES ($1, NULL, 'booking_confirmed', $2, $3)`,
    [
      input.eventRecordId,
      input.actorUserId,
      `Created from booking ${input.bookingNumber}`,
    ],
  );

  await appendTimeline(client, {
    eventRecordId: input.eventRecordId,
    actorUserId: input.actorUserId,
    entryType: "booking_created",
    title: "Booking created",
    content: `Booking ${input.bookingNumber} confirmed`,
    customerVisible: true,
  });
  await appendTimeline(client, {
    eventRecordId: input.eventRecordId,
    actorUserId: input.actorUserId,
    entryType: "event_record_created",
    title: "Event record created",
    content: `Event ${input.eventNumber} is now the operations source of truth`,
    customerVisible: true,
  });
  await appendActivity(client, {
    eventRecordId: input.eventRecordId,
    actorUserId: input.actorUserId,
    activityType: "created",
    content: `Event record ${input.eventNumber} created from booking ${input.bookingNumber}`,
    customerVisible: true,
  });
  await writeAuditOutbox(client, {
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    branchId: input.branchId,
    entityId: input.eventRecordId,
    entityType: "event_record",
    action: "event_record.created",
    version: input.version,
    payload: {
      eventRecordId: input.eventRecordId,
      eventNumber: input.eventNumber,
      bookingId: input.bookingId,
      bookingNumber: input.bookingNumber,
    },
    outboxTopic: "event_record.created",
  });
}

function isAllowedTransition(
  from: EventRecordStatus,
  to: EventRecordStatus,
): boolean {
  if (to === "cancelled") {
    return from !== "closed" && from !== "cancelled";
  }
  if (from === "cancelled" || from === "closed") {
    return false;
  }
  const order: readonly EventRecordStatus[] = [
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
  ];
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) {
    return false;
  }
  // Allow forward moves and limited skip within the operating lifecycle.
  return toIndex >= fromIndex;
}

function computeUpcomingActions(status: EventRecordStatus): readonly string[] {
  switch (status) {
    case "booking_confirmed":
      return ["Assign manager", "Confirm venue details", "Share kickoff note"];
    case "manager_assigned":
      return ["Plan requirements", "Prepare vendor shortlist (future)"];
    case "planning":
    case "requirements_confirmed":
      return ["Confirm quotation snapshot", "Schedule preparation"];
    case "vendor_assigned":
    case "worker_assigned":
      return ["Review assignments (future modules)", "Enter preparation"];
    case "preparation":
      return ["Mark ready", "Confirm on-site checklist"];
    case "ready":
      return ["Start event day tracking"];
    case "event_running":
      return ["Mark completed", "Capture completion notes"];
    case "completed":
      return ["Open settlement (future)", "Collect feedback (future)"];
    case "settlement_pending":
      return ["Close event after settlement (future)"];
    default:
      return [];
  }
}

function formatDate(value: Date | string | null): string | undefined {
  if (value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function formatTime(value: string | null): string | undefined {
  if (value === null) {
    return undefined;
  }
  return value.length >= 8 ? value.slice(0, 8) : value;
}

function toSummary(row: EventRow): EventRecordSummary {
  const eventDate = formatDate(row.event_date);
  const startTime = formatTime(row.start_time);
  const endTime = formatTime(row.end_time);
  return {
    id: row.id,
    eventNumber: row.event_number,
    bookingId: row.booking_id,
    quotationId: row.quotation_id,
    leadId: row.lead_id,
    enquiryId: row.enquiry_id,
    customerId: row.customer_id,
    eventTypeName: row.event_type_name,
    eventName: row.event_name,
    budgetAmount: row.budget_amount,
    advancePaid: row.advance_paid,
    pendingAmount: row.pending_amount,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.booking_number === null
      ? {}
      : { bookingNumber: row.booking_number }),
    ...(row.customer_display_name === null
      ? {}
      : { customerDisplayName: row.customer_display_name }),
    ...(eventDate === undefined ? {} : { eventDate }),
    ...(startTime === undefined ? {} : { startTime }),
    ...(endTime === undefined ? {} : { endTime }),
    ...(row.venue_name === null ? {} : { venueName: row.venue_name }),
    ...(row.venue_address === null ? {} : { venueAddress: row.venue_address }),
    ...(row.maps_location_placeholder === null
      ? {}
      : { mapsLocationPlaceholder: row.maps_location_placeholder }),
    ...(row.guest_count === null ? {} : { guestCount: row.guest_count }),
    ...(row.assigned_manager_user_id === null
      ? {}
      : { assignedManagerUserId: row.assigned_manager_user_id }),
    ...(row.notes === null ? {} : { generalNotes: row.notes }),
  };
}

function toTimeline(row: TimelineRow): EventTimelineEntry {
  return {
    id: row.id,
    entryType: row.entry_type as EventTimelineEntry["entryType"],
    title: row.title,
    customerVisible: row.customer_visible,
    occurredAt: row.occurred_at.toISOString(),
    ...(row.content === null ? {} : { content: row.content }),
    ...(row.actor_user_id === null ? {} : { actorUserId: row.actor_user_id }),
  };
}

function toActivity(row: ActivityRow): EventActivitySummary {
  return {
    id: row.id,
    activityType: row.activity_type as EventActivitySummary["activityType"],
    customerVisible: row.customer_visible,
    occurredAt: row.occurred_at.toISOString(),
    ...(row.content === null ? {} : { content: row.content }),
    ...(row.actor_user_id === null ? {} : { actorUserId: row.actor_user_id }),
  };
}

function toNote(row: NoteRow): EventNoteSummary {
  return {
    id: row.id,
    visibility: row.visibility,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
    ...(row.created_by_user_id === null
      ? {}
      : { createdByUserId: row.created_by_user_id }),
    ...(row.updated_by_user_id === null
      ? {}
      : { updatedByUserId: row.updated_by_user_id }),
  };
}

function toDocument(row: DocumentRow): EventDocumentSummary {
  return {
    id: row.id,
    docType: row.doc_type,
    status: row.status,
    visibility: row.visibility,
    createdAt: row.created_at.toISOString(),
    ...(row.storage_key === null ? {} : { storageKey: row.storage_key }),
    ...(row.file_name === null ? {} : { fileName: row.file_name }),
  };
}

function toStatusHistory(row: StatusHistoryRow): EventStatusHistoryEntry {
  const base: EventStatusHistoryEntry = {
    id: row.id,
    toStatus: row.to_status as EventRecordStatus,
    occurredAt: row.occurred_at.toISOString(),
  };
  return {
    ...base,
    ...(row.from_status === null
      ? {}
      : { fromStatus: row.from_status as EventRecordStatus }),
    ...(row.reason === null ? {} : { reason: row.reason }),
    ...(row.actor_user_id === null ? {} : { actorUserId: row.actor_user_id }),
  };
}

/**
 * Shared helper used by the payment confirm transaction to create the
 * Event Record in the same atomic unit of work as the booking.
 */
export async function insertEventRecordInTransaction(
  client: PoolClient,
  input: {
    readonly branchId: string;
    readonly eventNumber: string;
    readonly bookingId: string;
    readonly enquiryId: string;
    readonly leadId: string;
    readonly quotationId: string;
    readonly revisionId: string;
    readonly customerId: string;
    readonly eventTypeId: string;
    readonly eventTypeName: string;
    readonly eventName: string;
    readonly eventDate: Date | string | null;
    readonly venueAddress: string | null;
    readonly guestCount: number | null;
    readonly budgetAmount: string;
    readonly advancePaid: string;
    readonly bookingNumber: string;
    readonly actorUserId: string;
    readonly actorRole: string;
    readonly requestId: string;
  },
): Promise<{
  readonly id: string;
  readonly eventNumber: string;
  readonly version: number;
  readonly status: EventRecordStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly pendingAmount: string;
}> {
  const pending = (
    Number(input.budgetAmount) - Number(input.advancePaid)
  ).toFixed(2);

  const inserted = await client.query<{
    id: string;
    event_number: string;
    status: EventRecordStatus;
    pending_amount: string;
    created_at: Date;
    updated_at: Date;
    version: number;
  }>(
    `INSERT INTO event_records (
       branch_id, event_number, booking_id, enquiry_id, lead_id,
       quotation_id, revision_id, customer_id, event_type_id,
       event_type_name, event_name, event_date, venue_address,
       guest_count, budget_amount, advance_paid, pending_amount,
       status, priority, created_by_user_id, updated_by_user_id
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14, $15, $16, $17,
       'booking_confirmed', 'normal', $18, $18
     )
     RETURNING id, event_number, status, pending_amount, created_at, updated_at, version`,
    [
      input.branchId,
      input.eventNumber,
      input.bookingId,
      input.enquiryId,
      input.leadId,
      input.quotationId,
      input.revisionId,
      input.customerId,
      input.eventTypeId,
      input.eventTypeName,
      input.eventName,
      input.eventDate,
      input.venueAddress,
      input.guestCount,
      input.budgetAmount,
      input.advancePaid,
      pending,
      input.actorUserId,
    ],
  );
  const event = inserted.rows[0];
  if (event === undefined) {
    throw new Error("INSERT INTO event_records returned no row");
  }

  await seedEventCreatedArtifacts(client, {
    eventRecordId: event.id,
    eventNumber: event.event_number,
    bookingNumber: input.bookingNumber,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    branchId: input.branchId,
    version: event.version,
    bookingId: input.bookingId,
  });

  return {
    id: event.id,
    eventNumber: event.event_number,
    version: event.version,
    status: event.status,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    pendingAmount: event.pending_amount,
  };
}
