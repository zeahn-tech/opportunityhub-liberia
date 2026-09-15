/**
 * subscriptionService.ts
 *
 * Phase 3, Service 9 (final service) of the dbClient -> Supabase
 * migration (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database
 * Status", and docs/PHASE3_SERVICE9_VERIFICATION.md for the live proof).
 *
 * getOrganizationSubscription()/mockFulfillSubscription() read/write
 * public.organization_subscriptions directly -- RLS scopes SELECT to org
 * members and INSERT/UPDATE to org admins (see
 * supabase/migrations/20260911200000_subscription_notification_analytics_backend.sql).
 *
 * createCheckoutSession()/createPortalSession() are unchanged -- they
 * already call a server-side API route (/api/create-checkout-session,
 * /api/create-portal-session), which is the correct place for real
 * Stripe secret-key operations; nothing about those needed to change for
 * this migration, and nothing here should ever hold a Stripe secret key
 * client-side.
 *
 * IMPORTANT PRODUCTION NOTE (not addressed by this migration, and
 * explicitly not something a client-side service should do): a REAL
 * Stripe webhook confirming a completed checkout must write the
 * resulting subscription row via the service-role key on a trusted
 * server, bypassing RLS entirely -- not through this anon-client path.
 * mockFulfillSubscription() here is the dev/demo stand-in for that
 * webhook and is gated the same way dbClient.ts's local version was
 * (an org admin can grant their own org a plan), which is appropriate
 * for a mock/demo flow but would be a real vulnerability (self-service
 * free upgrades) if ever treated as the production fulfillment path.
 */

import { OrganizationSubscription, FeatureEntitlement } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { apiClient, ApiResponse } from './apiClient';
import { SUBSCRIPTION_PLANS, getPlanById, getPlanByStripePriceId } from '../data/subscriptionPlans';
import { authService } from './authService';
import { ForbiddenError, UnauthorizedError } from '../core/errors/AppError';

interface SubscriptionRow {
  id: string;
  organization_id: string;
  plan_id: string;
  tier: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string;
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; subscriptionService requires a live backend.');
  }
  return c;
}

function rowToSubscription(row: SubscriptionRow): OrganizationSubscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    tier: row.tier as OrganizationSubscription['tier'],
    status: row.status as OrganizationSubscription['status'],
    billingCycle: row.billing_cycle as OrganizationSubscription['billingCycle'],
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    trialEnd: row.trial_end ?? undefined,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    updatedAt: row.updated_at
  };
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError('You do not have permission to manage this organization\'s subscription.');
  }
  throw new Error(error.message);
}

export const subscriptionService = {
  async getOrganizationSubscription(organizationId: string): Promise<ApiResponse<OrganizationSubscription>> {
    return apiClient.execute(async () => {
      const { data, error } = await client()
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return rowToSubscription(data as SubscriptionRow);

      // Auto-provision a default plan the first time an org's
      // subscription is looked up, same as dbClient.ts used to --
      // requires the caller to be an org admin (RLS INSERT policy), same
      // as any other subscription write.
      const isSeedOrg = organizationId.startsWith('org-');
      const planToUse = isSeedOrg ? getPlanById('plan_pro')! : getPlanById('plan_free')!;
      const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { data: created, error: insertError } = await client()
        .from('organization_subscriptions')
        .insert({
          id,
          organization_id: organizationId,
          plan_id: planToUse.id,
          tier: planToUse.tier,
          status: 'active',
          billing_cycle: 'monthly'
        })
        .select('*')
        .maybeSingle();
      if (insertError) translateError(insertError);
      return rowToSubscription(created as SubscriptionRow);
    });
  },

  async getEntitlements(organizationId: string): Promise<ApiResponse<FeatureEntitlement>> {
    return apiClient.execute(async () => {
      const subRes = await this.getOrganizationSubscription(organizationId);
      if (!subRes.data) throw new Error('Subscription not found');

      const plan = getPlanById(subRes.data.planId);
      if (!plan) throw new Error('Plan not found');

      if (subRes.data.status !== 'active' && subRes.data.status !== 'trialing') {
        return getPlanById('plan_free')!.entitlements;
      }

      return plan.entitlements;
    });
  },

  async createCheckoutSession(
    priceId: string,
    organizationId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<ApiResponse<{ url: string }>> {
    return apiClient.execute(async () => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getSession()?.token || ''}`
        },
        body: JSON.stringify({ priceId, organizationId, successUrl, cancelUrl })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      return { url: data.url };
    });
  },

  async createPortalSession(customerId: string, returnUrl: string): Promise<ApiResponse<{ url: string }>> {
    return apiClient.execute(async () => {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getSession()?.token || ''}`
        },
        body: JSON.stringify({ customerId, returnUrl })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      return { url: data.url };
    });
  },

  async mockFulfillSubscription(organizationId: string, priceIdOrPlanId: string): Promise<ApiResponse<OrganizationSubscription>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) throw new UnauthorizedError('Sign in required.');

      const plan = getPlanByStripePriceId(priceIdOrPlanId) || getPlanById(priceIdOrPlanId) || SUBSCRIPTION_PLANS[0];
      const billingCycle = priceIdOrPlanId?.includes('annual') ? 'annual' : 'monthly';

      const { data: existing } = await client()
        .from('organization_subscriptions')
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle();

      const payload = {
        plan_id: plan.id,
        tier: plan.tier,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        stripe_customer_id: `cus_mock_${organizationId.slice(0, 5)}`,
        stripe_subscription_id: `sub_stripe_mock_${Date.now()}`
      };

      if (existing) {
        const { data, error } = await client()
          .from('organization_subscriptions')
          .update(payload)
          .eq('organization_id', organizationId)
          .select('*')
          .maybeSingle();
        if (error) translateError(error);
        return rowToSubscription(data as SubscriptionRow);
      }

      const id = `sub-mock-${Date.now()}`;
      const { data, error } = await client()
        .from('organization_subscriptions')
        .insert({ id, organization_id: organizationId, ...payload })
        .select('*')
        .maybeSingle();
      if (error) translateError(error);
      return rowToSubscription(data as SubscriptionRow);
    });
  }
};
