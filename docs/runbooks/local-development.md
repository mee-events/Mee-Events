# Local development

## Prerequisites

- Node.js 20 or newer
- Corepack with pnpm 9
- Docker Desktop
- Expo Go on a test phone, or Android Studio/Xcode for native development

The archived Flutter project is outside this workspace and remains untouched.
The new mobile application is `apps/mobile`.

## Install

```sh
corepack pnpm install
```

## Start PostgreSQL and Redis

```sh
corepack pnpm db:up
corepack pnpm db:status
corepack pnpm db:migrate
```

Local ports:

- PostgreSQL: `5433`
- Redis: `6380`

These ports avoid interrupting other local projects that commonly use 5432 and 6379.

## Configure

Copy examples to ignored local files and replace placeholders:

```sh
cp apps/backend/.env.example apps/backend/.env
cp apps/erp-web/.env.example apps/erp-web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Never place a backend secret in `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*`.

For a physical phone, `EXPO_PUBLIC_API_BASE_URL` must use the computer's local
network address rather than `localhost`.

## Run

Use separate terminals:

```sh
corepack pnpm dev:backend
corepack pnpm dev:erp
corepack pnpm dev:mobile
```

Addresses:

- Backend API: `http://localhost:3002/api/v1`
- API documentation: `http://localhost:3002/api/docs`
- Employee CRM/ERP: `http://localhost:3001`
- Expo: use the URL and QR printed by the mobile process

Port 3002 keeps this backend separate from the earlier customer-design preview
that may already be using port 3000.

## Phase 1 behavior

- Mobile development opens the approved Customer UI directly. Any Vendor or
  Worker preview control is development-only; production routing comes from
  authenticated backend roles.
- Mobile and ERP sample records are visibly labelled.
- Real platform bootstrap requires a signed access token and an active
  server-side device session.
- The backend readiness endpoint remains degraded until its PostgreSQL
  repository adapter replaces the in-memory identity repository.

## Verify

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```
