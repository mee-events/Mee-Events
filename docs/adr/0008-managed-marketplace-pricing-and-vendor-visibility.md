# ADR 0008: Managed marketplace, pricing, and vendor visibility

- Status: accepted
- Date: 2026-07-27

## Context

ME Event gives approved vendors a platform to offer products for sale, products
for rent, and services. Customers engage through ME Event, while ME Event may earn
a percentage from completed transactions and remains responsible for the final
customer price.

## Decision

### Vendor capabilities

An approved vendor may offer any one, any combination, or all of:

- Product for sale
- Product for rent
- Service

Vendor access and initial listings require ME Event verification and approval.

### Pricing

- The vendor submits an internal base price.
- ME Event reviews the base price and controls the final customer-facing price.
- Customers see only the ME Event price.
- Approved price versions are immutable historical records.
- A vendor price change creates a new `price_review` version.
- The existing approved price remains active during review.
- Existing enquiries, quotations, and confirmed deals retain their captured
  prices.
- ME Event approves or rejects the proposed price.

### Vendor visibility

Only ME Event can control whether a vendor's identity is disclosed to customers.
The setting must be server-authorized and auditable. Vendors cannot change it.

When vendor visibility is enabled, customers may see approved vendor business
details, phone number, address, and other allowed contact fields.

When vendor visibility is disabled, the vendor identity and contact information
are hidden. Customers see ME Event branding, phone number, address, and support
details instead.

The visibility policy is modeled per vendor, with the option to override it per
listing or customer deal later without changing the customer application model.

### Customer-provided vendors

A customer may privately attach a preferred external vendor to an event enquiry.
The record does not make that person an approved platform vendor or public
listing. ME Event may later contact and onboard the vendor through the normal
verification process.

## Consequences

- Vendor base price and ME Event customer price require separate fields,
  permissions, histories, and audit events.
- Customer-facing APIs must never expose vendor base prices.
- Contact disclosure requires field-level filtering rather than UI-only hiding.
- Existing quotes and deals must use price snapshots, not mutable catalogue
  prices.
- Public listing changes require moderation/versioning so approved content
  remains stable while changes are reviewed.
