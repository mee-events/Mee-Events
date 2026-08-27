import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AddWorkerNoteRequest,
  AssignWorkerRequest,
  CreateWorkerRequest,
  EventActivitySummary,
  EventTimelineEntry,
  RejectWorkerTaskRequest,
  UpdateWorkerRequest,
  WorkerAttendanceSummary,
  WorkerCheckInRequest,
  WorkerCheckOutRequest,
  WorkerDashboardResponse,
  WorkerDetailResponse,
  WorkerNoteSummary,
  WorkerProgressUpdateRequest,
  WorkerSummary,
  WorkerTaskDetailResponse,
  WorkerTaskSummary,
} from "@me-event/api-contracts";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import { WorkerService } from "../src/modules/workers/application/worker.service";
import type {
  WorkerMutationContext,
  WorkerRepository,
} from "../src/modules/workers/ports/worker-repository";
import { PatternBSideEffects } from "./helpers/pattern-b-side-effects";

class FakeWorkerRepository implements WorkerRepository {
  public workers = new Map<string, WorkerDetailResponse>();
  public tasks = new Map<string, WorkerTaskDetailResponse>();
  public userLinks = new Map<string, string>(); // userId -> workerId
  public attendance: WorkerAttendanceSummary[] = [];
  public patternB = new PatternBSideEffects();

  public async listWorkers(options: {
    readonly branchId: string;
    readonly vendorId?: string;
    readonly limit?: number;
    readonly offset?: number;
    readonly search?: string;
  }): Promise<{
    readonly items: readonly WorkerSummary[];
    readonly total: number;
  }> {
    void options.branchId;
    let items = [...this.workers.values()].map(toSummary);
    if (options.vendorId !== undefined) {
      items = items.filter((w) => w.primaryVendorId === options.vendorId);
    }
    if (options.search !== undefined && options.search.length > 0) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (w) =>
          w.displayName.toLowerCase().includes(q) ||
          w.workerCode.toLowerCase().includes(q) ||
          w.phoneE164.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 200;
    return { items: items.slice(offset, offset + limit), total };
  }

  public async getWorker(
    workerId: string,
    branchId?: string,
  ): Promise<WorkerDetailResponse | undefined> {
    if (
      branchId !== undefined &&
      branchId !== "00000000-0000-4000-8000-000000000001"
    ) {
      return undefined;
    }
    return this.workers.get(workerId);
  }

  public async createWorker(
    input: WorkerMutationContext & { readonly body: CreateWorkerRequest },
  ): Promise<WorkerDetailResponse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const worker: WorkerDetailResponse = {
      id,
      workerCode: "WRK-TEST-1",
      displayName: input.body.displayName,
      phoneE164: input.body.phoneE164,
      status: "active",
      availabilityStatus: "available",
      skills: (input.body.skills ?? []).map((s) => ({
        id: randomUUID(),
        skillCode: s.skillCode,
        skillLabel: s.skillLabel,
        proficiency: s.proficiency ?? "standard",
      })),
      memberships: [
        {
          id: randomUUID(),
          employmentType: input.body.employmentType ?? "vendor",
          membershipRole: "worker",
          status: "active",
          isPrimary: true,
          ...(input.body.vendorId === undefined
            ? {}
            : { vendorId: input.body.vendorId }),
        },
      ],
      documents: [],
      createdAt: now,
      updatedAt: now,
      ...(input.body.email === undefined ? {} : { email: input.body.email }),
      ...(input.body.userId === undefined ? {} : { userId: input.body.userId }),
      ...(input.body.vendorId === undefined
        ? {}
        : { primaryVendorId: input.body.vendorId }),
    };
    this.workers.set(id, worker);
    if (input.body.userId !== undefined) {
      this.userLinks.set(input.body.userId, id);
    }
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "worker",
      entityId: id,
      action: "worker.created",
      outboxTopic: "worker.created",
    });
    return worker;
  }

  public async updateWorker(
    input: WorkerMutationContext & {
      readonly workerId: string;
      readonly body: UpdateWorkerRequest;
    },
  ): Promise<WorkerDetailResponse | undefined> {
    const current = this.workers.get(input.workerId);
    if (current === undefined) return undefined;
    const updated: WorkerDetailResponse = {
      ...current,
      displayName: input.body.displayName ?? current.displayName,
      updatedAt: new Date().toISOString(),
    };
    this.workers.set(input.workerId, updated);
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "worker",
      entityId: input.workerId,
      action: "worker.updated",
      outboxTopic: "worker.updated",
    });
    return updated;
  }

  public async assignWorker(
    input: WorkerMutationContext & { readonly body: AssignWorkerRequest },
  ): Promise<WorkerTaskSummary | undefined> {
    const worker = this.workers.get(input.body.workerId);
    if (worker === undefined) return undefined;
    const id = randomUUID();
    const now = new Date().toISOString();
    const timelineEntry = this.patternB.appendTimeline(
      input.body.eventRecordId,
      {
        entryType: "worker_assigned",
        title: "Worker assigned",
        customerVisible: true,
        actorUserId: input.actorUserId,
      },
    );
    this.patternB.appendActivity(input.body.eventRecordId, {
      activityType: "worker_assignment",
      content: `Worker assigned: ${input.body.title}`,
      customerVisible: true,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: input.body.eventRecordId,
      action: "worker.assigned",
      outboxTopic: "worker.assigned",
    });
    const detail: WorkerTaskDetailResponse = {
      id,
      eventRecordId: input.body.eventRecordId,
      workerId: input.body.workerId,
      title: input.body.title,
      status: "assigned",
      assignedAt: now,
      version: 1,
      workerDisplayName: worker.displayName,
      eventNumber: "EV-TEST",
      history: [
        {
          id: randomUUID(),
          taskId: id,
          changeType: "created",
          summary: "Worker assigned",
          occurredAt: now,
        },
      ],
      checkins: [],
      progress: [],
      notes: [],
      timeline: [timelineEntry],
    };
    this.tasks.set(id, detail);
    return detail;
  }

  public async acceptTask(
    input: WorkerMutationContext & { readonly taskId: string },
  ): Promise<WorkerTaskSummary | undefined> {
    return this.patchTask(input, "accepted", "worker_accepted", {
      activityType: "worker_assignment",
      action: "worker.accepted",
      outboxTopic: "worker.accepted",
    });
  }

  public async rejectTask(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: RejectWorkerTaskRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    return this.patchTask(input, "rejected", "worker_rejected", {
      activityType: "worker_assignment",
      action: "worker.rejected",
      outboxTopic: "worker.rejected",
    });
  }

  public async checkIn(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerCheckInRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const task = await this.patchTask(
      input,
      "checked_in",
      "worker_checked_in",
      {
        activityType: "worker_attendance",
        action: "worker.checked_in",
        outboxTopic: "worker.checked_in",
      },
    );
    if (task !== undefined) {
      this.attendance.push({
        id: randomUUID(),
        workerId: task.workerId,
        attendanceDate: new Date().toISOString().slice(0, 10),
        status: "present",
        createdAt: new Date().toISOString(),
        taskId: task.id,
        eventRecordId: task.eventRecordId,
      });
    }
    return task;
  }

  public async checkOut(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerCheckOutRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const markCompleted = input.body.markCompleted === true;
    return this.patchTask(input, "checked_out", "worker_checked_out", {
      activityType: markCompleted ? "worker_progress" : "worker_attendance",
      action: markCompleted ? "worker.task_completed" : "worker.checked_out",
      outboxTopic: markCompleted
        ? "worker.task_completed"
        : "worker.checked_out",
    });
  }

  public async updateProgress(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerProgressUpdateRequest;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const current = this.tasks.get(input.taskId);
    if (current === undefined) return undefined;
    const now = new Date().toISOString();
    const timelineEntry = this.patternB.appendTimeline(current.eventRecordId, {
      entryType: "worker_progress_updated",
      title: "Progress",
      content: input.body.summary,
      customerVisible: true,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(current.eventRecordId, {
      activityType: "worker_progress",
      content: input.body.summary,
      customerVisible: true,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: current.eventRecordId,
      action: "worker.progress_updated",
      outboxTopic: "worker.progress_updated",
    });
    const updated: WorkerTaskDetailResponse = {
      ...current,
      status: input.body.status ?? "working",
      latestProgressSummary: input.body.summary,
      version: current.version + 1,
      progress: [
        {
          id: randomUUID(),
          taskId: input.taskId,
          workerId: current.workerId,
          summary: input.body.summary,
          photoPlaceholders: input.body.photoPlaceholders ?? [],
          createdAt: now,
        },
        ...current.progress,
      ],
      timeline: [timelineEntry, ...current.timeline],
    };
    this.tasks.set(input.taskId, updated);
    return updated;
  }

  public async listTasks(filters?: {
    readonly workerId?: string;
    readonly eventRecordId?: string;
    readonly vendorId?: string;
    readonly branchId?: string;
  }): Promise<readonly WorkerTaskSummary[]> {
    if (
      filters?.branchId !== undefined &&
      filters.branchId !== "00000000-0000-4000-8000-000000000001"
    ) {
      return [];
    }
    return [...this.tasks.values()].filter(
      (t) => filters?.workerId === undefined || t.workerId === filters.workerId,
    );
  }

  public async getTask(
    taskId: string,
    branchId?: string,
  ): Promise<WorkerTaskDetailResponse | undefined> {
    if (
      branchId !== undefined &&
      branchId !== "00000000-0000-4000-8000-000000000001"
    ) {
      return undefined;
    }
    return this.tasks.get(taskId);
  }

  public async addNote(
    input: WorkerMutationContext & {
      readonly workerId: string;
      readonly body: AddWorkerNoteRequest;
    },
  ): Promise<WorkerNoteSummary | undefined> {
    if (!this.workers.has(input.workerId)) return undefined;
    return {
      id: randomUUID(),
      workerId: input.workerId,
      noteType: input.body.noteType ?? "internal",
      content: input.body.content,
      createdAt: new Date().toISOString(),
    };
  }

  public async listAttendance(filters?: {
    readonly workerId?: string;
    readonly branchId?: string;
  }): Promise<readonly WorkerAttendanceSummary[]> {
    if (
      filters?.branchId !== undefined &&
      filters.branchId !== "00000000-0000-4000-8000-000000000001"
    ) {
      return [];
    }
    return this.attendance.filter(
      (a) => filters?.workerId === undefined || a.workerId === filters.workerId,
    );
  }

  public async getCrmDashboard(
    _branchId: string,
  ): Promise<WorkerDashboardResponse> {
    const tasks = [...this.tasks.values()];
    const workers = [...this.workers.values()].map(toSummary);
    return {
      totalWorkers: this.workers.size,
      activeTasks: tasks.filter(
        (t) => !["checked_out", "cancelled", "rejected"].includes(t.status),
      ).length,
      pendingAcceptances: tasks.filter((t) => t.status === "assigned").length,
      checkedInToday: this.attendance.filter((a) => a.status === "present")
        .length,
      completedTasks: tasks.filter(
        (t) => t.status === "completed" || t.status === "checked_out",
      ).length,
      workers,
      openTasks: tasks,
      recentAttendance: this.attendance,
    };
  }

  public async getWorkerDashboard(
    userId: string,
  ): Promise<WorkerDashboardResponse> {
    const workerId = this.userLinks.get(userId);
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
    return this.getCrmDashboard("00000000-0000-4000-8000-000000000001");
  }

  public async findWorkerIdForUser(
    userId: string,
  ): Promise<string | undefined> {
    return this.userLinks.get(userId);
  }

  public async isWorkerUser(
    workerId: string,
    userId: string,
  ): Promise<boolean> {
    return this.userLinks.get(userId) === workerId;
  }

  private async patchTask(
    input: WorkerMutationContext & { readonly taskId: string },
    status: WorkerTaskSummary["status"],
    timelineType: EventTimelineEntry["entryType"],
    side: {
      readonly activityType: EventActivitySummary["activityType"];
      readonly action: string;
      readonly outboxTopic: string;
    },
  ): Promise<WorkerTaskSummary | undefined> {
    const current = this.tasks.get(input.taskId);
    if (current === undefined) return undefined;
    const timelineEntry = this.patternB.appendTimeline(current.eventRecordId, {
      entryType: timelineType,
      title: timelineType,
      customerVisible: true,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(current.eventRecordId, {
      activityType: side.activityType,
      content: timelineType,
      customerVisible: true,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: current.eventRecordId,
      action: side.action,
      outboxTopic: side.outboxTopic,
    });
    const updated: WorkerTaskDetailResponse = {
      ...current,
      status,
      version: current.version + 1,
      timeline: [timelineEntry, ...current.timeline],
    };
    this.tasks.set(input.taskId, updated);
    return updated;
  }
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

const employee: AuthenticatedPrincipal = {
  userId: "employee-1",
  sessionId: "s1",
  activeRole: "employee",
  roleAssignments: [{ role: "employee", active: true }],
};

const workerUser: AuthenticatedPrincipal = {
  userId: "worker-user-1",
  sessionId: "s2",
  activeRole: "worker",
  roleAssignments: [{ role: "worker", active: true }],
};

describe("Worker Management Foundation", () => {
  let repo: FakeWorkerRepository;
  let service: WorkerService;

  beforeEach(() => {
    repo = new FakeWorkerRepository();
    service = new WorkerService(repo);
  });

  it("runs assign → accept → check-in → progress → check-out with timeline", async () => {
    const eventRecordId = randomUUID();
    const worker = await service.create(employee, {
      displayName: "Field Worker",
      phoneE164: "+919000000004",
      employmentType: "vendor",
      vendorId: randomUUID(),
      userId: workerUser.userId,
      skills: [
        {
          skillCode: "decoration",
          skillLabel: "Decoration",
          proficiency: "standard",
        },
      ],
    });

    const task = await service.assign(employee, {
      workerId: worker.id,
      eventRecordId,
      title: "Stage setup",
    });

    await service.accept(workerUser, task.id);
    await service.checkIn(workerUser, task.id, {
      gpsPlaceholder: "17.3850,78.4867",
      locationPlaceholder: "Venue gate",
    });
    await service.progress(workerUser, task.id, {
      summary: "Stage half complete",
      percentComplete: 50,
      status: "working",
    });
    await service.checkOut(workerUser, task.id, {
      completionNotes: "Stage ready",
      markCompleted: true,
    });

    const detail = await service.getTask(employee, task.id);
    const types = detail.timeline.map((e) => e.entryType);

    expect(types).toContain("worker_assigned");
    expect(types).toContain("worker_accepted");
    expect(types).toContain("worker_checked_in");
    expect(types).toContain("worker_progress_updated");
    expect(types).toContain("worker_checked_out");
    expect(detail.status).toBe("checked_out");
    expect(repo.patternB.activityTypes(eventRecordId)).toContain(
      "worker_assignment",
    );
    expect(repo.patternB.activityTypes(eventRecordId)).toContain(
      "worker_attendance",
    );
    expect(repo.patternB.activityTypes(eventRecordId)).toContain(
      "worker_progress",
    );
    expect(repo.patternB.outboxTopics()).toContain("worker.assigned");
    expect(repo.patternB.outboxTopics()).toContain("worker.checked_in");
    expect(repo.patternB.outboxTopics()).toContain("worker.task_completed");
    expect(repo.patternB.auditActions()).toContain("worker.progress_updated");
    expect(repo.patternB.audits.some((a) => a.actorUserId && a.requestId)).toBe(
      true,
    );
  });

  it("exposes CRM dashboard counts", async () => {
    const worker = await service.create(employee, {
      displayName: "Field Worker",
      phoneE164: "+919000000004",
      employmentType: "vendor",
      vendorId: randomUUID(),
    });
    await service.assign(employee, {
      workerId: worker.id,
      eventRecordId: randomUUID(),
      title: "Lighting",
    });

    const dashboard = await service.getCrmDashboard(employee);
    expect(dashboard.totalWorkers).toBe(1);
    expect(dashboard.pendingAcceptances).toBe(1);
    expect(dashboard.activeTasks).toBe(1);
  });

  it("denies other-branch worker task detail as 404", async () => {
    const worker = await service.create(employee, {
      displayName: "Field Worker",
      phoneE164: "+919000000004",
      employmentType: "vendor",
      vendorId: randomUUID(),
    });
    const task = await service.assign(employee, {
      workerId: worker.id,
      eventRecordId: randomUUID(),
      title: "Lighting",
    });
    const other: AuthenticatedPrincipal = {
      ...employee,
      userId: "other-branch",
      branchId: "00000000-0000-4000-8000-000000000002",
    };
    await expect(service.getTask(employee, task.id)).resolves.toMatchObject({
      id: task.id,
    });
    await expect(service.getTask(other, task.id)).rejects.toMatchObject({
      code: "WORKER_TASK_NOT_FOUND",
      status: 404,
    });
    await expect(service.get(other, worker.id)).rejects.toMatchObject({
      code: "WORKER_NOT_FOUND",
      status: 404,
    });
  });
});
