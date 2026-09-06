import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/dbClient';
import { TenantIsolationError, ForbiddenError, ValidationError } from '../core/errors/AppError';
import { OrganizationType } from '../types';

describe('Multi-Tenant Organization System & Tenant Isolation', () => {
  beforeEach(() => {
    db.resetToSeedDefaults();
  });

  const orgTypes: OrganizationType[] = [
    'private_company',
    'ngo',
    'government_institution',
    'recruitment_agency',
    'small_business'
  ];

  it('supports creating all required organization types with complete metadata and settings', () => {
    const creatorUser = db.getUserByEmail('tamba.kollie@gmail.com');
    expect(creatorUser).toBeDefined();

    for (const orgType of orgTypes) {
      const orgName = `Test Enterprise ${orgType.toUpperCase()}`;
      const newOrg = db.createOrganization(
        {
          name: orgName,
          type: orgType,
          industry: 'Technology & Logistics',
          county: 'Montserrado',
          cityDistrict: 'Paynesville',
          logoText: 'TE',
          description: `Comprehensive organization for ${orgType}`,
          website: 'https://opportunityhub.lr/org',
          contactEmail: `info@${orgType}.lr`,
          contactPhone: '+231-770-000-111',
          isVerified: false,
          verificationStatus: 'unverified',
          settings: {
            defaultCurrency: 'USD',
            candidateAlertEmail: `alerts@${orgType}.lr`,
            lowBandwidthDefault: true,
            isPubliclyListed: true,
            notifyOnApplications: true,
            requireCoverNote: true
          }
        },
        creatorUser!.id
      );

      expect(newOrg.id).toMatch(/^org-/);
      expect(newOrg.type).toBe(orgType);
      expect(newOrg.settings?.requireCoverNote).toBe(true);
      expect(newOrg.settings?.candidateAlertEmail).toBe(`alerts@${orgType}.lr`);

      // Verify creator was automatically assigned as active owner
      const members = db.getOrganizationMembers(newOrg.id, creatorUser!.id);
      const ownerMember = members.find((m) => m.userId === creatorUser!.id);
      expect(ownerMember).toBeDefined();
      expect(ownerMember?.orgRole).toBe('owner');
      expect(ownerMember?.permissions).toContain('all');
    }
  });

  it('enforces strict tenant isolation: an organization member cannot view another organization members', () => {
    // User 1: Dr. Evelyn Fahnbulleh belongs to Save the Children (org-save-children)
    const evelyn = db.getUserByEmail('hiring@savethechildren.lr');
    // User 2: Hon. Emmanuel Sumo belongs to Ministry of Public Works (org-mpw-gov)
    const emmanuel = db.getUserByEmail('procurement@mpw.gov.lr');

    expect(evelyn).toBeDefined();
    expect(emmanuel).toBeDefined();

    // Evelyn can view her own organization members
    const saveChildrenMembers = db.getOrganizationMembers('org-save-children', evelyn!.id);
    expect(saveChildrenMembers.length).toBeGreaterThan(0);

    // Evelyn CANNOT access MPW's internal members (must throw TenantIsolationError)
    expect(() => {
      db.getOrganizationMembers('org-mpw-gov', evelyn!.id);
    }).toThrow(TenantIsolationError);

    // Emmanuel can view MPW's members
    const mpwMembers = db.getOrganizationMembers('org-mpw-gov', emmanuel!.id);
    expect(mpwMembers.length).toBeGreaterThan(0);

    // Emmanuel CANNOT access Save the Children's members (must throw TenantIsolationError)
    expect(() => {
      db.getOrganizationMembers('org-save-children', emmanuel!.id);
    }).toThrow(TenantIsolationError);
  });

  it('enforces strict tenant isolation on organization settings and profile modification', () => {
    const evelyn = db.getUserByEmail('hiring@savethechildren.lr');
    const emmanuel = db.getUserByEmail('procurement@mpw.gov.lr');

    // Evelyn updates Save the Children settings successfully
    const updatedSave = db.updateOrganizationSettings(
      'org-save-children',
      { lowBandwidthDefault: false, defaultCurrency: 'LRD' },
      evelyn!.id
    );
    expect(updatedSave.settings.defaultCurrency).toBe('LRD');

    // Evelyn attempts to modify MPW's settings -> TenantIsolationError
    expect(() => {
      db.updateOrganizationSettings(
        'org-mpw-gov',
        { defaultCurrency: 'USD' },
        evelyn!.id
      );
    }).toThrow(TenantIsolationError);

    // Evelyn attempts to modify MPW's profile -> TenantIsolationError
    expect(() => {
      db.updateOrganizationProfile(
        'org-mpw-gov',
        { description: 'Hacked description' },
        evelyn!.id
      );
    }).toThrow(TenantIsolationError);

    // Emmanuel updates MPW profile successfully
    const updatedMpw = db.updateOrganizationProfile(
      'org-mpw-gov',
      { website: 'https://mpw.gov.lr' },
      emmanuel!.id
    );
    expect(updatedMpw.website).toBe('https://mpw.gov.lr');
  });

  it('enforces tenant isolation on candidate job applications', () => {
    const evelyn = db.getUserByEmail('hiring@savethechildren.lr');
    const emmanuel = db.getUserByEmail('procurement@mpw.gov.lr');

    // Evelyn can query Save the Children applications
    const saveApps = db.getApplicationsByOrganization('org-save-children', evelyn!.id);
    expect(Array.isArray(saveApps)).toBe(true);

    // Evelyn cannot query MPW applications
    expect(() => {
      db.getApplicationsByOrganization('org-mpw-gov', evelyn!.id);
    }).toThrow(TenantIsolationError);

    // Emmanuel cannot query Save the Children applications
    expect(() => {
      db.getApplicationsByOrganization('org-save-children', emmanuel!.id);
    }).toThrow(TenantIsolationError);
  });

  it('manages member lifecycle: invitations, acceptance, role updating, and sole owner protection', async () => {
    const owner = db.getUserByEmail('hiring@savethechildren.lr');
    expect(owner).toBeDefined();

    // 1. Create an invitation
    const inviteeEmail = 'newhire.liberia@example.com';
    const invitation = db.createInvitation(
      'org-save-children',
      inviteeEmail,
      'member',
      ['opportunities.create', 'applications.view'],
      owner!.id
    );

    expect(invitation.token).toMatch(/^inv_/);
    expect(invitation.status).toBe('pending');

    // Evelyn can view invitations for her organization
    const orgInvs = db.getOrganizationInvitations('org-save-children', owner!.id);
    expect(orgInvs.some((i) => i.id === invitation.id)).toBe(true);

    // Emmanuel (MPW) cannot view Save the Children invitations
    const emmanuel = db.getUserByEmail('procurement@mpw.gov.lr');
    expect(() => {
      db.getOrganizationInvitations('org-save-children', emmanuel!.id);
    }).toThrow(TenantIsolationError);

    // 2. Register new user for the invitee and accept the invitation
    const registered = await db.registerUser({
      fullName: 'New Hire Liberia',
      email: inviteeEmail,
      password: 'Password123!',
      primaryRole: 'employer',
      primaryCounty: 'Montserrado'
    });

    const membership = db.acceptInvitation(invitation.token, registered.user.id);
    expect(membership.orgRole).toBe('member');
    expect(membership.organizationId).toBe('org-save-children');
    expect(membership.status).toBe('active');

    // 3. Update role and permissions
    const updatedMembership = db.updateMemberRoleAndPermissions(
      'org-save-children',
      membership.id,
      'admin',
      ['all'],
      owner!.id
    );
    expect(updatedMembership.orgRole).toBe('admin');

    // 4. Sole Owner Protection: Evelyn cannot demote herself if she is the only owner
    const evelynMembership = db
      .getMembershipsByOrganization('org-save-children')
      .find((m) => m.userId === owner!.id);
    expect(evelynMembership).toBeDefined();

    expect(() => {
      db.updateMemberRoleAndPermissions(
        'org-save-children',
        evelynMembership!.id,
        'member',
        [],
        owner!.id
      );
    }).toThrow(ValidationError);

    expect(() => {
      db.removeMember('org-save-children', evelynMembership!.id, owner!.id);
    }).toThrow(ValidationError);

    // 5. Remove newly added member
    db.removeMember('org-save-children', membership.id, owner!.id);
    const postRemovalMembers = db.getOrganizationMembers('org-save-children', owner!.id);
    expect(postRemovalMembers.some((m) => m.id === membership.id)).toBe(false);
  });

  it('supports organization verification requests and decisions', () => {
    const owner = db.getUserByEmail('hiring@savethechildren.lr');
    const verifier = db.getUserByEmail('procurement@mpw.gov.lr');

    // Request verification
    const pendingOrg = db.requestOrganizationVerification(
      'org-save-children',
      {
        registrationNumber: 'LBR-REG-2026-9921',
        taxIdNumber: 'TIN-LIB-0099881',
        documentNotes: 'Articles of incorporation and MOFA accreditation attached.'
      },
      owner!.id
    );
    expect(pendingOrg.verificationStatus).toBe('pending');
    expect(pendingOrg.registrationNumber).toBe('LBR-REG-2026-9921');

    // Regular employer cannot decide verification
    expect(() => {
      db.decideOrganizationVerification('org-save-children', 'approved', 'verified_enterprise', undefined, owner!.id);
    }).toThrow(ForbiddenError);

    // Authorized verifier approves verification
    const verifiedOrg = db.decideOrganizationVerification(
      'org-save-children',
      'approved',
      'verified_enterprise',
      undefined,
      verifier!.id
    );
    expect(verifiedOrg.verificationStatus).toBe('verified');
    expect(verifiedOrg.isVerified).toBe(true);
    expect(verifiedOrg.verificationBadge).toBe('verified_enterprise');
  });

  it('allows platform administrators governance access across organizations', () => {
    const admin = db.getUserByEmail('admin@opportunityhub.lr');
    expect(admin).toBeDefined();

    // Platform administrator can inspect any organization's members
    const nimbaMembers = db.getOrganizationMembers('org-nimba-agri', admin!.id);
    expect(nimbaMembers.length).toBeGreaterThan(0);

    const saveChildrenMembers = db.getOrganizationMembers('org-save-children', admin!.id);
    expect(saveChildrenMembers.length).toBeGreaterThan(0);
  });
});
