import React, { useState } from 'react';
import { Opportunity } from '../types';
import { MapPin, Calendar, CheckCircle2, Building, ShieldCheck, Sparkles, Bookmark, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { OPPORTUNITY_TYPES } from '../config/constants';
import { ReportModal } from './trust/ReportModal';
import { useAuth } from '../context/AuthContext';

interface OpportunityCardProps {
  opportunity: Opportunity;
  currency: 'USD' | 'LRD';
  onSelect: (opp: Opportunity) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  currency,
  onSelect,
  isSaved = false,
  onToggleSave
}) => {
  const { user } = useAuth();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const LRD_RATE = 195;

  const isTodayExpired =
    opportunity.deadline && new Date(opportunity.deadline) < new Date();
  const effectiveStatus =
    opportunity.status === 'published' && isTodayExpired ? 'expired' : opportunity.status;

  const formatSalary = () => {
    if (opportunity.isSalaryConfidential) {
      return 'Salary Confidential';
    }
    if (!opportunity.salaryMin && !opportunity.salaryMax) {
      return opportunity.isSalaryNegotiable ? 'Negotiable' : 'Competitive';
    }

    const min = opportunity.salaryMin || 0;
    const max = opportunity.salaryMax || 0;

    if (currency === 'USD') {
      if (max > 0 && min > 0) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
      if (min > 0) return `From $${min.toLocaleString()}`;
      return `Up to $${max.toLocaleString()}`;
    } else {
      const lrdMin = Math.round(min * LRD_RATE);
      const lrdMax = Math.round(max * LRD_RATE);
      if (lrdMax > 0 && lrdMin > 0) return `LRD ${lrdMin.toLocaleString()} - ${lrdMax.toLocaleString()}`;
      if (lrdMin > 0) return `From LRD ${lrdMin.toLocaleString()}`;
      return `Up to LRD ${lrdMax.toLocaleString()}`;
    }
  };

  const getBadgeStyle = () => {
    const badge = opportunity.organization.verificationBadge;
    if (badge === 'verified_government') {
      return 'bg-[#DDA15E]/15 text-[#BC6C25] border border-[#DDA15E]/30';
    }
    if (badge === 'verified_ngo') {
      return 'bg-[#FEFAE0] text-[#BC6C25] border border-[#E8E4D9]';
    }
    if (badge === 'verified_company') {
      return 'bg-[#ECF3E9] text-[#4F772D] border border-[#D9E3D5]';
    }
    return 'bg-[#F2F2EC] text-[#606C38] border border-[#E8E4D9]';
  };

  const getBadgeLabel = () => {
    const badge = opportunity.organization.verificationBadge;
    if (badge === 'verified_government') return 'Government';
    if (badge === 'verified_ngo') return 'Verified NGO';
    if (badge === 'verified_company') return 'Verified Company';
    if (badge === 'verified_recruiter') return 'Verified Recruiter';
    return opportunity.organization.type?.replace('_', ' ');
  };

  return (
    <div
      onClick={() => onSelect(opportunity)}
      className={`bg-white p-5 rounded-3xl border flex flex-col sm:flex-row gap-4 sm:gap-5 hover:border-[#A3B18A] hover:shadow-md transition-all cursor-pointer group relative ${
        effectiveStatus === 'expired' ? 'opacity-85 border-red-200' : 'border-[#E8E4D9]'
      }`}
    >
      {/* Organization Logo Avatar */}
      <div className="w-13 h-13 sm:w-14 sm:h-14 bg-[#F9F8F4] rounded-2xl flex-none overflow-hidden border border-[#E8E4D9] flex items-center justify-center text-base sm:text-lg font-bold text-[#4F772D] group-hover:bg-[#ECF3E9] transition-colors">
        {opportunity.organization.logoText || 'LR'}
      </div>

      {/* Main Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base sm:text-lg text-[#283618] group-hover:text-[#132A13] transition-colors line-clamp-1">
              {opportunity.title}
            </h3>

            {effectiveStatus === 'draft' && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold uppercase">
                Draft
              </span>
            )}
            {effectiveStatus === 'expired' && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded-md text-[10px] font-bold uppercase">
                Expired
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getBadgeStyle()}`}>
              {getBadgeLabel()}
            </span>

            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(opportunity.id);
                }}
                className={`p-1 rounded-lg transition-colors ${
                  isSaved ? 'text-[#BC6C25]' : 'text-[#A3B18A] hover:text-[#283618]'
                }`}
                title={isSaved ? 'Saved opportunity' : 'Save opportunity'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsReportModalOpen(true);
              }}
              className="p-1 text-[#A3B18A] hover:text-red-700 transition-colors rounded-lg"
              title="Report suspicious listing or fee request"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportType="listing"
          targetId={opportunity.id}
          targetTitleOrName={opportunity.title}
          currentUserId={user?.id || ''}
        />

        {/* Organization Name & Location */}
        <p className="text-xs sm:text-sm text-[#606C38] mb-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-[#283618]">{opportunity.organization.name}</span>
          <span className="text-[#A3B18A]">•</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#A3B18A]" />
            {opportunity.county} County
          </span>
          <span className="text-[#A3B18A]">•</span>
          <span className="capitalize">{opportunity.workplaceModel?.replace('_', ' ')}</span>
        </p>

        {/* Short Summary */}
        <p className="text-xs text-[#2D2D2D]/80 line-clamp-2 mb-3 leading-relaxed">
          {opportunity.summary}
        </p>

        {/* Bottom Tag Bar & Salary */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1 border-t border-[#F2F2EC]">
          <span className="px-2 py-0.5 bg-[#F9F8F4] border border-[#E8E4D9] rounded-md text-[#606C38] font-medium capitalize">
            {OPPORTUNITY_TYPES.find(t => t.id === opportunity.type)?.label || opportunity.type}
          </span>
          {opportunity.employmentType && (
            <span className="px-2 py-0.5 bg-[#F9F8F4] border border-[#E8E4D9] rounded-md text-[#606C38] capitalize">
              {opportunity.employmentType?.replace('_', ' ')}
            </span>
          )}
          <span className="px-2 py-0.5 bg-[#FEFAE0] border border-[#E8E4D9] rounded-md text-[#BC6C25] font-semibold">
            {formatSalary()}
          </span>

          {opportunity.screeningQuestions && opportunity.screeningQuestions.length > 0 && (
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 bg-[#ECF3E9] text-[#4F772D] rounded-md font-medium">
              Screening Verified
            </span>
          )}

          <span className="text-[11px] ml-auto text-[#A3B18A] italic shrink-0 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              Deadline:{' '}
              {opportunity.deadline
                ? new Date(opportunity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Rolling'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
