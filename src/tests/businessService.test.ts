import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers businessService.ts's RPC-call logic, row-mapping, and the real
 * two-step NDA workflow by mocking '../lib/supabaseClient' and
 * '../services/authService' at the module boundary -- see
 * docs/PHASE3_SERVICE5_VERIFICATION.md for the live proof (raw-table
 * confidential-row invisibility, redaction field-stripping, the
 * approved+nda_signed AND requirement, and the live-discovered/fixed
 * buyer-NDA-signing RLS bug) run directly against the real project via
 * the Supabase MCP connector.
 */

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc })
}));

vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => ({
      user: { id: 'user-1', fullName: 'Jane Seller', email: 'jane@example.com' },
      activeOrganization: null,
      isAuthenticated: true
    })),
    can: vi.fn(() => true)
  }
}));

vi.mock('../db/dbClient', () => ({
  db: {
    toggleSaveBusiness: vi.fn(),
    getSavedBusinessIds: vi.fn(() => []),
    incrementBusinessViews: vi.fn(),
    createBusinessInquiry: vi.fn(),
    getBusinessInquiries: vi.fn(() => [])
  }
}));

function chain(result: { data: unknown; error: unknown; count?: number }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'update', 'insert', 'order', 'limit'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function sampleListingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'biz-1',
    owner_user_id: 'owner-1',
    title: 'Bakery Chain',
    slug: 'bakery-chain',
    listing_type: 'business_sale',
    industry: 'Food',
    county: 'Montserrado',
    city_district: 'Sinkor',
    exact_address: null,
    asking_price_usd: 150000,
    annual_revenue_usd: null,
    annual_cash_flow_usd: null,
    is_price_negotiable: false,
    headline: 'Profitable bakery for sale',
    description: 'Full details',
    public_teaser: 'Profitable bakery for sale',
    financial_ranges: null,
    assets_included: 'Ovens\nDelivery van',
    reason_for_selling: 'Retirement',
    years_established: 8,
    employee_count: 12,
    status: 'published',
    is_confidential: true,
    is_verified: false,
    moderation_status: 'published',
    moderation_note: null,
    seller_name: null,
    seller_contact_email: null,
    seller_contact_phone: null,
    views_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

describe('businessService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('list(): calls list_business_listings_public RPC, never queries the table directly', async () => {
    mockRpc.mockResolvedValue({ data: [sampleListingRow()], error: null });

    const { businessService } = await import('../services/businessService');
    const res = await businessService.list({ county: 'Nimba' });

    expect(mockRpc).toHaveBeenCalledWith('list_business_listings_public', {
      p_county: 'Nimba',
      p_industry: null,
      p_listing_type: null
    });
    expect(mockFrom).not.toHaveBeenCalledWith('business_listings');
    expect(res.data![0].title).toBe('Bakery Chain');
  });

  it('getById(): calls get_business_listing_public RPC and maps a redacted (financials-absent) row correctly', async () => {
    mockRpc.mockResolvedValue({ data: sampleListingRow(), error: null });

    const { businessService } = await import('../services/businessService');
    const res = await businessService.getById('biz-1');

    expect(mockRpc).toHaveBeenCalledWith('get_business_listing_public', { p_listing_id: 'biz-1' });
    expect(res.data!.annualRevenueUSD).toBeUndefined();
    expect(res.data!.askingPriceUSD).toBe(150000);
  });

  it('getById(): returns null without throwing when the RPC returns null (not found or not authorized)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { businessService } = await import('../services/businessService');
    const res = await businessService.getById('biz-hidden');

    expect(res.data).toBeNull();
  });

  it('createListing(): validates a title is present before ever calling Supabase', async () => {
    const { businessService } = await import('../services/businessService');
    const res = await businessService.createListing({ title: '', industry: 'Tech' } as any);

    expect(res.error).toBeTruthy();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('createListing(): inserts a mapped row defaulting seller identity from the session user', async () => {
    const builder = chain({ data: sampleListingRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { businessService } = await import('../services/businessService');
    await businessService.createListing({
      title: 'Bakery Chain',
      industry: 'Food',
      county: 'Montserrado' as any,
      isConfidential: true
    } as any);

    const payload = builder.insert.mock.calls[0][0];
    expect(payload.owner_user_id).toBe('user-1');
    expect(payload.seller_name).toBe('Jane Seller');
    expect(payload.seller_contact_email).toBe('jane@example.com');
    expect(payload.is_confidential).toBe(true);
  });

  it('requestNdaAccess() WITH buyerData: creates a new pending request, never auto-approves', async () => {
    const builder = chain({ data: { id: 'req-1', listing_id: 'biz-1', buyer_user_id: 'user-1', buyer_full_name: 'Jane', buyer_email: 'jane@example.com', buyer_phone: null, status: 'pending', nda_signed: false, nda_signed_at: null, seller_response_notes: null, requested_at: new Date().toISOString(), responded_at: null }, error: null });
    mockFrom.mockReturnValue(builder);

    const { businessService } = await import('../services/businessService');
    const res = await businessService.requestNdaAccess('biz-1', { buyerName: 'Jane', buyerEmail: 'jane@example.com' });

    const payload = builder.insert.mock.calls[0][0];
    expect(payload.status).toBe('pending');
    expect(payload.nda_signed).toBe(false);
    expect((res.data as any).status).toBe('pending');
  });

  it('requestNdaAccess() WITHOUT buyerData: refuses to sign when no approved request exists (no silent instant-grant)', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));

    const { businessService } = await import('../services/businessService');
    const res = await businessService.requestNdaAccess('biz-1');

    expect(res.error).toBeTruthy();
    expect(res.error!.message).toMatch(/no nda request found/i);
  });

  it('requestNdaAccess() WITHOUT buyerData: refuses to sign a still-pending (not yet approved) request', async () => {
    mockFrom.mockReturnValue(
      chain({ data: { id: 'req-1', status: 'pending' }, error: null })
    );

    const { businessService } = await import('../services/businessService');
    const res = await businessService.requestNdaAccess('biz-1');

    expect(res.error).toBeTruthy();
    expect(res.status).toBe(403);
  });

  it('requestNdaAccess() WITHOUT buyerData: signs the NDA once an approved request exists', async () => {
    const fetchBuilder = chain({ data: { id: 'req-1', status: 'approved' }, error: null });
    const updateBuilder = chain({ data: null, error: null });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      return call === 1 ? fetchBuilder : updateBuilder;
    });

    const { businessService } = await import('../services/businessService');
    const res = await businessService.requestNdaAccess('biz-1');

    const payload = updateBuilder.update.mock.calls[0][0];
    expect(payload.nda_signed).toBe(true);
    expect(res.data).toBe(true);
  });
});
