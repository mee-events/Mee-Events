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
                    │  Flutter widget │  ← thin (2 files)
                    └─────────────────┘
```

| Layer                           | Runner         | What exists                                                                   |
| ------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| Pure domain + guards + services | Vitest         | Majority of `apps/backend/test/*.spec.ts`                                     |
| Module foundation / workflow    | Vitest         | `*-foundation.spec.ts`, `quotation-payment-workflow.spec.ts`, Pattern B probe |
| Flutter widgets                 | `flutter test` | `apps/mobile/test/` (theme + design-system)                                   |
| Postgres/Redis integration      | —              | **None** in CI or Vitest                                                      |
| Browser / device E2E            | —              | **None** (no Playwright / Cypress / Detox)                                    |

Details: [unit-tests.md](./unit-tests.md), [integration-tests.md](./integration-tests.md),
[e2e-tests.md](./e2e-tests.md).

---

## Surfaces

| Surface                                    | Status                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Backend (`@me-event/backend`)              | Primary suite — `vitest run`, ~19 specs under `apps/backend/test/`            |
| Mobile (`apps/mobile`)                     | Thin widget coverage; checks run in the CI **flutter** job, not root `verify` |
| ERP (`@me-event/erp-web`)                  | `vitest run --passWithNoTests` — **zero** test files                          |
| Packages (`api-contracts`, `shared-types`) | No `test` scripts                                                             |

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
