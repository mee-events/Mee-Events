# Mee Events Platform — API Documentation

This directory is the official REST API reference for backend and client
engineers. It catalogs **implemented** routes under `/api/v1`.

Live OpenAPI (Swagger UI and JSON): **`/api/docs`** on the backend when
`APP_ENV=development`. It is off in test unless `ENABLE_OPENAPI=true`; staging
and production config always keep the UI and JSON spec off.

Request/response shapes are defined as Zod schemas in
[`packages/api-contracts`](../../packages/api-contracts). Controllers validate
bodies and queries with `ZodValidationPipe`.

## Conventions

| Topic          | Rule                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| Base path      | `/api/v1/...` (global prefix `api`, URI version `1`)                                  |
| Authentication | `Authorization: Bearer <access_token>` unless the route is `@Public`                  |
| Authorization  | `@RequireCapability(...)` checked by `CapabilityGuard` after auth                     |
| Errors         | `{ code, message, status, requestId }` via `GlobalExceptionFilter`                    |
| Verbs in use   | `GET`, `POST`, `PATCH` (no `PUT`/`DELETE` handlers in presentation controllers today) |

See [Backend Handbook](../02-architecture/backend.md) and
[Architecture — Security](../02-architecture/architecture.md) for guards,
validation, and Pattern B on mutations.

## Contents

| Document                                 | Surface                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| [authentication.md](./authentication.md) | Auth, bootstrap, health                                                 |
| [customer.md](./customer.md)             | Catalog, enquiries, own quotations/bookings/payments/events, finance/me |
| [crm.md](./crm.md)                       | Core CRM: leads, quotations, bookings, payments, events                 |
| [vendor.md](./vendor.md)                 | CRM vendors + vendor self (`/vendors/me`)                               |
| [worker.md](./worker.md)                 | CRM workers + worker self (`/workers/me`)                               |
| [inventory.md](./inventory.md)           | CRM warehouses/inventory + inventory self                               |
| [finance.md](./finance.md)               | CRM finance + finance/me                                                |
| [operations.md](./operations.md)         | CRM operations + operations/me                                          |
| [manager.md](./manager.md)               | CRM manager ops + manager self                                          |

CRM routes for vendors, workers, inventory, finance, operations, and manager are
documented in those domain files—not in [crm.md](./crm.md).

## Related

- [Engineering Overview](../01-overview/README.md)
- [System Architecture](../02-architecture/architecture.md)
- [ADR 0004 — API contracts](../adr/0004-api-contracts-and-versioning.md)
