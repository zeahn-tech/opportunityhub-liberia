# Phase 3, Service 7 — verificationService — Live Verification Record

**Date**: September 11, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Services 1-6).

## Two real gaps, not just a schema catch-up

1. **The review queue was unreachable.** `verification_audits` only had
   SELECT/INSERT policies scoped to `is_org_admin(organization_id)` — an
   org can submit and see its own requests, but there was no UPDATE
   policy at all, and no concept of "platform admin" anywhere in RLS. A
   platform admin reviewing submissions couldn't even SELECT requests
   from orgs they don't belong to — which, for a platform admin, is
   normally every org.
2. **Approving a request never did anything.** The old `dbClient.ts`
   `updateAuditDecision()` only flipped the audit's own `status` field —
   it never touched `organizations.verification_status` /
   `verification_badge` (added back in Service 1's migration). That made
   "verification" purely cosmetic: an approved audit existed, but the
   org's badge, and anything downstream that reads it (trust indicators,
   search filters), never actually changed.

## The fix

- `is_platform_admin()` — a reusable helper (checks
  `system_role`/`primary_role`), which `trustSafetyService` (Service 8)
  will need too.
- A new SELECT policy grants platform admins visibility into every
  verification audit — their actual review queue.
- `decide_verification_audit()` — a `SECURITY DEFINER` RPC and the
  **only** path to a decision. No generic UPDATE policy was added to
  `verification_audits` at all; a direct table UPDATE is a no-op under
  RLS regardless of who attempts it. The RPC checks the caller is a
  platform admin, updates the audit row, and — on approval — updates the
  organization's `verification_status`/`verification_badge` in the same
  function, plus writes an `audit_logs` entry.

## Test sequence (all run live, then cleaned up)

Three throwaway `auth.users` rows: an org admin, a platform admin, and an
uninvolved outsider.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Org admin creates an org and submits a verification audit | Succeeds | ✅ |
| 2 | Outsider reads the audit | 0 rows | ✅ |
| 3 | Platform admin reads the same audit (from an org they don't belong to) | Visible — proves the review-queue gap is fixed | ✅ |
| 4 | Outsider calls `decide_verification_audit()` | Rejected | ✅ `42501: Only platform administrators may decide verification audits.` |
| 5 | **The org's own admin** (owner of the org being reviewed, but not a platform admin) attempts to decide their own request | Rejected — self-approval is not possible | ✅ Same `42501` |
| 6 | Platform admin approves, with reviewer notes | Succeeds | ✅ |
| 7 | Verify the organization's `verification_status`/`verification_badge`/`is_verified` after approval | All three correctly updated — **and `is_verified` synced automatically via Service 1's `sync_organization_verified_flag` trigger**, proving these migrations compose correctly across phases, not just individually | ✅ `verification_status: "verified"`, `verification_badge: "verified_business"`, `is_verified: true` |
| 8 | Verify the audit row and the `audit_logs` entry the RPC wrote | Reviewer fields populated; `audit_logs` row present with `action: "verification.approved"` | ✅ |
| 9 | Platform admin attempts a **direct** `UPDATE` on `verification_audits` (bypassing the RPC entirely) | 0 rows affected — no UPDATE policy exists for anyone, RPC is the only path | ✅ Confirmed via `UPDATE ... RETURNING` inside the same transaction, not just a post-hoc read |

**7/7 passed** (9 checks total; #4/#5 share one finding, as do #6/#7/#8).

## Cleanup

All test audits, the audit_logs entry, the organization/memberships, and
three `auth.users`/`public.users` rows were removed. Verified
`org_left=0, audit_left=0, users_left=0` after cleanup.

## What's live vs. what needed wiring

`verificationService.ts`'s public API was already fully async.
`src/App.tsx`'s `audits` state was wired the same way as opportunities/
applications (Services 2-3): a `refreshAudits()` helper calling
`verificationService.list()`, replacing a direct `db.getVerificationAudits()`
read in the mount effect and the decision handler. `handleNewAuditSubmit`
already used the service's own response correctly and needed no change.
This service is live in the running app.

## Known gap, flagged not hidden

Rejection does not currently revert or otherwise change the
organization's existing `verification_status` — a rejected request just
leaves the org's status as it was. This matches a reasonable product
default (rejecting a *new* verification request shouldn't strip an
*existing* verified badge from a prior approval) but wasn't an explicit
requirement either way; flagged as a design assumption, not a
requirement analysis.
