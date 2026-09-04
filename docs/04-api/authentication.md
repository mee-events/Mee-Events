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
| GET    | `/api/v1/auth/sessions`    | Bearer | List the caller’s non-revoked device sessions (no tokens)       |
| POST   | `/api/v1/auth/logout-all`  | Bearer | Revoke every active device session for the caller               |
| POST   | `/api/v1/auth/switch-role` | Bearer | Persist active mobile role; issue a new role-bound access token |

`POST /api/v1/auth/switch-role` accepts `{ "role": "customer" | "vendor_owner" | "vendor_member" | "worker" }`.
The target must already be an active assignment. Success returns
`accessToken`, `accessTokenExpiresInSeconds`, `sessionId`, and `activeRole`. The
current refresh token is unchanged. Unassigned or inactive roles return `403`
`ROLE_NOT_ASSIGNED`. Concurrent `last_active_role` updates return `409`
`VERSION_CONFLICT`. Employee roles are rejected by the request schema.

OTP verification and refresh also return the stable server `sessionId`; refresh
returns the server-authoritative `activeRole`. The mobile client requires this
ID to agree across authentication, refresh, role switch, and bootstrap before
applying a response.

`GET /api/v1/auth/sessions` returns `{ "sessions": [{ "id", "deviceId",
"createdAt", "lastSeenAt", "expiresAt", "current" }] }`. Refresh tokens and
digests are never included. `POST /api/v1/auth/logout-all` returns
`{ "revoked": true, "revokedCount": n }` and invalidates cached principals for
the user.

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

The response contains structural `schemaVersion`,
`minimumClientBootstrapVersion`, an opaque `policyVersion`, server
`generatedAt`, request and actor/session identities, Hyderabad operational
branch metadata, typed active role grants, modules, capabilities, and security
controls. Authentication and bootstrap responses use `Cache-Control: no-store`.

Compatibility rules:

- required identity, session, branch, routing, control, baseline module, and
  baseline capability fields are strict;
- a client accepts a well-formed later policy revision and safe unknown
  additive modules/capabilities while continuing to require its baseline;
- missing baseline privileges, malformed data, or known cross-role privileged
  entries fail closed;
- `minimumClientBootstrapVersion` rejects clients that cannot safely interpret
  the response; and
- a breaking structural contract uses a new `/api/v2` route under ADR 0004,
  rather than silently changing the `/api/v1` schema.

`generatedAt` is server provenance, not a device-clock authorization decision.
The shared TypeScript schema and Flutter client both require its RFC 3339 UTC
form ending in `Z`; non-UTC offsets are rejected. Session/generation agreement,
not wall-clock comparison, rejects stale in-flight responses. An unexpected
server bootstrap-schema failure reaches the existing safe generic
`500 INTERNAL_ERROR` boundary and is not mapped to the account-authorization
403 response; a more specialized public schema-failure code remains part of
the broader CUST-24 error-contract work.

Operational `branchId` is distinct from a grant's `scopeType`/`scopeId`.
Phase 1 supports Hyderabad branch grants, a no-ID global administrator grant,
and vendor-owner/member grants for a vendor UUID. Vendor APIs independently
require an active vendor role, a qualifying assignment for the requested vendor
(exact vendor scope or Hyderabad branch scope), and active `vendor_members`
ownership/membership for that same vendor. Membership cannot combine with a
grant for a different vendor.

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
