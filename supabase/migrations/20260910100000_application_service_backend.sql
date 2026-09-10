-- Phase 3, Service 3: applicationService
--
-- Two kinds of change:
--
-- 1. Schema gaps between `public.applications` and the app's `Application`
--    type (src/types/index.ts) -- same "add what the type already
--    assumes" pattern as Services 1 and 2. `applications` had 0 rows in
--    production at the time of this migration, so no data-preservation
--    concern here (unlike the organizations/opportunities migrations).
--
-- 2. A real RLS gap: "Candidates can withdraw applications" (UPDATE,
--    USING applicant_user_id = auth.uid()) has no WITH CHECK and no
--    column restriction -- Postgres RLS can't restrict *which* columns an
--    UPDATE touches, only *whether* the row qualifies. As written, that
--    policy lets an applicant directly PATCH their own application's
--    `stage`, `evaluation_notes`, `internal_rating`, or any other
--    employer-only field via a raw Supabase call -- e.g. self-promoting
--    their own application to 'hired', or rewriting the interviewer's
--    notes. dbClient.ts's old application-level withdrawApplication()
--    only ever touched stage/withdrawalReason/withdrawnAt/history, but
--    that was never enforced as a real boundary -- it was just the only
--    code path the old local-store implementation happened to expose.
--    enforce_application_candidate_update_boundary() makes "a candidate
--    can only withdraw, never edit employer-owned fields" a real,
--    unbypassable constraint: for any UPDATE where the actor is not an
--    org member of the application's organization, every column except
--    status/withdrawal_reason/withdrawn_at/updated_at/history must be
--    unchanged, or the update is rejected.

-- ---------------------------------------------------------------------
-- 1. Schema gaps
-- ---------------------------------------------------------------------
alter table public.applications
  add column if not exists match_score numeric,
  add column if not exists match_notes text,
  add column if not exists rejection_reason text,
  add column if not exists withdrawal_reason text,
  add column if not exists withdrawn_at timestamp with time zone,
  add column if not exists interview_details jsonb,
  add column if not exists hiring_offer_details jsonb,
  add column if not exists history jsonb not null default '[]'::jsonb,
  add column if not exists resume_file_name character varying,
  add column if not exists resume_data_url text,
  add column if not exists resume_url character varying,
  add column if not exists evaluation_strengths jsonb not null default '[]'::jsonb,
  add column if not exists evaluation_improvements jsonb not null default '[]'::jsonb,
  add column if not exists internal_notes text;

-- ---------------------------------------------------------------------
-- 2. Candidate self-service is withdraw-only, enforced in Postgres
-- ---------------------------------------------------------------------
create or replace function public.enforce_application_candidate_update_boundary()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Org members (recruiters/admins/owners) manage the full pipeline --
  -- no restriction beyond the existing "Org members can update
  -- applications" RLS policy that gated this UPDATE in the first place.
  if public.is_org_member(old.organization_id) then
    return new;
  end if;

  -- Anyone else who reached this trigger only got here because they
  -- passed "Candidates can withdraw applications" (applicant_user_id =
  -- auth.uid()). Restrict them to the withdrawal fields only.
  if new.stage is distinct from old.stage and new.stage is distinct from 'withdrawn' then
    raise exception 'Applicants may only withdraw their own application, not change its pipeline stage.' using errcode = '42501';
  end if;

  if new.opportunity_id is distinct from old.opportunity_id
    or new.applicant_user_id is distinct from old.applicant_user_id
    or new.organization_id is distinct from old.organization_id
    or new.applicant_full_name is distinct from old.applicant_full_name
    or new.applicant_email is distinct from old.applicant_email
    or new.applicant_phone is distinct from old.applicant_phone
    or new.applicant_county is distinct from old.applicant_county
    or new.cover_letter is distinct from old.cover_letter
    or new.cv_url is distinct from old.cv_url
    or new.screening_answers is distinct from old.screening_answers
    or new.evaluation_notes is distinct from old.evaluation_notes
    or new.internal_rating is distinct from old.internal_rating
    or new.match_score is distinct from old.match_score
    or new.match_notes is distinct from old.match_notes
    or new.rejection_reason is distinct from old.rejection_reason
    or new.interview_details is distinct from old.interview_details
    or new.hiring_offer_details is distinct from old.hiring_offer_details
    or new.resume_file_name is distinct from old.resume_file_name
    or new.resume_data_url is distinct from old.resume_data_url
    or new.resume_url is distinct from old.resume_url
    or new.evaluation_strengths is distinct from old.evaluation_strengths
    or new.evaluation_improvements is distinct from old.evaluation_improvements
    or new.internal_notes is distinct from old.internal_notes
    or new.applied_at is distinct from old.applied_at
  then
    raise exception 'Applicants may only withdraw their own application; employer-managed fields cannot be self-edited.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_application_candidate_update_boundary on public.applications;
create trigger trg_enforce_application_candidate_update_boundary
  before update on public.applications
  for each row execute function public.enforce_application_candidate_update_boundary();
