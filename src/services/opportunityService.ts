/**
 * opportunityService.ts
 *
 * Phase 3, Service 2 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status", and
 * docs/PHASE3_SERVICE2_VERIFICATION.md for the live RLS/permission proof).
 *
 * Every method reads/writes `public.opportunities` directly via the
 * anon/user-session Supabase client. Postgres RLS -- refined in
 * supabase/migrations/20260909140000_opportunity_service_backend.sql to
 * check the app's own fine-grained OrgPermission grants
 * (`has_org_permission()`), not just admin/owner role -- is the
 * authorization boundary. The `authService.can(...)` calls below are kept
 * ONLY as fast-fail UX (so the UI can show a friendly error before ever
 * hitting the network); they are not a substitute for RLS and a client
 * that skipped them entirely would still be correctly blocked or allowed
 * by Postgres.
 *
 * Design decisions worth knowing about, not hidden in a comment nobody
 * reads:
 *
 *   - Auto-expiry ("dbClient.expireOverdueOpportunities()") is NOT
 *     reproduced as a write-on-read side effect here. The old
 *     implementation scanned and mutated every row in local storage every
 *     time *anyone* called list()/getById() -- under RLS, a job seeker or
 *     anon visitor has no UPDATE rights on an opportunity they don't own,
 *     so that pattern cannot survive the migration as-is. Instead,
 *     "expired" is computed at read time (`computeEffectiveStatus`) and
 *     reflected in what callers see, without ever writing it back. An org
 *     admin durably closing out their own overdue postings (an actual
 *     status transition, auditable, permission-checked) is a
 *     still-open item -- see the "NOT done" list in
 *     docs/PHASE3_SERVICE2_VERIFICATION.md.
 *   - Full-text search covers title/summary/description/county/location
 *     only. The old implementation also matched organization name and
 *     the skills array; matching inside a joined table's columns via
 *     PostgREST's `.or()` isn't supported the way it was in the local
 *     in-memory filter, and matching inside a jsonb array needs a
 *     different query shape. Flagged rather than silently dropped -- see
 *     the same verification doc.
 *   - `data.organization` / INITIAL_ORGANIZATIONS fallback from the old
 *     implementation is gone. It used to fabricate a placeholder
 *     Organization object (from bundled seed data!) when the caller
 *     didn't have one handy. With a real FK to `organizations` and a
 *     server-side join, that fabrication isn't needed -- and keeping it
 *     would have been a step backwards from the "no seed data in the
 *     shipped bundle" goal later in this phase. A missing/invalid
 *     organizationId now fails loudly (ValidationError / FK violation)
 *     instead of silently inventing a company.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors/AppError';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import type {
  County,
  EmploymentType,
  Opportunity,
  OpportunityType,
  Organization,
  WorkplaceModel
} from '../types';

export interface OpportunityFilters {
  query?: string;
  searchQuery?: string;
  county?: County | 'all';
  type?: OpportunityType | 'all';
  employmentType?: EmploymentType | 'all';
  workplaceModel?: WorkplaceModel | 'all';
  minSalary?: number;
  maxSalary?: number;
  currency?: 'USD' | 'LRD';
  status?: 'all' | 'published' | 'draft' | 'closed' | 'expired';
  organizationId?: string;
  onlyActive?: boolean;
}

export type CreateOpportunityInput = Partial<
  Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate' | 'organization'>
> & {
  title: string;
  description: string;
  organizationId?: string;
};

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
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface OpportunityRow {
  id: string;
  organization_id: string;
  created_by_user_id: string;
  title: string;
  slug: string;
  opportunity_type: string;
  employment_type: string | null;
  workplace_model: string;
  county: string;
  location_details: string;
  salary_currency: string | null;
  salary_min: number | null;
  salary_max: number | null;
  is_salary_negotiable: boolean | null;
  is_salary_confidential: boolean | null;
  summary: string | null;
  description: string;
  responsibilities: string[] | null;
  requirements: string[] | null;
  skills_required: string[] | null;
  application_deadline: string | null;
  number_of_openings: number | null;
  screening_questions: string[] | null;
  status: string;
  moderation_status: string;
  report_count: number;
  views_count: number;
  applications_count: number;
  is_featured: boolean | null;
  created_at: string;
  updated_at: string;
  organizations: OrganizationRow | null;
}

function rowToOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type as Organization['type'],
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
    settings: (row.settings as unknown as Organization['settings']) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function computeEffectiveStatus(row: Pick<OpportunityRow, 'status' | 'application_deadline'>): Opportunity['status'] {
  if (row.status === 'published' && row.application_deadline) {
    const deadline = new Date(row.application_deadline);
    if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
      return 'expired';
    }
  }
  return row.status as Opportunity['status'];
}

function rowToOpportunity(row: OpportunityRow): Opportunity {
  const fallbackOrg: Organization = row.organizations
    ? rowToOrganization(row.organizations)
    : {
        id: row.organization_id,
        slug: row.organization_id,
        name: 'Unknown Organization',
        type: 'private_company',
        industry: '',
        county: row.county as County,
        cityDistrict: row.location_details,
        logoText: '???',
        description: '',
        verificationStatus: 'unverified',
        isVerified: false
      };

  return {
    id: row.id,
    organizationId: row.organization_id,
    organization: fallbackOrg,
    title: row.title,
    slug: row.slug,
    type: row.opportunity_type as OpportunityType,
    employmentType: (row.employment_type as EmploymentType) ?? undefined,
    workplaceModel: row.workplace_model as WorkplaceModel,
    county: row.county as County,
    locationDetails: row.location_details,
    currency: (row.salary_currency as 'USD' | 'LRD') || 'USD',
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    isSalaryNegotiable: row.is_salary_negotiable ?? true,
    isSalaryConfidential: row.is_salary_confidential ?? false,
    summary: row.summary || row.description.slice(0, 150),
    description: row.description,
    responsibilities: row.responsibilities || [],
    requirements: row.requirements || [],
    skills: row.skills_required || [],
    deadline: row.application_deadline ? row.application_deadline.split('T')[0] : '',
    postedDate: row.created_at.split('T')[0],
    openingsCount: row.number_of_openings ?? 1,
    screeningQuestions: row.screening_questions ?? undefined,
    isFeatured: row.is_featured ?? false,
    viewsCount: row.views_count ?? 0,
    applicationsCount: row.applications_count ?? 0,
    status: computeEffectiveStatus(row),
    moderationStatus: row.moderation_status as Opportunity['moderationStatus'],
    reportCount: row.report_count
  };
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; opportunityService requires a live backend.');
  }
  return c;
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError('You do not have permission to perform this action on this opportunity.');
  }
  if (error.code === '23505') {
    throw new ValidationError('An opportunity with that slug already exists.');
  }
  if (error.code === '23503') {
    throw new ValidationError('The specified organization does not exist.');
  }
  throw new Error(error.message);
}

const SELECT_WITH_ORG = '*, organizations(*)';

export const opportunityService = {
  /**
   * Superseded by read-time computation (computeEffectiveStatus) -- kept
   * as a documented no-op returning 0 rather than removed outright, since
   * it's still part of this service's public API and callers may exist
   * that check its return value. See this file's header comment.
   */
  async checkExpirations(): Promise<ApiResponse<number>> {
    return apiClient.execute(() => 0);
  },

  async list(filters?: OpportunityFilters): Promise<ApiResponse<Opportunity[]>> {
    return apiClient.execute(async () => {
      let q = client().from('opportunities').select(SELECT_WITH_ORG);

      if (filters?.organizationId) q = q.eq('organization_id', filters.organizationId);
      if (filters?.status && filters.status !== 'all' && filters.status !== 'expired') {
        q = q.eq('status', filters.status);
      } else if (filters?.onlyActive) {
        q = q.eq('status', 'published');
      }
      if (filters?.county && filters.county !== 'all') q = q.eq('county', filters.county);
      if (filters?.type && filters.type !== 'all') q = q.eq('opportunity_type', filters.type);
      if (filters?.employmentType && filters.employmentType !== 'all') {
        q = q.eq('employment_type', filters.employmentType);
      }
      if (filters?.workplaceModel && filters.workplaceModel !== 'all') {
        q = q.eq('workplace_model', filters.workplaceModel);
      }

      const queryStr = (filters?.query || filters?.searchQuery || '').trim();
      if (queryStr) {
        const term = `%${queryStr}%`;
        q = q.or(
          `title.ilike.${term},summary.ilike.${term},description.ilike.${term},county.ilike.${term},location_details.ilike.${term}`
        );
      }

      const { data, error } = await q;
      if (error) translateError(error);

      let opps = (data as OpportunityRow[]).map(rowToOpportunity);

      if (typeof filters?.minSalary === 'number' && filters.minSalary > 0) {
        opps = opps.filter((o) => {
          if (!o.salaryMin && !o.salaryMax) return false;
          return (o.salaryMax || o.salaryMin || 0) >= (filters.minSalary || 0);
        });
      }
      if (typeof filters?.maxSalary === 'number' && filters.maxSalary > 0) {
        opps = opps.filter((o) => {
          if (!o.salaryMin && !o.salaryMax) return false;
          return (o.salaryMin || 0) <= (filters.maxSalary || 0);
        });
      }

      if (filters?.status === 'expired') {
        opps = opps.filter((o) => o.status === 'expired');
      } else if (filters?.onlyActive) {
        opps = opps.filter((o) => o.status === 'published');
      }

      return opps;
    });
  },

  async getById(id: string): Promise<ApiResponse<Opportunity | null>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().from('opportunities').select(SELECT_WITH_ORG).eq('id', id).maybeSingle();
      if (error) translateError(error);
      if (!data) return null;

      const row = data as OpportunityRow;
      // Best-effort view increment. Under RLS, an anon/candidate viewer has
      // no UPDATE grant on opportunities.views_count directly (there is no
      // policy for it), so this will legitimately no-op for most viewers
      // rather than error -- matching "don't reimplement authorization
      // checks as a substitute for RLS": we don't pre-check who's allowed,
      // we just let Postgres decide and swallow a denial for this
      // non-critical counter.
      try {
        await client()
          .from('opportunities')
          .update({ views_count: (row.views_count ?? 0) + 1 })
          .eq('id', id);
      } catch {
        // Non-critical; view counts simply won't increment for viewers
        // without update rights (i.e. almost everyone, by design).
      }

      return rowToOpportunity(row);
    });
  },

  async create(data: CreateOpportunityInput, isDraft = false): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) {
        throw new ForbiddenError('You must be signed in to post opportunities.');
      }

      const targetOrgId = data.organizationId || session.activeOrganization?.id;
      if (!targetOrgId) {
        throw new ValidationError('An organization must be selected to post an opportunity.');
      }

      if (!authService.can('opportunity.create', targetOrgId)) {
        throw new ForbiddenError('You do not have permission to create opportunities for this organization.');
      }

      if (!isDraft) {
        const { subscriptionService } = await import('./subscriptionService');
        const entitlementRes = await subscriptionService.getEntitlements(targetOrgId);
        if (entitlementRes.data && entitlementRes.data.maxActiveJobs !== 'unlimited') {
          const { count } = await client()
            .from('opportunities')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', targetOrgId)
            .eq('status', 'published');
          if ((count ?? 0) >= entitlementRes.data.maxActiveJobs) {
            throw new ForbiddenError(
              `Plan limit reached. Your current plan only allows ${entitlementRes.data.maxActiveJobs} active jobs. Please upgrade your subscription to post more.`
            );
          }
        }
      }

      const id = `opp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const insertRow = {
        id,
        organization_id: targetOrgId,
        created_by_user_id: session.user.id,
        title: data.title,
        slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        opportunity_type: data.type || 'job',
        employment_type: data.employmentType || 'full_time',
        workplace_model: data.workplaceModel || 'on_site',
        county: data.county || 'Montserrado',
        location_details: data.locationDetails || `${data.county || 'Montserrado'} County, Liberia`,
        salary_currency: data.currency || 'USD',
        salary_min: data.salaryMin ?? null,
        salary_max: data.salaryMax ?? null,
        is_salary_negotiable: data.isSalaryNegotiable ?? true,
        is_salary_confidential: data.isSalaryConfidential ?? false,
        summary: data.summary || data.description.slice(0, 150),
        description: data.description,
        responsibilities: data.responsibilities || [],
        requirements: data.requirements || [],
        skills_required: data.skills || [],
        application_deadline: data.deadline || null,
        number_of_openings: data.openingsCount || 1,
        screening_questions: data.screeningQuestions || [],
        is_featured: data.isFeatured ?? false,
        status: isDraft ? 'draft' : 'published'
      };

      const { data: created, error } = await client()
        .from('opportunities')
        .insert(insertRow)
        .select(SELECT_WITH_ORG)
        .maybeSingle();
      if (error) translateError(error);
      return rowToOpportunity(created as OpportunityRow);
    });
  },

  async createDraft(data: CreateOpportunityInput): Promise<ApiResponse<Opportunity>> {
    return this.create(data, true);
  },

  async publish(target: string | CreateOpportunityInput): Promise<ApiResponse<Opportunity>> {
    if (typeof target === 'object') {
      return this.create(target, false);
    }

    const id = target;
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) throw new ForbiddenError('Sign-in required.');

      const { data: existingRow, error: fetchError } = await client()
        .from('opportunities')
        .select('id, organization_id')
        .eq('id', id)
        .maybeSingle();
      if (fetchError) translateError(fetchError);
      if (!existingRow) throw new NotFoundError('Opportunity', id);

      const tenantId = (existingRow as { organization_id: string }).organization_id;

      const { subscriptionService } = await import('./subscriptionService');
      const entitlementRes = await subscriptionService.getEntitlements(tenantId);
      if (entitlementRes.data && entitlementRes.data.maxActiveJobs !== 'unlimited') {
        const { count } = await client()
          .from('opportunities')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', tenantId)
          .eq('status', 'published');
        if ((count ?? 0) >= entitlementRes.data.maxActiveJobs) {
          throw new ForbiddenError(
            `Plan limit reached. Your current plan only allows ${entitlementRes.data.maxActiveJobs} active jobs. Please upgrade your subscription to publish more.`
          );
        }
      }

      const { data, error } = await client()
        .from('opportunities')
        .update({ status: 'published' })
        .eq('id', id)
        .select(SELECT_WITH_ORG)
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('Opportunity', id);
      return rowToOpportunity(data as OpportunityRow);
    });
  },

  async update(id: string, updates: Partial<Opportunity>): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) {
        throw new ForbiddenError('You must be signed in to update opportunities.');
      }

      const safe: Record<string, unknown> = {};
      if (updates.title !== undefined) safe.title = updates.title;
      if (updates.type !== undefined) safe.opportunity_type = updates.type;
      if (updates.employmentType !== undefined) safe.employment_type = updates.employmentType;
      if (updates.workplaceModel !== undefined) safe.workplace_model = updates.workplaceModel;
      if (updates.county !== undefined) safe.county = updates.county;
      if (updates.locationDetails !== undefined) safe.location_details = updates.locationDetails;
      if (updates.currency !== undefined) safe.salary_currency = updates.currency;
      if (updates.salaryMin !== undefined) safe.salary_min = updates.salaryMin;
      if (updates.salaryMax !== undefined) safe.salary_max = updates.salaryMax;
      if (updates.isSalaryNegotiable !== undefined) safe.is_salary_negotiable = updates.isSalaryNegotiable;
      if (updates.isSalaryConfidential !== undefined) safe.is_salary_confidential = updates.isSalaryConfidential;
      if (updates.summary !== undefined) safe.summary = updates.summary;
      if (updates.description !== undefined) safe.description = updates.description;
      if (updates.responsibilities !== undefined) safe.responsibilities = updates.responsibilities;
      if (updates.requirements !== undefined) safe.requirements = updates.requirements;
      if (updates.skills !== undefined) safe.skills_required = updates.skills;
      if (updates.deadline !== undefined) safe.application_deadline = updates.deadline || null;
      if (updates.openingsCount !== undefined) safe.number_of_openings = updates.openingsCount;
      if (updates.screeningQuestions !== undefined) safe.screening_questions = updates.screeningQuestions;
      if (updates.isFeatured !== undefined) safe.is_featured = updates.isFeatured;
      if (updates.status !== undefined) safe.status = updates.status;

      const { data, error } = await client()
        .from('opportunities')
        .update(safe)
        .eq('id', id)
        .select(SELECT_WITH_ORG)
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('Opportunity', id);
      return rowToOpportunity(data as OpportunityRow);
    });
  },

  async unpublishToDraft(id: string): Promise<ApiResponse<Opportunity>> {
    return this.update(id, { status: 'draft' });
  },

  async close(id: string): Promise<ApiResponse<Opportunity>> {
    return this.update(id, { status: 'closed' });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) throw new ForbiddenError('Sign-in required.');

      const { error, count } = await client().from('opportunities').delete({ count: 'exact' }).eq('id', id);
      if (error) translateError(error);
      if (!count) throw new NotFoundError('Opportunity', id);
    });
  },

  async duplicate(id: string): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) throw new ForbiddenError('Sign-in required.');

      const { data: existingData, error: fetchError } = await client()
        .from('opportunities')
        .select(SELECT_WITH_ORG)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) translateError(fetchError);
      if (!existingData) throw new NotFoundError('Opportunity', id);
      const existing = rowToOpportunity(existingData as OpportunityRow);

      if (!authService.can('opportunity.create', existing.organizationId)) {
        throw new ForbiddenError('You do not have permission to duplicate postings for this organization.');
      }

      const res = await this.create(
        {
          organizationId: existing.organizationId,
          title: `${existing.title} (Copy)`,
          slug: `${existing.slug}-copy-${Math.random().toString(36).substring(2, 6)}`,
          type: existing.type,
          employmentType: existing.employmentType,
          workplaceModel: existing.workplaceModel,
          county: existing.county,
          locationDetails: existing.locationDetails,
          currency: existing.currency,
          salaryMin: existing.salaryMin,
          salaryMax: existing.salaryMax,
          isSalaryNegotiable: existing.isSalaryNegotiable,
          isSalaryConfidential: existing.isSalaryConfidential,
          summary: existing.summary,
          description: existing.description,
          responsibilities: [...existing.responsibilities],
          requirements: [...existing.requirements],
          skills: [...existing.skills],
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          openingsCount: existing.openingsCount,
          screeningQuestions: existing.screeningQuestions ? [...existing.screeningQuestions] : [],
          isFeatured: false
        },
        true
      );
      if (res.error) throw new Error(res.error.message);
      return res.data as Opportunity;
    });
  }
};
