import { Inject, Injectable } from "@nestjs/common";
import type { PlanItemSnapshot } from "@me-event/api-contracts";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type {
  CatalogMediaCoverageRecord,
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
} from "../ports/catalog-repository";
import {
  customerVisibleProductSql,
  customerVisibleServiceSql,
  customerVisibleSubcategorySql,
  nextCustomerSelectable,
} from "../domain/catalog-customer-visibility";
import {
  isSafeCatalogMediaUrl,
  CatalogMediaValidationError,
  orderedGalleryUrls,
  resolveOccasionCover,
  resolveProductCover,
  resolveServiceCover,
  resolveSubcategoryCover,
} from "../domain/catalog-media";

interface EventTypeRow {
  readonly id: string;
  readonly code: string;
  readonly display_name: string;
  readonly display_order: number;
  readonly active: boolean;
  readonly kind: "occasion" | "service_entry";
  readonly selection_count: string | number;
  readonly cover_image_url: string | null;
  readonly thumbnail_url: string | null;
  readonly cover_alt_text: string | null;
}

interface CatalogRow {
  readonly id: string;
  readonly code: string;
  readonly display_name: string;
  readonly display_order: number;
  readonly active: boolean;
}

interface CatalogServiceRow {
  readonly id: string;
  readonly code: string;
  readonly display_name: string;
  readonly department_code: string;
  readonly entity_kind: "service" | "venue" | "inventory" | "travel";
  readonly icon_url: string | null;
  readonly cover_image_url: string | null;
  readonly thumbnail_url: string | null;
  readonly cover_alt_text: string | null;
  readonly display_order: number;
  readonly active: boolean;
  readonly subcategory_count: string | number;
  readonly product_count: string | number;
}

interface OccasionStageRow {
  readonly id: string;
  readonly code: string;
  readonly display_name: string;
  readonly occasion_code: string;
  readonly typical_day: string | null;
  readonly display_order: number;
  readonly active: boolean;
}

interface SelectionRow {
  readonly source_ordinal: string;
  readonly source_label: string;
  readonly service_code: string | null;
  readonly service_display_name: string | null;
  readonly mapping_status: "mapped" | "requires_decision" | "unmapped";
}

interface SubcategoryRow {
  readonly code: string;
  readonly letter: string;
  readonly display_name: string;
  readonly product_count: string | number;
  readonly display_order: number;
  readonly cover_image_url: string | null;
  readonly thumbnail_url: string | null;
  readonly cover_alt_text: string | null;
}

interface ProductRow {
  readonly code: string;
  readonly display_name: string;
  readonly source_name: string;
  readonly service_code: string;
  readonly subcategory_code: string;
  readonly subcategory_letter: string;
  readonly cover_image_url: string | null;
  readonly thumbnail_url: string | null;
  readonly cover_alt_text: string | null;
  readonly restricted: boolean;
  readonly add_to_plan_allowed: boolean;
  readonly display_order: number;
  readonly version: number;
}

interface ReviewProductRow {
  readonly code: string;
  readonly display_name: string;
  readonly source_name: string;
  readonly service_code: string;
  readonly content_status:
    | "source_imported"
    | "copy_review"
    | "approved"
    | "rejected";
  readonly customer_selectable: boolean;
  readonly placeholder: boolean;
  readonly eligibility_flags: unknown;
  readonly hyderabad_available: boolean;
}

const PUBLIC_MEDIA = `
  active = true
  AND hyderabad_customer_visible = true
  AND review_status = 'approved'
`;

function publicCoverLateral(
  entityType: string,
  codeExpr: string,
  alias: string,
): string {
  const roles =
    entityType === "product"
      ? "('cover', 'gallery', 'icon')"
      : "('cover', 'icon')";
  const roleOrder =
    entityType === "product"
      ? "CASE media_role WHEN 'cover' THEN 0 WHEN 'gallery' THEN 1 ELSE 2 END"
      : "CASE media_role WHEN 'cover' THEN 0 ELSE 1 END";
  return `
  LEFT JOIN LATERAL (
    SELECT media_url, thumbnail_url, alt_text
    FROM catalog_media
    WHERE entity_type = '${entityType}'
      AND entity_code = ${codeExpr}
      AND ${PUBLIC_MEDIA}
      AND media_role IN ${roles}
    ORDER BY ${roleOrder}, display_order
    LIMIT 1
  ) ${alias} ON true`;
}

const SERVICE_CUSTOMER_WHERE = customerVisibleServiceSql("cs");
const PRODUCT_CUSTOMER_WHERE = customerVisibleProductSql("p");
const SUBCATEGORY_CUSTOMER_WHERE = customerVisibleSubcategorySql("sc");

const EVENT_SELECTION_COUNT_SQL = `
         SELECT ess.event_type_code, COUNT(*)::int AS cnt
         FROM event_service_selections ess
         INNER JOIN catalog_services cs ON cs.code = ess.primary_service_code
         WHERE ess.mapping_status = 'mapped'
           AND ${SERVICE_CUSTOMER_WHERE}
         GROUP BY ess.event_type_code
`;

const SERVICE_SELECT = `
  SELECT cs.id, cs.code, cs.display_name, cs.department_code, cs.entity_kind,
         svc_media.media_url AS cover_image_url,
         svc_media.thumbnail_url,
         svc_media.alt_text AS cover_alt_text,
         NULL::text AS icon_url,
         cs.display_order, cs.active,
         COALESCE(sub.cnt, 0) AS subcategory_count,
         COALESCE(prod.cnt, 0) AS product_count
  FROM catalog_services cs
  ${publicCoverLateral("service", "cs.code", "svc_media")}
  LEFT JOIN (
    SELECT sc.service_code, COUNT(*)::int AS cnt
    FROM catalog_subcategories sc
    WHERE ${SUBCATEGORY_CUSTOMER_WHERE}
    GROUP BY sc.service_code
  ) sub ON sub.service_code = cs.code
  LEFT JOIN (
    SELECT p.service_code, COUNT(*)::int AS cnt
    FROM catalog_products p
    WHERE ${PRODUCT_CUSTOMER_WHERE}
    GROUP BY p.service_code
  ) prod ON prod.service_code = cs.code
`;

const PRODUCT_PUBLIC_FROM = `
      SELECT p.code, p.display_name, p.source_name, p.service_code,
             p.subcategory_code, sc.letter AS subcategory_letter,
             COALESCE(prod_media.media_url, sub_media.media_url, svc_media.media_url) AS cover_image_url,
             COALESCE(prod_media.thumbnail_url, sub_media.thumbnail_url, svc_media.thumbnail_url) AS thumbnail_url,
             COALESCE(prod_media.alt_text, sub_media.alt_text, svc_media.alt_text) AS cover_alt_text,
             (jsonb_array_length(p.eligibility_flags) > 0) AS restricted,
             (p.customer_selectable AND jsonb_array_length(p.eligibility_flags) = 0) AS add_to_plan_allowed,
             p.display_order, p.version
      FROM catalog_products p
      INNER JOIN catalog_subcategories sc ON sc.code = p.subcategory_code
      INNER JOIN catalog_services cs ON cs.code = p.service_code
      ${publicCoverLateral("product", "p.code", "prod_media")}
      ${publicCoverLateral("subcategory", "p.subcategory_code", "sub_media")}
      ${publicCoverLateral("service", "p.service_code", "svc_media")}
`;

const PRODUCT_PUBLIC_WHERE = `
  ${PRODUCT_CUSTOMER_WHERE}
  AND ${SERVICE_CUSTOMER_WHERE}
  AND ${SUBCATEGORY_CUSTOMER_WHERE}
`;

const REVIEW_PRODUCT_SELECT = `
      SELECT code, display_name, source_name, service_code, content_status,
             customer_selectable, placeholder, eligibility_flags, hyderabad_available
      FROM catalog_products
`;

const MEDIA_SELECT = `
  SELECT id, entity_type, entity_code, media_url, thumbnail_url, media_role,
         display_order, alt_text, review_status, active, hyderabad_customer_visible,
         source_kind, source_ref, licence_note, version
  FROM catalog_media
`;

interface CatalogMediaRow {
  readonly id: string;
  readonly entity_type: CatalogMediaRecord["entityType"];
  readonly entity_code: string;
  readonly media_url: string;
  readonly thumbnail_url: string | null;
  readonly media_role: CatalogMediaRecord["mediaRole"];
  readonly display_order: number;
  readonly alt_text: string;
  readonly review_status: CatalogMediaRecord["reviewStatus"];
  readonly active: boolean;
  readonly hyderabad_customer_visible: boolean;
  readonly source_kind: CatalogMediaRecord["sourceKind"];
  readonly source_ref: string | null;
  readonly licence_note: string | null;
  readonly version: number;
}

function auditEntityType(
  entityType: CatalogMediaRecord["entityType"],
): "event_type" | "service" | "subcategory" | "product" {
  return entityType === "occasion" ? "event_type" : entityType;
}

export function assertCatalogMediaApproval(input: {
  readonly reviewStatus: CatalogMediaRecord["reviewStatus"];
  readonly sourceKind: CatalogMediaRecord["sourceKind"];
  readonly sourceRef: string | null;
  readonly licenceNote: string | null;
}): void {
  if (input.reviewStatus !== "approved") {
    return;
  }
  if (input.sourceKind === "unspecified") {
    throw new CatalogMediaValidationError(
      "unspecified media cannot be approved",
    );
  }
  if (input.sourceKind === "licensed") {
    const sourceRef = input.sourceRef?.trim() ?? "";
    const licenceNote = input.licenceNote?.trim() ?? "";
    if (sourceRef.length < 3 || licenceNote.length < 3) {
      throw new CatalogMediaValidationError(
        "Licensed media requires source reference and licence note before approval",
      );
    }
  }
}

function asAuditValue(value: string | number | boolean | null): string | null {
  if (value === null) {
    return null;
  }
  return String(value);
}

function mediaFieldChanges(
  existing: {
    readonly media_url: string;
    readonly thumbnail_url: string | null;
    readonly display_order: number;
    readonly alt_text: string;
    readonly review_status: string;
    readonly active: boolean;
    readonly hyderabad_customer_visible: boolean;
    readonly source_kind: string;
    readonly source_ref: string | null;
    readonly licence_note: string | null;
  },
  next: {
    readonly media_url: string;
    readonly thumbnail_url: string | null;
    readonly display_order: number;
    readonly alt_text: string;
    readonly review_status: string;
    readonly active: boolean;
    readonly hyderabad_customer_visible: boolean;
    readonly source_kind: string;
    readonly source_ref: string | null;
    readonly licence_note: string | null;
  },
): readonly {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}[] {
  const pairs: ReadonlyArray<
    readonly [
      string,
      string | number | boolean | null,
      string | number | boolean | null,
    ]
  > = [
    ["media_url", existing.media_url, next.media_url],
    ["thumbnail_url", existing.thumbnail_url, next.thumbnail_url],
    ["alt_text", existing.alt_text, next.alt_text],
    ["display_order", existing.display_order, next.display_order],
    ["review_status", existing.review_status, next.review_status],
    ["active", existing.active, next.active],
    [
      "hyderabad_customer_visible",
      existing.hyderabad_customer_visible,
      next.hyderabad_customer_visible,
    ],
    ["source_kind", existing.source_kind, next.source_kind],
    ["source_ref", existing.source_ref, next.source_ref],
    ["licence_note", existing.licence_note, next.licence_note],
  ];
  return pairs
    .filter(([, oldValue, newValue]) => oldValue !== newValue)
    .map(([field, oldValue, newValue]) => ({
      field,
      oldValue: asAuditValue(oldValue),
      newValue: asAuditValue(newValue),
    }));
}

async function insertMediaFieldRevisions(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  input: {
    readonly entityType: CatalogMediaRecord["entityType"];
    readonly entityCode: string;
    readonly actorUserId?: string;
    readonly reason?: string;
    readonly changes: readonly {
      readonly field: string;
      readonly oldValue: string | null;
      readonly newValue: string | null;
    }[];
  },
): Promise<void> {
  for (const change of input.changes) {
    await client.query(
      `INSERT INTO catalog_content_revisions (
         entity_type, entity_code, field, old_value, new_value, actor_user_id, reason
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auditEntityType(input.entityType),
        input.entityCode,
        change.field,
        change.oldValue,
        change.newValue,
        input.actorUserId ?? null,
        input.reason ?? null,
      ],
    );
  }
}

export function planCoverLifecycle(input: {
  readonly mediaRole: CatalogMediaRecord["mediaRole"];
  readonly existingActive: boolean;
  readonly existingReviewStatus: CatalogMediaRecord["reviewStatus"];
  readonly nextReviewStatus: CatalogMediaRecord["reviewStatus"];
  readonly requestedActive?: boolean;
}): { readonly active: boolean; readonly promote: boolean } {
  if (input.requestedActive === false) {
    return { active: false, promote: false };
  }
  if (input.mediaRole !== "cover") {
    return {
      active:
        input.requestedActive === undefined
          ? input.existingActive
          : input.requestedActive,
      promote: false,
    };
  }
  const becomingApproved =
    input.existingReviewStatus !== "approved" &&
    input.nextReviewStatus === "approved";
  const explicitReactivate =
    input.existingReviewStatus === "approved" &&
    input.nextReviewStatus === "approved" &&
    !input.existingActive &&
    input.requestedActive === true;
  if (becomingApproved || explicitReactivate) {
    return { active: true, promote: true };
  }
  return {
    active:
      input.requestedActive === undefined
        ? input.existingActive
        : input.requestedActive,
    promote: false,
  };
}

const COVER_LOCK_SQL = `${MEDIA_SELECT}
           WHERE entity_type = $1 AND entity_code = $2 AND media_role = 'cover'
           ORDER BY id
           FOR UPDATE`;

@Injectable()
export class PostgresCatalogRepository implements CatalogRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async listEventTypes(): Promise<readonly EventTypeRecord[]> {
    const result = await this.pool.query<EventTypeRow>(
      `SELECT et.id, et.code, et.display_name, et.display_order, et.active,
              COALESCE(et.kind, 'occasion') AS kind,
              COALESCE(sel.cnt, 0) AS selection_count,
              occ_media.media_url AS cover_image_url,
              occ_media.thumbnail_url,
              occ_media.alt_text AS cover_alt_text
       FROM event_types et
       LEFT JOIN (
${EVENT_SELECTION_COUNT_SQL}
       ) sel ON sel.event_type_code = et.code
       ${publicCoverLateral("occasion", "et.code", "occ_media")}
       WHERE et.active
       ORDER BY et.display_order, et.display_name`,
    );
    return result.rows.map(toEventTypeRecord);
  }

  public async listServiceCategories(): Promise<
    readonly ServiceCategoryRecord[]
  > {
    const result = await this.pool.query<CatalogRow>(
      `SELECT id, code, display_name, display_order, active
       FROM service_categories
       WHERE active
       ORDER BY display_order, display_name`,
    );
    return result.rows.map(toCategoryRecord);
  }

  public async findEventTypeByCode(
    code: string,
  ): Promise<EventTypeRecord | undefined> {
    const result = await this.pool.query<EventTypeRow>(
      `SELECT et.id, et.code, et.display_name, et.display_order, et.active,
              COALESCE(et.kind, 'occasion') AS kind,
              COALESCE(sel.cnt, 0) AS selection_count,
              occ_media.media_url AS cover_image_url,
              occ_media.thumbnail_url,
              occ_media.alt_text AS cover_alt_text
       FROM event_types et
       LEFT JOIN (
${EVENT_SELECTION_COUNT_SQL}
       ) sel ON sel.event_type_code = et.code
       ${publicCoverLateral("occasion", "et.code", "occ_media")}
       WHERE et.code = $1 AND et.active`,
      [code],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toEventTypeRecord(row);
  }

  public async listCatalogServices(
    departmentCode?: string,
  ): Promise<readonly CatalogServiceRecord[]> {
    const params: unknown[] = [];
    let query = `${SERVICE_SELECT} WHERE ${SERVICE_CUSTOMER_WHERE}`;
    if (departmentCode) {
      params.push(departmentCode);
      query += ` AND cs.department_code = $${params.length}`;
    }
    query += ` ORDER BY cs.display_order, cs.display_name`;
    const result = await this.pool.query<CatalogServiceRow>(query, params);
    return result.rows.map(toCatalogServiceRecord);
  }

  public async listOccasionStages(
    occasionCode: string,
  ): Promise<readonly OccasionStageRecord[]> {
    const result = await this.pool.query<OccasionStageRow>(
      `SELECT id, code, display_name, occasion_code, typical_day, display_order, active
       FROM occasion_stages
       WHERE active = true AND occasion_code = $1
       ORDER BY display_order, display_name`,
      [occasionCode],
    );
    return result.rows.map(toOccasionStageRecord);
  }

  public async listServicesForOccasion(
    occasionCode: string,
  ): Promise<readonly CatalogServiceRecord[]> {
    const result = await this.pool.query<CatalogServiceRow>(
      `${SERVICE_SELECT}
       INNER JOIN service_occasion_affinity soa ON cs.code = soa.service_code
       WHERE ${SERVICE_CUSTOMER_WHERE} AND soa.occasion_code = $1
       ORDER BY soa.relevance_order, cs.display_name`,
      [occasionCode],
    );
    return result.rows.map(toCatalogServiceRecord);
  }

  public async findCatalogServiceByCode(
    code: string,
  ): Promise<CatalogServiceRecord | undefined> {
    const result = await this.pool.query<CatalogServiceRow>(
      `${SERVICE_SELECT} WHERE ${SERVICE_CUSTOMER_WHERE} AND cs.code = $1`,
      [code],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toCatalogServiceRecord(row);
  }

  public async listSelectionsForEvent(
    eventTypeCode: string,
  ): Promise<readonly EventSelectionRecord[]> {
    const result = await this.pool.query<SelectionRow>(
      `SELECT ess.source_ordinal, ess.source_label, ess.primary_service_code AS service_code,
              cs.display_name AS service_display_name, ess.mapping_status
       FROM event_service_selections ess
       INNER JOIN catalog_services cs ON cs.code = ess.primary_service_code
       WHERE ess.event_type_code = $1
         AND ess.mapping_status = 'mapped'
         AND ess.primary_service_code IS NOT NULL
         AND ${SERVICE_CUSTOMER_WHERE}
       ORDER BY ess.relevance_order, ess.source_ordinal`,
      [eventTypeCode],
    );
    return result.rows.map((row) => ({
      sourceOrdinal: row.source_ordinal,
      sourceLabel: row.source_label,
      serviceCode: row.service_code,
      serviceDisplayName: row.service_display_name,
      mappingStatus: row.mapping_status,
    }));
  }

  public async listSubcategories(
    serviceCode: string,
  ): Promise<readonly ServiceSubcategoryRecord[]> {
    const result = await this.pool.query<SubcategoryRow>(
      `SELECT sc.code, sc.letter, sc.display_name, sc.display_order,
              COALESCE(prod.cnt, 0) AS product_count,
              COALESCE(sub_media.media_url, svc_media.media_url) AS cover_image_url,
              COALESCE(sub_media.thumbnail_url, svc_media.thumbnail_url) AS thumbnail_url,
              COALESCE(sub_media.alt_text, svc_media.alt_text) AS cover_alt_text
       FROM catalog_subcategories sc
       INNER JOIN catalog_services cs ON cs.code = sc.service_code
       ${publicCoverLateral("subcategory", "sc.code", "sub_media")}
       ${publicCoverLateral("service", "sc.service_code", "svc_media")}
       LEFT JOIN (
         SELECT p.subcategory_code, COUNT(*)::int AS cnt
         FROM catalog_products p
         INNER JOIN catalog_services pcs ON pcs.code = p.service_code
         WHERE ${PRODUCT_CUSTOMER_WHERE}
           AND ${customerVisibleServiceSql("pcs")}
         GROUP BY p.subcategory_code
       ) prod ON prod.subcategory_code = sc.code
       WHERE sc.service_code = $1
         AND ${SUBCATEGORY_CUSTOMER_WHERE}
         AND ${SERVICE_CUSTOMER_WHERE}
       ORDER BY sc.display_order, sc.letter`,
      [serviceCode],
    );
    return result.rows.map((row) => ({
      code: row.code,
      letter: row.letter,
      displayName: row.display_name,
      productCount: Number(row.product_count),
      displayOrder: row.display_order,
      coverImageUrl: resolveSubcategoryCover({
        subcategoryCover: row.cover_image_url,
      }),
      thumbnailUrl: row.thumbnail_url,
      coverAltText: row.cover_alt_text,
    }));
  }

  public async listProducts(input: {
    readonly serviceCode: string;
    readonly subcategoryLetter?: string;
  }): Promise<readonly CatalogProductRecord[]> {
    const params: unknown[] = [input.serviceCode];
    let query = `
      ${PRODUCT_PUBLIC_FROM}
      WHERE p.service_code = $1 AND ${PRODUCT_PUBLIC_WHERE}
    `;
    if (input.subcategoryLetter) {
      params.push(input.subcategoryLetter);
      query += ` AND sc.letter = $${params.length}`;
    }
    query += ` ORDER BY sc.display_order, p.display_order, p.source_code`;
    const result = await this.pool.query<ProductRow>(query, params);
    return result.rows.map((row) => toProductRecord(row));
  }

  public async findProductByCode(
    code: string,
  ): Promise<CatalogProductRecord | undefined> {
    const result = await this.pool.query<ProductRow>(
      `${PRODUCT_PUBLIC_FROM}
       WHERE p.code = $1 AND ${PRODUCT_PUBLIC_WHERE}`,
      [code],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }
    const gallery = await this.listPublicGallery("product", code);
    return toProductRecord(row, gallery);
  }

  public async resolvePlanItems(
    items: readonly {
      readonly productCode: string;
      readonly displayName?: string;
      readonly serviceCode?: string;
    }[],
  ): Promise<readonly PlanItemSnapshot[]> {
    if (items.length === 0) {
      return [];
    }
    const codes = items.map((item) => item.productCode);
    const result = await this.pool.query<ProductRow>(
      `${PRODUCT_PUBLIC_FROM}
       WHERE p.code = ANY($1::text[]) AND ${PRODUCT_PUBLIC_WHERE}`,
      [codes],
    );
    const byCode = new Map(result.rows.map((row) => [row.code, row]));
    const resolved: PlanItemSnapshot[] = [];
    for (const item of items) {
      const row = byCode.get(item.productCode);
      if (row === undefined || row.restricted || !row.add_to_plan_allowed) {
        continue;
      }
      resolved.push({
        productCode: row.code,
        displayName: row.display_name,
        serviceCode: row.service_code,
        catalogVersion: row.version,
      });
    }
    return resolved;
  }

  public async listReviewProducts(): Promise<
    readonly CatalogReviewProductRecord[]
  > {
    const result = await this.pool.query<ReviewProductRow>(
      `${REVIEW_PRODUCT_SELECT}
       ORDER BY content_status, service_code, source_code`,
    );
    return result.rows.map(toReviewRecord);
  }

  public async updateProductContent(input: {
    readonly code: string;
    readonly contentStatus:
      | "source_imported"
      | "copy_review"
      | "approved"
      | "rejected";
    readonly displayName?: string;
    readonly actorUserId?: string;
    readonly reason?: string;
  }): Promise<CatalogReviewProductRecord | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<ReviewProductRow>(
        `${REVIEW_PRODUCT_SELECT} WHERE code = $1 FOR UPDATE`,
        [input.code],
      );
      const existing = current.rows[0];
      if (existing === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      const nextName = input.displayName ?? existing.display_name;
      const nameChanged = nextName !== existing.display_name;
      const statusChanged = input.contentStatus !== existing.content_status;
      const selectable = nextCustomerSelectable({
        contentStatus: input.contentStatus,
        placeholder: existing.placeholder,
        hyderabadAvailable: existing.hyderabad_available,
      });
      await client.query(
        `UPDATE catalog_products
         SET content_status = $2,
             display_name = $3,
             customer_selectable = $4,
             version = version + 1
         WHERE code = $1`,
        [input.code, input.contentStatus, nextName, selectable],
      );
      if (statusChanged) {
        await client.query(
          `INSERT INTO catalog_content_revisions (
             entity_type, entity_code, field, old_value, new_value, actor_user_id, reason
           ) VALUES ('product', $1, 'content_status', $2, $3, $4, $5)`,
          [
            input.code,
            existing.content_status,
            input.contentStatus,
            input.actorUserId ?? null,
            input.reason ?? null,
          ],
        );
      }
      if (nameChanged) {
        await client.query(
          `INSERT INTO catalog_content_revisions (
             entity_type, entity_code, field, old_value, new_value, actor_user_id, reason
           ) VALUES ('product', $1, 'display_name', $2, $3, $4, $5)`,
          [
            input.code,
            existing.display_name,
            nextName,
            input.actorUserId ?? null,
            input.reason ?? null,
          ],
        );
      }
      await client.query("COMMIT");
      const updated = await this.pool.query<ReviewProductRow>(
        `${REVIEW_PRODUCT_SELECT} WHERE code = $1`,
        [input.code],
      );
      const row = updated.rows[0];
      return row === undefined ? undefined : toReviewRecord(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listReviewMedia(input?: {
    readonly entityType?: CatalogMediaRecord["entityType"];
    readonly entityCode?: string;
  }): Promise<readonly CatalogMediaRecord[]> {
    const params: unknown[] = [];
    let where = "TRUE";
    if (input?.entityType) {
      params.push(input.entityType);
      where += ` AND entity_type = $${params.length}`;
    }
    if (input?.entityCode) {
      params.push(input.entityCode);
      where += ` AND entity_code = $${params.length}`;
    }
    const result = await this.pool.query<CatalogMediaRow>(
      `${MEDIA_SELECT} WHERE ${where}
       ORDER BY entity_type, entity_code, media_role, display_order`,
      params,
    );
    return result.rows.map(toMediaRecord);
  }

  public async upsertCatalogMedia(input: {
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
  }): Promise<CatalogMediaRecord> {
    if (!isSafeCatalogMediaUrl(input.mediaUrl)) {
      throw new CatalogMediaValidationError("Invalid media URL");
    }
    if (
      input.thumbnailUrl !== undefined &&
      input.thumbnailUrl !== null &&
      !isSafeCatalogMediaUrl(input.thumbnailUrl)
    ) {
      throw new CatalogMediaValidationError("Invalid thumbnail URL");
    }
    const exists = await this.entityExists(input.entityType, input.entityCode);
    if (!exists) {
      throw new CatalogMediaValidationError("Unsupported entity code");
    }
    const reviewStatus = input.reviewStatus ?? "draft";
    const sourceKind = input.sourceKind ?? "unspecified";
    const sourceRef = input.sourceRef ?? null;
    const licenceNote = input.licenceNote ?? null;
    assertCatalogMediaApproval({
      reviewStatus,
      sourceKind,
      sourceRef,
      licenceNote,
    });
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let insertActive = input.active ?? true;
      if (input.mediaRole === "cover") {
        const locked = await client.query<CatalogMediaRow>(COVER_LOCK_SQL, [
          input.entityType,
          input.entityCode,
        ]);
        const activeCovers = locked.rows.filter((row) => row.active);
        const approvedActive = activeCovers.find(
          (row) => row.review_status === "approved",
        );
        if (approvedActive && reviewStatus === "approved") {
          throw new CatalogMediaValidationError(
            "Approved cover already exists; submit a draft replacement then approve it",
          );
        }
        if (activeCovers.length > 0) {
          insertActive = false;
        }
      }
      const result = await client.query<CatalogMediaRow>(
        `INSERT INTO catalog_media (
           entity_type, entity_code, media_url, thumbnail_url, media_role,
           display_order, alt_text, review_status, active,
           hyderabad_customer_visible, source_kind, source_ref, licence_note,
           created_by_user_id, updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
         RETURNING *`,
        [
          input.entityType,
          input.entityCode,
          input.mediaUrl.trim(),
          input.thumbnailUrl === undefined || input.thumbnailUrl === null
            ? null
            : input.thumbnailUrl.trim(),
          input.mediaRole,
          input.displayOrder ?? 0,
          input.altText.trim(),
          reviewStatus,
          insertActive,
          input.hyderabadCustomerVisible ?? true,
          sourceKind,
          sourceRef,
          licenceNote,
          input.actorUserId ?? null,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new CatalogMediaValidationError(
          "Media write did not return a row",
        );
      }
      await insertMediaFieldRevisions(client, {
        entityType: input.entityType,
        entityCode: input.entityCode,
        ...(input.actorUserId === undefined
          ? {}
          : { actorUserId: input.actorUserId }),
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        changes: mediaFieldChanges(
          {
            media_url: "",
            thumbnail_url: null,
            display_order: 0,
            alt_text: "",
            review_status: "draft",
            active: false,
            hyderabad_customer_visible: false,
            source_kind: "unspecified",
            source_ref: null,
            licence_note: null,
          },
          row,
        ).filter(
          (change) => change.newValue !== null && change.newValue !== "",
        ),
      });
      await client.query("COMMIT");
      return toMediaRecord(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateCatalogMedia(input: {
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
  }): Promise<CatalogMediaRecord | undefined> {
    if (
      input.mediaUrl !== undefined &&
      !isSafeCatalogMediaUrl(input.mediaUrl)
    ) {
      throw new CatalogMediaValidationError("Invalid media URL");
    }
    if (
      input.thumbnailUrl !== undefined &&
      input.thumbnailUrl !== null &&
      !isSafeCatalogMediaUrl(input.thumbnailUrl)
    ) {
      throw new CatalogMediaValidationError("Invalid thumbnail URL");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const identity = await client.query<{
        entity_type: CatalogMediaRecord["entityType"];
        entity_code: string;
        media_role: CatalogMediaRecord["mediaRole"];
      }>(
        `SELECT entity_type, entity_code, media_role
         FROM catalog_media
         WHERE id = $1`,
        [input.id],
      );
      const identityRow = identity.rows[0];
      if (identityRow === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      let existing: CatalogMediaRow | undefined;
      let lockedCovers: readonly CatalogMediaRow[] = [];
      if (identityRow.media_role === "cover") {
        const locked = await client.query<CatalogMediaRow>(COVER_LOCK_SQL, [
          identityRow.entity_type,
          identityRow.entity_code,
        ]);
        lockedCovers = locked.rows;
        existing = locked.rows.find((row) => row.id === input.id);
      } else {
        const current = await client.query<CatalogMediaRow>(
          `${MEDIA_SELECT} WHERE id = $1 FOR UPDATE`,
          [input.id],
        );
        existing = current.rows[0];
      }
      if (existing === undefined) {
        await client.query("ROLLBACK");
        return undefined;
      }
      const next: {
        media_url: string;
        thumbnail_url: string | null;
        display_order: number;
        alt_text: string;
        review_status: CatalogMediaRecord["reviewStatus"];
        active: boolean;
        hyderabad_customer_visible: boolean;
        source_kind: CatalogMediaRecord["sourceKind"];
        source_ref: string | null;
        licence_note: string | null;
      } = {
        media_url:
          input.mediaUrl === undefined
            ? existing.media_url
            : input.mediaUrl.trim(),
        thumbnail_url:
          input.thumbnailUrl === undefined
            ? existing.thumbnail_url
            : input.thumbnailUrl === null
              ? null
              : input.thumbnailUrl.trim(),
        display_order:
          input.displayOrder === undefined
            ? existing.display_order
            : input.displayOrder,
        alt_text:
          input.altText === undefined ? existing.alt_text : input.altText,
        review_status:
          input.reviewStatus === undefined
            ? existing.review_status
            : input.reviewStatus,
        active: input.active === undefined ? existing.active : input.active,
        hyderabad_customer_visible:
          input.hyderabadCustomerVisible === undefined
            ? existing.hyderabad_customer_visible
            : input.hyderabadCustomerVisible,
        source_kind:
          input.sourceKind === undefined
            ? existing.source_kind
            : input.sourceKind,
        source_ref:
          input.sourceRef === undefined ? existing.source_ref : input.sourceRef,
        licence_note:
          input.licenceNote === undefined
            ? existing.licence_note
            : input.licenceNote,
      };
      assertCatalogMediaApproval({
        reviewStatus: next.review_status,
        sourceKind: next.source_kind,
        sourceRef: next.source_ref,
        licenceNote: next.licence_note,
      });
      const lifecycle = planCoverLifecycle({
        mediaRole: existing.media_role,
        existingActive: existing.active,
        existingReviewStatus: existing.review_status,
        nextReviewStatus: next.review_status,
        ...(input.active === undefined
          ? {}
          : { requestedActive: input.active }),
      });
      next.active = lifecycle.active;
      if (lifecycle.promote) {
        for (const cover of lockedCovers) {
          if (cover.id === existing.id || !cover.active) {
            continue;
          }
          await client.query(
            `UPDATE catalog_media
             SET active = false, updated_by_user_id = $2, version = version + 1
             WHERE id = $1`,
            [cover.id, input.actorUserId ?? null],
          );
          await insertMediaFieldRevisions(client, {
            entityType: existing.entity_type,
            entityCode: existing.entity_code,
            ...(input.actorUserId === undefined
              ? {}
              : { actorUserId: input.actorUserId }),
            ...(input.reason === undefined ? {} : { reason: input.reason }),
            changes: [
              {
                field: "active",
                oldValue: asAuditValue(true),
                newValue: asAuditValue(false),
              },
            ],
          });
        }
      }
      const changes = mediaFieldChanges(existing, next);
      if (changes.length === 0) {
        await client.query("COMMIT");
        return toMediaRecord(existing);
      }
      await client.query(
        `UPDATE catalog_media
         SET media_url = $2,
             thumbnail_url = $3,
             display_order = $4,
             alt_text = $5,
             review_status = $6,
             active = $7,
             hyderabad_customer_visible = $8,
             source_kind = $9,
             source_ref = $10,
             licence_note = $11,
             updated_by_user_id = $12,
             version = version + 1
         WHERE id = $1`,
        [
          input.id,
          next.media_url,
          next.thumbnail_url,
          next.display_order,
          next.alt_text,
          next.review_status,
          next.active,
          next.hyderabad_customer_visible,
          next.source_kind,
          next.source_ref,
          next.licence_note,
          input.actorUserId ?? null,
        ],
      );
      await insertMediaFieldRevisions(client, {
        entityType: existing.entity_type,
        entityCode: existing.entity_code,
        ...(input.actorUserId === undefined
          ? {}
          : { actorUserId: input.actorUserId }),
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        changes,
      });
      await client.query("COMMIT");
      const updated = await client.query<CatalogMediaRow>(
        `${MEDIA_SELECT} WHERE id = $1`,
        [input.id],
      );
      const row = updated.rows[0];
      return row === undefined ? undefined : toMediaRecord(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async listMediaCoverage(): Promise<CatalogMediaCoverageRecord> {
    const result = await this.pool.query<{
      occasions_total: string | number;
      occasions_cover: string | number;
      services_total: string | number;
      services_cover: string | number;
      sub_total: string | number;
      sub_cover: string | number;
      sub_inherited: string | number;
      prod_total: string | number;
      prod_cover: string | number;
      prod_inherited: string | number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM event_types WHERE active) AS occasions_total,
        (SELECT COUNT(DISTINCT entity_code) FROM catalog_media
          WHERE entity_type = 'occasion' AND media_role = 'cover' AND ${PUBLIC_MEDIA}) AS occasions_cover,
        (SELECT COUNT(*) FROM catalog_services WHERE active) AS services_total,
        (SELECT COUNT(DISTINCT entity_code) FROM catalog_media
          WHERE entity_type = 'service' AND media_role IN ('cover','icon') AND ${PUBLIC_MEDIA}) AS services_cover,
        (SELECT COUNT(*) FROM catalog_subcategories WHERE active) AS sub_total,
        (SELECT COUNT(DISTINCT entity_code) FROM catalog_media
          WHERE entity_type = 'subcategory' AND media_role = 'cover' AND ${PUBLIC_MEDIA}) AS sub_cover,
        (SELECT COUNT(*) FROM catalog_subcategories sc
          WHERE sc.active AND EXISTS (
            SELECT 1 FROM catalog_media cm
            WHERE cm.entity_type = 'service' AND cm.entity_code = sc.service_code
              AND cm.media_role IN ('cover','icon')
              AND cm.active = true
              AND cm.hyderabad_customer_visible = true
              AND cm.review_status = 'approved'
          ) AND NOT EXISTS (
            SELECT 1 FROM catalog_media cm2
            WHERE cm2.entity_type = 'subcategory' AND cm2.entity_code = sc.code
              AND cm2.media_role = 'cover' AND cm2.active AND cm2.hyderabad_customer_visible AND cm2.review_status = 'approved'
          )) AS sub_inherited,
        (SELECT COUNT(*) FROM catalog_products WHERE active) AS prod_total,
        (SELECT COUNT(DISTINCT entity_code) FROM catalog_media
          WHERE entity_type = 'product' AND media_role IN ('cover','gallery') AND ${PUBLIC_MEDIA}) AS prod_cover,
        (SELECT COUNT(*) FROM catalog_products p
          WHERE p.active AND NOT EXISTS (
            SELECT 1 FROM catalog_media cm
            WHERE cm.entity_type = 'product' AND cm.entity_code = p.code
              AND cm.media_role IN ('cover','gallery') AND cm.active AND cm.hyderabad_customer_visible AND cm.review_status = 'approved'
          ) AND (
            EXISTS (
              SELECT 1 FROM catalog_media cm
              WHERE cm.entity_type = 'subcategory' AND cm.entity_code = p.subcategory_code
                AND cm.media_role = 'cover' AND cm.active AND cm.hyderabad_customer_visible AND cm.review_status = 'approved'
            ) OR EXISTS (
              SELECT 1 FROM catalog_media cm
              WHERE cm.entity_type = 'service' AND cm.entity_code = p.service_code
                AND cm.media_role IN ('cover','icon') AND cm.active AND cm.hyderabad_customer_visible AND cm.review_status = 'approved'
            )
          )) AS prod_inherited
    `);
    const row = result.rows[0];
    if (row === undefined) {
      return {
        occasions: { total: 0, withApprovedCover: 0 },
        services: { total: 0, withApprovedCover: 0 },
        subcategories: {
          total: 0,
          withApprovedCover: 0,
          withInheritedCover: 0,
        },
        products: { total: 0, withApprovedCover: 0, withInheritedCover: 0 },
      };
    }
    return {
      occasions: {
        total: Number(row.occasions_total),
        withApprovedCover: Number(row.occasions_cover),
      },
      services: {
        total: Number(row.services_total),
        withApprovedCover: Number(row.services_cover),
      },
      subcategories: {
        total: Number(row.sub_total),
        withApprovedCover: Number(row.sub_cover),
        withInheritedCover: Number(row.sub_inherited),
      },
      products: {
        total: Number(row.prod_total),
        withApprovedCover: Number(row.prod_cover),
        withInheritedCover: Number(row.prod_inherited),
      },
    };
  }

  private async entityExists(
    entityType: CatalogMediaRecord["entityType"],
    entityCode: string,
  ): Promise<boolean> {
    const table =
      entityType === "occasion"
        ? "event_types"
        : entityType === "service"
          ? "catalog_services"
          : entityType === "subcategory"
            ? "catalog_subcategories"
            : "catalog_products";
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM ${table} WHERE code = $1) AS exists`,
      [entityCode],
    );
    return result.rows[0]?.exists === true;
  }

  private async listPublicGallery(
    entityType: "product",
    entityCode: string,
  ): Promise<readonly string[]> {
    const result = await this.pool.query<{
      media_url: string;
      display_order: number;
    }>(
      `SELECT media_url, display_order
       FROM catalog_media
       WHERE entity_type = $1 AND entity_code = $2 AND media_role = 'gallery'
         AND ${PUBLIC_MEDIA}
       ORDER BY display_order`,
      [entityType, entityCode],
    );
    return orderedGalleryUrls(
      result.rows.map((row) => ({
        url: row.media_url,
        displayOrder: row.display_order,
      })),
    );
  }
}

function toEventTypeRecord(row: EventTypeRow): EventTypeRecord {
  return {
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    displayOrder: row.display_order,
    active: row.active,
    kind: row.kind,
    selectionCount: Number(row.selection_count),
    coverImageUrl: resolveOccasionCover({ occasionCover: row.cover_image_url }),
    thumbnailUrl: row.thumbnail_url,
    coverAltText: row.cover_alt_text,
  };
}

function toCategoryRecord(row: CatalogRow): ServiceCategoryRecord {
  return {
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    displayOrder: row.display_order,
    active: row.active,
  };
}

function toCatalogServiceRecord(row: CatalogServiceRow): CatalogServiceRecord {
  return {
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    departmentCode: row.department_code,
    entityKind: row.entity_kind,
    iconUrl: resolveServiceCover({ serviceIcon: row.icon_url }),
    coverImageUrl: resolveServiceCover({
      serviceCover: row.cover_image_url,
      serviceIcon: row.icon_url,
    }),
    thumbnailUrl: row.thumbnail_url,
    coverAltText: row.cover_alt_text,
    displayOrder: row.display_order,
    active: row.active,
    subcategoryCount: Number(row.subcategory_count),
    productCount: Number(row.product_count),
  };
}

function toOccasionStageRecord(row: OccasionStageRow): OccasionStageRecord {
  return {
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    occasionCode: row.occasion_code,
    typicalDay: row.typical_day,
    displayOrder: row.display_order,
    active: row.active,
  };
}

function toProductRecord(
  row: ProductRow,
  gallery: readonly string[] = [],
): CatalogProductRecord {
  const coverImageUrl = resolveProductCover({
    productCover: row.cover_image_url,
    productGallery: gallery,
  });
  return {
    code: row.code,
    displayName: row.display_name,
    sourceName: row.source_name,
    serviceCode: row.service_code,
    subcategoryCode: row.subcategory_code,
    subcategoryLetter: row.subcategory_letter,
    coverImageUrl,
    thumbnailUrl: row.thumbnail_url,
    coverAltText: row.cover_alt_text,
    restricted: row.restricted,
    addToPlanAllowed: row.add_to_plan_allowed,
    displayOrder: row.display_order,
    description: null,
    gallery,
    version: row.version,
  };
}

function toMediaRecord(row: CatalogMediaRow): CatalogMediaRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityCode: row.entity_code,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    mediaRole: row.media_role,
    displayOrder: row.display_order,
    altText: row.alt_text,
    reviewStatus: row.review_status,
    active: row.active,
    hyderabadCustomerVisible: row.hyderabad_customer_visible,
    sourceKind: row.source_kind,
    sourceRef: row.source_ref,
    licenceNote: row.licence_note,
    version: row.version,
  };
}

function toReviewRecord(row: ReviewProductRow): CatalogReviewProductRecord {
  const flags = Array.isArray(row.eligibility_flags)
    ? row.eligibility_flags.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  return {
    code: row.code,
    displayName: row.display_name,
    sourceName: row.source_name,
    serviceCode: row.service_code,
    contentStatus: row.content_status,
    customerSelectable: row.customer_selectable,
    placeholder: row.placeholder,
    eligibilityFlags: flags,
  };
}
