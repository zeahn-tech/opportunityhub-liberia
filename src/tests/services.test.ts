import { describe, it, expect, beforeEach } from 'vitest';
import { opportunityService } from '../services/opportunityService';
import { applicationService } from '../services/applicationService';
import { businessService } from '../services/businessService';
import { authService } from '../services/authService';
import { db } from '../db/dbClient';

describe('Domain Services Architecture', () => {
  beforeEach(() => {
    db.resetToSeedDefaults();
    authService.loginAsRoleForTest('job_seeker');
  });

  it('filters opportunities by county and type via opportunityService', async () => {
    const res = await opportunityService.list({ county: 'Montserrado' });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.length).toBeGreaterThan(0);
    res.data!.forEach((opp) => {
      expect(opp.county).toBe('Montserrado');
    });
  });

  it('submits a candidate application and returns a standardized response', async () => {
    const opps = db.getOpportunities();
    const opp = opps[0];

    const res = await applicationService.submit({
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      organizationName: opp.organization.name,
      applicantName: 'Fatu Kamara',
      applicantEmail: 'fatu.kamara@example.lr',
      applicantPhone: '+231 77 111 2222',
      coverNote: 'Experienced professional'
    });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.applicantName).toBe('Fatu Kamara');
    expect(res.data!.stage).toBe('applied');
  });

  it('updates application recruitment stage when authorized', async () => {
    authService.loginAsRoleForTest('employer');
    const opps = db.getOpportunities();
    const opp = opps[0];

    const createRes = await applicationService.submit({
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      organizationName: opp.organization.name,
      applicantName: 'Boakai Sumo',
      applicantEmail: 'boakai@example.lr',
      applicantPhone: '+231 88 222 3333'
    });

    const updateRes = await applicationService.updateStage(createRes.data!.id, 'interview', 'Scheduled technical interview');
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.stage).toBe('interview');
    expect(updateRes.data!.matchNotes).toBe('Scheduled technical interview');
  });

  it('allows investor/buyer to request NDA access to confidential businesses', async () => {
    authService.loginAsRoleForTest('investor_buyer');
    const businesses = db.getBusinesses();
    const confidentialBiz = businesses.find((b) => b.isConfidential);
    expect(confidentialBiz).toBeDefined();

    const res = await businessService.requestNdaAccess(confidentialBiz!.id);
    expect(res.status).toBe(200);
    expect(res.data).toBe(true);

    const updated = db.getBusinessById(confidentialBiz!.id);
    expect(updated?.accessGranted).toBe(true);
  });
});
