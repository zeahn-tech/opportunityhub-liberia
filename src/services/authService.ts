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
  /**
   * True only for the opt-in local "demo mode" path (VITE_ENABLE_DEMO_MODE=true).
   * Every real-user session (Supabase Auth) is false here. The UI uses this flag
   * to render a persistent "Demo Mode" banner so a demo session can never be
   * mistaken for a real account -- see components/auth/DemoModeBanner.tsx.
   */
  isDemoMode: boolean;
}

const SESSION_STORAGE_KEY = 'auth_session';

/**
 * Default capability set for a freshly-created user, mirrored from
 * dbClient.registerUser's own default so demo-mode and real-Supabase users
 * get the same starting capability regardless of which path created them.
 */
function defaultCapabilityForRole(role: UserRole): UserCapability {
  switch (role) {
    case 'employer':
      return 'hire_or_recruit';
    case 'business_seller':
      return 'sell_business';
    case 'buyer':
      return 'find_business';
    case 'service_provider':
      return 'offer_services';
    default:
      return 'find_opportunities';
  }
}

function defaultPreferences(): User['preferences'] {
  return {
    emailNotifications: true,
    smsNotifications: false,
    marketingAlerts: true,
    profileVisibility: 'public',
    showPhoneNumber: false
  };
}

function emptySession(): AuthSession {
  return {
    user: null,
    activeRole: 'job_seeker',
    activeOrganization: null,
    token: null,
    isAuthenticated: false,
    isDemoMode: false
  };
}

class AuthService {
  private currentSession: AuthSession;

  constructor() {
    this.currentSession = this.loadInitialSession();
  }

  private loadInitialSession(): AuthSession {
    const saved = storageAdapter.getItem<AuthSession>(SESSION_STORAGE_KEY);
    if (saved && saved.user && saved.token && saved.isAuthenticated) {
      // Real (non-demo) sessions get re-verified against the live Supabase
      // session on startup via restoreSupabaseSession() -- see AuthContext's
      // mount effect. This cached value is only an optimistic first paint.
      return { ...saved, isDemoMode: !!saved.isDemoMode };
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
        isAuthenticated: true,
        isDemoMode: true
      };
    }

    return emptySession();
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

  /**
   * Builds (or reconciles) the app-level User for a Supabase-authenticated
   * identity. public.users (populated by the on_auth_user_created trigger --
   * see supabase/migrations/20260908120000_sync_auth_users_to_public_users.sql)
   * is the source of truth for role/county/name/verification. capabilities,
   * preferences, and onboardingCompleted are not yet columns on public.users
   * (that's Phase 3), so those are merged in from the local dbClient profile
   * cache when present, defaulting sensibly otherwise. No password or
   * credential material is read, written, or compared here.
   */
  private async hydrateSessionFromSupabase(
    supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, any> },
    supabaseSession: { access_token: string; expires_at?: number } | null
  ): Promise<AuthSession> {
    const supabase = getSupabaseClient();
    let row: any = null;

    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', supabaseUser.id).maybeSingle();
      if (error) {
        logger.warn('AUTH', 'Could not read public.users profile row after Supabase auth', { error: error.message });
      } else {
        row = data;
      }
    }

    const meta = supabaseUser.user_metadata || {};
    const localProfile = db.getUserProfile(supabaseUser.id);
    const primaryRole: UserRole = (row?.primary_role || meta.primaryRole || 'job_seeker') as UserRole;

    const user: User = {
      id: supabaseUser.id,
      email: row?.email || supabaseUser.email || '',
      fullName: row?.full_name || meta.fullName || (supabaseUser.email || '').split('@')[0],
      phoneNumber: row?.phone_number || meta.phoneNumber || '',
      primaryRole,
      systemRole: (row?.system_role || 'user') as User['systemRole'],
      accountStatus: (row?.account_status || 'pending_verification') as AccountStatus,
      avatarUrl: row?.avatar_url || undefined,
      primaryCounty: (row?.primary_county || meta.primaryCounty || 'Montserrado') as User['primaryCounty'],
      isEmailVerified: row ? !!row.is_email_verified : false,
      isPhoneVerified: row ? !!row.is_phone_verified : false,
      createdAt: row?.created_at || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      capabilities: localProfile?.capabilities || [defaultCapabilityForRole(primaryRole)],
      onboardingCompleted: localProfile ? localProfile.capabilities.length > 0 : false,
      preferences: defaultPreferences()
    };

    // Keep the local dbClient-backed caches (profile, session list shown in
    // "active sessions" UI) populated so the rest of the app -- which still
    // reads through dbClient this phase -- has something to render. This is
    // a read-model sync, not an authentication mechanism: no password is
    // stored or checked here.
    if (!db.getUserById(user.id)) {
      db.upsertUserFromExternalIdentity(user);
    }
    if (!localProfile) {
      db.upsertUserProfileFromExternalIdentity(user);
    }

    let activeOrg: Organization | null = null;
    const memberships = db.getMembershipsByUserId(user.id);
    if (memberships.length > 0) {
      activeOrg = db.getOrganizationById(memberships[0].organizationId);
    }

    const session: AuthSession = {
      user,
      activeRole: user.primaryRole || 'job_seeker',
      activeOrganization: activeOrg,
      token: supabaseSession?.access_token || null,
      isAuthenticated: !!supabaseSession?.access_token,
      isDemoMode: false
    };

    this.currentSession = session;
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return this.currentSession;
  }

  /**
   * Re-checks the real Supabase session on app load. The optimistic
   * localStorage-cached session from loadInitialSession() is only a first
   * paint; this is the actual source of truth for "am I still logged in".
   * A stale local cache claiming a real (non-demo) session with no matching
   * live Supabase session is cleared rather than trusted.
   */
  public async restoreSupabaseSession(): Promise<AuthSession> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.currentSession;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logger.warn('AUTH', 'Failed to restore Supabase session', { error: error.message });
    }
    if (data?.session?.user) {
      return await this.hydrateSessionFromSupabase(data.session.user, data.session);
    }

    if (this.currentSession.isAuthenticated && !this.currentSession.isDemoMode) {
      this.currentSession = emptySession();
      storageAdapter.removeItem(SESSION_STORAGE_KEY);
    }
    return this.currentSession;
  }

  /**
   * Subscribes to Supabase's own auth state changes (token refresh,
   * expiry, sign-out from another tab). Returns an unsubscribe function.
   * No-op when Supabase is not configured.
   */
  public onAuthStateChange(callback: (session: AuthSession) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, supaSession) => {
      if (supaSession?.user) {
        const updated = await this.hydrateSessionFromSupabase(supaSession.user, supaSession);
        callback(updated);
      } else if (!this.currentSession.isDemoMode) {
        this.currentSession = emptySession();
        storageAdapter.removeItem(SESSION_STORAGE_KEY);
        callback(this.currentSession);
      }
    });

    return () => sub.subscription.unsubscribe();
  }

  private assertAuthAvailable(): void {
    if (!envConfig.enableDemoMode) {
      throw new Error(
        'Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real accounts, ' +
          'or set VITE_ENABLE_DEMO_MODE=true for local development only.'
      );
    }
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
      // Supabase Auth is the ONLY place a real password is ever hashed or
      // stored. We never call src/core/security/crypto.ts's hashPassword
      // for this path, and we never fall back to a local credential store
      // on error -- any failure here is surfaced to the caller as-is.
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            fullName: params.fullName,
            primaryRole: params.primaryRole,
            phoneNumber: params.phoneNumber,
            primaryCounty: params.primaryCounty
          }
        }
      });
      if (error) {
        throw new Error(error.message || 'Registration failed.');
      }
      if (!data.user) {
        throw new Error('Registration did not return a user. Please try again.');
      }

      if (params.organizationName) {
        // Org creation still lives in dbClient this phase; wire it to the
        // real Supabase user id rather than a locally-generated one.
        db.createOrganization(
          {
            name: params.organizationName,
            slug: params.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            type: 'private_company',
            industry: 'General Commerce',
            county: params.primaryCounty || 'Montserrado',
            cityDistrict: 'Monrovia',
            logoText: params.organizationName.substring(0, 2).toUpperCase(),
            description: `${params.organizationName} - Registered enterprise.`,
            isVerified: false,
            verificationStatus: 'unverified'
          },
          data.user.id
        );
      }

      // data.session is null when Supabase requires email confirmation
      // before issuing a session -- the caller still gets a populated
      // user record (e.g. to show a "check your email" screen), but
      // isAuthenticated will correctly be false until they confirm.
      return await this.hydrateSessionFromSupabase(data.user, data.session);
    }

    this.assertAuthAvailable();
    return this.registerDemo(params);
  }

  private async registerDemo(params: {
    email: string;
    password: string;
    fullName: string;
    primaryRole: UserRole;
    phoneNumber?: string;
    primaryCounty?: User['primaryCounty'];
    organizationName?: string;
  }): Promise<AuthSession> {
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
      isAuthenticated: true,
      isDemoMode: true
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // No silent fallback to local credentials. Supabase's error
        // (invalid credentials, network failure, etc.) is the real answer.
        throw new UnauthorizedError(error.message || 'Invalid email or password.');
      }
      if (!data.user || !data.session) {
        throw new UnauthorizedError('Login did not return a valid session. Please try again.');
      }
      return await this.hydrateSessionFromSupabase(data.user, data.session);
    }

    this.assertAuthAvailable();
    return this.loginDemo(email, password, metadata);
  }

  private async loginDemo(
    email: string,
    password: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthSession> {
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
      isAuthenticated: true,
      isDemoMode: true
    };
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return this.currentSession;
  }

  // --- Logout ---
  public async logout(): Promise<void> {
    const supabase = getSupabaseClient();
    const wasDemo = this.currentSession.isDemoMode;
    const token = this.currentSession?.token;

    // Synchronously clear local state to prevent any race conditions with getSession()
    this.currentSession = emptySession();
    storageAdapter.removeItem(SESSION_STORAGE_KEY);

    if (supabase && !wasDemo) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Local session is already cleared, so the user is signed out of
        // this device either way -- but this is not silently swallowed:
        // it's logged so a real revocation failure is visible.
        logger.error('AUTH', 'Supabase signOut error during logout:', { error: error.message });
      }
    }

    if (wasDemo && token) {
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
      const redirectTo = typeof window !== 'undefined' ? window.location.origin + '/#reset-password' : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
      if (error) {
        throw new Error(error.message || 'Unable to send password reset email.');
      }
      return { success: true };
    }

    this.assertAuthAvailable();
    return await db.requestPasswordReset(email);
  }

  public async resetPassword(token: string, newPassword: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      // In the real flow the recovery link Supabase emails the user already
      // establishes a recovery session client-side (detectSessionInUrl), so
      // the actual "token" here is that active session, not a local
      // dbClient-issued string -- updateUser() operates on it directly.
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw new Error(error.message || 'Failed to reset password.');
      }
      if (data.user) {
        const { data: sessionData } = await supabase.auth.getSession();
        await this.hydrateSessionFromSupabase(data.user, sessionData?.session || null);
        return this.currentSession.user;
      }
      return null;
    }

    this.assertAuthAvailable();
    return await db.resetPassword(token, newPassword);
  }

  public async verifyEmail(token: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' });
      if (error) {
        throw new Error(error.message || 'Email verification failed.');
      }
      if (data.user) {
        const updated = await this.hydrateSessionFromSupabase(data.user, data.session || null);
        return updated.user;
      }
      return null;
    }

    if (envConfig.enableDemoMode && this.currentSession.user) {
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

    const supabase = getSupabaseClient();
    if (supabase && !this.currentSession.isDemoMode) {
      // Re-authenticate with the current password first (Supabase's
      // updateUser() does not itself require the current password), so a
      // hijacked active session can't silently change the password.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: this.currentSession.user.email,
        password: currentPass
      });
      if (reauthError) {
        throw new UnauthorizedError('Current password is incorrect.');
      }
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        throw new Error(error.message || 'Failed to update password.');
      }
      return;
    }

    this.assertAuthAvailable();
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
      isAuthenticated: true,
      isDemoMode: true
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
