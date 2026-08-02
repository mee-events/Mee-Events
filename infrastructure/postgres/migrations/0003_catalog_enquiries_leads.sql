BEGIN;

-- Catalogue foundation (docs/product/catalog-taxonomy-v1.md).
-- Managed data, never hard-coded application enums.

CREATE TABLE event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  source_alias text,
  description text,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  source_alias text,
  description text,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

-- Event-type seeds from the 21-entry source index (entries 1-11 and 18).
INSERT INTO event_types (code, display_name, source_alias, display_order) VALUES
  ('engagement', 'Engagement', 'Engagement ceremony', 1),
  ('pre_wedding', 'Pre-wedding', 'Pre-wedding events', 2),
  ('mehndi', 'Mehndi', 'Mehndi events', 3),
  ('sangeet', 'Sangeet', 'Sangeet events and decor', 4),
  ('wedding', 'Wedding', 'Wedding event services', 5),
  ('reception', 'Reception', 'Reception event services', 6),
  ('half_saree_dhoti', 'Half-saree and dhoti ceremony', 'Half-saree and dhoti ceremony', 7),
  ('birthday', 'Birthday party', 'Birthday party event', 8),
  ('cradle_ceremony', 'Cradle ceremony', 'Cradle ceremony', 9),
  ('house_warming', 'House-warming', 'House-warming ceremony', 10),
  ('festival', 'Festival event', 'Festival event services', 11),
  ('corporate', 'Corporate event', 'Corporate events and party organization', 12);

-- Service-department seeds from the 21-entry source index (entries 12-17 and 19-21).
INSERT INTO service_categories (code, display_name, source_alias, display_order) VALUES
  ('catering', 'Catering and manpower', 'Catering services and manpower', 1),
  ('sound_lighting', 'Sound and lighting', 'Sound and lighting services', 2),
  ('photography', 'Photography and videography', 'Photography and videography', 3),
  ('decoration', 'Event decoration', 'Event decoration services', 4),
  ('venue', 'Event venues', 'Event venue services', 5),
  ('tent_house', 'Tent-house supply', 'Tent-house material supply', 6),
  ('advertising', 'Advertising and promotions', 'Advertising and promotions', 7),
  ('event_material', 'Event material and equipment', 'Event material and equipment store', 8),
  ('fibre_decoration', 'Fibre decoration', 'Fibre decoration manufacturing', 9);

-- Customer profile extension of app_users.

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES app_users(id),
  display_name text,
  contact_preference text NOT NULL DEFAULT 'phone'
    CHECK (contact_preference IN ('phone', 'whatsapp', 'email')),
  default_city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

-- Customer enquiries with customer-visible statuses
-- (docs/product/mobile-application-architecture-v1.md).
-- service_requirements holds a captured snapshot; normalized enquiry_items
-- arrive with catalogue listings in a later slice.

CREATE TABLE enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  event_type_id uuid NOT NULL REFERENCES event_types(id),
  reference_code text NOT NULL UNIQUE,
  event_date date,
  location text,
  guest_count integer CHECK (guest_count > 0),
  budget_min numeric(12, 2) CHECK (budget_min >= 0),
  budget_max numeric(12, 2) CHECK (budget_max >= 0),
  notes text,
  service_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_preference text NOT NULL DEFAULT 'phone'
    CHECK (contact_preference IN ('phone', 'whatsapp', 'email')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (
      status IN (
        'draft',
        'submitted',
        'received',
        'contact_pending',
        'in_discussion',
        'proposal_expected',
        'closed',
        'cancelled'
      )
    ),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX enquiries_customer_idx
  ON enquiries (customer_id, created_at DESC);

CREATE INDEX enquiries_branch_status_idx
  ON enquiries (branch_id, status);

-- CRM leads. Every submitted enquiry creates exactly one lead.

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  enquiry_id uuid UNIQUE REFERENCES enquiries(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  source text NOT NULL DEFAULT 'mobile_app'
    CHECK (
      source IN ('mobile_app', 'walk_in', 'phone', 'referral', 'campaign', 'other')
    ),
  status text NOT NULL DEFAULT 'new'
    CHECK (
      status IN (
        'new',
        'claimed',
        'contacted',
        'qualified',
        'quoted',
        'converted',
        'lost',
        'closed'
      )
    ),
  owner_user_id uuid REFERENCES app_users(id),
  first_response_due_at timestamptz,
  first_responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX leads_branch_status_idx
  ON leads (branch_id, status, created_at DESC);

CREATE INDEX leads_owner_idx
  ON leads (owner_user_id, status);

-- Append-only lead activity history.

CREATE TABLE lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id),
  actor_user_id uuid REFERENCES app_users(id),
  activity_type text NOT NULL
    CHECK (
      activity_type IN ('note', 'call', 'status_change', 'ownership', 'follow_up')
    ),
  content text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_activities_lead_idx
  ON lead_activities (lead_id, occurred_at DESC);

CREATE TRIGGER event_types_set_updated_at
BEFORE UPDATE ON event_types
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER service_categories_set_updated_at
BEFORE UPDATE ON service_categories
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER enquiries_set_updated_at
BEFORE UPDATE ON enquiries
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER leads_set_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
