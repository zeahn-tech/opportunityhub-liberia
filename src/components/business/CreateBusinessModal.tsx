import React, { useState } from 'react';
import { validateUploadedFile } from '../../core/security/fileValidator';
import { BusinessListing, County } from '../../types';
import { LIBERIAN_COUNTIES } from '../../data/seedData';
import { Building, Lock, Unlock, Plus, Trash2, ShieldCheck, Image as ImageIcon, DollarSign, MapPin, Tag, FileText, Upload } from 'lucide-react';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (listing: Omit<BusinessListing, 'id' | 'status'> & Partial<BusinessListing>) => void;
  currentUserId?: string;
  currency?: 'USD' | 'LRD';
}

const INDUSTRIES = [
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

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUserId,
  currency = 'USD'
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Basic Info & Industry
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [customIndustry, setCustomIndustry] = useState('');
  const [establishedYear, setEstablishedYear] = useState<number>(new Date().getFullYear() - 5);
  const [employeeCount, setEmployeeCount] = useState<number>(8);
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
  ]);
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  // Step 2: Location & Confidentiality
  const [county, setCounty] = useState<County>('Montserrado');
  const [cityDistrict, setCityDistrict] = useState('');
  const [locationSummary, setLocationSummary] = useState('');
  const [isConfidential, setIsConfidential] = useState(true);
  const [publicTeaser, setPublicTeaser] = useState('');
  const [confidentialDescription, setConfidentialDescription] = useState('');

  // Step 3: Financials & Pricing
  const [askingPriceUSD, setAskingPriceUSD] = useState<number>(150000);
  const [annualRevenueUSD, setAnnualRevenueUSD] = useState<number>(120000);
  const [annualProfitUSD, setAnnualProfitUSD] = useState<number>(45000);
  const [revenueRange, setRevenueRange] = useState('$100,000 - $250,000');
  const [profitRange, setProfitRange] = useState('$30,000 - $60,000');
  const [ebitdaRange, setEbitdaRange] = useState('$50,000');
  const [cashFlowRange, setCashFlowRange] = useState('$40,000 - $55,000');
  const [reasonForSale, setReasonForSale] = useState('');

  // Step 4: Assets & Seller Details
  const [assets, setAssets] = useState<string[]>([
    'Registered Commercial Property Lease',
    '3x Industrial Diesel Generators',
    'Automated POS & Inventory System'
  ]);
  const [newAssetInput, setNewAssetInput] = useState('');
  const [sellerName, setSellerName] = useState('Enterprise Owner');
  const [sellerContactEmail, setSellerContactEmail] = useState('');
  const [sellerContactPhone, setSellerContactPhone] = useState('');
  const [requestVerification, setRequestVerification] = useState(true);

  if (!isOpen) return null;

  const handleAddPhoto = () => {
    if (photoUrlInput.trim()) {
      setPhotos([...photos, photoUrlInput.trim()]);
      setPhotoUrlInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const validation = validateUploadedFile(file, 'image');
      if (!validation.valid) {
        alert(validation.error || 'Image upload failed validation.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleAddAsset = () => {
    if (newAssetInput.trim()) {
      setAssets([...assets, newAssetInput.trim()]);
      setNewAssetInput('');
    }
  };

  const handleRemoveAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedInd = industry === 'Other' && customIndustry.trim() ? customIndustry.trim() : industry;

    const newListing: Omit<BusinessListing, 'id' | 'status'> & Partial<BusinessListing> = {
      title,
      industry: selectedInd,
      county,
      cityDistrict,
      locationSummary: locationSummary || `${cityDistrict || 'Commercial Hub'}, ${county} County`,
      isConfidential,
      publicTeaser,
      confidentialDescription,
      askingPriceUSD,
      annualRevenueUSD,
      annualProfitUSD,
      financialRanges: {
        revenueRange,
        profitRange,
        ebitdaRange,
        cashFlowRange
      },
      establishedYear,
      employeeCount,
      assetsIncluded: assets,
      reasonForSale,
      isVerified: requestVerification,
      moderationStatus: 'published',
      sellerName,
      sellerContactEmail,
      sellerContactPhone,
      photos,
      ownerUserId: currentUserId
    };

    onSubmit(newListing);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[32px] border border-[#E8E4D9] shadow-2xl p-6 sm:p-8 space-y-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F772D]">
              <Building className="w-4 h-4" />
              <span>Liberia Enterprise M&A Marketplace</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#132A13] mt-0.5">
              List Your Business For Sale
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#606C38] hover:text-[#132A13] text-sm font-bold w-8 h-8 rounded-full bg-[#F9F8F4] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: 'Overview' },
            { num: 2, label: 'Location & Confidentiality' },
            { num: 3, label: 'Financials' },
            { num: 4, label: 'Assets & Verification' }
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => setStep(s.num as any)}
              className={`p-2 rounded-xl text-center cursor-pointer transition-all border ${
                step === s.num
                  ? 'bg-[#283618] text-white border-[#283618] font-bold shadow-2xs'
                  : step > s.num
                  ? 'bg-[#ECF3E9] text-[#4F772D] border-[#D9E3D5] font-semibold'
                  : 'bg-[#F9F8F4] text-[#A3B18A] border-[#E8E4D9] font-medium'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider">Step {s.num}</div>
              <div className="text-xs truncate">{s.label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* STEP 1: Basic Info & Industry */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">
                  Listing Title / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Commercial Cold Storage & Flake Ice Plant"
                  className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
                <p className="text-[11px] text-[#606C38] mt-1">
                  For confidential listings, use a descriptive general title (e.g., "Established Agro-Processing Mill in Nimba").
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Industry Category *
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Year Established
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2026"
                    value={establishedYear}
                    onChange={(e) => setEstablishedYear(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">
                  Full-Time Employee Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              {/* Photo Upload / URL Management */}
              <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#283618] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#4F772D]" />
                    Business & Facility Photos Upload
                  </span>
                  <span className="text-[11px] text-[#A3B18A]">{photos.length} Photos Added</span>
                </div>

                {/* Local File Picker Button */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="w-full sm:w-auto px-4 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-4 h-4 text-[#A3B18A]" />
                    <span>Upload Image Files</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="text-[11px] text-[#A3B18A] font-semibold hidden sm:block">or</div>

                  <div className="flex gap-1.5 w-full sm:flex-1">
                    <input
                      type="url"
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      placeholder="Paste image URL (e.g. https://...)"
                      className="flex-1 text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      className="px-3.5 py-2 bg-[#4F772D] text-white rounded-xl text-xs font-bold hover:bg-[#283618]"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden h-20 border border-[#E8E4D9]">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location & Confidentiality */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Liberian County *
                  </label>
                  <select
                    value={county}
                    onChange={(e) => setCounty(e.target.value as County)}
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  >
                    {LIBERIAN_COUNTIES.map((c) => (
                      <option key={c} value={c}>
                        {c} County
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={cityDistrict}
                    onChange={(e) => setCityDistrict(e.target.value)}
                    placeholder="e.g. Bushrod Island, Kakata, Buchanan"
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">
                  Location Summary (Street / Landmark)
                </label>
                <input
                  type="text"
                  value={locationSummary}
                  onChange={(e) => setLocationSummary(e.target.value)}
                  placeholder="e.g. Commercial Zone near Freeport Gateway"
                  className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              {/* Confidentiality Selector */}
              <div className="p-4 bg-[#FEFAE0] rounded-2xl border border-[#E8E4D9] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#283618] flex items-center gap-1.5">
                    {isConfidential ? <Lock className="w-4 h-4 text-[#BC6C25]" /> : <Unlock className="w-4 h-4 text-[#4F772D]" />}
                    Listing Confidentiality Mode
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isConfidential}
                      onChange={(e) => setIsConfidential(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#BC6C25]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-[#606C38] leading-relaxed">
                  {isConfidential
                    ? '🔒 Confidential M&A Mode enabled: Exact street location, detailed operational descriptions, and financial breakdowns will be hidden until a buyer executes a Non-Disclosure Agreement (NDA).'
                    : '🌐 Public Listing Mode: All business details and financial summaries will be visible to all verified marketplace browsers.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">
                  Public Teaser (Shown on Marketplace Cards) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={publicTeaser}
                  onChange={(e) => setPublicTeaser(e.target.value)}
                  placeholder="Write a compelling non-sensitive summary of the business..."
                  className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">
                  Confidential Detailed Description (Gated Behind NDA)
                </label>
                <textarea
                  rows={4}
                  value={confidentialDescription}
                  onChange={(e) => setConfidentialDescription(e.target.value)}
                  placeholder="Detailed due diligence overview, supplier contracts, key customers, and operational breakdown..."
                  className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Financials & Pricing */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Asking Price (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    value={askingPriceUSD}
                    onChange={(e) => setAskingPriceUSD(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D] font-bold text-[#283618]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Annual Revenue (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={annualRevenueUSD}
                    onChange={(e) => setAnnualRevenueUSD(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Annual Net Profit (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={annualProfitUSD}
                    onChange={(e) => setAnnualProfitUSD(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-3">
                <div className="text-xs font-bold text-[#283618]">Financial Range Indicators (Optional)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#606C38] mb-1">Revenue Range</label>
                    <input
                      type="text"
                      value={revenueRange}
                      onChange={(e) => setRevenueRange(e.target.value)}
                      placeholder="e.g. $100,000 - $250,000"
                      className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#606C38] mb-1">Profit Range</label>
                    <input
                      type="text"
                      value={profitRange}
                      onChange={(e) => setProfitRange(e.target.value)}
                      placeholder="e.g. $30,000 - $60,000"
                      className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#283618] mb-1">
                  Reason for Sale *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reasonForSale}
                  onChange={(e) => setReasonForSale(e.target.value)}
                  placeholder="e.g. Relocation overseas, succession planning, capital diversification..."
                  className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Assets & Verification */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Assets list */}
              <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-3">
                <div className="text-xs font-bold text-[#283618]">Included Tangible & Intangible Assets</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAssetInput}
                    onChange={(e) => setNewAssetInput(e.target.value)}
                    placeholder="Add an asset (e.g. 250kVA Generator, Land Lease, IP License)..."
                    className="flex-1 text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAsset}
                    className="px-4 py-2 bg-[#4F772D] text-white rounded-xl text-xs font-bold hover:bg-[#283618]"
                  >
                    Add Asset
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {assets.map((ast, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-[#E8E4D9] text-xs">
                      <span className="text-[#283618] font-medium">{ast}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset(idx)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Seller / Contact Representative Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#283618] mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={sellerContactEmail}
                    onChange={(e) => setSellerContactEmail(e.target.value)}
                    placeholder="e.g. owner@enterprise.lr"
                    className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
                  />
                </div>
              </div>

              {/* Verification Request Toggle */}
              <div className="p-4 bg-[#ECF3E9] rounded-2xl border border-[#D9E3D5] flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <div className="text-xs font-bold text-[#132A13] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#4F772D]" />
                    <span>Submit for Asset Verification & Institutional Badge</span>
                  </div>
                  <p className="text-[11px] text-[#606C38]">
                    Verified listings receive the green "Verified Assets" badge, increasing buyer trust and inquiry response rates by 3x.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requestVerification}
                  onChange={(e) => setRequestVerification(e.target.checked)}
                  className="w-5 h-5 rounded text-[#4F772D]"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E8E4D9]">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-5 py-2.5 rounded-xl border border-[#E8E4D9] text-xs font-semibold text-[#606C38] hover:bg-[#F9F8F4]"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-6 py-2.5 bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#132A13]"
              >
                Continue to Step {step + 1}
              </button>
            ) : (
              <button
                type="submit"
                className="px-8 py-3 bg-[#4F772D] text-white rounded-xl text-xs font-bold shadow-lg hover:bg-[#283618] transition-all"
              >
                Publish Business Listing
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
