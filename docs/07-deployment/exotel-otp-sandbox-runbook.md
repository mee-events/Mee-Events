# Exotel OTP sandbox runbook

This runbook prepares the approved Exotel Programmable SMS adapter for a later
company-owned-device sandbox test. It does **not** authorize account creation,
plan purchase, DLT submission, credential disclosure, a real SMS, staging or
production activation, or CUST-03.

Contract source: [ADR 0012](../adr/0012-exotel-otp-delivery.md). Official Exotel
documentation was accessed on 30 August 2026:

- [Send SMS API](https://developer.exotel.com/docs/sms-api/api-reference/send-sms)
- [Authentication and Mumbai endpoint](https://developer.exotel.com/docs/references/authentication)
- [Trial SMS behavior](https://support.exotel.com/support/solutions/articles/3000112470-how-to-create-and-send-sms-on-your-exotel-trial-account-)
- [DLT template scrubbing](https://support.exotel.com/support/solutions/articles/3000102659-how-to-send-sms-using-exotel-with-dlt-template-scrubbing-)

## Environment behavior

| Environment          | Provider rule                                                                       | Network rule                                                                     |
| -------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Local development    | `OTP_PROVIDER=local`; Exotel values absent                                          | No Exotel request; local debug code remains development-only                     |
| Automated tests      | Local provider or an `ExotelOtpProvider` with injected fake transport               | No real provider network call                                                    |
| Exotel trial/sandbox | `OTP_PROVIDER=exotel`; private trial values; company-owned verified test phone only | A real message may be sent only after a separate explicit authorization          |
| Staging              | `OTP_PROVIDER=exotel`; separate secret set and approved DLT values                  | Local provider and placeholders fail boot                                        |
| Production           | `OTP_PROVIDER=exotel`; separate production secret set and approved DLT values       | Still blocked until procurement, DLT, sandbox, security, and operations approval |

Exotel's trial documentation describes real SMS to verified numbers, not a
simulated transport. This repository therefore uses an injected fake transport
for offline contract tests. No test suite calls Exotel.

## Configuration

| Variable                    | Classification                | Expected handling                                                       |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `EXOTEL_API_BASE_URL`       | Non-secret                    | Must equal `https://api.in.exotel.com`                                  |
| `EXOTEL_API_KEY`            | **Secret**                    | Private server secret or secret manager only                            |
| `EXOTEL_API_TOKEN`          | **Secret**                    | Private server secret or secret manager only                            |
| `EXOTEL_ACCOUNT_SID`        | Sensitive configuration       | Private server configuration; safe path segment                         |
| `EXOTEL_SMS_SENDER_ID`      | Operational configuration     | Exact approved sender/header                                            |
| `EXOTEL_DLT_ENTITY_ID`      | Operational configuration     | Exact approved numeric Principal Entity ID                              |
| `EXOTEL_DLT_TEMPLATE_ID`    | Operational configuration     | Exact approved numeric template ID                                      |
| `EXOTEL_OTP_BODY_TEMPLATE`  | Approved public business copy | Exact DLT-approved text with one `{{OTP}}`; never log the rendered body |
| `EXOTEL_REQUEST_TIMEOUT_MS` | Non-secret                    | Use `5000` initially; allowed range is 1,000-10,000 ms                  |

The startup validator rejects missing/blank fields, unsafe account/Sender/DLT
formats, URL/newline/extra-placeholder template content, unsafe timeouts,
non-HTTPS or unapproved hosts, credential-bearing URLs, and deployed example
placeholders. The Mumbai origin is the only allowlisted endpoint. Harinath must
privately confirm that the Exotel account is assigned to the Mumbai region;
Exotel states that a wrong regional endpoint fails authentication.

## Private trial preparation (account owner)

Harinath should perform these steps only after procurement and sandbox execution
are separately authorized:

1. Obtain the written pilot quotation before purchasing any plan.
2. Create or configure the Exotel trial privately and enable MFA where
   available. Do not share credentials through chat, tickets, screenshots, or
   repository files.
3. Confirm the account region is Mumbai and the approved API origin is
   `https://api.in.exotel.com`.
4. Keep the API key/token in an ignored backend `.env` only for a controlled
   local sandbox or inject them through the approved secret manager. Never use
   `.env.example`; never put provider values in Flutter or `NEXT_PUBLIC_*`.
5. Provide developers access through the secret manager's access-control and
   audit mechanism. Do not reveal the values in review evidence.
6. Use only the approved company-owned test phone. Exotel trial SMS is real;
   never use production customer data.
7. Do not attempt branded India SMS until legal entity, DLT Principal Entity,
   sender/header, and exact content template are approved and mapped to Exotel.

## Credential rotation

1. Create/regenerate the replacement token in Exotel without recording it in
   chat, Git, logs, or documentation. If the API key/account is compromised,
   coordinate its replacement with the account administrator or Exotel support.
2. Put the replacement value into the environment-specific secret manager.
3. Restart one non-production instance and confirm boot validation plus an
   offline health check. Do not use a real send as a rotation smoke unless that
   test has separate approval.
4. Roll the remaining instances, then revoke the old token.
5. Review access logs and billing for unexpected sends. Record only redacted
   incident/evidence identifiers.

Distinct sandbox, staging, and production credentials are required. Never copy
a trial credential into production.

## Offline contract tests

From the repository root:

```sh
corepack pnpm --filter @me-event/backend exec vitest run --config test/vitest.unit.config.ts test/environment.spec.ts test/exotel-otp.provider.spec.ts
```

The tests use an injected fake transport and a stubbed built-in `fetch` for the
timeout assertion. They verify request construction, Basic-auth placement,
form/DLT fields, input validation, one-call behavior, error mapping, malformed
responses, timeout abort, logging privacy, explicit provider selection, and
configuration failure. They must never be changed to call the real endpoint.

## Later real sandbox evidence

A separately authorized sandbox execution must capture, without credentials,
OTP text, or a complete mobile number:

- approval reference, tester, UTC/IST time, commit/working-tree identity, and
  environment name;
- confirmation that only the company-owned phone was used;
- account region and API origin (no URL credentials);
- DLT/trial sender and template mode used, including whether the trial forced
  Exotel's default sender/template;
- HTTP status and a redacted/truncated provider message identifier;
- device receipt time, provider status progression, and measured latency;
- safe behavior for invalid number, authentication failure, DLT/template
  rejection, provider 429, timeout, 5xx, and malformed responses using provider-
  approved test methods where available;
- log review proving no OTP, rendered body, credential, Authorization header,
  complete number, or raw provider response was recorded;
- proof that a timeout or ambiguous failure produced no automatic retry and the
  Mee Events challenge was invalidated through the existing cleanup path.

Physical-device OTP autofill proof is separate Flutter QA evidence. Production
customer data is prohibited.

## DLT work still pending

Legal/professional review and provider guidance are required before submission:

1. legal entity and GST position;
2. DLT Principal Entity registration;
3. sender/header ownership and approval;
4. exact service/OTP template approval and variable placement;
5. Entity ID, header, and template mapping in Exotel;
6. controlled company-device test and evidence;
7. reviewed template-change procedure.

## Callback and delivery boundary

No callback route exists in this slice. Exotel's public guidance documents
HTTPS, source-IP allowlisting, payload validation, prompt acknowledgement, and
idempotency, but a cryptographic Exotel callback signature is not publicly
confirmed. INT-01 owns callback security, replay/duplicate handling, delivery
monitoring, reconciliation, failover, and alerting. A callback must never verify
an OTP, create a session, or reopen an invalidated challenge.

## Emergency disable and fail-closed behavior

- Do not switch staging/production to `local`; startup validation rejects it.
- At the edge, block the public OTP-request route, revoke/disable the Exotel API
  token, remove the deployed Exotel secret set, and restart/scale down affected
  instances according to the incident plan. Missing configuration prevents a
  replacement instance from starting.
- Existing running instances retain their in-memory configuration until they
  stop, so secret removal alone is not an immediate kill switch. Revoke the
  provider token and block the route/egress as the immediate controls.
- Return only the existing generic customer delivery failure. Never expose the
  incident, provider response, account, or credentials.
- There is no first-launch fallback. Do not route to MSG91, local delivery, or
  another provider without a new approved change.

Production SMS remains blocked. INT-01 must add the reviewed operational kill
switch, delivery telemetry, callbacks, monitoring, and provider hardening before
production readiness can be claimed.
