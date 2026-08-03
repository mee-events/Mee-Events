BEGIN;

-- Pattern B consistency: module-owned timeline + activity tables for
-- Vendor / Worker / Inventory / Finance / Operations.
-- Additive only. Existing event_timelines / event_activities remain the
-- event-anchored narrative; these tables own module-scoped history.

-- ── Vendor ──────────────────────────────────────────────────────────────────

CREATE TABLE vendor_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  actor_user_id uuid REFERENCES app_users(id),
  entry_type text NOT NULL
    CHECK (
      entry_type IN (
        'created',
        'updated',
        'vendor_assigned',
        'vendor_accepted',
        'vendor_rejected',
        'vendor_progress_updated',
        'vendor_completed',
        'vendor_note_added',
        'status_changed',
        'note_added',
        'milestone'
      )
    ),
  title text NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendor_timelines_vendor_idx
  ON vendor_timelines (vendor_id, occurred_at DESC);

CREATE TABLE vendor_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  actor_user_id uuid REFERENCES app_users(id),
  activity_type text NOT NULL
    CHECK (
      activity_type IN (
        'created',
        'updated',
        'status_change',
        'note',
        'vendor_assignment',
        'vendor_progress',
        'vendor_note',
        'milestone'
      )
    ),
  content text,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendor_activities_vendor_idx
  ON vendor_activities (vendor_id, occurred_at DESC);

-- ── Worker ──────────────────────────────────────────────────────────────────

CREATE TABLE worker_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  actor_user_id uuid REFERENCES app_users(id),
  entry_type text NOT NULL
    CHECK (
      entry_type IN (
        'created',
        'updated',
        'worker_assigned',
        'worker_accepted',
        'worker_rejected',
        'worker_checked_in',
        'worker_progress_updated',
        'worker_checked_out',
        'worker_task_completed',
        'worker_note_added',
        'status_changed',
        'note_added',
        'milestone'
      )
    ),
  title text NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX worker_timelines_worker_idx
  ON worker_timelines (worker_id, occurred_at DESC);

CREATE TABLE worker_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id),
  actor_user_id uuid REFERENCES app_users(id),
  activity_type text NOT NULL
    CHECK (
      activity_type IN (
        'created',
        'updated',
        'status_change',
        'note',
        'worker_assignment',
        'worker_attendance',
        'worker_progress',
        'worker_note',
        'milestone'
      )
    ),
  content text,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX worker_activities_worker_idx
  ON worker_activities (worker_id, occurred_at DESC);

-- ── Inventory ───────────────────────────────────────────────────────────────

CREATE TABLE inventory_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  actor_user_id uuid REFERENCES app_users(id),
  entry_type text NOT NULL
    CHECK (
      entry_type IN (
        'created',
        'updated',
        'inventory_reserved',
        'inventory_allocated',
        'inventory_dispatched',
        'inventory_on_site',
        'inventory_returned',
        'inventory_cancelled',
        'inventory_damage_reported',
        'inventory_maintenance_started',
        'inventory_note_added',
        'status_changed',
        'note_added',
        'milestone'
      )
    ),
  title text NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_timelines_item_idx
  ON inventory_timelines (item_id, occurred_at DESC);

CREATE TABLE inventory_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  actor_user_id uuid REFERENCES app_users(id),
  activity_type text NOT NULL
    CHECK (
      activity_type IN (
        'created',
        'updated',
        'status_change',
        'note',
        'inventory_allocation',
        'inventory_movement',
        'inventory_damage',
        'inventory_maintenance',
        'inventory_note',
        'milestone'
      )
    ),
  content text,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_activities_item_idx
  ON inventory_activities (item_id, occurred_at DESC);

-- ── Finance (event-anchored aggregate) ──────────────────────────────────────

CREATE TABLE finance_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  actor_user_id uuid REFERENCES app_users(id),
  entry_type text NOT NULL
    CHECK (
      entry_type IN (
        'created',
        'updated',
        'finance_payment_recorded',
        'finance_refund_recorded',
        'finance_expense_added',
        'finance_vendor_settlement',
        'finance_worker_payout',
        'finance_invoice_issued',
        'finance_receipt_issued',
        'finance_summary_updated',
        'status_changed',
        'note_added',
        'milestone'
      )
    ),
  title text NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX finance_timelines_event_idx
  ON finance_timelines (event_record_id, occurred_at DESC);

CREATE TABLE finance_activities (
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
        'finance_payment',
        'finance_settlement',
        'finance_expense',
        'finance_payout',
        'finance_document',
        'milestone'
      )
    ),
  content text,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX finance_activities_event_idx
  ON finance_activities (event_record_id, occurred_at DESC);

-- ── Operations (event-anchored aggregate) ───────────────────────────────────

CREATE TABLE operations_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  actor_user_id uuid REFERENCES app_users(id),
  entry_type text NOT NULL
    CHECK (
      entry_type IN (
        'created',
        'updated',
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
        'ops_event_completed',
        'status_changed',
        'note_added',
        'milestone'
      )
    ),
  title text NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX operations_timelines_event_idx
  ON operations_timelines (event_record_id, occurred_at DESC);

CREATE TABLE operations_activities (
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
        'ops_task',
        'ops_assignment',
        'ops_attendance',
        'ops_issue',
        'ops_photo',
        'ops_material',
        'ops_progress',
        'ops_completion',
        'milestone'
      )
    ),
  content text,
  customer_visible boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX operations_activities_event_idx
  ON operations_activities (event_record_id, occurred_at DESC);

COMMIT;
