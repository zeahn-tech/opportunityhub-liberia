-- ====================================================================
-- Migration: add_rls_verification_helper
-- ====================================================================
-- Adds a single read-only helper so scripts/verify-supabase-connection.ts
-- can prove RLS is enabled on every table without a raw Postgres
-- connection (PostgREST -- what @supabase/supabase-js talks to --
-- does not allow arbitrary SQL, only calls to functions exposed via
-- RPC). This does not change any existing table's data-access policy;
-- it only exposes catalog *metadata* (table name + whether RLS is on),
-- never row data, and only to the service_role.
--
-- SECURITY DEFINER is required here because pg_class/pg_tables
-- introspection of another schema's objects needs the definer's
-- (table owner's) privileges in some Supabase configurations; search_path
-- is pinned for the same reason described in the previous migration.
-- EXECUTE is revoked from PUBLIC/anon/authenticated and granted only to
-- service_role, so this cannot be called by the client-side anon key.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.debug_rls_status()
RETURNS TABLE(table_name TEXT, rls_enabled BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  SELECT c.relname::TEXT, c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r';
$$;

REVOKE ALL ON FUNCTION public.debug_rls_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.debug_rls_status() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debug_rls_status() TO service_role;
