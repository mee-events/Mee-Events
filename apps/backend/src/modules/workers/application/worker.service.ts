import { Inject, Injectable } from "@nestjs/common";
import type {
  AddWorkerNoteRequest,
  AssignWorkerRequest,
  CreateWorkerRequest,
  RejectWorkerTaskRequest,
  UpdateWorkerRequest,
  WorkerAttendanceListResponse,
  WorkerCheckInRequest,
  WorkerCheckOutRequest,
  WorkerDashboardResponse,
  WorkerDetailResponse,
  WorkerListResponse,
  WorkerNoteSummary,
  WorkerProgressUpdateRequest,
  WorkerTaskDetailResponse,
  WorkerTaskListResponse,
  WorkerTaskSummary,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import {
  buildPaginationMeta,
  paginatedCollection,
  parsePagination,
} from "../../../common/pagination/pagination";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  WORKER_REPOSITORY,
  type WorkerRepository,
} from "../ports/worker-repository";

@Injectable()
export class WorkerService {
  public constructor(
    @Inject(WORKER_REPOSITORY)
    private readonly workers: WorkerRepository,
  ) {}

  public async list(
    principal: AuthenticatedPrincipal,
    query?: {
      readonly vendorId?: string;
      readonly page?: unknown;
      readonly limit?: unknown;
      readonly search?: unknown;
      readonly sort?: unknown;
      readonly order?: unknown;
    },
  ): Promise<WorkerListResponse> {
    const branchId = resolveBranchId(principal);
    const pagination = parsePagination(query);
    const limit = pagination.requested ? pagination.limit : 200;
    const offset = pagination.requested ? pagination.offset : 0;
    const { items, total } = await this.workers.listWorkers({
      branchId,
      limit,
      offset,
      ...(query?.vendorId === undefined ? {} : { vendorId: query.vendorId }),
      ...(pagination.search === undefined ? {} : { search: pagination.search }),
    });
    return paginatedCollection(
      "workers",
      items,
      pagination.requested
        ? buildPaginationMeta({
            page: pagination.page,
            limit: pagination.limit,
            total,
          })
        : undefined,
    ) as WorkerListResponse;
  }

  public async get(
    principal: AuthenticatedPrincipal,
    workerId: string,
  ): Promise<WorkerDetailResponse> {
    const worker = await this.workers.getWorker(
      workerId,
      resolveBranchId(principal),
    );
    if (worker === undefined) {
      throw new DomainError("WORKER_NOT_FOUND", "Worker not found", 404);
    }
    return worker;
  }

  public create(
    principal: AuthenticatedPrincipal,
    body: CreateWorkerRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerDetailResponse> {
    const employmentType = body.employmentType ?? "vendor";
    if (employmentType === "vendor" && body.vendorId === undefined) {
      throw new DomainError(
        "WORKER_VENDOR_REQUIRED",
        "vendorId is required for vendor-employed workers",
        400,
      );
    }
    return this.workers.createWorker({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
  }

  public async update(
    principal: AuthenticatedPrincipal,
    workerId: string,
    body: UpdateWorkerRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerDetailResponse> {
    const worker = await this.workers.updateWorker({
      workerId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (worker === undefined) {
      throw new DomainError("WORKER_NOT_FOUND", "Worker not found", 404);
    }
    return worker;
  }

  public async assign(
    principal: AuthenticatedPrincipal,
    body: AssignWorkerRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerTaskSummary> {
    const task = await this.workers.assignWorker({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError(
        "WORKER_ASSIGN_FAILED",
        "Event or worker not found / inactive",
        404,
      );
    }
    return task;
  }

  public async accept(
    principal: AuthenticatedPrincipal,
    taskId: string,
    requestId: string = randomUUID(),
  ): Promise<WorkerTaskSummary> {
    await this.assertOwnsTask(principal, taskId);
    const task = await this.workers.acceptTask({
      taskId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async reject(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: RejectWorkerTaskRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerTaskSummary> {
    await this.assertOwnsTask(principal, taskId);
    const task = await this.workers.rejectTask({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async checkIn(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: WorkerCheckInRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerTaskSummary> {
    await this.assertOwnsTask(principal, taskId);
    const task = await this.workers.checkIn({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async checkOut(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: WorkerCheckOutRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerTaskSummary> {
    await this.assertOwnsTask(principal, taskId);
    const task = await this.workers.checkOut({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async progress(
    principal: AuthenticatedPrincipal,
    taskId: string,
    body: WorkerProgressUpdateRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerTaskSummary> {
    await this.assertOwnsTask(principal, taskId);
    const task = await this.workers.updateProgress({
      taskId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async listTasks(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly workerId?: string;
      readonly eventRecordId?: string;
      readonly vendorId?: string;
    },
  ): Promise<WorkerTaskListResponse> {
    return {
      tasks: await this.workers.listTasks({
        ...filters,
        branchId: resolveBranchId(principal),
      }),
    };
  }

  public async getTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
  ): Promise<WorkerTaskDetailResponse> {
    const task = await this.workers.getTask(taskId, resolveBranchId(principal));
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  public async getOwnTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
  ): Promise<WorkerTaskDetailResponse> {
    await this.assertOwnsTask(principal, taskId);
    return this.loadTaskById(taskId);
  }

  public async listOwnTasks(
    principal: AuthenticatedPrincipal,
  ): Promise<WorkerTaskListResponse> {
    const workerId = await this.workers.findWorkerIdForUser(principal.userId);
    if (workerId === undefined) {
      return { tasks: [] };
    }
    return {
      tasks: await this.workers.listTasks({ workerId }),
    };
  }

  public async addNote(
    principal: AuthenticatedPrincipal,
    workerId: string,
    body: AddWorkerNoteRequest,
    requestId: string = randomUUID(),
  ): Promise<WorkerNoteSummary> {
    const note = await this.workers.addNote({
      workerId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (note === undefined) {
      throw new DomainError("WORKER_NOT_FOUND", "Worker not found", 404);
    }
    return note;
  }

  public async listAttendance(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly workerId?: string;
    },
  ): Promise<WorkerAttendanceListResponse> {
    return {
      attendance: await this.workers.listAttendance({
        ...filters,
        branchId: resolveBranchId(principal),
      }),
    };
  }

  public getCrmDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<WorkerDashboardResponse> {
    return this.workers.getCrmDashboard(resolveBranchId(principal));
  }

  public getOwnDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<WorkerDashboardResponse> {
    return this.workers.getWorkerDashboard(principal.userId);
  }

  private async loadTaskById(
    taskId: string,
  ): Promise<WorkerTaskDetailResponse> {
    const task = await this.workers.getTask(taskId);
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    return task;
  }

  private async assertOwnsTask(
    principal: AuthenticatedPrincipal,
    taskId: string,
  ): Promise<void> {
    const task = await this.workers.getTask(taskId);
    if (task === undefined) {
      throw new DomainError("WORKER_TASK_NOT_FOUND", "Task not found", 404);
    }
    const allowed = await this.workers.isWorkerUser(
      task.workerId,
      principal.userId,
    );
    if (!allowed) {
      throw new DomainError(
        "WORKER_TASK_FORBIDDEN",
        "You are not this worker",
        403,
      );
    }
  }
}
