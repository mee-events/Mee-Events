# SEC-03 — Authentication atomicity and session control

- **Task:** STAB-20 / SEC-03 only (OTP one-time consume, refresh audit-in-TX, stable device ID, list/revoke-all)
- **Date:** 28 August 2026
- **Phase 0:** still **NOT PASSED**. STAB-20 remains **open**. SEC-04 later
  closed with findings; see [sec-04-outbox-reliability-inventory.md](./sec-04-outbox-reliability-inventory.md).
  This file is the SEC-03 snapshot.
- **Result:** **DONE WITH FINDINGS**
- **This slice does not claim production is secure.**

Login is still phone OTP plus a device session (opaque refresh). STAB-15 already
proved two-API-server refresh coordination and that reuse of an old refresh
token revokes the session. This slice closes the remaining SEC-03 holes that
were still open after that proof.

## Status key

| Status         | Meaning                                                             |
| -------------- | ------------------------------------------------------------------- |
| Already proven | True before this commit; left in place (including the STAB-15 lock) |
| Fixed          | Changed in this commit                                              |
| Finding        | Inspected; left open with file + reason                             |

## Already proven (STAB-15 refresh)

| Behavior                                                     | Files                                                                       | Status         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------- |
| Process-local in-flight refresh guard                        | `auth.service.ts` `refreshDigestsInFlight`                                  | Already proven |
| PostgreSQL `REPEATABLE READ` + session row lock              | `postgres-identity.repository.ts` `coordinateSessionRefresh`                | Already proven |
| Current-digest CAS rotation                                  | `rotateSessionRefreshToken`                                                 | Already proven |
| Overlapping current-token loser → `SESSION_REFRESH_CONFLICT` | two-service / two-pool integration in `identity.integration.spec.ts`        | Already proven |
| Sequential previous-digest reuse → revoke                    | same integration + `auth-service.spec.ts`                                   | Already proven |
| ERP Web stable browser device ID                             | `apps/erp-web/src/lib/employee-api.ts` `browserDeviceId()` (`localStorage`) | Already proven |

The STAB-15 refresh lock is unchanged: snapshot, `FOR UPDATE` on the existing
`device_sessions` row, then CAS. No advisory digest lock, grace window, retry,
or sleep was added.

## Fixed in this commit

| Hole                                                             | Fix                                                                                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| OTP consume, user, session, and audit were separate transactions | `completeOtpVerification` runs consume + find-or-create user + same-device revoke + session insert + Pattern B audit in **one** TX |
| Concurrent correct verifies could race after consume             | Consume CAS is the TX gate; loser returns `OTP_CHALLENGE_INVALID` (401), no second session                                         |
| Refresh rotation/reuse could commit without its audit row        | `identity.session.rotated` / reuse `identity.session.revoked` insert inside the same `REPEATABLE READ` TX                          |
| Logout audited after a separate revoke                           | `revokeCurrentSession` revokes + `identity.session.revoked` (`reason: logout`) in one TX                                           |
| Flutter generated a new random `deviceId` on every verify        | `installation_id.dart` persists `mee_events.installation_id.v1` in `flutter_secure_storage`                                        |
| No list-sessions or revoke-all API                               | `GET /api/v1/auth/sessions`, `POST /api/v1/auth/logout-all`                                                                        |

List responses are `DeviceSessionSummary` only (`id`, `deviceId`, timestamps,
`current`). Raw refresh tokens and digests are not returned.

A new installation (empty secure storage) may generate a new device ID. That
creates a **new** session and does not revoke or take over the previous
install’s session.

## Still open (not blocked; not this slice)

| Item                                                                               | File / owner                                          | Reason                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile/ERP session list and revoke-all **UI**                                      | Customer Account/Profile (`CUST-20`); ERP login shell | API only in this slice                                                                                                                 |
| Process-local access-token principal cache (15s) across API instances              | `auth-principal-cache.ts`                             | Same-process logout/revoke-all invalidate immediately; other processes re-read `revoked_at` after TTL. Redis fan-out is not in SEC-03. |
| Same-device re-login does not invalidate the previous session id in that 15s cache | `auth.service.ts` `verifyOtp`                         | Previous row is revoked in the OTP TX; old access JWT dies on DB re-read. Left as cache residual.                                      |
| HTTP pipeline / Nest E2E for the new session routes                                | STAB-17                                               | Service + PostgreSQL identity tests cover behavior; no live HTTP BOLA matrix here                                                      |
| Real SMS vendor                                                                    | `ExternalOtpProvider`                                 | Explicitly out of scope                                                                                                                |
| Outbox / idempotency                                                               | SEC-04                                                | Closed with findings in the SEC-04 slice; see [sec-04-outbox-reliability-inventory.md](./sec-04-outbox-reliability-inventory.md)       |
| Headers / log redaction / Swagger exposure                                         | SEC-05                                                | Closed with findings in the SEC-05 slice; see [sec-05-web-api-hardening-inventory.md](./sec-05-web-api-hardening-inventory.md)         |
| Direct Supabase on mobile                                                          | SEC-06                                                | **Not started**                                                                                                                        |

## Tests

- Unit: concurrent OTP (one consume), refresh reuse still revokes, logout current,
  revoke-all, new device ID does not steal the old session, OTP audit failure
  rolls back consume, mocked `completeOtpVerification` Pattern B.
- PostgreSQL: existing STAB-15 concurrent OTP + two-instance refresh kept;
  added OTP/refresh audit rollback, logout, revoke-all, reinstall device ID.

Do not treat this inventory as production-readiness proof.
