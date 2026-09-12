# Phase 3, Service 5 — businessService — Live Verification Record

**Date**: September 10, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Services 1-4).

## Why this service got extra scrutiny

The task's own instructions singled this one out: confidential fields
(financials, exact address, owner identity) must not be selectable by an
unauthorized client at the database/API level — proven by querying as an
unauthorized user directly against Supabase, bypassing the UI.

## What was actually there before this migration

Worse than "no redaction": **`businessService.ts`'s `list()`/`getById()`
returned the raw object to anyone, completely unfiltered** — financials,
owner identity, everything. And the one RLS policy that did exist
(`status='published' AND is_confidential=false`) only granted access to
**non**-confidential listings — meaning a confidential listing was
**invisible to literally everyone except its owner**, including as a
teaser. That breaks discovery entirely: a buyer can't request NDA access
to a listing they can never see exists. There was also no `exact_address`
column at all.

## The fix

Same SECURITY DEFINER RPC pattern used for candidateService (Service 4):

- The existing "non-confidential → full row visible" RLS policy is
  **unchanged** — a seller who opts into full transparency keeps a plain,
  fast, RLS-backed public row.
- Confidential listings get **no additional raw-table SELECT policy at
  all**. They remain owner-only via RLS at the table level, full stop.
- `get_business_listing_public()` / `list_business_listings_public()` —
  new `SECURITY DEFINER` RPCs — are the *only* way anyone else sees a
  confidential listing: full detail if owner or NDA-approved-and-signed,
  otherwise a teaser with `annual_revenue_usd`, `annual_cash_flow_usd`,
  `exact_address`, and all three seller-identity fields **stripped from
  the jsonb entirely** (not nulled — absent).

## Test sequence (all run live, then cleaned up)

Three throwaway `auth.users` rows: a seller, a buyer, and an uninvolved
snooper. The seller created one `is_confidential=true` listing with real
financials, a real street address, and real seller identity.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Snooper directly queries `business_listings` for the confidential row (bypassing the RPC) | 0 rows | ✅ |
| 2 | Snooper calls `get_business_listing_public()` for the same listing | Discoverable (fixes the old "invisible" bug), but `annual_revenue_usd`/`annual_cash_flow_usd`/`exact_address`/`seller_name`/`seller_contact_email` **keys absent entirely** from the returned jsonb | ✅ All 5 confirmed absent via the jsonb `?` existence operator; `title`/`asking_price_usd` present |
| 3 | `list_business_listings_public()` (anon) returns both the confidential listing (redacted) and a real pre-existing non-confidential seed listing (full financials, by design) | Differential redaction proven side-by-side | ✅ Confidential listing redacted, non-confidential seed listing shows real revenue |
| 4 | Buyer submits an NDA request → checks `get_business_listing_public()` while `status='pending'` | Still redacted | ✅ |
| 5 | Seller approves the request, but buyer hasn't signed the NDA yet → buyer checks again | **Still redacted** — approval alone isn't enough | ✅ Proves the `approved AND nda_signed` requirement is real, not just approval |
| 6 | Buyer signs the NDA (after the fix in #7 below) → buyer checks again | Full detail, including real revenue/address/seller name | ✅ `revenue: "320000.00"`, real address, real seller name |
| 7 | **A genuine bug found via this testing, not injected**: the buyer's own attempt to set `nda_signed=true` on their request silently affected 0 rows — no RLS policy let a buyer update their own `business_access_requests` row at all | Should have succeeded | ❌ initially, then **fixed** with a second migration (`20260910190000_business_access_nda_signing_fix.sql`) adding a buyer-scoped UPDATE policy + a column-boundary trigger; re-tested and passed (folded into #6 above) |
| 8 | Buyer attempts to tamper with their own request's `status` (self-approve) via the same UPDATE call the NDA-signing policy now permits | Rejected by the new trigger | ✅ `42501: Buyers may only sign their own NDA, not change the request status or listing/buyer identity fields.` |
| 9 | Snooper directly queries `business_access_requests` for the buyer's request | 0 rows | ✅ |

**9/9 passed**, but #7 is the most important line in this table: live
testing caught a real, structural bug (the entire NDA-signing flow was
broken — a buyer could never actually complete it) that a review of the
migration SQL alone would not have caught, since the missing policy was
an *absence*, not a visible mistake in what was written. Fixed with a
follow-up migration and re-verified, not just patched and assumed
correct.

## Cleanup

All test listings, access requests, and three `auth.users`/`public.users`
rows were removed. Verified `listing_left=0, request_left=0, users_left=0`
after cleanup.

## What changed in the application, and what didn't

`businessService.ts` was rewritten to call the two RPCs for all reads and
go straight to the tables (correctly RLS-scoped) for owner-side writes.
`src/tests/businessService.test.ts` (9 tests, mocked client) covers the
RPC-call logic and the real two-step NDA workflow, including that
`requestNdaAccess()` called without `buyerData` now correctly *refuses*
to grant access when no approved request exists yet, rather than
instantly granting it.

Two existing tests (`integrationFlows.test.ts` FLOW 7,
`services.test.ts`) called `businessService.requestNdaAccess()` expecting
the old dbClient.ts instant-grant demo behavior; both retargeted to call
`db.grantBusinessAccess()` directly, same pattern as prior services.

**Deliberate behavior change, flagged not hidden**: the old
`dbClient.ts` implementation granted NDA access **immediately on
request**, with no seller review step — a demo convenience that would be
a real vulnerability against a live database (any buyer instantly reading
every confidential field on demand). This service implements the real
workflow the schema actually supports. `BusinessMarketplace.tsx`'s
`handleNdaSubmit` currently submits a request and then immediately calls
`onAccessApproved()` (App.tsx's `handleAccessApproved`), assuming
instant unlock — under the real service this now correctly surfaces "The
listing owner has not yet approved your access request" as an error
toast rather than unlocking anything. This fails safely (no crash, no
data leak, an accurate if not ideally-worded message) but the UI needs a
follow-up update to show a "pending seller approval" state instead of an
error — flagged here for whoever picks that up next, not silently
patched over inside the service layer.

## Deferred, not covered by this service

`sendInquiry`/`getInquiries`/`toggleSave`/`getSavedIds`/`incrementViews`
have no backing Supabase table (no `business_inquiries` table, no
saved-listings join table exist in the schema) — still `dbClient.ts`-backed
local-only behavior, same category as organizationService's deferred
invitations (Service 1). Adding those tables is a schema decision out of
scope for this pass.
