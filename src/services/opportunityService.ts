import {
  County,
  EmploymentType,
  Opportunity,
  OpportunityType,
  Organization,
  WorkplaceModel
} from '../types';
import { db } from '../db/dbClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { ForbiddenError, NotFoundError } from '../core/errors/AppError';
import { INITIAL_ORGANIZATIONS } from '../data/seedData';

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
  Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'>
> & {
  title: string;
  description: string;
};

export const opportunityService = {
  /**
   * Scan and update status of all overdue opportunities
   */
  async checkExpirations(): Promise<ApiResponse<number>> {
    return apiClient.execute(() => {
      return db.expireOverdueOpportunities();
    });
  },

  /**
   * Filter and list opportunities according to public or tenant parameters
   */
  async list(filters?: OpportunityFilters): Promise<ApiResponse<Opportunity[]>> {
    return apiClient.execute(() => {
      // First ensure expired ones are updated
      db.expireOverdueOpportunities();

      let opps = db.getOpportunities();

      // Tenant isolation or filter by org
      if (filters?.organizationId) {
        opps = opps.filter((o) => o.organizationId === filters.organizationId);
      }

      // Public status filter (default: all if not specified or specified 'all')
      if (filters?.status && filters.status !== 'all') {
        opps = opps.filter((o) => o.status === filters.status);
      } else if (filters?.onlyActive) {
        opps = opps.filter((o) => o.status === 'published');
      }

      // County filter
      if (filters?.county && filters.county !== 'all') {
        opps = opps.filter((o) => o.county === filters.county);
      }

      // Opportunity Category / Type filter
      if (filters?.type && filters.type !== 'all') {
        opps = opps.filter((o) => o.type === filters.type);
      }

      // Employment Type filter (full_time, contract, internship, etc.)
      if (filters?.employmentType && filters.employmentType !== 'all') {
        opps = opps.filter((o) => o.employmentType === filters.employmentType);
      }

      // Workplace Model (on_site, hybrid, remote)
      if (filters?.workplaceModel && filters.workplaceModel !== 'all') {
        opps = opps.filter((o) => o.workplaceModel === filters.workplaceModel);
      }

      // Minimum salary filter
      if (typeof filters?.minSalary === 'number' && filters.minSalary > 0) {
        opps = opps.filter((o) => {
          if (!o.salaryMin && !o.salaryMax) return false;
          return (o.salaryMax || o.salaryMin || 0) >= (filters.minSalary || 0);
        });
      }

      // Maximum salary filter
      if (typeof filters?.maxSalary === 'number' && filters.maxSalary > 0) {
        opps = opps.filter((o) => {
          if (!o.salaryMin && !o.salaryMax) return false;
          return (o.salaryMin || 0) <= (filters.maxSalary || 0);
        });
      }

      // Text search query across title, organization, description, skills, location
      const queryStr = (filters?.query || filters?.searchQuery || '').toLowerCase().trim();
      if (queryStr) {
        opps = opps.filter((o) => {
          const matchTitle = o.title.toLowerCase().includes(queryStr);
          const matchOrg = o.organization?.name?.toLowerCase().includes(queryStr) || false;
          const matchCounty = o.county?.toLowerCase().includes(queryStr) || false;
          const matchLoc = o.locationDetails?.toLowerCase().includes(queryStr) || false;
          const matchDesc = o.description?.toLowerCase().includes(queryStr) || o.summary?.toLowerCase().includes(queryStr) || false;
          const matchSkills = o.skills?.some((s) => s.toLowerCase().includes(queryStr)) || false;
          return matchTitle || matchOrg || matchCounty || matchLoc || matchDesc || matchSkills;
        });
      }

      return opps;
    });
  },

  /**
   * Retrieve single opportunity by ID with view tracking
   */
  async getById(id: string): Promise<ApiResponse<Opportunity | null>> {
    return apiClient.execute(() => {
      db.expireOverdueOpportunities();
      const opp = db.getOpportunityById(id);
      if (opp) {
        db.incrementOpportunityViews(id);
      }
      return opp;
    });
  },

  /**
   * Create opportunity helper (draft or published)
   */
  async create(
    data: CreateOpportunityInput,
    isDraft = false
  ): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session) {
        throw new ForbiddenError('You must be signed in to post opportunities.');
      }

      const activeOrg = session.activeOrganization;
      const targetOrgId = data.organizationId || (activeOrg ? activeOrg.id : INITIAL_ORGANIZATIONS[0].id);

      if (!authService.can('opportunity.create', targetOrgId)) {
        throw new ForbiddenError('You do not have permission to create opportunities for this organization.');
      }

      if (!isDraft) {
        const { subscriptionService } = await import('./subscriptionService');
        const entitlementRes = await subscriptionService.getEntitlements(targetOrgId);
        if (entitlementRes.data && entitlementRes.data.maxActiveJobs !== 'unlimited') {
          const publishedCount = db.getOpportunities().filter(o => o.organizationId === targetOrgId && o.status === 'published').length;
          if (publishedCount >= entitlementRes.data.maxActiveJobs) {
            throw new ForbiddenError(`Plan limit reached. Your current plan only allows ${entitlementRes.data.maxActiveJobs} active jobs. Please upgrade your subscription to post more.`);
          }
        }
      }

      const org: Organization = data.organization || INITIAL_ORGANIZATIONS.find((o) => o.id === targetOrgId) || {
        id: targetOrgId,
        slug: targetOrgId,
        name: activeOrg?.name || 'Organization',
        logoText: 'OP',
        description: 'Authorized enterprise entity in Liberia.',
        type: 'private_company',
        industry: 'Enterprise',
        county: data.county || 'Montserrado',
        cityDistrict: data.locationDetails || 'Liberia',
        verificationStatus: 'verified',
        isVerified: true
      };

      const oppToCreate: Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'> = {
        organizationId: targetOrgId,
        organization: org,
        title: data.title,
        slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        type: data.type || 'job',
        employmentType: data.employmentType || 'full_time',
        workplaceModel: data.workplaceModel || 'on_site',
        county: data.county || 'Montserrado',
        locationDetails: data.locationDetails || `${data.county || 'Montserrado'} County, Liberia`,
        currency: data.currency || 'USD',
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        isSalaryNegotiable: data.isSalaryNegotiable ?? true,
        isSalaryConfidential: data.isSalaryConfidential ?? false,
        summary: data.summary || data.description.slice(0, 150),
        description: data.description,
        responsibilities: data.responsibilities || [],
        requirements: data.requirements || [],
        skills: data.skills || [],
        deadline: data.deadline || '2026-12-31',
        openingsCount: data.openingsCount || 1,
        screeningQuestions: data.screeningQuestions || [],
        isFeatured: data.isFeatured ?? false,
        status: isDraft ? 'draft' : 'published'
      };

      return db.createOpportunity(oppToCreate, session.user.id);
    });
  },

  /**
   * Helper to create draft
   */
  async createDraft(data: CreateOpportunityInput): Promise<ApiResponse<Opportunity>> {
    return this.create(data, true);
  },

  /**
   * Publish either an existing ID or a newly submitted opportunity
   */
  async publish(target: string | CreateOpportunityInput): Promise<ApiResponse<Opportunity>> {
    if (typeof target === 'object') {
      return this.create(target, false);
    }

    const id = target;
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session) throw new ForbiddenError('Sign-in required.');

      const existing = db.getOpportunityById(id);
      if (!existing) throw new NotFoundError('Opportunity', id);

      const activeOrg = session.activeOrganization;
      const tenantId = activeOrg ? activeOrg.id : existing.organizationId;

      const { subscriptionService } = await import('./subscriptionService');
      const entitlementRes = await subscriptionService.getEntitlements(tenantId);
      
      if (entitlementRes.data && entitlementRes.data.maxActiveJobs !== 'unlimited') {
        const publishedCount = db.getOpportunities().filter(o => o.organizationId === tenantId && o.status === 'published').length;
        if (publishedCount >= entitlementRes.data.maxActiveJobs) {
          throw new ForbiddenError(`Plan limit reached. Your current plan only allows ${entitlementRes.data.maxActiveJobs} active jobs. Please upgrade your subscription to publish more.`);
        }
      }

      return db.updateOpportunity(
        id,
        {
          status: 'published',
          postedDate: new Date().toISOString().split('T')[0]
        },
        tenantId,
        session.user.id
      );
    });
  },

  /**
   * Update opportunity (strictly tenant isolated)
   */
  async update(id: string, updates: Partial<Opportunity>): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      if (!session) {
        throw new ForbiddenError('You must be signed in to update opportunities.');
      }

      const existing = db.getOpportunityById(id);
      if (!existing) {
        throw new NotFoundError('Opportunity', id);
      }

      const activeOrg = session.activeOrganization;
      const tenantId = activeOrg ? activeOrg.id : existing.organizationId;

      return db.updateOpportunity(id, updates, tenantId, session.user.id);
    });
  },

  /**
   * Change lifecycle state to draft
   */
  async unpublishToDraft(id: string): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      if (!session) throw new ForbiddenError('Sign-in required.');

      const existing = db.getOpportunityById(id);
      if (!existing) throw new NotFoundError('Opportunity', id);

      const activeOrg = session.activeOrganization;
      const tenantId = activeOrg ? activeOrg.id : existing.organizationId;

      return db.updateOpportunity(id, { status: 'draft' }, tenantId, session.user.id);
    });
  },

  /**
   * Close opportunity
   */
  async close(id: string): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      if (!session) throw new ForbiddenError('Sign-in required.');

      const existing = db.getOpportunityById(id);
      if (!existing) throw new NotFoundError('Opportunity', id);

      const activeOrg = session.activeOrganization;
      const tenantId = activeOrg ? activeOrg.id : existing.organizationId;

      return db.updateOpportunity(id, { status: 'closed' }, tenantId, session.user.id);
    });
  },

  /**
   * Delete opportunity (permanent removal)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      if (!session) throw new ForbiddenError('Sign-in required.');

      const existing = db.getOpportunityById(id);
      if (!existing) throw new NotFoundError('Opportunity', id);

      const activeOrg = session.activeOrganization;
      const tenantId = activeOrg ? activeOrg.id : existing.organizationId;

      db.deleteOpportunity(id, tenantId, session.user.id);
    });
  },

  /**
   * Duplicate existing opportunity as a draft
   */
  async duplicate(id: string): Promise<ApiResponse<Opportunity>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      if (!session) throw new ForbiddenError('Sign-in required.');

      const existing = db.getOpportunityById(id);
      if (!existing) throw new NotFoundError('Opportunity', id);

      const activeOrg = session.activeOrganization;
      const tenantId = activeOrg ? activeOrg.id : existing.organizationId;

      if (!authService.can('opportunity.create', tenantId)) {
        throw new ForbiddenError('You do not have permission to duplicate postings for this organization.');
      }

      const copyData: Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'> = {
        organizationId: existing.organizationId,
        organization: existing.organization,
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
        isFeatured: false,
        status: 'draft'
      };

      return db.createOpportunity(copyData, session.user.id);
    });
  }
};
