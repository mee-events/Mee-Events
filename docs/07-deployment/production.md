# Production Posture (Phase 1)

**Honest status:** this repository does **not** ship a live production host,
deploy pipeline, or cloud inventory. Hosting for Phase 1 remains **undecided**.
Do not treat `infrastructure/docker-compose.yml` as production — Compose runs
local Postgres + Redis only ([local-development.md](./local-development.md)).

Product aspirations (environments, release gates, observability) are described
in [PRD 10](../product/prd/10-deployment-devops-prd-v1.md). This page lists what
must be true **before** any cutover, based on ADRs and existing code.

---

## Hard requirements before traffic

| Requirement                                         | Source / notes                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| Separate env credentials & databases                | [ADR 0003](../adr/0003-environments-and-configuration.md)             |
| Secrets in a manager — not git                      | [secrets.md](../05-security/secrets.md)                               |
| Validated env at boot                               | Zod schema in `environment.ts`                                        |
| `OTP_PROVIDER` ≠ `local` when staging or production | Enforced in validation                                                |
| Migrations applied before serving traffic           | [migrations.md](../03-database/migrations.md)                         |
| Health ready before load                            | `/api/v1/health/live` and `/ready` — [monitoring.md](./monitoring.md) |
| No sample / seed data in prod                       | Dev seed is local-only (`db:seed:dev`)                                |
| Distinct JWT / HMAC / refresh secrets per env       | Never reuse across staging/prod                                       |

---

## Hosting (undecided)

Acceptable directions when chosen later (not implemented here):

- Managed PostgreSQL (a Supabase **Postgres host** is allowed per ADR 0011;
  Auth/RLS are not the app auth model)
- Process host for Nest + static/SSR host for ERP + store distribution for Flutter

**Do not assume** Vercel, Railway, Kubernetes, Terraform, or any named PaaS
from this doc — none are wired in-repo.

---

## Cutover checklist (operator)

1. Provision separate staging and production databases and secrets.
2. Apply ordered SQL migrations; verify `schema_migrations`.
3. Confirm production env rejects local OTP and boots cleanly.
4. Wire health checks to the process supervisor / load balancer.
5. Confirm provider (or operator) **data** backups exist — [backup-recovery.md](./backup-recovery.md).
6. Smoke auth + one CRM write path + Pattern B side effects in staging first.

---

## Related

- [environment.md](./environment.md)
- [ci-cd.md](./ci-cd.md)
- [monitoring.md](./monitoring.md)
- [ADR 0010](../adr/0010-connected-platform-rebuild.md) / [ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md)
