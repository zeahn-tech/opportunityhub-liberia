import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers messagingService.ts's query-building, RPC-call, and
 * error-translation logic by mocking '../lib/supabaseClient' and
 * '../services/authService' at the module boundary -- see
 * docs/PHASE3_SERVICE6_VERIFICATION.md for the live proof (non-participant
 * denial, impersonation-at-insert rejection, the blocking invariant, and
 * the message-update column boundary) run directly against the real
 * project via the Supabase MCP connector.
 */

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc })
}));

vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => ({
      user: { id: 'user-1', fullName: 'Alice' },
      activeOrganization: null,
      isAuthenticated: true
    }))
  }
}));

vi.mock('../services/notificationService', () => ({
  notificationService: {
    notifyNewMessage: vi.fn()
  }
}));

vi.mock('../services/trustSafetyService', () => ({
  trustSafetyService: {
    submitReport: vi.fn(async (data: unknown) => ({
      id: 'report-1',
      reporterUserId: 'user-1',
      status: 'pending',
      details: (data as { details: string }).details,
      createdAt: new Date().toISOString()
    }))
  }
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'in', 'order', 'update', 'insert', 'delete'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('messagingService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('sendMessage(): validates non-empty body before ever calling Supabase', async () => {
    const { messagingService } = await import('../services/messagingService');
    const res = await messagingService.sendMessage({
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderName: 'Alice',
      recipientId: 'user-2',
      body: '   '
    });

    expect(res.error).toBeTruthy();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('sendMessage(): surfaces a 42501 (blocked users OR non-participant) as ForbiddenError, not a raw driver error', async () => {
    mockFrom.mockReturnValue(
      chain({ data: null, error: { code: '42501', message: 'Cannot send a message: one participant has blocked the other.' } })
    );

    const { messagingService } = await import('../services/messagingService');
    const res = await messagingService.sendMessage({
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderName: 'Alice',
      recipientId: 'user-2',
      body: 'Hello'
    });

    expect(res.error).toBeTruthy();
    expect(res.status).toBe(403);
  });

  it('sendMessage(): inserts the mapped row and updates conversation last-message state on success', async () => {
    const msgBuilder = chain({
      data: {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        recipient_id: 'user-2',
        body: 'Hello',
        attachments: [],
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString()
      },
      error: null
    });
    const convUpdateBuilder = chain({ data: null, error: null });
    const participantUpdateBuilder = chain({ data: null, error: null });
    const convSelectBuilder = chain({ data: { title: 'Test Conversation' }, error: null });
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      if (table === 'direct_messages') return msgBuilder;
      if (table === 'conversations' && call === 2) return convUpdateBuilder;
      if (table === 'conversation_participants') return participantUpdateBuilder;
      return convSelectBuilder;
    });

    const { messagingService } = await import('../services/messagingService');
    const res = await messagingService.sendMessage({
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderName: 'Alice',
      recipientId: 'user-2',
      body: 'Hello'
    });

    expect(res.data!.body).toBe('Hello');
    expect(convUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_message: 'Hello', last_sender_id: 'user-1' })
    );
  });

  it('startConversation(): calls the create_conversation_with_participants RPC, not a raw two-step insert', async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'create_conversation_with_participants') {
        return Promise.resolve({
          data: {
            id: 'conv-new',
            category: 'general',
            title: 'New chat',
            context_id: null,
            context_type: null,
            last_message: null,
            last_message_at: null,
            last_sender_id: null,
            is_blocked: false,
            blocked_by_user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          error: null
        });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const { messagingService } = await import('../services/messagingService');
    const res = await messagingService.startConversation({
      category: 'general',
      title: 'New chat',
      participants: [
        { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
        { userId: 'user-2', name: 'Bob', email: 'bob@example.com' }
      ],
      senderUserId: 'user-1'
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'create_conversation_with_participants',
      expect.objectContaining({ p_participant_ids: ['user-1', 'user-2'] })
    );
    expect(res.data!.id).toBe('conv-new');
  });

  it('markAsRead(): scopes the update to unread messages for the given recipient in the given conversation', async () => {
    const msgBuilder = chain({ data: null, error: null });
    const participantBuilder = chain({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => (table === 'direct_messages' ? msgBuilder : participantBuilder));

    const { messagingService } = await import('../services/messagingService');
    await messagingService.markAsRead('conv-1', 'user-2');

    expect(msgBuilder.eq).toHaveBeenCalledWith('conversation_id', 'conv-1');
    expect(msgBuilder.eq).toHaveBeenCalledWith('recipient_id', 'user-2');
    expect(msgBuilder.eq).toHaveBeenCalledWith('is_read', false);
  });

  it('blockUser(): inserts and maps the row back to the UserBlock shape', async () => {
    const builder = chain({
      data: { id: 'block-1', blocking_user_id: 'user-1', blocked_user_id: 'user-2', reason: 'spam', created_at: new Date().toISOString() },
      error: null
    });
    mockFrom.mockReturnValue(builder);

    const { messagingService } = await import('../services/messagingService');
    const res = await messagingService.blockUser('user-1', 'user-2', 'spam');

    expect(res.data!.blockingUserId).toBe('user-1');
    expect(res.data!.blockedUserId).toBe('user-2');
    expect(res.data!.reason).toBe('spam');
  });

  it('reportConversation(): delegates to trustSafetyService.submitReport() (folded into Service 8s content_reports)', async () => {
    const { messagingService } = await import('../services/messagingService');
    const { trustSafetyService } = await import('../services/trustSafetyService');

    const res = await messagingService.reportConversation({
      conversationId: 'conv-1',
      reporterUserId: 'user-1',
      reportedUserId: 'user-2',
      reason: 'fraud_scam',
      details: 'Sending unsolicited ads.'
    });

    expect(trustSafetyService.submitReport).toHaveBeenCalledWith(
      expect.objectContaining({ reportType: 'message', targetId: 'user-2', reason: 'scam_fee_charging' })
    );
    expect(res.data!.id).toBe('report-1');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
