import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  addWorkerNoteSchema,
  rejectWorkerTaskSchema,
  workerCheckInSchema,
  workerCheckOutSchema,
  workerProgressUpdateSchema,
  type AddWorkerNoteRequest,
  type RejectWorkerTaskRequest,
  type WorkerCheckInRequest,
  type WorkerCheckOutRequest,
  type WorkerDashboardResponse,
  type WorkerNoteSummary,
  type WorkerProgressUpdateRequest,
  type WorkerTaskDetailResponse,
  type WorkerTaskListResponse,
  type WorkerTaskSummary,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { WorkerService } from "../application/worker.service";

@ApiTags("Workers")
@ApiBearerAuth()
@Controller("workers")
@UseGuards(CapabilityGuard)
export class WorkerController {
  public constructor(private readonly workers: WorkerService) {}

  @Get("me/dashboard")
  @RequireCapability("worker_own.read")
  @ApiOperation({ summary: "Worker mobile dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerDashboardResponse> {
    return this.workers.getOwnDashboard(principalOf(request));
  }

  @Get("me/tasks")
  @RequireCapability("worker_own.read")
  @ApiOperation({ summary: "Tasks for the signed-in worker" })
  public tasks(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskListResponse> {
    return this.workers.listOwnTasks(principalOf(request));
  }

  @Get("me/tasks/:taskId")
  @RequireCapability("worker_own.read")
  @ApiOperation({ summary: "Task detail for the signed-in worker" })
  public task(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskDetailResponse> {
    return this.workers.getOwnTask(principalOf(request), taskId);
  }

  @Post("me/tasks/:taskId/accept")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("worker_own.update")
  @ApiOperation({ summary: "Accept a worker task" })
  public accept(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskSummary> {
    return this.workers.accept(
      principalOf(request),
      taskId,
      requestIdOf(request),
    );
  }

  @Post("me/tasks/:taskId/reject")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("worker_own.update")
  @ApiOperation({ summary: "Reject a worker task" })
  public reject(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(rejectWorkerTaskSchema))
    body: RejectWorkerTaskRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskSummary> {
    return this.workers.reject(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Post("me/tasks/:taskId/check-in")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("worker_own.update")
  @ApiOperation({ summary: "Check in for a worker task" })
  public checkIn(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(workerCheckInSchema))
    body: WorkerCheckInRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskSummary> {
    return this.workers.checkIn(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Post("me/tasks/:taskId/progress")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("worker_own.update")
  @ApiOperation({ summary: "Post progress for a worker task" })
  public progress(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(workerProgressUpdateSchema))
    body: WorkerProgressUpdateRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskSummary> {
    return this.workers.progress(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Post("me/tasks/:taskId/check-out")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("worker_own.update")
  @ApiOperation({ summary: "Check out for a worker task" })
  public checkOut(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
    @Body(new ZodValidationPipe(workerCheckOutSchema))
    body: WorkerCheckOutRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskSummary> {
    return this.workers.checkOut(
      principalOf(request),
      taskId,
      body,
      requestIdOf(request),
    );
  }

  @Post("me/notes")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("worker_own.update")
  @ApiOperation({ summary: "Add a note from the signed-in worker" })
  public async addNote(
    @Body(new ZodValidationPipe(addWorkerNoteSchema))
    body: AddWorkerNoteRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerNoteSummary> {
    const principal = principalOf(request);
    const dashboard = await this.workers.getOwnDashboard(principal);
    const workerId = dashboard.workers[0]?.id;
    if (workerId === undefined) {
      throw new UnauthorizedException("No worker profile found");
    }
    return this.workers.addNote(
      principal,
      workerId,
      { ...body, noteType: body.noteType ?? "worker" },
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
