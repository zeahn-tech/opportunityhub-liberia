import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/authService';
import { db } from '../db/dbClient';
import { Opportunity } from '../types';

/**
 * This file used to call opportunityService.* directly. As of Phase 3,
 * Service 2 of the dbClient -> Supabase migration
 * (docs/PRODUCTION_CERTIFICATION_REPORT.md), opportunityService.ts no
 * longer touches dbClient.ts at all -- it reads/writes Supabase exclusively
 * (see src/tests/opportunityService.test.ts for its mocked-Supabase-client
 * coverage, and docs/PHASE3_SERVICE2_VERIFICATION.md for the live RLS
 * proof). Calling opportunityService from here would just throw
 * "Supabase is not configured" in this test environment.
 *
 * The lifecycle/isolation/expiry behavior this file exercises is still
 * real and still worth testing -- it's just dbClient.ts's own behavior now
 * (the local-demo-mode data layer that Phase 3's plan explicitly keeps
 * around), not opportunityService's. So this file was retargeted to call
 * `db.*` directly, the same pattern src/tests/auth.test.ts already used
 * for db.registerUser/db.authenticateUser before Phase 2 touched
 * authService.
 *
 * Two tests from the original file were dropped here, not silently lost:
 *   - Multi-parameter filter-building ("filters opportunities by...") is
 *     now Supabase query-construction logic with no dbClient equivalent --
 *     covered instead by opportunityService.test.ts's
 *     "getOpportunities(): applies filters onto the query builder" test.
 *   - Auto-expiry is intentionally NOT reproduced as a write-on-read side
 *     effect in the new Supabase-backed service (a generic reader wouldn't
 *     have UPDATE rights under RLS to write that expiry back) -- see
 *     opportunityService.ts's own header comment for the "effective
 *     status computed at read time, not persisted" design decision, and
 *     opportunityService.test.ts's expiry-computation test. The
 *     dbClient.expireOverdueOpportunities() local-store behavior itself
 *     is retained below since demo mode still uses it.
 */
describe('Job Marketplace Core Workflows & Lifecycle Tests (local demo-mode data layer -- dbClient.ts)', () => {
  beforeEach(() => {
    db.resetToSeedDefaults();
    // Default to authorized employer (Save the Children Liberia, org-save-children)
    authService.loginAsRoleForTest('employer');
  });

  function baseOppInput(
    overrides: Partial<Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'>> & {
      title: string;
      description: string;
    }
  ): Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'> {
    const session = authService.getSession();
    const orgId = session.activeOrganization!.id;
    return {
      organizationId: orgId,
      organization: session.activeOrganization!,
      slug: overrides.slug || overrides.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: overrides.type || 'job',
      workplaceModel: overrides.workplaceModel || 'on_site',
      county: overrides.county || 'Montserrado',
      locationDetails: overrides.locationDetails || 'Monrovia',
      currency: overrides.currency || 'USD',
      isSalaryNegotiable: overrides.isSalaryNegotiable ?? true,
      isSalaryConfidential: overrides.isSalaryConfidential ?? false,
      summary: overrides.summary || overrides.description.slice(0, 150),
      responsibilities: overrides.responsibilities || [],
      requirements: overrides.requirements || [],
      skills: overrides.skills || [],
      deadline: overrides.deadline || '2026-12-31',
      openingsCount: overrides.openingsCount || 1,
      isFeatured: overrides.isFeatured ?? false,
      status: overrides.status || 'draft',
      ...overrides
    };
  }

  it('allows an authorized employer to create a job in draft state', () => {
    const session = authService.getSession();
    const orgId = session.activeOrganization!.id;

    const opp = db.createOpportunity(
      baseOppInput({
        title: 'Community Health Extension Coordinator',
        employmentType: 'full_time',
        county: 'Nimba',
        locationDetails: 'Sanniquellie District, Nimba County',
        salaryMin: 1200,
        salaryMax: 1800,
        description: 'Full overview of community health extension operations in rural Nimba.',
        responsibilities: ['Mobilize district health officers', 'Manage medical supply distribution'],
        requirements: ['BSc in Public Health or Nursing', '3+ years field experience'],
        skills: ['Public Health', 'Maternal Care', 'Community Mobilization'],
        deadline: '2026-11-30',
        openingsCount: 2,
        status: 'draft'
      }),
      session.user.id
    );

    expect(opp).toBeDefined();
    expect(opp.status).toBe('draft');
    expect(opp.organizationId).toBe(orgId);
    expect(opp.county).toBe('Nimba');
    expect(opp.employmentType).toBe('full_time');
    expect(opp.workplaceModel).toBe('on_site');
  });

  it('allows an authorized employer to publish a draft opportunity', () => {
    const session = authService.getSession();
    const draft = db.createOpportunity(
      baseOppInput({
        title: 'Water & Sanitation Engineer',
        workplaceModel: 'hybrid',
        county: 'Grand Bassa',
        locationDetails: 'Buchanan City',
        description: 'WASH infrastructure implementation.',
        deadline: '2026-12-15',
        status: 'draft'
      }),
      session.user.id
    );
    expect(draft.status).toBe('draft');

    const published = db.updateOpportunity(
      draft.id,
      { status: 'published', postedDate: new Date().toISOString().split('T')[0] },
      session.activeOrganization!.id,
      session.user.id
    );
    expect(published.status).toBe('published');

    const found = db.getOpportunities().find((o) => o.id === draft.id);
    expect(found).toBeDefined();
    expect(found!.status).toBe('published');
  });

  it('allows an authorized employer to edit an existing job vacancy', () => {
    const session = authService.getSession();
    const created = db.createOpportunity(
      baseOppInput({
        title: 'Solar Energy Technician',
        county: 'Bong',
        locationDetails: 'Gbarnga',
        description: 'Solar panel microgrid installer.',
        salaryMin: 800,
        salaryMax: 1200,
        deadline: '2026-10-31',
        status: 'published'
      }),
      session.user.id
    );

    const edited = db.updateOpportunity(
      created.id,
      {
        title: 'Senior Solar Microgrid Lead Engineer',
        salaryMin: 1500,
        salaryMax: 2200,
        workplaceModel: 'hybrid',
        skills: ['Photovoltaics', 'Inverter Systems', 'High Voltage Safety']
      },
      session.activeOrganization!.id,
      session.user.id
    );

    expect(edited.title).toBe('Senior Solar Microgrid Lead Engineer');
    expect(edited.salaryMin).toBe(1500);
    expect(edited.salaryMax).toBe(2200);
    expect(edited.workplaceModel).toBe('hybrid');
    expect(edited.skills).toContain('Photovoltaics');
  });

  it('allows an employer to unpublish a live job back to draft', () => {
    const session = authService.getSession();
    const published = db.createOpportunity(
      baseOppInput({
        title: 'Agricultural Value Chain Specialist',
        county: 'Lofa',
        locationDetails: 'Voinjama',
        description: 'Cocoa and palm oil cooperative development.',
        deadline: '2026-12-01',
        status: 'published'
      }),
      session.user.id
    );

    const unpublished = db.updateOpportunity(
      published.id,
      { status: 'draft' },
      session.activeOrganization!.id,
      session.user.id
    );
    expect(unpublished.status).toBe('draft');

    const stillPublished = db.getOpportunities().filter((o) => o.status === 'published');
    expect(stillPublished.find((o) => o.id === published.id)).toBeUndefined();
  });

  it('allows an employer to close a vacancy', () => {
    const session = authService.getSession();
    const published = db.createOpportunity(
      baseOppInput({
        title: 'Grant Compliance Officer',
        workplaceModel: 'hybrid',
        locationDetails: 'Monrovia',
        description: 'Manage USAID and EU grant reporting.',
        deadline: '2026-11-15',
        status: 'published'
      }),
      session.user.id
    );

    const closed = db.updateOpportunity(
      published.id,
      { status: 'closed' },
      session.activeOrganization!.id,
      session.user.id
    );
    expect(closed.status).toBe('closed');
  });

  it('allows an employer to duplicate an opportunity as a draft', () => {
    const session = authService.getSession();
    const original = db.createOpportunity(
      baseOppInput({
        title: 'Regional Field Monitor',
        county: 'Maryland',
        locationDetails: 'Harper City',
        description: 'Monitor program execution in southeastern counties.',
        salaryMin: 900,
        deadline: '2026-10-15',
        status: 'published'
      }),
      session.user.id
    );

    const copy = db.createOpportunity(
      baseOppInput({
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Math.random().toString(36).substring(2, 6)}`,
        county: original.county,
        locationDetails: original.locationDetails,
        description: original.description,
        status: 'draft'
      }),
      session.user.id
    );

    expect(copy.title).toBe('Regional Field Monitor (Copy)');
    expect(copy.status).toBe('draft');
    expect(copy.county).toBe('Maryland');
    expect(copy.id).not.toBe(original.id);
  });

  it('allows an employer to permanently delete an authorized job', () => {
    const session = authService.getSession();
    const created = db.createOpportunity(
      baseOppInput({
        title: 'Temporary Data Collector',
        locationDetails: 'Kakata',
        county: 'Margibi',
        description: 'Household survey collection.',
        status: 'draft'
      }),
      session.user.id
    );

    db.deleteOpportunity(created.id, session.activeOrganization!.id, session.user.id);
    expect(db.getOpportunityById(created.id)).toBeNull();
  });

  it('enforces multi-tenant isolation: Employer cannot edit or delete opportunities from another organization', () => {
    // Switch to Kofa Technologies (service_provider)
    authService.loginAsRoleForTest('service_provider');
    const contractorSession = authService.getSession();
    expect(contractorSession.activeOrganization!.id).toBe('org-kofa-tech');

    // Attempt to edit Save the Children's opportunity ('opp-1')
    expect(() =>
      db.updateOpportunity(
        'opp-1',
        { title: 'Hacked Opportunity Title' },
        contractorSession.activeOrganization!.id,
        contractorSession.user.id
      )
    ).toThrow(/Cross-tenant access violation/);

    // Attempt to delete Save the Children's opportunity ('opp-1')
    expect(() =>
      db.deleteOpportunity('opp-1', contractorSession.activeOrganization!.id, contractorSession.user.id)
    ).toThrow(/Cross-tenant access violation/);
  });

  it('dbClient.expireOverdueOpportunities() transitions overdue published opportunities to expired', () => {
    const session = authService.getSession();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    const opp = db.createOpportunity(
      baseOppInput({
        title: 'Past Tenders Submission',
        type: 'tender',
        locationDetails: 'Monrovia',
        description: 'Historic tender.',
        deadline: pastDateStr,
        status: 'published'
      }),
      session.user.id
    );

    const expiredCount = db.expireOverdueOpportunities();
    expect(expiredCount).toBeGreaterThanOrEqual(1);
    expect(db.getOpportunityById(opp.id)!.status).toBe('expired');
  });
});
