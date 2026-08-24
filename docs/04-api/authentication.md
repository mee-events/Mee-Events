# Authentication, Bootstrap, and Health

Controllers:

- `apps/backend/src/modules/identity/presentation/auth.controller.ts`
- `apps/backend/src/modules/platform-foundation/presentation/platform-bootstrap.controller.ts`
- `apps/backend/src/modules/health/health.controller.ts`

Identity model: [Identity foundation](../05-security/identity-foundation.md),
[ADR 0002](../adr/0002-identity-and-session-security.md).

---

## Auth (`/api/v1/auth`)

| Method | Path                       | Auth   | Purpose                                                         |
| ------ | -------------------------- | ------ | --------------------------------------------------------------- |
| POST   | `/api/v1/auth/otp/request` | Public | Request OTP for E.164 mobile                                    |
| POST   | `/api/v1/auth/otp/verify`  | Public | Verify OTP; issue access JWT + refresh; create device session   |
| POST   | `/api/v1/auth/refresh`     | Public | Rotate refresh token; issue new access token                    |
| POST   | `/api/v1/auth/logout`      | Bearer | Revoke current device session                                   |
| POST   | `/api/v1/auth/switch-role` | Bearer | Persist active mobile role; issue a new role-bound access token |

`POST /api/v1/auth/switch-role` accepts `{ "role": "customer" | "vendor_owner" | "vendor_member" | "worker" }`.
The target must already be an active assignment. Success returns
`accessToken`, `accessTokenExpiresInSeconds`, and `activeRole`. The current
refresh token is unchanged. Unassigned or inactive roles return `403`
`ROLE_NOT_ASSIGNED`. Concurrent `last_active_role` updates return `409`
`VERSION_CONFLICT`. Employee roles are rejected by the request schema.

`POST /api/v1/auth/refresh` also returns server-authoritative `activeRole`.

Body schemas live in `@me-event/api-contracts` (OTP request/verify and refresh
payloads).

---

## Platform bootstrap (`/api/v1/platform`)

| Method | Path                         | Auth   | Purpose                                                           |
| ------ | ---------------------------- | ------ | ----------------------------------------------------------------- |
| GET    | `/api/v1/platform/bootstrap` | Bearer | Return active role, Hyderabad branch, modules, and capability set |

No `@RequireCapability` on bootstrap; any authenticated principal may call it.
Clients use the capability list for UI gating; **server enforcement** remains on
each protected route.

---

## Health (`/api/v1/health`)

| Method | Path                   | Auth   | Purpose                               |
| ------ | ---------------------- | ------ | ------------------------------------- |
| GET    | `/api/v1/health/live`  | Public | Process liveness                      |
| GET    | `/api/v1/health/ready` | Public | Readiness (includes PostgreSQL probe) |

---

## Related

- [API index](./README.md)
- [Architecture — Security](../02-architecture/architecture.md)
