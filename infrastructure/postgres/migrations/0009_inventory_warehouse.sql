BEGIN;

-- Slice 9: Inventory & Warehouse Foundation
-- Physical assets owned/rented by Mee Events.
-- Allocations always attach to event_records — never directly to customers.
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
      'inventory_note_added'
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
      'inventory_note'
    )
  );

CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  warehouse_code text NOT NULL UNIQUE,
  name text NOT NULL,
  warehouse_type text NOT NULL DEFAULT 'main'
    CHECK (
      warehouse_type IN (
        'main',
        'branch',
        'partner',
        'temporary',
        'rental_partner'
      )
    ),
  address_line text,
  city text NOT NULL DEFAULT 'Hyderabad',
  state text NOT NULL DEFAULT 'Telangana',
  pincode text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'closed')),
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX warehouses_branch_status_idx
  ON warehouses (branch_id, status, created_at DESC);

CREATE TABLE warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  location_code text NOT NULL,
  name text NOT NULL,
  zone text,
  aisle text,
  shelf text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (warehouse_id, location_code)
);

CREATE INDEX warehouse_locations_warehouse_idx
  ON warehouse_locations (warehouse_id, status);

CREATE TABLE inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  code text NOT NULL,
  display_name text NOT NULL,
  parent_id uuid REFERENCES inventory_categories(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, code)
);

CREATE TABLE inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  supplier_code text NOT NULL UNIQUE,
  name text NOT NULL,
  phone_e164 text,
  email text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  inventory_code text NOT NULL UNIQUE,
  sku text,
  barcode_placeholder text,
  qr_placeholder text,
  name text NOT NULL,
  category_id uuid REFERENCES inventory_categories(id),
  brand text,
  description text,
  purchase_date date,
  purchase_cost numeric(14, 2),
  rental_cost numeric(14, 2),
  current_value numeric(14, 2),
  warehouse_id uuid REFERENCES warehouses(id),
  location_id uuid REFERENCES warehouse_locations(id),
  condition text NOT NULL DEFAULT 'good'
    CHECK (
      condition IN (
        'new',
        'good',
        'fair',
        'poor',
        'damaged'
      )
    ),
  status text NOT NULL DEFAULT 'available'
    CHECK (
      status IN (
        'available',
        'reserved',
        'allocated',
        'in_transit',
        'on_site',
        'returned',
        'damaged',
        'maintenance',
        'disposed'
      )
    ),
  ownership_type text NOT NULL DEFAULT 'owned'
    CHECK (ownership_type IN ('owned', 'rented', 'partner')),
  owner_label text,
  supplier_id uuid REFERENCES inventory_suppliers(id),
  photo_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  quantity_on_hand integer NOT NULL DEFAULT 1
    CHECK (quantity_on_hand >= 0),
  created_by_user_id uuid REFERENCES app_users(id),
  updated_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX inventory_items_branch_status_idx
  ON inventory_items (branch_id, status, created_at DESC);
CREATE INDEX inventory_items_warehouse_idx
  ON inventory_items (warehouse_id, status)
  WHERE warehouse_id IS NOT NULL;
CREATE INDEX inventory_items_category_idx
  ON inventory_items (category_id)
  WHERE category_id IS NOT NULL;

CREATE TABLE inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  unit_code text NOT NULL UNIQUE,
  serial_placeholder text,
  warehouse_id uuid REFERENCES warehouses(id),
  location_id uuid REFERENCES warehouse_locations(id),
  status text NOT NULL DEFAULT 'available'
    CHECK (
      status IN (
        'available',
        'reserved',
        'allocated',
        'in_transit',
        'on_site',
        'returned',
        'damaged',
        'maintenance',
        'disposed'
      )
    ),
  condition text NOT NULL DEFAULT 'good'
    CHECK (
      condition IN ('new', 'good', 'fair', 'poor', 'damaged')
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX inventory_units_item_idx
  ON inventory_units (item_id, status);

CREATE TABLE inventory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  location_id uuid REFERENCES warehouse_locations(id),
  quantity_available integer NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved integer NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_allocated integer NOT NULL DEFAULT 0 CHECK (quantity_allocated >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (item_id, warehouse_id, location_id)
);

CREATE INDEX inventory_stock_warehouse_idx
  ON inventory_stock (warehouse_id);

CREATE TABLE inventory_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_record_id uuid NOT NULL REFERENCES event_records(id),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  unit_id uuid REFERENCES inventory_units(id),
  warehouse_id uuid REFERENCES warehouses(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (
      status IN (
        'reserved',
        'allocated',
        'dispatched',
        'on_site',
        'returned',
        'cancelled'
      )
    ),
  allocated_by_user_id uuid REFERENCES app_users(id),
  expected_dispatch_at timestamptz,
  expected_return_at timestamptz,
  notes text,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  allocated_at timestamptz,
  dispatched_at timestamptz,
  on_site_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX inventory_allocations_event_idx
  ON inventory_allocations (event_record_id, status, reserved_at DESC);
CREATE INDEX inventory_allocations_item_idx
  ON inventory_allocations (item_id, status);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid REFERENCES inventory_allocations(id),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  unit_id uuid REFERENCES inventory_units(id),
  event_record_id uuid REFERENCES event_records(id),
  movement_type text NOT NULL
    CHECK (
      movement_type IN (
        'reserve',
        'allocate',
        'dispatch',
        'arrive_site',
        'return',
        'transfer',
        'maintenance',
        'damage',
        'dispose'
      )
    ),
  from_place text,
  to_place text,
  from_warehouse_id uuid REFERENCES warehouses(id),
  to_warehouse_id uuid REFERENCES warehouses(id),
  vehicle_placeholder text,
  venue_placeholder text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_movements_item_idx
  ON inventory_movements (item_id, occurred_at DESC);
CREATE INDEX inventory_movements_event_idx
  ON inventory_movements (event_record_id, occurred_at DESC)
  WHERE event_record_id IS NOT NULL;
CREATE INDEX inventory_movements_allocation_idx
  ON inventory_movements (allocation_id, occurred_at DESC)
  WHERE allocation_id IS NOT NULL;

CREATE TABLE inventory_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES inventory_allocations(id),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  returned_quantity integer NOT NULL DEFAULT 1 CHECK (returned_quantity > 0),
  condition_on_return text NOT NULL DEFAULT 'good'
    CHECK (
      condition_on_return IN ('new', 'good', 'fair', 'poor', 'damaged')
    ),
  warehouse_id uuid REFERENCES warehouses(id),
  notes text,
  returned_by_user_id uuid REFERENCES app_users(id),
  returned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_returns_allocation_idx
  ON inventory_returns (allocation_id, returned_at DESC);

CREATE TABLE inventory_damage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  allocation_id uuid REFERENCES inventory_allocations(id),
  event_record_id uuid REFERENCES event_records(id),
  severity text NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor', 'major', 'total_loss')),
  summary text NOT NULL,
  photo_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved', 'written_off')),
  reported_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX inventory_damage_reports_item_idx
  ON inventory_damage_reports (item_id, created_at DESC);

CREATE TABLE inventory_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (
      status IN (
        'scheduled',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX inventory_maintenance_item_idx
  ON inventory_maintenance (item_id, created_at DESC);
CREATE INDEX inventory_maintenance_status_idx
  ON inventory_maintenance (status, created_at DESC);

CREATE TABLE inventory_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  photo_placeholder text NOT NULL,
  caption text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_photos_item_idx
  ON inventory_photos (item_id, created_at DESC);

CREATE TABLE inventory_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  allocation_id uuid REFERENCES inventory_allocations(id),
  event_record_id uuid REFERENCES event_records(id),
  note_type text NOT NULL DEFAULT 'internal'
    CHECK (note_type IN ('internal', 'ops', 'damage', 'maintenance')),
  content text NOT NULL,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_notes_item_idx
  ON inventory_notes (item_id, created_at DESC);

CREATE TRIGGER warehouses_set_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER warehouse_locations_set_updated_at
  BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER inventory_suppliers_set_updated_at
  BEFORE UPDATE ON inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER inventory_items_set_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER inventory_units_set_updated_at
  BEFORE UPDATE ON inventory_units
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER inventory_stock_set_updated_at
  BEFORE UPDATE ON inventory_stock
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER inventory_allocations_set_updated_at
  BEFORE UPDATE ON inventory_allocations
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER inventory_damage_reports_set_updated_at
  BEFORE UPDATE ON inventory_damage_reports
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

CREATE TRIGGER inventory_maintenance_set_updated_at
  BEFORE UPDATE ON inventory_maintenance
  FOR EACH ROW EXECUTE FUNCTION set_record_updated_at();

COMMIT;
