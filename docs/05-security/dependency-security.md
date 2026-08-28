# Dependency security baseline

Canonical STAB-03 record. This document is the evidence-backed inventory for
JavaScript/TypeScript and Flutter/Dart dependencies. It does not replace
[SECURITY.md](../../SECURITY.md), [secrets.md](./secrets.md), or
[ai-coding-controls.md](./ai-coding-controls.md).

Critical and high findings are release blockers unless the founder records
written acceptance with scope, reason, expiry, and compensating controls.
Codex cannot silently accept that risk.

## Audit metadata

| Field                   | Value                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Audit date              | 25 August 2026, Asia/Kolkata (IST, +0530)                                                                                               |
| Starting commit         | `2170f616bc4157021315bbefb118a56413423981`                                                                                              |
| Branch                  | `master` tracking `origin/master` (ahead 3, behind 0 at start)                                                                          |
| Node                    | `v20.20.2`                                                                                                                              |
| pnpm                    | `9.15.4` (Corepack; `packageManager` pin)                                                                                               |
| Flutter                 | `3.44.8` stable                                                                                                                         |
| Dart                    | `3.12.2`                                                                                                                                |
| JavaScript audit source | `corepack pnpm audit --json` and `corepack pnpm audit --prod --json` (npm/GitHub advisory database via pnpm)                            |
| Advisory verification   | GitHub Advisory Database (GHSA), npm registry metadata, Next.js/NestJS/Vitest/Vite/sharp/js-yaml release notes                          |
| Flutter review source   | `flutter pub outdated`, `flutter pub get`, pub.dev package/advisories API, OSV.dev `querybatch` for every hosted `pubspec.lock` package |
| Node version pin        | STAB-16 added root `.node-version` `20.20.2`; CI consumes it. Engines remain `>=20.11.0`                                                |

### Evidence limitations

- Advisory databases change. Counts below are for this audit date, not a permanent score.
- `pnpm audit` metadata counts can differ slightly from unique advisory objects when one GHSA hits multiple major lines.
- There is no first-party `flutter audit`. Dart review used pub.dev + OSV.dev.
- Exploitability notes are static path review, not a penetration test.
- Local ERP production build read ignored `apps/erp-web/.env.local`; values were not printed or copied.
- Residual lows are classified, not hidden, and are not treated as accepted critical/high risk.

## Severity totals

### JavaScript — initial (HEAD `2170f61`, before remediation)

| Scope                                 | Critical | High | Moderate | Low | Info |
| ------------------------------------- | -------- | ---- | -------- | --- | ---- |
| Full tree (`pnpm audit`)              | 4        | 29   | 31       | 10  | 0    |
| Production-only (`pnpm audit --prod`) | 2        | 19   | 26       | 7   | 0    |

822 dependencies in the full audit; 248 in production-only. Unique critical/high advisory objects extracted from the JSON: 4 critical + 28 high rows (some GHSAs repeated across major lines; pnpm metadata reported 29 high).

### JavaScript — final (after STAB-03 upgrades and overrides)

| Scope           | Critical | High | Moderate | Low | Info |
| --------------- | -------- | ---- | -------- | --- | ---- |
| Full tree       | 0        | 0    | 0        | 2   | 0    |
| Production-only | 0        | 0    | 0        | 1   | 0    |

804 dependencies in the full final audit; 238 in production-only. Frozen lockfile install: `corepack pnpm install --frozen-lockfile` succeeded.

### STAB-12 current re-verification

On 26 August 2026, STAB-12 reran registry-backed `pnpm audit --json` and
`pnpm audit --prod --json` after another successful frozen install. Counts are
unchanged: full workspace **0 critical / 0 high / 0 moderate / 2 low** across
804 dependency rows; production workspace **0 / 0 / 0 / 1** across 238 rows.
The full lows remain `@eslint/plugin-kit@0.2.8` through ESLint and
`@supabase/auth-js@2.64.4` through the backend's Supabase dependency; only the
Supabase row appears in production scope. No dependency or lockfile changed.
See [erp-build-baseline.md](../07-deployment/erp-build-baseline.md) for commands,
scope, and build evidence.

### STAB-16 CI enforcement

On 27 August 2026, a fresh registry-backed
`corepack pnpm audit --audit-level high` again reported zero Critical, zero High,
zero Moderate, and the same two Low findings. STAB-16 adds a required
`Dependency audit` job on pull requests, `master` pushes, weekly schedule, and
manual dispatch. That job succeeded on canonical `master` at `999443d`
(Security run 33034648784). Network/registry errors and High/Critical findings
remain fatal; no advisory is allowlisted and no exit code is suppressed.

PR dependency review remains separate because it reviews only the proposed
dependency diff. Weekly Dependabot monitoring now covers the root npm/pnpm
workspace, Pub in `/apps/mobile`, and immutable GitHub Action pins. This block
does not update either lockfile or any dependency.

### STAB-17 Playwright add

On 27 August 2026 STAB-17 added exact-pinned `@playwright/test` `1.62.1` as an
ERP devDependency and updated the pnpm lockfile. `corepack pnpm audit --audit-level high`
still reported **0 critical / 0 high / 0 moderate / 2 low**. Playwright did
not introduce a High or Critical advisory. The two lows remain
`@eslint/plugin-kit` and `@supabase/auth-js`. No advisory was allowlisted.

The automated whole-tree audit covers npm/pnpm only. Dependabot monitors Pub
updates, but Pub has no first-party vulnerability-audit command equivalent to
`pnpm audit`; Flutter/Dart vulnerability scanning remains an explicit gap. Do
not claim that Dependabot update monitoring is advisory scanning.

### Flutter/Dart

| Check                                                    | Result                                                                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct outdated                                          | 5 (`flutter_riverpod` 2.6.1→3.4.2 major; `flutter_secure_storage` 10.3.1→11.0.0 major; `google_fonts` 8.2.0→8.2.1 patch; `smooth_page_indicator` 1.2.1→3.0.0 major; `supabase_flutter` 2.16.0→2.17.2 minor) |
| Transitive outdated                                      | 14 lockfile-upgradable; additional SDK/transitive packages newer than locked                                                                                                                                |
| Discontinued (pub.dev `isDiscontinued`)                  | None on reviewed direct packages                                                                                                                                                                            |
| Official pub.dev advisories affecting installed versions | None. `http` has GHSA-4rgh-jx4f-qfcq / CVE-2020-35669 for **`<0.13.3`**; installed `http` is `1.6.0` (not affected)                                                                                         |
| OSV.dev `querybatch` vs `pubspec.lock` hosted packages   | **0 findings** (123 hosted packages queried)                                                                                                                                                                |
| Manifest/lockfile changes                                | **None**                                                                                                                                                                                                    |

Major Flutter upgrades (Riverpod 2→3, secure storage 10→11, page indicator 1→3) were not applied: they are not required to close a critical/high advisory and would change storage/state APIs. Ownership: later mobile security/support work after Phase 0, not silent currency upgrades.

SEC-06 update (28 August 2026): `supabase_flutter` was removed from the mobile
manifest after repository-wide usage proof. Normal lockfile regeneration
removed it and 30 now-unneeded transitive packages; `flutter pub get`, enforced
lockfile resolution, and `flutter pub deps` passed with no Flutter Supabase
package. The table above remains the STAB-03 currency snapshot; current direct
outdated counts must be recalculated in a future dependency-currency review.
No unrelated direct Flutter package was upgraded.

## Direct JavaScript inventory (final)

| Workspace                | Direct runtime                                                                                                                                                                                                                                         | Direct development/build                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Root                     | none                                                                                                                                                                                                                                                   | `prettier` `3.4.2`                                                                                               |
| `apps/backend`           | NestJS `11.2.3` (`common`/`core`/`platform-express`), `@nestjs/config` `4.0.4`, `@nestjs/jwt` `11.0.2`, `@nestjs/swagger` `11.4.7`, `nestjs-pino` `4.6.1`, `pg` `8.22.0`, `zod` `3.24.1`, `@supabase/supabase-js` `2.45.0`, plus existing runtime libs | `@nestjs/cli` `11.0.24`, `eslint` `9.17.0`, `typescript` `5.7.2`, `typescript-eslint` `8.18.1`, `vitest` `3.2.7` |
| `apps/erp-web`           | `next` `15.5.23`, `react`/`react-dom` `19.2.3`                                                                                                                                                                                                         | `eslint-config-next` `15.5.23`, `eslint` `9.17.0`, `typescript` `5.7.2`, `vitest` `3.2.7`                        |
| `packages/api-contracts` | `zod` `3.24.1`, workspace `shared-types`                                                                                                                                                                                                               | `eslint` `9.17.0`, `typescript` `5.7.2`, `typescript-eslint` `8.18.1`                                            |
| `packages/shared-types`  | none                                                                                                                                                                                                                                                   | `eslint` `9.17.0`, `typescript` `5.7.2`, `typescript-eslint` `8.18.1`                                            |

React 19.2.3 satisfies Next 15.5 peer range `^18.2.0` or `^19.0.0`. Nest packages remain on the 11.x line already in use (no 10→11 migration).

## Critical/high advisory register

All rows below were present at the start of STAB-03. Final status for every row is **FIXED**. No founder acceptance was used.

### Critical

| Advisory                           | Package  | Installed (start) | Path                   | Runtime/dev | Direct/transitive | Affected range / patched         | Exploitability in Mee Events                                                                                          | Action                                               | Residual        |
| ---------------------------------- | -------- | ----------------- | ---------------------- | ----------- | ----------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------- |
| GHSA-9qr9-h5gf-34mp                | `next`   | 15.1.3            | `apps/erp-web > next`  | Runtime     | Direct            | patched `>=15.1.9`               | React Flight RCE class. ERP has no `"use server"` today; still a production framework RCE class and a release blocker | Upgrade Next to **15.5.23** (15.x line; not Next 16) | None at 15.5.23 |
| GHSA-f82v-jwr5-mffw CVE-2025-29927 | `next`   | 15.1.3            | `apps/erp-web > next`  | Runtime     | Direct            | patched `>=15.2.3`               | Middleware authorization bypass. ERP has no `middleware.ts`; still a framework auth-bypass class                      | Same Next upgrade                                    | None at 15.5.23 |
| GHSA-9crc-q9x8-hgqq CVE-2025-24964 | `vitest` | 2.1.8             | backend + ERP `vitest` | Dev         | Direct            | patched `>=2.1.9`                | RCE if Vitest API/UI server is listening. Tests use `vitest run` only                                                 | Upgrade Vitest to **3.2.7**                          | None at 3.2.7   |
| GHSA-5xrq-8626-4rwp CVE-2026-47429 | `vitest` | 2.1.8             | backend + ERP `vitest` | Dev         | Direct            | patched `>=3.2.6` (no 2.x patch) | UI server path-traversal/RCE. Not used in CI (`vitest run`)                                                           | Same Vitest 3.2.7 upgrade                            | None at 3.2.7   |

### High — Next.js (all `apps/erp-web > next@15.1.3`, runtime, direct)

Patched by Next **15.5.23**. Smallest 15.x line covering GHSA-m99w / GHSA-89xv / GHSA-p9j2 is `>=15.5.21`; 15.5.23 is the current 15.5 patch.

| Advisory            | CVE            | Official patched |
| ------------------- | -------------- | ---------------- |
| GHSA-67rr-84xm-4c7r | CVE-2025-49826 | `>=15.1.8`       |
| GHSA-mwv6-3258-q52c | —              | `>=15.1.10`      |
| GHSA-h25m-26qc-wcjf | —              | `>=15.1.12`      |
| GHSA-q4gf-8mx6-v5v3 | —              | `>=15.5.15`      |
| GHSA-36qx-fr4f-26g5 | CVE-2026-44573 | `>=15.5.16`      |
| GHSA-8h8q-6873-q5fj | —              | `>=15.5.16`      |
| GHSA-c4j6-fc7j-m34r | CVE-2026-44578 | `>=15.5.16`      |
| GHSA-mg66-mrh9-m8jx | CVE-2026-44579 | `>=15.5.16`      |
| GHSA-m99w-x7hq-7vfj | CVE-2026-64641 | `>=15.5.21`      |
| GHSA-89xv-2m56-2m9x | CVE-2026-64649 | `>=15.5.21`      |
| GHSA-p9j2-gv94-2wf4 | CVE-2026-64645 | `>=15.5.21`      |

### High — other packages

| Advisory                           | Package           | Installed (start)                      | Path class                                | Runtime/dev               | Patched                                                                     | Action                                                                                                                                                                                                                                          |
| ---------------------------------- | ----------------- | -------------------------------------- | ----------------------------------------- | ------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHSA-j3q9-mxjg-w52f CVE-2026-4926  | `path-to-regexp`  | 8.2.0 then leftover 8.3.0 via swagger  | Nest core (runtime) and swagger (runtime) | Runtime                   | `>=8.4.0`                                                                   | Nest `11.2.3` + swagger `11.4.7` now resolve **8.4.2**                                                                                                                                                                                          |
| GHSA-r5fr-rjxr-66jc CVE-2026-4800  | `lodash`          | 4.17.21 / leftover 4.17.23 via swagger | `@nestjs/config`, swagger                 | Runtime                   | `>=4.18.0`                                                                  | `@nestjs/config` `4.0.4` + swagger `11.4.7` resolve **4.18.1**                                                                                                                                                                                  |
| GHSA-52cp-r559-cp3m CVE-2026-59869 | `js-yaml`         | 4.1.0                                  | swagger                                   | Runtime                   | `>=4.3.0`                                                                   | swagger `11.4.7` uses **js-yaml 5.3.0** (5.x fixed; not in 4.x affected range)                                                                                                                                                                  |
| GHSA-5p4m-2wfm-xmqj                | `js-yaml`         | 4.1.0 and 4.3.0                        | swagger + eslint/cosmiconfig              | Runtime + dev             | `>=4.3.1` (4.x); 5.2.1+ not affected                                        | swagger to 5.3.0; remaining 4.x pinned by override **4.3.1**                                                                                                                                                                                    |
| GHSA-5j98-mcp5-4vw2 CVE-2025-64756 | `glob`            | 11.0.1                                 | `@nestjs/cli`                             | Dev                       | `>=11.1.0`                                                                  | `@nestjs/cli` `11.0.24` now uses glob **13.0.6**                                                                                                                                                                                                |
| GHSA-c2c7-rcm5-vvqj CVE-2026-33671 | `picomatch`       | 4.0.2                                  | `@nestjs/cli` / angular-devkit            | Dev                       | `>=4.0.4`                                                                   | CLI upgrade resolves **4.0.4 / 4.0.5**                                                                                                                                                                                                          |
| GHSA-7p8r-x3mc-p8w7 CVE-2026-18446 | `fast-uri`        | 3.1.4                                  | nest CLI → ajv                            | Dev                       | `>=3.1.5`                                                                   | Override **fast-uri@3 → 3.1.6** (stay on 3.x; do not jump to 4.x)                                                                                                                                                                               |
| GHSA-2v37-7h3g-55p8 CVE-2026-67213 | `nanoid`          | 3.3.16                                 | next/postcss/vite                         | Runtime + dev             | `>=3.3.18`                                                                  | Override **nanoid@3 → 3.3.18**                                                                                                                                                                                                                  |
| GHSA-6g55-p6wh-862q CVE-2026-45623 | `postcss`         | 8.4.31                                 | `next` (pinned)                           | Runtime (build)           | `>=8.5.12`                                                                  | Override **postcss@8 → 8.5.26**                                                                                                                                                                                                                 |
| GHSA-r28c-9q8g-f849 CVE-2026-73646 | `postcss`         | 8.4.31                                 | `next`                                    | Runtime (build)           | `>=8.5.18`                                                                  | Same postcss override                                                                                                                                                                                                                           |
| GHSA-f88m-g3jw-g9cj                | `sharp`           | 0.33.5 then 0.34.5 via Next 15.5       | `next` optional                           | Runtime (image optimizer) | `>=0.35.0`                                                                  | Override **sharp → 0.35.3**. ERP does not configure `images`; local `next build` passed. Vercel tracing issues were reported against some Next 16.2 + sharp 0.35 combinations; this repo is Next 15.5.23. Revisit if ERP is deployed to Vercel. |
| GHSA-fx2h-pf6j-xcff CVE-2026-53571 | `vite`            | 5.4.21                                 | vitest                                    | Dev                       | `6.4.3` / `7.3.5` / `8.0.16` (no Vite 5 patch; affected includes `<=6.4.2`) | Override **vite → 6.4.3**. Vitest 3.2.7 officially depends on `vite ^5 \|\| ^6 \|\| ^7`. Windows `server.fs.deny` bypass; CI/tests use `vitest run`, not a networked Vite server                                                                |
| GHSA-mh99-v99m-4gvg CVE-2026-14257 | `brace-expansion` | 1.1.16 / 2.1.2                         | eslint, typescript-eslint, nest CLI       | Dev                       | `>=1.1.17` / `>=2.1.3`                                                      | Overrides **1.1.18** and **2.1.4**                                                                                                                                                                                                              |
| GHSA-rgw5-rvv9-x895 CVE-2026-69152 | `brace-expansion` | 1.1.16 / 2.1.2 / 5.0.8                 | same + glob minimatch                     | Dev                       | `>=1.1.18` / `>=2.1.4` / `>=5.0.9`                                          | Same + **brace-expansion@5 → 5.0.9**                                                                                                                                                                                                            |

Transitive and development findings were not dismissed because they were “not currently reachable.” They were patched.

## Upgrades performed

Exact pins (`save-exact=true`). No `pnpm audit --fix --force`, no workspace `--latest`, no lockfile regeneration from scratch.

| Package                                      | From   | To      | Why                                                                                                                                |
| -------------------------------------------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `next`                                       | 15.1.3 | 15.5.23 | All Next critical/high on 15.x; stay off Next 16                                                                                   |
| `eslint-config-next`                         | 15.1.3 | 15.5.23 | Match Next                                                                                                                         |
| `vitest` (backend, ERP)                      | 2.1.8  | 3.2.7   | Critical vitest; 3.2.6+ required; Vitest 5 needs Node 22                                                                           |
| `@nestjs/common`, `core`, `platform-express` | 11.0.1 | 11.2.3  | `path-to-regexp` 8.4.2                                                                                                             |
| `@nestjs/config`                             | 4.0.0  | 4.0.4   | `lodash` 4.18.1                                                                                                                    |
| `@nestjs/jwt`                                | 11.0.0 | 11.0.2  | Align Nest 11.2 line                                                                                                               |
| `@nestjs/swagger`                            | 11.0.3 | 11.4.7  | `lodash` 4.18.1, `path-to-regexp` 8.4.2, `js-yaml` 5.3.0. Public API only (`DocumentBuilder`, decorators); no `dist/` deep imports |
| `@nestjs/cli`                                | 11.0.0 | 11.0.24 | `glob` / `picomatch`                                                                                                               |

React/React DOM were already 19.2.3 and were not bumped.

## Overrides

Root `package.json` `pnpm.overrides`. Each pin is an exact patched version. They exist because the owning direct dependency still requests a vulnerable range. They are not audit-silencing of unpatched code.

| Override            | Pin    | Why required                                                           | Remove when                              |
| ------------------- | ------ | ---------------------------------------------------------------------- | ---------------------------------------- |
| `brace-expansion@1` | 1.1.18 | eslint 9.17 / minimatch 3 still requested 1.1.16                       | eslint/minimatch pull >=1.1.18           |
| `brace-expansion@2` | 2.1.4  | typescript-eslint 8.18 minimatch 9                                     | typescript-eslint/minimatch pull >=2.1.4 |
| `brace-expansion@5` | 5.0.9  | nest CLI glob → minimatch 10                                           | CLI/glob pull >=5.0.9                    |
| `fast-uri@3`        | 3.1.6  | ajv 8 still requested 3.1.4                                            | ajv/angular-devkit pull >=3.1.5          |
| `js-yaml@4`         | 4.3.1  | eslint/cosmiconfig still on 4.3.0; do **not** force swagger’s 5.x down | eslint stack pulls >=4.3.1               |
| `nanoid@3`          | 3.3.18 | postcss/next still requested 3.3.16                                    | next/postcss pull >=3.3.18               |
| `postcss@8`         | 8.5.26 | Next 15.5.23 still depends on `postcss` `8.4.31`                       | Next ships >=8.5.18                      |
| `sharp`             | 0.35.3 | Next 15.5.23 optionalDependency `^0.34.3`                              | Next ships `^0.35.0`                     |
| `vite`              | 6.4.3  | Vitest 3.2.7 resolved Vite 5.4.21; GHSA has no Vite 5 patch            | Vitest default resolution is >=6.4.3     |

Lockfile confirms resolved versions: `next@15.5.23`, `vitest@3.2.7`, `vite@6.4.3`, `sharp@0.35.3`, `postcss@8.5.26`, `lodash@4.18.1`, `path-to-regexp@8.4.2`, `js-yaml@4.3.1` and `5.3.0`.

## Remaining vulnerabilities (low only)

| Advisory                           | Package              | Installed | Path                                                              | Runtime/dev                                                             | Patched                                              | Exploitability                                                                                                                                                       | Ownership                                                                                                                 |
| ---------------------------------- | -------------------- | --------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GHSA-8r88-6cj9-9fh5 CVE-2025-48370 | `@supabase/auth-js`  | 2.64.4    | `apps/backend > @supabase/supabase-js@2.45.0 > @supabase/auth-js` | Runtime library, **admin UUID APIs** (`getUserById` / `deleteUser` / …) | GHSA patched `>=2.69.1`; pnpm audit lists `>=2.70.0` | Backend uses supabase-js from local scripts/adapters, not as the auth source of truth (NestJS owns auth). Malformed UUID path routing in admin helpers. Low severity | Upgrade backend `@supabase/supabase-js` in a later scoped dependency slice; SEC-06 removed the separate mobile dependency |
| GHSA-xffm-g5w8-qvg7                | `@eslint/plugin-kit` | 0.2.8     | `eslint@9.17.0 > @eslint/plugin-kit` (all TS workspaces)          | Dev                                                                     | `>=0.3.4`                                            | ReDoS in `ConfigCommentParser` if ESLint parses attacker-controlled comment config. ESLint is not a public service                                                   | Later scoped dependency-security update; STAB-16 intentionally changes no dependency                                      |

No moderate findings remain. Lows are not accepted critical/high risk.

## Accepted risks

None.

## Blockers

None for STAB-03. The Node toolchain pin is enforced by STAB-16 CI on
canonical `master` at `999443d`.

## Supply-chain review

| Control                                 | Result                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registries                              | pnpm-lock.yaml `lockfileVersion` 9.0; no `git+`, GitHub tarball, or non-npm registry URLs                                                                                                               |
| Workspace sources                       | `workspace:*` / `link:` only for `@me-event/*`                                                                                                                                                          |
| Flutter sources                         | hosted pub.dev + Flutter SDK; `publish_to: none`; no git/path packages                                                                                                                                  |
| `.npmrc`                                | `engine-strict=true`, `frozen-lockfile=false` (local), `save-exact=true`. No registry tokens or credential URLs                                                                                         |
| CI                                      | `CI` and `Security` use frozen pnpm installs on Node `20.20.2`; `Dependency audit` fails on High/Critical                                                                                               |
| Lifecycle scripts reviewed              | `esbuild@0.25.12` `postinstall` (already in `pnpm-workspace.yaml` `onlyBuiltDependencies`); `sharp@0.35.3` has no install script; `vite`/`next`/`vitest` have none; swagger `prepare` is publisher-side |
| Built deps allowlist                    | Unchanged: `@nestjs/core`, `esbuild`, `sharp`, `unrs-resolver` allowed; `@scarf/scarf` and `nestjs-pino` ignored                                                                                        |
| Dependabot / scheduled SCA              | STAB-16 weekly npm/pnpm, Pub, and GitHub Actions monitoring plus `pnpm audit` ran green on `999443d`; Dependabot **security updates/alerts** remain disabled                                            |
| Packages added only to greenwash audits | None                                                                                                                                                                                                    |

## Compatibility changes

- ERP `next.config.ts`: `experimental.typedRoutes` moved to `typedRoutes` (Next 15.5). `outputFileTracingRoot` set to the monorepo root so Next 15.5 does not infer a parent-directory lockfile.
- `next build` rewrites `apps/erp-web/next-env.d.ts` to reference `.next/types/routes.d.ts`. That generated reference is **not committed**; CI typecheck runs before `next build` and must not depend on `.next`.

No API contract, migration, or authentication logic changes.

## Verification evidence (STAB-03)

| Check                            | Result                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | PASS                                                                                    |
| `pnpm format:check`              | PASS (lockfile Prettier-formatted after regeneration; no unrelated reformat)            |
| `pnpm lint`                      | PASS                                                                                    |
| `pnpm typecheck`                 | PASS                                                                                    |
| Backend tests                    | **188/188 PASS** (Vitest 3.2.7)                                                         |
| ERP tests                        | **8/8 PASS**                                                                            |
| Shared package builds            | PASS (`shared-types`, `api-contracts`)                                                  |
| Backend `nest build`             | PASS                                                                                    |
| ERP `next build` (15.5.23)       | PASS                                                                                    |
| Flutter `pub get`                | PASS; lockfile unchanged                                                                |
| Flutter analyze/tests            | Not re-run as a stabilization gate; no Flutter manifest/lockfile change. OSV 0 findings |
| `pnpm audit` after remediation   | 0 critical, 0 high, 0 moderate, 2 low                                                   |
| Controls disabled                | None                                                                                    |

These compatibility builds do **not** close STAB-11, STAB-12, or STAB-13.

**STAB-18 pointer (27 August 2026):** the backend **188/188** row is the
STAB-03 freeze. Current unit suite is **190/190** after STAB-15. See
[testing-strategy.md](../08-testing/testing-strategy.md).

## Safe future upgrade policy

1. Prefer the smallest patched version on the current major line.
2. Do not run force-fix, blanket `--latest`, or `flutter pub upgrade --major-versions`.
3. Do not delete lockfiles. Let the package manager update only affected resolution.
4. Do not add an override when upgrading the owning direct dependency is sufficient.
5. Overrides must pin an exact patched version, record removal conditions, and be re-verified in `pnpm why` / lockfile.
6. After any dependency change: frozen install, audit (full + prod), lint, typecheck, tests, and affected production builds.
7. Next 16, Vitest 5 / Node 22, Riverpod 3, and `flutter_secure_storage` 11 are **planned migrations**, not silent patches.
8. Re-audit before release; do not reuse these counts after the advisory database moves.
