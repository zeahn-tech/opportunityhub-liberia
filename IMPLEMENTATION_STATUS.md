# OpportunityHub Liberia — Implementation Status

## Overview
OpportunityHub Liberia is a high-integrity digital opportunity and business exchange marketplace specifically engineered for Liberia's economic landscape. It features multi-tenant job and tender management, verified enterprise credentials, business acquisition data rooms, candidate profile management, and comprehensive candidate recruitment pipelines.

---

## 1. Core Job Marketplace Implementation

### 1.1 Job & Opportunity Creation & Drafts
- **Draft Creation**: Employers, institutions, and asset sellers can create listings in `draft` mode without publishing them to the public feed.
- **Direct Publishing**: Opportunities and business listings can be published directly, broadcasting across all 15 Liberian counties.
- **Reusable Opportunity Architecture**:
  - Expanded opportunity types beyond standard jobs: `job`, `tender`, `consultancy`, `internship`, `scholarship`, `fellowship`, `training`, `grant`, `contract`, `volunteer`, `partnership`, `investment`.
  - Shared lifecycle, application engine, screening questions, and search/filter infrastructure.
  - Employment Type (`full_time`, `part_time`, `contract`, `internship`, `temporary`, `volunteer`).
  - Workplace Model (`on_site`, `hybrid`, `remote`).
  - 15 Liberian Counties selection with localized city/district precision.
  - Compensation & Funding: Currency selector (USD / LRD), Salary/Valuation Min/Max, negotiable toggle, and confidential toggle.
  - Vacancy openings count, application deadlines, summary, structured responsibilities, requirements, and skill tags.
  - Screening Questions engine for upfront candidate qualification.

### 1.2 Job Editing & Duplication
- **In-Place Editing**: Authorized employers can update existing vacancies (salary ranges, requirements, deadlines, workplace models, and responsibilities).
- **Template Duplication**: Quick 1-click duplication of previous postings as new drafts with randomized unique slug keys and fresh 30-day deadlines.

### 1.3 Lifecycle State Machine
- **Draft** (`draft`): Visible only in the author organization's Job Management Dashboard.
- **Published** (`published`): Live on the public feed and search engine; accepting applications.
- **Closed** (`closed`): Live postings manually withdrawn from accepting candidates.
- **Expired** (`expired`): Automatically identified and transitioned when the deadline date is in the past.
- **State Transitions Supported**:
  - `Draft -> Published` (1-click publish)
  - `Published -> Draft` (Unpublish)
  - `Published -> Closed` (Close position)
  - `* -> Expired` (Deterministic deadline evaluation & automated cron sweep)
  - `* -> Deleted` (Permanent soft-purge with cascading audit trail)

### 1.4 Job Detail & Public Feed
- **Job Detail Modal**: Rich view including compensation breakdown (dual currency with real-time USD/LRD rate conversion), verified organization badge, county location, screening questions, and direct candidate application flow.
- **Employer Controls**: Context-aware owner action bar (Edit Vacancy, Close, Unpublish, Delete) available exclusively to authorized organization members or platform administrators.

### 1.5 Multi-Parameter Search & Filtering
- **Keyword Search**: Substring match against job title, organization name, county, district, summary, description, and skill tags.
- **County Filter**: Filter by any of Liberia's 15 counties (`Montserrado`, `Nimba`, `Bong`, `Grand Bassa`, `Margibi`, `Maryland`, `Lofa`, etc.).
- **Opportunity Category**: Filter across Jobs, Public Tenders, Consultancies, Internships, and Grants.
- **Employment Type**: Filter by Full-Time, Contract, Internship, Part-Time, Temporary.
- **Workplace Model**: Filter by On-Site, Hybrid, and Remote.
- **Minimum Salary Threshold**: Real-time numeric compensation filtering.
- **One-Click Reset**: Instant clearance of active filters.

### 1.6 Job Management Dashboard
- **Centralized Employer Control**: Dedicated management view within the Recruiter Workspace.
- **Status Tab Filtering**: `All`, `Published`, `Draft`, `Expired`, and `Closed` tabs with dynamic counts.
- **Metric Cards**: Real-time counter of total vacancies, active published listings, drafts in progress, and total applications received.
- **Inline Action Modals**: Confirmations for closing, unpublishing, duplicating, and deleting positions.

### 1.7 Multi-Tenancy & Authorization Security
- **Tenant Isolation**: Strict enforcement ensuring recruiters and employers can only view, create, edit, or delete vacancies belonging to their authorized `organization_id`.
- **Server/DB-Side Authorization**: RBAC matrix and database-level checks reject cross-tenant manipulation with HTTP 403 Forbidden errors.

---

## 2. Business-for-Sale M&A Marketplace & Confidential Data Room

### 2.1 Owner Listing Creation & Management
- **Detailed Business Profile**: Business Name, Tagline, Industry Category, Founded Year, County/Location, Employee Count, Ownership Structure.
- **Financial & Price Metrics**: Asking Price, Currency (USD/LRD), Annual Revenue, Net Annual Profit, Gross Profit Margin, EBITDA.
- **Asset Breakdown & Valuation**: Structured asset list (e.g. real estate, equipment, inventory, licenses, customer base, brand/IP) with estimated valuations.
- **Strategic Context**: Comprehensive reason for sale, transition support period, and growth opportunities.
- **Photo Gallery**: Support for business imagery and asset photos.
- **Public vs. Confidential Toggle**: Option to publish a publicly named listing or a confidential listing (e.g., "Established Monrovia Supermarket Chain") with hidden identity.

### 2.2 Buyer Search, Filtering & Saved Listings
- **Multi-Factor Search**: Search across business name, industry, summary, location, and reason for sale.
- **Industry & Location Filters**: Filter by industry category, county, asking price range, and verification badge.
- **Saved Listings**: One-click bookmarking of business listings to personal saved workspace.

### 2.3 Confidentiality Controls & NDA Data Room Gating
- **Public Exposure Gating**: For confidential listings, sensitive metrics (exact location, specific financial figures, asset breakdown, owner identity) are hidden by default.
- **Digital NDA Agreement Workflow**: Buyers click "Sign NDA & Request Access" to sign a digital non-disclosure agreement.
- **Owner Approval Engine**: Listing owners receive access requests and can grant or revoke access to the confidential data room.
- **Unlocked Access State**: Once approved, the buyer gains full visibility into financial records, detailed assets, and contact mechanisms.

### 2.4 Buyer Inquiries & Direct Seller Contact
- **Information Request Modal**: Buyers can send formal inquiry messages, proposed acquisition structures, proof of funds status, and contact details directly to the seller.
- **Inquiry Management**: Sellers receive structured inquiries with direct email/phone contact information.

### 2.5 Verification & Moderation Architecture
- **Admin Verification Panel**: Platform moderators can review pending business listings.
- **Verification Status**: Listings undergo verification checks to ensure legitimacy (Verified vs Unverified badge).
- **Moderation Actions**: Approve/Publish, Reject with reason, or Flag listings to maintain high marketplace integrity.

---

## 3. Candidate & Application System Implementation

### 2.1 Candidate Professional Profile
- **Personal Information**: Full Name, Email, Phone Number, County Location (Liberia 15-county system), City/District, and Profile Avatar.
- **Professional Headline & Bio**: Highlighting career specializations (e.g., "Senior Supply Chain & Logistics Director").
- **Structured Career Timeline**:
  - **Education**: Degree, Field of Study, Institution (e.g. University of Liberia, Cuttington University, Stella Maris Polytechnic), County location, Start/End years.
  - **Work Experience**: Company, Job Title, Geographic Location, Date ranges, current role toggle, and key achievements.
  - **Skills Inventory**: Primary hard and soft skills with category tagging and proficiency levels.
  - **Certifications**: Credential name, Issuing Authority (e.g., APICS, PMI, ACCA, LIPA), Issue Date, and Credential ID/URL.
  - **Languages**: Native and working languages with proficiency levels (including Liberian English / Koloqua, Kpelle, Bassa, Mano, Gio).
  - **Portfolio & Publications**: Project titles, descriptions, and verified URLs.
  - **Curriculum Vitae (CV / Resume)**: Direct file upload (PDF/DOCX) with real-time base64 data encoding, size calculations, and in-app document preview.

### 2.2 Privacy & Security Controls
- **Granular Privacy Toggles**:
  - `Profile Visibility`: `public` (discoverable in talent directory), `anonymous` (masked identifier and redacted avatar), or `hidden` (private).
  - `Contact Information`: `public`, `on_application_only` (masked as `[Visible upon application]` unless candidate has submitted an active application to the viewing employer), or `hidden`.
  - `CV Download Rights`: Open or restricted strictly to employers where the candidate has applied.
- **Access Control Guarantee**: Private candidate data is never exposed publicly or leaked across unrelated organizations.

### 2.3 Application Lifecycle & Submission Flow
- **Direct Application Submission**:
  - Candidate profile pre-fills personal, contact, and county information.
  - One-click CV attachment from candidate profile with instant preview.
  - Custom Cover Note builder.
  - Dynamic Screening Questions answer form for vacancies with qualification gates.
- **Candidate Application Tracking Dashboard**:
  - Real-time application status list (`Applied`, `Reviewing`, `Shortlisted`, `Interview`, `Offer`, `Hired`, `Rejected`, `Withdrawn`).
  - Interview scheduling details card (datetime, video link / in-person venue, interviewers, preparation instructions).
  - Formal Hiring Offer card (offered salary in USD/LRD, contract type, start date, offer expiry, downloadable offer letter, terms).
  - Rejection feedback transparency card.
  - Full audit trail timeline showing history of stage transitions with timestamps.
- **Candidate Self-Service Actions**:
  - **Withdraw Application**: Candidate can withdraw an active application at any point with a structured reason, creating an immutable audit event.

### 2.4 Recruiter Application Dashboard & Pipeline Management
- **Pipeline Stage Progression**:
  - `Applied` -> `Reviewing` -> `Shortlisted` -> `Interview` -> `Offer` -> `Hired` (or `Rejected`).
- **Interview Scheduling Modal**:
  - Date & Time picker.
  - Mode: `In-Person`, `Video Call`, `Phone Interview`.
  - Venue location address or secure meeting URL.
  - Panel interviewers list and preparation notes.
- **Formal Hiring Offer Modal**:
  - Offered Salary and Currency selection (USD / LRD).
  - Start Date, Contract Type, Expiry Date.
  - Offer letter URL or upload link and binding terms.
- **Applicant Evaluation & Scoring**:
  - 1-to-5 star rating system.
  - Strengths and areas for improvement breakdown.
  - Internal recruiter notes.
- **Rejection Notice Modal**: Structured rejection reason recorded for compliance and transparent candidate feedback.

---

## 3. Automated Test Suite & Quality Assurance

### Vitest Test Suite Overview (67 Passing Tests across 9 Test Suites)
1. `candidateAndApplication.test.ts` (7 tests):
   - Comprehensive candidate profile retrieval, update, and persistence.
   - Privacy masking and hidden profile enforcement for unauthorized viewers.
   - Job seeker application submission with screening question answers and resume.
   - Candidate application withdrawal workflow with audit history.
   - Full hiring lifecycle stage progression (Applied -> Shortlisted -> Interview -> Offer -> Hired).
   - Recruiter applicant rejection workflow with reason.
   - Candidate scoring and evaluation persistence.
2. `jobMarketplace.test.ts` (10 tests):
   - Draft creation workflow.
   - Publishing draft workflow.
   - In-place vacancy editing.
   - Unpublishing live jobs to draft.
   - Vacancy closure.
   - Job duplication as draft.
   - Permanent job deletion.
   - Multi-tenant boundary isolation validation (cross-tenant 403 enforcement).
   - Multi-parameter filtering (County, Employment Type, Workplace Model, Salary, Keywords).
   - Automated deadline expiration handling.
3. `rbac.test.ts` (4 tests): Role-based permission matrix validation.
4. `dbClient.test.ts` (5 tests): Relational storage adapter and tenant isolation checks.
5. `services.test.ts` (4 tests): Service layer integration.
6. `organizations.test.ts` (12 tests): Multi-organization governance and settings.
7. `auth.test.ts` (19 tests): Authentication, session generation, and password hashing.
8. `logger.test.ts` (2 tests): Structured logging and sensitive field redaction.
9. `env.test.ts` (4 tests): Environment configuration and fallback validation.

---

## 4. AI-Ready Intelligence Layer Implementation

### 4.1 Server-Side Gemini Architecture & Abstraction Layer
- **`IAIProvider` Strategy Pattern**:
  - Provider abstraction interface (`src/services/ai/aiTypes.ts`) defining 5 core AI operations.
  - `GeminiAIProvider` (`src/services/ai/geminiAIProvider.ts`): Communicates with backend Express API routes (`/api/ai/*`) using `@google/genai` (`gemini-3.8-flash`).
  - `FallbackAIProvider` (`src/services/ai/fallbackAIProvider.ts`): Deterministic heuristic engine ensuring 100% operational uptime when Gemini API keys are missing or offline.
  - `AIService` Facade (`src/services/ai/aiService.ts`): Orchestrates provider routing, sanitization guardrails, latency tracking, and audit logging.

### 4.2 Non-Discrimination Guardrails & Demographic Sanitization
- **Demographic Scrubbing (`aiGuardrails.ts`)**:
  - Candidate profiles automatically stripped of gender, age, birth date, ethnicity, tribe, religion, marital status, photo, and disability status before LLM evaluation.
- **Explainable Matching Signals**:
  - Candidate match scores evaluated strictly across 4 objective dimensions: Skill Overlap (40%), Experience Depth (30%), County Location Alignment (15%), and Education/Credentials (15%).
- **Assistive Policy Enforcement**:
  - System instructions explicitly mandate that AI acts purely as an assistive decision-support copilot. Final hiring, tender, and grant determinations are strictly conducted by authorized human reviewers.

### 4.3 Implemented AI Modules & User Interfaces
1. **Personalized Job Recommendations**:
   - `AiJobRecommendationsWidget`: Embedded in Candidate Portal & Opportunities view, displaying match % badges, county alignment, and match reasons.
2. **Candidate Match Analysis Drawer**:
   - `AiCandidateMatchModal`: Recruiter workspace tool displaying explainable signal breakdown bars, key strengths, recommended growth areas, and ethical notice.
3. **Resume / CV Auto-Parser**:
   - `AiCvParserModal`: Converts raw CV text into structured profile JSON (summary, skills, work history array, education, and county location).
4. **Job Description & Screening Questions Assistant**:
   - `AiStudioHub`: Employers draft vacancies, structured responsibilities, key requirements, and candidate screening questions.
5. **AI Semantic Search Engine**:
   - `AiSemanticSearchBar`: Search bar with AI mode that parses natural language queries into structured intent chips (County, Salary, Type, Keywords) and semantically ranks search results.
6. **AI Intelligence Studio Hub**:
   - Dedicated tab (`AiStudioHub`) for testing all 5 AI capabilities live, inspecting audit logs, and reviewing non-discrimination compliance.

### 2.5 Secure Platform Messaging & Multi-Channel Notification Infrastructure

- **Direct & Contextual Platform Messaging (`MessagingCenter.tsx`)**:
  - Encrypted candidate-recruiter messaging, buyer-seller M&A data room inquiries, institutional procurement, and direct messaging.
  - Category filtering (`Jobs & Recruiting`, `M&A Deals`, `Organizations`, `All`), keyword search, unread thread counters, and candidate role badges.
  - Multi-format file attachments with in-app previews for PDFs, Images, and Documents.
  - Built-in Trust & Safety controls: User Blocking/Unblocking and Conduct Violation Reporting with administrative review queue.
- **Multi-Channel Notification Engine (`notificationService.ts`)**:
  - Real-time in-app alerts and pluggable dispatchers for Email (SendGrid/Resend) and Push/SMS (WebPush/Twilio).
  - Trigger dispatches for new messages, candidate application status transitions, interview invitations with schedule/link details, AI job recommendations, M&A deal room inquiries, and organizational verification/subscription changes.
- **Notification Center Drawer (`NotificationCenterModal.tsx`)**:
  - Real-time unread badge counter in main navigation bar.
  - Filterable notification drawer with 1-click navigation to application pipelines, messages, M&A data rooms, and billing dashboards.

### 2.6 Platform Trust and Safety System

- **Statutory Entity & Recruiter Verification Engine (`trustSafetyService.ts`)**:
  - Verification submission workflows for Organizations, Recruiters, and Business Sellers.
  - Verification Evidence Dossier uploads: LBR Business Certificate, LRA Tax Clearance, MOFA accreditation, Ministry of Labour Employment Agency permits.
  - Official badges issued upon review: `verified_company`, `verified_ngo`, `verified_government`, `verified_recruiter`, `verified_business`.
- **Automated Content Moderation Engine (`scanContentForScams`)**:
  - Automated keyword scanner catching illegal application fee requests ("pay fee", "registration fee", "Western Union", "send cash").
  - Anomaly salary detection flagging unrealistic pay ratio claims.
  - Automated status classification: `published`, `pending_review`, `flagged`, `quarantined`.
- **Community Violation Reporting Workflow (`ReportModal.tsx`)**:
  - Embedded violation report triggers on all job cards and listings.
  - Categorized reporting options: scam/fee charging, misleading salary, fake entity identity, harassment, impersonation, spam, discrimination.
  - Auto-quarantine trigger: listings accumulating >= 2 user reports automatically quarantined for officer review.
- **Trust & Safety Officer Command Center (`TrustSafetyAdminCenter.tsx`)**:
  - Dedicated administrative dashboard accessible via `Trust & Safety` navigation tab.
  - 6 Sub-Tab Control Views:
    1. **Statutory Verification Evidence Queue**: Review submitter dossier documents, verify LBR/TIN numbers, approve or reject with official badge grant.
    2. **Content Moderation Queue**: Inspect flagged job and business postings with automated risk triggers and 1-click quarantine/publish controls.
    3. **User & Listing Reports**: Action community violation reports with warnings, content quarantine, account restrictions, or dismissal.
    4. **Account Restrictions Manager**: Issue and lift targeted sanctions (`posting_disabled`, `messaging_disabled`, `applications_disabled`, `deal_room_disabled`, `full_suspension`).
    5. **Suspicious Anomaly Log**: Real-time log of keyword flags and rate-limit hits.
    6. **Immutable Platform Audit Trail**: Full searchable event log capturing all admin actions, reviewer IDs, timestamps, and details.
- **Sliding-Window Rate Limiting (`rateLimiterService.ts`)**:
  - In-memory sliding-window rate limit enforcement on job postings, messaging, verification submissions, and application submissions.

---

## 5. Next Milestones & Roadmap
- [x] Business Acquisition & Confidential Data Room module.
- [x] AI-Ready Intelligence Layer & Non-Discriminatory Candidate Matcher.
- [x] Secure Platform Messaging & Multi-Channel Notification Infrastructure.
- [x] Platform Trust and Safety System (Verification, Moderation, Reporting, Rate Limiting, Audit Trail).
- [x] Complete Mobile-First and PWA Production Pass (Service worker offline caching, install prompts, 5-node bottom bar, and bandwidth optimizations).
- [x] Complete Production Security Audit & Backend API Hardening (Helmet headers, Express rate-limiters, recursive input XSS sanitization, database-validated token auth, strict multi-tenant isolation, and secure error boundaries).
- [ ] Low-Bandwidth USSD Notification Gateway.
