import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers organizationService.ts's query-building and error-translation
 * logic by mocking '../lib/supabaseClient' at the module boundary (this
 * sandbox has no route to *.supabase.co -- see
 * docs/PHASE3_SERVICE1_VERIFICATION.md for the live RLS/RPC/trigger proof
 * that was instead run directly against the real project via the Supabase
 * MCP connector, which IS reachable from here).
 *
 * What these tests prove about the code, independent of that network gap:
 *   - createOrganization() calls the create_organization_with_owner RPC
 *     (not a raw two-step insert that would trip the RLS chicken-and-egg
 *     gap the migration's header comment describes).
 *   - A 42501 (RLS denial) from Postgres is surfaced as ForbiddenError,
 *     not a raw/opaque driver error.
 *   - A 23514 (the owner-invariant trigger firing) from
 *     suspendMember/updateMemberRoleAndPermissions/removeMember is
 *     surfaced as ValidationError with the trigger's own message intact.
 *   - updateOrganizationProfile() never sends verificationStatus,
 *     verificationBadge, or isVerified in its update payload, even if the
 *     caller passes them in -- the defense-in-depth strip described in the
 *     service's own doc comment.
 *   - getOrganizations() builds the expected filter/search query shape.
 */

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc })
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'in', 'or', 'update', 'insert', 'delete'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Some call paths (getOrganizations/getOrganizationMembers) await the
  // builder itself rather than calling .maybeSingle() -- make it thenable.
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('organizationService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('createOrganization(): calls the create_organization_with_owner RPC, not a raw insert', async () => {
    const newOrgRow = {
      id: 'org-123',
      slug: 'acme-liberia',
      name: 'Acme Liberia',
      type: 'private_company',
      industry: 'Logistics',
      county: 'Montserrado',
      city_district: 'Sinkor',
      address: null,
      website_url: null,
      website: null,
      logo_url: null,
      logo_text: 'ACM',
      cover_image_url: null,
      description: 'Test org',
      verification_status: 'unverified',
      verification_badge: null,
      is_verified: false,
      registration_number: null,
      tax_id_number: null,
      established_year: null,
      employee_count_range: null,
      contact_email: null,
      contact_phone: null,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockRpc.mockResolvedValue({ data: newOrgRow, error: null });

    const { organizationService } = await import('../services/organizationService');
    const org = await organizationService.createOrganization({
      name: 'Acme Liberia',
      type: 'private_company' as any,
      industry: 'Logistics',
      county: 'Montserrado' as any,
      cityDistrict: 'Sinkor',
      description: 'Test org'
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'create_organization_with_owner',
      expect.objectContaining({ p_name: 'Acme Liberia', p_type: 'private_company' })
    );
    expect(mockFrom).not.toHaveBeenCalledWith('organization_memberships');
    expect(org.id).toBe('org-123');
    expect(org.slug).toBe('acme-liberia');
  });

  it('createOrganization(): validates required fields before ever calling Supabase', async () => {
    const { organizationService } = await import('../services/organizationService');
    await expect(
      organizationService.createOrganization({
        name: '',
        type: 'private_company' as any,
        industry: 'Logistics',
        county: 'Montserrado' as any,
        cityDistrict: 'Sinkor',
        description: 'Test org'
      })
    ).rejects.toThrow(/name is required/i);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('surfaces a 42501 RLS denial as ForbiddenError, not a raw driver error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }));

    const { organizationService } = await import('../services/organizationService');
    await expect(organizationService.suspendMember('mem-1')).rejects.toMatchObject({
      name: 'ForbiddenError'
    });
  });

  it('surfaces a 23514 owner-invariant trigger violation as ValidationError with the trigger message intact', async () => {
    mockFrom.mockReturnValue(
      chain({ data: null, error: { code: '23514', message: 'Cannot remove or demote the sole owner of an organization.' } })
    );

    const { organizationService } = await import('../services/organizationService');
    await expect(organizationService.removeMember('mem-owner')).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Cannot remove or demote the sole owner of an organization.'
    });
  });

  it('updateOrganizationProfile(): never forwards verificationStatus/verificationBadge/isVerified even if passed in', async () => {
    const builder = chain({
      data: {
        id: 'org-1',
        slug: 'x',
        name: 'Updated Name',
        type: 'private_company',
        industry: 'Tech',
        county: 'Montserrado',
        city_district: 'Sinkor',
        address: null,
        website_url: null,
        website: null,
        logo_url: null,
        logo_text: 'UPD',
        cover_image_url: null,
        description: 'desc',
        verification_status: 'unverified',
        verification_badge: null,
        is_verified: false,
        registration_number: null,
        tax_id_number: null,
        established_year: null,
        employee_count_range: null,
        contact_email: null,
        contact_phone: null,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null
    });
    mockFrom.mockReturnValue(builder);

    const { organizationService } = await import('../services/organizationService');
    await organizationService.updateOrganizationProfile('org-1', {
      name: 'Updated Name',
      verificationStatus: 'verified',
      verificationBadge: 'gold' as any,
      isVerified: true
    } as any);

    expect(builder.update).toHaveBeenCalledTimes(1);
    const payload = builder.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('verification_status');
    expect(payload).not.toHaveProperty('verification_badge');
    expect(payload).not.toHaveProperty('is_verified');
    expect(payload).toEqual({ name: 'Updated Name' });
  });

  it('getOrganizations(): applies type/county/isVerified/query filters onto the query builder', async () => {
    const builder = chain({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const { organizationService } = await import('../services/organizationService');
    await organizationService.getOrganizations({
      type: 'ngo' as any,
      county: 'Nimba' as any,
      isVerified: true,
      query: 'health'
    });

    expect(mockFrom).toHaveBeenCalledWith('organizations');
    expect(builder.eq).toHaveBeenCalledWith('type', 'ngo');
    expect(builder.eq).toHaveBeenCalledWith('county', 'Nimba');
    expect(builder.eq).toHaveBeenCalledWith('is_verified', true);
    expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('health'));
  });

  it('getMembershipsByUserId(): filters to the given user and active status only (RLS narrows this further server-side)', async () => {
    const builder = chain({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const { organizationService } = await import('../services/organizationService');
    await organizationService.getMembershipsByUserId('user-1');

    expect(mockFrom).toHaveBeenCalledWith('organization_memberships');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
  });
});
