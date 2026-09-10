import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers applicationService.ts's query-building, error-translation, and
 * history-assembly logic by mocking '../lib/supabaseClient' and
 * '../services/authService' at the module boundary -- see
 * docs/PHASE3_SERVICE3_VERIFICATION.md for the live RLS/trigger proof run
 * directly against the real project via the Supabase MCP connector.
 */

const mockFrom = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom })
}));

vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => ({
      user: { id: 'user-1', fullName: 'Test User' },
      activeOrganization: { id: 'org-1' },
      isAuthenticated: true
    })),
    can: vi.fn(() => true)
  }
}));

vi.mock('../services/notificationService', () => ({
  notificationService: {
    createAndDispatchNotification: vi.fn(),
    notifyApplicationUpdate: vi.fn(),
    notifyInterviewInvitation: vi.fn()
  }
}));

vi.mock('../db/dbClient', () => ({
  db: {
    getOrganizationById: vi.fn(() => ({ name: 'Test Org' })),
    getMembershipsByOrganization: vi.fn(() => [])
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

function sampleAppRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    opportunity_id: 'opp-1',
    applicant_user_id: 'user-1',
    organization_id: 'org-1',
    applicant_full_name: 'Jane Doe',
    applicant_email: 'jane@example.com',
    applicant_phone: null,
    applicant_county: 'Montserrado',
    cover_letter: 'I am interested',
    cv_url: null,
    screening_answers: null,
    stage: 'applied',
    evaluation_notes: null,
    internal_rating: null,
    status: 'active',
    applied_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    match_score: null,
    match_notes: null,
    rejection_reason: null,
    withdrawal_reason: null,
    withdrawn_at: null,
    interview_details: null,
    hiring_offer_details: null,
    history: [{ id: 'hist-1', stage: 'applied', changedAt: new Date().toISOString() }],
    resume_file_name: null,
    resume_data_url: null,
    resume_url: null,
    evaluation_strengths: null,
    evaluation_improvements: null,
    internal_notes: null,
    opportunities: { title: 'Backend Engineer' },
    organizations: { name: 'Acme Liberia' },
    ...overrides
  };
}

describe('applicationService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
  });

  it('submit(): validates required fields before ever calling Supabase', async () => {
    const { applicationService } = await import('../services/applicationService');
    const res = await applicationService.submit({
      opportunityId: 'opp-1',
      opportunityTitle: 'Backend Engineer',
      organizationName: 'Acme Liberia',
      applicantName: '',
      applicantEmail: 'not-an-email'
    } as any);

    expect(res.error).toBeTruthy();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('submit(): looks up the opportunity, inserts with an initial history entry, and maps the joined row back', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'opportunities') {
        return chain({ data: { id: 'opp-1', organization_id: 'org-1' }, error: null });
      }
      return chain({ data: sampleAppRow(), error: null });
    });

    const { applicationService } = await import('../services/applicationService');
    const res = await applicationService.submit({
      opportunityId: 'opp-1',
      opportunityTitle: 'Backend Engineer',
      organizationName: 'Acme Liberia',
      applicantName: 'Jane Doe',
      applicantEmail: 'jane@example.com'
    } as any);

    expect(res.data).toBeDefined();
    expect(res.data!.stage).toBe('applied');
    expect(res.data!.history).toHaveLength(1);
    expect(res.data!.organizationName).toBe('Acme Liberia');
  });

  it('withdraw(): is a no-op returning the row unchanged if already withdrawn, without issuing an UPDATE', async () => {
    const builder = chain({ data: sampleAppRow({ stage: 'withdrawn' }), error: null });
    mockFrom.mockReturnValue(builder);

    const { applicationService } = await import('../services/applicationService');
    await applicationService.withdraw('app-1', 'changed my mind');

    expect(builder.update).not.toHaveBeenCalled();
  });

  it('withdraw(): appends a withdrawn history entry and sets withdrawal fields', async () => {
    const fetchBuilder = chain({ data: sampleAppRow(), error: null });
    const updateBuilder = chain({ data: sampleAppRow({ stage: 'withdrawn' }), error: null });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? fetchBuilder : updateBuilder;
    });

    const { applicationService } = await import('../services/applicationService');
    await applicationService.withdraw('app-1', 'Accepted another offer');

    const payload = updateBuilder.update.mock.calls[0][0];
    expect(payload.stage).toBe('withdrawn');
    expect(payload.status).toBe('withdrawn');
    expect(payload.withdrawal_reason).toBe('Accepted another offer');
    expect(payload.history).toHaveLength(2);
    expect(payload.history[1].stage).toBe('withdrawn');
  });

  it('updateStage(): checks authService.can() as fast-fail UX before ever calling Supabase', async () => {
    const fetchBuilder = chain({ data: sampleAppRow(), error: null });
    mockFrom.mockReturnValue(fetchBuilder);

    const authModule = await import('../services/authService');
    (authModule.authService.can as any).mockReturnValueOnce(false);

    const { applicationService } = await import('../services/applicationService');
    const res = await applicationService.updateStage('app-1', 'shortlisted');

    expect(res.error).toBeTruthy();
    expect(res.status).toBe(403);
  });

  it('surfaces a 42501 RLS/trigger denial as ForbiddenError', async () => {
    const fetchBuilder = chain({ data: sampleAppRow(), error: null });
    const updateBuilder = chain({ data: null, error: { code: '42501', message: 'denied' } });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? fetchBuilder : updateBuilder;
    });

    const { applicationService } = await import('../services/applicationService');
    const res = await applicationService.updateStage('app-1', 'hired');

    expect(res.error).toBeTruthy();
    expect(res.status).toBe(403);
  });

  it('updateEvaluation(): only forwards fields that were actually provided, mapped to snake_case', async () => {
    const fetchBuilder = chain({ data: sampleAppRow(), error: null });
    const updateBuilder = chain({ data: sampleAppRow({ internal_rating: 5 }), error: null });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? fetchBuilder : updateBuilder;
    });

    const { applicationService } = await import('../services/applicationService');
    await applicationService.updateEvaluation('app-1', { rating: 5, strengths: ['Great communicator'] });

    const payload = updateBuilder.update.mock.calls[0][0];
    expect(payload).toEqual({ internal_rating: 5, evaluation_strengths: ['Great communicator'] });
  });

  it('rowToApplication: reconstructs evaluations only when at least one evaluation field is set', async () => {
    mockFrom.mockReturnValue(chain({ data: sampleAppRow(), error: null }));

    const { applicationService } = await import('../services/applicationService');
    const res = await applicationService.getById('app-1');

    expect(res.data!.evaluations).toBeUndefined();
  });
});
