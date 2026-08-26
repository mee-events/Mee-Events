# Testing Strategy

How the Mee Events monorepo proves correctness **today**. Prefer this document
over product aspirations when deciding what to write or run.

Related: [Backend Handbook](../02-architecture/backend.md),
[CI](../07-deployment/ci-cd.md), [verification.md](./verification.md).

Canonical evidence:

- [Backend test baseline](./backend-test-baseline.md)
- [ERP test baseline](./erp-test-baseline.md)
- [Flutter analysis baseline](./flutter-analysis-baseline.md)

---

## Pyramid (as shipped)

```text
                    ┌─────────────────┐
                    │  UI E2E         │  ← not implemented
                    ├─────────────────┤
                    │  DB integration │  ← not implemented
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

| Layer                           | Runner         | What exists                                                              |
| ------------------------------- | -------------- | ------------------------------------------------------------------------ |
| Pure domain + guards + services | Vitest         | Backend suite: 188 tests across 30 files at the STAB-07 baseline         |
| Module foundation / workflow    | Vitest         | `*-foundation.spec.ts`, quotation/payment workflow and Pattern B probes  |
| Employee CRM/ERP narrow units   | Vitest         | 8 tests across environment, API refresh, and catalog form-reset behavior |
| Flutter unit and widget tests   | `flutter test` | 435 tests across models, providers, stores, navigation and customer UI   |
| Postgres/Redis integration      | —              | **None** in CI or Vitest                                                 |
| Browser / device E2E            | —              | **None** (no Playwright / Cypress / Detox)                               |

Details: [unit-tests.md](./unit-tests.md), [integration-tests.md](./integration-tests.md),
[e2e-tests.md](./e2e-tests.md).

---

## Surfaces

| Surface                                    | Status                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Backend (`@me-event/backend`)              | Primary suite — 188 tests across 30 files at the STAB-07 baseline        |
| Mobile (`apps/mobile`)                     | 435 tests; CI also runs formatting, analysis and a development APK build |
| ERP (`@me-event/erp-web`)                  | 8 tests across 3 files; no rendered component or browser route coverage  |
| Packages (`api-contracts`, `shared-types`) | No `test` scripts                                                        |

Flutter's STAB-09 static gate covers all 200 maintained Dart files (172
`lib`, 28 `test`) with `flutter_lints` 6.0.0 and
`flutter analyze --fatal-infos`. It reports zero errors, warnings, and infos.
That result does not substitute for the 435-test Flutter suite, native builds,
device/E2E behavior, runtime input validation, or release-security review.

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

## Non-goals (not in-repo)

- No APM or test-reporting SaaS wiring
- No k6 / Artillery load suites (`test/perf/scalability-estimate.ts` is an
  algorithmic cost model, not live RPS)
- No browser or device E2E frameworks
- No Postgres service container in the TypeScript CI job

---

## Related

- [unit-tests.md](./unit-tests.md)
- [integration-tests.md](./integration-tests.md)
- [e2e-tests.md](./e2e-tests.md)
- [verification.md](./verification.md)
