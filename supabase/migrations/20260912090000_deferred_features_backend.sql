-- Phase 3 follow-up: closing the deferred-scope sub-features flagged
-- across Services 1, 5, and 6 during the main migration
-- (docs/PHASE3_SERVICE1_VERIFICATION.md, PHASE3_SERVICE5_VERIFICATION.md,
-- PHASE3_SERVICE6_VERIFICATION.md) -- organization invitations, business
-- saves/inquiries. Message reports (also flagged) need no new schema at
-- all: they're folded into Service 8's content_reports table
-- (report_type = 'message'), since that table was already designed to
-- cover it -- see the messagingService.ts change accompanying this
-- migration.

-- ---------------------------------------------------------------------
-- 1. organization_invitations
-- ---------------------------------------------------------------------
create table if not exists public.organization_invitations (
  id character varying primary key,
  organization_id character varying not null references public.organizations(id) on delete cascade,
  inviter_user_id character varying not null references public.users(id),
  invitee_email character varying not null,
  org_role character varying not null,
  permissions jsonb not null default '[]'::jsonb,
  token character varying not null unique,
  status character varying not null default 'pending',
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  responded_at timestamp with time zone,
  notes text
);
create index if not exists idx_org_invitations_email on public.organization_invitations(invitee_email);

alter table public.organization_invitations enable row level security;

-- Org members with 'members.invite' (role or explicit permission grant,
-- same has_org_permission() helper from Service 2's migration) can see
-- and issue invitations for their own org.
drop policy if exists "Org members with invite permission can view invitations" on public.organization_invitations;
create policy "Org members with invite permission can view invitations"
  on public.organization_invitations for select
  to authenticated
  using (public.has_org_permission(organization_id, 'members.invite'));

drop policy if exists "Org members with invite permission can create invitations" on public.organization_invitations;
create policy "Org members with invite permission can create invitations"
  on public.organization_invitations for insert
  to authenticated
  with check (public.has_org_permission(organization_id, 'members.invite') and inviter_user_id = auth.uid()::character varying);

drop policy if exists "Org members with invite permission can revoke invitations" on public.organization_invitations;
create policy "Org members with invite permission can revoke invitations"
  on public.organization_invitations for update
  to authenticated
  using (public.has_org_permission(organization_id, 'members.invite'));

-- The invitee needs to see (and later accept/decline) invitations
-- addressed to their own email, even though they are not yet a member
-- of that org -- matched against their OWN verified account email, not
-- a client-supplied value.
drop policy if exists "Invitees can view invitations addressed to their email" on public.organization_invitations;
create policy "Invitees can view invitations addressed to their email"
  on public.organization_invitations for select
  to authenticated
  using (lower(invitee_email) = lower((select email from public.users where id = auth.uid()::character varying)));

-- Accepting an invitation has the same chicken-and-egg problem as
-- organization creation (Service 1): the invitee has no membership row
-- yet, so a membership INSERT policy can't authorize them adding
-- themselves. Same fix: a SECURITY DEFINER RPC that validates the token,
-- confirms it matches the CALLER's own verified email (never a
-- client-supplied email), checks expiry, and creates/reactivates the
-- membership atomically.
create or replace function public.accept_organization_invitation(p_token character varying)
returns public.organization_memberships
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_inv public.organization_invitations;
  v_uid character varying;
  v_user_email character varying;
  v_membership public.organization_memberships;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null then
    raise exception 'Authentication required to accept an invitation.' using errcode = '28000';
  end if;

  select * into v_inv from public.organization_invitations where token = p_token;
  if not found then
    raise exception 'Invitation not found.' using errcode = '02000';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'This invitation has already been %.', v_inv.status using errcode = '22023';
  end if;
  if v_inv.expires_at <= now() then
    update public.organization_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'This organization invitation has expired.' using errcode = '22023';
  end if;

  select email into v_user_email from public.users where id = v_uid;
  if lower(coalesce(v_user_email, '')) <> lower(v_inv.invitee_email) then
    raise exception 'This organization invitation was issued to a different email address.' using errcode = '42501';
  end if;

  select * into v_membership
  from public.organization_memberships
  where organization_id = v_inv.organization_id and user_id = v_uid;

  if found then
    update public.organization_memberships
    set status = 'active', org_role = v_inv.org_role, permissions = v_inv.permissions, updated_at = now()
    where id = v_membership.id
    returning * into v_membership;
  else
    insert into public.organization_memberships (id, organization_id, user_id, org_role, status, permissions)
    values (
      'mem-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
      v_inv.organization_id, v_uid, v_inv.org_role, 'active', v_inv.permissions
    )
    returning * into v_membership;
  end if;

  update public.organization_invitations
  set status = 'accepted', responded_at = now()
  where id = v_inv.id;

  return v_membership;
end;
$$;

revoke all on function public.accept_organization_invitation from public;
grant execute on function public.accept_organization_invitation to authenticated;

-- Decline is a simple self-scoped status change with no cross-table
-- effect, so it's a direct policy rather than an RPC.
drop policy if exists "Invitees can decline their own invitation" on public.organization_invitations;
create policy "Invitees can decline their own invitation"
  on public.organization_invitations for update
  to authenticated
  using (lower(invitee_email) = lower((select email from public.users where id = auth.uid()::character varying)));

create or replace function public.enforce_invitation_update_boundary()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_is_org_inviter boolean;
begin
  v_is_org_inviter := public.has_org_permission(old.organization_id, 'members.invite');

  -- The invitee (not an org inviter) may only ever set status to
  -- 'rejected', and nothing else on the row.
  if not v_is_org_inviter then
    if new.status is distinct from 'rejected'
      or new.organization_id is distinct from old.organization_id
      or new.inviter_user_id is distinct from old.inviter_user_id
      or new.invitee_email is distinct from old.invitee_email
      or new.org_role is distinct from old.org_role
      or new.permissions is distinct from old.permissions
      or new.token is distinct from old.token
      or new.expires_at is distinct from old.expires_at
    then
      raise exception 'Invitees may only decline their own invitation, nothing else.' using errcode = '42501';
    end if;
    new.responded_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_invitation_update_boundary on public.organization_invitations;
create trigger trg_enforce_invitation_update_boundary
  before update on public.organization_invitations
  for each row execute function public.enforce_invitation_update_boundary();

-- ---------------------------------------------------------------------
-- 2. business_saved_listings
-- ---------------------------------------------------------------------
create table if not exists public.business_saved_listings (
  user_id character varying not null references public.users(id) on delete cascade,
  listing_id character varying not null references public.business_listings(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (user_id, listing_id)
);

alter table public.business_saved_listings enable row level security;

drop policy if exists "Users manage their own saved listings" on public.business_saved_listings;
create policy "Users manage their own saved listings"
  on public.business_saved_listings for all
  to authenticated
  using (user_id = auth.uid()::character varying)
  with check (user_id = auth.uid()::character varying);

-- ---------------------------------------------------------------------
-- 3. business_inquiries
-- ---------------------------------------------------------------------
create table if not exists public.business_inquiries (
  id character varying primary key,
  listing_id character varying not null references public.business_listings(id) on delete cascade,
  sender_user_id character varying not null references public.users(id),
  sender_name character varying not null,
  sender_email character varying not null,
  sender_phone character varying,
  message text not null,
  inquiry_type character varying not null default 'general',
  status character varying not null default 'unread',
  created_at timestamp with time zone not null default now()
);

alter table public.business_inquiries enable row level security;

drop policy if exists "Senders can view their own inquiries" on public.business_inquiries;
create policy "Senders can view their own inquiries"
  on public.business_inquiries for select
  to authenticated
  using (sender_user_id = auth.uid()::character varying);

drop policy if exists "Listing owners can view inquiries about their listing" on public.business_inquiries;
create policy "Listing owners can view inquiries about their listing"
  on public.business_inquiries for select
  to authenticated
  using (exists (select 1 from public.business_listings bl where bl.id = listing_id and bl.owner_user_id = auth.uid()::character varying));

drop policy if exists "Authenticated users can send an inquiry as themselves" on public.business_inquiries;
create policy "Authenticated users can send an inquiry as themselves"
  on public.business_inquiries for insert
  to authenticated
  with check (sender_user_id = auth.uid()::character varying);

drop policy if exists "Listing owners can mark inquiries read" on public.business_inquiries;
create policy "Listing owners can mark inquiries read"
  on public.business_inquiries for update
  to authenticated
  using (exists (select 1 from public.business_listings bl where bl.id = listing_id and bl.owner_user_id = auth.uid()::character varying));

create or replace function public.enforce_inquiry_update_boundary()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.message is distinct from old.message
    or new.sender_user_id is distinct from old.sender_user_id
    or new.sender_name is distinct from old.sender_name
    or new.sender_email is distinct from old.sender_email
    or new.sender_phone is distinct from old.sender_phone
    or new.listing_id is distinct from old.listing_id
    or new.inquiry_type is distinct from old.inquiry_type
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only status may be updated on an inquiry.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_inquiry_update_boundary on public.business_inquiries;
create trigger trg_enforce_inquiry_update_boundary
  before update on public.business_inquiries
  for each row execute function public.enforce_inquiry_update_boundary();
