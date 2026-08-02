# ERP PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Surface: `employee_web` in `apps/erp-web` (Next.js)
- Related: ADR 0010 (slices 4-6), PRD 04 (CRM handoff), PRD 02 (vendor),
  PRD 03 (worker)

## 1. Purpose

The ERP manages internal business operations after a booking is confirmed:
the central Event Record, vendor and worker fulfilment, warehouse and
inventory, procurement, finance, payroll support, and operational reporting.
It gives management full control over resources, cost, operations, and
profitability.

## 2. The Event Record aggregate

Per ADR 0010, the central Event Record is the shared aggregate connecting:

- the customer contract (approved quotation and payment plan)
- programs (functions/ceremonies with dates, venues, and schedules)
- payments and collections
- vendor assignments and work orders
- worker assignments and attendance
- warehouse custody (allocations, dispatch, and returns)
- change requests and incidents
- settlements (vendor payables, worker payables)
- the complete audit history

Every operational module reads from and writes to the Event Record through
capability-guarded backend commands. The database record is authoritative;
real-time updates only notify.

## 3. Functional requirements

### 3.1 Booking-to-Event-Record handoff (slice 4)

- Converting CRM booking creates the Event Record with contract snapshot,
  programs, and payment plan
- Ownership transfers from sales to operations with an auditable handoff

### 3.2 Event operations (slices 4-6)

- Event plan: programs, timelines, task checklists, and control points
- Vendor assignment: compare eligible vendors on availability, price,
  quality, capacity, and location; issue work orders (PRD 02)
- Worker assignment: match skills, availability, and work areas; issue
  assignment offers (PRD 03)
- Execution tracking: attendance, task completion, proof of work, incidents
- Change requests with impact on cost and schedule
- Completion confirmation and closure

### 3.3 Warehouse and inventory (slice 6)

- Inventory items with categories, units, and stock levels
- Stock in / stock out with reasons and references to Event Records
- Event allocation, dispatch, on-site custody, and return reconciliation
- Damage and loss recording
- Asset management for durable equipment with custody history

### 3.4 Procurement

- Purchase requests and purchase orders
- Vendor purchases (from platform vendors or external suppliers)
- Goods receipt against purchase orders
- Procurement approval thresholds

### 3.5 Finance (slice 6)

- Customer invoices and payment tracking against the payment plan
- Expense tracking by event, department, and category
- Vendor payables and settlement approval (`erp_payment.approve`)
- Refund approval (`erp_refund.approve`)
- Worker payables and payroll support (attendance-based computation, export
  to payroll processing)
- Collections dashboard: due, overdue, and received

### 3.6 Approvals

- One approval queue for: vendor applications, worker applications, listing
  reviews, price reviews (`erp_vendor_price.approve`), discount thresholds,
  purchase orders, payments, refunds, and settlements
- Every decision records actor, timestamp, reason, and evidence

### 3.7 Administration

- User and role management (`platform_user.manage`)
- Catalogue management: event types, functions, service categories,
  subcategories, and published content versions
- Branch settings (for example the lead SLA)
- Feature toggles and policy management (`platform_policy.manage`)
- Audit log access (`audit.read`)

## 4. Reporting

- Event completion report and event profitability (revenue minus vendor,
  worker, inventory, and expense costs)
- Vendor performance: acceptance rate, on-time completion, quality
- Worker performance: attendance, punctuality, completion
- Inventory usage and shrinkage
- Payment status and collections ageing
- Expense summary by department
- Department and branch performance

## 5. Access control

- ERP modules follow the bootstrap policy: `erp_events`, `erp_vendors`,
  `erp_workers`, `erp_warehouse`, `erp_finance`, `erp_approvals`,
  `erp_reports`, `platform_administration`, `audit_log`
- Financial capabilities are separated from operational ones; vendor base
  price, customer price, margin, and settlement data are distinct permission
  domains
- Data scope: Hyderabad branch and assignment in Phase 1
- Every controlled mutation writes an audit event with previous and new
  versions

## 6. Out of scope for Phase 1

- Multi-branch consolidation reporting
- Deep financial automation (auto-reconciliation, accounting system export)
- Advanced forecasting dashboards

## 7. Acceptance criteria

- A confirmed booking produces a complete Event Record without re-entry of
  CRM data
- Vendors and workers can be assigned and their acceptance and execution
  status is visible against the Event Record
- Inventory allocated to an event is tracked out and reconciled back
- Customer collections, vendor payables, and worker payables reconcile with
  the Event Record contract and execution data
- Every approval decision is auditable end to end
