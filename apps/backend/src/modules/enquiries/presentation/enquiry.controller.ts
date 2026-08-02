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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  createEnquirySchema,
  type CreateEnquiryRequest,
  type EnquiryDetailResponse,
  type EnquirySummary,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import {
  AccessTokenGuard,
  type AuthenticatedPlatformRequest,
} from "../../platform-foundation/security/access-token.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import { EnquiryService } from "../application/enquiry.service";

@ApiTags("Enquiries")
@ApiBearerAuth()
@Controller("enquiries")
@UseGuards(AccessTokenGuard, CapabilityGuard)
export class EnquiryController {
  public constructor(private readonly enquiries: EnquiryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("enquiry.create_own")
  @ApiOperation({ summary: "Submit a customer enquiry" })
  @ApiResponse({ status: HttpStatus.CREATED })
  public create(
    @Body(new ZodValidationPipe(createEnquirySchema))
    body: CreateEnquiryRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EnquiryDetailResponse> {
    return this.enquiries.create(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get()
  @RequireCapability("enquiry.read_own")
  @ApiOperation({ summary: "List the customer's own enquiries" })
  public async list(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<{ enquiries: readonly EnquirySummary[] }> {
    const enquiries = await this.enquiries.listOwn(principalOf(request));
    return { enquiries };
  }

  @Get(":id")
  @RequireCapability("enquiry.read_own")
  @ApiOperation({ summary: "Get one of the customer's own enquiries" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<EnquiryDetailResponse> {
    return this.enquiries.getOwn(principalOf(request), id);
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
