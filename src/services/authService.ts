import {
  AccountStatus,
  Organization,
  OrganizationMembership,
  Opportunity,
  RBACAction,
  User,
  UserProfile,
  UserRole,
  UserCapability,
  UserSession
} from '../types';
import { db, SEED_USERS } from '../db/dbClient';
import { logger } from '../core/logging/logger';
import { storageAdapter } from '../db/storageAdapter';
import { getSupabaseClient } from '../lib/supabaseClient';
import { envConfig } from '../config/env';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../core/errors/AppError';
import {
  AuthorizationContext,
  WorkspaceAccessResult,
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
  evaluatePermission
} from '../core/auth/permissionEngine';

export interface AuthSession {
  user: User | null;
  activeRole: UserRole;
  activeOrganization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
}

const SESSION_STORAGE_KEY = 'auth_session';

class AuthService {
  private currentSession: AuthSession;

  constructor() {
    this.currentSession = this.loadInitialSession();
  }

  private loadInitialSession(): AuthSession {
    const saved = storageAdapter.getItem<AuthSession>(SESSION_STORAGE_KEY);
    if (saved && saved.user && saved.token && saved.isAuthenticated) {
      return saved;
    }

    if (envConfig.enableDemoMode && SEED_USERS.length > 0) {
      const defaultUser = SEED_USERS[0];
      const newSession = db.createSession(defaultUser.id, 'Initial Session');
      let activeOrg: Organization | null = null;
      const memberships = db.getMembershipsByUserId(defaultUser.id);
      if (memberships.length > 0) {
        activeOrg = db.getOrganizationById(memberships[0].organizationId);
      }
      return {
        user: defaultUser,
        activeRole: defaultUser.primaryRole || 'job_seeker',
        activeOrganization: activeOrg,
        token: newSession.token,
        isAuthenticated: true
      };
    }

    return {
      user: null,
      activeRole: 'job_seeker',
      activeOrganization: null,
      token: null,
      isAuthenticated: false
    };
  }

  public getSession(): AuthSession {
    return this.currentSession;
  }

  public getCurrentUser(): User | null {
    return this.currentSession.user;
  }

  public getActiveRole(): UserRole {
    return this.currentSession.activeRole;
  }

  public getActiveOrganization(): Organization | null {
    return this.currentSession.activeOrganization;
  }

  public getUserProfile(userId: string): UserProfile | null {
    return db.getUserProfile(userId);
  }

  public getUserSessions(): UserSession[] {
    if (!this.currentSession.user) return [];
    return db.getSessions().filter((s) => s.userId === this.currentSession.user!.id);
  }

  public getMemberships(): OrganizationMembership[] {
    if (!this.currentSession.user) return [];
    return db.getMembershipsByUserId(this.currentSession.user.id);
  }

  public revokeOtherSessions(): void {
    if (!this.currentSession.user || !this.currentSession.token) return;
    const sessions = db.getSessions();
    sessions.forEach((s) => {
      if (s.userId === this.currentSession.user!.id && s.token !== this.currentSession.token) {
        db.revokeSession(s.token);
      }
    });
  }

  // --- Registration ---
  public async register(params: {
    email: string;
    password: string;
    fullName: string;
    primaryRole: UserRole;
    phoneNumber?: string;
    primaryCounty?: User['primaryCounty'];
    organizationName?: string;
  }): Promise<AuthSession> {
    logger.info('AUTH', `Registration initiated for ${params.email} as [${params.primaryRole}]`);
    
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            fullName: params.fullName,
            primaryRole: params.primaryRole
          }
        }
      });
      if (error) {
        throw new Error(error.message || 'Registration failed.');
      }
      if (data.user) {
        const { user, session } = await db.registerUser(params);
        let activeOrg: Organization | null = null;
        if (params.organizationName) {
          const memberships = db.getMembershipsByUserId(user.id);
          if (memberships.length > 0) {
            activeOrg = db.getOrganizationById(memberships[0].organizationId);
          }
        }
        this.currentSession = {
          user,
          activeRole: user.primaryRole || params.primaryRole,
          activeOrganization: activeOrg,
          token: session.token,
          isAuthenticated: true
        };
        storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
        return this.currentSession;
      }
    }

    const { user, session } = await db.registerUser(params);
    let activeOrg: Organization | null = null;
    if (params.organizationName) {
      const memberships = db.getMembershipsByUserId(user.id);
      if (memberships.length > 0) {
        activeOrg = db.getOrganizationById(memberships[0].organizationId);
      }
    }
    this.currentSession = {
      user,
      activeRole: user.primaryRole || params.primaryRole,
      activeOrganization: activeOrg,
      token: session.token,
      isAuthenticated: true
    };
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return this.currentSession;
  }

  // --- Login ---
  public async login(
    email: string,
    password: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthSession> {
    logger.info('AUTH', `Login attempt for ${email}`);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (!error && data.user) {
          let user = db.getUserByEmail(email);
          if (!user) {
            const reg = await db.registerUser({
              email,
              password,
              fullName: data.user.user_metadata?.fullName || email.split('@')[0],
              primaryRole: data.user.user_metadata?.primaryRole || 'job_seeker'
            });
            user = reg.user;
          }
          const session = db.createSession(user.id, metadata?.userAgent || 'Browser Client');
          let activeOrg: Organization | null = null;
          const memberships = db.getMembershipsByUserId(user.id);
          if (memberships.length > 0) {
            activeOrg = db.getOrganizationById(memberships[0].organizationId);
          }

          this.currentSession = {
            user,
            activeRole: user.primaryRole || 'job_seeker',
            activeOrganization: activeOrg,
            token: session.token,
            isAuthenticated: true
          };
          storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
          return this.currentSession;
        }
      } catch (supaErr) {
        logger.warn('AUTH', 'Supabase authentication unavailable, falling back to local credentials', supaErr);
      }
    }

    const { user, session } = await db.authenticateUser(email, password, metadata);
    let activeOrg: Organization | null = null;
    const memberships = db.getMembershipsByUserId(user.id);
    if (memberships.length > 0) {
      activeOrg = db.getOrganizationById(memberships[0].organizationId);
    }

    this.currentSession = {
      user,
      activeRole: user.primaryRole || 'job_seeker',
      activeOrganization: activeOrg,
      token: session.token,
      isAuthenticated: true
    };
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return this.currentSession;
  }

  // --- Logout ---
  public async logout(): Promise<void> {
    const supabase = getSupabaseClient();
    const token = this.currentSession?.token;

    // Synchronously clear local state to prevent any race conditions with getSession()
    this.currentSession = {
      user: null,
      activeRole: 'job_seeker',
      activeOrganization: null,
      token: null,
      isAuthenticated: false
    };
    storageAdapter.removeItem(SESSION_STORAGE_KEY);

    // Perform external and DB revocations asynchronously
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        logger.error('AUTH', 'Supabase signOut error during logout:', err);
      }
    }

    if (token) {
      try {
        db.revokeSession(token);
      } catch {
        // ignore
      }
    }

    logger.info('AUTH', 'User signed out successfully. Guest state active.');
  }

  // --- Password Recovery ---
  public async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/#reset-password'
      });
      return { success: true };
    }
    return await db.requestPasswordReset(email);
  }

  public async resetPassword(token: string, newPassword: string): Promise<User> {
    return await db.resetPassword(token, newPassword);
  }

  public verifyEmail(token: string): User | null {
    if (this.currentSession.user) {
      const verifiedUser = db.verifyEmail(this.currentSession.user.email);
      this.currentSession.user = verifiedUser;
      storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
      return verifiedUser;
    }
    return null;
  }

  public updateProfile(updates: Partial<UserProfile> & { fullName?: string; phoneNumber?: string }): void {
    if (!this.currentSession.user) return;
    const res = db.updateUserProfile(this.currentSession.user.id, updates, this.currentSession.user.id);
    if (res && res.user) {
      this.currentSession.user = res.user;
      storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    }
  }

  public completeOnboarding(capabilities: UserCapability[]): AuthSession {
    if (!this.currentSession.user) {
      throw new Error('Not authenticated');
    }
    const updated = db.completeOnboarding(this.currentSession.user.id, capabilities);
    this.currentSession.user = updated;
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    logger.info('AUTH', `User ${updated.email} completed onboarding with capabilities: ${capabilities.join(', ')}`);
    return this.currentSession;
  }

  public async changePassword(currentPass: string, newPass: string): Promise<void> {
    if (!this.currentSession.user) throw new Error('Not authenticated');
    await db.changePassword(this.currentSession.user.id, currentPass, newPass);
  }

  /**
   * switchRole() sets the active role focus / view preference for the CURRENT authenticated user.
   * STRICT MANDATE: switchRole() must NEVER authenticate as another user, nor grant platform_admin rights to non-admin users.
   */
  public switchRole(role: UserRole): AuthSession {
    if (role === 'platform_admin') {
      const u = this.currentSession.user;
      if (!u || (u.systemRole !== 'platform_admin' && u.primaryRole !== 'platform_admin')) {
        throw new ForbiddenError('Platform Administrator role cannot be assumed through frontend role selection.');
      }
    }
    this.currentSession.activeRole = role;
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    logger.info('AUTH', `Active role focus set to [${role}] (User: ${this.currentSession.user?.email || 'Guest'})`);
    return this.currentSession;
  }

  /**
   * Test-only helper to establish a session for a specific user ID during automated testing.
   * This is never invoked by production UI.
   */
  public loginAsUserForTest(userId: string): AuthSession {
    const targetUser = db.getUserById(userId);
    if (!targetUser) {
      throw new NotFoundError('User', userId);
    }
    const session = db.createSession(targetUser.id, 'Test Suite Session');
    let activeOrg: Organization | null = null;
    const memberships = db.getMembershipsByUserId(targetUser.id);
    if (memberships.length > 0) {
      activeOrg = db.getOrganizationById(memberships[0].organizationId);
    }

    this.currentSession = {
      user: targetUser,
      activeRole: targetUser.primaryRole || 'job_seeker',
      activeOrganization: activeOrg,
      token: session.token,
      isAuthenticated: true
    };
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return this.currentSession;
  }

  public loginAsRoleForTest(role: string): AuthSession {
    const users = db.getUsers();
    let target = users.find((u) => u.systemRole === role);
    if (!target) {
      target = users.find((u) => u.primaryRole === role);
    }
    if (!target && (role === 'investor_buyer' || role === 'buyer')) {
      target = users.find((u) => u.primaryRole === 'buyer' || u.capabilities?.includes('find_business'));
    }
    if (!target && (role === 'verification_officer' || role === 'verifier')) {
      target = users.find((u) => u.systemRole === 'verification_officer' || u.systemRole === 'verifier');
    }
    if (!target && role === 'platform_admin') {
      target = users.find((u) => u.systemRole === 'platform_admin');
    }
    if (!target) {
      throw new Error(`Test user with role [${role}] not found in seed.`);
    }
    return this.loginAsUserForTest(target.id);
  }

  public switchOrganization(orgId: string | null): AuthSession {
    if (!this.currentSession.user) {
      throw new UnauthorizedError('Cannot switch organization while unauthenticated.');
    }
    if (orgId === null) {
      this.currentSession.activeOrganization = null;
    } else {
      const org = db.getOrganizationById(orgId);
      if (!org) {
        throw new NotFoundError('Organization', orgId);
      }
      const memberships = db.getMembershipsByUserId(this.currentSession.user.id);
      const hasAccess = memberships.some((m) => m.organizationId === orgId && m.status === 'active');
      if (
        hasAccess ||
        this.currentSession.user.systemRole === 'platform_admin' ||
        this.currentSession.user.primaryRole === 'platform_admin'
      ) {
        this.currentSession.activeOrganization = org;
      } else {
        throw new ForbiddenError('Unauthorized organization workspace access.');
      }
    }
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return this.currentSession;
  }

  public getUserOrganizations(): Array<Organization & { membership: OrganizationMembership }> {
    if (!this.currentSession.user) return [];
    return db.getUserOrganizations(this.currentSession.user.id);
  }

  public getActiveMembership(): OrganizationMembership | null {
    if (!this.currentSession.user || !this.currentSession.activeOrganization) return null;
    return db.getUserMembership(this.currentSession.activeOrganization.id, this.currentSession.user.id);
  }

  public getAuthorizationContext(targetOrgId?: string): AuthorizationContext {
    const user = this.currentSession.user;
    const orgId = targetOrgId || this.currentSession.activeOrganization?.id;
    const activeOrg = orgId ? db.getOrganizationById(orgId) : this.currentSession.activeOrganization;
    const membership = user && activeOrg ? db.getUserMembership(activeOrg.id, user.id) : null;
    const subscription = activeOrg ? db.getOrganizationSubscription(activeOrg.id) : null;
    const capabilities = user ? (user.capabilities || []) : [];
    const platformRole = user ? (user.systemRole || 'user') : 'user';

    return {
      user,
      activeOrganization: activeOrg,
      membership,
      subscription,
      capabilities,
      platformRole
    };
  }

  // ==========================================
  // CENTRALIZED AUTHORIZATION FUNCTIONS
  // ==========================================

  public canViewOpportunity(opportunity: Opportunity): boolean {
    return canViewOpportunity(this.getAuthorizationContext(opportunity.organizationId), opportunity);
  }

  public canApply(opportunity: Opportunity): boolean {
    return canApply(this.getAuthorizationContext(opportunity.organizationId), opportunity);
  }

  public canCreateOpportunity(organizationId?: string): boolean {
    return canCreateOpportunity(this.getAuthorizationContext(organizationId), organizationId);
  }

  public canManageOpportunity(opportunity: Opportunity): boolean {
    return canManageOpportunity(this.getAuthorizationContext(opportunity.organizationId), opportunity);
  }

  public canManageOrganization(organizationId: string): boolean {
    return canManageOrganization(this.getAuthorizationContext(organizationId), organizationId);
  }

  public canInviteMember(organizationId: string): boolean {
    return canInviteMember(this.getAuthorizationContext(organizationId), organizationId);
  }

  public canViewCandidate(candidateOrApp: { applicantUserId?: string; userId?: string; organizationId?: string }): boolean {
    return canViewCandidate(this.getAuthorizationContext(candidateOrApp.organizationId), candidateOrApp);
  }

  public canManageSubscription(organizationId: string): boolean {
    return canManageSubscription(this.getAuthorizationContext(organizationId), organizationId);
  }

  public canModerate(): boolean {
    return canModerate(this.getAuthorizationContext());
  }

  public canVerify(): boolean {
    return canVerify(this.getAuthorizationContext());
  }

  public canAccessWorkspace(
    workspace: 'recruiter' | 'candidate' | 'verification' | 'admin' | 'billing' | 'businesses' | 'opportunities'
  ): WorkspaceAccessResult {
    return canAccessWorkspace(this.getAuthorizationContext(), workspace);
  }

  public can(action: RBACAction, resourceTenantId?: string, resourceOwnerUserId?: string): boolean {
    const context = this.getAuthorizationContext(resourceTenantId);
    return evaluatePermission(context, action, resourceTenantId, resourceOwnerUserId);
  }
}

export const authService = new AuthService();
