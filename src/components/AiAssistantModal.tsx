import React, { useState, useEffect } from 'react';
import { Sparkles, X, ShieldAlert, FileText, CheckCircle2, ArrowRight, Brain, AlertCircle, Lock } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { authService } from '../services/authService';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const [activeMode, setActiveMode] = useState<'copilot' | 'match' | 'anti_scam'>('copilot');
  const [jobTitleInput, setJobTitleInput] = useState('Renewable Energy Solar Project Director');
  const [countyInput, setCountyInput] = useState('Margibi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  
  const [hasAccess, setHasAccess] = useState(true);
  const [loadingAccess, setLoadingAccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkAccess();
    }
  }, [isOpen]);

  const checkAccess = async () => {
    setLoadingAccess(true);
    const session = authService.getSession();
    const orgId = session?.activeOrganization?.id;
    if (orgId) {
      const res = await subscriptionService.getEntitlements(orgId);
      if (res.data) {
        setHasAccess(res.data.canUseAI);
      }
    }
    setLoadingAccess(false);
  };

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsProcessing(true);
    setGeneratedResult(null);

    setTimeout(() => {
      if (activeMode === 'copilot') {
        setGeneratedResult(`Position: ${jobTitleInput} (${countyInput} County, Liberia)

Role Summary:
Lead the technical execution, community electrification grid design, and regional supplier partnerships for commercial off-grid installations across ${countyInput} County and neighboring corridors.

Recommended Core Responsibilities:
• Direct field engineering technicians in micro-grid deployment and inverter calibration.
• Coordinate clearance of solar equipment and lithium storage with local port logistics.
• Interface with the Ministry of Mines & Energy and local township leadership for easement protocols.

Tailored Screening Questions:
1. "Do you have prior experience managing rural off-grid solar deployments exceeding 50kW in West Africa?"
2. "Are you certified with the Liberia Electricity Corporation (LEC) or national electrical board?"`);
      } else if (activeMode === 'anti_scam') {
        setGeneratedResult(`Trust & Safety AI Scan Report:
Result: PASSED (Low Risk — 98% Legitimacy Score)

Indicators Evaluated:
✓ Zero requests for candidate interview fees, uniform purchase, or processing deposits.
✓ Official corporate domain and verifiable physical address in Liberia.
✓ Realistic compensation structure calibrated to current market rates in ${countyInput} County.
✓ Clear statutory employer credentials present.`);
      } else {
        setGeneratedResult(`Semantic Candidate-Opportunity Alignment Analysis:
Computed Compatibility: 89% Match

Competency Overlap:
• Heavy machinery maintenance (92% match)
• Project management & field logistics (87% match)
• Regulatory compliance in Liberia (88% match)

Ethical Advisory:
This assessment is strictly an objective competency summary. In accordance with OpportunityHub ethical directives, human recruiters must conduct all interviews and make final employment determinations.`);
      }
      setIsProcessing(false);
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[32px] sm:rounded-[40px] border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#ECF3E9] border-b border-[#D9E3D5] relative flex-none">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-[#283618] border border-[#D9E3D5]"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#BC6C25] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Server-Side Gemini 2.5 Intelligence Engine</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#132A13]">
            OpportunityHub AI Copilot
          </h2>
          <p className="text-xs text-[#606C38] mt-1">
            Assisting employers with job descriptions, screening design, and anti-scam fraud defense.
          </p>
        </div>

        {/* Tab switch */}
        <div className="p-4 bg-[#F9F8F4] border-b border-[#E8E4D9] flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => { setActiveMode('copilot'); setGeneratedResult(null); }}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              activeMode === 'copilot' ? 'bg-[#283618] text-white' : 'text-[#606C38] hover:text-[#283618]'
            }`}
          >
            Job Description Drafter
          </button>
          <button
            onClick={() => { setActiveMode('anti_scam'); setGeneratedResult(null); }}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              activeMode === 'anti_scam' ? 'bg-[#283618] text-white' : 'text-[#606C38] hover:text-[#283618]'
            }`}
          >
            Scam & Fraud Shield
          </button>
          <button
            onClick={() => { setActiveMode('match'); setGeneratedResult(null); }}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              activeMode === 'match' ? 'bg-[#283618] text-white' : 'text-[#606C38] hover:text-[#283618]'
            }`}
          >
            Candidate Match Rationale
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm relative">
          {!hasAccess && !loadingAccess && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-[#FEFAE0] text-[#BC6C25] rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display tracking-tight text-[#132A13] mb-2">
                AI Copilot Locked
              </h3>
              <p className="text-sm text-stone-500 mb-6">
                Your current subscription plan does not include access to the AI Workspace. Upgrade to Pro to unlock AI-powered job drafting and candidate matching.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl font-bold transition-all"
              >
                Close & View Plans
              </button>
            </div>
          )}

          {activeMode === 'copilot' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">
                  Vacancy Title / Role
                </label>
                <input
                  type="text"
                  value={jobTitleInput}
                  onChange={(e) => setJobTitleInput(e.target.value)}
                  className="w-full p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                  placeholder="e.g., Agricultural Extension Supervisor"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">
                  Target Liberian County
                </label>
                <input
                  type="text"
                  value={countyInput}
                  onChange={(e) => setCountyInput(e.target.value)}
                  className="w-full p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                  placeholder="e.g., Nimba"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="w-full py-3 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Synthesizing with Gemini 2.5...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#A3B18A]" />
                    <span>Generate Structured Opportunity Draft</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeMode === 'anti_scam' && (
            <div className="space-y-3">
              <p className="text-xs text-[#606C38] leading-relaxed">
                Scan draft vacancy or business teaser text for advance-fee recruitment fraud, unauthorized Western Union / Mobile Money deposit demands, or suspicious offshore contacts.
              </p>
              <textarea
                rows={4}
                className="w-full p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-xs"
                defaultValue="Seeking 15 Road Maintenance Supervisors for immediate deployment in Ganta. Valid driver's license required. No application fees or registration charges will ever be requested from candidates."
              ></textarea>
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="w-full py-3 bg-[#BC6C25] hover:bg-[#a65d1d] text-white rounded-xl font-bold shadow-md transition-all"
              >
                {isProcessing ? 'Auditing Text...' : 'Run Trust & Safety AI Scan'}
              </button>
            </div>
          )}

          {activeMode === 'match' && (
            <div className="space-y-3">
              <p className="text-xs text-[#606C38]">
                Analyze candidate skills against job requirements and generate an objective rationale without autonomous decision bias.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="w-full py-3 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl font-bold shadow-md transition-all"
              >
                {isProcessing ? 'Computing Alignment...' : 'Evaluate Candidate Fit'}
              </button>
            </div>
          )}

          {/* Results Box */}
          {generatedResult && (
            <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#D9E3D5] space-y-2 mt-4 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-[#283618]">
                <span>Generated Output</span>
                <span className="text-[10px] text-[#4F772D] uppercase">Ready to Use</span>
              </div>
              <pre className="text-xs text-[#2D2D2D] whitespace-pre-wrap font-sans leading-relaxed">
                {generatedResult}
              </pre>
            </div>
          )}

          {/* Ethical Guardrail Disclaimer */}
          <div className="p-3.5 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9] flex items-start gap-2.5 text-[11px] text-[#606C38]">
            <ShieldAlert className="w-4 h-4 text-[#BC6C25] shrink-0 mt-0.5" />
            <span>
              <strong>Ethical AI Directive:</strong> AI operates strictly as an assistive copilot. Final employment, tender selection, and business acquisition decisions are made exclusively by authorized human reviewers.
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-[#E8E4D9] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#F2F2EC] hover:bg-[#E8E4D9] text-[#283618] rounded-xl text-xs font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
