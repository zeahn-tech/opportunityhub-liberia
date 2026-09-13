-- Phase 3, Service 8: trustSafetyService
--
-- Builds a whole new schema from scratch (same situation as messaging,
-- Service 6): verification_requests, content_reports,
-- account_restrictions, suspicious_activity_events had no backing tables
-- at all -- this is a genuinely separate, richer system from
-- verification_audits (Service 7): VerificationRequest covers
-- organization/recruiter/business entities with evidence documents,
-- reviewed by "Verification Officers," and is what
-- VerificationHub.tsx/TrustSafetyAdminCenter.tsx actually call. The two
-- systems are left as they are in the app (not unified) -- reconciling
-- them would be a product decision beyond a data-layer migration.
--
-- Two invariants moved server-side, not just schema:
--   - submit_content_report(): the old dbClient.ts auto-quarantine logic
--     ("if a target has >= 2 reports, create a suspicious-activity event
--     and quarantine the listing") needs to COUNT REPORTS ACROSS ALL
--     REPORTERS for a target -- but a reporter's own RLS only lets them
--     see their own reports. That count can only be computed correctly
--     server-side, so report submission is a SECURITY DEFINER RPC, not a
--     plain insert.
--   - apply_account_restriction()/lift_account_restriction(): a
--     full_suspension restriction must atomically flip
--     users.account_status -- done in the same RPC, platform-admin-only.

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.verification_requests (
  id character varying primary key,
  entity_type character varying not null,
  entity_id character varying not null,
  entity_name character varying not null,
  submitter_user_id character varying not null references public.users(id),
  submitter_name character varying not null,
  submitter_email character varying not null,
  status character varying not null default 'pending_review',
  badge_requested character varying not null,
  registration_number character varying,
  tax_id_number character varying,
  license_number character varying,
  county character varying not null,
  evidence_documents jsonb not null default '[]'::jsonb,
  evidence_notes text,
  reviewer_user_id character varying,
  reviewer_name character varying,
  reviewer_notes text,
  rejection_reason text,
  submitted_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.content_reports (
  id character varying primary key,
  report_type character varying not null,
  target_id character varying not null,
  target_title_or_name character varying not null,
  reporter_user_id character varying not null references public.users(id),
  reporter_name character varying not null,
  reporter_email character varying not null,
  reason character varying not null,
  details text not null,
  evidence_urls jsonb not null default '[]'::jsonb,
  status character varying not null default 'pending',
  action_taken character varying,
  admin_notes text,
  reviewed_by_user_id character varying,
  reviewed_by_name character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.account_restrictions (
  id character varying primary key,
  user_id character varying not null references public.users(id),
  user_name character varying not null,
  user_email character varying not null,
  organization_id character varying,
  restriction_type character varying not null,
  reason text not null,
  issued_by_user_id character varying not null,
  issued_by_name character varying not null,
  expires_at timestamp with time zone,
  status character varying not null default 'active',
  appeal_notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone
);

create table if not exists public.suspicious_activity_events (
  id character varying primary key,
  actor_user_id character varying,
  actor_name character varying,
  actor_email character varying,
  ip_address character varying,
  event_type character varying not null,
  severity character varying not null,
  description text not null,
  status character varying not null default 'detected',
  created_at timestamp with time zone not null default now()
);

alter table public.verification_requests enable row level security;
alter table public.content_reports enable row level security;
alter table public.account_restrictions enable row level security;
alter table public.suspicious_activity_events enable row level security;

-- ---------------------------------------------------------------------
-- 2. RLS: submitters see their own; platform admins see everything.
--    All decision/action paths go through RPCs below (see header
--    comment) -- no generic UPDATE policy is added to any of these
--    four tables.
-- ---------------------------------------------------------------------
drop policy if exists "Submitters can view their own verification requests" on public.verification_requests;
create policy "Submitters can view their own verification requests"
  on public.verification_requests for select
  to authenticated
  using (submitter_user_id = auth.uid()::character varying);

drop policy if exists "Platform admins can view all verification requests" on public.verification_requests;
create policy "Platform admins can view all verification requests"
  on public.verification_requests for select
  to authenticated
  using (public.is_platform_admin(auth.uid()::character varying));

drop policy if exists "Users can submit verification requests for themselves" on public.verification_requests;
create policy "Users can submit verification requests for themselves"
  on public.verification_requests for insert
  to authenticated
  with check (submitter_user_id = auth.uid()::character varying);

drop policy if exists "Reporters can view their own reports" on public.content_reports;
create policy "Reporters can view their own reports"
  on public.content_reports for select
  to authenticated
  using (reporter_user_id = auth.uid()::character varying);

drop policy if exists "Platform admins can view all reports" on public.content_reports;
create policy "Platform admins can view all reports"
  on public.content_reports for select
  to authenticated
  using (public.is_platform_admin(auth.uid()::character varying));

drop policy if exists "Restricted users can view their own restrictions" on public.account_restrictions;
create policy "Restricted users can view their own restrictions"
  on public.account_restrictions for select
  to authenticated
  using (user_id = auth.uid()::character varying);

drop policy if exists "Platform admins can view all restrictions" on public.account_restrictions;
create policy "Platform admins can view all restrictions"
  on public.account_restrictions for select
  to authenticated
  using (public.is_platform_admin(auth.uid()::character varying));

drop policy if exists "Platform admins can view suspicious activity" on public.suspicious_activity_events;
create policy "Platform admins can view suspicious activity"
  on public.suspicious_activity_events for select
  to authenticated
  using (public.is_platform_admin(auth.uid()::character varying));

-- ---------------------------------------------------------------------
-- 3. RPCs
-- ---------------------------------------------------------------------
create or replace function public.review_verification_request(
  p_request_id character varying,
  p_decision character varying,
  p_reviewer_notes text default null,
  p_rejection_reason text default null
)
returns public.verification_requests
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_req public.verification_requests;
  v_uid character varying;
  v_reviewer_name character varying;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null or not public.is_platform_admin(v_uid) then
    raise exception 'Only platform administrators may review verification requests.' using errcode = '42501';
  end if;

  select full_name into v_reviewer_name from public.users where id = v_uid;

  update public.verification_requests
  set status = p_decision,
      reviewer_user_id = v_uid,
      reviewer_name = coalesce(v_reviewer_name, 'Verification Officer'),
      reviewer_notes = p_reviewer_notes,
      rejection_reason = p_rejection_reason,
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id
  returning * into v_req;

  if not found then
    raise exception 'Verification request % not found.', p_request_id using errcode = '02000';
  end if;

  if p_decision = 'verified' then
    if v_req.entity_type = 'organization' then
      update public.organizations
      set verification_status = 'verified',
          verification_badge = v_req.badge_requested,
          registration_number = coalesce(v_req.registration_number, registration_number),
          tax_id_number = coalesce(v_req.tax_id_number, tax_id_number)
      where id = v_req.entity_id;
    elsif v_req.entity_type = 'business' then
      update public.business_listings
      set is_verified = true,
          moderation_status = 'published'
      where id = v_req.entity_id;
    end if;
  end if;

  insert into public.audit_logs (id, user_id, action, resource_type, resource_id, details)
  values (
    'auditlog-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_uid, 'verification.decide', v_req.entity_type, v_req.id,
    jsonb_build_object('decision', p_decision, 'reviewerNotes', p_reviewer_notes)
  );

  return v_req;
end;
$$;

revoke all on function public.review_verification_request from public;
grant execute on function public.review_verification_request to authenticated;

-- Insert-with-server-computed-quarantine-check, see header comment.
create or replace function public.submit_content_report(
  p_id character varying,
  p_report_type character varying,
  p_target_id character varying,
  p_target_title_or_name character varying,
  p_reason character varying,
  p_details text,
  p_evidence_urls jsonb default '[]'::jsonb
)
returns public.content_reports
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_report public.content_reports;
  v_uid character varying;
  v_reporter_name character varying;
  v_reporter_email character varying;
  v_report_count integer;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null then
    raise exception 'Authentication required to submit a report.' using errcode = '28000';
  end if;

  select full_name, email into v_reporter_name, v_reporter_email from public.users where id = v_uid;

  insert into public.content_reports (
    id, report_type, target_id, target_title_or_name, reporter_user_id, reporter_name, reporter_email,
    reason, details, evidence_urls, status
  ) values (
    p_id, p_report_type, p_target_id, p_target_title_or_name, v_uid,
    coalesce(v_reporter_name, 'Reporter'), coalesce(v_reporter_email, 'unknown'),
    p_reason, p_details, p_evidence_urls, 'pending'
  )
  returning * into v_report;

  select count(*) into v_report_count from public.content_reports where target_id = p_target_id;

  if v_report_count >= 2 then
    insert into public.suspicious_activity_events (id, actor_user_id, event_type, severity, description, status)
    values (
      'susact-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
      v_uid, 'multiple_reports', 'high',
      format('Target %s (%s) reached %s user reports. Auto-quarantining for admin review.', p_target_title_or_name, p_target_id, v_report_count),
      'detected'
    );

    if p_report_type = 'listing' then
      update public.opportunities
      set moderation_status = 'quarantined', report_count = v_report_count
      where id = p_target_id;
    end if;
  end if;

  insert into public.audit_logs (id, user_id, action, resource_type, resource_id, details)
  values (
    'auditlog-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_uid, 'report.submit', p_report_type, p_target_id, jsonb_build_object('reason', p_reason)
  );

  return v_report;
end;
$$;

revoke all on function public.submit_content_report from public;
grant execute on function public.submit_content_report to authenticated;

create or replace function public.resolve_content_report(
  p_report_id character varying,
  p_action_taken character varying,
  p_admin_notes text default null
)
returns public.content_reports
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_report public.content_reports;
  v_uid character varying;
  v_admin_name character varying;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null or not public.is_platform_admin(v_uid) then
    raise exception 'Only platform administrators may resolve reports.' using errcode = '42501';
  end if;

  select full_name into v_admin_name from public.users where id = v_uid;

  update public.content_reports
  set status = case when p_action_taken = 'dismissed' then 'dismissed' else 'actioned' end,
      action_taken = p_action_taken,
      admin_notes = p_admin_notes,
      reviewed_by_user_id = v_uid,
      reviewed_by_name = coalesce(v_admin_name, 'Platform Administrator'),
      updated_at = now()
  where id = p_report_id
  returning * into v_report;

  if not found then
    raise exception 'Content report % not found.', p_report_id using errcode = '02000';
  end if;

  insert into public.audit_logs (id, user_id, action, resource_type, resource_id, details)
  values (
    'auditlog-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_uid, 'report.resolve', v_report.report_type, v_report.id,
    jsonb_build_object('actionTaken', p_action_taken, 'adminNotes', p_admin_notes)
  );

  return v_report;
end;
$$;

revoke all on function public.resolve_content_report from public;
grant execute on function public.resolve_content_report to authenticated;

create or replace function public.apply_account_restriction(
  p_id character varying,
  p_target_user_id character varying,
  p_restriction_type character varying,
  p_reason text,
  p_expires_at timestamp with time zone default null
)
returns public.account_restrictions
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restriction public.account_restrictions;
  v_uid character varying;
  v_issuer_name character varying;
  v_target_name character varying;
  v_target_email character varying;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null or not public.is_platform_admin(v_uid) then
    raise exception 'Only platform administrators may restrict an account.' using errcode = '42501';
  end if;

  select full_name, email into v_target_name, v_target_email from public.users where id = p_target_user_id;
  if v_target_name is null then
    raise exception 'User % not found.', p_target_user_id using errcode = '02000';
  end if;
  select full_name into v_issuer_name from public.users where id = v_uid;

  insert into public.account_restrictions (
    id, user_id, user_name, user_email, restriction_type, reason,
    issued_by_user_id, issued_by_name, expires_at, status
  ) values (
    p_id, p_target_user_id, v_target_name, v_target_email, p_restriction_type, p_reason,
    v_uid, coalesce(v_issuer_name, 'Platform Administrator'), p_expires_at, 'active'
  )
  returning * into v_restriction;

  if p_restriction_type = 'full_suspension' then
    update public.users set account_status = 'suspended' where id = p_target_user_id;
  end if;

  insert into public.audit_logs (id, user_id, action, resource_type, resource_id, details)
  values (
    'auditlog-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_uid, 'user.restrict', 'user', p_target_user_id,
    jsonb_build_object('restrictionType', p_restriction_type, 'reason', p_reason)
  );

  return v_restriction;
end;
$$;

revoke all on function public.apply_account_restriction from public;
grant execute on function public.apply_account_restriction to authenticated;

create or replace function public.lift_account_restriction(p_restriction_id character varying)
returns public.account_restrictions
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restriction public.account_restrictions;
  v_uid character varying;
  v_still_active_others integer;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null or not public.is_platform_admin(v_uid) then
    raise exception 'Only platform administrators may lift an account restriction.' using errcode = '42501';
  end if;

  update public.account_restrictions
  set status = 'lifted', updated_at = now()
  where id = p_restriction_id
  returning * into v_restriction;

  if not found then
    raise exception 'Account restriction % not found.', p_restriction_id using errcode = '02000';
  end if;

  select count(*) into v_still_active_others
  from public.account_restrictions
  where user_id = v_restriction.user_id and restriction_type = 'full_suspension' and status = 'active';

  if v_still_active_others = 0 then
    update public.users set account_status = 'active' where id = v_restriction.user_id and account_status = 'suspended';
  end if;

  insert into public.audit_logs (id, user_id, action, resource_type, resource_id, details)
  values (
    'auditlog-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_uid, 'user.lift_restriction', 'user', v_restriction.user_id,
    jsonb_build_object('restrictionId', p_restriction_id)
  );

  return v_restriction;
end;
$$;

revoke all on function public.lift_account_restriction from public;
grant execute on function public.lift_account_restriction to authenticated;
