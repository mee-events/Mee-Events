-- Migration 0019: Fix entertainment.B2 collision
-- Female Anchor source ordinal B2 (inside the A sequence) → entertainment.A2.
-- Restore Magician at entertainment.B2 / entertainment.B.
-- Additive. Does not modify 0018. Fail-closed. Does not drop uniqueness.

BEGIN;

SELECT code
  FROM catalog_products
 WHERE code IN ('entertainment.B2', 'entertainment.A2')
    OR (service_code = 'entertainment' AND source_name = 'Magician')
   FOR UPDATE;

DO $$
DECLARE
  b2_count integer;
  a2_count integer;
  magician_count integer;
  b2_ok integer;
  enquiry_hits integer;
BEGIN
  SELECT count(*) INTO b2_count
    FROM catalog_products
   WHERE code = 'entertainment.B2';

  SELECT count(*) INTO a2_count
    FROM catalog_products
   WHERE code = 'entertainment.A2';

  SELECT count(*) INTO magician_count
    FROM catalog_products
   WHERE service_code = 'entertainment'
     AND source_name = 'Magician';

  SELECT count(*) INTO b2_ok
    FROM catalog_products
   WHERE code = 'entertainment.B2'
     AND subcategory_code = 'entertainment.A'
     AND source_code = 'B2'
     AND source_name = 'Female Anchor'
     AND display_name = 'Female Anchor';

  SELECT count(*) INTO enquiry_hits
    FROM enquiries
   WHERE plan_items @> '[{"productCode":"entertainment.B2"}]'::jsonb
      OR plan_items @> '[{"productCode":"entertainment.A2"}]'::jsonb;

  IF b2_count <> 1 THEN
    RAISE EXCEPTION
      '0019 precondition failed: entertainment.B2 count=% (expected 1)',
      b2_count;
  END IF;

  IF b2_ok <> 1 THEN
    RAISE EXCEPTION
      '0019 precondition failed: entertainment.B2 is not Female Anchor in entertainment.A';
  END IF;

  IF a2_count <> 0 THEN
    RAISE EXCEPTION
      '0019 precondition failed: entertainment.A2 already exists';
  END IF;

  IF magician_count <> 0 THEN
    RAISE EXCEPTION
      '0019 precondition failed: Entertainment Magician already exists';
  END IF;

  IF enquiry_hits <> 0 THEN
    RAISE EXCEPTION
      '0019 blocked: % enquiry plan_items reference entertainment.B2/A2',
      enquiry_hits;
  END IF;
END $$;

DO $$
DECLARE
  updated integer;
BEGIN
  UPDATE catalog_products
     SET code = 'entertainment.A2',
         source_code = 'A2',
         source_alias = 'B2. Female Anchor',
         parse_anomaly = true,
         display_order = 2,
         version = version + 1
   WHERE code = 'entertainment.B2'
     AND subcategory_code = 'entertainment.A'
     AND source_name = 'Female Anchor';

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 1 THEN
    RAISE EXCEPTION
      '0019 expected to update 1 Female Anchor row, updated=%',
      updated;
  END IF;
END $$;

INSERT INTO catalog_content_revisions (
  entity_type, entity_code, field, old_value, new_value, actor_user_id, reason
) VALUES
  ('product', 'entertainment.A2', 'code', 'entertainment.B2', 'entertainment.A2',
   NULL, '0019_fix_entertainment_b2_collision'),
  ('product', 'entertainment.A2', 'source_code', 'B2', 'A2',
   NULL, '0019_fix_entertainment_b2_collision'),
  ('product', 'entertainment.A2', 'parse_anomaly', 'false', 'true',
   NULL, '0019_fix_entertainment_b2_collision'),
  ('product', 'entertainment.A2', 'source_alias', 'Female Anchor', 'B2. Female Anchor',
   NULL, '0019_fix_entertainment_b2_collision');

INSERT INTO catalog_products (
  code,
  service_code,
  subcategory_code,
  source_code,
  source_name,
  display_name,
  source_alias,
  parse_anomaly,
  placeholder,
  eligibility_flags,
  customer_selectable,
  hyderabad_available,
  content_status,
  display_order,
  branch_id
) VALUES (
  'entertainment.B2',
  'entertainment',
  'entertainment.B',
  'B2',
  'Magician',
  'Magician',
  'Magician',
  FALSE,
  FALSE,
  '[]'::jsonb,
  TRUE,
  TRUE,
  'approved',
  2,
  '00000000-0000-4000-8000-000000000001'
);

DO $$
DECLARE
  female_ok integer;
  magician_ok integer;
  product_rows integer;
  distinct_codes integer;
  dup_source integer;
  orphan_service integer;
  orphan_subcategory integer;
BEGIN
  SELECT count(*) INTO female_ok
    FROM catalog_products
   WHERE code = 'entertainment.A2'
     AND service_code = 'entertainment'
     AND subcategory_code = 'entertainment.A'
     AND source_code = 'A2'
     AND source_name = 'Female Anchor'
     AND display_name = 'Female Anchor'
     AND source_alias = 'B2. Female Anchor'
     AND parse_anomaly = true
     AND display_order = 2;

  SELECT count(*) INTO magician_ok
    FROM catalog_products
   WHERE code = 'entertainment.B2'
     AND service_code = 'entertainment'
     AND subcategory_code = 'entertainment.B'
     AND source_code = 'B2'
     AND source_name = 'Magician'
     AND display_name = 'Magician'
     AND parse_anomaly = false
     AND display_order = 2;

  SELECT count(*), count(DISTINCT code)
    INTO product_rows, distinct_codes
    FROM catalog_products;

  SELECT count(*) INTO dup_source
    FROM (
      SELECT service_code, source_code
        FROM catalog_products
       GROUP BY service_code, source_code
      HAVING count(*) > 1
    ) duplicates;

  SELECT count(*) INTO orphan_service
    FROM catalog_products p
    LEFT JOIN catalog_services s ON s.code = p.service_code
   WHERE s.code IS NULL
     AND p.code IN ('entertainment.A2', 'entertainment.B2');

  SELECT count(*) INTO orphan_subcategory
    FROM catalog_products p
    LEFT JOIN catalog_subcategories sc ON sc.code = p.subcategory_code
   WHERE sc.code IS NULL
     AND p.code IN ('entertainment.A2', 'entertainment.B2');

  IF female_ok <> 1 THEN
    RAISE EXCEPTION
      '0019 assertion failed: Female Anchor at entertainment.A2 count=%',
      female_ok;
  END IF;

  IF magician_ok <> 1 THEN
    RAISE EXCEPTION
      '0019 assertion failed: Magician at entertainment.B2 count=%',
      magician_ok;
  END IF;

  IF product_rows <> 974 OR distinct_codes <> 974 THEN
    RAISE EXCEPTION
      '0019 assertion failed: product rows=% distinct codes=% (expected 974/974)',
      product_rows, distinct_codes;
  END IF;

  IF dup_source <> 0 THEN
    RAISE EXCEPTION
      '0019 assertion failed: duplicate (service_code, source_code) count=%',
      dup_source;
  END IF;

  IF orphan_service <> 0 OR orphan_subcategory <> 0 THEN
    RAISE EXCEPTION
      '0019 assertion failed: orphan service=% subcategory=%',
      orphan_service, orphan_subcategory;
  END IF;
END $$;

COMMIT;
