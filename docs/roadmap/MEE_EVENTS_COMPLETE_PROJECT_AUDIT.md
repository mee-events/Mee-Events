# Mee Events — Complete Project Audit

- **Audit date:** 25 August 2026
- **Repository:** `Mee Event V1` (`/Users/vinaychilagani/Desktop/Mee Event V1`)
- **Branch audited:** `master` tracking `origin/master`
- **Audited commit:** `9e2a442d91c137ec97a349d1a55697ae8d79d5df`
- **STAB-01 snapshot:** 25 August 2026 19:08 IST (Asia/Kolkata) at `ca994985a898d42da2a8d717041b93a8f8f0dc4c` (audit documentation commit on top of the audited application tree; no application-file delta)
- **STAB-03 dependency baseline:** 25 August 2026 IST. Canonical register `docs/05-security/dependency-security.md`. Final `pnpm audit`: 0 critical, 0 high, 0 moderate, 2 low.
- **STAB-04 formatting baseline:** 25 August 2026 22:22 IST. Prettier 3.4.2 and Dart format 3.12.2 both PASS with 0 owned-source drift. See `docs/roadmap/MEE_EVENTS_PROGRESS.md` STAB-04.
- **STAB-05 lint baseline:** 25 August 2026 22:50 IST. ESLint 9.17.0; root lint 0/0; backend scripts now covered. See `docs/roadmap/MEE_EVENTS_PROGRESS.md` STAB-05.
- **STAB-06 TypeScript baseline:** 25 August 2026 23:38 IST. TypeScript 5.7.2 in all four workspaces; 229 maintained roots covered; individual/root typechecks 0 errors. See `docs/roadmap/MEE_EVENTS_PROGRESS.md` STAB-06.
- **STAB-07 backend test baseline:** 26 August 2026 00:13 IST. Vitest 3.2.7; canonical and shuffled serialized runs both pass 30/30 files and 188/188 tests; no hidden skips/focus/todos. See `docs/08-testing/backend-test-baseline.md`.
- **Audit type:** Read-only implementation, configuration, test, security, release, documentation, and artifact inspection
- **Decision:** **NOT PRODUCTION-READY**

This is the current source-of-truth audit. It supersedes status claims in the 18 August 2026 roadmap PDFs where those claims conflict with the repository verified on 25 August 2026. It does not replace accepted ADRs or product requirements.

## 1. Executive assessment

Mee Events is a substantial **connected-platform foundation**, not a finished event operating system. The repository contains a coherent NestJS modular monolith, 20 ordered PostgreSQL migrations, one multi-role Flutter application, a Next.js employee portal, shared TypeScript contracts, extensive backend/mobile foundation tests, local Compose infrastructure, and a truthful documentation suite. The local static, unit, widget, and compile gates pass.

The end-to-end business lifecycle is **not yet proven**. The employee lead inbox is fixture-backed, external OTP is a fail-closed stub, payments are manual records rather than provider-verified transactions, PDFs and file storage are placeholders, notification outbox intents have no delivery publisher, there is no live PostgreSQL integration suite, and there is no browser/device E2E suite. Employee Mobile does not exist as a separate product.

Release is blocked by multiple concrete issues: remaining application security work (employee branch/resource scoping), a production Android manifest without `INTERNET`, debug signing of the production APK, an iOS target Flutter reports as not configured, missing production infrastructure, and missing real providers. JavaScript critical/high dependency advisories recorded in the 25 August audit were remediated in STAB-03 (`docs/05-security/dependency-security.md`); two low findings remain.

**No single overall percentage is reported.** A single number would hide the large difference between foundation code and verified production operation.

## 2. Status language

| Status           | Meaning in this audit                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| **DONE**         | Implemented, connected to the intended boundary, covered by meaningful automated tests, and verified in this audit. |
| **PARTIAL**      | Useful implementation exists, but the production workflow or proof is incomplete.                                   |
| **BROKEN**       | Code/configuration exists, but the intended workflow fails or cannot operate as configured.                         |
| **MISSING**      | No implementation exists for the claimed capability.                                                                |
| **BLOCKED**      | A provider, environment, account, credential, business policy, or infrastructure decision is required.              |
| **NOT VERIFIED** | Implementation appears to exist, but available evidence does not prove it.                                          |

## 3. Audit scope and limitations

Inspected: Git state/history/branches, repository structure, package/workspace files, Node/pnpm/Flutter toolchains, tracked and local environment-file presence, CI, NestJS modules, controllers, application services, repository adapters, DTO/contracts, authorization maps, migrations, Pattern B helpers, audit/outbox processors, Flutter routing/screens/repositories/storage/native projects, Next.js routes/API/session handling, tests, design artifacts, deployment/security docs, and older roadmaps.

Verified locally:

- `corepack pnpm verify` — **PASS**.
- Backend: **188/188 tests PASS** across 30 files in STAB-07; canonical and shuffled serialized runs both pass.
- ERP web: **2/2 tests PASS** across 2 files.
- Flutter format check — **PASS**, 199 files unchanged at original audit. **STAB-04:** `dart format --output=none --set-exit-if-changed lib test` — **PASS**, 200 files, 0 changed. Root `pnpm format:check` — **PASS**.
- Root `pnpm lint` — **PASS** at original audit. **STAB-05:** coverage extended to `apps/backend/scripts/**/*.ts`; ESLint 9.17.0; 0 errors / 0 warnings.
- Root `pnpm typecheck` — **PASS** at original audit. **STAB-06:** independently verified TypeScript 5.7.2 across backend, ERP, shared-types and API-contracts; all individual and root commands returned 0 errors with 229 maintained roots covered.
- Flutter analysis with fatal infos — **PASS**.
- Flutter tests — **435/435 PASS**.
- Flutter dev debug APK — **PASS**.
- Flutter production release APK compile — **PASS**, but the binary is unusable for production because it lacks network permission and is signed by the Android debug certificate.
- iOS unsigned release build — **FAIL**, `Application not configured for iOS`.
- Package security audit — **FAIL at original audit**, 74 findings: 4 critical, 29 high, 31 moderate, 10 low. **STAB-03 re-audit 25 August 2026 (IST):** remediations applied; final `pnpm audit` 0 critical, 0 high, 0 moderate, 2 low. See `docs/05-security/dependency-security.md`.

Not verified:

- Live PostgreSQL migration replay or integration behavior; Docker Desktop was not running and `pg_isready` was unavailable.
- Real provider calls, staging, production, backups, restore, monitoring, signed store builds, or store accounts.
- Browser/device E2E because no E2E framework exists.
- Runtime penetration testing, DAST, load testing, accessibility certification, or legal/privacy review.

### STAB-06 compile-time boundary update

Backend development typechecking covers 129 source, 32 test and 2 operational-script roots; the Nest production build config correctly narrows emission to 129 application-source roots. ERP covers 62 maintained source/test roots plus `next.config.ts` and `next-env.d.ts`; 49 currently generated, ignored `.next/types` roots also pass, while a no-`.next` clean-checkout-equivalent passes using only the 64 maintained roots. Both one-file shared packages pass, with API contracts inheriting strict NodeNext/declaration settings from shared-types. All workspaces have `strict`, `noImplicitAny` and `strictNullChecks`; backend/packages also have `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. `skipLibCheck` is enabled but only skips third-party declaration bodies, not owned roots.

No explicit `any`, `as any`, TypeScript suppression, source double assertion or source non-null assertion was found. Existing medium boundary debt remains documented rather than hidden: ERP network/session JSON assertions, PostgreSQL generic row trust, and unchecked string-to-number conversions in some money calculations. ERP's two missing hardening flags and an unused legacy role guard are low-severity follow-ups. Owners and detailed counts are in the progress tracker. No compiler setting was weakened, no source was excluded, and no application/configuration/generated file changed in STAB-06. This establishes compile-time consistency; it is not runtime validation or completion of STAB-07/08.

### STAB-07 backend test boundary update

The backend package uses Vitest 3.2.7 with `vitest run` and no repository Vitest
configuration or setup file. The canonical run passed 30/30 discovered spec
files and 188/188 tests with zero failures, skips, todos, or warnings in 2.83
seconds. A fresh-process run shuffled files and tests with seed `6072026`, used
one worker, and disabled file parallelism; the same 188/188 tests passed in 6.03
seconds. A deliberate non-matching filter exited 1, so zero test discovery is
not silently accepted. Static review found no `.skip`, `.todo`, `.only`,
conditional skip, concurrent test, retry, broad timeout override, or ignored
unhandled-error setting.

The baseline is meaningful but deliberately bounded: unit/domain/guard/service
tests, fake repositories, SQL-aware fake pools, mocked `PoolClient`
transactions, and static migration/media probes. It includes explicit security
regressions for JWT/session/role binding, OTP request controls, refresh reuse,
mobile role switching, capabilities, production environment rules, secret
redaction, customer ownership, catalog/media visibility, rollback modeling,
and Pattern B expectations. It does not include live PostgreSQL, HTTP E2E,
Redis, provider, load, or measured line/branch coverage.

Owned follow-ups are recorded in
`docs/08-testing/backend-test-baseline.md`: high-priority branch/BOLA coverage
(SEC-02/STAB-20 with STAB-15/17), auth consume/session atomicity and missing OTP
failure/concurrency cases (SEC-03/STAB-20 with STAB-15), and provider-bound
payment authenticity/replay/amount binding (INT-02 with STAB-15/17). Live DB
behavior, fake-heavy workflow negatives, a complete token/endpoint authorization
matrix, provider contracts, and coverage reporting are medium gaps assigned to
STAB-14/15/16/17/20 and INT-01–INT-06. No application source, test,
configuration, dependency, or generated output changed in STAB-07.

The repository-requested `lean-ctx` helper is not installed in the current environment, even though project AI-control documentation says it is. Native read/search/command tools were used as the documented fallback.

## 4. Repository and toolchain snapshot

| Area                            | Evidence                                                                                                                                                         | Status      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Working tree at audit start     | Clean; no application changes                                                                                                                                    | **DONE**    |
| Current branch                  | `master` → `origin/master`                                                                                                                                       | **DONE**    |
| Remote/default-branch alignment | GitHub HEAD is `master`. Local `refs/remotes/origin/HEAD` still stale-points at `origin/main`; `origin/main` is a stale remote-tracking branch.                  | **PARTIAL** |
| Git health                      | Commands work. `core.fsmonitor=true`. Sandbox `git status` can emit fsmonitor IPC errors; unsandboxed status in STAB-01 did not.                                 | **PARTIAL** |
| Node                            | `v20.20.2`; repository requires `>=20.11.0`                                                                                                                      | **DONE**    |
| pnpm                            | `9.15.4`; matches `packageManager`                                                                                                                               | **DONE**    |
| Flutter/Dart                    | Flutter `3.44.8`, Dart `3.12.2`; matches CI Flutter pin                                                                                                          | **DONE**    |
| Node version pin                | Engine and CI exist; no `.nvmrc`, `.node-version`, or `.tool-versions`                                                                                           | **PARTIAL** |
| Package layout                  | pnpm workspace covers backend, ERP, and packages; Flutter is separate                                                                                            | **DONE**    |
| Environment hygiene             | Local env files are ignored; templates use placeholders; signing/service files are ignored. STAB-02 reconciled the key matrix and fail-closed boot/client rules. | **PARTIAL** |
| Dependency health               | 74 known advisories, including vulnerable Next.js `15.1.3` and Vitest `2.1.8`                                                                                    | **BROKEN**  |

Repository shape:

```text
apps/mobile/          Flutter Customer, Vendor, Worker app; employee-oriented remnants also exist
apps/backend/         NestJS modular monolith
apps/erp-web/         Next.js Employee CRM/ERP foundation
packages/             api-contracts, shared-types
infrastructure/       local Compose and PostgreSQL migrations
docs/                 architecture, security, product, testing, deployment, ADRs, roadmaps
design/               raw Stitch exports and selected customer-home evidence
artifacts/            catalog media pilot and runtime screenshots
```

### 4.1 STAB-01 snapshot (25 August 2026 19:08 IST)

Reproduced on the founder workstation. Application files are identical to audited commit `9e2a442`. HEAD at snapshot was `ca99498` (unpushed documentation-only audit package). Working tree was clean. Toolchain: Node `v20.20.2`, pnpm `9.15.4`, Flutter `3.44.8`, Dart `3.12.2`. GitHub default branch is `master`; local `origin/HEAD` remains a stale pointer to `origin/main`. Environment-template key names, 20 PostgreSQL migrations, and `.github/workflows/ci.yml` match this audit. Env file **values were not inspected**. Full evidence is in `docs/roadmap/MEE_EVENTS_PROGRESS.md`.

### 4.2 STAB-02 environment verification (25 August 2026)

Configuration contracts were inventoried and reconciled. Canonical matrix:
`docs/07-deployment/environment.md`. Backend Zod now fail-closes staging/production
local OTP, placeholder secrets, wildcard/loopback production CORS, and missing
external SMS keys. ERP and Flutter release paths reject localhost API fallbacks.
SMS vendor, payments, storage, and other providers remain **FOUNDER DECISION
REQUIRED** and are not invented as unused keys. Follow-up: SEC-06 (dormant
mobile Supabase), STAB-16 (Node pin / CI), INT-01 (OTP vendor adapter).

## A. Current architecture

### Frontend

**Flutter mobile (`apps/mobile`)**

- One application routes authenticated `customer`, `vendor_owner`/`vendor_member`, and `worker` users from backend bootstrap.
- Customer has Home, Explore, Plan, Enquiries, and Account tabs. This differs from the approved target Home, Explore, Enquire, Plan, Profile.
- Vendor and Worker have assignment/task execution foundations connected to NestJS APIs.
- Manager/operations/inventory/finance Flutter screens remain in the tree, but backend bootstrap sends employee roles to `employee_web`, so these screens do not form a reachable Employee Mobile product.
- Secure storage is used for the mobile session.
- A legacy Supabase client is always initialized, and `SupabaseService` directly queries `event_services`; no active call site was found. This conflicts with the accepted backend-only data boundary even if dormant.

**Employee CRM/ERP web (`apps/erp-web`)**

- Next.js App Router portal with 45 `page.tsx` route files covering leads, quotations, bookings/events, manager operations, vendor/worker administration, inventory/warehouse, and finance foundations.
- Most operational pages call the real NestJS API through `employee-api.ts`.
- The home dashboard is openly rendered sample data and explicitly shows `SYNC OFF` / local foundation.
- The lead inbox uses `DUMMY_LEADS`; it does not call `listLeads`.
- Login redirects every successfully authenticated account to `/leads` without verifying an employee surface first. Actual protected API data remains backend-guarded, but UI routing is not least privilege.
- There is no central middleware/server-side employee or capability gate and no Content Security Policy.

### Backend

- NestJS modular monolith under `/api/v1` with modules for identity, platform foundation, catalog/search, enquiries/CRM, quotations, payments, bookings, event records, manager/vendor/worker, inventory, finance, operations, audit, and health.
- The access-token guard is global. CapabilityGuard is applied at controllers and maps roles to server-owned capabilities.
- Zod DTO pipes, UUID parsing, a global exception filter, CORS allowlisting, Pino request IDs/logging, Swagger, and health endpoints exist.
- Important employee list queries are branch-scoped, but multiple detail/mutation flows load records by global UUID without checking the principal's branch. This is a systemic branch-isolation/IDOR risk.

### Database

- PostgreSQL is the intended source of truth.
- 20 ordered migrations contain 114 table declarations, 334 index declarations, and 68 trigger declarations.
- Schema breadth covers identity, catalog, enquiry/CRM, quotations/payments/bookings, event records, manager/vendor/worker, inventory, finance, operations, audit, timelines, and outbox.
- Pattern B helpers and append-only audit triggers are strong foundations.
- The migration runner commits each SQL file and records it in `schema_migrations` in a separate command; a crash between those steps can leave an applied-but-unrecorded migration.
- `idempotency_records` exists but has no application usage.
- No live migration replay, DB integration tests, backup, or restore proof exists.

### Authentication

- E.164 mobile OTP flow, HMAC OTP digests, five attempts, five challenges/hour/mobile, and a 60-second server-enforced resend cooldown exist.
- Access JWT TTL is 15 minutes. Opaque refresh tokens are HMAC-digested and rotated with reuse detection; device sessions expire after 30 days and support logout/revocation.
- Production forbids the local OTP provider.
- External SMS delivery is deliberately unimplemented and always fails closed.
- OTP consumption and subsequent user/session/audit writes are not one atomic transaction. Concurrent correct verification can race.
- The mobile client generates a new random device ID on every login instead of persisting a stable installation identifier. Old sessions can remain active until expiry.

### Authorization

- Server-side roles and capability maps are a good base.
- Customer, Vendor, and Worker self-service paths generally enforce ownership through user/vendor/worker membership checks.
- Employee branch isolation is inconsistent. Examples include CRM `getLead`/claim/update, CRM quotation detail/timeline/update/send, operations detail/task mutations, and some manager/vendor/worker detail operations that accept only record IDs or mutation context without a branch predicate.
- Client-side capability display/routing is incomplete; the ERP relies mainly on backend denial.
- The defined vendor/worker payment-own capabilities do not have matching self-service finance endpoints.

### Shared contracts

- `packages/api-contracts` and `packages/shared-types` compile and are consumed by backend/ERP.
- Flutter mirrors JSON models manually, so contract drift remains possible.
- Shared packages have no dedicated tests or schema generation/compatibility gate.

### Infrastructure

- Local Docker Compose provides PostgreSQL 17.2 and Redis 7.4.1.
- Redis is not used by application code.
- No production/staging cloud topology, IaC, secret manager, deployment pipeline, backup automation, or rollback automation exists.

### CI/CD

- GitHub Actions verifies pnpm install, shared builds, format, lint, typecheck, tests, backend/ERP builds, Flutter format/analyze/tests, and a dev debug APK.
- Dependency Review runs only on pull requests.
- CI does not run package audit/SCA on all branches, secret scanning, SAST, live PostgreSQL integration, browser/device E2E, production-flavor builds, signed artifacts, deploys, rollback, or release promotion.
- Workflow/badge conventions use `master`. GitHub default is `master`. Local `origin/HEAD` still stale-points at obsolete `main`.

## 5. Intended lifecycle versus implementation

| Lifecycle step           | Actual implementation                                                      | Status           |
| ------------------------ | -------------------------------------------------------------------------- | ---------------- |
| Customer login/session   | Local OTP and secure mobile session work; real SMS does not                | **PARTIAL**      |
| Home/Explore             | Backend catalog/search plus branded/sample fallbacks                       | **PARTIAL**      |
| Enquiry submission       | Mobile → API → PostgreSQL adapter exists                                   | **PARTIAL**      |
| Enquiry → CRM lead       | Async outbox processor exists; no live DB proof and crash recovery gap     | **NOT VERIFIED** |
| CRM handling             | Lead detail API exists; lead inbox UI is fixture data                      | **BROKEN**       |
| Quotation                | API, database model, CRM/customer screens and decisions exist              | **PARTIAL**      |
| Customer approval        | Own-resource approval/reject/revision paths exist                          | **PARTIAL**      |
| Advance payment          | Manual UPI/bank/cash record submission/employee confirmation only          | **PARTIAL**      |
| Booking                  | Confirmation can create booking                                            | **PARTIAL**      |
| Event Record             | Handoff foundation exists                                                  | **PARTIAL**      |
| Manager/operations       | Backend and ERP foundations exist; no complete operational E2E             | **PARTIAL**      |
| Vendor/Worker assignment | Backend and mobile execution foundations exist                             | **PARTIAL**      |
| Inventory/Finance        | Broad backend/ERP foundations exist; procurement/reconciliation incomplete | **PARTIAL**      |
| Final payment            | Ledger/finance records exist; no gateway reconciliation                    | **PARTIAL**      |
| Completion               | Operations completion foundation exists                                    | **PARTIAL**      |
| Feedback                 | No connected customer feedback workflow                                    | **MISSING**      |

The complete Customer → CRM → Quotation → Payment → Booking → Event → Operations → Finance → Feedback journey is **NOT VERIFIED** and cannot be treated as DONE.

## B–G. Actual completion inventory

### DONE

- Monorepo/workspace structure and accepted modular-monolith/PostgreSQL direction.
- Local TypeScript formatting, linting, typecheck, unit/foundation tests, and backend/ERP production compilation.
- Flutter formatting, analysis, 435 unit/widget tests, dev debug build, and production APK compilation as compile-only evidence.
- Global access-token authentication guard, server-owned capability map, DTO validation base, CORS allowlist, request IDs, basic log redaction, and health endpoints.
- Local-development Compose/migration catalog documentation.
- Versioned migrations and broad schema/audit/timeline/outbox foundations as source code.
- Curated catalog-media pilot provenance/checksums are explicitly offline and not falsely presented as production.

### PARTIAL

- Authentication/session lifecycle, Customer experience, Vendor, Worker, CRM, ERP, backend domain workflows, database migration operations, audit/outbox, CI, security headers, observability, and release configuration.
- Customer favorites/plan/recent-search state is device-local rather than server-synced.
- Customer PDF/documents/notifications/payment screens expose foundations or honest placeholders, not production integrations.
- Error/empty/loading states exist in many screens; offline transactional behavior does not.
- Design repository contains 230 Stitch screens with a keep/delete plan; it is design evidence, not implemented product proof.
- Two low JavaScript advisories remain after STAB-03 (`@supabase/auth-js`, `@eslint/plugin-kit`); owned, not accepted as critical/high.

### BROKEN

- ERP Lead Inbox uses fixture leads instead of real CRM list data.
- Production Android APK lacks `android.permission.INTERNET`.
- Production Android APK is signed by `CN=Android Debug`.
- iOS release verification fails: Flutter reports `Application not configured for iOS`.
- Local clone still has a stale `origin/HEAD` → `origin/main` symbolic-ref and a stale `origin/main` tracking branch, even though GitHub default is now `master`.
- Older roadmap PDFs say format/lint and 20 Flutter tests fail; current gates pass, so those starting instructions are stale.
- Authentication documentation says OTP resend is not server-enforced; implementation enforces it.

### MISSING

- Separate Employee Mobile project and ADR.
- Real SMS/OTP adapter; payment gateway and webhook verification; object-storage upload/download policy; actual PDF generation; push notifications; email; maps/location integration; analytics; crash reporting.
- Customer enquiry editing, connected notifications/documents/feedback, robust offline mode, and production real-data catalog completeness.
- Vendor business onboarding, verification, service/product/pricing/availability management, documents, notifications, and own settlement workflow.
- Worker profile/availability, real attendance location/privacy controls, documents, notifications, and payout visibility.
- CRM live dashboard/My Work/follow-up/customer 360/reports/notification/audit views and browser E2E.
- ERP procurement, purchase orders, goods receipt, complete approvals, employee administration, reporting, and browser E2E.
- Live DB integration tests, HTTP integration tests, cross-module E2E, security regression suite, load/performance test, accessibility test, and production smoke suite.
- Staging/production IaC, deployments, managed secrets, backups, restore drill, monitoring/alerts, rollback, incident response, and signed-store pipelines.

### BLOCKED

- Production hosting/database topology, SMS provider, payment provider, storage/CDN, push, email, maps/location, monitoring/crash provider, analytics policy, and store-account ownership require founder/provider decisions.
- Live local database verification is blocked in this audit environment because Docker was not running.
- Android release signing requires an organization-controlled keystore and secret-management decision.
- iOS release requires Apple Developer team/account, certificates/profiles, and corrected Flutter platform configuration.
- Legal privacy policy, terms, refund/cancellation rules, data retention, location consent, payment policy, and store declarations require business/legal decisions.

### NOT VERIFIED

- PostgreSQL migration replay, constraints/triggers against a live database, concurrent transactions, outbox retry/recovery, and demo smoke scripts.
- Production response under provider/network failures.
- Staging TLS/CORS/headers, branch isolation in a multi-branch dataset, backup restore, monitoring, disaster recovery, Android internal track, TestFlight, and app-store reviews.

## 6. Evidence-based completion assessment

### Method

Each area is scored against ten area-specific controls worth 10 points each. Evidence earns: 0 = missing/failed, 2.5 = scaffold, 5 = connected implementation without boundary proof, 7.5 = connected plus meaningful automated tests, 10 = production-boundary or release proof. Scores below are sums of the disclosed controls, not elapsed-time estimates. A local compile does not earn provider, database-integration, E2E, or production-operation points.

| Area                 |   Score | Earned evidence (10-point controls, in order)                                                                                                                                                        | Why it is not higher                                                                                            |
| -------------------- | ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Architecture         | **61%** | repo topology 10; ADR direction 8; API boundary 6; shared contracts 7; DB authority 7; auth/capabilities 7; Pattern B 6; client alignment 5; production topology 0; doc concordance 5                | Dormant direct Supabase client, unreachable staff-mobile remnants, async-flow doc drift, no production topology |
| Backend              | **48%** | module/API breadth 9; auth 7; authorization 5; lifecycle workflows 6; validation/errors 7; audit/transactions 6; async delivery 3; real providers 0; integration proof 2; production proof 3         | Broad foundation but branch scoping, atomicity, providers, DB tests, E2E, and production proof are absent       |
| Database             | **44%** | schema 9; constraints/indexes 8; domain breadth 8; runner 5; transactions 6; audit 7; idempotency 1; live integration 0; backups 0; production ops 0                                                 | No live replay/integration/restore; idempotency unused; runner has crash window                                 |
| Customer             | **40%** | auth/session 6; Home/Explore 7; Plan/favorites 4; enquiry 6; quotation 5; payment/booking 4; event workspace 4; profile/docs/notif/feedback 1; resilience 3; E2E/release 0                           | Real-provider and complete real-data journey missing                                                            |
| Vendor               | **24%** | auth 5; onboarding 1; catalog/pricing 1; assignments 6; progress 5; docs/notifs 0; settlement 0; authz 4; tests 2; E2E/release 0                                                                     | Assignment slice only; business product and E2E missing                                                         |
| Worker               | **24%** | auth 5; profile 1; availability 0; assignments 6; attendance/progress 5; location/privacy 1; docs/notifs 0; payout 0; authz 4; tests/E2E 2                                                           | Field execution is placeholder-based and unproved on device                                                     |
| CRM                  | **19%** | employee auth 2; capability UI 2; dashboard/My Work 1; live lead inbox 1; lead/enquiry detail 5; quotation/handoff 5; Customer 360/comms 1; search/filter/page 2; reports/notif/audit 0; tests/E2E 0 | Primary lead inbox is fixture-backed; workflow breadth and proof are missing                                    |
| ERP                  | **30%** | operations 6; manager 5; vendor/worker 5; inventory 6; procurement 0; finance 5; approvals/admin/reports 0; capability UI 2; tests 1; E2E/release 0                                                  | Many pages call live APIs, but key domains and browser proof are missing                                        |
| Employee Mobile      |  **0%** | all ten controls 0                                                                                                                                                                                   | Separate product and ADR do not exist                                                                           |
| Integrations         |  **3%** | OTP 0; payment 1; storage 1; PDF 0; push 0; email 0; maps 0; analytics 0; monitoring 1; crash 0                                                                                                      | Only manual/placeholder foundations exist                                                                       |
| Security             | **44%** | authentication 7; session 5; capability RBAC 6; ownership/scope 4; validation 7; abuse controls 3; client security 4; secret hygiene 6; headers/logs/deps 2; security tests 0                        | Critical dependencies, branch IDOR risk, missing headers/throttle/tests, unstable device ID                     |
| Testing              | **23%** | backend unit 8; mobile unit/widget 8; ERP unit 1; shared packages 0; DB integration 0; HTTP integration 0; cross-module 0; UI E2E 0; security 1; CI 5                                                | High test count is concentrated below real boundaries                                                           |
| Infrastructure       | **24%** | local env 7; local Compose 6; migrations 5; CI 5; staging/prod 0; secrets 0; backups 0; monitoring 1; release pipeline 0; rollback 0                                                                 | Local-only infrastructure                                                                                       |
| Production readiness |  **8%** | env validation 5; health/logging 3; all other production controls 0                                                                                                                                  | Providers, DB, deployment, security, observability, recovery, and E2E are unproved                              |
| Android release      |  **9%** | IDs/flavors 2; branding 1; signing 0; prod env 1; prod API 0; compile 5; testing 0; policy/listing 0; permissions 0; rollout 0                                                                       | Compiles but lacks network permission and is debug-signed                                                       |
| iOS release          |  **2%** | identifier/project artifacts 2; remaining controls 0                                                                                                                                                 | Flutter refuses release build; no team/signing/TestFlight/privacy/store proof                                   |

## 7. Module audits

### Customer

Current navigation is **Home → Explore → Plan → Enquiries → Account**. The required navigation is **Home → Explore → Enquire → Plan → Profile**. The customer code has real API repositories for catalog/search/enquiries/quotation decisions/manual payments/bookings/event workspace; device-local plan/favorites/recent searches; honest sample catalog notices; and broad widget coverage. It lacks enquiry editing, real payment/PDF/storage/notifications, complete profile/privacy/support, feedback, resilient offline writes, and E2E. The old `super_app_dummy_data.dart` appears unreferenced but is **UNKNOWN/OBSOLETE-CANDIDATE**, not approved for deletion.

### Vendor

Vendor authentication/role routing, dashboard, assignment list/detail, accept/reject, progress, and own-resource checks exist. Business onboarding, verification, offerings, pricing, availability, documents, notifications, settlement visibility, integration tests against PostgreSQL, and device E2E are absent.

### Worker

Worker dashboard/tasks, accept/reject, check-in/progress/check-out, and ownership checks exist. Location fields are explicitly placeholders; Android/iOS permission and privacy implementations do not exist. Profile, availability, documents, notifications, payout visibility, live attendance proof, and E2E are absent.

### CRM

Backend lead creation/claim/requirements/status and quote handoff exist. The web lead detail page uses the API, but the lead inbox itself uses local dummy leads. Dashboard/My Work/follow-up/Customer 360/communication/reporting/notification/audit workflows are absent or illustrative. No central employee bootstrap gate, browser E2E, or robust capability-aware navigation exists.

### ERP

Operations, manager, vendor/worker administration, inventory/warehouse, and finance have broad API/page foundations. Procurement, purchase orders, goods receipt, complete approvals, employee administration, reports, audit UI, and E2E are missing. Any new database domain must follow the user's ADR stop-rule.

### Employee Mobile

**MISSING.** Existing manager/operations/inventory/finance Flutter screens are not a separate or reachable employee application. Start only with `EMP-01` ADR after ERP, per the approved execution order.

## 8. External integrations

| Category        | Provider                      | Purpose                                       | Current implementation                                      | Missing / credentials                                                            | Security and test requirement                                              | Production status |
| --------------- | ----------------------------- | --------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------- |
| OTP/SMS         | **FOUNDER DECISION REQUIRED** | Login OTP                                     | Local dev provider; external adapter always throws          | Vendor account, endpoint/API key or vendor SDK, templates, DLT/TRAI requirements | Do not log codes; IP/mobile throttling; sandbox and delivery/failure tests | **BLOCKED**       |
| Payment         | **FOUNDER DECISION REQUIRED** | Advance/final payments/refunds                | Manual cash/UPI/bank records and employee confirmation      | Gateway account/keys, webhook secret, settlement/reconciliation policy           | Signed webhooks, idempotency, amount/order binding, replay/failure tests   | **BLOCKED**       |
| Object storage  | **FOUNDER DECISION REQUIRED** | KYC, proofs, invoices, event media            | Storage-key columns and Supabase scripts/legacy client only | Private bucket, service credentials, malware scanning, retention                 | Backend-only access, signed URLs, MIME/size validation, ownership tests    | **BLOCKED**       |
| PDF             | Technical/provider decision   | Quotation/invoice/receipt documents           | `pdf_placeholder` row only                                  | Renderer/template/font/storage pipeline                                          | Server-side generation, immutable version, hash, authorization tests       | **MISSING**       |
| Push            | **FOUNDER DECISION REQUIRED** | Customer/vendor/worker/employee notifications | Outbox-only intents; `pushIntegrated: false`                | FCM/APNs credentials, token lifecycle, consent/preferences                       | No sensitive lock-screen payloads; retry/dedupe/device tests               | **BLOCKED**       |
| Email           | **FOUNDER DECISION REQUIRED** | Receipts, invoices, ops messages              | No provider                                                 | Domain, SPF/DKIM/DMARC, API credentials, templates                               | PII minimization, bounce/unsubscribe, sandbox tests                        | **BLOCKED**       |
| Maps/location   | **FOUNDER DECISION REQUIRED** | Event map and justified attendance            | Placeholder strings only                                    | Maps key/provider, exact worker policy and consent                               | Least precision/retention, anti-spoofing proportionality, privacy tests    | **BLOCKED**       |
| Analytics       | **FOUNDER DECISION REQUIRED** | Product/business analytics                    | None                                                        | Event taxonomy, consent/legal basis, provider                                    | No sensitive free text/PII; opt-out and data validation                    | **BLOCKED**       |
| Monitoring/APM  | **FOUNDER DECISION REQUIRED** | Logs, metrics, traces, alerts                 | Pino and health endpoints only                              | Host/APM/log provider and alert ownership                                        | Token/PII redaction; alert drills and SLO tests                            | **BLOCKED**       |
| Crash reporting | **FOUNDER DECISION REQUIRED** | Mobile/web crash visibility                   | None                                                        | Provider projects/DSNs and privacy policy                                        | Scrub PII/tokens; test crash in non-production                             | **BLOCKED**       |

## 9. Security audit

Critical and high findings are release blockers unless explicitly risk-accepted in writing by the founder and security owner. Risk acceptance does not make the control DONE.

### CRITICAL

| ID       | Finding                                                                            | Evidence / impact                                                                                        | Required action                                                              |
| -------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| SEC-C-01 | Production Next.js dependency has critical RCE and authorization-bypass advisories | **Closed in STAB-03.** ERP now uses Next `15.5.23`. Final audit has 0 Next critical/high.                | Keep Next on a supported 15.x patch line; add scheduled SCA in STAB-16       |
| SEC-C-02 | Test toolchain has critical Vitest file-read/RCE advisories                        | **Closed in STAB-03.** Backend and ERP use Vitest `3.2.7` with Vite `6.4.3`. Tests use `vitest run` only | Do not expose Vitest UI/API servers; Node 22 / Vitest 5 is a later migration |

### HIGH

| ID       | Finding                                                      | Evidence / impact                                                                                                  | Required action                                                                                                          |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| SEC-H-01 | Inconsistent employee branch/resource isolation (IDOR/BOLA)  | Multiple record-by-ID reads/mutations omit principal branch predicates; UUID knowledge may cross branch boundaries | Add branch to every employee repository predicate/mutation, return 404 cross-scope, add denial tests across every domain |
| SEC-H-02 | Production Android artifact is debug-signed                  | Verified certificate `CN=Android Debug`                                                                            | Create organization-controlled upload/app-signing process; keep keys outside Git; CI signing from secret manager         |
| SEC-H-03 | Mobile device ID changes every login                         | `_deviceId()` generates a random suffix each login; prior refresh sessions can remain valid for 30 days            | Persist installation ID securely, provide session inventory/revoke-all, test reinstall/login/logout/reuse                |
| SEC-H-04 | OTP consume/session creation is not atomic and is race-prone | Challenge is read then unconditionally updated; user/session/audit writes are separate                             | Transactional conditional consume, row lock/CAS, rollback and concurrency tests                                          |
| SEC-H-05 | Payment trust boundary is manual                             | Employee confirmation creates financial/booking outcomes without provider-signed webhook/reconciliation            | Implement provider order binding, signed webhook, idempotency, independent reconciliation and fraud tests                |
| SEC-H-06 | Outbox messages can remain `processing` forever              | Processors claim pending rows; no lease/locked-at recovery for crashed workers                                     | Add leases/recovery/dead-letter/metrics and crash/restart tests                                                          |

### MEDIUM

| ID       | Finding                                                                                     | Required action                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-M-01 | No backend security-header middleware; web lacks CSP, HSTS and Permissions-Policy           | Add environment-appropriate Helmet/web headers; test headers in staging                                                                                                                        |
| SEC-M-02 | Swagger is enabled on every environment                                                     | Disable or authenticate production docs; verify no internal schemas unnecessarily exposed                                                                                                      |
| SEC-M-03 | OTP has per-phone limits but no IP/edge/global abuse controls                               | Add trusted-proxy-aware throttling and monitoring without blocking legitimate users                                                                                                            |
| SEC-M-04 | Log redaction omits refresh-token request fields and broader sensitive bodies               | Redact token/password/PII paths; add logging tests and production sampling review                                                                                                              |
| SEC-M-05 | ERP bearer tokens live in `sessionStorage` with no CSP                                      | Adopt strong CSP and XSS controls; evaluate backend-for-frontend/secure-cookie design before production                                                                                        |
| SEC-M-06 | Mobile bootstrap parser defaults unknown surfaces/roles to Customer                         | Fail closed on malformed/unknown authorized bootstrap responses                                                                                                                                |
| SEC-M-07 | External OTP credentials exist in examples but were not validated in the environment schema | **Closed in STAB-02:** `OTP_PROVIDER=external` requires SMS keys at boot; staging/production reject local OTP and placeholder secrets. Residual: vendor HTTP adapter still throws until INT-01 |
| SEC-M-08 | File upload/object-storage controls are not implemented                                     | Define allowlist, size, scanning, ownership, private buckets, signed URLs and retention before uploads                                                                                         |
| SEC-M-09 | Migration apply and bookkeeping are not atomic                                              | Make application+recording recoverable/transactional or add checksums and applied-state reconciliation                                                                                         |
| SEC-M-10 | Direct Supabase client is initialized in mobile contrary to accepted boundary               | Prove no use, remove client DB path, and keep storage/DB credentials behind NestJS                                                                                                             |

### LOW / INFORMATIONAL

- **LOW:** CORS uses credentials although bearer APIs do not need cross-origin cookies; simplify after client review.
- **LOW:** Public readiness returns HTTP success with `degraded`; load balancer configuration must treat body/state correctly or change status code.
- **LOW:** No explicit PostgreSQL TLS enforcement in pool configuration; production URL/provider policy must require encryption and certificate validation.
- **LOW:** Git fsmonitor is enabled and can emit IPC errors in sandboxed tooling; local `origin/HEAD` still stale-points at deleted `main` even though GitHub default is `master`.
- **INFORMATIONAL:** CSRF risk is currently lower because auth uses bearer headers rather than ambient cookies; reassess if web auth changes.
- **INFORMATIONAL:** Local OTP debug code is correctly limited to local development by configuration; retain tests around this condition.
- **INFORMATIONAL:** Secret filename hygiene is good; a manual tracked-file scan found only placeholder candidates. Automated secret scanning is still missing.
- **INFORMATIONAL:** Audit append-only triggers and server-side capabilities are valuable controls and should be preserved.

## 10. Testing audit

| Test layer               | Actual status                                  | Gap / required proof                                                                            |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backend unit/foundation  | 188 tests PASS across 30 files (STAB-07)       | Many use fake repositories; add live DB/HTTP/authorization concurrency tests                    |
| ERP unit/component       | 2 tests PASS                                   | Nearly all routes and workflows untested                                                        |
| Flutter unit/widget      | 435 tests PASS                                 | No device E2E, provider sandbox, native permission, or release-network proof                    |
| Shared packages          | No test scripts                                | Add contract compatibility/serialization tests                                                  |
| PostgreSQL integration   | None                                           | Replay migrations on empty DB and upgrade fixture; exercise real adapters/transactions/triggers |
| Backend HTTP integration | None                                           | Use a real Nest instance and DB; test validation/authz/errors/idempotency                       |
| Cross-module workflow    | Demo shell scripts only; not run in this audit | Automate Customer → CRM → Quote → Payment → Booking → Event and failures                        |
| Browser E2E              | None                                           | Add Playwright or approved equivalent for employee flows                                        |
| Device E2E               | None                                           | Add Flutter `integration_test` on Android/iOS for role journeys                                 |
| Security                 | Sparse guard/service tests                     | Add branch/ownership matrix, OTP/refresh races, webhook replay, upload abuse, header tests      |
| Performance              | Algorithmic model only                         | Add load targets and run against staging with DB observability                                  |
| Production               | None                                           | Add staging smoke, synthetic health/business transaction, rollback and restore drills           |

The immediate testing priority is not “more widget tests.” It is live PostgreSQL, HTTP authorization, browser/device E2E, provider sandbox, and failure-mode proof.

## 11. Production readiness audit

| Requirement                      | Status              | Evidence / blocker                                                 |
| -------------------------------- | ------------------- | ------------------------------------------------------------------ |
| Production database              | **BLOCKED**         | Provider/topology undecided                                        |
| Migrations                       | **PARTIAL**         | 20 scripts; no production rehearsal/checksums/rollback proof       |
| Backups and restore              | **MISSING**         | Docs describe requirement; no implementation/drill                 |
| Secrets management               | **BLOCKED**         | Good templates/ignore rules; no selected manager/injection process |
| Real OTP                         | **MISSING**         | External adapter stub                                              |
| Real payments                    | **MISSING**         | Manual confirmation only                                           |
| Real storage                     | **MISSING**         | Columns/scripts only                                               |
| Real PDFs                        | **MISSING**         | Placeholder only                                                   |
| Real notifications/email         | **MISSING**         | Outbox intents only                                                |
| Logging                          | **PARTIAL**         | Pino/request IDs; redaction/aggregation incomplete                 |
| Monitoring/alerts/error tracking | **MISSING**         | Health endpoints only                                              |
| Rate limiting                    | **PARTIAL**         | OTP per-number only; no edge/general controls                      |
| Security headers/HTTPS           | **PARTIAL/BLOCKED** | Limited web headers; no host/TLS proof                             |
| CI/CD                            | **PARTIAL**         | CI exists; CD/release promotion absent                             |
| Rollback                         | **MISSING**         | Documentation guidance only                                        |
| Database observability           | **MISSING**         | No metrics/slow-query/connection alerting                          |

## 12. Android release audit

| ID/control                             | Status             | Current evidence                                                                   |
| -------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| ANDROID-01 App ID / ANDROID-02 package | **PARTIAL**        | `com.meevent.app` prod, dev/staging suffixes; founder/legal ownership not verified |
| ANDROID-03 Branding                    | **PARTIAL**        | Name/icon base exists; listing/asset/legal review missing                          |
| ANDROID-04/05 Signing/keystore         | **BROKEN/BLOCKED** | Production APK is debug-signed; no organization key process                        |
| ANDROID-06/07 Production env/API       | **BROKEN/BLOCKED** | APK compiles but lacks INTERNET; no production API                                 |
| ANDROID-08 Release build               | **BROKEN**         | Compile succeeds; artifact is not releasable                                       |
| ANDROID-09/10 Internal/closed testing  | **MISSING**        | No Play Console evidence                                                           |
| ANDROID-11/12 Privacy/listing          | **BLOCKED**        | Legal/business content required                                                    |
| ANDROID-13 Permissions                 | **BROKEN**         | Production manifest has no INTERNET; location not implemented                      |
| ANDROID-14 Data safety                 | **BLOCKED**        | Final provider/data inventory required                                             |
| ANDROID-15 Rollout                     | **MISSING**        | No store pipeline/track evidence                                                   |

## 13. iOS release audit

| ID/control                             | Status      | Current evidence                                                                               |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| IOS-01 Bundle ID                       | **PARTIAL** | `com.meeevents.meeEvents`; ownership/final naming not verified                                 |
| IOS-02–04 Developer/certs/provisioning | **BLOCKED** | No team/certificate/profile evidence                                                           |
| IOS-05 Production environment          | **MISSING** | No distinct iOS production scheme/config proof                                                 |
| IOS-06 Release build                   | **BROKEN**  | Flutter reports application not configured for iOS; `.metadata` lists only root/web migrations |
| IOS-07 TestFlight                      | **MISSING** | No evidence                                                                                    |
| IOS-08 Privacy                         | **BLOCKED** | No permission descriptions/providers/policy declarations yet                                   |
| IOS-09 Listing                         | **BLOCKED** | Founder/legal/marketing content required                                                       |
| IOS-10 Release                         | **MISSING** | No signed archive/App Store Connect proof                                                      |

## 14. Documentation drift

| Claim/document                                                 | Implementation evidence                                                                        | Resolution                                                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 18 Aug roadmaps: format/lint/20 Flutter tests failing          | All gates pass on 25 Aug                                                                       | Older PDFs are historical/stale; do not execute their first block                                                       |
| Architecture example: enquiry + lead create in one transaction | Enquiry creates outbox; CRM processor later creates lead                                       | Correct docs during STAB-18; preserve asynchronous design or record ADR if changing                                     |
| Overview/architecture: shared staff mobile includes Manager    | Bootstrap maps manager/employee roles to employee web; manager Flutter screens are unreachable | Update wording; Employee Mobile is future/separate                                                                      |
| “Clients never write DB directly”                              | Mobile initializes Supabase and has a direct `event_services` service                          | Remove dormant client path or document/ADR an exception; accepted architecture says backend-only                        |
| Authentication: resend hint not server-enforced                | `requestOtp` checks latest open challenge and returns 429                                      | Correct security doc                                                                                                    |
| AI controls: lean-ctx installed/verified                       | Helper absent in current environment                                                           | Mark as workstation-specific and add verification/fallback                                                              |
| Remote branch assumptions                                      | GitHub HEAD is `master`; local `origin/HEAD` still stale-points at `origin/main`               | Refresh/prune local `origin/HEAD` and stale `origin/main` in a later governance task; do not rename branches in STAB-01 |
| Outbox reliability wording                                     | Only two processors exist; no lease recovery/general publisher                                 | Narrow current-state wording and document operational gaps                                                              |

## 15. Design and cleanup classification

No files were deleted.

| Path/class                                      | Classification                                | Decision                                                                 |
| ----------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `design/stitch-screens/html/` and helper chunks | **GENERATED / UNKNOWN** raw design export     | Retain until a reviewed cleanup manifest proves safe removal             |
| Stitch cleanup plan entries                     | **OBSOLETE-CANDIDATE / UNKNOWN**              | Plan is evidence only; do not delete automatically                       |
| Customer-home screenshots/design notes          | **ACTIVE evidence**                           | Retain while linked to current UI work                                   |
| Catalog media raw/AI candidates                 | **ACTIVE offline staging evidence**           | Retain; do not publish without rights/approval workflow                  |
| Flutter/Node build/cache outputs                | **GENERATED** and ignored                     | May be cleaned by normal tool clean commands in a separate approved task |
| `super_app_dummy_data.dart`                     | **OBSOLETE-CANDIDATE / UNKNOWN**              | Appears unreferenced; confirm via build/import analysis before deletion  |
| Older roadmap PDFs                              | **OBSOLETE status, ACTIVE historical record** | Keep until documentation-governance task decides archive policy          |

## 16. Release blockers

1. ~~Upgrade/remediate critical and high dependency advisories.~~ **Done in STAB-03** (2 low remain; see `docs/05-security/dependency-security.md`).
2. Close employee branch/resource IDOR/BOLA gaps and add denial tests.
3. Prove PostgreSQL migrations and real adapters in integration tests.
4. Replace fixture CRM lead inbox and enforce employee bootstrap/capability routing.
5. Select and integrate real OTP, payment, storage, PDF, notification, and monitoring services.
6. Add idempotency and webhook/outbox crash recovery.
7. Add HTTP, cross-module, browser, device, and security E2E gates.
8. Provision staging/production infrastructure, secrets, TLS, backups, restore, monitoring, alerts, deployment, rollback, and incident ownership.
9. Fix Android production permission/signing and complete Play requirements.
10. Repair iOS platform configuration, sign, TestFlight, privacy, and App Store requirements.

## 17. Founder decisions required

Do not block Phase 0 on provider procurement unless a Phase 0 task explicitly needs it. Record decisions before the dependent integration phase.

### DECISION REQUIRED — Production hosting and database

- **Decision:** Managed API/web host, managed PostgreSQL, storage, regions, staging and production ownership.
- **Why required:** Deployment, backups, TLS, secret injection, monitoring, cost and compliance depend on it.
- **Recommended option:** One managed India-region-capable stack with separate staging/production, PostgreSQL PITR, private networking where practical, and documented export/exit path.
- **Alternative:** Self-managed infrastructure only if a named operator owns 24/7 reliability.
- **Impact:** Blocks production infrastructure and release.

### DECISION REQUIRED — OTP/SMS provider

- **Decision:** India-compliant transactional SMS/OTP provider and sender-template ownership.
- **Why required:** Production login cannot operate.
- **Recommended option:** Provider with DLT/TRAI support, sandbox, delivery webhooks, documented rate limits and strong account security.
- **Alternative:** Managed identity provider only after an ADR confirms it preserves backend authorization/session requirements.
- **Impact:** Blocks production authentication.

### DECISION REQUIRED — Payment provider and business policy

- **Decision:** Gateway, supported methods, refunds/cancellations, partial/final payment policy, reconciliation owner.
- **Why required:** Money, booking creation and finance cannot be trusted without it.
- **Recommended option:** India-focused gateway with signed webhooks, idempotency, sandbox, settlement reports and UPI/cards/net banking.
- **Alternative:** Manual transfers remain an internal pilot-only workflow with explicit limits.
- **Impact:** Blocks paid production bookings.

### DECISION REQUIRED — Storage, communications, maps and observability

- **Decision:** Private object storage/CDN, push, email, maps/location, analytics, monitoring and crash providers.
- **Why required:** Documents/media, notifications, privacy disclosures and production operations depend on final providers.
- **Recommended option:** Minimize vendors and personal-data sharing; require Indian data/legal review, scoped credentials, export, retention and sandbox support.
- **Alternative:** Defer non-essential analytics/maps while completing core storage/push/monitoring.
- **Impact:** Blocks document/event operations and production support.

### DECISION REQUIRED — Legal and store policy

- **Decision:** Privacy policy, terms, cancellation/refund, location consent, retention/deletion, support contact, store account owner.
- **Why required:** Play/App Store declarations and real user data processing require it.
- **Recommended option:** Engage Indian counsel using the final data/provider inventory.
- **Alternative:** Closed internal pilot with no public users while documents are finalized.
- **Impact:** Blocks store submission/public launch.

## 18. Definitive execution order and gate

```text
PHASE 0  Stabilization
PHASE 1  Customer
PHASE 2  Vendor
PHASE 3  Worker
PHASE 4  CRM
PHASE 5  ERP
PHASE 6  Employee Mobile
PHASE 7  Cross-module integration
PHASE 8  External integrations
PHASE 9  Security hardening
PHASE 10 Production infrastructure
PHASE 11 Android release
PHASE 12 iOS release
```

No phase begins until the preceding gate is verified and recorded. The current phase is **Phase 0 — Stabilization**. **STAB-01** through **STAB-07** are complete. The next execution block is **STAB-08 — ERP tests**. Do not start STAB-08 in the STAB-07 session.

## 19. Definition of complete

Mee Events is complete only after every product surface uses real authorized data; Customer, Vendor, Worker, CRM, ERP and separate Employee Mobile journeys pass integration and E2E; database migrations/backups/restore are proven; real OTP/payment/storage/PDF/notifications are live and monitored; critical/high security findings are closed or formally accepted; staging/production deployment/rollback/alerts are tested; signed Android and iOS store releases are approved; and documentation matches the running system.

---

**Audit conclusion:** Preserve the existing architecture and working foundations. Do not restart the project. First stabilize security, repository governance, live database proof and test boundaries; then finish exactly one product module at a time.
