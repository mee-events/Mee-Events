import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { PlanItemSnapshot } from "@me-event/api-contracts";
import { EnquiryService } from "../src/modules/enquiries/application/enquiry.service";
import type {
  CatalogMediaRecord,
  CatalogProductRecord,
  CatalogRepository,
  CatalogReviewProductRecord,
  CatalogServiceRecord,
  EventSelectionRecord,
  EventTypeRecord,
  OccasionStageRecord,
  ServiceCategoryRecord,
  ServiceSubcategoryRecord,
} from "../src/modules/catalog/ports/catalog-repository";
import type {
  CreateEnquiryInput,
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
  kind: "occasion",
  selectionCount: 0,
  coverImageUrl: null,
  thumbnailUrl: null,
  coverAltText: null,
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

  public async listCatalogServices(
    _departmentCode?: string,
  ): Promise<readonly CatalogServiceRecord[]> {
    return [];
  }

  public async listOccasionStages(
    _occasionCode: string,
  ): Promise<readonly OccasionStageRecord[]> {
    return [];
  }

  public async listServicesForOccasion(
    _occasionCode: string,
  ): Promise<readonly CatalogServiceRecord[]> {
    return [];
  }

  public async findCatalogServiceByCode(
    _code: string,
  ): Promise<CatalogServiceRecord | undefined> {
    return undefined;
  }

  public async listSelectionsForEvent(
    _eventTypeCode: string,
  ): Promise<readonly EventSelectionRecord[]> {
    return [];
  }

  public async listSubcategories(
    _serviceCode: string,
  ): Promise<readonly ServiceSubcategoryRecord[]> {
    return [];
  }

  public async listProducts(_input: {
    readonly serviceCode: string;
    readonly subcategoryLetter?: string;
  }): Promise<readonly CatalogProductRecord[]> {
    return [];
  }

  public async findProductByCode(
    _code: string,
  ): Promise<CatalogProductRecord | undefined> {
    return undefined;
  }

  public async resolvePlanItems(
    items: readonly {
      readonly productCode: string;
      readonly displayName?: string;
      readonly serviceCode?: string;
    }[],
  ): Promise<readonly PlanItemSnapshot[]> {
    return items
      .filter((item) => item.productCode === "deco.floral")
      .map((item) => ({
        productCode: item.productCode,
        displayName: item.displayName ?? "Floral backdrop",
        serviceCode: item.serviceCode ?? "event_decoration",
        catalogVersion: 1,
      }));
  }

  public async listReviewProducts(): Promise<
    readonly CatalogReviewProductRecord[]
  > {
    return [];
  }

  public async updateProductContent(): Promise<
    CatalogReviewProductRecord | undefined
  > {
    return undefined;
  }

  public async listReviewMedia(): Promise<never[]> {
    return [];
  }

  public async upsertCatalogMedia(): Promise<CatalogMediaRecord> {
    throw new Error("not implemented");
  }

  public async updateCatalogMedia(): Promise<undefined> {
    return undefined;
  }

  public async listMediaCoverage(): Promise<{
    occasions: { total: number; withApprovedCover: number };
    services: { total: number; withApprovedCover: number };
    subcategories: {
      total: number;
      withApprovedCover: number;
      withInheritedCover: number;
    };
    products: {
      total: number;
      withApprovedCover: number;
      withInheritedCover: number;
    };
  }> {
    return {
      occasions: { total: 0, withApprovedCover: 0 },
      services: { total: 0, withApprovedCover: 0 },
      subcategories: { total: 0, withApprovedCover: 0, withInheritedCover: 0 },
      products: { total: 0, withApprovedCover: 0, withInheritedCover: 0 },
    };
  }
}

interface StoredEnquiry {
  readonly detail: EnquiryDetail;
  readonly userId: string;
  readonly input: CreateEnquiryInput;
}

class FakeEnquiryRepository implements EnquiryRepository {
  public readonly stored: StoredEnquiry[] = [];
  public slaMinutes = 10;

  public async createEnquiry(
    input: CreateEnquiryInput,
  ): Promise<{ enquiryId: string }> {
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
      planItems: input.planItems,
      contactPreference: input.contactPreference,
      ...(input.eventDate === undefined ? {} : { eventDate: input.eventDate }),
      ...(input.location === undefined ? {} : { location: input.location }),
      ...(input.guestCount === undefined
        ? {}
        : { guestCount: input.guestCount }),
      ...(input.budgetMin === undefined ? {} : { budgetMin: input.budgetMin }),
      ...(input.budgetMax === undefined ? {} : { budgetMax: input.budgetMax }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
      ...(input.preferredExternalVendor === undefined
        ? {}
        : { preferredExternalVendor: input.preferredExternalVendor }),
    };
    this.stored.push({ detail, userId: input.userId, input });
    return { enquiryId };
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

  public async syncStatusFromCrmLead(): Promise<void> {
    // no-op for unit tests
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
      preferredExternalVendor: "Family florist",
      serviceCategoryCodes: ["decoration"],
      planItems: [],
      contactPreference: "phone",
    });
    expect(detail.referenceCode).toMatch(/^ENQ-[0-9A-F]{8}$/);
    expect(detail.status).toBe("received");
    expect(detail.serviceCategoryCodes).toEqual(["decoration"]);
    expect(detail.preferredExternalVendor).toBe("Family florist");
    expect(repository.stored[0]?.input.preferredExternalVendor).toBe(
      "Family florist",
    );
    const input = repository.stored[0]?.input;
    expect(input).toBeDefined();
    const dueInMs = (input?.firstResponseDueAt.getTime() ?? 0) - before;
    expect(dueInMs).toBeGreaterThan(9 * 60 * 1000);
    expect(dueInMs).toBeLessThan(11 * 60 * 1000);
  });

  it("snapshots selectable plan items onto the enquiry", async () => {
    const detail = await service.create(customerPrincipal(), {
      eventTypeCode: "wedding",
      serviceCategoryCodes: ["decoration"],
      planItems: [{ productCode: "deco.floral" }],
      contactPreference: "phone",
    });
    expect(detail.planItems).toEqual([
      {
        productCode: "deco.floral",
        displayName: "Floral backdrop",
        serviceCode: "event_decoration",
        catalogVersion: 1,
      },
    ]);
    expect(repository.stored[0]?.input.planItems).toHaveLength(1);
  });

  it("rejects unknown plan item product codes", async () => {
    await expect(
      service.create(customerPrincipal(), {
        eventTypeCode: "wedding",
        serviceCategoryCodes: [],
        planItems: [{ productCode: "not-a-product" }],
        contactPreference: "phone",
      }),
    ).rejects.toThrow("One or more plan items are not available");
  });

  it("rejects unknown event types", async () => {
    await expect(
      service.create(customerPrincipal(), {
        eventTypeCode: "space-launch",
        serviceCategoryCodes: [],
        planItems: [],
        contactPreference: "phone",
      }),
    ).rejects.toThrow("Event type is not available");
  });

  it("rejects unknown service categories", async () => {
    await expect(
      service.create(customerPrincipal(), {
        eventTypeCode: "wedding",
        serviceCategoryCodes: ["submarines"],
        planItems: [],
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
        planItems: [],
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
      planItems: [],
      contactPreference: "phone",
    });
    await service.create(bob, {
      eventTypeCode: "wedding",
      serviceCategoryCodes: [],
      planItems: [],
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
      planItems: [],
      contactPreference: "phone",
    });
    await expect(
      service.getOwn(customerPrincipal(), created.id),
    ).rejects.toThrow("Enquiry not found");
  });
});
