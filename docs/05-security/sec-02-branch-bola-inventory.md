# SEC-02 — Employee ID-route branch inventory

- **Task:** STAB-20 / SEC-02 plus the inventory-allocation corrective follow-up
- **Date:** 27 August 2026; corrective follow-up 28 August 2026
- **Phase 0:** still **NOT PASSED**. STAB-20 remains **open**. SEC-M-09 is **NOT STARTED**.
- **Result:** **DONE WITH FINDINGS**
- **Rule:** other-branch access must look like missing (**404**), never 403 that confirms the record exists.

This inventory covers employee CRM/ERP ID routes in the named SEC-02 modules.
Customer/vendor/worker “own record” APIs are listed only where they share a
repository with employee paths. Catalog/search/health are not branch resources.

Employee authorization uses `resolveBranchId(principal)`
(`apps/backend/src/common/branch/branch-context.ts`). Repositories add
`AND branch_id = $n` or `AND e.branch_id = $n` on UUID get/lock/update.

## Status key

| Status         | Meaning                                                      |
| -------------- | ------------------------------------------------------------ |
| Already scoped | List/dashboard already filtered by branch before this commit |
| Fixed          | UUID get/update now includes the principal’s active branch   |
| Finding        | Inspected; left open with file + reason                      |
| N/A            | Not a branch resource ID                                     |

## CRM leads

| Route                             | Files                                    | Status                                  |
| --------------------------------- | ---------------------------------------- | --------------------------------------- |
| `GET crm/leads`                   | `crm.controller.ts`, `lead.service` list | Already scoped (`listForBranch`)        |
| `GET crm/leads/:id`               | `crm.controller.ts` `getLead`            | Fixed — `findDetailById(id, branchId)`  |
| `POST crm/leads/:id/claim`        | `crm.service.ts` `claimLead`             | Fixed — find + claim include `branchId` |
| `POST crm/leads/:id/requirements` | `saveRequirements`                       | Fixed                                   |
| `PATCH crm/leads/:id/status`      | `updateStatus`                           | Fixed                                   |

Postgres: `apps/backend/src/modules/crm/adapters/postgres-lead.repository.ts`.

## Quotations

| Route                             | Files                               | Status                                   |
| --------------------------------- | ----------------------------------- | ---------------------------------------- |
| `GET crm/quotations`              | `crm-quotation.controller.ts`       | Already scoped                           |
| `GET crm/quotations/:id`          | `getCrm` → `findById(id, branchId)` | Fixed                                    |
| `GET crm/quotations/:id/timeline` | `timelineCrm`                       | Fixed via `requireDetail`                |
| `GET crm/quotations/:id/pdf`      | `pdfPlaceholder`                    | Fixed via `requireDetail`                |
| Draft update / revise / send      | `quotation.service.ts`              | Fixed — mutation inputs carry `branchId` |
| `GET quotations/:id` (customer)   | `quotation.controller.ts`           | N/A for SEC-02 — `findForCustomerUser`   |

## Bookings

| Route                         | Files                            | Status                           |
| ----------------------------- | -------------------------------- | -------------------------------- |
| `GET crm/bookings/:id`        | `booking.controller.ts` `getCrm` | Fixed — `findById(id, branchId)` |
| `GET bookings/:id` (customer) | same controller                  | N/A — ownership                  |

## CRM payments

| Route                                     | Files                     | Status                                          |
| ----------------------------------------- | ------------------------- | ----------------------------------------------- |
| `POST crm/payments/:id/confirm`           | `payment.controller.ts`   | Fixed — `findById` + confirm lock `p.branch_id` |
| `GET crm/payments/quotation/:quotationId` | `listPendingForQuotation` | Fixed — pending list is branch-scoped           |

## Event records

| Route                                        | Files                            | Status                                            |
| -------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET crm/events/:id` (+ timeline/activities) | `crm-event-record.controller.ts` | Fixed — `findById(id, branchId)`                  |
| Create-from-booking                          | `event-record.service.ts`        | Fixed lookup uses `findByBookingId(id, branchId)` |
| `GET events/:id` (customer)                  | `event-record.controller.ts`     | N/A — ownership                                   |

**Finding:** other-branch create-from-booking still returns **409**
`EVENT_RECORD_NOT_CREATABLE` (same as a missing/ineligible booking), not 404.
File: `event-record.service.ts` `createFromBooking`. Left unchanged so we do
not retune the create contract in this slice.

## Operations

| Route                                                 | Files                               | Status                                               |
| ----------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| `GET crm/operations/events/:eventRecordId`            | `crm-operations.controller.ts`      | Fixed                                                |
| `GET crm/operations/tasks/:taskId`                    | same                                | Fixed                                                |
| `GET crm/operations/events/:eventRecordId/completion` | same                                | Fixed                                                |
| `GET …/me/events/:eventRecordId`                      | same controller                     | Fixed (same service)                                 |
| Task/assign/progress mutations                        | `postgres-operations.repository.ts` | Fixed — event lock includes `branchId`               |
| `PATCH issues/:issueId`                               | `updateIssue`                       | Fixed — issue SELECT joins `event_records.branch_id` |
| `PATCH materials/:materialId`                         | `updateMaterial`                    | Fixed — same pattern                                 |
| Attendance check-out by log id                        | `checkOut`                          | Fixed — same pattern                                 |

Lists (`events`, `tasks`, `attendance`, `issues`, `photos`, `materials`,
`progress`) were already branch-scoped.

## Manager operations

| Route                                        | Files                                       | Status                                               |
| -------------------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `GET crm/manager/events/:eventId/assignment` | `crm-manager-operations.controller.ts`      | Fixed                                                |
| `GET crm/manager/events/:eventId/dashboard`  | same                                        | Fixed                                                |
| `GET crm/manager/events/:eventId/tasks`      | same                                        | Fixed                                                |
| `GET crm/manager/tasks/:taskId`              | same                                        | Fixed                                                |
| `GET manager/events/:eventId/dashboard`      | `manager-operations.controller.ts`          | Fixed                                                |
| `GET manager/tasks/:taskId`                  | same                                        | Fixed                                                |
| Manager assign / task / progress mutations   | `postgres-manager-operations.repository.ts` | Fixed — event/task/progress locks join `e.branch_id` |
| `GET crm/manager/candidates`                 | `listCandidates`                            | N/A — user list, not a branch resource ID            |

**Finding:** `getOwnEventDashboard` now 404s when the event is unassigned to
this manager (previously 403 `MANAGER_EVENT_FORBIDDEN`). That avoids confirming
the event exists to a manager who is not assigned.

## Finance

| Route                                                                            | Files                       | Status                                               |
| -------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| `GET crm/finance/events/:eventRecordId`                                          | `crm-finance.controller.ts` | Fixed                                                |
| `GET crm/finance/me/events/:eventRecordId`                                       | same                        | Fixed                                                |
| Ensure/update event finance                                                      | `finance.service.ts`        | Fixed — `ensureEventFinance` 404s when branch misses |
| `PATCH crm/finance/vendors/:settlementId`                                        | `lockSettlement`            | Fixed — `s.branch_id`                                |
| `PATCH crm/finance/workers/:payoutId`                                            | `lockPayout`                | Fixed — `p.branch_id`                                |
| List dashboards (events, payments, vendors, workers, invoices, receipts, ledger) | already `branchId`          | Already scoped                                       |

## Inventory

| Route                                         | Files                              | Status                                                          |
| --------------------------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| `GET crm/warehouses/:id`                      | `crm-inventory.controller.ts`      | Fixed                                                           |
| `GET crm/inventory/:id`                       | same                               | Fixed                                                           |
| `GET crm/inventory/allocations/:allocationId` | same                               | Fixed                                                           |
| `GET crm/me/allocations/:allocationId`        | same                               | Fixed                                                           |
| `POST crm/inventory/allocations`              | `postgres-inventory.repository.ts` | Corrected — event and item locks both include the active branch |
| Warehouse/item and allocation update/return   | same                               | Fixed — branch-scoped get/update or allocation lock             |
| Lists / dashboards                            | already `branchId`                 | Already scoped                                                  |

The independent Phase 0 review found that `allocate()` still selected and
locked `event_records` and `inventory_items` by UUID alone. The later item
update had a branch predicate, but it occurred after the allocation insert and
therefore did not prevent cross-branch allocation, movement, timeline, outbox,
or audit writes.

The 28 August corrective follow-up adds `branch_id = input.branchId` to both
`FOR UPDATE` reads in the same transaction. A missing event or item now returns
the existing `INVENTORY_ALLOCATE_FAILED` **404** before the first mutation. No
inventory redesign, schema change, or quantity/concurrency behavior changed.

## Vendors

| Route                                           | Files                                     | Status                                        |
| ----------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| `GET crm/vendors/:id`                           | `crm-vendor.controller.ts`                | Fixed                                         |
| `GET crm/vendors/assignments`                   | `listAssignments` now passes `branchId`   | Fixed (list was optional)                     |
| `GET crm/vendors/assignments/:assignmentId`     | `getAssignment(id, branchId)`             | Fixed                                         |
| Create/update vendor, assign, mutate assignment | postgres adapter                          | Fixed — vendor/event locks include `branchId` |
| `GET vendors/me/assignments/:assignmentId`      | `vendor.controller.ts` `getOwnAssignment` | Finding — see below                           |
| CRM vendor dashboard                            | `getCrmDashboard(branchId)`               | Already scoped                                |

## Workers

| Route                                  | Files                                  | Status              |
| -------------------------------------- | -------------------------------------- | ------------------- |
| `GET crm/workers/:id`                  | `crm-worker.controller.ts`             | Fixed               |
| `GET crm/workers/tasks`                | `listTasks` now passes `branchId`      | Fixed               |
| `GET crm/workers/tasks/:taskId`        | `getTask(id, branchId)`                | Fixed               |
| `GET crm/workers/attendance`           | `listAttendance` now passes `branchId` | Fixed               |
| Assign / check-in / progress mutations | `lockTask` + event lock                | Fixed               |
| `GET workers/me/tasks/:taskId`         | `getOwnTask`                           | Finding — see below |
| CRM worker dashboard                   | `getCrmDashboard(branchId)`            | Already scoped      |

## Findings (not silent skips)

1. **Vendor/worker own-record GET still loads by UUID then 403 if not a member.**
   Files: `vendor.service.ts` `assertOwnsAssignment`, `worker.service.ts`
   `assertOwnsTask`. This is ownership, not employee branch BOLA. A logged-in
   vendor/worker who is not the owner can still learn that the UUID exists
   (403 vs 404). Customer own-record APIs were out of SEC-02 scope; these
   own-dashboard paths were left on the same ownership contract.
2. **Create event from other-branch booking ID returns 409, not 404.**
   File: `event-record.service.ts` `createFromBooking`
   (`EVENT_RECORD_NOT_CREATABLE`). Same code as an ineligible booking.
3. **HTTP-level BOLA coverage remains limited.** The STAB-17 smokes do not
   exercise this allocation matrix through the Nest auth pipeline. This
   corrective follow-up proves repository/service denial with transaction-unit
   and PostgreSQL tests.
4. **No live staging or production environment has been proven.** This
   corrective follow-up does not make production secure, close STAB-20, or pass
   Phase 0. The exact next block is SEC-M-09, **NOT STARTED**.

## Tests

Same-branch allow / other-branch **404** (not 403) in:

- `apps/backend/test/crm-service.spec.ts`
- `apps/backend/test/quotation-payment-workflow.spec.ts`
- `apps/backend/test/event-record-foundation.spec.ts`
- `apps/backend/test/operations-execution-foundation.spec.ts`
- `apps/backend/test/manager-operations-foundation.spec.ts`
- `apps/backend/test/finance-settlement-foundation.spec.ts`
- `apps/backend/test/inventory-warehouse-foundation.spec.ts`
- `apps/backend/test/vendor-management-foundation.spec.ts`
- `apps/backend/test/worker-management-foundation.spec.ts`

The corrective follow-up adds transaction-unit SQL-shape coverage in
`apps/backend/test/postgres-inventory-allocation-branch.spec.ts`: **2/2** prove
the event and item locks carry the active branch, return the stable 404, roll
back, and execute no mutation.

PostgreSQL: `apps/backend/test/integration/connected-workflow.integration.spec.ts`
asserts `findById(id, HYDERABAD)` is undefined for a second-branch lead,
quotation, booking, and event record, and `findById(id, secondBranch)` returns
the row.

Corrective PostgreSQL coverage in
`apps/backend/test/integration/inventory-allocation-branch.integration.spec.ts`
is **5/5**: same-branch success, other-branch event 404, other-branch item 404,
an entirely outside-branch pair 404, no durable allocation/stock/movement/event
or inventory history/outbox/audit changes on denial, and concurrent requested
quantities preserved. Full verification after the correction: format, lint,
and typecheck passed; backend unit **239/239**; ERP unit **12/12**; PostgreSQL
integration **37/37**.
