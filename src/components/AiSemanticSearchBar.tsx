import React, { useState } from 'react';
import { Search, Sparkles, SlidersHorizontal, MapPin, DollarSign, Tag, RefreshCw, X } from 'lucide-react';
import { aiService } from '../services/ai/aiService';
import { SemanticSearchResponse } from '../services/ai/aiTypes';
import { Opportunity } from '../types';

interface AiSemanticSearchBarProps {
  opportunities: Opportunity[];
  onResultsUpdated: (filteredOpps: Opportunity[], searchResponse?: SemanticSearchResponse) => void;
  onClearSearch: () => void;
}

export const AiSemanticSearchBar: React.FC<AiSemanticSearchBarProps> = ({
  opportunities,
  onResultsUpdated,
  onClearSearch
}) => {
  const [isAiMode, setIsAiMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeResponse, setActiveResponse] = useState<SemanticSearchResponse | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      handleClear();
      return;
    }

    setIsSearching(true);

    if (isAiMode) {
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

        const res = await aiService.semanticSearch({
          query: searchQuery,
          opportunities: available
        });

        setActiveResponse(res);

        // Map scored results back to opportunity list ordered by relevanceScore
        const resultMap = new Map(res.results.map(r => [r.opportunityId, r.relevanceScore]));
        
        const rankedOpps = [...opportunities]
          .filter(o => (resultMap.get(o.id) || 0) >= 40) // Filter out very low relevance
          .sort((a, b) => (resultMap.get(b.id) || 0) - (resultMap.get(a.id) || 0));

        onResultsUpdated(rankedOpps.length > 0 ? rankedOpps : opportunities, res);
      } catch (err) {
        console.error('Error running AI semantic search:', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      // Standard keyword filter
      const q = searchQuery.toLowerCase();
      const filtered = opportunities.filter(o => 
        o.title.toLowerCase().includes(q) ||
        (o.organization?.name || '').toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.county.toLowerCase().includes(q)
      );
      setActiveResponse(null);
      onResultsUpdated(filtered);
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setActiveResponse(null);
    onClearSearch();
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E4D9] shadow-sm space-y-3">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isAiMode
                ? "Try AI prompt: 'Solar engineer in Margibi County with $1200+ salary' or 'NGO agriculture grants'"
                : "Search title, company, or county..."
            }
            className="w-full pl-11 pr-10 py-3.5 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] outline-none text-xs sm:text-sm text-[#132A13] placeholder-[#606C38]/60 focus:border-[#283618] transition-all"
          />
          <div className="absolute left-3.5 top-3.5 text-[#283618]">
            {isAiMode ? <Sparkles className="w-5 h-5 text-[#BC6C25]" /> : <Search className="w-5 h-5 text-[#606C38]" />}
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 top-3.5 text-[#606C38] hover:text-[#132A13]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mode Switch Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsAiMode(!isAiMode);
              setActiveResponse(null);
            }}
            className={`px-3.5 py-3.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 ${
              isAiMode
                ? 'bg-[#283618] text-white border-[#283618]'
                : 'bg-[#F2F2EC] text-[#283618] border-[#E8E4D9] hover:bg-[#E8E4D9]'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiMode ? 'text-[#DDA15E]' : ''}`} />
            <span>{isAiMode ? 'Semantic Search AI' : 'Standard Search'}</span>
          </button>

          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3.5 bg-[#BC6C25] hover:bg-[#a65d1d] text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 shrink-0 min-w-[100px]"
          >
            {isSearching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>
      </form>

      {/* AI Parsed Intent Chips */}
      {activeResponse && (
        <div className="p-3 bg-[#ECF3E9] rounded-2xl border border-[#D9E3D5] space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-[#283618]">
            <span className="flex items-center gap-1.5 text-[#BC6C25]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Parsed Search Intent</span>
            </span>
            <span className="text-[10px] text-[#606C38] font-mono">
              Provider: {activeResponse.providerUsed}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {activeResponse.intent.extractedCounty && (
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#D9E3D5] text-[#132A13] font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#BC6C25]" />
                County: {activeResponse.intent.extractedCounty}
              </span>
            )}

            {activeResponse.intent.extractedOpportunityType && (
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#D9E3D5] text-[#132A13] font-bold flex items-center gap-1 uppercase text-[10px]">
                <Tag className="w-3 h-3 text-[#4F772D]" />
                Type: {activeResponse.intent.extractedOpportunityType}
              </span>
            )}

            {activeResponse.intent.minSalary && (
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#D9E3D5] text-[#132A13] font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                Min Salary: ${activeResponse.intent.minSalary}
              </span>
            )}

            {activeResponse.intent.extractedKeywords.map((kw, i) => (
              <span key={i} className="px-2.5 py-1 bg-white/80 rounded-lg text-[#606C38] font-medium text-xs">
                #{kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
