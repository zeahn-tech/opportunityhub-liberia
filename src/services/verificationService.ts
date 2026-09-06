import { VerificationAudit } from '../types';
import { db } from '../db/dbClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { ForbiddenError } from '../core/errors/AppError';

export const verificationService = {
  async list(): Promise<ApiResponse<VerificationAudit[]>> {
    return apiClient.execute(() => {
      return db.getVerificationAudits();
    });
  },

  async submit(audit: Omit<VerificationAudit, 'id' | 'submissionDate' | 'status'>): Promise<ApiResponse<VerificationAudit>> {
    return apiClient.execute(() => {
      if (!authService.can('verification.request')) {
        throw new ForbiddenError('Only registered enterprise and institution accounts can submit verification files.');
      }
      return db.createVerificationAudit(audit);
    });
  },

  async decide(auditId: string, status: 'approved' | 'rejected'): Promise<ApiResponse<VerificationAudit>> {
    return apiClient.execute(() => {
      if (!authService.can('verification.decide')) {
        throw new ForbiddenError('Only authorized Verification Officers can approve or reject institutional credentials.');
      }
      const session = authService.getSession();
      return db.updateAuditDecision(auditId, status, session.user.id);
    });
  }
};
