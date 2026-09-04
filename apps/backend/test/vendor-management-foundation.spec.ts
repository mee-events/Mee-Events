import {
  Controller,
  Get,
  Module,
  VersioningType,
  type INestApplication,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AddVendorNoteRequest,
  AddVendorSelfNoteRequest,
  AssignVendorRequest,
  CreateVendorRequest,
  EventActivitySummary,
  EventTimelineEntry,
  RejectVendorAssignmentRequest,
  UpdateVendorAssignmentRequest,
  UpdateVendorRequest,
  VendorAssignmentDetailResponse,
  VendorAssignmentHistoryEntry,
  VendorAssignmentSummary,
  VendorDashboardResponse,
  VendorDetailResponse,
  VendorNoteSummary,
  VendorProgressUpdateRequest,
  VendorSummary,
} from "@me-event/api-contracts";
import { REQUIRED_CAPABILITY_KEY } from "../src/modules/authorization/capability.decorator";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import type { AuthenticatedPlatformRequest } from "../src/modules/platform-foundation/security/access-token.guard";
import { VendorService } from "../src/modules/vendors/application/vendor.service";
import { CrmVendorController } from "../src/modules/vendors/presentation/crm-vendor.controller";
import { VendorController } from "../src/modules/vendors/presentation/vendor.controller";
import {
  type VendorMutationContext,
  type VendorRepository,
} from "../src/modules/vendors/ports/vendor-repository";
import { PatternBSideEffects } from "./helpers/pattern-b-side-effects";

class FakeVendorRepository implements VendorRepository {
  public vendors = new Map<string, VendorDetailResponse>();
  public assignments = new Map<string, VendorAssignmentDetailResponse>();
  public notes = new Map<string, VendorNoteSummary>();
  public members = new Map<string, Set<string>>(); // userId -> vendorIds
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
      this.addMember(input.body.ownerUserId, id);
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
    if (
      input.branchId !== "00000000-0000-4000-8000-000000000001" ||
      !this.vendors.has(input.vendorId)
    ) {
      return undefined;
    }
    const assignment =
      input.body.assignmentId === undefined
        ? undefined
        : this.assignments.get(input.body.assignmentId);
    const relationship =
      assignment ??
      (input.body.eventRecordId === undefined
        ? undefined
        : [...this.assignments.values()].find(
            (candidate) =>
              candidate.vendorId === input.vendorId &&
              candidate.eventRecordId === input.body.eventRecordId,
          ));
    if (
      (input.body.assignmentId !== undefined &&
        (assignment === undefined || assignment.vendorId !== input.vendorId)) ||
      (input.body.eventRecordId !== undefined &&
        (relationship === undefined ||
          relationship.vendorId !== input.vendorId ||
          relationship.eventRecordId !== input.body.eventRecordId))
    ) {
      return undefined;
    }

    const note: VendorNoteSummary = {
      id: randomUUID(),
      vendorId: input.vendorId,
      noteType: input.body.noteType,
      content: input.body.content,
      createdAt: new Date().toISOString(),
      createdByUserId: input.actorUserId,
      ...(input.body.assignmentId === undefined
        ? {}
        : { assignmentId: input.body.assignmentId }),
      ...(input.body.eventRecordId === undefined
        ? {}
        : { eventRecordId: input.body.eventRecordId }),
    };
    this.notes.set(note.id, note);

    if (assignment !== undefined) {
      const history: VendorAssignmentHistoryEntry = {
        id: randomUUID(),
        assignmentId: assignment.id,
        changeType: "note_added",
        summary: input.body.content.slice(0, 200),
        actorUserId: input.actorUserId,
        occurredAt: new Date().toISOString(),
      };
      this.assignments.set(assignment.id, {
        ...assignment,
        history: [history, ...assignment.history],
        notes: [note, ...assignment.notes],
      });
    }
    if (input.body.eventRecordId !== undefined) {
      this.patternB.appendTimeline(input.body.eventRecordId, {
        entryType: "vendor_note_added",
        title: "Vendor note added",
        content: input.body.content,
        customerVisible: false,
        actorUserId: input.actorUserId,
      });
      this.patternB.appendActivity(input.body.eventRecordId, {
        activityType: "vendor_note",
        content: input.body.content,
        customerVisible: false,
        actorUserId: input.actorUserId,
      });
      this.patternB.appendModuleTimelineAndActivity("vendor", input.vendorId, {
        entryType: "vendor_note_added",
        title: "Vendor note added",
        activityType: "vendor_note",
        content: input.body.content,
        customerVisible: false,
        actorUserId: input.actorUserId,
      });
    }
    this.patternB.writeAuditOutbox({
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      entityType: "vendor",
      entityId: input.vendorId,
      action: "vendor.note_added",
      outboxTopic: "vendor.note_added",
    });
    return note;
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
    const vendorIds = await this.findVendorIdsForUser(userId);
    if (vendorIds.length === 0) {
      return {
        totalVendors: 0,
        activeAssignments: 0,
        pendingAcceptances: 0,
        completedAssignments: 0,
        vendors: [],
        openAssignments: [],
      };
    }
    const vendors = vendorIds
      .map((vendorId) => this.vendors.get(vendorId))
      .filter((vendor): vendor is VendorDetailResponse => vendor !== undefined);
    const assignments = [...this.assignments.values()].filter((assignment) =>
      vendorIds.includes(assignment.vendorId),
    );
    return {
      totalVendors: vendors.length,
      activeAssignments: assignments.filter(
        (assignment) =>
          !["completed", "cancelled", "rejected"].includes(assignment.status),
      ).length,
      pendingAcceptances: assignments.filter(
        (assignment) =>
          assignment.status === "assigned" || assignment.status === "invited",
      ).length,
      completedAssignments: assignments.filter(
        (assignment) => assignment.status === "completed",
      ).length,
      vendors,
      openAssignments: assignments,
    };
  }

  public async findVendorIdsForUser(
    userId: string,
  ): Promise<readonly string[]> {
    return [...(this.members.get(userId) ?? [])];
  }

  public async findVendorIdForUser(
    userId: string,
  ): Promise<string | undefined> {
    return (await this.findVendorIdsForUser(userId))[0];
  }

  public async isVendorMember(
    vendorId: string,
    userId: string,
  ): Promise<boolean> {
    return this.members.get(userId)?.has(vendorId) === true;
  }

  public addMember(userId: string, vendorId: string): void {
    const vendorIds = this.members.get(userId) ?? new Set<string>();
    vendorIds.add(vendorId);
    this.members.set(userId, vendorIds);
  }
}

let vendorHttpService: VendorService;
let vendorHttpPrincipal: AuthenticatedPrincipal;

@Controller("vendors")
class VendorDashboardHttpController {
  @Get("me/dashboard")
  public dashboard(): Promise<VendorDashboardResponse> {
    return vendorHttpService.getOwnDashboard(vendorHttpPrincipal);
  }
}

@Module({
  controllers: [VendorDashboardHttpController],
})
class VendorHttpTestModule {}

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
  roleAssignments: [
    {
      role: "employee",
      active: true,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
  ],
};

const vendorOwner: AuthenticatedPrincipal = {
  userId: "vendor-owner-1",
  sessionId: "s2",
  activeRole: "vendor_owner",
  roleAssignments: [
    {
      role: "vendor_owner",
      active: true,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
  ],
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

  it("serializes the vendor-self dashboard with only VendorSummary fields", async () => {
    const userId = "summary-owner";
    const created = await service.create(employee, {
      businessName: "Summary Safe Vendor",
      ownerName: "Summary Owner",
      phoneE164: "+919000000020",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: userId,
    });
    repo.vendors.set(created.id, {
      ...created,
      email: "owner@example.test",
      gstNumber: "36ABCDE1234F1Z5",
      panNumber: "ABCDE1234F",
      upiId: "private@upi",
      notes: "Internal CRM note",
      addressLine: "Private address",
      pincode: "500001",
      bankAccounts: [
        {
          id: randomUUID(),
          accountHolderName: "Private Account",
          bankName: "Private Bank",
          accountNumberMasked: "XXXX1234",
          ifscCode: "TEST0000001",
          isPrimary: true,
        },
      ],
      contacts: [
        {
          id: randomUUID(),
          contactName: "Private Contact",
          phoneE164: "+919000000021",
          isPrimary: true,
        },
      ],
      documents: [
        {
          id: randomUUID(),
          docType: "gst",
          status: "verified",
          fileName: "private.pdf",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const principal = vendorPrincipal(userId, [created.id]);
    vendorHttpService = service;
    vendorHttpPrincipal = principal;
    let app: INestApplication | undefined;
    try {
      app = await NestFactory.create(VendorHttpTestModule, { logger: false });
      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: "1",
      });
      app.setGlobalPrefix("api");
      await app.listen(0, "127.0.0.1");

      const response = await fetch(
        `${await app.getUrl()}/api/v1/vendors/me/dashboard`,
      );
      const body = (await response.json()) as {
        readonly vendors?: readonly Record<string, unknown>[];
      };
      expect(response.status).toBe(200);
      expect(Object.keys(body.vendors?.[0] ?? {}).sort()).toEqual(
        [
          "activeStatus",
          "businessName",
          "categories",
          "city",
          "createdAt",
          "email",
          "id",
          "ownerName",
          "phoneE164",
          "ratingAverage",
          "ratingCount",
          "state",
          "updatedAt",
          "vendorCode",
          "verificationStatus",
        ].sort(),
      );
      for (const privateField of [
        "gstNumber",
        "panNumber",
        "upiId",
        "notes",
        "bankAccounts",
        "contacts",
        "documents",
        "addressLine",
        "pincode",
      ]) {
        expect(body.vendors?.[0]).not.toHaveProperty(privateField);
      }
    } finally {
      await app?.close();
    }
  });

  it("keeps CRM and vendor-self note trust paths capability-protected", () => {
    const reflector = new Reflector();
    expect(
      reflector.get(
        REQUIRED_CAPABILITY_KEY,
        CrmVendorController.prototype.addNote,
      ),
    ).toBe("crm_vendor.manage");
    expect(
      reflector.get(
        REQUIRED_CAPABILITY_KEY,
        VendorController.prototype.addNote,
      ),
    ).toBe("vendor_own.update");
  });

  it("routes CRM and vendor-self controllers to their explicit trust paths", async () => {
    const userId = "controller-note-owner";
    const vendor = await service.create(employee, {
      businessName: "Controller Note Vendor",
      ownerName: "Controller Owner",
      phoneE164: "+919000000026",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: userId,
    });
    const crmBody: AddVendorNoteRequest = {
      noteType: "internal",
      content: "CRM controller note",
    };
    const crmRequest = {
      user: employee,
      id: "crm-controller-note-request",
    } as AuthenticatedPlatformRequest;
    const crmSpy = vi.spyOn(service, "addCrmNote");
    await new CrmVendorController(service).addNote(
      vendor.id,
      crmBody,
      crmRequest,
    );
    expect(crmSpy).toHaveBeenCalledWith(
      employee,
      vendor.id,
      crmBody,
      "crm-controller-note-request",
    );

    const owner = vendorPrincipal(userId, [vendor.id]);
    const selfBody: AddVendorSelfNoteRequest = {
      vendorId: vendor.id,
      noteType: "vendor",
      content: "Vendor controller note",
    };
    const selfRequest = {
      user: owner,
      id: "self-controller-note-request",
    } as AuthenticatedPlatformRequest;
    const selfSpy = vi.spyOn(service, "addOwnNote");
    const dashboardSpy = vi.spyOn(service, "getOwnDashboard");
    await new VendorController(service).addNote(selfBody, selfRequest);
    expect(selfSpy).toHaveBeenCalledWith(
      owner,
      selfBody,
      "self-controller-note-request",
    );
    expect(dashboardSpy).not.toHaveBeenCalled();
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

  it("keeps vendor membership authoritative across vendor resources", async () => {
    const ownVendor = await service.create(employee, {
      businessName: "Owned Decor Co",
      ownerName: "Owner",
      phoneE164: "+919000000003",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: vendorOwner.userId,
    });
    const otherVendor = await service.create(employee, {
      businessName: "Other Decor Co",
      ownerName: "Other Owner",
      phoneE164: "+919000000004",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
    });
    const ownAssignment = await service.assign(employee, {
      vendorId: ownVendor.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const otherAssignment = await service.assign(employee, {
      vendorId: otherVendor.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });

    await expect(
      service.getOwnAssignment(vendorOwner, ownAssignment.id),
    ).resolves.toMatchObject({ id: ownAssignment.id });
    await expect(
      service.getOwnAssignment(vendorOwner, otherAssignment.id),
    ).rejects.toMatchObject({
      code: "VENDOR_RESOURCE_FORBIDDEN",
      status: 403,
    });
  });

  it("separates CRM and vendor-self note authorization without weakening either", async () => {
    const ownerUserId = "note-owner";
    const vendorA = await service.create(employee, {
      businessName: "Note Vendor A",
      ownerName: "Owner A",
      phoneE164: "+919000000022",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId,
    });
    const vendorB = await service.create(employee, {
      businessName: "Note Vendor B",
      ownerName: "Owner B",
      phoneE164: "+919000000023",
      categoryCodes: ["catering"],
      city: "Hyderabad",
      state: "Telangana",
    });
    const eventA = randomUUID();
    const eventB = randomUUID();
    const assignmentA = await service.assign(employee, {
      vendorId: vendorA.id,
      eventRecordId: eventA,
      status: "assigned",
    });
    const assignmentB = await service.assign(employee, {
      vendorId: vendorB.id,
      eventRecordId: eventB,
      status: "assigned",
    });
    const owner = vendorPrincipal(ownerUserId, [vendorA.id]);

    await expect(
      service.addCrmNote(employee, vendorA.id, {
        noteType: "internal",
        content: "CRM relationship is valid",
        assignmentId: assignmentA.id,
        eventRecordId: eventA,
      }),
    ).resolves.toMatchObject({ vendorId: vendorA.id });
    await expect(
      service.addCrmNote(
        {
          ...employee,
          userId: "other-branch-employee",
          branchId: "00000000-0000-4000-8000-000000000002",
        },
        vendorA.id,
        { noteType: "internal", content: "Wrong branch" },
      ),
    ).rejects.toMatchObject({
      code: "VENDOR_NOTE_TARGET_NOT_FOUND",
      status: 404,
    });
    await expect(
      service.addOwnNote(owner, {
        vendorId: vendorA.id,
        noteType: "vendor",
        content: "Vendor relationship is valid",
        assignmentId: assignmentA.id,
        eventRecordId: eventA,
      }),
    ).resolves.toMatchObject({ vendorId: vendorA.id });
    await expect(
      service.addOwnNote(owner, {
        vendorId: vendorB.id,
        noteType: "vendor",
        content: "Other vendor denied",
      }),
    ).rejects.toMatchObject({
      code: "VENDOR_RESOURCE_FORBIDDEN",
      status: 403,
    });

    await expect(
      service.addCrmNote(employee, vendorA.id, {
        noteType: "internal",
        content: "CRM cross-vendor link denied",
        assignmentId: assignmentB.id,
      }),
    ).rejects.toMatchObject({ code: "VENDOR_NOTE_TARGET_NOT_FOUND" });
    await expect(
      service.addOwnNote(owner, {
        vendorId: vendorA.id,
        noteType: "vendor",
        content: "Self cross-event link denied",
        eventRecordId: eventB,
      }),
    ).rejects.toMatchObject({ code: "VENDOR_NOTE_TARGET_NOT_FOUND" });
  });

  it("validates assignment, event, and vendor as one relationship before side effects", async () => {
    const ownerUserId = "link-owner";
    const vendorA = await service.create(employee, {
      businessName: "Link Vendor A",
      ownerName: "Owner A",
      phoneE164: "+919000000024",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId,
    });
    const vendorB = await service.create(employee, {
      businessName: "Link Vendor B",
      ownerName: "Owner B",
      phoneE164: "+919000000025",
      categoryCodes: ["catering"],
      city: "Hyderabad",
      state: "Telangana",
    });
    const eventA = randomUUID();
    const eventB = randomUUID();
    const assignmentA = await service.assign(employee, {
      vendorId: vendorA.id,
      eventRecordId: eventA,
      status: "assigned",
    });
    const assignmentB = await service.assign(employee, {
      vendorId: vendorB.id,
      eventRecordId: eventB,
      status: "assigned",
    });

    await expect(
      service.addCrmNote(employee, vendorA.id, {
        noteType: "internal",
        content: "Valid linked note",
        assignmentId: assignmentA.id,
        eventRecordId: eventA,
      }),
    ).resolves.toMatchObject({
      vendorId: vendorA.id,
      assignmentId: assignmentA.id,
      eventRecordId: eventA,
    });
    await expect(
      service.addCrmNote(employee, vendorA.id, {
        noteType: "internal",
        content: "Valid event-only link",
        eventRecordId: eventA,
      }),
    ).resolves.toMatchObject({ vendorId: vendorA.id, eventRecordId: eventA });

    const invalidBodies: readonly AddVendorNoteRequest[] = [
      {
        noteType: "internal",
        content: "Vendor B assignment",
        assignmentId: assignmentB.id,
      },
      {
        noteType: "internal",
        content: "Vendor B event",
        eventRecordId: eventB,
      },
      {
        noteType: "internal",
        content: "Mismatched assignment and event",
        assignmentId: assignmentA.id,
        eventRecordId: eventB,
      },
      {
        noteType: "internal",
        content: "Missing assignment",
        assignmentId: randomUUID(),
      },
      {
        noteType: "internal",
        content: "Missing event",
        eventRecordId: randomUUID(),
      },
    ];
    for (const body of invalidBodies) {
      const before = noteSideEffectSnapshot(repo);
      await expect(
        service.addCrmNote(employee, vendorA.id, body),
      ).rejects.toMatchObject({
        code: "VENDOR_NOTE_TARGET_NOT_FOUND",
        status: 404,
      });
      expect(noteSideEffectSnapshot(repo)).toEqual(before);
    }
  });

  it("requires a matching vendor grant and membership on every self path", async () => {
    const ownerUserId = "vendor-intersection-owner";
    const owned = await service.create(employee, {
      businessName: "Intersection Decor",
      ownerName: "Owner",
      phoneE164: "+919000000011",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId,
    });
    const principal = vendorPrincipal(ownerUserId, [owned.id]);
    const acceptedAssignment = await service.assign(employee, {
      vendorId: owned.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const rejectedAssignment = await service.assign(employee, {
      vendorId: owned.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });

    await expect(service.getOwnDashboard(principal)).resolves.toMatchObject({
      totalVendors: 1,
    });
    const ownAssignments = await service.listOwnAssignments(principal);
    expect(ownAssignments.assignments.map(({ id }) => id)).toContain(
      acceptedAssignment.id,
    );
    await expect(
      service.getOwnAssignment(principal, acceptedAssignment.id),
    ).resolves.toMatchObject({ id: acceptedAssignment.id });
    await expect(
      service.accept(principal, acceptedAssignment.id),
    ).resolves.toMatchObject({ status: "accepted" });
    await expect(
      service.progress(principal, acceptedAssignment.id, {
        summary: "Authorized progress",
        status: "working",
      }),
    ).resolves.toMatchObject({ status: "working" });
    await expect(
      service.reject(principal, rejectedAssignment.id, {
        reason: "Authorized rejection",
      }),
    ).resolves.toMatchObject({ status: "rejected" });
    await expect(
      service.addOwnNote(principal, {
        vendorId: owned.id,
        noteType: "vendor",
        content: "Authorized note",
      }),
    ).resolves.toMatchObject({ vendorId: owned.id });
  });

  it("never combines a Vendor A grant with Vendor B membership", async () => {
    const vendorA = await service.create(employee, {
      businessName: "Grant A",
      ownerName: "Owner A",
      phoneE164: "+919000000012",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
    });
    const userId = "cross-vendor-user";
    const vendorB = await service.create(employee, {
      businessName: "Member B",
      ownerName: "Owner B",
      phoneE164: "+919000000013",
      categoryCodes: ["catering"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: userId,
    });
    const assignmentB = await service.assign(employee, {
      vendorId: vendorB.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const grantA = vendorPrincipal(userId, [vendorA.id]);

    await expect(service.getOwnDashboard(grantA)).rejects.toMatchObject({
      code: "VENDOR_RESOURCE_FORBIDDEN",
      status: 403,
    });
    await expect(service.listOwnAssignments(grantA)).rejects.toMatchObject({
      code: "VENDOR_RESOURCE_FORBIDDEN",
      status: 403,
    });
    await expect(
      service.getOwnAssignment(grantA, assignmentB.id),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
    await expect(service.accept(grantA, assignmentB.id)).rejects.toMatchObject({
      code: "VENDOR_RESOURCE_FORBIDDEN",
      status: 403,
    });
    await expect(
      service.reject(grantA, assignmentB.id, { reason: "must fail" }),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
    await expect(
      service.progress(grantA, assignmentB.id, {
        summary: "must fail",
        status: "working",
      }),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
    await expect(
      service.addOwnNote(grantA, {
        vendorId: vendorB.id,
        noteType: "vendor",
        content: "must fail",
      }),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
  });

  it("rejects a matching grant without membership and membership without a grant", async () => {
    const vendor = await service.create(employee, {
      businessName: "Two Factors",
      ownerName: "Owner",
      phoneE164: "+919000000014",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
    });
    const assignment = await service.assign(employee, {
      vendorId: vendor.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const grantOnly = vendorPrincipal("grant-only", [vendor.id]);
    const membershipOnly: AuthenticatedPrincipal = {
      userId: "membership-only",
      sessionId: "membership-only-session",
      activeRole: "customer",
      roleAssignments: [
        {
          role: "customer",
          active: true,
          scopeType: "branch",
          scopeId: "00000000-0000-4000-8000-000000000001",
        },
      ],
    };
    repo.addMember(membershipOnly.userId, vendor.id);

    await expect(
      service.getOwnAssignment(grantOnly, assignment.id),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
    await expect(
      service.getOwnAssignment(membershipOnly, assignment.id),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
  });

  it("supports multiple legitimate vendor grants without widening either one", async () => {
    const userId = "multi-vendor-owner";
    const vendorA = await service.create(employee, {
      businessName: "Multi A",
      ownerName: "Owner",
      phoneE164: "+919000000015",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: userId,
    });
    const vendorB = await service.create(employee, {
      businessName: "Multi B",
      ownerName: "Owner",
      phoneE164: "+919000000016",
      categoryCodes: ["catering"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: userId,
    });
    const assignmentA = await service.assign(employee, {
      vendorId: vendorA.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const assignmentB = await service.assign(employee, {
      vendorId: vendorB.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const principal = vendorPrincipal(userId, [vendorA.id, vendorB.id]);

    await expect(service.getOwnDashboard(principal)).resolves.toMatchObject({
      totalVendors: 2,
    });
    const listed = await service.listOwnAssignments(principal);
    expect(listed.assignments.map(({ id }) => id).sort()).toEqual(
      [assignmentA.id, assignmentB.id].sort(),
    );
    await expect(
      service.getOwnAssignment(principal, assignmentB.id),
    ).resolves.toMatchObject({ id: assignmentB.id });
  });

  describe("vendor-self note selection", () => {
    it("infers the vendor only when exactly one authorized vendor exists", async () => {
      const userId = "single-note-vendor-owner";
      const vendor = await service.create(employee, {
        businessName: "Single Note Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000076",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId: userId,
      });
      const principal = vendorPrincipal(userId, [vendor.id]);

      await expect(
        service.addOwnNote(principal, { content: "Safely inferred vendor" }),
      ).resolves.toMatchObject({
        vendorId: vendor.id,
        noteType: "vendor",
      });
    });

    it("requires vendorId when more than one authorized vendor exists without writing a note", async () => {
      const userId = "ambiguous-note-vendor-owner";
      const vendorA = await service.create(employee, {
        businessName: "Ambiguous Note Vendor A",
        ownerName: "Owner",
        phoneE164: "+919000000077",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId: userId,
      });
      const vendorB = await service.create(employee, {
        businessName: "Ambiguous Note Vendor B",
        ownerName: "Owner",
        phoneE164: "+919000000078",
        categoryCodes: ["catering"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId: userId,
      });
      const principal = vendorPrincipal(userId, [vendorA.id, vendorB.id]);
      const notesBefore = repo.notes.size;

      await expect(
        service.addOwnNote(principal, { content: "Ambiguous vendor note" }),
      ).rejects.toMatchObject({
        code: "VENDOR_SELECTION_REQUIRED",
        status: 400,
      });
      expect(repo.notes.size).toBe(notesBefore);
    });

    it("supports explicit selection of each authorized vendor", async () => {
      const userId = "explicit-note-vendor-owner";
      const vendorA = await service.create(employee, {
        businessName: "Explicit Note Vendor A",
        ownerName: "Owner",
        phoneE164: "+919000000079",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId: userId,
      });
      const vendorB = await service.create(employee, {
        businessName: "Explicit Note Vendor B",
        ownerName: "Owner",
        phoneE164: "+919000000080",
        categoryCodes: ["catering"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId: userId,
      });
      const principal = vendorPrincipal(userId, [vendorA.id, vendorB.id]);

      const noteA = await service.addOwnNote(principal, {
        vendorId: vendorA.id,
        content: "Explicit vendor A note",
      });
      const noteB = await service.addOwnNote(principal, {
        vendorId: vendorB.id,
        content: "Explicit vendor B note",
      });

      expect(noteA.vendorId).toBe(vendorA.id);
      expect(noteB.vendorId).toBe(vendorB.id);
    });

    it("rejects unauthorized explicit selection without writing a note", async () => {
      const userId = "unauthorized-note-vendor-owner";
      const authorized = await service.create(employee, {
        businessName: "Authorized Note Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000081",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId: userId,
      });
      const unauthorized = await service.create(employee, {
        businessName: "Unauthorized Note Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000082",
        categoryCodes: ["catering"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId: userId,
      });
      const principal = vendorPrincipal(userId, [authorized.id]);
      const notesBefore = repo.notes.size;

      await expect(
        service.addOwnNote(principal, {
          vendorId: unauthorized.id,
          content: "Unauthorized explicit vendor note",
        }),
      ).rejects.toMatchObject({
        code: "VENDOR_RESOURCE_FORBIDDEN",
        status: 403,
      });
      expect(repo.notes.size).toBe(notesBefore);
    });
  });

  it("keeps Phase 1 branch-scoped vendor access narrowed by membership", async () => {
    const owned = await service.create(employee, {
      businessName: "Branch Owned",
      ownerName: "Owner",
      phoneE164: "+919000000017",
      categoryCodes: ["decoration"],
      city: "Hyderabad",
      state: "Telangana",
      ownerUserId: vendorOwner.userId,
    });
    const unrelated = await service.create(employee, {
      businessName: "Branch Unrelated",
      ownerName: "Other",
      phoneE164: "+919000000018",
      categoryCodes: ["catering"],
      city: "Hyderabad",
      state: "Telangana",
    });
    const ownAssignment = await service.assign(employee, {
      vendorId: owned.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });
    const unrelatedAssignment = await service.assign(employee, {
      vendorId: unrelated.id,
      eventRecordId: randomUUID(),
      status: "assigned",
    });

    await expect(
      service.getOwnAssignment(vendorOwner, ownAssignment.id),
    ).resolves.toMatchObject({ id: ownAssignment.id });
    await expect(
      service.getOwnAssignment(vendorOwner, unrelatedAssignment.id),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
  });

  describe("vendor note classification enforcement", () => {
    it("forces omitted noteType to 'vendor' for vendor-self notes", async () => {
      const ownerUserId = "self-note-omitted-owner";
      const vendor = await service.create(employee, {
        businessName: "Self Note Omitted Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000071",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId,
      });
      const owner = vendorPrincipal(ownerUserId, [vendor.id]);

      const note = await service.addOwnNote(owner, {
        vendorId: vendor.id,
        content: "Vendor note with omitted noteType",
      });

      expect(note.noteType).toBe("vendor");
      expect(note.content).toBe("Vendor note with omitted noteType");
      expect(note.vendorId).toBe(vendor.id);
    });

    it("accepts explicit noteType 'vendor' for vendor-self notes", async () => {
      const ownerUserId = "self-note-explicit-owner";
      const vendor = await service.create(employee, {
        businessName: "Self Note Explicit Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000072",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId,
      });
      const owner = vendorPrincipal(ownerUserId, [vendor.id]);

      const note = await service.addOwnNote(owner, {
        vendorId: vendor.id,
        noteType: "vendor",
        content: "Vendor note with explicit vendor noteType",
      });

      expect(note.noteType).toBe("vendor");
      expect(note.content).toBe("Vendor note with explicit vendor noteType");
    });

    it("rejects attempted 'internal' classification at the service boundary for vendor-self notes", async () => {
      const ownerUserId = "self-note-internal-owner";
      const vendor = await service.create(employee, {
        businessName: "Self Note Internal Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000073",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId,
      });
      const owner = vendorPrincipal(ownerUserId, [vendor.id]);

      await expect(
        service.addOwnNote(owner, {
          vendorId: vendor.id,
          noteType: "internal",
          content: "Attempted internal note",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_VENDOR_NOTE_TYPE",
        status: 400,
      });
    });

    it("rejects attempted 'progress' classification at the service boundary for vendor-self notes", async () => {
      const ownerUserId = "self-note-progress-owner";
      const vendor = await service.create(employee, {
        businessName: "Self Note Progress Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000074",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
        ownerUserId,
      });
      const owner = vendorPrincipal(ownerUserId, [vendor.id]);

      await expect(
        service.addOwnNote(owner, {
          vendorId: vendor.id,
          noteType: "progress",
          content: "Attempted progress note",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_VENDOR_NOTE_TYPE",
        status: 400,
      });
    });

    it("allows CRM employees to create all supported note types ('internal', 'progress', 'vendor')", async () => {
      const vendor = await service.create(employee, {
        businessName: "CRM Note Types Vendor",
        ownerName: "Owner",
        phoneE164: "+919000000075",
        categoryCodes: ["catering"],
        city: "Hyderabad",
        state: "Telangana",
      });

      const internalNote = await service.addCrmNote(employee, vendor.id, {
        noteType: "internal",
        content: "CRM internal note",
      });
      expect(internalNote.noteType).toBe("internal");

      const progressNote = await service.addCrmNote(employee, vendor.id, {
        noteType: "progress",
        content: "CRM progress note",
      });
      expect(progressNote.noteType).toBe("progress");

      const vendorTypeNote = await service.addCrmNote(employee, vendor.id, {
        noteType: "vendor",
        content: "CRM note typed as vendor",
      });
      expect(vendorTypeNote.noteType).toBe("vendor");
    });
  });
});

function vendorPrincipal(
  userId: string,
  vendorIds: readonly string[],
): AuthenticatedPrincipal {
  return {
    userId,
    sessionId: `session-${userId}`,
    activeRole: "vendor_owner",
    roleAssignments: vendorIds.map((scopeId) => ({
      role: "vendor_owner" as const,
      active: true,
      scopeType: "vendor" as const,
      scopeId,
    })),
  };
}

function noteSideEffectSnapshot(repo: FakeVendorRepository): {
  readonly notes: number;
  readonly assignmentHistory: number;
  readonly eventTimelines: number;
  readonly eventActivities: number;
  readonly vendorTimelines: number;
  readonly vendorActivities: number;
  readonly audits: number;
  readonly outbox: number;
} {
  return {
    notes: repo.notes.size,
    assignmentHistory: [...repo.assignments.values()].reduce(
      (total, assignment) => total + assignment.history.length,
      0,
    ),
    eventTimelines: sumMapValues(repo.patternB.timelines),
    eventActivities: sumMapValues(repo.patternB.activities),
    vendorTimelines: sumMapValues(repo.patternB.moduleTimelines),
    vendorActivities: sumMapValues(repo.patternB.moduleActivities),
    audits: repo.patternB.audits.length,
    outbox: repo.patternB.outbox.length,
  };
}

function sumMapValues<T>(values: ReadonlyMap<string, readonly T[]>): number {
  return [...values.values()].reduce(
    (total, entries) => total + entries.length,
    0,
  );
}
