# OPPORTUNITYHUB LIBERIA — PROJECT OVERVIEW

## 1. Executive Summary & Vision

**OpportunityHub Liberia** is a modern, production-grade digital opportunity marketplace engineered specifically for the Republic of Liberia, designed with an architectural foundation that supports eventual expansion across West Africa (ECOWAS).

Traditional platforms in emerging economies often suffer from narrow scope—acting merely as static job boards—or importing Western desktop-centric assumptions that fail on mobile devices operating on fluctuating 3G/4G bandwidth. OpportunityHub Liberia shatters this limitation by providing a **unified multi-stakeholder ecosystem** bridging:

1. **Employment & Careers**: Jobs, Internships, Consultancies, Freelance Services.
2. **Academic & Professional Development**: Scholarships, Fellowships, Vocational Training Programs, Grants.
3. **Commerce & Procurement**: Public & Private Tenders, Supply Contracts, Business Partnerships.
4. **Capital & Enterprise Exchange**: Businesses for Sale (Public & Confidential M&A), Investment Opportunities, Angel/Equity Deals.
5. **Institutional Trust**: Multi-tiered institutional verification (Government, NGO, Registered Enterprise, Certified Recruiter).

---

## 2. Positioning & Market Context

* **Official Positioning**: *"Liberia's Digital Opportunity Marketplace"*
* **Geographic Scope (Initial)**: All 15 Counties of Liberia:
  * Montserrado (Monrovia, Paynesville, Bushrod Island)
  * Nimba (Ganta, Sanniquellie)
  * Bong (Gbarnga)
  * Grand Bassa (Buchanan)
  * Margibi (Kakata, RIA corridor)
  * Maryland (Harper)
  * Lofa (Voinjama, Foya)
  * Bomi, Cape Mount, Sinoe, Grand Gedeh, River Gee, Grand Kru, Rivercess, Gbarpolu
* **Currency Architecture**: Dual-currency display and calculations supporting United States Dollars (USD) and Liberian Dollars (LRD), with international payment and local mobile money integration preparedness (Lonestar MTN MoMo, Orange Money).
* **Regional Scalability**: Architecture decouples country/county hierarchies so regional hubs (Sierra Leone, Guinea, Ghana, Nigeria) can be provisioned via tenant configuration without schema refactoring.

---

## 3. Core Ecosystem Stakeholders & Roles

OpportunityHub Liberia is built around an enterprise-grade Multi-Tenant Role-Based Access Control (RBAC) model. A single registered user can hold distinct roles across multiple organizations:

| Persona / Role | Key Functional Capabilities & Objectives |
| :--- | :--- |
| **Job Seeker / Talent** | Discovers jobs, internships, scholarships; builds structured digital CV; applies with document management; tracks application lifecycle (`Applied` → `Under Review` → `Shortlisted` → `Interview` → `Offer`); receives AI-assisted job matching and skills gap analysis. |
| **Employer / Private Company** | Publishes vacancies, customizes screening questions, manages candidate pipelines, coordinates interview rounds, searches verified talent pools, accesses recruitment analytics. |
| **NGO & Development Partner** | Publishes development grants, fellowships, and consultancy calls; ensures transparent non-profit compliance; accesses local specialist talent. |
| **Government Institution** | Publishes public tenders, civil service opportunities, and national initiatives with formal ministerial verification badges; audits compliance. |
| **Recruitment Agency** | Manages multiple client organization accounts from a unified agency console, assigns team recruiters, tracks placements and billable client metrics. |
| **Business Seller / Broker** | Lists operating enterprises for sale; configures public teasers vs. confidential NDA-gated financial disclosures; reviews buyer qualification requests. |
| **Business Buyer / Investor** | Discovers acquisition targets and investment opportunities filtered by revenue, county, and sector; submits access requests; conducts preliminary due diligence. |
| **Service Provider / Freelancer**| Offers verified professional services (accounting, legal, logistics, ICT, construction); submits proposals on contracts and tenders. |
| **Training & Academic Provider** | Promotes accredited technical/vocational (TVET) courses, university degrees, professional certifications, and workshops. |
| **Platform Administrator** | Governs global system health, taxonomies, user audits, financial transactions, fraud alerts, and platform-wide analytics. |
| **Verification Officer** | Validates legal documentation (Liberia Business Registry - LBR certificates, NGO accreditation letters, Ministry credentials, tax clearance). |
| **Trust & Safety Moderator** | Investigates reported listings, reviews suspicious postings, mitigates advance-fee recruitment scams, and enforces quality guidelines. |

---

## 4. Opportunity Taxonomy

The marketplace supports 12 distinct opportunity categories within an extensible single data core:

1. **Employment Vacancies**: Full-time, part-time, contract, temporary, seasonal, remote, hybrid, on-site.
2. **Internships & Apprenticeships**: Entry-level experiential learning for students and recent graduates.
3. **Scholarships**: Domestic and international university funding, vocational grants, merit and need-based awards.
4. **Fellowships**: Leadership, research, healthcare, and public policy programs.
5. **Training & TVET**: Skills training, technology bootcamps, executive certifications, trade apprenticeships.
6. **Grants & Subsidies**: Non-dilutive capital for community initiatives, youth enterprises, and agricultural ventures.
7. **Commercial Contracts**: B2B procurement of goods, supplies, maintenance, and logistics.
8. **Public & Private Tenders**: Formal competitive bids with strict RFP/EOI deadlines, criteria, and submission specifications.
9. **Consultancies**: Short-term and advisory terms of reference (TOR) for specialized experts.
10. **Business Partnerships**: Joint ventures, distribution agreements, technology licensing, co-founding opportunities.
11. **Businesses for Sale (M&A)**: Established revenue-generating businesses, retail shops, farms, mining concessions, hospitality, logistics fleets.
12. **Investment & Equity**: Seed funding rounds, angel investor calls, growth capital, asset financing.

---

## 5. Architectural Non-Negotiables

* **Zero "AI Slop" or Fake Stubs**: No hollow dummy buttons or fake metric counters that give false impressions of functionality. Unimplemented integrations must be explicitly isolated and reported.
* **Mobile-First for High-Latency Environments**: Designed for budget Android smartphones operating on constrained 3G/4G connections. Minimal asset weight, robust skeleton loaders, responsive touch targets (minimum 44x44px), and local caching.
* **Rigorous Multi-Tenancy**: Strict tenant boundary isolation. Organization data, candidates, and financial records are protected by database-level scoping and authorization checks.
* **Uncompromising Trust & Verification**: Verification badges require verifiable offline validation (LBR business registration numbers, official stamps, corporate domains). No user self-verifies.
* **Human-in-the-Loop Ethical AI**: AI features provide drafting assistance, semantic recommendations, and candidate matching summaries. AI never makes autonomous hiring, filtering, or rejection decisions.
