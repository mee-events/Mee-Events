import { Inject, Injectable } from "@nestjs/common";
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
  EventTaskListResponse,
  EventTaskSummary,
  ManagerAssignmentListResponse,
  ManagerAssignmentSummary,
  ManagerCandidateListResponse,
  ManagerDashboardResponse,
  UpdateEventProgressRequest,
  UpdateEventTaskRequest,
  UpdateManagerAssignmentRequest,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  MANAGER_OPERATIONS_REPOSITORY,
  type ManagerOperationsRepository,
} from "../ports/manager-operations-repository";

@Injectable()
export class ManagerOperationsService {
  public constructor(
    @Inject(MANAGER_OPERATIONS_REPOSITORY)
    private readonly repo: ManagerOperationsRepository,
  ) {}

  public listCandidates(): Promise<ManagerCandidateListResponse> {
    return this.repo.listManagerCandidates().then((candidates) => ({
      candidates,
    }));
  }

  public async assignManager(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: AssignEventManagerRequest,
    requestId: string = randomUUID(),
  ): Promise<ManagerAssignmentSummary> {
    const assignment = await this.repo.assignManager({
      eventRecordId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (assignment === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return assignment;
  }

  public async updateAssignment(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
    body: UpdateManagerAssignmentRequest,
    requestId: string = randomUUID(),
  ): Promise<ManagerAssignmentSummary> {
    const assignment = await this.repo.updateAssignment({
      assignmentId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (assignment === undefined) {
      throw new DomainError(
        "MANAGER_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  public getCrmDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<ManagerDashboardResponse> {
    return this.repo.getManagerDashboard(resolveBranchId(principal), undefined);
  }

  public getOwnDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<ManagerDashboardResponse> {
    return this.repo.getManagerDashboard(
      resolveBranchId(principal),
      principal.userId,
    );
  }

  public async getEventDashboard(
    eventRecordId: string,
  ): Promise<EventManagerDashboardResponse> {
    const dashboard = await this.repo.getEventDashboard(eventRecordId);
    if (dashboard === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return dashboard;
  }

  public async getOwnEventDashboard(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventManagerDashboardResponse> {
    const allowed = await this.repo.isAssignedManager(
      eventRecordId,
      principal.userId,
    );
    if (!allowed) {
      throw new DomainError(
        "MANAGER_EVENT_FORBIDDEN",
        "You are not the assigned manager for this event",
        403,
      );
    }
    return this.getEventDashboard(eventRecordId);
  }

  public async listOwnEvents(
    principal: AuthenticatedPrincipal,
  ): Promise<{ readonly events: readonly EventRecordSummary[] }> {
    const events = await this.repo.listAssignedEventsForManager(
      principal.userId,
    );
    return { events };
  }

  public async listTasks(
    eventRecordId: string,
  ): Promise<EventTaskListResponse> {
    const tasks = await this.repo.listTasks(eventRecordId);
    return { tasks };
  }

  public async listTodayTasks(
    principal: AuthenticatedPrincipal,
  ): Promise<EventTaskListResponse> {
    const tasks = await this.repo.listTasksForManager(principal.userId, {
      todayOnly: true,
    });
    return { tasks };
  }

  public async getTask(taskId: string): Promise<EventTaskDetailResponse> {
    const task = await this.repo.getTask(taskId);
    if (task === undefined) {
      throw new DomainError("EVENT_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async createTask(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: CreateEventTaskRequest,
    requestId: string = randomUUID(),
  ): Promise<EventTaskSummary> {
    const task = await this.repo.createTask({
      eventRecordId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (task === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return task;
  }

  public async updateTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: UpdateEventTaskRequest,
    requestId: string = randomUUID(),
  ): Promise<EventTaskSummary> {
    const task = await this.repo.updateTask({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (task === undefined) {
      throw new DomainError("EVENT_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async completeTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: CompleteEventTaskRequest,
    requestId: string = randomUUID(),
  ): Promise<EventTaskSummary> {
    const task = await this.repo.completeTask({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (task === undefined) {
      throw new DomainError("EVENT_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async addTaskComment(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: AddEventTaskCommentRequest,
    requestId: string = randomUUID(),
  ): Promise<EventTaskCommentSummary> {
    const comment = await this.repo.addTaskComment({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (comment === undefined) {
      throw new DomainError("EVENT_TASK_NOT_FOUND", "Task not found", 404);
    }
    return comment;
  }

  public listProgress(
    eventRecordId: string,
  ): Promise<EventProgressListResponse> {
    return this.repo.listProgress(eventRecordId);
  }

  public async createProgress(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: CreateEventProgressRequest,
    requestId: string = randomUUID(),
  ): Promise<EventProgressUpdateSummary> {
    const progress = await this.repo.createProgress({
      eventRecordId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (progress === undefined) {
      throw new DomainError("EVENT_RECORD_NOT_FOUND", "Event not found", 404);
    }
    return progress;
  }

  public async updateProgress(
    principal: AuthenticatedPrincipal,
    progressId: string,
    body: UpdateEventProgressRequest,
    requestId: string = randomUUID(),
  ): Promise<EventProgressUpdateSummary> {
    const progress = await this.repo.updateProgress({
      progressId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
    });
    if (progress === undefined) {
      throw new DomainError(
        "EVENT_PROGRESS_NOT_FOUND",
        "Progress update not found",
        404,
      );
    }
    return progress;
  }

  public getActiveAssignment(
    eventRecordId: string,
  ): Promise<ManagerAssignmentListResponse> {
    return this.repo.getActiveAssignment(eventRecordId).then((assignment) => ({
      assignments: assignment === undefined ? [] : [assignment],
    }));
  }
}
