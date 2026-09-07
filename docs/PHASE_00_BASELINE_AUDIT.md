# Phase 00 — Baseline Audit & Implementation Truth

## Executive Summary
OpportunityHub Liberia is an advanced React + Vite + TypeScript platform featuring rich marketplace workflows for jobs, career opportunities, businesses, tenders, subscriptions, verification, and messaging. However, an exhaustive audit of the repository reveals that the platform's authentication, session management, and authorization model currently rely on a **prototype/demo persistence layer** rather than true production-grade Supabase Auth and RLS enforcement.

Specifically:
1. **Authentication Authority**: Currently managed by `src/services/authService.ts` and `src/db/dbClient.ts` using localStorage/in-memory session objects, rather than Supabase Auth.
2. **Automatic Login**: `loadInitialSession()` automatically authenticates visiting users as `user-seeker-1`.
3. **Logout Behavior**: `logout()` immediately re-authenticates the user as the default seeded job seeker rather than clearing the session.
4. **Persona / Role Switching**: `switchRole()` allows users to instantly impersonate any of 9 seeded database users (`user-seeker-1`, `user-employer-1`, `user-admin-1`, etc.) via UI dropdowns.
5. **Database RLS**: `supabase/schema.sql` contains permissive table policies and grants that do not enforce strict least-privilege tenant isolation.

---

## Current Architecture & Findings

### 1. Authentication & Session Management
- **STATUS**: UNSAFE / NOT IMPLEMENTED (for production Supabase Auth)
- **EVIDENCE**: `src/services/authService.ts` lines 1-150 (`loadInitialSession`, `authenticateUser`, `switchRole`, `logout`).
- **EXPECTED**: Visitors must be unauthenticated guests; Supabase Auth must be the sole authentication authority; logout must clear all session tokens.
- **REQUIRED ACTION**: Migrate auth flow to Supabase Auth (`supabase.auth.signUp`, `signInWithPassword`, `signOut`), remove automatic login, and isolate demo personas behind `VITE_ENABLE_DEMO_MODE=true`.

### 2. Identity & Role Switching
- **STATUS**: UNSAFE
- **EVIDENCE**: `src/components/Navbar.tsx` and `AuthModal.tsx` expose 8-role persona quick-switchters.
- **EXPECTED**: A user has one real account and belongs to organization workspaces with specific roles. Role switching must not change identity.
- **REQUIRED ACTION**: Remove production persona switching from normal navigation; isolate demo tooling behind development configuration.

### 3. Database RLS & Security Grants
- **STATUS**: UNSAFE
- **EVIDENCE**: `supabase/schema.sql` contains broad grants and permissive RLS policies.
- **EXPECTED**: Deny-by-default RLS policies restricting table access to resource owners and organization members.
- **REQUIRED ACTION**: Redesign all RLS policies to enforce strict tenant isolation and Least Privilege.

### 4. Documentation Mismatches
- **STATUS**: MISMATCHED
- **EVIDENCE**: Existing docs claim production-ready Supabase auth, but codebase runs entirely on local/in-memory seed session storage.
- **EXPECTED**: Documentation must accurately reflect implementation status.
- **REQUIRED ACTION**: Maintain `docs/IMPLEMENTATION_STATUS.md` and related architectural specs accurately.

---

## Critical Blockers
1. Automatic default session creation upon app load.
2. Logout re-authenticating a default user instead of logging out.
3. Client-side impersonation / role switching across different database user accounts.
4. Permissive database RLS policies.

---

## Recommended Migration Sequence (Phase 01–12)
1. Phase 01: Isolate demo mode behind `VITE_ENABLE_DEMO_MODE`.
2. Phase 02: Integrate Supabase Auth client initialization & session listeners.
3. Phase 03: Update registration & login forms to call Supabase Auth APIs.
4. Phase 04: Implement secure session revocation on logout.
5. Phase 05: Enforce organization memberships and backend RBAC rules.
6. Phase 06: Harden Supabase RLS policies.
7. Phase 07: Redesign UI components to remove persona terminology and adopt professional workspace navigation.
8. Phase 08: Update test suite to reflect production authentication.
9. Phase 09: Final security and build verification.

**PRODUCTION READINESS**: NOT PRODUCTION READY
