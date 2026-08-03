# Legacy Supabase schema reference

`schema.sql` is a **legacy prototype** dump from an earlier experiment. It is
**not** the platform schema source of truth.

| Authoritative | Location                                                                              |
| ------------- | ------------------------------------------------------------------------------------- |
| Migrations    | [`infrastructure/postgres/migrations/`](../../../infrastructure/postgres/migrations/) |
| Engineer docs | [`docs/03-database/`](../../03-database/)                                             |

PostgreSQL may still be hosted on a managed provider (including Supabase as a
**host**). Supabase Auth/RLS are not the application authorization layer
([ADR 0011](../../adr/0011-prd-suite-and-flutter-confirmation.md)).
