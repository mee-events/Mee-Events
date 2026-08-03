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
  addEventNoteSchema,
  addEventTimelineEntrySchema,
  changeEventStatusSchema,
  createEventRecordSchema,
  updateEventNoteSchema,
  updateEventRecordSchema,
  type AddEventNoteRequest,
  type AddEventTimelineEntryRequest,
  type ChangeEventStatusRequest,
  type CreateEventRecordRequest,
  type EventActivityListResponse,
  type EventNoteSummary,
  type EventRecordDetailResponse,
  type EventRecordListResponse,
  type EventTimelineEntry,
  type EventTimelineResponse,
  type UpdateEventNoteRequest,
  type UpdateEventRecordRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { EventRecordService } from "../application/event-record.service";

@ApiTags("CRM Events")
@ApiBearerAuth()
@Controller("crm/events")
@UseGuards(CapabilityGuard)
export class CrmEventRecordController {
  public constructor(private readonly events: EventRecordService) {}

  @Get()
  @RequireCapability("erp_event.read")
  @ApiOperation({ summary: "List branch event records" })
  public list(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventRecordListResponse> {
    return this.events.listCrm(principalOf(request));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("erp_event.manage")
  @ApiOperation({
    summary: "Create an event record from a confirmed booking (idempotent)",
  })
  public create(
    @Body(new ZodValidationPipe(createEventRecordSchema))
    body: CreateEventRecordRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventRecordDetailResponse> {
    return this.events.createFromBooking(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get(":id")
  @RequireCapability("erp_event.read")
  @ApiOperation({ summary: "Get event record detail for ERP operations" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<EventRecordDetailResponse> {
    return this.events.getCrm(id);
  }

  @Patch(":id")
  @RequireCapability("erp_event.manage")
  @ApiOperation({ summary: "Update event record operational details" })
  public update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateEventRecordSchema))
    body: UpdateEventRecordRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventRecordDetailResponse> {
    return this.events.update(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/status")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("erp_event.manage")
  @ApiOperation({ summary: "Change event record status" })
  public changeStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(changeEventStatusSchema))
    body: ChangeEventStatusRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventRecordDetailResponse> {
    return this.events.changeStatus(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/notes")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("erp_event.manage")
  @ApiOperation({ summary: "Add an internal or customer-visible note" })
  public addNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addEventNoteSchema))
    body: AddEventNoteRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventNoteSummary> {
    return this.events.addNote(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Patch(":id/notes/:noteId")
  @RequireCapability("erp_event.manage")
  @ApiOperation({ summary: "Update a note and append edit history" })
  public updateNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("noteId", new ParseUUIDPipe()) noteId: string,
    @Body(new ZodValidationPipe(updateEventNoteSchema))
    body: UpdateEventNoteRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventNoteSummary> {
    return this.events.updateNote(
      principalOf(request),
      id,
      noteId,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/timeline")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("erp_event.manage")
  @ApiOperation({ summary: "Add an immutable timeline milestone entry" })
  public addTimelineEntry(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addEventTimelineEntrySchema))
    body: AddEventTimelineEntryRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTimelineEntry> {
    return this.events.addTimelineEntry(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Get(":id/timeline")
  @RequireCapability("erp_event.read")
  @ApiOperation({ summary: "Get full event timeline" })
  public timeline(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<EventTimelineResponse> {
    return this.events.timelineCrm(id);
  }

  @Get(":id/activities")
  @RequireCapability("erp_event.read")
  @ApiOperation({ summary: "Get full event activity feed" })
  public activities(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<EventActivityListResponse> {
    return this.events.activitiesCrm(id);
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
