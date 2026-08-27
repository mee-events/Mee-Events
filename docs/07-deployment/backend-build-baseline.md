# Backend Build Baseline

- **Task:** STAB-11 — Backend build
- **Verified:** 26 August 2026 (IST)
- **Starting commit:** `d113e0865d0b7f09e47ba51cb553a0e472852f41`
- **Result:** **PASS** — deterministic, secret-safe compilation with an honestly bounded startup proof
- **Production readiness:** **Not established**

This baseline proves that the maintained NestJS application source compiles
reproducibly into the configured production artifact. It does not prove a
deployed service, PostgreSQL behavior, provider connectivity, migrations,
container packaging, traffic handling, monitoring, or production readiness.

## Toolchain and command

| Item                      | Verified value                                             |
| ------------------------- | ---------------------------------------------------------- |
| Node.js                   | `v20.20.2`; repository engine is `>=20.11.0`               |
| pnpm                      | `9.15.4` through Corepack; matches `packageManager` and CI |
| Nest framework / CLI      | `11.2.3` / `11.0.24`                                       |
| TypeScript                | `5.7.2`                                                    |
| Canonical backend command | `corepack pnpm --filter @me-event/backend build`           |
| Package script            | `nest build`                                               |

`corepack pnpm install --frozen-lockfile` completed for all five TypeScript
workspace projects in 7.9 seconds. pnpm reported the lockfile up to date and
performed no resolution or dependency upgrade. The package manifests and
`pnpm-lock.yaml` remained unchanged. The configured registry was the public npm
registry, and no credential-bearing registry or package URL was found.

The workspace runtime dependencies were rebuilt first with their existing
commands:

- `corepack pnpm --filter @me-event/shared-types build`
- `corepack pnpm --filter @me-event/api-contracts build`

This matches CI's explicit shared-contract prerequisite and prevents the
backend build from relying on stale workspace output.

## Build configuration and source boundary

| Setting                | Effective value                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Nest source root       | `src`                                                                                 |
| Nest TypeScript config | `tsconfig.build.json`                                                                 |
| Output directory       | `apps/backend/dist`                                                                   |
| Output cleanup         | `deleteOutDir: true`                                                                  |
| Module / resolution    | `commonjs`; `moduleResolution` is not explicitly set in the project                   |
| JavaScript target      | `ES2022`                                                                              |
| Declarations           | Enabled                                                                               |
| Source maps            | Enabled                                                                               |
| Comments               | Removed                                                                               |
| Incremental build      | Enabled                                                                               |
| Strictness             | `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` remain enabled |

The development project includes `src/**/*.ts`, `test/**/*.ts`, and
`scripts/**/*.ts`: 129 application roots, 32 test/helper roots, and two
operational-script roots. The production build config extends that project but
excludes `test`, `scripts`, `**/*.spec.ts`, `node_modules`, and `dist`. Its
effective TypeScript root list contains all 129 application source files and no
test or operational-script root. No compiler option, source boundary, or
strictness rule was weakened for the build.

The two workspace packages emit from their own `src` roots to `dist` with
declarations. `api-contracts` inherits its NodeNext/declaration configuration
from `shared-types`. The backend uses both packages at runtime, so their built
outputs are part of the deployment layout even though they are not copied into
the backend artifact.

## Sanitized build evidence

Application-specific environment variables were removed from the build
process while retaining the normal operating-system and toolchain environment.
The compiler did not start Nest, load the local ignored `.env`, connect to a
database, or invoke a provider.

| Run     | Result | Wall time | Sorted per-file hash-manifest SHA-256                              |
| ------- | ------ | --------: | ------------------------------------------------------------------ |
| Build 1 | Exit 0 |    4.41 s | `6653039693b1ebb9eb08369a1c45ee52688fa2d91f9b1352eb16dd757164ece2` |
| Build 2 | Exit 0 |    3.57 s | `6653039693b1ebb9eb08369a1c45ee52688fa2d91f9b1352eb16dd757164ece2` |

The sorted manifests contained each relative artifact path and its SHA-256.
They matched byte for byte, proving identical file names and file content; the
first inventory and matching hashes also establish identical sizes. The
manifests were held outside Git and were not committed.

### Clean-output proof

After Build 1, a harmless
`dist/__stab11_delete_outdir_sentinel__.txt` file was created. Build 2 removed
the sentinel and regenerated the artifact. No source or user-owned file was
touched. This directly proves the configured `deleteOutDir` behavior rather
than assuming it from `nest-cli.json`.

## Artifact inventory

| Item                |                         Evidence |
| ------------------- | -------------------------------: |
| Artifact directory  |              `apps/backend/dist` |
| Entrypoint          |      `apps/backend/dist/main.js` |
| Total files         |                              388 |
| JavaScript          |                              129 |
| Declarations        |                              129 |
| Source maps         |                              129 |
| JSON/static assets  |                                0 |
| Build metadata      | 1 (`tsconfig.build.tsbuildinfo`) |
| Exact content bytes |                        2,114,896 |
| Filesystem size     |                          3.0 MiB |

`dist/main.js` exists with ordinary read permissions and passes Node syntax
checking. Every one of the 129 maintained source roots has a corresponding
JavaScript artifact. The largest file is the 214,469-byte TypeScript build-info
file; the largest application JavaScript file is the operations PostgreSQL
repository at 88,488 bytes.

The artifact contains the application entrypoint, configuration, database and
common infrastructure plus all 19 module directories: audit, authorization,
bookings, catalog, CRM, enquiries, event records, finance, health, identity,
inventory, manager operations, operations, payments, platform foundation,
quotations, search, vendors, and workers.

Boundary checks found:

- zero test paths or test-named files;
- zero spec files;
- zero operational-script paths or script-named files;
- zero environment files;
- zero JSON, media, design, or other static asset copies;
- no missing application JavaScript output.

## Runtime dependency model

The artifact is compiled JavaScript, not a bundle or standalone executable. It
requires Node.js, production `node_modules`, and the built workspace packages in
the pnpm workspace/deployment layout. Emitted code has runtime imports for:

- `@me-event/api-contracts` and `@me-event/shared-types`;
- Nest common/config/core/JWT/Swagger and `nestjs-pino`;
- `pg`, `zod`, `libphonenumber-js`, and `reflect-metadata`;
- Node's built-in crypto module.

The backend manifest declares these direct runtime dependencies and its Nest
platform/logging/transitive runtime support. Node resolved the two workspace
imports to `packages/api-contracts/dist/index.js` and
`packages/shared-types/dist/index.js`, and a valid-configuration load of the
compiled `AppModule` succeeded from a clean temporary working directory. The
package `start` script points to the verified `dist/main.js` entrypoint.

Copying only `apps/backend/dist` is therefore insufficient. There is no
Dockerfile, production package assembly, dependency-pruning recipe, container
image, deploy workflow, or artifact upload in this repository.

## Compiled configuration validation

The compiled `dist/config/environment.js` validator was exercised with
synthetic values only. Rejected values were checked programmatically against
the resulting messages; no supplied database URL, signing/HMAC material, or
SMS credential appeared in an error.

| Case                                          | Expected                            | Result |
| --------------------------------------------- | ----------------------------------- | ------ |
| Missing production configuration              | Reject                              | PASS   |
| Template placeholder signing/HMAC values      | Reject                              | PASS   |
| Short signing/HMAC values                     | Reject                              | PASS   |
| Local OTP in production                       | Reject                              | PASS   |
| External OTP without conditional SMS settings | Reject                              | PASS   |
| Wildcard production CORS                      | Reject                              | PASS   |
| HTTP loopback production CORS                 | Reject for HTTPS and loopback rules | PASS   |
| Template database credentials/host            | Reject                              | PASS   |
| Complete synthetic production configuration   | Accept                              | PASS   |
| Rejected-value redaction                      | No rejected secret value in error   | PASS   |

The valid synthetic configuration used reserved `.invalid` hosts and was
validated only; no network client was created. Known configuration limitations
remain: the database URL schema does not require TLS/`sslmode`, the external
SMS credential has provider-independent presence/placeholder checks rather
than a vendor-specific format, and real provider selection is still pending.

## Startup and module-path smoke

From an empty temporary working directory with all application configuration
removed, `node apps/backend/dist/main.js` reached Nest bootstrap and exited 1
on the required-key validation before database/provider initialization. The
error named missing keys but contained no rejected value. With valid synthetic
configuration, the compiled `AppModule` and all runtime imports loaded with
exit 0.

A full valid-configuration listen smoke was deliberately not run. Two outbox
processors call `tick()` from `OnModuleInit`, which immediately calls
`Pool.connect()`. Even a reserved/non-routable host would constitute an
outbound database attempt. The task explicitly permits configuration rejection
plus module-load proof where a full listen cannot be performed safely. The
missing-config process exited, the valid module-load process exited, the test
port had no listener, and no backend server was left running.

Listening state, liveness/readiness routing, shutdown under active work, and
database-backed startup must be proven with the isolated PostgreSQL work in
STAB-14/STAB-15 and the later production topology. No real PostgreSQL, Redis,
SMS, Supabase, payment, storage, email, or notification connection occurred in
STAB-11.

## Source maps, declarations, and metadata

All 129 JavaScript files carry source-map directives. The 129 maps reference
129 relative source paths, contain no `sourcesContent`, and contain no absolute
developer path. They disclose module/source names if a deployment publishes
them, but the Nest process does not itself serve `dist` as static content.
Production packaging must decide whether maps belong in private observability
artifacts rather than a public surface.

Declarations and `tsconfig.build.tsbuildinfo` are not required to execute the
backend. They are harmless for correctness but add 130 files and deployment
size. The build-info file records 868 relative compiler input paths and no
absolute path. Packaging/pruning belongs to production infrastructure work; no
output setting was changed merely for cosmetic size reduction.

## Artifact and logging security review

The generated artifact scan found:

- zero private-key headers, JWT-shaped literals, common cloud/token prefixes,
  or credential-bearing URLs;
- zero absolute developer/home paths and zero debugger statements;
- zero environment files or real configuration values;
- one file containing known placeholder detector strings:
  `dist/config/environment.js`. These are fail-closed validation rules, not
  configured secrets.

Pino redacts authorization headers, OTP request codes, and response cookies.
The global exception filter returns generic messages for unexpected/server
errors. Remaining operational gaps are unchanged: refresh-token and wider PII
redaction needs a complete STAB-20 review, local process stack traces contain
runtime filesystem paths, and Swagger is registered unconditionally at
`/api/docs`. Production log access, debug levels, stack handling, and Swagger
exposure require SEC-05/production policy rather than an STAB-11 redesign.

## CI alignment

CI uses Node 20.20.2 from root `.node-version`, pnpm 9.15.4, the same frozen lockfile, explicit shared-package
builds, then root `pnpm build`. The root recursive build includes the backend's
same `nest build` script. Compilation needs no hidden application configuration.
STAB-16 also adds the separate PostgreSQL integration job; it is not a compiled
backend startup or packaging smoke.

CI does not:

- isolate the backend build as its own named artifact check;
- compare reproducibility hashes or prove `deleteOutDir`;
- run a compiled configuration/startup smoke;
- upload or retain a backend artifact;
- prune production dependencies or build a container;
- deploy to staging/production or verify rollback/readiness.

Those remaining packaging/runtime items are production-infrastructure
responsibilities. STAB-16 pins the verified Node minor but has no remote GitHub
run yet.

## Known gaps and ownership

| Severity      | Gap                                                                                                                              | Owner / follow-up                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| High          | No production host, image/package, secret injection, TLS, deploy, rollback, or readiness proof                                   | PROD-01 through PROD-06                                          |
| High          | Full startup immediately attempts PostgreSQL through two outbox processors; no isolated live-DB startup was run here             | STAB-14/STAB-15, then PROD-03/04                                 |
| Medium        | Production database TLS is not enforced by the environment schema                                                                | PROD-03 / STAB-20 policy review                                  |
| Medium        | Swagger is always registered and log redaction/stack policy is incomplete                                                        | SEC-05 in STAB-20                                                |
| Medium        | CI does not retain, smoke, or attest the backend artifact                                                                        | STAB-16                                                          |
| Low           | Maps, declarations, and build metadata are emitted but not needed at runtime                                                     | Production packaging / PROD-04                                   |
| Informational | `@supabase/supabase-js` is a production dependency for excluded operational scripts, so a generic production install includes it | Dependency/package review after operational packaging is defined |

## Verification commands

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @me-event/shared-types build
corepack pnpm --filter @me-event/api-contracts build
corepack pnpm --filter @me-event/backend build
corepack pnpm --filter @me-event/backend lint
corepack pnpm --filter @me-event/backend typecheck
corepack pnpm format:check
git diff --check
```

The sanitized build, compiled validation matrix, temporary hash manifests,
sentinel, secret-pattern scan, and temporary-working-directory module checks
used bounded local commands described above. Synthetic credential literals and
local environment values are intentionally not reproduced here.

## Evidence limitations

This is build and module-resolution evidence on macOS using Node v20.20.2. At
the time of STAB-11, CI floated the Node 20 minor and did not run remotely;
STAB-16 later aligned the local workflow to 20.20.2, still pending remote proof.
No server listened under valid configuration because doing so would
initiate a database connection. No database, provider, HTTP integration,
Docker, load, deployment, or public source-map exposure test was performed.
The artifact is reproducible under the recorded local source/toolchain and is
secret-safe under the documented scans; it is not a deployable production unit
by itself.
