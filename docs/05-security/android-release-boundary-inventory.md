# Android release boundary corrective inventory

- **Task:** STAB-20 Android release boundary corrective block only
- **Date:** 28 August 2026
- **Result:** **DONE WITH FINDINGS**
- **Phase 0:** **NOT PASSED**; STAB-20 remains **open**
- **Subsequent gate:** canonical GitHub verification **DONE WITH FINDINGS** for
  `37cf6c2`; evidence in
  `docs/07-deployment/stab-20-canonical-github-verification.md`
- **Next:** final Phase 0 review, **NOT STARTED**

This block corrects the Android network-permission and debug-signing boundary.
It does not create or inspect a founder keystore, sign a store artifact, upload
an artifact, contact a live API, run a device, or change iOS.

## Before and after

| Boundary                   | Before                                                                      | After                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release network permission | `INTERNET` existed only in debug/profile manifests; prod APK/AAB omitted it | Main manifest declares only `android.permission.INTERNET`; prod merged manifest, APK, and AAB base manifest contain it                            |
| Release signing            | `release` explicitly selected `signingConfigs.debug`                        | No debug fallback; complete external input creates a release signing config, while absent input produces unsigned local artifacts                 |
| Partial signing input      | No external configuration existed                                           | Any non-empty subset fails Gradle evaluation with a generic incomplete-configuration error and no values printed                                  |
| Secret/key tracking guard  | Ignore rules covered common files but no maintained release guard existed   | Flutter test fails on debug release wiring, missing main-manifest `INTERNET`, tracked key files, or literal signing assignments in tracked config |

## External signing contract

Gradle reads all four values from ignored `apps/mobile/android/key.properties`
using the standard property names `storeFile`, `storePassword`, `keyAlias`, and
`keyPassword`, or from these environment variable names:

- `ANDROID_RELEASE_STORE_FILE`
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_KEY_PASSWORD`

Values are trimmed, never logged, and must be supplied as a complete set. A
complete set with a missing keystore file fails with a generic file-not-found
error that does not reveal the path. No hard-coded path, alias, password,
certificate, or example secret was added. Existing Git ignore rules continue
to exclude `key.properties`, keystores, and private-key formats.

No complete signing set was exercised because this block was forbidden from
creating or inspecting a founder key. External signing is structurally
supported; company key custody, certificate matching, backup/recovery, and Play
App Signing remain external release work.

## Synthetic verification

Every Flutter command ran with any existing ignored `apps/mobile/.env` moved to
a unique private temporary directory without being read or printed. The active
build file contained only:

```text
API_BASE_URL=https://mee-events-android-boundary.invalid/api/v1
BRANCH_CODE=HYD
```

Any local `android/key.properties` was similarly isolated, and all four release
signing environment names were removed from build subprocesses. The original
`.env` was restored by a trap. No `key.properties` was present on this host.

Quality commands:

```sh
cd apps/mobile
flutter pub get --enforce-lockfile
dart format --output=none --set-exit-if-changed lib test tool
flutter analyze --fatal-infos
flutter test
```

Build commands:

```sh
flutter clean
flutter build apk --debug --flavor dev \
  --dart-define=API_BASE_URL=http://10.0.2.2:3002/api/v1 \
  --dart-define=BRANCH_CODE=HYD
flutter build apk --release --flavor prod \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://mee-events-android-boundary.invalid/api/v1 \
  --dart-define=BRANCH_CODE=HYD
flutter build appbundle --release --flavor prod \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://mee-events-android-boundary.invalid/api/v1 \
  --dart-define=BRANCH_CODE=HYD
```

The app does not consume `APP_ENV`; it is retained in the synthetic command to
make the intended production configuration explicit. Release mode and the
validated HTTPS API define enforce the mobile boundary.

## Artifact evidence

| Artifact/check         | Result                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Dev debug APK          | Compile PASS in 44.2s; existing debug-only boundary retained                                                                              |
| Prod release APK       | Compile PASS in 61.1s; 67,987,336 bytes; SHA-256 `4521011cb700d6c33480396dccf9475c99f76c2833c4ad93f419ae5903763468`                       |
| Prod release AAB       | Compile PASS in 15.8s; 66,376,412 bytes; SHA-256 `3d2b0963ad5cc6a23dc0ace8e1449929a30b23b077ea0d7f264cfe1aae5ef2a6`                       |
| ZIP integrity          | APK and AAB PASS                                                                                                                          |
| Prod merged manifest   | `INTERNET` present; `android:debuggable="true"` absent                                                                                    |
| APK package inspection | `aapt2` reports `INTERNET`; no `application-debuggable` marker                                                                            |
| AAB package inspection | Embedded base manifest contains `android.permission.INTERNET`; installed `apkanalyzer` cannot parse AAB and was not treated as proof      |
| APK signing            | `apksigner` reports unsigned; no Android Debug certificate                                                                                |
| AAB signing            | `jarsigner` reports unsigned; no Android Debug certificate                                                                                |
| Public configuration   | APK/AAB `.env` assets contain the synthetic `.invalid` API and `HYD`, with no loopback/dev URL; compiled production API define is present |
| Signing failure probes | No-input unsigned configuration PASS; one-value partial configuration fails with the expected generic error                               |

The release resolver intentionally contains forbidden loopback host literals so
it can reject them. Those validation constants are not the selected production
configuration; the inspected public configuration contains no loopback/dev API
URL.

After inspection, `flutter clean` removed the generated APK/AAB and build
intermediates. No artifact was uploaded or retained in Git.

## Maintained verification and regression results

`apps/mobile/test/android_release_boundary_test.dart` adds three maintained
checks. The full Flutter suite passes **484/484** after the addition. Root
format, lint, and typecheck pass; backend unit tests pass **239/239** and ERP
unit tests pass **12/12**. No backend/database file changed, so PostgreSQL
integration was not run.

## Retained findings

- The verified prod APK and AAB are **unsigned and not store-ready**. This is
  the intended no-credential local result, not evidence of company signing.
- Founder/company upload-key creation, custody, certificate record, recovery,
  rotation, Play App Signing, and store approval remain unproven and external.
- No live device, Play Console, store track, staging host, production host, or
  real API was used or proven.
- Package-name ownership, final release policy, artifact provenance, and store
  delivery remain later Android release work.
- iOS was not inspected, built, or changed.

Android release boundary corrective work is **DONE WITH FINDINGS**. This does
not claim Play Store readiness or production security. STAB-20 remains open and
Phase 0 remains **NOT PASSED**. Canonical GitHub verification was subsequently
completed with findings on 28 August 2026; the final Phase 0 review is next and
**NOT STARTED**.
