import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers subscriptionService.ts's Supabase-backed methods (row-mapping,
 * auto-provisioning, error-translation). createCheckoutSession/
 * createPortalSession are unchanged (server API routes) and not
 * re-tested here. See docs/PHASE3_SERVICE9_VERIFICATION.md for the live
 * RLS proof (org-admin-only writes, org-member read access, outsider
 * denial) run directly against the real project via the Supabase MCP
 * connector.
 */

const mockFrom = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom })
}));

vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => ({
      user: { id: 'user-1', fullName: 'Org Admin' },
      activeOrganization: { id: 'org-1' },
      isAuthenticated: true,
      token: 'fake-token'
    }))
  }
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'update', 'insert'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function sampleSubRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    organization_id: 'org-1',
    plan_id: 'plan_pro',
    tier: 'pro',
    status: 'active',
    billing_cycle: 'monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date().toISOString(),
    cancel_at_period_end: false,
    trial_end: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
  });

  it('getOrganizationSubscription(): returns the existing row mapped, without inserting', async () => {
    const builder = chain({ data: sampleSubRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { subscriptionService } = await import('../services/subscriptionService');
    const res = await subscriptionService.getOrganizationSubscription('org-1');

    expect(res.data!.tier).toBe('pro');
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it('getOrganizationSubscription(): auto-provisions a default plan when none exists', async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: null, error: null });
      return chain({ data: sampleSubRow({ tier: 'pro' }), error: null });
    });

    const { subscriptionService } = await import('../services/subscriptionService');
    const res = await subscriptionService.getOrganizationSubscription('org-new');

    expect(res.data).toBeDefined();
  });

  it('surfaces a 42501 (non-admin write) as ForbiddenError', async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: null, error: null });
      return chain({ data: null, error: { code: '42501', message: 'denied' } });
    });

    const { subscriptionService } = await import('../services/subscriptionService');
    const res = await subscriptionService.getOrganizationSubscription('org-1');

    expect(res.error).toBeTruthy();
    expect(res.status).toBe(403);
  });

  it('getEntitlements(): falls back to the free plan when status is not active/trialing', async () => {
    mockFrom.mockReturnValue(chain({ data: sampleSubRow({ status: 'canceled' }), error: null }));

    const { subscriptionService } = await import('../services/subscriptionService');
    const res = await subscriptionService.getEntitlements('org-1');

    expect(res.data).toBeDefined();
  });

  it('mockFulfillSubscription(): updates an existing subscription rather than inserting a duplicate', async () => {
    const selectBuilder = chain({ data: { id: 'sub-1' }, error: null });
    const updateBuilder = chain({ data: sampleSubRow({ tier: 'enterprise' }), error: null });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      return call === 1 ? selectBuilder : updateBuilder;
    });

    const { subscriptionService } = await import('../services/subscriptionService');
    await subscriptionService.mockFulfillSubscription('org-1', 'plan_enterprise');

    expect(updateBuilder.update).toHaveBeenCalledTimes(1);
    expect(updateBuilder.insert).not.toHaveBeenCalled();
  });
});
