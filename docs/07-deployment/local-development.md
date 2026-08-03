# Local Development

How to run Mee Events on a developer machine. The mobile client is **Flutter**
(`apps/mobile`, [ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md)).

Also see root [`README.md`](../../README.md) and
[database migrations](../03-database/migrations.md).

---

## Prerequisites

| Tool            | Notes                                   |
| --------------- | --------------------------------------- |
| Node.js         | `>= 20.11.0`                            |
| Corepack / pnpm | `pnpm@9.15.4` (see root `package.json`) |
| Docker Desktop  | For Postgres + Redis via Compose        |
| Flutter SDK     | 3.x+ (CI pins `3.44.8` stable)          |

---

## First-time setup

```sh
corepack pnpm install
corepack pnpm db:up
corepack pnpm db:migrate
```

Optional employee seed (local only):

```sh
corepack pnpm db:seed:dev
```

Copy each app’s `.env.example` to an ignored `.env` before connecting clients
([environment.md](./environment.md), [secrets.md](../05-security/secrets.md)).

---

## Ports

| Service     | Default host port               |
| ----------- | ------------------------------- |
| PostgreSQL  | `5433` → container `5432`       |
| Redis       | `6380` → container `6379`       |
| Backend API | `3002` (Swagger at `/api/docs`) |
| ERP web     | `3001`                          |

Compose file: `infrastructure/docker-compose.yml` (Postgres 17.2, Redis 7.4).
Compose is **local only** — not a production stack.

Redis is started by `db:up` for future/local supporting use. Backend boot
validation does **not** require a Redis URL today.

---

## Run surfaces

Use separate terminals:

```sh
corepack pnpm db:status          # optional health of Compose services
corepack pnpm dev:backend        # NestJS API
corepack pnpm dev:erp            # Next.js Employee CRM/ERP

cd apps/mobile
flutter pub get
flutter run                      # or: corepack pnpm dev:mobile
# variants: corepack pnpm dev:mobile:android | dev:mobile:ios
```

Mobile talks to the API base URL from `--dart-define` / env (see
[environment.md](./environment.md)). Emulator Android often uses
`http://10.0.2.2:<port>/api/v1`.

---

## Quality gate

```sh
corepack pnpm verify
```

Runs `format:check` → `lint` → `typecheck` → `test` → `build` for the TypeScript
workspace. Flutter checks are separate (`flutter analyze`, `flutter test`) and
run in CI ([ci-cd.md](./ci-cd.md)).

---

## Related

- [environment.md](./environment.md)
- [ci-cd.md](./ci-cd.md)
- [Database docs](../03-database/README.md)
