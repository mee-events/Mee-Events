import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(
  process.cwd(),
  "../../infrastructure/postgres/migrations",
);

const REQUIRED_MODULE_TABLES = [
  "vendor_timelines",
  "vendor_activities",
  "worker_timelines",
  "worker_activities",
  "inventory_timelines",
  "inventory_activities",
  "finance_timelines",
  "finance_activities",
  "operations_timelines",
  "operations_activities",
] as const;

const REFERENCE_TABLES = [
  "event_timelines",
  "event_activities",
  "lead_activities",
] as const;

describe("Pattern B consistency probe", () => {
  it("requires module timeline/activity tables in migrations", () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
    const sql = files
      .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
      .join("\n");

    const referencePresent = REFERENCE_TABLES.map((table) => ({
      table,
      present: new RegExp(`CREATE TABLE\\s+${table}\\b`, "i").test(sql),
    }));
    const modulePresent = REQUIRED_MODULE_TABLES.map((table) => ({
      table,
      present: new RegExp(`CREATE TABLE\\s+${table}\\b`, "i").test(sql),
    }));

    const missing = modulePresent
      .filter((row) => !row.present)
      .map((r) => r.table);
    const present = modulePresent
      .filter((row) => row.present)
      .map((r) => r.table);

    expect(referencePresent.every((r) => r.present)).toBe(true);
    expect(missing).toEqual([]);
    expect(present).toHaveLength(REQUIRED_MODULE_TABLES.length);
  });
});
