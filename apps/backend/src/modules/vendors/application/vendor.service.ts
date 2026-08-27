import { Inject, Injectable } from "@nestjs/common";
import type {
  AddVendorNoteRequest,
  AssignVendorRequest,
  CreateVendorRequest,
  RejectVendorAssignmentRequest,
  UpdateVendorAssignmentRequest,
  UpdateVendorRequest,
  VendorAssignmentDetailResponse,
  VendorAssignmentListResponse,
  VendorAssignmentSummary,
  VendorDashboardResponse,
  VendorDetailResponse,
  VendorListResponse,
  VendorNoteSummary,
  VendorProgressUpdateRequest,
  VendorSummary,
} from "@me-event/api-contracts";
import { randomUUID } from "node:crypto";
import { resolveBranchId } from "../../../common/branch/branch-context";
import { DomainError } from "../../../common/errors/domain.error";
import {
  buildPaginationMeta,
  paginatedCollection,
  type PaginationMeta,
  type PaginationParams,
} from "../../../common/pagination/pagination";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import {
  VENDOR_REPOSITORY,
  type VendorRepository,
} from "../ports/vendor-repository";

@Injectable()
export class VendorService {
  public constructor(
    @Inject(VENDOR_REPOSITORY)
    private readonly vendors: VendorRepository,
  ) {}

  public async list(
    principal: AuthenticatedPrincipal,
    pagination?: PaginationParams,
  ): Promise<
    VendorListResponse & {
      readonly data?: readonly VendorSummary[];
      readonly meta?: PaginationMeta;
    }
  > {
    const result = await this.vendors.listVendors({
      branchId: resolveBranchId(principal),
      ...(pagination?.requested
        ? { limit: pagination.limit, offset: pagination.offset }
        : {}),
      ...(pagination?.search === undefined
        ? {}
        : { search: pagination.search }),
    });
    const meta =
      pagination?.requested === true
        ? buildPaginationMeta({
            page: pagination.page,
            limit: pagination.limit,
            total: result.total,
          })
        : undefined;
    return paginatedCollection("vendors", result.items, meta);
  }

  public async get(
    principal: AuthenticatedPrincipal,
    vendorId: string,
  ): Promise<VendorDetailResponse> {
    const vendor = await this.vendors.getVendor(
      vendorId,
      resolveBranchId(principal),
    );
    if (vendor === undefined) {
      throw new DomainError("VENDOR_NOT_FOUND", "Vendor not found", 404);
    }
    return vendor;
  }

  public create(
    principal: AuthenticatedPrincipal,
    body: CreateVendorRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorDetailResponse> {
    return this.vendors.createVendor({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
  }

  public async update(
    principal: AuthenticatedPrincipal,
    vendorId: string,
    body: UpdateVendorRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorDetailResponse> {
    const vendor = await this.vendors.updateVendor({
      vendorId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (vendor === undefined) {
      throw new DomainError("VENDOR_NOT_FOUND", "Vendor not found", 404);
    }
    return vendor;
  }

  public async assign(
    principal: AuthenticatedPrincipal,
    body: AssignVendorRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorAssignmentSummary> {
    const assignment = await this.vendors.assignVendor({
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_FAILED",
        "Event or vendor not found / inactive",
        404,
      );
    }
    return assignment;
  }

  public async updateAssignment(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
    body: UpdateVendorAssignmentRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorAssignmentSummary> {
    const assignment = await this.vendors.updateAssignment({
      assignmentId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  public async accept(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
    requestId: string = randomUUID(),
  ): Promise<VendorAssignmentSummary> {
    await this.assertOwnsAssignment(principal, assignmentId);
    const assignment = await this.vendors.acceptAssignment({
      assignmentId,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  public async reject(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
    body: RejectVendorAssignmentRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorAssignmentSummary> {
    await this.assertOwnsAssignment(principal, assignmentId);
    const assignment = await this.vendors.rejectAssignment({
      assignmentId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  public async progress(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
    body: VendorProgressUpdateRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorAssignmentSummary> {
    await this.assertOwnsAssignment(principal, assignmentId);
    const assignment = await this.vendors.updateProgress({
      assignmentId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  public async listAssignments(
    principal: AuthenticatedPrincipal,
    filters?: {
      readonly vendorId?: string;
      readonly eventRecordId?: string;
    },
  ): Promise<VendorAssignmentListResponse> {
    return {
      assignments: await this.vendors.listAssignments({
        ...filters,
        branchId: resolveBranchId(principal),
      }),
    };
  }

  public async getAssignment(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
  ): Promise<VendorAssignmentDetailResponse> {
    const assignment = await this.vendors.getAssignment(
      assignmentId,
      resolveBranchId(principal),
    );
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  public async getOwnAssignment(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
  ): Promise<VendorAssignmentDetailResponse> {
    await this.assertOwnsAssignment(principal, assignmentId);
    return this.loadAssignmentById(assignmentId);
  }

  public async listOwnAssignments(
    principal: AuthenticatedPrincipal,
  ): Promise<VendorAssignmentListResponse> {
    const vendorId = await this.vendors.findVendorIdForUser(principal.userId);
    if (vendorId === undefined) {
      return { assignments: [] };
    }
    return {
      assignments: await this.vendors.listAssignments({ vendorId }),
    };
  }

  public async addNote(
    principal: AuthenticatedPrincipal,
    vendorId: string,
    body: AddVendorNoteRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorNoteSummary> {
    const note = await this.vendors.addNote({
      vendorId,
      body,
      actorUserId: principal.userId,
      actorRole: principal.activeRole,
      requestId,
      branchId: resolveBranchId(principal),
    });
    if (note === undefined) {
      throw new DomainError("VENDOR_NOT_FOUND", "Vendor not found", 404);
    }
    return note;
  }

  public getCrmDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<VendorDashboardResponse> {
    return this.vendors.getCrmDashboard(resolveBranchId(principal));
  }

  public getOwnDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<VendorDashboardResponse> {
    return this.vendors.getVendorDashboard(principal.userId);
  }

  private async loadAssignmentById(
    assignmentId: string,
  ): Promise<VendorAssignmentDetailResponse> {
    const assignment = await this.vendors.getAssignment(assignmentId);
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    return assignment;
  }

  private async assertOwnsAssignment(
    principal: AuthenticatedPrincipal,
    assignmentId: string,
  ): Promise<void> {
    const assignment = await this.vendors.getAssignment(assignmentId);
    if (assignment === undefined) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
        404,
      );
    }
    const allowed = await this.vendors.isVendorMember(
      assignment.vendorId,
      principal.userId,
    );
    if (!allowed) {
      throw new DomainError(
        "VENDOR_ASSIGNMENT_FORBIDDEN",
        "You are not a member of this vendor",
        403,
      );
    }
  }
}
