# SEC-05 — Web/API hardening

- **Task:** STAB-20 / SEC-05 only (headers, Swagger exposure, Pino redaction, public-auth IP limit)
- **Date:** 28 August 2026
- **Phase 0:** still **NOT PASSED**. STAB-20 remains **open**. SEC-06 is **not started**.
- **Result:** **DONE WITH FINDINGS**
- **This slice does not claim production or staging is live or secure.**
- **No live staging host exists.** Proof is tests using `APP_ENV=staging` /
  `production` config on loopback, not a deployed URL.

## Status key

| Status       | Meaning                                                |
| ------------ | ------------------------------------------------------ |
| Already good | True before this commit; left in place                 |
| Fixed        | Changed in this commit                                 |
| Finding      | Inspected; left open with file + reason; do not invent |

## Inventory outcome

- **Already good:** ERP nosniff/referrer/frame-deny headers; API
  `ALLOWED_ORIGINS` CORS allow-list; generic client-facing 500s; PostgreSQL
  per-mobile OTP cooldown and five-per-hour limit; Pino Authorization/OTP-body/
  Set-Cookie redaction.
- **Fixed:** API Helmet/Permissions-Policy/env-gated HSTS; OpenAPI exposure;
  request Cookie and broader token/secret redaction; cleartext local OTP log;
  public OTP IP cap; ERP CSP/Permissions-Policy/env-gated HSTS.
- **Still open findings:** no live staging host; IP cap is process-local; CSP
  retains the documented Next exceptions; no shared edge limiter or nonce
  system.

## Headers before / after

### Nest API (`configureHttpSurface` in `apps/backend/src/common/http/http-surface.ts`)

| Header                      | Before                                                                    | After                                                                                  |
| --------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `X-Content-Type-Options`    | absent                                                                    | `nosniff` (Helmet)                                                                     |
| `X-Frame-Options`           | absent                                                                    | `DENY`                                                                                 |
| `Referrer-Policy`           | absent                                                                    | `strict-origin-when-cross-origin`                                                      |
| `Permissions-Policy`        | absent                                                                    | `camera=(), microphone=(), geolocation=()`                                             |
| `Strict-Transport-Security` | absent                                                                    | `max-age=31536000; includeSubDomains` only when `APP_ENV` is `staging` or `production` |
| CORS                        | `ALLOWED_ORIGINS` allow-list; development also allows localhost/127.0.0.1 | Unchanged. Env schema still forbids `*` in staging/production.                         |
| CSP                         | absent                                                                    | Still absent on the JSON API (Helmet CSP off so Swagger UI can load in development)    |

CORS still allows missing `Origin` (mobile/native). Unknown browser origins are
denied. `Cross-Origin-Resource-Policy` is `cross-origin` so the ERP origin can
read responses. `trust proxy` is **not** set.

### ERP (`apps/erp-web/next.config.ts` + `src/lib/security-headers.ts`)

| Header                      | Before                            | After                                                                                                  |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `X-Content-Type-Options`    | `nosniff`                         | unchanged                                                                                              |
| `Referrer-Policy`           | `strict-origin-when-cross-origin` | unchanged                                                                                              |
| `X-Frame-Options`           | `DENY`                            | unchanged                                                                                              |
| `X-Powered-By`              | omitted                           | unchanged                                                                                              |
| `Content-Security-Policy`   | absent                            | `default-src 'self'` plus Next-required script/style exceptions; `connect-src` includes the API origin |
| `Permissions-Policy`        | absent                            | `camera=(), microphone=(), geolocation=()`                                                             |
| `Strict-Transport-Security` | absent                            | same HSTS string, only when `NEXT_PUBLIC_APP_ENV` is `staging` or `production`                         |

## Swagger / OpenAPI

| `APP_ENV`     | `/api/docs` UI and JSON               |
| ------------- | ------------------------------------- |
| `development` | **On** (local default)                |
| `test`        | **Off** unless `ENABLE_OPENAPI=true`  |
| `staging`     | **Off** (`ENABLE_OPENAPI` is ignored) |
| `production`  | **Off** (`ENABLE_OPENAPI` is ignored) |

Off means the UI **and** the JSON spec are not registered.

## Pino redaction

Shared list: `PINO_REDACT_PATHS` in `http-surface.ts`, used by `LoggerModule`.

Censored: `Authorization`, request `Cookie`, `Proxy-Authorization`, response
`Set-Cookie`, OTP `code` / `debugCode`, `refreshToken`, `accessToken`,
`password`, API keys/secrets, HMAC/client secrets, secret-bearing environment
fields, and database URLs. The local development OTP provider no longer writes
the OTP code or mobile number to the Nest log; local callers still receive the
development-only `debugCode` response.

`GlobalExceptionFilter` still returns generic 500 bodies (`INTERNAL_ERROR` /
`An unexpected error occurred`) with no stack.

## IP limit vs per-mobile OTP limit

| Control                      | Scope                                                     | Shared across API processes? | HTTP                      |
| ---------------------------- | --------------------------------------------------------- | ---------------------------- | ------------------------- |
| OTP resend cooldown          | per mobile                                                | Yes (PostgreSQL)             | `OTP_RESEND_COOLDOWN` 429 |
| OTP 5 requests / hour        | per mobile                                                | Yes (PostgreSQL)             | `OTP_REQUEST_LIMIT` 429   |
| **New** process-local IP cap | `POST /auth/otp/request` and `POST /auth/otp/verify` only | **No**                       | `AUTH_IP_RATE_LIMIT` 429  |

Default IP cap: **30 hits / 10 minutes / process** using
`socket.remoteAddress` (not `X-Forwarded-For`). Refresh and the authenticated
CRM API are not rate-limited here. A real CDN/WAF is later.

## Findings

| Item                                                                                   | Why it stays                                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| No live staging or production host                                                     | Not invented. Config-level tests only                                |
| Process-local IP limit                                                                 | No Redis/WAF in this slice                                           |
| CSP `script-src` includes `'unsafe-inline'`; development/test also use `'unsafe-eval'` | Next.js 15 without a nonce system; required to load `/` and `/login` |
| Development CSP also allows `http://127.0.0.1:3002` when the API is loopback           | ERP E2E/login uses 127.0.0.1; `localhost` ≠ `127.0.0.1`              |
| `img-src` is `'self' data: blob:`                                                      | Remote catalog CDNs may be blocked until a later img-src expansion   |
| API has no CSP                                                                         | JSON API; Helmet CSP would break Swagger UI in development           |
| HSTS not sent on local HTTP (`development` / `test`)                                   | Do not pretend local HTTP is HTTPS                                   |
| `trust proxy` unset; forwarded client IPs are not used                                 | Spoofable without a known edge                                       |
| No Redis, WAF, APM, or Prometheus                                                      | Out of scope                                                         |
| SEC-04 leftovers (unconsumed outbox topics, unused `idempotency_records`, 30s lease)   | Not this slice                                                       |

## Tests

Loopback only. No production URLs. Tokens are not logged.

- CORS allow/deny, Swagger on/off, Helmet headers, HSTS gated by `APP_ENV`
- Pino redact paths + a live pino logger
- Local OTP provider does not log or return the code/mobile in its delivery result
- IP limiter over-cap → 429 `AUTH_IP_RATE_LIMIT`
- Generic 500 bodies have no stack
- ERP header helper + `next.config.ts` `headers()`
- Loopback Playwright login smoke (`/login` through authenticated `/quotes`)

Do not treat this inventory as production-readiness proof.
