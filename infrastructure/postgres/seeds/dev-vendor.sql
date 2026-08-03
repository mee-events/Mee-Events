-- Development-only seed: a vendor owner for Vendor Management Foundation.

INSERT INTO app_users (id, mobile_e164, display_name, last_active_role)
VALUES (
  '00000000-0000-4000-8000-0000000000e3',
  '+919000000003',
  'Dev Vendor Owner',
  'vendor_owner'
)
ON CONFLICT (mobile_e164) DO NOTHING;

INSERT INTO role_assignments (user_id, role, state, scope_type, scope_id, verified_at)
SELECT u.id, 'vendor_owner', 'active', 'branch',
       '00000000-0000-4000-8000-000000000001', now()
FROM app_users u
WHERE u.mobile_e164 = '+919000000003'
ON CONFLICT DO NOTHING;

INSERT INTO vendors (
  id, branch_id, vendor_code, business_name, owner_name,
  phone_e164, email, city, state, verification_status, active_status,
  created_by_user_id
)
VALUES (
  '00000000-0000-4000-8000-0000000000v1',
  '00000000-0000-4000-8000-000000000001',
  'VND-HYD-0001',
  'Hyderabad Decor Co',
  'Dev Vendor Owner',
  '+919000000003',
  'decor@meeevents.dev',
  'Hyderabad',
  'Telangana',
  'verified',
  'active',
  '00000000-0000-4000-8000-0000000000e3'
)
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendor_members (vendor_id, user_id, member_role, status)
SELECT v.id, u.id, 'owner', 'active'
FROM vendors v
CROSS JOIN app_users u
WHERE v.vendor_code = 'VND-HYD-0001'
  AND u.mobile_e164 = '+919000000003'
ON CONFLICT (vendor_id, user_id) DO NOTHING;

INSERT INTO vendor_categories (vendor_id, service_category_id, is_primary)
SELECT v.id, sc.id, true
FROM vendors v
CROSS JOIN service_categories sc
WHERE v.vendor_code = 'VND-HYD-0001'
  AND sc.code = 'decoration'
ON CONFLICT (vendor_id, service_category_id) DO NOTHING;

INSERT INTO vendor_bank_accounts (
  vendor_id, account_holder_name, bank_name, account_number_masked, ifsc_code, upi_id, is_primary
)
SELECT v.id, 'Hyderabad Decor Co', 'Demo Bank', 'XXXX1234', 'DEMO0000001', 'decor@upi', true
FROM vendors v
WHERE v.vendor_code = 'VND-HYD-0001'
  AND NOT EXISTS (
    SELECT 1 FROM vendor_bank_accounts b WHERE b.vendor_id = v.id
  );
