# Environment Configuration

Environments and secrets follow [ADR 0003](../adr/0003-environments-and-configuration.md):
development, staging, and production use **separate** databases, credentials,
domains, and signing identities. Configuration is validated at backend startup.
Employee web and Flutter release builds fail closed on localhost API fallbacks.

Ops secret handling: [docs/05-security/secrets.md](../05-security/secrets.md).
Auth TTLs and OTP rules: [docs/05-security/authentication.md](../05-security/authentication.md).

STAB-02 verified the platform matrix on 25 August 2026. The Exotel additions
were implemented and offline-tested on 30 August 2026 under
[ADR 0012](../adr/0012-exotel-otp-delivery.md). Secret **values were not
inspected**. Local ignored files may exist; only names and ignore status are
recorded.

Classification: **secret** means server-only credential material. **public**
means it may appear in a browser bundle, Flutter asset, or dart-define.

---

## Backend (NestJS)

Validated by `apps/backend/src/config/environment.ts` at process start.
Tests: `apps/backend/test/environment.spec.ts`.

| Variable                    | Purpose                       | Class                | Dev                                     | Test                  | Staging                           | Production                                | Default / notes                                                                         |
| --------------------------- | ----------------------------- | -------------------- | --------------------------------------- | --------------------- | --------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `APP_ENV`                   | Environment selector          | public-ish (server)  | required `development`                  | required `test`       | required `staging`                | required `production`                     | No default                                                                              |
| `PORT`                      | Listen port                   | public               | optional                                | optional              | optional                          | optional                                  | `3002`. Staging/production examples use `3000` as a host-specific placeholder           |
| `LOG_LEVEL`                 | Pino level                    | public               | optional                                | optional              | optional                          | optional                                  | `info`. LoggerModule also reads `process.env.LOG_LEVEL` at module load                  |
| `DATABASE_URL`              | PostgreSQL URL                | **secret**           | required                                | required              | required                          | required                                  | Must be a URL. Staging/production reject `USER:PASSWORD@HOST` and `example.com` hosts   |
| `OTP_PROVIDER`              | OTP adapter                   | public-ish           | `local` allowed                         | `local` allowed       | **must be `exotel`**              | **must be `exotel`**                      | Only `local` or `exotel`; local forbidden in staging/production                         |
| `OTP_HMAC_SECRET`           | OTP digest HMAC               | **secret**           | required, min 32                        | required, min 32      | required, min 32, no placeholders | required, min 32, no placeholders         | Example placeholder is allowed only in development/test                                 |
| `JWT_ACCESS_SECRET`         | Access JWT signing            | **secret**           | required, min 32                        | required, min 32      | required, min 32, no placeholders | required, min 32, no placeholders         | Never put in Flutter or `NEXT_PUBLIC_*`                                                 |
| `REFRESH_TOKEN_HMAC_SECRET` | Refresh-token digest          | **secret**           | required, min 32                        | required, min 32      | required, min 32, no placeholders | required, min 32, no placeholders         | Same                                                                                    |
| `ALLOWED_ORIGINS`           | Browser CORS allowlist        | public               | required, non-empty                     | required              | required; no `*`                  | required; no `*`; https only; no loopback | Development also allows any localhost origin in HTTP surface helper                     |
| `ENABLE_OPENAPI`            | Serve `/api/docs` UI + JSON   | public               | optional; docs always on in development | optional; default off | ignored; always off               | ignored; always off                       | `true` enables the rare test-only debug case                                            |
| `EXOTEL_API_BASE_URL`       | Exotel API origin             | public               | required only for `exotel`              | same                  | required                          | required                                  | Exact `https://api.in.exotel.com`; no path, credentials, or alternate host              |
| `EXOTEL_API_KEY`            | Exotel Basic-auth username    | **secret**           | required only for `exotel`              | same                  | required; no placeholders         | required; no placeholders                 | Server-side secret; never log or embed in a URL                                         |
| `EXOTEL_API_TOKEN`          | Exotel Basic-auth password    | **secret**           | required only for `exotel`              | same                  | required; no placeholders         | required; no placeholders                 | Server-side secret; rotate separately per environment                                   |
| `EXOTEL_ACCOUNT_SID`        | Exotel account path ID        | sensitive config     | required only for `exotel`              | same                  | required; no placeholders         | required; no placeholders                 | Safe single path segment; never expose to clients                                       |
| `EXOTEL_SMS_SENDER_ID`      | Approved SMS sender/header    | operational config   | required only for `exotel`              | same                  | required; no placeholders         | required; no placeholders                 | 1-11 letters/digits; exact approved value required                                      |
| `EXOTEL_DLT_ENTITY_ID`      | DLT Principal Entity ID       | operational config   | required only for `exotel`              | same                  | required; no placeholders         | required; no placeholders                 | 1-32 digits; DLT approval still pending                                                 |
| `EXOTEL_DLT_TEMPLATE_ID`    | DLT content template ID       | operational config   | required only for `exotel`              | same                  | required; no placeholders         | required; no placeholders                 | 1-32 digits; DLT approval still pending                                                 |
| `EXOTEL_OTP_BODY_TEMPLATE`  | Approved OTP message copy     | approved public copy | required only for `exotel`              | same                  | required; no placeholders         | required; no placeholders                 | One line, no URL, exactly one `{{OTP}}`; rendered body is sensitive and never logged    |
| `EXOTEL_REQUEST_TIMEOUT_MS` | Exotel request timeout        | public               | required only for `exotel`              | same                  | required                          | required                                  | Integer 1,000-10,000; initial sandbox value 5,000, production value needs latency proof |
| `SUPABASE_URL`              | Offline catalog-media scripts | public URL           | optional, scripts only                  | unused                | unused by Nest                    | unused by Nest                            | **Not** Zod-validated. Do not treat as runtime API config                               |
| `SUPABASE_SERVICE_KEY`      | Offline catalog-media scripts | **secret**           | optional, scripts only                  | unused                | unused by Nest                    | unused by Nest                            | Read only by `apps/backend/scripts/*`. Must never go to clients                         |

**Fail closed (tested with synthetic values):** missing/invalid database URL;
short or missing JWT/HMAC/refresh secrets; local OTP in staging/production;
missing/blank Exotel settings when `OTP_PROVIDER=exotel`; unsafe or arbitrary
Exotel origins; path-injecting account IDs; unsafe sender/DLT/template/timeout
values; deployed example placeholders; wildcard or loopback production CORS;
invalid PORT. Local mode does not require Exotel settings.

The Exotel adapter uses one form-encoded request with Basic authentication only
in the `Authorization` header. It does not retry ambiguous failures and treats
HTTP 200 plus `SMSMessage.Sid` as accepted, not delivered. See the
[sandbox runbook](./exotel-otp-sandbox-runbook.md). Offline tests inject a fake
transport and never relax the production host allowlist.

**Direct-access exception:** `apps/backend/src/app.module.ts` LoggerModule reads
`process.env.LOG_LEVEL` before ConfigService. Invalid levels still fail Zod
boot. Token/cookie/OTP redaction is expanded in SEC-05
(`docs/05-security/sec-05-web-api-hardening-inventory.md`).

**TLS:** Zod does not require `sslmode` on `DATABASE_URL`. Production TLS remains
a provider/policy control (PROD-03).

Templates: `apps/backend/.env.example`, `.env.staging.example`,
`.env.production.example`. Staging/production example strings are
non-bootable placeholders.

---

## ERP web (Next.js)

Canonical reader: `apps/erp-web/src/lib/environment.ts`.
Call sites: `employee-api.ts`, `platform-bootstrap.ts`, `catalog/page.tsx`,
`page.tsx`.
Tests: `apps/erp-web/src/lib/environment.spec.ts`.

| Variable                   | Purpose                     | Class      | Dev                                              | Test/build                                        | Staging                            | Production                         |
| -------------------------- | --------------------------- | ---------- | ------------------------------------------------ | ------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_APP_ENV`      | Displayed/build environment | **public** | optional, default `development`                  | optional                                          | required for fail-closed API rules | required for fail-closed API rules |
| `NEXT_PUBLIC_API_BASE_URL` | Nest API base               | **public** | optional, default `http://localhost:3002/api/v1` | CI uses synthetic production `.invalid` HTTPS URL | required, https, non-loopback      | required, https, non-loopback      |

There are no server-only ERP secrets today. `NODE_ENV` is set to `production`
by `next build` even for local compile, so fail-closed rules key off
`NEXT_PUBLIC_APP_ENV`, not `NODE_ENV`.

Templates: `apps/erp-web/.env.example`, `.env.staging.example`,
`.env.production.example`.

---

## Flutter mobile

Canonical reader: `apps/mobile/lib/config/environment.dart`.
Session/API: `apps/mobile/lib/features/auth/session_provider.dart`.
`apps/mobile/lib/main.dart` loads the public `.env` asset; it no longer
initializes a direct database client.
Tests: `apps/mobile/test/environment_test.dart`.

| Variable              | Purpose             | Class      | Dev                                        | Test                       | Staging/release                 | Production/release |
| --------------------- | ------------------- | ---------- | ------------------------------------------ | -------------------------- | ------------------------------- | ------------------ |
| `API_BASE_URL`        | Nest API base       | **public** | dart-define or `.env` or localhost default | localhost fallback allowed | required non-loopback HTTPS URL | same               |
| `BRANCH_CODE`         | Default branch code | **public** | default `HYD`                              | default `HYD`              | dart-define or `.env` or `HYD`  | same               |
| `APP_ENV` dart-define | Unused by the app   | n/a        | not supplied by current CI                 | unused                     | unused                          | unused             |

Release builds reject loopback and Android emulator hosts (`localhost`,
`127.0.0.1`, `10.0.2.2`, `10.0.3.2`). Debug/profile keep the local fallback.

`.env` is a Flutter asset (`pubspec.yaml`). Treat every mobile env value as
**public and possibly bundled**. There is no mobile staging/production env
file; ADR 0003 supplies API URLs with `--dart-define` per flavour.

Template: `apps/mobile/.env.example` only. It contains only the public Nest API
base and branch code; SEC-06 removed the mobile Supabase variables.

STAB-13 verified the packaging boundary with a trap-isolated synthetic `.env`.
The exact synthetic public asset is present in the Android production APK/AAB;
the ignored local file was restored unchanged and did not enter either
artifact. The production dart-define wins over the bundled asset, while the
localhost/emulator fallback strings remain compiled but are rejected when
selected in release. At the STAB-13 snapshot the resolver still accepted
non-loopback HTTP and Supabase initialized unconditionally. SEC-06 now rejects
plain HTTP, loopback/emulator, malformed, credential-bearing, fragment-bearing,
and query-bearing API URLs in release; debug/profile still allow documented
loopback HTTP. It also removed direct Supabase initialization. `APP_ENV`
remains unused. See
[flutter-build-baseline.md](./flutter-build-baseline.md) and the
[SEC-06 inventory](../05-security/sec-06-mobile-boundary-inventory.md). These
are public configuration and local build/unit findings, not secret values or
device-runtime proof.
No iOS artifact was produced, so the Android asset inspection is not iOS
environment-packaging proof. The iOS probes stopped after Flutter's
`xcodebuild -version` invocation found no usable full Xcode, before project
enumeration, compilation, signing, or asset inspection; `.metadata` migration
state was not the cause, and the missing `prod` scheme remains a later blocker.

---

## CI

Workflows: `.github/workflows/ci.yml`, `security.yml`, and `codeql.yml`. CI does
**not** inject backend, ERP, mobile, or provider secrets. Flutter copies the
public `.env.example` to ignored `.env` then builds a **dev debug** APK with:

- `--dart-define=API_BASE_URL=http://10.0.2.2:3002/api/v1`
- `--dart-define=BRANCH_CODE=HYD`

TypeScript `pnpm build` compiles ERP with public synthetic
`NEXT_PUBLIC_APP_ENV=production` and
`NEXT_PUBLIC_API_BASE_URL=https://api.ci.mee-events.invalid/api/v1`. The
reserved hostname verifies fail-closed production parsing without a real
endpoint. That remains compile evidence, not a production deploy.

Root `.node-version` pins the verified Node `20.20.2`; CI consumes it while the
engine requirement remains `>=20.11.0`. STAB-16 is **DONE WITH FINDINGS**:
canonical `master` at `999443d` ran the pinned workflows green.

---

## Local Compose (not application boot config)

`infrastructure/docker-compose.yml` uses `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_PORT`, and `REDIS_PORT`. These are local
development service settings, not Nest/ERP/Flutter Zod keys. Redis is unused
by application code. Compose is not a production stack.

Migration runner talks to the Compose Postgres service directly and does not
read `DATABASE_URL`.

---

## Ignore protection

`.gitignore` ignores `.env` and `.env.*`, with exceptions for `*.example`.
STAB-02 confirmed local files `apps/backend/.env`, `apps/erp-web/.env.local`,
and `apps/mobile/.env` are present, ignored, and untracked. Values were not
read.

---

## Provider decisions (not STAB-02 blockers)

| Decision                                                   | Why required                                                                                                                                               | Recommended option                                  | Alternative                                       | Impact                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Exotel production activation                               | Adapter and offline contract tests exist; account/trial, quote, legal/GST, DLT, sender/header, approved template, and real sandbox evidence remain pending | Complete approved Exotel sandbox and DLT onboarding | MSG91 remains runner-up; no first-launch fallback | Blocks production SMS and remains INT-01 work      |
| Payment, storage, push, email, maps, analytics, monitoring | No application env keys exist yet                                                                                                                          | Defer until INT-\*                                  | Do not invent unused keys                         | Honest absence; do not add fake provider variables |

---

## Practices

1. Commit only `.env.example` placeholders.
2. Keep real values in ignored `.env` (local) or a secret manager (CI/staging/prod).
3. Distinct keys per environment.
4. Redact authorization headers, OTP codes, and tokens from logs.
5. Backend validation errors report issue paths and messages only; they must not echo secret values.
6. Follow [exotel-otp-sandbox-runbook.md](./exotel-otp-sandbox-runbook.md) for
   private trial setup, rotation, offline tests, evidence, and emergency disable.

---

## Related

- [local-development.md](./local-development.md)
- [production.md](./production.md)
- [ci-cd.md](./ci-cd.md)
