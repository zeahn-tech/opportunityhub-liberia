-- Fix a bug found via live testing of the migration above: the invitee
-- update-boundary trigger only allowed the invitee to set status to
-- 'rejected', but accept_organization_invitation() ALSO needs to set
-- status to 'accepted' as the invitee (auth.uid() is identical whether
-- the invitee updates the row directly or via the RPC -- SECURITY
-- DEFINER changes execution privilege, not auth.uid()). This blocked
-- the accept RPC from ever completing.
--
-- Allowing the invitee's own direct UPDATE to also set 'accepted' does
-- NOT grant any privilege a raw client update couldn't already get
-- nothing from: organization_memberships still has its own separate,
-- unrelated INSERT policy (is_org_admin), so a client that set
-- invitations.status='accepted' directly (skipping the RPC) would gain
-- no membership -- just an inconsistent, harmless invitation record.
-- The real membership-creation privilege boundary is on
-- organization_memberships, unaffected by this fix.

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

  if not v_is_org_inviter then
    if new.status not in ('rejected', 'accepted')
      or new.organization_id is distinct from old.organization_id
      or new.inviter_user_id is distinct from old.inviter_user_id
      or new.invitee_email is distinct from old.invitee_email
      or new.org_role is distinct from old.org_role
      or new.permissions is distinct from old.permissions
      or new.token is distinct from old.token
      or new.expires_at is distinct from old.expires_at
    then
      raise exception 'Invitees may only accept or decline their own invitation, nothing else.' using errcode = '42501';
    end if;
    new.responded_at := now();
  end if;

  return new;
end;
$$;
