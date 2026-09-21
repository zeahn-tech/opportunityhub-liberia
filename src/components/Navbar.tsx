import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Plus,
  SlidersHorizontal,
  Check,
  User as UserIcon,
  LogOut,
  Building2,
  Lock,
  ChevronDown,
  Database,
  CreditCard,
  MessageSquare,
  Bell,
  Activity,
  FileText,
  Bookmark,
  Settings
} from 'lucide-react';
import { UserProfileModal } from './auth/UserProfileModal';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { OrganizationSwitcher } from './organization/OrganizationSwitcher';
import { OrganizationWizardModal } from './organization/OrganizationWizardModal';
import { OrganizationTeamModal } from './organization/OrganizationTeamModal';
import { notificationService } from '../services/notificationService';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { envConfig } from '../config/env';

interface NavbarProps {
  activeTab: 'opportunities' | 'businesses' | 'verification' | 'recruiter' | 'candidate' | 'ai-studio' | 'billing' | 'messages' | 'admin';
  setActiveTab: (tab: 'opportunities' | 'businesses' | 'verification' | 'recruiter' | 'candidate' | 'ai-studio' | 'billing' | 'messages' | 'admin') => void;
  currency: 'USD' | 'LRD';
  setCurrency: (c: 'USD' | 'LRD') => void;
  currentRole: UserRole;
  setCurrentRole: (r: UserRole) => void;
  onOpenPostModal: () => void;
  notificationCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
  currentRole,
  setCurrentRole,
  onOpenPostModal,
  notificationCount: _notificationCount
}) => {
  const { user, activeOrganization, switchRole, openAuthModal, logout, canAccessWorkspace } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOrgWizardOpen, setIsOrgWizardOpen] = useState(false);
  const [isOrgTeamModalOpen, setIsOrgTeamModalOpen] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (user) {
      notificationService.getUserNotifications(user.id).then((res) => {
        if (res.data) {
          setUnreadNotifCount(res.data.filter((n) => !n.isRead).length);
        }
      });
    }
  }, [user?.id, showNotificationsModal]);

  const roleLabels: Record<
    UserRole,
    { title: string; badge: string; entity: string; iconBg: string }
  > = {
    job_seeker: {
      title: 'Talent & Job Seeker',
      badge: 'Candidate',
      entity: 'Tamba Kollie',
      iconBg: 'bg-[#283618]'
    },
    employer: {
      title: 'Save the Children',
      badge: 'Employer',
      entity: 'Dr. Evelyn Fahnbulleh',
      iconBg: 'bg-[#4F772D]'
    },
    recruiter: {
      title: 'West Africa Talent (Agency)',
      badge: 'Recruiter',
      entity: 'Korto Flomo',
      iconBg: 'bg-[#606C38]'
    },
    business_seller: {
      title: 'Business Seller (M&A)',
      badge: 'Seller',
      entity: 'Samuel Tweh (Pepperbird)',
      iconBg: 'bg-[#BC6C25]'
    },
    buyer: {
      title: 'Capitol Hill Capital (Buyer)',
      badge: 'Investor/Buyer',
      entity: 'Nathaniel Sherman',
      iconBg: 'bg-[#9A551A]'
    },
    service_provider: {
      title: 'Ganta Civil Services',
      badge: 'Contractor',
      entity: 'Eng. Patrick Sumo',
      iconBg: 'bg-[#283618]'
    },
    organization_admin: {
      title: 'Save the Children (Admin)',
      badge: 'Org Admin',
      entity: 'Madam Marie Weah',
      iconBg: 'bg-[#132A13]'
    },
    platform_admin: {
      title: 'Platform Administrator',
      badge: 'SuperAdmin',
      entity: 'National Governance',
      iconBg: 'bg-[#132A13]'
    },
    investor_buyer: {
      title: 'Capitol Hill Capital (Buyer)',
      badge: 'Investor/Buyer',
      entity: 'Nathaniel Sherman',
      iconBg: 'bg-[#9A551A]'
    },
    verification_officer: {
      title: 'LBR Verification Officer',
      badge: 'Gov Auditor',
      entity: 'Hon. Emmanuel Sumo',
      iconBg: 'bg-[#4F772D]'
    }
  };

  const handleRoleSelect = (r: UserRole) => {
    switchRole(r);
    setCurrentRole(r);
    setShowRoleDropdown(false);

    if (r === 'job_seeker') {
      setActiveTab('candidate');
    } else if (r === 'recruiter' || r === 'employer' || r === 'organization_admin') {
      setActiveTab('recruiter');
    } else if (r === 'verification_officer') {
      setActiveTab('verification');
    } else if (r === 'business_seller' || r === 'buyer') {
      setActiveTab('businesses');
    }
  };

  const userInitials = user
    ? (user.fullName || 'User')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '';

  return (
    <>
      <nav className="h-20 bg-white border-b border-[#E8E4D9] flex items-center justify-between px-4 sm:px-8 lg:px-10 shrink-0 sticky top-0 z-40">
        {/* Brand Identity */}
        <div className="flex items-center gap-6 lg:gap-8">
          <button
            onClick={() => setActiveTab('opportunities')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-10 h-10 bg-[#283618] rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-[#132A13] leading-none">
                OPPORTUNITY<span className="text-[#BC6C25]">HUB</span>
              </div>
              <div className="text-[10px] tracking-widest uppercase font-bold text-[#606C38]">
                LIBERIA
              </div>
            </div>
          </button>

          {/* Primary Marketplace Tabs */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium text-[#606C38]">
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'opportunities'
                  ? 'bg-[#ECF3E9] text-[#283618] font-bold'
                  : 'hover:text-[#283618] hover:bg-[#F9F8F6]'
              }`}
            >
              All Opportunities
            </button>
            <button
              onClick={() => setActiveTab('businesses')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'businesses'
                  ? 'bg-[#ECF3E9] text-[#283618] font-bold'
                  : 'hover:text-[#283618] hover:bg-[#F9F8F6]'
              }`}
            >
              Business M&A
            </button>
            {user && canAccessWorkspace('verification').allowed && (
              <button
                onClick={() => setActiveTab('verification')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'verification'
                    ? 'bg-[#ECF3E9] text-[#283618] font-bold'
                    : 'hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#4F772D]" />
                Verification Hub
              </button>
            )}
            {user && canAccessWorkspace('recruiter').allowed && (
              <button
                onClick={() => setActiveTab('recruiter')}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'recruiter'
                    ? 'bg-[#ECF3E9] text-[#283618] font-bold'
                    : 'hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                Recruiter Studio
              </button>
            )}
            {user && canAccessWorkspace('candidate').allowed && (
              <button
                onClick={() => setActiveTab('candidate')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'candidate'
                    ? 'bg-[#ECF3E9] text-[#283618] font-bold'
                    : 'hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                <span>Candidate Portal</span>
              </button>
            )}
            {user && (
              <button
                onClick={() => setActiveTab('ai-studio')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1 text-[#BC6C25] font-semibold cursor-pointer ${
                  activeTab === 'ai-studio'
                    ? 'bg-[#FEFAE0] border border-[#E8E4D9]'
                    : 'hover:bg-[#FEFAE0]/50'
                }`}
              >
                <span>✨ AI Copilot</span>
              </button>
            )}
            {user && canAccessWorkspace('billing').allowed && (
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'billing'
                    ? 'bg-[#ECF3E9] text-[#283618] font-bold'
                    : 'hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                <span>Subscriptions</span>
              </button>
            )}
            {user && (
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'messages'
                    ? 'bg-[#ECF3E9] text-[#283618] font-bold'
                    : 'hover:text-[#283618] hover:bg-[#F9F8F6]'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#4F772D]" />
                <span>Messages</span>
              </button>
            )}
            {user && canAccessWorkspace('admin').allowed && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#283618] text-white font-bold'
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-red-600" />
                <span>Trust & Safety</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & Multi-Role Context */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Organization Multi-Tenant Switcher */}
          {user && (
            <OrganizationSwitcher onOpenCreateWizard={() => setIsOrgWizardOpen(true)} />
          )}

          {/* Desktop PWA Install Button */}
          <PWAInstallButton className="hidden md:inline-flex py-1.5 px-3 text-xs" />

          {/* Notification Bell */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="p-2.5 bg-[#F9F8F6] hover:bg-[#ECF3E9] text-[#283618] rounded-xl border border-[#E8E4D9] relative transition-colors cursor-pointer"
            title="Notifications & Live Dispatches"
          >
            <Bell className="w-4 h-4 text-[#283618]" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#BC6C25] text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </button>
          {/* Currency Switcher */}
          <div className="flex items-center bg-[#F2F2EC] rounded-xl p-1 border border-[#E8E4D9]">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                currency === 'USD'
                  ? 'bg-white text-[#283618] shadow-xs'
                  : 'text-[#606C38] hover:text-[#283618]'
              }`}
              title="United States Dollar"
            >
              USD $
            </button>
            <button
              onClick={() => setCurrency('LRD')}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                currency === 'LRD'
                  ? 'bg-white text-[#283618] shadow-xs'
                  : 'text-[#606C38] hover:text-[#283618]'
              }`}
              title="Liberian Dollar (LRD)"
            >
              LRD $
            </button>
          </div>

          {/* User Profile / Account Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-white border border-[#E8E4D9] rounded-xl hover:border-[#283618] transition-all cursor-pointer"
                id="user-profile-menu-button"
              >
                <div className="w-7 h-7 rounded-lg bg-[#283618] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {userInitials}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-bold text-[#132A13] leading-tight truncate max-w-[120px]">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-[#606C38] leading-tight capitalize">
                    {activeOrganization ? activeOrganization.name : user.primaryRole?.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-[#606C38]" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E8E4D9] shadow-2xl p-2 z-50 animate-fade-in" id="user-profile-dropdown">
                  <div className="px-3 py-2.5 border-b border-[#E8E4D9]">
                    <div className="font-bold text-xs text-[#132A13]">{user.fullName}</div>
                    <div className="text-[11px] text-[#606C38] truncate">{user.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase bg-[#ECF3E9] text-[#283618] px-2 py-0.5 rounded-full">
                        {user.accountStatus?.replace('_', ' ')}
                      </span>
                      {user.isEmailVerified && (
                        <span className="text-[10px] font-bold text-[#4F772D] flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1 text-xs">
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                      id="profile-menu-item"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#606C38]" />
                      Profile
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('candidate');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                      id="activity-menu-item"
                    >
                      <Activity className="w-3.5 h-3.5 text-[#606C38]" />
                      My Activity
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('candidate');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                      id="applications-menu-item"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#606C38]" />
                      Applications
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('opportunities');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                      id="saved-menu-item"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#606C38]" />
                      Saved Opportunities
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('messages');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium flex justify-between"
                      id="messages-menu-item"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-[#606C38]" />
                        Messages
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowNotificationsModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium flex justify-between"
                      id="notifications-menu-item"
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-[#606C38]" />
                        Notifications
                      </div>
                      {unreadNotifCount > 0 && (
                        <span className="bg-[#BC6C25] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadNotifCount}
                        </span>
                      )}
                    </button>

                    <div className="my-1 border-t border-[#E8E4D9]"></div>

                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                      id="security-menu-item"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#606C38]" />
                      Security
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                      id="settings-menu-item"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#606C38]" />
                      Settings
                    </button>

                    <div className="my-1 border-t border-[#E8E4D9]"></div>

                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FCF0E8] text-[#BC6C25] flex items-center gap-2 cursor-pointer font-medium"
                      id="signout-menu-item"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 animate-fade-in" id="guest-auth-controls">
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 border border-[#E8E4D9] text-[#283618] hover:border-[#283618] transition-all text-xs sm:text-sm font-semibold rounded-xl cursor-pointer bg-white hover:bg-[#F9F8F6]"
                id="navbar-signin-button"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="px-4 py-2 bg-[#283618] hover:bg-[#132A13] text-white transition-all text-xs sm:text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
                id="navbar-register-button"
              >
                Create Account
              </button>
            </div>
          )}

          {/* Post Opportunity CTA */}
          {user && (
            <button
              onClick={onOpenPostModal}
              className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
              id="post-opportunity-button"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Post Opportunity</span>
              <span className="sm:hidden">Post</span>
            </button>
          )}
        </div>
      </nav>

      {/* User Profile Modal */}
      {user && (
        <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      )}

      {/* Organization Creation & Onboarding Wizard */}
      <OrganizationWizardModal
        isOpen={isOrgWizardOpen}
        onClose={() => setIsOrgWizardOpen(false)}
      />

      {/* Organization Team & Access Management Modal */}
      <OrganizationTeamModal
        isOpen={isOrgTeamModalOpen}
        onClose={() => setIsOrgTeamModalOpen(false)}
        organization={activeOrganization}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        onNavigateTab={(t) => setActiveTab(t as any)}
      />
    </>
  );
};
