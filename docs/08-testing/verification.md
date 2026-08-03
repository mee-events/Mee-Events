# Verification Gate

How engineers and CI prove a change is merge-ready.

---

## Root `verify` (TypeScript)

From root [`package.json`](../../package.json):

```sh
corepack pnpm verify
```

Runs, in order:

1. `format:check` (Prettier)
2. `lint`
3. `typecheck`
4. `test` (`pnpm -r --if-present test` → Vitest on backend + erp-web empty pass)
5. `build`

**Scope:** TypeScript workspace only. Flutter is **not** part of `verify`.

---

## CI parity

| Gate              | Where                                       | Covers                                                                               |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| TypeScript        | `.github/workflows/ci.yml` job `typescript` | Same sequence as `verify` (`format:check` → `lint` → `typecheck` → `test` → `build`) |
| Flutter           | job `flutter`                               | `dart format`, `flutter analyze --fatal-infos`, `flutter test`, debug APK build      |
| Dependency review | job `dependency-review` (PRs only)          | Manifest/advisory review                                                             |

Details: [ci-cd.md](../07-deployment/ci-cd.md).

---

## Flutter (run separately locally)

From `apps/mobile`:

```sh
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze --fatal-infos
flutter test
```

Root scripts only wrap `flutter run` (`dev:mobile*`), not analyze/test.

---

## Merge expectation

| Check                                                            | Required                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `corepack pnpm verify` green (or equivalent CI typescript job)   | Yes                                                          |
| Flutter CI job green (`format` + `analyze` + `test` + debug APK) | Yes for mobile-touching or always-on CI policy on the branch |
| DB-backed integration suite                                      | N/A — does not exist                                         |
| Automated UI E2E                                                 | N/A — does not exist                                         |

Backend handbook reminder: run verify before merging backend changes
([backend.md](../02-architecture/backend.md)).

---

## Related

- [testing-strategy.md](./testing-strategy.md)
- [unit-tests.md](./unit-tests.md)
- [local-development.md](../07-deployment/local-development.md)
- [ci-cd.md](../07-deployment/ci-cd.md)
