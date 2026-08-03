BEGIN;

-- Pattern B extension: inventory allocation cancellation is an event-linked
-- lifecycle transition and must participate in event_timelines / outbox topics
-- consistently with reserve → allocate → dispatch → return.

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
      'inventory_cancelled',
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

COMMIT;
