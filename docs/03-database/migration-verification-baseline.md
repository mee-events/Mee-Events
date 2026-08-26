# PostgreSQL Migration Verification Baseline

## Result

STAB-14 migration behavior completed with findings on 26 August 2026 at 16:49 IST
(`Asia/Kolkata`, `+0530`). Verification began from clean `master` at
`325f2e47ab4b0db7abad2daacdb445ffb074b551`, tracking `origin/master`, ahead
15 and behind 0.

All 20 maintained migrations replayed successfully on an empty database, a
tracked `0001`–`0014` upgrade database, and a legacy `0001` database without a
ledger. The three final databases had identical normalized schema and stable
seed-payload signatures. A second runner invocation was a true no-op. Live
constraint, index, trigger, append-only, and transaction probes passed.

The result is **completed with findings**, not production readiness. The runner
commits a migration and records its filename in two separate `psql` commands.
The applied-but-unrecorded simulation proved that a retry can fail against the
already changed schema. The ledger also stores no migration checksum. These
known integrity risks remain `SEC-M-09`, owned by STAB-20 and PROD-03; a
reviewed reconciliation/checksum design is required before production use.

The catalog/schema/data signature descriptions were corrected from clean
`master` at `495adbcf987f36b9e6f7bfc8911ac83fb2e4d910` after independent review
found their byte recipes incomplete or inaccurate. The corrected recipes were
re-run on three new isolated PostgreSQL 17.2 databases. Independent re-review
accepted the correction before STAB-15 began. STAB-14 is complete with its
`SEC-M-09` finding unchanged.

## Safety and isolated environment

| Item                     | Evidence                                                                  |
| ------------------------ | ------------------------------------------------------------------------- |
| Repository               | `/Users/vinaychilagani/Desktop/Mee Event V1`                              |
| Branch / starting commit | `master` / `325f2e47ab4b0db7abad2daacdb445ffb074b551`                     |
| Upstream state           | `origin/master`; ahead 15, behind 0                                       |
| Starting tree            | Clean; no staged or untracked files                                       |
| Docker                   | Desktop Linux context; Engine/Client 29.5.2; Compose 5.1.4                |
| PostgreSQL               | `postgres:17.2-alpine`; live `server_version` 17.2                        |
| Image identity           | `sha256:7e5df973a74872482e320dcbdeb055e178d6f42de0558b083892c50cda833c96` |
| Database / user          | Isolated local `me_event_dev` / `me_event` only                           |

Four unique Compose projects used loopback-only ports:

| Project                    | Host binding      | Purpose                           |
| -------------------------- | ----------------- | --------------------------------- |
| `mee-event-stab14-empty`   | `127.0.0.1:55431` | Empty replay and integrity probes |
| `mee-event-stab14-upgrade` | `127.0.0.1:55432` | Tracked upgrade from `0014`       |
| `mee-event-stab14-legacy`  | `127.0.0.1:55433` | Pre-ledger `0001` baseline        |
| `mee-event-stab14-crash`   | `127.0.0.1:55434` | Failure and crash-window probes   |

The normal founder `me-event-local` project and all unrelated Compose projects
were explicitly excluded. After verification, all four temporary containers,
volumes, and networks were removed. The founder Postgres and Redis container
IDs remained `709110c83f1a` and `19839084275c`, both healthy before and after
cleanup.

The signature correction used three new disposable projects:
`mee-event-stab14-signature-empty` on `127.0.0.1:55441`,
`mee-event-stab14-signature-upgrade` on `127.0.0.1:55442`, and
`mee-event-stab14-signature-legacy` on `127.0.0.1:55443`. Their effective
Compose names and loopback bindings were checked before startup. After the
recipes reproduced the documented values, exact project-scoped `down -v`
commands removed all three containers, volumes, and networks. The same founder
container IDs remained healthy before and after correction cleanup.

## Migration catalog

Filesystem and Git both contain exactly 20 migration files, ordered
`0001`–`0020`, with no gap or duplicate. Every file contains exactly one
top-level `BEGIN;` and one `COMMIT;`. Seeds remain outside the runner glob.

| File                                         | SHA-256                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `0001_platform_foundation.sql`               | `e4117642606e755e08a716e837ce2816daa90a884068b35a56505ad50dd9d432` |
| `0002_identity_persistence.sql`              | `d69252d8e5e7a3568852c51127cdc9fdb6533bea3b83053c46145625861422ce` |
| `0003_catalog_enquiries_leads.sql`           | `3fd08a90e2dab6f885636cef2811e642d61fe9b7a1573b0dd18e76d86925a281` |
| `0004_quotations_payments_bookings.sql`      | `7165714427a3c56651c2f3d1cb03a910e7703db8bab48fe3c0d57f0b8f70e761` |
| `0005_event_records.sql`                     | `209cefade04a67898930a696be6963ac069f920d2cf74d57736a86bfc85929d0` |
| `0006_manager_operations.sql`                | `a7ea3208790dac0f4e627d8a76719ed50d84af0dead3617fe9685ea376103cbc` |
| `0007_vendor_management.sql`                 | `2b86e1d482700f00ba845eff54b7e9e54eed2fa94cac87e33834d9d8435e4dca` |
| `0008_worker_management.sql`                 | `e3c9cb5f91129ce136120135a7bab2a893a6bfabcbf110e11181dc71a9405adb` |
| `0009_inventory_warehouse.sql`               | `a5a050dd2b2eb0eadb8ae8a32a28fb51c9fa939f933ae1b9179473f2fe141315` |
| `0010_finance_settlement.sql`                | `289c1ff92d2ed4d3fe3f93ca0ed682040bb17c4630b6e101612a2831e2fbce5e` |
| `0011_event_operations.sql`                  | `2a96c7cffca2619a6f4a25255aafebff36ef1cddc032a2a75319ae719896ca37` |
| `0012_pattern_b_inventory_cancelled.sql`     | `d699085c8626753b0abf7d1e7927d49d5a4012cd12af3f009d39b2923fd764ea` |
| `0013_pattern_b_consistency.sql`             | `489d301ba72c1a2ef34ba1c57d19064d04bca86d78ab6832564fb7ecd4e9caf4` |
| `0014_add_missing_fk_indexes.sql`            | `679ad77299265afea1cca830b3c293af5d9f92c4c41bf6a557a2926ede51910d` |
| `0015_catalog_taxonomy_v2.sql`               | `88f519be60abfb34d3cdfc2b0ce39d09ac7ac4e74fdbd8bee47f449709009c80` |
| `0016_search_foundation.sql`                 | `af1269200161d9a68cc212ff5a843540469a94f34c5025224d6555472072a67b` |
| `0017_enquiry_preferred_external_vendor.sql` | `8e8841092f728c247e923caa16989e00b0aae3ce49b5f5921c59077038b494fe` |
| `0018_catalog_taxonomy_v3.sql`               | `b11ab69421cfeeaacfca9cbeae0d149fdee515a49f15ab96c89f5be8ad6e0a7e` |
| `0019_fix_entertainment_b2_collision.sql`    | `3ba4df1929dfcfa80549e68b066bcaa8735e8fada299b76188d1339cd7ca35eb` |
| `0020_catalog_media.sql`                     | `7c48a95d33716523a946d79564ba07f79d0e890ddaf327e0fccb8be2c6529b01` |

The combined catalog signature is
`790d78670e79500b2c32dae17bcc1ed75749a637e4240253a098fa082aa7e653`,
computed by this byte recipe:

1. Set `LC_ALL=C` and enumerate migration files in ascending filename order,
   `0001` through `0020`.
2. Hash each file's exact bytes with SHA-256.
3. Emit one UTF-8 line per file as
   `<lowercase-sha256><two ASCII spaces><basename><LF>`.
4. Concatenate the 20 lines in migration filename order and hash those bytes.
5. Do **not** sort the completed lines by their hash prefixes. Doing that is a
   different operation and produces
   `0636939bb23023537b19c725243b3313ed7f04af7c8fcce43048dc66762afad8`.

Directly runnable from the repository root:

```sh
LC_ALL=C /bin/sh -c '
  shasum -a 256 infrastructure/postgres/migrations/*.sql |
    sed "s#  infrastructure/postgres/migrations/#  #"
' | tee /tmp/mee-event-stab14-catalog.manifest | shasum -a 256
```

The shell glob is expanded inside the `LC_ALL=C` process. `shasum` emits
lowercase hex followed by two ASCII spaces and the path; `sed` removes only the
directory prefix. The manifest has exactly 20 LF-terminated lines, including a
final LF. Re-running this command reproduced `790d7867…`; all 20 individual
hashes remained identical to the table above.

`schema_migrations` enforces filename uniqueness only. It does not store or
compare file content hashes, so the hashes above are verification evidence,
not a runtime guarantee.

## Replay paths

### Empty database

The canonical `corepack pnpm db:migrate` command applied `0001`–`0020` in
filename order and exited 0 in 7.54 seconds. The final ledger contained 20
distinct filenames with minimum `0001_platform_foundation.sql` and maximum
`0020_catalog_media.sql`. A repeat invocation skipped exactly 20 files, applied
none, exited 0, and left both signatures unchanged.

### Tracked upgrade

An isolated database was constructed by applying the unchanged `0001`–`0014`
files and recording the matching filenames. The canonical runner skipped those
14 entries and applied `0015`–`0020`. The final ledger was 20/20 distinct. A
second invocation skipped all 20 files and did not change schema or stable
seed data.

### Legacy pre-ledger database

An isolated database received only `0001_platform_foundation.sql`; `branches`
existed and `schema_migrations` did not. The canonical runner printed its
legacy-baseline message, recorded `0001`, skipped it, and applied `0002`–`0020`.
The final ledger was 20/20 distinct. A repeat invocation skipped all 20 files.

### Parity

The three paths had identical raw schema dumps and corrected stable seed-data
signatures. The exact recipes follow.

#### Schema signature

PostgreSQL 17.2 generated each raw dump with:

```sh
CONTAINER=mee-event-stab14-signature-empty-postgres-1
docker exec "$CONTAINER" \
  pg_dump -U me_event -d me_event_dev \
    --schema-only --no-owner --no-privileges \
  > /tmp/mee-event-stab14-schema-raw.sql
```

The captured stdout is UTF-8 with LF line endings and a final LF. Its raw
SHA-256 is
`b47b505edcead504d76f5bca1d2bab0279c3268940719bbebc69959eaf61fc9a`.
The empty, tracked-upgrade, and legacy raw dump files were byte-for-byte
identical.

The normalized signature deletes only the two complete comment lines beginning
with these exact prefixes:

- `-- Dumped from database version `
- `-- Dumped by pg_dump version `

Every other line, comment, blank line, byte, and the final LF is preserved:

```sh
LC_ALL=C sed \
  -e '/^-- Dumped from database version /d' \
  -e '/^-- Dumped by pg_dump version /d' \
  /tmp/mee-event-stab14-schema-raw.sql \
  > /tmp/mee-event-stab14-schema-normalized.sql

shasum -a 256 \
  /tmp/mee-event-stab14-schema-raw.sql \
  /tmp/mee-event-stab14-schema-normalized.sql
```

Exactly two lines were removed from each dump. All three normalized files have
SHA-256
`90a977d40e12d998ed8bd0723640eaae34f26f560c229d4035235758941a2c36`.
This is the normalized cross-path signature, not the raw `pg_dump` hash.

#### Stable seed-data signature

The corrected recipe ran on PostgreSQL 17.2 and Python 3.14.4. It includes every
non-empty ordinary or partitioned table in schema `public`, except
`schema_migrations`. For this catalog, the resolved 16-table set is:

```text
branch_settings
branches
catalog_aliases
catalog_content_revisions
catalog_products
catalog_services
catalog_subcategories
event_service_selections
event_types
expense_categories
finance_accounts
occasion_stages
payment_methods
search_trending_terms
service_categories
service_occasion_affinity
```

Before serialization, each row excludes:

- the exact column `id`;
- every column whose name ends in `_at`;
- the exact columns `created_by`, `updated_by`, `created_by_user_id`, and
  `updated_by_user_id`.

No additional columns are excluded. `schema_migrations` is excluded as a table,
so its filenames and apply timestamps are not data-signature input.

Save this exact SQL as `/tmp/mee-event-stab14-stable-data.sql`:

```sql
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
WITH public_tables AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.oid AS table_oid
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relname <> 'schema_migrations'
),
excluded_columns AS (
  SELECT
    t.table_oid,
    COALESCE(
      array_agg(a.attname ORDER BY a.attname COLLATE "C") FILTER (
        WHERE a.attname = 'id'
           OR a.attname LIKE '%\_at' ESCAPE '\'
           OR a.attname IN (
             'created_by',
             'updated_by',
             'created_by_user_id',
             'updated_by_user_id'
           )
      ),
      ARRAY[]::text[]
    ) AS names
  FROM public_tables AS t
  LEFT JOIN pg_catalog.pg_attribute AS a
    ON a.attrelid = t.table_oid
   AND a.attnum > 0
   AND NOT a.attisdropped
  GROUP BY t.table_oid
)
SELECT format(
  'SELECT %L || chr(9) || payload::text FROM (SELECT to_jsonb(t) - %L::text[] AS payload FROM %I.%I AS t) AS rows ORDER BY payload::text COLLATE "C";',
  t.table_name,
  e.names::text,
  t.schema_name,
  t.table_name
)
FROM public_tables AS t
JOIN excluded_columns AS e ON e.table_oid = t.table_oid
ORDER BY t.table_name COLLATE "C"
\gexec
```

This produces one UTF-8/LF input record per row as
`<ASCII table name><TAB><PostgreSQL jsonb::text><LF>`. Empty tables emit no
records. PostgreSQL `to_jsonb` converts UUIDs to JSON strings, numeric/decimal
values to JSON numbers, Booleans to `true`/`false`, SQL null to JSON `null`, SQL
arrays to JSON arrays preserving element order, and JSON/JSONB to nested JSON.
PostgreSQL 17.2 `jsonb::text` supplies the intermediate JSON escaping and object
representation.

Save this exact Python program as
`/tmp/mee-event-stab14-canonicalize-seed.py`:

```python
import hashlib
import json
import sys


def compact_json(value: object) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


tables: dict[str, list[object]] = {}

for line_number, raw_line in enumerate(sys.stdin.buffer, start=1):
    if not raw_line.endswith(b"\n"):
        raise SystemExit(f"input line {line_number} has no LF terminator")
    table_bytes, separator, payload_bytes = raw_line[:-1].partition(b"\t")
    if separator != b"\t":
        raise SystemExit(f"input line {line_number} has no TAB separator")
    table = table_bytes.decode("ascii")
    payload = json.loads(payload_bytes.decode("utf-8"))
    tables.setdefault(table, []).append(payload)

for rows in tables.values():
    rows.sort(key=compact_json)

canonical_bytes = compact_json(tables).encode("utf-8")
sys.stdout.write(hashlib.sha256(canonical_bytes).hexdigest() + "\n")
```

Run it against each isolated path by changing only `CONTAINER`:

```sh
CONTAINER=mee-event-stab14-signature-empty-postgres-1
docker exec -i "$CONTAINER" \
  psql -X -q -v ON_ERROR_STOP=1 -U me_event -d me_event_dev \
  < /tmp/mee-event-stab14-stable-data.sql |
  python3 /tmp/mee-event-stab14-canonicalize-seed.py
```

Python's standard JSON decoder maps JSON strings (including UUID and non-ASCII
text) to `str`, integers to arbitrary-precision `int`, fractional/exponent
numbers to binary64 `float`, Booleans to `bool`, null to `None`, arrays to lists
without reordering, and objects to dictionaries. The encoder recursively sorts
all object keys, writes non-ASCII characters directly (`ensure_ascii=False`),
and uses exactly comma and colon separators with no added spaces. Each table's
rows are ordered by that same compact JSON row string. The final table order is
the recursively sorted top-level object-key order; all current table names are
ASCII. Tables frame row arrays as JSON object values, rows are comma-separated
array elements, and fields are comma-separated object members.

The exact bytes passed to SHA-256 are the UTF-8 encoding, without BOM or final
newline, of the single compact top-level JSON object produced by
`compact_json(tables)`. The newline printed after the hexadecimal digest is not
part of the hashed bytes.

The empty, tracked-upgrade, and legacy paths each produced:

`a06b154f7164ecdc26ac71d6473fed38ab977c8ffe9f50d53ce331641f4aa3ec`

The earlier `b8bd2cc4…` value is retired because its documentation did not
define reproducible excluded-column, table, JSON, ordering, or framing bytes.
The corrected `a06b154f…` value covers only the deterministic
migration-seeded payloads selected above. It does not prove row-identity,
physical database, backup, or general data equivalence.

## Live artifact and integrity inventory

The final schema contained 115 public tables including `schema_migrations`, no
views, 502 indexes, 760 constraints, 310 foreign keys, 282 CHECK constraints,
53 UNIQUE constraints, 68 non-internal triggers, and 69 public functions
(including extension-owned functions). All constraints were validated; all
indexes were live, ready, and valid.

Additional evidence:

- all 33 public `branch_id` columns have a foreign key to `branches`;
- 15 CHECK constraints cover timeline/activity tables;
- `catalog_media` has nine constraints and five indexes (primary key plus four
  explicit migration indexes);
- representative foreign-key, CHECK, UNIQUE, and active-cover uniqueness
  violations were rejected;
- an `app_users` update advanced `version` from 1 to 2 and replaced a synthetic
  old `updated_at` value;
- `audit_events` rejected both UPDATE and DELETE with its append-only trigger;
- all probe writes ran inside a transaction and zero synthetic rows remained
  after rollback.

## Failure behavior and SEC-M-09

### Failure before file COMMIT

A synthetic transaction created a table and row, then raised an exception
before `COMMIT`. `psql` exited 3 and the table did not exist afterward. This
confirms per-file transactional rollback with `ON_ERROR_STOP=1`.

### Applied but unrecorded

The crash database had `0001`–`0018` applied and recorded. Migration `0019`
was then applied successfully while its ledger insert was deliberately omitted.
The database contained the expected Female Anchor at `entertainment.A2` and
Magician at `entertainment.B2`, while the ledger remained at 18 and
`catalog_media` remained absent.

The canonical runner skipped `0001`–`0018`, retried `0019`, and exited 3 on the
fail-closed precondition that `entertainment.B2` was no longer Female Anchor.
The retry made no further schema or data change, did not record `0019`, and did
not reach `0020`. Automatic recovery therefore **does not exist** for this
state. Operators must stop, verify the exact migration content and semantic
postconditions, then use an approved reconciliation procedure; blindly editing
the ledger or rerunning SQL is unsafe.

Required follow-up:

- **STAB-20 / security owner:** retain `SEC-M-09`, define tamper detection and
  fail-closed migration-state checks.
- **PROD-03 / database operations owner:** select and rehearse checksum-aware,
  crash-recoverable migration bookkeeping plus backup/restore and rollback
  procedures before production.

## Verification commands

Commands were executed only against the four named isolated projects:

```sh
corepack pnpm db:migrate
docker exec <isolated-postgres> pg_dump -U me_event -d me_event_dev \
  --schema-only --no-owner --no-privileges
docker exec <isolated-postgres> psql -U me_event -d me_event_dev \
  -v ON_ERROR_STOP=1
docker compose -f infrastructure/docker-compose.yml \
  -f <temporary-loopback-override> down -v
```

Catalog hashes used `shasum -a 256`; comparisons used sorted manifests and
`cmp`. The loopback override and all dumps/manifests/probe SQL lived outside
the repository and were removed after verification.

## Security assessment and cleanup proof

Security result: **PASS WITH FINDING**. All connections targeted the four
explicit local Compose projects; no production, staging, remote, unknown, or
founder database was accessed. No environment file or value was read, no real
personal/customer data was copied, constraints remained enabled, and synthetic
probe rows were rolled back. `SEC-M-09` is preserved rather than minimized.

Before removal, each temporary container, volume, and network was resolved by
its exact Compose project label. Scoped `docker compose ... down -v` commands
removed all four projects. Post-cleanup label queries returned zero containers,
volumes, and networks for every STAB-14 project; existing developer containers
remained healthy with their original IDs. No image or build cache was removed.

## Evidence boundaries

- This proves migration replay and selected database-enforced invariants on
  local PostgreSQL 17.2. It does not prove backend repository adapters, HTTP
  workflows, concurrent business transactions, Redis, or provider behavior;
  those remain STAB-15 and later work.
- No production, staging, unknown, or founder database was queried or changed.
- Seeds were not applied through `db:seed:dev`; only migration-embedded data was
  compared.
- No backup, restore, managed-host, TLS, high availability, RPO/RTO, or
  production rollback was exercised. PROD-03 retains ownership.
- No SQL migration, runner, Compose configuration, backend source, or test was
  changed to obtain this result.

## Final verdict and next permitted task

**MIGRATION EVIDENCE PASSES WITH FINDINGS; CORRECTION ACCEPTED.** The replay,
parity, integrity, failure, and safety evidence remains unchanged. The catalog,
raw/normalized schema, and stable-data byte recipes reproduce their recorded
values and passed independent re-review. Phase 0 remains **NOT PASSED** and
`SEC-M-09` remains open. STAB-15 subsequently added the separately documented
maintained application integration suite.
