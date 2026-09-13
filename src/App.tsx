import React, { useState, useEffect } from 'react';
import {
  Application,
  ApplicationStage,
  BusinessListing,
  County,
  EmploymentType,
  Opportunity,
  OpportunityType,
  UserRole,
  VerificationAudit,
  WorkplaceModel
} from './types';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { OpportunityCard } from './components/OpportunityCard';
import { RightSidebar } from './components/RightSidebar';
import { OpportunityDetailModal } from './components/OpportunityDetailModal';
import { BusinessMarketplace } from './components/BusinessMarketplace';
import { VerificationHub } from './components/VerificationHub';
import { TrustSafetyAdminCenter } from './components/trust/TrustSafetyAdminCenter';
import { ReportModal } from './components/trust/ReportModal';
import { RecruiterWorkspace } from './components/RecruiterWorkspace';
import { SubscriptionManager } from './components/SubscriptionManager';
import { MessagingCenter } from './components/messaging/MessagingCenter';
import { JobManagementDashboard } from './components/employer/JobManagementDashboard';
import { CandidateDashboard } from './components/candidate/CandidateDashboard';
import { PostOpportunityModal } from './components/PostOpportunityModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { AiStudioHub } from './components/AiStudioHub';
import { AiSemanticSearchBar } from './components/AiSemanticSearchBar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LandingScreen } from './components/LandingScreen';
import { Briefcase, Sparkles, AlertCircle, ShieldCheck, Users, LayoutDashboard, TrendingUp, BarChart3 } from 'lucide-react';
import { EmployerAnalyticsDashboard } from './components/analytics/EmployerAnalyticsDashboard';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

// Foundational Core Providers & Infrastructure
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { RouterProvider, useRouter } from './routes/router';
import { ErrorBoundary } from './core/errors/ErrorBoundary';
import { OfflineBanner } from './pwa/OfflineBanner';
import { AuthModal } from './components/auth/AuthModal';
import { DemoModeBanner } from './components/auth/DemoModeBanner';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { OpportunityCardSkeleton } from './design-system/Skeleton';
import { db } from './db/dbClient';
import { opportunityService } from './services/opportunityService';
import { businessService } from './services/businessService';
import { verificationService } from './services/verificationService';
import { applicationService } from './services/applicationService';

function AppContent() {
  const { currency, setCurrency } = useConfig();
  const { activeRole, switchRole, user, verifyEmail, session } = useAuth();
  const { showToast } = useToast();
  const { route, navigate } = useRouter();

  // All useState hooks at the top in strict consistent order
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [recruiterSubView, setRecruiterSubView] = useState<'jobs' | 'pipeline' | 'analytics'>('jobs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<County | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityType | 'all'>('all');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<EmploymentType | 'all'>('all');
  const [selectedWorkplaceModel, setSelectedWorkplaceModel] = useState<WorkplaceModel | 'all'>('all');
  const [minSalary, setMinSalary] = useState('');
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [businesses, setBusinesses] = useState<BusinessListing[]>(() => db.getBusinesses());
  const [audits, setAudits] = useState<VerificationAudit[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const [savedOpportunityIds, setSavedOpportunityIds] = useState<string[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [opportunityToEdit, setOpportunityToEdit] = useState<Opportunity | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Opportunities now live in Supabase (Phase 3, Service 2 -- see
  // docs/PHASE3_SERVICE2_VERIFICATION.md); refreshOpportunities() is the
  // single place that re-fetches the list through opportunityService
  // (which respects RLS) after any mutation, replacing the old synchronous
  // db.getOpportunities() reads that were left pointing at a store the
  // mutations no longer write to.
  const refreshOpportunities = async () => {
    const res = await opportunityService.list();
    if (res.data) {
      setOpportunities(res.data);
    } else if (res.error) {
      showToast(res.error.message, 'error');
    }
  };

  // Applications now live in Supabase too (Phase 3, Service 3 -- see
  // docs/PHASE3_SERVICE3_VERIFICATION.md). listByOrganization() with no
  // explicit org id falls back to the caller's session.activeOrganization
  // internally, and RLS narrows the result appropriately either way: an
  // employer sees their org's pipeline, a candidate with no org sees only
  // their own applications (via the "Candidates can view their own
  // applications" policy), and a signed-out visitor sees nothing.
  const refreshApplications = async () => {
    const res = await applicationService.listByOrganization();
    if (res.data) {
      setApplications(res.data);
    } else if (res.error) {
      showToast(res.error.message, 'error');
    }
  };

  // Verification audits now live in Supabase too (Phase 3, Service 7 --
  // see docs/PHASE3_SERVICE7_VERIFICATION.md). RLS alone correctly scopes
  // the result: an org admin sees their own org's requests, a platform
  // admin sees every request (their review queue), and anyone else gets
  // an empty list.
  const refreshAudits = async () => {
    const res = await verificationService.list();
    if (res.data) {
      setAudits(res.data);
    } else if (res.error) {
      showToast(res.error.message, 'error');
    }
  };

  // All useEffect hooks
  useEffect(() => {
    refreshOpportunities();
    refreshApplications();
    refreshAudits();
  }, []);

  // Active Tab synchronized with route path
  type TabKey = 'opportunities' | 'businesses' | 'verification' | 'recruiter' | 'candidate' | 'ai-studio' | 'billing' | 'messages' | 'admin';
  const getTabFromPath = (path: string): TabKey => {
    if (path.startsWith('/businesses')) return 'businesses';
    if (path.startsWith('/verification')) return 'verification';
    if (path.startsWith('/recruiter')) return 'recruiter';
    if (path.startsWith('/candidate')) return 'candidate';
    if (path.startsWith('/ai-studio')) return 'ai-studio';
    if (path.startsWith('/billing')) return 'billing';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/admin')) return 'admin';
    return 'opportunities';
  };

  const activeTab = getTabFromPath(route.path);
  const handleTabChange = (tab: TabKey) => {
    const targetPath = tab === 'opportunities' ? '/' : `/${tab}`;
    navigate(targetPath);
  };

  if (!hasEnteredApp) {
    return (
      <LandingScreen
        onEnterPortal={(role) => {
          if (role) switchRole(role);
          setHasEnteredApp(true);
        }}
      />
    );
  }

  // Public Feed filtering: Job seekers browse published opportunities (or all non-draft for transparency)
  const filteredOpportunities = opportunities.filter((opp) => {
    // Only published vacancies appear on the public marketplace feed
    if (opp.status !== 'published') return false;

    if (selectedCounty !== 'all' && opp.county !== selectedCounty) return false;
    if (selectedCategory !== 'all' && opp.type !== selectedCategory) return false;
    if (selectedEmploymentType !== 'all' && opp.employmentType !== selectedEmploymentType) return false;
    if (selectedWorkplaceModel !== 'all' && opp.workplaceModel !== selectedWorkplaceModel) return false;
    
    if (minSalary.trim()) {
      const minVal = parseFloat(minSalary);
      if (!isNaN(minVal) && (opp.salaryMin || 0) < minVal) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchOrg = opp.organization.name.toLowerCase().includes(q);
      const matchCounty = opp.county.toLowerCase().includes(q);
      const matchSkills = opp.skills.some((s) => s.toLowerCase().includes(q));
      const matchSummary = opp.summary?.toLowerCase().includes(q);
      if (!matchTitle && !matchOrg && !matchCounty && !matchSkills && !matchSummary) return false;
    }
    return true;
  });

  // Actions
  const handleToggleSave = (oppId: string) => {
    if (savedOpportunityIds.includes(oppId)) {
      setSavedOpportunityIds(savedOpportunityIds.filter((id) => id !== oppId));
      showToast('Removed from saved opportunities', 'info');
    } else {
      setSavedOpportunityIds([...savedOpportunityIds, oppId]);
      showToast('Opportunity saved to your profile', 'success');
    }
  };

  // Job Creation / Editing
  const handleSaveOpportunity = async (
    payload: Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'>,
    isDraft: boolean,
    editId?: string
  ) => {
    if (editId) {
      // Edit existing opportunity
      const res = await opportunityService.update(editId, payload);
      if (res.data) {
        await refreshOpportunities();
        showToast(`Opportunity "${res.data.title}" updated successfully!`, 'success');
      } else if (res.error) {
        showToast(res.error.message, 'error');
      }
    } else {
      // Create new opportunity
      if (isDraft) {
        const res = await opportunityService.createDraft(payload);
        if (res.data) {
          await refreshOpportunities();
          showToast(`Opportunity saved as draft.`, 'success');
        } else if (res.error) {
          showToast(res.error.message, 'error');
        }
      } else {
        const res = await opportunityService.publish(payload);
        if (res.data) {
          await refreshOpportunities();
          showToast(`Opportunity "${res.data.title}" is now published across Liberia!`, 'success');
        } else if (res.error) {
          showToast(res.error.message, 'error');
        }
      }
    }
    setOpportunityToEdit(null);
  };

  const handlePublishDraft = async (id: string) => {
    const res = await opportunityService.publish(id);
    if (res.data) {
      await refreshOpportunities();
    } else if (res.error) {
      throw new Error(res.error.message);
    }
  };

  const handleUnpublishDraft = async (id: string) => {
    const res = await opportunityService.unpublishToDraft(id);
    if (res.data) {
      await refreshOpportunities();
    } else if (res.error) {
      throw new Error(res.error.message);
    }
  };

  const handleCloseOpportunity = async (id: string) => {
    const res = await opportunityService.close(id);
    if (res.data) {
      await refreshOpportunities();
    } else if (res.error) {
      throw new Error(res.error.message);
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    const res = await opportunityService.delete(id);
    if (!res.error) {
      await refreshOpportunities();
    } else {
      throw new Error(res.error.message);
    }
  };

  const handleDuplicateOpportunity = async (id: string) => {
    const res = await opportunityService.duplicate(id);
    if (res.data) {
      await refreshOpportunities();
    } else if (res.error) {
      throw new Error(res.error.message);
    }
  };

  const handleOpenEditModal = (opp: Opportunity) => {
    setOpportunityToEdit(opp);
    setIsPostModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setOpportunityToEdit(null);
    setIsPostModalOpen(true);
  };

  const handleAccessApproved = async (bizId: string) => {
    const res = await businessService.requestNdaAccess(bizId);
    if (res.data) {
      setBusinesses(db.getBusinesses());
      showToast('Non-Disclosure Agreement signed! Confidential data room unlocked.');
    } else if (res.error) {
      showToast(res.error.message, 'error');
    }
  };

  const handleAuditDecision = async (auditId: string, status: 'approved' | 'rejected') => {
    const res = await verificationService.decide(auditId, status);
    if (res.data) {
      await refreshAudits();
      showToast(`Verification status updated to "${status.toUpperCase()}".`);
    } else if (res.error) {
      showToast(res.error.message, 'error');
    }
  };

  const handleNewAuditSubmit = async (newAudit: VerificationAudit) => {
    const res = await verificationService.submit(newAudit);
    if (res.data) {
      setAudits([res.data, ...audits]);
      showToast('Verification documents submitted to auditor queue.');
    } else if (res.error) {
      showToast(res.error.message, 'error');
    }
  };

  const handleUpdateStage = async (
    appId: string,
    newStage: ApplicationStage,
    options?: {
      note?: string;
      interviewDetails?: any;
      hiringOfferDetails?: any;
      rejectionReason?: string;
    }
  ) => {
    const res = await applicationService.updateStage(appId, newStage, options);
    if (res.data) {
      await refreshApplications();
      showToast(`Candidate stage updated to "${newStage.replace('_', ' ').toUpperCase()}".`);
    } else if (res.error) {
      showToast(res.error.message, 'error');
    }
  };

  const handleApplySuccess = async (oppId: string, applicantName: string) => {
    await refreshApplications();
    await refreshOpportunities();
    showToast(`Application for ${applicantName} submitted successfully! You can track status in Candidate Portal.`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D2D2D] font-sans flex flex-col pb-16 lg:pb-0">
      {/* Offline Status Alert */}
      <DemoModeBanner />
      <OfflineBanner />

      {/* Main Navigation with Natural Tones palette */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currency={currency}
        setCurrency={setCurrency}
        currentRole={activeRole}
        setCurrentRole={switchRole}
        onOpenPostModal={handleOpenCreateModal}
        notificationCount={applications.length}
      />

      {/* Account Verification Prompt if pending */}
      {user && !user.isEmailVerified && (
        <div className="bg-[#FEFAE0] border-b border-[#E8E4D9] px-4 py-2.5 text-xs text-[#283618] flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-[#BC6C25] shrink-0" />
            <span>
              <strong>Action Recommended:</strong> Your account (<em>{user.email}</em>) has not yet confirmed email verification.
            </span>
            <button
              onClick={async () => {
                try {
                  await verifyEmail('eml_demo_instant');
                  showToast('Email verified successfully! Full account capabilities unlocked.');
                } catch {
                  showToast('Verification confirmed.');
                }
              }}
              className="ml-auto underline font-bold text-[#BC6C25] hover:text-[#9A551A] cursor-pointer whitespace-nowrap"
            >
              Verify Now
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Tab 1: Opportunity Marketplace Stream */}
        {activeTab === 'opportunities' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Main Stream */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Hero Search Section */}
              <HeroSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCounty={selectedCounty}
                setSelectedCounty={setSelectedCounty}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedEmploymentType={selectedEmploymentType}
                setSelectedEmploymentType={setSelectedEmploymentType}
                selectedWorkplaceModel={selectedWorkplaceModel}
                setSelectedWorkplaceModel={setSelectedWorkplaceModel}
                minSalary={minSalary}
                setMinSalary={setMinSalary}
                totalOpportunitiesCount={opportunities.filter((o) => o.status === 'published').length}
                currency={currency}
              />

              {/* AI Semantic Opportunity Search Bar */}
              <AiSemanticSearchBar
                opportunities={opportunities.filter((o) => o.status === 'published')}
                onResultsUpdated={(ranked) => {
                  setOpportunities(ranked);
                }}
                onClearSearch={async () => {
                  await refreshOpportunities();
                }}
              />

              {/* Feed Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#132A13]">
                    Latest Opportunities
                  </h2>
                  <p className="text-xs text-[#606C38]">
                    Showing {filteredOpportunities.length} of {opportunities.filter((o) => o.status === 'published').length} published vacancies across Liberia
                  </p>
                </div>

                {(selectedCounty !== 'all' || selectedCategory !== 'all' || selectedEmploymentType !== 'all' || selectedWorkplaceModel !== 'all' || minSalary || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCounty('all');
                      setSelectedCategory('all');
                      setSelectedEmploymentType('all');
                      setSelectedWorkplaceModel('all');
                      setMinSalary('');
                      setSearchQuery('');
                    }}
                    className="text-xs font-semibold text-[#BC6C25] hover:underline cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>

              {/* Opportunity Cards Stream with Skeleton Loading State */}
              <div className="grid grid-cols-1 gap-4">
                {isLoadingFeed ? (
                  <>
                    <OpportunityCardSkeleton />
                    <OpportunityCardSkeleton />
                    <OpportunityCardSkeleton />
                  </>
                ) : filteredOpportunities.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E4D9]">
                    <Briefcase className="w-8 h-8 text-[#A3B18A] mx-auto mb-2" />
                    <div className="text-base font-bold text-[#283618]">No opportunities found matching your filter</div>
                    <div className="text-xs text-[#606C38] mt-1 max-w-md mx-auto">
                      Try selecting another Liberian county, resetting the filter criteria, or broadening your keywords.
                    </div>
                  </div>
                ) : (
                  filteredOpportunities.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      currency={currency}
                      onSelect={(item) => setSelectedOpportunity(item)}
                      isSaved={savedOpportunityIds.includes(opp.id)}
                      onToggleSave={handleToggleSave}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4">
              <RightSidebar
                onOpenVerification={() => handleTabChange('verification')}
                onOpenAiCopilot={() => setIsAiModalOpen(true)}
                onOpenBilling={() => handleTabChange('billing')}
                userRole={user?.primaryRole}
                openTendersCount={opportunities.filter((o) => o.type === 'tender' && o.status === 'published').length}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Business Marketplace M&A */}
        {activeTab === 'businesses' && (
          <BusinessMarketplace
            businesses={businesses}
            currency={currency}
            onAccessApproved={handleAccessApproved}
            currentUserId={user?.id}
            onRefresh={() => setBusinesses(db.getBusinesses())}
          />
        )}

        {/* Tab 3: Verification Hub */}
        {activeTab === 'verification' && (
          <VerificationHub
            audits={audits}
            onAuditDecision={handleAuditDecision}
            onSubmitAudit={handleNewAuditSubmit}
          />
        )}

        {/* Tab 4: Recruiter & Employer Workspace (Jobs Dashboard + Candidate Pipeline) */}
        {activeTab === 'recruiter' && (
          <div className="space-y-6">
            {/* Sub-view Navigation Bar */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-[#E8E4D9] shadow-2xs w-fit">
              <button
                onClick={() => setRecruiterSubView('jobs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  recruiterSubView === 'jobs'
                    ? 'bg-[#283618] text-white shadow-xs'
                    : 'text-[#606C38] hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Opportunity Management</span>
              </button>

              <button
                onClick={() => setRecruiterSubView('pipeline')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  recruiterSubView === 'pipeline'
                    ? 'bg-[#283618] text-white shadow-xs'
                    : 'text-[#606C38] hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Candidate Pipeline ({applications.length})</span>
              </button>

              <button
                onClick={() => setRecruiterSubView('analytics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  recruiterSubView === 'analytics'
                    ? 'bg-[#283618] text-white shadow-xs'
                    : 'text-[#606C38] hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Employer Analytics Desk</span>
              </button>
            </div>

            {recruiterSubView === 'jobs' && (
              <JobManagementDashboard
                opportunities={opportunities}
                onOpenCreateModal={handleOpenCreateModal}
                onEditOpportunity={handleOpenEditModal}
                onPublishOpportunity={handlePublishDraft}
                onUnpublishOpportunity={handleUnpublishDraft}
                onCloseOpportunity={handleCloseOpportunity}
                onDeleteOpportunity={handleDeleteOpportunity}
                onDuplicateOpportunity={handleDuplicateOpportunity}
                onViewOpportunity={(opp) => setSelectedOpportunity(opp)}
              />
            )}
            {recruiterSubView === 'pipeline' && (
              <RecruiterWorkspace
                opportunities={opportunities}
                applications={applications}
                onUpdateStage={handleUpdateStage}
                onOpenCreateModal={handleOpenCreateModal}
              />
            )}
            {recruiterSubView === 'analytics' && (
              <EmployerAnalyticsDashboard />
            )}
          </div>
        )}

        {/* Tab 5: Candidate Applications & Profile Management Portal */}
        {activeTab === 'candidate' && (
          <CandidateDashboard
            onBrowseJobs={() => handleTabChange('opportunities')}
            onViewJobDetail={(oppId) => {
              const opp = opportunities.find((o) => o.id === oppId);
              if (opp) setSelectedOpportunity(opp);
            }}
          />
        )}

        {/* Tab 6: AI Copilot Studio View */}
        {activeTab === 'ai-studio' && (
          <AiStudioHub />
        )}

        {/* Tab 7: Billing & Subscription */}
        {activeTab === 'billing' && (
          <SubscriptionManager />
        )}

        {/* Tab 8: Platform Secure Messaging & Inquiry Center */}
        {activeTab === 'messages' && (
          <MessagingCenter />
        )}

        {/* Tab 9: Trust & Safety Officer Command Center */}
        {activeTab === 'admin' && (
          <TrustSafetyAdminCenter currentUserId={user?.id} />
        )}
      </main>

      {/* Modals */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        currency={currency}
        onApplySuccess={handleApplySuccess}
        onEdit={handleOpenEditModal}
      />

      <PostOpportunityModal
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setOpportunityToEdit(null);
        }}
        onSave={handleSaveOpportunity}
        opportunityToEdit={opportunityToEdit}
        currency={currency}
      />

      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      <AuthModal />
      <OnboardingModal />

      {/* Mobile Sticky Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Floating Offline Alert Status Card */}
      <OfflineIndicator />

      {/* Natural Tones Footer */}
      <Footer
        onOpenSafetyModal={() => showToast('OpportunityHub strictly forbids advance-fee recruitment scams. Report any suspicious poster.', 'info')}
        onOpenVerification={() => handleTabChange('verification')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider>
              <AppContent />
            </RouterProvider>
          </ToastProvider>
        </AuthProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}
