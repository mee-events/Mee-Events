# Finance API

CRM finance settlement surface and self-reads under `/finance/me`.

Customer-facing `/finance/me/*` routes are also listed in [customer.md](./customer.md).

Controller:
`apps/backend/src/modules/finance/presentation/crm-finance.controller.ts`
(`@Controller("crm/finance")` and `@Controller("finance")`).

---

## CRM (`/api/v1/crm/finance`)

| Method | Path                                               | Capability           | Purpose                  |
| ------ | -------------------------------------------------- | -------------------- | ------------------------ |
| GET    | `/api/v1/crm/finance/dashboard`                    | `finance.dashboard`  | Finance dashboard        |
| GET    | `/api/v1/crm/finance/events`                       | `finance.read`       | List event finance       |
| GET    | `/api/v1/crm/finance/events/:eventRecordId`        | `finance.read`       | Get event finance        |
| POST   | `/api/v1/crm/finance/events/:eventRecordId/ensure` | `finance.manage`     | Ensure event finance row |
| PATCH  | `/api/v1/crm/finance/events/:eventRecordId`        | `finance.manage`     | Update event finance     |
| POST   | `/api/v1/crm/finance/payments`                     | `finance.manage`     | Record customer payment  |
| GET    | `/api/v1/crm/finance/payments`                     | `finance.read`       | List payments            |
| POST   | `/api/v1/crm/finance/refunds`                      | `finance.manage`     | Record refund            |
| GET    | `/api/v1/crm/finance/expenses`                     | `finance.read`       | List expenses            |
| POST   | `/api/v1/crm/finance/expenses`                     | `finance.manage`     | Create expense           |
| GET    | `/api/v1/crm/finance/vendors`                      | `finance.read`       | List vendor settlements  |
| POST   | `/api/v1/crm/finance/vendors`                      | `finance.settlement` | Create vendor settlement |
| PATCH  | `/api/v1/crm/finance/vendors/:settlementId`        | `finance.settlement` | Update settlement        |
| GET    | `/api/v1/crm/finance/workers`                      | `finance.read`       | List worker payouts      |
| POST   | `/api/v1/crm/finance/workers`                      | `finance.settlement` | Create worker payout     |
| PATCH  | `/api/v1/crm/finance/workers/:payoutId`            | `finance.settlement` | Update payout            |
| GET    | `/api/v1/crm/finance/invoices`                     | `finance.read`       | List invoices            |
| POST   | `/api/v1/crm/finance/invoices`                     | `finance.manage`     | Issue invoice            |
| GET    | `/api/v1/crm/finance/receipts`                     | `finance.read`       | List receipts            |
| GET    | `/api/v1/crm/finance/ledger`                       | `finance.read`       | List ledger              |

---

## Self (`/api/v1/finance/me`)

| Method | Path                                       | Capability         | Purpose                     |
| ------ | ------------------------------------------ | ------------------ | --------------------------- |
| GET    | `/api/v1/finance/me/payments`              | `payment.read_own` | Own payments                |
| GET    | `/api/v1/finance/me/invoices`              | `payment.read_own` | Own invoices                |
| GET    | `/api/v1/finance/me/receipts`              | `payment.read_own` | Own receipts                |
| GET    | `/api/v1/finance/me/events/:eventRecordId` | `finance.read`     | Own event finance           |
| GET    | `/api/v1/finance/me/vendors`               | `finance.read`     | Own vendor settlements view |
| GET    | `/api/v1/finance/me/workers`               | `finance.read`     | Own worker payouts view     |

---

## Related

- [customer.md](./customer.md)
- [crm.md](./crm.md) — advance payment confirm
- [API index](./README.md)
