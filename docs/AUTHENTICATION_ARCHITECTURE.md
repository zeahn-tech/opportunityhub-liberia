# OpportunityHub Liberia — Authentication Architecture Specification

## 1. Executive Overview
OpportunityHub Liberia utilizes **Supabase Auth** as the production-grade authentication authority. The frontend application never manufactures authentication tokens or persists raw credentials in local storage.

## 2. Authentication Lifecycle
* **Registration**: Users register with Full Name, Email, Password, Confirm Password, and optional Phone Number. Role selection is not forced during registration.
* **Email Verification**: Following sign-up, users receive an email verification token. Accounts begin in `pending_verification` status until verified.
* **Login**: Authenticated via Supabase Auth credentials. Successful login establishes a secure session token and fetches the user profile.
* **Logout**: Revokes the active session token, clears local storage state, and transitions the user to an unauthenticated Guest state (`user = null`, `session = null`, `isAuthenticated = false`).
* **Password Recovery**: Secure password reset flow that avoids email enumeration by returning a generic success message ("If an account matches that email, we'll send recovery instructions.").

## 3. Demo / Development Mode Isolation
* Development and test fixtures (such as seeded users and persona switching) are strictly isolated behind `VITE_ENABLE_DEMO_MODE=true`.
* In production (`VITE_ENABLE_DEMO_MODE=false`), demo personas, role switchers, and seed credential buttons are completely disabled and hidden from the UI.
