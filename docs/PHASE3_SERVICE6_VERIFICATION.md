# Phase 3, Service 6 — messagingService — Live Verification Record

**Date**: September 11, 2026
**Project**: `tnnwbjenajtwiuiqbwpj` (Opportunity Hub Liberia)
**Channel**: Supabase MCP connector, `execute_sql` / `apply_migration` (same
database-level channel used for Services 1-5).

## What made this service different from the first five

Every prior service migrated an *existing* table. Messaging had **no
backing Supabase tables at all** — `conversations`, `direct_messages`,
and `user_blocks` were entirely local-only in `dbClient.ts`. This
migration builds the schema from scratch, modeled directly on
`dbClient.ts`'s existing logic so app behavior is preserved, but now with
Postgres enforcing what was previously just trusted client code.

## Design choices

- **`conversation_participants` is a normalized join table**, not a
  jsonb array on `conversations` — the same reason organization
  membership (Service 1) is its own table: "am I allowed to see this
  conversation" needs to be a fast, indexable `EXISTS` check, not a jsonb
  scan.
- **The same chicken-and-egg problem as organizations**: a brand-new
  conversation has no participant rows yet, so a participant-based RLS
  policy can't authorize adding the first ones. Fixed the same way:
  `create_conversation_with_participants()`, a `SECURITY DEFINER` RPC
  that creates the conversation and inserts every participant
  atomically — but only ever succeeds if the calling user is included
  among the participants being added.
- **Blocking is now a real, unbypassable invariant**, not a UI hint. The
  old `dbClient.ts` implementation only set `conversation.isBlocked =
  true` after the fact for the UI to read — a client that ignored that
  flag could still call `sendMessage()`. A `BEFORE INSERT` trigger on
  `direct_messages` now checks `is_user_blocked()` in both directions and
  rejects the message outright.
- **A second, narrower gap found and fixed along the way**: `public.users`
  RLS restricts `SELECT` to the row's own owner only. That's correct in
  general, but it means a conversation participant could never actually
  see who they're talking to. Rather than widen `users`' RLS to expose
  the whole row (phone number, account status, etc.) to conversation
  partners, added `get_conversation_participant_profiles()` — a narrow
  RPC returning only `full_name`/`avatar_url`/`primary_role` for
  participants of a conversation the caller is actually in. Same
  "narrow RPC over widening a table policy" choice as the redaction RPCs
  in Services 4-5, applied here to avoid creating a new exposure instead
  of closing an existing one.

## Migrations applied

- `supabase/migrations/20260910200000_messaging_service_backend.sql` —
  the four tables, RLS, `create_conversation_with_participants()`,
  `is_user_blocked()`, and the two triggers (no-messages-between-blocked,
  message-update column boundary).
- `supabase/migrations/20260910210000_messaging_participant_profiles.sql`
  — `get_conversation_participant_profiles()`.

Both applied cleanly (fresh tables, no existing data to migrate).

## Test sequence (all run live, then cleaned up)

Three throwaway `auth.users` rows: Alice, Bob, and Eve (an uninvolved
third party).

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Alice calls `create_conversation_with_participants()` with herself and Bob | Conversation + both participant rows created atomically | ✅ Both rows confirmed |
| 2 | Eve (non-participant) reads the conversation | 0 rows | ✅ |
| 3 | Eve calls the RPC trying to create a conversation naming Alice+Bob as participants (impersonation attempt, since she's not in the list herself either — but tested the "not among participants" case directly) | Rejected | ✅ `42501: You may only create a conversation you are a participant in.` |
| 4 | Alice sends a message; Bob (real participant) reads it | Visible | ✅ |
| 5 | Eve reads the same message | 0 rows | ✅ |
| 6 | Eve attempts to `INSERT` a message with `sender_id` set to Alice's id (impersonation) | Rejected | ✅ `42501: new row violates row-level security policy for table "direct_messages"` |
| 7 | Bob blocks Alice; Alice (still a real conversation participant) attempts to send another message to Bob | Rejected by the blocking trigger, despite valid participant-membership RLS | ✅ `42501: Cannot send a message: one participant has blocked the other.` |
| 8 | Bob (legitimate recipient, has an UPDATE policy) attempts to rewrite the message *body* instead of just marking it read | Rejected by the column-boundary trigger | ✅ `42501: Only is_read/read_at may be updated on a sent message.` |
| 9 | Bob performs the legitimate action: sets `is_read = true` | Succeeds | ✅ |
| 10 | Alice calls `get_conversation_participant_profiles()` for her own conversation | Returns her own display profile | ✅ |
| 11 | Eve calls the same RPC for a conversation she's not in | Empty result | ✅ |

**11/11 passed.**

## Cleanup

All test conversations, participants, messages, blocks, and
`auth.users`/`public.users` rows were removed after each test batch.
Verified 0 rows remaining in every case.

## What's live vs. what needed wiring

`messagingService.ts`'s public API was already fully async and its one
consumer, `MessagingCenter.tsx`, already called every method with
`await` and never touched `dbClient.ts` directly for
conversations/messages/blocks — so, like candidateService, **no `App.tsx`
or component wiring was needed**. This service is live in the running
app automatically.

## Deferred, not covered by this service

`reportConversation()` has no backing table (`message_reports` doesn't
exist in the schema) — message/user reporting is fundamentally a trust &
safety concern and is left for `trustSafetyService` (Service 8) to own;
still `dbClient.ts`-backed for now, same deferred-scope pattern as
organizationService's invitations (Service 1) and businessService's
inquiries/saves (Service 5).
