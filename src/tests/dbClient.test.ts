import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/dbClient';
import { storageAdapter } from '../db/storageAdapter';
import { TenantIsolationError, ValidationError } from '../core/errors/AppError';

describe('Relational Database Client & Tenant Isolation', () => {
  beforeEach(() => {
    db.resetToSeedDefaults();
  });

  it('should initialize seed datasets for organizations, opportunities, and users', () => {
    const orgs = db.getOrganizations();
    const opps = db.getOpportunities();
    const users = db.getUsers();

    expect(orgs.length).toBeGreaterThanOrEqual(5);
    expect(opps.length).toBeGreaterThanOrEqual(5);
    expect(users.length).toBeGreaterThanOrEqual(5);
  });

  it('should retrieve opportunities scoped by tenant', () => {
    const saveChildrenOpps = db.getOpportunitiesByTenant('org-save-children');
    expect(saveChildrenOpps.length).toBeGreaterThan(0);
    saveChildrenOpps.forEach((opp) => {
      expect(opp.organizationId).toBe('org-save-children');
    });
  });

  it('should prevent cross-tenant modifications', () => {
    const opps = db.getOpportunities();
    const targetOpp = opps.find((o) => o.organizationId === 'org-save-children');
    expect(targetOpp).toBeDefined();

    // Trying to update with a mismatched actor tenant
    expect(() => {
      db.updateOpportunity(targetOpp!.id, { title: 'Unauthorized Modification' }, 'org-mpw-gov');
    }).toThrowError(TenantIsolationError);
  });

  it('should reject opportunity creation if organization does not exist', () => {
    expect(() => {
      db.createOpportunity({
        organizationId: 'non-existent-org-999',
        organization: {} as any,
        title: 'Ghost Opportunity',
        slug: 'ghost-opp',
        type: 'job',
        workplaceModel: 'on_site',
        county: 'Montserrado',
        locationDetails: 'Monrovia',
        currency: 'USD',
        summary: 'Summary',
        description: 'Description',
        responsibilities: [],
        requirements: [],
        skills: [],
        deadline: '2026-12-31',
        openingsCount: 1,
        status: 'published'
      });
    }).toThrowError(ValidationError);
  });

  it('should automatically emit audit logs upon creating an application', () => {
    const opps = db.getOpportunities();
    const targetOpp = opps[0];

    const app = db.createApplication({
      opportunityId: targetOpp.id,
      opportunityTitle: targetOpp.title,
      organizationName: targetOpp.organization.name,
      applicantName: 'Kollie Johnson',
      applicantEmail: 'kollie.j@example.lr',
      applicantPhone: '+231 77 000 9999',
      coverNote: 'Excited to apply'
    });

    expect(app.id).toBeDefined();
    expect(app.stage).toBe('applied');

    const auditLogs = storageAdapter.getItem<any[]>('audit_logs');
    expect(auditLogs).toBeDefined();
    const appLog = auditLogs?.find((l) => l.action === 'application.submitted');
    expect(appLog).toBeDefined();
    expect(appLog.targetId).toBe(app.id);
  });
});
