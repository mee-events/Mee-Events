# ADR 0002: Identity, OTP, and session security

- Status: accepted
- Date: 2026-07-27

## Context

A mobile number is the primary sign-in identifier but can be changed or recycled.
OTP and long-lived sessions are high-risk security boundaries.

## Decision

- Users receive immutable UUID identifiers; normalized E.164 mobile numbers are
  unique login identities, not database primary keys.
- OTP providers implement a narrow interface. Production refuses to start with
  the local provider. The local provider is deterministic only inside test code;
  development codes are generated and logged with explicit warnings.
- OTP challenges store a keyed digest, never the plaintext code. Attempts,
  expiry, resend cooldown, and request rate limits are enforced server-side.
- Successful verification consumes a challenge once.
- Access tokens are short lived. Refresh tokens are opaque, random, rotated on
  use, stored only as keyed digests, and bound to a revocable device session.
- Authorization is server-side and combines roles with resource scope. A user's
  last active role must be among their active role assignments.

## Consequences

Provider credentials and signing keys must come from a secret manager in hosted
environments. Account recovery, mobile-number change, step-up authentication,
and recycled-number controls require dedicated future workflows.
