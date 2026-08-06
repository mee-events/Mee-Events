# ME Event Application Screen Map v1

- Status: **superseded in part** — use for journey inventory only
- Active client: Flutter `apps/mobile` via AppGateway (Customer + Vendor/Worker ops)
- Removed: development interface preview, `customer-web`, venue/ticket fake path, legacy preview dashboards
- Scope note below is historical (interface-before-auth era); auth and backend are live

## Global application shell

1. Splash and brand introduction
2. ~~Development-only interface preview~~ (removed)
3. Phone login and OTP (shipped)
4. Current-role indicator (via bootstrap / AppGateway)
5. Role switcher (deferred; not a preview shell)
6. Notifications
7. Help and support
8. Profile and settings
9. Legal, privacy, and account management

Authentication is live. Do not reintroduce a development role-preview shell.

## Customer navigation

Recommended bottom navigation:

1. Home
2. Explore
3. Plan Event
4. Enquiries
5. Account

### Customer screens

#### Home

- Location and event-date context
- Search
- Event-type entry points
- Featured services
- Curated packages and deals
- Recently viewed items
- ME Event trust and support content

#### Explore

- Event types
- Functions and ceremonies
- Service categories
- Search results
- Filters and sorting
- Listing grid/list
- Listing details
- Gallery
- Variants and options
- ME Event customer price
- ME Event offering rather than customer vendor selection
- Vendor details when disclosure is enabled
- ME Event details when disclosure is disabled

Multiple vendors may support one offering. Vendor comparison and fulfilment
assignment are deferred to the future ERP after the customer submits an enquiry.

#### Plan Event

- Start or resume plan
- Event type
- Functions/ceremonies
- Date and time
- Location and venue status
- Guest count
- Budget guidance
- Service selection
- Listing selection
- Requirement questions
- Preferred external vendors
- Attachments and inspiration
- Contact preference
- Plan summary
- Submit enquiry
- Submission confirmation

#### Enquiries

- Draft enquiries
- Submitted enquiries
- Enquiry details
- Customer-visible timeline
- Marketing contact status
- Proposal placeholder for later phase
- Cancel or request changes

#### Account

- Customer profile
- Saved addresses
- Saved event plans
- Saved listings
- Preferred external vendors
- Become a Vendor
- Become a Worker
- Role switcher
- Support and legal

## Vendor navigation

Recommended bottom navigation:

1. Overview
2. Listings
3. Add
4. Reviews
5. Business

### Vendor screens

#### Vendor application

- Offering-type selection: sale, rental, service
- Business identity
- Owner/contact information
- Address and service areas
- Category selection
- Verification requirements
- Document upload
- Initial listing creation
- Review and declaration
- Submission result
- Application status
- Changes requested

#### Overview

- Approval and account status
- Published listing count
- Pending listing revisions
- Price reviews
- Paused/rejected listings
- ME Event messages

#### Listings

- All listings
- Draft, review, published, paused, and archived filters
- Listing details
- Current published version
- Pending revision
- Duplicate and archive controls

#### Add or edit listing

- Offering type
- Category and subcategory
- Title and description
- Photos
- Variants
- Vendor base price
- Unit, duration, capacity, and service area
- Availability and lead time
- Terms and exclusions
- Preview
- Save draft
- Submit for approval

#### Reviews

- Listing reviews
- Price reviews
- Requested changes
- Approval/rejection history
- Reviewer feedback visible to vendor

#### Business

- Business profile
- Approved categories
- Service areas
- Verification status
- Vendor-visibility status (read-only)
- Support

## Worker navigation

Recommended bottom navigation:

1. Home
2. Assignments
3. Availability
4. Earnings
5. Profile

Assignments and earnings remain clearly marked as future/mock during the
interface-only phase.

### Worker screens

#### Worker application

- Skill/service selection
- Identity and contact details
- Address and work area
- Experience
- Availability
- Evidence/document upload
- Emergency contact
- Declaration
- Submission and approval status
- Changes requested

#### Worker home

- Approval status
- Availability summary
- Future assignment summary
- ME Event announcements

#### Availability

- Available/unavailable status
- Calendar
- Work areas
- Preferred shift/time

#### Future assignment screens

- Assignment offer
- Accept/decline
- Event and reporting details
- Attendance/check-in
- Work instructions
- Proof of work
- Incident/help
- Completion

#### Future earnings screens

- Completed work
- Pending approval
- Payable amount
- Settlement history

## Approval-state screens

Vendor and Worker interfaces must handle:

- Not applied
- Draft application
- Submitted
- Under review
- Changes requested
- Approved
- Rejected
- Suspended
- Revoked

Approved navigation must never appear for an unapproved role merely because the
client has cached old state.

## First coding sequence after approval

1. Shared design system and application shell
2. Development-only interface preview
3. Customer Home and Explore
4. Catalogue and listing details
5. Event planner and enquiry summary
6. Customer Account and role entry points
7. Vendor application and status
8. Vendor listing management and price-review screens
9. Worker application and status
10. Worker availability and future-assignment prototypes
11. Accessibility, responsive behavior, and interface tests

Authentication, backend persistence, and ERP integration are explicitly outside
this interface coding sequence.
