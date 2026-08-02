# PostgreSQL foundation

`migrations/0001_platform_foundation.sql` is the first shared persistence
boundary for the connected Hyderabad platform.

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

Apply locally after the PostgreSQL container is healthy:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f infrastructure/postgres/migrations/0001_platform_foundation.sql
```

This migration intentionally contains only the platform foundation. Later
migrations add connected vertical slices:

- `0003_catalog_enquiries_leads.sql` — catalogue, enquiries, leads
- `0004_quotations_payments_bookings.sql` — quotations, payment plans, bookings
- `0005_event_records.sql` — Event Record aggregate, timeline, notes, documents
- Fulfilment, warehouse, and finance tables arrive in later slices
