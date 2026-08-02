# ADR 0011: PRD suite adoption and Flutter mobile confirmation

- Status: accepted
- Date: 2026-08-01
- Amends: the mobile-framework choice in ADR 0010 and the Prisma statement in
  ADR 0005

## Context

The founder provided a Master Product Requirements Document covering the
complete Mee Events ecosystem: Customer App, Vendor App, Worker App, CRM, and
ERP. The draft named Supabase as the backend platform, while the accepted
architecture (ADR 0001, ADR 0005, ADR 0010) uses a NestJS modular monolith
over PostgreSQL.

Separately, ADR 0010 stated that `apps/mobile` would be created with Expo
React Native, but the application that was actually approved and built in
`apps/mobile` is a Flutter application, and the repository tooling
(`README.md`, CI Flutter job, local runbook) already treats Flutter as the
mobile toolchain.

## Decision

- Adopt the PRD suite in `docs/product/prd/` (`00-master-prd-v1.md` through
  `10-deployment-devops-prd-v1.md`) as the governing product documentation.
  Where a child PRD conflicts with the Master PRD or an accepted ADR, the
  Master PRD and ADRs govern.
- Confirm the backend as the NestJS modular monolith over PostgreSQL. The
  Master PRD's technical vision is recorded accordingly. A managed PostgreSQL
  service such as Supabase may host the database (per ADR 0010) without the
  application depending on provider-specific features.
- Confirm Flutter as the framework for `apps/mobile`. The Expo React Native
  statement in ADR 0010 is amended; every other part of ADR 0010 (connected
  platform, Event Record aggregate, vertical-slice order, synchronization
  rule) remains in force.
- The implemented design tokens in `apps/mobile/lib/theme/` are the visual
  source of truth, as recorded in the UI/UX Design System PRD
  (`docs/product/prd/07-ui-ux-design-system-prd-v1.md`).
- Database-backed adapters use the `pg` driver behind the existing repository
  ports, with versioned SQL migrations in
  `infrastructure/postgres/migrations/` as the only schema-change mechanism.
  This amends ADR 0005's statement that the first database slice would use
  Prisma migrations; the ports-and-adapters boundary from ADR 0005 is
  unchanged.

## Consequences

- Product scope questions are answered by the PRD suite instead of ad hoc
  drafts; expensive-to-reverse engineering decisions continue to live in
  ADRs.
- No Supabase-specific backend features (client-side database access, RLS as
  the authorization layer, Supabase Auth) are introduced; authorization stays
  in the backend per ADR 0002 and ADR 0010.
- `docs/supabase/schema.sql` is a legacy artifact of an earlier prototype
  and is not part of the platform architecture.
- ADR 0006 (Flutter toolchain) remains superseded as written, but its
  toolchain concerns return in Flutter form through the CI pipeline and the
  Deployment and DevOps PRD.
