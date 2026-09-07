import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Mail,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Building2
} from 'lucide-react';
import { Organization, OrganizationMembership, OrganizationInvitation, OrgRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../db/dbClient';
import { Button } from '../../design-system/Button';

interface OrganizationTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
}

export const OrganizationTeamModal: React.FC<OrganizationTeamModalProps> = ({
  isOpen,
  onClose,
  organization
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<OrganizationMembership[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('recruiter');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const loadData = () => {
    if (!organization || !user) return;
    try {
      setIsLoading(true);
      const mems = db.getOrganizationMembers(organization.id, user.id);
      setMembers(mems);

      const orgInvs = db.getOrganizationInvitations(organization.id, user.id);
      setInvitations(orgInvs);
    } catch (err: unknown) {
      // Non-blocking error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && organization) {
      loadData();
    }
  }, [isOpen, organization?.id, user?.id]);

  if (!isOpen || !organization) return null;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteEmail.trim()) return;

    try {
      setIsSendingInvite(true);
      const perms = inviteRole === 'admin' ? ['all'] : ['opportunities.create', 'applications.view'];
      db.createInvitation(organization.id, inviteEmail.trim().toLowerCase(), inviteRole, perms, user.id);
      showToast(`Invitation dispatched to ${inviteEmail.trim()}.`, 'success');
      setInviteEmail('');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to send invitation', 'error');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSuspend = (membershipId: string, memberUserId: string) => {
    if (!user) return;
    try {
      db.suspendMember(organization.id, memberUserId, user.id);
      showToast('Member suspended from workspace.', 'info');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not suspend member.', 'error');
    }
  };

  const handleReactivate = (membershipId: string, memberUserId: string) => {
    if (!user) return;
    try {
      db.reactivateMember(organization.id, memberUserId, user.id);
      showToast('Member access reactivated.', 'success');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not reactivate member.', 'error');
    }
  };

  const handleRemoveMember = (membershipId: string) => {
    if (!user) return;
    try {
      db.removeMember(organization.id, membershipId, user.id);
      showToast('Member removed from workspace.', 'info');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not remove member.', 'error');
    }
  };

  const handleRevokeInvite = (token: string) => {
    try {
      db.revokeInvitation(token);
      showToast('Invitation revoked.', 'info');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not revoke invitation.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#132A13]/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#E8E4D9] bg-[#F9F8F6] relative flex-none">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#606C38] hover:text-[#132A13] hover:bg-[#F2F2EC] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-[#4F772D] text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Workspace Team & Access Control</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-[#132A13] flex items-center gap-2">
            <span>{organization.name}</span>
            {organization.isVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold bg-[#ECF3E9] text-[#283618] px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-[#4F772D]" /> Verified
              </span>
            )}
          </h2>
          <p className="text-xs text-[#606C38] mt-0.5">
            Manage authenticated members, role permissions, and outbound recruiter invitations.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Invite Member Box */}
          <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
            <div className="text-xs font-bold text-[#132A13] mb-2 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#BC6C25]" />
              <span>Invite New Team Member</span>
            </div>
            <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@organization.lr"
                className="flex-1 p-2.5 bg-white rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                className="p-2.5 bg-white rounded-xl border border-[#E8E4D9] text-xs font-medium text-[#132A13] outline-none"
              >
                <option value="admin">Administrator</option>
                <option value="recruiter">Recruiter</option>
                <option value="member">Member</option>
                <option value="billing_manager">Billing Manager</option>
              </select>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSendingInvite}
                isLoading={isSendingInvite}
                className="cursor-pointer"
              >
                Send Invite
              </Button>
            </form>
          </div>

          {/* Current Members */}
          <div>
            <div className="text-xs font-bold text-[#132A13] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Active Workspace Members ({members.length})</span>
              <button
                onClick={loadData}
                className="text-[11px] text-[#606C38] hover:text-[#132A13] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="space-y-2">
              {members.map((mem) => {
                const memberUser = db.getUserById(mem.userId);
                const isCurrentUser = mem.userId === user?.id;
                const isSuspended = mem.status === 'suspended';

                return (
                  <div
                    key={mem.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isSuspended
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-white border-[#E8E4D9]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#283618] text-white flex items-center justify-center font-bold text-xs">
                        {memberUser?.fullName ? memberUser.fullName[0] : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#132A13] flex items-center gap-2">
                          <span>{memberUser?.fullName || 'Registered User'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-[#4F772D] font-bold bg-[#ECF3E9] px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                          {isSuspended && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                              Suspended
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#606C38] flex items-center gap-2">
                          <span>{memberUser?.email || mem.userId}</span>
                          <span>•</span>
                          <span className="font-bold uppercase text-[10px] text-[#BC6C25]">
                            {mem.orgRole}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Member Controls (Owners/Admins can suspend/reactivate non-owners) */}
                    {!isCurrentUser && mem.orgRole !== 'owner' && (
                      <div className="flex items-center gap-2">
                        {isSuspended ? (
                          <button
                            onClick={() => handleReactivate(mem.id, mem.userId)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-[#ECF3E9] text-[#283618] hover:bg-[#DEEBD8] rounded-lg transition-colors cursor-pointer"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(mem.id, mem.userId)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(mem.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove from organization"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#132A13] uppercase tracking-wider mb-2">
                Outbound Pending Invitations ({invitations.length})
              </div>
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-white rounded-xl border border-[#E8E4D9] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#132A13] flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#606C38]" />
                        <span>{inv.inviteeEmail}</span>
                        <span className="text-[10px] font-bold uppercase bg-[#ECF3E9] text-[#283618] px-2 py-0.5 rounded-full">
                          {inv.orgRole}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#606C38] mt-0.5">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(inv.token)}
                      className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                      title="Revoke invitation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8E4D9] bg-[#F9F8F6] flex justify-end flex-none">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
