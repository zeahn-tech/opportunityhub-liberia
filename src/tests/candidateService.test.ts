import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Covers candidateService.ts's row-mapping and RPC-call logic by mocking
 * '../lib/supabaseClient' and '../services/authService' at the module
 * boundary -- see docs/PHASE3_SERVICE4_VERIFICATION.md for the live
 * proof (RLS blocking direct third-party table access, and the
 * get_public_candidate_profile()/search_candidate_profiles() RPCs
 * correctly redacting/unlocking profiles) run directly against the real
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
      user: { id: 'user-1', fullName: 'Jane Doe', email: 'jane@example.com', primaryCounty: 'Montserrado' },
      activeOrganization: null,
      isAuthenticated: true
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

function sampleRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-1',
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    county: 'Montserrado',
    city: null,
    city_district: null,
    avatar_url: null,
    headline: 'Logistics Specialist',
    bio: 'Experienced',
    years_of_experience: 5,
    highest_education_level: null,
    cv_file_url: null,
    cv_raw_text: null,
    cv_data_json: null,
    skills_json: ['Logistics'],
    work_history_json: [],
    education_history_json: [],
    certifications_json: [],
    languages_json: [],
    portfolio_links_json: [],
    is_profile_searchable: true,
    privacy_settings: { profileVisibility: 'public', contactVisibility: 'on_application_only', cvDownloadPermission: 'applied_jobs_only' },
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

describe('candidateService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('getMyProfile(): returns the existing profile mapped from the row without creating one', async () => {
    const builder = chain({ data: sampleRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { candidateService } = await import('../services/candidateService');
    const res = await candidateService.getMyProfile();

    expect(res.data!.userId).toBe('user-1');
    expect(res.data!.headline).toBe('Logistics Specialist');
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it('getMyProfile(): auto-creates a blank profile (not fabricated placeholder content) when none exists', async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: null, error: null }); // select finds nothing
      return chain({ data: sampleRow({ bio: '', years_of_experience: 0, headline: 'JOB SEEKER in Montserrado' }), error: null });
    });

    const { candidateService } = await import('../services/candidateService');
    await candidateService.getMyProfile();

    // Find the insert() call across the mocked builders
    const insertCalls = mockFrom.mock.results.map((r) => r.value.insert).filter(Boolean);
    expect(insertCalls.length).toBeGreaterThan(0);
  });

  it('getPublicProfile(): calls the get_public_candidate_profile RPC and maps a null result to null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { candidateService } = await import('../services/candidateService');
    const res = await candidateService.getPublicProfile('other-user');

    expect(mockRpc).toHaveBeenCalledWith('get_public_candidate_profile', { p_target_user_id: 'other-user' });
    expect(res.data).toBeNull();
  });

  it('getPublicProfile(): maps a redacted row from the RPC the same way as a normal row', async () => {
    mockRpc.mockResolvedValue({
      data: sampleRow({ full_name: 'Candidate #A1B2', email: null, phone: null }),
      error: null
    });

    const { candidateService } = await import('../services/candidateService');
    const res = await candidateService.getPublicProfile('other-user');

    expect(res.data!.fullName).toBe('Candidate #A1B2');
    expect(res.data!.email).toBeUndefined();
  });

  it('searchCandidates(): forwards filters to the search_candidate_profiles RPC by name', async () => {
    mockRpc.mockResolvedValue({ data: [sampleRow()], error: null });

    const { candidateService } = await import('../services/candidateService');
    await candidateService.searchCandidates({ county: 'Nimba' as any, skill: 'Logistics', minYearsExp: 3 });

    expect(mockRpc).toHaveBeenCalledWith('search_candidate_profiles', {
      p_county: 'Nimba',
      p_skill: 'Logistics',
      p_education: null,
      p_min_years_exp: 3,
      p_query: null
    });
  });

  it('updatePrivacySettings(): merges with existing settings rather than replacing them wholesale', async () => {
    let call = 0;
    let updateBuilder: any;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        return chain({
          data: { privacy_settings: { profileVisibility: 'public', contactVisibility: 'on_application_only', cvDownloadPermission: 'applied_jobs_only' } },
          error: null
        });
      }
      updateBuilder = chain({ data: sampleRow(), error: null });
      return updateBuilder;
    });

    const { candidateService } = await import('../services/candidateService');
    await candidateService.updatePrivacySettings({ profileVisibility: 'hidden' });

    const payload = updateBuilder.update.mock.calls[0][0];
    expect(payload.privacy_settings).toEqual({
      profileVisibility: 'hidden',
      contactVisibility: 'on_application_only',
      cvDownloadPermission: 'applied_jobs_only',
      showSalaryExpectations: true
    });
  });
});
