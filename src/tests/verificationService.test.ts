import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers verificationService.ts's query-building, RPC-call, and
 * error-translation logic by mocking '../lib/supabaseClient' and
 * '../services/authService' at the module boundary -- see
 * docs/PHASE3_SERVICE7_VERIFICATION.md for the live proof (platform-admin
 * review-queue visibility, self-approval rejection, and the atomic
 * organization-badge update on approval) run directly against the real
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
      user: { id: 'user-1', fullName: 'Org Admin' },
      activeOrganization: { id: 'org-1' },
      isAuthenticated: true
    })),
    can: vi.fn(() => true)
  }
}));

function chain(result: { data: unknown; error: unknown }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'insert'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function sampleAuditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-1',
    organization_id: 'org-1',
    requested_by_user_id: 'user-1',
    status: 'pending',
    requested_badge: 'verified_business',
    documents_submitted: ['registration.pdf'],
    reviewer_user_id: null,
    reviewer_notes: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
    organizations: { name: 'Acme Liberia', type: 'private_company', county: 'Montserrado', registration_number: 'LBR-2024-1', tax_id_number: 'TIN-1' },
    ...overrides
  };
}

describe('verificationService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('submit(): requires an organization to be resolvable before ever calling Supabase', async () => {
    const authModule = await import('../services/authService');
    (authModule.authService.getSession as any).mockReturnValueOnce({
      user: { id: 'user-1' },
      activeOrganization: null,
      isAuthenticated: true
    });

    const { verificationService } = await import('../services/verificationService');
    const res = await verificationService.submit({ badgeRequested: 'verified_business', documents: [] } as any);

    expect(res.error).toBeTruthy();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('submit(): defaults organizationId to the caller\'s active organization when not explicitly provided', async () => {
    const builder = chain({ data: sampleAuditRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { verificationService } = await import('../services/verificationService');
    await verificationService.submit({ badgeRequested: 'verified_business', documents: ['reg.pdf'] } as any);

    const payload = builder.insert.mock.calls[0][0];
    expect(payload.organization_id).toBe('org-1');
    expect(payload.status).toBe('pending');
  });

  it('list(): maps joined organization fields into the flat VerificationAudit shape', async () => {
    mockFrom.mockReturnValue(chain({ data: [sampleAuditRow()], error: null }));

    const { verificationService } = await import('../services/verificationService');
    const res = await verificationService.list();

    expect(res.data![0].organizationName).toBe('Acme Liberia');
    expect(res.data![0].registryNumber).toBe('LBR-2024-1');
  });

  it('decide(): checks authService.can() as fast-fail UX before ever calling the RPC', async () => {
    const authModule = await import('../services/authService');
    (authModule.authService.can as any).mockReturnValueOnce(false);

    const { verificationService } = await import('../services/verificationService');
    const res = await verificationService.decide('audit-1', 'approved');

    expect(res.error).toBeTruthy();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('decide(): calls decide_verification_audit RPC, then re-fetches the joined row', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'audit-1' }, error: null });
    mockFrom.mockReturnValue(chain({ data: sampleAuditRow({ status: 'approved' }), error: null }));

    const { verificationService } = await import('../services/verificationService');
    const res = await verificationService.decide('audit-1', 'approved', 'Looks good');

    expect(mockRpc).toHaveBeenCalledWith('decide_verification_audit', {
      p_audit_id: 'audit-1',
      p_decision: 'approved',
      p_reviewer_notes: 'Looks good'
    });
    expect(res.data!.status).toBe('approved');
  });

  it('surfaces a 42501 (non-platform-admin decision attempt) as ForbiddenError', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only platform administrators may decide verification audits.' } });

    const { verificationService } = await import('../services/verificationService');
    const res = await verificationService.decide('audit-1', 'approved');

    expect(res.error).toBeTruthy();
    expect(res.status).toBe(403);
  });
});
