# Testing Strategy

How the Mee Events monorepo proves correctness **today**. Prefer this document
over product aspirations when deciding what to write or run.

Related: [Backend Handbook](../02-architecture/backend.md),
[CI](../07-deployment/ci-cd.md), [verification.md](./verification.md).

Canonical evidence:

- [Backend test baseline](./backend-test-baseline.md)
- [Database integration baseline](./database-integration-baseline.md)
- [ERP test baseline](./erp-test-baseline.md)
- [Flutter analysis baseline](./flutter-analysis-baseline.md)
- [Flutter test baseline](./flutter-test-baseline.md)
- [E2E foundation baseline](./e2e-foundation-baseline.md)

---

## Pyramid (as shipped)

```text
                    ┌─────────────────┐
                    │  UI / API E2E   │  ← STAB-17 foundation (local live;
                    │                 │     CI fail-closed URL probes only)
                    ├─────────────────┤
                    │  DB integration │  ← selected Postgres adapters/workflows
                    ├─────────────────┤
                    │  Foundation /   │  ← Vitest + Fake repos
                    │  workflow       │
                    ├─────────────────┤
                    │  Unit / guards  │  ← Vitest (primary mass)
                    │  / services     │
                    ├─────────────────┤
                    │  Flutter unit / │  ← provider, model and widget coverage
                    │  widget         │
                    └─────────────────┘
```

| Layer                           | Runner                  | What exists                                                                          |
| ------------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| Pure domain + guards + services | Vitest                  | Backend suite: 208 tests across 31 files after SEC-03 (STAB-15 freeze was 190/30)    |
| Module foundation / workflow    | Vitest                  | `*-foundation.spec.ts`, quotation/payment workflow and Pattern B probes              |
| Employee CRM/ERP narrow units   | Vitest                  | 8 tests across environment, API refresh, and catalog form-reset behavior             |
| Flutter unit and widget tests   | `flutter test`          | 444 tests across models, providers, stores, navigation, customer UI, installation ID |
| PostgreSQL integration          | Vitest + Compose        | 26 tests / 3 files after SEC-03; STAB-15 freeze was 21/3                             |
| Redis integration               | —                       | **None**                                                                             |
| Browser / API E2E               | Playwright + shell/Dart | One ERP login smoke, one Nest authenticated smoke; CI runs URL guards only           |
| Mobile device E2E               | —                       | **None** (headless API contract only; no emulator/integration_test)                  |

Details: [unit-tests.md](./unit-tests.md), [integration-tests.md](./integration-tests.md),
[e2e-tests.md](./e2e-tests.md).

STAB-14 adds PostgreSQL 17.2 migration-path evidence. STAB-15 adds a separate
maintained, fail-closed harness that applies all 20 migrations to each fresh
database and passes 21 selected repository/service integration cases across
identity, enquiry/CRM, quotation/payment/booking/Event Record, rollback,
concurrency, ownership, branch lists, and Pattern B. It does not prove HTTP,
Redis, providers, complete branch/BOLA, backup/restore, or production behavior.
Evidence: [database-integration-baseline.md](./database-integration-baseline.md).

## CUST-04 bootstrap acceptance matrix

CUST-04 deliberately spans layers because no single test proves the complete
security boundary:

| Layer                  | Required proof                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract/unit          | strict structural and minimum-client versions; required baseline accepted; safe additive policy accepted; missing, malformed, privileged, or contradictory policy rejected |
| Scope unit             | branch/global/vendor pairings, multiple grants, duplicate/inactive/wrong-branch denial, and vendor IDs never resolving as branches                                         |
| PostgreSQL integration | `scope_type` round-trip, unique duplicate rejection, inactive rows, wrong-branch policy denial, and active/inactive cross-vendor membership                                |
| HTTP/OpenAPI           | Bearer protection, exact serialized schema, request/session identity, request-ID handling, and `Cache-Control: no-store`                                                   |
| Flutter concurrency    | refresh/bootstrap overlap, both refresh/switch completion orders, logout/account/session replacement, conflicting role changes, and persistence reconciliation             |
| Regression             | full backend, Flutter, lint, typecheck, build, formatting, and diff checks                                                                                                 |

The matrix does not claim physical-device, staging, production, provider, or
multi-branch proof. Detailed evidence:
[cust-04-customer-bootstrap-evidence.md](./cust-04-customer-bootstrap-evidence.md).

---

## Surfaces

| Surface                                    | Status                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Backend (`@me-event/backend`)              | 208 unit/foundation tests across 31 files plus 26 PostgreSQL integration tests across 3 files                         |
| Mobile (`apps/mobile`)                     | 444 tests; CI also runs formatting, analysis and a development APK build                                              |
| ERP (`@me-event/erp-web`)                  | 8 Vitest tests across 3 files; Playwright login smoke is separate (STAB-17); no rendered-component coverage in Vitest |
| Packages (`api-contracts`, `shared-types`) | No `test` scripts                                                                                                     |

Flutter's STAB-09 static gate covers all 200 maintained Dart files (172
`lib`, 28 `test`) with `flutter_lints` 6.0.0 and
`flutter analyze --fatal-infos`. It reports zero errors, warnings, and infos.
That result does not substitute for the 441-test Flutter suite, native builds,
device/E2E behavior, runtime input validation, or release-security review.

STAB-10 independently verifies 27 discovered Flutter test files and one
support helper. The canonical and seed-`6102026` serialized runs both pass
441/441 cases: 111 behavioral unit/provider/store cases, 329 widget cases, and
one static asset-consistency case. There are no skipped/focused tests or test
configuration overrides, and a missing-path probe exits nonzero. The suite is
Customer-heavy; Vendor and Worker evidence is limited to routing/dashboard
smokes. It uses fake API/provider/storage boundaries and does not prove native
secure storage, real network/provider behavior, integration/device E2E,
offline behavior, or release security. Exact per-file counts and owned gaps are
in [flutter-test-baseline.md](./flutter-test-baseline.md).

---

## Pattern B in tests

Foundation specs assert companion writes (timeline, activity, audit, outbox)
using the in-memory helper
[`apps/backend/test/helpers/pattern-b-side-effects.ts`](../../apps/backend/test/helpers/pattern-b-side-effects.ts).

Spec / SQL alignment probe:
`pattern-b-consistency-probe.spec.ts` (reads migration files from disk — not a
live database). Behavioral rules:
[pattern-b.md](../02-architecture/pattern-b.md).

---

## New-module expectation

When adding a Nest module, add foundation or module specs under
`apps/backend/test/` (authz denial, happy path, Pattern B / rollback expectations
where relevant). See the checklist in
[backend.md](../02-architecture/backend.md).

---

## Non-goals and absent layers

- No APM or test-reporting SaaS wiring
- No k6 / Artillery load suites (`test/perf/scalability-estimate.ts` is an
  algorithmic cost model, not live RPS)
- No emulator/device UI E2E and no second browser framework
- CI invokes the existing isolated PostgreSQL harness in its own bounded job;
  it does not define a duplicate workflow service. GitHub ran that job green
  on `999443d` (STAB-16). STAB-17 adds fail-closed E2E URL probes to that CI
  file without starting a live Nest/ERP/Playwright stack on every push.

---

## Related

- [unit-tests.md](./unit-tests.md)
- [integration-tests.md](./integration-tests.md)
- [e2e-tests.md](./e2e-tests.md)
- [e2e-foundation-baseline.md](./e2e-foundation-baseline.md)
- [verification.md](./verification.md)
