# OpportunityHub Liberia — Security Architecture

This document provides a comprehensive overview of the production-grade security architecture, vulnerability mitigations, and defensive design patterns implemented for OpportunityHub Liberia. 

---

## 1. Authentication & Session Management

OpportunityHub Liberia implements a multi-tiered session tracking and cryptographic authentication process spanning both the server-side Node.js environment and browser environments:

- **Salted Password Hashing**: Users' passwords are processed using a deterministic cryptographic hashing and verification routine (`authService.ts`). Raw password strings are never stored or logged.
- **Database-Validated Sessions**: Session tokens are cryptographically strong random identifiers. On every protected API request, the server invokes the central database engine (`dbClient.ts` -> `validateSession`) to perform dynamic validation:
  - **Token Active Checks**: Ensures the session is explicitly set to `isValid: true`.
  - **Expiration Sweeps**: Confirms the session timestamp has not exceeded active duration boundaries.
  - **Account Status Validation**: Automatically revokes session validity and denies requests if the user's status is changed to `suspended` or `deactivated` in the database.
  - **Activity Refreshing**: Automatically bumps the `lastActivityAt` timestamp on each validated call to keep live sessions current.
- **Client Session Interceptors**: Browser clients fetch the current active session tokens dynamically via the `authService` and append them to the standard `Authorization: Bearer <token>` header on all requests made to backend endpoints.

---

## 2. Authorization & Role-Based Access Control (RBAC)

The application enforces a highly granular RBAC permissions matrix. Security roles include:
- `job_seeker` / `candidate`
- `employer` / `recruiter`
- `business_seller` / `m&a_owner`
- `verification_officer`
- `platform_admin`

### AUTHORIZATION ENGINE (`canUserPerform`)
The core database client governs all mutations using the explicit policy matcher:
```typescript
public canUserPerform(userId: string, action: string, contextId?: string): boolean;
```
Actions like `opportunity.create` or `business.list` are mapped directly to specific user role and context constraints:
- **`business.list` Action Restriction**: Hardened during our security pass, restricting catalog-level updates and additions exclusively to authorized `business_seller` roles.
- **Global Administrative Overrides**: Dedicated platform admin overrides are validated through system roles before granting cross-tenant write rights.

---

## 3. Strict Multi-Tenant Isolation

Multi-tenant integrity is enforced across all functional modules (M&A Business Exchange, Job Board, Recruitment Pipelines, Data Rooms, and Billing):

- **Membership Alignment Checks**: User requests are mapped against organizational memberships. No user can view, edit, draft, or delete listings, resumes, or applications that are owned by a different organization.
- **Payment Request Gating**: Stripe checkout and billing sessions verify that the user requesting billing services belongs to the organization identifier passed in the body. If there is a mismatch, the server returns a `403 Forbidden` error, blocking any subscription tampering.

---

## 4. Input Validation & Complete XSS Protections

To neutralize script-injection, stored XSS, or HTML contamination vectors, the server applies deep, multi-stage sanitization immediately upon receiving input payloads:

### RECURSIVE SANITIZATION FILTER
An Express input validation middleware intercepts and sanitizes every incoming field inside `req.body` and `req.query`. It recursively checks objects, arrays, and strings:
- **Script-Tag Neutralization**: Completely removes `<script>` blocks and elements.
- **Risky Element Pruning**: Eliminates highly dangerous HTML tags (`<iframe>`, `<object>`, `<embed>`, `<style>`, `<meta>`, `<link>`).
- **URI Neutralization**: Redacts and neutralizes `javascript:` protocols to prevent links or event triggers from executing client-side scripts.
- **Inline Event Handler Redaction**: Scrubs all HTML inline event handlers (such as `onload=`, `onerror=`, `onclick=`) to block cross-site execution.

### PAYLOAD CAPACITY LIMITS
To defend against buffer overflows, JSON injection, or parsing-based Denial of Service (DoS) attacks, Express payload sizes are constrained at the middleware layer:
```typescript
app.use(express.json({ limit: '2mb' }));
```

---

## 5. DDoS Mitigations, Header Hardening, & Rate Limiting

The application runs inside a hardened container runtime protected by both network-edge filters and in-app middleware:

- **Sliding-Window Rate Limiting**: The server applies standard sliding-window rate limiters across all API routes via the `express-rate-limit` library:
  - **Limit**: Max 150 requests per 15-minute sliding window per IP.
  - **Standardized Headers**: Returns rate-limiting metadata via Standard HTTP Headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).
- **HTTP Header Hardening (Helmet)**: Configures HTTP response headers to defend against sniffing, clickjacking, and mime-type exploits:
  - **X-Content-Type-Options**: `nosniff` prevents browsers from MIME-sniffing responses away from declared content types.
  - **X-Frame-Options**: `SAMEORIGIN` prevents clickjacking vectors.
  - **Strict-Transport-Security (HSTS)**: Mandates secure HTTPS connections on supported runtimes.
- **Service Header Cloaking**: The `X-Powered-By` header is disabled entirely on Express using `app.disable('x-powered-by')`, preventing malicious actors from profiling server framework details.

---

## 6. Information Leakage & Secure Error Handling

All backend routes are bounded by strict try-catch handlers:
- **Console Log Logging**: Detailed stack traces, SQL debug outputs, and internal library exceptions are captured safely in the secure container logs.
- **Masked Browser Outputs**: In production, the client receives a high-level generic response:
  ```json
  { "error": "Internal Server Error. Please contact security support." }
  ```
  This completely removes technical diagnostic leakage, preventing attackers from gaining insights into DB schemas, file structures, or server architecture.

---

## 7. Platform Integrity & Audit Logs

- **Immutable Audit Trails**: Actions like submitting applications, signing NDAs, and approving verification dossiers automatically log structured entries with tags, operator IDs, and timestamps.
- **Sensitive Fields Masking**: The structured logs dynamically redact password hashes, API keys, and session tokens before persisting logs.
- **Trust & Safety Center**: Admin panels provide platform officers with visibility into user restrictions, anomaly reports, and quarantine flows, reinforcing trust in the digital marketplace.
