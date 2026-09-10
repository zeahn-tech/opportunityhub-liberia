-- Phase 3, Service 2: opportunityService
--
-- Two kinds of change, each with a reason:
--
-- 1. Schema gaps between `public.opportunities` and the app's `Opportunity`
--    type (src/types/index.ts), same pattern as the organizations gap
--    fixed in 20260909130000:
--      - `responsibilities` / `requirements` are `text` (a single
--        newline-delimited blob) but the app type is `string[]`. Converted
--        to `jsonb` arrays in place, splitting existing data on newlines
--        so the 4 existing seed opportunities keep their content instead
--        of being dropped.
--      - `summary`, `moderation_status`, `report_count` don't exist yet
--        but the app type already assumes them (moderation_status /
--        report_count are read by trustSafetyService, Phase 3 Service 8 --
--        added now as nullable/defaulted columns, same "schema catches up
--        with the type first" pattern as `is_verified` on organizations;
--        no policy or trigger logic for them is added here, that's
--        Service 8's job).
--
-- 2. RLS refinement: the existing "Org admins can insert/update/delete
--    opportunities" policies gate on is_org_admin() (org_role IN
--    ('admin','owner')) only. But the app's own permission model
--    (OrgPermission: 'opportunities.create' / 'opportunities.edit' /
--    'opportunities.delete') already supports granting a non-admin role
--    (e.g. 'recruiter') those specific permissions via
--    organization_memberships.permissions -- see organizationService.ts's
--    addMember()/updateMemberRoleAndPermissions(). Leaving the opportunity
--    policies on is_org_admin() alone would make RLS *stricter* than the
--    app's intended authorization model: a recruiter explicitly granted
--    'opportunities.create' would be blocked at the database layer even
--    though the UI believes they're allowed. has_org_permission() checks
--    role OR permissions array, matching what dbClient.ts's
--    canUserPerform()/assertUserInTenant() used to check in application
--    code -- moved here so it's a real, unbypassable boundary instead.

-- ---------------------------------------------------------------------
-- 1. Schema gaps
-- ---------------------------------------------------------------------
alter table public.opportunities
  add column if not exists summary character varying,
  add column if not exists moderation_status character varying not null default 'published',
  add column if not exists report_count integer not null default 0;

alter table public.opportunities
  alter column responsibilities type jsonb
    using coalesce(to_jsonb(string_to_array(nullif(responsibilities, ''), E'\n')), '[]'::jsonb),
  alter column responsibilities set default '[]'::jsonb;

alter table public.opportunities
  alter column requirements type jsonb
    using coalesce(to_jsonb(string_to_array(nullif(requirements, ''), E'\n')), '[]'::jsonb),
  alter column requirements set default '[]'::jsonb;

-- ---------------------------------------------------------------------
-- 2. Fine-grained permission check (role OR explicit permission grant)
-- ---------------------------------------------------------------------
create or replace function public.has_org_permission(org_id character varying, permission text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  return exists (
    select 1 from public.organization_memberships
    where organization_id = org_id
      and user_id = auth.uid()::varchar
      and status = 'active'
      and (
        org_role in ('owner', 'admin')
        or permissions @> to_jsonb(array[permission])
        or permissions @> '["all"]'::jsonb
      )
  );
end;
$$;

drop policy if exists "Org admins can insert opportunities" on public.opportunities;
create policy "Org members with opportunities.create can insert opportunities"
  on public.opportunities for insert
  to authenticated
  with check (has_org_permission(organization_id, 'opportunities.create'));

drop policy if exists "Org admins can update opportunities" on public.opportunities;
create policy "Org members with opportunities.edit can update opportunities"
  on public.opportunities for update
  to authenticated
  using (has_org_permission(organization_id, 'opportunities.edit'));

drop policy if exists "Org admins can delete opportunities" on public.opportunities;
create policy "Org members with opportunities.delete can delete opportunities"
  on public.opportunities for delete
  to authenticated
  using (has_org_permission(organization_id, 'opportunities.delete'));
