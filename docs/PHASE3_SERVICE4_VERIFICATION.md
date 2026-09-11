# Phase 3, Service 4 — candidateService — Live Verification Record

**Date**: September 10, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Services 1-3).

## What this proves, and what it doesn't

Same caveat as Services 1-3: SQL-level proof via role impersonation, not
an HTTP-level `supabase-js` test. `src/tests/candidateService.test.ts`
(6 tests, mocked Supabase client + mocked authService) covers the
service's own row-mapping and RPC-call logic.

## The real problem this service's migration solves

The pre-existing RLS on `candidate_profiles` only let a candidate `SELECT`
their **own** profile — full stop. No employer could see **any** candidate
profile, which breaks the core point of a job marketplace. But the
intended visibility model (reconstructed from
`dbClient.ts`'s old `getPublicCandidateProfile()`/`searchCandidateProfiles()`,
reproduced field-for-field here) isn't a simple "row visible or not"
rule — it's **conditional column-level redaction**:

- `profileVisibility: 'hidden'` → invisible entirely, unless the viewer's
  org is one the candidate applied to.
- `profileVisibility: 'anonymous'` → visible, but name/avatar/contact
  masked, unless applied.
- `contactVisibility: 'on_application_only'` → email/phone redacted with
  a placeholder, unless applied.
- `contactVisibility: 'hidden'` → email/phone always redacted.
- `cvDownloadPermission: 'applied_jobs_only'` → the CV's file data is
  stripped, unless applied.

Postgres RLS can gate which **rows** a query returns, not which
**columns** within an allowed row — the same limitation the task's
`businessService` constraint calls out explicitly for confidential
financials. So this migration uses the same fix pattern ahead of that
service: the raw table stays owner-only via RLS with **no additional
SELECT policy added at all**, and all third-party access goes through two
`SECURITY DEFINER` RPCs — `get_public_candidate_profile()` and
`search_candidate_profiles()` — that compute the redacted view entirely
in Postgres.

## Migration applied

`supabase/migrations/20260910150000_candidate_service_backend.sql` —
applied cleanly. Adds the missing columns the app's `CandidateProfile`
type already assumed (`full_name`, `email`, `phone`, `county`, `city`,
`city_district`, `avatar_url`, `languages_json`, `cv_data_json`,
`privacy_settings` — the last of these didn't exist at all, so the entire
visibility model had nowhere to live before this), with a **safe
default** (`profileVisibility: 'private'`) so a row created before its
owner visits privacy settings doesn't default to publicly exposed. Adds
`candidate_has_applied_to_org()`, `get_public_candidate_profile()`, and
`search_candidate_profiles()`.

## Test sequence (all run live, then cleaned up)

Three throwaway `auth.users` rows plus a second candidate profile: a
candidate (`profileVisibility: 'hidden'`), an employer with no relation
to them, a second candidate (`profileVisibility: 'anonymous'`), and a
true outsider.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Employer directly queries `candidate_profiles` for the hidden candidate's row (bypassing the RPC entirely) | 0 rows — no third-party SELECT policy exists at all | ✅ `employer_sees_raw_row = 0` |
| 2 | Employer calls `get_public_candidate_profile()` for the same candidate, no application relationship yet | `null` | ✅ |
| 3 | Employer creates an org + opportunity; the candidate applies to it; employer calls the RPC again | Now returns the **full, unredacted** profile — the application relationship unlocks it | ✅ Real name, phone, and email all returned correctly |
| 4 | A true outsider (zero relationship — no org, no application) calls the RPC for the same candidate | `null` | ✅ |
| 5 | Employer calls the RPC for the second candidate (`profileVisibility: 'anonymous'`, `contactVisibility: 'hidden'`, no application relationship) | Name masked to `Candidate #XXXX`, email/phone redacted, non-identifying fields (headline) still visible | ✅ `full_name: "Candidate #A2CD"`, `email: "[Private]"`, `headline: "Civil Engineer"` |
| 6 | Outsider calls `search_candidate_profiles(p_county := 'Bong')` | Returns the anonymous-masked profile, correctly redacted the same way as the direct lookup | ✅ |
| 7 | Outsider calls `search_candidate_profiles()` with no filters, across both seeded profiles (one hidden+unearned, one anonymous) | Only 1 of 2 returned — the hidden, unearned one is excluded from search entirely | ✅ `total_visible_to_outsider = 1` |

**7/7 passed** — critically, #1 and #4 prove the raw table and the RPC
both correctly deny an uninvolved party, #3 proves the "applying unlocks
visibility" rule actually works (not just that it looks right on paper),
and #5-#7 prove the redaction logic itself, not just row-level access.

## Cleanup

All test candidate profiles, the application, opportunity,
organization/memberships, and four `auth.users`/`public.users` rows were
removed. Verified `org_left=0, profiles_left=0, users_left=0` after
cleanup.

## What's live vs. what needed wiring

Unlike Services 2-3, **no `App.tsx` wiring was needed** —
`candidateService`'s three consumers
(`OpportunityDetailModal.tsx`, `RecruiterWorkspace.tsx`,
`CandidateDashboard.tsx`) already called it with `await`/`.then()` and
never touched `dbClient.ts` directly for candidate-profile data. This
service is therefore live in the running app automatically, with zero
component changes.

## Design decisions and gaps, explicitly not hidden

- **`isSearchable` is stored but never actually consulted** to gate
  search results — this was already true in the old `dbClient.ts`
  implementation (a pre-existing incompleteness, not introduced here) and
  is preserved as-is for behavioral fidelity, rather than silently adding
  stricter enforcement than the app has ever had.
- **`'verified_employers_only'` and `'private'` are not distinctly
  handled** — matching `dbClient.ts`'s actual (not aspirational)
  behavior: only `'hidden'` blocks visibility and only `'anonymous'`
  masks identity; every other value (including `'public'`, `'private'`,
  and `'verified_employers_only'`) falls through to full visibility,
  subject only to `contactVisibility`/`cvDownloadPermission` redaction.
  The `CandidatePrivacySettings` type's richer enum was never fully
  implemented in the app this migration is replacing — reproduced
  faithfully, not "fixed" unprompted, since that would be a product
  decision beyond this migration's scope.
- **`get_public_candidate_profile()`'s "which org am I viewing as"
  context** checks ALL of the caller's active org memberships, not a
  single passed-in `viewerOrgId` like the old `dbClient.ts` signature
  took — at least as permissive as the original (a viewer with several
  orgs, any one of which the candidate applied to, counts as "applied"),
  and avoids a parameter (`viewerOrgId` supplied by the client) the RPC
  would otherwise have to trust rather than verify.
- `screening_answers`-style shape mismatches don't apply here, but
  `cv_data_json` mixes concerns with the pre-existing `cv_file_url`/
  `cv_raw_text` columns from Phase 1 — the service prefers
  `cv_data_json` and falls back to `cv_file_url` only if the former is
  empty, rather than attempting to merge both.
