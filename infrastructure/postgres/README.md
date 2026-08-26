# PostgreSQL foundation

The ordered `migrations/0001`–`0020` catalog is the shared persistence boundary
for the connected Hyderabad platform. `0001_platform_foundation.sql` creates
the foundation; later files extend it without being folded into old history.

It creates:

- the single active Hyderabad branch;
- immutable user identifiers and multi-role assignments;
- revocable device sessions;
- configurable branch settings, including the ten-minute lead SLA;
- append-only audit events;
- an outbox for reliable cross-application updates and notifications;
- idempotency records to prevent duplicate writes.

The mobile application and ERP never write these tables directly. They call the
backend, which authenticates the actor, checks the active role and scope,
performs the transaction, appends the audit event, and writes an outbox event.

Apply the full catalog locally after the PostgreSQL container is healthy:

```sh
corepack pnpm db:migrate
```

The runner records filenames in `schema_migrations`. Seeds under `seeds/` are
separate and are not applied by this command. Do not apply only `0001` to create
a current database.

Canonical catalog, runner limitations, and live PostgreSQL 17.2 evidence:

- [`docs/03-database/migrations.md`](../../docs/03-database/migrations.md)
- [`docs/03-database/migration-verification-baseline.md`](../../docs/03-database/migration-verification-baseline.md)
