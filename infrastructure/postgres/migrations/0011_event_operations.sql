BEGIN;

-- Slice 11: Operations (Event Execution) Foundation
-- Extends existing event_tasks; adds assignment, attendance, issues,
-- photos, material usage, progress aggregate, and completion gates.
-- Soft lifecycle only — never hard-delete. Anchored on event_records.

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
      'worker_note_added',
      'inventory_reserved',
      'inventory_allocated',
      'inventory_dispatched',
      'inventory_on_site',
      'inventory_returned',
      'inventory_damage_reported',
      'inventory_maintenance_started',
      'inventory_note_added',
      'finance_payment_recorded',
      'finance_refund_recorded',
      'finance_expense_added',
      'finance_vendor_settlement',
      'finance_worker_payout',
      'finance_invoice_issued',
      'finance_receipt_issued',
      'finance_summary_updated',
      'ops_task_created',
      'ops_task_updated',
      'ops_task_assigned',
      'ops_task_progress',
      'ops_task_completed',
      'ops_attendance_check_in',
      'ops_attendance_check_out',
      'ops_issue_created',
      'ops_issue_updated',
      'ops_photo_uploaded',
      'ops_material_recorded',
      'ops_progress_recalculated',
      'ops_completion_ready',
      'ops_event_completed'
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
      'worker_note',
      'inventory_allocation',
      'inventory_movement',
      'inventory_damage',
      'inventory_maintenance',
      'inventory_note',
      'finance_payment',
      'finance_settlement',
      'finance_expense',
      'finance_payout',
      'finance_document',
      'ops_task',
      'ops_assignment',
      'ops_attendance',
      'ops_issue',
      'ops_photo',
      'ops_material',
      'ops_progress',
      'ops_completion'
    )
  );

-- Extend existing event_tasks for operations fields (manager module remains compatible).
ALTER TABLE event_tasks
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

ALTER TABLE event_tasks
  DROP CONSTRAINT IF EXISTS event_tasks_category_check;
ALTER TABLE event_tasks
  ADD CONSTRAINT event_tasks_category_check CHECK (
    category IN (
      'stage_setup',
      'decorations',
      'catering',
      'photography',
      'dj',
      'welcome',
      'food_service',
      'cleanup',
      'other'
    )
  );

ALTER TABLE event_tasks
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE event_tasks
  DROP CONSTRAINT IF EXISTS event_tasks_completion_percent_check;
ALTER TABLE event_tasks
  ADD CONSTRAINT event_tasks_completion_percent_check CHECK (
    completion_percent >= 0 AND completion_percent <= 100
  );

CREATE INDEX IF NOT EXISTS event_tasks_category_idx
  ON event_tasks (event_record_id, category, status);

CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES event_tasks(id),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  assignee_type text NOT NULL
    CHECK (assignee_type IN ('manager', 'supervisor', 'vendor', 'worker')),
  manager_user_id uuid REFERENCES app_users(id),
  supervisor_user_id uuid REFERENCES app_users(id),
  vendor_id uuid REFERENCES vendors(id),
  worker_id uuid REFERENCES workers(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'released', 'completed')),
  notes text,
  assigned_by_user_id uuid REFERENCES app_users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (
    (assignee_type = 'manager' AND manager_user_id IS NOT NULL)
    OR (assignee_type = 'supervisor' AND supervisor_user_id IS NOT NULL)
    OR (assignee_type = 'vendor' AND vendor_id IS NOT NULL)
    OR (assignee_type = 'worker' AND worker_id IS NOT NULL)
  )
);

CREATE INDEX task_assignments_task_idx
  ON task_assignments (task_id, status, assigned_at DESC);
CREATE INDEX task_assignments_event_idx
  ON task_assignments (event_record_id, status, assigned_at DESC);
CREATE INDEX task_assignments_worker_idx
  ON task_assignments (worker_id, status)
  WHERE worker_id IS NOT NULL;
CREATE INDEX task_assignments_vendor_idx
  ON task_assignments (vendor_id, status)
  WHERE vendor_id IS NOT NULL;

CREATE UNIQUE INDEX task_assignments_active_manager_uniq
  ON task_assignments (task_id)
  WHERE status = 'active' AND assignee_type = 'manager';

CREATE UNIQUE INDEX task_assignments_active_supervisor_uniq
  ON task_assignments (task_id)
  WHERE status = 'active' AND assignee_type = 'supervisor';

CREATE UNIQUE INDEX task_assignments_active_vendor_uniq
  ON task_assignments (task_id)
  WHERE status = 'active' AND assignee_type = 'vendor';

CREATE UNIQUE INDEX task_assignments_active_worker_uniq
  ON task_assignments (task_id, worker_id)
  WHERE status = 'active' AND assignee_type = 'worker' AND worker_id IS NOT NULL;

CREATE TABLE attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  worker_id uuid NOT NULL REFERENCES workers(id),
  task_id uuid REFERENCES event_tasks(id),
  check_in_at timestamptz,
  check_out_at timestamptz,
  gps_placeholder text,
  working_minutes integer CHECK (working_minutes IS NULL OR working_minutes >= 0),
  status text NOT NULL DEFAULT 'checked_in'
    CHECK (status IN ('checked_in', 'checked_out', 'absent', 'finalized')),
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX attendance_logs_event_idx
  ON attendance_logs (event_record_id, status, created_at DESC);
CREATE INDEX attendance_logs_worker_idx
  ON attendance_logs (worker_id, status, check_in_at DESC);
CREATE UNIQUE INDEX attendance_logs_open_worker_uniq
  ON attendance_logs (event_record_id, worker_id)
  WHERE status = 'checked_in';

CREATE TABLE event_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL UNIQUE REFERENCES event_records(id),
  total_tasks integer NOT NULL DEFAULT 0 CHECK (total_tasks >= 0),
  completed_tasks integer NOT NULL DEFAULT 0 CHECK (completed_tasks >= 0),
  pending_tasks integer NOT NULL DEFAULT 0 CHECK (pending_tasks >= 0),
  overall_completion_percent integer NOT NULL DEFAULT 0
    CHECK (overall_completion_percent >= 0 AND overall_completion_percent <= 100),
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_progress_status_idx
  ON event_progress (status, updated_at DESC);

CREATE TABLE event_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  task_id uuid REFERENCES event_tasks(id),
  issue_type text NOT NULL DEFAULT 'other'
    CHECK (
      issue_type IN (
        'vendor_late',
        'material_missing',
        'equipment_failure',
        'rain',
        'staff_absent',
        'emergency',
        'other'
      )
    ),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open'
    CHECK (
      status IN (
        'open',
        'acknowledged',
        'in_progress',
        'resolved',
        'closed'
      )
    ),
  description text NOT NULL,
  attachment_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  reported_by_user_id uuid REFERENCES app_users(id),
  reported_by_role text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_issues_event_idx
  ON event_issues (event_record_id, status, created_at DESC);
CREATE INDEX event_issues_priority_idx
  ON event_issues (priority, status, created_at DESC)
  WHERE status NOT IN ('resolved', 'closed');

CREATE TABLE event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  task_id uuid REFERENCES event_tasks(id),
  category text NOT NULL
    CHECK (category IN ('before', 'during', 'after', 'completion_proof')),
  storage_key text,
  caption text,
  uploaded_by_user_id uuid REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'verified', 'rejected', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_photos_event_idx
  ON event_photos (event_record_id, category, created_at DESC);
CREATE INDEX event_photos_completion_idx
  ON event_photos (event_record_id)
  WHERE category = 'completion_proof' AND status = 'uploaded';

CREATE TABLE material_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  inventory_item_id uuid REFERENCES inventory_items(id),
  allocation_id uuid REFERENCES inventory_allocations(id),
  item_label text NOT NULL,
  quantity_issued numeric(14, 2) NOT NULL DEFAULT 0
    CHECK (quantity_issued >= 0),
  quantity_used numeric(14, 2) NOT NULL DEFAULT 0
    CHECK (quantity_used >= 0),
  quantity_returned numeric(14, 2) NOT NULL DEFAULT 0
    CHECK (quantity_returned >= 0),
  quantity_damaged numeric(14, 2) NOT NULL DEFAULT 0
    CHECK (quantity_damaged >= 0),
  quantity_lost numeric(14, 2) NOT NULL DEFAULT 0
    CHECK (quantity_lost >= 0),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'finalized')),
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX material_usage_event_idx
  ON material_usage (event_record_id, status, created_at DESC);
CREATE INDEX material_usage_item_idx
  ON material_usage (inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;

CREATE TABLE event_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL UNIQUE REFERENCES event_records(id),
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'ready', 'completed', 'blocked')),
  mandatory_tasks_complete boolean NOT NULL DEFAULT false,
  attendance_finalized boolean NOT NULL DEFAULT false,
  materials_finalized boolean NOT NULL DEFAULT false,
  final_photos_uploaded boolean NOT NULL DEFAULT false,
  checklist_finished boolean NOT NULL DEFAULT false,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  completed_at timestamptz,
  completed_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_completion_status_idx
  ON event_completion (status, updated_at DESC);

CREATE TRIGGER task_assignments_set_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER attendance_logs_set_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_progress_set_updated_at
  BEFORE UPDATE ON event_progress
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_issues_set_updated_at
  BEFORE UPDATE ON event_issues
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_photos_set_updated_at
  BEFORE UPDATE ON event_photos
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER material_usage_set_updated_at
  BEFORE UPDATE ON material_usage
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_completion_set_updated_at
  BEFORE UPDATE ON event_completion
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
