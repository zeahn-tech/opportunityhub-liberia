import { BusinessAccessRequest, BusinessInquiry, BusinessListing } from '../types';
import { db } from '../db/dbClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { ForbiddenError } from '../core/errors/AppError';

export const businessService = {
  async list(): Promise<ApiResponse<BusinessListing[]>> {
    return apiClient.execute(() => {
      return db.getBusinesses();
    });
  },

  async getById(id: string): Promise<ApiResponse<BusinessListing | null>> {
    return apiClient.execute(() => {
      return db.getBusinessById(id);
    });
  },

  async requestNdaAccess(
    businessId: string,
    buyerData?: { buyerName: string; buyerEmail: string; buyerPhone?: string; buyerOrganization?: string; proofOfFundsNote?: string }
  ): Promise<ApiResponse<BusinessAccessRequest | boolean>> {
    return apiClient.execute(() => {
      if (!authService.can('business.request_nda')) {
        throw new ForbiddenError('Please sign in to submit a non-disclosure agreement request.');
      }
      const session = authService.getSession();
      if (buyerData) {
        return db.requestNdaAccess(businessId, buyerData, session.user.id);
      } else {
        db.grantBusinessAccess(businessId, session.user.id);
        return true;
      }
    });
  },

  async createListing(listing: Omit<BusinessListing, 'id' | 'status'> & Partial<BusinessListing>): Promise<ApiResponse<BusinessListing>> {
    return apiClient.execute(() => {
      if (!authService.can('business.list')) {
        throw new ForbiddenError('You do not have permission to list an enterprise for sale.');
      }
      const session = authService.getSession();
      return db.createBusiness(listing, session.user.id);
    });
  },

  async updateListing(id: string, updates: Partial<BusinessListing>): Promise<ApiResponse<BusinessListing>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      return db.updateBusiness(id, updates, session.user.id);
    });
  },

  async deleteListing(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      return db.deleteBusiness(id, session.user.id);
    });
  },

  async toggleSave(businessId: string, userId: string): Promise<ApiResponse<boolean>> {
    return apiClient.execute(() => {
      return db.toggleSaveBusiness(businessId, userId);
    });
  },

  async incrementViews(id: string): Promise<ApiResponse<void>> {
    return apiClient.execute(() => {
      return db.incrementBusinessViews(id);
    });
  },

  async getSavedIds(userId: string): Promise<ApiResponse<string[]>> {
    return apiClient.execute(() => {
      return db.getSavedBusinessIds(userId);
    });
  },

  async sendInquiry(
    businessId: string,
    inquiryData: { senderName: string; senderEmail: string; senderPhone?: string; message: string; inquiryType: 'general' | 'financials' | 'site_visit' | 'offer' }
  ): Promise<ApiResponse<BusinessInquiry>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      return db.createBusinessInquiry(
        {
          businessId,
          senderUserId: session.user.id,
          ...inquiryData
        },
        session.user.id
      );
    });
  },

  async getInquiries(businessId: string): Promise<ApiResponse<BusinessInquiry[]>> {
    return apiClient.execute(() => {
      return db.getBusinessInquiries(businessId);
    });
  },

  async moderateListing(
    businessId: string,
    decision: 'approve' | 'reject' | 'verify',
    reason?: string
  ): Promise<ApiResponse<BusinessListing>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      return db.moderateBusinessListing(businessId, decision, reason, session.user.id);
    });
  }
};
