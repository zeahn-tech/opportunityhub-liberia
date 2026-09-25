import React, { useState } from 'react';
import { BusinessListing } from '../../types';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Building, Eye, FileText, Search, Filter } from 'lucide-react';

interface BusinessModerationPanelProps {
  businesses: BusinessListing[];
  onModerateListing: (businessId: string, decision: 'approve' | 'reject' | 'verify', reason?: string) => void;
  currency?: 'USD' | 'LRD';
}

export const BusinessModerationPanel: React.FC<BusinessModerationPanelProps> = ({
  businesses,
  onModerateListing,
  currency = 'USD'
}) => {
  const [filter, setFilter] = useState<'all' | 'unverified' | 'verified' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<BusinessListing | null>(null);
  const [moderationNote, setModerationNote] = useState('');

  const filtered = businesses.filter((b) => {
    if (filter === 'unverified' && b.isVerified) return false;
    if (filter === 'verified' && !b.isVerified) return false;
    if (filter === 'rejected' && b.moderationStatus !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.industry.toLowerCase().includes(q) ||
        b.county.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAction = (decision: 'approve' | 'reject' | 'verify') => {
    if (!selectedListing) return;
    onModerateListing(selectedListing.id, decision, moderationNote);
    setModerationNote('');
    setSelectedListing(null);
  };

  return (
    <div className="space-y-6">
      {/* Moderation Banner */}
      <div className="bg-[#132A13] text-white p-6 sm:p-8 rounded-[32px] border border-[#283618] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#4F772D]" />
            <span>Institutional Governance & Due Diligence</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Business Listing Moderation & Verification Hub
          </h2>
          <p className="text-xs sm:text-sm text-[#D9E3D5] mt-1 max-w-xl">
            Audit commercial registration deeds, verify reported asset inventories, and ensure anti-fraud compliance for all Liberian business-for-sale listings.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#283618] px-4 py-2.5 rounded-2xl border border-[#4F772D]/40 text-xs font-bold">
          <span>{businesses.filter((b) => b.isVerified).length} Verified Enterprises</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8E4D9]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A3B18A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings for moderation..."
            className="w-full pl-9 pr-3 py-2 bg-[#F9F8F4] text-xs rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Listings' },
            { id: 'unverified', label: 'Needs Verification' },
            { id: 'verified', label: 'Verified Assets' },
            { id: 'rejected', label: 'Rejected' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                filter === tab.id
                  ? 'bg-[#283618] text-white shadow-2xs'
                  : 'bg-[#F9F8F4] text-[#606C38] hover:text-[#132A13]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Moderation List */}
      <div className="space-y-3">
        {filtered.map((biz) => (
          <div
            key={biz.id}
            className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#A3B18A] transition-all"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-[#283618]">{biz.title}</h3>
                {biz.isVerified ? (
                  <span className="px-2 py-0.5 bg-[#ECF3E9] text-[#4F772D] text-[10px] font-bold rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Pending Verification
                  </span>
                )}
                {biz.moderationStatus === 'rejected' && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-full">
                    Rejected
                  </span>
                )}
              </div>

              <div className="text-xs text-[#606C38]">
                {biz.industry} • {biz.county} County • Asking: ${biz.askingPriceUSD.toLocaleString()} • Owner: {biz.sellerName || 'Anonymous Seller'}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedListing(biz)}
                className="px-3.5 py-2 bg-[#F9F8F4] hover:bg-[#ECF3E9] text-[#283618] rounded-xl text-xs font-bold border border-[#E8E4D9] flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#4F772D]" />
                <span>Audit & Review</span>
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E8E4D9] text-xs text-[#606C38]">
            No business listings match the selected moderation filter.
          </div>
        )}
      </div>

      {/* Moderation Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[32px] border border-[#E8E4D9] shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#4F772D] tracking-wider">
                  Compliance Officer Review
                </span>
                <h3 className="text-lg font-serif font-bold text-[#132A13]">
                  Audit: {selectedListing.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                aria-label="Close"
                className="text-[#606C38] hover:text-[#132A13] text-sm font-bold w-11 h-11 rounded-full bg-[#F9F8F4] flex items-center justify-center shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] text-xs space-y-2">
              <div><strong>Industry:</strong> {selectedListing.industry}</div>
              <div><strong>County / Location:</strong> {selectedListing.county} ({selectedListing.locationSummary})</div>
              <div><strong>Asking Price:</strong> ${selectedListing.askingPriceUSD.toLocaleString()}</div>
              <div><strong>Public Teaser:</strong> {selectedListing.publicTeaser}</div>
              <div><strong>Assets:</strong> {selectedListing.assetsIncluded.join(', ')}</div>
              <div><strong>Seller Contact:</strong> {selectedListing.sellerName} ({selectedListing.sellerContactEmail || 'N/A'})</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">
                Moderation Notes / Audit Log Reason
              </label>
              <textarea
                rows={3}
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                placeholder="Log reason for approval, badge award, or rejection..."
                className="w-full text-xs p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
              <button
                onClick={() => handleAction('reject')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Listing</span>
              </button>

              {!selectedListing.isVerified && (
                <button
                  onClick={() => handleAction('verify')}
                  className="px-4 py-2 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Award "Verified Assets" Badge</span>
                </button>
              )}

              <button
                onClick={() => handleAction('approve')}
                className="px-5 py-2 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#A3B18A]" />
                <span>Approve & Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
