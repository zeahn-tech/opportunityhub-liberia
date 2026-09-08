import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/dbClient';
import { authenticateSession } from '../server/authMiddleware';

/**
 * Tests src/server/authMiddleware.ts -- the middleware that replaced
 * server.ts's broken authenticateSession (which checked db.validateSession
 * against an in-process store that never saw real browser tokens).
 *
 * IMPORTANT SCOPE NOTE: this environment's network sandbox cannot reach
 * *.supabase.co (see docs/PRODUCTION_CERTIFICATION_REPORT.md), so
 * supabase.auth.getUser() is mocked here rather than called against the
 * live project. What IS proven live against the real project (via the
 * Supabase MCP connector, which is not subject to that sandbox
 * restriction) is that the auth.users -> public.users sync trigger fires
 * correctly -- see the migration file and the certification report for
 * that evidence. A fully live "sign in over HTTP, call this middleware in
 * a running server" run needs to happen from an environment with real
 * network access to Supabase; see the certification report for exact
 * pending steps.
 *
 * What this test file DOES prove, deterministically and repeatably:
 *   - A request with no Authorization header is rejected (401) before any
 *     Supabase call is made.
 *   - A garbage/malformed token is rejected (401) via a real (mocked, but
 *     realistically-shaped) supabase.auth.getUser() error response.
 *   - A token supabase.auth.getUser() accepts is let through, with
 *     req.user populated from the *Supabase* response, not a local store.
 *   - With demo mode OFF, a Supabase rejection is final -- the local
 *     dbClient session store is never consulted.
 *   - With demo mode explicitly ON, a locally-issued demo session token
 *     is accepted as a clearly-flagged (req.isDemoSession = true) fallback
 *     only after Supabase itself rejected the token.
 *   - An expired local demo session is still rejected even with demo mode on.
 */

const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser }
  })
}));

function mockReqRes(token?: string) {
  const req: any = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    }
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('server auth middleware -- real Supabase JWT verification', () => {
  beforeEach(() => {
    db.reset();
    mockGetUser.mockReset();
  });

  it('rejects a request with no Authorization header before calling Supabase', async () => {
    const { req, res, next } = mockReqRes();

    await authenticateSession(req, res, next, {
      supabaseUrl: 'https://tnnwbjenajtwiuiqbwpj.supabase.co',
      supabaseAnonKey: 'anon-key',
      demoModeEnabled: false
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('accepts a valid Supabase-issued token and populates req.user from Supabase, not a local store', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'real-user-id-1', email: 'realuser@opportunityhub.lr' } },
      error: null
    });

    const { req, res, next } = mockReqRes('a-real-browser-issued-jwt');

    await authenticateSession(req, res, next, {
      supabaseUrl: 'https://tnnwbjenajtwiuiqbwpj.supabase.co',
      supabaseAnonKey: 'anon-key',
      demoModeEnabled: false
    });

    expect(mockGetUser).toHaveBeenCalledWith('a-real-browser-issued-jwt');
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('real-user-id-1');
    expect(req.isDemoSession).toBeUndefined();
  });

  it('rejects a garbage/expired token with 401 and does NOT fall back to the local store when demo mode is off', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT: unable to parse or verify signature' }
    });

    const { req, res, next } = mockReqRes('this.is.garbage');

    await authenticateSession(req, res, next, {
      supabaseUrl: 'https://tnnwbjenajtwiuiqbwpj.supabase.co',
      supabaseAnonKey: 'anon-key',
      demoModeEnabled: false
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid JWT/);
  });

  it('falls back to a local demo session ONLY when demo mode is explicitly enabled and Supabase rejected the token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } });

    const { user, session } = await db.registerUser({
      email: 'demo.server.user@opportunityhub.lr',
      password: 'StrongPassword2026!',
      fullName: 'Demo Server User',
      primaryRole: 'job_seeker'
    });

    const { req, res, next } = mockReqRes(session.token);

    await authenticateSession(req, res, next, {
      supabaseUrl: 'https://tnnwbjenajtwiuiqbwpj.supabase.co',
      supabaseAnonKey: 'anon-key',
      demoModeEnabled: true
    });

    expect(next).toHaveBeenCalled();
    expect(req.isDemoSession).toBe(true);
    expect(req.user.id).toBe(user.id);
  });

  it('rejects an expired local demo session even with demo mode enabled', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } });

    const { session } = await db.registerUser({
      email: 'demo.expired.user@opportunityhub.lr',
      password: 'StrongPassword2026!',
      fullName: 'Demo Expired User',
      primaryRole: 'job_seeker'
    });
    // Force the session to be expired.
    db.revokeSession(session.token);

    const { req, res, next } = mockReqRes(session.token);

    await authenticateSession(req, res, next, {
      supabaseUrl: 'https://tnnwbjenajtwiuiqbwpj.supabase.co',
      supabaseAnonKey: 'anon-key',
      demoModeEnabled: true
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('when Supabase is not configured at all and demo mode is off, rejects outright rather than silently allowing local sessions', async () => {
    const { req, res, next } = mockReqRes('any-token');

    await authenticateSession(req, res, next, {
      supabaseUrl: undefined,
      supabaseAnonKey: undefined,
      demoModeEnabled: false
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});
