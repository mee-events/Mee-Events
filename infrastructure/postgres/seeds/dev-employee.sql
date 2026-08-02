-- Development-only seed: a marketing employee for the ERP web leads inbox.
-- Never run in staging or production; real employees are provisioned through
-- platform administration.

INSERT INTO app_users (id, mobile_e164, display_name, last_active_role)
VALUES (
  '00000000-0000-4000-8000-0000000000e1',
  '+919000000001',
  'Dev Marketing Manager',
  'employee'
)
ON CONFLICT (mobile_e164) DO NOTHING;

INSERT INTO role_assignments (user_id, role, state, scope_type, scope_id, verified_at)
SELECT u.id, 'employee', 'active', 'branch',
       '00000000-0000-4000-8000-000000000001', now()
FROM app_users u
WHERE u.mobile_e164 = '+919000000001'
ON CONFLICT DO NOTHING;
