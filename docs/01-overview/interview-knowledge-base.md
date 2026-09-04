# Mee Events Interview Knowledge Base

This living document tracks concepts the product owner can explain honestly.
Update it at meaningful milestones, not after every small edit.

Recommended wording: “I used AI-assisted development, but I reviewed and can
explain the architecture, decisions, implementation boundaries, tests, risks,
and trade-offs.”

## 1. Client, backend, and database boundary

### Concept

Clients do not receive direct database authority.

### Mee Events implementation

Flutter and Next.js call the NestJS `/api/v1` API. NestJS repository adapters
access PostgreSQL.

### Why we chose it

Business rules and authorization remain enforceable in one trusted backend.

### Trade-offs

There is an extra network hop and the backend must scale, but security and data
consistency are much stronger than direct client database writes.

### Failure cases

Backend unavailable, bad network, invalid API configuration, database outage,
or a request rejected by authentication/authorization.

### Interview question

Why does the Flutter app not connect directly to PostgreSQL?

### Strong answer

Direct database access would expose credentials and let clients bypass business
rules. Mee Events centralizes authorization, validation, transactions and audit
behavior in NestJS, while PostgreSQL remains the source of truth.

## 2. Authentication versus authorization

### Concept

Authentication answers “Who are you?” Authorization answers “What may you do?”

### Mee Events implementation

OTP verifies the mobile number. The backend creates a device session and JWT
access token. Guards then check the active role and required capability;
repositories additionally enforce branch, ownership and membership.

### Why we chose it

A valid login must not automatically grant access to every event, vendor,
payment or employee operation.

### Trade-offs

Layered checks require more tests and careful scope propagation, but prevent
privilege escalation and IDOR/BOLA vulnerabilities.

### Failure cases

Expired/revoked tokens, stale role state, missing capability, wrong branch,
wrong customer ownership or inactive vendor membership.

### Interview question

How do you prevent one Mee Events customer from reading another customer's
enquiry?

### Strong answer

The access token proves the caller's identity, but the backend also scopes the
query to that user and resource. Supplying another enquiry ID is insufficient;
the repository must match both the ID and authorized owner or return not found.

## 3. API contracts and compatibility

### Concept

An API contract defines the request and response structure shared by clients
and servers. Compatible additions should not unnecessarily break older apps.

### Mee Events implementation

The NestJS API uses `/api/v1`, shared TypeScript contracts and OpenAPI. Flutter
has Dart response models. CUST-04 separates a strict structural/minimum-client
contract from an additive policy revision: installed clients require their
security baseline but do not reject every new unknown module or capability.
Both TypeScript and Flutter require the server `generatedAt` value to use UTC
`Z` form, while session identity—not device-clock comparison—decides freshness.

### Why we chose it

Explicit contracts prevent the mobile, ERP and backend from silently disagreeing.

### Trade-offs

Strict validation catches malformed responses, but exact policy pinning can
break installed clients after an additive server deployment. Structural
strictness and policy extensibility must be separated.

### Failure cases

Missing required fields, incompatible schema version, unknown breaking
structure, stale session identity, missing baseline privileges, known
cross-role privileges, or an older client rejecting safe additions.

### Interview question

How would you evolve the bootstrap API without breaking installed mobile apps?

### Strong answer

I would strictly validate required security fields and a compatible structural
schema, require the client's minimum known capabilities, tolerate safe additive
policy entries, and use explicit minimum-client enforcement or a new versioned
route for genuine breaking changes. Server authorization must remain
authoritative regardless of what the client displays.

## 4. Scope and session-race safety

### Concept

A resource scope answers “where does this role grant apply?”; it is not always
an operational branch. Concurrent network responses also need stable logical
identity, because two equal sessions can be represented by different Dart
objects and one object can become stale while a request is in flight.

### Mee Events implementation

PostgreSQL `global`, `branch`, and `vendor` scope types now reach shared types,
authenticated principals, and bootstrap intact. Hyderabad remains the Phase 1
operational branch, while vendor UUIDs stay vendor resource scopes and vendor
APIs intersect an active vendor role, a matching exact-vendor or Hyderabad
branch grant, and active same-vendor membership. Flutter binds responses to the
stable server session ID plus local session generation, token revision, and
role revision instead of object identity. Logout clears authenticated memory
before awaiting slower persistent cleanup.

### Failure cases

Treating a vendor UUID as a branch, accepting an inactive/duplicate/wrong-branch
grant, combining a Vendor A grant with Vendor B membership, applying an
old-device bootstrap, logging out a replacement account, or allowing an older
token rejection to terminate a newly refreshed session.

### Interview question

Why are a server session ID and local revision counters both useful?

### Strong answer

The server session ID proves responses refer to the same backend device
session. Local generations and token/role revisions order events within the app,
so a harmless token refresh can coexist with bootstrap while logout, account
replacement, or a conflicting role change invalidates an older response. Both
checks are needed because server identity and local concurrency solve different
problems.

## 5. Relationship integrity and response minimization

### Concept

Authorizing a parent record does not prove that every child ID in the request
belongs to it. Compile-time response types also do not remove extra fields from
the JavaScript object sent over HTTP.

### Mee Events implementation

CRM and vendor-self note routes keep separate capability and ownership trust
paths, then share one PostgreSQL note transaction. Before its first insert, the
transaction proves that optional assignment/event IDs identify one
vendor-assignment-event relationship in the operational branch. Vendor-self
notes infer identity only when one authorized vendor exists; multiple vendors
require an explicit authorized `vendorId`. Dashboards construct `VendorSummary`
through an explicit runtime allowlist.

### Why we chose it

These boundaries stop a valid Vendor A request from attaching data to Vendor
B's assignment/event and stop internal GST, PAN, payment, contact, document, or
address fields from leaking merely because they existed on an in-memory detail
object.

### Failure cases

Cross-vendor assignment IDs, an event linked only to another vendor, mismatched
assignment/event pairs, missing records, another branch, partial transaction
side effects, or returning a detail object where the API promises a summary.

### Interview question

Why is checking only the vendor ID insufficient when adding a linked note?

### Strong answer

The request may also carry assignment and event IDs. I must verify those IDs
form one relationship with the authorized vendor and branch before any insert.
I keep validation and mutation in the same transaction so a rejection cannot
leave a note, history, timeline, audit, or outbox row. On reads, I use an
explicit field allowlist because TypeScript types do not filter runtime JSON.

## Knowledge backlog

Add entries when the corresponding roadmap task is implemented and understood:

- Refresh-token rotation and session revocation — CUST-03.
- Role, capability, branch and vendor scope — CUST-04/VEND-01.
- Enquiry-to-booking transactions — CUST-11–CUST-17.
- Pattern B, audit and outbox delivery — XMOD/SEC work.
- Payment idempotency and reconciliation — INT-02/ERP-14.
- Testing strategy and concurrency — CUST-28/XMOD-03.
- CI/CD, deployment, backup and rollback — PROD-01–PROD-06.
- Scaling Mee Events — after the core workflow is production-proven.
