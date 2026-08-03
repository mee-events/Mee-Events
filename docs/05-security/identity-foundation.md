# Identity foundation

> Prefer [authentication.md](./authentication.md) and [jwt.md](./jwt.md) for
> current TTLs and shipped behavior. This note keeps the domain narrative.

## Domain

`User` is the immutable account. A normalized E.164 mobile number is an
authentication identity. Role assignments are independently verified and scoped;
`lastActiveRole` is a preference constrained to active assignments.

`DeviceSession` owns a rotating refresh-token digest and can be revoked without
affecting other devices. Access tokens are short-lived authorization artifacts.

## OTP sequence

1. The client submits a mobile number and ISO country code.
2. The backend normalizes and validates the number.
3. Abuse controls approve or reject the request.
4. A random six-digit code is generated and only its challenge-bound HMAC is
   stored.
5. The selected provider sends the plaintext code.
6. Verification uses constant-time digest comparison, decrements attempts, and
   consumes the challenge exactly once.
7. The account is loaded or created with the default customer role.
8. A device session, refresh token, and short-lived access token are issued.
9. An audit event records the security action without OTPs or tokens.

## Required before production

- PostgreSQL repositories and reviewed migrations.
- Redis-backed rate limits and resend controls across replicas.
- Approved SMS provider, templates, delivery callbacks, and regional compliance.
- Refresh rotation/reuse detection, logout, revocation, and access-token guard.
- Audit sink with append-only retention and redaction.
- Mobile number change/recovery and recycled-number risk workflow.
- Bot/device abuse protection and operational alerting.
