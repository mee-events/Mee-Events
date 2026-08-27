import { Inject, Injectable } from "@nestjs/common";
import type {
  AssignOperationsTaskRequest,
  AttendanceLogStatus,
  AttendanceLogSummary,
  CheckInAttendanceRequest,
  CheckOutAttendanceRequest,
  CompleteEventOperationsRequest,
  CreateEventIssueRequest,
  CreateOperationsTaskRequest,
  EventCompletionStatus,
  EventCompletionSummary,
  EventIssuePriority,
  EventIssueStatus,
  EventIssueSummary,
  EventIssueType,
  EventOperationsDetailResponse,
  EventPhotoCategory,
  EventPhotoSummary,
  EventProgressStatus,
  EventProgressSummary,
  EventTimelineEntry,
  FinalizeAttendanceRequest,
  MaterialUsageStatus,
  MaterialUsageSummary,
  OperationsDashboardResponse,
  OperationsTaskAssignmentSummary,
  OperationsTaskCategory,
  OperationsTaskDetailResponse,
  OperationsTaskPriority,
  OperationsTaskStatus,
  OperationsTaskSummary,
  RecordMaterialUsageRequest,
  TaskAssigneeType,
  TaskAssignmentStatus,
  UpdateCompletionChecklistRequest,
  UpdateEventIssueRequest,
  UpdateMaterialUsageRequest,
  UpdateOperationsTaskRequest,
  UpdateTaskAssignmentRequest,
  UploadEventPhotoRequest,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  buildOperationsNotificationPayload,
  OPERATIONS_NOTIFICATION_TOPICS,
} from "../application/notification-intents";
import type {
  OperationsMutationContext,
  OperationsRepository,
} from "../ports/operations-repository";
import {
  appendEventActivity as appendActivity,
  appendEventTimeline as appendTimeline,
  writeAuditOutbox,
} from "../../../common/pattern-b/append-event-pattern-b";
import { appendModuleTimelineAndActivity } from "../../../common/pattern-b/append-module-pattern-b";

@Injectable()
export class PostgresOperationsRepository implements OperationsRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async getDashboard(
    branchId: string,
  ): Promise<OperationsDashboardResponse> {
    const progress = await this.listProgress(branchId);
    const [openIssues, pendingTasks, checkedIn, recentIssues, recentTasks] =
      await Promise.all([
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM event_issues i
           INNER JOIN event_records e ON e.id = i.event_record_id
           WHERE e.branch_id = $1
             AND i.status NOT IN ('resolved', 'closed')`,
          [branchId],
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM event_tasks t
           INNER JOIN event_records e ON e.id = t.event_record_id
           WHERE e.branch_id = $1
             AND t.status NOT IN ('completed', 'cancelled')`,
          [branchId],
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM attendance_logs a
           INNER JOIN event_records e ON e.id = a.event_record_id
           WHERE e.branch_id = $1 AND a.status = 'checked_in'`,
          [branchId],
        ),
        this.listIssues(branchId).then((issues) => issues.slice(0, 20)),
        this.listTasks(branchId).then((tasks) => tasks.slice(0, 20)),
      ]);

    return {
      totalEvents: progress.length,
      inProgressEvents: progress.filter((p) => p.status === "in_progress")
        .length,
      completedEvents: progress.filter((p) => p.status === "completed").length,
      openIssues: Number(openIssues.rows[0]?.count ?? 0),
      pendingTasks: Number(pendingTasks.rows[0]?.count ?? 0),
      checkedInWorkers: Number(checkedIn.rows[0]?.count ?? 0),
      progress: progress.slice(0, 50),
      recentIssues,
      recentTasks,
    };
  }

  public async listEvents(
    branchId: string,
  ): Promise<readonly EventProgressSummary[]> {
    return this.listProgress(branchId);
  }

  public async getEventOperations(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventOperationsDetailResponse | undefined> {
    const eventBranchId = await loadEventBranchId(this.pool, eventRecordId);
    if (eventBranchId === undefined || eventBranchId !== branchId) {
      return undefined;
    }
    const progress = await loadProgress(this.pool, eventRecordId);
    if (progress === undefined) return undefined;
    const completion = await loadCompletion(this.pool, eventRecordId);
    if (completion === undefined) return undefined;

    const [tasks, attendance, issues, photos, materials, timeline] =
      await Promise.all([
        this.listTasks(branchId, { eventRecordId }),
        this.listAttendance(branchId, { eventRecordId }),
        this.listIssues(branchId, { eventRecordId }),
        this.listPhotos(branchId, { eventRecordId }),
        this.listMaterials(branchId, { eventRecordId }),
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
             AND entry_type LIKE 'ops_%'
           ORDER BY occurred_at DESC
           LIMIT 100`,
          [eventRecordId],
        ),
      ]);

    return {
      eventRecordId,
      ...(progress.eventNumber === undefined
        ? {}
        : { eventNumber: progress.eventNumber }),
      ...(progress.eventName === undefined
        ? {}
        : { eventName: progress.eventName }),
      progress,
      completion,
      tasks,
      attendance,
      issues,
      photos,
      materials,
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

  public async ensureEventOperations(
    input: OperationsMutationContext & { readonly eventRecordId: string },
  ): Promise<EventProgressSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.eventRecordId);
      await recalculateProgress(client, input.eventRecordId);
      await refreshCompletionGates(client, input.eventRecordId);
      const progress = await loadProgress(client, input.eventRecordId);
      if (progress === undefined) {
        throw new Error("Failed to ensure event operations");
      }
      await client.query("COMMIT");
      return progress;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async createTask(
    input: OperationsMutationContext & {
      readonly body: CreateOperationsTaskRequest;
    },
  ): Promise<OperationsTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.body.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.body.eventRecordId);

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO event_tasks (
           event_record_id, title, description, priority, status, category,
           start_at, end_at, estimated_minutes, completion_percent,
           is_mandatory, notes, created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,0,$9,$10,$11,$11)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.title,
          input.body.description ?? null,
          input.body.priority ?? "normal",
          input.body.category ?? "other",
          input.body.startAt ?? null,
          input.body.endAt ?? null,
          input.body.estimatedMinutes ?? null,
          input.body.isMandatory ?? false,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const taskId = inserted.rows[0]?.id;
      if (taskId === undefined) throw new Error("Task insert failed");

      await recalculateProgress(client, input.body.eventRecordId);
      await refreshCompletionGates(client, input.body.eventRecordId);

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_task_created",
        title: "Operations task created",
        content: input.body.title,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_task",
        content: `Task created: ${input.body.title}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_task_created",
        title: "Operations task created",
        activityType: "ops_task",
        content: input.body.title,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.taskCreated,
        { eventRecordId: input.body.eventRecordId, taskId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "operations.task_created",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const task = await loadTask(client, taskId);
      await client.query("COMMIT");
      return task;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateTask(
    input: OperationsMutationContext & {
      readonly taskId: string;
      readonly body: UpdateOperationsTaskRequest;
    },
  ): Promise<OperationsTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{
        id: string;
        event_record_id: string;
        status: OperationsTaskStatus;
      }>(`SELECT id, event_record_id, status FROM event_tasks WHERE id = $1`, [
        input.taskId,
      ]);
      const row = existing.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const locked = await lockEventRecord(
        client,
        row.event_record_id,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const nextStatus = input.body.status;
      const completedAt =
        nextStatus === "completed"
          ? new Date().toISOString()
          : nextStatus === undefined
            ? undefined
            : null;

      await client.query(
        `UPDATE event_tasks SET
           title = COALESCE($2, title),
           description = CASE WHEN $3::boolean THEN $4 ELSE description END,
           priority = COALESCE($5, priority),
           status = COALESCE($6, status),
           category = COALESCE($7, category),
           start_at = CASE WHEN $8::boolean THEN $9::timestamptz ELSE start_at END,
           end_at = CASE WHEN $10::boolean THEN $11::timestamptz ELSE end_at END,
           estimated_minutes = CASE WHEN $12::boolean THEN $13::integer ELSE estimated_minutes END,
           completion_percent = COALESCE($14, completion_percent),
           is_mandatory = COALESCE($15, is_mandatory),
           notes = CASE WHEN $16::boolean THEN $17 ELSE notes END,
           completed_at = CASE
             WHEN $18::boolean THEN $19::timestamptz
             ELSE completed_at
           END,
           updated_by_user_id = $20,
           version = version + 1
         WHERE id = $1`,
        [
          input.taskId,
          input.body.title ?? null,
          input.body.description !== undefined,
          input.body.description ?? null,
          input.body.priority ?? null,
          input.body.status ?? null,
          input.body.category ?? null,
          input.body.startAt !== undefined,
          input.body.startAt ?? null,
          input.body.endAt !== undefined,
          input.body.endAt ?? null,
          input.body.estimatedMinutes !== undefined,
          input.body.estimatedMinutes ?? null,
          input.body.completionPercent ?? null,
          input.body.isMandatory ?? null,
          input.body.notes !== undefined,
          input.body.notes ?? null,
          completedAt !== undefined,
          completedAt ?? null,
          input.actorUserId,
        ],
      );

      await recalculateProgress(client, row.event_record_id);
      await refreshCompletionGates(client, row.event_record_id);

      const entryType =
        nextStatus === "completed"
          ? "ops_task_completed"
          : input.body.completionPercent !== undefined
            ? "ops_task_progress"
            : "ops_task_updated";

      await appendTimeline(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType,
        title:
          nextStatus === "completed"
            ? "Operations task completed"
            : "Operations task updated",
        content: `Task ${input.taskId}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "ops_task",
        content: `Task updated (${entryType})`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType,
        title:
          nextStatus === "completed"
            ? "Operations task completed"
            : "Operations task updated",
        activityType: "ops_task",
        content: `Task updated (${entryType})`,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.taskUpdated,
        {
          eventRecordId: row.event_record_id,
          taskId: input.taskId,
          status: nextStatus ?? row.status,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "operations.task_updated",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const task = await loadTask(client, input.taskId);
      await client.query("COMMIT");
      return task;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listTasks(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly OperationsTaskSummary[]> {
    const params: unknown[] = [branchId];
    let where = "e.branch_id = $1";
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      where += ` AND t.event_record_id = $${params.length}`;
    }
    const result = await this.pool.query<TaskRow>(
      `SELECT t.*, e.event_number
       FROM event_tasks t
       INNER JOIN event_records e ON e.id = t.event_record_id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT 500`,
      params,
    );
    const tasks = result.rows;
    if (tasks.length === 0) return [];
    const assignments = await loadAssignmentsForTasks(
      this.pool,
      tasks.map((t) => t.id),
    );
    return tasks.map((t) => mapTask(t, assignments.get(t.id) ?? []));
  }

  public async getTask(
    taskId: string,
    branchId: string,
  ): Promise<OperationsTaskDetailResponse | undefined> {
    const task = await loadTask(this.pool, taskId, branchId);
    if (task === undefined) return undefined;
    const timeline = await this.pool.query<{
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
         AND entry_type LIKE 'ops_%'
       ORDER BY occurred_at DESC
       LIMIT 50`,
      [task.eventRecordId],
    );
    return {
      ...task,
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

  public async assignTask(
    input: OperationsMutationContext & {
      readonly taskId: string;
      readonly body: AssignOperationsTaskRequest;
    },
  ): Promise<OperationsTaskAssignmentSummary | undefined> {
    const assigneeIds = resolveAssigneeIds(input.body);
    if (assigneeIds === undefined) return undefined;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const taskResult = await client.query<{
        id: string;
        event_record_id: string;
      }>(`SELECT id, event_record_id FROM event_tasks WHERE id = $1`, [
        input.taskId,
      ]);
      const task = taskResult.rows[0];
      if (task === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const locked = await lockEventRecord(
        client,
        task.event_record_id,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      if (
        input.body.assigneeType === "manager" ||
        input.body.assigneeType === "supervisor" ||
        input.body.assigneeType === "vendor"
      ) {
        await client.query(
          `UPDATE task_assignments SET
             status = 'released',
             released_at = now(),
             version = version + 1
           WHERE task_id = $1
             AND assignee_type = $2
             AND status = 'active'`,
          [input.taskId, input.body.assigneeType],
        );
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO task_assignments (
           task_id, event_record_id, assignee_type,
           manager_user_id, supervisor_user_id, vendor_id, worker_id,
           status, notes, assigned_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9)
         RETURNING id`,
        [
          input.taskId,
          task.event_record_id,
          input.body.assigneeType,
          assigneeIds.managerUserId,
          assigneeIds.supervisorUserId,
          assigneeIds.vendorId,
          assigneeIds.workerId,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const assignmentId = inserted.rows[0]?.id;
      if (assignmentId === undefined)
        throw new Error("Assignment insert failed");

      await client.query(
        `UPDATE event_tasks SET
           status = CASE
             WHEN status IN ('pending', 'planning') THEN 'assigned'
             ELSE status
           END,
           updated_by_user_id = $2,
           version = version + 1
         WHERE id = $1`,
        [input.taskId, input.actorUserId],
      );

      await recalculateProgress(client, task.event_record_id);
      await refreshCompletionGates(client, task.event_record_id);

      await appendTimeline(client, {
        eventRecordId: task.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_task_assigned",
        title: "Task assigned",
        content: `${input.body.assigneeType} assignment`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: task.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "ops_assignment",
        content: `Assigned ${input.body.assigneeType} to task`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: task.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_task_assigned",
        title: "Task assigned",
        activityType: "ops_assignment",
        content: `${input.body.assigneeType} assignment`,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.taskAssigned,
        {
          eventRecordId: task.event_record_id,
          taskId: input.taskId,
          assignmentId,
          assigneeType: input.body.assigneeType,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: task.event_record_id,
        entityType: "event_record",
        action: "operations.task_assigned",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const assignment = await loadAssignment(client, assignmentId);
      await client.query("COMMIT");
      return assignment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateAssignment(
    input: OperationsMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateTaskAssignmentRequest;
    },
  ): Promise<OperationsTaskAssignmentSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{
        id: string;
        event_record_id: string;
      }>(`SELECT id, event_record_id FROM task_assignments WHERE id = $1`, [
        input.assignmentId,
      ]);
      const row = existing.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      const locked = await lockEventRecord(
        client,
        row.event_record_id,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `UPDATE task_assignments SET
           status = COALESCE($2, status),
           notes = CASE WHEN $3::boolean THEN $4 ELSE notes END,
           manager_user_id = CASE WHEN $5::boolean THEN $6::uuid ELSE manager_user_id END,
           supervisor_user_id = CASE WHEN $7::boolean THEN $8::uuid ELSE supervisor_user_id END,
           vendor_id = CASE WHEN $9::boolean THEN $10::uuid ELSE vendor_id END,
           worker_id = CASE WHEN $11::boolean THEN $12::uuid ELSE worker_id END,
           released_at = CASE WHEN $2 = 'released' THEN now() ELSE released_at END,
           version = version + 1
         WHERE id = $1`,
        [
          input.assignmentId,
          input.body.status ?? null,
          input.body.notes !== undefined,
          input.body.notes ?? null,
          input.body.managerUserId !== undefined,
          input.body.managerUserId ?? null,
          input.body.supervisorUserId !== undefined,
          input.body.supervisorUserId ?? null,
          input.body.vendorId !== undefined,
          input.body.vendorId ?? null,
          input.body.workerId !== undefined,
          input.body.workerId ?? null,
        ],
      );

      await appendTimeline(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_task_assigned",
        title: "Task assignment updated",
        content: `Assignment ${input.assignmentId}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "ops_assignment",
        content: `Assignment updated: ${input.assignmentId}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_task_assigned",
        title: "Task assignment updated",
        activityType: "ops_assignment",
        content: `Assignment ${input.assignmentId}`,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.taskAssigned,
        {
          eventRecordId: row.event_record_id,
          assignmentId: input.assignmentId,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "operations.assignment_updated",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const assignment = await loadAssignment(client, input.assignmentId);
      await client.query("COMMIT");
      return assignment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async checkIn(
    input: OperationsMutationContext & {
      readonly body: CheckInAttendanceRequest;
    },
  ): Promise<AttendanceLogSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.body.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.body.eventRecordId);

      const worker = await client.query<{ id: string }>(
        `SELECT id FROM workers WHERE id = $1`,
        [input.body.workerId],
      );
      if (worker.rows[0] === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const open = await client.query<{ id: string }>(
        `SELECT id FROM attendance_logs
         WHERE event_record_id = $1 AND worker_id = $2 AND status = 'checked_in'`,
        [input.body.eventRecordId, input.body.workerId],
      );
      if (open.rows[0] !== undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO attendance_logs (
           event_record_id, worker_id, task_id, check_in_at,
           gps_placeholder, status, notes,
           created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,now(),$4,'checked_in',$5,$6,$6)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.workerId,
          input.body.taskId ?? null,
          input.body.gpsPlaceholder ?? null,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const logId = inserted.rows[0]?.id;
      if (logId === undefined) throw new Error("Attendance insert failed");

      await client.query(
        `UPDATE event_completion SET
           attendance_finalized = false,
           version = version + 1
         WHERE event_record_id = $1`,
        [input.body.eventRecordId],
      );

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_attendance_check_in",
        title: "Worker checked in",
        content: `Worker ${input.body.workerId}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_attendance",
        content: `Check-in: ${input.body.workerId}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_attendance_check_in",
        title: "Worker checked in",
        activityType: "ops_attendance",
        content: `Worker ${input.body.workerId}`,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.attendanceRecorded,
        {
          eventRecordId: input.body.eventRecordId,
          attendanceLogId: logId,
          action: "check_in",
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "operations.attendance_check_in",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const log = await loadAttendance(client, logId);
      await client.query("COMMIT");
      return log;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async checkOut(
    input: OperationsMutationContext & {
      readonly body: CheckOutAttendanceRequest;
    },
  ): Promise<AttendanceLogSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{
        id: string;
        event_record_id: string;
        status: AttendanceLogStatus;
        check_in_at: Date | null;
      }>(
        `SELECT a.id, a.event_record_id, a.status, a.check_in_at
         FROM attendance_logs a
         INNER JOIN event_records e ON e.id = a.event_record_id
         WHERE a.id = $1 AND e.branch_id = $2`,
        [input.body.attendanceLogId, input.branchId],
      );
      const row = existing.rows[0];
      if (row === undefined || row.status !== "checked_in") {
        await client.query("ROLLBACK");
        return undefined;
      }

      const locked = await lockEventRecord(
        client,
        row.event_record_id,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `UPDATE attendance_logs SET
           check_out_at = now(),
           working_minutes = CASE
             WHEN check_in_at IS NULL THEN NULL
             ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - check_in_at)) / 60)::integer)
           END,
           gps_placeholder = COALESCE($2, gps_placeholder),
           notes = COALESCE($3, notes),
           status = 'checked_out',
           updated_by_user_id = $4,
           version = version + 1
         WHERE id = $1`,
        [
          input.body.attendanceLogId,
          input.body.gpsPlaceholder ?? null,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );

      await appendTimeline(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_attendance_check_out",
        title: "Worker checked out",
        content: `Attendance ${input.body.attendanceLogId}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "ops_attendance",
        content: `Check-out: ${input.body.attendanceLogId}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_attendance_check_out",
        title: "Worker checked out",
        activityType: "ops_attendance",
        content: `Attendance ${input.body.attendanceLogId}`,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.attendanceRecorded,
        {
          eventRecordId: row.event_record_id,
          attendanceLogId: input.body.attendanceLogId,
          action: "check_out",
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "operations.attendance_check_out",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const log = await loadAttendance(client, input.body.attendanceLogId);
      await client.query("COMMIT");
      return log;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async finalizeAttendance(
    input: OperationsMutationContext & {
      readonly body: FinalizeAttendanceRequest;
    },
  ): Promise<EventCompletionSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.body.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.body.eventRecordId);

      const open = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM attendance_logs
         WHERE event_record_id = $1 AND status = 'checked_in'`,
        [input.body.eventRecordId],
      );
      if (Number(open.rows[0]?.count ?? 0) > 0) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `UPDATE attendance_logs SET
           status = 'finalized',
           updated_by_user_id = $2,
           version = version + 1
         WHERE event_record_id = $1
           AND status = 'checked_out'`,
        [input.body.eventRecordId, input.actorUserId],
      );

      await client.query(
        `UPDATE event_completion SET
           attendance_finalized = true,
           version = version + 1
         WHERE event_record_id = $1`,
        [input.body.eventRecordId],
      );
      await refreshCompletionGates(client, input.body.eventRecordId);

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_attendance_check_out",
        title: "Attendance finalized",
        content: "All attendance logs finalized",
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_attendance",
        content: "Attendance finalized",
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_attendance_check_out",
        title: "Attendance finalized",
        activityType: "ops_attendance",
        content: "All attendance logs finalized",
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.attendanceRecorded,
        {
          eventRecordId: input.body.eventRecordId,
          action: "finalize",
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "operations.attendance_finalized",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const completion = await loadCompletion(client, input.body.eventRecordId);
      await client.query("COMMIT");
      return completion;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listAttendance(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly AttendanceLogSummary[]> {
    const params: unknown[] = [branchId];
    let where = "e.branch_id = $1";
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      where += ` AND a.event_record_id = $${params.length}`;
    }
    const result = await this.pool.query<AttendanceRow>(
      `SELECT a.*, e.event_number, w.display_name AS worker_name
       FROM attendance_logs a
       INNER JOIN event_records e ON e.id = a.event_record_id
       INNER JOIN workers w ON w.id = a.worker_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT 500`,
      params,
    );
    return result.rows.map(mapAttendance);
  }

  public async createIssue(
    input: OperationsMutationContext & {
      readonly body: CreateEventIssueRequest;
    },
  ): Promise<EventIssueSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.body.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.body.eventRecordId);

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO event_issues (
           event_record_id, task_id, issue_type, priority, status,
           description, attachment_placeholders,
           reported_by_user_id, reported_by_role
         ) VALUES ($1,$2,$3,$4,'open',$5,$6::jsonb,$7,$8)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.taskId ?? null,
          input.body.issueType ?? "other",
          input.body.priority ?? "normal",
          input.body.description,
          JSON.stringify(input.body.attachmentPlaceholders ?? []),
          input.actorUserId,
          input.actorRole,
        ],
      );
      const issueId = inserted.rows[0]?.id;
      if (issueId === undefined) throw new Error("Issue insert failed");

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_issue_created",
        title: "Event issue reported",
        content: input.body.description.slice(0, 200),
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_issue",
        content: `Issue created: ${input.body.issueType ?? "other"}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_issue_created",
        title: "Event issue reported",
        activityType: "ops_issue",
        content: input.body.description.slice(0, 200),
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.issueCreated,
        { eventRecordId: input.body.eventRecordId, issueId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "operations.issue_created",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const issue = await loadIssue(client, issueId);
      await client.query("COMMIT");
      return issue;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateIssue(
    input: OperationsMutationContext & {
      readonly issueId: string;
      readonly body: UpdateEventIssueRequest;
    },
  ): Promise<EventIssueSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{
        id: string;
        event_record_id: string;
      }>(
        `SELECT i.id, i.event_record_id
         FROM event_issues i
         INNER JOIN event_records e ON e.id = i.event_record_id
         WHERE i.id = $1 AND e.branch_id = $2`,
        [input.issueId, input.branchId],
      );
      const row = existing.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      const locked = await lockEventRecord(
        client,
        row.event_record_id,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const resolved =
        input.body.status === "resolved" || input.body.status === "closed";

      await client.query(
        `UPDATE event_issues SET
           status = COALESCE($2, status),
           priority = COALESCE($3, priority),
           description = COALESCE($4, description),
           attachment_placeholders = CASE
             WHEN $5::boolean THEN $6::jsonb
             ELSE attachment_placeholders
           END,
           resolved_at = CASE
             WHEN $7::boolean THEN now()
             ELSE resolved_at
           END,
           version = version + 1
         WHERE id = $1`,
        [
          input.issueId,
          input.body.status ?? null,
          input.body.priority ?? null,
          input.body.description ?? null,
          input.body.attachmentPlaceholders !== undefined,
          JSON.stringify(input.body.attachmentPlaceholders ?? []),
          resolved,
        ],
      );

      await appendTimeline(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_issue_updated",
        title: "Event issue updated",
        content: `Issue ${input.issueId}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "ops_issue",
        content: `Issue updated: ${input.issueId}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_issue_updated",
        title: "Event issue updated",
        activityType: "ops_issue",
        content: `Issue ${input.issueId}`,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.issueUpdated,
        { eventRecordId: row.event_record_id, issueId: input.issueId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "operations.issue_updated",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const issue = await loadIssue(client, input.issueId);
      await client.query("COMMIT");
      return issue;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listIssues(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly EventIssueSummary[]> {
    const params: unknown[] = [branchId];
    let where = "e.branch_id = $1";
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      where += ` AND i.event_record_id = $${params.length}`;
    }
    const result = await this.pool.query<IssueRow>(
      `SELECT i.*, e.event_number
       FROM event_issues i
       INNER JOIN event_records e ON e.id = i.event_record_id
       WHERE ${where}
       ORDER BY i.created_at DESC
       LIMIT 500`,
      params,
    );
    return result.rows.map(mapIssue);
  }

  public async uploadPhoto(
    input: OperationsMutationContext & {
      readonly body: UploadEventPhotoRequest;
    },
  ): Promise<EventPhotoSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.body.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.body.eventRecordId);

      const inserted = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO event_photos (
           event_record_id, task_id, category, storage_key, caption,
           uploaded_by_user_id, status
         ) VALUES ($1,$2,$3,$4,$5,$6,'uploaded')
         RETURNING id, created_at`,
        [
          input.body.eventRecordId,
          input.body.taskId ?? null,
          input.body.category,
          input.body.storageKey ?? null,
          input.body.caption ?? null,
          input.actorUserId,
        ],
      );
      const photo = inserted.rows[0];
      if (photo === undefined) throw new Error("Photo insert failed");

      await refreshCompletionGates(client, input.body.eventRecordId);

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_photo_uploaded",
        title: "Event photo uploaded",
        content: input.body.category,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_photo",
        content: `Photo uploaded: ${input.body.category}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_photo_uploaded",
        title: "Event photo uploaded",
        activityType: "ops_photo",
        content: input.body.category,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.photoUploaded,
        {
          eventRecordId: input.body.eventRecordId,
          photoId: photo.id,
          category: input.body.category,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "operations.photo_uploaded",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await client.query("COMMIT");
      return {
        id: photo.id,
        eventRecordId: input.body.eventRecordId,
        category: input.body.category,
        createdAt: photo.created_at.toISOString(),
        ...(input.body.taskId === undefined
          ? {}
          : { taskId: input.body.taskId }),
        ...(input.body.storageKey === undefined
          ? {}
          : { storageKey: input.body.storageKey }),
        ...(input.body.caption === undefined
          ? {}
          : { caption: input.body.caption }),
        uploadedByUserId: input.actorUserId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listPhotos(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly EventPhotoSummary[]> {
    const params: unknown[] = [branchId];
    let where = "e.branch_id = $1 AND p.status <> 'removed'";
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      where += ` AND p.event_record_id = $${params.length}`;
    }
    const result = await this.pool.query<PhotoRow>(
      `SELECT p.*
       FROM event_photos p
       INNER JOIN event_records e ON e.id = p.event_record_id
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT 500`,
      params,
    );
    return result.rows.map(mapPhoto);
  }

  public async recordMaterial(
    input: OperationsMutationContext & {
      readonly body: RecordMaterialUsageRequest;
    },
  ): Promise<MaterialUsageSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.body.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.body.eventRecordId);

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO material_usage (
           event_record_id, inventory_item_id, allocation_id, item_label,
           quantity_issued, quantity_used, quantity_returned,
           quantity_damaged, quantity_lost, status, notes,
           created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10,$11,$11)
         RETURNING id`,
        [
          input.body.eventRecordId,
          input.body.inventoryItemId ?? null,
          input.body.allocationId ?? null,
          input.body.itemLabel,
          input.body.quantityIssued ?? 0,
          input.body.quantityUsed ?? 0,
          input.body.quantityReturned ?? 0,
          input.body.quantityDamaged ?? 0,
          input.body.quantityLost ?? 0,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );
      const materialId = inserted.rows[0]?.id;
      if (materialId === undefined) throw new Error("Material insert failed");

      await refreshCompletionGates(client, input.body.eventRecordId);

      await appendTimeline(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_material_recorded",
        title: "Material usage recorded",
        content: input.body.itemLabel,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_material",
        content: `Material recorded: ${input.body.itemLabel}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.body.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_material_recorded",
        title: "Material usage recorded",
        activityType: "ops_material",
        content: input.body.itemLabel,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.materialRecorded,
        { eventRecordId: input.body.eventRecordId, materialId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.body.eventRecordId,
        entityType: "event_record",
        action: "operations.material_recorded",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const material = await loadMaterial(client, materialId);
      await client.query("COMMIT");
      return material;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateMaterial(
    input: OperationsMutationContext & {
      readonly materialId: string;
      readonly body: UpdateMaterialUsageRequest;
    },
  ): Promise<MaterialUsageSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{
        id: string;
        event_record_id: string;
      }>(
        `SELECT m.id, m.event_record_id
         FROM material_usage m
         INNER JOIN event_records e ON e.id = m.event_record_id
         WHERE m.id = $1 AND e.branch_id = $2`,
        [input.materialId, input.branchId],
      );
      const row = existing.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      const locked = await lockEventRecord(
        client,
        row.event_record_id,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `UPDATE material_usage SET
           quantity_issued = COALESCE($2, quantity_issued),
           quantity_used = COALESCE($3, quantity_used),
           quantity_returned = COALESCE($4, quantity_returned),
           quantity_damaged = COALESCE($5, quantity_damaged),
           quantity_lost = COALESCE($6, quantity_lost),
           status = COALESCE($7, status),
           notes = CASE WHEN $8::boolean THEN $9 ELSE notes END,
           updated_by_user_id = $10,
           version = version + 1
         WHERE id = $1`,
        [
          input.materialId,
          input.body.quantityIssued ?? null,
          input.body.quantityUsed ?? null,
          input.body.quantityReturned ?? null,
          input.body.quantityDamaged ?? null,
          input.body.quantityLost ?? null,
          input.body.status ?? null,
          input.body.notes !== undefined,
          input.body.notes ?? null,
          input.actorUserId,
        ],
      );

      await refreshCompletionGates(client, row.event_record_id);

      await appendTimeline(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_material_recorded",
        title: "Material usage updated",
        content: `Material ${input.materialId}`,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "ops_material",
        content: `Material updated: ${input.materialId}`,
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType: "ops_material_recorded",
        title: "Material usage updated",
        activityType: "ops_material",
        content: `Material ${input.materialId}`,
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.materialRecorded,
        {
          eventRecordId: row.event_record_id,
          materialId: input.materialId,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "operations.material_updated",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const material = await loadMaterial(client, input.materialId);
      await client.query("COMMIT");
      return material;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listMaterials(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly MaterialUsageSummary[]> {
    const params: unknown[] = [branchId];
    let where = "e.branch_id = $1";
    if (filters?.eventRecordId !== undefined) {
      params.push(filters.eventRecordId);
      where += ` AND m.event_record_id = $${params.length}`;
    }
    const result = await this.pool.query<MaterialRow>(
      `SELECT m.*, e.event_number
       FROM material_usage m
       INNER JOIN event_records e ON e.id = m.event_record_id
       WHERE ${where}
       ORDER BY m.created_at DESC
       LIMIT 500`,
      params,
    );
    return result.rows.map(mapMaterial);
  }

  public async listProgress(
    branchId: string,
  ): Promise<readonly EventProgressSummary[]> {
    const result = await this.pool.query<ProgressRow>(
      `SELECT p.*, e.event_number, e.event_name
       FROM event_progress p
       INNER JOIN event_records e ON e.id = p.event_record_id
       WHERE e.branch_id = $1
       ORDER BY p.updated_at DESC
       LIMIT 200`,
      [branchId],
    );
    return result.rows.map(mapProgress);
  }

  public async recalculateProgress(
    input: OperationsMutationContext & { readonly eventRecordId: string },
  ): Promise<EventProgressSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.eventRecordId);
      await recalculateProgress(client, input.eventRecordId);
      await refreshCompletionGates(client, input.eventRecordId);

      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_progress_recalculated",
        title: "Progress recalculated",
        content: "Event progress refreshed",
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_progress",
        content: "Progress recalculated",
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_progress_recalculated",
        title: "Progress recalculated",
        activityType: "ops_progress",
        content: "Event progress refreshed",
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.progressUpdated,
        { eventRecordId: input.eventRecordId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "operations.progress_recalculated",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const progress = await loadProgress(client, input.eventRecordId);
      await client.query("COMMIT");
      return progress;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateChecklist(
    input: OperationsMutationContext & {
      readonly eventRecordId: string;
      readonly body: UpdateCompletionChecklistRequest;
    },
  ): Promise<EventCompletionSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.eventRecordId);

      const current = await loadCompletion(client, input.eventRecordId);
      if (current === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const mergedChecklist = {
        ...current.checklist,
        ...(input.body.checklist ?? {}),
      };
      const checklistValues = Object.values(mergedChecklist);
      const checklistFinished =
        checklistValues.length > 0 && checklistValues.every((v) => v === true);

      await client.query(
        `UPDATE event_completion SET
           checklist = $2::jsonb,
           checklist_finished = $3,
           notes = COALESCE($4, notes),
           version = version + 1
         WHERE event_record_id = $1`,
        [
          input.eventRecordId,
          JSON.stringify(mergedChecklist),
          checklistFinished,
          input.body.notes ?? null,
        ],
      );
      await refreshCompletionGates(client, input.eventRecordId);

      const checklistEntryType = checklistFinished
        ? "ops_completion_ready"
        : "ops_progress_recalculated";
      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: checklistEntryType,
        title: checklistFinished
          ? "Completion checklist finished"
          : "Completion checklist updated",
        content: "Checklist updated",
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_completion",
        content: "Checklist updated",
        customerVisible: false,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: checklistEntryType,
        title: checklistFinished
          ? "Completion checklist finished"
          : "Completion checklist updated",
        activityType: "ops_completion",
        content: "Checklist updated",
        customerVisible: false,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.progressUpdated,
        { eventRecordId: input.eventRecordId, checklistFinished },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "operations.checklist_updated",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const completion = await loadCompletion(client, input.eventRecordId);
      await client.query("COMMIT");
      return completion;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async completeEvent(
    input: OperationsMutationContext & {
      readonly eventRecordId: string;
      readonly body: CompleteEventOperationsRequest;
    },
  ): Promise<EventCompletionSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEventRecord(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await ensureEventOperationsRows(client, input.eventRecordId);
      await recalculateProgress(client, input.eventRecordId);
      await refreshCompletionGates(client, input.eventRecordId);

      const completion = await loadCompletion(client, input.eventRecordId);
      if (completion === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const gatesPass =
        completion.mandatoryTasksComplete &&
        completion.attendanceFinalized &&
        completion.materialsFinalized &&
        completion.finalPhotosUploaded &&
        completion.checklistFinished;

      if (!gatesPass || completion.status === "completed") {
        await client.query("ROLLBACK");
        return undefined;
      }

      await client.query(
        `UPDATE event_completion SET
           status = 'completed',
           completed_at = now(),
           completed_by_user_id = $2,
           notes = COALESCE($3, notes),
           version = version + 1
         WHERE event_record_id = $1`,
        [input.eventRecordId, input.actorUserId, input.body.notes ?? null],
      );
      await client.query(
        `UPDATE event_progress SET
           status = 'completed',
           overall_completion_percent = 100,
           version = version + 1
         WHERE event_record_id = $1`,
        [input.eventRecordId],
      );

      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_event_completed",
        title: "Event operations completed",
        content: input.body.notes ?? "All completion gates satisfied",
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "ops_completion",
        content: "Event operations completed",
        customerVisible: true,
      });
      await appendModuleTimelineAndActivity(client, "operations", {
        aggregateId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "ops_event_completed",
        title: "Event operations completed",
        activityType: "ops_completion",
        content: input.body.notes ?? "All completion gates satisfied",
        customerVisible: true,
      });

      const notify = buildOperationsNotificationPayload(
        OPERATIONS_NOTIFICATION_TOPICS.eventCompleted,
        { eventRecordId: input.eventRecordId },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "operations.event_completed",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const updated = await loadCompletion(client, input.eventRecordId);
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async getCompletion(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventCompletionSummary | undefined> {
    const eventBranchId = await loadEventBranchId(this.pool, eventRecordId);
    if (eventBranchId === undefined || eventBranchId !== branchId) {
      return undefined;
    }
    return loadCompletion(this.pool, eventRecordId);
  }
}

type Queryable = Pool | PoolClient;

interface LockedEvent {
  id: string;
  branch_id: string;
  version: number;
}

interface TaskRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  title: string;
  description: string | null;
  priority: OperationsTaskPriority;
  status: OperationsTaskStatus;
  category: OperationsTaskCategory;
  start_at: Date | null;
  end_at: Date | null;
  estimated_minutes: number | null;
  completion_percent: number;
  is_mandatory: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
}

interface AssignmentRow {
  id: string;
  task_id: string;
  event_record_id: string;
  assignee_type: TaskAssigneeType;
  status: TaskAssignmentStatus;
  manager_user_id: string | null;
  supervisor_user_id: string | null;
  vendor_id: string | null;
  worker_id: string | null;
  notes: string | null;
  assigned_at: Date;
  updated_at: Date;
  version: number;
}

interface AttendanceRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  worker_id: string;
  worker_name: string | null;
  task_id: string | null;
  check_in_at: Date | null;
  check_out_at: Date | null;
  gps_placeholder: string | null;
  working_minutes: number | null;
  status: AttendanceLogStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
}

interface IssueRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  task_id: string | null;
  issue_type: EventIssueType;
  priority: EventIssuePriority;
  status: EventIssueStatus;
  description: string;
  attachment_placeholders: unknown;
  reported_by_user_id: string | null;
  reported_by_role: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  version: number;
}

interface PhotoRow {
  id: string;
  event_record_id: string;
  task_id: string | null;
  category: EventPhotoCategory;
  storage_key: string | null;
  caption: string | null;
  uploaded_by_user_id: string | null;
  created_at: Date;
}

interface MaterialRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  inventory_item_id: string | null;
  allocation_id: string | null;
  item_label: string;
  quantity_issued: string | number;
  quantity_used: string | number;
  quantity_returned: string | number;
  quantity_damaged: string | number;
  quantity_lost: string | number;
  status: MaterialUsageStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
}

interface ProgressRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  event_name: string | null;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overall_completion_percent: number;
  status: EventProgressStatus;
  last_calculated_at: Date;
  updated_at: Date;
  version: number;
}

interface CompletionRow {
  id: string;
  event_record_id: string;
  event_number: string | null;
  status: EventCompletionStatus;
  mandatory_tasks_complete: boolean;
  attendance_finalized: boolean;
  materials_finalized: boolean;
  final_photos_uploaded: boolean;
  checklist_finished: boolean;
  checklist: unknown;
  notes: string | null;
  completed_at: Date | null;
  completed_by_user_id: string | null;
  updated_at: Date;
  version: number;
}

function resolveAssigneeIds(body: AssignOperationsTaskRequest):
  | {
      managerUserId: string | null;
      supervisorUserId: string | null;
      vendorId: string | null;
      workerId: string | null;
    }
  | undefined {
  switch (body.assigneeType) {
    case "manager":
      if (body.managerUserId === undefined) return undefined;
      return {
        managerUserId: body.managerUserId,
        supervisorUserId: null,
        vendorId: null,
        workerId: null,
      };
    case "supervisor":
      if (body.supervisorUserId === undefined) return undefined;
      return {
        managerUserId: null,
        supervisorUserId: body.supervisorUserId,
        vendorId: null,
        workerId: null,
      };
    case "vendor":
      if (body.vendorId === undefined) return undefined;
      return {
        managerUserId: null,
        supervisorUserId: null,
        vendorId: body.vendorId,
        workerId: null,
      };
    case "worker":
      if (body.workerId === undefined) return undefined;
      return {
        managerUserId: null,
        supervisorUserId: null,
        vendorId: null,
        workerId: body.workerId,
      };
    default:
      return undefined;
  }
}

async function lockEventRecord(
  client: PoolClient,
  eventRecordId: string,
  branchId: string,
): Promise<LockedEvent | undefined> {
  const result = await client.query<LockedEvent>(
    `SELECT id, branch_id, version
     FROM event_records
     WHERE id = $1 AND branch_id = $2
     FOR UPDATE`,
    [eventRecordId, branchId],
  );
  return result.rows[0];
}

async function ensureEventOperationsRows(
  client: PoolClient,
  eventRecordId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO event_progress (event_record_id)
     VALUES ($1)
     ON CONFLICT (event_record_id) DO NOTHING`,
    [eventRecordId],
  );
  await client.query(
    `INSERT INTO event_completion (event_record_id)
     VALUES ($1)
     ON CONFLICT (event_record_id) DO NOTHING`,
    [eventRecordId],
  );
}

async function recalculateProgress(
  client: PoolClient,
  eventRecordId: string,
): Promise<void> {
  const stats = await client.query<{
    total_tasks: string;
    completed_tasks: string;
    avg_percent: string | null;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status <> 'cancelled')::text AS total_tasks,
       COUNT(*) FILTER (WHERE status = 'completed')::text AS completed_tasks,
       AVG(completion_percent) FILTER (WHERE status <> 'cancelled')::text AS avg_percent
     FROM event_tasks
     WHERE event_record_id = $1`,
    [eventRecordId],
  );
  const total = Number(stats.rows[0]?.total_tasks ?? 0);
  const completed = Number(stats.rows[0]?.completed_tasks ?? 0);
  const pending = Math.max(0, total - completed);
  const avgRaw = stats.rows[0]?.avg_percent;
  const overall =
    total === 0
      ? 0
      : avgRaw !== null && avgRaw !== undefined
        ? Math.round(Number(avgRaw))
        : Math.round((completed / total) * 100);

  let status: EventProgressStatus = "not_started";
  if (total === 0 || completed === 0) {
    status = "not_started";
  } else if (completed === total) {
    status = "completed";
  } else {
    status = "in_progress";
  }

  // Prefer in_progress when any non-pending/non-cancelled work exists with 0 completed
  if (status === "not_started" && total > 0) {
    const active = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM event_tasks
       WHERE event_record_id = $1
         AND status NOT IN ('pending', 'cancelled', 'completed')`,
      [eventRecordId],
    );
    if (Number(active.rows[0]?.count ?? 0) > 0 || overall > 0) {
      status = "in_progress";
    }
  }

  await client.query(
    `UPDATE event_progress SET
       total_tasks = $2,
       completed_tasks = $3,
       pending_tasks = $4,
       overall_completion_percent = $5,
       status = $6,
       last_calculated_at = now(),
       version = version + 1
     WHERE event_record_id = $1`,
    [eventRecordId, total, completed, pending, overall, status],
  );
}

async function refreshCompletionGates(
  client: PoolClient,
  eventRecordId: string,
): Promise<void> {
  const mandatory = await client.query<{ incomplete: string }>(
    `SELECT COUNT(*)::text AS incomplete
     FROM event_tasks
     WHERE event_record_id = $1
       AND is_mandatory = true
       AND status <> 'completed'
       AND status <> 'cancelled'`,
    [eventRecordId],
  );
  const mandatoryComplete = Number(mandatory.rows[0]?.incomplete ?? 0) === 0;

  const openMaterials = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM material_usage
     WHERE event_record_id = $1 AND status = 'open'`,
    [eventRecordId],
  );
  const materialsFinalized = Number(openMaterials.rows[0]?.count ?? 0) === 0;

  const proofPhotos = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM event_photos
     WHERE event_record_id = $1
       AND category = 'completion_proof'
       AND status = 'uploaded'`,
    [eventRecordId],
  );
  const finalPhotosUploaded = Number(proofPhotos.rows[0]?.count ?? 0) > 0;

  const openAttendance = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM attendance_logs
     WHERE event_record_id = $1 AND status = 'checked_in'`,
    [eventRecordId],
  );
  const hasOpenAttendance = Number(openAttendance.rows[0]?.count ?? 0) > 0;

  await client.query(
    `UPDATE event_completion SET
       mandatory_tasks_complete = $2,
       materials_finalized = $3,
       final_photos_uploaded = $4,
       attendance_finalized = CASE
         WHEN $5::boolean THEN false
         ELSE attendance_finalized
       END,
       status = CASE
         WHEN status = 'completed' THEN status
         WHEN $2 AND attendance_finalized AND $3 AND $4 AND checklist_finished
           THEN 'ready'
         ELSE 'in_progress'
       END,
       version = version + 1
     WHERE event_record_id = $1`,
    [
      eventRecordId,
      mandatoryComplete,
      materialsFinalized,
      finalPhotosUploaded,
      hasOpenAttendance,
    ],
  );
}

async function loadEventBranchId(
  db: Pool | PoolClient,
  eventRecordId: string,
): Promise<string | undefined> {
  const result = await db.query<{ branch_id: string }>(
    `SELECT branch_id FROM event_records WHERE id = $1`,
    [eventRecordId],
  );
  return result.rows[0]?.branch_id;
}

async function loadProgress(
  db: Queryable,
  eventRecordId: string,
): Promise<EventProgressSummary | undefined> {
  const result = await db.query<ProgressRow>(
    `SELECT p.*, e.event_number, e.event_name
     FROM event_progress p
     INNER JOIN event_records e ON e.id = p.event_record_id
     WHERE p.event_record_id = $1`,
    [eventRecordId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapProgress(row);
}

async function loadCompletion(
  db: Queryable,
  eventRecordId: string,
): Promise<EventCompletionSummary | undefined> {
  const result = await db.query<CompletionRow>(
    `SELECT c.*, e.event_number
     FROM event_completion c
     INNER JOIN event_records e ON e.id = c.event_record_id
     WHERE c.event_record_id = $1`,
    [eventRecordId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapCompletion(row);
}

async function loadTask(
  db: Queryable,
  taskId: string,
  branchId?: string,
): Promise<OperationsTaskSummary | undefined> {
  const params: unknown[] = [taskId];
  let sql = `SELECT t.*, e.event_number
     FROM event_tasks t
     INNER JOIN event_records e ON e.id = t.event_record_id
     WHERE t.id = $1`;
  if (branchId !== undefined) {
    params.push(branchId);
    sql += ` AND e.branch_id = $2`;
  }
  const result = await db.query<TaskRow>(sql, params);
  const row = result.rows[0];
  if (row === undefined) return undefined;
  const assignments = await loadAssignmentsForTasks(db, [taskId]);
  return mapTask(row, assignments.get(taskId) ?? []);
}

async function loadAssignment(
  db: Queryable,
  assignmentId: string,
): Promise<OperationsTaskAssignmentSummary | undefined> {
  const result = await db.query<AssignmentRow>(
    `SELECT * FROM task_assignments WHERE id = $1`,
    [assignmentId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapAssignment(row);
}

async function loadAssignmentsForTasks(
  db: Queryable,
  taskIds: readonly string[],
): Promise<Map<string, OperationsTaskAssignmentSummary[]>> {
  const map = new Map<string, OperationsTaskAssignmentSummary[]>();
  if (taskIds.length === 0) return map;
  const result = await db.query<AssignmentRow>(
    `SELECT * FROM task_assignments
     WHERE task_id = ANY($1::uuid[])
     ORDER BY assigned_at DESC`,
    [taskIds],
  );
  for (const row of result.rows) {
    const list = map.get(row.task_id) ?? [];
    list.push(mapAssignment(row));
    map.set(row.task_id, list);
  }
  return map;
}

async function loadAttendance(
  db: Queryable,
  logId: string,
): Promise<AttendanceLogSummary | undefined> {
  const result = await db.query<AttendanceRow>(
    `SELECT a.*, e.event_number, w.display_name AS worker_name
     FROM attendance_logs a
     INNER JOIN event_records e ON e.id = a.event_record_id
     INNER JOIN workers w ON w.id = a.worker_id
     WHERE a.id = $1`,
    [logId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapAttendance(row);
}

async function loadIssue(
  db: Queryable,
  issueId: string,
): Promise<EventIssueSummary | undefined> {
  const result = await db.query<IssueRow>(
    `SELECT i.*, e.event_number
     FROM event_issues i
     INNER JOIN event_records e ON e.id = i.event_record_id
     WHERE i.id = $1`,
    [issueId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapIssue(row);
}

async function loadMaterial(
  db: Queryable,
  materialId: string,
): Promise<MaterialUsageSummary | undefined> {
  const result = await db.query<MaterialRow>(
    `SELECT m.*, e.event_number
     FROM material_usage m
     INNER JOIN event_records e ON e.id = m.event_record_id
     WHERE m.id = $1`,
    [materialId],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapMaterial(row);
}

function mapTask(
  row: TaskRow,
  assignments: readonly OperationsTaskAssignmentSummary[],
): OperationsTaskSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    title: row.title,
    ...(row.description === null ? {} : { description: row.description }),
    priority: row.priority,
    status: row.status,
    category: row.category,
    ...(row.start_at === null ? {} : { startAt: row.start_at.toISOString() }),
    ...(row.end_at === null ? {} : { endAt: row.end_at.toISOString() }),
    ...(row.estimated_minutes === null
      ? {}
      : { estimatedMinutes: row.estimated_minutes }),
    completionPercent: row.completion_percent,
    isMandatory: row.is_mandatory,
    ...(row.notes === null ? {} : { notes: row.notes }),
    assignments,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

function mapAssignment(row: AssignmentRow): OperationsTaskAssignmentSummary {
  return {
    id: row.id,
    taskId: row.task_id,
    eventRecordId: row.event_record_id,
    assigneeType: row.assignee_type,
    status: row.status,
    ...(row.manager_user_id === null
      ? {}
      : { managerUserId: row.manager_user_id }),
    ...(row.supervisor_user_id === null
      ? {}
      : { supervisorUserId: row.supervisor_user_id }),
    ...(row.vendor_id === null ? {} : { vendorId: row.vendor_id }),
    ...(row.worker_id === null ? {} : { workerId: row.worker_id }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    assignedAt: row.assigned_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

function mapAttendance(row: AttendanceRow): AttendanceLogSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    workerId: row.worker_id,
    ...(row.worker_name === null ? {} : { workerName: row.worker_name }),
    ...(row.task_id === null ? {} : { taskId: row.task_id }),
    ...(row.check_in_at === null
      ? {}
      : { checkInAt: row.check_in_at.toISOString() }),
    ...(row.check_out_at === null
      ? {}
      : { checkOutAt: row.check_out_at.toISOString() }),
    ...(row.gps_placeholder === null
      ? {}
      : { gpsPlaceholder: row.gps_placeholder }),
    ...(row.working_minutes === null
      ? {}
      : { workingMinutes: row.working_minutes }),
    status: row.status,
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

function mapIssue(row: IssueRow): EventIssueSummary {
  const attachments = Array.isArray(row.attachment_placeholders)
    ? row.attachment_placeholders.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.task_id === null ? {} : { taskId: row.task_id }),
    issueType: row.issue_type,
    priority: row.priority,
    status: row.status,
    description: row.description,
    attachmentPlaceholders: attachments,
    ...(row.reported_by_user_id === null
      ? {}
      : { reportedByUserId: row.reported_by_user_id }),
    ...(row.reported_by_role === null
      ? {}
      : { reportedByRole: row.reported_by_role }),
    ...(row.resolved_at === null
      ? {}
      : { resolvedAt: row.resolved_at.toISOString() }),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

function mapPhoto(row: PhotoRow): EventPhotoSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    category: row.category,
    createdAt: row.created_at.toISOString(),
    ...(row.task_id === null ? {} : { taskId: row.task_id }),
    ...(row.storage_key === null ? {} : { storageKey: row.storage_key }),
    ...(row.caption === null ? {} : { caption: row.caption }),
    ...(row.uploaded_by_user_id === null
      ? {}
      : { uploadedByUserId: row.uploaded_by_user_id }),
  };
}

function mapMaterial(row: MaterialRow): MaterialUsageSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.inventory_item_id === null
      ? {}
      : { inventoryItemId: row.inventory_item_id }),
    ...(row.allocation_id === null ? {} : { allocationId: row.allocation_id }),
    itemLabel: row.item_label,
    quantityIssued: Number(row.quantity_issued),
    quantityUsed: Number(row.quantity_used),
    quantityReturned: Number(row.quantity_returned),
    quantityDamaged: Number(row.quantity_damaged),
    quantityLost: Number(row.quantity_lost),
    status: row.status,
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

function mapProgress(row: ProgressRow): EventProgressSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.event_name === null ? {} : { eventName: row.event_name }),
    totalTasks: row.total_tasks,
    completedTasks: row.completed_tasks,
    pendingTasks: row.pending_tasks,
    overallCompletionPercent: row.overall_completion_percent,
    status: row.status,
    lastCalculatedAt: row.last_calculated_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

function mapCompletion(row: CompletionRow): EventCompletionSummary {
  const checklist =
    row.checklist !== null &&
    typeof row.checklist === "object" &&
    !Array.isArray(row.checklist)
      ? (row.checklist as Record<string, boolean>)
      : {};
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    status: row.status,
    mandatoryTasksComplete: row.mandatory_tasks_complete,
    attendanceFinalized: row.attendance_finalized,
    materialsFinalized: row.materials_finalized,
    finalPhotosUploaded: row.final_photos_uploaded,
    checklistFinished: row.checklist_finished,
    checklist,
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(row.completed_at === null
      ? {}
      : { completedAt: row.completed_at.toISOString() }),
    ...(row.completed_by_user_id === null
      ? {}
      : { completedByUserId: row.completed_by_user_id }),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}
