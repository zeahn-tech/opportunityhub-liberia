/**
 * analyticsService.ts
 *
 * Phase 3, Service 9 (final service) of the dbClient -> Supabase
 * migration (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database
 * Status", and docs/PHASE3_SERVICE9_VERIFICATION.md for the live proof).
 *
 * getPlatformAnalytics() calls get_platform_analytics(), a SECURITY
 * DEFINER RPC gated by is_platform_admin() -- deliberately, not for lack
 * of a simpler option. This dashboard is cross-organization by nature.
 * If it queried opportunities/applications/organizations/etc. directly
 * through the anon client, RLS would silently restrict the results to
 * whatever the caller's own org memberships and public rows allow --
 * producing a dashboard that quietly UNDER-COUNTS everything for a real
 * platform admin. Not a security leak, but a data-integrity bug that
 * would be very easy to ship unnoticed. The RPC aggregates directly in
 * SQL and bypasses RLS deliberately and correctly for this one read-only
 * reporting purpose, gated the same way every other platform-admin-only
 * RPC in this phase is.
 *
 * getEmployerAnalytics()/getBusinessMarketplaceAnalytics() are NOT RPCs
 * -- an org member's/business owner's own RLS access to their own
 * org's opportunities/applications/business listings is already
 * complete, so these compute their aggregates client-side from ordinary
 * already-migrated queries. No special privilege is needed or granted.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import { ForbiddenError } from '../core/errors/AppError';

export interface PlatformAnalytics {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    byCounty: Record<string, number>;
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
    successRate: number;
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
  };
  subscriptions: {
    total: number;
    active: number;
    byTier: Record<string, number>;
  };
  generatedAt: string;
}

export interface EmployerAnalytics {
  jobViews: number;
  applicationsCount: number;
  shortlistCount: number;
  interviewCount: number;
  hiringOutcomes: {
    offersMade: number;
    candidatesHired: number;
    rejectionRate: number;
    offerAcceptanceRate: number;
  };
  jobPerformanceList: Array<{ id: string; title: string; views: number; applications: number; status: string }>;
}

export interface BusinessMarketplaceAnalytics {
  listingViews: number;
  /** Always 0 -- no backing table for business saves exists yet (deferred in Service 5, see docs/PHASE3_SERVICE5_VERIFICATION.md). Not fabricated data; an honest placeholder. */
  savesCount: number;
  buyerInquiries: number;
  conversionMetrics: {
    ndaRequestsTotal: number;
    ndaApprovedCount: number;
    /** Always 0 -- depends on savesCount, which has no real data source yet. */
    savesToInquiriesRate: number;
  };
  listingPerformanceList: Array<{
    id: string;
    title: string;
    views: number;
    /** Always 0 -- see savesCount above. */
    saves: number;
    /** Always 0 -- no backing table for business inquiries exists yet (deferred in Service 5). */
    inquiries: number;
    status: string;
  }>;
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; analyticsService requires a live backend.');
  }
  return c;
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError(error.message || 'You do not have permission to view this analytics dashboard.');
  }
  throw new Error(error.message);
}

export const analyticsService = {
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const { data, error } = await client().rpc('get_platform_analytics');
    if (error) translateError(error);
    return data as PlatformAnalytics;
  },

  async getEmployerAnalytics(organizationId: string): Promise<EmployerAnalytics> {
    const [{ data: oppRows, error: oppError }, { data: appRows, error: appError }] = await Promise.all([
      client().from('opportunities').select('id, title, status, views_count').eq('organization_id', organizationId),
      client()
        .from('applications')
        .select('opportunity_id, stage, opportunities!inner(organization_id)')
        .eq('opportunities.organization_id', organizationId)
    ]);
    if (oppError) throw new Error(oppError.message);
    if (appError) throw new Error(appError.message);

    const opps = (oppRows as { id: string; title: string; status: string; views_count: number | null }[]) || [];
    const apps = (appRows as { opportunity_id: string; stage: string }[]) || [];

    let jobViews = 0;
    opps.forEach((o) => {
      jobViews += o.views_count ?? 0;
    });

    let shortlistCount = 0;
    let interviewCount = 0;
    let offersMade = 0;
    let candidatesHired = 0;
    let rejectedCount = 0;

    apps.forEach((a) => {
      if (a.stage === 'shortlisted') shortlistCount++;
      if (a.stage === 'interview') interviewCount++;
      if (a.stage === 'offer') offersMade++;
      if (a.stage === 'hired') {
        candidatesHired++;
        offersMade++;
      }
      if (a.stage === 'rejected') rejectedCount++;
    });

    const rejectionRate = apps.length > 0 ? Math.round((rejectedCount / apps.length) * 100) : 0;
    const offerAcceptanceRate = offersMade > 0 ? Math.round((candidatesHired / offersMade) * 100) : 100;

    const jobPerformanceList = opps.map((o) => ({
      id: o.id,
      title: o.title,
      views: o.views_count ?? 0,
      applications: apps.filter((a) => a.opportunity_id === o.id).length,
      status: o.status
    }));

    return {
      jobViews,
      applicationsCount: apps.length,
      shortlistCount,
      interviewCount,
      hiringOutcomes: { offersMade, candidatesHired, rejectionRate, offerAcceptanceRate },
      jobPerformanceList
    };
  },

  /**
   * `savesCount`/`inquiriesCount`/conversion-rate-by-saves are NOT
   * included here -- there is no backing table for business saves or
   * inquiries yet (deferred in Service 5's migration; see
   * docs/PHASE3_SERVICE5_VERIFICATION.md). NDA metrics use the real
   * business_access_requests table.
   */
  async getBusinessMarketplaceAnalytics(ownerUserId?: string): Promise<BusinessMarketplaceAnalytics> {
    let listingQuery = client().from('business_listings').select('id, title, status, views_count, owner_user_id');
    if (ownerUserId) listingQuery = listingQuery.eq('owner_user_id', ownerUserId);
    const { data: listingRows, error: listingError } = await listingQuery;
    if (listingError) throw new Error(listingError.message);

    const listings = (listingRows as { id: string; title: string; status: string; views_count: number | null; owner_user_id: string }[]) || [];
    const listingIds = listings.map((l) => l.id);

    let ndaRequestsTotal = 0;
    let ndaApprovedCount = 0;
    if (listingIds.length > 0) {
      const { data: ndaRows, error: ndaError } = await client()
        .from('business_access_requests')
        .select('status')
        .in('listing_id', listingIds);
      if (ndaError) throw new Error(ndaError.message);
      const ndas = (ndaRows as { status: string }[]) || [];
      ndaRequestsTotal = ndas.length;
      ndaApprovedCount = ndas.filter((n) => n.status === 'approved').length;
    }

    let listingViews = 0;
    listings.forEach((l) => {
      listingViews += l.views_count ?? 0;
    });

    const listingPerformanceList = listings.map((l) => ({
      id: l.id,
      title: l.title,
      views: l.views_count ?? 0,
      saves: 0,
      inquiries: 0,
      status: l.status
    }));

    return {
      listingViews,
      savesCount: 0,
      buyerInquiries: 0,
      conversionMetrics: { ndaRequestsTotal, ndaApprovedCount, savesToInquiriesRate: 0 },
      listingPerformanceList
    };
  }
};
