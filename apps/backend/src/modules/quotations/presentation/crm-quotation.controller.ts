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
  createQuotationSchema,
  reviseQuotationSchema,
  updateQuotationSchema,
  type CreateQuotationRequest,
  type QuotationActivitySummary,
  type QuotationDetailResponse,
  type QuotationListResponse,
  type QuotationPdfPlaceholderResponse,
  type ReviseQuotationRequest,
  type UpdateQuotationRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  AccessTokenGuard,
  type AuthenticatedPlatformRequest,
} from "../../platform-foundation/security/access-token.guard";
import { QuotationService } from "../application/quotation.service";

@ApiTags("CRM Quotations")
@ApiBearerAuth()
@Controller("crm/quotations")
@UseGuards(AccessTokenGuard, CapabilityGuard)
export class CrmQuotationController {
  public constructor(private readonly quotations: QuotationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "Create a draft quotation for a lead" })
  public create(
    @Body(new ZodValidationPipe(createQuotationSchema))
    body: CreateQuotationRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.create(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get()
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "List branch quotations" })
  public list(): Promise<QuotationListResponse> {
    return this.quotations.listCrm();
  }

  @Get(":id")
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "Get quotation detail for CRM" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.getCrm(id);
  }

  @Get(":id/timeline")
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "Get quotation timeline for CRM" })
  public async timeline(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<{ activities: readonly QuotationActivitySummary[] }> {
    const activities = await this.quotations.timelineCrm(id);
    return { activities };
  }

  @Get(":id/pdf")
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "PDF placeholder for CRM" })
  public pdf(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<QuotationPdfPlaceholderResponse> {
    return this.quotations.pdfPlaceholder(id);
  }

  @Patch(":id")
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "Update a draft quotation" })
  public update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateQuotationSchema))
    body: UpdateQuotationRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.updateDraft(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/revise")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "Create a new quotation revision" })
  public revise(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(reviseQuotationSchema))
    body: ReviseQuotationRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.revise(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/send")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("crm_quotation.manage")
  @ApiOperation({ summary: "Send a draft quotation to the customer" })
  public send(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<QuotationDetailResponse> {
    return this.quotations.send(
      principalOf(request),
      id,
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
