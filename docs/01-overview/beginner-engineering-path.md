# Mee Events Beginner Engineering Path

This is the product owner's progressive learning plan. It supports the live
roadmap; it does not replace `docs/roadmap/MEE_EVENTS_MASTER_TODO.md`.

The working method is:

`BUILD → EXPLAIN → TRAIN → VERIFY → INTERVIEW PREP`

Learning follows the current module. Advanced subjects stay parked until the
project reaches them.

## Current learning level

- **Self-reported level:** complete beginner.
- **Already demonstrated:** a clear understanding of the Mee Events business
  flow, the names of its main applications, the importance of security,
  verification, dependency order, and honest status reporting.
- **Not yet verified hands-on:** terminal use, Git, reading TypeScript/Dart,
  tracing HTTP requests, SQL, test diagnosis, deployment, or system design.
- **Current engineering stage:** CUST-05 Home, first implementation slice.
- **Current learning focus:** how authoritative backend status becomes truthful
  UI state, how deterministic selection works, and how navigation reuses an
  existing feature instead of duplicating it.

## CUST-05 first-slice learning report

1. **What was built:** Customer Home recognizes concluded Event Records from
   authoritative status, selects the most recent concluded record safely, and
   shows a completed hero plus a resume card only when no active/upcoming event
   is primary.
2. **Why it was needed:** a date describes when an event was planned, but only
   lifecycle status says whether the business process actually concluded.
3. **How it works:** `completed`, `settlement_pending`, and `closed` qualify;
   `cancelled` and past-dated active records do not. Dates order qualifying
   records, while server timestamps and event ID make missing dates and ties
   deterministic.
4. **How navigation stays safe:** “Plan another event” selects the existing
   Plan tab. The resume card opens the existing Event Workspace only when the
   selected record has a usable `bookingId`; Home does not duplicate workspace
   functionality.
5. **What remains:** quotation resume, honest provider failures, location/date
   decisions, approved media, complete acceptance testing, and independent
   review. CUST-05 is in progress, not complete.
6. **What to understand:** server status supplies lifecycle meaning; dates can
   sort but must not invent meaning. A deterministic tie-breaker makes the same
   data choose the same event every time.

## CUST-04 learning report

1. **What was built:** the bootstrap contract now evolves additively without
   dropping required security baselines; database role scopes remain typed;
   stable server session IDs and local revisions make refresh, bootstrap,
   logout, account replacement, and role-switch races fail closed. Vendor
   access now requires a matching role grant and membership for the same
   vendor. Vendor notes also prove that any assignment and event belong to that
   vendor before writing, require an explicit vendor when several are
   authorized, and vendor dashboards return only summary fields. TypeScript now
   agrees with Flutter that `generatedAt` must be UTC.
2. **Why it was needed:** exact catalog pinning broke compatible old clients, a
   vendor UUID could be mistaken for a branch, and Dart object identity could
   not reliably describe which logical session a response belonged to.
3. **Where it belongs:** PostgreSQL repository mapping → shared role types →
   authenticated principal → backend bootstrap → Flutter model/session gateway.
4. **How it works:** the backend remains authoritative; Flutter validates a
   strict structure and required baseline, tolerates only safe unknown
   additions, and applies responses only to the same server/local session and
   compatible role revision.
5. **What can fail:** missing or privileged policy, unsupported scope pairing,
   inactive/duplicate grants, a different device session, logout/replacement,
   conflicting role changes, cross-vendor grant/membership or note-link mixing,
   detail-field leakage, or local persistence after a server-side switch.
6. **How it was verified:** unit, database-backed PostgreSQL, real Nest HTTP,
   OpenAPI, Flutter model/provider/widget, concurrency, and full regression
   gates. ERP typecheck was also proven from a temporary state with no generated
   Next files, followed by two consecutive root verification runs; see the
   CUST-04 evidence record.
7. **What to understand:** a strict contract does not mean “reject every new
   field,” and a role scope, branch, server session, and local revision each
   answer a different security question. Logging out must hide private memory
   before slower storage/cache cleanup finishes. A TypeScript interface does
   not remove private fields at runtime; an explicit mapper does.
   Generated framework declarations should be ignored and reproducibly created
   before checking types. Tests must supply their own dependency configuration,
   not make production security dependencies optional.
8. **Interview practice:** explain why the mobile capability list controls UI
   visibility but never replaces server authorization, and why relationship
   validation must happen before any transaction side effect.

## First five concepts

1. **Client, server, and database** — the app asks; the backend decides; the
   database stores authoritative business data.
2. **Process and port** — each running program is a process; a port is its
   numbered network door (`3002` backend, `3001` ERP, `5433` local Postgres).
3. **HTTP request and response** — a client calls an API endpoint and receives
   a status code plus JSON data or a safe error.
4. **Authentication and authorization** — authentication proves who the user
   is; authorization decides what that user may do.
5. **Git status and diff** — `status` shows changed files; `diff` shows the
   content changes. Both are read-only and should be checked before edits.

## First practical exercise

From the repository root, run these safe, read-only commands:

```sh
git status --short --branch
git diff --stat
```

Then answer:

1. Which branch are you on?
2. How many files are modified and untracked?
3. Why must those files be protected before CUST-04 remediation?

Do not run `git reset --hard` or `git clean -fd`. The first can discard tracked
work; the second can delete untracked files.

## First interview question

**Question:** How do the Mee Events applications communicate with the database?

**Strong answer:** “The Flutter and Next.js clients never connect directly to
PostgreSQL. They call the versioned NestJS REST API. The backend authenticates
the user, checks roles, capabilities, branch and resource ownership, applies
business rules, and then accesses PostgreSQL through repository adapters. This
keeps security and data integrity on the server.”

## Progressive curriculum

### Level 1 — Developer fundamentals

Learn terminals, files, processes, ports, environment variables, JSON, HTTP,
client/server architecture, APIs, Git and GitHub. Prove this by safely starting
the local services and explaining what each terminal is running.

### Level 2 — Programming fundamentals

Learn variables, types, functions, objects, classes, interfaces, modules,
async/await, Promises/Futures, errors and dependency injection. Use small
TypeScript and Dart examples taken from the active module.

### Level 3 — Web and API engineering

Learn REST, HTTP methods/status codes, JSON request/response bodies,
validation, pagination, authentication, authorization, API contracts and
OpenAPI. CUST-04 is the first detailed case study.

### Level 4 — NestJS backend

Learn modules, controllers, services, repositories, guards, middleware,
transactions and error handling by tracing one real endpoint end to end.

### Level 5 — PostgreSQL

Learn tables, rows, columns, keys, constraints, indexes, joins, transactions,
migrations and concurrency. Use `app_users`, `role_assignments`,
`device_sessions`, `enquiries`, `quotations`, `bookings`, and `event_records`.

### Level 6 — Flutter

Learn widgets, Riverpod state, models, navigation, API calls, loading/error/
empty states, secure sessions and role switching. Use the Customer journey.

### Level 7 — Next.js CRM/ERP

Learn React components, server/client boundaries, routing, forms, data fetching
and route/action authorization. Use the employee enquiry-to-booking workflow.

### Level 8 — Architecture

Learn modular monoliths, domain boundaries, API contracts, authorization,
Pattern B, outbox events, audit trails, caching, N+1 queries and basic
distributed-system trade-offs.

### Level 9 — Testing

Learn unit, integration, database, API, Flutter widget, end-to-end, regression,
concurrency and security testing. For each failure, identify which layer the
test proves and which layers it does not prove.

### Level 10 — DevOps and production

Learn environments, Docker, CI/CD, deployment, logs, monitoring, backups,
migrations, rollback, signing and mobile-store delivery when PROD/ANDROID/IOS
roadmap work begins.

### Level 11 — System design

Use Mee Events to discuss scale, availability, consistency, caching, queues,
notifications, payments, search, media, database/API scaling and failure
recovery. Start only after the underlying features are understood.

## Interview preparation tracks

- **Coding:** programming basics, debugging, data structures, algorithms, SQL.
- **Backend:** HTTP, APIs, auth, databases, transactions and concurrency.
- **Frontend/mobile:** React, Flutter, state, navigation and API integration.
- **System design:** evolve the real Mee Events architecture under load.
- **Project discussion:** explain decisions, failures, tests and trade-offs.
- **Behavioral:** communicate ownership, review, learning and correction.

No salary is guaranteed. The goal is the depth, honesty and problem-solving
ability needed to compete for strong engineering roles.

## Teaching cadence

For a meaningful implementation, record:

1. What was built.
2. Why it was needed.
3. Where it belongs.
4. How it works.
5. What can fail.
6. How it was verified.
7. What the owner should now understand.
8. One interview question and a strong answer.

At major milestones, add a short learning report with project progress,
engineering knowledge, interview knowledge, weak areas, and one next target.

## Starter glossary

- **API:** a defined way for software systems to communicate.
- **Endpoint:** one API method and URL, such as `GET /api/v1/platform/bootstrap`.
- **Client:** software that asks another system for data or an action.
- **Server/backend:** software that receives requests, enforces rules, and works
  with authoritative data.
- **Database:** structured durable storage; Mee Events uses PostgreSQL.
- **JSON:** the text data format used by Mee Events API requests and responses.
- **Authentication:** proving who a user is.
- **Authorization:** deciding what an authenticated user may access or change.
- **JWT:** a signed access token containing trusted identity/session claims.
- **Refresh token:** a longer-lived secret used to obtain a new access token.
- **Role:** a user category such as Customer, Vendor or Worker.
- **Capability:** a specific allowed action, such as reading one's enquiries.
- **Scope:** the boundary within which a role grant applies.
- **Migration:** a versioned, reviewed database-structure change.
- **Repository adapter:** backend code that reads/writes PostgreSQL for a module.
- **Transaction:** a group of database changes that all succeed or all roll back.
- **Regression:** a previously working behavior broken by a later change.
- **CI:** automated checks run for repository changes.

Expand this glossary only when project work introduces a term in practice.
