import {
  User,
  Organization,
  OrganizationMembership,
  Opportunity,
  Application,
  UserProfile,
  SystemRole,
  OrgRole,
  UserCapability,
  RBACAction,
  OrganizationSubscription,
  FeatureEntitlement
} from '../../types';
import { db } from '../../db/dbClient';
import { getPlanById } from '../../data/subscriptionPlans';

// ==========================================
// CENTRAL AUTHORIZATION CONTEXT
// ==========================================

export interface AuthorizationContext {
  user: User | null;
  activeOrganization: Organization | null;
  membership: OrganizationMembership | null;
  subscription?: OrganizationSubscription | null;
  capabilities: UserCapability[];
  platformRole: SystemRole;
}

export interface WorkspaceAccessResult {
  allowed: boolean;
  reason?: string;
  actionHint?: string;
}

// ==========================================
// ROLE HIERARCHIES & HELPERS
// ==========================================

export function isPlatformAdmin(context: AuthorizationContext): boolean {
  if (!context.user) return false;
  return context.platformRole === 'platform_admin' || context.user.systemRole === 'platform_admin' || context.user.primaryRole === 'platform_admin';
}

export function isVerificationOfficer(context: AuthorizationContext): boolean {
  if (!context.user) return false;
  const role = context.platformRole || context.user.systemRole;
  return isPlatformAdmin(context) || role === 'verification_officer' || role === 'verifier';
}

export function isModerationOfficer(context: AuthorizationContext): boolean {
  if (!context.user) return false;
  const role = context.platformRole || context.user.systemRole;
  return isPlatformAdmin(context) || role === 'moderation_officer' || role === 'moderator';
}

export function getUserMembershipForOrg(
  userId: string,
  organizationId: string
): OrganizationMembership | null {
  const memberships = db.getMembershipsByUserId(userId);
  return (
    memberships.find(
      (m) => m.organizationId === organizationId && m.status === 'active'
    ) || null
  );
}

// ==========================================
// PERMISSION ENGINE: AUTHORIZATION FUNCTIONS
// ==========================================

/**
 * 1. canViewOpportunity
 * Published opportunities are accessible to all users (including guests).
 * Draft / closed / archived opportunities require platform admin OR
 * active organization membership with opportunity management privileges.
 */
export function canViewOpportunity(
  context: AuthorizationContext,
  opportunity: Opportunity
): boolean {
  if (opportunity.status === 'published') {
    return true;
  }

  // Non-published opportunities require authorization
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (isPlatformAdmin(context)) {
    return true;
  }

  const membership = getUserMembershipForOrg(context.user.id, opportunity.organizationId);
  if (!membership) return false;

  const role = membership.orgRole;
  if (role === 'owner' || role === 'admin' || role === 'recruiter' || role === 'hiring_manager') {
    return true;
  }

  return (
    membership.permissions.includes('all') ||
    membership.permissions.includes('opportunities.create') ||
    membership.permissions.includes('opportunities.edit') ||
    membership.permissions.includes('opportunities.delete')
  );
}

/**
 * 2. canApply
 * Authenticated, non-suspended user applying to a published opportunity.
 * Users with job_seeker or service_provider capabilities can apply.
 */
export function canApply(
  context: AuthorizationContext,
  opportunity: Opportunity
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (opportunity.status !== 'published') {
    return false;
  }

  // Resource ownership check: Candidate cannot apply if they own/posted this vacancy as org owner/recruiter
  if (opportunity.organizationId) {
    const membership = getUserMembershipForOrg(context.user.id, opportunity.organizationId);
    if (membership && (membership.orgRole === 'owner' || membership.orgRole === 'recruiter')) {
      // Organization owners/recruiters cannot apply to their own organization's posted vacancies
      return false;
    }
  }

  // Check personal capabilities
  const caps = context.capabilities || context.user.capabilities || [];
  const hasSeekerCapability =
    caps.includes('job_seeker') ||
    caps.includes('find_opportunities') ||
    caps.includes('service_provider') ||
    caps.includes('offer_services') ||
    context.user.primaryRole === 'job_seeker' ||
    context.user.primaryRole === 'service_provider';

  return hasSeekerCapability || isPlatformAdmin(context);
}

/**
 * 3. canCreateOpportunity
 * Requires:
 * - Authenticated user with active account
 * - Target organization membership with role (owner, admin, recruiter, hiring_manager)
 *   OR permission 'opportunities.create' / 'all'
 * - Platform admin bypasses organization requirement
 * - Subscription entitlement enforcement: maxActiveJobs limit check
 */
export function canCreateOpportunity(
  context: AuthorizationContext,
  organizationId?: string
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (isPlatformAdmin(context)) {
    return true;
  }

  const targetOrgId = organizationId || context.activeOrganization?.id;
  if (!targetOrgId) {
    return false;
  }

  const membership = getUserMembershipForOrg(context.user.id, targetOrgId);
  if (!membership) {
    return false;
  }

  const role = membership.orgRole;
  const hasRole = role === 'owner' || role === 'admin' || role === 'recruiter' || role === 'hiring_manager';
  const hasPermission =
    membership.permissions.includes('all') ||
    membership.permissions.includes('opportunities.create');

  if (!hasRole && !hasPermission) {
    return false;
  }

  // Subscription Entitlement Check:
  // Enforce maxActiveJobs entitlement if subscription plan limits active postings
  const sub = context.subscription || db.getOrganizationSubscription(targetOrgId);
  if (sub) {
    const plan = getPlanById(sub.planId);
    if (plan && plan.entitlements && plan.entitlements.maxActiveJobs !== 'unlimited') {
      const activeJobsCount = db
        .getOpportunities()
        .filter((o) => o.organizationId === targetOrgId && o.status === 'published').length;

      if (activeJobsCount >= plan.entitlements.maxActiveJobs) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 4. canManageOpportunity
 * Allows editing, updating stages, pausing, or deleting opportunities.
 * Requires platform admin OR organization membership with owner/admin/recruiter
 * OR explicit permission 'opportunities.edit' / 'opportunities.delete' / 'all'.
 */
export function canManageOpportunity(
  context: AuthorizationContext,
  opportunity: Opportunity
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (isPlatformAdmin(context)) {
    return true;
  }

  const membership = getUserMembershipForOrg(context.user.id, opportunity.organizationId);
  if (!membership) {
    return false;
  }

  const role = membership.orgRole;
  if (role === 'owner' || role === 'admin' || role === 'recruiter') {
    return true;
  }

  return (
    membership.permissions.includes('all') ||
    membership.permissions.includes('opportunities.edit') ||
    membership.permissions.includes('opportunities.delete')
  );
}

/**
 * 5. canManageOrganization
 * Updating organization profile, branding, verification requests, settings.
 * Requires platform admin OR organization owner / admin.
 */
export function canManageOrganization(
  context: AuthorizationContext,
  organizationId: string
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (isPlatformAdmin(context)) {
    return true;
  }

  const membership = getUserMembershipForOrg(context.user.id, organizationId);
  if (!membership) {
    return false;
  }

  const role = membership.orgRole;
  if (role === 'owner' || role === 'admin') {
    return true;
  }

  return (
    membership.permissions.includes('all') ||
    membership.permissions.includes('settings.edit') ||
    membership.permissions.includes('members.manage')
  );
}

/**
 * 6. canInviteMember
 * Inviting new teammates and managing organization seats.
 * Requires platform admin OR organization owner/admin OR explicit 'members.invite' permission.
 */
export function canInviteMember(
  context: AuthorizationContext,
  organizationId: string
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (isPlatformAdmin(context)) {
    return true;
  }

  const membership = getUserMembershipForOrg(context.user.id, organizationId);
  if (!membership) {
    return false;
  }

  const role = membership.orgRole;
  if (role === 'owner' || role === 'admin') {
    return true;
  }

  return (
    membership.permissions.includes('all') ||
    membership.permissions.includes('members.invite') ||
    membership.permissions.includes('members.manage')
  );
}

/**
 * 7. canViewCandidate
 * Resource ownership & tenant authorization:
 * - Candidate viewing their own profile/application: ALWAYS ALLOWED
 * - Organization recruiter/hiring manager/admin: Allowed ONLY for applications submitted to their org
 * - Platform admin: ALLOWED
 * - Competing orgs or unrelated seekers: DENIED
 */
export function canViewCandidate(
  context: AuthorizationContext,
  candidateOrApp: {
    applicantUserId?: string;
    userId?: string;
    organizationId?: string;
  }
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  // 1. Resource Ownership: Candidate viewing their own application/profile
  const candidateOwnerId = candidateOrApp.applicantUserId || candidateOrApp.userId;
  if (candidateOwnerId && candidateOwnerId === context.user.id) {
    return true;
  }

  // 2. Platform Admin
  if (isPlatformAdmin(context)) {
    return true;
  }

  // 3. Organization tenant authorization
  if (candidateOrApp.organizationId) {
    const membership = getUserMembershipForOrg(context.user.id, candidateOrApp.organizationId);
    if (!membership) {
      return false;
    }

    const role = membership.orgRole;
    if (role === 'owner' || role === 'admin' || role === 'recruiter' || role === 'hiring_manager') {
      return true;
    }

    return (
      membership.permissions.includes('all') ||
      membership.permissions.includes('applications.view')
    );
  }

  return false;
}

/**
 * 8. canManageSubscription
 * Upgrading, downgrading, or managing billing for an organization.
 * Requires platform admin OR organization owner/admin.
 */
export function canManageSubscription(
  context: AuthorizationContext,
  organizationId: string
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (isPlatformAdmin(context)) {
    return true;
  }

  const membership = getUserMembershipForOrg(context.user.id, organizationId);
  if (!membership) {
    return false;
  }

  const role = membership.orgRole;
  return role === 'owner' || role === 'admin' || membership.permissions.includes('all');
}

/**
 * 9. canModerate
 * Content moderation, handling fraud reports, reviewing listings.
 * Requires platform_admin or moderation_officer.
 */
export function canModerate(context: AuthorizationContext): boolean {
  return isModerationOfficer(context);
}

/**
 * 10. canVerify
 * Approving statutory filings, reviewing audit queue, granting official badges.
 * Requires platform_admin or verification_officer.
 */
export function canVerify(context: AuthorizationContext): boolean {
  return isVerificationOfficer(context);
}

// ==========================================
// RESOURCE OWNERSHIP CHECKS
// ==========================================

export function isResourceOwner(
  context: AuthorizationContext,
  resourceOwnerUserId?: string
): boolean {
  if (!context.user || !resourceOwnerUserId) return false;
  return context.user.id === resourceOwnerUserId;
}

export function canModifyResource(
  context: AuthorizationContext,
  resource: {
    ownerUserId?: string;
    organizationId?: string;
  }
): boolean {
  if (!context.user) return false;
  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  if (isPlatformAdmin(context)) {
    return true;
  }

  // Personal resource ownership
  if (resource.ownerUserId && resource.ownerUserId === context.user.id) {
    return true;
  }

  // Organization resource ownership
  if (resource.organizationId) {
    const membership = getUserMembershipForOrg(context.user.id, resource.organizationId);
    if (membership) {
      return (
        membership.orgRole === 'owner' ||
        membership.orgRole === 'admin' ||
        membership.permissions.includes('all')
      );
    }
  }

  return false;
}

// ==========================================
// WORKSPACE ROUTE AUTHORIZATION GUARD
// ==========================================

/**
 * Evaluates access to top-level platform workspaces.
 * Returns professional error reasons — NEVER "Switch your persona."
 */
export function canAccessWorkspace(
  context: AuthorizationContext,
  workspace: 'recruiter' | 'candidate' | 'verification' | 'admin' | 'billing' | 'businesses' | 'opportunities'
): WorkspaceAccessResult {
  // Public workspaces
  if (workspace === 'opportunities' || workspace === 'businesses') {
    return { allowed: true };
  }

  if (!context.user) {
    return {
      allowed: false,
      reason: "You don't have permission to access this workspace.",
      actionHint: 'Please sign in to access your workspace.'
    };
  }

  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return {
      allowed: false,
      reason: 'Your account has been restricted.',
      actionHint: 'Please contact platform trust & safety for assistance.'
    };
  }

  switch (workspace) {
    case 'recruiter': {
      if (isPlatformAdmin(context)) {
        return { allowed: true };
      }
      // Check if user belongs to an organization with recruiter, owner, admin, or hiring manager role
      const memberships = db.getMembershipsByUserId(context.user.id);
      const activeMemberships = memberships.filter((m) => m.status === 'active');

      if (activeMemberships.length === 0) {
        return {
          allowed: false,
          reason: "You don't have permission to access this workspace.",
          actionHint: 'An active organization membership with recruiter or employer privileges is required.'
        };
      }

      const hasPrivilegedRole = activeMemberships.some(
        (m) =>
          m.orgRole === 'owner' ||
          m.orgRole === 'admin' ||
          m.orgRole === 'recruiter' ||
          m.orgRole === 'hiring_manager' ||
          m.permissions.includes('all') ||
          m.permissions.includes('opportunities.create')
      );

      if (!hasPrivilegedRole) {
        return {
          allowed: false,
          reason: "You don't have permission to access this workspace.",
          actionHint: 'Your organization membership role does not have recruitment or posting authorization.'
        };
      }

      return { allowed: true };
    }

    case 'admin': {
      if (isPlatformAdmin(context) || isModerationOfficer(context) || isVerificationOfficer(context)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "You don't have permission to access this workspace.",
        actionHint: 'This command center is restricted to authorized platform administrators and officers.'
      };
    }

    case 'verification': {
      // Browsing standards and submitting an audit is open to all authenticated users
      return { allowed: true };
    }

    case 'billing': {
      if (isPlatformAdmin(context)) {
        return { allowed: true };
      }
      const activeOrgId = context.activeOrganization?.id;
      if (!activeOrgId) {
        return {
          allowed: false,
          reason: "You don't have permission to access this workspace.",
          actionHint: 'Please select an active organization to manage subscriptions and invoices.'
        };
      }
      if (!canManageSubscription(context, activeOrgId)) {
        return {
          allowed: false,
          reason: "You don't have permission to access this workspace.",
          actionHint: 'Only organization owners or billing administrators can manage subscription tiers.'
        };
      }
      return { allowed: true };
    }

    case 'candidate': {
      // Any authenticated user can manage their personal profile and applications
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

// ==========================================
// CENTRALIZED RBAC ACTION EVALUATOR
// ==========================================

export function evaluatePermission(
  context: AuthorizationContext,
  action: RBACAction,
  resourceTenantId?: string,
  resourceOwnerUserId?: string
): boolean {
  if (!context.user) {
    if (action === 'opportunity.browse' || action === 'business.browse') {
      return true;
    }
    return false;
  }

  if (context.user.accountStatus === 'suspended' || context.user.accountStatus === 'deactivated') {
    return false;
  }

  // Platform admin global override
  if (isPlatformAdmin(context)) {
    return true;
  }

  switch (action) {
    case 'opportunity.browse':
    case 'business.browse':
      return true;

    case 'opportunity.apply': {
      const dummyOpp: Opportunity = {
        id: 'test-opp',
        organizationId: resourceTenantId || '',
        status: 'published'
      } as Opportunity;
      return canApply(context, dummyOpp);
    }

    case 'opportunity.create':
      return canCreateOpportunity(context, resourceTenantId);

    case 'opportunity.edit':
    case 'opportunity.delete': {
      if (!resourceTenantId) return false;
      const dummyOpp: Opportunity = {
        id: 'test-opp',
        organizationId: resourceTenantId,
        status: 'published'
      } as Opportunity;
      return canManageOpportunity(context, dummyOpp);
    }

    case 'application.review':
    case 'application.advance_stage': {
      if (!resourceTenantId) return false;
      return canViewCandidate(context, { organizationId: resourceTenantId });
    }

    case 'application.withdraw':
      return isResourceOwner(context, resourceOwnerUserId);

    case 'candidate.view_profile':
      return canViewCandidate(context, {
        userId: resourceOwnerUserId,
        organizationId: resourceTenantId
      });

    case 'candidate.edit_profile':
      return isResourceOwner(context, resourceOwnerUserId);

    case 'business.list':
      return (
        context.capabilities.includes('seller') ||
        context.capabilities.includes('sell_business') ||
        context.user.primaryRole === 'business_seller'
      );

    case 'business.edit':
    case 'business.approve_access':
    case 'business.moderate':
      if (resourceOwnerUserId) {
        return isResourceOwner(context, resourceOwnerUserId) || isModerationOfficer(context);
      }
      return isModerationOfficer(context);

    case 'business.request_nda':
      return true;

    case 'organization.create':
      return true;

    case 'organization.manage_members':
    case 'organization.edit_profile':
    case 'organization.edit_settings':
      if (!resourceTenantId) return false;
      return canManageOrganization(context, resourceTenantId);

    case 'organization.invite_member':
    case 'organization.view_invitations':
      if (!resourceTenantId) return false;
      return canInviteMember(context, resourceTenantId);

    case 'verification.request':
      return true;

    case 'verification.decide':
      return canVerify(context);

    case 'user.manage_status':
    case 'audit.view_global':
    case 'platform.admin_access':
      return isPlatformAdmin(context);

    default:
      return false;
  }
}
