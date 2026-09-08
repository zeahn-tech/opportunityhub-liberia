-- ====================================================================
-- Migration: sync_auth_users_to_public_users
-- ====================================================================
-- Phase 2 (Auth): Supabase Auth becomes the sole source of identity.
-- This migration is what makes that true for the *profile data model*
-- as well as the credential itself: without it, a real supabase.auth
-- signUp() creates a row in auth.users but nothing in public.users,
-- so every RLS policy that does `id = auth.uid()::VARCHAR` (see
-- init_schema.sql) would have no matching row to join against, and
-- the app would have no role/county/name to render.
--
-- Design choice: Postgres trigger on auth.users, not an edge function.
-- Reasoning:
--   1. Atomicity: the trigger runs in the SAME transaction GoTrue uses
--      to insert into auth.users. If profile creation fails, the
--      signup fails too -- there is no window where an auth.users row
--      exists with no matching public.users row. An edge function
--      invoked *after* signup (e.g. via a webhook) has no such
--      guarantee: a crash or timeout between "auth user created" and
--      "edge function ran" leaves an orphaned identity with a broken
--      profile, which is exactly the split-brain this phase is trying
--      to eliminate.
--   2. No extra network hop / secret: an edge function approach needs
--      either a Database Webhook (itself just a wrapped trigger) or
--      the client calling a second endpoint after signUp() -- which
--      reintroduces a "silent local fallback if that second call
--      fails" failure mode, the very thing this phase removes from
--      authService.ts.
--   3. It is push-only and narrow: this trigger only ever INSERTs into
--      public.users from a fixed, small set of auth.users columns. It
--      does not run arbitrary application logic, call out to the
--      network, or touch any other table, so its blast radius as a
--      SECURITY DEFINER function is easy to reason about.
--
-- Trade-off, noted explicitly: capabilities / preferences /
-- onboardingCompleted (see src/types/index.ts's User/UserProfile) are
-- NOT columns on public.users yet -- that table is the Phase 1 schema,
-- reviewed but not restructured in this phase. This trigger populates
-- only what public.users actually has (role, county, name, verification
-- flags). The application-side merge of the rest from the local
-- dbClient/localStorage profile cache is handled in
-- src/services/authService.ts and is intentionally temporary --
-- migrating that remainder onto Supabase is Phase 3, not this one.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone_number,
    primary_role,
    system_role,
    account_status,
    primary_county,
    is_email_verified,
    is_phone_verified,
    created_at,
    last_login_at
  )
  VALUES (
    NEW.id::VARCHAR,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'fullName', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phoneNumber',
    COALESCE(NEW.raw_user_meta_data->>'primaryRole', 'job_seeker'),
    'user',
    'pending_verification',
    COALESCE(NEW.raw_user_meta_data->>'primaryCounty', 'Montserrado'),
    (NEW.email_confirmed_at IS NOT NULL),
    FALSE,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fires once per new identity. AFTER INSERT (not BEFORE) so the
-- auth.users row is durably committed before we reference NEW.id as a
-- foreign key target from public.users; ON CONFLICT DO NOTHING makes
-- it safe to re-run/re-apply and safe against any future direct
-- inserts that pre-seed a matching id.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Keep public.users.is_email_verified in sync when the user confirms
-- their email via the Supabase-sent link (auth.users.email_confirmed_at
-- transitions from NULL to a timestamp on confirmation).
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET is_email_verified = TRUE,
        account_status = CASE WHEN account_status = 'pending_verification' THEN 'active' ELSE account_status END
    WHERE id = NEW.id::VARCHAR;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_confirmed();
