/**
 * messagingService.ts
 *
 * Phase 3, Service 6 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status", and
 * docs/PHASE3_SERVICE6_VERIFICATION.md for the live proof).
 *
 * Unlike every prior service, messaging had NO backing Supabase tables
 * at all before this migration -- conversations/direct_messages/
 * user_blocks were entirely local-only in dbClient.ts. See
 * supabase/migrations/20260910200000_messaging_service_backend.sql for
 * the new schema (a normalized conversation_participants join table,
 * not a jsonb array, so "am I allowed to see this" is a real indexed RLS
 * check) and 20260910210000_messaging_participant_profiles.sql for why
 * a narrow RPC (not a wider `users` policy) is how a participant sees
 * who they're talking to.
 *
 * Two invariants now live in Postgres, not here:
 *   - Starting a conversation only ever succeeds if the caller is among
 *     its participants (create_conversation_with_participants RPC).
 *   - A message cannot be sent if either party has blocked the other --
 *     enforced by a BEFORE INSERT trigger, not a client-side check the
 *     old dbClient.ts implementation relied on (it only marked the
 *     conversation `isBlocked` after the fact for the UI to read).
 * This service does not re-check either; it lets Postgres decide and
 * surfaces a denial as a normal ApiResponse error.
 *
 * NOT covered by this service (flagged, not silently dropped):
 * reportConversation() has no backing table (`message_reports` doesn't
 * exist) -- message/user reporting is fundamentally a trust & safety
 * concern and is left for trustSafetyService (Service 8) to own,
 * still dbClient-backed for now.
 */

import {
  Conversation,
  ConversationCategory,
  ConversationParticipant,
  DirectMessage,
  MessageAttachment,
  MessageReport,
  UserBlock,
  UserRole
} from '../types';
import { db } from '../db/dbClient';
import { getSupabaseClient } from '../lib/supabaseClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { notificationService } from './notificationService';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../core/errors/AppError';

interface ConversationRow {
  id: string;
  category: string;
  title: string;
  context_id: string | null;
  context_type: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  is_blocked: boolean;
  blocked_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ParticipantRowJoin {
  conversation_id: string;
  user_id: string;
  unread_count: number;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  attachments: MessageAttachment[] | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; messagingService requires a live backend.');
  }
  return c;
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError(error.message || 'You do not have permission to perform this action.');
  }
  throw new Error(error.message);
}

async function hydrateParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  const [{ data: rows }, { data: profiles, error: profilesError }] = await Promise.all([
    client().from('conversation_participants').select('*').eq('conversation_id', conversationId),
    client().rpc('get_conversation_participant_profiles', { p_conversation_id: conversationId })
  ]);
  if (profilesError) throw new Error(profilesError.message);

  const profileMap = new Map<string, { full_name: string; avatar_url: string | null; primary_role: string | null }>(
    (profiles || []).map((p: any) => [p.user_id, p])
  );
  return ((rows as ParticipantRowJoin[]) || []).map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      userId: r.user_id,
      name: profile?.full_name || 'Unknown User',
      email: '',
      role: (profile?.primary_role as UserRole) || undefined,
      avatar: profile?.avatar_url || undefined
    };
  });
}

async function rowToConversation(row: ConversationRow): Promise<Conversation> {
  const participants = await hydrateParticipants(row.id);
  const { data: participantRows } = await client()
    .from('conversation_participants')
    .select('user_id, unread_count')
    .eq('conversation_id', row.id);
  const unreadCountByUserId: Record<string, number> = {};
  ((participantRows as ParticipantRowJoin[]) || []).forEach((p) => {
    unreadCountByUserId[p.user_id] = p.unread_count;
  });

  return {
    id: row.id,
    category: row.category as ConversationCategory,
    title: row.title,
    participants,
    contextId: row.context_id ?? undefined,
    contextType: (row.context_type as Conversation['contextType']) ?? undefined,
    lastMessage: row.last_message ?? undefined,
    lastMessageAt: row.last_message_at ?? undefined,
    lastSenderId: row.last_sender_id ?? undefined,
    unreadCountByUserId,
    isBlocked: row.is_blocked,
    blockedByUserId: row.blocked_by_user_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToMessage(row: MessageRow): DirectMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: '',
    recipientId: row.recipient_id,
    body: row.body,
    attachments: row.attachments || [],
    isRead: row.is_read,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at
  };
}

export const messagingService = {
  async getUserConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client()
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      const ids = ((data as { conversation_id: string }[]) || []).map((r) => r.conversation_id);
      if (ids.length === 0) return [];

      const { data: convRows, error: convError } = await client()
        .from('conversations')
        .select('*')
        .in('id', ids)
        .order('updated_at', { ascending: false });
      if (convError) throw new Error(convError.message);
      return Promise.all((convRows as ConversationRow[]).map(rowToConversation));
    });
  },

  async getConversation(conversationId: string): Promise<ApiResponse<Conversation | null>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().from('conversations').select('*').eq('id', conversationId).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? rowToConversation(data as ConversationRow) : null;
    });
  },

  async getMessages(conversationId: string, userId: string): Promise<ApiResponse<DirectMessage[]>> {
    return apiClient.execute(async () => {
      await this.markAsRead(conversationId, userId);

      const { data, error } = await client()
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as MessageRow[]).map(rowToMessage);
    });
  },

  async startConversation(data: {
    category: ConversationCategory;
    title: string;
    participants: ConversationParticipant[];
    contextId?: string;
    contextType?: 'opportunity' | 'application' | 'business_listing' | 'general';
    initialMessage?: string;
    senderUserId: string;
  }): Promise<ApiResponse<Conversation>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) throw new UnauthorizedError('Sign in required to start a conversation.');

      // Reuse an existing conversation for the same context + participants,
      // matching dbClient.ts's old dedup behavior.
      if (data.contextId) {
        const { data: existingByContext } = await client()
          .from('conversations')
          .select('*')
          .eq('context_id', data.contextId);
        for (const row of (existingByContext as ConversationRow[]) || []) {
          const { data: existingParticipants } = await client()
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', row.id);
          const existingIds = ((existingParticipants as { user_id: string }[]) || []).map((p) => p.user_id);
          const newIds = data.participants.map((p) => p.userId);
          if (newIds.every((id) => existingIds.includes(id))) {
            if (data.initialMessage) {
              await this.sendMessage({
                conversationId: row.id,
                senderId: data.senderUserId,
                senderName: data.participants.find((p) => p.userId === data.senderUserId)?.name || '',
                recipientId: data.participants.find((p) => p.userId !== data.senderUserId)?.userId || '',
                body: data.initialMessage
              });
            }
            return rowToConversation(row);
          }
        }
      }

      const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const { data: created, error } = await client().rpc('create_conversation_with_participants', {
        p_id: id,
        p_category: data.category,
        p_title: data.title,
        p_context_id: data.contextId ?? null,
        p_context_type: data.contextType ?? null,
        p_participant_ids: data.participants.map((p) => p.userId)
      });
      if (error) translateError(error);

      if (data.initialMessage) {
        const sender = data.participants.find((p) => p.userId === data.senderUserId);
        const recipient = data.participants.find((p) => p.userId !== data.senderUserId);
        if (sender && recipient) {
          await this.sendMessage({
            conversationId: (created as ConversationRow).id,
            senderId: sender.userId,
            senderName: sender.name,
            senderRole: sender.role,
            recipientId: recipient.userId,
            body: data.initialMessage
          });
        }
      }

      return rowToConversation(created as ConversationRow);
    });
  },

  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    senderRole?: UserRole;
    recipientId: string;
    body: string;
    attachments?: MessageAttachment[];
  }): Promise<ApiResponse<DirectMessage>> {
    return apiClient.execute(async () => {
      if (!data.body?.trim()) throw new ValidationError('Message body cannot be empty.');

      const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { data: created, error } = await client()
        .from('direct_messages')
        .insert({
          id,
          conversation_id: data.conversationId,
          sender_id: data.senderId,
          recipient_id: data.recipientId,
          body: data.body,
          attachments: data.attachments || []
        })
        .select('*')
        .maybeSingle();
      // The blocking trigger and participant-membership RLS both raise
      // 42501 here -- surfaced as ForbiddenError either way, no
      // client-side re-check of either invariant.
      if (error) translateError(error);

      const now = new Date().toISOString();
      await client()
        .from('conversations')
        .update({ last_message: data.body, last_message_at: now, last_sender_id: data.senderId })
        .eq('id', data.conversationId);
      await client()
        .from('conversation_participants')
        .update({ unread_count: 1 })
        .eq('conversation_id', data.conversationId)
        .eq('user_id', data.recipientId);

      try {
        const { data: conv } = await client().from('conversations').select('title').eq('id', data.conversationId).maybeSingle();
        notificationService.notifyNewMessage({
          recipientUserId: data.recipientId,
          senderName: data.senderName,
          conversationTitle: (conv as { title: string } | null)?.title || 'Platform Message',
          conversationId: data.conversationId
        });
      } catch {
        // Non-critical.
      }

      return rowToMessage(created as MessageRow);
    });
  },

  async markAsRead(conversationId: string, userId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(async () => {
      await client()
        .from('direct_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', userId)
        .eq('is_read', false);
      await client()
        .from('conversation_participants')
        .update({ unread_count: 0 })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    });
  },

  async blockUser(blockingUserId: string, blockedUserId: string, reason?: string): Promise<ApiResponse<UserBlock>> {
    return apiClient.execute(async () => {
      const id = `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { data, error } = await client()
        .from('user_blocks')
        .insert({ id, blocking_user_id: blockingUserId, blocked_user_id: blockedUserId, reason: reason ?? null })
        .select('*')
        .maybeSingle();
      if (error) translateError(error);
      const row = data as { id: string; blocking_user_id: string; blocked_user_id: string; reason: string | null; created_at: string };
      return {
        id: row.id,
        blockingUserId: row.blocking_user_id,
        blockedUserId: row.blocked_user_id,
        reason: row.reason ?? undefined,
        createdAt: row.created_at
      };
    });
  },

  async unblockUser(blockingUserId: string, blockedUserId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(async () => {
      const { error } = await client()
        .from('user_blocks')
        .delete()
        .eq('blocking_user_id', blockingUserId)
        .eq('blocked_user_id', blockedUserId);
      if (error) translateError(error);
    });
  },

  async getBlockedUsers(userId: string): Promise<ApiResponse<UserBlock[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().from('user_blocks').select('*').eq('blocking_user_id', userId);
      if (error) throw new Error(error.message);
      return ((data as any[]) || []).map((row) => ({
        id: row.id,
        blockingUserId: row.blocking_user_id,
        blockedUserId: row.blocked_user_id,
        reason: row.reason ?? undefined,
        createdAt: row.created_at
      }));
    });
  },

  // ---------------------------------------------------------------------
  // NOT migrated -- no backing Supabase table yet (message_reports).
  // See this file's header comment.
  // ---------------------------------------------------------------------
  async reportConversation(data: {
    conversationId: string;
    messageId?: string;
    reporterUserId: string;
    reportedUserId: string;
    reason: MessageReport['reason'];
    details: string;
  }): Promise<ApiResponse<MessageReport>> {
    return apiClient.execute(() => db.createMessageReport(data));
  }
};
