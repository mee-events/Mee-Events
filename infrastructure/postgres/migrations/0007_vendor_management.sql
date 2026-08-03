BEGIN;

-- Slice 7: Vendor Management Foundation
-- Companies that deliver services/rentals for Event Records via manager assignment.
-- Soft lifecycle only — never hard-delete.

ALTER TABLE event_timelines DROP CONSTRAINT IF EXISTS event_timelines_entry_type_check;
ALTER TABLE event_timelines
  ADD CONSTRAINT event_timelines_entry_type_check CHECK (
    entry_type IN (
      'booking_created',
      'event_record_created',
      'status_changed',
      'note_added',
      'note_updated',
      'document_added',
      'details_updated',
      'manager_assigned',
      'vendor_assigned',
      'worker_assigned',
      'payment_updated',
      'event_completed',
      'milestone',
      'task_created',
      'task_updated',
      'task_completed',
      'progress_added',
      'manager_reassigned',
      'vendor_accepted',
      'vendor_rejected',
      'vendor_progress_updated',
      'vendor_completed',
      'vendor_note_added'
    )
  );

ALTER TABLE event_activities DROP CONSTRAINT IF EXISTS event_activities_activity_type_check;
ALTER TABLE event_activities
  ADD CONSTRAINT event_activities_activity_type_check CHECK (
    activity_type IN (
      'created',
      'updated',
      'status_change',
      'note',
      'document',
      'assignment_placeholder',
      'payment',
      'milestone',
      'manager_assignment',
      'task',
      'progress',
      'vendor_assignment',
      'vendor_progress',
      'vendor_note'
    )
  );

-- Extra catalogue categories used by vendor profiles (additive).
INSERT INTO service_categories (code, display_name, source_alias, display_order)
VALUES
  ('dj', 'DJ', 'DJ services', 10),
  ('stage', 'Stage', 'Stage setup', 11),
  ('flowers', 'Flowers', 'Floral services', 12),
  ('makeup', 'Makeup', 'Makeup artists', 13),
  ('mehendi_artist', 'Mehendi', 'Mehendi artists', 14),
  ('car_rental', 'Car rental', 'Car rental services', 15),
  ('generator', 'Generator', 'Generator rental', 16),
  ('furniture', 'Furniture', 'Furniture rental', 17),
  ('led_wall', 'LED wall', 'LED wall rental', 18),
  ('security', 'Security', 'Security services', 19),
  ('housekeeping', 'Housekeeping', 'Housekeeping services', 20),
  ('anchor', 'Anchor', 'Event anchors', 21),
  ('entertainment', 'Entertainment', 'Entertainment acts', 22),
  ('videography', 'Videography', 'Videography services', 23)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  vendor_code text NOT NULL UNIQUE,
  business_name text NOT NULL,
  owner_name text NOT NULL,
  gst_number text,
  pan_number text,
  phone_e164 text NOT NULL,
  email text,
  address_line text,
  city text NOT NULL DEFAULT 'Hyderabad',
  state text NOT NULL DEFAULT 'Telangana',
  pincode text,
  upi_id text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (
      verification_status IN (
        'pending',
        'documents_requested',
        'verified',
        'rejected',
        'suspended'
      )
    ),
  active_status text NOT NULL DEFAULT 'active'
    CHECK (active_status IN ('active', 'inactive', 'suspended')),
  rating_average numeric(3, 2) NOT NULL DEFAULT 0
    CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendors_branch_status_idx
  ON vendors (branch_id, active_status, created_at DESC);
CREATE INDEX vendors_phone_idx ON vendors (phone_e164);
CREATE INDEX vendors_verification_idx ON vendors (verification_status);

CREATE TABLE vendor_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  user_id uuid NOT NULL REFERENCES app_users(id),
  member_role text NOT NULL DEFAULT 'member'
    CHECK (member_role IN ('owner', 'member', 'finance')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'invited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (vendor_id, user_id)
);

CREATE INDEX vendor_members_user_idx
  ON vendor_members (user_id, status);

CREATE TABLE vendor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  service_category_id uuid NOT NULL REFERENCES service_categories(id),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, service_category_id)
);

CREATE INDEX vendor_categories_category_idx
  ON vendor_categories (service_category_id, vendor_id);

CREATE TABLE vendor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  contact_name text NOT NULL,
  phone_e164 text,
  email text,
  designation text,
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendor_contacts_vendor_idx
  ON vendor_contacts (vendor_id, is_primary DESC);

CREATE TABLE vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  doc_type text NOT NULL
    CHECK (
      doc_type IN (
        'gst_certificate',
        'pan_card',
        'cancelled_cheque',
        'agreement',
        'other'
      )
    ),
  storage_key text,
  file_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected')),
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendor_documents_vendor_idx
  ON vendor_documents (vendor_id, created_at DESC);

CREATE TABLE vendor_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  account_number_masked text NOT NULL,
  ifsc_code text NOT NULL,
  upi_id text,
  is_primary boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendor_bank_accounts_vendor_idx
  ON vendor_bank_accounts (vendor_id, is_primary DESC);

CREATE TABLE vendor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  service_category_id uuid REFERENCES service_categories(id),
  assigned_by_user_id uuid REFERENCES app_users(id),
  assigned_manager_user_id uuid REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'invited'
    CHECK (
      status IN (
        'invited',
        'assigned',
        'accepted',
        'rejected',
        'planning',
        'travelling',
        'on_site',
        'working',
        'completed',
        'cancelled'
      )
    ),
  expected_arrival_at timestamptz,
  expected_completion_at timestamptz,
  assignment_notes text,
  rejection_reason text,
  latest_progress_summary text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendor_assignments_event_idx
  ON vendor_assignments (event_record_id, status, assigned_at DESC);
CREATE INDEX vendor_assignments_vendor_idx
  ON vendor_assignments (vendor_id, status, assigned_at DESC);
CREATE INDEX vendor_assignments_manager_idx
  ON vendor_assignments (assigned_manager_user_id, status)
  WHERE assigned_manager_user_id IS NOT NULL;

-- One open assignment per vendor per event (soft cancel/complete frees the slot).
CREATE UNIQUE INDEX vendor_assignments_open_uniq
  ON vendor_assignments (event_record_id, vendor_id)
  WHERE status NOT IN ('rejected', 'cancelled', 'completed');

CREATE TABLE vendor_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES vendor_assignments(id),
  actor_user_id uuid REFERENCES app_users(id),
  change_type text NOT NULL
    CHECK (
      change_type IN (
        'created',
        'status_changed',
        'accepted',
        'rejected',
        'progress_updated',
        'completed',
        'cancelled',
        'note_added'
      )
    ),
  from_status text,
  to_status text,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendor_assignment_history_assignment_idx
  ON vendor_assignment_history (assignment_id, occurred_at DESC);

CREATE TABLE vendor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  assignment_id uuid REFERENCES vendor_assignments(id),
  event_record_id uuid REFERENCES event_records(id),
  note_type text NOT NULL DEFAULT 'internal'
    CHECK (note_type IN ('internal', 'progress', 'vendor')),
  content text NOT NULL,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendor_notes_vendor_idx
  ON vendor_notes (vendor_id, created_at DESC);
CREATE INDEX vendor_notes_assignment_idx
  ON vendor_notes (assignment_id, created_at DESC)
  WHERE assignment_id IS NOT NULL;

CREATE TABLE vendor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  event_record_id uuid REFERENCES event_records(id),
  assignment_id uuid REFERENCES vendor_assignments(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  rated_by_user_id uuid REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendor_ratings_vendor_idx
  ON vendor_ratings (vendor_id, status, created_at DESC);

CREATE TRIGGER vendors_set_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_members_set_updated_at
  BEFORE UPDATE ON vendor_members
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_contacts_set_updated_at
  BEFORE UPDATE ON vendor_contacts
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_documents_set_updated_at
  BEFORE UPDATE ON vendor_documents
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_bank_accounts_set_updated_at
  BEFORE UPDATE ON vendor_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_assignments_set_updated_at
  BEFORE UPDATE ON vendor_assignments
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_ratings_set_updated_at
  BEFORE UPDATE ON vendor_ratings
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
