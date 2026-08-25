# Mee Events — Progress Tracker

- **Updated:** 25 August 2026 19:08 IST (Asia/Kolkata, +0530)
- **Repository:** `/Users/vinaychilagani/Desktop/Mee Event V1`
- **Baseline application commit:** `master` / `9e2a442d91c137ec97a349d1a55697ae8d79d5df`
- **STAB-01 snapshot HEAD:** `ca994985a898d42da2a8d717041b93a8f8f0dc4c`
- **Current phase:** Phase 0 — Stabilization
- **Phase gate:** **NOT PASSED**
- **Last completed task:** STAB-01 — Repository snapshot
- **Current task:** None — STAB-01 closed as instructed
- **Next task:** STAB-02 — Environment verification
- **Latest application commit:** `9e2a442d91c137ec97a349d1a55697ae8d79d5df` (unchanged; no application files in STAB-01)
- **STAB-01 documentation commit:** This tracker is part of the documentation-only STAB-01 commit; use Git history for its hash.

## Status key

```text
[ ] Not started
[~] In progress
[x] Completed
[!] Blocked
[✗] Failed
```

## Audit package completed in this session

- [x] **AUDIT-01** Repository/Git/toolchain/environment inventory.
- [x] **AUDIT-02** Architecture, implementation, database, product, security, test, CI, deployment, design and documentation comparison.
- [x] **AUDIT-03** Proportional local verification and dependency security audit.
- [x] **AUDIT-04** Complete audit, completion scorecard and Master TODO.
- [x] **AUDIT-05** Founder-friendly step-by-step PDF and progress tracker.

These audit tasks do not count as STAB-01. No Phase 0 implementation block was completed before STAB-01.

## STAB-01 — Repository snapshot

- [x] **STAB-01** Repository snapshot — completed 25 August 2026 19:08 IST (Asia/Kolkata). Read-only inspection only. Next: STAB-02.

### Snapshot evidence

| Field | Evidence |
| ----- | -------- |
| Date / timezone | 25 August 2026 19:08:30 IST (`Asia/Kolkata`, `+0530`) |
| Repository path | `/Users/vinaychilagani/Desktop/Mee Event V1` |
| Current branch | `master` |
| Snapshot commit | `ca994985a898d42da2a8d717041b93a8f8f0dc4c` (`ca99498`) — `docs(roadmap): add complete project audit and founder guide` |
| Upstream | `origin/master` at `9e2a442d91c137ec97a349d1a55697ae8d79d5df` |
| Ahead / behind | Ahead **1**, behind **0** (audit documentation commit is local-only; not pushed) |
| Remote | `origin` → `https://github.com/mee-events/Mee-Events.git` (fetch and push; no credentials in URL) |
| Remote default branch | GitHub advertised HEAD is **`master`**. Local `refs/remotes/origin/HEAD` still stale-points at `origin/main`. `origin/main` is a stale remote-tracking branch at `d37a91e` (Initial commit). |
| Working tree | **Clean.** No staged, modified, or untracked tracked-path files. Unrelated user changes: **none**. |
| Ignored local state | Present and ignored: local env files (values not inspected), `node_modules/`, build/dist/`.next`/`.dart_tool`, editor/OS junk, Flutter generated native files. See ignored-file list below. |
| Recent commits | `ca99498` docs audit package (2026-08-25); `9e2a442` docs(github) (2026-08-24); `c6d798c` track native projects; `fceee78` CI contracts/mobile env; `a117baa` workspace checkpoint; `f0bbf7f` remove dubbed customer surfaces; `713b563` agent context controls; `afd0a5a` backend foundation v1.0 |
| Local branches | `master` only |
| Remote-tracking branches | `origin/master` (active), `origin/main` (stale), `origin/HEAD` → `origin/main` (stale local symbolic-ref) |
| Node | `v20.20.2` at `/opt/homebrew/bin/node`; engines require `>=20.11.0` |
| pnpm | `9.15.4` via Corepack; `packageManager` is `pnpm@9.15.4`; engines `>=9.0.0` |
| Flutter | `3.44.8` stable (`058e0af2c2`, 23 July 2026); matches CI pin `3.44.8`. CLI prints an available-upgrade banner; version was **not** upgraded. |
| Dart | `3.12.2` (stable); Flutter SDK constraint `^3.12.2` |
| Package manager config | Root `package.json` private workspace `me-event-platform@0.1.0`; `pnpm-workspace.yaml` covers `apps/backend`, `apps/erp-web`, `packages/*` (Flutter excluded); `.npmrc`: `engine-strict=true`, `frozen-lockfile=false`, `save-exact=true`. No `.nvmrc` / `.node-version` / `.tool-versions`. |
| Backend manifest | `apps/backend/package.json` — `@me-event/backend@0.1.0`; Nest `11.0.1`; Vitest `2.1.8`; scripts `build`, `dev`, `start`, `lint`, `test`, `typecheck` |
| ERP manifest | `apps/erp-web/package.json` — `@me-event/erp-web@0.1.0`; Next `15.1.3`; React `19.2.3`; Vitest `2.1.8`; scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test` |
| Flutter manifest | `apps/mobile/pubspec.yaml` — `mee_events` `1.0.0+1`; `publish_to: none`; SDK `^3.12.2` |
| Shared packages | `@me-event/api-contracts@0.1.0`, `@me-event/shared-types@0.1.0`; lint/typecheck/build; **no test scripts** |
| Environment templates (keys only) | Backend example: `APP_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`, `OTP_PROVIDER`, `OTP_HMAC_SECRET`, `JWT_ACCESS_SECRET`, `REFRESH_TOKEN_HMAC_SECRET`, `ALLOWED_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Staging/production examples add `SMS_OTP_ENDPOINT`, `SMS_OTP_API_KEY` and omit the Supabase keys. ERP examples: `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_API_BASE_URL`. Mobile example: `API_BASE_URL`, `BRANCH_CODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. |
| Local env presence (no values) | Present ignored: `apps/backend/.env`, `apps/erp-web/.env.local`, `apps/mobile/.env`. Absent: root `.env`, backend/erp/mobile staging/production env files, `apps/erp-web/.env`. |
| CI | `.github/workflows/ci.yml` only. Triggers: `pull_request` and `push` to `master`/`main`. Jobs: TypeScript verify (pnpm `9.15.4`, Node `20`), Flutter format/analyze/test/dev debug APK (Flutter `3.44.8`), Dependency Review on PRs only. Also: issue/PR templates. |
| PostgreSQL migrations | 20 ordered files `0001`–`0020` under `infrastructure/postgres/migrations/`. Seeds: `dev-employee.sql`, `dev-inventory.sql`, `dev-manager.sql`, `dev-vendor.sql`, `dev-worker.sql`, plus `catalog-taxonomy-v3.meta.json`. Compose: PostgreSQL `17.2-alpine`, Redis `7.4.1-alpine`. |
| Test/build commands | Root: `format`, `format:check`, `lint`, `typecheck`, `test`, `build`, `verify`, `db:up`, `db:migrate`, `db:status`, `db:seed:dev`, `dev:backend`, `dev:erp`, `dev:mobile*`. Flutter (CI/local): `flutter pub get`, `dart format`, `flutter analyze --fatal-infos`, `flutter test`, `flutter build apk --debug --flavor dev`. |
| Current roadmap files | `docs/roadmap/MEE_EVENTS_COMPLETE_PROJECT_AUDIT.md`, `MEE_EVENTS_MASTER_TODO.md`, `MEE_EVENTS_PROGRESS.md`, `MEE_EVENTS_MASTER_BUILD_ROADMAP.md`, `MEE_EVENTS_STEP_BY_STEP_MASTER_GUIDE.pdf` |
| lean-ctx | Not on `PATH` in this environment. Native read/search/command tools used. |

### Ignored-file inventory (paths only)

`.DS_Store`, `.cursor/debug-*.log`, `.idea/`, `.pnpm-store/`, `apps/.DS_Store`, `apps/backend/.DS_Store`, `apps/backend/.env`, `apps/backend/dist/`, `apps/backend/node_modules/`, `apps/erp-web/.env.local`, `apps/erp-web/.next/`, `apps/erp-web/node_modules/`, `apps/erp-web/tsconfig.tsbuildinfo`, `apps/mobile/.DS_Store`, `apps/mobile/.dart_tool/`, `apps/mobile/.env`, `apps/mobile/.flutter-plugins-dependencies`, `apps/mobile/.idea/`, `apps/mobile/android/.gradle/`, `apps/mobile/android/app/src/main/java/`, `apps/mobile/android/local.properties`, `apps/mobile/android/mee_events_android.iml`, `apps/mobile/build/`, `apps/mobile/flutter_web.log`, `apps/mobile/ios/Flutter/Generated.xcconfig`, `apps/mobile/ios/Flutter/ephemeral/`, `apps/mobile/ios/Flutter/flutter_export_environment.sh`, `apps/mobile/ios/Runner/GeneratedPluginRegistrant.*`, `apps/mobile/macos/Flutter/ephemeral/`, `apps/mobile/mee_events.iml`, artifact/docs/packages `.DS_Store` files, `design/stitch-screens/pw-out.log`, `node_modules/`, `output/`, package `dist/`/`node_modules/`, `tmp/`.

### Known warnings recorded in STAB-01

1. Local `origin/HEAD` still points at stale `origin/main` even though GitHub default is `master`.
2. `origin/main` is stale and should be pruned in a later governance task (not STAB-01).
3. `core.fsmonitor=true`; Cursor sandbox `git status` emitted `fsmonitor_ipc__send_query` IPC errors and false `ios/`/`android/` permission warnings. Unsandboxed `git status` was clean with no fsmonitor error.
4. Flutter CLI reports a newer version is available; local/CI pin remains `3.44.8`.
5. `master` is ahead of `origin/master` by the unpushed 25 August audit documentation commit.
6. No `.nvmrc` / `.node-version` / `.tool-versions`; CI uses Node `20` (floating minor) while this machine is `v20.20.2`.

### Drift versus the 25 August 2026 audit

- Application tree is unchanged from `9e2a442`. HEAD moved only by the audit documentation commit `ca99498`.
- Remote default branch is **`master`**, not obsolete `main`. The remaining defect is a **local stale `origin/HEAD`** symbolic-ref plus a stale `origin/main` tracking branch.
- Toolchain versions, workspace layout, 20 migrations, CI workflow, and env-template key names match the audit.
- lean-ctx remains absent from `PATH`.

No new release blockers. Existing blockers in this tracker remain in force.

## Latest verification

| Verification                 | Result                          | Evidence summary                                                               |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| STAB-01 Git snapshot         | **PASS**                        | Clean `master` at `ca99498`; upstream `origin/master` at `9e2a442`; ahead 1    |
| STAB-01 remote default       | **PASS with local drift**       | GitHub HEAD is `master`; local `origin/HEAD` still stale-points at `main`      |
| STAB-01 secrets              | **PASS**                        | Env values not read; only template key names and ignored-file presence         |
| STAB-01 application tree     | **PASS**                        | No application file changes versus `9e2a442`                                   |
| Git start state (audit)      | **PASS**                        | Clean `master` worktree at audited baseline; local `origin/HEAD` still stale   |
| Node / pnpm                  | **PASS**                        | Node `20.20.2`; pnpm `9.15.4`                                                  |
| Flutter / Dart               | **PASS**                        | Flutter `3.44.8`; Dart `3.12.2`                                                |
| Root TypeScript verification | **PASS**                        | format, lint, typecheck, tests, backend build, ERP build                       |
| Backend tests                | **PASS**                        | 173/173 across 30 files                                                        |
| ERP tests                    | **PASS but weak**               | 2/2 across 2 files                                                             |
| Flutter format               | **PASS**                        | 199 files unchanged                                                            |
| Flutter analysis             | **PASS**                        | no issues with fatal infos                                                     |
| Flutter tests                | **PASS**                        | 435/435                                                                        |
| Android dev debug build      | **PASS**                        | APK compiled                                                                   |
| Android prod release compile | **COMPILE PASS / RELEASE FAIL** | 69.1 MB APK; no INTERNET permission; Android Debug certificate                 |
| iOS unsigned release build   | **FAIL**                        | `Application not configured for iOS`                                           |
| Dependency audit             | **FAIL**                        | 74 total: 4 critical, 29 high, 31 moderate, 10 low                             |
| PostgreSQL integration       | **NOT VERIFIED / BLOCKED**      | Docker daemon unavailable; no in-repo integration suite                        |
| Browser/device E2E           | **MISSING**                     | No framework/suite                                                             |

## Known release blockers

1. Critical/high dependency advisories.
2. Employee branch/resource IDOR/BOLA gaps.
3. OTP consume/session atomicity and unstable mobile device ID.
4. Outbox crash recovery and application idempotency are incomplete.
5. ERP Lead Inbox is fixture-backed; employee bootstrap/capability routing is incomplete.
6. Real OTP, payment, private storage, PDF, push/email, maps, monitoring and crash integrations are absent.
7. Live database, HTTP integration, cross-module, browser/device E2E and security suites are missing.
8. Staging/production infrastructure, secrets, backups/restore, observability, CD and rollback are absent.
9. Android production artifact lacks network permission and uses debug signing.
10. iOS is not configured for a Flutter release build and has no signing/TestFlight setup.

## Founder decisions

Do not ask for these until their dependent block is approaching, unless early procurement lead time requires it.

- [!] Production hosting and managed PostgreSQL/storage topology.
- [!] India-compliant SMS/OTP provider and sender/DLT ownership.
- [!] Payment gateway plus advance/final/refund/cancellation/reconciliation policies.
- [!] Object storage/CDN, push, email, maps/location, analytics, monitoring and crash providers.
- [!] Privacy/terms/refund/location/retention wording and legal review.
- [!] Company Play Console and Apple Developer/App Store Connect ownership/roles.
- [!] Android upload/signing key custody and iOS certificate/profile custody.
- [!] Final Customer navigation decision is already directed by this roadmap: Home, Explore, Enquire, Plan, Profile; confirm only if business intent changes.

## Phase 0 — Stabilization

- [x] STAB-01 Repository snapshot
- [ ] STAB-02 Environment verification
- [ ] STAB-03 Dependency verification
- [ ] STAB-04 Formatting
- [ ] STAB-05 Lint
- [ ] STAB-06 TypeScript typecheck
- [ ] STAB-07 Backend tests
- [ ] STAB-08 ERP tests
- [ ] STAB-09 Flutter analysis
- [ ] STAB-10 Flutter tests
- [ ] STAB-11 Backend build
- [ ] STAB-12 ERP build
- [ ] STAB-13 Flutter build
- [ ] STAB-14 PostgreSQL migration verification
- [ ] STAB-15 Database integration tests
- [ ] STAB-16 CI verification
- [ ] STAB-17 E2E test foundation
- [ ] STAB-18 Documentation reconciliation
- [ ] STAB-19 Repository cleanup
- [ ] STAB-20 Security baseline

### Phase 0 security packages

- [ ] SEC-01 Dependency remediation
- [ ] SEC-02 Branch and BOLA closure
- [ ] SEC-03 Authentication atomicity and session control
- [ ] SEC-04 Outbox and idempotency reliability
- [ ] SEC-05 Web/API hardening
- [ ] SEC-06 Mobile fail-closed and boundary cleanup

## Phase 1 — Customer

- [ ] CUST-01 Authentication
- [ ] CUST-02 OTP
- [ ] CUST-03 Session
- [ ] CUST-04 Customer bootstrap
- [ ] CUST-05 Home
- [ ] CUST-06 Explore
- [ ] CUST-07 Event categories
- [ ] CUST-08 Services
- [ ] CUST-09 Search
- [ ] CUST-10 Favorites
- [ ] CUST-11 Enquiry creation
- [ ] CUST-12 Enquiry editing
- [ ] CUST-13 Enquiry tracking
- [ ] CUST-14 Quotation
- [ ] CUST-15 Quotation approval
- [ ] CUST-16 Advance payment
- [ ] CUST-17 Booking
- [ ] CUST-18 Event workspace
- [ ] CUST-19 Plan
- [ ] CUST-20 Profile
- [ ] CUST-21 Notifications
- [ ] CUST-22 Documents
- [ ] CUST-23 Feedback
- [ ] CUST-24 Error states
- [ ] CUST-25 Empty states
- [ ] CUST-26 Offline states
- [ ] CUST-27 Security
- [ ] CUST-28 Customer integration tests
- [ ] CUST-29 Customer E2E

## Phase 2 — Vendor

- [ ] VEND-01 Authentication
- [ ] VEND-02 Profile
- [ ] VEND-03 Business onboarding
- [ ] VEND-04 Vendor verification
- [ ] VEND-05 Services
- [ ] VEND-06 Products
- [ ] VEND-07 Pricing
- [ ] VEND-08 Availability
- [ ] VEND-09 Assignment inbox
- [ ] VEND-10 Assignment details
- [ ] VEND-11 Accept assignment
- [ ] VEND-12 Reject assignment
- [ ] VEND-13 Event details
- [ ] VEND-14 Vendor tasks
- [ ] VEND-15 Progress
- [ ] VEND-16 Completion
- [ ] VEND-17 Documents
- [ ] VEND-18 Notifications
- [ ] VEND-19 Settlement visibility
- [ ] VEND-20 Security
- [ ] VEND-21 Integration tests
- [ ] VEND-22 E2E

## Phase 3 — Worker

- [ ] WORK-01 Authentication
- [ ] WORK-02 Profile
- [ ] WORK-03 Availability
- [ ] WORK-04 Assigned work
- [ ] WORK-05 Work details
- [ ] WORK-06 Attendance
- [ ] WORK-07 Task start
- [ ] WORK-08 Task progress
- [ ] WORK-09 Task completion
- [ ] WORK-10 Event location
- [ ] WORK-11 Location/privacy
- [ ] WORK-12 Notifications
- [ ] WORK-13 Documents
- [ ] WORK-14 Security
- [ ] WORK-15 Integration tests
- [ ] WORK-16 E2E

## Phase 4 — CRM

- [ ] CRM-01 Employee authentication
- [ ] CRM-02 Employee session
- [ ] CRM-03 Capability enforcement
- [ ] CRM-04 Dashboard live data
- [ ] CRM-05 My Work
- [ ] CRM-06 Lead inbox
- [ ] CRM-07 Lead creation
- [ ] CRM-08 Lead assignment
- [ ] CRM-09 Follow-up queue
- [ ] CRM-10 Customer 360
- [ ] CRM-11 Enquiry management
- [ ] CRM-12 Quotation management
- [ ] CRM-13 Approval tracking
- [ ] CRM-14 Booking handoff
- [ ] CRM-15 Event Record visibility
- [ ] CRM-16 Communication history
- [ ] CRM-17 Team workload
- [ ] CRM-18 Reports
- [ ] CRM-19 Search
- [ ] CRM-20 Filtering
- [ ] CRM-21 Pagination
- [ ] CRM-22 Notifications
- [ ] CRM-23 Audit visibility
- [ ] CRM-24 Security
- [ ] CRM-25 Integration tests
- [ ] CRM-26 Browser E2E

## Phase 5 — ERP

- [ ] ERP-01 Operations dashboard
- [ ] ERP-02 Event operations
- [ ] ERP-03 Task management
- [ ] ERP-04 Manager assignments
- [ ] ERP-05 Vendor management
- [ ] ERP-06 Worker management
- [ ] ERP-07 Inventory
- [ ] ERP-08 Warehouse
- [ ] ERP-09 Stock movement
- [ ] ERP-10 Procurement — ADR required before implementation
- [ ] ERP-11 Purchase orders
- [ ] ERP-12 Goods receipt
- [ ] ERP-13 Finance
- [ ] ERP-14 Payment reconciliation
- [ ] ERP-15 Vendor settlements
- [ ] ERP-16 Approval inbox
- [ ] ERP-17 Employee administration
- [ ] ERP-18 Reporting
- [ ] ERP-19 Audit
- [ ] ERP-20 Security
- [ ] ERP-21 Integration tests
- [ ] ERP-22 Browser E2E

## Phase 6 — Employee Mobile

- [ ] EMP-01 Employee Mobile ADR
- [ ] EMP-02 Project setup
- [ ] EMP-03 Employee authentication
- [ ] EMP-04 Employee bootstrap
- [ ] EMP-05 Role/capability handling
- [ ] EMP-06 My Work
- [ ] EMP-07 Tasks
- [ ] EMP-08 Event operations
- [ ] EMP-09 Vendor/worker coordination
- [ ] EMP-10 Approvals
- [ ] EMP-11 Notifications
- [ ] EMP-12 Attendance if required
- [ ] EMP-13 Offline mode
- [ ] EMP-14 Secure storage
- [ ] EMP-15 E2E

## Phase 7 — Cross-module integration

- [ ] XMOD-01 Connected lifecycle happy path
- [ ] XMOD-02 Failure and recovery matrix
- [ ] XMOD-03 Concurrency and idempotency

## Phase 8 — External integrations

- [ ] INT-01 Production OTP/SMS
- [ ] INT-02 Payment gateway
- [ ] INT-03 Private storage
- [ ] INT-04 PDF generation
- [ ] INT-05 Push notifications
- [ ] INT-06 Email
- [ ] INT-07 Maps and privacy-safe location
- [ ] INT-08 Analytics and crash reporting

## Phase 9 — Security hardening

- [ ] SEC-PROD-01 Final security audit

## Phase 10 — Production infrastructure

- [ ] PROD-01 Production topology and IaC
- [ ] PROD-02 Secrets and access governance
- [ ] PROD-03 Database migration, backup and restore
- [ ] PROD-04 Deployment and rollback
- [ ] PROD-05 Observability and incident response
- [ ] PROD-06 Production readiness review

## Phase 11 — Android release

- [ ] ANDROID-01 App ID
- [ ] ANDROID-02 Package name
- [ ] ANDROID-03 Branding
- [ ] ANDROID-04 Signing
- [ ] ANDROID-05 Keystore
- [ ] ANDROID-06 Production environment
- [ ] ANDROID-07 Production API
- [ ] ANDROID-08 Release build
- [ ] ANDROID-09 Internal testing
- [ ] ANDROID-10 Closed testing
- [ ] ANDROID-11 Privacy policy
- [ ] ANDROID-12 Store listing
- [ ] ANDROID-13 Permissions
- [ ] ANDROID-14 Data safety
- [ ] ANDROID-15 Production rollout

## Phase 12 — iOS release

- [ ] IOS-01 Bundle ID
- [ ] IOS-02 Apple Developer configuration
- [ ] IOS-03 Certificates
- [ ] IOS-04 Provisioning
- [ ] IOS-05 Production environment
- [ ] IOS-06 Release build
- [ ] IOS-07 TestFlight
- [ ] IOS-08 Privacy
- [ ] IOS-09 Store listing
- [ ] IOS-10 Production release

## Cross-cutting polish after core gates

- [ ] POLISH-01 Accessibility
- [ ] POLISH-02 Performance and capacity
- [ ] POLISH-03 Data retention and rights
- [ ] POLISH-04 License, SBOM and provenance
- [ ] POLISH-05 Support and runbooks
- [ ] POLISH-06 Final launch checklist

## Founder session rule

1. Open the founder PDF and this tracker.
2. Select only the first unchecked task whose dependencies are complete.
3. Ask Codex to execute only that task.
4. Review changed files, tests, security evidence and Git diff.
5. Commit one scoped change.
6. Mark the task complete with date/evidence/commit.
7. Stop. Start the next task in a new session.
