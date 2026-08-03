BEGIN;

-- Slice 10: Finance & Settlement Foundation
-- All finance is anchored on event_records — never directly on customers.
-- Existing payments/payment_plans (quotation advance) remain untouched;
-- finance.customer_payments may optionally reference them via source_payment_id.
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
      'finance_summary_updated'
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
      'finance_document'
    )
  );

CREATE TABLE finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  account_code text NOT NULL UNIQUE,
  name text NOT NULL,
  account_type text NOT NULL
    CHECK (
      account_type IN (
        'cash',
        'bank',
        'upi',
        'receivable',
        'payable',
        'expense',
        'revenue'
      )
    ),
  currency_code char(3) NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX finance_accounts_branch_idx
  ON finance_accounts (branch_id, status);

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  code text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, code)
);

CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  code text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, code)
);

CREATE TABLE event_financial_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL UNIQUE REFERENCES event_records(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  currency_code char(3) NOT NULL DEFAULT 'INR',
  budget_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
  revenue_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (revenue_amount >= 0),
  advance_received numeric(14, 2) NOT NULL DEFAULT 0 CHECK (advance_received >= 0),
  balance_pending numeric(14, 2) NOT NULL DEFAULT 0,
  vendor_cost numeric(14, 2) NOT NULL DEFAULT 0 CHECK (vendor_cost >= 0),
  worker_cost numeric(14, 2) NOT NULL DEFAULT 0 CHECK (worker_cost >= 0),
  inventory_cost numeric(14, 2) NOT NULL DEFAULT 0 CHECK (inventory_cost >= 0),
  other_expenses numeric(14, 2) NOT NULL DEFAULT 0 CHECK (other_expenses >= 0),
  total_expense numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_expense >= 0),
  profit_amount numeric(14, 2) NOT NULL DEFAULT 0,
  loss_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (loss_amount >= 0),
  settlement_status text NOT NULL DEFAULT 'open'
    CHECK (
      settlement_status IN (
        'open',
        'partially_settled',
        'settled',
        'closed'
      )
    ),
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_financial_summary_branch_idx
  ON event_financial_summary (branch_id, settlement_status);

CREATE TABLE customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  source_payment_id uuid REFERENCES payments(id),
  payment_kind text NOT NULL
    CHECK (
      payment_kind IN (
        'advance',
        'balance',
        'partial',
        'refund',
        'cancelled'
      )
    ),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency_code char(3) NOT NULL DEFAULT 'INR',
  method_code text NOT NULL DEFAULT 'upi',
  status text NOT NULL DEFAULT 'recorded'
    CHECK (
      status IN (
        'pending',
        'recorded',
        'confirmed',
        'cancelled',
        'refunded'
      )
    ),
  reference_code text NOT NULL UNIQUE,
  notes text,
  recorded_by_user_id uuid REFERENCES app_users(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX customer_payments_event_idx
  ON customer_payments (event_record_id, created_at DESC);

CREATE TABLE customer_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  customer_payment_id uuid REFERENCES customer_payments(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  reason text NOT NULL,
  reference_code text NOT NULL UNIQUE,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX customer_refunds_event_idx
  ON customer_refunds (event_record_id, created_at DESC);

CREATE TABLE vendor_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  bill_number text NOT NULL UNIQUE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'partially_paid', 'paid', 'cancelled')),
  description text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendor_bills_event_idx
  ON vendor_bills (event_record_id, created_at DESC);
CREATE INDEX vendor_bills_vendor_idx
  ON vendor_bills (vendor_id, status);

CREATE TABLE vendor_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  vendor_bill_id uuid REFERENCES vendor_bills(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'partially_paid',
        'paid',
        'cancelled'
      )
    ),
  reference_code text NOT NULL UNIQUE,
  notes text,
  settled_by_user_id uuid REFERENCES app_users(id),
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX vendor_settlements_event_idx
  ON vendor_settlements (event_record_id, created_at DESC);
CREATE INDEX vendor_settlements_vendor_idx
  ON vendor_settlements (vendor_id, status);

CREATE TABLE worker_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  worker_id uuid NOT NULL REFERENCES workers(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'approved',
        'paid',
        'cancelled'
      )
    ),
  reference_code text NOT NULL UNIQUE,
  notes text,
  approved_by_user_id uuid REFERENCES app_users(id),
  paid_at timestamptz,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX worker_payouts_event_idx
  ON worker_payouts (event_record_id, created_at DESC);
CREATE INDEX worker_payouts_worker_idx
  ON worker_payouts (worker_id, status);

CREATE TABLE event_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  category_id uuid REFERENCES expense_categories(id),
  expense_type text NOT NULL DEFAULT 'other'
    CHECK (
      expense_type IN (
        'vendor',
        'worker',
        'inventory',
        'other'
      )
    ),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('recorded', 'approved', 'cancelled')),
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX event_expenses_event_idx
  ON event_expenses (event_record_id, created_at DESC);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  invoice_number text NOT NULL UNIQUE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'issued',
        'paid',
        'cancelled'
      )
    ),
  issued_at timestamptz,
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX invoices_event_idx
  ON invoices (event_record_id, created_at DESC);

CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  customer_payment_id uuid REFERENCES customer_payments(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  receipt_number text NOT NULL UNIQUE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'void')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX receipts_event_idx
  ON receipts (event_record_id, created_at DESC);

CREATE TABLE finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  account_id uuid REFERENCES finance_accounts(id),
  transaction_type text NOT NULL
    CHECK (
      transaction_type IN (
        'customer_payment',
        'customer',
        'vendor_settlement',
        'worker_payout',
        'expense',
        'adjustment'
      )
    ),
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  reference_code text NOT NULL,
  description text,
  related_entity_type text,
  related_entity_id uuid,
  created_by_user_id uuid REFERENCES app_users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX finance_transactions_event_idx
  ON finance_transactions (event_record_id, occurred_at DESC);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  account_id uuid REFERENCES finance_accounts(id),
  transaction_id uuid REFERENCES finance_transactions(id),
  entry_side text NOT NULL CHECK (entry_side IN ('debit', 'credit')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_by_user_id uuid REFERENCES app_users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ledger_entries_event_idx
  ON ledger_entries (event_record_id, occurred_at DESC);
CREATE INDEX ledger_entries_account_idx
  ON ledger_entries (account_id, occurred_at DESC)
  WHERE account_id IS NOT NULL;

CREATE TRIGGER finance_accounts_set_updated_at
  BEFORE UPDATE ON finance_accounts
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_financial_summary_set_updated_at
  BEFORE UPDATE ON event_financial_summary
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER customer_payments_set_updated_at
  BEFORE UPDATE ON customer_payments
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER customer_refunds_set_updated_at
  BEFORE UPDATE ON customer_refunds
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_bills_set_updated_at
  BEFORE UPDATE ON vendor_bills
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER vendor_settlements_set_updated_at
  BEFORE UPDATE ON vendor_settlements
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER worker_payouts_set_updated_at
  BEFORE UPDATE ON worker_payouts
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER event_expenses_set_updated_at
  BEFORE UPDATE ON event_expenses
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER receipts_set_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

-- Seed defaults for Hyderabad branch
INSERT INTO finance_accounts (branch_id, account_code, name, account_type)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'ACC-CASH', 'Petty Cash', 'cash'),
  ('00000000-0000-4000-8000-000000000001', 'ACC-BANK', 'Primary Bank', 'bank'),
  ('00000000-0000-4000-8000-000000000001', 'ACC-UPI', 'UPI Collections', 'upi')
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO payment_methods (branch_id, code, display_name)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'cash', 'Cash'),
  ('00000000-0000-4000-8000-000000000001', 'upi', 'UPI'),
  ('00000000-0000-4000-8000-000000000001', 'bank_transfer', 'Bank Transfer')
ON CONFLICT (branch_id, code) DO NOTHING;

INSERT INTO expense_categories (branch_id, code, display_name)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'vendor', 'Vendor cost'),
  ('00000000-0000-4000-8000-000000000001', 'worker', 'Worker cost'),
  ('00000000-0000-4000-8000-000000000001', 'inventory', 'Inventory cost'),
  ('00000000-0000-4000-8000-000000000001', 'other', 'Other expense')
ON CONFLICT (branch_id, code) DO NOTHING;

COMMIT;
