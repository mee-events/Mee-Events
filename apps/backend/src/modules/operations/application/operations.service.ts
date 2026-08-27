import { Inject, Injectable } from "@nestjs/common";
import type {
  AssignOperationsTaskRequest,
  AttendanceLogListResponse,
  AttendanceLogSummary,
  CheckInAttendanceRequest,
  CheckOutAttendanceRequest,
  CompleteEventOperationsRequest,
  CreateEventIssueRequest,
  CreateOperationsTaskRequest,
  EventCompletionSummary,
  EventIssueListResponse,
  EventIssueSummary,
  EventOperationsDetailResponse,
  EventOperationsListResponse,
  EventPhotoListResponse,
  EventPhotoSummary,
  EventProgressSummary,
  OperationsProgressListResponse,
  FinalizeAttendanceRequest,
  MaterialUsageListResponse,
  MaterialUsageSummary,
  OperationsDashboardResponse,
  OperationsTaskAssignmentSummary,
  OperationsTaskDetailResponse,
  OperationsTaskListResponse,
  OperationsTaskSummary,
  RecordMaterialUsageRequest,
  UpdateCompletionChecklistRequest,
  UpdateEventIssueRequest,
  UpdateMaterialUsageRequest,
  UpdateOperationsTaskRequest,
  UpdateTaskAssignmentRequest,
  UploadEventPhotoRequest,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  OPERATIONS_REPOSITORY,
  type OperationsRepository,
} from "../ports/operations-repository";

@Injectable()
export class OperationsService {
  public constructor(
    @Inject(OPERATIONS_REPOSITORY)
    private readonly operations: OperationsRepository,
  ) {}

  public getDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<OperationsDashboardResponse> {
    return this.operations.getDashboard(resolveBranchId(principal));
  }

  public async listEvents(
    principal: AuthenticatedPrincipal,
  ): Promise<EventOperationsListResponse> {
    return {
      events: await this.operations.listEvents(resolveBranchId(principal)),
    };
  }

  public async getEventOperations(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventOperationsDetailResponse> {
    const detail = await this.operations.getEventOperations(
      eventRecordId,
      resolveBranchId(principal),
    );
    if (detail === undefined) {
      throw new DomainError(
        "EVENT_OPERATIONS_NOT_FOUND",
        "Event operations not found",
        404,
      );
    }
    return detail;
  }

  public ensureEventOperations(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    requestId: string = randomUUID(),
  ): Promise<EventProgressSummary> {
    return this.operations
      .ensureEventOperations({
        eventRecordId,
        actorUserId: principal.userId,
        actorRole: principal.activeRole,
        requestId,
        branchId: resolveBranchId(principal),
      })
      .then((progress) => {
        if (progress === undefined) {
          throw new DomainError(
            "EVENT_OPERATIONS_NOT_FOUND",
            "Event operations not found",
            404,
          );
        }
        return progress;
      });
  }

  public async createTask(
    principal: AuthenticatedPrincipal,
    body: CreateOperationsTaskRequest,
    requestId: string = randomUUID(),
  ): Promise<OperationsTaskSummary> {
    const task = await this.operations.createTask({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError(
        "OPS_TASK_CREATE_FAILED",
        "Event record not found",
        404,
      );
    }
    return task;
  }

  public async updateTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: UpdateOperationsTaskRequest,
    requestId: string = randomUUID(),
  ): Promise<OperationsTaskSummary> {
    const task = await this.operations.updateTask({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError("OPS_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async listTasks(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<OperationsTaskListResponse> {
    return {
      tasks: await this.operations.listTasks(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async getTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
  ): Promise<OperationsTaskDetailResponse> {
    const task = await this.operations.getTask(
      taskId,
      resolveBranchId(principal),
    );
    if (task === undefined) {
      throw new DomainError("OPS_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async assignTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: AssignOperationsTaskRequest,
    requestId: string = randomUUID(),
  ): Promise<OperationsTaskAssignmentSummary> {
    const assignment = await this.operations.assignTask({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (assignment === undefined) {
      throw new DomainError(
        "OPS_ASSIGN_FAILED",
        "Task not found or assignee invalid",
        404,
      );
    }
    return assignment;
  }

  public async updateAssignment(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
    body: UpdateTaskAssignmentRequest,
    requestId: string = randomUUID(),
  ): Promise<OperationsTaskAssignmentSummary> {
    const assignment = await this.operations.updateAssignment({
      assignmentId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (assignment === undefined) {
      throw new DomainError(
        "OPS_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  public async checkIn(
    principal: AuthenticatedPrincipal,
    body: CheckInAttendanceRequest,
    requestId: string = randomUUID(),
  ): Promise<AttendanceLogSummary> {
    const log = await this.operations.checkIn({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (log === undefined) {
      throw new DomainError(
        "OPS_CHECK_IN_FAILED",
        "Event or worker not found, or already checked in",
        409,
      );
    }
    return log;
  }

  public async checkOut(
    principal: AuthenticatedPrincipal,
    body: CheckOutAttendanceRequest,
    requestId: string = randomUUID(),
  ): Promise<AttendanceLogSummary> {
    const log = await this.operations.checkOut({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (log === undefined) {
      throw new DomainError(
        "OPS_CHECK_OUT_FAILED",
        "Attendance log not found or not checked in",
        409,
      );
    }
    return log;
  }

  public async finalizeAttendance(
    principal: AuthenticatedPrincipal,
    body: FinalizeAttendanceRequest,
    requestId: string = randomUUID(),
  ): Promise<EventCompletionSummary> {
    const completion = await this.operations.finalizeAttendance({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (completion === undefined) {
      throw new DomainError(
        "OPS_ATTENDANCE_FINALIZE_FAILED",
        "Cannot finalize attendance while workers remain checked in",
        409,
      );
    }
    return completion;
  }

  public async listAttendance(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<AttendanceLogListResponse> {
    return {
      logs: await this.operations.listAttendance(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async createIssue(
    principal: AuthenticatedPrincipal,
    body: CreateEventIssueRequest,
    requestId: string = randomUUID(),
  ): Promise<EventIssueSummary> {
    const issue = await this.operations.createIssue({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (issue === undefined) {
      throw new DomainError(
        "OPS_ISSUE_CREATE_FAILED",
        "Event record not found",
        404,
      );
    }
    return issue;
  }

  public async updateIssue(
    principal: AuthenticatedPrincipal,
    issueId: string,
    body: UpdateEventIssueRequest,
    requestId: string = randomUUID(),
  ): Promise<EventIssueSummary> {
    const issue = await this.operations.updateIssue({
      issueId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (issue === undefined) {
      throw new DomainError("OPS_ISSUE_NOT_FOUND", "Issue not found", 404);
    }
    return issue;
  }

  public async listIssues(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<EventIssueListResponse> {
    return {
      issues: await this.operations.listIssues(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async uploadPhoto(
    principal: AuthenticatedPrincipal,
    body: UploadEventPhotoRequest,
    requestId: string = randomUUID(),
  ): Promise<EventPhotoSummary> {
    const photo = await this.operations.uploadPhoto({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (photo === undefined) {
      throw new DomainError(
        "OPS_PHOTO_UPLOAD_FAILED",
        "Event record not found",
        404,
      );
    }
    return photo;
  }

  public async listPhotos(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<EventPhotoListResponse> {
    return {
      photos: await this.operations.listPhotos(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async recordMaterial(
    principal: AuthenticatedPrincipal,
    body: RecordMaterialUsageRequest,
    requestId: string = randomUUID(),
  ): Promise<MaterialUsageSummary> {
    const material = await this.operations.recordMaterial({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (material === undefined) {
      throw new DomainError(
        "OPS_MATERIAL_RECORD_FAILED",
        "Event record not found",
        404,
      );
    }
    return material;
  }

  public async updateMaterial(
    principal: AuthenticatedPrincipal,
    materialId: string,
    body: UpdateMaterialUsageRequest,
    requestId: string = randomUUID(),
  ): Promise<MaterialUsageSummary> {
    const material = await this.operations.updateMaterial({
      materialId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (material === undefined) {
      throw new DomainError(
        "OPS_MATERIAL_NOT_FOUND",
        "Material usage not found",
        404,
      );
    }
    return material;
  }

  public async listMaterials(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<MaterialUsageListResponse> {
    return {
      materials: await this.operations.listMaterials(
        resolveBranchId(principal),
        filters,
      ),
    };
  }

  public async listProgress(
    principal: AuthenticatedPrincipal,
  ): Promise<OperationsProgressListResponse> {
    return {
      progress: await this.operations.listProgress(resolveBranchId(principal)),
    };
  }

  public async recalculateProgress(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    requestId: string = randomUUID(),
  ): Promise<EventProgressSummary> {
    const progress = await this.operations.recalculateProgress({
      eventRecordId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (progress === undefined) {
      throw new DomainError(
        "EVENT_OPERATIONS_NOT_FOUND",
        "Event operations not found",
        404,
      );
    }
    return progress;
  }

  public async updateChecklist(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: UpdateCompletionChecklistRequest,
    requestId: string = randomUUID(),
  ): Promise<EventCompletionSummary> {
    const completion = await this.operations.updateChecklist({
      eventRecordId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (completion === undefined) {
      throw new DomainError(
        "EVENT_OPERATIONS_NOT_FOUND",
        "Event operations not found",
        404,
      );
    }
    return completion;
  }

  public async completeEvent(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
    body: CompleteEventOperationsRequest,
    requestId: string = randomUUID(),
  ): Promise<EventCompletionSummary> {
    const completion = await this.operations.completeEvent({
      eventRecordId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (completion === undefined) {
      throw new DomainError(
        "OPS_COMPLETION_GATES_FAILED",
        "Event completion gates are not satisfied",
        409,
      );
    }
    return completion;
  }

  public async getCompletion(
    principal: AuthenticatedPrincipal,
    eventRecordId: string,
  ): Promise<EventCompletionSummary> {
    const completion = await this.operations.getCompletion(
      eventRecordId,
      resolveBranchId(principal),
    );
    if (completion === undefined) {
      throw new DomainError(
        "EVENT_COMPLETION_NOT_FOUND",
        "Event completion not found",
        404,
      );
    }
    return completion;
  }
}
