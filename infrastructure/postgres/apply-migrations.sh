#!/usr/bin/env bash
# Applies every migration in infrastructure/postgres/migrations exactly once,
# tracked in the schema_migrations table.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
export LC_ALL=C

migration_psql() {
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U me_event -d me_event_dev -v ON_ERROR_STOP=1 -qtA "$@"
}

. "$SCRIPT_DIR/migration-runner.sh"

run_migrations "$MIGRATIONS_DIR"
