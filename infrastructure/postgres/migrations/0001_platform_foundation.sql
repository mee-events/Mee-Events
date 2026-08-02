BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country_code char(2) NOT NULL DEFAULT 'IN',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

INSERT INTO branches (id, code, name, city, state)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'HYD',
  'Mee Events Hyderabad',
  'Hyderabad',
  'Telangana'
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_e164 text NOT NULL UNIQUE CHECK (mobile_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  display_name text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  last_active_role text NOT NULL DEFAULT 'customer'
    CHECK (
      last_active_role IN (
        'customer',
        'vendor_owner',
        'vendor_member',
        'worker',
        'employee',
        'support',
        'finance',
        'manager',
        'administrator',
        'auditor'
      )
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id),
  role text NOT NULL
    CHECK (
      role IN (
        'customer',
        'vendor_owner',
        'vendor_member',
        'worker',
        'employee',
        'support',
        'finance',
        'manager',
        'administrator',
        'auditor'
      )
    ),
  state text NOT NULL DEFAULT 'active'
    CHECK (
      state IN (
        'draft',
        'submitted',
        'under_review',
        'changes_requested',
        'active',
        'suspended',
        'revoked'
      )
    ),
  scope_type text NOT NULL DEFAULT 'branch'
    CHECK (scope_type IN ('global', 'branch', 'vendor')),
  scope_id uuid,
  verified_at timestamptz,
  verified_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (
    (scope_type = 'global' AND scope_id IS NULL)
    OR (scope_type <> 'global' AND scope_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX role_assignments_unique_scope_idx
  ON role_assignments (
    user_id,
    role,
    scope_type,
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX role_assignments_user_state_idx
  ON role_assignments (user_id, state);

CREATE TABLE device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id),
  device_id text NOT NULL,
  device_name text,
  refresh_token_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX device_sessions_active_device_idx
  ON device_sessions (user_id, device_id)
  WHERE revoked_at IS NULL;

CREATE TABLE branch_settings (
  branch_id uuid NOT NULL REFERENCES branches(id),
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES app_users(id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (branch_id, key)
);

INSERT INTO branch_settings (branch_id, key, value)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'lead.first_response_sla_minutes',
  '10'::jsonb
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  request_id text NOT NULL,
  actor_user_id uuid REFERENCES app_users(id),
  actor_role text,
  branch_id uuid REFERENCES branches(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before_version integer,
  after_version integer,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (
    actor_role IS NULL
    OR actor_role IN (
      'customer',
      'vendor_owner',
      'vendor_member',
      'worker',
      'employee',
      'support',
      'finance',
      'manager',
      'administrator',
      'auditor',
      'system'
    )
  )
);

CREATE INDEX audit_events_entity_timeline_idx
  ON audit_events (entity_type, entity_id, occurred_at DESC);

CREATE INDEX audit_events_actor_timeline_idx
  ON audit_events (actor_user_id, occurred_at DESC);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version integer NOT NULL CHECK (aggregate_version > 0),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_events_delivery_idx
  ON outbox_events (status, available_at, created_at);

CREATE TABLE idempotency_records (
  key text PRIMARY KEY,
  actor_user_id uuid REFERENCES app_users(id),
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idempotency_records_expiry_idx
  ON idempotency_records (expires_at);

CREATE OR REPLACE FUNCTION set_record_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER branches_set_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER app_users_set_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER role_assignments_set_updated_at
BEFORE UPDATE ON role_assignments
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER branch_settings_set_updated_at
BEFORE UPDATE ON branch_settings
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE OR REPLACE FUNCTION reject_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$;

CREATE TRIGGER audit_events_reject_update
BEFORE UPDATE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();

CREATE TRIGGER audit_events_reject_delete
BEFORE DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();

COMMIT;
