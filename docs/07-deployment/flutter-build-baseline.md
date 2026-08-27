# Flutter Build Baseline — STAB-13

Verified 26 August 2026, 14:11–14:45 IST (`Asia/Kolkata`, `+0530`) on clean
`master` at `f04a9d665246e1ca584fab481c2f5e02bdbd38c9`, tracking
`origin/master`, ahead 13 and behind 0. This is native compile and packaging
evidence. It is not device, provider, store, signing-custody, TestFlight, Play
Console, production-network, or release-readiness proof.

Corrected after independent review on 26 August 2026: the observed iOS error
is caused first by this host lacking a usable full-Xcode interpreter, not by
the project's Flutter migration metadata. The missing production scheme and
signing configuration remain separate later blockers.

## Result

**COMPLETED WITH FINDINGS.** Flutter formatting, analysis, and 441/441 tests
pass. The CI-aligned dev debug APK, production-flavor release APK, and
production-flavor release AAB compile. Both exact iOS unsigned probes exit 1
with `Application not configured for iOS` after Flutter's Xcode-version probe
fails and before project enumeration, compilation, or signing.

The Android production packages are **BROKEN / UNUSABLE FOR NETWORKED
PRODUCTION** because their merged manifest omits `android.permission.INTERNET`.
They are **NOT STORE-RELEASABLE** because both use the self-signed Android Debug
certificate. No source or native correction was made in this verification
block. Phase 0 remains **NOT PASSED**.

## Toolchain

| Item                                              | Verified value                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Flutter                                           | 3.44.8 stable; framework `058e0af2c2`; engine `0cd610717b` / hash `13ffd72b2f9a5ca4db2a74ea52d5353ec2e8f939`                       |
| Dart / DevTools                                   | Dart 3.12.2; DevTools 2.57.0                                                                                                       |
| Local / CI parity                                 | CI pins Flutter 3.44.8 stable; exact match                                                                                         |
| Java used by Flutter Android toolchain            | Android Studio OpenJDK 21.0.10; Android compiles target JVM 17                                                                     |
| Shell / Gradle-wrapper Java                       | Oracle Java 23.0.1                                                                                                                 |
| Gradle                                            | 9.1.0 wrapper; Gradle's own embedded Kotlin reports 2.2.0                                                                          |
| Android Gradle Plugin / application Kotlin plugin | AGP 9.0.1; Kotlin Android plugin 2.3.20                                                                                            |
| Android SDK                                       | SDK 36.0.0; installed platform `android-36.1`; build-tools 36.0.0                                                                  |
| Effective app SDKs                                | compile 36; target 36; minimum 24                                                                                                  |
| macOS                                             | 26.5.2, build 25F84, arm64                                                                                                         |
| Xcode                                             | Full Xcode absent/incomplete; active developer directory is Command Line Tools, so `xcodebuild` is unavailable                     |
| CocoaPods / plugin integration                    | CocoaPods 1.17.0 is installed, but this project has no Podfile/Podfile.lock and references Flutter's generated local Swift package |

`flutter doctor -v` was green for Flutter, Android, Chrome, available host
devices, and network resources. It reported one issue category: full Xcode is
not installed. Usernames, device IDs, and private tool paths are omitted here.
No toolchain was upgraded.

## Repository and native-state gate

The starting worktree had no staged, tracked, or untracked change. Before any
build, tracked native configuration was recorded as path-ordered SHA-256
manifests:

| Scope                    | Tracked files | Manifest SHA-256                                                   | Final comparison |
| ------------------------ | ------------: | ------------------------------------------------------------------ | ---------------- |
| `apps/mobile/android/**` |            22 | `b086b3266446073e88446f983b058c0e6ea7d4a72b0436c338aad05ccbf54048` | Identical        |
| `apps/mobile/ios/**`     |            40 | `832deedde58f034f4a390bdb1c002a50b227628938f6cc0aec436ffe1e45e742` | Identical        |

`pubspec.yaml` remained
`53d4987d76d32beabb092de42f706a0eac834d558921d2c8d4f1697e82ec702c`
and `pubspec.lock` remained
`f758830ab1339b9533c1a4454c98a3268350f2255238e29078c5eff03b9af210`.

## Safe environment isolation

The ignored `apps/mobile/.env` existed. Its contents were never read, printed,
copied, or used. Only these metadata were recorded before the build:

- SHA-256: `e8c53e1136a956b0d35188d192965541350dd1de6542ca6efec981a86da262e6`
- mode: `0644`; size: 545 bytes; owner/group IDs: 501/20
- extended-attribute name: `com.apple.provenance`
- xattr-name-list SHA-256:
  `aacae6d7f20ecc718526220d315bd6ab0a28e8aa5da91934df496b54c45908c5`

For every Flutter dependency, quality, and build command, a shell trap was
installed first. It moved the original file to a private temporary directory,
placed a build-only `.env` containing only these public synthetic values, and
restored the original on exit or interruption:

```text
API_BASE_URL=https://mee-events-stab13.invalid/api/v1
BRANCH_CODE=HYD
SUPABASE_URL=https://supabase-stab13.invalid
SUPABASE_ANON_KEY=public-stab13-placeholder
```

The synthetic file's SHA-256 was
`ddebcf642f554caff701ad2f8ae8b4e5a6d0cd9f0b5807f943dd8996daf23cee`.
That exact hash is the `.env` asset in every inspected Android production
package. Final hash, mode, size, ownership IDs, and xattr-name state of the
original all match. The synthetic staging file and all trap holding directories
were removed. The original remains ignored and unstaged.

## Dependencies, plugins, and Flutter quality

`flutter pub get` completed in 2 seconds. It reported 29 packages with newer
versions incompatible with the current constraints; no package was upgraded
and the lockfile did not change.

The generated plugin inventory contains these native platform entries:

| Platform | Native plugin entries                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | `app_links`, `flutter_secure_storage`, `jni`, `jni_flutter`, `path_provider_android`, `shared_preferences_android`, `sqflite_android`, `url_launcher_android` |
| iOS      | `app_links`, `flutter_secure_storage_darwin`, `path_provider_foundation`, `shared_preferences_foundation`, `sqflite_darwin`, `url_launcher_ios`               |

The merged Android artifact is the authority for permissions and components;
the plugins do not add `INTERNET`. The app minimum SDK 24 satisfies the
reviewed plugins' minimums. The tracked iOS registrant includes app links,
secure storage, shared preferences, SQLite, and URL launcher; path provider is
declared in generated dependency state but is not in the tracked Objective-C
registrant. Native execution was not performed.

| Check                                                      | Result                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `dart format --output=none --set-exit-if-changed lib test` | PASS; 200 files, 0 changed, about 1 second                                            |
| `flutter analyze --fatal-infos`                            | PASS; 0 errors/warnings/infos, about 4 seconds                                        |
| `flutter test --machine`                                   | PASS; 27 files, 441 visible tests, 441 passed, 0 failed/skipped/errors, 19.28 seconds |

## Android flavor and identifier matrix

| Flavor  | Application ID            | Label              | Version result                                     |
| ------- | ------------------------- | ------------------ | -------------------------------------------------- |
| dev     | `com.meevent.app.dev`     | Mee Events Dev     | `1.0.0-dev` (code 1)                               |
| staging | `com.meevent.app.staging` | Mee Events Staging | configured suffix `-staging`; not built in STAB-13 |
| prod    | `com.meevent.app`         | Mee Events         | `1.0.0` (code 1)                                   |

The Android namespace and `MainActivity` Kotlin package are
`com.meeevents.mee_events`; this intentional code namespace differs from the
application IDs. Android production ID `com.meevent.app` also differs from the
iOS ID `com.meeevents.meeEvents`; final store ownership/identifier selection is
a founder/release decision, not a STAB-13 change.

## Android dev debug APK

Command:

```sh
flutter build apk --debug --flavor dev \
  --dart-define=APP_ENV=dev \
  --dart-define=API_BASE_URL=http://10.0.2.2:3002/api/v1 \
  --dart-define=BRANCH_CODE=HYD
```

| Field                     | Evidence                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Exit / duration           | 0 / 51 seconds                                                                                     |
| Artifact                  | Generated `app-dev-debug.apk`; copied to private temporary evidence, then workspace output cleaned |
| Size / SHA-256            | 174,815,758 bytes / `d657eb164afed160848f211c7bc70a23ffc4f0f8a607163294a425e76bc578ec`             |
| Package / label / version | `com.meevent.app.dev`; Mee Events Dev; `1.0.0-dev` code 1                                          |
| SDK / ABIs                | min 24, target 36; arm64-v8a, armeabi-v7a, x86_64                                                  |
| Debuggable                | true                                                                                               |
| Permissions               | `android.permission.INTERNET` plus the AndroidX dynamic-receiver marker permission                 |
| Signing                   | Valid APK v2 signature; `C=US, O=Android, CN=Android Debug`                                        |
| Alignment                 | `zipalign -c -P 16 -v 4` passed                                                                    |

`INTERNET` comes from `app/src/debug/AndroidManifest.xml`. This is compile and
package evidence only. No emulator/device was launched and the CI HTTP endpoint
was not contacted.

## Android production APK

Command:

```sh
flutter build apk --release --flavor prod \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://mee-events-stab13.invalid/api/v1 \
  --dart-define=BRANCH_CODE=HYD
```

| Field                     | First build                                                        | Second clean build                                                 |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Exit / duration           | 0 / 91 seconds                                                     | 0 / 78 seconds                                                     |
| Size                      | 69,139,990 bytes                                                   | 69,139,990 bytes                                                   |
| SHA-256                   | `e4873ade7b404a7d0e996dd70d13fffb2929b750e03833ec2bcb1fde32678659` | `21ff8da7ccbb1214dcdfff7aaae68e44099a7d91a20fbcb0a95d17436bc8ca01` |
| Package / label / version | `com.meevent.app`; Mee Events; `1.0.0` code 1                      | Same                                                               |
| SDK / ABIs                | min 24, target 36; arm64-v8a, armeabi-v7a, x86_64                  | Same                                                               |
| Debuggable                | false                                                              | false                                                              |
| Permissions               | App-specific dynamic-receiver marker only; **no `INTERNET`**       | Same                                                               |
| Signing                   | APK v2 only; Android Debug certificate                             | Same subject/fingerprint                                           |

The native libraries are `libapp`, `libflutter`, `libdartjni`, and
`libdatastore_shared_counter` for all three ABIs. They are stripped. Alignment
verification passed. No APK v1, v3, v3.1, v4, or source-stamp proof exists.

The APK hashes differ, but all extracted files and ZIP entry listings compare
equal; byte differences are confined to the APK v2 signing block. Package,
permissions, version, public environment, ABI set, size, and certificate are
stable. This is classified signing-block nondeterminism, not unexplained
application-bundle drift.

## Android production AAB

Command:

```sh
flutter build appbundle --release --flavor prod \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://mee-events-stab13.invalid/api/v1 \
  --dart-define=BRANCH_CODE=HYD
```

| Field                   | First build                                                        | Second clean build |
| ----------------------- | ------------------------------------------------------------------ | ------------------ |
| Exit / duration         | 0 / 122 seconds                                                    | 0 / 102 seconds    |
| Size                    | 67,394,445 bytes                                                   | 67,394,445 bytes   |
| SHA-256                 | `35ba3b7bcf5cc80f10efa84fec3c4e1856edd08fa1fd7dd35ad987f310988f73` | Identical          |
| Module                  | `base` only                                                        | `base` only        |
| Package / version / SDK | `com.meevent.app`; `1.0.0` code 1; min 24, target 36               | Same               |
| Permissions             | App-specific dynamic-receiver marker only; **no `INTERNET`**       | Same               |
| Signing                 | JAR verifies; self-signed Android Debug certificate; no timestamp  | Identical artifact |

The AAB contains base manifest/resources/assets, three-ABI native libraries,
native debug-symbol metadata, baseline profiles, dependency metadata, a
10,258,407-byte R8 mapping, and R8 metadata. It is local packaging proof; it
was not uploaded or converted into an installable store split set.

## Android merged manifest and hardening

Both production package formats resolve to compile/target 36, min 24, launcher
`com.meeevents.mee_events.MainActivity` exported true, URL launcher's
`WebViewActivity` exported false, AndroidX initialization provider exported
false, and AndroidX profile installer receiver exported true behind
`android.permission.DUMP`.

| Control                                              | Verified state                                                                                                                                                      | Classification / owner                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `android.permission.INTERNET`                        | Absent from production APK and AAB                                                                                                                                  | **High release blocker**; ANDROID-08/13, STAB-20                   |
| Release signing                                      | Explicit Gradle debug signing; subject/issuer `C=US, O=Android, CN=Android Debug`; SHA-256 `b191ca7bbd66dcd9196fdd3cce8dc806263b58d28fdea1509996eec0180fe964`       | **High release blocker**; ANDROID-04/05/08 and founder key custody |
| Keystores/secrets                                    | No tracked or present `.jks`, `.keystore`, `key.properties`, `.p8`, `.p12`, or provisioning filename; no embedded signing password/reference                        | PASS for repository secret safety; production signing absent       |
| Cleartext/network security                           | No `usesCleartextTraffic` override and no network-security config; platform default applies. No certificate pinning                                                 | Transport policy incomplete; SEC-05/STAB-20/ANDROID-07             |
| Backup                                               | No `allowBackup`, data-extraction, or backup rules; platform default therefore applies. Secure-storage plugin documentation warns backup/exclusion must be designed | Medium privacy/session hardening; CUST-03/STAB-20/ANDROID-13/14    |
| Secure storage                                       | Default `FlutterSecureStorage`, backed by Android KeyStore algorithms; no biometric mode or backup exclusion configured                                             | Native behavior not device-tested                                  |
| R8                                                   | Enabled with shrinking, optimization, access modification, and obfuscation; mapping and metadata are present in AAB                                                 | Verified Android bytecode hardening                                |
| Resource shrinking                                   | Enabled by Flutter's plugin default for release apps                                                                                                                | Verified; exact removed-resource delta not measured                |
| Dart obfuscation / split debug info                  | Neither `--obfuscate` nor `--split-debug-info` used                                                                                                                 | Not enabled; no symbol-server/crash upload proof                   |
| Native symbols                                       | APK libraries stripped; AAB includes native `.sym` metadata for selected libraries/ABIs                                                                             | Local evidence only; no upload pipeline                            |
| Screenshot/clipboard, root/jailbreak, Play Integrity | No implementation found                                                                                                                                             | Later threat/privacy design; STAB-20/release phases                |

Flutter 3.44.8's Gradle plugin defaults `shouldShrinkResources` to true and
sets `isShrinkResources` for release app builds; this project does not override
that behavior. R8 metadata reports optimized shrinking, and release logs show
icon tree-shaking. The exact removed-resource delta was not measured.

No location, camera, notification, storage, microphone, contacts, biometric, or
other sensitive permission is requested by the production manifest. That is
consistent with those native capabilities not being implemented; it is not
proof of completed feature/privacy behavior.

## Artifact environment and secret scan

The APK and AAB `.env` asset hash equals the synthetic file exactly and differs
from the untouched original local file. The AAB scan found:

- the synthetic production API URL in the asset and compiled AOT/symbol data;
- `BRANCH_CODE=HYD` in the asset and compile-time data;
- the synthetic Supabase URL and public placeholder only in the `.env` asset;
- the source-level localhost fallback and both Android emulator aliases in
  compiled AOT/symbol data. They are not selected because the production
  dart-define has precedence, but their strings remain packaged;
- no private-key marker, database URL key, JWT/HMAC secret key, Supabase service
  key, or signing credential;
- no real backend, staging, production, or Supabase project hostname.

Production source also embeds public sample-media URLs for Unsplash and Google
usercontent. They are real third-party public media hosts, not private API
configuration or secrets. No network request was made to them in STAB-13.

`APP_ENV` has no application-code reader. CI/build commands pass it, but only
`API_BASE_URL` and `BRANCH_CODE` use dart-define readers. Its generic value is
not treated as functional environment selection.

## Runtime configuration and Supabase boundary

The environment resolver uses dart-define, then bundled dotenv, then local
fallback. The 441-test suite includes six environment cases proving define
precedence, loopback fallback rejection, Android emulator alias rejection,
valid HTTPS acceptance, and branch defaulting. Static inspection confirms a
malformed/hostless URL is rejected in release. It also confirms that scheme is
not checked: a non-loopback `http://` URL is currently accepted in release.
This is a **High transport-security release blocker** owned by SEC-05/STAB-20.
No device runtime executed, so this is resolver unit/static evidence, not
device-network proof.

`pubspec.yaml` declares `.env` as a Flutter asset. `main.dart` always loads it
and always calls `Supabase.initialize`, even though the accepted application
data authority is NestJS/PostgreSQL. Dormant `SupabaseService` code directly
selects/streams `event_services`; no call site was found. The URL/anon key are
public client values, never server/service-role secrets. Missing `.env` asset
loading would prevent startup; empty/invalid Supabase strings are not explicitly
validated before client construction and may cause unreliable initialization
or later provider failures. No real Supabase project was used. Removal and
fail-closed cleanup remain SEC-06/STAB-20.

## iOS configuration inventory

| Field                         | Verified state                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Flutter migration metadata    | Migration-only root/web entries and default pbxproj ignore                                                                                    |
| Schemes                       | One shared `Runner` scheme                                                                                                                    |
| Configurations                | `Debug`, `Profile`, `Release`; no dev/staging/prod schemes/configurations                                                                     |
| App / test bundle IDs         | `com.meeevents.meeEvents`; `com.meeevents.meeEvents.RunnerTests`                                                                              |
| Deployment target             | iOS 13.0                                                                                                                                      |
| Signing                       | Project has generic `iPhone Developer` identity; Runner has no development team/profile or explicit signing style; test target says Automatic |
| Entitlements/privacy          | No entitlements file, privacy manifest, usage-description key, background mode, or ATS override                                               |
| Display name / version source | Mee Events; `1.0.0` / build 1 would come from Flutter manifest if compilation reached Xcode                                                   |
| Orientations                  | iPhone plist: portrait plus both landscapes; iPad also includes upside-down. Flutter runtime requests portrait up/down only                   |
| App icon                      | All declared icon slots are populated at expected pixel sizes, including 1024×1024 marketing icon                                             |
| Plugin manager                | Flutter SPM feature enabled; Xcode project references generated local Flutter Swift package; no Podfile/Podfile.lock                          |

The plist/runtime orientation sets are inconsistent and require device/UI
policy validation. Missing usage descriptions are correct for capabilities not
implemented, but cannot be treated as a complete App Privacy declaration.
`flutter_secure_storage_darwin` documents Keychain Sharing entitlements; none
are configured or device-tested here.

## iOS build probes

Flavor-aligned command:

```sh
flutter build ios --release --no-codesign --flavor prod \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://mee-events-stab13.invalid/api/v1 \
  --dart-define=BRANCH_CODE=HYD
```

Result: exit 1 in about 1 second, after the expected no-codesign warning and
after Flutter invoked `/usr/bin/arch -arm64e xcrun xcodebuild -version`. That
probe exited 72 because `xcodebuild` was unavailable, then Flutter reported
`Application not configured for iOS`. Project enumeration, compilation, and
signing were not reached.

Non-flavored command:

```sh
flutter build ios --release --no-codesign \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://mee-events-stab13.invalid/api/v1 \
  --dart-define=BRANCH_CODE=HYD
```

Result: exit 1 through the same path; no `.app` was generated.

The ordered cause and later blockers are:

1. This host selects `/Library/Developer/CommandLineTools`; full Xcode is
   absent, so Flutter's `xcodebuild -version` probe fails and the Xcode project
   interpreter is not installed.
2. `projectInfo()` therefore returns null and produces no scheme/configuration
   build context. The tracked Info.plist uses
   `$(PRODUCT_BUNDLE_IDENTIFIER)`; without that context Flutter cannot
   substitute the tracked pbxproj value `com.meeevents.meeEvents`.
   `BuildableIOSApp.fromProject` returns null, and `build_ios.dart` reports
   `Application not configured for iOS`.
3. After a usable Xcode interpreter exists, the flavored command has a separate
   later blocker: only the shared `Runner` scheme and ordinary
   Debug/Profile/Release configurations exist, so `prod` flavor resolution is
   expected to fail through the flavor-not-found path. That path was skipped
   here and cannot explain the non-flavored probe.
4. Team, provisioning profile, entitlements, and signing remain later release
   blockers even after project/flavor discovery succeeds.

This ordering was rechecked in the installed Flutter 3.44.8 source at
`build_ios.dart` (the exit at line 945), `ios/application_package.dart`
(`BuildableIOSApp.fromProject`), `xcode_project.dart` (`projectInfo`,
`productBundleIdentifier`, and `_parseProductBundleIdentifier`), and
`ios/xcodeproj.dart` (`_updateVersion`). Flutter's metadata source labels the
platform/unmanaged-file section as migrate-command configuration.

The existing verbose logs contain the Xcode version probe and its exit 72; they
contain no `xcodebuild -list`, compilation, or signing invocation. `.metadata`
did **not** cause the observed error: its platform list and default unmanaged
pbxproj entry are inputs to Flutter migration, not this build path. The tracked
Runner project/workspace, shared scheme, plist, and Swift entry points exist.
Consequently, there is no iOS artifact, signing, architecture, framework,
entitlement, environment-asset, ATS, absolute-path, or reproducibility
evidence. IOS-02–06 own the toolchain, production scheme, team/profile, and
repeat proof; STAB-13 does not regenerate or edit native projects.

## Reproducibility conclusion

| Artifact       | Result                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Production APK | Not byte-identical; identical extracted files/ZIP entries and stable metadata/certificate/environment, differences confined to v2 signing block |
| Production AAB | Byte-for-byte identical across two clean builds at SHA-256 `35ba3b7bcf5cc80f10efa84fec3c4e1856edd08fa1fd7dd35ad987f310988f73`                   |
| iOS `.app`     | Not produced; repeat comparison impossible                                                                                                      |

There is no unexplained application-content difference. Reproducibility does
not cure the permission, signing, iOS toolchain/scheme, or security defects.

## CI alignment

CI matches local Flutter 3.44.8 and runs enforced-lockfile pub get, formatting, fatal-infos
analysis, tests, and only a dev debug APK. It copies `.env.example`, whose
Supabase strings are public placeholders, and passes emulator HTTP
`API_BASE_URL` plus explicit `BRANCH_CODE=HYD`; the unused `APP_ENV` define is
removed. CI does not build staging/prod APK, build AAB, run iOS, inspect
merged manifests/certificates/assets, retain/upload/attest artifacts, or prove
device/native/provider behavior. STAB-13 is local evidence; no remote CI run
was observed. STAB-16 implements the CI-only correction locally; remote proof
is pending.

## Security findings and owners

| Severity      | Finding                                                                                             | Owner                                         |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Critical      | None found in repository/artifact evidence                                                          | —                                             |
| High          | Production Android packages omit `INTERNET` and cannot support the networked product                | ANDROID-08/13, STAB-20                        |
| High          | Production Android packages use the Android Debug certificate                                       | ANDROID-04/05/08; founder signing-key custody |
| High          | No usable full Xcode on host; later iOS release setup remains absent                                | IOS-02–06                                     |
| High          | Mobile release resolver accepts non-loopback HTTP                                                   | SEC-05, STAB-20                               |
| High          | Always-on Supabase initialization and dormant direct table access violate the backend-only boundary | SEC-06, STAB-20                               |
| Medium        | Android backup policy is implicit and secure-storage backup exclusion is absent                     | CUST-03, ANDROID-13/14, STAB-20               |
| Medium        | No native network-security/pinning, iOS entitlement/privacy, or device validation proof             | STAB-17/20 and platform release phases        |
| Medium        | iOS plist orientations conflict with Flutter's runtime portrait restriction                         | IOS-05/08, accessibility/device testing       |
| Informational | APK signing block varies; AAB is byte-identical and package metadata is stable                      | Later release reproducibility/provenance      |

## Verification commands and cleanup

Commands were run from `apps/mobile` unless paths indicate artifact tools:

```sh
flutter --version
flutter doctor -v
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze --fatal-infos
flutter test --machine
flutter clean
flutter build apk --debug --flavor dev ...
flutter build apk --release --flavor prod ...
flutter build appbundle --release --flavor prod ...
flutter build ios --release --no-codesign --flavor prod ...
flutter build ios --release --no-codesign ...
apkanalyzer manifest ...
aapt2 dump badging ...
apksigner verify --verbose --print-certs ...
zipalign -c -P 16 -v 4 ...
jarsigner -verify -verbose -certs ...
keytool -printcert -jarfile ...
```

After evidence collection, `flutter clean` removed `build`, `.dart_tool`,
generated plugin dependency state, and iOS ephemeral/generated configuration.
All APK/AAB copies, extracted trees, reports, and hash manifests stayed outside
Git and were removed after documentation verification. The original ignored
`.env` was restored. No application server/device process was started, no
backend/provider/media endpoint was contacted, no signing private key was
inspected, and no app was installed or uploaded. Package/toolchain network
checks were limited to `flutter pub get` and `flutter doctor`.

## Definition-of-done assessment

| Item                                                      | Result                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| Git/toolchain/native configuration inventoried            | PASS                                                                  |
| Local environment protected and restored                  | PASS                                                                  |
| Dependencies resolved without lock drift                  | PASS                                                                  |
| Format/analyze/tests                                      | PASS                                                                  |
| Dev debug APK verified                                    | PASS                                                                  |
| Production APK/AAB compile and artifact boundary verified | PASS                                                                  |
| Android production usability                              | **BROKEN** — no INTERNET                                              |
| Android store readiness                                   | **BROKEN** — debug signing and no store process                       |
| iOS production-flavor result verified                     | PASS as failure evidence; Xcode unavailable, then prod scheme remains |
| iOS non-flavored unsigned result verified                 | PASS as failure evidence; Xcode unavailable; no artifact              |
| iOS signing/store readiness                               | **BROKEN / NOT PROVEN**                                               |
| Artifact public environment and secret scan               | PASS; known public fallbacks/Supabase/sample-media strings classified |
| CI limitations                                            | PASS, documented                                                      |
| Native/source/dependency changes                          | None                                                                  |
| Generated output committed                                | None                                                                  |

**Final STAB-13 status: COMPLETED WITH FINDINGS.** Every locally available
build probe was executed and the current Android/iOS states are conclusive.
Android and iOS release readiness remain broken. Phase 0 remains **NOT PASSED**.
The next permitted execution block is STAB-14; it was not started.
