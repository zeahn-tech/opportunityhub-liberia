# Phase 3, Service 2 — opportunityService — Live Verification Record

**Date**: September 10, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Service 1 — see
`docs/PHASE3_SERVICE1_VERIFICATION.md` for why this sandbox still can't
reach `*.supabase.co` over HTTP directly).

## What this proves, and what it doesn't

Same caveat as Service 1: this is a **SQL-level proof of the RLS policies
and the `has_org_permission()` helper**, using `SET ROLE` + `set_config`
to impersonate real `auth.users` rows. It proves the database boundary
holds regardless of client. `src/tests/opportunityService.test.ts` (8
tests, mocked Supabase client + mocked authService) covers the service's
own query-building, error-translation, and read-time expiry-computation
logic — the part a SQL-level proof can't reach.

## Migration applied

`supabase/migrations/20260909140000_opportunity_service_backend.sql` —
applied cleanly. Two kinds of change:

1. **Schema gaps** (same pattern as the organizations migration): added
   `summary`, `moderation_status`, `report_count` columns the app's
   `Opportunity` type already assumed; converted `responsibilities` /
   `requirements` from newline-delimited `text` to `jsonb` arrays,
   **preserving the 4 existing seed opportunities' content** (verified —
   see below).
2. **RLS refinement**: the existing `opportunities` INSERT/UPDATE/DELETE
   policies gated on `is_org_admin()` (role IN admin/owner) only, which is
   *stricter* than the app's own `OrgPermission` model (e.g. a recruiter
   explicitly granted `opportunities.create` without being promoted to
   admin). Replaced with `has_org_permission(org_id, permission)`, which
   checks role OR an explicit grant in `organization_memberships.permissions`.

## Data-migration check

Before/after comparison on `opp-1`/`opp-2`/`opp-3` confirmed
`responsibilities`/`requirements` correctly split into arrays with no data
loss (spot-checked full row content, not just row counts).

## Test sequence (all run live, then cleaned up)

Three throwaway `auth.users` rows: an org owner, a `member`-role user
granted only `["opportunities.create","opportunities.edit"]` (no
`opportunities.delete`), and a complete outsider (no membership anywhere).

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Owner creates an org via `create_organization_with_owner`, then (as owner) adds the recruiter as `role='member'` with explicit permissions | Both succeed | ✅ |
| 2 | Recruiter (role=`member`, explicit `opportunities.create` grant, no admin/owner role) inserts a draft opportunity into the org | Succeeds via `has_org_permission()` matching the permissions array, not the role | ✅ Row created |
| 3 | Same recruiter attempts to `DELETE` that opportunity (has `edit`, not `delete`) | RLS silently filters it out (0 rows affected, not an error — `UPDATE`/`DELETE` policies filter rather than raise) | ✅ `rows_actually_deleted = 0` (checked via `DELETE ... RETURNING` inside the same transaction, not just a post-hoc read) |
| 4 | Complete outsider (zero membership rows) attempts to `INSERT` an opportunity into the org | Rejected by RLS | ✅ `42501: new row violates row-level security policy for table "opportunities"` |
| 5 | `anon` role reads the draft opportunity vs. a published seed opportunity | Draft: 0 rows. Published: visible | ✅ `anon_sees_draft = 0`, published seed row returned |

**5/5 passed.**

## Cleanup

All test opportunities, memberships, the test organization, and the three
`auth.users`/`public.users` rows were deleted after the run (disabling
`trg_enforce_owner_invariant` only for the duration of the cleanup delete,
same as Service 1, then re-enabling it). Live project left clean —
verified via `org_left=0, opps_left=0, users_left=0`.

## What changed in the application, not just the database

Unlike Service 1, opportunityService's public API (`list`, `getById`,
`create`, `createDraft`, `publish`, `update`, `unpublishToDraft`, `close`,
`delete`, `duplicate`) was already fully async (`Promise<ApiResponse<T>>`
via `apiClient.execute`), and every existing caller already `await`s it.
That meant this service could be rewired into the running app in the same
pass, not left dangling like Service 1's `organizationService.ts` still
is:

- `src/App.tsx`: the `opportunities` React state used to be seeded via a
  synchronous `db.getOpportunities()` call in a `useState` initializer and
  refreshed the same way after every mutation (13 call sites total). All
  13 were converted to an async `refreshOpportunities()` helper that calls
  `opportunityService.list()`. Two callbacks (`handleApplySuccess`,
  `onClearSearch`) needed to become `async` themselves to `await` it.
- The 6 mutation handlers in `App.tsx` (`handleSaveOpportunity`,
  `handlePublishDraft`, `handleUnpublishDraft`, `handleCloseOpportunity`,
  `handleDeleteOpportunity`, `handleDuplicateOpportunity`) already called
  `opportunityService.*` before this phase — they now hit Supabase for
  real, with no signature changes needed on the caller side.

So, unlike organizationService, **opportunityService is actually live in
the running application for opportunities.list/getById/create and all
lifecycle mutations**, not just written-and-proven-but-unused.

## Design decisions and gaps, explicitly not hidden

- **Auto-expiry is no longer a write-on-read side effect.** The old
  `dbClient.expireOverdueOpportunities()` mutated every overdue row in
  local storage on *every* `list()`/`getById()` call, regardless of who
  was calling — under RLS, most callers (anon visitors, job seekers)
  have no UPDATE grant on opportunities they don't own, so that pattern
  cannot survive as-is. `opportunityService.ts` now computes "expired" at
  read time (`computeEffectiveStatus`) without ever persisting it. An org
  admin durably transitioning their own overdue postings to a real
  `'expired'` status (auditable, permission-checked) is a legitimate
  follow-up, not done here.
- **Full-text search lost two dimensions**: organization name and the
  skills array are no longer part of the search-query match (title,
  summary, description, county, location still are). Matching inside a
  joined table or a jsonb array needs a different PostgREST query shape
  than plain `.or()` — flagged rather than silently dropped.
- **View-count increments are best-effort.** `getById()` attempts to
  increment `views_count` and silently no-ops on an RLS denial (there is
  no UPDATE policy granting arbitrary viewers that column) rather than
  pre-checking who's allowed — consistent with "let Postgres decide,
  don't reimplement the check client-side."
- **The `INITIAL_ORGANIZATIONS` seed-data fallback is gone.** The old
  `create()` used to fabricate a placeholder `Organization` object from
  bundled seed data when the caller didn't supply one. A missing/invalid
  `organizationId` now fails loudly instead — and this removes one more
  place the shipped bundle depended on seed data, ahead of the "no seed
  PII in the built bundle" acceptance check due at the end of this phase.
- **`AiStudioHub.tsx`, `TrustSafetyAdminCenter.tsx`,
  `trustSafetyService.ts`, and `analyticsService.ts`** still read
  opportunities via `dbClient.ts` directly. These belong to later steps in
  this phase's ordering (`trustSafetyService`, `analyticsService`), not
  Service 2 — left untouched on purpose.
- Two existing test files (`jobMarketplace.test.ts`, `services.test.ts`)
  called `opportunityService` directly against its old dbClient-backed
  contract; both were retargeted to call `dbClient.ts` directly instead
  (the same pattern `auth.test.ts` already used before Phase 2 touched
  `authService`), since that's what they're actually testing now — the
  local demo-mode data layer, not this service. See
  `jobMarketplace.test.ts`'s own header comment for the full rationale and
  exactly which two tests were dropped (and where their coverage moved
  to instead).
