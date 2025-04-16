-- Add test employees
INSERT INTO employees (email) VALUES
('kaveen.jayamanna@gmail.com'),
('test2@example.com'),
('test3@example.com')
ON CONFLICT (email) DO NOTHING;

-- Add purchased SaaS entries for test employees
INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT
    'Google Workspace',
    'https://mail.google.com',
    user_id,
    NOW()
FROM employees
WHERE email = 'kaveen.jayamanna@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT
    'Microsoft 365',
    'https://outlook.office.com',
    user_id,
    NOW()
FROM employees
WHERE email = 'kaveen.jayamanna@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT
    'Slack',
    'https://app.slack.com',
    user_id,
    NOW()
FROM employees
WHERE email = 'test2@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT
    'GitHub',
    'https://github.com',
    user_id,
    NOW()
FROM employees
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

-- Query to verify the data
SELECT e.email, ps.saas_name, ps.url
FROM employees e
JOIN purchased_saas ps ON e.user_id = ps.owner
ORDER BY e.email, ps.saas_name;
