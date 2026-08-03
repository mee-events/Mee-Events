BEGIN;

-- Slice 6: Manager Operations Foundation
-- Extends Event Record with manager assignment, tasks, and daily progress.
-- Never hard-delete; soft lifecycle via status columns only.

-- Widen event timeline / activity enums for manager ops (additive).
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
      'manager_reassigned'
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
      'progress'
    )
  );

CREATE TABLE event_manager_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  manager_user_id uuid NOT NULL REFERENCES app_users(id),
  assigned_by_user_id uuid REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reassigned', 'released', 'completed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  manager_notes text,
  internal_notes text,
  expected_completion_date date,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX event_manager_assignments_active_uniq
  ON event_manager_assignments (event_record_id)
  WHERE status = 'active';

CREATE INDEX event_manager_assignments_manager_idx
  ON event_manager_assignments (manager_user_id, status, assigned_at DESC);

CREATE INDEX event_manager_assignments_event_idx
  ON event_manager_assignments (event_record_id, assigned_at DESC);

CREATE TABLE event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'planning',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),
  -- Future vendor/worker assignment extension point.
  assigned_to_user_id uuid REFERENCES app_users(id),
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  actual_minutes integer CHECK (actual_minutes IS NULL OR actual_minutes >= 0),
  due_at timestamptz,
  completed_at timestamptz,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_tasks_event_status_idx
  ON event_tasks (event_record_id, status, due_at NULLS LAST);

CREATE INDEX event_tasks_assignee_idx
  ON event_tasks (assigned_to_user_id, status)
  WHERE assigned_to_user_id IS NOT NULL;

CREATE INDEX event_tasks_due_idx
  ON event_tasks (due_at)
  WHERE status NOT IN ('completed', 'cancelled') AND due_at IS NOT NULL;

CREATE TABLE event_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES event_tasks(id),
  content text NOT NULL,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_task_comments_task_idx
  ON event_task_comments (task_id, created_at DESC);

-- Append-only task change history.
CREATE TABLE event_task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES event_tasks(id),
  actor_user_id uuid REFERENCES app_users(id),
  change_type text NOT NULL
    CHECK (
      change_type IN (
        'created',
        'updated',
        'status_changed',
        'completed',
        'cancelled',
        'comment_added'
      )
    ),
  from_status text,
  to_status text,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_task_history_task_idx
  ON event_task_history (task_id, occurred_at DESC);

CREATE TABLE event_progress_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  update_kind text NOT NULL
    CHECK (
      update_kind IN (
        'morning',
        'afternoon',
        'evening',
        'completion_summary'
      )
    ),
  summary text NOT NULL,
  blockers text,
  next_steps text,
  percent_complete integer
    CHECK (percent_complete IS NULL OR (percent_complete >= 0 AND percent_complete <= 100)),
  -- Foundation placeholders for media (no storage integration yet).
  photo_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachment_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_date date NOT NULL DEFAULT (timezone('Asia/Kolkata', now()))::date,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_progress_updates_event_idx
  ON event_progress_updates (event_record_id, report_date DESC, created_at DESC);

CREATE UNIQUE INDEX event_progress_updates_kind_day_uniq
  ON event_progress_updates (event_record_id, report_date, update_kind);

CREATE TABLE event_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  report_date date NOT NULL,
  morning_progress_id uuid REFERENCES event_progress_updates(id),
  afternoon_progress_id uuid REFERENCES event_progress_updates(id),
  evening_progress_id uuid REFERENCES event_progress_updates(id),
  completion_progress_id uuid REFERENCES event_progress_updates(id),
  overall_summary text,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (event_record_id, report_date)
);

CREATE INDEX event_daily_reports_event_idx
  ON event_daily_reports (event_record_id, report_date DESC);

CREATE TRIGGER event_manager_assignments_set_updated_at
  BEFORE UPDATE ON event_manager_assignments
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_tasks_set_updated_at
  BEFORE UPDATE ON event_tasks
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_progress_updates_set_updated_at
  BEFORE UPDATE ON event_progress_updates
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_daily_reports_set_updated_at
  BEFORE UPDATE ON event_daily_reports
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
