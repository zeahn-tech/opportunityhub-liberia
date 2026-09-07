# OpportunityHub Liberia — Authentication Implementation Specification

## 1. Executive Overview
OpportunityHub Liberia has completed its migration from prototype local session storage to **Supabase Auth** as the primary production authentication authority.

## 2. Authentication Flows
* **Guest State**: New visitors start in an unauthenticated guest state (`user = null`, `session = null`, `isAuthenticated = false`). Automatic fallback login (e.g., `user-seeker-1`) has been entirely removed for production.
* **Sign Up (`signUp`)**: Registers users securely via Supabase Auth without exposing raw passwords or forcing fake persona selection.
* **Sign In (`signInWithPassword`)**: Authenticates users against Supabase Auth, returning secure session tokens and syncing user profile data.
* **Sign Out (`signOut`)**: Revokes active Supabase sessions, clears local session storage, and resets the application state to an unauthenticated guest state.
* **Password Recovery**: Utilizes Supabase Auth secure recovery email flow (`resetPasswordForEmail`).
* **Email Verification**: Integrates Supabase verification status handling.

## 3. Demo Mode Isolation
* When `VITE_ENABLE_DEMO_MODE=false` (default in production and staging), demo authentication features and simulated role switchers are completely disabled and hidden.
* When `VITE_ENABLE_DEMO_MODE=true` (development/test), demo accounts and role selectors remain accessible for test verification.
