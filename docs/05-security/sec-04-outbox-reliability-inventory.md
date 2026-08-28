# SEC-04 — Outbox and idempotency reliability

- **Task:** STAB-20 / SEC-04 only (crash-safe retry, dead-letter, exactly one business result)
- **Date:** 28 August 2026
- **Phase 0:** still **NOT PASSED**. STAB-20 remains **open**. SEC-05 is **not started**.
- **Result:** **DONE WITH FINDINGS**
- **This slice does not claim production is secure.**

Customer enquiry create does **not** insert the CRM lead in the same write. It
inserts `outbox_events` topic `enquiry.submitted`. A background worker creates
the lead later. SEC-04 is at-least-once delivery with exactly one business
result for the **live** processors, plus honest dead-letter after too many
handler failures.

No new migration: `available_at` is the processing lease.

## Status key

| Status         | Meaning                                                |
| -------------- | ------------------------------------------------------ |
| Already proven | True before this commit; left in place                 |
| Fixed          | Changed in this commit                                 |
| Finding        | Inspected; left open with file + reason; do not invent |

## Live processors

| Topic               | Consumer                          | Side effect                        |
| ------------------- | --------------------------------- | ---------------------------------- |
| `enquiry.submitted` | `EnquirySubmittedOutboxProcessor` | `leads.createFromEnquirySubmitted` |
| `crm.lead.updated`  | `LeadUpdatedOutboxProcessor`      | `enquiries.syncStatusFromCrmLead`  |

These are the only Nest `OnModuleInit` outbox pollers. Claim uses
`FOR UPDATE SKIP LOCKED`. Complete uses `status = 'processing' AND attempts = $claimed`.

## What already worked (before this slice)

| Behavior                                                                                         | Status         |
| ------------------------------------------------------------------------------------------------ | -------------- |
| Enquiry create commits customer + enquiry + audit + `enquiry.submitted` in one TX                | Already proven |
| Two processors on a **pending** row create one lead (`SKIP LOCKED`)                              | Already proven |
| Repeat tick after `published` does not insert a second lead                                      | Already proven |
| Malformed **pending** payload at attempt 7 → `failed` at attempt 8                               | Already proven |
| `leads.enquiry_id` is `UNIQUE`; SELECT-before-insert is idempotent if the lead already committed | Already proven |
| `syncStatusFromCrmLead` for `claimed` / `contacted` uses guarded `UPDATE`                        | Already proven |

## What broke on crash or double delivery (before this slice)

| Case                                                                   | Before                                                | After                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| Worker dies after claim commit, before handler (`status = processing`) | Next tick selected only `pending` → row stuck forever | Expired `processing` (`available_at <= now()`) is reclaimable |
| Worker dies after lead insert, before `published`                      | Lead exists, outbox stuck `processing`                | Retry sees existing lead, marks `published`                   |
| Two workers after lease expiry                                         | Not defined (row was stuck)                           | `SKIP LOCKED` + attempts CAS; lead unique + 23505 catch       |
| Concurrent `INSERT INTO leads` after both SELECT empty                 | One worker threw `23505`                              | Loser re-SELECTs and returns `{ created: false }`             |
| Handler throws until attempt 8                                         | `failed` + `last_error` (pending path only)           | Same dead-letter; also for reclaimed `processing`             |
| Active lease (`processing` and `available_at` in the future)           | N/A                                                   | Not claimed                                                   |

## Lease / recovery / dead-letter

Shared helper: `apps/backend/src/common/outbox/outbox-delivery.ts`.

1. **Claim:** `status IN ('pending', 'processing') AND available_at <= now()`,
   `FOR UPDATE SKIP LOCKED`, then `processing`, `attempts + 1`,
   `available_at = now() + 30s`.
2. **Success:** `published` only if `status = 'processing' AND attempts = $claimed`.
3. **Handler failure:** `failed` when `attempts >= 8`, else `pending` with the
   existing backoff (`LEAST(300, attempts * 5)` seconds) and `last_error`.
   Operators can `SELECT … WHERE status = 'failed'`. A warn log records the
   dead-letter (no metrics product).
4. **Do not reclaim** `failed` or `published`. Expired `processing` is
   reclaimed even when `attempts >= 8` so crash-after-success-before-publish
   can still mark `published` (handlers are idempotent).

Same-process overlapping `tick()` is still skipped (`ticking`). Two processes
do not share that flag; the database lock and lease are the cross-process
control.

## Idempotent consume

| Handler                      | Duplicate / concurrent delivery                                      |
| ---------------------------- | -------------------------------------------------------------------- |
| `createFromEnquirySubmitted` | Unique `enquiry_id` + SELECT + `23505` re-SELECT → one lead          |
| `syncStatusFromCrmLead`      | Same outbox row retried after crash does not insert a second enquiry |

`idempotency_records` exists in `0001_platform_foundation.sql` and has **no**
application usage. This slice does not add HTTP `Idempotency-Key` middleware.

## Topics with no consumer (findings — do not invent publishers)

Written to `outbox_events`, never processed by a worker in this repository:

| Family                 | Topics                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quotation / payment    | `quotation.created`, `quotation.revised`, `quotation.sent`, `quotation.approved`, `quotation.rejected`, `quotation.revision_requested`, `payment.advance_submitted`, `payment.advance_confirmed` |
| Booking                | `booking.created`                                                                                                                                                                                |
| Event record           | `event_record.created`, `event_record.updated`, `event_record.status_changed`, `event_record.note_added`, `event_record.note_updated`, `event_record.timeline_added`                             |
| Operations / inventory | `operations.*`, `inventory.*`, `warehouse.created`, `warehouse.updated` (payloads mark `pushIntegrated: false`, `channel: outbox_only`)                                                          |
| Vendor / worker        | `vendor.*`, `worker.*` (same outbox-only payloads)                                                                                                                                               |
| Finance                | `finance.*`                                                                                                                                                                                      |
| Manager / task         | `manager.assigned`, `manager.reassigned`, `task.*`, `progress.added`, `event.status_changed`                                                                                                     |

These rows can sit `pending` forever. That is existing product debt, not a
silent publisher in this commit.

## Still open (not blocked; not this slice)

| Item                                                                                | Owner / later task     | Reason                                                                                          |
| ----------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| HTTP `Idempotency-Key` / `idempotency_records` writes                               | Later API work         | Table unused; not required to keep one lead                                                     |
| Push / email / SMS publishers for unconsumed topics                                 | Notification work      | Explicitly out of scope                                                                         |
| `syncStatusFromCrmLead` for `qualified` / `quoted` / `lost` / `closed` is unguarded | Enquiry status machine | Same-row retry is a same-value overwrite; an _older_ event after a _newer_ status could regress |
| Operator dashboard / Prometheus for outbox depth                                    | Observability          | Dead-letter is `failed` + `last_error` + warn log                                               |
| Headers / Swagger / log redaction                                                   | SEC-05                 | **Not started**                                                                                 |
| Direct Supabase on mobile                                                           | SEC-06                 | **Not started**                                                                                 |

## Tests

- Unit: claim SQL (lease, `SKIP LOCKED`, pending+processing), publish/fail CAS,
  processor tick / poison / in-process overlapping tick, lead `23505` race.
- PostgreSQL: crash after claim before lead (two workers → one lead);
  crash after lead before publish; active lease not stolen; stranded poison →
  `failed`; concurrent `createFromEnquirySubmitted`; stranded `crm.lead.updated`.

Do not treat this inventory as production-readiness proof.
