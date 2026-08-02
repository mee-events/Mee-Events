#!/usr/bin/env bash
# Applies every migration in infrastructure/postgres/migrations exactly once,
# tracked in the schema_migrations table.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

psql_exec() {
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U me_event -d me_event_dev -v ON_ERROR_STOP=1 -qtA "$@"
}

psql_exec -c "CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);" > /dev/null

# Baseline databases that received 0001 before schema_migrations existed.
has_branches="$(psql_exec -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'branches';")"
recorded="$(psql_exec -c "SELECT count(*) FROM schema_migrations;")"
if [ -n "$has_branches" ] && [ "$recorded" = "0" ]; then
  psql_exec -c "INSERT INTO schema_migrations (filename)
    VALUES ('0001_platform_foundation.sql')
    ON CONFLICT DO NOTHING;" > /dev/null
  echo "Baselined existing database at 0001_platform_foundation.sql"
fi

for file in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$file")"
  applied="$(psql_exec -c "SELECT 1 FROM schema_migrations WHERE filename = '$name';")"
  if [ -z "$applied" ]; then
    echo "Applying $name"
    psql_exec < "$file" > /dev/null
    psql_exec -c "INSERT INTO schema_migrations (filename) VALUES ('$name');" > /dev/null
  else
    echo "Skipping $name (already applied)"
  fi
done

echo "Migrations up to date."
