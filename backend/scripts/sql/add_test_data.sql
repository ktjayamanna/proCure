-- Add test organizations with new org_id format
INSERT INTO organizations (organization_id, name, admins_remaining, members_remaining) VALUES
('org_abcdefghijklmnopqrstuvwxyz123456', 'firebaystudios.com', 2, 999),
('org_bcdefghijklmnopqrstuvwxyz1234567', 'example.com', 1, 500),
('org_cdefghijklmnopqrstuvwxyz12345678', 'company.org', 1, 100),
('org_defghijklmnopqrstuvwxyz123456789', 'acme.com', 1, 1000),
('org_efghijklmnopqrstuvwxyz1234567890', 'startup.io', 1, 0)
ON CONFLICT (organization_id) DO UPDATE SET
  admins_remaining = EXCLUDED.admins_remaining,
  members_remaining = EXCLUDED.members_remaining;

-- Add test employees
INSERT INTO employees (employee_id, email, created_at, organization_id, role) VALUES
('e1000000-0000-0000-0000-000000000001', 'gcahill@firebaystudios.com', NOW(), 'org_abcdefghijklmnopqrstuvwxyz123456', 'admin'),
('e2000000-0000-0000-0000-000000000002', 'test2@example.com', NOW(), 'org_bcdefghijklmnopqrstuvwxyz1234567', 'member'),
('e3000000-0000-0000-0000-000000000003', 'test3@example.com', NOW(), 'org_cdefghijklmnopqrstuvwxyz12345678', 'member'),
('e4000000-0000-0000-0000-000000000004', 'admin@acme.com', NOW(), 'org_defghijklmnopqrstuvwxyz123456789', 'admin'),
('e5000000-0000-0000-0000-000000000005', 'member@acme.com', NOW(), 'org_defghijklmnopqrstuvwxyz123456789', 'member'),
('e6000000-0000-0000-0000-000000000006', 'ceo@startup.io', NOW(), 'org_efghijklmnopqrstuvwxyz1234567890', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Add purchased SaaS entries for test employees
INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Google Workspace',
    'https://mail.google.com',
    employee_id,
    NOW(),
    'org_abcdefghijklmnopqrstuvwxyz123456'
FROM employees
WHERE email = 'gcahill@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'ChatGPT',
    'https://chatgpt.com',
    employee_id,
    NOW(),
    'org_abcdefghijklmnopqrstuvwxyz123456'
FROM employees
WHERE email = 'gcahill@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Slack',
    'https://app.slack.com',
    employee_id,
    NOW(),
    'org_bcdefghijklmnopqrstuvwxyz1234567'
FROM employees
WHERE email = 'test2@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'GitHub',
    'https://github.com',
    employee_id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678'
FROM employees
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Trello',
    'https://trello.com',
    employee_id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678'
FROM employees
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Zoom',
    'https://zoom.us',
    employee_id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678'
FROM employees
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

-- Add purchased SaaS entries for acme.com employees
INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Salesforce',
    'https://salesforce.com',
    employee_id,
    NOW(),
    'org_defghijklmnopqrstuvwxyz123456789'
FROM employees
WHERE email = 'admin@acme.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Jira',
    'https://jira.atlassian.com',
    employee_id,
    NOW(),
    'org_defghijklmnopqrstuvwxyz123456789'
FROM employees
WHERE email = 'member@acme.com'
ON CONFLICT DO NOTHING;

-- Add purchased SaaS entry for startup.io employee
INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Notion',
    'https://notion.so',
    employee_id,
    NOW(),
    'org_efghijklmnopqrstuvwxyz1234567890'
FROM employees
WHERE email = 'ceo@startup.io'
ON CONFLICT DO NOTHING;

-- Query to verify the data
SELECT e.email, o.name as organization_name, ps.saas_name, ps.url
FROM employees e
JOIN organizations o ON e.organization_id = o.organization_id
JOIN purchased_saas ps ON e.employee_id = ps.owner
ORDER BY e.email, ps.saas_name;
