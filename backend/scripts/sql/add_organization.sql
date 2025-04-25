-- Add organization
INSERT INTO organizations (organization_id, domain_name, company_name, admins_remaining, members_remaining) VALUES
('org_9jMaENnfEhHz4BKwXXNdoinIdZsr3bAm', 'firebaystudios.com', 'Firebay Studios', 200, 999)
ON CONFLICT (organization_id) DO UPDATE SET
  domain_name = EXCLUDED.domain_name,
  company_name = EXCLUDED.company_name,
  admins_remaining = EXCLUDED.admins_remaining,
  members_remaining = EXCLUDED.members_remaining;

-- Verify the data
SELECT 
    o.organization_id,
    o.domain_name,
    o.company_name,
    o.admins_remaining,
    o.members_remaining
FROM organizations o
WHERE o.organization_id = 'org_9jMaENnfEhHz4BKwXXNdoinIdZsr3bAm';
