import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Zap, Calendar, AlertCircle } from 'lucide-react';
import { SubscriptionPlan, OrganizationSubscription } from '../types';
import { SUBSCRIPTION_PLANS } from '../data/subscriptionPlans';
import { subscriptionService } from '../services/subscriptionService';
import { authService } from '../services/authService';

export const SubscriptionManager: React.FC = () => {
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const session = authService.getSession();
  const orgId = session.activeOrganization?.id;

  useEffect(() => {
    if (orgId) {
      loadSubscription(orgId);
    }
  }, [orgId]);

  const loadSubscription = async (id: string) => {
    setLoading(true);
    const res = await subscriptionService.getOrganizationSubscription(id);
    if (res.data) {
      setSubscription(res.data);
      setBillingCycle(res.data.billingCycle);
    }
    setLoading(false);
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!orgId) return;
    setProcessingId(plan.id);

    // In a real app, we would hit createCheckoutSession.
    // For this prototype, we'll hit the mock fulfiller to simulate an instant purchase.
    try {
      const priceId = billingCycle === 'annual' ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
      if (!priceId) {
        // Fallback mock logic for test environments without stripe config
        const mockRes = await subscriptionService.mockFulfillSubscription(orgId, plan.id);
        if (mockRes.data) setSubscription(mockRes.data);
      } else {
        // Here we would redirect to Stripe checkout:
        // const res = await subscriptionService.createCheckoutSession(priceId, orgId, window.location.href, window.location.href);
        // if (res.data) window.location.href = res.data.url;
        
        // Simulating the webhook fulfillment for demo purposes
        const mockRes = await subscriptionService.mockFulfillSubscription(orgId, priceId);
        if (mockRes.data) setSubscription(mockRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setProcessingId(null);
  };

  const handleManageBilling = async () => {
    if (!orgId || !subscription?.stripeCustomerId) return;
    try {
      // Simulate Stripe Customer Portal
      alert('In production, this opens the Stripe Customer Portal for managing invoices, upgrades, downgrades, and cancellations.');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Loading subscription status...</div>;
  }

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription?.planId) || SUBSCRIPTION_PLANS[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Current Status Header */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-[#E8E4D9]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-[#283618] tracking-tight">
              Recruiter Subscription & Billing
            </h2>
            <p className="text-stone-500 text-sm max-w-2xl">
              Manage your employer plans, feature entitlements, and billing history. Upgrade to unlock AI-powered matching and unlimited active vacancies.
            </p>
          </div>

          <div className="bg-[#F9F8F6] p-4 rounded-2xl border border-[#E8E4D9] min-w-[280px]">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Current Plan</span>
              {subscription?.status === 'active' || subscription?.status === 'trialing' ? (
                <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {subscription.status}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {subscription?.status || 'Inactive'}
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-[#283618] mb-4">{currentPlan.name}</div>
            
            {subscription?.tier !== 'free' && (
              <button 
                onClick={handleManageBilling}
                className="w-full px-4 py-2 bg-white border border-[#E8E4D9] rounded-xl text-sm font-semibold text-[#283618] hover:bg-[#F9F8F6] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Manage Billing & Invoices
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="space-y-6">
        <div className="flex justify-center mb-8">
          <div className="bg-[#F9F8F6] p-1 rounded-2xl border border-[#E8E4D9] inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-white shadow-sm text-[#283618]' : 'text-stone-500 hover:text-[#283618]'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                billingCycle === 'annual' ? 'bg-white shadow-sm text-[#283618]' : 'text-stone-500 hover:text-[#283618]'
              }`}
            >
              Annual Billing
              <span className="px-2 py-0.5 bg-[#FEFAE0] text-[#BC6C25] rounded-full text-[10px] uppercase tracking-wider border border-[#E8E4D9]">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = subscription?.planId === plan.id;
            const price = billingCycle === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
            const isProcessing = processingId === plan.id;

            return (
              <div 
                key={plan.id}
                className={`p-6 md:p-8 rounded-[32px] border relative flex flex-col ${
                  plan.tier === 'pro' 
                    ? 'bg-[#283618] border-[#4F772D] text-white shadow-xl scale-100 md:scale-105 z-10'
                    : 'bg-white border-[#E8E4D9] text-[#283618]'
                }`}
              >
                {plan.tier === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#BC6C25] text-white rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Recommended
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className={`text-xl font-bold font-display tracking-tight mb-2 ${plan.tier === 'pro' ? 'text-white' : ''}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm h-10 ${plan.tier === 'pro' ? 'text-stone-300' : 'text-stone-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8 flex items-end gap-1">
                  <span className={`text-4xl font-black ${plan.tier === 'pro' ? 'text-white' : 'text-[#283618]'}`}>
                    ${price}
                  </span>
                  <span className={`text-sm pb-1 font-medium ${plan.tier === 'pro' ? 'text-stone-400' : 'text-stone-400'}`}>
                    /mo
                  </span>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.tier === 'pro' ? 'text-[#A3B18A]' : 'text-[#4F772D]'}`} />
                      <span className={`text-sm font-medium ${plan.tier === 'pro' ? 'text-stone-200' : 'text-stone-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || isProcessing}
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? plan.tier === 'pro' ? 'bg-[#4F772D] text-white opacity-80 cursor-default' : 'bg-[#F9F8F6] text-stone-400 border border-[#E8E4D9] cursor-default'
                      : plan.tier === 'pro'
                        ? 'bg-white text-[#283618] hover:bg-stone-100 shadow-md'
                        : 'bg-[#283618] text-white hover:bg-[#3A4D23]'
                  }`}
                >
                  {isProcessing ? 'Processing...' : isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
