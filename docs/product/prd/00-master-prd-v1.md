# Mee Events Master PRD v1

- Status: accepted
- Date: 2026-08-01
- Version: 1.0
- Product type: full ecosystem platform
- Platform scope: Customer App + Vendor App + Worker App + CRM + ERP
- Governing decisions: ADR 0008, ADR 0010, ADR 0011
- Child documents: PRDs 01-10 in `docs/product/prd/`

## 1. Product summary

Mee Events is a complete event ecosystem platform built to manage the full
lifecycle of event business operations in one connected system.

It is not a simple booking app. It is a business operating system for the
events industry, covering:

- Customer event discovery, planning, and enquiry
- Vendor onboarding and service management
- Worker task assignment and execution
- CRM for leads, quotations, and sales
- ERP for inventory, finance, operations, HR, and reporting
- AI-assisted planning and automation (later phases)
- Admin control and business intelligence

The platform is designed as a long-term enterprise product, not a short-term
MVP. Every major decision must support scalability, reliability, modularity,
maintainability, and future expansion.

## 2. Product vision

Build the most trusted and complete event ecosystem platform that helps
customers plan events, helps vendors sell services, helps workers execute
tasks, and helps the business run operations through CRM and ERP in one
unified system.

Mee Events should eventually become:

- The default platform for event discovery and booking
- A managed vendor marketplace for event businesses
- A workforce management platform for event execution
- A CRM for sales and customer handling
- An ERP for internal business operations
- An AI-powered event operating system

## 3. Operating model

Mee Events operates a managed marketplace (ADR 0008):

- Approved vendors may offer products for sale, products for rent, and
  services after Mee Events verification.
- Vendors submit internal base prices; Mee Events controls the final
  customer-facing price. Customers never see vendor base prices.
- Only Mee Events controls whether a vendor's identity is disclosed to
  customers (`vendor_visibility`: `hidden` or `disclosed`). The setting is
  server-authorized and auditable.
- Customer journeys end at a Mee Events offering and enquiry, not at vendor
  selection. The ERP compares eligible vendors and assigns fulfilment after
  enquiry qualification.
- Customers may privately attach preferred external vendors to an enquiry
  without making them platform vendors.

## 4. Business objective

The product must solve real operational problems in the event industry:

- Manual event coordination
- Disconnected vendor communication
- Poor lead tracking
- Unorganized quotations
- No structured execution workflow
- Inventory and finance confusion
- Weak worker task management
- Lack of visibility for management

The platform centralizes everything into one workflow with one PostgreSQL
source of truth.

## 5. Primary user groups and platform roles

User groups map onto the ten platform roles defined in
`packages/shared-types` and enforced by the database:

| User group          | Platform role(s)                | Description                                  |
| ------------------- | ------------------------------- | -------------------------------------------- |
| Customer            | `customer`                      | Plans or books events                        |
| Vendor              | `vendor_owner`, `vendor_member` | Offers sale, rental, and service listings    |
| Worker              | `worker`                        | Executes assigned event tasks                |
| Sales team          | `employee` (CRM modules)        | Enquiries, leads, follow-ups, quotations     |
| Operations team     | `employee`, `manager`           | Planning, scheduling, assignment, execution  |
| Finance team        | `finance`                       | Billing, collections, expenses, payroll      |
| Support             | `support`                       | Customer and vendor support                  |
| Admin               | `administrator`                 | Platform settings, roles, approvals, content |
| Auditor             | `auditor`                       | Read-only audit and compliance review        |
| Super Admin / Owner | `administrator` (global scope)  | Full control and company-wide reporting      |

One person may hold multiple roles simultaneously (for example Customer plus
approved Vendor). Roles are switched inside one account; they are never
separate accounts.

## 6. Product scope

| Surface      | Delivery                                           | Description                                                  |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| Customer App | `apps/mobile` (Flutter), `customer_mobile` surface | Browsing, planning, enquiry, booking, payment, tracking      |
| Vendor App   | `apps/mobile` (Flutter), `vendor_mobile` surface   | Onboarding, listings, price reviews, work orders, earnings   |
| Worker App   | `apps/mobile` (Flutter), `worker_mobile` surface   | Assignments, attendance, duties, earnings                    |
| CRM          | `apps/erp-web` (Next.js), `employee_web` surface   | Enquiries, leads, quotations, conversion pipeline            |
| ERP          | `apps/erp-web` (Next.js), `employee_web` surface   | Event records, vendors, workers, warehouse, finance, reports |

All surfaces consume one versioned NestJS backend API (`apps/backend`) over
one PostgreSQL database.

## 7. Product goals

### 7.1 Short-term goals (Phase 1, Hyderabad)

- Launch a functional multi-role platform for the Hyderabad branch
- Enable OTP-based role-aware login
- Support customer enquiries flowing into CRM leads
- Support quotations, approval, and booking
- Allow vendor onboarding and listing approval
- Allow worker onboarding and task management
- Provide CRM workflows for the sales team
- Provide ERP core operations for management
- Keep one clean, auditable database structure
- Prepare for real-world business usage

### 7.2 Long-term goals

- AI event planning assistant, budget estimation, vendor recommendation,
  timeline generation, and worker assignment optimization (PRD 09)
- Full analytics dashboard
- Multi-branch support (branch identity retained from day one)
- Multi-city expansion
- Multi-tenant enterprise expansion
- Marketplace growth
- SaaS transformation potential

## 8. Core product principles

- One platform, multiple roles
- Simple user experience
- Strong backend structure
- Secure access control
- Scalable architecture
- Reusable design system
- Real-time operational visibility
- Business-first workflows
- Data-driven decisions
- Production-ready implementation

## 9. Technical vision

Confirmed by ADR 0011. This section supersedes any earlier draft that named a
different stack.

### 9.1 Frontend

- Flutter (`apps/mobile`): one mobile application for Customer, Vendor, and
  Worker roles; authentication determines the available roles
- Next.js (`apps/erp-web`): one Employee CRM/ERP web application
- Reusable widgets and a shared design system (PRD 07)
- Role-based UI rendering driven by the backend bootstrap policy
- Responsive, mobile-first design

### 9.2 Backend

- NestJS modular monolith (`apps/backend`)
- Versioned HTTP API under `/api/v1` with OpenAPI as the wire contract
  (ADR 0004)
- Modules own domain logic behind ports and adapters so services can be
  extracted later (ADR 0001)
- All writes go through backend commands and authorization; clients never
  directly approve financial or controlled operational changes (ADR 0010)

### 9.3 Database

- PostgreSQL as the single transactional source of truth (ADR 0005). A
  managed PostgreSQL service such as Supabase may host it without changing
  domain ownership; the application does not depend on Supabase-specific
  features.
- Normalized schema, UUID primary keys, foreign keys, and indexes
- Audit fields (`created_at`, `updated_at`, `version`) with optimistic
  concurrency
- Append-only audit log, outbox events, and idempotency records
- Status/state lifecycles instead of hard deletes for business records

### 9.4 Authentication

- OTP-based login on E.164 mobile numbers (ADR 0002)
- Short-lived JWT access tokens; opaque rotating refresh tokens bound to
  revocable device sessions
- Role-based access combined with resource scope on the server

### 9.5 Notifications

- Push and in-app notifications inform clients that a record changed; they
  never replace the stored record or its authorization checks (ADR 0010)
- Email/SMS/WhatsApp integrations later if required

### 9.6 External integrations

- Payment gateway (later slice)
- Maps and location services
- SMS/OTP provider (production)
- Analytics services
- File storage services

## 10. Role-based interface requirements

Detailed requirements live in the child PRDs:

- Customer interface: PRD 01 (`01-customer-app-prd-v1.md`)
- Vendor interface: PRD 02 (`02-vendor-app-prd-v1.md`)
- Worker interface: PRD 03 (`03-worker-app-prd-v1.md`)
- CRM: PRD 04 (`04-crm-prd-v1.md`)
- ERP: PRD 05 (`05-erp-prd-v1.md`)

## 11. Standard event workflow

The standard event workflow, mapped to ADR 0010 vertical slices:

1. Customer enquiry (slice 2)
2. Lead creation in CRM (slice 2)
3. Sales team follow-up within the configurable first-response SLA (slice 2)
4. Requirement collection (slice 3)
5. Quotation preparation (slice 3)
6. Customer approval (slice 3)
7. Advance payment (slice 3)
8. Booking-to-Event-Record handoff (slice 4)
9. Vendor assignment (slice 5)
10. Worker assignment (slice 5)
11. Inventory allocation (slice 6)
12. Event execution (slice 6)
13. Real-time updates (slice 6)
14. Completion confirmation (slice 6)
15. Final payment and settlement (slice 6)
16. Feedback and closure (slice 6)

The workflow must be configurable and extendable for different event types.
The central Event Record aggregate connects the customer contract, programs,
payments, vendors, workers, warehouse custody, changes, incidents,
settlements, and audit history.

## 12. Event business catalogue

The catalogue follows the canonical hierarchy defined in
`docs/product/catalog-taxonomy-v1.md`:

```text
Event type
  -> Function or ceremony
    -> Service category
      -> Service subcategory
        -> Listing (sale | rental | service)
          -> Offering variant
```

The 21 source event/department entries and 41 source services are retained as
catalogue seeds. Catalogue content is managed data, never hard-coded
application enums, so new event types and services are publishable without an
app release.

## 13. Data model principles

The full schema roadmap lives in PRD 06 (`06-database-architecture-prd-v1.md`).
Foundation rules already enforced by migration
`infrastructure/postgres/migrations/0001_platform_foundation.sql`:

- UUID primary keys via `pgcrypto`
- Foreign keys and purposeful indexes
- Audit fields and `version` counters with update triggers
- Append-only `audit_events` (mutation rejected by trigger)
- `outbox_events` for reliable event delivery
- `idempotency_records` for duplicate-write protection
- Branch identity on records so multi-branch expansion never rewrites history
- Status/state lifecycles and soft revocation instead of destructive deletes
- Role-based filtering applied on the server

## 14. Security requirements

- OTP authentication with keyed digests, rate limits, and one-time consumption
- Role-based permissions plus capability checks on every controlled action
- Server-side field-level filtering (vendor base prices and internal notes
  must never reach customer APIs)
- Input validation with Zod at the API boundary
- Append-only audit logging for every controlled mutation: actor, active
  role, branch, record type and identifier, previous and new version,
  timestamp, request identifier, and reason/approval evidence
- Protected admin actions
- Secrets never committed or embedded in client builds (ADR 0003,
  `docs/05-security/secrets.md`)

Security is built into the architecture, not added later.

## 15. Performance requirements

- Fast app startup and smooth navigation
- Efficient API calls with pagination for large datasets
- Lazy loading and caching where needed
- Minimal redundant database queries
- Optimized images and assets
- Reusable UI components and modular features

## 16. UX / UI requirements

The design system is documented in PRD 07 (`07-ui-ux-design-system-prd-v1.md`).
The experience must be premium, clean, modern, simple, trustworthy,
role-aware, fast to understand, and easy for non-technical users. Standards:
consistent spacing, clear typography, strong hierarchy, reusable components,
mobile-first interaction, smooth transitions, and accessible controls (44 px
minimum touch targets, system font scaling).

## 17. Admin control requirements

Admin must have access to: dashboard, user management, role management,
category/catalogue management, vendor approval, worker approval, booking
oversight, CRM reports, ERP reports, financial reports, notifications,
content management, settings, feature toggles, and audit logs. All admin
mutations are capability-guarded and audited.

## 18. Reporting and analytics

The system should provide: total leads, lead source analysis, booking
conversion rate, revenue summary, pending quotation count, vendor
performance, worker performance, event completion report, inventory usage,
payment status, expense summary, profit analysis, and branch/department
performance. Reporting requirements are detailed in PRD 04 (CRM) and PRD 05
(ERP).

## 19. AI features roadmap

AI is added only after the core workflow is stable. The staged roadmap lives
in PRD 09 (`09-ai-roadmap-prd-v1.md`). AI must support business decisions,
not replace business logic.

## 20. Scalability requirements

The platform must support growth across more users, vendors, workers,
categories, branches, cities, business processes, integrations, automation,
roles, and data. Architecture decisions must not create future bottlenecks:

- Branch identity is retained even while Hyderabad is the only active branch
- Catalogue and policy are data-driven, not compiled into clients
- Modules are extraction-ready behind ports (ADR 0001)
- The database is authoritative; clients receive the same versioned record
  through role-filtered API responses (ADR 0010 synchronization rule)

## 21. Development approach

- Build module by module through end-to-end vertical slices (ADR 0010 order):
  1. identity, role bootstrap, permissions, branch context, and audit
  2. customer enquiry to CRM lead
  3. requirements, quotation, approval, payment plan, and booking
  4. booking-to-Event-Record handoff
  5. vendor and worker assignments
  6. warehouse, execution, finance, settlement, and reporting
- Design the database before the UI where needed
- Reuse shared components and contracts (`packages/api-contracts`,
  `packages/shared-types`)
- Keep business logic separate from UI
- Avoid hardcoding; catalogue and policy are managed data
- Write code for real production use; test every major module
- Refactor continuously and document important workflows (ADRs for
  expensive-to-reverse decisions)

## 22. Acceptance criteria

The platform is successful only if:

- Each role has its own usable interface
- Customer flow works end to end
- Vendor flow works end to end
- Worker flow works end to end
- CRM pipeline works correctly
- ERP workflows function properly
- Database structure is clean and scalable
- Security is enforced server-side
- The UI is stable and consistent
- The platform is ready for real business use

## 23. Out of scope for initial release

Delayed until core workflows are stable:

- Advanced AI automation
- Multi-country support
- Deep financial automation
- Complex integrations
- Advanced dashboards
- Full marketplace ranking system
- Advanced recommendation engine
- Multi-tenant SaaS expansion

## 24. Final product definition

Mee Events is a complete event business ecosystem with three user-facing
mobile role interfaces, a CRM for sales and customer management, an ERP for
internal operations, one unified PostgreSQL database, a scalable NestJS
backend, a premium mobile-first Flutter frontend, strong security, and a
future-ready architecture. The platform is built to become a long-term
company asset, not a temporary app.

## 25. Document map

| Document                   | File                                  |
| -------------------------- | ------------------------------------- |
| Master PRD (this document) | `00-master-prd-v1.md`                 |
| Customer App PRD           | `01-customer-app-prd-v1.md`           |
| Vendor App PRD             | `02-vendor-app-prd-v1.md`             |
| Worker App PRD             | `03-worker-app-prd-v1.md`             |
| CRM PRD                    | `04-crm-prd-v1.md`                    |
| ERP PRD                    | `05-erp-prd-v1.md`                    |
| Database Architecture PRD  | `06-database-architecture-prd-v1.md`  |
| UI/UX Design System PRD    | `07-ui-ux-design-system-prd-v1.md`    |
| Technical Architecture PRD | `08-technical-architecture-prd-v1.md` |
| AI Roadmap PRD             | `09-ai-roadmap-prd-v1.md`             |
| Deployment and DevOps PRD  | `10-deployment-devops-prd-v1.md`      |

Where a child PRD conflicts with this Master PRD, the Master PRD and the
accepted ADRs govern.
