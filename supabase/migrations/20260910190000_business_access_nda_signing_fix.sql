-- Phase 3, Service 5 (continued): fix a real bug found during live
-- verification of the migration above, not a hypothetical.
--
-- business_access_requests had exactly one UPDATE policy: "Listing
-- owners can update requests" (the seller). There was no policy letting
-- a BUYER update their own request at all -- meaning a buyer could never
-- actually sign the NDA on their own access request. Confirmed live: a
-- buyer's own UPDATE to set nda_signed=true silently affected 0 rows
-- (RLS-filtered, no error), so has_business_access() could never become
-- true through the real application flow. The entire "request -> seller
-- approves -> buyer signs NDA -> full access unlocks" flow this
-- migration's redaction logic depends on was structurally broken before
-- this fix.
--
-- The fix adds a buyer-side UPDATE policy, plus a trigger enforcing the
-- same kind of column boundary used for applications
-- (enforce_application_candidate_update_boundary, Service 3): a buyer
-- may only ever change nda_signed/nda_signed_at on their own row, never
-- status or any of the other party's data; the existing owner-side
-- policy continues to allow status/seller_response_notes but a trigger
-- now also stops an "owner" update from touching buyer-identity fields
-- or listing_id.

alter table public.business_access_requests
  add column if not exists seller_response_notes text;

drop policy if exists "Buyers can sign their own NDA" on public.business_access_requests;
create policy "Buyers can sign their own NDA"
  on public.business_access_requests for update
  to authenticated
  using (buyer_user_id::text = auth.uid()::text);

create or replace function public.enforce_business_access_request_update_boundary()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_is_owner boolean;
  v_is_buyer boolean;
begin
  v_is_buyer := new.buyer_user_id::text = auth.uid()::text;
  v_is_owner := exists (
    select 1 from public.business_listings bl
    where bl.id = old.listing_id and bl.owner_user_id::text = auth.uid()::text
  );

  if v_is_buyer and not v_is_owner then
    if new.status is distinct from old.status
      or new.seller_response_notes is distinct from old.seller_response_notes
      or new.listing_id is distinct from old.listing_id
      or new.buyer_user_id is distinct from old.buyer_user_id
      or new.buyer_full_name is distinct from old.buyer_full_name
      or new.buyer_email is distinct from old.buyer_email
      or new.buyer_phone is distinct from old.buyer_phone
      or new.requested_at is distinct from old.requested_at
    then
      raise exception 'Buyers may only sign their own NDA, not change the request status or listing/buyer identity fields.' using errcode = '42501';
    end if;
  end if;

  if v_is_owner and not v_is_buyer then
    if new.buyer_user_id is distinct from old.buyer_user_id
      or new.buyer_full_name is distinct from old.buyer_full_name
      or new.buyer_email is distinct from old.buyer_email
      or new.buyer_phone is distinct from old.buyer_phone
      or new.listing_id is distinct from old.listing_id
      or new.nda_signed is distinct from old.nda_signed
      or new.nda_signed_at is distinct from old.nda_signed_at
      or new.requested_at is distinct from old.requested_at
    then
      raise exception 'Listing owners may only respond to a request (status/notes), not alter the buyer''s identity or NDA signature.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_business_access_request_update_boundary on public.business_access_requests;
create trigger trg_enforce_business_access_request_update_boundary
  before update on public.business_access_requests
  for each row execute function public.enforce_business_access_request_update_boundary();
