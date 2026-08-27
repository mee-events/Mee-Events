# CI / CD

Continuous integration is defined by:

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- [`.github/workflows/security.yml`](../../.github/workflows/security.yml)
- [`.github/workflows/codeql.yml`](../../.github/workflows/codeql.yml)
- [`.github/dependabot.yml`](../../.github/dependabot.yml)

Canonical evidence, exact action SHAs, permissions, retention, local results,
branch-policy guidance, and remote limitations are in
[ci-verification-baseline.md](./ci-verification-baseline.md).

There is **no deployment/CD workflow**. CI does not deploy, publish a package or
container, sign a mobile release, access staging/production, or configure GitHub
repository settings. Product intent for future deploy stages is in
[PRD 10 — Deployment & DevOps](../product/prd/10-deployment-devops-prd-v1.md).

## Triggers

| Workflow   | Pull request                | Push     | Schedule            | Manual |
| ---------- | --------------------------- | -------- | ------------------- | ------ |
| `CI`       | yes                         | `master` | no                  | no     |
| `Security` | yes                         | `master` | Monday 02:23 UTC    | yes    |
| `CodeQL`   | yes                         | `master` | Wednesday 03:41 UTC | yes    |
| Dependabot | creates reviewed update PRs | no       | weekly              | no     |

Read-only remote evidence confirms `master` is GitHub's default and only
advertised branch. The obsolete `main` push trigger was removed. Workflow
concurrency is isolated by workflow, event, and ref.

## Toolchains and runner

Every job uses fixed `ubuntu-24.04`. Node comes from root `.node-version` at
`20.20.2`; pnpm is `9.15.4`; Flutter is `3.44.8` stable with its supplied Dart;
the database harness uses official PostgreSQL `17.2-alpine`. All GitHub Actions
are pinned to full release commit SHAs and have an adjacent release comment.
Dependabot monitors those SHA pins.

## CI jobs

### `TypeScript quality`

Uses a fresh checkout with no persisted credentials, frozen pnpm install,
explicit shared-types/API-contract builds, formatting, lint, typecheck, unit
tests, and recursive backend/ERP builds. The ERP build receives only synthetic
public production variables:

```text
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.ci.mee-events.invalid/api/v1
```

The `.invalid` HTTPS hostname verifies the production public-environment
boundary without a real endpoint or private credential.

### `Backend PostgreSQL integration`

Runs `corepack pnpm test:integration:backend` through the existing isolated
`mee-dbint-*` harness after frozen install and shared builds. The harness alone
provisions PostgreSQL, applies migrations, validates identity, fails on zero
tests, and removes its exact container/network/volume. CI uploads only the
sanitized JUnit XML for three days, including after failure when present.

### `Flutter development verification`

Enforces `pubspec.lock`, checks formatting, runs fatal-info analysis and all
tests, then builds a development-only debug APK with the emulator API URL and
explicit `BRANCH_CODE=HYD`. The unused `APP_ENV` define is gone. The APK is not
uploaded and is not a production/release/store artifact.

### `Dependency review`

Runs only for pull requests. It reviews the dependency diff and receives no
write permission.

## Security jobs

`Dependency audit` installs from the frozen pnpm lockfile and runs
`pnpm audit --audit-level high`; High/Critical findings and registry errors fail
the job. The two documented Low findings do not fail the whole-tree audit.

`Secret scan` installs Gitleaks 8.30.1 from an immutable, SHA-256-verified
upstream archive and scans full Git history with complete redaction. It has no
allowlist or broad exclusion and uploads no report.

`CodeQL JavaScript/TypeScript` uses build mode `none` and does not repeat lint,
typecheck, tests, or builds. Only that job receives `security-events: write`;
all jobs otherwise use `contents: read`. The CodeQL job succeeded on canonical
`master` at `999443d` (run 33034648777). Required-check names remain proposals
until the founder configures branch protection.

## Artifacts and caches

| Item                                | Retained | Policy                                |
| ----------------------------------- | -------- | ------------------------------------- |
| Sanitized PostgreSQL JUnit XML      | yes      | exact file, 3 days                    |
| Development debug APK               | no       | build exit only; not release evidence |
| Backend/ERP build output            | no       | compilation gate only                 |
| Environment/database/container logs | no       | forbidden                             |

Node caches only the pnpm store keyed by `pnpm-lock.yaml`; Flutter caches its
SDK/package data. No cache contains application secrets, `.env`, databases, or
artifacts. Frozen/enforced lockfile checks remain authoritative.

## Remote and branch-policy status

STAB-16 is **DONE WITH FINDINGS**. Canonical `master` at `999443d` ran green
on 27 August 2026: CI `33034648786`, Security `33034648784`, CodeQL
`33034648777`. `Dependency review` skipped on that push, as expected. Artifact
`backend-postgresql-integration-report` was uploaded.

Authenticated inspection the same day (`gh` as `mee-events`) still shows
branch protection on `master` **not configured**, secret scanning and push
protection **disabled**, and Dependabot security updates/alerts **disabled**.
None of those settings were mutated.

Proposed required checks are `TypeScript quality`,
`Backend PostgreSQL integration`, `Flutter development verification`,
`Dependency review`, `Dependency audit`, `Secret scan`, and
`CodeQL JavaScript/TypeScript`. Configure them only in a separately authorized
founder action; the names remain proposals until protection is set. See the
baseline for run URLs and the founder-owned policy plan.

## What CI still does not prove

- browser, API, device, or end-to-end behavior;
- a coverage percentage or threshold;
- production Android/iOS compilation, signing, permissions, or store delivery;
- backend/ERP packaging, startup, reproducibility, attestation, or deployment;
- provider, cloud, staging, production, backup/restore, load, or rollback;
- branch-protection or GitHub-native security-feature enforcement.

## Related

- [ci-verification-baseline.md](./ci-verification-baseline.md)
- [environment.md](./environment.md)
- [backend-build-baseline.md](./backend-build-baseline.md)
- [erp-build-baseline.md](./erp-build-baseline.md)
- [flutter-build-baseline.md](./flutter-build-baseline.md)
