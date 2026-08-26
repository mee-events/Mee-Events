# Backend Test Baseline — STAB-07

- **Verified:** 26 August 2026 00:13 IST (Asia/Kolkata, +0530)
- **Repository:** `/Users/vinaychilagani/Desktop/Mee Event V1`
- **Branch / starting commit:** `master` / `ff24b79a4d01132b7c0ffe8d362db5a0cd7dc27b`
- **Task:** STAB-07 — Backend tests
- **Result:** **PASS** — 30/30 files and 188/188 tests; zero failures, skips, todos, or warnings
- **Scope boundary:** backend unit, guard, service, fake-adapter, mocked-transaction, and static foundation tests only. This is not PostgreSQL integration, HTTP E2E, provider, load, or release proof.

## Runner and discovery contract

| Field                     | Verified value                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace                 | `@me-event/backend` in `apps/backend`                                                                                                             |
| Runner                    | Vitest `3.2.7` on Node `v20.20.2` (`darwin-arm64`)                                                                                                |
| Package script            | `test: vitest run --config test/vitest.unit.config.ts` (STAB-15 preserves this 30-file unit boundary)                                             |
| Canonical command         | `corepack pnpm --filter @me-event/backend test`                                                                                                   |
| Configuration source      | STAB-15 added `test/vitest.unit.config.ts`; Vitest defaults still apply except for explicit include/exclude                                       |
| Discovery include         | `test/**/*.spec.ts`                                                                                                                               |
| Discovery exclusions      | `test/integration/**` plus Vitest defaults                                                                                                        |
| Environment / pool        | Node environment; forks pool                                                                                                                      |
| Isolation / parallelism   | Per-file isolation enabled; file parallelism enabled in the canonical run                                                                         |
| Timeouts                  | Test 5,000 ms; hook 10,000 ms; teardown 10,000 ms                                                                                                 |
| Retry / bail              | Retry 0; bail 0                                                                                                                                   |
| Empty discovery           | `passWithNoTests` is not enabled. A non-matching filter exited 1 with `No test files found`                                                       |
| Focused tests             | No `.only`; CI would reject focused tests because Vitest disables `allowOnly` when `CI` is set                                                    |
| Skipped/conditional tests | No `.skip`, `.todo`, `skipIf`, or `runIf`                                                                                                         |
| Concurrent tests          | No `.concurrent`; default intra-file sequence is used                                                                                             |
| Setup / teardown          | No global setup. Mutable fakes are recreated in `beforeEach`; the process-local auth principal cache is explicitly cleared in the affected suites |
| Snapshots                 | None                                                                                                                                              |
| Coverage                  | Not configured or measured. No `@vitest/coverage-*` dependency, coverage script, thresholds, or CI report exists                                  |
| CI entry point            | Root `corepack pnpm test` recursively invokes only the backend unit script; the TypeScript CI job has no PostgreSQL/Redis service                 |

`test/helpers/pattern-b-side-effects.ts` is shared fake-test infrastructure and
`test/perf/scalability-estimate.ts` is an executable query-count model. Both are
linted and typechecked, but neither matches canonical Vitest discovery; they are
not included in the 30-file/188-test total.

## Execution evidence

| Run                           | Command                                                                                                                                            | Files |   Tests | Fail / skip / todo |   Duration | Exit |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----: | ------: | ------------------ | ---------: | ---: |
| Canonical                     | `corepack pnpm --filter @me-event/backend test`                                                                                                    | 30/30 | 188/188 | 0 / 0 / 0          |     2.83 s |    0 |
| Isolation / order challenge   | `corepack pnpm exec vitest run --sequence.shuffle --sequence.seed=6072026 --maxWorkers=1 --minWorkers=1 --no-file-parallelism` from `apps/backend` | 30/30 | 188/188 | 0 / 0 / 0          |     6.03 s |    0 |
| Empty-discovery honesty probe | `corepack pnpm exec vitest run __stab07_no_such_test_file__` from `apps/backend`                                                                   |     0 |       0 | Expected failure   | 0.5 s wall |    1 |

The second run was a fresh process and shuffled both files and tests with a
recorded seed while forcing serialized file execution. Matching results provide
evidence against order coupling and shared-state leakage. Random UUIDs and wall
clock values are used only where assertions check shape, relative windows, or
state transitions; no run depends on a fixed generated identifier or timestamp.

## Suite taxonomy and assertion review

Legend: **P** positive/happy-path assertion, **N** negative/failure assertion,
**A** authentication/authorization or ownership assertion, **B** branch or
tenant isolation assertion, **T** transaction/rollback assertion, **X** external
boundary assertion. A dash means the file does not claim that kind of proof.

| Test file                                      | Tests | Level / system under test                                                  | Assertions | Important limit                                                                                                             |
| ---------------------------------------------- | ----: | -------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `access-token.guard.spec.ts`                   |     5 | Guard unit with in-memory identity and real JWT signing                    | P, N, A    | No malformed-claim, bad-signature, revoked-session, or cross-branch case                                                    |
| `auth-service.spec.ts`                         |     8 | Auth service with in-memory identity, fake OTP, recording audit            | P, N, A, X | Local OTP only; no incorrect/expired/exhausted OTP or atomic consume/session race                                           |
| `capability.guard.spec.ts`                     |     7 | Capability guard policy unit                                               | P, N, A    | Role matrix is sampled, not endpoint-wide                                                                                   |
| `catalog-customer-visibility.spec.ts`          |    17 | Catalog/search PostgreSQL adapters through SQL-aware fake pool             | P, N, T    | SQL text and fake semantics; no PostgreSQL planner/constraint proof                                                         |
| `catalog-media-audit.spec.ts`                  |     3 | Static migration/metadata/bundled-image structural audit                   | P, N, X    | Structural JPEG/PNG checks are not full decodes or storage fetches                                                          |
| `catalog-media-repository.spec.ts`             |    16 | Catalog media adapter through transaction-aware fake pool                  | P, N, T, X | Strong lifecycle/rollback model, but no live unique-index/concurrency proof                                                 |
| `catalog-media.spec.ts`                        |     7 | Pure media URL, visibility, fallback, and lifecycle rules                  | P, N, X    | No network fetch, MIME verification, malware scan, or CDN policy                                                            |
| `catalog-review.controller.spec.ts`            |     7 | Controller metadata/capability unit with fake repository                   | P, N, A    | No Nest HTTP pipeline/E2E; one request body uses a typed fixture assertion                                                  |
| `catalog-taxonomy-v3-entertainment-b2.spec.ts` |     6 | Static SQL correction/provenance audit                                     | P, N       | Parses migration text; does not apply migrations                                                                            |
| `catalog-taxonomy-v3.spec.ts`                  |     8 | Static SQL taxonomy count/integrity audit                                  | P, N       | Text-derived counts; no live referential-integrity proof                                                                    |
| `crm-service.spec.ts`                          |     9 | CRM service with fake lead repository                                      | P, N       | Fake ignores branch; no controller/capability/DB proof                                                                      |
| `enquiry-service.spec.ts`                      |     8 | Enquiry service with fake catalog/enquiry repositories                     | P, N, A    | Own-user denial is covered; explicit cross-branch and transaction/outbox behavior are not                                   |
| `environment.spec.ts`                          |    17 | Zod boot/environment validation                                            | P, N, X    | Synthetic placeholders only; no real environment values are read                                                            |
| `event-record-foundation.spec.ts`              |     5 | Event-record service with fake repository                                  | P          | Happy-path/idempotency focus; customer visibility/ownership negatives and adapter transaction behavior are not covered here |
| `finance-settlement-foundation.spec.ts`        |     2 | Finance workflow with fake repository and Pattern B capture                | P          | Very broad happy path in two tests; no negative money, authorization, branch, concurrency, or real ledger transaction cases |
| `inventory-warehouse-foundation.spec.ts`       |     2 | Inventory workflow with fake repository and Pattern B capture              | P          | Happy paths only; availability/concurrency/branch and adapter rollback are unproved                                         |
| `manager-operations-foundation.spec.ts`        |     3 | Manager assignment/task/progress service with fake repository              | P          | No outsider/cross-branch denial or repository transaction proof                                                             |
| `operations-execution-foundation.spec.ts`      |     3 | Execution workflow with fake repository and Pattern B capture              | P, N       | Completion gate negative exists; assignee ownership, branch, concurrency, and adapters remain unproved                      |
| `pagination.spec.ts`                           |     5 | Pure pagination/envelope helpers                                           | P, N       | Invalid inputs fall back to defaults; controller query behavior is not exercised                                            |
| `pattern-b-consistency-probe.spec.ts`          |     1 | Static migration-table presence probe                                      | P          | Presence only; no atomic quartet write or outbox delivery proof                                                             |
| `phone-number.spec.ts`                         |     2 | Pure mobile-number normalization                                           | P, N       | One valid and one invalid sample; no broader locale/type matrix                                                             |
| `platform-foundation.spec.ts`                  |     8 | Bootstrap role/capability/module policy                                    | P, N, A    | Default Hyderabad bootstrap policy, not row-level branch enforcement                                                        |
| `postgres-identity-switch-role.spec.ts`        |     3 | Identity adapter with mocked `PoolClient`                                  | P, N, A, T | Verifies client/SQL sequencing and rollback calls, not live PostgreSQL atomicity                                            |
| `quotation-payment-workflow.spec.ts`           |     2 | Quotation/payment/booking/event workflow with fakes                        | P          | Manual confirmation happy path; no ownership negative, expiry, amount binding, replay, signature, or provider proof         |
| `search-ranking.spec.ts`                       |     7 | Pure ranking plus search adapter SQL-aware fake pool                       | P, N, X    | No live PostgreSQL trigram/ranking or pagination behavior                                                                   |
| `search-stages.spec.ts`                        |     2 | Search stage adapter with fake pool                                        | P, N       | Mapping/SQL-shape only; no live join/data proof                                                                             |
| `switch-role.spec.ts`                          |    18 | Auth service, access guard, controller metadata, and in-memory persistence | P, N, A, T | Strong role/session regression set; live DB race is covered only by the separate mocked test                                |
| `user.spec.ts`                                 |     2 | Pure active-role domain rule                                               | P, N, A    | Small unit boundary only                                                                                                    |
| `vendor-management-foundation.spec.ts`         |     3 | Vendor workflow with fake repository and Pattern B capture                 | P, A       | Own-member happy path; outsider, branch, status-transition, and transaction negatives are absent                            |
| `worker-management-foundation.spec.ts`         |     2 | Worker workflow with fake repository and Pattern B capture                 | P, A       | Own-worker happy path; outsider, branch, attendance replay, and transaction negatives are absent                            |

Category totals reconcile to 188 tests:

| Category                                                  |  Files |   Tests |
| --------------------------------------------------------- | -----: | ------: |
| Identity, authorization, environment, and platform policy |      9 |      70 |
| Catalog, taxonomy, media, and search                      |      9 |      73 |
| Business workflow/service foundations                     |     10 |      39 |
| Common helper and migration-consistency probes            |      2 |       6 |
| **Total**                                                 | **30** | **188** |

Every registered test has an assertion directly or through the local
`expectDenied` helper. There are no empty placeholder tests. Negative behavior
is meaningful for auth, capabilities, environment validation, ownership,
catalog visibility/media safety, rollback modeling, completion gates, and common
validation. Assertion density does not imply runtime integration coverage.

## Security-sensitive coverage

### Proven at the current unit/foundation boundary

- Bearer presence, signed-token/session/active-role binding, token expiry via
  session expiry, public-route bypass, and short-TTL principal-cache reuse.
- OTP resend cooldown and per-mobile request limit; first-login session/audit;
  refresh rotation, reuse revocation, unknown token denial, and logout.
- Mobile role allow-list, active assignment, optimistic version conflict,
  cache invalidation, old-role token rejection, atomic role/audit SQL sequencing,
  rollback calls, and token/phone omission from role-switch audit payloads.
- Capability fail-closed behavior and catalog-review read/update separation for
  anonymous, employee, auditor, and administrator principals.
- Production environment fail-closed rules for secrets, local OTP, external SMS
  configuration, HTTPS, CORS, loopback, and error-message secret redaction.
- Customer-owned enquiry lookup denial and catalog/service/product/media
  visibility filters, safe URL rules, approval provenance, audit revisions, and
  modeled transaction rollback.
- Pattern B timeline/activity/audit/outbox expectations for foundation workflow
  fakes and presence of required migration tables.
- Completion-gate denial for operations and optimistic/idempotent behaviors in
  role switch, enquiry-to-lead creation, catalog media, and event creation.

### Documented gaps and owners

| Severity | Gap                                                                                                                                                                                                                                           | Follow-up owner / task                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| High     | Known employee resource/branch IDOR/BOLA risk is not covered by a systematic cross-branch negative matrix. Many foundation fakes accept a branch argument but do not enforce it.                                                              | Backend Security; SEC-02 inside STAB-20. Add live adapter and HTTP denial cases in STAB-15/STAB-17.                   |
| High     | OTP verification consumption, user/session creation, audit, and concurrent retry behavior are not proven atomic. Incorrect, expired, exhausted, replayed, and concurrent verification paths are incomplete in this suite.                     | Backend Identity/Security; SEC-03 inside STAB-20, with live transaction tests in STAB-15.                             |
| High     | Payment confirmation is an internal/manual foundation path. The suite does not prove provider signatures, amount/order/customer binding, idempotent webhook replay, refunds, or reconciliation.                                               | Backend Payments/Security; INT-02 and finance work after the stabilization gate, with STAB-15/17 regression coverage. |
| Medium   | PostgreSQL behavior is mocked or emulated. Constraints, row mappings, isolation, rollback, outbox atomicity, and concurrent updates are not executed against a real database.                                                                 | Backend/Data/QA; STAB-14 then STAB-15.                                                                                |
| Medium   | The broad finance, inventory, manager, operations, vendor, and worker foundation specs duplicate behavior in fake repositories and emphasize happy paths. They can miss adapter defects, illegal state transitions, and authorization wiring. | Module owners/QA; STAB-15 integration and STAB-17 E2E foundation, then module execution blocks.                       |
| Medium   | Access-token negatives do not directly cover malformed claims, invalid signatures, revoked sessions, missing users, or inactive assignments; capability coverage samples roles/endpoints rather than generating a complete endpoint matrix.   | Backend Security; STAB-20 authorization regression suite.                                                             |
| Medium   | External OTP, storage/CDN, PDF, notification delivery, and payment boundaries have no live/provider contract tests. Catalog media tests validate URL policy and local file structure only.                                                    | Integration owners; INT-01 through INT-06 after provider decisions.                                                   |
| Medium   | No line/branch/function coverage tool or threshold is configured, so unexecuted source cannot be quantified from this baseline.                                                                                                               | QA/CI; evaluate coverage reporting in STAB-16 without substituting a percentage for risk-based tests.                 |
| Low      | Tests use current time and random UUIDs, although assertions avoid exact values. A future deterministic clock/ID fixture would improve failure replay.                                                                                        | QA; adopt when adding STAB-15/17 harnesses.                                                                           |

TypeScript types and Zod-derived request types strengthen compile-time and
controller-boundary input handling, but the passing suite is not a claim that
database rows, provider responses, or all internal calls receive runtime
validation.

## Isolation, false-positive, and secret review

- The canonical and shuffled serialized runs produced identical counts and no
  unhandled-error, teardown, open-handle, or console warnings.
- No test reaches the network, starts a server, reads a real environment file,
  creates a PostgreSQL/Redis client, or invokes an operational script.
- Environment tests contain synthetic credentials/URLs only. No real secret,
  OTP, token, signing material, or credential-bearing production URL was
  printed or added.
- SQL-text and migration-text assertions are useful drift alarms but can pass
  while a migration fails to execute; fake repositories can also reproduce the
  same bug as production logic. These limitations are represented in the table
  and not described as integration coverage.
- No generated output, coverage output, snapshots, build artifacts, or Vitest
  attachments were created or tracked.

## STAB-07 conclusion

The maintained canonical backend suite is green, repeatable under shuffled
serialized execution, and fails honestly on zero discovery. It provides a
meaningful unit/foundation regression baseline with explicit auth,
authorization, environment, catalog, workflow, rollback-model, and Pattern B
checks. Its significant branch, transaction, external-provider, and E2E gaps
are assigned to later existing roadmap blocks. No application, test, runner, or
configuration correction was required in STAB-07.

Phase 0 remains **NOT PASSED**. The next permitted task is **STAB-08 — ERP
tests**; STAB-08 was not started here.

## STAB-15 addendum — maintained PostgreSQL suite

STAB-15 originally preserved the 30-file/188-test unit count and made its
database-free discovery boundary explicit. The refresh correction adds two
maintained identity cases, so the current unit suite is 30 files / 190 tests. A
separate `test:integration` command now runs 21 cases across 3 files against a
disposable migrated PostgreSQL 17.2 database.
That suite proves selected real adapter/service mapping, constraints,
transactions, rollback, concurrency, customer ownership, branch-list, outbox,
and Pattern B behavior. See
[database-integration-baseline.md](./database-integration-baseline.md) for exact
scope and residual gaps; this historical STAB-07 baseline remains the canonical
per-file inventory for the ordinary unit/foundation suite.
