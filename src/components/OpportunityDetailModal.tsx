import React, { useState, useEffect } from 'react';
import { Application, CandidateProfile, Opportunity } from '../types';
import { OPPORTUNITY_TYPES } from '../config/constants';

const getCtaText = (type: string) => {
  switch (type) {
    case 'tender':
    case 'contract':
      return 'Submit Proposal';
    case 'grant':
      return 'Apply for Grant';
    case 'scholarship':
    case 'fellowship':
      return 'Submit Application';
    case 'partnership':
    case 'business_sale':
    case 'investment':
      return 'Submit Inquiry';
    case 'volunteer':
      return 'Apply to Volunteer';
    case 'consultancy':
      return 'Apply for Consultancy';
    default:
      return 'Apply for this Opportunity';
  }
};
import {
  X,
  MapPin,
  Calendar,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Send,
  ArrowRight,
  Sparkles,
  FileText,
  Check,
  Edit3,
  Users,
  Briefcase,
  DollarSign,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { applicationService } from '../services/applicationService';
import { candidateService } from '../services/candidateService';
import { useToast } from '../context/ToastContext';

interface OpportunityDetailModalProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  currency: 'USD' | 'LRD';
  onApplySuccess: (oppId: string, applicantName: string) => void;
  onEdit?: (opp: Opportunity) => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  onClose,
  currency,
  onApplySuccess,
  onEdit
}) => {
  if (!opportunity) return null;

  const { session, activeRole, user, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [isApplying, setIsApplying] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [applicantName, setApplicantName] = useState(user?.fullName || '');
  const [applicantEmail, setApplicantEmail] = useState(user?.email || '');
  const [applicantPhone, setApplicantPhone] = useState(user?.phoneNumber || '');
  const [coverNote, setCoverNote] = useState('');
  const [screeningAnswers, setScreeningAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Load candidate profile when user opens modal
  useEffect(() => {
    if (user?.id) {
      candidateService.getMyProfile().then((res) => {
        if (res.data) {
          setCandidateProfile(res.data);
          if (res.data.fullName) setApplicantName(res.data.fullName);
          if (res.data.email) setApplicantEmail(res.data.email);
          if (res.data.phone) setApplicantPhone(res.data.phone);
        }
      });
    }
  }, [user?.id]);

  const isOwner =
    session?.activeOrganization?.id === opportunity.organizationId ||
    activeRole === 'platform_admin' ||
    session?.user?.systemRole === 'platform_admin';

  const isTodayExpired =
    opportunity.deadline && new Date(opportunity.deadline) < new Date();
  const effectiveStatus =
    opportunity.status === 'published' && isTodayExpired ? 'expired' : opportunity.status;
  const isAcceptingApplications = effectiveStatus === 'published';

  const LRD_RATE = 195;

  const formatSalary = () => {
    if (opportunity.isSalaryConfidential) {
      return 'Salary Confidential';
    }
    if (!opportunity.salaryMin && !opportunity.salaryMax) {
      return opportunity.isSalaryNegotiable ? 'Negotiable Compensation' : 'Competitive Rates';
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

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantEmail) return;

    setIsSubmitted(true);
    try {
      const applicationPayload = {
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        organizationId: opportunity.organizationId,
        organizationName: opportunity.organization.name,
        candidateUserId: user?.id,
        applicantName: applicantName,
        applicantEmail: applicantEmail,
        applicantPhone: applicantPhone,
        applicantLocation: candidateProfile?.county || opportunity.county,
        coverNote: coverNote,
        screeningAnswers: screeningAnswers,
        resumeUrl: candidateProfile?.cv?.fileDataUrl || undefined,
        matchScore: Math.floor(Math.random() * 15) + 85
      };

      const res = await applicationService.submit(applicationPayload);
      if (res.data) {
        onApplySuccess(opportunity.id, applicantName);
        setIsApplying(false);
        setIsSubmitted(false);
        onClose();
      } else if (res.error) {
        showToast(res.error.message, 'error');
        setIsSubmitted(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit application.', 'error');
      setIsSubmitted(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-[32px] sm:rounded-[40px] border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-6 sm:p-8 bg-[#ECF3E9] border-b border-[#D9E3D5] relative flex-none">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-[#283618] border border-[#D9E3D5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Status & Badge Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                effectiveStatus === 'published'
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : effectiveStatus === 'draft'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : effectiveStatus === 'expired'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              {effectiveStatus}
            </span>
            <span className="px-3 py-1 bg-white text-[#283618] text-xs font-bold rounded-full uppercase tracking-wider border border-[#D9E3D5]">
              {OPPORTUNITY_TYPES.find(t => t.id === opportunity.type)?.label || opportunity.type}
            </span>
            <span className="px-3 py-1 bg-[#FEFAE0] text-[#BC6C25] text-xs font-bold rounded-full uppercase tracking-wider border border-[#E8E4D9]">
              {opportunity.organization.verificationBadge?.replace('_', ' ') || 'Verified Entity'}
            </span>

            <span className="text-xs text-[#606C38] flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#A3B18A]" />
              {opportunity.locationDetails}
            </span>
          </div>

          <h2 className="text-xl sm:text-3xl font-serif font-bold text-[#132A13] leading-tight mb-2">
            {opportunity.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#606C38]">
            <span className="font-semibold text-[#283618]">{opportunity.organization.name}</span>
            <span>•</span>
            <span className="capitalize">{opportunity.workplaceModel?.replace('_', ' ')}</span>
            {opportunity.employmentType && (
              <>
                <span>•</span>
                <span className="capitalize">{opportunity.employmentType?.replace('_', ' ')}</span>
              </>
            )}
            <span>•</span>
            <span className="text-[#BC6C25] font-bold">{formatSalary()}</span>
            <span>•</span>
            <span className="text-[#A3B18A]">
              Deadline: {opportunity.deadline || 'Rolling Open'}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-[#2D2D2D]">
          {/* Lifecycle Warning Banner if Expired, Closed, or Draft */}
          {effectiveStatus === 'expired' && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 leading-relaxed">
                <strong>Application Deadline Passed:</strong> The deadline for this vacancy was {opportunity.deadline}. This opportunity is expired and is no longer accepting new submissions.
              </div>
            </div>
          )}

          {effectiveStatus === 'closed' && (
            <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-stone-600 shrink-0 mt-0.5" />
              <div className="text-xs text-stone-800 leading-relaxed">
                <strong>Posting Closed:</strong> The publishing organization has closed this vacancy.
              </div>
            </div>
          )}

          {effectiveStatus === 'draft' && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Draft Mode:</strong> This opportunity has not been published to the marketplace yet and is only visible to organization administrators.
              </div>
            </div>
          )}

          {/* Key Facts Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F9F8F6] p-4 rounded-2xl border border-[#E8E4D9]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3B18A]">County</div>
              <div className="text-xs font-semibold text-[#283618] mt-0.5">{opportunity.county}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3B18A]">Model</div>
              <div className="text-xs font-semibold text-[#283618] mt-0.5 capitalize">{opportunity.workplaceModel?.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3B18A]">Openings</div>
              <div className="text-xs font-semibold text-[#283618] mt-0.5">{opportunity.openingsCount || 1} Open Position</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3B18A]">Posted Date</div>
              <div className="text-xs font-semibold text-[#283618] mt-0.5">{opportunity.postedDate}</div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2">Overview</h4>
            <p className="text-sm sm:text-base leading-relaxed text-[#2D2D2D] whitespace-pre-line">
              {opportunity.description}
            </p>
          </div>

          {/* Responsibilities */}
          {opportunity.responsibilities && opportunity.responsibilities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2.5">Key Responsibilities</h4>
              <ul className="space-y-2">
                {opportunity.responsibilities.map((resp, i) => (
                  <li key={i} className="text-xs sm:text-sm flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4F772D] mt-2 shrink-0"></span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {opportunity.requirements && opportunity.requirements.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2.5">Qualifications & Criteria</h4>
              <ul className="space-y-2">
                {opportunity.requirements.map((req, i) => (
                  <li key={i} className="text-xs sm:text-sm flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#BC6C25] mt-2 shrink-0"></span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills Required Tags */}
          {opportunity.skills && opportunity.skills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2">Competencies</h4>
              <div className="flex flex-wrap gap-2">
                {opportunity.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-[#F9F8F4] border border-[#E8E4D9] rounded-xl text-xs font-medium text-[#606C38]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Application Guest Login Prompt */}
          {isApplying && isAcceptingApplications && !user && (
            <div className="mt-6 p-6 bg-[#FEFAE0] rounded-3xl border border-[#E8E4D9] text-center space-y-4 animate-fade-in" id="login-prompt-box">
              <div className="mx-auto w-12 h-12 bg-[#283618]/10 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#283618]" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-[#132A13] text-base">Sign In to Apply</h3>
                <p className="text-xs text-[#606C38] mt-1.5 leading-relaxed">
                  You must be registered as a Candidate on OpportunityHub Liberia to submit your standard CV and track application progress.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-5 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  id="modal-login-button"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-5 py-2.5 border border-[#E8E4D9] text-[#283618] hover:border-[#283618] rounded-xl text-xs font-bold cursor-pointer bg-white transition-all"
                  id="modal-register-button"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {/* Application Inline Form */}
          {isApplying && isAcceptingApplications && user && (
            <form onSubmit={handleApply} className="mt-6 p-5 sm:p-6 bg-[#F9F8F4] rounded-3xl border border-[#E8E4D9] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#132A13] text-base">Submit Application & Credentials</h3>
                <span className="text-xs text-[#606C38]">Zero recruitment fees required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#283618] mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="e.g., Emmanuel Flomo"
                    className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#283618] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Liberian Phone Number (for SMS status updates)</label>
                <input
                  type="tel"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="+231 77 000 0000 / +231 88 000 0000"
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              {/* Screening Questions from Employer */}
              {opportunity.screeningQuestions && opportunity.screeningQuestions.length > 0 && (
                <div className="pt-2 border-t border-[#E8E4D9] space-y-3">
                  <div className="text-xs font-bold text-[#283618]">Employer Screening Questions</div>
                  {opportunity.screeningQuestions.map((q, idx) => (
                    <div key={idx}>
                      <label className="block text-xs text-[#606C38] mb-1 font-medium">{q}</label>
                      <input
                        type="text"
                        required
                        value={screeningAnswers[idx] || ''}
                        onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [idx]: e.target.value })}
                        placeholder="Your response..."
                        className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Cover Note / Additional Qualifications</label>
                <textarea
                  rows={3}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Summarize your relevant Liberian experience and readiness..."
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                ></textarea>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E8E4D9] flex items-center justify-between text-xs text-[#606C38]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4F772D]" />
                  <span>
                    Resume / CV Document:{' '}
                    <strong>{candidateProfile?.cv?.fileName || 'Attached Liberian Standard CV'}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-[#4F772D] font-bold">
                  {candidateProfile?.cv ? 'Attached from Profile' : 'Auto-generated'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitted}
                  className="px-6 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitted ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm Submission</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Trust & Safety Scam Shield Advisory */}
          <div className="p-4 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9] flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#BC6C25] shrink-0 mt-0.5" />
            <div className="text-xs text-[#606C38] leading-relaxed">
              <strong className="text-[#283618]">Trust & Safety Notice:</strong> OpportunityHub Liberia enforces strict zero-tolerance policies against advance-fee recruitment scams. Legitimate employers never require payment for job interviews, uniforms, medical checkups, or tender registration.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-white border-t border-[#E8E4D9] flex flex-wrap items-center justify-between gap-3 flex-none">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs text-[#A3B18A] hover:text-[#BC6C25] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Report Suspicious Listing</span>
            </button>

            {isOwner && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(opportunity);
                }}
                className="px-3 py-1.5 bg-[#F9F8F6] hover:bg-[#EBE9E1] text-[#283618] rounded-xl border border-[#E8E4D9] text-xs font-semibold flex items-center gap-1.5 cursor-pointer ml-3"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#4F772D]" />
                <span>Edit Posting</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
            >
              Close
            </button>
            {!isApplying && isAcceptingApplications && (
              <button
                onClick={() => setIsApplying(true)}
                className="px-6 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>{getCtaText(opportunity.type)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
