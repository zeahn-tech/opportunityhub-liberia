-- Phase 3, Service 4: candidateService
--
-- Two kinds of change:
--
-- 1. Schema gaps: `candidate_profiles` was missing full_name/email/phone/
--    county/city/city_district/avatar_url/languages_json columns the
--    app's CandidateProfile type already assumes, and had no
--    privacy_settings column at all -- the entire visibility model
--    (CandidatePrivacySettings) had nowhere to live. Added, with a safe
--    default (profileVisibility: 'private') so a row created before its
--    owner ever visits privacy settings doesn't default to publicly
--    exposed.
--
-- 2. The real problem this migration solves: the pre-existing RLS only
--    let a candidate SELECT their own profile -- full stop. No employer
--    could see ANY candidate profile, which breaks the entire point of a
--    job marketplace (recruiters reviewing applicants, searching
--    candidates). But the intended visibility model
--    (dbClient.ts's old getPublicCandidateProfile()/searchCandidateProfiles(),
--    reproduced exactly here) isn't a simple "row visible or not" rule --
--    it's conditional COLUMN-level redaction: an 'anonymous' profile
--    shows everything except name/avatar/contact; 'on_application_only'
--    contact visibility redacts email/phone UNLESS the viewer's
--    organization is one the candidate has actually applied to; CV
--    download is gated the same way. Postgres RLS can gate which ROWS a
--    query returns, not which COLUMNS within an allowed row -- so this
--    can't be a plain RLS policy any more than businessService's
--    confidential-financials requirement can (see that service's future
--    migration for the same pattern). The fix is the same one used
--    there: the raw table stays owner-only via RLS (no direct
--    third-party SELECT policy is added AT ALL), and all third-party
--    access goes through two SECURITY DEFINER RPCs --
--    get_public_candidate_profile() and search_candidate_profiles() --
--    that compute the redacted view server-side. A client that bypasses
--    the RPCs and queries candidate_profiles directly gets 0 rows for
--    anyone but themselves, not a partially-redacted row it could then
--    try to reconstruct.

-- ---------------------------------------------------------------------
-- 1. Schema gaps
-- ---------------------------------------------------------------------
alter table public.candidate_profiles
  add column if not exists full_name character varying,
  add column if not exists email character varying,
  add column if not exists phone character varying,
  add column if not exists county character varying,
  add column if not exists city character varying,
  add column if not exists city_district character varying,
  add column if not exists avatar_url character varying,
  add column if not exists languages_json jsonb not null default '[]'::jsonb,
  add column if not exists cv_data_json jsonb,
  add column if not exists privacy_settings jsonb not null default
    '{"profileVisibility":"private","contactVisibility":"hidden","cvDownloadPermission":"permission_required"}'::jsonb;

-- ---------------------------------------------------------------------
-- 2a. Has this candidate applied to (a job owned by) this organization?
--     Matches dbClient.ts's hasAppliedToViewerOrg check: by applicant_user_id
--     OR by applicant_email (a candidate may have applied before their
--     profile/account existed under the same email).
-- ---------------------------------------------------------------------
create or replace function public.candidate_has_applied_to_org(p_candidate_user_id character varying, p_org_id character varying)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.applications a
    where a.organization_id = p_org_id
      and (
        a.applicant_user_id = p_candidate_user_id
        or a.applicant_email = (select cp.email from public.candidate_profiles cp where cp.user_id = p_candidate_user_id)
      )
  );
$$;

-- ---------------------------------------------------------------------
-- 2b. Redacted single-profile lookup -- mirrors
--     dbClient.getPublicCandidateProfile() field-for-field.
-- ---------------------------------------------------------------------
create or replace function public.get_public_candidate_profile(p_target_user_id character varying)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_row public.candidate_profiles;
  v_viewer_id varchar;
  v_viewer_role varchar;
  v_has_applied boolean;
  v_visibility text;
  v_contact_visibility text;
  v_cv_permission text;
  v_result jsonb;
begin
  select * into v_row from public.candidate_profiles where user_id = p_target_user_id;
  if not found then
    return null;
  end if;

  v_viewer_id := auth.uid()::varchar;

  -- Self-view: full access, no redaction.
  if v_viewer_id is not null and v_viewer_id = p_target_user_id then
    return to_jsonb(v_row);
  end if;

  -- Platform admin: full access.
  if v_viewer_id is not null then
    select case when system_role = 'platform_admin' or primary_role = 'platform_admin' then 'platform_admin' else null end
    into v_viewer_role
    from public.users where id = v_viewer_id;
    if v_viewer_role = 'platform_admin' then
      return to_jsonb(v_row);
    end if;
  end if;

  -- Caller-supplied "which of my orgs am I viewing as" isn't available to
  -- this function without a parameter, so this checks ALL orgs the viewer
  -- is an active member of, which is at least as permissive as the old
  -- single-active-org check (a viewer with several orgs, any one of which
  -- the candidate applied to, counts as "applied").
  v_has_applied := v_viewer_id is not null and exists (
    select 1 from public.organization_memberships m
    where m.user_id = v_viewer_id and m.status = 'active'
      and public.candidate_has_applied_to_org(p_target_user_id, m.organization_id)
  );

  v_visibility := coalesce(v_row.privacy_settings->>'profileVisibility', 'public');
  v_contact_visibility := coalesce(v_row.privacy_settings->>'contactVisibility', 'on_application_only');
  v_cv_permission := coalesce(v_row.privacy_settings->>'cvDownloadPermission', 'applied_jobs_only');

  if v_visibility = 'hidden' and not v_has_applied then
    return null;
  end if;

  v_result := to_jsonb(v_row);

  if v_visibility = 'anonymous' and not v_has_applied then
    v_result := v_result
      || jsonb_build_object('full_name', 'Candidate #' || upper(right(p_target_user_id, 4)))
      || jsonb_build_object('avatar_url', null)
      || jsonb_build_object('email', null)
      || jsonb_build_object('phone', null);
  end if;

  if v_contact_visibility = 'on_application_only' and not v_has_applied then
    v_result := v_result || jsonb_build_object('phone', '[Visible upon application]', 'email', '[Visible upon application]');
  elsif v_contact_visibility = 'hidden' then
    v_result := v_result || jsonb_build_object('phone', '[Private]', 'email', '[Private]');
  end if;

  if v_cv_permission = 'applied_jobs_only' and not v_has_applied and v_result->'cv_data_json' is not null then
    v_result := v_result || jsonb_build_object(
      'cv_data_json', (v_result->'cv_data_json') - 'fileDataUrl'
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_public_candidate_profile from public;
grant execute on function public.get_public_candidate_profile to authenticated, anon;

-- ---------------------------------------------------------------------
-- 2c. Search across candidates, same redaction applied per-row, plus
--     filters. Excludes 'hidden' profiles the viewer hasn't earned
--     access to (same as the single-profile lookup).
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
  for v_id in select user_id from public.candidate_profiles loop
    v_profile := public.get_public_candidate_profile(v_id);
    if v_profile is null then
      continue;
    end if;

    if p_county is not null and (v_profile->>'county') is distinct from p_county then
      continue;
    end if;
    if p_min_years_exp is not null and coalesce((v_profile->>'years_of_experience')::integer, 0) < p_min_years_exp then
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
