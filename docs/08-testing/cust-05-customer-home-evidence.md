# CUST-05 Customer Home — Lifecycle Slice Evidence

- **Status:** IN PROGRESS — SECOND SLICE INDEPENDENTLY APPROVED
- **Slice:** Honest active copy, centralized lifecycle policy, and actionable
  concluded-event selection
- **Date:** 5 September 2026
- **Branch:** `master`
- **Second-slice starting HEAD:**
  `ca524db90be6bb0d0580d3fcc4c4b886fc111512`
  (`feat(customer): add status-aware home lifecycle`)

This record covers the independently approved first CUST-05 implementation
slice and the local second lifecycle slice. It does not close CUST-05, start
CUST-06, or claim staging, production, physical-device, external-provider,
payment, document, feedback, or media proof.

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
`success`. Before the second slice, `master`, `HEAD`, and `origin/master` all
matched that commit. The index was empty, and the only uncommitted file was the
separate `AGENTS.md` maintenance change with SHA-256
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

CUST-05 remains **IN PROGRESS**. Claude independently approved the second
lifecycle slice for a focused local commit, but that approval is not CUST-05
completion. Quotation resume integration, honest provider failure states,
location/date decisions, approved media, and complete acceptance testing
remain. Manual TypeScript/Dart status-catalogue synchronization remains a
non-blocking P3 cross-language drift risk under the existing architecture.

The previously retained inaccurate active title, mixed-lifecycle coverage gap,
and unusable-newest-booking-ID action-selection observation are addressed in
the approved second slice. The next repository operation requires separate
safe-push authorization after its focused local commit. CUST-06 has not
started.
