# SEC-06 mobile boundary inventory

Verified 28 August 2026 on `master`, starting from
`10f994b5366ce23782054fd173760d009998a09d`. This is local source, dependency,
unit/widget, configuration-guard, and synthetic build evidence. No founder env
value, real credential, remote application/provider endpoint, live
staging/production host, device, or store service was used. Package registries
were contacted only for the required dependency resolution and audit.

## Before and after

| Area                            | Before                             | Evidence                                                                                                           | Action                                                                                                                                 | After                                                                                            | Finding                                                                                                                                       |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Flutter Supabase initialization | Active at every startup            | `main.dart` imported `supabase_flutter` and called `Supabase.initialize` after dotenv load                         | Removed initialization/import; kept dotenv for API/branch config                                                                       | No Flutter database client is initialized                                                        | Backend `@supabase/supabase-js` intentionally remains for operational asset scripts                                                           |
| Direct table service            | Dormant                            | Repository-wide search found only its definition; no import or caller. The file selected/streamed `event_services` | Deleted only the unreferenced service after usage proof                                                                                | No direct mobile table query remains                                                             | Shared customer models were retained because the maintained product uses them elsewhere                                                       |
| `supabase_flutter` dependency   | Direct plus 30 transitive packages | Manifest/lockfile and `flutter pub deps` before removal                                                            | Removed direct dependency and regenerated normally                                                                                     | Flutter Supabase packages are absent from manifest, lockfile, and resolved graph                 | macOS generated registrant changed because removed transitives had registered `app_links`/`url_launcher`; backend JS dependency was untouched |
| Bootstrap surface parsing       | Fail-open                          | Unknown/missing surfaces fell back to `customer_mobile`                                                            | Added exact surface parsing and controlled validation failure                                                                          | Unknown, missing, and non-string surfaces are denied                                             | Dart catalog must be updated deliberately if the authoritative backend contract changes                                                       |
| Active-role parsing             | Fail-open                          | Missing role defaulted to `customer`; arbitrary strings crossed the boundary                                       | Validate all contract roles and canonical landing modules                                                                              | Unknown, missing, non-string, and mismatched roles are denied                                    | No new role or surface was invented                                                                                                           |
| Surface/role agreement          | Unchecked                          | Routing switched only on parsed surface                                                                            | Validate the backend `ROLE_SURFACES` mapping during parse and before route resolution                                                  | A mismatch cannot open Customer, Vendor, or Worker                                               | Employee-class roles stay on the existing ERP-only message                                                                                    |
| Assigned-role agreement         | Partially parsed                   | Malformed entries were skipped and active-role membership was not required                                         | Validate each role/surface/scope entry and require an active-role assignment for the branch                                            | Missing/malformed/mismatched assignments fail closed                                             | Multiple valid scopes for one role are accepted and de-duplicated for the role switcher                                                       |
| Branch parsing/routing          | Partially checked                  | Resolver denied non-`HYD`, but missing nested branch fields became empty defaults                                  | Require the full active branch structure and nonblank fields; retain the `HYD` route gate                                              | Missing/blank branch fails parsing; unsupported branch gets no product surface                   | Only Hyderabad routing is supported by the current backend/product contract                                                                   |
| Required bootstrap structures   | Fail-open/partial                  | Missing actor/branch/client/access became empty maps; controls and metadata were not checked                       | Require metadata, actor, branch, client, access, controls, known modules/capabilities, valid list entries, and landing-module presence | Malformed nested/list/scalar data raises `BootstrapValidationException`                          | Other mobile model factories remain outside SEC-06 and are not claimed schema-validated                                                       |
| Release API URL                 | Non-loopback HTTP or HTTPS         | Resolver only rejected hostless and selected loopback/emulator hosts                                               | Validate absolute HTTP(S) URLs for all modes; require non-loopback HTTPS in release; reject user info, query, and fragment             | Synthetic `.invalid` HTTPS passes release; HTTP/malformed/credential/loopback inputs fail closed | No certificate pinning or native network-security change; debug/profile loopback HTTP intentionally remains                                   |
| User-visible bootstrap errors   | Raw                                | Gateway rendered `error.toString()`                                                                                | Stable generic message with existing Retry and Sign out                                                                                | Parser/provider/URL/token detail is not rendered by the gateway                                  | Some non-bootstrap product screens still render raw errors; that broader product cleanup is outside SEC-06                                    |

## Boundary proof

The maintained-tree usage search before deletion found Supabase only in:

- unconditional initialization in `apps/mobile/lib/main.dart`;
- the unreferenced direct table service;
- `apps/mobile/pubspec.yaml` / `pubspec.lock`; and
- the public mobile `.env.example` fields.

After removal, this command returns no match in maintained Flutter source,
tests, tools, manifest, lockfile, or example configuration:

```sh
rg -n "supabase_flutter|Supabase\\.|SupabaseService|SUPABASE_URL|SUPABASE_ANON_KEY" \
  apps/mobile/lib apps/mobile/test apps/mobile/tool apps/mobile/pubspec.yaml \
  apps/mobile/pubspec.lock apps/mobile/.env.example
```

Separate fixed-string searches for `event_services`, `.from('`, and `.from("`
also return no match in `apps/mobile/lib`, `test`, or `tool`; generic Dart
collection constructors such as `List.from` are unrelated and remain.

`flutter pub deps --style=compact` also has no Supabase package. Historical
evidence under `docs/references/supabase/` remains. Backend
`@supabase/supabase-js` and its asset scripts remain operational and unchanged.
The Nest `MobileApi` endpoint is now the only maintained Flutter application
data/auth boundary.

## Validation and routing evidence

Focused tests cover valid Customer, both Vendor roles, Worker, and employee-web
responses; assigned-role/module/capability parsing; Hyderabad routing; every
named missing/non-string/unknown/mismatch case; malformed nested/list entries;
unsupported branch denial; generic gateway errors; Retry; and Sign out. The
gateway widget tests also assert that employee/manager, unsupported branch, and
provider failure never render Customer, Vendor, or Worker dashboards.

Environment tests use no network client. They cover debug/profile loopback HTTP,
synthetic release HTTPS, release HTTP denial, all documented loopback/emulator
denials, malformed URL, user information, and fragment rejection.

## Local verification

- `flutter pub get` and `flutter pub get --enforce-lockfile`: pass.
- focused SEC-06 tests: 65/65 pass.
- Dart format: 201 files, no drift after formatting.
- `flutter analyze --fatal-infos`: zero diagnostics.
- complete Flutter suite: 481/481 pass.
- resolved Flutter dependency graph and maintained-tree search: no mobile
  Supabase package/runtime/config match.
- mobile E2E configuration guard: missing and remote `.invalid` URLs rejected
  before network access. The live smoke was not run because this slice did not
  establish a safe loopback Nest/PostgreSQL/local-OTP stack.
- synthetic dev debug APK compile with emulator HTTP: pass.
- synthetic production release APK compile with
  `https://mee-events-sec06.invalid/api/v1`: pass. APKs were not inspected or
  uploaded.
- repository format/lint/typecheck: pass; backend 237/237, ERP 12/12, and
  PostgreSQL integration 32/32 pass. The first sandboxed loopback test attempts
  were denied by the host (`EPERM`); approved loopback reruns passed unchanged.
- `pnpm audit --audit-level high`: pass with 0 critical/high/moderate and the
  two previously recorded low findings.

For every Flutter command, the ignored founder `apps/mobile/.env` was moved to
a private temporary directory before a synthetic `.env.example` copy was used,
then moved back on shell exit. Its contents were never read, printed, sourced,
copied, hashed, or committed.

## Retained findings

- No live staging or production deployment exists in this evidence, and none
  was invented or tested.
- Android release `INTERNET`/signing findings and iOS Xcode/flavor/signing
  findings from STAB-13 were not changed. Native transport, pinning, device,
  provider, and store behavior remain unproven.
- The mobile contract catalogs intentionally mirror the authoritative
  TypeScript contract. A future backend role/module/capability addition must
  update the Dart validator in the same reviewed change or mobile will deny it.
- `.env` remains a bundled public Flutter asset for API/branch configuration.
  It must never contain a secret.
- Bootstrap error disclosure is closed at `AppGateway`; unrelated product
  error surfaces remain future feature/security work.

## Status

SEC-06 is **DONE WITH FINDINGS** locally. STAB-20 remains **open**, Phase 0 is
**NOT PASSED**, and Customer work remains not started and unauthorized. The
next action is an independent Phase 0 / STAB-20 gate review; that review is not
part of this commit.
