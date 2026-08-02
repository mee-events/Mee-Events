export interface EventTypeRecord {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
  readonly active: boolean;
}

export interface ServiceCategoryRecord {
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
  readonly active: boolean;
}

export const CATALOG_REPOSITORY = Symbol("CATALOG_REPOSITORY");

export interface CatalogRepository {
  listEventTypes(): Promise<readonly EventTypeRecord[]>;
  listServiceCategories(): Promise<readonly ServiceCategoryRecord[]>;
  findEventTypeByCode(code: string): Promise<EventTypeRecord | undefined>;
}
