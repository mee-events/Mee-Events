import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  leadRequirementsSchema,
  type LeadListResponse,
  type LeadRequirementsRequest,
  type LeadSummary,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import {
  parsePagination,
  type PaginationMeta,
} from "../../../common/pagination/pagination";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import { CrmService } from "../application/crm.service";

@ApiTags("CRM")
@ApiBearerAuth()
@Controller("crm")
@UseGuards(CapabilityGuard)
export class CrmController {
  public constructor(private readonly crm: CrmService) {}

  @Get("leads")
  @RequireCapability("crm_lead.read")
  @ApiOperation({ summary: "List branch leads" })
  public listLeads(
    @Req() request: AuthenticatedPlatformRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<
    LeadListResponse & {
      readonly data?: readonly LeadSummary[];
      readonly meta?: PaginationMeta;
    }
  > {
    return this.crm.listLeads(principalOf(request), parsePagination(query));
  }

  @Get("leads/:id")
  @RequireCapability("crm_lead.read")
  @ApiOperation({ summary: "Get one lead" })
  public getLead(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<LeadSummary> {
    return this.crm.getLead(id);
  }

  @Post("leads/:id/claim")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("crm_lead.update")
  @ApiOperation({ summary: "Claim ownership of a lead" })
  public claim(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<LeadSummary> {
    return this.crm.claimLead(principalOf(request), id, requestIdOf(request));
  }

  @Post("leads/:id/requirements")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("crm_lead.update")
  @ApiOperation({ summary: "Save requirements discussion notes for a lead" })
  public requirements(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(leadRequirementsSchema))
    body: LeadRequirementsRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<LeadSummary> {
    return this.crm.saveRequirements(
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
