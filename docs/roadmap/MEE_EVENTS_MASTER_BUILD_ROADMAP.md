# MEE EVENTS

## Current State, Pending Work & Master Build Roadmap

> **Historical (18 August 2026).** This markdown file and the matching PDFs in
> this folder are **not** the live execution source of truth. Use
> [`MEE_EVENTS_MASTER_TODO.md`](./MEE_EVENTS_MASTER_TODO.md),
> [`MEE_EVENTS_PROGRESS.md`](./MEE_EVENTS_PROGRESS.md), numbered `docs/`, and
> ADRs. Do not execute Phase 0 work from this document.

**Customer + Vendor + Worker Mobile | Employee Mobile | CRM | ERP | Backend | Database | Release**

| Document              | Value                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Version               | 1.0                                                                                                   |
| Document date         | 18 August 2026                                                                                        |
| Repository audit date | 18 August 2026                                                                                        |
| Repository            | `Mee Event V1`                                                                                        |
| Audit basis           | Source code, configuration, SQL migrations, tests, build output, Git state, and current documentation |
| Product decision      | Continue the existing repository; do not restart                                                      |

> **Founder summary:** There is one Flutter application today, not two duplicate apps. It serves Customer, Vendor, and Worker roles. The required Employee Mobile application does not exist as a production application yet. Continue this repository, stabilize it first, and add Employee Mobile later as a separate Flutter application connected to the same NestJS backend and PostgreSQL database.

---

# 1. Executive Summary

## Where am I now?

Mee Events is a substantial connected-platform foundation, not a finished production product and not a project that should be restarted. The repository already contains:

- one Flutter Customer/Vendor/Worker application;
- one NestJS modular backend with 17 routed feature modules and about 223 controller handlers;
- one Next.js employee portal with CRM and ERP routes;
- 20 ordered PostgreSQL migrations creating 114 tables;
- shared roles, capabilities, schemas, audit and outbox foundations;
- a connected demo path from customer enquiry to CRM, quotation, advance confirmation, booking and Event Record.

The project is strongest in backend and database foundations. It is weakest in production proof, complete role products, employee work management, integrations, automated end-to-end testing, release configuration, and deployment.

## Direct answers

| Question                                         | Evidence-based answer                                                                                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start new or continue?                           | **Continue this repository.** Restarting would discard valuable connected backend, database and UI work.                                                                                                                    |
| Are there two Flutter apps?                      | **No.** Only `apps/mobile` is a Flutter package.                                                                                                                                                                            |
| Are there duplicate Customer/Vendor/Worker apps? | **No.** Customer, Vendor and Worker are role experiences in one app.                                                                                                                                                        |
| Does Employee Mobile exist?                      | **No production app.** Some manager/operations Flutter screens exist inside `apps/mobile`, but the login/bootstrap sends employee roles to `employee_web`; those screens are reusable code, not an Employee Mobile product. |
| Should useless files be permanently deleted now? | **No bulk deletion.** First make a reviewed cleanup list. Regenerable build/cache folders and proven junk are safe candidates; uncertain design/evidence files must be archived or reviewed.                                |
| Is the project production-ready?                 | **No.** Production OTP, payment gateway, document storage/PDF, notifications, database integration tests, E2E, monitoring/deployment, signing and store release proof are incomplete.                                       |
| What should be done now?                         | **Module STAB-01: restore the repository quality gate.** Fix current formatter/lint/mobile test failures, separate raw design exports from source formatting, and prove the full local verification command is green.       |

## Current completion view

| Class         | Current state                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Completed** | Monorepo architecture; NestJS/PostgreSQL direction; Flutter framework decision; shared contracts; backend auth/session foundation; server capability checks; branch context; audit/outbox foundations; broad backend module foundations; TypeScript tests/build/typecheck; Flutter analyzer; two deprecated Flutter API fixes already removed analyzer errors. |
| **Partial**   | Customer app; Vendor ops; Worker ops; CRM leads/quotes; ERP event/vendor/worker/inventory/finance/operations; payment recording; notification intent; CI; documentation.                                                                                                                                                                                       |
| **Broken**    | Root format gate; root lint gate; 20 Flutter Home widget tests; production Android release signing; production OTP delivery; invalid image assets; CI branch/API-port drift.                                                                                                                                                                                   |
| **Missing**   | Separate Employee Mobile app; generic employee work management; production file storage; real quotation PDF; payment gateway/webhooks; notification delivery; full vendor/worker products; procurement; employee hierarchy/targets/campaigns; database integration and E2E suites; production hosting/CD/store pipelines.                                      |
| **Blocking**  | Docker is unavailable for database proof; business/provider choices for OTP, payments, files, hosting and social channels are open; employee role/work-item architecture needs an ADR.                                                                                                                                                                         |
| **Next**      | Make all existing gates green before adding modules.                                                                                                                                                                                                                                                                                                           |

## Recommended product shape

```text
                         MEE EVENTS
                              │
                     NestJS Backend API
                              │
                       PostgreSQL
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
 Customer / Vendor /     Employee Mobile       Employee Web
 Worker Flutter App       Flutter App           CRM + ERP
```

One backend and one database remain authoritative. The two mobile applications are separate store products because they serve different audiences and release concerns; they do not duplicate business logic or data.

---

# 2. Current Architecture

## Actual repository layout

| Location                             | Technology     | Actual responsibility                                                        | Status                                                   |
| ------------------------------------ | -------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `apps/mobile`                        | Flutter        | One application: Customer plus Vendor/Worker operations through `AppGateway` | **PARTIAL**                                              |
| `apps/backend`                       | NestJS         | Versioned API, identity, authorization and business modules                  | **IMPLEMENTED — UNVERIFIED** against real Postgres       |
| `apps/erp-web`                       | Next.js        | One employee web portal containing CRM and ERP routes                        | **PARTIAL**                                              |
| `packages/api-contracts`             | TypeScript/Zod | Shared wire schemas, statuses and request/response contracts                 | **DONE** foundation                                      |
| `packages/shared-types`              | TypeScript     | Shared platform roles/session types                                          | **DONE** foundation                                      |
| `infrastructure/postgres/migrations` | SQL            | Ordered PostgreSQL source-of-truth schema                                    | **IMPLEMENTED — UNVERIFIED** in this audit               |
| `infrastructure/docker-compose.yml`  | Docker Compose | Local PostgreSQL and Redis only                                              | **BLOCKED** locally because Docker daemon is unavailable |
| `.github/workflows/ci.yml`           | GitHub Actions | TypeScript and Flutter checks, debug APK only                                | **PARTIAL / MISCONFIGURED**                              |

## Actual request/data path

```text
Flutter or Next.js
      │ HTTPS /api/v1
      ▼
NestJS global JWT session guard
      │ active role + assignment + branch context
      ▼
Capability guard + domain state validation
      │
      ▼
PostgreSQL transaction
      ├── business record
      ├── timeline/activity companion write where implemented
      ├── append-only audit event
      └── outbox event
```

The accepted architecture says all controlled writes go through NestJS. A direct Supabase client remains initialized and bundled in the Flutter app, creating architecture and secret-surface risk even if its current data path is mostly dormant.

## Current client surfaces

The backend and shared contract expose only `customer_mobile`, `vendor_mobile`, `worker_mobile`, and `employee_web`. Employee, support, finance, manager, administrator and auditor roles currently resolve to `employee_web`. There is no `employee_mobile` client surface.

---

# 3. Current Repository Audit

## Repository facts at audit time

| Measure                         | Finding                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| Git branch                      | `master`, two commits ahead of `origin/master`                              |
| Working tree                    | 145 modified/added tracked files, 26 tracked deletions, 102 untracked files |
| Flutter applications            | 1 (`apps/mobile`)                                                           |
| Dart files under mobile `lib`   | 172                                                                         |
| Mobile test files               | 26                                                                          |
| Backend source TypeScript files | 129                                                                         |
| Backend spec files              | 30                                                                          |
| ERP `page.tsx` files            | 44                                                                          |
| Built ERP routes                | 37                                                                          |
| SQL migrations                  | 20 (`0001`–`0020`)                                                          |
| PostgreSQL tables declared      | 114                                                                         |
| Routed backend feature modules  | 17                                                                          |
| Controller handlers counted     | about 223                                                                   |

## Mobile audit

- Package: `mee_events`, version `1.0.0+1`.
- Customer navigation is currently **Home, Explore, Plan, Enquiries, Account**. The approved target in this roadmap is **Home, Explore, Enquire, Plan, Profile**. This is Open Decision OD-01 because routes, tests and mental models must be migrated intentionally.
- Customer has Home, Explore, Plan, enquiry/checkout/detail/success, quotation, event workspace, account/profile, favorites, search and catalogue screens. Home/Explore still contain sample/fallback content and placeholder actions.
- Vendor has a live operations dashboard, assignments and progress. It is not yet the full vendor product.
- Worker has a dashboard and task detail/progress/attendance foundations. It is not yet the full worker product.
- Manager, operations, inventory and finance-oriented Flutter screens are present but not reachable from the production gateway for employee roles. Treat as reuse candidates after architecture review, not a second app.
- Placeholder gaps found: quotation PDF unavailable, booking confirmation PDF unavailable, feedback “coming soon”, notification action disabled, map/location placeholder and incomplete subcategory navigation.
- Flutter `.env` is bundled as an asset; Supabase is initialized directly and `SupabaseService` reads `event_services`. This conflicts with the backend-only data boundary.

## Backend audit

Feature areas are identity, platform, catalogue, search, enquiries, CRM, quotations, payments, bookings, Event Records, manager operations, vendors, workers, inventory, finance and operations, plus health and audit support.

Security foundations found:

- OTP request/verify flow with 300-second TTL, 60-second resend cooldown, five verification attempts and five requests per hour;
- 15-minute JWT access token and rotating opaque refresh token;
- 30-day revocable device session and refresh-reuse revocation;
- active-role and active-assignment checks;
- server capability guard and branch/resource context;
- production refuses local OTP;
- request identifiers, audit trail and sensitive-log redaction.

Production gaps found:

- the external OTP provider path returns a 503 placeholder and its endpoint/key are not in validated environment schema;
- `idempotency_records` exists, but no application use or `Idempotency-Key` handling was found;
- quotation documents store a `pdf_placeholder`; there is no real protected PDF pipeline;
- file/photo APIs largely store a client-supplied storage key; object storage, upload validation and signed access are missing;
- payment is an operator-confirmed reference flow, not a real gateway/webhook/reconciliation implementation;
- notifications are mostly outbox intent with `pushIntegrated: false`; only narrow processors exist;
- Redis is provisioned locally but not used by backend code;
- no generic employee work-item/assignment model, employee hierarchy, department, target or campaign model was found.

## CRM/ERP web audit

Live routes exist for leads, quotations, bookings, Event Records, manager tasks, vendors, workers, inventory, warehouse, operations and finance. `employee-api.ts` provides a broad live API client. Login uses OTP, access token and refresh handling.

Important limits:

- the root dashboard uses illustrative metrics and reports the central backend as not connected, even though feature pages use live APIs;
- route protection is mainly client-side session checks; no global Next middleware/server authorization layer was found;
- CRM lacks a complete My Work, normalized follow-up queue, Customer 360, pipeline management, team workload, targets and reports product;
- ERP lacks complete procurement, administration, approval inbox and reporting products;
- `dummy-leads.ts` appears to be a legacy/sample candidate and must be proven unreachable before deletion;
- only two ERP Vitest specs exist; there is no browser E2E suite.

## Database audit

The 114 tables cover identity/session/roles, branch, catalogue, enquiries/leads, quotations/payments/bookings, Event Records, manager tasks, vendors, workers, inventory/warehouse, operations, finance, timelines, activities, audit and outbox.

Not found as complete product domains: vendor applications and full listing/version/pricing workflow, worker applications/availability workflow, generic employee/work items/hierarchy, procurement purchase orders/goods receipts, in-app notification centre, customer reviews, campaigns/targets, and complete admin/reporting models.

## Quality-gate evidence on 18 August 2026

| Gate                   | Result                | Evidence                                                                        |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------- |
| TypeScript formatting  | **BROKEN**            | 280 findings; raw Stitch exports include invalid/gzipped `.js` files            |
| TypeScript lint        | **BROKEN**            | one Next.js `<img>` warning, with zero warnings allowed                         |
| TypeScript typecheck   | **PASS**              | workspace packages pass sequential typecheck                                    |
| TypeScript tests       | **PASS**              | backend 30 files/173 tests; ERP 2 files/2 tests                                 |
| TypeScript build       | **PASS WITH WARNING** | packages/backend/ERP build; Next produces 37 routes and the image warning       |
| Flutter analyze        | **PASS**              | zero issues with `--fatal-infos`; the two deprecated API errors have been fixed |
| Flutter tests          | **BROKEN**            | 415 passed, 20 failed, all in `home_tab_test.dart`                              |
| PostgreSQL integration | **BLOCKED / MISSING** | Docker daemon unavailable; CI has no database service                           |
| Browser/device E2E     | **MISSING**           | no Playwright, Cypress, Detox or equivalent suite                               |

## Duplicate, unwanted and cleanup audit

### Proven regenerable cleanup candidates

| Path/group                    | Approximate size | Action                                                          |
| ----------------------------- | ---------------: | --------------------------------------------------------------- |
| `apps/mobile/build`           |         4.05 GiB | Safe to regenerate; delete only in a dedicated reviewed cleanup |
| `apps/mobile/.dart_tool`      |         1.09 GiB | Safe to regenerate                                              |
| root `node_modules`           |          560 MiB | Safe to reinstall                                               |
| root `.pnpm-store`            |          510 MiB | Safe to recreate                                                |
| `apps/erp-web/.next`          |          124 MiB | Safe to rebuild                                                 |
| `apps/mobile/android/.gradle` |           14 MiB | Safe to regenerate                                              |
| `apps/backend/dist`           |            3 MiB | Safe to rebuild                                                 |

Together these consume about 6.3 GiB. They are not duplicate applications.

### Proven junk or broken assets

- `.DS_Store` files in repository folders;
- local debug logs such as `.cursor/debug*.log`, `design/pw-out.log`, and `apps/mobile/flutter_web.log`;
- 24 image files that are only 29-byte HTML 404 responses, including `home/banners/concert.jpg` and multiple engagement/mehndi/pre-wedding/sangeet/wedding subcategory assets;
- 19 exact duplicate asset hash groups across mobile assets and design exports;
- literal duplicate `erp_warehouse.read` in the manager capability list;
- documentation drift: old test counts, “current phase engineering documentation”, outdated customer navigation, CI branch/port mismatch and a broken production-document ADR link.

### Review before any deletion

- `design/stitch-screens` contains raw/debug exports and gzipped data misnamed as JavaScript. Exclude or archive it; do not format it as source and do not bulk-delete without confirming design value.
- `artifacts` contains evidence and media/licensing material. Move to an agreed archive outside Git if desired; do not destroy it.
- unreachable/sample code such as `dummy-leads.ts` and stranded manager/operations Flutter screens must be dependency-searched and reviewed before removal or extraction.

No product source or user evidence was deleted during this audit.

---

# 4. Completed Work

The following is complete at foundation level and supported by current source/test evidence:

1. Monorepo separation of mobile, backend, employee web, contracts, shared types and migrations.
2. Accepted Flutter + NestJS + Next.js + PostgreSQL architecture.
3. Shared platform role set and server capability map.
4. OTP challenge, token/session rotation/revocation and production-local-OTP rejection.
5. Backend request validation, authenticated principal, active-role/branch context and capability guard.
6. Enquiry creation and CRM lead creation in one transaction.
7. Quotation/advance/booking/Event Record foundation workflow.
8. Backend foundations for manager, vendor, worker, inventory, operations and finance.
9. Append-only audit and outbox patterns across many controlled mutations.
10. Ordered migrations through `0020` and a 114-table connected schema foundation.
11. TypeScript typecheck, backend/ERP unit tests and production builds pass.
12. Flutter analyzer is green; the two deprecated Flutter API errors are fixed.

“Completed foundation” does not mean store-ready or production-proven. Database integration, E2E and live providers remain required.

---

# 5. Partial Work

| Area            | What exists                                                                                     | What remains                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Customer        | Broad screen set and connected enquiry/quote/payment/event path                                 | Correct navigation, live Home/Explore data, robust states, PDF, real payment, feedback and full tests       |
| Vendor          | Ops dashboard, assignment response/progress, backend registry/assignment/settlement foundations | Application/KYC, catalogue/listings/pricing/availability, earnings/profile/reviews and complete UX          |
| Worker          | Dashboard, task detail, response/progress/attendance, backend registry/task/payout foundations  | Application/approval, skills/availability/profile/earnings/incidents/proof and complete UX                  |
| CRM             | Lead list/detail, claim, requirements, quotations and conversion APIs                           | My Work, follow-up queue, Customer 360, pipeline, team, targets, reports and activity product               |
| ERP             | Event, manager, vendor, worker, inventory, warehouse, operations and finance routes/APIs        | Procurement, approvals, admin, reports, real overview and full workflow verification                        |
| Notifications   | Outbox topics and limited processors                                                            | Provider delivery, retries/dead-letter, preferences, inbox, push token lifecycle and escalation rules       |
| Files/documents | Storage-key fields and PDF placeholders                                                         | Secure object storage, upload/download validation, signed URLs, malware/content controls and PDF generation |
| CI/CD           | Formatting/lint/type/test/build jobs and debug Flutter APK                                      | Correct branch/port, database integration, release builds, signing, staging deploy, CD and rollback         |

---

# 6. Broken / Risky Work

1. **Quality gate red:** root format/lint and 20 Flutter Home tests fail.
2. **Android release signing:** release currently uses debug signing; production release must be blocked.
3. **iOS release not established:** bundle/provisioning/team, flavors and TestFlight pipeline are unverified.
4. **CI drift:** workflow runs pushes to `main` while active branch is `master`; Flutter points to API port 3000 while the backend uses 3002.
5. **Direct Supabase client in Flutter:** violates backend-only data boundary and bundles `.env`.
6. **Invalid image assets:** 24 files are HTML 404 payloads, not images.
7. **Production OTP missing:** the external path intentionally fails.
8. **Financial flow is not gateway-backed:** manual references can be useful for a controlled pilot but cannot be described as automated payment confirmation.
9. **No real PDF/file security:** placeholders and client-provided keys cannot protect quotations, KYC or evidence.
10. **No database integration/E2E proof:** passing unit tests use fakes and do not prove migrations or user journeys.
11. **Sample dashboards/data can mislead:** customer catalogue fallbacks and ERP overview are not authoritative.
12. **Dirty worktree:** hundreds of changes make cleanup/refactoring risky until changes are grouped and protected.

---

# 7. Pending Work

The main pending products are:

- complete Customer modules with the final navigation;
- complete Vendor and Worker onboarding/self-service products;
- employee work management and follow-up model;
- separate Employee Mobile application built role by role;
- full CRM workflow and management visibility;
- procurement, approvals, administration and reports;
- production OTP, files/PDF, payment and notification integrations;
- real database/API/E2E/security/performance/recovery tests;
- staging/production infrastructure, monitoring, backup proof and release automation;
- both Flutter applications signed and released through Google Play and Apple App Store.

---

# 8. Blocking Issues

| Blocker                                    | Blocks                                                            | Resolution                                                          |
| ------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Docker daemon unavailable                  | Real migration, repository and smoke proof                        | Start Docker; run clean DB migration plus connected smokes          |
| Red quality gates                          | Safe feature development and CI confidence                        | Complete STAB-01                                                    |
| Employee role/work-item model not approved | Employee Mobile, My Work, SLA/escalation and management reporting | Decide OD-03/OD-04 and write ADR/migration plan                     |
| OTP provider not selected/wired            | Production authentication                                         | Select provider, data handling and failover; implement/test         |
| Payment mode/provider undecided            | Automated confirmation/refunds/reconciliation                     | Approve pilot versus gateway strategy                               |
| Object storage/provider undecided          | PDF, KYC, proof and private documents                             | Approve storage, keys, access and retention                         |
| Social lead channels/consent undecided     | CRM social integrations                                           | Choose channels/providers and lawful consent/retention model        |
| Hosting/monitoring ownership undecided     | Staging and production                                            | Approve platform, budget, regions, backup and incident owner        |
| App identities/signing accounts incomplete | Store releases                                                    | Confirm final bundle IDs, organization accounts and signing custody |

---

# 9. Product Architecture

## Target applications

| Product                       | Target implementation                        | Rule                                                                |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| Customer/Vendor/Worker Mobile | Continue `apps/mobile` Flutter               | One public multi-role app; role/capability-driven experience        |
| Employee Mobile               | New `apps/employee-mobile` Flutter after ADR | Mobile-first work execution; not a miniature ERP; same backend/data |
| Employee Web                  | Continue `apps/erp-web` Next.js              | CRM and ERP in one secure portal                                    |
| Backend                       | Continue `apps/backend` NestJS               | Only business/API layer; no second backend                          |
| Database                      | Continue PostgreSQL migrations               | One source of truth; no per-app databases                           |

## Data consistency rule

Interfaces show projections of the same identifiers and records. They do not copy Customer, Enquiry, Lead, Quotation, Booking, Event Record, Vendor, Worker, Task or Finance records to create convenience silos. Changes travel through versioned NestJS commands and authoritative PostgreSQL transactions.

## Hyderabad pilot versus production versus future

| Scope                          | Required                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Controlled Hyderabad pilot** | One branch; production-grade identity provider; live catalogue/enquiry/CRM/quote/manual-or-gateway payment decision; Event Record; assignments; minimal operations/finance; audit; staging; support and rollback runbook |
| **Full production**            | Complete role products, automated integrations, secure documents, monitoring/alerts, backup/restore drill, DB/E2E/security/load evidence, signed store releases, privacy/support processes                               |
| **Future expansion**           | Additional branches/cities, advanced analytics, AI, marketplace ranking and multi-tenant/SaaS options only after the core is stable                                                                                      |

---

# 10. Customer Module Map

The final navigation is **Home → Explore → Enquire → Plan → Profile**. “Enquire” is the transaction/work-history centre; “Plan” is the preparation/basket experience.

### C-01 — Customer Home

| Field                 | Detail                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Give a customer a trustworthy starting point and resume active work.                                               |
| Screens               | Home feed, occasion rail, services, upcoming-event/resume card, final action panel.                                |
| Actions               | Browse, search, open occasion/service, resume enquiry/event, start planning.                                       |
| Data / database       | Catalogue occasions/services/media; customer enquiries/bookings/events. Tables exist.                              |
| API                   | Catalogue/search and own enquiry/booking/event APIs exist; current UI still uses sample/fallback paths.            |
| Permissions           | Public catalogue read where allowed; customer can read only own business records.                                  |
| Status / dependencies | **BROKEN / PARTIAL** — UI exists; 20 Home widget tests fail. Depends on STAB-01 and live catalogue mapping.        |
| Testing               | Analyzer passes; Home tests fail across ordering, limits, scrolling, text scale and fallback icons.                |
| Definition of Done    | Live data, loading/empty/error/offline states, no invalid assets/overflow, all Home tests and one device E2E pass. |

### C-02 — Customer Explore

| Field                 | Detail                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Let customers discover event types and services without exposing vendor base prices.                              |
| Screens               | Explore, search, category/subcategory, service detail, favorites.                                                 |
| Actions               | Search/filter, view approved content, favorite, add to Plan/Enquire.                                              |
| Data / database       | Managed catalogue hierarchy, media and customer-safe pricing/content. Catalogue tables exist.                     |
| API                   | Catalogue/search endpoints exist; customer-safe response review and pagination need E2E proof.                    |
| Permissions           | Public/customer reads; internal vendor price and notes must never be returned.                                    |
| Status / dependencies | **PARTIAL** — broad screens exist, but sample/fallback data, invalid images and one navigation TODO remain.       |
| Testing               | Unit/widget coverage is incomplete; no API/database/E2E catalogue proof.                                          |
| Definition of Done    | All approved catalogue data is live, customer-safe, searchable and resilient; accessibility, paging and E2E pass. |

### C-03 — Customer Enquire

| Field                 | Detail                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | First-class place to submit and track enquiries, quotations and booking conversion.                                                                 |
| Screens               | Enquiry inbox/history, composer/checkout, success, detail, quotation detail, payment submission.                                                    |
| Actions               | Create/submit, view status, approve/reject/request quote revision, submit advance reference.                                                        |
| Data / database       | `enquiries`, enquiry items/services, `crm_leads`, `quotations`, `payments`, `bookings`, activities/timelines.                                       |
| API                   | Enquiry create/read, quotation own actions, payment submit/read and booking read exist.                                                             |
| Permissions           | `enquiry.*_own`, `quotation.*_own`, `payment.*_own`, `booking.read_own`; backend ownership checks required.                                         |
| Status / dependencies | **PARTIAL** — connected foundation exists; navigation is in the wrong order/name and payment/PDF are placeholders.                                  |
| Testing               | Backend unit workflow exists; real Postgres, API and mobile E2E are missing.                                                                        |
| Definition of Done    | Final nav and history work; duplicate submission is idempotent; real quote document/payment strategy is implemented; ownership denial and E2E pass. |

### C-04 — Customer Plan

| Field                 | Detail                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Help a customer assemble event requirements before creating an enquiry.                                                    |
| Screens               | Plan basket, event details, selected services, budget/preferences and review.                                              |
| Actions               | Add/remove/edit items, save draft, continue to Enquire.                                                                    |
| Data / database       | Local plan state plus enquiry snapshot on submit; no disconnected permanent plan database should be invented without need. |
| API                   | Uses catalogue reads and enquiry command when submitted; draft-sync behavior is an open product choice.                    |
| Permissions           | Customer-only draft/own data; server validates submitted catalogue identifiers and limits.                                 |
| Status / dependencies | **PARTIAL** — screens exist; target nav moves Plan after Enquire. Depends on OD-01 and C-02/C-03 contracts.                |
| Testing               | Cache migration tests pass; complete persistence/recovery/E2E missing.                                                     |
| Definition of Done    | Draft survives intended lifecycle, validates all inputs, submits exactly once and transitions clearly into C-03.           |

### C-05 — Customer Profile

| Field                 | Detail                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Manage the customer account, sessions, preferences and support access.                                         |
| Screens               | Profile/account, role switch where eligible, favorites, session/logout, help/privacy.                          |
| Actions               | View/update permitted profile fields, manage session, switch approved role, logout, request support.           |
| Data / database       | `app_users`, role assignments, device sessions and customer profile/preferences where implemented.             |
| API                   | Identity/bootstrap/session APIs exist; full profile/preferences/privacy endpoints are incomplete.              |
| Permissions           | Own account only; role switching only to an active verified assignment.                                        |
| Status / dependencies | **PARTIAL** — current tab is “Account”; notifications/support/profile completeness is limited.                 |
| Testing               | Auth unit tests exist; device/session/profile E2E and privacy tests missing.                                   |
| Definition of Done    | Renamed Profile, secure own-data edits, session/device controls, role rules, help/privacy and logout E2E pass. |

---

# 11. Vendor Module Map

### V-01 — Vendor Home

| Field                 | Detail                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Give approved vendor owners/members today’s assignments and urgent actions.                                       |
| Screens               | Dashboard, status cards, upcoming work and alerts.                                                                |
| Actions               | View assigned work, respond, open progress, see payment summary where permitted.                                  |
| Data / database       | Vendor profile, role link, assignments, events, progress and settlement summaries. Existing foundation tables.    |
| API                   | Vendor own dashboard/assignment APIs exist.                                                                       |
| Permissions           | Vendor owner/member own or assigned records only.                                                                 |
| Status / dependencies | **PARTIAL** — live operations dashboard exists; onboarding/availability/notification dependencies are incomplete. |
| Testing               | Focused API/widget/E2E coverage incomplete.                                                                       |
| Definition of Done    | Approved vendor sees only own live work, safe empty/error states, due alerts and device E2E.                      |

### V-02 — Vendor Work Orders

| Field                 | Detail                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Receive, accept/reject and execute event service assignments.                                                                       |
| Screens               | Work-order list/detail, response, progress, evidence, delivery/completion.                                                          |
| Actions               | Accept/reject, update status, add note/proof, mark completion subject to verification.                                              |
| Data / database       | `vendor_assignments`, event/vendor notes, progress, evidence/storage, Event Record.                                                 |
| API                   | Assignment list/detail/update/reject/progress endpoints exist; secure binary evidence pipeline is missing.                          |
| Permissions           | `vendor_work_order.*_assigned`, `vendor_evidence.submit_assigned`, operations assigned capabilities.                                |
| Status / dependencies | **PARTIAL** — assignment/progress works at foundation level; complete work-order contract and dispute/acceptance target missing.    |
| Testing               | Unit foundations exist; real DB, evidence security and E2E missing.                                                                 |
| Definition of Done    | State machine approved, concurrent updates safe, proof protected, customer/internal fields filtered, full happy/unhappy E2E passes. |

### V-03 — Vendor Catalogue

| Field                 | Detail                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Let verified vendors maintain offerings and submit internal prices for Mee Events review.                                                    |
| Screens               | Listings, listing editor, variants/media, price proposal, availability, review status.                                                       |
| Actions               | Create draft, edit, submit for review, respond to revision, manage availability.                                                             |
| Data / database       | Vendor/category foundation exists; full applications/listings/versions/variants/price-review entities are incomplete or missing.             |
| API                   | Profile/category/assignment APIs exist; complete vendor listing/review APIs are **MISSING**.                                                 |
| Permissions           | Vendor manages own drafts/base price; Mee Events approves customer price/visibility.                                                         |
| Status / dependencies | **MISSING / PARTIAL backend foundation**. Depends on managed-marketplace ADR, files and approval workflow.                                   |
| Testing               | Missing module-level test suite.                                                                                                             |
| Definition of Done    | Application/KYC approval, versioned listing, protected base price, review/audit, availability and customer-safe publication work end to end. |

### V-04 — Vendor Earnings

| Field                 | Detail                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Show vendor bills, settlements and payment status without exposing unauthorized finance data.                            |
| Screens               | Earnings summary, work-order amount, invoice submission, settlement detail/history.                                      |
| Actions               | View own amounts, submit invoice/document, track settlement/dispute where approved.                                      |
| Data / database       | Vendor bills/settlements, finance summary, payments and private documents. Foundation exists.                            |
| API                   | Vendor payment read capability and finance settlement APIs exist; vendor self-service UX/API proof incomplete.           |
| Permissions           | Vendor own financial records only; finance/manager approval remains server-controlled.                                   |
| Status / dependencies | **PARTIAL**. Depends on files, approval/reconciliation and approved settlement target states.                            |
| Testing               | Ownership/field-filter/integration/E2E missing.                                                                          |
| Definition of Done    | Amounts reconcile to Event Record, documents are protected, state/audit is complete and vendor cannot see other vendors. |

### V-05 — Vendor Profile

| Field                 | Detail                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Vendor application, identity, KYC, categories, availability, team and quality profile.                                            |
| Screens               | Application, KYC, business profile, documents, categories, availability, members, reviews/quality, session.                       |
| Actions               | Apply, upload, edit permitted fields, manage team/availability, view verification.                                                |
| Data / database       | Vendor/profile/category/bank foundation exists; application/KYC workflow and reviews are incomplete.                              |
| API                   | Vendor create/update/own APIs exist for employees/vendor; application and secure document endpoints missing.                      |
| Permissions           | Own profile edits; verification/suspension and visibility only by authorized employees.                                           |
| Status / dependencies | **PARTIAL**. Depends on storage, review workflow, consent/retention and role-assignment issuance.                                 |
| Testing               | KYC privacy, authorization, file and E2E tests missing.                                                                           |
| Definition of Done    | Application-to-approved-role flow is auditable, KYC protected, field-level permissions enforced and review/appeal rules approved. |

---

# 12. Worker Module Map

### W-01 — Worker Home

| Field                 | Detail                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Show an approved worker today’s tasks, attendance state and urgent actions.                                |
| Screens               | Dashboard, today/upcoming work, check-in prompt and alerts.                                                |
| Actions               | Open task, accept/reject, check in/out, update progress.                                                   |
| Data / database       | Worker, tasks/assignments, attendance, events and payout summary. Existing foundations.                    |
| API                   | Worker own dashboard/task/attendance operations exist.                                                     |
| Permissions           | Worker own/assigned records only.                                                                          |
| Status / dependencies | **PARTIAL** — dashboard/task UX exists; full availability, earnings and alerts absent.                     |
| Testing               | Unit/widget/E2E incomplete.                                                                                |
| Definition of Done    | Worker sees only current authorized work, clear shift state and offline/error handling; device E2E passes. |

### W-02 — Worker Tasks

| Field                 | Detail                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Execute assigned event duties with traceable status, notes, evidence and incidents.                          |
| Screens               | Task list/detail, response, progress, proof, issue/blocker and completion.                                   |
| Actions               | Accept/reject, travel/check-in/start/update/complete, add proof/issue.                                       |
| Data / database       | `worker_tasks`, assignments, operations tasks, issues/photos, Event Record, timelines.                       |
| API                   | Worker task response/progress and operations issue/photo foundations exist; secure evidence is missing.      |
| Permissions           | Assigned worker only; manager verifies/changes controlled states.                                            |
| Status / dependencies | **PARTIAL** — task detail and progress exist; proof/incidents and normalized target states need design.      |
| Testing               | State/authorization/integration/device E2E missing.                                                          |
| Definition of Done    | Approved state machine, offline retry/idempotency, protected evidence, manager visibility and full E2E pass. |

### W-03 — Worker Attendance

| Field                 | Detail                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Record event work attendance separately from task outcome or performance.                                       |
| Screens               | Attendance status, check-in/out, history, exception/correction request.                                         |
| Actions               | Check in/out, attach permitted location/proof, request correction.                                              |
| Data / database       | Worker attendance logs and operations attendance; GPS fields are currently placeholders.                        |
| API                   | Check-in/out foundations exist. Location policy and correction approval APIs are incomplete.                    |
| Permissions           | Worker own attendance; authorized operations/manager corrections with reason/audit.                             |
| Status / dependencies | **PARTIAL / RISKY** — privacy, consent, accuracy, offline and anti-abuse rules are not complete.                |
| Testing               | Time-zone, replay, location privacy, correction and E2E tests missing.                                          |
| Definition of Done    | Approved privacy policy, server timestamps, idempotent check-in/out, audited corrections and device tests pass. |

### W-04 — Worker Earnings

| Field                 | Detail                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Show assigned-work payout inputs and payout status.                                                    |
| Screens               | Earnings summary, task/event breakdown, payout detail/history.                                         |
| Actions               | View own earnings/payouts and raise a supported discrepancy.                                           |
| Data / database       | Worker payouts and finance summaries exist.                                                            |
| API                   | Worker payment-read capability and finance payout APIs exist; self-service contract/UX incomplete.     |
| Permissions           | Own payout data only; approval/payment only finance capabilities.                                      |
| Status / dependencies | **PARTIAL**. Depends on payout calculation policy, approval and reconciliation.                        |
| Testing               | Calculation, privacy, integration and E2E missing.                                                     |
| Definition of Done    | Approved calculation source, reconciliation, audited adjustments and strict own-record filtering pass. |

### W-05 — Worker Profile

| Field                 | Detail                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Worker application, approval, skills, availability, emergency/payment profile and account.                                 |
| Screens               | Application, identity/documents, skills, availability, bank/UPI masked fields, profile/session.                            |
| Actions               | Apply, update permitted fields, upload documents, set availability, view approval.                                         |
| Data / database       | Worker/skills/bank foundation exists; application/availability workflow and protected documents incomplete.                |
| API                   | Worker create/update/own APIs exist; self-application/review/storage gaps remain.                                          |
| Permissions           | Own permitted fields; approval/suspension only authorized employee; sensitive fields masked.                               |
| Status / dependencies | **PARTIAL**. Depends on identity proof, storage, review, retention and role-assignment rules.                              |
| Testing               | Privacy/authorization/file/E2E missing.                                                                                    |
| Definition of Done    | Application-to-active-role is secure/auditable, documents protected, skills/availability usable and sensitive data masked. |

---

# 13. Employee Mobile Module Map

**Current fact:** no `apps/employee-mobile` Flutter package, no `employee_mobile` bootstrap surface and no store/release shell exist. All EM modules are **PLANNED — NOT IMPLEMENTED**. Existing manager/operations Flutter screens may be extracted only after dependency and security review.

### EM-01 — Home / My Work

| Field                 | Detail                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Mobile-first start for authorized employees: today, due, overdue, events, approvals and alerts.                           |
| Screens               | Role-aware home, My Work, due/overdue sections, quick actions.                                                            |
| Actions               | Open assigned record/task, prioritize today, acknowledge work.                                                            |
| Data / database       | Existing leads/events/tasks plus proposed common work projection; generic work model not yet approved.                    |
| API                   | Existing CRM/manager/operations reads can seed projections; a safe employee-mobile bootstrap/My Work endpoint is missing. |
| Permissions           | Capability + branch + assignment/team scope; never “all employees see all.”                                               |
| Status / dependencies | **BLOCKED / MISSING** — OD-02, OD-03 and OD-04.                                                                           |
| Testing               | None.                                                                                                                     |
| Definition of Done    | Sales-person slice shows only authorized, real, ordered work and updates from web/mobile remain consistent.               |

### EM-02 — Tasks / Assignments

| Field                 | Detail                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Execute assigned work away from a desktop.                                                                           |
| Screens               | Task queue/detail, accept/start/update/block/complete, notes/evidence/history.                                       |
| Actions               | Acknowledge, start, record activity/outcome/next action, block/escalate, complete.                                   |
| Data / database       | Existing event/operations tasks; proposed work item if approved; activity, evidence, outbox/audit.                   |
| API                   | Event/operations task APIs exist; generic employee work and escalation APIs missing.                                 |
| Permissions           | Assignee edits own execution fields; assign/verify/override only named capabilities.                                 |
| Status / dependencies | **MISSING**; depends on common work-state decision and secure files/notifications.                                   |
| Testing               | None.                                                                                                                |
| Definition of Done    | One role’s task lifecycle works mobile ↔ API ↔ DB ↔ manager web with audit, offline/idempotency and denial tests. |

### EM-03 — Leads / Customers

| Field                 | Detail                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Give permitted sales/CRM staff assigned lead and customer context.                                        |
| Screens               | My Leads, lead detail, customer summary, enquiry/quote status and activity.                               |
| Actions               | Claim/update within capability, record contact, view requirements and quotation state.                    |
| Data / database       | CRM leads, enquiries, users/customer profile, lead activities and quotations.                             |
| API                   | CRM lead list/detail/claim/update exists; assignment-scoped mobile projection/customer 360 is incomplete. |
| Permissions           | Existing `crm_lead.*`, `crm_customer.read`; assignment/team scope must be enforced.                       |
| Status / dependencies | **MISSING UI / PARTIAL API**. Sales-person is the first recommended employee-mobile role.                 |
| Testing               | Backend unit foundations exist; mobile/API/E2E and data-minimization tests missing.                       |
| Definition of Done    | Assigned salesperson can safely complete lead-detail work without seeing unauthorized customer records.   |

### EM-04 — Follow-up / Communication

| Field                 | Detail                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Record calls/outcomes and always create the next action when required.                                                 |
| Screens               | Due queue, lead communication sheet, outcome, schedule next action, overdue queue.                                     |
| Actions               | Start/log call, choose outcome, add note, set next due action, complete/escalate.                                      |
| Data / database       | `lead_activities` partially represents calls/follow-up; no normalized work lifecycle or provider messaging record.     |
| API                   | Lead requirements/activity behaviors exist; dedicated due queue/outcome/next-action APIs are missing.                  |
| Permissions           | Assigned sales/telecaller plus manager team scope; call/contact data is private.                                       |
| Status / dependencies | **MISSING / BLOCKED** by OD-04 and communication/consent choices.                                                      |
| Testing               | None for full lifecycle.                                                                                               |
| Definition of Done    | Due/overdue is server-derived, every activity is attributable, next action is consistent and manager sees SLA outcome. |

### EM-05 — Approvals

| Field                 | Detail                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Allow only authorized managers/finance staff to make small mobile-safe decisions.                         |
| Screens               | Pending approvals, detail/evidence, approve/reject reason and history.                                    |
| Actions               | Review, approve/reject with reason, request more information.                                             |
| Data / database       | Existing finance/manager actions and audit; no unified approval inbox model found.                        |
| API                   | Some approval capabilities/endpoints exist; common approval projection is missing.                        |
| Permissions           | Exact capability plus scope and valid state; high-risk/bulk reconciliation remains web-only.              |
| Status / dependencies | **MISSING / PARTIAL backend**. Depends on approved approval types and secure documents.                   |
| Testing               | Authorization/state/concurrency/E2E missing.                                                              |
| Definition of Done    | Approved types only, complete context, reason/audit, double-action protection and web/mobile consistency. |

### EM-06 — Notifications

| Field                 | Detail                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Deliver assignment, due, overdue, escalation, approval and business-change alerts.                                      |
| Screens               | Inbox, detail/deep link, preferences and read state.                                                                    |
| Actions               | Open, mark read, follow deep link, manage allowed preferences.                                                          |
| Data / database       | Outbox events exist; notification inbox/device-token/preference model is incomplete.                                    |
| API                   | No complete mobile notification delivery/inbox contract.                                                                |
| Permissions           | Only recipient’s notifications; payload must minimize sensitive data.                                                   |
| Status / dependencies | **MISSING**; depends on provider, token lifecycle, retries and escalation policy.                                       |
| Testing               | None for delivery.                                                                                                      |
| Definition of Done    | Reliable provider delivery, deduplication, deep links, read state, retry/dead-letter monitoring and privacy tests pass. |

### EM-07 — Team / Manager View

| Field                 | Detail                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Give authorized managers workload, overdue, exceptions and outcomes—not employee surveillance.                   |
| Screens               | Team work, overdue/escalations, event health and selected metrics.                                               |
| Actions               | Filter team, reassign where permitted, review/verify, intervene/escalate.                                        |
| Data / database       | Tasks/leads/events plus proposed hierarchy/team scope and work outcomes. Hierarchy is missing.                   |
| API                   | Manager dashboards/tasks exist for events; company/team work projection is missing.                              |
| Permissions           | `manager_*`, assignment/report capabilities plus approved team scope; finance hidden unless authorized.          |
| Status / dependencies | **MISSING / BLOCKED** by employee hierarchy and work-item decisions.                                             |
| Testing               | None for complete team scoping.                                                                                  |
| Definition of Done    | Manager sees only authorized team, workload and SLA/outcome signals are auditable, and access-denial tests pass. |

### EM-08 — Employee Profile

| Field                 | Detail                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Show employee identity, active role/capabilities, account/session and support.                                                       |
| Screens               | Profile, role/scope, devices/sessions, settings, help/privacy/logout.                                                                |
| Actions               | View permitted data, switch assigned role, revoke/logout and contact support.                                                        |
| Data / database       | App users, role assignments and device sessions exist; employee profile/hierarchy model missing.                                     |
| API                   | Identity/bootstrap/session exists; employee-specific profile and device management incomplete.                                       |
| Permissions           | Own profile/session; role assignment only administrator.                                                                             |
| Status / dependencies | **MISSING UI / PARTIAL identity API**.                                                                                               |
| Testing               | Auth foundation tests exist; employee device/app E2E missing.                                                                        |
| Definition of Done    | Only active employees enter, role/scope is server-derived, revoked sessions stop immediately and store privacy requirements are met. |

---

# 14. CRM Module Map

### CRM-01 — Lead / Enquiry Inbox

| Field                 | Detail                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Receive customer enquiries as leads and control ownership/SLA.                                          |
| Screens               | Lead list, filters, lead detail and claim/assignment controls.                                          |
| Actions               | View, claim, assign where permitted, update status/requirements.                                        |
| Data / database       | `enquiries`, CRM leads, activities, users and branch.                                                   |
| API                   | Lead list/detail/claim/update foundation exists.                                                        |
| Permissions           | `crm_lead.read/update`; assignment only `crm_lead.assign`; record/team scope needs stronger proof.      |
| Status / dependencies | **PARTIAL** — live pages exist; queue assignment, SLA and E2E completeness missing.                     |
| Testing               | Backend unit specs pass; ERP component/E2E and real DB missing.                                         |
| Definition of Done    | No lead is lost/duplicated, ownership is scoped/audited, SLA clock is visible and API+browser E2E pass. |

### CRM-02 — My Work

| Field                 | Detail                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Purpose / users       | Give each employee one prioritized queue across leads/follow-ups/tasks.                               |
| Screens               | Today, due, overdue, upcoming and completed.                                                          |
| Actions               | Open, acknowledge/start, record outcome/next action and complete.                                     |
| Data / database       | Existing lead activities/event tasks are fragmented; generic work model missing.                      |
| API                   | No unified My Work API found.                                                                         |
| Permissions           | Own assignments; managers use explicit team scope.                                                    |
| Status / dependencies | **MISSING / BLOCKED** by OD-04.                                                                       |
| Testing               | None.                                                                                                 |
| Definition of Done    | One authoritative work queue drives web and employee mobile, with due/SLA/escalation and audit proof. |

### CRM-03 — Follow-up

| Field                 | Detail                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Schedule, execute and measure lead/customer follow-up.                                                       |
| Screens               | Due queue, activity composer, outcomes, next action and overdue view.                                        |
| Actions               | Log call/message/note, set result, schedule next action, escalate.                                           |
| Data / database       | Lead activities and first-response fields partially exist; normalized lifecycle missing.                     |
| API                   | Lead activity/requirements foundation only; due/outcome/escalation contract missing.                         |
| Permissions           | Assigned staff and scoped manager; private communications protected.                                         |
| Status / dependencies | **PARTIAL data / MISSING product**. Depends on OD-04 and channel/consent policy.                             |
| Testing               | Full workflow missing.                                                                                       |
| Definition of Done    | Server-derived due/overdue, immutable activity history, valid next action and SLA reporting work end to end. |

### CRM-04 — Customer 360

| Field                 | Detail                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Authorized staff see one customer relationship across enquiries, quotes, bookings, events and activity.   |
| Screens               | Customer summary, contact, timeline, enquiries, quotes, bookings/events and notes.                        |
| Actions               | View linked history, add scoped note, open related work.                                                  |
| Data / database       | Relationships exist across users/enquiries/leads/quotes/bookings/events; a unified projection is missing. |
| API                   | Individual APIs exist; customer-360 aggregation/filtering endpoint missing.                               |
| Permissions           | `crm_customer.read` plus branch/record scope and field minimization.                                      |
| Status / dependencies | **MISSING UI/API projection**.                                                                            |
| Testing               | Privacy/aggregation/browser E2E missing.                                                                  |
| Definition of Done    | One linked identity, no copied records, strict field filtering and complete timeline reconciliation pass. |

### CRM-05 — Pipeline

| Field                 | Detail                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Manage lead progression and exceptions through approved states.                                               |
| Screens               | Kanban/list, filters, ageing and stage detail.                                                                |
| Actions               | Move only through valid transitions, assign, filter and inspect ageing.                                       |
| Data / database       | Lead statuses exist; target names differ and transition policy needs approval.                                |
| API                   | Lead updates exist; explicit transition policy/metrics incomplete.                                            |
| Permissions           | Update assigned/scoped leads; assignment/override only manager capability.                                    |
| Status / dependencies | **PARTIAL**. Depends on approved lead state machine.                                                          |
| Testing               | Transition, concurrency and browser E2E missing.                                                              |
| Definition of Done    | Approved transitions enforced server-side; ageing/SLA correct; lost reason and conversion link are auditable. |

### CRM-06 — Quotations

| Field                 | Detail                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Prepare, review, send, revise and convert controlled quotations.                                          |
| Screens               | Quote list/detail/editor, version/revision, approval/send and customer status.                            |
| Actions               | Draft/edit/send/revise; customer approve/reject/revision; employee conversion.                            |
| Data / database       | Quotations/items/documents/activities and links to lead/enquiry/payment.                                  |
| API                   | Broad quotation APIs exist. Real internal approval, PDF and secure delivery are incomplete.               |
| Permissions           | CRM quotation read/manage; customer own actions; approval boundaries need final policy.                   |
| Status / dependencies | **PARTIAL / PLACEHOLDER PDF**.                                                                            |
| Testing               | Backend workflow passes with fakes; PDF/storage/DB/browser/mobile E2E missing.                            |
| Definition of Done    | Versioned amounts, approved state machine, protected PDF, customer action, audit and conversion E2E pass. |

### CRM-07 — Team Management

| Field                 | Detail                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Purpose / users       | Managers assign work and balance team workload.                                                      |
| Screens               | Team roster, workload, unassigned/overdue and reassignment history.                                  |
| Actions               | Assign/reassign within scope, inspect capacity and escalations.                                      |
| Data / database       | Roles exist; employee hierarchy/team/department model missing.                                       |
| API                   | Lead assign capability exists; team/workload APIs missing.                                           |
| Permissions           | Manager scoped team only; administrator manages role assignments.                                    |
| Status / dependencies | **MISSING / BLOCKED** by OD-03/OD-04.                                                                |
| Testing               | None.                                                                                                |
| Definition of Done    | Approved hierarchy and capacity rules, no cross-team leakage, every assignment/reassignment audited. |

### CRM-08 — Targets & Performance

| Field                 | Detail                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Compare approved targets with real activity and business outcomes.                                                                        |
| Screens               | Personal/team targets, response SLA, conversion/outcome and trends.                                                                       |
| Actions               | View; authorized managers configure approved target periods.                                                                              |
| Data / database       | Targets/departments/campaigns not found; events/leads can supply outcomes later.                                                          |
| API                   | Missing.                                                                                                                                  |
| Permissions           | Self/team/company views by explicit reporting capabilities.                                                                               |
| Status / dependencies | **MISSING / DEFERRED** until work and CRM data are reliable.                                                                              |
| Testing               | None.                                                                                                                                     |
| Definition of Done    | Metric definitions approved, calculations reproducible, attendance/login not confused with outcome, access and reconciliation tests pass. |

### CRM-09 — Reports

| Field                 | Detail                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Report lead sources, SLA, pipeline, conversion and sales outcomes.                                     |
| Screens               | Standard report catalogue, filters, drill-down and controlled export.                                  |
| Actions               | View/filter/export only as authorized.                                                                 |
| Data / database       | Transactional data exists; report projections/definitions incomplete.                                  |
| API                   | General CRM reporting endpoints not found.                                                             |
| Permissions           | Explicit report capability and row/field scope; export is audited.                                     |
| Status / dependencies | **MISSING / DEFERRED**.                                                                                |
| Testing               | Reconciliation, authorization, performance and export tests missing.                                   |
| Definition of Done    | Approved metric dictionary, totals reconcile to source records and safe export/performance tests pass. |

### CRM-10 — Activity / Audit

| Field                 | Detail                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Separate business activity (“work performed”) from audit (“record changed”).                                       |
| Screens               | Record activity timeline and restricted audit inspection.                                                          |
| Actions               | Record permitted activity; view scoped history; auditors view immutable change evidence.                           |
| Data / database       | Lead/module activities, timelines, append-only `audit_events` and outbox exist.                                    |
| API                   | Narrow activity/audit foundations exist; unified presentation/filtering incomplete.                                |
| Permissions           | Activity by actor/record scope; `audit.read` only auditor/administrator capability.                                |
| Status / dependencies | **PARTIAL**. Depends on work model and retention/redaction policy.                                                 |
| Testing               | Append-only unit probes exist; DB immutability/authorization/browser tests missing.                                |
| Definition of Done    | Activity and audit semantics are distinct, immutable where required, searchable, retained and strictly authorized. |

---

# 15. ERP Module Map

### ERP-01 — Event Control

| Field                 | Detail                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Central Event Record after booking, linking planning, fulfilment and finance.                                        |
| Screens               | Event list/detail, status, program/notes/timeline/documents and linked modules.                                      |
| Actions               | View/update permitted fields, change valid state, add notes/milestones.                                              |
| Data / database       | `event_records` and related timelines/notes plus booking/assignments/inventory/finance.                              |
| API                   | Broad Event Record APIs exist.                                                                                       |
| Permissions           | `erp_event.read/manage`, own customer tracking projection; state and field checks server-side.                       |
| Status / dependencies | **PARTIAL / IMPLEMENTED — UNVERIFIED**. Depends on real DB/E2E and target state approval.                            |
| Testing               | Backend unit foundations pass; DB/browser cross-module E2E missing.                                                  |
| Definition of Done    | Booking handoff is idempotent, linked modules reconcile, transitions/audit enforce policy and full event E2E passes. |

### ERP-02 — Manager Operations

| Field                 | Detail                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Assign event managers, plan work and record progress.                                                                |
| Screens               | Manager dashboard, event assignment, task list/detail and progress.                                                  |
| Actions               | Assign/reassign manager, create/assign/update/complete task, add progress.                                           |
| Data / database       | Manager assignments, `event_tasks`, comments/progress/timelines.                                                     |
| API                   | Broad manager operations endpoints exist.                                                                            |
| Permissions           | `manager_event/task/progress/dashboard` capabilities plus scope.                                                     |
| Status / dependencies | **PARTIAL** — web routes and APIs exist; generic employee work/team hierarchy/mobile execution absent.               |
| Testing               | Unit foundations pass; real DB/team scope/browser/mobile E2E missing.                                                |
| Definition of Done    | Assignment/task/progress lifecycle is approved, scoped, audited and visible consistently on web and employee mobile. |

### ERP-03 — Vendor Operations

| Field                 | Detail                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Register/verify vendors and assign fulfilment to Event Records.                                                      |
| Screens               | Vendor registry/detail/create, event assignment, assignment detail and progress.                                     |
| Actions               | Create/update/verify, assign, monitor response/progress and close.                                                   |
| Data / database       | Vendors/categories/bank, assignments, notes/progress and settlements.                                                |
| API                   | Broad vendor management endpoints exist.                                                                             |
| Permissions           | `erp_vendor`/`crm_vendor` manage/read; vendor sees only own/assigned.                                                |
| Status / dependencies | **PARTIAL** — operational registry/assignment foundation exists; application/listing/pricing/quality incomplete.     |
| Testing               | Unit foundation; DB/E2E/field-filter and full vendor workflow missing.                                               |
| Definition of Done    | Application-to-settlement lifecycle, internal price protection, assignment state, quality and audit pass end to end. |

### ERP-04 — Worker Operations

| Field                 | Detail                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Register/approve workers and manage event duties/attendance.                                             |
| Screens               | Worker registry/detail/create, task/attendance and assignment monitoring.                                |
| Actions               | Create/update/approve, assign task, monitor attendance/progress and payout input.                        |
| Data / database       | Workers/skills/tasks/attendance/notes and payouts.                                                       |
| API                   | Broad worker management endpoints exist.                                                                 |
| Permissions           | `erp_worker`/`crm_worker` manage/read; worker only own assigned data.                                    |
| Status / dependencies | **PARTIAL** — registry/tasks/attendance foundation; application/availability/quality/privacy incomplete. |
| Testing               | Unit foundation; DB/E2E/privacy/location missing.                                                        |
| Definition of Done    | Application-to-payout lifecycle, consent, assignment, attendance correction and strict data scope pass.  |

### ERP-05 — Inventory

| Field                 | Detail                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Track items, stock, custody, allocation, movement, return, damage and maintenance.                               |
| Screens               | Inventory list/detail, warehouse, stock, allocations, movements, returns/damage/maintenance.                     |
| Actions               | Create/update item, move/allocate/return, report damage and maintain.                                            |
| Data / database       | Extensive inventory/warehouse tables exist.                                                                      |
| API                   | About 27 inventory and related warehouse handlers exist.                                                         |
| Permissions           | Inventory/warehouse read/manage/allocate capabilities and branch scope.                                          |
| Status / dependencies | **PARTIAL / IMPLEMENTED — UNVERIFIED**; UI routes exist but transaction/E2E/custody proof incomplete.            |
| Testing               | Unit foundations; real DB concurrency/reconciliation/browser E2E missing.                                        |
| Definition of Done    | Stock cannot go inconsistent, custody chain and audit reconcile, concurrent allocation tests and event E2E pass. |

### ERP-06 — Procurement

| Field                 | Detail                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Purpose / users       | Purchase required goods/services when inventory or fulfilment is insufficient.                    |
| Screens               | Requisitions, approvals, suppliers, purchase orders, goods receipt and invoice matching.          |
| Actions               | Request, approve, order, receive, match and close/dispute.                                        |
| Data / database       | Inventory suppliers exist; purchase-order/line/goods-receipt product tables were not found.       |
| API                   | **MISSING** as a complete procurement domain.                                                     |
| Permissions           | Requester, approver, purchaser, receiver and finance duties must be separated.                    |
| Status / dependencies | **MISSING / DEFERRED** until inventory and approval rules are stable.                             |
| Testing               | None.                                                                                             |
| Definition of Done    | Approved segregation of duties, three-way reconciliation as required, audit and real DB/E2E pass. |

### ERP-07 — Finance

| Field                 | Detail                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Track customer payments/refunds, expenses, invoices/receipts and vendor/worker settlements.                                     |
| Screens               | Finance dashboard, event finance, payments, refunds, expenses, invoices, receipts, settlements and ledger.                      |
| Actions               | Record/approve/reconcile permitted transactions and issue documents.                                                            |
| Data / database       | Broad finance tables and summaries exist.                                                                                       |
| API                   | About 26 finance handlers exist; real gateway/bank reconciliation and document pipeline absent.                                 |
| Permissions           | Finance capabilities; approvals/reports separated; sensitive fields filtered.                                                   |
| Status / dependencies | **PARTIAL / HIGH RISK** — foundation exists but money/document/reconciliation production proof missing.                         |
| Testing               | Unit foundations; decimal/reconciliation/concurrency/security/E2E missing.                                                      |
| Definition of Done    | Approved accounting rules, immutable audit, double-entry/reconciliation decision, gateway/manual controls and finance E2E pass. |

### ERP-08 — Approvals

| Field                 | Detail                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Centralize controlled business decisions with reason, evidence and segregation.                                                         |
| Screens               | Approval inbox, detail/evidence, decision/history and escalation.                                                                       |
| Actions               | Submit, approve/reject/request information, delegate only by policy.                                                                    |
| Data / database       | Some module-specific approvals/capabilities exist; unified approval model/inbox not found.                                              |
| API                   | Partial module actions; complete approval contract missing.                                                                             |
| Permissions           | Exact approval capability, scope, state and self-approval restrictions.                                                                 |
| Status / dependencies | **MISSING / PARTIAL**. Depends on approval catalogue and document security.                                                             |
| Testing               | Authorization, segregation, concurrency and E2E missing.                                                                                |
| Definition of Done    | Every controlled decision has policy, eligible approver, evidence/reason, immutable audit and no double/self approval where prohibited. |

### ERP-09 — Administration

| Field                 | Detail                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Purpose / users       | Manage users, roles, branch, catalogue/policy, feature flags and compliance.                                 |
| Screens               | Users/roles, assignments, branch/settings, catalogue review, providers, audit and feature controls.          |
| Actions               | Grant/revoke scoped roles, configure approved policy and review audit.                                       |
| Data / database       | Users/roles/branch/catalogue/audit foundations exist; complete admin product absent.                         |
| API                   | Identity/platform/catalogue review foundations; admin orchestration incomplete.                              |
| Permissions           | Administrator capabilities; auditor read only; high-risk changes require stronger controls.                  |
| Status / dependencies | **PARTIAL backend / MISSING product**.                                                                       |
| Testing               | Privilege-escalation, audit, recovery and browser E2E missing.                                               |
| Definition of Done    | Least privilege, protected high-risk actions, complete audit, safe defaults and admin recovery runbook pass. |

### ERP-10 — Reports

| Field                 | Detail                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Purpose / users       | Operational and financial management reporting with traceable definitions.                                           |
| Screens               | Event/vendor/worker/inventory/finance/department reports and controlled exports.                                     |
| Actions               | View/filter/drill/export according to capability.                                                                    |
| Data / database       | Source transactions exist; approved reporting projections and metric dictionary incomplete.                          |
| API                   | Some dashboards/summaries exist; full reporting APIs missing.                                                        |
| Permissions           | `report.operational.read` or `report.financial.read`; row/field scope and export audit.                              |
| Status / dependencies | **MISSING / PARTIAL summaries / DEFERRED**.                                                                          |
| Testing               | Reconciliation, authorization, export and performance tests missing.                                                 |
| Definition of Done    | Metrics reconcile to source, definitions/version are documented, access safe and production-size performance tested. |

---

## How to use this roadmap

Read **Sections 1–8** to understand where the project is now. Work only on the item named in **Section 29 — Exact Next Task**. When its exit gate is green, update the Master TODO and move to the next item in **Section 26 — Recommended Build Order**. Never mark a screen or API as done without UI → API → database → authorization → test evidence.

### Status words used in this document

| Status                       | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| **DONE**                     | Implemented and verified by current evidence                              |
| **IMPLEMENTED — UNVERIFIED** | Code exists, but real database/device/end-to-end proof is incomplete      |
| **PARTIAL**                  | Useful pieces exist; the whole module is not complete                     |
| **PLACEHOLDER**              | Temporary or deliberately non-production behavior                         |
| **BROKEN**                   | Implemented behavior currently fails a required check                     |
| **BLOCKED**                  | Work cannot be completed until a named dependency or decision is resolved |
| **MISSING**                  | No implementation found                                                   |
| **DEFERRED**                 | Intentionally scheduled later                                             |

---

# 16. Employee Role Matrix

## Actual platform roles and surfaces

This table uses the repository’s current capability map. “Scoped” means the backend must also verify branch, assignment/team and record access. Sales Person, Telecaller, Marketing and General Manager are **not current platform roles**; they must not be invented in UI only.

| Role            | Application     | Module                                       | View         | Create                    | Edit                | Assign                | Approve                                    | Report                                       | Mobile                  | Web                     |
| --------------- | --------------- | -------------------------------------------- | ------------ | ------------------------- | ------------------- | --------------------- | ------------------------------------------ | -------------------------------------------- | ----------------------- | ----------------------- |
| `customer`      | CVW Mobile      | Own enquiry/quote/booking/payment/event      | Own          | Enquiry/change            | Own allowed actions | No                    | Own quote decision                         | No                                           | Yes                     | No current customer web |
| `vendor_owner`  | CVW Mobile      | Own vendor/work orders/operations            | Own/assigned | Proposal/evidence/invoice | Own/assigned        | No                    | Accept/reject assigned                     | Own payment read                             | Yes                     | No current vendor web   |
| `vendor_member` | CVW Mobile      | Assigned work/own vendor                     | Own/assigned | Evidence/issues           | Own/assigned        | No                    | Accept/reject assigned                     | No                                           | Yes                     | No current vendor web   |
| `worker`        | CVW Mobile      | Own assignment/attendance/operations         | Own/assigned | Attendance/issues/photos  | Own duty            | No                    | Respond to own assignment                  | Own payment read                             | Yes                     | No current worker web   |
| `employee`      | Employee system | CRM + broad ERP execution                    | Yes, broad   | Many module records       | Many module records | Task/ops paths        | Payment operation exists                   | Dashboards, not explicit report capabilities | **Planned**             | Yes                     |
| `support`       | Employee system | CRM/customer/vendor/ops read/support update  | Scoped       | Limited                   | Lead update         | No explicit assign    | No                                         | No explicit report                           | **Planned if approved** | Yes                     |
| `finance`       | Employee system | Payments/finance/settlement/financial report | Scoped       | Finance records           | Finance records     | No general assignment | Payment/refund/approval decisions          | Financial                                    | **Planned if approved** | Yes                     |
| `manager`       | Employee system | CRM/ERP/manager/operations                   | Scoped       | Broad operations          | Broad operations    | Lead/task/operations  | Reads approval; finance boundaries limited | Operational                                  | **Planned**             | Yes                     |
| `administrator` | Employee system | All capability IDs                           | Yes          | Yes                       | Yes                 | Yes                   | Yes                                        | Yes                                          | **Decision required**   | Yes                     |
| `auditor`       | Employee system | Read CRM/ERP/audit/catalog review            | Read only    | No                        | No                  | No                    | No                                         | Operational + financial read                 | Usually no              | Yes                     |

## Current employee capability groups

| Role            | Actual notable capabilities                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `employee`      | CRM lead/customer/quotation/booking/payment/vendor/worker/operations; Event Records; manager tasks; vendor/worker; inventory/warehouse; finance; operations. This is currently too broad for specialized employee personas. |
| `support`       | CRM lead read/update, customer/vendor/operations read, event/manager/operations dashboards read.                                                                                                                            |
| `finance`       | Customer/vendor/payment/event/vendor/worker reads; finance manage/settlement/dashboard; payment/refund approvals; approval decisions; financial reports.                                                                    |
| `manager`       | CRM lead update/assign; quotation/booking/payment; event/manager task; vendor/worker/inventory/warehouse; selected finance; operational reporting and operations management.                                                |
| `administrator` | Every declared capability.                                                                                                                                                                                                  |
| `auditor`       | Read-only CRM/ERP/approval/report/audit/catalog review capabilities.                                                                                                                                                        |

## Target persona mapping — open until approved

| Business persona        | Recommended mapping method                           | Current truth                                   |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Sales Person            | Narrow capability bundle + own assignment/team scope | Not an explicit role today                      |
| Telecaller              | Narrow lead/follow-up bundle + queue assignment      | Not an explicit role today                      |
| Sales Manager           | Manager capability bundle + sales team scope         | Not an explicit role today                      |
| Marketing staff/manager | Campaign/source/task bundles after domain exists     | Campaign domain not present                     |
| Field/Event Manager     | Manager/operations bundle + assigned events          | Existing manager/ops capabilities can be reused |
| General Manager         | Approved cross-department reporting/exception bundle | Not an explicit role today                      |

Do not solve this by giving every employee the current broad `employee` role. Approve a capability-and-scope matrix, migrate safely, and test denial paths.

---

# 17. Employee Work Management

## Current finding

No single generic company-wide Work Item model was found. Three related mechanisms exist:

1. `lead_activities` and lead first-response timestamps for CRM contact work;
2. `event_tasks` for manager/event planning;
3. operations tasks and task assignments for event execution.

They are real and useful, but they do not answer the complete cross-company questions: who assigned the work, due/overdue, outcome, next action, escalation, manager/team visibility and department performance.

## Recommended decision process

Do not immediately create another `tasks` table. Write an ADR that compares:

- extending/generalizing one existing task aggregate;
- adding a generic `work_items` + `work_item_activities`/escalations layer that links to existing domain records;
- keeping domain tasks and building a unified read model/projection with a small orchestration record.

The recommendation is a generic work orchestration layer only if the ADR proves it prevents, rather than creates, duplication. Domain facts such as lead status and event task status must remain owned by their modules.

## Minimum conceptual fields

| Group          | Fields                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Identity       | Work ID, work type, branch/department, related record type/ID          |
| Responsibility | Assigned employee, assigned by, team/manager scope                     |
| Timing         | Created, due, started, completed and SLA timestamps                    |
| State          | Priority, status, blocked/escalation state                             |
| Result         | Outcome, next action, notes and approved evidence links                |
| Trace          | Activity history, version, audit actor/request and outbox notification |

## Required workflow

```text
Assignment
   ↓
Employee sees authorized work on Web/Mobile
   ↓
Employee acknowledges/starts
   ↓
Activity + outcome are recorded
   ↓
Next action is created when required
   ↓
Work completes or becomes blocked
   ↓
Manager sees status and outcome
   ↓
Server-derived overdue escalation runs
```

## Rules

- Login is not work. Attendance is not task completion. Activity is not automatically a good outcome.
- Due/overdue must be calculated by the backend, not trusted from the phone clock.
- Every reassignment, override, approval and escalation needs reason and audit evidence.
- A notification informs; it never becomes the source of truth.
- Mobile and web update the same versioned work/business records.

---

# 18. Manager Monitoring / Performance

## Signals that managers need

| Signal      | Question answered                                        | Source                                    |
| ----------- | -------------------------------------------------------- | ----------------------------------------- |
| Assignment  | What was assigned, to whom and by whom?                  | Work/assignment record + audit            |
| Activity    | What contact/update/work occurred?                       | Domain activity, not login logs           |
| Timeliness  | Was work started/completed by due time?                  | Server timestamps/SLA calendar            |
| Outcome     | What business result occurred?                           | Approved outcome on work/domain record    |
| SLA         | Was first response/next action achieved?                 | Lead/work SLA rules                       |
| Escalation  | What is overdue/blocked and who was alerted?             | Escalation record + outbox delivery       |
| Performance | Did work produce expected quality/conversion/completion? | Approved metric dictionary; never guessed |

## Manager views

1. My events/work requiring attention.
2. Team workload: unassigned, due today, overdue and blocked.
3. Exceptions: SLA breach, rejected work, missing evidence and repeated failure.
4. Outcomes: conversion/completion/quality based on approved definitions.
5. Audit link: why a controlled record changed.

Do not build employee surveillance or infer performance from login time, phone location or raw activity count. Define fair metrics, privacy limits, retention and correction/appeal procedures first.

---

# 19. CRM ↔ ERP Data Flow

CRM and ERP are modules in the same employee web application and share the same backend/database. The handoff is a record transition, not a data copy.

| Stage           | CRM responsibility                          | ERP responsibility                          | Shared key/control                  |
| --------------- | ------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| Enquiry         | Receive customer intent and source          | Read only when operationally needed         | `enquiry_id`                        |
| Lead            | Ownership, follow-up, requirements          | No duplicate lead                           | `lead_id` linked to enquiry         |
| Quotation       | Price/version/customer decision             | Uses approved commercial contract           | `quotation_id`                      |
| Payment/Booking | Confirm approved payment policy and convert | Receives confirmed booking                  | `payment_id`, `booking_id`          |
| Event Record    | CRM shows linked conversion                 | ERP owns planning/execution aggregate       | `event_record_id` linked to booking |
| Fulfilment      | CRM sees customer-safe progress             | ERP assigns manager/vendor/worker/inventory | Event-linked assignment IDs         |
| Finance/Closure | CRM sees permitted customer/account state   | ERP settles and closes                      | Event/finance IDs + audit           |

Required proof: creating or updating a stage never creates a parallel disconnected customer, quote, booking or event record; retries are idempotent; authorization and optimistic version checks reject stale/unauthorized writes.

---

# 20. Customer → CRM → ERP → Vendor/Worker Business Flow

```text
Customer Mobile
  Customer builds Plan and submits Enquiry
        │
        ▼
NestJS transaction → Enquiry + CRM Lead
        │
        ▼
Employee Web / Employee Mobile (planned)
  Ownership → Follow-up → Requirements → Quotation
        │
        ▼
Customer Mobile
  Approve / Reject / Revision → Payment action
        │
        ▼
NestJS
  Confirm valid payment policy → Booking → Event Record
        │
        ▼
Employee Web ERP
  Manager planning → Vendor assignment → Worker assignment
  → Inventory / Procurement → Execution → Finance
        │                          │
        ▼                          ▼
Vendor/Worker Mobile          Customer tracking
  Assigned work/status          Safe progress only
        │
        ▼
ERP settlement → Closure → Customer feedback
```

| Stage                        | Primary interface                         | Current status           |
| ---------------------------- | ----------------------------------------- | ------------------------ |
| Plan/Enquiry                 | Customer Mobile                           | **PARTIAL**              |
| Lead ownership/requirements  | CRM Web                                   | **PARTIAL**              |
| Follow-up/My Work            | CRM Web + future Employee Mobile          | **MISSING/PARTIAL data** |
| Quote/customer decision      | CRM Web + Customer Mobile                 | **PARTIAL**              |
| Payment/booking              | Customer Mobile + CRM/Finance Web         | **PLACEHOLDER/PARTIAL**  |
| Event Record                 | ERP Web                                   | **PARTIAL**              |
| Manager planning             | ERP Web; future Employee Mobile execution | **PARTIAL**              |
| Vendor/worker assignments    | ERP Web + CVW Mobile                      | **PARTIAL**              |
| Inventory/operations/finance | ERP Web                                   | **PARTIAL foundations**  |
| Procurement                  | ERP Web                                   | **MISSING**              |
| Closure/feedback             | ERP + Customer Mobile                     | **PARTIAL/MISSING**      |

---

# 21. Status Machines

The left column is code truth. The right column is product intent from the requested roadmap. Do not rename or migrate states without an approved transition/migration plan.

| Domain             | Current implementation                                                                                                                                                                                                                  | Target state / gap                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enquiry            | `draft → submitted → received → contact_pending → in_discussion → proposal_expected → closed/cancelled`                                                                                                                                 | Confirm ownership of transitions and mapping to first-class Enquire UI.                                                                                                                                          |
| Lead               | `new → claimed → contacted → qualified → quoted → converted/lost/closed`                                                                                                                                                                | Intended wording says Quotation and Won/Lost. Recommend keep stable codes, define display labels, allowed transitions and lost/closed reasons.                                                                   |
| Quotation          | `draft → sent → revision_requested → approved/rejected/expired/superseded`                                                                                                                                                              | Target adds Internal Approval and Revised. Decide approval policy and version transition.                                                                                                                        |
| Payment            | `pending → paid/failed/refunded`                                                                                                                                                                                                        | Target says Created/Pending/Confirmed/Failed/Expired/Refunded. Decide gateway/manual semantics; do not equate operator entry with settled money.                                                                 |
| Booking            | `confirmed/cancelled`                                                                                                                                                                                                                   | Target says Pending Confirmation/Confirmed/In Planning/In Progress/Completed/Cancelled. Recommend booking remain commercial contract and Event Record own operational states unless business approves expansion. |
| Event Record       | `created → planning → requirements_confirmed → quotation_approved → booking_confirmed → manager_assigned → vendor_assigned → worker_assigned → preparation → ready → event_running → completed → settlement_pending → closed/cancelled` | Strong current lifecycle; approve transition matrix, skip rules and compensations.                                                                                                                               |
| Event/manager task | `pending → planning → assigned → in_progress → completed/cancelled`                                                                                                                                                                     | Target says Assigned/Acknowledged/In Progress/Blocked/Completed/Verified. Decide common work model before change.                                                                                                |
| Vendor assignment  | `invited → assigned → accepted/rejected → planning → travelling → on_site → working → completed/cancelled`                                                                                                                              | Target work order adds Draft/Offered/Delivered/Accepted/Disputed. Reconcile commercial work-order acceptance and execution assignment.                                                                           |
| Worker task        | `assigned → accepted/rejected → travelling → checked_in → working → completed → checked_out/cancelled`                                                                                                                                  | Add blocked/verified only if operational policy requires them; preserve attendance distinction.                                                                                                                  |
| Operations task    | Event-task-like pending/planning/assigned/in-progress/completed/cancelled                                                                                                                                                               | Reconcile with Event Task/common Work Item to prevent duplicate semantics.                                                                                                                                       |
| Finance settlement | `open → partially_settled → settled → closed`                                                                                                                                                                                           | Target calculated/reviewed/approved/paid/reconciled/disputed needs explicit accounting/approval policy.                                                                                                          |
| Vendor settlement  | `pending → partially_paid → paid/cancelled`                                                                                                                                                                                             | Add reviewed/approved/reconciled/disputed only after finance design.                                                                                                                                             |
| Worker payout      | `pending → approved → paid/cancelled`                                                                                                                                                                                                   | Add calculation/reconciliation/dispute policy if required.                                                                                                                                                       |

For each transition implement: allowed actor/capability, record scope, precondition, concurrency/version check, side effects, audit/outbox, idempotency and tests.

---

# 22. Permissions / Security

## What is strong today

- E.164 OTP challenge with hashed/keyed verification material, expiry, resend/attempt/rate limits.
- Short access tokens, rotating opaque refresh tokens, device sessions and revocation/reuse response.
- Global authenticated principal, active role/assignment and branch context.
- Server capability guard and module-level domain checks.
- Append-only audit pattern, request ID and log redaction.
- Production refuses local OTP and validated secrets are expected.

## What must be fixed before production

| Risk                     | Required action                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OTP provider placeholder | Implement approved provider, webhook/delivery handling, abuse monitoring, tests and recovery.                                                                                    |
| Broad `employee` role    | Approve narrower capability bundles and assignment/team/record scopes.                                                                                                           |
| Direct mobile Supabase   | Remove direct DB dependency/asset secrets after usage proof; backend only.                                                                                                       |
| Client-side web gate     | Threat-model routes; ensure every API is authoritative, then add robust portal session/route protections.                                                                        |
| Idempotency unused       | Apply keys/replay behavior to enquiry, payment, booking, assignments and other critical creates.                                                                                 |
| File/storage placeholder | Private buckets/objects, server-issued upload/download, type/size/content checks, signed expiry, retention and audit.                                                            |
| Payment placeholder      | Provider signatures/webhooks, amount/order matching, replay protection, reconciliation/refund controls—or explicitly controlled pilot manual process.                            |
| Notifications            | Minimize payload, secure device tokens, retry/dead-letter, unsubscribe/preferences and audit delivery.                                                                           |
| Rate limits in memory    | Decide shared Redis-backed enforcement before multiple backend replicas.                                                                                                         |
| Sensitive data           | Define field-level responses, encryption/provider controls, masking, retention, export and deletion/legal policy for customer, employee, vendor, finance, KYC and location data. |

## Four checks for every protected action

1. Who is the authenticated user and active session?
2. Does the active role have the exact capability?
3. Does the user have branch/team/assignment/record access?
4. Is the action valid in the current record state and version?

Hidden buttons are usability only; the NestJS command must enforce all four checks.

---

# 23. Testing Strategy

## Current result by level

| Level                              | Required proof                                 | Current evidence                                                  | Status              |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- | ------------------- |
| 1. Format/lint/analyze             | Clean automated static gate                    | TypeScript format/lint fail; Flutter analyze passes               | **BROKEN**          |
| 2. Unit tests                      | Domain, auth, state and calculations           | Backend 173 tests and ERP 2 tests pass                            | **PARTIAL**         |
| 3. Widget/component                | UI states, accessibility and interactions      | Flutter has 435 total results: 415 pass, 20 fail; ERP almost none | **BROKEN/PARTIAL**  |
| 4. Repository/database integration | Ordered migrations and real SQL transactions   | None in CI; Docker unavailable during audit                       | **MISSING/BLOCKED** |
| 5. API integration                 | Real Nest server + Postgres, auth and rollback | Demo scripts exist; no automated CI integration                   | **MISSING**         |
| 6. End-to-end                      | Customer/employee/vendor/worker journeys       | No browser/device framework                                       | **MISSING**         |
| 7. Security/performance            | Abuse, authz, file/payment, load/concurrency   | Unit foundations only; no production-scale suites                 | **MISSING/PARTIAL** |
| 8. Operations/recovery             | Deploy, monitoring, backup restore, rollback   | Documentation exists; no live environment/drill                   | **MISSING**         |

## Minimum test pyramid for every module

1. Pure unit tests for rules and state transitions.
2. Repository integration against a clean migrated PostgreSQL database.
3. Authenticated API happy path plus denial, invalid state, duplicate/retry and stale version paths.
4. Widget/component loading, empty, populated, error, offline and accessibility states.
5. One end-to-end role journey across UI → API → DB.
6. Audit/outbox companion-write assertions for controlled mutations.

## Release gates

- Pull request: format, lint, typecheck/analyze, unit/widget, dependency/security checks.
- Merge/staging: clean migration, DB/API integration, browser/mobile smoke and artifact build.
- Release candidate: signed AAB/IPA, TestFlight/internal track, E2E, security/privacy review, monitoring and rollback.
- Production: approved change, backup/restore evidence, provider health and staged rollout.

---

# 24. App Store / Play Store Strategy

Store and privacy rules change. Verify the latest Google and Apple requirements during each release; this roadmap does not claim compliance.

## Customer/Vendor/Worker app

| Area                  | Current                                                 | Required                                                                                                                                      |
| --------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Android ID            | Production `com.meevent.app`; dev/staging flavors exist | Confirm permanent ID/ownership before publishing                                                                                              |
| Android signing       | Release uses debug signing                              | Secure Play App Signing/upload key; release must fail without proper signing                                                                  |
| Android artifact      | CI debug dev APK only                                   | Signed production AAB, internal/closed testing, staged rollout and rollback plan                                                              |
| iOS ID                | `com.meeevents.meeEvents` found                         | Confirm final bundle ID, organization team, capabilities and environment separation                                                           |
| iOS signing           | No production proof                                     | Certificates/profiles or managed signing, archive validation and TestFlight                                                                   |
| Version               | `1.0.0+1`                                               | Automated semantic/build numbering and release notes                                                                                          |
| API config            | CI points to port 3000                                  | HTTPS staging/production endpoints, certificate/network policy and no secret bundling                                                         |
| Observability         | None proven                                             | Privacy-approved crash reporting, logs/metrics and alert owner                                                                                |
| Push/deep links       | Not complete                                            | Provider setup, token/deep-link tests and safe payloads                                                                                       |
| Privacy/store content | Not verified                                            | Privacy policy, data safety/privacy nutrition answers, account/support/deletion processes, permissions justification and screenshots/metadata |

## Employee Mobile app

- Create a separate Flutter application only after OD-02 and shared-code boundaries are approved.
- Publish through Google Play and Apple App Store/TestFlight using organization-controlled accounts; APK may be used only for development/testing.
- Downloadability never grants employee access. OTP/session plus active employee role, capabilities, branch/team/record scope and revocation are mandatory.
- Prefer a role-by-role release: Sales Person → Telecaller → Manager → Field/Event Operations → selected roles.
- Keep detailed finance, bulk operations, configuration, reconciliation and large reports on employee web unless a specific mobile use case is approved.
- Use distinct app IDs, signing keys, push credentials, crash-reporting projects and store listings from the CVW app while sharing backend identity and business records.

## CRM/ERP web production

Required: secure HTTPS host, separate staging/production environment and database, secrets manager, migration job, health checks, logs/metrics/traces, alerting, backups and restore drill, CSP/security headers, release/rollback and support ownership. None is proven live today.

## Rollout sequence for both mobile apps

1. Developer signed debug builds.
2. Automated test artifacts.
3. Android internal track and iOS TestFlight internal group.
4. Controlled Hyderabad pilot group with monitored production backend.
5. Fixes and release-candidate sign-off.
6. Staged production rollout with crash/API/business monitoring.
7. Pause/rollback capability and documented incident response.

---

# 25. Master TODO

Priority: **P0** blocks safe work/release; **P1** required for Hyderabad pilot; **P2** required for full product; **P3** future enhancement. “Evidence” names what the audit actually found, not a claimed completion percentage.

| ID        | Application          | Interface      | Role                | Module         | Task                                                       | Pri | Status                       | Dependency                | Evidence                                                | Test status            | Blocker                   | Next action                                     | Definition of Done                                                |
| --------- | -------------------- | -------------- | ------------------- | -------------- | ---------------------------------------------------------- | --- | ---------------------------- | ------------------------- | ------------------------------------------------------- | ---------------------- | ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| STAB-01   | Shared               | Repo           | All                 | Quality        | Restore all current quality gates                          | P0  | **BROKEN**                   | None                      | Format 280, lint 1, Flutter tests 20 fail               | Red                    | Raw exports/test drift    | Fix scoped issues and exclusions                | Root verify + Flutter analyze/test green                          |
| STAB-02   | Shared               | Repo           | All                 | Safety         | Protect and classify dirty worktree                        | P0  | **PENDING**                  | STAB-01                   | 145 modified/add, 26 deleted, 102 untracked             | N/A                    | Mixed changes             | Group/review changes; no destructive reset      | Every change owned, backed up and reviewable                      |
| STAB-03   | Shared               | Files          | All                 | Cleanup        | Remove only proven caches/junk/broken assets               | P1  | **PENDING**                  | STAB-02                   | ~6.3 GiB regenerable; 24 invalid images; logs/.DS_Store | Rebuild required       | Review asset replacements | Execute approved cleanup manifest               | Rebuild/test passes; no needed evidence lost                      |
| STAB-04   | Shared               | Docs           | All                 | Documentation  | Correct counts, links, status and nav drift                | P1  | **PARTIAL**                  | STAB-01                   | Old test counts/nav/status; broken ADR link             | Link check missing     | None                      | Update canonical docs after decisions           | Docs match source and links validate                              |
| CI-01     | DevOps               | CI             | Developers          | CI             | Align branch and API port                                  | P0  | **BROKEN**                   | STAB-01                   | CI `main`; repo `master`; CI port 3000 vs backend 3002  | CI unverified          | Branch decision           | Correct trigger/config and prove run            | Push/PR execute intended jobs with correct endpoint               |
| CI-02     | DevOps               | CI             | Developers          | CI             | Add Postgres migration/integration job                     | P0  | **MISSING**                  | DB-01                     | No DB service in CI                                     | None                   | Integration harness       | Create isolated clean DB job                    | Migrations + repository/API integration pass in CI                |
| DB-01     | Database             | Postgres       | System              | Integration    | Prove clean migrations `0001`–`0020`                       | P0  | **BLOCKED**                  | Docker/service            | 20 migrations/114 tables                                | Not run                | Docker unavailable        | Start DB, migrate twice, inspect schema         | Clean apply, rerun behavior and rollback/recovery notes pass      |
| DB-02     | Database             | Postgres       | System              | Integrity      | Add critical idempotency use                               | P0  | **MISSING**                  | DB-01                     | Table exists; no app use                                | None                   | Key policy                | Design/apply to critical creates                | Replay returns same result; conflicts rejected; tests pass        |
| DB-03     | Database             | Postgres       | Auditor             | Audit          | Prove append-only audit/outbox in real DB                  | P1  | **IMPLEMENTED — UNVERIFIED** | DB-01                     | Tables/triggers/unit pattern probes                     | Fake-only              | DB integration            | Add real trigger/transaction tests              | Mutation rollback/append-only/outbox atomicity proven             |
| AUTH-01   | Backend              | API            | All                 | Identity       | Implement production SMS OTP provider                      | P0  | **PLACEHOLDER**              | Provider decision         | External path returns 503                               | Unit foundation only   | OD-06                     | Select/provider adapter/monitor/recovery        | Staging delivery, abuse/expiry/retry and failure tests pass       |
| AUTH-02   | Backend              | API            | All                 | Sessions       | Add distributed rate limit/abuse control                   | P1  | **PARTIAL**                  | Redis/hosting decision    | Limits exist; Redis unused                              | Unit only              | Deployment topology       | Implement shared counters if multi-replica      | Cross-replica abuse test and monitoring pass                      |
| AUTH-03   | Backend              | API/Web/Mobile | Employees           | Authorization  | Approve employee capability/scope matrix                   | P0  | **BLOCKED**                  | OD-03                     | Existing `employee` role broad                          | Guard unit tests       | Business approval         | Map personas to bundles/scopes                  | Least-privilege matrix approved and denial tests pass             |
| AUTH-04   | Mobile               | Flutter        | All                 | Data boundary  | Remove direct Supabase client data path                    | P0  | **RISKY**                    | Usage proof               | `.env` bundled; service queries DB                      | No architecture test   | OD-12                     | Trace usage, replace with Nest API              | No direct DB credentials/client; app functions/tests pass         |
| C-01-T1   | CVW Mobile           | Customer       | Customer            | Home           | Repair Home tests and live-data contract                   | P0  | **BROKEN**                   | STAB-01                   | 20 failed Home tests                                    | 415 pass/20 fail       | UI/test drift             | Fix behavior or approved test expectation       | All target widths/text scales/scroll/data tests green             |
| C-02-T1   | CVW Mobile           | Customer       | Customer            | Explore        | Replace samples and invalid assets with approved catalogue | P1  | **PARTIAL**                  | DB-01, files              | Screens + fallback data + 24 bad images                 | Incomplete             | Content/media review      | Connect approved API and resilient image states | Live customer-safe catalogue E2E passes                           |
| C-03-T1   | CVW Mobile           | Customer       | Customer            | Enquire        | Migrate final navigation/order and enquiry history         | P1  | **PARTIAL**                  | OD-01, STAB-01            | Current Home/Explore/Plan/Enquiries/Account             | Tests need update      | OD-01                     | Approve mapping and implement focused slice     | Home/Explore/Enquire/Plan/Profile and deep links pass             |
| C-03-T2   | Full stack           | Customer/CRM   | Customer/employee   | Enquire        | Prove enquiry → CRM lead real DB flow                      | P0  | **IMPLEMENTED — UNVERIFIED** | DB-01, CI-02              | Transaction code/demo scripts                           | Fake/unit only         | Docker                    | Automate API integration                        | One enquiry/lead, audit/outbox, retry and authz proven            |
| C-04-T1   | CVW Mobile           | Customer       | Customer            | Plan           | Finalize draft persistence and submit boundary             | P1  | **PARTIAL**                  | C-02/C-03                 | Plan/cache code exists                                  | Some cache tests pass  | Draft product rule        | Define local/server behavior                    | Recovery, validation and exactly-once submit tests pass           |
| C-05-T1   | CVW Mobile           | Customer       | Customer            | Profile        | Complete profile/session/privacy/support                   | P2  | **PARTIAL**                  | AUTH-01                   | Account shell exists                                    | E2E missing            | Profile schema/policy     | Specify permitted fields and device controls    | Own-data/session/logout/privacy E2E passes                        |
| CRM-01-T1 | CRM                  | Web            | Employee/manager    | Inbox          | Complete assignment/SLA inbox                              | P1  | **PARTIAL**                  | AUTH-03, DB-01            | Lead list/detail/claim exists                           | Unit only              | Team scope                | Add unassigned/assigned/SLA views               | Scoped claim/assign/SLA browser E2E passes                        |
| WORK-01   | Backend/DB           | API            | Employee/manager    | Work           | Decide common employee work model                          | P0  | **BLOCKED**                  | OD-04                     | Lead activities + two task systems                      | N/A                    | Architecture decision     | Write ADR and migration/API plan                | No duplicate authority; lifecycle/scope approved                  |
| CRM-02-T1 | CRM/Employee Mobile  | Web/Mobile     | Employee            | My Work        | Build authoritative My Work projection                     | P1  | **MISSING**                  | WORK-01                   | No unified queue                                        | None                   | WORK-01                   | Implement first for Sales Person                | Same scoped queue web/mobile; due/overdue tests pass              |
| CRM-03-T1 | CRM/Employee Mobile  | Web/Mobile     | Sales/telecaller    | Follow-up      | Build outcome/next-action/SLA lifecycle                    | P1  | **PARTIAL**                  | WORK-01, AUTH-03          | Lead activities partially cover calls/follow-up         | Incomplete             | Persona/channel policy    | Implement server lifecycle and UI               | Activity/outcome/next action/escalation E2E passes                |
| CRM-04-T1 | CRM                  | Web            | Employee            | Customer 360   | Build linked customer projection                           | P1  | **MISSING**                  | DB-01, AUTH-03            | Source records linked separately                        | None                   | Field policy              | Add filtered aggregate endpoint/view            | Reconciles IDs; privacy and browser tests pass                    |
| CRM-05-T1 | CRM                  | Web            | Employee/manager    | Pipeline       | Approve/enforce lead transitions                           | P1  | **PARTIAL**                  | Status decision           | Status codes exist                                      | Unit partial           | Business transitions      | Write matrix and command tests                  | Invalid transitions denied; reasons/conversion audited            |
| CRM-06-T1 | CRM                  | Web            | Employee/manager    | Quotation      | Add internal approval/version policy                       | P1  | **PARTIAL**                  | Approval decision         | Draft/sent/revision/customer states exist               | Unit foundation        | State policy              | Approve current-vs-target mapping               | Version/approval/send/customer actions tested                     |
| CRM-07-T1 | CRM                  | Web            | Manager             | Team           | Add hierarchy/team scope/workload                          | P2  | **MISSING**                  | AUTH-03, WORK-01          | No employee hierarchy tables                            | None                   | OD-03/04                  | Design org assignment model                     | Team visibility/reassignment/denial audited/tested                |
| CRM-08-T1 | CRM                  | Web            | Employee/manager    | Targets        | Define targets/metrics                                     | P3  | **DEFERRED**                 | Stable WORK/CRM           | No domain found                                         | None                   | Metric approval           | Create dictionary before schema                 | Reproducible approved metrics and access tests                    |
| CRM-09-T1 | CRM                  | Web            | Manager             | Reports        | Build reconciled standard reports                          | P2  | **MISSING**                  | Stable CRM                | No complete report APIs                                 | None                   | Metrics                   | Build after transaction truth                   | Reports reconcile and export/access/load tests pass               |
| DOC-01    | Backend/DB           | API            | Authorized          | Files          | Implement private object storage                           | P0  | **MISSING**                  | OD-07                     | Client storage keys/placeholders                        | None                   | Provider decision         | Threat model/upload/download adapter            | Type/size/access/expiry/retention/audit tests pass                |
| DOC-02    | Backend/CRM/Customer | API/Web/Mobile | Customer/employee   | PDF            | Generate protected quotation PDF                           | P1  | **PLACEHOLDER**              | DOC-01, CRM-06            | `pdf_placeholder`                                       | None                   | DOC-01                    | Create immutable/versioned renderer             | Amount/version match DB; signed access and snapshot tests pass    |
| PAY-01    | Backend/DB           | API            | Customer/finance    | Payment        | Decide pilot/manual vs gateway policy                      | P0  | **BLOCKED**                  | OD-05                     | Reference + employee confirm flow                       | Unit foundation        | Provider/business choice  | Approve state/reconciliation model              | Decision recorded with controls and migration plan                |
| PAY-02    | Backend/CRM/Customer | Full           | Customer/finance    | Payment        | Implement approved confirmation/reconciliation             | P1  | **PLACEHOLDER**              | PAY-01, DB-02             | No gateway/webhook                                      | None                   | PAY-01                    | Build signed/idempotent flow                    | Amount/order/signature/replay/refund/reconcile E2E passes         |
| ERP-01-T1 | ERP/Backend          | Web/API        | Employee/manager    | Event Control  | Prove booking → Event Record handoff                       | P1  | **IMPLEMENTED — UNVERIFIED** | DB-01, PAY-01             | Code/routes/tables exist                                | Unit only              | Real DB                   | Add integration/E2E                             | One idempotent linked event, audit/outbox and denial proven       |
| ERP-02-T1 | ERP                  | Web            | Manager             | Manager Ops    | Complete assignment/task/progress slice                    | P1  | **PARTIAL**                  | WORK-01                   | Routes/APIs/tables exist                                | Unit only              | Task model                | Align with work model, add E2E                  | Manager assigns; employee executes; progress reconciles           |
| V-01-T1   | CVW Mobile           | Vendor         | Vendor              | Home/Work      | Prove assigned work vertical slice                         | P1  | **PARTIAL**                  | DB-01, DOC-01             | Dashboard/assignment/progress exists                    | Incomplete             | Evidence storage          | Test registry→assign→accept→complete            | Strict own scope and ERP/mobile E2E pass                          |
| V-03-T1   | Backend/DB/Mobile    | Vendor         | Vendor/employee     | Catalogue      | Design application/KYC/listing/pricing approval            | P2  | **MISSING**                  | DOC-01, approvals         | Foundation vendor/category only                         | None                   | Marketplace policy        | Schema/API/state ADR                            | Base price hidden; version/review/publication E2E passes          |
| V-04-T1   | CVW/ERP              | Vendor/Finance | Vendor/finance      | Earnings       | Complete invoice/settlement self-service                   | P2  | **PARTIAL**                  | DOC-01, ERP-07            | Settlement foundation                                   | Unit only              | Finance policy            | Reconcile event/vendor amounts                  | Own-data, approval, payment and dispute tests pass                |
| W-01-T1   | CVW Mobile           | Worker         | Worker              | Tasks          | Prove task/attendance vertical slice                       | P1  | **PARTIAL**                  | DB-01, DOC-01             | Task detail/attendance foundation                       | Incomplete             | Privacy/evidence          | Test assign→respond→work→complete               | Scope, timestamps, proof and ERP/mobile E2E pass                  |
| W-05-T1   | Backend/DB/Mobile    | Worker         | Worker/employee     | Profile        | Build application/approval/skills/availability             | P2  | **PARTIAL**                  | DOC-01, AUTH-03           | Worker create/update/skills exist                       | Unit foundation        | Identity/privacy policy   | Design self-application lifecycle               | Approved role issuance and privacy/file E2E pass                  |
| EM-00     | Employee Mobile      | Flutter        | Employees           | Foundation     | Approve separate app ADR and shared-code boundary          | P0  | **BLOCKED**                  | OD-02/03/04               | No app/surface; reusable screens stranded               | None                   | Architecture approval     | Decide package/surface/IDs/reuse                | ADR accepted; no duplicate backend/data/business logic            |
| EM-01-T1  | Employee Mobile      | Mobile         | Sales Person        | First slice    | Build login → My Work → My Leads → Follow-up → Profile     | P1  | **MISSING**                  | EM-00, CRM-02/03, AUTH-01 | No production shell                                     | None                   | Dependencies              | Create role-by-role vertical slice              | Signed test builds + API/DB/device E2E + revocation pass          |
| EM-02-T1  | Employee Mobile      | Mobile         | Telecaller          | Second slice   | Add call queue/outcomes/overdue                            | P2  | **MISSING**                  | EM-01, CRM-03             | No explicit role/domain                                 | None                   | Persona approval          | Narrow capability bundle and UI                 | Scoped queue/outcome/next-action/E2E pass                         |
| EM-03-T1  | Employee Mobile      | Mobile         | Manager             | Third slice    | Add team work/approvals/escalations                        | P2  | **MISSING**                  | CRM-07, approvals         | Manager APIs event-focused                              | None                   | Hierarchy/work model      | Mobile-safe manager views                       | Team scope, decisions, audit and E2E pass                         |
| EM-04-T1  | Employee Mobile      | Mobile         | Field/Event Manager | Fourth slice   | Add today’s events/tasks/issues/proof                      | P2  | **MISSING**                  | ERP-02, DOC-01, NOTIF-01  | Reusable ops screens exist                              | None                   | EM foundation             | Extract/rebuild against approved APIs           | Field execution web/mobile consistency and E2E pass               |
| ERP-05-T1 | ERP                  | Web            | Warehouse/ops       | Inventory      | Prove stock allocation/custody                             | P1  | **IMPLEMENTED — UNVERIFIED** | DB-01                     | Extensive tables/APIs/routes                            | Unit only              | Real DB                   | Add concurrency/reconcile E2E                   | No negative/lost stock; custody/audit proven                      |
| ERP-06-T1 | ERP/DB               | Web/API        | Procurement         | Procurement    | Design requisition→PO→receipt                              | P2  | **MISSING**                  | Inventory, approvals      | Suppliers only                                          | None                   | Business/accounting rules | Write PRD/ADR/schema                            | Segregation/reconciliation/DB/E2E pass                            |
| ERP-07-T1 | ERP                  | Web/API        | Finance             | Finance        | Approve accounting/reconciliation controls                 | P1  | **PARTIAL/HIGH RISK**        | PAY-01, DB-01             | Broad APIs/tables/routes                                | Unit only              | Finance policy            | Threat/model and reconciliation tests           | Totals, approvals, refunds, settlements and audit reconcile       |
| ERP-08-T1 | ERP/DB               | Web/API        | Approvers           | Approvals      | Build unified controlled approval inbox                    | P2  | **MISSING/PARTIAL**          | AUTH-03, DOC-01           | Some capability/actions                                 | None                   | Approval catalogue        | Define types/separation                         | No unauthorized/self/double approval; full audit                  |
| ERP-09-T1 | ERP                  | Web            | Admin/auditor       | Administration | Build safe user/role/policy/audit product                  | P2  | **PARTIAL**                  | AUTH-03                   | Backend foundations only                                | Incomplete             | High-risk control design  | Start with read/audit, then controlled writes   | Least privilege, recovery and browser security tests pass         |
| ERP-10-T1 | ERP                  | Web            | Manager/auditor     | Reports        | Build operational/financial reports                        | P2  | **MISSING/PARTIAL**          | Stable source modules     | Summary APIs only                                       | None                   | Metric dictionary         | Reconcile one report at a time                  | Source totals/access/export/performance pass                      |
| NOTIF-01  | Backend/DB           | API            | All                 | Notifications  | Implement reliable delivery foundation                     | P1  | **PLACEHOLDER**              | Provider decision, DB-01  | Outbox topics; `pushIntegrated:false`                   | Narrow processors only | Provider/inbox model      | Provider adapter, tokens, inbox, retry/DLQ      | Delivery/dedupe/privacy/deep-link/monitoring tests pass           |
| NOTIF-02  | Backend/Employee     | API/UI         | Employee/manager    | Escalations    | Implement due/overdue escalation rules                     | P2  | **MISSING**                  | WORK-01, NOTIF-01         | No generic work escalation                              | None                   | SLA/business policy       | Start with lead first response                  | Employee→manager escalation is timed, deduped and audited         |
| SOC-01    | CRM/Backend          | Web/API        | Marketing/sales     | Lead channels  | Decide social integrations and consent                     | P2  | **BLOCKED**                  | OD-09                     | Lead sources include campaign; no providers             | None                   | Provider/consent          | Select channels and data contract               | Authorized, consented, deduped lead ingestion E2E passes          |
| REL-01    | DevOps               | Backend/Web    | Operators           | Staging        | Provision staging, secrets, HTTPS and monitoring           | P0  | **MISSING**                  | OD-10                     | Hosting undecided                                       | None                   | Platform/owner            | Approve and implement staging                   | Health/log/alert/deploy/rollback smoke passes                     |
| REL-02    | DevOps               | Database       | Operators           | Recovery       | Automate backups and perform restore drill                 | P0  | **MISSING**                  | REL-01                    | Docs only                                               | No drill               | Provider                  | Configure and time restore                      | Restore to clean environment meets approved RPO/RTO               |
| REL-03    | CVW Mobile           | Android/iOS    | Public roles        | Store          | Production-sign and beta-test CVW app                      | P0  | **BROKEN/MISSING**           | STAB/AUTH/REL             | Debug signing; no iOS proof                             | Debug only             | Accounts/IDs              | Configure AAB/IPA/TestFlight/internal           | Signed artifacts, privacy review and pilot E2E pass               |
| REL-04    | Employee Mobile      | Android/iOS    | Employees           | Store          | Production-sign and beta-test Employee app                 | P1  | **MISSING**                  | EM-01, AUTH/REL           | No app                                                  | None                   | EM dependencies           | Store setup with controlled access              | Signed AAB/IPA, revocation and pilot E2E pass                     |
| REL-05    | DevOps               | All            | Operators           | Production     | Controlled Hyderabad rollout                               | P0  | **MISSING**                  | All pilot P0/P1 gates     | No live host/CD                                         | None                   | Release readiness         | Run go/no-go checklist                          | Monitored staged launch, rollback/support/incident ownership live |

---

# 26. Recommended Build Order

Do not build every screen first. Complete one connected vertical slice, prove it, then expand.

| Phase                               | Modules                              | What / Why / Where / Test / Done                                                                                                                                      |
| ----------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 — Stabilize**                   | STAB-01–04, CI-01                    | Make current work trustworthy. Fix gates, classify changes, quarantine raw exports, replace broken assets. Done when local and CI static/unit/widget gates are green. |
| **1 — Prove database/integration**  | DB-01–03, CI-02, C-03-T2             | Run all migrations against clean Postgres and automate enquiry→lead. Done when retry, rollback, audit and outbox are proven in CI.                                    |
| **2 — Secure identity/access**      | AUTH-01–04                           | Production OTP, least privilege, distributed abuse decision and backend-only mobile data. Done when staging auth/revocation/denial tests pass.                        |
| **3 — Customer core**               | C-01–05                              | Final navigation and live Home/Explore/Enquire/Plan/Profile. Done when one customer journey works on Android/iOS test devices.                                        |
| **4 — CRM core**                    | CRM-01, WORK-01, CRM-02–05           | Ownership, My Work, follow-up, Customer 360 and pipeline. Done when an enquiry is handled within SLA with traceable activity/outcome.                                 |
| **5 — Document/payment/booking**    | CRM-06, DOC-01/02, PAY-01/02, ERP-01 | Protected quote, approval, payment and idempotent booking/Event Record. Done when money/document controls and E2E reconcile.                                          |
| **6 — Event/manager operations**    | ERP-01/02                            | Stable Event Record, manager tasks/progress. Done when manager assignment to completion is audited and tested.                                                        |
| **7 — Vendor**                      | V-01–05, ERP-03                      | Complete application, catalogue/pricing, work order, evidence and settlement one slice at a time.                                                                     |
| **8 — Worker**                      | W-01–05, ERP-04                      | Complete application, tasks, attendance, evidence, earnings and profile one slice at a time.                                                                          |
| **9 — Employee Mobile**             | EM-00, EM-01–04                      | Create separate app after work/role APIs stabilize: Sales Person first, then Telecaller, Manager, Field/Event. Never copy ERP.                                        |
| **10 — Inventory/procurement**      | ERP-05/06                            | Prove inventory custody/concurrency, then build procurement with segregation/reconciliation.                                                                          |
| **11 — Finance**                    | ERP-07                               | Reconcile payment, expenses, settlements, invoices/receipts under approved policy.                                                                                    |
| **12 — Admin/reporting**            | CRM-07–10, ERP-08–10                 | Hierarchy, approvals, administration, metric dictionary and reconciled reports.                                                                                       |
| **13 — Notifications/integrations** | NOTIF-01/02, SOC-01                  | Reliable inbox/push/escalation and approved lead channels after source workflows are authoritative.                                                                   |
| **14 — Release hardening**          | REL-01–05                            | Staging, monitoring, restore, signed store releases, privacy/security/performance and controlled Hyderabad launch.                                                    |

### Why Employee Mobile is Phase 9 but starts planning earlier

Create its ADR, capability matrix and app identity during Phases 2–4. Build its production screens only after My Work/follow-up/task APIs are stable. This prevents a second mobile UI from forcing duplicate data and rework. A Sales Person vertical slice can begin before every ERP module is complete because it depends mainly on identity, leads, follow-up and notifications.

---

# 27. Daily Development Process

Use this ten-step loop for every module.

1. **Understand — WHAT/WHY:** explain the user, business result and data in simple language.
2. **Inspect — WHERE:** find current screens, API, tables, capabilities, tests and docs.
3. **Gap analysis:** label each part Done, Unverified, Partial, Placeholder, Broken, Blocked, Missing or Deferred.
4. **Plan — HOW:** select the smallest complete UI → API → DB → authorization slice; name files and exit gate.
5. **Protect:** create a small branch/change group; do not mix cleanup with a feature.
6. **Implement:** reuse contracts/design patterns; no direct DB from clients; no invented statuses/permissions.
7. **Focused test — TEST:** unit/widget/repository/API tests for happy, denial, invalid-state, retry and stale-version paths.
8. **Integrate:** run against migrated PostgreSQL and the real interface.
9. **Verify — DONE:** run complete gates, inspect audit/outbox/data and capture evidence.
10. **Update roadmap:** change status/evidence, record remaining risk and set exactly one next task.

### Daily rule for a non-technical founder

Ask Codex for only this:

> “Work on roadmap item `<ID>` only. First tell me WHAT, WHY, WHERE, HOW, TEST and DONE. Inspect current code, implement the smallest complete slice, run the exit gate, and update the roadmap. Do not start the next module.”

---

# 28. Current Module

## STAB-01 — Repository Quality Gate Restoration

**What:** Make the existing project’s checks green without adding a new feature.

**Why:** New work on a red, mixed repository hides regressions and makes every later decision less trustworthy.

**Where:** Root formatting/lint configuration and owned source/docs; `apps/mobile/test/home_tab_test.dart` plus its Home implementation; `.github/workflows/ci.yml`; design/raw export boundaries.

**How:**

1. Preserve/classify current changes.
2. Exclude/archive raw Stitch debug exports from source formatting or normalize only files that are intended source.
3. Fix the one Next image lint issue correctly.
4. Resolve the 20 Home tests by comparing intended current UI behavior, not by blindly deleting assertions.
5. Correct CI branch/API-port drift after branch decision.
6. Run complete root and Flutter gates.

**Test:** root format, lint, typecheck, unit tests, build; Flutter format/analyze/test; CI-equivalent commands.

**Done:** all existing gates pass with no skipped failing tests and no unrelated feature change.

---

# 29. Exact Next Task

## STAB-01A — Create a safe formatter/asset boundary and restore the TypeScript static gate

**Immediate action:** classify the 280 formatter findings into owned source/docs versus raw/generated exports; configure the formatter to ignore only proven raw/generated material; format/fix owned files; replace the single raw `<img>` usage with the project-approved Next image approach (or record an explicit justified exception); then run format, lint, typecheck, tests and build.

**Why this is first:** it is small, reversible and removes noise before debugging Flutter Home behavior or changing architecture. It also prevents gzipped/raw Stitch exports from repeatedly breaking source checks.

**Do not do in this task:** no new app, no Employee Mobile scaffold, no table migration, no production provider, no bulk delete and no navigation rewrite.

### Exit Gate

The task is complete only when:

1. root format check passes;
2. root lint passes with zero warnings;
3. root typecheck, tests and build still pass;
4. ignore rules name only proven generated/raw paths;
5. no product source/evidence is deleted;
6. the change list contains only static-gate restoration;
7. the roadmap evidence for STAB-01 is updated.

After STAB-01A, do **STAB-01B: resolve the 20 Flutter Home tests**, then complete CI alignment.

---

# 30. Definition of Done

## Module-level Definition of Done

A module is Done only if all applicable boxes are true:

- [ ] Business purpose, user and approved states are documented.
- [ ] UI covers loading, empty, populated, validation, error, offline/retry and accessibility states.
- [ ] Versioned API contract is shared and validated.
- [ ] Database migration is ordered, reviewed and tested on a clean database.
- [ ] Authentication, capability, branch/team/assignment/record scope and state/version checks are server-enforced.
- [ ] Critical create/update commands are idempotent and concurrency-safe.
- [ ] Audit/activity/outbox semantics are correct and not duplicated.
- [ ] Sensitive fields/files are minimized, masked and protected.
- [ ] Unit, widget/component, database, API and one end-to-end journey pass.
- [ ] Logs/metrics/errors are useful without leaking secrets or personal data.
- [ ] Documentation, Master TODO status, evidence and exact next task are updated.

## Hyderabad pilot Definition of Done

- Customer can authenticate, browse approved content, enquire, receive/act on a protected quote and complete the approved payment path.
- CRM can own, follow up and convert the same enquiry without copying records.
- ERP receives one booking/Event Record and can assign manager/vendor/worker, execute minimal operations and reconcile finance.
- Vendor/Worker can securely act only on assigned work.
- Production OTP, HTTPS, secrets, private documents, audit, monitoring, support and rollback are operating.
- Clean database migrations, API integration, browser/device E2E, security checks and backup restore evidence are green.
- Signed CVW AAB/IPA pass internal/TestFlight pilot; Employee Mobile release is required only if its approved pilot role is in launch scope.

## Production Definition of Done

Pilot gates plus complete role products, notification delivery, payment/file integrations, procurement/finance/admin/reporting scope selected for launch, capacity/performance proof, incident/on-call ownership, privacy/store declarations, staged releases and successful restore/rollback drills.

---

# 31. Open Decisions / Risks

Significant conflicts are not silently changed. Record approval in an ADR or product decision before implementation.

### OPEN DECISION OD-01 — Customer navigation

- **Existing:** Home → Explore → Plan → Enquiries → Account.
- **Intended:** Home → Explore → Enquire → Plan → Profile.
- **Conflict:** Existing enum/order/routes/tests and saved/deep links use the old structure.
- **Recommendation:** accept the intended structure; make Enquire contain creation plus enquiry/quote/booking history; rename Account to Profile; migrate links/tests intentionally.
- **Impact:** focused Flutter navigation/state/test change; no backend/database duplication.

### OPEN DECISION OD-02 — Employee Mobile application boundary

- **Existing:** employee roles resolve only to employee web; some manager/ops Flutter screens are stranded inside `apps/mobile`.
- **Intended:** separate production Employee Mobile app for Android/iOS.
- **Recommendation:** create `apps/employee-mobile` as a separate Flutter package after an ADR; add `employee_mobile` bootstrap surface; extract only proven reusable design/API packages, not business records or backend logic.
- **Impact:** new store identities, signing, CI jobs, push credentials and role-based release plan; same identity/backend/database.

### OPEN DECISION OD-03 — Employee personas, roles and hierarchy

- **Existing:** `employee`, `support`, `finance`, `manager`, `administrator`, `auditor`; broad `employee` capabilities; no department/team hierarchy.
- **Intended:** Sales Person, Telecaller, Marketing, Sales Manager, General Manager and Field/Event personas.
- **Recommendation:** capabilities + scoped assignments first; add explicit business roles only where stable policy needs them; build hierarchy/team model before team visibility.
- **Impact:** security migration and denial-test program; avoids UI-only roles.

### OPEN DECISION OD-04 — Common employee work model

- **Existing:** lead activities, event tasks and operations tasks are separate domain mechanisms.
- **Intended:** one traceable assignment/activity/outcome/next-action/escalation experience.
- **Recommendation:** ADR comparing generalization versus orchestration/projection. Preserve domain ownership; add a generic work record only if it eliminates duplication.
- **Impact:** foundational dependency for My Work, follow-up, Employee Mobile, manager monitoring and notifications.

### OPEN DECISION OD-05 — Payment model/provider

- **Existing:** customer submits method/reference; employee confirms; no gateway/webhook/reconciliation.
- **Recommendation:** explicitly approve controlled manual Hyderabad pilot controls or select gateway; define states, signature/replay, amount match, refunds, reconciliation and incident handling.
- **Impact:** booking integrity, finance and production claim.

### OPEN DECISION OD-06 — Production OTP/SMS provider

- **Existing:** local OTP only; external provider returns 503.
- **Recommendation:** select compliant provider, failover/support owner and shared abuse controls.
- **Impact:** all production authentication and store pilots.

### OPEN DECISION OD-07 — Private file/object storage

- **Existing:** placeholders/client-supplied storage keys.
- **Recommendation:** select private object storage; NestJS authorizes server-created upload/download intents; define validation, retention, encryption, malware handling and signed expiry.
- **Impact:** quotation PDF, KYC, proof, invoices and privacy.

### OPEN DECISION OD-08 — Employee Mobile scope

- **Existing:** all employee roles are web-only.
- **Recommendation:** launch role-by-role: Sales Person first, then Telecaller, Manager, Field/Event; keep bulk/admin/complex finance on web.
- **Impact:** controls initial app size and avoids miniature ERP.

### OPEN DECISION OD-09 — Social lead integrations

- **Existing:** lead source supports `campaign`; no social providers/consent pipeline.
- **Recommendation:** identify actual channels (for example ads/messaging), provider APIs, consent, opt-out, retention, deduplication and ownership before integration.
- **Impact:** CRM marketing scope, privacy and recurring provider cost.

### OPEN DECISION OD-10 — Hosting, monitoring and recovery owner

- **Existing:** no live host/CD/cloud inventory; Docker Compose is local only.
- **Recommendation:** choose managed PostgreSQL, Nest process host, Next host, object storage/queue/monitoring and named operator; require separate staging/production and restore drill.
- **Impact:** every production release.

### OPEN DECISION OD-11 — Git default branch

- **Existing:** repository active branch `master`; CI push trigger `main`.
- **Recommendation:** select one canonical protected default branch and update CI/docs/rules together.
- **Impact:** pushes may currently skip CI.

### OPEN DECISION OD-12 — Supabase usage boundary

- **Existing:** Supabase Flutter initialization/direct read conflicts with accepted backend-only boundary; managed Supabase PostgreSQL hosting is allowed.
- **Recommendation:** remove client DB dependency and bundled client environment after usage trace; keep Supabase only as a PostgreSQL/object-storage provider if selected behind NestJS.
- **Impact:** security, architecture and mobile configuration.

## Risk register

| Risk                                            | Likelihood / impact | Control                                                                |
| ----------------------------------------------- | ------------------- | ---------------------------------------------------------------------- |
| Adding features before green gates              | High / High         | Finish Phase 0 and enforce CI                                          |
| Accidental deletion in dirty tree               | High / High         | Cleanup manifest, review, backup, rebuild; no bulk delete              |
| Broad employee data exposure                    | Medium / Critical   | OD-03, server scope, denial tests and field filtering                  |
| Duplicate task/work systems                     | High / High         | OD-04 ADR before schema/UI                                             |
| Payment/file/OTP placeholders mistaken for live | High / Critical     | Honest labels and release-blocking provider E2E                        |
| Store rejection or signing loss                 | Medium / High       | Organization accounts, secure custody, early TestFlight/internal track |
| Database migration defect                       | Medium / Critical   | Clean integration CI, backups and restore drill                        |
| Sample metrics/data used for decisions          | High / High         | Label/remove samples; reports must reconcile to source                 |
| Notification loss/duplicates                    | High / Medium       | Transactional outbox, idempotent consumer, retry/DLQ/monitoring        |
| Documentation drift                             | High / Medium       | Update roadmap/evidence at every exit gate                             |

---

# Final roadmap logic

```text
CURRENT STATE
   ↓
STABILIZE
   ↓
PROVE DATABASE
   ↓
SECURE IDENTITY
   ↓
CUSTOMER
   ↓
CRM + EMPLOYEE WORK
   ↓
QUOTATION / DOCUMENT / PAYMENT
   ↓
EVENT RECORD / ERP
   ↓
VENDOR
   ↓
WORKER
   ↓
EMPLOYEE MOBILE — ROLE BY ROLE
   ↓
INVENTORY / PROCUREMENT
   ↓
FINANCE
   ↓
ADMIN / REPORTING
   ↓
NOTIFICATIONS / INTEGRATIONS
   ↓
TESTING / SECURITY / RECOVERY
   ↓
GOOGLE PLAY / APP STORE / PRODUCTION RELEASE
```

**One project. Two mobile store applications. One employee web portal. One NestJS backend. One PostgreSQL source of truth. Build and prove one connected module at a time.**
