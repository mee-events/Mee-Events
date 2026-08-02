# Vendor App PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Surface: `vendor_mobile` in `apps/mobile` (Flutter)
- Related: ADR 0008, `docs/product/application-screen-map-v1.md`,
  `docs/product/catalog-taxonomy-v1.md`

## 1. Purpose

The Vendor App lets an approved service provider offer products for sale,
products for rent, and services through the Mee Events managed marketplace.
Vendors manage listings, base prices, availability, work orders, and
earnings. Mee Events controls approval, the final customer price, and
vendor-identity disclosure; the Vendor App must never imply otherwise.

## 2. Current implementation state

`apps/mobile/lib/features/vendor/` contains a development-preview dashboard
with sample data and a quotation-reply modal. Onboarding, listings, price
review, work orders, and earnings are specified here and delivered in
vertical slices (primarily slice 5).

## 3. Vendor journey

```text
Customer account
  -> Choose "Become a Vendor"
  -> Select sale, rental, service, or any combination
  -> Enter business, service-area, and verification details
  -> Upload required evidence
  -> Create initial listings and base prices
  -> Submit for review
  -> Mee Events verifies application and listings
  -> Approval activates the Vendor role
  -> Vendor manages listings and proposed price changes
  -> Vendor receives and fulfils assigned work orders
  -> Vendor tracks invoices and settlements
```

## 4. Functional requirements

### 4.1 Onboarding and approval

- Vendor application from the Customer Account tab: offering-type selection
  (sale, rental, service), business identity, owner/contact information,
  address and service areas, category selection, verification requirements,
  document upload, initial listing creation, review, and declaration
- Application lifecycle mirrors the role-assignment states:

```text
not_applied -> draft -> submitted -> under_review -> changes_requested
  -> resubmitted -> approved | rejected
approved -> suspended | revoked
```

- Rejection records a reason and reapplication policy
- Approved navigation must never appear for an unapproved role because of
  cached client state; the backend bootstrap policy is authoritative

### 4.2 Navigation

Bottom navigation: Overview, Listings, Add, Reviews, Business.

### 4.3 Listings

- Listing lifecycle:

```text
draft -> submitted -> under_review -> changes_requested -> approved
  -> published -> paused -> archived
```

- A published listing may have a separate pending revision; the published
  version stays customer-visible while the revision is reviewed
- Listing fields: offering type, category and subcategory, title,
  description, photos, variants, vendor base price, unit/duration/capacity,
  service area, availability and lead time, terms and exclusions
- Draft save, preview, duplicate, and archive controls

### 4.4 Pricing (ADR 0008)

- The vendor submits an internal base price only
- A price change creates a new `price_review` version; the existing approved
  price remains active during review
- Vendor price screens show: current base price, pending proposed base price,
  review status and reviewer feedback, and the effective date of the approved
  price
- The app never shows or implies control over the final customer price,
  margins, or Mee Events percentage

### 4.5 Visibility

- `vendor_visibility` (`hidden` or `disclosed`) is read-only for the vendor
  and shown in the Business tab
- Vendors cannot contact customers directly while hidden; communication flows
  through Mee Events

### 4.6 Work orders and fulfilment (slice 5)

- Opportunity and work-order list for assigned events
- Work-order details: event, program, location, schedule, and scope
- Accept/decline within the response window
- Status updates and evidence submission (photos, delivery confirmation)
- Incident and help escalation to Mee Events operations

### 4.7 Earnings and settlement (slice 6)

- Invoice submission for completed work orders
- Payment history and settlement status
- Earnings summary per period

### 4.8 Reviews and analytics

- Listing review status, requested changes, and approval/rejection history
- Customer ratings relayed by Mee Events
- Business analytics: listing views, enquiry attribution, conversion

## 5. Non-functional requirements

- Every screen supports loading, empty, populated, error, and offline states
- Approval-state handling for all nine role states
- Verification documents are private; never exposed to customers
- All vendor mutations are audited with actor, role, and version

## 6. Out of scope for this surface

- Setting or seeing customer-facing prices, margins, or settlement formulas
  beyond the vendor's own payable amounts
- Controlling vendor visibility
- Seeing other vendors' listings, prices, or assignments
- Direct customer contact while visibility is hidden

## 7. Acceptance criteria

- A customer can apply to become a vendor and track application status
- An approved vendor can create a listing that goes through review to
  published, with the published version stable during revision review
- A vendor price change creates a `price_review` version without affecting
  live enquiries or deals
- An assigned vendor can accept a work order and report completion
- A vendor can see accurate payable and settlement history
