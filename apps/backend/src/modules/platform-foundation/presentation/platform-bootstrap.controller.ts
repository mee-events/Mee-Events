import {
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { requireRequestId } from "../../../common/http/request-context";
import { PlatformFoundationService } from "../application/platform-foundation.service";
import type { PlatformBootstrap } from "../domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../security/access-token.guard";

@ApiTags("Platform foundation")
@ApiBearerAuth()
@Controller("platform")
export class PlatformBootstrapController {
  public constructor(
    @Inject(PlatformFoundationService)
    private readonly foundation: PlatformFoundationService,
  ) {}

  @Get("bootstrap")
  @ApiOperation({
    summary:
      "Load the authenticated role, Hyderabad branch, modules and capabilities",
  })
  @ApiOkResponse({ type: () => PlatformBootstrapResponseDto })
  @ApiResponse({ status: 401 })
  public bootstrap(
    @Req() request: AuthenticatedPlatformRequest,
  ): PlatformBootstrap {
    if (request.user === undefined) {
      throw new UnauthorizedException();
    }
    return this.foundation.createBootstrap(
      request.user,
      requireRequestId(request),
    );
  }
}

class PlatformBootstrapActorDto {
  @ApiProperty({ type: String, format: "uuid" })
  public userId!: string;

  @ApiProperty({ type: String, format: "uuid" })
  public sessionId!: string;

  @ApiProperty({
    type: String,
    enum: [
      "customer",
      "vendor_owner",
      "vendor_member",
      "worker",
      "employee",
      "support",
      "finance",
      "manager",
      "administrator",
      "auditor",
    ],
  })
  public activeRole!: string;
}

class PlatformBootstrapBranchDto {
  @ApiProperty({ type: String, format: "uuid" })
  public id!: string;

  @ApiProperty({ type: String }) public code!: string;
  @ApiProperty({ type: String }) public name!: string;
  @ApiProperty({ type: String }) public city!: string;
  @ApiProperty({ type: String }) public state!: string;
  @ApiProperty({ type: String }) public countryCode!: string;
  @ApiProperty({ type: String }) public timezone!: string;
  @ApiProperty({ type: String }) public currencyCode!: string;
  @ApiProperty({ type: String, enum: ["active"] }) public status!: "active";
}

class PlatformBootstrapClientDto {
  @ApiProperty({
    type: String,
    enum: ["customer_mobile", "vendor_mobile", "worker_mobile", "employee_web"],
  })
  public surface!: string;

  @ApiProperty({ type: String }) public landingModule!: string;
}

class PlatformBootstrapRoleGrantDto {
  @ApiProperty({ type: String }) public role!: string;
  @ApiProperty({ type: String }) public surface!: string;
  @ApiProperty({ type: String, enum: ["global", "branch", "vendor"] })
  public scopeType!: string;
  @ApiProperty({ type: String, format: "uuid", required: false })
  public scopeId?: string;
}

class PlatformBootstrapModuleDto {
  @ApiProperty({ type: String }) public id!: string;
  @ApiProperty({ type: String }) public label!: string;
  @ApiProperty({
    type: String,
    enum: ["self_service", "crm", "erp", "governance"],
  })
  public area!: string;
}

class PlatformBootstrapAccessDto {
  @ApiProperty({ type: [PlatformBootstrapRoleGrantDto] })
  public assignedActiveRoles!: PlatformBootstrapRoleGrantDto[];

  @ApiProperty({ type: [String] }) public capabilities!: string[];
  @ApiProperty({ type: [PlatformBootstrapModuleDto] })
  public modules!: PlatformBootstrapModuleDto[];
}

class PlatformBootstrapControlsDto {
  @ApiProperty({ type: String, enum: ["assigned-active-only"] })
  public roleVisibility!: string;
  @ApiProperty({
    type: String,
    enum: ["hyderabad-branch-and-assignment"],
  })
  public dataScope!: string;
  @ApiProperty({ type: String, enum: ["required"] })
  public mutationAudit!: string;
  @ApiProperty({ type: String, enum: ["required"] })
  public serverAuthorization!: string;
}

class PlatformBootstrapResponseDto {
  @ApiProperty({ type: String, enum: ["2026-07-29"] })
  public schemaVersion!: string;
  @ApiProperty({ type: Number, enum: [1] })
  public minimumClientBootstrapVersion!: number;
  @ApiProperty({ type: String, example: "hyd-v1" })
  public policyVersion!: string;
  @ApiProperty({ type: String, format: "date-time" })
  public generatedAt!: string;
  @ApiProperty({ type: String }) public requestId!: string;
  @ApiProperty({ type: PlatformBootstrapActorDto })
  public actor!: PlatformBootstrapActorDto;
  @ApiProperty({ type: PlatformBootstrapBranchDto })
  public branch!: PlatformBootstrapBranchDto;
  @ApiProperty({ type: PlatformBootstrapClientDto })
  public client!: PlatformBootstrapClientDto;
  @ApiProperty({ type: PlatformBootstrapAccessDto })
  public access!: PlatformBootstrapAccessDto;
  @ApiProperty({ type: PlatformBootstrapControlsDto })
  public controls!: PlatformBootstrapControlsDto;
}
