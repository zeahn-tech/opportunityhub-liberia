# RLS Security Test Matrix — Phase 6

**Date**: September 23, 2026
**Scope**: prove the full role × resource × action authorization matrix against
the live Supabase Postgres database with RLS on, per the original
certification's "Authorization Status" section. This phase does not add
features; it tests and documents exactly what the database enforces today.

**Method**: `supabase/tests/rls_security_test_matrix.sql`, a pgTAP suite run
directly against the live "Opportunity Hub Liberia" project
(`tnnwbjenajtwiuiqbwpj`) via role impersonation — `SET LOCAL role` +
`set_config('request.jwt.claim.sub', ...)` inside a transaction that is
always rolled back, so no fixture data persists. This is a stronger test than
mocking the Supabase client: it exercises the actual Postgres policies and
triggers the running app depends on. **112/112 assertions pass** as of this
run (full TAP output in the "Full test run output" section of
`docs/PRODUCTION_CERTIFICATION_REPORT.md`'s Phase 6 update).

Six roles tested, matching the certification's list: `job_seeker`/candidate,
`employer`/recruiter (both `owner` and plain `member` org roles, to catch
permission-gated actions), `business_seller` (as both listing owner and
buyer), `verification_officer`, `platform_admin`, and `guest`/anonymous.

## Legend

- ✅ **Tested, passing** — an automated assertion in the suite proves this.
- 🔴 **Tested, OPEN FINDING** — an automated assertion proves the *current*
  behavior; that behavior is a real gap, not a false alarm. Flagged for a
  fix decision, not silently marked "verified."
- ⚪ **Not applicable** — the role has no relationship to this resource by
  design (e.g., a candidate has no write path to `business_listings`).

A combination is never marked ✅ without a specific test in
`supabase/tests/rls_security_test_matrix.sql` backing it — search that file
for the bracketed `[table][role][action]` tag to find the exact assertion.

## Matrix

| Table | guest | candidate (self) | candidate (other) | employer (org member, no perms) | employer (org owner/admin) | employer (cross-org) | business_seller (owner) | business_seller (buyer) | verification_officer | platform_admin |
|---|---|---|---|---|---|---|---|---|---|---|
| `organizations` SELECT | ✅ sees all rows (see Finding 1) | ⚪ | ⚪ | ✅ | ✅ | ✅ | ⚪ | ⚪ | ⚪ | ⚪ |
| `organizations` UPDATE | ⚪ (deny) | ⚪ | ⚪ | ✅ denied | ✅ allowed (own org) | ✅ denied (cross-tenant) | ⚪ | ⚪ | ⚪ | ⚪ |
| `users` SELECT | ✅ denied (own row only exists) | ✅ self only | ✅ denied | — | — | — | — | — | — | — |
| `users` UPDATE (suspended) | — | 🔴 suspended user can still self-update (Finding 4) | — | — | — | — | — | — | — | — |
| `organization_memberships` SELECT | ✅ denied | ⚪ | ⚪ | ✅ own org only | ✅ own org only | ✅ denied (cross-tenant) | ⚪ | ⚪ | ⚪ | ⚪ |
| `organization_memberships` UPDATE | ⚪ | ⚪ | ⚪ | ✅ denied (self-promote) | ✅ allowed (manage org) | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `organization_memberships` UPDATE (sole owner demotion) | ⚪ | ⚪ | ⚪ | ⚪ | ✅ denied by trigger | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `candidate_profiles` SELECT | ✅ denied | ✅ self only | ⚪ | ✅ denied even for org the candidate applied to (Finding 3 confirms this is *correct*) | ✅ denied | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `opportunities` SELECT (published) | ✅ | — | — | — | — | — | — | — | — | — |
| `opportunities` SELECT (draft) | ✅ denied | — | — | ✅ own org sees it | ✅ own org sees it | ✅ denied (cross-tenant) | — | — | — | — |
| `opportunities` INSERT | ⚪ | ⚪ | ⚪ | ✅ denied (no `opportunities.create` perm) | ✅ allowed | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `opportunities` UPDATE | ⚪ | ⚪ | ⚪ | — | ✅ allowed (own org) | ✅ denied (cross-tenant) | ⚪ | ⚪ | ⚪ | ⚪ |
| `applications` SELECT | ✅ denied | ✅ self only | ✅ denied (other candidate) | — | ✅ own org (applicant PII snapshot — intended) | ✅ denied (cross-tenant, incl. PII) | ⚪ | ⚪ | ⚪ | ⚪ |
| `applications` UPDATE (candidate self) | ⚪ | ✅ can only withdraw, cannot self-edit employer fields | ⚪ | — | — | ✅ denied (cross-tenant) | ⚪ | ⚪ | ⚪ | ⚪ |
| `business_listings` SELECT (public) | ✅ | — | — | — | — | — | ✅ | — | — | — |
| `business_listings` SELECT (confidential, direct table) | ✅ denied | — | — | — | — | — | ✅ owner sees full row | ✅ denied even with approved NDA (RPC-only, Finding 2 confirms correct design) | ✅ denied | ⚪ |
| `business_listings` UPDATE | ⚪ | — | — | — | — | — | ✅ owner only | ⚪ | 🔴 correctly denied at table level, but see RPC gap (Finding 5) | ⚪ |
| `get_business_listing_public()` RPC | ✅ confidential fields stripped | — | — | — | — | — | — | ✅ revealed only after approved+signed NDA | ✅ stripped without NDA | ⚪ |
| `business_access_requests` SELECT | ✅ denied | — | — | — | — | — | ✅ own listing's requests | ✅ own requests | ⚪ | ⚪ |
| `business_access_requests` UPDATE (buyer self-approve) | ⚪ | — | — | — | — | — | ⚪ | ✅ denied by trigger (Finding 6 — confirmed safe) | ⚪ | ⚪ |
| `business_access_requests` UPDATE (seller decision) | ⚪ | — | — | — | — | — | ✅ allowed | ⚪ | ⚪ | ⚪ |
| `business_inquiries` INSERT (spoof sender) | ⚪ | — | — | — | — | — | — | ✅ denied | — | — |
| `business_inquiries` SELECT | ⚪ | — | — | — | — | — | ✅ owner sees own listing's inquiries | ✅ sender sees own | — | — |
| `business_saved_listings` | ⚪ | — | — | — | — | — | — | ✅ self-scoped, isolated | — | — |
| `audit_logs` SELECT | ✅ denied | ⚪ | ⚪ | — | ✅ own org | ✅ denied (cross-tenant) | ⚪ | ⚪ | ⚪ | ⚪ |
| `audit_logs` INSERT (any authenticated) | ⚪ | ⚪ | ⚪ | ⚪ | ✅ denied — service_role only | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `verification_audits` SELECT | ✅ denied | ⚪ | ⚪ | — | ✅ own org | ✅ denied (cross-tenant) | ⚪ | ⚪ | 🔴 no RLS grant at all (Finding 5) | ✅ override: all orgs |
| `verification_requests` SELECT | ✅ denied | — | — | — | — | — | — | — | — | ✅ override: all requests |
| `review_verification_request()` RPC | ⚪ | — | — | — | — | — | — | — | 🔴 rejected — "Only platform administrators" (Finding 5) | ✅ works |
| `business_listings` UPDATE by officer (negative case) | ⚪ | — | — | — | — | — | — | — | ✅ correctly denied | — |
| `conversations` / `direct_messages` SELECT | ✅ denied | ✅ participant only | ✅ denied (non-participant) | — | ✅ participant only | ✅ denied | — | — | — | — |
| `direct_messages` INSERT (to a blocker) | ⚪ | ✅ denied by trigger | — | — | — | — | — | — | — | — |
| `user_blocks` | ✅ denied | ✅ self-scoped | ✅ denied (others') | — | — | — | — | — | — | — |
| `content_reports` INSERT (direct) | ⚪ | ✅ denied — RPC only | — | — | — | — | — | — | — | — |
| `submit_content_report()` RPC | ⚪ | ✅ works | — | — | — | — | — | — | — | — |
| `content_reports` SELECT | ✅ denied | ✅ own reports only | ✅ denied (others') | — | — | — | — | — | — | ✅ override: all reports |
| `account_restrictions` SELECT | ✅ denied | ✅ own only (incl. suspended user) | ✅ denied (others') | — | — | — | — | — | — | — |
| `suspicious_activity_events` SELECT | ⚪ | ✅ denied even for own events | — | — | — | — | — | — | — | ✅ override: all events |
| `organization_subscriptions` SELECT | ✅ denied | ⚪ | ⚪ | ✅ view only | ✅ view + manage | ✅ denied (cross-tenant) | ⚪ | ⚪ | ⚪ | ⚪ |
| `organization_subscriptions` UPDATE | ⚪ | ⚪ | ⚪ | ✅ denied (RLS silently filters, 0 rows) | ✅ allowed | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `organization_invitations` INSERT | ⚪ | ⚪ | ⚪ | ✅ denied (no `members.invite` perm) | ✅ allowed | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `organization_invitations` SELECT | ⚪ | ✅ invitee-by-email sees own | ✅ denied (not the invitee) | — | — | ✅ denied (cross-tenant) | ⚪ | ⚪ | ⚪ | ⚪ |
| `organization_invitations` UPDATE (invitee self-escalate role) | ⚪ | ✅ denied by trigger; accept/decline only allowed | — | — | — | — | ⚪ | ⚪ | ⚪ | ⚪ |

## Open findings

These are real, currently-open items surfaced by this phase's testing — not
resolved here, since the task scope is proving and documenting, not building
features or patching security-relevant SQL without a separate review.

### Finding 1 — `organizations` table exposes sensitive fields to anonymous users (Medium/High)
The SELECT policy for the `public` role is `USING (true)` — unconditional.
`docs/PRODUCTION_CERTIFICATION_REPORT.md` previously described this as
"verified organizations only," but the live policy has no such condition.
Anonymous callers can read `tax_id_number`, `registration_number`,
`contact_email`, and `contact_phone` for **every** organization, verified or
not. Test: `[organizations][anon][SELECT]` in the suite.
**Recommendation**: either scope the public SELECT policy to
`verification_status = 'verified'` and non-sensitive columns (a view or
column-level grant), or confirm this is an accepted product decision and
update the docs instead — but the docs and the policy must agree.

### Finding 2 — Confidential business fields (verified correct, not a gap)
Direct table SELECT on `business_listings` never returns confidential rows
to a non-owner, even with an approved and signed NDA — access is only
possible through `get_business_listing_public()`, a `SECURITY DEFINER` RPC
that checks `has_business_access()` before including the confidential
columns. This is the intended design and it holds. No action needed.

### Finding 3 — Candidate PII (verified correct, not a gap)
`candidate_profiles` has no SELECT policy granting access to anyone but the
owner — not even an employer whose opportunity the candidate applied to.
That employer's visibility into a candidate is limited to the
application-time snapshot fields on `applications` (name/email/phone
captured when the candidate applied), which is a deliberate, narrower grant
tied to actual consent-by-applying. Broader candidate discovery goes through
`get_public_candidate_profile()` / `search_candidate_profiles()`, both
`SECURITY DEFINER` RPCs. No action needed.

### Finding 4 — A suspended account's session is NOT rejected by RLS (Critical)
`users.account_status` (and the corresponding `account_restrictions` row) is
never referenced by any RLS policy on any table. A suspended user's Supabase
Auth JWT remains valid until it expires or is revoked, and — tested live —
that JWT still passes RLS on ordinary tables:
- `[users][suspended user][SELECT]` — can still read their own row.
- `[users][suspended user][UPDATE]` — can still edit their own profile.
- `[applications][suspended user][INSERT]` — can still submit a new job
  application.

Suspension is enforced only in `permissionEngine.ts` / `authService.ts` (the
TypeScript app layer). Anyone calling the Supabase REST/PostgREST API
directly (bypassing the app's own checks) is unaffected by a suspension.
**This is the exact scenario the task named as blocker #4, and it is
currently open.** Fixing it requires an RLS-visible signal — e.g. a
`current_setting`-style check inside relevant policies, or (more robustly)
actually revoking/expiring the user's Supabase Auth sessions when
`apply_account_restriction()` runs, so the JWT itself stops validating.
Neither was done here — this needs its own reviewed change, not a
same-pass patch bundled into a testing phase.

### Finding 5 — `verification_officer` has no matching RLS or RPC grants (Medium)
The application's `permissionMatrix.ts` lists `verification_officer`
alongside `platform_admin` as allowed to review verification requests. At
the database layer, every relevant policy and RPC (`review_verification_request()`,
`decide_verification_audit()`, `verification_audits` SELECT, `apply_account_restriction()`,
`resolve_content_report()`, `get_platform_analytics()`) checks
`is_platform_admin()` only. Tested live: a `verification_officer` calling
`review_verification_request()` gets `42501: Only platform administrators
may review verification requests.` — this is safe (no over-grant) but means
the officer role is non-functional at the database level today; whatever
workflow the app intends for officers either doesn't work yet or runs
through some other, untested path.
**Recommendation**: either extend the relevant `SECURITY DEFINER` functions'
checks to `is_platform_admin() OR is_verification_officer()` (a new,
analogous helper), or update `permissionMatrix.ts` and the docs to reflect
that only `platform_admin` currently has this capability. This is a product
decision, not made here.

### Finding 6 — Buyer NDA self-approval (verified correct, not a gap)
The RLS policy `"Buyers can sign their own NDA"` (UPDATE on
`business_access_requests`) is column-unrestricted on its own — nothing in
the policy stops a buyer from setting `status = 'approved'` themselves. On
its own, this would be a critical vulnerability. Live-tested it is **not**
exploitable: a `BEFORE UPDATE` trigger, `enforce_business_access_request_update_boundary()`,
independently rejects any buyer-initiated change to `status`,
`seller_response_notes`, or the buyer/listing identity columns, allowing only
`nda_signed`/`nda_signed_at`. This is real defense-in-depth working as
intended — flagged here so a future refactor that only reviews RLS policies
(and misses the trigger) doesn't accidentally reopen this by "cleaning up"
what looks like a redundant check.

## Regression: production bundle seed-PII check (Phase 3 item, re-run)

Per the original Phase 3/4 acceptance criteria
(`npm run build && grep <seed-email> dist/assets/*.js`), re-run this phase
as a regression check:

```
$ npm run build   # succeeds
$ grep -o "hiring@savethechildren.lr" dist/assets/index-B0tggEaR.js | wc -l
6
$ grep -o "nathaniel.sherman@capitolhillcapital.lr" dist/assets/index-B0tggEaR.js | wc -l
1
$ grep -oE '\+231[ -][0-9]{2}[ -][0-9]{3}[ -][0-9]{4}' dist/assets/index-B0tggEaR.js | sort -u
+231 77 000 0000
+231 77 000 1111
... (10 distinct seed phone numbers)
```

**Still open, unchanged from `docs/PHASE3_GAP_CLOSURE.md`**: `dbClient.ts`'s
seed dataset (names, emails, phone numbers for demo users/organizations) is
still reachable from the production bundle regardless of
`VITE_ENABLE_DEMO_MODE`. Not touched in this phase — it's a bundling
concern, not an RLS/authorization concern, and the prior phase's scoped
recommendation for fixing it still stands.

## Full test suite results

- **vitest**: 166/166 passing (`npm run test`).
- **RLS pgTAP suite**: 112/112 passing (`supabase/tests/rls_security_test_matrix.sql`,
  run live against project `tnnwbjenajtwiuiqbwpj`).
- **Build**: `npm run build` succeeds.
- Full raw output for both is in `docs/PRODUCTION_CERTIFICATION_REPORT.md`'s
  Phase 6 update.

## How to re-run

```bash
# vitest
npm run test

# production build + bundle check
npm run build
grep -o "<a known seed email>" dist/assets/*.js | wc -l

# RLS matrix (paste the file's contents into a SQL client with access to the
# live project, e.g. via the Supabase MCP connector's execute_sql tool, or:
psql "$SUPABASE_DB_URL" -f supabase/tests/rls_security_test_matrix.sql
```
