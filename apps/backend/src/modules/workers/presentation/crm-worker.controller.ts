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
  addWorkerNoteSchema,
  assignWorkerSchema,
  createWorkerSchema,
  updateWorkerSchema,
  type AddWorkerNoteRequest,
  type AssignWorkerRequest,
  type CreateWorkerRequest,
  type UpdateWorkerRequest,
  type WorkerAttendanceListResponse,
  type WorkerDashboardResponse,
  type WorkerDetailResponse,
  type WorkerListResponse,
  type WorkerNoteSummary,
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

@ApiTags("CRM Workers")
@ApiBearerAuth()
@Controller("crm/workers")
@UseGuards(CapabilityGuard)
export class CrmWorkerController {
  public constructor(private readonly workers: WorkerService) {}

  @Get()
  @RequireCapability("crm_worker.read")
  @ApiOperation({ summary: "List workers for the branch" })
  public list(
    @Req() request: AuthenticatedPlatformRequest,
    @Query() query: Record<string, string | undefined>,
  ): Promise<WorkerListResponse> {
    return this.workers.list(principalOf(request), {
      ...(query.vendorId === undefined ? {} : { vendorId: query.vendorId }),
      ...(query.page === undefined ? {} : { page: query.page }),
      ...(query.limit === undefined ? {} : { limit: query.limit }),
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.sort === undefined ? {} : { sort: query.sort }),
      ...(query.order === undefined ? {} : { order: query.order }),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_worker.manage")
  @ApiOperation({ summary: "Create a worker profile" })
  public create(
    @Body(new ZodValidationPipe(createWorkerSchema)) body: CreateWorkerRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerDetailResponse> {
    return this.workers.create(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("dashboard")
  @RequireCapability("crm_worker.read")
  @ApiOperation({ summary: "CRM worker operations dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerDashboardResponse> {
    return this.workers.getCrmDashboard(principalOf(request));
  }

  @Get("tasks")
  @RequireCapability("crm_worker.read")
  @ApiOperation({ summary: "List worker tasks" })
  public listTasks(
    @Query("eventRecordId") eventRecordId?: string,
    @Query("workerId") workerId?: string,
    @Query("vendorId") vendorId?: string,
  ): Promise<WorkerTaskListResponse> {
    return this.workers.listTasks({
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
      ...(workerId === undefined ? {} : { workerId }),
      ...(vendorId === undefined ? {} : { vendorId }),
    });
  }

  @Post("tasks")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_worker.manage")
  @ApiOperation({ summary: "Assign a worker task to an event" })
  public assign(
    @Body(new ZodValidationPipe(assignWorkerSchema)) body: AssignWorkerRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerTaskSummary> {
    return this.workers.assign(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("tasks/:taskId")
  @RequireCapability("crm_worker.read")
  @ApiOperation({ summary: "Worker task detail" })
  public getTask(
    @Param("taskId", new ParseUUIDPipe()) taskId: string,
  ): Promise<WorkerTaskDetailResponse> {
    return this.workers.getTask(taskId);
  }

  @Get("attendance")
  @RequireCapability("crm_worker.read")
  @ApiOperation({ summary: "List worker attendance" })
  public listAttendance(
    @Query("workerId") workerId?: string,
  ): Promise<WorkerAttendanceListResponse> {
    return this.workers.listAttendance({
      ...(workerId === undefined ? {} : { workerId }),
    });
  }

  @Get(":id")
  @RequireCapability("crm_worker.read")
  @ApiOperation({ summary: "Worker detail" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<WorkerDetailResponse> {
    return this.workers.get(id);
  }

  @Patch(":id")
  @RequireCapability("crm_worker.manage")
  @ApiOperation({ summary: "Update worker profile" })
  public update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateWorkerSchema)) body: UpdateWorkerRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerDetailResponse> {
    return this.workers.update(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/notes")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_worker.manage")
  @ApiOperation({ summary: "Add a worker note" })
  public addNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addWorkerNoteSchema))
    body: AddWorkerNoteRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<WorkerNoteSummary> {
    return this.workers.addNote(
      principalOf(request),
      id,
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
