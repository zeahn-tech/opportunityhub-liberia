import React, { useState } from 'react';
import {
  Application,
  ApplicationStage,
  CandidateProfile,
  InterviewScheduleDetails,
  Opportunity
} from '../types';
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Search,
  ShieldCheck,
  Calendar,
  DollarSign,
  XCircle,
  Eye,
  Star,
  MessageSquare,
  Building2,
  AlertCircle,
  CheckCircle2,
  Phone,
  Video,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db } from '../db/dbClient';
import { applicationService } from '../services/applicationService';
import { candidateService } from '../services/candidateService';
import { CandidateProfileDrawer } from './candidate/CandidateProfileDrawer';
import { OrganizationTeamModal } from './organization/OrganizationTeamModal';
import { OrganizationWizardModal } from './organization/OrganizationWizardModal';

interface RecruiterWorkspaceProps {
  opportunities: Opportunity[];
  applications: Application[];
  onUpdateStage: (appId: string, newStage: ApplicationStage, options?: any) => void;
  onOpenCreateModal: () => void;
}

export const RecruiterWorkspace: React.FC<RecruiterWorkspaceProps> = ({
  opportunities,
  applications,
  onUpdateStage,
  onOpenCreateModal
}) => {
  const { user, activeOrganization, activeMembership, userOrganizations } = useAuth();
  const { showToast } = useToast();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

  const [selectedStage, setSelectedStage] = useState<ApplicationStage | 'all'>('all');
  const [selectedOppId, setSelectedOppId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals and Drawers
  const [selectedCandidateProfile, setSelectedCandidateProfile] = useState<CandidateProfile | null>(null);
  const [activeAppForDrawer, setActiveAppForDrawer] = useState<Application | null>(null);

  // Interview Schedule Modal
  const [interviewModalApp, setInterviewModalApp] = useState<Application | null>(null);
  const [interviewDate, setInterviewDate] = useState('2026-09-12');
  const [interviewTime, setInterviewTime] = useState('10:00 AM');
  const [interviewType, setInterviewType] = useState<'in_person' | 'phone' | 'video_call' | 'online_assessment'>('in_person');
  const [interviewLocation, setInterviewLocation] = useState('Monrovia Head Office / Google Meet');
  const [interviewInstructions, setInterviewInstructions] = useState('Please bring copies of academic degrees and valid Liberian national identification.');

  // Formal Offer Modal
  const [offerModalApp, setOfferModalApp] = useState<Application | null>(null);
  const [offerSalaryUSD, setOfferSalaryUSD] = useState<number>(1200);
  const [offerStartDate, setOfferStartDate] = useState('2026-10-01');
  const [offerNotes, setOfferNotes] = useState('Full-time permanent offer with health coverage and transportation allowance.');

  // Rejection Modal
  const [rejectionModalApp, setRejectionModalApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Position filled by another candidate with specific domain requirements.');

  // Evaluation Rating Modal
  const [evalModalApp, setEvalModalApp] = useState<Application | null>(null);
  const [evalRating, setEvalRating] = useState<number>(4);
  const [evalNotes, setEvalNotes] = useState('');

  const stages: { label: string; value: ApplicationStage }[] = [
    { label: 'Applied', value: 'applied' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Shortlisted', value: 'shortlisted' },
    { label: 'Interview Scheduled', value: 'interview' },
    { label: 'Offer / Hired', value: 'offer' },
    { label: 'Hired', value: 'hired' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Withdrawn', value: 'withdrawn' }
  ];

  const filteredApps = applications.filter((app) => {
    if (selectedStage !== 'all' && app.stage !== selectedStage) return false;
    if (selectedOppId !== 'all' && app.opportunityId !== selectedOppId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.applicantName.toLowerCase().includes(q);
      const matchTitle = app.opportunityTitle.toLowerCase().includes(q);
      const matchEmail = app.applicantEmail?.toLowerCase().includes(q) || false;
      if (!matchName && !matchTitle && !matchEmail) return false;
    }
    return true;
  });

  const handleOpenCandidateDrawer = async (app: Application) => {
    setActiveAppForDrawer(app);
    try {
      if (app.candidateUserId) {
        const res = await candidateService.getPublicProfile(app.candidateUserId);
        if (res.data) {
          setSelectedCandidateProfile(res.data);
          return;
        }
      }
      // Fallback: create mock-safe view from application data
      setSelectedCandidateProfile({
        userId: app.candidateUserId || app.applicantUserId || 'guest',
        fullName: app.applicantName,
        email: app.applicantEmail,
        phone: app.applicantPhone,
        county: (app.applicantLocation as any) || 'Montserrado',
        headline: `Applicant for ${app.opportunityTitle}`,
        bio: app.coverNote || 'Verified candidate application submitted.',
        yearsOfExperience: 3,
        education: [],
        experience: [],
        skills: [],
        certifications: [],
        languages: [{ id: '1', language: 'English', proficiency: 'fluent' }],
        portfolio: [],
        privacySettings: {
          profileVisibility: 'public',
          contactVisibility: 'public',
          cvDownloadPermission: 'all_employers',
          showSalaryExpectations: true
        },
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      showToast('Could not load candidate profile.', 'error');
    }
  };

  const handleConfirmScheduleInterview = () => {
    if (!interviewModalApp) return;
    const details: InterviewScheduleDetails = {
      scheduledDate: interviewDate,
      scheduledTime: interviewTime,
      type: interviewType,
      locationOrLink: interviewLocation,
      candidateInstructions: interviewInstructions,
      interviewerName: user.fullName || 'Recruiter Team'
    };

    onUpdateStage(interviewModalApp.id, 'interview', {
      note: `Interview scheduled for ${interviewDate} at ${interviewTime} (${interviewType?.replace('_', ' ') || 'Unknown'})`,
      interviewDetails: details
    });

    showToast(`Interview scheduled for ${interviewModalApp.applicantName}.`, 'success');
    setInterviewModalApp(null);
  };

  const handleConfirmOffer = () => {
    if (!offerModalApp) return;
    onUpdateStage(offerModalApp.id, 'offer', {
      note: `Formal offer extended ($${offerSalaryUSD}/mo) starting ${offerStartDate}.`,
      hiringOfferDetails: {
        salaryUSD: offerSalaryUSD,
        startDate: offerStartDate,
        notes: offerNotes
      }
    });
    showToast(`Official offer extended to ${offerModalApp.applicantName}.`, 'success');
    setOfferModalApp(null);
  };

  const handleConfirmReject = () => {
    if (!rejectionModalApp) return;
    onUpdateStage(rejectionModalApp.id, 'rejected', {
      note: `Candidate archived: ${rejectionReason}`,
      rejectionReason: rejectionReason
    });
    showToast(`Application for ${rejectionModalApp.applicantName} updated to rejected.`, 'info');
    setRejectionModalApp(null);
  };

  const handleConfirmEvaluation = async () => {
    if (!evalModalApp) return;
    try {
      await applicationService.updateEvaluation(evalModalApp.id, {
        rating: evalRating,
        employerNotes: evalNotes
      });
      showToast(`Evaluation saved for ${evalModalApp.applicantName}.`, 'success');
      setEvalModalApp(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save evaluation.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Organization Tenant Bar */}
      {activeOrganization ? (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E4D9] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#283618] text-white font-bold flex items-center justify-center text-base shadow-sm">
              {activeOrganization.logoText || activeOrganization.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#132A13]">{activeOrganization.name}</h3>
                {activeOrganization.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F772D] bg-[#ECF3E9] px-2 py-0.5 rounded-full border border-[#D9E3D5]">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Tenant
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#606C38] mt-0.5">
                <span className="capitalize">{activeOrganization.type?.replace('_', ' ')}</span>
                <span>•</span>
                <span>{activeOrganization.county}</span>
                <span>•</span>
                <span className="font-semibold text-[#283618]">
                  Role: <span className="capitalize">{activeMembership?.orgRole || 'Member'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#F9F8F6] hover:bg-[#ECF3E9] text-[#283618] rounded-xl text-xs font-bold border border-[#E8E4D9] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#4F772D]" />
              <span>Manage Team & Access</span>
            </button>
            <button
              onClick={() => setIsCreateOrgOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#F9F8F6] hover:bg-[#F2F2EC] text-[#606C38] hover:text-[#283618] rounded-xl text-xs font-semibold border border-[#E8E4D9] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Org</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#FEFAE0]/60 p-4 sm:p-5 rounded-3xl border border-[#DDA15E]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#DDA15E]/20 text-[#BC6C25] rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#283618]">Operating in Personal Context</h4>
              <p className="text-xs text-[#606C38] mt-0.5">
                Switch to an organization workspace or register an enterprise to unlock team collaboration, pipeline permissions, and institution-verified badges.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateOrgOpen(true)}
            className="px-4 py-2 bg-[#BC6C25] hover:bg-[#99581E] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0"
          >
            + Register Organization
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#ECF3E9] p-6 sm:p-8 rounded-[32px] border border-[#D9E3D5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F772D] mb-1">
            <Users className="w-4 h-4" />
            <span>Employer Recruitment & Screening Pipeline</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#132A13]">
            Recruiter & Applicant Management
          </h2>
          <p className="text-xs sm:text-sm text-[#606C38] mt-1 max-w-xl">
            Review candidate applications, examine screening answers, schedule structured interviews, and extend employment offers.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-5 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Vacancy</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8E4D9] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#A3B18A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name or role..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-[#283618] shrink-0">Filter by Vacancy:</span>
            <select
              value={selectedOppId}
              onChange={(e) => setSelectedOppId(e.target.value)}
              className="text-xs p-2 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none text-[#283618] max-w-[240px]"
            >
              <option value="all">All Vacancies ({opportunities.length})</option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pipeline Status Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-[#E8E4D9]">
          <button
            onClick={() => setSelectedStage('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedStage === 'all'
                ? 'bg-[#283618] text-white border-[#283618]'
                : 'bg-white text-[#606C38] border-[#E8E4D9] hover:bg-[#F9F8F6]'
            }`}
          >
            All Submissions ({applications.length})
          </button>

          {stages.map((st) => {
            const count = applications.filter((a) => a.stage === st.value).length;
            return (
              <button
                key={st.value}
                onClick={() => setSelectedStage(st.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  selectedStage === st.value
                    ? 'bg-[#283618] text-white border-[#283618]'
                    : 'bg-white text-[#606C38] border-[#E8E4D9] hover:bg-[#F9F8F6]'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedStage === st.value ? 'bg-white/20 text-white' : 'bg-[#F2F2EC] text-[#606C38]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E4D9]">
            <Users className="w-10 h-10 text-[#A3B18A] mx-auto mb-2" />
            <div className="text-sm font-bold text-[#283618]">No candidate applications in this stage</div>
            <div className="text-xs text-[#606C38] mt-1">
              New submissions from Liberian candidates and job seekers will appear here in real time.
            </div>
          </div>
        ) : (
          filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E4D9] shadow-xs flex flex-col md:flex-row justify-between gap-4 hover:border-[#D9E3D5] transition-all"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-base sm:text-lg text-[#132A13]">{app.applicantName}</h4>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                      app.stage === 'applied'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : app.stage === 'under_review'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : app.stage === 'shortlisted'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : app.stage === 'interview'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : app.stage === 'offer' || app.stage === 'hired'
                        ? 'bg-green-100 text-green-900 border-green-300'
                        : app.stage === 'withdrawn'
                        ? 'bg-stone-100 text-stone-600 border-stone-300'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    Stage: {app.stage.replace('_', ' ')}
                  </span>
                  {app.matchScore && (
                    <span className="px-2 py-0.5 bg-[#FEFAE0] text-[#BC6C25] text-[10px] font-bold rounded-md">
                      ✨ {app.matchScore}% Match
                    </span>
                  )}
                  {app.rating && (
                    <span className="px-2 py-0.5 bg-[#ECF3E9] text-[#4F772D] text-[10px] font-bold rounded-md">
                      ★ {app.rating}/5
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#606C38] flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#283618]">Role: {app.opportunityTitle}</span>
                  <span>•</span>
                  <span>{app.applicantEmail}</span>
                  <span>•</span>
                  <span>{app.applicantPhone}</span>
                  <span>•</span>
                  <span>Applied: {app.appliedDate}</span>
                </div>

                {app.coverNote && (
                  <p className="text-xs text-[#2D2D2D] bg-[#F9F8F4] p-3 rounded-xl border border-[#E8E4D9] italic">
                    "{app.coverNote}"
                  </p>
                )}

                {/* Screening Answers */}
                {app.screeningAnswers && Object.keys(app.screeningAnswers).length > 0 && (
                  <div className="p-3 bg-[#FEFAE0]/40 rounded-xl border border-[#E8E4D9] text-xs space-y-1">
                    <div className="font-semibold text-[#283618]">Candidate Screening Responses:</div>
                    {Object.entries(app.screeningAnswers).map(([k, v]) => (
                      <div key={k} className="text-[#606C38]">
                        • {v}
                      </div>
                    ))}
                  </div>
                )}

                {/* Interview Notice */}
                {app.stage === 'interview' && app.interviewDetails && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      <strong>Interview:</strong> {app.interviewDetails.scheduledDate} at {app.interviewDetails.scheduledTime} ({app.interviewDetails.type?.replace('_', ' ') || 'Unknown'})
                    </span>
                  </div>
                )}

                {/* Offer Notice */}
                {app.stage === 'offer' && app.hiringOfferDetails && (
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-xs text-green-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-700 shrink-0" />
                    <span>
                      <strong>Offer Extended:</strong> ${app.hiringOfferDetails.salaryUSD?.toLocaleString()}/mo • Start: {app.hiringOfferDetails.startDate}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Controls & Pipeline Advancement */}
              <div className="flex flex-col justify-between gap-3 shrink-0 border-t md:border-t-0 md:border-l border-[#E8E4D9] pt-3 md:pt-0 md:pl-4 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenCandidateDrawer(app)}
                    className="flex-1 px-3 py-1.5 bg-[#F9F8F6] hover:bg-[#ECF3E9] text-[#283618] border border-[#E8E4D9] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#4F772D]" />
                    <span>View CV / Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setEvalModalApp(app);
                      setEvalRating(app.rating || 4);
                      setEvalNotes(app.employerNotes || '');
                    }}
                    className="p-1.5 bg-[#F9F8F6] hover:bg-[#FEFAE0] text-[#BC6C25] border border-[#E8E4D9] rounded-xl text-xs font-bold cursor-pointer"
                    title="Score Candidate"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#A3B18A] block">
                    Advance Recruitment Stage
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {app.stage === 'applied' && (
                      <button
                        onClick={() => onUpdateStage(app.id, 'under_review', { note: 'Review started by recruiter.' })}
                        className="w-full px-3 py-1.5 bg-[#F9F8F4] hover:bg-[#ECF3E9] text-[#283618] border border-[#E8E4D9] rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Begin Review →
                      </button>
                    )}

                    {(app.stage === 'applied' || app.stage === 'under_review') && (
                      <button
                        onClick={() => onUpdateStage(app.id, 'shortlisted', { note: 'Candidate shortlisted for interview round.' })}
                        className="w-full px-3 py-1.5 bg-[#ECF3E9] hover:bg-[#D9E3D5] text-[#4F772D] border border-[#D9E3D5] rounded-xl text-xs font-bold cursor-pointer"
                      >
                        ★ Shortlist Candidate →
                      </button>
                    )}

                    {app.stage === 'shortlisted' && (
                      <button
                        onClick={() => setInterviewModalApp(app)}
                        className="w-full px-3 py-1.5 bg-[#FEFAE0] hover:bg-[#DDA15E]/20 text-[#BC6C25] border border-[#E8E4D9] rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Schedule Interview →</span>
                      </button>
                    )}

                    {app.stage === 'interview' && (
                      <button
                        onClick={() => setOfferModalApp(app)}
                        className="w-full px-3 py-1.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Extend Job Offer ✓</span>
                      </button>
                    )}

                    {app.stage === 'offer' && (
                      <button
                        onClick={() => onUpdateStage(app.id, 'hired', { note: 'Offer accepted. Candidate formally hired.' })}
                        className="w-full px-3 py-1.5 bg-[#132A13] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Mark as Formally Hired ✓
                      </button>
                    )}

                    {app.stage !== 'rejected' && app.stage !== 'hired' && app.stage !== 'withdrawn' && (
                      <button
                        onClick={() => setRejectionModalApp(app)}
                        className="w-full text-center text-[11px] text-stone-500 hover:text-red-700 pt-1 cursor-pointer"
                      >
                        Archive / Reject Candidate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Candidate Profile Drawer */}
      {selectedCandidateProfile && (
        <CandidateProfileDrawer
          profile={selectedCandidateProfile}
          application={activeAppForDrawer}
          onClose={() => {
            setSelectedCandidateProfile(null);
            setActiveAppForDrawer(null);
          }}
        />
      )}

      {/* MODAL: SCHEDULE INTERVIEW */}
      {interviewModalApp && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#E8E4D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <Calendar className="w-6 h-6" />
              <h3 className="font-bold text-lg text-[#132A13]">Schedule Candidate Interview</h3>
            </div>
            <p className="text-xs text-[#606C38]">
              Arrange an interview with <strong>{interviewModalApp.applicantName}</strong> for <strong>{interviewModalApp.opportunityTitle}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#283618] mb-1">Interview Date *</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#283618] mb-1">Interview Time *</label>
                  <input
                    type="text"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    placeholder="e.g., 10:30 AM"
                    className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#283618] mb-1">Interview Format</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                >
                  <option value="in_person">In-Person (Office / Field Site)</option>
                  <option value="phone">Phone Screening</option>
                  <option value="video_call">Video Conference (Google Meet / Zoom)</option>
                  <option value="online_assessment">Technical / Practical Assessment</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#283618] mb-1">Location / Meeting Link</label>
                <input
                  type="text"
                  value={interviewLocation}
                  onChange={(e) => setInterviewLocation(e.target.value)}
                  placeholder="e.g., 15th Street, Sinkor, Monrovia or https://meet.google.com/..."
                  className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#283618] mb-1">Instructions for Candidate</label>
                <textarea
                  rows={2}
                  value={interviewInstructions}
                  onChange={(e) => setInterviewInstructions(e.target.value)}
                  placeholder="e.g., Please bring your national identification and original university transcripts..."
                  className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setInterviewModalApp(null)}
                className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmScheduleInterview}
                className="px-5 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm & Notify Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXTEND FORMAL OFFER */}
      {offerModalApp && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#E8E4D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-800">
              <DollarSign className="w-6 h-6" />
              <h3 className="font-bold text-lg text-[#132A13]">Issue Formal Job Offer</h3>
            </div>
            <p className="text-xs text-[#606C38]">
              Prepare official compensation package for <strong>{offerModalApp.applicantName}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#283618] mb-1">Monthly Salary (USD) *</label>
                  <input
                    type="number"
                    value={offerSalaryUSD}
                    onChange={(e) => setOfferSalaryUSD(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#283618] mb-1">Target Start Date</label>
                  <input
                    type="date"
                    value={offerStartDate}
                    onChange={(e) => setOfferStartDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#283618] mb-1">Offer Terms & Benefits Notes</label>
                <textarea
                  rows={3}
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                  placeholder="Includes NASSCORP benefits, transportation allowance, and probationary review..."
                  className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setOfferModalApp(null)}
                className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOffer}
                className="px-5 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Issue Formal Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECT CANDIDATE */}
      {rejectionModalApp && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#E8E4D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-[#132A13]">Archive / Reject Application</h3>
            </div>
            <p className="text-xs text-[#606C38]">
              Archive <strong>{rejectionModalApp.applicantName}</strong>'s application for <strong>{rejectionModalApp.opportunityTitle}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#283618] mb-1">Feedback / Archival Reason</label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for archive..."
                className="w-full text-xs p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectionModalApp(null)}
                className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Archive Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EVALUATE & SCORE CANDIDATE */}
      {evalModalApp && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#E8E4D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#BC6C25]">
              <Star className="w-6 h-6" />
              <h3 className="font-bold text-base text-[#132A13]">Candidate Evaluation</h3>
            </div>
            <p className="text-xs text-[#606C38]">
              Internal rating and interview notes for <strong>{evalModalApp.applicantName}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#283618] mb-1">Recruiter Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEvalRating(star)}
                      className={`p-2 rounded-xl border text-sm font-bold flex items-center gap-1 cursor-pointer ${
                        evalRating >= star
                          ? 'bg-[#FEFAE0] border-[#BC6C25] text-[#BC6C25]'
                          : 'bg-white border-[#E8E4D9] text-stone-400'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#283618] mb-1">Internal Employer Notes</label>
                <textarea
                  rows={3}
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Record strengths, technical interview score, and panel feedback..."
                  className="w-full p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEvalModalApp(null)}
                className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEvaluation}
                className="px-5 py-2 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Save Evaluation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Team Management Modal */}
      <OrganizationTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        organization={activeOrganization}
      />

      {/* Organization Creation Wizard Modal */}
      <OrganizationWizardModal
        isOpen={isCreateOrgOpen}
        onClose={() => setIsCreateOrgOpen(false)}
      />
    </div>
  );
};
