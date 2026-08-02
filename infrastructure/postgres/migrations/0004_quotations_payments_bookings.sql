BEGIN;

CREATE TABLE quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  enquiry_id uuid NOT NULL REFERENCES enquiries(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  reference_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'sent',
        'revision_requested',
        'approved',
        'rejected',
        'expired',
        'superseded'
      )
    ),
  current_revision_id uuid,
  owner_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (lead_id)
);

CREATE INDEX quotations_branch_status_idx
  ON quotations (branch_id, status, created_at DESC);
CREATE INDEX quotations_customer_idx
  ON quotations (customer_id, created_at DESC);
CREATE INDEX quotations_enquiry_idx
  ON quotations (enquiry_id);

CREATE TABLE quotation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id),
  revision_number integer NOT NULL CHECK (revision_number > 0),
  reason text NOT NULL DEFAULT 'initial'
    CHECK (reason IN ('initial', 'employee_revise', 'customer_request')),
  subtotal numeric(14, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  discount_percent numeric(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  gst_percent numeric(5, 2) NOT NULL DEFAULT 18 CHECK (gst_percent >= 0 AND gst_percent <= 100),
  gst_amount numeric(14, 2) NOT NULL CHECK (gst_amount >= 0),
  final_amount numeric(14, 2) NOT NULL CHECK (final_amount >= 0),
  advance_percent numeric(5, 2) NOT NULL DEFAULT 30 CHECK (advance_percent > 0 AND advance_percent <= 100),
  advance_amount numeric(14, 2) NOT NULL CHECK (advance_amount >= 0),
  valid_until date,
  terms text,
  internal_notes text,
  customer_notes text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, revision_number)
);

CREATE INDEX quotation_revisions_quotation_idx
  ON quotation_revisions (quotation_id, revision_number DESC);

ALTER TABLE quotations
  ADD CONSTRAINT quotations_current_revision_fk
  FOREIGN KEY (current_revision_id) REFERENCES quotation_revisions(id);

CREATE TABLE quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES quotation_revisions(id),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  item_type text NOT NULL DEFAULT 'custom'
    CHECK (item_type IN ('package', 'service', 'product', 'custom')),
  title text NOT NULL,
  description text,
  quantity numeric(12, 2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14, 2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(14, 2) NOT NULL CHECK (line_total >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quotation_items_revision_idx
  ON quotation_items (revision_id, sort_order);

CREATE TABLE quotation_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id),
  actor_user_id uuid REFERENCES app_users(id),
  activity_type text NOT NULL
    CHECK (
      activity_type IN (
        'created',
        'updated',
        'sent',
        'revised',
        'revision_requested',
        'approved',
        'rejected',
        'note',
        'status_change'
      )
    ),
  content text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quotation_activities_quotation_idx
  ON quotation_activities (quotation_id, occurred_at DESC);

CREATE TABLE quotation_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id),
  revision_id uuid REFERENCES quotation_revisions(id),
  doc_type text NOT NULL DEFAULT 'pdf_placeholder'
    CHECK (doc_type IN ('pdf_placeholder')),
  storage_key text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX quotation_documents_quotation_idx
  ON quotation_documents (quotation_id, created_at DESC);

CREATE TABLE payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL UNIQUE REFERENCES quotations(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  total_amount numeric(14, 2) NOT NULL CHECK (total_amount >= 0),
  advance_amount numeric(14, 2) NOT NULL CHECK (advance_amount >= 0),
  balance_amount numeric(14, 2) NOT NULL CHECK (balance_amount >= 0),
  currency_code char(3) NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id uuid NOT NULL REFERENCES payment_plans(id),
  quotation_id uuid NOT NULL REFERENCES quotations(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  kind text NOT NULL
    CHECK (kind IN ('advance', 'balance', 'refund')),
  method text NOT NULL
    CHECK (method IN ('cash', 'upi', 'bank_transfer')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  reference_code text NOT NULL UNIQUE,
  notes text,
  recorded_by_user_id uuid REFERENCES app_users(id),
  confirmed_by_user_id uuid REFERENCES app_users(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX payments_plan_idx ON payments (payment_plan_id, created_at DESC);
CREATE INDEX payments_customer_idx ON payments (customer_id, created_at DESC);
CREATE INDEX payments_quotation_idx ON payments (quotation_id);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  booking_number text NOT NULL UNIQUE,
  enquiry_id uuid NOT NULL REFERENCES enquiries(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  quotation_id uuid NOT NULL UNIQUE REFERENCES quotations(id),
  revision_id uuid NOT NULL REFERENCES quotation_revisions(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled')),
  final_amount numeric(14, 2) NOT NULL CHECK (final_amount >= 0),
  advance_paid numeric(14, 2) NOT NULL CHECK (advance_paid >= 0),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX bookings_customer_idx ON bookings (customer_id, created_at DESC);
CREATE INDEX bookings_branch_status_idx
  ON bookings (branch_id, status, created_at DESC);

CREATE TABLE booking_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  actor_user_id uuid REFERENCES app_users(id),
  activity_type text NOT NULL
    CHECK (activity_type IN ('created', 'confirmed', 'cancelled', 'note', 'status_change')),
  content text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_activities_booking_idx
  ON booking_activities (booking_id, occurred_at DESC);

CREATE TRIGGER quotations_set_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER quotation_documents_set_updated_at
  BEFORE UPDATE ON quotation_documents
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER payment_plans_set_updated_at
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
