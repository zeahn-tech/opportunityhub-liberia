/**
 * candidateService.ts
 *
 * Phase 3, Service 4 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status", and
 * docs/PHASE3_SERVICE4_VERIFICATION.md for the live proof).
 *
 * `getMyProfile`/`saveMyProfile`/`updateMyProfile`/`updatePrivacySettings`
 * read/write `public.candidate_profiles` directly via the anon/session
 * client -- RLS restricts that table to the owner only, so these methods
 * work exactly like any other owner-scoped table.
 *
 * `getPublicProfile` and `searchCandidates` are different: they call the
 * `get_public_candidate_profile()` / `search_candidate_profiles()`
 * SECURITY DEFINER RPCs (see
 * supabase/migrations/20260910150000_candidate_service_backend.sql)
 * instead of querying the table directly. This isn't a style choice --
 * candidate visibility is conditional COLUMN-level redaction (an
 * 'anonymous' profile hides identity but not headline/skills; contact
 * info is gated on whether the viewer's org is one the candidate applied
 * to), which plain RLS can't express (RLS gates rows, not columns within
 * an allowed row). The redaction logic lives entirely in Postgres, not
 * here -- this service does not re-implement or double-check any part of
 * it client-side.
 */

import { CandidateProfile, County } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../core/errors/AppError';

interface CandidateProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  county: string | null;
  city: string | null;
  city_district: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  years_of_experience: number | null;
  highest_education_level: string | null;
  cv_file_url: string | null;
  cv_raw_text: string | null;
  cv_data_json: Record<string, unknown> | null;
  skills_json: unknown[] | null;
  work_history_json: unknown[] | null;
  education_history_json: unknown[] | null;
  certifications_json: unknown[] | null;
  languages_json: unknown[] | null;
  portfolio_links_json: unknown[] | null;
  is_profile_searchable: boolean | null;
  privacy_settings: CandidateProfile['privacySettings'] | null;
  updated_at: string;
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; candidateService requires a live backend.');
  }
  return c;
}

function rowToProfile(row: CandidateProfileRow): CandidateProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    county: (row.county as County) ?? ('Montserrado' as County),
    city: row.city ?? undefined,
    cityDistrict: row.city_district ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    headline: row.headline ?? undefined,
    bio: row.bio ?? undefined,
    yearsOfExperience: row.years_of_experience ?? 0,
    highestEducationLevel: row.highest_education_level ?? undefined,
    education: (row.education_history_json as CandidateProfile['education']) || [],
    experience: (row.work_history_json as CandidateProfile['experience']) || [],
    skills: (row.skills_json as CandidateProfile['skills']) || [],
    certifications: (row.certifications_json as CandidateProfile['certifications']) || [],
    languages: (row.languages_json as CandidateProfile['languages']) || [],
    cv: (row.cv_data_json as unknown as CandidateProfile['cv']) || (row.cv_file_url ? { fileName: row.cv_file_url, uploadedAt: row.updated_at } : undefined),
    cvFileName: (row.cv_data_json as { fileName?: string } | null)?.fileName,
    portfolio: (row.portfolio_links_json as CandidateProfile['portfolio']) || [],
    privacySettings:
      row.privacy_settings || {
        profileVisibility: 'private',
        contactVisibility: 'hidden',
        cvDownloadPermission: 'permission_required'
      },
    isSearchable: row.is_profile_searchable ?? true,
    updatedAt: row.updated_at
  };
}

function profileToRow(profile: Partial<CandidateProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (profile.fullName !== undefined) row.full_name = profile.fullName;
  if (profile.email !== undefined) row.email = profile.email;
  if (profile.phone !== undefined) row.phone = profile.phone;
  if (profile.county !== undefined) row.county = profile.county;
  if (profile.city !== undefined) row.city = profile.city;
  if (profile.cityDistrict !== undefined) row.city_district = profile.cityDistrict;
  if (profile.avatarUrl !== undefined) row.avatar_url = profile.avatarUrl;
  if (profile.headline !== undefined) row.headline = profile.headline;
  if (profile.bio !== undefined) row.bio = profile.bio;
  if (profile.yearsOfExperience !== undefined) row.years_of_experience = profile.yearsOfExperience;
  if (profile.highestEducationLevel !== undefined) row.highest_education_level = profile.highestEducationLevel;
  if (profile.education !== undefined) row.education_history_json = profile.education;
  if (profile.experience !== undefined) row.work_history_json = profile.experience;
  if (profile.skills !== undefined) row.skills_json = profile.skills;
  if (profile.certifications !== undefined) row.certifications_json = profile.certifications;
  if (profile.languages !== undefined) row.languages_json = profile.languages;
  if (profile.cv !== undefined) row.cv_data_json = profile.cv;
  if (profile.portfolio !== undefined) row.portfolio_links_json = profile.portfolio;
  if (profile.privacySettings !== undefined) row.privacy_settings = profile.privacySettings;
  if (profile.isSearchable !== undefined) row.is_profile_searchable = profile.isSearchable;
  return row;
}

const DEFAULT_PRIVACY: CandidateProfile['privacySettings'] = {
  profileVisibility: 'public',
  contactVisibility: 'on_application_only',
  cvDownloadPermission: 'applied_jobs_only',
  showSalaryExpectations: true
};

export const candidateService = {
  async getMyProfile(): Promise<ApiResponse<CandidateProfile>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to view your candidate profile.');

      const { data, error } = await client()
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);

      if (data) {
        return rowToProfile(data as CandidateProfileRow);
      }

      // Auto-create an initial profile from the user's account data, same
      // as dbClient.ts used to -- but with a genuinely blank work/skills
      // history rather than fabricated placeholder content, since a real
      // Supabase-backed profile shouldn't start pre-populated with
      // invented experience.
      const insertRow = profileToRow({
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        county: user.primaryCounty,
        headline: `${(user.primaryRole || 'professional').replace('_', ' ').toUpperCase()} in ${user.primaryCounty}`,
        bio: '',
        yearsOfExperience: 0,
        education: [],
        experience: [],
        skills: [],
        certifications: [],
        languages: [],
        portfolio: [],
        privacySettings: DEFAULT_PRIVACY,
        isSearchable: true
      });
      insertRow.user_id = user.id;

      const { data: created, error: insertError } = await client()
        .from('candidate_profiles')
        .insert(insertRow)
        .select('*')
        .maybeSingle();
      if (insertError) throw new Error(insertError.message);
      return rowToProfile(created as CandidateProfileRow);
    });
  },

  /**
   * Redacted view of someone else's profile via the
   * get_public_candidate_profile() RPC -- see this file's header comment.
   * Returns null both when the profile doesn't exist and when it exists
   * but the caller isn't allowed to see it (matches the old dbClient.ts
   * behavior, which didn't distinguish the two either).
   */
  async getPublicProfile(userId: string): Promise<ApiResponse<CandidateProfile | null>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().rpc('get_public_candidate_profile', { p_target_user_id: userId });
      if (error) throw new Error(error.message);
      return data ? rowToProfile(data as CandidateProfileRow) : null;
    });
  },

  async saveMyProfile(profileData: Partial<CandidateProfile>): Promise<ApiResponse<CandidateProfile>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to modify your profile.');

      const row = profileToRow(profileData);

      // Upsert: try update first (the common case -- profile already
      // exists because getMyProfile() auto-creates it), fall back to
      // insert only if no row was updated.
      const { data: updated, error: updateError } = await client()
        .from('candidate_profiles')
        .update(row)
        .eq('user_id', user.id)
        .select('*')
        .maybeSingle();
      if (updateError) throw new Error(updateError.message);
      if (updated) return rowToProfile(updated as CandidateProfileRow);

      row.user_id = user.id;
      if (!row.full_name) row.full_name = user.fullName;
      if (!row.email) row.email = user.email;
      if (!row.county) row.county = user.primaryCounty;
      if (!row.privacy_settings) row.privacy_settings = DEFAULT_PRIVACY;

      const { data: created, error: insertError } = await client()
        .from('candidate_profiles')
        .insert(row)
        .select('*')
        .maybeSingle();
      if (insertError) throw new Error(insertError.message);
      return rowToProfile(created as CandidateProfileRow);
    });
  },

  async updateMyProfile(profileData: Partial<CandidateProfile>): Promise<ApiResponse<CandidateProfile>> {
    return this.saveMyProfile(profileData);
  },

  async updatePrivacySettings(
    privacySettings: Partial<CandidateProfile['privacySettings']>
  ): Promise<ApiResponse<CandidateProfile>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to modify privacy settings.');

      const { data: existing, error: fetchError } = await client()
        .from('candidate_profiles')
        .select('privacy_settings')
        .eq('user_id', user.id)
        .maybeSingle();
      if (fetchError) throw new Error(fetchError.message);

      const merged = {
        ...DEFAULT_PRIVACY,
        ...((existing as { privacy_settings?: CandidateProfile['privacySettings'] } | null)?.privacy_settings || {}),
        ...privacySettings
      };

      const res = await this.saveMyProfile({ privacySettings: merged });
      if (res.error) throw new Error(res.error.message);
      return res.data as CandidateProfile;
    });
  },

  async searchCandidates(filter: {
    county?: County;
    skill?: string;
    education?: string;
    minYearsExp?: number;
    query?: string;
  }): Promise<ApiResponse<CandidateProfile[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().rpc('search_candidate_profiles', {
        p_county: filter.county || null,
        p_skill: filter.skill || null,
        p_education: filter.education || null,
        p_min_years_exp: typeof filter.minYearsExp === 'number' ? filter.minYearsExp : null,
        p_query: filter.query || null
      });
      if (error) throw new Error(error.message);
      return ((data as CandidateProfileRow[]) || []).map(rowToProfile);
    });
  }
};
