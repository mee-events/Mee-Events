# Schema Overview

This document inventories the shipped PostgreSQL schema as defined by migrations
`0001`–`0020`. It does not invent tables from product roadmaps.

---

## Cross-cutting patterns

| Pattern            | Practice                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Primary keys       | UUID (`gen_random_uuid()` or application-supplied UUID)                                         |
| Timestamps         | `timestamptz` for created/updated/occurred columns                                              |
| Optimistic version | Mutable business rows commonly carry `version integer NOT NULL DEFAULT 1 CHECK (version > 0)`   |
| Branch scope       | `branch_id` on branch-scoped business tables; Phase 1 seeds Hyderabad (`HYD`)                   |
| Lifecycle          | Status columns with SQL `CHECK` constraints; **no `deleted_at`** soft-delete column             |
| Hard delete        | Not used for financial/audit history; `audit_events` reject UPDATE/DELETE via triggers (`0001`) |
| Integrity          | Foreign keys and CHECKs declared in migrations                                                  |
| Side effects       | `audit_events`, `outbox_events`, `idempotency_records` (`0001`)                                 |
| Driver / SoT       | `pg` + SQL migrations ([ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md))           |

Naming note: quotation history uses **`quotation_revisions`** (migration `0004`),
not a `quotation_versions` table.

Tables listed in older PRD roadmaps but absent from migrations (for example
`event_functions`, `service_subcategories`, `enquiry_items`) are out of scope
here.

---

## Domain table groups

### Platform foundation (`0001_platform_foundation.sql`)

`branches`, `app_users`, `role_assignments`, `device_sessions`,
`branch_settings`, `audit_events`, `outbox_events`, `idempotency_records`

### Identity persistence (`0002_identity_persistence.sql`)

`otp_challenges` (plus refresh-reuse columns/indexes on `device_sessions`)

### Catalog, enquiries, leads (`0003_catalog_enquiries_leads.sql`)

`event_types`, `service_categories`, `customers`, `enquiries`, `leads`,
`lead_activities`

### Quotations, payments, bookings (`0004_quotations_payments_bookings.sql`)

`quotations`, `quotation_revisions`, `quotation_items`, `quotation_activities`,
`quotation_documents`, `payment_plans`, `payments`, `bookings`,
`booking_activities`

### Event records (`0005_event_records.sql`)

`event_records`, `event_timelines`, `event_notes`, `event_note_revisions`,
`event_documents`, `event_status_history`, `event_activities`

### Manager operations (`0006_manager_operations.sql`)

`event_manager_assignments`, `event_tasks`, `event_task_comments`,
`event_task_history`, `event_progress_updates`, `event_daily_reports`

### Vendor management (`0007_vendor_management.sql`)

`vendors`, `vendor_members`, `vendor_categories`, `vendor_contacts`,
`vendor_documents`, `vendor_bank_accounts`, `vendor_assignments`,
`vendor_assignment_history`, `vendor_notes`, `vendor_ratings`

### Worker management (`0008_worker_management.sql`)

`workers`, `worker_profiles`, `worker_vendor_membership`, `worker_skills`,
`worker_documents`, `worker_tasks`, `worker_task_history`, `worker_checkins`,
`worker_attendance`, `worker_progress`, `worker_notes`, `worker_ratings`

### Inventory / warehouse (`0009_inventory_warehouse.sql`)

`warehouses`, `warehouse_locations`, `inventory_categories`,
`inventory_suppliers`, `inventory_items`, `inventory_units`, `inventory_stock`,
`inventory_allocations`, `inventory_movements`, `inventory_returns`,
`inventory_damage_reports`, `inventory_maintenance`, `inventory_photos`,
`inventory_notes`

### Finance / settlement (`0010_finance_settlement.sql`)

`finance_accounts`, `payment_methods`, `expense_categories`,
`event_financial_summary`, `customer_payments`, `customer_refunds`,
`vendor_bills`, `vendor_settlements`, `worker_payouts`, `event_expenses`,
`invoices`, `receipts`, `finance_transactions`, `ledger_entries`

### Event operations (`0011_event_operations.sql`)

`task_assignments`, `attendance_logs`, `event_progress`, `event_issues`,
`event_photos`, `material_usage`, `event_completion` (plus ALTERs on
`event_tasks` / timeline CHECKs)

### Pattern B module history (`0013_pattern_b_consistency.sql`)

`vendor_timelines`, `vendor_activities`, `worker_timelines`,
`worker_activities`, `inventory_timelines`, `inventory_activities`,
`finance_timelines`, `finance_activities`, `operations_timelines`,
`operations_activities`

See [pattern-b-tables.md](./pattern-b-tables.md) for FKs and
[Pattern B Specification](../02-architecture/pattern-b.md) for behavior.

### Catalog taxonomy and search (`0015`–`0019`)

`catalog_services`, `occasion_stages`, `service_occasion_affinity`,
`catalog_aliases`, `search_trending_terms`, `catalog_subcategories`,
`catalog_products`, `event_service_selections`, `catalog_content_revisions`

Migration `0017` adds `enquiries.preferred_external_vendor`. Migration `0019`
is a fail-closed data correction that assigns Female Anchor to
`entertainment.A2` and restores Magician at `entertainment.B2`.

### Catalog media (`0020_catalog_media.sql`)

`catalog_media` stores normalized, reviewed cover/gallery/icon metadata for
occasion, service, subcategory, and product entities. Migration `0020` seeds no
photographs.

### Non-table migrations

| Migration                                    | Change                                    |
| -------------------------------------------- | ----------------------------------------- |
| `0012_pattern_b_inventory_cancelled.sql`     | Widens `event_timelines.entry_type` CHECK |
| `0014_add_missing_fk_indexes.sql`            | Additive FK indexes only                  |
| `0017_enquiry_preferred_external_vendor.sql` | Adds one nullable enquiry column          |
| `0019_fix_entertainment_b2_collision.sql`    | Fail-closed catalog data correction       |

---

## Related

- [erd.md](./erd.md) — relationship diagrams
- [migrations.md](./migrations.md) — apply order and conventions
- [migration-verification-baseline.md](./migration-verification-baseline.md) — live replay and integrity evidence
