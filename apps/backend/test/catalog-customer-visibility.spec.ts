import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { PostgresCatalogRepository } from "../src/modules/catalog/adapters/postgres-catalog.repository";
import {
  canAddProductToPlan,
  isCustomerVisibleProduct,
  isCustomerVisibleService,
  nextCustomerSelectable,
  type CustomerProductVisibility,
  type CustomerServiceVisibility,
} from "../src/modules/catalog/domain/catalog-customer-visibility";
import { PostgresSearchRepository } from "../src/modules/search/adapters/postgres-search.repository";

interface StoredService extends CustomerServiceVisibility {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly departmentCode: string;
  readonly entityKind: "service" | "venue" | "inventory" | "travel";
}

interface StoredProduct extends CustomerProductVisibility {
  readonly code: string;
  readonly displayName: string;
  readonly sourceName: string;
  readonly serviceCode: string;
  readonly subcategoryCode: string;
  readonly version: number;
}

interface StoredSubcategory {
  readonly code: string;
  readonly letter: string;
  readonly displayName: string;
  readonly serviceCode: string;
  readonly active: boolean;
  readonly contentStatus: string;
}

interface RevisionRow {
  readonly field: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly actorUserId: unknown;
  readonly reason: unknown;
  readonly code: unknown;
}

function compactSql(sql: string): string {
  return sql.replace(/\s+/gu, " ").trim();
}

function sqlEnforcesServiceVisibility(sql: string): boolean {
  const compact = compactSql(sql);
  return (
    compact.includes("cs.customer_selectable = true") &&
    compact.includes("cs.hyderabad_available = true") &&
    compact.includes("cs.content_status = 'approved'") &&
    compact.includes("cs.active = true")
  );
}

function sqlEnforcesProductVisibility(sql: string): boolean {
  const compact = compactSql(sql);
  return (
    compact.includes("p.placeholder = false") &&
    compact.includes("p.customer_selectable = true") &&
    compact.includes("p.hyderabad_available = true") &&
    compact.includes("p.content_status = 'approved'")
  );
}

class FakeCatalogPool {
  public revisions: RevisionRow[] = [];
  public failAuditField: string | null = null;
  public rolledBack = false;
  private productBackup: StoredProduct[] = [];
  private revisionBackup: RevisionRow[] = [];

  public constructor(
    public services: StoredService[],
    public products: StoredProduct[],
    public subcategories: StoredSubcategory[],
    public affinities: Array<{ serviceCode: string; occasionCode: string }>,
    public selections: Array<{
      eventTypeCode: string;
      sourceOrdinal: string;
      sourceLabel: string;
      serviceCode: string;
      mappingStatus: "mapped" | "requires_decision";
    }>,
  ) {}

  public async connect(): Promise<{
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  }> {
    return {
      query: (sql: string, params: unknown[] = []) => this.query(sql, params),
      release: () => undefined,
    };
  }

  public async query(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: unknown[] }> {
    const text = compactSql(sql);
    if (text === "BEGIN") {
      this.productBackup = this.products.map((row) => ({ ...row }));
      this.revisionBackup = [...this.revisions];
      this.rolledBack = false;
      return { rows: [] };
    }
    if (text === "COMMIT") {
      return { rows: [] };
    }
    if (text === "ROLLBACK") {
      this.products = this.productBackup.map((row) => ({ ...row }));
      this.revisions = [...this.revisionBackup];
      this.rolledBack = true;
      return { rows: [] };
    }
    if (/FOR UPDATE/iu.test(sql)) {
      return { rows: this.reviewRows(params[0] as string) };
    }
    if (/UPDATE catalog_products/iu.test(sql)) {
      this.applyProductUpdate(params);
      return { rows: [] };
    }
    if (/INSERT INTO catalog_content_revisions/iu.test(sql)) {
      const field = sql.includes("'display_name'")
        ? "display_name"
        : "content_status";
      if (this.failAuditField === field) {
        throw new Error("audit insert failed");
      }
      this.revisions.push({
        code: params[0],
        field,
        oldValue: params[1],
        newValue: params[2],
        actorUserId: params[3],
        reason: params[4],
      });
      return { rows: [] };
    }
    if (sql.includes("FROM event_types")) {
      return { rows: this.eventTypeRows(sql) };
    }
    if (sql.includes("service_occasion_affinity")) {
      return {
        rows: this.serviceRows(sql).filter((row) =>
          this.affinities.some(
            (item) =>
              item.serviceCode === row.code && item.occasionCode === params[0],
          ),
        ),
      };
    }
    if (
      sql.includes("FROM event_service_selections") &&
      !sql.includes("COUNT(*)")
    ) {
      return { rows: this.selectionRows(sql, params[0] as string) };
    }
    if (sql.includes("sc.service_code = $1")) {
      return { rows: this.subcategoryRows(sql, params[0] as string) };
    }
    if (sql.includes("ANY($1::text[])")) {
      return { rows: this.productRows(sql, params[0] as string[]) };
    }
    if (sql.includes("ILIKE ANY") && sql.includes("catalog_services")) {
      return { rows: this.searchServiceRows(sql, params) };
    }
    if (sql.includes("ILIKE ANY") && sql.includes("catalog_products")) {
      return { rows: this.searchProductRows(sql, params) };
    }
    if (sql.includes("p.code = $1")) {
      return { rows: this.productRows(sql, [params[0] as string]) };
    }
    if (sql.includes("p.service_code = $1")) {
      return {
        rows: this.productRows(
          sql,
          this.products
            .filter((product) => product.serviceCode === params[0])
            .map((product) => product.code),
        ),
      };
    }
    if (sql.includes("FROM catalog_services")) {
      const rows = this.serviceRows(sql);
      if (sql.includes("cs.code = $1")) {
        return { rows: rows.filter((row) => row.code === params[0]) };
      }
      return { rows };
    }
    if (sql.includes("FROM catalog_products") && sql.includes("code = $1")) {
      return { rows: this.reviewRows(params[0] as string) };
    }
    return { rows: [] };
  }

  private serviceByCode(code: string): StoredService | undefined {
    return this.services.find((service) => service.code === code);
  }

  private serviceRows(sql: string): Array<Record<string, unknown>> {
    let rows = this.services;
    if (sqlEnforcesServiceVisibility(sql)) {
      rows = rows.filter((service) => isCustomerVisibleService(service));
    }
    return rows.map((service) => ({
      id: service.id,
      code: service.code,
      display_name: service.displayName,
      department_code: service.departmentCode,
      entity_kind: service.entityKind,
      icon_url: null,
      cover_image_url: null,
      thumbnail_url: null,
      cover_alt_text: null,
      display_order: 1,
      active: service.active,
      subcategory_count: 1,
      product_count: 1,
    }));
  }

  private productRows(
    sql: string,
    codes: readonly string[],
  ): Array<Record<string, unknown>> {
    let rows = this.products.filter((product) => codes.includes(product.code));
    if (sqlEnforcesProductVisibility(sql)) {
      rows = rows.filter((product) => {
        const parent = this.serviceByCode(product.serviceCode);
        return (
          parent !== undefined && isCustomerVisibleProduct(product, parent)
        );
      });
    } else if (sqlEnforcesServiceVisibility(sql)) {
      rows = rows.filter((product) => {
        const parent = this.serviceByCode(product.serviceCode);
        return parent !== undefined && isCustomerVisibleService(parent);
      });
    }
    return rows.map((product) => {
      const subcategory = this.subcategories.find(
        (item) => item.code === product.subcategoryCode,
      );
      const restricted = product.eligibilityFlags.length > 0;
      return {
        code: product.code,
        display_name: product.displayName,
        source_name: product.sourceName,
        service_code: product.serviceCode,
        subcategory_code: product.subcategoryCode,
        subcategory_letter: subcategory?.letter ?? "A",
        cover_image_url: null,
        thumbnail_url: null,
        cover_alt_text: null,
        restricted,
        add_to_plan_allowed: product.customerSelectable && !restricted,
        display_order: 1,
        version: product.version,
      };
    });
  }

  private subcategoryRows(
    sql: string,
    serviceCode: string,
  ): Array<Record<string, unknown>> {
    let rows = this.subcategories.filter(
      (item) => item.serviceCode === serviceCode,
    );
    if (sqlEnforcesServiceVisibility(sql)) {
      const parent = this.serviceByCode(serviceCode);
      if (parent === undefined || !isCustomerVisibleService(parent)) {
        return [];
      }
    }
    if (compactSql(sql).includes("sc.content_status = 'approved'")) {
      rows = rows.filter(
        (item) => item.active && item.contentStatus === "approved",
      );
    }
    return rows.map((item) => ({
      code: item.code,
      letter: item.letter,
      display_name: item.displayName,
      product_count: 0,
      display_order: 1,
      cover_image_url: null,
      thumbnail_url: null,
      cover_alt_text: null,
    }));
  }

  private selectionRows(
    sql: string,
    eventTypeCode: string,
  ): Array<Record<string, unknown>> {
    return this.selections
      .filter((item) => item.eventTypeCode === eventTypeCode)
      .filter((item) => {
        if (!sqlEnforcesServiceVisibility(sql)) {
          return true;
        }
        const parent = this.serviceByCode(item.serviceCode);
        return parent !== undefined && isCustomerVisibleService(parent);
      })
      .map((item) => {
        const parent = this.serviceByCode(item.serviceCode);
        return {
          source_ordinal: item.sourceOrdinal,
          source_label: item.sourceLabel,
          service_code: item.serviceCode,
          service_display_name: parent?.displayName ?? null,
          mapping_status: item.mappingStatus,
        };
      });
  }

  private eventTypeRows(sql: string): Array<Record<string, unknown>> {
    const visibleSelectionCount = this.selections.filter((item) => {
      const parent = this.serviceByCode(item.serviceCode);
      if (!sqlEnforcesServiceVisibility(sql)) {
        return item.mappingStatus === "mapped";
      }
      return (
        item.mappingStatus === "mapped" &&
        parent !== undefined &&
        isCustomerVisibleService(parent)
      );
    }).length;
    return [
      {
        id: "et-wedding",
        code: "wedding",
        display_name: "Wedding",
        display_order: 1,
        active: true,
        kind: "occasion",
        selection_count: visibleSelectionCount,
        cover_image_url: null,
        thumbnail_url: null,
        cover_alt_text: null,
      },
    ];
  }

  private searchServiceRows(
    sql: string,
    params: unknown[],
  ): Array<Record<string, unknown>> {
    const needle = typeof params[0] === "string" ? params[0].toLowerCase() : "";
    let rows = this.services.filter(
      (service) =>
        service.code.toLowerCase().includes(needle) ||
        service.displayName.toLowerCase().includes(needle),
    );
    if (sqlEnforcesServiceVisibility(sql)) {
      rows = rows.filter((service) => isCustomerVisibleService(service));
    }
    return rows.map((service) => ({
      id: service.id,
      code: service.code,
      display_name: service.displayName,
      subtitle: "Service",
      image_url: null,
      similarity: 1,
    }));
  }

  private searchProductRows(
    sql: string,
    params: unknown[],
  ): Array<Record<string, unknown>> {
    const needle = typeof params[0] === "string" ? params[0].toLowerCase() : "";
    let rows = this.products.filter(
      (product) =>
        product.code.toLowerCase().includes(needle) ||
        product.displayName.toLowerCase().includes(needle),
    );
    if (sqlEnforcesProductVisibility(sql)) {
      rows = rows.filter((product) => {
        const parent = this.serviceByCode(product.serviceCode);
        return (
          parent !== undefined && isCustomerVisibleProduct(product, parent)
        );
      });
    } else if (sqlEnforcesServiceVisibility(sql)) {
      rows = rows.filter((product) => {
        const parent = this.serviceByCode(product.serviceCode);
        return parent !== undefined && isCustomerVisibleService(parent);
      });
    }
    return rows.map((product) => ({
      id: product.code,
      code: product.code,
      display_name: product.displayName,
      subtitle: "Product",
      image_url: null,
      similarity: 1,
    }));
  }

  private reviewRows(code: string): Array<Record<string, unknown>> {
    const product = this.products.find((item) => item.code === code);
    if (product === undefined) {
      return [];
    }
    return [
      {
        code: product.code,
        display_name: product.displayName,
        source_name: product.sourceName,
        service_code: product.serviceCode,
        content_status: product.contentStatus,
        customer_selectable: product.customerSelectable,
        placeholder: product.placeholder,
        eligibility_flags: [...product.eligibilityFlags],
        hyderabad_available: product.hyderabadAvailable,
      },
    ];
  }

  private applyProductUpdate(params: unknown[]): void {
    const code = params[0] as string;
    const current = this.products.find((item) => item.code === code);
    if (current === undefined) {
      return;
    }
    const next: StoredProduct = {
      ...current,
      contentStatus: params[1] as StoredProduct["contentStatus"],
      displayName: params[2] as string,
      customerSelectable: Boolean(params[3]),
      version: current.version + 1,
    };
    this.products = this.products.map((item) =>
      item.code === code ? next : item,
    );
  }
}

function visibleService(code: string, displayName: string): StoredService {
  return {
    id: `id-${code}`,
    code,
    displayName,
    departmentCode: "PHOTO",
    entityKind: "service",
    active: true,
    customerSelectable: true,
    hyderabadAvailable: true,
    contentStatus: "approved",
  };
}

function seedPool(): FakeCatalogPool {
  const photography = visibleService("photography", "Photography");
  const nonHyd: StoredService = {
    ...visibleService("non_hyd_service", "Non Hyderabad Decor"),
    hyderabadAvailable: false,
  };
  const imported: StoredService = {
    ...visibleService("imported_service", "Imported Lighting"),
    contentStatus: "source_imported",
  };
  const rejected: StoredService = {
    ...visibleService("rejected_service", "Rejected Staging"),
    contentStatus: "rejected",
  };
  const notSelectable: StoredService = {
    ...visibleService("internal_only", "Internal Only"),
    customerSelectable: false,
  };
  const honeymoon: StoredService = {
    ...visibleService("honeymoon_travel", "Honeymoon Travel"),
    departmentCode: "TRAVEL",
    entityKind: "travel",
    customerSelectable: false,
    hyderabadAvailable: false,
  };
  const visibleProduct = (
    code: string,
    serviceCode: string,
    extras: Partial<StoredProduct> = {},
  ): StoredProduct => ({
    code,
    displayName: code,
    sourceName: code,
    serviceCode,
    subcategoryCode: `${serviceCode}.A`,
    version: 1,
    active: true,
    customerSelectable: true,
    placeholder: false,
    hyderabadAvailable: true,
    contentStatus: "approved",
    eligibilityFlags: [],
    ...extras,
  });
  return new FakeCatalogPool(
    [photography, nonHyd, imported, rejected, notSelectable, honeymoon],
    [
      visibleProduct("photo.A1", "photography", { displayName: "Album" }),
      visibleProduct("photo.restricted", "photography", {
        displayName: "Drone Package",
        eligibilityFlags: ["vip_only"],
      }),
      visibleProduct("photo.placeholder", "photography", {
        displayName: "Placeholder Album",
        placeholder: true,
      }),
      visibleProduct("hidden.A1", "non_hyd_service", {
        displayName: "Approved Hidden Parent Product",
      }),
      visibleProduct("honey.A1", "honeymoon_travel", {
        displayName: "Honeymoon Package 1",
      }),
      visibleProduct("review.normal", "photography", {
        displayName: "Old Title",
        contentStatus: "copy_review",
        customerSelectable: false,
      }),
      visibleProduct("review.nonhyd", "photography", {
        displayName: "Non Hyd Product",
        contentStatus: "copy_review",
        customerSelectable: false,
        hyderabadAvailable: false,
      }),
      visibleProduct("review.placeholder", "photography", {
        displayName: "Placeholder Review",
        contentStatus: "copy_review",
        customerSelectable: false,
        placeholder: true,
      }),
    ],
    [
      {
        code: "photography.A",
        letter: "A",
        displayName: "Albums",
        serviceCode: "photography",
        active: true,
        contentStatus: "approved",
      },
      {
        code: "non_hyd_service.A",
        letter: "A",
        displayName: "Hidden",
        serviceCode: "non_hyd_service",
        active: true,
        contentStatus: "approved",
      },
      {
        code: "honeymoon_travel.A",
        letter: "A",
        displayName: "Packages",
        serviceCode: "honeymoon_travel",
        active: true,
        contentStatus: "approved",
      },
    ],
    [
      { serviceCode: "photography", occasionCode: "wedding" },
      { serviceCode: "non_hyd_service", occasionCode: "wedding" },
      { serviceCode: "honeymoon_travel", occasionCode: "wedding" },
    ],
    [
      {
        eventTypeCode: "wedding",
        sourceOrdinal: "1.1",
        sourceLabel: "Photography",
        serviceCode: "photography",
        mappingStatus: "mapped",
      },
      {
        eventTypeCode: "wedding",
        sourceOrdinal: "1.2",
        sourceLabel: "Honeymoon",
        serviceCode: "honeymoon_travel",
        mappingStatus: "mapped",
      },
      {
        eventTypeCode: "wedding",
        sourceOrdinal: "1.3",
        sourceLabel: "Non Hyd",
        serviceCode: "non_hyd_service",
        mappingStatus: "mapped",
      },
    ],
  );
}

function repositories(pool = seedPool()): {
  catalog: PostgresCatalogRepository;
  search: PostgresSearchRepository;
  pool: FakeCatalogPool;
} {
  return {
    catalog: new PostgresCatalogRepository(pool as unknown as Pool),
    search: new PostgresSearchRepository(pool as unknown as Pool),
    pool,
  };
}

function codes(
  rows: ReadonlyArray<{ code: string } | { serviceCode: string | null }>,
): string[] {
  return rows.map((row) =>
    "code" in row && row.code !== undefined
      ? row.code
      : ((row as { serviceCode: string | null }).serviceCode ?? ""),
  );
}

describe("customer catalogue visibility", () => {
  it("hides a non-Hyderabad service from list, detail, occasion mapping and search", async () => {
    const { catalog, search } = repositories();
    expect(codes(await catalog.listCatalogServices())).not.toContain(
      "non_hyd_service",
    );
    expect(
      await catalog.findCatalogServiceByCode("non_hyd_service"),
    ).toBeUndefined();
    expect(
      codes(await catalog.listServicesForOccasion("wedding")),
    ).not.toContain("non_hyd_service");
    expect(
      codes(await catalog.listSelectionsForEvent("wedding")),
    ).not.toContain("non_hyd_service");
    expect(
      (await search.searchServices(["non hyd"], 10)).map((hit) => hit.code),
    ).not.toContain("non_hyd_service");
  });

  it("hides source-imported and rejected services from public catalogue paths", async () => {
    const { catalog, search } = repositories();
    const listed = codes(await catalog.listCatalogServices());
    expect(listed).not.toContain("imported_service");
    expect(listed).not.toContain("rejected_service");
    expect(
      await catalog.findCatalogServiceByCode("imported_service"),
    ).toBeUndefined();
    expect(
      await catalog.findCatalogServiceByCode("rejected_service"),
    ).toBeUndefined();
    expect(
      (await search.searchServices(["imported"], 10)).map((hit) => hit.code),
    ).not.toContain("imported_service");
    expect(
      (await search.searchServices(["rejected"], 10)).map((hit) => hit.code),
    ).not.toContain("rejected_service");
  });

  it("hides a non-customer-selectable service", async () => {
    const { catalog, search } = repositories();
    expect(codes(await catalog.listCatalogServices())).not.toContain(
      "internal_only",
    );
    expect(
      await catalog.findCatalogServiceByCode("internal_only"),
    ).toBeUndefined();
    expect(
      (await search.searchServices(["internal"], 10)).map((hit) => hit.code),
    ).not.toContain("internal_only");
  });

  it("hides an approved product whose parent service is not customer-visible", async () => {
    const { catalog, search } = repositories();
    expect(await catalog.findProductByCode("hidden.A1")).toBeUndefined();
    expect(
      (await catalog.listProducts({ serviceCode: "non_hyd_service" })).map(
        (row) => row.code,
      ),
    ).not.toContain("hidden.A1");
    expect(
      (await search.searchProducts(["Approved Hidden"], 10)).map(
        (hit) => hit.code,
      ),
    ).not.toContain("hidden.A1");
    expect(await catalog.listSubcategories("non_hyd_service")).toEqual([]);
  });

  it("hides a placeholder product even when the parent service is visible", async () => {
    const { catalog, search } = repositories();
    expect(
      await catalog.findProductByCode("photo.placeholder"),
    ).toBeUndefined();
    expect(
      (await catalog.listProducts({ serviceCode: "photography" })).map(
        (row) => row.code,
      ),
    ).not.toContain("photo.placeholder");
    expect(
      (await search.searchProducts(["Placeholder Album"], 10)).map(
        (hit) => hit.code,
      ),
    ).not.toContain("photo.placeholder");
  });

  it("shows a restricted product as restricted and refuses to resolve it into a plan", async () => {
    const { catalog } = repositories();
    const detail = await catalog.findProductByCode("photo.restricted");
    expect(detail).toMatchObject({
      code: "photo.restricted",
      restricted: true,
      addToPlanAllowed: false,
    });
    const listed = await catalog.listProducts({ serviceCode: "photography" });
    expect(listed.find((row) => row.code === "photo.restricted")).toMatchObject(
      {
        restricted: true,
        addToPlanAllowed: false,
      },
    );
    const resolved = await catalog.resolvePlanItems([
      { productCode: "photo.restricted" },
      { productCode: "photo.A1" },
    ]);
    expect(resolved.map((item) => item.productCode)).toEqual(["photo.A1"]);
  });

  it("does not make honeymoon_travel publicly reachable", async () => {
    const { catalog, search } = repositories();
    expect(codes(await catalog.listCatalogServices())).not.toContain(
      "honeymoon_travel",
    );
    expect(
      await catalog.findCatalogServiceByCode("honeymoon_travel"),
    ).toBeUndefined();
    expect(
      codes(await catalog.listServicesForOccasion("wedding")),
    ).not.toContain("honeymoon_travel");
    expect(
      codes(await catalog.listSelectionsForEvent("wedding")),
    ).not.toContain("honeymoon_travel");
    expect(await catalog.findProductByCode("honey.A1")).toBeUndefined();
    expect(
      (await search.searchServices(["honeymoon"], 10)).map((hit) => hit.code),
    ).not.toContain("honeymoon_travel");
    expect(
      (await search.searchProducts(["honeymoon"], 10)).map((hit) => hit.code),
    ).not.toContain("honey.A1");
    const eventTypes = await catalog.listEventTypes();
    expect(eventTypes[0]?.selectionCount).toBe(1);
  });
});

describe("catalogue content revisions and selectability", () => {
  it("audits a status-only change without a display-name revision", async () => {
    const { catalog, pool } = repositories();
    const updated = await catalog.updateProductContent({
      code: "review.normal",
      contentStatus: "approved",
      actorUserId: "admin-1",
      reason: "approve copy",
    });
    expect(updated?.contentStatus).toBe("approved");
    expect(updated?.displayName).toBe("Old Title");
    expect(pool.revisions.map((row) => row.field)).toEqual(["content_status"]);
    expect(pool.revisions[0]).toMatchObject({
      oldValue: "copy_review",
      newValue: "approved",
      actorUserId: "admin-1",
      reason: "approve copy",
    });
  });

  it("audits a display-name-only change with the previous and next names", async () => {
    const { catalog, pool } = repositories();
    await catalog.updateProductContent({
      code: "photo.A1",
      contentStatus: "approved",
      displayName: "Wedding Album",
      actorUserId: "admin-1",
      reason: "retitle",
    });
    expect(pool.revisions).toEqual([
      expect.objectContaining({
        field: "display_name",
        oldValue: "Album",
        newValue: "Wedding Album",
        actorUserId: "admin-1",
        reason: "retitle",
      }),
    ]);
  });

  it("audits combined status and display-name changes in one transaction", async () => {
    const { catalog, pool } = repositories();
    await catalog.updateProductContent({
      code: "review.normal",
      contentStatus: "approved",
      displayName: "New Title",
      actorUserId: "admin-1",
      reason: "approve and retitle",
    });
    expect(pool.revisions.map((row) => row.field)).toEqual([
      "content_status",
      "display_name",
    ]);
    expect(pool.revisions[1]).toMatchObject({
      oldValue: "Old Title",
      newValue: "New Title",
    });
  });

  it("does not write a display-name revision when the name is unchanged", async () => {
    const { catalog, pool } = repositories();
    await catalog.updateProductContent({
      code: "review.normal",
      contentStatus: "approved",
      displayName: "Old Title",
      actorUserId: "admin-1",
    });
    expect(pool.revisions.map((row) => row.field)).toEqual(["content_status"]);
  });

  it("rolls back product updates when an audit insert fails", async () => {
    const { catalog, pool } = repositories();
    pool.failAuditField = "display_name";
    await expect(
      catalog.updateProductContent({
        code: "review.normal",
        contentStatus: "approved",
        displayName: "New Title",
        actorUserId: "admin-1",
      }),
    ).rejects.toThrow("audit insert failed");
    expect(pool.rolledBack).toBe(true);
    expect(
      pool.products.find((row) => row.code === "review.normal"),
    ).toMatchObject({
      displayName: "Old Title",
      contentStatus: "copy_review",
      customerSelectable: false,
    });
    expect(pool.revisions).toEqual([]);
  });

  it("makes an approved Hyderabad product selectable", async () => {
    const { catalog } = repositories();
    const updated = await catalog.updateProductContent({
      code: "review.normal",
      contentStatus: "approved",
    });
    expect(updated?.customerSelectable).toBe(true);
    expect(
      nextCustomerSelectable({
        contentStatus: "approved",
        placeholder: false,
        hyderabadAvailable: true,
      }),
    ).toBe(true);
  });

  it("keeps an approved non-Hyderabad product unselectable", async () => {
    const { catalog } = repositories();
    const updated = await catalog.updateProductContent({
      code: "review.nonhyd",
      contentStatus: "approved",
    });
    expect(updated?.customerSelectable).toBe(false);
  });

  it("keeps an approved placeholder unselectable", async () => {
    const { catalog } = repositories();
    const updated = await catalog.updateProductContent({
      code: "review.placeholder",
      contentStatus: "approved",
    });
    expect(updated?.customerSelectable).toBe(false);
  });

  it("keeps rejected or copy-review products unselectable", async () => {
    const { catalog } = repositories();
    const rejected = await catalog.updateProductContent({
      code: "review.normal",
      contentStatus: "rejected",
    });
    expect(rejected?.customerSelectable).toBe(false);
    const copyReview = await catalog.updateProductContent({
      code: "photo.A1",
      contentStatus: "copy_review",
    });
    expect(copyReview?.customerSelectable).toBe(false);
  });

  it("keeps restricted products add-to-plan disabled while remaining visible when approved", () => {
    const parent: CustomerServiceVisibility = {
      active: true,
      customerSelectable: true,
      hyderabadAvailable: true,
      contentStatus: "approved",
    };
    const product: CustomerProductVisibility = {
      active: true,
      customerSelectable: true,
      placeholder: false,
      hyderabadAvailable: true,
      contentStatus: "approved",
      eligibilityFlags: ["vip_only"],
    };
    expect(isCustomerVisibleProduct(product, parent)).toBe(true);
    expect(canAddProductToPlan(product, parent)).toBe(false);
  });
});
