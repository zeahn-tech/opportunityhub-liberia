import React, { useState, useEffect } from 'react';
import { County, EmploymentType, Opportunity, OpportunityType, Organization, WorkplaceModel } from '../types';
import { X, Plus, Trash2, CheckCircle2, Clock, MapPin, DollarSign, Building2, Calendar, FileText } from 'lucide-react';
import { INITIAL_ORGANIZATIONS, LIBERIAN_COUNTIES } from '../data/seedData';
import { OPPORTUNITY_TYPES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db } from '../db/dbClient';

interface PostOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'>, isDraft: boolean, editId?: string) => Promise<void>;
  opportunityToEdit?: Opportunity | null;
  currency: 'USD' | 'LRD';
}

export const PostOpportunityModal: React.FC<PostOpportunityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  opportunityToEdit,
  currency
}) => {
  if (!isOpen) return null;

  const { session, user, activeRole, userOrganizations, activeOrganization } = useAuth();
  const { showToast } = useToast();

  const isPlatformAdmin = activeRole === 'platform_admin' || session?.user?.systemRole === 'platform_admin' || user?.systemRole === 'platform_admin';
  const defaultOrgId = activeOrganization?.id || (userOrganizations.length > 0 ? userOrganizations[0].id : (INITIAL_ORGANIZATIONS[0]?.id || ''));

  const [title, setTitle] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId);
  const [type, setType] = useState<OpportunityType>('job');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [workplaceModel, setWorkplaceModel] = useState<WorkplaceModel>('on_site');
  const [county, setCounty] = useState<County>('Montserrado');
  const [locationDetails, setLocationDetails] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState<'USD' | 'LRD'>(currency);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [isSalaryNegotiable, setIsSalaryNegotiable] = useState(true);
  const [isSalaryConfidential, setIsSalaryConfidential] = useState(false);
  const [openingsCount, setOpeningsCount] = useState(1);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('2026-11-30');
  
  // Bullets & Tags
  const [responsibilities, setResponsibilities] = useState<string[]>([
    'Coordinate project deliverables and milestones with regional team leads.',
    'Ensure rigorous compliance with Liberian statutory standards.'
  ]);
  const [respInput, setRespInput] = useState('');

  const [requirements, setRequirements] = useState<string[]>([
    'Minimum 3 years demonstrable industry experience.',
    'Strong analytical, problem-solving, and communication skills.'
  ]);
  const [reqInput, setReqInput] = useState('');

  const [skills, setSkills] = useState<string[]>(['Project Management', 'Compliance', 'Operations']);
  const [skillInput, setSkillInput] = useState('');

  const [screeningQuestionInput, setScreeningQuestionInput] = useState('');
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([
    'Do you hold valid statutory work authorization in Liberia?'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize from opportunityToEdit if present
  useEffect(() => {
    if (opportunityToEdit) {
      setTitle(opportunityToEdit.title);
      setSelectedOrgId(opportunityToEdit.organizationId);
      setType(opportunityToEdit.type);
      setEmploymentType(opportunityToEdit.employmentType || 'full_time');
      setWorkplaceModel(opportunityToEdit.workplaceModel);
      setCounty(opportunityToEdit.county);
      setLocationDetails(opportunityToEdit.locationDetails);
      setSalaryCurrency(opportunityToEdit.currency || 'USD');
      setSalaryMin(opportunityToEdit.salaryMin ? String(opportunityToEdit.salaryMin) : '');
      setSalaryMax(opportunityToEdit.salaryMax ? String(opportunityToEdit.salaryMax) : '');
      setIsSalaryNegotiable(opportunityToEdit.isSalaryNegotiable ?? true);
      setIsSalaryConfidential(opportunityToEdit.isSalaryConfidential ?? false);
      setOpeningsCount(opportunityToEdit.openingsCount || 1);
      setSummary(opportunityToEdit.summary || '');
      setDescription(opportunityToEdit.description);
      setDeadline(opportunityToEdit.deadline || '2026-11-30');
      if (opportunityToEdit.responsibilities) setResponsibilities(opportunityToEdit.responsibilities);
      if (opportunityToEdit.requirements) setRequirements(opportunityToEdit.requirements);
      if (opportunityToEdit.skills) setSkills(opportunityToEdit.skills);
      if (opportunityToEdit.screeningQuestions) setScreeningQuestions(opportunityToEdit.screeningQuestions);
    } else {
      setSelectedOrgId(activeOrganization?.id || (userOrganizations.length > 0 ? userOrganizations[0].id : (INITIAL_ORGANIZATIONS[0]?.id || '')));
    }
  }, [opportunityToEdit, session, activeOrganization, userOrganizations]);

  const handleAddResp = () => {
    if (!respInput.trim()) return;
    setResponsibilities([...responsibilities, respInput.trim()]);
    setRespInput('');
  };

  const handleAddReq = () => {
    if (!reqInput.trim()) return;
    setRequirements([...requirements, reqInput.trim()]);
    setReqInput('');
  };

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    if (!skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
    }
    setSkillInput('');
  };

  const handleAddQuestion = () => {
    if (!screeningQuestionInput.trim()) return;
    setScreeningQuestions([...screeningQuestions, screeningQuestionInput.trim()]);
    setScreeningQuestionInput('');
  };

  const handleSaveForm = async (isDraft: boolean) => {
    if (!title.trim()) {
      showToast('Title is required.', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Full job description is required.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const org: Organization = db.getOrganizationById(selectedOrgId) || INITIAL_ORGANIZATIONS.find((o) => o.id === selectedOrgId) || {
        id: selectedOrgId,
        slug: selectedOrgId,
        name: activeOrganization?.name || 'Authorized Entity',
        logoText: 'AE',
        description: 'Authorized registered enterprise.',
        type: 'private_company',
        industry: 'Commercial Operations',
        county,
        cityDistrict: locationDetails || `${county} County`,
        verificationStatus: 'verified',
        isVerified: true
      };

      const payload: Omit<Opportunity, 'id' | 'viewsCount' | 'applicationsCount' | 'postedDate'> = {
        organizationId: org.id,
        organization: org,
        title: title.trim(),
        slug: title.toLowerCase()?.replace(/[^a-z0-9]+/g, '-'),
        type,
        employmentType,
        workplaceModel,
        county,
        locationDetails: locationDetails.trim() || `${county} County, Liberia`,
        currency: salaryCurrency,
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : undefined,
        isSalaryNegotiable,
        isSalaryConfidential,
        summary: summary.trim() || description.slice(0, 150),
        description: description.trim(),
        responsibilities,
        requirements,
        skills,
        deadline,
        openingsCount,
        screeningQuestions,
        isFeatured: false,
        status: isDraft ? 'draft' : 'published'
      };

      await onSave(payload, isDraft, opportunityToEdit?.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-[32px] sm:rounded-[40px] border border-[#E8E4D9] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#ECF3E9] border-b border-[#D9E3D5] relative flex-none">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-[#283618] border border-[#D9E3D5] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F772D] mb-1">
            <Building2 className="w-4 h-4" />
            <span>{opportunityToEdit ? 'Edit Vacancy' : 'New Opportunity Posting'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#132A13]">
            {opportunityToEdit ? `Edit: ${opportunityToEdit.title}` : 'Author & Publish Opportunity'}
          </h2>
          <p className="text-xs text-[#606C38] mt-1">
            Configure recruitment parameters, salary ranges, and eligibility criteria for candidates across Liberia.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs sm:text-sm">
          {/* Organization Selection (Admins only, or multi-org member, else locked to active tenant) */}
          <div>
            <label className="block text-xs font-semibold text-[#283618] mb-1">Authorizing Organization *</label>
            {isPlatformAdmin ? (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-[#283618] font-medium"
              >
                {db.getOrganizations().map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type?.replace('_', ' ')}) {o.isVerified ? '✓ Verified' : ''}
                  </option>
                ))}
              </select>
            ) : userOrganizations.length > 1 ? (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-[#283618] font-medium"
              >
                {userOrganizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.membership?.orgRole || 'Member'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] text-[#283618] font-semibold flex items-center justify-between">
                <span>{activeOrganization?.name || (userOrganizations[0]?.name) || 'Your Authorized Organization'}</span>
                <span className="text-[11px] text-[#606C38] font-normal">Tenant Bound</span>
              </div>
            )}
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-xs font-semibold text-[#283618] mb-1">Opportunity / Vacancy Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Heavy Equipment Mechanic"
              className="w-full p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D] text-sm"
            />
          </div>

          {/* Category, Employment Type, Workplace Model */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Category Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as OpportunityType)}
                className="w-full p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-[#283618]"
              >
                {OPPORTUNITY_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-[#283618]"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract / Fixed Term</option>
                <option value="temporary">Temporary / Seasonal</option>
                <option value="internship">Internship / Graduate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Workplace Model</label>
              <select
                value={workplaceModel}
                onChange={(e) => setWorkplaceModel(e.target.value as WorkplaceModel)}
                className="w-full p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-[#283618]"
              >
                <option value="on_site">On-Site Only</option>
                <option value="hybrid">Hybrid (Office + Field/Remote)</option>
                <option value="remote">100% Fully Remote</option>
              </select>
            </div>
          </div>

          {/* Location / County & Specific Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">County *</label>
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value as County)}
                className="w-full p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-[#283618]"
              >
                {LIBERIAN_COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c} County
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Specific District / Address</label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g. Sinkor 12th Street, Monrovia"
                className="w-full p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
              />
            </div>
          </div>

          {/* Salary & Deadlines */}
          <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-3">
            <div className="font-semibold text-xs text-[#283618] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#4F772D]" />
              <span>Compensation & Deadlines</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#606C38] mb-1">Currency</label>
                <select
                  value={salaryCurrency}
                  onChange={(e) => setSalaryCurrency(e.target.value as 'USD' | 'LRD')}
                  className="w-full p-2 bg-white rounded-xl border border-[#E8E4D9] outline-none text-xs"
                >
                  <option value="USD">USD ($)</option>
                  <option value="LRD">LRD (Liberian Dollar)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#606C38] mb-1">Salary Min ({salaryCurrency})</label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full p-2 bg-white rounded-xl border border-[#E8E4D9] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#606C38] mb-1">Salary Max ({salaryCurrency})</label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full p-2 bg-white rounded-xl border border-[#E8E4D9] outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-[#606C38] mb-1">Application Deadline *</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-[#E8E4D9] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#606C38] mb-1">Number of Openings</label>
                <input
                  type="number"
                  min={1}
                  value={openingsCount}
                  onChange={(e) => setOpeningsCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2 bg-white rounded-xl border border-[#E8E4D9] outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#283618]">
                <input
                  type="checkbox"
                  checked={isSalaryNegotiable}
                  onChange={(e) => setIsSalaryNegotiable(e.target.checked)}
                  className="rounded text-[#4F772D]"
                />
                <span>Salary Negotiable</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#283618]">
                <input
                  type="checkbox"
                  checked={isSalaryConfidential}
                  onChange={(e) => setIsSalaryConfidential(e.target.checked)}
                  className="rounded text-[#4F772D]"
                />
                <span>Keep Salary Confidential in Public Feeds</span>
              </label>
            </div>
          </div>

          {/* Full Description & Summary */}
          <div>
            <label className="block text-xs font-semibold text-[#283618] mb-1">Short Summary (Optional)</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief 1-sentence teaser for job cards..."
              className="w-full p-2.5 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-xs mb-3"
            />

            <label className="block text-xs font-semibold text-[#283618] mb-1">Full Description *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe objectives, scope of work, project context, and reporting structure..."
              className="w-full p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none"
            ></textarea>
          </div>

          {/* Responsibilities Builder */}
          <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-2.5">
            <div className="font-semibold text-xs text-[#283618]">Key Responsibilities</div>
            <div className="space-y-1.5">
              {responsibilities.map((resp, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-[#E8E4D9]">
                  <span className="text-[#2D2D2D]">• {resp}</span>
                  <button
                    type="button"
                    onClick={() => setResponsibilities(responsibilities.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={respInput}
                onChange={(e) => setRespInput(e.target.value)}
                placeholder="Add key responsibility..."
                className="flex-1 p-2 bg-white rounded-xl border border-[#E8E4D9] text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddResp}
                className="px-3 py-1.5 bg-[#283618] text-white rounded-xl text-xs font-bold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Requirements Builder */}
          <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-2.5">
            <div className="font-semibold text-xs text-[#283618]">Requirements & Qualifications</div>
            <div className="space-y-1.5">
              {requirements.map((req, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-[#E8E4D9]">
                  <span className="text-[#2D2D2D]">• {req}</span>
                  <button
                    type="button"
                    onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={reqInput}
                onChange={(e) => setReqInput(e.target.value)}
                placeholder="Add qualification requirement..."
                className="flex-1 p-2 bg-white rounded-xl border border-[#E8E4D9] text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddReq}
                className="px-3 py-1.5 bg-[#283618] text-white rounded-xl text-xs font-bold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Required Skills Tags */}
          <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-2.5">
            <div className="font-semibold text-xs text-[#283618]">Key Skills / Competencies</div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-white border border-[#E8E4D9] rounded-lg text-xs font-medium text-[#283618] flex items-center gap-1.5"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}
                    className="text-[#606C38] hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add skill (e.g., Heavy Machinery, Procurement, Logistics)..."
                className="flex-1 p-2 bg-white rounded-xl border border-[#E8E4D9] text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-1.5 bg-[#283618] text-white rounded-xl text-xs font-bold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Custom Screening Questions */}
          <div className="p-4 bg-[#F9F8F4] rounded-2xl border border-[#E8E4D9] space-y-2.5">
            <div className="font-semibold text-xs text-[#283618]">Custom Screening Questions</div>
            <div className="space-y-1.5">
              {screeningQuestions.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-[#E8E4D9]">
                  <span className="text-[#606C38]">{q}</span>
                  <button
                    type="button"
                    onClick={() => setScreeningQuestions(screeningQuestions.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={screeningQuestionInput}
                onChange={(e) => setScreeningQuestionInput(e.target.value)}
                placeholder="Add custom question (e.g. Do you have a valid CIPS certificate?)..."
                className="flex-1 p-2 bg-white rounded-xl border border-[#E8E4D9] text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-[#283618] text-white rounded-xl text-xs font-bold"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-white border-t border-[#E8E4D9] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveForm(true)}
              className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-700" />
              <span>{isSubmitting ? 'Saving...' : 'Save as Draft'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveForm(false)}
              className="px-6 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Immediately'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
