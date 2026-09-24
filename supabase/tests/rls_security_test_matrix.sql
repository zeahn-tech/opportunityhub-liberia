-- =====================================================================
-- RLS SECURITY TEST MATRIX — OpportunityHub Liberia
-- Phase 6: proves the role x resource x action matrix against the LIVE
-- Supabase Postgres database with pgTAP (extensions schema), impersonating
-- each role via SET LOCAL role + request.jwt.claim.sub inside one
-- transaction that is always ROLLED BACK -- no fixture data persists.
--
-- Run it with the Supabase MCP connector's execute_sql tool (paste this
-- file's contents verbatim) or via psql against the project:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_security_test_matrix.sql
-- (requires `create extension if not exists pgtap with schema extensions;`
-- to already be applied -- see the enable_pgtap_for_rls_testing migration.)
--
-- Covers every table with RLS enabled, all six roles named in the
-- certification's Authorization Status section (job_seeker/candidate,
-- employer/recruiter, business_seller, verification_officer,
-- platform_admin, guest/anonymous), and specifically:
--   1. Cross-tenant read/write denial (org A vs org B)
--   2. Confidential business fields unreachable without an approved,
--      signed NDA -- both via direct table SELECT and the sanctioned
--      get_business_listing_public() RPC
--   3. Candidate PII not exposed to org members without consent
--      (candidate_profiles is never directly selectable by an employer;
--      only the RPC-mediated / application-snapshot paths work)
--   4. A suspended account's session is NOT rejected by RLS (see the
--      "CRITICAL FINDING" tests in section 14 -- this is a real,
--      currently-open gap, not a false negative)
--   5. platform_admin/verification_officer overrides: platform_admin's
--      overrides work everywhere tested; verification_officer has NO
--      matching RLS or RPC grants today (also flagged as a finding),
--      and the negative case (officer cannot edit business listings)
--      passes.
--   6. Defense-in-depth BEFORE UPDATE/INSERT trigger boundaries that
--      sit on top of RLS (enforce_business_access_request_update_boundary,
--      enforce_application_candidate_update_boundary,
--      enforce_invitation_update_boundary, enforce_owner_invariant,
--      enforce_no_messages_between_blocked_users) are exercised
--      explicitly so a future change to RLS alone doesn't silently
--      reopen a gap these triggers currently close.
--
-- Last verified run: 112/112 assertions passing against the live
-- "Opportunity Hub Liberia" Supabase project (tnnwbjenajtwiuiqbwpj).
-- See docs/RLS_SECURITY_TEST_MATRIX.md for the narrative results and
-- open findings this suite surfaced.
-- =====================================================================

begin;
select extensions.no_plan();
create temp table test_log (seq serial primary key, line text);
grant insert, select on test_log to authenticated, anon;
grant usage, select on test_log_seq_seq to authenticated, anon;

-- convenience macros expressed as repeated patterns (no real macros in SQL, so we inline)
-- role switch pattern: select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','<uuid>',true);
-- anon pattern: select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
-- always `reset role;` after each block.

-- =====================================================================
-- FIXTURES
-- =====================================================================
insert into public.organizations (id, slug, name, type, industry, county, city_district, description, verification_status, is_verified, registration_number, tax_id_number, contact_email, contact_phone)
values
  ('org-rlstest-a', 'rlstest-org-a', 'RLS Test Org A', 'employer', 'Technology', 'Montserrado', 'Sinkor', 'Test org A', 'unverified', false, 'REG-SECRET-A-001', 'TAXID-SECRET-A-999', 'org-a-secret@example.com', '+231-770-000-001'),
  ('org-rlstest-b', 'rlstest-org-b', 'RLS Test Org B', 'employer', 'Technology', 'Montserrado', 'Congo Town', 'Test org B', 'unverified', false, 'REG-SECRET-B-001', 'TAXID-SECRET-B-999', 'org-b-secret@example.com', '+231-770-000-002');

insert into public.users (id, email, full_name, phone_number, primary_role, system_role, account_status)
values
  ('e1a04c8f-5378-4703-b293-4c71f95946fa', 'rlstest-seeker-a@example.com', 'RLS Seeker A', '+231-770-100-001', 'job_seeker', 'user', 'active'),
  ('a866154d-2098-4449-a187-02e6f8596306', 'rlstest-seeker-b@example.com', 'RLS Seeker B', '+231-770-100-002', 'job_seeker', 'user', 'active'),
  ('7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'rlstest-emp-a-owner@example.com', 'RLS Employer A Owner', '+231-770-100-003', 'employer', 'user', 'active'),
  ('9c7b6175-bdd8-42f7-af17-76dfce58863d', 'rlstest-emp-a-member@example.com', 'RLS Employer A Member', '+231-770-100-004', 'employer', 'user', 'active'),
  ('5bcc7834-3bdb-4541-a376-e59ed909a032', 'rlstest-emp-b-owner@example.com', 'RLS Employer B Owner', '+231-770-100-005', 'employer', 'user', 'active'),
  ('d792e6c2-1cde-482d-af44-45a0044addaf', 'rlstest-seller@example.com', 'RLS Business Seller', '+231-770-100-006', 'business_seller', 'user', 'active'),
  ('30fe1b0a-7631-4443-9bac-bb8f484a31c4', 'rlstest-buyer@example.com', 'RLS Business Buyer', '+231-770-100-007', 'business_seller', 'user', 'active'),
  ('5bf5d40a-bbc1-4fc9-958f-fb98cc363ce6', 'rlstest-platform-admin@example.com', 'RLS Platform Admin', '+231-770-100-008', 'platform_admin', 'platform_admin', 'active'),
  ('d0113703-ef4a-437c-a2ca-e2333b0ea145', 'rlstest-verification-officer@example.com', 'RLS Verification Officer', '+231-770-100-009', 'verification_officer', 'verification_officer', 'active'),
  ('daf8fe74-1b3e-4fca-83f4-178006bc6179', 'rlstest-suspended@example.com', 'RLS Suspended User', '+231-770-100-010', 'job_seeker', 'user', 'suspended'),
  ('4ea6ad97-14c1-4de6-af58-26285a8453d2', 'rlstest-outsider@example.com', 'RLS Outsider', '+231-770-100-011', 'job_seeker', 'user', 'active');

insert into public.organization_memberships (id, organization_id, user_id, org_role, status, permissions)
values
  ('mem-rlstest-a-owner', 'org-rlstest-a', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'owner', 'active', '[]'::jsonb),
  ('mem-rlstest-a-member', 'org-rlstest-a', '9c7b6175-bdd8-42f7-af17-76dfce58863d', 'member', 'active', '[]'::jsonb),
  ('mem-rlstest-b-owner', 'org-rlstest-b', '5bcc7834-3bdb-4541-a376-e59ed909a032', 'owner', 'active', '[]'::jsonb);

insert into public.candidate_profiles (user_id, headline, bio, full_name, email, phone, county, privacy_settings)
values
  ('e1a04c8f-5378-4703-b293-4c71f95946fa', 'Software Engineer', 'RLS test bio', 'RLS Seeker A', 'rlstest-seeker-a@example.com', '+231-770-100-001', 'Montserrado',
   '{"contactVisibility": "on_application_only", "profileVisibility": "public", "cvDownloadPermission": "applied_jobs_only"}'::jsonb);

insert into public.opportunities (id, organization_id, created_by_user_id, title, slug, opportunity_type, workplace_model, county, location_details, description, status)
values
  ('opp-rlstest-a-published', 'org-rlstest-a', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'RLS Test Published Job', 'rlstest-published-job', 'job', 'onsite', 'Montserrado', 'Sinkor', 'Published test job', 'published'),
  ('opp-rlstest-a-draft', 'org-rlstest-a', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'RLS Test Draft Job', 'rlstest-draft-job', 'job', 'onsite', 'Montserrado', 'Sinkor', 'Draft test job', 'draft');

insert into public.applications (id, opportunity_id, applicant_user_id, organization_id, applicant_full_name, applicant_email, applicant_phone, stage)
values
  ('app-rlstest-a', 'opp-rlstest-a-published', 'e1a04c8f-5378-4703-b293-4c71f95946fa', 'org-rlstest-a', 'RLS Seeker A', 'rlstest-seeker-a@example.com', '+231-770-100-001', 'submitted');

insert into public.business_listings (id, owner_user_id, title, slug, listing_type, industry, county, city_district, headline, description, status, is_confidential, asking_price_usd, annual_revenue_usd, exact_address, seller_name, seller_contact_email, seller_contact_phone)
values
  ('biz-rlstest-public', 'd792e6c2-1cde-482d-af44-45a0044addaf', 'RLS Public Business', 'rlstest-public-biz', 'business', 'Retail', 'Montserrado', 'Sinkor', 'Public biz', 'A public test business', 'published', false, 50000, 20000, '123 Secret St', 'RLS Seller', 'seller-secret@example.com', '+231-770-200-001'),
  ('biz-rlstest-confidential', 'd792e6c2-1cde-482d-af44-45a0044addaf', 'RLS Confidential Business', 'rlstest-confidential-biz', 'business', 'Retail', 'Montserrado', 'Congo Town', 'Confidential biz', 'A confidential test business', 'published', true, 250000, 90000, '456 Vault Ave', 'RLS Seller', 'seller-secret@example.com', '+231-770-200-002');

insert into public.business_access_requests (id, listing_id, buyer_user_id, buyer_full_name, buyer_email, status, nda_signed)
values
  ('bar-rlstest-approved', 'biz-rlstest-confidential', '30fe1b0a-7631-4443-9bac-bb8f484a31c4', 'RLS Business Buyer', 'rlstest-buyer@example.com', 'approved', true),
  ('bar-rlstest-pending', 'biz-rlstest-confidential', '4ea6ad97-14c1-4de6-af58-26285a8453d2', 'RLS Outsider', 'rlstest-outsider@example.com', 'pending', false);

insert into public.account_restrictions (id, user_id, user_name, user_email, restriction_type, reason, issued_by_user_id, issued_by_name, status)
values
  ('restr-rlstest-1', 'daf8fe74-1b3e-4fca-83f4-178006bc6179', 'RLS Suspended User', 'rlstest-suspended@example.com', 'full_suspension', 'RLS test suspension', '5bf5d40a-bbc1-4fc9-958f-fb98cc363ce6', 'RLS Platform Admin', 'active');

insert into public.audit_logs (id, user_id, organization_id, action, resource_type, resource_id)
values
  ('audit-rlstest-a', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'org-rlstest-a', 'opportunity.create', 'opportunity', 'opp-rlstest-a-published');

insert into public.verification_audits (id, organization_id, requested_by_user_id, status, requested_badge)
values
  ('vaudit-rlstest-a', 'org-rlstest-a', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'pending', 'verified_employer');

insert into public.verification_requests (id, entity_type, entity_id, entity_name, submitter_user_id, submitter_name, submitter_email, status, badge_requested, county)
values
  ('vreq-rlstest-a', 'organization', 'org-rlstest-a', 'RLS Test Org A', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'RLS Employer A Owner', 'rlstest-emp-a-owner@example.com', 'pending_review', 'verified_employer', 'Montserrado');

insert into public.conversations (id, category, title)
values ('conv-rlstest-1', 'general', 'RLS test conversation');

insert into public.conversation_participants (conversation_id, user_id)
values
  ('conv-rlstest-1', 'e1a04c8f-5378-4703-b293-4c71f95946fa'),
  ('conv-rlstest-1', '7c2f3e71-1dc7-4541-9c82-296d25fd0900');

insert into public.direct_messages (id, conversation_id, sender_id, recipient_id, body)
values ('msg-rlstest-1', 'conv-rlstest-1', 'e1a04c8f-5378-4703-b293-4c71f95946fa', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'RLS test message');

insert into public.organization_subscriptions (id, organization_id, plan_id, tier)
values ('sub-rlstest-a', 'org-rlstest-a', 'plan-basic', 'basic');

insert into public.conversations (id, category, title)
values ('conv-rlstest-blocked', 'general', 'RLS blocked-messaging test conversation');

insert into public.conversation_participants (conversation_id, user_id)
values
  ('conv-rlstest-blocked', 'e1a04c8f-5378-4703-b293-4c71f95946fa'),
  ('conv-rlstest-blocked', '4ea6ad97-14c1-4de6-af58-26285a8453d2');

insert into test_log(line) select * from extensions.ok(true, '[FIXTURES] loaded successfully');

-- =====================================================================
-- 1. organizations
-- =====================================================================
-- Anonymous can SELECT — verify current (permissive) policy behavior + sensitive field exposure
select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organizations where id = 'org-rlstest-a') = 1,
  '[organizations][anon][SELECT] anon can read org row (policy is USING(true), not verified-only as docs claim)');
insert into test_log(line) select * from extensions.ok(
  (select tax_id_number from public.organizations where id = 'org-rlstest-a') is not null,
  '[organizations][anon][SELECT] *** FINDING *** anon can read tax_id_number (sensitive) — unverified org, docs claim "verified only"');
insert into test_log(line) select * from extensions.ok(
  (select contact_email from public.organizations where id = 'org-rlstest-a') is not null,
  '[organizations][anon][SELECT] *** FINDING *** anon can read contact_email (PII-adjacent) on unverified org');
reset role;

-- Org A owner can update org A; cannot update org B (cross-tenant)
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.organizations set description = 'updated by owner' where id = 'org-rlstest-a'$$,
  '[organizations][employer_a_owner][UPDATE] org admin can update own org');
with upd as (update public.organizations set description = 'HACKED cross-tenant' where id = 'org-rlstest-b' returning 1)
insert into test_log(line) select * from extensions.ok((select count(*) from upd) = 0, '[organizations][employer_a_owner][UPDATE] *** cross-tenant *** org A owner cannot update org B');
reset role;

-- Non-admin member cannot update org
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','9c7b6175-bdd8-42f7-af17-76dfce58863d',true);
with upd as (update public.organizations set description = 'member should not be able to do this' where id = 'org-rlstest-a' returning 1)
insert into test_log(line) select * from extensions.ok((select count(*) from upd) = 0, '[organizations][employer_a_member][UPDATE] plain member (not admin/owner) cannot update org');
reset role;

-- =====================================================================
-- 2. users
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.users where id = 'e1a04c8f-5378-4703-b293-4c71f95946fa') = 1,
  '[users][seeker_a][SELECT] can read own user row');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.users where id = 'a866154d-2098-4449-a187-02e6f8596306') = 0,
  '[users][seeker_a][SELECT] cannot read another user''s row directly');
reset role;

select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.users where id = 'e1a04c8f-5378-4703-b293-4c71f95946fa') = 0,
  '[users][anon][SELECT] anonymous cannot read any user row');
reset role;

-- =====================================================================
-- 3. organization_memberships
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','9c7b6175-bdd8-42f7-af17-76dfce58863d',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_memberships where organization_id = 'org-rlstest-a') = 2,
  '[organization_memberships][employer_a_member][SELECT] org member can see all memberships in own org');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_memberships where organization_id = 'org-rlstest-b') = 0,
  '[organization_memberships][employer_a_member][SELECT] *** cross-tenant *** cannot see org B''s memberships');
with upd as (update public.organization_memberships set org_role = 'admin' where id = 'mem-rlstest-a-member' returning 1)
insert into test_log(line) select * from extensions.ok((select count(*) from upd) = 0, '[organization_memberships][employer_a_member][UPDATE] plain member cannot self-promote to admin');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.organization_memberships set org_role = 'admin' where id = 'mem-rlstest-a-member'$$,
  '[organization_memberships][employer_a_owner][UPDATE] org admin can manage memberships in own org');
update public.organization_memberships set org_role = 'member' where id = 'mem-rlstest-a-member'; -- revert (still as owner, allowed)
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_memberships where organization_id = 'org-rlstest-a') = 0,
  '[organization_memberships][employer_b_owner][SELECT] *** cross-tenant *** org B owner cannot see org A memberships');
reset role;

-- =====================================================================
-- 4. candidate_profiles  (blocker: candidate PII not exposed without consent)
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.candidate_profiles where user_id = 'e1a04c8f-5378-4703-b293-4c71f95946fa') = 0,
  '[candidate_profiles][employer_a_owner][SELECT] *** PII *** org employer CANNOT directly select candidate_profiles even though candidate applied to their org (must use get_public_candidate_profile RPC)');
reset role;

select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.candidate_profiles) = 0,
  '[candidate_profiles][anon][SELECT] anonymous cannot read any candidate profile');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.candidate_profiles where user_id = 'e1a04c8f-5378-4703-b293-4c71f95946fa') = 1,
  '[candidate_profiles][seeker_a][SELECT] candidate can read own profile');
reset role;

-- =====================================================================
-- 5. opportunities
-- =====================================================================
select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.opportunities where id = 'opp-rlstest-a-published') = 1,
  '[opportunities][anon][SELECT] anon can see published opportunity');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.opportunities where id = 'opp-rlstest-a-draft') = 0,
  '[opportunities][anon][SELECT] anon CANNOT see draft opportunity');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','9c7b6175-bdd8-42f7-af17-76dfce58863d',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.opportunities where id = 'opp-rlstest-a-draft') = 1,
  '[opportunities][employer_a_member][SELECT] org member CAN see own org''s draft opportunity');
insert into test_log(line) select * from extensions.throws_ok(
  $$insert into public.opportunities (id, organization_id, created_by_user_id, title, slug, opportunity_type, workplace_model, county, location_details, description, status)
    values ('opp-rlstest-a-member-created2', 'org-rlstest-a', '9c7b6175-bdd8-42f7-af17-76dfce58863d', 'Should Fail', 'rlstest-should-fail-2', 'job', 'onsite', 'Montserrado', 'x', 'x', 'draft')$$,
  NULL::char(5), NULL::text,
  '[opportunities][employer_a_member][INSERT] plain member WITHOUT opportunities.create permission cannot create an opportunity'
);
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.opportunities where organization_id = 'org-rlstest-a' and status = 'draft') = 0,
  '[opportunities][employer_b_owner][SELECT] *** cross-tenant *** org B owner cannot see org A''s draft opportunities');
with upd as (update public.opportunities set title = 'HACKED cross-tenant' where id = 'opp-rlstest-a-published' returning 1)
insert into test_log(line) select * from extensions.ok((select count(*) from upd) = 0, '[opportunities][employer_b_owner][UPDATE] *** cross-tenant *** org B owner cannot update org A opportunity');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.opportunities set title = 'RLS Test Published Job (edited)' where id = 'opp-rlstest-a-published'$$,
  '[opportunities][employer_a_owner][UPDATE] org owner/admin (has opportunities.edit via role) can update own org opportunity');
reset role;

-- =====================================================================
-- 6. applications  (blocker: cross-tenant + candidate PII snapshot)
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.applications where id = 'app-rlstest-a') = 1,
  '[applications][seeker_a][SELECT] applicant can see own application');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','a866154d-2098-4449-a187-02e6f8596306',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.applications where id = 'app-rlstest-a') = 0,
  '[applications][seeker_b][SELECT] a different candidate cannot see seeker_a''s application');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.ok(
  (select applicant_email from public.applications where id = 'app-rlstest-a') = 'rlstest-seeker-a@example.com',
  '[applications][employer_a_owner][SELECT] org member of the TARGET org sees applicant PII snapshot (intended: consent given by applying)');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.applications where id = 'app-rlstest-a') = 0,
  '[applications][employer_b_owner][SELECT] *** cross-tenant + PII *** org B cannot see org A''s applications or applicant PII');
with upd as (update public.applications set stage = 'hired' where id = 'app-rlstest-a' returning 1)
insert into test_log(line) select * from extensions.ok((select count(*) from upd) = 0, '[applications][employer_b_owner][UPDATE] *** cross-tenant *** org B cannot update org A''s application stage');
reset role;

select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.applications) = 0,
  '[applications][anon][SELECT] anonymous cannot read any application');
reset role;

-- =====================================================================
-- 7. business_listings  (blocker: confidential fields require approved NDA)
-- =====================================================================
select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_listings where id = 'biz-rlstest-public') = 1,
  '[business_listings][anon][SELECT] anon can see published, non-confidential listing');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_listings where id = 'biz-rlstest-confidential') = 0,
  '[business_listings][anon][SELECT] *** confidential *** anon CANNOT see confidential listing via direct table select');
reset role;

-- buyer with an approved+signed NDA still cannot read the raw table row directly (must go through RPC)
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','30fe1b0a-7631-4443-9bac-bb8f484a31c4',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_listings where id = 'biz-rlstest-confidential') = 0,
  '[business_listings][buyer(NDA approved)][SELECT] direct table SELECT still denied even with approved NDA -- access is RPC-mediated only (get_business_listing_public), never raw table');
reset role;

-- outsider with a pending (unapproved) NDA request
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','4ea6ad97-14c1-4de6-af58-26285a8453d2',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_listings where id = 'biz-rlstest-confidential') = 0,
  '[business_listings][outsider(NDA pending)][SELECT] pending (unapproved) NDA request grants no table access');
reset role;

-- owner sees own confidential listing fully
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','d792e6c2-1cde-482d-af44-45a0044addaf',true);
insert into test_log(line) select * from extensions.ok(
  (select exact_address from public.business_listings where id = 'biz-rlstest-confidential') = '456 Vault Ave',
  '[business_listings][seller(owner)][SELECT] owner sees full confidential fields on own listing');
reset role;

-- =====================================================================
-- 7b. RPC layer: get_business_listing_public — the sanctioned confidential-field gate
-- =====================================================================
select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok(
  (select public.get_business_listing_public('biz-rlstest-confidential') ? 'seller_contact_email') = false,
  '[RPC get_business_listing_public][anon] confidential fields (seller_contact_email etc.) stripped for anonymous caller');
insert into test_log(line) select * from extensions.ok(
  (select public.get_business_listing_public('biz-rlstest-confidential') ? 'title') = true,
  '[RPC get_business_listing_public][anon] non-confidential fields (title) still present (redacted, not null)');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','4ea6ad97-14c1-4de6-af58-26285a8453d2',true);
insert into test_log(line) select * from extensions.ok(
  (select public.get_business_listing_public('biz-rlstest-confidential') ? 'seller_contact_email') = false,
  '[RPC get_business_listing_public][outsider, NDA pending] confidential fields still stripped without APPROVED + signed NDA');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','30fe1b0a-7631-4443-9bac-bb8f484a31c4',true);
insert into test_log(line) select * from extensions.ok(
  (select public.get_business_listing_public('biz-rlstest-confidential') ->> 'seller_contact_email') = 'seller-secret@example.com',
  '[RPC get_business_listing_public][buyer, NDA approved+signed] confidential fields ARE revealed via the sanctioned RPC after approval -- this is the correct/only path');
reset role;

-- =====================================================================
-- 8. business_access_requests  (*** CRITICAL FINDING: buyer self-approval ***)
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','4ea6ad97-14c1-4de6-af58-26285a8453d2',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_access_requests where buyer_user_id = '4ea6ad97-14c1-4de6-af58-26285a8453d2') = 1,
  '[business_access_requests][outsider][SELECT] buyer can see own (pending) request');
-- RLS policy "Buyers can sign their own NDA" is column-unrestricted by itself, BUT a BEFORE UPDATE
-- trigger (enforce_business_access_request_update_boundary) adds defense-in-depth on top of RLS.
insert into test_log(line) select * from extensions.throws_ok(
  $$update public.business_access_requests set status = 'approved', nda_signed = true where id = 'bar-rlstest-pending' and buyer_user_id = '4ea6ad97-14c1-4de6-af58-26285a8453d2'$$,
  NULL::char(5), NULL::text,
  '[business_access_requests][outsider][UPDATE] GOOD: buyer self-approving (status=approved) is blocked -- RLS policy alone is column-unrestricted, but a BEFORE UPDATE trigger (enforce_business_access_request_update_boundary) closes the gap. Defense-in-depth confirmed, not a vulnerability.'
);
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.business_access_requests set nda_signed = true where id = 'bar-rlstest-pending' and buyer_user_id = '4ea6ad97-14c1-4de6-af58-26285a8453d2'$$,
  '[business_access_requests][outsider][UPDATE] buyer legitimately CAN set nda_signed on their own request (the trigger allows this field) without touching status');
reset role;

insert into test_log(line) select * from extensions.ok(
  (select status from public.business_access_requests where id = 'bar-rlstest-pending') = 'pending',
  '[business_access_requests] post-check: outsider''s request status is still "pending" (self-approval attempt was blocked)');

-- listing owner can approve
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','d792e6c2-1cde-482d-af44-45a0044addaf',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.business_access_requests set status = 'rejected', seller_response_notes = 'rls test rejection' where id = 'bar-rlstest-pending'$$,
  '[business_access_requests][seller(listing owner)][UPDATE] listing owner CAN respond to (reject) a request for their listing');
reset role;

-- a non-owner, non-buyer cannot see or touch the request at all
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_access_requests where id = 'bar-rlstest-approved') = 0,
  '[business_access_requests][unrelated employer][SELECT] unrelated party cannot see other buyer/seller''s NDA request');
reset role;

-- =====================================================================
-- 9. audit_logs
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.audit_logs where organization_id = 'org-rlstest-a') = 1,
  '[audit_logs][employer_a_owner][SELECT] org admin can see own org audit logs');
insert into test_log(line) select * from extensions.throws_ok(
  $$insert into public.audit_logs (id, user_id, organization_id, action, resource_type, resource_id) values ('audit-rlstest-fake', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'org-rlstest-a', 'fake.action', 'x', 'x')$$,
  NULL::char(5), NULL::text,
  '[audit_logs][employer_a_owner][INSERT] authenticated users (even org admins) CANNOT directly insert audit log rows -- service_role only, correctly enforced'
);
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.audit_logs where organization_id = 'org-rlstest-a') = 0,
  '[audit_logs][employer_b_owner][SELECT] *** cross-tenant *** org B admin cannot see org A audit logs');
reset role;

-- =====================================================================
-- 10. verification_audits / verification_requests (admin + officer overrides)
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.verification_audits where organization_id = 'org-rlstest-a') = 1,
  '[verification_audits][employer_a_owner][SELECT] org admin can see own verification audit');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.verification_audits where organization_id = 'org-rlstest-a') = 0,
  '[verification_audits][employer_b_owner][SELECT] *** cross-tenant *** org B cannot see org A verification audit');
reset role;

-- platform_admin override: can see ALL verification audits, including org A/B
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bf5d40a-bbc1-4fc9-958f-fb98cc363ce6',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.verification_audits where organization_id = 'org-rlstest-a') = 1,
  '[verification_audits][platform_admin][SELECT] *** override works *** platform_admin can see any org''s verification audit');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.verification_requests) >= 1,
  '[verification_requests][platform_admin][SELECT] *** override works *** platform_admin can see all verification requests');
reset role;

-- verification_officer negative test: should NOT be able to edit business listings directly
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','d0113703-ef4a-437c-a2ca-e2333b0ea145',true);
with upd as (update public.business_listings set moderation_status = 'approved_by_officer' where id = 'biz-rlstest-public' returning 1)
insert into test_log(line) select * from extensions.ok(
  (select count(*) from upd) = 0,
  '[business_listings][verification_officer][UPDATE] *** negative case *** verification_officer (not owner) CANNOT edit a business listing directly');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.verification_audits where organization_id = 'org-rlstest-a') = 0,
  '[verification_audits][verification_officer][SELECT] *** FINDING *** verification_officer has NO RLS grant to view verification audits at all (only platform_admin does) -- table-level RLS does not implement the officer role');
reset role;

-- verification_officer via the sanctioned RPC (review_verification_request) -- does the override actually work for officers?
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','d0113703-ef4a-437c-a2ca-e2333b0ea145',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$select public.review_verification_request('vreq-rlstest-a', 'verified', 'officer approving', null)$$,
  NULL::char(5), NULL::text,
  '[RPC review_verification_request][verification_officer] *** FINDING *** RPC raises "Only platform administrators..." for verification_officer -- app permissionMatrix.ts allows verification_officer here but the DB function does not, a real enforcement gap between layers'
);
reset role;

-- platform_admin via the RPC works
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bf5d40a-bbc1-4fc9-958f-fb98cc363ce6',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$select public.review_verification_request('vreq-rlstest-a', 'verified', 'admin approving', null)$$,
  '[RPC review_verification_request][platform_admin] *** override works *** platform_admin can review/approve a verification request');
reset role;

-- =====================================================================
-- 11. conversations / conversation_participants / direct_messages
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.conversations where id = 'conv-rlstest-1') = 1,
  '[conversations][participant][SELECT] participant can see own conversation');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.direct_messages where conversation_id = 'conv-rlstest-1') = 1,
  '[direct_messages][participant][SELECT] participant can see messages in own conversation');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.conversations where id = 'conv-rlstest-1') = 0,
  '[conversations][non-participant][SELECT] non-participant cannot see conversation');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.direct_messages where conversation_id = 'conv-rlstest-1') = 0,
  '[direct_messages][non-participant][SELECT] non-participant cannot see conversation''s messages');
reset role;

-- =====================================================================
-- 12. user_blocks
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$insert into public.user_blocks (id, blocking_user_id, blocked_user_id, reason) values ('block-rlstest-1', 'e1a04c8f-5378-4703-b293-4c71f95946fa', '4ea6ad97-14c1-4de6-af58-26285a8453d2', 'rls test')$$,
  '[user_blocks][seeker_a][INSERT] user can block another user as themselves');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','a866154d-2098-4449-a187-02e6f8596306',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.user_blocks where blocking_user_id = 'e1a04c8f-5378-4703-b293-4c71f95946fa') = 0,
  '[user_blocks][other user][SELECT] cannot see another user''s block list');
reset role;

-- =====================================================================
-- 13. content_reports
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$insert into public.content_reports (id, report_type, target_id, target_title_or_name, reporter_user_id, reporter_name, reporter_email, reason, details) values ('report-rlstest-direct', 'opportunity', 'opp-rlstest-a-published', 'x', 'e1a04c8f-5378-4703-b293-4c71f95946fa', 'x', 'x@example.com', 'spam', 'x')$$,
  NULL::char(5), NULL::text,
  '[content_reports][seeker_a][INSERT] direct table INSERT is denied -- must use submit_content_report RPC (prevents spoofed reporter fields)'
);
insert into test_log(line) select * from extensions.lives_ok(
  $$select public.submit_content_report('report-rlstest-1', 'opportunity', 'opp-rlstest-a-published', 'RLS Test Published Job', 'spam', 'rls test report', '[]'::jsonb)$$,
  '[RPC submit_content_report][seeker_a] sanctioned RPC path works for filing a report');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.content_reports where id = 'report-rlstest-1') = 1,
  '[content_reports][seeker_a][SELECT] reporter can see own report after filing via RPC');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','a866154d-2098-4449-a187-02e6f8596306',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.content_reports where id = 'report-rlstest-1') = 0,
  '[content_reports][other user][SELECT] cannot see another user''s report');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bf5d40a-bbc1-4fc9-958f-fb98cc363ce6',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.content_reports where id = 'report-rlstest-1') = 1,
  '[content_reports][platform_admin][SELECT] *** override works *** platform_admin can see all reports');
reset role;

-- =====================================================================
-- 14. account_restrictions (*** blocker: suspended account ***)
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','daf8fe74-1b3e-4fca-83f4-178006bc6179',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.account_restrictions where user_id = 'daf8fe74-1b3e-4fca-83f4-178006bc6179') = 1,
  '[account_restrictions][suspended user][SELECT] suspended user can see their own restriction record');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','a866154d-2098-4449-a187-02e6f8596306',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.account_restrictions where user_id = 'daf8fe74-1b3e-4fca-83f4-178006bc6179') = 0,
  '[account_restrictions][other user][SELECT] cannot see someone else''s restriction record');
reset role;

-- *** THE HEADLINE TEST: does a suspended user's session still pass RLS on ordinary tables? ***
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','daf8fe74-1b3e-4fca-83f4-178006bc6179',true);
insert into test_log(line) select * from extensions.ok(
  (select account_status from public.users where id = 'daf8fe74-1b3e-4fca-83f4-178006bc6179') = 'suspended',
  '[users][suspended user][SELECT] sanity: fixture user really is account_status=suspended');
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.users where id = 'daf8fe74-1b3e-4fca-83f4-178006bc6179') = 1,
  '[users][suspended user][SELECT] *** CRITICAL FINDING *** suspended user''s authenticated session STILL passes RLS and can read their own user row (no RLS policy anywhere checks account_status)');
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.users set full_name = 'RLS Suspended User (still editing!)' where id = 'daf8fe74-1b3e-4fca-83f4-178006bc6179'$$,
  '[users][suspended user][UPDATE] *** CRITICAL FINDING *** suspended user can still UPDATE their own profile via direct table access -- RLS has no account_status gate; suspension is enforced only in the TypeScript app layer (permissionEngine.ts), not at the database');
insert into test_log(line) select * from extensions.lives_ok(
  $$insert into public.applications (id, opportunity_id, applicant_user_id, organization_id, applicant_full_name, applicant_email, stage) values ('app-rlstest-suspended', 'opp-rlstest-a-published', 'daf8fe74-1b3e-4fca-83f4-178006bc6179', 'org-rlstest-a', 'RLS Suspended User', 'rlstest-suspended@example.com', 'submitted')$$,
  '[applications][suspended user][INSERT] *** CRITICAL FINDING *** a suspended user can still submit a job application via direct API call -- RLS does not block suspended accounts from writing');
reset role;

-- =====================================================================
-- 15. suspicious_activity_events
-- =====================================================================
insert into public.suspicious_activity_events (id, actor_user_id, event_type, severity, description)
values ('sae-rlstest-1', 'e1a04c8f-5378-4703-b293-4c71f95946fa', 'multiple_failed_logins', 'medium', 'rls test event');

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.suspicious_activity_events where id = 'sae-rlstest-1') = 0,
  '[suspicious_activity_events][actor themselves][SELECT] even the actor of the event cannot see it -- platform_admin only, correctly locked down');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bf5d40a-bbc1-4fc9-958f-fb98cc363ce6',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.suspicious_activity_events where id = 'sae-rlstest-1') = 1,
  '[suspicious_activity_events][platform_admin][SELECT] *** override works *** platform_admin can see suspicious activity events');
reset role;

-- =====================================================================
-- 16. organization_subscriptions
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','9c7b6175-bdd8-42f7-af17-76dfce58863d',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_subscriptions where organization_id = 'org-rlstest-a') = 1,
  '[organization_subscriptions][employer_a_member][SELECT] plain org member can VIEW org subscription');
with upd as (update public.organization_subscriptions set tier = 'enterprise' where organization_id = 'org-rlstest-a' returning 1)
insert into test_log(line) select * from extensions.ok(
  (select count(*) from upd) = 0,
  '[organization_subscriptions][employer_a_member][UPDATE] plain member CANNOT change subscription tier (RLS silently filters the row; no exception, 0 rows affected -- not a throws_ok case)');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_subscriptions where organization_id = 'org-rlstest-a') = 0,
  '[organization_subscriptions][employer_b_owner][SELECT] *** cross-tenant *** org B cannot see org A''s subscription');
reset role;

-- =====================================================================
-- 17. business_saved_listings
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','30fe1b0a-7631-4443-9bac-bb8f484a31c4',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$insert into public.business_saved_listings (user_id, listing_id) values ('30fe1b0a-7631-4443-9bac-bb8f484a31c4', 'biz-rlstest-public')$$,
  '[business_saved_listings][buyer][INSERT] user can save a listing for themselves');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','4ea6ad97-14c1-4de6-af58-26285a8453d2',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_saved_listings where user_id = '30fe1b0a-7631-4443-9bac-bb8f484a31c4') = 0,
  '[business_saved_listings][other user][SELECT] cannot see another user''s saved listings');
reset role;

-- =====================================================================
-- 18. business_inquiries
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','30fe1b0a-7631-4443-9bac-bb8f484a31c4',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$insert into public.business_inquiries (id, listing_id, sender_user_id, sender_name, sender_email, message) values ('inq-rlstest-spoof', 'biz-rlstest-public', '4ea6ad97-14c1-4de6-af58-26285a8453d2', 'spoofed', 'spoof@example.com', 'x')$$,
  NULL::char(5), NULL::text,
  '[business_inquiries][buyer][INSERT] cannot spoof sender_user_id as someone else (WITH CHECK enforced)'
);
insert into test_log(line) select * from extensions.lives_ok(
  $$insert into public.business_inquiries (id, listing_id, sender_user_id, sender_name, sender_email, message) values ('inq-rlstest-1', 'biz-rlstest-public', '30fe1b0a-7631-4443-9bac-bb8f484a31c4', 'RLS Buyer', 'rlstest-buyer@example.com', 'Interested in this business')$$,
  '[business_inquiries][buyer][INSERT] can send inquiry as themselves');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','4ea6ad97-14c1-4de6-af58-26285a8453d2',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_inquiries where id = 'inq-rlstest-1') = 0,
  '[business_inquiries][unrelated user][SELECT] non-sender, non-owner cannot view the inquiry');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','d792e6c2-1cde-482d-af44-45a0044addaf',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.business_inquiries where id = 'inq-rlstest-1') = 1,
  '[business_inquiries][seller(listing owner)][SELECT] listing owner can view inquiries about their listing');
reset role;

-- =====================================================================
-- 19. organization_invitations
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','9c7b6175-bdd8-42f7-af17-76dfce58863d',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$insert into public.organization_invitations (id, organization_id, inviter_user_id, invitee_email, org_role, token, expires_at) values ('inv-rlstest-fail', 'org-rlstest-a', '9c7b6175-bdd8-42f7-af17-76dfce58863d', 'someone@example.com', 'member', 'tok-rlstest-fail', now() + interval '7 days')$$,
  NULL::char(5), NULL::text,
  '[organization_invitations][employer_a_member][INSERT] plain member WITHOUT members.invite permission cannot create an invitation'
);
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.lives_ok(
  $$insert into public.organization_invitations (id, organization_id, inviter_user_id, invitee_email, org_role, token, expires_at) values ('inv-rlstest-1', 'org-rlstest-a', '7c2f3e71-1dc7-4541-9c82-296d25fd0900', 'rlstest-seeker-b@example.com', 'member', 'tok-rlstest-1', now() + interval '7 days')$$,
  '[organization_invitations][employer_a_owner][INSERT] org owner/admin can create an invitation');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','5bcc7834-3bdb-4541-a376-e59ed909a032',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_invitations where organization_id = 'org-rlstest-a') = 0,
  '[organization_invitations][employer_b_owner][SELECT] *** cross-tenant *** org B cannot see org A''s invitations');
reset role;

-- seeker_b is the invitee by email -- can see the invitation addressed to them
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','a866154d-2098-4449-a187-02e6f8596306',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_invitations where id = 'inv-rlstest-1') = 1,
  '[organization_invitations][invitee by email][SELECT] invitee can see invitation addressed to their own email');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.ok(
  (select count(*) from public.organization_invitations where id = 'inv-rlstest-1') = 0,
  '[organization_invitations][unrelated user][SELECT] a user who is not the invitee cannot see the invitation');
reset role;

-- =====================================================================
-- 20. Guest/anonymous deny-by-default sweep across sensitive tables
-- =====================================================================
select set_config('role','anon',true), set_config('request.jwt.claim.sub','',true);
insert into test_log(line) select * from extensions.ok((select count(*) from public.organization_memberships) = 0, '[organization_memberships][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.applications) = 0, '[applications][anon][SELECT] deny-by-default for anon (re-check)');
insert into test_log(line) select * from extensions.ok((select count(*) from public.business_access_requests) = 0, '[business_access_requests][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.audit_logs) = 0, '[audit_logs][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.verification_audits) = 0, '[verification_audits][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.verification_requests) = 0, '[verification_requests][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.account_restrictions) = 0, '[account_restrictions][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.suspicious_activity_events) = 0, '[suspicious_activity_events][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.content_reports) = 0, '[content_reports][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.conversations) = 0, '[conversations][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.direct_messages) = 0, '[direct_messages][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.user_blocks) = 0, '[user_blocks][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.organization_invitations) = 0, '[organization_invitations][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.organization_subscriptions) = 0, '[organization_subscriptions][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.business_saved_listings) = 0, '[business_saved_listings][anon][SELECT] deny-by-default for anon');
insert into test_log(line) select * from extensions.ok((select count(*) from public.business_inquiries) = 0, '[business_inquiries][anon][SELECT] deny-by-default for anon');
reset role;

-- =====================================================================
-- 21. Boundary triggers: applicant self-withdrawal, invitation accept/decline,
--     sole-owner invariant, blocked-user messaging (defense-in-depth beyond RLS)
-- =====================================================================
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','e1a04c8f-5378-4703-b293-4c71f95946fa',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$update public.applications set internal_rating = 5 where id = 'app-rlstest-a'$$,
  NULL::char(5), NULL::text,
  '[applications][seeker_a][UPDATE] *** boundary trigger *** applicant cannot self-edit employer-managed fields (internal_rating) even though RLS UPDATE policy would otherwise allow it'
);
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.applications set stage = 'withdrawn' where id = 'app-rlstest-a'$$,
  '[applications][seeker_a][UPDATE] applicant CAN withdraw their own application (only allowed self-edit)');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','a866154d-2098-4449-a187-02e6f8596306',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$update public.organization_invitations set org_role = 'admin' where id = 'inv-rlstest-1'$$,
  NULL::char(5), NULL::text,
  '[organization_invitations][invitee][UPDATE] *** boundary trigger *** invitee cannot escalate their own invited org_role to admin'
);
insert into test_log(line) select * from extensions.lives_ok(
  $$update public.organization_invitations set status = 'accepted' where id = 'inv-rlstest-1'$$,
  '[organization_invitations][invitee][UPDATE] invitee CAN accept their own invitation (only allowed self-edit)');
reset role;

select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','7c2f3e71-1dc7-4541-9c82-296d25fd0900',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$update public.organization_memberships set org_role = 'member' where id = 'mem-rlstest-a-owner'$$,
  NULL::char(5), NULL::text,
  '[organization_memberships][sole owner][UPDATE] *** boundary trigger *** cannot demote the sole active owner of an org (enforce_owner_invariant)'
);
reset role;

-- seeker_a already blocked the outsider (block-rlstest-1, inserted earlier). Confirm the outsider
-- cannot message seeker_a once blocked (enforce_no_messages_between_blocked_users trigger).
select set_config('role','authenticated',true), set_config('request.jwt.claim.sub','4ea6ad97-14c1-4de6-af58-26285a8453d2',true);
insert into test_log(line) select * from extensions.throws_ok(
  $$insert into public.direct_messages (id, conversation_id, sender_id, recipient_id, body) values ('msg-rlstest-blocked', 'conv-rlstest-blocked', '4ea6ad97-14c1-4de6-af58-26285a8453d2', 'e1a04c8f-5378-4703-b293-4c71f95946fa', 'trying to message despite block')$$,
  NULL::char(5), NULL::text,
  '[direct_messages][blocked sender][INSERT] *** boundary trigger *** a user who has been blocked by the recipient cannot send them a message (enforce_no_messages_between_blocked_users)'
);
reset role;

-- =====================================================================
-- FINAL: dump the log
-- =====================================================================
select line from test_log order by seq;

rollback;
