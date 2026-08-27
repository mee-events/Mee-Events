#!/usr/bin/env bash
# Fail-closed probes: missing and non-loopback URLs must not silently skip.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD="$ROOT/scripts/e2e/require-loopback.sh"
API_SMOKE="$ROOT/scripts/e2e/api-smoke.sh"

pass=0
fail() {
  echo "FAIL: $1" >&2
  exit 1
}
expect_fail() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    fail "$label exited 0 (expected nonzero)"
  fi
  echo "    denied: $label"
  pass=$((pass + 1))
}
expect_ok() {
  local label="$1"
  shift
  if ! "$@" >/dev/null 2>&1; then
    fail "$label exited nonzero (expected 0)"
  fi
  echo "    allowed: $label"
  pass=$((pass + 1))
}

echo "==> Loopback URL guard"

expect_fail "missing URL" bash "$GUARD" E2E_API_BASE_URL ""
expect_fail "empty whitespace URL" bash "$GUARD" E2E_API_BASE_URL "   "
expect_fail "production https host" bash "$GUARD" E2E_API_BASE_URL \
  "https://api.example.com/api/v1"
expect_fail "CI .invalid host" bash "$GUARD" E2E_API_BASE_URL \
  "https://api.ci.mee-events.invalid/api/v1"
expect_fail "private LAN host" bash "$GUARD" E2E_API_BASE_URL \
  "http://10.0.0.8:3002/api/v1"
expect_fail "userinfo on loopback" bash "$GUARD" E2E_API_BASE_URL \
  "http://user:pass@127.0.0.1:3002/api/v1"
expect_fail "non-http scheme" bash "$GUARD" E2E_API_BASE_URL \
  "file:///tmp/api"

expect_ok "http 127.0.0.1" bash "$GUARD" E2E_API_BASE_URL \
  "http://127.0.0.1:3002/api/v1"
expect_ok "http localhost" bash "$GUARD" E2E_API_BASE_URL \
  "http://localhost:3001"
expect_ok "http IPv6 loopback" bash "$GUARD" E2E_API_BASE_URL \
  "http://[::1]:3002/api/v1"

echo "==> API smoke rejects missing/non-loopback before network"
expect_fail "API smoke missing env" env -u E2E_API_BASE_URL bash "$API_SMOKE"
expect_fail "API smoke production URL" \
  env E2E_API_BASE_URL="https://api.example.com/api/v1" bash "$API_SMOKE"

echo "==> Playwright config rejects missing/non-loopback at load"
expect_fail "Playwright missing env" \
  env -u E2E_API_BASE_URL -u E2E_ERP_BASE_URL \
  corepack pnpm --filter @me-event/erp-web exec playwright test --list \
  --config=playwright.config.ts
expect_fail "Playwright production API" \
  env E2E_API_BASE_URL="https://api.example.com/api/v1" \
  E2E_ERP_BASE_URL="http://127.0.0.1:3001" \
  corepack pnpm --filter @me-event/erp-web exec playwright test --list \
  --config=playwright.config.ts
expect_fail "Playwright production ERP" \
  env E2E_API_BASE_URL="http://127.0.0.1:3002/api/v1" \
  E2E_ERP_BASE_URL="https://erp.example.com" \
  corepack pnpm --filter @me-event/erp-web exec playwright test --list \
  --config=playwright.config.ts

echo "==> Mobile wrapper rejects missing/non-loopback before Dart"
expect_fail "mobile missing env" \
  env -u E2E_API_BASE_URL bash "$ROOT/scripts/e2e/mobile-api-smoke.sh"
expect_fail "mobile production URL" \
  env E2E_API_BASE_URL="https://api.example.com/api/v1" \
  bash "$ROOT/scripts/e2e/mobile-api-smoke.sh"

echo "PASS: ${pass} fail-closed probes"
