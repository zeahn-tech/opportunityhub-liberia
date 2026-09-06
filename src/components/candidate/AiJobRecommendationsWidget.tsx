import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Briefcase, ChevronRight, Award, RefreshCw, CheckCircle2 } from 'lucide-react';
import { aiService } from '../../services/ai/aiService';
import { RecommendedJobResult, JobRecommendationsResponse } from '../../services/ai/aiTypes';
import { Opportunity } from '../../types';

interface AiJobRecommendationsWidgetProps {
  candidateProfile: {
    id: string;
    skills: string[];
    preferredCounties?: string[];
    desiredRole?: string;
  };
  opportunities: Opportunity[];
  onSelectOpportunity?: (opp: Opportunity) => void;
}

export const AiJobRecommendationsWidget: React.FC<AiJobRecommendationsWidgetProps> = ({
  candidateProfile,
  opportunities,
  onSelectOpportunity
}) => {
  const [loading, setLoading] = useState(false);
  const [recommendationsData, setRecommendationsData] = useState<JobRecommendationsResponse | null>(null);

  useEffect(() => {
    if (opportunities && opportunities.length > 0) {
      loadRecommendations();
    }
  }, [opportunities.length, candidateProfile?.id]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const available = opportunities.map(o => ({
        id: o.id,
        title: o.title,
        organizationName: o.organization?.name || 'Organization',
        county: o.county,
        opportunityType: o.type,
        skillsRequired: o.skills || [],
        description: o.description,
        salaryMin: o.salaryMin,
        salaryMax: o.salaryMax
      }));

      const res = await aiService.getJobRecommendations({
        candidate: candidateProfile,
        availableOpportunities: available,
        limit: 3
      });

      setRecommendationsData(res);
    } catch (err) {
      console.error('Error getting job recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!opportunities || opportunities.length === 0) return null;

  return (
    <div className="bg-[#ECF3E9] border border-[#D9E3D5] rounded-3xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#BC6C25]">
          <Sparkles className="w-4 h-4" />
          <span>Recommended Opportunities for You</span>
        </div>
        <div className="flex items-center gap-2">
          {recommendationsData?.providerUsed && (
            <span className="text-[10px] font-semibold text-[#606C38] bg-white/80 px-2.5 py-1 rounded-full border border-[#D9E3D5]">
              {recommendationsData.providerUsed}
            </span>
          )}
          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="p-1.5 bg-white hover:bg-[#F9F8F4] text-[#283618] rounded-lg border border-[#D9E3D5] transition-all"
            title="Refresh Recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#BC6C25]' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#BC6C25] animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#132A13]">Computing Personalized Recommendations...</p>
        </div>
      ) : recommendationsData && recommendationsData.recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendationsData.recommendations.map((rec) => {
            const opp = opportunities.find(o => o.id === rec.opportunityId);
            if (!opp) return null;

            return (
              <div
                key={rec.opportunityId}
                onClick={() => onSelectOpportunity && onSelectOpportunity(opp)}
                className="bg-white p-4 rounded-2xl border border-[#D9E3D5] hover:border-[#283618] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-[#FEFAE0] text-[#BC6C25] font-bold text-[10px] rounded-full border border-[#E8E4D9]">
                      {rec.matchScore}% Match
                    </span>
                    <span className="text-[11px] font-semibold text-[#606C38] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#BC6C25]" />
                      {opp.county}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#132A13] group-hover:text-[#BC6C25] transition-colors line-clamp-1">
                      {opp.title}
                    </h4>
                    <p className="text-xs text-[#606C38]">{opp.organization?.name}</p>
                  </div>

                  <p className="text-[11px] text-[#2D2D2D] line-clamp-2 bg-[#F9F8F4] p-2 rounded-xl border border-[#E8E4D9]">
                    "{rec.matchReason}"
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F2F2EC] flex items-center justify-between text-xs font-bold text-[#283618]">
                  <span className="text-[10px] uppercase text-[#606C38]">{opp.type}</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-[#BC6C25]">
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[#606C38]">No recommendation matches found at this time.</p>
      )}
    </div>
  );
};
