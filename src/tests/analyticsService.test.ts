import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers analyticsService.ts's RPC-call logic and client-side aggregation
 * by mocking '../lib/supabaseClient' at the module boundary -- see
 * docs/PHASE3_SERVICE9_VERIFICATION.md for the live proof (non-admin
 * rejection on the platform-wide RPC, and real cross-organization
 * aggregate counts returned to a platform admin) run directly against
 * the real project via the Supabase MCP connector.
 */

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc })
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'in'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('analyticsService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('getPlatformAnalytics(): calls the get_platform_analytics RPC, never queries tables directly', async () => {
    mockRpc.mockResolvedValue({
      data: { users: { total: 42 }, organizations: { total: 5 } },
      error: null
    });

    const { analyticsService } = await import('../services/analyticsService');
    const result = await analyticsService.getPlatformAnalytics();

    expect(mockRpc).toHaveBeenCalledWith('get_platform_analytics');
    expect(mockFrom).not.toHaveBeenCalled();
    expect((result as any).users.total).toBe(42);
  });

  it('getPlatformAnalytics(): surfaces a 42501 (non-admin) as ForbiddenError', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only platform administrators may view platform-wide analytics.' } });

    const { analyticsService } = await import('../services/analyticsService');
    await expect(analyticsService.getPlatformAnalytics()).rejects.toMatchObject({ name: 'ForbiddenError' });
  });

  it('getEmployerAnalytics(): scopes the opportunities query to the given organization', async () => {
    const oppBuilder = chain({ data: [], error: null });
    const appBuilder = chain({ data: [], error: null });
    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      call++;
      return table === 'opportunities' ? oppBuilder : appBuilder;
    });

    const { analyticsService } = await import('../services/analyticsService');
    await analyticsService.getEmployerAnalytics('org-1');

    expect(oppBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1');
  });

  it('getEmployerAnalytics(): correctly tallies stage counts and rates from application rows', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'opportunities') {
        return chain({
          data: [{ id: 'opp-1', title: 'Backend Engineer', status: 'published', views_count: 100 }],
          error: null
        });
      }
      return chain({
        data: [
          { opportunity_id: 'opp-1', stage: 'shortlisted' },
          { opportunity_id: 'opp-1', stage: 'interview' },
          { opportunity_id: 'opp-1', stage: 'hired' },
          { opportunity_id: 'opp-1', stage: 'rejected' }
        ],
        error: null
      });
    });

    const { analyticsService } = await import('../services/analyticsService');
    const result = await analyticsService.getEmployerAnalytics('org-1');

    expect(result.applicationsCount).toBe(4);
    expect(result.shortlistCount).toBe(1);
    expect(result.interviewCount).toBe(1);
    expect(result.hiringOutcomes.candidatesHired).toBe(1);
    expect(result.hiringOutcomes.rejectionRate).toBe(25);
  });

  it('getBusinessMarketplaceAnalytics(): honestly reports 0 for saves/inquiries (no backing table yet), not fabricated data', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'business_listings') {
        return chain({ data: [{ id: 'biz-1', title: 'Bakery', status: 'published', views_count: 50, owner_user_id: 'user-1' }], error: null });
      }
      return chain({ data: [{ status: 'approved' }, { status: 'pending' }], error: null });
    });

    const { analyticsService } = await import('../services/analyticsService');
    const result = await analyticsService.getBusinessMarketplaceAnalytics('user-1');

    expect(result.savesCount).toBe(0);
    expect(result.buyerInquiries).toBe(0);
    expect(result.conversionMetrics.ndaRequestsTotal).toBe(2);
    expect(result.conversionMetrics.ndaApprovedCount).toBe(1);
  });
});
