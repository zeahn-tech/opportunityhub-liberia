-- Phase 3, Service 9 (final service): subscriptionService, notificationService,
-- analyticsService
--
-- Three tables/RPCs, built from scratch (subscriptions and notifications
-- had no backing tables at all; analytics was always a pure read-side
-- computation over dbClient's local arrays, never its own table).
--
-- A real design decision worth stating explicitly: getPlatformAnalytics()
-- is cross-organization by nature (it's the platform admin's dashboard).
-- If it queried opportunities/applications/organizations/etc. directly
-- through the anon client, RLS would silently restrict the results to
-- whatever the caller's own org memberships and public rows allow --
-- producing a dashboard that quietly UNDER-COUNTS everything for a real
-- platform admin, not a security leak but a data-integrity bug that
-- would be very easy to ship unnoticed (the numbers would just look
-- low, not obviously wrong). So platform-wide analytics is a single
-- SECURITY DEFINER RPC (get_platform_analytics), gated by
-- is_platform_admin(), that aggregates directly in SQL and bypasses RLS
-- deliberately and correctly for this one read-only reporting purpose.
-- Employer- and business-marketplace-scoped analytics are NOT RPCs --
-- an org member's own RLS access to their own org's opportunities/
-- applications/business listings is already complete, so those are
-- computed client-side from ordinary already-migrated queries.

-- ---------------------------------------------------------------------
-- 1. organization_subscriptions
-- ---------------------------------------------------------------------
create table if not exists public.organization_subscriptions (
  id character varying primary key,
  organization_id character varying not null references public.organizations(id) on delete cascade,
  plan_id character varying not null,
  tier character varying not null,
  status character varying not null default 'active',
  billing_cycle character varying not null default 'monthly',
  current_period_start timestamp with time zone not null default now(),
  current_period_end timestamp with time zone not null default (now() + interval '30 days'),
  cancel_at_period_end boolean not null default false,
  trial_end timestamp with time zone,
  stripe_customer_id character varying,
  stripe_subscription_id character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organization_id)
);

alter table public.organization_subscriptions enable row level security;

drop policy if exists "Org members can view their org's subscription" on public.organization_subscriptions;
create policy "Org members can view their org's subscription"
  on public.organization_subscriptions for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Org admins manage their own org's subscription record (e.g. the mock
-- checkout-fulfillment flow in dev/demo). A REAL Stripe webhook
-- integration must write via the service-role key server-side --
-- bypassing RLS entirely, not through this anon-client policy -- since
-- no ordinary authenticated user should be able to grant themselves a
-- paid tier by calling this table directly; this policy exists for the
-- org's own admin managing what the org's own billing state IS
-- (matching what dbClient.ts's local mock already allowed), not as a
-- substitute for real payment verification.
drop policy if exists "Org admins can manage their org's subscription" on public.organization_subscriptions;
create policy "Org admins can manage their org's subscription"
  on public.organization_subscriptions for insert
  to authenticated
  with check (is_org_admin(organization_id));

drop policy if exists "Org admins can update their org's subscription" on public.organization_subscriptions;
create policy "Org admins can update their org's subscription"
  on public.organization_subscriptions for update
  to authenticated
  using (is_org_admin(organization_id));

-- ---------------------------------------------------------------------
-- 2. notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id character varying primary key,
  recipient_user_id character varying not null references public.users(id) on delete cascade,
  category character varying not null,
  title character varying not null,
  message text not null,
  action_url character varying,
  context_id character varying,
  is_read boolean not null default false,
  read_at timestamp with time zone,
  delivery_channels jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Recipients can view their own notifications" on public.notifications;
create policy "Recipients can view their own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_user_id = auth.uid()::character varying);

drop policy if exists "Recipients can mark their own notifications read" on public.notifications;
create policy "Recipients can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_user_id = auth.uid()::character varying);

-- Any authenticated user can create a notification FOR another user
-- (e.g. an employer's action notifying a candidate) -- matches
-- dbClient.ts's existing unrestricted createNotification() behavior.
-- Notifications carry no confidential data of the creator's; the
-- recipient-only SELECT/UPDATE policies above are the real boundary on
-- who can ever read or dismiss them.
drop policy if exists "Authenticated users can create notifications for others" on public.notifications;
create policy "Authenticated users can create notifications for others"
  on public.notifications for insert
  to authenticated
  with check (true);

create or replace function public.enforce_notification_update_boundary()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.category is distinct from old.category
    or new.recipient_user_id is distinct from old.recipient_user_id
    or new.action_url is distinct from old.action_url
    or new.context_id is distinct from old.context_id
    or new.delivery_channels is distinct from old.delivery_channels
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only is_read/read_at may be updated on a notification.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_notification_update_boundary on public.notifications;
create trigger trg_enforce_notification_update_boundary
  before update on public.notifications
  for each row execute function public.enforce_notification_update_boundary();

-- ---------------------------------------------------------------------
-- 3. Platform-wide analytics RPC (see header comment for why this must
--    be an RPC rather than direct RLS-scoped queries).
-- ---------------------------------------------------------------------
create or replace function public.get_platform_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid character varying;
  v_result jsonb;
  v_user_count integer;
  v_org_count integer;
  v_verified_org_count integer;
  v_job_count integer;
  v_app_count integer;
  v_hired_count integer;
  v_opp_count integer;
  v_biz_count integer;
  v_avg_asking_price numeric;
  v_sub_count integer;
  v_active_sub_count integer;
  v_mrr numeric;
begin
  v_uid := auth.uid()::character varying;
  if v_uid is null or not public.is_platform_admin(v_uid) then
    raise exception 'Only platform administrators may view platform-wide analytics.' using errcode = '42501';
  end if;

  select count(*) into v_user_count from public.users;
  select count(*) into v_org_count from public.organizations;
  select count(*) into v_verified_org_count from public.organizations where is_verified = true;
  select count(*) into v_job_count from public.opportunities where opportunity_type = 'job';
  select count(*) into v_opp_count from public.opportunities;
  select count(*) into v_app_count from public.applications;
  select count(*) into v_hired_count from public.applications where stage = 'hired';
  select count(*) into v_biz_count from public.business_listings;
  select coalesce(avg(asking_price_usd), 0) into v_avg_asking_price from public.business_listings where asking_price_usd is not null;
  select count(*) into v_sub_count from public.organization_subscriptions;
  select count(*) into v_active_sub_count from public.organization_subscriptions where status in ('active', 'trialing');
  select coalesce(sum(case when billing_cycle = 'monthly' then 1 else 1.0/12 end), 0) into v_mrr
    from public.organization_subscriptions where status in ('active', 'trialing');

  v_result := jsonb_build_object(
    'users', jsonb_build_object(
      'total', v_user_count,
      'byRole', (select coalesce(jsonb_object_agg(primary_role, cnt), '{}'::jsonb) from (select primary_role, count(*) cnt from public.users group by primary_role) t),
      'byStatus', (select coalesce(jsonb_object_agg(account_status, cnt), '{}'::jsonb) from (select account_status, count(*) cnt from public.users group by account_status) t),
      'byCounty', (select coalesce(jsonb_object_agg(primary_county, cnt), '{}'::jsonb) from (select primary_county, count(*) cnt from public.users where primary_county is not null group by primary_county) t)
    ),
    'organizations', jsonb_build_object(
      'total', v_org_count,
      'byType', (select coalesce(jsonb_object_agg(type, cnt), '{}'::jsonb) from (select type, count(*) cnt from public.organizations group by type) t),
      'verifiedCount', v_verified_org_count,
      'unverifiedCount', v_org_count - v_verified_org_count
    ),
    'jobs', jsonb_build_object(
      'total', v_job_count,
      'byWorkplaceModel', (select coalesce(jsonb_object_agg(workplace_model, cnt), '{}'::jsonb) from (select workplace_model, count(*) cnt from public.opportunities where opportunity_type = 'job' group by workplace_model) t),
      'byEmploymentType', (select coalesce(jsonb_object_agg(employment_type, cnt), '{}'::jsonb) from (select employment_type, count(*) cnt from public.opportunities where opportunity_type = 'job' and employment_type is not null group by employment_type) t),
      'byCounty', (select coalesce(jsonb_object_agg(county, cnt), '{}'::jsonb) from (select county, count(*) cnt from public.opportunities where opportunity_type = 'job' group by county) t)
    ),
    'opportunities', jsonb_build_object(
      'total', v_opp_count,
      'byType', (select coalesce(jsonb_object_agg(opportunity_type, cnt), '{}'::jsonb) from (select opportunity_type, count(*) cnt from public.opportunities group by opportunity_type) t),
      'byStatus', (select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb) from (select status, count(*) cnt from public.opportunities group by status) t)
    ),
    'applications', jsonb_build_object(
      'total', v_app_count,
      'byStage', (select coalesce(jsonb_object_agg(stage, cnt), '{}'::jsonb) from (select stage, count(*) cnt from public.applications group by stage) t),
      'successRate', case when v_app_count > 0 then round((v_hired_count::numeric / v_app_count) * 100) else 0 end
    ),
    'businessListings', jsonb_build_object(
      'total', v_biz_count,
      'byStatus', (select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb) from (select status, count(*) cnt from public.business_listings group by status) t),
      'byIndustry', (select coalesce(jsonb_object_agg(industry, cnt), '{}'::jsonb) from (select industry, count(*) cnt from public.business_listings group by industry) t),
      'averageAskingPrice', round(v_avg_asking_price)
    ),
    'subscriptions', jsonb_build_object(
      'total', v_sub_count,
      'active', v_active_sub_count,
      'byTier', (select coalesce(jsonb_object_agg(tier, cnt), '{}'::jsonb) from (select tier, count(*) cnt from public.organization_subscriptions where status in ('active','trialing') group by tier) t)
    ),
    'revenueEstimate', jsonb_build_object(
      'monthlyRecurringRevenueEstimateCount', v_mrr
    ),
    'generatedAt', now()
  );

  return v_result;
end;
$$;

revoke all on function public.get_platform_analytics from public;
grant execute on function public.get_platform_analytics to authenticated;
