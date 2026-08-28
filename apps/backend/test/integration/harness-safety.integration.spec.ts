import { afterAll, beforeAll, describe, expect, it } from "vitest";
import integrationConfig from "../vitest.integration.config";
import unitConfig from "../vitest.unit.config";
import {
  INTEGRATION_DATABASE_NAME,
  createIntegrationPool,
  requireIntegrationDatabaseConfig,
} from "./support/database";
import type { Pool } from "pg";

describe("DBINT-01 harness safety", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("fails closed on missing, non-loopback, and wrong identity configuration without connecting", () => {
    expect(() => requireIntegrationDatabaseConfig({})).toThrow(
      "configuration is required",
    );

    const base = {
      DATABASE_INTEGRATION_DATABASE: INTEGRATION_DATABASE_NAME,
      DATABASE_INTEGRATION_PROJECT: "mee-dbint-safety",
    };
    expect(() =>
      requireIntegrationDatabaseConfig({
        ...base,
        DATABASE_INTEGRATION_URL:
          "postgresql://mee_event_dbint:synthetic@database.example.invalid/mee_event_dbint?application_name=mee-dbint-safety",
      }),
    ).toThrow("loopback host");
    expect(() =>
      requireIntegrationDatabaseConfig({
        ...base,
        DATABASE_INTEGRATION_PROJECT: "me-event-local",
        DATABASE_INTEGRATION_URL:
          "postgresql://mee_event_dbint:synthetic@127.0.0.1:6543/mee_event_dbint?application_name=me-event-local",
      }),
    ).toThrow("project identity");
    expect(() =>
      requireIntegrationDatabaseConfig({
        ...base,
        DATABASE_INTEGRATION_DATABASE: "me_event_dev",
        DATABASE_INTEGRATION_URL:
          "postgresql://mee_event_dbint:synthetic@127.0.0.1:6543/me_event_dev?application_name=mee-dbint-safety",
      }),
    ).toThrow("database identity");
  });

  it("keeps unit and integration discovery explicit and disjoint", () => {
    expect(unitConfig.test?.include).toEqual(["test/**/*.spec.ts"]);
    expect(unitConfig.test?.exclude).toContain("test/integration/**");
    expect(integrationConfig.test?.include).toEqual([
      "test/integration/**/*.integration.spec.ts",
    ]);
    expect(integrationConfig.test?.passWithNoTests).not.toBe(true);
    expect(integrationConfig.test?.fileParallelism).toBe(false);
    expect(integrationConfig.test?.maxWorkers).toBe(1);
  });

  it("connects only to the marked PostgreSQL 17.2 database with all migrations", async () => {
    const config = requireIntegrationDatabaseConfig();
    const result = await pool.query<{
      database_name: string;
      project_name: string;
      version: string;
      migration_count: number;
      migration_checksum_count: number;
    }>(
      `SELECT current_database() AS database_name,
              identity.project_name,
              current_setting('server_version') AS version,
              (SELECT count(*)::int FROM schema_migrations) AS migration_count,
              (SELECT count(*)::int FROM schema_migrations
                WHERE checksum ~ '^[0-9a-f]{64}$') AS migration_checksum_count
       FROM database_integration_identity identity`,
    );
    expect(result.rows[0]).toMatchObject({
      database_name: config.databaseName,
      project_name: config.projectName,
      migration_count: 20,
      migration_checksum_count: 20,
    });
    expect(result.rows[0]?.version).toMatch(/^17\.2/);
  });
});

describe("DBINT-14 cleanup and leak contract", () => {
  it("closes a bounded probe pool with no remaining clients or waiters", async () => {
    const probe = createIntegrationPool();
    await probe.query(`SELECT 1 AS ready`);
    await probe.end();
    expect(probe.totalCount).toBe(0);
    expect(probe.idleCount).toBe(0);
    expect(probe.waitingCount).toBe(0);
  });
});
