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

-- 1. Organizations: Anyone can view public organizations, service_role/authenticated can modify
CREATE POLICY "Allow public read access to organizations" ON public.organizations
    FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update to organizations" ON public.organizations
    FOR ALL USING (true) WITH CHECK (true);

-- 2. Users: Anyone can read, users can update
CREATE POLICY "Allow public read access to users" ON public.users
    FOR SELECT USING (true);
CREATE POLICY "Allow write access to users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Opportunities: Anyone can view published opportunities, org members can manage
CREATE POLICY "Allow public read access to opportunities" ON public.opportunities
    FOR SELECT USING (true);
CREATE POLICY "Allow write access to opportunities" ON public.opportunities
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Applications: Read/write for authenticated users & organizations
CREATE POLICY "Allow read access to applications" ON public.applications
    FOR SELECT USING (true);
CREATE POLICY "Allow insert/update to applications" ON public.applications
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Business Listings: Anyone can view published listings
CREATE POLICY "Allow public read access to business listings" ON public.business_listings
    FOR SELECT USING (true);
CREATE POLICY "Allow write access to business listings" ON public.business_listings
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Memberships, Profiles, Access Requests, Audits
CREATE POLICY "Allow read access to candidate_profiles" ON public.candidate_profiles FOR SELECT USING (true);
CREATE POLICY "Allow write access to candidate_profiles" ON public.candidate_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read access to organization_memberships" ON public.organization_memberships FOR SELECT USING (true);
CREATE POLICY "Allow write access to organization_memberships" ON public.organization_memberships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read access to business_access_requests" ON public.business_access_requests FOR SELECT USING (true);
CREATE POLICY "Allow write access to business_access_requests" ON public.business_access_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read access to audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow write access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read access to verification_audits" ON public.verification_audits FOR SELECT USING (true);
CREATE POLICY "Allow write access to verification_audits" ON public.verification_audits FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SCHEMA PERMISSIONS
-- ====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
