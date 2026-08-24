import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "../../infrastructure/postgres");
const META_PATH = join(ROOT, "seeds/catalog-taxonomy-v3.meta.json");
const MIGRATION_PATH = join(ROOT, "migrations/0018_catalog_taxonomy_v3.sql");

interface TaxonomyMeta {
  readonly eventCategories: number;
  readonly eventSelections: number;
  readonly serviceCategories: number;
  readonly subcategories: number;
  readonly products: number;
  readonly parseAnomalies: number;
  readonly service33: string;
  readonly mappedSelections: number;
  readonly requiresDecisionSelections: number;
  readonly niagaraProduct: string;
  readonly femaleAnchorProduct: string;
  readonly magicianProduct: string;
}

function countInsertTuples(sql: string, table: string): number {
  const pattern = new RegExp(
    `INSERT INTO ${table}\\b[\\s\\S]*?VALUES\\s*([\\s\\S]*?);`,
    "gi",
  );
  let total = 0;
  for (const match of sql.matchAll(pattern)) {
    total += [...(match[1] ?? "").matchAll(/^\s*\('/gmu)].length;
  }
  return total;
}

function countRequiresDecision(sql: string): number {
  const pattern =
    /INSERT INTO event_service_selections\b[\s\S]*?VALUES\s*([\s\S]*?);/giu;
  let total = 0;
  for (const match of sql.matchAll(pattern)) {
    total += [...(match[1] ?? "").matchAll(/'requires_decision'/gu)].length;
  }
  return total;
}

describe("catalog taxonomy v3 seed", () => {
  const meta = JSON.parse(readFileSync(META_PATH, "utf8")) as TaxonomyMeta;
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  const subcategoryCount = countInsertTuples(sql, "catalog_subcategories");
  const productCount = countInsertTuples(sql, "catalog_products");
  const selectionCount = countInsertTuples(sql, "event_service_selections");
  const requiresDecisionCount = countRequiresDecision(sql);

  it("derives 237 subcategory rows from the migration SQL", () => {
    expect(subcategoryCount).toBe(237);
  });

  it("derives 974 product rows from the migration SQL", () => {
    expect(productCount).toBe(974);
  });

  it("derives 197 event-selection rows from the migration SQL", () => {
    expect(selectionCount).toBe(197);
  });

  it("derives exactly 22 requires_decision selections from the migration SQL", () => {
    expect(requiresDecisionCount).toBe(22);
  });

  it("includes Niagara Cold Fires once with its parse-anomaly marker", () => {
    const niagaraRows = [
      ...sql.matchAll(
        /^\s*\('special_effects\.A1',[\s\S]*?Niagara Cold Fires[\s\S]*?\),?$/gmu,
      ),
    ];
    expect(niagaraRows).toHaveLength(1);
    expect(sql).toMatch(
      /'special_effects\.A1', 'special_effects', 'special_effects\.A', 'A1', 'Niagara Cold Fires', 'Niagara Cold Fires', 'Niagara Cold Fires', TRUE,/,
    );
  });

  it("includes the normalized missing Mehndi A heading once with heading_missing", () => {
    const headingRows = [
      ...sql.matchAll(
        /^\s*\('mehndi_makeup\.A',[\s\S]*?'heading_missing'[\s\S]*?\),?$/gmu,
      ),
    ];
    expect(headingRows).toHaveLength(1);
    expect([...sql.matchAll(/'heading_missing'/gu)]).toHaveLength(1);
  });

  it("includes festival service #33", () => {
    expect(sql).toContain("indian_festival_event_service");
    expect(sql).toMatch(/display_order = 33/);
    expect(meta.service33).toBe("indian_festival_event_service");
  });

  it("keeps metadata as a secondary consistency check", () => {
    expect(meta.eventCategories).toBe(21);
    expect(meta.eventSelections).toBe(selectionCount);
    expect(meta.serviceCategories).toBe(41);
    expect(meta.subcategories).toBe(subcategoryCount);
    expect(meta.products).toBe(productCount);
    expect(meta.mappedSelections).toBe(175);
    expect(meta.requiresDecisionSelections).toBe(requiresDecisionCount);
    expect(meta.parseAnomalies).toBe(2);
    expect(meta.niagaraProduct).toBe("special_effects.A1");
    expect(meta.femaleAnchorProduct).toBe("entertainment.A2");
    expect(meta.magicianProduct).toBe("entertainment.B2");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS catalog_products\b/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS catalog_subcategories\b/);
    expect(sql).toMatch(
      /CREATE TABLE IF NOT EXISTS event_service_selections\b/,
    );
  });
});
