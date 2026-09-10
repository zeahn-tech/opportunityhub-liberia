# Phase 3, Service 3 — applicationService — Live Verification Record

**Date**: September 10, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Services 1-2 — this sandbox still can't
reach `*.supabase.co` over HTTP directly).

## What this proves, and what it doesn't

Same caveat as Services 1-2: this is a **SQL-level proof of the RLS
policies and the new candidate-update-boundary trigger**, using `SET ROLE`
+ `set_config` to impersonate real `auth.users` rows. `src/tests/applicationService.test.ts`
(8 tests, mocked Supabase client + mocked authService/notificationService/dbClient)
covers the service's own query-building, error-translation, and
history-assembly logic.

## Migration applied

`supabase/migrations/20260910100000_application_service_backend.sql` —
applied cleanly. `applications` had **0 rows** in production at the time,
so no data-preservation concern (unlike the organizations/opportunities
migrations). Two kinds of change:

1. **Schema gaps**: added `match_score`, `match_notes`, `rejection_reason`,
   `withdrawal_reason`, `withdrawn_at`, `interview_details`,
   `hiring_offer_details`, `history`, `resume_file_name`,
   `resume_data_url`, `resume_url`, `evaluation_strengths`,
   `evaluation_improvements`, `internal_notes` — all columns the app's
   `Application` type already assumed.

2. **A real security fix, not just a schema catch-up**: the pre-existing
   "Candidates can withdraw applications" RLS policy (`UPDATE`, `USING
   applicant_user_id = auth.uid()`) had no `WITH CHECK` and — because
   Postgres RLS can only gate *which rows* qualify, not *which columns*
   an `UPDATE` touches — a candidate's direct Supabase call could rewrite
   their **own** application's `stage`, `evaluation_notes`,
   `internal_rating`, or any other employer-owned field. `dbClient.ts`'s
   old local-store `withdrawApplication()` only ever touched
   stage/withdrawalReason/withdrawnAt/history, but that was never a real
   boundary — it was just the only code path the old implementation
   happened to expose. `enforce_application_candidate_update_boundary()`
   (a `BEFORE UPDATE` trigger) makes "candidates can only withdraw, never
   edit employer-owned fields" an unbypassable Postgres constraint: for
   any UPDATE where the actor is not an org member of the application's
   organization, every column except
   `status`/`withdrawal_reason`/`withdrawn_at`/`updated_at`/`history` must
   be unchanged, or the update is rejected.

## Test sequence (all run live, then cleaned up)

Three throwaway `auth.users` rows: an employer (org owner), a candidate,
and a complete outsider. An org, a published opportunity, and one
candidate-submitted application were set up as fixtures.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Employer (org member) updates `stage`, `evaluation_notes`, `internal_rating` on the candidate's application | Succeeds — org members manage the full pipeline | ✅ All three fields updated |
| 2 | Outsider (zero relationship to the application) reads it | 0 rows | ✅ `outsider_sees_application = 0` |
| 3 | Outsider attempts a direct `INSERT` impersonating the real candidate's `applicant_user_id` | Rejected — `applicant_user_id` must equal `auth.uid()` | ✅ `42501: new row violates row-level security policy for table "applications"` |
| 4 | **The candidate self-promotes their own application's `stage` to `'hired'`** (the exact hijack the old policy allowed) | Rejected by the new trigger | ✅ `42501: Applicants may only withdraw their own application, not change its pipeline stage.` |
| 5 | The candidate rewrites `evaluation_notes` on their own application **without** touching `stage` (the subtler version of the same hijack) | Rejected by the new trigger | ✅ `42501: Applicants may only withdraw their own application; employer-managed fields cannot be self-edited.` |
| 6 | The candidate performs the **legitimate** self-service action: sets `stage`/`status` to `'withdrawn'` with a reason | Succeeds | ✅ Row updated correctly |

**6/6 passed** — most importantly, #4 and #5 prove the actual
vulnerability this migration fixes is closed, not just that the schema
looks right.

## Cleanup

All test applications, the opportunity, the organization/memberships
(owner-invariant trigger disabled only for the cleanup delete, then
re-enabled — same pattern as prior services), and the three
`auth.users`/`public.users` rows were removed. Verified
`org_left=0, opp_left=0, apps_left=0, users_left=0` after cleanup.

## What changed in the application

Like opportunityService, applicationService's public API was already
fully async, so it was wired live into `src/App.tsx` in the same pass:

- Removed a hardcoded two-application demo-seed fallback that used to run
  on first load when the local store was empty (`db.createApplication`
  calls baked into the `useState` initializer). An empty Supabase table is
  the correct starting state now, not something to backfill with fake
  data client-side.
- Added `refreshApplications()`, calling
  `applicationService.listByOrganization()` with no explicit org id. This
  works correctly for both roles without special-casing: an employer's
  session has an `activeOrganization`, so RLS (via `is_org_member`) scopes
  the result to their org's pipeline; a candidate with no
  `activeOrganization` still gets a result scoped to just their own
  applications, because the "Candidates can view their own applications"
  policy independently matches those rows regardless of the (absent)
  organization filter. A signed-out visitor gets nothing.
- Wired into the mount effect, the stage-update handler
  (`handleUpdateStage`), and the post-application-submit success handler
  (`handleApplySuccess`).
- `src/components/OpportunityDetailModal.tsx`'s `handleApply` already
  called `applicationService.submit(...)` with a correctly-shaped payload
  and handled `res.data`/`res.error` — no changes needed there; it now
  hits Supabase for real with zero code changes.

Three existing test files (`candidateAndApplication.test.ts`,
`services.test.ts`, `integrationFlows.test.ts`) called `applicationService`
directly against its old dbClient-backed contract; all three were
retargeted to call `dbClient.ts` directly instead (same pattern as
`jobMarketplace.test.ts` for Service 2), since that's the local
demo-mode data layer they're actually exercising now. One exception:
`integrationFlows.test.ts`'s guest/401 check
(`applicationService.listMyApplications()` while logged out) was left
calling the real service, since that check throws `UnauthorizedError`
before ever reaching Supabase and is safe to exercise as-is in this
sandbox.

## Known gaps, flagged not hidden

- **`notificationService` calls inside `submit()`/`updateStage()` still
  read organization membership via `dbClient.ts`** (`db.getOrganizationById`,
  `db.getMembershipsByOrganization`), wrapped in a try/catch so a
  notification failure never blocks the application/stage-update itself
  from succeeding. This means new-application notifications to org
  members won't fire correctly for an organization that only exists in
  Supabase (created via `organizationService`'s RPC) until
  `notificationService` itself is migrated — a later phase step, not
  Service 3's job.
- **`candidateService` is still fully local** (`db.*`) — the "Candidate
  Profile Management" tests in `candidateAndApplication.test.ts` are
  untouched and still call `candidateService` directly, since that
  domain is Service 4, not this one.
- `screening_answers` is stored as `jsonb` (defaulting to `[]`, an array)
  while the app's `Application.screeningAnswers` type is
  `Record<string,string>` (an object map) — a pre-existing shape mismatch
  from the Phase 1 schema, passed through as-is rather than papered over
  with an extra migration; whatever shape the caller sends is what's
  stored and returned.
