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
  1. `pnpm format:check`
  2. `pnpm lint`
  3. `pnpm typecheck`
  4. `pnpm test`
  5. `pnpm build`

Local parity: `corepack pnpm verify` (same sequence via root scripts).

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

---

## What CI does not do

- No staging/production deploy
- No container image publish
- No Terraform / infrastructure apply
- No managed-database provisioning

---

## Related

- [local-development.md](./local-development.md)
- [production.md](./production.md)
- [environment.md](./environment.md)
