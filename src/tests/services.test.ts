import { describe, it, expect, beforeEach } from 'vitest';
import { businessService } from '../services/businessService';
import { authService } from '../services/authService';
import { db } from '../db/dbClient';

describe('Domain Services Architecture', () => {
  beforeEach(() => {
    db.resetToSeedDefaults();
    authService.loginAsRoleForTest('job_seeker');
  });

  // As of Phase 3, Service 2 (see src/tests/jobMarketplace.test.ts's header
  // comment for the full explanation), opportunityService.ts reads/writes
  // Supabase exclusively and no longer touches dbClient.ts -- so this test
  // was retargeted to dbClient.ts's own getOpportunities(), which is the
  // local demo-mode data layer that's actually being exercised here.
  // Supabase-query-filter construction is covered instead by
  // opportunityService.test.ts's mocked-client filter test.
  it('filters opportunities by county (local demo-mode data layer -- dbClient.ts)', () => {
    const opps = db.getOpportunities().filter((o) => o.county === 'Montserrado');
    expect(opps.length).toBeGreaterThan(0);
    opps.forEach((opp) => {
      expect(opp.county).toBe('Montserrado');
    });
  });

  // As of Phase 3, Service 3 (see src/tests/candidateAndApplication.test.ts's
  // header comment), applicationService.ts also reads/writes Supabase
  // exclusively now -- retargeted to dbClient.ts directly for the same
  // reason as the opportunities test above.
  it('submits a candidate application and returns a standardized response (local demo-mode data layer -- dbClient.ts)', () => {
    const opps = db.getOpportunities();
    const opp = opps[0];

    const res = db.createApplication({
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      organizationName: opp.organization.name,
      applicantName: 'Fatu Kamara',
      applicantEmail: 'fatu.kamara@example.lr',
      applicantPhone: '+231 77 111 2222',
      coverNote: 'Experienced professional'
    });

    expect(res).toBeDefined();
    expect(res.applicantName).toBe('Fatu Kamara');
    expect(res.stage).toBe('applied');
  });

  it('updates application recruitment stage when authorized (local demo-mode data layer -- dbClient.ts)', () => {
    authService.loginAsRoleForTest('employer');
    const employerSession = authService.getSession();
    const opps = db.getOpportunities();
    const opp = opps[0];

    const createRes = db.createApplication({
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      organizationName: opp.organization.name,
      applicantName: 'Boakai Sumo',
      applicantEmail: 'boakai@example.lr',
      applicantPhone: '+231 88 222 3333'
    });

    const updateRes = db.updateApplicationStage(
      createRes.id,
      'interview',
      { note: 'Scheduled technical interview', matchNotes: 'Scheduled technical interview' },
      employerSession.activeOrganization?.id,
      employerSession.user.id
    );
    expect(updateRes.stage).toBe('interview');
    expect(updateRes.matchNotes).toBe('Scheduled technical interview');
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
