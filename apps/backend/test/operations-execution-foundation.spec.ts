import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AssignOperationsTaskRequest,
  AttendanceLogSummary,
  CheckInAttendanceRequest,
  CheckOutAttendanceRequest,
  CompleteEventOperationsRequest,
  CreateEventIssueRequest,
  CreateOperationsTaskRequest,
  EventCompletionSummary,
  EventIssueSummary,
  EventOperationsDetailResponse,
  EventActivitySummary,
  EventPhotoSummary,
  EventProgressSummary,
  EventTimelineEntry,
  FinalizeAttendanceRequest,
  MaterialUsageSummary,
  OperationsDashboardResponse,
  OperationsTaskAssignmentSummary,
  OperationsTaskDetailResponse,
  OperationsTaskSummary,
  RecordMaterialUsageRequest,
  UpdateCompletionChecklistRequest,
  UpdateEventIssueRequest,
  UpdateMaterialUsageRequest,
  UpdateOperationsTaskRequest,
  UpdateTaskAssignmentRequest,
  UploadEventPhotoRequest,
} from "@me-event/api-contracts";
import { DomainError } from "../src/common/errors/domain.error";
import { OperationsService } from "../src/modules/operations/application/operations.service";
import type {
  OperationsMutationContext,
  OperationsRepository,
} from "../src/modules/operations/ports/operations-repository";
import {
  HYDERABAD_BRANCH,
  type AuthenticatedPrincipal,
} from "../src/modules/platform-foundation/domain/platform-foundation";
import { PatternBSideEffects } from "./helpers/pattern-b-side-effects";

class FakeOperationsRepository implements OperationsRepository {
  public events = new Map<string, EventOperationsDetailResponse>();
  public tasks = new Map<string, OperationsTaskSummary>();
  public assignments = new Map<string, OperationsTaskAssignmentSummary>();
  public attendance = new Map<string, AttendanceLogSummary>();
  public issues = new Map<string, EventIssueSummary>();
  public photos = new Map<string, EventPhotoSummary>();
  public materials = new Map<string, MaterialUsageSummary>();
  public timelineByEvent = new Map<string, EventTimelineEntry[]>();
  public patternB = new PatternBSideEffects();
  public eventBranches = new Map<string, string>();

  private inBranch(eventRecordId: string, branchId: string): boolean {
    return (
      (this.eventBranches.get(eventRecordId) ?? HYDERABAD_BRANCH.id) ===
      branchId
    );
  }

  private pushTimeline(
    input: OperationsMutationContext,
    eventRecordId: string,
    entryType: EventTimelineEntry["entryType"],
    title: string,
    side: {
      readonly activityType: string;
      readonly action: string;
      readonly outboxTopic: string;
      readonly content?: string;
    },
  ): void {
    const entry = this.patternB.appendTimeline(eventRecordId, {
      entryType,
      title,
      ...(side.content === undefined ? {} : { content: side.content }),
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(eventRecordId, {
      activityType: side.activityType as EventActivitySummary["activityType"],
      content: side.content ?? title,
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: eventRecordId,
      action: side.action,
      outboxTopic: side.outboxTopic,
    });
    const list = this.timelineByEvent.get(eventRecordId) ?? [];
    this.timelineByEvent.set(eventRecordId, [entry, ...list]);
    const detail = this.events.get(eventRecordId);
    if (detail !== undefined) {
      this.events.set(eventRecordId, {
        ...detail,
        timeline: [entry, ...detail.timeline],
      });
    }
  }

  private recalc(eventRecordId: string): EventProgressSummary {
    const detail = this.events.get(eventRecordId);
    if (detail === undefined) {
      throw new Error("missing event");
    }
    const tasks = [...this.tasks.values()].filter(
      (t) => t.eventRecordId === eventRecordId && t.status !== "cancelled",
    );
    const completed = tasks.filter((t) => t.status === "completed");
    const total = tasks.length;
    const pending = total - completed.length;
    const overall =
      total === 0
        ? 0
        : Math.round(
            tasks.reduce((sum, t) => sum + t.completionPercent, 0) / total,
          );
    let status: EventProgressSummary["status"] = "not_started";
    if (total === 0 || completed.length === 0) {
      status =
        tasks.some(
          (t) =>
            t.status !== "pending" &&
            t.status !== "cancelled" &&
            t.status !== "completed",
        ) || overall > 0
          ? "in_progress"
          : "not_started";
    } else if (completed.length === total) {
      status = "completed";
    } else {
      status = "in_progress";
    }
    const now = new Date().toISOString();
    const progress: EventProgressSummary = {
      ...detail.progress,
      totalTasks: total,
      completedTasks: completed.length,
      pendingTasks: pending,
      overallCompletionPercent: overall,
      status,
      lastCalculatedAt: now,
      updatedAt: now,
      version: detail.progress.version + 1,
    };
    this.events.set(eventRecordId, { ...detail, progress });
    return progress;
  }

  private refreshGates(eventRecordId: string): EventCompletionSummary {
    const detail = this.events.get(eventRecordId);
    if (detail === undefined) throw new Error("missing event");
    const tasks = [...this.tasks.values()].filter(
      (t) => t.eventRecordId === eventRecordId,
    );
    const mandatoryIncomplete = tasks.some(
      (t) =>
        t.isMandatory && t.status !== "completed" && t.status !== "cancelled",
    );
    const materials = [...this.materials.values()].filter(
      (m) => m.eventRecordId === eventRecordId,
    );
    const materialsFinalized = materials.every((m) => m.status === "finalized");
    const photos = [...this.photos.values()].filter(
      (p) =>
        p.eventRecordId === eventRecordId && p.category === "completion_proof",
    );
    const openAttendance = [...this.attendance.values()].some(
      (a) => a.eventRecordId === eventRecordId && a.status === "checked_in",
    );
    const completion: EventCompletionSummary = {
      ...detail.completion,
      mandatoryTasksComplete: !mandatoryIncomplete,
      materialsFinalized,
      finalPhotosUploaded: photos.length > 0,
      attendanceFinalized: openAttendance
        ? false
        : detail.completion.attendanceFinalized,
      status:
        detail.completion.status === "completed"
          ? "completed"
          : !mandatoryIncomplete &&
              detail.completion.attendanceFinalized &&
              !openAttendance &&
              materialsFinalized &&
              photos.length > 0 &&
              detail.completion.checklistFinished
            ? "ready"
            : "in_progress",
      version: detail.completion.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.events.set(eventRecordId, { ...detail, completion });
    return completion;
  }

  public async getDashboard(
    _branchId: string,
  ): Promise<OperationsDashboardResponse> {
    const progress = [...this.events.values()].map((e) => e.progress);
    return {
      totalEvents: progress.length,
      inProgressEvents: progress.filter((p) => p.status === "in_progress")
        .length,
      completedEvents: progress.filter((p) => p.status === "completed").length,
      openIssues: [...this.issues.values()].filter(
        (i) => i.status !== "resolved" && i.status !== "closed",
      ).length,
      pendingTasks: [...this.tasks.values()].filter(
        (t) => t.status !== "completed" && t.status !== "cancelled",
      ).length,
      checkedInWorkers: [...this.attendance.values()].filter(
        (a) => a.status === "checked_in",
      ).length,
      progress,
      recentIssues: [...this.issues.values()].slice(0, 20),
      recentTasks: [...this.tasks.values()].slice(0, 20),
    };
  }

  public async listEvents(
    _branchId: string,
  ): Promise<readonly EventProgressSummary[]> {
    return [...this.events.values()].map((e) => e.progress);
  }

  public async getEventOperations(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventOperationsDetailResponse | undefined> {
    if (!this.inBranch(eventRecordId, branchId)) return undefined;
    return this.events.get(eventRecordId);
  }

  public async ensureEventOperations(
    input: OperationsMutationContext & { readonly eventRecordId: string },
  ): Promise<EventProgressSummary | undefined> {
    const existing = this.events.get(input.eventRecordId);
    if (existing !== undefined) {
      if (!this.inBranch(input.eventRecordId, input.branchId)) {
        return undefined;
      }
      return existing.progress;
    }
    this.eventBranches.set(input.eventRecordId, input.branchId);
    const now = new Date().toISOString();
    const progress: EventProgressSummary = {
      id: randomUUID(),
      eventRecordId: input.eventRecordId,
      eventNumber: "EV-OPS",
      eventName: "Ops Test Event",
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overallCompletionPercent: 0,
      status: "not_started",
      lastCalculatedAt: now,
      updatedAt: now,
      version: 1,
    };
    const completion: EventCompletionSummary = {
      id: randomUUID(),
      eventRecordId: input.eventRecordId,
      eventNumber: "EV-OPS",
      status: "in_progress",
      mandatoryTasksComplete: true,
      attendanceFinalized: false,
      materialsFinalized: true,
      finalPhotosUploaded: false,
      checklistFinished: false,
      checklist: {},
      updatedAt: now,
      version: 1,
    };
    this.events.set(input.eventRecordId, {
      eventRecordId: input.eventRecordId,
      eventNumber: "EV-OPS",
      eventName: "Ops Test Event",
      progress,
      completion,
      tasks: [],
      attendance: [],
      issues: [],
      photos: [],
      materials: [],
      timeline: [],
    });
    this.timelineByEvent.set(input.eventRecordId, []);
    return progress;
  }

  public async createTask(
    input: OperationsMutationContext & {
      readonly body: CreateOperationsTaskRequest;
    },
  ): Promise<OperationsTaskSummary | undefined> {
    await this.ensureEventOperations({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const now = new Date().toISOString();
    const task: OperationsTaskSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      eventNumber: "EV-OPS",
      title: input.body.title,
      ...(input.body.description === undefined
        ? {}
        : { description: input.body.description }),
      priority: input.body.priority ?? "normal",
      status: "pending",
      category: input.body.category ?? "other",
      completionPercent: 0,
      isMandatory: input.body.isMandatory ?? false,
      ...(input.body.notes === undefined ? {} : { notes: input.body.notes }),
      assignments: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.tasks.set(task.id, task);
    this.pushTimeline(
      input,
      input.body.eventRecordId,
      "ops_task_created",
      task.title,
      {
        activityType: "ops_task",
        action: "operations.task_created",
        outboxTopic: "operations.task_created",
        content: `Task created: ${task.title}`,
      },
    );
    this.recalc(input.body.eventRecordId);
    this.refreshGates(input.body.eventRecordId);
    return task;
  }

  public async updateTask(
    input: OperationsMutationContext & {
      readonly taskId: string;
      readonly body: UpdateOperationsTaskRequest;
    },
  ): Promise<OperationsTaskSummary | undefined> {
    const current = this.tasks.get(input.taskId);
    if (current === undefined) return undefined;
    const updated: OperationsTaskSummary = {
      ...current,
      title: input.body.title ?? current.title,
      priority: input.body.priority ?? current.priority,
      status: input.body.status ?? current.status,
      category: input.body.category ?? current.category,
      completionPercent:
        input.body.completionPercent ?? current.completionPercent,
      isMandatory: input.body.isMandatory ?? current.isMandatory,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(input.taskId, updated);
    const entryType =
      input.body.status === "completed"
        ? "ops_task_completed"
        : input.body.completionPercent !== undefined
          ? "ops_task_progress"
          : "ops_task_updated";
    this.pushTimeline(input, current.eventRecordId, entryType, updated.title, {
      activityType: "ops_task",
      action: "operations.task_updated",
      outboxTopic: "operations.task_updated",
      content: `Task updated (${entryType})`,
    });
    this.recalc(current.eventRecordId);
    this.refreshGates(current.eventRecordId);
    return updated;
  }

  public async listTasks(
    _branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly OperationsTaskSummary[]> {
    return [...this.tasks.values()].filter(
      (t) =>
        filters?.eventRecordId === undefined ||
        t.eventRecordId === filters.eventRecordId,
    );
  }

  public async getTask(
    taskId: string,
    branchId: string,
  ): Promise<OperationsTaskDetailResponse | undefined> {
    const task = this.tasks.get(taskId);
    if (task === undefined || !this.inBranch(task.eventRecordId, branchId)) {
      return undefined;
    }
    return {
      ...task,
      timeline: this.timelineByEvent.get(task.eventRecordId) ?? [],
    };
  }

  public async assignTask(
    input: OperationsMutationContext & {
      readonly taskId: string;
      readonly body: AssignOperationsTaskRequest;
    },
  ): Promise<OperationsTaskAssignmentSummary | undefined> {
    const task = this.tasks.get(input.taskId);
    if (task === undefined) return undefined;
    const { assigneeType } = input.body;
    if (
      (assigneeType === "manager" && input.body.managerUserId === undefined) ||
      (assigneeType === "supervisor" &&
        input.body.supervisorUserId === undefined) ||
      (assigneeType === "vendor" && input.body.vendorId === undefined) ||
      (assigneeType === "worker" && input.body.workerId === undefined)
    ) {
      return undefined;
    }
    if (
      assigneeType === "manager" ||
      assigneeType === "supervisor" ||
      assigneeType === "vendor"
    ) {
      for (const [id, a] of this.assignments) {
        if (
          a.taskId === input.taskId &&
          a.assigneeType === assigneeType &&
          a.status === "active"
        ) {
          this.assignments.set(id, {
            ...a,
            status: "released",
            version: a.version + 1,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    const now = new Date().toISOString();
    const assignment: OperationsTaskAssignmentSummary = {
      id: randomUUID(),
      taskId: input.taskId,
      eventRecordId: task.eventRecordId,
      assigneeType,
      status: "active",
      ...(input.body.managerUserId === undefined
        ? {}
        : { managerUserId: input.body.managerUserId }),
      ...(input.body.supervisorUserId === undefined
        ? {}
        : { supervisorUserId: input.body.supervisorUserId }),
      ...(input.body.vendorId === undefined
        ? {}
        : { vendorId: input.body.vendorId }),
      ...(input.body.workerId === undefined
        ? {}
        : { workerId: input.body.workerId }),
      assignedAt: now,
      updatedAt: now,
      version: 1,
    };
    this.assignments.set(assignment.id, assignment);
    this.tasks.set(input.taskId, {
      ...task,
      status:
        task.status === "pending" || task.status === "planning"
          ? "assigned"
          : task.status,
      assignments: [
        assignment,
        ...task.assignments.filter((a) => a.status === "active"),
      ],
      version: task.version + 1,
    });
    this.pushTimeline(
      input,
      task.eventRecordId,
      "ops_task_assigned",
      "Assigned",
      {
        activityType: "ops_assignment",
        action: "operations.task_assigned",
        outboxTopic: "operations.task_assigned",
      },
    );
    this.recalc(task.eventRecordId);
    return assignment;
  }

  public async updateAssignment(
    input: OperationsMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateTaskAssignmentRequest;
    },
  ): Promise<OperationsTaskAssignmentSummary | undefined> {
    const current = this.assignments.get(input.assignmentId);
    if (current === undefined) return undefined;
    const updated: OperationsTaskAssignmentSummary = {
      ...current,
      status: input.body.status ?? current.status,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.assignments.set(input.assignmentId, updated);
    this.pushTimeline(
      input,
      current.eventRecordId,
      "ops_task_assigned",
      "Assignment updated",
      {
        activityType: "ops_assignment",
        action: "operations.assignment_updated",
        outboxTopic: "operations.task_assigned",
      },
    );
    return updated;
  }

  public async checkIn(
    input: OperationsMutationContext & {
      readonly body: CheckInAttendanceRequest;
    },
  ): Promise<AttendanceLogSummary | undefined> {
    await this.ensureEventOperations({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const open = [...this.attendance.values()].some(
      (a) =>
        a.eventRecordId === input.body.eventRecordId &&
        a.workerId === input.body.workerId &&
        a.status === "checked_in",
    );
    if (open) return undefined;
    const now = new Date().toISOString();
    const log: AttendanceLogSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      workerId: input.body.workerId,
      ...(input.body.taskId === undefined ? {} : { taskId: input.body.taskId }),
      checkInAt: now,
      status: "checked_in",
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.attendance.set(log.id, log);
    this.pushTimeline(
      input,
      input.body.eventRecordId,
      "ops_attendance_check_in",
      "Check-in",
      {
        activityType: "ops_attendance",
        action: "operations.attendance_check_in",
        outboxTopic: "operations.attendance_recorded",
      },
    );
    const detail = this.events.get(input.body.eventRecordId);
    if (detail !== undefined) {
      this.events.set(input.body.eventRecordId, {
        ...detail,
        completion: {
          ...detail.completion,
          attendanceFinalized: false,
        },
      });
    }
    this.refreshGates(input.body.eventRecordId);
    return log;
  }

  public async checkOut(
    input: OperationsMutationContext & {
      readonly body: CheckOutAttendanceRequest;
    },
  ): Promise<AttendanceLogSummary | undefined> {
    const current = this.attendance.get(input.body.attendanceLogId);
    if (current === undefined || current.status !== "checked_in") {
      return undefined;
    }
    const now = new Date().toISOString();
    const updated: AttendanceLogSummary = {
      ...current,
      checkOutAt: now,
      workingMinutes: 60,
      status: "checked_out",
      updatedAt: now,
      version: current.version + 1,
    };
    this.attendance.set(updated.id, updated);
    this.pushTimeline(
      input,
      current.eventRecordId,
      "ops_attendance_check_out",
      "Check-out",
      {
        activityType: "ops_attendance",
        action: "operations.attendance_check_out",
        outboxTopic: "operations.attendance_recorded",
      },
    );
    return updated;
  }

  public async finalizeAttendance(
    input: OperationsMutationContext & {
      readonly body: FinalizeAttendanceRequest;
    },
  ): Promise<EventCompletionSummary | undefined> {
    const open = [...this.attendance.values()].some(
      (a) =>
        a.eventRecordId === input.body.eventRecordId &&
        a.status === "checked_in",
    );
    if (open) return undefined;
    const detail = this.events.get(input.body.eventRecordId);
    if (detail === undefined) return undefined;
    for (const [id, a] of this.attendance) {
      if (
        a.eventRecordId === input.body.eventRecordId &&
        a.status === "checked_out"
      ) {
        this.attendance.set(id, { ...a, status: "finalized" });
      }
    }
    this.events.set(input.body.eventRecordId, {
      ...detail,
      completion: {
        ...detail.completion,
        attendanceFinalized: true,
        version: detail.completion.version + 1,
      },
    });
    this.pushTimeline(
      input,
      input.body.eventRecordId,
      "ops_attendance_check_out",
      "Attendance finalized",
      {
        activityType: "ops_attendance",
        action: "operations.attendance_finalized",
        outboxTopic: "operations.attendance_recorded",
      },
    );
    return this.refreshGates(input.body.eventRecordId);
  }

  public async listAttendance(
    _branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly AttendanceLogSummary[]> {
    return [...this.attendance.values()].filter(
      (a) =>
        filters?.eventRecordId === undefined ||
        a.eventRecordId === filters.eventRecordId,
    );
  }

  public async createIssue(
    input: OperationsMutationContext & {
      readonly body: CreateEventIssueRequest;
    },
  ): Promise<EventIssueSummary | undefined> {
    await this.ensureEventOperations({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const now = new Date().toISOString();
    const issue: EventIssueSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      issueType: input.body.issueType ?? "other",
      priority: input.body.priority ?? "normal",
      status: "open",
      description: input.body.description,
      attachmentPlaceholders: input.body.attachmentPlaceholders ?? [],
      reportedByUserId: input.actorUserId,
      reportedByRole: input.actorRole,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.issues.set(issue.id, issue);
    this.pushTimeline(
      input,
      input.body.eventRecordId,
      "ops_issue_created",
      "Issue created",
      {
        activityType: "ops_issue",
        action: "operations.issue_created",
        outboxTopic: "operations.issue_created",
      },
    );
    return issue;
  }

  public async updateIssue(
    input: OperationsMutationContext & {
      readonly issueId: string;
      readonly body: UpdateEventIssueRequest;
    },
  ): Promise<EventIssueSummary | undefined> {
    const current = this.issues.get(input.issueId);
    if (current === undefined) return undefined;
    const updated: EventIssueSummary = {
      ...current,
      status: input.body.status ?? current.status,
      priority: input.body.priority ?? current.priority,
      description: input.body.description ?? current.description,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.issues.set(input.issueId, updated);
    this.pushTimeline(
      input,
      current.eventRecordId,
      "ops_issue_updated",
      "Issue updated",
      {
        activityType: "ops_issue",
        action: "operations.issue_updated",
        outboxTopic: "operations.issue_updated",
      },
    );
    return updated;
  }

  public async listIssues(
    _branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly EventIssueSummary[]> {
    return [...this.issues.values()].filter(
      (i) =>
        filters?.eventRecordId === undefined ||
        i.eventRecordId === filters.eventRecordId,
    );
  }

  public async uploadPhoto(
    input: OperationsMutationContext & {
      readonly body: UploadEventPhotoRequest;
    },
  ): Promise<EventPhotoSummary | undefined> {
    await this.ensureEventOperations({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const photo: EventPhotoSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      category: input.body.category,
      createdAt: new Date().toISOString(),
      uploadedByUserId: input.actorUserId,
      ...(input.body.storageKey === undefined
        ? {}
        : { storageKey: input.body.storageKey }),
    };
    this.photos.set(photo.id, photo);
    this.pushTimeline(
      input,
      input.body.eventRecordId,
      "ops_photo_uploaded",
      "Photo uploaded",
      {
        activityType: "ops_photo",
        action: "operations.photo_uploaded",
        outboxTopic: "operations.photo_uploaded",
      },
    );
    this.refreshGates(input.body.eventRecordId);
    return photo;
  }

  public async listPhotos(
    _branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly EventPhotoSummary[]> {
    return [...this.photos.values()].filter(
      (p) =>
        filters?.eventRecordId === undefined ||
        p.eventRecordId === filters.eventRecordId,
    );
  }

  public async recordMaterial(
    input: OperationsMutationContext & {
      readonly body: RecordMaterialUsageRequest;
    },
  ): Promise<MaterialUsageSummary | undefined> {
    await this.ensureEventOperations({
      ...input,
      eventRecordId: input.body.eventRecordId,
    });
    const now = new Date().toISOString();
    const material: MaterialUsageSummary = {
      id: randomUUID(),
      eventRecordId: input.body.eventRecordId,
      itemLabel: input.body.itemLabel,
      quantityIssued: input.body.quantityIssued ?? 0,
      quantityUsed: input.body.quantityUsed ?? 0,
      quantityReturned: input.body.quantityReturned ?? 0,
      quantityDamaged: input.body.quantityDamaged ?? 0,
      quantityLost: input.body.quantityLost ?? 0,
      status: "open",
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.materials.set(material.id, material);
    this.pushTimeline(
      input,
      input.body.eventRecordId,
      "ops_material_recorded",
      material.itemLabel,
      {
        activityType: "ops_material",
        action: "operations.material_recorded",
        outboxTopic: "operations.material_recorded",
      },
    );
    this.refreshGates(input.body.eventRecordId);
    return material;
  }

  public async updateMaterial(
    input: OperationsMutationContext & {
      readonly materialId: string;
      readonly body: UpdateMaterialUsageRequest;
    },
  ): Promise<MaterialUsageSummary | undefined> {
    const current = this.materials.get(input.materialId);
    if (current === undefined) return undefined;
    const updated: MaterialUsageSummary = {
      ...current,
      quantityIssued: input.body.quantityIssued ?? current.quantityIssued,
      quantityUsed: input.body.quantityUsed ?? current.quantityUsed,
      quantityReturned: input.body.quantityReturned ?? current.quantityReturned,
      quantityDamaged: input.body.quantityDamaged ?? current.quantityDamaged,
      quantityLost: input.body.quantityLost ?? current.quantityLost,
      status: input.body.status ?? current.status,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.materials.set(input.materialId, updated);
    this.pushTimeline(
      input,
      current.eventRecordId,
      "ops_material_recorded",
      "Material updated",
      {
        activityType: "ops_material",
        action: "operations.material_updated",
        outboxTopic: "operations.material_recorded",
      },
    );
    this.refreshGates(current.eventRecordId);
    return updated;
  }

  public async listMaterials(
    _branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly MaterialUsageSummary[]> {
    return [...this.materials.values()].filter(
      (m) =>
        filters?.eventRecordId === undefined ||
        m.eventRecordId === filters.eventRecordId,
    );
  }

  public async listProgress(
    _branchId: string,
  ): Promise<readonly EventProgressSummary[]> {
    return [...this.events.values()].map((e) => e.progress);
  }

  public async recalculateProgress(
    input: OperationsMutationContext & { readonly eventRecordId: string },
  ): Promise<EventProgressSummary | undefined> {
    if (!this.events.has(input.eventRecordId)) return undefined;
    this.pushTimeline(
      input,
      input.eventRecordId,
      "ops_progress_recalculated",
      "Recalculated",
      {
        activityType: "ops_progress",
        action: "operations.progress_recalculated",
        outboxTopic: "operations.progress_updated",
      },
    );
    return this.recalc(input.eventRecordId);
  }

  public async updateChecklist(
    input: OperationsMutationContext & {
      readonly eventRecordId: string;
      readonly body: UpdateCompletionChecklistRequest;
    },
  ): Promise<EventCompletionSummary | undefined> {
    const detail = this.events.get(input.eventRecordId);
    if (detail === undefined) return undefined;
    const checklist = {
      ...detail.completion.checklist,
      ...(input.body.checklist ?? {}),
    };
    const values = Object.values(checklist);
    const checklistFinished =
      values.length > 0 && values.every((v) => v === true);
    this.events.set(input.eventRecordId, {
      ...detail,
      completion: {
        ...detail.completion,
        checklist,
        checklistFinished,
        ...(input.body.notes === undefined ? {} : { notes: input.body.notes }),
        version: detail.completion.version + 1,
      },
    });
    this.pushTimeline(
      input,
      input.eventRecordId,
      checklistFinished ? "ops_completion_ready" : "ops_progress_recalculated",
      "Checklist",
      {
        activityType: checklistFinished ? "ops_completion" : "ops_progress",
        action: "operations.checklist_updated",
        outboxTopic: "operations.progress_updated",
      },
    );
    return this.refreshGates(input.eventRecordId);
  }

  public async completeEvent(
    input: OperationsMutationContext & {
      readonly eventRecordId: string;
      readonly body: CompleteEventOperationsRequest;
    },
  ): Promise<EventCompletionSummary | undefined> {
    const detail = this.events.get(input.eventRecordId);
    if (detail === undefined) return undefined;
    this.recalc(input.eventRecordId);
    const completion = this.refreshGates(input.eventRecordId);
    const gatesPass =
      completion.mandatoryTasksComplete &&
      completion.attendanceFinalized &&
      completion.materialsFinalized &&
      completion.finalPhotosUploaded &&
      completion.checklistFinished;
    if (!gatesPass || completion.status === "completed") return undefined;
    const now = new Date().toISOString();
    const updated: EventCompletionSummary = {
      ...completion,
      status: "completed",
      completedAt: now,
      completedByUserId: input.actorUserId,
      ...(input.body.notes === undefined && completion.notes === undefined
        ? {}
        : { notes: input.body.notes ?? completion.notes }),
      version: completion.version + 1,
      updatedAt: now,
    };
    const current = this.events.get(input.eventRecordId);
    if (current === undefined) return undefined;
    this.events.set(input.eventRecordId, {
      ...current,
      completion: updated,
      progress: {
        ...current.progress,
        status: "completed",
        overallCompletionPercent: 100,
      },
    });
    this.pushTimeline(
      input,
      input.eventRecordId,
      "ops_event_completed",
      "Event completed",
      {
        activityType: "ops_completion",
        action: "operations.event_completed",
        outboxTopic: "operations.event_completed",
      },
    );
    return updated;
  }

  public async getCompletion(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventCompletionSummary | undefined> {
    if (!this.inBranch(eventRecordId, branchId)) return undefined;
    return this.events.get(eventRecordId)?.completion;
  }
}

const opsUser: AuthenticatedPrincipal = {
  userId: "ops-1",
  sessionId: "s1",
  activeRole: "manager",
  roleAssignments: [
    {
      role: "manager",
      active: true,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
  ],
  branchId: HYDERABAD_BRANCH.id,
};

describe("Operations (Event Execution) Foundation", () => {
  let repo: FakeOperationsRepository;
  let service: OperationsService;
  let eventId: string;
  let workerId: string;

  beforeEach(() => {
    repo = new FakeOperationsRepository();
    service = new OperationsService(repo);
    eventId = randomUUID();
    workerId = randomUUID();
  });

  it("creates tasks, assigns, tracks attendance/issues/materials, and completes when gates pass", async () => {
    await service.ensureEventOperations(opsUser, eventId);

    const task = await service.createTask(opsUser, {
      eventRecordId: eventId,
      title: "Stage setup",
      category: "stage_setup",
      isMandatory: true,
      priority: "high",
    });
    expect(task.status).toBe("pending");
    expect(task.isMandatory).toBe(true);

    const assignment = await service.assignTask(opsUser, task.id, {
      assigneeType: "worker",
      workerId,
    });
    expect(assignment.assigneeType).toBe("worker");
    expect(assignment.workerId).toBe(workerId);

    await service.updateTask(opsUser, task.id, {
      status: "in_progress",
      completionPercent: 40,
    });

    const checkIn = await service.checkIn(opsUser, {
      eventRecordId: eventId,
      workerId,
      taskId: task.id,
    });
    expect(checkIn.status).toBe("checked_in");

    const checkOut = await service.checkOut(opsUser, {
      attendanceLogId: checkIn.id,
    });
    expect(checkOut.status).toBe("checked_out");

    const issue = await service.createIssue(opsUser, {
      eventRecordId: eventId,
      issueType: "material_missing",
      description: "Missing backdrop stands",
      priority: "high",
    });
    expect(issue.status).toBe("open");

    const material = await service.recordMaterial(opsUser, {
      eventRecordId: eventId,
      itemLabel: "LED panels",
      quantityIssued: 10,
      quantityUsed: 8,
      quantityReturned: 0,
      quantityDamaged: 0,
      quantityLost: 0,
    });
    expect(material.status).toBe("open");

    await service.updateTask(opsUser, task.id, {
      status: "completed",
      completionPercent: 100,
    });

    const progress = await service.recalculateProgress(opsUser, eventId);
    expect(progress.totalTasks).toBe(1);
    expect(progress.completedTasks).toBe(1);
    expect(progress.overallCompletionPercent).toBe(100);
    expect(progress.status).toBe("completed");

    await expect(
      service.completeEvent(opsUser, eventId, {}),
    ).rejects.toBeInstanceOf(DomainError);

    await service.finalizeAttendance(opsUser, { eventRecordId: eventId });
    await service.updateMaterial(opsUser, material.id, { status: "finalized" });
    await service.uploadPhoto(opsUser, {
      eventRecordId: eventId,
      category: "completion_proof",
      storageKey: "photos/proof-1.jpg",
    });
    await service.updateChecklist(opsUser, eventId, {
      checklist: { site_cleared: true, handover_done: true },
    });

    const completed = await service.completeEvent(opsUser, eventId, {
      notes: "All done",
    });
    expect(completed.status).toBe("completed");
    expect(completed.completedByUserId).toBe(opsUser.userId);

    const detail = await service.getEventOperations(opsUser, eventId);
    const types = detail.timeline.map((e) => e.entryType);
    expect(types).toContain("ops_task_created");
    expect(types).toContain("ops_task_assigned");
    expect(types).toContain("ops_attendance_check_in");
    expect(types).toContain("ops_attendance_check_out");
    expect(types).toContain("ops_issue_created");
    expect(types).toContain("ops_material_recorded");
    expect(types).toContain("ops_photo_uploaded");
    expect(types).toContain("ops_event_completed");
    expect(repo.patternB.activityTypes(eventId)).toContain("ops_task");
    expect(repo.patternB.activityTypes(eventId)).toContain("ops_attendance");
    expect(repo.patternB.activityTypes(eventId)).toContain("ops_issue");
    expect(repo.patternB.activityTypes(eventId)).toContain("ops_completion");
    expect(repo.patternB.outboxTopics()).toContain("operations.task_created");
    expect(repo.patternB.outboxTopics()).toContain(
      "operations.event_completed",
    );
    expect(repo.patternB.auditActions()).toContain("operations.issue_created");
    expect(repo.patternB.auditActions()).toContain(
      "operations.material_recorded",
    );
    expect(repo.patternB.audits.some((a) => a.actorUserId && a.requestId)).toBe(
      true,
    );
  });

  it("exposes operations dashboard counts", async () => {
    await service.ensureEventOperations(opsUser, eventId);
    await service.createTask(opsUser, {
      eventRecordId: eventId,
      title: "Decorations",
      category: "decorations",
      priority: "normal",
      isMandatory: false,
    });
    await service.createIssue(opsUser, {
      eventRecordId: eventId,
      description: "Vendor delayed",
      issueType: "vendor_late",
      priority: "normal",
    });
    const dashboard = await service.getDashboard(opsUser);
    expect(dashboard.totalEvents).toBe(1);
    expect(dashboard.pendingTasks).toBe(1);
    expect(dashboard.openIssues).toBe(1);
  });

  it("rejects completion when mandatory task is incomplete", async () => {
    await service.ensureEventOperations(opsUser, eventId);
    await service.createTask(opsUser, {
      eventRecordId: eventId,
      title: "Mandatory cleanup",
      isMandatory: true,
      priority: "normal",
      category: "cleanup",
    });
    await service.finalizeAttendance(opsUser, { eventRecordId: eventId });
    await service.uploadPhoto(opsUser, {
      eventRecordId: eventId,
      category: "completion_proof",
    });
    await service.updateChecklist(opsUser, eventId, {
      checklist: { done: true },
    });
    await expect(
      service.completeEvent(opsUser, eventId, {}),
    ).rejects.toMatchObject({
      code: "OPS_COMPLETION_GATES_FAILED",
      status: 409,
    });
  });

  it("denies other-branch operations detail as 404", async () => {
    await service.ensureEventOperations(opsUser, eventId);
    const other: AuthenticatedPrincipal = {
      ...opsUser,
      userId: "ops-other",
      branchId: "00000000-0000-4000-8000-000000000002",
    };
    await expect(
      service.getEventOperations(opsUser, eventId),
    ).resolves.toMatchObject({ eventRecordId: eventId });
    await expect(
      service.getEventOperations(other, eventId),
    ).rejects.toMatchObject({
      code: "EVENT_OPERATIONS_NOT_FOUND",
      status: 404,
    });
  });
});
