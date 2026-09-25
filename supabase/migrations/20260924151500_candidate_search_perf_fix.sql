-- ---------------------------------------------------------------------
-- Phase 4b (Performance): reduce the N+1 fan-out in
-- search_candidate_profiles().
--
-- Problem: the version from 20260910150000_candidate_service_backend.sql
-- loops over user_id for EVERY row in candidate_profiles -- with no
-- filter pushdown at all -- and calls get_public_candidate_profile(v_id)
-- for each one (itself several queries: the profile row, a
-- platform_admin role check, and an EXISTS over the viewer's
-- organization_memberships joined to candidate_has_applied_to_org(),
-- which is its own query against applications). All five filters
-- (county, skill, education, min-years, free-text) are then applied
-- AFTER that redacted profile comes back, in PL/pgSQL. So a platform
-- with, say, 5,000 candidate profiles pays for roughly 5,000 x (3-4
-- queries) on every single search, regardless of how narrow the filters
-- are.
--
-- Fix (intentionally partial -- see below): push the two filters that
-- are plain, indexable columns on candidate_profiles itself (county,
-- years_of_experience) into the initial row-selection query, so the
-- expensive per-row redaction call only runs for candidates who already
-- match those two filters instead of the whole table. This does NOT
-- touch get_public_candidate_profile()'s redaction/visibility logic in
-- any way -- same function, same rules, called on fewer rows.
--
-- Why not a full rewrite (matching this migration's business-listing
-- counterpart): get_public_candidate_profile()'s redaction depends on
-- per-viewer state (which orgs they belong to, whether THIS candidate
-- applied to any of them, platform-admin role, three separate privacy
-- toggles) that the codebase deliberately keeps inside one
-- security-sensitive, previously-audited function -- see this
-- migration's source file's own comment: "a client that bypasses the
-- RPCs and queries candidate_profiles directly gets 0 rows for anyone
-- but themselves, not a partially-redacted row it could then try to
-- reconstruct." Re-deriving that same logic inline in a set-based query
-- risks a subtle privacy regression (e.g. an anonymous or hidden
-- profile's real name/contact leaking through a join that isn't
-- exercised by the existing single-profile test coverage), which is a
-- worse outcome than a slower query. The skill/education/free-text
-- filters stay applied post-redaction for the same reason: they read
-- jsonb fields whose shape depends on the redaction step that just ran.
-- ---------------------------------------------------------------------

create or replace function public.search_candidate_profiles(
  p_county text default null,
  p_skill text default null,
  p_education text default null,
  p_min_years_exp integer default null,
  p_query text default null
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id character varying;
  v_profile jsonb;
begin
  for v_id in
    select user_id from public.candidate_profiles
    where (p_county is null or county = p_county)
      and (p_min_years_exp is null or coalesce(years_of_experience, 0) >= p_min_years_exp)
  loop
    v_profile := public.get_public_candidate_profile(v_id);
    if v_profile is null then
      continue;
    end if;

    if p_skill is not null and not (v_profile->'skills_json')::text ilike ('%' || p_skill || '%') then
      continue;
    end if;
    if p_education is not null
      and not (
        coalesce(v_profile->>'highest_education_level', '') ilike ('%' || p_education || '%')
        or (v_profile->'education_history_json')::text ilike ('%' || p_education || '%')
      )
    then
      continue;
    end if;
    if p_query is not null
      and not (
        coalesce(v_profile->>'full_name', '') ilike ('%' || p_query || '%')
        or coalesce(v_profile->>'headline', '') ilike ('%' || p_query || '%')
        or coalesce(v_profile->>'bio', '') ilike ('%' || p_query || '%')
        or (v_profile->'skills_json')::text ilike ('%' || p_query || '%')
      )
    then
      continue;
    end if;

    return next v_profile;
  end loop;
end;
$$;

revoke all on function public.search_candidate_profiles from public;
grant execute on function public.search_candidate_profiles to authenticated, anon;

comment on function public.search_candidate_profiles is
  'Candidate directory search. County/min-years filters are pushed into the row scan to cut the per-row redaction fan-out (see 20260924150000_business_listings_list_perf_fix.sql''s sibling comment); skill/education/free-text filters still run post-redaction on purpose -- see 20260924151500_candidate_search_perf_fix.sql for why a full rewrite was not attempted here.';
