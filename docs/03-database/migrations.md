# Migrations

Schema changes ship only as ordered SQL files in
[`infrastructure/postgres/migrations/`](../../infrastructure/postgres/migrations/).

---

## Apply

```sh
corepack pnpm db:up      # local Postgres + Redis via Docker Compose
corepack pnpm db:migrate # bash infrastructure/postgres/apply-migrations.sh
```

### Algorithm (`apply-migrations.sh`)

1. Ensure `schema_migrations` contains `filename`, a lowercase SHA-256
   `checksum`, and `applied_at`; backfill a legacy missing/null checksum from
   the trusted current checkout, then enforce `NOT NULL` plus a validated
   64-character hexadecimal check.
2. If `branches` already exists and `schema_migrations` is empty, baseline
   `0001_platform_foundation.sql` only after its required table, seed, function,
   trigger, extension, and pre-`0002` sentinel postconditions pass.
3. Validate the complete catalog and reject an unknown ledger filename or a
   checksum mismatch before applying any missing file.
4. For each `migrations/*.sql` in filename order:
   - Skip only when filename and checksum both match.
   - Snapshot a missing file and hash the exact snapshot.
   - Insert filename/checksum immediately after the file's existing `BEGIN`,
     then execute the rest with `ON_ERROR_STOP=1` and its original `COMMIT`.

Migration work and its ledger row therefore commit or roll back together. The
runner also rejects files that do not contain exactly one outer transaction.
The old runner's reproduced applied-but-unrecorded failure remains historical
evidence in [the STAB-14 baseline](./migration-verification-baseline.md).

Target database (local script): Docker service `postgres`, user/db `me_event` /
`me_event_dev`.

Seeds are separate (`infrastructure/postgres/seeds/`, e.g.
`corepack pnpm db:seed:dev`) and are not applied by `db:migrate`.

---

## Catalog

| File                                         | Purpose                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `0001_platform_foundation.sql`               | Branches, users/roles/sessions, settings, append-only audit, outbox, idempotency |
| `0002_identity_persistence.sql`              | OTP challenges; refresh-token reuse detection on sessions                        |
| `0003_catalog_enquiries_leads.sql`           | Catalog, customers, enquiries, leads                                             |
| `0004_quotations_payments_bookings.sql`      | Quotations, payment plans/payments, bookings                                     |
| `0005_event_records.sql`                     | Event Record aggregate, timeline, notes, documents, activities                   |
| `0006_manager_operations.sql`                | Manager assignments, event tasks, progress, daily reports                        |
| `0007_vendor_management.sql`                 | Vendors, assignments, notes, ratings                                             |
| `0008_worker_management.sql`                 | Workers, tasks, attendance, progress, notes                                      |
| `0009_inventory_warehouse.sql`               | Warehouses, inventory items, allocations, movements, maintenance                 |
| `0010_finance_settlement.sql`                | Event finance, settlements, expenses, invoices, ledger                           |
| `0011_event_operations.sql`                  | Field operations: assignments, attendance, issues, materials, completion         |
| `0012_pattern_b_inventory_cancelled.sql`     | CHECK widen: `inventory_cancelled` on `event_timelines`                          |
| `0013_pattern_b_consistency.sql`             | Module-owned timeline/activity tables                                            |
| `0014_add_missing_fk_indexes.sql`            | Idempotent missing FK indexes (no table shape change)                            |
| `0015_catalog_taxonomy_v2.sql`               | Normalized services, occasion stages, affinity and aliases                       |
| `0016_search_foundation.sql`                 | Trending-search terms and trigram search indexes                                 |
| `0017_enquiry_preferred_external_vendor.sql` | Optional external-vendor preference on enquiries                                 |
| `0018_catalog_taxonomy_v3.sql`               | Subcategories, products, selections and content revisions                        |
| `0019_fix_entertainment_b2_collision.sql`    | Fail-closed correction for Female Anchor/Magician catalog codes                  |
| `0020_catalog_media.sql`                     | Normalized reviewed media for catalog entities                                   |

---

## Conventions

| Convention         | Expectation                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| Filename           | `NNNN_snake_description.sql` (zero-padded sequence)                          |
| Transaction        | Each migration file wraps work in `BEGIN` / `COMMIT`                         |
| Style              | Additive / expand-and-contract; avoid destructive drops of financial history |
| Tracking           | One filename plus exact SHA-256 per applied file in `schema_migrations`      |
| Idempotent indexes | Prefer `CREATE INDEX IF NOT EXISTS` for backfill migrations like `0014`      |

---

## Verified baseline

STAB-14 verified all 20 files on PostgreSQL 17.2 across empty, tracked-upgrade,
and legacy pre-ledger paths. All paths converged to the same normalized schema
and stable seed-payload signatures; repeated runner invocations were no-ops.
Checksums, live counts, integrity probes, limitations, and isolated cleanup are
recorded in [migration-verification-baseline.md](./migration-verification-baseline.md).

SEC-M-09 later added maintained atomic/checksum probes to the backend
PostgreSQL harness. See
[the SEC-M-09 inventory](../05-security/sec-m-09-migration-integrity-inventory.md).

---

## Related

- [indexing.md](./indexing.md)
- [migration-verification-baseline.md](./migration-verification-baseline.md)
- [ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md)
