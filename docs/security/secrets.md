# Secret handling

- Commit only examples containing placeholders.
- Store local values in ignored `.env` files.
- Store CI, staging, and production values in protected secret managers.
- Use distinct keys and credentials per environment.
- Never put backend secrets in Flutter or `NEXT_PUBLIC_*` variables.
- Restrict production access, enable MFA, rotate credentials, and audit reads.
- Redact authorization headers, OTP codes, refresh tokens, cookies, and personal
  information from logs.
- If a secret is committed, revoke and rotate it; deleting Git history alone is
  not remediation.
