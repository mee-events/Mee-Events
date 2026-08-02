# Customer App PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Surface: `customer_mobile` in `apps/mobile` (Flutter)
- Related: `docs/product/application-screen-map-v1.md`,
  `docs/product/mobile-application-architecture-v1.md`, ADR 0008, ADR 0009

## 1. Purpose

The Customer App lets a person or business discover Mee Events offerings,
build an event plan, submit an enquiry, approve a quotation, pay, and track
the event to completion. The customer engages with Mee Events, not with
individual vendors; vendor identity appears only when Mee Events explicitly
enables disclosure.

## 2. Current implementation state

Implemented today in `apps/mobile/lib/features/customer/`:

- Five-tab navigation: Home, Explore, Plan, Enquiries, Account
- Home with banners, announcements, categories, trending services, reviews
- Explore with category browsing and category detail
- Four-step Plan flow ending in an enquiry summary
- Enquiries tab with quotation chat overlay
- Event workspace, quotation view, payment preview, and manager chat overlays
- Account tab with profile entry points

Not yet live (labelled and preserved as previews):

- Real OTP login and sessions
- Live enquiry submission and status (data is local sample data)
- Real quotations, bookings, and payments

## 3. Customer journey

```text
Discover
  -> Choose an event type
  -> Choose a function or ceremony
  -> Browse suggested services, products, and deals
  -> View offering details and the Mee Events price
  -> Add requirements to the event plan
  -> Enter date, time, location, guest count, and notes
  -> Optionally add a preferred external vendor
  -> Review the complete requirement
  -> Submit enquiry
  -> Await marketing contact within the branch SLA
  -> Discuss, receive quotation, approve, pay advance
  -> Track the event to completion and closure
```

## 4. Functional requirements

### 4.1 Authentication and account

- Sign up / login with mobile number and OTP (`POST /api/v1/auth/otp/request`
  and `POST /api/v1/auth/otp/verify`)
- Session persistence with refresh-token rotation; logout revokes the device
  session
- Customer is the default role after login; approved Vendor/Worker roles
  appear in the role switcher (see PRDs 02 and 03)
- Profile management: display name, saved addresses, contact preference

### 4.2 Discovery (Home and Explore)

- Location and event-date context
- Search across event types, functions, services, and offerings, including
  source aliases from the catalogue taxonomy
- Event-type entry points, featured services, curated packages and deals
- Listing details with gallery, variants, availability, and the Mee Events
  customer price only
- Vendor details shown only when `vendor_visibility = disclosed`; otherwise
  Mee Events branding and support contact appear
- Saved favourites and recently viewed items

### 4.3 Plan and enquiry

- Start or resume an event plan (drafts persist per customer)
- Capture event type, functions/ceremonies, date and time, location and venue
  status, guest count, and budget guidance
- Select services and catalogue listings; capture listing versions at
  selection time so later price changes never mutate the enquiry
- Requirement questions per function template
- Preferred external vendors attached privately (ADR 0008)
- Attachments and inspiration
- Contact preference and consent
- Plan summary, submit enquiry, and submission confirmation with a reference
  identifier

### 4.4 Enquiry tracking

- Draft and submitted enquiry lists
- Enquiry details with a customer-visible timeline
- Customer-visible statuses (stable regardless of internal CRM states):

```text
draft
submitted
received
contact_pending
in_discussion
proposal_expected
closed
cancelled
```

- Marketing contact status
- Cancel or request changes

### 4.5 Quotation, booking, and payment (slice 3)

- View quotation versions with line items and validity
- Approve or decline a quotation with an auditable action
- Payment plan visibility: advance, milestones, and balance
- Payment submission via the payment gateway integration and payment history
- Invoice access

### 4.6 Event tracking and support (slices 4-6)

- Event workspace showing the confirmed program, schedule, and progress
- Real-time status updates (notifications inform; the server record is
  authoritative)
- Manager chat for the assigned Mee Events contact
- Change requests
- Completion confirmation, feedback, and rating

### 4.7 Notifications

- In-app notification centre and push notifications for enquiry status,
  quotation availability, payment events, and event updates

## 5. Non-functional requirements

- Every network-backed action supports loading, success, empty, error,
  offline, duplicate-submission, and expired-session states
- Enquiry submission uses idempotency keys to protect against duplicates
- Touch targets at least 44 logical pixels; text supports system font scaling
- No exposure of vendor base prices, internal margins, verification files, or
  staff notes in any customer API response or client cache

## 6. Out of scope for this surface

- Vendor comparison or operational vendor selection (ERP decides fulfilment)
- Direct worker contact
- Editing Mee Events prices
- Any admin or employee functionality

## 7. Acceptance criteria

- A customer can register, log in, and maintain a session on a real device
- A customer can browse the catalogue served from managed data
- A customer can build a plan and submit an enquiry that reaches the CRM as a
  lead, and can see the same status the CRM shows
- A customer can approve a quotation and complete an advance payment (slice 3)
- All statuses shown to the customer come from the server, never from local
  fixtures, in production builds
