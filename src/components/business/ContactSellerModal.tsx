import React, { useState } from 'react';
import { BusinessListing } from '../../types';
import { Mail, Phone, Send, CheckCircle2, Building, DollarSign, Calendar, MessageSquare } from 'lucide-react';

interface ContactSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: BusinessListing;
  onSubmitInquiry: (inquiry: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    message: string;
    inquiryType: 'general' | 'financials' | 'site_visit' | 'offer';
  }) => void;
  currency?: 'USD' | 'LRD';
}

export const ContactSellerModal: React.FC<ContactSellerModalProps> = ({
  isOpen,
  onClose,
  listing,
  onSubmitInquiry,
  currency = 'USD'
}) => {
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [inquiryType, setInquiryType] = useState<'general' | 'financials' | 'site_visit' | 'offer'>('financials');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitInquiry({
      senderName,
      senderEmail,
      senderPhone,
      message,
      inquiryType
    });
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[32px] border border-[#E8E4D9] shadow-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#4F772D] tracking-wider">
              Buyer Platform Communications
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-[#132A13]">
              Contact Seller / Deal Inquiry
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#606C38] hover:text-[#132A13] text-sm font-bold w-8 h-8 rounded-full bg-[#F9F8F4] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Listing Context Box */}
        <div className="p-3.5 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] text-xs space-y-1">
          <div className="font-bold text-[#283618]">{listing.title}</div>
          <div className="text-[#606C38]">
            {listing.industry} • {listing.county} County • Asking: ${listing.askingPriceUSD.toLocaleString()}
          </div>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3 bg-[#ECF3E9] rounded-2xl border border-[#D9E3D5]">
            <CheckCircle2 className="w-12 h-12 text-[#4F772D] mx-auto" />
            <h4 className="text-base font-bold text-[#132A13]">Inquiry Delivered to Seller!</h4>
            <p className="text-xs text-[#606C38]">
              Your inquiry has been routed through our encrypted platform mechanism. The seller will respond directly to your registered contact.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">
                Inquiry Objective *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'financials', label: 'Request Full Financial Deck', icon: DollarSign },
                  { id: 'site_visit', label: 'Schedule Site Inspection', icon: Calendar },
                  { id: 'general', label: 'General Commercial Question', icon: MessageSquare },
                  { id: 'offer', label: 'Submit Purchase Offer', icon: Building }
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setInquiryType(opt.id as any)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-semibold transition-all flex items-center gap-2 ${
                        inquiryType === opt.id
                          ? 'bg-[#283618] text-white border-[#283618] shadow-xs'
                          : 'bg-[#F9F8F4] text-[#606C38] border-[#E8E4D9] hover:border-[#4F772D]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-none" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Jefferson Weah"
                  className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. jweah@capital.lr"
                  className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Phone / WhatsApp Number</label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="e.g. +231 88 123 4567"
                className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Message to Seller *</label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your commercial background, acquisition timeline, and specific questions regarding this enterprise..."
                className="w-full text-xs p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#606C38]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Platform Inquiry</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
