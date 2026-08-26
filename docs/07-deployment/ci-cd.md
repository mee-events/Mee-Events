# CI / CD

Continuous integration lives in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
There is **no deploy / CD workflow** in this repository yet.

Product intent for future deploy stages:
[PRD 10 — Deployment & DevOps](../product/prd/10-deployment-devops-prd-v1.md).

---

## Triggers

| Event                       | Behavior                       |
| --------------------------- | ------------------------------ |
| `pull_request`              | Runs all applicable jobs       |
| `push` to `master` / `main` | Runs TypeScript + Flutter jobs |

**Concurrency:** `ci-${{ github.ref }}` with `cancel-in-progress: true`.

Default `permissions.contents: read`. Dependency review elevates only what that
action needs on PRs.

---

## Jobs

### 1. `typescript`

- Runner: `ubuntu-latest`, timeout 20 minutes
- Node 20, pnpm `9.15.4`, `pnpm install --frozen-lockfile`
- Steps in order:
  1. Build `@me-event/shared-types`, then `@me-event/api-contracts`
  2. `pnpm format:check`
  3. `pnpm lint`
  4. `pnpm typecheck`
  5. `pnpm test`
  6. `pnpm build`

Local quality-gate parity: `corepack pnpm verify`. CI additionally prebuilds
the shared packages before the formatted/linted/typechecked/tested recursive
workspace sequence.

STAB-11 independently proved that the backend's `nest build` artifact is
byte-for-byte reproducible and secret-safe under the recorded local toolchain.
CI compiles it through the recursive root build but does not retain, smoke,
package, hash, attest, or deploy it. See
[backend-build-baseline.md](./backend-build-baseline.md).

STAB-12 independently proved two clean ERP builds and a loopback-only
production start using an explicit synthetic production API URL. CI reaches the
same `next build` script after the same shared-package build order, but it does
not set `NEXT_PUBLIC_APP_ENV=production` or `NEXT_PUBLIC_API_BASE_URL`.
Consequently, CI currently compiles against the documented development fallback
instead of verifying the production public-environment boundary. It also does
not retain, hash, attest, start, or deploy the ERP artifact. See
[erp-build-baseline.md](./erp-build-baseline.md).

### 2. `flutter`

- Runner: `ubuntu-latest`, timeout 25 minutes
- Working directory: `apps/mobile`
- Flutter `3.44.8` (stable) via `subosito/flutter-action@v2`
- Steps:
  1. `flutter pub get`
  2. `dart format --output=none --set-exit-if-changed lib test`
  3. `flutter analyze --fatal-infos`
  4. `flutter test`
  5. Debug APK: `flutter build apk --debug --flavor dev` with
     `--dart-define=APP_ENV=dev` and
     `--dart-define=API_BASE_URL=http://10.0.2.2:3002/api/v1`

### 3. `dependency-review`

- **PR only** (`if: github.event_name == 'pull_request'`)
- `actions/dependency-review-action@v4`

STAB-13 reproduced the Flutter job's dev debug command locally with the same
Flutter version and additionally verified synthetic production APK/AAB and iOS
probes. CI supplies no `BRANCH_CODE` (the application defaults to `HYD`) and
passes `APP_ENV=dev`, which application code does not read. CI does not build
or inspect a production APK/AAB, invoke iOS, verify merged permissions or
signing identity, scan bundled public configuration, compare artifacts, or
retain/attest/upload them. The current Android production artifact omits
`INTERNET` and uses debug signing; Flutter rejects the iOS project as not
configured. See [flutter-build-baseline.md](./flutter-build-baseline.md).

---

## What CI does not do

- No staging/production deploy
- No container image publish
- No backend artifact upload, compiled startup smoke, or reproducibility check
- No ERP production-environment injection, artifact upload/attestation,
  production-start smoke, or reproducibility comparison
- No Flutter production APK/AAB or iOS build, native permission/signing scan,
  device smoke, artifact retention/attestation, or store upload
- No Terraform / infrastructure apply
- No managed-database provisioning

---

## Related

- [local-development.md](./local-development.md)
- [production.md](./production.md)
- [environment.md](./environment.md)
- [backend-build-baseline.md](./backend-build-baseline.md)
- [erp-build-baseline.md](./erp-build-baseline.md)
- [flutter-build-baseline.md](./flutter-build-baseline.md)
