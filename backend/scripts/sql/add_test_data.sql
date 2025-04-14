-- Add test users
INSERT INTO users (email) VALUES 
('kaveen.jayamanna@gmail.com'),
('test2@example.com'),
('test3@example.com')
ON CONFLICT (email) DO NOTHING;

-- Add purchased SaaS entries for test users
INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT 
    'Google Workspace', 
    'https://mail.google.com', 
    user_id,
    NOW()
FROM users 
WHERE email = 'kaveen.jayamanna@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT 
    'Microsoft 365', 
    'https://outlook.office.com', 
    user_id,
    NOW()
FROM users 
WHERE email = 'kaveen.jayamanna@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT 
    'Slack', 
    'https://app.slack.com', 
    user_id,
    NOW()
FROM users 
WHERE email = 'test2@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner, created_at)
SELECT 
    'GitHub', 
    'https://github.com', 
    user_id,
    NOW()
FROM users 
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

-- Query to verify the data
SELECT u.email, ps.saas_name, ps.url
FROM users u
JOIN purchased_saas ps ON u.user_id = ps.owner
ORDER BY u.email, ps.saas_name;
