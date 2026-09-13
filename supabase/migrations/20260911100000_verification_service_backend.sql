-- Phase 3, Service 7: verificationService
--
-- Two real gaps, not just a schema catch-up:
--
-- 1. No policy of any kind let anyone review a verification request.
--    `verification_audits` only had SELECT/INSERT policies scoped to
--    `is_org_admin(organization_id)` -- i.e. an org can submit and see
--    its own requests, but there was no UPDATE policy at all, and no
--    concept of "platform admin" anywhere in RLS to grant one. A
--    platform admin reviewing verification submissions also couldn't
--    SELECT requests from orgs they don't belong to (which, for a
--    platform admin, is normally every org) -- so the entire review
--    queue was unreachable through RLS as written.
--
-- 2. Approving a request never did anything to the organization. The old
--    dbClient.ts's updateAuditDecision() only flipped the audit's own
--    `status` field -- it never touched organizations.verification_status
--    or verification_badge (added in Service 1's migration). That makes
--    "verification" purely cosmetic: an approved audit exists, but the
--    org's badge never actually changes, so nothing downstream (search
--    filters, trust indicators shown on listings) reflects it. Fixed by
--    making the decision RPC update both tables atomically.

-- ---------------------------------------------------------------------
-- 1. Platform-admin check, reusable beyond this service (e.g.
--    trustSafetyService, Service 8, will need the same concept).
-- ---------------------------------------------------------------------
create or replace function public.is_platform_admin(p_user_id character varying)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.users
    where id = p_user_id
      and (system_role = 'platform_admin' or primary_role = 'platform_admin')
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Platform admins can see every verification audit (their review
--    queue), on top of the existing org-admin-sees-their-own policy.
-- ---------------------------------------------------------------------
drop policy if exists "Platform admins can view all verification audits" on public.verification_audits;
create policy "Platform admins can view all verification audits"
  on public.verification_audits for select
  to authenticated
  using (public.is_platform_admin(auth.uid()::character varying));

-- ---------------------------------------------------------------------
-- 3. Atomic decision: updates the audit AND, on approval, the
--    organization's verification status/badge -- the only path to
--    deciding a verification audit (no generic UPDATE policy is added;
--    a client attempting to UPDATE verification_audits directly gets
--    denied by RLS regardless of role, since no such policy exists).
-- ---------------------------------------------------------------------
create or replace function public.decide_verification_audit(
  p_audit_id character varying,
  p_decision character varying,
  p_reviewer_notes text default null
)
returns public.verification_audits
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_audit public.verification_audits;
  v_uid character varying;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null or not public.is_platform_admin(v_uid) then
    raise exception 'Only platform administrators may decide verification audits.' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.' using errcode = '22023';
  end if;

  update public.verification_audits
  set status = p_decision,
      reviewer_user_id = v_uid,
      reviewer_notes = p_reviewer_notes,
      reviewed_at = now()
  where id = p_audit_id
  returning * into v_audit;

  if not found then
    raise exception 'Verification audit % not found.' , p_audit_id using errcode = '02000';
  end if;

  if p_decision = 'approved' then
    update public.organizations
    set verification_status = 'verified',
        verification_badge = v_audit.requested_badge
    where id = v_audit.organization_id;
  end if;

  insert into public.audit_logs (id, user_id, organization_id, action, resource_type, resource_id, details)
  values (
    'auditlog-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_uid, v_audit.organization_id, 'verification.' || p_decision, 'verification_audit', v_audit.id,
    jsonb_build_object('requestedBadge', v_audit.requested_badge, 'reviewerNotes', p_reviewer_notes)
  );

  return v_audit;
end;
$$;

revoke all on function public.decide_verification_audit from public;
grant execute on function public.decide_verification_audit to authenticated;
