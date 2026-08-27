# Mee Events — Progress Tracker

- **Updated:** 27 August 2026; STAB-18 DONE WITH FINDINGS (canonical docs reconciled; historical PDFs labeled)
- **Repository:** `/Users/vinaychilagani/Desktop/Mee Event V1`
- **Baseline application commit:** `master` / `9e2a442d91c137ec97a349d1a55697ae8d79d5df`
- **STAB-01 snapshot HEAD:** `ca994985a898d42da2a8d717041b93a8f8f0dc4c`
- **Current phase:** Phase 0 — Stabilization
- **Phase gate:** **NOT PASSED**
- **Last completed task:** STAB-18 — DONE WITH FINDINGS
- **Current task:** none — awaiting STAB-19
- **Next task:** STAB-19 Repository cleanup (**NOT STARTED**)
- **Latest application change:** STAB-15 now coordinates refresh rotation through the existing PostgreSQL session row across two service/repository/pool instances while preserving sequential reuse revocation; use Git history for commit hashes.
- **STAB-16 implementation commit:** `999443d5d3ba547de1bb6c0406c34753c8433b00`
- **STAB-16 closeout:** `1450263caa6a5be2263bf7b9c91827f7cc24ef6c`
- **STAB-17 commit:** `68894f3bbfa91937a0c7c573a8fc1a0af83ce533`
- **STAB-18 commit:** this documentation commit on `master`

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

| Field                             | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date / timezone                   | 25 August 2026 19:08:30 IST (`Asia/Kolkata`, `+0530`)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Repository path                   | `/Users/vinaychilagani/Desktop/Mee Event V1`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Current branch                    | `master`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Snapshot commit                   | `ca994985a898d42da2a8d717041b93a8f8f0dc4c` (`ca99498`) — `docs(roadmap): add complete project audit and founder guide`                                                                                                                                                                                                                                                                                                                                                  |
| Upstream                          | `origin/master` at `9e2a442d91c137ec97a349d1a55697ae8d79d5df`                                                                                                                                                                                                                                                                                                                                                                                                           |
| Ahead / behind                    | Ahead **1**, behind **0** (audit documentation commit is local-only; not pushed)                                                                                                                                                                                                                                                                                                                                                                                        |
| Remote                            | `origin` → `https://github.com/mee-events/Mee-Events.git` (fetch and push; no credentials in URL)                                                                                                                                                                                                                                                                                                                                                                       |
| Remote default branch             | GitHub advertised HEAD is **`master`**. Local `refs/remotes/origin/HEAD` still stale-points at `origin/main`. `origin/main` is a stale remote-tracking branch at `d37a91e` (Initial commit).                                                                                                                                                                                                                                                                            |
| Working tree                      | **Clean.** No staged, modified, or untracked tracked-path files. Unrelated user changes: **none**.                                                                                                                                                                                                                                                                                                                                                                      |
| Ignored local state               | Present and ignored: local env files (values not inspected), `node_modules/`, build/dist/`.next`/`.dart_tool`, editor/OS junk, Flutter generated native files. See ignored-file list below.                                                                                                                                                                                                                                                                             |
| Recent commits                    | `ca99498` docs audit package (2026-08-25); `9e2a442` docs(github) (2026-08-24); `c6d798c` track native projects; `fceee78` CI contracts/mobile env; `a117baa` workspace checkpoint; `f0bbf7f` remove dubbed customer surfaces; `713b563` agent context controls; `afd0a5a` backend foundation v1.0                                                                                                                                                                      |
| Local branches                    | `master` only                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Remote-tracking branches          | `origin/master` (active), `origin/main` (stale), `origin/HEAD` → `origin/main` (stale local symbolic-ref)                                                                                                                                                                                                                                                                                                                                                               |
| Node                              | `v20.20.2` at `/opt/homebrew/bin/node`; engines require `>=20.11.0`                                                                                                                                                                                                                                                                                                                                                                                                     |
| pnpm                              | `9.15.4` via Corepack; `packageManager` is `pnpm@9.15.4`; engines `>=9.0.0`                                                                                                                                                                                                                                                                                                                                                                                             |
| Flutter                           | `3.44.8` stable (`058e0af2c2`, 23 July 2026); matches CI pin `3.44.8`. CLI prints an available-upgrade banner; version was **not** upgraded.                                                                                                                                                                                                                                                                                                                            |
| Dart                              | `3.12.2` (stable); Flutter SDK constraint `^3.12.2`                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Package manager config            | Root `package.json` private workspace `me-event-platform@0.1.0`; `pnpm-workspace.yaml` covers `apps/backend`, `apps/erp-web`, `packages/*` (Flutter excluded); `.npmrc`: `engine-strict=true`, `frozen-lockfile=false`, `save-exact=true`. No `.nvmrc` / `.node-version` / `.tool-versions`.                                                                                                                                                                            |
| Backend manifest                  | `apps/backend/package.json` — `@me-event/backend@0.1.0`; Nest `11.0.1`; Vitest `2.1.8`; scripts `build`, `dev`, `start`, `lint`, `test`, `typecheck`                                                                                                                                                                                                                                                                                                                    |
| ERP manifest                      | `apps/erp-web/package.json` — `@me-event/erp-web@0.1.0`; Next `15.1.3`; React `19.2.3`; Vitest `2.1.8`; scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`                                                                                                                                                                                                                                                                                                    |
| Flutter manifest                  | `apps/mobile/pubspec.yaml` — `mee_events` `1.0.0+1`; `publish_to: none`; SDK `^3.12.2`                                                                                                                                                                                                                                                                                                                                                                                  |
| Shared packages                   | `@me-event/api-contracts@0.1.0`, `@me-event/shared-types@0.1.0`; lint/typecheck/build; **no test scripts**                                                                                                                                                                                                                                                                                                                                                              |
| Environment templates (keys only) | Backend example: `APP_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`, `OTP_PROVIDER`, `OTP_HMAC_SECRET`, `JWT_ACCESS_SECRET`, `REFRESH_TOKEN_HMAC_SECRET`, `ALLOWED_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Staging/production examples add `SMS_OTP_ENDPOINT`, `SMS_OTP_API_KEY` and omit the Supabase keys. ERP examples: `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_API_BASE_URL`. Mobile example: `API_BASE_URL`, `BRANCH_CODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. |
| Local env presence (no values)    | Present ignored: `apps/backend/.env`, `apps/erp-web/.env.local`, `apps/mobile/.env`. Absent: root `.env`, backend/erp/mobile staging/production env files, `apps/erp-web/.env`.                                                                                                                                                                                                                                                                                         |
| CI                                | `.github/workflows/ci.yml` only. Triggers: `pull_request` and `push` to `master`/`main`. Jobs: TypeScript verify (pnpm `9.15.4`, Node `20`), Flutter format/analyze/test/dev debug APK (Flutter `3.44.8`), Dependency Review on PRs only. Also: issue/PR templates.                                                                                                                                                                                                     |
| PostgreSQL migrations             | 20 ordered files `0001`–`0020` under `infrastructure/postgres/migrations/`. Seeds: `dev-employee.sql`, `dev-inventory.sql`, `dev-manager.sql`, `dev-vendor.sql`, `dev-worker.sql`, plus `catalog-taxonomy-v3.meta.json`. Compose: PostgreSQL `17.2-alpine`, Redis `7.4.1-alpine`.                                                                                                                                                                                       |
| Test/build commands               | Root: `format`, `format:check`, `lint`, `typecheck`, `test`, `build`, `verify`, `db:up`, `db:migrate`, `db:status`, `db:seed:dev`, `dev:backend`, `dev:erp`, `dev:mobile*`. Flutter (CI/local): `flutter pub get`, `dart format`, `flutter analyze --fatal-infos`, `flutter test`, `flutter build apk --debug --flavor dev`.                                                                                                                                            |
| Current roadmap files             | `docs/roadmap/MEE_EVENTS_COMPLETE_PROJECT_AUDIT.md`, `MEE_EVENTS_MASTER_TODO.md`, `MEE_EVENTS_PROGRESS.md`, `MEE_EVENTS_MASTER_BUILD_ROADMAP.md`, `MEE_EVENTS_STEP_BY_STEP_MASTER_GUIDE.pdf`                                                                                                                                                                                                                                                                            |
| lean-ctx                          | Not on `PATH` in this environment. Native read/search/command tools used.                                                                                                                                                                                                                                                                                                                                                                                               |

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

## STAB-02 — Environment verification

- [x] **STAB-02** Environment verification — completed 25 August 2026 (IST). Next: STAB-03.

Canonical matrix: `docs/07-deployment/environment.md`.

| Surface | Contract result                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend | Zod boot validation covers required secrets, forbids local OTP in staging/production, requires SMS keys when `OTP_PROVIDER=external`, rejects placeholder secrets and unsafe production CORS |
| ERP     | Canonical public reader; staging/production require https non-loopback `NEXT_PUBLIC_API_BASE_URL`                                                                                            |
| Mobile  | Release builds reject loopback/emulator API fallbacks; `.env` remains a public asset; `APP_ENV` dart-define is unused                                                                        |
| CI      | No backend secrets injected; Flutter copies `.env.example` and dart-defines emulator API URL for debug APK only                                                                              |

Local env files remain ignored and untracked. Values were not read. No provider keys were invented.

### STAB-02 tests

Targeted backend, ERP, and Flutter environment tests with synthetic placeholders only.
Backend suite 188/188 (was 173; environment spec now 17 cases). ERP 8/8 (was 2; plus 6 environment cases). Flutter `environment_test.dart` 6/6.

## STAB-03 — Dependency verification

- [x] **STAB-03** Dependency verification — completed 25 August 2026 (IST). Next: STAB-04. Do not start STAB-04 in this block.

Canonical register: `docs/05-security/dependency-security.md`.

| Surface                | Result                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Fresh `pnpm audit`     | Initial 4 critical / 29 high / 31 moderate / 10 low. Production-only 2 / 19 / 26 / 7                                  |
| Remediation            | Next 15.5.23, Vitest 3.2.7, Nest 11.2.x + swagger 11.4.7, documented exact `pnpm.overrides` for remaining transitives |
| Final `pnpm audit`     | 0 critical / 0 high / 0 moderate / 2 low. Production-only 0 / 0 / 0 / 1                                               |
| Flutter/Dart           | No critical/high. OSV 0 findings on 123 hosted lockfile packages. No pubspec changes                                  |
| Accepted critical/high | **None**                                                                                                              |
| Compatibility verify   | Frozen install, format, lint, typecheck, backend 188/188, ERP 8/8, shared/backend/ERP production builds PASS          |

Phase 0 gate remains **NOT PASSED**. STAB-11/12/13 are not closed by these compatibility builds.

## STAB-04 — Formatting

- [x] **STAB-04** Formatting — completed 25 August 2026 22:22 IST. Next: STAB-05. Do not start STAB-05 in this block.

Independent re-verification after STAB-03. No application files were rewritten. No formatter versions were upgraded. No `.prettierrc` was invented; Prettier 3.4.2 defaults plus `.editorconfig` are the deliberate config.

| Field              | Evidence                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root formatter     | Prettier `3.4.2` via `corepack pnpm exec prettier` / `pnpm format:check` (`prettier --check .`)                                                                                                                                                                                                              |
| Prettier config    | No `.prettierrc*`. Prettier 3 reads `.editorconfig` (charset utf-8, lf, 2-space indent, final newline, trim trailing whitespace). Dart indent 2.                                                                                                                                                             |
| Root scope         | Tracked files with a Prettier parser, minus `.prettierignore`. Counted 372 files: TypeScript 229, Markdown 111, JSON/json-stringify 15, YAML 10, babel 5, HTML 1, CSS 1. Includes backend/ERP/packages, GitHub workflow YAML, maintained docs, `pnpm-lock.yaml`, Flutter `web/index.html` + `manifest.json`. |
| Dart formatter     | `dart format` from Dart SDK `3.12.2` (Flutter `3.44.8`)                                                                                                                                                                                                                                                      |
| Dart scope         | `apps/mobile/lib` and `apps/mobile/test` — **200** tracked `.dart` files. No `integration_test/`, `tool/`, or other maintained Dart trees. CI uses the same `lib test` paths.                                                                                                                                |
| Editor / CI        | No committed `.vscode/settings.json`. CI: `pnpm format:check` and `dart format --output=none --set-exit-if-changed lib test`.                                                                                                                                                                                |
| Root check         | **PASS** — `corepack pnpm format:check`                                                                                                                                                                                                                                                                      |
| Dart check         | **PASS** — `dart format --output=none --set-exit-if-changed lib test` (200 files, 0 changed)                                                                                                                                                                                                                 |
| Files formatted    | **None** (no drift)                                                                                                                                                                                                                                                                                          |
| `git diff --check` | **PASS**                                                                                                                                                                                                                                                                                                     |
| Secrets            | Real `.env` / `.env.local` remain gitignored, untracked, unread. Tracked files are `*.example` only. No `prettier-ignore` directives in owned source.                                                                                                                                                        |

### `.prettierignore` classifications

| Pattern                    | Classification                      | Tracked files                        | Reason                                                                                                        | Result                                                           |
| -------------------------- | ----------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `node_modules/**`          | GENERATED                           | 0 (gitignored)                       | Package install tree                                                                                          | Justified                                                        |
| `**/dist/**`               | GENERATED                           | 0 (gitignored)                       | TypeScript build output                                                                                       | Justified                                                        |
| `**/.next/**`              | GENERATED                           | 0 (gitignored)                       | Next.js build cache                                                                                           | Justified                                                        |
| `**/.expo/**`              | GENERATED (preventive)              | 0; directory absent                  | Expo cache; no Expo app in workspace                                                                          | Justified preventive                                             |
| `apps/mobile/android/**`   | ACTIVE native (not Prettier source) | 22                                   | Kotlin/Gradle/XML/PNG. Prettier is the wrong tool. No ktlint/Spotless in repo                                 | Exclusion justified; native formatter gap documented, not hidden |
| `apps/mobile/ios/**`       | ACTIVE native (not Prettier source) | 40                                   | Swift/Xcode/plist/PNG. No SwiftFormat in repo                                                                 | Same as Android                                                  |
| `apps/customer-web/**`     | OBSOLETE / preventive               | 0; path absent                       | Former separate prototype with its own lockfile; folder not in tree                                           | Keep ignore; do not ingest if restored as junk                   |
| `output/**`                | GENERATED / scratch                 | 0                                    | Local regenerable output; present untracked locally                                                           | Justified                                                        |
| `outputs/**`               | GENERATED (preventive)              | 0; directory absent                  | Scratch alias                                                                                                 | Justified preventive                                             |
| `tmp/**`                   | GENERATED / scratch                 | 0                                    | Local temp (e.g. audit JSON); gitignored                                                                      | Justified                                                        |
| `design/stitch-screens/**` | ACTIVE raw design evidence          | 283 (mostly HTML/JS chunks)          | Stitch exports; historically invalid as JS source. Colocated markdown already Prettier-clean on honesty check | Justified; do not format as product source                       |
| `artifacts/**`             | ACTIVE media/evidence               | 25 (images + checksums + 2 markdown) | Catalog-media pilot provenance. Markdown already Prettier-clean on honesty check                              | Justified; not product source                                    |

Honesty checks (read-only, no write, not committed into the ignore set): `artifacts/catalog-media-pilot/*.md` and `design/stitch-screens/*.md` are already Prettier-clean. Exclusions are not hiding dirty owned docs.

### Known gaps (not STAB-04 failures)

- Android/iOS/macOS native sources have no ktlint/SwiftFormat/Spotless. Own later with native/release work; do not redesign in STAB-04.
- SQL migrations, `.env.example`, Dart, PNG, and other no-parser files are not Prettier-owned (359 tracked files with no inferred parser). Dart is covered by `dart format`. SQL has no dedicated formatter.
- `apps/mobile/macos` and `web` are not in `.prettierignore`. Prettier already formats `web/index.html` and `manifest.json`. Swift is no-parser. Acceptable.

## STAB-05 — Lint

- [x] **STAB-05** Lint — completed 25 August 2026 22:50 IST. Next: STAB-06. Do not start STAB-06 in this block.

Independent re-verification after STAB-04. ESLint 9.17.0 in all four pnpm TypeScript workspaces. Every workspace lint uses `--max-warnings=0`. No ESLint or TypeScript upgrades. No plugins added. No `eslint-disable` / `@ts-ignore` / `@ts-nocheck` in owned application source.

| Workspace                 | ESLint | Configuration                              | Command                                                | Actual files                                              | Errors | Warnings | Result |
| ------------------------- | ------ | ------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------- | ------ | -------- | ------ |
| `@me-event/backend`       | 9.17.0 | `apps/backend/eslint.config.mjs`           | `eslint "{src,test,scripts}/**/*.ts" --max-warnings=0` | 163 (129 src + 32 test + 2 scripts)                       | 0      | 0        | PASS   |
| `@me-event/erp-web`       | 9.17.0 | `apps/erp-web/eslint.config.mjs`           | `eslint . --max-warnings=0`                            | 65 including `next.config.ts`, tests, `eslint.config.mjs` | 0      | 0        | PASS   |
| `@me-event/api-contracts` | 9.17.0 | `packages/api-contracts/eslint.config.mjs` | `eslint src --max-warnings=0`                          | 1 (`src/index.ts`)                                        | 0      | 0        | PASS   |
| `@me-event/shared-types`  | 9.17.0 | `packages/shared-types/eslint.config.mjs`  | `eslint src --max-warnings=0`                          | 1 (`src/index.ts`)                                        | 0      | 0        | PASS   |
| Root `pnpm lint`          | —      | workspace configs above                    | recursive `--if-present lint`                          | four workspaces above                                     | 0      | 0        | PASS   |

### Coverage gap closed

Backend lint previously targeted only `{src,test}/**/*.ts`. Active operational scripts `scripts/migrate_images.ts` and `scripts/upload_assets_to_supabase.ts` were unlinted. They are now in the lint glob and `tsconfig.json` `include`. `tsconfig.build.json` excludes `scripts` so Nest production compile still emits only `src`. Scripts were typed to pass `strictTypeChecked` (no `any`, no new suppressions). They still must not print `SUPABASE_SERVICE_KEY`; they log missing-key names, paths, and errors only.

### Deliberate exclusions

| Path                                  | Reason                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `apps/backend/eslint.config.mjs`      | ESLint config; type-aware TS project rules are inappropriate               |
| `packages/*/eslint.config.mjs`        | Same; package lint is `eslint src`                                         |
| `apps/erp-web/next-env.d.ts`          | Generated Next types reference; still linted by `eslint .` (PASS)          |
| `scripts/scaffold_image_library.js`   | Root CJS media scaffold, not in a pnpm workspace; no root ESLint toolchain |
| `design/stitch-screens/**/*.js`       | Raw Stitch evidence, not a pnpm workspace (STAB-04)                        |
| Flutter/Dart, SQL, native Android/iOS | Not ESLint-owned                                                           |

### Rule exceptions reviewed (backend `eslint.config.mjs`)

| Rule                                                            | Scope               | Reason                                             | Security                                     | Result                              |
| --------------------------------------------------------------- | ------------------- | -------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| `@typescript-eslint/no-extraneous-class` off                    | backend app         | NestJS modules/providers are class-based           | None                                         | Keep                                |
| `@typescript-eslint/require-await` off                          | backend app         | Nest interface methods often `async` without await | Does not disable floating-promise rules      | Keep                                |
| `@typescript-eslint/no-unnecessary-condition` off               | backend app         | Zod `.default()` vs request partials               | Noise, not authz bypass                      | Keep                                |
| `@typescript-eslint/no-unnecessary-boolean-literal-compare` off | backend app         | Same                                               | None                                         | Keep                                |
| `@typescript-eslint/no-non-null-assertion` off                  | backend app         | Existing Nest/pg patterns                          | Residual; do not add new `!` to silence lint | Keep as-is; no new assertions added |
| `@typescript-eslint/unbound-method` off                         | `test/**/*.ts` only | Reflect metadata on `Prototype.method`             | Test-only                                    | Keep                                |
| unused vars ignore `^_`                                         | backend app         | Explicit unused bindings                           | None                                         | Keep                                |
| `restrict-template-expressions` allow number/boolean            | backend app         | Log/message interpolation                          | Still forbids arbitrary objects              | Keep                                |

Promise/unsafe rules remain **error**: `no-floating-promises`, `no-misused-promises`, `no-unsafe-*`, `no-explicit-any`, `no-implied-eval`. ERP: `next/core-web-vitals` + `next/typescript`; `react-hooks/rules-of-hooks` error; `react-hooks/exhaustive-deps` and `@next/next/no-img-element` are Next defaults at warn but `--max-warnings=0` still fails the command. No specialized secret-logging ESLint plugin (future, not this block).

### Suppressions

Zero `eslint-disable`, `eslint-disable-next-line`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` in owned workspace `.ts`/`.tsx`/`.js`/`.mjs`.

## STAB-06 — TypeScript typecheck

- [x] **STAB-06** TypeScript typecheck — completed 25 August 2026 23:38 IST. Next: STAB-07. Do not start STAB-07 in this block.

Independent re-verification after STAB-05 began on clean `master` at `52c751674b37c504ca8a5d0bed8b1e364b2ed83f`, tracking `origin/master`, ahead 6 and behind 0. No root TypeScript project exists or is needed: the root command recursively invokes the four workspace scripts. All four resolve the directly declared TypeScript **5.7.2**. The lockfile also contains TypeScript 5.9.3 only as a transitive Nest CLI/schematics dependency; it is not the `tsc` used by any workspace.

### Project inventory and actual file coverage

| Workspace / project                       | Compiler                  | Configuration / inheritance                                                                                     | Command                                                                                      | Intended and actual root-file scope                                                                                                                                     | Important exclusions                                                                                                 | Errors / result                             |
| ----------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `@me-event/backend` development/typecheck | 5.7.2                     | `apps/backend/tsconfig.json`; no base config                                                                    | `corepack pnpm --filter @me-event/backend typecheck` → `tsc -p tsconfig.json --noEmit`       | 163/163 tracked roots: 129 `src/**/*.ts`, 32 `test/**/*.ts`, 2 `scripts/**/*.ts`                                                                                        | `node_modules`; `dist` is compiler output and therefore excluded automatically                                       | 0 / **PASS**                                |
| Backend production build                  | 5.7.2                     | `apps/backend/tsconfig.build.json` extends `tsconfig.json`; Nest CLI uses it with `sourceRoot: src`             | `nest build` (scope inspection only; STAB-11 not started)                                    | 129/129 production `src/**/*.ts` roots                                                                                                                                  | `test`, `scripts`, `**/*.spec.ts`, `node_modules`, `dist`; operational scripts are typechecked above but not emitted | 0 configuration/coverage defects / **PASS** |
| `@me-event/erp-web`                       | 5.7.2                     | `apps/erp-web/tsconfig.json`; Next plugin; no base config                                                       | `corepack pnpm --filter @me-event/erp-web typecheck` → `tsc --noEmit`                        | 64/64 maintained roots (62 `src` TS/TSX including tests, `next.config.ts`, `next-env.d.ts`) plus 49 currently generated ignored `.next/types` roots = 113 current roots | `node_modules`; `.next/types/**/*.ts` is optional generated input; no `rootDir`/`outDir`                             | 0 / **PASS**                                |
| `@me-event/shared-types`                  | 5.7.2                     | `packages/shared-types/tsconfig.json`; no base config                                                           | `corepack pnpm --filter @me-event/shared-types typecheck` → `tsc -p tsconfig.json --noEmit`  | 1/1 maintained root: `src/index.ts`                                                                                                                                     | `dist`; `rootDir: src`, `outDir: dist`, declarations enabled                                                         | 0 / **PASS**                                |
| `@me-event/api-contracts`                 | 5.7.2                     | `packages/api-contracts/tsconfig.json` extends `../shared-types/tsconfig.json` and overrides `rootDir`/`outDir` | `corepack pnpm --filter @me-event/api-contracts typecheck` → `tsc -p tsconfig.json --noEmit` | 1/1 maintained root: `src/index.ts`; imports shared workspace declarations                                                                                              | `dist`; inherited declaration/strictness settings retained                                                           | 0 / **PASS**                                |
| Root workspace orchestration              | workspace compilers above | No root `tsconfig*.json` and no project references                                                              | `corepack pnpm typecheck` → recursive `--if-present typecheck`                               | All four TypeScript workspaces; 229 maintained TS/TSX/declaration roots in repository coverage                                                                          | Flutter/Dart, raw design JS and root utility JS are not TypeScript workspace source                                  | 0 / **PASS**                                |

The maintained-file inventory and `tsc --showConfig` root lists match exactly. No active owned `.ts`/`.tsx` file is outside an intended project. STAB-05 changed only backend include/build-exclude scope; it did not weaken a compiler option.

### Effective compiler settings

| Setting                                       | Backend development / build                               | ERP web              | Shared types / API contracts     |
| --------------------------------------------- | --------------------------------------------------------- | -------------------- | -------------------------------- |
| `strict`, `noImplicitAny`, `strictNullChecks` | `true`                                                    | `true`               | `true`                           |
| `noUncheckedIndexedAccess`                    | `true`                                                    | not enabled          | `true`                           |
| `exactOptionalPropertyTypes`                  | `true`                                                    | not enabled          | `true`                           |
| `skipLibCheck`                                | `true`                                                    | `true`               | `true`                           |
| `noEmit`                                      | command-line `true`; build emits                          | `true`               | command-line `true`; build emits |
| `isolatedModules`                             | compiler default (`false`)                                | `true`               | compiler default (`false`)       |
| `module` / `moduleResolution`                 | `commonjs` / TypeScript 5.7 implicit default (not pinned) | `esnext` / `bundler` | `nodenext` / `nodenext`          |
| `target`                                      | `ES2022`                                                  | `ES2017`             | `ES2022`                         |
| `rootDir` / `outDir`                          | inferred / `dist`                                         | unset / unset        | `src` / `dist`                   |
| declarations                                  | enabled                                                   | not enabled          | enabled                          |

`skipLibCheck: true` skips checking third-party declaration-file bodies; it does **not** skip owned application roots, tests, scripts or package source. Residual risk is incompatible/inaccurate dependency declarations. ERP's missing `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and backend's implicit `moduleResolution`, are existing hardening gaps; no setting was removed or weakened in STAB-06.

### Generated Next type handling

The ERP include list names `.next/types/**/*.ts`, but TypeScript treats the absent glob as empty. The current ignored `.next/types` directory contributed 49 generated route/declaration roots and passed. A temporary clean-checkout-equivalent copy containing the 64 maintained ERP roots, the same config and dependencies, but no `.next`, also passed with 0 errors. Stale generated files therefore neither mask the maintained-source result nor make a clean checkout dependent on a prior Next build. `.next`, `dist` and `*.tsbuildinfo` remain ignored and untracked.

### Type-escape inventory and security review

AST and text searches covered owned TypeScript/TSX source, tests and operational scripts.

| Category                                                                  | Count                      | Classification / security result                                                                                   |
| ------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Explicit `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` | 0                          | No unsafe compiler escape or suppression                                                                           |
| Source/script double assertions and non-null assertions                   | 0 / 0                      | No active source escape of these forms                                                                             |
| Test double assertions / non-null assertions                              | 23 / 17                    | Existing test-fixture mocks and checked fixture indexing only; no production boundary                              |
| Active `as` expressions                                                   | 255                        | 110 literal-preserving `as const`; 89 exhaustive `as never`; 56 narrowed/generic/framework assertions. No `as any` |
| Broad index signatures                                                    | 0                          | None found in owned TS/TSX                                                                                         |
| `JSON.parse`                                                              | 3                          | Two taxonomy test fixtures; one ERP session boundary with partial field checks                                     |
| Typed PostgreSQL `query<T>` calls                                         | 299 across 17 source files | Compile-time row models and explicit mapping, but no general runtime row decoder; existing data-boundary debt      |

Representative security-sensitive boundaries were inspected: environment validation, authenticated principals, JWT/session claims, role/capability maps, branch resolution, Zod DTO inference/pipe use, pagination, PostgreSQL row mapping, audit/outbox/timeline payloads, payment/quotation/booking/event identifiers and money, external OTP, ERP API/session handling, and operational Supabase scripts. Positive evidence: JWT payloads begin as `Record<string, unknown>` and roles are narrowed against the shared union; sessions/users/role assignments are reloaded and checked; branch resolution uses scoped assignments; request DTOs are Zod-derived and parsed; outbox JSONB payloads begin as `unknown` and are narrowed; environment schemas fail closed; external OTP is fail-closed; operational script rows are narrowed from `unknown`; money is represented as decimal strings in response/database models.

Known gaps, none introduced here:

1. **Medium — ERP/API owner:** `response.json()` is asserted to generic contract types, refresh responses are asserted, and stored session JSON validates only part of `EmployeeSession`. Add runtime response/session schemas before treating network/storage values as trusted.
2. **Medium — Backend/Data owner:** PostgreSQL `query<T>` generics provide compile-time shapes but not runtime validation for enum/date/JSON values. Add adapter-boundary validation, prioritized for identity, authorization, payments and branch-scoped rows; STAB-15 integration tests should exercise the live shapes.
3. **Medium — Backend/Finance owner:** several existing money paths use `Number(decimalString)` without an explicit finite/decimal guard. Replace with a validated decimal policy before provider-backed finance/payment work.
4. **Low — ERP owner:** ERP does not enable `noUncheckedIndexedAccess` or `exactOptionalPropertyTypes`. Evaluate separately because enabling either can create broad migration work; they were not disabled to obtain this baseline.
5. **Low — Backend/Security owner:** dormant `RolesGuard`/`RequireRoles` code models `user.roles`, while the active principal uses `activeRole` plus `roleAssignments`. It is unregistered and unused; align or remove it before any future activation. Active authorization uses the typed `CapabilityGuard`.

Typechecking proves compile-time consistency, not runtime validation. These existing gaps remain visible for their named owners and do not hide a TypeScript error or active source exclusion. No application source, TypeScript configuration or generated output changed. Commit wording: `docs(roadmap): record STAB-06 typecheck verification`.

### Checks executed

- Individual backend, ERP, shared-types and API-contracts typechecks: **PASS**, 0 errors each.
- Root `corepack pnpm typecheck`: **PASS**, all four workspace scripts, 0 errors.
- ERP with present generated types and a no-`.next` clean-checkout-equivalent: **PASS**, 0 errors each.
- Shared-types and API-contract declaration builds: **PASS**. Root lint: **PASS**, 0 errors / 0 warnings. Root formatting: **PASS**, 0 drift. `git diff --check`: **PASS**. Diff-only credential-pattern scan: **PASS**, 0 findings.
- Tests: not run because no runtime code changed; STAB-07 and STAB-08 were not started.
- Phase 0 gate remains **NOT PASSED**. Next permitted block: **STAB-07 — Backend tests**.

## STAB-07 — Backend tests

- [x] **STAB-07** Backend tests — completed 26 August 2026 00:13 IST. Next: STAB-08. Do not start STAB-08 in this block.

Canonical evidence: `docs/08-testing/backend-test-baseline.md`.

Independent verification after STAB-06 began on clean `master` at
`ff24b79a4d01132b7c0ffe8d362db5a0cd7dc27b`, tracking `origin/master`, ahead 7
and behind 0. The backend resolves Vitest **3.2.7** and uses the package command
`vitest run`. No Vitest/Vite workspace configuration or setup file exists, so
Vitest defaults apply from `apps/backend`: Node environment, forks, per-file
isolation, parallel files, 5-second test timeout, 10-second hook timeout, zero
retries, and zero bail. `passWithNoTests` is not enabled.

### Verified suite

| Evidence              | Result                                                                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery             | 30 `*.spec.ts` files; 188 registered tests. The two other maintained files under `test/` are the Pattern B fake helper and a non-Vitest scalability query-count model; both remain linted/typechecked but are not miscounted as tests. |
| Canonical run         | `corepack pnpm --filter @me-event/backend test` — 30/30 files, 188/188 tests, 0 failures/skips/todos/warnings, exit 0, 2.83 s.                                                                                                         |
| Isolation/order run   | Fresh process with `--sequence.shuffle --sequence.seed=6072026 --maxWorkers=1 --minWorkers=1 --no-file-parallelism` — 30/30 files, 188/188 tests, exit 0, 6.03 s.                                                                      |
| Empty-discovery proof | Non-matching filter returned `No test files found` and exit 1.                                                                                                                                                                         |
| Hidden-test review    | No `.skip`, `.todo`, `.only`, `skipIf`, `runIf`, `.concurrent`, retry, broad timeout override, or ignored unhandled-error option. Every registered test has an assertion directly or through the local denial helper.                  |
| Coverage              | Not configured or measured; no coverage dependency, command, threshold, or CI report. Test count is not presented as line/branch coverage.                                                                                             |
| Test levels           | Unit/domain/guard/service, fake repository, SQL-aware fake pool, mocked `PoolClient` transaction, and static migration/media probes only. No live PostgreSQL, HTTP E2E, Redis, provider, or load test.                                 |
| Taxonomy              | Identity/authorization/environment/platform: 9 files / 70 tests; catalog/taxonomy/media/search: 9 / 73; business foundations: 10 / 39; common/migration probes: 2 / 6.                                                                 |
| Generated output      | No coverage, snapshot, Vitest attachment, build, or generated artifact created or tracked.                                                                                                                                             |

Security positives include active JWT/session/role binding, OTP cooldown/request
limit, refresh rotation/reuse revocation/logout, mobile switch-role restrictions
and cache invalidation, capability fail-closed behavior, catalog-review
separation, production environment fail-closed rules and secret redaction,
customer enquiry ownership denial, catalog/media visibility and URL policy,
modeled rollback, and Pattern B side-effect expectations.

Known gaps are documented rather than hidden: **High** branch/resource
IDOR/BOLA coverage (Backend Security, SEC-02/STAB-20 plus STAB-15/17), **High**
OTP consume/session atomicity and missing failure/concurrency cases (Identity,
SEC-03/STAB-20 plus STAB-15), **High** provider-bound payment authenticity and
replay/amount binding (Payments, INT-02 plus STAB-15/17), **Medium** live
PostgreSQL constraints/transactions/row mappings (Data/QA, STAB-14/15),
**Medium** fake-heavy business workflow negatives and authorization wiring
(module owners, STAB-15/17), **Medium** incomplete access-token/endpoint role
matrix (Security, STAB-20), **Medium** absent provider contract tests
(INT-01–INT-06), and **Medium** absent coverage measurement (QA/CI, STAB-16).

No application source, backend test, Vitest configuration, dependency, or
generated output changed. Documentation-only commit wording:
`docs(testing): record STAB-07 backend test baseline`.

Checks after documentation: backend lint, backend typecheck, root formatting,
`git diff --check`, diff-only secret scan, and final Git state. Root-wide tests
were not rerun because STAB-07 changed documentation only; the backend suite was
the requested execution boundary. Phase 0 gate remains **NOT PASSED**. Next
permitted block: **STAB-08 — ERP tests**.

## STAB-08 — ERP tests

- [x] **STAB-08** ERP tests — completed 26 August 2026 00:40 IST. Next: STAB-09. Do not start STAB-09 in this block.

Canonical evidence: `docs/08-testing/erp-test-baseline.md`.

Independent verification began on clean `master` at
`77f71a697fc6140f22e1d724b3e551a4a970e2b9`, tracking `origin/master`, ahead 8
and behind 0. ERP resolves Vitest **3.2.7** and has no Vitest/Vite workspace
configuration or setup file. Vitest defaults therefore apply from
`apps/erp-web`: Node environment, forks, per-file isolation, parallel files,
5-second tests, 10-second hooks/teardown, zero retry, and zero bail. There is no
direct browser/DOM or coverage dependency/configuration.

The original package script was `vitest run --passWithNoTests`. A deliberate
non-matching filter reported `No test files found` but exited 0. Removing only
that option makes the same probe exit 1; no alternate bypass was added. The
canonical run then passed 3/3 files and 8/8 tests in 330 ms with zero
failures/skips/todos/warnings. A fresh-process, shuffled, single-worker,
serialized run with seed `6082026` passed the same 3/3 and 8/8 in 429 ms.

### Test and product-surface evidence

| Evidence                | Result                                                                                                                                                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment             | 6 tests cover development defaults/override plus production/staging HTTPS, required URL, and loopback failure. The localhost case was corrected to reach the loopback check rather than fail earlier on HTTP.                                                                                                         |
| Employee API/session    | 1 happy-path test proves protected 401 → refresh request → stored-token rotation → original request retry. Request endpoint order, refresh body, and old/new bearer headers are now asserted. Failure, logout, concurrent refresh, malformed JSON, capability, and role paths remain absent.                          |
| Catalogue helper        | 1 test covers every field returned by the production blank-form helper. It is not a rendered component, API, upload, provenance, authorization, or browser test.                                                                                                                                                      |
| Hidden/false confidence | No focus, skip, todo, conditional test, empty assertion, arbitrary wait, retry, snapshot, unawaited promise, or leaked global was found. The one misleading loopback assertion was corrected.                                                                                                                         |
| Maintained surface      | 62 TypeScript roots inspected: 44 route pages, root layout, 10 supporting route/component modules, 4 production libraries, and 3 specs. All rendered routes/components lack component/browser tests.                                                                                                                  |
| Fixtures/scaffolds      | `/leads` directly uses eight unlabeled realistic `DUMMY_LEADS`; `/` is clearly labeled illustrative sample data. Quote/finance/event screens also contain fixed-value or placeholder actions documented in the canonical baseline.                                                                                    |
| Security                | No real token/credential/API call, unsafe HTML insertion, token URL/log, cookie, or credentialed fetch was found. High gaps remain in employee bootstrap gating, browser-readable session tokens/XSS posture, refresh failures, direct-route capability/role denial, branch/IDOR/BOLA, and browser security evidence. |

The current suite is an honest narrow unit baseline, not proof of CRM/ERP
completion. It exercises no React render, Next route, browser, backend, live
database, branch isolation, or full employee journey. Follow-up ownership is
assigned to STAB-17/STAB-20, CRM-01–03/06/10–26, ERP-01–22, and INT-02/07 as
applicable. Phase 0 remains **NOT PASSED**. Next permitted block:
**STAB-09 — Flutter analysis**.

## STAB-09 — Flutter analysis

- [x] **STAB-09** Flutter analysis — completed 26 August 2026 10:27 IST. Next: STAB-10. Do not start STAB-10 in this block.

Canonical evidence: `docs/08-testing/flutter-analysis-baseline.md`.

Independent verification began on clean `master` at
`1b5168de9a82742757a10e3f922606f4e12165e1`, tracking `origin/master`, ahead 9
and behind 0. Local Flutter **3.44.8** stable matches CI; Dart is **3.12.2** and
`flutter_lints` resolves to **6.0.0**. The sole analysis configuration includes
the default Flutter lint set and has no custom enabled rules, disabled rules,
exclusions, language overrides, or nested configuration.

`flutter analyze --fatal-infos` passed all **200 maintained Dart files** — 172
under `lib` and 28 under `test` — in 3.3 seconds with **0 errors, 0 warnings,
and 0 infos**. There are no maintained Dart files elsewhere, no
`integration_test`/`tool` tree, and no tracked generated Dart. No analyzer rule
was weakened and no Dart/configuration source changed.

Two line-level `depend_on_referenced_packages` ignores exist in tests for
transitive test helpers; neither hides a code or security diagnostic. No
file-level/analyzer/deprecation/format suppression exists. Manual review
classified 264 `dynamic` occurrences across 29 files as predominantly
JSON-boundary shapes, 35 `Object?` occurrences as error/narrowing state, 105
guarded forced-null uses, and 20 lifecycle `late` fields. Controllers and owned
timers are disposed/cancelled; mounted/context guards are present on
representative async navigation paths. This does not remove runtime validation
or lifecycle follow-up.

Security review preserved existing owners: unstable per-login device identity
(SEC-03), fail-open unknown bootstrap surface/role strings and direct Supabase
boundary (SEC-06), release transport/error/logging/JSON-validation gaps
(SEC-05/06 and STAB-20), and native permission/signing/network proof
(STAB-13/release phases). Tokens use secure storage; customer cache/preferences
are user-scoped; logout attempts server revocation and then clears local state.
No server secret or new unsafe suppression was found.

Current `flutter pub outdated` output reconciles the old “29 constrained”
wording: 29 installed packages are behind Latest (5 direct + 24 transitive),
but only three direct constraints prevent a newer resolvable selection. Direct
dev dependencies are current; no package is reported discontinued, retracted,
or advisory-affected by this currency command. No dependency was upgraded.

The analyzer reported no deprecated API. It does not prove Kotlin/Gradle,
Swift/Xcode, manifests/plists/entitlements, permissions, signing, native secure
storage/network policy, runtime input validation, privacy, device behavior, or
release artifacts. Phase 0 remains **NOT PASSED**. Next permitted block:
**STAB-10 — Flutter tests**.

## STAB-10 — Flutter tests

- [x] **STAB-10** Flutter tests — completed 26 August 2026 11:09 IST. Next: STAB-11. Do not start STAB-11 in this block.

Canonical evidence: `docs/08-testing/flutter-test-baseline.md`.

Independent verification began on clean `master` at
`c6c00f35100c87062a42585990db6dc3a269b740`, tracking `origin/master`, ahead
10 and behind 0. Flutter **3.44.8** stable and Dart **3.12.2** match CI. Flutter
recursively discovers `test/**/*_test.dart` in its VM-based host tester. The
repository has no `dart_test.yaml`, `flutter_test_config.dart`, test tags,
golden/snapshot configuration, coverage configuration, `integration_test`, or
device/emulator suite.

The CI-equivalent `flutter test` run discovered **27 test files** and passed
**441/441 tests** with 0 failures, 0 skips, 0 expected failures, and no warning,
Flutter exception, overflow, semantics warning, pending timer, or unhandled
async error. The compact runner reported 20 seconds (25.1 seconds command wall
time). The previous 435-test count was stale. The machine inventory confirms
111 behavioral unit/provider/store cases, 329 widget cases, one static
asset-consistency case, and one support helper. Ten loop registrations produce
48 parameterized cases, adding 38 cases beyond 403 static registration call
sites.

A fresh-process run using seed `6102026` and `--concurrency=1` passed the same
27 files and 441 tests; its JSON runner duration was 45.058 seconds. No
provider, preference, memory-session, client, semantics, view, timer,
animation, or restored global leaked across the shuffled order. An explicit
nonexistent-path probe exited 1. Static review found no skip, focus/solo/only,
conditional registration, tag exclusion, retry, expected failure, timeout
override, arbitrary delay, or empty test. The one `pumpAndSettle` is a bounded
role-switch-sheet setup; one asset audit contains two acknowledged
non-discriminating `>= 0` assertions and is classified as static consistency,
not runtime image proof.

Tests use `MockClient`, overridden/fake `MobileApi`, Riverpod overrides,
in-memory/throwing session stores, and mock/in-memory `SharedPreferences`.
They made no production, staging, Supabase, OTP, payment, notification,
storage, or location call. Real Flutter secure-storage method channels and
native behavior are not exercised. Customer Home/Explore/Search/Favorites/
Plan/shell/detail error/loading/empty/responsive/semantics behavior has broad
widget regression evidence. Enquiries and Account are partial. Vendor and
Worker evidence is only gateway/dashboard role-routing smoke; it is not a
complete or authorized journey.

Security gaps remain explicit: unstable device identity (SEC-03), unknown
surface/role and branch bootstrap fail-closed behavior plus direct Supabase
(SEC-06), non-HTTPS remote release URLs and error/log/runtime JSON boundaries
(SEC-05/06), uncancelled splash timer, OTP/session attack cases, payments, and
privacy/native proof (STAB-13/17/20 and relevant module tasks). Widget semantics
and 320/390-width/text-scale assertions do not prove TalkBack, VoiceOver,
native fonts, platform services, or permission dialogs. CI does not collect
Flutter coverage; no percentage or threshold is invented.

No Dart source, test, configuration, dependency, generated output, coverage,
or environment file changed. STAB-10 is a documentation-only verified baseline.
Phase 0 remains **NOT PASSED**. Next permitted block: **STAB-11 — Backend
build**; it was not started.

## STAB-11 — Backend build

- [x] **STAB-11** Backend build — completed 26 August 2026 12:00 IST. Next: STAB-12. Do not start STAB-12 in this block.

Canonical evidence: `docs/07-deployment/backend-build-baseline.md`.

Independent verification began on clean `master` at
`d113e0865d0b7f09e47ba51cb553a0e472852f41`, tracking `origin/master`, ahead
11 and behind 0. Node **v20.20.2**, pnpm **9.15.4**, Nest framework/CLI
**11.2.3/11.0.24**, and TypeScript **5.7.2** were used. A frozen-lockfile
install passed without manifest/lockfile drift, and the two workspace runtime
packages were rebuilt before the backend.

The canonical `corepack pnpm --filter @me-event/backend build` command uses
Nest `sourceRoot: src`, `tsconfig.build.json`, and `deleteOutDir`. The effective
production project includes all **129/129** application source roots while
excluding the 32 test/helper roots, two operational scripts, specs,
`node_modules`, and prior `dist`. Strictness was unchanged. The first sanitized
build exited 0 in 4.41 seconds with application configuration removed. A
harmless sentinel placed inside ignored `dist` was removed by the second build,
which exited 0 in 3.57 seconds.

Both sorted per-file hash manifests had aggregate SHA-256
`6653039693b1ebb9eb08369a1c45ee52688fa2d91f9b1352eb16dd757164ece2`, with
no file/hash difference. The reproducible artifact contains **388 files** and
2,114,896 content bytes: 129 JavaScript, 129 declarations, 129 source maps, and
one TypeScript build-info file. `dist/main.js` exists; every application root
has JavaScript output; all 19 application module directories are present; and
zero tests, specs, scripts, environment files, JSON/static assets, or unexpected
media are present.

The output is compiled CommonJS, not bundled/standalone. It requires Node,
production `node_modules`, and built `@me-event/api-contracts` and
`@me-event/shared-types` workspace output. Runtime resolution and a compiled
`AppModule` load passed from an empty temporary working directory with valid
synthetic configuration. A missing-configuration run of `dist/main.js` reached
Nest and exited 1 before database/provider initialization. Compiled validation
also rejected placeholder/weak secrets, local production OTP, missing external
SMS settings, unsafe CORS, and template database credentials; valid synthetic
production configuration passed, and rejected values were not echoed.

A valid-config listening smoke was not run because both outbox processors call
`Pool.connect()` immediately from `OnModuleInit`; the task-permitted
configuration-rejection plus module-load method prevented any external attempt.
No server remained. The 129 maps contain relative source names but no embedded
source content or absolute path. The artifact scan found no real secret,
private key, token-shaped literal, credential-bearing URL, environment file, or
developer path; its one placeholder-string occurrence is the fail-closed
environment validator.

Remaining deployment gaps are explicit: no standalone package/Dockerfile,
artifact upload, container, deploy/rollback, valid DB-backed listen/readiness
proof, or production topology; database TLS is not schema-enforced; Swagger is
always registered; wider log redaction/stack policy remains incomplete; CI does
not smoke or attest the artifact. Owners remain STAB-14/15/16/20 and
PROD-01–06. Backend lint and typecheck passed; no backend source, test, build
configuration, dependency, generated output, or real environment file changed.
Phase 0 remains **NOT PASSED**. Next permitted block: **STAB-12 — ERP build**;
it was not started.

## STAB-12 — ERP production build verification

- [x] **STAB-12** ERP production build verification — completed with findings
      26 August 2026 13:32 IST. Next: STAB-13. Do not start STAB-13 in this block.

Canonical evidence: `docs/07-deployment/erp-build-baseline.md`.

Verification began on clean `master` at
`4afbb688e1899ed881612a69239681069f419de7`, tracking `origin/master`, ahead 12
and behind 0. Node **v20.20.2**, pnpm **9.15.4**, Next **15.5.23**, React/React
DOM **19.2.3**, TypeScript **5.7.2**, and ESLint **9.17.0** were used. Frozen
installation passed without manifest/lockfile drift. Current registry audits
report **0 critical / 0 high / 0 moderate / 2 low** for the full workspace and
**0 / 0 / 0 / 1** for production; no dependency changed. Shared types and API
contracts built in CI order.

Production-mode builds were isolated from the ignored local `.env.local`; its
values were neither read nor printed. Missing and malformed production API URLs
failed closed during `/catalog` page-data collection. Two clean builds using
`https://mee-events-stab12.invalid/api/v1` passed compilation, TypeScript, page
data, and 37/37 static-generation units in 15.86 and 16.30 seconds with no
warning. All **44/44** maintained routes compiled: 33 static, 11 dynamic, and
10 parameterized, plus Next's expected `/_not-found` route.

Both artifacts contain 398 files. Full hashes differ because Next randomizes
the build ID and preview-mode values and propagates build-instance data/order
through manifests, prerendered HTML/RSC, cache, and trace output. The 262-file
stable application/server/client subset is identical in both builds at SHA-256
`5a1a8715e135dcd4f9c0b3b8d1cbb09e5deafd9dca94617da57b4e9fcbcd29b4`;
canonicalized route/build manifests are semantically equal and no application
bundle or route mapping differs. The normal `.next` output is not standalone
and requires Node/Next runtime dependencies plus repository layout.

A loopback-only `next start` smoke returned 200 for `/` and `/login` and 404
for a missing route. All three responses carry nosniff, strict-origin referrer,
and frame-deny headers; `X-Powered-By` is absent. CSP, Permissions-Policy,
HSTS, COOP, and CORP remain STAB-20/deployment work. No API route was requested,
no application/provider endpoint was contacted, and no process remained.

Artifact scans found no secret, private environment value, `.env` file,
credential, private key, JWT-shaped literal, or credential-bearing database
URL. The expected synthetic public URL and non-secret development fallback are
present. Absolute developer paths occur in server-only Next metadata, generated
server/types, trace, and cache data, but not browser static chunks.

The fixture-free production subcriterion remains explicitly **unsatisfied**:
`/leads` bundles eight unlabeled synthetic `DUMMY_LEADS` records with realistic
PII shape into a client chunk. The root dashboard is labeled sample data; the
login seed is labeled local development; fixed quotation/finance scaffold
values also remain. These are classified findings owned by CRM-04/06/12/24/26,
ERP-13–16/20/22, STAB-18, and STAB-20; they were not hidden or replaced with
invented feature behavior in this build task.

Next rewrites tracked `next-env.d.ts` to reference generated route types; the
exact pre-build content was restored, generated types still passed through the
tsconfig include, and clean-checkout typechecking also passed after removing
`.next`. ERP lint, generated-state typecheck, 3-file/8-test suite,
clean-checkout typecheck, and root formatting all passed. No ERP source,
configuration, test, dependency, generated artifact, or real environment file
changed. CI reaches the same build command but currently uses development
fallback configuration and does not upload, attest, start, or deploy the
artifact. Phase 0 remains **NOT PASSED**. Next permitted block: **STAB-13 —
Flutter build**; it was not started.

## STAB-13 — Flutter build and native artifact verification

- [x] **STAB-13** Flutter build and native artifact verification — completed
      with findings 26 August 2026 14:45 IST. Next: STAB-14. Do not start
      STAB-14 in this block.

Canonical evidence: `docs/07-deployment/flutter-build-baseline.md`.

Verification began on clean `master` at
`f04a9d665246e1ca584fab481c2f5e02bdbd38c9`, tracking `origin/master`, ahead
13 and behind 0. Flutter **3.44.8** stable (matching CI), Dart **3.12.2**,
DevTools **2.57.0**, Gradle **9.1.0**, AGP **9.0.1**, Kotlin plugin **2.3.20**,
Android SDK/build-tools **36**, and app min/target SDK **24/36** were recorded.
The host has CocoaPods 1.17.0 but no full Xcode. Flutter did invoke
`/usr/bin/arch -arm64e xcrun xcodebuild -version`; it exited 72 because the
utility is unavailable under the selected Command Line Tools developer
directory. Project enumeration, compilation, and signing were not reached.

The ignored founder mobile `.env` was protected by a trap for every relevant
command. Its contents were never read or printed. Builds used only public
synthetic `.invalid` API/Supabase values; the inspected APK/AAB asset hash
matches the synthetic file exactly. The original was restored with identical
hash, mode, size, ownership IDs, and xattr-name state. `flutter pub get` left
the lockfile unchanged. Formatting covered 200 files with zero drift,
fatal-infos analysis reported zero diagnostics, and 27/27 files with 441/441
tests passed with no failure or skip.

The exact CI-aligned dev debug APK compiled in 51 seconds as
`com.meevent.app.dev` / `1.0.0-dev`, contains `INTERNET`, is debuggable, and is
signed by the Android Debug identity. Two production APK builds compiled in 91
and 78 seconds as `com.meevent.app` / `1.0.0`; both are 69,139,990 bytes. Their
files, manifest, permissions, environment, ABIs, size, version, and certificate
match, while v2 signing-block bytes make whole-file hashes differ. Two
production AAB builds compiled in 122 and 102 seconds and are byte-identical at
67,394,445 bytes / SHA-256
`35ba3b7bcf5cc80f10efa84fec3c4e1856edd08fa1fd7dd35ad987f310988f73`.

Both production package formats omit `android.permission.INTERNET`, so they are
**BROKEN / UNUSABLE FOR NETWORKED PRODUCTION**. Both use the self-signed
`C=US, O=Android, CN=Android Debug` certificate, so they are **NOT
STORE-RELEASABLE**. No keystore, key properties, signing secret, private key,
server secret, real backend/provider environment, or founder `.env` entered
the repository or artifacts. R8 shrinking/optimization/obfuscation is present;
Flutter's Gradle plugin also enables resource shrinking for release app builds,
and this project does not override it; the exact removed-resource delta was not
measured. Dart obfuscation/split-debug-info, explicit network security,
certificate pinning, secure-storage backup exclusion, device proof, and store
pipeline are absent or unproven.

Both flavored and non-flavored unsigned iOS commands exit 1 immediately with
`Application not configured for iOS`; no `.app` exists. The observed error is
ordered: missing full Xcode makes the version probe fail, so Flutter gets no
project/build context and cannot substitute Info.plist's templated bundle ID.
The single shared Runner scheme has only ordinary Debug/Profile/Release
configurations, so missing `prod` flavor support is an independent later
blocker, as are team/profile/entitlement/signing gaps. `.metadata` lists
root/web for migration and carries Flutter's default unmanaged-pbxproj ignore;
it did not cause this build error. Android/iOS identifiers differ, and the iOS
plist advertises landscape while Dart locks portrait. These remain
IOS-01–08/release work, not STAB-13 corrections.

Runtime review reconfirmed dart-define precedence and release loopback/emulator
denial, but non-loopback HTTP remains accepted. `.env` remains public and
bundled; Supabase remains always initialized and dormant direct table-access
code remains contrary to the backend-only boundary. Owners remain SEC-05/06,
STAB-17/20, ANDROID-04/05/07/08/13/14, and IOS-01–08. CI builds only dev debug
and does not inspect or retain native artifacts. No device, provider, external
API, store, or remote CI ran. Tracked Android/iOS files and Flutter manifests
match their starting hashes; generated output was cleaned. Phase 0 remains
**NOT PASSED**. Next permitted block: **STAB-14 — PostgreSQL migration
verification**; it was not started.

## STAB-14 — PostgreSQL migration verification

- [x] **STAB-14** PostgreSQL migration verification — accepted after its
      signature-recipe correction passed independent review. Migration behavior
      passes with findings; `SEC-M-09` remains open.

Canonical evidence: `docs/03-database/migration-verification-baseline.md`.

Verification began from clean `master` at
`325f2e47ab4b0db7abad2daacdb445ffb074b551`, tracking `origin/master`, ahead
15 and behind 0. Docker 29.5.2 / Compose 5.1.4 ran the pinned
`postgres:17.2-alpine` image in four unique, loopback-only projects. The normal
founder `me-event-local` Postgres/Redis project and unrelated projects were
excluded; all four STAB-14 containers, volumes, and networks were removed, and
the founder container IDs/health were unchanged.

Filesystem and Git both contained exactly 20 sequential migrations
`0001`–`0020`; every file has one `BEGIN`/`COMMIT`. The combined catalog
SHA-256 is
`790d78670e79500b2c32dae17bcc1ed75749a637e4240253a098fa082aa7e653`.
It hashes 20 LF-terminated `<sha256><two spaces><basename>` lines kept in
migration filename order under `LC_ALL=C`; complete lines are not re-sorted by
hash prefix. The exact runnable recipe is in the canonical baseline.
The empty replay applied all 20 in 7.54 seconds. A tracked database at `0014`
received `0015`–`0020`, and a legacy `0001` database without a ledger was
correctly baselined before receiving `0002`–`0020`. Final ledgers were 20/20
distinct; repeat runs skipped all 20 files.

All three paths produced identical raw schema SHA-256
`b47b505edcead504d76f5bca1d2bab0279c3268940719bbebc69959eaf61fc9a`.
Deleting only the two complete PostgreSQL dump-version comment lines produced
normalized schema SHA-256
`90a977d40e12d998ed8bd0723640eaae34f26f560c229d4035235758941a2c36`.
The corrected fully specified 16-table stable seed-payload recipe produced
SHA-256
`a06b154f7164ecdc26ac71d6473fed38ab977c8ffe9f50d53ce331641f4aa3ec`
on empty, tracked-upgrade, and legacy paths. The unreproducibly described
`b8bd2cc4…` value is retired.
The live schema had 115 public tables including the ledger, 502 indexes, 760
constraints, 310 foreign keys, 282 CHECKs, 53 UNIQUE constraints, and 68
non-internal triggers. All 33 `branch_id` columns had branch foreign keys; no
constraint was unvalidated and no index was invalid. Representative
FK/CHECK/UNIQUE, updated-at/version, catalog-media, and audit append-only probes
passed and rolled back without residue. A forced pre-COMMIT exception exited 3
and left no table.

The known runner risk is now reproduced, not closed. Migration SQL commits
before a separate ledger insert, and the ledger stores no checksum. After
`0019` was deliberately committed but not recorded, the runner retried it,
failed its semantic precondition with exit 3, retained an 18-row ledger, and
did not reach `0020`; no automatic recovery occurred. `SEC-M-09` remains owned
by STAB-20 and PROD-03 for checksum-aware, crash-recoverable bookkeeping and an
approved reconciliation runbook. This local evidence is not a maintained
backend adapter/concurrency suite, backup/restore proof, or production database
validation. Phase 0 remains **NOT PASSED**. The signature correction passed
independent review, so STAB-14 is accepted; its `SEC-M-09` finding is unchanged.

## STAB-15 — PostgreSQL database integration test foundation

- [x] **STAB-15** Database integration tests — independently accepted with
      findings after source review on 27 August 2026. Canonical, repeat,
      seed-`6152026`, and seed-`8262026` shuffled serialized runs each passed
      3/3 files and 21/21 cases on separate disposable PostgreSQL 17.2
      databases. The STAB-16 session re-ran 21/21 on 27 August 2026.

Canonical evidence:
`docs/08-testing/database-integration-baseline.md`.

The dedicated backend command applies all 20 repository migrations to an
exact, loopback-only `mee-dbint-*` Compose project. Shell and TypeScript guards
reject the development project, non-loopback URLs, wrong database/user/project
identity, missing configuration, unavailable databases, and zero discovery.
The ordinary backend unit command explicitly excludes the integration tree and
remains database-independent at 30 files / 190 tests. Every run closes pools,
manually ticks processors without timers, and removes only its exact container,
network, and volume; the developer Postgres/Redis container IDs and health were
unchanged.

The 21 maintained cases cover DBINT-01–14 through actual `pg.Pool`
connections, production adapters, and production services. Live evidence
includes OTP/session/user/role mappings; one-winner OTP verification and role
switch; refresh rotation/reuse/concurrency; enquiry/audit/outbox atomic commit
and late rollback; concurrent enquiry-to-lead processing; lead-to-enquiry
synchronization; exact-decimal quotation/advance behavior; one-winner payment
confirmation to booking/Event Record; forced lifecycle rollback; customer
cross-owner denial; branch-list isolation; and Pattern B companion rows.

Required tests exposed and drove narrow corrections: OTP failure decrement and
one-time consume use conditional `UPDATE ... RETURNING`; refresh rotation keeps
the presented-digest CAS as authority. One-service concurrency is separately
protected by the process-local in-flight set. Across API processes, the
PostgreSQL repository uses a `REPEATABLE READ` snapshot and a lock on the
existing device-session row so the losing concurrent request receives
`SESSION_REFRESH_CONFLICT` without entering the reuse-revocation path. A later
presentation of the previous token still returns `SESSION_REFRESH_REUSED`,
revokes the session, records the revocation audit, and denies the rotated token.
Two real services/repositories/pools repeat this race 20 times per integration
run; repository-only CAS separately returns one `true` and one `false`. The
in-memory repository preserves interface parity. Backend unit tests, lint,
typecheck, build, and required integration runs are green.

The result is **INDEPENDENTLY ACCEPTED WITH FINDINGS**, not complete security
or production proof. OTP consumption still precedes user/session/audit
completion, refresh state can precede its audit, and broader session controls
remain `SEC-03`; employee direct-ID branch gaps remain `SEC-02`; outbox lease
recovery remains `SEC-04`; provider payment authenticity remains `INT-02`; and
migration bookkeeping remains `SEC-M-09`. No HTTP/Redis/provider/E2E,
backup/restore, remote database, or production behavior is claimed. STAB-16
invokes the suite in CI; GitHub ran it green on `999443d` (CI 33034648786).
Percentages are unchanged. Phase 0 remains **NOT PASSED**. STAB-16 is **DONE
WITH FINDINGS**; STAB-17 is **DONE WITH FINDINGS**.

## STAB-16 — CI verification

- [x] **STAB-16** CI verification — **DONE WITH FINDINGS** 27 August 2026.
      Canonical `master` `999443d` ran green: CI 33034648786, Security
      33034648784, CodeQL 33034648777. `Dependency review` skipped on push.
      Branch protection and native secret scanning remain founder-owned and
      open.

Canonical evidence: `docs/07-deployment/ci-verification-baseline.md`.

Local workflows pin `ubuntu-24.04`, Node `20.20.2`, pnpm `9.15.4`, Flutter
`3.44.8`, and the existing STAB-15 PostgreSQL 17.2 harness. Quality, isolated
database integration, Flutter development verification, PR dependency review,
`pnpm audit --audit-level high`, checksum-pinned Gitleaks history scanning,
CodeQL JavaScript/TypeScript (`build-mode: none`), and Dependabot monitoring
are configured. Independent Antigravity review accepted the implementation with
findings. Required-check names remain proposals; this closeout does not enable
branch protection.

## STAB-17 — E2E test foundation

- [x] **STAB-17** E2E test foundation — **DONE WITH FINDINGS** 27 August 2026.
      Playwright `@playwright/test` `1.62.1` is the only browser runner.
      Local loopback smokes passed: ERP employee login → `/quotes`, Nest
      authenticated API (unique synthetic customer), Dart mobile API contract
      (no device). Fail-closed URL probes: 17. CI runs those guards on
      TypeScript quality and Dart URL denial on Flutter verification; it does
      not boot an emulator or a live Nest/ERP/Playwright stack on every push.

Canonical evidence: `docs/08-testing/e2e-foundation-baseline.md` and
`docs/08-testing/e2e-tests.md`.

No Customer/Vendor/Worker/CRM/ERP product module, enquiry→booking product gate,
payment/SMS/PDF/push, or STAB-18 work was started. Founder-owned STAB-16
findings (branch protection, native secret scanning, Dependabot alerts) remain
open.

## STAB-18 — Documentation reconciliation

- [x] **STAB-18** Documentation reconciliation — **DONE WITH FINDINGS**
      27 August 2026. Docs-only. No application, test, workflow, or migration
      change.

Named defects vs code:

| Defect                                                     | Code / config                                                                                            | Doc correction                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Enquiry→lead same-write                                    | `createEnquiry` writes enquiry + `enquiry.submitted`; `EnquirySubmittedOutboxProcessor` creates the lead | overview, architecture, customer API, enquiry-to-booking                            |
| Staff-mobile includes Manager as a shipped Flutter product | Bootstrap maps employee/manager roles to `employee_web`; EMP-\* MISSING                                  | overview, architecture                                                              |
| OTP resend “not enforced”                                  | `auth.service.ts` `OTP_RESEND_COOLDOWN` HTTP 429                                                         | `authentication.md`, `identity-foundation.md`                                       |
| Supabase as SoT                                            | PostgreSQL migrations; leftover `supabase_flutter` (SEC-06) and script `supabase-js`                     | overview, database README, references/supabase, ADR 0011 residual                   |
| Default branch `main`                                      | GitHub/CI `master`                                                                                       | PRD 10, CONTRIBUTING, SECURITY, AGENTS                                              |
| Stale test/E2E counts                                      | Unit 190/190; DBINT 21; STAB-17 foundation; no device E2E                                                | README, testing-strategy, unit-tests, verification, baselines (pointers on freezes) |
| 18 August PDFs as live SoT                                 | Binaries unchanged                                                                                       | `docs/roadmap/README.md`; MASTER_BUILD_ROADMAP banner                               |

**Finding:** `MEE_EVENTS_MASTER_BUILD_ROADMAP.md` body and
`MEE_EVENTS_COMPLETE_PROJECT_AUDIT.md` 25 August freeze body were **labeled**,
not rewritten. EMP-\* cards remain MISSING. Phase 0 **NOT PASSED**. STAB-19
**not started**.

## Latest verification

| Verification                   | Result                               | Evidence summary                                                                                                        |
| ------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| STAB-14 migration paths        | **PASS with finding**                | Empty, tracked-upgrade and legacy paths converge; 20/20 ledger; repeat runs are no-ops                                  |
| STAB-14 live integrity         | **PASS**                             | 115 tables; 760 constraints; all 33 branch columns FK-scoped; append-only and rollback probes pass                      |
| STAB-14 crash recovery         | **FAIL / risk reproduced**           | Applied-but-unrecorded `0019` fails on retry; no checksum or automatic reconciliation                                   |
| STAB-14 signature correction   | **PASS / ACCEPTED**                  | Independent re-review accepted the reproducible `790d…`, raw `b47b…`, normalized `90a…`, and `a06b…` recipes            |
| STAB-15 PostgreSQL integration | **ACCEPTED WITH FINDINGS**           | Four fresh runs plus STAB-16 re-run 21/21 on 27 August 2026; selected adapters and two-instance refresh proof           |
| STAB-15 isolation/cleanup      | **PASS**                             | Fail-closed identity guards; no leaked project resource; developer containers unchanged                                 |
| STAB-16 local CI configuration | **DONE WITH FINDINGS**               | `999443d` CI/Security/CodeQL green (33034648786 / 33034648784 / 33034648777); protection and native scanning still open |
| STAB-17 E2E foundation         | **DONE WITH FINDINGS**               | Playwright 1/1; API smoke PASS; mobile API contract PASS (no device); 17 URL guards; no live GitHub stack job           |
| STAB-18 documentation          | **DONE WITH FINDINGS**               | Canonical docs aligned with code; 18 Aug PDFs labeled; 25 Aug audit freeze labeled not rewritten                        |
| Backend unit tests (current)   | **PASS (after STAB-15)**             | 190/190 across 30 files; STAB-07 freeze remains 188/188                                                                 |
| STAB-13 Flutter quality        | **PASS**                             | 200 formatted/analyzed files; 0 drift/diagnostics; 27 files and 441/441 tests                                           |
| STAB-13 Android dev build      | **PASS (debug only)**                | Dev APK compiles; INTERNET present; debuggable; Android Debug certificate                                               |
| STAB-13 Android prod packages  | **COMPILE PASS / RELEASE FAIL**      | APK/AAB compile; no INTERNET; debug-signed; AAB byte-identical; APK content stable                                      |
| STAB-13 iOS probes             | **FAIL / state verified**            | No Xcode interpreter; no enumeration/compile/sign/artifact                                                              |
| STAB-13 environment/security   | **PASS with high findings**          | Founder env protected; synthetic public asset only; HTTP/Supabase/backup/native gaps assigned                           |
| STAB-12 ERP production build   | **PASS with findings**               | Two clean synthetic-production builds; 44/44 maintained routes; no warning                                              |
| STAB-12 reproducibility        | **PASS, not byte-identical**         | Stable 262-file digest matched; Next build ID/preview/order/cache/trace variance classified                             |
| STAB-12 runtime/headers        | **PASS with hardening debt**         | Loopback 200/200/404; configured headers present; no X-Powered-By; five headers remain unconfigured                     |
| STAB-12 artifact security      | **PASS with fixture finding**        | No secret/private env; unlabeled PII-shaped lead fixtures remain visibly assigned                                       |
| STAB-11 backend build          | **PASS**                             | Two sanitized `nest build` runs; 388 files; `dist/main.js`; 129/129 application roots                                   |
| STAB-11 reproducibility        | **PASS**                             | Matching sorted path/SHA-256 manifests; sentinel removed; no file/hash difference                                       |
| STAB-11 artifact security      | **PASS with documented debt**        | No secret/env/absolute path; maps are relative/no source content; Swagger/log/package gaps owned                        |
| STAB-11 startup boundary       | **PASS via safe method**             | Missing config fails closed; valid compiled module loads; listen omitted to avoid DB connection                         |
| STAB-10 Flutter canonical      | **PASS**                             | Flutter 3.44.8/Dart 3.12.2; 27/27 files; 441/441 pass; 0 failed/skipped/expected failures                               |
| STAB-10 Flutter determinism    | **PASS**                             | Seed 6102026; one process; shuffled order; same 27 files/441 tests; no isolation leak                                   |
| STAB-10 discovery honesty      | **PASS**                             | No skip/focus/conditional/tag/timeout override; nonexistent path exits 1                                                |
| STAB-10 boundary review        | **PASS with documented debt**        | Customer-heavy fake-boundary suite; Vendor/Worker routing only; no device/native/provider E2E                           |
| STAB-09 Flutter analyze        | **PASS**                             | Flutter 3.44.8/Dart 3.12.2; 200 maintained files; 0 errors/warnings/infos                                               |
| STAB-09 analyzer scope/policy  | **PASS**                             | 172 lib + 28 test; no exclusion/nested config/disabled rule/tracked generated Dart                                      |
| STAB-09 static security review | **PASS with documented debt**        | No hidden security finding; runtime validation, auth/bootstrap/transport/native owners retained                         |
| STAB-06 root typecheck         | **PASS**                             | TypeScript 5.7.2; four workspaces; 0 errors                                                                             |
| STAB-06 maintained coverage    | **PASS**                             | 229 roots; backend source/tests/scripts, ERP source/tests/config, both packages all covered                             |
| STAB-06 backend build scope    | **PASS**                             | 129 production roots; tests/scripts/specs excluded from emission only                                                   |
| STAB-06 ERP generated types    | **PASS**                             | 49 present generated roots pass; no-`.next` 64-root clean equivalent also passes                                        |
| STAB-06 type/security review   | **PASS with documented debt**        | No explicit `any`/suppressions/source double/non-null assertions; five owned follow-ups logged                          |
| STAB-05 root lint              | **PASS**                             | ESLint 9.17.0; 0 errors / 0 warnings; scripts now covered                                                               |
| STAB-05 backend scripts        | **PASS**                             | `migrate_images.ts` and `upload_assets_to_supabase.ts` linted; type-aware; no secret logs                               |
| STAB-04 root Prettier          | **PASS**                             | Prettier 3.4.2; 372 parser-matched tracked files; 0 drift                                                               |
| STAB-04 Dart format            | **PASS**                             | Dart 3.12.2; 200 files in `lib`+`test`; 0 changed                                                                       |
| STAB-04 exclusions             | **PASS**                             | All `.prettierignore` entries classified; no owned TS/Dart failure hidden                                               |
| STAB-03 JavaScript audit       | **PASS**                             | Final 0 critical / 0 high / 0 moderate / 2 low; see `docs/05-security/dependency-security.md`                           |
| STAB-03 Flutter/Dart review    | **PASS**                             | OSV 0 findings; no discontinued direct packages; no pubspec changes                                                     |
| STAB-03 unaccepted crit/high   | **PASS (none remain)**               | No founder acceptance used                                                                                              |
| STAB-03 compatibility verify   | **PASS**                             | Frozen install, format, lint, typecheck, 188 backend tests, 8 ERP tests, Nest/Next builds                               |
| STAB-02 environment contracts  | **PASS**                             | Matrix in `docs/07-deployment/environment.md`; fail-closed tests with synthetic values                                  |
| STAB-01 remote default         | **PASS with local drift**            | GitHub HEAD is `master`; local `origin/HEAD` still stale-points at `main`                                               |
| STAB-01 secrets                | **PASS**                             | Env values not read; only template key names and ignored-file presence                                                  |
| STAB-01 application tree       | **PASS**                             | No application file changes versus `9e2a442`                                                                            |
| Git start state (audit)        | **PASS**                             | Clean `master` worktree at audited baseline; local `origin/HEAD` still stale                                            |
| Node / pnpm                    | **PASS**                             | Node `20.20.2`; pnpm `9.15.4`                                                                                           |
| Flutter / Dart                 | **PASS**                             | Flutter `3.44.8`; Dart `3.12.2`                                                                                         |
| Root TypeScript verification   | **PASS**                             | format, lint, typecheck, tests, backend build, ERP build                                                                |
| STAB-07 backend canonical      | **PASS**                             | Vitest 3.2.7; 30/30 files; 188/188 tests; 0 skipped/todo/warnings; 2.83 s                                               |
| STAB-07 isolation/order        | **PASS**                             | Seed 6072026; shuffled files/tests; one worker; serialized files; 188/188; 6.03 s                                       |
| STAB-07 discovery honesty      | **PASS**                             | No skip/todo/only/conditional tests; zero-match probe exits 1; no `passWithNoTests`                                     |
| STAB-07 coverage status        | **GAP DOCUMENTED**                   | No coverage provider, report, or threshold; STAB-16 owner                                                               |
| Backend tests                  | **PASS (STAB-07)**                   | 188/188 across 30 files                                                                                                 |
| STAB-08 ERP canonical          | **PASS**                             | Vitest 3.2.7; 3/3 files; 8/8 tests; zero failure/skip/todo/warning; 330 ms                                              |
| STAB-08 ERP isolation/order    | **PASS**                             | Seed 6082026; shuffled files/tests; one worker; serialized files; 8/8; 429 ms                                           |
| STAB-08 discovery honesty      | **PASS after correction**            | Removed `--passWithNoTests`; deliberate zero-match probe changed from exit 0 to exit 1                                  |
| STAB-08 browser/route status   | **GAP NARROWED**                     | STAB-17 adds one `/quotes` login smoke; 44 routes still lack component tests; `/leads` remains fixtures                 |
| ERP tests                      | **PASS but narrow (STAB-08)**        | 8/8 across 3 files; environment/API-refresh/helper units only                                                           |
| Flutter format                 | **PASS**                             | STAB-04: 200 Dart files, 0 changed (audit-era count was 199)                                                            |
| Flutter analysis               | **PASS**                             | no issues with fatal infos                                                                                              |
| Flutter tests                  | **PASS (STAB-10)**                   | 441/441 across 27 files; canonical and seeded serialized runs                                                           |
| Android dev debug build        | **PASS**                             | APK compiled                                                                                                            |
| Android prod release compile   | **COMPILE PASS / RELEASE FAIL**      | 69.1 MB APK; no INTERNET permission; Android Debug certificate                                                          |
| iOS unsigned release build     | **FAIL**                             | No Xcode interpreter; templated bundle ID unresolved; no artifact                                                       |
| Dependency audit               | **PASS (STAB-03)**                   | 0 critical / 0 high remaining; 2 low owned. See `docs/05-security/dependency-security.md`                               |
| PostgreSQL integration         | **ACCEPTED WITH FINDINGS (STAB-15)** | 21/21 across 3 files on four fresh PostgreSQL 17.2 projects; focused adapter/service boundary                           |
| Browser/device E2E             | **FOUNDATION / DEVICE GAP**          | Playwright + API smokes local; no `integration_test/`, no emulator CI                                                   |

## Known release blockers

1. ~~Critical/high dependency advisories.~~ Closed in STAB-03; two low findings remain.
2. Employee branch/resource IDOR/BOLA gaps.
3. OTP consume/session atomicity and unstable mobile device ID.
4. Outbox crash recovery and application idempotency are incomplete.
5. ERP Lead Inbox is fixture-backed; employee bootstrap/capability routing is incomplete.
6. Real OTP, payment, private storage, PDF, push/email, maps, monitoring and crash integrations are absent.
7. Device/emulator E2E, full HTTP/module integration, and security suites remain incomplete; STAB-17 added a loopback foundation only.
8. Staging/production infrastructure, secrets, backups/restore, observability, CD and rollback are absent.
9. Android production artifact lacks network permission and uses debug signing.
10. The verified host lacks usable full Xcode; the later iOS `prod` scheme,
    signing, entitlement, and TestFlight setup also remain absent.

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
- [x] STAB-02 Environment verification
- [x] STAB-03 Dependency verification
- [x] STAB-04 Formatting
- [x] STAB-05 Lint
- [x] STAB-06 TypeScript typecheck
- [x] STAB-07 Backend tests
- [x] STAB-08 ERP tests
- [x] STAB-09 Flutter analysis
- [x] STAB-10 Flutter tests
- [x] STAB-11 Backend build
- [x] STAB-12 ERP build
- [x] STAB-13 Flutter build
- [x] STAB-14 PostgreSQL migration verification — accepted with `SEC-M-09` open
- [x] STAB-15 Database integration tests — independently accepted with findings
- [x] STAB-16 CI verification — DONE WITH FINDINGS (`999443d`; branch protection and native secret scanning remain open)
- [x] STAB-17 E2E test foundation — DONE WITH FINDINGS (local live smokes; CI URL guards only; no emulator)
- [x] STAB-18 Documentation reconciliation — DONE WITH FINDINGS (canonical docs; historical PDFs labeled)
- [ ] STAB-19 Repository cleanup
- [ ] STAB-20 Security baseline

### Phase 0 security packages

- [x] SEC-01 Dependency remediation — closed by STAB-03 (`docs/05-security/dependency-security.md`); remaining work is low-severity follow-up, not unaccepted critical/high
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
