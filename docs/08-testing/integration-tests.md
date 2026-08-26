# Integration Tests

**Honest status:** STAB-15 adds a maintained PostgreSQL 17.2 repository/service
integration suite. It is explicitly invoked and remains outside the ordinary
database-independent unit command and current CI. There is still no Redis,
Nest HTTP, browser, device, or provider integration suite.

STAB-14 separately performed isolated PostgreSQL 17.2 replay of all 20
migrations across empty, tracked-upgrade, and legacy paths, plus selected
constraint/trigger/rollback probes. STAB-15 now replays the same maintained
migration catalog per fresh test database and exercises selected production
adapters, services, concurrency, rollback, ownership, and Pattern B behavior.
See
[migration-verification-baseline.md](../03-database/migration-verification-baseline.md).
Exact STAB-15 scope and results are in
[database-integration-baseline.md](./database-integration-baseline.md).

The in-process **module foundation** layer still exists separately: its Vitest
specs exercise application services with fake repositories and assert Pattern B
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
**not** used by integration tests. The dedicated runner creates an exact
`mee-dbint-*` Compose project, loopback port, database, volume, and network, and
removes only those labeled resources on exit.

Do not assume `pnpm test` requires or mutates a running database.

---

## Maintained PostgreSQL suite

Run from the repository root:

```sh
corepack pnpm test:integration:backend
```

or directly:

```sh
corepack pnpm --filter @me-event/backend test:integration
```

The three integration files contain 21 cases covering DBINT-01–14. The runner
uses actual `pg.Pool` connections and production adapters/services for identity,
audit, enquiries, CRM, quotations, payments, bookings, and Event Records.
Ordinary unit discovery is 30 files / 190 tests and explicitly excludes
the integration tree.

The suite does not prove HTTP routing/guards, complete employee branch/BOLA
enforcement, broader multi-instance session/revocation behavior beyond the
corrected two-instance refresh race, outbox crash leases, real payment providers,
Redis, backup/restore, remote environments, or production readiness. Current CI
does not run it; STAB-16 owns CI wiring and remains not started.

---

## Related

- [unit-tests.md](./unit-tests.md)
- [database-integration-baseline.md](./database-integration-baseline.md)
- [testing-strategy.md](./testing-strategy.md)
- [e2e-tests.md](./e2e-tests.md)
- [migrations.md](../03-database/migrations.md)
