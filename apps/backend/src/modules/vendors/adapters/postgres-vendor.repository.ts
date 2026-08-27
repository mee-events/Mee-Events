import { Inject, Injectable } from "@nestjs/common";
import type {
  AddVendorNoteRequest,
  AssignVendorRequest,
  CreateVendorRequest,
  EventTimelineEntry,
  RejectVendorAssignmentRequest,
  UpdateVendorAssignmentRequest,
  UpdateVendorRequest,
  VendorActiveStatus,
  VendorAssignmentDetailResponse,
  VendorAssignmentHistoryEntry,
  VendorAssignmentStatus,
  VendorAssignmentSummary,
  VendorBankAccountSummary,
  VendorCategorySummary,
  VendorContactSummary,
  VendorDashboardResponse,
  VendorDetailResponse,
  VendorNoteSummary,
  VendorNoteType,
  VendorProgressUpdateRequest,
  VendorSummary,
  VendorVerificationStatus,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  appendEventActivity as appendActivity,
  appendEventTimeline as appendTimeline,
  writeAuditOutbox,
} from "../../../common/pattern-b/append-event-pattern-b";
import { appendModuleTimelineAndActivity } from "../../../common/pattern-b/append-module-pattern-b";
import {
  buildVendorNotificationPayload,
  VENDOR_NOTIFICATION_TOPICS,
} from "../application/notification-intents";
import { generateVendorCode } from "../application/vendor-code";
import type {
  VendorListOptions,
  VendorMutationContext,
  VendorRepository,
} from "../ports/vendor-repository";

@Injectable()
export class PostgresVendorRepository implements VendorRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listVendors(options: VendorListOptions): Promise<{
    readonly items: readonly VendorSummary[];
    readonly total: number;
  }> {
    const limit = options.limit ?? 200;
    const offset = options.offset ?? 0;
    const params: unknown[] = [options.branchId];
    let searchClause = "";
    if (options.search !== undefined && options.search.length > 0) {
      params.push(`%${options.search}%`);
      searchClause = ` AND (
        v.business_name ILIKE $${params.length}
        OR v.owner_name ILIKE $${params.length}
        OR v.vendor_code ILIKE $${params.length}
      )`;
    }
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [countResult, result] = await Promise.all([
      this.pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM vendors v
         WHERE v.branch_id = $1${searchClause}`,
        params,
      ),
      this.pool.query<VendorListRow>(
        `SELECT v.id, v.vendor_code, v.business_name, v.owner_name, v.phone_e164, v.email,
                v.city, v.state, v.verification_status, v.active_status,
                v.rating_average::text, v.rating_count, v.created_at, v.updated_at,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                     'id', sc.id, 'code', sc.code, 'displayName', sc.display_name, 'isPrimary', vc.is_primary
                   ) ORDER BY vc.is_primary DESC, sc.display_name)
                   FROM vendor_categories vc
                   INNER JOIN service_categories sc ON sc.id = vc.service_category_id
                   WHERE vc.vendor_id = v.id),
                  '[]'::json
                ) AS categories
         FROM vendors v
         WHERE v.branch_id = $1${searchClause}
         ORDER BY v.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, limit, offset],
      ),
    ]);

    return {
      items: result.rows.map(mapVendorListRow),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  public async getVendor(
    vendorId: string,
    branchId?: string,
  ): Promise<VendorDetailResponse | undefined> {
    const result = await this.pool.query<VendorRow>(
      branchId === undefined
        ? `SELECT * FROM vendors WHERE id = $1`
        : `SELECT * FROM vendors WHERE id = $1 AND branch_id = $2`,
      branchId === undefined ? [vendorId] : [vendorId, branchId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;

    const [categories, banks, contacts, documents] = await Promise.all([
      this.pool.query<{
        id: string;
        code: string;
        display_name: string;
        is_primary: boolean;
      }>(
        `SELECT sc.id, sc.code, sc.display_name, vc.is_primary
         FROM vendor_categories vc
         INNER JOIN service_categories sc ON sc.id = vc.service_category_id
         WHERE vc.vendor_id = $1
         ORDER BY vc.is_primary DESC, sc.display_name`,
        [vendorId],
      ),
      this.pool.query<{
        id: string;
        account_holder_name: string;
        bank_name: string;
        account_number_masked: string;
        ifsc_code: string;
        upi_id: string | null;
        is_primary: boolean;
      }>(
        `SELECT id, account_holder_name, bank_name, account_number_masked,
                ifsc_code, upi_id, is_primary
         FROM vendor_bank_accounts
         WHERE vendor_id = $1 AND status = 'active'
         ORDER BY is_primary DESC`,
        [vendorId],
      ),
      this.pool.query<{
        id: string;
        contact_name: string;
        phone_e164: string | null;
        email: string | null;
        designation: string | null;
        is_primary: boolean;
      }>(
        `SELECT id, contact_name, phone_e164, email, designation, is_primary
         FROM vendor_contacts
         WHERE vendor_id = $1 AND status = 'active'
         ORDER BY is_primary DESC`,
        [vendorId],
      ),
      this.pool.query<{
        id: string;
        doc_type: string;
        status: string;
        file_name: string | null;
        created_at: Date;
      }>(
        `SELECT id, doc_type, status, file_name, created_at
         FROM vendor_documents WHERE vendor_id = $1
         ORDER BY created_at DESC`,
        [vendorId],
      ),
    ]);

    return {
      ...mapVendorRow(row, categories.rows.map(toCategory)),
      bankAccounts: banks.rows.map(
        (b): VendorBankAccountSummary => ({
          id: b.id,
          accountHolderName: b.account_holder_name,
          bankName: b.bank_name,
          accountNumberMasked: b.account_number_masked,
          ifscCode: b.ifsc_code,
          isPrimary: b.is_primary,
          ...(b.upi_id === null ? {} : { upiId: b.upi_id }),
        }),
      ),
      contacts: contacts.rows.map(
        (c): VendorContactSummary => ({
          id: c.id,
          contactName: c.contact_name,
          isPrimary: c.is_primary,
          ...(c.phone_e164 === null ? {} : { phoneE164: c.phone_e164 }),
          ...(c.email === null ? {} : { email: c.email }),
          ...(c.designation === null ? {} : { designation: c.designation }),
        }),
      ),
      documents: documents.rows.map((d) => ({
        id: d.id,
        docType: d.doc_type,
        status: d.status,
        createdAt: d.created_at.toISOString(),
        ...(d.file_name === null ? {} : { fileName: d.file_name }),
      })),
    };
  }

  public async createVendor(
    input: VendorMutationContext & { readonly body: CreateVendorRequest },
  ): Promise<VendorDetailResponse> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const vendorCode = generateVendorCode();
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO vendors (
           branch_id, vendor_code, business_name, owner_name, gst_number, pan_number,
           phone_e164, email, address_line, city, state, pincode, upi_id,
           created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
         RETURNING id`,
        [
          input.branchId,
          vendorCode,
          input.body.businessName,
          input.body.ownerName,
          input.body.gstNumber ?? null,
          input.body.panNumber ?? null,
          input.body.phoneE164,
          input.body.email ?? null,
          input.body.addressLine ?? null,
          input.body.city,
          input.body.state,
          input.body.pincode ?? null,
          input.body.upiId ?? null,
          input.actorUserId,
        ],
      );
      const vendorId = inserted.rows[0]?.id;
      if (vendorId === undefined) throw new Error("Failed to create vendor");

      for (const [index, categoryCode] of input.body.categoryCodes.entries()) {
        const category = await client.query<{ id: string }>(
          `SELECT id FROM service_categories WHERE code = $1 AND active`,
          [categoryCode],
        );
        const categoryId = category.rows[0]?.id;
        if (categoryId === undefined) {
          throw new Error(`Unknown service category: ${categoryCode}`);
        }
        await client.query(
          `INSERT INTO vendor_categories (vendor_id, service_category_id, is_primary)
           VALUES ($1, $2, $3)`,
          [vendorId, categoryId, index === 0],
        );
      }

      if (input.body.bankAccount !== undefined) {
        await client.query(
          `INSERT INTO vendor_bank_accounts (
             vendor_id, account_holder_name, bank_name, account_number_masked,
             ifsc_code, upi_id, is_primary
           ) VALUES ($1,$2,$3,$4,$5,$6,true)`,
          [
            vendorId,
            input.body.bankAccount.accountHolderName,
            input.body.bankAccount.bankName,
            input.body.bankAccount.accountNumberMasked,
            input.body.bankAccount.ifscCode,
            input.body.bankAccount.upiId ?? null,
          ],
        );
      }

      if (input.body.ownerUserId !== undefined) {
        await client.query(
          `INSERT INTO vendor_members (vendor_id, user_id, member_role, status)
           VALUES ($1, $2, 'owner', 'active')
           ON CONFLICT (vendor_id, user_id) DO NOTHING`,
          [vendorId, input.body.ownerUserId],
        );
      }

      const notify = buildVendorNotificationPayload(
        VENDOR_NOTIFICATION_TOPICS.created,
        { vendorId, vendorCode },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: vendorId,
        entityType: "vendor",
        action: "vendor.created",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await appendModuleTimelineAndActivity(client, "vendor", {
        aggregateId: vendorId,
        actorUserId: input.actorUserId,
        entryType: "created",
        title: "Vendor created",
        activityType: "created",
        content: input.body.businessName,
        customerVisible: false,
      });

      await client.query("COMMIT");
      const detail = await this.getVendor(vendorId, input.branchId);
      if (detail === undefined) throw new Error("Vendor missing after create");
      return detail;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateVendor(
    input: VendorMutationContext & {
      readonly vendorId: string;
      readonly body: UpdateVendorRequest;
    },
  ): Promise<VendorDetailResponse | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ version: number }>(
        `SELECT version FROM vendors WHERE id = $1 AND branch_id = $2 FOR UPDATE`,
        [input.vendorId, input.branchId],
      );
      if (current.rows[0] === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `UPDATE vendors SET
           business_name = COALESCE($2, business_name),
           owner_name = COALESCE($3, owner_name),
           phone_e164 = COALESCE($4, phone_e164),
           email = CASE WHEN $5::boolean THEN $6 ELSE email END,
           gst_number = CASE WHEN $7::boolean THEN $8 ELSE gst_number END,
           pan_number = CASE WHEN $9::boolean THEN $10 ELSE pan_number END,
           address_line = CASE WHEN $11::boolean THEN $12 ELSE address_line END,
           city = COALESCE($13, city),
           state = COALESCE($14, state),
           pincode = CASE WHEN $15::boolean THEN $16 ELSE pincode END,
           upi_id = CASE WHEN $17::boolean THEN $18 ELSE upi_id END,
           verification_status = COALESCE($19, verification_status),
           active_status = COALESCE($20, active_status),
           notes = CASE WHEN $21::boolean THEN $22 ELSE notes END,
           updated_by_user_id = $23,
           version = version + 1
         WHERE id = $1 AND branch_id = $24`,
        [
          input.vendorId,
          input.body.businessName ?? null,
          input.body.ownerName ?? null,
          input.body.phoneE164 ?? null,
          input.body.email !== undefined,
          input.body.email ?? null,
          input.body.gstNumber !== undefined,
          input.body.gstNumber ?? null,
          input.body.panNumber !== undefined,
          input.body.panNumber ?? null,
          input.body.addressLine !== undefined,
          input.body.addressLine ?? null,
          input.body.city ?? null,
          input.body.state ?? null,
          input.body.pincode !== undefined,
          input.body.pincode ?? null,
          input.body.upiId !== undefined,
          input.body.upiId ?? null,
          input.body.verificationStatus ?? null,
          input.body.activeStatus ?? null,
          input.body.notes !== undefined,
          input.body.notes ?? null,
          input.actorUserId,
          input.branchId,
        ],
      );

      if (input.body.categoryCodes !== undefined) {
        await client.query(
          `DELETE FROM vendor_categories WHERE vendor_id = $1`,
          [input.vendorId],
        );
        for (const [
          index,
          categoryCode,
        ] of input.body.categoryCodes.entries()) {
          const category = await client.query<{ id: string }>(
            `SELECT id FROM service_categories WHERE code = $1 AND active`,
            [categoryCode],
          );
          const categoryId = category.rows[0]?.id;
          if (categoryId === undefined) {
            throw new Error(`Unknown service category: ${categoryCode}`);
          }
          await client.query(
            `INSERT INTO vendor_categories (vendor_id, service_category_id, is_primary)
             VALUES ($1, $2, $3)`,
            [input.vendorId, categoryId, index === 0],
          );
        }
      }

      const notify = buildVendorNotificationPayload(
        VENDOR_NOTIFICATION_TOPICS.updated,
        { vendorId: input.vendorId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.vendorId,
        entityType: "vendor",
        action: "vendor.updated",
        version: current.rows[0].version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await appendModuleTimelineAndActivity(client, "vendor", {
        aggregateId: input.vendorId,
        actorUserId: input.actorUserId,
        entryType: "updated",
        title: "Vendor updated",
        activityType: "updated",
        customerVisible: false,
      });

      await client.query("COMMIT");
      return await this.getVendor(input.vendorId, input.branchId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async assignVendor(
    input: VendorMutationContext & { readonly body: AssignVendorRequest },
  ): Promise<VendorAssignmentSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const event = await client.query<{
        id: string;
        branch_id: string;
        status: string;
        version: number;
        assigned_manager_user_id: string | null;
        event_number: string;
      }>(
        `SELECT id, branch_id, status, version, assigned_manager_user_id, event_number
         FROM event_records WHERE id = $1 AND branch_id = $2 FOR UPDATE`,
        [input.body.eventRecordId, input.branchId],
      );
      const locked = event.rows[0];
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const vendor = await client.query<{ id: string; business_name: string }>(
        `SELECT id, business_name FROM vendors WHERE id = $1 AND active_status = 'active' AND branch_id = $2`,
        [input.body.vendorId, input.branchId],
      );
      if (vendor.rows[0] === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      let serviceCategoryId: string | null = null;
      if (input.body.serviceCategoryCode !== undefined) {
        const category = await client.query<{ id: string }>(
          `SELECT id FROM service_categories WHERE code = $1 AND active`,
          [input.body.serviceCategoryCode],
        );
        serviceCategoryId = category.rows[0]?.id ?? null;
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO vendor_assignments (
           event_record_id, vendor_id, service_category_id, assigned_by_user_id,
           assigned_manager_user_id, status, expected_arrival_at,
           expected_completion_at, assignment_notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.vendorId,
          serviceCategoryId,
          input.actorUserId,
          input.body.assignedManagerUserId ?? locked.assigned_manager_user_id,
          input.body.status,
          input.body.expectedArrivalAt ?? null,
          input.body.expectedCompletionAt ?? null,
          input.body.assignmentNotes ?? null,
        ],
      );
      const assignmentId = inserted.rows[0]?.id;
      if (assignmentId === undefined) throw new Error("Assign failed");

      await appendAssignmentHistory(client, {
        assignmentId,
        actorUserId: input.actorUserId,
        changeType: "created",
        toStatus: input.body.status,
        summary: `Vendor ${vendor.rows[0].business_name} assigned`,
      });

      if (
        locked.status === "manager_assigned" ||
        locked.status === "booking_confirmed"
      ) {
        await client.query(
          `UPDATE event_records
           SET status = 'vendor_assigned', updated_by_user_id = $2, version = version + 1
           WHERE id = $1 AND branch_id = $3`,
          [input.body.eventRecordId, input.actorUserId, input.branchId],
        );
        await client.query(
          `INSERT INTO event_status_history (
             event_record_id, from_status, to_status, actor_user_id, reason
           ) VALUES ($1, $2, 'vendor_assigned', $3, 'Vendor assigned')`,
          [input.body.eventRecordId, locked.status, input.actorUserId],
        );
      }

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "vendor_assigned",
        title: "Vendor assigned",
        content: `${vendor.rows[0].business_name} assigned to event`,
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "vendor_assignment",
        content: `Vendor assigned: ${vendor.rows[0].business_name}`,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "vendor", {
        aggregateId: input.body.vendorId,
        actorUserId: input.actorUserId,
        entryType: "vendor_assigned",
        title: "Vendor assigned",
        activityType: "vendor_assignment",
        content: `${vendor.rows[0].business_name} assigned to event`,
        customerVisible: true,
      });

      const notify = buildVendorNotificationPayload(
        VENDOR_NOTIFICATION_TOPICS.assigned,
        {
          assignmentId,
          vendorId: input.body.vendorId,
          eventRecordId: input.body.eventRecordId,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "vendor.assigned",
        version: locked.version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadAssignmentSummary(
        client,
        assignmentId,
        input.branchId,
      );
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateAssignment(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateVendorAssignmentRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined> {
    return this.mutateAssignmentStatus(input.assignmentId, input, {
      ...(input.body.status === undefined ? {} : { status: input.body.status }),
      ...(input.body.expectedArrivalAt === undefined
        ? {}
        : { expectedArrivalAt: input.body.expectedArrivalAt }),
      ...(input.body.expectedCompletionAt === undefined
        ? {}
        : { expectedCompletionAt: input.body.expectedCompletionAt }),
      ...(input.body.assignmentNotes === undefined
        ? {}
        : { assignmentNotes: input.body.assignmentNotes }),
      changeType: "status_changed",
      timelineType:
        input.body.status === "completed"
          ? "vendor_completed"
          : "vendor_assigned",
      notifyTopic:
        input.body.status === "completed"
          ? VENDOR_NOTIFICATION_TOPICS.completed
          : VENDOR_NOTIFICATION_TOPICS.updated,
    });
  }

  public async acceptAssignment(
    input: VendorMutationContext & { readonly assignmentId: string },
  ): Promise<VendorAssignmentSummary | undefined> {
    return this.mutateAssignmentStatus(input.assignmentId, input, {
      status: "accepted",
      setAcceptedAt: true,
      changeType: "accepted",
      timelineType: "vendor_accepted",
      notifyTopic: VENDOR_NOTIFICATION_TOPICS.accepted,
      summaryText: "Vendor accepted assignment",
    });
  }

  public async rejectAssignment(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: RejectVendorAssignmentRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined> {
    return this.mutateAssignmentStatus(input.assignmentId, input, {
      status: "rejected",
      rejectionReason: input.body.reason,
      changeType: "rejected",
      timelineType: "vendor_rejected",
      notifyTopic: VENDOR_NOTIFICATION_TOPICS.rejected,
      summaryText: `Vendor rejected: ${input.body.reason}`,
    });
  }

  public async updateProgress(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: VendorProgressUpdateRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined> {
    const nextStatus = input.body.status;
    return this.mutateAssignmentStatus(input.assignmentId, input, {
      ...(nextStatus === undefined ? {} : { status: nextStatus }),
      progressSummary: input.body.summary,
      setCompletedAt: nextStatus === "completed",
      changeType: nextStatus === "completed" ? "completed" : "progress_updated",
      timelineType:
        nextStatus === "completed"
          ? "vendor_completed"
          : "vendor_progress_updated",
      notifyTopic:
        nextStatus === "completed"
          ? VENDOR_NOTIFICATION_TOPICS.completed
          : VENDOR_NOTIFICATION_TOPICS.progressUpdated,
      summaryText: input.body.summary,
      noteAsProgress: true,
    });
  }

  public async listAssignments(filters?: {
    readonly vendorId?: string;
    readonly eventRecordId?: string;
    readonly branchId?: string;
    readonly limit?: number;
    readonly offset?: number;
  }): Promise<readonly VendorAssignmentSummary[]> {
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (filters?.vendorId !== undefined) {
      params.push(filters.vendorId);
      clauses.push(`a.vendor_id = $${params.length}`);
    }
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`a.event_record_id = $${params.length}`);
    }
    if (filters?.branchId !== undefined) {
      params.push(filters.branchId);
      clauses.push(
        `v.branch_id = $${params.length} AND e.branch_id = $${params.length}`,
      );
    }
    const where = clauses.length === 0 ? "" : `WHERE ${clauses.join(" AND ")}`;
    const limit = filters?.limit ?? 200;
    const offset = filters?.offset ?? 0;
    params.push(limit, offset);
    const result = await this.pool.query<AssignmentSummaryRow>(
      `SELECT a.*, e.event_number, e.event_name, v.business_name,
              sc.display_name AS service_category_name
       FROM vendor_assignments a
       INNER JOIN event_records e ON e.id = a.event_record_id
       INNER JOIN vendors v ON v.id = a.vendor_id
       LEFT JOIN service_categories sc ON sc.id = a.service_category_id
       ${where}
       ORDER BY a.assigned_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows.map(mapAssignmentRow);
  }

  public async getAssignment(
    assignmentId: string,
    branchId?: string,
  ): Promise<VendorAssignmentDetailResponse | undefined> {
    const summary = await loadAssignmentSummary(
      this.pool,
      assignmentId,
      branchId,
    );
    if (summary === undefined) return undefined;

    const [history, notes, timeline] = await Promise.all([
      this.pool.query<{
        id: string;
        assignment_id: string;
        change_type: string;
        from_status: string | null;
        to_status: string | null;
        summary: string;
        actor_user_id: string | null;
        occurred_at: Date;
      }>(
        `SELECT * FROM vendor_assignment_history
         WHERE assignment_id = $1 ORDER BY occurred_at DESC`,
        [assignmentId],
      ),
      this.pool.query<NoteRow>(
        `SELECT * FROM vendor_notes WHERE assignment_id = $1
         ORDER BY created_at DESC`,
        [assignmentId],
      ),
      this.pool.query<{
        id: string;
        entry_type: string;
        title: string;
        content: string | null;
        customer_visible: boolean;
        actor_user_id: string | null;
        occurred_at: Date;
      }>(
        `SELECT id, entry_type, title, content, customer_visible, actor_user_id, occurred_at
         FROM event_timelines
         WHERE event_record_id = $1
         ORDER BY occurred_at DESC
         LIMIT 50`,
        [summary.eventRecordId],
      ),
    ]);

    return {
      ...summary,
      history: history.rows.map(
        (h): VendorAssignmentHistoryEntry => ({
          id: h.id,
          assignmentId: h.assignment_id,
          changeType: h.change_type,
          summary: h.summary,
          occurredAt: h.occurred_at.toISOString(),
          ...(h.from_status === null ? {} : { fromStatus: h.from_status }),
          ...(h.to_status === null ? {} : { toStatus: h.to_status }),
          ...(h.actor_user_id === null ? {} : { actorUserId: h.actor_user_id }),
        }),
      ),
      notes: notes.rows.map(toNote),
      timeline: timeline.rows.map(
        (t): EventTimelineEntry => ({
          id: t.id,
          entryType: t.entry_type as EventTimelineEntry["entryType"],
          title: t.title,
          customerVisible: t.customer_visible,
          occurredAt: t.occurred_at.toISOString(),
          ...(t.content === null ? {} : { content: t.content }),
          ...(t.actor_user_id === null ? {} : { actorUserId: t.actor_user_id }),
        }),
      ),
    };
  }

  public async addNote(
    input: VendorMutationContext & {
      readonly vendorId: string;
      readonly body: AddVendorNoteRequest;
    },
  ): Promise<VendorNoteSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const vendor = await client.query(
        `SELECT id FROM vendors WHERE id = $1 AND branch_id = $2`,
        [input.vendorId, input.branchId],
      );
      if ((vendor.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const inserted = await client.query<NoteRow>(
        `INSERT INTO vendor_notes (
           vendor_id, assignment_id, event_record_id, note_type, content, created_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          input.vendorId,
          input.body.assignmentId ?? null,
          input.body.eventRecordId ?? null,
          input.body.noteType,
          input.body.content,
          input.actorUserId,
        ],
      );
      const note = inserted.rows[0];
      if (note === undefined) throw new Error("Failed to add note");

      if (input.body.assignmentId !== undefined) {
        await appendAssignmentHistory(client, {
          assignmentId: input.body.assignmentId,
          actorUserId: input.actorUserId,
          changeType: "note_added",
          summary: input.body.content.slice(0, 200),
        });
      }

      if (input.body.eventRecordId !== undefined) {
        await appendTimeline(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          entryType: "vendor_note_added",
          title: "Vendor note added",
          content: input.body.content,
          customerVisible: false,
        });
        await appendActivity(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          activityType: "vendor_note",
          content: input.body.content,
          customerVisible: false,
        });
        await appendModuleTimelineAndActivity(client, "vendor", {
          aggregateId: input.vendorId,
          actorUserId: input.actorUserId,
          entryType: "vendor_note_added",
          title: "Vendor note added",
          activityType: "vendor_note",
          content: input.body.content,
          customerVisible: false,
        });
      }

      const notify = buildVendorNotificationPayload(
        VENDOR_NOTIFICATION_TOPICS.noteAdded,
        { vendorId: input.vendorId, noteId: note.id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.vendorId,
        entityType: "vendor",
        action: "vendor.note_added",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
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

  public async getCrmDashboard(
    branchId: string,
  ): Promise<VendorDashboardResponse> {
    const [vendorCount, assignmentStats, vendorsResult, assignments] =
      await Promise.all([
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM vendors WHERE branch_id = $1`,
          [branchId],
        ),
        this.pool.query<{
          active: string;
          pending: string;
          completed: string;
        }>(
          `SELECT
             COUNT(*) FILTER (
               WHERE a.status NOT IN ('rejected', 'cancelled', 'completed')
             )::text AS active,
             COUNT(*) FILTER (
               WHERE a.status IN ('invited', 'assigned')
             )::text AS pending,
             COUNT(*) FILTER (WHERE a.status = 'completed')::text AS completed
           FROM vendor_assignments a
           INNER JOIN vendors v ON v.id = a.vendor_id
           WHERE v.branch_id = $1`,
          [branchId],
        ),
        this.listVendors({ branchId, limit: 50 }),
        this.listAssignments({ branchId, limit: 200 }),
      ]);

    const open = assignments.filter(
      (a) => !["rejected", "cancelled", "completed"].includes(a.status),
    );
    return {
      totalVendors: Number(vendorCount.rows[0]?.count ?? 0),
      activeAssignments: Number(assignmentStats.rows[0]?.active ?? 0),
      pendingAcceptances: Number(assignmentStats.rows[0]?.pending ?? 0),
      completedAssignments: Number(assignmentStats.rows[0]?.completed ?? 0),
      vendors: vendorsResult.items,
      openAssignments: open.slice(0, 50),
    };
  }

  public async getVendorDashboard(
    userId: string,
  ): Promise<VendorDashboardResponse> {
    const vendorId = await this.findVendorIdForUser(userId);
    if (vendorId === undefined) {
      return {
        totalVendors: 0,
        activeAssignments: 0,
        pendingAcceptances: 0,
        completedAssignments: 0,
        vendors: [],
        openAssignments: [],
      };
    }
    const detail = await this.getVendor(vendorId);
    const assignments = await this.listAssignments({ vendorId });
    return buildDashboard(
      detail === undefined ? [] : [toSummary(detail)],
      assignments,
    );
  }

  public async findVendorIdForUser(
    userId: string,
  ): Promise<string | undefined> {
    const result = await this.pool.query<{ vendor_id: string }>(
      `SELECT vendor_id FROM vendor_members
       WHERE user_id = $1 AND status = 'active'
       ORDER BY CASE member_role WHEN 'owner' THEN 0 ELSE 1 END
       LIMIT 1`,
      [userId],
    );
    return result.rows[0]?.vendor_id;
  }

  public async isVendorMember(
    vendorId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM vendor_members
       WHERE vendor_id = $1 AND user_id = $2 AND status = 'active'`,
      [vendorId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async mutateAssignmentStatus(
    assignmentId: string,
    ctx: VendorMutationContext,
    patch: {
      readonly status?: VendorAssignmentStatus;
      readonly expectedArrivalAt?: string | null;
      readonly expectedCompletionAt?: string | null;
      readonly assignmentNotes?: string | null;
      readonly rejectionReason?: string;
      readonly progressSummary?: string;
      readonly setAcceptedAt?: boolean;
      readonly setCompletedAt?: boolean;
      readonly changeType: string;
      readonly timelineType: string;
      readonly notifyTopic: string;
      readonly summaryText?: string;
      readonly noteAsProgress?: boolean;
    },
  ): Promise<VendorAssignmentSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{
        id: string;
        event_record_id: string;
        vendor_id: string;
        status: VendorAssignmentStatus;
        version: number;
        branch_id: string;
      }>(
        `SELECT a.id, a.event_record_id, a.vendor_id, a.status, a.version, e.branch_id
         FROM vendor_assignments a
         INNER JOIN event_records e ON e.id = a.event_record_id
         WHERE a.id = $1 AND e.branch_id = $2
         FOR UPDATE OF a`,
        [assignmentId, ctx.branchId],
      );
      const row = current.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const nextStatus = patch.status ?? row.status;
      await client.query(
        `UPDATE vendor_assignments SET
           status = $2,
           expected_arrival_at = CASE WHEN $3::boolean THEN $4::timestamptz ELSE expected_arrival_at END,
           expected_completion_at = CASE WHEN $5::boolean THEN $6::timestamptz ELSE expected_completion_at END,
           assignment_notes = CASE WHEN $7::boolean THEN $8 ELSE assignment_notes END,
           rejection_reason = COALESCE($9, rejection_reason),
           latest_progress_summary = COALESCE($10, latest_progress_summary),
           accepted_at = CASE WHEN $11::boolean THEN COALESCE(accepted_at, now()) ELSE accepted_at END,
           completed_at = CASE WHEN $12::boolean THEN COALESCE(completed_at, now()) ELSE completed_at END,
           version = version + 1
         WHERE id = $1`,
        [
          assignmentId,
          nextStatus,
          patch.expectedArrivalAt !== undefined,
          patch.expectedArrivalAt ?? null,
          patch.expectedCompletionAt !== undefined,
          patch.expectedCompletionAt ?? null,
          patch.assignmentNotes !== undefined,
          patch.assignmentNotes ?? null,
          patch.rejectionReason ?? null,
          patch.progressSummary ?? null,
          patch.setAcceptedAt === true || nextStatus === "accepted",
          patch.setCompletedAt === true || nextStatus === "completed",
        ],
      );

      await appendAssignmentHistory(client, {
        assignmentId,
        actorUserId: ctx.actorUserId,
        changeType: patch.changeType,
        fromStatus: row.status,
        toStatus: nextStatus,
        summary: patch.summaryText ?? `Status ${row.status} → ${nextStatus}`,
      });

      if (
        patch.noteAsProgress === true &&
        patch.progressSummary !== undefined
      ) {
        await client.query(
          `INSERT INTO vendor_notes (
             vendor_id, assignment_id, event_record_id, note_type, content, created_by_user_id
           ) VALUES ($1,$2,$3,'progress',$4,$5)`,
          [
            row.vendor_id,
            assignmentId,
            row.event_record_id,
            patch.progressSummary,
            ctx.actorUserId,
          ],
        );
      }

      await appendTimeline(client, {
        eventRecordId: row.event_record_id,
        actorUserId: ctx.actorUserId,
        entryType: patch.timelineType,
        title: patch.summaryText ?? `Vendor ${nextStatus.replaceAll("_", " ")}`,
        content: patch.progressSummary ?? patch.summaryText ?? nextStatus,
        customerVisible:
          patch.timelineType === "vendor_accepted" ||
          patch.timelineType === "vendor_completed",
      });
      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: ctx.actorUserId,
        activityType:
          patch.noteAsProgress === true
            ? "vendor_progress"
            : "vendor_assignment",
        content: patch.summaryText ?? nextStatus,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "vendor", {
        aggregateId: row.vendor_id,
        actorUserId: ctx.actorUserId,
        entryType: patch.timelineType,
        title: patch.summaryText ?? `Vendor ${nextStatus.replaceAll("_", " ")}`,
        activityType:
          patch.noteAsProgress === true
            ? "vendor_progress"
            : "vendor_assignment",
        content: patch.progressSummary ?? patch.summaryText ?? nextStatus,
        customerVisible:
          patch.timelineType === "vendor_accepted" ||
          patch.timelineType === "vendor_completed",
      });

      const notify = buildVendorNotificationPayload(
        patch.notifyTopic as never,
        {
          assignmentId,
          vendorId: row.vendor_id,
          eventRecordId: row.event_record_id,
          status: nextStatus,
        },
      );
      await writeAuditOutbox(client, {
        requestId: ctx.requestId,
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        branchId: row.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: patch.notifyTopic,
        version: row.version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadAssignmentSummary(
        client,
        assignmentId,
        ctx.branchId,
      );
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

interface VendorListRow {
  readonly id: string;
  readonly vendor_code: string;
  readonly business_name: string;
  readonly owner_name: string;
  readonly phone_e164: string;
  readonly email: string | null;
  readonly city: string;
  readonly state: string;
  readonly verification_status: VendorVerificationStatus;
  readonly active_status: VendorActiveStatus;
  readonly rating_average: string;
  readonly rating_count: number;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly categories: unknown;
}

interface VendorRow {
  readonly id: string;
  readonly vendor_code: string;
  readonly business_name: string;
  readonly owner_name: string;
  readonly gst_number: string | null;
  readonly pan_number: string | null;
  readonly phone_e164: string;
  readonly email: string | null;
  readonly address_line: string | null;
  readonly city: string;
  readonly state: string;
  readonly pincode: string | null;
  readonly upi_id: string | null;
  readonly verification_status: VendorVerificationStatus;
  readonly active_status: VendorActiveStatus;
  readonly rating_average: string;
  readonly rating_count: number;
  readonly notes: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface NoteRow {
  readonly id: string;
  readonly vendor_id: string;
  readonly assignment_id: string | null;
  readonly event_record_id: string | null;
  readonly note_type: VendorNoteType;
  readonly content: string;
  readonly created_by_user_id: string | null;
  readonly created_at: Date;
}

interface AssignmentSummaryRow {
  readonly id: string;
  readonly event_record_id: string;
  readonly event_number: string | null;
  readonly event_name: string | null;
  readonly vendor_id: string;
  readonly business_name: string | null;
  readonly service_category_id: string | null;
  readonly service_category_name: string | null;
  readonly assigned_by_user_id: string | null;
  readonly assigned_manager_user_id: string | null;
  readonly status: VendorAssignmentStatus;
  readonly expected_arrival_at: Date | null;
  readonly expected_completion_at: Date | null;
  readonly assignment_notes: string | null;
  readonly rejection_reason: string | null;
  readonly latest_progress_summary: string | null;
  readonly assigned_at: Date;
  readonly accepted_at: Date | null;
  readonly completed_at: Date | null;
  readonly version: number;
}

function mapVendorListRow(row: VendorListRow): VendorSummary {
  const categoriesRaw = row.categories;
  const categories = Array.isArray(categoriesRaw)
    ? (categoriesRaw as readonly VendorCategorySummary[])
    : [];
  return {
    id: row.id,
    vendorCode: row.vendor_code,
    businessName: row.business_name,
    ownerName: row.owner_name,
    phoneE164: row.phone_e164,
    city: row.city,
    state: row.state,
    verificationStatus: row.verification_status,
    activeStatus: row.active_status,
    ratingAverage: String(row.rating_average),
    ratingCount: row.rating_count,
    categories,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.email === null ? {} : { email: row.email }),
  };
}

function mapVendorRow(
  row: VendorRow,
  categories: readonly VendorCategorySummary[],
): VendorDetailResponse {
  return {
    id: row.id,
    vendorCode: row.vendor_code,
    businessName: row.business_name,
    ownerName: row.owner_name,
    phoneE164: row.phone_e164,
    city: row.city,
    state: row.state,
    verificationStatus: row.verification_status,
    activeStatus: row.active_status,
    ratingAverage: String(row.rating_average),
    ratingCount: row.rating_count,
    categories,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    bankAccounts: [],
    contacts: [],
    documents: [],
    ...(row.email === null ? {} : { email: row.email }),
    ...(row.gst_number === null ? {} : { gstNumber: row.gst_number }),
    ...(row.pan_number === null ? {} : { panNumber: row.pan_number }),
    ...(row.address_line === null ? {} : { addressLine: row.address_line }),
    ...(row.pincode === null ? {} : { pincode: row.pincode }),
    ...(row.upi_id === null ? {} : { upiId: row.upi_id }),
    ...(row.notes === null ? {} : { notes: row.notes }),
  };
}

function toSummary(detail: VendorDetailResponse): VendorSummary {
  const {
    bankAccounts: _b,
    contacts: _c,
    documents: _d,
    gstNumber: _g,
    panNumber: _p,
    addressLine: _a,
    pincode: _pin,
    upiId: _u,
    notes: _n,
    ...summary
  } = detail;
  return summary;
}

function toCategory(row: {
  id: string;
  code: string;
  display_name: string;
  is_primary: boolean;
}): VendorCategorySummary {
  return {
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    isPrimary: row.is_primary,
  };
}

function toNote(row: NoteRow): VendorNoteSummary {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    noteType: row.note_type,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    ...(row.assignment_id === null ? {} : { assignmentId: row.assignment_id }),
    ...(row.event_record_id === null
      ? {}
      : { eventRecordId: row.event_record_id }),
    ...(row.created_by_user_id === null
      ? {}
      : { createdByUserId: row.created_by_user_id }),
  };
}

function buildDashboard(
  vendors: readonly VendorSummary[],
  assignments: readonly VendorAssignmentSummary[],
): VendorDashboardResponse {
  const open = assignments.filter(
    (a) => !["rejected", "cancelled", "completed"].includes(a.status),
  );
  return {
    totalVendors: vendors.length,
    activeAssignments: open.length,
    pendingAcceptances: assignments.filter(
      (a) => a.status === "invited" || a.status === "assigned",
    ).length,
    completedAssignments: assignments.filter((a) => a.status === "completed")
      .length,
    vendors,
    openAssignments: open.slice(0, 50),
  };
}

function mapAssignmentRow(row: AssignmentSummaryRow): VendorAssignmentSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    vendorId: row.vendor_id,
    status: row.status,
    assignedAt: row.assigned_at.toISOString(),
    version: row.version,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.event_name === null ? {} : { eventName: row.event_name }),
    ...(row.business_name === null
      ? {}
      : { vendorBusinessName: row.business_name }),
    ...(row.service_category_id === null
      ? {}
      : { serviceCategoryId: row.service_category_id }),
    ...(row.service_category_name === null
      ? {}
      : { serviceCategoryName: row.service_category_name }),
    ...(row.assigned_by_user_id === null
      ? {}
      : { assignedByUserId: row.assigned_by_user_id }),
    ...(row.assigned_manager_user_id === null
      ? {}
      : { assignedManagerUserId: row.assigned_manager_user_id }),
    ...(row.expected_arrival_at === null
      ? {}
      : { expectedArrivalAt: row.expected_arrival_at.toISOString() }),
    ...(row.expected_completion_at === null
      ? {}
      : { expectedCompletionAt: row.expected_completion_at.toISOString() }),
    ...(row.assignment_notes === null
      ? {}
      : { assignmentNotes: row.assignment_notes }),
    ...(row.rejection_reason === null
      ? {}
      : { rejectionReason: row.rejection_reason }),
    ...(row.latest_progress_summary === null
      ? {}
      : { latestProgressSummary: row.latest_progress_summary }),
    ...(row.accepted_at === null
      ? {}
      : { acceptedAt: row.accepted_at.toISOString() }),
    ...(row.completed_at === null
      ? {}
      : { completedAt: row.completed_at.toISOString() }),
  };
}

async function loadAssignmentSummary(
  db: Pool | PoolClient,
  assignmentId: string,
  branchId?: string,
): Promise<VendorAssignmentSummary | undefined> {
  const params: unknown[] = [assignmentId];
  let sql = `SELECT a.*, e.event_number, e.event_name, v.business_name,
            sc.display_name AS service_category_name
     FROM vendor_assignments a
     INNER JOIN event_records e ON e.id = a.event_record_id
     INNER JOIN vendors v ON v.id = a.vendor_id
     LEFT JOIN service_categories sc ON sc.id = a.service_category_id
     WHERE a.id = $1`;
  if (branchId !== undefined) {
    params.push(branchId);
    sql += ` AND e.branch_id = $2`;
  }
  const result = await db.query<AssignmentSummaryRow>(sql, params);
  const row = result.rows[0];
  if (row === undefined) return undefined;
  return mapAssignmentRow(row);
}

async function appendAssignmentHistory(
  client: PoolClient,
  input: {
    readonly assignmentId: string;
    readonly actorUserId: string;
    readonly changeType: string;
    readonly summary: string;
    readonly fromStatus?: string;
    readonly toStatus?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO vendor_assignment_history (
       assignment_id, actor_user_id, change_type, from_status, to_status, summary
     ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      input.assignmentId,
      input.actorUserId,
      input.changeType,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.summary,
    ],
  );
}
