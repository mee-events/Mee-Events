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
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  addEventTaskCommentSchema,
  assignEventManagerSchema,
  completeEventTaskSchema,
  createEventProgressSchema,
  createEventTaskSchema,
  updateEventProgressSchema,
  updateEventTaskSchema,
  updateManagerAssignmentSchema,
  type AddEventTaskCommentRequest,
  type AssignEventManagerRequest,
  type CompleteEventTaskRequest,
  type CreateEventProgressRequest,
  type CreateEventTaskRequest,
  type EventManagerDashboardResponse,
  type EventProgressListResponse,
  type EventProgressUpdateSummary,
  type EventTaskCommentSummary,
  type EventTaskDetailResponse,
  type EventTaskListResponse,
  type EventTaskSummary,
  type ManagerAssignmentListResponse,
  type ManagerAssignmentSummary,
  type ManagerCandidateListResponse,
  type ManagerDashboardResponse,
  type UpdateEventProgressRequest,
  type UpdateEventTaskRequest,
  type UpdateManagerAssignmentRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { ManagerOperationsService } from "../application/manager-operations.service";

@ApiTags("CRM Manager Operations")
@ApiBearerAuth()
@Controller("crm/manager")
@UseGuards(CapabilityGuard)
export class CrmManagerOperationsController {
  public constructor(private readonly ops: ManagerOperationsService) {}

  @Get("candidates")
  @RequireCapability("manager_event.manage")
  @ApiOperation({ summary: "List users eligible for event manager assignment" })
  public candidates(): Promise<ManagerCandidateListResponse> {
    return this.ops.listCandidates();
  }

  @Get("dashboard")
  @RequireCapability("manager_dashboard.read")
  @ApiOperation({ summary: "Branch-wide manager operations dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ManagerDashboardResponse> {
    return this.ops.getCrmDashboard(principalOf(request));
  }

  @Post("events/:eventId/assign")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("manager_event.manage")
  @ApiOperation({ summary: "Assign or reassign an event manager" })
  public assign(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(assignEventManagerSchema))
    body: AssignEventManagerRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ManagerAssignmentSummary> {
    return this.ops.assignManager(
      principalOf(request),
      eventId,
      body,
      requestIdOf(request),
    );
  }

  @Get("events/:eventId/assignment")
  @RequireCapability("manager_event.read")
  @ApiOperation({ summary: "Get active manager assignment for an event" })
  public assignment(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
  ): Promise<ManagerAssignmentListResponse> {
    return this.ops.getActiveAssignment(eventId);
  }

  @Patch("assignments/:assignmentId")
  @RequireCapability("manager_event.manage")
  @ApiOperation({ summary: "Update manager assignment notes or release" })
  public updateAssignment(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
    @Body(new ZodValidationPipe(updateManagerAssignmentSchema))
    body: UpdateManagerAssignmentRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ManagerAssignmentSummary> {
    return this.ops.updateAssignment(
      principalOf(request),
      assignmentId,
      body,
      requestIdOf(request),
    );
  }

  @Get("events/:eventId/dashboard")
  @RequireCapability("manager_dashboard.read")
  @ApiOperation({
    summary: "Event manager dashboard: tasks, progress, timeline",
  })
  public eventDashboard(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
  ): Promise<EventManagerDashboardResponse> {
    return this.ops.getEventDashboard(eventId);
  }

  @Get("events/:eventId/tasks")
  @RequireCapability("manager_task.read")
  @ApiOperation({ summary: "List tasks for an event" })
  public listTasks(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
  ): Promise<EventTaskListResponse> {
    return this.ops.listTasks(eventId);
  }

  @Post("events/:eventId/tasks")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("manager_task.manage")
  @ApiOperation({ summary: "Create an event task" })
  public createTask(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(createEventTaskSchema))
    body: CreateEventTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTaskSummary> {
    return this.ops.createTask(
      principalOf(request),
      eventId,
      body,
      requestIdOf(request),
    );
  }

  @Get("tasks/:taskId")
  @RequireCapability("manager_task.read")
  @ApiOperation({ summary: "Get task detail with comments and history" })
  public getTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
  ): Promise<EventTaskDetailResponse> {
    return this.ops.getTask(taskId);
  }

  @Patch("tasks/:taskId")
  @RequireCapability("manager_task.manage")
  @ApiOperation({ summary: "Update an event task" })
  public updateTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(updateEventTaskSchema))
    body: UpdateEventTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTaskSummary> {
    return this.ops.updateTask(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Post("tasks/:taskId/complete")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("manager_task.manage")
  @ApiOperation({ summary: "Mark a task completed" })
  public completeTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(completeEventTaskSchema))
    body: CompleteEventTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTaskSummary> {
    return this.ops.completeTask(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Post("tasks/:taskId/comments")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("manager_task.manage")
  @ApiOperation({ summary: "Add a task comment" })
  public addComment(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(addEventTaskCommentSchema))
    body: AddEventTaskCommentRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTaskCommentSummary> {
    return this.ops.addTaskComment(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Get("events/:eventId/progress")
  @RequireCapability("manager_event.read")
  @ApiOperation({ summary: "List daily progress updates for an event" })
  public listProgress(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
  ): Promise<EventProgressListResponse> {
    return this.ops.listProgress(eventId);
  }

  @Post("events/:eventId/progress")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("manager_progress.manage")
  @ApiOperation({ summary: "Create or upsert a daily progress update" })
  public createProgress(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
    @Body(new ZodValidationPipe(createEventProgressSchema))
    body: CreateEventProgressRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventProgressUpdateSummary> {
    return this.ops.createProgress(
      principalOf(request),
      eventId,
      body,
      requestIdOf(request),
    );
  }

  @Patch("progress/:progressId")
  @RequireCapability("manager_progress.manage")
  @ApiOperation({ summary: "Update a progress entry" })
  public updateProgress(
    @Param("progressId", new ParseUUIDPipe()) progressId: string,
    @Body(new ZodValidationPipe(updateEventProgressSchema))
    body: UpdateEventProgressRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventProgressUpdateSummary> {
    return this.ops.updateProgress(
      principalOf(request),
      progressId,
      body,
      requestIdOf(request),
    );
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
