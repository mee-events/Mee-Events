# Backup and Recovery

PostgreSQL is the system of record. Schema recovery is replay of ordered
migrations. **Data** backups for staging/production are an operator /
provider responsibility — this repository has **no** backup scripts, dump
cron, or RTO tooling.

---

## Schema recovery

1. Provision an empty (or restored) PostgreSQL database.
2. Apply migrations in filename order via
   `infrastructure/postgres/apply-migrations.sh` (local:
   `corepack pnpm db:migrate`).
3. Confirm rows in `schema_migrations` match the expected catalog.

Full algorithm and file list: [migrations.md](../03-database/migrations.md).

Style expectation: additive / **expand-and-contract**. Prefer that path over
destructive schema rollback when rolling back application code
([migrations conventions](../03-database/migrations.md#conventions),
[PRD 10 intent](../product/prd/10-deployment-devops-prd-v1.md)).

---

## Local development data

Compose mounts volume `me_event_postgres`
(`infrastructure/docker-compose.yml`). Removing containers **without**
removing the volume keeps local data; deleting the volume wipes the local DB.

Dev seed (`corepack pnpm db:seed:dev`) is optional and **must not** run against
production.

---

## Production / staging data

Before any production launch checklist item is marked done
([production.md](./production.md)):

| Expectation                           | Notes                                                           |
| ------------------------------------- | --------------------------------------------------------------- |
| Provider- or operator-managed backups | Automated snapshots/PITR as offered by the chosen Postgres host |
| Tested restore                        | At least one restore drill before cutover                       |
| Separate credentials per env          | [ADR 0003](../adr/0003-environments-and-configuration.md)       |
| No reliance on Compose volumes        | Compose is local-only                                           |

Managed Postgres (including Supabase-as-**host**) may supply backups; that is
infrastructure choice, not something implemented in this repo.

---

## Application rollback guidance

| Layer              | Prefer                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| App binary / image | Redeploy previous known-good build                                                        |
| Schema             | Expand-and-contract so code rollback does not require dropping columns                    |
| Domain mistakes    | Compensating writes + Pattern B audit/timeline — not silent `DELETE` of financial history |

There is no in-repo CD job to automate rollback ([ci-cd.md](./ci-cd.md)).

---

## Related

- [migrations.md](../03-database/migrations.md)
- [production.md](./production.md)
- [local-development.md](./local-development.md)
- [transactions.md](../03-database/transactions.md)
