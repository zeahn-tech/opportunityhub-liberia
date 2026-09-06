import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Organization, RBACAction, User, UserProfile, UserRole } from '../types';
import { authService, AuthSession } from '../services/authService';
import { logger } from '../core/logging/logger';

export type AuthModalView = 'login' | 'register' | 'forgot_password';

interface AuthContextType {
  session: AuthSession;
  user: User;
  activeRole: UserRole;
  activeOrganization: Organization | null;
  token: string;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    fullName: string;
    primaryRole: UserRole;
    phoneNumber?: string;
    primaryCounty?: User['primaryCounty'];
    organizationName?: string;
  }) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; resetToken?: string }>;
  resetPassword: (token: string, newPass: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile> & { fullName?: string; phoneNumber?: string }) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  switchRole: (role: UserRole) => void;
  switchOrganization: (orgId: string | null) => void;
  can: (action: RBACAction, resourceTenantId?: string) => boolean;

  // Modal State
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>(authService.getSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('login');

  useEffect(() => {
    logger.debug('AuthContext', `AuthProvider active for user ${session.user.fullName} (${session.activeRole})`);
  }, [session.user.fullName, session.activeRole]);

  const login = useCallback(async (email: string, pass: string) => {
    const updated = await authService.login(email, pass);
    setSession({ ...updated });
    setIsAuthModalOpen(false);
  }, []);

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      fullName: string;
      primaryRole: UserRole;
      phoneNumber?: string;
      primaryCounty?: User['primaryCounty'];
      organizationName?: string;
    }) => {
      const updated = await authService.register(params);
      setSession({ ...updated });
      setIsAuthModalOpen(false);
    },
    []
  );

  const logout = useCallback(() => {
    authService.logout();
    setSession({ ...authService.getSession() });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return await authService.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPass: string) => {
    await authService.resetPassword(token, newPass);
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    authService.verifyEmail(token);
    setSession({ ...authService.getSession() });
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile> & { fullName?: string; phoneNumber?: string }) => {
      authService.updateProfile(updates);
      setSession({ ...authService.getSession() });
    },
    []
  );

  const changePassword = useCallback(async (currentPass: string, newPass: string) => {
    await authService.changePassword(currentPass, newPass);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const updated = authService.switchRole(role);
    setSession({ ...updated });
  }, []);

  const switchOrganization = useCallback((orgId: string | null) => {
    const updated = authService.switchOrganization(orgId);
    setSession({ ...updated });
  }, []);

  const can = useCallback((action: RBACAction, resourceTenantId?: string) => {
    return authService.can(action, resourceTenantId);
  }, []);

  const openAuthModal = useCallback((view: AuthModalView = 'login') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session.user,
        activeRole: session.activeRole,
        activeOrganization: session.activeOrganization,
        token: session.token,
        isAuthenticated: session.user.accountStatus === 'active' || session.user.accountStatus === 'pending_verification',
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        verifyEmail,
        updateProfile,
        changePassword,
        switchRole,
        switchOrganization,
        can,
        isAuthModalOpen,
        authModalView,
        openAuthModal,
        closeAuthModal,
        setAuthModalView
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
