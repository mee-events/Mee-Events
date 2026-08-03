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

export const VENDOR_REPOSITORY = Symbol("VENDOR_REPOSITORY");

export interface VendorMutationContext {
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly branchId: string;
}

export interface VendorListOptions {
  readonly branchId: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly search?: string;
}

export interface VendorRepository {
  listVendors(options: VendorListOptions): Promise<{
    readonly items: readonly VendorSummary[];
    readonly total: number;
  }>;
  getVendor(vendorId: string): Promise<VendorDetailResponse | undefined>;
  createVendor(
    input: VendorMutationContext & { readonly body: CreateVendorRequest },
  ): Promise<VendorDetailResponse>;
  updateVendor(
    input: VendorMutationContext & {
      readonly vendorId: string;
      readonly body: UpdateVendorRequest;
    },
  ): Promise<VendorDetailResponse | undefined>;

  assignVendor(
    input: VendorMutationContext & { readonly body: AssignVendorRequest },
  ): Promise<VendorAssignmentSummary | undefined>;
  updateAssignment(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateVendorAssignmentRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined>;
  acceptAssignment(
    input: VendorMutationContext & { readonly assignmentId: string },
  ): Promise<VendorAssignmentSummary | undefined>;
  rejectAssignment(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: RejectVendorAssignmentRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined>;
  updateProgress(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: VendorProgressUpdateRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined>;

  listAssignments(filters?: {
    readonly vendorId?: string;
    readonly eventRecordId?: string;
    readonly branchId?: string;
    readonly limit?: number;
    readonly offset?: number;
  }): Promise<readonly VendorAssignmentSummary[]>;
  getAssignment(
    assignmentId: string,
  ): Promise<VendorAssignmentDetailResponse | undefined>;

  addNote(
    input: VendorMutationContext & {
      readonly vendorId: string;
      readonly body: AddVendorNoteRequest;
    },
  ): Promise<VendorNoteSummary | undefined>;

  getCrmDashboard(branchId: string): Promise<VendorDashboardResponse>;
  getVendorDashboard(userId: string): Promise<VendorDashboardResponse>;
  findVendorIdForUser(userId: string): Promise<string | undefined>;
  isVendorMember(vendorId: string, userId: string): Promise<boolean>;
}

export type {
  VendorAssignmentListResponse,
  VendorDashboardResponse,
  VendorDetailResponse,
  VendorListResponse,
};
