import { describe, it, expect, beforeEach } from 'vitest';
import { opportunityService } from '../services/opportunityService';
import { authService } from '../services/authService';
import { db } from '../db/dbClient';
import { Opportunity } from '../types';

describe('Job Marketplace Core Workflows & Lifecycle Tests', () => {
  beforeEach(() => {
    db.resetToSeedDefaults();
    // Default to authorized employer (Save the Children Liberia, org-save-children)
    authService.loginAsRoleForTest('employer');
  });

  it('allows an authorized employer to create a job in draft state', async () => {
    const session = authService.getSession();
    const orgId = session.activeOrganization!.id;

    const res = await opportunityService.createDraft({
      title: 'Community Health Extension Coordinator',
      slug: 'community-health-extension-coordinator',
      type: 'job',
      employmentType: 'full_time',
      workplaceModel: 'on_site',
      county: 'Nimba',
      locationDetails: 'Sanniquellie District, Nimba County',
      salaryMin: 1200,
      salaryMax: 1800,
      currency: 'USD',
      isSalaryNegotiable: true,
      isSalaryConfidential: false,
      summary: 'Coordinate grassroots maternal and child health interventions across Nimba County.',
      description: 'Full overview of community health extension operations in rural Nimba.',
      responsibilities: ['Mobilize district health officers', 'Manage medical supply distribution'],
      requirements: ['BSc in Public Health or Nursing', '3+ years field experience'],
      skills: ['Public Health', 'Maternal Care', 'Community Mobilization'],
      deadline: '2026-11-30',
      openingsCount: 2,
      isFeatured: false
    });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.status).toBe('draft');
    expect(res.data!.organizationId).toBe(orgId);
    expect(res.data!.county).toBe('Nimba');
    expect(res.data!.employmentType).toBe('full_time');
    expect(res.data!.workplaceModel).toBe('on_site');
  });

  it('allows an authorized employer to publish a draft opportunity', async () => {
    const draftRes = await opportunityService.createDraft({
      title: 'Water & Sanitation Engineer',
      slug: 'water-sanitation-engineer',
      type: 'job',
      workplaceModel: 'hybrid',
      county: 'Grand Bassa',
      locationDetails: 'Buchanan City',
      description: 'WASH infrastructure implementation.',
      deadline: '2026-12-15'
    });

    const draftId = draftRes.data!.id;
    expect(draftRes.data!.status).toBe('draft');

    // Publish the draft
    const publishRes = await opportunityService.publish(draftId);
    expect(publishRes.status).toBe(200);
    expect(publishRes.data!.status).toBe('published');

    // Verify it appears in public published listings
    const publicList = await opportunityService.list({ status: 'published' });
    const found = publicList.data!.find((o) => o.id === draftId);
    expect(found).toBeDefined();
    expect(found!.status).toBe('published');
  });

  it('allows an authorized employer to edit an existing job vacancy', async () => {
    const createRes = await opportunityService.publish({
      title: 'Solar Energy Technician',
      slug: 'solar-energy-technician',
      type: 'job',
      workplaceModel: 'on_site',
      county: 'Bong',
      locationDetails: 'Gbarnga',
      description: 'Solar panel microgrid installer.',
      salaryMin: 800,
      salaryMax: 1200,
      deadline: '2026-10-31'
    });

    const oppId = createRes.data!.id;

    // Edit the opportunity
    const editRes = await opportunityService.update(oppId, {
      title: 'Senior Solar Microgrid Lead Engineer',
      salaryMin: 1500,
      salaryMax: 2200,
      workplaceModel: 'hybrid',
      skills: ['Photovoltaics', 'Inverter Systems', 'High Voltage Safety']
    });

    expect(editRes.status).toBe(200);
    expect(editRes.data!.title).toBe('Senior Solar Microgrid Lead Engineer');
    expect(editRes.data!.salaryMin).toBe(1500);
    expect(editRes.data!.salaryMax).toBe(2200);
    expect(editRes.data!.workplaceModel).toBe('hybrid');
    expect(editRes.data!.skills).toContain('Photovoltaics');
  });

  it('allows an employer to unpublish a live job back to draft', async () => {
    const pubRes = await opportunityService.publish({
      title: 'Agricultural Value Chain Specialist',
      slug: 'agri-specialist',
      type: 'job',
      workplaceModel: 'on_site',
      county: 'Lofa',
      locationDetails: 'Voinjama',
      description: 'Cocoa and palm oil cooperative development.',
      deadline: '2026-12-01'
    });

    const oppId = pubRes.data!.id;
    const unpublishRes = await opportunityService.unpublishToDraft(oppId);

    expect(unpublishRes.status).toBe(200);
    expect(unpublishRes.data!.status).toBe('draft');

    // Public list should not show the draft
    const publicList = await opportunityService.list({ status: 'published' });
    const found = publicList.data!.find((o) => o.id === oppId);
    expect(found).toBeUndefined();
  });

  it('allows an employer to close a vacancy', async () => {
    const pubRes = await opportunityService.publish({
      title: 'Grant Compliance Officer',
      slug: 'grant-compliance-officer',
      type: 'job',
      workplaceModel: 'hybrid',
      county: 'Montserrado',
      locationDetails: 'Monrovia',
      description: 'Manage USAID and EU grant reporting.',
      deadline: '2026-11-15'
    });

    const oppId = pubRes.data!.id;
    const closeRes = await opportunityService.close(oppId);

    expect(closeRes.status).toBe(200);
    expect(closeRes.data!.status).toBe('closed');
  });

  it('allows an employer to duplicate an opportunity as a draft', async () => {
    const origRes = await opportunityService.publish({
      title: 'Regional Field Monitor',
      slug: 'regional-field-monitor',
      type: 'job',
      workplaceModel: 'on_site',
      county: 'Maryland',
      locationDetails: 'Harper City',
      description: 'Monitor program execution in southeastern counties.',
      salaryMin: 900,
      deadline: '2026-10-15'
    });

    const dupRes = await opportunityService.duplicate(origRes.data!.id);
    expect(dupRes.status).toBe(200);
    expect(dupRes.data!.title).toBe('Regional Field Monitor (Copy)');
    expect(dupRes.data!.status).toBe('draft');
    expect(dupRes.data!.county).toBe('Maryland');
    expect(dupRes.data!.id).not.toBe(origRes.data!.id);
  });

  it('allows an employer to permanently delete an authorized job', async () => {
    const oppRes = await opportunityService.createDraft({
      title: 'Temporary Data Collector',
      slug: 'temp-data-collector',
      type: 'job',
      workplaceModel: 'on_site',
      county: 'Margibi',
      locationDetails: 'Kakata',
      description: 'Household survey collection.'
    });

    const oppId = oppRes.data!.id;
    const delRes = await opportunityService.delete(oppId);
    expect(delRes.status).toBe(200);

    const checkRes = await opportunityService.getById(oppId);
    expect(checkRes.data).toBeNull();
  });

  it('enforces multi-tenant isolation: Employer cannot edit or delete opportunities from another organization', async () => {
    // Switch to Kofa Technologies (service_provider)
    authService.loginAsRoleForTest('service_provider');
    const contractorSession = authService.getSession();
    expect(contractorSession.activeOrganization!.id).toBe('org-kofa-tech');

    // Attempt to edit Save the Children's opportunity ('opp-1')
    const unauthorizedEdit = await opportunityService.update('opp-1', {
      title: 'Hacked Opportunity Title'
    });

    expect(unauthorizedEdit.status).toBe(403);
    expect(unauthorizedEdit.error?.message).toContain('Cross-tenant access violation');

    // Attempt to delete Save the Children's opportunity ('opp-1')
    const unauthorizedDelete = await opportunityService.delete('opp-1');
    expect(unauthorizedDelete.status).toBe(403);
    expect(unauthorizedDelete.error?.message).toContain('Cross-tenant access violation');
  });

  it('filters opportunities by multi-parameter criteria (County, Employment Type, Workplace Model, Salary)', async () => {
    // Seed test jobs with diverse parameters
    await opportunityService.publish({
      title: 'Remote Full-Stack Developer',
      slug: 'remote-full-stack-dev',
      type: 'job',
      employmentType: 'full_time',
      workplaceModel: 'remote',
      county: 'Montserrado',
      locationDetails: 'Monrovia / Remote',
      salaryMin: 2500,
      salaryMax: 4000,
      currency: 'USD',
      description: 'React and Node development.',
      skills: ['React', 'TypeScript', 'Node.js']
    });

    await opportunityService.publish({
      title: 'On-Site Forestry Supervisor',
      slug: 'forestry-supervisor',
      type: 'job',
      employmentType: 'contract',
      workplaceModel: 'on_site',
      county: 'Sinoe',
      locationDetails: 'Greenville',
      salaryMin: 900,
      salaryMax: 1400,
      currency: 'USD',
      description: 'Forest conservation monitoring.',
      skills: ['Forestry', 'GPS Mapping']
    });

    // Filter 1: Remote workplace model
    const remoteList = await opportunityService.list({ workplaceModel: 'remote' });
    expect(remoteList.data!.length).toBeGreaterThanOrEqual(1);
    remoteList.data!.forEach((o) => expect(o.workplaceModel).toBe('remote'));

    // Filter 2: County = Sinoe
    const sinoeList = await opportunityService.list({ county: 'Sinoe' });
    expect(sinoeList.data!.length).toBeGreaterThanOrEqual(1);
    sinoeList.data!.forEach((o) => expect(o.county).toBe('Sinoe'));

    // Filter 3: Min Salary >= 2000
    const highSalaryList = await opportunityService.list({ minSalary: 2000 });
    expect(highSalaryList.data!.length).toBeGreaterThanOrEqual(1);
    highSalaryList.data!.forEach((o) => expect(o.salaryMin).toBeGreaterThanOrEqual(2000));

    // Filter 4: Keyword Search
    const searchList = await opportunityService.list({ query: 'Forestry' });
    expect(searchList.data!.length).toBeGreaterThanOrEqual(1);
    expect(searchList.data![0].title).toContain('Forestry');
  });

  it('automatically detects and transitions expired opportunities', async () => {
    // Create opportunity with past deadline
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    const expiredOpp = await opportunityService.publish({
      title: 'Past Tenders Submission',
      slug: 'past-tenders-submission',
      type: 'tender',
      workplaceModel: 'on_site',
      county: 'Montserrado',
      locationDetails: 'Monrovia',
      description: 'Historic tender.',
      deadline: pastDateStr
    });

    expect(expiredOpp.data).toBeDefined();

    // Query through service list which triggers expireOverdueOpportunities
    const oppDetails = await opportunityService.getById(expiredOpp.data!.id);
    expect(oppDetails.status).toBe(200);
    expect(oppDetails.data!.status).toBe('expired');
  });
});
