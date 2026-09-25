import React, { useState, useEffect } from 'react';
import { Sparkles, X, ShieldAlert, CheckCircle2, AlertCircle, Award, MapPin, Briefcase, GraduationCap, RefreshCw } from 'lucide-react';
import { aiService } from '../../services/ai/aiService';
import { CandidateMatchResult, CandidateMatchInput } from '../../services/ai/aiTypes';

interface AiCandidateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateMatchInput['candidate'];
  opportunity: CandidateMatchInput['opportunity'];
}

export const AiCandidateMatchModal: React.FC<AiCandidateMatchModalProps> = ({
  isOpen,
  onClose,
  candidate,
  opportunity
}) => {
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<CandidateMatchResult | null>(null);

  useEffect(() => {
    if (isOpen && candidate && opportunity) {
      runMatchAnalysis();
    }
  }, [isOpen, candidate?.id, opportunity?.id]);

  const runMatchAnalysis = async () => {
    setLoading(true);
    try {
      const result = await aiService.matchCandidateToJob({
        candidate,
        opportunity
      });
      setMatchResult(result);
    } catch (err) {
      console.error('Error running candidate match analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[32px] border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#ECF3E9] border-b border-[#D9E3D5] relative flex-none">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-11 h-11 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-[#283618] border border-[#D9E3D5]"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#BC6C25] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI Match Evaluation • Non-Discriminatory Rationale</span>
          </div>

          <h2 className="text-xl font-serif font-bold text-[#132A13]">
            Candidate Alignment Analysis
          </h2>
          <p className="text-xs text-[#606C38] mt-1">
            Evaluating candidate competencies against <strong>{opportunity.title}</strong>
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#BC6C25] animate-spin" />
              <p className="text-sm font-bold text-[#132A13]">Evaluating Merit & Competencies...</p>
              <p className="text-xs text-[#606C38]">Sanitizing demographic attributes & computing signal weights</p>
            </div>
          ) : matchResult ? (
            <>
              {/* Overall Score Badge */}
              <div className="p-5 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#606C38] uppercase tracking-wider">
                    Overall Compatibility Index
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-3xl font-extrabold font-serif text-[#132A13]">
                      {matchResult.overallMatchScore}%
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      matchResult.overallMatchScore >= 80 ? 'bg-[#DDA15E]/20 text-[#BC6C25]' :
                      matchResult.overallMatchScore >= 65 ? 'bg-emerald-100 text-emerald-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {matchResult.qualificationStatus}
                    </span>
                  </div>
                </div>
                <button
                  onClick={runMatchAnalysis}
                  className="p-2.5 bg-white hover:bg-[#ECF3E9] border border-[#D9E3D5] rounded-xl text-xs font-bold text-[#283618] flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-evaluate</span>
                </button>
              </div>

              {/* Explainable Signals Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#283618]">
                  Explainable Matching Signals
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchResult.signals.map((sig, idx) => (
                    <div key={idx} className="p-3.5 bg-white rounded-xl border border-[#E8E4D9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#132A13] flex items-center gap-1.5">
                          {sig.category === 'Skill Overlap' && <Award className="w-4 h-4 text-[#BC6C25]" />}
                          {sig.category === 'Experience Depth' && <Briefcase className="w-4 h-4 text-[#4F772D]" />}
                          {sig.category === 'County Alignment' && <MapPin className="w-4 h-4 text-[#DDA15E]" />}
                          {sig.category === 'Education & Credentials' && <GraduationCap className="w-4 h-4 text-emerald-600" />}
                          {sig.category}
                        </span>
                        <span className="text-xs font-bold text-[#283618]">{sig.score}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F2F2EC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#283618] rounded-full"
                          style={{ width: `${sig.score}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-[#606C38] leading-tight">{sig.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Strengths & Skill Gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Key Alignment Strengths
                  </h4>
                  <ul className="space-y-1">
                    {matchResult.keyStrengths.map((str, i) => (
                      <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                        <span className="text-emerald-500">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Recommended Growth Areas
                  </h4>
                  <ul className="space-y-1">
                    {matchResult.skillGaps.map((gap, i) => (
                      <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                        <span className="text-amber-500">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rationale Summary */}
              <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#D9E3D5] space-y-1">
                <span className="text-[11px] font-bold text-[#283618] uppercase">Summary Rationale</span>
                <p className="text-xs text-[#2D2D2D] leading-relaxed">
                  {matchResult.summaryExplanation}
                </p>
              </div>

              {/* Ethical Non-Discrimination Guardrail Notice */}
              <div className="p-3.5 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9] flex items-start gap-2.5 text-[11px] text-[#606C38]">
                <ShieldAlert className="w-4 h-4 text-[#BC6C25] shrink-0 mt-0.5" />
                <span>
                  <strong>Assistive AI Guarantee:</strong> {matchResult.ethicalNotice}
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E8E4D9] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold transition-all"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
