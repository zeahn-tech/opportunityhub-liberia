import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/dbClient';
import { authService } from '../services/authService';
import { validatePasswordPolicy, hashPassword } from '../core/security/crypto';

describe('Production Authentication & User Account Management', () => {
  const testEmail = 'test.liberian.engineer@opportunityhub.lr';
  const testPassword = 'StrongPassword2026!';

  beforeEach(() => {
    // Reset database to ensure clean state
    db.reset();
  });

  describe('1. Security Primitives & Password Policy', () => {
    it('enforces rigorous password complexity', () => {
      // Too short (< 8)
      expect(validatePasswordPolicy('Ab1!').valid).toBe(false);
      // No letters
      expect(validatePasswordPolicy('12345678!').valid).toBe(false);
      // No numbers or symbols
      expect(validatePasswordPolicy('abcdefghij').valid).toBe(false);
      // Compliant
      expect(validatePasswordPolicy(testPassword).valid).toBe(true);
    });

    it('generates cryptographic hash with unique salt', async () => {
      const salt1 = 'salt-1';
      const salt2 = 'salt-2';
      const hash1 = await hashPassword('Secret123!', salt1);
      const hash2 = await hashPassword('Secret123!', salt2);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('2. User Registration Flow', () => {
    it('successfully registers a new user with credentials, profile, and session', async () => {
      const result = await db.registerUser({
        email: testEmail,
        password: testPassword,
        fullName: 'Patrick W. Sumo',
        primaryRole: 'service_provider',
        phoneNumber: '+231 77 999 8888',
        primaryCounty: 'Nimba',
        organizationName: 'Sumo Technical Works'
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.user.fullName).toBe('Patrick W. Sumo');
      expect(result.user.primaryCounty).toBe('Nimba');
      expect(result.user.accountStatus).toBe('pending_verification');
      expect(result.user.isEmailVerified).toBe(false);

      // Session should be created
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe(result.user.id);
      expect(result.session.isValid).toBe(true);

      // Profile should be seeded
      const profile = db.getUserProfile(result.user.id);
      expect(profile).toBeDefined();
      expect(profile?.phone || profile?.phoneNumber).toBe('+231 77 999 8888');

      // Organization membership should be created
      const memberships = db.getMembershipsByUserId(result.user.id);
      expect(memberships.length).toBe(1);
      expect(memberships[0].orgRole).toBe('owner');
    });

    it('rejects registration with weak password', async () => {
      await expect(
        db.registerUser({
          email: 'weak@example.lr',
          password: '123',
          fullName: 'Weak User',
          primaryRole: 'job_seeker'
        })
      ).rejects.toThrow(/Password must be at least 8 characters/);
    });

    it('rejects registration with duplicate email address', async () => {
      // First registration succeeds
      await db.registerUser({
        email: 'duplicate@example.lr',
        password: testPassword,
        fullName: 'Original User',
        primaryRole: 'job_seeker'
      });

      // Second registration with same email fails
      await expect(
        db.registerUser({
          email: 'duplicate@example.lr',
          password: testPassword,
          fullName: 'Imposter User',
          primaryRole: 'job_seeker'
        })
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('3. Authentication & Lockout Security', () => {
    it('authenticates valid credentials successfully', async () => {
      // Using seed user Tamba Kollie
      const res = await db.authenticateUser('tamba.kollie@gmail.com', 'Password123!');
      expect(res.user).toBeDefined();
      expect(res.user.fullName).toBe('Tamba Kollie');
      expect(res.session.token).toBeDefined();
    });

    it('tracks failed attempts and locks out account after 5 failures', async () => {
      const email = 'tamba.kollie@gmail.com';

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await expect(db.authenticateUser(email, 'WrongPassword123!')).rejects.toThrow(/Invalid email or password/);
      }

      // 5th failed attempt triggers lockout
      await expect(db.authenticateUser(email, 'WrongPassword123!')).rejects.toThrow(/locked/);

      // Even correct password is now blocked while locked out
      await expect(db.authenticateUser(email, 'Password123!')).rejects.toThrow(/locked/);
    });

    it('blocks login for suspended or inactive accounts', async () => {
      const user = db.getUserById('user-seeker-1');
      expect(user).toBeDefined();

      // Suspend account (targetUserId, status, reason, actorUserId)
      db.updateAccountStatus(user!.id, 'suspended', 'Terms violation', 'user-admin-1');

      await expect(db.authenticateUser('tamba.kollie@gmail.com', 'Password123!')).rejects.toThrow(
        /account has been suspended/i
      );
    });
  });

  describe('4. Session Management & Revocation', () => {
    it('validates authentic session token', async () => {
      const { session } = await db.authenticateUser('tamba.kollie@gmail.com', 'Password123!');
      const validated = db.validateSession(session.token);

      expect(validated.user.fullName).toBe('Tamba Kollie');
      expect(validated.session.id).toBe(session.id);
    });

    it('revokes session on explicit logout', async () => {
      const { session } = await db.authenticateUser('tamba.kollie@gmail.com', 'Password123!');
      db.revokeSession(session.token);

      expect(() => db.validateSession(session.token)).toThrow(/Session is invalid or expired/);
    });

    it('allows revoking all other sessions while maintaining current session', async () => {
      const user = db.getUserById('user-seeker-1')!;

      // Create three sessions
      const s1 = db.createSession(user.id, 'Mobile Safari');
      const s2 = db.createSession(user.id, 'Desktop Chrome');
      const s3 = db.createSession(user.id, 'Work Laptop');

      // Revoke all except s3
      const revokedCount = db.revokeAllUserSessions(user.id, s3.token);
      expect(revokedCount).toBeGreaterThanOrEqual(2);

      // s1 and s2 should now be invalid
      expect(() => db.validateSession(s1.token)).toThrow();
      expect(() => db.validateSession(s2.token)).toThrow();

      // s3 remains valid
      const validS3 = db.validateSession(s3.token);
      expect(validS3.session.id).toBe(s3.id);
    });
  });

  describe('5. Password Recovery & Reset Flow', () => {
    it('generates a reset token, completes reset, and updates authentication', async () => {
      const email = 'tamba.kollie@gmail.com';
      const recovery = await db.requestPasswordReset(email);

      expect(recovery.success).toBe(true);
      expect(recovery.resetToken).toBeDefined();

      const newSecret = 'LiberiaNewPass2026!';

      // Reset password with token
      const updatedUser = await db.resetPassword(recovery.resetToken!, newSecret);
      expect(updatedUser.email).toBe(email);

      // Old password should now fail
      await expect(db.authenticateUser(email, 'Password123!')).rejects.toThrow();

      // New password should succeed
      const authenticated = await db.authenticateUser(email, newSecret);
      expect(authenticated.user.fullName).toBe('Tamba Kollie');
    });

    it('rejects invalid or forged reset tokens', async () => {
      await expect(db.resetPassword('fake-reset-token-999', 'AnyPass123!')).rejects.toThrow(
        /invalid or has expired/
      );
    });
  });

  describe('6. Email Verification Flow', () => {
    it('verifies pending account and activates it', async () => {
      // Register new user
      const { user } = await db.registerUser({
        email: 'pending.verify@opportunityhub.lr',
        password: testPassword,
        fullName: 'Musu Sirleaf',
        primaryRole: 'job_seeker'
      });

      expect(user.isEmailVerified).toBe(false);
      expect(user.accountStatus).toBe('pending_verification');

      // Verify email
      const cred = db.getCredentials().find((c) => c.userId === user.id);
      const token = cred?.emailVerificationToken;
      expect(token).toBeDefined();

      const verified = db.verifyEmail(token!);
      expect(verified.isEmailVerified).toBe(true);
      expect(verified.accountStatus).toBe('active');
    });
  });

  describe('7. Profile Management', () => {
    it('updates user profile and persists fields', () => {
      const seeker = db.getUserById('user-seeker-1')!;

      const result = db.updateUserProfile(
        seeker.id,
        {
          fullName: 'Tamba M. Kollie, PMP',
          headline: 'Director of Logistics & Operations',
          city: 'Paynesville',
          skills: ['Logistics', 'Fleet Management', 'Public Health Supply Chain'],
          visibility: 'registered_only'
        },
        seeker.id
      );

      expect(result.user.fullName).toBe('Tamba M. Kollie, PMP');
      expect(result.profile.headline).toBe('Director of Logistics & Operations');
      expect(result.profile.city).toBe('Paynesville');
      expect(result.profile.skills).toContain('Public Health Supply Chain');
      expect(result.profile.visibility).toBe('registered_only');
    });

    it('denies profile update by unauthorized non-admin user', () => {
      const victim = db.getUserById('user-seeker-1')!;
      const attacker = db.getUserById('user-employer-1')!;

      expect(() => {
        db.updateUserProfile(
          victim.id,
          { fullName: 'Hacked Name' },
          attacker.id // Not the owner, and not a platform admin!
        );
      }).toThrow(/only modify your own personal profile/);
    });
  });

  describe('8. Multi-Role Authorization & Tenant Boundaries (All 8 Roles)', () => {
    it('evaluates Job Seeker authorizations', () => {
      const seekerId = 'user-seeker-1';
      expect(db.canUserPerform(seekerId, 'opportunity.browse')).toBe(true);
      expect(db.canUserPerform(seekerId, 'opportunity.apply')).toBe(true);
      expect(db.canUserPerform(seekerId, 'opportunity.create')).toBe(false);
      expect(db.canUserPerform(seekerId, 'business.list')).toBe(false);
      expect(db.canUserPerform(seekerId, 'verification.decide')).toBe(false);
    });

    it('evaluates Employer authorizations with strict tenant boundary isolation', () => {
      const employerId = 'user-employer-1'; // Belongs to org-save-children
      const myTenant = 'org-save-children';
      const foreignTenant = 'org-nimba-agri';

      // Within own organization
      expect(db.canUserPerform(employerId, 'opportunity.create', myTenant)).toBe(true);
      expect(db.canUserPerform(employerId, 'opportunity.edit', myTenant)).toBe(true);
      expect(db.canUserPerform(employerId, 'application.review', myTenant)).toBe(true);

      // Across another tenant's organization -> STRICTLY DENIED!
      expect(db.canUserPerform(employerId, 'opportunity.create', foreignTenant)).toBe(false);
      expect(db.canUserPerform(employerId, 'opportunity.edit', foreignTenant)).toBe(false);
      expect(db.canUserPerform(employerId, 'application.review', foreignTenant)).toBe(false);
    });

    it('evaluates Recruiter authorizations', () => {
      const recruiterId = 'user-recruiter-1'; // Belongs to org-nimba-agri
      expect(db.canUserPerform(recruiterId, 'opportunity.create', 'org-nimba-agri')).toBe(true);
      expect(db.canUserPerform(recruiterId, 'application.review', 'org-nimba-agri')).toBe(true);
      expect(db.canUserPerform(recruiterId, 'opportunity.create', 'org-save-children')).toBe(false);
    });

    it('evaluates Business Seller authorizations', () => {
      const sellerId = 'user-seller-1';
      expect(db.canUserPerform(sellerId, 'business.list')).toBe(true);
      expect(db.canUserPerform(sellerId, 'business.approve_access')).toBe(true);
      expect(db.canUserPerform(sellerId, 'opportunity.create')).toBe(false);
      expect(db.canUserPerform(sellerId, 'verification.decide')).toBe(false);
    });

    it('evaluates Buyer / Investor authorizations', () => {
      const buyerId = 'user-buyer-1';
      expect(db.canUserPerform(buyerId, 'business.browse')).toBe(true);
      expect(db.canUserPerform(buyerId, 'business.request_nda')).toBe(true);
      expect(db.canUserPerform(buyerId, 'opportunity.create')).toBe(false);
      expect(db.canUserPerform(buyerId, 'business.list')).toBe(false);
    });

    it('evaluates Service Provider authorizations', () => {
      const providerId = 'user-provider-1';
      expect(db.canUserPerform(providerId, 'opportunity.browse')).toBe(true);
      expect(db.canUserPerform(providerId, 'opportunity.apply')).toBe(true);
      expect(db.canUserPerform(providerId, 'opportunity.create')).toBe(false);
    });

    it('evaluates Organization Administrator authorizations', () => {
      const orgAdminId = 'user-orgadmin-1'; // Admin of org-save-children
      expect(db.canUserPerform(orgAdminId, 'organization.manage_members', 'org-save-children')).toBe(true);
      expect(db.canUserPerform(orgAdminId, 'organization.edit_profile', 'org-save-children')).toBe(true);
      expect(db.canUserPerform(orgAdminId, 'opportunity.create', 'org-save-children')).toBe(true);

      // Denied across other organization
      expect(db.canUserPerform(orgAdminId, 'organization.manage_members', 'org-nimba-agri')).toBe(false);
    });

    it('evaluates Platform Administrator with universal override', () => {
      const adminId = 'user-admin-1';
      expect(db.canUserPerform(adminId, 'opportunity.browse')).toBe(true);
      expect(db.canUserPerform(adminId, 'opportunity.create', 'any-tenant-id')).toBe(true);
      expect(db.canUserPerform(adminId, 'verification.decide')).toBe(true);
      expect(db.canUserPerform(adminId, 'audit.view_global')).toBe(true);
      expect(db.canUserPerform(adminId, 'platform.admin_access')).toBe(true);
    });
  });
});
