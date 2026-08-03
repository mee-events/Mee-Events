-- Development-only seed: Hyderabad Main warehouse + sample inventory.

INSERT INTO warehouses (
  id, branch_id, warehouse_code, name, warehouse_type,
  address_line, city, state, status, created_by_user_id
)
VALUES (
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-000000000001',
  'WH-HYD-MAIN',
  'Hyderabad Main',
  'main',
  'Warehouse Road, Hyderabad',
  'Hyderabad',
  'Telangana',
  'active',
  '00000000-0000-4000-8000-0000000000e2'
)
ON CONFLICT (warehouse_code) DO NOTHING;

INSERT INTO warehouse_locations (
  id, warehouse_id, location_code, name, zone, aisle, shelf
)
SELECT
  '00000000-0000-4000-8000-0000000000a2',
  w.id,
  'A-01',
  'Decor Zone A1',
  'Decor',
  'A',
  '01'
FROM warehouses w
WHERE w.warehouse_code = 'WH-HYD-MAIN'
ON CONFLICT (warehouse_id, location_code) DO NOTHING;

INSERT INTO inventory_categories (id, branch_id, code, display_name)
VALUES (
  '00000000-0000-4000-8000-0000000000a3',
  '00000000-0000-4000-8000-000000000001',
  'decoration',
  'Decoration'
)
ON CONFLICT (branch_id, code) DO NOTHING;

INSERT INTO inventory_items (
  id, branch_id, inventory_code, sku, barcode_placeholder, qr_placeholder,
  name, category_id, brand, description, purchase_cost, rental_cost,
  current_value, warehouse_id, location_id, condition, status,
  ownership_type, owner_label, quantity_on_hand, photo_placeholders,
  created_by_user_id
)
SELECT
  '00000000-0000-4000-8000-0000000000a4',
  '00000000-0000-4000-8000-000000000001',
  'INV-HYD-0001',
  'DECOR-PANEL-01',
  'BARCODE-PLACEHOLDER',
  'QR-PLACEHOLDER',
  'Stage Backdrop Panel Set',
  c.id,
  'Mee Decor',
  'Modular stage backdrop panels for indoor events',
  25000,
  3500,
  22000,
  w.id,
  l.id,
  'good',
  'available',
  'owned',
  'Mee Events',
  4,
  '["photo-placeholder-1"]'::jsonb,
  '00000000-0000-4000-8000-0000000000e2'
FROM warehouses w
CROSS JOIN inventory_categories c
LEFT JOIN warehouse_locations l
  ON l.warehouse_id = w.id AND l.location_code = 'A-01'
WHERE w.warehouse_code = 'WH-HYD-MAIN'
  AND c.code = 'decoration'
ON CONFLICT (inventory_code) DO NOTHING;

INSERT INTO inventory_stock (
  item_id, warehouse_id, location_id, quantity_available
)
SELECT i.id, i.warehouse_id, i.location_id, i.quantity_on_hand
FROM inventory_items i
WHERE i.inventory_code = 'INV-HYD-0001'
  AND i.warehouse_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory_stock s
    WHERE s.item_id = i.id AND s.warehouse_id = i.warehouse_id
  );
