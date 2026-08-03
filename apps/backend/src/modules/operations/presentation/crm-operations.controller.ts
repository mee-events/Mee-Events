import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  assignOperationsTaskSchema,
  checkInAttendanceSchema,
  checkOutAttendanceSchema,
  completeEventOperationsSchema,
  createEventIssueSchema,
  createOperationsTaskSchema,
  finalizeAttendanceSchema,
  recordMaterialUsageSchema,
  updateCompletionChecklistSchema,
  updateEventIssueSchema,
  updateMaterialUsageSchema,
  updateOperationsTaskSchema,
  updateTaskAssignmentSchema,
  uploadEventPhotoSchema,
  type AssignOperationsTaskRequest,
  type AttendanceLogListResponse,
  type AttendanceLogSummary,
  type CheckInAttendanceRequest,
  type CheckOutAttendanceRequest,
  type CompleteEventOperationsRequest,
  type CreateEventIssueRequest,
  type CreateOperationsTaskRequest,
  type EventCompletionSummary,
  type EventIssueListResponse,
  type EventIssueSummary,
  type EventOperationsDetailResponse,
  type EventOperationsListResponse,
  type EventPhotoListResponse,
  type EventPhotoSummary,
  type EventProgressSummary,
  type OperationsProgressListResponse,
  type FinalizeAttendanceRequest,
  type MaterialUsageListResponse,
  type MaterialUsageSummary,
  type OperationsDashboardResponse,
  type OperationsTaskAssignmentSummary,
  type OperationsTaskDetailResponse,
  type OperationsTaskListResponse,
  type OperationsTaskSummary,
  type RecordMaterialUsageRequest,
  type UpdateCompletionChecklistRequest,
  type UpdateEventIssueRequest,
  type UpdateMaterialUsageRequest,
  type UpdateOperationsTaskRequest,
  type UpdateTaskAssignmentRequest,
  type UploadEventPhotoRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { OperationsService } from "../application/operations.service";

@ApiTags("CRM Operations")
@ApiBearerAuth()
@Controller("crm/operations")
@UseGuards(CapabilityGuard)
export class CrmOperationsController {
  public constructor(private readonly operations: OperationsService) {}

  @Get("dashboard")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "Operations dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsDashboardResponse> {
    return this.operations.getDashboard(principalOf(request));
  }

  @Get("events")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "List event operations progress" })
  public listEvents(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventOperationsListResponse> {
    return this.operations.listEvents(principalOf(request));
  }

  @Get("events/:eventRecordId")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "Event operations detail" })
  public getEvent(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
  ): Promise<EventOperationsDetailResponse> {
    return this.operations.getEventOperations(eventRecordId);
  }

  @Post("events/:eventRecordId/ensure")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("crm_operations.manage")
  @ApiOperation({ summary: "Ensure event progress and completion rows exist" })
  public ensure(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventProgressSummary> {
    return this.operations.ensureEventOperations(
      principalOf(request),
      eventRecordId,
      requestIdOf(request),
    );
  }

  @Get("tasks")
  @RequireCapability("operations.task.read")
  @ApiOperation({ summary: "List operations tasks" })
  public listTasks(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<OperationsTaskListResponse> {
    return this.operations.listTasks(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("tasks")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations.task.manage")
  @ApiOperation({ summary: "Create operations task" })
  public createTask(
    @Body(new ZodValidationPipe(createOperationsTaskSchema))
    body: CreateOperationsTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsTaskSummary> {
    return this.operations.createTask(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("tasks/:taskId")
  @RequireCapability("operations.task.read")
  @ApiOperation({ summary: "Get operations task detail" })
  public getTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
  ): Promise<OperationsTaskDetailResponse> {
    return this.operations.getTask(taskId);
  }

  @Patch("tasks/:taskId")
  @RequireCapability("operations.task.manage")
  @ApiOperation({ summary: "Update operations task" })
  public updateTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(updateOperationsTaskSchema))
    body: UpdateOperationsTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsTaskSummary> {
    return this.operations.updateTask(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Post("tasks/:taskId/assign")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations.task.manage")
  @ApiOperation({ summary: "Assign task to manager/supervisor/vendor/worker" })
  public assignTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(assignOperationsTaskSchema))
    body: AssignOperationsTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsTaskAssignmentSummary> {
    return this.operations.assignTask(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Patch("assignments/:assignmentId")
  @RequireCapability("operations.task.manage")
  @ApiOperation({ summary: "Update task assignment" })
  public updateAssignment(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
    @Body(new ZodValidationPipe(updateTaskAssignmentSchema))
    body: UpdateTaskAssignmentRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsTaskAssignmentSummary> {
    return this.operations.updateAssignment(
      principalOf(request),
      assignmentId,
      body,
      requestIdOf(request),
    );
  }

  @Get("attendance")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "List attendance logs" })
  public listAttendance(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<AttendanceLogListResponse> {
    return this.operations.listAttendance(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("attendance/check-in")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations.attendance.manage")
  @ApiOperation({ summary: "Check in worker attendance" })
  public checkIn(
    @Body(new ZodValidationPipe(checkInAttendanceSchema))
    body: CheckInAttendanceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<AttendanceLogSummary> {
    return this.operations.checkIn(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Post("attendance/check-out")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("operations.attendance.manage")
  @ApiOperation({ summary: "Check out worker attendance" })
  public checkOut(
    @Body(new ZodValidationPipe(checkOutAttendanceSchema))
    body: CheckOutAttendanceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<AttendanceLogSummary> {
    return this.operations.checkOut(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Post("attendance/finalize")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("operations.attendance.manage")
  @ApiOperation({ summary: "Finalize attendance for an event" })
  public finalizeAttendance(
    @Body(new ZodValidationPipe(finalizeAttendanceSchema))
    body: FinalizeAttendanceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventCompletionSummary> {
    return this.operations.finalizeAttendance(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("issues")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "List event issues" })
  public listIssues(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<EventIssueListResponse> {
    return this.operations.listIssues(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("issues")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations.issue.manage")
  @ApiOperation({ summary: "Create event issue" })
  public createIssue(
    @Body(new ZodValidationPipe(createEventIssueSchema))
    body: CreateEventIssueRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventIssueSummary> {
    return this.operations.createIssue(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Patch("issues/:issueId")
  @RequireCapability("operations.issue.manage")
  @ApiOperation({ summary: "Update event issue" })
  public updateIssue(
    @Param("issueId", new ParseUUIDPipe()) issueId: string,
    @Body(new ZodValidationPipe(updateEventIssueSchema))
    body: UpdateEventIssueRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventIssueSummary> {
    return this.operations.updateIssue(
      principalOf(request),
      issueId,
      body,
      requestIdOf(request),
    );
  }

  @Get("photos")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "List event photos" })
  public listPhotos(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<EventPhotoListResponse> {
    return this.operations.listPhotos(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("photos")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations.photo.upload")
  @ApiOperation({ summary: "Upload event photo metadata" })
  public uploadPhoto(
    @Body(new ZodValidationPipe(uploadEventPhotoSchema))
    body: UploadEventPhotoRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventPhotoSummary> {
    return this.operations.uploadPhoto(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("materials")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "List material usage" })
  public listMaterials(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<MaterialUsageListResponse> {
    return this.operations.listMaterials(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("materials")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_operations.manage")
  @ApiOperation({ summary: "Record material usage" })
  public recordMaterial(
    @Body(new ZodValidationPipe(recordMaterialUsageSchema))
    body: RecordMaterialUsageRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<MaterialUsageSummary> {
    return this.operations.recordMaterial(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Patch("materials/:materialId")
  @RequireCapability("crm_operations.manage")
  @ApiOperation({ summary: "Update material usage" })
  public updateMaterial(
    @Param("materialId", new ParseUUIDPipe()) materialId: string,
    @Body(new ZodValidationPipe(updateMaterialUsageSchema))
    body: UpdateMaterialUsageRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<MaterialUsageSummary> {
    return this.operations.updateMaterial(
      principalOf(request),
      materialId,
      body,
      requestIdOf(request),
    );
  }

  @Get("progress")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "List event progress aggregates" })
  public listProgress(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsProgressListResponse> {
    return this.operations.listProgress(principalOf(request));
  }

  @Post("events/:eventRecordId/recalculate")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("crm_operations.manage")
  @ApiOperation({ summary: "Recalculate event progress" })
  public recalculate(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventProgressSummary> {
    return this.operations.recalculateProgress(
      principalOf(request),
      eventRecordId,
      requestIdOf(request),
    );
  }

  @Get("events/:eventRecordId/completion")
  @RequireCapability("crm_operations.read")
  @ApiOperation({ summary: "Get event completion gates" })
  public getCompletion(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
  ): Promise<EventCompletionSummary> {
    return this.operations.getCompletion(eventRecordId);
  }

  @Patch("events/:eventRecordId/completion")
  @RequireCapability("crm_operations.manage")
  @ApiOperation({ summary: "Update completion checklist" })
  public updateChecklist(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Body(new ZodValidationPipe(updateCompletionChecklistSchema))
    body: UpdateCompletionChecklistRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventCompletionSummary> {
    return this.operations.updateChecklist(
      principalOf(request),
      eventRecordId,
      body,
      requestIdOf(request),
    );
  }

  @Post("events/:eventRecordId/complete")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("operations.complete")
  @ApiOperation({ summary: "Complete event operations when gates pass" })
  public completeEvent(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
    @Body(new ZodValidationPipe(completeEventOperationsSchema))
    body: CompleteEventOperationsRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventCompletionSummary> {
    return this.operations.completeEvent(
      principalOf(request),
      eventRecordId,
      body,
      requestIdOf(request),
    );
  }
}

@ApiTags("Operations Ops")
@ApiBearerAuth()
@Controller("operations")
@UseGuards(CapabilityGuard)
export class OperationsOpsController {
  public constructor(private readonly operations: OperationsService) {}

  @Get("me/dashboard")
  @RequireCapability("operations_assigned.read")
  @ApiOperation({ summary: "Role operations dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsDashboardResponse> {
    return this.operations.getDashboard(principalOf(request));
  }

  @Get("me/events")
  @RequireCapability("operations_assigned.read")
  @ApiOperation({ summary: "List event progress for ops roles" })
  public listEvents(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventOperationsListResponse> {
    return this.operations.listEvents(principalOf(request));
  }

  @Get("me/events/:eventRecordId")
  @RequireCapability("operations_assigned.read")
  @ApiOperation({ summary: "Event operations detail for ops roles" })
  public getEvent(
    @Param("eventRecordId", new ParseUUIDPipe()) eventRecordId: string,
  ): Promise<EventOperationsDetailResponse> {
    return this.operations.getEventOperations(eventRecordId);
  }

  @Get("me/tasks")
  @RequireCapability("operations_assigned.read")
  @ApiOperation({ summary: "List tasks for ops roles" })
  public listTasks(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<OperationsTaskListResponse> {
    return this.operations.listTasks(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("me/attendance/check-in")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations_assigned.update")
  @ApiOperation({ summary: "Mobile/ops attendance check-in" })
  public checkIn(
    @Body(new ZodValidationPipe(checkInAttendanceSchema))
    body: CheckInAttendanceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<AttendanceLogSummary> {
    return this.operations.checkIn(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Post("me/attendance/check-out")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("operations_assigned.update")
  @ApiOperation({ summary: "Mobile/ops attendance check-out" })
  public checkOut(
    @Body(new ZodValidationPipe(checkOutAttendanceSchema))
    body: CheckOutAttendanceRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<AttendanceLogSummary> {
    return this.operations.checkOut(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("me/attendance")
  @RequireCapability("operations_assigned.read")
  @ApiOperation({ summary: "List attendance for ops roles" })
  public listAttendance(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<AttendanceLogListResponse> {
    return this.operations.listAttendance(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("me/issues")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations.issue.manage")
  @ApiOperation({ summary: "Report event issue from ops roles" })
  public createIssue(
    @Body(new ZodValidationPipe(createEventIssueSchema))
    body: CreateEventIssueRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventIssueSummary> {
    return this.operations.createIssue(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("me/issues")
  @RequireCapability("operations_assigned.read")
  @ApiOperation({ summary: "List issues for ops roles" })
  public listIssues(
    @Req() request: AuthenticatedPlatformRequest,
    @Query("eventRecordId") eventRecordId?: string,
  ): Promise<EventIssueListResponse> {
    return this.operations.listIssues(principalOf(request), {
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
    });
  }

  @Post("me/photos")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("operations.photo.upload")
  @ApiOperation({ summary: "Upload event photo from ops roles" })
  public uploadPhoto(
    @Body(new ZodValidationPipe(uploadEventPhotoSchema))
    body: UploadEventPhotoRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventPhotoSummary> {
    return this.operations.uploadPhoto(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Patch("me/tasks/:taskId")
  @RequireCapability("operations.task.manage")
  @ApiOperation({ summary: "Update task progress from ops roles" })
  public updateTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(updateOperationsTaskSchema))
    body: UpdateOperationsTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsTaskSummary> {
    return this.operations.updateTask(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Get("me/progress")
  @RequireCapability("operations_assigned.read")
  @ApiOperation({ summary: "List progress for ops roles" })
  public listProgress(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<OperationsProgressListResponse> {
    return this.operations.listProgress(principalOf(request));
  }
}

function principalOf(
  request: AuthenticatedPlatformRequest,
): AuthenticatedPrincipal {
  const principal = request.user;
  if (principal === undefined) {
    throw new UnauthorizedException("Authenticated principal is required");
  }
  return principal;
}

function requestIdOf(
  request: AuthenticatedPlatformRequest,
): string | undefined {
  const id: unknown = request.id;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}
