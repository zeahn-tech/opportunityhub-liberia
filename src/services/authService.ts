import {
  AccountStatus,
  Organization,
  OrganizationMembership,
  RBACAction,
  User,
  UserProfile,
  UserRole,
  UserSession
} from '../types';
import { db, SEED_USERS } from '../db/dbClient';
import { logger } from '../core/logging/logger';
import { storageAdapter } from '../db/storageAdapter';

export interface AuthSession {
  user: User;
  activeRole: UserRole;
  activeOrganization: Organization | null;
  token: string;
}

const SESSION_STORAGE_KEY = 'auth_session';

class AuthService {
  private currentSession: AuthSession;

  constructor() {
    this.currentSession = this.loadInitialSession();
  }

  private loadInitialSession(): AuthSession {
    const saved = storageAdapter.getItem<AuthSession>(SESSION_STORAGE_KEY);
    if (saved && saved.user && saved.token) {
      try {
        // Validate with DB session engine
        const { user } = db.validateSession(saved.token);
        saved.user = user;
        return saved;
      } catch {
        // Invalid or expired session in storage, reset to default
        storageAdapter.removeItem(SESSION_STORAGE_KEY);
      }
    }

    // Default to initial Job Seeker (Tamba Kollie)
    const defaultUser = db.getUserById('user-seeker-1') || SEED_USERS[0];
    const newSession = db.createSession(defaultUser.id, 'Browser Client');
    const initialSession: AuthSession = {
      user: defaultUser,
      activeRole: defaultUser.primaryRole || 'job_seeker',
      activeOrganization: null,
      token: newSession.token
    };
    storageAdapter.setItem(SESSION_STORAGE_KEY, initialSession);
    return initialSession;
  }

  public getSession(): AuthSession {
    return this.currentSession;
  }

  public getCurrentUser(): User {
    return this.currentSession.user;
  }

  public getActiveRole(): UserRole {
    return this.currentSession.activeRole;
  }

  public getActiveOrganization(): Organization | null {
    return this.currentSession.activeOrganization;
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
      token: session.token
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
    const { user, session } = await db.authenticateUser(email, password, metadata);

    // Determine primary or first available organization for this user
    let activeOrg: Organization | null = null;
    const memberships = db.getMembershipsByUserId(user.id);
    if (memberships.length > 0) {
      activeOrg = db.getOrganizationById(memberships[0].organizationId);
    }

    this.currentSession = {
      user,
      activeRole: user.primaryRole || 'job_seeker',
      activeOrganization: activeOrg,
      token: session.token
    };

    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return this.currentSession;
  }

  // --- Logout ---
  public logout(): void {
    if (this.currentSession?.token) {
      db.revokeSession(this.currentSession.token);
    }

    // Default back to seeker guest
    const defaultUser = db.getUserById('user-seeker-1') || SEED_USERS[0];
    const newSession = db.createSession(defaultUser.id, 'Guest Fallback');

    this.currentSession = {
      user: defaultUser,
      activeRole: 'job_seeker',
      activeOrganization: null,
      token: newSession.token
    };

    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    logger.info('AUTH', 'User signed out successfully.');
  }

  // --- Password Recovery ---
  public async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    return await db.requestPasswordReset(email);
  }

  public async resetPassword(token: string, newPassword: string): Promise<User> {
    const updatedUser = await db.resetPassword(token, newPassword);
    return updatedUser;
  }

  // --- Email Verification ---
  public verifyEmail(token: string): User {
    const verifiedUser = db.verifyEmail(token);
    if (this.currentSession.user.id === verifiedUser.id) {
      this.currentSession.user = verifiedUser;
      storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    }
    return verifiedUser;
  }

  // --- Profile Management ---
  public getUserProfile(userId?: string): UserProfile | null {
    const targetId = userId || this.currentSession.user.id;
    return db.getUserProfile(targetId);
  }

  public updateProfile(
    updates: Partial<UserProfile> & { fullName?: string; phoneNumber?: string }
  ): { user: User; profile: UserProfile } {
    const res = db.updateUserProfile(this.currentSession.user.id, updates, this.currentSession.user.id);
    this.currentSession.user = res.user;
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    return res;
  }

  public async changePassword(currentPass: string, newPass: string): Promise<boolean> {
    return await db.changePassword(this.currentSession.user.id, currentPass, newPass);
  }

  // --- User Active Sessions ---
  public getUserSessions(): UserSession[] {
    return db.getSessions().filter((s) => s.userId === this.currentSession.user.id && s.isValid);
  }

  public revokeOtherSessions(): number {
    return db.revokeAllUserSessions(this.currentSession.user.id, this.currentSession.token);
  }

  // --- Role & Organization Switching ---
  public switchRole(role: UserRole): AuthSession {
    let targetUser = this.currentSession.user;
    let targetOrg: Organization | null = null;

    // Switch to appropriate persona profile from database
    switch (role) {
      case 'job_seeker':
        targetUser = db.getUserById('user-seeker-1') || targetUser;
        targetOrg = null;
        break;
      case 'employer':
        targetUser = db.getUserById('user-employer-1') || targetUser;
        targetOrg = db.getOrganizationById('org-save-children');
        break;
      case 'recruiter':
        targetUser = db.getUserById('user-recruiter-1') || targetUser;
        targetOrg = db.getOrganizationById('org-nimba-agri');
        break;
      case 'business_seller':
        targetUser = db.getUserById('user-seller-1') || targetUser;
        targetOrg = db.getOrganizationById('org-monrovia-brew');
        break;
      case 'buyer':
      case 'investor_buyer':
        targetUser = db.getUserById('user-buyer-1') || targetUser;
        targetOrg = null;
        break;
      case 'service_provider':
        targetUser = db.getUserById('user-provider-1') || targetUser;
        targetOrg = db.getOrganizationById('org-kofa-tech');
        break;
      case 'organization_admin':
        targetUser = db.getUserById('user-orgadmin-1') || targetUser;
        targetOrg = db.getOrganizationById('org-save-children');
        break;
      case 'platform_admin':
        targetUser = db.getUserById('user-admin-1') || targetUser;
        targetOrg = null;
        break;
      case 'verification_officer':
        targetUser = db.getUserById('user-gov-1') || targetUser;
        targetOrg = db.getOrganizationById('org-mpw-gov');
        break;
      default:
        break;
    }

    const newDbSession = db.createSession(targetUser.id, `Role Switch to ${role}`);

    this.currentSession = {
      user: targetUser,
      activeRole: role,
      activeOrganization: targetOrg,
      token: newDbSession.token
    };

    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    logger.info('AUTH', `Active persona switched to [${role.toUpperCase()}] for user ${targetUser.fullName}`);
    return this.currentSession;
  }

  public switchOrganization(organizationId: string | null): AuthSession {
    const org = organizationId ? db.getOrganizationById(organizationId) : null;
    this.currentSession = {
      ...this.currentSession,
      activeOrganization: org
    };
    storageAdapter.setItem(SESSION_STORAGE_KEY, this.currentSession);
    logger.info('AUTH', `Active organization switched to ${org ? org.name : 'Personal'}`);
    return this.currentSession;
  }

  public getMemberships(): OrganizationMembership[] {
    return db.getMembershipsByUserId(this.currentSession.user.id);
  }

  // --- Server-Aligned RBAC Authorization Evaluator ---
  public can(action: RBACAction, resourceTenantId?: string): boolean {
    const { user, activeRole, activeOrganization } = this.currentSession;

    // Platform Administrator has global system override
    if (activeRole === 'platform_admin' || user.systemRole === 'platform_admin') {
      return true;
    }

    // Delegate directly to DB-side permission verification
    const tenantToTest = resourceTenantId || activeOrganization?.id;
    return db.canUserPerform(user.id, action, tenantToTest);
  }
}

export const authService = new AuthService();
