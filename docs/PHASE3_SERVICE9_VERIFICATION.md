# Phase 3, Service 9 (final service) — subscriptionService / notificationService / analyticsService — Live Verification Record

**Date**: September 11, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Services 1-8).

## Scope

This is the last of the nine services from the original ordering.
Subscriptions and notifications had no backing tables at all before this
pass (the third from-scratch schema this phase, after messaging/Service 6
and trustSafety/Service 8); analytics was always a pure read-side
computation, never its own table.

## A real design decision, not a default

`getPlatformAnalytics()` is cross-organization by nature — it's the
platform admin's dashboard. If it queried
`opportunities`/`applications`/`organizations`/etc. directly through the
anon client, RLS would silently restrict the results to whatever the
caller's own org memberships and public rows allow, producing a
dashboard that quietly **under-counts everything** for a real platform
admin. That's not a security leak — it's a data-integrity bug that's
unusually easy to ship unnoticed, because the numbers would just look
low, not obviously wrong. So platform-wide analytics is a single
`SECURITY DEFINER` RPC (`get_platform_analytics`), gated by
`is_platform_admin()` (reused from Service 7), that aggregates directly
in SQL. `getEmployerAnalytics()`/`getBusinessMarketplaceAnalytics()` are
**not** RPCs — an org member's own RLS access to their own org's data is
already complete, so those compute aggregates client-side from ordinary
already-migrated queries, no special privilege needed.

## Migration applied

`supabase/migrations/20260911200000_subscription_notification_analytics_backend.sql`
— `organization_subscriptions` (org-member read, org-admin-only write —
with an explicit note that a *real* Stripe webhook must write via the
service-role key server-side, not through this anon-client policy),
`notifications` (recipient-only read/mark-read, any authenticated user
can create one for someone else — matching the app's existing broad
notification-creation model — with a column-boundary trigger restricting
UPDATE to `is_read`/`read_at`), and `get_platform_analytics()`.

## Test sequence (all run live, then cleaned up)

Four throwaway `auth.users` rows: an org owner/admin, a non-admin org
member, an outsider, and a platform admin.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Non-admin org member attempts to `INSERT` a subscription for their own org | Rejected | ✅ `42501: new row violates row-level security policy` |
| 2 | Org admin creates the subscription | Succeeds | ✅ |
| 3 | The non-admin member (still a real org member) reads it; the outsider does not | Member: visible. Outsider: 0 rows | ✅ Both confirmed |
| 4 | Org owner creates a notification **for the outsider** (cross-user creation, the intended model) | Succeeds | ✅ |
| 5 | The outsider (real recipient) reads their own notification; the org member (uninvolved third party) does not | Recipient: visible. Third party: 0 rows | ✅ Both confirmed |
| 6 | The recipient attempts to rewrite the notification's `message` (not just mark it read) | Rejected by the column-boundary trigger | ✅ `42501: Only is_read/read_at may be updated on a notification.` |
| 7 | The recipient performs the legitimate action: marks it read | Succeeds | ✅ |
| 8 | Outsider (non-admin) calls `get_platform_analytics()` | Rejected | ✅ `42501: Only platform administrators may view platform-wide analytics.` |
| 9 | Platform admin calls it | Succeeds, **returning real cross-organization aggregate counts** (total users, total subscriptions, verified-org count) reflecting data across every org in the project, not scoped down to the admin's own memberships | ✅ `total_users: 8`, `total_subs: 1`, `verified_orgs: 0` — all correct for the live state at test time |

**10/10 passed** (9 rows above; #3 and #5 each contain two confirmed sub-checks).

## Cleanup

The test subscription, notification, organization/memberships, and four
`auth.users`/`public.users` rows were removed. Verified 0 rows remaining
across every table involved.

## What's live vs. what needed wiring

`subscriptionService.ts`'s and `notificationService.ts`'s consumers
(`AiAssistantModal.tsx`, `SubscriptionManager.tsx`,
`CandidateProfileDrawer.tsx`, `NotificationCenterModal.tsx`) already
called their methods with `await` and needed no changes — these were
already async APIs (subscription checkout/portal already went through
server routes; notifications were already treated as async elsewhere).
Both are live in the running app automatically.

`analyticsService.ts`'s two dashboard consumers **did** need real
changes: `EmployerAnalyticsDashboard.tsx` and
`BusinessAnalyticsDashboard.tsx` both called the old service
synchronously via `useMemo`, because the old `dbClient.ts`-backed
implementation returned its result directly rather than a Promise. Both
were converted to `useState`/`useEffect` with proper async fetching;
`BusinessAnalyticsDashboard.tsx` also gained a loading-state guard it
didn't have before (the old synchronous path meant `metrics` was never
null after the first render). `getPlatformAnalytics()` itself has no UI
consumer yet — nothing in the app currently renders the platform-wide
dashboard, so there was no caller to update for that one.

## Known gaps, flagged not hidden

- **`authService.ts` and `permissionEngine.ts` still read subscription
  data via `dbClient.ts` directly** (`db.getOrganizationSubscription()`)
  when building authorization context for entitlement checks — the same
  category of gap as `organizationService.ts`'s callers not being
  rewired in Service 1: `authService`'s synchronous `getSession()`/`can()`
  API is used pervasively throughout the app, and converting it to async
  to consume the real Supabase-backed subscription would cascade well
  beyond this service's scope. Flagged as a genuine follow-up, not
  silently left unmentioned.
- **`savesCount`/`buyerInquiries`/per-listing `saves`/`inquiries` in
  `BusinessMarketplaceAnalytics` are honest zeros**, not fabricated
  data — there is still no backing table for business saves or
  inquiries (deferred in Service 5). NDA-related metrics
  (`ndaRequestsTotal`/`ndaApprovedCount`) use the real
  `business_access_requests` table and are accurate.
- `growthOverTime`/historical trend data from the original
  `PlatformAnalytics` interface (a mocked time series in the old
  implementation, since no event-sourcing exists to compute a real
  historical trend) was not reproduced in `get_platform_analytics()` --
  it was fabricated data before this migration and reproducing a fake
  series under a "verified" migration would be worse than omitting it.

## Phase 3 status after this service

All nine services from the original ordering are now migrated and
independently proven: organizationService, opportunityService,
applicationService, candidateService, businessService, messagingService,
verificationService, trustSafetyService, and
subscriptionService/notificationService/analyticsService. Per-service
verification records: `docs/PHASE3_SERVICE1_VERIFICATION.md` through
this document. `organizationService.ts` remains the one service whose
callers (`authService.ts`, `permissionEngine.ts`, three components) are
not yet rewired to use it instead of `dbClient.ts` — every other service
is live in the running application. The remaining Phase 3/4 acceptance
items (removing `dbClient.ts`'s role as the runtime data source when
Supabase is configured, and verifying no seed PII ships in the production
bundle) are follow-up work beyond migrating the nine services themselves.
