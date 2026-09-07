import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  ShieldCheck,
  Mail,
  UserCheck,
  Search,
  ExternalLink,
  Users,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../db/dbClient';
import { Organization, OrganizationInvitation } from '../../types';

interface OrganizationSwitcherProps {
  onOpenCreateWizard: () => void;
  className?: string;
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  onOpenCreateWizard,
  className = ''
}) => {
  const {
    user,
    activeOrganization,
    userOrganizations,
    activeMembership,
    switchOrganization,
    refreshOrganizations,
    activeRole
  } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<
    Array<OrganizationInvitation & { organizationName: string }>
  >([]);

  const isPlatformAdmin =
    user?.systemRole === 'platform_admin' || activeRole === 'platform_admin';

  // Load pending invitations for the authenticated user's email
  useEffect(() => {
    if (user?.email) {
      try {
        const invs = db.getPendingInvitationsForEmail(user.email);
        const enriched = invs.map((inv) => {
          const org = db.getOrganizationById(inv.organizationId);
          return {
            ...inv,
            organizationName: org?.name || 'Authorized Organization'
          };
        });
        setPendingInvitations(enriched);
      } catch {
        setPendingInvitations([]);
      }
    }
  }, [user?.email, isOpen]);

  const allOrganizations = useMemo(() => {
    if (!isPlatformAdmin) return [];
    return db.getOrganizations();
  }, [isPlatformAdmin, isOpen]);

  const handleSelectOrg = (orgId: string | null) => {
    try {
      switchOrganization(orgId);
      setIsOpen(false);
      if (orgId) {
        const targetOrg = db.getOrganizationById(orgId);
        showToast(`Switched workspace to ${targetOrg?.name || 'organization'}.`, 'info');
      } else {
        showToast('Switched to Personal Profile context.', 'info');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to switch organization', 'error');
    }
  };

  const handleAcceptInvite = (token: string, orgName: string) => {
    if (!user) return;
    try {
      const mem = db.acceptInvitation(token, user.id);
      refreshOrganizations();
      switchOrganization(mem.organizationId);
      setIsOpen(false);
      showToast(`Joined ${orgName} as ${mem.orgRole}!`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not accept invitation.', 'error');
    }
  };

  const handleDeclineInvite = (token: string) => {
    try {
      db.revokeInvitation(token);
      if (user?.email) {
        const invs = db.getPendingInvitationsForEmail(user.email);
        setPendingInvitations(
          invs.map((inv) => ({
            ...inv,
            organizationName: db.getOrganizationById(inv.organizationId)?.name || 'Organization'
          }))
        );
      }
      showToast('Invitation declined.', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not decline invitation.', 'error');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-[#F9F8F6] border border-[#E8E4D9] hover:border-[#283618] rounded-xl transition-all cursor-pointer text-left"
        title="Switch Multi-Tenant Workspace"
      >
        <div className="w-6 h-6 rounded-lg bg-[#283618] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
          {activeOrganization?.logoText || <Building2 className="w-3.5 h-3.5" />}
        </div>
        <div className="hidden lg:block">
          <div className="text-xs font-bold text-[#132A13] truncate max-w-[140px] leading-tight flex items-center gap-1">
            <span>{activeOrganization ? activeOrganization.name : 'Personal Profile'}</span>
            {activeOrganization?.isVerified && (
              <ShieldCheck className="w-3 h-3 text-[#4F772D] shrink-0" />
            )}
          </div>
          <div className="text-[10px] text-[#606C38] leading-tight flex items-center gap-1 capitalize">
            {activeMembership ? (
              <span>{activeMembership.orgRole?.replace('_', ' ')}</span>
            ) : isPlatformAdmin ? (
              <span className="text-[#BC6C25] font-semibold">Governance</span>
            ) : (
              <span>Independent</span>
            )}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#606C38]" />

        {/* Notification indicator for pending invitations */}
        {pendingInvitations.length > 0 && (
          <span className="w-2 h-2 bg-[#BC6C25] rounded-full absolute -top-0.5 -right-0.5 animate-pulse" />
        )}
      </button>

      {/* Switcher Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#E8E4D9] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Identity & Current Tenant Notice */}
          <div className="px-3 py-2 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#606C38]">
                Authoritative User Identity
              </span>
              <span className="text-[10px] text-[#4F772D] font-bold">Unchanged Across Tenancy</span>
            </div>
            <div className="text-xs font-bold text-[#132A13] mt-0.5">{user?.fullName}</div>
            <div className="text-[11px] text-[#606C38] truncate">{user?.email}</div>
          </div>

          {/* Pending Invitations Alert */}
          {pendingInvitations.length > 0 && (
            <div className="mb-3 p-3 bg-[#FCF5ED] border border-[#F2D7B3] rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#BC6C25]">
                <Mail className="w-3.5 h-3.5" />
                <span>Pending Workspace Invitations ({pendingInvitations.length})</span>
              </div>
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white p-2.5 rounded-lg border border-[#E8E4D9] text-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#132A13] truncate">{inv.organizationName}</span>
                    <span className="text-[10px] font-bold uppercase bg-[#ECF3E9] text-[#283618] px-2 py-0.5 rounded-full">
                      {inv.orgRole}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleDeclineInvite(inv.token)}
                      className="px-2 py-1 text-[11px] font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptInvite(inv.token, inv.organizationName)}
                      className="px-3 py-1 bg-[#283618] hover:bg-[#132A13] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      Accept & Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section: Your Authorized Organizations */}
          <div className="space-y-1 mb-3">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#606C38] flex items-center justify-between">
              <span>Your Authorized Workspaces ({userOrganizations.length})</span>
              <Users className="w-3 h-3 text-[#606C38]" />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 py-1">
              {/* Personal Independent Option */}
              <button
                onClick={() => handleSelectOrg(null)}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  !activeOrganization
                    ? 'bg-[#ECF3E9] text-[#283618] font-bold border border-[#4F772D]/30'
                    : 'hover:bg-[#F9F8F6] text-[#132A13]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#E8E4D9] text-[#283618] flex items-center justify-center font-bold text-xs">
                    P
                  </div>
                  <div>
                    <div className="font-bold">Personal Account</div>
                    <div className="text-[10px] text-[#606C38]">Independent Candidate / Freelancer</div>
                  </div>
                </div>
                {!activeOrganization && <Check className="w-4 h-4 text-[#4F772D]" />}
              </button>

              {userOrganizations.map((org) => {
                const isSelected = activeOrganization?.id === org.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#ECF3E9] text-[#283618] font-bold border border-[#4F772D]/30'
                        : 'hover:bg-[#F9F8F6] text-[#132A13]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#283618] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {org.logoText || 'OH'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate flex items-center gap-1">
                          <span>{org.name}</span>
                          {org.isVerified && (
                            <ShieldCheck className="w-3 h-3 text-[#4F772D] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-[#606C38] flex items-center gap-1.5">
                          <span className="capitalize">{org.type?.replace('_', ' ')}</span>
                          <span>•</span>
                          <span className="font-bold text-[#BC6C25] uppercase">
                            {org.membership?.orgRole}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#4F772D] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Platform Admin Governance (Global Override) */}
          {isPlatformAdmin && (
            <div className="border-t border-[#E8E4D9] pt-2 mb-3">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#132A13] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#BC6C25]" />
                <span>Governance Access (All Liberian Tenants)</span>
              </div>
              <div className="px-2 py-1">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-[#606C38] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search all organizations..."
                    className="w-full pl-8 pr-2 py-1.5 bg-[#F9F8F6] rounded-lg border border-[#E8E4D9] text-[11px] text-[#132A13] outline-none"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {allOrganizations
                    .filter((o) =>
                      searchTerm ? o.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
                    )
                    .slice(0, 10)
                    .map((org) => {
                      const isSel = activeOrganization?.id === org.id;
                      return (
                        <button
                          key={org.id}
                          onClick={() => handleSelectOrg(org.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                            isSel ? 'bg-[#ECF3E9] text-[#283618] font-bold' : 'hover:bg-[#F9F8F6] text-stone-700'
                          }`}
                        >
                          <span className="truncate">{org.name}</span>
                          <span className="text-[9px] uppercase bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                            {org.type?.replace('_', ' ')}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Action: Register New Organization */}
          <div className="border-t border-[#E8E4D9] pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCreateWizard();
              }}
              className="w-full py-2 px-3 bg-[#ECF3E9] hover:bg-[#DEEBD8] text-[#283618] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Organization Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
