# PostgreSQL Database Integration Baseline — STAB-15

- **Accepted:** 27 August 2026 after independent source review, with retained findings
- **Repository:** `/Users/vinaychilagani/Desktop/Mee Event V1`
- **Branch / correction starting commit:** `master` / `4e2b252f1732262bb9fe17a659a76e2a006b8ae3`
- **Task:** STAB-15 — PostgreSQL database integration test foundation
- **Result:** **INDEPENDENTLY ACCEPTED WITH FINDINGS** — four required fresh PostgreSQL 17.2 runs passed 21/21 cases across 3/3 files; no skip, todo, expected-failure, focused case, retry, or conditional pass exists
- **Boundary:** repository/service integration through real `pg.Pool` connections and all 20 migrations. This is not HTTP, Redis, browser, provider, backup/restore, remote database, or production-readiness proof.

## Toolchain and commands

| Item                     | Verified value                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Host                     | macOS / `darwin-arm64`                                                                                    |
| Node                     | `v20.20.2`                                                                                                |
| pnpm                     | `9.15.4` through Corepack                                                                                 |
| Vitest                   | `3.2.7`                                                                                                   |
| PostgreSQL               | official `postgres:17.2-alpine`; runtime version begins `17.2`                                            |
| PostgreSQL client        | `pg` `8.22.0`                                                                                             |
| Unit command             | `corepack pnpm --filter @me-event/backend test`                                                           |
| Integration command      | `corepack pnpm --filter @me-event/backend test:integration`                                               |
| Root convenience command | `corepack pnpm test:integration:backend`                                                                  |
| Shuffled command         | `corepack pnpm --filter @me-event/backend test:integration -- --sequence.shuffle --sequence.seed=6152026` |
| Second shuffled command  | `corepack pnpm --filter @me-event/backend test:integration -- --sequence.shuffle --sequence.seed=8262026` |

The unit command uses `test/vitest.unit.config.ts`: it includes
`test/**/*.spec.ts` and explicitly excludes `test/integration/**`. The dedicated
configuration includes only `test/integration/**/*.integration.spec.ts`, uses a
global database identity check, disables file parallelism, fixes worker count at
one, and applies 20-second test, 30-second hook, and 10-second teardown timeouts.
Vitest's normal fail-on-zero-files behavior is preserved.

## Test architecture

The maintained harness is deliberately separate from development Compose:

1. `run-postgres-integration.sh` chooses an unused loopback port and a unique
   `mee-dbint-<pid>-<time>` Compose project.
2. It rejects malformed project names, `me-event-local`, and any pre-existing
   resources with the selected project label.
3. It resolves and compares the effective Compose project before startup.
4. It starts only the test-owned PostgreSQL 17.2 service from
   `test/integration/docker-compose.yml` and verifies both the Compose project
   label and `com.mee-events.database-integration=true` safety label.
5. It waits at most 60 seconds for readiness, applies the repository's 20
   migration files in `LC_ALL=C` filename order, and verifies the exact ledger
   count and first/last filenames.
6. It creates a test-only database identity marker and exposes a connection URL
   for the child Vitest process only.
7. The TypeScript guard independently requires loopback, exact database/user,
   a `mee-dbint-*` project, and a matching `application_name`; global setup
   verifies the marker, current database, PostgreSQL 17.2, and migration ledger.
8. `EXIT`, `INT`, `TERM`, and `HUP` traps remove only the exact project's
   container, network, and volume, then fail if a labeled resource remains.

The pool is bounded to 6 connections with 2-second connection, 1-second idle,
and 10-second statement timeouts. All suites call `pool.end()`. Outbox processor
`tick()` methods are invoked manually; lifecycle timers are never started.

## Fail-closed and isolation evidence

| Probe                             | Evidence                                                                                                                        | Result |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Missing integration configuration | Direct integration configuration probe rejects before connecting                                                                | PASS   |
| Unsafe URL/identity               | Tests reject non-loopback, malformed, wrong database, wrong user, and wrong project/application identity before creating a pool | PASS   |
| Zero discovery                    | Nonexistent integration filter exited `1` with `No test files found`                                                            | PASS   |
| Database unavailable              | A synthetically configured unavailable loopback endpoint exited nonzero during global setup                                     | PASS   |
| Unit separation                   | Ordinary unit discovery is exactly 30 files / 190 tests and does not include `.integration.spec.ts`                             | PASS   |
| Fresh state                       | Canonical, repeat, and both shuffled runs each created and removed a different database project                                 | PASS   |
| Developer state                   | The pre-existing `me-event-local` Postgres/Redis container IDs and state were unchanged                                         | PASS   |

The committed password is local test orchestration data scoped to this disposable
container. No founder environment file or remote URL was read.

## Test inventory

| File                                     |  Cases | Required groups    | Production boundary exercised                                                                                                      |
| ---------------------------------------- | -----: | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `harness-safety.integration.spec.ts`     |      4 | DBINT-01, DBINT-14 | Configuration guard, PostgreSQL identity/ledger, bounded pool cleanup                                                              |
| `identity.integration.spec.ts`           |      8 | DBINT-02–04        | `AuthService`, two `PostgresIdentityRepository`/pool instances, `PostgresAuditSink`, JWT signing, constraints, row locking and CAS |
| `connected-workflow.integration.spec.ts` |      9 | DBINT-05–13        | Enquiry, CRM lead/outbox processors, quotation, payment, booking and Event Record services/adapters                                |
| **Total**                                | **21** | **DBINT-01–14**    | **Real PostgreSQL and production adapters/services**                                                                               |

Parameterized assertions remain registered inside these 21 test cases; there is
no dynamic conditional registration. Support files provide only deterministic
fixtures, database guards, and workflow setup. No integration case is skipped,
todo, focused, conditionally returned, retried, or marked as expected to fail.

## Execution evidence

| Run                                 | Fresh database | Files | Tests | Failed / skipped / todo | Vitest duration | Exit |
| ----------------------------------- | -------------- | ----: | ----: | ----------------------- | --------------: | ---: |
| Canonical                           | yes            |   3/3 | 21/21 | 0 / 0 / 0               |          1.89 s |    0 |
| Canonical repeat                    | yes            |   3/3 | 21/21 | 0 / 0 / 0               |          1.91 s |    0 |
| Shuffled serialized, seed `6152026` | yes            |   3/3 | 21/21 | 0 / 0 / 0               |          1.89 s |    0 |
| Shuffled serialized, seed `8262026` | yes            |   3/3 | 21/21 | 0 / 0 / 0               |          1.96 s |    0 |

Expected output was limited to idempotent migration `NOTICE` messages and two
Nest warnings deliberately produced by malformed outbox fixtures. Those rows
were asserted failed at attempt 8 without a business mutation. No unhandled
exception, pending timer, open pool, or leaked Compose resource remained.

## Correction attempt record

- Before production edits, the ordinary backend suite passed 30/30 files and
  188/188 tests.
- The pre-correction form of the maintained two-service/two-pool case was run
  alone on a fresh database. It reproduced one successful rotation, one
  `SESSION_REFRESH_REUSED`, a revoked winner, one rotation audit, and one
  reuse-revocation audit. The `-t` selection reported the seven non-selected
  cases as filtered/skipped; no maintained test used `.skip`, `.only`, retry,
  conditional execution, or expected-failure behavior. Every final full-suite
  run reports 0 skipped.
- The first post-edit typecheck failed with two `TS2339` errors because three
  non-success outcomes shared one union member and did not narrow to the
  rotated result. Splitting those outcomes into distinct discriminated-union
  members fixed the type error; no assertion or compiler setting was weakened.
- The first targeted Prettier check reported style drift in
  `identity.integration.spec.ts`; the pinned formatter corrected it. This was
  the only formatting attempt that did not pass.
- The first secret-scan invocation had a shell quoting error. The corrected
  added-line scan completed with no private-key, provider-token,
  credential-bearing database URL, or assigned-secret pattern match.
- The corrected focused identity run passed 8/8. Canonical, repeat, and both
  shuffled full-suite runs then passed 21/21 without a failed or flaky race.
  The final backend unit run passed 30/30 files and 190/190 tests.

## Adapter and transaction inventory

Sixteen maintained PostgreSQL adapters/sinks were found: audit, bookings,
catalog, CRM, enquiries, Event Record, finance, identity, inventory, manager
operations, operations, payments, quotations, search, vendors, and workers.
STAB-15 directly exercises only the critical audit, booking, CRM, enquiry,
Event Record, identity, payment, and quotation adapters. Catalog, finance,
inventory, manager operations, operations, search, vendor, and worker adapters
remain outside this integration baseline.

The exercised repositories use actual pool queries and explicit transactions.
Live evidence covers transaction commit/rollback, PostgreSQL foreign/unique
constraints, conditional update/`RETURNING`, row locks, and outbox
`FOR UPDATE SKIP LOCKED`. Fake repositories are not used for any behavior
claimed by this baseline.

## Identity results

- OTP challenge insert/read maps attempts and optional consumed timestamps.
- Transactional user creation produces one user and one active Customer role on
  the migration-seeded Hyderabad branch; a test-only late role trigger forces a
  rollback that leaves no user.
- Device-session create/read/revoke mapping and role-version compare-and-set are
  proven; concurrent role switches have one winner and one audit event.
- Incorrect, expired, exhausted, and consumed OTP challenges fail with
  controlled domain errors and persisted PostgreSQL state.
- Two simultaneous valid OTP verifications produce exactly one success, one
  consumed challenge, one user/role/session outcome, and two successful-login
  audit events; the loser receives a controlled challenge-invalid error.
- Sequential refresh rotates once; presenting the previous token revokes the
  session, records reuse, and the revoked session cannot refresh.
- One-service concurrency is covered separately by the 30-file unit suite: the
  process-local in-flight guard produces one winner and one controlled conflict,
  releases its state after controlled errors, and does not revoke the winner.
- Repository-only concurrent CAS through two repositories returns exactly one
  `true` and one `false`; one next digest becomes current.
- The maintained two-service test uses two `AuthService` instances, two
  `PostgresIdentityRepository` instances, and two warmed `pg.Pool` objects
  connected to one database. It repeats 20 fresh synthetic user/session races
  per suite run. Every race produces one success and one
  `SESSION_REFRESH_CONFLICT`; the winner stays current and unrevoked with one
  rotation audit and zero revocation audits.

### Production corrections

STAB-15 replaced unconditional challenge writes with conditional PostgreSQL
updates for failed-attempt decrement and one-time consume. Refresh-token
rotation retains the presented-digest CAS as its authority. The corrected
repository composes lookup, classification, active/user checks, row locking,
CAS rotation, and genuine-reuse revocation inside a PostgreSQL
`REPEATABLE READ` transaction. It establishes the transaction snapshot before
locking the existing device-session row; a concurrent transaction that observed
the same current token receives PostgreSQL serialization failure and maps to
controlled `SESSION_REFRESH_CONFLICT`. A later transaction that observes the
digest as `previous` still revokes the session as `SESSION_REFRESH_REUSED`.

The process-local in-flight set remains a fast one-service guard, while
PostgreSQL transaction isolation and the session-row lock coordinate separate
API processes. No raw token or digest is used as a PostgreSQL coordination key,
and no table, migration, grace window, retry, sleep, or test-only coordinator
was added. The in-memory adapter preserves interface parity.

This correction does not complete `SEC-03`: OTP consumption still precedes
user/session/audit completion; refresh state mutation can still precede audit
completion; full session/audit transactional atomicity, stable installation
identity, session inventory/revoke-all, and broader access-token/session
revocation design remain open under `SEC-03`/STAB-20.

## Enquiry, outbox, and CRM results

- Enquiry creation commits Customer, Enquiry, audit, and
  `enquiry.submitted` outbox rows with matching branch, owner, reference,
  aggregate ID/version, and payload.
- A nonexistent dependent branch fails after customer upsert and rolls the
  entire attempt back, including audit/outbox.
- Two `EnquirySubmittedOutboxProcessor` instances using
  `FOR UPDATE SKIP LOCKED` create exactly one lead, activity, and audit row;
  the event publishes once and repeated ticks do not duplicate the lead.
- A malformed enquiry payload reaches its documented failed state at attempt 8
  and creates no lead.
- Supported lead transitions publish and synchronize the enquiry to
  `in_discussion`; activity, audit, outbox aggregate/version, and idempotent
  repeat behavior agree. Malformed lead payload does not mutate the enquiry.

This does not prove worker-crash recovery or leases. `SEC-04` remains open.

## Quotation, payment, booking, and Event Record results

- The real quotation service/repository loads the lead, creates draft header,
  revision, items, activity and audit, then sends a payment plan/outbox and
  approves once.
- Exact decimal strings are asserted: subtotal `2000.00`, tax `360.00`, total
  `2360.00`, advance `708.00`, and balance `1652.00`. A different customer
  cannot read or approve; duplicate approval adds no companions.
- Advance submission rejects the wrong owner, non-approved state, and duplicate;
  the accepted amount is `708.00` from the plan rather than caller input, with
  matching activity/audit/outbox.
- Concurrent confirmation has exactly one successful business outcome: paid
  advance, one confirmed booking, one Event Record, converted lead, closed
  enquiry, and the implemented booking/quotation/event timeline, activity,
  status-history, audit, and outbox companions. A later confirmation remains a
  controlled non-success without duplicating the outcome.
- A forced late duplicate booking-number constraint error rolls back payment,
  booking, Event Record, companions, lead, and enquiry state.
- Customer-owned booking and Event Record reads return the resulting resources.

This proves the internal manual confirmation path, not provider signature,
webhook replay, settlement, refund, or payment authenticity. `INT-02` remains
open.

## Ownership, branch, and Pattern B evidence

Customer A is denied Customer B's enquiry, quotation, payment, booking, and
Event Record through customer-scoped repository methods. Lead, quotation,
booking, and Event Record list projections return only the requested branch
when Hyderabad and a synthetic second branch coexist.

Direct employee record lookups remain incompletely branch-scoped. Examples
include lead `findById`/detail, quotation `findById`, payment `findById`, booking
`findById`, and Event Record `findById`; additional direct reads exist in
finance, inventory, manager operations, operations, vendors, and workers.
STAB-15 does not close the full BOLA matrix: `SEC-02` remains owned by STAB-20
with HTTP coverage under STAB-17.

Pattern B evidence is live, not a SQL-text proxy, for the exercised workflow:
domain rows, timeline/activity where implemented, audit, and outbox companions
commit together, while forced late failures leave none of the attempted
companions.

## Remaining gaps and ownership

| Gap                                                                                                                       | Severity / owner                                    |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Direct employee ID/branch authorization matrix is incomplete                                                              | High — `SEC-02`, STAB-20; HTTP proof in STAB-17     |
| Full OTP/session/audit atomicity and wider session/access-token controls remain                                           | High — `SEC-03`, STAB-20                            |
| Outbox has no processing lease/crash recovery proof                                                                       | High — `SEC-04`, STAB-20                            |
| Payment is internal/manual; no signed provider request/webhook/reconciliation                                             | High — `INT-02` and later provider work             |
| Migration SQL commit and ledger insert remain non-atomic/checksum-free                                                    | Medium — `SEC-M-09`, STAB-20/PROD-03                |
| Eight PostgreSQL adapter areas are not exercised here                                                                     | QA/module owners in later integration/module blocks |
| No Nest HTTP pipeline, Redis, browser/mobile E2E, coverage percentage, load, backup/restore, or production database proof | STAB-16/17, module blocks, and production tasks     |

## CI and cleanup boundary

STAB-16 now invokes the explicit root command in a dedicated bounded CI job
using the same isolated harness and no duplicate workflow service. On
27 August 2026 the STAB-16 session re-ran that command with the CI JUnit
reporters: 3/3 files and 21/21 tests passed on PostgreSQL 17.2. GitHub ran the
same job green on canonical `master` at `999443d` (CI 33034648786; artifact
`backend-postgresql-integration-report`).

Each recorded run removed its exact container, network, and volume. A final
Docker label inventory found no `mee-dbint-*` resource. The existing developer
Postgres and Redis containers retained their original IDs and healthy state.
No environment file, database dump, coverage output, test log, or generated
artifact is tracked.

## Final verdict

**INDEPENDENTLY ACCEPTED WITH FINDINGS** on 27 August 2026. The maintained suite proves its selected real adapter,
transaction, rollback, concurrency, ownership, branch-list, Pattern B, and
connected-workflow boundaries on PostgreSQL 17.2. Required cases pass on four
independent disposable databases, unit discovery remains database-free, and
cleanup is fail-checked. Broader authorization, multi-instance session,
outbox-recovery, provider, HTTP/E2E, and production concerns remain explicitly
open, except for the specifically verified two-instance refresh race above.
Phase 0 remains **NOT PASSED**. STAB-16 is **DONE WITH FINDINGS**; STAB-17 is
**NOT STARTED**.
