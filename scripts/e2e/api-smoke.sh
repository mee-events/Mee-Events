#!/usr/bin/env bash
# Authenticated API smoke against the local Nest API.
# Health → unique synthetic OTP login → authorized GET → logout.
# Does not implement enquiry→booking. Do not run with `bash -x`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=require-loopback.sh
source "$ROOT/scripts/e2e/require-loopback.sh"

require_loopback_url E2E_API_BASE_URL "${E2E_API_BASE_URL-}"

API_BASE="${E2E_API_BASE_URL%/}"

json_get() {
  local json="$1"
  local path="$2"
  python3 -c '
import json, sys
path = sys.argv[1].split(".")
data = json.load(sys.stdin)
current = data
for key in path:
    if not isinstance(current, dict) or key not in current:
        sys.exit(1)
    current = current[key]
if current is None or isinstance(current, (dict, list)):
    sys.exit(2)
print(current)
' "$path" <<<"$json"
}

http_json() {
  local method="$1"
  local url="$2"
  local data="${3-}"
  local token="${4-}"
  local args=(-sS -w $'\n%{http_code}' -X "$method" "$url")
  if [[ -n "$token" ]]; then
    args+=(-H "authorization: Bearer ${token}")
  fi
  if [[ -n "$data" ]]; then
    args+=(-H "content-type: application/json" -d "$data")
  fi
  local raw
  raw="$(curl "${args[@]}")"
  HTTP_BODY="${raw%$'\n'*}"
  HTTP_CODE="${raw##*$'\n'}"
}

synthetic_mobile() {
  python3 - <<'PY'
import os, time, random
n = (os.getpid() + int(time.time() * 1000) + random.randint(0, 99999)) % 100000000
print(f"+9197{n:08d}")
PY
}

echo "==> E2E API smoke (loopback)"

http_json GET "$API_BASE/health/live"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "health/live failed: HTTP ${HTTP_CODE}" >&2
  exit 1
fi
live_status="$(json_get "$HTTP_BODY" status)"
if [[ "$live_status" != "ok" ]]; then
  echo "health/live status was not ok" >&2
  exit 1
fi
echo "    live ok"

http_json GET "$API_BASE/health/ready"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "health/ready failed: HTTP ${HTTP_CODE}" >&2
  exit 1
fi
ready_status="$(json_get "$HTTP_BODY" status)"
ready_db="$(json_get "$HTTP_BODY" checks.persistence)"
if [[ "$ready_status" != "ok" || "$ready_db" != "postgresql" ]]; then
  echo "health/ready is not ok against PostgreSQL" >&2
  exit 1
fi
echo "    ready ok"

CUSTOMER_MOBILE="$(synthetic_mobile)"
DEVICE_ID="e2e-api-$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
access_token=""

cleanup() {
  local token="$access_token"
  access_token=""
  if [[ -n "$token" ]]; then
    http_json POST "$API_BASE/auth/logout" "{}" "$token" || true
  fi
}
trap cleanup EXIT

echo "==> Request local OTP for synthetic customer"
http_json POST "$API_BASE/auth/otp/request" \
  "{\"mobileNumber\":\"${CUSTOMER_MOBILE}\",\"countryCode\":\"IN\"}"
if [[ "$HTTP_CODE" != "202" ]]; then
  echo "otp/request failed: HTTP ${HTTP_CODE}" >&2
  exit 1
fi
challenge_id="$(json_get "$HTTP_BODY" challengeId)"
debug_code="$(json_get "$HTTP_BODY" debugCode || true)"
if [[ -z "$debug_code" ]]; then
  echo "otp/request had no debugCode; need APP_ENV=development and OTP_PROVIDER=local" >&2
  exit 1
fi
echo "    challenge accepted"

echo "==> Verify OTP"
http_json POST "$API_BASE/auth/otp/verify" \
  "{\"challengeId\":\"${challenge_id}\",\"code\":\"${debug_code}\",\"deviceId\":\"${DEVICE_ID}\",\"deviceName\":\"STAB-17 API smoke\"}"
debug_code=""
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "otp/verify failed: HTTP ${HTTP_CODE}" >&2
  exit 1
fi
access_token="$(json_get "$HTTP_BODY" accessToken)"
user_role="$(json_get "$HTTP_BODY" user.lastActiveRole)"
if [[ -z "$access_token" ]]; then
  echo "otp/verify did not return an access token" >&2
  exit 1
fi
if [[ "$user_role" != "customer" ]]; then
  echo "expected synthetic customer role" >&2
  exit 1
fi
echo "    session created"

echo "==> Authorized GET /platform/bootstrap"
http_json GET "$API_BASE/platform/bootstrap" "" "$access_token"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "platform/bootstrap failed: HTTP ${HTTP_CODE}" >&2
  exit 1
fi
bootstrap_role="$(json_get "$HTTP_BODY" actor.activeRole)"
if [[ "$bootstrap_role" != "customer" ]]; then
  echo "bootstrap role mismatch" >&2
  exit 1
fi
echo "    bootstrap ok"

echo "==> Authorized GET /enquiries"
http_json GET "$API_BASE/enquiries" "" "$access_token"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "enquiries list failed: HTTP ${HTTP_CODE}" >&2
  exit 1
fi
python3 -c '
import json, sys
data = json.load(sys.stdin)
if not isinstance(data.get("enquiries"), list):
    raise SystemExit("enquiries payload missing list")
' <<<"$HTTP_BODY"
echo "    enquiries list ok"

echo "==> Logout / revoke session"
http_json POST "$API_BASE/auth/logout" "{}" "$access_token"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "logout failed: HTTP ${HTTP_CODE}" >&2
  exit 1
fi
revoked_token="$access_token"
access_token=""

http_json GET "$API_BASE/platform/bootstrap" "" "$revoked_token"
revoked_token=""
if [[ "$HTTP_CODE" != "401" ]]; then
  echo "expected 401 after logout, got HTTP ${HTTP_CODE}" >&2
  exit 1
fi
echo "    session revoked"

echo "PASS: authenticated API smoke"
