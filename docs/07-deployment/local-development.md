# Local Development

How to run Mee Events on a developer machine. The mobile client is **Flutter**
(`apps/mobile`, [ADR 0011](../adr/0011-prd-suite-and-flutter-confirmation.md)).

Also see root [`README.md`](../../README.md) and
[database migrations](../03-database/migrations.md).

If you are new to engineering, read this page as a map of separate programs
working together. A **process** is a running program. A **port** is the numbered
network door used to reach that process.

## How Mee Events runs

```text
Flutter Customer/Vendor/Worker ─┐
                                ├─→ NestJS REST API ─→ PostgreSQL
Next.js Employee CRM/ERP ───────┘
```

The clients never connect directly to PostgreSQL. They send HTTP requests to
NestJS. The backend authenticates the user, checks authorization and business
rules, then reads or changes PostgreSQL through repository adapters.

Typical authenticated request:

```text
Tap in Flutter
  → HTTP request with JWT access token
  → NestJS authentication guard
  → role/capability/branch/ownership checks
  → controller → service → repository
  → PostgreSQL transaction
  → JSON response
  → Riverpod state updates the screen
```

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

| Service     | Default host port                              |
| ----------- | ---------------------------------------------- |
| PostgreSQL  | `5433` → container `5432`                      |
| Redis       | `6380` → container `6379`                      |
| Backend API | `3002` (Swagger at `/api/docs` in development) |
| ERP web     | `3001`                                         |

Compose file: `infrastructure/docker-compose.yml` (Postgres 17.2, Redis 7.4).
Compose is **local only** — not a production stack.

Redis is started by `db:up` for future/local supporting use. Backend boot
validation does **not** require a Redis URL today.

---

## Run surfaces

Start them in this order. Use separate terminals so each long-running process
can keep showing its own logs.

### Terminal 1 — infrastructure

```sh
corepack pnpm db:up
corepack pnpm db:migrate
corepack pnpm db:status
```

PostgreSQL stores business data. Redis starts as supporting local
infrastructure but is not currently authoritative for sessions or business
records.

### Terminal 2 — backend

```sh
corepack pnpm dev:backend
```

Wait for the backend to report that it is listening on port `3002`. In
development, API documentation is available at
`http://localhost:3002/api/docs`.

### Terminal 3 — ERP

```sh
corepack pnpm dev:erp
```

Open `http://localhost:3001`. The ERP calls the backend; it does not use a
separate database.

### Terminal 4 — Flutter

```sh
cd apps/mobile
flutter pub get
flutter run --flavor dev
```

The root shortcuts are `corepack pnpm dev:mobile`,
`corepack pnpm dev:mobile:android`, and `corepack pnpm dev:mobile:ios`.

Mobile talks to the API base URL from `--dart-define` / env (see
[environment.md](./environment.md)). Emulator Android often uses
`http://10.0.2.2:<port>/api/v1`.

## Authentication in one minute

1. The user enters a mobile number.
2. The backend creates an OTP challenge and a provider sends the code. Local
   development may return a development-only code; production must not.
3. Successful verification creates a database-backed device session.
4. Flutter receives a short-lived JWT access token and a rotating refresh
   token.
5. The access token accompanies protected API requests.
6. The backend validates the token and reloads authoritative session, role and
   scope information.
7. Capabilities and resource ownership decide whether the action is allowed.
8. The refresh token obtains a new access token when needed. Logout revokes the
   relevant session.

Authentication proves identity. Authorization decides permitted actions.

## Read logs and debug a failed request

The backend, ERP and Flutter terminals are the first log sources. Backend HTTP
logs are structured with Pino and redact configured sensitive fields. Never
paste access tokens, OTPs, mobile numbers or provider credentials into reports.

Use this sequence:

```text
Symptom
  → reproduce once
  → read the user-safe error and request ID
  → identify Flutter, ERP, API, auth, database, environment, or network layer
  → inspect the matching terminal log
  → trace request → controller → service → repository when applicable
  → find root cause
  → apply the smallest fix
  → run a focused test
  → run regression verification
```

Quick checks:

```sh
corepack pnpm db:status
curl http://localhost:3002/api/v1/health/live
```

Common meanings:

| Symptom                      | Likely first layer to inspect                                 |
| ---------------------------- | ------------------------------------------------------------- |
| App cannot connect           | API URL, backend process, phone/emulator networking           |
| `401`                        | Authentication token/session                                  |
| `403`                        | Authorization, role or capability                             |
| `404` for a known ID         | Missing record or intentional ownership/branch denial         |
| `409`                        | State/version conflict or duplicate business action           |
| `500`                        | Backend/infrastructure defect; use request ID and backend log |
| ERP page fails but API works | Next.js route, session or API client                          |
| Test cannot bind a port      | Local environment/sandbox conflict, not automatically code    |

## Flutter hot reload and restart

While `flutter run` is active:

- Press `r` for **hot reload**. It injects most Dart/UI changes while preserving
  current app state.
- Press `R` for **hot restart**. It restarts Dart application state without a
  full native rebuild.
- Stop and rebuild after native Android/iOS configuration or dependency
  changes.

## Run on a physical Android phone

This is development guidance, not a signed release process.

1. Install Android Studio and the Android SDK platform tools.
2. On the phone, enable Developer options and USB debugging.
3. Connect the phone and approve its debugging prompt.
4. Confirm that `flutter devices` lists it.
5. Put the phone and computer on the same trusted network.
6. Find the computer's LAN IP and run:

```sh
cd apps/mobile
flutter run -d <DEVICE_ID> --flavor dev \
  --dart-define=API_BASE_URL=http://<COMPUTER_LAN_IP>:3002/api/v1
```

`localhost` on a physical phone means the phone itself, not the developer
computer. The backend must therefore be reachable through the computer's LAN
address, or through a deliberately configured debugging tunnel.

To build and install a development APK:

```sh
cd apps/mobile
flutter build apk --debug --flavor dev \
  --dart-define=API_BASE_URL=http://<COMPUTER_LAN_IP>:3002/api/v1
adb install -r build/app/outputs/flutter-apk/app-dev-debug.apk
```

If `adb` is not found, add the Android SDK `platform-tools` directory to the
terminal PATH or use Android Studio's terminal. Do not treat a debug APK as a
store-ready release.

### Wireless debugging

On Android 11 or newer:

1. Keep phone and computer on the same trusted Wi-Fi.
2. Enable **Wireless debugging** in Developer options.
3. Choose **Pair device with pairing code**.
4. Run `adb pair <PHONE_IP>:<PAIRING_PORT>` and enter the displayed code.
5. Run `adb connect <PHONE_IP>:<DEBUG_PORT>`.
6. Confirm with `flutter devices`, then use the same `flutter run -d` command.

Pairing and connection ports can differ. Turn wireless debugging off when it
is no longer needed, especially on public networks.

---

## Quality gate

```sh
corepack pnpm verify
```

Runs `format:check` → `lint` → `typecheck` → `test` → `build` for the TypeScript
workspace. Flutter checks are separate (`flutter analyze`, `flutter test`) and
run in CI ([ci-cd.md](./ci-cd.md)).

Useful explicit checks:

```sh
corepack pnpm test:integration:backend
cd apps/mobile
dart format --output=none --set-exit-if-changed lib test tool
flutter analyze --fatal-infos
flutter test
```

Unit tests prove small pieces. PostgreSQL integration tests prove real database
behavior. Flutter widget tests prove UI/state behavior in a test harness. None
of these alone proves the complete physical-device journey.

## Development versus production

| Development              | Production                                          |
| ------------------------ | --------------------------------------------------- |
| Local Docker database    | Managed, backed-up database                         |
| Local/test OTP allowed   | Approved real SMS/DLT provider only                 |
| Debug APK and hot reload | Signed, versioned store artifact                    |
| Localhost/LAN API        | HTTPS production API and controlled DNS             |
| Developer terminal logs  | Central logs, metrics, alerts and incident runbooks |
| Test/sample data         | Protected real customer/business data               |
| Easy restart             | Controlled deployment, migration and rollback       |

Current local success must never be reported as production proof.

---

## Related

- [local-demo-checklist.md](./local-demo-checklist.md) — enquiry → claim → quote → booking
- [environment.md](./environment.md)
- [ci-cd.md](./ci-cd.md)
- [Database docs](../03-database/README.md)
