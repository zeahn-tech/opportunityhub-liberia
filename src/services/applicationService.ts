import { Application, ApplicationStage, InterviewScheduleDetails } from '../types';
import { db } from '../db/dbClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { notificationService } from './notificationService';
import { ForbiddenError, UnauthorizedError } from '../core/errors/AppError';

export const applicationService = {
  async listByOpportunity(opportunityId: string): Promise<ApiResponse<Application[]>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const tenantId = session.activeOrganization?.id;
      return db.getApplicationsByOpportunity(opportunityId, tenantId);
    });
  },

  async listByOrganization(organizationId?: string): Promise<ApiResponse<Application[]>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const orgId = organizationId || session.activeOrganization?.id;
      if (!orgId) {
        return db.getApplications();
      }
      return db.getApplicationsByOrganization(orgId, session.user?.id || '');
    });
  },

  async listMyApplications(): Promise<ApiResponse<Application[]>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('Sign in required to view your job applications.');
      return db.getApplicationsByCandidate(user.id);
    });
  },

  async getById(applicationId: string): Promise<ApiResponse<Application | null>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const actorUserId = session.user?.id;
      const tenantId = session.activeOrganization?.id;
      return db.getApplicationById(applicationId, actorUserId, tenantId);
    });
  },

  async submit(data: Omit<Application, 'id' | 'appliedDate' | 'stage' | 'history'>): Promise<ApiResponse<Application>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const actorUserId = session.user?.id;
      const app = db.createApplication(data, actorUserId);

      // Notify Organization Admins/Recruiters about new application
      if (data.organizationId) {
        const org = db.getOrganizationById(data.organizationId);
        const members = db.getMembershipsByOrganization(data.organizationId);
        members.forEach((m) => {
          notificationService.createAndDispatchNotification({
            recipientUserId: m.userId,
            category: 'application_update',
            title: `New Candidate Application Received`,
            message: `${data.applicantName} applied for "${data.opportunityTitle}" at ${org?.name || 'your organization'}.`,
            actionUrl: '/recruiter',
            contextId: app.id,
            channels: { email: true, pushSms: true }
          });
        });
      }

      return app;
    });
  },

  async withdraw(applicationId: string, reason?: string): Promise<ApiResponse<Application>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const actorUserId = session.user?.id;
      if (!actorUserId) throw new UnauthorizedError('Sign in required to withdraw application.');
      return db.withdrawApplication(applicationId, reason, actorUserId);
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
          hiringOfferDetails?: {
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
          };
          matchNotes?: string;
        }
  ): Promise<ApiResponse<Application>> {
    return apiClient.execute(() => {
      if (!authService.can('application.advance_stage')) {
        throw new ForbiddenError('You do not have permission to modify candidate recruitment pipeline stages.');
      }
      const session = authService.getSession();
      const tenantId = session.activeOrganization?.id;
      const actorUserId = session.user?.id;

      const normalizedOptions =
        typeof options === 'string'
          ? { note: options, matchNotes: options }
          : options;

      const updatedApp = db.updateApplicationStage(applicationId, stage, normalizedOptions, tenantId, actorUserId);

      // Dispatch Notifications
      if (updatedApp) {
        const org = db.getOrganizationById(updatedApp.organizationId);
        
        // General stage update notification
        notificationService.notifyApplicationUpdate({
          recipientUserId: updatedApp.candidateUserId,
          opportunityTitle: updatedApp.opportunityTitle,
          newStage: stage,
          organizationName: org?.name || 'Employer',
          applicationId: updatedApp.id
        });

        // Interview invitation notification if scheduled
        if (stage === 'interview' && normalizedOptions?.interviewDetails) {
          const details = normalizedOptions.interviewDetails;
          const detailsString = `${details.scheduledDate || 'TBD'} at ${details.scheduledTime || 'TBD'} (${details.format || 'Virtual/On-site'}) - ${details.locationOrLink}`;
          notificationService.notifyInterviewInvitation({
            recipientUserId: updatedApp.candidateUserId,
            opportunityTitle: updatedApp.opportunityTitle,
            organizationName: org?.name || 'Employer',
            interviewDetails: detailsString,
            applicationId: updatedApp.id
          });
        }
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
    return apiClient.execute(() => {
      if (!authService.can('application.review')) {
        throw new ForbiddenError('You do not have permission to evaluate candidates.');
      }
      const session = authService.getSession();
      const tenantId = session.activeOrganization?.id;
      const actorUserId = session.user?.id;
      return db.updateApplicationEvaluation(applicationId, evaluation, tenantId, actorUserId);
    });
  }
};

