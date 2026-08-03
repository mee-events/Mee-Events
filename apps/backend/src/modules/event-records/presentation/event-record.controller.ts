import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  EventActivityListResponse,
  EventRecordDetailResponse,
  EventRecordListResponse,
  EventTimelineResponse,
} from "@me-event/api-contracts";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { EventRecordService } from "../application/event-record.service";

@ApiTags("Events")
@ApiBearerAuth()
@Controller("events")
@UseGuards(CapabilityGuard)
export class EventRecordController {
  public constructor(private readonly events: EventRecordService) {}

  @Get()
  @RequireCapability("event.track_own")
  @ApiOperation({ summary: "List the customer's event records" })
  public list(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventRecordListResponse> {
    return this.events.listOwn(principalOf(request));
  }

  @Get(":id")
  @RequireCapability("event.track_own")
  @ApiOperation({ summary: "Get one of the customer's event records" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventRecordDetailResponse> {
    return this.events.getOwn(principalOf(request), id);
  }

  @Get(":id/timeline")
  @RequireCapability("event.track_own")
  @ApiOperation({ summary: "Get customer-visible event timeline" })
  public timeline(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventTimelineResponse> {
    return this.events.timelineOwn(principalOf(request), id);
  }

  @Get(":id/activities")
  @RequireCapability("event.track_own")
  @ApiOperation({ summary: "Get customer-visible event activities" })
  public activities(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EventActivityListResponse> {
    return this.events.activitiesOwn(principalOf(request), id);
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
