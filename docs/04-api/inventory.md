# Inventory API

CRM warehouses and inventory, plus assigned staff self-service under
`/inventory/me`.

Controller (CRM + self):
`apps/backend/src/modules/inventory/presentation/crm-inventory.controller.ts`
(`@Controller("crm")` and `@Controller("inventory")`).

---

## CRM warehouses (`/api/v1/crm/warehouses`)

| Method | Path                               | Capability         | Purpose             |
| ------ | ---------------------------------- | ------------------ | ------------------- |
| GET    | `/api/v1/crm/warehouses`           | `warehouse.read`   | List warehouses     |
| POST   | `/api/v1/crm/warehouses`           | `warehouse.manage` | Create warehouse    |
| GET    | `/api/v1/crm/warehouses/dashboard` | `warehouse.read`   | Warehouse dashboard |
| GET    | `/api/v1/crm/warehouses/:id`       | `warehouse.read`   | Get warehouse       |
| PATCH  | `/api/v1/crm/warehouses/:id`       | `warehouse.manage` | Update warehouse    |

---

## CRM inventory (`/api/v1/crm/inventory`)

| Method | Path                                                     | Capability           | Purpose             |
| ------ | -------------------------------------------------------- | -------------------- | ------------------- |
| GET    | `/api/v1/crm/inventory`                                  | `inventory.read`     | List items          |
| POST   | `/api/v1/crm/inventory`                                  | `inventory.manage`   | Create item         |
| GET    | `/api/v1/crm/inventory/dashboard`                        | `inventory.read`     | Inventory dashboard |
| GET    | `/api/v1/crm/inventory/allocations`                      | `inventory.read`     | List allocations    |
| POST   | `/api/v1/crm/inventory/allocations`                      | `inventory.allocate` | Create allocation   |
| GET    | `/api/v1/crm/inventory/allocations/:allocationId`        | `inventory.read`     | Get allocation      |
| PATCH  | `/api/v1/crm/inventory/allocations/:allocationId`        | `inventory.allocate` | Update allocation   |
| POST   | `/api/v1/crm/inventory/allocations/:allocationId/return` | `inventory.allocate` | Return allocation   |
| GET    | `/api/v1/crm/inventory/movements`                        | `inventory.read`     | List movements      |
| GET    | `/api/v1/crm/inventory/maintenance`                      | `inventory.read`     | List maintenance    |
| POST   | `/api/v1/crm/inventory/maintenance`                      | `inventory.manage`   | Start maintenance   |
| POST   | `/api/v1/crm/inventory/damage-reports`                   | `inventory.manage`   | Report damage       |
| GET    | `/api/v1/crm/inventory/:id`                              | `inventory.read`     | Get item            |
| PATCH  | `/api/v1/crm/inventory/:id`                              | `inventory.manage`   | Update item         |
| POST   | `/api/v1/crm/inventory/:id/notes`                        | `inventory.manage`   | Add note            |

---

## Self (`/api/v1/inventory/me`)

| Method | Path                                                    | Capability           | Purpose           |
| ------ | ------------------------------------------------------- | -------------------- | ----------------- |
| GET    | `/api/v1/inventory/me/dashboard`                        | `inventory.read`     | Own dashboard     |
| GET    | `/api/v1/inventory/me/allocations`                      | `inventory.read`     | Own allocations   |
| GET    | `/api/v1/inventory/me/allocations/:allocationId`        | `inventory.read`     | Own allocation    |
| POST   | `/api/v1/inventory/me/allocations`                      | `inventory.allocate` | Create allocation |
| PATCH  | `/api/v1/inventory/me/allocations/:allocationId`        | `inventory.allocate` | Update allocation |
| POST   | `/api/v1/inventory/me/allocations/:allocationId/return` | `inventory.allocate` | Return allocation |
| GET    | `/api/v1/inventory/me/movements`                        | `inventory.read`     | Own movements     |

---

## Related

- [operations.md](./operations.md)
- [API index](./README.md)
