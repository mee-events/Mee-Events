# Authentication

This document describes how Mee Events authenticates callers: phone OTP,
device sessions, opaque refresh tokens, and short-lived JWT access tokens.

Route catalog: [API authentication](../04-api/authentication.md).  
Decision record: [ADR 0002](../adr/0002-identity-and-session-security.md).  
Domain notes: [Identity foundation](./identity-foundation.md).

Implementation:

- `apps/backend/src/modules/identity/presentation/auth.controller.ts`
- `apps/backend/src/modules/identity/application/auth.service.ts`

There is **no** MFA, OAuth, or social login in the shipped backend.

---

## Flows

```mermaid
sequenceDiagram
  participant Client
  participant Auth as AuthService
  participant DB as PostgreSQL
  participant Provider as OtpProvider
  Client->>Auth: POST auth/otp/request
  Auth->>DB: store OTP digest challenge
  Auth->>Provider: sendCode
  Auth-->>Client: expiresIn and resendAfter hints
  Client->>Auth: POST auth/otp/verify
  Auth->>DB: consume challenge create user session
  Auth-->>Client: access JWT plus opaque refresh
  Client->>Auth: POST auth/refresh
  Auth->>DB: rotate refresh digest
  Auth-->>Client: new access and refresh
  Client->>Auth: POST auth/logout Bearer
  Auth->>DB: revoke session
```

| Step        | Endpoint                        | Auth   | Behavior                                                                                                                      |
| ----------- | ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Request OTP | `POST /api/v1/auth/otp/request` | Public | Normalize E.164 mobile; create challenge; send code via OTP provider                                                          |
| Verify OTP  | `POST /api/v1/auth/otp/verify`  | Public | Constant-time digest compare; consume challenge once; create user if needed (default role `customer`); issue session + tokens |
| Refresh     | `POST /api/v1/auth/refresh`     | Public | Rotate opaque refresh; extend session; issue new access JWT                                                                   |
| Logout      | `POST /api/v1/auth/logout`      | Bearer | Revoke current device session; invalidate principal cache                                                                     |

---

## TTLs and digests

| Item                            | Value                                         | Storage                                                                             |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| OTP challenge TTL               | 300 seconds                                   | Challenge row `expiresAt`                                                           |
| OTP resend hint                 | 60 seconds (`resendAfter`)                    | Returned to client; **not** server-enforced as a rate limit today                   |
| OTP max attempts                | 5                                             | Decremented on failed verify                                                        |
| OTP digest                      | HMAC-SHA256 of `` `${challengeId}:${code}` `` | Secret `OTP_HMAC_SECRET`; plaintext never stored                                    |
| Access JWT TTL                  | 900 seconds                                   | Signed with `JWT_ACCESS_SECRET` (see [jwt.md](./jwt.md))                            |
| Device session / refresh window | 30 days                                       | Session `expiresAt`; refresh stored as HMAC digest with `REFRESH_TOKEN_HMAC_SECRET` |
| Refresh token                   | 48 random bytes, base64url                    | Opaque; only digest persisted                                                       |

Verification uses `timingSafeEqual` on digests.

---

## Device sessions and refresh reuse

Each successful verify creates a **device session** bound to a rotating refresh
token digest.

On refresh:

1. Lookup by current refresh digest, or by **previous** digest (rotation window).
2. If the previous digest is presented again → treat as **reuse**: revoke
   session, invalidate principal cache, audit
   `identity.session.revoked` with reason `refresh-token-reuse`.
3. Otherwise rotate to a new refresh digest, keep previous for one-time overlap
   detection, extend session expiry by 30 days, audit
   `identity.session.rotated`.

Logout audits `identity.session.revoked` with reason `logout`.

---

## OTP providers

| Setting                 | Behavior                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `OTP_PROVIDER=local`    | `LocalOtpProvider` (development/tests). Production startup **rejects** local provider |
| `OTP_PROVIDER=external` | Intended for approved SMS providers; wire only through the OTP provider port          |

In development with local provider, a debug code may be returned for testing.
Never log OTPs or tokens in production logs.

---

## Gaps vs ADR 0002

ADR 0002 calls for server-side request rate limits and resend cooldown
enforcement. **Today:**

- Challenge attempts and expiry are enforced.
- `resendAfter` is returned as a client hint.
- Redis-backed (or other) per-mobile request throttling is **not** implemented
  in the auth service.

Treat distributed rate limiting as a production hardening item
([identity-foundation.md](./identity-foundation.md)).

---

## Related

- [jwt.md](./jwt.md)
- [authorization.md](./authorization.md)
- [auditing.md](./auditing.md)
- [Secret handling](./secrets.md)
