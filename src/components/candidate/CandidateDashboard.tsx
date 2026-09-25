import React, { useState, useEffect } from 'react';
import {
  Application,
  ApplicationStage,
  CandidateProfile,
  InterviewScheduleDetails,
  Opportunity
} from '../../types';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
  Building2,
  FileText,
  AlertTriangle,
  XCircle,
  Eye,
  User,
  ArrowRight,
  ShieldCheck,
  Award,
  Video,
  Phone,
  DollarSign,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { applicationService } from '../../services/applicationService';
import { candidateService } from '../../services/candidateService';
import { CandidateProfileEditor } from './CandidateProfileEditor';

interface CandidateDashboardProps {
  onBrowseJobs?: () => void;
  onViewJobDetail?: (oppId: string) => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  onBrowseJobs,
  onViewJobDetail
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'applications' | 'profile' | 'interviews'>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Application Stage Filter
  const [selectedStage, setSelectedStage] = useState<ApplicationStage | 'all'>('all');

  // Selected Application for Timeline & Details Modal
  const [activeAppDetails, setActiveAppDetails] = useState<Application | null>(null);

  // Withdraw Modal State
  const [appToWithdraw, setAppToWithdraw] = useState<Application | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Load candidate applications & profile
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [appsRes, profRes] = await Promise.all([
        applicationService.listMyApplications(),
        candidateService.getMyProfile()
      ]);

      if (appsRes.data) {
        setApplications(appsRes.data);
      }
      if (profRes.data) {
        setCandidateProfile(profRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading candidate portal.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  // Handle Application Withdrawal
  const handleConfirmWithdraw = async () => {
    if (!appToWithdraw) return;
    setIsWithdrawing(true);
    try {
      const res = await applicationService.withdraw(appToWithdraw.id, withdrawReason);
      if (res.data) {
        showToast('Application withdrawn successfully.', 'info');
        setApplications((prev) => prev.map((a) => (a.id === appToWithdraw.id ? res.data! : a)));
        if (activeAppDetails?.id === appToWithdraw.id) {
          setActiveAppDetails(res.data);
        }
        setAppToWithdraw(null);
        setWithdrawReason('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to withdraw application.', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleProfileSave = async (updated: CandidateProfile) => {
    try {
      const res = await candidateService.saveMyProfile(updated);
      if (res.data) {
        setCandidateProfile(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    }
  };

  const stages: { label: string; value: ApplicationStage }[] = [
    { label: 'Applied', value: 'applied' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Shortlisted', value: 'shortlisted' },
    { label: 'Interview Scheduled', value: 'interview' },
    { label: 'Offer Received', value: 'offer' },
    { label: 'Hired', value: 'hired' },
    { label: 'Archived / Rejected', value: 'rejected' },
    { label: 'Withdrawn', value: 'withdrawn' }
  ];

  const filteredApps = applications.filter((app) => {
    if (selectedStage !== 'all' && app.stage !== selectedStage) return false;
    return true;
  });

  const interviewApps = applications.filter((a) => a.stage === 'interview' && a.interviewDetails);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#ECF3E9] p-6 sm:p-8 rounded-[32px] border border-[#D9E3D5] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F772D] mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Candidate & Professional Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#132A13]">
            My Applications & Career Workspace
          </h2>
          <p className="text-xs sm:text-sm text-[#606C38] mt-1">
            Track submissions, manage interviews with verified employers, and maintain your Liberian talent credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBrowseJobs && (
            <button
              onClick={onBrowseJobs}
              className="px-5 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Browse Vacancies</span>
            </button>
          )}

          <button
            onClick={loadDashboardData}
            className="p-2.5 bg-white text-[#283618] hover:bg-[#F9F8F6] rounded-full border border-[#D9E3D5] shadow-xs cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E8E4D9] pb-3">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-[#283618] text-white shadow-xs'
              : 'bg-white text-[#606C38] border border-[#E8E4D9] hover:bg-[#F9F8F6]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Track Applications ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('interviews')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'interviews'
              ? 'bg-[#283618] text-white shadow-xs'
              : 'bg-white text-[#606C38] border border-[#E8E4D9] hover:bg-[#F9F8F6]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Interviews & Offers ({interviewApps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#283618] text-white shadow-xs'
              : 'bg-white text-[#606C38] border border-[#E8E4D9] hover:bg-[#F9F8F6]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile & CV Studio</span>
        </button>
      </div>

      {/* TAB 1: APPLICATIONS LIST */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedStage('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedStage === 'all'
                  ? 'bg-[#283618] text-white border-[#283618]'
                  : 'bg-white text-[#606C38] border-[#E8E4D9] hover:bg-[#F9F8F6]'
              }`}
            >
              All Submissions ({applications.length})
            </button>

            {stages.map((st) => {
              const count = applications.filter((a) => a.stage === st.value).length;
              if (count === 0 && selectedStage !== st.value) return null;
              return (
                <button
                  key={st.value}
                  onClick={() => setSelectedStage(st.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
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

          {/* Applications Grid */}
          {filteredApps.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E4D9]">
              <Briefcase className="w-10 h-10 text-[#A3B18A] mx-auto mb-2" />
              <div className="text-sm font-bold text-[#283618]">No applications found</div>
              <p className="text-xs text-[#606C38] mt-1 max-w-md mx-auto">
                Explore verified job postings and tenders across Liberia's 15 counties to submit your credentials.
              </p>
              {onBrowseJobs && (
                <button
                  onClick={onBrowseJobs}
                  className="mt-4 px-5 py-2.5 bg-[#4F772D] text-white rounded-full text-xs font-bold shadow-md cursor-pointer"
                >
                  Browse Opportunities
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E4D9] shadow-xs flex flex-col md:flex-row justify-between gap-4 hover:border-[#D9E3D5] transition-all"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
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
                        {app.stage.replace('_', ' ')}
                      </span>

                      {app.matchScore && (
                        <span className="px-2.5 py-0.5 bg-[#FEFAE0] text-[#BC6C25] text-xs font-bold rounded-lg">
                          ✨ {app.matchScore}% Match
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif font-bold text-[#132A13]">
                      {app.opportunityTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#606C38]">
                      <span className="font-semibold text-[#283618] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#4F772D]" />
                        {app.organizationName || 'Verified Organization'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#A3B18A]" />
                        Applied on {app.appliedDate}
                      </span>
                    </div>

                    {/* Interview Notice Callout */}
                    {app.stage === 'interview' && app.interviewDetails && (
                      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-emerald-700" />
                          <span>Interview Scheduled: {app.interviewDetails.scheduledDate} at {app.interviewDetails.scheduledTime}</span>
                        </div>
                        <div className="text-emerald-800">
                          Format: <strong className="capitalize">{app.interviewDetails?.type?.replace('_', ' ') || 'Unknown'}</strong>
                          {app.interviewDetails.locationOrLink && ` • ${app.interviewDetails.locationOrLink}`}
                        </div>
                      </div>
                    )}

                    {/* Offer Notice Callout */}
                    {(app.stage === 'offer' || app.stage === 'hired') && app.hiringOfferDetails && (
                      <div className="p-3.5 bg-green-50 rounded-2xl border border-green-200 text-xs space-y-1">
                        <div className="font-bold text-green-900 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-green-700" />
                          <span>Official Employment Offer Extended</span>
                        </div>
                        <div className="text-green-800">
                          {app.hiringOfferDetails.salaryUSD && `Compensation: $${app.hiringOfferDetails.salaryUSD.toLocaleString()}/mo`}
                          {app.hiringOfferDetails.startDate && ` • Target Start Date: ${app.hiringOfferDetails.startDate}`}
                        </div>
                      </div>
                    )}

                    {/* Withdrawal notice */}
                    {app.stage === 'withdrawn' && (
                      <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-700">
                        <strong>Withdrawn by you on:</strong> {app.withdrawnAt ? new Date(app.withdrawnAt).toLocaleDateString() : 'Recent'}
                        {app.withdrawalReason && ` • Reason: "${app.withdrawalReason}"`}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-[#E8E4D9] pt-3 md:pt-0 md:pl-4">
                    <button
                      onClick={() => setActiveAppDetails(app)}
                      className="px-4 py-2 bg-[#F9F8F6] hover:bg-[#ECF3E9] text-[#283618] border border-[#E8E4D9] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#4F772D]" />
                      <span>View History & Status</span>
                    </button>

                    {app.stage !== 'withdrawn' && app.stage !== 'hired' && app.stage !== 'rejected' && (
                      <button
                        onClick={() => {
                          setAppToWithdraw(app);
                          setWithdrawReason('');
                        }}
                        className="text-xs font-semibold text-stone-500 hover:text-red-700 cursor-pointer"
                      >
                        Withdraw Application
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERVIEWS & OFFERS */}
      {activeTab === 'interviews' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-[#E8E4D9] shadow-xs">
            <h3 className="text-lg font-bold text-[#132A13] mb-1">Scheduled Interviews & Formal Offers</h3>
            <p className="text-xs text-[#606C38]">
              Confirmed appointments and job offers from Liberian employers.
            </p>
          </div>

          {interviewApps.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-[#E8E4D9]">
              <Calendar className="w-8 h-8 text-[#A3B18A] mx-auto mb-2" />
              <div className="text-xs font-bold text-[#283618]">No upcoming interviews scheduled</div>
              <div className="text-xs text-[#606C38] mt-1">
                When recruiters advance your submissions to the interview round, appointment details will appear here.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {interviewApps.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-3xl border border-[#D9E3D5] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full uppercase">
                        Interview Confirmed
                      </span>
                      <h4 className="text-lg font-serif font-bold text-[#132A13] mt-2">{app.opportunityTitle}</h4>
                      <div className="text-xs text-[#606C38]">{app.organizationName}</div>
                    </div>
                  </div>

                  {app.interviewDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] text-xs">
                      <div>
                        <div className="text-[#A3B18A] font-bold uppercase text-[10px]">Date & Time</div>
                        <div className="font-semibold text-[#283618] mt-0.5">
                          {app.interviewDetails.scheduledDate} • {app.interviewDetails.scheduledTime}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#A3B18A] font-bold uppercase text-[10px]">Format</div>
                        <div className="font-semibold text-[#283618] mt-0.5 capitalize">
                          {app.interviewDetails?.type?.replace('_', ' ') || 'Unknown'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#A3B18A] font-bold uppercase text-[10px]">Location / Meeting</div>
                        <div className="font-semibold text-[#283618] mt-0.5">
                          {app.interviewDetails.locationOrLink || 'To be communicated via SMS'}
                        </div>
                      </div>
                    </div>
                  )}

                  {app.interviewDetails?.candidateInstructions && (
                    <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                      <strong>Employer Instructions:</strong> {app.interviewDetails.candidateInstructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CANDIDATE PROFILE EDITOR */}
      {activeTab === 'profile' && candidateProfile && (
        <CandidateProfileEditor
          profile={candidateProfile}
          onSave={handleProfileSave}
        />
      )}

      {/* MODAL: APPLICATION HISTORY & STATUS TIMELINE */}
      {activeAppDetails && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-6 bg-[#ECF3E9] border-b border-[#D9E3D5] flex items-start justify-between">
              <div>
                <span className="px-3 py-1 bg-white text-[#4F772D] text-xs font-bold rounded-full uppercase border border-[#D9E3D5]">
                  Stage: {activeAppDetails.stage.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-serif font-bold text-[#132A13] mt-2">
                  {activeAppDetails.opportunityTitle}
                </h3>
                <div className="text-xs text-[#606C38]">{activeAppDetails.organizationName}</div>
              </div>

              <button
                onClick={() => setActiveAppDetails(null)}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#283618] cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-[#2D2D2D]">
              {/* Application Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] text-xs">
                <div>
                  <div className="text-[10px] text-[#A3B18A] uppercase font-bold">Applicant</div>
                  <div className="font-semibold text-[#283618]">{activeAppDetails.applicantName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#A3B18A] uppercase font-bold">Submission Date</div>
                  <div className="font-semibold text-[#283618]">{activeAppDetails.appliedDate}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#A3B18A] uppercase font-bold">Notification Mobile</div>
                  <div className="font-semibold text-[#283618]">{activeAppDetails.applicantPhone || 'Not provided'}</div>
                </div>
              </div>

              {/* Cover Note */}
              {activeAppDetails.coverNote && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2">Cover Note</h4>
                  <p className="text-xs text-[#2D2D2D] bg-[#F9F8F4] p-3 rounded-xl border border-[#E8E4D9] leading-relaxed italic">
                    "{activeAppDetails.coverNote}"
                  </p>
                </div>
              )}

              {/* Chronological Status Audit Log / History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-3">
                  Status Transition Audit History
                </h4>
                <div className="space-y-3">
                  {activeAppDetails.history && activeAppDetails.history.length > 0 ? (
                    activeAppDetails.history.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 bg-white rounded-2xl border border-[#E8E4D9] flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#ECF3E9] text-[#4F772D] flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#132A13] uppercase tracking-wider text-[11px]">
                              {log.stage.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-[#A3B18A]">
                              {new Date(log.changedAt).toLocaleString()}
                            </span>
                          </div>
                          {log.note && <p className="text-[#606C38] mt-1">{log.note}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-[#606C38] bg-[#F9F8F6] rounded-xl">
                      Application active in recruitment pipeline.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-[#E8E4D9] flex justify-end">
              <button
                onClick={() => setActiveAppDetails(null)}
                className="px-5 py-2 bg-[#283618] text-white rounded-full text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM WITHDRAW APPLICATION */}
      {appToWithdraw && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#E8E4D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-[#132A13]">Withdraw Application?</h3>
            </div>

            <p className="text-xs text-[#606C38] leading-relaxed">
              Are you sure you wish to withdraw your application for <strong>{appToWithdraw.opportunityTitle}</strong>? The employer will be notified of your decision.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">
                Reason for Withdrawal (Optional)
              </label>
              <textarea
                rows={2}
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g., Accepted another offer, relocated, or schedule conflict..."
                className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAppToWithdraw(null)}
                className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={handleConfirmWithdraw}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
