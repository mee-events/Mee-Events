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
  completeEventTaskSchema,
  createEventProgressSchema,
  updateEventTaskSchema,
  type CompleteEventTaskRequest,
  type CreateEventProgressRequest,
  type EventManagerDashboardResponse,
  type EventProgressUpdateSummary,
  type EventRecordListResponse,
  type EventTaskDetailResponse,
  type EventTaskListResponse,
  type EventTaskSummary,
  type ManagerDashboardResponse,
  type UpdateEventTaskRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { ManagerOperationsService } from "../application/manager-operations.service";

@ApiTags("Manager Operations")
@ApiBearerAuth()
@Controller("manager")
@UseGuards(CapabilityGuard)
export class ManagerOperationsController {
  public constructor(private readonly ops: ManagerOperationsService) {}

  @Get("dashboard")
  @RequireCapability("manager_dashboard.read")
  @ApiOperation({ summary: "Assigned-manager dashboard for mobile" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<ManagerDashboardResponse> {
    return this.ops.getOwnDashboard(principalOf(request));
  }

  @Get("events")
  @RequireCapability("manager_event.read")
  @ApiOperation({ summary: "List events assigned to the signed-in manager" })
  public events(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventRecordListResponse> {
    return this.ops.listOwnEvents(principalOf(request));
  }

  @Get("events/:eventId/dashboard")
  @RequireCapability("manager_event.read")
  @ApiOperation({ summary: "Event dashboard for the assigned manager" })
  public eventDashboard(
    @Param("eventId", new ParseUUIDPipe()) eventId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventManagerDashboardResponse> {
    return this.ops.getOwnEventDashboard(principalOf(request), eventId);
  }

  @Get("tasks/today")
  @RequireCapability("manager_task.read")
  @ApiOperation({ summary: "Today's tasks for the assigned manager" })
  public todayTasks(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTaskListResponse> {
    return this.ops.listTodayTasks(principalOf(request));
  }

  @Get("tasks/:taskId")
  @RequireCapability("manager_task.read")
  @ApiOperation({ summary: "Task detail for the manager" })
  public getTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTaskDetailResponse> {
    return this.ops.getTask(principalOf(request), taskId);
  }

  @Patch("tasks/:taskId")
  @RequireCapability("manager_task.manage")
  @ApiOperation({ summary: "Update a task as the event manager" })
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
  @ApiOperation({ summary: "Complete a task as the event manager" })
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

  @Post("events/:eventId/progress")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("manager_progress.manage")
  @ApiOperation({ summary: "Post a daily progress update" })
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
