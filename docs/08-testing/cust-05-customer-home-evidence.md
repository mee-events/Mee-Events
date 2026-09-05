# CUST-05 Customer Home — First Implementation Slice Evidence

- **Status:** IN PROGRESS — FIRST SLICE INDEPENDENTLY APPROVED
- **Slice:** Status-authoritative completed-event Customer Home
- **Date:** 5 September 2026
- **Branch:** `master`
- **Starting HEAD:** `6bdba598eca5c49460b692e3f498a25eecaf63f7`
  (`docs: add beginner engineering training path`)

This record covers only the first CUST-05 implementation slice. It does not
close CUST-05, start CUST-06, or claim staging, production, physical-device,
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

## Architecture decision

The existing `/api/v1/events` response already supplies `status`, `eventDate`,
`bookingId`, and server create/update timestamps. The existing typed Customer
tab navigation supplies Plan, and `EventWorkspaceScreen` already accepts a
`bookingId`. Therefore this slice required no backend, database, migration,
shared-contract, or API change.

Lifecycle meaning is status-authoritative:

- `completed`, `settlement_pending`, and `closed` are concluded;
- `cancelled` is not a completed celebration;
- an active event does not become completed merely because its date is past;
- every other valid Event Record status remains active and prevents concluded
  history from becoming primary;
- dates order already-concluded events but do not determine their lifecycle.

## Claude review finding and remediation

Claude's independent review confirmed one P1 defect and its related P2 test
design issue. The first implementation retained the old one-day cutoff as an
eligibility filter inside `pickHomeUpcomingEvent`. A valid non-concluded record
such as past-dated `event_running` could therefore be removed before Home chose
its primary context, allowing older completed history to render instead. The
selector also read `DateTime.now()` internally, making exact ordering-boundary
tests dependent on the live clock.

The remediation makes lifecycle status the only active eligibility decision.
All valid statuses other than `completed`, `settlement_pending`, `closed`, and
`cancelled` remain active regardless of date. The former one-day cutoff now
affects ordering only: relevant current/future records rank first, then the most
recent past active record, then invalid or absent dates using server timestamps
and stable ID. `pickHomeUpcomingEvent(events, {DateTime? now})` accepts an
optional injected clock for deterministic tests while production callers retain
the current-time default. No backend, database, shared contract, or API route
changed; Customer Event Records remain `GET /api/v1/events`.

Claude's correction re-review returned **READY FOR SLICE APPROVAL — code review
only**. The verdict resolves the original P1 active-event eligibility finding
and related P2 injectable-clock finding for this slice only. Claude inspected
the corrected code and tests but did not independently execute Flutter tests.
CUST-05 remains **IN PROGRESS**.

## Implementation

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

## Verification

The Flutter and individual root-stage results below are prior local execution
evidence from implementation/remediation. Application code and Flutter tests
did not change during this documentation closeout, so Flutter was not rerun.
Claude did not independently execute Flutter tests.

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

CUST-05 remains **IN PROGRESS**. Claude approved this implementation slice only;
the approval is not CUST-05 completion. Quotation resume integration, honest
provider failure states, location/date decisions, approved media, and complete
acceptance testing remain. The review also retained these non-blocking
observations under existing CUST-05 work:

- P2: “Upcoming celebration” is inaccurate for some active records;
- P3: the mirrored mobile status catalogue needs drift protection;
- P3: mixed active/concluded/cancelled coverage should be expanded; and
- retained P3: the newest concluded record having an unusable `bookingId` can
  hide the Event Workspace action even when an older concluded record is
  actionable.

No follow-up was implemented in this closeout. The independently approved first
slice is locally committed under the subject
`feat(customer): add status-aware home lifecycle` and awaits final Git
validation followed by separate push authorization. No additional CUST-05 slice
or CUST-06 work is authorized yet.
