# Database Architecture PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Related: ADR 0005, ADR 0010,
  `infrastructure/postgres/migrations/0001_platform_foundation.sql`
- Note: `docs/supabase/schema.sql` is an unreferenced legacy artifact from an
  earlier prototype and is not part of this architecture

## 1. Purpose

Define the database foundation that already exists, the patterns every new
table must follow, and the schema roadmap per ADR 0010 vertical slice.
PostgreSQL is the single transactional source of truth. Versioned SQL
migrations in `infrastructure/postgres/migrations/` are the only way schema
changes reach any environment.

## 2. Existing foundation (migration 0001)

| Table                 | Purpose                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `branches`            | Branch master; Hyderabad seeded as `HYD` (`00000000-0000-4000-8000-000000000001`)   |
| `app_users`           | Platform users; unique E.164 mobile; status lifecycle; last active role             |
| `role_assignments`    | Multi-role, scoped (`global`/`branch`/`vendor`) assignments with verification state |
| `device_sessions`     | Per-device auth sessions with refresh-token digests and soft revocation             |
| `branch_settings`     | Key/value branch configuration; seeds `lead.first_response_sla_minutes = 10`        |
| `audit_events`        | Append-only audit log; UPDATE/DELETE rejected by trigger                            |
| `outbox_events`       | Reliable event delivery (pending/processing/published/failed)                       |
| `idempotency_records` | Duplicate-write protection with request hash and cached response                    |

## 3. Mandatory patterns for every new table

- UUID primary keys via `gen_random_uuid()` (`pgcrypto`)
- Foreign keys for every relationship; indexes for every access path used by
  the application
- `created_at timestamptz`, `updated_at timestamptz`, and
  `version integer CHECK (version > 0)` on mutable business tables, with the
  shared `set_record_updated_at()` trigger
- Status/state lifecycles as `CHECK`-constrained text columns; no hard
  deletes for business or financial records
- `branch_id` on branch-scoped records even while Hyderabad is the only
  active branch
- Price and contract data stored as immutable snapshots/versions, never
  mutable references (ADR 0008)
- Controlled mutations write `audit_events` (actor, role, branch, entity,
  action, before/after version, request id, reason) and, where other systems
  react, `outbox_events`
- Client-initiated writes that may be retried use `idempotency_records`
- History tracking through version tables or append-only event tables for
  quotation versions, price reviews, and status transitions
- Role-based filtering happens in the backend; no table design may rely on
  the client hiding fields

## 4. Schema roadmap by vertical slice

### Slice 2: catalogue, customers, enquiries, leads

- `event_types`, `event_functions` — the event side of the taxonomy
  (`docs/product/catalog-taxonomy-v1.md`); display names, source aliases,
  active and display-order controls
- `service_categories`, `service_subcategories` — the service hierarchy,
  independent from events, with sale/rent/service eligibility
- `customers` — customer profile extension of `app_users` (contact
  preference, default address)
- `enquiries` — customer enquiry: event type and functions, date/time,
  location, guest count, budget guidance, notes, contact preference,
  customer-visible status, and captured catalogue references
- `enquiry_items` — selected service requirements with captured listing
  versions
- `enquiry_preferred_vendors` — private customer-provided vendors (ADR 0008)
- `leads` — CRM lead: source, owner, internal pipeline status, SLA
  timestamps (`first_response_due_at`, `first_responded_at`), and enquiry
  reference
- `lead_activities` — append-only call logs, notes, and follow-ups

### Slice 3: quotations, payments, bookings

- `quotations`, `quotation_versions`, `quotation_lines` — immutable versions
  with price snapshots and validity
- `payment_plans`, `payments`, `invoices`
- `bookings` — the converted deal linking customer, enquiry, and quotation
  version

### Slice 4: Event Record

- `event_records` — the central aggregate with contract snapshot
- `event_programs`, `event_tasks`, `event_change_requests`,
  `event_incidents`

### Slice 5: vendors, workers, assignments

- `vendors`, `vendor_applications`, `vendor_documents`
- `listings`, `listing_versions`, `listing_variants`
- `vendor_base_prices`, `price_reviews`, `customer_prices` — separate
  permission domains (ADR 0008)
- `vendor_visibility_policies` — per vendor, overridable per listing or deal
- `workers`, `worker_applications`, `worker_skills`, `worker_availability`
- `vendor_work_orders`, `worker_assignments`, `attendance_records`

### Slice 6: warehouse, finance, settlement

- `inventory_items`, `stock_movements`, `event_allocations`
- `assets`, `asset_custody`
- `purchase_orders`, `purchase_order_lines`, `goods_receipts`
- `expenses`, `vendor_settlements`, `worker_settlements`
- `notifications`, `reviews`

## 5. Naming and change rules

- Tables: plural snake_case; columns: snake_case; enums as `CHECK`
  constraints until a lifecycle needs a lookup table
- Migrations: zero-padded ordered files (`0002_...`, `0003_...`), each
  wrapped in a transaction, applied via `pnpm db:migrate`
- Backwards-incompatible changes require expand-and-contract (add new
  column/table, backfill, switch reads, drop later)
- Seeds for managed catalogue data live in migrations or controlled
  catalogue workbooks, never in application code

## 6. Acceptance criteria

- Every new table in slices 2-6 follows section 3 patterns
- No business or financial record is ever hard-deleted
- Every controlled mutation is reconstructible from `audit_events`
- Prices on enquiries, quotations, and deals are snapshots that survive
  catalogue changes
- The schema supports adding branches without rewriting historical records
