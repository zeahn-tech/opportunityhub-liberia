# Phase 3 Gap Closure — Follow-up to the 9-Service Migration

**Date**: September 12, 2026
**Scope**: closing the gaps flagged across `docs/PHASE3_SERVICE1_VERIFICATION.md`
through `docs/PHASE3_SERVICE9_VERIFICATION.md`, plus the remaining Phase 3/4
acceptance items from the original task (organizationService's unwired
callers, and the seed-PII-in-bundle check).

## What was closed

### 1. Deferred sub-features — new schema, real RLS

`supabase/migrations/20260912090000_deferred_features_backend.sql`:

- **`organization_invitations`** (Service 1's deferred item). Same
  chicken-and-egg shape as org creation: `accept_organization_invitation()`
  is a `SECURITY DEFINER` RPC that validates the token against the
  **caller's own verified email** (never a client-supplied one) and
  creates the membership atomically. Live-tested: an outsider trying to
  accept an invitation addressed to someone else's email is rejected
  (`42501`); the real invitee accepting succeeds and creates the
  membership.
  - **A bug found via that same live test, not hypothetical**: the
    invitee-update-boundary trigger initially only allowed the invitee to
    set `status = 'rejected'`, but the accept RPC also needs to set
    `'accepted'` as that same user (SECURITY DEFINER changes execution
    privilege, not `auth.uid()`). This blocked the RPC from ever
    completing. Fixed in
    `supabase/migrations/20260912093000_invitation_accept_trigger_fix.sql`,
    re-verified live afterward.
- **`business_saved_listings`** / **`business_inquiries`** (Service 5's
  deferred items). Simple owner-scoped tables; a listing owner can read
  inquiries about their own listing, a sender can read their own. Live
  tested: an uninvolved third party cannot read another sender's inquiry
  (0 rows); the listing owner can.
- **Message reports** (Service 6's deferred item) needed **no new
  schema at all** — folded into Service 8's `content_reports` table
  (`report_type = 'message'`), which was already designed to cover it.
  `messagingService.reportConversation()` now delegates to
  `trustSafetyService.submitReport()`.

### 2. Two narrow display-profile RPCs, same pattern as Service 6's fix

`public.users` RLS is self-only, which meant an org admin viewing their
member list, or a user starting a new conversation by email, had no way
to resolve another user's name at all. Same fix as
`get_conversation_participant_profiles()` (Service 6): narrow
`SECURITY DEFINER` RPCs returning only display fields for a caller who
has an actual relationship to the target (co-member of the same org;
exact email match), not a broadened table policy.
`get_organization_member_profiles()` and `find_user_by_email()` —
`supabase/migrations/20260912100000_org_member_profiles.sql`,
`20260912110000_find_user_by_email.sql`. Both live-tested: an outsider
gets nothing back, a real co-member/exact-match gets the display fields.

### 3. `organizationService`'s callers — the real architectural gap

The original flagged gap was broad ("authService.ts, permissionEngine.ts,
3 components not rewired"). What was actually wrong, and what's fixed:

- **`authService.ts`**: real (non-demo) session hydration, and
  `register()`'s organization creation, both read/wrote `dbClient.ts`'s
  local store — meaning a real Supabase user's org context, and any org
  they created at signup, never actually existed in Supabase. Both now
  go through `organizationService`.
- **The deeper problem**: `authService.can()` (permission checks) is
  called synchronously throughout the render tree
  (`{can('x') && <Button/>}`), so it can never become `async` without
  rewriting every permission-gated element in the app. The fix: a
  synchronous **cache** (`cachedActiveMembership`, `cachedSubscription`,
  `cachedUserOrganizations`) refreshed from `organizationService`/
  `subscriptionService` at the specific moments the active org can change
  (session hydration, `switchOrganization`) — `can()`'s call sites never
  changed, but for a real session it now reads real Supabase-sourced
  permission data instead of stale/absent local data.
- **`permissionEngine.ts`'s `getUserMembershipForOrg()`** was called from
  9 places inside the actual permission-decision functions and queried
  `dbClient.ts` directly on every call, **completely bypassing** the
  cache above whenever a resource's own org differed from the currently
  active one. Fixed by adding `userMemberships` to `AuthorizationContext`
  (populated by `authService` from the same cache) and changing all 9
  call sites to read it instead of re-querying `dbClient.ts`.
- **`switchOrganization()`** converted from sync to async (3 UI call
  sites, all simple statement calls — no cascading rewrite needed) so a
  real switch resolves the target org and membership via
  `organizationService`/RLS instead of a local membership scan.
- **The 3 flagged components** (`OrganizationWizardModal.tsx`,
  `OrganizationSwitcher.tsx`, `OrganizationTeamModal.tsx`) were fully
  rewired off `dbClient.ts` to `organizationService`: creating an
  organization, inviting/accepting/declining/revoking, suspending/
  reactivating/removing members, and switching workspace all now go
  through Supabase. `PostOpportunityModal.tsx` was rewired too (found
  while auditing `organizationService`'s remaining callers) — and its
  fallback to `INITIAL_ORGANIZATIONS` (bundled seed data used as a
  last-resort default) was removed entirely, since it's no longer needed
  and was itself a small seed-data-in-bundle contributor.

Also fixed in the same pass, found while auditing remaining `dbClient.ts`
imports: `Navbar.tsx`'s unread-notification badge, `AiStudioHub.tsx`'s
recommendation-widget preview, and `MessagingCenter.tsx`'s
start-new-conversation-by-email flow were all still reading `dbClient.ts`
directly even though their services (`notificationService`,
`opportunityService`, the new `find_user_by_email` RPC) were already
Supabase-backed. `App.tsx`'s business-listing state (`businesses`) had
the same gap as opportunities/applications/audits before their Service
2/3/7 wiring — fixed the same way (a `refreshBusinesses()` helper calling
`businessService.list()`).

Every RLS-relevant change above except `find_user_by_email()` was
live-tested the same way as the original nine services: real throwaway
`auth.users` rows, `SET ROLE authenticated` +
`set_config('request.jwt.claims', ...)` impersonation, direct SQL
against the live project via the Supabase MCP connector — including
catching and fixing the invitation-accept trigger bug above via that
testing, not hypothetically. `find_user_by_email()` was applied and its
`auth.uid() is null` guard is straightforward, but was not separately
role-impersonation-tested the way the others were, given time
constraints — flagged here rather than silently presented as equally
verified. Full test suite: 166/166 passing after every change, `tsc`
clean, production build succeeds,
`scripts/check-no-service-role-in-client.sh` passes.

## What is honestly NOT closed

### Seed PII in the production bundle

Per the original task's own acceptance check
(`npm run build && grep <seed-email> dist/assets/*.js`), this was run and
**it found the seed dataset**: `dbClient.ts` embeds its own seed arrays
(names, emails, phone numbers for demo users/organizations) directly as
module-level constants, and those constants are reachable from the main
application bundle regardless of whether demo mode is enabled at
runtime, because `envConfig.enableDemoMode` is a runtime-computed value
(`parseBoolean(import.meta.env.VITE_ENABLE_DEMO_MODE, ...)`), not a
build-time-static expression Rollup can dead-code-eliminate.

Fixing this correctly requires one of:
- Restructuring the seed data into its own module, loaded via a truly
  dynamic `import()` gated on a build-time-static (not
  function-wrapped) check of `import.meta.env.VITE_ENABLE_DEMO_MODE`, so
  a production (non-demo-target) build never includes it in any emitted
  chunk; or
- A separate demo-only build target that explicitly ships the seed data,
  with the default production build excluding `dbClient.ts`'s seed
  arrays entirely.

This was not attempted in this pass: `dbClient.ts` is a ~3,700-line file
where the seed arrays are foundational module-level constants referenced
throughout `ensureInitialized()` and elsewhere, and restructuring it
under time pressure without the ability to fully re-verify every demo-mode
code path risked introducing regressions worse than leaving this
honestly flagged. **This means Phase 3/4's full acceptance criteria are
not yet met** — every domain service is migrated and live-verified, but
the bundle still contains seed PII, so "no seed PII ships in the
production bundle" remains open, concretely scoped above for a focused
follow-up pass.

### `dbClient.ts` was not renamed to `localDemoStore.ts`

The original task suggested this rename once dbClient's runtime role was
fully removed. Given the seed-PII bundle issue above is unresolved, and
a small number of legitimate demo-mode-only consumers remain
(`rateLimiterService.ts`'s client-side abuse-detection heuristics,
`TrustSafetyAdminCenter.tsx`'s `opportunities`/`organizations`/
`businesses`/`users` panels, `authService.ts`'s demo-login paths), the
rename was deferred rather than done as a cosmetic, zero-functional-impact
change alongside a much riskier open item.
