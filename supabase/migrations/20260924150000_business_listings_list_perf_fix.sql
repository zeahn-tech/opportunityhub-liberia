-- ---------------------------------------------------------------------
-- Phase 4b (Performance): fix N+1 query pattern in
-- list_business_listings_public() and add pagination.
--
-- Problem: the version from 20260910180000_business_service_backend.sql
-- looped over matching listing IDs in PL/pgSQL and called
-- get_business_listing_public(v_id) once per row. That function itself
-- re-selects the full row by id AND calls has_business_access() (a
-- second query) for every row -- i.e. 1 + 2N queries to render a page of
-- N business listings, all executed server-side inside a single RPC
-- round-trip, so it never showed up as N+1 in client-side network logs,
-- only in Postgres query stats under load.
--
-- Fix: compute the same per-row redaction (owner sees everything;
-- non-confidential listings show everything; confidential listings show
-- everything IFF the viewer has an approved+NDA-signed access request;
-- otherwise strip the same 6 fields) in a single set-based SQL query,
-- using a correlated EXISTS the planner can turn into a semi-join
-- instead of a function call per row. Redaction semantics are
-- byte-for-byte identical to get_business_listing_public(); only the
-- execution shape changed.
--
-- Also adds p_limit/p_offset so callers that want to page through
-- listings can (see businessService.listPage()). The default (500) is
-- a generous safety cap, not a real page size, so existing callers that
-- relied on getting every published listing back (moderation queue, "my
-- listings", saved-deals tabs) keep working unchanged.
-- ---------------------------------------------------------------------

create or replace function public.list_business_listings_public(
  p_county text default null,
  p_industry text default null,
  p_listing_type text default null,
  p_limit integer default 500,
  p_offset integer default 0
)
returns setof jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    case
      when auth.uid()::varchar = b.owner_user_id then to_jsonb(b)
      when not b.is_confidential then to_jsonb(b)
      when auth.uid() is not null and exists (
        select 1
        from public.business_access_requests r
        where r.listing_id = b.id
          and r.buyer_user_id = auth.uid()::varchar
          and r.status = 'approved'
          and r.nda_signed = true
      ) then to_jsonb(b)
      else to_jsonb(b)
        - 'annual_revenue_usd' - 'annual_cash_flow_usd' - 'exact_address'
        - 'seller_name' - 'seller_contact_email' - 'seller_contact_phone'
    end
  from public.business_listings b
  where b.status = 'published'
    and (p_county is null or b.county = p_county)
    and (p_industry is null or b.industry = p_industry)
    and (p_listing_type is null or b.listing_type = p_listing_type)
  order by b.created_at desc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.list_business_listings_public(text, text, text, integer, integer) from public;
grant execute on function public.list_business_listings_public(text, text, text, integer, integer) to authenticated, anon;

-- The old 3-arg overload is superseded; drop it so PostgREST resolves
-- calls to the new signature unambiguously instead of erroring on
-- overload ambiguity when the client omits p_limit/p_offset.
drop function if exists public.list_business_listings_public(text, text, text);

comment on function public.list_business_listings_public(text, text, text, integer, integer) is
  'Paginated, redaction-aware public business listing browse. Single set-based query (no per-row RPC calls) -- see 20260924150000_business_listings_list_perf_fix.sql for why this replaced the looping version.';
