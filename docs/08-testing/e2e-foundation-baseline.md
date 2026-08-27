# E2E Foundation Baseline — STAB-17

- **Task:** STAB-17 — E2E test foundation
- **Date:** 27 August 2026 (Asia/Kolkata)
- **Repository:** `/Users/vinaychilagani/Desktop/Mee Event V1`
- **Branch:** `master`
- **Parent commit:** `1450263caa6a5be2263bf7b9c91827f7cc24ef6c`
- **Result:** **DONE WITH FINDINGS**
- **Phase 0:** **NOT PASSED**
- **Next:** STAB-18 — Documentation reconciliation, **NOT STARTED**

This is the evidence record for the E2E _foundation_. It is not product-journey
coverage and not a claim that GitHub ran Playwright against a live stack.

## Why Playwright

One runner only. Playwright is the documented audit preference, installs as an
exact-pinned ERP devDependency (`@playwright/test` `1.62.1`), and drives a
single Chromium project. Cypress and Detox were not added. API and mobile-side
smokes reuse curl/Dart HTTP against the same Nest API rather than a second UI
framework.

## What was added

| Piece              | Path                                                         |
| ------------------ | ------------------------------------------------------------ |
| Loopback guard     | `scripts/e2e/require-loopback.sh`                            |
| Fail-closed probes | `scripts/e2e/loopback-guard.test.sh` (`pnpm test:e2e:guard`) |
| API smoke          | `scripts/e2e/api-smoke.sh` (`pnpm test:e2e:api`)             |
| Mobile wrapper     | `scripts/e2e/mobile-api-smoke.sh` (`pnpm test:e2e:mobile`)   |
| Dart API contract  | `apps/mobile/tool/e2e_api_contract_smoke.dart`               |
| Playwright config  | `apps/erp-web/playwright.config.ts`                          |
| Browser smoke      | `apps/erp-web/e2e/employee-login.smoke.ts`                   |
| Vitest exclusion   | `apps/erp-web/vitest.config.ts` excludes `e2e/`              |

No production application behavior was changed. Local OTP `debugCode` already
existed.

## Fail-closed

Missing `E2E_API_BASE_URL` / `E2E_ERP_BASE_URL`, non-http(s) schemes, userinfo,
and non-loopback hosts (including `https://api.example.com` and
`https://api.ci.mee-events.invalid`) exit nonzero **before** a network call.
Loopback hosts allowed: `localhost`, `127.0.0.1`, `::1`.

The Playwright smoke also records outbound HTTP(S) request hosts and fails if
any are not loopback.

## Local live evidence (this host, 27 August 2026)

Stack: existing `me-event-local` Postgres 17.2 on `127.0.0.1:5433` (healthy),
migrations already applied, `db:seed:dev` (employee already present), Nest
`dev` on `127.0.0.1:3002`. Founder `.env` values were not read or copied.
Playwright started ERP on `127.0.0.1:3001` with
`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3002/api/v1` and
`NEXT_TELEMETRY_DISABLED=1`.

| Check             | Command                                                                                                                | Result                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL guards        | `corepack pnpm test:e2e:guard`                                                                                         | **PASS** — 17 probes                                                                                                                                                                              |
| API smoke         | `corepack pnpm test:e2e:api`                                                                                           | **PASS** — live, ready, synthetic customer OTP, bootstrap, enquiries, logout→401                                                                                                                  |
| Mobile contract   | `corepack pnpm test:e2e:mobile`                                                                                        | **PASS** — same path; **no device**                                                                                                                                                               |
| Dart missing URL  | `env -u E2E_API_BASE_URL dart run tool/e2e_api_contract_smoke.dart`                                                    | **PASS** (exit 1)                                                                                                                                                                                 |
| Dart non-loopback | `E2E_API_BASE_URL=https://api.example.com/api/v1 dart run tool/e2e_api_contract_smoke.dart`                            | **PASS** (exit 1)                                                                                                                                                                                 |
| Browser smoke     | `corepack pnpm test:e2e:erp`                                                                                           | **PASS** — 1/1 Chromium, ~3.5s test, 14.2s including ERP start                                                                                                                                    |
| ERP units         | `corepack pnpm --filter @me-event/erp-web test`                                                                        | **PASS** — 3 files, 8/8 (Playwright not in Vitest)                                                                                                                                                |
| Backend units     | `corepack pnpm --filter @me-event/backend test`                                                                        | **PASS** — 30 files, 190/190                                                                                                                                                                      |
| Format            | `corepack pnpm format:check`                                                                                           | **PASS**                                                                                                                                                                                          |
| Lint              | `corepack pnpm lint`                                                                                                   | **PASS**                                                                                                                                                                                          |
| Typecheck         | `corepack pnpm typecheck`                                                                                              | **PASS**                                                                                                                                                                                          |
| Build             | `NEXT_PUBLIC_APP_ENV=production NEXT_PUBLIC_API_BASE_URL=https://api.ci.mee-events.invalid/api/v1 corepack pnpm build` | **PASS**                                                                                                                                                                                          |
| Dart format       | `dart format --output=none --set-exit-if-changed lib test tool`                                                        | **PASS** — 201 files, 0 changed                                                                                                                                                                   |
| Flutter analyze   | `flutter analyze --fatal-infos`                                                                                        | **PASS** — 0 diagnostics                                                                                                                                                                          |
| JS audit          | `corepack pnpm audit --audit-level high`                                                                               | **PASS** — 0 critical / 0 high / 0 moderate / **2 low** (same residual class as STAB-03: `@eslint/plugin-kit` and `@supabase/auth-js`). Playwright added no High/Critical advisory. No allowlist. |

Next.js printed a cross-origin warning from `127.0.0.1` to `/_next/*` during
the Playwright run. The smoke still passed; it is not treated as device or
production evidence.

`apps/erp-web/next-env.d.ts` was rewritten by `next dev` / `next build` and
**restored** to the tracked form. It is not part of the STAB-17 commit.

## Cleanup honesty

- API/mobile smokes allocate a unique synthetic Indian mobile and revoke the
  session. They do not delete `app_users`.
- Browser smoke uses the public local seed `+919000000001`, then logout +
  `sessionStorage` clear.
- No access token, refresh token, or OTP code is printed.
- Playwright `screenshot`, `video`, and `trace` are `off`.

## Findings (do not treat as closed)

1. **No every-push live E2E GitHub job.** CI runs fail-closed URL probes only.
   A full stack job would duplicate STAB-15's database concerns onto the
   developer Compose project, need Chromium, and add a long/flaky required
   check. Deferred on purpose.
2. **No emulator/device E2E.** The mobile smoke is an API contract from the
   Flutter package. `apps/mobile/integration_test/` is still absent. iOS/Xcode
   E2E was out of scope.
3. **Synthetic customer rows remain** after OTP signup.
4. **`/leads` is still fixture-backed.** The browser smoke asserts `/quotes`
   (API-backed quotations shell, empty list allowed), not live CRM.
5. Founder-owned STAB-16 findings remain open: branch protection, native secret
   scanning/push protection, Dependabot security updates/alerts.

## Out of scope (not started)

STAB-18 documentation reconciliation beyond E2E-related docs, STAB-19, STAB-20,
Customer/Vendor/Worker/CRM/ERP product modules, enquiry→booking as a product
gate, payment/SMS/PDF/push providers, coverage thresholds.
