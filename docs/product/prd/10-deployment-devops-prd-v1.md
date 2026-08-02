# Deployment and DevOps PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Related: ADR 0003, `docs/runbooks/local-development.md`,
  `docs/security/secrets.md`, `.github/workflows/ci.yml`

## 1. Purpose

Define how Mee Events is developed, verified, and deployed across
development, staging, and production without leaking secrets or mixing
environment data.

## 2. Environments (ADR 0003)

| Environment | Purpose                     | Rules                                                                                       |
| ----------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| development | Local work                  | Docker Postgres/Redis; local OTP provider allowed; sample data allowed in labelled previews |
| staging     | Pre-production verification | Separate database, credentials, and domains; production-like providers                      |
| production  | Real business use           | Local OTP provider forbidden; secrets from a secret manager; no sample data                 |

Each environment has its own database, storage, credentials, domains, and
signing identities. Configuration is validated at startup; the backend fails
fast on missing or invalid configuration.

## 3. Local development

Requirements: Node.js 20+, Corepack/pnpm 9, Docker Desktop, Flutter SDK 3.x+.

```sh
corepack pnpm install
corepack pnpm db:up        # Postgres 17 on 5433, Redis 7 on 6380
corepack pnpm db:migrate   # applies infrastructure/postgres/migrations in order
corepack pnpm dev:backend  # http://localhost:3002 (Swagger at /api/docs)
corepack pnpm dev:erp      # http://localhost:3001
cd apps/mobile && flutter pub get && flutter run
```

Copy `.env.example` files to ignored `.env` files before connecting clients.

## 4. Database migrations

- Versioned SQL files in `infrastructure/postgres/migrations/`, zero-padded
  and applied in order via `pnpm db:migrate`
- Every migration is wrapped in a transaction
- Backwards-incompatible changes use expand-and-contract so deploys never
  require downtime
- Staging and production migrations run before the new application version
  serves traffic

## 5. Continuous integration

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

- TypeScript job: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build`
- Flutter job: `dart format --set-exit-if-changed`, `flutter analyze
--fatal-infos`, `flutter test`, debug APK build
- Dependency review on pull requests

Rules:

- CI must stay green on `main`; failing checks block merges
- New backend modules ship with tests that run in the TypeScript job
- Integration tests that need Postgres run against a CI service container

## 6. Secrets management (`docs/security/secrets.md`)

- No secrets in the repository; `.env.example` files contain placeholders
  only
- Production secrets live in a secret manager and are injected at deploy
  time
- Client builds receive only public configuration (API base URL) via
  build-time defines; never API keys or signing secrets
- OTP codes and tokens are redacted from logs

## 7. Deployment targets

- Backend: containerised NestJS deployment behind HTTPS with health probes
  (`/api/v1/health/live`, `/api/v1/health/ready`); readiness must reflect
  real dependency state (database connectivity)
- ERP web: Next.js deployment with environment-specific
  `NEXT_PUBLIC_API_BASE_URL`
- Database: managed PostgreSQL (a provider such as Supabase may host it per
  ADR 0010); automated backups with tested restore
- Mobile: Flutter release builds per flavour with store distribution;
  staged rollout for production releases

## 8. Observability and operations

- Structured JSON logging (pino) with request ids end to end
- Error responses carry stable codes and request ids for support triage
- Uptime monitoring on health endpoints
- Database backup and restore runbook before production launch
- Incident response: audit log plus request ids reconstruct any controlled
  mutation

## 9. Release rules

- The `verify` script (`build`, `lint`, `typecheck`, `test`) must pass
  locally before merge and in CI before deploy
- Staging soak before production promotion for backend changes touching
  identity, payments, or approvals
- Rollback plan: previous container image plus expand-and-contract
  migrations mean schema rollback is never required for a code rollback

## 10. Acceptance criteria

- A new developer can reach a working local stack with the documented steps
- No environment shares credentials, databases, or domains with another
- Production deploys are reproducible from tagged builds
- Readiness probes fail when the database is unreachable
- Secrets never appear in the repository, logs, or client bundles
