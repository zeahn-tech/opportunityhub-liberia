import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsService, EmployerAnalytics } from '../../services/analyticsService';
import { 
  Eye, 
  Users, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  Shield, 
  AlertCircle, 
  Briefcase,
  Layers,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const EmployerAnalyticsDashboard: React.FC = () => {
  const { session } = useAuth();
  const activeOrg = session?.activeOrganization;

  const [metrics, setMetrics] = useState<EmployerAnalytics | null>(null);

  useEffect(() => {
    if (!activeOrg) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    analyticsService.getEmployerAnalytics(activeOrg.id).then((result) => {
      if (!cancelled) setMetrics(result);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrg]);

  if (!activeOrg) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E4D9] max-w-lg mx-auto my-12 space-y-4">
        <Shield className="w-12 h-12 text-[#BC6C25] mx-auto" />
        <h3 className="text-lg font-serif font-bold text-[#132A13]">Organization Profile Required</h3>
        <p className="text-xs text-[#606C38]">
          You must be signed in with an active organization profile to access the employer-specific analytics cockpit.
        </p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E4D9]">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2 animate-pulse" />
        <p className="text-xs font-semibold text-[#283618]">Gathering metric logs. Please wait...</p>
      </div>
    );
  }

  // Calculate overall performance percentages
  const applicationConvRate = metrics.jobViews > 0 
    ? Math.round((metrics.applicationsCount / metrics.jobViews) * 1000) / 10 
    : 0;

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="p-4 bg-[#F2F2EC] border border-[#E8E4D9] rounded-2xl flex items-center gap-3">
        <Shield className="w-5 h-5 text-[#4F772D] shrink-0" />
        <div className="text-xs text-[#606C38]">
          <span className="font-bold text-[#283618]">Tenant Isolation Enforced:</span> These recruitment metrics are private to <span className="font-bold text-[#132A13]">{activeOrg.name}</span>. No candidates, competitors, or other organizations can query or view this performance dashboard.
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Job Views */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">Aggregated Job Views</span>
            <div className="w-8 h-8 rounded-lg bg-[#283618]/10 flex items-center justify-center text-[#283618]">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-[#132A13]">{metrics.jobViews}</h3>
            <p className="text-[10px] text-[#A3B18A] mt-1">Total visits across all active vacancies</p>
          </div>
        </div>

        {/* Card 2: Applications */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">Total Applications</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-blue-900">{metrics.applicationsCount}</h3>
            <p className="text-[10px] text-[#A3B18A] mt-1">
              Click-through Conv. Rate: <span className="font-bold text-[#283618]">{applicationConvRate}%</span>
            </p>
          </div>
        </div>

        {/* Card 3: Interviews & Shortlists */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">Shortlisted & Interviews</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#BC6C25]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-[#BC6C25]">{metrics.shortlistCount + metrics.interviewCount}</h3>
            <span className="text-xs text-[#606C38]">({metrics.interviewCount} active scheduled)</span>
          </div>
          <p className="text-[10px] text-[#A3B18A] mt-1">Candidates advanced past initial review</p>
        </div>

        {/* Card 4: Hiring Success */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#606C38]">Hiring Outcomes</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-green-800">{metrics.hiringOutcomes.candidatesHired}</h3>
            <p className="text-[10px] text-[#A3B18A] mt-1">
              Offer Acceptance Rate: <span className="font-bold text-green-700">{metrics.hiringOutcomes.offerAcceptanceRate}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline conversion visualizer */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E4D9] lg:col-span-1 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-[#132A13] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#4F772D]" />
              <span>Application Funnel Conversion</span>
            </h4>
            <p className="text-[11px] text-[#606C38] mt-0.5">Recruitment progress across stages</p>
          </div>

          <div className="space-y-4">
            {/* Funnel Stage 1: Applied */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#283618]">
                <span>1. Total Submissions</span>
                <span>{metrics.applicationsCount}</span>
              </div>
              <div className="w-full bg-[#F2F2EC] h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Funnel Stage 2: Shortlisted */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#283618]">
                <span>2. Shortlisted for review</span>
                <span>{metrics.shortlistCount + metrics.interviewCount + metrics.hiringOutcomes.offersMade}</span>
              </div>
              <div className="w-full bg-[#F2F2EC] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${metrics.applicationsCount > 0 ? ((metrics.shortlistCount + metrics.interviewCount + metrics.hiringOutcomes.offersMade) / metrics.applicationsCount) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Funnel Stage 3: Hired */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#283618]">
                <span>3. Formally Hired</span>
                <span>{metrics.hiringOutcomes.candidatesHired}</span>
              </div>
              <div className="w-full bg-[#F2F2EC] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-green-600 h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${metrics.applicationsCount > 0 ? (metrics.hiringOutcomes.candidatesHired / metrics.applicationsCount) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9]/60 text-[11px] text-[#BC6C25] space-y-1">
            <div className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Conversion Insights</span>
            </div>
            <p>
              Your current pipeline has an overall submission-to-hire conversion rate of{' '}
              <span className="font-bold">
                {metrics.applicationsCount > 0 
                  ? Math.round((metrics.hiringOutcomes.candidatesHired / metrics.applicationsCount) * 100) 
                  : 0}%
              </span>. Keep response times under 48h to attract premium Liberian talent.
            </p>
          </div>
        </div>

        {/* Detailed Breakdown list */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E4D9] lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-[#132A13] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#4F772D]" />
              <span>Postings Performance Breakdown</span>
            </h4>
            <p className="text-[11px] text-[#606C38] mt-0.5">Individual vacancy click-through and action rates</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F2F2EC] text-[#606C38]">
                  <th className="pb-2 font-bold">Opportunity Title</th>
                  <th className="pb-2 font-bold text-center">Status</th>
                  <th className="pb-2 font-bold text-right">Views</th>
                  <th className="pb-2 font-bold text-right">Applications</th>
                  <th className="pb-2 font-bold text-right">Click Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F8F6]">
                {metrics.jobPerformanceList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400 italic">
                      No jobs have been posted yet. Create a posting to track real-time impressions.
                    </td>
                  </tr>
                ) : (
                  metrics.jobPerformanceList.map((job) => {
                    const rate = job.views > 0 ? Math.round((job.applications / job.views) * 100) : 0;
                    return (
                      <tr key={job.id} className="hover:bg-[#F9F8F4] transition-colors">
                        <td className="py-3 font-semibold text-[#132A13] truncate max-w-[200px]" title={job.title}>
                          {job.title}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            job.status === 'published' 
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-stone-50 text-stone-500 border-stone-200'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-medium text-stone-600">{job.views}</td>
                        <td className="py-3 text-right font-bold text-[#283618]">{job.applications}</td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 bg-[#ECF3E9] text-[#4F772D] rounded font-bold text-[10px]">
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
