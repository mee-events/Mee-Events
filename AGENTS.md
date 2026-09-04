# Mee Events — agent briefing

Keep this file short. Deep detail lives in `docs/` and ADRs — read those on demand.

## What this is

Connected Hyderabad event OS: one Flutter multi-role mobile app, one NestJS API,
one Next.js Employee CRM/ERP, one PostgreSQL source of truth.

Live execution SoT: `docs/roadmap/MEE_EVENTS_MASTER_TODO.md` and
`docs/roadmap/MEE_EVENTS_PROGRESS.md`. PDFs under `docs/roadmap/` dated
18 August 2026 are historical. Default branch is `master`.

```text
apps/mobile/     Flutter (Customer, Vendor, Worker)
apps/backend/    NestJS API
apps/erp-web/    Next.js CRM/ERP
packages/        api-contracts, shared-types
infrastructure/  postgres migrations, docker-compose
docs/            engineering suites + ADRs + PRDs
```

## Canonical docs (read before inventing architecture)

| Need                   | Path                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| Engineering overview   | `docs/01-overview/README.md`                                         |
| Architecture           | `docs/02-architecture/architecture.md`                               |
| API routes             | `docs/04-api/README.md`                                              |
| Auth / secrets         | `docs/05-security/`                                                  |
| Local / deploy         | `docs/07-deployment/`                                                |
| Testing / verify gate  | `docs/08-testing/testing-strategy.md`                                |
| ADRs                   | `docs/adr/` — **ADR 0010** is the active connected-platform decision |
| Product scope          | `docs/product/prd/00-master-prd-v1.md`                               |
| Live TODO / progress   | `docs/roadmap/MEE_EVENTS_MASTER_TODO.md`, `MEE_EVENTS_PROGRESS.md`   |
| AI coding controls     | `docs/05-security/ai-coding-controls.md`                             |
| Beginner learning path | `docs/01-overview/beginner-engineering-path.md`                      |
| Interview knowledge    | `docs/01-overview/interview-knowledge-base.md`                       |

## Local commands

```sh
corepack pnpm install
corepack pnpm db:up
corepack pnpm db:migrate
corepack pnpm dev:backend   # API ~:3002  docs /api/docs
corepack pnpm dev:erp       # ERP ~:3001

cd apps/mobile && flutter pub get && flutter run
```

Demo path and smokes: `docs/07-deployment/local-demo-checklist.md`,
`scripts/demo-enquiry-claim-smoke.sh`, `scripts/demo-enquiry-to-booking-smoke.sh`.

## Hard rules for agents

1. Prefer small, scoped changes. Do not drive-by refactor.
2. Never commit real secrets. Only `.env.example` / placeholders. See `docs/05-security/secrets.md`.
3. Do not send company code through FreeLLMAPI, free-tier LLM proxies, or personal AI accounts without Privacy Mode.
4. Prefer `@`-mentioning specific files over broad codebase dumps. Respect `.cursorignore`.
5. Match existing patterns in the touched app (`apps/backend`, `apps/erp-web`, `apps/mobile`).
6. Do not claim production/SMS/payment/PDF as live unless docs say so — see root `README.md` status section.

## Product-owner learning mode

The product owner is a complete beginner. For meaningful work, use
**BUILD → EXPLAIN → TRAIN → VERIFY → INTERVIEW PREP**. Explain simply first,
teach only the concepts relevant to the active roadmap task, and help the owner
describe AI-assisted work honestly. Detailed guidance lives in the beginner
learning path above and `.cursor/rules/beginner-engineering-training.mdc`.

## Memory

- Decisions: `docs/adr/`
- Product scope: `docs/product/prd/`
