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

-- Add test users (keeping existing users)
INSERT INTO users (id, email, hashed_password, is_active, is_superuser, is_verified, created_at, organization_id, role) VALUES
('e1000000-0000-0000-0000-000000000001', 'kjayamanna@firebaystudios.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, true, true, NOW(), 'org_abcdefghijklmnopqrstuvwxyz123456', 'admin'),
('e2000000-0000-0000-0000-000000000002', 'test2@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, false, true, NOW(), 'org_bcdefghijklmnopqrstuvwxyz1234567', 'member'),
('e3000000-0000-0000-0000-000000000003', 'test3@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, false, true, NOW(), 'org_cdefghijklmnopqrstuvwxyz12345678', 'member'),
('e4000000-0000-0000-0000-000000000004', 'admin@acme.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, true, true, NOW(), 'org_defghijklmnopqrstuvwxyz123456789', 'admin'),
('e5000000-0000-0000-0000-000000000005', 'member@acme.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, false, true, NOW(), 'org_defghijklmnopqrstuvwxyz123456789', 'member'),
('e6000000-0000-0000-0000-000000000006', 'ceo@startup.io', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, true, true, NOW(), 'org_efghijklmnopqrstuvwxyz1234567890', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Add contract entries for FireBay Studios (matching sample-contracts.csv format)
INSERT INTO contracts (
    vendor_name, 
    product_url, 
    vendor_domain,
    owner_id,
    created_at,
    expire_at,
    organization_id,
    num_seats,
    annual_spend,
    contract_type,
    contract_status,
    payment_type,
    notes
)
SELECT
    'Salesforce',
    'https://salesforce.com',
    'salesforce.com',
    id,
    '2023-01-01'::timestamp,
    '2024-12-31'::timestamp,
    'org_abcdefghijklmnopqrstuvwxyz123456',
    25,
    50000.00,
    'subscription',
    'active',
    'ACH',
    'CRM system for sales team'
FROM users
WHERE email = 'kjayamanna@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (
    vendor_name,
    product_url,
    vendor_domain,
    owner_id,
    created_at,
    expire_at,
    organization_id,
    num_seats,
    annual_spend,
    contract_type,
    contract_status,
    payment_type,
    notes
)
SELECT
    'Microsoft',
    'https://microsoft.com',
    'microsoft.com',
    id,
    '2022-06-30'::timestamp,
    '2025-06-30'::timestamp,
    'org_abcdefghijklmnopqrstuvwxyz123456',
    50,
    35000.00,
    'year to year',
    'active',
    'virtual cards',
    'Office 365 and Azure services'
FROM users
WHERE email = 'kjayamanna@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (
    vendor_name,
    product_url,
    vendor_domain,
    owner_id,
    created_at,
    expire_at,
    organization_id,
    num_seats,
    annual_spend,
    contract_type,
    contract_status,
    payment_type,
    notes
)
SELECT
    'Zoom',
    'https://zoom.com',
    'zoom.com',
    id,
    '2023-09-15'::timestamp,
    '2024-09-15'::timestamp,
    'org_abcdefghijklmnopqrstuvwxyz123456',
    100,
    12000.00,
    'month to month',
    'active',
    'In app purchases',
    'Video conferencing solution'
FROM users
WHERE email = 'kjayamanna@firebaystudios.com'
ON CONFLICT DO NOTHING;

-- Add contract entries for test employees
INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'Google Workspace',
    'https://mail.google.com',
    'google.com',
    id,
    NOW(),
    'org_abcdefghijklmnopqrstuvwxyz123456',
    50,
    1200.00
FROM users
WHERE email = 'gcahill@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'ChatGPT',
    'https://chatgpt.com',
    'chatgpt.com',
    id,
    NOW(),
    'org_abcdefghijklmnopqrstuvwxyz123456',
    25,
    2400.00
FROM users
WHERE email = 'gcahill@firebaystudios.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'Slack',
    'https://app.slack.com',
    'slack.com',
    id,
    NOW(),
    'org_bcdefghijklmnopqrstuvwxyz1234567',
    20,
    1800.00
FROM users
WHERE email = 'test2@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'GitHub',
    'https://github.com',
    'github.com',
    id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678',
    10,
    3600.00
FROM users
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'Trello',
    'https://trello.com',
    'trello.com',
    id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678',
    5,
    600.00
FROM users
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'Zoom',
    'https://zoom.com',
    'zoom.com',
    id,
    NOW(),
    'org_cdefghijklmnopqrstuvwxyz12345678',
    15,
    1500.00
FROM users
WHERE email = 'test3@example.com'
ON CONFLICT DO NOTHING;

-- Add contract entries for acme.com employees
INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'Salesforce',
    'https://salesforce.com',
    'salesforce.com',
    id,
    NOW(),
    'org_defghijklmnopqrstuvwxyz123456789',
    25,
    9600.00
FROM users
WHERE email = 'admin@acme.com'
ON CONFLICT DO NOTHING;

INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'Jira',
    'https://jira.atlassian.com',
    'atlassian.com',
    id,
    NOW(),
    'org_defghijklmnopqrstuvwxyz123456789',
    30,
    7200.00
FROM users
WHERE email = 'member@acme.com'
ON CONFLICT DO NOTHING;

-- Add contract entry for startup.io employee
INSERT INTO contracts (vendor_name, product_url, vendor_domain, owner_id, created_at, organization_id, num_seats, annual_spend)
SELECT
    'Notion',
    'https://notion.so',
    'notion.so',
    id,
    NOW(),
    'org_efghijklmnopqrstuvwxyz1234567890',
    3,
    480.00
FROM users
WHERE email = 'ceo@startup.io'
ON CONFLICT DO NOTHING;

-- Query to verify the data
SELECT 
    u.email,
    o.company_name,
    o.domain_name,
    c.vendor_name,
    c.product_url,
    c.vendor_domain,
    c.num_seats,
    c.annual_spend,
    c.contract_type,
    c.contract_status,
    c.payment_type,
    c.expire_at,
    c.created_at,
    c.notes
FROM users u
JOIN organizations o ON u.organization_id = o.organization_id
JOIN contracts c ON u.id = c.owner_id
ORDER BY u.email, c.vendor_name;
