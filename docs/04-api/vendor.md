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

## Related

- [worker.md](./worker.md)
- [crm.md](./crm.md)
- [API index](./README.md)
