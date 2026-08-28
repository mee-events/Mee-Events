#!/usr/bin/env bash
# Shared checksum-aware migration runner. Callers must define migration_psql()
# with ON_ERROR_STOP enabled before sourcing this file.

migration_fail() {
  echo "Migration runner: $1" >&2
  return 1
}

migration_query() {
  migration_psql --tuples-only --no-align --command "$1"
}

migration_sha256() {
  local file="$1"
  local digest_line

  if command -v sha256sum >/dev/null 2>&1; then
    digest_line="$(sha256sum "$file")" || return 1
  elif command -v shasum >/dev/null 2>&1; then
    digest_line="$(shasum -a 256 "$file")" || return 1
  else
    migration_fail "sha256sum or shasum is required"
    return 1
  fi

  printf '%s\n' "${digest_line%% *}"
}

migration_validate_file() {
  local file="$1"
  local begin_count commit_count first_statement last_statement

  begin_count="$(awk '/^[[:space:]]*BEGIN;[[:space:]]*$/ { count += 1 } END { print count + 0 }' "$file")" || return 1
  commit_count="$(awk '/^[[:space:]]*COMMIT;[[:space:]]*$/ { count += 1 } END { print count + 0 }' "$file")" || return 1
  first_statement="$(awk 'NF && $0 !~ /^[[:space:]]*--/ { print; exit }' "$file")" || return 1
  last_statement="$(awk 'NF && $0 !~ /^[[:space:]]*--/ { statement = $0 } END { print statement }' "$file")" || return 1

  if [[ "$begin_count" != "1" || "$commit_count" != "1" ]]; then
    migration_fail "$(basename "$file") must contain exactly one BEGIN and one COMMIT"
    return 1
  fi
  if [[ ! "$first_statement" =~ ^[[:space:]]*BEGIN\;[[:space:]]*$ ]]; then
    migration_fail "$(basename "$file") must begin with BEGIN"
    return 1
  fi
  if [[ ! "$last_statement" =~ ^[[:space:]]*COMMIT\;[[:space:]]*$ ]]; then
    migration_fail "$(basename "$file") must end with COMMIT"
    return 1
  fi
}

migration_render_atomic_sql() {
  local file="$1"
  local filename="$2"
  local checksum="$3"

  awk -v filename="$filename" -v checksum="$checksum" '
    /^[[:space:]]*BEGIN;[[:space:]]*$/ {
      print
      print "INSERT INTO public.schema_migrations (filename, checksum) VALUES (\047" filename "\047, \047" checksum "\047);"
      next
    }
    { print }
  ' "$file"
}

migration_prepare_ledger() {
  local checksum_type filename_primary_key_count

  migration_psql --command "CREATE TABLE IF NOT EXISTS public.schema_migrations (
    filename text PRIMARY KEY,
    checksum text,
    applied_at timestamptz NOT NULL DEFAULT now()
  );" >/dev/null || return 1
  migration_psql --command "ALTER TABLE public.schema_migrations
    ADD COLUMN IF NOT EXISTS checksum text;" >/dev/null || return 1

  checksum_type="$(migration_query "SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'checksum';")" || return 1
  if [[ "$checksum_type" != "text" ]]; then
    migration_fail "schema_migrations.checksum must be text"
    return 1
  fi
  filename_primary_key_count="$(migration_query "SELECT count(*)
    FROM pg_constraint
    WHERE conrelid = 'public.schema_migrations'::regclass
      AND contype = 'p'
      AND pg_get_constraintdef(oid) = 'PRIMARY KEY (filename)';")" || return 1
  if [[ "$filename_primary_key_count" != "1" ]]; then
    migration_fail "schema_migrations.filename must be the primary key"
    return 1
  fi
}

migration_finalize_ledger() {
  local nullable constraint_definition invalid_constraint_count invalid_checksum_count

  migration_psql --command "DO \$migration\$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.schema_migrations'::regclass
        AND conname = 'schema_migrations_checksum_sha256_check'
    ) THEN
      ALTER TABLE public.schema_migrations
        ADD CONSTRAINT schema_migrations_checksum_sha256_check
        CHECK (checksum ~ '^[0-9a-f]{64}$') NOT VALID;
    END IF;
  END
  \$migration\$;" >/dev/null || return 1

  constraint_definition="$(migration_query "SELECT pg_get_expr(conbin, conrelid)
    FROM pg_constraint
    WHERE conrelid = 'public.schema_migrations'::regclass
      AND conname = 'schema_migrations_checksum_sha256_check';")" || return 1
  if [[ "$constraint_definition" != "(checksum ~ '^[0-9a-f]{64}$'::text)" ]]; then
    migration_fail "schema_migrations checksum constraint definition is invalid"
    return 1
  fi

  migration_psql --command "ALTER TABLE public.schema_migrations
    VALIDATE CONSTRAINT schema_migrations_checksum_sha256_check;
  ALTER TABLE public.schema_migrations
    ALTER COLUMN checksum SET NOT NULL;" >/dev/null || return 1

  nullable="$(migration_query "SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'checksum';")" || return 1
  invalid_constraint_count="$(migration_query "SELECT count(*)
    FROM pg_constraint
    WHERE conrelid = 'public.schema_migrations'::regclass
      AND conname = 'schema_migrations_checksum_sha256_check'
      AND NOT convalidated;")" || return 1
  invalid_checksum_count="$(migration_query "SELECT count(*)
    FROM public.schema_migrations
    WHERE checksum !~ '^[0-9a-f]{64}$';")" || return 1

  if [[ "$nullable" != "NO" || "$invalid_constraint_count" != "0" || "$invalid_checksum_count" != "0" ]]; then
    migration_fail "schema_migrations checksum constraints are invalid"
    return 1
  fi
}

migration_verify_legacy_foundation() {
  local foundation_table_count foundation_state

  foundation_table_count="$(migration_query "SELECT count(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'branches',
        'app_users',
        'role_assignments',
        'device_sessions',
        'branch_settings',
        'audit_events',
        'outbox_events',
        'idempotency_records'
      );")" || return 1
  if [[ "$foundation_table_count" != "8" ]]; then
    migration_fail "legacy foundation is incomplete; refusing to baseline 0001"
    return 1
  fi

  foundation_state="$(migration_query "SELECT (
      EXISTS (
        SELECT 1 FROM public.branches
        WHERE id = '00000000-0000-4000-8000-000000000001'
          AND code = 'HYD'
      )
      AND EXISTS (
        SELECT 1 FROM public.branch_settings
        WHERE branch_id = '00000000-0000-4000-8000-000000000001'
          AND key = 'lead.first_response_sla_minutes'
          AND value = '10'::jsonb
      )
      AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
      AND to_regprocedure('public.set_record_updated_at()') IS NOT NULL
      AND to_regprocedure('public.reject_audit_event_mutation()') IS NOT NULL
      AND (
        SELECT count(*) FROM pg_trigger
        WHERE NOT tgisinternal
          AND tgname IN (
            'branches_set_updated_at',
            'app_users_set_updated_at',
            'role_assignments_set_updated_at',
            'branch_settings_set_updated_at',
            'audit_events_reject_update',
            'audit_events_reject_delete'
          )
      ) = 6
      AND to_regclass('public.otp_challenges') IS NULL
    );")" || return 1
  if [[ "$foundation_state" != "t" ]]; then
    migration_fail "legacy foundation postconditions are invalid; refusing to baseline 0001"
    return 1
  fi
}

run_migrations() {
  local migrations_dir="$1"
  local nullglob_was_set=0
  local files=()
  local file filename checksum ledger_state ledger_names ledger_name found
  local recorded has_branches snapshot snapshot_checksum applied_checksum

  if ! declare -F migration_psql >/dev/null 2>&1; then
    migration_fail "caller must define migration_psql"
    return 1
  fi
  if [[ ! -d "$migrations_dir" ]]; then
    migration_fail "migration directory does not exist"
    return 1
  fi

  shopt -q nullglob && nullglob_was_set=1
  shopt -s nullglob
  files=("$migrations_dir"/*.sql)
  if (( nullglob_was_set == 0 )); then
    shopt -u nullglob
  fi
  if (( ${#files[@]} == 0 )); then
    migration_fail "migration catalog is empty"
    return 1
  fi

  for file in "${files[@]}"; do
    filename="$(basename "$file")"
    if [[ ! "$filename" =~ ^[0-9]{4}_[a-z0-9_]+\.sql$ ]]; then
      migration_fail "invalid migration filename: $filename"
      return 1
    fi
    migration_validate_file "$file" || return 1
  done

  migration_prepare_ledger || return 1

  ledger_names="$(migration_query "SELECT filename FROM public.schema_migrations ORDER BY filename;")" || return 1
  while IFS= read -r ledger_name; do
    [[ -z "$ledger_name" ]] && continue
    found=0
    for file in "${files[@]}"; do
      if [[ "$(basename "$file")" == "$ledger_name" ]]; then
        found=1
        break
      fi
    done
    if (( found == 0 )); then
      migration_fail "ledger contains unknown migration: $ledger_name"
      return 1
    fi
  done <<< "$ledger_names"

  recorded="$(migration_query "SELECT count(*) FROM public.schema_migrations;")" || return 1
  has_branches="$(migration_query "SELECT to_regclass('public.branches') IS NOT NULL;")" || return 1
  if [[ "$recorded" == "0" && "$has_branches" == "t" ]]; then
    file="$migrations_dir/0001_platform_foundation.sql"
    if [[ ! -f "$file" ]]; then
      migration_fail "legacy foundation exists but 0001_platform_foundation.sql is missing"
      return 1
    fi
    migration_verify_legacy_foundation || return 1
    checksum="$(migration_sha256 "$file")" || return 1
    migration_psql --command "INSERT INTO public.schema_migrations (filename, checksum)
      VALUES ('0001_platform_foundation.sql', '$checksum');" >/dev/null || return 1
    echo "Baselined existing database at 0001_platform_foundation.sql"
  fi

  # Preflight every existing ledger row before applying any missing migration.
  for file in "${files[@]}"; do
    filename="$(basename "$file")"
    checksum="$(migration_sha256 "$file")" || return 1
    ledger_state="$(migration_query "SELECT 'ROW|' || COALESCE(checksum, 'NULL')
      FROM public.schema_migrations
      WHERE filename = '$filename';")" || return 1

    if [[ "$ledger_state" == "ROW|NULL" ]]; then
      migration_psql --command "UPDATE public.schema_migrations
        SET checksum = '$checksum'
        WHERE filename = '$filename' AND checksum IS NULL;" >/dev/null || return 1
      echo "Backfilled checksum for $filename"
    elif [[ -n "$ledger_state" && "$ledger_state" != "ROW|$checksum" ]]; then
      migration_fail "checksum mismatch for applied migration: $filename"
      return 1
    fi
  done

  migration_finalize_ledger || return 1

  for file in "${files[@]}"; do
    filename="$(basename "$file")"
    ledger_state="$(migration_query "SELECT checksum
      FROM public.schema_migrations
      WHERE filename = '$filename';")" || return 1
    if [[ -n "$ledger_state" ]]; then
      echo "Skipping $filename (already applied, checksum verified)"
      continue
    fi

    snapshot="$(mktemp "${TMPDIR:-/tmp}/mee-events-migration.XXXXXX")" || return 1
    if ! cp "$file" "$snapshot"; then
      rm -f "$snapshot"
      return 1
    fi
    checksum="$(migration_sha256 "$file")" || {
      rm -f "$snapshot"
      return 1
    }
    snapshot_checksum="$(migration_sha256 "$snapshot")" || {
      rm -f "$snapshot"
      return 1
    }
    if [[ "$checksum" != "$snapshot_checksum" ]]; then
      rm -f "$snapshot"
      migration_fail "migration changed while being prepared: $filename"
      return 1
    fi
    migration_validate_file "$snapshot" || {
      rm -f "$snapshot"
      return 1
    }

    echo "Applying $filename"
    if ! migration_render_atomic_sql "$snapshot" "$filename" "$checksum" | migration_psql >/dev/null; then
      rm -f "$snapshot"
      migration_fail "failed to apply $filename; migration and ledger row were rolled back"
      return 1
    fi
    rm -f "$snapshot"

    applied_checksum="$(migration_query "SELECT checksum
      FROM public.schema_migrations
      WHERE filename = '$filename';")" || return 1
    if [[ "$applied_checksum" != "$checksum" ]]; then
      migration_fail "ledger verification failed after applying $filename"
      return 1
    fi
  done

  echo "Migrations up to date."
}
