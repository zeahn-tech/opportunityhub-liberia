import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers trustSafetyService.ts's RPC-call logic, row-mapping, and
 * error-translation by mocking '../lib/supabaseClient' and
 * '../services/authService' at the module boundary -- see
 * docs/PHASE3_SERVICE8_VERIFICATION.md for the live proof (the
 * server-side multi-report auto-quarantine count, atomic account
 * suspension, and non-admin rejection on every RPC) run directly against
 * the real project via the Supabase MCP connector.
 */

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc })
}));

vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => ({
      user: { id: 'user-1', fullName: 'Jane Reporter', email: 'jane@example.com' },
      activeOrganization: null,
      isAuthenticated: true
    }))
  }
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'order', 'insert'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('trustSafetyService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('submitReport(): calls the submit_content_report RPC (not a raw insert), never computing the report count client-side', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: 'report-1',
        report_type: 'listing',
        target_id: 'opp-1',
        target_title_or_name: 'Suspicious Job',
        reporter_user_id: 'user-1',
        reporter_name: 'Jane Reporter',
        reporter_email: 'jane@example.com',
        reason: 'scam_fee_charging',
        details: 'Asked for a fee',
        evidence_urls: [],
        status: 'pending',
        action_taken: null,
        admin_notes: null,
        reviewed_by_user_id: null,
        reviewed_by_name: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null
    });

    const { trustSafetyService } = await import('../services/trustSafetyService');
    const report = await trustSafetyService.submitReport({
      reportType: 'listing',
      targetId: 'opp-1',
      targetTitleOrName: 'Suspicious Job',
      reason: 'scam_fee_charging',
      details: 'Asked for a fee'
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'submit_content_report',
      expect.objectContaining({ p_target_id: 'opp-1', p_reason: 'scam_fee_charging' })
    );
    expect(mockFrom).not.toHaveBeenCalledWith('content_reports');
    expect(report.status).toBe('pending');
  });

  it('resolveReport(): surfaces a 42501 (non-admin) as ForbiddenError', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only platform administrators may resolve reports.' } });

    const { trustSafetyService } = await import('../services/trustSafetyService');
    await expect(trustSafetyService.resolveReport('report-1', 'dismissed', 'user-1')).rejects.toMatchObject({
      name: 'ForbiddenError'
    });
  });

  it('applyAccountRestriction(): calls the apply_account_restriction RPC, never updates users.account_status directly', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: 'restr-1',
        user_id: 'user-2',
        user_name: 'Target User',
        user_email: 'target@example.com',
        organization_id: null,
        restriction_type: 'full_suspension',
        reason: 'Scam pattern confirmed',
        issued_by_user_id: 'user-1',
        issued_by_name: 'Jane Reporter',
        expires_at: null,
        status: 'active',
        appeal_notes: null,
        created_at: new Date().toISOString(),
        updated_at: null
      },
      error: null
    });

    const { trustSafetyService } = await import('../services/trustSafetyService');
    const restriction = await trustSafetyService.applyAccountRestriction({
      userId: 'user-2',
      restrictionType: 'full_suspension',
      reason: 'Scam pattern confirmed'
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'apply_account_restriction',
      expect.objectContaining({ p_target_user_id: 'user-2', p_restriction_type: 'full_suspension' })
    );
    expect(mockFrom).not.toHaveBeenCalledWith('users');
    expect(restriction.status).toBe('active');
  });

  it('applyAccountRestriction(): surfaces a 42501 (non-admin) as ForbiddenError', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only platform administrators may restrict an account.' } });

    const { trustSafetyService } = await import('../services/trustSafetyService');
    await expect(
      trustSafetyService.applyAccountRestriction({ userId: 'user-2', restrictionType: 'full_suspension', reason: 'x' })
    ).rejects.toMatchObject({ name: 'ForbiddenError' });
  });

  it('isUserRestricted(): queries only the given user\'s own active restrictions (RLS narrows this further server-side)', async () => {
    const builder = chain({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const { trustSafetyService } = await import('../services/trustSafetyService');
    await trustSafetyService.isUserRestricted('user-1', 'posting');

    expect(mockFrom).toHaveBeenCalledWith('account_restrictions');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('isUserRestricted(): a full_suspension restriction blocks every action type', async () => {
    mockFrom.mockReturnValue(chain({ data: [{ restriction_type: 'full_suspension', reason: 'Fraud' }], error: null }));

    const { trustSafetyService } = await import('../services/trustSafetyService');
    const res = await trustSafetyService.isUserRestricted('user-1', 'messaging');

    expect(res.isRestricted).toBe(true);
    expect(res.reason).toMatch(/Account suspended/);
  });

  it('scanContentForScams(): flags a known scam phrase and recommends quarantine for high-severity hits', async () => {
    const { TrustSafetyService } = await import('../services/trustSafetyService');
    const svc = new TrustSafetyService();

    const result = svc.scanContentForScams('Easy job', 'Please pay a registration fee upfront to secure this role.');

    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.recommendedStatus).toBe('quarantined');
  });
});
