import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/authService';

describe('RBAC Authorization Matrix', () => {
  beforeEach(() => {
    authService.switchRole('job_seeker');
  });

  it('allows job seekers to browse and apply, but denies posting jobs', () => {
    authService.switchRole('job_seeker');

    expect(authService.can('opportunity.browse')).toBe(true);
    expect(authService.can('opportunity.apply')).toBe(true);
    expect(authService.can('opportunity.create')).toBe(false);
    expect(authService.can('verification.decide')).toBe(false);
    expect(authService.can('audit.view_global')).toBe(false);
  });

  it('allows employers to create and edit opportunities within their organization', () => {
    authService.switchRole('employer');
    const session = authService.getSession();
    const orgId = session.activeOrganization?.id;
    expect(orgId).toBeDefined();

    expect(authService.can('opportunity.create')).toBe(true);
    expect(authService.can('opportunity.edit', orgId!)).toBe(true);
    // Denies editing another tenant's opportunity
    expect(authService.can('opportunity.edit', 'other-tenant-id')).toBe(false);
    expect(authService.can('opportunity.apply')).toBe(false);
  });

  it('allows verification officers to decide verification requests', () => {
    authService.switchRole('verification_officer');

    expect(authService.can('verification.decide')).toBe(true);
    expect(authService.can('opportunity.apply')).toBe(false);
  });

  it('grants platform admin global override privileges', () => {
    authService.switchRole('platform_admin');

    expect(authService.can('opportunity.browse')).toBe(true);
    expect(authService.can('opportunity.create')).toBe(true);
    expect(authService.can('verification.decide')).toBe(true);
    expect(authService.can('audit.view_global')).toBe(true);
  });
});
