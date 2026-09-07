const fs = require('fs');

let content = fs.readFileSync('supabase/schema.sql', 'utf8');

const marker = '-- ====================================================================\n-- ROW LEVEL SECURITY (RLS) POLICIES';
const idx = content.indexOf(marker);

if (idx === -1) {
  console.log('Marker not found');
  process.exit(1);
}

const securePolicies = `
-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audits ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_org_member(org_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_id = org_id
    AND user_id = auth.uid()::VARCHAR
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_id = org_id
    AND user_id = auth.uid()::VARCHAR
    AND org_role IN ('admin', 'owner')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Organizations
DROP POLICY IF EXISTS "Allow public read access to organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated insert/update to organizations" ON public.organizations;

CREATE POLICY "Allow public read access to verified organizations" ON public.organizations
    FOR SELECT USING (true);

CREATE POLICY "Allow users to create organizations" ON public.organizations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow org admins to update their organizations" ON public.organizations
    FOR UPDATE TO authenticated USING (public.is_org_admin(id));

CREATE POLICY "Allow org admins to delete their organizations" ON public.organizations
    FOR DELETE TO authenticated USING (public.is_org_admin(id));

-- 2. Users
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow write access to users" ON public.users;

CREATE POLICY "Users can read their own profile" ON public.users
    FOR SELECT TO authenticated USING (id = auth.uid()::VARCHAR);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE TO authenticated USING (id = auth.uid()::VARCHAR);

CREATE POLICY "Users can delete their own profile" ON public.users
    FOR DELETE TO authenticated USING (id = auth.uid()::VARCHAR);

-- 3. Opportunities
DROP POLICY IF EXISTS "Allow public read access to opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Allow write access to opportunities" ON public.opportunities;

CREATE POLICY "Anyone can view published opportunities" ON public.opportunities
    FOR SELECT USING (status = 'published');

CREATE POLICY "Org members can view their orgs opportunities" ON public.opportunities
    FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can insert opportunities" ON public.opportunities
    FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can update opportunities" ON public.opportunities
    FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can delete opportunities" ON public.opportunities
    FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));

-- 4. Applications
DROP POLICY IF EXISTS "Allow read access to applications" ON public.applications;
DROP POLICY IF EXISTS "Allow insert/update to applications" ON public.applications;

CREATE POLICY "Candidates can view their own applications" ON public.applications
    FOR SELECT TO authenticated USING (applicant_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Org members can view applications to their org" ON public.applications
    FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "Candidates can create applications" ON public.applications
    FOR INSERT TO authenticated WITH CHECK (applicant_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Candidates can withdraw applications" ON public.applications
    FOR UPDATE TO authenticated USING (applicant_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Org members can update applications" ON public.applications
    FOR UPDATE TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "Candidates can delete their applications" ON public.applications
    FOR DELETE TO authenticated USING (applicant_user_id = auth.uid()::VARCHAR);

-- 5. Business Listings
DROP POLICY IF EXISTS "Allow public read access to business listings" ON public.business_listings;
DROP POLICY IF EXISTS "Allow write access to business listings" ON public.business_listings;

CREATE POLICY "Anyone can view public business listings" ON public.business_listings
    FOR SELECT USING (status = 'published' AND is_confidential = false);

CREATE POLICY "Owners can view their own listings" ON public.business_listings
    FOR SELECT TO authenticated USING (owner_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Owners can insert listings" ON public.business_listings
    FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Owners can update listings" ON public.business_listings
    FOR UPDATE TO authenticated USING (owner_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Owners can delete listings" ON public.business_listings
    FOR DELETE TO authenticated USING (owner_user_id = auth.uid()::VARCHAR);

-- 6. Memberships
DROP POLICY IF EXISTS "Allow read access to organization_memberships" ON public.organization_memberships;
DROP POLICY IF EXISTS "Allow write access to organization_memberships" ON public.organization_memberships;

CREATE POLICY "Users can view their own memberships" ON public.organization_memberships
    FOR SELECT TO authenticated USING (user_id = auth.uid()::VARCHAR);

CREATE POLICY "Org members can view other members" ON public.organization_memberships
    FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage memberships" ON public.organization_memberships
    FOR ALL TO authenticated USING (public.is_org_admin(organization_id));

-- 7. Candidate Profiles
DROP POLICY IF EXISTS "Allow read access to candidate_profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Allow write access to candidate_profiles" ON public.candidate_profiles;

CREATE POLICY "Users can view their own profile" ON public.candidate_profiles
    FOR SELECT TO authenticated USING (user_id = auth.uid()::VARCHAR);

CREATE POLICY "Users can insert their own profile" ON public.candidate_profiles
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::VARCHAR);

CREATE POLICY "Users can update their own profile" ON public.candidate_profiles
    FOR UPDATE TO authenticated USING (user_id = auth.uid()::VARCHAR);

-- 8. Business Access Requests
DROP POLICY IF EXISTS "Allow read access to business_access_requests" ON public.business_access_requests;
DROP POLICY IF EXISTS "Allow write access to business_access_requests" ON public.business_access_requests;

CREATE POLICY "Buyers can view their own requests" ON public.business_access_requests
    FOR SELECT TO authenticated USING (buyer_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Listing owners can view requests for their listings" ON public.business_access_requests
    FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.business_listings bl
        WHERE bl.id = listing_id AND bl.owner_user_id = auth.uid()::VARCHAR
      )
    );

CREATE POLICY "Buyers can insert requests" ON public.business_access_requests
    FOR INSERT TO authenticated WITH CHECK (buyer_user_id = auth.uid()::VARCHAR);

CREATE POLICY "Listing owners can update requests" ON public.business_access_requests
    FOR UPDATE TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.business_listings bl
        WHERE bl.id = listing_id AND bl.owner_user_id = auth.uid()::VARCHAR
      )
    );

-- 9. Audit Logs
DROP POLICY IF EXISTS "Allow read access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow write access to audit_logs" ON public.audit_logs;

CREATE POLICY "Org admins can view their orgs audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (user_id = auth.uid()::VARCHAR);

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
    FOR INSERT TO service_role WITH CHECK (true);

-- 10. Verification Audits
DROP POLICY IF EXISTS "Allow read access to verification_audits" ON public.verification_audits;
DROP POLICY IF EXISTS "Allow write access to verification_audits" ON public.verification_audits;

CREATE POLICY "Org admins can view their orgs verification audits" ON public.verification_audits
    FOR SELECT TO authenticated USING (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can insert verification audits" ON public.verification_audits
    FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));

-- ====================================================================
-- SCHEMA PERMISSIONS
-- ====================================================================

-- Revoke dangerous permissive grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Minimum required privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
`;

const newContent = content.substring(0, idx) + securePolicies;
fs.writeFileSync('supabase/schema.sql', newContent);
console.log('Done');
