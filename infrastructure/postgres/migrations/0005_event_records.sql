BEGIN;

-- Slice 4: Event Record — central operating aggregate after booking confirmation.
-- Never hard-delete these tables; status/lifecycle transitions only.

CREATE TABLE event_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  event_number text NOT NULL UNIQUE,
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
  enquiry_id uuid NOT NULL REFERENCES enquiries(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  quotation_id uuid NOT NULL REFERENCES quotations(id),
  revision_id uuid NOT NULL REFERENCES quotation_revisions(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  event_type_id uuid REFERENCES event_types(id),
  event_type_name text NOT NULL,
  event_name text NOT NULL,
  event_date date,
  start_time time,
  end_time time,
  venue_name text,
  venue_address text,
  maps_location_placeholder text,
  guest_count integer CHECK (guest_count IS NULL OR guest_count > 0),
  budget_amount numeric(14, 2) NOT NULL CHECK (budget_amount >= 0),
  advance_paid numeric(14, 2) NOT NULL CHECK (advance_paid >= 0),
  pending_amount numeric(14, 2) NOT NULL CHECK (pending_amount >= 0),
  assigned_manager_user_id uuid REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'booking_confirmed'
    CHECK (
      status IN (
        'created',
        'planning',
        'requirements_confirmed',
        'quotation_approved',
        'booking_confirmed',
        'manager_assigned',
        'vendor_assigned',
        'worker_assigned',
        'preparation',
        'ready',
        'event_running',
        'completed',
        'settlement_pending',
        'closed',
        'cancelled'
      )
    ),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,
  -- Extension point for future vendor / worker / inventory links (no modules yet).
  extension_points jsonb NOT NULL DEFAULT jsonb_build_object(
    'assignedVendorIds', '[]'::jsonb,
    'assignedWorkerIds', '[]'::jsonb,
    'inventoryAllocationIds', '[]'::jsonb
  ),
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_records_branch_status_idx
  ON event_records (branch_id, status, created_at DESC);
CREATE INDEX event_records_customer_idx
  ON event_records (customer_id, created_at DESC);
CREATE INDEX event_records_event_date_idx
  ON event_records (event_date);
CREATE INDEX event_records_manager_idx
  ON event_records (assigned_manager_user_id)
  WHERE assigned_manager_user_id IS NOT NULL;

-- Immutable operational timeline (append-only).
CREATE TABLE event_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  actor_user_id uuid REFERENCES app_users(id),
  entry_type text NOT NULL
    CHECK (
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
        'milestone'
      )
    ),
  title text NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_timelines_event_idx
  ON event_timelines (event_record_id, occurred_at DESC);

CREATE TABLE event_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'customer')),
  content text NOT NULL,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_notes_event_idx
  ON event_notes (event_record_id, created_at DESC);

-- Edit history for notes (append-only revisions).
CREATE TABLE event_note_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES event_notes(id),
  content text NOT NULL,
  revised_by_user_id uuid REFERENCES app_users(id),
  revised_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_note_revisions_note_idx
  ON event_note_revisions (note_id, revised_at DESC);

CREATE TABLE event_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  doc_type text NOT NULL DEFAULT 'attachment_placeholder'
    CHECK (doc_type IN ('attachment_placeholder', 'photo_placeholder')),
  storage_key text,
  file_name text,
  visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'customer')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'failed')),
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_documents_event_idx
  ON event_documents (event_record_id, created_at DESC);

CREATE TABLE event_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  from_status text,
  to_status text NOT NULL,
  actor_user_id uuid REFERENCES app_users(id),
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_status_history_event_idx
  ON event_status_history (event_record_id, occurred_at DESC);

CREATE TABLE event_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  actor_user_id uuid REFERENCES app_users(id),
  activity_type text NOT NULL
    CHECK (
      activity_type IN (
        'created',
        'updated',
        'status_change',
        'note',
        'document',
        'assignment_placeholder',
        'payment',
        'milestone'
      )
    ),
  content text,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_activities_event_idx
  ON event_activities (event_record_id, occurred_at DESC);

CREATE TRIGGER event_records_set_updated_at
  BEFORE UPDATE ON event_records
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_notes_set_updated_at
  BEFORE UPDATE ON event_notes
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_documents_set_updated_at
  BEFORE UPDATE ON event_documents
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
