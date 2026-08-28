# ERP Production Build Baseline — STAB-12

- **Verified:** 26 August 2026 13:32 IST (Asia/Kolkata, +0530)
- **Repository:** `/Users/vinaychilagani/Desktop/Mee Event V1`
- **Branch / starting commit:** `master` / `4afbb688e1899ed881612a69239681069f419de7`
- **Starting upstream state:** `origin/master`, ahead 12 and behind 0, clean
- **Result:** **COMPLETED WITH FINDINGS**
- **Scope:** Next.js production compilation, generated artifact, public environment, dependency, header, local-start, fixture, CI, and deployment boundaries only

STAB-12 proves that the Employee CRM/ERP compiles and starts locally as a normal
Next.js production application under a synthetic production configuration. It
does not prove browser workflows, backend connectivity, standalone packaging,
hosting, deployment, or production readiness. The production-visible fixture
finding described below is not hidden and remains outside this build block.

## Toolchain and dependency baseline

| Item               | Verified value                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Host               | Darwin 25.5.0, arm64                                                                                              |
| Node               | `v20.20.2`                                                                                                        |
| pnpm               | `9.15.4` through Corepack; matches the root `packageManager` pin                                                  |
| Next.js            | `15.5.23`                                                                                                         |
| React / React DOM  | `19.2.3` / `19.2.3`                                                                                               |
| TypeScript         | `5.7.2`                                                                                                           |
| ESLint             | `9.17.0`                                                                                                          |
| Frozen install     | `corepack pnpm install --frozen-lockfile` passed; manifests, workspace configuration, and lockfile did not change |
| Shared build order | `@me-event/shared-types` then `@me-event/api-contracts`, matching CI; both passed                                 |

Fresh registry-backed audits on 26 August 2026 returned:

| Audit                | Critical | High | Moderate | Low | Dependency rows |                   Command exit |
| -------------------- | -------: | ---: | -------: | --: | --------------: | -----------------------------: |
| Full workspace       |        0 |    0 |        0 |   2 |             804 |   1 because low findings exist |
| Production workspace |        0 |    0 |        0 |   1 |             238 | 1 because a low finding exists |

The full low findings are `@eslint/plugin-kit@0.2.8` through ESLint and
`@supabase/auth-js@2.64.4` through the backend's Supabase dependency. Only the
Supabase row is present in the production audit. Neither is an ERP application
runtime path, no critical/high risk was accepted, and STAB-12 made no dependency
change. Dependency automation and narrowly supported follow-up remain owned by
STAB-16 and the relevant later dependency/security slices.

## Build configuration and environment boundary

The canonical workspace build is
`corepack pnpm --filter @me-event/erp-web build`, which invokes `next build`.
`next.config.ts` keeps `typedRoutes`, `reactStrictMode`, and monorepo-root output
tracing enabled, disables `X-Powered-By`, and does not select
`output: "standalone"`. `tsconfig.json` is strict, uses bundler resolution, and
includes ignored `.next/types/**/*.ts` when generated.

Only these browser-public variables are supported:

- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_API_BASE_URL`

Development defaults to `http://localhost:3002/api/v1`. Staging and production
require an explicit syntactically valid HTTPS URL and reject `localhost`,
`127.0.0.1`, and `::1`. The committed templates contain public example values
only. No server secret is placed in a `NEXT_PUBLIC_*` key.

Every build and start process used a minimal process environment with:

```text
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://mee-events-stab12.invalid/api/v1
NEXT_TELEMETRY_DISABLED=1
```

The ignored local `.env.local` was moved to a private temporary holding
directory under a shell trap for each relevant command, then restored. Its
contents were never read, printed, copied, or used. No repository environment
file was created or changed.

Fail-closed build probes produced the expected results:

| Probe                                      | Result                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Production API URL absent                  | Exit 1 during `/catalog` page-data configuration; explicit required-variable error |
| Production API URL malformed (`not-a-url`) | Exit 1 during `/catalog` page-data configuration; explicit valid-URL error         |
| HTTP staging URL                           | Existing environment unit test rejects HTTPS violation                             |
| HTTPS loopback production URL              | Existing environment unit test rejects loopback host                               |
| Synthetic production URL                   | Both clean production builds and the local production start passed                 |

Error output named the rejected configuration rule without echoing any real or
rejected secret value.

## Clean build results

Before every build, the exact ignored
`/Users/vinaychilagani/Desktop/Mee Event V1/apps/erp-web/.next` path was verified,
removed, and confirmed absent. No source or unknown path was deleted.

| Evidence                    | Build 1                                                            | Build 2                                                            |
| --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Exit / duration             | 0 / 15.86 s                                                        | 0 / 16.30 s                                                        |
| Next version                | 15.5.23                                                            | 15.5.23                                                            |
| Compile                     | Passed in 5.0 s                                                    | Passed in 5.1 s                                                    |
| Type validation             | Passed                                                             | Passed                                                             |
| Page data                   | Passed                                                             | Passed                                                             |
| Static generation           | 37/37 units                                                        | 37/37 units                                                        |
| Warnings                    | None                                                               | None                                                               |
| Files                       | 398                                                                | 398                                                                |
| Content bytes               | 128,308,104                                                        | 128,308,903                                                        |
| Disk allocation             | 126,256 KiB                                                        | 126,256 KiB                                                        |
| Build ID                    | `FP4ZFtlyyzXIRDQ0oYzB9`                                            | `CLQG9HIys-Eci_2Q3pNO1`                                            |
| Full sorted-manifest digest | `11f17bf22dbd99386c0e88e42a7709142c6c8cf03778d78195ba54579de469ec` | `f42a1a54a7d9c9c4b62c3e1ce30cf6ee5dc6de7052cdeee01eb823676989b3c0` |

The output is deliberately described as **reproducible enough**, not
byte-for-byte reproducible. The comparison found two build-ID-named files only
in each artifact and 131 common paths with different bytes. The differences are
fully explained by:

- the randomized `BUILD_ID` and two build-ID-named static manifests;
- randomized preview-mode ID/signing/encryption values;
- nondeterministic object insertion order in otherwise equal route/build
  manifests;
- build-ID/order propagation into prerendered HTML, RSC, and client-reference
  manifests;
- webpack caches, Next trace timing, and generated 404/500 output.

After normalizing the build ID and sorting JSON keys, route, app-path,
app-build, build, and prerender route data are semantically equal. The three
preview values differ but retain the same field set and lengths. A 262-file
stable subset containing compiled application/server/client code and excluding
the classified build-instance outputs above is identical in both builds, with
digest `5a1a8715e135dcd4f9c0b3b8d1cbb09e5deafd9dca94617da57b4e9fcbcd29b4`.
No application JavaScript chunk, CSS chunk, or route mapping differed.

## Route inventory

Source inventory found 44 maintained `src/app/**/page.tsx` pages, one root
layout, no maintained `loading.tsx`, and no maintained `error.tsx`,
`global-error.tsx`, or `not-found.tsx`. Build output and
`app-path-routes-manifest.json` agree:

| Route class                               |                      Count |
| ----------------------------------------- | -------------------------: |
| Maintained pages                          |                         44 |
| Compiled maintained routes                |                         44 |
| Static maintained routes                  |                         33 |
| Dynamic/server-rendered maintained routes |                         11 |
| Parameterized routes                      |                         10 |
| Missing / unexpected maintained routes    |                      0 / 0 |
| Framework route                           | One expected `/_not-found` |

All ten parameterized routes are dynamic. `/catalog` is the additional dynamic
route: its server fetches use `cache: "no-store"` and occur on request, not
during build. The production build did not contact the synthetic `.invalid`
host, and the runtime smoke intentionally did not request `/catalog`. There are
no custom rewrites. Next emits its standard internal trailing-slash 308
redirect rule.

## Artifact inventory and runtime model

The second successful artifact contained:

| Class                           | Evidence                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Total                           | 398 files; 128,308,903 content bytes; 126,256 KiB disk allocation                      |
| JavaScript / JSON / CSS         | 163 / 69 / 1                                                                           |
| Prerender HTML / RSC / metadata | 36 HTML / 34 RSC / 34 metadata files                                                   |
| Generated types                 | 50 files under `.next/types` (49 TypeScript plus its package metadata)                 |
| Server chunks                   | 4 files                                                                                |
| Client/static output            | 61 files                                                                               |
| Cache                           | 10 files; 122+ MiB of the content footprint is webpack/type cache                      |
| Traces                          | 50 `.nft.json` manifests plus `.next/trace`                                            |
| Source maps                     | 0; `productionBrowserSourceMaps` remains false                                         |
| Middleware                      | Three empty/default middleware manifest files; no maintained middleware implementation |
| Standalone                      | No `.next/standalone`; `output: "standalone"` is absent                                |

This is normal Next runtime output, not a standalone deployment package. The
canonical package start is `next start --port 3001`; it requires the compatible
Next/React runtime in `node_modules` and the repository/package layout. File
traces contain Next, React, React DOM, Sharp, SWC helpers, and their runtime
support. ERP source imports workspace contract packages only as TypeScript
types, so no workspace-package runtime entry appears in the traces; the build
still requires the API-contract declaration output, which in turn requires the
shared-types build. Both remain declared workspace dependencies.

No source map is emitted. Absolute developer paths are nevertheless present in
server-only Next metadata, generated server/client-reference files, trace/cache
data, and generated route types because this is a repository-layout artifact.
No browser static chunk contained the developer path. This is a packaging and
server-artifact disclosure consideration for the eventual hosting design, not
a secret and not standalone-deployment proof.

## Generated-file behavior

The tracked pre-build `next-env.d.ts` hash was
`f2b3bca04d1bfe583daae1e1f798c92ec24bb6693bd88d0a09ba6802dee362a8`.
Next rewrote it during each build to add a triple-slash reference to generated
`.next/types/routes.d.ts` (post-build hash
`85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`).
That generated reference conflicts with the repository's ESLint
triple-slash-reference rule. The exact tracked pre-build form was restored with
a scoped patch after recording each behavior. Generated routes are still
typechecked through the explicit `.next/types/**/*.ts` tsconfig include.

Typechecking passed once with valid generated `.next/types` present and again
after `.next` was removed. The final workspace has no `.next` output and the
tracked file is byte-for-byte at its pre-build hash. No generated file is
committed.

## Fixture, sample, environment, and secret review

| Surface               | Classification                                              | Evidence and owner                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/leads`              | **Unlabeled synthetic fixture; production-visible finding** | Eight `DUMMY_LEADS` records with `lead-demo-*` IDs, realistic names, Indian mobile numbers, events, owners, and references are bundled into the leads client chunk. There is no evidence they are real people, but the screen does not label them as demo data. Replacing this state safely requires the real lead inbox, pagination, authorization, and error behavior; owners CRM-06, CRM-24, CRM-26, and STAB-18. |
| `/` dashboard         | Labeled synthetic sample                                    | Illustrative metrics/identities are explicitly labeled sample/local data, `SYNC OFF`, and “No live customer records”; CRM-04/STAB-18 still own replacement.                                                                                                                                                                                                                                                          |
| `/login`              | Labeled local seed/scaffold                                 | A local seed mobile number and API-supplied debug code are displayed as local-development aids; production suppression remains CRM-01/CRM-24/STAB-20.                                                                                                                                                                                                                                                                |
| Quote/finance actions | Unlabeled fixed scaffold values                             | Fixed starter quotation, invoice, expense, payment, settlement, and payout amounts appear in production client bundles; their business/integrity owners remain CRM-12/24 and ERP-13–16/20/22.                                                                                                                                                                                                                        |
| Public environment    | Expected public configuration                               | The synthetic `.invalid` URL appears in root HTML and server/client chunks. The hard-coded development localhost fallback also remains in server/client code; neither is secret.                                                                                                                                                                                                                                     |

The fixture-free production subcriterion is therefore **not satisfied**. STAB-12
does not describe this as “no fixture leakage,” and did not replace real workflow
work with an invented empty or fake state. The values are classified as
synthetic based on explicit dummy/demo identifiers and source purpose; no
evidence that the PII-shaped fixture values are real was found, and no
credential or secret was found.

Artifact scans found no `.env` file, private-key marker, JWT-shaped literal,
credential-bearing database URL, hard-coded bearer credential, provider key, or
private environment value. The intentionally public synthetic URL is present as
expected. Local environment values were not available to the build or scan.

## Security headers and local production start

The safe smoke ran:

```text
corepack pnpm --filter @me-event/erp-web exec next start \
  --hostname 127.0.0.1 --port 33012
```

with the same minimal synthetic environment. The sandbox initially denied the
loopback bind with `EPERM`; after narrowly scoped loopback permission, Next
15.5.23 became ready in 588 ms. Results:

| Route                       | Status | nosniff | Referrer policy                   | Frame policy | X-Powered-By |
| --------------------------- | -----: | ------- | --------------------------------- | ------------ | ------------ |
| `/`                         |    200 | present | `strict-origin-when-cross-origin` | `DENY`       | absent       |
| `/login`                    |    200 | present | `strict-origin-when-cross-origin` | `DENY`       | absent       |
| `/__stab12_missing_route__` |    404 | present | `strict-origin-when-cross-origin` | `DENY`       | absent       |

Content-Security-Policy, Permissions-Policy, and env-gated
Strict-Transport-Security were added later in SEC-05
(`docs/05-security/sec-05-web-api-hardening-inventory.md`). The STAB-12 smoke
table above remains the freeze (those three headers were absent at STAB-12).
Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy were not added.
Response HTML contained no private-key or JWT-shaped marker. Only `/`,
`/login`, and the 404 probe were requested, so no API call was triggered. The
process was interrupted cleanly, the trap restored `.env.local`, and port
33012 had no remaining listener.

## Quality and CI alignment

| Check                                              | Result                        |
| -------------------------------------------------- | ----------------------------- |
| ERP lint after tracked `next-env.d.ts` restoration | PASS, 0 errors / 0 warnings   |
| ERP typecheck with generated `.next/types` present | PASS                          |
| ERP tests                                          | PASS, 3/3 files and 8/8 tests |
| ERP typecheck after removing `.next`               | PASS                          |
| Root formatting                                    | PASS                          |
| Shared types / API contracts builds                | PASS / PASS                   |

CI uses Ubuntu 24.04, Node 20.20.2, pnpm 9.15.4, a frozen install, the same shared-package
build order, and recursive `pnpm build`, which reaches the ERP `next build`
script. STAB-16 now provides `NEXT_PUBLIC_APP_ENV=production` and the synthetic
public URL `https://api.ci.mee-events.invalid/api/v1`, matching the fail-closed
production boundary without a real endpoint. CI does not retain, hash, attest,
start, or deploy the ERP artifact. STAB-12 claimed no remote CI run; STAB-16
later ran the synthetic production ERP compile green on `999443d`.

## Remaining gaps, owners, and evidence limits

- Production-visible lead fixtures and fixed operational/financial scaffold
  values: CRM-04/06/12/24/26, ERP-13–16/20/22, and STAB-18.
- CSP/Permissions-Policy/HSTS were added in SEC-05 with findings (Next requires
  `'unsafe-inline'`; `'unsafe-eval'` is limited to development/test). Browser
  token/XSS posture, route and capability enforcement remain STAB-17,
  CRM-01–03/24/26.
- CI artifact retention/attestation remain open. STAB-16 injects the synthetic
  production public environment and the ERP compile succeeded on `999443d`.
- Hosting, immutable packaging, TLS/edge policy, deployment, rollback, and
  observability: PROD-01–06 after architecture/provider decisions.
- Browser E2E, backend/API connectivity, database/provider behavior, and
  production hosting were not exercised. `/catalog` was not requested during
  runtime smoke. Static scanning is not a DAST or penetration test.

## Definition-of-done assessment

| Requirement                                           | Result                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Clean starting Git baseline                           | PASS                                                                            |
| Frozen installation and current audits                | PASS; two low full/one low production documented                                |
| No unaccepted critical/high advisory                  | PASS                                                                            |
| Shared package build order                            | PASS                                                                            |
| Two clean production-configured builds                | PASS                                                                            |
| All maintained routes compile                         | PASS, 44/44                                                                     |
| Reproducibility                                       | PASS with classified Next build-instance variance; stable code subset identical |
| Artifact/runtime model inventoried                    | PASS                                                                            |
| Production environment fails closed                   | PASS                                                                            |
| No real secret/private environment leakage            | PASS                                                                            |
| Fixture/sample exposure classified                    | PASS                                                                            |
| Fixture-free production route                         | **FINDING / NOT SATISFIED**; `/leads` remains fixture-backed                    |
| Security headers and bounded local start              | PASS with missing-hardening findings                                            |
| ERP lint/typecheck/tests and clean-checkout typecheck | PASS                                                                            |
| Generated output excluded                             | PASS                                                                            |
| Production readiness                                  | NOT CLAIMED                                                                     |

## Verification commands

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm audit --json`
- `corepack pnpm audit --prod --json`
- `corepack pnpm --filter @me-event/shared-types build`
- `corepack pnpm --filter @me-event/api-contracts build`
- fail-closed and two clean `corepack pnpm --filter @me-event/erp-web build` runs under the recorded sanitized environment
- sorted SHA-256 artifact manifests and canonicalized route-manifest comparison in private temporary storage
- loopback-only `next start` plus `/`, `/login`, and 404 requests
- `corepack pnpm --filter @me-event/erp-web lint`
- `corepack pnpm --filter @me-event/erp-web typecheck` with and without `.next`
- `corepack pnpm --filter @me-event/erp-web test`
- `corepack pnpm format:check`
- `git diff --check` and final secret-safe diff/status review

Phase 0 remains **NOT PASSED**. STAB-13 is the next permitted block and was not
started during STAB-12.
