# Customer API

Customer-facing and public catalog routes. All paths are under `/api/v1` unless
noted. Authenticated routes require Bearer JWT plus the listed capability.

Finance self-reads (`/finance/me/*`) are also documented in [finance.md](./finance.md).

Controllers: `catalog`, `enquiries`, `quotations/quotation.controller.ts`,
`bookings` (customer), `payments` (customer), `event-records/event-record.controller.ts`,
`finance` (self class).

---

## Catalog (public)

| Method | Path                                 | Capability | Purpose                 |
| ------ | ------------------------------------ | ---------- | ----------------------- |
| GET    | `/api/v1/catalog/event-types`        | Public     | List event types        |
| GET    | `/api/v1/catalog/service-categories` | Public     | List service categories |

---

## Enquiries

| Method | Path                    | Capability           | Purpose                                |
| ------ | ----------------------- | -------------------- | -------------------------------------- |
| POST   | `/api/v1/enquiries`     | `enquiry.create_own` | Create enquiry (also creates CRM lead) |
| GET    | `/api/v1/enquiries`     | `enquiry.read_own`   | List own enquiries                     |
| GET    | `/api/v1/enquiries/:id` | `enquiry.read_own`   | Get enquiry                            |

---

## Quotations (own)

| Method | Path                                      | Capability                       | Purpose                          |
| ------ | ----------------------------------------- | -------------------------------- | -------------------------------- |
| GET    | `/api/v1/quotations`                      | `quotation.read_own`             | List own quotations              |
| GET    | `/api/v1/quotations/:id`                  | `quotation.read_own`             | Get quotation                    |
| GET    | `/api/v1/quotations/:id/timeline`         | `quotation.read_own`             | Quotation timeline               |
| GET    | `/api/v1/quotations/:id/pdf`              | `quotation.read_own`             | Quotation PDF placeholder/export |
| POST   | `/api/v1/quotations/:id/approve`          | `quotation.approve_own`          | Approve quotation                |
| POST   | `/api/v1/quotations/:id/reject`           | `quotation.reject_own`           | Reject quotation                 |
| POST   | `/api/v1/quotations/:id/request-revision` | `quotation.request_revision_own` | Request revision                 |

---

## Bookings (own)

| Method | Path                   | Capability         | Purpose           |
| ------ | ---------------------- | ------------------ | ----------------- |
| GET    | `/api/v1/bookings`     | `booking.read_own` | List own bookings |
| GET    | `/api/v1/bookings/:id` | `booking.read_own` | Get booking       |

Bookings are created when CRM confirms advance payment—not via a customer create
endpoint.

---

## Payments (own)

| Method | Path                       | Capability           | Purpose                |
| ------ | -------------------------- | -------------------- | ---------------------- |
| POST   | `/api/v1/payments/advance` | `payment.submit_own` | Submit advance payment |
| GET    | `/api/v1/payments`         | `payment.read_own`   | List own payments      |

---

## Events (own)

| Method | Path                            | Capability        | Purpose                |
| ------ | ------------------------------- | ----------------- | ---------------------- |
| GET    | `/api/v1/events`                | `event.track_own` | List own event records |
| GET    | `/api/v1/events/:id`            | `event.track_own` | Get event record       |
| GET    | `/api/v1/events/:id/timeline`   | `event.track_own` | Event timeline         |
| GET    | `/api/v1/events/:id/activities` | `event.track_own` | Event activities       |

---

## Finance (self)

| Method | Path                                       | Capability         | Purpose                     |
| ------ | ------------------------------------------ | ------------------ | --------------------------- |
| GET    | `/api/v1/finance/me/payments`              | `payment.read_own` | Own finance payments        |
| GET    | `/api/v1/finance/me/invoices`              | `payment.read_own` | Own invoices                |
| GET    | `/api/v1/finance/me/receipts`              | `payment.read_own` | Own receipts                |
| GET    | `/api/v1/finance/me/events/:eventRecordId` | `finance.read`     | Own event finance           |
| GET    | `/api/v1/finance/me/vendors`               | `finance.read`     | Own vendor settlements view |
| GET    | `/api/v1/finance/me/workers`               | `finance.read`     | Own worker payouts view     |

---

## Related

- [crm.md](./crm.md) — staff quotation/payment/event management
- [authentication.md](./authentication.md)
- [API index](./README.md)
