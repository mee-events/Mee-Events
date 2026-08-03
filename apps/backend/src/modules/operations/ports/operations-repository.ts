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

export const OPERATIONS_REPOSITORY = Symbol("OPERATIONS_REPOSITORY");

export interface OperationsMutationContext {
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
}

export interface OperationsRepository {
  getDashboard(branchId: string): Promise<OperationsDashboardResponse>;
  listEvents(branchId: string): Promise<readonly EventProgressSummary[]>;
  getEventOperations(
    eventRecordId: string,
  ): Promise<EventOperationsDetailResponse | undefined>;
  ensureEventOperations(
    input: OperationsMutationContext & { readonly eventRecordId: string },
  ): Promise<EventProgressSummary>;

  createTask(
    input: OperationsMutationContext & {
      readonly body: CreateOperationsTaskRequest;
    },
  ): Promise<OperationsTaskSummary | undefined>;
  updateTask(
    input: OperationsMutationContext & {
      readonly taskId: string;
      readonly body: UpdateOperationsTaskRequest;
    },
  ): Promise<OperationsTaskSummary | undefined>;
  listTasks(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly OperationsTaskSummary[]>;
  getTask(taskId: string): Promise<OperationsTaskDetailResponse | undefined>;
  assignTask(
    input: OperationsMutationContext & {
      readonly taskId: string;
      readonly body: AssignOperationsTaskRequest;
    },
  ): Promise<OperationsTaskAssignmentSummary | undefined>;
  updateAssignment(
    input: OperationsMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateTaskAssignmentRequest;
    },
  ): Promise<OperationsTaskAssignmentSummary | undefined>;

  checkIn(
    input: OperationsMutationContext & {
      readonly body: CheckInAttendanceRequest;
    },
  ): Promise<AttendanceLogSummary | undefined>;
  checkOut(
    input: OperationsMutationContext & {
      readonly body: CheckOutAttendanceRequest;
    },
  ): Promise<AttendanceLogSummary | undefined>;
  finalizeAttendance(
    input: OperationsMutationContext & {
      readonly body: FinalizeAttendanceRequest;
    },
  ): Promise<EventCompletionSummary | undefined>;
  listAttendance(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly AttendanceLogSummary[]>;

  createIssue(
    input: OperationsMutationContext & {
      readonly body: CreateEventIssueRequest;
    },
  ): Promise<EventIssueSummary | undefined>;
  updateIssue(
    input: OperationsMutationContext & {
      readonly issueId: string;
      readonly body: UpdateEventIssueRequest;
    },
  ): Promise<EventIssueSummary | undefined>;
  listIssues(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly EventIssueSummary[]>;

  uploadPhoto(
    input: OperationsMutationContext & {
      readonly body: UploadEventPhotoRequest;
    },
  ): Promise<EventPhotoSummary | undefined>;
  listPhotos(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly EventPhotoSummary[]>;

  recordMaterial(
    input: OperationsMutationContext & {
      readonly body: RecordMaterialUsageRequest;
    },
  ): Promise<MaterialUsageSummary | undefined>;
  updateMaterial(
    input: OperationsMutationContext & {
      readonly materialId: string;
      readonly body: UpdateMaterialUsageRequest;
    },
  ): Promise<MaterialUsageSummary | undefined>;
  listMaterials(
    branchId: string,
    filters?: {
      readonly eventRecordId?: string;
    },
  ): Promise<readonly MaterialUsageSummary[]>;

  listProgress(branchId: string): Promise<readonly EventProgressSummary[]>;
  recalculateProgress(
    input: OperationsMutationContext & { readonly eventRecordId: string },
  ): Promise<EventProgressSummary | undefined>;
  updateChecklist(
    input: OperationsMutationContext & {
      readonly eventRecordId: string;
      readonly body: UpdateCompletionChecklistRequest;
    },
  ): Promise<EventCompletionSummary | undefined>;
  completeEvent(
    input: OperationsMutationContext & {
      readonly eventRecordId: string;
      readonly body: CompleteEventOperationsRequest;
    },
  ): Promise<EventCompletionSummary | undefined>;
  getCompletion(
    eventRecordId: string,
  ): Promise<EventCompletionSummary | undefined>;
}

export type {
  AttendanceLogListResponse,
  EventIssueListResponse,
  EventOperationsListResponse,
  EventPhotoListResponse,
  MaterialUsageListResponse,
  OperationsProgressListResponse,
  OperationsDashboardResponse,
  OperationsTaskListResponse,
};
