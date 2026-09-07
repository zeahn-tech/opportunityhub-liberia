import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, CheckCircle, FileText, Lock } from 'lucide-react';
import { ContentReportReason } from '../../types';
import { trustSafetyService } from '../../services/trustSafetyService';
import { useAuth } from '../../context/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'listing' | 'user' | 'message';
  targetId: string;
  targetTitleOrName: string;
  currentUserId?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  targetId,
  targetTitleOrName,
  currentUserId: propUserId,
}) => {
  const { user } = useAuth();
  const effectiveUserId = propUserId || user?.id || '';
  const [reason, setReason] = useState<ContentReportReason>('scam_fee_charging');
  const [details, setDetails] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUserId) {
      setErrorMessage('Please sign in to submit a trust and safety report.');
      return;
    }
    if (!details.trim()) {
      setErrorMessage('Please provide a brief explanation of the violation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await trustSafetyService.submitReport({
        reportType,
        targetId,
        targetTitleOrName,
        reporterUserId: effectiveUserId,
        reason,
        details,
        evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setDetails('');
        setEvidenceUrl('');
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E8E4D9] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-[#283618] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h3 className="font-serif font-bold text-lg">Report Trust & Safety Concern</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-[#4F772D] mx-auto animate-bounce" />
              <h4 className="font-bold text-lg text-[#132A13]">Report Submitted Successfully</h4>
              <p className="text-xs text-[#606C38] max-w-sm mx-auto">
                Thank you for helping keep OpportunityHub secure. Our Trust & Safety officers are reviewing your report.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-[#FEFAE0] rounded-2xl border border-[#D9E3D5] text-xs text-[#BC6C25] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#BC6C25]" />
                <div>
                  Reporting: <strong className="text-[#132A13]">{targetTitleOrName}</strong>
                  <div className="text-[11px] text-[#606C38] mt-0.5">
                    Job posters are strictly prohibited from demanding application or processing fees.
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">Primary Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ContentReportReason)}
                  className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] border border-[#E8E4D9] rounded-xl font-medium text-[#283618] outline-none focus:border-[#4F772D]"
                >
                  <option value="scam_fee_charging">Scam / Charging Application or Training Fee</option>
                  <option value="misleading_salary">Misleading Salary or Earning Claims</option>
                  <option value="fake_organization">Unverified / Fake Entity Identity</option>
                  <option value="harassment">Harassment or Unsolicited Communication</option>
                  <option value="impersonation">Impersonating Reputable Brand or Person</option>
                  <option value="spam">Spam / Duplicate Posting</option>
                  <option value="discrimination">Discriminatory Language or Requirements</option>
                  <option value="inappropriate_content">Inappropriate / Unlawful Content</option>
                  <option value="other">Other Terms of Service Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">Violation Details *</label>
                <textarea
                  required
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the incident, payment requested, or fraudulent behavior..."
                  className="w-full text-xs p-3 bg-[#F9F8F4] border border-[#E8E4D9] rounded-xl outline-none focus:border-[#4F772D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">
                  Evidence Link or Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs p-3 bg-[#F9F8F4] border border-[#E8E4D9] rounded-xl outline-none focus:border-[#4F772D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-[#E8E4D9] rounded-xl text-xs font-bold text-[#606C38] hover:bg-[#F9F8F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isSubmitting ? 'Transmitting Report...' : 'Submit Violation Report'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
