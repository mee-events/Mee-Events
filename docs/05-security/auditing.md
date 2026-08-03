# Auditing

Mee Events records security and controlled business actions in append-only
`audit_events`, often together with `outbox_events` for asynchronous delivery.

Behavioral companion writes: [Pattern B Specification](../02-architecture/pattern-b.md).  
Schema catalog: [Pattern B tables](../03-database/pattern-b-tables.md).  
Ops secrets: [Secret handling](./secrets.md).

---

## audit_events

Created in `0001_platform_foundation.sql`.

| Aspect         | Behavior                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Append-only    | Triggers reject `UPDATE` and `DELETE`                                                                                                      |
| Typical fields | `request_id`, `actor_user_id`, `actor_role`, `branch_id`, `entity_type`, `entity_id`, `action`, `after_version`, `metadata`, `occurred_at` |
| Indexes        | Entity and actor timeline indexes (plus FK indexes in later migrations)                                                                    |

Do not store OTPs, access tokens, or refresh tokens in `metadata`.

---

## Writers

| Writer                                 | When                                                           | Transaction                                           |
| -------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| **`AUDIT_SINK`** (`PostgresAuditSink`) | Identity security actions                                      | Own DB write (not Pattern B domain TX)                |
| **`writeAuditOutbox`**                 | Controlled domain mutations using shared Pattern B helpers     | Same client TX as domain + timeline/activity + outbox |
| **Inline SQL**                         | Older paths (quotations, payments, enquiries, CRM leads, etc.) | Adapter TX; may not use shared helpers                |

Prefer shared Pattern B helpers for new controlled mutations
([backend.md](../02-architecture/backend.md)).

---

## Identity audit actions

From `AuthService` via `AUDIT_SINK`:

| Action                     | Meaning                                         |
| -------------------------- | ----------------------------------------------- |
| `identity.user.created`    | New user created on first successful OTP verify |
| `identity.session.created` | Device session issued                           |
| `identity.session.rotated` | Refresh rotation succeeded                      |
| `identity.session.revoked` | Logout or refresh-token reuse                   |

Reuse revocations include reason metadata such as `refresh-token-reuse`; logout
uses reason `logout`.

---

## Domain mutations and outbox

Controlled module writes (vendors, workers, inventory, finance, operations,
event records, manager operations, and others on the shared helper path) call
`writeAuditOutbox`, which inserts:

1. `audit_events`
2. `outbox_events` with `status = pending`

Outbox **delivery** is eventually consistent after commit. Do not treat a
pending outbox row as proof the notification reached the user.

Full module coverage and exceptions:
[Pattern B § Module Coverage](../02-architecture/pattern-b.md).

---

## Request logging redaction

Pino HTTP logging redacts sensitive paths such as `authorization` and OTP
`req.body.code` (`app.module.ts`). Align with [secrets.md](./secrets.md):
never log refresh tokens or plaintext OTPs.

---

## Related

- [authentication.md](./authentication.md)
- [branch-context.md](./branch-context.md)
- [Database transactions](../03-database/transactions.md)
