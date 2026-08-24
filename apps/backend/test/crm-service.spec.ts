import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { LeadStatus } from "@me-event/api-contracts";
import { CrmService } from "../src/modules/crm/application/crm.service";
import type {
  EnquirySubmittedPayload,
  LeadDetailItem,
  LeadListItem,
  LeadRepository,
} from "../src/modules/crm/ports/lead-repository";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";

interface MutableLead {
  item: LeadListItem;
  detail: LeadDetailItem;
}

class FakeLeadRepository implements LeadRepository {
  public readonly leads = new Map<string, MutableLead>();

  public seed(overrides: Partial<LeadDetailItem> = {}): LeadDetailItem {
    const id = overrides.id ?? randomUUID();
    const item: LeadListItem = {
      id,
      customerMobile: overrides.customerMobile ?? "+919876543210",
      status: overrides.status ?? "new",
      source: overrides.source ?? "mobile_app",
      createdAt: overrides.createdAt ?? new Date().toISOString(),
      ...(overrides.enquiryId === undefined
        ? {}
        : { enquiryId: overrides.enquiryId }),
      ...(overrides.enquiryReferenceCode === undefined
        ? {}
        : { enquiryReferenceCode: overrides.enquiryReferenceCode }),
      ...(overrides.customerName === undefined
        ? {}
        : { customerName: overrides.customerName }),
      ...(overrides.eventTypeName === undefined
        ? {}
        : { eventTypeName: overrides.eventTypeName }),
      ...(overrides.eventDate === undefined
        ? {}
        : { eventDate: overrides.eventDate }),
      ...(overrides.ownerUserId === undefined
        ? {}
        : { ownerUserId: overrides.ownerUserId }),
      ...(overrides.firstResponseDueAt === undefined
        ? {}
        : { firstResponseDueAt: overrides.firstResponseDueAt }),
      ...(overrides.firstRespondedAt === undefined
        ? {}
        : { firstRespondedAt: overrides.firstRespondedAt }),
    };
    const detail: LeadDetailItem = {
      ...item,
      requestedServices: overrides.requestedServices ?? ["PHOTO"],
      location: overrides.location ?? "Hyderabad",
      guestCount: overrides.guestCount ?? 120,
      notes: overrides.notes ?? "Need candid coverage",
      ...(overrides.preferredExternalVendor === undefined
        ? {}
        : { preferredExternalVendor: overrides.preferredExternalVendor }),
      updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    };
    this.leads.set(id, { item, detail });
    return detail;
  }

  public async listForBranch(): Promise<readonly LeadListItem[]> {
    return [...this.leads.values()].map((lead) => lead.item);
  }

  public async findById(leadId: string): Promise<LeadListItem | undefined> {
    return this.leads.get(leadId)?.item;
  }

  public async findDetailById(
    leadId: string,
  ): Promise<LeadDetailItem | undefined> {
    return this.leads.get(leadId)?.detail;
  }

  public async createFromEnquirySubmitted(
    payload: EnquirySubmittedPayload,
  ): Promise<{ leadId: string; created: boolean }> {
    for (const lead of this.leads.values()) {
      if (lead.item.enquiryId === payload.enquiryId) {
        return { leadId: lead.item.id, created: false };
      }
    }
    const created = this.seed({
      enquiryId: payload.enquiryId,
      firstResponseDueAt: payload.firstResponseDueAt,
      status: "new",
      source: "mobile_app",
    });
    return { leadId: created.id, created: true };
  }

  public async claimLead(
    leadId: string,
    ownerUserId: string,
  ): Promise<LeadListItem | undefined> {
    const lead = this.leads.get(leadId);
    if (lead === undefined || lead.item.ownerUserId !== undefined) {
      return undefined;
    }
    const firstRespondedAt = new Date().toISOString();
    lead.item = {
      ...lead.item,
      ownerUserId,
      status: "claimed",
      firstRespondedAt,
    };
    lead.detail = {
      ...lead.detail,
      ownerUserId,
      status: "claimed",
      firstRespondedAt,
    };
    return lead.item;
  }

  public async saveRequirements(
    leadId: string,
    _actorUserId: string,
    _actorRole: string,
    _notes: string,
    status: "contacted" | "qualified",
  ): Promise<LeadListItem | undefined> {
    const lead = this.leads.get(leadId);
    if (
      lead === undefined ||
      !["claimed", "contacted", "qualified"].includes(lead.item.status)
    ) {
      return undefined;
    }
    lead.item = { ...lead.item, status };
    lead.detail = { ...lead.detail, status };
    return lead.item;
  }

  public async updateStatus(
    leadId: string,
    status: LeadStatus,
  ): Promise<LeadDetailItem | undefined> {
    const lead = this.leads.get(leadId);
    if (lead === undefined) {
      return undefined;
    }
    const firstRespondedAt =
      lead.item.status === "new"
        ? (lead.item.firstRespondedAt ?? new Date().toISOString())
        : lead.item.firstRespondedAt;
    lead.item = {
      ...lead.item,
      status,
      ...(firstRespondedAt === undefined ? {} : { firstRespondedAt }),
    };
    lead.detail = {
      ...lead.detail,
      status,
      ...(firstRespondedAt === undefined ? {} : { firstRespondedAt }),
    };
    return lead.detail;
  }
}

function employeePrincipal(): AuthenticatedPrincipal {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    activeRole: "employee",
    roleAssignments: [{ role: "employee", active: true }],
  };
}

describe("CrmService", () => {
  let repository: FakeLeadRepository;
  let service: CrmService;

  beforeEach(() => {
    repository = new FakeLeadRepository();
    service = new CrmService(repository);
  });

  it("lists branch leads", async () => {
    repository.seed();
    repository.seed();
    const response = await service.listLeads(employeePrincipal());
    expect(response.leads).toHaveLength(2);
  });

  it("returns lead detail fields for slide-over", async () => {
    const lead = repository.seed({
      preferredExternalVendor: "Sweet Crumb Studio",
      requestedServices: ["PHOTO", "DECOR"],
      guestCount: 350,
      location: "Taj Falaknuma",
    });
    const detail = await service.getLead(lead.id);
    expect(detail.id).toBe(lead.id);
    expect(detail.location).toBe("Taj Falaknuma");
    expect(detail.guestCount).toBe(350);
    expect(detail.preferredExternalVendor).toBe("Sweet Crumb Studio");
    expect(detail.requestedServices).toEqual(["PHOTO", "DECOR"]);
    expect(detail.notes).toBe("Need candid coverage");
  });

  it("rejects getLead for an unknown lead", async () => {
    await expect(service.getLead(randomUUID())).rejects.toThrow(
      "Lead not found",
    );
  });

  it("updates lead status for Kanban moves", async () => {
    const lead = repository.seed({ status: "new" });
    const updated = await service.updateStatus(employeePrincipal(), lead.id, {
      status: "contacted",
    });
    expect(updated.status).toBe("contacted");
    expect(updated.firstRespondedAt).toBeDefined();
  });

  it("rejects status update for an unknown lead", async () => {
    await expect(
      service.updateStatus(employeePrincipal(), randomUUID(), {
        status: "lost",
      }),
    ).rejects.toThrow("Lead not found");
  });

  it("claims an unowned lead and records the owner", async () => {
    const lead = repository.seed();
    const principal = employeePrincipal();
    const claimed = await service.claimLead(principal, lead.id);
    expect(claimed.ownerUserId).toBe(principal.userId);
    expect(claimed.status).toBe("claimed");
    expect(claimed.firstRespondedAt).toBeDefined();
  });

  it("rejects claiming an already-owned lead", async () => {
    const lead = repository.seed({ ownerUserId: randomUUID() });
    await expect(
      service.claimLead(employeePrincipal(), lead.id),
    ).rejects.toThrow("Lead already has an owner");
  });

  it("rejects claiming an unknown lead", async () => {
    await expect(
      service.claimLead(employeePrincipal(), randomUUID()),
    ).rejects.toThrow("Lead not found");
  });

  it("createFromEnquirySubmitted is idempotent per enquiry", async () => {
    const enquiryId = randomUUID();
    const payload = {
      enquiryId,
      branchId: randomUUID(),
      customerId: randomUUID(),
      firstResponseDueAt: new Date().toISOString(),
    };
    const first = await repository.createFromEnquirySubmitted(payload);
    const second = await repository.createFromEnquirySubmitted(payload);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.leadId).toBe(first.leadId);
  });
});
