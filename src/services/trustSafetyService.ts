import { db } from '../db/dbClient';
import {
  AccountRestriction,
  AccountRestrictionType,
  AuditLog,
  ContentModerationRecord,
  ContentReport,
  ContentReportReason,
  Opportunity,
  SuspiciousActivityEvent,
  VerificationBadge,
  VerificationRequest,
  VerificationStatus
} from '../types';
import { rateLimiterService } from './rateLimiterService';
import { notificationService } from './notificationService';

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

export class TrustSafetyService {
  /**
   * Submit Evidence for Institutional / Professional Verification (Org, Recruiter, Business)
   */
  async submitVerificationRequest(data: {
    entityType: 'organization' | 'recruiter' | 'business';
    entityId: string;
    entityName: string;
    submitterUserId: string;
    badgeRequested: VerificationBadge;
    registrationNumber?: string;
    taxIdNumber?: string;
    licenseNumber?: string;
    county: any;
    evidenceDocuments: any[];
    evidenceNotes?: string;
  }): Promise<VerificationRequest> {
    // 1. Rate Limit Check
    const rateCheck = rateLimiterService.checkLimit(data.submitterUserId, 'submit_verification');
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.errorMsg || 'Verification rate limit exceeded');
    }

    const submitter = db.getUserById(data.submitterUserId);
    const request = db.createVerificationRequest({
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      submitterUserId: data.submitterUserId,
      submitterName: submitter?.fullName || 'Submitter',
      submitterEmail: submitter?.email || 'N/A',
      status: 'pending_review',
      badgeRequested: data.badgeRequested,
      registrationNumber: data.registrationNumber,
      taxIdNumber: data.taxIdNumber,
      licenseNumber: data.licenseNumber,
      county: data.county,
      evidenceDocuments: data.evidenceDocuments || [],
      evidenceNotes: data.evidenceNotes,
    });

    // 2. Record Audit Log
    db.emitAuditLog({
      actorUserId: data.submitterUserId,
      actorName: submitter?.fullName || 'Submitter',
      action: 'verification.request',
      targetEntity: data.entityType,
      targetId: request.id,
      details: {
        badgeRequested: data.badgeRequested,
        registrationNumber: data.registrationNumber,
        docCount: data.evidenceDocuments?.length || 0
      }
    });

    // 3. Notify Platform Verification Officers
    const admins = db.getUsers().filter((u) => u.systemRole === 'platform_admin' || u.systemRole === 'verifier');
    admins.forEach((admin) => {
      notificationService.createAndDispatchNotification({
        recipientUserId: admin.id,
        category: 'verification_event',
        title: 'New Statutory Verification Evidence Submitted',
        message: `${data.entityName} submitted proof documents for ${data.badgeRequested.replace('_', ' ')} verification.`,
        actionUrl: '/verification',
        contextId: request.id,
        channels: { email: true }
      });
    });

    return request;
  }

  /**
   * Administrator / Verification Officer Decision on Evidence
   */
  async reviewVerificationRequest(
    requestId: string,
    decision: 'verified' | 'rejected' | 'suspended',
    reviewerUserId: string,
    reviewerNotes?: string,
    rejectionReason?: string
  ): Promise<VerificationRequest> {
    const req = db.getVerificationRequestById(requestId);
    if (!req) throw new Error('Verification request not found');

    const reviewer = db.getUserById(reviewerUserId);
    const updated = db.updateVerificationRequest(requestId, {
      status: decision,
      reviewerUserId,
      reviewerName: reviewer?.fullName || 'Verification Officer',
      reviewerNotes,
      rejectionReason,
      reviewedAt: new Date().toISOString()
    });

    // Grant official badge if approved
    if (decision === 'verified') {
      if (req.entityType === 'organization') {
        const org = db.getOrganizationById(req.entityId);
        if (org) {
          db.updateOrganization(req.entityId, {
            verificationStatus: 'verified',
            verificationBadge: req.badgeRequested,
            isVerified: true,
            registrationNumber: req.registrationNumber || org.registrationNumber,
            taxIdNumber: req.taxIdNumber || org.taxIdNumber
          });
        }
      } else if (req.entityType === 'business') {
        const biz = db.getBusinessById(req.entityId);
        if (biz) {
          db.updateBusiness(req.entityId, {
            isVerified: true,
            moderationStatus: 'published'
          });
        }
      }
    }

    // Record Audit Trail
    db.emitAuditLog({
      actorUserId: reviewerUserId,
      actorName: reviewer?.fullName || 'Verification Officer',
      action: 'verification.decide',
      targetEntity: req.entityType,
      targetId: req.id,
      details: { decision, reviewerNotes, rejectionReason }
    });

    // Notify Submitter
    notificationService.createAndDispatchNotification({
      recipientUserId: req.submitterUserId,
      category: 'verification_event',
      title: `Verification Request ${decision === 'verified' ? 'Approved' : 'Updated'}`,
      message: decision === 'verified'
        ? `Congratulations! ${req.entityName} has been granted the official badge: ${req.badgeRequested.replace('_', ' ')}.`
        : `Your verification request for ${req.entityName} was ${decision}. Reason: ${rejectionReason || 'Documents incomplete'}.`,
      actionUrl: '/verification',
      contextId: req.id,
      channels: { email: true }
    });

    return updated;
  }

  /**
   * Automated Content Moderation Scanner
   */
  scanContentForScams(title: string, description: string, salaryUSD?: number): {
    flags: Array<{ ruleId: string; ruleName: string; description: string; severity: 'low' | 'medium' | 'high' }>;
    recommendedStatus: 'published' | 'pending_review' | 'flagged' | 'quarantined';
  } {
    const textToScan = `${title} ${description}`.toLowerCase();
    const flags: Array<{ ruleId: string; ruleName: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Scan keywords
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

    // Salary Benchmark anomaly check (e.g., > $25,000/mo for standard job)
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

    if (highSeverityCount >= 1) {
      recommendedStatus = 'quarantined';
    } else if (flags.length >= 1) {
      recommendedStatus = 'flagged';
    }

    return { flags, recommendedStatus };
  }

  /**
   * Submit User or Listing Report
   */
  async submitReport(data: {
    reportType: 'listing' | 'user' | 'message';
    targetId: string;
    targetTitleOrName: string;
    reporterUserId: string;
    reason: ContentReportReason;
    details: string;
    evidenceUrls?: string[];
  }): Promise<ContentReport> {
    // Check Rate Limit
    const rateCheck = rateLimiterService.checkLimit(data.reporterUserId, 'submit_report');
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.errorMsg || 'Report submission rate limit exceeded');
    }

    const reporter = db.getUserById(data.reporterUserId);
    const report = db.createContentReport({
      reportType: data.reportType,
      targetId: data.targetId,
      targetTitleOrName: data.targetTitleOrName,
      reporterUserId: data.reporterUserId,
      reporterName: reporter?.fullName || 'Reporter',
      reporterEmail: reporter?.email || 'N/A',
      reason: data.reason,
      details: data.details,
      evidenceUrls: data.evidenceUrls,
      status: 'pending'
    });

    // Check target report count and auto-quarantine if >= 2
    const allReportsForTarget = db.getContentReports().filter((r) => r.targetId === data.targetId);
    if (allReportsForTarget.length >= 2) {
      // Create suspicious event
      db.createSuspiciousActivityEvent({
        actorUserId: data.reporterUserId,
        eventType: 'multiple_reports',
        severity: 'high',
        description: `Target ${data.targetTitleOrName} (${data.targetId}) reached ${allReportsForTarget.length} user reports. Auto-quarantining for admin review.`,
        status: 'detected'
      });

      // Quarantine opportunity if listing
      if (data.reportType === 'listing') {
        const opp = db.getOpportunityById(data.targetId);
        if (opp) {
          db.updateOpportunity(data.targetId, {
            moderationStatus: 'quarantined',
            reportCount: allReportsForTarget.length
          });
        }
      }
    }

    // Audit Log
    db.emitAuditLog({
      actorUserId: data.reporterUserId,
      actorName: reporter?.fullName || 'Reporter',
      action: 'report.submit',
      targetEntity: data.reportType,
      targetId: data.targetId,
      details: { reason: data.reason }
    });

    return report;
  }

  /**
   * Action / Resolve a Content or User Report
   */
  async resolveReport(
    reportId: string,
    actionTaken: 'warning_issued' | 'listing_quarantined' | 'account_restricted' | 'account_suspended' | 'dismissed',
    adminUserId: string,
    adminNotes?: string
  ): Promise<ContentReport> {
    const report = db.getContentReportById(reportId);
    if (!report) throw new Error('Report not found');

    const admin = db.getUserById(adminUserId);
    const updated = db.updateContentReport(reportId, {
      status: actionTaken === 'dismissed' ? 'dismissed' : 'actioned',
      actionTaken,
      adminNotes,
      reviewedByUserId: adminUserId,
      reviewedByName: admin?.fullName || 'Platform Administrator'
    });

    // Audit Log
    db.emitAuditLog({
      actorUserId: adminUserId,
      actorName: admin?.fullName || 'Platform Administrator',
      action: 'report.resolve',
      targetEntity: report.reportType,
      targetId: report.id,
      details: { actionTaken, adminNotes }
    });

    return updated;
  }

  /**
   * Apply Account Restriction
   */
  async applyAccountRestriction(data: {
    userId: string;
    restrictionType: AccountRestrictionType;
    reason: string;
    issuedByUserId: string;
    expiresAt?: string;
  }): Promise<AccountRestriction> {
    const targetUser = db.getUserById(data.userId);
    if (!targetUser) throw new Error('User not found');

    const issuer = db.getUserById(data.issuedByUserId);

    const restriction = db.createAccountRestriction({
      userId: data.userId,
      userName: targetUser.fullName,
      userEmail: targetUser.email,
      restrictionType: data.restrictionType,
      reason: data.reason,
      issuedByUserId: data.issuedByUserId,
      issuedByName: issuer?.fullName || 'Platform Administrator',
      expiresAt: data.expiresAt,
      status: 'active'
    });

    // If full suspension, update user accountStatus
    if (data.restrictionType === 'full_suspension') {
      db.updateUserStatus(data.userId, 'suspended', data.reason);
    }

    // Audit log
    db.emitAuditLog({
      actorUserId: data.issuedByUserId,
      actorName: issuer?.fullName || 'Platform Administrator',
      action: 'user.restrict',
      targetEntity: 'user',
      targetId: data.userId,
      details: { restrictionType: data.restrictionType, reason: data.reason }
    });

    // Notify restricted user
    notificationService.createAndDispatchNotification({
      recipientUserId: data.userId,
      category: 'system_alert',
      title: 'Account Functionality Restricted',
      message: `Your account access has been restricted (${data.restrictionType.replace('_', ' ')}). Reason: ${data.reason}.`,
      actionUrl: '/support',
      channels: { email: true }
    });

    return restriction;
  }

  /**
   * Lift Account Restriction
   */
  async liftAccountRestriction(restrictionId: string, adminUserId: string): Promise<AccountRestriction> {
    const admin = db.getUserById(adminUserId);
    const updated = db.updateAccountRestriction(restrictionId, { status: 'lifted' });

    // If user was suspended, reactivate
    const targetUser = db.getUserById(updated.userId);
    if (targetUser && targetUser.accountStatus === 'suspended') {
      db.updateUserStatus(updated.userId, 'active', 'Restriction lifted by administrator');
    }

    db.emitAuditLog({
      actorUserId: adminUserId,
      actorName: admin?.fullName || 'Platform Administrator',
      action: 'user.lift_restriction',
      targetEntity: 'user',
      targetId: updated.userId,
      details: { restrictionId }
    });

    return updated;
  }

  /**
   * Check if a user is restricted from a specific action
   */
  isUserRestricted(userId: string, actionType: 'posting' | 'messaging' | 'applying' | 'deal_room'): {
    isRestricted: boolean;
    reason?: string;
  } {
    const activeRestrictions = db.getAccountRestrictionsByUserId(userId);
    if (activeRestrictions.length === 0) return { isRestricted: false };

    for (const r of activeRestrictions) {
      if (r.restrictionType === 'full_suspension') {
        return { isRestricted: true, reason: `Account suspended: ${r.reason}` };
      }
      if (actionType === 'posting' && r.restrictionType === 'posting_disabled') {
        return { isRestricted: true, reason: `Job/Business posting disabled: ${r.reason}` };
      }
      if (actionType === 'messaging' && r.restrictionType === 'messaging_disabled') {
        return { isRestricted: true, reason: `Direct messaging disabled: ${r.reason}` };
      }
      if (actionType === 'applying' && r.restrictionType === 'applications_disabled') {
        return { isRestricted: true, reason: `Application submissions disabled: ${r.reason}` };
      }
      if (actionType === 'deal_room' && r.restrictionType === 'deal_room_disabled') {
        return { isRestricted: true, reason: `M&A deal room access disabled: ${r.reason}` };
      }
    }

    return { isRestricted: false };
  }
}

export const trustSafetyService = new TrustSafetyService();
