import type {
  AddEventTaskCommentRequest,
  AssignEventManagerRequest,
  CompleteEventTaskRequest,
  CreateEventProgressRequest,
  CreateEventTaskRequest,
  EventDailyReportSummary,
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

export const MANAGER_OPERATIONS_REPOSITORY = Symbol(
  "MANAGER_OPERATIONS_REPOSITORY",
);

export interface ManagerMutationContext {
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly branchId: string;
}

export interface ManagerOperationsRepository {
  listManagerCandidates(): Promise<readonly ManagerCandidateSummary[]>;

  assignManager(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: AssignEventManagerRequest;
    },
  ): Promise<ManagerAssignmentSummary | undefined>;

  updateAssignment(
    input: ManagerMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateManagerAssignmentRequest;
    },
  ): Promise<ManagerAssignmentSummary | undefined>;

  getActiveAssignment(
    eventRecordId: string,
    branchId: string,
  ): Promise<ManagerAssignmentSummary | undefined>;

  getManagerDashboard(
    branchId: string,
    managerUserId: string | undefined,
  ): Promise<ManagerDashboardResponse>;

  getEventDashboard(
    eventRecordId: string,
    branchId: string,
  ): Promise<EventManagerDashboardResponse | undefined>;

  listTasks(
    eventRecordId: string,
    branchId: string,
  ): Promise<readonly EventTaskSummary[]>;

  listTasksForManager(
    managerUserId: string,
    options?: { readonly todayOnly?: boolean },
  ): Promise<readonly EventTaskSummary[]>;

  getTask(
    taskId: string,
    branchId: string,
  ): Promise<EventTaskDetailResponse | undefined>;

  createTask(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: CreateEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined>;

  updateTask(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: UpdateEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined>;

  completeTask(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: CompleteEventTaskRequest;
    },
  ): Promise<EventTaskSummary | undefined>;

  addTaskComment(
    input: ManagerMutationContext & {
      readonly taskId: string;
      readonly body: AddEventTaskCommentRequest;
    },
  ): Promise<EventTaskCommentSummary | undefined>;

  listProgress(eventRecordId: string): Promise<EventProgressListResponse>;

  createProgress(
    input: ManagerMutationContext & {
      readonly eventRecordId: string;
      readonly body: CreateEventProgressRequest;
    },
  ): Promise<EventProgressUpdateSummary | undefined>;

  updateProgress(
    input: ManagerMutationContext & {
      readonly progressId: string;
      readonly body: UpdateEventProgressRequest;
    },
  ): Promise<EventProgressUpdateSummary | undefined>;

  listAssignedEventsForManager(
    managerUserId: string,
  ): Promise<readonly EventRecordSummary[]>;

  isAssignedManager(
    eventRecordId: string,
    managerUserId: string,
  ): Promise<boolean>;
}

export type {
  EventDailyReportSummary,
  EventManagerDashboardResponse,
  EventProgressListResponse,
  ManagerDashboardResponse,
};
