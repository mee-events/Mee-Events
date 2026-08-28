import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIntegrationPool } from "./support/database";
import type { Pool } from "pg";

const migrationsDirectory = resolve(
  process.cwd(),
  "../../infrastructure/postgres/migrations",
);

describe("SEC-M-09 migration ledger integrity", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("records the exact SHA-256 of every ordered migration", async () => {
    const expected = readdirSync(migrationsDirectory)
      .filter((filename) => filename.endsWith(".sql"))
      .sort()
      .map((filename) => ({
        filename,
        checksum: createHash("sha256")
          .update(readFileSync(resolve(migrationsDirectory, filename)))
          .digest("hex"),
      }));
    const result = await pool.query<{
      filename: string;
      checksum: string;
    }>(
      `SELECT filename, checksum
       FROM schema_migrations
       ORDER BY filename`,
    );

    expect(result.rows).toEqual(expected);
  });

  it("enforces a non-null validated SHA-256 ledger constraint", async () => {
    const result = await pool.query<{
      isNullable: string;
      constraintValidated: boolean;
      constraintDefinition: string;
    }>(
      `SELECT column_info.is_nullable AS "isNullable",
              constraint_info.convalidated AS "constraintValidated",
              pg_get_constraintdef(constraint_info.oid) AS "constraintDefinition"
       FROM information_schema.columns column_info
       JOIN pg_constraint constraint_info
         ON constraint_info.conrelid = 'schema_migrations'::regclass
        AND constraint_info.conname = 'schema_migrations_checksum_sha256_check'
       WHERE column_info.table_schema = 'public'
         AND column_info.table_name = 'schema_migrations'
         AND column_info.column_name = 'checksum'`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      isNullable: "NO",
      constraintValidated: true,
    });
    expect(result.rows[0]?.constraintDefinition).toContain("[0-9a-f]{64}");
  });
});
