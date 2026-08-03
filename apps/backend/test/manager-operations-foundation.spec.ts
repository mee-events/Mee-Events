import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AddEventTaskCommentRequest,
  AssignEventManagerRequest,
  CompleteEventTaskRequest,
  CreateEventProgressRequest,
  CreateEventTaskRequest,
  EventManagerDashboardResponse,
  EventProgressListResponse,
  EventProgressUpdateSummary,
  EventRecordSummary,
  EventTaskCommentSummary,
  EventTaskDetailResponse,
  EventTaskSummary,
  ManagerAssignmentSummary,
  ManagerCandidateSummary,
  ManagerDashboardResponse,
  UpdateEventProgressRequest,
  UpdateEventTaskRequest,
  UpdateManagerAssignmentRequest,
} from "@me-event/api-contracts";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import { ManagerOperationsService } from "../src/modules/manager-operations/application/manager-operations.service";
import type {
  ManagerMutationContext,
  ManagerOperationsRepository,
} from "../src/modules/manager-operations/ports/manager-operations-repository";

class FakeManagerOpsRepository implements ManagerOperationsRepository {
  public readonly assignments = new Map<string, ManagerAssignmentSummary>();
  public readonly tasks = new Map<string, EventTaskDetailResponse>();
  public readonly progress = new Map<string, EventProgressUpdateSummary>();
  public event: EventRecordSummary = {
    id: randomUUID(),
    eventNumber: "EV-TEST-001",
    bookingId: randomUUID(),
    quotationId: randomUUID(),
    leadId: randomUUID(),
    enquiryId: randomUUID(),
    customerId: randomUUID(),
    eventTypeName: "Wedding",
    eventName: "Test Wedding",
    budgetAmount: "100000.00",
    advancePaid: "30000.00",
    pendingAmount: "70000.00",
    status: "booking_confirmed",
    priority: "normal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  public async listManagerCandidates(): Promise<
    readonly ManagerCandidateSummary[]
  > {
    return [
      {
        userId: "manager-1",
        displayName: "Dev Event Manager",
        role: "manager",
      },
    ];
  }

  public async assignManager(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: AssignEventManagerRequest;
    },
  ): Promise<ManagerAssignmentSummary | undefined> {
    if (input.eventRecordId !== this.event.id) return undefined;
    const assignment: ManagerAssignmentSummary = {
      id: randomUUID(),
      eventRecordId: input.eventRecordId,
      managerUserId: input.body.managerUserId,
      status: "active",
      priority: input.body.priority,
      assignedAt: new Date().toISOString(),
      version: 1,
      assignedByUserId: input.actorUserId,
    };
    this.assignments.set(assignment.id, assignment);
    this.event = {
      ...this.event,
      status: "manager_assigned",
      assignedManagerUserId: input.body.managerUserId,
    };
    return assignment;
  }

  public async updateAssignment(
    input: ManagerMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateManagerAssignmentRequest;
    },
  ): Promise<ManagerAssignmentSummary | undefined> {
    const current = this.assignments.get(input.assignmentId);
    if (current === undefined) return undefined;
    const updated: ManagerAssignmentSummary = {
      ...current,
      version: current.version + 1,
      ...(input.body.priority === undefined
        ? {}
        : { priority: input.body.priority }),
    };
    this.assignments.set(input.assignmentId, updated);
    return updated;
  }

  public async getActiveAssignment(
    eventRecordId: string,
  ): Promise<ManagerAssignmentSummary | undefined> {
    return [...this.assignments.values()].find(
      (item) =>
        item.eventRecordId === eventRecordId && item.status === "active",
    );
  }

  public async getManagerDashboard(
    _branchId: string,
    managerUserId: string | undefined,
  ): Promise<ManagerDashboardResponse> {
    const tasks = [...this.tasks.values()];
    const open = tasks.filter(
      (task) => task.status !== "completed" && task.status !== "cancelled",
    );
    return {
      assignedEvents:
        managerUserId === undefined ||
        this.event.assignedManagerUserId === managerUserId
          ? 1
          : 0,
      activeTasks: open.length,
      overdueTasks: open.filter((task) => task.overdue).length,
      completedTasksToday: tasks.filter((task) => task.status === "completed")
        .length,
      progressUpdatesToday: this.progress.size,
      upcomingTasks: open,
      overdueTaskList: open.filter((task) => task.overdue),
      myEvents:
        managerUserId === undefined ||
        this.event.assignedManagerUserId === managerUserId
          ? [this.event]
          : [],
    };
  }

  public async getEventDashboard(
    eventRecordId: string,
  ): Promise<EventManagerDashboardResponse | undefined> {
    if (eventRecordId !== this.event.id) return undefined;
    const assignment = await this.getActiveAssignment(eventRecordId);
    const tasks = [...this.tasks.values()].filter(
      (task) => task.eventRecordId === eventRecordId,
    );
    return {
      event: this.event,
      ...(assignment === undefined ? {} : { assignment }),
      tasks,
      upcomingTasks: tasks.filter((task) => !task.overdue),
      overdueTasks: tasks.filter((task) => task.overdue),
      progressUpdates: [...this.progress.values()],
      timeline: [],
      activities: [],
    };
  }

  public async listTasks(
    eventRecordId: string,
  ): Promise<readonly EventTaskSummary[]> {
    return [...this.tasks.values()].filter(
      (task) => task.eventRecordId === eventRecordId,
    );
  }

  public async listTasksForManager(
    managerUserId: string,
  ): Promise<readonly EventTaskSummary[]> {
    if (this.event.assignedManagerUserId !== managerUserId) return [];
    return [...this.tasks.values()];
  }

  public async getTask(
    taskId: string,
  ): Promise<EventTaskDetailResponse | undefined> {
    return this.tasks.get(taskId);
  }

  public async createTask(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: CreateEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined> {
    if (input.eventRecordId !== this.event.id) return undefined;
    const id = randomUUID();
    const now = new Date().toISOString();
    const task: EventTaskDetailResponse = {
      id,
      eventRecordId: input.eventRecordId,
      title: input.body.title,
      priority: input.body.priority,
      status: input.body.status,
      createdAt: now,
      updatedAt: now,
      version: 1,
      overdue: false,
      comments: [],
      history: [
        {
          id: randomUUID(),
          taskId: id,
          changeType: "created",
          summary: `Task created: ${input.body.title}`,
          occurredAt: now,
          actorUserId: input.actorUserId,
        },
      ],
      ...(input.body.description === undefined
        ? {}
        : { description: input.body.description }),
    };
    this.tasks.set(id, task);
    return task;
  }

  public async updateTask(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: UpdateEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined> {
    const current = this.tasks.get(input.taskId);
    if (current === undefined) return undefined;
    const updated: EventTaskDetailResponse = {
      ...current,
      title: input.body.title ?? current.title,
      status: input.body.status ?? current.status,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
      ...(input.body.status === "completed"
        ? { completedAt: new Date().toISOString() }
        : {}),
    };
    this.tasks.set(input.taskId, updated);
    return updated;
  }

  public async completeTask(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: CompleteEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined> {
    return this.updateTask({
      ...input,
      body: { status: "completed", actualMinutes: input.body.actualMinutes },
    });
  }

  public async addTaskComment(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: AddEventTaskCommentRequest;
    },
  ): Promise<EventTaskCommentSummary | undefined> {
    const current = this.tasks.get(input.taskId);
    if (current === undefined) return undefined;
    const comment: EventTaskCommentSummary = {
      id: randomUUID(),
      taskId: input.taskId,
      content: input.body.content,
      createdAt: new Date().toISOString(),
      createdByUserId: input.actorUserId,
    };
    this.tasks.set(input.taskId, {
      ...current,
      comments: [comment, ...current.comments],
    });
    return comment;
  }

  public async listProgress(
    eventRecordId: string,
  ): Promise<EventProgressListResponse> {
    return {
      updates: [...this.progress.values()].filter(
        (item) => item.eventRecordId === eventRecordId,
      ),
      dailyReports: [],
    };
  }

  public async createProgress(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: CreateEventProgressRequest;
    },
  ): Promise<EventProgressUpdateSummary | undefined> {
    if (input.eventRecordId !== this.event.id) return undefined;
    const now = new Date().toISOString();
    const progress: EventProgressUpdateSummary = {
      id: randomUUID(),
      eventRecordId: input.eventRecordId,
      updateKind: input.body.updateKind,
      summary: input.body.summary,
      photoPlaceholders: input.body.photoPlaceholders ?? [],
      attachmentPlaceholders: input.body.attachmentPlaceholders ?? [],
      reportDate: input.body.reportDate ?? now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.progress.set(progress.id, progress);
    return progress;
  }

  public async updateProgress(
    input: ManagerMutationContext & {
      readonly progressId: string;
      readonly body: UpdateEventProgressRequest;
    },
  ): Promise<EventProgressUpdateSummary | undefined> {
    const current = this.progress.get(input.progressId);
    if (current === undefined) return undefined;
    const updated: EventProgressUpdateSummary = {
      ...current,
      summary: input.body.summary ?? current.summary,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };
    this.progress.set(input.progressId, updated);
    return updated;
  }

  public async listAssignedEventsForManager(
    managerUserId: string,
  ): Promise<readonly EventRecordSummary[]> {
    return this.event.assignedManagerUserId === managerUserId
      ? [this.event]
      : [];
  }

  public async isAssignedManager(
    eventRecordId: string,
    managerUserId: string,
  ): Promise<boolean> {
    return (
      this.event.id === eventRecordId &&
      this.event.assignedManagerUserId === managerUserId
    );
  }
}

const principal: AuthenticatedPrincipal = {
  userId: "crm-user-1",
  sessionId: "session-1",
  activeRole: "employee",
  roleAssignments: [{ role: "employee", active: true }],
};

describe("Manager Operations Foundation", () => {
  let repo: FakeManagerOpsRepository;
  let service: ManagerOperationsService;

  beforeEach(() => {
    repo = new FakeManagerOpsRepository();
    service = new ManagerOperationsService(repo);
  });

  it("assigns a manager to an event record", async () => {
    const assignment = await service.assignManager(principal, repo.event.id, {
      managerUserId: "manager-1",
      priority: "high",
    });
    expect(assignment.managerUserId).toBe("manager-1");
    expect(repo.event.status).toBe("manager_assigned");
    expect(repo.event.assignedManagerUserId).toBe("manager-1");
  });

  it("creates, updates, and completes a task", async () => {
    await service.assignManager(principal, repo.event.id, {
      managerUserId: "manager-1",
      priority: "normal",
    });
    const created = await service.createTask(principal, repo.event.id, {
      title: "Confirm florist",
      priority: "normal",
      status: "pending",
    });
    const updated = await service.updateTask(principal, created.id, {
      status: "in_progress",
    });
    const completed = await service.completeTask(principal, created.id, {});

    expect(updated.status).toBe("in_progress");
    expect(completed.status).toBe("completed");
  });

  it("records daily progress and reflects dashboard counts", async () => {
    await service.assignManager(principal, repo.event.id, {
      managerUserId: "manager-1",
      priority: "normal",
    });
    await service.createTask(principal, repo.event.id, {
      title: "Site survey",
      priority: "urgent",
      status: "pending",
    });
    await service.createProgress(principal, repo.event.id, {
      updateKind: "morning",
      summary: "Decor load-in started",
    });

    const dashboard = await service.getCrmDashboard(principal);
    expect(dashboard.assignedEvents).toBe(1);
    expect(dashboard.activeTasks).toBe(1);
    expect(dashboard.progressUpdatesToday).toBe(1);

    const eventDash = await service.getEventDashboard(repo.event.id);
    expect(eventDash.assignment?.managerUserId).toBe("manager-1");
    expect(eventDash.progressUpdates[0]?.summary).toBe("Decor load-in started");
  });
});
