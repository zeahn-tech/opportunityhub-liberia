/**
 * OPPORTUNITYHUB LIBERIA
 * PRODUCTION RBAC & PERMISSION MATRIX
 *
 * Separation of Platform Roles, Organization Roles, and Personal Capabilities
 */

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'opportunity' | 'application' | 'candidate' | 'organization' | 'business' | 'verification' | 'platform';
  requiresOrganization: boolean;
  requiresResourceOwnership: boolean;
  requiresSubscriptionEntitlement: boolean;
  platformRolesAllowed: string[];
  organizationRolesAllowed: string[];
}

export const PERMISSION_MATRIX: Record<string, PermissionDefinition> = {
  // --- Opportunity Lifecycle ---
  'opportunity.view_published': {
    id: 'opportunity.view_published',
    name: 'View Published Opportunities',
    description: 'Browse all active, approved job vacancies, scholarships, and tenders.',
    category: 'opportunity',
    requiresOrganization: false,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['*'],
    organizationRolesAllowed: ['*']
  },
  'opportunity.view_draft': {
    id: 'opportunity.view_draft',
    name: 'View Draft/Archived Opportunities',
    description: 'View non-published postings within tenant organization.',
    category: 'opportunity',
    requiresOrganization: true,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin', 'recruiter', 'hiring_manager']
  },
  'opportunity.apply': {
    id: 'opportunity.apply',
    name: 'Apply to Opportunity',
    description: 'Submit candidate application, resume dossier, and screening answers.',
    category: 'opportunity',
    requiresOrganization: false,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: [] // Individual capability
  },
  'opportunity.create': {
    id: 'opportunity.create',
    name: 'Create Opportunity',
    description: 'Draft and publish new career opportunities for an organization.',
    category: 'opportunity',
    requiresOrganization: true,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: true, // checks maxActiveJobs
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin', 'recruiter', 'hiring_manager']
  },
  'opportunity.manage': {
    id: 'opportunity.manage',
    name: 'Manage Opportunity',
    description: 'Edit, update status, duplicate, or close an opportunity.',
    category: 'opportunity',
    requiresOrganization: true,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin', 'recruiter']
  },

  // --- Candidate & Applications ---
  'candidate.view_application': {
    id: 'candidate.view_application',
    name: 'View Candidate Application',
    description: 'Access applicant dossier, resume, and screening answers.',
    category: 'candidate',
    requiresOrganization: true,
    requiresResourceOwnership: true, // Candidate can view own; org members can view their applicants
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin', 'recruiter', 'hiring_manager']
  },
  'application.advance_stage': {
    id: 'application.advance_stage',
    name: 'Advance Application Stage',
    description: 'Transition candidates through pipeline stages (interview, offer, hired).',
    category: 'application',
    requiresOrganization: true,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin', 'recruiter', 'hiring_manager']
  },
  'application.withdraw': {
    id: 'application.withdraw',
    name: 'Withdraw Application',
    description: 'Withdraw submitted application from review.',
    category: 'application',
    requiresOrganization: false,
    requiresResourceOwnership: true, // Candidate must own application
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: []
  },

  // --- Organization Administration ---
  'organization.manage': {
    id: 'organization.manage',
    name: 'Manage Organization',
    description: 'Update organization profile, branding, contacts, and settings.',
    category: 'organization',
    requiresOrganization: true,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin']
  },
  'organization.invite_member': {
    id: 'organization.invite_member',
    name: 'Invite Member',
    description: 'Send invitation tokens to prospective team members.',
    category: 'organization',
    requiresOrganization: true,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin']
  },
  'subscription.manage': {
    id: 'subscription.manage',
    name: 'Manage Subscription',
    description: 'Upgrade tier, manage billing cycles, and view invoices.',
    category: 'organization',
    requiresOrganization: true,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: ['owner', 'admin']
  },

  // --- Trust, Safety & Verification ---
  'verification.decide': {
    id: 'verification.decide',
    name: 'Decide Verification Proofs',
    description: 'Audit statutory documents (LBR, LRA, MOFA) and grant official badges.',
    category: 'verification',
    requiresOrganization: false,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin', 'verification_officer'],
    organizationRolesAllowed: []
  },
  'moderation.enforce': {
    id: 'moderation.enforce',
    name: 'Enforce Content Moderation',
    description: 'Quarantine fraudulent listings, issue warning letters, suspend bad actors.',
    category: 'platform',
    requiresOrganization: false,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin', 'moderation_officer'],
    organizationRolesAllowed: []
  },
  'platform.full_audit': {
    id: 'platform.full_audit',
    name: 'Global Platform Audit',
    description: 'View system-wide audit logs, tenant events, and administrative overrides.',
    category: 'platform',
    requiresOrganization: false,
    requiresResourceOwnership: false,
    requiresSubscriptionEntitlement: false,
    platformRolesAllowed: ['platform_admin'],
    organizationRolesAllowed: []
  }
};
