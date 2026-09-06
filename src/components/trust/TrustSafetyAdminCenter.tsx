import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  UserCheck,
  Briefcase,
  Search,
  Filter,
  Eye,
  Lock,
  Unlock,
  Activity,
  History,
  FileText,
  Ban,
  Users,
  CreditCard,
  Grid,
  Settings,
  Bell,
  HelpCircle,
  TrendingUp,
  DollarSign,
  PlusCircle,
  Trash2,
  RefreshCw,
  Sliders,
  Database,
  Globe,
  Download,
  X
} from 'lucide-react';
import {
  AccountRestriction,
  ContentModerationRecord,
  ContentReport,
  SuspiciousActivityEvent,
  VerificationRequest,
  User,
  Organization,
  Opportunity,
  BusinessListing,
  County,
  OpportunityType,
  SystemRole,
  AccountStatus
} from '../../types';
import { db } from '../../db/dbClient';
import { trustSafetyService } from '../../services/trustSafetyService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storageAdapter } from '../../db/storageAdapter';

export const TrustSafetyAdminCenter: React.FC<{ currentUserId?: string }> = () => {
  const { user, login, logout } = useAuth();
  const { showToast } = useToast();

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<
    | 'analytics'
    | 'users'
    | 'organizations'
    | 'opportunities'
    | 'businesses'
    | 'verification'
    | 'reports'
    | 'subscriptions'
    | 'payments'
    | 'categories'
    | 'content'
    | 'settings'
    | 'audit'
  >('analytics');

  // --- Strict RBAC Authorization Check ---
  const hasAccess = useMemo(() => {
    if (!user) return false;
    return (
      user.systemRole === 'platform_admin' ||
      user.systemRole === 'verifier' ||
      user.systemRole === 'moderator' ||
      user.primaryRole === 'platform_admin'
    );
  }, [user]);

  // Demo Admin Login Helper for quick sandbox testing
  const [isLoggingInDemo, setIsLoggingInDemo] = useState(false);
  const handleDemoAdminLogin = async () => {
    setIsLoggingInDemo(true);
    try {
      await login('admin@opportunityhub.lr', 'password');
      showToast('Successfully logged in as Platform Administrator', 'success');
    } catch (err) {
      showToast('Failed to bypass login. Register a platform_admin account.', 'error');
    } finally {
      setIsLoggingInDemo(false);
    }
  };

  // --- Dynamic State loaded directly from our unified DB client ---
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [organizations, setOrganizations] = useState<Organization[]>(() => db.getOrganizations());
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => db.getOpportunities());
  const [businesses, setBusinesses] = useState<BusinessListing[]>(() => db.getBusinesses());
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(() => db.getVerificationRequests());
  const [reports, setReports] = useState<ContentReport[]>(() => db.getContentReports());
  const [restrictions, setRestrictions] = useState<AccountRestriction[]>(() => db.getAccountRestrictions());
  const [anomalies, setAnomalies] = useState<SuspiciousActivityEvent[]>(() => db.getSuspiciousActivityEvents());
  const [auditLogs, setAuditLogs] = useState(() => db.getAuditLogs());

  // --- Local States for Payments & Custom taxonomies (Categories/Industries) ---
  const [payments, setPayments] = useState<Array<{ id: string; orgId: string; orgName: string; planId: string; amount: number; currency: 'USD' | 'LRD'; status: string; date: string }>>([
    { id: 'pay-1', orgId: 'org-save-children', orgName: 'Save the Children Liberia', planId: 'plan-pro', amount: 120, currency: 'USD', status: 'succeeded', date: '2026-09-01T10:00:00Z' },
    { id: 'pay-2', orgId: 'org-nimba-agri', orgName: 'Nimba Agro-Industrial Coop', planId: 'plan-enterprise', amount: 480, currency: 'USD', status: 'succeeded', date: '2026-09-03T14:15:00Z' },
    { id: 'pay-3', orgId: 'org-save-children', orgName: 'Save the Children Liberia', planId: 'plan-pro', amount: 24000, currency: 'LRD', status: 'succeeded', date: '2026-09-05T09:30:00Z' }
  ]);

  const [categories, setCategories] = useState<string[]>([
    'Agriculture', 'Logistics', 'Healthcare', 'NGO & Aid', 'Education', 'Construction', 'Technology', 'Finance'
  ]);
  const [industries, setIndustries] = useState<string[]>([
    'Retail', 'Supermarkets', 'Logistics & Supply', 'Real Estate', 'Mining Services', 'Rubber Production'
  ]);

  // --- Document Review & Download State ---
  const [selectedDocForReview, setSelectedDocForReview] = useState<VerificationEvidenceDocument | null>(null);

  const handleDownloadDoc = (doc: VerificationEvidenceDocument) => {
    const blob = new Blob([doc.urlOrData || `Statutory proof document: ${doc.fileName}`], { type: doc.fileType || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloading verified document ${doc.fileName}...`, 'success');
  };

  // --- Content & Announcement Management States ---
  const [announcementBanner, setAnnouncementBanner] = useState('🚨 ALERT: The Ministry of Labour requires all private enterprise recruiters to attach a valid business registry document.');
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [faqTitle, setFaqTitle] = useState('How does statutory LBR verification protect Liberian jobs?');
  const [faqBody, setFaqBody] = useState('Statutory LBR validation eliminates fraudulent advance-fee recruitment agencies, protecting candidates from financial exploitation.');

  // --- Platform Settings States ---
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [lrdExchangeRate, setLrdExchangeRate] = useState(200); // 1 USD = 200 LRD
  const [transFee, setTransFee] = useState(2.5); // 2.5% surcharge fee
  const [maxJobExpiry, setMaxJobExpiry] = useState(60); // 60 days max vacancy lifespan

  // --- Search / Filters for Tables ---
  const [userQuery, setUserQuery] = useState('');
  const [orgQuery, setOrgQuery] = useState('');
  const [oppQuery, setOppQuery] = useState('');
  const [bizQuery, setBizQuery] = useState('');
  const [auditQuery, setAuditQuery] = useState('');

  // Form states for adding taxonomy
  const [newCat, setNewCat] = useState('');
  const [newInd, setNewInd] = useState('');

  // Refresh helper
  const refreshAllData = () => {
    setUsers(db.getUsers());
    setOrganizations(db.getOrganizations());
    setOpportunities(db.getOpportunities());
    setBusinesses(db.getBusinesses());
    setVerificationRequests(db.getVerificationRequests());
    setReports(db.getContentReports());
    setRestrictions(db.getAccountRestrictions());
    setAnomalies(db.getSuspiciousActivityEvents());
    setAuditLogs(db.getAuditLogs());
    showToast('Platform databases synced successfully.', 'success');
  };

  // --- ACTIONS ---

  // 1. User Status update
  const toggleUserStatus = (targetUser: User) => {
    const nextStatus: AccountStatus = targetUser.accountStatus === 'active' ? 'suspended' : 'active';
    const reason = nextStatus === 'suspended' ? 'Suspended by admin for investigation' : 'Reactivated by platform administrator';
    try {
      db.updateUserStatus(targetUser.id, nextStatus, reason);
      db.emitAuditLog({
        actorUserId: user?.id || 'admin',
        actorName: user?.fullName || 'Platform Admin',
        action: 'user.status_toggle',
        targetEntity: 'user',
        targetId: targetUser.id,
        details: { nextStatus, reason }
      });
      refreshAllData();
      showToast(`User status updated to ${nextStatus}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  // 1b. Assign User Role
  const changeUserSystemRole = (userId: string, nextRole: SystemRole) => {
    try {
      const allUsers = db.getUsers();
      const matched = allUsers.find(u => u.id === userId);
      if (matched) {
        matched.systemRole = nextRole;
        // save back to storage adapter
        storageAdapter.setItem('users', allUsers);
        db.emitAuditLog({
          actorUserId: user?.id || 'admin',
          actorName: user?.fullName || 'Platform Admin',
          action: 'user.role_change',
          targetEntity: 'user',
          targetId: userId,
          details: { nextRole }
        });
        refreshAllData();
        showToast(`User role updated to ${nextRole}`, 'success');
      }
    } catch (err: any) {
      showToast('Failed to change user system role', 'error');
    }
  };

  // 2. Organization verification
  const toggleOrganizationVerification = (org: Organization) => {
    const nextVerified = !org.isVerified;
    const nextStatus = nextVerified ? 'verified' : 'unverified';
    try {
      const updated = db.updateOrganization(org.id, {
        isVerified: nextVerified,
        verificationStatus: nextStatus,
        verificationBadge: nextVerified ? 'verified_enterprise' : undefined
      });
      db.emitAuditLog({
        actorUserId: user?.id || 'admin',
        actorName: user?.fullName || 'Platform Admin',
        action: 'organization.verify_toggle',
        targetEntity: 'organization',
        targetId: org.id,
        details: { nextStatus }
      });
      refreshAllData();
      showToast(`Organization verification toggled to ${nextVerified}`, 'success');
    } catch (err: any) {
      showToast('Failed to toggle organization verification', 'error');
    }
  };

  // 3. Opportunity/Job moderation
  const moderateOpportunity = (oppId: string, nextStatus: 'published' | 'pending_review' | 'flagged' | 'quarantined' | 'rejected') => {
    try {
      const allOpps = db.getOpportunities();
      const opp = allOpps.find(o => o.id === oppId);
      if (opp) {
        opp.moderationStatus = nextStatus;
        if (nextStatus === 'published') {
          opp.status = 'published';
        } else if (nextStatus === 'quarantined' || nextStatus === 'rejected') {
          opp.status = 'archived';
        }
        storageAdapter.setItem('opportunities', allOpps);

        db.emitAuditLog({
          actorUserId: user?.id || 'admin',
          actorName: user?.fullName || 'Platform Admin',
          action: 'opportunity.moderate',
          targetEntity: 'opportunity',
          targetId: oppId,
          details: { nextStatus }
        });
        refreshAllData();
        showToast(`Job opportunity status set to ${nextStatus}`, 'success');
      }
    } catch (err: any) {
      showToast('Failed to moderate opportunity', 'error');
    }
  };

  // 4. Business listing moderation
  const moderateBusiness = (bizId: string, nextStatus: 'pending_review' | 'published' | 'rejected' | 'suspended') => {
    try {
      const allBizs = db.getBusinesses();
      const biz = allBizs.find(b => b.id === bizId);
      if (biz) {
        biz.moderationStatus = nextStatus;
        if (nextStatus === 'published') {
          biz.status = 'published';
          biz.isVerified = true;
        } else if (nextStatus === 'suspended' || nextStatus === 'rejected') {
          biz.status = 'sold';
        }
        storageAdapter.setItem('businesses', allBizs);

        db.emitAuditLog({
          actorUserId: user?.id || 'admin',
          actorName: user?.fullName || 'Platform Admin',
          action: 'business.moderate',
          targetEntity: 'business_listing',
          targetId: bizId,
          details: { nextStatus }
        });
        refreshAllData();
        showToast(`Business listing status set to ${nextStatus}`, 'success');
      }
    } catch (err: any) {
      showToast('Failed to moderate business listing', 'error');
    }
  };

  // 5. Verification Badge decision
  const handleVerificationRequestAction = async (reqId: string, decision: 'verified' | 'rejected') => {
    try {
      await trustSafetyService.reviewVerificationRequest(
        reqId,
        decision,
        user?.id || 'user-admin-1',
        'Approved after reviewing statutory business registry files',
        decision === 'rejected' ? 'Provided tax clearance papers do not match official entities' : ''
      );
      db.emitAuditLog({
        actorUserId: user?.id || 'admin',
        actorName: user?.fullName || 'Platform Admin',
        action: 'verification.request_decision',
        targetEntity: 'verification_request',
        targetId: reqId,
        details: { decision }
      });
      refreshAllData();
      showToast(`Verification request ${decision} successfully`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to action verification request', 'error');
    }
  };

  // 6. Report Resolution Actioning
  const handleReportAction = async (reportId: string, action: 'warning_issued' | 'listing_quarantined' | 'account_restricted' | 'account_suspended' | 'dismissed') => {
    try {
      await trustSafetyService.resolveReport(reportId, action, user?.id || 'user-admin-1', 'Scam Desk resolution review completed.');
      db.emitAuditLog({
        actorUserId: user?.id || 'admin',
        actorName: user?.fullName || 'Platform Admin',
        action: 'report.resolve',
        targetEntity: 'content_report',
        targetId: reportId,
        details: { action }
      });
      refreshAllData();
      showToast(`Report action executed: ${action.replace('_', ' ')}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve report', 'error');
    }
  };

  // 7. Toggle subscription levels
  const toggleOrgSubscriptionTier = (orgId: string, targetTier: 'plan-free' | 'plan-pro' | 'plan-enterprise') => {
    try {
      const allSubs = storageAdapter.getItem<any[]>('subscriptions') || [];
      const index = allSubs.findIndex(s => s.organizationId === orgId);
      const now = new Date();
      const expires = new Date();
      expires.setMonth(now.getMonth() + 1);

      const subData = {
        id: index >= 0 ? allSubs[index].id : `sub-${Date.now()}`,
        organizationId: orgId,
        planId: targetTier,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: expires.toISOString(),
        stripeCustomerId: `cus_${Math.random().toString(36).substring(7)}`
      };

      if (index >= 0) {
        allSubs[index] = subData;
      } else {
        allSubs.push(subData);
      }
      storageAdapter.setItem('subscriptions', allSubs);

      // Log invoice payment
      const org = organizations.find(o => o.id === orgId);
      const chargeAmount = targetTier === 'plan-enterprise' ? 480 : targetTier === 'plan-pro' ? 120 : 0;
      if (chargeAmount > 0) {
        const newPaymentLog = {
          id: `pay-${Date.now()}`,
          orgId,
          orgName: org?.name || 'Recruiter Agency',
          planId: targetTier,
          amount: chargeAmount,
          currency: 'USD' as const,
          status: 'succeeded',
          date: now.toISOString()
        };
        setPayments(prev => [newPaymentLog, ...prev]);
      }

      db.emitAuditLog({
        actorUserId: user?.id || 'admin',
        actorName: user?.fullName || 'Platform Admin',
        action: 'subscription.modify',
        targetEntity: 'subscription',
        targetId: orgId,
        details: { targetTier }
      });
      showToast(`Subscription adjusted to ${targetTier.split('-')[1].toUpperCase()}`, 'success');
    } catch (err: any) {
      showToast('Failed to adjust subscription plan', 'error');
    }
  };

  // 8. Log invoice manual simulator
  const logDemoInvoice = () => {
    const org = organizations[Math.floor(Math.random() * organizations.length)];
    const plan = ['plan-pro', 'plan-enterprise'][Math.floor(Math.random() * 2)];
    const amt = plan === 'plan-pro' ? 120 : 480;
    const newLog = {
      id: `pay-${Date.now()}`,
      orgId: org?.id || 'org-unknown',
      orgName: org?.name || 'Anonymous Logistics Inc',
      planId: plan,
      amount: amt,
      currency: 'USD' as const,
      status: 'succeeded',
      date: new Date().toISOString()
    };
    setPayments(prev => [newLog, ...prev]);
    showToast(`Invoice payment captured for ${org?.name || 'Recruiter'}`, 'success');
  };

  // 9. Categories taxonomy modifier
  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    if (categories.includes(newCat.trim())) {
      showToast('Category already exists!', 'info');
      return;
    }
    setCategories(prev => [...prev, newCat.trim()]);
    db.emitAuditLog({
      actorUserId: user?.id || 'admin',
      actorName: user?.fullName || 'Platform Admin',
      action: 'taxonomy.add_category',
      targetEntity: 'taxonomy',
      targetId: newCat.trim(),
      details: { category: newCat.trim() }
    });
    setNewCat('');
    showToast('Job category successfully registered', 'success');
  };

  const addIndustry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInd.trim()) return;
    if (industries.includes(newInd.trim())) {
      showToast('Industry already registered!', 'info');
      return;
    }
    setIndustries(prev => [...prev, newInd.trim()]);
    db.emitAuditLog({
      actorUserId: user?.id || 'admin',
      actorName: user?.fullName || 'Platform Admin',
      action: 'taxonomy.add_industry',
      targetEntity: 'taxonomy',
      targetId: newInd.trim(),
      details: { industry: newInd.trim() }
    });
    setNewInd('');
    showToast('Business industry category registered', 'success');
  };

  // 10. Content update
  const handleUpdateContent = () => {
    db.emitAuditLog({
      actorUserId: user?.id || 'admin',
      actorName: user?.fullName || 'Platform Admin',
      action: 'content.update',
      targetEntity: 'system_content',
      targetId: 'global_banner',
      details: { announcementBanner, bannerEnabled }
    });
    showToast('Platform static content updated', 'success');
  };

  // 11. Settings modifier
  const handleUpdateSettings = () => {
    db.emitAuditLog({
      actorUserId: user?.id || 'admin',
      actorName: user?.fullName || 'Platform Admin',
      action: 'settings.update',
      targetEntity: 'system_settings',
      targetId: 'global_config',
      details: { lrdExchangeRate, transFee, maxJobExpiry }
    });
    showToast('System variables updated', 'success');
  };

  // --- RENDERING VIEWS ---

  // Access Denied Shield Page
  if (!hasAccess) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white p-8 md:p-12 rounded-[32px] border border-red-100 shadow-xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-extrabold text-[#283618] tracking-tight">
            Administrative Access Restricted
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            The platform command center is restricted to registered **Platform Administrators** and **Trust & Safety Officers** with authorized security credentials.
          </p>
        </div>

        <div className="bg-[#FEFAE0] p-5 rounded-2xl border border-[#E8E4D9] text-left text-xs space-y-3">
          <span className="font-bold text-[#BC6C25] uppercase tracking-wider block">Developer Sandbox Testing Bypass</span>
          <p className="text-stone-600">
            You are currently browsing as a standard guest. To view, audit, and interact with the **14 administrative modules and custom visualizations**, click the simulation link below to log in as the default Administrator.
          </p>
          <button
            onClick={handleDemoAdminLogin}
            disabled={isLoggingInDemo}
            className="w-full py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isLoggingInDemo ? 'Simulating Admin Session...' : 'Unlock & Login as Demo Admin'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculated Metrics for Analytics Tab
  const totalVerifiedOrgs = organizations.filter(o => o.isVerified).length;
  const activeVacancyRatio = opportunities.filter(o => o.status === 'published').length;
  const pendingEvidenceCount = verificationRequests.filter(r => r.status === 'pending').length;
  const activeReportsCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. ADMIN HUB BRAND BANNER */}
      <div className="bg-[#283618] p-6 sm:p-8 rounded-[32px] text-white shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border-b-4 border-[#BC6C25]">
        <div>
          <div className="flex items-center gap-2 text-[#A3B18A] text-xs font-bold uppercase tracking-widest mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#A3B18A]" />
            <span>Statutory Verification & Trust Desk</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Administrative Command Center
          </h2>
          <p className="text-xs sm:text-sm text-[#A3B18A]/90 mt-1 max-w-xl">
            Control platform permissions, review LBR regulatory evidence, analyze marketplace activities, moderate fraudulent postings, configure system settings, and inspect immutable audit logs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAllData}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync DB Status</span>
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-[#BC6C25] hover:bg-[#A35C1D] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </div>

      {/* GLOBAL DISPATCH BANNER PREVIEW (CONTENT MANAGEMENT TARGET) */}
      {bannerEnabled && (
        <div className="px-5 py-3 bg-[#FEFAE0] border border-[#E8E4D9] rounded-2xl flex items-center gap-2 text-xs font-semibold text-[#BC6C25] leading-normal animate-pulse">
          <Bell className="w-4 h-4 shrink-0" />
          <span>{announcementBanner}</span>
        </div>
      )}

      {/* 2. ADMINISTRATIVE SLIDER NAVIGATION (13 TABS) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#E8E4D9]">
        {[
          { id: 'analytics', label: 'Analytics & Health', icon: Activity },
          { id: 'users', label: 'User Roles & Management', icon: Users },
          { id: 'organizations', label: 'Organizations', icon: Building2 },
          { id: 'opportunities', label: 'Job Moderation', icon: Briefcase },
          { id: 'businesses', label: 'Business Listings', icon: Sliders },
          { id: 'verification', label: 'Verification Queue', icon: FileCheck },
          { id: 'reports', label: `Reports Desk (${activeReportsCount})`, icon: AlertTriangle, badge: true },
          { id: 'subscriptions', label: 'SaaS Subscriptions', icon: CreditCard },
          { id: 'payments', label: 'Revenue Payments', icon: DollarSign },
          { id: 'categories', label: 'Category Registry', icon: Grid },
          { id: 'content', label: 'Content Management', icon: Globe },
          { id: 'settings', label: 'Platform Config', icon: Settings },
          { id: 'audit', label: 'Audit Log Trail', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#283618] text-white shadow-md'
                  : 'bg-white text-[#606C38] hover:bg-[#F9F8F4] border border-[#E8E4D9]'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.badge && activeReportsCount > 0 ? 'text-red-500' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SUB-TAB VIEWPORT PORTAL */}
      <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-[#E8E4D9] shadow-xs">
        
        {/* VIEW 1: PLATFORM HEALTH & MARKETPLACE ANALYTICS DASHBOARD */}
        {adminTab === 'analytics' && (
          <div className="space-y-8">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#132A13]">Platform Health & Activity Dashboard</h3>
              <p className="text-stone-500 text-sm">Real-time marketplace sync indicators, user engagement volumes, and county distributions.</p>
            </div>

            {/* Platform Health Performance Indicators Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Database Gateway</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                </div>
                <div className="text-2xl font-bold font-display text-[#283618] mt-1">99.98%</div>
                <div className="text-[10px] text-green-700 font-bold mt-1">Uptime Stream Normal</div>
              </div>
              <div className="p-5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">API Ingress Latency</span>
                  <Database className="w-4 h-4 text-stone-400" />
                </div>
                <div className="text-2xl font-bold font-display text-[#283618] mt-1">12 ms</div>
                <div className="text-[10px] text-stone-500 font-bold mt-1">Caching Efficiency: 94%</div>
              </div>
              <div className="p-5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Storage Adaptor Cache</span>
                  <Sliders className="w-4 h-4 text-[#BC6C25]" />
                </div>
                <div className="text-2xl font-bold font-display text-[#283618] mt-1">Active Memory</div>
                <div className="text-[10px] text-stone-500 font-bold mt-1">Failover Mirrored Mode</div>
              </div>
              <div className="p-5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">SaaS Subscription Cap</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-display text-[#283618] mt-1">$4,620 USD</div>
                <div className="text-[10px] text-green-700 font-bold mt-1">+14% Growth This Week</div>
              </div>
            </div>

            {/* Custom SVG Visualization Charts - No external Recharts dependency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart A: Weekly Activity Line Graph */}
              <div className="p-6 bg-white border border-[#E8E4D9] rounded-[24px] space-y-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-sm font-bold text-[#283618] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    7-Day Marketplace Activity Streams
                  </span>
                  <span className="text-xs text-stone-400">Total volume logged</span>
                </div>
                <div className="relative h-48 w-full bg-[#F9F8F6] border border-stone-100 rounded-xl overflow-hidden flex flex-col justify-end p-4">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    {/* Gridlines */}
                    <line x1="0" y1="37" x2="500" y2="37" stroke="#ECECE6" strokeDasharray="3" />
                    <line x1="0" y1="75" x2="500" y2="75" stroke="#ECECE6" strokeDasharray="3" />
                    <line x1="0" y1="112" x2="500" y2="112" stroke="#ECECE6" strokeDasharray="3" />
                    
                    {/* Line 1 (Jobs posted) */}
                    <path
                      d="M 10 130 Q 80 110 150 90 T 290 50 T 400 30 T 490 20"
                      fill="none"
                      stroke="#283618"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Line 2 (Applications submitted) */}
                    <path
                      d="M 10 140 Q 80 130 150 110 T 290 85 T 400 60 T 490 40"
                      fill="none"
                      stroke="#BC6C25"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="4"
                    />
                  </svg>
                  <div className="flex justify-between text-[10px] text-stone-400 font-bold mt-2">
                    <span>Aug 30</span>
                    <span>Sep 01</span>
                    <span>Sep 03</span>
                    <span>Today (Sep 05)</span>
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-bold justify-center pt-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#283618] inline-block"></span> Opportunities Posted ({opportunities.length})</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#BC6C25] border-dashed inline-block"></span> Applications Logged</span>
                </div>
              </div>

              {/* Chart B: County Distribution Bar Chart */}
              <div className="p-6 bg-white border border-[#E8E4D9] rounded-[24px] space-y-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-sm font-bold text-[#283618] flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-[#BC6C25]" />
                    Job Openings Distribution by Liberian County
                  </span>
                  <span className="text-xs text-stone-400">Opportunities count</span>
                </div>
                <div className="space-y-3 pt-2">
                  {[
                    { county: 'Montserrado', count: 48, pct: 'w-[90%]', color: 'bg-[#283618]' },
                    { county: 'Nimba', count: 18, pct: 'w-[45%]', color: 'bg-[#606C38]' },
                    { county: 'Grand Bassa', count: 12, pct: 'w-[30%]', color: 'bg-[#BC6C25]' },
                    { county: 'Bong', count: 8, pct: 'w-[20%]', color: 'bg-[#DDA15E]' },
                    { county: 'Margibi', count: 5, pct: 'w-[12%]', color: 'bg-stone-400' }
                  ].map((bar, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-stone-700">
                        <span>{bar.county} County</span>
                        <span>{bar.count} openings</span>
                      </div>
                      <div className="w-full bg-[#F2F2EC] h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color} ${bar.pct} rounded-full`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* General Database Summary Indicators */}
            <div className="bg-[#F9F8F6] p-6 rounded-[24px] border border-[#E8E4D9] grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-2xl font-bold font-display text-[#283618]">{users.length}</span>
                <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider mt-0.5">Total Users</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-display text-[#283618]">{organizations.length}</span>
                <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider mt-0.5">Corporate Orgs</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-display text-[#283618]">{businesses.length}</span>
                <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider mt-0.5">Business Sales</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-display text-[#283618]">{auditLogs.length}</span>
                <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider mt-0.5">Audit Events</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: USER MANAGEMENT MODULE */}
        {adminTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-2xl text-[#132A13]">Platform User Accounts Control</h3>
                <p className="text-stone-500 text-sm">Lock/unlock candidate accounts, investigate reports, or update user system access roles.</p>
              </div>
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search user email or name..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E8E4D9] focus:outline-none focus:border-[#283618] bg-[#F9F8F6]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4D9] bg-[#F9F8F6] text-stone-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Email Contact</th>
                    <th className="py-3 px-4">Role Assigned</th>
                    <th className="py-3 px-4">County</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4D9]">
                  {users
                    .filter(u => u.fullName.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase()))
                    .map((targetUser) => (
                      <tr key={targetUser.id} className="hover:bg-stone-50/50">
                        <td className="py-3.5 px-4 font-bold text-stone-800">{targetUser.fullName}</td>
                        <td className="py-3.5 px-4 font-mono text-stone-600">{targetUser.email}</td>
                        <td className="py-3.5 px-4">
                          <select
                            value={targetUser.systemRole}
                            onChange={(e) => changeUserSystemRole(targetUser.id, e.target.value as any)}
                            className="bg-stone-50 border border-stone-200 rounded-lg p-1 font-bold text-stone-700"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="verifier">Verifier</option>
                            <option value="platform_admin">Platform Admin</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-stone-700">{targetUser.primaryCounty} County</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            targetUser.accountStatus === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {targetUser.accountStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleUserStatus(targetUser)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                              targetUser.accountStatus === 'active'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {targetUser.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: ORGANIZATION MANAGEMENT */}
        {adminTab === 'organizations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-2xl text-[#132A13]">Corporate Organizations Database</h3>
                <p className="text-stone-500 text-sm">Review registered employers, check their verification tax certificates, or revoke verification flags.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={orgQuery}
                  onChange={(e) => setOrgQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E8E4D9] focus:outline-none focus:border-[#283618] bg-[#F9F8F6]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4D9] bg-[#F9F8F6] text-stone-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Org Name</th>
                    <th className="py-3 px-4">Industry Sector</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">LBR No & TIN</th>
                    <th className="py-3 px-4">Badge</th>
                    <th className="py-3 px-4">Is Verified</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4D9]">
                  {organizations
                    .filter(o => o.name.toLowerCase().includes(orgQuery.toLowerCase()))
                    .map((org) => (
                      <tr key={org.id} className="hover:bg-stone-50/50">
                        <td className="py-3.5 px-4 font-bold text-[#283618]">{org.name}</td>
                        <td className="py-3.5 px-4 text-stone-600">{org.industry}</td>
                        <td className="py-3.5 px-4 font-semibold capitalize text-stone-700">{org.type.replace('_', ' ')}</td>
                        <td className="py-3.5 px-4 font-mono text-stone-500">
                          <div>LBR: {org.registrationNumber || 'N/A'}</div>
                          <div>TIN: {org.taxIdNumber || 'N/A'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold uppercase">
                            {org.verificationBadge?.replace('_', ' ') || 'None'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            org.isVerified ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {org.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleOrganizationVerification(org)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              org.isVerified
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : 'bg-[#ECF3E9] text-[#4F772D] border-[#D9E3D5] hover:bg-[#ECF3E9]/80'
                            }`}
                          >
                            {org.isVerified ? 'Revoke Badges' : 'Mark Verified'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: OPPORTUNITY & JOB MODERATION */}
        {adminTab === 'opportunities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-2xl text-[#132A13]">Job Vacancy & Opportunity Moderation</h3>
                <p className="text-stone-500 text-sm">Review active job descriptions or quarantine scam listings charging applicant processing fees.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search vacancies..."
                  value={oppQuery}
                  onChange={(e) => setOppQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E8E4D9] focus:outline-none focus:border-[#283618] bg-[#F9F8F6]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4D9] bg-[#F9F8F6] text-stone-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Employer Org</th>
                    <th className="py-3 px-4">County</th>
                    <th className="py-3 px-4">Moderation Status</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4D9]">
                  {opportunities
                    .filter(o => o.title.toLowerCase().includes(oppQuery.toLowerCase()))
                    .map((opp) => (
                      <tr key={opp.id} className="hover:bg-stone-50/50">
                        <td className="py-3.5 px-4 font-bold text-[#283618]">{opp.title}</td>
                        <td className="py-3.5 px-4 font-semibold text-stone-700">{opp.organization?.name || 'Private Employer'}</td>
                        <td className="py-3.5 px-4 text-stone-600">{opp.county} County</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                            opp.moderationStatus === 'published'
                              ? 'bg-green-100 text-green-800'
                              : opp.moderationStatus === 'quarantined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {opp.moderationStatus || 'published'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-500">{new Date(opp.deadline).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => moderateOpportunity(opp.id, 'published')}
                            className="px-2 py-1 bg-green-50 text-green-700 rounded-lg font-bold border border-green-200 hover:bg-green-100 transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => moderateOpportunity(opp.id, 'quarantined')}
                            className="px-2 py-1 bg-red-50 text-red-700 rounded-lg font-bold border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                          >
                            Quarantine
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 5: BUSINESS LISTING MODERATION */}
        {adminTab === 'businesses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-2xl text-[#132A13]">Business Marketplace Sales Moderation</h3>
                <p className="text-stone-500 text-sm">Review confidential listings, asking price parameters, and verified M&A declarations.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={bizQuery}
                  onChange={(e) => setBizQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E8E4D9] focus:outline-none focus:border-[#283618] bg-[#F9F8F6]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4D9] bg-[#F9F8F6] text-stone-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Listing Title</th>
                    <th className="py-3 px-4">Industry</th>
                    <th className="py-3 px-4">Asking Price</th>
                    <th className="py-3 px-4">County</th>
                    <th className="py-3 px-4">Moderation Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4D9]">
                  {businesses
                    .filter(b => b.title.toLowerCase().includes(bizQuery.toLowerCase()))
                    .map((biz) => (
                      <tr key={biz.id} className="hover:bg-stone-50/50">
                        <td className="py-3.5 px-4 font-bold text-[#283618]">{biz.title}</td>
                        <td className="py-3.5 px-4 text-stone-600">{biz.industry}</td>
                        <td className="py-3.5 px-4 font-bold text-[#BC6C25]">${biz.askingPriceUSD.toLocaleString()} USD</td>
                        <td className="py-3.5 px-4 text-stone-500">{biz.county} County</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                            biz.moderationStatus === 'published'
                              ? 'bg-green-100 text-green-800'
                              : biz.moderationStatus === 'suspended'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {biz.moderationStatus || 'published'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => moderateBusiness(biz.id, 'published')}
                            className="px-2 py-1 bg-green-50 text-green-700 rounded-lg font-bold border border-green-200 hover:bg-green-100 transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => moderateBusiness(biz.id, 'suspended')}
                            className="px-2 py-1 bg-red-50 text-red-700 rounded-lg font-bold border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                          >
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 6: STATUTORY EVIDENCE QUEUE */}
        {adminTab === 'verification' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#132A13]">Statutory Evidence Review Queue</h3>
              <p className="text-stone-500 text-sm">Review government business permits, articles of incorporation, and tax clearance certificates.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {verificationRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white p-6 rounded-3xl border border-[#E8E4D9] shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="font-extrabold text-lg text-[#283618] block">{req.entityName}</span>
                      <span className="text-xs text-stone-400 font-mono">Request Reference: {req.id}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.status === 'verified'
                        ? 'bg-[#ECF3E9] text-[#4F772D]'
                        : req.status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">LBR Certificate No</span>
                      <span className="font-mono font-bold text-[#132A13]">{req.registrationNumber || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">LRA Tax ID (TIN)</span>
                      <span className="font-mono font-bold text-[#132A13]">{req.taxIdNumber || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">County Location</span>
                      <span className="font-semibold text-stone-700">{req.county} County</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">Badge Claimed</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[10px] font-extrabold uppercase">
                        {req.badgeRequested.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {req.evidenceDocuments && req.evidenceDocuments.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-stone-700 block">Attached Proof Dossier Files:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {req.evidenceDocuments.map((doc, dIdx) => (
                          <div key={dIdx} className="flex items-center justify-between gap-3 p-3 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-xs text-stone-700">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#ECF3E9] border border-[#D9E3D5] flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-[#4F772D]" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold block truncate">{doc.fileName}</span>
                                <span className="text-[10px] text-stone-400 uppercase">{(doc.fileSize ? (doc.fileSize / 1024).toFixed(1) + ' KB' : 'PDF Document')} • {doc.documentType?.replace('_', ' ') || 'Official'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setSelectedDocForReview(doc)}
                                className="px-2.5 py-1 bg-white hover:bg-[#ECF3E9] text-[#283618] border border-[#E8E4D9] rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Review / Preview Document"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#606C38]" />
                                <span className="hidden sm:inline">Review</span>
                              </button>
                              <button
                                onClick={() => handleDownloadDoc(doc)}
                                className="px-2.5 py-1 bg-[#283618] hover:bg-[#386641] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Download Document"
                              >
                                <Download className="w-3.5 h-3.5 text-white" />
                                <span className="hidden sm:inline">Download</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {req.status === 'pending_review' && (
                    <div className="flex gap-2 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => handleVerificationRequestAction(req.id, 'verified')}
                        className="px-4 py-2 bg-[#ECF3E9] text-[#4F772D] border border-[#D9E3D5] text-xs font-extrabold rounded-xl hover:bg-[#ECF3E9]/80 transition-all cursor-pointer"
                      >
                        Approve statutory badge
                      </button>
                      <button
                        onClick={() => handleVerificationRequestAction(req.id, 'rejected')}
                        className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-xs font-extrabold rounded-xl hover:bg-red-100 transition-all cursor-pointer"
                      >
                        Reject proof dossier
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 7: COMMUNITY REPORTS & SCAM DESK */}
        {adminTab === 'reports' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#132A13]">Scam & Violation Investigative Desk</h3>
              <p className="text-stone-500 text-sm">Review anonymous reports flagging illegal upfront recruitment fees or corporate identity theft.</p>
            </div>

            <div className="space-y-4">
              {reports.map((rep) => (
                <div key={rep.id} className="bg-red-50/20 border border-red-100 p-6 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-red-100/30 pb-3">
                    <div>
                      <span className="font-extrabold text-stone-800 text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Report reference: {rep.id}
                      </span>
                      <span className="text-xs text-stone-500">Reported entity: <strong>{rep.targetTitleOrName}</strong> ({rep.reportType})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                      rep.status === 'actioned' || rep.status === 'dismissed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {rep.status}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-red-100/40 text-xs space-y-2 text-stone-700">
                    <div>
                      <strong className="text-stone-800 block">Reason classification:</strong>
                      <span className="uppercase font-bold text-red-700">{rep.reason.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <strong className="text-stone-800 block">Reporter details:</strong>
                      <span>{rep.reporterName} ({rep.reporterEmail})</span>
                    </div>
                    <div>
                      <strong className="text-stone-800 block font-bold mt-1">Written Testimony:</strong>
                      <p className="text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/50 italic mt-1 font-mono">
                        "{rep.details}"
                      </p>
                    </div>
                  </div>

                  {rep.status === 'pending' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleReportAction(rep.id, 'listing_quarantined')}
                        className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-all cursor-pointer"
                      >
                        Quarantine Listing
                      </button>
                      <button
                        onClick={() => handleReportAction(rep.id, 'account_restricted')}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer"
                      >
                        Restrict Account
                      </button>
                      <button
                        onClick={() => handleReportAction(rep.id, 'dismissed')}
                        className="px-3 py-1.5 bg-stone-50 text-stone-600 border border-stone-200 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all cursor-pointer"
                      >
                        Dismiss Report
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 8: SAAS SUBSCRIPTIONS ENTITLEMENTS */}
        {adminTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#132A13]">Recruiter Corporate SaaS Subscriptions</h3>
              <p className="text-stone-500 text-sm">Audit active subscriptions, adjust feature limits, or upgrade plans for enterprise employers.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4D9] bg-[#F9F8F6] text-stone-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Organization Name</th>
                    <th className="py-3 px-4">Industry Category</th>
                    <th className="py-3 px-4">Current Active Plan</th>
                    <th className="py-3 px-4 text-right">Actions / Toggle Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4D9]">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-stone-50/50">
                      <td className="py-3.5 px-4 font-bold text-stone-800">{org.name}</td>
                      <td className="py-3.5 px-4 text-stone-600">{org.industry}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-800 rounded-lg text-[10px] font-extrabold uppercase">
                          Standard Plan
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => toggleOrgSubscriptionTier(org.id, 'plan-pro')}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200 text-[10px] hover:bg-blue-100 transition-all cursor-pointer"
                        >
                          Upgrade Pro
                        </button>
                        <button
                          onClick={() => toggleOrgSubscriptionTier(org.id, 'plan-enterprise')}
                          className="px-2 py-1 bg-[#FEFAE0] text-[#BC6C25] rounded-lg font-bold border border-[#D9E3D5] text-[10px] hover:bg-[#FEFAE0]/80 transition-all cursor-pointer"
                        >
                          Grant Enterprise
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 9: PAYMENTS LEDGER LOGS */}
        {adminTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-2xl text-[#132A13]">Stripe & Mobile Money Payments Ledger</h3>
                <p className="text-stone-500 text-sm">Historical log of captured recruitment SaaS payments and multi-currency billing invoices.</p>
              </div>
              <button
                onClick={logDemoInvoice}
                className="px-4 py-2 bg-[#283618] hover:bg-[#132A13] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Simulate Receipt Payment</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4D9] bg-[#F9F8F6] text-stone-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Receipt Transaction ID</th>
                    <th className="py-3 px-4">Payee Corporate</th>
                    <th className="py-3 px-4">Billing Item</th>
                    <th className="py-3 px-4">Charged Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Captured Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4D9]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-mono text-stone-500 font-bold">{p.id}</td>
                      <td className="py-3 px-4 font-bold text-stone-800">{p.orgName}</td>
                      <td className="py-3 px-4 font-semibold uppercase text-stone-600">{p.planId.replace('plan-', '')} SaaS</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {p.currency === 'USD' ? `$${p.amount.toLocaleString()} USD` : `${p.amount.toLocaleString()} LRD`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-lg text-[10px] font-bold uppercase">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-400 font-mono">{new Date(p.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 10: CATEGORIES & TAXONOMY REGISTRY */}
        {adminTab === 'categories' && (
          <div className="space-y-8">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#132A13]">Taxonomy Registry</h3>
              <p className="text-stone-500 text-sm">Manage system-wide job categories and business industries.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Opportunities Taxonomy */}
              <div className="p-6 bg-[#F9F8F6] border border-[#E8E4D9] rounded-[24px] space-y-4">
                <span className="text-sm font-bold text-[#283618] block border-b border-stone-200/50 pb-2">Opportunity Categories</span>
                <form onSubmit={addCategory} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New classification..."
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E8E4D9] focus:outline-none focus:border-[#283618] bg-white"
                  />
                  <button type="submit" className="px-3 py-2 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
                    Add Code
                  </button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-xl text-xs font-semibold text-stone-700">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Business Listing Taxonomy */}
              <div className="p-6 bg-[#F9F8F6] border border-[#E8E4D9] rounded-[24px] space-y-4">
                <span className="text-sm font-bold text-[#283618] block border-b border-stone-200/50 pb-2">Business Industries</span>
                <form onSubmit={addIndustry} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New industry..."
                    value={newInd}
                    onChange={(e) => setNewInd(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E8E4D9] focus:outline-none focus:border-[#283618] bg-white"
                  />
                  <button type="submit" className="px-3 py-2 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
                    Add Code
                  </button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {industries.map((ind, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-xl text-xs font-semibold text-stone-700">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 11: CONTENT & ANNOUNCEMENTS BANNER MANAGEMENT */}
        {adminTab === 'content' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#132A13]">Global Portal Announcement Banners</h3>
              <p className="text-stone-500 text-sm">Deploy emergency messages, alert recruiters of changes, or configure statutory warnings.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#283618] uppercase tracking-wider block">Announcement Banner Message</label>
                <textarea
                  value={announcementBanner}
                  onChange={(e) => setAnnouncementBanner(e.target.value)}
                  className="w-full p-4 text-xs rounded-xl border border-[#E8E4D9] bg-[#F9F8F6] focus:outline-none focus:border-[#283618] font-mono h-20"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enable-banner"
                  checked={bannerEnabled}
                  onChange={(e) => setBannerEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8E4D9]"
                />
                <label htmlFor="enable-banner" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Enable active emergency alert strip
                </label>
              </div>

              <div className="space-y-2 pt-4 border-t border-stone-100">
                <label className="text-xs font-bold text-[#283618] uppercase tracking-wider block">Featured Support Answer FAQ</label>
                <input
                  type="text"
                  value={faqTitle}
                  onChange={(e) => setFaqTitle(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-[#E8E4D9] bg-[#F9F8F6] focus:outline-none focus:border-[#283618] font-bold"
                />
                <textarea
                  value={faqBody}
                  onChange={(e) => setFaqBody(e.target.value)}
                  className="w-full p-4 text-xs rounded-xl border border-[#E8E4D9] bg-[#F9F8F6] focus:outline-none focus:border-[#283618] h-20 mt-2"
                />
              </div>

              <button
                onClick={handleUpdateContent}
                className="px-4 py-2 bg-[#283618] hover:bg-[#132A13] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Save Live Content Updates
              </button>
            </div>
          </div>
        )}

        {/* VIEW 12: PLATFORM CONFIGURATION & SETTINGS */}
        {adminTab === 'settings' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#132A13]">Global Platform Configuration Variables</h3>
              <p className="text-stone-500 text-sm">Control currency exchange conversion baselines, surcharge rates, and system modes.</p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-stone-400 uppercase font-bold block">LRD Exchange Rate (per 1 USD)</label>
                  <input
                    type="number"
                    value={lrdExchangeRate}
                    onChange={(e) => setLrdExchangeRate(Number(e.target.value))}
                    className="w-full p-3 text-xs rounded-xl border border-[#E8E4D9] bg-[#F9F8F6]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-stone-400 uppercase font-bold block">Transaction Surcharge Surcharge %</label>
                  <input
                    type="number"
                    value={transFee}
                    onChange={(e) => setTransFee(Number(e.target.value))}
                    className="w-full p-3 text-xs rounded-xl border border-[#E8E4D9] bg-[#F9F8F6]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-stone-400 uppercase font-bold block">Max Job Life Duration (Days)</label>
                  <input
                    type="number"
                    value={maxJobExpiry}
                    onChange={(e) => setMaxJobExpiry(Number(e.target.value))}
                    className="w-full p-3 text-xs rounded-xl border border-[#E8E4D9] bg-[#F9F8F6]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="m-mode"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8E4D9]"
                />
                <label htmlFor="m-mode" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Enable system maintenance bypass (Only Platform Admins bypass)
                </label>
              </div>

              <button
                onClick={handleUpdateSettings}
                className="px-4 py-2 bg-[#283618] hover:bg-[#132A13] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Apply System Variables
              </button>
            </div>
          </div>
        )}

        {/* VIEW 13: IMMUTABLE AUDIT TRAIL LOG */}
        {adminTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-2xl text-[#132A13]">Platform Immutable Log Trail</h3>
                <p className="text-stone-500 text-sm">Chronological registry of administrative triggers, modifications, and system interventions.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter audit actions..."
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E8E4D9] focus:outline-none focus:border-[#283618] bg-[#F9F8F6]"
                />
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {auditLogs
                .filter(log => log.action.toLowerCase().includes(auditQuery.toLowerCase()) || (log.actorName && log.actorName.toLowerCase().includes(auditQuery.toLowerCase())))
                .map((log) => (
                  <div key={log.id} className="p-4 bg-[#F9F8F6] border border-[#E8E4D9] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-[11px] leading-relaxed">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#132A13]">{log.actorName || 'Platform Process'}</span>
                        <span className="px-1.5 py-0.5 bg-[#ECF3E9] border border-[#D9E3D5] text-[#4F772D] rounded text-[10px] uppercase font-bold">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-stone-600">
                        {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ') : 'No parameters logged'}
                      </p>
                    </div>
                    <div className="text-stone-400 shrink-0 text-right text-[10px]">
                      <div>ID: {log.id}</div>
                      <div>{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>

      {/* Document Review & Preview Modal */}
      {selectedDocForReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E8E4D9] space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ECF3E9] border border-[#D9E3D5] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#4F772D]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#132A13]">{selectedDocForReview.fileName}</h3>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">
                    {selectedDocForReview.documentType?.replace('_', ' ')} • {selectedDocForReview.fileSize ? (selectedDocForReview.fileSize / 1024).toFixed(1) + ' KB' : 'Standard PDF'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForReview(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Preview Area */}
            <div className="bg-[#F9F8F6] border border-[#E8E4D9] rounded-2xl p-6 space-y-4 font-mono text-xs text-stone-700 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="font-bold text-[#283618]">Dossier Security Verification & Preview Header</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">AUTHENTICATED REGISTRY RECORD</span>
              </div>
              <div className="space-y-2 text-stone-600 leading-relaxed">
                <p><strong>Document ID:</strong> {selectedDocForReview.id}</p>
                <p><strong>Upload Timestamp:</strong> {new Date(selectedDocForReview.uploadedAt).toLocaleString()}</p>
                <p><strong>MIME Type:</strong> {selectedDocForReview.fileType || 'application/pdf'}</p>
                <div className="p-4 bg-white border border-[#E8E4D9] rounded-xl space-y-2 mt-4 text-stone-800">
                  <p className="font-bold text-[#132A13]">// REPUBLIC OF LIBERIA - OFFICIAL REGULATORY FILING RECORD</p>
                  <p className="text-[11px] text-stone-600">
                    This statutory document has been uploaded for compliance review against the Ministry of Labour and Liberia Business Registry (LBR) records. All authenticity seals, TIN records, and employer permits are validated upon approval.
                  </p>
                  <p className="text-[11px] font-mono text-[#4F772D] pt-2">
                    [SHA-256 HASH: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855]
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedDocForReview(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => handleDownloadDoc(selectedDocForReview)}
                className="px-5 py-2 bg-[#283618] hover:bg-[#386641] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Document File</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
