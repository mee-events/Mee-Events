import { Inject, Injectable } from "@nestjs/common";
import type {
  QuotationActivitySummary,
  QuotationDetailResponse,
  QuotationItemInput,
  QuotationItemSummary,
  QuotationItemType,
  QuotationRevisionReason,
  QuotationRevisionSummary,
  QuotationStatus,
  QuotationSummary,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type {
  CreateQuotationInput,
  CustomerDecisionInput,
  LeadContext,
  QuotationRepository,
  ReviseQuotationInput,
  SendQuotationInput,
  UpdateDraftQuotationInput,
} from "../ports/quotation-repository";

interface QuotationHeaderRow {
  readonly id: string;
  readonly lead_id: string;
  readonly enquiry_id: string;
  readonly enquiry_reference_code: string | null;
  readonly customer_id: string;
  readonly reference_code: string;
  readonly status: QuotationStatus;
  readonly current_revision_id: string | null;
  readonly final_amount: string | null;
  readonly advance_amount: string | null;
  readonly valid_until: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly payment_plan_id: string | null;
  readonly booking_id: string | null;
}

interface RevisionRow {
  readonly id: string;
  readonly revision_number: number;
  readonly reason: QuotationRevisionReason;
  readonly subtotal: string;
  readonly discount_amount: string;
  readonly discount_percent: string;
  readonly gst_percent: string;
  readonly gst_amount: string;
  readonly final_amount: string;
  readonly advance_percent: string;
  readonly advance_amount: string;
  readonly valid_until: Date | null;
  readonly terms: string | null;
  readonly internal_notes: string | null;
  readonly customer_notes: string | null;
  readonly sent_at: Date | null;
  readonly created_at: Date;
}

interface ItemRow {
  readonly id: string;
  readonly item_type: QuotationItemType;
  readonly title: string;
  readonly description: string | null;
  readonly quantity: string;
  readonly unit_price: string;
  readonly line_total: string;
  readonly sort_order: number;
}

interface ActivityRow {
  readonly id: string;
  readonly activity_type: string;
  readonly content: string | null;
  readonly actor_user_id: string | null;
  readonly occurred_at: Date;
}

const SELECT_HEADER = `
  SELECT
    q.id,
    q.lead_id,
    q.enquiry_id,
    e.reference_code AS enquiry_reference_code,
    q.customer_id,
    q.reference_code,
    q.status,
    q.current_revision_id,
    r.final_amount,
    r.advance_amount,
    r.valid_until,
    q.created_at,
    q.updated_at,
    pp.id AS payment_plan_id,
    b.id AS booking_id
  FROM quotations q
  JOIN enquiries e ON e.id = q.enquiry_id
  LEFT JOIN quotation_revisions r ON r.id = q.current_revision_id
  LEFT JOIN payment_plans pp ON pp.quotation_id = q.id
  LEFT JOIN bookings b ON b.quotation_id = q.id`;

@Injectable()
export class PostgresQuotationRepository implements QuotationRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async findLeadContext(
    leadId: string,
  ): Promise<LeadContext | undefined> {
    const result = await this.pool.query<{
      lead_id: string;
      enquiry_id: string;
      customer_id: string;
      branch_id: string;
      status: string;
      owner_user_id: string | null;
    }>(
      `SELECT id AS lead_id, enquiry_id, customer_id, branch_id, status, owner_user_id
       FROM leads WHERE id = $1 AND enquiry_id IS NOT NULL`,
      [leadId],
    );
    const row = result.rows[0];
    if (row === undefined || row.enquiry_id === null) {
      return undefined;
    }
    return {
      leadId: row.lead_id,
      enquiryId: row.enquiry_id,
      customerId: row.customer_id,
      branchId: row.branch_id,
      status: row.status,
      ...(row.owner_user_id === null ? {} : { ownerUserId: row.owner_user_id }),
    };
  }

  public async createDraft(input: CreateQuotationInput): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const quoteResult = await client.query<{ id: string; version: number }>(
        `INSERT INTO quotations (
           branch_id, lead_id, enquiry_id, customer_id, reference_code,
           status, owner_user_id
         )
         VALUES ($1, $2, $3, $4, $5, 'draft', $6)
         RETURNING id, version`,
        [
          input.branchId,
          input.leadId,
          input.enquiryId,
          input.customerId,
          input.referenceCode,
          input.ownerUserId,
        ],
      );
      const quote = quoteResult.rows[0];
      if (quote === undefined) {
        throw new Error("INSERT INTO quotations returned no row");
      }

      const revisionId = await this.insertRevision(client, {
        quotationId: quote.id,
        revisionNumber: 1,
        reason: "initial",
        totals: input.totals,
        validUntil: input.validUntil ?? null,
        terms: input.terms ?? null,
        internalNotes: input.internalNotes ?? null,
        customerNotes: input.customerNotes ?? null,
        sentAt: null,
      });

      await this.insertItems(client, revisionId, input.items);

      await client.query(
        `UPDATE quotations SET current_revision_id = $2 WHERE id = $1`,
        [quote.id, revisionId],
      );

      await client.query(
        `INSERT INTO quotation_activities (quotation_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'created', $3)`,
        [quote.id, input.ownerUserId, `Draft quotation ${input.referenceCode}`],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, after_version, metadata
         )
         VALUES ($1, $2, $3, $4, 'quotation', $5, 'quotation.created', $6, $7)`,
        [
          input.requestId,
          input.ownerUserId,
          input.actorRole,
          input.branchId,
          quote.id,
          quote.version,
          JSON.stringify({ referenceCode: input.referenceCode }),
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (
           topic, aggregate_type, aggregate_id, aggregate_version, payload
         )
         VALUES ('quotation.created', 'quotation', $1, $2, $3)`,
        [
          quote.id,
          quote.version,
          JSON.stringify({
            quotationId: quote.id,
            leadId: input.leadId,
            referenceCode: input.referenceCode,
          }),
        ],
      );

      await client.query("COMMIT");
      return quote.id;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateDraft(input: UpdateDraftQuotationInput): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const header = await client.query<{
        id: string;
        status: QuotationStatus;
        current_revision_id: string | null;
        version: number;
        branch_id: string;
      }>(
        `SELECT id, status, current_revision_id, version, branch_id
         FROM quotations WHERE id = $1 FOR UPDATE`,
        [input.quotationId],
      );
      const quote = header.rows[0];
      if (
        quote === undefined ||
        quote.status !== "draft" ||
        quote.current_revision_id === null
      ) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query(`DELETE FROM quotation_items WHERE revision_id = $1`, [
        quote.current_revision_id,
      ]);

      await client.query(
        `UPDATE quotation_revisions
         SET subtotal = $2,
             discount_amount = $3,
             discount_percent = $4,
             gst_percent = $5,
             gst_amount = $6,
             final_amount = $7,
             advance_percent = $8,
             advance_amount = $9,
             valid_until = $10,
             terms = $11,
             internal_notes = $12,
             customer_notes = $13
         WHERE id = $1`,
        [
          quote.current_revision_id,
          input.totals.subtotal,
          input.totals.discountAmount,
          input.totals.discountPercent,
          input.totals.gstPercent,
          input.totals.gstAmount,
          input.totals.finalAmount,
          input.totals.advancePercent,
          input.totals.advanceAmount,
          input.validUntil ?? null,
          input.terms ?? null,
          input.internalNotes ?? null,
          input.customerNotes ?? null,
        ],
      );

      await this.insertItems(client, quote.current_revision_id, input.items);

      await client.query(
        `INSERT INTO quotation_activities (quotation_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'updated', 'Draft quotation updated')`,
        [input.quotationId, input.actorUserId],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, before_version, after_version, metadata
         )
         VALUES ($1, $2, $3, $4, 'quotation', $5, 'quotation.updated', $6, $7, '{}'::jsonb)`,
        [
          input.requestId,
          input.actorUserId,
          input.actorRole,
          quote.branch_id,
          input.quotationId,
          quote.version,
          quote.version + 1,
        ],
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async revise(input: ReviseQuotationInput): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const header = await client.query<{
        id: string;
        status: QuotationStatus;
        version: number;
        branch_id: string;
        max_revision: number;
      }>(
        `SELECT q.id, q.status, q.version, q.branch_id,
                COALESCE(MAX(r.revision_number), 0) AS max_revision
         FROM quotations q
         LEFT JOIN quotation_revisions r ON r.quotation_id = q.id
         WHERE q.id = $1
         GROUP BY q.id
         FOR UPDATE OF q`,
        [input.quotationId],
      );
      const quote = header.rows[0];
      if (
        quote === undefined ||
        !["sent", "revision_requested", "approved"].includes(quote.status)
      ) {
        await client.query("ROLLBACK");
        return false;
      }

      const revisionNumber = Number(quote.max_revision) + 1;
      const revisionId = await this.insertRevision(client, {
        quotationId: quote.id,
        revisionNumber,
        reason: input.reason,
        totals: input.totals,
        validUntil: input.validUntil ?? null,
        terms: input.terms ?? null,
        internalNotes: input.internalNotes ?? null,
        customerNotes: input.customerNotes ?? null,
        sentAt: null,
      });
      await this.insertItems(client, revisionId, input.items);

      await client.query(
        `UPDATE quotations
         SET current_revision_id = $2, status = 'draft'
         WHERE id = $1`,
        [quote.id, revisionId],
      );

      await client.query(
        `INSERT INTO quotation_activities (quotation_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'revised', $3)`,
        [
          quote.id,
          input.actorUserId,
          `Revision ${revisionNumber} created (${input.reason})`,
        ],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, before_version, after_version, metadata
         )
         VALUES ($1, $2, $3, $4, 'quotation', $5, 'quotation.revised', $6, $7, $8)`,
        [
          input.requestId,
          input.actorUserId,
          input.actorRole,
          quote.branch_id,
          quote.id,
          quote.version,
          quote.version + 1,
          JSON.stringify({ revisionNumber, reason: input.reason }),
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (
           topic, aggregate_type, aggregate_id, aggregate_version, payload
         )
         VALUES ('quotation.revised', 'quotation', $1, $2, $3)`,
        [
          quote.id,
          quote.version + 1,
          JSON.stringify({ quotationId: quote.id, revisionNumber }),
        ],
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async send(input: SendQuotationInput): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const header = await client.query<{
        id: string;
        status: QuotationStatus;
        version: number;
        branch_id: string;
        lead_id: string;
        enquiry_id: string;
        customer_id: string;
        current_revision_id: string | null;
        final_amount: string;
        advance_amount: string;
      }>(
        `SELECT q.id, q.status, q.version, q.branch_id, q.lead_id, q.enquiry_id,
                q.customer_id, q.current_revision_id,
                r.final_amount, r.advance_amount
         FROM quotations q
         JOIN quotation_revisions r ON r.id = q.current_revision_id
         WHERE q.id = $1
         FOR UPDATE OF q`,
        [input.quotationId],
      );
      const quote = header.rows[0];
      if (
        quote === undefined ||
        quote.current_revision_id === null ||
        quote.status !== "draft"
      ) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query(
        `UPDATE quotation_revisions SET sent_at = now() WHERE id = $1`,
        [quote.current_revision_id],
      );

      await client.query(
        `UPDATE quotations SET status = 'sent' WHERE id = $1`,
        [quote.id],
      );

      await client.query(
        `UPDATE leads SET status = 'quoted' WHERE id = $1
         AND status IN ('claimed', 'contacted', 'qualified', 'quoted')`,
        [quote.lead_id],
      );

      await client.query(
        `UPDATE enquiries SET status = 'proposal_expected' WHERE id = $1
         AND status IN (
           'received', 'contact_pending', 'in_discussion', 'proposal_expected'
         )`,
        [quote.enquiry_id],
      );

      await client.query(
        `INSERT INTO payment_plans (
           quotation_id, branch_id, customer_id,
           total_amount, advance_amount, balance_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (quotation_id) DO UPDATE SET
           total_amount = EXCLUDED.total_amount,
           advance_amount = EXCLUDED.advance_amount,
           balance_amount = EXCLUDED.balance_amount`,
        [
          quote.id,
          quote.branch_id,
          quote.customer_id,
          quote.final_amount,
          quote.advance_amount,
          Number(quote.final_amount) - Number(quote.advance_amount),
        ],
      );

      await client.query(
        `INSERT INTO quotation_activities (quotation_id, actor_user_id, activity_type, content)
         VALUES ($1, $2, 'sent', 'Quotation sent to customer')`,
        [quote.id, input.actorUserId],
      );

      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action, before_version, after_version, metadata
         )
         VALUES ($1, $2, $3, $4, 'quotation', $5, 'quotation.sent', $6, $7, '{}'::jsonb)`,
        [
          input.requestId,
          input.actorUserId,
          input.actorRole,
          quote.branch_id,
          quote.id,
          quote.version,
          quote.version + 1,
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (
           topic, aggregate_type, aggregate_id, aggregate_version, payload
         )
         VALUES ('quotation.sent', 'quotation', $1, $2, $3)`,
        [
          quote.id,
          quote.version + 1,
          JSON.stringify({ quotationId: quote.id, leadId: quote.lead_id }),
        ],
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async approve(input: CustomerDecisionInput): Promise<boolean> {
    return this.customerDecision(
      input,
      "approved",
      "approved",
      "quotation.approved",
    );
  }

  public async reject(input: CustomerDecisionInput): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const ok = await this.applyCustomerStatus(
        client,
        input,
        "rejected",
        "rejected",
        "quotation.rejected",
        input.reason ?? "Customer rejected quotation",
      );
      if (!ok) {
        await client.query("ROLLBACK");
        return false;
      }

      const quote = await client.query<{
        lead_id: string;
        enquiry_id: string;
      }>(`SELECT lead_id, enquiry_id FROM quotations WHERE id = $1`, [
        input.quotationId,
      ]);
      const row = quote.rows[0];
      if (row !== undefined) {
        await client.query(
          `UPDATE leads SET status = 'lost' WHERE id = $1 AND status = 'quoted'`,
          [row.lead_id],
        );
        await client.query(
          `UPDATE enquiries SET status = 'closed' WHERE id = $1`,
          [row.enquiry_id],
        );
      }
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async requestRevision(input: CustomerDecisionInput): Promise<boolean> {
    return this.customerDecision(
      input,
      "revision_requested",
      "revision_requested",
      "quotation.revision_requested",
      input.message ?? "Customer requested revision",
    );
  }

  public async listForBranch(
    branchId: string,
  ): Promise<readonly QuotationSummary[]> {
    const result = await this.pool.query<QuotationHeaderRow>(
      `${SELECT_HEADER}
       WHERE q.branch_id = $1
       ORDER BY q.created_at DESC`,
      [branchId],
    );
    return result.rows.map(toSummary);
  }

  public async listForCustomerUser(
    userId: string,
  ): Promise<readonly QuotationSummary[]> {
    const result = await this.pool.query<QuotationHeaderRow>(
      `${SELECT_HEADER}
       JOIN customers c ON c.id = q.customer_id
       WHERE c.user_id = $1 AND q.status <> 'draft'
       ORDER BY q.created_at DESC`,
      [userId],
    );
    return result.rows.map(toSummary);
  }

  public async findById(
    quotationId: string,
  ): Promise<QuotationDetailResponse | undefined> {
    return this.loadDetail(quotationId, undefined);
  }

  public async findForCustomerUser(
    userId: string,
    quotationId: string,
  ): Promise<QuotationDetailResponse | undefined> {
    return this.loadDetail(quotationId, userId);
  }

  public async listTimeline(
    quotationId: string,
  ): Promise<readonly QuotationActivitySummary[]> {
    const result = await this.pool.query<ActivityRow>(
      `SELECT id, activity_type, content, actor_user_id, occurred_at
       FROM quotation_activities
       WHERE quotation_id = $1
       ORDER BY occurred_at DESC`,
      [quotationId],
    );
    return result.rows.map(toActivity);
  }

  public async ensurePdfPlaceholder(
    quotationId: string,
  ): Promise<{ documentId: string; status: "pending"; message: string }> {
    const existing = await this.pool.query<{ id: string }>(
      `SELECT id FROM quotation_documents
       WHERE quotation_id = $1 AND doc_type = 'pdf_placeholder'
       ORDER BY created_at DESC LIMIT 1`,
      [quotationId],
    );
    if (existing.rows[0] !== undefined) {
      return {
        documentId: existing.rows[0].id,
        status: "pending",
        message: "PDF generation is not available yet.",
      };
    }

    const revision = await this.pool.query<{
      current_revision_id: string | null;
    }>(`SELECT current_revision_id FROM quotations WHERE id = $1`, [
      quotationId,
    ]);
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO quotation_documents (quotation_id, revision_id, doc_type, status)
       VALUES ($1, $2, 'pdf_placeholder', 'pending')
       RETURNING id`,
      [quotationId, revision.rows[0]?.current_revision_id ?? null],
    );
    const doc = inserted.rows[0];
    if (doc === undefined) {
      throw new Error("Failed to create PDF placeholder document");
    }
    return {
      documentId: doc.id,
      status: "pending",
      message: "PDF generation is not available yet.",
    };
  }

  private async customerDecision(
    input: CustomerDecisionInput,
    status: QuotationStatus,
    activityType: string,
    auditAction: string,
    content?: string,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const ok = await this.applyCustomerStatus(
        client,
        input,
        status,
        activityType,
        auditAction,
        content,
      );
      if (!ok) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async applyCustomerStatus(
    client: PoolClient,
    input: CustomerDecisionInput,
    status: QuotationStatus,
    activityType: string,
    auditAction: string,
    content?: string,
  ): Promise<boolean> {
    const header = await client.query<{
      id: string;
      status: QuotationStatus;
      version: number;
      branch_id: string;
      customer_user_id: string;
    }>(
      `SELECT q.id, q.status, q.version, q.branch_id, c.user_id AS customer_user_id
       FROM quotations q
       JOIN customers c ON c.id = q.customer_id
       WHERE q.id = $1
       FOR UPDATE OF q`,
      [input.quotationId],
    );
    const quote = header.rows[0];
    if (
      quote === undefined ||
      quote.customer_user_id !== input.customerUserId ||
      quote.status !== "sent"
    ) {
      return false;
    }

    await client.query(`UPDATE quotations SET status = $2 WHERE id = $1`, [
      quote.id,
      status,
    ]);

    await client.query(
      `INSERT INTO quotation_activities (quotation_id, actor_user_id, activity_type, content)
       VALUES ($1, $2, $3, $4)`,
      [
        quote.id,
        input.customerUserId,
        activityType,
        content ?? `Quotation ${status}`,
      ],
    );

    await client.query(
      `INSERT INTO audit_events (
         request_id, actor_user_id, actor_role, branch_id,
         entity_type, entity_id, action, before_version, after_version, metadata
       )
       VALUES ($1, $2, $3, $4, 'quotation', $5, $6, $7, $8, $9)`,
      [
        input.requestId,
        input.customerUserId,
        input.actorRole,
        quote.branch_id,
        quote.id,
        auditAction,
        quote.version,
        quote.version + 1,
        JSON.stringify({ status }),
      ],
    );

    await client.query(
      `INSERT INTO outbox_events (
         topic, aggregate_type, aggregate_id, aggregate_version, payload
       )
       VALUES ($1, 'quotation', $2, $3, $4)`,
      [
        auditAction,
        quote.id,
        quote.version + 1,
        JSON.stringify({ quotationId: quote.id, status }),
      ],
    );

    return true;
  }

  private async loadDetail(
    quotationId: string,
    customerUserId: string | undefined,
  ): Promise<QuotationDetailResponse | undefined> {
    const params: unknown[] = [quotationId];
    let where = "WHERE q.id = $1";
    if (customerUserId !== undefined) {
      params.push(customerUserId);
      where += ` AND c.user_id = $2 AND q.status <> 'draft'`;
    }

    const headerResult = await this.pool.query<QuotationHeaderRow>(
      `${SELECT_HEADER}
       JOIN customers c ON c.id = q.customer_id
       ${where}`,
      params,
    );
    const header = headerResult.rows[0];
    if (header === undefined) {
      return undefined;
    }

    let revision: QuotationRevisionSummary | undefined;
    let items: QuotationItemSummary[] = [];
    if (header.current_revision_id !== null) {
      const revisionResult = await this.pool.query<RevisionRow>(
        `SELECT id, revision_number, reason, subtotal, discount_amount,
                discount_percent, gst_percent, gst_amount, final_amount,
                advance_percent, advance_amount, valid_until, terms,
                internal_notes, customer_notes, sent_at, created_at
         FROM quotation_revisions WHERE id = $1`,
        [header.current_revision_id],
      );
      const rev = revisionResult.rows[0];
      if (rev !== undefined) {
        revision = toRevision(rev, customerUserId !== undefined);
        const itemResult = await this.pool.query<ItemRow>(
          `SELECT id, item_type, title, description, quantity, unit_price,
                  line_total, sort_order
           FROM quotation_items
           WHERE revision_id = $1
           ORDER BY sort_order, created_at`,
          [rev.id],
        );
        items = itemResult.rows.map(toItem);
      }
    }

    const activities = await this.listTimeline(quotationId);
    const summary = toSummary(header);

    return {
      ...summary,
      items,
      activities,
      ...(revision === undefined ? {} : { revision }),
      ...(header.payment_plan_id === null
        ? {}
        : { paymentPlanId: header.payment_plan_id }),
      ...(header.booking_id === null ? {} : { bookingId: header.booking_id }),
    };
  }

  private async insertRevision(
    client: PoolClient,
    input: {
      quotationId: string;
      revisionNumber: number;
      reason: QuotationRevisionReason;
      totals: CreateQuotationInput["totals"];
      validUntil: string | null;
      terms: string | null;
      internalNotes: string | null;
      customerNotes: string | null;
      sentAt: Date | null;
    },
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO quotation_revisions (
         quotation_id, revision_number, reason,
         subtotal, discount_amount, discount_percent,
         gst_percent, gst_amount, final_amount,
         advance_percent, advance_amount,
         valid_until, terms, internal_notes, customer_notes, sent_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [
        input.quotationId,
        input.revisionNumber,
        input.reason,
        input.totals.subtotal,
        input.totals.discountAmount,
        input.totals.discountPercent,
        input.totals.gstPercent,
        input.totals.gstAmount,
        input.totals.finalAmount,
        input.totals.advancePercent,
        input.totals.advanceAmount,
        input.validUntil,
        input.terms,
        input.internalNotes,
        input.customerNotes,
        input.sentAt,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("INSERT INTO quotation_revisions returned no row");
    }
    return row.id;
  }

  private async insertItems(
    client: PoolClient,
    revisionId: string,
    items: readonly QuotationItemInput[],
  ): Promise<void> {
    for (const [index, item] of items.entries()) {
      const lineTotal = roundMoney(item.quantity * item.unitPrice);
      await client.query(
        `INSERT INTO quotation_items (
           revision_id, sort_order, item_type, title, description,
           quantity, unit_price, line_total, metadata
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          revisionId,
          item.sortOrder ?? index,
          item.itemType,
          item.title,
          item.description ?? null,
          item.quantity,
          item.unitPrice,
          lineTotal,
          JSON.stringify(item.metadata ?? {}),
        ],
      );
    }
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toSummary(row: QuotationHeaderRow): QuotationSummary {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    leadId: row.lead_id,
    enquiryId: row.enquiry_id,
    customerId: row.customer_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.enquiry_reference_code === null
      ? {}
      : { enquiryReferenceCode: row.enquiry_reference_code }),
    ...(row.current_revision_id === null
      ? {}
      : { currentRevisionId: row.current_revision_id }),
    ...(row.final_amount === null ? {} : { finalAmount: row.final_amount }),
    ...(row.advance_amount === null
      ? {}
      : { advanceAmount: row.advance_amount }),
    ...(row.valid_until === null
      ? {}
      : { validUntil: row.valid_until.toISOString().slice(0, 10) }),
  };
}

function toRevision(
  row: RevisionRow,
  hideInternal: boolean,
): QuotationRevisionSummary {
  return {
    id: row.id,
    revisionNumber: row.revision_number,
    reason: row.reason,
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    discountPercent: row.discount_percent,
    gstPercent: row.gst_percent,
    gstAmount: row.gst_amount,
    finalAmount: row.final_amount,
    advancePercent: row.advance_percent,
    advanceAmount: row.advance_amount,
    createdAt: row.created_at.toISOString(),
    ...(row.valid_until === null
      ? {}
      : { validUntil: row.valid_until.toISOString().slice(0, 10) }),
    ...(row.terms === null ? {} : { terms: row.terms }),
    ...(hideInternal || row.internal_notes === null
      ? {}
      : { internalNotes: row.internal_notes }),
    ...(row.customer_notes === null
      ? {}
      : { customerNotes: row.customer_notes }),
    ...(row.sent_at === null ? {} : { sentAt: row.sent_at.toISOString() }),
  };
}

function toItem(row: ItemRow): QuotationItemSummary {
  return {
    id: row.id,
    itemType: row.item_type,
    title: row.title,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
    sortOrder: row.sort_order,
    ...(row.description === null ? {} : { description: row.description }),
  };
}

function toActivity(row: ActivityRow): QuotationActivitySummary {
  return {
    id: row.id,
    activityType: row.activity_type,
    occurredAt: row.occurred_at.toISOString(),
    ...(row.content === null ? {} : { content: row.content }),
    ...(row.actor_user_id === null ? {} : { actorUserId: row.actor_user_id }),
  };
}
