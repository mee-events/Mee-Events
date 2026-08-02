# ADR 0010: Connected Hyderabad platform Phase 1

- Status: accepted
- Date: 2026-07-29
- Supersedes: ADR 0006, ADR 0007, and the delivery-order parts of ADR 0009

## Context

The founder has approved the connected operating model after reviewing the
Customer App and the complete Hyderabad workflow. Mee Events now needs one
mobile application for Customer, Vendor, and Worker roles plus one Employee
CRM/ERP web application. Building more isolated interface prototypes would not
prove that an enquiry can travel through CRM, booking, operations, fulfilment,
finance, and closure without re-entry.

## Decision

Build one connected platform for Hyderabad:

```text
Customer / Vendor / Worker mobile roles
                  |
          Versioned backend API
                  |
       PostgreSQL source of truth
                  |
         Employee CRM and ERP
```

- Create `apps/mobile` with Expo React Native and TypeScript.
- Keep one mobile application identity. Authentication determines the available
  Customer, Vendor, and Worker roles.
- Use a development-only role preview until production authentication is
  connected. It must never impersonate production authorization.
- Continue `apps/backend` as a NestJS modular monolith.
- Continue `apps/erp-web` as a Next.js Employee CRM/ERP application.
- Use PostgreSQL as the transactional source of truth. A managed PostgreSQL
  service such as Supabase may host it without changing domain ownership.
- Keep all writes behind backend commands and authorization. Clients do not
  directly approve financial or controlled operational changes.
- Treat the central Event Record as the shared aggregate connecting the
  customer contract, programs, payments, vendors, workers, warehouse custody,
  changes, incidents, settlements, and audit history.
- Keep Hyderabad as the only active branch. Retain a branch identifier so a
  later expansion does not require rewriting historical records.
- Deliver vertical slices in this order:
  1. identity, role bootstrap, permissions, branch context, and audit;
  2. customer enquiry to CRM lead;
  3. requirements, quotation, approval, payment plan, and booking;
  4. booking-to-Event-Record handoff;
  5. vendor and worker assignments;
  6. warehouse, execution, finance, settlement, and reporting.

## Synchronization rule

The database is authoritative. Mobile and ERP clients receive the same
versioned record through role-filtered API responses. Real-time updates and
push notifications inform clients that a record changed; they do not replace
the stored record or its authorization checks.

Every controlled mutation records:

- actor and active role;
- Hyderabad branch;
- record type and identifier;
- previous and new version;
- timestamp and request identifier;
- reason and approval evidence when applicable.

## Consequences

- Mobile, ERP, and backend development proceed together through working
  end-to-end slices.
- The old Flutter application remains outside this workspace and is never mixed
  into the new Expo application.
- Existing Customer App web/Figma work remains a design and workflow reference;
  it is not the production data source.
- ADR 0006's Flutter toolchain is retired for the new application.
- ADR 0007's ERP freeze is removed.
- Interface-only fixtures remain allowed only for explicit development previews.
