/**
 * verificationService.ts
 *
 * Phase 3, Service 7 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status", and
 * docs/PHASE3_SERVICE7_VERIFICATION.md for the live proof).
 *
 * submit() inserts directly into public.verification_audits -- the
 * existing "org admins can insert" RLS policy already scopes this
 * correctly. decide() calls decide_verification_audit(), a SECURITY
 * DEFINER RPC and the ONLY path to approving/rejecting a request: no
 * generic UPDATE policy exists on verification_audits at all, so a
 * direct table UPDATE (even from a platform admin) is a no-op under
 * RLS regardless of intent.
 *
 * Two real gaps this migration closed, not just a schema catch-up (see
 * the migration file's own header comment for detail):
 *   - There was no way for a platform admin to even SEE a pending
 *     request from an organization they don't belong to (which, for a
 *     platform admin, is normally every org) -- the review queue was
 *     unreachable through RLS as written before this migration.
 *   - Approving a request never touched the organization's
 *     verification_status/verification_badge in the old dbClient.ts
 *     implementation -- "verification" was purely cosmetic. The RPC now
 *     updates both tables atomically, and (observed live, not assumed)
 *     Service 1's sync_organization_verified_flag trigger automatically
 *     keeps organizations.is_verified in sync as a result -- these
 *     migrations compose correctly with each other.
 */

import { VerificationAudit } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../core/errors/AppError';

interface VerificationAuditRow {
  id: string;
  organization_id: string;
  requested_by_user_id: string;
  status: string;
  requested_badge: string;
  documents_submitted: string[] | null;
  reviewer_user_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  organizations?: { name: string; type: string; county: string; registration_number: string | null; tax_id_number: string | null } | null;
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; verificationService requires a live backend.');
  }
  return c;
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError(error.message || 'You do not have permission to perform this action.');
  }
  throw new Error(error.message);
}

function rowToAudit(row: VerificationAuditRow): VerificationAudit {
  return {
    id: row.id,
    organizationName: row.organizations?.name || '',
    organizationType: row.organizations?.type || '',
    county: (row.organizations?.county as VerificationAudit['county']) || ('Montserrado' as VerificationAudit['county']),
    registryNumber: row.organizations?.registration_number || '',
    taxIdNumber: row.organizations?.tax_id_number || '',
    badgeRequested: row.requested_badge as VerificationAudit['badgeRequested'],
    submissionDate: row.created_at ? row.created_at.split('T')[0] : '',
    status: row.status as VerificationAudit['status'],
    documents: row.documents_submitted || []
  };
}

const SELECT_WITH_ORG = '*, organizations(name, type, county, registration_number, tax_id_number)';

export const verificationService = {
  /** Returns whatever the caller's RLS grants: their own org's requests, or every request for a platform admin's review queue. */
  async list(): Promise<ApiResponse<VerificationAudit[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().from('verification_audits').select(SELECT_WITH_ORG);
      if (error) throw new Error(error.message);
      return (data as VerificationAuditRow[]).map(rowToAudit);
    });
  },

  async submit(
    audit: Omit<VerificationAudit, 'id' | 'submissionDate' | 'status'> & { organizationId?: string }
  ): Promise<ApiResponse<VerificationAudit>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) throw new UnauthorizedError('Sign in required to request verification.');
      if (!authService.can('verification.request')) {
        throw new ForbiddenError('Only registered enterprise and institution accounts can submit verification files.');
      }
      const organizationId = audit.organizationId || session.activeOrganization?.id;
      if (!organizationId) {
        throw new ValidationError('An organization must be selected to request verification.');
      }

      const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { data, error } = await client()
        .from('verification_audits')
        .insert({
          id,
          organization_id: organizationId,
          requested_by_user_id: session.user.id,
          requested_badge: audit.badgeRequested,
          documents_submitted: audit.documents || [],
          status: 'pending'
        })
        .select(SELECT_WITH_ORG)
        .maybeSingle();
      if (error) translateError(error);
      return rowToAudit(data as VerificationAuditRow);
    });
  },

  async decide(auditId: string, status: 'approved' | 'rejected', reviewerNotes?: string): Promise<ApiResponse<VerificationAudit>> {
    return apiClient.execute(async () => {
      if (!authService.can('verification.decide')) {
        throw new ForbiddenError('Only authorized Verification Officers can approve or reject institutional credentials.');
      }

      const { data, error } = await client().rpc('decide_verification_audit', {
        p_audit_id: auditId,
        p_decision: status,
        p_reviewer_notes: reviewerNotes ?? null
      });
      if (error) translateError(error);

      // The RPC returns the bare verification_audits row (no join) --
      // re-fetch with the organization join for a fully-populated
      // display object, matching what list()/submit() return.
      const { data: full, error: fetchError } = await client()
        .from('verification_audits')
        .select(SELECT_WITH_ORG)
        .eq('id', (data as VerificationAuditRow).id)
        .maybeSingle();
      if (fetchError) throw new Error(fetchError.message);
      return rowToAudit(full as VerificationAuditRow);
    });
  }
};
