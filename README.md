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
  mobile/        Flutter app with Customer, Vendor and Worker roles
  backend/       NestJS modular backend and authenticated platform bootstrap
  erp-web/       Next.js Employee CRM/ERP command centre
  customer-web/  Existing Customer App/workflow web prototype (separate build)
packages/
  api-contracts/ Shared request, response, module and capability contracts
  shared-types/  Shared identity and role types
infrastructure/
  postgres/      Versioned platform migrations
  docker-compose.yml
```

The mobile app (`apps/mobile`) is a Flutter project managed separately from the
pnpm workspace. It requires the Flutter SDK (3.x+) installed on your machine.

## Current status

Implemented:

- the approved premium Customer UI/UX with Home, Explore, four-step Plan,
  Enquiries, event workspace, quotation, payment preview, manager chat and
  Account;
- the exact 21 event categories and 41 service categories with editable,
  approval-governed Hyderabad estimates;
- isolated development previews for Vendor and Worker while their approved
  visual designs are prepared;
- a Hyderabad Employee CRM/ERP foundation;
- authenticated `GET /api/v1/platform/bootstrap`;
- backend-owned role modules and capabilities;
- one shared API bootstrap contract;
- the Hyderabad branch, multi-role identities, device sessions, configurable
  lead SLA, append-only audit log, outbox, and idempotency database foundation.

Still intentionally labelled as not live:

- mobile and ERP sample records;
- production authentication provider;
- PostgreSQL identity repository;
- enquiry, quotation, booking, payment, vendor, worker, warehouse, and finance
  transactions.

The next connected vertical slice is:

```text
Customer submits enquiry
  -> backend validates and stores it
  -> CRM receives the lead
  -> Marketing Manager becomes the owner
  -> customer sees the same status
```

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
