# Monitoring

What exists today for observability: structured HTTP logging (pino) and two
public health endpoints. There is **no** APM vendor, metrics backend, or
log-shipping stack configured in this repository.

---

## Logging (pino)

Configured in `apps/backend/src/app.module.ts` via `nestjs-pino` /
`pinoHttp`:

| Aspect     | Behavior                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level      | `LOG_LEVEL` env (default `info`)                                                                                                                            |
| Request id | `x-request-id` header if present; otherwise a new UUID (`genReqId`)                                                                                         |
| Redaction  | `PINO_REDACT_PATHS` in `http-surface.ts`: Authorization, Cookie, Set-Cookie, OTP `code`, refresh/access tokens, password/apiKey/hmac secrets → `[REDACTED]` |

Bootstrap uses the pino Nest logger (`main.ts`). Exceptions surface
`requestId` through `GlobalExceptionFilter`.

Do not log OTPs, access tokens, or refresh tokens. Audit metadata rules:
[auditing.md](../05-security/auditing.md).

---

## Health endpoints

`@Public()` controller `HealthController` — base path
`/api/v1/health` (global prefix `api` + URI version `1`).

| Route                      | Purpose                        | Response                                                                                       |
| -------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `GET /api/v1/health/live`  | Process liveness               | `{ "status": "ok" }`                                                                           |
| `GET /api/v1/health/ready` | Persistence probe (`SELECT 1`) | `{ "status": "ok" \| "degraded", "checks": { "persistence": "postgresql" \| "unreachable" } }` |

Wire live/ready into whatever process supervisor or load balancer you choose at
cutover ([production.md](./production.md)). Treat `degraded` as not ready for
traffic even if the HTTP status is still a success code from Nest.

---

## Audit and outbox (cross-link)

Controlled mutations also write append-only `audit_events` and often
`outbox_events` in the same transaction ([Pattern B](../02-architecture/pattern-b.md)).
That is **domain evidence**, not a substitute for host metrics or alerting.

Outbox **delivery** to external channels is eventual and out of scope for this
doc.

---

## Minimum production alerting (ops checklist)

Until an APM vendor is chosen, wire at least:

1. Process supervisor restart alerts for the Nest API.
2. Load-balancer / probe alerts on `GET /api/v1/health/ready` → not ready.
3. Log alerts for spike in `5xx` and `OTP_RESEND_COOLDOWN` / `OTP_REQUEST_LIMIT` / `AUTH_IP_RATE_LIMIT` / `OTP_PROVIDER_UNCONFIGURED`.
4. Disk / Postgres connection saturation alerts on the managed database.

Do not store OTPs or tokens in alert payloads.

---

## Non-goals (not in-repo)

- No Datadog, New Relic, OpenTelemetry collector, Prometheus, Grafana, or Sentry wiring
- No uptime SaaS or synthetic monitors checked into the repo
- No centralized log aggregation configuration

When those are chosen, document them as new ops decisions — do not invent them
here.

---

## Related

- [environment.md](./environment.md) (`LOG_LEVEL`)
- [production.md](./production.md)
- [auditing.md](../05-security/auditing.md)
