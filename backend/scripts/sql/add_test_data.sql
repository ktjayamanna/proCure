-- Add test organizations
INSERT INTO organizations (organization_id, name) VALUES
('000000', 'Test Organization 1'),
('999001', 'Test Organization 2'),
('999002', 'Test Organization 3')
ON CONFLICT (organization_id) DO NOTHING;

-- Add test employees
INSERT INTO employees (employee_id, email, created_at, organization_id, role) VALUES
('e1000000-0000-0000-0000-000000000001', 'kaveen.jayamanna@gmail.com', NOW(), '000000', 'admin'),
('e2000000-0000-0000-0000-000000000002', 'test2@example.com', NOW(), '999001', 'member'),
('e3000000-0000-0000-0000-000000000003', 'test3@example.com', NOW(), '999002', 'member')
ON CONFLICT (email) DO NOTHING;

-- Add purchased SaaS entries for test employees
INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Google Workspace',
    'https://mail.google.com',
    employee_id,
    NOW(),
    '000000'
FROM employees
WHERE email = 'kaveen.jayamanna@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Microsoft 365',
    'https://outlook.office.com',
    employee_id,
    NOW(),
    '000000'
FROM employees
WHERE email = 'kaveen.jayamanna@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Slack',
    'https://app.slack.com',
    employee_id,
    NOW(),
    '999001'
FROM employees
WHERE email = 'test2@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'GitHub',
    'https://github.com',
    employee_id,
    NOW(),
    '999002'
FROM employees
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Trello',
    'https://trello.com',
    employee_id,
    NOW(),
    '999002'
FROM employees
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at, organization_id)
SELECT
    'Zoom',
    'https://zoom.us',
    employee_id,
    NOW(),
    '999002'
FROM employees
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

-- Query to verify the data
SELECT e.email, o.name as organization_name, ps.saas_name, ps.url
FROM employees e
JOIN organizations o ON e.organization_id = o.organization_id
JOIN purchased_saas ps ON e.employee_id = ps.owner
ORDER BY e.email, ps.saas_name;
