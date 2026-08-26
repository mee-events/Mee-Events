# Flutter Test Baseline

STAB-10 was verified on 26 August 2026 from clean `master` at
`c6c00f35100c87062a42585990db6dc3a269b740`, tracking `origin/master`, ahead
10 and behind 0. This document records the maintained Flutter unit/widget
suite as it exists. It is not device, native, backend-integration, E2E,
release, or production evidence.

## Result

**PASS.** The CI-equivalent `flutter test` run discovered 27 files and passed
441/441 tests with 0 failures, 0 skips, and 0 expected failures. A fresh
serialized run with test-order seed `6102026` passed the same 27 files and
441 tests. The older 435-test count was stale; no test or application change
was required.

## Toolchain and runner configuration

| Field                      | Verified value                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flutter                    | 3.44.8 stable, framework revision `058e0af2c2`                                                                                                                                                                                      |
| Dart                       | 3.12.2 stable on `macos_arm64`                                                                                                                                                                                                      |
| Test framework             | SDK `flutter_test`; `test_api` 0.7.11 and local runner `test_core` 0.6.17                                                                                                                                                           |
| Canonical local/CI command | From `apps/mobile`: `flutter test`                                                                                                                                                                                                  |
| Discovery                  | Recursive scan of `test/`; filenames must end in `*_test.dart`                                                                                                                                                                      |
| Platform                   | Flutter tester's VM-based host environment; not Chrome, emulator, or device                                                                                                                                                         |
| Canonical concurrency      | Runner default `max(1, processors ~/ 2)`; 4 processes on this 8-core host. CI concurrency is runner-host dependent.                                                                                                                 |
| Default ordering           | Declaration order within each file; no random seed unless requested                                                                                                                                                                 |
| Default timeout            | 30 seconds per test; no suite override and no test/group override                                                                                                                                                                   |
| Reporter                   | Compact by default; JSON file reporter used only for temporary inventory evidence                                                                                                                                                   |
| Tags/filters               | No tags, exclude-tags, or repository test configuration                                                                                                                                                                             |
| Assets                     | Test asset bundle enabled by default; no separate test-assets tree                                                                                                                                                                  |
| Setup/helper               | No `flutter_test_config.dart`; one non-test helper, `test/support/favorites_test_fakes.dart`. `customer_search_screen_test.dart` also imports `FakeMobileApi` from `search_query_test.dart`, an acknowledged test-to-test coupling. |
| Additional config          | No `dart_test.yaml`, custom test runner, shard config, retry config, or setup hook                                                                                                                                                  |
| Golden/snapshot            | No golden tests, snapshot files, or golden-update configuration                                                                                                                                                                     |
| Coverage                   | Built-in `--coverage` is available but is not run in CI; no provider, threshold, exclusions, or committed report                                                                                                                    |
| Integration                | No `integration_test/`, `test_driver/`, device suite, or emulator job                                                                                                                                                               |

The Flutter command fails before execution if `test/` is absent or has no
`*_test.dart` files. The explicit probe
`flutter test test/__stab10_nonexistent_test__.dart` exited 1 with “Does not
exist” and “Some tests failed”; it did not create, rename, or delete a test.

## Exact inventory

The machine-readable run reported 468 lifecycle results: 27 hidden suite-load
events plus 441 owned test cases. Excluding the hidden load events gives the
counts below. “Unit” includes pure model, parser, store, notifier, and provider
logic. “Widget” means `testWidgets`; it does not imply native or device proof.
The sole “static” case reads repository files/assets and is not runtime image
decoding.

| Test file                          | Cases | Taxonomy           | Production implementation exercised                                                                | Fake/mock boundary                                    | Strength and limitation                                                                                                             |
| ---------------------------------- | ----: | ------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `api_client_test.dart`             |     1 | 1 unit             | `ApiClient` 401 refresh/retry and headers                                                          | `http.MockClient`                                     | Strong request-order/token regression; no socket, timeout, TLS, or live API proof                                                   |
| `bootstrap_response_test.dart`     |     1 | 1 unit             | Bootstrap JSON parser and vendor route                                                             | Inline JSON fixture                                   | Useful happy path; no malformed, unknown-surface, role, or branch denial                                                            |
| `catalog_image_resolver_test.dart` |    13 | 7 unit + 6 widget  | URL/media selection, fallback widgets and semantics                                                | Example URLs; Flutter test HTTP boundary              | Good fallback/semantics regression; no real CDN or native decoding proof                                                            |
| `catalog_json_compat_test.dart`    |     2 | 2 unit             | Catalog model JSON compatibility                                                                   | Inline JSON                                           | Useful optional-field compatibility; narrow positive shapes only                                                                    |
| `catalog_media_audit_test.dart`    |     1 | 1 static           | Asset declarations, references, and file magic bytes                                               | Local filesystem only                                 | Useful static consistency; two `>= 0` assertions are non-discriminating and it is not runtime decode proof                          |
| `category_detail_screen_test.dart` |    35 | 3 unit + 32 widget | Occasion matching, category/occasion detail, checkout/workspace/service routes                     | Riverpod overrides, in-memory preferences             | Strong Customer journey/error/loading/refresh/semantics coverage; no backend booking/enquiry integration                            |
| `customer_account_scope_test.dart` |     7 | 7 unit             | User-scoped favorites, plan, recent searches, sign-out behavior                                    | Mock `SharedPreferences`                              | Strong local cross-account regression; does not prove server ownership or native storage                                            |
| `customer_catalog_copy_test.dart`  |     3 | 3 unit             | Customer-safe labels and enquiry context copy                                                      | Direct function inputs                                | Useful deterministic copy contract; intentionally narrow                                                                            |
| `customer_search_screen_test.dart` |    22 | 22 widget          | Search states, result grouping/routes, pagination and responsive semantics                         | `FakeMobileApi`, provider overrides, mock preferences | Strong UI and unsupported-route regression; not real search/API integration                                                         |
| `customer_shell_test.dart`         |    34 | 2 unit + 32 widget | Typed tabs, shell navigation/header, badges, back behavior and state retention                     | Provider overrides, mock preferences                  | Strong Customer shell regression; no native navigation or complete account/enquiry journey                                          |
| `design_system_test.dart`          |     8 | 8 widget           | Buttons, cards, badges, segmented controls and header semantics                                    | Widget-only callbacks                                 | Useful component regression; not visual/golden or assistive-technology proof                                                        |
| `environment_test.dart`            |     6 | 6 unit             | API URL/branch environment resolution                                                              | Supplied strings only                                 | Proves loopback/emulator release rejection; does not reject every non-HTTPS remote release URL                                      |
| `event_plan_provider_test.dart`    |     8 | 8 unit             | Plan notifier ordering, rollback, load races and retry                                             | Scripted store                                        | Strong local async/state regression; no server persistence or enquiry integration                                                   |
| `explore_tab_test.dart`            |    33 | 2 unit + 31 widget | Explore sorting, sections, detail routes, refresh/errors/semantics                                 | Riverpod catalog overrides, mock preferences          | Strong Customer browse regression; no live pagination/catalog service                                                               |
| `favorites_provider_test.dart`     |    19 | 19 unit            | Favorites notifier races, rollback, isolation and retry                                            | Scripted/SharedPreferences stores                     | Strong async/local-state regression; not backend sync proof                                                                         |
| `favorites_screen_test.dart`       |    20 | 20 widget          | Saved loading/error/empty/filter/routes/remove/undo/responsiveness                                 | Scripted store, provider overrides, mock preferences  | Strong Customer UI regression; local-only persistence and fake catalog                                                              |
| `favorites_store_test.dart`        |    14 | 14 unit            | Serialization, corruption tolerance, ordering and failure propagation                              | In-memory platform-interface store                    | Strong store contract; native plugin/keychain behavior is untested                                                                  |
| `home_feed_test.dart`              |    14 | 1 unit + 13 widget | Resume selection, sibling failures, refresh and final plan count                                   | Provider/store overrides, memory session              | Useful multi-provider Customer regression; fake data is not backend integration                                                     |
| `home_tab_test.dart`               |    67 | 1 unit + 66 widget | Customer Home data ordering, loading/error, navigation, media, responsive and accessibility states | Provider overrides and example media URLs             | Broadest Customer widget evidence; no live network, device rendering, or full journey                                               |
| `plan_tab_test.dart`               |    20 | 20 widget          | Plan loading/error/empty, item actions, checkout/login routes and responsiveness                   | Scripted store, memory session, mock preferences      | Strong local plan UI regression; no pricing/payment/backend behavior                                                                |
| `product_detail_screen_test.dart`  |    32 | 1 unit + 31 widget | Product validation gates, gallery, plan/favorites, checkout, errors and semantics                  | Provider/scripted-store overrides                     | Strong Customer detail regression; fake catalog/plan and no quote backend                                                           |
| `recent_searches_store_test.dart`  |     8 | 8 unit             | Queueing, race, account isolation, dispose and failure behavior                                    | Mock `SharedPreferences`                              | Strong local-state isolation; native persistence untested                                                                           |
| `role_switcher_test.dart`          |    21 | 9 unit + 12 widget | Mobile-role mapping, switching, storage failure, gateway routing and stack clearing                | Scripted API, memory/throwing session stores          | Meaningful role-routing regressions; Vendor/Worker are dashboard smokes and server authorization/native secure storage are unproved |
| `search_header_test.dart`          |     5 | 2 unit + 3 widget  | Header state and recent-search store behavior                                                      | Mock preferences                                      | Useful narrow regression; notification remains disabled and unintegrated                                                            |
| `search_query_test.dart`           |    13 | 13 unit            | Debounce, stale response rejection, pagination, recent-write failures and disposal                 | `fake_async`, `FakeMobileApi`, mock preferences       | Strong deterministic async logic; no real HTTP/offline transport                                                                    |
| `service_detail_screen_test.dart`  |    33 | 1 unit + 32 widget | Service/product filtering, plan/checkout, errors/refresh and semantics                             | Provider/scripted-store overrides                     | Strong Customer detail regression; no real availability/vendor/quote integration                                                    |
| `widget_test.dart`                 |     1 | 1 widget           | `AppTheme.light` primary brand color                                                               | Widget host only                                      | Useful smoke; not an application bootstrap test                                                                                     |

Aggregate taxonomy:

- **111 behavioral unit/provider/store cases** across 11 pure-unit files and
  ten mixed unit/widget files.
- **329 widget cases** across 15 files.
- **1 static asset-consistency case** in `catalog_media_audit_test.dart`.
- **48 parameterized cases** are registered by ten loop-based declarations;
  those loops add 38 cases beyond the 403 static `test`/`testWidgets` call
  sites.
- **441 total cases** across 27 discovered files, plus one non-test support
  file. There is no other maintained Flutter test tree.

## Run evidence

| Run                      | Files | Tests | Pass |           Fail | Skip | Expected failure | Duration/result                                             |
| ------------------------ | ----: | ----: | ---: | -------------: | ---: | ---------------: | ----------------------------------------------------------- |
| Canonical `flutter test` |    27 |   441 |  441 |              0 |    0 |                0 | Compact runner 20 s; 25.1 s command wall time; exit 0       |
| Serialized shuffled run  |    27 |   441 |  441 |              0 |    0 |                0 | Seed `6102026`, concurrency 1; JSON runner 45.058 s; exit 0 |
| Missing-path probe       |     0 |     0 |    0 | 1 load failure |    0 |                0 | 1.0 s; exit 1 as required                                   |

Neither complete run emitted a warning, Flutter exception, overflow, semantics
warning, pending-timer failure, unhandled async error, or framework failure.
There are no timeout overrides or timeout/expected-failure cases. One test
successfully asserts that a failing refresh future throws; this is an ordinary
passing negative assertion, not a runner-level expected failure.

## Hidden, disabled, and quality review

Repository search and registration inspection found:

- no `skip:`, skipped group/test, focused/solo/only test, conditional
  registration, tag exclusion, retry, expected-failure annotation, timeout
  override, or empty registration;
- no swallowed test exception or test without an expectation;
- no arbitrary `Future.delayed`; asynchronous tests use bounded pumps,
  `Completer`, or `fake_async`;
- one `pumpAndSettle`, limited to opening the role-switch sheet before a
  storage-failure assertion; the rest of the suite uses bounded pumps;
- no golden update, snapshot update, or coverage artifact;
- a useful but static asset audit whose `emptyOrCorrupt >= 0` and
  `unused.length >= 0` assertions cannot fail. Its meaningful checks are asset
  existence, declared/reference relationships, magic-byte classification, and
  the known HTML-stub inventory. It is classified as static consistency, not
  runtime image proof.
- `customer_search_screen_test.dart` imports `FakeMobileApi` from
  `search_query_test.dart`. It is deterministic today, but moving shared fakes
  under `test/support` would reduce maintenance coupling if either file grows;
  this is not a hidden or duplicate test registration.

Most Customer UI cases assert behavior, route arguments, provider state,
redacted errors, control state, semantics, geometry, or retry counts rather
than only widget presence. Provider/store suites execute production notifiers
and stores but replace persistence/network dependencies. They must not be
described as backend, database, provider, or native integration.

## Determinism and isolation

The seed-`6102026`, concurrency-1 run changed test order within every file and
passed the same 441 cases. Isolation review found:

- Riverpod containers/scopes are recreated and disposed through `tearDown` or
  `addTearDown`; pending-load/disposal races have explicit cases.
- `SharedPreferences` uses mock/in-memory storage and is reset in setup; the
  controllable platform helper is returned to mock state in teardown.
- Authentication/session cases use memory or throwing stores. No test invokes
  the real `FlutterSecureStorage` method channel, so native confidentiality is
  not proven.
- HTTP behavior uses `MockClient` or overridden `MobileApi` methods. Loopback,
  `.test`, and `cdn.example` strings are fixtures; no production/staging or
  external provider call is made.
- No test installs a method-channel handler, `HttpOverrides`,
  `FlutterError.onError`, or Supabase client. The one global
  `WidgetController.hitTestWarningShouldBeFatal` mutation is restored in
  `finally`.
- View size/pixel ratio and semantics handles are reset/disposed with
  teardown/finally. Search debounce uses `fake_async`; bounded animations and
  completers completed or safely outlived disposed widgets.

The two successful fresh processes found no order dependency, leaked provider
state, storage state, client, handler, mock, timer, or animation.

## Product-role coverage

| Role/surface                                      | Covered evidence                                                                                           | Missing evidence                                                                                                                                             | Strength / owner                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Customer authentication/session                   | Logged-out plan route, in-memory session restore/role switch, refresh-on-401, local account isolation      | OTP request/verify/resend failures, expiry/replay/attempt limits, corrupt native session, revoked/expired session, stable device identity, logout/revoke-all | Partial local regression. SEC-03/STAB-20 and CUST-01–04 |
| Customer shell/navigation                         | Typed Home/Explore/Plan/Enquiries/Account order, stack/back behavior, header, role switch, state retention | Native deep links, process restart, system permission routes                                                                                                 | Strong widget evidence; STAB-17/CUST-28 for E2E         |
| Customer Home                                     | Live-provider-shaped loading/success/error/resume/media/navigation, responsive/accessibility cases         | Real API/cache/offline and device image behavior                                                                                                             | Broad widget regression; CUST-05/CUST-28                |
| Explore/catalog/details/search                    | Sorting, filtering, pagination state, unsupported types, details, favorites/plan/checkout handoff          | Live catalog/search, server visibility/authorization, network offline/timeouts                                                                               | Broad fake-boundary regression; CUST-06–09/CUST-28      |
| Favorites/Event Plan                              | Local persistence, account separation, rollback, races, loading/error/empty, navigation                    | Cross-device scope decision, backend ownership/sync, enquiry/payment workflow                                                                                | Strong local regression; CUST-10/11/CUST-28             |
| Enquiries                                         | Tab navigation, checkout route arguments, Home resume card/error states                                    | Full create/edit/track/detail lifecycle against API/PostgreSQL                                                                                               | Smoke/partial; CUST-11–13/CUST-28                       |
| Account/profile                                   | Account-scoped local data and role-switch entry                                                            | Profile edit, logout/revocation UX, documents, privacy controls                                                                                              | Narrow; CUST-03/14/17/27                                |
| Notifications/documents/payments/location/offline | Notification icon is explicitly disabled                                                                   | Functional flows, native permissions, sensitive display, offline policy, payment/provider behavior                                                           | Missing; relevant CUST/INT tasks, STAB-17/20            |
| Vendor                                            | Gateway route and dashboard switch-back chip                                                               | Onboarding/profile, services/products, assignments, progress/completion, documents/settlements, authorization                                                | Routing smoke only; VEND-01–20 and STAB-17/20           |
| Worker                                            | Gateway route and dashboard switch-back chip                                                               | Profile, availability, work, attendance, task progress, location/privacy, authorization                                                                      | Routing smoke only; WORK-01–17 and STAB-17/20           |

No test evidence supports Employee Mobile completion.

## Security coverage

| Area                    | Covered                                                                                                     | Material missing/finding                                                                                                 | Severity and owner                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| API refresh             | One 401 causes one refresh, rotated bearer use, and one retry                                               | Timeout, refresh failure/reuse/revocation, concurrent requests, logging                                                  | High follow-up: SEC-03/05, STAB-20                                           |
| Local account isolation | Favorites, Event Plan, and recent searches are separated and empty on sign-out                              | Backend ownership/BOLA and native backup/restore                                                                         | High server proof: SEC-02/STAB-15/20; native: STAB-13/17                     |
| Role switching          | Assigned mobile roles, employee exclusion, API/storage failures, route selection, navigation-stack clearing | Unknown surface/role currently defaults toward Customer; unsupported branch/capability/malformed bootstrap denial absent | High: SEC-06/STAB-20, CUST-04                                                |
| Session storage         | Simulated secure-store write failure preserves prior state                                                  | Real Keychain/Keystore channel, corrupt payload, logout/revoke, randomly regenerated device identity                     | High: SEC-03/STAB-20, CUST-03                                                |
| Environment/transport   | Release rejects loopback and emulator host; valid HTTPS accepted                                            | Release currently accepts a non-HTTPS remote URL                                                                         | High: SEC-05/06, STAB-13/20                                                  |
| External JSON           | Some catalog optional-field compatibility and one bootstrap happy path                                      | Runtime casts and malformed API/OTP/bootstrap response validation                                                        | High for auth/bootstrap, medium elsewhere: SEC-06/STAB-20/module tasks       |
| Error redaction         | Customer search/favorites/plan/details/provider failures hide injected secret strings                       | Broader API/auth/native/log error strings and PII/token logging                                                          | Medium/high: SEC-05/STAB-20                                                  |
| Supabase boundary       | No test calls Supabase                                                                                      | Always-on initialization and dormant direct table access remain untested architectural debt                              | High: SEC-06/STAB-20                                                         |
| Splash lifecycle        | No pending timer appeared in tests                                                                          | Splash timer is not retained for cancellation and has no focused regression                                              | Medium: STAB-20/mobile lifecycle task                                        |
| OTP                     | None                                                                                                        | Expiry, failure, replay, attempt limits, cooldown, provider error, concurrency                                           | High: SEC-03/STAB-20, CUST-01/02                                             |
| Payments/privacy        | Plan UI has no invented prices; notification is disabled                                                    | Amount/status integrity, provider proof, location, documents, sensitive UI, screenshot/clipboard, PII logs               | High where money/auth/privacy is involved: INT-02, CUST-17/18/21/27, STAB-20 |

The known STAB-09 findings were not hidden by new tests. Device identity,
bootstrap fail-closed semantics, transport policy, Supabase removal, runtime
validation, and error/log policy require security/architecture changes beyond
a documentation-only test baseline. They remain explicit STAB-20 work; the
green suite is not runtime validation or a security sign-off.

## Accessibility, responsive, and state evidence

Meaningful widget assertions cover unique semantic nodes, button/selected/
enabled/tap actions, semantic navigation, disabled notifications, minimum
44-pixel targets, system back behavior, 320- and 390-logical-pixel widths,
text scale 1.0/1.3 and selected 1.5/2.0 Home cases, overflow checks, long labels,
reduced-motion and accessible-navigation media queries, and loading/error/
empty states across Customer Home, Explore, Search, Favorites, Plan, and detail
screens.

There is no proof for TalkBack, VoiceOver, native focus order, real device font
rendering, contrast certification, platform accessibility services, or native
permission dialogs. “No Flutter exception/overflow” at fixture sizes is useful
regression evidence, not device accessibility certification. Offline behavior
is not tested; injected provider failures are error-state tests, not airplane-
mode, cache, retry/backoff, or reconnect proof.

## Coverage and missing integration layers

CI runs `flutter test` without `--coverage`. STAB-10 did not generate a line
percentage because no repository threshold, exclusion policy, or reporting
contract exists, and a percentage would not correct the larger boundary gap.
Taxonomy and per-file counts are the canonical evidence.

Missing layers retain these owners:

- `STAB-17`: establish device/API E2E foundations with isolated accounts and
  no production endpoints.
- `STAB-20` (`SEC-03`, `SEC-05`, `SEC-06`): authentication/session races,
  stable device identity, transport/error/logging, bootstrap fail-closed
  validation, and removal of the direct Supabase boundary.
- `CUST-28`, `VEND-20`, `WORK-17`: complete Customer, Vendor, and Worker
  integration/device journeys after their features and security controls.
- `STAB-13`: native Android/iOS configuration and release-boundary proof.
- `STAB-15/16`: live database/integration proof and CI coverage/reporting
  policy where justified.

Unit/widget success does not prove live Nest/PostgreSQL behavior, OTP/payment/
notification/storage/location providers, Android/iOS plugins and permissions,
browser/device E2E, store release behavior, or production readiness.

## Verification commands

```sh
cd apps/mobile
flutter --version
dart --version
flutter test --help
flutter test
flutter test --test-randomize-ordering-seed=6102026 --concurrency=1 \
  --file-reporter=json:/private/tmp/stab10-flutter-tests-6102026.jsonl
flutter test test/__stab10_nonexistent_test__.dart # expected exit 1
dart format --output=none --set-exit-if-changed lib test
flutter analyze --fatal-infos
```

The JSON report is temporary evidence outside the repository. No `.next`,
coverage, Flutter build, native build, golden, environment, or test-report
artifact is committed. STAB-10 changes documentation only. Phase 0 remains
**NOT PASSED**; the next permitted block is STAB-11, which was not started.
