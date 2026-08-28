# Unit Tests

Backend unit and service-level specs run under **Vitest**. They use pure
functions, guards, and application services with in-memory or inline
`Fake*Repository` ports — not Nest HTTP bootstrap and not live Postgres.

Current command: `corepack pnpm --filter @me-event/backend test`. Live counts
after SEC-04 are in `MEE_EVENTS_PROGRESS.md`. The STAB-07 freeze was 188/188 and the
STAB-15 unit correction was 190/190; see
[backend-test-baseline.md](./backend-test-baseline.md).

---

## How to run

```sh
# Backend only
corepack pnpm --filter @me-event/backend test

# All workspace packages that define `test` (backend + erp-web empty pass)
corepack pnpm test
```

Backend script: `vitest run --config test/vitest.unit.config.ts` in
[`apps/backend/package.json`](../../apps/backend/package.json). Specs live in
[`apps/backend/test/`](../../apps/backend/test/). Integration specs under
`test/integration/` are excluded from this command.

Flutter unit/widget tests are separate (`flutter test` in `apps/mobile`) — see
[testing-strategy.md](./testing-strategy.md) and [verification.md](./verification.md).

---

## Current unit-ish catalog

| Spec                          | Focus                                              |
| ----------------------------- | -------------------------------------------------- |
| `phone-number.spec.ts`        | Domain phone helpers                               |
| `user.spec.ts`                | Identity user domain                               |
| `environment.spec.ts`         | Zod env validation (incl. production vs local OTP) |
| `pagination.spec.ts`          | Shared pagination helpers                          |
| `access-token.guard.spec.ts`  | Access-token guard with in-memory identity         |
| `capability.guard.spec.ts`    | Capability authorization guard                     |
| `auth-service.spec.ts`        | Auth application service + in-memory repo          |
| `enquiry-service.spec.ts`     | Enquiry service + fakes                            |
| `crm-service.spec.ts`         | CRM / leads service + fakes                        |
| `platform-foundation.spec.ts` | Platform foundation / bootstrap behavior           |

Foundation and workflow specs are covered in
[integration-tests.md](./integration-tests.md) (same Vitest runner, thicker
module scope).

---

## Conventions

| Convention    | Practice                                                 |
| ------------- | -------------------------------------------------------- |
| API           | Vitest `describe` / `it` / `expect` / `beforeEach`       |
| Ports         | Inline `Fake*Repository` or `InMemoryIdentityRepository` |
| HTTP          | Not required — call services/guards directly             |
| Secrets / OTP | Use test doubles; never assert real SMS delivery         |
| Isolation     | No Docker, no `DATABASE_URL` connection in these specs   |

`environment.spec.ts` may pass a `DATABASE_URL` **string** into
`validateEnvironment` without opening a pool.

---

## What to add

When introducing:

- Pure domain helpers → a focused `*.spec.ts` next to the existing domain suite
- New guards or authz rules → guard specs with denial and happy paths
- Thin application services → service specs with Fake ports before (or with)
  foundation coverage

Prefer Fake ports over hitting Postgres so `pnpm test` stays fast and CI needs
no database service.

---

## Related

- [testing-strategy.md](./testing-strategy.md)
- [integration-tests.md](./integration-tests.md)
- [verification.md](./verification.md)
