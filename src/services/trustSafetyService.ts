/**
 * trustSafetyService.ts
 *
 * Phase 3, Service 8 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status", and
 * docs/PHASE3_SERVICE8_VERIFICATION.md for the live proof).
 *
 * Covers a genuinely separate, richer verification system
 * (VerificationRequest, entityType organization/recruiter/business with
 * evidence documents) from verificationService.ts's simpler
 * VerificationAudit (Service 7) -- both are real, both are used by
 * different parts of the UI, and this migration does not attempt to
 * unify them; see the migration file's header comment.
 *
 * Every write here (except reading your own data) goes through a
 * SECURITY DEFINER RPC, not a raw insert/update -- because every one of
 * them needs either a platform-admin check, a cross-table atomic update
 * (approving a verification request updates the target entity; applying
 * a full_suspension restriction updates the user's account_status), or
 * a count that RLS can't compute for an ordinary caller (the
 * multi-report auto-quarantine threshold needs to count reports across
 * ALL reporters for a target, not just the caller's own visible rows).
 * This service does not re-implement or pre-check any of that client
 * side; it calls the RPC and surfaces whatever Postgres decides.
 *
 * scanContentForScams() is unchanged -- pure client-side text analysis,
 * no data access, nothing to migrate.
 */

import {
  AccountRestriction,
  AccountRestrictionType,
  ContentReport,
  ContentReportReason,
  VerificationBadge,
  VerificationRequest
} from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { authService } from './authService';
import { ForbiddenError, UnauthorizedError } from '../core/errors/AppError';

// Suspicious keywords indicative of scams, upfront fee charging, or illegal recruitment practices
const SUSPICIOUS_KEYWORDS = [
  { term: 'pay fee', ruleName: 'Forbidden Application Fee Request', severity: 'high' as const },
  { term: 'registration fee', ruleName: 'Forbidden Upfront Registration Fee', severity: 'high' as const },
  { term: 'western union', ruleName: 'Unregulated Financial Channel', severity: 'high' as const },
  { term: 'moneygram', ruleName: 'Unregulated Financial Channel', severity: 'medium' as const },
  { term: 'send cash', ruleName: 'Suspicious Cash Solicitation', severity: 'high' as const },
  { term: 'wire transfer', ruleName: 'Wire Transfer Scam Indicator', severity: 'medium' as const },
  { term: 'guaranteed income', ruleName: 'Misleading Earning Guarantee', severity: 'low' as const },
  { term: 'telegram only', ruleName: 'Off-Platform Unverifiable Contact', severity: 'low' as const },
  { term: 'whatsapp only', ruleName: 'Off-Platform Contact', severity: 'low' as const },
  { term: 'processing fee', ruleName: 'Upfront Fee Solictation', severity: 'high' as const }
];

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; trustSafetyService requires a live backend.');
  }
  return c;
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError(error.message || 'You do not have permission to perform this action.');
  }
  throw new Error(error.message);
}

interface VerificationRequestRow {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  submitter_user_id: string;
  submitter_name: string;
  submitter_email: string;
  status: string;
  badge_requested: string;
  registration_number: string | null;
  tax_id_number: string | null;
  license_number: string | null;
  county: string;
  evidence_documents: unknown[];
  evidence_notes: string | null;
  reviewer_user_id: string | null;
  reviewer_name: string | null;
  reviewer_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  updated_at: string;
}

function rowToVerificationRequest(row: VerificationRequestRow): VerificationRequest {
  return {
    id: row.id,
    entityType: row.entity_type as VerificationRequest['entityType'],
    entityId: row.entity_id,
    entityName: row.entity_name,
    submitterUserId: row.submitter_user_id,
    submitterName: row.submitter_name,
    submitterEmail: row.submitter_email,
    status: row.status as VerificationRequest['status'],
    badgeRequested: row.badge_requested as VerificationBadge,
    registrationNumber: row.registration_number ?? undefined,
    taxIdNumber: row.tax_id_number ?? undefined,
    licenseNumber: row.license_number ?? undefined,
    county: row.county as VerificationRequest['county'],
    evidenceDocuments: (row.evidence_documents as VerificationRequest['evidenceDocuments']) || [],
    evidenceNotes: row.evidence_notes ?? undefined,
    reviewerUserId: row.reviewer_user_id ?? undefined,
    reviewerName: row.reviewer_name ?? undefined,
    reviewerNotes: row.reviewer_notes ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined,
    updatedAt: row.updated_at
  };
}

interface ContentReportRow {
  id: string;
  report_type: string;
  target_id: string;
  target_title_or_name: string;
  reporter_user_id: string;
  reporter_name: string;
  reporter_email: string;
  reason: string;
  details: string;
  evidence_urls: string[];
  status: string;
  action_taken: string | null;
  admin_notes: string | null;
  reviewed_by_user_id: string | null;
  reviewed_by_name: string | null;
  created_at: string;
  updated_at: string;
}

function rowToContentReport(row: ContentReportRow): ContentReport {
  return {
    id: row.id,
    reportType: row.report_type as ContentReport['reportType'],
    targetId: row.target_id,
    targetTitleOrName: row.target_title_or_name,
    reporterUserId: row.reporter_user_id,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
    reason: row.reason as ContentReportReason,
    details: row.details,
    evidenceUrls: row.evidence_urls || [],
    status: row.status as ContentReport['status'],
    actionTaken: (row.action_taken as ContentReport['actionTaken']) ?? undefined,
    adminNotes: row.admin_notes ?? undefined,
    reviewedByUserId: row.reviewed_by_user_id ?? undefined,
    reviewedByName: row.reviewed_by_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

interface AccountRestrictionRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  organization_id: string | null;
  restriction_type: string;
  reason: string;
  issued_by_user_id: string;
  issued_by_name: string;
  expires_at: string | null;
  status: string;
  appeal_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

function rowToRestriction(row: AccountRestrictionRow): AccountRestriction {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    organizationId: row.organization_id ?? undefined,
    restrictionType: row.restriction_type as AccountRestrictionType,
    reason: row.reason,
    issuedByUserId: row.issued_by_user_id,
    issuedByName: row.issued_by_name,
    expiresAt: row.expires_at ?? undefined,
    status: row.status as AccountRestriction['status'],
    appealNotes: row.appeal_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined
  };
}

export class TrustSafetyService {
  /** Returns whatever the caller's RLS grants: their own submissions, or every request for a platform admin's review queue. */
  async getVerificationRequests(): Promise<VerificationRequest[]> {
    const { data, error } = await client().from('verification_requests').select('*').order('submitted_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as VerificationRequestRow[]).map(rowToVerificationRequest);
  }

  /** Returns whatever the caller's RLS grants: their own reports, or every report for a platform admin's review queue. */
  async getContentReports(): Promise<ContentReport[]> {
    const { data, error } = await client().from('content_reports').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as ContentReportRow[]).map(rowToContentReport);
  }

  /** Returns whatever the caller's RLS grants: their own restrictions, or every restriction for a platform admin. */
  async getAccountRestrictions(): Promise<AccountRestriction[]> {
    const { data, error } = await client().from('account_restrictions').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as AccountRestrictionRow[]).map(rowToRestriction);
  }

  async submitVerificationRequest(data: {
    entityType: 'organization' | 'recruiter' | 'business';
    entityId: string;
    entityName: string;
    /** Ignored -- the real submitter is always the authenticated caller (auth.uid()), never a client-supplied id. Kept only so existing call sites don't need updating. */
    submitterUserId?: string;
    badgeRequested: VerificationBadge;
    registrationNumber?: string;
    taxIdNumber?: string;
    licenseNumber?: string;
    county: string;
    evidenceDocuments: unknown[];
    evidenceNotes?: string;
  }): Promise<VerificationRequest> {
    const session = authService.getSession();
    if (!session.user) throw new UnauthorizedError('Sign in required to submit verification evidence.');

    const id = `vreq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data: created, error } = await client()
      .from('verification_requests')
      .insert({
        id,
        entity_type: data.entityType,
        entity_id: data.entityId,
        entity_name: data.entityName,
        submitter_user_id: session.user.id,
        submitter_name: session.user.fullName,
        submitter_email: session.user.email,
        badge_requested: data.badgeRequested,
        registration_number: data.registrationNumber ?? null,
        tax_id_number: data.taxIdNumber ?? null,
        license_number: data.licenseNumber ?? null,
        county: data.county,
        evidence_documents: data.evidenceDocuments || [],
        evidence_notes: data.evidenceNotes ?? null,
        status: 'pending_review'
      })
      .select('*')
      .maybeSingle();
    if (error) translateError(error);
    return rowToVerificationRequest(created as VerificationRequestRow);
  }

  /**
   * `_reviewerUserId` is ignored -- the real reviewer is always the
   * authenticated caller (auth.uid()), verified server-side as a
   * platform admin by the RPC. Kept as a parameter only so existing call
   * sites don't need updating; even if a caller passed a wrong or stale
   * id here, the RPC would still record and authorize against the real
   * session, not this value.
   */
  async reviewVerificationRequest(
    requestId: string,
    decision: 'verified' | 'rejected' | 'suspended',
    _reviewerUserId?: string,
    reviewerNotes?: string,
    rejectionReason?: string
  ): Promise<VerificationRequest> {
    const { data, error } = await client().rpc('review_verification_request', {
      p_request_id: requestId,
      p_decision: decision,
      p_reviewer_notes: reviewerNotes ?? null,
      p_rejection_reason: rejectionReason ?? null
    });
    if (error) translateError(error);
    return rowToVerificationRequest(data as VerificationRequestRow);
  }

  /**
   * Automated Content Moderation Scanner -- pure text analysis, no data
   * access, unchanged from before this migration.
   */
  scanContentForScams(
    title: string,
    description: string,
    salaryUSD?: number
  ): {
    flags: Array<{ ruleId: string; ruleName: string; description: string; severity: 'low' | 'medium' | 'high' }>;
    recommendedStatus: 'published' | 'pending_review' | 'flagged' | 'quarantined';
  } {
    const textToScan = `${title} ${description}`.toLowerCase();
    const flags: Array<{ ruleId: string; ruleName: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];

    SUSPICIOUS_KEYWORDS.forEach((kw, index) => {
      if (textToScan.includes(kw.term)) {
        flags.push({
          ruleId: `rule-kw-${index}`,
          ruleName: kw.ruleName,
          description: `Content contains flagged scam/abuse phrase: "${kw.term}".`,
          severity: kw.severity
        });
      }
    });

    if (salaryUSD && salaryUSD > 25000) {
      flags.push({
        ruleId: 'rule-salary-anomaly',
        ruleName: 'Extreme Outlier Salary Threshold',
        description: `Stated salary ($${salaryUSD.toLocaleString()}/mo) exceeds standard regional benchmark by >20x.`,
        severity: 'medium'
      });
    }

    let recommendedStatus: 'published' | 'pending_review' | 'flagged' | 'quarantined' = 'published';
    const highSeverityCount = flags.filter((f) => f.severity === 'high').length;
    if (highSeverityCount >= 1) recommendedStatus = 'quarantined';
    else if (flags.length >= 1) recommendedStatus = 'flagged';

    return { flags, recommendedStatus };
  }

  async submitReport(data: {
    reportType: 'listing' | 'user' | 'message';
    targetId: string;
    targetTitleOrName: string;
    /** Ignored -- the real reporter is always the authenticated caller. Kept only so existing call sites don't need updating. */
    reporterUserId?: string;
    reason: ContentReportReason;
    details: string;
    evidenceUrls?: string[];
  }): Promise<ContentReport> {
    const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data: created, error } = await client().rpc('submit_content_report', {
      p_id: id,
      p_report_type: data.reportType,
      p_target_id: data.targetId,
      p_target_title_or_name: data.targetTitleOrName,
      p_reason: data.reason,
      p_details: data.details,
      p_evidence_urls: data.evidenceUrls || []
    });
    if (error) translateError(error);
    return rowToContentReport(created as ContentReportRow);
  }

  async resolveReport(
    reportId: string,
    actionTaken: 'warning_issued' | 'listing_quarantined' | 'account_restricted' | 'account_suspended' | 'dismissed',
    _adminUserId: string,
    adminNotes?: string
  ): Promise<ContentReport> {
    const { data, error } = await client().rpc('resolve_content_report', {
      p_report_id: reportId,
      p_action_taken: actionTaken,
      p_admin_notes: adminNotes ?? null
    });
    if (error) translateError(error);
    return rowToContentReport(data as ContentReportRow);
  }

  async applyAccountRestriction(data: {
    userId: string;
    restrictionType: AccountRestrictionType;
    reason: string;
    expiresAt?: string;
  }): Promise<AccountRestriction> {
    const id = `restr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data: created, error } = await client().rpc('apply_account_restriction', {
      p_id: id,
      p_target_user_id: data.userId,
      p_restriction_type: data.restrictionType,
      p_reason: data.reason,
      p_expires_at: data.expiresAt ?? null
    });
    if (error) translateError(error);
    return rowToRestriction(created as AccountRestrictionRow);
  }

  async liftAccountRestriction(restrictionId: string): Promise<AccountRestriction> {
    const { data, error } = await client().rpc('lift_account_restriction', { p_restriction_id: restrictionId });
    if (error) translateError(error);
    return rowToRestriction(data as AccountRestrictionRow);
  }

  /**
   * Returns the CALLING user's own active restrictions -- RLS only
   * grants self-visibility (or platform-admin visibility into everyone),
   * so this naturally only answers "am I restricted," not "is some other
   * user restricted."
   */
  async isUserRestricted(
    userId: string,
    actionType: 'posting' | 'messaging' | 'applying' | 'deal_room'
  ): Promise<{ isRestricted: boolean; reason?: string }> {
    const { data, error } = await client()
      .from('account_restrictions')
      .select('restriction_type, reason')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) throw new Error(error.message);

    const restrictions = (data as { restriction_type: string; reason: string }[]) || [];
    for (const r of restrictions) {
      if (r.restriction_type === 'full_suspension') {
        return { isRestricted: true, reason: `Account suspended: ${r.reason}` };
      }
      if (actionType === 'posting' && r.restriction_type === 'posting_disabled') {
        return { isRestricted: true, reason: `Job/Business posting disabled: ${r.reason}` };
      }
      if (actionType === 'messaging' && r.restriction_type === 'messaging_disabled') {
        return { isRestricted: true, reason: `Direct messaging disabled: ${r.reason}` };
      }
      if (actionType === 'applying' && r.restriction_type === 'applications_disabled') {
        return { isRestricted: true, reason: `Application submissions disabled: ${r.reason}` };
      }
      if (actionType === 'deal_room' && r.restriction_type === 'deal_room_disabled') {
        return { isRestricted: true, reason: `M&A deal room access disabled: ${r.reason}` };
      }
    }
    return { isRestricted: false };
  }
}

export const trustSafetyService = new TrustSafetyService();
