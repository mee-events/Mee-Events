# Worker App PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Surface: `worker_mobile` in `apps/mobile` (Flutter)
- Related: `docs/product/application-screen-map-v1.md`,
  `docs/product/mobile-application-architecture-v1.md`

## 1. Purpose

The Worker App lets a field-level or operational team member apply to work
with Mee Events, maintain availability, receive assignments, check in and
out, execute duties with checklists and proof of work, and track earnings.
Workers never contact customers directly; all coordination flows through
Mee Events.

## 2. Current implementation state

`apps/mobile/lib/features/worker/` contains a development-preview dashboard
with sample data. Onboarding, availability, assignments, attendance, and
earnings are specified here and delivered in vertical slices (primarily
slices 5 and 6).

## 3. Worker journey

```text
Customer account
  -> Choose "Become a Worker"
  -> Select skills and service categories
  -> Enter identity, experience, location, and availability
  -> Upload required evidence
  -> Submit for review
  -> Mee Events verifies the application
  -> Approval activates the Worker role
  -> Worker maintains availability
  -> Worker receives, accepts, executes, and completes assignments
  -> Worker tracks approved work and settlements
```

## 4. Functional requirements

### 4.1 Onboarding and approval

- Worker application from the Customer Account tab: skill/service selection,
  identity and contact details, address and work area, experience,
  availability, evidence/document upload, emergency contact, and declaration
- Application lifecycle uses the same role states as vendors:

```text
not_applied -> draft -> submitted -> under_review -> changes_requested
  -> resubmitted -> approved | rejected
approved -> suspended | revoked
```

- The backend bootstrap policy controls navigation; cached client state never
  unlocks worker features

### 4.2 Navigation

Bottom navigation: Home, Assignments, Availability, Earnings, Profile.

### 4.3 Home

- Approval status, availability summary, next assignment summary, and
  Mee Events announcements

### 4.4 Availability

- Available/unavailable status, calendar, work areas, and preferred
  shift/time
- Availability feeds the ERP assignment engine; conflicts with accepted
  assignments are prevented server-side

### 4.5 Assignments (slice 5)

- Assignment offer with event and reporting details, response window, and
  accept/decline
- Daily schedule view of accepted assignments
- Job details: location, reporting time, supervisor, work instructions, and
  task checklist
- Attendance check-in and check-out, with location-based verification where
  required by the assignment
- Task completion updates and status reporting
- Proof-of-work capture (photos, sign-off)
- Incident reporting and help escalation
- Supervisor communication through Mee Events channels

### 4.6 Earnings (slice 6)

- Completed work list, pending-approval amounts, payable amount, and
  settlement history
- Performance summary (completed assignments, punctuality, ratings)

### 4.7 Profile

- Skills, work areas, documents, and emergency contact
- Role switcher back to Customer (and Vendor if held)

## 5. Non-functional requirements

- Attendance and completion events are timestamped server-side and audited
- Offline-tolerant check-in: actions queue locally and reconcile with
  server-side validation; the server record remains authoritative
- Location data is collected only for attendance verification where required,
  and its use is disclosed to the worker
- Every screen supports loading, empty, populated, error, and offline states

## 6. Out of scope for this surface

- Direct customer contact or customer data beyond what an assignment requires
- Viewing customer prices, vendor prices, or event finances
- Self-assignment to events

## 7. Acceptance criteria

- A customer can apply to become a worker and track application status
- An approved worker can maintain availability and receive assignment offers
- A worker can accept an assignment, check in on site, complete checklist
  items, submit proof of work, and check out
- Attendance and completion appear in the ERP against the Event Record
- A worker can see accurate payable amounts and settlement history
