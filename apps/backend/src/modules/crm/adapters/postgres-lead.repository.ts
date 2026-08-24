import { Inject, Injectable } from "@nestjs/common";
import type { LeadSource, LeadStatus } from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type {
  EnquirySubmittedPayload,
  LeadDetailItem,
  LeadListItem,
  LeadRepository,
} from "../ports/lead-repository";

interface LeadRow {
  readonly id: string;
  readonly enquiry_id: string | null;
  readonly enquiry_reference_code: string | null;
  readonly customer_mobile: string;
  readonly customer_name: string | null;
  readonly event_type_name: string | null;
  readonly event_date: Date | null;
  readonly status: LeadStatus;
  readonly source: LeadSource;
  readonly owner_user_id: string | null;
  readonly first_response_due_at: Date | null;
  readonly first_responded_at: Date | null;
  readonly created_at: Date;
}

interface LeadDetailRow extends LeadRow {
  readonly location: string | null;
  readonly guest_count: number | null;
  readonly notes: string | null;
  readonly preferred_external_vendor: string | null;
  readonly service_requirements: unknown;
  readonly plan_items: unknown;
  readonly updated_at: Date | null;
}

const SELECT_LEAD = `
  SELECT
    l.id,
    l.enquiry_id,
    e.reference_code AS enquiry_reference_code,
    u.mobile_e164 AS customer_mobile,
    c.display_name AS customer_name,
    et.display_name AS event_type_name,
    e.event_date,
    l.status,
    l.source,
    l.owner_user_id,
    l.first_response_due_at,
    l.first_responded_at,
    l.created_at
  FROM leads l
  JOIN customers c ON c.id = l.customer_id
  JOIN app_users u ON u.id = c.user_id
  LEFT JOIN enquiries e ON e.id = l.enquiry_id
  LEFT JOIN event_types et ON et.id = e.event_type_id`;

const SELECT_LEAD_DETAIL = `
  SELECT
    l.id,
    l.enquiry_id,
    e.reference_code AS enquiry_reference_code,
    u.mobile_e164 AS customer_mobile,
    c.display_name AS customer_name,
    et.display_name AS event_type_name,
    e.event_date,
    l.status,
    l.source,
    l.owner_user_id,
    l.first_response_due_at,
    l.first_responded_at,
    l.created_at,
    e.location,
    e.guest_count,
    e.notes,
    e.preferred_external_vendor,
    e.service_requirements,
    COALESCE(e.plan_items, '[]'::jsonb) AS plan_items,
    e.updated_at
  FROM leads l
  JOIN customers c ON c.id = l.customer_id
  JOIN app_users u ON u.id = c.user_id
  LEFT JOIN enquiries e ON e.id = l.enquiry_id
  LEFT JOIN event_types et ON et.id = e.event_type_id`;

@Injectable()
export class PostgresLeadRepository implements LeadRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listForBranch(
    branchId: string,
  ): Promise<readonly LeadListItem[]> {
    const result = await this.pool.query<LeadRow>(
      `${SELECT_LEAD}
       WHERE l.branch_id = $1
       ORDER BY l.created_at DESC`,
      [branchId],
    );
    return result.rows.map(toListItem);
  }

  public async findById(leadId: string): Promise<LeadListItem | undefined> {
    const result = await this.pool.query<LeadRow>(
      `${SELECT_LEAD}
       WHERE l.id = $1`,
      [leadId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toListItem(row);
  }

  public async findDetailById(
    leadId: string,
  ): Promise<LeadDetailItem | undefined> {
    const result = await this.pool.query<LeadDetailRow>(
      `${SELECT_LEAD_DETAIL}
       WHERE l.id = $1`,
      [leadId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toDetailItem(row);
  }

  public async createFromEnquirySubmitted(
    payload: EnquirySubmittedPayload,
  ): Promise<{ leadId: string; created: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM leads WHERE enquiry_id = $1`,
        [payload.enquiryId],
      );
      const already = existing.rows[0];
      if (already !== undefined) {
        await client.query("COMMIT");
        return { leadId: already.id, created: false };
      }

      const leadResult = await client.query<{ id: string; version: number }>(
        `INSERT INTO leads (
           branch_id, enquiry_id, customer_id, source, status,
           first_response_due_at
         )
         VALUES ($1, $2, $3, 'mobile_app', 'new', $4)
         RETURNING id, version`,
        [
          payload.branchId,
          payload.enquiryId,
          payload.customerId,
          payload.firstResponseDueAt,
        ],
      );
      const lead = leadResult.rows[0];
      if (lead === undefined) {
        throw new Error("INSERT INTO leads returned no row");
      }

      await client.query(
        `INSERT INTO lead_activities (lead_id, actor_user_id, activity_type, content)
         VALUES ($1, NULL, 'status_change', $2)`,
        [lead.id, `Lead created from enquiry ${payload.enquiryId}`],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, after_version, metadata
         )
         VALUES ($1, NULL, 'system', $2, 'lead', $3, 'crm.lead.created', $4, $5)`,
        [
          `outbox:enquiry.submitted:${payload.enquiryId}`,
          payload.branchId,
          lead.id,
          lead.version,
          JSON.stringify({ enquiryId: payload.enquiryId }),
        ],
      );

      await client.query("COMMIT");
      return { leadId: lead.id, created: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async claimLead(
    leadId: string,
    ownerUserId: string,
    ownerRole: string,
    requestId: string,
  ): Promise<LeadListItem | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const updateResult = await client.query<{
        id: string;
        enquiry_id: string | null;
        version: number;
      }>(
        `UPDATE leads
         SET owner_user_id = $2,
             status = 'claimed',
             first_responded_at = COALESCE(first_responded_at, now())
         WHERE id = $1 AND owner_user_id IS NULL AND status = 'new'
         RETURNING id, enquiry_id, version`,
        [leadId, ownerUserId],
      );
      const updated = updateResult.rows[0];
      if (updated === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      if (updated.enquiry_id !== null) {
        await insertLeadUpdatedOutbox(client, {
          leadId,
          enquiryId: updated.enquiry_id,
          status: "claimed",
          aggregateVersion: updated.version,
        });
      }

      await client.query(
        `INSERT INTO lead_activities (lead_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'ownership', 'Lead claimed')`,
        [leadId, ownerUserId],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action,
           before_version, after_version, metadata
         )
         SELECT $1, $2, $3, l.branch_id, 'lead', l.id, 'crm.lead.claimed',
                $4, $5, '{}'::jsonb
         FROM leads l WHERE l.id = $6`,
        [
          requestId,
          ownerUserId,
          ownerRole,
          updated.version - 1,
          updated.version,
          leadId,
        ],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.findById(leadId);
  }

  public async saveRequirements(
    leadId: string,
    actorUserId: string,
    actorRole: string,
    notes: string,
    status: "contacted" | "qualified",
    requestId: string,
  ): Promise<LeadListItem | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const updateResult = await client.query<{
        id: string;
        enquiry_id: string | null;
        version: number;
        branch_id: string;
      }>(
        `UPDATE leads
         SET status = $2
         WHERE id = $1
           AND status IN ('claimed', 'contacted', 'qualified')
         RETURNING id, enquiry_id, version, branch_id`,
        [leadId, status],
      );
      const updated = updateResult.rows[0];
      if (updated === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      if (updated.enquiry_id !== null) {
        await insertLeadUpdatedOutbox(client, {
          leadId,
          enquiryId: updated.enquiry_id,
          status,
          aggregateVersion: updated.version,
        });
      }

      await client.query(
        `INSERT INTO lead_activities (lead_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'note', $3)`,
        [leadId, actorUserId, notes],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action,
           before_version, after_version, metadata
         )
         VALUES ($1, $2, $3, $4, 'lead', $5, 'crm.lead.requirements_saved',
                 $6, $7, $8)`,
        [
          requestId,
          actorUserId,
          actorRole,
          updated.branch_id,
          leadId,
          updated.version - 1,
          updated.version,
          JSON.stringify({ status }),
        ],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.findById(leadId);
  }

  public async updateStatus(
    leadId: string,
    status: LeadStatus,
    actorUserId: string,
    actorRole: string,
    requestId: string,
  ): Promise<LeadDetailItem | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query<{
        id: string;
        enquiry_id: string | null;
        version: number;
        branch_id: string;
        status: LeadStatus;
      }>(
        `SELECT id, enquiry_id, version, branch_id, status
         FROM leads
         WHERE id = $1
         FOR UPDATE`,
        [leadId],
      );
      const current = existing.rows[0];
      if (current === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const updateResult = await client.query<{
        id: string;
        enquiry_id: string | null;
        version: number;
        branch_id: string;
      }>(
        `UPDATE leads
         SET status = $2,
             first_responded_at = CASE
               WHEN $3::text = 'new' THEN COALESCE(first_responded_at, now())
               ELSE first_responded_at
             END
         WHERE id = $1
         RETURNING id, enquiry_id, version, branch_id`,
        [leadId, status, current.status],
      );
      const updated = updateResult.rows[0];
      if (updated === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      if (updated.enquiry_id !== null) {
        await insertLeadUpdatedOutbox(client, {
          leadId,
          enquiryId: updated.enquiry_id,
          status,
          aggregateVersion: updated.version,
        });
      }

      await client.query(
        `INSERT INTO lead_activities (lead_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'status_change', $3)`,
        [leadId, actorUserId, `Status changed to ${status}`],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action,
           before_version, after_version, metadata
         )
         VALUES ($1, $2, $3, $4, 'lead', $5, 'crm.lead.status_updated',
                 $6, $7, $8)`,
        [
          requestId,
          actorUserId,
          actorRole,
          updated.branch_id,
          leadId,
          updated.version - 1,
          updated.version,
          JSON.stringify({
            from: current.status,
            to: status,
          }),
        ],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.findDetailById(leadId);
  }
}

async function insertLeadUpdatedOutbox(
  client: PoolClient,
  input: {
    readonly leadId: string;
    readonly enquiryId: string;
    readonly status: LeadStatus;
    readonly aggregateVersion: number;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO outbox_events (
       topic, aggregate_type, aggregate_id, aggregate_version, payload
     )
     VALUES ('crm.lead.updated', 'lead', $1, $2, $3)`,
    [
      input.leadId,
      input.aggregateVersion,
      JSON.stringify({
        leadId: input.leadId,
        enquiryId: input.enquiryId,
        status: input.status,
      }),
    ],
  );
}

function toListItem(row: LeadRow): LeadListItem {
  return {
    id: row.id,
    customerMobile: row.customer_mobile,
    status: row.status,
    source: row.source,
    createdAt: row.created_at.toISOString(),
    ...(row.enquiry_id === null ? {} : { enquiryId: row.enquiry_id }),
    ...(row.enquiry_reference_code === null
      ? {}
      : { enquiryReferenceCode: row.enquiry_reference_code }),
    ...(row.customer_name === null ? {} : { customerName: row.customer_name }),
    ...(row.event_type_name === null
      ? {}
      : { eventTypeName: row.event_type_name }),
    ...(row.event_date === null
      ? {}
      : { eventDate: row.event_date.toISOString().slice(0, 10) }),
    ...(row.owner_user_id === null ? {} : { ownerUserId: row.owner_user_id }),
    ...(row.first_response_due_at === null
      ? {}
      : { firstResponseDueAt: row.first_response_due_at.toISOString() }),
    ...(row.first_responded_at === null
      ? {}
      : { firstRespondedAt: row.first_responded_at.toISOString() }),
  };
}

function toDetailItem(row: LeadDetailRow): LeadDetailItem {
  return {
    ...toListItem(row),
    requestedServices: [
      ...parseServiceRequirements(row.service_requirements),
      ...parsePlanItemNames(row.plan_items),
    ],
    ...(row.location === null ? {} : { location: row.location }),
    ...(row.guest_count === null ? {} : { guestCount: row.guest_count }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(row.preferred_external_vendor === null
      ? {}
      : { preferredExternalVendor: row.preferred_external_vendor }),
    ...(row.updated_at === null
      ? {}
      : { updatedAt: row.updated_at.toISOString() }),
  };
}

function parseServiceRequirements(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function parsePlanItemNames(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const names: string[] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.displayName === "string" && row.displayName.length > 0) {
      names.push(row.displayName);
    }
  }
  return names;
}
