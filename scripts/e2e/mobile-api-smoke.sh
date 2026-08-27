#!/usr/bin/env bash
# CI-compatible mobile-side API contract smoke (no emulator/device).
# Do not run with `bash -x`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=require-loopback.sh
source "$ROOT/scripts/e2e/require-loopback.sh"

require_loopback_url E2E_API_BASE_URL "${E2E_API_BASE_URL-}"

cd "$ROOT/apps/mobile"
exec dart run tool/e2e_api_contract_smoke.dart
