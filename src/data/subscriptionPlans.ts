import { SubscriptionPlan } from '../types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_free',
    tier: 'free',
    name: 'Free Trial',
    description: 'Perfect for small businesses making their first hire.',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Post up to 1 active job',
      'View basic candidate profiles',
      'Basic applicant tracking',
      '14-day trial period'
    ],
    entitlements: {
      maxActiveJobs: 1,
      maxCandidatesViewable: 10,
      canViewCandidateContact: false,
      canUseAI: false,
      prioritySupport: false
    }
  },
  {
    id: 'plan_basic',
    tier: 'basic',
    name: 'Starter',
    description: 'For growing teams with consistent hiring needs.',
    monthlyPrice: 49,
    annualPrice: 470, // ~20% discount
    features: [
      'Post up to 5 active jobs',
      'View unlimited candidate profiles',
      'View candidate contact info',
      'Standard email support'
    ],
    entitlements: {
      maxActiveJobs: 5,
      maxCandidatesViewable: 'unlimited',
      canViewCandidateContact: true,
      canUseAI: false,
      prioritySupport: false
    },
    stripePriceIdMonthly: process.env.VITE_STRIPE_BASIC_MONTHLY_PRICE_ID || 'price_basic_monthly',
    stripePriceIdAnnual: process.env.VITE_STRIPE_BASIC_ANNUAL_PRICE_ID || 'price_basic_annual'
  },
  {
    id: 'plan_pro',
    tier: 'pro',
    name: 'Professional',
    description: 'Advanced recruiting tools and AI matching.',
    monthlyPrice: 149,
    annualPrice: 1430, // ~20% discount
    features: [
      'Post unlimited active jobs',
      'AI-powered candidate matching',
      'Priority support',
      'Advanced analytics'
    ],
    entitlements: {
      maxActiveJobs: 'unlimited',
      maxCandidatesViewable: 'unlimited',
      canViewCandidateContact: true,
      canUseAI: true,
      prioritySupport: true
    },
    stripePriceIdMonthly: process.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    stripePriceIdAnnual: process.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual'
  }
];

export const getPlanById = (id: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
};

export const getPlanByStripePriceId = (priceIdOrPlanId: string): SubscriptionPlan | undefined => {
  if (!priceIdOrPlanId) return SUBSCRIPTION_PLANS[0];
  
  // Match by exact ID, tier, or price ID
  const match = SUBSCRIPTION_PLANS.find(
    (p) =>
      p.id === priceIdOrPlanId ||
      p.tier === priceIdOrPlanId ||
      p.stripePriceIdMonthly === priceIdOrPlanId ||
      p.stripePriceIdAnnual === priceIdOrPlanId
  );
  
  if (match) return match;

  // Partial match fallback for mock strings
  return SUBSCRIPTION_PLANS.find(
    (p) => priceIdOrPlanId.includes(p.id) || priceIdOrPlanId.includes(p.tier)
  ) || SUBSCRIPTION_PLANS[0];
};
