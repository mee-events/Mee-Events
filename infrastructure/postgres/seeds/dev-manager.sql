-- Development-only seed: an operations manager for Manager Operations.
-- Pair with +919000000001 (employee) who assigns managers in CRM.

INSERT INTO app_users (id, mobile_e164, display_name, last_active_role)
VALUES (
  '00000000-0000-4000-8000-0000000000e2',
  '+919000000002',
  'Dev Event Manager',
  'manager'
)
ON CONFLICT (mobile_e164) DO NOTHING;

INSERT INTO role_assignments (user_id, role, state, scope_type, scope_id, verified_at)
SELECT u.id, 'manager', 'active', 'branch',
       '00000000-0000-4000-8000-000000000001', now()
FROM app_users u
WHERE u.mobile_e164 = '+919000000002'
ON CONFLICT DO NOTHING;
