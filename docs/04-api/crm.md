# CRM API (core)

Staff CRM for leads, quotations, bookings, payments, and event records.

Other `/crm/*` domains are documented separately:

- [vendor.md](./vendor.md) — `/crm/vendors`
- [worker.md](./worker.md) — `/crm/workers`
- [inventory.md](./inventory.md) — `/crm/warehouses`, `/crm/inventory`
- [finance.md](./finance.md) — `/crm/finance`
- [operations.md](./operations.md) — `/crm/operations`
- [manager.md](./manager.md) — `/crm/manager`

Controllers: `crm/crm.controller.ts`, `quotations/crm-quotation.controller.ts`,
bookings CRM, payments CRM, `event-records/crm-event-record.controller.ts`.

---

## Leads

| Method | Path                                 | Capability        | Purpose           |
| ------ | ------------------------------------ | ----------------- | ----------------- |
| GET    | `/api/v1/crm/leads`                  | `crm_lead.read`   | List leads        |
| GET    | `/api/v1/crm/leads/:id`              | `crm_lead.read`   | Get lead          |
| POST   | `/api/v1/crm/leads/:id/claim`        | `crm_lead.update` | Claim lead        |
| POST   | `/api/v1/crm/leads/:id/requirements` | `crm_lead.update` | Save requirements |

Leads are created with customer enquiries; there is no separate leads Nest
module.

---

## Quotations

| Method | Path                                  | Capability             | Purpose          |
| ------ | ------------------------------------- | ---------------------- | ---------------- |
| POST   | `/api/v1/crm/quotations`              | `crm_quotation.manage` | Create quotation |
| GET    | `/api/v1/crm/quotations`              | `crm_quotation.read`   | List quotations  |
| GET    | `/api/v1/crm/quotations/:id`          | `crm_quotation.read`   | Get quotation    |
| GET    | `/api/v1/crm/quotations/:id/timeline` | `crm_quotation.read`   | Timeline         |
| GET    | `/api/v1/crm/quotations/:id/pdf`      | `crm_quotation.read`   | PDF              |
| PATCH  | `/api/v1/crm/quotations/:id`          | `crm_quotation.manage` | Update quotation |
| POST   | `/api/v1/crm/quotations/:id/revise`   | `crm_quotation.manage` | Revise quotation |
| POST   | `/api/v1/crm/quotations/:id/send`     | `crm_quotation.manage` | Send quotation   |

---

## Bookings

| Method | Path                       | Capability         | Purpose       |
| ------ | -------------------------- | ------------------ | ------------- |
| GET    | `/api/v1/crm/bookings`     | `crm_booking.read` | List bookings |
| GET    | `/api/v1/crm/bookings/:id` | `crm_booking.read` | Get booking   |

---

## Payments

| Method | Path                                          | Capability            | Purpose                                          |
| ------ | --------------------------------------------- | --------------------- | ------------------------------------------------ |
| POST   | `/api/v1/crm/payments/:id/confirm`            | `crm_payment.approve` | Confirm advance (creates booking + event record) |
| GET    | `/api/v1/crm/payments/quotation/:quotationId` | `crm_payment.read`    | List payments for quotation                      |

---

## Events

| Method | Path                                   | Capability         | Purpose             |
| ------ | -------------------------------------- | ------------------ | ------------------- |
| GET    | `/api/v1/crm/events`                   | `erp_event.read`   | List event records  |
| POST   | `/api/v1/crm/events`                   | `erp_event.manage` | Create event record |
| GET    | `/api/v1/crm/events/:id`               | `erp_event.read`   | Get event           |
| PATCH  | `/api/v1/crm/events/:id`               | `erp_event.manage` | Update event        |
| POST   | `/api/v1/crm/events/:id/status`        | `erp_event.manage` | Change status       |
| POST   | `/api/v1/crm/events/:id/notes`         | `erp_event.manage` | Add note            |
| PATCH  | `/api/v1/crm/events/:id/notes/:noteId` | `erp_event.manage` | Update note         |
| POST   | `/api/v1/crm/events/:id/timeline`      | `erp_event.manage` | Add timeline entry  |
| GET    | `/api/v1/crm/events/:id/timeline`      | `erp_event.read`   | Timeline            |
| GET    | `/api/v1/crm/events/:id/activities`    | `erp_event.read`   | Activities          |

---

## Related

- [customer.md](./customer.md) — customer decision and tracking routes
- [API index](./README.md)
