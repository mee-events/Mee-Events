# Vendor API

CRM vendor registry and assignments, plus vendor self-service under
`/vendors/me`.

Controllers:

- `apps/backend/src/modules/vendors/presentation/crm-vendor.controller.ts`
- `apps/backend/src/modules/vendors/presentation/vendor.controller.ts`

Request bodies use Zod schemas such as `createVendorSchema` in
`@me-event/api-contracts`.

---

## CRM (`/api/v1/crm/vendors`)

| Method | Path                                            | Capability          | Purpose           |
| ------ | ----------------------------------------------- | ------------------- | ----------------- |
| GET    | `/api/v1/crm/vendors`                           | `crm_vendor.read`   | List vendors      |
| POST   | `/api/v1/crm/vendors`                           | `crm_vendor.manage` | Create vendor     |
| GET    | `/api/v1/crm/vendors/dashboard`                 | `crm_vendor.read`   | Vendor dashboard  |
| GET    | `/api/v1/crm/vendors/assignments`               | `crm_vendor.read`   | List assignments  |
| POST   | `/api/v1/crm/vendors/assignments`               | `crm_vendor.manage` | Create assignment |
| GET    | `/api/v1/crm/vendors/assignments/:assignmentId` | `crm_vendor.read`   | Get assignment    |
| PATCH  | `/api/v1/crm/vendors/assignments/:assignmentId` | `crm_vendor.manage` | Update assignment |
| GET    | `/api/v1/crm/vendors/:id`                       | `crm_vendor.read`   | Get vendor        |
| PATCH  | `/api/v1/crm/vendors/:id`                       | `crm_vendor.manage` | Update vendor     |
| POST   | `/api/v1/crm/vendors/:id/notes`                 | `crm_vendor.manage` | Add note          |

---

## Self (`/api/v1/vendors/me`)

| Method | Path                                                    | Capability          | Purpose           |
| ------ | ------------------------------------------------------- | ------------------- | ----------------- |
| GET    | `/api/v1/vendors/me/dashboard`                          | `vendor_own.read`   | Own dashboard     |
| GET    | `/api/v1/vendors/me/assignments`                        | `vendor_own.read`   | Own assignments   |
| GET    | `/api/v1/vendors/me/assignments/:assignmentId`          | `vendor_own.read`   | Own assignment    |
| POST   | `/api/v1/vendors/me/assignments/:assignmentId/accept`   | `vendor_own.update` | Accept assignment |
| POST   | `/api/v1/vendors/me/assignments/:assignmentId/reject`   | `vendor_own.update` | Reject assignment |
| POST   | `/api/v1/vendors/me/assignments/:assignmentId/progress` | `vendor_own.update` | Report progress   |
| POST   | `/api/v1/vendors/me/notes`                              | `vendor_own.update` | Add own note      |

---

## Note authorization and linkage

The two note routes intentionally use different application-service entry
points:

- CRM notes require `crm_vendor.manage` and are scoped to the employee's
  operational branch.
- Vendor-self notes require `vendor_own.update`, an active
  `vendor_owner`/`vendor_member` grant for that exact vendor (or the documented
  Hyderabad branch grant), and an active `vendor_members` row for the same
  vendor.

The vendor-self request alone has an optional `vendorId`. If exactly one vendor
survives those authorization checks, omission safely selects it. If more than
one vendor is authorized, omission returns HTTP 400
`VENDOR_SELECTION_REQUIRED`; the caller must select explicitly. A supplied ID
is checked against the caller's active role grant, membership, and operational
branch before note-link validation. The service enumerates authorized vendor
resources directly and does not use the dashboard response as an identity
lookup. The CRM path parameter and CRM request body are unchanged.

Both routes use the same transactional relationship validation. If
`assignmentId` is present, that assignment must belong to the path-authorized
vendor. If `eventRecordId` is present, an existing `vendor_assignments` row must
connect that vendor and event. If both are present, they must describe one
assignment/vendor/event relationship. Vendor and event branch IDs must match
the caller's operational branch. A rejected relationship produces no note,
assignment history, event or vendor timeline/activity, audit, or outbox write.

A vendor-level note remains valid with both optional IDs omitted. The current
domain model does not allow an event-linked vendor note before that vendor has
an assignment to the event.

### Note classification enforcement

The two note surfaces strictly segregate note classifications:

- **CRM notes (`POST /api/v1/crm/vendors/:id/notes`)**:
  Authorized employees holding `crm_vendor.manage` use `addVendorNoteSchema` and
  can specify `internal` (default), `progress`, or `vendor`.
- **Vendor-self notes (`POST /api/v1/vendors/me/notes`)**:
  Vendor owners and members use `addVendorSelfNoteSchema`, which permits omitting
  `noteType` (defaulting to `"vendor"`) or providing the literal value
  `"vendor"`. Attempted `internal` or `progress` classifications fail schema
  validation with HTTP 400 Bad Request.
- **Service boundary enforcement**:
  `VendorService.addOwnNote` independently enforces that vendor-originated notes
  are persisted with `noteType: "vendor"`. Attempted non-vendor classifications
  (`internal`, `progress`) trigger `DomainError("INVALID_VENDOR_NOTE_TYPE", 400)`.
  Omitted `noteType` is forced to `"vendor"`. Both the database row in
  `vendor_notes` and the returned `VendorNoteSummary` contain `noteType: "vendor"`.

## Vendor-self response minimization

`GET /api/v1/vendors/me/dashboard` returns `VendorSummary` objects using an
explicit runtime field allowlist. It does not serialize detail-only GST, PAN,
UPI, internal notes, bank accounts, contacts, documents, address line, or
pincode fields.

---

## Related

- [worker.md](./worker.md)
- [crm.md](./crm.md)
- [API index](./README.md)
