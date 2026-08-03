# Indexing

Indexes are declared in feature migrations when tables are introduced, then
backfilled for uncovered foreign keys in `0014_add_missing_fk_indexes.sql`.

---

## Strategy

| Layer                              | Practice                                                                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature migrations (`0001`–`0013`) | Access-path indexes for list/filter/status queries; unique and partial uniques for lifecycle invariants                                                                 |
| `0014`                             | Additive, idempotent FK indexes where the FK column was not already covered by a PRIMARY KEY, UNIQUE constraint, or existing index whose **leftmost** column is that FK |
| Application                        | Prefer filtering/sorting in SQL that can use these indexes; paginate list endpoints                                                                                     |

`0014` does not change tables, columns, or constraints. It creates on the order
of **158** `CREATE INDEX IF NOT EXISTS` statements.

---

## Notable indexes by area

### Platform and identity

| Index / constraint (examples)                                         | Why                                 |
| --------------------------------------------------------------------- | ----------------------------------- |
| `outbox_events_delivery_idx` on `(status, available_at, created_at)`  | Publisher claim/order               |
| `audit_events_entity_timeline_idx`, `audit_events_actor_timeline_idx` | Audit reconstruction                |
| Active device session uniqueness (`0001`)                             | One active session per device rules |
| Partial refresh digest indexes (`0002`)                               | Refresh rotation / reuse detection  |

### CRM and sales

Branch/status and customer/date style indexes on enquiries, leads, quotations,
payments, bookings, and event records (see `0003`–`0005`) support CRM list
screens.

### Assignment and attendance uniques

Examples of soft lifecycle uniqueness (partial unique indexes):

| Index                                                               | Migration |
| ------------------------------------------------------------------- | --------- |
| `event_manager_assignments_active_uniq`                             | `0006`    |
| `vendor_assignments_open_uniq`                                      | `0007`    |
| `worker_attendance_task_day_uniq`                                   | `0008`    |
| `worker_vendor_membership_primary_uniq`                             | `0008`    |
| `task_assignments_active_*_uniq` (manager/supervisor/vendor/worker) | `0011`    |
| `attendance_logs_open_worker_uniq`                                  | `0011`    |

These prevent duplicate “open” or “active” relationships without hard deletes.

### Pattern B owner indexes (`0013`)

Module timeline/activity tables are indexed by their owner FK (for example
vendor, worker, item, or event record) for history reads.

### FK backfill (`0014`)

Examples of coverage added when leftmost FK indexes were missing: actor/user
FKs on activities and notes, `branch_id` on finance and audit rows, enquiry/lead
links on bookings, and similar join paths used by adapters.

---

## Guidance for new migrations

1. When adding a table with FKs used in `WHERE` / `JOIN`, add a supporting index
   in the **same** migration unless the FK is already the PK or leftmost unique
   key.
2. Prefer composite indexes that match real filters (`branch_id`, status,
   `created_at DESC`) over single-column indexes that will never be selective
   alone.
3. Use partial unique indexes for “one open row” rules instead of application
   only checks.
4. Do not rely on a future catch-all like `0014`; treat `0014` as a gap-fill,
   not the default place for feature indexes.

---

## Related

- [migrations.md](./migrations.md)
- [schema-overview.md](./schema-overview.md)
- [Backend performance guidelines](../02-architecture/backend.md)
