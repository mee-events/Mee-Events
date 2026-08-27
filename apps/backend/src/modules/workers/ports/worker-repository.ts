import type {
  AddWorkerNoteRequest,
  AssignWorkerRequest,
  CreateWorkerRequest,
  RejectWorkerTaskRequest,
  UpdateWorkerRequest,
  WorkerAttendanceListResponse,
  WorkerAttendanceSummary,
  WorkerCheckInRequest,
  WorkerCheckOutRequest,
  WorkerDashboardResponse,
  WorkerDetailResponse,
  WorkerListResponse,
  WorkerNoteSummary,
  WorkerProgressUpdateRequest,
  WorkerSummary,
  WorkerTaskDetailResponse,
  WorkerTaskListResponse,
  WorkerTaskSummary,
} from "@me-event/api-contracts";

export const WORKER_REPOSITORY = Symbol("WORKER_REPOSITORY");

export interface WorkerMutationContext {
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly branchId: string;
}

export interface WorkerListOptions {
  readonly branchId: string;
  readonly vendorId?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly search?: string;
}

export interface WorkerRepository {
  listWorkers(options: WorkerListOptions): Promise<{
    readonly items: readonly WorkerSummary[];
    readonly total: number;
  }>;
  getWorker(
    workerId: string,
    branchId?: string,
  ): Promise<WorkerDetailResponse | undefined>;
  createWorker(
    input: WorkerMutationContext & { readonly body: CreateWorkerRequest },
  ): Promise<WorkerDetailResponse>;
  updateWorker(
    input: WorkerMutationContext & {
      readonly workerId: string;
      readonly body: UpdateWorkerRequest;
    },
  ): Promise<WorkerDetailResponse | undefined>;

  assignWorker(
    input: WorkerMutationContext & { readonly body: AssignWorkerRequest },
  ): Promise<WorkerTaskSummary | undefined>;
  acceptTask(
    input: WorkerMutationContext & { readonly taskId: string },
  ): Promise<WorkerTaskSummary | undefined>;
  rejectTask(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: RejectWorkerTaskRequest;
    },
  ): Promise<WorkerTaskSummary | undefined>;
  checkIn(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerCheckInRequest;
    },
  ): Promise<WorkerTaskSummary | undefined>;
  checkOut(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerCheckOutRequest;
    },
  ): Promise<WorkerTaskSummary | undefined>;
  updateProgress(
    input: WorkerMutationContext & {
      readonly taskId: string;
      readonly body: WorkerProgressUpdateRequest;
    },
  ): Promise<WorkerTaskSummary | undefined>;

  listTasks(filters?: {
    readonly workerId?: string;
    readonly eventRecordId?: string;
    readonly vendorId?: string;
    readonly branchId?: string;
  }): Promise<readonly WorkerTaskSummary[]>;
  getTask(
    taskId: string,
    branchId?: string,
  ): Promise<WorkerTaskDetailResponse | undefined>;

  addNote(
    input: WorkerMutationContext & {
      readonly workerId: string;
      readonly body: AddWorkerNoteRequest;
    },
  ): Promise<WorkerNoteSummary | undefined>;

  listAttendance(filters?: {
    readonly workerId?: string;
    readonly branchId?: string;
  }): Promise<readonly WorkerAttendanceSummary[]>;

  getCrmDashboard(branchId: string): Promise<WorkerDashboardResponse>;
  getWorkerDashboard(userId: string): Promise<WorkerDashboardResponse>;
  findWorkerIdForUser(userId: string): Promise<string | undefined>;
  isWorkerUser(workerId: string, userId: string): Promise<boolean>;
}

export type {
  WorkerAttendanceListResponse,
  WorkerDashboardResponse,
  WorkerDetailResponse,
  WorkerListResponse,
  WorkerTaskListResponse,
};
