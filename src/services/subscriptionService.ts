import { OrganizationSubscription, SubscriptionPlan, SubscriptionTier, FeatureEntitlement } from '../types';
import { apiClient, ApiResponse } from './apiClient';
import { db } from '../db/dbClient';
import { SUBSCRIPTION_PLANS, getPlanById, getPlanByStripePriceId } from '../data/subscriptionPlans';
import { authService } from './authService';

export const subscriptionService = {
  async getOrganizationSubscription(organizationId: string): Promise<ApiResponse<OrganizationSubscription>> {
    return apiClient.execute(() => {
      let sub = db.getOrganizationSubscription(organizationId);
      
      if (!sub) {
        const isSeedOrg = organizationId.startsWith('org-');
        const planToUse = isSeedOrg ? getPlanById('plan_pro')! : getPlanById('plan_free')!;
        sub = {
          id: `sub-${Date.now()}`,
          organizationId,
          planId: planToUse.id,
          tier: planToUse.tier,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          updatedAt: new Date().toISOString()
        };
        db.saveOrganizationSubscription(sub);
      }
      
      return sub;
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

  async createCheckoutSession(priceId: string, organizationId: string, successUrl: string, cancelUrl: string): Promise<ApiResponse<{ url: string }>> {
    return apiClient.execute(async () => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getSession()?.token || ''}`
        },
        body: JSON.stringify({ priceId, organizationId, successUrl, cancelUrl }),
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
          'Authorization': `Bearer ${authService.getSession()?.token || ''}`
        },
        body: JSON.stringify({ customerId, returnUrl }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }
      
      return { url: data.url };
    });
  },

  async mockFulfillSubscription(organizationId: string, priceIdOrPlanId: string): Promise<ApiResponse<OrganizationSubscription>> {
    return apiClient.execute(() => {
      const plan = getPlanByStripePriceId(priceIdOrPlanId) || getPlanById(priceIdOrPlanId) || SUBSCRIPTION_PLANS[0];

      const sub: OrganizationSubscription = {
        id: `sub-mock-${Date.now()}`,
        organizationId,
        planId: plan.id,
        tier: plan.tier,
        status: 'active',
        billingCycle: priceIdOrPlanId?.includes('annual') ? 'annual' : 'monthly',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: `cus_mock_${organizationId.slice(0, 5)}`,
        stripeSubscriptionId: `sub_stripe_mock_${Date.now()}`,
        updatedAt: new Date().toISOString()
      };

      db.saveOrganizationSubscription(sub);
      return sub;
    });
  }
};
