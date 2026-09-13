# Phase 3, Service 8 — trustSafetyService — Live Verification Record

**Date**: September 11, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Services 1-7).

## Scope

`trustSafetyService.ts` covers a genuinely separate, richer verification
system (`VerificationRequest`, entity type
organization/recruiter/business, evidence documents, reviewed by
"Verification Officers") from `verificationService.ts`'s simpler
`VerificationAudit` (Service 7). Both are real and both are used by
different parts of the UI (`VerificationHub.tsx` /
`TrustSafetyAdminCenter.tsx` vs. wherever `verificationService` is used)
— this migration does not attempt to unify them; that's a product
decision beyond a data-layer migration. It also covers content
reports, account restrictions, and suspicious-activity events — all four
had **no backing tables at all** before this pass, the second time this
phase has built a schema from scratch (after messaging, Service 6).

## Two invariants moved server-side, not just schema

1. **The multi-report auto-quarantine threshold.** The old
   `dbClient.ts` logic ("if a target has ≥ 2 reports, auto-create a
   suspicious-activity event and quarantine the listing") needs to count
   reports **across all reporters** for a target — but an ordinary
   reporter's RLS only lets them see their own reports. That count can
   only be computed correctly server-side, so report submission is a
   `SECURITY DEFINER` RPC (`submit_content_report`), not a plain insert.
2. **Atomic account suspension.** `apply_account_restriction()` /
   `lift_account_restriction()` flip `users.account_status` in the same
   transaction as the restriction row, platform-admin-gated.

## Migration applied

`supabase/migrations/20260911150000_trust_safety_service_backend.sql` —
four new tables (`verification_requests`, `content_reports`,
`account_restrictions`, `suspicious_activity_events`), RLS scoping each
to "submitter/target sees their own, platform admin sees everything,"
and five RPCs: `review_verification_request`, `submit_content_report`,
`resolve_content_report`, `apply_account_restriction`,
`lift_account_restriction`. No generic UPDATE policy was added to any of
the four tables — every state transition goes through an RPC.

## Test sequence (all run live, then cleaned up)

Four throwaway `auth.users` rows: a platform admin, two independent
reporters, and a target user (who also owns a test org/opportunity).

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Reporter 1 submits a report against the target's opportunity via `submit_content_report()` | Succeeds, count = 1, no quarantine yet | ✅ |
| 2 | Reporter 2 (independent, unaware of reporter 1) submits a **second** report against the same target | The server-computed count reaches 2 → auto-creates a `suspicious_activity_events` row AND quarantines the opportunity | ✅ `moderation_status: "quarantined"`, `report_count: 2`, suspicious-activity row present |
| 3 | Reporter 1 attempts to read reporter 2's report directly | 0 rows — each reporter only sees their own | ✅ |
| 4 | Reporter 1 (non-admin) calls `resolve_content_report()` | Rejected | ✅ `42501: Only platform administrators may resolve reports.` |
| 5 | Platform admin resolves the report | Succeeds | ✅ |
| 6 | Reporter 1 (non-admin) calls `apply_account_restriction()` against the target | Rejected | ✅ `42501: Only platform administrators may restrict an account.` |
| 7 | Platform admin applies a `full_suspension` restriction to the target | Succeeds, **and `users.account_status` atomically flips to `'suspended'`** | ✅ |
| 8 | Target reads their own restriction; reporter 1 attempts to read the target's restriction | Target: visible. Reporter 1: 0 rows | ✅ Both confirmed |
| 9 | Platform admin lifts the restriction | Succeeds, **and `users.account_status` atomically reverts to `'active'`** | ✅ |
| 10 | Target submits a `verification_requests` row for their org; platform admin calls `review_verification_request()` with `'verified'` | Succeeds, **and `organizations.verification_status`/`verification_badge` are updated** — proving this separate verification system also correctly triggers Service 1's `sync_organization_verified_flag` trigger | ✅ `verification_status: "verified"`, `verification_badge: "verified_business"` |

**11/11 passed** (10 rows above; #2 and #8 each contain two confirmed sub-checks).

## Cleanup

All test reports, the suspicious-activity event, the restriction, the
verification request, the opportunity, the organization/memberships, the
audit_logs entries, and four `auth.users`/`public.users` rows were
removed. Verified 0 rows remaining across every table involved.

## What's live vs. what needed wiring

`trustSafetyService.ts`'s methods were already async;
`VerificationHub.tsx` and `ReportModal.tsx` already called
`submitVerificationRequest()`/`submitReport()` correctly with `await` and
needed no changes beyond widening the service's input types to accept
(and ignore) client-supplied `submitterUserId`/`reporterUserId`/reviewer-id
fields the RPCs no longer need — the real actor is always derived from
the authenticated session server-side, which is *more* correct than
trusting a client-supplied id, not less.

**`TrustSafetyAdminCenter.tsx` needed real wiring, not just a pass-through
check**: it read `verificationRequests`/`reports`/`restrictions` directly
from `dbClient.ts` in three places (a `useState` initializer and a shared
`refreshAllData()` helper with no mount effect calling it — meaning the
dashboard's initial load previously came entirely from local state).
Added `getVerificationRequests()`/`getContentReports()`/
`getAccountRestrictions()` list methods to the service (RLS alone decides
what each caller sees), made `refreshAllData()` async, and added a mount
effect to load real data on open. Left `opportunities`/`organizations`/
`businesses`/`users`/`anomalies`/`auditLogs` on this same dashboard
untouched — those either belong to already-migrated services this
dashboard doesn't yet call through their real service (a pre-existing
gap, not introduced by this pass) or to services/tables not yet migrated
at all.

## Deferred, not covered by this service

Unified reconciliation of `verification_requests` (this service) and
`verification_audits` (Service 7) into a single system — both are real,
both are used, and picking one is a product decision, not a data-layer
migration task.
