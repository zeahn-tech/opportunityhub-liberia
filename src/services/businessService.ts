/**
 * businessService.ts
 *
 * Phase 3, Service 5 of the dbClient -> Supabase migration
 * (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database Status", and
 * docs/PHASE3_SERVICE5_VERIFICATION.md for the live proof).
 *
 * This is the service the task's own instructions singled out for extra
 * care: confidential fields (financials, exact address, owner identity)
 * must not be selectable by an unauthorized client at the database/API
 * level. list()/getById() therefore do NOT query `business_listings`
 * directly -- they call `list_business_listings_public()` /
 * `get_business_listing_public()`, two SECURITY DEFINER RPCs that
 * compute the redacted-or-full view entirely in Postgres (see
 * supabase/migrations/20260910180000_business_service_backend.sql).
 * There is no client-side field filter anywhere in this file; if the RPC
 * returns a field, it was authorized server-side, full stop.
 *
 * Owner-scoped operations (createListing/updateListing/deleteListing,
 * and the seller side of NDA requests) go straight to the tables, since
 * RLS already correctly scopes those to the owner.
 *
 * BEHAVIOR CHANGE from the old dbClient.ts implementation, not a bug:
 * dbClient's requestNdaAccess()/grantBusinessAccess() granted full access
 * IMMEDIATELY on request, with no seller review step -- a demo
 * convenience that would be a real vulnerability against a live
 * database (any buyer instantly reading every confidential field they
 * ask for). This service implements the real workflow the schema
 * actually supports: request -> pending -> seller approves/rejects ->
 * buyer signs the NDA -> full access unlocks (see
 * supabase/migrations/20260910190000_business_access_nda_signing_fix.sql,
 * a live-discovered bug fix -- buyers had no RLS policy allowing them to
 * sign their own NDA at all until that migration). `requestNdaAccess()`
 * called with no buyerData (the "quick access" shape some callers use)
 * now means "sign my own existing approved request," not "instantly
 * grant access" -- it will correctly refuse if no approved request
 * exists yet. The UI (BusinessMarketplace.tsx / App.tsx's
 * handleAccessApproved) currently assumes the old instant-unlock
 * behavior and will need a follow-up update to show a "pending seller
 * approval" state instead -- flagged here and in the verification doc,
 * not silently patched over in this service.
 *
 * sendInquiry/getInquiries/toggleSave/getSavedIds now read/write
 * public.business_inquiries / public.business_saved_listings (see
 * supabase/migrations/20260912090000_deferred_features_backend.sql) --
 * previously deferred, no longer.
 */

import { BusinessAccessRequest, BusinessInquiry, BusinessListing } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { apiClient, ApiResponse } from './apiClient';
import { authService } from './authService';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../core/errors/AppError';

interface BusinessListingRow {
  id: string;
  owner_user_id: string;
  title: string;
  slug: string;
  listing_type: string;
  industry: string;
  county: string;
  city_district: string;
  exact_address: string | null;
  asking_price_usd: number | null;
  annual_revenue_usd: number | null;
  annual_cash_flow_usd: number | null;
  is_price_negotiable: boolean | null;
  headline: string;
  description: string;
  public_teaser: string | null;
  financial_ranges: BusinessListing['financialRanges'] | null;
  assets_included: string | null;
  reason_for_selling: string | null;
  years_established: number | null;
  employee_count: number | null;
  status: string;
  is_confidential: boolean;
  is_verified: boolean;
  moderation_status: string | null;
  moderation_note: string | null;
  seller_name: string | null;
  seller_contact_email: string | null;
  seller_contact_phone: string | null;
  views_count: number | null;
  created_at: string;
  updated_at: string;
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; businessService requires a live backend.');
  }
  return c;
}

function rowToListing(row: BusinessListingRow): BusinessListing {
  return {
    id: row.id,
    title: row.title,
    industry: row.industry,
    county: row.county as BusinessListing['county'],
    cityDistrict: row.city_district ?? undefined,
    locationSummary: row.city_district ? `${row.city_district}, ${row.county}` : row.county,
    isConfidential: row.is_confidential,
    publicTeaser: row.public_teaser || row.headline,
    confidentialDescription: row.description,
    askingPriceUSD: row.asking_price_usd ?? 0,
    annualRevenueUSD: row.annual_revenue_usd ?? undefined,
    annualProfitUSD: row.annual_cash_flow_usd ?? undefined,
    establishedYear: row.years_established ?? 0,
    employeeCount: row.employee_count ?? 0,
    assetsIncluded: row.assets_included ? row.assets_included.split('\n').filter(Boolean) : [],
    reasonForSale: row.reason_for_selling ?? '',
    isVerified: row.is_verified,
    status: row.status as BusinessListing['status'],
    ownerUserId: row.owner_user_id,
    financialRanges: row.financial_ranges ?? undefined,
    moderationStatus: (row.moderation_status as BusinessListing['moderationStatus']) ?? undefined,
    moderationNote: row.moderation_note ?? undefined,
    sellerContactEmail: row.seller_contact_email ?? undefined,
    sellerContactPhone: row.seller_contact_phone ?? undefined,
    sellerName: row.seller_name ?? undefined,
    viewsCount: row.views_count ?? 0
  };
}

function translateError(error: { code?: string; message: string }): never {
  if (error.code === '42501') {
    throw new ForbiddenError('You do not have permission to perform this action on this business listing.');
  }
  if (error.code === '23505') {
    throw new ValidationError('A business listing with that slug already exists.');
  }
  throw new Error(error.message);
}

export const businessService = {
  async list(filter?: { county?: string; industry?: string; listingType?: string }): Promise<ApiResponse<BusinessListing[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().rpc('list_business_listings_public', {
        p_county: filter?.county || null,
        p_industry: filter?.industry || null,
        p_listing_type: filter?.listingType || null
      });
      if (error) throw new Error(error.message);
      return ((data as BusinessListingRow[]) || []).map(rowToListing);
    });
  },

  async getById(id: string): Promise<ApiResponse<BusinessListing | null>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().rpc('get_business_listing_public', { p_listing_id: id });
      if (error) throw new Error(error.message);
      return data ? rowToListing(data as BusinessListingRow) : null;
    });
  },

  async createListing(
    listing: Omit<BusinessListing, 'id' | 'status'> & Partial<BusinessListing>
  ): Promise<ApiResponse<BusinessListing>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to list a business for sale.');
      if (!authService.can('business.list')) {
        throw new ForbiddenError('You do not have permission to list an enterprise for sale.');
      }
      if (!listing.title?.trim()) throw new ValidationError('A listing title is required.');

      const id = `biz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const slug = listing.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const insertRow = {
        id,
        owner_user_id: user.id,
        title: listing.title,
        slug,
        listing_type: 'business_sale',
        industry: listing.industry,
        county: listing.county,
        city_district: listing.cityDistrict || listing.locationSummary || '',
        exact_address: (listing as { exactAddress?: string }).exactAddress ?? null,
        asking_price_usd: listing.askingPriceUSD ?? null,
        annual_revenue_usd: listing.annualRevenueUSD ?? null,
        annual_cash_flow_usd: listing.annualProfitUSD ?? null,
        is_price_negotiable: false,
        headline: listing.publicTeaser || listing.title,
        public_teaser: listing.publicTeaser || listing.title,
        description: listing.confidentialDescription || listing.publicTeaser || '',
        financial_ranges: listing.financialRanges ?? null,
        assets_included: (listing.assetsIncluded || []).join('\n'),
        reason_for_selling: listing.reasonForSale ?? null,
        years_established: listing.establishedYear ?? null,
        employee_count: listing.employeeCount ?? null,
        status: 'published',
        is_confidential: listing.isConfidential ?? true,
        seller_name: listing.sellerName || user.fullName,
        seller_contact_email: listing.sellerContactEmail || user.email,
        seller_contact_phone: listing.sellerContactPhone || user.phoneNumber || null
      };

      const { data, error } = await client().from('business_listings').insert(insertRow).select('*').maybeSingle();
      if (error) translateError(error);
      return rowToListing(data as BusinessListingRow);
    });
  },

  async updateListing(id: string, updates: Partial<BusinessListing>): Promise<ApiResponse<BusinessListing>> {
    return apiClient.execute(async () => {
      const safe: Record<string, unknown> = {};
      if (updates.title !== undefined) safe.title = updates.title;
      if (updates.industry !== undefined) safe.industry = updates.industry;
      if (updates.county !== undefined) safe.county = updates.county;
      if (updates.cityDistrict !== undefined) safe.city_district = updates.cityDistrict;
      if ((updates as { exactAddress?: string }).exactAddress !== undefined) {
        safe.exact_address = (updates as { exactAddress?: string }).exactAddress;
      }
      if (updates.askingPriceUSD !== undefined) safe.asking_price_usd = updates.askingPriceUSD;
      if (updates.annualRevenueUSD !== undefined) safe.annual_revenue_usd = updates.annualRevenueUSD;
      if (updates.annualProfitUSD !== undefined) safe.annual_cash_flow_usd = updates.annualProfitUSD;
      if (updates.publicTeaser !== undefined) {
        safe.public_teaser = updates.publicTeaser;
        safe.headline = updates.publicTeaser;
      }
      if (updates.confidentialDescription !== undefined) safe.description = updates.confidentialDescription;
      if (updates.financialRanges !== undefined) safe.financial_ranges = updates.financialRanges;
      if (updates.assetsIncluded !== undefined) safe.assets_included = updates.assetsIncluded.join('\n');
      if (updates.reasonForSale !== undefined) safe.reason_for_selling = updates.reasonForSale;
      if (updates.establishedYear !== undefined) safe.years_established = updates.establishedYear;
      if (updates.employeeCount !== undefined) safe.employee_count = updates.employeeCount;
      if (updates.status !== undefined) safe.status = updates.status;
      if (updates.isConfidential !== undefined) safe.is_confidential = updates.isConfidential;
      if (updates.sellerName !== undefined) safe.seller_name = updates.sellerName;
      if (updates.sellerContactEmail !== undefined) safe.seller_contact_email = updates.sellerContactEmail;
      if (updates.sellerContactPhone !== undefined) safe.seller_contact_phone = updates.sellerContactPhone;

      const { data, error } = await client()
        .from('business_listings')
        .update(safe)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('BusinessListing', id);
      return rowToListing(data as BusinessListingRow);
    });
  },

  async deleteListing(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.execute(async () => {
      const { error, count } = await client().from('business_listings').delete({ count: 'exact' }).eq('id', id);
      if (error) translateError(error);
      return (count ?? 0) > 0;
    });
  },

  /**
   * With buyerData: creates a new pending request (the real, secure
   * first step of the NDA workflow). Without buyerData: signs the
   * caller's OWN existing request for this listing, IF the seller has
   * already approved it -- it does not and cannot grant access on its
   * own. See this file's header comment for why that's a deliberate
   * change from the old dbClient.ts demo behavior.
   */
  async requestNdaAccess(
    businessId: string,
    buyerData?: { buyerName: string; buyerEmail: string; buyerPhone?: string; buyerOrganization?: string; proofOfFundsNote?: string }
  ): Promise<ApiResponse<BusinessAccessRequest | boolean>> {
    return apiClient.execute(async () => {
      const session = authService.getSession();
      const user = session.user;
      if (!user) throw new UnauthorizedError('You must be signed in to request confidential business details.');
      if (!authService.can('business.request_nda')) {
        throw new ForbiddenError('You do not have permission to request NDA access.');
      }

      if (buyerData) {
        const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const { data, error } = await client()
          .from('business_access_requests')
          .insert({
            id,
            listing_id: businessId,
            buyer_user_id: user.id,
            buyer_full_name: buyerData.buyerName,
            buyer_email: buyerData.buyerEmail,
            buyer_phone: buyerData.buyerPhone ?? null,
            status: 'pending',
            nda_signed: false
          })
          .select('*')
          .maybeSingle();
        if (error) translateError(error);
        return rowToRequest(data as BusinessAccessRequestRow);
      }

      const { data: existing, error: fetchError } = await client()
        .from('business_access_requests')
        .select('*')
        .eq('listing_id', businessId)
        .eq('buyer_user_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchError) throw new Error(fetchError.message);
      if (!existing) {
        throw new ValidationError('No NDA request found for this listing. Submit a request first.');
      }
      const existingRow = existing as BusinessAccessRequestRow;
      if (existingRow.status !== 'approved') {
        throw new ForbiddenError('The listing owner has not yet approved your access request.');
      }

      const { error: signError } = await client()
        .from('business_access_requests')
        .update({ nda_signed: true, nda_signed_at: new Date().toISOString() })
        .eq('id', existingRow.id);
      if (signError) translateError(signError);
      return true;
    });
  },

  async respondToAccessRequest(
    requestId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<ApiResponse<BusinessAccessRequest>> {
    return apiClient.execute(async () => {
      const { data, error } = await client()
        .from('business_access_requests')
        .update({ status: decision, seller_response_notes: notes ?? null, responded_at: new Date().toISOString() })
        .eq('id', requestId)
        .select('*')
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('BusinessAccessRequest', requestId);
      return rowToRequest(data as BusinessAccessRequestRow);
    });
  },

  async getAccessRequestsForListing(businessId: string): Promise<ApiResponse<BusinessAccessRequest[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().from('business_access_requests').select('*').eq('listing_id', businessId);
      if (error) throw new Error(error.message);
      return ((data as BusinessAccessRequestRow[]) || []).map(rowToRequest);
    });
  },

  async moderateListing(
    businessId: string,
    decision: 'approve' | 'reject' | 'verify',
    reason?: string
  ): Promise<ApiResponse<BusinessListing>> {
    return apiClient.execute(async () => {
      if (!authService.can('business.moderate')) {
        throw new ForbiddenError('You do not have permission to moderate business listings.');
      }
      const updates: Record<string, unknown> = {};
      if (decision === 'approve') updates.moderation_status = 'published';
      if (decision === 'reject') {
        updates.moderation_status = 'rejected';
        updates.status = 'suspended';
      }
      if (decision === 'verify') updates.is_verified = true;
      if (reason) updates.moderation_note = reason;

      const { data, error } = await client()
        .from('business_listings')
        .update(updates)
        .eq('id', businessId)
        .select('*')
        .maybeSingle();
      if (error) translateError(error);
      if (!data) throw new NotFoundError('BusinessListing', businessId);
      return rowToListing(data as BusinessListingRow);
    });
  },

  // ---------------------------------------------------------------------
  // ---------------------------------------------------------------------
  // Saves / inquiries / view increments -- previously deferred (no
  // backing tables existed), now closed via
  // supabase/migrations/20260912090000_deferred_features_backend.sql.
  // ---------------------------------------------------------------------
  async toggleSave(businessId: string, userId: string): Promise<ApiResponse<boolean>> {
    return apiClient.execute(async () => {
      const { data: existing } = await client()
        .from('business_saved_listings')
        .select('listing_id')
        .eq('user_id', userId)
        .eq('listing_id', businessId)
        .maybeSingle();

      if (existing) {
        const { error } = await client()
          .from('business_saved_listings')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', businessId);
        if (error) translateError(error);
        return false;
      }

      const { error } = await client().from('business_saved_listings').insert({ user_id: userId, listing_id: businessId });
      if (error) translateError(error);
      return true;
    });
  },

  async getSavedIds(userId: string): Promise<ApiResponse<string[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().from('business_saved_listings').select('listing_id').eq('user_id', userId);
      if (error) throw new Error(error.message);
      return ((data as { listing_id: string }[]) || []).map((r) => r.listing_id);
    });
  },

  async incrementViews(id: string): Promise<ApiResponse<void>> {
    return apiClient.execute(async () => {
      const { data } = await client().from('business_listings').select('views_count').eq('id', id).maybeSingle();
      const current = (data as { views_count: number | null } | null)?.views_count ?? 0;
      // Best-effort: a non-owner viewer typically has no UPDATE grant on
      // business_listings under RLS, so this legitimately no-ops for most
      // viewers rather than erroring -- same "let Postgres decide, don't
      // pre-check" pattern as opportunityService's view-count increment.
      try {
        await client().from('business_listings').update({ views_count: current + 1 }).eq('id', id);
      } catch {
        // Non-critical.
      }
    });
  },

  async sendInquiry(
    businessId: string,
    inquiryData: { senderName: string; senderEmail: string; senderPhone?: string; message: string; inquiryType: 'general' | 'financials' | 'site_visit' | 'offer' }
  ): Promise<ApiResponse<BusinessInquiry>> {
    return apiClient.execute(async () => {
      const {
        data: { user }
      } = await client().auth.getUser();
      if (!user) throw new UnauthorizedError('Sign in required to send an inquiry.');
      if (!inquiryData.message?.trim()) throw new ValidationError('An inquiry message is required.');

      const id = `inq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { data, error } = await client()
        .from('business_inquiries')
        .insert({
          id,
          listing_id: businessId,
          sender_user_id: user.id,
          sender_name: inquiryData.senderName,
          sender_email: inquiryData.senderEmail,
          sender_phone: inquiryData.senderPhone ?? null,
          message: inquiryData.message,
          inquiry_type: inquiryData.inquiryType,
          status: 'unread'
        })
        .select('*')
        .maybeSingle();
      if (error) translateError(error);
      return rowToInquiry(data as BusinessInquiryRow);
    });
  },

  async getInquiries(businessId: string): Promise<ApiResponse<BusinessInquiry[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client().from('business_inquiries').select('*').eq('listing_id', businessId);
      if (error) throw new Error(error.message);
      return ((data as BusinessInquiryRow[]) || []).map(rowToInquiry);
    });
  }
};

interface BusinessInquiryRow {
  id: string;
  listing_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  message: string;
  inquiry_type: string;
  status: string;
  created_at: string;
}

function rowToInquiry(row: BusinessInquiryRow): BusinessInquiry {
  return {
    id: row.id,
    businessId: row.listing_id,
    senderUserId: row.sender_user_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    senderPhone: row.sender_phone ?? undefined,
    message: row.message,
    inquiryType: row.inquiry_type as BusinessInquiry['inquiryType'],
    status: row.status as BusinessInquiry['status'],
    createdAt: row.created_at
  };
}

interface BusinessAccessRequestRow {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  buyer_full_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  status: string;
  nda_signed: boolean;
  nda_signed_at: string | null;
  seller_response_notes: string | null;
  requested_at: string;
  responded_at: string | null;
}

function rowToRequest(row: BusinessAccessRequestRow): BusinessAccessRequest {
  return {
    id: row.id,
    businessId: row.listing_id,
    buyerUserId: row.buyer_user_id,
    buyerName: row.buyer_full_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone ?? undefined,
    ndaAccepted: row.nda_signed,
    ndaSignedAt: row.nda_signed_at ?? undefined,
    status: row.status as BusinessAccessRequest['status'],
    sellerResponseNotes: row.seller_response_notes ?? undefined,
    createdAt: row.requested_at
  };
}
