# CI Verification Baseline

- **Task:** STAB-16 — CI Verification
- **Date:** 27 August 2026 (Asia/Kolkata)
- **Repository:** `/Users/vinaychilagani/Desktop/Mee Event V1`
- **Branch:** `master`
- **Starting commit:** `2be574809d9b4bf053296b727e1437a8b93290f5`
- **Starting upstream state:** `master...origin/master`, ahead 19, behind 0
- **Result:** **IMPLEMENTED LOCALLY — REMOTE GITHUB VERIFICATION PENDING**
- **Phase 0:** **NOT PASSED**
- **STAB-16 MASTER_TODO:** `[~]` PARTIAL; not complete
- **STAB-17:** **NOT AUTHORIZED** until remote GitHub verification of these workflows

This document records the committed workflow design and what was proved locally
on 27 August 2026. A local validator cannot prove that a GitHub-hosted runner,
required status check, or native repository security feature is working.
STAB-16 therefore remains partial until the committed workflows run
successfully on GitHub from canonical `master` or a pull request.

## Previous task acceptance

STAB-15 was independently source-reviewed on 27 August 2026 and is **ACCEPTED
WITH FINDINGS**. This STAB-16 session re-ran the existing harness once:

`corepack pnpm test:integration:backend` with the CI JUnit reporters passed
3/3 files and 21/21 cases on official PostgreSQL 17.2. The suite was not
redesigned. Retained open findings are unchanged: `SEC-02`, remaining
`SEC-03`, `SEC-04`, `INT-02`, `SEC-M-09`, eight untested adapters, and
HTTP/Redis/E2E/coverage/production database.

## GitHub baseline

Authenticated read-only inspection on 27 August 2026 (`gh` as `mee-events`)
established:

- `git ls-remote --symref origin HEAD` resolves the remote default branch to
  `refs/heads/master` at `9e2a442d91c137ec97a349d1a55697ae8d79d5df`.
- The remote advertises only `refs/heads/master`. Local `refs/remotes/origin/HEAD`
  still stale-points at `origin/main`; that is local metadata only. No remote
  setting was changed. The obsolete `main` push trigger is absent from the
  committed workflows.
- The only pre-STAB-16 remote workflow is `.github/workflows/ci.yml`.
- Latest remote CI success: push of `9e2a442`, run completed 24 August 2026.
  None of the 19 local commits ahead of `origin/master`, including this CI
  configuration, has been run by GitHub.
- Repository is public; default branch is `master`.
- Branch protection on `master`: **NOT CONFIGURED** (`404 Branch not protected`).
- Secret scanning: **disabled**. Push protection: **disabled**.
  Non-provider-pattern scanning and validity checks: **disabled**.
- Dependabot security updates: **disabled**. Dependabot alerts:
  **disabled** (`403`). Vulnerability alerts: **disabled**.
- Code scanning: **no analysis found**.

No push, pull request, branch-protection mutation, repository-security
mutation, deployment, package publication, or credential write was performed.

## Previous CI state

The previous workflow ran TypeScript quality, Flutter quality plus a dev-debug
APK build, and PR-only dependency review. It used floating `ubuntu-latest`,
floating Node `20`, mutable major action tags, and both `master` and obsolete
`main` push triggers. It had no root Node pin, PostgreSQL integration job,
scheduled dependency audit, Dependabot configuration, secret gate, or CodeQL.
The ERP build used its development API fallback. Flutter passed unused
`APP_ENV=dev`, relied on the default `BRANCH_CODE`, and used ordinary
`flutter pub get` without enforcing the lockfile.

## Resulting workflow and trigger matrix

| Workflow   | Stable job/check name              | Pull request | Push to `master` | Schedule            | Manual | Timeout |
| ---------- | ---------------------------------- | -----------: | ---------------: | ------------------- | -----: | ------: |
| `CI`       | `TypeScript quality`               |          yes |              yes | no                  |     no |  25 min |
| `CI`       | `Backend PostgreSQL integration`   |          yes |              yes | no                  |     no |  20 min |
| `CI`       | `Flutter development verification` |          yes |              yes | no                  |     no |  30 min |
| `CI`       | `Dependency review`                |          yes |          skipped | no                  |     no |  10 min |
| `Security` | `Dependency audit`                 |          yes |              yes | Monday 02:23 UTC    |    yes |  15 min |
| `Security` | `Secret scan`                      |          yes |              yes | Monday 02:23 UTC    |    yes |  15 min |
| `CodeQL`   | `CodeQL JavaScript/TypeScript`     |          yes |              yes | Wednesday 03:41 UTC |    yes |  30 min |

Each workflow's concurrency key contains the workflow name, event name, and Git
ref. A newer run can cancel an older run for the same workflow/event/ref without
cancelling a different workflow or event.

## Pinned toolchains and runner

| Tool          | Pin                             | Source of use                                  |
| ------------- | ------------------------------- | ---------------------------------------------- |
| GitHub runner | `ubuntu-24.04`                  | every job                                      |
| Node.js       | `20.20.2`                       | root `.node-version`, consumed by `setup-node` |
| pnpm          | `9.15.4`                        | root `packageManager` and pinned setup input   |
| Flutter       | `3.44.8`, stable channel        | pinned Flutter action input                    |
| Dart          | supplied by Flutter 3.44.8      | no independent drift                           |
| PostgreSQL    | official `postgres:17.2-alpine` | existing isolated integration harness          |
| Gitleaks      | `8.30.1`                        | immutable release archive plus SHA-256         |

The root engine remains Node `>=20.11.0`; the conventional pin narrows the
verified development/CI version without weakening that requirement.
`setup-node` installs the exact Node pin and `flutter-action` installs the exact
Flutter pin, so neither depends on the runner's preinstalled Node or Flutter.

## Immutable actions

Each SHA below was independently resolved on 27 August 2026 with
`git ls-remote` against the upstream repository. Annotated tags use the
dereferenced commit. Dependabot's `github-actions` ecosystem will propose
reviewed SHA updates.

| Action                             | Intended release      | Immutable commit SHA                       | Official release evidence                                                    |
| ---------------------------------- | --------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| `actions/checkout`                 | v7.0.1                | `3d3c42e5aac5ba805825da76410c181273ba90b1` | <https://github.com/actions/checkout/releases/tag/v7.0.1>                    |
| `actions/setup-node`               | v7.0.0                | `820762786026740c76f36085b0efc47a31fe5020` | <https://github.com/actions/setup-node/releases/tag/v7.0.0>                  |
| `pnpm/action-setup`                | v6.0.10               | `0977fd99725f1db4007ccb2928dbb4e90d06cc86` | <https://github.com/pnpm/action-setup/releases/tag/v6.0.10>                  |
| `subosito/flutter-action`          | v2.23.0               | `1a449444c387b1966244ae4d4f8c696479add0b2` | <https://github.com/subosito/flutter-action/releases/tag/v2.23.0>            |
| `actions/dependency-review-action` | v5.0.0                | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | <https://github.com/actions/dependency-review-action/releases/tag/v5.0.0>    |
| `actions/upload-artifact`          | v7.0.1                | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | <https://github.com/actions/upload-artifact/releases/tag/v7.0.1>             |
| `github/codeql-action/init`        | CodeQL bundle v2.26.4 | `486fec2a3ea2626afcd8c7e9208b4f515078dd7e` | <https://github.com/github/codeql-action/releases/tag/codeql-bundle-v2.26.4> |
| `github/codeql-action/analyze`     | CodeQL bundle v2.26.4 | `486fec2a3ea2626afcd8c7e9208b4f515078dd7e` | <https://github.com/github/codeql-action/releases/tag/codeql-bundle-v2.26.4> |

Gitleaks is intentionally installed without another action. Official
`gitleaks_8.30.1_checksums.txt` accepts `gitleaks_8.30.1_linux_x64.tar.gz` only
when its SHA-256 is
`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`.
The Darwin ARM64 archive used for local proof matched upstream SHA-256
`b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`.

## Permissions and untrusted pull requests

| Workflow/job                   | Effective explicit permissions             | Reason                                   |
| ------------------------------ | ------------------------------------------ | ---------------------------------------- |
| `CI` jobs                      | `contents: read`                           | checkout and read-only verification      |
| `Security` jobs                | `contents: read`                           | checkout, registry audit, and local scan |
| `CodeQL JavaScript/TypeScript` | `contents: read`, `security-events: write` | checkout and SARIF upload only           |

There is no `pull_request_target`, write credential, application/provider
secret, OIDC permission, package/repository/deployment write, issue/PR write,
or Actions write permission. Checkout disables persisted credentials in every
job. PR-controlled code runs only with the read-only pull-request token; no PR
title, body, branch name, or other event text is interpolated into a shell
command. The CodeQL job alone receives `security-events: write`, which GitHub
downgrades for untrusted fork pull requests according to platform policy.

## Cache behavior

Node jobs use `setup-node`'s pnpm store cache keyed from `pnpm-lock.yaml`.
Flutter uses the maintained action's SDK/package cache. Caches contain public
dependencies and tool output only; no application secret, `.env`, database,
report, APK, or build artifact is cached. Installs remain frozen/enforced, so a
cache hit cannot override either lockfile.

## Quality and build commands

The TypeScript job performs, in order:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @me-event/shared-types build
corepack pnpm --filter @me-event/api-contracts build
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
NEXT_PUBLIC_APP_ENV=production \
NEXT_PUBLIC_API_BASE_URL=https://api.ci.mee-events.invalid/api/v1 \
  corepack pnpm build
```

The two ERP variables are public compile-time configuration. The reserved
`.invalid` HTTPS hostname cannot resolve to a real service, and no backend or
provider credential is supplied.

The Flutter job copies the committed public `.env.example`, enforces
`pubspec.lock`, runs formatting, fatal-info analysis, all tests, and this exact
development-only command:

```sh
flutter build apk --debug --flavor dev \
  --dart-define=API_BASE_URL=http://10.0.2.2:3002/api/v1 \
  --dart-define=BRANCH_CODE=HYD
```

Unused `APP_ENV=dev` was removed. The emulator-only API URL and `HYD` branch are
explicit. This is not a production, release, signed, store, or deployment
artifact.

## PostgreSQL integration and report

The dedicated job uses a fresh checkout, frozen install, and explicit shared
workspace builds before:

```sh
corepack pnpm test:integration:backend -- \
  --reporter=default \
  --reporter=junit \
  --outputFile.junit="${RUNNER_TEMP}/backend-integration.xml"
```

The existing STAB-15 harness remains the only PostgreSQL provisioner. It creates
a unique loopback-only `mee-dbint-*` Compose project using the accepted official
PostgreSQL 17.2 image, applies all 20 migrations, preserves Vitest's fail-on-zero
behavior, and trap-removes its exact container, network, and volume. No workflow
`services: postgres:` block duplicates the database. `DATABASE_URL` is not read
from GitHub secrets.

This session invoked that exact extra-arg path. pnpm forwarded `--` plus the
reporter flags into `run-postgres-integration.sh`, which stripped the separator
and passed the remainder to Vitest. The run passed 3/3 files and 21/21 tests.
The 5,959-byte JUnit report parsed as XML, declared 21 tests with 0 failures and
0 errors, and contained no `postgresql://` URL, harness password,
`DATABASE_URL`, authorization, token, API-key, environment dump, container log,
or database dump pattern. Docker label inventory after exit found no leftover
`mee-dbint-*` container, volume, or network.

Only that exact XML file is uploaded, including after a test failure when it
exists, as `backend-postgresql-integration-report` for three days. A missing
report warns without replacing the test command's failure. No database dump,
container log, environment output, token, cache, build tree, or test directory
is uploaded.

The development debug APK is not uploaded. No backend or ERP artifact is
uploaded.

## Dependency security policy

- PR dependency review remains a separate non-duplicative diff gate.
- `pnpm audit --audit-level high` runs on PRs, canonical pushes, the weekly
  schedule, and manual dispatch. Registry/network errors are not suppressed.
- This session's local audit passed the required gate with zero Critical and
  zero High findings. It reports two accepted Low findings documented in
  `docs/05-security/dependency-security.md`; they do not alone fail the
  whole-tree audit.
- Dependabot monitors the root npm/pnpm workspace, `/apps/mobile` Pub lockfile,
  and all GitHub Actions weekly against `master`. It changes no dependency in
  this block.
- The chosen runtime audit command covers npm/pnpm, not Flutter/Dart. Pub
  Dependabot provides update monitoring, but there is no first-party Pub audit
  gate equivalent to `pnpm audit`; Flutter vulnerability scanning remains an
  explicit gap and is not claimed as covered.

No advisory, package, path, severity, or registry error is allowlisted or
silenced.

## Secret scanning policy

Gitleaks scans the full checked-out Git history on pull requests, canonical
pushes, schedule, and manual dispatch. Checkout uses `fetch-depth: 0`; scanner
output is fully redacted and no report artifact is uploaded. There is no path,
extension, entropy, rule, or repository-wide exclusion and no scanner config or
allowlist.

Local Gitleaks 8.30.1 scanned all 29 commits and approximately 24 MB with zero
leaks. A temporary untracked synthetic GitHub-PAT-shaped canary caused the same
scanner to exit 1 with one redacted `github-pat` finding; the canary was then
deleted and is neither tracked nor documented as a value.

**FOUNDER ACTION REQUIRED — enable GitHub secret scanning and push protection
after the repository is updated.** Authenticated read-only evidence on
27 August 2026 shows both are currently disabled. Do not enable them from this
block.

## CodeQL / SAST

CodeQL is configured only for JavaScript/TypeScript using build mode `none` on
PRs, canonical pushes, manual dispatch, and a weekly schedule. It does not
duplicate lint, typecheck, tests, or application builds. Its action is pinned to
the CodeQL bundle v2.26.4 commit and only its job can write security events.

The public repository is expected to support CodeQL, but SARIF upload was not
remotely executed. Authenticated inspection found no code-scanning analysis.
If GitHub rejects the upload because code scanning or the repository plan is
unavailable, remote SAST verification is **BLOCKED** until the founder enables
GitHub code scanning/Advanced Security as applicable. Do not replace this with
an unreviewed scanner or mark SAST green from local YAML validation.

## Local verification evidence

Recorded on 27 August 2026 from commit `2be5748` plus this STAB-16 working tree.
Host toolchain: Node `v20.20.2`, pnpm `9.15.4`, Flutter `3.44.8` / Dart `3.12.2`.

| Gate                                          | Result                                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen pnpm install                           | PASS; lockfile up to date, already installed                                                                                                              |
| Shared types / API contracts                  | PASS                                                                                                                                                      |
| TypeScript format/lint/typecheck/unit/build   | PASS; backend 30 files / 190 tests; ERP 3 files / 8 tests; synthetic production `pnpm build` compiled ERP                                                 |
| PostgreSQL integration + CI JUnit path        | PASS; 3/3 files, 21/21 tests; 5,959-byte sanitized XML; no leftover `mee-dbint-*` resources                                                               |
| Flutter locked resolution / format / analysis | PASS; 200 files, 0 changed, no diagnostics                                                                                                                |
| Flutter tests                                 | PASS; 441/441                                                                                                                                             |
| Flutter development-only debug APK            | **LOCAL GAP this session:** Gradle wrapper timed out twice downloading `gradle-9.1.0-all`; STAB-13 previously proved the same command; workflow unchanged |
| `pnpm audit --audit-level high`               | PASS; zero Critical/High, two documented Low                                                                                                              |
| Repository Gitleaks scan                      | PASS; 29 commits, ~24 MB, zero leaks                                                                                                                      |
| Synthetic secret canary                       | PASS; scanner exited 1 with one redacted finding; canary removed                                                                                          |
| actionlint 1.7.12                             | PASS; checksum-verified upstream Darwin ARM64 binary                                                                                                      |
| Remote GitHub workflows                       | **NOT PERFORMED**                                                                                                                                         |

TypeScript format, lint, typecheck, unit tests, and the synthetic production
build were re-run after documentation formatting and all passed. This session
could not finish the debug APK because the Gradle wrapper timed out connecting
to `services.gradle.org` twice; that is a local network gap, not a workflow
change. STAB-13 previously compiled the same development-only command.

## Required checks and branch-policy recommendation

Proposed stable required checks, after each exists remotely and has succeeded:

1. `TypeScript quality`
2. `Backend PostgreSQL integration`
3. `Flutter development verification`
4. `Dependency review`
5. `Dependency audit`
6. `Secret scan`
7. `CodeQL JavaScript/TypeScript` when GitHub accepts CodeQL uploads

Recommended `master` policy after remote verification:

- require a pull request and all available checks above;
- dismiss stale approvals after new commits;
- require conversation resolution;
- disallow force pushes and branch deletion;
- apply the policy to administrators, with a named founder-owned emergency
  bypass used only for documented incidents;
- do not require a security check until GitHub has emitted its exact successful
  check name, because an unavailable required context can deadlock merges;
- configure the policy only after the reviewed local commits are pushed and
  every workflow has completed successfully.

Branch protection is **NOT VERIFIED OR CONFIGURED** in this block. The names
above are proposals only.

## Findings, limitations, and blockers

| Severity      | STAB-16 finding                                                            | Status                                                                                 |
| ------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Critical      | None                                                                       | no CI blocker found locally                                                            |
| High          | None specific to this CI implementation                                    | existing `SEC-02`, remaining `SEC-03`, `SEC-04`, `INT-02` remain open product findings |
| Medium        | Branch protection and native repository security features are disabled     | founder verification after push; do not enable here                                    |
| Medium        | CodeQL SARIF acceptance has no remote proof                                | remote run required; founder/plan action if rejected                                   |
| Low           | The whole-tree pnpm audit retains two documented Low advisories            | accepted STAB-03 follow-up; no silent allowlist                                        |
| Informational | Pub has update monitoring but no first-party audit gate equivalent to pnpm | explicit Flutter SCA gap                                                               |
| Informational | No remote run covers the 19 local commits or these workflows               | STAB-16 completion blocker                                                             |

This task adds no E2E framework, coverage threshold, production build, release
signing, iOS work, deployment/CD, cloud credential, staging/production access,
provider integration, store workflow, or branch-setting mutation. It does not
close `SEC-02`, remaining `SEC-03`, `SEC-04`, `SEC-M-09`, or `INT-02`.

## Remote status and rollback

**Remote GitHub verification: NOT PERFORMED.** Required check names remain
proposals until GitHub emits them. STAB-16 must not be marked complete and
STAB-17 must not begin.

If independent review rejects this local implementation, revert the single
STAB-16 commit with an ordinary `git revert` after identifying its exact SHA.
If workflows have already been pushed, revert rather than rewriting canonical
history. No artifact or infrastructure rollback is needed because this block
does not deploy or mutate remote settings. If branch protection is configured
later, change required checks only in a separately authorized founder action
after the revert workflow has run and its check names are known.

## Next authorized action

Founder authorization is required before pushing the reviewed local `master`
commits and observing GitHub Actions. Keeping the commits local leaves STAB-16
partial and keeps STAB-17 unauthorized.
