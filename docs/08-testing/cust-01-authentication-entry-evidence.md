# CUST-01 Authentication Entry - Review Evidence

- Date: 30 August 2026
- Review state: Ready for independent review; not accepted or roadmap-complete
- Scope: Customer mobile-number entry and the existing OTP-request boundary only

## Starting behaviour

`LoginScreen` already showed a Mee Events welcome, called `MobileApi.requestOtp`,
opened the existing OTP-entry state after success, verified through the existing
flow, stored the resulting session through secure storage, and returned control
to `AppGateway`. The backend already normalized with `libphonenumber-js`, exposed
the OTP request endpoint with `@Public`, enforced per-mobile cooldown/hourly
limits plus a process-local IP cap, stored only OTP digests, and failed closed
when a deployed external provider was not wired.

## Confirmed problem

- Flutter stripped arbitrary non-digits, accepted malformed input, and did not
  prove a canonical E.164 request value.
- The entry screen could display raw backend or runtime errors and did not
  distinguish offline, rate-limit, and generic delivery failures.
- There was no method-level duplicate guard, focused CUST-01 widget coverage,
  explicit country-code treatment, consent explanation, live error semantics,
  or large-text proof.
- Backend India validation could accept a fixed-line-shaped number when the
  phone library classified it as `FIXED_LINE_OR_MOBILE`.
- Concurrent same-process OTP requests were not explicitly rejected, provider
  failures retained provider-specific `DomainError` text, and request-body
  `mobileNumber` was not in the Pino redaction catalogue.

## Files changed

- `apps/mobile/lib/features/auth/indian_mobile_number.dart` - strict India input
  normalization to E.164 while leaving NestJS authoritative.
- `apps/mobile/lib/features/auth/screens/login_screen.dart` - accessible entry,
  canonical request, safe failure mapping, duplicate guard, pending state,
  country treatment, consent copy, input clearing, and large-text scrolling.
- `apps/mobile/lib/design_system/components/inputs/me_inputs.dart` - existing
  phone field gains the enabled, submit-action, hint, and label options needed
  by the auth entry.
- `apps/mobile/lib/design_system/components/buttons/me_button.dart` - button
  labels flex/wrap under system font scaling instead of clipping.
- `apps/mobile/test/customer_auth_entry_test.dart` - focused validation,
  contract, interaction, failure, semantics, target-size, and large-text tests.
- `apps/backend/src/modules/identity/domain/phone-number.ts` - rejects Indian
  values outside the accepted mobile range after canonical parsing.
- `apps/backend/src/modules/identity/application/auth.service.ts` - transient
  per-mobile in-flight guard and generic provider-failure mapping.
- `apps/backend/src/common/http/http-surface.ts` - redacts `mobileNumber` in
  structured logs.
- `apps/backend/test/customer-auth-entry.spec.ts` - CUST-01 normalization,
  invalid input, enumeration, duplicate, provider-failure, response-privacy,
  logging, and public-route policy coverage.
- `apps/backend/test/phone-number.spec.ts` - accepted and rejected India formats.
- `apps/backend/test/http-surface.spec.ts` - redaction-catalogue assertion.
- `apps/backend/test/pino-redaction.spec.ts` - real Pino mobile redaction proof.
- This file - review evidence only; no roadmap checkbox or acceptance state.

## Security decisions

- Flutter accepts only supported India formats and sends E.164; NestJS parses
  and validates again before any challenge is created.
- The client maps stable code/status classes to controlled copy and never
  renders provider text, raw exceptions, URLs, identifiers, or stack details.
- A request is guarded in Flutter and within one `AuthService` process. Existing
  PostgreSQL per-mobile cooldown/hourly controls and the process-local IP cap
  remain unchanged.
- OTP request responses do not query user existence. Test/deployed responses
  contain challenge timing metadata only; the pre-existing local-development
  `debugCode` contract remains restricted to local development and is not a
  production SMS claim.
- The entered number is cleared after challenge creation. No new persistence,
  cache, analytics, or logging of the entry value was introduced.
- Provider exceptions are replaced with `OTP_DELIVERY_UNAVAILABLE`; request
  mobile values, OTP codes, tokens, cookies, and secret fields are redacted.
- OTP request/verify remain public as required. Logout and role-switch remain
  controlled; no authorization or role assignment policy changed.

## Verification

Final commands and results:

- `dart format --output=none --set-exit-if-changed <5 changed Dart files>` -
  PASS, 5 files checked, 0 changed.
- `corepack pnpm exec prettier --check <7 changed TypeScript files>` - PASS,
  all matched files use Prettier style.
- `flutter analyze --fatal-infos` - PASS, zero issues.
- `flutter test test/customer_auth_entry_test.dart` - PASS, 13/13.
- `flutter test test/role_switcher_test.dart test/customer_shell_test.dart` -
  PASS, 59/59; covers AppGateway role routing and Customer shell regression.
- `flutter test` - PASS, 497/497.
- `corepack pnpm --filter @me-event/backend test -- customer-auth-entry.spec.ts
phone-number.spec.ts auth-service.spec.ts auth-ip-rate-limit.spec.ts
http-surface.spec.ts pino-redaction.spec.ts local-otp.provider.spec.ts` - PASS,
  7/7 files and 42/42 tests.
- `corepack pnpm --filter @me-event/backend test` - PASS, 41/41 files and
  249/249 tests.
- `corepack pnpm --filter @me-event/backend test:integration` - PASS, 5/5
  files and 39/39 isolated PostgreSQL tests after starting the installed Docker
  Desktop daemon. The first attempt failed closed before setup because the
  daemon socket was absent; the successful rerun created and cleaned the
  harness-owned Compose project.
- `corepack pnpm lint` - PASS across shared-types, api-contracts, backend, and
  ERP; zero warnings.
- `corepack pnpm typecheck` - PASS across shared-types, api-contracts, backend,
  and ERP; zero errors.

No migration, database adapter, repository contract, query, or transaction was
changed.

## Retained findings and CUST-02 boundary

- The production SMS provider, delivery callbacks, DLT path, and shared edge/IP
  throttling remain unimplemented provider/production work. No live SMS claim is
  made.
- The in-process duplicate guard complements existing PostgreSQL limits but is
  not a distributed lock across backend replicas.
- If provider delivery fails after challenge persistence, the existing server
  cooldown still applies. Delivery recovery, resend timing, OTP entry/expiry,
  attempts, and full provider lifecycle belong to CUST-02 and were not changed.
- Existing local-development `debugCode` behaviour remains explicit development
  tooling; staging/production configuration rejects the local provider.
- The retained CUST-02 OTP verification branch still maps verification failures
  with its existing raw-message behavior. CUST-01 request-entry failures are
  fully controlled; OTP verification error redesign was not started.
- No real-device/provider/staging proof was performed. The maintained repository
  has no mobile emulator/device E2E layer.

## Review readiness

CUST-01 is ready for independent source, UX/accessibility, security, and QA
review. It is intentionally not marked complete in either live roadmap, and
CUST-02 is not authorized by this evidence.

## Independent review closeout

- Review date: 30 August 2026
- Verdict: **APPROVE WITH FINDINGS**
- Blocking findings: none
- Reviewer source changes: none

The independent reviewer confirmed the implementation claims, security
controls, UX/accessibility behavior, test evidence, and CUST-01 scope. No P0,
P1, blocking P2, or other blocking finding was reported.

Verified review results:

- Flutter focused tests: **13/13 passed**.
- AppGateway/Customer-shell regression: **59/59 passed**.
- Full Flutter suite: **497/497 passed**.
- Focused backend suite: **42/42 passed**.
- Full backend suite: **249/249 passed**.
- PostgreSQL integration suite: **39/39 passed**.
- Flutter analysis: **zero issues**.
- Lint: **zero errors and zero warnings**.
- Typecheck: **zero errors**.

Retained non-blocking findings:

1. Provider-delivery failure leaves the challenge and cooldown active. The
   recovery/resend policy belongs to CUST-02 and production SMS integration.
2. Backend in-flight duplicate protection is process-local rather than
   cross-replica. Shared locking belongs to future multi-replica production
   hardening.
3. Existing OTP verification errors can still expose raw messages. Correction
   belongs to CUST-02.
4. Production SMS provider and DLT integration remain unavailable. No live SMS
   delivery claim is made.
5. Consent wording is not final legally approved privacy wording. Final policy
   approval remains a legal/product dependency.
6. No physical-device, provider-sandbox, staging, or production proof was
   performed.

**CUST-01 is DONE WITH FINDINGS.**

**CUST-02 was not started during this closeout.**
