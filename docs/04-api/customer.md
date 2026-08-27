# Customer API

Customer-facing and public catalog routes. All paths are under `/api/v1` unless
noted. Authenticated routes require Bearer JWT plus the listed capability.

Finance self-reads (`/finance/me/*`) are also documented in [finance.md](./finance.md).

Controllers: `catalog`, `search`, `enquiries`, `quotations/quotation.controller.ts`,
`bookings` (customer), `payments` (customer), `event-records/event-record.controller.ts`,
`finance` (self class).

---

## Catalog (public)

| Method | Path                                           | Capability | Purpose                                            |
| ------ | ---------------------------------------------- | ---------- | -------------------------------------------------- |
| GET    | `/api/v1/catalog/event-types`                  | Public     | List 21 event types (occasions + service entries)  |
| GET    | `/api/v1/catalog/event-types/:code`            | Public     | Event type detail with mapped selections           |
| GET    | `/api/v1/catalog/event-types/:code/selections` | Public     | Mapped service selections for an event             |
| GET    | `/api/v1/catalog/service-categories`           | Public     | List 9 service departments                         |
| GET    | `/api/v1/catalog/services`                     | Public     | List 41 granular services (`department` optional)  |
| GET    | `/api/v1/catalog/services/:code`               | Public     | Single service detail                              |
| GET    | `/api/v1/catalog/services/:code/subcategories` | Public     | Service subcategories                              |
| GET    | `/api/v1/catalog/services/:code/products`      | Public     | Customer-visible products (`subcategory` optional) |
| GET    | `/api/v1/catalog/products/:code`               | Public     | Customer-visible product detail                    |
| GET    | `/api/v1/catalog/occasions/:code/stages`       | Public     | Occasion stages                                    |
| GET    | `/api/v1/catalog/occasions/:code/services`     | Public     | Services relevant to an occasion                   |

Customer product lists hide rows that are inactive, placeholder, unapproved,
not Hyderabad-available, or not customer-selectable. Parent services must also
be customer-visible (`active`, `customer_selectable`, `hyderabad_available`,
`content_status = approved`). Restricted products may appear with
`restricted: true` and `addToPlanAllowed: false`. `honeymoon_travel` is not
publicly listed, searchable, or reachable by direct code.

Staff content review (authenticated ERP, not public):

| Method | Path                                 | Capability              | Purpose                            |
| ------ | ------------------------------------ | ----------------------- | ---------------------------------- |
| GET    | `/api/v1/erp/catalog/products`       | `catalog_review.read`   | List products for copy review      |
| PATCH  | `/api/v1/erp/catalog/products/:code` | `catalog_review.update` | Approve, reject, or retitle copy   |
| GET    | `/api/v1/erp/catalog/media/coverage` | `catalog_review.read`   | Direct vs inherited media coverage |
| GET    | `/api/v1/erp/catalog/media`          | `catalog_review.read`   | List catalogue media metadata      |
| POST   | `/api/v1/erp/catalog/media`          | `catalog_review.update` | Upsert cover/gallery metadata      |
| PATCH  | `/api/v1/erp/catalog/media/:id`      | `catalog_review.update` | Update media review fields         |

Public catalogue responses may include `coverImageUrl`, `thumbnailUrl`,
`coverAltText`, and product `gallery`. They never include review status,
source, or licence fields. Only `active` + `approved` +
`hyderabad_customer_visible` media is resolved. Product covers inherit from
the parent subcategory, then the parent service. Services never inherit
occasion photographs.

`catalog_review.read` and `catalog_review.update` are administrator-only. CRM
lead capabilities do not grant catalogue approval.

---

## Search (public)

Unified customer catalogue search across occasions, stages, categories,
services, venues, and products. Ranking prefers exact matches, then occasions,
services, products, venues, and categories. Future modules (packages, offers,
blogs, FAQ, etc.) register as empty providers until data exists.

Stage/function hits include structured `parentOccasionCode` and
`parentOccasionName` for Occasion Detail routing. Clients must not parse
parent occasion identity from `subtitle`.

| Method | Path                      | Capability | Purpose                                     |
| ------ | ------------------------- | ---------- | ------------------------------------------- |
| GET    | `/api/v1/search?q=`       | Public     | Unified search (`limit`, `cursor` optional) |
| GET    | `/api/v1/search/trending` | Public     | Configurable trending search terms          |

---

## Enquiries

| Method | Path                    | Capability           | Purpose                                                                         |
| ------ | ----------------------- | -------------------- | ------------------------------------------------------------------------------- |
| POST   | `/api/v1/enquiries`     | `enquiry.create_own` | Create enquiry + `enquiry.submitted` outbox; CRM lead is created asynchronously |
| GET    | `/api/v1/enquiries`     | `enquiry.read_own`   | List own enquiries                                                              |
| GET    | `/api/v1/enquiries/:id` | `enquiry.read_own`   | Get enquiry                                                                     |

`POST /enquiries` accepts optional `planItems` (`productCode`, optional
`displayName` / `serviceCode`). The API stores a server-resolved snapshot
(`displayName`, `serviceCode`, `catalogVersion`) on `plan_items`. Unknown or
restricted product codes return `422 PLAN_ITEM_UNKNOWN`. Department codes stay
on `serviceCategoryCodes` / `service_requirements`.

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
