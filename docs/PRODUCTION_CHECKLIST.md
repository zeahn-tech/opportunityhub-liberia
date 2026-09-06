# OpportunityHub Liberia — Production Release Checklist

This checklist must be audited and completed in its entirety before any code or feature is deployed to the production environment on GitHub.

---

## 🛡️ 1. Authentication, Sessions & Security Hardening
- [ ] **Secret Manager Integration**: Confirm that all session secrets, encryption passwords, and external API credentials are bound via secure environment variables rather than committed inside repositories.
- [ ] **HTTP Headers Configured**: Confirm that Helmet headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) are active.
- [ ] **Identification Masking**: Ensure `x-powered-by` is disabled.
- [ ] **Recursive Payload Sanitization**: Confirm that the recursive JSON and query-string input sanitizers are fully operational, eliminating potential XSS vectors.
- [ ] **API Rate Limiting**: Ensure the sliding-window rate limiter is set to throttle high-volume automated requests on server routes.

---

## 🗄️ 2. Relational Database Client & Tenant Isolation
- [ ] **Data Sandboxing Verified**: Review and confirm that RBAC policies enforce isolated checks, preventing unauthorized cross-tenant mutations on lists, applications, and NDA agreements.
- [ ] **Secure Payment Session Gating**: Verify that Stripe checkout session generations are matched to user membership properties before completing Stripe portal allocations.

---

## 💳 3. Billing & Payment Gateway Configurations
- [ ] **Live Keys Substitution**: Replace Stripe test keys with standard production keys (`pk_live_*`, `sk_live_*`).
- [ ] **Webhook Signature Verification**: Verify that the backend Stripe Webhook endpoint enforces secure SHA256 signature verification matching your registered Stripe Dashboard webhook secret.

---

## 🤖 4. Server-Side AI Intelligence Layer
- [ ] **Production Keys Provisioned**: Verify that `GEMINI_API_KEY` is registered in production container secrets.
- [ ] **Heuristic Fallback Verification**: Validate that the dynamic `FallbackAIProvider` operates cleanly with deterministic scoring outputs if Gemini API limits are throttled.
- [ ] **Demographic Scrubbing Audited**: Confirm that candidate profile fields are stripped of identifying traits (e.g. gender, tribe, religion) before being parsed by AI.

---

## 📱 5. PWA Compliance & Network Resiliency
- [ ] **HTTPS Gating**: Confirm that domain DNS mapping forces strict HTTPS protocols (Service Workers will fail to register on non-secured domains).
- [ ] **Service Worker Precaching**: Confirm that the asset bundler compiles standard asset precache manifest lists successfully.
- [ ] **Responsive Viewports Audited**: Confirm that bottom bar elements and modal dimensions render dynamically across all target viewports with minimal 44px touch targets.
