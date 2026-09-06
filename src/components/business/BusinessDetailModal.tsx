import React, { useState } from 'react';
import { BusinessListing } from '../../types';
import {
  Building,
  ShieldCheck,
  Lock,
  Unlock,
  Bookmark,
  Send,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  FileText,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2
} from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';

interface BusinessDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: BusinessListing;
  isSaved: boolean;
  onToggleSave: (bizId: string) => void;
  onRequestNda: (listing: BusinessListing) => void;
  onOpenContactSeller: (listing: BusinessListing) => void;
  currency?: 'USD' | 'LRD';
  currentUserId?: string;
  onEditListing?: (listing: BusinessListing) => void;
  onDeleteListing?: (bizId: string) => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  isOpen,
  onClose,
  listing,
  isSaved,
  onToggleSave,
  onRequestNda,
  onOpenContactSeller,
  currency = 'USD',
  currentUserId,
  onEditListing,
  onDeleteListing
}) => {
  const { isLowBandwidthMode } = useConfig();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  if (!isOpen) return null;

  const LRD_RATE = 195;
  const formatPrice = (usd: number) => {
    if (currency === 'USD') {
      return `$${usd.toLocaleString()}`;
    }
    return `LRD ${(usd * LRD_RATE).toLocaleString()}`;
  };

  const photos = listing.photos && listing.photos.length > 0
    ? listing.photos
    : ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'];

  const isGated = listing.isConfidential && !listing.accessGranted;
  const isOwner = listing.ownerUserId === currentUserId;

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-[32px] border border-[#E8E4D9] shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-[#E8E4D9] pb-4 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#ECF3E9] text-[#4F772D] text-[10px] font-bold rounded-full uppercase">
                {listing.industry}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md ${
                listing.isConfidential ? 'bg-[#DDA15E]/20 text-[#283618]' : 'bg-blue-50 text-blue-800'
              }`}>
                {listing.isConfidential ? 'CONFIDENTIAL M&A' : 'PUBLIC SALE'}
              </span>
              {listing.isVerified && (
                <span className="px-2.5 py-0.5 bg-[#4F772D] text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Assets
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#132A13]">
              {listing.title}
            </h2>
            <div className="text-xs text-[#606C38] flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#4F772D]" />
              <span>{isGated ? `${listing.county} County (Exact street protected by NDA)` : listing.locationSummary}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(listing.id)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isSaved
                  ? 'bg-[#BC6C25] text-white border-[#BC6C25]'
                  : 'bg-[#F9F8F4] text-[#606C38] border-[#E8E4D9] hover:text-[#132A13]'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save Deal'}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={onClose}
              className="text-[#606C38] hover:text-[#132A13] text-sm font-bold w-9 h-9 rounded-2xl bg-[#F9F8F4] border border-[#E8E4D9] flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="relative rounded-2xl overflow-hidden bg-[#283618] aspect-video max-h-72 border border-[#E8E4D9] flex flex-col items-center justify-center p-6 text-center">
          {isLowBandwidthMode ? (
            <div className="flex flex-col items-center gap-2 text-stone-200">
              <Building className="w-12 h-12 text-[#BC6C25] opacity-85" />
              <p className="text-sm font-semibold">Images Paused (Low-Bandwidth Mode)</p>
              <p className="text-xs text-stone-300/80 max-w-xs">Saves cellular data usage and ensures high-speed page loads on slower networks.</p>
            </div>
          ) : (
            <>
              <img
                src={photos[activePhotoIndex]}
                alt={listing.title}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIndex((activePhotoIndex - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIndex((activePhotoIndex + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1 bg-black/40 rounded-full">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`w-2 h-2 rounded-full ${activePhotoIndex === idx ? 'bg-white' : 'bg-white/40'} cursor-pointer`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Financial Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A3B18A] tracking-wider block">Asking Price</span>
            <span className="text-base sm:text-lg font-bold text-[#283618]">{formatPrice(listing.askingPriceUSD)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A3B18A] tracking-wider block">Annual Revenue</span>
            <span className="text-sm font-semibold text-[#606C38]">
              {isGated ? '🔒 NDA Gated' : formatPrice(listing.annualRevenueUSD || 0)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A3B18A] tracking-wider block">Annual Net Profit</span>
            <span className="text-sm font-semibold text-[#BC6C25]">
              {isGated ? '🔒 NDA Gated' : formatPrice(listing.annualProfitUSD || 0)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A3B18A] tracking-wider block">Est. Year / Workforce</span>
            <span className="text-xs font-medium text-[#283618]">
              Est. {listing.establishedYear} • {listing.employeeCount} Employees
            </span>
          </div>
        </div>

        {/* Public Teaser Description */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#4F772D]">Executive Summary / Teaser</h4>
          <p className="text-xs sm:text-sm text-[#2D2D2D] leading-relaxed bg-white p-4 rounded-2xl border border-[#E8E4D9]">
            {listing.publicTeaser}
          </p>
        </div>

        {/* Confidential Disclosure Data Room Box */}
        {listing.accessGranted || !listing.isConfidential ? (
          <div className="p-5 bg-[#ECF3E9] rounded-2xl border border-[#D9E3D5] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D9E3D5] pb-2">
              <span className="font-bold text-[#132A13] text-sm flex items-center gap-2">
                <Unlock className="w-4 h-4 text-[#4F772D]" />
                Confidential Due Diligence Disclosure Room
              </span>
              <span className="px-2.5 py-0.5 bg-[#4F772D] text-white text-[10px] font-bold rounded-full">
                Access Granted
              </span>
            </div>

            <p className="text-xs text-[#2D2D2D] leading-relaxed">
              {listing.confidentialDescription || listing.publicTeaser}
            </p>

            {listing.financialRanges && (
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#D9E3D5]">
                <div><strong>Revenue Range:</strong> {listing.financialRanges.revenueRange || 'N/A'}</div>
                <div><strong>Profit Range:</strong> {listing.financialRanges.profitRange || 'N/A'}</div>
                <div><strong>EBITDA Estimate:</strong> {listing.financialRanges.ebitdaRange || 'N/A'}</div>
                <div><strong>Cash Flow:</strong> {listing.financialRanges.cashFlowRange || 'N/A'}</div>
              </div>
            )}

            {listing.sellerName && (
              <div className="pt-2 border-t border-[#D9E3D5] text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#283618]">Seller Contact: </span>
                  {listing.sellerName} ({listing.sellerContactEmail || 'Contact via platform'})
                </div>
                {listing.sellerContactPhone && (
                  <div className="text-[#606C38]">Phone: {listing.sellerContactPhone}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9] text-center space-y-3">
            <Lock className="w-8 h-8 text-[#BC6C25] mx-auto" />
            <h4 className="text-sm font-bold text-[#283618]">Confidential Operational & Financial Records Gated</h4>
            <p className="text-xs text-[#606C38] max-w-lg mx-auto">
              This enterprise is listed under Liberia Enterprise M&A Confidentiality Protocols. Detailed financial statements, supplier lists, exact location blueprints, and seller contacts are restricted to prospective buyers who execute a Non-Disclosure Agreement.
            </p>
            <button
              onClick={() => {
                onClose();
                onRequestNda(listing);
              }}
              className="px-6 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#A3B18A]" />
              <span>Execute Non-Disclosure Agreement & Unlock Data Room</span>
            </button>
          </div>
        )}

        {/* Included Assets */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#4F772D]">Assets Included in Acquisition</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {listing.assetsIncluded.map((asset, idx) => (
              <div key={idx} className="p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] text-xs font-medium text-[#283618] flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#4F772D] flex-none" />
                <span>{asset}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reason for Sale */}
        <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] text-xs space-y-1">
          <span className="font-bold text-[#283618] block">Reason for Sale:</span>
          <p className="text-[#606C38] leading-relaxed">{listing.reasonForSale}</p>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E8E4D9]">
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                {onEditListing && (
                  <button
                    onClick={() => {
                      onClose();
                      onEditListing(listing);
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Listing</span>
                  </button>
                )}
                {onDeleteListing && (
                  <button
                    onClick={() => {
                      if (confirm('Permanently remove this business listing?')) {
                        onDeleteListing(listing.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isGated ? (
              <button
                onClick={() => {
                  onClose();
                  onRequestNda(listing);
                }}
                className="px-5 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Request Access & Sign NDA</span>
              </button>
            ) : null}

            <button
              onClick={() => {
                onClose();
                onOpenContactSeller(listing);
              }}
              className="px-6 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Contact Seller / Platform Inquiry</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
