# Local demo checklist — enquiry → booking

Manual path for the connected sale journey. Requires Docker Postgres, backend
on `:3002`, ERP on `:3001`, and mobile (or curl) against
`http://localhost:3002/api/v1`.

## Prerequisites

```sh
corepack pnpm db:up
corepack pnpm db:migrate
corepack pnpm db:seed:dev
corepack pnpm dev:backend
corepack pnpm dev:erp
```

API-only smokes (no UI):

```sh
# Slice 1 — enquiry → claim → contact_pending
bash scripts/demo-enquiry-claim-smoke.sh

# Full sale — enquiry → quote → advance → booking + event
bash scripts/demo-enquiry-to-booking-smoke.sh
```

---

## 1. Employee login (ERP)

1. Open http://localhost:3001/login
2. Mobile: `+919000000001` (seeded Dev Marketing Manager)
3. Send code — local OTP `debugCode` appears on the login screen
4. Verify → lands on `/leads`

## 2. Customer enquiry (mobile)

1. OTP-login with any unused Indian mobile (creates a customer)
2. Plan → submit an enquiry (event type + optional date/location/guests)
3. Enquiries tab shows status **Received**

## 3. Claim and shared status

1. ERP `/leads` → open the new lead → **Claim**
2. Customer pulls to refresh Enquiries (or opens enquiry detail)
3. Status label: **We will contact you** (`contact_pending`)

## 4. Requirements → quotation (ERP)

1. Lead detail → save requirements notes (status `qualified` or `contacted`)
2. Create quotation with at least one line item → **Send**
3. Quotation status becomes `sent`; lead moves to `quoted`

## 5. Approve + advance (mobile)

1. Enquiries → open the linked quotation (or quotations list)
2. **Approve** quotation
3. **Submit advance** (UPI / cash / bank transfer)
4. UI shows advance as **pending** — waiting for CRM confirmation

## 6. Confirm advance → booking (ERP)

1. Open `/quotes/{id}` for the sent/approved quotation
2. Confirm the pending advance payment
3. ERP redirects to `/events/{eventRecordId}`
4. Booking `BK-…` is `confirmed`; event `EV-…` is `booking_confirmed`
5. Customer enquiry becomes **Closed**; My Event / bookings list shows the booking

---

## Failure hints

| Symptom                      | Check                                        |
| ---------------------------- | -------------------------------------------- |
| OTP never arrives            | `OTP_PROVIDER=local`; read Nest terminal     |
| ERP “Could not reach API”    | Backend on `:3002`; CORS / `.env.local`      |
| Empty leads after submit     | Same Postgres; customer used real OTP login  |
| Status stuck on Received     | Claim succeeded? Pull-to-refresh on mobile   |
| Cannot create quotation      | Lead claimed + requirements saved first      |
| Advance submit fails         | Quotation must be `approved`                 |
| Confirm does nothing         | Pending payment exists on that quotation     |
| Booking smoke fails mid-path | Re-run after backend restart; check 4xx body |
