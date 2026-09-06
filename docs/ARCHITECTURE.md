# OPPORTUNITYHUB LIBERIA — SYSTEM ARCHITECTURE SPECIFICATION

## 1. System Topology & Technology Stack

```
+------------------------------------------------------------------------------------+
|                                CLIENT LAYER (PWA)                                 |
|  React 19 + TypeScript | Tailwind CSS v4 | Motion | Lucide Icons | Service Worker   |
|  Responsive Mobile-First (Android / iOS / Desktop) | Dual-Currency (USD / LRD)    |
+------------------------------------------+-----------------------------------------+
                                           | HTTPS / JSON
                                           v
+------------------------------------------------------------------------------------+
|                              APPLICATION GATEWAY LAYER                              |
|  Node.js + Express 4.x / tsx runtime | Reverse Proxy (Port 3000)                   |
|  - Rate Limiting & Request Throttling    - Tenant Resolution Middleware             |
|  - Auth & RBAC Guard Middleware          - Input Sanitization (Zod / Validator)    |
|  - Audit Logging Pipeline                - CORS & Security Headers (Helmet)         |
+------------------------------------------+-----------------------------------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
+------------------------------------+   +-------------------------------------------+
|      ENTERPRISE DATA ACCESS LAYER  |   |           INTELLIGENCE SERVICE            |
|  Relational Storage Engine         |   |  Server-Side Gemini 2.5 via @google/genai |
|  - Organization Tenant Scoping     |   |  - CV Parsing & Skill Extraction          |
|  - Foreign Key Constraints         |   |  - Candidate-Opportunity Semantic Match   |
|  - Transactional Isolation         |   |  - Vacancy Description Copilot            |
|  - Secure Document Gatekeeper      |   |  - Suspicious Listing / Fraud Detection   |
+------------------------------------+   +-------------------------------------------+
```

### Core Technologies
* **Frontend**: React 19 (Strict Mode), TypeScript (5.8+), Tailwind CSS v4, Motion (`motion/react`), Lucide React.
* **Backend Server**: Node.js, Express, tsx (dev), esbuild CJS bundle (production).
* **Intelligence Layer**: Google GenAI SDK (`@google/genai`) hosted strictly on server-side endpoints (`/api/ai/*`) using `process.env.GEMINI_API_KEY`.
* **Client Architecture**: Single Page Application with client-side routing, modular feature packages, reactive state, and Progressive Web App manifest/service worker caching.

---

## 2. Multi-Tenant Architecture & Authorization

### Tenant Hierarchy
1. **Platform Level**: Governed by Platform Administrators, Super Admins, System Auditors, Verification Officers, and Content Moderators. Provides global oversight and governance audit logging.
2. **Organization Tenant Level**: The primary isolation boundary for enterprises:
   * **Supported Types**:
     * **Private Companies** (`private_company`): Commercial corporations, manufacturing, logistics, and agribusiness.
     * **NGOs** (`ngo`): Local and international non-governmental organizations, humanitarian charities, and foundations.
     * **Government Institutions** (`government_institution`): Ministries, departments, county authorities, and state-owned enterprises.
     * **Recruitment Agencies** (`recruitment_agency`): Employment bureaus and staffing intermediaries managing multiple client pipelines.
     * **Small Businesses** (`small_business`): MSMEs, cooperatives, local retail, and service workshops.
     * **Educational Institutions** (`education`): Colleges, technical vocational training centers (TVET), and universities.
   * Every organizational resource (`jobs`, `opportunities`, `applications`, `businesses`, `billing_profiles`, `invitations`) carries an explicit `organization_id` foreign key.
   * Centralized gatekeeper `assertUserInTenant(actorUserId, organizationId, requiredPermissions)` strictly enforces boundary isolation. Any cross-tenant read or mutation throws `TenantIsolationError`.
3. **User Level**: Individuals with independent accounts (Job Seekers, Freelancers, Investors, Buyers). Users can belong to multiple organizations with distinct organizational roles and scoped permissions in each.

### Organization Roles & Permissions
* **`owner`**: Organization founder or designated director. Holds universal permissions (`all`) within the organization. Protected by **Sole Owner Invariant**: cannot be removed or demoted if they are the organization's only owner.
* **`admin`**: Institutional administrator. Can manage members, invite collaborators, edit organizational profile and settings, and oversee all vacancies.
* **`recruiter`**: Talent acquisition specialist. Can post/edit vacancies, screen applicants, schedule interviews, and evaluate candidate submissions.
* **`hiring_manager`**: Department lead. Can review applications and leave interview evaluations for department-specific postings.
* **`member`**: Base organization staff member with read access to organizational workspace.

### Organization Settings & Customization
Each organization tenant maintains a discrete settings object:
* `defaultCurrency`: Primary operating currency (`USD` or `LRD`).
* `candidateAlertEmail`: Notification dispatch address for new candidate submissions.
* `lowBandwidthDefault`: Forces lightweight data transfer modes for branch offices in low-connectivity counties.
* `isPubliclyListed`: Toggles inclusion in the national directory of verified employers and service providers.
* `notifyOnApplications`: Immediate alerts on applicant activity.
* `requireCoverNote`: Enforces mandatory applicant motivation statement on all vacancy postings.

### Role-Based Access Control (RBAC) Matrix

| Resource / Action | Job Seeker | Org Member | Org Admin | Agency Recruiter | Verifier | Platform Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Browse Published Opportunities | Allow | Allow | Allow | Allow | Allow | Allow |
| Apply to Vacancy / Submit Proposal | Allow | Deny | Deny | Deny | Deny | Deny |
| Post Job / Opportunity | Deny | Tenant Scope | Tenant Scope | Tenant Scope | Deny | Allow (Audit) |
| Review Candidate CVs & Applications | Deny | Tenant Scope | Tenant Scope | Tenant Scope | Deny | Global Audit |
| Advance Hiring Stage (Interview/Offer)| Deny | Tenant Scope | Tenant Scope | Tenant Scope | Deny | Global Audit |
| Edit Org Settings & Profile | Deny | Deny | Tenant Scope | Tenant Scope | Deny | Global Full |
| Invite & Manage Org Members | Deny | Deny | Tenant Scope | Deny | Deny | Global Full |
| Request Organization Verification | Deny | Deny | Tenant Scope | Deny | Deny | Deny |
| Request Confidential Business Info | Buyer Auth | Buyer Auth | Buyer Auth | Buyer Auth | Deny | Global Audit |
| Approve Confidential Buyer Access | Deny | Seller Scope| Seller Scope| Seller Scope | Deny | Global Audit |
| Approve Organization / Badge Verif | Deny | Deny | Deny | Deny | Allow | Allow |
| Global User & System Moderation | Deny | Deny | Deny | Deny | Flag Only | Allow |

---

## 3. Relational Database Architecture

The schema is structured with full foreign key constraints, enumerated lifecycle states, soft deletion flags, and timestamp auditing.

### Key Entities & Tables

```sql
-- 1. Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'private_company', 'ngo', 'government', 'recruitment_agency', 'small_business', 'education'
    industry VARCHAR(100) NOT NULL,
    county VARCHAR(50) NOT NULL, -- e.g. 'Montserrado', 'Nimba', 'Bong'
    city_district VARCHAR(100) NOT NULL,
    website_url VARCHAR(255),
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    description TEXT NOT NULL,
    employee_count_range VARCHAR(50),
    verification_status VARCHAR(50) DEFAULT 'unverified', -- 'unverified', 'pending', 'verified', 'rejected'
    verification_badge VARCHAR(50), -- 'verified_company', 'verified_ngo', 'verified_government', 'verified_recruiter'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    system_role VARCHAR(50) DEFAULT 'user', -- 'user', 'moderator', 'verifier', 'finance_admin', 'platform_admin'
    account_status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'deactivated'
    avatar_url VARCHAR(500),
    primary_county VARCHAR(50) DEFAULT 'Montserrado',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Organization Memberships (Multi-Tenant Mapping)
CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_role VARCHAR(50) NOT NULL, -- 'owner', 'admin', 'recruiter', 'hiring_manager', 'member'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'invited', 'suspended'
    permissions JSONB DEFAULT '[]'::jsonb, -- e.g. ['all'] or ['opportunities.create', 'applications.view']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 4. Organization Invitations
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    org_role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'revoked'
    invited_by_user_id UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Job Seeker & Candidate Profiles
CREATE TABLE candidate_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Opportunities & Jobs
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    opportunity_type VARCHAR(50) NOT NULL, -- 'job', 'internship', 'scholarship', 'fellowship', 'training', 'contract', 'tender', 'consultancy', 'grant', 'partnership'
    employment_type VARCHAR(50), -- 'full_time', 'part_time', 'contract', 'temporary', 'remote'
    workplace_model VARCHAR(50) NOT NULL, -- 'on_site', 'hybrid', 'remote'
    county VARCHAR(50) NOT NULL,
    location_details VARCHAR(255) NOT NULL,
    salary_currency VARCHAR(10) DEFAULT 'USD', -- 'USD', 'LRD'
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    is_salary_negotiable BOOLEAN DEFAULT TRUE,
    is_salary_confidential BOOLEAN DEFAULT FALSE,
    description TEXT NOT NULL,
    responsibilities TEXT,
    requirements TEXT,
    skills_required JSONB DEFAULT '[]'::jsonb,
    application_deadline TIMESTAMP WITH TIME ZONE,
    number_of_openings INTEGER DEFAULT 1,
    screening_questions JSONB DEFAULT '[]'::jsonb,
    required_documents JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_review', 'published', 'paused', 'expired', 'closed', 'rejected'
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Applications & Pipeline Tracking
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_url VARCHAR(500) NOT NULL,
    cover_letter TEXT,
    screening_answers JSONB DEFAULT '{}'::jsonb,
    attached_documents JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'applied', -- 'applied', 'under_review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'
    recruiter_rating INTEGER CHECK (recruiter_rating BETWEEN 1 AND 5),
    internal_notes TEXT,
    ai_match_score NUMERIC(5, 2),
    ai_match_summary TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(opportunity_id, candidate_user_id)
);

-- 7. Businesses for Sale (M&A Marketplace)
CREATE TABLE business_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    seller_user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    county VARCHAR(50) NOT NULL,
    location_summary VARCHAR(255) NOT NULL,
    is_confidential BOOLEAN DEFAULT FALSE,
    public_teaser TEXT NOT NULL,
    confidential_description TEXT,
    asking_price_usd NUMERIC(14, 2) NOT NULL,
    annual_revenue_usd NUMERIC(14, 2),
    annual_profit_usd NUMERIC(14, 2),
    established_year INTEGER,
    employee_count INTEGER,
    assets_included TEXT,
    reason_for_sale TEXT,
    photos_urls JSONB DEFAULT '[]'::jsonb,
    verification_status VARCHAR(50) DEFAULT 'unverified',
    status VARCHAR(50) DEFAULT 'published', -- 'draft', 'pending_review', 'published', 'under_offer', 'sold', 'archived'
    views_count INTEGER DEFAULT 0,
    inquiries_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Business Confidentiality Access Requests
CREATE TABLE business_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_listings(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nda_accepted BOOLEAN DEFAULT FALSE,
    nda_signed_at TIMESTAMP WITH TIME ZONE,
    proof_of_funds_note TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    seller_response_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Subscriptions & Billing Plans
CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY, -- 'free_starter', 'pro_recruiter', 'growth_agency', 'enterprise_partner'
    name VARCHAR(100) NOT NULL,
    monthly_price_usd NUMERIC(10, 2) NOT NULL,
    annual_price_usd NUMERIC(10, 2) NOT NULL,
    active_posts_limit INTEGER NOT NULL,
    cv_search_limit_monthly INTEGER NOT NULL,
    featured_posts_included INTEGER NOT NULL,
    team_members_limit INTEGER NOT NULL,
    ai_matching_included BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing'
    billing_interval VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'annual'
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Verification Requests & Audits
CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    submitted_by_user_id UUID NOT NULL REFERENCES users(id),
    registry_number VARCHAR(100), -- LBR registration number
    tax_identification_number VARCHAR(100), -- TIN
    official_document_urls JSONB DEFAULT '[]'::jsonb,
    requested_badge VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected'
    reviewed_by_user_id UUID REFERENCES users(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Security Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL, -- 'auth.login', 'job.published', 'access_request.approved', 'verification.granted'
    target_entity VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    payload_diff JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. AI Architecture & Ethical Guardrails

### Core Server-Side AI Pipelines
All AI execution is centralized through dedicated server routes (`/api/ai/*`) using the Google GenAI SDK (`@google/genai`). No client-side direct API key execution.

1. **Job Description & Opportunity Generator (`/api/ai/draft-opportunity`)**:
   * Assists employers in generating clear, structured vacancies, requirements, and screening questions based on industry standards and local context in Liberia.
2. **CV Parsing & Skills Structuring (`/api/ai/parse-cv`)**:
   * Extracts skills, education, employment tenure, and contact details from unstructured CV text into standardized JSON schemas.
3. **Candidate-Job Semantic Match Assistant (`/api/ai/match-candidate`)**:
   * Computes match scores (0-100%) and objective rationale based on skills overlap and requirement fulfillment.
4. **Fraud & Scam Detection (`/api/ai/detect-fraud`)**:
   * Scans job descriptions and business teasers for advance-fee recruitment scams, requests for interview processing fees, unrealistic salary-to-skill ratios, and impersonation indicators.

### Ethical AI Directives
* **Strict Non-Autonomous Hiring Decision Rule**: AI match scores are strictly decision-support aids for human recruiters. System design explicitly prohibits automated rejection or automated hiring.
* **Bias Mitigation**: Prompts are constrained to assess strictly verified competencies, technical skills, and demonstrable qualifications, ignoring demographic variables.

---

## 5. Security & Trust Architecture

1. **Strict Multi-Tenant Isolation Enforcement**:
   * **Central Gatekeeper Pattern**: All tenant-scoped operations must pass through `assertUserInTenant(actorUserId, organizationId, requiredPermissions)` at the database/data-access layer. Frontend checks are treated strictly as UX optimizations.
   * **Boundary Guarantees**: An authenticated member or admin of Organization A cannot access Organization B's members, invitations, settings, private listings, or candidate job applications. Any cross-tenant attempt throws `TenantIsolationError` with code `403`.
   * **Sole Owner Invariant**: An organization cannot remove or demote its last active `owner`. Any attempt throws `ValidationError` to prevent orphaned enterprise accounts.
   * **Invitation Life-Cycle Security**: Organization invitations generate single-use, 7-day cryptographic tokens (`inv_...`). Once accepted, rejected, or revoked, tokens are invalidated and cannot be replayed.
   * **Platform Governance Auditing**: Platform administrators may access across tenants solely for compliance, fraud intervention, or dispute resolution. All such accesses emit structured audit log entries (`action: 'platform.admin_access'`).

2. **Confidential Business Sale Protections**:
   * Revenue, profits, exact location, and facility documents remain encrypted/hidden behind an explicit `business_access_requests` gate.
   * Buyers must sign/acknowledge an electronic Non-Disclosure Agreement (NDA) and obtain seller approval before confidential fields are returned by the API.

3. **Rate Limiting & Anti-Scam Verification**:
   * IP and user-based rate limiters on application submission and vacancy publishing to prevent bot spam.
   * Mandatory verification check alerts on all postings originating from unverified organizations.

4. **Secret Management**:
   * Zero secrets committed to frontend code. `process.env.GEMINI_API_KEY` and future database/payment credentials remain isolated in server environment execution.

---

## 6. Progressive Web App (PWA) & Mobile-First Strategy

1. **Low-Bandwidth Adaptation**:
   * Initial page bundle optimized under 200KB gzipped.
   * Skeleton loaders rather than blocking spinners.
   * Compressed WebP/SVG assets.
2. **Touch-First Accessibility**:
   * Minimum touch target dimensions: 44x44px.
   * Action bars anchored to the viewport bottom for single-hand mobile ergonomics.
   * Form inputs with appropriate HTML input types (`tel`, `email`, `number`) for optimal virtual keyboards.
3. **Service Worker Strategy**:
   * Stale-while-revalidate strategy for public opportunity feeds and search indexes.
   * Network-first strategy for authenticated user applications, messages, and administrative actions.
   * Graceful offline fallbacks with persistent offline indicators.
