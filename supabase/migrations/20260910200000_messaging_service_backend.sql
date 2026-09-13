-- Phase 3, Service 6: messagingService
--
-- Unlike every prior service, this one starts from NOTHING -- no
-- messaging tables exist in the schema at all. dbClient.ts's
-- conversations/direct_messages/user_blocks are entirely local-only.
-- This migration creates the real tables plus RLS from scratch, modeled
-- directly on dbClient.ts's existing conversation/message/block logic so
-- behavior stays the same for the app, but now enforced by Postgres
-- instead of trusted client code.
--
-- Design notes:
--   - `conversation_participants` is a normalized join table (the app's
--     `Conversation.participants` array), NOT a jsonb array on
--     `conversations` -- this is what makes "is the caller allowed to see
--     this conversation" a simple, fast RLS EXISTS check instead of an
--     unindexable jsonb scan, and is the same reason organization
--     membership is its own table rather than an array on organizations.
--   - Creating a conversation has the same chicken-and-egg problem as
--     organizations (Service 1): a brand-new conversation has no
--     participant rows yet, so a participant-based RLS check can't
--     authorize adding the first participants. Same fix: a SECURITY
--     DEFINER RPC, `create_conversation_with_participants()`, that
--     creates the conversation and inserts every participant row
--     atomically -- but ONLY ever succeeds if the calling user
--     (auth.uid()) is included among the participants being added. It
--     can't be used to insert a conversation the caller isn't part of,
--     or to add arbitrary participants to someone else's conversation.
--   - Blocking is enforced as a real invariant, not just a UI hint: a
--     BEFORE INSERT trigger on direct_messages checks is_user_blocked()
--     in both directions and rejects the message outright if either
--     party has blocked the other. The old dbClient.ts implementation
--     only marked the conversation `isBlocked` after the fact and relied
--     on client code to stop rendering a "send" button -- a client that
--     ignored that UI state could still call sendMessage(). Not anymore.
--   - Only `is_read`/`read_at` are ever mutable on a sent message (no
--     edit-message feature exists in the app), enforced by a trigger
--     regardless of which RLS policy let the UPDATE through.

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id character varying primary key,
  category character varying not null default 'general',
  title character varying not null default '',
  context_id character varying,
  context_type character varying,
  last_message text,
  last_message_at timestamp with time zone,
  last_sender_id character varying,
  is_blocked boolean not null default false,
  blocked_by_user_id character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id character varying not null references public.conversations(id) on delete cascade,
  user_id character varying not null references public.users(id) on delete cascade,
  unread_count integer not null default 0,
  joined_at timestamp with time zone not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id character varying primary key,
  conversation_id character varying not null references public.conversations(id) on delete cascade,
  sender_id character varying not null references public.users(id),
  recipient_id character varying not null references public.users(id),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  is_read boolean not null default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_direct_messages_conversation on public.direct_messages(conversation_id, created_at);

create table if not exists public.user_blocks (
  id character varying primary key,
  blocking_user_id character varying not null references public.users(id) on delete cascade,
  blocked_user_id character varying not null references public.users(id) on delete cascade,
  reason text,
  created_at timestamp with time zone not null default now(),
  unique (blocking_user_id, blocked_user_id)
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_blocks enable row level security;

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------
create or replace function public.is_conversation_participant(p_conversation_id character varying, p_user_id character varying)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = p_user_id
  );
$$;

create or replace function public.is_user_blocked(p_user_a character varying, p_user_b character varying)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocking_user_id = p_user_a and blocked_user_id = p_user_b)
       or (blocking_user_id = p_user_b and blocked_user_id = p_user_a)
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Atomic conversation creation
-- ---------------------------------------------------------------------
create or replace function public.create_conversation_with_participants(
  p_id character varying,
  p_category character varying,
  p_title character varying,
  p_context_id character varying,
  p_context_type character varying,
  p_participant_ids character varying[]
)
returns public.conversations
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_conv public.conversations;
  v_uid character varying;
  v_pid character varying;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null then
    raise exception 'Authentication required to start a conversation.' using errcode = '28000';
  end if;
  if not (v_uid = any(p_participant_ids)) then
    raise exception 'You may only create a conversation you are a participant in.' using errcode = '42501';
  end if;

  insert into public.conversations (id, category, title, context_id, context_type)
  values (p_id, p_category, p_title, p_context_id, p_context_type)
  returning * into v_conv;

  foreach v_pid in array p_participant_ids loop
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv.id, v_pid)
    on conflict do nothing;
  end loop;

  return v_conv;
end;
$$;

revoke all on function public.create_conversation_with_participants from public;
grant execute on function public.create_conversation_with_participants to authenticated;

-- ---------------------------------------------------------------------
-- 4. RLS policies
-- ---------------------------------------------------------------------
drop policy if exists "Participants can view their conversations" on public.conversations;
create policy "Participants can view their conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_participant(id, auth.uid()::character varying));

drop policy if exists "Participants can update their conversations" on public.conversations;
create policy "Participants can update their conversations"
  on public.conversations for update
  to authenticated
  using (public.is_conversation_participant(id, auth.uid()::character varying));

drop policy if exists "Participants can view participant rows for their conversations" on public.conversation_participants;
create policy "Participants can view participant rows for their conversations"
  on public.conversation_participants for select
  to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()::character varying));

drop policy if exists "Participants can update their own participant row" on public.conversation_participants;
create policy "Participants can update their own participant row"
  on public.conversation_participants for update
  to authenticated
  using (user_id = auth.uid()::character varying);

drop policy if exists "Participants can view messages in their conversations" on public.direct_messages;
create policy "Participants can view messages in their conversations"
  on public.direct_messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()::character varying));

drop policy if exists "Participants can send messages in their conversations" on public.direct_messages;
create policy "Participants can send messages in their conversations"
  on public.direct_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()::character varying
    and public.is_conversation_participant(conversation_id, auth.uid()::character varying)
    and public.is_conversation_participant(conversation_id, recipient_id)
  );

drop policy if exists "Recipients can mark their messages read" on public.direct_messages;
create policy "Recipients can mark their messages read"
  on public.direct_messages for update
  to authenticated
  using (recipient_id = auth.uid()::character varying);

drop policy if exists "Users can view their own block list" on public.user_blocks;
create policy "Users can view their own block list"
  on public.user_blocks for select
  to authenticated
  using (blocking_user_id = auth.uid()::character varying);

drop policy if exists "Users can manage their own blocks" on public.user_blocks;
create policy "Users can manage their own blocks"
  on public.user_blocks for insert
  to authenticated
  with check (blocking_user_id = auth.uid()::character varying);

drop policy if exists "Users can remove their own blocks" on public.user_blocks;
create policy "Users can remove their own blocks"
  on public.user_blocks for delete
  to authenticated
  using (blocking_user_id = auth.uid()::character varying);

-- ---------------------------------------------------------------------
-- 5. Real invariants via triggers
-- ---------------------------------------------------------------------
create or replace function public.enforce_no_messages_between_blocked_users()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if public.is_user_blocked(new.sender_id, new.recipient_id) then
    raise exception 'Cannot send a message: one participant has blocked the other.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_no_messages_between_blocked_users on public.direct_messages;
create trigger trg_enforce_no_messages_between_blocked_users
  before insert on public.direct_messages
  for each row execute function public.enforce_no_messages_between_blocked_users();

create or replace function public.enforce_message_update_boundary()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.body is distinct from old.body
    or new.attachments is distinct from old.attachments
    or new.sender_id is distinct from old.sender_id
    or new.recipient_id is distinct from old.recipient_id
    or new.conversation_id is distinct from old.conversation_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only is_read/read_at may be updated on a sent message.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_message_update_boundary on public.direct_messages;
create trigger trg_enforce_message_update_boundary
  before update on public.direct_messages
  for each row execute function public.enforce_message_update_boundary();
