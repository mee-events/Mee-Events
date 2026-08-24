import type { PlanItemSnapshot } from "@me-event/api-contracts";

export interface EventTypeRecord {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
  readonly active: boolean;
  readonly kind: "occasion" | "service_entry";
  readonly selectionCount: number;
  readonly coverImageUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly coverAltText: string | null;
}

export interface ServiceCategoryRecord {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
  readonly active: boolean;
}

export interface CatalogServiceRecord {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly departmentCode: string;
  readonly entityKind: "service" | "venue" | "inventory" | "travel";
  readonly displayOrder: number;
  readonly iconUrl: string | null;
  readonly coverImageUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly coverAltText: string | null;
  readonly active: boolean;
  readonly subcategoryCount: number;
  readonly productCount: number;
}

export interface OccasionStageRecord {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly occasionCode: string;
  readonly typicalDay: string | null;
  readonly displayOrder: number;
  readonly active: boolean;
}

export interface EventSelectionRecord {
  readonly sourceOrdinal: string;
  readonly sourceLabel: string;
  readonly serviceCode: string | null;
  readonly serviceDisplayName: string | null;
  readonly mappingStatus: "mapped" | "requires_decision" | "unmapped";
}

export interface ServiceSubcategoryRecord {
  readonly code: string;
  readonly letter: string;
  readonly displayName: string;
  readonly productCount: number;
  readonly displayOrder: number;
  readonly coverImageUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly coverAltText: string | null;
}

export interface CatalogProductRecord {
  readonly code: string;
  readonly displayName: string;
  readonly sourceName: string;
  readonly serviceCode: string;
  readonly subcategoryCode: string;
  readonly subcategoryLetter: string;
  readonly coverImageUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly coverAltText: string | null;
  readonly restricted: boolean;
  readonly addToPlanAllowed: boolean;
  readonly displayOrder: number;
  readonly description: string | null;
  readonly gallery: readonly string[];
  readonly version: number;
}

export interface CatalogReviewProductRecord {
  readonly code: string;
  readonly displayName: string;
  readonly sourceName: string;
  readonly serviceCode: string;
  readonly contentStatus:
    | "source_imported"
    | "copy_review"
    | "approved"
    | "rejected";
  readonly customerSelectable: boolean;
  readonly placeholder: boolean;
  readonly eligibilityFlags: readonly string[];
}

export interface CatalogMediaRecord {
  readonly id: string;
  readonly entityType: "occasion" | "service" | "subcategory" | "product";
  readonly entityCode: string;
  readonly mediaUrl: string;
  readonly thumbnailUrl: string | null;
  readonly mediaRole: "cover" | "gallery" | "icon";
  readonly displayOrder: number;
  readonly altText: string;
  readonly reviewStatus: "draft" | "in_review" | "approved" | "rejected";
  readonly active: boolean;
  readonly hyderabadCustomerVisible: boolean;
  readonly sourceKind: "internal" | "licensed" | "bundle_asset" | "unspecified";
  readonly sourceRef: string | null;
  readonly licenceNote: string | null;
  readonly version: number;
}

export interface CatalogMediaCoverageRecord {
  readonly occasions: {
    readonly total: number;
    readonly withApprovedCover: number;
  };
  readonly services: {
    readonly total: number;
    readonly withApprovedCover: number;
  };
  readonly subcategories: {
    readonly total: number;
    readonly withApprovedCover: number;
    readonly withInheritedCover: number;
  };
  readonly products: {
    readonly total: number;
    readonly withApprovedCover: number;
    readonly withInheritedCover: number;
  };
}

export const CATALOG_REPOSITORY = Symbol("CATALOG_REPOSITORY");

export interface CatalogRepository {
  listEventTypes(): Promise<readonly EventTypeRecord[]>;
  listServiceCategories(): Promise<readonly ServiceCategoryRecord[]>;
  findEventTypeByCode(code: string): Promise<EventTypeRecord | undefined>;
  listCatalogServices(
    departmentCode?: string,
  ): Promise<readonly CatalogServiceRecord[]>;
  listOccasionStages(
    occasionCode: string,
  ): Promise<readonly OccasionStageRecord[]>;
  listServicesForOccasion(
    occasionCode: string,
  ): Promise<readonly CatalogServiceRecord[]>;
  findCatalogServiceByCode(
    code: string,
  ): Promise<CatalogServiceRecord | undefined>;
  listSelectionsForEvent(
    eventTypeCode: string,
  ): Promise<readonly EventSelectionRecord[]>;
  listSubcategories(
    serviceCode: string,
  ): Promise<readonly ServiceSubcategoryRecord[]>;
  listProducts(input: {
    readonly serviceCode: string;
    readonly subcategoryLetter?: string;
  }): Promise<readonly CatalogProductRecord[]>;
  findProductByCode(code: string): Promise<CatalogProductRecord | undefined>;
  resolvePlanItems(
    items: readonly {
      readonly productCode: string;
      readonly displayName?: string;
      readonly serviceCode?: string;
    }[],
  ): Promise<readonly PlanItemSnapshot[]>;
  listReviewProducts(): Promise<readonly CatalogReviewProductRecord[]>;
  updateProductContent(input: {
    readonly code: string;
    readonly contentStatus:
      | "source_imported"
      | "copy_review"
      | "approved"
      | "rejected";
    readonly displayName?: string;
    readonly actorUserId?: string;
    readonly reason?: string;
  }): Promise<CatalogReviewProductRecord | undefined>;
  listReviewMedia(input?: {
    readonly entityType?: CatalogMediaRecord["entityType"];
    readonly entityCode?: string;
  }): Promise<readonly CatalogMediaRecord[]>;
  upsertCatalogMedia(input: {
    readonly entityType: CatalogMediaRecord["entityType"];
    readonly entityCode: string;
    readonly mediaUrl: string;
    readonly thumbnailUrl?: string | null;
    readonly mediaRole: CatalogMediaRecord["mediaRole"];
    readonly displayOrder?: number;
    readonly altText: string;
    readonly reviewStatus?: CatalogMediaRecord["reviewStatus"];
    readonly active?: boolean;
    readonly hyderabadCustomerVisible?: boolean;
    readonly sourceKind?: CatalogMediaRecord["sourceKind"];
    readonly sourceRef?: string | null;
    readonly licenceNote?: string | null;
    readonly actorUserId?: string;
    readonly reason?: string;
  }): Promise<CatalogMediaRecord>;
  updateCatalogMedia(input: {
    readonly id: string;
    readonly mediaUrl?: string;
    readonly thumbnailUrl?: string | null;
    readonly displayOrder?: number;
    readonly altText?: string;
    readonly reviewStatus?: CatalogMediaRecord["reviewStatus"];
    readonly active?: boolean;
    readonly hyderabadCustomerVisible?: boolean;
    readonly sourceKind?: CatalogMediaRecord["sourceKind"];
    readonly sourceRef?: string | null;
    readonly licenceNote?: string | null;
    readonly actorUserId?: string;
    readonly reason?: string;
  }): Promise<CatalogMediaRecord | undefined>;
  listMediaCoverage(): Promise<CatalogMediaCoverageRecord>;
}
