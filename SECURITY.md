# Security Policy

Mee Events handles identity, customer information, event operations and
financial records. Security findings must be handled privately and must not be
published in a normal issue, pull request, screenshot or discussion.

## Reporting a vulnerability

Use the private **Security → Advisories → New draft security advisory** workflow
in this GitHub repository. Include:

- affected application, module, endpoint and commit;
- impact and the roles/branches/data exposed;
- safe reproduction steps using test data only;
- expected and actual behavior;
- suggested mitigation when known.

Do not include real customer data, production credentials, OTPs, tokens,
provider secrets or signing material. If a secret may have been exposed, revoke
and rotate it immediately before continuing investigation.

## Supported code

Security fixes are applied to `master` (GitHub default). Historical snapshots,
local-only prototypes and generated artifacts are not separately supported.

## Security boundaries

- The NestJS backend owns authentication and capability authorization.
- PostgreSQL migrations are the schema source of truth.
- Mobile and web clients must not contain privileged service credentials.
- A hidden control is not authorization; every protected API operation must
  reject unauthenticated and unauthorized callers.
- Controlled mutations require appropriate validation, transaction boundaries,
  audit evidence and safe error handling.

## Secret handling

The following must never be committed:

- local `.env` files;
- database passwords and connection strings containing real credentials;
- JWT, OTP or refresh-token secrets;
- SMS/payment/storage provider secrets;
- Android keystores, iOS certificates or provisioning profiles;
- Google/Firebase/Supabase privileged service files.

Commit example files with placeholders only. Follow
[docs/05-security/secrets.md](docs/05-security/secrets.md) for configuration and
rotation guidance.

## Production readiness

Passing unit tests does not prove production security. Before release, Mee
Events requires real PostgreSQL integration tests, role/capability matrices,
rate limiting, external OTP/provider validation, secret-manager configuration,
mobile release signing, logging review, monitoring and incident/backup drills.
