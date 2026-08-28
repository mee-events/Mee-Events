# Secret handling

Also see [AI coding controls](./ai-coding-controls.md) for agent/MCP policy.

- Commit only examples containing placeholders.
- Store local values in ignored `.env` files.
- Store CI, staging, and production values in protected secret managers.
- Use distinct keys and credentials per environment.
- Never put backend secrets in Flutter or `NEXT_PUBLIC_*` variables.
- Environment contract and key matrix: [environment.md](../07-deployment/environment.md).
- Restrict production access, enable MFA, rotate credentials, and audit reads.
- Redact authorization headers, request/response cookies, OTP codes, access and
  refresh tokens, passwords, API keys, HMAC/client secrets, database URLs, and
  personal information from logs.
- If a secret is committed, revoke and rotate it; deleting Git history alone is
  not remediation.
