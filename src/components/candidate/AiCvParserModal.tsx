import React, { useState } from 'react';
import { Sparkles, X, FileText, CheckCircle2, RefreshCw, Upload, ArrowRight, UserCheck } from 'lucide-react';
import { aiService } from '../../services/ai/aiService';
import { ParsedCVResult } from '../../services/ai/aiTypes';

interface AiCvParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsedData?: (data: ParsedCVResult) => void;
}

export const AiCvParserModal: React.FC<AiCvParserModalProps> = ({
  isOpen,
  onClose,
  onApplyParsedData
}) => {
  const [cvText, setCvText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedCVResult | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!cvText.trim()) return;
    setIsParsing(true);
    setParsedResult(null);

    try {
      const result = await aiService.parseCV({ cvText });
      setParsedResult(result);
    } catch (err) {
      console.error('Error parsing CV:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApply = () => {
    if (parsedResult && onApplyParsedData) {
      onApplyParsedData(parsedResult);
    }
    onClose();
  };

  const handleSamplePaste = () => {
    setCvText(`EMMANUEL ZEAHN
Monrovia, Montserrado County, Liberia | emmanuel.z@example.lr | +231 77 012 3456

PROFESSIONAL SUMMARY:
Dedicated Electrical & Solar Systems Supervisor with 5+ years of hands-on experience directing renewable energy micro-grid installations, commercial solar inverter maintenance, and rural community electrification projects across Montserrado, Margibi, and Nimba counties.

SKILLS & COMPETENCIES:
• Solar Photovoltaic Systems Installation & Inverter Calibration
• Project Management & Field Logistics
• Electrical Circuit Testing & Compliance
• Micro-grid Distribution & Community Engagement
• QuickBooks & Technical Procurement

WORK EXPERIENCE:
Solar Systems Supervisor | SunPower Liberia Ltd. (Monrovia, Montserrado)
2022 – Present
- Supervised team of 8 field technicians installing 120kW off-grid solar arrays for commercial facilities.
- Coordinated electrical safety inspections with Liberia Electricity Corporation (LEC) inspectors.

Field Technician | EcoPower Solutions (Gbarnga, Bong)
2019 – 2022
- Maintained battery storage units and lithium hybrid backups for rural clinics.

EDUCATION:
Bachelor of Science in Electrical Engineering | University of Liberia (2019)
Certified Solar Installation Technician | Ministry of Mines & Energy (2020)`);
  };

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[32px] border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
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
            <span>AI Resume / CV Parser</span>
          </div>

          <h2 className="text-xl font-serif font-bold text-[#132A13]">
            Auto-Extract Profile From Resume
          </h2>
          <p className="text-xs text-[#606C38] mt-1">
            Paste raw CV text to extract structured skills, work history, education, and county location.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!parsedResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#283618]">
                  Paste Resume / CV Content
                </label>
                <button
                  type="button"
                  onClick={handleSamplePaste}
                  className="text-xs text-[#BC6C25] hover:underline font-bold"
                >
                  Load Sample Resume
                </button>
              </div>

              <textarea
                rows={10}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Paste the full text of candidate resume or CV here..."
                className="w-full p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] outline-none text-xs font-mono leading-relaxed"
              ></textarea>

              <button
                onClick={handleParse}
                disabled={isParsing || !cvText.trim()}
                className="w-full py-3.5 bg-[#283618] hover:bg-[#132A13] disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#BC6C25]" />
                    <span>Analyzing & Extracting Profile Attributes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#A3B18A]" />
                    <span>Run AI CV Extraction</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      {parsedResult.candidateName || 'Candidate Profile Extracted'}
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Location: {parsedResult.county} County • {parsedResult.experienceYears} Years Exp.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setParsedResult(null)}
                  className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900"
                >
                  Edit Input Text
                </button>
              </div>

              {/* Summary */}
              <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-1">
                <span className="text-[11px] font-bold uppercase text-[#606C38]">
                  Professional Summary
                </span>
                <p className="text-xs text-[#2D2D2D] leading-relaxed">
                  {parsedResult.professionalSummary}
                </p>
              </div>

              {/* Extracted Skills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-[#606C38]">
                  Extracted Skills ({parsedResult.extractedSkills.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedResult.extractedSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-[#ECF3E9] text-[#283618] rounded-lg text-xs font-semibold border border-[#D9E3D5]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Work History */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-[#606C38]">
                  Work History ({parsedResult.workHistory.length})
                </span>
                {parsedResult.workHistory.map((wh, idx) => (
                  <div key={idx} className="p-3.5 bg-white rounded-xl border border-[#E8E4D9] space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#132A13]">
                      <span>{wh.jobTitle}</span>
                      <span className="text-[#606C38]">{wh.startDate} - {wh.endDate}</span>
                    </div>
                    <p className="text-xs text-[#BC6C25] font-semibold">{wh.organization}</p>
                    <ul className="text-xs text-[#2D2D2D] space-y-0.5 mt-1">
                      {wh.responsibilities.map((resp, i) => (
                        <li key={i}>• {resp}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Education */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-[#606C38]">
                  Education & Qualifications
                </span>
                {parsedResult.education.map((edu, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-[#E8E4D9] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#132A13]">{edu.degree}</p>
                      <p className="text-[#606C38]">{edu.institution}</p>
                    </div>
                    <span className="font-semibold text-[#BC6C25]">{edu.graduationYear}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E8E4D9] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#F2F2EC] text-[#283618] rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          {parsedResult && (
            <button
              onClick={handleApply}
              className="px-6 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>Populate Candidate Profile</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
