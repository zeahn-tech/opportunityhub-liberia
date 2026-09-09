# OpportunityHub Liberia — Security Architecture

This document provides a comprehensive overview of the production-grade security architecture, vulnerability mitigations, and defensive design patterns implemented for OpportunityHub Liberia. 

---

## 1. Authentication & Session Management

> **Updated September 8, 2026 (Phase 2 — Supabase Auth migration)**: this section previously described a local, client-side password-hashing and in-process session-validation architecture. That architecture has been replaced; the description below reflects the current implementation. See `docs/PRODUCTION_CERTIFICATION_REPORT.md`'s "Authentication Status" section for exact verification evidence.

OpportunityHub Liberia uses **Supabase Auth** as the sole source of identity and session truth for real user accounts, spanning both the server-side Node.js environment and browser environments:

- **Password Storage & Verification**: Supabase Auth owns password hashing and verification exclusively. The application (`src/services/authService.ts`) never hashes, stores, or compares a real user's password itself, and never falls back to a local credential check if Supabase is unreachable — a Supabase error is surfaced to the caller as a real error. The local SHA-256 salted-hashing routine in `src/core/security/crypto.ts` still exists, but is scoped and documented as demo-mode-only (`VITE_ENABLE_DEMO_MODE=true`, off by default in production — see `src/config/env.ts`), used exclusively by `src/db/dbClient.ts`'s opt-in local sample-account path.
- **Server-Side Session Verification**: On every protected API request, the server (`src/server/authMiddleware.ts`, used by `server.ts`) calls `supabase.auth.getUser(token)` using the anon key, which asks Supabase itself to verify the token's signature and expiry against the live project. There is no local secret to keep in sync. A local `dbClient.ts -> validateSession` check is consulted **only** as an explicit, opt-in demo-mode fallback (`VITE_ENABLE_DEMO_MODE=true` set server-side) and **only after** Supabase itself has rejected the token — never silently, and never when Supabase is configured, reachable, and demo mode is off.
- **Client Session Interceptors**: Browser clients hold the real Supabase `access_token` (obtained via `supabase.auth.signInWithPassword`/`signUp`) via `authService`, and append it as the standard `Authorization: Bearer <token>` header on all requests made to backend endpoints. `src/context/AuthContext.tsx` re-verifies against `supabase.auth.getSession()` on app load and subscribes to `supabase.auth.onAuthStateChange` for live token refresh, expiry, and cross-tab sign-out — rather than trusting a cached local session indefinitely.
- **Profile Sync**: A `SECURITY DEFINER` Postgres trigger on `auth.users` (`supabase/migrations/20260908120000_sync_auth_users_to_public_users.sql`) populates the matching `public.users` row in the same transaction Supabase uses to create the identity, so RLS policies keyed on `auth.uid()` have a row to match against from the moment of signup.
- **Demo Mode Visibility**: Whenever an active session is the local demo-mode path, `src/components/auth/DemoModeBanner.tsx` renders a persistent banner so it can never be mistaken for a real account.

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
