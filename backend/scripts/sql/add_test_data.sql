-- Add test organizations with new org_id format
INSERT INTO organizations (organization_id, domain_name, company_name, admins_remaining, members_remaining) VALUES
('org_abcdefghijklmnopqrstuvwxyz123456', 'firebaystudios.com', 'FireBay Studios', 200, 999),
('org_bcdefghijklmnopqrstuvwxyz1234567', 'example.com', 'Example Corporation', 100, 500),
('org_cdefghijklmnopqrstuvwxyz12345678', 'company.org', 'Company Organization', 1, 100),
('org_defghijklmnopqrstuvwxyz123456789', 'acme.com', 'ACME Inc.', 1, 1000),
('org_efghijklmnopqrstuvwxyz1234567890', 'startup.io', 'Startup.io', 1, 0)
ON CONFLICT (organization_id) DO UPDATE SET
  domain_name = EXCLUDED.domain_name,
  company_name = EXCLUDED.company_name,
  admins_remaining = EXCLUDED.admins_remaining,
  members_remaining = EXCLUDED.members_remaining;

-- Add test users
INSERT INTO users (id, email, hashed_password, is_active, is_superuser, is_verified, created_at, organization_id, role) VALUES
('e1000000-0000-0000-0000-000000000001', 'gcahill@firebaystudios.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, true, true, NOW(), 'org_abcdefghijklmnopqrstuvwxyz123456', 'admin'),
('e2000000-0000-0000-0000-000000000002', 'test2@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, false, true, NOW(), 'org_bcdefghijklmnopqrstuvwxyz1234567', 'member'),
('e3000000-0000-0000-0000-000000000003', 'test3@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, false, true, NOW(), 'org_cdefghijklmnopqrstuvwxyz12345678', 'member'),
('e4000000-0000-0000-0000-000000000004', 'admin@acme.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, true, true, NOW(), 'org_defghijklmnopqrstuvwxyz123456789', 'admin'),
('e5000000-0000-0000-0000-000000000005', 'member@acme.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, false, true, NOW(), 'org_defghijklmnopqrstuvwxyz123456789', 'member'),
('e6000000-0000-0000-0000-000000000006', 'ceo@startup.io', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, true, true, NOW(), 'org_efghijklmnopqrstuvwxyz1234567890', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Add purchased SaaS entries for test employees
INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'Google Workspace',
    'https://mail.google.com',
    id,
    NOW(),
    'org_abcdefghijklmnopqrstuvwxyz123456'
FROM users
WHERE email = 'gcahill@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'ChatGPT',
    'https://chatgpt.com',
    id,
    NOW(),
    'org_abcdefghijklmnopqrstuvwxyz123456'
FROM users
WHERE email = 'gcahill@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'Slack',
    'https://app.slack.com',
    id,
    NOW(),
    'org_bcdefghijklmnopqrstuvwxyz1234567'
FROM users
WHERE email = 'test2@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'GitHub',
    'https://github.com',
    id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678'
FROM users
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'Trello',
    'https://trello.com',
    id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678'
FROM users
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'Zoom',
    'https://zoom.us',
    id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678'
FROM users
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

-- Add purchased SaaS entries for acme.com employees
INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'Salesforce',
    'https://salesforce.com',
    id,
    NOW(),
    'org_defghijklmnopqrstuvwxyz123456789'
FROM users
WHERE email = 'admin@acme.com'
ON CONFLICT DO NOTHING;

INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'Jira',
    'https://jira.atlassian.com',
    id,
    NOW(),
    'org_defghijklmnopqrstuvwxyz123456789'
FROM users
WHERE email = 'member@acme.com'
ON CONFLICT DO NOTHING;

-- Add purchased SaaS entry for startup.io employee
INSERT INTO purchased_saas (saas_name, url, owner_id, created_at, organization_id)
SELECT
    'Notion',
    'https://notion.so',
    id,
    NOW(),
    'org_efghijklmnopqrstuvwxyz1234567890'
FROM users
WHERE email = 'ceo@startup.io'
ON CONFLICT DO NOTHING;

-- Query to verify the data
SELECT u.email, o.company_name, o.domain_name, ps.saas_name, ps.url
FROM users u
JOIN organizations o ON u.organization_id = o.organization_id
JOIN purchased_saas ps ON u.id = ps.owner_id
ORDER BY u.email, ps.saas_name;
