# Flutter Analysis Baseline — STAB-09

Verified 26 August 2026 on clean `master` at
`1b5168de9a82742757a10e3f922606f4e12165e1`, tracking `origin/master`, ahead
9 and behind 0. This is a static-analysis baseline, not a Flutter test, native
build, device, privacy, or release-security certification.

## Result

`flutter analyze --fatal-infos` passed with **0 errors, 0 warnings, and 0
infos** in 3.3 seconds (exit 0). All 200 maintained Dart files are in scope:
172 under `lib/` and 28 under `test/`. No Dart/configuration correction was
needed, no lint was disabled, and no source was excluded or suppressed to make
the command pass.

## Toolchain and policy

| Item                   | Verified value                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| Flutter                | 3.44.8 stable                                                               |
| Framework revision     | `058e0af2c2` (23 July 2026)                                                 |
| Engine                 | `0cd610717b` / hash `13ffd72b2f9a5ca4db2a74ea52d5353ec2e8f939`              |
| Dart                   | 3.12.2 stable (`macos_arm64`)                                               |
| DevTools               | 2.57.0                                                                      |
| Package SDK constraint | Dart `^3.12.2`; lock requires Dart `>=3.12.2 <4.0.0` and Flutter `>=3.44.0` |
| Lints                  | `flutter_lints` 6.0.0                                                       |
| CI Flutter             | 3.44.8 stable — matches local                                               |
| Canonical command      | `flutter analyze --fatal-infos` from `apps/mobile`                          |

`analysis_options.yaml` includes `package:flutter_lints/flutter.yaml`. It has
no enabled custom rules, disabled rules, `analyzer.exclude` entries, or
language overrides. There is no nested analysis configuration. The commented
example rules do not change policy. CI invokes the same fatal-infos command, so
an error, warning, or information-level diagnostic fails the gate. The default
Flutter lint set is useful engineering policy; it is not a complete security
policy.

## Scope inventory

| Maintained location                                          | Tracked Dart files | Analyzer disposition      |
| ------------------------------------------------------------ | -----------------: | ------------------------- |
| `apps/mobile/lib/**/*.dart`                                  |                172 | Included                  |
| `apps/mobile/test/**/*.dart`                                 |                 28 | Included                  |
| `apps/mobile/integration_test/**/*.dart`                     |                  0 | Tree absent               |
| `apps/mobile/tool/**/*.dart` and other locations             |                  0 | No maintained files found |
| Tracked `.g.dart`, `.freezed.dart`, mocks, or generated Dart |                  0 | None present              |
| **Total**                                                    |            **200** | **All included**          |

The reviewed application map covers bootstrap/environment, authentication,
secure session storage, role switching, navigation, customer, vendor, worker,
manager/operations/inventory/finance surfaces, API/model boundaries, and
shared widgets/utilities. Notifications are UI placeholders, quotation PDF is
an API placeholder, location is entered/displayed text rather than device
location access, and there is no maintained document/file or push integration
to analyze. `.dart_tool`, SDK/package-cache code, native generated registrants,
and build output are ignored/generated state, not maintained Dart source.

## Suppression and type-risk inventory

| Category                                                                  |                        Count | Scope and assessment                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ---------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `// ignore:`                                                              |                            2 | `test/favorites_store_test.dart` and `test/search_query_test.dart`; both narrowly suppress `depend_on_referenced_packages` for transitive test helpers. Test-only package-boundary debt; neither suppresses an analyzer, auth, session, branch, payment, or input-safety finding.                                               |
| `ignore_for_file`, analyzer-ignore, format off/on, deprecated suppression |                            0 | No broad or file-level suppression found.                                                                                                                                                                                                                                                                                       |
| `dynamic` tokens                                                          |              264 in 29 files | Predominantly typed JSON maps/lists at HTTP/model/storage boundaries. Analyzer-safe, but runtime casts remain a validation concern described below.                                                                                                                                                                             |
| `Object?`                                                                 |               35 in 12 files | Mostly test-injected errors and production error state; bootstrap helpers narrow before use.                                                                                                                                                                                                                                    |
| Forced non-null assertions                                                | 105 (83 production, 22 test) | Predominantly guarded optional UI values and test setup. Representative control-flow guards were inspected; no assertion was added and no security-sensitive bypass was found.                                                                                                                                                  |
| `late` fields                                                             |   20 (16 production, 4 test) | Production animation/page/text/tab controllers are initialized in lifecycle setup and disposed; fixed widget/future/list state is initialized before use. Search and polling timers are cancelled where owned. Splash delayed callbacks use `mounted`, although its one-shot navigation timer is not retained for cancellation. |

The two ignores are justified for the present test boundary but should be
removed if those helper packages become direct dev dependencies. Assertions and
JSON casts are not counted as analyzer suppressions; their runtime risk is
tracked explicitly rather than hidden by the zero-diagnostic result.

## Deprecated and async/lifecycle review

The analyzer emitted no deprecation or unstable-API diagnostic. Source search
found no `@Deprecated` declaration, deprecated-member suppression, or explicit
deprecated API marker in maintained Dart. This proves only what the pinned SDK,
packages, and active lints report.

The fatal-infos run reported no async-context or disposal diagnostic. Manual
inspection confirmed mounted/context checks after representative OTP,
bootstrap, search, logout, and navigation awaits; animation, page, text, focus,
and tab controllers are disposed; the search debounce and enquiry poll timers
are cancelled. Explicit `unawaited` work is visible and scoped to restore,
provider refresh/cache, or UI search actions. Remaining low-risk lifecycle debt:
the splash screen's one-shot navigation timer is guarded by `mounted` but not
stored/cancelled, and several deliberate background cache writes discard
errors. STAB-10 owns behavioral regression proof; STAB-20 owns security
hardening.

## Security-sensitive static review

| Area                       | Analyzer evidence | Manual finding                                                                                                                                                                                                                                                                                                                        | Severity / owner                                                                     |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Authentication/session     | No diagnostic     | Access and refresh tokens are persisted in `FlutterSecureStorage`; corrupt stored JSON is deleted; refresh is single-flight and clears local state on failure; logout attempts server revocation before local clearing. The login device identifier is random per verification instead of a stable protected installation identifier. | Existing **High** session-control gap — SEC-03/STAB-20                               |
| Role/branch bootstrap      | No diagnostic     | Server bootstrap controls the surface and `resolveBootstrapEntry` rejects non-HYD branches. Unknown client surfaces silently default to customer, and roles/capabilities remain arbitrary strings at parts of the boundary.                                                                                                           | Existing **High** fail-closed boundary gap — SEC-06/STAB-20                          |
| Environment                | No diagnostic     | `.env` is a bundled public asset. Release API resolution rejects invalid/loopback hosts, but does not require HTTPS. No server secret was found in Dart. Supabase URL/anon key are public client configuration, not secrets.                                                                                                          | Existing **High** transport/config gap — SEC-05/SEC-06/STAB-20                       |
| Direct data access         | No diagnostic     | `main.dart` always initializes Supabase and dormant `SupabaseService` accesses a table directly, contrary to the accepted backend-only application boundary.                                                                                                                                                                          | Existing **High** boundary gap — SEC-06/STAB-20                                      |
| JSON/input                 | No diagnostic     | `ApiClient` and model factories use unchecked map/list/scalar casts after JSON decoding. Malformed external responses fail as request errors rather than being schema-validated; bootstrap performs partial narrowing. Type safety is not runtime validation.                                                                         | Existing **Medium** validation debt — SEC-06/STAB-20 and feature owners              |
| Network/errors             | No diagnostic     | HTTP has a 15-second timeout and one bearer refresh/retry. No certificate pinning or native network-security policy is proven. Some UI paths display `error.toString()` and image/Supabase debug logs may include URLs, event IDs, or provider errors.                                                                                | Existing **Medium** disclosure/transport debt — SEC-05/STAB-20; native proof STAB-13 |
| Local privacy              | No diagnostic     | Recent searches, favorites, and plan drafts use user-scoped `SharedPreferences` keys and remove legacy unscoped keys; they are not secrets, but remain plaintext app preferences.                                                                                                                                                     | **Low/Medium**, validate retention/account-switch behavior in CUST-03/STAB-20        |
| Money/IDs/URL construction | No diagnostic     | Money values are generally retained as strings across JSON models, avoiding implicit floating-point coercion, but are not schema validated. Several server-issued IDs are interpolated into paths; search uses `Uri` query handling while some catalogue query construction is manual.                                                | Existing **Medium** input/integrity debt — feature owners/STAB-20                    |
| Privacy features           | Not covered       | No device location permission, push payload, clipboard/screenshot control, private file/document transport, or real PDF implementation exists to certify.                                                                                                                                                                             | Unimplemented/not statically provable — CUST-21/22, EMP-11/12/14, STAB-13/20         |

SEC-06 update (28 August 2026): the table preserves the STAB-09 review
snapshot. The named bootstrap, release-URL, and direct-data-access findings are
now closed locally: Flutter no longer initializes or depends on Supabase; the
bootstrap boundary strictly validates contract structures and known
role/surface/module/capability values; mismatches and unsupported branches are
denied; and release API URLs require non-loopback HTTPS. The gateway now
sanitizes bootstrap errors. Other model factories and product-screen raw-error
paths remain outside SEC-06 and are not claimed fixed. Native transport,
signing, device behavior, and live deployment remain unproven. Current SEC-06
evidence is in
[sec-06-mobile-boundary-inventory.md](../05-security/sec-06-mobile-boundary-inventory.md).

Analyzer success does not close any of these runtime, privacy, authorization,
provider, or native release items. It found no server credential, private key,
token literal, signing material, or credential-bearing URL in maintained Dart
or in the STAB-09 documentation diff.

## Dependency currency reconciliation

`flutter pub outdated` completed successfully on 26 August 2026. It is a
currency/resolution report, not an advisory scanner, and no dependency was
changed.

- **Direct dependencies behind latest (5):** `flutter_riverpod` 2.6.1 →
  latest 3.4.2 (not currently resolvable beyond 2.6.1),
  `flutter_secure_storage` 10.3.1 → 11.0.0, `google_fonts` 8.2.0 → 8.2.1,
  `smooth_page_indicator` 1.2.1 → 3.0.0, and `supabase_flutter` 2.16.0 →
  2.17.2.
- **Direct dev dependencies behind latest:** 0.
- **Installed transitive dependencies behind latest:** 24: 21 runtime rows
  and 3 dev rows. A separate `supabase_common` row is not currently installed
  and would enter the graph on upgrade, so it is not counted as installed
  outdated.
- **Resolution summary:** 14 installed dependencies are locked below an
  available upgradable version. Three direct constraints prevent the current
  graph from reaching a newer resolvable version.
- **Discontinued/retracted/advisory flags:** none in current command output.
  STAB-03 remains the security-advisory baseline.
- **SDK/graph limits:** the declared Dart/Flutter floors are satisfied. Twelve
  installed rows have a latest release beyond the current resolvable graph,
  but `pub outdated` does not establish that the SDK alone is the cause.

The old roadmap phrase “29 constrained outdated packages” was inaccurate.
**29 is currently reproducible only as 5 direct + 24 installed transitive
packages behind their latest releases.** It is not the number constrained by
the manifest; current CLI output says three direct constraints are restrictive.

## Native and generated boundaries

`flutter analyze` does not analyze Kotlin/Gradle, Swift/Xcode, Android
manifests, iOS plist/entitlements, permission declarations, signing,
flavors/schemes, keystores/certificates, native secure-storage configuration,
network-security configuration, or release artifact contents. Inspection
reconfirmed the known release blockers: Android's main manifest lacks
`INTERNET` while debug/profile add it, Android release uses debug signing, and
iOS signing/permissions/entitlements are not release-proven. STAB-13 and the
Android/iOS release phases own corrections and artifact proof.

No maintained generated Dart is tracked. Analyzer/package state under
`.dart_tool`, Flutter registrants, and native build output are generated and
ignored; none is part of this commit.

## Verification and evidence limits

Commands run from `apps/mobile` unless noted:

```sh
flutter --version
flutter analyze --fatal-infos
flutter pub outdated
flutter pub outdated --json
dart format --output=none --set-exit-if-changed lib test
git diff --check
```

The final formatting, analyzer, whitespace, and secret-safe diff checks were
rerun after documentation. No Flutter tests were run because no Dart/runtime
behavior changed and STAB-10 is a separate execution block. No Flutter build
was run because STAB-13 owns build/native artifact verification.

**Final result: PASS with documented runtime/native debt.** STAB-09 proves an
honestly scoped, reproducible zero-diagnostic Dart baseline. Phase 0 remains
**NOT PASSED**. The next permitted block is STAB-10; it was not started here.
