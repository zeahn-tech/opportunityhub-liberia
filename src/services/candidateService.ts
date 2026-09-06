import { CandidateProfile, County } from '../types';
import { db } from '../db/dbClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { ForbiddenError, UnauthorizedError } from '../core/errors/AppError';

export const candidateService = {
  async getMyProfile(): Promise<ApiResponse<CandidateProfile>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to view your candidate profile.');

      let profile = db.getCandidateProfile(user.id);
      if (!profile) {
        // Automatically create initial profile from user account data
        profile = db.saveCandidateProfile(
          {
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phoneNumber,
            county: user.primaryCounty,
            cityDistrict: 'Monrovia',
            headline: `${user.primaryRole?.replace('_', ' ').toUpperCase() || 'PROFESSIONAL'} in ${user.primaryCounty}`,
            bio: 'Verified Liberian professional open to job opportunities and institutional contracts.',
            yearsOfExperience: 3,
            highestEducationLevel: 'Bachelor Degree',
            education: [
              {
                id: `edu-${Date.now()}`,
                degree: 'Bachelor of Science (BSc)',
                fieldOfStudy: 'Management & Economics',
                institution: 'University of Liberia',
                county: 'Montserrado',
                startYear: 2018,
                endYear: 2022,
                current: false
              }
            ],
            experience: [],
            skills: [
              { id: `sk-1`, name: 'Operations & Logistics', category: 'Operations', level: 4, yearsOfExperience: 3 },
              { id: `sk-2`, name: 'Project Administration', category: 'Management', level: 4, yearsOfExperience: 3 }
            ],
            certifications: [],
            languages: [
              { id: 'lang-1', language: 'English', proficiency: 'fluent' },
              { id: 'lang-2', language: 'Liberian English / Koloqua', proficiency: 'native' }
            ],
            portfolio: [],
            privacySettings: {
              profileVisibility: 'public',
              contactVisibility: 'on_application_only',
              cvDownloadPermission: 'applied_jobs_only',
              showSalaryExpectations: true
            },
            isSearchable: true
          },
          user.id
        );
      }
      return profile;
    });
  },

  async getPublicProfile(userId: string): Promise<ApiResponse<CandidateProfile | null>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const viewerUserId = session.user?.id;
      const viewerOrgId = session.activeOrganization?.id;
      return db.getPublicCandidateProfile(userId, viewerUserId, viewerOrgId);
    });
  },

  async saveMyProfile(profileData: Partial<CandidateProfile>): Promise<ApiResponse<CandidateProfile>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to modify your profile.');

      return db.saveCandidateProfile(
        {
          ...profileData,
          userId: user.id
        },
        user.id
      );
    });
  },

  async updateMyProfile(profileData: Partial<CandidateProfile>): Promise<ApiResponse<CandidateProfile>> {
    return this.saveMyProfile(profileData);
  },

  async updatePrivacySettings(privacySettings: any): Promise<ApiResponse<CandidateProfile>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to modify privacy settings.');

      const existing = db.getCandidateProfile(user.id);
      const updatedPrivacy = {
        ...(existing?.privacySettings || {}),
        ...privacySettings
      };

      return db.saveCandidateProfile(
        {
          userId: user.id,
          privacySettings: updatedPrivacy
        },
        user.id
      );
    });
  },

  async searchCandidates(filter: {
    county?: County;
    skill?: string;
    education?: string;
    minYearsExp?: number;
    query?: string;
  }): Promise<ApiResponse<CandidateProfile[]>> {
    return apiClient.execute(() => {
      const session = authService.getSession();
      const viewerUserId = session.user?.id;
      const viewerOrgId = session.activeOrganization?.id;
      return db.searchCandidateProfiles(filter, viewerUserId, viewerOrgId);
    });
  }
};
