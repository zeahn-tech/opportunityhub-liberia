import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db/dbClient.js';

/**
 * Server-side Supabase Auth verification, extracted from server.ts so it can be
 * unit/integration tested without booting the full Express + Vite + Stripe stack.
 *
 * Verifies the real Supabase-issued JWT the browser sends (supabase-js's
 * access_token) via supabase.auth.getUser(token) -- this asks Supabase itself
 * to check the token's signature and expiry, using only the anon key (never
 * the service-role key). This replaces a previous version that checked
 * db.validateSession(token), an in-process store that never saw real browser
 * tokens and rejected every real request.
 *
 * Local dbClient sessions are honored ONLY as an explicit, opt-in demo-mode
 * fallback (VITE_ENABLE_DEMO_MODE=true) -- never silently, and never when
 * Supabase is configured, reachable, and genuinely rejected the token while
 * demo mode is off.
 */

export interface SupabaseAuthEnv {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  demoModeEnabled?: boolean;
}

export function readAuthEnv(env: NodeJS.ProcessEnv = process.env): SupabaseAuthEnv {
  return {
    supabaseUrl: env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
    demoModeEnabled: (env.VITE_ENABLE_DEMO_MODE || '').toLowerCase() === 'true'
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedClientKey = '';

export function getServerSupabaseClient(authEnv: SupabaseAuthEnv): SupabaseClient | null {
  if (!authEnv.supabaseUrl || !authEnv.supabaseAnonKey) return null;
  const key = `${authEnv.supabaseUrl}::${authEnv.supabaseAnonKey}`;
  if (!cachedClient || cachedClientKey !== key) {
    cachedClient = createClient(authEnv.supabaseUrl, authEnv.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    cachedClientKey = key;
  }
  return cachedClient;
}

/** Test hook: forces a fresh client to be constructed on next call. */
export function resetServerSupabaseClientCache(): void {
  cachedClient = null;
  cachedClientKey = '';
}

export async function authenticateSession(req: any, res: any, next: any, authEnv: SupabaseAuthEnv = readAuthEnv()) {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication is required. Missing token.' });
    }
    const token = authHeader.split(' ')[1];
    const supabase = getServerSupabaseClient(authEnv);

    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        req.user = data.user;
        req.supabaseUser = data.user;
        return next();
      }
      if (!authEnv.demoModeEnabled) {
        return res.status(401).json({ error: (error && error.message) || 'Invalid or expired session.' });
      }
    } else if (!authEnv.demoModeEnabled) {
      return res.status(401).json({ error: 'Authentication is not configured on the server.' });
    }

    const { user, session } = db.validateSession(token);
    req.user = user;
    req.session = session;
    req.isDemoSession = true;
    next();
  } catch (error: any) {
    console.error('API Auth Error:', error.message);
    res.status(401).json({ error: error.message || 'Invalid or expired session' });
  }
}
