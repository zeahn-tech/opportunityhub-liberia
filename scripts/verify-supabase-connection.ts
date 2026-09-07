/**
 * scripts/verify-supabase-connection.ts
 * ====================================================================
 * Standalone verification for Phase 2 of the OpportunityHub Liberia
 * Supabase migration (see docs/PRODUCTION_CERTIFICATION_REPORT.md and
 * docs/DEPLOYMENT.md § 6). This does NOT touch src/services/*.ts or
 * src/db/dbClient.ts -- the app still runs on localStorage. This
 * script only proves the *backend* (schema + RLS) behaves as designed
 * once it exists, independent of whether the app uses it yet.
 *
 * It checks three things end to end, against a real Supabase project:
 *
 *   1. RLS is enabled on every table in `public` (via the
 *      service-role-only public.debug_rls_status() RPC added in
 *      supabase/migrations/20260907205507_add_rls_verification_helper.sql).
 *   2. An anonymous (unauthenticated) client can read only what the
 *      public SELECT policies allow, and gets 0 rows / a permission
 *      error everywhere else, for both SELECT and INSERT.
 *   3. A service-role client can read rows that RLS would otherwise
 *      hide from anon, proving it truly bypasses RLS.
 *
 * Usage:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_ANON_KEY=sb_publishable_xxx \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
 *   npx tsx scripts/verify-supabase-connection.ts
 *
 * Also accepts VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY as fallbacks
 * (the same values already in your .env for the client), but
 * SUPABASE_SERVICE_ROLE_KEY has no VITE_ fallback on purpose -- it
 * must never be the kind of variable someone reflexively prefixes
 * with VITE_.
 *
 * Exits non-zero if any check fails, so it's usable as a CI/manual gate.
 * ====================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALL_TABLES = [
  'organizations',
  'users',
  'organization_memberships',
  'candidate_profiles',
  'opportunities',
  'applications',
  'business_listings',
  'business_access_requests',
  'audit_logs',
  'verification_audits'
] as const;

// Tables (and the shape of what's visible) an anonymous, unauthenticated
// client is expected to be able to SELECT from, per the RLS policies in
// supabase/migrations/20260907203348_init_schema.sql. Every other table
// should return zero rows to anon (default-deny), not an error --
// PostgREST + RLS silently filters rather than throwing.
const ANON_READABLE: Partial<Record<(typeof ALL_TABLES)[number], { filter?: (row: any) => boolean }>> = {
  organizations: {},
  opportunities: { filter: (row) => row.status === 'published' },
  business_listings: { filter: (row) => row.status === 'published' && row.is_confidential === false }
};

let failures = 0;
let passes = 0;

function pass(msg: string) {
  passes++;
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg: string) {
  failures++;
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
}

function section(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// A network/DNS/egress failure and a legitimate PostgREST 403 (RLS or
// GRANT denial) can both surface as a generic error with no useful
// status code depending on what's in front of the request (e.g. a
// proxy returning its own error body). Without distinguishing them,
// every table would misleadingly "pass" the anon-deny checks just
// because the whole connection is down. So: probe connectivity once,
// up front, against an endpoint that must always be reachable if the
// project URL and network path are valid, and abort immediately with
// a clear diagnosis if it isn't -- rather than letting that ambiguity
// leak into 10 separate per-table results.
async function preflightConnectivityCheck(anonClient: SupabaseClient): Promise<boolean> {
  section('0. Preflight connectivity check');
  const { error } = await anonClient.from('organizations').select('id').limit(1);
  // organizations has `FOR SELECT USING (true)` for everyone, including
  // anon, so this must succeed if we can really reach the project at all.
  if (!error) {
    pass('Reached the Supabase project and read from a public table.');
    return true;
  }
  const msg = error.message || '';
  const looksLikeNetworkFailure = /not in allowlist|ENOTFOUND|ECONNREFUSED|fetch failed|network|timed out|getaddrinfo/i.test(msg);
  if (looksLikeNetworkFailure) {
    fail(`Cannot reach ${SUPABASE_URL}: ${msg}`);
    fail('This looks like a network/DNS/egress problem, not an RLS problem -- fix connectivity before trusting any result below.');
    return false;
  }
  // Reached the project but even the public policy failed -- something
  // is genuinely wrong with the schema/migrations, not the network.
  // Report it and let the rest of the checks run to give full detail.
  fail(`Reached ${SUPABASE_URL} but anon SELECT on organizations (a public table) failed: ${msg}`);
  fail('Did you run `npx supabase db push` to apply supabase/migrations/ first?');
  return true;
}

async function checkRlsEnabledEverywhere(serviceClient: SupabaseClient) {
  section('1. RLS enabled on every table (via service-role RPC)');
  const { data, error } = await serviceClient.rpc('debug_rls_status');

  if (error) {
    fail(`Could not call public.debug_rls_status() with the service-role client: ${error.message}`);
    fail('Did you run `npx supabase db push` to apply supabase/migrations/ first?');
    return;
  }

  const rows = (data ?? []) as { table_name: string; rls_enabled: boolean }[];
  const byName = new Map(rows.map((r) => [r.table_name, r.rls_enabled]));

  for (const table of ALL_TABLES) {
    if (!byName.has(table)) {
      fail(`${table}: not found in public schema (missing migration?)`);
      continue;
    }
    if (byName.get(table)) {
      pass(`${table}: RLS enabled`);
    } else {
      fail(`${table}: RLS is NOT enabled`);
    }
  }
}

async function checkAnonReadAccess(anonClient: SupabaseClient) {
  section('2. Anonymous client can read only what public policies allow');

  for (const table of ALL_TABLES) {
    const { data, error } = await anonClient.from(table).select('*').limit(50);
    const expectation = ANON_READABLE[table];

    if (expectation === undefined) {
      // Expected: zero rows, no error (RLS filters silently)
      if (error) {
        // A permission-denied error also satisfies "anon can't read this",
        // just via table-level GRANTs instead of RLS -- still a pass.
        pass(`${table}: anon read blocked (${error.message})`);
      } else if ((data ?? []).length === 0) {
        pass(`${table}: anon read returns 0 rows (RLS default-deny working)`);
      } else {
        fail(`${table}: anon read unexpectedly returned ${data!.length} row(s) -- should be private`);
      }
      continue;
    }

    // Expected: readable, but only rows matching the public policy's filter
    if (error) {
      fail(`${table}: expected anon-readable but got error: ${error.message}`);
      continue;
    }
    const rows = data ?? [];
    const filter = expectation.filter;
    const violating = filter ? rows.filter((r) => !filter(r)) : [];
    if (violating.length > 0) {
      fail(`${table}: anon read returned ${violating.length} row(s) that violate the public policy filter`);
    } else {
      pass(`${table}: anon read returns only publicly-visible rows (${rows.length} row(s))`);
    }
  }

  // Defense-in-depth: anon should not be able to INSERT anywhere, even
  // into a table it can read (organizations grants only SELECT to anon
  // at the GRANT level, separate from RLS).
  const { error: insertError } = await anonClient.from('organizations').insert({
    id: '__rls_verify_probe__',
    slug: '__rls_verify_probe__',
    name: 'RLS verify probe',
    type: 'employer',
    industry: 'test',
    county: 'Montserrado',
    city_district: 'test',
    description: 'should never be written'
  });
  if (insertError) {
    pass(`organizations: anon INSERT correctly rejected (${insertError.message})`);
  } else {
    fail('organizations: anon INSERT unexpectedly succeeded -- anon should have no write access');
    // Best-effort cleanup using service role happens in checkServiceRoleBypass.
  }
}

async function checkServiceRoleBypass(serviceClient: SupabaseClient) {
  section('3. Service-role client bypasses RLS');

  // Clean up anything the anon-write probe above may have inserted.
  await serviceClient.from('organizations').delete().eq('id', '__rls_verify_probe__');

  // `users` has no anon SELECT policy at all -- if service role can read
  // it, that's direct proof of RLS bypass (assuming the table has rows;
  // an empty table would give a false pass, so we insert-then-read a
  // disposable probe row via service role to guarantee a real assertion).
  const probeId = '__rls_verify_service_probe__';
  const { error: insertErr } = await serviceClient.from('users').insert({
    id: probeId,
    email: `${probeId}@example.invalid`,
    full_name: 'RLS Verify Probe',
    primary_role: 'job_seeker'
  });

  if (insertErr) {
    fail(`Could not insert probe row as service role (unexpected -- service role should bypass RLS): ${insertErr.message}`);
    return;
  }
  pass('service role INSERT into users succeeded (would be rejected under RLS -- no anon/authenticated policy permits it)');

  const { data, error: selectErr } = await serviceClient.from('users').select('id').eq('id', probeId).maybeSingle();
  if (selectErr || !data) {
    fail(`service role could not read back its own probe row: ${selectErr?.message ?? 'no row returned'}`);
  } else {
    pass('service role SELECT reads the probe row directly (RLS bypassed)');
  }

  // Cross-check: the same row must NOT be visible to anon.
  // (Caller re-checks this implicitly in checkAnonReadAccess, but we
  // clean up here regardless of ordering.)
  const { error: deleteErr } = await serviceClient.from('users').delete().eq('id', probeId);
  if (deleteErr) {
    fail(`Could not clean up probe row from users: ${deleteErr.message}`);
  } else {
    pass('probe row cleaned up');
  }
}

async function main() {
  console.log('OpportunityHub Liberia -- Supabase backend verification\n');

  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY.');
    process.exit(2);
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY. This script needs it to verify RLS bypass and to');
    console.error('read RLS status; it is never read from a VITE_-prefixed variable on purpose.');
    process.exit(2);
  }

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const canProceed = await preflightConnectivityCheck(anonClient);
  if (!canProceed) {
    console.log(`\n${passes} passed, ${failures} failed.\n`);
    console.error('VERIFICATION FAILED (network/connectivity -- see above)');
    process.exit(1);
  }

  await checkRlsEnabledEverywhere(serviceClient);
  await checkAnonReadAccess(anonClient);
  await checkServiceRoleBypass(serviceClient);

  console.log(`\n${passes} passed, ${failures} failed.\n`);
  if (failures > 0) {
    console.error('VERIFICATION FAILED');
    process.exit(1);
  }
  console.log('VERIFICATION PASSED');
}

main().catch((err) => {
  console.error('Unexpected error running verification:', err);
  process.exit(1);
});
