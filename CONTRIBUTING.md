# Contributing to Mee Events

Mee Events is developed as a connected commercial platform. Every change must
preserve the shared business workflow, security boundaries and source-of-truth
rules described in the repository documentation.

## Before starting

Read the references that govern the area you will change:

- [Engineering overview](docs/01-overview/README.md)
- [System architecture](docs/02-architecture/architecture.md)
- [API routes](docs/04-api/README.md)
- [Security](docs/05-security)
- [Testing strategy](docs/08-testing/testing-strategy.md)
- [Architecture decisions](docs/adr)
- [Master PRD](docs/product/prd/00-master-prd-v1.md)

Do not introduce a new application, data store, authentication system, role or
business workflow without an approved architecture/product decision.

## Change workflow

Every change follows:

```text
Understand → Plan → Implement → Test → Review → Verify → Commit
```

1. Inspect the current implementation and its consumers.
2. Define one specific outcome, scope and explicit out-of-scope items.
3. Make the smallest production-safe change.
4. Add happy-path, denial-path and failure-path tests as applicable.
5. Review the complete diff for unrelated edits and secrets.
6. Run the relevant local verification gates.
7. Commit one reviewable unit with a meaningful message.

## Branches and commits

- Branch from the current default branch.
- Use a focused name such as `fix/otp-rate-limit`, `feat/customer-enquiry`, or
  `codex/catalog-validation` for Codex-managed work.
- Do not mix unrelated backend, mobile, CRM/ERP or infrastructure work.
- Prefer Conventional Commit-style messages, for example:
  `fix(auth): reject expired OTP challenges`.

## Verification

For TypeScript work:

```sh
corepack pnpm verify
```

For Flutter work:

```sh
cd apps/mobile
dart format --output=none --set-exit-if-changed lib test
flutter analyze --fatal-infos
flutter test
```

For connected/database work, also start PostgreSQL, apply migrations and run the
relevant smoke/integration workflow. Unit tests using fake repositories are not
proof of real database behavior.

## Contracts and migrations

- Preserve versioned REST contracts unless a reviewed change is required.
- Update all consumers when changing `packages/api-contracts`.
- Never edit an already-applied migration; add the next numbered migration.
- Review constraints, indexes, foreign keys, transaction boundaries, audit
  evidence, outbox behavior and rollback behavior.
- Never claim a UI flow is connected until the real API and PostgreSQL behavior
  have been verified.

## Authentication and authorization

- Backend capabilities—not hidden buttons—are the security boundary.
- Add tests for unauthenticated, unauthorized, wrong-branch and wrong-owner
  access whenever a protected operation changes.
- Never log OTPs, access tokens, refresh tokens, passwords or provider secrets.
- Do not commit `.env`, signing keys or service-account files.

## Pull requests

Use the repository pull-request template. A reviewable pull request explains:

- the business outcome and affected workflow stage;
- files/modules changed and intentionally not changed;
- contract, migration, auth and security impact;
- tests and manual verification performed;
- screenshots for visible UI changes;
- known risks, follow-up work and rollback approach.

## Definition of done

A feature is complete only when applicable UI, API, database behavior,
authentication, authorization, validation, loading/empty/error/success states,
tests, integration evidence and documentation are complete. A working screen by
itself is not a completed feature.

## AI-assisted changes

AI tools must inspect existing patterns first, stay within a controlled scope,
preserve contracts, run verification and report every changed file. Do not ask
an AI tool to build or refactor the entire platform in one task. Follow
[AI coding controls](docs/05-security/ai-coding-controls.md).
