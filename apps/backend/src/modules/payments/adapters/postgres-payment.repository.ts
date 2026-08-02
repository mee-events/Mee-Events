import { Inject, Injectable } from "@nestjs/common";
import type {
  BookingStatus,
  BookingSummary,
  ConfirmAdvanceResult,
  EventRecordSummary,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
} from "@me-event/api-contracts";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { insertEventRecordInTransaction } from "../../event-records/adapters/postgres-event-record.repository";
import type {
  ConfirmAdvanceInput,
  PaymentRepository,
  SubmitAdvanceInput,
} from "../ports/payment-repository";

interface PaymentRow {
  readonly id: string;
  readonly payment_plan_id: string;
  readonly quotation_id: string;
  readonly kind: PaymentKind;
  readonly method: PaymentMethod;
  readonly amount: string;
  readonly status: PaymentStatus;
  readonly reference_code: string;
  readonly notes: string | null;
  readonly confirmed_at: Date | null;
  readonly created_at: Date;
}

@Injectable()
export class PostgresPaymentRepository implements PaymentRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async submitAdvance(
    input: SubmitAdvanceInput,
  ): Promise<PaymentSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const context = await client.query<{
        quotation_id: string;
        status: string;
        customer_user_id: string;
        customer_id: string;
        branch_id: string;
        payment_plan_id: string;
        advance_amount: string;
        version: number;
      }>(
        `SELECT q.id AS quotation_id, q.status, c.user_id AS customer_user_id,
                q.customer_id, q.branch_id, pp.id AS payment_plan_id,
                pp.advance_amount, q.version
         FROM quotations q
         JOIN customers c ON c.id = q.customer_id
         JOIN payment_plans pp ON pp.quotation_id = q.id
         WHERE q.id = $1
         FOR UPDATE OF q`,
        [input.quotationId],
      );
      const quote = context.rows[0];
      if (
        quote === undefined ||
        quote.customer_user_id !== input.customerUserId ||
        quote.status !== "approved"
      ) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const existingPending = await client.query<{ id: string }>(
        `SELECT id FROM payments
         WHERE quotation_id = $1 AND kind = 'advance'
           AND status IN ('pending', 'paid')
         LIMIT 1`,
        [quote.quotation_id],
      );
      if (existingPending.rows[0] !== undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const inserted = await client.query<PaymentRow>(
        `INSERT INTO payments (
           payment_plan_id, quotation_id, branch_id, customer_id,
           kind, method, amount, status, reference_code, notes, recorded_by_user_id
         )
         VALUES ($1,$2,$3,$4,'advance',$5,$6,'pending',$7,$8,$9)
         RETURNING id, payment_plan_id, quotation_id, kind, method, amount,
                   status, reference_code, notes, confirmed_at, created_at`,
        [
          quote.payment_plan_id,
          quote.quotation_id,
          quote.branch_id,
          quote.customer_id,
          input.method,
          quote.advance_amount,
          input.referenceCode,
          input.notes ?? null,
          input.customerUserId,
        ],
      );
      const payment = inserted.rows[0];
      if (payment === undefined) {
        throw new Error("INSERT INTO payments returned no row");
      }

      await client.query(
        `INSERT INTO quotation_activities (quotation_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'note', $3)`,
        [
          quote.quotation_id,
          input.customerUserId,
          `Advance payment submitted (${input.method})`,
        ],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, after_version, metadata
         )
         VALUES ($1, $2, $3, $4, 'payment', $5, 'payment.advance_submitted', 1, $6)`,
        [
          input.requestId,
          input.customerUserId,
          input.actorRole,
          quote.branch_id,
          payment.id,
          JSON.stringify({
            quotationId: quote.quotation_id,
            method: input.method,
            amount: quote.advance_amount,
          }),
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (
           topic, aggregate_type, aggregate_id, aggregate_version, payload
         )
         VALUES ('payment.advance_submitted', 'payment', $1, 1, $2)`,
        [
          payment.id,
          JSON.stringify({
            paymentId: payment.id,
            quotationId: quote.quotation_id,
          }),
        ],
      );

      await client.query("COMMIT");
      return toPayment(payment);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async confirmAdvance(
    input: ConfirmAdvanceInput,
  ): Promise<ConfirmAdvanceResult | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const paymentResult = await client.query<
        PaymentRow & {
          branch_id: string;
          customer_id: string;
          lead_id: string;
          enquiry_id: string;
          revision_id: string;
          quotation_status: string;
          quote_version: number;
          event_type_id: string;
          event_type_name: string;
          event_date: Date | string | null;
          location: string | null;
          guest_count: number | null;
        }
      >(
        `SELECT p.id, p.payment_plan_id, p.quotation_id, p.kind, p.method,
                p.amount, p.status, p.reference_code, p.notes, p.confirmed_at,
                p.created_at, p.branch_id, p.customer_id,
                q.lead_id, q.enquiry_id, q.current_revision_id AS revision_id,
                q.status AS quotation_status, q.version AS quote_version,
                en.event_type_id, et.display_name AS event_type_name,
                en.event_date, en.location, en.guest_count
         FROM payments p
         JOIN quotations q ON q.id = p.quotation_id
         JOIN enquiries en ON en.id = q.enquiry_id
         JOIN event_types et ON et.id = en.event_type_id
         WHERE p.id = $1 AND p.kind = 'advance'
         FOR UPDATE OF p, q`,
        [input.paymentId],
      );
      const payment = paymentResult.rows[0];
      if (
        payment === undefined ||
        payment.status !== "pending" ||
        payment.quotation_status !== "approved" ||
        payment.revision_id === null
      ) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const updatedPayment = await client.query<PaymentRow>(
        `UPDATE payments
         SET status = 'paid',
             confirmed_by_user_id = $2,
             confirmed_at = now()
         WHERE id = $1
         RETURNING id, payment_plan_id, quotation_id, kind, method, amount,
                   status, reference_code, notes, confirmed_at, created_at`,
        [payment.id, input.actorUserId],
      );
      const paid = updatedPayment.rows[0];
      if (paid === undefined) {
        throw new Error("Failed to confirm payment");
      }

      const bookingInsert = await client.query<{
        id: string;
        booking_number: string;
        quotation_id: string;
        lead_id: string;
        enquiry_id: string;
        status: BookingStatus;
        final_amount: string;
        advance_paid: string;
        confirmed_at: Date | null;
        created_at: Date;
        version: number;
      }>(
        `INSERT INTO bookings (
           branch_id, booking_number, enquiry_id, lead_id, quotation_id,
           revision_id, customer_id, status, final_amount, advance_paid, confirmed_at
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, 'confirmed',
           (SELECT final_amount FROM quotation_revisions WHERE id = $6),
           $8, now()
         )
         RETURNING id, booking_number, quotation_id, lead_id, enquiry_id, status,
                   final_amount, advance_paid, confirmed_at, created_at, version`,
        [
          payment.branch_id,
          input.bookingNumber,
          payment.enquiry_id,
          payment.lead_id,
          payment.quotation_id,
          payment.revision_id,
          payment.customer_id,
          payment.amount,
        ],
      );
      const booking = bookingInsert.rows[0];
      if (booking === undefined) {
        throw new Error("INSERT INTO bookings returned no row");
      }

      await client.query(
        `UPDATE leads SET status = 'converted' WHERE id = $1`,
        [payment.lead_id],
      );
      await client.query(
        `UPDATE enquiries SET status = 'closed' WHERE id = $1`,
        [payment.enquiry_id],
      );

      const event = await insertEventRecordInTransaction(client, {
        branchId: payment.branch_id,
        eventNumber: input.eventNumber,
        bookingId: booking.id,
        enquiryId: payment.enquiry_id,
        leadId: payment.lead_id,
        quotationId: payment.quotation_id,
        revisionId: payment.revision_id,
        customerId: payment.customer_id,
        eventTypeId: payment.event_type_id,
        eventTypeName: payment.event_type_name,
        eventName: payment.event_type_name,
        eventDate: payment.event_date,
        venueAddress: payment.location,
        guestCount: payment.guest_count,
        budgetAmount: booking.final_amount,
        advancePaid: booking.advance_paid,
        bookingNumber: booking.booking_number,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        requestId: input.requestId,
      });

      await client.query(
        `INSERT INTO booking_activities (booking_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'confirmed', $3)`,
        [
          booking.id,
          input.actorUserId,
          `Booking ${booking.booking_number} confirmed after advance payment`,
        ],
      );

      await client.query(
        `INSERT INTO quotation_activities (quotation_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'status_change', $3)`,
        [
          payment.quotation_id,
          input.actorUserId,
          `Advance confirmed; booking ${booking.booking_number} and event ${event.eventNumber} created`,
        ],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, after_version, metadata
         )
         VALUES
           ($1, $2, $3, $4, 'payment', $5, 'payment.advance_confirmed', $6, $7),
           ($1, $2, $3, $4, 'booking', $8, 'booking.created', $9, $10)`,
        [
          input.requestId,
          input.actorUserId,
          input.actorRole,
          payment.branch_id,
          payment.id,
          1,
          JSON.stringify({
            quotationId: payment.quotation_id,
            eventRecordId: event.id,
          }),
          booking.id,
          booking.version,
          JSON.stringify({
            bookingNumber: booking.booking_number,
            eventRecordId: event.id,
            eventNumber: event.eventNumber,
          }),
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (
           topic, aggregate_type, aggregate_id, aggregate_version, payload
         )
         VALUES
           ('payment.advance_confirmed', 'payment', $1, 1, $2),
           ('booking.created', 'booking', $3, $4, $5)`,
        [
          payment.id,
          JSON.stringify({
            paymentId: payment.id,
            bookingId: booking.id,
            eventRecordId: event.id,
          }),
          booking.id,
          booking.version,
          JSON.stringify({
            bookingId: booking.id,
            bookingNumber: booking.booking_number,
            quotationId: payment.quotation_id,
            eventRecordId: event.id,
            eventNumber: event.eventNumber,
          }),
        ],
      );

      await client.query("COMMIT");

      const bookingSummary: BookingSummary = {
        id: booking.id,
        bookingNumber: booking.booking_number,
        quotationId: booking.quotation_id,
        leadId: booking.lead_id,
        enquiryId: booking.enquiry_id,
        status: booking.status,
        finalAmount: booking.final_amount,
        advancePaid: booking.advance_paid,
        createdAt: booking.created_at.toISOString(),
        eventRecordId: event.id,
        eventNumber: event.eventNumber,
        ...(booking.confirmed_at === null
          ? {}
          : { confirmedAt: booking.confirmed_at.toISOString() }),
      };

      const eventRecord: EventRecordSummary = {
        id: event.id,
        eventNumber: event.eventNumber,
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        quotationId: booking.quotation_id,
        leadId: booking.lead_id,
        enquiryId: booking.enquiry_id,
        customerId: payment.customer_id,
        eventTypeName: payment.event_type_name,
        eventName: payment.event_type_name,
        budgetAmount: booking.final_amount,
        advancePaid: booking.advance_paid,
        pendingAmount: event.pendingAmount,
        status: event.status,
        priority: "normal",
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        ...(payment.event_date === null
          ? {}
          : {
              eventDate:
                typeof payment.event_date === "string"
                  ? payment.event_date.slice(0, 10)
                  : payment.event_date.toISOString().slice(0, 10),
            }),
        ...(payment.location === null
          ? {}
          : { venueAddress: payment.location }),
        ...(payment.guest_count === null
          ? {}
          : { guestCount: payment.guest_count }),
      };

      return {
        payment: toPayment(paid),
        booking: bookingSummary,
        eventRecord,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listForCustomerUser(
    userId: string,
  ): Promise<readonly PaymentSummary[]> {
    const result = await this.pool.query<PaymentRow>(
      `SELECT p.id, p.payment_plan_id, p.quotation_id, p.kind, p.method,
              p.amount, p.status, p.reference_code, p.notes, p.confirmed_at,
              p.created_at
       FROM payments p
       JOIN customers c ON c.id = p.customer_id
       WHERE c.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId],
    );
    return result.rows.map(toPayment);
  }

  public async findById(
    paymentId: string,
  ): Promise<PaymentSummary | undefined> {
    const result = await this.pool.query<PaymentRow>(
      `SELECT id, payment_plan_id, quotation_id, kind, method, amount, status,
              reference_code, notes, confirmed_at, created_at
       FROM payments WHERE id = $1`,
      [paymentId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toPayment(row);
  }

  public async listPendingAdvancesForQuotation(
    quotationId: string,
  ): Promise<readonly PaymentSummary[]> {
    const result = await this.pool.query<PaymentRow>(
      `SELECT id, payment_plan_id, quotation_id, kind, method, amount, status,
              reference_code, notes, confirmed_at, created_at
       FROM payments
       WHERE quotation_id = $1 AND kind = 'advance' AND status = 'pending'
       ORDER BY created_at DESC`,
      [quotationId],
    );
    return result.rows.map(toPayment);
  }
}

function toPayment(row: PaymentRow): PaymentSummary {
  return {
    id: row.id,
    paymentPlanId: row.payment_plan_id,
    quotationId: row.quotation_id,
    kind: row.kind,
    method: row.method,
    amount: row.amount,
    status: row.status,
    referenceCode: row.reference_code,
    createdAt: row.created_at.toISOString(),
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(row.confirmed_at === null
      ? {}
      : { confirmedAt: row.confirmed_at.toISOString() }),
  };
}
