-- ====================================================================
-- Migration: init_schema
-- ====================================================================
-- Initial production schema for OpportunityHub Liberia, migrated from
-- the former single supabase/schema.sql into the Supabase CLI's
-- migrations/ convention (one reviewable, timestamped file per change).
--
-- Content below is functionally identical to the schema.sql this
-- project shipped with previously -- reviewed end-to-end for syntax,
-- creation order, and FK correctness. Findings from that review:
--
--   * Table creation order was already FK-safe (every REFERENCES
--     target is created earlier in the file), so no reordering was
--     needed.
--   * No FK typos found -- every REFERENCES clause points at a table
--     and column that actually exists with a matching type
--     (VARCHAR(100) everywhere PKs/FKs are used).
--   * `created_by_user_id` (opportunities), `requested_by_user_id` /
--     `reviewer_user_id` (verification_audits) are intentionally left
--     without a FK to users -- this matches the existing pattern for
--     "soft" audit-style references elsewhere in the file (e.g.
--     audit_logs.user_id). Left as-is since changing it is a schema
--     design decision, not a bug; flagged in
--     docs/PRODUCTION_CERTIFICATION_REPORT.md for a follow-up
--     decision before Phase 3.
--   * "uuid-ossp" is enabled but nothing in this schema actually uses
--     uuid_generate_v4() -- all primary keys are app-generated
--     VARCHAR(100) ids. Left enabled (harmless, and Supabase permits
--     it) rather than dropped, since removing an extension the app
--     might start relying on is a bigger behavior change than this
--     phase should make silently.
--
-- RLS policies below are UNCHANGED from the original schema.sql.
-- A genuine RLS-adjacent bug (SECURITY DEFINER helper functions
-- without a pinned search_path) is fixed separately in the next
-- migration (20260907203853_secure_helper_function_search_path.sql)
-- so that change is independently reviewable.
-- ====================================================================

-- ====================================================================
-- OPPORTUNITY HUB LIBERIA - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Multi-Tenant Employer/Agency/NGO Entities)
CREATE TABLE IF NOT EXISTS public.organizations (
    id VARCHAR(100) PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    county VARCHAR(50) NOT NULL,
    city_district VARCHAR(100) NOT NULL,
    website_url VARCHAR(255),
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    description TEXT NOT NULL,
    employee_count_range VARCHAR(50),
    verification_status VARCHAR(50) DEFAULT 'unverified',
    verification_badge VARCHAR(50),
    settings JSONB DEFAULT '{
        "defaultCurrency": "USD",
        "candidateAlertEmail": "",
        "lowBandwidthDefault": false,
        "isPubliclyListed": true,
        "notifyOnApplications": true,
        "requireCoverNote": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Platform Profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    primary_role VARCHAR(50) NOT NULL,
    system_role VARCHAR(50) DEFAULT 'user',
    account_status VARCHAR(50) DEFAULT 'active',
    avatar_url VARCHAR(500),
    primary_county VARCHAR(50) DEFAULT 'Montserrado',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 3. Organization Memberships
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id VARCHAR(100) PRIMARY KEY,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    org_role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 4. Candidate Profiles
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    user_id VARCHAR(100) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    headline VARCHAR(255),
    bio TEXT,
    years_of_experience INTEGER DEFAULT 0,
    highest_education_level VARCHAR(100),
    cv_file_url VARCHAR(500),
    cv_raw_text TEXT,
    skills_json JSONB DEFAULT '[]'::jsonb,
    work_history_json JSONB DEFAULT '[]'::jsonb,
    education_history_json JSONB DEFAULT '[]'::jsonb,
    certifications_json JSONB DEFAULT '[]'::jsonb,
    portfolio_links_json JSONB DEFAULT '[]'::jsonb,
    is_profile_searchable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Opportunities (Jobs, Scholarships, Tenders, Internships)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id VARCHAR(100) PRIMARY KEY,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by_user_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    opportunity_type VARCHAR(50) NOT NULL,
    employment_type VARCHAR(50),
    workplace_model VARCHAR(50) NOT NULL,
    county VARCHAR(50) NOT NULL,
    location_details VARCHAR(255) NOT NULL,
    salary_currency VARCHAR(10) DEFAULT 'USD',
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    is_salary_negotiable BOOLEAN DEFAULT TRUE,
    is_salary_confidential BOOLEAN DEFAULT FALSE,
    description TEXT NOT NULL,
    responsibilities TEXT,
    requirements TEXT,
    skills_required JSONB DEFAULT '[]'::jsonb,
    application_deadline TIMESTAMPTZ,
    number_of_openings INTEGER DEFAULT 1,
    screening_questions JSONB DEFAULT '[]'::jsonb,
    required_documents JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'published',
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Applications
CREATE TABLE IF NOT EXISTS public.applications (
    id VARCHAR(100) PRIMARY KEY,
    opportunity_id VARCHAR(100) NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    applicant_user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    applicant_full_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(50),
    applicant_county VARCHAR(50),
    cover_letter TEXT,
    cv_url VARCHAR(500),
    screening_answers JSONB DEFAULT '[]'::jsonb,
    stage VARCHAR(50) DEFAULT 'submitted',
    evaluation_notes TEXT,
    internal_rating INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Business & MSME Listings (Marketplace)
CREATE TABLE IF NOT EXISTS public.business_listings (
    id VARCHAR(100) PRIMARY KEY,
    owner_user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    listing_type VARCHAR(50) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    county VARCHAR(50) NOT NULL,
    city_district VARCHAR(100) NOT NULL,
    asking_price_usd NUMERIC(14, 2),
    annual_revenue_usd NUMERIC(14, 2),
    annual_cash_flow_usd NUMERIC(14, 2),
    is_price_negotiable BOOLEAN DEFAULT TRUE,
    headline VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assets_included TEXT,
    reason_for_selling TEXT,
    years_established INTEGER DEFAULT 1,
    employee_count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'published',
    is_confidential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Business Access Requests (NDAs)
CREATE TABLE IF NOT EXISTS public.business_access_requests (
    id VARCHAR(100) PRIMARY KEY,
    listing_id VARCHAR(100) NOT NULL REFERENCES public.business_listings(id) ON DELETE CASCADE,
    buyer_user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    buyer_full_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    nda_signed BOOLEAN DEFAULT FALSE,
    nda_signed_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    organization_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Verification Audits
CREATE TABLE IF NOT EXISTS public.verification_audits (
    id VARCHAR(100) PRIMARY KEY,
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    requested_by_user_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_badge VARCHAR(50) NOT NULL,
    documents_submitted JSONB DEFAULT '[]'::jsonb,
    reviewer_user_id VARCHAR(100),
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON public.opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_county ON public.opportunities(county);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_applications_opp ON public.applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON public.applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_org ON public.applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_listings_status ON public.business_listings(status);


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
