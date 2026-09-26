// ====================================================================
// seedUserFixtures.ts
// ====================================================================
// Real-looking demo-user PII (names, emails, phone numbers) and demo
// password hashes, isolated into their own module for exactly one
// reason: so it can be excluded from production builds entirely.
//
// This module MUST be referenced only from behind the literal,
// build-time-foldable `DEMO_SEED_ENABLED` check defined in dbClient.ts
// (`import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'`, checked
// directly -- never through envConfig.enableDemoMode, which wraps it
// in a runtime parseBoolean() call the minifier cannot see through).
// When that check is statically false at build time (the default for
// any real deployment -- see .env.example / docs/DEPLOYMENT.md),
// esbuild's dead-code elimination drops every reference to this
// module's exports, and Rollup's tree-shaking then drops the whole
// module from the output bundle.
//
// scripts/check-no-seed-pii-in-bundle.sh is the regression test that
// verifies this actually holds -- it greps the built dist/ client
// bundle for the exact strings below and fails the build if any are
// found. Do not import anything from this file directly outside
// dbClient.ts; go through dbClient's guarded public methods instead
// (e.g. `db.getDefaultDemoUser()`), or the guard is defeated at the
// new call site and the leak comes back.
// ====================================================================
import { OrganizationMembership, User, UserPreferences } from '../types';

// Known seed salt & hash for "Password123!" for immediate test/demo access
export const SEED_SALT = 'e9f4c3a1782d059b8412acb9';
// SHA-256 hash of "e9f4c3a1782d059b8412acb9:Password123!:liberia-opphub-sec-v1"
export const SEED_PASSWORD_HASH = '1f98d02df910080dafa46c4f0da9c417637841c6d3fa316d3f2ec45811776997';
// Per-user override: the seeded demo admin account's password hash.
export const SEED_ADMIN_PASSWORD_HASH = 'eb78c639b7ffc706d6fa88b5e355f25d11c19ab6a5f6f66009efb9a4152a2b92';

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
