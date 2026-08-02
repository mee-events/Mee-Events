import { Inject, Injectable } from "@nestjs/common";
import type { ContactPreference, EnquiryStatus } from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type {
  CreateEnquiryWithLeadInput,
  EnquiryDetail,
  EnquiryListItem,
  EnquiryRepository,
} from "../ports/enquiry-repository";

const DEFAULT_LEAD_SLA_MINUTES = 10;

interface EnquiryRow {
  readonly id: string;
  readonly reference_code: string;
  readonly event_type_code: string;
  readonly event_type_name: string;
  readonly event_date: Date | null;
  readonly location: string | null;
  readonly guest_count: number | null;
  readonly budget_min: string | null;
  readonly budget_max: string | null;
  readonly notes: string | null;
  readonly service_requirements: readonly string[];
  readonly contact_preference: ContactPreference;
  readonly status: EnquiryStatus;
  readonly submitted_at: Date | null;
  readonly created_at: Date;
}

@Injectable()
export class PostgresEnquiryRepository implements EnquiryRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async createEnquiryWithLead(
    input: CreateEnquiryWithLeadInput,
  ): Promise<{ enquiryId: string; leadId: string }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const customerId = await this.upsertCustomer(
        client,
        input.userId,
        input.contactPreference,
      );

      const enquiryResult = await client.query<{
        id: string;
        version: number;
      }>(
        `INSERT INTO enquiries (
           branch_id, customer_id, event_type_id, reference_code,
           event_date, location, guest_count, budget_min, budget_max,
           notes, service_requirements, contact_preference,
           status, submitted_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 'received', now())
         RETURNING id, version`,
        [
          input.branchId,
          customerId,
          input.eventTypeId,
          input.referenceCode,
          input.eventDate ?? null,
          input.location ?? null,
          input.guestCount ?? null,
          input.budgetMin ?? null,
          input.budgetMax ?? null,
          input.notes ?? null,
          JSON.stringify(input.serviceCategoryCodes),
          input.contactPreference,
        ],
      );
      const enquiry = enquiryResult.rows[0];
      if (enquiry === undefined) {
        throw new Error("INSERT INTO enquiries returned no row");
      }

      const leadResult = await client.query<{ id: string; version: number }>(
        `INSERT INTO leads (
           branch_id, enquiry_id, customer_id, source, status,
           first_response_due_at
         )
         VALUES ($1, $2, $3, 'mobile_app', 'new', $4)
         RETURNING id, version`,
        [input.branchId, enquiry.id, customerId, input.firstResponseDueAt],
      );
      const lead = leadResult.rows[0];
      if (lead === undefined) {
        throw new Error("INSERT INTO leads returned no row");
      }

      await client.query(
        `INSERT INTO lead_activities (lead_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'status_change', $3)`,
        [
          lead.id,
          input.userId,
          `Lead created from enquiry ${input.referenceCode}`,
        ],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, after_version, metadata
         )
         VALUES
           ($1, $2, 'customer', $3, 'enquiry', $4, 'enquiry.created', $5, $6),
           ($1, $2, 'customer', $3, 'lead', $7, 'crm.lead.created', $8, $9)`,
        [
          input.requestId,
          input.userId,
          input.branchId,
          enquiry.id,
          enquiry.version,
          JSON.stringify({ referenceCode: input.referenceCode }),
          lead.id,
          lead.version,
          JSON.stringify({ enquiryId: enquiry.id }),
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (
           topic, aggregate_type, aggregate_id, aggregate_version, payload
         )
         VALUES ('crm.lead.created', 'lead', $1, $2, $3)`,
        [
          lead.id,
          lead.version,
          JSON.stringify({
            leadId: lead.id,
            enquiryId: enquiry.id,
            branchId: input.branchId,
            referenceCode: input.referenceCode,
          }),
        ],
      );

      await client.query("COMMIT");
      return { enquiryId: enquiry.id, leadId: lead.id };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listForCustomerUser(
    userId: string,
  ): Promise<readonly EnquiryListItem[]> {
    const result = await this.pool.query<EnquiryRow>(
      `${SELECT_ENQUIRY}
       WHERE c.user_id = $1
       ORDER BY e.created_at DESC`,
      [userId],
    );
    return result.rows.map(toListItem);
  }

  public async findForCustomerUser(
    userId: string,
    enquiryId: string,
  ): Promise<EnquiryDetail | undefined> {
    const result = await this.pool.query<EnquiryRow>(
      `${SELECT_ENQUIRY}
       WHERE c.user_id = $1 AND e.id = $2`,
      [userId, enquiryId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toDetail(row);
  }

  public async getLeadFirstResponseSlaMinutes(
    branchId: string,
  ): Promise<number> {
    const result = await this.pool.query<{ value: unknown }>(
      `SELECT value FROM branch_settings
       WHERE branch_id = $1 AND key = 'lead.first_response_sla_minutes'`,
      [branchId],
    );
    const value = result.rows[0]?.value;
    return typeof value === "number" && value > 0
      ? value
      : DEFAULT_LEAD_SLA_MINUTES;
  }

  private async upsertCustomer(
    client: PoolClient,
    userId: string,
    contactPreference: ContactPreference,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO customers (user_id, contact_preference)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET contact_preference = EXCLUDED.contact_preference
       RETURNING id`,
      [userId, contactPreference],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Customer upsert returned no row");
    }
    return row.id;
  }
}

const SELECT_ENQUIRY = `
  SELECT
    e.id,
    e.reference_code,
    et.code AS event_type_code,
    et.display_name AS event_type_name,
    e.event_date,
    e.location,
    e.guest_count,
    e.budget_min,
    e.budget_max,
    e.notes,
    e.service_requirements,
    e.contact_preference,
    e.status,
    e.submitted_at,
    e.created_at
  FROM enquiries e
  JOIN customers c ON c.id = e.customer_id
  JOIN event_types et ON et.id = e.event_type_id`;

function toListItem(row: EnquiryRow): EnquiryListItem {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    eventTypeCode: row.event_type_code,
    eventTypeName: row.event_type_name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    ...(row.event_date === null
      ? {}
      : { eventDate: toDateOnly(row.event_date) }),
    ...(row.location === null ? {} : { location: row.location }),
    ...(row.guest_count === null ? {} : { guestCount: row.guest_count }),
    ...(row.submitted_at === null
      ? {}
      : { submittedAt: row.submitted_at.toISOString() }),
  };
}

function toDetail(row: EnquiryRow): EnquiryDetail {
  return {
    ...toListItem(row),
    serviceCategoryCodes: row.service_requirements,
    contactPreference: row.contact_preference,
    ...(row.budget_min === null ? {} : { budgetMin: Number(row.budget_min) }),
    ...(row.budget_max === null ? {} : { budgetMax: Number(row.budget_max) }),
    ...(row.notes === null ? {} : { notes: row.notes }),
  };
}

function toDateOnly(value: Date): string {
  const iso = value.toISOString();
  return iso.slice(0, 10);
}
