#!/usr/bin/env bash
# Smoke: customer enquiry → CRM claim → customer status contact_pending.
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
  -d "{\"challengeId\":\"$cust_challenge_id\",\"code\":\"$cust_code\",\"deviceId\":\"smoke-customer\"}")
cust_token=$(json_field "$cust_session" accessToken)

echo "==> Create enquiry"
enquiry=$(curl -sf -X POST "$API_BASE/enquiries" \
  -H "authorization: Bearer $cust_token" \
  -H 'content-type: application/json' \
  -d '{"eventTypeCode":"wedding","serviceCategoryCodes":[],"contactPreference":"phone","guestCount":120}')
enquiry_id=$(json_field "$enquiry" id)
enquiry_status=$(json_field "$enquiry" status)
echo "    enquiry $enquiry_id status=$enquiry_status"
if [[ "$enquiry_status" != "received" ]]; then
  echo "Expected enquiry status received, got $enquiry_status" >&2
  exit 1
fi

echo "==> Employee OTP ($EMPLOYEE_MOBILE)"
emp_challenge=$(curl -sf -X POST "$API_BASE/auth/otp/request" \
  -H 'content-type: application/json' \
  -d "{\"mobileNumber\":\"$EMPLOYEE_MOBILE\",\"countryCode\":\"IN\"}")
emp_challenge_id=$(json_field "$emp_challenge" challengeId)
emp_code=$(json_field "$emp_challenge" debugCode)
emp_session=$(curl -sf -X POST "$API_BASE/auth/otp/verify" \
  -H 'content-type: application/json' \
  -d "{\"challengeId\":\"$emp_challenge_id\",\"code\":\"$emp_code\",\"deviceId\":\"smoke-employee\"}")
emp_token=$(json_field "$emp_session" accessToken)

echo "==> Find and claim lead"
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
  echo "Lead for enquiry $enquiry_id not found in CRM inbox" >&2
  exit 1
fi
curl -sf -X POST "$API_BASE/crm/leads/$lead_id/claim" \
  -H "authorization: Bearer $emp_token" \
  -H 'content-type: application/json' \
  -d '{}' >/dev/null

echo "==> Customer sees contact_pending"
updated=$(curl -sf "$API_BASE/enquiries/$enquiry_id" \
  -H "authorization: Bearer $cust_token")
updated_status=$(json_field "$updated" status)
echo "    enquiry status=$updated_status"
if [[ "$updated_status" != "contact_pending" ]]; then
  echo "Expected contact_pending after claim, got $updated_status" >&2
  exit 1
fi

echo "PASS: enquiry → claim → contact_pending"
