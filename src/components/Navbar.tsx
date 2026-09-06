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
  Bell
} from 'lucide-react';
import { UserProfileModal } from './auth/UserProfileModal';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { db } from '../db/dbClient';
import { PWAInstallButton } from './pwa/PWAInstallButton';

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
  const { user, activeOrganization, switchRole, openAuthModal, logout } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (user) {
      const notifs = db.getNotificationsForUser(user.id);
      setUnreadNotifCount(notifs.filter((n) => !n.isRead).length);
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

  const userInitials = (user.fullName || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

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
          </div>
        </div>

        {/* Action Controls & Multi-Role Context */}
        <div className="flex items-center gap-2 sm:gap-3">
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

          {/* Role Authorization Switcher (All 8 Roles) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-xs text-[#283618] hover:border-[#283618] transition-all cursor-pointer"
              title="Switch Simulated Role Context"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#606C38]" />
              <span className="hidden md:inline font-bold">
                {roleLabels[currentRole]?.badge || 'Role'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#606C38]" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E8E4D9] shadow-2xl p-2.5 z-50">
                <div className="px-3 py-2 border-b border-[#E8E4D9] flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#606C38]">
                    Role Selection (Sell, Recruiter, Buyer, Admin, Rest)
                  </span>
                  <span className="text-[10px] text-[#BC6C25] font-semibold">Gateway</span>
                </div>
                <div className="py-1.5 space-y-3 max-h-80 overflow-y-auto">
                  {/* 1. SELL */}
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#BC6C25]">Sell</span>
                    {(['business_seller'] as UserRole[]).map((r) => {
                      const info = roleLabels[r];
                      const isSelected = currentRole === r;
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleSelect(r)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#ECF3E9] text-[#283618] font-bold border border-[#4F772D]/20' : 'hover:bg-[#F9F8F6] text-[#283618]'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{info.title}</div>
                            <div className="text-[10px] text-[#606C38]">{info.entity} • {info.badge}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#4F772D] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* 2. RECRUITER */}
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#4F772D]">Recruiter</span>
                    {(['recruiter', 'employer'] as UserRole[]).map((r) => {
                      const info = roleLabels[r];
                      const isSelected = currentRole === r;
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleSelect(r)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#ECF3E9] text-[#283618] font-bold border border-[#4F772D]/20' : 'hover:bg-[#F9F8F6] text-[#283618]'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{info.title}</div>
                            <div className="text-[10px] text-[#606C38]">{info.entity} • {info.badge}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#4F772D] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* 3. BUYER */}
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9A551A]">Buyer</span>
                    {(['buyer', 'investor_buyer'] as UserRole[]).map((r) => {
                      const info = roleLabels[r];
                      const isSelected = currentRole === r;
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleSelect(r)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#ECF3E9] text-[#283618] font-bold border border-[#4F772D]/20' : 'hover:bg-[#F9F8F6] text-[#283618]'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{info.title}</div>
                            <div className="text-[10px] text-[#606C38]">{info.entity} • {info.badge}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#4F772D] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* 4. PLATFORM ADMINISTRATOR */}
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#132A13]">Platform Administrator</span>
                    {(['platform_admin'] as UserRole[]).map((r) => {
                      const info = roleLabels[r];
                      const isSelected = currentRole === r;
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleSelect(r)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#ECF3E9] text-[#283618] font-bold border border-[#4F772D]/20' : 'hover:bg-[#F9F8F6] text-[#283618]'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{info.title}</div>
                            <div className="text-[10px] text-[#606C38]">{info.entity} • {info.badge}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#4F772D] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* 5. REST */}
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">Rest (Talent & Services)</span>
                    {(['job_seeker', 'service_provider', 'organization_admin', 'verification_officer'] as UserRole[]).map((r) => {
                      const info = roleLabels[r];
                      const isSelected = currentRole === r;
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleSelect(r)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#ECF3E9] text-[#283618] font-bold border border-[#4F772D]/20' : 'hover:bg-[#F9F8F6] text-[#283618]'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{info.title}</div>
                            <div className="text-[10px] text-[#606C38]">{info.entity} • {info.badge}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#4F772D] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Account Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-white border border-[#E8E4D9] rounded-xl hover:border-[#283618] transition-all cursor-pointer"
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
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E8E4D9] shadow-2xl p-2 z-50">
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
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#606C38]" />
                    Account & Profile
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('billing');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[#606C38]" />
                    Subscriptions & Billing
                  </button>

                  <button
                    onClick={() => {
                      openAuthModal('login');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#606C38]" />
                    Sign In to Other Account
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FCF0E8] text-[#BC6C25] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Post Opportunity CTA */}
          <button
            onClick={onOpenPostModal}
            className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Post Opportunity</span>
            <span className="sm:hidden">Post</span>
          </button>
        </div>
      </nav>

      {/* User Profile Modal */}
      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        onNavigateTab={(t) => setActiveTab(t as any)}
      />
    </>
  );
};
