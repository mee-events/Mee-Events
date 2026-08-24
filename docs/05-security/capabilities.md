# Capabilities

Capabilities are string identifiers that gate controlled API actions. Roles map
to sets of capabilities. Enforcement is server-side via `CapabilityGuard`
([authorization.md](./authorization.md)).

---

## Dual catalogs

| Location                                                                     | Role                                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/backend/src/modules/platform-foundation/domain/platform-foundation.ts` | **Policy source:** `capabilityIds` (**93** entries) and `ROLE_CAPABILITIES`        |
| `packages/api-contracts`                                                     | Shared `capabilityIds` catalog for clients/contracts (aligned with foundation IDs) |

Keep both ID lists in sync when adding capabilities. Only platform-foundation
defines which roles receive which capabilities.

---

## Platform roles

From `@me-event/shared-types` / foundation policy:

| Role            |
| --------------- |
| `customer`      |
| `vendor_owner`  |
| `vendor_member` |
| `worker`        |
| `employee`      |
| `support`       |
| `finance`       |
| `manager`       |
| `administrator` |
| `auditor`       |

`administrator` is assigned the full `capabilityIds` array. Other roles receive
explicit subsets in `ROLE_CAPABILITIES`.

---

## Example capability families

Illustrative groups (not exhaustive — see source for the full 93):

| Family               | Examples                                                                               |
| -------------------- | -------------------------------------------------------------------------------------- |
| Customer self        | `enquiry.create_own`, `quotation.approve_own`, `payment.submit_own`, `event.track_own` |
| CRM                  | `crm_lead.read`, `crm_quotation.manage`, `crm_payment.approve`                         |
| Vendor / worker self | `vendor_own.read`, `vendor_own.update`, `worker_own.read`, `worker_own.update`         |
| Inventory            | `inventory.read`, `inventory.allocate`, `warehouse.manage`                             |
| Finance              | `finance.read`, `finance.manage`, `finance.settlement`, `finance.dashboard`            |
| Operations           | `operations.task.manage`, `operations.complete`, `operations_assigned.read`            |
| Manager              | `manager_event.manage`, `manager_task.manage`, `manager_dashboard.read`                |
| Governance           | `audit.read`, `platform_user.manage`                                                   |
| Catalogue review     | `catalog_review.read`, `catalog_review.update` (administrator only)                    |

---

## Bootstrap

`GET /api/v1/platform/bootstrap` (authenticated) returns the principal’s active
role, Hyderabad branch, modules, and **effective capabilities** for UI gating.

UI hiding is not security. Every mutating or sensitive read must still declare
`@RequireCapability`.

---

## Adding a capability

1. Add the id to `capabilityIds` in **both** platform-foundation and
   `packages/api-contracts` (keep sets equal).
2. Grant it on the appropriate roles in `ROLE_CAPABILITIES`.
3. Annotate the controller handler with `@RequireCapability("...")` and ensure
   `CapabilityGuard` is on the controller.
4. Cover allow/deny in tests where practical.
5. Update API docs under [docs/04-api](../04-api/README.md) if the route is new.

See also [Backend Handbook](../02-architecture/backend.md).

---

## Related

- [authorization.md](./authorization.md)
- [authentication.md](./authentication.md)
- [API index](../04-api/README.md)
