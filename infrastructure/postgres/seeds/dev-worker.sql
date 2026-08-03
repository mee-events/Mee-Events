-- Development-only seed: a field worker linked to Hyderabad Decor Co.

INSERT INTO app_users (id, mobile_e164, display_name, last_active_role)
VALUES (
  '00000000-0000-4000-8000-0000000000e4',
  '+919000000004',
  'Dev Field Worker',
  'worker'
)
ON CONFLICT (mobile_e164) DO NOTHING;

INSERT INTO role_assignments (user_id, role, state, scope_type, scope_id, verified_at)
SELECT u.id, 'worker', 'active', 'branch',
       '00000000-0000-4000-8000-000000000001', now()
FROM app_users u
WHERE u.mobile_e164 = '+919000000004'
ON CONFLICT DO NOTHING;

INSERT INTO workers (
  id, branch_id, user_id, worker_code, display_name, phone_e164, email,
  status, availability_status, created_by_user_id
)
VALUES (
  '00000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000e4',
  'WRK-HYD-0001',
  'Dev Field Worker',
  '+919000000004',
  'worker@meeevents.dev',
  'active',
  'available',
  '00000000-0000-4000-8000-0000000000e3'
)
ON CONFLICT (worker_code) DO NOTHING;

INSERT INTO worker_profiles (
  worker_id, experience_years, emergency_contact_name, emergency_contact_phone,
  bank_account_holder, bank_name, account_number_masked, ifsc_code, upi_id, bio
)
SELECT w.id, 3, 'Emergency Contact', '+919000000099',
       'Dev Field Worker', 'Demo Bank', 'XXXX5678', 'DEMO0000001', 'worker@upi',
       'Decor setup specialist'
FROM workers w
WHERE w.worker_code = 'WRK-HYD-0001'
ON CONFLICT (worker_id) DO NOTHING;

INSERT INTO worker_vendor_membership (
  worker_id, vendor_id, employment_type, membership_role, status, is_primary
)
SELECT w.id, v.id, 'vendor', 'worker', 'active', true
FROM workers w
CROSS JOIN vendors v
WHERE w.worker_code = 'WRK-HYD-0001'
  AND v.vendor_code = 'VND-HYD-0001'
  AND NOT EXISTS (
    SELECT 1 FROM worker_vendor_membership m
    WHERE m.worker_id = w.id AND m.is_primary AND m.status = 'active'
  );

INSERT INTO worker_skills (worker_id, skill_code, skill_label, proficiency)
SELECT w.id, 'decoration', 'Decoration', 'standard'
FROM workers w
WHERE w.worker_code = 'WRK-HYD-0001'
ON CONFLICT (worker_id, skill_code) DO NOTHING;
