# ADR 0012: Exotel OTP delivery for the India pilot

- Status: accepted for adapter implementation and offline contract testing
- Date: 2026-08-30
- Business and Exotel account owner: Harinath
- Technical implementation owner: Vinay
- Related: ADR 0002 (identity/session security), ADR 0003 (environment
  separation)

## Context

CUST-02 implemented the provider-independent OTP lifecycle, but external SMS
delivery remained blocked. The founder approved Exotel Programmable SMS as the
primary provider and MSG91 as the runner-up for an India-only pilot of 1,000 to
10,000 OTP messages per month. No fallback provider is required for the first
launch.

The approval covers an Exotel adapter, fail-closed configuration, and offline
contract tests. It does not approve a plan purchase, account creation, real
credentials, an SMS send, DLT registration, staging/production activation, or
production readiness.

Official Exotel material was accessed on 30 August 2026:

- [Send SMS API](https://developer.exotel.com/docs/sms-api/api-reference/send-sms)
- [Authentication and regional endpoints](https://developer.exotel.com/docs/references/authentication)
- [SMS status codes](https://developer.exotel.com/docs/sms-api/api-reference/status-codes)
- [Webhooks and callbacks](https://developer.exotel.com/docs/references/webhooks)
- [Trial SMS behavior](https://support.exotel.com/support/solutions/articles/3000112470-how-to-create-and-send-sms-on-your-exotel-trial-account-)
- [DLT template scrubbing](https://support.exotel.com/support/solutions/articles/3000102659-how-to-send-sms-using-exotel-with-dlt-template-scrubbing-)

## Decision

- Use `OTP_PROVIDER=exotel` for the approved deployed adapter and retain
  `OTP_PROVIDER=local` only for development and tests. The ambiguous `external`
  selector and generic SMS variables are retired.
- Keep the Mee-managed model from ADR 0002. The backend generates a
  cryptographically random six-digit OTP, stores only a challenge-bound HMAC
  digest, passes plaintext to the provider port once, and verifies the submitted
  value itself. Exotel is a delivery processor, not an authentication authority.
- Use Exotel Programmable SMS, not ExoVerify. ExoVerify would move code/session
  state into a provider-managed verification workflow and require a material
  redesign of the approved lifecycle, persistence, errors, and tests.
- Do not add Twilio for the India pilot. The founder selected Exotel as primary
  and MSG91 as runner-up; introducing a third procurement and DLT onboarding path
  has no current approval or first-launch need. This is not a claim that Twilio
  is technically incapable.
- Allow only the official Mumbai origin `https://api.in.exotel.com`. The account
  owner must confirm that the trial/account belongs to that region before a real
  sandbox run. A different regional host requires a reviewed configuration
  change; it must never be accepted as an arbitrary runtime URL.
- Send one `application/x-www-form-urlencoded` POST to
  `/v1/Accounts/{accountSid}/Sms/send` using HTTP Basic authentication in the
  `Authorization` header. Credentials must not appear in the URL.
- Send `From`, canonical Indian E.164 `To`, rendered `Body`, `DltEntityId`,
  `DltTemplateId`, and `SmsType=transactional`. The configured approved body has
  exactly one `{{OTP}}` placeholder.
- Treat HTTP 200 plus a non-empty `SMSMessage.Sid` as accepted by Exotel, never as
  delivered. Return only that provider message identifier through `OtpDelivery`.
- Use a 5,000 ms initial sandbox timeout, configurable only within the validated
  1,000-10,000 ms range. Production tuning requires measured sandbox/staging
  latency.
- Make no automatic retry in the adapter. A timeout, connection failure, or 5xx
  can be ambiguous: Exotel may have accepted the message. `AuthService` retains
  its fail-closed exact-challenge invalidation and generic customer error.
- Do not implement delivery callbacks in this slice. They are non-authoritative
  telemetry: a callback cannot verify an OTP, create a session, or reopen a
  challenge. Public Exotel documentation recommends HTTPS, source-IP allowlisting,
  validation, and idempotency; a cryptographic Exotel callback signature is not
  publicly confirmed.

## Configuration contract

| Variable                    | Classification            | Rule                                                             |
| --------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `EXOTEL_API_BASE_URL`       | Non-secret                | Exact approved India origin only                                 |
| `EXOTEL_API_KEY`            | Secret                    | Server-only Basic-auth username                                  |
| `EXOTEL_API_TOKEN`          | Secret                    | Server-only Basic-auth password                                  |
| `EXOTEL_ACCOUNT_SID`        | Sensitive configuration   | Safe single path segment; do not expose to clients               |
| `EXOTEL_SMS_SENDER_ID`      | Operational configuration | Approved bounded sender/header                                   |
| `EXOTEL_DLT_ENTITY_ID`      | Operational configuration | Approved numeric Principal Entity identifier                     |
| `EXOTEL_DLT_TEMPLATE_ID`    | Operational configuration | Approved numeric content-template identifier                     |
| `EXOTEL_OTP_BODY_TEMPLATE`  | Approved business copy    | One line, no URL, exactly one `{{OTP}}`; never log rendered text |
| `EXOTEL_REQUEST_TIMEOUT_MS` | Non-secret                | Integer from 1,000 through 10,000; 5,000 initially               |

Every field is required for `OTP_PROVIDER=exotel`. Blank, unsafe, unapproved,
or deployed placeholder values fail application startup. Local mode does not
require Exotel settings. Staging and production reject local mode and cannot
fall back to it.

## Security consequences

- OTP plaintext exists briefly in backend memory and the one provider request;
  it is not persisted or returned. Existing HMAC storage and internal
  verification remain authoritative.
- Provider secrets stay server-side in ignored environment files or a secret
  manager. Request authorization, rendered bodies, complete mobile numbers,
  raw responses, and provider errors are not logged.
- The exact host allowlist and account-SID format prevent the configuration from
  becoming an arbitrary outbound-request/SSRF boundary.
- One logical `sendCode` invocation creates at most one provider request. There
  is no blind retry or fallback fan-out.
- Provider rejection, authentication failure, throttling, timeout, network
  error, server error, and malformed success all collapse to the existing
  privacy-safe customer failure after exact challenge cleanup.
- A valid `SMSMessage.Sid` proves only provider acceptance. Delivery monitoring,
  callback replay handling, and reconciliation remain future integration work.

## Pending before a real sandbox or production launch

- Written Exotel pilot quotation and budget approval.
- Registered legal entity and GST status.
- DLT Principal Entity registration.
- Approved sender/header, exact OTP template, and template ID.
- Private Exotel trial credentials for the Mumbai account region.
- Approved company-owned physical-device sandbox evidence.
- Production delivery, callbacks, monitoring, failover, alerting, operational
  runbooks, and hardening under INT-01.

Production SMS remains blocked. This ADR does not mark CUST-02 complete and does
not authorize CUST-03.
