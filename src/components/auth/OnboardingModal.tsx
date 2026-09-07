import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCapability } from '../../types';
import { Sparkles, Briefcase, Users, Store, Search, Wrench, Check } from 'lucide-react';
import { Button } from '../../design-system/Button';

export const OnboardingModal: React.FC = () => {
  const { user, completeOnboarding } = useAuth();
  const [selectedCapabilities, setSelectedCapabilities] = useState<UserCapability[]>(
    user?.capabilities || ['find_opportunities']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.onboardingCompleted) {
    return null;
  }

  const capabilityOptions: { id: UserCapability; title: string; description: string; icon: React.ReactNode }[] = [
    {
      id: 'find_opportunities',
      title: 'Find Opportunities',
      description: 'Discover jobs, tenders, RFPs, consultancies, and national grants across Liberia.',
      icon: <Briefcase className="w-5 h-5 text-[#4F772D]" />
    },
    {
      id: 'hire_or_recruit',
      title: 'Hire or Recruit',
      description: 'Post job openings, shortlist qualified talent, and manage recruitment pipelines.',
      icon: <Users className="w-5 h-5 text-[#BC6C25]" />
    },
    {
      id: 'sell_business',
      title: 'Sell a Business or Asset',
      description: 'List commercial enterprises, verified shops, or assets for acquisition or investment.',
      icon: <Store className="w-5 h-5 text-[#9A551A]" />
    },
    {
      id: 'find_business',
      title: 'Find & Acquire Businesses',
      description: 'Browse verified Liberian business listings, request NDAs, and view due diligence data.',
      icon: <Search className="w-5 h-5 text-[#283618]" />
    },
    {
      id: 'offer_services',
      title: 'Offer Professional Services',
      description: 'Provide consulting, contracting, logistics, tech, or professional services to organizations.',
      icon: <Wrench className="w-5 h-5 text-[#606C38]" />
    }
  ];

  const toggleCapability = (cap: UserCapability) => {
    if (selectedCapabilities.includes(cap)) {
      if (selectedCapabilities.length === 1) return; // Keep at least one
      setSelectedCapabilities(selectedCapabilities.filter((c) => c !== cap));
    } else {
      setSelectedCapabilities([...selectedCapabilities, cap]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(selectedCapabilities);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#132A13]/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E8E4D9] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-[#E8E4D9] bg-[#F9F8F6]">
          <div className="flex items-center gap-2 text-[#BC6C25] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Welcome to OpportunityHub Liberia</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#283618]">What would you like to do?</h2>
          <p className="text-sm text-[#606C38] mt-1">
            Select all the activities you plan to engage in. You can hold multiple capabilities simultaneously with a single unified account.
          </p>
        </div>

        {/* Options */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {capabilityOptions.map((opt) => {
              const isSelected = selectedCapabilities.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleCapability(opt.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                    isSelected
                      ? 'bg-[#ECF3E9] border-[#4F772D] shadow-xs'
                      : 'bg-white border-[#E8E4D9] hover:border-[#606C38]'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl mt-0.5 ${isSelected ? 'bg-white shadow-xs' : 'bg-[#F9F8F6]'}`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#283618]">{opt.title}</span>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-[#283618] border-[#283618] text-white' : 'border-[#E8E4D9] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <p className="text-xs text-[#606C38] mt-1">{opt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#E8E4D9] flex items-center justify-end gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || selectedCapabilities.length === 0}
              className="bg-[#283618] hover:bg-[#1a2310] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer"
            >
              {isSubmitting ? 'Saving Profile...' : 'Continue to Dashboard'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
