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
  addVendorNoteSchema,
  assignVendorSchema,
  createVendorSchema,
  updateVendorAssignmentSchema,
  updateVendorSchema,
  type AddVendorNoteRequest,
  type AssignVendorRequest,
  type CreateVendorRequest,
  type UpdateVendorAssignmentRequest,
  type UpdateVendorRequest,
  type VendorAssignmentDetailResponse,
  type VendorAssignmentListResponse,
  type VendorAssignmentSummary,
  type VendorDashboardResponse,
  type VendorDetailResponse,
  type VendorListResponse,
  type VendorNoteSummary,
  type VendorSummary,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import {
  parsePagination,
  type PaginationMeta,
} from "../../../common/pagination/pagination";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { VendorService } from "../application/vendor.service";

@ApiTags("CRM Vendors")
@ApiBearerAuth()
@Controller("crm/vendors")
@UseGuards(CapabilityGuard)
export class CrmVendorController {
  public constructor(private readonly vendors: VendorService) {}

  @Get()
  @RequireCapability("crm_vendor.read")
  @ApiOperation({ summary: "List vendors for the branch" })
  public list(
    @Req() request: AuthenticatedPlatformRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<
    VendorListResponse & {
      readonly data?: readonly VendorSummary[];
      readonly meta?: PaginationMeta;
    }
  > {
    return this.vendors.list(principalOf(request), parsePagination(query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_vendor.manage")
  @ApiOperation({ summary: "Create a vendor profile" })
  public create(
    @Body(new ZodValidationPipe(createVendorSchema)) body: CreateVendorRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorDetailResponse> {
    return this.vendors.create(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("dashboard")
  @RequireCapability("crm_vendor.read")
  @ApiOperation({ summary: "CRM vendor operations dashboard" })
  public dashboard(
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorDashboardResponse> {
    return this.vendors.getCrmDashboard(principalOf(request));
  }

  @Get("assignments")
  @RequireCapability("crm_vendor.read")
  @ApiOperation({ summary: "List vendor assignments" })
  public listAssignments(
    @Query("eventRecordId") eventRecordId?: string,
    @Query("vendorId") vendorId?: string,
  ): Promise<VendorAssignmentListResponse> {
    return this.vendors.listAssignments({
      ...(eventRecordId === undefined ? {} : { eventRecordId }),
      ...(vendorId === undefined ? {} : { vendorId }),
    });
  }

  @Post("assignments")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_vendor.manage")
  @ApiOperation({ summary: "Assign a vendor to an event record" })
  public assign(
    @Body(new ZodValidationPipe(assignVendorSchema)) body: AssignVendorRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorAssignmentSummary> {
    return this.vendors.assign(
      principalOf(request),
      body,
      requestIdOf(request),
    );
  }

  @Get("assignments/:assignmentId")
  @RequireCapability("crm_vendor.read")
  @ApiOperation({ summary: "Vendor assignment detail" })
  public getAssignment(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
  ): Promise<VendorAssignmentDetailResponse> {
    return this.vendors.getAssignment(assignmentId);
  }

  @Patch("assignments/:assignmentId")
  @RequireCapability("crm_vendor.manage")
  @ApiOperation({ summary: "Update vendor assignment (CRM)" })
  public updateAssignment(
    @Param("assignmentId", new ParseUUIDPipe()) assignmentId: string,
    @Body(new ZodValidationPipe(updateVendorAssignmentSchema))
    body: UpdateVendorAssignmentRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorAssignmentSummary> {
    return this.vendors.updateAssignment(
      principalOf(request),
      assignmentId,
      body,
      requestIdOf(request),
    );
  }

  @Get(":id")
  @RequireCapability("crm_vendor.read")
  @ApiOperation({ summary: "Vendor detail" })
  public get(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<VendorDetailResponse> {
    return this.vendors.get(id);
  }

  @Patch(":id")
  @RequireCapability("crm_vendor.manage")
  @ApiOperation({ summary: "Update vendor profile" })
  public update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateVendorSchema)) body: UpdateVendorRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorDetailResponse> {
    return this.vendors.update(
      principalOf(request),
      id,
      body,
      requestIdOf(request),
    );
  }

  @Post(":id/notes")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("crm_vendor.manage")
  @ApiOperation({ summary: "Add a vendor note" })
  public addNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addVendorNoteSchema))
    body: AddVendorNoteRequest,
    @Req() request: AuthenticatedPlatformRequest,
  ): Promise<VendorNoteSummary> {
    return this.vendors.addNote(
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
