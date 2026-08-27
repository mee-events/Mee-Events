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

## Remaining packages (not Auth SoT)

- Flutter still depends on `supabase_flutter`. Direct client database access is
  **SEC-06** and is not closed. Identity is Nest OTP/JWT, not Supabase Auth.
- Nest still depends on `@supabase/supabase-js` for operational scripts (for
  example `apps/backend/scripts/upload_assets_to_supabase.ts`), not for login
  or schema.
