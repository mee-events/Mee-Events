import { Inject, Injectable } from "@nestjs/common";
import type {
  BookingActivitySummary,
  BookingDetailResponse,
  BookingStatus,
  BookingSummary,
} from "@me-event/api-contracts";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type { BookingRepository } from "../ports/booking-repository";

interface BookingRow {
  readonly id: string;
  readonly booking_number: string;
  readonly quotation_id: string;
  readonly quotation_reference_code: string | null;
  readonly lead_id: string;
  readonly enquiry_id: string;
  readonly status: BookingStatus;
  readonly final_amount: string;
  readonly advance_paid: string;
  readonly confirmed_at: Date | null;
  readonly created_at: Date;
  readonly event_record_id: string | null;
  readonly event_number: string | null;
}

interface ActivityRow {
  readonly id: string;
  readonly activity_type: string;
  readonly content: string | null;
  readonly actor_user_id: string | null;
  readonly occurred_at: Date;
}

const SELECT_BOOKING = `
  SELECT
    b.id,
    b.booking_number,
    b.quotation_id,
    q.reference_code AS quotation_reference_code,
    b.lead_id,
    b.enquiry_id,
    b.status,
    b.final_amount,
    b.advance_paid,
    b.confirmed_at,
    b.created_at,
    er.id AS event_record_id,
    er.event_number
  FROM bookings b
  JOIN quotations q ON q.id = b.quotation_id
  LEFT JOIN event_records er ON er.booking_id = b.id`;

@Injectable()
export class PostgresBookingRepository implements BookingRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listForCustomerUser(
    userId: string,
  ): Promise<readonly BookingSummary[]> {
    const result = await this.pool.query<BookingRow>(
      `${SELECT_BOOKING}
       JOIN customers c ON c.id = b.customer_id
       WHERE c.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId],
    );
    return result.rows.map(toSummary);
  }

  public async listForBranch(
    branchId: string,
  ): Promise<readonly BookingSummary[]> {
    const result = await this.pool.query<BookingRow>(
      `${SELECT_BOOKING}
       WHERE b.branch_id = $1
       ORDER BY b.created_at DESC`,
      [branchId],
    );
    return result.rows.map(toSummary);
  }

  public async findById(
    bookingId: string,
  ): Promise<BookingDetailResponse | undefined> {
    return this.loadDetail(bookingId, undefined);
  }

  public async findForCustomerUser(
    userId: string,
    bookingId: string,
  ): Promise<BookingDetailResponse | undefined> {
    return this.loadDetail(bookingId, userId);
  }

  private async loadDetail(
    bookingId: string,
    customerUserId: string | undefined,
  ): Promise<BookingDetailResponse | undefined> {
    const params: unknown[] = [bookingId];
    let where = "WHERE b.id = $1";
    if (customerUserId !== undefined) {
      params.push(customerUserId);
      where = `${SELECT_BOOKING}
       JOIN customers c ON c.id = b.customer_id
       WHERE b.id = $1 AND c.user_id = $2`;
    } else {
      where = `${SELECT_BOOKING} WHERE b.id = $1`;
    }

    const result = await this.pool.query<BookingRow>(where, params);
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }

    const activities = await this.pool.query<ActivityRow>(
      `SELECT id, activity_type, content, actor_user_id, occurred_at
       FROM booking_activities
       WHERE booking_id = $1
       ORDER BY occurred_at DESC`,
      [bookingId],
    );

    return {
      ...toSummary(row),
      activities: activities.rows.map(toActivity),
    };
  }
}

function toSummary(row: BookingRow): BookingSummary {
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    quotationId: row.quotation_id,
    leadId: row.lead_id,
    enquiryId: row.enquiry_id,
    status: row.status,
    finalAmount: row.final_amount,
    advancePaid: row.advance_paid,
    createdAt: row.created_at.toISOString(),
    ...(row.quotation_reference_code === null
      ? {}
      : { quotationReferenceCode: row.quotation_reference_code }),
    ...(row.confirmed_at === null
      ? {}
      : { confirmedAt: row.confirmed_at.toISOString() }),
    ...(row.event_record_id === null
      ? {}
      : { eventRecordId: row.event_record_id }),
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
  };
}

function toActivity(row: ActivityRow): BookingActivitySummary {
  return {
    id: row.id,
    activityType: row.activity_type,
    occurredAt: row.occurred_at.toISOString(),
    ...(row.content === null ? {} : { content: row.content }),
    ...(row.actor_user_id === null ? {} : { actorUserId: row.actor_user_id }),
  };
}
