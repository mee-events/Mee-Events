# CUST-05 Customer Home Evidence

- **Status:** IN PROGRESS — PLANNING CONTEXT SLICE APPROVED AND PHYSICALLY VERIFIED
- **Slice:** Customer Home planning location/date context foundation
- **Date:** 7 September 2026
- **Branch:** `master`
- **Planning-context starting HEAD:**
  `22a37693c35776c14266fa383bb1eb8bf4173b7e`
  (`feat(customer): add sent quotation home resume`)

This record covers the independently approved and pushed earlier CUST-05
slices plus the newly authorized, uncommitted Home Planning Context Foundation
and its focused P1/P2 remediation. Prior approvals do not approve this new
slice. It does not close CUST-05, start
CUST-06, or claim staging, production, external-provider,
payment, document, feedback, availability, or media proof.

## Home Planning Context Foundation — 7 September 2026

### Scope and protected state

Starting `master`, `HEAD`, and local `origin/master` matched
`22a37693c35776c14266fa383bb1eb8bf4173b7e`, with the branch zero behind and
zero ahead and an empty index. The only pre-existing worktree change was
tracked, unstaged `AGENTS.md`, whose SHA-256 remained
`6a9178bc717571fb884d2fe6828beec8b71a6b8558d370936cf40ed2b9715802`.
Its complete diff was inspected and it remains unedited, unformatted, unstaged,
and uncommitted.

The sent-quotation Home resume slice was committed and pushed as `22a37693`.
GitHub CI, Security, and CodeQL passed for that exact commit; Dependency Review
skipped normally for the push event. The earlier wording that described that
slice as waiting for commit or push is superseded by this result.

### Client-only behavior

Home now shows one compact, accessible planning-context control directly below
the existing search. It defaults to `Hyderabad · Add event date`; an optional
area or venue becomes `<area>, Hyderabad`, and an exact selected date uses a
short `d MMM` label. The compact summary fails closed to `Hyderabad` for likely
door/street addresses, including hyphenated, slashed, `#`-prefixed, and common
address-marker forms. For comma-separated input it may use only a final safe
area such as `Jubilee Hills`; the complete sanitized value remains available
only to the checkout pre-fill.
The control keeps a 44 logical-pixel minimum target, permits two text lines, and
preserves the approved Compact Home Top Area at narrow widths and large text.

The existing Mee Events bottom-sheet and date-picker components explain that
the service area is currently Hyderabad and that the values only help prepare
an enquiry. Area input rejects control characters and is limited to 300
characters; the generated checkout location also stays within 300 characters.
The calendar starts at the current local calendar day, rejects past dates, and
both optional values can be cleared. The copy explicitly says that the context
does not check live vendor availability or filter services, prices, or
recommendations.

The new Riverpod notifier follows the existing account-scoped
`SharedPreferences` pattern. Guest state is memory-only and is not written to
preferences. A typed save result distinguishes a successful signed-in write,
expected guest session-only state, signed-in persistence failure, and rejected
past date. Both a `false` preferences result and a thrown storage failure keep
the safe in-memory value, keep the sheet open, show only non-technical
session-only guidance, and allow retry. Guest saves close normally with a safe
sign-in reminder. Signed-in state uses a sanitized per-account key. Provider
recreation on account changes prevents cross-account display, and the existing
`CustomerPrivateDataCleaner` now removes only the departing customer's planning
context during logout or identity replacement. The control exists only on the
Customer Home surface; Vendor and Worker role surfaces are unchanged.

`EnquiryCheckoutScreen` awaits the remembered context and pre-fills only its
existing exact event-date and location fields. Customers can edit the location
or clear/change the date, no submission is triggered, and the enquiry request
contract is unchanged. New optional constructor seeds protect more-specific
values supplied by a navigation flow; an explicit empty location also remains
explicit. The checkout captures the active account before awaiting context and
discards that result if the session identity changes, while retaining the
mounted, explicit-value, customer-edit, and empty-field guards. All five current
checkout entry paths—service detail, category
detail, product detail, Plan, and Enquiries—were inspected. None currently
supplies date/location, and their existing event type, service, and notes seeds
remain unchanged.

Active Event Record date and venue handling remains server-authoritative and is
not read from or written by planning context. This client context is only input
for a future enquiry. No backend, database, migration, API, OpenAPI,
authorization, authentication, dependency, shared-contract, catalogue,
availability, pricing, GPS, saved-address, or other Customer-tab change is in
this slice.

### Claude review findings and remediation

Claude independently returned **NOT READY FOR SLICE APPROVAL**. It confirmed
two P1 findings: compact redaction missed common Hyderabad door-number forms,
and signed-in saves always reported success even when `setString` returned
`false` or threw. It confirmed the P2 delayed old-account checkout pre-fill
race. It also partially confirmed the P2 coverage concern: some safe behavior
already existed, but the listed malformed-storage, account-transition,
concurrent-save, failure, and Unicode boundaries lacked direct deterministic
tests.

The remediation strengthens only compact display redaction; it does not alter
the full sanitized checkout value or add a locality catalogue. Persistence now
returns a typed outcome, serializes overlapping writes so the newest value is
written last, retains safe memory on failure, provides truthful guest/failure
messages, and permits retry. Checkout rechecks the active session identity
after its awaited load and rejects a stale account result. Deterministic tests
now cover malformed JSON and types, stored past-date removal with retained
area, today, provider account switching, delayed stale-account completion,
edit-before-load, both persistence failure modes, success and retry,
overlapping saves, exact risky/safe compact examples, and surrogate-safe
truncation.

Claude's subsequent focused source review returned **READY FOR SLICE
APPROVAL**. That was a source-review verdict, not physical-device acceptance.

### Physical Android QA and stale-context remediation

Subsequent real-device QA returned **PHYSICAL ANDROID QA FOUND ISSUES**. Home
layout, keyboard handling, date selection, and compact privacy redaction passed
on the Android device. Reopening the planning-context sheet did not retain the
latest area/date, and Enquiry Checkout did not receive that latest context, so
the physical slice did not pass.

The confirmed cause was the notifier's `ready` getter returning `_ready`
directly. `_ready` permanently represented the initial storage-load result;
later `save()` calls correctly updated `state`, but every later `await ready`
still received the startup snapshot. Both Home sheet opening and Checkout
pre-fill therefore consumed stale data.

The narrow correction keeps the one-time load barrier, then returns the
notifier's current state. If the notifier was disposed during an account
transition, it fails closed to an empty context. Home now captures the active
session identity before awaiting the notifier and refuses to open the sheet if
that identity changes, matching Checkout's existing protection.

Four deterministic regressions reproduce the real sequence without pre-seeded
storage or wall-clock sleeps: live state after delayed initialization and
successful/failed saves; blank Home through save, chip update, and populated
sheet reopen; blank provider through save and Checkout pre-fill/edit/clear; and
Customer A's delayed Home load being discarded after switching to Customer B.

Claude's focused correction review returned **READY FOR PHYSICAL ANDROID
RE-TEST**. Antigravity then completed the focused re-test on a physical Nothing
Phone (2a) running Android 16 and returned **PHYSICAL ANDROID RE-TEST PASSED**.
Home retained `Gachibowli` and the selected date after reopening the sheet;
Enquiry Checkout received the latest saved `Gachibowli, Hyderabad` location and
the same date; the location remained editable; and the date remained clearable.
No runtime error was observed. This closes the stale-context physical finding
for this slice without closing overall CUST-05.

### Verification and honest limits

The new stale-context regression group passes **4/4**, and all dedicated
planning-context tests pass **33/33**. Focused planning-context, Home, checkout,
and session coverage passes **185/185**. It proves the default state, exact future date and past-date guard,
sanitization and limits, independent clearing, guest memory-only behavior,
account-scoped persistence and isolation, logout cleanup, checkout pre-fill and
customer edits, explicit-value precedence, authoritative Event Record display,
truthful non-filtering copy, narrow/large-text behavior, semantics, minimum
targets, live-state reuse, account-change cancellation, and the existing Home
regression suite. The complete Flutter suite passes **696/696**, Flutter
analysis reports zero issues, and Dart formatting
checks 216 files with zero changes. The three touched documents pass Prettier.
Root `corepack pnpm verify` passes all formatting, lint, typecheck, test, and
build gates, including backend **343/343**, ERP **12/12**, and 37 ERP routes.

The first formatter and focused-test attempts were blocked because the
restricted sandbox could not update the installed Flutter SDK cache. The
unchanged commands passed with the required SDK-cache/test-runner permission.
The first root verification attempt passed formatting, lint, typecheck, and ERP
tests, while the established 17 backend HTTP tests were blocked from loopback
binding (`listen EPERM`); the unchanged permission-enabled command passed.
The first remediation-focused run found only a callback-signature test compile
error. After that correction, two signed-in sheet tests exposed missing mocked
preferences initialization and were fixed in the test harness. No production
behavior changed for those test corrections.

Focused physical Android re-testing on Nothing Phone (2a), Android 16,
**PASSED** with no observed runtime errors. Manual screen-reader proof remains
**NOT VERIFIED**. CUST-05 remains **IN PROGRESS** and CUST-06 remains unstarted.

### Deferred decisions

- Saved customer addresses remain under CUST-20.
- Flexible-date handling needs a future product/API decision.
- Structured locality taxonomy and locality/date availability filtering are
  **NEW REQUIRED ITEM — NOT CURRENTLY IN ROADMAP**. No task ID was invented.

Claude's retained non-blocking P3 observations remain recorded without scope
expansion: a save completing during logout may recreate the departing user's
account-scoped key; the currently unused `clearArea`/`clearDate` calls retain
their mutation-ordering concern; generic `Hyderabad` satisfies checkout
location validation; the compact date omits its year; additional invisible
Unicode formatting characters are not covered; and sanitized account-ID
collisions are unreachable today because session user IDs are UUIDs.

## Sent Quotation Resume Slice — 7 September 2026

### Scope and protected state

Starting `master`, `HEAD`, and local `origin/master` matched
`81581f1fc69bc9d3949f67983f373a0da174581f`. The index was empty. The only
pre-existing worktree change was tracked, unstaged `AGENTS.md`, whose current
SHA-256 remained
`6a9178bc717571fb884d2fe6828beec8b71a6b8558d370936cf40ed2b9715802`.
Its complete 830-line addition was inspected before editing; it remains
unedited, unformatted, unstaged, and uncommitted. No conflicting Home,
quotation, test, roadmap, progress, or evidence edit was present.

The compact Home commit `81581f1` is pushed and matches `origin/master`. Its
GitHub CI, Security, and CodeQL workflows passed. That proof applies to the
compact slice only, not to this uncommitted quotation slice.

### Contract boundary and implementation

The shared `QuotationSummary` list contract has no `bookingId` or
`paymentPlanId`; those fields exist only on quotation detail. The legacy Dart
summary model still carries optional versions, but Home neither reads nor relies
on them, and this slice does not alter that pre-existing out-of-scope drift.

Home therefore admits only quotations whose exact server-authoritative status
is `sent` and whose ID is non-empty. It chooses the newest valid `updatedAt`,
then `createdAt`, then stable ID. Invalid dates remain deterministic; phone time
and `validUntil` never convert status. `approved`, `revision_requested`,
`rejected`, `expired`, `superseded`, `draft`, and unknown statuses remain hidden.

The single card uses the matching enquiry occasion name when available, then a
trimmed quotation reference, then `Your quotation`. Its only action is `Review
quote`, which opens the existing `QuotationDetailScreen` with the selected
quotation's exact ID. The UI makes no payment or booking claim. When the selected
quotation and an enquiry share `enquiryId`, only that duplicate enquiry card is
suppressed; unrelated active enquiries remain eligible. Enquiry failure or
absence leaves the quotation fallback card usable.

Signed-out Home does not watch or request quotations. Signed-in quotation
loading, initial failure, failed-source retry, previous-data retention, and
pull-to-refresh use the existing Home/Riverpod architecture. Successful sibling
cards remain visible, only failed sources without values are retried, and all
error UI stays section-level and free of raw exceptions, URLs, tokens, stack
traces, or private details.

No backend, database, migration, shared contract, authentication,
authorization, dependency, state-management, Explore, Plan, Enquiries, Account,
payment, booking, role-switching, or CUST-06 behavior changed.

### Claude review and P3 remediation

Claude's focused re-review returned **READY FOR SLICE APPROVAL** with no P0, P1,
or P2 findings. It confirmed that the accessibility-label correction and the
quotation loading-test correction are resolved. Claude did not execute Flutter
or Dart:
**NOT VERIFIED — ENVIRONMENT LIMITATION**.

Claude retained two slice-local P3 observations. First, the quotation card's
screen-reader label did not announce the visible quotation reference when an
occasion title was available. The label now announces the occasion and
`Quotation <reference>` once when both exist, announces the reference when it
is the only identity, and uses `Your quotation` once only when neither identity
exists. Visible copy, layout, navigation, and selection are unchanged. Second,
the pending quotation-provider skeleton had no direct test. A focused signed-in
widget test now holds that provider pending with no other resume cards, proves
the skeleton without a false card, empty section, or error, completes the
provider into the expected quotation card, and verifies clean completion and
disposal.

Claude retained two non-blocking P3 test-coverage observations. The occasion
plus blank-reference semantic branch has no dedicated test but is correct by
construction in the shared identity expression. Pending quotations alongside
an existing Plan or Saved card also have no dedicated test, while the shared
resume composition keeps those already resolved cards visible.

### Verification

The original focused file run passed 32 tests and failed only the new navigation
assertion because it checked before the pushed route's first frame. The test was
corrected to pump the route start and transition; production code did not
change. The single regression then passed 1/1, and the pre-review focused Home
feed file passed **34/34**. After the P3 remediation, the two new focused tests
passed **2/2**, the complete Home/quotation/shell group passed **189/189**, and
the complete Flutter suite passed **659/659**. The first P3-focused run found
only a test cleanup issue because its semantics handle was disposed after
Flutter's end-of-test check; moving disposal into `finally` fixed the test with
no production change.

Focused coverage proves reversed ordering, invalid-date fallback, stable-ID
tie-breaking, supported-status and ID filtering, no phone-clock expiry inference,
both safe title fallbacks, signed-out request suppression, truthful card copy,
exact-ID navigation, matching-enquiry de-duplication, unrelated-enquiry
retention, enquiry-failure fallback, safe initial errors, source-scoped retry,
signed-in refresh, retained previous quotation data, and raw-error suppression.

| Command                                                                                       | Result / execution                                                                                                   |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `flutter test test/home_feed_test.dart --name 'Quotation semantics\|Pending quotations'`      | PASS — 2/2                                                                                                           |
| `flutter test test/home_tab_test.dart test/home_feed_test.dart test/customer_shell_test.dart` | PASS — 189/189                                                                                                       |
| `flutter test`                                                                                | PASS — 659/659                                                                                                       |
| `flutter analyze`                                                                             | PASS — zero issues                                                                                                   |
| `dart format --output=none --set-exit-if-changed lib test`                                    | PASS — 210 files, zero changes                                                                                       |
| `corepack pnpm exec prettier --check <three touched CUST-05 documents>`                       | PASS — all matched                                                                                                   |
| `corepack pnpm verify`                                                                        | FIRST ATTEMPT ENVIRONMENT-BLOCKED — 17 Nest HTTP tests could not bind sandbox loopback; 326/343 backend tests passed |
| unchanged `corepack pnpm verify` with established loopback permission                         | PASS — backend 343/343, ERP 12/12, four-workspace lint/typecheck, all builds, 37 ERP routes                          |
| `git diff --check`                                                                            | PASS                                                                                                                 |
| `git diff --cached --check` and `git diff --cached --stat`                                    | PASS — index remains empty                                                                                           |

The first attempt to invoke Dart/Flutter inside the restricted sandbox was
also blocked from writing the installed Flutter SDK cache. The same scoped
commands passed with SDK-cache permission. No source workaround or dependency
change was made.

### Deferred contract risks

- Approved quotation Home handling needs booking/payment state unavailable from
  the list contract.
- Quotation expiry enforcement belongs to CUST-14/CUST-15.
- Trusted provider-bound payment remains CUST-16.
- Multiple simultaneous `sent` quotations need a later product decision.
- Raw error rendering in the pre-existing `QuotationDetailScreen` belongs to
  CUST-14 quotation-detail hardening.

Physical-device proof for this slice is **NOT VERIFIED**. CUST-05 remains **IN
PROGRESS**.

## Compact Home Top Area — 6 September 2026

### Scope and protected state

The owner authorized a shorter existing Home hero and tighter Home search
spacing only, followed by verification, an Android preview, and a stop for
manual review. Starting `master`, `HEAD`, and local `origin/master` matched
`da0364800ed77b4099a08aa69f1ea01c84b8d698`, the third provider-failure commit.
The index was empty. The sole pre-existing modification was `AGENTS.md`, whose
SHA-256 was
`6a9178bc717571fb884d2fe6828beec8b71a6b8558d370936cf40ed2b9715802`.
It remains untouched and unstaged. No conflicting Home edits or active Codex
implementation task was found. Existing backend and Flutter emulator processes
were reused instead of starting duplicate servers.

### Presentation changes

- Home hero minimum height: **224 → 176 logical pixels**. This is a minimum,
  not a fixed height; long titles and enlarged text can make it taller.
- Removed the repeated brand eyebrow and calendar/sparkle icons. Kept the
  existing colours, typography, decorative background, and media handling. The
  abstract motif now remains visible at narrow widths and enlarged text; the
  text is painted above it and retains acceptable contrast.
- Gave the text the full available width and shortened only the new-customer
  description to “Choose an occasion. We’ll help you plan.” Lifecycle titles,
  event context, completed wording, and button actions remain unchanged.
- Hero title, description, and button label wrap instead of being truncated.
- Home-only search padding is tighter and aligned with the hero. Its minimum
  touch height stays 48 logical pixels and the complete hint can wrap.
  The shared widget's default remains unchanged for Explore.
- The gap below the hero is 12 instead of 20 logical pixels. Home's loading
  placeholder follows the new minimum; initial-error and refresh handling are
  unchanged.

No selectors, providers, recommendations, navigation destinations, other tabs,
backend, database, API, authentication, or role-switching behavior changed.

### Verification for this slice

| Check                         | Executed result                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Focused Home/feed/shell tests | PASS — 172/172                                                                                     |
| Complete Flutter suite        | PASS — 642/642                                                                                     |
| Flutter analysis              | PASS — zero issues                                                                                 |
| Dart formatting               | PASS — 210 files, zero changes                                                                     |
| `corepack pnpm verify`        | PASS — formatting, lint, typecheck, backend 343/343, ERP 12/12, all builds including 37 ERP routes |
| Android emulator              | Compact new-customer hero rendered; Home search opens Search; Start planning opens Plan            |
| Physical Android phone        | NOT VERIFIED — no physical phone connected                                                         |
| Antigravity visual review     | READY FOR COMPACT-SLICE APPROVAL; physical device unavailable                                      |
| Claude independent review     | READY FOR SLICE APPROVAL; P2 test correction independently confirmed resolved                      |
| Owner manual approval         | Compact foundation accepted; test correction authorized                                            |

Fourteen new tests cover new/active/completed Home at 320/390 logical-pixel
widths and 1x/2x text, text bounds without truncation, minimum touch size, Plan
navigation, compact loading height, and the unchanged default shared-search
layout. Existing tests retain error, stale-data, lifecycle, and shell coverage.
Initial runs exposed overly strict fixed-height expectations at narrow widths
and an old scroll test's dependence on off-screen widget caching. The tests now
require readable adaptive height and actual on-screen visibility, respectively;
the final focused and full runs above passed.

The existing Android 16/API 36 emulator (`emulator-5554`) runs the development
flavour against the existing local backend. The updated source was hot-reloaded
into that session. This is emulator observation, not physical-device proof;
active and completed variants were exercised by widget tests, not seeded into
the live database. No customer records were created for this preview.
The backend readiness check returned `status: ok` with PostgreSQL persistence.
The existing session was left on Home for manual review. Temporary before/after
screenshots were captured outside the repository; no screenshots or test data
were added to version control. The root gate ran with permission for local HTTP
tests and completed successfully; no blocked attempt is represented as a pass.

### Independent review and test remediation — 7 September 2026

Antigravity returned **READY FOR COMPACT-SLICE APPROVAL** with no current-slice
blocker. Its visual motif, rotating search hint, CTA motion, and shared shimmer
ideas remain later polish rather than silently entering this slice. It ran the
Home test 118/118, an extended Customer group 96/96, and Flutter analysis with
zero issues. No physical Android device or emulator was connected during that
review, and Antigravity modified no files.

Claude, configured as Opus 5 with Extra effort, independently returned **READY
FOR SLICE APPROVAL** with no P0/P1 application finding. It confirmed scope,
lifecycle behavior, navigation, errors, touch targets, adaptive layout, and the
unchanged non-Home search default. Claude could not execute Flutter/Dart in its
environment. It identified one P2 test-quality defect: `didExceedMaxLines`
cannot prove truncation when the production `Text` intentionally has no
`maxLines` value.

The authorized correction changes only `home_tab_test.dart`. The vacuous check
is replaced by positive assertions that the exact complete text is laid out,
that its calculated width and height fit its render box, and that long 2× titles
occupy multiple rendered text boxes. Existing containment, touch-target,
lifecycle, and navigation assertions remain. Production Home code and appearance
are unchanged. Post-remediation checks pass: corrected Home **118/118**, full
Flutter **642/642**, analysis with zero issues, Dart format across 210 files,
and root verification with backend **343/343**, ERP **12/12**, lint, typecheck,
and all builds including 37 ERP routes.

Claude's focused re-review returned **READY FOR SLICE APPROVAL** and confirmed
that the original P2 is resolved, the production diff is unchanged, and no new
blocker exists. Its two new test-observation P3s and reviewer-label precision
note require no correction in this slice. Claude again could not execute
Flutter/Dart; the post-remediation run results above are Codex evidence. Claude
modified no files. Earlier non-blocking P3 observations remain deferred.

The independently approved 10-file slice was committed and pushed as `81581f1`
under `feat(customer): compact home top area`; `AGENTS.md` was excluded. GitHub
CI, Security, and CodeQL workflows passed. This does not approve the later
sent-quotation slice, authorize CUST-06, or close CUST-05.

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

CUST-05 remains **IN PROGRESS**. The independently approved compact Home slice
was pushed as `81581f1`, matching the inspected local `origin/master`, and its
GitHub CI, Security, and CodeQL workflows passed. The sent-quotation resume
slice and both P3 corrections were committed and pushed as `22a37693`; GitHub
CI, Security, and CodeQL also passed for that exact commit. The current Home
Planning Context Foundation stale-context remediation is locally verified,
uncommitted, and unstaged. Claude returned **READY FOR PHYSICAL ANDROID
RE-TEST**, and Antigravity returned **PHYSICAL ANDROID RE-TEST PASSED** on a
Nothing Phone (2a), Android 16, with no runtime errors. The saved context
survived sheet reopen, reached Checkout, remained editable, and could have its
date cleared. The slice is approved for its authorized focused local commit;
manual screen-reader verification remains **NOT VERIFIED**. Approved quotation
Home handling, approved media, and complete acceptance testing remain. Manual TypeScript/Dart
status-catalogue synchronization remains a non-blocking P3 cross-language drift
risk under the existing architecture.

The previously retained inaccurate active title, mixed-lifecycle coverage gap,
and unusable-newest-booking-ID action-selection observation are addressed in
the approved second slice. Prior independent approvals do not close the compact
layout slice or the overall Home task. CUST-06 has not started.
