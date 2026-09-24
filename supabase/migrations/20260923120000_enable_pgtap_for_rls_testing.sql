-- Phase 6: enable pgTAP so the RLS security test matrix
-- (supabase/tests/rls_security_test_matrix.sql) can run directly against
-- this database. Testing-only extension; adds no production surface.
create extension if not exists pgtap with schema extensions;
