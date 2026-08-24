import { Inject, Injectable } from "@nestjs/common";
import type { SearchHit, SearchResultType } from "@me-event/api-contracts";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  customerVisibleProductSql,
  customerVisibleServiceSql,
  customerVisibleSubcategorySql,
} from "../../catalog/domain/catalog-customer-visibility";
import { scoreMatch } from "../application/search-ranking";

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
    SELECT COALESCE(thumbnail_url, media_url) AS media_url
    FROM catalog_media
    WHERE entity_type = '${entityType}'
      AND entity_code = ${codeExpr}
      AND ${PUBLIC_MEDIA}
      AND media_role IN ${roles}
    ORDER BY ${roleOrder}, display_order
    LIMIT 1
  ) ${alias} ON true`;
}

interface MatchRow {
  readonly id: string;
  readonly code: string;
  readonly display_name: string;
  readonly subtitle: string | null;
  readonly image_url: string | null;
  readonly similarity: number;
  readonly parent_occasion_code?: string | null;
  readonly parent_occasion_name?: string | null;
}

@Injectable()
export class PostgresSearchRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async resolveAliasTerms(query: string): Promise<readonly string[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) {
      return [];
    }
    const result = await this.pool.query<{
      alias: string;
      canonical_code: string;
    }>(
      `SELECT alias, canonical_code
       FROM catalog_aliases
       WHERE lower(alias) = $1
          OR alias ILIKE $2
          OR similarity(alias, $1) >= 0.4
       ORDER BY similarity(alias, $1) DESC
       LIMIT 12`,
      [normalized, `%${normalized}%`],
    );
    const terms = new Set<string>([normalized]);
    for (const row of result.rows) {
      terms.add(row.alias.toLowerCase());
      terms.add(row.canonical_code.toLowerCase().replace(/_/gu, " "));
    }
    return [...terms];
  }

  public async searchOccasions(
    terms: readonly string[],
    limit: number,
  ): Promise<readonly SearchHit[]> {
    const patterns = terms.map((t) => `%${t}%`);
    if (patterns.length === 0) {
      return [];
    }
    const result = await this.pool.query<MatchRow>(
      `SELECT et.id::text AS id,
              et.code,
              et.display_name,
              'Occasion'::text AS subtitle,
              occ_media.media_url AS image_url,
              GREATEST(similarity(et.display_name, $1), 0) AS similarity
       FROM event_types et
       ${publicCoverLateral("occasion", "et.code", "occ_media")}
       WHERE et.active
         AND (
           et.display_name ILIKE ANY($2::text[])
           OR et.code ILIKE ANY($2::text[])
           OR similarity(et.display_name, $1) >= 0.35
         )
       ORDER BY similarity DESC, et.display_order, et.display_name
       LIMIT $3`,
      [terms[0] ?? "", patterns, limit],
    );
    return result.rows.map((row) =>
      toHit(row, "occasion", terms[0] ?? "", "Occasion"),
    );
  }

  public async searchCategories(
    terms: readonly string[],
    limit: number,
  ): Promise<readonly SearchHit[]> {
    return this.searchNamedTable({
      table: "service_categories",
      type: "category",
      subtitle: "Category",
      terms,
      limit,
    });
  }

  public async searchStages(
    terms: readonly string[],
    limit: number,
  ): Promise<readonly SearchHit[]> {
    const patterns = terms.map((t) => `%${t}%`);
    if (patterns.length === 0) {
      return [];
    }
    const result = await this.pool.query<MatchRow>(
      `SELECT os.id::text AS id,
              os.code,
              os.display_name,
              'Function or ceremony'::text AS subtitle,
              NULL::text AS image_url,
              et.code AS parent_occasion_code,
              et.display_name AS parent_occasion_name,
              GREATEST(similarity(os.display_name, $1), 0) AS similarity
       FROM occasion_stages os
       INNER JOIN event_types et
         ON et.code = os.occasion_code
        AND et.active
       WHERE os.active
         AND (
           os.display_name ILIKE ANY($2::text[])
           OR os.code ILIKE ANY($2::text[])
           OR similarity(os.display_name, $1) >= 0.35
         )
       ORDER BY similarity DESC, os.display_order, os.display_name
       LIMIT $3`,
      [terms[0] ?? "", patterns, limit],
    );
    return result.rows.map((row) =>
      toHit(row, "stage", terms[0] ?? "", row.subtitle, {
        parentOccasionCode: row.parent_occasion_code ?? null,
        parentOccasionName: row.parent_occasion_name ?? null,
      }),
    );
  }

  public async searchServices(
    terms: readonly string[],
    limit: number,
    entityKind?: "service" | "venue" | "inventory" | "travel",
  ): Promise<readonly SearchHit[]> {
    const patterns = terms.map((t) => `%${t}%`);
    if (patterns.length === 0) {
      return [];
    }
    const type: SearchResultType =
      entityKind === "venue"
        ? "venue"
        : entityKind === undefined
          ? "service"
          : entityKind === "inventory"
            ? "other"
            : "service";
    const subtitle =
      entityKind === "venue"
        ? "Venue"
        : entityKind === "inventory"
          ? "Rental"
          : entityKind === "travel"
            ? "Travel"
            : "Service";

    const result = await this.pool.query<MatchRow>(
      `SELECT cs.id::text AS id,
              cs.code,
              cs.display_name,
              $4::text AS subtitle,
              svc_media.media_url AS image_url,
              GREATEST(similarity(cs.display_name, $1), 0) AS similarity
       FROM catalog_services cs
       ${publicCoverLateral("service", "cs.code", "svc_media")}
       WHERE ${customerVisibleServiceSql("cs")}
         AND ($5::text IS NULL OR cs.entity_kind = $5)
         AND (
           cs.display_name ILIKE ANY($2::text[])
           OR cs.code ILIKE ANY($2::text[])
           OR COALESCE(cs.source_alias, '') ILIKE ANY($2::text[])
           OR similarity(cs.display_name, $1) >= 0.35
         )
       ORDER BY similarity DESC, cs.display_order, cs.display_name
       LIMIT $3`,
      [terms[0] ?? "", patterns, limit, subtitle, entityKind ?? null],
    );
    return result.rows.map((row) =>
      toHit(row, type, terms[0] ?? "", row.subtitle),
    );
  }

  public async searchProducts(
    terms: readonly string[],
    limit: number,
  ): Promise<readonly SearchHit[]> {
    const patterns = terms.map((t) => `%${t}%`);
    if (patterns.length === 0) {
      return [];
    }
    const result = await this.pool.query<MatchRow>(
      `SELECT p.id::text AS id,
              p.code,
              p.display_name,
              ('Product \u00b7 ' || cs.display_name) AS subtitle,
              COALESCE(
                prod_media.media_url,
                sub_media.media_url,
                svc_media.media_url
              ) AS image_url,
              GREATEST(
                similarity(p.display_name, $1),
                similarity(p.source_name, $1),
                0
              ) AS similarity
       FROM catalog_products p
       INNER JOIN catalog_services cs ON cs.code = p.service_code
       INNER JOIN catalog_subcategories sc ON sc.code = p.subcategory_code
       ${publicCoverLateral("product", "p.code", "prod_media")}
       ${publicCoverLateral("subcategory", "p.subcategory_code", "sub_media")}
       ${publicCoverLateral("service", "p.service_code", "svc_media")}
        WHERE ${customerVisibleProductSql("p")}
          AND ${customerVisibleServiceSql("cs")}
          AND ${customerVisibleSubcategorySql("sc")}
          AND (
           p.display_name ILIKE ANY($2::text[])
           OR p.source_name ILIKE ANY($2::text[])
           OR COALESCE(p.source_alias, '') ILIKE ANY($2::text[])
           OR p.code ILIKE ANY($2::text[])
           OR similarity(p.display_name, $1) >= 0.35
           OR similarity(p.source_name, $1) >= 0.35
         )
       ORDER BY similarity DESC, p.display_order, p.display_name
       LIMIT $3`,
      [terms[0] ?? "", patterns, limit],
    );
    return result.rows.map((row) =>
      toHit(row, "product", terms[0] ?? "", row.subtitle),
    );
  }

  public async listTrendingTerms(): Promise<readonly string[]> {
    const result = await this.pool.query<{ term: string }>(
      `SELECT term
       FROM search_trending_terms
       WHERE active
       ORDER BY display_order, term
       LIMIT 20`,
    );
    return result.rows.map((row) => row.term);
  }

  private async searchNamedTable(input: {
    readonly table: "event_types" | "service_categories";
    readonly type: SearchResultType;
    readonly subtitle: string;
    readonly terms: readonly string[];
    readonly limit: number;
  }): Promise<readonly SearchHit[]> {
    const patterns = input.terms.map((t) => `%${t}%`);
    if (patterns.length === 0) {
      return [];
    }
    const result = await this.pool.query<MatchRow>(
      `SELECT id::text AS id,
              code,
              display_name,
              $4::text AS subtitle,
              NULL::text AS image_url,
              GREATEST(similarity(display_name, $1), 0) AS similarity
       FROM ${input.table}
       WHERE active
         AND (
           display_name ILIKE ANY($2::text[])
           OR code ILIKE ANY($2::text[])
           OR similarity(display_name, $1) >= 0.35
         )
       ORDER BY similarity DESC, display_order, display_name
       LIMIT $3`,
      [input.terms[0] ?? "", patterns, input.limit, input.subtitle],
    );
    return result.rows.map((row) =>
      toHit(row, input.type, input.terms[0] ?? "", input.subtitle),
    );
  }
}

function toHit(
  row: MatchRow,
  type: SearchResultType,
  query: string,
  subtitle: string | null,
  parent?: {
    readonly parentOccasionCode: string | null;
    readonly parentOccasionName: string | null;
  },
): SearchHit {
  return {
    id: row.id,
    code: row.code,
    type,
    name: row.display_name,
    subtitle,
    imageUrl: row.image_url,
    score: scoreMatch({
      name: row.display_name,
      query,
      type,
      similarity: row.similarity,
    }),
    ...(parent === undefined
      ? {}
      : {
          parentOccasionCode: parent.parentOccasionCode,
          parentOccasionName: parent.parentOccasionName,
        }),
  };
}
