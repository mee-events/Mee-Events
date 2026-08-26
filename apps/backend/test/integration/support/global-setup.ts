import {
  createIntegrationPool,
  requireIntegrationDatabaseConfig,
} from "./database";

export default async function setup(): Promise<void> {
  const config = requireIntegrationDatabaseConfig();
  const pool = createIntegrationPool();
  try {
    const identity = await pool.query<{
      current_database: string;
      server_version: string;
      project_name: string;
      database_name: string;
    }>(
      `SELECT current_database(), current_setting('server_version') AS server_version,
              identity.project_name, identity.database_name
       FROM database_integration_identity identity`,
    );
    const row = identity.rows[0];
    if (
      row === undefined ||
      row.current_database !== config.databaseName ||
      row.database_name !== config.databaseName ||
      row.project_name !== config.projectName ||
      !row.server_version.startsWith("17.2")
    ) {
      throw new Error("Database integration runtime identity is invalid");
    }

    const ledger = await pool.query<{
      count: number;
      first: string;
      last: string;
    }>(
      `SELECT count(*)::int AS count, min(filename) AS first, max(filename) AS last
       FROM schema_migrations`,
    );
    const migration = ledger.rows[0];
    if (
      migration?.count !== 20 ||
      migration.first !== "0001_platform_foundation.sql" ||
      migration.last !== "0020_catalog_media.sql"
    ) {
      throw new Error("Database integration migration ledger is invalid");
    }
  } finally {
    await pool.end();
  }
}
