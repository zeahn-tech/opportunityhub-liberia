# Phase 3, Service 1 — organizationService — Live Verification Record

**Date**: September 9, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (a database-level
channel independent of this build environment's network sandbox, which still cannot
reach `*.supabase.co` directly over HTTP/GoTrue — same limitation the Phase 2 section
of `docs/PRODUCTION_CERTIFICATION_REPORT.md` documents).

## What this proves, and what it doesn't

This was a **SQL-level proof of the RLS policies, the `create_organization_with_owner`
RPC, and the owner-invariant trigger**, using `SET ROLE` + `set_config('request.jwt.claims', ...)`
to impersonate real `auth.users` rows as Postgres/PostgREST itself would. It proves the
database boundary holds regardless of which client hits it. It does **not** replace a
true HTTP-level test (`supabase-js` client → real network → real project) — that still
needs an environment with outbound access to `*.supabase.co`, exactly as flagged in
Phase 2. `src/tests/organizationService.test.ts` covers the service's own query-building
and error-translation logic with a mocked client, for the same reason
`authServiceSupabase.test.ts` does.

## Migration applied

`supabase/migrations/20260909130000_organization_service_backend.sql` — applied cleanly
via `apply_migration` (success). Adds:
- Missing `organizations` columns the app's `Organization` type already expects
  (`is_verified`, `website`, `logo_text`, `address`, `registration_number`,
  `tax_id_number`, `established_year`, `contact_email`, `contact_phone`).
- `create_organization_with_owner(...)`, a `SECURITY DEFINER` RPC that atomically
  creates an organization and grants the *calling* user (`auth.uid()`) ownership —
  needed because a plain client insert into `organization_memberships` cannot
  bootstrap itself (see the migration file's header comment for the chicken-and-egg
  explanation).
- `enforce_owner_invariant()`, a `BEFORE UPDATE OR DELETE` trigger on
  `organization_memberships` that blocks demoting/removing the sole owner — moved out
  of `dbClient.ts` application code (trivially bypassable by a direct client) into
  Postgres itself.

## Test sequence (all run live, then rolled back / cleaned up)

Two throwaway `auth.users` rows were inserted (`orgtest.alice@…`, `orgtest.bob@…`),
confirmed the Phase 2 `on_auth_user_created` trigger synced them into `public.users`
correctly (still working), then:

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Alice calls `create_organization_with_owner(...)` | Org created, Alice becomes `owner`/`active` in one transaction | ✅ Confirmed via direct row read |
| 2 | Bob (non-member) reads `organization_memberships` for Alice's org | 0 rows (RLS default-deny) | ✅ `0` |
| 3 | Bob directly `INSERT`s himself as `owner` of Alice's org (bypassing the RPC/service entirely) | Rejected by RLS | ✅ `42501: new row violates row-level security policy for table "organization_memberships"` |
| 4 | Alice (the sole owner) tries to `DELETE` her own owner membership | Rejected by the trigger | ✅ `23514: Cannot remove or demote the sole owner of an organization.` |
| 5 | Alice tries to `UPDATE` her own row from `owner` → `admin` | Rejected by the trigger | ✅ `23514: Cannot remove or demote the sole owner of an organization.` |
| 6 | `anon` role reads `organizations` | Public read succeeds (existing Phase 1 policy) | ✅ Row returned |
| 7 | `anon` role reads `organization_memberships` | 0 rows (RLS default-deny, no public policy exists) | ✅ `0` |

**7/7 passed.**

## Cleanup

All test rows (memberships, organization, `auth.users`, `public.users`) were deleted
after the run; the live project was left clean. Deleting the sole-owner test membership
required temporarily disabling `trg_enforce_owner_invariant` (expected — the trigger
makes no exception for cleanup, which is the point) then re-enabling it immediately
after.

## Gap found and flagged, not silently fixed

Deleting the `auth.users` test rows did **not** cascade-delete the matching
`public.users` rows — they were orphaned until manually deleted. Phase 2 added
triggers for `auth.users` **INSERT** (create profile) and **email-confirmed UPDATE**
(sync verification status), but no **DELETE** sync trigger exists yet. This is a
pre-existing Phase 2 gap, not something introduced by this migration, and is out of
scope for `organizationService` — flagged here for whoever picks up user-lifecycle
handling next, rather than silently left unnoticed.

## Explicitly NOT done in this pass

- **Callers not yet rewired.** `authService.ts`, `permissionEngine.ts`, and the three
  components that call `db.createOrganization` / `db.getOrganizationById` /
  `db.getMembershipsByUserId` (`OrganizationWizardModal.tsx`, `OrganizationSwitcher.tsx`,
  `PostOpportunityModal.tsx`) still call the synchronous `dbClient.ts` local store, not
  this new async `organizationService`. dbClient's org/membership methods are
  synchronous (backed by `localStorage`); Supabase calls are inherently async, so
  wiring every caller through means converting each call site — and everything that
  calls *them* (e.g. `AuthContext`) — to handle promises. That cascades well beyond
  "service 1" and risks exactly the "giant rewrite you can't verify" the task
  explicitly said to avoid. `organizationService.ts` itself is complete, typechecked,
  tested, and proven against real RLS — wiring it in is the next concrete step, once
  confirmed.
- **Organization invitations** (`createInvitation` et al.) are not covered — there is
  no `organization_invitations` table in the Supabase schema yet. Flagged in
  `organizationService.ts`'s own header comment; adding that table is a schema
  decision, not something to slip in unrequested.
- A true HTTP-level (`supabase-js` over real network) integration test — same gap
  Phase 2 already documented, still blocked on this sandbox's egress allowlist.
