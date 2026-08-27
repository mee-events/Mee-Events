import { Inject, Injectable } from "@nestjs/common";
import type {
  AddWorkerNoteRequest,
  AssignWorkerRequest,
  CreateWorkerRequest,
  EventTimelineEntry,
  RejectWorkerTaskRequest,
  UpdateWorkerRequest,
  WorkerAttendanceStatus,
  WorkerAttendanceSummary,
  WorkerAvailabilityStatus,
  WorkerCheckInRequest,
  WorkerCheckInSummary,
  WorkerCheckOutRequest,
  WorkerDashboardResponse,
  WorkerDetailResponse,
  WorkerEmploymentType,
  WorkerMembershipSummary,
  WorkerNoteSummary,
  WorkerNoteType,
  WorkerProgressSummary,
  WorkerProgressUpdateRequest,
  WorkerSkillSummary,
  WorkerStatus,
  WorkerSummary,
  WorkerTaskDetailResponse,
  WorkerTaskHistoryEntry,
  WorkerTaskStatus,
  WorkerTaskSummary,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  appendEventActivity,
  appendEventTimeline,
  writeAuditOutbox,
} from "../../../common/pattern-b/append-event-pattern-b";
import { appendModuleTimelineAndActivity } from "../../../common/pattern-b/append-module-pattern-b";
import {
  buildWorkerNotificationPayload,
  WORKER_NOTIFICATION_TOPICS,
} from "../application/notification-intents";
import { generateWorkerCode } from "../application/worker-code";
import type {
  WorkerListOptions,
  WorkerMutationContext,
  WorkerRepository,
} from "../ports/worker-repository";

@Injectable()
export class PostgresWorkerRepository implements WorkerRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listWorkers(options: WorkerListOptions): Promise<{
    readonly items: readonly WorkerSummary[];
    readonly total: number;
  }> {
    const limit = options.limit ?? 200;
    const offset = options.offset ?? 0;
    const params: unknown[] = [options.branchId];
    const clauses = [`w.branch_id = $1`];

    const membershipJoin =
      options.vendorId === undefined
        ? `LEFT JOIN worker_vendor_membership m
             ON m.worker_id = w.id AND m.is_primary AND m.status = 'active'`
        : `INNER JOIN worker_vendor_membership m
             ON m.worker_id = w.id AND m.is_primary AND m.status = 'active'`;

    if (options.vendorId !== undefined) {
      params.push(options.vendorId);
      clauses.push(`m.vendor_id = $${params.length}`);
    }
    if (options.search !== undefined && options.search.length > 0) {
      params.push(`%${options.search}%`);
      clauses.push(
        `(w.display_name ILIKE $${params.length}
          OR w.worker_code ILIKE $${params.length}
          OR w.phone_e164 ILIKE $${params.length}
          OR COALESCE(w.email, '') ILIKE $${params.length})`,
      );
    }

    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const result = await this.pool.query<WorkerListRow>(
      `SELECT
         w.id,
         w.worker_code,
         w.display_name,
         w.phone_e164,
         w.email,
         w.photo_placeholder,
         w.status,
         w.availability_status,
         w.created_at,
         w.updated_at,
         m.vendor_id AS primary_vendor_id,
         v.business_name AS primary_vendor_name,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', s.id,
                 'skillCode', s.skill_code,
                 'skillLabel', s.skill_label,
                 'proficiency', s.proficiency
               )
               ORDER BY s.skill_label
             )
             FROM worker_skills s
             WHERE s.worker_id = w.id AND s.status = 'active'
           ),
           '[]'::json
         ) AS skills,
         COUNT(*) OVER()::int AS total_count
       FROM workers w
       ${membershipJoin}
       LEFT JOIN vendors v ON v.id = m.vendor_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY w.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const total = result.rows[0]?.total_count ?? 0;
    return {
      items: result.rows.map(mapWorkerListRow),
      total,
    };
  }

  public async getWorker(
    workerId: string,
    branchId?: string,
  ): Promise<WorkerDetailResponse | undefined> {
    const result = await this.pool.query<WorkerRow>(
      branchId === undefined
        ? `SELECT * FROM workers WHERE id = $1`
        : `SELECT * FROM workers WHERE id = $1 AND branch_id = $2`,
      branchId === undefined ? [workerId] : [workerId, branchId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;

    const [profile, memberships, skills, documents] = await Promise.all([
      this.pool.query<ProfileRow>(
        `SELECT * FROM worker_profiles WHERE worker_id = $1`,
        [workerId],
      ),
      this.pool.query<{
        id: string;
        vendor_id: string | null;
        business_name: string | null;
        employment_type: WorkerEmploymentType;
        membership_role: string;
        status: string;
        is_primary: boolean;
      }>(
        `SELECT m.id, m.vendor_id, v.business_name, m.employment_type,
                m.membership_role, m.status, m.is_primary
         FROM worker_vendor_membership m
         LEFT JOIN vendors v ON v.id = m.vendor_id
         WHERE m.worker_id = $1
         ORDER BY m.is_primary DESC, m.created_at DESC`,
        [workerId],
      ),
      this.pool.query<{
        id: string;
        skill_code: string;
        skill_label: string;
        proficiency: string;
      }>(
        `SELECT id, skill_code, skill_label, proficiency
         FROM worker_skills WHERE worker_id = $1 AND status = 'active'
         ORDER BY skill_label`,
        [workerId],
      ),
      this.pool.query<{
        id: string;
        doc_type: string;
        status: string;
        file_name: string | null;
        created_at: Date;
      }>(
        `SELECT id, doc_type, status, file_name, created_at
         FROM worker_documents WHERE worker_id = $1
         ORDER BY created_at DESC`,
        [workerId],
      ),
    ]);

    const primary = memberships.rows.find((m) => m.is_primary);
    const profileRow = profile.rows[0];

    return {
      id: row.id,
      workerCode: row.worker_code,
      displayName: row.display_name,
      phoneE164: row.phone_e164,
      status: row.status,
      availabilityStatus: row.availability_status,
      skills: skills.rows.map(
        (s): WorkerSkillSummary => ({
          id: s.id,
          skillCode: s.skill_code,
          skillLabel: s.skill_label,
          proficiency: s.proficiency,
        }),
      ),
      memberships: memberships.rows.map(
        (m): WorkerMembershipSummary => ({
          id: m.id,
          employmentType: m.employment_type,
          membershipRole: m.membership_role,
          status: m.status,
          isPrimary: m.is_primary,
          ...(m.vendor_id === null ? {} : { vendorId: m.vendor_id }),
          ...(m.business_name === null
            ? {}
            : { vendorBusinessName: m.business_name }),
        }),
      ),
      documents: documents.rows.map((d) => ({
        id: d.id,
        docType: d.doc_type,
        status: d.status,
        createdAt: d.created_at.toISOString(),
        ...(d.file_name === null ? {} : { fileName: d.file_name }),
      })),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      ...(row.email === null ? {} : { email: row.email }),
      ...(row.photo_placeholder === null
        ? {}
        : { photoPlaceholder: row.photo_placeholder }),
      ...(row.user_id === null ? {} : { userId: row.user_id }),
      ...(primary?.vendor_id == null
        ? {}
        : { primaryVendorId: primary.vendor_id }),
      ...(primary?.business_name == null
        ? {}
        : { primaryVendorName: primary.business_name }),
      ...(profileRow?.experience_years == null
        ? {}
        : { experienceYears: profileRow.experience_years }),
      ...(profileRow?.emergency_contact_name == null
        ? {}
        : { emergencyContactName: profileRow.emergency_contact_name }),
      ...(profileRow?.emergency_contact_phone == null
        ? {}
        : { emergencyContactPhone: profileRow.emergency_contact_phone }),
      ...(profileRow?.bank_account_holder == null
        ? {}
        : { bankAccountHolder: profileRow.bank_account_holder }),
      ...(profileRow?.bank_name == null
        ? {}
        : { bankName: profileRow.bank_name }),
      ...(profileRow?.account_number_masked == null
        ? {}
        : { accountNumberMasked: profileRow.account_number_masked }),
      ...(profileRow?.ifsc_code == null
        ? {}
        : { ifscCode: profileRow.ifsc_code }),
      ...(profileRow?.upi_id == null ? {} : { upiId: profileRow.upi_id }),
      ...(profileRow?.bio == null ? {} : { bio: profileRow.bio }),
    };
  }

  public async createWorker(
    input: WorkerMutationContext & { readonly body: CreateWorkerRequest },
  ): Promise<WorkerDetailResponse> {
    const employmentType = input.body.employmentType ?? "vendor";
    if (employmentType === "vendor" && input.body.vendorId === undefined) {
      throw new Error("vendorId is required for vendor employment");
    }
    if (employmentType === "company" && input.body.vendorId !== undefined) {
      throw new Error("company workers must not have vendorId");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const workerCode = generateWorkerCode();
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO workers (
           branch_id, user_id, worker_code, display_name, phone_e164, email,
           photo_placeholder, created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
         RETURNING id`,
        [
          input.branchId,
          input.body.userId ?? null,
          workerCode,
          input.body.displayName,
          input.body.phoneE164,
          input.body.email ?? null,
          input.body.photoPlaceholder ?? null,
          input.actorUserId,
        ],
      );
      const workerId = inserted.rows[0]?.id;
      if (workerId === undefined) throw new Error("Failed to create worker");

      await client.query(
        `INSERT INTO worker_profiles (
           worker_id, experience_years, emergency_contact_name,
           emergency_contact_phone, bank_account_holder, bank_name,
           account_number_masked, ifsc_code, upi_id, bio
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          workerId,
          input.body.experienceYears ?? null,
          input.body.emergencyContactName ?? null,
          input.body.emergencyContactPhone ?? null,
          input.body.bankAccountHolder ?? null,
          input.body.bankName ?? null,
          input.body.accountNumberMasked ?? null,
          input.body.ifscCode ?? null,
          input.body.upiId ?? null,
          input.body.bio ?? null,
        ],
      );

      await client.query(
        `INSERT INTO worker_vendor_membership (
           worker_id, vendor_id, employment_type, membership_role,
           status, is_primary
         ) VALUES ($1,$2,$3,'worker','active',true)`,
        [workerId, input.body.vendorId ?? null, employmentType],
      );

      for (const skill of input.body.skills ?? []) {
        await client.query(
          `INSERT INTO worker_skills (
             worker_id, skill_code, skill_label, proficiency
           ) VALUES ($1,$2,$3,$4)
           ON CONFLICT (worker_id, skill_code) DO UPDATE
           SET skill_label = EXCLUDED.skill_label,
               proficiency = EXCLUDED.proficiency,
               status = 'active'`,
          [
            workerId,
            skill.skillCode,
            skill.skillLabel,
            skill.proficiency ?? "standard",
          ],
        );
      }

      const notify = buildWorkerNotificationPayload(
        WORKER_NOTIFICATION_TOPICS.created,
        { workerId, workerCode },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: workerId,
        entityType: "worker",
        action: "worker.created",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await appendModuleTimelineAndActivity(client, "worker", {
        aggregateId: workerId,
        actorUserId: input.actorUserId,
        entryType: "created",
        title: "Worker created",
        activityType: "created",
        content: input.body.displayName,
        customerVisible: false,
      });

      await client.query("COMMIT");
      const loaded = await this.getWorker(workerId, input.branchId);
      if (loaded === undefined) throw new Error("Worker create lost");
      return loaded;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateWorker(
    input: WorkerMutationContext & {
      readonly workerId: string;
      readonly body: UpdateWorkerRequest;
    },
  ): Promise<WorkerDetailResponse | undefined> {
    const existing = await this.getWorker(input.workerId, input.branchId);
    if (existing === undefined) return undefined;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE workers SET
           display_name = COALESCE($2, display_name),
           phone_e164 = COALESCE($3, phone_e164),
           email = CASE WHEN $4::boolean THEN $5 ELSE email END,
           photo_placeholder = CASE WHEN $6::boolean THEN $7 ELSE photo_placeholder END,
           status = COALESCE($8, status),
           availability_status = COALESCE($9, availability_status),
           updated_by_user_id = $10,
           version = version + 1
         WHERE id = $1 AND branch_id = $11`,
        [
          input.workerId,
          input.body.displayName ?? null,
          input.body.phoneE164 ?? null,
          input.body.email !== undefined,
          input.body.email === null ? null : (input.body.email ?? null),
          input.body.photoPlaceholder !== undefined,
          input.body.photoPlaceholder === null
            ? null
            : (input.body.photoPlaceholder ?? null),
          input.body.status ?? null,
          input.body.availabilityStatus ?? null,
          input.actorUserId,
          input.branchId,
        ],
      );

      await client.query(
        `UPDATE worker_profiles SET
           experience_years = CASE WHEN $2::boolean THEN $3 ELSE experience_years END,
           emergency_contact_name = CASE WHEN $4::boolean THEN $5 ELSE emergency_contact_name END,
           emergency_contact_phone = CASE WHEN $6::boolean THEN $7 ELSE emergency_contact_phone END,
           bank_account_holder = CASE WHEN $8::boolean THEN $9 ELSE bank_account_holder END,
           bank_name = CASE WHEN $10::boolean THEN $11 ELSE bank_name END,
           account_number_masked = CASE WHEN $12::boolean THEN $13 ELSE account_number_masked END,
           ifsc_code = CASE WHEN $14::boolean THEN $15 ELSE ifsc_code END,
           upi_id = CASE WHEN $16::boolean THEN $17 ELSE upi_id END,
           bio = CASE WHEN $18::boolean THEN $19 ELSE bio END,
           version = version + 1
         WHERE worker_id = $1`,
        [
          input.workerId,
          input.body.experienceYears !== undefined,
          input.body.experienceYears ?? null,
          input.body.emergencyContactName !== undefined,
          input.body.emergencyContactName ?? null,
          input.body.emergencyContactPhone !== undefined,
          input.body.emergencyContactPhone ?? null,
          input.body.bankAccountHolder !== undefined,
          input.body.bankAccountHolder ?? null,
          input.body.bankName !== undefined,
          input.body.bankName ?? null,
          input.body.accountNumberMasked !== undefined,
          input.body.accountNumberMasked ?? null,
          input.body.ifscCode !== undefined,
          input.body.ifscCode ?? null,
          input.body.upiId !== undefined,
          input.body.upiId ?? null,
          input.body.bio !== undefined,
          input.body.bio ?? null,
        ],
      );

      if (input.body.skills !== undefined) {
        await client.query(
          `UPDATE worker_skills SET status = 'inactive' WHERE worker_id = $1`,
          [input.workerId],
        );
        for (const skill of input.body.skills) {
          await client.query(
            `INSERT INTO worker_skills (
               worker_id, skill_code, skill_label, proficiency, status
             ) VALUES ($1,$2,$3,$4,'active')
             ON CONFLICT (worker_id, skill_code) DO UPDATE
             SET skill_label = EXCLUDED.skill_label,
                 proficiency = EXCLUDED.proficiency,
                 status = 'active'`,
            [
              input.workerId,
              skill.skillCode,
              skill.skillLabel,
              skill.proficiency ?? "standard",
            ],
          );
        }
      }

      const notify = buildWorkerNotificationPayload(
        WORKER_NOTIFICATION_TOPICS.updated,
        { workerId: input.workerId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.workerId,
        entityType: "worker",
        action: "worker.updated",
        version: 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await appendModuleTimelineAndActivity(client, "worker", {
        aggregateId: input.workerId,
        actorUserId: input.actorUserId,
        entryType: "updated",
        title: "Worker updated",
        activityType: "updated",
        customerVisible: false,
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.getWorker(input.workerId, input.branchId);
  }

  public async assignWorker(
    input: WorkerMutationContext & { readonly body: AssignWorkerRequest },
  ): Promise<WorkerTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const event = await client.query<{
        id: string;
        branch_id: string;
        version: number;
        event_number: string;
      }>(
        `SELECT id, branch_id, version, event_number
         FROM event_records WHERE id = $1 AND branch_id = $2 FOR UPDATE`,
        [input.body.eventRecordId, input.branchId],
      );
      const locked = event.rows[0];
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const worker = await client.query<{
        id: string;
        display_name: string;
        status: string;
      }>(
        `SELECT id, display_name, status FROM workers WHERE id = $1 AND branch_id = $2`,
        [input.body.workerId, input.branchId],
      );
      const workerRow = worker.rows[0];
      if (workerRow === undefined || workerRow.status !== "active") {
        await client.query("ROLLBACK");
        return undefined;
      }

      let vendorId = input.body.vendorId ?? null;
      if (vendorId === null) {
        const membership = await client.query<{ vendor_id: string | null }>(
          `SELECT vendor_id FROM worker_vendor_membership
           WHERE worker_id = $1 AND is_primary AND status = 'active'
           LIMIT 1`,
          [input.body.workerId],
        );
        vendorId = membership.rows[0]?.vendor_id ?? null;
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO worker_tasks (
           event_record_id, worker_id, vendor_id, vendor_assignment_id,
           title, description, status, assigned_by_user_id,
           expected_start_at, expected_end_at
         ) VALUES ($1,$2,$3,$4,$5,$6,'assigned',$7,$8,$9)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.workerId,
          vendorId,
          input.body.vendorAssignmentId ?? null,
          input.body.title,
          input.body.description ?? null,
          input.actorUserId,
          input.body.expectedStartAt ?? null,
          input.body.expectedEndAt ?? null,
        ],
      );
      const taskId = inserted.rows[0]?.id;
      if (taskId === undefined) throw new Error("Assign failed");

      await appendTaskHistory(client, {
        taskId,
        actorUserId: input.actorUserId,
        changeType: "created",
        toStatus: "assigned",
        summary: `Worker ${workerRow.display_name} assigned: ${input.body.title}`,
      });
      await appendEventTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "worker_assigned",
        title: "Worker assigned",
        content: `${workerRow.display_name} assigned — ${input.body.title}`,
        customerVisible: true,
      });
      await appendEventActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "worker_assignment",
        content: `Worker assigned: ${workerRow.display_name}`,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "worker", {
        aggregateId: input.body.workerId,
        actorUserId: input.actorUserId,
        entryType: "worker_assigned",
        title: "Worker assigned",
        activityType: "worker_assignment",
        content: `${workerRow.display_name} assigned — ${input.body.title}`,
        customerVisible: true,
      });

      const notify = buildWorkerNotificationPayload(
        WORKER_NOTIFICATION_TOPICS.assigned,
        {
          taskId,
          workerId: input.body.workerId,
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
        action: "worker.assigned",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadTaskSummary(client, taskId);
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public acceptTask(
    input: WorkerMutationContext & { readonly taskId: string },
  ): Promise<WorkerTaskSummary | undefined> {
    return this.transitionTask(input.taskId, input, {
      toStatus: "accepted",
      changeType: "accepted",
      timelineType: "worker_accepted",
      activityType: "worker_assignment",
      outboxTopic: WORKER_NOTIFICATION_TOPICS.accepted,
      action: "worker.accepted",
      setAcceptedAt: true,
      title: "Worker accepted task",
    });
  }

  public rejectTask(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: RejectWorkerTaskRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    return this.transitionTask(input.taskId, input, {
      toStatus: "rejected",
      changeType: "rejected",
      timelineType: "worker_rejected",
      activityType: "worker_assignment",
      outboxTopic: WORKER_NOTIFICATION_TOPICS.rejected,
      action: "worker.rejected",
      rejectionReason: input.body.reason,
      title: "Worker rejected task",
      content: input.body.reason,
    });
  }

  public async checkIn(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerCheckInRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockTask(client, input.taskId, input.branchId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const checkin = await client.query<{ id: string }>(
        `INSERT INTO worker_checkins (
           task_id, worker_id, check_type, gps_placeholder, location_placeholder,
           photo_placeholder, device_placeholder, created_by_user_id
         ) VALUES ($1,$2,'check_in',$3,$4,$5,$6,$7)
         RETURNING id`,
        [
          input.taskId,
          locked.worker_id,
          input.body.gpsPlaceholder ?? null,
          input.body.locationPlaceholder ?? null,
          input.body.photoPlaceholder ?? null,
          input.body.devicePlaceholder ?? null,
          input.actorUserId,
        ],
      );
      const checkInId = checkin.rows[0]?.id;

      await client.query(
        `UPDATE worker_tasks SET
           status = 'checked_in',
           checked_in_at = COALESCE(checked_in_at, now()),
           version = version + 1
         WHERE id = $1`,
        [input.taskId],
      );

      await client.query(
        `INSERT INTO worker_attendance (
           worker_id, event_record_id, task_id, status, check_in_id,
           created_by_user_id
         ) VALUES ($1,$2,$3,'present',$4,$5)
         ON CONFLICT (task_id, attendance_date) WHERE task_id IS NOT NULL
         DO UPDATE SET
           status = 'present',
           check_in_id = EXCLUDED.check_in_id,
           version = worker_attendance.version + 1`,
        [
          locked.worker_id,
          locked.event_record_id,
          input.taskId,
          checkInId ?? null,
          input.actorUserId,
        ],
      );

      await appendTaskHistory(client, {
        taskId: input.taskId,
        actorUserId: input.actorUserId,
        changeType: "checked_in",
        fromStatus: locked.status,
        toStatus: "checked_in",
        summary: "Worker checked in",
      });
      await appendEventTimeline(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "worker_checked_in",
        title: "Worker checked in",
        content: `${locked.display_name} checked in`,
        customerVisible: true,
      });
      await appendEventActivity(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "worker_attendance",
        content: `${locked.display_name} checked in`,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "worker", {
        aggregateId: locked.worker_id,
        actorUserId: input.actorUserId,
        entryType: "worker_checked_in",
        title: "Worker checked in",
        activityType: "worker_attendance",
        content: `${locked.display_name} checked in`,
        customerVisible: true,
      });

      const notify = buildWorkerNotificationPayload(
        WORKER_NOTIFICATION_TOPICS.checkedIn,
        { taskId: input.taskId, workerId: locked.worker_id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: locked.event_record_id,
        entityType: "event_record",
        action: "worker.checked_in",
        version: locked.version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadTaskSummary(client, input.taskId);
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async checkOut(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerCheckOutRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const markCompleted = input.body.markCompleted ?? true;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockTask(client, input.taskId, input.branchId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const checkout = await client.query<{ id: string }>(
        `INSERT INTO worker_checkins (
           task_id, worker_id, check_type, completion_notes,
           completion_photo_placeholders, created_by_user_id
         ) VALUES ($1,$2,'check_out',$3,$4::jsonb,$5)
         RETURNING id`,
        [
          input.taskId,
          locked.worker_id,
          input.body.completionNotes ?? null,
          JSON.stringify(input.body.completionPhotoPlaceholders ?? []),
          input.actorUserId,
        ],
      );
      const checkOutId = checkout.rows[0]?.id;
      const toStatus = markCompleted ? "checked_out" : "checked_out";

      await client.query(
        `UPDATE worker_tasks SET
           status = $2,
           completed_at = CASE WHEN $3 THEN COALESCE(completed_at, now()) ELSE completed_at END,
           checked_out_at = now(),
           version = version + 1
         WHERE id = $1`,
        [input.taskId, toStatus, markCompleted],
      );

      await client.query(
        `UPDATE worker_attendance SET
           check_out_id = $2,
           notes = COALESCE($3, notes),
           version = version + 1
         WHERE task_id = $1
           AND attendance_date = (timezone('Asia/Kolkata', now()))::date`,
        [input.taskId, checkOutId ?? null, input.body.completionNotes ?? null],
      );

      await appendTaskHistory(client, {
        taskId: input.taskId,
        actorUserId: input.actorUserId,
        changeType: markCompleted ? "completed" : "checked_out",
        fromStatus: locked.status,
        toStatus,
        summary: markCompleted
          ? "Worker completed and checked out"
          : "Worker checked out",
      });
      await appendEventTimeline(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "worker_checked_out",
        title: "Worker checked out",
        content:
          input.body.completionNotes ?? `${locked.display_name} checked out`,
        customerVisible: true,
      });
      if (markCompleted) {
        await appendEventTimeline(client, {
          eventRecordId: locked.event_record_id,
          actorUserId: input.actorUserId,
          entryType: "worker_task_completed",
          title: "Worker task completed",
          content: `${locked.display_name} completed task`,
          customerVisible: true,
        });
      }
      await appendEventActivity(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "worker_attendance",
        content: `${locked.display_name} checked out`,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "worker", {
        aggregateId: locked.worker_id,
        actorUserId: input.actorUserId,
        entryType: markCompleted
          ? "worker_task_completed"
          : "worker_checked_out",
        title: markCompleted ? "Worker task completed" : "Worker checked out",
        activityType: "worker_attendance",
        content:
          input.body.completionNotes ?? `${locked.display_name} checked out`,
        customerVisible: true,
      });

      const notify = buildWorkerNotificationPayload(
        markCompleted
          ? WORKER_NOTIFICATION_TOPICS.taskCompleted
          : WORKER_NOTIFICATION_TOPICS.checkedOut,
        { taskId: input.taskId, workerId: locked.worker_id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: locked.event_record_id,
        entityType: "event_record",
        action: markCompleted ? "worker.task_completed" : "worker.checked_out",
        version: locked.version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadTaskSummary(client, input.taskId);
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateProgress(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerProgressUpdateRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockTask(client, input.taskId, input.branchId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `INSERT INTO worker_progress (
           task_id, worker_id, summary, photo_placeholders, percent_complete,
           created_by_user_id
         ) VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,
        [
          input.taskId,
          locked.worker_id,
          input.body.summary,
          JSON.stringify(input.body.photoPlaceholders ?? []),
          input.body.percentComplete ?? null,
          input.actorUserId,
        ],
      );

      const nextStatus = input.body.status ?? "working";
      await client.query(
        `UPDATE worker_tasks SET
           status = $2,
           latest_progress_summary = $3,
           completed_at = CASE WHEN $2 = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END,
           version = version + 1
         WHERE id = $1`,
        [input.taskId, nextStatus, input.body.summary],
      );

      await appendTaskHistory(client, {
        taskId: input.taskId,
        actorUserId: input.actorUserId,
        changeType: "progress_updated",
        fromStatus: locked.status,
        toStatus: nextStatus,
        summary: input.body.summary,
      });
      await appendEventTimeline(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "worker_progress_updated",
        title: "Worker progress updated",
        content: input.body.summary,
        customerVisible: true,
      });
      await appendEventActivity(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "worker_progress",
        content: input.body.summary,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "worker", {
        aggregateId: locked.worker_id,
        actorUserId: input.actorUserId,
        entryType: "worker_progress_updated",
        title: "Worker progress updated",
        activityType: "worker_progress",
        content: input.body.summary,
        customerVisible: true,
      });

      const notify = buildWorkerNotificationPayload(
        WORKER_NOTIFICATION_TOPICS.progressUpdated,
        { taskId: input.taskId, workerId: locked.worker_id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: locked.event_record_id,
        entityType: "event_record",
        action: "worker.progress_updated",
        version: locked.version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadTaskSummary(client, input.taskId);
      await client.query("COMMIT");
      return summary;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listTasks(filters?: {
    readonly workerId?: string;
    readonly eventRecordId?: string;
    readonly vendorId?: string;
    readonly branchId?: string;
  }): Promise<readonly WorkerTaskSummary[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.workerId !== undefined) {
      params.push(filters.workerId);
      clauses.push(`t.worker_id = $${params.length}`);
    }
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      clauses.push(`t.event_record_id = $${params.length}`);
    }
    if (filters?.vendorId !== undefined) {
      params.push(filters.vendorId);
      clauses.push(`t.vendor_id = $${params.length}`);
    }
    if (filters?.branchId !== undefined) {
      params.push(filters.branchId);
      clauses.push(`e.branch_id = $${params.length}`);
    }
    const where = clauses.length === 0 ? "" : `WHERE ${clauses.join(" AND ")}`;
    const result = await this.pool.query<TaskSummaryRow>(
      `SELECT t.*, e.event_number, e.event_name, w.display_name, v.business_name
       FROM worker_tasks t
       INNER JOIN event_records e ON e.id = t.event_record_id
       INNER JOIN workers w ON w.id = t.worker_id
       LEFT JOIN vendors v ON v.id = t.vendor_id
       ${where}
       ORDER BY t.assigned_at DESC
       LIMIT 200`,
      params,
    );
    return result.rows.map(mapTaskSummaryRow);
  }

  public async getTask(
    taskId: string,
    branchId?: string,
  ): Promise<WorkerTaskDetailResponse | undefined> {
    const summary = await loadTaskSummary(this.pool, taskId, branchId);
    if (summary === undefined) return undefined;

    const [history, checkins, progress, notes, timeline] = await Promise.all([
      this.pool.query<{
        id: string;
        task_id: string;
        change_type: string;
        from_status: string | null;
        to_status: string | null;
        summary: string;
        actor_user_id: string | null;
        occurred_at: Date;
      }>(
        `SELECT * FROM worker_task_history
         WHERE task_id = $1 ORDER BY occurred_at DESC LIMIT 100`,
        [taskId],
      ),
      this.pool.query<{
        id: string;
        task_id: string;
        worker_id: string;
        check_type: "check_in" | "check_out";
        checked_at: Date;
        gps_placeholder: string | null;
        location_placeholder: string | null;
        photo_placeholder: string | null;
        device_placeholder: string | null;
        completion_notes: string | null;
        completion_photo_placeholders: unknown;
      }>(
        `SELECT * FROM worker_checkins
         WHERE task_id = $1 ORDER BY checked_at DESC`,
        [taskId],
      ),
      this.pool.query<{
        id: string;
        task_id: string;
        worker_id: string;
        summary: string;
        percent_complete: number | null;
        photo_placeholders: unknown;
        created_by_user_id: string | null;
        created_at: Date;
      }>(
        `SELECT * FROM worker_progress
         WHERE task_id = $1 ORDER BY created_at DESC`,
        [taskId],
      ),
      this.pool.query<NoteRow>(
        `SELECT * FROM worker_notes
         WHERE task_id = $1 ORDER BY created_at DESC`,
        [taskId],
      ),
      this.pool.query<{
        id: string;
        entry_type: string;
        title: string;
        content: string | null;
        customer_visible: boolean;
        occurred_at: Date;
      }>(
        `SELECT id, entry_type, title, content, customer_visible, occurred_at
         FROM event_timelines
         WHERE event_record_id = $1
           AND entry_type LIKE 'worker_%'
         ORDER BY occurred_at DESC
         LIMIT 50`,
        [summary.eventRecordId],
      ),
    ]);

    return {
      ...summary,
      history: history.rows.map(
        (h): WorkerTaskHistoryEntry => ({
          id: h.id,
          taskId: h.task_id,
          changeType: h.change_type,
          summary: h.summary,
          occurredAt: h.occurred_at.toISOString(),
          ...(h.from_status === null ? {} : { fromStatus: h.from_status }),
          ...(h.to_status === null ? {} : { toStatus: h.to_status }),
          ...(h.actor_user_id === null ? {} : { actorUserId: h.actor_user_id }),
        }),
      ),
      checkins: checkins.rows.map(
        (c): WorkerCheckInSummary => ({
          id: c.id,
          taskId: c.task_id,
          workerId: c.worker_id,
          checkType: c.check_type,
          checkedAt: c.checked_at.toISOString(),
          completionPhotoPlaceholders: asStringArray(
            c.completion_photo_placeholders,
          ),
          ...(c.gps_placeholder === null
            ? {}
            : { gpsPlaceholder: c.gps_placeholder }),
          ...(c.location_placeholder === null
            ? {}
            : { locationPlaceholder: c.location_placeholder }),
          ...(c.photo_placeholder === null
            ? {}
            : { photoPlaceholder: c.photo_placeholder }),
          ...(c.device_placeholder === null
            ? {}
            : { devicePlaceholder: c.device_placeholder }),
          ...(c.completion_notes === null
            ? {}
            : { completionNotes: c.completion_notes }),
        }),
      ),
      progress: progress.rows.map(
        (p): WorkerProgressSummary => ({
          id: p.id,
          taskId: p.task_id,
          workerId: p.worker_id,
          summary: p.summary,
          photoPlaceholders: asStringArray(p.photo_placeholders),
          createdAt: p.created_at.toISOString(),
          ...(p.percent_complete === null
            ? {}
            : { percentComplete: p.percent_complete }),
          ...(p.created_by_user_id === null
            ? {}
            : { createdByUserId: p.created_by_user_id }),
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
        }),
      ),
    };
  }

  public async addNote(
    input: WorkerMutationContext & {
      readonly workerId: string;
      readonly body: AddWorkerNoteRequest;
    },
  ): Promise<WorkerNoteSummary | undefined> {
    const worker = await this.getWorker(input.workerId, input.branchId);
    if (worker === undefined) return undefined;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<NoteRow>(
        `INSERT INTO worker_notes (
           worker_id, task_id, event_record_id, note_type, content,
           created_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          input.workerId,
          input.body.taskId ?? null,
          input.body.eventRecordId ?? null,
          input.body.noteType ?? "internal",
          input.body.content,
          input.actorUserId,
        ],
      );
      const note = inserted.rows[0];
      if (note === undefined) throw new Error("Note insert failed");

      if (input.body.eventRecordId !== undefined) {
        await appendEventTimeline(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          entryType: "worker_note_added",
          title: "Worker note added",
          content: input.body.content,
          customerVisible: false,
        });
        await appendEventActivity(client, {
          eventRecordId: input.body.eventRecordId,
          actorUserId: input.actorUserId,
          activityType: "worker_note",
          content: input.body.content,
          customerVisible: false,
        });
        await appendModuleTimelineAndActivity(client, "worker", {
          aggregateId: input.workerId,
          actorUserId: input.actorUserId,
          entryType: "worker_note_added",
          title: "Worker note added",
          activityType: "worker_note",
          content: input.body.content,
          customerVisible: false,
        });
      }

      if (input.body.taskId !== undefined) {
        await appendTaskHistory(client, {
          taskId: input.body.taskId,
          actorUserId: input.actorUserId,
          changeType: "note_added",
          summary: input.body.content.slice(0, 500),
        });
      }

      const notify = buildWorkerNotificationPayload(
        WORKER_NOTIFICATION_TOPICS.noteAdded,
        { workerId: input.workerId, noteId: note.id },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: input.branchId,
        entityId: input.workerId,
        entityType: "worker",
        action: "worker.note_added",
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

  public async listAttendance(filters?: {
    readonly workerId?: string;
    readonly branchId?: string;
  }): Promise<readonly WorkerAttendanceSummary[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.workerId !== undefined) {
      params.push(filters.workerId);
      clauses.push(`a.worker_id = $${params.length}`);
    }
    if (filters?.branchId !== undefined) {
      params.push(filters.branchId);
      clauses.push(`w.branch_id = $${params.length}`);
    }
    const where = clauses.length === 0 ? "" : `WHERE ${clauses.join(" AND ")}`;
    const result = await this.pool.query<AttendanceRow>(
      `SELECT a.*, w.display_name
       FROM worker_attendance a
       INNER JOIN workers w ON w.id = a.worker_id
       ${where}
       ORDER BY a.attendance_date DESC, a.created_at DESC
       LIMIT 200`,
      params,
    );
    return result.rows.map(toAttendance);
  }

  public async getCrmDashboard(
    branchId: string,
  ): Promise<WorkerDashboardResponse> {
    const [counts, workersResult, openTasks, attendance] = await Promise.all([
      this.pool.query<{
        total_workers: number;
        active_tasks: number;
        pending_acceptances: number;
        completed_tasks: number;
        checked_in_today: number;
      }>(
        `SELECT
           (SELECT COUNT(*)::int FROM workers WHERE branch_id = $1) AS total_workers,
           (SELECT COUNT(*)::int
              FROM worker_tasks t
              INNER JOIN workers w ON w.id = t.worker_id
             WHERE w.branch_id = $1
               AND t.status NOT IN ('rejected', 'cancelled', 'checked_out')
           ) AS active_tasks,
           (SELECT COUNT(*)::int
              FROM worker_tasks t
              INNER JOIN workers w ON w.id = t.worker_id
             WHERE w.branch_id = $1 AND t.status = 'assigned'
           ) AS pending_acceptances,
           (SELECT COUNT(*)::int
              FROM worker_tasks t
              INNER JOIN workers w ON w.id = t.worker_id
             WHERE w.branch_id = $1
               AND t.status IN ('completed', 'checked_out')
           ) AS completed_tasks,
           (SELECT COUNT(*)::int
              FROM worker_attendance a
              INNER JOIN workers w ON w.id = a.worker_id
             WHERE w.branch_id = $1
               AND a.attendance_date = (timezone('Asia/Kolkata', now()))::date
               AND a.status = 'present'
           ) AS checked_in_today`,
        [branchId],
      ),
      this.listWorkers({ branchId, limit: 50, offset: 0 }),
      this.pool.query<TaskSummaryRow>(
        `SELECT t.*, e.event_number, e.event_name, w.display_name, v.business_name
         FROM worker_tasks t
         INNER JOIN event_records e ON e.id = t.event_record_id
         INNER JOIN workers w ON w.id = t.worker_id
         LEFT JOIN vendors v ON v.id = t.vendor_id
         WHERE w.branch_id = $1
           AND t.status NOT IN ('rejected', 'cancelled', 'checked_out')
         ORDER BY t.assigned_at DESC
         LIMIT 50`,
        [branchId],
      ),
      this.pool.query<AttendanceRow>(
        `SELECT a.*, w.display_name
         FROM worker_attendance a
         INNER JOIN workers w ON w.id = a.worker_id
         WHERE w.branch_id = $1
         ORDER BY a.attendance_date DESC, a.created_at DESC
         LIMIT 30`,
        [branchId],
      ),
    ]);

    const row = counts.rows[0];
    return {
      totalWorkers: row?.total_workers ?? 0,
      activeTasks: row?.active_tasks ?? 0,
      pendingAcceptances: row?.pending_acceptances ?? 0,
      checkedInToday: row?.checked_in_today ?? 0,
      completedTasks: row?.completed_tasks ?? 0,
      workers: workersResult.items,
      openTasks: openTasks.rows.map(mapTaskSummaryRow),
      recentAttendance: attendance.rows.map(toAttendance),
    };
  }

  public async getWorkerDashboard(
    userId: string,
  ): Promise<WorkerDashboardResponse> {
    const workerId = await this.findWorkerIdForUser(userId);
    if (workerId === undefined) {
      return {
        totalWorkers: 0,
        activeTasks: 0,
        pendingAcceptances: 0,
        checkedInToday: 0,
        completedTasks: 0,
        workers: [],
        openTasks: [],
        recentAttendance: [],
      };
    }
    const [worker, tasks, attendance] = await Promise.all([
      this.getWorker(workerId),
      this.listTasks({ workerId }),
      this.listAttendance({ workerId }),
    ]);
    const workers = worker === undefined ? [] : [toSummary(worker)];
    return buildDashboard(workers, tasks, attendance);
  }

  public async findWorkerIdForUser(
    userId: string,
  ): Promise<string | undefined> {
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM workers WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );
    return result.rows[0]?.id;
  }

  public async isWorkerUser(
    workerId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.pool.query<{ ok: boolean }>(
      `SELECT true AS ok FROM workers
       WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [workerId, userId],
    );
    return result.rows[0]?.ok === true;
  }

  private async transitionTask(
    taskId: string,
    ctx: WorkerMutationContext,
    opts: {
      readonly toStatus: WorkerTaskStatus;
      readonly changeType: string;
      readonly timelineType: string;
      readonly activityType: string;
      readonly outboxTopic: string;
      readonly action: string;
      readonly title: string;
      readonly content?: string;
      readonly rejectionReason?: string;
      readonly setAcceptedAt?: boolean;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockTask(client, taskId, ctx.branchId);
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `UPDATE worker_tasks SET
           status = $2,
           rejection_reason = COALESCE($3, rejection_reason),
           accepted_at = CASE WHEN $4 THEN COALESCE(accepted_at, now()) ELSE accepted_at END,
           version = version + 1
         WHERE id = $1`,
        [
          taskId,
          opts.toStatus,
          opts.rejectionReason ?? null,
          opts.setAcceptedAt === true,
        ],
      );

      await appendTaskHistory(client, {
        taskId,
        actorUserId: ctx.actorUserId,
        changeType: opts.changeType,
        fromStatus: locked.status,
        toStatus: opts.toStatus,
        summary: opts.content ?? opts.title,
      });
      await appendEventTimeline(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: ctx.actorUserId,
        entryType: opts.timelineType,
        title: opts.title,
        content: opts.content ?? `${locked.display_name}: ${opts.title}`,
        customerVisible: true,
      });
      await appendEventActivity(client, {
        eventRecordId: locked.event_record_id,
        actorUserId: ctx.actorUserId,
        activityType: opts.activityType,
        content: opts.content ?? opts.title,
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "worker", {
        aggregateId: locked.worker_id,
        actorUserId: ctx.actorUserId,
        entryType: opts.timelineType,
        title: opts.title,
        activityType: opts.activityType,
        content: opts.content ?? `${locked.display_name}: ${opts.title}`,
        customerVisible: true,
      });

      const notify = buildWorkerNotificationPayload(
        opts.outboxTopic as typeof WORKER_NOTIFICATION_TOPICS.accepted,
        { taskId, workerId: locked.worker_id },
      );
      await writeAuditOutbox(client, {
        requestId: ctx.requestId,
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        branchId: locked.branch_id,
        entityId: locked.event_record_id,
        entityType: "event_record",
        action: opts.action,
        version: locked.version + 1,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const summary = await loadTaskSummary(client, taskId);
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

interface WorkerRow {
  id: string;
  user_id: string | null;
  worker_code: string;
  display_name: string;
  phone_e164: string;
  email: string | null;
  photo_placeholder: string | null;
  status: WorkerStatus;
  availability_status: WorkerAvailabilityStatus;
  created_at: Date;
  updated_at: Date;
}

interface WorkerListRow {
  id: string;
  worker_code: string;
  display_name: string;
  phone_e164: string;
  email: string | null;
  photo_placeholder: string | null;
  status: WorkerStatus;
  availability_status: WorkerAvailabilityStatus;
  created_at: Date;
  updated_at: Date;
  primary_vendor_id: string | null;
  primary_vendor_name: string | null;
  skills: unknown;
  total_count: number;
}

interface TaskSummaryRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  event_name: string | null;
  worker_id: string;
  display_name: string | null;
  vendor_id: string | null;
  business_name: string | null;
  vendor_assignment_id: string | null;
  title: string;
  description: string | null;
  status: WorkerTaskStatus;
  assigned_by_user_id: string | null;
  expected_start_at: Date | null;
  expected_end_at: Date | null;
  rejection_reason: string | null;
  latest_progress_summary: string | null;
  assigned_at: Date;
  accepted_at: Date | null;
  checked_in_at: Date | null;
  completed_at: Date | null;
  checked_out_at: Date | null;
  version: number;
}

interface ProfileRow {
  experience_years: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  account_number_masked: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  bio: string | null;
}

interface NoteRow {
  id: string;
  worker_id: string;
  task_id: string | null;
  event_record_id: string | null;
  note_type: WorkerNoteType;
  content: string;
  created_by_user_id: string | null;
  created_at: Date;
}

interface AttendanceRow {
  id: string;
  worker_id: string;
  display_name: string;
  event_record_id: string | null;
  task_id: string | null;
  attendance_date: Date | string;
  status: WorkerAttendanceStatus;
  notes: string | null;
  created_at: Date;
}

function toSummary(detail: WorkerDetailResponse): WorkerSummary {
  const {
    memberships: _m,
    documents: _d,
    userId: _u,
    experienceYears: _e,
    emergencyContactName: _ecn,
    emergencyContactPhone: _ecp,
    bankAccountHolder: _bah,
    bankName: _bn,
    accountNumberMasked: _an,
    ifscCode: _if,
    upiId: _upi,
    bio: _bio,
    ...summary
  } = detail;
  return summary;
}

function mapWorkerListRow(row: WorkerListRow): WorkerSummary {
  const skillsRaw = Array.isArray(row.skills) ? row.skills : [];
  const skills: WorkerSkillSummary[] = skillsRaw.flatMap((skill) => {
    if (skill === null || typeof skill !== "object") return [];
    const s = skill as Record<string, unknown>;
    if (
      typeof s.id !== "string" ||
      typeof s.skillCode !== "string" ||
      typeof s.skillLabel !== "string" ||
      typeof s.proficiency !== "string"
    ) {
      return [];
    }
    return [
      {
        id: s.id,
        skillCode: s.skillCode,
        skillLabel: s.skillLabel,
        proficiency: s.proficiency,
      },
    ];
  });

  return {
    id: row.id,
    workerCode: row.worker_code,
    displayName: row.display_name,
    phoneE164: row.phone_e164,
    status: row.status,
    availabilityStatus: row.availability_status,
    skills,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.email === null ? {} : { email: row.email }),
    ...(row.photo_placeholder === null
      ? {}
      : { photoPlaceholder: row.photo_placeholder }),
    ...(row.primary_vendor_id === null
      ? {}
      : { primaryVendorId: row.primary_vendor_id }),
    ...(row.primary_vendor_name === null
      ? {}
      : { primaryVendorName: row.primary_vendor_name }),
  };
}

function toNote(row: NoteRow): WorkerNoteSummary {
  return {
    id: row.id,
    workerId: row.worker_id,
    noteType: row.note_type,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    ...(row.task_id === null ? {} : { taskId: row.task_id }),
    ...(row.event_record_id === null
      ? {}
      : { eventRecordId: row.event_record_id }),
    ...(row.created_by_user_id === null
      ? {}
      : { createdByUserId: row.created_by_user_id }),
  };
}

function toAttendance(row: AttendanceRow): WorkerAttendanceSummary {
  const date =
    typeof row.attendance_date === "string"
      ? row.attendance_date
      : row.attendance_date.toISOString().slice(0, 10);
  return {
    id: row.id,
    workerId: row.worker_id,
    workerDisplayName: row.display_name,
    attendanceDate: date,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    ...(row.event_record_id === null
      ? {}
      : { eventRecordId: row.event_record_id }),
    ...(row.task_id === null ? {} : { taskId: row.task_id }),
    ...(row.notes === null ? {} : { notes: row.notes }),
  };
}

function buildDashboard(
  workers: readonly WorkerSummary[],
  tasks: readonly WorkerTaskSummary[],
  attendance: readonly WorkerAttendanceSummary[],
): WorkerDashboardResponse {
  const open = tasks.filter(
    (t) => !["rejected", "cancelled", "checked_out"].includes(t.status),
  );
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalWorkers: workers.length,
    activeTasks: open.length,
    pendingAcceptances: tasks.filter((t) => t.status === "assigned").length,
    checkedInToday: attendance.filter(
      (a) => a.attendanceDate === today && a.status === "present",
    ).length,
    completedTasks: tasks.filter(
      (t) => t.status === "completed" || t.status === "checked_out",
    ).length,
    workers,
    openTasks: open.slice(0, 50),
    recentAttendance: attendance.slice(0, 30),
  };
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function lockTask(
  client: PoolClient,
  taskId: string,
  branchId: string,
): Promise<
  | {
      id: string;
      event_record_id: string;
      worker_id: string;
      status: WorkerTaskStatus;
      version: number;
      branch_id: string;
      display_name: string;
    }
  | undefined
> {
  const result = await client.query<{
    id: string;
    event_record_id: string;
    worker_id: string;
    status: WorkerTaskStatus;
    version: number;
    branch_id: string;
    display_name: string;
  }>(
    `SELECT t.id, t.event_record_id, t.worker_id, t.status, t.version,
            e.branch_id, w.display_name
     FROM worker_tasks t
     INNER JOIN event_records e ON e.id = t.event_record_id
     INNER JOIN workers w ON w.id = t.worker_id
     WHERE t.id = $1 AND e.branch_id = $2
     FOR UPDATE OF t`,
    [taskId, branchId],
  );
  return result.rows[0];
}

async function loadTaskSummary(
  db: Pool | PoolClient,
  taskId: string,
  branchId?: string,
): Promise<WorkerTaskSummary | undefined> {
  const params: unknown[] = [taskId];
  let sql = `SELECT t.*, e.event_number, e.event_name, w.display_name, v.business_name
     FROM worker_tasks t
     INNER JOIN event_records e ON e.id = t.event_record_id
     INNER JOIN workers w ON w.id = t.worker_id
     LEFT JOIN vendors v ON v.id = t.vendor_id
     WHERE t.id = $1`;
  if (branchId !== undefined) {
    params.push(branchId);
    sql += ` AND e.branch_id = $2`;
  }
  const result = await db.query<TaskSummaryRow>(sql, params);
  const row = result.rows[0];
  if (row === undefined) return undefined;
  return mapTaskSummaryRow(row);
}

function mapTaskSummaryRow(row: TaskSummaryRow): WorkerTaskSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    workerId: row.worker_id,
    title: row.title,
    status: row.status,
    assignedAt: row.assigned_at.toISOString(),
    version: row.version,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.event_name === null ? {} : { eventName: row.event_name }),
    ...(row.display_name === null
      ? {}
      : { workerDisplayName: row.display_name }),
    ...(row.vendor_id === null ? {} : { vendorId: row.vendor_id }),
    ...(row.business_name === null
      ? {}
      : { vendorBusinessName: row.business_name }),
    ...(row.vendor_assignment_id === null
      ? {}
      : { vendorAssignmentId: row.vendor_assignment_id }),
    ...(row.description === null ? {} : { description: row.description }),
    ...(row.assigned_by_user_id === null
      ? {}
      : { assignedByUserId: row.assigned_by_user_id }),
    ...(row.expected_start_at === null
      ? {}
      : { expectedStartAt: row.expected_start_at.toISOString() }),
    ...(row.expected_end_at === null
      ? {}
      : { expectedEndAt: row.expected_end_at.toISOString() }),
    ...(row.rejection_reason === null
      ? {}
      : { rejectionReason: row.rejection_reason }),
    ...(row.latest_progress_summary === null
      ? {}
      : { latestProgressSummary: row.latest_progress_summary }),
    ...(row.accepted_at === null
      ? {}
      : { acceptedAt: row.accepted_at.toISOString() }),
    ...(row.checked_in_at === null
      ? {}
      : { checkedInAt: row.checked_in_at.toISOString() }),
    ...(row.completed_at === null
      ? {}
      : { completedAt: row.completed_at.toISOString() }),
    ...(row.checked_out_at === null
      ? {}
      : { checkedOutAt: row.checked_out_at.toISOString() }),
  };
}

async function appendTaskHistory(
  client: PoolClient,
  input: {
    readonly taskId: string;
    readonly actorUserId: string;
    readonly changeType: string;
    readonly summary: string;
    readonly fromStatus?: string;
    readonly toStatus?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO worker_task_history (
       task_id, actor_user_id, change_type, from_status, to_status, summary
     ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      input.taskId,
      input.actorUserId,
      input.changeType,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.summary,
    ],
  );
}
