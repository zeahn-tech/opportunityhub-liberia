import React, { useState } from 'react';
import {
  Building2,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Mail,
  UserPlus,
  Trash2,
  Settings,
  Sparkles,
  MapPin,
  Globe,
  Phone,
  FileCheck,
  Briefcase
} from 'lucide-react';
import { County, Organization, OrganizationType, OrgRole } from '../../types';
import { LIBERIAN_COUNTIES } from '../../data/seedData';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { organizationService } from '../../services/organizationService';
import { verificationService } from '../../services/verificationService';
import { Button } from '../../design-system/Button';

interface OrganizationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newOrg: Organization) => void;
}

type WizardStep = 'foundation' | 'operations' | 'verification' | 'invitations' | 'configuration';

interface InviteEntry {
  id: string;
  email: string;
  role: OrgRole;
}

export const OrganizationWizardModal: React.FC<OrganizationWizardModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const { user, switchOrganization, refreshOrganizations } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<WizardStep>('foundation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Foundation
  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState<OrganizationType>('private_company');
  const [industry, setIndustry] = useState('Commercial Trade & Logistics');
  const [county, setCounty] = useState<County>('Montserrado');
  const [cityDistrict, setCityDistrict] = useState('Monrovia');
  const [description, setDescription] = useState('');

  // Step 2: Operations
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phoneNumber || '+231 77 ');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'LRD'>('USD');
  const [orgSize, setOrgSize] = useState('11-50');

  // Step 3: Verification
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxIdNumber, setTaxIdNumber] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [requestVerificationNow, setRequestVerificationNow] = useState(true);

  // Step 4: Team Invitations
  const [invites, setInvites] = useState<InviteEntry[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<OrgRole>('recruiter');

  // Step 5: Workspace Configuration
  const [notifyOnApplications, setNotifyOnApplications] = useState(true);
  const [requireCoverNote, setRequireCoverNote] = useState(true);
  const [lowBandwidthDefault, setLowBandwidthDefault] = useState(false);
  const [isPubliclyListed, setIsPubliclyListed] = useState(true);

  if (!isOpen) return null;

  const steps: { id: WizardStep; label: string; number: number }[] = [
    { id: 'foundation', label: '1. Foundation', number: 1 },
    { id: 'operations', label: '2. Details', number: 2 },
    { id: 'verification', label: '3. Verification', number: 3 },
    { id: 'invitations', label: '4. Invite Team', number: 4 },
    { id: 'configuration', label: '5. Launch', number: 5 }
  ];

  const orgTypeOptions: { value: OrganizationType; label: string; description: string }[] = [
    {
      value: 'private_company',
      label: 'Private Enterprise / Corporation',
      description: 'Registered Liberian business, commercial firm, LLC, or international subsidiary.'
    },
    {
      value: 'ngo',
      label: 'Non-Governmental Organization (NGO)',
      description: 'Humanitarian, development, civic, or non-profit entity accredited in Liberia.'
    },
    {
      value: 'government_institution',
      label: 'Government Institution / Public Body',
      description: 'National ministry, agency, commission, or county governance authority.'
    },
    {
      value: 'recruitment_agency',
      label: 'Recruitment & Staffing Agency',
      description: 'Professional human capital firm managing hiring on behalf of corporate clients.'
    },
    {
      value: 'small_business',
      label: 'SME / Local Business Entity',
      description: 'Locally owned commercial enterprise, store, contractor, or service vendor.'
    }
  ];

  const industries = [
    'Commercial Trade & Logistics',
    'Agriculture, Agro-Processing & Forestry',
    'Mining, Heavy Machinery & Energy',
    'Health, Humanitarian & Social Services',
    'Financial Services, Banking & Insurance',
    'Information Technology & Telecommunications',
    'Engineering, Construction & Infrastructure',
    'Education, Training & Public Administration',
    'Hospitality, Tourism & Food Service',
    'Legal, Audit & Professional Consulting'
  ];

  const handleAddInvite = () => {
    if (!newInviteEmail.trim()) return;
    const emailNorm = newInviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (invites.some((i) => i.email === emailNorm)) {
      setError('This email is already in the invitation list.');
      return;
    }
    setInvites([
      ...invites,
      {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        email: emailNorm,
        role: newInviteRole
      }
    ]);
    setNewInviteEmail('');
    setError(null);
  };

  const handleRemoveInvite = (id: string) => {
    setInvites(invites.filter((i) => i.id !== id));
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 'foundation') {
      if (!name.trim()) {
        setError('Organization name is required.');
        return;
      }
      if (!description.trim()) {
        setError('Please provide a brief description or mission summary.');
        return;
      }
      setCurrentStep('operations');
    } else if (currentStep === 'operations') {
      if (!contactEmail.trim()) {
        setError('Contact email is required.');
        return;
      }
      setCurrentStep('verification');
    } else if (currentStep === 'verification') {
      setCurrentStep('invitations');
    } else if (currentStep === 'invitations') {
      setCurrentStep('configuration');
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 'operations') setCurrentStep('foundation');
    else if (currentStep === 'verification') setCurrentStep('operations');
    else if (currentStep === 'invitations') setCurrentStep('verification');
    else if (currentStep === 'configuration') setCurrentStep('invitations');
  };

  const handleFinish = async () => {
    if (!user) {
      showToast('You must be signed in to create an organization workspace.', 'error');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create Organization (creator automatically receives 'owner' membership)
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const logoText = name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'OH';

      const newOrg = await organizationService.createOrganization({
        name: name.trim(),
        slug,
        type: orgType,
        industry,
        county,
        cityDistrict: cityDistrict.trim() || 'Monrovia',
        logoText,
        description: description.trim(),
        website: website.trim() || undefined,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        settings: {
          defaultCurrency,
          candidateAlertEmail: contactEmail.trim(),
          lowBandwidthDefault,
          isPubliclyListed,
          notifyOnApplications,
          requireCoverNote
        }
      });

      if (registrationNumber.trim() || taxIdNumber.trim()) {
        try {
          await organizationService.updateOrganizationProfile(newOrg.id, {
            registrationNumber: registrationNumber.trim() || undefined,
            taxIdNumber: taxIdNumber.trim() || undefined
          });
        } catch {
          // Non-blocking -- the org itself was created successfully.
        }
      }

      // 2. If verification requested with notes, submit a verification audit
      if (requestVerificationNow && (registrationNumber.trim() || taxIdNumber.trim())) {
        try {
          await verificationService.submit({
            organizationId: newOrg.id,
            organizationName: newOrg.name,
            organizationType: newOrg.type,
            county: newOrg.county,
            registryNumber: registrationNumber.trim() || 'SUBMITTED',
            taxIdNumber: taxIdNumber.trim() || 'SUBMITTED',
            badgeRequested: 'verified_business',
            documents: documentNotes.trim() ? [documentNotes.trim()] : []
          });
        } catch {
          // Non-blocking
        }
      }

      // 3. Send out initial team invitations
      for (const inv of invites) {
        try {
          await organizationService.createInvitation(
            newOrg.id,
            inv.email,
            inv.role,
            inv.role === 'admin' ? ['all'] : ['opportunities.create', 'applications.view']
          );
        } catch {
          // Non-blocking for batch invites
        }
      }

      // 4. Switch session to new organization
      await switchOrganization(newOrg.id);
      refreshOrganizations();

      showToast(`Workspace "${newOrg.name}" established successfully!`, 'success');

      if (onCreated) {
        onCreated(newOrg);
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create organization workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#132A13]/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-[#E8E4D9] bg-[#F9F8F6] relative flex-none">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#606C38] hover:text-[#132A13] hover:bg-[#F2F2EC] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-[#4F772D] text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Workspace Provisioning & Multi-Tenancy</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#132A13]">
            Establish Organization Workspace
          </h2>
          <p className="text-xs text-[#606C38] mt-0.5">
            Configure your registered entity, team access, and statutory verification profile in Liberia.
          </p>

          {/* Stepper Progress Bar */}
          <div className="mt-4 flex items-center justify-between border-t border-[#E8E4D9] pt-3 overflow-x-auto gap-1">
            {steps.map((s, idx) => {
              const isActive = s.id === currentStep;
              const isPast = steps.findIndex((x) => x.id === currentStep) > idx;
              return (
                <div key={s.id} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#283618] text-white'
                        : isPast
                        ? 'bg-[#ECF3E9] text-[#283618] border border-[#4F772D]'
                        : 'bg-[#F2F2EC] text-[#606C38]'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </div>
                  <span
                    className={`text-xs ${
                      isActive
                        ? 'font-bold text-[#132A13]'
                        : isPast
                        ? 'font-medium text-[#283618]'
                        : 'text-[#606C38]'
                    }`}
                  >
                    {s.label}
                  </span>
                  {idx < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-[#C4BDAF]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* STEP 1: FOUNDATION */}
          {currentStep === 'foundation' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Official Entity or Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nimba Agro-Industrial Cooperative Ltd."
                  className="w-full p-3.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-sm font-semibold text-[#132A13] focus:border-[#283618] focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-2">
                  Organization Entity Classification *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {orgTypeOptions.map((opt) => {
                    const isSel = orgType === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setOrgType(opt.value)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSel
                            ? 'bg-[#ECF3E9] border-[#4F772D] shadow-xs'
                            : 'bg-white border-[#E8E4D9] hover:border-[#606C38]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#132A13]">{opt.label}</span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSel ? 'border-[#283618] bg-[#283618] text-white' : 'border-[#E8E4D9]'
                            }`}
                          >
                            {isSel && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-[#606C38] mt-1.5">{opt.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Industry Sector *
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs font-medium text-[#132A13] outline-none"
                  >
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Primary County *
                  </label>
                  <select
                    value={county}
                    onChange={(e) => setCounty(e.target.value as County)}
                    className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs font-medium text-[#132A13] outline-none"
                  >
                    {LIBERIAN_COUNTIES.map((c) => (
                      <option key={c} value={c}>
                        {c} County
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  City / District / Local Community
                </label>
                <input
                  type="text"
                  value={cityDistrict}
                  onChange={(e) => setCityDistrict(e.target.value)}
                  placeholder="e.g. Ganta City, Sinkor Monrovia, Buchanan"
                  className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Mission Statement & Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly state what your enterprise or institution does in Liberia..."
                  className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: OPERATIONS */}
          {currentStep === 'operations' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Official Contact Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#606C38] absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="info@org.lr"
                      className="w-full pl-9 pr-3 py-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Official Telephone (+231)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#606C38] absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+231 77 000 0000"
                      className="w-full pl-9 pr-3 py-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Official Website
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#606C38] absolute left-3 top-3.5" />
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.org"
                      className="w-full pl-9 pr-3 py-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Estimated Staff Size
                  </label>
                  <select
                    value={orgSize}
                    onChange={(e) => setOrgSize(e.target.value)}
                    className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
                  >
                    <option value="1-10">1 - 10 Employees</option>
                    <option value="11-50">11 - 50 Employees</option>
                    <option value="51-200">51 - 200 Employees</option>
                    <option value="201-1000">201 - 1,000 Employees</option>
                    <option value="1000+">1,000+ Employees</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Physical Office Address in Liberia
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#606C38] absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={physicalAddress}
                    onChange={(e) => setPhysicalAddress(e.target.value)}
                    placeholder="e.g. 15th Street Tubman Blvd, Sinkor, Monrovia"
                    className="w-full pl-9 pr-3 py-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Default Operational Currency
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDefaultCurrency('USD')}
                    className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      defaultCurrency === 'USD'
                        ? 'bg-[#ECF3E9] border-[#4F772D] text-[#283618]'
                        : 'bg-white border-[#E8E4D9] text-[#606C38]'
                    }`}
                  >
                    USD ($) United States Dollar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultCurrency('LRD')}
                    className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      defaultCurrency === 'LRD'
                        ? 'bg-[#ECF3E9] border-[#4F772D] text-[#283618]'
                        : 'bg-white border-[#E8E4D9] text-[#606C38]'
                    }`}
                  >
                    LRD ($) Liberian Dollar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VERIFICATION */}
          {currentStep === 'verification' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#ECF3E9] rounded-2xl border border-[#D5E4CF] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#4F772D] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-[#132A13]">
                    Liberia Chamber of Commerce & Statutory Verification
                  </div>
                  <p className="text-[#606C38] mt-0.5">
                    Verified organizations receive a distinct trust seal, prioritized job post distribution, and can directly extend binding employment offers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Business Registration / Accreditation No.
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g. LBR-REG-2026-8812"
                    className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs font-mono text-[#132A13] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Tax Identification Number (TIN)
                  </label>
                  <input
                    type="text"
                    value={taxIdNumber}
                    onChange={(e) => setTaxIdNumber(e.target.value)}
                    placeholder="e.g. TIN-0099881-LBR"
                    className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs font-mono text-[#132A13] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Accreditation & Documentation Notes
                </label>
                <textarea
                  rows={2}
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                  placeholder="Articles of incorporation, MOFA accreditation cert, or Liberia Business Registry filing notes..."
                  className="w-full p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9]">
                <input
                  type="checkbox"
                  id="requestVerificationCheck"
                  checked={requestVerificationNow}
                  onChange={(e) => setRequestVerificationNow(e.target.checked)}
                  className="w-4 h-4 rounded text-[#283618] accent-[#283618] cursor-pointer"
                />
                <label htmlFor="requestVerificationCheck" className="text-xs text-[#132A13] cursor-pointer">
                  <span className="font-bold">Submit for Verification Review immediately.</span> Verification officers will review statutory credentials.
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: INVITATIONS */}
          {currentStep === 'invitations' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
                <div className="text-xs font-bold text-[#132A13] mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#BC6C25]" />
                  <span>Invite Colleagues & Recruitment Partners</span>
                </div>
                <p className="text-[11px] text-[#606C38] mb-3">
                  Invite your HR team, hiring managers, or agency recruiters. They will receive an invitation linked to this workspace.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    placeholder="colleague@organization.lr"
                    className="flex-1 p-2.5 bg-white rounded-xl border border-[#E8E4D9] text-xs text-[#132A13] outline-none"
                  />
                  <select
                    value={newInviteRole}
                    onChange={(e) => setNewInviteRole(e.target.value as OrgRole)}
                    className="p-2.5 bg-white rounded-xl border border-[#E8E4D9] text-xs font-medium text-[#132A13] outline-none"
                  >
                    <option value="admin">Organization Admin</option>
                    <option value="recruiter">Recruiter / Talent Lead</option>
                    <option value="member">Team Member</option>
                    <option value="billing_manager">Billing & Finance</option>
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddInvite}
                    className="cursor-pointer"
                  >
                    Add Invitee
                  </Button>
                </div>
              </div>

              {/* List of Pending Invites */}
              {invites.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#132A13]">
                    Invitations to Dispatch ({invites.length}):
                  </div>
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 bg-white rounded-xl border border-[#E8E4D9] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#606C38]" />
                        <span className="text-xs font-bold text-[#132A13]">{inv.email}</span>
                        <span className="text-[10px] font-bold uppercase bg-[#ECF3E9] text-[#283618] px-2 py-0.5 rounded-full">
                          {inv.role}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInvite(inv.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Remove invitee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-[#E8E4D9] rounded-2xl text-xs text-[#606C38]">
                  No additional colleagues added yet. You can invite team members anytime from workspace settings.
                </div>
              )}
            </div>
          )}

          {/* STEP 5: CONFIGURATION & LAUNCH */}
          {currentStep === 'configuration' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#ECF3E9] rounded-2xl border border-[#D5E4CF]">
                <div className="text-xs font-bold text-[#132A13] mb-1">
                  Tenant Summary & Security Boundaries
                </div>
                <div className="text-xs text-[#606C38] space-y-1">
                  <div>
                    <span className="font-semibold text-[#132A13]">Entity:</span> {name} ({orgType?.replace('_', ' ')})
                  </div>
                  <div>
                    <span className="font-semibold text-[#132A13]">Location:</span> {cityDistrict}, {county} County
                  </div>
                  <div>
                    <span className="font-semibold text-[#132A13]">Your Role:</span> Workspace Owner (Authoritative Tenant Gate)
                  </div>
                  <div>
                    <span className="font-semibold text-[#132A13]">Initial Invites:</span> {invites.length} pending dispatches
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-[#132A13] uppercase tracking-wider">
                  Workspace Operational Defaults
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9]">
                  <div>
                    <div className="text-xs font-bold text-[#132A13]">Candidate Application Alerts</div>
                    <div className="text-[11px] text-[#606C38]">Send instant email & in-app alerts on candidate submissions</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnApplications}
                    onChange={(e) => setNotifyOnApplications(e.target.checked)}
                    className="w-4 h-4 rounded text-[#283618] accent-[#283618] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9]">
                  <div>
                    <div className="text-xs font-bold text-[#132A13]">Require Candidate Cover Notes</div>
                    <div className="text-[11px] text-[#606C38]">Mandate a 2-sentence qualification summary for all postings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireCoverNote}
                    onChange={(e) => setRequireCoverNote(e.target.checked)}
                    className="w-4 h-4 rounded text-[#283618] accent-[#283618] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9]">
                  <div>
                    <div className="text-xs font-bold text-[#132A13]">Public Organization Profile</div>
                    <div className="text-[11px] text-[#606C38]">Display organization profile in the national employer directory</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPubliclyListed}
                    onChange={(e) => setIsPubliclyListed(e.target.checked)}
                    className="w-4 h-4 rounded text-[#283618] accent-[#283618] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9]">
                  <div>
                    <div className="text-xs font-bold text-[#132A13]">Low-Bandwidth Optimized Mode</div>
                    <div className="text-[11px] text-[#606C38]">Compress attachments and reduce network footprint for remote counties</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowBandwidthDefault}
                    onChange={(e) => setLowBandwidthDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-[#283618] accent-[#283618] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-[#E8E4D9] bg-[#F9F8F6] flex items-center justify-between flex-none">
          {currentStep !== 'foundation' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
          )}

          {currentStep !== 'configuration' ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleFinish}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {isSubmitting ? 'Establishing Workspace...' : 'Launch Workspace'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
