# CUST-02 OTP Lifecycle - Review Evidence

- Implementation evidence date: 30 August 2026
- Deferred-checkpoint decision date: 1 September 2026
- Review state: Partial - offline approved, external Exotel evidence pending;
  not roadmap-complete
- Scope: Customer OTP entry, verification, countdown, resend, expiry,
  provider-failure recovery, and challenge replacement only

## Starting state

The implementation started from branch `master` at
`42512bb230e99ece81ba6b2d97aae0d0b50172fb` with a clean worktree. The live
roadmaps recorded CUST-01 as **DONE WITH FINDINGS** and CUST-02 OTP as **NOT
STARTED**.

The existing Flutter flow already requested an OTP through the real Mee Events
API contract, accepted a basic six-character code, used the stable installation
ID, persisted the returned session through the secure-storage boundary, and
returned control to `AppGateway`. The backend already stored an HMAC digest
instead of OTP plaintext, used constant-time comparison, enforced a five-minute
TTL, five attempts, a 60-second resend cooldown, five requests per hour, and an
atomic challenge/user/session/audit completion transaction.

The live documentation and pages 15-16 of
`output/pdf/Mee_Events_Customer_Interface_Implementation_Manual_v1.pdf` were
used as the product baseline.

The Exotel adapter slice began later on the same `master` commit with exactly
the 12 CUST-02 paths listed in the original Files changed section already dirty
and nothing staged. There were no unexpected files or unrelated overlapping
changes. Those approved changes were preserved; the adapter work did not
reimplement or revert them.

## Exact implementation gap

- Flutter had no masked destination, server-derived countdowns, resend action,
  lifecycle-aware expiry, request-new-code recovery, strict digits-only/six
  digit entry, controlled verification error mapping, or focused OTP
  accessibility coverage.
- Verify failures rendered raw API/runtime text, and duplicate Verify requests
  were not guarded at method level.
- A successful resend did not supersede an earlier open server challenge, so an
  old code could remain valid.
- Provider delivery failure left the persisted challenge and its cooldown open,
  preventing immediate retry.
- The fifth incorrect attempt was decremented to zero but still reported as an
  ordinary incorrect-code result until the next request.
- Cooldown, hourly request counting, old-challenge invalidation, and new
  challenge creation were separate repository actions and were not serialized
  across backend replicas.

## Provider-decision status

On 30 August 2026, Harinath approved Exotel Programmable SMS as primary and
MSG91 as runner-up for an India-only pilot of 1,000-10,000 messages per month.
The OTP remains Mee-managed; Exotel is delivery-only. No first-launch fallback
is required. Harinath remains the Owner and intended Exotel account owner.
Vinay owns the technical implementation.

The approval covers the adapter, strict configuration, documentation, and
offline contract tests only. Budget, written quotation, legal entity, GST, DLT
Principal Entity, sender/header, and approved template remain pending. No
Exotel account was created, no plan was purchased, no real credential was read
or used, no provider network call occurred, and no SMS was sent.

## Deferred external evidence decision

- **Decision date:** 1 September 2026
- **Development scheduling decision-maker:** Vinay (Developer)
- **Complete:** The provider-independent OTP lifecycle and the Exotel delivery
  adapter, fail-closed configuration, privacy boundaries, and offline contract
  tests are independently approved under the verdict **APPROVE EXOTEL ADAPTER
  SLICE - SANDBOX EXECUTION PENDING**.
- **Deferred:** Live Exotel sandbox execution, DLT registration and mapping,
  physical-device SMS receipt, and physical-device OTP autofill evidence.
- **Development scheduling decision:** Vinay (Developer) made the development
  scheduling decision on 1 September 2026 to continue Customer-interface
  development using the existing development/test-only local OTP boundary while
  external Exotel work remains pending.
- **External Exotel owner:** Harinath remains the Owner and intended Exotel
  account owner. He is responsible for the private Exotel account/trial, written
  quotation, budget and procurement, legal entity/GST decisions, DLT Principal
  Entity registration, sender/header approval, exact SMS template approval and
  mapping, and company-owned-device sandbox authorization.
- **Required return gate:** Reopen CUST-02 and fully close the deferred Exotel,
  DLT, company-device SMS, and autofill evidence before the final Customer
  release gate. A real sandbox run still requires separate explicit
  authorization and privacy-safe evidence.
- **SMS statement:** No real SMS was sent.
- **Completion statement:** CUST-02 is not completed.

The scheduling decision is: CUST-02 remains **PARTIAL**. The offline OTP
lifecycle and Exotel delivery adapter are independently approved. The live
Exotel sandbox, DLT, physical-device SMS, and autofill evidence remain pending
while Customer-interface development continues using the existing
development/test-only local OTP boundary. Staging and production remain
fail-closed. CUST-03 may proceed only after this checkpoint is independently
reviewed and committed. CUST-02 must be reopened and fully closed before the
final Customer release gate. This decision does not approve production SMS.

## Exotel adapter implementation

- `OTP_PROVIDER=exotel` now explicitly selects `ExotelOtpProvider`;
  `OTP_PROVIDER=external` and generic SMS variables are retired. Local remains
  available only in development/tests, and deployed environments cannot fall
  back to it.
- Every Exotel value is required and boot-validated in Exotel mode. Only
  `https://api.in.exotel.com` is allowed; credential-bearing/arbitrary URLs,
  path-injecting account IDs, unsafe sender/DLT formats, invalid templates,
  unsafe timeouts, blanks, and deployed placeholders fail closed.
- The adapter accepts only canonical Indian E.164 numbers and six numeric
  digits, makes one form-encoded call through an injected transport, sends
  credentials only in the Basic `Authorization` header, and includes the
  approved sender, DLT IDs, and `SmsType=transactional`.
- The configured body contains exactly one `{{OTP}}` placeholder. Newlines,
  URLs, control characters, extra template markers, and overlong copy are
  rejected; the rendered body is never logged.
- The initial timeout is 5,000 ms, bounded to 1,000-10,000 ms. There is no
  adapter retry after timeout, network failure, throttling, or 5xx.
- HTTP 200 is accepted only with a non-empty `SMSMessage.Sid`; it is never
  described as delivery proof. Only the provider message ID crosses the port.
  Raw provider errors and malformed bodies are discarded.
- The existing `AuthService` provider-failure invalidation and generic customer
  error remain unchanged and are regression-tested.
- No delivery callback was added. Callbacks remain non-authoritative INT-01
  telemetry and cannot verify codes, create sessions, or reopen challenges.

## Flutter changes

- The existing Mee Events login screen now presents a branded OTP step with a
  masked India destination, six-digit numeric input, OTP autofill, paste support,
  controlled validation, one Verify and Continue action, loading state, and
  duplicate guard.
- Only the canonical mobile value needed for resend remains in widget memory.
  It is not persisted and is cleared with the challenge when the customer uses
  a different number or signs in successfully.
- Known backend codes and unknown/network failures map to controlled customer
  messages. Raw `ApiError.message`, exceptions, provider details, identifiers,
  URLs, and stack text are never rendered.
- Successful verification still uses the stable installation ID, existing
  `SessionNotifier.signIn` secure-storage boundary, and `AppGateway` handoff.
  The autofill context finishes without asking the platform to save the OTP.

## Countdown, expiry, resend, and recovery

- Deadlines are computed when each server response arrives from
  `expiresInSeconds` and `resendAfterSeconds`; displayed time is recalculated
  from the injected clock rather than timer-tick counts.
- App resume recalculates both deadlines. The timer is cancelled on expiry,
  challenge replacement, successful sign-in, different-number recovery, and
  widget disposal.
- Resend remains disabled during cooldown, has a guarded loading state, reuses
  the same canonical mobile value, and replaces the local challenge only after
  a successful response. A successful resend clears the prior code/error and
  resets both deadlines.
- Expired, exhausted, consumed, and invalid challenges disable Verify and offer
  a clear Request New Code recovery. A rate-limited resend preserves a still
  valid current code path. An ambiguous network/provider/server resend result
  disables the potentially superseded local challenge rather than risking use
  of stale state.

## Backend and repository changes

- The repository port now exposes one replacement operation that enforces
  cooldown/hourly limits, invalidates prior open challenges, and stores the new
  challenge as a single serialized persistence decision.
- PostgreSQL uses a transaction-scoped advisory lock keyed by canonical mobile
  value. This preserves shared per-mobile request limits and challenge
  replacement across service instances without a new migration or Redis.
- A successful resend marks previous open challenges consumed before the new
  challenge is delivered. Tests prove the old code fails and the replacement
  code succeeds.
- Incorrect verification now returns `OTP_ATTEMPTS_EXHAUSTED` on the exact
  fifth failure, while the existing constant-time digest comparison and atomic
  one-time completion remain intact.

## Provider-failure recovery

- The challenge remains durably stored before provider delivery, so a delivered
  code cannot exist without verifiable server state.
- If delivery fails, the service invalidates only the exact newly-created
  challenge and returns the existing generic `OTP_DELIVERY_UNAVAILABLE` error.
  Immediate retry is then allowed.
- Failed delivery rows remain present and count toward the hourly abuse limit;
  they are soft-invalidated through the existing `consumed_at` field.
- If the exact cleanup write itself fails, the service still returns only the
  generic provider error and emits no OTP/mobile/provider detail. It fails
  closed; the exceptional retained cooldown risk is recorded below rather than
  hidden.

## Security and privacy decisions

- OTP plaintext is sent only through the existing provider port and is never
  persisted. HMAC digest storage and `timingSafeEqual` remain unchanged.
- User existence is not queried during OTP request, preserving the same public
  response shape for existing and unknown users.
- The PostgreSQL replacement lock and request count are authoritative across
  replicas. Flutter and `AuthService` retain their process-local rapid-action
  guards; the existing process-local IP cap remains honestly local.
- Existing Pino request redaction continues to cover the mobile request field;
  Exotel API key/token/account fields are now explicitly redacted too. The
  adapter adds no logging, analytics, or persistence of mobile or OTP values.
- OTP request and verify remain intentionally public. Logout, role switching,
  bootstrap authorization, role assignment, and Customer/Vendor/Worker
  boundaries were not changed.
- No database migration was required: `consumed_at` safely represents used,
  superseded, and failed-delivery-invalidated challenges.

## Accessibility behavior

- The OTP field has a clear label, numeric keyboard, one-time-code autofill,
  digits-only/max-length formatters, and focus after request/resend or a
  recoverable verification error.
- The masked destination is spoken as an ending rather than as a complete
  mobile value.
- Errors and loading use controlled live regions. Countdown text is not live,
  so it is not announced every second; resend availability is exposed through
  one stable live-region message per challenge.
- Shared Mee Events buttons retain 44-logical-pixel minimum targets. The screen
  scrolls and keeps critical controls available at 2x system text on a
  320-logical-pixel-wide device.

## Files changed

- `apps/mobile/lib/features/auth/screens/login_screen.dart` - complete scoped
  OTP entry, countdown, verification, resend, recovery, privacy, focus, and
  accessible-state behavior.
- `apps/mobile/lib/features/auth/otp_time_source.dart` - injectable clock and
  periodic-ticker boundary for real-deadline behavior and deterministic tests.
- `apps/mobile/lib/features/auth/indian_mobile_number.dart` - masked canonical
  India destination helper.
- `apps/mobile/lib/design_system/components/inputs/me_inputs.dart` - existing
  phone/OTP inputs gain focus, submit, enabled, action, and strict OTP-length
  support without new styling.
- `apps/mobile/test/customer_otp_test.dart` - focused OTP lifecycle,
  interaction, failure, privacy, timer, accessibility, and sign-in tests.
- `apps/backend/src/modules/identity/ports/identity-repository.ts` - atomic OTP
  replacement and exact invalidation contracts.
- `apps/backend/src/modules/identity/adapters/in-memory-identity.repository.ts`
  - serialized replacement/invalidation behavior for unit tests.
- `apps/backend/src/modules/identity/adapters/postgres-identity.repository.ts`
  - transaction/advisory-lock replacement and exact soft invalidation.
- `apps/backend/src/modules/identity/application/auth.service.ts` - uses the
  replacement contract, recovers from provider failure, and reports exact
  attempt exhaustion.
- `apps/backend/test/cust-02-otp-lifecycle.spec.ts` - focused lifecycle,
  replacement, recovery, abuse, concurrency, privacy, and fail-closed provider
  tests.
- `apps/backend/test/integration/identity.integration.spec.ts` - real
  PostgreSQL resend replacement, cross-pool serialization, and failed-delivery
  recovery coverage.
- `apps/backend/.env.example` - local-mode Exotel key names remain commented and
  empty/synthetic only.
- `apps/backend/.env.staging.example` and `.env.production.example` - explicit,
  deliberately non-bootable Exotel placeholders; no credentials.
- `apps/backend/src/config/environment.ts` - explicit provider selector,
  complete Exotel contract, India-host allowlist, format/template/timeout rules,
  deployed placeholder rejection, and local/deployed fail-closed behavior.
- `apps/backend/src/common/http/http-surface.ts` - redacts Exotel key, token, and
  account identifiers in structured logs.
- `apps/backend/src/modules/identity/adapters/exotel-http.transport.ts` -
  injectable one-attempt built-in-fetch transport with AbortController timeout.
- `apps/backend/src/modules/identity/adapters/exotel-otp.provider.ts` - Exotel
  request construction, strict runtime defense, response validation, safe error
  mapping, and no-retry delivery adapter.
- `apps/backend/src/modules/identity/adapters/external-otp.provider.ts` - removed
  so there is no competing generic deployed-provider system.
- `apps/backend/src/modules/identity/identity.module.ts` - explicit local/Exotel
  DI selection with unknown-selector failure and no fallback.
- `apps/backend/test/environment.spec.ts` - focused Exotel boot, host, path,
  sender, DLT, template, timeout, placeholder, and local-boundary coverage.
- `apps/backend/test/exotel-otp.provider.spec.ts` - offline request, success,
  failure, privacy, one-call, timeout, and selector contract tests.
- `apps/backend/test/http-surface.spec.ts` and `pino-redaction.spec.ts` - Exotel
  structured-log redaction regression coverage.
- `docs/adr/0012-exotel-otp-delivery.md` - accepted founder/provider decision,
  architecture, security, callback, retry, configuration, and blocker record.
- `docs/07-deployment/environment.md` - canonical Exotel environment matrix and
  fail-closed behavior.
- `docs/07-deployment/exotel-otp-sandbox-runbook.md` - private setup, rotation,
  offline tests, later evidence, DLT, callback, and emergency-disable guidance.
- `docs/05-security/authentication.md`, `identity-foundation.md`, and
  `secrets.md` - canonical OTP/provider, remaining-production, and secret-
  handling boundaries.
- `docs/05-security/sec-03-session-control-inventory.md` - replaces the retired
  generic-provider inventory row with the implemented Exotel/offline-only and
  remaining INT-01 boundary.
- This file - CUST-02 review evidence only; no roadmap status change.

## Verification

Final commands and results:

- `dart format --output=none --set-exit-if-changed <5 changed Dart files>` -
  first sandbox attempt could not write the installed Flutter SDK cache;
  unchanged permitted retry PASS, 5 files checked and 0 changed.
- `corepack pnpm exec prettier --check <23 changed TypeScript/Markdown files>`
  - PASS, all matched files use Prettier style.
- Preliminary `vitest` contract run for `environment`, `pino-redaction`,
  `cust-02-otp-lifecycle`, `http-surface`, and `exotel-otp.provider` - first
  sandbox attempt ran 66/70 passing and blocked only four existing loopback HTTP
  cases (`listen EPERM 127.0.0.1`); unchanged permitted retry PASS, 5/5 files
  and 70/70 tests.
- `corepack pnpm --filter @me-event/backend exec vitest run --config
test/vitest.unit.config.ts test/environment.spec.ts
test/exotel-otp.provider.spec.ts test/customer-auth-entry.spec.ts
test/cust-02-otp-lifecycle.spec.ts test/auth-service.spec.ts
test/local-otp.provider.spec.ts test/auth-ip-rate-limit.spec.ts
test/pino-redaction.spec.ts` - first sandbox attempt ran 88/89 passing and
  blocked only the existing loopback HTTP case (`listen EPERM 127.0.0.1`);
  unchanged permitted retry PASS, 8/8 files and 89/89 tests. This includes
  27/27 environment tests and 25/25 Exotel adapter/transport tests.
- `corepack pnpm --filter @me-event/backend test` - PASS, 43/43 files and
  291/291 tests.
- `corepack pnpm --filter @me-event/backend test:integration` - first sandbox
  attempt stopped before Vitest at `listen EPERM 127.0.0.1`; unchanged permitted
  retry PASS, 5/5 files and 42/42 isolated PostgreSQL tests. The guarded harness
  created, migrated, exercised, and removed its test-only Compose project.
- `corepack pnpm lint` - PASS across shared-types, api-contracts, backend, and
  ERP with zero warnings.
- `corepack pnpm typecheck` - PASS across shared-types, api-contracts, backend,
  and ERP with zero errors.
- `flutter analyze --fatal-infos` - first sandbox attempt could not write the
  installed Flutter SDK cache; unchanged permitted retry PASS, zero issues.
- `flutter test test/customer_auth_entry_test.dart test/customer_otp_test.dart`
  - PASS, 2/2 files and 33/33 tests (13 CUST-01 plus 20 CUST-02).
- `flutter test test/role_switcher_test.dart test/customer_shell_test.dart` -
  PASS, 2/2 files and 59/59 AppGateway/Customer-shell regression tests.
- `flutter test` - PASS, 31/31 files and 517/517 tests.
- `git diff --check` - PASS, no whitespace errors.

No test called the Exotel network. All Exotel request tests used an injected
fake transport, and the timeout test replaced built-in `fetch` with a local
stub. No real credentials or mobile numbers were used and no SMS was sent.

## Retained findings and external blockers

1. **Exotel sandbox/procurement/DLT pending - Business/Account/Integration
   owners.** The provider decision and offline adapter now exist, but formal
   closeout still requires Exotel trial credentials, written pilot pricing,
   legal entity/GST decisions, DLT Principal Entity, approved sender/header and
   exact template, a separately authorized company-owned-device sandbox run,
   and privacy-safe evidence. Production delivery remains INT-01.

2. **Exceptional cleanup-write failure - Backend/Security/Architecture owner.**
   Normal provider failure now permits immediate retry. If PostgreSQL accepts
   the challenge but is unavailable for the exact subsequent invalidation, the
   challenge fails closed and may retain cooldown until expiry. Eliminating
   that last failure window requires an approved durable delivery/outbox or
   equivalent architecture beyond the existing schema/provider contract.
3. **Shared edge/IP throttling - Production platform owner.** The per-mobile
   cooldown, hourly limit, and resend replacement are PostgreSQL-shared. The IP
   and in-flight guards remain process-local; Redis/edge limiting is explicitly
   outside CUST-02.
4. **Device/provider/staging evidence - Mobile QA/Integration owner.** No real
   Exotel sandbox call, SMS, physical-device delivery/autofill, staging,
   delivery callback, DLT, or production proof was performed.
5. **Consent wording - Product/Legal owner.** The existing CUST-01 consent copy
   remains technically accurate but is not represented as final legal approval.

## CUST-03 boundary and deferred-checkpoint readiness

CUST-03 refresh/session redesign, session-list/logout-all UI, CUST-04 bootstrap
or role-switching work, Customer Home, later Customer modules, Vendor, and Worker
work were not started. Existing session sign-in and gateway behavior were only
regression-tested.

CUST-02 and the Exotel adapter received the independent offline verdict
**APPROVE EXOTEL ADAPTER SLICE - SANDBOX EXECUTION PENDING**. They remain
intentionally incomplete in both live roadmaps. This deferred checkpoint does
not authorize a real sandbox run or production SMS. Only after this checkpoint
is independently reviewed and committed may CUST-03 proceed using the existing
development/test-only local OTP boundary; no CUST-03 source work is part of
this checkpoint.
