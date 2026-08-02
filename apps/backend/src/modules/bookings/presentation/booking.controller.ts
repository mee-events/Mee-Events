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
  BookingDetailResponse,
  BookingListResponse,
} from "@me-event/api-contracts";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  AccessTokenGuard,
  type AuthenticatedPlatformRequest,
} from "../../platform-foundation/security/access-token.guard";
import { BookingService } from "../application/booking.service";

@ApiTags("Bookings")
@ApiBearerAuth()
@Controller("bookings")
@UseGuards(AccessTokenGuard, CapabilityGuard)
export class BookingController {
  public constructor(private readonly bookings: BookingService) {}

  @Get()
  @RequireCapability("booking.read_own")
  @ApiOperation({ summary: "List the customer's bookings" })
  public list(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<BookingListResponse> {
    return this.bookings.listOwn(principalOf(request));
  }

  @Get(":id")
  @RequireCapability("booking.read_own")
  @ApiOperation({ summary: "Get one of the customer's bookings" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<BookingDetailResponse> {
    return this.bookings.getOwn(principalOf(request), id);
  }
}

@ApiTags("CRM Bookings")
@ApiBearerAuth()
@Controller("crm/bookings")
@UseGuards(AccessTokenGuard, CapabilityGuard)
export class CrmBookingController {
  public constructor(private readonly bookings: BookingService) {}

  @Get()
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "List branch bookings" })
  public list(): Promise<BookingListResponse> {
    return this.bookings.listCrm();
  }

  @Get(":id")
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "Get booking detail for CRM" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<BookingDetailResponse> {
    return this.bookings.getCrm(id);
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
