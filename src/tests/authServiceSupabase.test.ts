import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/dbClient';

/**
 * Covers the real Supabase-backed authService flows that
 * src/tests/auth.test.ts never exercised (it only tests db.* / crypto.*
 * directly). These tests mock '../lib/supabaseClient' at the module
 * boundary so they can run without live network access to *.supabase.co
 * (this environment's sandbox cannot reach that host -- see
 * docs/PRODUCTION_CERTIFICATION_REPORT.md's Authentication Status section
 * for what WAS verified live, via the Supabase MCP connector against the
 * real project, and what remains to be verified with real network access).
 *
 * What these tests prove about the code, independent of that network gap:
 *   - register()/login() call supabase.auth.* exclusively when Supabase is
 *     configured, and never fall back to db.registerUser/db.authenticateUser
 *     (the local SHA-256 password path) on a Supabase error.
 *   - A Supabase error is surfaced to the caller as a real thrown error,
 *     not swallowed into a silently-created local session.
 *   - The resulting session's token is the real Supabase access_token, not
 *     a locally-generated one.
 *   - Demo mode is reachable ONLY when Supabase is not configured AND
 *     VITE_ENABLE_DEMO_MODE is explicitly true, and produces a session
 *     flagged isDemoMode: true.
 */

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
const mockFrom = vi.fn();

let mockClient: any = null;

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: () => mockClient
}));

function buildMockSupabaseClient() {
  return {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange
    },
    from: mockFrom
  };
}

function mockUsersTableSelect(row: any) {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: row, error: null })
      })
    })
  });
}

describe('authService -- Supabase-backed flows (mocked Supabase, no local fallback)', () => {
  beforeEach(async () => {
    vi.resetModules();
    db.reset();
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset();
    mockGetSession.mockReset();
    mockFrom.mockReset();
    mockClient = null;
  });

  it('register(): calls supabase.auth.signUp and returns a session using the real access_token, never db.registerUser', async () => {
    mockClient = buildMockSupabaseClient();
    const supabaseUserId = 'a1b2c3d4-0000-4000-8000-000000000001';
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: supabaseUserId, email: 'newuser@opportunityhub.lr', user_metadata: { fullName: 'New User', primaryRole: 'job_seeker' } },
        session: { access_token: 'real-supabase-access-token-abc', expires_at: Date.now() / 1000 + 3600 }
      },
      error: null
    });
    mockUsersTableSelect({
      id: supabaseUserId,
      email: 'newuser@opportunityhub.lr',
      full_name: 'New User',
      phone_number: null,
      primary_role: 'job_seeker',
      system_role: 'user',
      account_status: 'pending_verification',
      primary_county: 'Montserrado',
      is_email_verified: false,
      is_phone_verified: false,
      created_at: new Date().toISOString()
    });

    const dbRegisterSpy = vi.spyOn(db, 'registerUser');

    const { authService } = await import('../services/authService');
    const session = await authService.register({
      email: 'newuser@opportunityhub.lr',
      password: 'StrongPassword2026!',
      fullName: 'New User',
      primaryRole: 'job_seeker'
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'newuser@opportunityhub.lr', password: 'StrongPassword2026!' })
    );
    expect(dbRegisterSpy).not.toHaveBeenCalled();
    expect(session.token).toBe('real-supabase-access-token-abc');
    expect(session.isAuthenticated).toBe(true);
    expect(session.isDemoMode).toBe(false);
    expect(session.user?.id).toBe(supabaseUserId);
    expect(session.user?.email).toBe('newuser@opportunityhub.lr');
  });

  it('login(): on Supabase error, throws and never falls back to db.authenticateUser', async () => {
    mockClient = buildMockSupabaseClient();
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    const dbAuthSpy = vi.spyOn(db, 'authenticateUser');

    const { authService } = await import('../services/authService');
    await expect(authService.login('someone@opportunityhub.lr', 'WrongPassword1!')).rejects.toThrow(
      'Invalid login credentials'
    );
    expect(dbAuthSpy).not.toHaveBeenCalled();
  });

  it('login(): on Supabase network/unreachable error, surfaces the real error rather than creating a local session', async () => {
    mockClient = buildMockSupabaseClient();
    mockSignInWithPassword.mockRejectedValue(new Error('fetch failed: network unreachable'));

    const dbAuthSpy = vi.spyOn(db, 'authenticateUser');

    const { authService } = await import('../services/authService');
    await expect(authService.login('someone@opportunityhub.lr', 'StrongPassword2026!')).rejects.toThrow();
    expect(dbAuthSpy).not.toHaveBeenCalled();
  });

  it('login(): success returns the real Supabase access_token as the session token', async () => {
    mockClient = buildMockSupabaseClient();
    const supabaseUserId = 'a1b2c3d4-0000-4000-8000-000000000002';
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: supabaseUserId, email: 'existing@opportunityhub.lr', user_metadata: {} },
        session: { access_token: 'real-supabase-access-token-xyz' }
      },
      error: null
    });
    mockUsersTableSelect({
      id: supabaseUserId,
      email: 'existing@opportunityhub.lr',
      full_name: 'Existing User',
      primary_role: 'employer',
      system_role: 'user',
      account_status: 'active',
      primary_county: 'Bong',
      is_email_verified: true,
      is_phone_verified: false,
      created_at: new Date().toISOString()
    });

    const { authService } = await import('../services/authService');
    const session = await authService.login('existing@opportunityhub.lr', 'StrongPassword2026!');

    expect(session.token).toBe('real-supabase-access-token-xyz');
    expect(session.user?.accountStatus).toBe('active');
    expect(session.user?.primaryCounty).toBe('Bong');
  });

  it('logout(): calls supabase.auth.signOut() for a real session and clears local state even if it errors', async () => {
    mockClient = buildMockSupabaseClient();
    mockSignOut.mockResolvedValue({ error: { message: 'network error' } });

    const { authService } = await import('../services/authService');
    // Manually seed a "logged in" state without going through login(), to isolate logout().
    (authService as any).currentSession = {
      user: { id: 'x', email: 'a@b.com' },
      activeRole: 'job_seeker',
      activeOrganization: null,
      token: 'some-real-token',
      isAuthenticated: true,
      isDemoMode: false
    };

    await authService.logout();

    expect(mockSignOut).toHaveBeenCalled();
    const session = authService.getSession();
    expect(session.isAuthenticated).toBe(false);
    expect(session.user).toBeNull();
    expect(session.token).toBeNull();
  });

  it('demo mode: register()/login() only work when Supabase is not configured AND demo mode is enabled, and are flagged isDemoMode', async () => {
    mockClient = null; // Supabase not configured

    vi.doMock('../config/env', () => ({
      envConfig: {
        appEnv: 'test',
        apiBaseUrl: '/api',
        defaultCurrency: 'USD',
        enableLowBandwidthMode: false,
        pwaEnabled: true,
        supabaseUrl: '',
        supabaseAnonKey: '',
        enableDemoMode: true,
        isProduction: false,
        isDevelopment: true,
        isTest: true
      }
    }));

    const { authService } = await import('../services/authService');
    const session = await authService.register({
      email: 'demo.user@opportunityhub.lr',
      password: 'StrongPassword2026!',
      fullName: 'Demo User',
      primaryRole: 'job_seeker'
    });

    expect(session.isDemoMode).toBe(true);
    expect(session.isAuthenticated).toBe(true);
    vi.doUnmock('../config/env');
  });

  it('when Supabase is not configured and demo mode is disabled, register()/login() throw a clear configuration error instead of silently using a local session', async () => {
    mockClient = null;

    vi.doMock('../config/env', () => ({
      envConfig: {
        appEnv: 'production',
        apiBaseUrl: '/api',
        defaultCurrency: 'USD',
        enableLowBandwidthMode: false,
        pwaEnabled: true,
        supabaseUrl: '',
        supabaseAnonKey: '',
        enableDemoMode: false,
        isProduction: true,
        isDevelopment: false,
        isTest: false
      }
    }));

    const { authService } = await import('../services/authService');
    await expect(
      authService.register({
        email: 'nobody@opportunityhub.lr',
        password: 'StrongPassword2026!',
        fullName: 'Nobody',
        primaryRole: 'job_seeker'
      })
    ).rejects.toThrow(/Authentication is not configured/);

    await expect(authService.login('nobody@opportunityhub.lr', 'StrongPassword2026!')).rejects.toThrow(
      /Authentication is not configured/
    );
    vi.doUnmock('../config/env');
  });
});
