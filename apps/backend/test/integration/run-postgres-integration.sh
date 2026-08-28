#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--" ]]; then
  shift
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPOSITORY_DIR="$(cd "$BACKEND_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
MIGRATIONS_DIR="$REPOSITORY_DIR/infrastructure/postgres/migrations"

DATABASE_NAME="mee_event_dbint"
LEGACY_DATABASE_NAME="mee_event_dbint_legacy"
DATABASE_USER="mee_event_dbint"
DATABASE_PASSWORD="mee-dbint-local-only"
PROJECT_NAME="${MEE_DBINT_PROJECT_NAME:-mee-dbint-$$-$(date +%s)}"
POSTGRES_PORT="${MEE_DBINT_PORT:-}"
CLEANUP_ARMED=0
MIGRATION_PROBE_DIR=""

fail() {
  echo "STAB-15 integration harness: $1" >&2
  exit 1
}

if [[ ! "$PROJECT_NAME" =~ ^mee-dbint-[a-z0-9-]+$ ]]; then
  fail "project name must match mee-dbint-[a-z0-9-]+"
fi
if [[ "$PROJECT_NAME" == "me-event-local" ]]; then
  fail "the development Compose project is forbidden"
fi

if [[ -z "$POSTGRES_PORT" ]]; then
  POSTGRES_PORT="$(node -e 'const net=require("node:net");const server=net.createServer();server.listen(0,"127.0.0.1",()=>{const address=server.address();if(address===null||typeof address==="string")process.exit(1);process.stdout.write(String(address.port));server.close();});')"
fi
if [[ ! "$POSTGRES_PORT" =~ ^[0-9]+$ ]] || (( POSTGRES_PORT < 1024 || POSTGRES_PORT > 65535 )); then
  fail "PostgreSQL port must be an unused non-privileged TCP port"
fi

export MEE_DBINT_DATABASE="$DATABASE_NAME"
export MEE_DBINT_USER="$DATABASE_USER"
export MEE_DBINT_PASSWORD="$DATABASE_PASSWORD"
export MEE_DBINT_PORT="$POSTGRES_PORT"

compose() {
  docker compose --project-name "$PROJECT_NAME" --file "$COMPOSE_FILE" "$@"
}

cleanup() {
  local exit_status=$?
  if [[ -n "$MIGRATION_PROBE_DIR" && -d "$MIGRATION_PROBE_DIR" ]]; then
    case "$MIGRATION_PROBE_DIR" in
      "${TMPDIR:-/tmp}"/mee-events-sec-m09.*)
        rm -rf -- "$MIGRATION_PROBE_DIR"
        ;;
    esac
  fi
  if (( CLEANUP_ARMED == 1 )); then
    compose down --volumes --remove-orphans >/dev/null 2>&1 || true
    local remaining_containers remaining_networks remaining_volumes
    remaining_containers="$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT_NAME")"
    remaining_networks="$(docker network ls -q --filter "label=com.docker.compose.project=$PROJECT_NAME")"
    remaining_volumes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT_NAME")"
    if [[ -n "$remaining_containers$remaining_networks$remaining_volumes" ]]; then
      echo "STAB-15 integration harness: scoped cleanup incomplete for $PROJECT_NAME" >&2
      exit_status=1
    fi
  fi
  exit "$exit_status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

existing_containers="$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT_NAME")"
existing_networks="$(docker network ls -q --filter "label=com.docker.compose.project=$PROJECT_NAME")"
existing_volumes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT_NAME")"
if [[ -n "$existing_containers$existing_networks$existing_volumes" ]]; then
  fail "refusing pre-existing resources for project $PROJECT_NAME"
fi

effective_project="$(compose config --format json | node -e 'let data="";process.stdin.setEncoding("utf8");process.stdin.on("data",chunk=>data+=chunk);process.stdin.on("end",()=>{const config=JSON.parse(data);process.stdout.write(String(config.name??""));});')"
if [[ "$effective_project" != "$PROJECT_NAME" ]]; then
  fail "effective Compose project identity does not match the requested project"
fi

CLEANUP_ARMED=1
compose up --detach postgres >/dev/null

container_project="$(compose ps --quiet postgres | xargs docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}')"
container_guard="$(compose ps --quiet postgres | xargs docker inspect --format '{{ index .Config.Labels "com.mee-events.database-integration" }}')"
if [[ "$container_project" != "$PROJECT_NAME" || "$container_guard" != "true" ]]; then
  fail "started container does not carry the exact integration identity"
fi

ready=0
for _attempt in {1..60}; do
  if compose exec --no-TTY postgres pg_isready --username "$DATABASE_USER" --dbname "$DATABASE_NAME" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if (( ready != 1 )); then
  fail "PostgreSQL did not become ready within 60 seconds"
fi

psql_database_exec() {
  local database="$1"
  shift
  compose exec --no-TTY postgres psql \
    --username "$DATABASE_USER" \
    --dbname "$database" \
    --set ON_ERROR_STOP=1 \
    --quiet \
    "$@"
}

psql_exec() {
  psql_database_exec "$DATABASE_NAME" "$@"
}

export LC_ALL=C
MIGRATION_DATABASE="$DATABASE_NAME"
migration_psql() {
  psql_database_exec "$MIGRATION_DATABASE" "$@"
}
. "$REPOSITORY_DIR/infrastructure/postgres/migration-runner.sh"

# Prove the canonical runner applies the complete catalog to an empty database.
run_migrations "$MIGRATIONS_DIR"

# Preserve the verified legacy pre-ledger path in a second isolated database.
compose exec --no-TTY postgres createdb --username "$DATABASE_USER" "$LEGACY_DATABASE_NAME"
MIGRATION_DATABASE="$LEGACY_DATABASE_NAME"
migration_psql < "$MIGRATIONS_DIR/0001_platform_foundation.sql" >/dev/null
migration_psql --command "DROP TRIGGER audit_events_reject_delete ON audit_events;"
if run_migrations "$MIGRATIONS_DIR" >/dev/null 2>&1; then
  fail "migration runner baselined an incomplete legacy foundation"
fi
migration_psql --command "CREATE TRIGGER audit_events_reject_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();"
run_migrations "$MIGRATIONS_DIR"
legacy_ledger="$(migration_psql --tuples-only --no-align --command "SELECT count(*)::text || '|' || count(*) FILTER (WHERE checksum ~ '^[0-9a-f]{64}$') FROM schema_migrations;")"
if [[ "$legacy_ledger" != "20|20" ]]; then
  fail "legacy migration ledger identity check failed"
fi
MIGRATION_DATABASE="$DATABASE_NAME"
compose exec --no-TTY postgres dropdb --username "$DATABASE_USER" "$LEGACY_DATABASE_NAME"

# Prove an old filename-only ledger is upgraded and fully backfilled.
psql_exec --command "ALTER TABLE schema_migrations
  DROP CONSTRAINT schema_migrations_checksum_sha256_check;
  ALTER TABLE schema_migrations DROP COLUMN checksum;"
run_migrations "$MIGRATIONS_DIR" >/dev/null

ledger="$(psql_exec --tuples-only --no-align --command "SELECT count(*)::text || '|' || min(filename) || '|' || max(filename) || '|' || count(*) FILTER (WHERE checksum ~ '^[0-9a-f]{64}$') FROM schema_migrations;")"
if [[ "$ledger" != "20|0001_platform_foundation.sql|0020_catalog_media.sql|20" ]]; then
  fail "migration ledger identity check failed"
fi

# A changed checksum must stop the runner before it applies anything.
original_checksum="$(psql_exec --tuples-only --no-align --command "SELECT checksum FROM schema_migrations WHERE filename = '0020_catalog_media.sql';")"
psql_exec --command "UPDATE schema_migrations SET checksum = repeat('0', 64) WHERE filename = '0020_catalog_media.sql';"
if run_migrations "$MIGRATIONS_DIR" >/dev/null 2>&1; then
  fail "migration runner accepted a changed applied checksum"
fi
psql_exec --command "UPDATE schema_migrations SET checksum = '$original_checksum' WHERE filename = '0020_catalog_media.sql';"

# Terminating the database session after a test-owned write but before COMMIT
# must roll back both the write and the checksum ledger row.
MIGRATION_PROBE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mee-events-sec-m09.XXXXXX")"
for migration in "$MIGRATIONS_DIR"/*.sql; do
  cp "$migration" "$MIGRATION_PROBE_DIR/$(basename "$migration")"
done
cp "$SCRIPT_DIR/fixtures/0021_sec_m09_crash_probe.sql" "$MIGRATION_PROBE_DIR/0021_sec_m09_crash_probe.sql"
if run_migrations "$MIGRATION_PROBE_DIR" >/dev/null 2>&1; then
  fail "migration runner did not fail when its database session terminated"
fi
crash_probe="$(psql_exec --tuples-only --no-align --command "SELECT
  (to_regclass('public.sec_m09_crash_probe') IS NULL)::text || '|' ||
  (NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = '0021_sec_m09_crash_probe.sql'))::text;")"
if [[ "$crash_probe" != "true|true" ]]; then
  fail "terminated migration left schema or ledger state behind"
fi
rm -rf -- "$MIGRATION_PROBE_DIR"
MIGRATION_PROBE_DIR=""

psql_exec --command "CREATE TABLE database_integration_identity (project_name text PRIMARY KEY, database_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());"
psql_exec --command "INSERT INTO database_integration_identity (project_name, database_name) VALUES ('$PROJECT_NAME', '$DATABASE_NAME');"

export DATABASE_INTEGRATION_PROJECT="$PROJECT_NAME"
export DATABASE_INTEGRATION_DATABASE="$DATABASE_NAME"
export DATABASE_INTEGRATION_URL="postgresql://$DATABASE_USER:$DATABASE_PASSWORD@127.0.0.1:$POSTGRES_PORT/$DATABASE_NAME?application_name=$PROJECT_NAME"

cd "$BACKEND_DIR"
corepack pnpm exec vitest run --config test/vitest.integration.config.ts "$@"
