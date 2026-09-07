import React, { useState, useEffect } from 'react';
import { BusinessListing, County } from '../types';
import { LIBERIAN_COUNTIES } from '../data/seedData';
import { businessService } from '../services/businessService';
import {
  Building,
  ShieldCheck,
  Lock,
  Unlock,
  Bookmark,
  Search,
  Filter,
  Plus,
  Send,
  Eye,
  CheckCircle,
  FileCheck,
  Check,
  AlertCircle,
  TrendingUp,
  DollarSign,
  MapPin,
  Tag,
  Shield,
  Layers,
  BarChart3
} from 'lucide-react';
import { CreateBusinessModal } from './business/CreateBusinessModal';
import { ContactSellerModal } from './business/ContactSellerModal';
import { BusinessDetailModal } from './business/BusinessDetailModal';
import { BusinessModerationPanel } from './business/BusinessModerationPanel';
import { BusinessAnalyticsDashboard } from './analytics/BusinessAnalyticsDashboard';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';

interface BusinessMarketplaceProps {
  businesses: BusinessListing[];
  currency: 'USD' | 'LRD';
  onAccessApproved: (bizId: string) => void;
  currentUserId?: string;
  onRefresh?: () => void;
}

const INDUSTRIES = [
  'All Industries',
  'Agriculture & Forestry',
  'Food Processing & Cold Chain Logistics',
  'Hospitality & Tourism',
  'Healthcare & Pharmaceuticals',
  'Retail & Supermarket Chains',
  'Transport, Logistics & Fleet Services',
  'Mining, Energy & Gold Processing',
  'Construction & Building Materials',
  'Financial Services & Fintech',
  'Technology & Telecom',
  'Education & Training Institutions',
  'Manufacturing & Industrial',
  'Commercial Services & Real Estate'
];

export const BusinessMarketplace: React.FC<BusinessMarketplaceProps> = ({
  businesses: initialBusinesses,
  currency,
  onAccessApproved,
  currentUserId: propCurrentUserId,
  onRefresh
}) => {
  const { user, can } = useAuth();
  const currentUserId = propCurrentUserId || user?.id || '';
  const canModerate = can('business.moderate') || user?.systemRole === 'moderation_officer' || user?.systemRole === 'moderator' || user?.systemRole === 'platform_admin' || user?.primaryRole === 'platform_admin';
  const { isLowBandwidthMode } = useConfig();
  const [businesses, setBusinesses] = useState<BusinessListing[]>(initialBusinesses);
  const [activeTab, setActiveTab] = useState<'browse' | 'saved' | 'my_listings' | 'moderation' | 'analytics'>('browse');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<County | 'all'>('all');
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
  const [priceRange, setPriceRange] = useState<'all' | 'under50k' | '50k250k' | '250k1m' | 'over1m'>('all');
  const [confidentialFilter, setConfidentialFilter] = useState<'all' | 'confidential' | 'public'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Saved Deals
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailModalListing, setDetailModalListing] = useState<BusinessListing | null>(null);
  const [contactModalListing, setContactModalListing] = useState<BusinessListing | null>(null);

  // NDA Request Modal
  const [ndaModalListing, setNdaModalListing] = useState<BusinessListing | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerOrganization, setBuyerOrganization] = useState('');
  const [proofOfFunds, setProofOfFunds] = useState('');
  const [ndaChecked, setNdaChecked] = useState(false);
  const [isRequestingNda, setIsRequestingNda] = useState(false);

  useEffect(() => {
    setBusinesses(initialBusinesses);
  }, [initialBusinesses]);

  useEffect(() => {
    loadSavedIds();
  }, [currentUserId]);

  const loadSavedIds = async () => {
    if (!currentUserId) {
      setSavedIds([]);
      return;
    }
    try {
      const res = await businessService.getSavedIds(currentUserId);
      if (res.data) setSavedIds(res.data);
    } catch (err) {
      console.error('Failed to load saved listings', err);
    }
  };

  const reloadListings = async () => {
    try {
      const res = await businessService.list();
      if (res.data) setBusinesses(res.data);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to reload businesses', err);
    }
  };

  const LRD_RATE = 195;
  const formatPrice = (usd: number) => {
    if (currency === 'USD') {
      return `$${usd.toLocaleString()}`;
    }
    return `LRD ${(usd * LRD_RATE).toLocaleString()}`;
  };

  // Filter logic
  const filteredBusinesses = businesses.filter((b) => {
    // Tab Filter
    if (activeTab === 'saved') {
      if (!savedIds.includes(b.id)) return false;
    } else if (activeTab === 'my_listings') {
      if (b.ownerUserId !== currentUserId) return false;
    }

    // Location
    if (selectedCounty !== 'all' && b.county !== selectedCounty) return false;

    // Industry
    if (selectedIndustry !== 'All Industries' && b.industry !== selectedIndustry) return false;

    // Confidentiality
    if (confidentialFilter === 'confidential' && !b.isConfidential) return false;
    if (confidentialFilter === 'public' && b.isConfidential) return false;

    // Verified
    if (verifiedOnly && !b.isVerified) return false;

    // Price Range
    if (priceRange === 'under50k' && b.askingPriceUSD >= 50000) return false;
    if (priceRange === '50k250k' && (b.askingPriceUSD < 50000 || b.askingPriceUSD >= 250000)) return false;
    if (priceRange === '250k1m' && (b.askingPriceUSD < 250000 || b.askingPriceUSD >= 1000000)) return false;
    if (priceRange === 'over1m' && b.askingPriceUSD < 1000000) return false;

    // Keyword Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchTeaser = b.publicTeaser.toLowerCase().includes(q);
      const matchInd = b.industry.toLowerCase().includes(q);
      const matchCounty = b.county.toLowerCase().includes(q);
      const matchAssets = b.assetsIncluded.some((a) => a.toLowerCase().includes(q));
      if (!matchTitle && !matchTeaser && !matchInd && !matchCounty && !matchAssets) return false;
    }

    return true;
  });

  const handleToggleSave = async (bizId: string) => {
    try {
      const res = await businessService.toggleSave(bizId, currentUserId);
      if (res.data !== undefined) {
        if (res.data) {
          setSavedIds((prev) => [...prev, bizId]);
        } else {
          setSavedIds((prev) => prev.filter((id) => id !== bizId));
        }
      }
    } catch (err) {
      console.error('Failed to toggle save business', err);
    }
  };

  const handleCreateSubmit = async (listingData: Omit<BusinessListing, 'id' | 'status'> & Partial<BusinessListing>) => {
    try {
      await businessService.createListing(listingData);
      await reloadListings();
    } catch (err) {
      console.error('Failed to create business listing', err);
    }
  };

  const handleNdaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndaModalListing || !ndaChecked) return;

    setIsRequestingNda(true);
    try {
      await businessService.requestNdaAccess(ndaModalListing.id, {
        buyerName,
        buyerEmail,
        buyerOrganization,
        proofOfFundsNote: proofOfFunds
      });

      onAccessApproved(ndaModalListing.id);
      await reloadListings();

      setIsRequestingNda(false);
      setNdaModalListing(null);
      setNdaChecked(false);
    } catch (err) {
      console.error('NDA request error', err);
      setIsRequestingNda(false);
    }
  };

  const handleSendInquiry = async (inquiryData: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    message: string;
    inquiryType: 'general' | 'financials' | 'site_visit' | 'offer';
  }) => {
    if (!contactModalListing) return;
    try {
      await businessService.sendInquiry(contactModalListing.id, inquiryData);
      await reloadListings();
    } catch (err) {
      console.error('Send inquiry error', err);
    }
  };

  const handleModerateListing = async (businessId: string, decision: 'approve' | 'reject' | 'verify', reason?: string) => {
    try {
      await businessService.moderateListing(businessId, decision, reason);
      await reloadListings();
    } catch (err) {
      console.error('Moderation error', err);
    }
  };

  const handleDeleteListing = async (bizId: string) => {
    try {
      await businessService.deleteListing(bizId);
      await reloadListings();
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleViewListing = async (biz: BusinessListing) => {
    try {
      await businessService.incrementViews(biz.id);
      setDetailModalListing({
        ...biz,
        viewsCount: (biz.viewsCount || 0) + 1
      });
      reloadListings();
    } catch (err) {
      console.error('Increment views error', err);
      setDetailModalListing(biz);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-[#132A13] text-white p-6 sm:p-8 rounded-[32px] border border-[#283618] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-1">
            <Building className="w-4 h-4 text-[#4F772D]" />
            <span>Liberia M&A & Enterprise Marketplace</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Businesses For Sale & M&A Opportunities
          </h2>
          <p className="text-xs sm:text-sm text-[#D9E3D5] mt-1 max-w-xl">
            Acquire revenue-generating operating enterprises, cold storage plants, or commercial real estate. Confidential deals protected by executed Non-Disclosure Agreements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#4F772D] hover:bg-[#283618] text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-[#A3B18A]/30"
          >
            <Plus className="w-4 h-4" />
            <span>List Business For Sale</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-1 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'browse', label: 'Browse Deals', count: businesses.length },
            { id: 'saved', label: 'Saved Deals', count: savedIds.length },
            { id: 'my_listings', label: 'My Listings', count: currentUserId ? businesses.filter((b) => b.ownerUserId === currentUserId).length : 0 },
            { id: 'analytics', label: 'Saves & Inquiries Analytics', count: null },
            ...(canModerate
              ? [{ id: 'moderation', label: 'Moderation & Governance', count: businesses.filter((b) => !b.isVerified).length }]
              : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#283618] text-white shadow-xs'
                  : 'bg-[#F9F8F4] text-[#606C38] hover:text-[#132A13] hover:bg-[#ECF3E9]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-[#4F772D] text-white' : 'bg-[#E8E4D9] text-[#283618]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: Moderation or Analytics Panel */}
      {activeTab === 'moderation' ? (
        <BusinessModerationPanel
          businesses={businesses}
          onModerateListing={handleModerateListing}
          currency={currency}
        />
      ) : activeTab === 'analytics' ? (
        <BusinessAnalyticsDashboard currentUserId={currentUserId} />
      ) : (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E4D9] space-y-4 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A3B18A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, industry, asset, location..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F9F8F4] text-xs rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              {/* County dropdown */}
              <div className="flex items-center gap-2 bg-[#F9F8F4] px-3 py-2 rounded-xl border border-[#E8E4D9]">
                <MapPin className="w-3.5 h-3.5 text-[#4F772D]" />
                <select
                  value={selectedCounty}
                  onChange={(e) => setSelectedCounty(e.target.value as County | 'all')}
                  className="text-xs font-medium text-[#283618] bg-transparent outline-none w-full cursor-pointer"
                >
                  <option value="all">All 15 Counties</option>
                  {LIBERIAN_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c} County
                    </option>
                  ))}
                </select>
              </div>

              {/* Industry dropdown */}
              <div className="flex items-center gap-2 bg-[#F9F8F4] px-3 py-2 rounded-xl border border-[#E8E4D9]">
                <Tag className="w-3.5 h-3.5 text-[#4F772D]" />
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="text-xs font-medium text-[#283618] bg-transparent outline-none w-full cursor-pointer"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price range dropdown */}
              <div className="flex items-center gap-2 bg-[#F9F8F4] px-3 py-2 rounded-xl border border-[#E8E4D9]">
                <DollarSign className="w-3.5 h-3.5 text-[#4F772D]" />
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value as any)}
                  className="text-xs font-medium text-[#283618] bg-transparent outline-none w-full cursor-pointer"
                >
                  <option value="all">Any Asking Price</option>
                  <option value="under50k">Under $50,000</option>
                  <option value="50k250k">$50,000 - $250,000</option>
                  <option value="250k1m">$250,000 - $1,000,000</option>
                  <option value="over1m">Over $1,000,000</option>
                </select>
              </div>
            </div>

            {/* Sub-Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F2F2EC] text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-[#606C38]">Listing Type:</span>
                {[
                  { id: 'all', label: 'All Listings' },
                  { id: 'confidential', label: '🔒 Confidential M&A' },
                  { id: 'public', label: '🌐 Public Sale' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setConfidentialFilter(type.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      confidentialFilter === type.id
                        ? 'bg-[#283618] text-white'
                        : 'bg-[#F9F8F4] text-[#606C38] hover:bg-[#E8E4D9]'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded text-[#4F772D]"
                />
                <span className="font-semibold text-[#283618] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4F772D]" />
                  Verified Assets Only
                </span>
              </label>
            </div>
          </div>

          {/* Grid of Business Listings */}
          <div className="grid grid-cols-1 gap-5">
            {filteredBusinesses.map((biz) => {
              const isGated = biz.isConfidential && !biz.accessGranted;
              const isSaved = savedIds.includes(biz.id);
              const firstPhoto = biz.photos && biz.photos.length > 0 ? biz.photos[0] : null;

              return (
                <div
                  key={biz.id}
                  className={`bg-white p-5 sm:p-6 rounded-3xl border transition-all hover:shadow-md ${
                    isGated ? 'border-[#E8E4D9]' : 'border-[#A3B18A]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    {/* Visual Photo Thumbnail or Letter Avatar */}
                    {firstPhoto && !isLowBandwidthMode ? (
                      <div className="w-full sm:w-44 h-32 rounded-2xl overflow-hidden bg-gray-100 flex-none border border-[#E8E4D9] relative">
                        <img 
                          src={firstPhoto} 
                          alt={biz.title} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        {biz.photos && biz.photos.length > 1 && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded-md font-bold">
                            +{biz.photos.length - 1} photos
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-full sm:w-28 h-28 bg-[#F9F8F4] rounded-2xl flex-none flex items-center justify-center text-[#4F772D] font-bold font-serif text-2xl border border-[#E8E4D9]">
                        {biz.title.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            onClick={() => handleViewListing(biz)}
                            className={`font-serif font-bold text-lg sm:text-xl text-[#283618] hover:text-[#4F772D] cursor-pointer ${
                              isGated ? 'underline decoration-dotted decoration-[#BC6C25]' : ''
                            }`}
                          >
                            {biz.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md ${
                            biz.isConfidential ? 'bg-[#DDA15E]/20 text-[#283618]' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {biz.isConfidential ? 'CONFIDENTIAL M&A' : 'PUBLIC SALE'}
                          </span>
                          {biz.isVerified && (
                            <span className="px-2.5 py-0.5 bg-[#ECF3E9] text-[#4F772D] text-[10px] font-bold rounded-full uppercase flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Verified Assets
                            </span>
                          )}
                          <button
                            onClick={() => handleToggleSave(biz.id)}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                              isSaved
                                ? 'bg-[#BC6C25] text-white border-[#BC6C25]'
                                : 'bg-[#F9F8F4] text-[#606C38] border-[#E8E4D9] hover:text-[#132A13]'
                            }`}
                            title={isSaved ? 'Saved' : 'Save Deal'}
                          >
                            <Bookmark className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#606C38]">
                        {biz.industry} • {biz.county} County • Est. {biz.establishedYear} • {biz.employeeCount} Employees
                      </p>

                      <p className="text-xs sm:text-sm text-[#2D2D2D] leading-relaxed line-clamp-2">
                        {biz.publicTeaser}
                      </p>

                      {/* Financial Snapshot Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 p-3 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] text-xs">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-[#A3B18A]">Asking Price</div>
                          <div className="text-sm font-bold text-[#283618]">{formatPrice(biz.askingPriceUSD)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-[#A3B18A]">Annual Revenue</div>
                          <div className="text-xs font-semibold text-[#606C38]">
                            {isGated ? '🔒 Gated by NDA' : formatPrice(biz.annualRevenueUSD || 0)}
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <div className="text-[10px] uppercase font-bold text-[#A3B18A]">Annual Net Profit</div>
                          <div className="text-xs font-semibold text-[#BC6C25]">
                            {isGated ? '🔒 Gated by NDA' : formatPrice(biz.annualProfitUSD || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#F2F2EC] flex-wrap gap-2">
                        <span className="text-xs text-[#A3B18A] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#4F772D]" />
                          {isGated ? `${biz.county} County (Street protected)` : biz.locationSummary}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewListing(biz)}
                            className="px-3.5 py-2 bg-[#F9F8F4] hover:bg-[#ECF3E9] text-[#283618] rounded-xl text-xs font-bold border border-[#E8E4D9] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#4F772D]" />
                            <span>View Deal Sheet</span>
                          </button>

                          {isGated ? (
                            <button
                              onClick={() => setNdaModalListing(biz)}
                              className="px-4 py-2 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Request NDA Access</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setContactModalListing(biz)}
                              className="px-4 py-2 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Contact Seller</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredBusinesses.length === 0 && (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E4D9] space-y-3">
                <Building className="w-10 h-10 text-[#A3B18A] mx-auto" />
                <h3 className="text-base font-bold text-[#132A13]">No Business Listings Found</h3>
                <p className="text-xs text-[#606C38] max-w-sm mx-auto">
                  Try broadening your search keywords or adjusting the location and price filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCounty('all');
                    setSelectedIndustry('All Industries');
                    setPriceRange('all');
                    setConfidentialFilter('all');
                    setVerifiedOnly(false);
                  }}
                  className="px-4 py-2 bg-[#283618] text-white rounded-xl text-xs font-bold"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE BUSINESS MODAL */}
      <CreateBusinessModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        currentUserId={currentUserId}
        currency={currency}
      />

      {/* DETAIL MODAL */}
      {detailModalListing && (
        <BusinessDetailModal
          isOpen={!!detailModalListing}
          onClose={() => setDetailModalListing(null)}
          listing={detailModalListing}
          isSaved={savedIds.includes(detailModalListing.id)}
          onToggleSave={handleToggleSave}
          onRequestNda={(biz) => setNdaModalListing(biz)}
          onOpenContactSeller={(biz) => setContactModalListing(biz)}
          currency={currency}
          currentUserId={currentUserId}
          onDeleteListing={handleDeleteListing}
        />
      )}

      {/* CONTACT SELLER MODAL */}
      {contactModalListing && (
        <ContactSellerModal
          isOpen={!!contactModalListing}
          onClose={() => setContactModalListing(null)}
          listing={contactModalListing}
          onSubmitInquiry={handleSendInquiry}
          currency={currency}
        />
      )}

      {/* NDA SIGNATURE MODAL */}
      {ndaModalListing && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[32px] border border-[#E8E4D9] shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#BC6C25] tracking-wider">
                  M&A Electronic Covenant
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[#132A13]">
                  Confidential Access Request & NDA
                </h3>
              </div>
              <button
                onClick={() => setNdaModalListing(null)}
                className="text-[#606C38] hover:text-[#132A13] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#606C38] leading-relaxed">
              You are requesting confidential financial and operational records for: <br />
              <strong className="text-[#283618]">{ndaModalListing.title} ({ndaModalListing.county} County)</strong>.
            </p>

            <form onSubmit={handleNdaSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#283618] mb-1">
                    Buyer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Jefferson Weah"
                    className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#283618] mb-1">
                    Buyer Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="e.g. jweah@capital.lr"
                    className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">
                  Organization / Investment Entity Name
                </label>
                <input
                  type="text"
                  value={buyerOrganization}
                  onChange={(e) => setBuyerOrganization(e.target.value)}
                  placeholder="e.g., Monrovia Growth Capital LLC"
                  className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">
                  Proof of Funds / Capital Note (Optional)
                </label>
                <input
                  type="text"
                  value={proofOfFunds}
                  onChange={(e) => setProofOfFunds(e.target.value)}
                  placeholder="e.g., Equity capital available with Liberian Bank reference"
                  className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>

              <div className="p-3.5 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9] text-xs space-y-2">
                <div className="font-bold text-[#283618]">Non-Disclosure & Anti-Circumvention Terms</div>
                <div className="text-[11px] text-[#606C38] leading-relaxed">
                  By executing this document, you covenant not to disclose revenue figures, supplier names, trade secrets, or client rosters to third parties.
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  required
                  checked={ndaChecked}
                  onChange={(e) => setNdaChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#4F772D]"
                />
                <span className="text-xs text-[#283618] font-medium">
                  I execute this electronic Non-Disclosure Agreement and affirm bona fide commercial intent.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNdaModalListing(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#606C38]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRequestingNda}
                  className="px-6 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isRequestingNda ? (
                    <span>Verifying Electronic Signature...</span>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Execute NDA & Open Data Room</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
