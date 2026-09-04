import { Inject, Injectable } from "@nestjs/common";
import type {
  AddVendorNoteRequest,
  AddVendorSelfNoteRequest,
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
import { hasActiveVendorResourceGrant } from "../../../common/branch/role-scope-policy";
import { DomainError } from "../../../common/errors/domain.error";
import {
  buildPaginationMeta,
  paginatedCollection,
  type PaginationMeta,
  type PaginationParams,
} from "../../../common/pagination/pagination";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import { toVendorSummary } from "./vendor-summary";
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
    const authorized = await this.loadAuthorizedVendorResources(principal);
    return {
      assignments: (
        await Promise.all(
          authorized.map(({ vendor }) =>
            this.vendors.listAssignments({
              vendorId: vendor.id,
              branchId: resolveBranchId(principal),
            }),
          ),
        )
      ).flat(),
    };
  }

  public addCrmNote(
    principal: AuthenticatedPrincipal,
    vendorId: string,
    body: AddVendorNoteRequest,
    requestId: string = randomUUID(),
  ): Promise<VendorNoteSummary> {
    return this.persistNote(principal, vendorId, body, requestId);
  }

  public async addOwnNote(
    principal: AuthenticatedPrincipal,
    body:
      | AddVendorSelfNoteRequest
      | {
          readonly vendorId?: string;
          readonly content: string;
          readonly noteType?: string;
          readonly assignmentId?: string;
          readonly eventRecordId?: string;
        },
    requestId: string = randomUUID(),
  ): Promise<VendorNoteSummary> {
    const { vendorId: requestedVendorId, ...noteBody } = body;
    const vendorId =
      requestedVendorId === undefined
        ? await this.inferOwnNoteVendorId(principal)
        : requestedVendorId;
    if (requestedVendorId !== undefined) {
      await this.assertVendorResourceAccess(principal, requestedVendorId);
    }
    if (body.noteType !== undefined && body.noteType !== "vendor") {
      throw new DomainError(
        "INVALID_VENDOR_NOTE_TYPE",
        "Vendor-originated notes must have noteType 'vendor'",
        400,
      );
    }
    const safeBody: AddVendorNoteRequest = {
      ...noteBody,
      noteType: "vendor",
    };
    return this.persistNote(principal, vendorId, safeBody, requestId);
  }

  private async inferOwnNoteVendorId(
    principal: AuthenticatedPrincipal,
  ): Promise<string> {
    const authorized = await this.loadAuthorizedVendorResources(principal);
    if (authorized.length !== 1) {
      throw new DomainError(
        "VENDOR_SELECTION_REQUIRED",
        "vendorId is required when more than one vendor is authorized",
        400,
      );
    }
    return authorized[0]!.vendor.id;
  }

  private async persistNote(
    principal: AuthenticatedPrincipal,
    vendorId: string,
    body: AddVendorNoteRequest,
    requestId: string,
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
      throw new DomainError(
        "VENDOR_NOTE_TARGET_NOT_FOUND",
        "Vendor note target not found",
        404,
      );
    }
    return note;
  }

  public getCrmDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<VendorDashboardResponse> {
    return this.vendors.getCrmDashboard(resolveBranchId(principal));
  }

  public async getOwnDashboard(
    principal: AuthenticatedPrincipal,
  ): Promise<VendorDashboardResponse> {
    const authorized = await this.loadAuthorizedVendorResources(principal);
    const assignments = (
      await Promise.all(
        authorized.map(({ vendor }) =>
          this.vendors.listAssignments({
            vendorId: vendor.id,
            branchId: resolveBranchId(principal),
          }),
        ),
      )
    ).flat();
    const openAssignments = assignments.filter(
      (assignment) =>
        !["rejected", "cancelled", "completed"].includes(assignment.status),
    );
    return {
      totalVendors: authorized.length,
      activeAssignments: openAssignments.length,
      pendingAcceptances: assignments.filter(
        (assignment) =>
          assignment.status === "assigned" || assignment.status === "invited",
      ).length,
      completedAssignments: assignments.filter(
        (assignment) => assignment.status === "completed",
      ).length,
      vendors: authorized.map(({ vendor }) => toVendorSummary(vendor)),
      openAssignments: openAssignments.slice(0, 50),
    };
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
    await this.assertVendorResourceAccess(principal, assignment.vendorId);
  }

  private async assertVendorResourceAccess(
    principal: AuthenticatedPrincipal,
    vendorId: string,
  ): Promise<void> {
    const branchId = resolveBranchId(principal);
    const [vendor, member] = await Promise.all([
      this.vendors.getVendor(vendorId, branchId),
      this.vendors.isVendorMember(vendorId, principal.userId),
    ]);
    const granted = hasActiveVendorResourceGrant(
      principal.roleAssignments,
      principal.activeRole,
      vendorId,
      branchId,
    );
    if (vendor === undefined || !member || !granted) {
      throw new DomainError(
        "VENDOR_RESOURCE_FORBIDDEN",
        "You are not authorized for this vendor",
        403,
      );
    }
  }

  private async loadAuthorizedVendorResources(
    principal: AuthenticatedPrincipal,
  ): Promise<readonly { readonly vendor: VendorDetailResponse }[]> {
    const branchId = resolveBranchId(principal);
    const vendorIds = await this.vendors.findVendorIdsForUser(principal.userId);
    const candidates = await Promise.all(
      vendorIds.map(async (vendorId) => ({
        vendorId,
        vendor: await this.vendors.getVendor(vendorId, branchId),
      })),
    );
    const authorized = candidates
      .filter(
        (
          candidate,
        ): candidate is {
          readonly vendorId: string;
          readonly vendor: VendorDetailResponse;
        } =>
          candidate.vendor !== undefined &&
          hasActiveVendorResourceGrant(
            principal.roleAssignments,
            principal.activeRole,
            candidate.vendorId,
            branchId,
          ),
      )
      .map(({ vendor }) => ({ vendor }));
    if (authorized.length === 0) {
      throw new DomainError(
        "VENDOR_RESOURCE_FORBIDDEN",
        "You are not authorized for this vendor",
        403,
      );
    }
    return authorized;
  }
}
