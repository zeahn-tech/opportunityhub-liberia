import {
  AccountRestriction,
  AccountStatus,
  Application,
  ApplicationStage,
  ApplicationStatusLog,
  AppNotification,
  AuditLog,
  BusinessAccessRequest,
  BusinessInquiry,
  BusinessListing,
  CandidateProfile,
  ContentModerationRecord,
  ContentReport,
  Conversation,
  County,
  DirectMessage,
  InterviewScheduleDetails,
  MessageReport,
  Opportunity,
  Organization,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationSettings,
  OrganizationSubscription,
  OrganizationType,
  OrgPermission,
  OrgRole,
  RBACAction,
  SuspiciousActivityEvent,
  User,
  UserAuthCredential,
  UserBlock,
  UserCapability,
  UserPreferences,
  UserProfile,
  UserRole,
  UserSession,
  VerificationAudit,
  VerificationBadge,
  VerificationRequest,
  VerificationStatus
} from '../types';
import { storageAdapter } from './storageAdapter';
import { logger } from '../core/logging/logger';
import {
  ForbiddenError,
  NotFoundError,
  TenantIsolationError,
  UnauthorizedError,
  ValidationError
} from '../core/errors/AppError';
import {
  generateSalt,
  generateToken,
  hashPassword,
  validatePasswordPolicy,
  verifyPassword
} from '../core/security/crypto';
import {
  INITIAL_ACCOUNT_RESTRICTIONS,
  INITIAL_APPLICATIONS,
  INITIAL_BUSINESS_LISTINGS,
  INITIAL_CANDIDATE_PROFILES,
  INITIAL_CONTENT_MODERATION_RECORDS,
  INITIAL_CONTENT_REPORTS,
  INITIAL_OPPORTUNITIES,
  INITIAL_ORGANIZATIONS,
  INITIAL_SUSPICIOUS_EVENTS,
  INITIAL_VERIFICATION_AUDITS,
  INITIAL_VERIFICATION_REQUESTS
} from '../data/seedData';

// Known seed salt & hash for "Password123!" for immediate test/demo access
const SEED_SALT = 'e9f4c3a1782d059b8412acb9';
// SHA-256 hash of "e9f4c3a1782d059b8412acb9:Password123!:liberia-opphub-sec-v1"
const SEED_PASSWORD_HASH = '1f98d02df910080dafa46c4f0da9c417637841c6d3fa316d3f2ec45811776997';

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  smsNotifications: true,
  marketingAlerts: false,
  profileVisibility: 'public',
  showPhoneNumber: true
};

export const SEED_USERS: User[] = [
  {
    id: 'user-seeker-1',
    email: 'tamba.kollie@gmail.com',
    fullName: 'Tamba Kollie',
    phoneNumber: '+231 77 554 9912',
    primaryRole: 'job_seeker',
    systemRole: 'user',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-15T09:00:00Z',
    lastLoginAt: '2026-09-04T10:00:00Z',
    capabilities: ['find_opportunities'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-employer-1',
    email: 'hiring@savethechildren.lr',
    fullName: 'Dr. Evelyn Fahnbulleh',
    phoneNumber: '+231 88 123 4400',
    primaryRole: 'employer',
    systemRole: 'user',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-10T11:30:00Z',
    lastLoginAt: '2026-09-05T08:00:00Z',
    capabilities: ['hire_or_recruit'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-recruiter-1',
    email: 'agency@liberiaworkforce.com',
    fullName: 'Korto Flomo',
    phoneNumber: '+231 88 776 1122',
    primaryRole: 'recruiter',
    systemRole: 'user',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-20T14:15:00Z',
    lastLoginAt: '2026-09-03T16:00:00Z',
    capabilities: ['hire_or_recruit'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-seller-1',
    email: 'seller@pepperbird.lr',
    fullName: 'Samuel Tweh',
    phoneNumber: '+231 77 334 9012',
    primaryRole: 'business_seller',
    systemRole: 'user',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-22T10:00:00Z',
    capabilities: ['sell_business'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-buyer-1',
    email: 'investor@capitolhill.lr',
    fullName: 'Nathaniel Sherman',
    phoneNumber: '+231 77 889 0099',
    primaryRole: 'buyer',
    systemRole: 'user',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-25T16:00:00Z',
    capabilities: ['find_business'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-provider-1',
    email: 'patrick@gantacivil.lr',
    fullName: 'Eng. Patrick Sumo',
    phoneNumber: '+231 88 612 0041',
    primaryRole: 'service_provider',
    systemRole: 'user',
    accountStatus: 'active',
    primaryCounty: 'Nimba',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-28T12:00:00Z',
    capabilities: ['offer_services', 'find_opportunities'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-orgadmin-1',
    email: 'admin@savethechildren.lr',
    fullName: 'Madam Marie Weah',
    phoneNumber: '+231 77 444 8888',
    primaryRole: 'organization_admin',
    systemRole: 'user',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-01T08:00:00Z',
    capabilities: ['hire_or_recruit'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-admin-1',
    email: 'info.tracenetlib@gmail.com',
    fullName: 'Platform Administrator',
    phoneNumber: '+231 77 000 1111',
    primaryRole: 'platform_admin',
    systemRole: 'platform_admin',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-07-01T00:00:00Z',
    capabilities: ['find_opportunities', 'hire_or_recruit', 'sell_business', 'find_business', 'offer_services'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  },
  {
    id: 'user-gov-1',
    email: 'procurement@mpw.gov.lr',
    fullName: 'Hon. Emmanuel Sumo',
    phoneNumber: '+231 77 004 8812',
    primaryRole: 'organization_admin',
    systemRole: 'verification_officer',
    accountStatus: 'active',
    primaryCounty: 'Montserrado',
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: '2026-08-01T08:00:00Z',
    capabilities: ['hire_or_recruit'],
    onboardingCompleted: true,
    preferences: DEFAULT_USER_PREFERENCES
  }
];

export const SEED_MEMBERSHIPS: OrganizationMembership[] = [
  {
    id: 'mem-1',
    organizationId: 'org-save-children',
    userId: 'user-employer-1',
    orgRole: 'owner',
    status: 'active',
    permissions: ['all'],
    createdAt: '2026-08-10T11:30:00Z'
  },
  {
    id: 'mem-2',
    organizationId: 'org-save-children',
    userId: 'user-orgadmin-1',
    orgRole: 'admin',
    status: 'active',
    permissions: ['manage_members', 'manage_jobs', 'review_candidates'],
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'mem-3',
    organizationId: 'org-mpw-gov',
    userId: 'user-gov-1',
    orgRole: 'admin',
    status: 'active',
    permissions: ['all'],
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'mem-4',
    organizationId: 'org-nimba-agri',
    userId: 'user-recruiter-1',
    orgRole: 'recruiter',
    status: 'active',
    permissions: ['manage_jobs', 'review_candidates'],
    createdAt: '2026-08-20T14:15:00Z'
  },
  {
    id: 'mem-5',
    organizationId: 'org-kofa-tech',
    userId: 'user-provider-1',
    orgRole: 'owner',
    status: 'active',
    permissions: ['all'],
    createdAt: '2026-08-28T12:00:00Z'
  }
];

export class DatabaseClient {
  private static instance: DatabaseClient;
  private initialized = false;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public ensureInitialized(): void {
    if (this.initialized) return;

    const orgs = storageAdapter.getItem<Organization[]>('organizations');
    if (!orgs || orgs.length === 0) {
      logger.info('DBClient', 'Bootstrapping relational seed datasets into storage adapter.');
      storageAdapter.setItem('organizations', INITIAL_ORGANIZATIONS);
      storageAdapter.setItem('opportunities', INITIAL_OPPORTUNITIES);
      storageAdapter.setItem('businesses', INITIAL_BUSINESS_LISTINGS);
      storageAdapter.setItem('audits', INITIAL_VERIFICATION_AUDITS);
      storageAdapter.setItem('users', SEED_USERS);
      storageAdapter.setItem('memberships', SEED_MEMBERSHIPS);
      storageAdapter.setItem('applications', INITIAL_APPLICATIONS);
      storageAdapter.setItem('candidate_profiles', INITIAL_CANDIDATE_PROFILES);
      storageAdapter.setItem('access_requests', []);
      storageAdapter.setItem('audit_logs', []);
      storageAdapter.setItem('sessions', []);
      storageAdapter.setItem('invitations', []);
      storageAdapter.setItem('verification_requests', INITIAL_VERIFICATION_REQUESTS);
      storageAdapter.setItem('content_moderation_records', INITIAL_CONTENT_MODERATION_RECORDS);
      storageAdapter.setItem('content_reports', INITIAL_CONTENT_REPORTS);
      storageAdapter.setItem('account_restrictions', INITIAL_ACCOUNT_RESTRICTIONS);
      storageAdapter.setItem('suspicious_events', INITIAL_SUSPICIOUS_EVENTS);

      // Seed Conversations, Messages, Blocks, Reports, Notifications
      const INITIAL_CONVERSATIONS: Conversation[] = [
        {
          id: 'conv-1',
          category: 'candidate_recruiter',
          title: 'Application Inquiry: Senior Logistics & Supply Chain Manager',
          participants: [
            {
              userId: 'user-seeker-1',
              name: 'Tamba Kollie',
              email: 'tamba.kollie@gmail.com',
              role: 'job_seeker'
            },
            {
              userId: 'user-employer-1',
              name: 'Dr. Evelyn Fahnbulleh',
              email: 'hiring@savethechildren.lr',
              role: 'employer',
              organizationId: 'org-save-children',
              organizationName: 'Save the Children Liberia'
            }
          ],
          contextId: 'opp-1',
          contextType: 'opportunity',
          lastMessage: 'Thank you for shortlisting my application! I look forward to the interview.',
          lastMessageAt: '2026-09-04T14:30:00Z',
          lastSenderId: 'user-seeker-1',
          unreadCountByUserId: {
            'user-employer-1': 1,
            'user-seeker-1': 0
          },
          createdAt: '2026-09-03T10:00:00Z',
          updatedAt: '2026-09-04T14:30:00Z'
        },
        {
          id: 'conv-2',
          category: 'buyer_seller',
          title: 'M&A Inquiry: Pepperbird Supermarket & Cold Storage Chain',
          participants: [
            {
              userId: 'user-buyer-1',
              name: 'Nathaniel Sherman',
              email: 'nathaniel.sherman@capitolhillcapital.lr',
              role: 'buyer',
              organizationName: 'Capitol Hill Capital'
            },
            {
              userId: 'user-seller-1',
              name: 'Samuel Tweh',
              email: 'samuel.tweh@pepperbird.lr',
              role: 'business_seller',
              organizationName: 'Pepperbird Supermarket Ltd'
            }
          ],
          contextId: 'biz-1',
          contextType: 'business_listing',
          lastMessage: 'We have submitted proof of funds and reviewed the 2025 financial disclosures.',
          lastMessageAt: '2026-09-05T09:15:00Z',
          lastSenderId: 'user-buyer-1',
          unreadCountByUserId: {
            'user-seller-1': 1,
            'user-buyer-1': 0
          },
          createdAt: '2026-09-02T11:00:00Z',
          updatedAt: '2026-09-05T09:15:00Z'
        }
      ];

      const INITIAL_MESSAGES: DirectMessage[] = [
        {
          id: 'msg-101',
          conversationId: 'conv-1',
          senderId: 'user-employer-1',
          senderName: 'Dr. Evelyn Fahnbulleh',
          senderRole: 'employer',
          recipientId: 'user-seeker-1',
          body: 'Hello Tamba, we reviewed your supply chain management experience at Monrovia Breweries and have shortlisted your candidate application for an interview.',
          isRead: true,
          readAt: '2026-09-04T12:00:00Z',
          createdAt: '2026-09-04T11:00:00Z'
        },
        {
          id: 'msg-102',
          conversationId: 'conv-1',
          senderId: 'user-seeker-1',
          senderName: 'Tamba Kollie',
          senderRole: 'job_seeker',
          recipientId: 'user-employer-1',
          body: 'Thank you for shortlisting my application! I look forward to the interview.',
          isRead: false,
          createdAt: '2026-09-04T14:30:00Z'
        },
        {
          id: 'msg-201',
          conversationId: 'conv-2',
          senderId: 'user-seller-1',
          senderName: 'Samuel Tweh',
          senderRole: 'business_seller',
          recipientId: 'user-buyer-1',
          body: 'Welcome to the Pepperbird Data Room. Your NDA access request has been approved.',
          isRead: true,
          readAt: '2026-09-03T15:00:00Z',
          createdAt: '2026-09-03T14:00:00Z'
        },
        {
          id: 'msg-202',
          conversationId: 'conv-2',
          senderId: 'user-buyer-1',
          senderName: 'Nathaniel Sherman',
          senderRole: 'buyer',
          recipientId: 'user-seller-1',
          body: 'We have submitted proof of funds and reviewed the 2025 financial disclosures.',
          isRead: false,
          createdAt: '2026-09-05T09:15:00Z'
        }
      ];

      const INITIAL_NOTIFICATIONS: AppNotification[] = [
        {
          id: 'notif-1',
          recipientUserId: 'user-seeker-1',
          category: 'application_update',
          title: 'Application Shortlisted',
          message: 'Your application for Senior Logistics & Supply Chain Manager at Save the Children Liberia has been shortlisted.',
          actionUrl: '/candidate',
          contextId: 'app-seed-1',
          isRead: false,
          deliveryChannels: { inApp: true, emailSent: true },
          createdAt: '2026-09-04T11:00:00Z'
        },
        {
          id: 'notif-2',
          recipientUserId: 'user-seeker-1',
          category: 'interview_invitation',
          title: 'Interview Invitation Received',
          message: 'Save the Children Liberia invited you to an interview on Sept 8, 2026 at 10:00 AM.',
          actionUrl: '/candidate',
          contextId: 'app-seed-1',
          isRead: false,
          deliveryChannels: { inApp: true, emailSent: true, pushSmsSent: true },
          createdAt: '2026-09-04T11:30:00Z'
        },
        {
          id: 'notif-3',
          recipientUserId: 'user-employer-1',
          category: 'new_message',
          title: 'New Message from Candidate',
          message: 'Tamba Kollie sent a message regarding Senior Logistics & Supply Chain Manager.',
          actionUrl: '/recruiter',
          contextId: 'conv-1',
          isRead: false,
          deliveryChannels: { inApp: true, emailSent: true },
          createdAt: '2026-09-04T14:30:00Z'
        },
        {
          id: 'notif-4',
          recipientUserId: 'user-seller-1',
          category: 'business_inquiry',
          title: 'New M&A Data Room Inquiry',
          message: 'Nathaniel Sherman (Capitol Hill Capital) sent an inquiry regarding Pepperbird Supermarket.',
          actionUrl: '/businesses',
          contextId: 'conv-2',
          isRead: false,
          deliveryChannels: { inApp: true, emailSent: true },
          createdAt: '2026-09-05T09:15:00Z'
        }
      ];

      storageAdapter.setItem('conversations', INITIAL_CONVERSATIONS);
      storageAdapter.setItem('direct_messages', INITIAL_MESSAGES);
      storageAdapter.setItem('notifications', INITIAL_NOTIFICATIONS);
      storageAdapter.setItem('user_blocks', []);
      storageAdapter.setItem('message_reports', []);

      // Seed Credentials for all default users (password: Password123!)
      const credentials: UserAuthCredential[] = SEED_USERS.map((u) => ({
        userId: u.id,
        passwordHash: u.id === 'user-admin-1' ? 'eb78c639b7ffc706d6fa88b5e355f25d11c19ab6a5f6f66009efb9a4152a2b92' : SEED_PASSWORD_HASH,
        salt: SEED_SALT,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        updatedAt: '2026-08-15T00:00:00Z'
      }));
      storageAdapter.setItem('credentials', credentials);

      // Seed Profiles
      const profiles: UserProfile[] = SEED_USERS.map((u) => ({
        userId: u.id,
        headline: `${u.primaryRole?.replace('_', ' ')?.toUpperCase() || 'PROFESSIONAL'} in ${u.primaryCounty}`,
        bio: `Verified professional on OpportunityHub Liberia.`,
        phone: u.phoneNumber,
        county: u.primaryCounty,
        city: 'Monrovia',
        skills: ['Leadership', 'Management', 'Operations'],
        visibility: 'public',
        updatedAt: '2026-08-15T00:00:00Z',
        capabilities: u.capabilities || ['find_opportunities'],
        verificationState: 'verified'
      }));
      storageAdapter.setItem('profiles', profiles);
    }

    const cProfs = storageAdapter.getItem<CandidateProfile[]>('candidate_profiles');
    if (!cProfs || cProfs.length === 0) {
      storageAdapter.setItem('candidate_profiles', INITIAL_CANDIDATE_PROFILES);
    }

    const apps = storageAdapter.getItem<Application[]>('applications');
    if (!apps || apps.length === 0) {
      storageAdapter.setItem('applications', INITIAL_APPLICATIONS);
    }

    this.initialized = true;
    logger.debug('DBClient', 'DatabaseClient initialized successfully.');
  }

  // --- Audit Log Emitter ---
  public emitAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const logs = storageAdapter.getItem<AuditLog[]>('audit_logs') || [];
    const newLog: AuditLog = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    if (logs.length > 250) logs.pop();
    storageAdapter.setItem('audit_logs', logs);
    logger.info('AUDIT', `${entry.action} on ${entry.targetEntity}:${entry.targetId}`, entry.details);
    return newLog;
  }

  public getAuditLogs(): AuditLog[] {
    return storageAdapter.getItem<AuditLog[]>('audit_logs') || [];
  }

  // ==========================================
  // SERVER/DATABASE-SIDE AUTHORIZATION ENGINE
  // "Never trust frontend authorization"
  // ==========================================
  public canUserPerform(
    userId: string,
    action: RBACAction,
    resourceTenantId?: string,
    resourceOwnerUserId?: string
  ): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;

    // Accounts not active cannot mutate state
    if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
      return false;
    }

    // Platform administrator override
    if (user.systemRole === 'platform_admin' || user.primaryRole === 'platform_admin') {
      return true;
    }

    const role = user.primaryRole || 'job_seeker';
    const memberships = this.getMembershipsByUserId(userId);
    const userOrgIds = new Set(memberships.map((m) => m.organizationId));

    switch (action) {
      case 'opportunity.browse':
      case 'business.browse':
        return true;

      case 'opportunity.apply':
        return role === 'job_seeker' || role === 'service_provider';

      case 'proposal.submit':
        return role === 'service_provider' || role === 'job_seeker';

      case 'opportunity.create':
        if (role === 'employer' || role === 'recruiter' || role === 'organization_admin') {
          if (resourceTenantId) return userOrgIds.has(resourceTenantId);
          return true;
        }
        return false;

      case 'opportunity.edit':
      case 'opportunity.delete':
        if (role === 'employer' || role === 'recruiter' || role === 'organization_admin') {
          if (resourceTenantId) return userOrgIds.has(resourceTenantId);
          return true;
        }
        return false;

      case 'application.review':
      case 'application.advance_stage':
        if (role === 'employer' || role === 'recruiter' || role === 'organization_admin') {
          if (resourceTenantId) return userOrgIds.has(resourceTenantId);
          return true;
        }
        return false;

      case 'application.withdraw':
        if (resourceOwnerUserId) return resourceOwnerUserId === userId;
        return true;

      case 'candidate.view_profile':
        return true;

      case 'candidate.edit_profile':
        if (resourceOwnerUserId) return resourceOwnerUserId === userId;
        return true;

      case 'business.list':
        return role === 'business_seller';

      case 'business.edit':
      case 'business.approve_access':
        if (resourceOwnerUserId) return resourceOwnerUserId === userId || user.systemRole === 'moderator';
        return true;

      case 'business.request_nda':
        return true;

      case 'organization.create':
        return true;

      case 'organization.manage_members':
      case 'organization.edit_profile':
      case 'organization.edit_settings':
      case 'organization.invite_member':
      case 'organization.view_invitations': {
        if (!resourceTenantId) {
          return role === 'organization_admin' || role === 'employer';
        }
        const tenantMem = memberships.find(
          (m) => m.organizationId === resourceTenantId && m.status === 'active'
        );
        if (!tenantMem) return false;
        if (tenantMem.orgRole === 'owner' || tenantMem.orgRole === 'admin') return true;
        if (tenantMem.permissions.includes('all')) return true;
        if (action === 'organization.manage_members' && tenantMem.permissions.includes('members.manage')) return true;
        if (action === 'organization.edit_profile' && (tenantMem.permissions.includes('settings.edit') || tenantMem.permissions.includes('members.manage'))) return true;
        if (action === 'organization.edit_settings' && tenantMem.permissions.includes('settings.edit')) return true;
        if (
          (action === 'organization.invite_member' || action === 'organization.view_invitations') &&
          (tenantMem.permissions.includes('members.invite') || tenantMem.permissions.includes('members.manage'))
        ) {
          return true;
        }
        return false;
      }

      case 'verification.request':
        return role === 'employer' || role === 'recruiter' || role === 'organization_admin';

      case 'verification.decide':
        return user.systemRole === 'verifier' || user.systemRole === 'verification_officer';

      case 'user.manage_status':
      case 'audit.view_global':
      case 'platform.admin_access':
        // Handled by platform_admin override at top of function; denied to regular roles
        return false;

      default:
        return false;
    }
  }

  // ==========================================
  // AUTHENTICATION & USER MANAGEMENT (DB SIDE)
  // ==========================================

  public async registerUser(params: {
    email: string;
    password: string;
    fullName: string;
    primaryRole: UserRole;
    phoneNumber?: string;
    primaryCounty?: User['primaryCounty'];
    organizationName?: string;
  }): Promise<{ user: User; session: UserSession; token: string }> {
    const emailNorm = params.email.toLowerCase().trim();

    // Check duplicate email
    const existing = this.getUserByEmail(emailNorm);
    if (existing) {
      throw new ValidationError(`An account with email ${emailNorm} already exists.`);
    }

    // Validate password policy
    const policy = validatePasswordPolicy(params.password);
    if (!policy.valid) {
      throw new ValidationError(policy.message || 'Invalid password format.');
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const salt = generateSalt(16);
    const passwordHash = await hashPassword(params.password, salt);
    const verificationToken = generateToken('eml');

    // Create User record
    const newUser: User = {
      id: userId,
      email: emailNorm,
      fullName: params.fullName.trim(),
      phoneNumber: params.phoneNumber || '',
      primaryRole: params.primaryRole,
      systemRole: 'user',
      accountStatus: 'pending_verification',
      primaryCounty: params.primaryCounty || 'Montserrado',
      isEmailVerified: false,
      isPhoneVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      capabilities: [
        params.primaryRole === 'employer'
          ? 'hire_or_recruit'
          : params.primaryRole === 'business_seller'
          ? 'sell_business'
          : params.primaryRole === 'buyer'
          ? 'find_business'
          : params.primaryRole === 'service_provider'
          ? 'offer_services'
          : 'find_opportunities'
      ],
      onboardingCompleted: false,
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        marketingAlerts: true,
        profileVisibility: 'public',
        showPhoneNumber: false
      }
    };

    const users = this.getUsers();
    users.push(newUser);
    storageAdapter.setItem('users', users);

    // Save Credentials
    const creds = this.getCredentials();
    creds.push({
      userId,
      passwordHash,
      salt,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    });
    storageAdapter.setItem('credentials', creds);

    // If user provided an organization or enterprise name, create it
    if (params.organizationName) {
      this.createOrganization(
        {
          name: params.organizationName,
          slug: params.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          type: 'private_company',
          industry: 'General Commerce',
          county: newUser.primaryCounty,
          cityDistrict: 'Monrovia',
          logoText: params.organizationName.substring(0, 2).toUpperCase(),
          description: `${params.organizationName} - Registered enterprise.`,
          isVerified: false,
          verificationStatus: 'unverified'
        },
        newUser.id
      );
    }

    // Create default profile
    const profiles = this.getProfiles();
    profiles.push({
      userId,
      headline: `${newUser.primaryRole?.replace('_', ' ')?.toUpperCase() || 'PROFESSIONAL'} in ${newUser.primaryCounty}`,
      bio: 'New member of OpportunityHub Liberia.',
      phone: newUser.phoneNumber,
      county: newUser.primaryCounty,
      skills: [],
      visibility: 'public',
      updatedAt: new Date().toISOString(),
      capabilities: newUser.capabilities || ['find_opportunities'],
      verificationState: 'unverified'
    });
    storageAdapter.setItem('profiles', profiles);

    // Create active session
    const session = this.createSession(userId, 'Web Browser / Registration');

    this.emitAuditLog({
      actorUserId: userId,
      actorName: newUser.fullName,
      action: 'user.registered',
      targetEntity: 'user',
      targetId: userId,
      details: { email: emailNorm, role: newUser.primaryRole }
    });

    return { user: newUser, session, token: session.token };
  }

  public async authenticateUser(
    email: string,
    password: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: User; session: UserSession; token: string }> {
    const emailNorm = email.toLowerCase().trim();
    const user = this.getUserByEmail(emailNorm);

    if (!user) {
      this.emitAuditLog({
        actorUserId: 'anonymous',
        actorName: 'Anonymous Visitor',
        action: 'user.login_failed',
        targetEntity: 'user',
        targetId: 'unknown',
        details: { attemptedEmail: emailNorm, reason: 'Unrecognized email address' }
      });
      throw new UnauthorizedError('Invalid email or password.');
    }

    const creds = this.getCredentials();
    const userCred = creds.find((c) => c.userId === user.id);
    if (!userCred) {
      this.emitAuditLog({
        actorUserId: user.id,
        actorName: user.fullName,
        action: 'user.login_failed',
        targetEntity: 'user',
        targetId: user.id,
        details: { reason: 'No stored credentials' }
      });
      throw new UnauthorizedError('Authentication credentials not found for this account.');
    }

    // Check account lockout
    if (userCred.lockedUntil && new Date(userCred.lockedUntil) > new Date()) {
      const minutesRemaining = Math.ceil(
        (new Date(userCred.lockedUntil).getTime() - Date.now()) / (60 * 1000)
      );
      throw new UnauthorizedError(
        `Account is temporarily locked due to repeated failed logins. Please try again in ${minutesRemaining} minutes or reset your password.`
      );
    }

    // Check account status
    if (user.accountStatus === 'suspended') {
      throw new ForbiddenError(
        `Your account has been suspended: ${user.statusReason || 'Please contact platform support.'}`
      );
    }
    if (user.accountStatus === 'deactivated') {
      throw new ForbiddenError('This account has been deactivated.');
    }

    // Verify password
    let passwordMatches = false;
    if (userCred.passwordHash === SEED_PASSWORD_HASH && password === 'Password123!') {
      passwordMatches = true;
    } else {
      passwordMatches = await verifyPassword(password, userCred.salt, userCred.passwordHash);
    }

    if (!passwordMatches) {
      userCred.failedLoginAttempts += 1;
      this.emitAuditLog({
        actorUserId: user.id,
        actorName: user.fullName,
        action: 'user.login_failed',
        targetEntity: 'user',
        targetId: user.id,
        details: { attemptCount: userCred.failedLoginAttempts }
      });

      if (userCred.failedLoginAttempts >= 5) {
        userCred.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        this.emitAuditLog({
          actorUserId: user.id,
          actorName: user.fullName,
          action: 'user.account_locked',
          targetEntity: 'user',
          targetId: user.id,
          details: { reason: '5 failed login attempts' }
        });
        storageAdapter.setItem('credentials', creds);
        throw new UnauthorizedError(
          'Account is temporarily locked due to repeated failed logins. Please try again in 15 minutes or reset your password.'
        );
      }
      storageAdapter.setItem('credentials', creds);
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Successful login: reset failed counter
    userCred.failedLoginAttempts = 0;
    userCred.lockedUntil = null;
    userCred.updatedAt = new Date().toISOString();
    storageAdapter.setItem('credentials', creds);

    // Update user last login
    user.lastLoginAt = new Date().toISOString();
    const users = this.getUsers();
    const userIdx = users.findIndex((u) => u.id === user.id);
    if (userIdx >= 0) {
      users[userIdx] = user;
      storageAdapter.setItem('users', users);
    }

    const session = this.createSession(
      user.id,
      metadata?.userAgent || 'Standard Browser',
      metadata?.ipAddress || '127.0.0.1'
    );

    this.emitAuditLog({
      actorUserId: user.id,
      actorName: user.fullName,
      action: 'user.login_success',
      targetEntity: 'user',
      targetId: user.id
    });

    return { user, session, token: session.token };
  }

  // --- Session Management ---
  public getSessions(): UserSession[] {
    return storageAdapter.getItem<UserSession[]>('sessions') || [];
  }

  public createSession(userId: string, userAgent = 'Web', ipAddress = '127.0.0.1'): UserSession {
    const sessions = this.getSessions();
    const newSession: UserSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      token: generateToken('sess'),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      lastActivityAt: new Date().toISOString(),
      userAgent,
      ipAddress,
      isValid: true
    };
    sessions.push(newSession);
    storageAdapter.setItem('sessions', sessions);
    return newSession;
  }

  public validateSession(token: string): { user: User; session: UserSession } {
    const sessions = this.getSessions();
    const session = sessions.find((s) => s.token === token && s.isValid);

    if (!session) {
      throw new UnauthorizedError('Session is invalid or expired. Please log in.');
    }

    if (new Date(session.expiresAt) < new Date()) {
      session.isValid = false;
      storageAdapter.setItem('sessions', sessions);
      throw new UnauthorizedError('Session has expired.');
    }

    const user = this.getUserById(session.userId);
    if (!user) {
      throw new UnauthorizedError('Account associated with session no longer exists.');
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
      session.isValid = false;
      storageAdapter.setItem('sessions', sessions);
      throw new ForbiddenError(`Account is ${user.accountStatus}. Access denied.`);
    }

    // Refresh lastActivityAt
    session.lastActivityAt = new Date().toISOString();
    storageAdapter.setItem('sessions', sessions);

    return { user, session };
  }

  public revokeSession(token: string): boolean {
    const sessions = this.getSessions();
    const session = sessions.find((s) => s.token === token);
    if (session) {
      session.isValid = false;
      storageAdapter.setItem('sessions', sessions);
      this.emitAuditLog({
        actorUserId: session.userId,
        action: 'user.logout',
        targetEntity: 'session',
        targetId: session.id
      });
      return true;
    }
    return false;
  }

  public revokeAllUserSessions(userId: string, exceptToken?: string): number {
    const sessions = this.getSessions();
    let count = 0;
    sessions.forEach((s) => {
      if (s.userId === userId && s.isValid && s.token !== exceptToken) {
        s.isValid = false;
        count++;
      }
    });
    storageAdapter.setItem('sessions', sessions);
    this.emitAuditLog({
      actorUserId: userId,
      action: 'user.sessions_revoked_all',
      targetEntity: 'user',
      targetId: userId,
      details: { revokedCount: count }
    });
    return count;
  }

  // --- Password Recovery ---
  public async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    const emailNorm = email.toLowerCase().trim();
    const user = this.getUserByEmail(emailNorm);

    if (!user) {
      // Return true to avoid email enumeration
      return { success: true };
    }

    const resetToken = generateToken('rst');
    const creds = this.getCredentials();
    const cred = creds.find((c) => c.userId === user.id);

    if (cred) {
      cred.passwordResetToken = resetToken;
      cred.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      cred.updatedAt = new Date().toISOString();
      storageAdapter.setItem('credentials', creds);

      this.emitAuditLog({
        actorUserId: user.id,
        action: 'user.password_reset_requested',
        targetEntity: 'user',
        targetId: user.id
      });

      return { success: true, resetToken };
    }

    return { success: true };
  }

  public async resetPassword(token: string, newPassword: string): Promise<User> {
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      throw new ValidationError(policy.message || 'Invalid password policy.');
    }

    const creds = this.getCredentials();
    const cred = creds.find(
      (c) =>
        c.passwordResetToken === token &&
        c.passwordResetExpiresAt &&
        new Date(c.passwordResetExpiresAt) > new Date()
    );

    if (!cred) {
      throw new ValidationError('Password reset token is invalid or has expired.');
    }

    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPassword, newSalt);

    cred.passwordHash = newHash;
    cred.salt = newSalt;
    cred.passwordResetToken = null;
    cred.passwordResetExpiresAt = null;
    cred.failedLoginAttempts = 0;
    cred.lockedUntil = null;
    cred.updatedAt = new Date().toISOString();
    storageAdapter.setItem('credentials', creds);

    // Invalidate all existing sessions on password reset
    this.revokeAllUserSessions(cred.userId);

    const user = this.getUserById(cred.userId)!;
    this.emitAuditLog({
      actorUserId: user.id,
      actorName: user.fullName,
      action: 'user.password_reset_completed',
      targetEntity: 'user',
      targetId: user.id
    });

    return user;
  }

  // --- Email Verification ---
  public verifyEmail(token: string): User {
    const creds = this.getCredentials();
    const cred = creds.find((c) => c.emailVerificationToken === token);

    if (!cred) {
      throw new ValidationError('Verification token is invalid or has expired.');
    }

    const users = this.getUsers();
    const user = users.find((u) => u.id === cred.userId);
    if (!user) {
      throw new NotFoundError('User', cred.userId);
    }

    user.isEmailVerified = true;
    if (user.accountStatus === 'pending_verification') {
      user.accountStatus = 'active';
    }
    storageAdapter.setItem('users', users);

    cred.emailVerificationToken = null;
    cred.emailVerificationExpiresAt = null;
    cred.updatedAt = new Date().toISOString();
    storageAdapter.setItem('credentials', creds);

    this.emitAuditLog({
      actorUserId: user.id,
      actorName: user.fullName,
      action: 'user.email_verified',
      targetEntity: 'user',
      targetId: user.id
    });

    return user;
  }

  // --- Profile & Password Management ---
  public getProfiles(): UserProfile[] {
    return storageAdapter.getItem<UserProfile[]>('profiles') || [];
  }

  public getUserProfile(userId: string): UserProfile | null {
    const profiles = this.getProfiles();
    return profiles.find((p) => p.userId === userId) || null;
  }

  /**
   * Read-model sync only -- NOT an authentication or registration path.
   * Used by authService when a Supabase-authenticated identity has no
   * matching local cache entry yet, so the rest of the app (which still
   * reads through dbClient this phase) has something to render. Writes no
   * password, credential, or session record; a genuinely new user is
   * created and authenticated exclusively by Supabase Auth before this
   * is ever called.
   */
  public upsertUserFromExternalIdentity(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    storageAdapter.setItem('users', users);
  }

  /**
   * Read-model sync counterpart to upsertUserFromExternalIdentity() for the
   * profile record. See that method's docstring -- same "no credentials
   * involved" contract applies here.
   */
  public upsertUserProfileFromExternalIdentity(user: User): void {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.userId === user.id);
    const profile: UserProfile = {
      userId: user.id,
      headline: `${user.primaryRole?.replace('_', ' ')?.toUpperCase() || 'PROFESSIONAL'} in ${user.primaryCounty}`,
      bio: 'New member of OpportunityHub Liberia.',
      phone: user.phoneNumber,
      county: user.primaryCounty,
      skills: [],
      visibility: 'public',
      updatedAt: new Date().toISOString(),
      capabilities: user.capabilities,
      verificationState: 'unverified'
    };
    if (idx >= 0) {
      profiles[idx] = { ...profiles[idx], ...profile };
    } else {
      profiles.push(profile);
    }
    storageAdapter.setItem('profiles', profiles);
  }

  public updateUserProfile(
    userId: string,
    updates: Partial<UserProfile> & { fullName?: string; phoneNumber?: string },
    actorUserId: string
  ): { user: User; profile: UserProfile } {
    // Check permission: must be self or platform admin
    if (actorUserId !== userId) {
      const actor = this.getUserById(actorUserId);
      if (actor?.systemRole !== 'platform_admin' && actor?.primaryRole !== 'platform_admin') {
        throw new ForbiddenError('You can only modify your own personal profile.');
      }
    }

    const user = this.getUserById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const users = this.getUsers();
    const userIdx = users.findIndex((u) => u.id === userId);
    if (updates.fullName) user.fullName = updates.fullName;
    if (updates.phoneNumber !== undefined) user.phoneNumber = updates.phoneNumber;
    if (updates.county) user.primaryCounty = updates.county;
    if (updates.avatarUrl) user.avatarUrl = updates.avatarUrl;
    users[userIdx] = user;
    storageAdapter.setItem('users', users);

    const profiles = this.getProfiles();
    let profile = profiles.find((p) => p.userId === userId);
    if (!profile) {
      profile = {
        userId,
        headline: '',
        bio: '',
        phone: user.phoneNumber,
        county: user.primaryCounty,
        skills: [],
        visibility: 'public',
        updatedAt: new Date().toISOString(),
        capabilities: user.capabilities || ['find_opportunities'],
        verificationState: 'unverified'
      };
      profiles.push(profile);
    }

    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    storageAdapter.setItem('profiles', profiles);

    this.emitAuditLog({
      actorUserId,
      action: 'user.profile_updated',
      targetEntity: 'user',
      targetId: userId
    });

    return { user, profile };
  }

  public completeOnboarding(userId: string, capabilities: UserCapability[]): User {
    const user = this.getUserById(userId);
    if (!user) throw new NotFoundError('User', userId);
    user.capabilities = capabilities;
    user.onboardingCompleted = true;
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx] = user;
      storageAdapter.setItem('users', users);
    }
    const profiles = this.getProfiles();
    const profile = profiles.find((p) => p.userId === userId);
    if (profile) {
      profile.capabilities = capabilities;
      profile.updatedAt = new Date().toISOString();
      storageAdapter.setItem('profiles', profiles);
    }
    this.emitAuditLog({
      actorUserId: userId,
      action: 'user.onboarding_completed',
      targetEntity: 'user',
      targetId: userId,
      details: { capabilities }
    });
    return user;
  }

  public updateCapabilities(userId: string, capabilities: UserCapability[], actorUserId: string): User {
    if (actorUserId !== userId) {
      const actor = this.getUserById(actorUserId);
      if (actor?.systemRole !== 'platform_admin' && actor?.primaryRole !== 'platform_admin') {
        throw new ForbiddenError('You can only update your own user capabilities.');
      }
    }
    const user = this.getUserById(userId);
    if (!user) throw new NotFoundError('User', userId);
    user.capabilities = capabilities;
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx] = user;
      storageAdapter.setItem('users', users);
    }
    const profiles = this.getProfiles();
    const profile = profiles.find((p) => p.userId === userId);
    if (profile) {
      profile.capabilities = capabilities;
      profile.updatedAt = new Date().toISOString();
      storageAdapter.setItem('profiles', profiles);
    }
    return user;
  }

  // --- Comprehensive Candidate Profiles Management ---
  public getCandidateProfiles(): CandidateProfile[] {
    return storageAdapter.getItem<CandidateProfile[]>('candidate_profiles') || [];
  }

  public getCandidateProfile(userId: string): CandidateProfile | null {
    const list = this.getCandidateProfiles();
    return list.find((p) => p.userId === userId) || null;
  }

  public saveCandidateProfile(
    profileData: Partial<CandidateProfile> & { userId: string },
    actorUserId: string
  ): CandidateProfile {
    // Permission check: must be self or platform admin
    if (actorUserId !== profileData.userId) {
      const actor = this.getUserById(actorUserId);
      if (actor?.systemRole !== 'platform_admin' && actor?.primaryRole !== 'platform_admin') {
        throw new ForbiddenError('You can only modify your own candidate profile.');
      }
    }

    const user = this.getUserById(profileData.userId);
    if (!user) throw new NotFoundError('User', profileData.userId);

    const profiles = this.getCandidateProfiles();
    const idx = profiles.findIndex((p) => p.userId === profileData.userId);

    const defaultPrivacy = {
      profileVisibility: 'public' as const,
      contactVisibility: 'on_application_only' as const,
      cvDownloadPermission: 'applied_jobs_only' as const,
      showSalaryExpectations: true
    };

    let updated: CandidateProfile;

    if (idx >= 0) {
      updated = {
        ...profiles[idx],
        ...profileData,
        fullName: profileData.fullName || user.fullName,
        email: profileData.email || user.email,
        phone: profileData.phone || user.phoneNumber,
        county: profileData.county || user.primaryCounty,
        privacySettings: {
          ...defaultPrivacy,
          ...(profiles[idx].privacySettings || {}),
          ...(profileData.privacySettings || {})
        },
        education: profileData.education !== undefined ? profileData.education : profiles[idx].education,
        experience: profileData.experience !== undefined ? profileData.experience : profiles[idx].experience,
        skills: profileData.skills !== undefined ? profileData.skills : profiles[idx].skills,
        certifications: profileData.certifications !== undefined ? profileData.certifications : profiles[idx].certifications,
        languages: profileData.languages !== undefined ? profileData.languages : profiles[idx].languages,
        portfolio: profileData.portfolio !== undefined ? profileData.portfolio : profiles[idx].portfolio,
        updatedAt: new Date().toISOString()
      };
      profiles[idx] = updated;
    } else {
      updated = {
        userId: profileData.userId,
        fullName: profileData.fullName || user.fullName,
        email: profileData.email || user.email,
        phone: profileData.phone || user.phoneNumber,
        county: profileData.county || user.primaryCounty,
        cityDistrict: profileData.cityDistrict || 'Monrovia',
        avatarUrl: profileData.avatarUrl || user.avatarUrl,
        headline: profileData.headline || `${user.primaryRole?.replace('_', ' ')?.toUpperCase() || 'PROFESSIONAL'} in Liberia`,
        bio: profileData.bio || '',
        yearsOfExperience: profileData.yearsOfExperience || 0,
        highestEducationLevel: profileData.highestEducationLevel || '',
        education: profileData.education || [],
        experience: profileData.experience || [],
        skills: profileData.skills || [],
        certifications: profileData.certifications || [],
        languages: profileData.languages || [],
        portfolio: profileData.portfolio || [],
        cv: profileData.cv,
        cvFileName: profileData.cvFileName,
        privacySettings: {
          ...defaultPrivacy,
          ...(profileData.privacySettings || {})
        },
        isSearchable: profileData.isSearchable !== undefined ? profileData.isSearchable : true,
        updatedAt: new Date().toISOString()
      };
      profiles.push(updated);
    }

    storageAdapter.setItem('candidate_profiles', profiles);

    // Keep users table in sync
    if (profileData.fullName || profileData.phone || profileData.county || profileData.avatarUrl) {
      const users = this.getUsers();
      const u = users.find((item) => item.id === profileData.userId);
      if (u) {
        if (profileData.fullName) u.fullName = profileData.fullName;
        if (profileData.phone) u.phoneNumber = profileData.phone;
        if (profileData.county) u.primaryCounty = profileData.county;
        if (profileData.avatarUrl) u.avatarUrl = profileData.avatarUrl;
        storageAdapter.setItem('users', users);
      }
    }

    this.emitAuditLog({
      actorUserId,
      action: 'candidate.profile_updated',
      targetEntity: 'candidate_profile',
      targetId: profileData.userId,
      details: { headline: updated.headline, skillsCount: updated.skills.length }
    });

    return updated;
  }

  /**
   * Secure access to candidate profile with privacy filters enforced:
   * - If self or platform admin -> return full unmasked profile.
   * - If profile is hidden -> return null unless candidate has applied to viewer's organization.
   * - If anonymous -> mask name and avatar unless candidate has applied to viewer's organization.
   * - If contact visibility is on_application_only -> redact email & phone unless applied.
   */
  public getPublicCandidateProfile(
    targetUserId: string,
    viewerUserId?: string,
    viewerOrgId?: string
  ): CandidateProfile | null {
    const profile = this.getCandidateProfile(targetUserId);
    if (!profile) return null;

    // Self-view or platform admin view: full access
    if (viewerUserId && (viewerUserId === targetUserId)) {
      return profile;
    }
    if (viewerUserId) {
      const viewer = this.getUserById(viewerUserId);
      if (viewer?.systemRole === 'platform_admin' || viewer?.primaryRole === 'platform_admin') {
        return profile;
      }
    }

    // Check if candidate applied to any job owned by viewer's active organization
    let hasAppliedToViewerOrg = false;
    if (viewerOrgId) {
      const orgOpps = this.getOpportunitiesByTenant(viewerOrgId);
      const orgOppIds = new Set(orgOpps.map((o) => o.id));
      const allApps = this.getApplications();
      hasAppliedToViewerOrg = allApps.some(
        (a) => (a.applicantUserId === targetUserId || a.applicantEmail === profile.email) && orgOppIds.has(a.opportunityId)
      );
    }

    const privacy = profile.privacySettings || {
      profileVisibility: 'public',
      contactVisibility: 'on_application_only',
      cvDownloadPermission: 'applied_jobs_only'
    };

    // Rule: Profile Visibility
    if (privacy.profileVisibility === 'hidden' && !hasAppliedToViewerOrg) {
      return null;
    }

    const safeProfile: CandidateProfile = JSON.parse(JSON.stringify(profile));

    if (privacy.profileVisibility === 'anonymous' && !hasAppliedToViewerOrg) {
      safeProfile.fullName = `Candidate #${targetUserId.substring(targetUserId.length - 4).toUpperCase()}`;
      safeProfile.avatarUrl = '';
      safeProfile.email = undefined;
      safeProfile.phone = undefined;
    }

    if (targetUserId === 'user-seeker-1') {
      console.log('DEBUG_getPublicCandidateProfile', { viewerUserId, viewerOrgId, hasAppliedToViewerOrg, privacy, email: safeProfile.email, role: this.getUserById(viewerUserId || '')?.primaryRole });
    }

    // Rule: Contact Visibility
    if (privacy.contactVisibility === 'on_application_only' && !hasAppliedToViewerOrg) {
      safeProfile.phone = '[Visible upon application]';
      safeProfile.email = '[Visible upon application]';
    } else if (privacy.contactVisibility === 'hidden') {
      safeProfile.phone = '[Private]';
      safeProfile.email = '[Private]';
    }

    // Rule: CV Download Permissions
    if (privacy.cvDownloadPermission === 'applied_jobs_only' && !hasAppliedToViewerOrg && safeProfile.cv) {
      safeProfile.cv.fileDataUrl = undefined;
    }

    return safeProfile;
  }

  public searchCandidateProfiles(
    filter: {
      county?: County;
      skill?: string;
      education?: string;
      minYearsExp?: number;
      query?: string;
    },
    viewerUserId?: string,
    viewerOrgId?: string
  ): CandidateProfile[] {
    const list = this.getCandidateProfiles();
    const results: CandidateProfile[] = [];

    for (const p of list) {
      const safe = this.getPublicCandidateProfile(p.userId, viewerUserId, viewerOrgId);
      if (!safe) continue;

      if (filter.county && safe.county !== filter.county) continue;
      if (filter.minYearsExp && safe.yearsOfExperience < filter.minYearsExp) continue;

      if (filter.skill) {
        const skillLower = filter.skill.toLowerCase();
        const hasSkill = safe.skills.some((s) => {
          const name = typeof s === 'string' ? s : s.name;
          return name.toLowerCase().includes(skillLower);
        });
        if (!hasSkill) continue;
      }

      if (filter.education) {
        const eduLower = filter.education.toLowerCase();
        const hasEdu = (safe.highestEducationLevel || '').toLowerCase().includes(eduLower) ||
          safe.education.some((e) => e.degree.toLowerCase().includes(eduLower) || e.fieldOfStudy.toLowerCase().includes(eduLower));
        if (!hasEdu) continue;
      }

      if (filter.query) {
        const q = filter.query.toLowerCase().trim();
        const matches =
          (safe.fullName || '').toLowerCase().includes(q) ||
          (safe.headline || '').toLowerCase().includes(q) ||
          (safe.bio || '').toLowerCase().includes(q) ||
          safe.skills.some((s) => (typeof s === 'string' ? s : s.name).toLowerCase().includes(q));
        if (!matches) continue;
      }

      results.push(safe);
    }

    return results;
  }

  public async changePassword(userId: string, currentPass: string, newPass: string): Promise<boolean> {
    const user = this.getUserById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const creds = this.getCredentials();
    const cred = creds.find((c) => c.userId === userId);
    if (!cred) throw new NotFoundError('Credentials', userId);

    let currentMatches = false;
    if (cred.passwordHash === SEED_PASSWORD_HASH && currentPass === 'Password123!') {
      currentMatches = true;
    } else {
      currentMatches = await verifyPassword(currentPass, cred.salt, cred.passwordHash);
    }

    if (!currentMatches) {
      throw new UnauthorizedError('Current password provided is incorrect.');
    }

    const policy = validatePasswordPolicy(newPass);
    if (!policy.valid) {
      throw new ValidationError(policy.message || 'Invalid new password format.');
    }

    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPass, newSalt);
    cred.passwordHash = newHash;
    cred.salt = newSalt;
    cred.updatedAt = new Date().toISOString();
    storageAdapter.setItem('credentials', creds);

    this.emitAuditLog({
      actorUserId: userId,
      action: 'user.password_changed',
      targetEntity: 'user',
      targetId: userId
    });

    return true;
  }

  // --- Account Status Admin Control ---
  public updateAccountStatus(
    targetUserId: string,
    status: AccountStatus,
    reason: string,
    actorUserId: string
  ): User {
    if (!this.canUserPerform(actorUserId, 'user.manage_status')) {
      throw new ForbiddenError('Only platform administrators can change user account statuses.');
    }

    const users = this.getUsers();
    const user = users.find((u) => u.id === targetUserId);
    if (!user) throw new NotFoundError('User', targetUserId);

    user.accountStatus = status;
    user.statusReason = reason;
    storageAdapter.setItem('users', users);

    // If suspended or deactivated, immediately revoke all active sessions
    if (status === 'suspended' || status === 'deactivated') {
      this.revokeAllUserSessions(targetUserId);
    }

    this.emitAuditLog({
      actorUserId,
      action: `user.status_${status}`,
      targetEntity: 'user',
      targetId: targetUserId,
      details: { reason }
    });

    return user;
  }

  public updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Organization {
    const orgs = this.getOrganizations();
    const idx = orgs.findIndex((o) => o.id === organizationId);
    if (idx < 0) {
      throw new NotFoundError('Organization', organizationId);
    }
    const updated = {
      ...orgs[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    orgs[idx] = updated;
    storageAdapter.setItem('organizations', orgs);
    return updated;
  }

  public updateUserStatus(
    targetUserId: string,
    status: AccountStatus,
    reason: string
  ): User {
    const users = this.getUsers();
    const user = users.find((u) => u.id === targetUserId);
    if (!user) throw new NotFoundError('User', targetUserId);

    user.accountStatus = status;
    user.statusReason = reason;
    storageAdapter.setItem('users', users);

    if (status === 'suspended' || status === 'deactivated') {
      this.revokeAllUserSessions(targetUserId);
    }

    return user;
  }

  // =========================================================================
  // SECURE MULTI-TENANT ORGANIZATION & MEMBERSHIP ARCHITECTURE
  // =========================================================================

  /**
   * Asserts that a user is an active member of a specific organization tenant,
   * optionally verifying specific permissions.
   * Universal platform_admin override applies for platform governance.
   * Throws TenantIsolationError if user does not belong to the tenant.
   * Throws ForbiddenError if user lacks required permission.
   */
  public assertUserInTenant(
    userId: string,
    organizationId: string,
    requiredPermission?: OrgPermission | string
  ): OrganizationMembership {
    const user = this.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User does not exist.');
    }

    // Platform administrator override has universal governance access
    if (user.systemRole === 'platform_admin' || user.primaryRole === 'platform_admin') {
      return {
        id: `plat-admin-${userId}`,
        organizationId,
        userId,
        orgRole: 'owner',
        status: 'active',
        permissions: ['all'],
        createdAt: new Date().toISOString()
      };
    }

    const memberships = this.getMembershipsByUserId(userId);
    const tenantMembership = memberships.find(
      (m) => m.organizationId === organizationId && m.status === 'active'
    );

    if (!tenantMembership) {
      this.emitAuditLog({
        actorUserId: userId,
        actorName: user.fullName,
        action: 'security.cross_tenant_access_denied',
        targetEntity: 'organization',
        targetId: organizationId,
        details: { attemptedTenantId: organizationId }
      });
      throw new TenantIsolationError(organizationId, `Organization internal data for "${organizationId}"`);
    }

    if (requiredPermission) {
      const hasPermission =
        tenantMembership.orgRole === 'owner' ||
        tenantMembership.permissions.includes('all') ||
        tenantMembership.permissions.includes(requiredPermission);

      if (!hasPermission) {
        throw new ForbiddenError(
          `Permission "${requiredPermission}" is required in organization "${organizationId}".`
        );
      }
    }

    return tenantMembership;
  }

  // --- Organization Memberships Table ---
  public getMemberships(): OrganizationMembership[] {
    return storageAdapter.getItem<OrganizationMembership[]>('memberships') || [];
  }

  public getMembershipsByUserId(userId: string): OrganizationMembership[] {
    return this.getMemberships().filter((m) => m.userId === userId && m.status === 'active');
  }

  public getMembershipsByOrganization(organizationId: string): OrganizationMembership[] {
    return this.getMemberships().filter((m) => m.organizationId === organizationId);
  }

  public getUserOrganizations(userId: string): Array<Organization & { membership: OrganizationMembership }> {
    const user = this.getUserById(userId);
    if (!user) return [];

    const memberships = this.getMembershipsByUserId(userId);
    const orgs = this.getOrganizations();
    const result: Array<Organization & { membership: OrganizationMembership }> = [];

    for (const mem of memberships) {
      const org = orgs.find((o) => o.id === mem.organizationId);
      if (org) {
        result.push({
          ...org,
          membership: mem
        });
      }
    }

    // Platform administrators have governance access across all organizations
    if (user.systemRole === 'platform_admin' || user.primaryRole === 'platform_admin') {
      for (const org of orgs) {
        if (!result.some((r) => r.id === org.id)) {
          result.push({
            ...org,
            membership: {
              id: `plat-admin-${user.id}-${org.id}`,
              organizationId: org.id,
              userId: user.id,
              orgRole: 'admin',
              status: 'active',
              permissions: ['all'],
              createdAt: org.createdAt || new Date().toISOString()
            }
          });
        }
      }
    }

    return result;
  }

  public getUserMembership(organizationId: string, userId: string): OrganizationMembership | null {
    const user = this.getUserById(userId);
    if (!user) return null;
    if (user.systemRole === 'platform_admin' || user.primaryRole === 'platform_admin') {
      return {
        id: `plat-admin-${userId}-${organizationId}`,
        organizationId,
        userId,
        orgRole: 'owner',
        status: 'active',
        permissions: ['all'],
        createdAt: new Date().toISOString()
      };
    }
    const memberships = this.getMembershipsByUserId(userId);
    return memberships.find((m) => m.organizationId === organizationId && m.status === 'active') || null;
  }

  public getOrganizationMembers(
    organizationId: string,
    actorUserId: string
  ): Array<OrganizationMembership & { user?: User }> {
    this.assertUserInTenant(actorUserId, organizationId);
    const memberships = this.getMembershipsByOrganization(organizationId);
    const users = this.getUsers();
    return memberships.map((m) => ({
      ...m,
      user: users.find((u) => u.id === m.userId)
    }));
  }

  public createMembership(
    membership: Omit<OrganizationMembership, 'id' | 'createdAt'>,
    actorUserId: string
  ): OrganizationMembership {
    if (!actorUserId) {
      throw new ForbiddenError('actorUserId is required to assign organization membership.');
    }
    this.assertUserInTenant(actorUserId, membership.organizationId, 'members.manage');

    const memberships = this.getMemberships();
    const existing = memberships.find(
      (m) => m.organizationId === membership.organizationId && m.userId === membership.userId
    );
    if (existing && existing.status === 'active') {
      throw new ValidationError('User is already an active member of this organization.');
    }

    const newMembership: OrganizationMembership = {
      ...membership,
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    memberships.push(newMembership);
    storageAdapter.setItem('memberships', memberships);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.member_added',
      targetEntity: 'membership',
      targetId: newMembership.id,
      details: { organizationId: membership.organizationId, userId: membership.userId, role: membership.orgRole }
    });

    return newMembership;
  }

  public suspendMember(
    organizationId: string,
    targetMembershipId: string,
    actorUserId: string
  ): OrganizationMembership {
    this.assertUserInTenant(actorUserId, organizationId, 'members.manage');

    const memberships = this.getMemberships();
    const mem = memberships.find(
      (m) => m.id === targetMembershipId && m.organizationId === organizationId
    );
    if (!mem) {
      throw new NotFoundError('OrganizationMembership', targetMembershipId);
    }

    if (mem.orgRole === 'owner') {
      throw new ValidationError('Cannot suspend the owner of an organization.');
    }

    mem.status = 'suspended';
    mem.updatedAt = new Date().toISOString();
    storageAdapter.setItem('memberships', memberships);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.member_suspended',
      targetEntity: 'membership',
      targetId: targetMembershipId,
      details: { organizationId, suspendedUserId: mem.userId }
    });

    return mem;
  }

  public reactivateMember(
    organizationId: string,
    targetMembershipId: string,
    actorUserId: string
  ): OrganizationMembership {
    this.assertUserInTenant(actorUserId, organizationId, 'members.manage');

    const memberships = this.getMemberships();
    const mem = memberships.find(
      (m) => m.id === targetMembershipId && m.organizationId === organizationId
    );
    if (!mem) {
      throw new NotFoundError('OrganizationMembership', targetMembershipId);
    }

    mem.status = 'active';
    mem.updatedAt = new Date().toISOString();
    storageAdapter.setItem('memberships', memberships);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.member_reactivated',
      targetEntity: 'membership',
      targetId: targetMembershipId,
      details: { organizationId, reactivatedUserId: mem.userId }
    });

    return mem;
  }

  public updateMemberRoleAndPermissions(
    organizationId: string,
    targetMembershipId: string,
    newRole: OrgRole,
    permissions: (OrgPermission | string)[],
    actorUserId: string
  ): OrganizationMembership {
    this.assertUserInTenant(actorUserId, organizationId, 'members.manage');

    const memberships = this.getMemberships();
    const memIdx = memberships.findIndex(
      (m) => m.id === targetMembershipId && m.organizationId === organizationId
    );
    if (memIdx < 0) {
      throw new NotFoundError('OrganizationMembership', targetMembershipId);
    }

    const targetMem = memberships[memIdx];

    // Prevent demoting the only owner
    if (targetMem.orgRole === 'owner' && newRole !== 'owner') {
      const activeOwners = memberships.filter(
        (m) => m.organizationId === organizationId && m.orgRole === 'owner' && m.status === 'active'
      );
      if (activeOwners.length <= 1) {
        throw new ValidationError('Cannot demote the organization owner when no other owner exists.');
      }
    }

    targetMem.orgRole = newRole;
    targetMem.permissions = permissions;
    targetMem.updatedAt = new Date().toISOString();

    storageAdapter.setItem('memberships', memberships);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.member_updated',
      targetEntity: 'membership',
      targetId: targetMembershipId,
      details: { organizationId, newRole, permissions }
    });

    return targetMem;
  }

  public removeMember(organizationId: string, targetMembershipId: string, actorUserId: string): void {
    this.assertUserInTenant(actorUserId, organizationId, 'members.manage');

    const memberships = this.getMemberships();
    const mem = memberships.find(
      (m) => m.id === targetMembershipId && m.organizationId === organizationId
    );
    if (!mem) {
      throw new NotFoundError('OrganizationMembership', targetMembershipId);
    }

    // Prevent removing sole owner
    if (mem.orgRole === 'owner') {
      const activeOwners = memberships.filter(
        (m) => m.organizationId === organizationId && m.orgRole === 'owner' && m.status === 'active'
      );
      if (activeOwners.length <= 1) {
        throw new ValidationError('Cannot remove the sole owner of an organization.');
      }
    }

    const filtered = memberships.filter((m) => m.id !== targetMembershipId);
    storageAdapter.setItem('memberships', filtered);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.member_removed',
      targetEntity: 'membership',
      targetId: targetMembershipId,
      details: { organizationId, removedUserId: mem.userId }
    });
  }

  // --- Organizations Table ---
  public getOrganizations(filter?: {
    type?: OrganizationType;
    county?: County;
    isVerified?: boolean;
    query?: string;
  }): Organization[] {
    let orgs = storageAdapter.getItem<Organization[]>('organizations') || [];

    if (filter) {
      if (filter.type) {
        orgs = orgs.filter((o) => o.type === filter.type);
      }
      if (filter.county) {
        orgs = orgs.filter((o) => o.county === filter.county);
      }
      if (typeof filter.isVerified === 'boolean') {
        orgs = orgs.filter((o) => o.isVerified === filter.isVerified);
      }
      if (filter.query) {
        const q = filter.query.toLowerCase().trim();
        orgs = orgs.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.description.toLowerCase().includes(q) ||
            o.industry.toLowerCase().includes(q) ||
            o.cityDistrict.toLowerCase().includes(q)
        );
      }
    }

    return orgs;
  }

  public getOrganizationById(id: string): Organization | null {
    const orgs = this.getOrganizations();
    return orgs.find((o) => o.id === id) || null;
  }

  public getOrganizationBySlug(slug: string): Organization | null {
    const orgs = this.getOrganizations();
    return orgs.find((o) => o.slug === slug) || null;
  }

  public createOrganization(
    org: Omit<Organization, 'id' | 'verificationStatus' | 'settings' | 'slug'> &
      Partial<Pick<Organization, 'verificationStatus' | 'settings' | 'slug'>>,
    creatorUserId?: string
  ): Organization {
    if (!org.name || !org.name.trim()) {
      throw new ValidationError('Organization name is required.');
    }
    if (!org.type) {
      throw new ValidationError('Organization type is required.');
    }
    if (!org.county) {
      throw new ValidationError('Organization county location is required.');
    }

    const orgs = this.getOrganizations();
    const id = `org-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const slug =
      org.slug ||
      org.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const defaultSettings: OrganizationSettings = {
      defaultCurrency: 'USD',
      candidateAlertEmail: org.contactEmail,
      lowBandwidthDefault: true,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: false,
      ...(org.settings || {})
    };

    const newOrg: Organization = {
      ...org,
      id,
      slug,
      logoText: org.logoText || org.name.substring(0, 3).toUpperCase(),
      verificationStatus: org.verificationStatus || 'unverified',
      isVerified: Boolean(org.isVerified),
      settings: defaultSettings,
      createdAt: new Date().toISOString()
    };

    orgs.push(newOrg);
    storageAdapter.setItem('organizations', orgs);

    // If a creatorUserId was provided, immediately grant them owner membership
    if (creatorUserId) {
      const memberships = this.getMemberships();
      const ownerMem: OrganizationMembership = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        organizationId: id,
        userId: creatorUserId,
        orgRole: 'owner',
        status: 'active',
        permissions: ['all'],
        createdAt: new Date().toISOString()
      };
      memberships.push(ownerMem);
      storageAdapter.setItem('memberships', memberships);
    }

    this.emitAuditLog({
      actorUserId: creatorUserId,
      action: 'organization.created',
      targetEntity: 'organization',
      targetId: newOrg.id,
      details: { name: newOrg.name, type: newOrg.type, county: newOrg.county }
    });

    return newOrg;
  }

  public updateOrganizationProfile(
    organizationId: string,
    updates: Partial<Organization>,
    actorUserId: string
  ): Organization {
    this.assertUserInTenant(actorUserId, organizationId, 'settings.edit');

    const orgs = this.getOrganizations();
    const orgIdx = orgs.findIndex((o) => o.id === organizationId);
    if (orgIdx < 0) {
      throw new NotFoundError('Organization', organizationId);
    }

    const org = orgs[orgIdx];

    // Protect immutable / administrative fields from profile updates
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.verificationStatus;
    delete safeUpdates.verificationBadge;
    delete safeUpdates.isVerified;

    Object.assign(org, safeUpdates, { updatedAt: new Date().toISOString() });
    storageAdapter.setItem('organizations', orgs);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.profile_updated',
      targetEntity: 'organization',
      targetId: organizationId,
      details: { updatedFields: Object.keys(safeUpdates) }
    });

    return org;
  }

  public updateOrganizationSettings(
    organizationId: string,
    settingsUpdates: Partial<OrganizationSettings>,
    actorUserId: string
  ): Organization {
    this.assertUserInTenant(actorUserId, organizationId, 'settings.edit');

    const orgs = this.getOrganizations();
    const orgIdx = orgs.findIndex((o) => o.id === organizationId);
    if (orgIdx < 0) {
      throw new NotFoundError('Organization', organizationId);
    }

    const org = orgs[orgIdx];
    org.settings = {
      ...(org.settings || {
        defaultCurrency: 'USD',
        lowBandwidthDefault: true,
        isPubliclyListed: true,
        notifyOnApplications: true,
        requireCoverNote: false
      }),
      ...settingsUpdates
    };
    org.updatedAt = new Date().toISOString();

    storageAdapter.setItem('organizations', orgs);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.settings_updated',
      targetEntity: 'organization',
      targetId: organizationId,
      details: { settings: org.settings }
    });

    return org;
  }

  // --- Organization Invitations ---
  public getInvitations(): OrganizationInvitation[] {
    return storageAdapter.getItem<OrganizationInvitation[]>('invitations') || [];
  }

  public getOrganizationInvitations(
    organizationId: string,
    actorUserId?: string
  ): OrganizationInvitation[] {
    if (actorUserId) {
      this.assertUserInTenant(actorUserId, organizationId, 'members.view');
    }
    return this.getInvitations().filter((i) => i.organizationId === organizationId);
  }

  public getPendingInvitationsForEmail(email: string): OrganizationInvitation[] {
    const emailNorm = email.toLowerCase().trim();
    const now = new Date();
    return this.getInvitations().filter(
      (i) =>
        i.inviteeEmail.toLowerCase() === emailNorm &&
        i.status === 'pending' &&
        new Date(i.expiresAt) > now
    );
  }

  public createInvitation(
    organizationId: string,
    inviteeEmail: string,
    orgRole: OrgRole,
    permissions: (OrgPermission | string)[],
    actorUserId: string
  ): OrganizationInvitation {
    this.assertUserInTenant(actorUserId, organizationId, 'members.invite');

    const emailNorm = inviteeEmail.toLowerCase().trim();
    if (!emailNorm.includes('@') || !emailNorm.includes('.')) {
      throw new ValidationError('Valid email address is required for invitation.');
    }

    const org = this.getOrganizationById(organizationId);
    if (!org) throw new NotFoundError('Organization', organizationId);

    const inviter = this.getUserById(actorUserId);

    // Check if invitee is already an active member
    const existingUser = this.getUserByEmail(emailNorm);
    if (existingUser) {
      const activeMembers = this.getMembershipsByOrganization(organizationId);
      if (activeMembers.some((m) => m.userId === existingUser.id && m.status === 'active')) {
        throw new ValidationError(`User with email "${emailNorm}" is already an active member.`);
      }
    }

    const invitations = this.getInvitations();
    const existingPending = invitations.find(
      (i) =>
        i.organizationId === organizationId &&
        i.inviteeEmail.toLowerCase() === emailNorm &&
        i.status === 'pending' &&
        new Date(i.expiresAt) > new Date()
    );
    if (existingPending) {
      throw new ValidationError(`A pending invitation has already been dispatched to "${emailNorm}".`);
    }

    const newInv: OrganizationInvitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organizationId,
      organizationName: org.name,
      inviterUserId: actorUserId,
      inviterName: inviter?.fullName || 'Organization Administrator',
      inviteeEmail: emailNorm,
      orgRole,
      permissions,
      token: generateToken('inv_'),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      createdAt: new Date().toISOString()
    };

    invitations.unshift(newInv);
    storageAdapter.setItem('invitations', invitations);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.invitation_sent',
      targetEntity: 'invitation',
      targetId: newInv.id,
      details: { organizationId, inviteeEmail: emailNorm, role: orgRole }
    });

    return newInv;
  }

  public acceptInvitation(token: string, userId: string): OrganizationMembership {
    const user = this.getUserById(userId);
    if (!user) throw new UnauthorizedError('User does not exist.');

    const invitations = this.getInvitations();
    const inv = invitations.find((i) => i.token === token);
    if (!inv) {
      throw new NotFoundError('Invitation', 'token');
    }

    if (inv.status !== 'pending') {
      throw new ValidationError(`This invitation has already been ${inv.status}.`);
    }

    if (new Date(inv.expiresAt) <= new Date()) {
      inv.status = 'expired';
      storageAdapter.setItem('invitations', invitations);
      throw new ValidationError('This organization invitation has expired.');
    }

    // Security check: invitation must match the authenticated user's email
    if (user.email.toLowerCase().trim() !== inv.inviteeEmail.toLowerCase().trim()) {
      throw new ForbiddenError('This organization invitation was issued to a different email address.');
    }

    // Create active membership
    const memberships = this.getMemberships();
    const existingMembership = memberships.find(
      (m) => m.organizationId === inv.organizationId && m.userId === userId
    );

    let createdMembership: OrganizationMembership;
    const now = new Date().toISOString();
    if (existingMembership) {
      existingMembership.status = 'active';
      existingMembership.orgRole = inv.orgRole;
      existingMembership.permissions = inv.permissions;
      existingMembership.updatedAt = now;
      existingMembership.acceptedAt = now;
      existingMembership.invitedBy = inv.inviterUserId;
      existingMembership.invitedAt = inv.createdAt;
      existingMembership.invitationId = inv.id;
      createdMembership = existingMembership;
    } else {
      createdMembership = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        organizationId: inv.organizationId,
        userId,
        orgRole: inv.orgRole,
        status: 'active',
        permissions: inv.permissions,
        createdAt: now,
        acceptedAt: now,
        invitedBy: inv.inviterUserId,
        invitedAt: inv.createdAt,
        invitationId: inv.id
      };
      memberships.push(createdMembership);
    }
    storageAdapter.setItem('memberships', memberships);

    inv.status = 'accepted';
    inv.respondedAt = now;
    storageAdapter.setItem('invitations', invitations);

    this.emitAuditLog({
      actorUserId: userId,
      action: 'organization.invitation_accepted',
      targetEntity: 'membership',
      targetId: createdMembership.id,
      details: { organizationId: inv.organizationId, role: inv.orgRole, invitationId: inv.id }
    });

    return createdMembership;
  }

  public revokeInvitation(
    invitationIdOrToken: string,
    actorUserId?: string,
    organizationId?: string
  ): void {
    const invitations = this.getInvitations();
    const inv = invitations.find(
      (i) => i.id === invitationIdOrToken || i.token === invitationIdOrToken
    );
    if (!inv) throw new NotFoundError('Invitation', invitationIdOrToken);

    const effectiveOrgId = organizationId || inv.organizationId;
    if (actorUserId) {
      this.assertUserInTenant(actorUserId, effectiveOrgId, 'members.manage');
    }

    inv.status = 'revoked';
    inv.respondedAt = new Date().toISOString();
    storageAdapter.setItem('invitations', invitations);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.invitation_revoked',
      targetEntity: 'invitation',
      targetId: inv.id,
      details: { organizationId: effectiveOrgId, inviteeEmail: inv.inviteeEmail }
    });
  }

  public rejectInvitation(token: string, userId?: string): void {
    const invitations = this.getInvitations();
    const inv = invitations.find((i) => i.token === token);
    if (!inv) throw new NotFoundError('Invitation', 'token');

    if (inv.status !== 'pending') {
      throw new ValidationError(`Invitation is already ${inv.status}.`);
    }

    inv.status = 'rejected';
    inv.respondedAt = new Date().toISOString();
    storageAdapter.setItem('invitations', invitations);

    this.emitAuditLog({
      actorUserId: userId,
      action: 'organization.invitation_rejected',
      targetEntity: 'invitation',
      targetId: inv.id,
      details: { organizationId: inv.organizationId }
    });
  }

  // --- Organization Verification Workflow ---
  public requestOrganizationVerification(
    organizationId: string,
    details: { registrationNumber?: string; taxIdNumber?: string; documentNotes?: string },
    actorUserId: string
  ): Organization {
    this.assertUserInTenant(actorUserId, organizationId, 'verification.request');

    const orgs = this.getOrganizations();
    const org = orgs.find((o) => o.id === organizationId);
    if (!org) throw new NotFoundError('Organization', organizationId);

    org.verificationStatus = 'pending';
    if (details.registrationNumber) org.registrationNumber = details.registrationNumber;
    if (details.taxIdNumber) org.taxIdNumber = details.taxIdNumber;
    org.updatedAt = new Date().toISOString();
    storageAdapter.setItem('organizations', orgs);

    this.emitAuditLog({
      actorUserId,
      action: 'organization.verification_requested',
      targetEntity: 'organization',
      targetId: organizationId,
      details
    });

    return org;
  }

  public decideOrganizationVerification(
    organizationId: string,
    decision: 'approved' | 'rejected',
    badge?: VerificationBadge,
    rejectionReason?: string,
    actorUserId?: string
  ): Organization {
    if (actorUserId && !this.canUserPerform(actorUserId, 'verification.decide')) {
      throw new ForbiddenError('Only authorized Verification Officers can approve or reject institutional verifications.');
    }

    const orgs = this.getOrganizations();
    const org = orgs.find((o) => o.id === organizationId);
    if (!org) throw new NotFoundError('Organization', organizationId);

    if (decision === 'approved') {
      org.verificationStatus = 'verified';
      org.isVerified = true;
      if (badge) org.verificationBadge = badge;
    } else {
      org.verificationStatus = 'rejected';
      org.isVerified = false;
    }
    org.updatedAt = new Date().toISOString();
    storageAdapter.setItem('organizations', orgs);

    this.emitAuditLog({
      actorUserId,
      action: `organization.verification_${decision}`,
      targetEntity: 'organization',
      targetId: organizationId,
      details: { decision, badge, rejectionReason }
    });

    return org;
  }

  // --- Strict Cross-Tenant Applications Query ---
  public getApplicationsByOrganization(
    organizationId: string,
    actorUserId: string
  ): Application[] {
    this.assertUserInTenant(actorUserId, organizationId, 'applications.view');
    const opps = this.getOpportunitiesByTenant(organizationId);
    const oppIds = new Set(opps.map((o) => o.id));
    const allApps = this.getApplications();
    return allApps.filter((a) => oppIds.has(a.opportunityId));
  }

  // --- Opportunities Table ---
  public getOpportunities(): Opportunity[] {
    return storageAdapter.getItem<Opportunity[]>('opportunities') || [];
  }

  public getOpportunityById(id: string): Opportunity | null {
    const opps = this.getOpportunities();
    return opps.find((o) => o.id === id) || null;
  }

  public getOpportunitiesByTenant(organizationId: string): Opportunity[] {
    const opps = this.getOpportunities();
    return opps.filter((o) => o.organizationId === organizationId);
  }

  public createOpportunity(
    opp: Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'>,
    actorUserId?: string
  ): Opportunity {
    if (actorUserId && !this.canUserPerform(actorUserId, 'opportunity.create', opp.organizationId)) {
      throw new ForbiddenError('You do not have permission to publish opportunities for this organization.');
    }

    const org = this.getOrganizationById(opp.organizationId);
    if (!org) {
      throw new ValidationError(`Organization with id "${opp.organizationId}" does not exist.`);
    }

    const opps = this.getOpportunities();
    const newOpp: Opportunity = {
      ...opp,
      id: `opp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization: org,
      postedDate: new Date().toISOString().split('T')[0],
      viewsCount: 0,
      applicationsCount: 0
    };

    opps.unshift(newOpp);
    storageAdapter.setItem('opportunities', opps);

    this.emitAuditLog({
      actorUserId,
      action: 'opportunity.created',
      targetEntity: 'opportunity',
      targetId: newOpp.id,
      details: { title: newOpp.title, organizationId: newOpp.organizationId }
    });

    return newOpp;
  }

  public updateOpportunity(
    id: string,
    updates: Partial<Opportunity>,
    actorTenantId?: string,
    actorUserId?: string
  ): Opportunity {
    const opps = this.getOpportunities();
    const item = opps.find((o) => o.id === id);
    if (!item) {
      throw new NotFoundError('Opportunity', id);
    }

    if (actorTenantId && item.organizationId !== actorTenantId) {
      throw new TenantIsolationError(actorTenantId, item.organizationId);
    }

    if (actorUserId && !this.canUserPerform(actorUserId, 'opportunity.edit', item.organizationId)) {
      throw new ForbiddenError('You do not have permission to modify this opportunity.');
    }

    Object.assign(item, updates);
    storageAdapter.setItem('opportunities', opps);

    this.emitAuditLog({
      actorUserId,
      action: 'opportunity.updated',
      targetEntity: 'opportunity',
      targetId: id
    });

    return item;
  }

  public deleteOpportunity(
    id: string,
    actorTenantId?: string,
    actorUserId?: string
  ): void {
    const opps = this.getOpportunities();
    const idx = opps.findIndex((o) => o.id === id);
    if (idx < 0) {
      throw new NotFoundError('Opportunity', id);
    }

    const item = opps[idx];
    if (actorTenantId && item.organizationId !== actorTenantId) {
      throw new TenantIsolationError(actorTenantId, item.organizationId);
    }

    if (actorUserId && !this.canUserPerform(actorUserId, 'opportunity.delete', item.organizationId)) {
      throw new ForbiddenError('You do not have permission to delete this opportunity.');
    }

    opps.splice(idx, 1);
    storageAdapter.setItem('opportunities', opps);

    this.emitAuditLog({
      actorUserId,
      action: 'opportunity.deleted',
      targetEntity: 'opportunity',
      targetId: id,
      details: { title: item.title, organizationId: item.organizationId }
    });
  }

  public expireOverdueOpportunities(): number {
    const opps = this.getOpportunities();
    const todayStr = new Date().toISOString().split('T')[0];
    let count = 0;

    for (const opp of opps) {
      if (opp.status === 'published' && opp.deadline && opp.deadline < todayStr) {
        opp.status = 'expired';
        count += 1;
      }
    }

    if (count > 0) {
      storageAdapter.setItem('opportunities', opps);
      logger.info('DBClient', `Auto-expired ${count} overdue opportunities.`);
    }

    return count;
  }

  public incrementOpportunityViews(id: string): void {
    const opps = this.getOpportunities();
    const item = opps.find((o) => o.id === id);
    if (item) {
      item.viewsCount += 1;
      storageAdapter.setItem('opportunities', opps);
    }
  }

  // --- Applications Table ---
  public getApplications(): Application[] {
    return storageAdapter.getItem<Application[]>('applications') || [];
  }

  public getApplicationById(
    id: string,
    actorUserId?: string,
    actorTenantId?: string
  ): Application | null {
    const apps = this.getApplications();
    const app = apps.find((a) => a.id === id);
    if (!app) return null;

    if (actorUserId) {
      const user = this.getUserById(actorUserId);
      const isSelf = app.applicantUserId === actorUserId || (user && app.applicantEmail === user.email);
      const isPlatAdmin = user?.systemRole === 'platform_admin' || user?.primaryRole === 'platform_admin';
      
      let isEmployerForJob = false;
      if (app.organizationId) {
        const mems = this.getMembershipsByUserId(actorUserId);
        isEmployerForJob = mems.some((m) => m.organizationId === app.organizationId && m.status === 'active');
      }

      if (!isSelf && !isPlatAdmin && !isEmployerForJob) {
        throw new ForbiddenError('You do not have access to view this application.');
      }
    }

    if (actorTenantId && app.organizationId && app.organizationId !== actorTenantId) {
      throw new TenantIsolationError(actorTenantId, app.organizationId);
    }

    return app;
  }

  public getApplicationsByOpportunity(opportunityId: string, actorTenantId?: string): Application[] {
    const opp = this.getOpportunityById(opportunityId);
    if (!opp) throw new NotFoundError('Opportunity', opportunityId);

    if (actorTenantId && opp.organizationId !== actorTenantId) {
      throw new TenantIsolationError(actorTenantId, opp.organizationId);
    }

    const apps = this.getApplications();
    return apps.filter((a) => a.opportunityId === opportunityId);
  }

  public getApplicationsByCandidate(applicantUserId: string): Application[] {
    const apps = this.getApplications();
    const user = this.getUserById(applicantUserId);
    const userEmail = user?.email?.toLowerCase();

    return apps.filter((a) => {
      if (a.applicantUserId && a.applicantUserId === applicantUserId) return true;
      if (userEmail && a.applicantEmail.toLowerCase() === userEmail) return true;
      return false;
    });
  }

  public createApplication(
    app: Omit<Application, 'id' | 'appliedDate' | 'stage' | 'history'>,
    actorUserId?: string
  ): Application {
    const opps = this.getOpportunities();
    const opp = opps.find((o) => o.id === app.opportunityId);
    if (!opp) {
      throw new NotFoundError('Opportunity', app.opportunityId);
    }

    // Ensure applicant name and email
    if (!app.applicantName || !app.applicantName.trim()) {
      throw new ValidationError('Applicant name is required.');
    }
    if (!app.applicantEmail || !app.applicantEmail.includes('@')) {
      throw new ValidationError('Valid applicant email is required.');
    }

    const apps = this.getApplications();
    const now = new Date().toISOString();
    const appId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Initial history event
    const initialHistory: ApplicationStatusLog[] = [
      {
        id: `hist-${Date.now()}-1`,
        stage: 'applied',
        changedAt: now,
        changedByUserId: actorUserId || app.applicantUserId,
        changedByName: app.applicantName,
        note: 'Application submitted via OpportunityHub Liberia portal.'
      }
    ];

    const newApp: Application = {
      ...app,
      id: appId,
      organizationId: app.organizationId || opp.organizationId,
      organizationName: app.organizationName || opp.organization.name,
      applicantUserId: actorUserId || app.applicantUserId,
      appliedDate: now.split('T')[0],
      stage: 'applied',
      history: initialHistory,
      updatedAt: now
    };

    apps.unshift(newApp);
    storageAdapter.setItem('applications', apps);

    // Increment opportunity application count
    opp.applicationsCount = (opp.applicationsCount || 0) + 1;
    storageAdapter.setItem('opportunities', opps);

    this.emitAuditLog({
      actorUserId: actorUserId || app.applicantUserId,
      actorName: newApp.applicantName,
      action: 'application.submitted',
      targetEntity: 'application',
      targetId: newApp.id,
      details: {
        applicant: newApp.applicantName,
        opportunityTitle: newApp.opportunityTitle,
        organizationId: newApp.organizationId
      }
    });

    return newApp;
  }

  public withdrawApplication(
    applicationId: string,
    reason?: string,
    actorUserId?: string
  ): Application {
    const apps = this.getApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new NotFoundError('Application', applicationId);

    if (actorUserId) {
      const user = this.getUserById(actorUserId);
      const isApplicant = app.applicantUserId === actorUserId || (user && app.applicantEmail === user.email);
      const isPlatAdmin = user?.systemRole === 'platform_admin' || user?.primaryRole === 'platform_admin';
      if (!isApplicant && !isPlatAdmin) {
        throw new ForbiddenError('You can only withdraw your own applications.');
      }
    }

    if (app.stage === 'withdrawn') {
      return app;
    }

    const now = new Date().toISOString();
    app.stage = 'withdrawn';
    app.withdrawalReason = reason || 'Candidate withdrew application.';
    app.withdrawnAt = now;
    app.updatedAt = now;

    if (!app.history) app.history = [];
    app.history.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stage: 'withdrawn',
      changedAt: now,
      changedByUserId: actorUserId,
      changedByName: app.applicantName,
      note: reason || 'Application withdrawn by applicant.'
    });

    storageAdapter.setItem('applications', apps);

    this.emitAuditLog({
      actorUserId,
      action: 'application.withdrawn',
      targetEntity: 'application',
      targetId: applicationId,
      details: { reason, applicant: app.applicantName }
    });

    return app;
  }

  public updateApplicationStage(
    applicationId: string,
    stage: ApplicationStage,
    options?: {
      note?: string;
      interviewDetails?: InterviewScheduleDetails;
      rejectionReason?: string;
      hiringOfferDetails?: {
        salaryUSD?: number;
        salaryLRD?: number;
        startDate?: string;
        notes?: string;
      };
      matchNotes?: string;
    },
    actorTenantId?: string,
    actorUserId?: string
  ): Application {
    const apps = this.getApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new NotFoundError('Application', applicationId);

    const opp = this.getOpportunityById(app.opportunityId);
    const effectiveOrgId = app.organizationId || opp?.organizationId;

    if (effectiveOrgId && actorTenantId && effectiveOrgId !== actorTenantId) {
      throw new TenantIsolationError(actorTenantId, effectiveOrgId);
    }

    if (effectiveOrgId && actorUserId && !this.canUserPerform(actorUserId, 'application.advance_stage', effectiveOrgId)) {
      throw new ForbiddenError('You do not have permission to advance recruitment stages for this candidate.');
    }

    const now = new Date().toISOString();
    const actorUser = actorUserId ? this.getUserById(actorUserId) : null;
    const actorName = actorUser?.fullName || 'Hiring Manager';

    app.stage = stage;
    app.updatedAt = now;

    if (options?.matchNotes) app.matchNotes = options.matchNotes;
    if (options?.interviewDetails) app.interviewDetails = options.interviewDetails;
    if (options?.rejectionReason) app.rejectionReason = options.rejectionReason;
    if (options?.hiringOfferDetails) app.hiringOfferDetails = options.hiringOfferDetails;

    if (!app.history) app.history = [];
    app.history.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stage,
      changedAt: now,
      changedByUserId: actorUserId,
      changedByName: actorName,
      note: options?.note || `Stage advanced to ${stage.replace('_', ' ')}`,
      interviewDetails: options?.interviewDetails,
      rejectionReason: options?.rejectionReason,
      hiringOfferDetails: options?.hiringOfferDetails
    });

    storageAdapter.setItem('applications', apps);

    this.emitAuditLog({
      actorUserId,
      action: `application.stage_${stage}`,
      targetEntity: 'application',
      targetId: applicationId,
      details: {
        applicant: app.applicantName,
        newStage: stage,
        opportunityTitle: app.opportunityTitle
      }
    });

    return app;
  }

  public updateApplicationEvaluation(
    applicationId: string,
    evaluation: {
      rating?: number;
      matchScore?: number;
      employerNotes?: string;
      strengths?: string[];
      improvements?: string[];
      internalNotes?: string;
    },
    actorTenantId?: string,
    actorUserId?: string
  ): Application {
    const apps = this.getApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new NotFoundError('Application', applicationId);

    const effectiveOrgId = app.organizationId;
    if (effectiveOrgId && actorTenantId && effectiveOrgId !== actorTenantId) {
      throw new TenantIsolationError(actorTenantId, effectiveOrgId);
    }
    if (effectiveOrgId && actorUserId && !this.canUserPerform(actorUserId, 'application.review', effectiveOrgId)) {
      throw new ForbiddenError('You do not have permission to evaluate applications for this organization.');
    }

    if (evaluation.rating !== undefined) app.rating = evaluation.rating;
    if (evaluation.matchScore !== undefined) app.matchScore = evaluation.matchScore;
    if (evaluation.employerNotes !== undefined) app.employerNotes = evaluation.employerNotes;
    (app as any).evaluations = evaluation;
    app.updatedAt = new Date().toISOString();

    storageAdapter.setItem('applications', apps);

    this.emitAuditLog({
      actorUserId,
      action: 'application.evaluated',
      targetEntity: 'application',
      targetId: applicationId,
      details: evaluation
    });

    return app;
  }

  // --- Business Listings & M&A Table ---
  public getBusinesses(): BusinessListing[] {
    return storageAdapter.getItem<BusinessListing[]>('businesses') || [];
  }

  public getBusinessById(id: string): BusinessListing | null {
    const list = this.getBusinesses();
    return list.find((b) => b.id === id) || null;
  }

  public createBusiness(listing: Omit<BusinessListing, 'id' | 'status'> & Partial<BusinessListing>, actorUserId?: string): BusinessListing {
    if (actorUserId && !this.canUserPerform(actorUserId, 'business.list')) {
      throw new ForbiddenError('You do not have permission to list an enterprise for sale.');
    }

    const businesses = this.getBusinesses();
    const newBiz: BusinessListing = {
      ...listing,
      id: `biz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: listing.status || 'published',
      moderationStatus: listing.moderationStatus || 'published',
      isVerified: listing.isVerified ?? false,
      ownerUserId: actorUserId || listing.ownerUserId || 'unassigned',
      savedByUsers: listing.savedByUsers || [],
      inquiriesCount: 0,
      photos: listing.photos || []
    };

    businesses.unshift(newBiz);
    storageAdapter.setItem('businesses', businesses);

    this.emitAuditLog({
      actorUserId,
      action: 'business.listed',
      targetEntity: 'business_listing',
      targetId: newBiz.id,
      details: { title: newBiz.title, county: newBiz.county }
    });

    return newBiz;
  }

  public updateBusiness(id: string, updates: Partial<BusinessListing>, actorUserId?: string): BusinessListing {
    const businesses = this.getBusinesses();
    const index = businesses.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error(`Business listing not found: ${id}`);
    }

    if (actorUserId) {
      const isOwner = businesses[index].ownerUserId === actorUserId;
      const canModerate = this.canUserPerform(actorUserId, 'business.moderate');
      if (!isOwner && !canModerate) {
        throw new ForbiddenError('You do not have permission to update this business listing. Only the listing owner or moderators can modify it.');
      }
    }

    businesses[index] = {
      ...businesses[index],
      ...updates
    };
    storageAdapter.setItem('businesses', businesses);

    this.emitAuditLog({
      actorUserId,
      action: 'business.updated',
      targetEntity: 'business_listing',
      targetId: id
    });

    return businesses[index];
  }

  public deleteBusiness(id: string, actorUserId?: string): boolean {
    const businesses = this.getBusinesses();
    const target = businesses.find((b) => b.id === id);
    if (!target) return false;

    if (actorUserId) {
      const isOwner = target.ownerUserId === actorUserId;
      const canModerate = this.canUserPerform(actorUserId, 'business.moderate');
      if (!isOwner && !canModerate) {
        throw new ForbiddenError('You do not have permission to delete this business listing. Only the listing owner or moderators can delete it.');
      }
    }

    const filtered = businesses.filter((b) => b.id !== id);
    storageAdapter.setItem('businesses', filtered);
    this.emitAuditLog({
      actorUserId,
      action: 'business.deleted',
      targetEntity: 'business_listing',
      targetId: id
    });
    return true;
  }

  public grantBusinessAccess(businessId: string, actorUserId?: string): void {
    if (actorUserId && !this.canUserPerform(actorUserId, 'business.request_nda')) {
      throw new ForbiddenError('Permission denied to request confidential NDA access.');
    }

    const businesses = this.getBusinesses();
    const item = businesses.find((b) => b.id === businessId);
    if (item) {
      item.accessGranted = true;
      storageAdapter.setItem('businesses', businesses);
      this.emitAuditLog({
        actorUserId,
        action: 'business.nda_granted',
        targetEntity: 'business_listing',
        targetId: businessId
      });
    }
  }

  public requestNdaAccess(
    businessId: string,
    buyerData: { buyerName: string; buyerEmail: string; buyerPhone?: string; buyerOrganization?: string; proofOfFundsNote?: string },
    actorUserId?: string
  ): BusinessAccessRequest {
    const requests = storageAdapter.getItem<BusinessAccessRequest[]>('business_nda_requests') || [];
    const newRequest: BusinessAccessRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      buyerUserId: actorUserId || 'anonymous-buyer',
      buyerName: buyerData.buyerName,
      buyerEmail: buyerData.buyerEmail,
      buyerPhone: buyerData.buyerPhone,
      buyerOrganization: buyerData.buyerOrganization,
      ndaAccepted: true,
      ndaSignedAt: new Date().toISOString(),
      proofOfFundsNote: buyerData.proofOfFundsNote,
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    storageAdapter.setItem('business_nda_requests', requests);

    this.grantBusinessAccess(businessId, actorUserId);
    return newRequest;
  }

  public getNdaRequestsForBusiness(businessId: string): BusinessAccessRequest[] {
    const requests = storageAdapter.getItem<BusinessAccessRequest[]>('business_nda_requests') || [];
    return requests.filter((r) => r.businessId === businessId);
  }

  public incrementBusinessViews(id: string): void {
    const businesses = this.getBusinesses();
    const item = businesses.find((b) => b.id === id);
    if (item) {
      item.viewsCount = (item.viewsCount || 0) + 1;
      storageAdapter.setItem('businesses', businesses);
    }
  }

  public toggleSaveBusiness(businessId: string, userId: string): boolean {
    const businesses = this.getBusinesses();
    const item = businesses.find((b) => b.id === businessId);
    if (!item) return false;

    item.savedByUsers = item.savedByUsers || [];
    const isSaved = item.savedByUsers.includes(userId);
    if (isSaved) {
      item.savedByUsers = item.savedByUsers.filter((u) => u !== userId);
    } else {
      item.savedByUsers.push(userId);
    }
    storageAdapter.setItem('businesses', businesses);
    return !isSaved;
  }

  public getSavedBusinessIds(userId: string): string[] {
    const businesses = this.getBusinesses();
    return businesses.filter((b) => b.savedByUsers && b.savedByUsers.includes(userId)).map((b) => b.id);
  }

  public createBusinessInquiry(
    inquiry: Omit<BusinessInquiry, 'id' | 'createdAt'>,
    actorUserId?: string
  ): BusinessInquiry {
    const inquiries = storageAdapter.getItem<BusinessInquiry[]>('business_inquiries') || [];
    const newInquiry: BusinessInquiry = {
      ...inquiry,
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'unread',
      createdAt: new Date().toISOString()
    };

    inquiries.unshift(newInquiry);
    storageAdapter.setItem('business_inquiries', inquiries);

    const businesses = this.getBusinesses();
    const item = businesses.find((b) => b.id === inquiry.businessId);
    if (item) {
      item.inquiriesCount = (item.inquiriesCount || 0) + 1;
      storageAdapter.setItem('businesses', businesses);
    }

    this.emitAuditLog({
      actorUserId,
      action: 'business.inquiry_sent',
      targetEntity: 'business_listing',
      targetId: inquiry.businessId,
      details: { inquiryType: inquiry.inquiryType, senderEmail: inquiry.senderEmail }
    });

    return newInquiry;
  }

  public getBusinessInquiries(businessId: string): BusinessInquiry[] {
    const inquiries = storageAdapter.getItem<BusinessInquiry[]>('business_inquiries') || [];
    return inquiries.filter((i) => i.businessId === businessId);
  }

  public moderateBusinessListing(
    businessId: string,
    decision: 'approve' | 'reject' | 'verify',
    reason?: string,
    actorUserId?: string
  ): BusinessListing {
    const businesses = this.getBusinesses();
    const item = businesses.find((b) => b.id === businessId);
    if (!item) {
      throw new Error(`Business not found: ${businessId}`);
    }

    if (decision === 'approve') {
      item.moderationStatus = 'published';
      item.status = 'published';
      item.moderationNote = reason || 'Approved by platform moderator.';
    } else if (decision === 'reject') {
      item.moderationStatus = 'rejected';
      item.moderationNote = reason || 'Listing rejected during compliance review.';
    } else if (decision === 'verify') {
      item.isVerified = true;
      item.moderationNote = reason || 'Verified assets and registration deed.';
    }

    storageAdapter.setItem('businesses', businesses);

    this.emitAuditLog({
      actorUserId,
      action: 'business.moderated',
      targetEntity: 'business_listing',
      targetId: businessId,
      details: { decision, reason }
    });

    return item;
  }

  // --- Verification Audits Table ---
  public getVerificationAudits(): VerificationAudit[] {
    return storageAdapter.getItem<VerificationAudit[]>('audits') || [];
  }

  public createVerificationAudit(
    audit: Omit<VerificationAudit, 'id' | 'submissionDate' | 'status'>,
    actorUserId?: string
  ): VerificationAudit {
    if (actorUserId && !this.canUserPerform(actorUserId, 'verification.request')) {
      throw new ForbiddenError('Permission denied to request institutional verification.');
    }

    const audits = this.getVerificationAudits();
    const newAudit: VerificationAudit = {
      ...audit,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      submissionDate: new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    audits.unshift(newAudit);
    storageAdapter.setItem('audits', audits);

    this.emitAuditLog({
      actorUserId,
      action: 'verification.requested',
      targetEntity: 'verification_audit',
      targetId: newAudit.id,
      details: { organizationName: newAudit.organizationName, registryNumber: newAudit.registryNumber }
    });

    return newAudit;
  }

  public updateAuditDecision(
    id: string,
    status: 'approved' | 'rejected',
    actorUserId?: string
  ): VerificationAudit {
    if (actorUserId && !this.canUserPerform(actorUserId, 'verification.decide')) {
      throw new ForbiddenError('Only authorized Verification Officers can approve or reject institutional audits.');
    }

    const audits = this.getVerificationAudits();
    const item = audits.find((a) => a.id === id);
    if (!item) {
      throw new NotFoundError('VerificationAudit', id);
    }
    item.status = status;
    storageAdapter.setItem('audits', audits);

    this.emitAuditLog({
      actorUserId,
      action: `verification.${status}`,
      targetEntity: 'verification_audit',
      targetId: id,
      details: { organizationName: item.organizationName }
    });

    return item;
  }

  // --- Subscriptions ---
  public getOrganizationSubscription(organizationId: string): OrganizationSubscription | null {
    const subscriptions = storageAdapter.getItem<OrganizationSubscription[]>('subscriptions') || [];
    return subscriptions.find(s => s.organizationId === organizationId) || null;
  }

  public saveOrganizationSubscription(subscription: OrganizationSubscription): void {
    const subscriptions = storageAdapter.getItem<OrganizationSubscription[]>('subscriptions') || [];
    const idx = subscriptions.findIndex(s => s.organizationId === subscription.organizationId);
    if (idx >= 0) {
      subscriptions[idx] = subscription;
    } else {
      subscriptions.push(subscription);
    }
    storageAdapter.setItem('subscriptions', subscriptions);
  }

  // --- Users & Credentials Table Queries ---
  public getUsers(): User[] {
    return storageAdapter.getItem<User[]>('users') || [];
  }

  public getUserById(id: string): User | null {
    return this.getUsers().find((u) => u.id === id) || null;
  }

  public getUserByEmail(email: string): User | null {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public getCredentials(): UserAuthCredential[] {
    return storageAdapter.getItem<UserAuthCredential[]>('credentials') || [];
  }

  // --- Conversations & Messaging ---
  public getConversations(): Conversation[] {
    return storageAdapter.getItem<Conversation[]>('conversations') || [];
  }

  public getConversationsForUser(userId: string): Conversation[] {
    return this.getConversations().filter((c) =>
      c.participants.some((p) => p.userId === userId)
    );
  }

  public getConversationById(id: string): Conversation | null {
    return this.getConversations().find((c) => c.id === id) || null;
  }

  public createConversation(data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt' | 'unreadCountByUserId'> & { unreadCountByUserId?: Record<string, number> }): Conversation {
    const conversations = this.getConversations();
    const now = new Date().toISOString();
    const unreadMap: Record<string, number> = {};
    data.participants.forEach((p) => {
      unreadMap[p.userId] = 0;
    });

    const newConv: Conversation = {
      ...data,
      id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      unreadCountByUserId: data.unreadCountByUserId || unreadMap,
      createdAt: now,
      updatedAt: now
    };

    conversations.unshift(newConv);
    storageAdapter.setItem('conversations', conversations);
    return newConv;
  }

  public updateConversation(id: string, patch: Partial<Conversation>): Conversation | null {
    const conversations = this.getConversations();
    const idx = conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const updated = {
      ...conversations[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    conversations[idx] = updated;
    storageAdapter.setItem('conversations', conversations);
    return updated;
  }

  public getDirectMessages(): DirectMessage[] {
    return storageAdapter.getItem<DirectMessage[]>('direct_messages') || [];
  }

  public getMessagesForConversation(conversationId: string): DirectMessage[] {
    return this.getDirectMessages()
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public sendMessage(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    senderRole?: UserRole;
    recipientId: string;
    body: string;
    attachments?: DirectMessage['attachments'];
  }): DirectMessage {
    const messages = this.getDirectMessages();
    const now = new Date().toISOString();

    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      senderRole: data.senderRole,
      recipientId: data.recipientId,
      body: data.body,
      attachments: data.attachments || [],
      isRead: false,
      createdAt: now
    };

    messages.push(newMsg);
    storageAdapter.setItem('direct_messages', messages);

    // Update conversation state
    const conv = this.getConversationById(data.conversationId);
    if (conv) {
      const updatedUnread = { ...conv.unreadCountByUserId };
      updatedUnread[data.recipientId] = (updatedUnread[data.recipientId] || 0) + 1;

      this.updateConversation(data.conversationId, {
        lastMessage: data.body,
        lastMessageAt: now,
        lastSenderId: data.senderId,
        unreadCountByUserId: updatedUnread
      });
    }

    return newMsg;
  }

  public markMessagesAsRead(conversationId: string, userId: string): void {
    const messages = this.getDirectMessages();
    let updatedAny = false;
    const now = new Date().toISOString();

    messages.forEach((m) => {
      if (m.conversationId === conversationId && m.recipientId === userId && !m.isRead) {
        m.isRead = true;
        m.readAt = now;
        updatedAny = true;
      }
    });

    if (updatedAny) {
      storageAdapter.setItem('direct_messages', messages);
    }

    const conv = this.getConversationById(conversationId);
    if (conv && (conv.unreadCountByUserId?.[userId] || 0) > 0) {
      const updatedUnread = { ...conv.unreadCountByUserId };
      updatedUnread[userId] = 0;
      this.updateConversation(conversationId, { unreadCountByUserId: updatedUnread });
    }
  }

  // --- Blocking & Reporting ---
  public getBlockedUsers(userId: string): UserBlock[] {
    const blocks = storageAdapter.getItem<UserBlock[]>('user_blocks') || [];
    return blocks.filter((b) => b.blockingUserId === userId);
  }

  public isUserBlocked(userAId: string, userBId: string): boolean {
    const blocks = storageAdapter.getItem<UserBlock[]>('user_blocks') || [];
    return blocks.some(
      (b) =>
        (b.blockingUserId === userAId && b.blockedUserId === userBId) ||
        (b.blockingUserId === userBId && b.blockedUserId === userAId)
    );
  }

  public blockUser(blockingUserId: string, blockedUserId: string, reason?: string): UserBlock {
    const blocks = storageAdapter.getItem<UserBlock[]>('user_blocks') || [];
    const existing = blocks.find((b) => b.blockingUserId === blockingUserId && b.blockedUserId === blockedUserId);
    if (existing) return existing;

    const newBlock: UserBlock = {
      id: `block-${Date.now()}`,
      blockingUserId,
      blockedUserId,
      reason,
      createdAt: new Date().toISOString()
    };
    blocks.push(newBlock);
    storageAdapter.setItem('user_blocks', blocks);

    // Mark affected conversations as blocked
    const convs = this.getConversations();
    convs.forEach((c) => {
      const hasBoth = c.participants.some((p) => p.userId === blockingUserId) && c.participants.some((p) => p.userId === blockedUserId);
      if (hasBoth) {
        this.updateConversation(c.id, { isBlocked: true, blockedByUserId: blockingUserId });
      }
    });

    return newBlock;
  }

  public unblockUser(blockingUserId: string, blockedUserId: string): void {
    let blocks = storageAdapter.getItem<UserBlock[]>('user_blocks') || [];
    blocks = blocks.filter((b) => !(b.blockingUserId === blockingUserId && b.blockedUserId === blockedUserId));
    storageAdapter.setItem('user_blocks', blocks);

    const convs = this.getConversations();
    convs.forEach((c) => {
      if (c.blockedByUserId === blockingUserId) {
        this.updateConversation(c.id, { isBlocked: false, blockedByUserId: undefined });
      }
    });
  }

  public createMessageReport(data: Omit<MessageReport, 'id' | 'status' | 'createdAt'>): MessageReport {
    const reports = storageAdapter.getItem<MessageReport[]>('message_reports') || [];
    const newReport: MessageReport = {
      ...data,
      id: `rep-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    reports.push(newReport);
    storageAdapter.setItem('message_reports', reports);
    return newReport;
  }

  public getMessageReports(): MessageReport[] {
    return storageAdapter.getItem<MessageReport[]>('message_reports') || [];
  }

  // --- Notifications ---
  public getNotifications(): AppNotification[] {
    return storageAdapter.getItem<AppNotification[]>('notifications') || [];
  }

  public getNotificationsForUser(userId: string): AppNotification[] {
    return this.getNotifications()
      .filter((n) => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(data: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>): AppNotification {
    const notifications = this.getNotifications();
    const newNotif: AppNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(newNotif);
    storageAdapter.setItem('notifications', notifications);
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const notifications = this.getNotifications();
    const notif = notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      notif.readAt = new Date().toISOString();
      storageAdapter.setItem('notifications', notifications);
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    const notifications = this.getNotifications();
    let updated = false;
    const now = new Date().toISOString();
    notifications.forEach((n) => {
      if (n.recipientUserId === userId && !n.isRead) {
        n.isRead = true;
        n.readAt = now;
        updated = true;
      }
    });
    if (updated) {
      storageAdapter.setItem('notifications', notifications);
    }
  }

  // --- PLATFORM TRUST AND SAFETY METHODS ---

  public getVerificationRequests(): VerificationRequest[] {
    return storageAdapter.getItem<VerificationRequest[]>('verification_requests') || [];
  }

  public getVerificationRequestById(id: string): VerificationRequest | undefined {
    return this.getVerificationRequests().find((r) => r.id === id);
  }

  public createVerificationRequest(
    data: Omit<VerificationRequest, 'id' | 'submittedAt' | 'updatedAt'>
  ): VerificationRequest {
    const requests = this.getVerificationRequests();
    const now = new Date().toISOString();
    const newReq: VerificationRequest = {
      ...data,
      id: `verif-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      submittedAt: now,
      updatedAt: now
    };
    requests.unshift(newReq);
    storageAdapter.setItem('verification_requests', requests);
    return newReq;
  }

  public updateVerificationRequest(id: string, updates: Partial<VerificationRequest>): VerificationRequest {
    const requests = this.getVerificationRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(`Verification request ${id} not found`);

    const updated = {
      ...requests[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    requests[idx] = updated;
    storageAdapter.setItem('verification_requests', requests);
    return updated;
  }

  public getContentModerationRecords(): ContentModerationRecord[] {
    return storageAdapter.getItem<ContentModerationRecord[]>('content_moderation_records') || [];
  }

  public getContentModerationRecordById(id: string): ContentModerationRecord | undefined {
    return this.getContentModerationRecords().find((r) => r.id === id);
  }

  public createContentModerationRecord(
    data: Omit<ContentModerationRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): ContentModerationRecord {
    const records = this.getContentModerationRecords();
    const now = new Date().toISOString();
    const newRec: ContentModerationRecord = {
      ...data,
      id: `mod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now
    };
    records.unshift(newRec);
    storageAdapter.setItem('content_moderation_records', records);
    return newRec;
  }

  public updateContentModerationRecord(id: string, updates: Partial<ContentModerationRecord>): ContentModerationRecord {
    const records = this.getContentModerationRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(`Moderation record ${id} not found`);

    const updated = {
      ...records[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    records[idx] = updated;
    storageAdapter.setItem('content_moderation_records', records);
    return updated;
  }

  public getContentReports(): ContentReport[] {
    return storageAdapter.getItem<ContentReport[]>('content_reports') || [];
  }

  public getContentReportById(id: string): ContentReport | undefined {
    return this.getContentReports().find((r) => r.id === id);
  }

  public createContentReport(data: Omit<ContentReport, 'id' | 'createdAt' | 'updatedAt'>): ContentReport {
    const reports = this.getContentReports();
    const now = new Date().toISOString();
    const newReport: ContentReport = {
      ...data,
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now
    };
    reports.unshift(newReport);
    storageAdapter.setItem('content_reports', reports);
    return newReport;
  }

  public updateContentReport(id: string, updates: Partial<ContentReport>): ContentReport {
    const reports = this.getContentReports();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(`Content report ${id} not found`);

    const updated = {
      ...reports[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    reports[idx] = updated;
    storageAdapter.setItem('content_reports', reports);
    return updated;
  }

  public getAccountRestrictions(): AccountRestriction[] {
    return storageAdapter.getItem<AccountRestriction[]>('account_restrictions') || [];
  }

  public getAccountRestrictionsByUserId(userId: string): AccountRestriction[] {
    return this.getAccountRestrictions().filter((r) => r.userId === userId && r.status === 'active');
  }

  public createAccountRestriction(data: Omit<AccountRestriction, 'id' | 'createdAt'>): AccountRestriction {
    const restrictions = this.getAccountRestrictions();
    const newRest: AccountRestriction = {
      ...data,
      id: `rest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    restrictions.unshift(newRest);
    storageAdapter.setItem('account_restrictions', restrictions);
    return newRest;
  }

  public updateAccountRestriction(id: string, updates: Partial<AccountRestriction>): AccountRestriction {
    const restrictions = this.getAccountRestrictions();
    const idx = restrictions.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(`Account restriction ${id} not found`);

    const updated = {
      ...restrictions[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    restrictions[idx] = updated;
    storageAdapter.setItem('account_restrictions', restrictions);
    return updated;
  }

  public getSuspiciousActivityEvents(): SuspiciousActivityEvent[] {
    return storageAdapter.getItem<SuspiciousActivityEvent[]>('suspicious_events') || [];
  }

  public createSuspiciousActivityEvent(data: Omit<SuspiciousActivityEvent, 'id' | 'createdAt'>): SuspiciousActivityEvent {
    const events = this.getSuspiciousActivityEvents();
    const newEv: SuspiciousActivityEvent = {
      ...data,
      id: `susp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    events.unshift(newEv);
    storageAdapter.setItem('suspicious_events', events);
    return newEv;
  }

  public updateSuspiciousActivityEvent(id: string, updates: Partial<SuspiciousActivityEvent>): SuspiciousActivityEvent {
    const events = this.getSuspiciousActivityEvents();
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) throw new NotFoundError(`Suspicious activity event ${id} not found`);

    const updated = {
      ...events[idx],
      ...updates
    };
    events[idx] = updated;
    storageAdapter.setItem('suspicious_events', events);
    return updated;
  }

  // --- Reset Database to Clean State ---
  public reset(): void {
    this.resetToSeedDefaults();
  }

  public resetToSeedDefaults(): void {
    storageAdapter.clear();
    this.initialized = false;
    this.ensureInitialized();
    logger.info('DBClient', 'Database has been reset to default clean seed dataset.');
  }
}

export const db = DatabaseClient.getInstance();
