import { Pool } from "pg";

export const INTEGRATION_DATABASE_NAME = "mee_event_dbint";
export const INTEGRATION_DATABASE_USER = "mee_event_dbint";
const PROJECT_PATTERN = /^mee-dbint-[a-z0-9-]+$/;

export interface IntegrationDatabaseConfig {
  readonly connectionString: string;
  readonly databaseName: string;
  readonly projectName: string;
}

export function requireIntegrationDatabaseConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): IntegrationDatabaseConfig {
  const connectionString = environment.DATABASE_INTEGRATION_URL;
  const databaseName = environment.DATABASE_INTEGRATION_DATABASE;
  const projectName = environment.DATABASE_INTEGRATION_PROJECT;
  if (
    connectionString === undefined ||
    databaseName === undefined ||
    projectName === undefined
  ) {
    throw new Error("Database integration configuration is required");
  }
  if (databaseName !== INTEGRATION_DATABASE_NAME) {
    throw new Error("Database integration database identity is invalid");
  }
  if (!PROJECT_PATTERN.test(projectName) || projectName === "me-event-local") {
    throw new Error("Database integration project identity is invalid");
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Database integration URL is malformed");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Database integration URL must use PostgreSQL");
  }
  if (!isLoopback(url.hostname)) {
    throw new Error("Database integration URL must use a loopback host");
  }
  if (url.pathname !== `/${INTEGRATION_DATABASE_NAME}`) {
    throw new Error("Database integration URL database identity is invalid");
  }
  if (decodeURIComponent(url.username) !== INTEGRATION_DATABASE_USER) {
    throw new Error("Database integration URL user identity is invalid");
  }
  if (url.searchParams.get("application_name") !== projectName) {
    throw new Error("Database integration URL project identity is invalid");
  }

  return { connectionString, databaseName, projectName };
}

export function createIntegrationPool(): Pool {
  const config = requireIntegrationDatabaseConfig();
  return new Pool({
    connectionString: config.connectionString,
    max: 6,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 1_000,
    statement_timeout: 10_000,
  });
}

function isLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}
