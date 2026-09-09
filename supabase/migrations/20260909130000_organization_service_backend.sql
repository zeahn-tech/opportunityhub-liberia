-- Phase 3, Service 1: organizationService / memberships
--
-- This migration supports moving src/services/organizationService.ts off
-- dbClient.ts's local store and onto real Supabase queries + RLS.
--
-- Three things, each with a reason:
--
-- 1. `organizations` is missing columns that the app's `Organization` type
--    (src/types/index.ts) already assumes exist (isVerified, website,
--    logoText, address, registrationNumber, taxIdNumber, establishedYear,
--    contactEmail, contactPhone). The Phase 1 schema only modeled a subset.
--    Added as nullable / defaulted so this is backward compatible with the
--    4 existing seed rows.
--
-- 2. `organizations` has an INSERT policy for authenticated users, but
--    `organization_memberships` does not -- its only write policy is
--    "Org admins can manage memberships", which calls is_org_admin(), which
--    itself queries organization_memberships for an existing 'admin'/'owner'
--    row. A user creating a brand-new org has no membership row yet, so
--    they can insert the org but can never grant themselves ownership of
--    it via a plain client insert -- a chicken-and-egg gap, not a design
--    choice. `create_organization_with_owner()` is a SECURITY DEFINER RPC
--    that does both inserts in one transaction, but only ever inserts the
--    *calling* user (auth.uid()) as owner of the org it just created --
--    it cannot be used to grant membership in any other org, and cannot be
--    used to add anyone other than the caller. This keeps Postgres as the
--    real boundary: the RPC itself is the security check, not application
--    code calling it.
--
-- 3. "Cannot demote/remove the sole owner" was previously enforced only in
--    dbClient.ts (application code, trivially bypassable by a client that
--    talks to Supabase directly). enforce_owner_invariant() moves that
--    invariant into a BEFORE UPDATE/DELETE trigger on
--    organization_memberships so it holds even for a client that skips the
--    service layer entirely and calls supabase.from('organization_memberships')
--    directly (which RLS otherwise permits for an org admin).

-- ---------------------------------------------------------------------
-- 1. Missing organization columns
-- ---------------------------------------------------------------------
alter table public.organizations
  add column if not exists is_verified boolean not null default false,
  add column if not exists website character varying,
  add column if not exists logo_text character varying,
  add column if not exists address character varying,
  add column if not exists registration_number character varying,
  add column if not exists tax_id_number character varying,
  add column if not exists established_year integer,
  add column if not exists contact_email character varying,
  add column if not exists contact_phone character varying;

-- Keep is_verified in sync with verification_status so existing/future
-- rows can't drift into an inconsistent state via a partial update.
create or replace function public.sync_organization_verified_flag()
returns trigger
language plpgsql
as $$
begin
  new.is_verified := (new.verification_status = 'verified');
  return new;
end;
$$;

drop trigger if exists trg_sync_organization_verified_flag on public.organizations;
create trigger trg_sync_organization_verified_flag
  before insert or update of verification_status on public.organizations
  for each row execute function public.sync_organization_verified_flag();

-- ---------------------------------------------------------------------
-- 2. Atomic "create organization + make me its owner" RPC
-- ---------------------------------------------------------------------
create or replace function public.create_organization_with_owner(
  p_id character varying,
  p_slug character varying,
  p_name character varying,
  p_type character varying,
  p_industry character varying,
  p_county character varying,
  p_city_district character varying,
  p_description character varying,
  p_logo_text character varying default null,
  p_website character varying default null,
  p_contact_email character varying default null,
  p_contact_phone character varying default null,
  p_settings jsonb default null
)
returns public.organizations
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_org public.organizations;
  v_uid varchar;
begin
  v_uid := auth.uid()::varchar;
  if v_uid is null then
    raise exception 'Authentication required to create an organization.' using errcode = '28000';
  end if;

  insert into public.organizations (
    id, slug, name, type, industry, county, city_district, description,
    logo_text, website, contact_email, contact_phone, settings,
    verification_status
  ) values (
    p_id, p_slug, p_name, p_type, p_industry, p_county, p_city_district, p_description,
    coalesce(p_logo_text, upper(left(p_name, 3))), p_website, p_contact_email, p_contact_phone,
    coalesce(p_settings, '{}'::jsonb),
    'unverified'
  )
  returning * into v_org;

  -- The only membership this function will ever create is the calling
  -- user, as owner, of the org it just inserted -- never an arbitrary
  -- (user_id, organization_id, role) triple passed in by the caller.
  insert into public.organization_memberships (
    id, organization_id, user_id, org_role, status, permissions
  ) values (
    'mem-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
    v_org.id, v_uid, 'owner', 'active', '["all"]'::jsonb
  );

  return v_org;
end;
$$;

-- Callable by any authenticated user (they can only ever act as themselves,
-- enforced by auth.uid() above) -- not by anon.
revoke all on function public.create_organization_with_owner from public;
grant execute on function public.create_organization_with_owner to authenticated;

-- ---------------------------------------------------------------------
-- 3. DB-level owner-invariant trigger
-- ---------------------------------------------------------------------
create or replace function public.enforce_owner_invariant()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_org_id varchar;
  v_other_active_owners integer;
begin
  if tg_op = 'DELETE' then
    if old.org_role <> 'owner' then
      return old;
    end if;
    v_org_id := old.organization_id;
  else -- UPDATE
    if old.org_role <> 'owner' then
      return new;
    end if;
    -- Only care about updates that stop this row from being an active owner.
    if new.org_role = 'owner' and new.status = 'active' then
      return new;
    end if;
    v_org_id := old.organization_id;
  end if;

  select count(*) into v_other_active_owners
  from public.organization_memberships
  where organization_id = v_org_id
    and org_role = 'owner'
    and status = 'active'
    and id <> old.id;

  if v_other_active_owners = 0 then
    raise exception 'Cannot remove or demote the sole owner of an organization.' using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_owner_invariant on public.organization_memberships;
create trigger trg_enforce_owner_invariant
  before update or delete on public.organization_memberships
  for each row execute function public.enforce_owner_invariant();
