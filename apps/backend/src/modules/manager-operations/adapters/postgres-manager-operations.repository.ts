import { Inject, Injectable } from "@nestjs/common";
import type {
  AddEventTaskCommentRequest,
  AssignEventManagerRequest,
  CompleteEventTaskRequest,
  CreateEventProgressRequest,
  CreateEventTaskRequest,
  EventActivitySummary,
  EventDailyReportSummary,
  EventManagerDashboardResponse,
  EventProgressListResponse,
  EventProgressUpdateKind,
  EventProgressUpdateSummary,
  EventRecordPriority,
  EventRecordStatus,
  EventRecordSummary,
  EventTaskCommentSummary,
  EventTaskDetailResponse,
  EventTaskHistoryEntry,
  EventTaskPriority,
  EventTaskStatus,
  EventTaskSummary,
  EventTimelineEntry,
  ManagerAssignmentStatus,
  ManagerAssignmentSummary,
  ManagerCandidateSummary,
  ManagerDashboardResponse,
  UpdateEventProgressRequest,
  UpdateEventTaskRequest,
  UpdateManagerAssignmentRequest,
} from "@me-event/api-contracts";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  buildNotificationOutboxPayload,
  MANAGER_NOTIFICATION_TOPICS,
} from "../application/notification-intents";
import type {
  ManagerMutationContext,
  ManagerOperationsRepository,
} from "../ports/manager-operations-repository";
import {
  appendEventActivity as appendActivity,
  appendEventTimeline as appendTimeline,
  writeAuditOutbox,
} from "../../../common/pattern-b/append-event-pattern-b";

@Injectable()
export class PostgresManagerOperationsRepository
  implements ManagerOperationsRepository
{
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listManagerCandidates(): Promise<
    readonly ManagerCandidateSummary[]
  > {
    const result = await this.pool.query<{
      user_id: string;
      display_name: string | null;
      mobile_e164: string;
      role: string;
    }>(
      `SELECT DISTINCT u.id AS user_id, u.display_name, u.mobile_e164, ra.role
       FROM app_users u
       INNER JOIN role_assignments ra ON ra.user_id = u.id
       WHERE ra.state = 'active'
         AND ra.role IN ('manager', 'employee', 'administrator')
       ORDER BY u.display_name NULLS LAST, u.mobile_e164`,
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      displayName: row.display_name ?? row.mobile_e164,
      role: row.role,
      ...(row.mobile_e164 ? { mobileE164: row.mobile_e164 } : {}),
    }));
  }

  public async assignManager(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: AssignEventManagerRequest;
    },
  ): Promise<ManagerAssignmentSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const active = await client.query<{
        id: string;
        manager_user_id: string;
      }>(
        `SELECT id, manager_user_id
         FROM event_manager_assignments
         WHERE event_record_id = $1 AND status = 'active'
         FOR UPDATE`,
        [input.eventRecordId],
      );
      const previous = active.rows[0];
      const isReassign =
        previous !== undefined &&
        previous.manager_user_id !== input.body.managerUserId;

      if (previous !== undefined) {
        if (previous.manager_user_id === input.body.managerUserId) {
          const same = await this.loadAssignment(client, previous.id);
          await client.query("COMMIT");
          return same;
        }
        await client.query(
          `UPDATE event_manager_assignments
           SET status = 'reassigned', released_at = now(), version = version + 1
           WHERE id = $1`,
          [previous.id],
        );
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO event_manager_assignments (
           event_record_id, manager_user_id, assigned_by_user_id,
           priority, manager_notes, internal_notes, expected_completion_date
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          input.eventRecordId,
          input.body.managerUserId,
          input.actorUserId,
          input.body.priority,
          input.body.managerNotes ?? null,
          input.body.internalNotes ?? null,
          input.body.expectedCompletionDate ?? null,
        ],
      );
      const assignmentId = inserted.rows[0]?.id;
      if (assignmentId === undefined) {
        throw new Error("Failed to create manager assignment");
      }

      const nextStatus =
        locked.status === "booking_confirmed"
          ? "manager_assigned"
          : locked.status;
      const version = locked.version + 1;
      await client.query(
        `UPDATE event_records
         SET assigned_manager_user_id = $2,
             status = $3,
             updated_by_user_id = $4,
             version = $5
         WHERE id = $1`,
        [
          input.eventRecordId,
          input.body.managerUserId,
          nextStatus,
          input.actorUserId,
          version,
        ],
      );

      if (nextStatus !== locked.status) {
        await client.query(
          `INSERT INTO event_status_history (
             event_record_id, from_status, to_status, actor_user_id, reason
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            input.eventRecordId,
            locked.status,
            nextStatus,
            input.actorUserId,
            "Manager assigned",
          ],
        );
      }

      const topic = isReassign
        ? MANAGER_NOTIFICATION_TOPICS.managerReassigned
        : MANAGER_NOTIFICATION_TOPICS.managerAssigned;
      const notify = buildNotificationOutboxPayload(topic, {
        eventRecordId: input.eventRecordId,
        assignmentId,
        managerUserId: input.body.managerUserId,
        previousManagerUserId: previous?.manager_user_id,
      });

      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: isReassign ? "manager_reassigned" : "manager_assigned",
        title: isReassign ? "Manager reassigned" : "Manager assigned",
        content: `Manager ${input.body.managerUserId} is now responsible`,
        customerVisible: true,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "manager_assignment",
        content: isReassign ? "Manager reassigned" : "Manager assigned",
        customerVisible: true,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: topic,
        version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      const assignment = await this.loadAssignment(client, assignmentId);
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
    input: ManagerMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateManagerAssignmentRequest;
    },
  ): Promise<ManagerAssignmentSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{
        id: string;
        event_record_id: string;
        status: ManagerAssignmentStatus;
        branch_id: string;
        version: number;
      }>(
        `SELECT a.id, a.event_record_id, a.status, a.version, e.branch_id
         FROM event_manager_assignments a
         INNER JOIN event_records e ON e.id = a.event_record_id
         WHERE a.id = $1 AND e.branch_id = $2
         FOR UPDATE OF a`,
        [input.assignmentId, input.branchId],
      );
      const row = current.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const release =
        input.body.status === "released" || input.body.status === "completed";
      await client.query(
        `UPDATE event_manager_assignments
         SET priority = COALESCE($2, priority),
             manager_notes = CASE WHEN $3::boolean THEN $4 ELSE manager_notes END,
             internal_notes = CASE WHEN $5::boolean THEN $6 ELSE internal_notes END,
             expected_completion_date = CASE WHEN $7::boolean THEN $8::date ELSE expected_completion_date END,
             status = COALESCE($9, status),
             released_at = CASE WHEN $10::boolean THEN now() ELSE released_at END,
             version = version + 1
         WHERE id = $1`,
        [
          input.assignmentId,
          input.body.priority ?? null,
          input.body.managerNotes !== undefined,
          input.body.managerNotes ?? null,
          input.body.internalNotes !== undefined,
          input.body.internalNotes ?? null,
          input.body.expectedCompletionDate !== undefined,
          input.body.expectedCompletionDate ?? null,
          input.body.status ?? null,
          release,
        ],
      );

      if (release) {
        await client.query(
          `UPDATE event_records
           SET assigned_manager_user_id = NULL,
               updated_by_user_id = $2,
               version = version + 1
           WHERE id = $1`,
          [row.event_record_id, input.actorUserId],
        );
      }

      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "manager_assignment",
        content: "Manager assignment updated",
        customerVisible: false,
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: row.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "manager.assignment_updated",
        version: row.version + 1,
        payload: { assignmentId: input.assignmentId, ...input.body },
        outboxTopic: "manager.assignment_updated",
      });

      const updated = await this.loadAssignment(client, input.assignmentId);
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async getActiveAssignment(
    eventRecordId: string,
    branchId: string,
  ): Promise<ManagerAssignmentSummary | undefined> {
    const result = await this.pool.query<{ id: string }>(
      `SELECT a.id
       FROM event_manager_assignments a
       INNER JOIN event_records e ON e.id = a.event_record_id
       WHERE a.event_record_id = $1
         AND e.branch_id = $2
         AND a.status = 'active'
       LIMIT 1`,
      [eventRecordId, branchId],
    );
    const id = result.rows[0]?.id;
    if (id === undefined) return undefined;
    return this.loadAssignment(this.pool, id);
  }

  public async getManagerDashboard(
    branchId: string,
    managerUserId: string | undefined,
  ): Promise<ManagerDashboardResponse> {
    const events = managerUserId
      ? await this.listAssignedEventsForManager(managerUserId)
      : await this.listBranchEvents(branchId);

    const tasks = managerUserId
      ? await this.listTasksForManager(managerUserId)
      : await this.listBranchOpenTasks(branchId);

    const now = Date.now();
    const open = tasks.filter(
      (task) => task.status !== "completed" && task.status !== "cancelled",
    );
    const overdue = open.filter((task) => task.overdue);
    const upcoming = open
      .filter((task) => {
        if (task.dueAt === undefined) return true;
        const due = Date.parse(task.dueAt);
        return due >= now && due <= now + 7 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 20);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const completedToday = tasks.filter(
      (task) =>
        task.status === "completed" &&
        task.completedAt !== undefined &&
        Date.parse(task.completedAt) >= todayStart.getTime(),
    ).length;

    const progressToday = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM event_progress_updates
       WHERE report_date = (timezone('Asia/Kolkata', now()))::date
         AND ($1::uuid IS NULL OR created_by_user_id = $1)`,
      [managerUserId ?? null],
    );

    return {
      assignedEvents: events.length,
      activeTasks: open.length,
      overdueTasks: overdue.length,
      completedTasksToday: completedToday,
      progressUpdatesToday: Number(progressToday.rows[0]?.count ?? "0"),
      upcomingTasks: upcoming,
      overdueTaskList: overdue.slice(0, 20),
      myEvents: events,
    };
  }

  public async getEventDashboard(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventManagerDashboardResponse | undefined> {
    const event = await this.loadEventSummary(eventRecordId, branchId);
    if (event === undefined) return undefined;
    const [assignment, tasks, progress, timeline, activities] =
      await Promise.all([
        this.getActiveAssignment(eventRecordId, branchId),
        this.listTasks(eventRecordId, branchId),
        this.listProgress(eventRecordId),
        this.getTimeline(eventRecordId),
        this.getActivities(eventRecordId),
      ]);
    const open = tasks.filter(
      (task) => task.status !== "completed" && task.status !== "cancelled",
    );
    return {
      event,
      ...(assignment === undefined ? {} : { assignment }),
      tasks,
      upcomingTasks: open.filter((task) => !task.overdue).slice(0, 20),
      overdueTasks: open.filter((task) => task.overdue),
      progressUpdates: progress.updates,
      timeline,
      activities,
    };
  }

  public async listTasks(
    eventRecordId: string,
    branchId: string,
  ): Promise<readonly EventTaskSummary[]> {
    const result = await this.pool.query<TaskRow>(
      `${TASK_SELECT}
       WHERE t.event_record_id = $1 AND e.branch_id = $2
       ORDER BY t.due_at NULLS LAST, t.created_at DESC`,
      [eventRecordId, branchId],
    );
    return result.rows.map(toTask);
  }

  public async listTasksForManager(
    managerUserId: string,
    options?: { readonly todayOnly?: boolean },
  ): Promise<readonly EventTaskSummary[]> {
    const params: unknown[] = [managerUserId];
    let sql = `${TASK_SELECT}
      WHERE e.assigned_manager_user_id = $1`;
    if (options?.todayOnly === true) {
      sql += ` AND (
        t.due_at::date = (timezone('Asia/Kolkata', now()))::date
        OR (t.due_at IS NULL AND t.status NOT IN ('completed', 'cancelled'))
      )`;
    }
    sql += ` ORDER BY t.due_at NULLS LAST, t.created_at DESC`;
    const result = await this.pool.query<TaskRow>(sql, params);
    return result.rows.map(toTask);
  }

  public async getTask(
    taskId: string,
    branchId: string,
  ): Promise<EventTaskDetailResponse | undefined> {
    const result = await this.pool.query<TaskRow>(
      `${TASK_SELECT} WHERE t.id = $1 AND e.branch_id = $2`,
      [taskId, branchId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const [comments, history] = await Promise.all([
      this.pool.query<{
        id: string;
        task_id: string;
        content: string;
        created_by_user_id: string | null;
        created_at: Date;
      }>(
        `SELECT id, task_id, content, created_by_user_id, created_at
         FROM event_task_comments WHERE task_id = $1 ORDER BY created_at DESC`,
        [taskId],
      ),
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
        `SELECT id, task_id, change_type, from_status, to_status, summary,
                actor_user_id, occurred_at
         FROM event_task_history WHERE task_id = $1 ORDER BY occurred_at DESC`,
        [taskId],
      ),
    ]);
    return {
      ...toTask(row),
      comments: comments.rows.map((c) => ({
        id: c.id,
        taskId: c.task_id,
        content: c.content,
        createdAt: c.created_at.toISOString(),
        ...(c.created_by_user_id === null
          ? {}
          : { createdByUserId: c.created_by_user_id }),
      })),
      history: history.rows.map(
        (h): EventTaskHistoryEntry => ({
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
    };
  }

  public async createTask(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: CreateEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const status =
        input.body.assignedToUserId !== undefined
          ? input.body.status === "pending"
            ? "assigned"
            : input.body.status
          : input.body.status;

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO event_tasks (
           event_record_id, title, description, priority, status,
           assigned_to_user_id, estimated_minutes, due_at,
           created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
         RETURNING id`,
        [
          input.eventRecordId,
          input.body.title,
          input.body.description ?? null,
          input.body.priority,
          status,
          input.body.assignedToUserId ?? null,
          input.body.estimatedMinutes ?? null,
          input.body.dueAt ?? null,
          input.actorUserId,
        ],
      );
      const taskId = inserted.rows[0]?.id;
      if (taskId === undefined) throw new Error("Failed to create task");

      const loaded = await client.query<TaskRow>(
        `${TASK_SELECT} WHERE t.id = $1`,
        [taskId],
      );
      const row = loaded.rows[0];
      if (row === undefined) throw new Error("Failed to load created task");

      await appendTaskHistory(client, {
        taskId: row.id,
        actorUserId: input.actorUserId,
        changeType: "created",
        toStatus: row.status,
        summary: `Task created: ${row.title}`,
      });
      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "task_created",
        title: "Task created",
        content: row.title,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "task",
        content: `Task created: ${row.title}`,
        customerVisible: false,
      });

      const createdNotify = buildNotificationOutboxPayload(
        MANAGER_NOTIFICATION_TOPICS.taskCreated,
        {
          eventRecordId: input.eventRecordId,
          taskId: row.id,
          title: row.title,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "task.created",
        version: locked.version,
        payload: createdNotify.payload,
        outboxTopic: createdNotify.topic,
      });

      if (input.body.assignedToUserId !== undefined) {
        const assignedNotify = buildNotificationOutboxPayload(
          MANAGER_NOTIFICATION_TOPICS.taskAssigned,
          {
            eventRecordId: input.eventRecordId,
            taskId: row.id,
            assignedToUserId: input.body.assignedToUserId,
          },
        );
        await writeAuditOutbox(client, {
          requestId: input.requestId,
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          branchId: locked.branch_id,
          entityId: input.eventRecordId,
          entityType: "event_record",
          action: "task.assigned",
          version: locked.version,
          payload: assignedNotify.payload,
          outboxTopic: assignedNotify.topic,
        });
      }

      await client.query("COMMIT");
      return toTask(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateTask(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: UpdateEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<TaskRow & { branch_id: string }>(
        `SELECT t.*, e.branch_id
         FROM event_tasks t
         INNER JOIN event_records e ON e.id = t.event_record_id
         WHERE t.id = $1 AND e.branch_id = $2
         FOR UPDATE OF t`,
        [input.taskId, input.branchId],
      );
      const row = current.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const nextStatus = input.body.status ?? row.status;
      const updated = await client.query<{ id: string }>(
        `UPDATE event_tasks
         SET title = COALESCE($2, title),
             description = CASE WHEN $3::boolean THEN $4 ELSE description END,
             priority = COALESCE($5, priority),
             status = $6,
             assigned_to_user_id = CASE WHEN $7::boolean THEN $8 ELSE assigned_to_user_id END,
             estimated_minutes = CASE WHEN $9::boolean THEN $10 ELSE estimated_minutes END,
             actual_minutes = CASE WHEN $11::boolean THEN $12 ELSE actual_minutes END,
             due_at = CASE WHEN $13::boolean THEN $14::timestamptz ELSE due_at END,
             updated_by_user_id = $15,
             version = version + 1,
             completed_at = CASE WHEN $6 = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END
         WHERE id = $1
         RETURNING id`,
        [
          input.taskId,
          input.body.title ?? null,
          input.body.description !== undefined,
          input.body.description ?? null,
          input.body.priority ?? null,
          nextStatus,
          input.body.assignedToUserId !== undefined,
          input.body.assignedToUserId ?? null,
          input.body.estimatedMinutes !== undefined,
          input.body.estimatedMinutes ?? null,
          input.body.actualMinutes !== undefined,
          input.body.actualMinutes ?? null,
          input.body.dueAt !== undefined,
          input.body.dueAt ?? null,
          input.actorUserId,
        ],
      );
      if (updated.rows[0] === undefined)
        throw new Error("Failed to update task");
      const loaded = await client.query<TaskRow>(
        `${TASK_SELECT} WHERE t.id = $1`,
        [input.taskId],
      );
      const next = loaded.rows[0];
      if (next === undefined) throw new Error("Failed to load updated task");

      const statusChanged = nextStatus !== row.status;
      await appendTaskHistory(client, {
        taskId: input.taskId,
        actorUserId: input.actorUserId,
        changeType: statusChanged ? "status_changed" : "updated",
        fromStatus: row.status,
        toStatus: nextStatus,
        summary: statusChanged
          ? `Status ${row.status} → ${nextStatus}`
          : "Task updated",
      });
      await appendTimeline(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        entryType:
          nextStatus === "completed" && statusChanged
            ? "task_completed"
            : "task_updated",
        title:
          nextStatus === "completed" && statusChanged
            ? "Task completed"
            : "Task updated",
        content: next.title,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: row.event_record_id,
        actorUserId: input.actorUserId,
        activityType: "task",
        content: `Task updated: ${next.title}`,
        customerVisible: false,
      });

      const notify = buildNotificationOutboxPayload(
        nextStatus === "completed" && statusChanged
          ? MANAGER_NOTIFICATION_TOPICS.taskCompleted
          : statusChanged
            ? MANAGER_NOTIFICATION_TOPICS.taskStatusChanged
            : MANAGER_NOTIFICATION_TOPICS.taskUpdated,
        {
          eventRecordId: row.event_record_id,
          taskId: input.taskId,
          fromStatus: row.status,
          toStatus: nextStatus,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: row.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action:
          nextStatus === "completed" && statusChanged
            ? "task.completed"
            : statusChanged
              ? "task.status_changed"
              : "task.updated",
        version: next.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await client.query("COMMIT");
      return toTask(next);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async completeTask(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: CompleteEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined> {
    return this.updateTask({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      branchId: input.branchId,
      taskId: input.taskId,
      body: {
        status: "completed",
        ...(input.body.actualMinutes === undefined
          ? {}
          : { actualMinutes: input.body.actualMinutes }),
      },
    });
  }

  public async addTaskComment(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: AddEventTaskCommentRequest;
    },
  ): Promise<EventTaskCommentSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const task = await client.query<{
        id: string;
        event_record_id: string;
        branch_id: string;
        version: number;
      }>(
        `SELECT t.id, t.event_record_id, t.version, e.branch_id
         FROM event_tasks t
         INNER JOIN event_records e ON e.id = t.event_record_id
         WHERE t.id = $1 AND e.branch_id = $2
         FOR UPDATE OF t`,
        [input.taskId, input.branchId],
      );
      const row = task.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      const inserted = await client.query<{
        id: string;
        task_id: string;
        content: string;
        created_by_user_id: string | null;
        created_at: Date;
      }>(
        `INSERT INTO event_task_comments (task_id, content, created_by_user_id)
         VALUES ($1, $2, $3)
         RETURNING id, task_id, content, created_by_user_id, created_at`,
        [input.taskId, input.body.content, input.actorUserId],
      );
      const comment = inserted.rows[0];
      if (comment === undefined) throw new Error("Failed to add comment");
      await appendTaskHistory(client, {
        taskId: input.taskId,
        actorUserId: input.actorUserId,
        changeType: "comment_added",
        summary: input.body.content.slice(0, 200),
      });
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: row.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "task.comment_added",
        version: row.version,
        payload: { taskId: input.taskId, commentId: comment.id },
        outboxTopic: "task.comment_added",
      });
      await client.query("COMMIT");
      return {
        id: comment.id,
        taskId: comment.task_id,
        content: comment.content,
        createdAt: comment.created_at.toISOString(),
        ...(comment.created_by_user_id === null
          ? {}
          : { createdByUserId: comment.created_by_user_id }),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listProgress(
    eventRecordId: string,
  ): Promise<EventProgressListResponse> {
    const [updates, reports] = await Promise.all([
      this.pool.query<ProgressRow>(
        `SELECT * FROM event_progress_updates
         WHERE event_record_id = $1
         ORDER BY report_date DESC, created_at DESC`,
        [eventRecordId],
      ),
      this.pool.query<{
        id: string;
        event_record_id: string;
        report_date: Date | string;
        overall_summary: string | null;
        morning_progress_id: string | null;
        afternoon_progress_id: string | null;
        evening_progress_id: string | null;
        completion_progress_id: string | null;
      }>(
        `SELECT * FROM event_daily_reports
         WHERE event_record_id = $1
         ORDER BY report_date DESC`,
        [eventRecordId],
      ),
    ]);
    return {
      updates: updates.rows.map(toProgress),
      dailyReports: reports.rows.map(
        (r): EventDailyReportSummary => ({
          id: r.id,
          eventRecordId: r.event_record_id,
          reportDate: dateOnly(r.report_date),
          ...(r.overall_summary === null
            ? {}
            : { overallSummary: r.overall_summary }),
          ...(r.morning_progress_id === null
            ? {}
            : { morningProgressId: r.morning_progress_id }),
          ...(r.afternoon_progress_id === null
            ? {}
            : { afternoonProgressId: r.afternoon_progress_id }),
          ...(r.evening_progress_id === null
            ? {}
            : { eveningProgressId: r.evening_progress_id }),
          ...(r.completion_progress_id === null
            ? {}
            : { completionProgressId: r.completion_progress_id }),
        }),
      ),
    };
  }

  public async createProgress(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: CreateEventProgressRequest;
    },
  ): Promise<EventProgressUpdateSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await lockEvent(
        client,
        input.eventRecordId,
        input.branchId,
      );
      if (locked === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const reportDate =
        input.body.reportDate ??
        new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });
      const photos = input.body.photoPlaceholders ?? [];
      const attachments = input.body.attachmentPlaceholders ?? [];

      const inserted = await client.query<ProgressRow>(
        `INSERT INTO event_progress_updates (
           event_record_id, update_kind, summary, blockers, next_steps,
           percent_complete, photo_placeholders, attachment_placeholders,
           report_date, created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::date,$10,$10)
         ON CONFLICT (event_record_id, report_date, update_kind)
         DO UPDATE SET
           summary = EXCLUDED.summary,
           blockers = EXCLUDED.blockers,
           next_steps = EXCLUDED.next_steps,
           percent_complete = EXCLUDED.percent_complete,
           photo_placeholders = EXCLUDED.photo_placeholders,
           attachment_placeholders = EXCLUDED.attachment_placeholders,
           updated_by_user_id = EXCLUDED.updated_by_user_id,
           version = event_progress_updates.version + 1
         RETURNING *`,
        [
          input.eventRecordId,
          input.body.updateKind,
          input.body.summary,
          input.body.blockers ?? null,
          input.body.nextSteps ?? null,
          input.body.percentComplete ?? null,
          JSON.stringify(photos),
          JSON.stringify(attachments),
          reportDate,
          input.actorUserId,
        ],
      );
      const progress = inserted.rows[0];
      if (progress === undefined) throw new Error("Failed to save progress");

      await syncDailyReport(client, {
        eventRecordId: input.eventRecordId,
        reportDate,
        kind: input.body.updateKind,
        progressId: progress.id,
        actorUserId: input.actorUserId,
        summary: input.body.summary,
      });

      await appendTimeline(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        entryType: "progress_added",
        title: `Progress: ${input.body.updateKind.replaceAll("_", " ")}`,
        content: input.body.summary,
        customerVisible: false,
      });
      await appendActivity(client, {
        eventRecordId: input.eventRecordId,
        actorUserId: input.actorUserId,
        activityType: "progress",
        content: input.body.summary,
        customerVisible: false,
      });
      const notify = buildNotificationOutboxPayload(
        MANAGER_NOTIFICATION_TOPICS.progressAdded,
        {
          eventRecordId: input.eventRecordId,
          progressId: progress.id,
          updateKind: input.body.updateKind,
        },
      );
      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: locked.branch_id,
        entityId: input.eventRecordId,
        entityType: "event_record",
        action: "progress.added",
        version: locked.version,
        payload: notify.payload,
        outboxTopic: notify.topic,
      });

      await client.query("COMMIT");
      return toProgress(progress);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateProgress(
    input: ManagerMutationContext & {
      readonly progressId: string;
      readonly body: UpdateEventProgressRequest;
    },
  ): Promise<EventProgressUpdateSummary | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<ProgressRow & { branch_id: string }>(
        `SELECT p.*, e.branch_id
         FROM event_progress_updates p
         INNER JOIN event_records e ON e.id = p.event_record_id
         WHERE p.id = $1 AND e.branch_id = $2
         FOR UPDATE OF p`,
        [input.progressId, input.branchId],
      );
      const row = current.rows[0];
      if (row === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }

      const updated = await client.query<ProgressRow>(
        `UPDATE event_progress_updates
         SET summary = COALESCE($2, summary),
             blockers = CASE WHEN $3::boolean THEN $4 ELSE blockers END,
             next_steps = CASE WHEN $5::boolean THEN $6 ELSE next_steps END,
             percent_complete = CASE WHEN $7::boolean THEN $8 ELSE percent_complete END,
             photo_placeholders = CASE WHEN $9::boolean THEN $10::jsonb ELSE photo_placeholders END,
             attachment_placeholders = CASE WHEN $11::boolean THEN $12::jsonb ELSE attachment_placeholders END,
             updated_by_user_id = $13,
             version = version + 1
         WHERE id = $1
         RETURNING *`,
        [
          input.progressId,
          input.body.summary ?? null,
          input.body.blockers !== undefined,
          input.body.blockers ?? null,
          input.body.nextSteps !== undefined,
          input.body.nextSteps ?? null,
          input.body.percentComplete !== undefined,
          input.body.percentComplete ?? null,
          input.body.photoPlaceholders !== undefined,
          JSON.stringify(input.body.photoPlaceholders ?? []),
          input.body.attachmentPlaceholders !== undefined,
          JSON.stringify(input.body.attachmentPlaceholders ?? []),
          input.actorUserId,
        ],
      );
      const next = updated.rows[0];
      if (next === undefined) throw new Error("Failed to update progress");

      await writeAuditOutbox(client, {
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        branchId: row.branch_id,
        entityId: row.event_record_id,
        entityType: "event_record",
        action: "progress.updated",
        version: next.version,
        payload: { progressId: input.progressId },
        outboxTopic: "progress.updated",
      });
      await client.query("COMMIT");
      return toProgress(next);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listAssignedEventsForManager(
    managerUserId: string,
  ): Promise<readonly EventRecordSummary[]> {
    const result = await this.pool.query<EventSummaryRow>(
      `${EVENT_SUMMARY_SELECT}
       WHERE e.assigned_manager_user_id = $1
       ORDER BY e.event_date NULLS LAST, e.created_at DESC`,
      [managerUserId],
    );
    return result.rows.map(toEventSummary);
  }

  public async isAssignedManager(
    eventRecordId: string,
    managerUserId: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM event_records
       WHERE id = $1 AND assigned_manager_user_id = $2`,
      [eventRecordId, managerUserId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async listBranchEvents(
    branchId: string,
  ): Promise<readonly EventRecordSummary[]> {
    const result = await this.pool.query<EventSummaryRow>(
      `${EVENT_SUMMARY_SELECT}
       WHERE e.branch_id = $1
       ORDER BY e.event_date NULLS LAST, e.created_at DESC
       LIMIT 100`,
      [branchId],
    );
    return result.rows.map(toEventSummary);
  }

  private async listBranchOpenTasks(
    branchId: string,
  ): Promise<readonly EventTaskSummary[]> {
    const result = await this.pool.query<TaskRow>(
      `${TASK_SELECT}
       WHERE e.branch_id = $1
       ORDER BY t.due_at NULLS LAST, t.created_at DESC
       LIMIT 200`,
      [branchId],
    );
    return result.rows.map(toTask);
  }

  private async loadEventSummary(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventRecordSummary | undefined> {
    const result = await this.pool.query<EventSummaryRow>(
      `${EVENT_SUMMARY_SELECT} WHERE e.id = $1 AND e.branch_id = $2`,
      [eventRecordId, branchId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toEventSummary(row);
  }

  private async getTimeline(
    eventRecordId: string,
  ): Promise<readonly EventTimelineEntry[]> {
    const result = await this.pool.query<{
      id: string;
      entry_type: string;
      title: string;
      content: string | null;
      customer_visible: boolean;
      actor_user_id: string | null;
      occurred_at: Date;
    }>(
      `SELECT id, entry_type, title, content, customer_visible, actor_user_id, occurred_at
       FROM event_timelines WHERE event_record_id = $1 ORDER BY occurred_at DESC`,
      [eventRecordId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      entryType: row.entry_type as EventTimelineEntry["entryType"],
      title: row.title,
      customerVisible: row.customer_visible,
      occurredAt: row.occurred_at.toISOString(),
      ...(row.content === null ? {} : { content: row.content }),
      ...(row.actor_user_id === null ? {} : { actorUserId: row.actor_user_id }),
    }));
  }

  private async getActivities(
    eventRecordId: string,
  ): Promise<readonly EventActivitySummary[]> {
    const result = await this.pool.query<{
      id: string;
      activity_type: string;
      content: string | null;
      customer_visible: boolean;
      actor_user_id: string | null;
      occurred_at: Date;
    }>(
      `SELECT id, activity_type, content, customer_visible, actor_user_id, occurred_at
       FROM event_activities WHERE event_record_id = $1 ORDER BY occurred_at DESC`,
      [eventRecordId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      activityType: row.activity_type as EventActivitySummary["activityType"],
      customerVisible: row.customer_visible,
      occurredAt: row.occurred_at.toISOString(),
      ...(row.content === null ? {} : { content: row.content }),
      ...(row.actor_user_id === null ? {} : { actorUserId: row.actor_user_id }),
    }));
  }

  private async loadAssignment(
    db: Pool | PoolClient,
    assignmentId: string,
  ): Promise<ManagerAssignmentSummary | undefined> {
    const result = await db.query<{
      id: string;
      event_record_id: string;
      manager_user_id: string;
      manager_display_name: string | null;
      assigned_by_user_id: string | null;
      status: ManagerAssignmentStatus;
      priority: EventTaskPriority;
      manager_notes: string | null;
      internal_notes: string | null;
      expected_completion_date: Date | string | null;
      assigned_at: Date;
      released_at: Date | null;
      version: number;
    }>(
      `SELECT a.*, u.display_name AS manager_display_name
       FROM event_manager_assignments a
       LEFT JOIN app_users u ON u.id = a.manager_user_id
       WHERE a.id = $1`,
      [assignmentId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    return {
      id: row.id,
      eventRecordId: row.event_record_id,
      managerUserId: row.manager_user_id,
      status: row.status,
      priority: row.priority,
      assignedAt: row.assigned_at.toISOString(),
      version: row.version,
      ...(row.manager_display_name === null
        ? {}
        : { managerDisplayName: row.manager_display_name }),
      ...(row.assigned_by_user_id === null
        ? {}
        : { assignedByUserId: row.assigned_by_user_id }),
      ...(row.manager_notes === null
        ? {}
        : { managerNotes: row.manager_notes }),
      ...(row.internal_notes === null
        ? {}
        : { internalNotes: row.internal_notes }),
      ...(row.expected_completion_date === null
        ? {}
        : {
            expectedCompletionDate: dateOnly(row.expected_completion_date),
          }),
      ...(row.released_at === null
        ? {}
        : { releasedAt: row.released_at.toISOString() }),
    };
  }
}

interface TaskRow {
  readonly id: string;
  readonly event_record_id: string;
  readonly event_number: string | null;
  readonly event_name: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly priority: EventTaskPriority;
  readonly status: EventTaskStatus;
  readonly assigned_to_user_id: string | null;
  readonly estimated_minutes: number | null;
  readonly actual_minutes: number | null;
  readonly due_at: Date | null;
  readonly completed_at: Date | null;
  readonly created_by_user_id: string | null;
  readonly updated_by_user_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly version: number;
}

interface ProgressRow {
  readonly id: string;
  readonly event_record_id: string;
  readonly update_kind: EventProgressUpdateKind;
  readonly summary: string;
  readonly blockers: string | null;
  readonly next_steps: string | null;
  readonly percent_complete: number | null;
  readonly photo_placeholders: unknown;
  readonly attachment_placeholders: unknown;
  readonly report_date: Date | string;
  readonly created_by_user_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly version: number;
}

interface EventSummaryRow {
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
  readonly venue_name: string | null;
  readonly venue_address: string | null;
  readonly guest_count: number | null;
  readonly budget_amount: string;
  readonly advance_paid: string;
  readonly pending_amount: string;
  readonly status: EventRecordStatus;
  readonly priority: EventRecordPriority;
  readonly assigned_manager_user_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

const TASK_BASE_SELECT = `SELECT t.id, t.event_record_id,
  t.title, t.description, t.priority, t.status, t.assigned_to_user_id,
  t.estimated_minutes, t.actual_minutes, t.due_at, t.completed_at,
  t.created_by_user_id, t.updated_by_user_id, t.created_at, t.updated_at, t.version`;

const TASK_SELECT = `${TASK_BASE_SELECT},
  e.event_number, e.event_name
  FROM event_tasks t
  LEFT JOIN event_records e ON e.id = t.event_record_id`;

const EVENT_SUMMARY_SELECT = `SELECT e.id, e.event_number, e.booking_id, b.booking_number,
  e.quotation_id, e.lead_id, e.enquiry_id, e.customer_id,
  c.display_name AS customer_display_name, e.event_type_name, e.event_name,
  e.event_date, e.venue_name, e.venue_address, e.guest_count,
  e.budget_amount::text, e.advance_paid::text, e.pending_amount::text,
  e.status, e.priority, e.assigned_manager_user_id, e.created_at, e.updated_at
  FROM event_records e
  LEFT JOIN bookings b ON b.id = e.booking_id
  LEFT JOIN customers c ON c.id = e.customer_id`;

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
    `INSERT INTO event_task_history (
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

async function syncDailyReport(
  client: PoolClient,
  input: {
    readonly eventRecordId: string;
    readonly reportDate: string;
    readonly kind: EventProgressUpdateKind;
    readonly progressId: string;
    readonly actorUserId: string;
    readonly summary: string;
  },
): Promise<void> {
  const column =
    input.kind === "morning"
      ? "morning_progress_id"
      : input.kind === "afternoon"
        ? "afternoon_progress_id"
        : input.kind === "evening"
          ? "evening_progress_id"
          : "completion_progress_id";

  await client.query(
    `INSERT INTO event_daily_reports (
       event_record_id, report_date, ${column}, overall_summary,
       created_by_user_id, updated_by_user_id
     ) VALUES ($1, $2::date, $3, $4, $5, $5)
     ON CONFLICT (event_record_id, report_date)
     DO UPDATE SET
       ${column} = EXCLUDED.${column},
       overall_summary = CASE
         WHEN $6 = 'completion_summary' THEN EXCLUDED.overall_summary
         ELSE COALESCE(event_daily_reports.overall_summary, EXCLUDED.overall_summary)
       END,
       updated_by_user_id = EXCLUDED.updated_by_user_id,
       version = event_daily_reports.version + 1`,
    [
      input.eventRecordId,
      input.reportDate,
      input.progressId,
      input.summary,
      input.actorUserId,
      input.kind,
    ],
  );
}

function toTask(row: TaskRow): EventTaskSummary {
  const overdue =
    row.due_at !== null &&
    row.status !== "completed" &&
    row.status !== "cancelled" &&
    row.due_at.getTime() < Date.now();
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    title: row.title,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
    overdue,
    ...(row.event_number === null ? {} : { eventNumber: row.event_number }),
    ...(row.event_name === null ? {} : { eventName: row.event_name }),
    ...(row.description === null ? {} : { description: row.description }),
    ...(row.assigned_to_user_id === null
      ? {}
      : { assignedToUserId: row.assigned_to_user_id }),
    ...(row.estimated_minutes === null
      ? {}
      : { estimatedMinutes: row.estimated_minutes }),
    ...(row.actual_minutes === null
      ? {}
      : { actualMinutes: row.actual_minutes }),
    ...(row.due_at === null ? {} : { dueAt: row.due_at.toISOString() }),
    ...(row.completed_at === null
      ? {}
      : { completedAt: row.completed_at.toISOString() }),
    ...(row.created_by_user_id === null
      ? {}
      : { createdByUserId: row.created_by_user_id }),
    ...(row.updated_by_user_id === null
      ? {}
      : { updatedByUserId: row.updated_by_user_id }),
  };
}

function toProgress(row: ProgressRow): EventProgressUpdateSummary {
  return {
    id: row.id,
    eventRecordId: row.event_record_id,
    updateKind: row.update_kind,
    summary: row.summary,
    photoPlaceholders: asStringArray(row.photo_placeholders),
    attachmentPlaceholders: asStringArray(row.attachment_placeholders),
    reportDate: dateOnly(row.report_date),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
    ...(row.blockers === null ? {} : { blockers: row.blockers }),
    ...(row.next_steps === null ? {} : { nextSteps: row.next_steps }),
    ...(row.percent_complete === null
      ? {}
      : { percentComplete: row.percent_complete }),
    ...(row.created_by_user_id === null
      ? {}
      : { createdByUserId: row.created_by_user_id }),
  };
}

function toEventSummary(row: EventSummaryRow): EventRecordSummary {
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
    ...(row.event_date === null ? {} : { eventDate: dateOnly(row.event_date) }),
    ...(row.venue_name === null ? {} : { venueName: row.venue_name }),
    ...(row.venue_address === null ? {} : { venueAddress: row.venue_address }),
    ...(row.guest_count === null ? {} : { guestCount: row.guest_count }),
    ...(row.assigned_manager_user_id === null
      ? {}
      : { assignedManagerUserId: row.assigned_manager_user_id }),
  };
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function dateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
