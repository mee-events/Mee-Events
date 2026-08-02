import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { EnquiryService } from "../src/modules/enquiries/application/enquiry.service";
import type {
  CatalogRepository,
  EventTypeRecord,
  ServiceCategoryRecord,
} from "../src/modules/catalog/ports/catalog-repository";
import type {
  CreateEnquiryWithLeadInput,
  EnquiryDetail,
  EnquiryListItem,
  EnquiryRepository,
} from "../src/modules/enquiries/ports/enquiry-repository";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";

const WEDDING: EventTypeRecord = {
  id: randomUUID(),
  code: "wedding",
  displayName: "Wedding",
  displayOrder: 1,
  active: true,
};

const DECORATION: ServiceCategoryRecord = {
  id: randomUUID(),
  code: "decoration",
  displayName: "Event decoration",
  displayOrder: 1,
  active: true,
};

class FakeCatalogRepository implements CatalogRepository {
  public async listEventTypes(): Promise<readonly EventTypeRecord[]> {
    return [WEDDING];
  }

  public async listServiceCategories(): Promise<
    readonly ServiceCategoryRecord[]
  > {
    return [DECORATION];
  }

  public async findEventTypeByCode(
    code: string,
  ): Promise<EventTypeRecord | undefined> {
    return code === WEDDING.code ? WEDDING : undefined;
  }
}

interface StoredEnquiry {
  readonly detail: EnquiryDetail;
  readonly userId: string;
  readonly input: CreateEnquiryWithLeadInput;
}

class FakeEnquiryRepository implements EnquiryRepository {
  public readonly stored: StoredEnquiry[] = [];
  public slaMinutes = 10;

  public async createEnquiryWithLead(
    input: CreateEnquiryWithLeadInput,
  ): Promise<{ enquiryId: string; leadId: string }> {
    const enquiryId = randomUUID();
    const detail: EnquiryDetail = {
      id: enquiryId,
      referenceCode: input.referenceCode,
      eventTypeCode: WEDDING.code,
      eventTypeName: WEDDING.displayName,
      status: "received",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      serviceCategoryCodes: input.serviceCategoryCodes,
      contactPreference: input.contactPreference,
      ...(input.eventDate === undefined ? {} : { eventDate: input.eventDate }),
      ...(input.location === undefined ? {} : { location: input.location }),
      ...(input.guestCount === undefined
        ? {}
        : { guestCount: input.guestCount }),
      ...(input.budgetMin === undefined ? {} : { budgetMin: input.budgetMin }),
      ...(input.budgetMax === undefined ? {} : { budgetMax: input.budgetMax }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    };
    this.stored.push({ detail, userId: input.userId, input });
    return { enquiryId, leadId: randomUUID() };
  }

  public async listForCustomerUser(
    userId: string,
  ): Promise<readonly EnquiryListItem[]> {
    return this.stored
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.detail);
  }

  public async findForCustomerUser(
    userId: string,
    enquiryId: string,
  ): Promise<EnquiryDetail | undefined> {
    return this.stored.find(
      (entry) => entry.userId === userId && entry.detail.id === enquiryId,
    )?.detail;
  }

  public async getLeadFirstResponseSlaMinutes(): Promise<number> {
    return this.slaMinutes;
  }
}

function customerPrincipal(): AuthenticatedPrincipal {
  return {
    userId: randomUUID(),
    sessionId: randomUUID(),
    activeRole: "customer",
    roleAssignments: [{ role: "customer", active: true }],
  };
}

describe("EnquiryService", () => {
  let repository: FakeEnquiryRepository;
  let service: EnquiryService;

  beforeEach(() => {
    repository = new FakeEnquiryRepository();
    service = new EnquiryService(repository, new FakeCatalogRepository());
  });

  it("creates an enquiry with a lead SLA from branch settings", async () => {
    const before = Date.now();
    const detail = await service.create(customerPrincipal(), {
      eventTypeCode: "wedding",
      eventDate: "2026-12-01",
      location: "Hyderabad",
      guestCount: 250,
      serviceCategoryCodes: ["decoration"],
      contactPreference: "phone",
    });

    expect(detail.referenceCode).toMatch(/^ENQ-[0-9A-F]{8}$/);
    expect(detail.status).toBe("received");
    expect(detail.serviceCategoryCodes).toEqual(["decoration"]);

    const input = repository.stored[0]?.input;
    expect(input).toBeDefined();
    const dueInMs = (input?.firstResponseDueAt.getTime() ?? 0) - before;
    expect(dueInMs).toBeGreaterThan(9 * 60 * 1000);
    expect(dueInMs).toBeLessThan(11 * 60 * 1000);
  });

  it("rejects unknown event types", async () => {
    await expect(
      service.create(customerPrincipal(), {
        eventTypeCode: "space-launch",
        serviceCategoryCodes: [],
        contactPreference: "phone",
      }),
    ).rejects.toThrow("Event type is not available");
  });

  it("rejects unknown service categories", async () => {
    await expect(
      service.create(customerPrincipal(), {
        eventTypeCode: "wedding",
        serviceCategoryCodes: ["submarines"],
        contactPreference: "phone",
      }),
    ).rejects.toThrow("Unknown service categories");
  });

  it("rejects an inverted budget range", async () => {
    await expect(
      service.create(customerPrincipal(), {
        eventTypeCode: "wedding",
        budgetMin: 100000,
        budgetMax: 50000,
        serviceCategoryCodes: [],
        contactPreference: "phone",
      }),
    ).rejects.toThrow("Minimum budget cannot exceed maximum budget");
  });

  it("lists only the customer's own enquiries", async () => {
    const alice = customerPrincipal();
    const bob = customerPrincipal();
    await service.create(alice, {
      eventTypeCode: "wedding",
      serviceCategoryCodes: [],
      contactPreference: "phone",
    });
    await service.create(bob, {
      eventTypeCode: "wedding",
      serviceCategoryCodes: [],
      contactPreference: "phone",
    });

    const aliceList = await service.listOwn(alice);
    expect(aliceList).toHaveLength(1);
  });

  it("throws when reading someone else's enquiry", async () => {
    const alice = customerPrincipal();
    const created = await service.create(alice, {
      eventTypeCode: "wedding",
      serviceCategoryCodes: [],
      contactPreference: "phone",
    });

    await expect(
      service.getOwn(customerPrincipal(), created.id),
    ).rejects.toThrow("Enquiry not found");
  });
});
