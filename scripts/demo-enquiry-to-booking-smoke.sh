#!/usr/bin/env bash
# Smoke: enquiry → claim → requirements → quote → approve → advance →
# confirm → booking + event record.
# Requires backend on localhost:3002 and seeded employee (+919000000001).
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3002/api/v1}"
CUSTOMER_MOBILE="${CUSTOMER_MOBILE:-+9198$(printf '%08d' $((RANDOM % 100000000)))}"
EMPLOYEE_MOBILE="${EMPLOYEE_MOBILE:-+919000000001}"

json_field() {
  local json="$1"
  local field="$2"
  python3 -c "import json,sys; print(json.load(sys.stdin).get('$field',''))" <<<"$json"
}

json_path() {
  local json="$1"
  local expr="$2"
  python3 -c "import json,sys; data=json.load(sys.stdin); print($expr)" <<<"$json"
}

echo "==> Health"
curl -sf "$API_BASE/health/live" >/dev/null

echo "==> Customer OTP ($CUSTOMER_MOBILE)"
cust_challenge=$(curl -sf -X POST "$API_BASE/auth/otp/request" \
  -H 'content-type: application/json' \
  -d "{\"mobileNumber\":\"$CUSTOMER_MOBILE\",\"countryCode\":\"IN\"}")
cust_challenge_id=$(json_field "$cust_challenge" challengeId)
cust_code=$(json_field "$cust_challenge" debugCode)
if [[ -z "$cust_code" ]]; then
  echo "No debugCode — set APP_ENV=development and OTP_PROVIDER=local" >&2
  exit 1
fi
cust_session=$(curl -sf -X POST "$API_BASE/auth/otp/verify" \
  -H 'content-type: application/json' \
  -d "{\"challengeId\":\"$cust_challenge_id\",\"code\":\"$cust_code\",\"deviceId\":\"smoke-booking-customer\"}")
cust_token=$(json_field "$cust_session" accessToken)

echo "==> Create enquiry"
enquiry=$(curl -sf -X POST "$API_BASE/enquiries" \
  -H "authorization: Bearer $cust_token" \
  -H 'content-type: application/json' \
  -d '{"eventTypeCode":"wedding","serviceCategoryCodes":[],"contactPreference":"phone","guestCount":120,"location":"Hyderabad"}')
enquiry_id=$(json_field "$enquiry" id)
echo "    enquiry $enquiry_id"

echo "==> Employee OTP ($EMPLOYEE_MOBILE)"
emp_challenge=$(curl -sf -X POST "$API_BASE/auth/otp/request" \
  -H 'content-type: application/json' \
  -d "{\"mobileNumber\":\"$EMPLOYEE_MOBILE\",\"countryCode\":\"IN\"}")
emp_challenge_id=$(json_field "$emp_challenge" challengeId)
emp_code=$(json_field "$emp_challenge" debugCode)
emp_session=$(curl -sf -X POST "$API_BASE/auth/otp/verify" \
  -H 'content-type: application/json' \
  -d "{\"challengeId\":\"$emp_challenge_id\",\"code\":\"$emp_code\",\"deviceId\":\"smoke-booking-employee\"}")
emp_token=$(json_field "$emp_session" accessToken)

echo "==> Claim lead"
leads=$(curl -sf "$API_BASE/crm/leads" -H "authorization: Bearer $emp_token")
lead_id=$(python3 -c "
import json,sys
data=json.load(sys.stdin)
for lead in data.get('leads', []):
    if lead.get('enquiryId') == '$enquiry_id':
        print(lead['id'])
        break
" <<<"$leads")
if [[ -z "$lead_id" ]]; then
  echo "Lead for enquiry $enquiry_id not found" >&2
  exit 1
fi
curl -sf -X POST "$API_BASE/crm/leads/$lead_id/claim" \
  -H "authorization: Bearer $emp_token" \
  -H 'content-type: application/json' \
  -d '{}' >/dev/null
echo "    lead $lead_id claimed"

echo "==> Save requirements"
curl -sf -X POST "$API_BASE/crm/leads/$lead_id/requirements" \
  -H "authorization: Bearer $emp_token" \
  -H 'content-type: application/json' \
  -d '{"notes":"Smoke test wedding requirements — decor + catering.","status":"qualified"}' >/dev/null

echo "==> Create and send quotation"
quote=$(curl -sf -X POST "$API_BASE/crm/quotations" \
  -H "authorization: Bearer $emp_token" \
  -H 'content-type: application/json' \
  -d "{\"leadId\":\"$lead_id\",\"items\":[{\"itemType\":\"package\",\"title\":\"Wedding decor package\",\"quantity\":1,\"unitPrice\":10000},{\"itemType\":\"service\",\"title\":\"Photography\",\"quantity\":1,\"unitPrice\":5000}],\"gstPercent\":18,\"discountAmount\":0,\"discountPercent\":0,\"advancePercent\":30}")
quote_id=$(json_field "$quote" id)
quote_status=$(json_field "$quote" status)
echo "    quotation $quote_id status=$quote_status"
if [[ "$quote_status" != "draft" ]]; then
  echo "Expected draft quotation, got $quote_status" >&2
  exit 1
fi
sent=$(curl -sf -X POST "$API_BASE/crm/quotations/$quote_id/send" \
  -H "authorization: Bearer $emp_token" \
  -H 'content-type: application/json' \
  -d '{}')
sent_status=$(json_field "$sent" status)
echo "    sent status=$sent_status"
if [[ "$sent_status" != "sent" ]]; then
  echo "Expected sent quotation, got $sent_status" >&2
  exit 1
fi

echo "==> Customer approves quotation"
approved=$(curl -sf -X POST "$API_BASE/quotations/$quote_id/approve" \
  -H "authorization: Bearer $cust_token" \
  -H 'content-type: application/json' \
  -d '{}')
approved_status=$(json_field "$approved" status)
echo "    quotation status=$approved_status"
if [[ "$approved_status" != "approved" ]]; then
  echo "Expected approved, got $approved_status" >&2
  exit 1
fi

echo "==> Customer submits advance"
advance=$(curl -sf -X POST "$API_BASE/payments/advance" \
  -H "authorization: Bearer $cust_token" \
  -H 'content-type: application/json' \
  -d "{\"quotationId\":\"$quote_id\",\"method\":\"upi\",\"notes\":\"Smoke advance\"}")
payment_id=$(json_field "$advance" id)
payment_status=$(json_field "$advance" status)
echo "    payment $payment_id status=$payment_status"
if [[ "$payment_status" != "pending" ]]; then
  echo "Expected pending payment, got $payment_status" >&2
  exit 1
fi

echo "==> CRM confirms advance (creates booking + event)"
confirmed=$(curl -sf -X POST "$API_BASE/crm/payments/$payment_id/confirm" \
  -H "authorization: Bearer $emp_token" \
  -H 'content-type: application/json' \
  -d '{}')
paid_status=$(json_path "$confirmed" "data['payment']['status']")
booking_id=$(json_path "$confirmed" "data['booking']['id']")
booking_number=$(json_path "$confirmed" "data['booking']['bookingNumber']")
booking_status=$(json_path "$confirmed" "data['booking']['status']")
event_id=$(json_path "$confirmed" "data['eventRecord']['id']")
event_number=$(json_path "$confirmed" "data['eventRecord']['eventNumber']")
event_status=$(json_path "$confirmed" "data['eventRecord']['status']")
echo "    payment=$paid_status booking=$booking_number ($booking_status) event=$event_number ($event_status)"

if [[ "$paid_status" != "paid" ]]; then
  echo "Expected payment paid, got $paid_status" >&2
  exit 1
fi
if [[ -z "$booking_id" || "$booking_status" != "confirmed" ]]; then
  echo "Expected confirmed booking, got id=$booking_id status=$booking_status" >&2
  exit 1
fi
if [[ -z "$event_id" || "$event_status" != "booking_confirmed" ]]; then
  echo "Expected event booking_confirmed, got id=$event_id status=$event_status" >&2
  exit 1
fi
if [[ "$booking_number" != BK-* ]]; then
  echo "Unexpected booking number format: $booking_number" >&2
  exit 1
fi
if [[ "$event_number" != EV-* ]]; then
  echo "Unexpected event number format: $event_number" >&2
  exit 1
fi

echo "==> Customer enquiry closed + booking visible"
updated=$(curl -sf "$API_BASE/enquiries/$enquiry_id" \
  -H "authorization: Bearer $cust_token")
updated_status=$(json_field "$updated" status)
echo "    enquiry status=$updated_status"
if [[ "$updated_status" != "closed" ]]; then
  echo "Expected enquiry closed after booking, got $updated_status" >&2
  exit 1
fi
bookings=$(curl -sf "$API_BASE/bookings" -H "authorization: Bearer $cust_token")
found_booking=$(python3 -c "
import json,sys
data=json.load(sys.stdin)
for b in data.get('bookings', []):
    if b.get('id') == '$booking_id':
        print(b.get('eventRecordId',''))
        break
" <<<"$bookings")
if [[ "$found_booking" != "$event_id" ]]; then
  echo "Customer bookings missing eventRecordId link (got '$found_booking')" >&2
  exit 1
fi

echo "PASS: enquiry → quote → advance → booking $booking_number + event $event_number"
