import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  Opportunity,
  Organization,
  OrganizationMembership,
  RBACAction,
  User,
  UserProfile,
  UserRole,
  UserCapability
} from '../types';
import { authService, AuthSession } from '../services/authService';
import { logger } from '../core/logging/logger';
import { AuthorizationContext, WorkspaceAccessResult } from '../core/auth/permissionEngine';

export type AuthModalView = 'login' | 'register' | 'forgot_password';

interface AuthContextType {
  session: AuthSession;
  user: User | null;
  activeRole: UserRole;
  activeOrganization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  /** True only for the opt-in local demo-mode session. See AuthSession. */
  isDemoMode: boolean;
  authContext: AuthorizationContext;
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
  logout: () => void | Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; resetToken?: string }>;
  resetPassword: (token: string, newPass: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile> & { fullName?: string; phoneNumber?: string }) => Promise<void>;
  completeOnboarding: (capabilities: UserCapability[]) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  switchRole: (role: UserRole) => void;
  switchOrganization: (orgId: string | null) => Promise<void>;
  userOrganizations: Array<Organization & { membership: OrganizationMembership }>;
  activeMembership: OrganizationMembership | null;
  refreshOrganizations: () => void;

  // Centralized Authorization Engine
  can: (action: RBACAction, resourceTenantId?: string, resourceOwnerUserId?: string) => boolean;
  canViewOpportunity: (opp: Opportunity) => boolean;
  canApply: (opp: Opportunity) => boolean;
  canCreateOpportunity: (orgId?: string) => boolean;
  canManageOpportunity: (opp: Opportunity) => boolean;
  canManageOrganization: (orgId: string) => boolean;
  canInviteMember: (orgId: string) => boolean;
  canViewCandidate: (candidateOrApp: { applicantUserId?: string; userId?: string; organizationId?: string }) => boolean;
  canManageSubscription: (orgId: string) => boolean;
  canModerate: () => boolean;
  canVerify: () => boolean;
  canAccessWorkspace: (workspace: 'recruiter' | 'candidate' | 'verification' | 'admin' | 'billing' | 'businesses' | 'opportunities') => WorkspaceAccessResult;

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
    logger.debug('AuthContext', `AuthProvider active for user ${session.user?.fullName || 'Guest'} (${session.activeRole})`);
  }, [session.user?.fullName, session.activeRole]);

  // On mount: re-verify against the real Supabase session (the cached
  // localStorage session is only an optimistic first paint), then keep
  // listening for token refresh / expiry / external sign-out.
  useEffect(() => {
    let isMounted = true;
    authService.restoreSupabaseSession().then((restored) => {
      if (isMounted) setSession({ ...restored });
    });
    const unsubscribe = authService.onAuthStateChange((updated) => {
      if (isMounted) setSession({ ...updated });
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

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

  const logout = useCallback(async () => {
    await authService.logout();
    setSession({ ...authService.getSession() });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return await authService.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPass: string) => {
    await authService.resetPassword(token, newPass);
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    await authService.verifyEmail(token);
    setSession({ ...authService.getSession() });
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile> & { fullName?: string; phoneNumber?: string }) => {
      authService.updateProfile(updates);
      setSession({ ...authService.getSession() });
    },
    []
  );

  const completeOnboarding = useCallback(
    async (capabilities: UserCapability[]) => {
      const updated = authService.completeOnboarding(capabilities);
      setSession({ ...updated });
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

  const switchOrganization = useCallback(async (orgId: string | null) => {
    const updated = await authService.switchOrganization(orgId);
    setSession({ ...updated });
  }, []);

  const [userOrganizations, setUserOrganizations] = useState<Array<Organization & { membership: OrganizationMembership }>>(() => {
    return authService.getUserOrganizations();
  });

  const refreshOrganizations = useCallback(() => {
    setUserOrganizations(authService.getUserOrganizations());
  }, []);

  useEffect(() => {
    setUserOrganizations(authService.getUserOrganizations());
  }, [session.user, session.activeOrganization]);

  const activeMembership = authService.getActiveMembership();

  const authContext = useMemo<AuthorizationContext>(() => {
    return authService.getAuthorizationContext();
  }, [session]);

  const can = useCallback((action: RBACAction, resourceTenantId?: string, resourceOwnerUserId?: string) => {
    return authService.can(action, resourceTenantId, resourceOwnerUserId);
  }, []);

  const canViewOpportunity = useCallback((opp: Opportunity) => {
    return authService.canViewOpportunity(opp);
  }, []);

  const canApply = useCallback((opp: Opportunity) => {
    return authService.canApply(opp);
  }, []);

  const canCreateOpportunity = useCallback((orgId?: string) => {
    return authService.canCreateOpportunity(orgId);
  }, []);

  const canManageOpportunity = useCallback((opp: Opportunity) => {
    return authService.canManageOpportunity(opp);
  }, []);

  const canManageOrganization = useCallback((orgId: string) => {
    return authService.canManageOrganization(orgId);
  }, []);

  const canInviteMember = useCallback((orgId: string) => {
    return authService.canInviteMember(orgId);
  }, []);

  const canViewCandidate = useCallback((candidateOrApp: { applicantUserId?: string; userId?: string; organizationId?: string }) => {
    return authService.canViewCandidate(candidateOrApp);
  }, []);

  const canManageSubscription = useCallback((orgId: string) => {
    return authService.canManageSubscription(orgId);
  }, []);

  const canModerate = useCallback(() => {
    return authService.canModerate();
  }, []);

  const canVerify = useCallback(() => {
    return authService.canVerify();
  }, []);

  const canAccessWorkspace = useCallback(
    (workspace: 'recruiter' | 'candidate' | 'verification' | 'admin' | 'billing' | 'businesses' | 'opportunities') => {
      return authService.canAccessWorkspace(workspace);
    },
    []
  );

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
        userOrganizations,
        activeMembership,
        refreshOrganizations,
        authContext,
        token: session.token,
        isAuthenticated: session.isAuthenticated && !!session.user && (session.user.accountStatus === 'active' || session.user.accountStatus === 'pending_verification'),
        isDemoMode: session.isDemoMode,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        verifyEmail,
        updateProfile,
        completeOnboarding,
        changePassword,
        switchRole,
        switchOrganization,
        can,
        canViewOpportunity,
        canApply,
        canCreateOpportunity,
        canManageOpportunity,
        canManageOrganization,
        canInviteMember,
        canViewCandidate,
        canManageSubscription,
        canModerate,
        canVerify,
        canAccessWorkspace,
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
