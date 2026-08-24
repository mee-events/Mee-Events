# Testing Strategy

How the Mee Events monorepo proves correctness **today**. Prefer this document
over product aspirations when deciding what to write or run.

Related: [Backend Handbook](../02-architecture/backend.md),
[CI](../07-deployment/ci-cd.md), [verification.md](./verification.md).

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

| Layer                           | Runner         | What exists                                                               |
| ------------------------------- | -------------- | ------------------------------------------------------------------------- |
| Pure domain + guards + services | Vitest         | Backend suite: 173 tests across 30 files at the current verified baseline |
| Module foundation / workflow    | Vitest         | `*-foundation.spec.ts`, quotation/payment workflow and Pattern B probes   |
| Employee CRM/ERP components     | Vitest         | 2 tests across API-client and catalog-review behavior                     |
| Flutter unit and widget tests   | `flutter test` | 435 tests across models, providers, stores, navigation and customer UI    |
| Postgres/Redis integration      | —              | **None** in CI or Vitest                                                  |
| Browser / device E2E            | —              | **None** (no Playwright / Cypress / Detox)                                |

Details: [unit-tests.md](./unit-tests.md), [integration-tests.md](./integration-tests.md),
[e2e-tests.md](./e2e-tests.md).

---

## Surfaces

| Surface                                    | Status                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| Backend (`@me-event/backend`)              | Primary suite — 173 tests across 30 files at the current verified baseline |
| Mobile (`apps/mobile`)                     | 435 tests; CI also runs formatting, analysis and a development APK build   |
| ERP (`@me-event/erp-web`)                  | 2 Vitest tests; broad route/workflow coverage remains incomplete           |
| Packages (`api-contracts`, `shared-types`) | No `test` scripts                                                          |

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
