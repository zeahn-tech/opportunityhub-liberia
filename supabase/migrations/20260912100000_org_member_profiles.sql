-- Closes a display gap found while rewiring OrganizationTeamModal.tsx off
-- dbClient.ts: `public.users` RLS restricts SELECT to the row's own
-- owner only, so an org admin viewing their member list had no way to
-- see co-members' names/avatars at all -- the exact same gap
-- messaging's get_conversation_participant_profiles() (Service 6) fixed
-- for conversation participants. Same fix here: a narrow SECURITY
-- DEFINER RPC returning only display fields for members of an org the
-- caller is also a member of, rather than widening users' RLS.

create or replace function public.get_organization_member_profiles(p_organization_id character varying)
returns table (
  user_id character varying,
  full_name character varying,
  avatar_url character varying,
  email character varying
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_org_member(p_organization_id) then
    return;
  end if;

  return query
    select u.id, u.full_name, u.avatar_url, u.email
    from public.users u
    join public.organization_memberships m on m.user_id = u.id
    where m.organization_id = p_organization_id;
end;
$$;

revoke all on function public.get_organization_member_profiles from public;
grant execute on function public.get_organization_member_profiles to authenticated;
