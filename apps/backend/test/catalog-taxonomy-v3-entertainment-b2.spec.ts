import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "../../infrastructure/postgres");
const MIGRATION_0018 = join(ROOT, "migrations/0018_catalog_taxonomy_v3.sql");
const MIGRATION_0019 = join(
  ROOT,
  "migrations/0019_fix_entertainment_b2_collision.sql",
);

function productCodesFromSql(sql: string): string[] {
  const pattern =
    /INSERT INTO catalog_products\b[\s\S]*?VALUES\s*([\s\S]*?);/giu;
  const codes: string[] = [];
  for (const match of sql.matchAll(pattern)) {
    const values = match[1] ?? "";
    for (const tuple of values.matchAll(/^\s*\('([^']+)'/gmu)) {
      const code = tuple[1];
      if (code !== undefined) {
        codes.push(code);
      }
    }
  }
  return codes;
}

function duplicateCodes(codes: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const code of codes) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return new Map([...counts.entries()].filter(([, count]) => count > 1));
}

describe("catalog taxonomy v3 entertainment.B2 correction", () => {
  const sql0018 = readFileSync(MIGRATION_0018, "utf8");
  const sql0019 = readFileSync(MIGRATION_0019, "utf8");
  const productCodes = productCodesFromSql(sql0018);
  const duplicates = duplicateCodes(productCodes);

  it("records exactly one duplicated product code in 0018: entertainment.B2", () => {
    expect(productCodes).toHaveLength(974);
    expect([...duplicates.keys()]).toEqual(["entertainment.B2"]);
    expect(duplicates.get("entertainment.B2")).toBe(2);
  });

  it("keeps both Female Anchor and Magician tuples under entertainment.B2 in 0018", () => {
    const female = [
      ...sql0018.matchAll(
        /^\s*\('entertainment\.B2', 'entertainment', 'entertainment\.A', 'B2', 'Female Anchor',/gmu,
      ),
    ];
    const magician = [
      ...sql0018.matchAll(
        /^\s*\('entertainment\.B2', 'entertainment', 'entertainment\.B', 'B2', 'Magician',/gmu,
      ),
    ];
    expect(female).toHaveLength(1);
    expect(magician).toHaveLength(1);
  });

  it("keeps Niagara Cold Fires parse-anomaly markup once in 0018", () => {
    expect(sql0018).toMatch(
      /'special_effects\.A1', 'special_effects', 'special_effects\.A', 'A1', 'Niagara Cold Fires', 'Niagara Cold Fires', 'Niagara Cold Fires', TRUE,/,
    );
  });

  it("renames Female Anchor to entertainment.A2 with provenance in 0019", () => {
    expect(sql0019).toMatch(/SET code = 'entertainment\.A2'/);
    expect(sql0019).toMatch(/source_code = 'A2'/);
    expect(sql0019).toMatch(/source_alias = 'B2\. Female Anchor'/);
    expect(sql0019).toMatch(/parse_anomaly = true/);
    expect(sql0019).toMatch(
      /WHERE code = 'entertainment\.B2'\s+AND subcategory_code = 'entertainment\.A'\s+AND source_name = 'Female Anchor'/s,
    );
  });

  it("inserts Magician at entertainment.B2 under entertainment.B in 0019", () => {
    expect(sql0019).toMatch(
      /'entertainment\.B2',\s*'entertainment',\s*'entertainment\.B',\s*'B2',\s*'Magician',\s*'Magician',\s*'Magician'/s,
    );
  });

  it("fails closed without hiding conflicts or dropping uniqueness", () => {
    expect(sql0019).not.toMatch(/ON CONFLICT DO NOTHING/i);
    expect(sql0019).not.toMatch(/DROP CONSTRAINT/i);
    expect(sql0019).toMatch(/RAISE EXCEPTION/i);
    expect(sql0019).toMatch(/product_rows <> 974 OR distinct_codes <> 974/);
  });
});
