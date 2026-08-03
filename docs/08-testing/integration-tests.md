# Integration Tests

**Honest status:** there is **no** PostgreSQL- or Redis-backed integration test
job in this repository. The TypeScript CI job does not start Compose or a
database service ([ci-cd.md](../07-deployment/ci-cd.md)).

What exists instead is an in-process **module foundation** layer: Vitest specs
that exercise application services with Fake repositories and assert Pattern B
side effects in memory.

---

## Module foundation layer (current substitute)

Runner: same as unit — `vitest run` under `apps/backend/test/`.

### Foundation specs

| Spec                                      | Module area            |
| ----------------------------------------- | ---------------------- |
| `event-record-foundation.spec.ts`         | Event Record aggregate |
| `vendor-management-foundation.spec.ts`    | Vendors                |
| `worker-management-foundation.spec.ts`    | Workers                |
| `inventory-warehouse-foundation.spec.ts`  | Inventory / warehouse  |
| `finance-settlement-foundation.spec.ts`   | Finance / settlement   |
| `operations-execution-foundation.spec.ts` | Field operations       |
| `manager-operations-foundation.spec.ts`   | Manager operations     |

### Workflow

| Spec                                 | Focus                                        |
| ------------------------------------ | -------------------------------------------- |
| `quotation-payment-workflow.spec.ts` | Quotation → payment path behavior with fakes |

### Consistency probe

| Spec                                  | Focus                                                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pattern-b-consistency-probe.spec.ts` | Reads `infrastructure/postgres/migrations/*.sql` from disk and checks Pattern B consistency expectations — **filesystem**, not a live DB |

---

## Pattern B helper

[`apps/backend/test/helpers/pattern-b-side-effects.ts`](../../apps/backend/test/helpers/pattern-b-side-effects.ts)
provides `PatternBSideEffects` — in-memory capture of timelines, activities,
audits, and outbox rows. Foundation specs use it to assert companion writes
without Postgres.

Canonical rules: [pattern-b.md](../02-architecture/pattern-b.md).

---

## Local Compose vs tests

`corepack pnpm db:up` starts Postgres + Redis for **manual** development
([local-development.md](../07-deployment/local-development.md)). That stack is
**not** wired into Vitest or the CI typescript job.

Do not assume `pnpm test` requires or mutates a running database.

---

## Gap

A future DB-backed integration suite (migrate → seed → hit repositories or HTTP
against real Postgres) would be a **new** engineering decision. It is not
present today. Until then, treat foundation + workflow + the SQL probe as the
closest “integration” coverage.

---

## Related

- [unit-tests.md](./unit-tests.md)
- [testing-strategy.md](./testing-strategy.md)
- [e2e-tests.md](./e2e-tests.md)
- [migrations.md](../03-database/migrations.md)
