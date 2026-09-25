import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { County, UserProfile, UserSession, OrganizationMembership } from '../../types';
import { LIBERIAN_COUNTIES } from '../../config/constants';
import { authService } from '../../services/authService';
import {
  X,
  User,
  Shield,
  Smartphone,
  Building2,
  Key,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Save,
  Globe,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, changePassword, verifyEmail, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions' | 'organizations'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [county, setCounty] = useState<County>(user?.primaryCounty || 'Montserrado');
  const [city, setCity] = useState('Monrovia');
  const [skillsText, setSkillsText] = useState('Operations, Logistics, Project Management');
  const [visibility, setVisibility] = useState<'public' | 'registered_only' | 'private'>('public');

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Email verification token input
  const [verificationTokenInput, setVerificationTokenInput] = useState('');

  // Sessions and Memberships
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName);
      setPhoneNumber(user.phoneNumber || '');
      setCounty(user.primaryCounty);

      const prof = authService.getUserProfile(user.id);
      if (prof) {
        setHeadline(prof.headline || '');
        setBio(prof.bio || '');
        setCity(prof.city || 'Monrovia');
        setSkillsText((prof.skills || []).join(', '));
        setVisibility(prof.visibility || 'public');
      }

      setSessions(authService.getUserSessions());
      setMemberships(authService.getMemberships());
      setFeedback(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    try {
      const skills = skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateProfile({
        fullName,
        phoneNumber,
        headline,
        bio,
        county,
        city,
        skills,
        visibility
      });
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update profile.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Password changed successfully.' });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to change password.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEmailVerification = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      // In dev/prototype, if no token entered, pass a demo verification or simulate token
      const token = verificationTokenInput.trim() || 'eml_auto_verify';
      await verifyEmail(token);
      setFeedback({ type: 'success', message: 'Email verified successfully! Account is now fully active.' });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Verification failed. Please check the token.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeOtherSessions = () => {
    const revoked = authService.revokeOtherSessions();
    setSessions(authService.getUserSessions());
    setFeedback({ type: 'success', message: `Revoked ${revoked} other active session(s).` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#132A13]/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E8E4D9] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F9F8F6]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#283618] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#132A13]">{user.fullName}</h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    user.accountStatus === 'active'
                      ? 'bg-[#ECF3E9] text-[#283618]'
                      : 'bg-[#FCF0E8] text-[#BC6C25]'
                  }`}
                >
                  {user.accountStatus?.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs text-[#606C38] flex items-center gap-2">
                <span>{user.email}</span>
                <span>•</span>
                <span className="capitalize">{user.primaryRole?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[#E8E4D9]/60 hover:bg-[#E8E4D9] flex items-center justify-center text-[#283618] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E8E4D9] px-6 sm:px-8 bg-[#FDFCF9] text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('profile');
              setFeedback(null);
            }}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'profile'
                ? 'border-[#283618] text-[#283618] font-bold'
                : 'border-transparent text-[#606C38] hover:text-[#283618]'
            }`}
          >
            <User className="w-4 h-4" />
            Personal Profile
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              setFeedback(null);
            }}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'security'
                ? 'border-[#283618] text-[#283618] font-bold'
                : 'border-transparent text-[#606C38] hover:text-[#283618]'
            }`}
          >
            <Shield className="w-4 h-4" />
            Security & Verification
          </button>

          <button
            onClick={() => {
              setActiveTab('sessions');
              setFeedback(null);
            }}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'sessions'
                ? 'border-[#283618] text-[#283618] font-bold'
                : 'border-transparent text-[#606C38] hover:text-[#283618]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Active Sessions ({sessions.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('organizations');
              setFeedback(null);
            }}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'organizations'
                ? 'border-[#283618] text-[#283618] font-bold'
                : 'border-transparent text-[#606C38] hover:text-[#283618]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Organizations ({memberships.length})
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 sm:mx-8 mt-5 p-3.5 rounded-2xl flex items-start gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-[#ECF3E9] text-[#283618] border border-[#4F772D]/30'
                : 'bg-[#FCF0E8] text-[#BC6C25] border border-[#BC6C25]/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#4F772D]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#BC6C25]" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Tab Body */}
        <div className="p-6 sm:p-8 max-h-[65vh] overflow-y-auto">
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+231 77 ..."
                    className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Logistics Specialist | Operations Officer"
                  className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Primary County
                  </label>
                  <select
                    value={county}
                    onChange={(e) => setCounty(e.target.value as County)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  >
                    {LIBERIAN_COUNTIES.map((c) => (
                      <option key={c} value={c}>
                        {c} County
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Monrovia, Gbarnga, Buchanan"
                    className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Skills & Specializations (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  placeholder="Project Management, Supply Chain, M&E, Financial Modeling"
                  className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Professional Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief background and career summary..."
                  className="w-full px-3.5 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#606C38]">Profile Visibility:</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="text-xs px-2.5 py-1.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-lg"
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="registered_only">Verified Employers Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {/* TAB: SECURITY & EMAIL VERIFICATION */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Email Verification Status */}
              <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-[#132A13] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#4F772D]" />
                    Email Verification Status
                  </div>
                  {user.isEmailVerified ? (
                    <span className="text-xs font-bold text-[#4F772D] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#BC6C25] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Pending Verification
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#606C38] mb-3">
                  Verified email addresses prevent fraud and enable immediate notifications for job offers and tenders.
                </p>

                {!user.isEmailVerified && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Paste verification token or click verify"
                      value={verificationTokenInput}
                      onChange={(e) => setVerificationTokenInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-xl text-xs"
                    />
                    <Button
                      type="button"
                      variant="ochre"
                      size="sm"
                      onClick={handleManualEmailVerification}
                      isLoading={isLoading}
                    >
                      Confirm Verification
                    </Button>
                  </div>
                )}
              </div>

              {/* Password Change Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="text-xs font-bold text-[#132A13] uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#606C38]" />
                  Change Security Password
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#132A13] mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3.5 py-2 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#132A13] mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#132A13] uppercase tracking-wider">
                    Authorized Browser Sessions
                  </div>
                  <div className="text-xs text-[#606C38]">
                    Active login tokens registered in our database.
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeOtherSessions}
                  disabled={sessions.length <= 1}
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Log Out Other Sessions
                </Button>
              </div>

              <div className="space-y-2">
                {sessions.map((sess, idx) => (
                  <div
                    key={sess.id}
                    className="p-3 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#E8E4D9] flex items-center justify-center text-[#283618]">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#132A13] flex items-center gap-2">
                          <span>{sess.userAgent}</span>
                          {idx === 0 && (
                            <span className="bg-[#ECF3E9] text-[#283618] text-[9px] px-2 py-0.5 rounded-full font-bold">
                              Current Device
                            </span>
                          )}
                        </div>
                        <div className="text-[#606C38] text-[11px] flex items-center gap-2">
                          <span>IP: {sess.ipAddress}</span>
                          <span>•</span>
                          <span>Active: {new Date(sess.lastActivityAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#4F772D] font-bold">Active</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ORGANIZATIONS */}
          {activeTab === 'organizations' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-[#132A13] uppercase tracking-wider">
                  Organization Memberships
                </div>
                <div className="text-xs text-[#606C38]">
                  Entities and institutions you have permission to manage or recruit for.
                </div>
              </div>

              {memberships.length === 0 ? (
                <div className="text-center py-8 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] text-xs text-[#606C38]">
                  No organizational memberships linked to your individual account.
                </div>
              ) : (
                <div className="space-y-2">
                  {memberships.map((mem) => {
                    const org = authService.getActiveOrganization();
                    return (
                      <div
                        key={mem.id}
                        className="p-3 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#283618] text-white flex items-center justify-center font-bold">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#132A13]">{mem.organizationId}</div>
                            <div className="text-[11px] text-[#606C38]">
                              Role: <span className="font-semibold capitalize">{mem.orgRole}</span> • Status:{' '}
                              <span className="capitalize">{mem.status}</span>
                            </div>
                          </div>
                        </div>

                        <span className="bg-[#ECF3E9] text-[#283618] text-[10px] px-2.5 py-1 rounded-full font-bold">
                          {mem.orgRole.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-[#F9F8F6] border-t border-[#E8E4D9] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="text-xs font-bold text-[#BC6C25] hover:text-[#9A551A] flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out of Account
          </button>

          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
