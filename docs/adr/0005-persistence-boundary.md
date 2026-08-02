# ADR 0005: PostgreSQL and persistence boundary

- Status: accepted
- Date: 2026-07-27

## Decision

PostgreSQL is the transactional source of truth. The initial implementation uses
repository ports with an in-memory adapter for domain tests and local scaffolding.
The first database-backed slice will use Prisma migrations behind the same ports.

UUIDs, timezone-aware timestamps, optimistic versions, controlled status values,
and append-only audit events are mandatory. Financial and audit data will not use
hard deletion.

## Consequences

The current identity endpoints are not production-deployable until the
PostgreSQL adapters, migrations, and distributed OTP throttling are completed.
Health reporting labels persistence readiness accurately.
