# Mee Events Google Stitch UI/UX Playbook v1

- Purpose: copy-ready, PRD-style prompts for designing the Customer, Vendor,
  and Worker mobile experiences in Google Stitch
- Product: Mee Events managed event marketplace and operations ecosystem
- Primary market: Hyderabad, India
- Design target: one shared mobile application with role-aware experiences
- Status: design working document

## 1. How to use this playbook

Do not ask Stitch to design the entire application in one generation. Build one
coherent module at a time.

1. Create one Stitch project named `Mee Events Mobile UI UX`.
2. Generate Module 00 first. It establishes the visual system and shared shell.
3. Select one strong foundation screen as the visual reference for later work.
4. Before every module prompt, paste the Global Context Block from section 4.
5. Generate the module's primary populated screens first.
6. Use short refinement prompts to correct hierarchy, content, and business
   rules without redesigning the whole screen.
7. Generate important alternate states after the populated screen is accepted.
8. Keep approved screens in one consistent project and compare every new screen
   against the foundation screen.
9. Complete Customer first, then Vendor, then Worker, then shared state and QA
   modules.
10. Export or paste approved designs into Figma and preserve screen names from
    this document.

Recommended design order:

```text
Foundation
-> Authentication and role shell
-> Customer discovery
-> Customer plan and enquiry
-> Quotation, booking, payment, event workspace
-> Account and support
-> Vendor application and business operations
-> Worker application and field execution
-> State coverage
-> Prototype connections and final audit
```

## 2. Product constitution

These rules are non-negotiable across every screen.

### 2.1 Product model

- Mee Events is a trusted event-planning and managed-fulfilment platform, not a
  public vendor directory.
- Customers browse Mee Events offerings and customer-facing prices.
- Customers submit an enquiry to Mee Events; they do not compare or select the
  operational vendor.
- Mee Events assigns fulfilment after enquiry qualification.
- Vendor identity is shown to a customer only when Mee Events explicitly marks
  it as disclosed.
- Vendors submit private base prices. Vendors never see or control customer
  prices, Mee Events margins, or other vendors' data.
- Workers receive only the event information needed to execute an assignment.
  Workers do not see event finances and do not contact customers directly.
- One person can hold Customer, Vendor, and Worker roles in one account and use
  a role switcher. The Customer role is the default.
- Successful OTP verification opens Customer Home directly. There is no forced
  role-selection or intermediate role-checking screen in the visible journey.
- Customer Home includes a clear header role chip such as `Customer ▾`; do not
  hide role switching behind an ambiguous three-dot menu.
- Tapping the role chip opens a half-height bottom sheet listing Customer,
  Vendor, and Worker. Approved roles are switchable; roles that are not yet
  approved may remain visible with an accurate Apply, Under review, Suspended,
  or Unavailable state, but must never unlock protected navigation.

### 2.2 Brand and product voice

- Product name: `Mee Events`.
- Brand character: premium, warm, calm, trustworthy, celebratory, and
  operationally clear.
- Voice: short sentences, concrete actions, respectful Indian English.
- Use realistic Hyderabad examples, Indian names, localities, dates, phone
  patterns, and Indian Rupee formatting such as `₹45,000`.
- Do not use hype, emoji decoration, filler lorem ipsum, or generic SaaS copy.

### 2.3 Current visual source of truth

Use this one visual language across all roles:

- Canvas: warm ivory `#F9F7F2`.
- Card surface: white `#FFFFFF`.
- Soft surface: `#F4F0E9`.
- Strong surface: `#E9E1D6`.
- Primary deep burgundy: `#4A0E0E`.
- Primary active: `#370909`.
- Primary soft: `#F3E8E6`.
- Main ink: `#1A1A1A`.
- Body text: `#3E3A37`.
- Muted text: `#68635E`.
- Hairline border: `#E5DED4`.
- Gold accent: `#C5A059`, used sparingly for premium highlights and ratings.
- Success: `#287A58`; warning: `#B7791F`; error: `#B42318`.
- Vendor context accent: `#167463`, used sparingly in role labels and status
  context, not as a separate vendor theme.
- Worker context accent: `#3B5F9C`, used sparingly in role labels and status
  context, not as a separate worker theme.
- Display headings: EB Garamond, elegant but restrained.
- Interface text: Manrope.
- Default card radius: 14 px; prominent containers: 20 px; pills: fully rounded.
- Spacing rhythm: 4, 8, 12, 16, 20, 24, 32.
- Prefer hairline borders and quiet depth over heavy shadows.
- Use real event photography with diverse Indian people and authentic Hyderabad
  venues. Photography should carry the celebration; UI chrome stays calm.

### 2.4 Interaction and accessibility rules

- Design mobile-first for a 390 x 844 logical-pixel frame, while allowing safe
  adaptation to common Android and iOS widths.
- Minimum touch target: 44 x 44 logical pixels.
- Use one obvious primary action per screen.
- Use progressive disclosure for long forms.
- Keep important labels visible; never rely on placeholder text alone.
- Never use colour as the only status indicator; pair it with text and an icon.
- Support system font scaling and avoid text embedded inside images.
- Use skeleton loading for content-heavy screens.
- Every network-backed area must eventually support loading, empty, error,
  offline, expired-session, success, and duplicate-action states.
- Destructive or irreversible actions require confirmation.
- Offline check-in or submission must clearly show queued versus confirmed.

## 3. Stitch prompting method

For each module, use this four-pass loop.

### Pass A: Generate

Paste the Global Context Block followed by one module prompt. Ask for only the
screens listed in that module.

### Pass B: Correct

Use a targeted correction such as:

```text
Keep the current visual direction and layout system. Do not redesign the whole
screen. Correct only these issues: [list issues]. Preserve the Mee Events
business rules, typography, colours, spacing, navigation, and component style.
```

### Pass C: State variants

Use:

```text
Using the approved populated screen as the visual source of truth, create the
following state variants without changing its structure: loading skeleton,
empty, recoverable error with retry, offline with cached content, and success.
Keep the same frame, components, spacing, and navigation.
```

### Pass D: Flow check

Use:

```text
Audit these screens as one user flow. Identify and fix inconsistent labels,
missing back paths, competing primary actions, hidden status changes, confusing
business rules, inaccessible touch targets, and visual drift. Preserve the
approved visual system.
```

## 4. Global Context Block — paste before every module

```text
PROJECT CONTEXT

Design a production-ready mobile experience for Mee Events, a Hyderabad-based
managed event marketplace. This is one shared app with Customer, Vendor, and
Worker roles. Customer is the default role; approved additional roles are
available through a role switcher.

BUSINESS RULES

Customers browse Mee Events offerings, build an event plan, submit an enquiry,
approve a quotation, pay Mee Events, and track event delivery. They do not
compare or choose operational vendors. Vendor identity is visible only when Mee
Events marks it as disclosed. Vendors manage private base prices, listings,
assigned work orders, invoices, and settlements; they never see customer prices,
margins, or competitor data. Workers manage availability, assigned work,
attendance, proof of work, and earnings; they never see customer or vendor
financial data and do not directly contact customers.

VISUAL SYSTEM

Use a premium, calm, trustworthy, photography-led Indian event aesthetic. Use
warm ivory #F9F7F2 for the canvas, white cards, soft warm neutral surfaces,
deep burgundy #4A0E0E for primary actions, ink #1A1A1A for main text,
muted brown-grey #68635E for secondary text, thin #E5DED4 borders, and restrained
gold #C5A059 accents. Display headings use EB Garamond; interface text uses
Manrope. Use 14 px card radii, 20 px prominent container radii, generous spacing,
hairline borders, and minimal shadow. Use authentic Indian event photography,
not illustrations or generic Western wedding imagery. Vendor green and Worker
blue may appear only as small role-context accents; all roles remain one brand.

UX RULES

Design at 390 x 844. Use one primary action per screen, 44 px minimum touch
targets, visible form labels, concise Indian English, Indian Rupee formatting,
and realistic Hyderabad content. Use progressive disclosure and clear status
text. Do not use emoji decoration, glassmorphism, neon gradients, generic purple
AI styling, crowded dashboards, card soup, or lorem ipsum.

OUTPUT EXPECTATION

Create polished, implementation-ready mobile screens with consistent reusable
components, realistic content, clear hierarchy, and complete navigation context.
Use the exact screen names requested. Do not add unrelated functionality.
```

## 5. Module 00 — Foundation and shared design language

### Objective

Create the visual source of truth before feature screens.

### Screens

1. `00A Design System — Foundations`
2. `00B Design System — Components`
3. `00C Shared App Shell — Customer`
4. `00D Shared App Shell — Role Switcher`

### Stitch prompt

```text
MODULE: FOUNDATION AND SHARED DESIGN LANGUAGE

GOAL

Create four mobile design-reference screens for Mee Events. These are not a
marketing mood board. They are a practical UI kit and app-shell reference that
all later Customer, Vendor, and Worker screens will follow.

SCREEN 00A — DESIGN SYSTEM FOUNDATIONS

Show the approved colour tokens with names and hex values, typography hierarchy,
spacing rhythm, radii, border treatment, icon style, photography treatment, and
status colours. Demonstrate EB Garamond only for editorial display headings and
Manrope for all functional text. The composition must still look like a
polished mobile reference page.

SCREEN 00B — DESIGN SYSTEM COMPONENTS

Show reusable mobile components: primary, secondary, outline, text, icon, and
destructive buttons; text, phone, OTP, search, dropdown, date, time, upload, and
multiline fields; chips and filters; status badges; event, service, quotation,
payment, listing, work-order, assignment, and earnings cards; timeline; progress
stepper; bottom sheet; confirmation dialog; snackbar; bottom navigation; app bar;
loading skeleton; empty state; offline banner; and inline error. Use realistic
short labels rather than abstract component names wherever possible.

SCREEN 00C — SHARED CUSTOMER APP SHELL

Create a representative Customer screen with top location context, notifications,
content area, and five-tab bottom navigation: Home, Explore, Plan, Enquiries,
Account. Make Plan visually central but not oversized. Show safe-area behaviour.

SCREEN 00D — ROLE SWITCHER

Create a half-height bottom sheet opened from the visible Home header role chip
and titled “Switch role.” Show Customer as active and approved Vendor and Worker
roles as available. Each role has a short description and clear selected state.
All three role types may be listed, but a non-approved role must show its true
application state and must not be switchable. Do not create separate login
accounts.

ACCEPTANCE CRITERIA

- The four screens clearly belong to one premium product.
- The primary burgundy is controlled and never used for long blocks of text.
- Real event photography and quiet warm surfaces balance each other.
- Vendor and Worker accents do not create separate brands.
- Components are readable, accessible, and reusable in later modules.
```

## 6. Module 01 — Entry, onboarding, authentication, and global utilities

### Screens

1. `01A Splash`
2. `01B Customer Onboarding 1 — Discover`
3. `01C Customer Onboarding 2 — Plan`
4. `01D Customer Onboarding 3 — Celebrate`
5. `01E Mobile Number Login`
6. `01F OTP Verification`
7. `01G Notification Centre`
8. `01H Help and Support`

### Stitch prompt

```text
MODULE: ENTRY, AUTHENTICATION, AND GLOBAL UTILITIES

USER GOAL

Enter Mee Events with trust, understand the value quickly, sign in using an
Indian mobile number and OTP, and access notifications or support.

REQUIRED EXPERIENCE

Create the eight named screens as one coherent flow. Splash uses the Mee Events
mark and a restrained celebratory image transition. The three onboarding screens
communicate: discover trusted event services; build one guided plan; let Mee
Events coordinate delivery. Use concise copy and a progress indicator with Skip
and Continue. Do not describe the app as a vendor directory.

Login uses +91 mobile number, visible privacy reassurance, Terms and Privacy
links, and one Continue action. OTP uses six digits, SMS autofill affordance,
masked phone number, resend countdown, change-number action, loading state in
the verify button, and inline invalid/expired-code treatment.

Notification Centre groups Today and Earlier and shows enquiry, quotation,
payment, event update, vendor review, and worker assignment examples without
exposing information across roles. Help and Support offers relevant FAQs,
contact Mee Events, report a problem, and emergency event support. Do not show
direct vendor or customer contact shortcuts.

ACCEPTANCE CRITERIA

- One clear action on every entry screen.
- Indian phone conventions are correct.
- Authentication feels secure without looking technical.
- Onboarding value is customer-first and managed-service-first.
- Notifications are clearly linked to server records and role context.
```

## 7. Customer experience

### Module 02 — Customer Home

#### Screens

1. `C02A Home — Default`
2. `C02B Home — Search Active`
3. `C02C Home — Date and Location Context`

#### Stitch prompt

```text
MODULE: CUSTOMER HOME

USER

A Hyderabad customer planning a wedding, birthday, house warming, festival, or
corporate event who wants confident inspiration without being overwhelmed.

SCREEN C02A — HOME DEFAULT

Create one strong first viewport with greeting, Hyderabad location, optional
event-date context, notification icon, a prominent search field, and a
photography-led hero for starting or resuming an event plan. Continue with
occasion entry points, curated Mee Events offerings, trending services, packages
or deals, recently viewed content, customer trust signals, and one useful support
message. Use authentic examples such as Wedding, Birthday, House Warming,
Corporate Event, Mehndi, Sangeet, Decoration, Catering, Photography, and Venues.
Use the Customer bottom navigation: Home, Explore, Plan, Enquiries, Account.

SCREEN C02B — SEARCH ACTIVE

Show a focused search state with recent searches, popular searches, categories,
and typed results grouped by event type, ceremony, service, and offering. Results
must be Mee Events content; do not expose a compare-vendors pattern.

SCREEN C02C — DATE AND LOCATION CONTEXT

Design a bottom sheet for location, event date, and flexible-date selection.
Include current Hyderabad area, saved addresses, enter a different locality, and
clear explanation that context improves relevant offerings and planning.

ACCEPTANCE CRITERIA

- The first viewport is composed, not a dashboard dump.
- The primary action is Start planning or Resume plan.
- Search and occasions are easy to understand in five seconds.
- No customer-facing vendor base price, ranking, bid, or selection language.
```

### Module 03 — Explore, category, search, and offering detail

#### Screens

1. `C03A Explore — Event Types`
2. `C03B Ceremony Detail`
3. `C03C Service Results`
4. `C03D Filters and Sort`
5. `C03E Mee Events Offering Detail — Vendor Hidden`
6. `C03F Mee Events Offering Detail — Vendor Disclosed`

#### Stitch prompt

```text
MODULE: CUSTOMER DISCOVERY AND OFFERING DETAIL

INFORMATION ARCHITECTURE

Event type -> function or ceremony -> service category -> service subcategory ->
Mee Events offering -> offering variant.

REQUIRED EXPERIENCE

Create six screens that make this hierarchy feel natural instead of technical.
Explore begins with photography-led event types and a separate browse-by-service
section. Ceremony Detail uses a Mehndi example with a short planning summary and
suggested needs such as backdrop decoration, artist, floral jewellery, catering,
photography, grand entry, and special effects.

Service Results includes search, result count, filter chips, sort, favourites,
clear starting prices in Rupees where available, availability guidance, and card
layouts that work with long Indian service names. Do not show vendor comparison.

Filters and Sort is a bottom sheet with service type, offering type
(sale/rental/service), price range, locality or service area, date availability,
capacity, rating, and sort. Use Apply filters as the one primary action and Clear
all as text.

Offering Detail must include image gallery, Mee Events title, trust signals,
customer-facing price, variants, inclusions, exclusions, capacity or duration,
availability guidance, service area, cancellation/terms summary, reviews, related
offerings, favourite, share, and sticky Add to plan action.

Create two visibility variants. In Vendor Hidden, show “Fulfilled by Mee Events”
and Mee Events support only. In Vendor Disclosed, show the approved vendor name,
verification badge, and business summary, but keep the customer transaction and
primary contact with Mee Events. Do not show private base price or margin.

ACCEPTANCE CRITERIA

- The hierarchy is clear without breadcrumbs dominating the phone screen.
- Offering price is unmistakably the Mee Events customer price.
- Vendor-hidden and vendor-disclosed states cannot be confused.
- Add to plan is the single persistent primary action.
```

### Module 04 — Plan Event and submit enquiry

#### Screens

1. `C04A Plan — Start or Resume`
2. `C04B Plan Step 1 — Event and Functions`
3. `C04C Plan Step 2 — Date, Venue, Guests, Budget`
4. `C04D Plan Step 3 — Services and Requirements`
5. `C04E Plan Step 4 — Inspiration and Contact`
6. `C04F Plan Summary`
7. `C04G Enquiry Submitted`

#### Stitch prompt

```text
MODULE: GUIDED EVENT PLAN AND ENQUIRY SUBMISSION

USER GOAL

Turn an idea into a complete event brief with low cognitive load, save progress,
and submit it to Mee Events for expert follow-up.

FLOW

Design the seven named screens as one progressive flow. Use a clear stepper,
Back, Save and exit, and one Continue action. Auto-save reassurance is subtle.

Start or Resume shows active drafts with event name, completion percentage, date,
and last updated time, plus Start a new plan.

Step 1 captures event type and one or more functions or ceremonies. Use Wedding
with Mehndi, Sangeet, Wedding, and Reception as realistic content.

Step 2 captures dates and times per function, Hyderabad location, venue booked /
need a venue / undecided, estimated guest count, and optional budget guidance.
Budget is guidance, not a promise.

Step 3 captures recommended and optional services per function, selected Mee
Events offerings, variants, quantities, and function-specific questions. Make
adding and editing service requirements easy without creating a dense cart UI.

Step 4 captures inspiration photos or documents, notes, optional privately
preferred external vendor information, contact method, best contact time,
consent, and privacy explanation. State clearly that an external preference is
private and does not publish or onboard that vendor.

Plan Summary groups event basics, functions, services, budget guidance,
attachments, contact preference, and editable sections. The only primary action
is Submit enquiry. Explain what happens next and expected branch-response timing
without guaranteeing an unrealistic time.

Submission success shows a reference such as `MEE-HYD-260804-1842`, summary,
customer-visible status “Received,” expected next step, View enquiry, and Return
home. Avoid confetti overload.

ACCEPTANCE CRITERIA

- The flow feels guided, not like one long form.
- Draft persistence and editability are clear.
- No payment or binding-booking language appears at enquiry submission.
- Duplicate submission is prevented visually by a disabled busy action.
```

### Module 05 — Enquiries and customer-visible timeline

#### Screens

1. `C05A Enquiries — List`
2. `C05B Enquiry Detail — Received`
3. `C05C Enquiry Detail — In Discussion`
4. `C05D Request a Change`
5. `C05E Cancel Enquiry Confirmation`

#### Stitch prompt

```text
MODULE: CUSTOMER ENQUIRY TRACKING

CUSTOMER-VISIBLE STATUS MODEL

Draft, Submitted, Received, Contact pending, In discussion, Proposal expected,
Closed, Cancelled.

REQUIRED EXPERIENCE

Create five screens. Enquiries List separates active and past enquiries, includes
drafts, and shows reference, event, date, locality, last update, and readable
status. Avoid internal CRM terms such as lead stage, owner queue, qualification,
or vendor sourcing.

Enquiry Detail uses a stable summary header, status explanation, vertical
timeline, marketing-contact status, requirements summary, attachments, activity,
and clear support entry. Create Received and In Discussion variants with
appropriate next actions. Do not invent a quotation before it exists.

Request a Change is a focused form with category, description, attachments, and
impact notice. Cancellation uses a confirmation bottom sheet with reason, clear
consequence, and non-destructive back path.

ACCEPTANCE CRITERIA

- Status tells the customer what happened and what happens next.
- Timeline is readable and not overloaded with internal activity.
- Change and cancel actions cannot be confused with confirmed completion.
```

### Module 06 — Quotation, booking, and payment

#### Screens

1. `C06A Quotation Available`
2. `C06B Quotation Version Detail`
3. `C06C Approve or Decline Quotation`
4. `C06D Payment Plan`
5. `C06E Make Payment`
6. `C06F Payment Result — Success`
7. `C06G Payment History and Invoice`

#### Stitch prompt

```text
MODULE: QUOTATION, BOOKING, AND PAYMENT

USER GOAL

Understand exactly what Mee Events proposes, compare quotation versions, make an
auditable decision, pay safely, and retain receipts.

REQUIRED EXPERIENCE

Quotation Available presents quotation number, version, issue and validity dates,
event summary, total, required advance, payment milestones, and one View quotation
action. Version Detail groups line items by event function with quantities,
variants, inclusions, exclusions, tax or fee treatment, discounts if applicable,
payment schedule, terms, and version history. Do not reveal vendor base prices or
margins.

Approve or Decline uses deliberate confirmation. Approval acknowledges terms and
shows the resulting advance requirement. Decline requires a reason or requests a
revision without using hostile language.

Payment Plan distinguishes paid, due now, and upcoming milestones with dates and
amounts. Make Payment shows selected milestone, amount, secure payment-provider
handoff, billing contact, and final confirmation. Never design fake card capture
that implies Mee Events stores sensitive card details.

Payment Success shows transaction reference, amount, date, booking status, View
receipt, and Continue to event. Payment History shows transaction statuses,
downloadable receipts/invoices, failed or refunded treatment, and outstanding
balance.

ACCEPTANCE CRITERIA

- Version number and quotation validity are impossible to miss.
- Customer understands approval, payment, and booking are distinct milestones.
- Money uses Indian Rupee formatting and readable totals.
- Failed, pending, and duplicate payment paths can be designed later without
  changing the screen architecture.
```

### Module 07 — Event workspace, support, and completion

#### Screens

1. `C07A Event Workspace — Overview`
2. `C07B Event Program and Schedule`
3. `C07C Files and Documents`
4. `C07D Manager Conversation`
5. `C07E Change Request`
6. `C07F Event Progress`
7. `C07G Completion Confirmation and Feedback`

#### Stitch prompt

```text
MODULE: CUSTOMER EVENT WORKSPACE

USER GOAL

See one calm source of truth from booking through event completion and contact
the assigned Mee Events manager when needed.

REQUIRED EXPERIENCE

Event Workspace Overview shows event name, dates, locality, booking status,
payment status, next milestone, assigned Mee Events manager, progress summary,
upcoming program item, important update, and quick links to Program, Payments,
Files, Changes, and Support. Do not expose operational vendor selection or worker
contact details.

Program and Schedule uses a date/function selector and a clear timeline with
time, venue area, service, and customer-facing status. Files groups quotation,
invoice, receipt, plan, inspiration, and approved documents.

Manager Conversation is a professional Mee Events support thread with message
timestamps, attachments, reply composer, response-hours note, and emergency
support escalation. It is not vendor chat.

Change Request shows requested change, impact-review status, possible price or
schedule implications, conversation, and decision history. Event Progress shows
customer-meaningful milestones only: planning confirmed, resources arranged,
event preparation, in progress, completed.

Completion asks the customer to confirm delivery, report unresolved issues, rate
the overall Mee Events experience, add comments, and submit feedback. Avoid
rating individual hidden workers or vendors.

ACCEPTANCE CRITERIA

- Workspace reduces anxiety and avoids internal operations noise.
- The manager is clearly a Mee Events contact.
- Event progress never makes unsupported real-time promises.
- Completion offers a clear issue path before final confirmation.
```

### Module 08 — Customer account, saved content, and role entry

#### Screens

1. `C08A Account`
2. `C08B Customer Profile`
3. `C08C Saved Addresses`
4. `C08D Saved Plans and Offerings`
5. `C08E Become a Vendor or Worker`
6. `C08F Privacy, Legal, and Account Controls`

#### Stitch prompt

```text
MODULE: CUSTOMER ACCOUNT AND ROLE ENTRY

REQUIRED EXPERIENCE

Create six screens. Account shows identity, current role, role switcher, profile,
saved addresses, saved plans, saved offerings, preferred external vendors,
notifications, help, language-ready settings, privacy, legal, and logout. Keep it
clean and grouped, not a grid of decorative cards.

Profile captures display name, verified mobile number, optional email, contact
preference, and profile image. Saved Addresses supports Home, Work, Venue, and
Other with Hyderabad locality and map-assisted confirmation. Saved Plans and
Offerings use tabs with empty and populated examples.

Become a Vendor or Worker explains both roles before application. Vendor: sell,
rent, or provide services after verification. Worker: receive assigned field work
after skills and identity verification. Explain that roles use the same account,
approval is required, and applications can be saved as drafts.

Privacy and Account Controls include permissions, location-use explanation,
download/request data, revoke device sessions, logout, and delete-account request
with confirmation. Do not imply instant deletion of auditable business records.
```

## 8. Vendor experience

### Module 09 — Vendor application and approval states

#### Screens

1. `V09A Become a Vendor — Overview`
2. `V09B Vendor Application — Offering Types`
3. `V09C Vendor Application — Business and Owner`
4. `V09D Vendor Application — Service Areas and Categories`
5. `V09E Vendor Application — Verification Documents`
6. `V09F Vendor Application — Initial Listing`
7. `V09G Vendor Application — Review and Declaration`
8. `V09H Vendor Application — Status`
9. `V09I Vendor Application — Changes Requested`

#### Stitch prompt

```text
MODULE: VENDOR ONBOARDING AND APPROVAL

USER GOAL

Apply to offer sale products, rental products, services, or any combination
through Mee Events and clearly understand the review process.

REQUIRED EXPERIENCE

Create the nine named screens as a progressive application with save-and-exit,
step progress, clear document privacy, and no false promise of approval.
Capture offering types; legal/business identity; owner and contact details;
address; Hyderabad service areas; categories; verification requirements;
document upload; an initial listing with private vendor base price; review;
declaration; and submission result.

The review screen must explicitly state: Mee Events reviews the application and
listings; Mee Events controls final customer pricing; vendor base prices are
private; public vendor identity is controlled by Mee Events.

Status supports Draft, Submitted, Under review, Changes requested, Resubmitted,
Approved, Rejected, Suspended, and Revoked. Changes Requested shows actionable
reviewer feedback per section, due guidance, edit links, and Resubmit. An
unapproved vendor must not see an approved vendor dashboard.

ACCEPTANCE CRITERIA

- Long application feels manageable.
- Uploaded verification files appear private and secure.
- Base price and customer price are never confused.
- Status and next action are always explicit.
```

### Module 10 — Vendor overview, listings, and price review

#### Screens

1. `V10A Vendor Overview`
2. `V10B Listings — All Statuses`
3. `V10C Add Listing — Details`
4. `V10D Add Listing — Variants and Base Price`
5. `V10E Add Listing — Availability and Terms`
6. `V10F Listing Preview and Submit`
7. `V10G Listing Detail — Published with Pending Revision`
8. `V10H Price Change Review`
9. `V10I Reviews and Feedback`

#### Stitch prompt

```text
MODULE: VENDOR LISTING AND PRICE MANAGEMENT

VENDOR NAVIGATION

Use five bottom destinations for the complete design: Overview, Listings, Add,
Reviews, Business. Keep one shared Mee Events visual system and use vendor green
only as a small role marker.

REQUIRED EXPERIENCE

Vendor Overview shows approval/account status, active work order, published
listing count, pending listing revisions, price reviews, messages, and settlement
summary. Do not crowd the first viewport with every metric.

Listings has filters for Draft, Under review, Changes requested, Published,
Paused, and Archived. Cards show image, title, offering type, category, current
base-price status, availability, and review state. Never show a customer-facing
price.

Add Listing is progressive across details; category/subcategory; photos;
sale/rental/service type; variants; private base price; unit/duration/capacity;
service area; availability; lead time; terms; and exclusions. Listing Preview
must look like a controlled vendor preview and state that Mee Events may present
the customer offering differently after approval.

Published with Pending Revision visibly separates the currently published
version from a draft or pending revision. The live version stays active during
review. Price Change Review shows current approved base price, proposed base
price, reason, effective date after approval, review status, and reviewer
feedback. Do not imply the proposed amount is immediately live.

Reviews and Feedback includes listing reviews, price reviews, change requests,
approval/rejection history, and customer-rating summaries relayed by Mee Events.
No direct customer identity or contact.

ACCEPTANCE CRITERIA

- Listing and price lifecycles are understandable at a glance.
- Published and pending versions cannot be confused.
- Customer price, margin, and competitor data never appear.
```

### Module 11 — Vendor work orders, invoices, settlements, and business

#### Screens

1. `V11A Work Orders`
2. `V11B Work Order Offer`
3. `V11C Active Work Order Detail`
4. `V11D Vendor Progress and Evidence`
5. `V11E Vendor Incident or Help`
6. `V11F Submit Invoice`
7. `V11G Vendor Earnings and Settlements`
8. `V11H Vendor Business Profile`

#### Stitch prompt

```text
MODULE: VENDOR FULFILMENT AND BUSINESS

USER GOAL

Respond to assigned Mee Events work, execute the agreed scope, provide evidence,
submit an invoice, and track vendor settlement.

REQUIRED EXPERIENCE

Work Orders separates offers, accepted/upcoming, active, completed, and cancelled.
Work Order Offer shows only necessary event, program, locality, schedule, scope,
vendor payable or commercial amount where authorised, response deadline, terms,
and Accept or Decline. Do not show customer pricing, margin, unnecessary customer
data, or competing vendors.

Active Work Order Detail includes reporting contact at Mee Events, schedule,
scope, checklist, delivery or setup notes, status update, evidence, and help.
Progress and Evidence supports photos, delivery confirmation, notes, and
submission status. Incident or Help captures category, severity, description,
photos, immediate safety action, and Mee Events operations escalation.

Submit Invoice captures invoice number, work order reference, amount within the
authorised scope, tax details, invoice upload, notes, and declaration. Earnings
and Settlements shows pending invoice approval, approved payable, processing,
paid, failed or held settlement, period filters, and transaction references.

Business Profile shows identity, approved categories, service areas,
verification status, bank/settlement profile status, documents, support, and
read-only vendor visibility status: Hidden or Disclosed. Make it clear only Mee
Events controls visibility.
```

## 9. Worker experience

### Module 12 — Worker application and approval

#### Screens

1. `W12A Become a Worker — Overview`
2. `W12B Worker Application — Skills`
3. `W12C Worker Application — Identity and Experience`
4. `W12D Worker Application — Work Area and Availability`
5. `W12E Worker Application — Documents and Emergency Contact`
6. `W12F Worker Application — Review and Declaration`
7. `W12G Worker Application — Status`
8. `W12H Worker Application — Changes Requested`

#### Stitch prompt

```text
MODULE: WORKER ONBOARDING AND APPROVAL

USER GOAL

Apply for verified event work through Mee Events using a simple, respectful,
mobile-first process suitable for field workers with varied digital confidence.

REQUIRED EXPERIENCE

Create eight screens with large controls, plain language, save-and-exit, and
clear progress. Capture skills and service categories; identity and contact;
experience; home address and preferred Hyderabad work areas; availability and
shift preference; required evidence; emergency contact; review; declaration;
submission; status; and changes requested.

Explain location use in plain language: location is requested only when needed
for attendance verification. Explain that Mee Events assigns work; workers do
not browse or self-assign to customer events.

Status supports Draft, Submitted, Under review, Changes requested, Resubmitted,
Approved, Rejected, Suspended, and Revoked. Do not show Worker navigation before
approval. Changes Requested gives one actionable reason per affected section and
preserves already accepted information.

ACCEPTANCE CRITERIA

- Language is direct and respectful, not HR jargon.
- Document upload and emergency contact feel safe and private.
- Approval status and next action are obvious.
- No customer contact or financial data appears.
```

### Module 13 — Worker home, assignments, attendance, and proof of work

#### Screens

1. `W13A Worker Home`
2. `W13B Assignment Offer`
3. `W13C Assignments and Daily Schedule`
4. `W13D Assignment Detail`
5. `W13E Check In — Location Consent`
6. `W13F Active Assignment Checklist`
7. `W13G Submit Proof of Work`
8. `W13H Report Incident or Get Help`
9. `W13I Check Out and Completion`

#### Stitch prompt

```text
MODULE: WORKER FIELD EXECUTION

WORKER NAVIGATION

Use five bottom destinations: Home, Assignments, Availability, Earnings,
Profile. Use worker blue only as a small role-context accent; keep the shared Mee
Events brand system.

FIELD UX PRIORITIES

Design for bright outdoor conditions, one-handed use, limited time, intermittent
connectivity, and users with varied digital confidence. Use large status labels,
short instructions, generous tap targets, and persistent clarity about queued
versus server-confirmed actions.

REQUIRED EXPERIENCE

Worker Home shows availability status, next assignment, check-in readiness,
important announcement, and a single context-sensitive primary action.

Assignment Offer shows event type, locality, reporting time, expected duration,
Mee Events supervisor, role, duties summary, payable amount if authorised,
response deadline, and Accept or Decline. Reveal no customer contact and no event
financials.

Assignments and Daily Schedule separates offers, upcoming, active, and completed.
Assignment Detail shows venue directions, reporting point, supervisor, schedule,
work instructions, checklist, required items, help, and attendance controls.

Check In requests location permission only if required, explains why, shows
distance or verification condition, time, and manual-help path. Create confirmed,
outside permitted area, permission denied, and offline queued treatments without
making the screen feel punitive.

Active Checklist uses large checkboxes, progress, notes, photo-required markers,
and blocked-task escalation. Proof of Work supports photo capture, caption,
supervisor sign-off where required, upload progress, retry, and queued offline.

Incident or Help prioritises safety with Emergency, Injury, Material issue,
Schedule issue, Missing resource, and Other. It contacts Mee Events operations,
not the customer.

Check Out summarises completed tasks, exceptions, evidence, actual time, and
completion declaration. Clearly separate submitted for supervisor approval from
approved completion.
```

### Module 14 — Worker availability, earnings, performance, and profile

#### Screens

1. `W14A Availability — Calendar`
2. `W14B Availability — Work Areas and Shifts`
3. `W14C Earnings Overview`
4. `W14D Settlement Detail`
5. `W14E Performance Summary`
6. `W14F Worker Profile`

#### Stitch prompt

```text
MODULE: WORKER AVAILABILITY, EARNINGS, AND PROFILE

REQUIRED EXPERIENCE

Availability Calendar supports Available, Unavailable, Accepted assignment, and
Pending offer with text/icon patterns in addition to colour. Prevent visual
selection of a conflicting accepted-assignment period. Include recurring
availability and Save changes.

Work Areas and Shifts supports selected Hyderabad zones or localities, travel
preference, morning/day/evening/night, and clear explanation that preferences
help matching but do not guarantee work.

Earnings Overview separates completed work pending approval, approved payable,
next settlement, and paid history. Show assignment reference, date, role,
authorised payable, status, and no event-wide financial information. Settlement
Detail shows amount, adjustments with explanation, transaction reference, date,
and support for a payment issue.

Performance Summary shows completed assignments, punctuality, checklist
completion, ratings or feedback, and improvement guidance. Avoid gamification,
public leaderboards, or shame-based messaging.

Worker Profile shows verified identity status, skills, work areas, documents,
emergency contact, bank/settlement status, privacy, support, and role switcher.
```

## 10. Module 15 — Shared states, permissions, and resilience

### Screens

1. `S15A Loading Skeleton Patterns`
2. `S15B Empty State Patterns`
3. `S15C Recoverable Error Patterns`
4. `S15D Offline and Queued Actions`
5. `S15E Expired Session`
6. `S15F Permission Education`
7. `S15G Duplicate Submission Prevented`
8. `S15H Restricted Role or Approval Required`

### Stitch prompt

```text
MODULE: SHARED STATES AND RESILIENCE

GOAL

Design realistic shared state screens and components for the approved Mee Events
flows. Reuse the exact visual structure of the approved feature screens. Do not
introduce a new illustration style.

REQUIRED STATES

Loading uses shape-matched skeletons. Empty states explain why the area is empty
and give one useful action. Errors preserve customer-entered data and offer a
specific retry or support action. Offline shows cached content when possible and
labels queued actions separately from confirmed actions. Expired Session protects
work in progress and returns to OTP login. Permission Education explains camera,
photos, notifications, and attendance-location use before the operating-system
prompt. Duplicate Submission Prevented shows that the first enquiry, payment,
invoice, check-in, or proof submission is being processed and must not be sent
again. Restricted Role explains that Vendor or Worker access requires current
Mee Events approval.

ACCEPTANCE CRITERIA

- No state is a dead end.
- Queued, pending, and confirmed are visually and verbally distinct.
- Errors are human and actionable without exposing technical internals.
- Role restriction cannot be mistaken for a broken screen.
```

## 11. Module 16 — Prototype linking and final UX audit

### Stitch prompt

```text
MODULE: FINAL PROTOTYPE AND UX AUDIT

Using all approved Mee Events screens, prepare a consistent clickable prototype
map for these three golden paths:

CUSTOMER GOLDEN PATH

Onboarding -> Mobile login -> OTP -> Home -> Explore -> Ceremony -> Offering
detail -> Add to plan -> Complete plan -> Submit enquiry -> Track enquiry -> View
quotation -> Approve -> Pay advance -> Event workspace -> Confirm completion.

VENDOR GOLDEN PATH

Customer Account -> Become a Vendor -> Complete application -> Under review ->
Approved role -> Vendor Overview -> Add listing -> Submit for review -> Published
listing -> Price revision -> Accept work order -> Submit evidence -> Submit
invoice -> Track settlement.

WORKER GOLDEN PATH

Customer Account -> Become a Worker -> Complete application -> Under review ->
Approved role -> Worker Home -> Set availability -> Accept assignment -> Check in
-> Complete checklist -> Submit proof -> Check out -> Track earnings.

AUDIT AND CORRECT

1. Verify every screen has one dominant action.
2. Verify tab names, screen titles, and status labels are consistent.
3. Verify all back, cancel, close, save-draft, retry, and support paths.
4. Verify Customer never selects an operational vendor.
5. Verify Vendor never sees customer price, margin, or competitors.
6. Verify Worker never sees customer contact or event finances.
7. Verify hidden vendor identity never leaks through cards, messages, files, or
   event timelines.
8. Verify 44 px touch targets, readable contrast, text scaling tolerance, and
   non-colour status cues.
9. Verify loading, empty, error, offline, expired-session, duplicate-action, and
   approval-restriction states exist for critical flows.
10. Verify authentic Indian English, Rupee formatting, Hyderabad examples, and
    realistic dates and names.

Do not redesign accepted screens. Make only consistency and usability fixes.
```

## 12. Small refinement prompts

Use these after a screen is generated.

### Reduce visual noise

```text
Preserve the current visual system and content. Simplify the first viewport so it
communicates one idea and one primary action. Remove decorative cards, duplicate
labels, unnecessary gradients, and low-value metrics. Keep all essential
business information below the fold.
```

### Correct managed-marketplace behaviour

```text
Correct this screen to reflect the Mee Events managed marketplace. The customer
chooses a Mee Events offering, not an operational vendor. Remove vendor compare,
vendor bidding, direct contact, and choose-vendor controls. Keep vendor identity
only if explicitly marked disclosed. Preserve the rest of the screen.
```

### Correct Vendor privacy and pricing

```text
Keep the layout. Remove any customer-facing price, margin, commission formula,
competitor information, or customer contact. Show only the vendor's private base
price, authorised work-order commercial amount, invoice amount, or settlement as
appropriate to this screen.
```

### Correct Worker field usability

```text
Keep the visual direction. Increase field usability: use shorter instructions,
larger tap targets, clearer status text, one-handed controls, high daylight
contrast, and explicit queued-versus-confirmed offline feedback. Do not expose
customer contact or event finances.
```

### Make content implementation-ready

```text
Replace generic labels and placeholder content with realistic Hyderabad event
content, Indian names, dates, localities, phone conventions, and Rupee values.
Keep copy concise. Ensure every value has a clear label and every status explains
the next step.
```

### Create a variant without design drift

```text
Create one alternative of this exact screen with a clearer information hierarchy.
Preserve colours, typography, components, spacing scale, navigation, content,
business rules, and frame size. Change only layout and hierarchy.
```

## 13. Export and handoff checklist

When the design is ready, provide the following for implementation:

### Preferred handoff

1. Figma file or share link created from the approved Stitch screens.
2. Stitch export archive as a secondary visual reference, if available.
3. PNG exports of every final screen at 1x or 2x.
4. All original image assets used in the designs.
5. A short list of final fonts, colours, radii, spacing, and icons.
6. Prototype connections for the three golden paths.
7. Notes for animations, bottom sheets, dialogs, sticky actions, and gestures.
8. A state matrix showing which screens have loading, empty, error, offline,
   restricted, and success variants.
9. Founder-approved list of screens and any intentional deviations from this
   playbook.

### File and screen naming

Keep the screen IDs from this playbook. Organise the Figma file into pages:

```text
00 Foundations
01 Shared and Auth
02 Customer
03 Vendor
04 Worker
05 States
06 Prototype
99 Archive
```

Name assets semantically, for example:

```text
hero/customer/wedding-sangeet
category/decoration
offering/mehndi-backdrop-01
icon/status/payment-pending
```

### Implementation-ready review

Before handoff, confirm:

- All final frames use one consistent mobile width.
- Repeated elements are components or clearly consistent patterns.
- Text is editable, not flattened into images.
- Every image is available outside the generated screen.
- Icons have a consistent family and stroke weight.
- Overlays and sheets have a visible trigger and dismissal path.
- Scroll behaviour and sticky elements are documented.
- No private data appears in the wrong role.
- No prototype-only feature is presented as a live guarantee.

## 14. What to send for implementation

The most useful implementation package is:

```text
1. Figma share link with view access
2. Stitch export archive
3. Final screen inventory
4. Golden-path prototype
5. Original image and icon assets
6. Notes describing anything that changed from the approved PRDs
```

With that package, the implementation can be mapped to the existing Flutter
Customer, Vendor, and Worker modules, shared design system, backend contracts,
role rules, and state lifecycles without guessing the intended behaviour.
