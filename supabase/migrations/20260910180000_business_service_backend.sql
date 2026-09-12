-- Phase 3, Service 5: businessService
--
-- This is the service the task's own instructions singled out for extra
-- care: confidential fields (financials, exact address, owner identity)
-- must not be selectable by an unauthorized client at the
-- database/API level -- not a client-side field filter.
--
-- What was actually there before this migration: NOTHING enforced
-- confidentiality at all. `businessService.ts`'s list()/getById() just
-- returned the raw dbClient object to anyone, unfiltered -- financials,
-- exact address (which didn't even have its own column), and owner
-- identity were all exposed to every caller regardless of is_confidential
-- or NDA status. Worse, the RLS policy that DID exist
-- ("Anyone can view public business listings", qual: status='published'
-- AND is_confidential=false) only granted access to NON-confidential
-- listings -- meaning a `is_confidential=true` listing was invisible to
-- literally everyone except its owner, including as a redacted teaser.
-- That breaks discovery entirely: a buyer can't request NDA access to a
-- listing they can never see exists.
--
-- The fix, same pattern as candidateService's redaction RPCs (Service 4):
--   - The existing "is_confidential=false -> full row visible" RLS policy
--     is UNCHANGED. A seller who opts into full transparency for their
--     listing continues to get a plain, fast, RLS-backed public row --
--     no RPC needed for that case, and no new confidentiality burden
--     added where the seller explicitly waived it.
--   - `is_confidential=true` listings get NO additional raw-table SELECT
--     policy. They remain owner-only via RLS at the table level.
--   - `get_business_listing_public()` and `list_business_listings_public()`
--     are new SECURITY DEFINER RPCs that are the ONLY way anyone else
--     sees a confidential listing: full detail if the caller is the
--     owner OR has an approved-AND-nda_signed business_access_requests
--     row for it; otherwise a teaser with annual_revenue_usd,
--     annual_cash_flow_usd, exact_address, and seller identity fields
--     stripped entirely (not blanked client-side -- absent from the
--     jsonb this RPC returns).

-- ---------------------------------------------------------------------
-- 1. Schema gaps, including the confidential fields the task called out
--    that don't have columns yet at all (exact_address, owner-identity
--    denormalization matching applications.applicant_* /
--    organizations.contact_* precedent).
-- ---------------------------------------------------------------------
alter table public.business_listings
  add column if not exists exact_address character varying,
  add column if not exists public_teaser text,
  add column if not exists financial_ranges jsonb,
  add column if not exists seller_name character varying,
  add column if not exists seller_contact_email character varying,
  add column if not exists seller_contact_phone character varying,
  add column if not exists is_verified boolean not null default false,
  add column if not exists moderation_status character varying not null default 'published',
  add column if not exists moderation_note text,
  add column if not exists views_count integer not null default 0;

-- ---------------------------------------------------------------------
-- 2. Has this buyer earned full access to this confidential listing?
--    Approved AND nda_signed -- both, matching the task's explicit
--    "NDA approval status" framing (an approval without a signed NDA, or
--    a signed NDA the seller hasn't approved, is not enough on its own).
-- ---------------------------------------------------------------------
create or replace function public.has_business_access(p_listing_id character varying, p_viewer_id character varying)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.business_access_requests r
    where r.listing_id = p_listing_id
      and r.buyer_user_id = p_viewer_id
      and r.status = 'approved'
      and r.nda_signed = true
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Redacted single-listing lookup.
-- ---------------------------------------------------------------------
create or replace function public.get_business_listing_public(p_listing_id character varying)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_row public.business_listings;
  v_viewer_id varchar;
  v_result jsonb;
begin
  select * into v_row from public.business_listings where id = p_listing_id;
  if not found or v_row.status <> 'published' then
    -- Owners can still see their own non-published listings, checked below.
    if not found then
      return null;
    end if;
  end if;

  v_viewer_id := auth.uid()::varchar;

  if v_viewer_id is not null and v_viewer_id = v_row.owner_user_id then
    return to_jsonb(v_row);
  end if;

  if v_row.status <> 'published' then
    return null;
  end if;

  if not v_row.is_confidential then
    return to_jsonb(v_row);
  end if;

  if v_viewer_id is not null and public.has_business_access(p_listing_id, v_viewer_id) then
    return to_jsonb(v_row);
  end if;

  v_result := to_jsonb(v_row)
    - 'annual_revenue_usd' - 'annual_cash_flow_usd' - 'exact_address'
    - 'seller_name' - 'seller_contact_email' - 'seller_contact_phone';
  return v_result;
end;
$$;

revoke all on function public.get_business_listing_public from public;
grant execute on function public.get_business_listing_public to authenticated, anon;

-- ---------------------------------------------------------------------
-- 4. Listing/browsing across all published businesses, same per-row
--    redaction. Unlike the old RLS-only behavior, confidential listings
--    ARE now included (as teasers) rather than being invisible.
-- ---------------------------------------------------------------------
create or replace function public.list_business_listings_public(
  p_county text default null,
  p_industry text default null,
  p_listing_type text default null
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id character varying;
  v_listing jsonb;
begin
  for v_id in
    select id from public.business_listings
    where status = 'published'
      and (p_county is null or county = p_county)
      and (p_industry is null or industry = p_industry)
      and (p_listing_type is null or listing_type = p_listing_type)
  loop
    v_listing := public.get_business_listing_public(v_id);
    if v_listing is not null then
      return next v_listing;
    end if;
  end loop;
end;
$$;

revoke all on function public.list_business_listings_public from public;
grant execute on function public.list_business_listings_public to authenticated, anon;
