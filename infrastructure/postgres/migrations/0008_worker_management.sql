BEGIN;

-- Slice 8: Worker Management Foundation
-- Field workers execute event tasks; default membership is via a Vendor.
-- vendor_id nullable on membership to allow future direct company workers.
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
      'vendor_note_added',
      'worker_accepted',
      'worker_rejected',
      'worker_checked_in',
      'worker_progress_updated',
      'worker_checked_out',
      'worker_task_completed',
      'worker_note_added'
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
      'vendor_note',
      'worker_assignment',
      'worker_attendance',
      'worker_progress',
      'worker_note'
    )
  );

CREATE TABLE workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  user_id uuid REFERENCES app_users(id),
  worker_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  phone_e164 text NOT NULL,
  email text,
  photo_placeholder text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  availability_status text NOT NULL DEFAULT 'available'
    CHECK (
      availability_status IN (
        'available',
        'busy',
        'on_leave',
        'unavailable'
      )
    ),
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX workers_branch_status_idx
  ON workers (branch_id, status, created_at DESC);
CREATE INDEX workers_phone_idx ON workers (phone_e164);
CREATE INDEX workers_user_idx ON workers (user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE worker_profiles (
  worker_id uuid PRIMARY KEY REFERENCES workers(id),
  experience_years integer CHECK (experience_years IS NULL OR experience_years >= 0),
  emergency_contact_name text,
  emergency_contact_phone text,
  bank_account_holder text,
  bank_name text,
  account_number_masked text,
  ifsc_code text,
  upi_id text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

-- Default: one primary vendor membership. vendor_id NULL = future company worker.
CREATE TABLE worker_vendor_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  vendor_id uuid REFERENCES vendors(id),
  employment_type text NOT NULL DEFAULT 'vendor'
    CHECK (employment_type IN ('vendor', 'company')),
  membership_role text NOT NULL DEFAULT 'worker'
    CHECK (membership_role IN ('worker', 'lead', 'supervisor')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'ended')),
  is_primary boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (
    (employment_type = 'vendor' AND vendor_id IS NOT NULL)
    OR (employment_type = 'company' AND vendor_id IS NULL)
  )
);

CREATE UNIQUE INDEX worker_vendor_membership_primary_uniq
  ON worker_vendor_membership (worker_id)
  WHERE is_primary = true AND status = 'active';

CREATE INDEX worker_vendor_membership_vendor_idx
  ON worker_vendor_membership (vendor_id, status)
  WHERE vendor_id IS NOT NULL;

CREATE TABLE worker_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  skill_code text NOT NULL,
  skill_label text NOT NULL,
  proficiency text NOT NULL DEFAULT 'standard'
    CHECK (proficiency IN ('junior', 'standard', 'senior', 'expert')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, skill_code)
);

CREATE INDEX worker_skills_worker_idx
  ON worker_skills (worker_id, status);

CREATE TABLE worker_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  doc_type text NOT NULL
    CHECK (
      doc_type IN (
        'id_proof',
        'address_proof',
        'photo',
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

CREATE INDEX worker_documents_worker_idx
  ON worker_documents (worker_id, created_at DESC);

CREATE TABLE worker_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  worker_id uuid NOT NULL REFERENCES workers(id),
  vendor_id uuid REFERENCES vendors(id),
  vendor_assignment_id uuid REFERENCES vendor_assignments(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (
      status IN (
        'assigned',
        'accepted',
        'rejected',
        'travelling',
        'checked_in',
        'working',
        'completed',
        'checked_out',
        'cancelled'
      )
    ),
  assigned_by_user_id uuid REFERENCES app_users(id),
  expected_start_at timestamptz,
  expected_end_at timestamptz,
  rejection_reason text,
  latest_progress_summary text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  checked_in_at timestamptz,
  completed_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX worker_tasks_event_idx
  ON worker_tasks (event_record_id, status, assigned_at DESC);
CREATE INDEX worker_tasks_worker_idx
  ON worker_tasks (worker_id, status, assigned_at DESC);
CREATE INDEX worker_tasks_vendor_idx
  ON worker_tasks (vendor_id, status)
  WHERE vendor_id IS NOT NULL;

CREATE TABLE worker_task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES worker_tasks(id),
  actor_user_id uuid REFERENCES app_users(id),
  change_type text NOT NULL
    CHECK (
      change_type IN (
        'created',
        'status_changed',
        'accepted',
        'rejected',
        'checked_in',
        'progress_updated',
        'completed',
        'checked_out',
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

CREATE INDEX worker_task_history_task_idx
  ON worker_task_history (task_id, occurred_at DESC);

CREATE TABLE worker_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES worker_tasks(id),
  worker_id uuid NOT NULL REFERENCES workers(id),
  check_type text NOT NULL
    CHECK (check_type IN ('check_in', 'check_out')),
  checked_at timestamptz NOT NULL DEFAULT now(),
  gps_placeholder text,
  location_placeholder text,
  photo_placeholder text,
  device_placeholder text,
  completion_notes text,
  completion_photo_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX worker_checkins_task_idx
  ON worker_checkins (task_id, checked_at DESC);
CREATE INDEX worker_checkins_worker_idx
  ON worker_checkins (worker_id, checked_at DESC);

CREATE TABLE worker_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  event_record_id uuid REFERENCES event_records(id),
  task_id uuid REFERENCES worker_tasks(id),
  attendance_date date NOT NULL DEFAULT (timezone('Asia/Kolkata', now()))::date,
  status text NOT NULL DEFAULT 'present'
    CHECK (
      status IN (
        'present',
        'absent',
        'late',
        'half_day',
        'on_leave'
      )
    ),
  check_in_id uuid REFERENCES worker_checkins(id),
  check_out_id uuid REFERENCES worker_checkins(id),
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX worker_attendance_worker_idx
  ON worker_attendance (worker_id, attendance_date DESC);
CREATE UNIQUE INDEX worker_attendance_task_day_uniq
  ON worker_attendance (task_id, attendance_date)
  WHERE task_id IS NOT NULL;

CREATE TABLE worker_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES worker_tasks(id),
  worker_id uuid NOT NULL REFERENCES workers(id),
  summary text NOT NULL,
  photo_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  percent_complete integer
    CHECK (percent_complete IS NULL OR (percent_complete >= 0 AND percent_complete <= 100)),
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX worker_progress_task_idx
  ON worker_progress (task_id, created_at DESC);

CREATE TABLE worker_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  task_id uuid REFERENCES worker_tasks(id),
  event_record_id uuid REFERENCES event_records(id),
  note_type text NOT NULL DEFAULT 'internal'
    CHECK (note_type IN ('internal', 'progress', 'worker')),
  content text NOT NULL,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX worker_notes_worker_idx
  ON worker_notes (worker_id, created_at DESC);
CREATE INDEX worker_notes_task_idx
  ON worker_notes (task_id, created_at DESC)
  WHERE task_id IS NOT NULL;

CREATE TABLE worker_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  event_record_id uuid REFERENCES event_records(id),
  task_id uuid REFERENCES worker_tasks(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  rated_by_user_id uuid REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX worker_ratings_worker_idx
  ON worker_ratings (worker_id, status, created_at DESC);

CREATE TRIGGER workers_set_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER worker_profiles_set_updated_at
  BEFORE UPDATE ON worker_profiles
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER worker_vendor_membership_set_updated_at
  BEFORE UPDATE ON worker_vendor_membership
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER worker_documents_set_updated_at
  BEFORE UPDATE ON worker_documents
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER worker_tasks_set_updated_at
  BEFORE UPDATE ON worker_tasks
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER worker_attendance_set_updated_at
  BEFORE UPDATE ON worker_attendance
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER worker_ratings_set_updated_at
  BEFORE UPDATE ON worker_ratings
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
