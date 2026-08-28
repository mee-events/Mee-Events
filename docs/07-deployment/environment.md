# Environment Configuration

Environments and secrets follow [ADR 0003](../adr/0003-environments-and-configuration.md):
development, staging, and production use **separate** databases, credentials,
domains, and signing identities. Configuration is validated at backend startup.
Employee web and Flutter release builds fail closed on localhost API fallbacks.

Ops secret handling: [docs/05-security/secrets.md](../05-security/secrets.md).
Auth TTLs and OTP rules: [docs/05-security/authentication.md](../05-security/authentication.md).

STAB-02 verified this matrix on 25 August 2026. Secret **values were not
inspected**. Local ignored files may exist; only names and ignore status are
recorded.

Classification: **secret** means server-only credential material. **public**
means it may appear in a browser bundle, Flutter asset, or dart-define.

---

## Backend (NestJS)

Validated by `apps/backend/src/config/environment.ts` at process start.
Tests: `apps/backend/test/environment.spec.ts`.

| Variable                    | Purpose                       | Class               | Dev                                     | Test                  | Staging                           | Production                                | Default / notes                                                                       |
| --------------------------- | ----------------------------- | ------------------- | --------------------------------------- | --------------------- | --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `APP_ENV`                   | Environment selector          | public-ish (server) | required `development`                  | required `test`       | required `staging`                | required `production`                     | No default                                                                            |
| `PORT`                      | Listen port                   | public              | optional                                | optional              | optional                          | optional                                  | `3002`. Staging/production examples use `3000` as a host-specific placeholder         |
| `LOG_LEVEL`                 | Pino level                    | public              | optional                                | optional              | optional                          | optional                                  | `info`. LoggerModule also reads `process.env.LOG_LEVEL` at module load                |
| `DATABASE_URL`              | PostgreSQL URL                | **secret**          | required                                | required              | required                          | required                                  | Must be a URL. Staging/production reject `USER:PASSWORD@HOST` and `example.com` hosts |
| `OTP_PROVIDER`              | OTP adapter                   | public-ish          | `local` allowed                         | `local` allowed       | **must be `external`**            | **must be `external`**                    | Local provider forbidden in staging and production                                    |
| `OTP_HMAC_SECRET`           | OTP digest HMAC               | **secret**          | required, min 32                        | required, min 32      | required, min 32, no placeholders | required, min 32, no placeholders         | Example placeholder is allowed only in development/test                               |
| `JWT_ACCESS_SECRET`         | Access JWT signing            | **secret**          | required, min 32                        | required, min 32      | required, min 32, no placeholders | required, min 32, no placeholders         | Never put in Flutter or `NEXT_PUBLIC_*`                                               |
| `REFRESH_TOKEN_HMAC_SECRET` | Refresh-token digest          | **secret**          | required, min 32                        | required, min 32      | required, min 32, no placeholders | required, min 32, no placeholders         | Same                                                                                  |
| `ALLOWED_ORIGINS`           | Browser CORS allowlist        | public              | required, non-empty                     | required              | required; no `*`                  | required; no `*`; https only; no loopback | Development also allows any localhost origin in HTTP surface helper                   |
| `ENABLE_OPENAPI`            | Serve `/api/docs` UI + JSON   | public              | optional; docs always on in development | optional; default off | ignored; always off               | ignored; always off                       | `true` enables the rare test-only debug case                                          |
| `SMS_OTP_ENDPOINT`          | External SMS HTTP endpoint    | public-ish URL      | required **if** `OTP_PROVIDER=external` | same                  | required; https                   | required; https                           | Conditional. Founder must still select a vendor (INT-01)                              |
| `SMS_OTP_API_KEY`           | External SMS credential       | **secret**          | required **if** external                | same                  | required; no placeholders         | required; no placeholders                 | Boot validation added in STAB-02. Adapter still fail-closed until wired               |
| `SUPABASE_URL`              | Offline catalog-media scripts | public URL          | optional, scripts only                  | unused                | unused by Nest                    | unused by Nest                            | **Not** Zod-validated. Do not treat as runtime API config                             |
| `SUPABASE_SERVICE_KEY`      | Offline catalog-media scripts | **secret**          | optional, scripts only                  | unused                | unused by Nest                    | unused by Nest                            | Read only by `apps/backend/scripts/*`. Must never go to clients                       |

**Fail closed (tested with synthetic values):** missing/invalid database URL;
short or missing JWT/HMAC/refresh secrets; local OTP in staging/production;
missing SMS keys when `OTP_PROVIDER=external`; placeholder secrets in
staging/production; wildcard or loopback production CORS; invalid PORT.

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
Direct dotenv (legacy): `apps/mobile/lib/main.dart` initializes Supabase.
Tests: `apps/mobile/test/environment_test.dart`.

| Variable              | Purpose             | Class             | Dev                                        | Test                       | Staging/release                                 | Production/release    |
| --------------------- | ------------------- | ----------------- | ------------------------------------------ | -------------------------- | ----------------------------------------------- | --------------------- |
| `API_BASE_URL`        | Nest API base       | **public**        | dart-define or `.env` or localhost default | localhost default allowed  | required non-loopback via dart-define or `.env` | required non-loopback |
| `BRANCH_CODE`         | Default branch code | **public**        | default `HYD`                              | default `HYD`              | dart-define or `.env` or `HYD`                  | same                  |
| `APP_ENV` dart-define | Unused by the app   | n/a               | not supplied by current CI                 | unused                     | unused                                          | unused                |
| `SUPABASE_URL`        | Dormant client init | **public**        | `.env` asset, empty-string allowed         | not required by unit tests | still initialized                               | still initialized     |
| `SUPABASE_ANON_KEY`   | Dormant client init | **public** (anon) | `.env` asset                               | same                       | same                                            | same                  |

Release builds reject loopback and Android emulator hosts (`localhost`,
`127.0.0.1`, `10.0.2.2`, `10.0.3.2`). Debug/profile keep the local fallback.

`.env` is a Flutter asset (`pubspec.yaml`). Treat every mobile env value as
**public and possibly bundled**. There is no mobile staging/production env
file; ADR 0003 supplies API URLs with `--dart-define` per flavour.

Template: `apps/mobile/.env.example` only. Follow-up for dormant Supabase:
SEC-06.

STAB-13 verified the packaging boundary with a trap-isolated synthetic `.env`.
The exact synthetic public asset is present in the Android production APK/AAB;
the ignored local file was restored unchanged and did not enter either
artifact. The production dart-define wins over the bundled asset, while the
localhost/emulator fallback strings remain compiled but are rejected when
selected in release. The resolver still accepts a non-loopback `http://` URL,
`APP_ENV` remains unused, and Supabase is still initialized unconditionally.
See [flutter-build-baseline.md](./flutter-build-baseline.md). These are public
configuration and boundary findings, not secret values or device-runtime proof.
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

| Decision                                                   | Why required                                                                             | Recommended option                                 | Alternative                                 | Impact                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| India-compliant SMS/OTP vendor                             | `OTP_PROVIDER=external` can boot only after keys exist; adapter still throws until wired | Provider with DLT/TRAI, sandbox, delivery webhooks | Managed identity provider only after an ADR | Blocks production login (INT-01)                   |
| Payment, storage, push, email, maps, analytics, monitoring | No application env keys exist yet                                                        | Defer until INT-\*                                 | Do not invent unused keys                   | Honest absence; do not add fake provider variables |

---

## Practices

1. Commit only `.env.example` placeholders.
2. Keep real values in ignored `.env` (local) or a secret manager (CI/staging/prod).
3. Distinct keys per environment.
4. Redact authorization headers, OTP codes, and tokens from logs.
5. Backend validation errors report issue paths and messages only; they must not echo secret values.

---

## Related

- [local-development.md](./local-development.md)
- [production.md](./production.md)
- [ci-cd.md](./ci-cd.md)
