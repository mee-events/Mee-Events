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
  rejectQuotationSchema,
  requestQuotationRevisionSchema,
  type QuotationActivitySummary,
  type QuotationDetailResponse,
  type QuotationListResponse,
  type QuotationPdfPlaceholderResponse,
  type RejectQuotationRequest,
  type RequestQuotationRevisionRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { QuotationService } from "../application/quotation.service";

@ApiTags("Quotations")
@ApiBearerAuth()
@Controller("quotations")
@UseGuards(CapabilityGuard)
export class QuotationController {
  public constructor(private readonly quotations: QuotationService) {}

  @Get()
  @RequireCapability("quotation.read_own")
  @ApiOperation({ summary: "List the customer's quotations" })
  public list(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationListResponse> {
    return this.quotations.listOwn(principalOf(request));
  }

  @Get(":id")
  @RequireCapability("quotation.read_own")
  @ApiOperation({ summary: "Get one of the customer's quotations" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.getOwn(principalOf(request), id);
  }

  @Get(":id/timeline")
  @RequireCapability("quotation.read_own")
  @ApiOperation({ summary: "Get quotation timeline for the customer" })
  public async timeline(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<{ activities: readonly QuotationActivitySummary[] }> {
    const activities = await this.quotations.timelineOwn(
      principalOf(request),
      id,
    );
    return { activities };
  }

  @Get(":id/pdf")
  @RequireCapability("quotation.read_own")
  @ApiOperation({ summary: "PDF placeholder for a customer quotation" })
  public pdf(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationPdfPlaceholderResponse> {
    return this.quotations.pdfPlaceholderOwn(principalOf(request), id);
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("quotation.approve_own")
  @ApiOperation({ summary: "Approve a sent quotation" })
  public approve(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.approve(
      principalOf(request),
      id,
      requestIdOf(request),
    );
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("quotation.reject_own")
  @ApiOperation({ summary: "Reject a sent quotation" })
  public reject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(rejectQuotationSchema))
    body: RejectQuotationRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.reject(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/request-revision")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("quotation.request_revision_own")
  @ApiOperation({ summary: "Request a quotation revision" })
  public requestRevision(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(requestQuotationRevisionSchema))
    body: RequestQuotationRevisionRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.requestRevision(
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
