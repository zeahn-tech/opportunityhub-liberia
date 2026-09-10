/**
 * applicationService.ts
 *
 * Phase 3, Service 3 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status", and
 * docs/PHASE3_SERVICE3_VERIFICATION.md for the live RLS/trigger proof).
 *
 * Every method reads/writes `public.applications` directly via the
 * anon/user-session Supabase client, joined with `opportunities(title)`
 * and `organizations(name)` for the denormalized display fields the app
 * type expects. Postgres RLS is the authorization boundary for who can
 * see/create/update a row; `authService.can(...)` calls below are kept
 * ONLY as fast-fail UX, not a substitute for RLS.
 *
 * One real security fix made in this pass, not just a schema catch-up:
 * the pre-existing "Candidates can withdraw applications" RLS policy had
 * no column restriction, meaning a candidate's direct Supabase call could
 * rewrite their own application's `stage`, `evaluation_notes`, or any
 * other employer-owned field -- e.g. self-promoting to 'hired'. See
 * supabase/migrations/20260910100000_application_service_backend.sql's
 * `enforce_application_candidate_update_boundary()` trigger, which makes
 * "candidates can only withdraw" a real, unbypassable constraint rather
 * than something that merely happened to be true because the old local
 * store only exposed a withdraw() method.
 *
 * `history` (the audit trail of stage changes) is built application-side
 * -- the service reads the existing array, appends an entry, and writes
 * the whole array back, same as dbClient.ts used to. This is gated by the
 * same RLS/trigger boundary as everything else on the row (an org member
 * can rewrite history same as before; a candidate cannot touch it at all
 * per the trigger above) -- it is not re-validated by application code as
 * a security boundary, only assembled by it.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../core/errors/AppError';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { notificationService } from './notificationService';
import type { Application, ApplicationStage, ApplicationStatusLog, InterviewScheduleDetails } from '../types';

interface HiringOfferDetails {
  salaryUSD?: number;
  salaryLRD?: number;
  startDate?: string;
  notes?: string;
  offeredSalary?: number;
  currency?: string;
  contractType?: string;
  expiryDate?: string;
  offerLetterUrl?: string;
  terms?: string;
}

interface ApplicationRow {
  id: string;
  opportunity_id: string;
  applicant_user_id: string;
  organization_id: string;
  applicant_full_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  applicant_county: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  screening_answers: Record<string, string> | null;
  stage: string;
  evaluation_notes: string | null;
  internal_rating: number | null;
  status: string;
  applied_at: string;
  updated_at: string;
  match_score: number | null;
  match_notes: string | null;
  rejection_reason: string | null;
  withdrawal_reason: string | null;
  withdrawn_at: string | null;
  interview_details: InterviewScheduleDetails | null;
  hiring_offer_details: HiringOfferDetails | null;
  history: ApplicationStatusLog[] | null;
  resume_file_name: string | null;
  resume_data_url: string | null;
  resume_url: string | null;
  evaluation_strengths: string[] | null;
  evaluation_improvements: string[] | null;
  internal_notes: string | null;
  opportunities: { title: string } | null;
  organizations: { name: string } | null;
}

function rowToApplication(row: ApplicationRow): Application {
  const hasEvaluation =
    row.internal_rating !== null ||
    row.match_score !== null ||
    row.evaluation_notes !== null ||
    (row.evaluation_strengths && row.evaluation_strengths.length > 0) ||
    (row.evaluation_improvements && row.evaluation_improvements.length > 0) ||
    row.internal_notes !== null;

  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunities?.title || '',
    organizationId: row.organization_id,
    organizationName: row.organizations?.name || '',
    applicantUserId: row.applicant_user_id,
    candidateUserId: row.applicant_user_id,
    applicantName: row.applicant_full_name,
    applicantEmail: row.applicant_email,
    applicantPhone: row.applicant_phone ?? undefined,
    applicantLocation: row.applicant_county ?? undefined,
    stage: row.stage as ApplicationStage,
    appliedDate: row.applied_at ? row.applied_at.split('T')[0] : '',
    coverNote: row.cover_letter ?? undefined,
    resumeFileName: row.resume_file_name ?? undefined,
    resumeDataUrl: row.resume_data_url ?? undefined,
    resumeUrl: row.resume_url || row.cv_url || undefined,
    screeningAnswers: row.screening_answers ?? undefined,
    matchScore: row.match_score ?? undefined,
    matchNotes: row.match_notes ?? undefined,
    rating: row.internal_rating ?? undefined,
    employerNotes: row.evaluation_notes ?? undefined,
    evaluations: hasEvaluation
      ? {
          rating: row.internal_rating ?? undefined,
          matchScore: row.match_score ?? undefined,
          employerNotes: row.evaluation_notes ?? undefined,
          strengths: row.evaluation_strengths ?? undefined,
          improvements: row.evaluation_improvements ?? undefined,
          internalNotes: row.internal_notes ?? undefined
        }
      : undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    withdrawalReason: row.withdrawal_reason ?? undefined,
    withdrawnAt: row.withdrawn_at ?? undefined,
    interviewDetails: row.interview_details ?? undefined,
    hiringOfferDetails: row.hiring_offer_details ?? undefined,
    history: row.history ?? [],
    updatedAt: row.updated_at
  };
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; applicationService requires a live backend.');
  }
  return c;
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError(
      'You do not have permission to perform this action on this application.'
    );
  }
  if (error.code === '23503') {
    throw new ValidationError('The specified opportunity does not exist.');
  }
  throw new Error(error.message);
}

const SELECT_WITH_JOINS = '*, opportunities(title), organizations(name)';

async function fetchRow(applicationId: string): Promise<ApplicationRow | null> {
  const { data, error } = await client()
    .from('applications')
    .select(SELECT_WITH_JOINS)
    .eq('id', applicationId)
    .maybeSingle();
  if (error) translateError(error);
  return data as ApplicationRow | null;
}

function appendHistory(
  existing: ApplicationStatusLog[] | null | undefined,
  entry: Omit<ApplicationStatusLog, 'id'>
): ApplicationStatusLog[] {
  const history = existing ? [...existing] : [];
  history.push({
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...entry
  });
  return history;
}

export const applicationService = {
  async listByOpportunity(opportunityId: string): Promise<ApiResponse<Application[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client()
        .from('applications')
        .select(SELECT_WITH_JOINS)
        .eq('opportunity_id', opportunityId);
      if (error) translateError(error);
      return (data as ApplicationRow[]).map(rowToApplication);
    });
  },

  async listByOrganization(organizationId?: string): Promise<ApiResponse<Application[]>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const orgId = organizationId || session.activeOrganization?.id;
      let q = client().from('applications').select(SELECT_WITH_JOINS);
      if (orgId) q = q.eq('organization_id', orgId);
      const { data, error } = await q;
      if (error) translateError(error);
      return (data as ApplicationRow[]).map(rowToApplication);
    });
  },

  async listMyApplications(): Promise<ApiResponse<Application[]>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      if (!session.user) throw new UnauthorizedError('Sign in required to view your job applications.');
      const { data, error } = await client()
        .from('applications')
        .select(SELECT_WITH_JOINS)
        .eq('applicant_user_id', session.user.id);
      if (error) translateError(error);
      return (data as ApplicationRow[]).map(rowToApplication);
    });
  },

  async getById(applicationId: string): Promise<ApiResponse<Application | null>> {
    return apiClient.execute(async () => {
      const row = await fetchRow(applicationId);
      return row ? rowToApplication(row) : null;
    });
  },

  async submit(
    data: Omit<Application, 'id' | 'appliedDate' | 'stage' | 'history'>
  ): Promise<ApiResponse<Application>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const actorUserId = session.user?.id;
      if (!actorUserId) throw new UnauthorizedError('Sign in required to submit an application.');

      if (!data.applicantName?.trim()) throw new ValidationError('Applicant name is required.');
      if (!data.applicantEmail?.includes('@')) throw new ValidationError('Valid applicant email is required.');
      if (!data.opportunityId) throw new ValidationError('An opportunity must be specified.');

      const { data: oppRow, error: oppError } = await client()
        .from('opportunities')
        .select('id, organization_id')
        .eq('id', data.opportunityId)
        .maybeSingle();
      if (oppError) translateError(oppError);
      if (!oppRow) throw new NotFoundError('Opportunity', data.opportunityId);

      const now = new Date().toISOString();
      const id = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const organizationId = data.organizationId || (oppRow as { organization_id: string }).organization_id;

      const initialHistory: ApplicationStatusLog[] = [
        {
          id: `hist-${Date.now()}-1`,
          stage: 'applied',
          changedAt: now,
          changedByUserId: actorUserId,
          changedByName: data.applicantName,
          note: 'Application submitted via OpportunityHub Liberia portal.'
        }
      ];

      const insertRow = {
        id,
        opportunity_id: data.opportunityId,
        applicant_user_id: actorUserId,
        organization_id: organizationId,
        applicant_full_name: data.applicantName,
        applicant_email: data.applicantEmail,
        applicant_phone: data.applicantPhone ?? null,
        applicant_county: data.applicantLocation ?? null,
        cover_letter: data.coverNote ?? null,
        cv_url: data.resumeUrl ?? null,
        resume_file_name: data.resumeFileName ?? null,
        resume_data_url: data.resumeDataUrl ?? null,
        resume_url: data.resumeUrl ?? null,
        screening_answers: data.screeningAnswers ?? [],
        stage: 'applied',
        status: 'active',
        history: initialHistory
      };

      const { data: created, error } = await client()
        .from('applications')
        .insert(insertRow)
        .select(SELECT_WITH_JOINS)
        .maybeSingle();
      if (error) translateError(error);
      const app = rowToApplication(created as ApplicationRow);

      // Notify Organization Admins/Recruiters about new application. Best
      // effort -- notificationService still reads org membership via
      // dbClient.ts (a later phase step), so this may not reflect a
      // Supabase-created org's real membership yet; failures here must
      // never block the application itself from being recorded.
      try {
        if (organizationId) {
          const { db } = await import('../db/dbClient');
          const org = db.getOrganizationById(organizationId);
          const members = db.getMembershipsByOrganization(organizationId);
          members.forEach((m) => {
            notificationService.createAndDispatchNotification({
              recipientUserId: m.userId,
              category: 'application_update',
              title: `New Candidate Application Received`,
              message: `${data.applicantName} applied for "${app.opportunityTitle}" at ${org?.name || 'your organization'}.`,
              actionUrl: '/recruiter',
              contextId: app.id,
              channels: { email: true, pushSms: true }
            });
          });
        }
      } catch {
        // Non-critical.
      }

      return app;
    });
  },

  async withdraw(applicationId: string, reason?: string): Promise<ApiResponse<Application>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const actorUserId = session.user?.id;
      if (!actorUserId) throw new UnauthorizedError('Sign in required to withdraw application.');

      const existing = await fetchRow(applicationId);
      if (!existing) throw new NotFoundError('Application', applicationId);
      if (existing.stage === 'withdrawn') {
        return rowToApplication(existing);
      }

      const now = new Date().toISOString();
      const history = appendHistory(existing.history, {
        stage: 'withdrawn',
        changedAt: now,
        changedByUserId: actorUserId,
        changedByName: existing.applicant_full_name,
        note: reason || 'Application withdrawn by applicant.'
      });

      const { data, error } = await client()
        .from('applications')
        .update({
          stage: 'withdrawn',
          status: 'withdrawn',
          withdrawal_reason: reason || 'Candidate withdrew application.',
          withdrawn_at: now,
          history
        })
        .eq('id', applicationId)
        .select(SELECT_WITH_JOINS)
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('Application', applicationId);
      return rowToApplication(data as ApplicationRow);
    });
  },

  async updateStage(
    applicationId: string,
    stage: ApplicationStage,
    options?:
      | string
      | {
          note?: string;
          interviewDetails?: InterviewScheduleDetails;
          rejectionReason?: string;
          hiringOfferDetails?: HiringOfferDetails;
          matchNotes?: string;
        }
  ): Promise<ApiResponse<Application>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const actorUserId = session.user?.id;
      if (!actorUserId) throw new UnauthorizedError('Sign in required.');

      const existing = await fetchRow(applicationId);
      if (!existing) throw new NotFoundError('Application', applicationId);

      if (!authService.can('application.advance_stage', existing.organization_id)) {
        throw new ForbiddenError('You do not have permission to modify candidate recruitment pipeline stages.');
      }

      const normalizedOptions = typeof options === 'string' ? { note: options, matchNotes: options } : options;

      const now = new Date().toISOString();
      const actorName = session.user?.fullName || 'Hiring Manager';

      const history = appendHistory(existing.history, {
        stage,
        changedAt: now,
        changedByUserId: actorUserId,
        changedByName: actorName,
        note: normalizedOptions?.note || `Stage advanced to ${stage.replace('_', ' ')}`,
        interviewDetails: normalizedOptions?.interviewDetails,
        rejectionReason: normalizedOptions?.rejectionReason,
        hiringOfferDetails: normalizedOptions?.hiringOfferDetails
      });

      const updates: Record<string, unknown> = { stage, history };
      if (normalizedOptions?.matchNotes) updates.match_notes = normalizedOptions.matchNotes;
      if (normalizedOptions?.interviewDetails) updates.interview_details = normalizedOptions.interviewDetails;
      if (normalizedOptions?.rejectionReason) updates.rejection_reason = normalizedOptions.rejectionReason;
      if (normalizedOptions?.hiringOfferDetails) updates.hiring_offer_details = normalizedOptions.hiringOfferDetails;

      const { data, error } = await client()
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .select(SELECT_WITH_JOINS)
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('Application', applicationId);
      const updatedApp = rowToApplication(data as ApplicationRow);

      // Notifications -- best effort, see submit()'s note on why this is
      // wrapped rather than allowed to fail the whole stage update.
      try {
        const { db } = await import('../db/dbClient');
        const org = db.getOrganizationById(updatedApp.organizationId || '');

        notificationService.notifyApplicationUpdate({
          recipientUserId: updatedApp.candidateUserId!,
          opportunityTitle: updatedApp.opportunityTitle,
          newStage: stage,
          organizationName: org?.name || updatedApp.organizationName || 'Employer',
          applicationId: updatedApp.id
        });

        if (stage === 'interview' && normalizedOptions?.interviewDetails) {
          const details = normalizedOptions.interviewDetails;
          const detailsString = `${details.scheduledDate || 'TBD'} at ${details.scheduledTime || 'TBD'} (${details.format || 'Virtual/On-site'}) - ${details.locationOrLink}`;
          notificationService.notifyInterviewInvitation({
            recipientUserId: updatedApp.candidateUserId!,
            opportunityTitle: updatedApp.opportunityTitle,
            organizationName: org?.name || updatedApp.organizationName || 'Employer',
            interviewDetails: detailsString,
            applicationId: updatedApp.id
          });
        }
      } catch {
        // Non-critical.
      }

      return updatedApp;
    });
  },

  async updateEvaluation(
    applicationId: string,
    evaluation: {
      rating?: number;
      matchScore?: number;
      employerNotes?: string;
      strengths?: string[];
      improvements?: string[];
      internalNotes?: string;
    }
  ): Promise<ApiResponse<Application>> {
    return apiClient.execute(async () => {
      const existing = await fetchRow(applicationId);
      if (!existing) throw new NotFoundError('Application', applicationId);

      if (!authService.can('application.review', existing.organization_id)) {
        throw new ForbiddenError('You do not have permission to evaluate candidates.');
      }

      const updates: Record<string, unknown> = {};
      if (evaluation.rating !== undefined) updates.internal_rating = evaluation.rating;
      if (evaluation.matchScore !== undefined) updates.match_score = evaluation.matchScore;
      if (evaluation.employerNotes !== undefined) updates.evaluation_notes = evaluation.employerNotes;
      if (evaluation.strengths !== undefined) updates.evaluation_strengths = evaluation.strengths;
      if (evaluation.improvements !== undefined) updates.evaluation_improvements = evaluation.improvements;
      if (evaluation.internalNotes !== undefined) updates.internal_notes = evaluation.internalNotes;

      const { data, error } = await client()
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .select(SELECT_WITH_JOINS)
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('Application', applicationId);
      return rowToApplication(data as ApplicationRow);
    });
  }
};
