# End-to-End Tests

**Status: STAB-17 foundation present (27 August 2026). Not product coverage.**

One browser runner is used: **Playwright** `@playwright/test` `1.62.1` under
`apps/erp-web`. Cypress and Detox were not installed. Playwright matches the
project audit preference, runs headless Chromium against the Next ERP, and does
not require a second framework for the API or mobile-side smokes.

This is a maintained _harness_: one authenticated smoke per surface, isolated
synthetic accounts, loopback-only URLs, and session cleanup. It does **not**
implement Customer/Vendor/Worker/CRM/ERP product modules, enquiry→booking, live
CRM on `/leads`, payments, or an external OTP provider.

Canonical evidence: [e2e-foundation-baseline.md](./e2e-foundation-baseline.md).

---

## Commands

Prerequisites for live smokes (not for fail-closed guards): local Postgres,
`corepack pnpm db:migrate`, `corepack pnpm db:seed:dev`, Nest API on loopback
`:3002` with `APP_ENV=development` and `OTP_PROVIDER=local`. Do not point these
commands at staging or production. Do not run the shell smokes with `bash -x`
(that would print captured tokens).

First-time browser install (local only; CI skips Playwright browser download):

```sh
corepack pnpm --filter @me-event/erp-web test:e2e:install
```

```sh
# Fail-closed URL probes (no API/ERP/device required)
corepack pnpm test:e2e:guard

# Authenticated Nest API smoke (unique synthetic customer)
corepack pnpm test:e2e:api

# Mobile-side API contract smoke (Dart; no emulator/device)
corepack pnpm test:e2e:mobile

# ERP Playwright smoke (employee login → /quotes)
corepack pnpm test:e2e:erp
```

The maintained scripts always set `E2E_API_BASE_URL=http://127.0.0.1:3002/api/v1`
(and `E2E_ERP_BASE_URL=http://127.0.0.1:3001` for the browser smoke). Overriding
those to a missing or non-loopback URL fails closed and does not skip.

Manual product demos remain separate and are **not** the STAB-17 definition of
done: `scripts/demo-enquiry-claim-smoke.sh` and
`scripts/demo-enquiry-to-booking-smoke.sh`.

---

## Surfaces

| Surface     | Harness                                                                              | What it proves                                                                                                                            | What it does not prove                                                                             |
| ----------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ERP browser | Playwright Chromium, `apps/erp-web/e2e/employee-login.smoke.ts`                      | Seeded employee OTP login on loopback, then an authorized `/quotes` load that calls `GET /crm/quotations`                                 | Live CRM. `/leads` is still fixture-backed; the smoke does not treat that board as production data |
| Nest API    | `scripts/e2e/api-smoke.sh`                                                           | `health/live` + `health/ready`, unique synthetic customer OTP, `GET /platform/bootstrap`, `GET /enquiries`, `POST /auth/logout`, then 401 | Enquiry create/claim, quotations, payments, booking                                                |
| Mobile      | `apps/mobile/tool/e2e_api_contract_smoke.dart` via `scripts/e2e/mobile-api-smoke.sh` | Same authenticated API contract from the Flutter package using `package:http`, loopback dart-define-equivalent env                        | Widget UI, `integration_test`, Android emulator, iOS simulator, or a physical device               |

---

## Accounts, OTP, cleanup

| Account            | Source                                                                                   | Cleanup                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Synthetic customer | Unique `+9197xxxxxxxx` per API/mobile run                                                | `POST /auth/logout` revokes the device session. The `app_users` row is **not** deleted (no safe public delete-user API) |
| Seed employee      | `+919000000001` from `infrastructure/postgres/seeds/dev-employee.sql`, shown on `/login` | Browser smoke logs out via `POST /auth/logout` and clears `sessionStorage`                                              |

OTP uses the existing local `debugCode` path (`APP_ENV=development` and
`OTP_PROVIDER=local`). Smokes fail if `debugCode` is absent. They do not log
access tokens, refresh tokens, or OTP codes. Playwright screenshot, video, and
trace are off so local OTP digits are not archived.

Do not copy founder `.env` / `.env.local` values into CI. Do not use production
mobiles or unlabeled PII-shaped fixtures as E2E accounts.

---

## CI status

The harness is **CI-compatible** (non-interactive, loopback, synthetic). Live
browser/API/mobile stack jobs are **not** on every push: they need the developer
Compose database, seed, Nest, and ERP, and a Playwright Chromium install. STAB-16
jobs stay lean.

What CI **does** run after STAB-17:

- `TypeScript quality` — `corepack pnpm test:e2e:guard` (17 fail-closed probes)
- `Flutter development verification` — Dart format includes `tool/`; missing and
  non-loopback `E2E_API_BASE_URL` probes on the Dart smoke; `flutter analyze`
  includes the new tool file
- Workflow `env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` on `CI` and `Security` so
  `pnpm install` does not download Chromium

What CI **does not** run: Playwright against a live ERP, the API smoke against a
live Nest process, an Android emulator, or iOS. That gap is recorded as a
finding, not as device proof.

---

## Gaps

- No Flutter `integration_test/` tree and no emulator/device E2E. A future
  device smoke would be a non-interactive
  `flutter test integration_test/<file>.dart` with loopback dart-defines; that
  file does not exist in this block.
- No GitHub job starts Postgres + Nest + ERP + Playwright.
- `/leads` remains fixture-backed (CRM-06 / later CRM work).
- Residual synthetic customer rows after OTP signup.
- Next.js `next dev` may rewrite `apps/erp-web/next-env.d.ts`; do not commit
  that noise.
- iOS/Xcode E2E is out of scope.

---

## Related

- [e2e-foundation-baseline.md](./e2e-foundation-baseline.md)
- [testing-strategy.md](./testing-strategy.md)
- [erp-test-baseline.md](./erp-test-baseline.md)
- [ci-cd.md](../07-deployment/ci-cd.md)
- [local-demo-checklist.md](../07-deployment/local-demo-checklist.md)
