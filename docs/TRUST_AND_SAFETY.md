# OPPORTUNITYHUB LIBERIA — TRUST AND SAFETY SYSTEM SPECIFICATION

## 1. Executive Overview & Policy Mandate

OpportunityHub Liberia enforces strict, zero-tolerance platform security and anti-fraud measures to safeguard job seekers, verified enterprises, international development partners, and small business sellers.

To eradicate illegal application fees, fraudulent job postings, phantom recruitment agencies, and identity impersonation across all 15 Liberian counties, the platform enforces statutory verification, automated AI scam filtering, community violation reporting, sliding-window rate limiting, and immutable audit logging.

---

## 2. Statutory Verification Framework

Platform verification badges are never issued arbitrarily. Every verification request requires valid statutory proof documentation verified against statutory Liberian regulatory registries.

### Verification Categories & Badges

1. **`verified_company` (Verified Private Enterprise)**
   * **Required Evidence**: Liberia Business Registry (LBR) Certificate of Incorporation, Articles of Incorporation, and LRA Tax Clearance Certificate.
   * **Badge Unlocks**: Verified checkmark badge on job listings, priority placement in search results, and deal room access for M&A.

2. **`verified_ngo` (Verified Development Partner / NGO)**
   * **Required Evidence**: Ministry of Foreign Affairs (MOFA) Accreditation, Ministry of Finance NGO Secretariat Certificate, and sector-specific line ministry permits.
   * **Badge Unlocks**: Exemption from candidate listing fees, verified humanitarian NGO badge, donor compliance audit trails.

3. **`verified_government` (Verified Government Institution)**
   * **Required Evidence**: Official Government of Liberia Gazette establishing statutory authority or Ministry authorization letter.
   * **Badge Unlocks**: Official GOL Seal badge, public tender publishing rights.

4. **`verified_recruiter` (Verified Recruitment Agency)**
   * **Required Evidence**: Ministry of Labour Employment Agency License, LBR registration, LRA Tax Clearance.
   * **Badge Unlocks**: Multi-client candidate pipeline management, agency badge.

5. **`verified_business` (Verified Business Seller)**
   * **Required Evidence**: Property title deed / leasehold agreement, MOCI Small Business Registry certificate, audited financial statement.
   * **Badge Unlocks**: M&A confidential deal room listing rights, verified asset seller status.

### Verification Workflow Lifecycle
```
[ Submit Evidence Dossier ]
        │
        ▼
[ Status: pending_review ]
        │
        ▼ (Verification Officer Review)
        ├── Approve ──► [ Status: verified ] ──► Grant Official Badge & System Unlocks
        ├── Reject  ──► [ Status: rejected ] ──► Notify Submitter with Reason & Re-upload Request
        └── Suspend ──► [ Status: suspended ] ──► Quarantined for Deeper Fraud Investigation
```

---

## 3. Automated Content Moderation Engine

Every job posting, consultancy tender, and business sale listing passes through an automated scanner before being published.

### Automated Flag Triggers & Severity Matrix

| Rule ID | Rule Name | Trigger Criteria | Severity | Action Taken |
| :--- | :--- | :--- | :---: | :--- |
| `rule-fee-request` | Forbidden Application Fee | Contains "pay fee", "registration fee", "processing fee", "Western Union" | **HIGH** | Auto-quarantine post & alert officer |
| `rule-unregulated-money` | Unregulated Wire Channels | Contains "wire transfer", "send cash", "MoneyGram" | **HIGH** | Flag for officer review |
| `rule-salary-anomaly` | Outlier Salary Ratio | Stated salary exceeds regional benchmark by >20x (e.g. >$25,000/mo) | **MEDIUM** | Flag for salary verification |
| `rule-off-platform` | Off-Platform Contact Only | Contains "WhatsApp only", "Telegram only" without email or address | **LOW** | Warn submitter |

---

## 4. Community Reporting & Abuse Protection

Job seekers and platform members can report suspicious listings, unauthorized impersonation, or fee solicitations directly from any card or detail modal.

### Reporting Workflow & Auto-Quarantine Threshold
* **Reporting Options**: Scam/Fee charging, Misleading salary claims, Fake entity identity, Harassment, Impersonation, Spam, Discrimination, Inappropriate content.
* **Auto-Quarantine Rule**: If any listing or user account accumulates **>= 2 pending reports** from distinct users, the system automatically:
  1. Sets listing status to `quarantined`.
  2. Creates a high-priority `SuspiciousActivityEvent`.
  3. Sends an immediate alert to Platform Verification Officers.

---

## 5. Sliding-Window Rate Limiting & Abuse Prevention

To prevent spam attacks, brute-force attempts, and scraping, sensitive user actions are rate-limited using a sliding-window counter in `RateLimiterService`:

| Action | Limit / Window | Cooldown / Penalty |
| :--- | :---: | :---: |
| `submit_application` | 5 per 15 minutes | 15 minute lock |
| `post_opportunity` | 3 per 1 hour | 1 hour lock |
| `send_direct_message` | 20 per 5 minutes | 5 minute lock |
| `submit_verification` | 2 per 1 hour | 1 hour lock |
| `submit_report` | 5 per 1 hour | 1 hour lock |

---

## 6. Account Restrictions & Sanctions Engine

Administrators and Verification Officers can issue targeted or global sanctions:

1. **`posting_disabled`**: Prevents the account from creating new job or business listings.
2. **`messaging_disabled`**: Suspends direct chat and inquiry privileges.
3. **`applications_disabled`**: Restricts the candidate from submitting job applications.
4. **`deal_room_disabled`**: Restricts access to confidential M&A documents.
5. **`full_suspension`**: Disables login and sets user `accountStatus` to `suspended`.

Restrictions can be time-bound with an `expiresAt` timestamp or indefinte until explicitly lifted by an administrator.

---

## 7. Immutable Platform Audit Logging

All administrative actions, verification decisions, restriction issuances, and report resolutions write an immutable record to the `audit_logs` database collection:

```json
{
  "id": "audit-1725550000",
  "actorUserId": "user-admin-1",
  "actorName": "Hon. Emmanuel Sumo",
  "action": "verification.decide",
  "targetEntity": "organization",
  "targetId": "org-buchanan-agro",
  "details": {
    "decision": "verified",
    "badgeGranted": "verified_company",
    "lbrRegistryChecked": "LBR-CORP-2024-5519"
  },
  "createdAt": "2026-09-05T17:55:00Z"
}
```

---

## 8. Privacy-Preserving Analytics & Tenant Isolation Engine

To protect candidates, businesses, and employers, OpportunityHub Liberia enforces a comprehensive Privacy-Preserving Analytics framework across all marketplace activities.

### 1. Tenant Isolation Guidelines
* **Employer Dashboard Isolation**: Recruiters and company profiles only receive aggregated metrics matching their exact authorized `organizationId`. They are strictly prevented from querying or viewing applicants, shortlists, or hiring conversion stats belonging to any other company.
* **Business Marketplace Isolation**: Small business sellers and M&A participants can only view detail sheet impressions, save counts, and inquiries for listings they explicitly own (`ownerUserId === currentUserId`). They have no access to competitor inquiry conversions or private deal records.

### 2. PII Exposure Mitigation
* **No Unnecessary PII Logging**: Statistical reports never record candidate names, phone numbers, exact residential street details, or personal emails.
* **Aggregated Anonymity**: Views and clicks are computed as atomic increments in the DB client (`incrementOpportunityViews`, `incrementBusinessViews`), stripping any user-agent identifiers, IP addresses, or browser session profiles during reporting.
* **Consent-Gated Access**: Detailed business deal sheets and annual profit statistics are gated behind executed Non-Disclosure Agreements (NDAs). Until NDA access is approved by the seller, financial indicators remain strictly locked (`🔒 Gated by NDA`).

