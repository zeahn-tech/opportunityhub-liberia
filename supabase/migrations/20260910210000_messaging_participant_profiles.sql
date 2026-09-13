-- Phase 3, Service 6 (continued): `public.users` RLS restricts SELECT to
-- the row's own owner only ("Users can read their own profile"). That's
-- correct for the general case, but it means a conversation participant
-- could never actually see who they're talking to -- rendering a
-- Conversation.participants array (name/avatar/role for display) would
-- silently come back empty for every participant except the caller.
--
-- Rather than widen users' RLS to let conversation partners read the
-- whole row (phone_number, account_status, etc. -- more than a
-- messaging UI needs), this adds a narrow SECURITY DEFINER RPC that
-- returns only the display fields (id, full_name, avatar_url,
-- primary_role) for participants of a conversation the caller is
-- actually part of. Same "narrow RPC over widening a table policy"
-- choice as candidateService/businessService's redaction RPCs, applied
-- here to avoid a new exposure instead of an existing one.

create or replace function public.get_conversation_participant_profiles(p_conversation_id character varying)
returns table (
  user_id character varying,
  full_name character varying,
  avatar_url character varying,
  primary_role character varying
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_conversation_participant(p_conversation_id, auth.uid()::character varying) then
    return;
  end if;

  return query
    select u.id, u.full_name, u.avatar_url, u.primary_role
    from public.users u
    join public.conversation_participants cp on cp.user_id = u.id
    where cp.conversation_id = p_conversation_id;
end;
$$;

revoke all on function public.get_conversation_participant_profiles from public;
grant execute on function public.get_conversation_participant_profiles to authenticated;
