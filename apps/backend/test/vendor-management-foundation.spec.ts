import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AddVendorNoteRequest,
  AssignVendorRequest,
  CreateVendorRequest,
  EventActivitySummary,
  EventTimelineEntry,
  RejectVendorAssignmentRequest,
  UpdateVendorAssignmentRequest,
  UpdateVendorRequest,
  VendorAssignmentDetailResponse,
  VendorAssignmentSummary,
  VendorDashboardResponse,
  VendorDetailResponse,
  VendorNoteSummary,
  VendorProgressUpdateRequest,
  VendorSummary,
} from "@me-event/api-contracts";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import { VendorService } from "../src/modules/vendors/application/vendor.service";
import type {
  VendorMutationContext,
  VendorRepository,
} from "../src/modules/vendors/ports/vendor-repository";
import { PatternBSideEffects } from "./helpers/pattern-b-side-effects";

class FakeVendorRepository implements VendorRepository {
  public vendors = new Map<string, VendorDetailResponse>();
  public assignments = new Map<string, VendorAssignmentDetailResponse>();
  public members = new Map<string, string>(); // userId -> vendorId
  public patternB = new PatternBSideEffects();

  private mutateAssignment(
    input: VendorMutationContext & { readonly assignmentId: string },
    patch: {
      readonly status?: VendorAssignmentDetailResponse["status"];
      readonly rejectionReason?: string;
      readonly latestProgressSummary?: string;
      readonly entryType: string;
      readonly title: string;
      readonly content?: string;
      readonly customerVisible?: boolean;
      readonly activityType: string;
      readonly action: string;
      readonly outboxTopic: string;
    },
  ): VendorAssignmentSummary | undefined {
    const current = this.assignments.get(input.assignmentId);
    if (current === undefined) return undefined;
    const timelineEntry = this.patternB.appendTimeline(current.eventRecordId, {
      entryType: patch.entryType as EventTimelineEntry["entryType"],
      title: patch.title,
      ...(patch.content === undefined ? {} : { content: patch.content }),
      customerVisible: patch.customerVisible ?? false,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(current.eventRecordId, {
      activityType: patch.activityType as EventActivitySummary["activityType"],
      content: patch.content ?? patch.title,
      customerVisible: patch.customerVisible ?? false,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendModuleTimelineAndActivity("vendor", current.vendorId, {
      entryType: patch.entryType,
      title: patch.title,
      activityType: patch.activityType,
      ...(patch.content === undefined ? {} : { content: patch.content }),
      customerVisible: patch.customerVisible ?? false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: current.eventRecordId,
      action: patch.action,
      outboxTopic: patch.outboxTopic,
    });
    const updated: VendorAssignmentDetailResponse = {
      ...current,
      ...(patch.status === undefined ? {} : { status: patch.status }),
      ...(patch.rejectionReason === undefined
        ? {}
        : { rejectionReason: patch.rejectionReason }),
      ...(patch.latestProgressSummary === undefined
        ? {}
        : { latestProgressSummary: patch.latestProgressSummary }),
      version: current.version + 1,
      timeline: [timelineEntry, ...current.timeline],
    };
    this.assignments.set(input.assignmentId, updated);
    return updated;
  }

  public async listVendors(options: {
    readonly branchId: string;
    readonly limit?: number;
    readonly offset?: number;
    readonly search?: string;
  }): Promise<{
    readonly items: readonly VendorSummary[];
    readonly total: number;
  }> {
    let items = [...this.vendors.values()].map(toSummary);
    if (options.search !== undefined && options.search.length > 0) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (v) =>
          v.businessName.toLowerCase().includes(q) ||
          v.ownerName.toLowerCase().includes(q) ||
          v.vendorCode.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 200;
    return { items: items.slice(offset, offset + limit), total };
  }

  public async getVendor(
    vendorId: string,
    branchId?: string,
  ): Promise<VendorDetailResponse | undefined> {
    if (
      branchId !== undefined &&
      branchId !== "00000000-0000-4000-8000-000000000001"
    ) {
      return undefined;
    }
    return this.vendors.get(vendorId);
  }

  public async createVendor(
    input: VendorMutationContext & { readonly body: CreateVendorRequest },
  ): Promise<VendorDetailResponse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const vendor: VendorDetailResponse = {
      id,
      vendorCode: "VND-TEST-1",
      businessName: input.body.businessName,
      ownerName: input.body.ownerName,
      phoneE164: input.body.phoneE164,
      city: input.body.city,
      state: input.body.state,
      verificationStatus: "pending",
      activeStatus: "active",
      ratingAverage: "0",
      ratingCount: 0,
      categories: input.body.categoryCodes.map((code, index) => ({
        id: randomUUID(),
        code,
        displayName: code,
        isPrimary: index === 0,
      })),
      bankAccounts: [],
      contacts: [],
      documents: [],
      createdAt: now,
      updatedAt: now,
    };
    this.vendors.set(id, vendor);
    if (input.body.ownerUserId !== undefined) {
      this.members.set(input.body.ownerUserId, id);
    }
    this.patternB.appendModuleTimelineAndActivity("vendor", id, {
      entryType: "created",
      title: "Vendor created",
      activityType: "created",
      content: input.body.businessName,
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "vendor",
      entityId: id,
      action: "vendor.created",
      outboxTopic: "vendor.created",
    });
    return vendor;
  }

  public async updateVendor(
    input: VendorMutationContext & {
      readonly vendorId: string;
      readonly body: UpdateVendorRequest;
    },
  ): Promise<VendorDetailResponse | undefined> {
    const current = this.vendors.get(input.vendorId);
    if (current === undefined) return undefined;
    const updated: VendorDetailResponse = {
      ...current,
      businessName: input.body.businessName ?? current.businessName,
      updatedAt: new Date().toISOString(),
    };
    this.vendors.set(input.vendorId, updated);
    this.patternB.appendModuleTimelineAndActivity("vendor", input.vendorId, {
      entryType: "updated",
      title: "Vendor updated",
      activityType: "updated",
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "vendor",
      entityId: input.vendorId,
      action: "vendor.updated",
      outboxTopic: "vendor.updated",
    });
    return updated;
  }

  public async assignVendor(
    input: VendorMutationContext & { readonly body: AssignVendorRequest },
  ): Promise<VendorAssignmentSummary | undefined> {
    const vendor = this.vendors.get(input.body.vendorId);
    if (vendor === undefined) return undefined;
    const id = randomUUID();
    const now = new Date().toISOString();
    const timelineEntry = this.patternB.appendTimeline(
      input.body.eventRecordId,
      {
        entryType: "vendor_assigned",
        title: "Vendor assigned",
        content: `${vendor.businessName} assigned to event`,
        customerVisible: true,
        actorUserId: input.actorUserId,
      },
    );
    this.patternB.appendActivity(input.body.eventRecordId, {
      activityType: "vendor_assignment",
      content: `Vendor assigned: ${vendor.businessName}`,
      customerVisible: true,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendModuleTimelineAndActivity(
      "vendor",
      input.body.vendorId,
      {
        entryType: "vendor_assigned",
        title: "Vendor assigned",
        activityType: "vendor_assignment",
        content: `${vendor.businessName} assigned to event`,
        customerVisible: true,
        actorUserId: input.actorUserId,
      },
    );
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: input.body.eventRecordId,
      action: "vendor.assigned",
      outboxTopic: "vendor.assigned",
    });
    const detail: VendorAssignmentDetailResponse = {
      id,
      eventRecordId: input.body.eventRecordId,
      vendorId: input.body.vendorId,
      status: input.body.status,
      assignedAt: now,
      version: 1,
      vendorBusinessName: vendor.businessName,
      eventNumber: "EV-TEST",
      history: [
        {
          id: randomUUID(),
          assignmentId: id,
          changeType: "created",
          summary: "Vendor assigned",
          occurredAt: now,
        },
      ],
      notes: [],
      timeline: [timelineEntry],
    };
    this.assignments.set(id, detail);
    return detail;
  }

  public async updateAssignment(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: UpdateVendorAssignmentRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined> {
    const current = this.assignments.get(input.assignmentId);
    if (current === undefined) return undefined;
    const nextStatus = input.body.status ?? current.status;
    const entryType =
      nextStatus === "completed" ? "vendor_completed" : "vendor_assigned";
    const action =
      nextStatus === "completed" ? "vendor.completed" : "vendor.updated";
    const outboxTopic =
      nextStatus === "completed" ? "vendor.completed" : "vendor.updated";
    return this.mutateAssignment(input, {
      status: nextStatus,
      entryType,
      title: `Vendor ${nextStatus.replaceAll("_", " ")}`,
      activityType: "vendor_assignment",
      action,
      outboxTopic,
    });
  }

  public async acceptAssignment(
    input: VendorMutationContext & { readonly assignmentId: string },
  ): Promise<VendorAssignmentSummary | undefined> {
    return this.mutateAssignment(input, {
      status: "accepted",
      entryType: "vendor_accepted",
      title: "Vendor accepted assignment",
      customerVisible: true,
      activityType: "vendor_assignment",
      action: "vendor.accepted",
      outboxTopic: "vendor.accepted",
    });
  }

  public async rejectAssignment(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: RejectVendorAssignmentRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined> {
    return this.mutateAssignment(input, {
      status: "rejected",
      rejectionReason: input.body.reason,
      entryType: "vendor_rejected",
      title: "Vendor rejected assignment",
      content: input.body.reason,
      activityType: "vendor_assignment",
      action: "vendor.rejected",
      outboxTopic: "vendor.rejected",
    });
  }

  public async updateProgress(
    input: VendorMutationContext & {
      readonly assignmentId: string;
      readonly body: VendorProgressUpdateRequest;
    },
  ): Promise<VendorAssignmentSummary | undefined> {
    const current = this.assignments.get(input.assignmentId);
    if (current === undefined) return undefined;
    const timelineEntry = this.patternB.appendTimeline(current.eventRecordId, {
      entryType: "vendor_progress_updated",
      title: "Vendor progress updated",
      content: input.body.summary,
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.appendActivity(current.eventRecordId, {
      activityType: "vendor_progress",
      content: input.body.summary,
      customerVisible: false,
      actorUserId: input.actorUserId,
    });
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "event_record",
      entityId: current.eventRecordId,
      action: "vendor.progress_updated",
      outboxTopic: "vendor.progress_updated",
    });
    const updated: VendorAssignmentDetailResponse = {
      ...current,
      status: input.body.status ?? current.status,
      latestProgressSummary: input.body.summary,
      version: current.version + 1,
      timeline: [timelineEntry, ...current.timeline],
    };
    this.assignments.set(input.assignmentId, updated);
    return updated;
  }

  public async listAssignments(filters?: {
    readonly vendorId?: string;
    readonly eventRecordId?: string;
    readonly branchId?: string;
  }): Promise<readonly VendorAssignmentSummary[]> {
    return [...this.assignments.values()].filter((item) => {
      if (
        filters?.branchId !== undefined &&
        filters.branchId !== "00000000-0000-4000-8000-000000000001"
      ) {
        return false;
      }
      if (
        filters?.vendorId !== undefined &&
        item.vendorId !== filters.vendorId
      ) {
        return false;
      }
      if (
        filters?.eventRecordId !== undefined &&
        item.eventRecordId !== filters.eventRecordId
      ) {
        return false;
      }
      return true;
    });
  }

  public async getAssignment(
    assignmentId: string,
    branchId?: string,
  ): Promise<VendorAssignmentDetailResponse | undefined> {
    if (
      branchId !== undefined &&
      branchId !== "00000000-0000-4000-8000-000000000001"
    ) {
      return undefined;
    }
    return this.assignments.get(assignmentId);
  }

  public async addNote(
    input: VendorMutationContext & {
      readonly vendorId: string;
      readonly body: AddVendorNoteRequest;
    },
  ): Promise<VendorNoteSummary | undefined> {
    if (!this.vendors.has(input.vendorId)) return undefined;
    return {
      id: randomUUID(),
      vendorId: input.vendorId,
      noteType: input.body.noteType,
      content: input.body.content,
      createdAt: new Date().toISOString(),
      createdByUserId: input.actorUserId,
    };
  }

  public async getCrmDashboard(
    _branchId: string,
  ): Promise<VendorDashboardResponse> {
    const assignments = [...this.assignments.values()];
    return {
      totalVendors: this.vendors.size,
      activeAssignments: assignments.filter(
        (a) => !["completed", "cancelled", "rejected"].includes(a.status),
      ).length,
      pendingAcceptances: assignments.filter(
        (a) => a.status === "assigned" || a.status === "invited",
      ).length,
      completedAssignments: assignments.filter((a) => a.status === "completed")
        .length,
      vendors: (await this.listVendors({ branchId: _branchId })).items,
      openAssignments: assignments,
    };
  }

  public async getVendorDashboard(
    userId: string,
  ): Promise<VendorDashboardResponse> {
    const vendorId = this.members.get(userId);
    if (vendorId === undefined) {
      return {
        totalVendors: 0,
        activeAssignments: 0,
        pendingAcceptances: 0,
        completedAssignments: 0,
        vendors: [],
        openAssignments: [],
      };
    }
    return this.getCrmDashboard("branch-1");
  }

  public async findVendorIdForUser(
    userId: string,
  ): Promise<string | undefined> {
    return this.members.get(userId);
  }

  public async isVendorMember(
    vendorId: string,
    userId: string,
  ): Promise<boolean> {
    return this.members.get(userId) === vendorId;
  }
}

function toSummary(detail: VendorDetailResponse): VendorSummary {
  return {
    id: detail.id,
    vendorCode: detail.vendorCode,
    businessName: detail.businessName,
    ownerName: detail.ownerName,
    phoneE164: detail.phoneE164,
    city: detail.city,
    state: detail.state,
    verificationStatus: detail.verificationStatus,
    activeStatus: detail.activeStatus,
    ratingAverage: detail.ratingAverage,
    ratingCount: detail.ratingCount,
    categories: detail.categories,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    ...(detail.email === undefined ? {} : { email: detail.email }),
  };
}

const employee: AuthenticatedPrincipal = {
  userId: "employee-1",
  sessionId: "s1",
  activeRole: "employee",
  roleAssignments: [{ role: "employee", active: true }],
};

const vendorOwner: AuthenticatedPrincipal = {
  userId: "vendor-owner-1",
  sessionId: "s2",
  activeRole: "vendor_owner",
  roleAssignments: [{ role: "vendor_owner", active: true }],
};

describe("Vendor Management Foundation", () => {
  let repo: FakeVendorRepository;
  let service: VendorService;

  beforeEach(() => {
    repo = new FakeVendorRepository();
    service = new VendorService(repo);
  });

  it("creates a vendor and assigns it to an event", async () => {
    const eventRecordId = randomUUID();
    const vendor = await service.create(employee, {
      businessName: "Decor Co",
      ownerName: "Owner",
      phoneE164: "+919000000003",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: vendorOwner.userId,
    });
    const assignment = await service.assign(employee, {
      vendorId: vendor.id,
      eventRecordId,
      status: "assigned",
    });
    const detail = await service.getAssignment(employee, assignment.id);

    expect(vendor.businessName).toBe("Decor Co");
    expect(assignment.status).toBe("assigned");
    expect(detail.timeline.some((e) => e.entryType === "vendor_assigned")).toBe(
      true,
    );
    expect(repo.patternB.timelineTypes(eventRecordId)).toContain(
      "vendor_assigned",
    );
    expect(repo.patternB.activityTypes(eventRecordId)).toContain(
      "vendor_assignment",
    );
    expect(repo.patternB.outboxTopics()).toContain("vendor.assigned");
    expect(repo.patternB.outboxTopics()).toContain("vendor.created");
    expect(repo.patternB.auditActions()).toContain("vendor.assigned");
    expect(repo.patternB.audits.some((a) => a.actorUserId && a.requestId)).toBe(
      true,
    );
    expect(repo.patternB.moduleTimelineTypes("vendor", vendor.id)).toContain(
      "created",
    );
    expect(repo.patternB.moduleTimelineTypes("vendor", vendor.id)).toContain(
      "vendor_assigned",
    );
    expect(repo.patternB.moduleActivityTypes("vendor", vendor.id)).toContain(
      "vendor_assignment",
    );
  });

  it("lets the vendor accept and post progress", async () => {
    const eventRecordId = randomUUID();
    const vendor = await service.create(employee, {
      businessName: "Decor Co",
      ownerName: "Owner",
      phoneE164: "+919000000003",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: vendorOwner.userId,
    });
    const created = await service.assign(employee, {
      vendorId: vendor.id,
      eventRecordId,
      status: "assigned",
    });

    const accepted = await service.accept(vendorOwner, created.id);
    const progressed = await service.progress(vendorOwner, created.id, {
      summary: "Setup 60% done",
      status: "working",
    });

    expect(accepted.status).toBe("accepted");
    expect(progressed.latestProgressSummary).toBe("Setup 60% done");
    expect(progressed.status).toBe("working");
    expect(repo.patternB.timelineTypes(eventRecordId)).toContain(
      "vendor_accepted",
    );
    expect(repo.patternB.timelineTypes(eventRecordId)).toContain(
      "vendor_progress_updated",
    );
    expect(repo.patternB.activityTypes(eventRecordId)).toContain(
      "vendor_progress",
    );
    expect(repo.patternB.outboxTopics()).toContain("vendor.accepted");
    expect(repo.patternB.outboxTopics()).toContain("vendor.progress_updated");
    expect(repo.patternB.auditActions()).toContain("vendor.accepted");
    expect(repo.patternB.auditActions()).toContain("vendor.progress_updated");
  });

  it("builds CRM dashboard counts", async () => {
    const vendor = await service.create(employee, {
      businessName: "Decor Co",
      ownerName: "Owner",
      phoneE164: "+919000000003",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
    });
    await service.assign(employee, {
      vendorId: vendor.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });

    const dashboard = await service.getCrmDashboard(employee);
    expect(dashboard.totalVendors).toBe(1);
    expect(dashboard.pendingAcceptances).toBe(1);
  });

  it("denies other-branch vendor assignment detail as 404", async () => {
    const vendor = await service.create(employee, {
      businessName: "Decor Co",
      ownerName: "Owner",
      phoneE164: "+919000000003",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
    });
    const assignment = await service.assign(employee, {
      vendorId: vendor.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const other: AuthenticatedPrincipal = {
      ...employee,
      userId: "other-branch",
      branchId: "00000000-0000-4000-8000-000000000002",
    };
    await expect(
      service.getAssignment(employee, assignment.id),
    ).resolves.toMatchObject({ id: assignment.id });
    await expect(
      service.getAssignment(other, assignment.id),
    ).rejects.toMatchObject({
      code: "VENDOR_ASSIGNMENT_NOT_FOUND",
      status: 404,
    });
    await expect(service.get(other, vendor.id)).rejects.toMatchObject({
      code: "VENDOR_NOT_FOUND",
      status: 404,
    });
  });
});
