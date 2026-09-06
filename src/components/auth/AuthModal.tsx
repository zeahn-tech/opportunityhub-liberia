import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { County, UserRole } from '../../types';
import { LIBERIAN_COUNTIES } from '../../config/constants';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Building,
  MapPin,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Button } from '../../design-system/Button';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalView,
    setAuthModalView,
    login,
    register,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    switchRole
  } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('job_seeker');
  const [regPhone, setRegPhone] = useState('');
  const [regCounty, setRegCounty] = useState<County>('Montserrado');
  const [regOrgName, setRegOrgName] = useState('');

  // Forgot / Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedResetToken, setGeneratedResetToken] = useState<string | null>(null);

  // Email verification state
  const [verificationTokenInput, setVerificationTokenInput] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      closeAuthModal();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await register({
        fullName: regFullName,
        email: regEmail,
        password: regPassword,
        primaryRole: regRole,
        phoneNumber: regPhone,
        primaryCounty: regCounty,
        organizationName: regOrgName || undefined
      });
      setSuccessMessage('Registration successful! Please verify your email.');
      setTimeout(() => closeAuthModal(), 1200);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to register account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const res = await requestPasswordReset(resetEmail);
      if (res.resetToken) {
        setGeneratedResetToken(res.resetToken);
        setResetToken(res.resetToken);
      }
      setSuccessMessage('A secure recovery code has been generated. Use it below to reset your password.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setSuccessMessage('Password has been securely reset. You can now log in.');
      setTimeout(() => {
        setAuthModalView('login');
        setSuccessMessage(null);
        setGeneratedResetToken(null);
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    switchRole(role);
    closeAuthModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#132A13]/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8E4D9] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F9F8F6]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#283618] rounded-lg flex items-center justify-center text-white">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#606C38]">
                OpportunityHub Liberia
              </span>
            </div>
            <h2 className="text-xl font-serif font-bold text-[#132A13] mt-1">
              {authModalView === 'login' && 'Sign in to your account'}
              {authModalView === 'register' && 'Create an opportunity account'}
              {authModalView === 'forgot_password' && 'Account Recovery'}
            </h2>
          </div>
          <button
            onClick={closeAuthModal}
            className="w-8 h-8 rounded-full bg-[#E8E4D9]/60 hover:bg-[#E8E4D9] flex items-center justify-center text-[#283618] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-[#FCF0E8] border border-[#BC6C25]/30 rounded-2xl flex items-start gap-3 text-xs text-[#BC6C25]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-[#ECF3E9] border border-[#4F772D]/30 rounded-2xl flex items-start gap-3 text-xs text-[#283618]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#4F772D]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Persona Access for Testing / Evaluation */}
          <div className="mb-6 p-3 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
            <div className="text-[11px] font-bold text-[#606C38] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#BC6C25]" />
              Quick-Switch Demo Persona (All 8 Roles)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('job_seeker')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Job Seeker</div>
                <div className="text-[9px] text-[#606C38] truncate">Tamba K.</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('employer')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Employer</div>
                <div className="text-[9px] text-[#606C38] truncate">Save Children</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('recruiter')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Recruiter</div>
                <div className="text-[9px] text-[#606C38] truncate">Korto Flomo</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('business_seller')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Seller (M&A)</div>
                <div className="text-[9px] text-[#606C38] truncate">Samuel Tweh</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('buyer')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Buyer / Investor</div>
                <div className="text-[9px] text-[#606C38] truncate">N. Sherman</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('service_provider')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Provider</div>
                <div className="text-[9px] text-[#606C38] truncate">Patrick Sumo</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('organization_admin')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Org Admin</div>
                <div className="text-[9px] text-[#606C38] truncate">Marie Weah</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('platform_admin')}
                className="p-1.5 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#ECF3E9] hover:text-[#283618] text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[11px]">Platform Admin</div>
                <div className="text-[9px] text-[#606C38] truncate">SuperAdmin</div>
              </button>
            </div>
          </div>

          {/* VIEW: LOGIN */}
          {authModalView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. tamba.kollie@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#132A13] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalView('forgot_password');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-[#BC6C25] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
                <div className="text-[11px] text-[#606C38] mt-1">
                  Default seed password: <code className="bg-[#E8E4D9] px-1 py-0.5 rounded">Password123!</code>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                  Sign In
                </Button>
              </div>

              <div className="text-center pt-2 text-xs text-[#606C38]">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalView('register');
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#283618] hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {authModalView === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Saye Flomo"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="saye@example.lr"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Phone (Liberia)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+231 77 ..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Primary Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  >
                    <option value="job_seeker">Job Seeker / Scholar</option>
                    <option value="employer">Employer / Company</option>
                    <option value="recruiter">Recruitment Agency</option>
                    <option value="business_seller">Business Seller (M&A)</option>
                    <option value="buyer">Investor / Buyer</option>
                    <option value="service_provider">Service Provider / Contractor</option>
                    <option value="organization_admin">Organization Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    County
                  </label>
                  <select
                    value={regCounty}
                    onChange={(e) => setRegCounty(e.target.value as County)}
                    className="w-full px-3 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  >
                    {LIBERIAN_COUNTIES.map((c) => (
                      <option key={c} value={c}>
                        {c} County
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Organization name input if employer/recruiter */}
              {(regRole === 'employer' ||
                regRole === 'recruiter' ||
                regRole === 'organization_admin') && (
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Organization / Company Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={regOrgName}
                      onChange={(e) => setRegOrgName(e.target.value)}
                      placeholder="e.g. Monrovia Solar Solutions Ltd."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Password (min 8 chars, 1 letter, 1 number/symbol)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create secure password"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                  Create Opportunity Account
                </Button>
              </div>

              <div className="text-center pt-2 text-xs text-[#606C38]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalView('login');
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#283618] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT & RESET PASSWORD */}
          {authModalView === 'forgot_password' && (
            <div className="space-y-4">
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter registered email"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>

                <Button type="submit" variant="ochre" size="md" className="w-full" isLoading={isLoading}>
                  Send Recovery Code
                </Button>
              </form>

              {generatedResetToken && (
                <div className="p-3 bg-[#FEFAE0] rounded-xl border border-[#E8E4D9] text-xs">
                  <div className="font-bold text-[#BC6C25] mb-1">Recovery Token Generated:</div>
                  <div className="font-mono bg-white p-2 rounded border border-[#E8E4D9] break-all select-all">
                    {generatedResetToken}
                  </div>
                </div>
              )}

              <hr className="border-[#E8E4D9] my-4" />

              <form onSubmit={handleResetSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Reset Token
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste recovery token"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    New Secure Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 letter, 1 number/symbol"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoading}>
                  Reset Password & Sign In
                </Button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalView('login');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[#606C38] hover:text-[#283618] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
