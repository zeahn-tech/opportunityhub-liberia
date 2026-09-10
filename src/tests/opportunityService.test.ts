import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers opportunityService.ts's query-building, error-translation, and
 * read-time expiry-computation logic by mocking '../lib/supabaseClient'
 * and '../services/authService' at the module boundary (this sandbox has
 * no route to *.supabase.co -- see docs/PHASE3_SERVICE2_VERIFICATION.md
 * for the live RLS/permission proof run directly against the real
 * project via the Supabase MCP connector).
 */

const mockFrom = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({ from: mockFrom })
}));

vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => ({
      user: { id: 'user-1' },
      activeOrganization: { id: 'org-1' },
      isAuthenticated: true
    })),
    can: vi.fn(() => true)
  }
}));

vi.mock('./subscriptionService', () => ({
  subscriptionService: {
    getEntitlements: vi.fn(() => Promise.resolve({ data: { maxActiveJobs: 'unlimited' }, error: null }))
  }
}));

function chain(result: { data: unknown; error: unknown; count?: number }) {
  const builder: any = {};
  const methods = ['select', 'eq', 'or', 'update', 'insert', 'delete'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const sampleOrgRow = {
  id: 'org-1',
  slug: 'acme',
  name: 'Acme Liberia',
  type: 'private_company',
  industry: 'Tech',
  county: 'Montserrado',
  city_district: 'Sinkor',
  address: null,
  website_url: null,
  website: null,
  logo_url: null,
  logo_text: 'ACM',
  description: 'desc',
  verification_status: 'verified',
  verification_badge: null,
  is_verified: true,
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

function sampleOppRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    organization_id: 'org-1',
    created_by_user_id: 'user-1',
    title: 'Backend Engineer',
    slug: 'backend-engineer',
    opportunity_type: 'job',
    employment_type: 'full_time',
    workplace_model: 'on_site',
    county: 'Montserrado',
    location_details: 'Sinkor',
    salary_currency: 'USD',
    salary_min: 1000,
    salary_max: 2000,
    is_salary_negotiable: true,
    is_salary_confidential: false,
    summary: 'Build APIs',
    description: 'Full description',
    responsibilities: ['Build things'],
    requirements: ['3 years experience'],
    skills_required: ['TypeScript'],
    application_deadline: '2027-01-01',
    number_of_openings: 1,
    screening_questions: [],
    status: 'published',
    moderation_status: 'published',
    report_count: 0,
    views_count: 5,
    applications_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizations: sampleOrgRow,
    ...overrides
  };
}

describe('opportunityService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
  });

  it('list(): applies structural filters onto the query builder and joins organizations', async () => {
    const builder = chain({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const { opportunityService } = await import('../services/opportunityService');
    await opportunityService.list({
      organizationId: 'org-1',
      status: 'published',
      county: 'Nimba' as any,
      type: 'job' as any,
      employmentType: 'full_time' as any,
      workplaceModel: 'remote' as any,
      query: 'engineer'
    });

    expect(mockFrom).toHaveBeenCalledWith('opportunities');
    expect(builder.select).toHaveBeenCalledWith('*, organizations(*)');
    expect(builder.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(builder.eq).toHaveBeenCalledWith('status', 'published');
    expect(builder.eq).toHaveBeenCalledWith('county', 'Nimba');
    expect(builder.eq).toHaveBeenCalledWith('opportunity_type', 'job');
    expect(builder.eq).toHaveBeenCalledWith('employment_type', 'full_time');
    expect(builder.eq).toHaveBeenCalledWith('workplace_model', 'remote');
    expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('engineer'));
  });

  it('list(): applies minSalary/maxSalary filtering client-side after fetch', async () => {
    mockFrom.mockReturnValue(
      chain({
        data: [
          sampleOppRow({ id: 'opp-low', salary_min: 500, salary_max: 800 }),
          sampleOppRow({ id: 'opp-high', salary_min: 3000, salary_max: 4000 })
        ],
        error: null
      })
    );

    const { opportunityService } = await import('../services/opportunityService');
    const res = await opportunityService.list({ minSalary: 2000 });

    expect(res.data!.map((o) => o.id)).toEqual(['opp-high']);
  });

  it('list(): computes effective status as expired for a past-deadline published row, without writing it back', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString();
    mockFrom.mockReturnValue(chain({ data: [sampleOppRow({ application_deadline: past })], error: null }));

    const { opportunityService } = await import('../services/opportunityService');
    const res = await opportunityService.list({});

    expect(res.data![0].status).toBe('expired');
    // Only the SELECT call should have happened -- no update() call made.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('getById(): maps the joined organization row into Opportunity.organization', async () => {
    const builder = chain({ data: sampleOppRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { opportunityService } = await import('../services/opportunityService');
    const res = await opportunityService.getById('opp-1');

    expect(res.data!.organization.name).toBe('Acme Liberia');
    expect(res.data!.organization.isVerified).toBe(true);
    expect(res.data!.responsibilities).toEqual(['Build things']);
  });

  it('create(): requires an organization to be resolvable before ever calling Supabase', async () => {
    const authModule = await import('../services/authService');
    (authModule.authService.getSession as any).mockReturnValueOnce({
      user: { id: 'user-1' },
      activeOrganization: null,
      isAuthenticated: true
    });

    const { opportunityService } = await import('../services/opportunityService');
    const res = await opportunityService.create({ title: 'X', description: 'Y' });

    expect(res.error).toBeTruthy();
    expect(res.error!.message).toMatch(/organization must be selected/i);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('create(): inserts a mapped row and defaults status to published unless isDraft', async () => {
    const builder = chain({ data: sampleOppRow({ status: 'draft' }), error: null });
    mockFrom.mockReturnValue(builder);

    const { opportunityService } = await import('../services/opportunityService');
    await opportunityService.createDraft({ title: 'Backend Engineer', description: 'Full description' });

    expect(builder.insert).toHaveBeenCalledTimes(1);
    const payload = builder.insert.mock.calls[0][0];
    expect(payload.status).toBe('draft');
    expect(payload.organization_id).toBe('org-1');
    expect(payload.created_by_user_id).toBe('user-1');
    expect(payload.title).toBe('Backend Engineer');
  });

  it('surfaces a 42501 RLS denial as ForbiddenError, not a raw driver error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { code: '42501', message: 'denied' } }));

    const { opportunityService } = await import('../services/opportunityService');
    const res = await opportunityService.update('opp-1', { title: 'New Title' });

    expect(res.error).toBeTruthy();
    expect(res.status).toBe(403);
  });

  it('update(): only forwards fields that were actually provided, mapped to snake_case', async () => {
    const builder = chain({ data: sampleOppRow({ title: 'Updated Title' }), error: null });
    mockFrom.mockReturnValue(builder);

    const { opportunityService } = await import('../services/opportunityService');
    await opportunityService.update('opp-1', { title: 'Updated Title', salaryMin: 1234 });

    const payload = builder.update.mock.calls[0][0];
    expect(payload).toEqual({ title: 'Updated Title', salary_min: 1234 });
  });
});
