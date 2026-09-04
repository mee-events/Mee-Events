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
  addVendorSelfNoteSchema,
  rejectVendorAssignmentSchema,
  vendorProgressUpdateSchema,
  type AddVendorSelfNoteRequest,
  type RejectVendorAssignmentRequest,
  type VendorAssignmentDetailResponse,
  type VendorAssignmentListResponse,
  type VendorAssignmentSummary,
  type VendorDashboardResponse,
  type VendorNoteSummary,
  type VendorProgressUpdateRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { VendorService } from "../application/vendor.service";

@ApiTags("Vendors")
@ApiBearerAuth()
@Controller("vendors")
@UseGuards(CapabilityGuard)
export class VendorController {
  public constructor(private readonly vendors: VendorService) {}

  @Get("me/dashboard")
  @RequireCapability("vendor_own.read")
  @ApiOperation({ summary: "Vendor owner/member dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorDashboardResponse> {
    return this.vendors.getOwnDashboard(principalOf(request));
  }

  @Get("me/assignments")
  @RequireCapability("vendor_own.read")
  @ApiOperation({ summary: "Assignments for the signed-in vendor" })
  public assignments(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorAssignmentListResponse> {
    return this.vendors.listOwnAssignments(principalOf(request));
  }

  @Get("me/assignments/:assignmentId")
  @RequireCapability("vendor_own.read")
  @ApiOperation({ summary: "Assignment detail for the signed-in vendor" })
  public assignment(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorAssignmentDetailResponse> {
    return this.vendors.getOwnAssignment(principalOf(request), assignmentId);
  }

  @Post("me/assignments/:assignmentId/accept")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("vendor_own.update")
  @ApiOperation({ summary: "Accept a vendor assignment" })
  public accept(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorAssignmentSummary> {
    return this.vendors.accept(
      principalOf(request),
      assignmentId,
      requestIdOf(request),
    );
  }

  @Post("me/assignments/:assignmentId/reject")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("vendor_own.update")
  @ApiOperation({ summary: "Reject a vendor assignment" })
  public reject(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
    @Body(new ZodValidationPipe(rejectVendorAssignmentSchema))
    body: RejectVendorAssignmentRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorAssignmentSummary> {
    return this.vendors.reject(
      principalOf(request),
      assignmentId,
      body,
      requestIdOf(request),
    );
  }

  @Post("me/assignments/:assignmentId/progress")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("vendor_own.update")
  @ApiOperation({ summary: "Post vendor progress for an assignment" })
  public progress(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
    @Body(new ZodValidationPipe(vendorProgressUpdateSchema))
    body: VendorProgressUpdateRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorAssignmentSummary> {
    return this.vendors.progress(
      principalOf(request),
      assignmentId,
      body,
      requestIdOf(request),
    );
  }

  @Post("me/notes")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("vendor_own.update")
  @ApiOperation({ summary: "Add a note from the vendor organization" })
  public addNote(
    @Body(new ZodValidationPipe(addVendorSelfNoteSchema))
    body: AddVendorSelfNoteRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorNoteSummary> {
    const principal = principalOf(request);
    return this.vendors.addOwnNote(principal, body, requestIdOf(request));
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
