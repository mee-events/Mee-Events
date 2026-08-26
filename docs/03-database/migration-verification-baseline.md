# PostgreSQL Migration Verification Baseline

## Result

STAB-14 completed with findings on 26 August 2026 at 16:49 IST
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

STAB-15 database integration tests were not started.

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
computed as SHA-256 over sorted lines of
`<file-sha256><two spaces><basename>\n`.

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

Normalized `pg_dump --schema-only --no-owner --no-privileges` output was
identical across all three paths:

- schema SHA-256:
  `90a977d40e12d998ed8bd0723640eaae34f26f560c229d4035235758941a2c36`;
- stable seed-payload SHA-256:
  `b8bd2cc4852008bfaa494b876752e849e02a4c070a68ce0cb28759d8ca82aa9d`.

The data signature removes generated identity and timestamp fields before
sorting JSON payloads. It proves parity of stable seeded payloads, not physical
row identity or a general-purpose backup comparison.

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

**DONE WITH FINDINGS.** The STAB-14 replay, parity, integrity, failure, safety,
and documentation requirements are satisfied. Phase 0 remains **NOT PASSED**.
STAB-14 is complete, the current task is none, and the next permitted task is
STAB-15 database integration tests. STAB-15 was not started in this block.
