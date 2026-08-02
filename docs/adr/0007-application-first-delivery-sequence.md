# ADR 0007: Application-first delivery sequence

- Status: superseded by ADR 0010
- Date: 2026-07-27

## Context

ME Event will eventually operate a customer/vendor/worker application and an
internal ERP. Building both products simultaneously would allow unvalidated
internal-process assumptions to control the customer product and would divide the
initial delivery effort.

## Decision

Build and validate the mobile application before designing or implementing the
ERP.

The delivery sequence is:

1. Approve the application business architecture.
2. Design the Customer, Vendor, and Worker interfaces.
3. Implement and validate those interfaces with safe local fixture data.
4. Design and implement authentication, backend APIs, persistence, approval
   workflows, payments, and production integrations.
5. Release and validate the application with real operations.
6. Define ERP requirements from proven application and operational workflows.
7. Build the ERP as a later product phase.

The existing ERP web shell is frozen. It may receive maintenance or removal of
blocking defects, but no ERP business modules will be developed until the
application validation milestone is deliberately approved.

## Consequences

- The current product scope is the mobile application plus only the backend
  capabilities required by that application.
- Application architecture must expose clean future integration boundaries
  without presuming ERP screens or processes.
- Early interface work uses clearly labelled local fixture data and a
  development-only role preview. It must not impersonate real authentication or
  production approval.
- ERP planning remains documented as a future dependency, not an active
  implementation stream.
