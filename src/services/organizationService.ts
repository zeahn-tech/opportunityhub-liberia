/**
 * organizationService.ts
 *
 * Phase 3, Service 1 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status").
 *
 * Every method here reads/writes `public.organizations` and
 * `public.organization_memberships` directly via the anon/user-session
 * Supabase client (`getSupabaseClient()`), which carries the caller's real
 * JWT. Postgres Row-Level Security is the authorization boundary -- there
 * is no client-side re-implementation of "can this user see/edit this
 * row" here. See supabase/migrations/20260909130000_organization_service_backend.sql
 * for the policies/RPC/trigger this service depends on, and
 * docs/PHASE3_SERVICE1_VERIFICATION.md for the live proof that boundary
 * actually holds (RLS denial, owner-invariant trigger, atomic RPC).
 *
 * Two invariants that used to live only in dbClient.ts's application code
 * now live in Postgres instead, and this service does NOT re-check them:
 *   - "only the org's admins/owner can manage its memberships" -> RLS
 *     policies "Org admins can manage memberships" / is_org_admin().
 *   - "the sole owner can't be demoted or removed" -> the
 *     enforce_owner_invariant() BEFORE UPDATE/DELETE trigger.
 * A call that violates either will reject with a Postgres/PostgREST error
 * (42501 for RLS, 23514 for the owner-invariant check); this service
 * surfaces that as a thrown AppError subclass rather than swallowing it.
 *
 * NOT yet covered by this service (flagged, not silently dropped):
 *   - `assertUserInTenant`'s rich return shape (a full membership object
 *     with a synthesized platform_admin override) is NOT reproduced here.
 *     Platform-admin governance override across all orgs is an
 *     application-level UX concern (see permissionEngine.ts), not a
 *     database access boundary -- if the real requirement is "platform
 *     admins can read/write any org", that must be its own RLS policy
 *     (checking a platform_role column), not client code pretending a
 *     membership exists. Not added here because no such policy exists yet
 *     in the schema; flagged for whoever wires this service into
 *     authService/permissionEngine next.
 *
 * Invitations (createInvitation/acceptInvitation/etc. below) are backed by
 * public.organization_invitations (see
 * supabase/migrations/20260912090000_deferred_features_backend.sql).
 * Accepting has the same chicken-and-egg shape as organization creation
 * (Service 1's own RPC): the invitee has no membership row yet, so a
 * membership-scoped RLS policy can't authorize them adding themselves --
 * accept_organization_invitation() is a SECURITY DEFINER RPC that
 * validates the token against the CALLER's own verified email (never a
 * client-supplied email) and creates the membership atomically.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from '../core/errors/AppError';
import type {
  Organization,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationSettings,
  OrganizationType,
  OrgPermission,
  OrgRole,
  County
} from '../types';

// ---------------------------------------------------------------------
// Row <-> app-type mapping (snake_case DB columns <-> camelCase app types)
// ---------------------------------------------------------------------

interface OrganizationRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  industry: string;
  county: string;
  city_district: string;
  address: string | null;
  website_url: string | null;
  website: string | null;
  logo_url: string | null;
  logo_text: string | null;
  cover_image_url: string | null;
  description: string;
  verification_status: string;
  verification_badge: string | null;
  is_verified: boolean;
  registration_number: string | null;
  tax_id_number: string | null;
  established_year: number | null;
  employee_count_range: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  settings: OrganizationSettings | null;
  created_at: string;
  updated_at: string;
}

interface MembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  org_role: string;
  status: string;
  permissions: (OrgPermission | string)[];
  created_at: string;
  updated_at: string | null;
}

function rowToOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type as OrganizationType,
    industry: row.industry,
    county: row.county as County,
    cityDistrict: row.city_district,
    address: row.address ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    website: row.website ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    logoText: row.logo_text || row.name.substring(0, 3).toUpperCase(),
    description: row.description,
    verificationStatus: row.verification_status as Organization['verificationStatus'],
    verificationBadge: (row.verification_badge as Organization['verificationBadge']) ?? undefined,
    isVerified: row.is_verified,
    registrationNumber: row.registration_number ?? undefined,
    taxIdNumber: row.tax_id_number ?? undefined,
    establishedYear: row.established_year ?? undefined,
    employeeCountRange: row.employee_count_range ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    settings: row.settings ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToMembership(row: MembershipRow): OrganizationMembership {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    orgRole: row.org_role as OrgRole,
    status: row.status as OrganizationMembership['status'],
    permissions: row.permissions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined
  };
}

interface InvitationRow {
  id: string;
  organization_id: string;
  inviter_user_id: string;
  invitee_email: string;
  org_role: string;
  permissions: (OrgPermission | string)[];
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
  notes: string | null;
  organizations?: { name: string } | null;
  users?: { full_name: string } | null;
}

function rowToInvitation(row: InvitationRow): OrganizationInvitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organizations?.name || '',
    inviterUserId: row.inviter_user_id,
    inviterName: row.users?.full_name || '',
    inviteeEmail: row.invitee_email,
    orgRole: row.org_role as OrgRole,
    permissions: row.permissions || [],
    token: row.token,
    status: row.status as OrganizationInvitation['status'],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? undefined,
    notes: row.notes ?? undefined
  };
}

const SELECT_INVITATION_WITH_JOINS = '*, organizations(name), users!organization_invitations_inviter_user_id_fkey(full_name)';

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new UnauthorizedError('Supabase is not configured; organizationService requires a live backend.');
  }
  return c;
}

/** Maps a PostgREST/Postgres error into the app's AppError hierarchy instead of leaking raw driver errors. */
function translateError(error: { code?: string; message: string }): never {
  // 42501 = insufficient_privilege (RLS denial)
  if (error.code === '42501') {
    throw new ForbiddenError('You do not have permission to perform this action on this organization.');
  }
  // 23514 = check_violation (the owner-invariant trigger raises this code explicitly)
  if (error.code === '23514') {
    throw new ValidationError(error.message);
  }
  // 23505 = unique_violation (e.g. duplicate slug, duplicate membership)
  if (error.code === '23505') {
    throw new ValidationError('That value is already in use.');
  }
  throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------

export interface OrganizationFilter {
  type?: OrganizationType;
  county?: County;
  isVerified?: boolean;
  query?: string;
}

export const organizationService = {
  /** Public read -- covered by the "Allow public read access" RLS policy; works for anon or authenticated callers alike. */
  async getOrganizations(filter?: OrganizationFilter): Promise<Organization[]> {
    let q = client().from('organizations').select('*');
    if (filter?.type) q = q.eq('type', filter.type);
    if (filter?.county) q = q.eq('county', filter.county);
    if (typeof filter?.isVerified === 'boolean') q = q.eq('is_verified', filter.isVerified);
    if (filter?.query) {
      const term = `%${filter.query.trim()}%`;
      q = q.or(`name.ilike.${term},description.ilike.${term},industry.ilike.${term},city_district.ilike.${term}`);
    }
    const { data, error } = await q;
    if (error) translateError(error);
    return (data as OrganizationRow[]).map(rowToOrganization);
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    const { data, error } = await client().from('organizations').select('*').eq('id', id).maybeSingle();
    if (error) translateError(error);
    return data ? rowToOrganization(data as OrganizationRow) : null;
  },

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await client().from('organizations').select('*').eq('slug', slug).maybeSingle();
    if (error) translateError(error);
    return data ? rowToOrganization(data as OrganizationRow) : null;
  },

  /**
   * Creates an organization AND makes the calling user its owner, atomically,
   * via the `create_organization_with_owner` SECURITY DEFINER RPC. This is
   * an RPC rather than two `.insert()` calls because a plain client insert
   * into organization_memberships would fail RLS at the second step (the
   * INSERT-time is_org_admin() check has nothing to match yet) -- see the
   * migration file's header comment. The RPC only ever grants ownership to
   * auth.uid() (the caller), never an arbitrary user, so it can't be used
   * to plant memberships in other people's organizations.
   */
  async createOrganization(
    org: Pick<Organization, 'name' | 'type' | 'industry' | 'county' | 'cityDistrict' | 'description'> &
      Partial<Pick<Organization, 'slug' | 'logoText' | 'website' | 'contactEmail' | 'contactPhone' | 'settings'>>
  ): Promise<Organization> {
    if (!org.name?.trim()) throw new ValidationError('Organization name is required.');
    if (!org.type) throw new ValidationError('Organization type is required.');
    if (!org.county) throw new ValidationError('Organization county location is required.');

    const id = `org-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const slug =
      org.slug ||
      org.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const { data, error } = await client().rpc('create_organization_with_owner', {
      p_id: id,
      p_slug: slug,
      p_name: org.name,
      p_type: org.type,
      p_industry: org.industry,
      p_county: org.county,
      p_city_district: org.cityDistrict,
      p_description: org.description,
      p_logo_text: org.logoText ?? null,
      p_website: org.website ?? null,
      p_contact_email: org.contactEmail ?? null,
      p_contact_phone: org.contactPhone ?? null,
      p_settings: org.settings ?? null
    });
    if (error) translateError(error);
    return rowToOrganization(data as OrganizationRow);
  },

  /**
   * Profile fields only. Protected fields (verificationStatus,
   * verificationBadge, isVerified) are intentionally NOT accepted here --
   * they're stripped before the query is built, same invariant dbClient.ts
   * enforced, but now redundant-with (not a substitute for) RLS: there is
   * no policy granting ordinary members UPDATE on those columns' intended
   * meaning, though Postgres has no column-level RLS, so this
   * strip-before-write is a genuine defense-in-depth layer here, not
   * decoration -- see businessService's RPC/view approach (Phase 3,
   * Service 5) for where column-level confidentiality is a hard boundary
   * instead.
   */
  async updateOrganizationProfile(organizationId: string, updates: Partial<Organization>): Promise<Organization> {
    const safe: Record<string, unknown> = {};
    if (updates.name !== undefined) safe.name = updates.name;
    if (updates.industry !== undefined) safe.industry = updates.industry;
    if (updates.county !== undefined) safe.county = updates.county;
    if (updates.cityDistrict !== undefined) safe.city_district = updates.cityDistrict;
    if (updates.address !== undefined) safe.address = updates.address;
    if (updates.websiteUrl !== undefined) safe.website_url = updates.websiteUrl;
    if (updates.website !== undefined) safe.website = updates.website;
    if (updates.logoUrl !== undefined) safe.logo_url = updates.logoUrl;
    if (updates.logoText !== undefined) safe.logo_text = updates.logoText;
    if (updates.description !== undefined) safe.description = updates.description;
    if (updates.registrationNumber !== undefined) safe.registration_number = updates.registrationNumber;
    if (updates.taxIdNumber !== undefined) safe.tax_id_number = updates.taxIdNumber;
    if (updates.establishedYear !== undefined) safe.established_year = updates.establishedYear;
    if (updates.employeeCountRange !== undefined) safe.employee_count_range = updates.employeeCountRange;
    if (updates.contactEmail !== undefined) safe.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) safe.contact_phone = updates.contactPhone;

    const { data, error } = await client()
      .from('organizations')
      .update(safe)
      .eq('id', organizationId)
      .select('*')
      .maybeSingle();
    if (error) translateError(error);
    if (!data) throw new NotFoundError('Organization', organizationId);
    return rowToOrganization(data as OrganizationRow);
  },

  async updateOrganizationSettings(
    organizationId: string,
    settingsUpdates: Partial<OrganizationSettings>
  ): Promise<Organization> {
    const existing = await this.getOrganizationById(organizationId);
    if (!existing) throw new NotFoundError('Organization', organizationId);
    const merged = { ...(existing.settings || {}), ...settingsUpdates };
    const { data, error } = await client()
      .from('organizations')
      .update({ settings: merged })
      .eq('id', organizationId)
      .select('*')
      .maybeSingle();
    if (error) translateError(error);
    if (!data) throw new NotFoundError('Organization', organizationId);
    return rowToOrganization(data as OrganizationRow);
  },

  // ---------------------------------------------------------------------
  // Memberships
  // ---------------------------------------------------------------------

  /** "Users can view their own memberships" RLS policy -- always returns exactly the caller's own rows, for any caller. */
  async getMembershipsByUserId(userId: string): Promise<OrganizationMembership[]> {
    const { data, error } = await client()
      .from('organization_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) translateError(error);
    return (data as MembershipRow[]).map(rowToMembership);
  },

  async getUserOrganizations(userId: string): Promise<Array<Organization & { membership: OrganizationMembership }>> {
    const memberships = await this.getMembershipsByUserId(userId);
    if (memberships.length === 0) return [];
    const { data, error } = await client()
      .from('organizations')
      .select('*')
      .in('id', memberships.map((m) => m.organizationId));
    if (error) translateError(error);
    const orgs = (data as OrganizationRow[]).map(rowToOrganization);
    return memberships
      .map((m) => {
        const org = orgs.find((o) => o.id === m.organizationId);
        return org ? { ...org, membership: m } : null;
      })
      .filter((x): x is Organization & { membership: OrganizationMembership } => x !== null);
  },

  async getUserMembership(organizationId: string, userId: string): Promise<OrganizationMembership | null> {
    const { data, error } = await client()
      .from('organization_memberships')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) translateError(error);
    return data ? rowToMembership(data as MembershipRow) : null;
  },

  /** "Org members can view other members" RLS policy -- returns [] (not an error) if the caller isn't a member; that's RLS filtering, not a bug. */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMembership[]> {
    const { data, error } = await client()
      .from('organization_memberships')
      .select('*')
      .eq('organization_id', organizationId);
    if (error) translateError(error);
    return (data as MembershipRow[]).map(rowToMembership);
  },

  /**
   * Display profiles (name/avatar/email) for an org's members. `users`
   * RLS restricts SELECT to self only, so this goes through
   * get_organization_member_profiles() -- a narrow RPC (same pattern as
   * messagingService's get_conversation_participant_profiles) rather
   * than widening users' RLS to expose full rows to co-members.
   */
  async getMemberProfiles(
    organizationId: string
  ): Promise<Record<string, { fullName: string; avatarUrl?: string; email: string }>> {
    const { data, error } = await client().rpc('get_organization_member_profiles', {
      p_organization_id: organizationId
    });
    if (error) translateError(error);
    const map: Record<string, { fullName: string; avatarUrl?: string; email: string }> = {};
    ((data as { user_id: string; full_name: string; avatar_url: string | null; email: string }[]) || []).forEach((p) => {
      map[p.user_id] = { fullName: p.full_name, avatarUrl: p.avatar_url ?? undefined, email: p.email };
    });
    return map;
  },

  /** Requires the caller to already be an org admin/owner -- enforced by "Org admins can manage memberships" RLS, not re-checked here. */
  async addMember(
    organizationId: string,
    userId: string,
    orgRole: OrgRole,
    permissions: (OrgPermission | string)[] = []
  ): Promise<OrganizationMembership> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data, error } = await client()
      .from('organization_memberships')
      .insert({
        id,
        organization_id: organizationId,
        user_id: userId,
        org_role: orgRole,
        status: 'active',
        permissions
      })
      .select('*')
      .maybeSingle();
    if (error) translateError(error);
    return rowToMembership(data as MembershipRow);
  },

  async suspendMember(membershipId: string): Promise<OrganizationMembership> {
    // The owner-invariant trigger rejects this with 23514 if it's the sole owner.
    const { data, error } = await client()
      .from('organization_memberships')
      .update({ status: 'suspended' })
      .eq('id', membershipId)
      .select('*')
      .maybeSingle();
    if (error) translateError(error);
    if (!data) throw new NotFoundError('OrganizationMembership', membershipId);
    return rowToMembership(data as MembershipRow);
  },

  async reactivateMember(membershipId: string): Promise<OrganizationMembership> {
    const { data, error } = await client()
      .from('organization_memberships')
      .update({ status: 'active' })
      .eq('id', membershipId)
      .select('*')
      .maybeSingle();
    if (error) translateError(error);
    if (!data) throw new NotFoundError('OrganizationMembership', membershipId);
    return rowToMembership(data as MembershipRow);
  },

  async updateMemberRoleAndPermissions(
    membershipId: string,
    newRole: OrgRole,
    permissions: (OrgPermission | string)[]
  ): Promise<OrganizationMembership> {
    // The owner-invariant trigger rejects demoting the sole owner with 23514.
    const { data, error } = await client()
      .from('organization_memberships')
      .update({ org_role: newRole, permissions })
      .eq('id', membershipId)
      .select('*')
      .maybeSingle();
    if (error) translateError(error);
    if (!data) throw new NotFoundError('OrganizationMembership', membershipId);
    return rowToMembership(data as MembershipRow);
  },

  async removeMember(membershipId: string): Promise<void> {
    // The owner-invariant trigger rejects removing the sole owner with 23514.
    const { error } = await client().from('organization_memberships').delete().eq('id', membershipId);
    if (error) translateError(error);
  },

  // ---------------------------------------------------------------------
  // Invitations (closes the gap flagged in this file's header comment and
  // docs/PHASE3_SERVICE1_VERIFICATION.md -- see
  // supabase/migrations/20260912090000_deferred_features_backend.sql for
  // the schema/RLS/RPC this section depends on).
  // ---------------------------------------------------------------------

  async createInvitation(
    organizationId: string,
    inviteeEmail: string,
    orgRole: OrgRole,
    permissions: (OrgPermission | string)[] = []
  ): Promise<OrganizationInvitation> {
    const {
      data: { user }
    } = await client().auth.getUser();
    if (!user) throw new UnauthorizedError('Sign in required to send an invitation.');

    const emailNorm = inviteeEmail.toLowerCase().trim();
    if (!emailNorm.includes('@') || !emailNorm.includes('.')) {
      throw new ValidationError('Valid email address is required for invitation.');
    }

    const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data, error } = await client()
      .from('organization_invitations')
      .insert({
        id,
        organization_id: organizationId,
        inviter_user_id: user.id,
        invitee_email: emailNorm,
        org_role: orgRole,
        permissions,
        token: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select(SELECT_INVITATION_WITH_JOINS)
      .maybeSingle();
    if (error) translateError(error);
    return rowToInvitation(data as InvitationRow);
  },

  async getOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    const { data, error } = await client()
      .from('organization_invitations')
      .select(SELECT_INVITATION_WITH_JOINS)
      .eq('organization_id', organizationId);
    if (error) translateError(error);
    return (data as InvitationRow[]).map(rowToInvitation);
  },

  /** Returns pending invitations addressed to the CALLER's own verified email -- RLS enforces this regardless of what's passed. */
  async getMyPendingInvitations(): Promise<OrganizationInvitation[]> {
    const { data, error } = await client()
      .from('organization_invitations')
      .select(SELECT_INVITATION_WITH_JOINS)
      .eq('status', 'pending');
    if (error) translateError(error);
    return (data as InvitationRow[]).map(rowToInvitation);
  },

  async acceptInvitation(token: string): Promise<OrganizationMembership> {
    const { data, error } = await client().rpc('accept_organization_invitation', { p_token: token });
    if (error) translateError(error);
    return rowToMembership(data as MembershipRow);
  },

  async declineInvitation(invitationId: string): Promise<void> {
    const { error } = await client()
      .from('organization_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);
    if (error) translateError(error);
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    const { error } = await client()
      .from('organization_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);
    if (error) translateError(error);
  }
};
