# CUST-05 Customer Home Evidence

- **Status:** IN PROGRESS — THIRD SLICE INDEPENDENTLY APPROVED AND LOCALLY COMMITTED
- **Slice:** Truthful section failures, scoped recovery, and stale-data refresh
- **Date:** 5 September 2026
- **Branch:** `master`
- **Third-slice starting HEAD:**
  `eb4dbce18b44444349b9c3d028363675df6855a6`
  (`fix(customer): harden home lifecycle continuity`)

This record covers the independently approved first CUST-05 implementation
slice, the independently approved second lifecycle slice, and the independently
approved third provider-failure slice. It does not close CUST-05, start CUST-06,
or claim staging, production, physical-device,
external-provider, payment, document, feedback, or media proof.

## Protected starting state

Before editing, Git status, branch, HEAD, recent commits, staged changes, and
uncommitted changes were inspected. `master` matched `origin/master`, and the
index and worktree were clean. `AGENTS.md`, both canonical roadmap files, the
Customer PRD, UI/UX playbook, design/responsive guidance, shared Event Record
status contract, Customer Event Record API/model/provider, Home implementation
and tests, Customer shell navigation, and Event Workspace navigation were read.

During the work, an unrelated uncommitted `AGENTS.md` expansion appeared. It
was not edited, staged, discarded, or included in the implementation or its
review. No reset, clean, checkout, stash, branch change, commit, or push was
performed.

Before this Claude-finding remediation, `master` remained at the same HEAD with
an empty index, the complete existing CUST-05 diff and untracked evidence were
inspected, and the unrelated `AGENTS.md` expansion was separately reviewed and
content-hashed. Every existing change was preserved.

After Claude approved the corrected slice, the repository owner separately
authorized formatting-only maintenance for `AGENTS.md` so the root gate could
run. Its pre-format SHA-256 was
`7a0693d95eeec12edd442fa08ca3412919407adefdec4521329378d53fe88b18`, and an
identical backup was retained outside the repository at
`/Users/vinaychilagani/Desktop/Mee Event V1.AGENTS-preformat-20260905.md`.
Repository Prettier
changed Markdown layout and punctuation only: the ordered alphanumeric content
hash is `3e3474a9d22eea3439b7f1e5ccdc4e5e1898caef27088a4835586896a6d9ccfb`
both before and after formatting. This maintenance remains outside the CUST-05
implementation slice.

The first slice was committed and pushed as
`ca524db90be6bb0d0580d3fcc4c4b886fc111512`. GitHub CI run `33940773672`,
Security run `33940773786`, and CodeQL run `33940773699` all concluded
`success`. The second slice was committed and pushed as
`eb4dbce18b44444349b9c3d028363675df6855a6`. GitHub CI run `33944262809`,
Security run `33944262777`, and CodeQL run `33944262795` all concluded
`success`; the push-only Dependency Review job skipped as designed because it
runs only for pull requests. Before the third slice, `master`, `HEAD`, and
`origin/master` all matched the second-slice commit. The index was empty, and
the only uncommitted file was the separate `AGENTS.md` maintenance change with
SHA-256
`6a9178bc717571fb884d2fe6828beec8b71a6b8558d370936cf40ed2b9715802`.
That file remains byte-for-byte unchanged and unstaged during this slice.

## Architecture decision

The existing `/api/v1/events` response already supplies `status`, `eventDate`,
`bookingId`, and server create/update timestamps. The existing typed Customer
tab navigation supplies Plan, and `EventWorkspaceScreen` already accepts a
`bookingId`. Therefore this slice required no backend, database, migration,
shared-contract, or API change.

Lifecycle meaning is status-authoritative:

- the 11 published active values are explicitly classified as active;
- `completed`, `settlement_pending`, and `closed` are concluded;
- `cancelled` is not a completed celebration;
- an active event does not become completed merely because its date is past;
- an unknown future value remains parseable as a raw string but fails closed
  outside active, concluded, and cancelled behavior;
- dates order already-concluded events but do not determine their lifecycle.

OpenAPI and `packages/api-contracts/src/index.ts` remain authoritative. Flutter
still mirrors the published schema manually under ADR 0004; this slice does not
introduce TypeScript-to-Dart generation or claim that cross-language catalogue
drift has been eliminated.

## Claude review finding and remediation

Claude's independent review confirmed one P1 defect and its related P2 test
design issue. The first implementation retained the old one-day cutoff as an
eligibility filter inside `pickHomeUpcomingEvent`. A valid non-concluded record
such as past-dated `event_running` could therefore be removed before Home chose
its primary context, allowing older completed history to render instead. The
selector also read `DateTime.now()` internally, making exact ordering-boundary
tests dependent on the live clock.

The remediation makes lifecycle status the only active eligibility decision.
All 11 published active statuses remain active regardless of date. The former
one-day cutoff now affects ordering only: relevant current/future records rank
first, then the most recent past active record, then invalid or absent dates
using server timestamps and stable ID.
`pickHomeUpcomingEvent(events, {DateTime? now})` accepts an optional injected
clock for deterministic tests while production callers retain the current-time
default. No backend, database, shared contract, or API route changed; Customer
Event Records remain `GET /api/v1/events`.

Claude's correction re-review returned **READY FOR SLICE APPROVAL — code review
only**. The verdict resolves the original P1 active-event eligibility finding
and related P2 injectable-clock finding for this slice only. Claude inspected
the corrected code and tests but did not independently execute Flutter tests.
CUST-05 remains **IN PROGRESS**.

## First-slice implementation

`pickHomeUpcomingEvent` first filters by the explicit active status set. It
prefers the nearest relevant current/future active record, otherwise the newest
past active record, then resolves invalid or absent dates through `updatedAt`,
`createdAt`, and stable event ID. The selector never rejects an active record
because its date is old. `pickHomeCompletedEvent` independently filters the
three concluded statuses and chooses concluded history deterministically.
Invalid date input is handled with `DateTime.tryParse` and cannot crash either
selection path.

When no active/upcoming event is primary, the existing Home hero renders the
selected event as complete and offers only “Plan another event”, routed through
the existing Plan tab. The completed resume card opens the existing Event
Workspace with the selected record's trimmed, non-blank `bookingId`. When that
identifier is unusable, the workspace card/action is not rendered. Home does
not duplicate workspace behavior or promise documents, feedback, payments,
refunds, photos, or memories.

The existing design-system colors, typography, spacing, cards, semantics,
loading state, responsive behavior, catalogue media resolution, and typed
navigation conventions were retained.

## Second lifecycle slice

Lifecycle classification now lives with the Flutter Event Record domain model
instead of inside Customer Home. `EventRecordSummary.status` remains the raw
wire string, and its derived lifecycle uses one policy for all 15 published
values: 11 active, three concluded, and one cancelled. Unknown additive values
still deserialize but classify as `unknown`, so they cannot silently enter any
customer lifecycle surface without an explicit policy decision.

The active resume-card title now compares calendar days using an injectable
clock. Future active records say “Upcoming celebration”, same-day active
records say “Today’s celebration”, and past, invalid-date, or missing-date
active records say “Continue your event”. Date changes presentation only;
lifecycle status continues to control eligibility and an old date cannot turn
active work into concluded history.

Completed display and workspace action selection now use the same deterministic
concluded-event comparator but serve separate purposes. The hero always shows
the newest concluded Event Record, even if its booking ID is unusable. The
resume card selects the newest concluded record whose trimmed `bookingId` is
non-empty. Therefore an older actionable record can still open its existing
Event Workspace while newer non-actionable history remains truthfully visible;
if no concluded record is actionable, no workspace card is shown.

No backend, database, API, authentication, authorization, dependency, or
code-generation change was required.

## Second-slice independent review

Claude performed a read-only review of the complete second lifecycle slice and
returned **READY FOR SLICE APPROVAL — code review only** with no P0, P1, or P2
findings. Claude independently ran and passed the repository-wide Prettier
check, `git diff --check`, and scope, contract, and removed-symbol inspections.
Claude could not execute Flutter or Dart in its review environment:
**NOT VERIFIED — ENVIRONMENT LIMITATION**. The local **129/129** focused and
**609/609** full Flutter results below are Codex execution evidence, not tests
independently executed by Claude.

Claude retained four non-blocking P3 observations:

1. TypeScript and Dart status catalogues remain manually synchronized.
2. Calendar-day behavior depends on the existing date-only `YYYY-MM-DD` API
   contract.
3. The hero and workspace card may deliberately represent different completed
   events when the newest event lacks a usable booking ID.
4. A pre-existing inert fixture in
   `apps/mobile/test/category_detail_screen_test.dart` uses the non-contract
   status `confirmed`; this slice did not introduce or change it.

Approval applies only to this second lifecycle slice. CUST-05 remains **IN
PROGRESS**, and CUST-06 remains unstarted.

## Third slice: honest provider failures

Home now distinguishes “the provider failed before supplying any usable value”
from “the provider successfully returned an empty list.” An initial Event
Records failure renders `Celebration details unavailable` in the hero position,
while a successful empty `GET /api/v1/events` response continues to render the
new-customer planning hero. The event retry invalidates only `eventsProvider`;
other successful Home sections remain usable and no raw exception is shown.

An initial contextual-recommendation failure renders
`Recommendations unavailable` and retries only the matching
`occasionServicesProvider(occasionCode)`. A successful empty contextual list
still omits that optional section. If services succeed while their category
provider initially fails, Home renders `Service categories unavailable`, keeps
the live services available under the existing neutral `More services`
fallback, and retries only `serviceCategoriesProvider`. Cached categories
remain usable when a later refresh fails.

Event Plan, Saved, and signed-in Enquiries failures no longer look like proven
empty activity. Home keeps every successful resume card and renders at most one
compact `Some recent activity is unavailable` notice. Its retry rechecks the
current state and reloads only resume sources that still have an initial error
without a value. Signed-out Home neither requests nor reports Enquiries.

Coordinated pull-to-refresh still requests all applicable Home sources once.
The existing Riverpod 2.6.1 `FutureProvider` behavior retains prior data through
refresh loading and failure; focused tests verify this for Event Records,
catalogue services, and Enquiries. The existing Plan and Favorites notifiers
now return a boolean refresh outcome so Home can report partial failure without
another cache. Plan already retained its loaded snapshot; Favorites now keeps
its already trusted visible snapshot when a refresh read fails. Initial local
persistence failures remain errors, not empty lists.

After the requested refreshes settle, any failure produces one safe
`Some sections couldn’t be refreshed. Please try again.` notification. Previous
values remain visible, successful sources can still update, raw error details
are never included, and the authenticated session is unchanged. A fully
successful refresh shows no failure notification.

## Antigravity discovery classification

The corrected discovery facts were checked against the repository:

1. Customer Event Records remain `GET /api/v1/events`; no alternate endpoint
   was introduced or documented.
2. Riverpod's retained previous `AsyncValue` data is used and verified; no
   duplicate network cache or provider architecture was added.
3. Initial Event Plan and Favorites persistence errors were confirmed as real
   states and now produce one truthful resume notice while successful siblings
   remain usable.
4. Existing Home errors did not expose raw exceptions. This slice preserves and
   expands that security constraint rather than claiming a prior leak.

Claude independently reviewed the third slice read-only and returned **READY
FOR SLICE APPROVAL — code review only**, with no P0, P1, or P2 findings. Claude
made no repository changes and independently passed repository-wide Prettier,
`git diff --check`, scope inspection, and protected-file verification. Claude
could not execute Flutter or Dart: **NOT VERIFIED — ENVIRONMENT LIMITATION**.
The focused 187/187 and full 628/628 Flutter totals remain Codex execution
evidence, not Claude execution evidence.

Approval applies only to this third slice. CUST-05 remains **IN PROGRESS**, and
CUST-06 remains unstarted. No backend, database, migration, REST API, OpenAPI,
authentication, authorization, shared contract, Flutter dependency, or
state-management architecture changed.

Claude retained two non-blocking P3 observations:

1. `hideCurrentSnackBar()` can dismiss an unrelated actionable snackbar. This
   is acceptable for current Home behavior but should be reconsidered if Home
   later introduces Undo or another actionable snackbar.
2. Rapid repeated Retry taps can cause redundant Enquiries requests because
   that retry has no in-flight UI guard. Plan and Favorites remain internally
   serialized. This is a future low-risk improvement and does not currently
   create a correctness, security, or data-integrity failure.

## Test coverage

Focused tests prove:

- `completed`, `settlement_pending`, and `closed` enter concluded selection;
- `cancelled` does not enter the completed celebration or upcoming selection;
- a past-dated active record is not classified as completed;
- a past `event_running` record remains active and wins over concluded history
  in either input order;
- past `preparation` and `manager_assigned` records each have singleton tests
  proving active eligibility;
- the widget renders active copy and no completed card when past active work
  coexists with completed history;
- current/future active work wins over stale active history, while the most
  recent past active record wins when every active date is past;
- exact, just-inside, and just-outside ordering boundaries use an injected fixed
  clock and remain deterministic;
- invalid and absent active dates do not crash, and active fallback coverage
  directly exercises server-timestamp ordering;
- multiple concluded records select the most recent deterministically in either
  input order;
- invalid and absent concluded dates do not crash; the shared comparator's
  stable-ID fallback is directly exercised through the concluded selector, not
  through an active-selector tie test;
- the completed hero and resume card render truthful copy;
- “Plan another event” opens the existing Plan tab;
- the completed card opens `EventWorkspaceScreen` with the correct booking ID;
- a blank booking ID does not expose a misleading workspace action;
- the completed Home state makes none of the prohibited feature promises; and
- existing new, plan, saved, enquiry, upcoming, loading, refresh,
  accessibility, responsive, and navigation behavior remains covered.

The second-slice regressions additionally prove:

- all 15 published statuses are classified exactly once and map to the expected
  active, concluded, or cancelled lifecycle;
- an unknown raw status remains parseable and fails closed;
- future, same-day, past, missing-date, and invalid-date active records produce
  the required deterministic resume title under an injected clock;
- mixed active, concluded, and cancelled input keeps active work primary in
  either input order;
- the newest concluded record can drive the hero while an older actionable
  concluded record drives the resume card and correct workspace booking ID;
- all unusable booking IDs preserve the completed hero without exposing a
  workspace action;
- the newest actionable concluded event drives both hero and card; and
- the longer honest active copy fits a narrow 320-pixel layout at 2× text scale.

The third-slice regressions additionally prove:

- initial Events failure and successful empty Events render different truthful
  states;
- Event, contextual recommendation, and service-category retries reload only
  their failed provider and can recover to live content;
- category failure keeps successfully loaded services under the existing safe
  fallback grouping;
- Enquiries, Plan, and Favorites initial failures preserve successful sibling
  resume cards, and multiple failures collapse into one safe notice;
- resume retry targets only sources still failed without a value;
- Event Records, catalogue services, Enquiries, Plan, and Favorites retain
  usable prior content after refresh failure;
- a successful provider updates even when a sibling refresh fails;
- each failed pull gesture shows exactly one safe notification, a fully
  successful refresh shows none, and signed-out Home does not request
  Enquiries;
- refresh failures do not mutate `sessionProvider` or reveal exception strings,
  loopback addresses, stack traces, or internal HTTP details; and
- error text, Retry semantics, 44×44 targets, 320/390-pixel widths, and 1×/2×
  text scale remain usable.

## Verification

First-slice results remain historical evidence. Second-slice verification is
recorded separately so a prior run is not presented as freshly executed.

| Command                                                              | Result / execution                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `flutter test test/home_tab_test.dart test/customer_shell_test.dart` | PRIOR PASS — 119/119                                                     |
| `flutter analyze`                                                    | PRIOR PASS — zero issues                                                 |
| `flutter test`                                                       | PRIOR PASS — 599/599                                                     |
| `dart format --output=none --set-exit-if-changed lib test`           | PRIOR PASS — 209 files, zero changed                                     |
| `corepack pnpm lint`                                                 | PRIOR PASS — four workspace projects                                     |
| `corepack pnpm typecheck`                                            | PRIOR PASS — four workspace projects; Next route types generated         |
| `corepack pnpm test`                                                 | PRIOR PASS — backend 343/343; ERP 12/12                                  |
| `corepack pnpm build`                                                | PRIOR PASS — shared packages, backend, and 37-route ERP production build |
| `corepack pnpm format`                                               | CLOSEOUT PASS — repository formatting completed                          |
| `corepack pnpm verify`                                               | CLOSEOUT PASS — complete chained root gate                               |
| `git diff --check`                                                   | CLOSEOUT PASS                                                            |

| Second-slice command                                                                                              | Result / execution                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `flutter test test/event_record_lifecycle_policy_test.dart test/home_tab_test.dart test/customer_shell_test.dart` | PASS — 129/129                                                                                           |
| `flutter test`                                                                                                    | PASS — 609/609                                                                                           |
| `flutter analyze`                                                                                                 | PASS — zero issues                                                                                       |
| `dart format --output=none --set-exit-if-changed lib test`                                                        | PASS — 210 files, zero changed                                                                           |
| `corepack pnpm exec prettier --check <five touched CUST-05 documents>`                                            | PASS — all matched                                                                                       |
| `corepack pnpm verify`                                                                                            | FIRST ATTEMPT BLOCKED — 17 Nest HTTP tests could not bind sandbox loopback; 326/343 backend tests passed |
| `corepack pnpm verify` with established loopback permission                                                       | PASS — backend 343/343, ERP 12/12, four-workspace lint/typecheck, all builds, 37 ERP routes              |
| `git diff --check`                                                                                                | PASS                                                                                                     |
| `git diff --cached --check`                                                                                       | PASS — index remains empty                                                                               |

| Third-slice command                                                                                                                                                | Result / execution                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `flutter test test/home_tab_test.dart test/home_feed_test.dart test/event_plan_provider_test.dart test/favorites_provider_test.dart test/customer_shell_test.dart` | PASS — 187/187 after a test-only finder correction                                                                   |
| `flutter test`                                                                                                                                                     | PASS — 628/628                                                                                                       |
| `flutter analyze`                                                                                                                                                  | PASS — zero issues                                                                                                   |
| `dart format --output=none --set-exit-if-changed lib test`                                                                                                         | PASS — 210 files, zero changed                                                                                       |
| `corepack pnpm exec prettier --check <five touched CUST-05 documents>`                                                                                             | PASS — all matched                                                                                                   |
| `corepack pnpm verify`                                                                                                                                             | FIRST ATTEMPT ENVIRONMENT-BLOCKED — 17 Nest HTTP tests could not bind sandbox loopback; 326/343 backend tests passed |
| `corepack pnpm verify` with established loopback permission                                                                                                        | PASS — backend 343/343, ERP 12/12, four-workspace lint/typecheck, all builds, 37 ERP routes                          |
| `git diff --check`                                                                                                                                                 | PASS                                                                                                                 |
| `git diff --cached --check`                                                                                                                                        | PASS — index remains empty                                                                                           |

The first focused third-slice run reached 185 passing tests but failed two
target-size assertions because the test measured the `Retry` text glyph rather
than its enclosing button. The finder was corrected to measure the existing
`TextButton`; no production behavior changed. The unchanged focused group then
passed 187/187.

The first root attempt reached tests after passing formatting, lint, typecheck,
and ERP 12/12. Its 17 backend failures all reported
`listen EPERM: operation not permitted 127.0.0.1`; no assertion failed. The
unchanged command then passed with the established loopback permission.

The earlier root blocker was resolved through the separately authorized
formatting-only `AGENTS.md` maintenance described above. No CUST-05 application
or test source changed during closeout.

The original slice's first combined Home/shell run found one test timing issue:
the workspace route assertion checked before navigation settled. The test was
corrected to await `pumpAndSettle`; the single regression passed 1/1, the
two-file rerun passed 112/112, and the pre-review expanded focused group passed
126/126. No production behavior was changed for that test fix. After Claude's
finding was remediated, the expanded two-file Home/shell group passed 119/119
and the full Flutter suite passed 599/599.

## Remaining CUST-05 work

CUST-05 remains **IN PROGRESS**. The independently approved second lifecycle
slice was pushed as `eb4dbce`; the third provider-failure slice is locally
verified, independently approved, and locally committed under
`fix(customer): add honest home provider failure states`.
Quotation resume integration, location/date decisions, approved media, and
complete acceptance testing remain. Manual TypeScript/Dart status-catalogue
synchronization remains a non-blocking P3 cross-language drift risk under the
existing architecture.

The previously retained inaccurate active title, mixed-lifecycle coverage gap,
and unusable-newest-booking-ID action-selection observation are addressed in
the approved second slice. The approved third slice now requires separate
safe-push authorization. CUST-06 has not started.
