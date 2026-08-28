# Mee Events Platform — Database Documentation

This directory is the official database engineering reference for Mee Events.

PostgreSQL is the transactional source of truth. Schema evolves only through
versioned SQL files under
[`infrastructure/postgres/migrations/`](../../infrastructure/postgres/migrations/).
Clients (mobile, ERP) never write the database directly; the NestJS backend
owns authentication, authorization, transactions, audit, and outbox writes
([ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md),
[ADR 0005](../adr/0005-persistence-boundary.md)).

## Apply migrations

With local Postgres healthy (`corepack pnpm db:up`):

```sh
corepack pnpm db:migrate
```

That runs [`infrastructure/postgres/apply-migrations.sh`](../../infrastructure/postgres/apply-migrations.sh),
which applies each `migrations/*.sql` file exactly once and records it in
`schema_migrations`.

## Contents

| Document                                     | Purpose                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| [schema-overview.md](./schema-overview.md)   | Cross-cutting patterns and domain table inventory         |
| [erd.md](./erd.md)                           | Entity relationship diagrams (FK edges from migrations)   |
| [migrations.md](./migrations.md)             | Ordered migration catalog and apply conventions           |
| [indexing.md](./indexing.md)                 | Index strategy and notable indexes                        |
| [transactions.md](./transactions.md)         | Migration vs runtime transactions, concurrency, lifecycle |
| [pattern-b-tables.md](./pattern-b-tables.md) | Pattern B table catalog (schema only)                     |

## Related documents

| Document                                                              | Role                                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Engineering Overview](../01-overview/README.md)                      | Platform context                                                            |
| [System Architecture](../02-architecture/architecture.md)             | Backend and data-access architecture                                        |
| [Backend Handbook](../02-architecture/backend.md)                     | Adapter transactions and module standards                                   |
| [Pattern B Specification](../02-architecture/pattern-b.md)            | Pattern B behavior (not just tables)                                        |
| [Postgres foundation README](../../infrastructure/postgres/README.md) | Local Postgres notes (migration list there is outdated; use this directory) |

## Non-sources

Do not treat these as the live schema:

- [`docs/references/supabase/schema.sql`](../references/supabase/schema.sql) — legacy prototype
- Nest `@supabase/supabase-js` — retained for operational asset scripts, not
  schema or Auth SoT. Flutter direct Supabase access and its package were
  removed by SEC-06.
- Product roadmap table names in PRD 06 that are not present in migrations
  `0001`–`0013`
