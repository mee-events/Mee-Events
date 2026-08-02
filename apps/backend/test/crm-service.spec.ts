import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { CrmService } from "../src/modules/crm/application/crm.service";
import type {
  LeadListItem,
  LeadRepository,
} from "../src/modules/crm/ports/lead-repository";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";

interface MutableLead {
  item: LeadListItem;
}

class FakeLeadRepository implements LeadRepository {
  public readonly leads = new Map<string, MutableLead>();

  public seed(overrides: Partial<LeadListItem> = {}): LeadListItem {
    const item: LeadListItem = {
      id: randomUUID(),
      customerMobile: "+919876543210",
      status: "new",
      source: "mobile_app",
      createdAt: new Date().toISOString(),
      ...overrides,
    };
    this.leads.set(item.id, { item });
    return item;
  }

  public async listForBranch(): Promise<readonly LeadListItem[]> {
    return [...this.leads.values()].map((lead) => lead.item);
  }

  public async findById(leadId: string): Promise<LeadListItem | undefined> {
    return this.leads.get(leadId)?.item;
  }

  public async claimLead(
    leadId: string,
    ownerUserId: string,
  ): Promise<LeadListItem | undefined> {
    const lead = this.leads.get(leadId);
    if (lead === undefined || lead.item.ownerUserId !== undefined) {
      return undefined;
    }
    lead.item = {
      ...lead.item,
      ownerUserId,
      status: "claimed",
      firstRespondedAt: new Date().toISOString(),
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
    return lead.item;
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

    const response = await service.listLeads();
    expect(response.leads).toHaveLength(2);
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
});
