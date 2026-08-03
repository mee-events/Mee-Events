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

1. Ensure table `schema_migrations (filename text PRIMARY KEY, applied_at timestamptz)`.
2. If `branches` already exists and `schema_migrations` is empty, baseline by
   recording `0001_platform_foundation.sql` (databases that received foundation
   before tracking existed).
3. For each `migrations/*.sql` in filename order:
   - Skip if filename already in `schema_migrations`.
   - Otherwise run the file with `ON_ERROR_STOP=1`, then insert the filename.

Target database (local script): Docker service `postgres`, user/db `me_event` /
`me_event_dev`.

Seeds are separate (`infrastructure/postgres/seeds/`, e.g.
`corepack pnpm db:seed:dev`) and are not applied by `db:migrate`.

---

## Catalog

| File                                     | Purpose                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `0001_platform_foundation.sql`           | Branches, users/roles/sessions, settings, append-only audit, outbox, idempotency |
| `0002_identity_persistence.sql`          | OTP challenges; refresh-token reuse detection on sessions                        |
| `0003_catalog_enquiries_leads.sql`       | Catalog, customers, enquiries, leads                                             |
| `0004_quotations_payments_bookings.sql`  | Quotations, payment plans/payments, bookings                                     |
| `0005_event_records.sql`                 | Event Record aggregate, timeline, notes, documents, activities                   |
| `0006_manager_operations.sql`            | Manager assignments, event tasks, progress, daily reports                        |
| `0007_vendor_management.sql`             | Vendors, assignments, notes, ratings                                             |
| `0008_worker_management.sql`             | Workers, tasks, attendance, progress, notes                                      |
| `0009_inventory_warehouse.sql`           | Warehouses, inventory items, allocations, movements, maintenance                 |
| `0010_finance_settlement.sql`            | Event finance, settlements, expenses, invoices, ledger                           |
| `0011_event_operations.sql`              | Field operations: assignments, attendance, issues, materials, completion         |
| `0012_pattern_b_inventory_cancelled.sql` | CHECK widen: `inventory_cancelled` on `event_timelines`                          |
| `0013_pattern_b_consistency.sql`         | Module-owned timeline/activity tables                                            |
| `0014_add_missing_fk_indexes.sql`        | Idempotent missing FK indexes (no table shape change)                            |

---

## Conventions

| Convention         | Expectation                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| Filename           | `NNNN_snake_description.sql` (zero-padded sequence)                          |
| Transaction        | Each migration file wraps work in `BEGIN` / `COMMIT`                         |
| Style              | Additive / expand-and-contract; avoid destructive drops of financial history |
| Tracking           | One row per applied file in `schema_migrations`                              |
| Idempotent indexes | Prefer `CREATE INDEX IF NOT EXISTS` for backfill migrations like `0014`      |

---

## Stale documentation note

[`infrastructure/postgres/README.md`](../../infrastructure/postgres/README.md)
still describes a partial early migration list (through `0005` and “later
slices”). This catalog and [schema-overview.md](./schema-overview.md) are the
engineer-facing index for the full suite.

---

## Related

- [indexing.md](./indexing.md)
- [ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md)
