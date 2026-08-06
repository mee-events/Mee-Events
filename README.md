# Mee Events Platform

Connected Hyderabad foundation for one mobile application, one Employee CRM/ERP
portal, one backend, and one PostgreSQL source of truth.

```text
Customer / Vendor / Worker mobile roles
                  |
        NestJS versioned backend API
                  |
          PostgreSQL + audit/outbox
                  |
        Employee CRM and ERP web
```

## Design system

Enterprise Design System v1 lives in [`docs/design-system/`](docs/design-system/README.md).
Flutter tokens: `apps/mobile/lib/theme/`. Components: `apps/mobile/lib/design_system/`.
Governing PRD: `docs/product/prd/07-ui-ux-design-system-prd-v1.md`.

## Applications

```text
apps/
  mobile/        Flutter app — Customer + Vendor/Worker ops (AppGateway)
  backend/       NestJS modular backend and authenticated platform bootstrap
  erp-web/       Next.js Employee CRM/ERP command centre
packages/
  api-contracts/ Shared request, response, module and capability contracts
  shared-types/  Shared identity and role types
infrastructure/
  postgres/      Versioned platform migrations
  docker-compose.yml
```

Customer product UI is Flutter only. Dubbed/duplicate surfaces (former
`customer-web` prototype, mobile role-preview shell, venue/ticket fake path,
legacy preview dashboards) were removed.

The mobile app (`apps/mobile`) is a Flutter project managed separately from the
pnpm workspace. It requires the Flutter SDK (3.x+) installed on your machine.

## Current status

Implemented:

- Flutter Customer shell: Home, Explore, Plan, Enquiries, quotation detail,
  advance submit, event workspace, and Account (Home/Explore catalog still
  sample data; Stitch KEEP depth incomplete);
- the exact 21 event categories and 41 service categories with editable,
  approval-governed Hyderabad estimates;
- live Vendor and Worker **ops** dashboards on AppGateway (not full Stitch
  Vendor/Worker product apps yet);
- a Hyderabad Employee CRM/ERP foundation with live leads / quotes / events;
- authenticated `GET /api/v1/platform/bootstrap`;
- backend-owned role modules and capabilities;
- one shared API bootstrap contract;
- PostgreSQL identity (OTP challenges, users, device sessions);
- enquiry create + CRM lead in one transaction; CRM claim updates customer
  enquiry status;
- quotation, advance payment, booking, and Event Record write path;
- vendor, worker, warehouse, inventory, operations, and finance API foundations;
- Hyderabad branch, configurable lead SLA, append-only audit log, outbox, and
  idempotency database foundation.

Still intentionally labelled as not live / not production-ready:

- mobile Home/Explore catalog sample data (live path is Plan → enquiry → quote);
- ERP overview dashboard sample metrics (live work is under `/leads`, `/quotes`);
- production SMS OTP provider (local OTP only in development);
- push / outbox consumers; customer feedback; manager chat (not shipped);
- real quotation PDF and payment gateway.

Local demo of the connected sale path:

```text
Customer OTP login → Plan → submit enquiry
  → ERP login (+919000000001) → /leads → Claim
  → requirements → create/send quote
  → Customer approve → submit advance
  → ERP confirm advance → booking BK-… + event EV-…
```

See [`docs/07-deployment/local-demo-checklist.md`](docs/07-deployment/local-demo-checklist.md).
API smokes: `bash scripts/demo-enquiry-claim-smoke.sh` and
`bash scripts/demo-enquiry-to-booking-smoke.sh`.

## Local setup

Requirements: Node.js 20+, Corepack/pnpm, Docker Desktop, and Flutter SDK 3.x+.

```sh
corepack pnpm install
corepack pnpm db:up
corepack pnpm db:migrate
```

Copy the relevant `.env.example` files to ignored `.env` files before connecting
clients. Then run each surface in its own terminal:

```sh
corepack pnpm dev:backend
corepack pnpm dev:erp

# Mobile (in a separate terminal):
cd apps/mobile
flutter pub get
flutter run
```

- Backend API documentation: `http://localhost:3002/api/docs`
- Employee CRM/ERP: `http://localhost:3001`
- Mobile: runs on connected Android/iOS device or emulator via Flutter

Architecture decisions live in `docs/adr`. ADR 0010 is the active connected
platform decision; ADR 0011 adopts the PRD suite and confirms Flutter.

Product requirements live in `docs/product/prd`. The Master PRD
(`docs/product/prd/00-master-prd-v1.md`) governs product scope; PRDs 01-10
cover the Customer, Vendor, and Worker apps, CRM, ERP, database, design
system, technical architecture, AI roadmap, and deployment.
