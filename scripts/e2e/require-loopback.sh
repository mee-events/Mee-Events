#!/usr/bin/env bash
# Fail-closed loopback URL guard for STAB-17 E2E smokes.
# Do not run these scripts with `bash -x` — that would print captured tokens.

require_loopback_url() {
  local name="$1"
  local value="${2-}"

  if [[ -z "$value" ]]; then
    echo "E2E fail-closed: ${name} is required" >&2
    return 1
  fi

  python3 - "$name" "$value" <<'PY'
import sys
from urllib.parse import urlparse

name, raw = sys.argv[1], sys.argv[2].strip()
try:
    parsed = urlparse(raw)
except Exception:
    print(f"E2E fail-closed: {name} is not a valid URL", file=sys.stderr)
    sys.exit(1)

if parsed.scheme not in ("http", "https"):
    print(f"E2E fail-closed: {name} must be http or https", file=sys.stderr)
    sys.exit(1)

if parsed.username or parsed.password:
    print(f"E2E fail-closed: {name} must not include userinfo", file=sys.stderr)
    sys.exit(1)

host = (parsed.hostname or "").lower()
if host not in ("localhost", "127.0.0.1", "::1"):
    print(
        f"E2E fail-closed: {name} must target loopback "
        "(localhost, 127.0.0.1, or ::1)",
        file=sys.stderr,
    )
    sys.exit(1)
PY
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 NAME URL" >&2
    exit 1
  fi
  require_loopback_url "$1" "$2"
fi
