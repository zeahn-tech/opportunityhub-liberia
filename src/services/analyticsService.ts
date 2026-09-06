import { db } from '../db/dbClient';
import { storageAdapter } from '../db/storageAdapter';
import { 
  Application, 
  BusinessListing, 
  Opportunity, 
  Organization, 
  User, 
  OrganizationSubscription,
  BusinessAccessRequest
} from '../types';

export interface PlatformAnalytics {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    byCounty: Record<string, number>;
    growthOverTime: Array<{ month: string; count: number }>;
  };
  organizations: {
    total: number;
    byType: Record<string, number>;
    verifiedCount: number;
    unverifiedCount: number;
  };
  jobs: {
    total: number;
    byWorkplaceModel: Record<string, number>;
    byEmploymentType: Record<string, number>;
    byCounty: Record<string, number>;
  };
  applications: {
    total: number;
    byStage: Record<string, number>;
    funnel: {
      applied: number;
      under_review: number;
      shortlisted: number;
      interviewed: number;
      offered: number;
      hired: number;
    };
    successRate: number; // hired / total %
  };
  opportunities: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  businessListings: {
    total: number;
    byStatus: Record<string, number>;
    byIndustry: Record<string, number>;
    averageAskingPrice: number;
    medianAskingPrice: number;
  };
  revenue: {
    totalRevenueUSD: number;
    monthlyRecurringRevenueUSD: number;
    byTier: Record<string, number>;
    byCycle: Record<string, number>;
    history: Array<{ month: string; revenue: number }>;
  };
  subscriptions: {
    total: number;
    active: number;
    byTier: Record<string, number>;
  };
  engagement: {
    totalViews: number;
    totalMessages: number;
    jobApplicationRate: number; // applications per vacancy
    averageInquiriesPerListing: number;
  };
}

export interface EmployerAnalytics {
  jobViews: number;
  applicationsCount: number;
  shortlistCount: number;
  interviewCount: number;
  hiringOutcomes: {
    offersMade: number;
    candidatesHired: number;
    rejectionRate: number; // rejected / total %
    offerAcceptanceRate: number; // hired / offersMade %
  };
  jobPerformanceList: Array<{
    id: string;
    title: string;
    views: number;
    applications: number;
    status: string;
  }>;
}

export interface BusinessMarketplaceAnalytics {
  listingViews: number;
  savesCount: number;
  buyerInquiries: number;
  conversionMetrics: {
    ndaRequestsTotal: number;
    ndaApprovedCount: number;
    inquiryConversionRate: number; // inquiries to deal status %
    savesToInquiriesRate: number; // inquiries / saves %
  };
  listingPerformanceList: Array<{
    id: string;
    title: string;
    views: number;
    saves: number;
    inquiries: number;
    status: string;
  }>;
}

export const analyticsService = {
  getPlatformAnalytics(): PlatformAnalytics {
    const users = db.getUsers() || [];
    const orgs = db.getOrganizations() || [];
    const opps = db.getOpportunities() || [];
    const apps = db.getApplications() || [];
    const businesses = db.getBusinesses() || [];
    const subs = storageAdapter.getItem<OrganizationSubscription[]>('subscriptions') || [];
    const messages = storageAdapter.getItem<any[]>('direct_messages') || [];

    // User roles & statuses
    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byCounty: Record<string, number> = {};
    users.forEach(u => {
      byRole[u.primaryRole] = (byRole[u.primaryRole] || 0) + 1;
      byStatus[u.accountStatus] = (byStatus[u.accountStatus] || 0) + 1;
      if (u.primaryCounty) {
        byCounty[u.primaryCounty] = (byCounty[u.primaryCounty] || 0) + 1;
      }
    });

    // Mock User growth history
    const growthOverTime = [
      { month: 'Jun 2026', count: Math.max(10, Math.floor(users.length * 0.4)) },
      { month: 'Jul 2026', count: Math.max(25, Math.floor(users.length * 0.65)) },
      { month: 'Aug 2026', count: Math.max(40, Math.floor(users.length * 0.85)) },
      { month: 'Sep 2026', count: users.length }
    ];

    // Organizations types and verification status
    const orgByType: Record<string, number> = {};
    let verifiedOrgs = 0;
    orgs.forEach(o => {
      const type = o.type || 'private_company';
      orgByType[type] = (orgByType[type] || 0) + 1;
      if (o.isVerified) verifiedOrgs++;
    });

    // Jobs (Opps with type 'job')
    const jobs = opps.filter(o => o.type === 'job');
    const workplaceModel: Record<string, number> = {};
    const employmentType: Record<string, number> = {};
    const jobCounty: Record<string, number> = {};
    jobs.forEach(j => {
      if (j.workplaceModel) workplaceModel[j.workplaceModel] = (workplaceModel[j.workplaceModel] || 0) + 1;
      if (j.employmentType) employmentType[j.employmentType] = (employmentType[j.employmentType] || 0) + 1;
      if (j.county) jobCounty[j.county] = (jobCounty[j.county] || 0) + 1;
    });

    // Opportunities
    const oppByType: Record<string, number> = {};
    const oppByStatus: Record<string, number> = {};
    opps.forEach(o => {
      oppByType[o.type] = (oppByType[o.type] || 0) + 1;
      oppByStatus[o.status] = (oppByStatus[o.status] || 0) + 1;
    });

    // Applications & conversion funnel
    const appByStage: Record<string, number> = {};
    const funnel = {
      applied: 0,
      under_review: 0,
      shortlisted: 0,
      interviewed: 0,
      offered: 0,
      hired: 0
    };

    apps.forEach(a => {
      appByStage[a.stage] = (appByStage[a.stage] || 0) + 1;
      funnel.applied++;
      if (['under_review', 'shortlisted', 'interview', 'offer', 'hired'].includes(a.stage)) {
        funnel.under_review++;
      }
      if (['shortlisted', 'interview', 'offer', 'hired'].includes(a.stage)) {
        funnel.shortlisted++;
      }
      if (['interview', 'offer', 'hired'].includes(a.stage)) {
        funnel.interviewed++;
      }
      if (['offer', 'hired'].includes(a.stage)) {
        funnel.offered++;
      }
      if (a.stage === 'hired') {
        funnel.hired++;
      }
    });

    const successRate = apps.length > 0 ? Math.round((funnel.hired / apps.length) * 100) : 0;

    // Business Listings
    const bizByStatus: Record<string, number> = {};
    const bizByIndustry: Record<string, number> = {};
    let totalAskingPrice = 0;
    const prices: number[] = [];

    businesses.forEach(b => {
      const status = b.moderationStatus || 'published';
      bizByStatus[status] = (bizByStatus[status] || 0) + 1;
      bizByIndustry[b.industry] = (bizByIndustry[b.industry] || 0) + 1;
      if (b.askingPriceUSD) {
        totalAskingPrice += b.askingPriceUSD;
        prices.push(b.askingPriceUSD);
      }
    });

    const averageAskingPrice = prices.length > 0 ? Math.round(totalAskingPrice / prices.length) : 0;
    prices.sort((a, b) => a - b);
    const medianAskingPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;

    // Revenue from active subscriptions
    let mrr = 0;
    const byTier: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
    const byCycle: Record<string, number> = { monthly: 0, annual: 0 };

    subs.forEach(s => {
      if (s.status === 'active') {
        const tier = s.planId === 'plan-pro' ? 'pro' : s.planId === 'plan-enterprise' ? 'enterprise' : 'free';
        byTier[tier]++;
        const cycle = s.billingCycle || 'monthly';
        byCycle[cycle]++;

        let cost = 0;
        if (s.planId === 'plan-pro') cost = 120;
        if (s.planId === 'plan-enterprise') cost = 480;
        
        mrr += cost;
      }
    });

    // Total captured revenue (mrr + historic simulation logs)
    const history = [
      { month: 'Jun 2026', revenue: Math.max(300, Math.floor(mrr * 0.4)) },
      { month: 'Jul 2026', revenue: Math.max(800, Math.floor(mrr * 0.6)) },
      { month: 'Aug 2026', revenue: Math.max(1400, Math.floor(mrr * 0.85)) },
      { month: 'Sep 2026', revenue: mrr }
    ];
    const totalRevenueUSD = history.reduce((sum, item) => sum + item.revenue, 0);

    // Engagement
    const totalViews = opps.reduce((sum, o) => sum + (o.viewsCount || 0), 0) + 
                       businesses.reduce((sum, b) => sum + (b.viewsCount || 0), 0);
    const totalInquiries = businesses.reduce((sum, b) => sum + (b.inquiriesCount || 0), 0);

    return {
      users: {
        total: users.length,
        byRole,
        byStatus,
        byCounty,
        growthOverTime
      },
      organizations: {
        total: orgs.length,
        byType: orgByType,
        verifiedCount: verifiedOrgs,
        unverifiedCount: orgs.length - verifiedOrgs
      },
      jobs: {
        total: jobs.length,
        byWorkplaceModel: workplaceModel,
        byEmploymentType: employmentType,
        byCounty: jobCounty
      },
      applications: {
        total: apps.length,
        byStage: appByStage,
        funnel,
        successRate
      },
      opportunities: {
        total: opps.length,
        byType: oppByType,
        byStatus: oppByStatus
      },
      businessListings: {
        total: businesses.length,
        byStatus: bizByStatus,
        byIndustry: bizByIndustry,
        averageAskingPrice,
        medianAskingPrice
      },
      revenue: {
        totalRevenueUSD,
        monthlyRecurringRevenueUSD: mrr,
        byTier,
        byCycle,
        history
      },
      subscriptions: {
        total: subs.length,
        active: subs.filter(s => s.status === 'active').length,
        byTier
      },
      engagement: {
        totalViews,
        totalMessages: messages.length,
        jobApplicationRate: jobs.length > 0 ? Math.round((apps.length / jobs.length) * 10) / 10 : 0,
        averageInquiriesPerListing: businesses.length > 0 ? Math.round((totalInquiries / businesses.length) * 10) / 10 : 0
      }
    };
  },

  getEmployerAnalytics(organizationId: string): EmployerAnalytics {
    const opps = db.getOpportunities() || [];
    const apps = db.getApplications() || [];

    // Tenant isolation: filter opportunities and applications for this employer organization
    const orgOpps = opps.filter(o => o.organizationId === organizationId);
    const orgOppIds = orgOpps.map(o => o.id);
    const orgApps = apps.filter(a => orgOppIds.includes(a.opportunityId));

    let jobViews = 0;
    orgOpps.forEach(o => {
      jobViews += o.viewsCount || 0;
    });

    let shortlistCount = 0;
    let interviewCount = 0;
    let offersMade = 0;
    let candidatesHired = 0;
    let rejectedCount = 0;

    orgApps.forEach(a => {
      if (a.stage === 'shortlisted') shortlistCount++;
      if (a.stage === 'interview') interviewCount++;
      if (a.stage === 'offer') offersMade++;
      if (a.stage === 'hired') {
        candidatesHired++;
        offersMade++; // standard flow
      }
      if (a.stage === 'rejected') rejectedCount++;
    });

    const rejectionRate = orgApps.length > 0 ? Math.round((rejectedCount / orgApps.length) * 100) : 0;
    const offerAcceptanceRate = offersMade > 0 ? Math.round((candidatesHired / offersMade) * 100) : 100;

    const jobPerformanceList = orgOpps.map(o => {
      const oppApps = orgApps.filter(a => a.opportunityId === o.id);
      return {
        id: o.id,
        title: o.title,
        views: o.viewsCount || 0,
        applications: oppApps.length,
        status: o.status
      };
    });

    return {
      jobViews,
      applicationsCount: orgApps.length,
      shortlistCount,
      interviewCount,
      hiringOutcomes: {
        offersMade,
        candidatesHired,
        rejectionRate,
        offerAcceptanceRate
      },
      jobPerformanceList
    };
  },

  getBusinessMarketplaceAnalytics(ownerUserId?: string): BusinessMarketplaceAnalytics {
    const businesses = db.getBusinesses() || [];
    const ndaRequests = storageAdapter.getItem<BusinessAccessRequest[]>('business_nda_requests') || [];

    // Filter to listings owned by the user (or all if platform overview requested)
    const activeBusinesses = ownerUserId 
      ? businesses.filter(b => b.ownerUserId === ownerUserId)
      : businesses;

    const activeBizIds = activeBusinesses.map(b => b.id);

    let listingViews = 0;
    let savesCount = 0;
    let buyerInquiries = 0;

    activeBusinesses.forEach(b => {
      listingViews += b.viewsCount || 0;
      savesCount += b.savedByUsers?.length || 0;
      buyerInquiries += b.inquiriesCount || 0;
    });

    const activeNdas = ndaRequests.filter(r => activeBizIds.includes(r.businessId));
    const ndaRequestsTotal = activeNdas.length;
    const ndaApprovedCount = activeNdas.filter(r => r.status === 'approved').length;

    // Conversion: count sold/under offer vs total
    const underOfferOrSold = activeBusinesses.filter(b => b.moderationStatus === 'published' && b.askingPriceUSD === 0 /* simulated status */).length;
    const inquiryConversionRate = buyerInquiries > 0 ? Math.round((underOfferOrSold / buyerInquiries) * 100) : 0;
    const savesToInquiriesRate = savesCount > 0 ? Math.round((buyerInquiries / savesCount) * 100) : 0;

    const listingPerformanceList = activeBusinesses.map(b => ({
      id: b.id,
      title: b.title,
      views: b.viewsCount || 0,
      saves: b.savedByUsers?.length || 0,
      inquiries: b.inquiriesCount || 0,
      status: b.moderationStatus || 'published'
    }));

    return {
      listingViews,
      savesCount,
      buyerInquiries,
      conversionMetrics: {
        ndaRequestsTotal,
        ndaApprovedCount,
        inquiryConversionRate,
        savesToInquiriesRate
      },
      listingPerformanceList
    };
  }
};
