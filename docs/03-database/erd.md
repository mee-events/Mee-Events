# Entity Relationship Diagrams

Relationship maps below use **only foreign-key edges that exist in migrations
`0001`–`0013`**. They are simplified for readability (not every child table is
drawn).

---

## 1. Sales path to Event Record

Enquiry creates a CRM lead in the same application write. Advance payment
confirmation creates booking and event record together (application layer).
Schema relationships:

```mermaid
flowchart LR
  customers[customers]
  enquiries[enquiries]
  leads[leads]
  quotations[quotations]
  revisions[quotation_revisions]
  payments[payments]
  bookings[bookings]
  events[event_records]
  customers --> enquiries
  enquiries --> leads
  leads --> quotations
  quotations --> revisions
  quotations --> payments
  quotations --> bookings
  bookings --> events
```

Supporting tables (not all shown): `quotation_items`, `quotation_activities`,
`quotation_documents`, `payment_plans`, `booking_activities`,
`lead_activities`, catalog `event_types` / `service_categories`.

---

## 2. Event Record spokes

After `event_records` exists, fulfilment and operations attach to the event
(and often to `branch_id`).

```mermaid
flowchart TB
  ER[event_records]
  Mgr[event_manager_assignments]
  Tasks[event_tasks]
  Vendors[vendor_assignments]
  Workers[worker_tasks]
  Alloc[inventory_allocations]
  FinSum[event_financial_summary]
  OpsAtt[attendance_logs]
  OpsIssue[event_issues]
  OpsDone[event_completion]
  ER --> Mgr
  ER --> Tasks
  ER --> Vendors
  ER --> Workers
  ER --> Alloc
  ER --> FinSum
  ER --> OpsAtt
  ER --> OpsIssue
  ER --> OpsDone
  Tasks --> OpsAtt
```

Additional event children from `0005` / `0006` / `0011`: `event_timelines`,
`event_activities`, `event_notes`, `event_documents`, `event_status_history`,
`event_task_comments`, `event_progress_updates`, `event_daily_reports`,
`task_assignments`, `event_progress`, `event_photos`, `material_usage`.

---

## 3. Vendor and worker registries

```mermaid
flowchart LR
  vendors[vendors]
  workers[workers]
  VA[vendor_assignments]
  WT[worker_tasks]
  ER[event_records]
  vendors --> VA
  VA --> ER
  workers --> WT
  WT --> ER
  vendors --> vendor_members
  vendors --> vendor_categories
  vendors --> vendor_contacts
  vendors --> vendor_bank_accounts
  workers --> worker_profiles
  workers --> worker_skills
```

---

## 4. Inventory / warehouse

```mermaid
flowchart TB
  WH[warehouses]
  Loc[warehouse_locations]
  Item[inventory_items]
  Stock[inventory_stock]
  Alloc[inventory_allocations]
  Move[inventory_movements]
  ER[event_records]
  WH --> Loc
  WH --> Item
  Item --> Stock
  Item --> Alloc
  Alloc --> ER
  Item --> Move
```

Related: `inventory_units`, `inventory_returns`, `inventory_damage_reports`,
`inventory_maintenance`, `inventory_photos`, `inventory_notes`, categories and
suppliers.

---

## 5. Finance

```mermaid
flowchart TB
  ER[event_records]
  Sum[event_financial_summary]
  CP[customer_payments]
  CR[customer_refunds]
  VS[vendor_settlements]
  WP[worker_payouts]
  Exp[event_expenses]
  Inv[invoices]
  Rec[receipts]
  Ledger[ledger_entries]
  ER --> Sum
  ER --> CP
  CP --> CR
  ER --> VS
  ER --> WP
  ER --> Exp
  ER --> Inv
  ER --> Rec
  ER --> Ledger
```

Supporting reference data: `finance_accounts`, `payment_methods`,
`expense_categories`, `vendor_bills`, `finance_transactions`.

---

## 6. Pattern B history edges

```mermaid
flowchart LR
  ER[event_records]
  V[vendors]
  W[workers]
  I[inventory_items]
  ER --> event_timelines
  ER --> event_activities
  ER --> finance_timelines
  ER --> finance_activities
  ER --> operations_timelines
  ER --> operations_activities
  V --> vendor_timelines
  V --> vendor_activities
  W --> worker_timelines
  W --> worker_activities
  I --> inventory_timelines
  I --> inventory_activities
```

Foundation companions (not FK’d to a single aggregate type): `audit_events`,
`outbox_events` (`0001`). Behavioral rules:
[Pattern B Specification](../02-architecture/pattern-b.md). Schema catalog:
[pattern-b-tables.md](./pattern-b-tables.md).

---

## 7. Platform identity

```mermaid
flowchart LR
  branches[branches]
  users[app_users]
  roles[role_assignments]
  sessions[device_sessions]
  otp[otp_challenges]
  users --> roles
  users --> sessions
  users --> otp
  branches --> roles
  branches --> branch_settings
```

---

## Related

- [schema-overview.md](./schema-overview.md) — full table lists by migration
- [migrations.md](./migrations.md) — file order
