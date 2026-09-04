# CUST-04 Customer Bootstrap Remediation Evidence

**Status:** INDEPENDENTLY REVIEWED AND CLOSED — 4 SEPTEMBER 2026
**Remediation date:** 4 September 2026
**Branch:** `master`
**Starting HEAD:** `b7b25691ddcfa82cba18ff23923fcdbc765a9e5b` (`b7b2569`)
**Starting HEAD subject:** `feat(customer): complete CUST-03 session`
**Independent review:** Claude — **READY TO CLOSE**, no blocking findings

This is the evidence record for the requested CUST-04 remediation. It does not
authorize CUST-05, claim production readiness, or change the accepted CUST-02
and CUST-03 findings.

## Protected starting checkpoint

Before remediation, the branch, HEAD, recent commits, staged index, status, and
complete existing CUST-04 diff were inspected. There were no staged changes,
but the worktree already contained substantial tracked and untracked CUST-04
implementation plus beginner-training documentation. The complete tracked diff
was approximately 1,900 lines at that point.

Those pre-existing changes were treated as protected user work. No reset,
clean, checkout, stash, rebase, amend, branch change, unrelated rewrite, or
database migration was performed. The remediation retained and extended:

- `AGENTS.md` and `.cursor/rules/beginner-engineering-training.mdc`;
- the CUST-04 bootstrap implementation and tests;
- the roadmap, evidence, beginner path, interview knowledge, overview, and
  local-development documentation; and
- all unrelated application work already present in the dirty worktree.

Canonical architecture, API, authentication, authorization, branch, testing,
ADR 0004/0010, product-role, database schema, repository, session, model, and
test sources were read before the remediation policy was chosen.

## Confirmed defects

The audit reproduced the four reported problem groups:

1. Flutter pinned the exact policy version and complete module/capability
   catalogs, so a safe additive server deployment could break installed apps.
2. PostgreSQL `scope_type` was discarded by the identity adapter, and branch
   resolution could interpret any `scopeId`—including a vendor UUID—as a
   branch.
3. Refresh, bootstrap, logout, account replacement, and role switching relied
   on fragile `AuthSession` object identity rather than logical session and
   mutation ordering.
4. `actorSessionId` was not reconciled with authentication state, while
   `generatedAt` risked becoming a device-clock freshness rule instead of
   provenance.

The old evidence also overclaimed a clean remediation checkpoint and described
the exact-pinning/object-identity behavior as complete. This record corrects
those statements rather than carrying them forward.

An independent Security Review then reported four additional findings: vendor
membership could be combined with a role grant for a different vendor, logout
cleared in-memory authentication only after persistent cleanup, sensitive-path
matching was case-sensitive while Express routing is not, and the bootstrap
HTTP test injected `request.user` instead of exercising `AccessTokenGuard`.
Those four findings were remediated. A subsequent fresh Security Review found
one High and three Medium issues: note IDs could cross vendor relationships,
the vendor-self dashboard returned detail fields at runtime, CRM and
vendor-self notes shared the wrong trust path, and a trailing slash bypassed
bootstrap no-store matching. Those findings were remediated. Claude's final
review then identified generated Next.js declaration lifecycle, test-driven
production DI defaults, ambiguous multi-vendor self-note selection, incomplete
HTTP authorization fakes, and TypeScript/Flutter UTC-validation drift. This
final correction pass addressed those findings below. Claude's fresh final
independent review of the complete diff approved CUST-04 as **READY TO CLOSE**.

## Implemented policy compatibility

The shared TypeScript contract now owns a runtime-validated bootstrap schema
with three distinct compatibility signals:

- `schemaVersion` identifies the exact structural `/api/v1` response;
- `minimumClientBootstrapVersion` rejects clients that cannot safely interpret
  a genuine breaking requirement; and
- `policyVersion` is a well-formed opaque policy revision, not an exact client
  equality pin.

Flutter strictly validates required actor/session identity, Hyderabad branch,
surface, landing, role assignment, security controls, and Customer baseline
modules/capabilities. It accepts a later well-formed policy revision and safe
unknown additive modules/capabilities, but rejects:

- a missing required baseline;
- malformed, duplicate, or inactive assignment data;
- known cross-role modules/capabilities that would contradict Customer least
  privilege;
- incompatible schema or minimum-client versions; and
- malformed identity, routing, branch, or control structures.

`generatedAt` must be a valid RFC 3339 UTC timestamp ending in `Z` in both the
TypeScript runtime schema and Flutter, but authorization never depends on the
mobile device clock. A non-UTC numeric offset is rejected. Under ADR 0004, a
breaking structural contract is a new `/api/v2` surface; the server must raise
the minimum-client version when a client upgrade is genuinely required.

Bootstrap capabilities remain UI guidance only. Protected backend routes
continue to enforce server-side capability, branch, owner, and membership
rules.

## Implemented role-scope model

`RoleAssignment` now preserves `scopeType` from PostgreSQL through shared
types, repository mapping, authenticated principals, authorization checks, and
bootstrap serialization. Operational `branchId` remains separate.

The smallest Phase 1 policy consistent with the existing architecture is:

| Scope    | Supported pairing                                    |
| -------- | ---------------------------------------------------- |
| `branch` | Any platform role at canonical Hyderabad             |
| `global` | `administrator` only, without `scopeId`              |
| `vendor` | `vendor_owner` or `vendor_member` with a vendor UUID |

Every supplied assignment is validated. Unsupported pairings, malformed IDs,
non-Hyderabad branch grants, and exact duplicates fail closed. Inactive grants
never authorize the active role. Distinct legitimate multiple grants are
retained without broadening privileges.

Branch resolution only reads explicit operational branch context or
branch-typed grants. Global and vendor grants fall back to the Phase 1
Hyderabad operational branch; a vendor UUID is never treated as a branch UUID.
Vendor-resource services still independently require active ownership or
membership in `vendor_members`, including cross-vendor denial. Vendor
self-service authorization now intersects three facts for the same requested
resource: the active role must be `vendor_owner` or `vendor_member`, an active
assignment must grant that exact vendor (or Hyderabad branch), and the caller
must have an active `vendor_members` row for that vendor. A Vendor A grant can
never combine with Vendor B membership. The shared service check covers
dashboards, lists/details, accept/reject/progress, notes, and future vendor
self-resource calls; multiple legitimate grants remain supported.

## Vendor note and response-boundary remediation

Vendor notes now have two explicit application-service entry points instead of
a boolean authorization bypass:

- CRM employees use the existing `crm_vendor.manage` controller boundary and
  an operational-branch-scoped service path.
- Vendor self-service uses `vendor_own.update` plus the exact vendor grant and
  active same-vendor membership checks described above.

Both paths converge on one repository mutation. Inside the same PostgreSQL
transaction, the adapter locks the branch vendor and validates any supplied
assignment/event relationship before the first insert. An `assignmentId` must
belong to that vendor; an `eventRecordId` must be connected to that vendor by an
existing `vendor_assignments` row; supplying both must identify the same row.
The assignment's event and vendor must also be in the operational branch.
Rejected cross-vendor, mismatched, nonexistent, and wrong-branch targets return
the same safe not-found error before any vendor note, assignment history, event
timeline/activity, vendor timeline/activity, audit, or outbox write.

The existing request contract already represents a legitimate vendor-level
note by omitting both optional IDs. An event-specific note without an existing
vendor assignment is deliberately not accepted because the current domain
model defines that relationship through `vendor_assignments`.

Vendor-self note classification is now strictly enforced across schemas, service
boundaries, and database persistence:

- `addVendorSelfNoteSchema` governs `POST /api/v1/vendors/me/notes`, allowing
  only omitted `noteType` (defaulting to `"vendor"`) or the literal value
  `"vendor"`. Attempted `"internal"` or `"progress"` submissions are rejected
  with HTTP 400 Bad Request.
- `VendorService.addOwnNote` enforces this invariant at the service boundary:
  any attempted `noteType !== "vendor"` throws `INVALID_VENDOR_NOTE_TYPE` (400),
  while omitted `noteType` is forced to `"vendor"`.
- CRM notes created via `POST /api/v1/crm/vendors/:id/notes` continue using
  `addVendorNoteSchema` with `VendorService.addCrmNote`, preserving full employee
  access to `"internal"`, `"progress"`, and `"vendor"` classifications.
- `addVendorSelfNoteSchema` alone accepts an optional `vendorId`. If exactly one
  vendor remains after branch, role-grant, and membership authorization, the
  service may infer it. Multiple authorized vendors without an explicit ID fail
  with stable HTTP 400 `VENDOR_SELECTION_REQUIRED`. A supplied ID must pass the
  same authorization intersection before relationship validation. CRM's path
  and body contract are unchanged, and the controller no longer calls
  `getOwnDashboard()` to discover an identity.
- Direct unit tests, real HTTP tests (`apps/backend/test/vendor-notes-http.spec.ts`),
  and live PostgreSQL tests (`test/integration/vendor-note-linkage.integration.spec.ts`)
  prove database row persistence (`note_type = 'vendor'`), response agreement,
  rejection without mutation, and CRM classification support.

Vendor-self dashboards now map detail records through an explicit runtime
`VendorSummary` allowlist. Serialized responses include only the declared
summary keys and exclude GST/PAN/UPI data, internal notes, bank accounts,
contacts, documents, street address, and pincode. TypeScript interfaces alone
are not treated as runtime field filtering.

## Implemented session and role-switch concurrency

Authentication verify, refresh, and switch responses now return the stable
backend device-session ID. Flutter stores that ID in the version-3 minimum
secure-session payload while retaining version-2 restoration compatibility.

Local state has separate monotonic values for:

- session generation — account/device-session replacement;
- token revision — access/refresh-token rotation; and
- role revision — server-authoritative role changes.

Snapshots compare stable values rather than Dart object identity. The session
notifier serializes local mutations and implements these outcomes:

- access-token refresh may overlap bootstrap without invalidating a response
  for the same server session and role;
- refresh and role switch reconcile safely in either completion order;
- logout, account replacement, device-session replacement, and conflicting
  role changes discard old responses;
- a refresh/switch response carrying another session ID terminates the local
  session;
- rejection of an older token revision cannot terminate a newer valid token;
- logout completion cannot clear an account that replaced the initiating
  session; and
- if the server applied a role switch but secure persistence fails, memory
  remains aligned with the server and restore refreshes authoritative state.

Unsafe refresh or role-switch mutations are not automatically replayed.
When local logout cleanup begins, authenticated in-memory state is cleared
before secure-storage deletion or private-cache cleanup is awaited. A delayed
or failed cleanup can be reported, but cannot retain or restore a private UI.

## HTTP and response handling

The real Nest HTTP surface now proves:

- unauthenticated bootstrap is `401`;
- authenticated bootstrap returns the fully documented serialized schema;
- actor user/session/role, typed scopes, request ID, Hyderabad branch, modules,
  capabilities, and controls are present;
- OpenAPI describes the complete bootstrap response; and
- auth and bootstrap responses receive `Cache-Control: no-store`, including
  mixed-case and optional-trailing-slash bootstrap paths accepted by Express.

The authenticated HTTP success case uses a signed JWT, an active in-memory user
and device session, and the real global `AccessTokenGuard`; it does not assign
`request.user` in test middleware. Missing/invalid tokens and revoked/expired
sessions return `401`, while the success response retains request-ID and
no-store headers.

Request IDs are normalized centrally. Missing controller request context is a
controlled `500 REQUEST_CONTEXT_UNAVAILABLE`, never a misleading policy `403`,
and a missing inbound ID is generated rather than serialized as `undefined`.

## Test matrix

Automated tests prove the requested compatibility cases:

- required baseline policy accepted;
- safe additive policy revision/modules/capabilities accepted;
- missing required baseline rejected;
- known privileged or contradictory policy rejected;
- malformed policy and incompatible structural/minimum-client versions rejected;
- older compatible clients do not depend on exact server policy equality; and
- past/future valid UTC `generatedAt` values do not fail because of device clock
  skew.

Scope tests cover branch, global, vendor, distinct multiple grants, exact
duplicates, inactive grants, wrong branch, malformed/unsupported pairings,
vendor-ID branch separation, exact vendor-grant/membership intersection,
grant-only, membership-only, active/inactive cross-vendor membership, and
branch-scoped vendor access narrowed by membership. PostgreSQL integration
proves `scope_type` round-trip, database uniqueness, multi-membership filtering,
and cross-vendor denial, not only fake-repository behavior.

Vendor security tests additionally cover same-vendor assignment/event linkage,
Vendor A with Vendor B assignment, Vendor A with Vendor B event, mismatched
assignment/event pairs, nonexistent IDs, wrong branch, CRM/self trust-path
selection, and zero partial side effects after rejection. The PostgreSQL suite
asserts the note/history/timeline/activity/audit/outbox transaction outcome;
the real serialized HTTP dashboard test asserts the exact `VendorSummary` key
set and absence of every detail-only field.

Vendor-self selection tests cover a single authorized vendor with omission,
ambiguous omission across multiple authorized vendors, explicit selection of
each legitimate vendor, unauthorized explicit selection, and no note write on
either rejection. Real HTTP tests make membership user-specific, deny an
employee on `/vendors/me/notes`, and deny a vendor grant whose membership
belongs to another user. Production `CapabilityGuard` requires its Nest
`Reflector`; Vitest supplies explicit test-only constructor tokens instead of
weakening production DI.

Session/provider/widget tests cover both refresh/switch completion orders,
refresh/bootstrap overlap, logout, account replacement, server-session
replacement, conflicting roles, stale token rejection, persistence failure,
actor-session mismatch, delayed logout cleanup, and cleanup failure.

## Verification results

Successful final or post-fix gates at this checkpoint:

- focused authorization, vendor, HTTP, and bootstrap-contract suite: **5 files,
  69/69 tests**;
- backend unit/foundation suite: **45 files, 343/343 tests**;
- isolated PostgreSQL suite: **6 files, 52/52 tests** (including direct database persistence and relationship-integrity checks);
- full Flutter suite: **33 test files, 581/581 tests**;
- focused Flutter bootstrap/session/logout suite: **149/149 tests**;
- `flutter analyze`: **PASS, zero issues**;
- ERP suite: **4 files, 12/12 tests**;
- root TypeScript typecheck: **PASS**;
- backend lint and typecheck: **PASS**;
- backend production build: **PASS**;
- focused real Nest HTTP/guard/OpenAPI/no-store/bootstrap tests: **11/11
  PASS**;
- maintained local authenticated API smoke: **PASS** for health, local OTP,
  real PostgreSQL-backed bootstrap, enquiry read, logout, and revoked-session
  `401`; and
- focused scope, policy, session, role-switch, and gateway groups: **PASS**.

Two consecutive root `verify` gates passed formatting, lint, typecheck, backend
**343/343**, ERP **12/12**, shared-package/backend/ERP production builds.
PostgreSQL and real HTTP runs required authorized local Docker/loopback access.
Flutter required normal access to its installed SDK cache. No external
provider, SMS, staging, or production call occurred. The smoke created one
synthetic development user/session and revoked that session before exit.

Next.js owns `apps/erp-web/next-env.d.ts`. It is untracked and ignored;
`git rm --cached` preserved the local generated file while staging only the
tracking removal before closure. ERP typecheck runs
`next typegen && tsc --noEmit`, while the explicit ESLint ignore remains
because repeated local verification can regenerate the file. An isolated
temporary ERP copy with neither `.next/` nor `next-env.d.ts` initially present
generated both and passed typecheck. Two consecutive root verify runs also
passed without mutating the tracked worktree.

## Security findings and limits

- No real secret, token, OTP, mobile number, authorization value, cookie, or
  provider credential was added to source or evidence.
- No migration was needed: `role_assignments.scope_type`, `vendor_members`, and
  the assignment/vendor/event foreign keys already exist. Note-link integrity
  is enforced before mutation by the shared PostgreSQL repository transaction.
- TypeScript and Dart still mirror the bootstrap baseline catalogs manually.
  Runtime validation and tests guard this boundary, but generated cross-language
  contracts remain future engineering work.
- Existing CUST-03 findings remain: refresh de-duplication is process-local
  while PostgreSQL is authoritative, and another backend instance may observe
  revocation after the bounded principal-cache delay.
- Unexpected server bootstrap-schema failures use the existing safe generic
  `500 INTERNAL_ERROR`; they are not remapped to the account-authorization 403.
  A more specialized public error contract remains with CUST-24.
- Accepted/deferred review observations stay in their existing roadmap homes:
  future Phase 2 unsupported-role-row behavior is VEND-01/VEND-20, force-update
  UX is CUST-24 plus the platform release gates, unused vendor repository
  methods remain subject to the proven STAB-19 cleanup discipline, and the
  distributed-cache limitations remain accepted CUST-03 findings.
- Physical-device secure storage, staging, production, real Exotel/DLT, and
  multi-branch behavior are not proven by CUST-04.
- CUST-02 remains partial/deferred and must close before the final Customer
  release gate.

## Independent review closure

Claude's fresh final independent review approved CUST-04 as **READY TO CLOSE**
with no blocking findings. Its non-blocking P3 observations remain mapped to
existing work: future Phase 2 unsupported-role-row behavior to VEND-01/VEND-20,
force-update UX to CUST-24 and platform release gates, unused vendor repository
methods to STAB-19 cleanup discipline, and distributed-cache limitations to the
accepted CUST-03 findings. They do not block this local CUST-04 closure.

CUST-04 is **INDEPENDENTLY REVIEWED AND CLOSED — 4 SEPTEMBER 2026**. It is
locally verified but not staging, production, physical-device, Exotel, DLT, or
store proven. CUST-05 was not started. The next roadmap action is CUST-05
discovery and requirements verification, not immediate UI implementation.
