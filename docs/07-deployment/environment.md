# Environment Configuration

Environments and secrets follow [ADR 0003](../adr/0003-environments-and-configuration.md):
development, staging, and production use **separate** databases, credentials,
domains, and signing identities. Configuration is validated at backend startup.

Ops secret handling: [docs/05-security/secrets.md](../05-security/secrets.md).  
Auth TTLs and OTP rules: [docs/05-security/authentication.md](../05-security/authentication.md).

---

## Backend (required at boot)

Validated in `apps/backend/src/config/environment.ts`:

| Variable                    | Rules                                                |
| --------------------------- | ---------------------------------------------------- |
| `APP_ENV`                   | `development` \| `test` \| `staging` \| `production` |
| `PORT`                      | Positive int; default `3002`                         |
| `LOG_LEVEL`                 | `fatal`…`trace`; default `info`                      |
| `DATABASE_URL`              | PostgreSQL URL (required)                            |
| `OTP_PROVIDER`              | `local` \| `external`                                |
| `OTP_HMAC_SECRET`           | Min length 32                                        |
| `JWT_ACCESS_SECRET`         | Min length 32                                        |
| `REFRESH_TOKEN_HMAC_SECRET` | Min length 32                                        |
| `ALLOWED_ORIGINS`           | Non-empty comma-separated origins                    |

**Fail closed:** `APP_ENV=production` with `OTP_PROVIDER=local` is rejected.

Example files may also list `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`. Those are
**not** part of Zod boot validation. PostgreSQL may be hosted on a managed
provider (including Supabase as a **host**); Auth/RLS are not the platform
authorization layer ([ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md)).

---

## Clients (public config only)

| Surface                | Typical vars                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- |
| ERP (`apps/erp-web`)   | `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_API_BASE_URL`                                   |
| Mobile (`apps/mobile`) | `API_BASE_URL`, `BRANCH_CODE`; compile-time `--dart-define` for `APP_ENV` / API URL |

Never put backend HMAC/JWT secrets, refresh digests, or service keys into Flutter
or `NEXT_PUBLIC_*` builds.

ADR 0003 documents Flutter flavours `dev` / `staging` / `prod`. CI builds with
`--flavor dev` and dart-defines; keep flavour wiring aligned with Android/iOS
project config as it lands.

---

## Practices

1. Commit only `.env.example` placeholders.
2. Keep real values in ignored `.env` (local) or a secret manager (CI/staging/prod).
3. Distinct keys per environment.
4. Redact authorization headers, OTP codes, and tokens from logs.

---

## Related

- [local-development.md](./local-development.md)
- [production.md](./production.md)
- [ci-cd.md](./ci-cd.md)
