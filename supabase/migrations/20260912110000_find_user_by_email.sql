-- Closes the last dbClient bypass found in MessagingCenter.tsx:
-- starting a new direct-message conversation by the recipient's email
-- needs to resolve that email to a user id/display name, but `users`
-- RLS is self-only. Same narrow-RPC pattern as the two before it
-- (messaging participant profiles, org member profiles): returns only
-- minimal display fields for an EXACT email match, not a searchable
-- listing -- an authenticated caller can confirm a specific known email
-- belongs to a platform user (the same thing dbClient's local lookup
-- already allowed), not enumerate arbitrary users.

create or replace function public.find_user_by_email(p_email character varying)
returns table (
  user_id character varying,
  full_name character varying,
  primary_role character varying
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
    select u.id, u.full_name, u.primary_role
    from public.users u
    where lower(u.email) = lower(p_email)
    limit 1;
end;
$$;

revoke all on function public.find_user_by_email from public;
grant execute on function public.find_user_by_email to authenticated;
