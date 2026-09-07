import React, { useMemo } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { useAuth } from '../../context/AuthContext';
import { 
  Eye, 
  Bookmark, 
  Send, 
  Lock, 
  TrendingUp, 
  CheckCircle, 
  ShieldCheck, 
  Layers, 
  Sparkles,
  Building,
  DollarSign
} from 'lucide-react';

interface BusinessAnalyticsDashboardProps {
  currentUserId?: string;
  isPlatformAdmin?: boolean;
}

export const BusinessAnalyticsDashboard: React.FC<BusinessAnalyticsDashboardProps> = ({
  currentUserId: propUserId,
  isPlatformAdmin: propIsPlatformAdmin
}) => {
  const { user } = useAuth();
  const currentUserId = propUserId !== undefined ? propUserId : (user?.id || '');
  const isPlatformAdmin = propIsPlatformAdmin !== undefined
    ? propIsPlatformAdmin
    : (user?.systemRole === 'platform_admin' || user?.primaryRole === 'platform_admin');

  // Respect tenant isolation: 
  // If the user is a platform admin, show platform-wide enterprise marketplace trends.
  // Otherwise, filter strictly to listings owned by the logged-in seller.
  const metrics = useMemo(() => {
    const ownerId = isPlatformAdmin ? undefined : (currentUserId || 'none');
    return analyticsService.getBusinessMarketplaceAnalytics(ownerId);
  }, [currentUserId, isPlatformAdmin]);

  const formattingRate = (rate: number) => {
    return isNaN(rate) ? 0 : rate;
  };

  return (
    <div className="space-y-6">
      {/* Scope Banner */}
      <div className="p-4 bg-[#ECF3E9] border border-[#D9E3D5] rounded-2xl flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-[#4F772D] shrink-0" />
        <div className="text-xs text-[#606C38]">
          <span className="font-bold text-[#283618]">
            {isPlatformAdmin ? 'Platform-Wide Dashboard:' : 'Seller Privacy Console Enforced:'}
          </span>{' '}
          {isPlatformAdmin 
            ? 'Displaying aggregated Liberian M&A market activity metrics for system administrators.' 
            : 'Displaying private listing views, saves, and inquiries received for your listed businesses only.'}
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Listing Views */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">Enterprise Listing Impressions</span>
            <div className="w-8 h-8 rounded-lg bg-[#283618]/10 flex items-center justify-center text-[#283618]">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#132A13]">{metrics.listingViews}</h3>
            <p className="text-[10px] text-[#A3B18A] mt-1">Times your deal sheets were viewed</p>
          </div>
        </div>

        {/* KPI 2: Saves count */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">Saves by Investors</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#BC6C25]">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#BC6C25]">{metrics.savesCount}</h3>
            <p className="text-[10px] text-[#A3B18A] mt-1">Bookmarked by prospective buyers</p>
          </div>
        </div>

        {/* KPI 3: Buyer Inquiries */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">Direct Inquiries</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-blue-900">{metrics.buyerInquiries}</h3>
            <p className="text-[10px] text-[#A3B18A] mt-1">
              Saves to Inquiries: <span className="font-bold text-[#283618]">{formattingRate(metrics.conversionMetrics.savesToInquiriesRate)}%</span>
            </p>
          </div>
        </div>

        {/* KPI 4: NDA Requests */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">NDA Gated Access</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-purple-800">{metrics.conversionMetrics.ndaRequestsTotal}</h3>
            <p className="text-[10px] text-[#A3B18A] mt-1">
              Approved NDAs: <span className="font-bold text-purple-700">{metrics.conversionMetrics.ndaApprovedCount}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Breakdown & Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Conversion Visualizer */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E4D9] lg:col-span-1 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-[#132A13] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#4F772D]" />
              <span>Acquisition Conversion Funnel</span>
            </h4>
            <p className="text-[11px] text-[#606C38] mt-0.5">Enterprise deal progression funnel</p>
          </div>

          <div className="space-y-4">
            {/* Impressions */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-[#283618]">
                <span>1. Deal Impressions</span>
                <span>{metrics.listingViews}</span>
              </div>
              <div className="w-full bg-[#F2F2EC] h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Saves */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-[#283618]">
                <span>2. Investor Bookmarks</span>
                <span>{metrics.savesCount}</span>
              </div>
              <div className="w-full bg-[#F2F2EC] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${metrics.listingViews > 0 ? (metrics.savesCount / metrics.listingViews) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Inquiries */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-[#283618]">
                <span>3. Buyer Inquiries</span>
                <span>{metrics.buyerInquiries}</span>
              </div>
              <div className="w-full bg-[#F2F2EC] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${metrics.listingViews > 0 ? (metrics.buyerInquiries / metrics.listingViews) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Gated Access */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-[#283618]">
                <span>4. NDA Executed Requests</span>
                <span>{metrics.conversionMetrics.ndaApprovedCount}</span>
              </div>
              <div className="w-full bg-[#F2F2EC] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-600 h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${metrics.buyerInquiries > 0 ? (metrics.conversionMetrics.ndaApprovedCount / metrics.buyerInquiries) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9]/60 text-[11px] text-[#BC6C25] space-y-1">
            <div className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Marketplace Strategy Tips</span>
            </div>
            <p>
              Gating confidential financials behind an NDA increases lead quality. Your listing view-to-inquiry rate is currently{' '}
              <span className="font-bold">
                {metrics.listingViews > 0 ? Math.round((metrics.buyerInquiries / metrics.listingViews) * 100) : 0}%
              </span>. Consider updating your location overview to boost organic clicks.
            </p>
          </div>
        </div>

        {/* Listings Table breakdown */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E4D9] lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-[#132A13] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#4F772D]" />
              <span>Deal Sheet Performance</span>
            </h4>
            <p className="text-[11px] text-[#606C38] mt-0.5">Metrics broken down by listed enterprise asset</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F2F2EC] text-[#606C38]">
                  <th className="pb-2 font-bold">Listing Title</th>
                  <th className="pb-2 font-bold text-center">Status</th>
                  <th className="pb-2 font-bold text-right">Views</th>
                  <th className="pb-2 font-bold text-right">Saves</th>
                  <th className="pb-2 font-bold text-right">Inquiries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F8F6]">
                {metrics.listingPerformanceList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400 italic">
                      You do not have any active business listings. List an enterprise to track visitor analytics.
                    </td>
                  </tr>
                ) : (
                  metrics.listingPerformanceList.map((biz) => (
                    <tr key={biz.id} className="hover:bg-[#F9F8F4] transition-colors">
                      <td className="py-3 font-semibold text-[#132A13] truncate max-w-[180px]" title={biz.title}>
                        {biz.title}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          biz.status === 'published' 
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {biz.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-stone-600">{biz.views}</td>
                      <td className="py-3 text-right font-medium text-[#BC6C25]">{biz.saves}</td>
                      <td className="py-3 text-right font-bold text-blue-800">{biz.inquiries}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
