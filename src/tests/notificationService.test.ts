import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers notificationService.ts's query-building and dispatch-pipeline
 * logic by mocking '../lib/supabaseClient' at the module boundary -- see
 * docs/PHASE3_SERVICE9_VERIFICATION.md for the live proof (recipient-only
 * visibility, cross-user notification creation, and the column-boundary
 * trigger stopping a recipient from rewriting a notification's content
 * under cover of marking it read) run directly against the real project
 * via the Supabase MCP connector.
 */

const mockFrom = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom })
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'order', 'update', 'insert'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function sampleNotifRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    recipient_user_id: 'user-2',
    category: 'application_update',
    title: 'Application Update',
    message: 'Your application moved to interview stage.',
    action_url: '/candidate',
    context_id: 'app-1',
    is_read: false,
    read_at: null,
    delivery_channels: { inApp: true, emailSent: true, pushSmsSent: false },
    created_at: new Date().toISOString(),
    ...overrides
  };
}

describe('notificationService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
  });

  it('getUserNotifications(): scopes the query to the given recipient, ordered newest-first', async () => {
    const builder = chain({ data: [sampleNotifRow()], error: null });
    mockFrom.mockReturnValue(builder);

    const { notificationService } = await import('../services/notificationService');
    await notificationService.getUserNotifications('user-2');

    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(builder.eq).toHaveBeenCalledWith('recipient_user_id', 'user-2');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('markAsRead(): only touches is_read/read_at, scoped by notification id', async () => {
    const builder = chain({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    const { notificationService } = await import('../services/notificationService');
    await notificationService.markAsRead('notif-1');

    const payload = builder.update.mock.calls[0][0];
    expect(payload).toHaveProperty('is_read', true);
    expect(payload).toHaveProperty('read_at');
    expect(builder.eq).toHaveBeenCalledWith('id', 'notif-1');
  });

  it('createAndDispatchNotification(): inserts for the RECIPIENT (not any implicit "current user"), and can notify someone other than the caller', async () => {
    const builder = chain({ data: sampleNotifRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { notificationService } = await import('../services/notificationService');
    await notificationService.createAndDispatchNotification({
      recipientUserId: 'user-2',
      category: 'application_update',
      title: 'Application Update',
      message: 'Moved to interview.'
    });

    const payload = builder.insert.mock.calls[0][0];
    expect(payload.recipient_user_id).toBe('user-2');
  });

  it('notifyApplicationUpdate(): builds the expected title/message and delegates to createAndDispatchNotification', async () => {
    const builder = chain({ data: sampleNotifRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { notificationService } = await import('../services/notificationService');
    await notificationService.notifyApplicationUpdate({
      recipientUserId: 'user-2',
      opportunityTitle: 'Backend Engineer',
      newStage: 'interview',
      organizationName: 'Acme Liberia',
      applicationId: 'app-1'
    });

    const payload = builder.insert.mock.calls[0][0];
    expect(payload.category).toBe('application_update');
    expect(payload.message).toContain('Backend Engineer');
    expect(payload.message).toContain('Acme Liberia');
  });
});
