# CUST-03 Session - Review Evidence

- Date: 2 September 2026
- Final state: **DONE WITH FINDINGS**
- Independent verdict: `APPROVE CUST-03 SESSION`
- Scope: Customer session restoration, secure local session state, serialized
  refresh, current/all-device logout, terminal-session UX, and Customer cache
  cleanup only

## Starting checkpoint

Work started from clean branch `master` at exact commit
`4f8b82daeb886a6e20d2ad834e8a1751af3ea0d2`, whose message is
`feat(customer): checkpoint deferred CUST-02 OTP`. CUST-01 was complete,
CUST-02 was partial/deferred for external Exotel evidence, and CUST-03 was the
next authorized module. No unexpected worktree change existed.

## Independent review and closeout

The independent review returned `APPROVE CUST-03 SESSION` with 0 P0 blocking
findings, 0 P1 blocking findings, 0 P2 blocking findings, 2 accepted P2
non-blocking findings, 0 P3 findings, and no required corrections. The
independent reviewer made no source changes.

The review baseline was branch `master` at exact commit
`4f8b82daeb886a6e20d2ad834e8a1751af3ea0d2`, message
`feat(customer): checkpoint deferred CUST-02 OTP`, with exactly the 23 paths
listed in this document: 19 modified, 4 untracked, 0 staged, and 0 deleted.
There was no unexpected path or unrelated user change. CUST-02 remained
partial/deferred, CUST-03 was approved but uncommitted, and CUST-04 had not
started.

## Existing Phase 0 session foundation

The audit found and retained these existing controls instead of duplicating
them:

- Successful OTP verification consumes the challenge and creates the user,
  device session, and audit records in one PostgreSQL transaction.
- Access JWTs are short-lived (900 seconds). Opaque refresh tokens have a
  30-day server-session lifetime, and the database stores HMAC digests rather
  than raw refresh values.
- Refresh already used process-local in-flight protection plus PostgreSQL
  `REPEATABLE READ`, an existing-session row lock, compare-and-set rotation,
  previous-digest reuse detection, revocation, and transactional audit writes.
- The access-token guard checked signed claims against the user, active role,
  unexpired/unrevoked device session, branch context, and a bounded principal
  cache.
- `POST /auth/logout`, `GET /auth/sessions`, and `POST /auth/logout-all` already
  derived the user/session from the authenticated principal. Current logout was
  idempotent and user-scoped; logout-all could not affect another user.
- Flutter already had a stable random installation ID in
  `flutter_secure_storage`, an auth-session secure-store abstraction, an API
  refresh callback, `AppGateway`, role switching, and user-scoped Favorites,
  recent-search, and Event Plan stores.

## CUST-03 gap analysis

The backend lifecycle was substantially complete. The missing CUST-03 behavior
was concentrated at the mobile boundary:

- The entire access token was persisted, without an absolute client expiry.
- Startup accepted stored JSON as an authenticated session without rotating or
  validating it against the server.
- Missing, partial, old, and corrupted stored records had no strict versioned
  shape.
- Every refresh failure cleared the session, including temporary network
  failures.
- Concurrent refresh was single-flight, but generic POST/PATCH/DELETE requests
  were blindly replayed after 401, and a rejected replay did not explicitly end
  the local session.
- Current-device logout silently claimed local completion even when server
  revocation failed. Mobile had no logout-all action or confirmation.
- Auth/session teardown did not erase account-scoped Customer caches.
- Restoration had no dedicated temporary-network or ended-session experience.
- Some backend authentication errors exposed token-validation terminology.

No schema or API-contract conflict was found. No migration was required.

## Implementation decisions

### Secure local session

Secure storage now uses version 2 with only the rotated refresh token, user ID,
mobile number, and active role. The access token is memory-first and carries an
absolute local expiry calculated from the authoritative server duration. The
reader validates version, token length, identifier shape, E.164 mobile shape,
and known role before using a stored record.

Version 1 remains read-only as a migration source. A successful refresh writes
version 2 before deleting the legacy key. Empty, partial, unsupported, or
corrupted records are deleted. Secure-storage write failure after rotation
fails closed instead of opening a private surface with a half-written session.
The existing installation ID implementation and key are unchanged.

### Serialized refresh and replay

All callers share the same in-flight refresh future. Success rotates and
persists once, then wakes every waiter with the same access token. A terminal
401/reuse/revocation/invalid-session response clears the secure record,
Customer-private caches, authenticated API state, and every waiter with one
generic `SESSION_ENDED` failure. A network/temporary failure wakes every waiter
consistently while retaining the stored session for retry.

The HTTP client may replay GET once. The authenticated current-device and
all-device logout requests explicitly opt in because the server contracts are
idempotent and a guard rejection occurs before their handlers. Other mutations
are not automatically replayed; after refresh they return a controlled
`REQUEST_NOT_REPLAYED` response so the customer can deliberately retry. The
refresh endpoint uses an unauthenticated client and cannot recursively refresh.
A replayed 401 ends the session and never starts a second refresh.

### Startup restoration

`AppGateway` starts restoration and shows the calm launch surface until both
the minimum launch delay and restoration are complete. An unexpired in-memory
access token continues without refresh. A durable session always performs one
refresh because access tokens are not persisted. Empty or malformed storage
returns to authentication. Terminal failures clear the session and show “Your
session has ended.” with a “Sign in” action. Temporary network failure retains
the durable session and shows “We couldn’t check your session” with Retry and
an explicit local-device removal action. A private Customer surface cannot
render during restoration.

### Logout and revocation

“Log out from this device” calls the authenticated current-session endpoint.
Confirmed server revocation then clears the local session and Customer caches.
If the server is unavailable, the customer is told that revocation was not
confirmed and may keep the session or explicitly remove it only from this
device. Local cleanup failure is represented separately and not reported as a
complete logout.

“Log out from all devices” requires confirmation, supports cancellation, and
calls the existing authenticated logout-all endpoint. The backend continues to
derive ownership from the access-token principal, not a client-supplied user
ID. Server failure leaves the local session active for retry; confirmed success
clears the current device.

### Role and privacy isolation

Logout, terminal invalidation, and identity change erase the signed-in user’s
Favorites, recent searches, and Event Plan. Those keys were already account
scoped; the cleanup leaves another account and safe non-user preferences
untouched. The stable installation ID is also preserved. Session state changes
rebuild dependent providers, clear the authenticated API token, dispose the
Customer shell, and pop role-specific navigation back to the first route.

## UI, UX, and accessibility

The Account tab received only a small reusable CUST-03 session-actions block;
the final Account/Profile redesign was not started. Confirmation and error
states use the existing Mee Events dialogs and buttons. Labels describe device
versus all-device impact, offline copy does not claim server success, and the
ended/connection screens avoid token, database, provider, stack, URL, and
internal-error terminology. The session-ended action has screen-reader
semantics, design-system target sizing, wrapping text, and no colour-only
meaning.

## Backend review and corrections

The existing endpoint, repository, transaction, rotation, reuse, revocation,
listing, and audit implementation was retained. CUST-03 changed only public
error wording in `AuthService` and `AccessTokenGuard`, plus regression tests.
Stable internal codes remain available for deterministic client handling, but
customers receive generic authentication-required, session-ended, or
temporary-session-check copy.

New assertions prove repeated current logout writes one audit event and is
idempotent, a different authenticated user cannot revoke the owner’s session,
and public error copy omits access/refresh-token mechanics. Existing unit and
PostgreSQL coverage continues to prove creation, expiry, rotation, concurrent
refresh, reuse revocation, current/all-device logout, other-user isolation,
audit writes, and transaction rollback.

## Database and migration review

No SQL, migration, schema, repository, or token representation changed. The
isolated PostgreSQL 17.2 harness replayed all 20 existing migrations and passed
the session concurrency, reuse, rollback, audit, current logout, logout-all,
other-user isolation, and reinstall-device cases. Production or founder data
was not accessed.

## Files changed

Backend behavior and tests:

- `apps/backend/src/modules/identity/application/auth.service.ts`
- `apps/backend/src/modules/platform-foundation/security/access-token.guard.ts`
- `apps/backend/test/access-token.guard.spec.ts`
- `apps/backend/test/auth-service.spec.ts`
- `apps/backend/test/switch-role.spec.ts`

Mobile session behavior and UI:

- `apps/mobile/lib/api/api_client.dart`
- `apps/mobile/lib/api/mobile_api.dart`
- `apps/mobile/lib/design_system/components/error/me_error.dart`
- `apps/mobile/lib/features/auth/app_gateway.dart`
- `apps/mobile/lib/features/auth/customer_private_data_cleaner.dart`
- `apps/mobile/lib/features/auth/session_provider.dart`
- `apps/mobile/lib/features/auth/widgets/session_actions.dart`
- `apps/mobile/lib/features/customer/screens/account_tab.dart`
- `apps/mobile/lib/models/auth_session.dart`

Mobile tests and constructor/storage regression updates:

- `apps/mobile/test/api_client_test.dart`
- `apps/mobile/test/cust_03_session_test.dart`
- `apps/mobile/test/customer_otp_test.dart`
- `apps/mobile/test/home_feed_test.dart`
- `apps/mobile/test/plan_tab_test.dart`
- `apps/mobile/test/role_switcher_test.dart`

Documentation:

- `docs/08-testing/cust-03-session-evidence.md`
- `docs/roadmap/MEE_EVENTS_MASTER_TODO.md`
- `docs/roadmap/MEE_EVENTS_PROGRESS.md`

## Independent verification results

The independent reviewer executed the complete required verification. Final
successful commands and exact results were:

- `dart format --output=none --set-exit-if-changed <changed Dart files>` -
  PASS; zero formatting drift.
- `flutter analyze --fatal-infos` - PASS; zero issues.
- `flutter test test/cust_03_session_test.dart test/api_client_test.dart` -
  PASS; 2 files, 28/28 tests.
- `flutter test test/customer_otp_test.dart test/role_switcher_test.dart
test/home_feed_test.dart test/plan_tab_test.dart` - PASS after correcting two
  stale button-label expectations; 4 files, 79/79 tests.
- `flutter test test/role_switcher_test.dart test/customer_shell_test.dart` -
  PASS; 2 files, 59/59 explicit AppGateway, role-switcher, and Customer-shell
  regression tests.
- `flutter test` - PASS; 32 files and 544/544 tests across the complete
  maintained Flutter suite.
- `corepack pnpm --filter @me-event/backend test --
test/auth-service.spec.ts test/access-token.guard.spec.ts` - PASS; 2 files,
  23/23 tests.
- `corepack pnpm --filter @me-event/backend test` - PASS with local loopback
  permission; 43 files, 293/293 tests.
- `corepack pnpm --filter @me-event/backend test:integration` - PASS with local
  Docker/loopback permission; 5 files, 42/42 tests.
- `corepack pnpm lint` - PASS; zero errors and warnings.
- `corepack pnpm typecheck` - PASS; zero errors.
- `corepack pnpm --filter @me-event/backend build` - PASS.
- `corepack pnpm exec prettier --check <changed TypeScript/Markdown files>` -
  PASS; zero formatting drift.
- `git diff --check` - PASS.

Final successful test runs reported zero failed and zero skipped tests. The
independent verdict therefore retained zero blocking findings and required no
source correction.

The first PostgreSQL run and the first full-backend run could not bind
`127.0.0.1` inside the filesystem sandbox. Both unchanged local-only commands
were retried with permission. The first full-backend run then also identified
one stale assertion for the deliberately generic session-ended wording; that
test expectation was corrected, and the full rerun passed. The first focused
Flutter regression run similarly identified two expected “Sign out” labels
that now accurately read “Log out from this device”; the test harness also
received a deterministic successful logout transport, and the rerun passed.
No failing check is hidden.

## Security review

- Raw refresh tokens remain client-side only in platform-secure storage and
  request bodies; the backend stores HMAC digests.
- Access tokens, refresh tokens, OTPs, mobile numbers, cookies, authorization
  headers, device credentials, and provider credentials are not newly logged.
- The client cannot select the user whose sessions are listed or revoked.
- Terminal refresh failures fail closed. Temporary connectivity failure is not
  falsely described as revocation.
- No bypass, silent provider fallback, production toggle, or local-OTP
  expansion was introduced.
- No ignored environment file was read. No provider, staging, or production
  endpoint was contacted. No SMS was sent.

## Accepted P2 non-blocking findings

1. Backend in-flight refresh de-duplication remains process-local. Across
   multiple backend instances, PostgreSQL transaction isolation, row locking,
   digest comparison, and rotation remain authoritative, and competing
   refreshes fail closed. This is not cluster-wide in-memory coordination.
2. The access-principal cache retains its existing maximum 15-second
   cross-instance revocation-observation window. Same-process revocation may be
   immediate, but another backend instance can accept an already-issued access
   token until its cached principal expires. This is documented and accepted
   as non-blocking for the current phase.

## External proof still pending

This closeout does not claim physical iOS Keychain testing, physical Android
Keystore testing, backup and restore testing, rooted or jailbroken device
testing, staging testing, production testing, real Exotel sandbox SMS, DLT
evidence, or physical-device SMS autofill. These remain release-stage
limitations. CUST-02 remains partial/deferred and must reopen before the final
Customer release gate.

## Scope and Git confirmation

CUST-03 is closed **DONE WITH FINDINGS - 2 September 2026** in one scoped
23-path commit. CUST-04 was not started. No Vendor, Worker, ERP, payment,
booking, production deployment, provider, DLT, or Account redesign work was
performed. No push occurred.
