BEGIN;

-- OTP challenges move from the in-memory scaffold to PostgreSQL.
CREATE TABLE otp_challenges (
  id uuid PRIMARY KEY,
  mobile_e164 text NOT NULL CHECK (mobile_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  code_digest text NOT NULL,
  expires_at timestamptz NOT NULL,
  resend_after timestamptz NOT NULL,
  attempts_remaining integer NOT NULL CHECK (attempts_remaining >= 0),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_challenges_mobile_idx
  ON otp_challenges (mobile_e164, created_at DESC);

CREATE INDEX otp_challenges_expiry_idx
  ON otp_challenges (expires_at);

-- Refresh rotation keeps the previous digest so reuse of a rotated token
-- can be detected and the session revoked (ADR 0002).
ALTER TABLE device_sessions
  ADD COLUMN previous_refresh_token_digest text;

CREATE INDEX device_sessions_refresh_digest_idx
  ON device_sessions (refresh_token_digest);

CREATE INDEX device_sessions_previous_refresh_digest_idx
  ON device_sessions (previous_refresh_token_digest)
  WHERE previous_refresh_token_digest IS NOT NULL;

COMMIT;
