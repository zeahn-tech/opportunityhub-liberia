import React, { useState } from 'react';
import { validateUploadedFile } from '../../core/security/fileValidator';
import {
  CandidateProfile,
  CandidatePrivacySettings,
  CandidateSkill,
  CertificationItem,
  County,
  EducationItem,
  ExperienceItem,
  LanguageSkill,
  PortfolioItem
} from '../../types';
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  FileText,
  Lock,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Upload,
  Download,
  FolderGit2,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface CandidateProfileEditorProps {
  profile: CandidateProfile;
  onSave: (updated: CandidateProfile) => void;
  onClose?: () => void;
}

const LIBERIAN_COUNTIES: County[] = [
  'Montserrado',
  'Nimba',
  'Bong',
  'Grand Bassa',
  'Margibi',
  'Lofa',
  'Grand Cape Mount',
  'Bomi',
  'Sinoe',
  'Maryland',
  'Rivercess',
  'Grand Gedeh',
  'River Gee',
  'Gbarpolu',
  'Grand Kru'
];

export const CandidateProfileEditor: React.FC<CandidateProfileEditorProps> = ({
  profile,
  onSave,
  onClose
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'personal' | 'experience' | 'education' | 'skills' | 'certifications' | 'languages' | 'cv' | 'portfolio' | 'privacy'
  >('personal');

  // Form State
  const [formData, setFormData] = useState<CandidateProfile>({
    ...profile,
    education: profile.education || [],
    experience: profile.experience || [],
    skills: profile.skills || [],
    certifications: profile.certifications || [],
    languages: profile.languages || [],
    portfolio: profile.portfolio || [],
    privacySettings: profile.privacySettings || {
      profileVisibility: 'public',
      contactVisibility: 'on_application_only',
      cvDownloadPermission: 'applied_jobs_only',
      showSalaryExpectations: true
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  // Handlers for Experience
  const addExperience = () => {
    const newItem: ExperienceItem = {
      id: `exp-${Date.now()}`,
      jobTitle: '',
      companyName: '',
      county: formData.county || 'Montserrado',
      workplaceModel: 'on_site',
      startDate: '2023-01',
      current: true,
      description: ''
    };
    setFormData((prev) => ({
      ...prev,
      experience: [newItem, ...prev.experience]
    }));
  };

  const updateExperience = (id: string, updates: Partial<ExperienceItem>) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.map((item) => (item.id === id ? { ...item, ...updates } : item))
    }));
  };

  const removeExperience = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.filter((item) => item.id !== id)
    }));
  };

  // Handlers for Education
  const addEducation = () => {
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      degree: 'Bachelor of Science (BSc)',
      fieldOfStudy: '',
      institution: '',
      county: formData.county || 'Montserrado',
      startYear: 2019,
      endYear: 2023,
      current: false
    };
    setFormData((prev) => ({
      ...prev,
      education: [newItem, ...prev.education]
    }));
  };

  const updateEducation = (id: string, updates: Partial<EducationItem>) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.map((item) => (item.id === id ? { ...item, ...updates } : item))
    }));
  };

  const removeEducation = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((item) => item.id !== id)
    }));
  };

  // Handlers for Skills
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Technical');
  const [newSkillLevel, setNewSkillLevel] = useState<1 | 2 | 3 | 4 | 5>(4);

  const addSkill = () => {
    if (!newSkillName.trim()) return;
    const item: CandidateSkill = {
      id: `sk-${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      level: newSkillLevel,
      yearsOfExperience: 3
    };
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, item]
    }));
    setNewSkillName('');
  };

  const removeSkill = (identifier: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => {
        if (typeof s === 'string') return s !== identifier;
        return s.id ? s.id !== identifier : s.name !== identifier;
      })
    }));
  };

  // Handlers for Certifications
  const addCertification = () => {
    const item: CertificationItem = {
      id: `cert-${Date.now()}`,
      name: '',
      issuingOrganization: '',
      issueDate: '2024-01'
    };
    setFormData((prev) => ({
      ...prev,
      certifications: [item, ...prev.certifications]
    }));
  };

  const updateCertification = (id: string, updates: Partial<CertificationItem>) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.map((item) => (item.id === id ? { ...item, ...updates } : item))
    }));
  };

  const removeCertification = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((item) => item.id !== id)
    }));
  };

  // Handlers for Languages
  const addLanguage = () => {
    const item: LanguageSkill = {
      id: `lang-${Date.now()}`,
      language: 'Kpelle',
      proficiency: 'fluent'
    };
    setFormData((prev) => ({
      ...prev,
      languages: [...prev.languages, item]
    }));
  };

  const updateLanguage = (id: string, updates: Partial<LanguageSkill>) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.map((item) => (item.id === id ? { ...item, ...updates } : item))
    }));
  };

  const removeLanguage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((item) => item.id !== id)
    }));
  };

  // Handlers for Portfolio
  const addPortfolio = () => {
    const item: PortfolioItem = {
      id: `port-${Date.now()}`,
      title: '',
      description: '',
      url: '',
      role: '',
      skills: []
    };
    setFormData((prev) => ({
      ...prev,
      portfolio: [item, ...prev.portfolio]
    }));
  };

  const updatePortfolio = (id: string, updates: Partial<PortfolioItem>) => {
    setFormData((prev) => ({
      ...prev,
      portfolio: prev.portfolio.map((item) => (item.id === id ? { ...item, ...updates } : item))
    }));
  };

  const removePortfolio = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      portfolio: prev.portfolio.filter((item) => item.id !== id)
    }));
  };

  // Handlers for CV upload
  const handleCvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadedFile(file, 'cv');
    if (!validation.valid) {
      showToast(validation.error || 'CV upload failed validation checks.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        cvFileName: validation.cleanFileName,
        cv: {
          id: `cv-${Date.now()}`,
          fileName: validation.cleanFileName,
          fileSizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: new Date().toISOString(),
          fileDataUrl: dataUrl,
          summaryExtract: `Uploaded curriculum vitae for ${prev.fullName} (${validation.cleanFileName}). Validated for Liberian institutional recruitment.`
        }
      }));
      showToast(`Resume "${validation.cleanFileName}" attached successfully.`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Profile Completeness Calculation
  const calculateCompleteness = (): number => {
    let score = 20; // baseline
    if (formData.headline?.trim()) score += 15;
    if (formData.bio?.trim()) score += 10;
    if (formData.experience.length > 0) score += 15;
    if (formData.education.length > 0) score += 15;
    if (formData.skills.length >= 3) score += 15;
    if (formData.cv || formData.cvFileName) score += 10;
    return Math.min(100, score);
  };

  const completeness = calculateCompleteness();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      onSave(formData);
      showToast('Candidate profile and privacy settings saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E4D9] shadow-sm overflow-hidden">
      {/* Top Banner & Completeness Header */}
      <div className="p-6 sm:p-8 bg-[#ECF3E9] border-b border-[#D9E3D5] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F772D] mb-1">
            <User className="w-4 h-4" />
            <span>National Talent & Professional Registry</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#132A13]">
            Candidate Profile & CV Studio
          </h2>
          <p className="text-xs sm:text-sm text-[#606C38] mt-1">
            Build your professional credentials for verified Liberian employers, NGOs, and government agencies.
          </p>
        </div>

        {/* Profile Completeness Gauge */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3D5] flex items-center gap-4 shrink-0 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#ECF3E9] border-2 border-[#4F772D] flex items-center justify-center font-bold text-sm text-[#283618]">
            {completeness}%
          </div>
          <div>
            <div className="text-xs font-bold text-[#132A13]">Profile Completeness</div>
            <div className="text-[11px] text-[#606C38]">
              {completeness >= 80 ? '🌟 Highly competitive profile' : 'Add details to boost recruiter visibility'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-3 bg-[#F9F8F6] border-b border-[#E8E4D9]">
        {[
          { id: 'personal', label: 'Personal & Bio', icon: User },
          { id: 'experience', label: `Experience (${formData.experience.length})`, icon: Briefcase },
          { id: 'education', label: `Education (${formData.education.length})`, icon: GraduationCap },
          { id: 'skills', label: `Skills (${formData.skills.length})`, icon: Award },
          { id: 'certifications', label: `Certifications (${formData.certifications.length})`, icon: ShieldCheck },
          { id: 'languages', label: `Languages (${formData.languages.length})`, icon: Globe },
          { id: 'cv', label: formData.cv ? 'CV Attached ✓' : 'CV / Resume', icon: FileText },
          { id: 'portfolio', label: `Portfolio (${formData.portfolio.length})`, icon: FolderGit2 },
          { id: 'privacy', label: 'Privacy Settings', icon: Lock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#283618] text-white shadow-xs'
                  : 'text-[#606C38] hover:text-[#283618] hover:bg-[#EBE9E1]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Form Content */}
      <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
        {/* 1. PERSONAL DETAILS & BIO */}
        {activeTab === 'personal' && (
          <div className="space-y-5">
            <div className="border-b border-[#E8E4D9] pb-3">
              <h3 className="font-bold text-base text-[#132A13]">Personal Profile & Professional Headline</h3>
              <p className="text-xs text-[#606C38]">Primary identity details presented to hiring managers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g., Emmanuel Flomo"
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="emmanuel.flomo@example.lr"
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Liberian Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+231 77 000 0000 / +231 88 000 0000"
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Primary County Location *</label>
                <select
                  value={formData.county}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value as County })}
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                >
                  {LIBERIAN_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c} County
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">City / District / Community</label>
                <input
                  type="text"
                  value={formData.cityDistrict || ''}
                  onChange={(e) => setFormData({ ...formData, cityDistrict: e.target.value })}
                  placeholder="e.g., Sinkor, Monrovia or Ganta City"
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#283618] mb-1">Years of Total Experience</label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  value={formData.yearsOfExperience || 0}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Professional Headline *</label>
              <input
                type="text"
                required
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g., Senior Logistics & Supply Chain Specialist | UN & NGO Experience"
                className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Executive Summary / Bio</label>
              <textarea
                rows={4}
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Highlight your background, core accomplishments across Liberia, and leadership competencies..."
                className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
              />
            </div>
          </div>
        )}

        {/* 2. EXPERIENCE */}
        {activeTab === 'experience' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#132A13]">Employment & Work History</h3>
                <p className="text-xs text-[#606C38]">Detail your roles with Liberian institutions, companies, or international missions.</p>
              </div>
              <button
                type="button"
                onClick={addExperience}
                className="px-3 py-1.5 bg-[#ECF3E9] text-[#4F772D] hover:bg-[#D9E3D5] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Position</span>
              </button>
            </div>

            {formData.experience.length === 0 ? (
              <div className="p-8 text-center bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
                <Briefcase className="w-8 h-8 text-[#A3B18A] mx-auto mb-2" />
                <div className="text-xs font-bold text-[#283618]">No work experience added yet</div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="mt-3 px-4 py-2 bg-[#4F772D] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add First Experience
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.experience.map((exp, idx) => (
                  <div key={exp.id || `exp-${idx}`} className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => removeExperience(exp.id)}
                      className="absolute top-4 right-4 text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Job Title *</label>
                        <input
                          type="text"
                          required
                          value={exp.jobTitle}
                          onChange={(e) => updateExperience(exp.id, { jobTitle: e.target.value })}
                          placeholder="e.g., Procurement Officer"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Organization / Employer *</label>
                        <input
                          type="text"
                          required
                          value={exp.companyName}
                          onChange={(e) => updateExperience(exp.id, { companyName: e.target.value })}
                          placeholder="e.g., Save the Children Liberia"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">County</label>
                        <select
                          value={exp.county}
                          onChange={(e) => updateExperience(exp.id, { county: e.target.value as County })}
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        >
                          {LIBERIAN_COUNTIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Start Date</label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                          placeholder="YYYY-MM"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">End Date</label>
                        <input
                          type="text"
                          disabled={exp.current}
                          value={exp.current ? 'Present' : exp.endDate || ''}
                          onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                          placeholder="YYYY-MM"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none disabled:bg-stone-100 disabled:text-stone-400"
                        />
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 text-xs text-[#283618] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exp.current}
                            onChange={(e) => updateExperience(exp.id, { current: e.target.checked })}
                            className="rounded text-[#4F772D]"
                          />
                          <span>Currently Working</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#283618] mb-1">Key Responsibilities & Impact</label>
                      <textarea
                        rows={2}
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                        placeholder="Managed fleet logistics across Montserrado and Nimba counties with 100% on-time delivery..."
                        className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. EDUCATION */}
        {activeTab === 'education' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#132A13]">Education & Academic Degrees</h3>
                <p className="text-xs text-[#606C38]">Degrees, diplomas, and institutional qualifications.</p>
              </div>
              <button
                type="button"
                onClick={addEducation}
                className="px-3 py-1.5 bg-[#ECF3E9] text-[#4F772D] hover:bg-[#D9E3D5] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Education</span>
              </button>
            </div>

            {formData.education.length === 0 ? (
              <div className="p-8 text-center bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
                <GraduationCap className="w-8 h-8 text-[#A3B18A] mx-auto mb-2" />
                <div className="text-xs font-bold text-[#283618]">No education items added yet</div>
                <button
                  type="button"
                  onClick={addEducation}
                  className="mt-3 px-4 py-2 bg-[#4F772D] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add Education Item
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.education.map((edu, idx) => (
                  <div key={edu.id || `edu-${idx}`} className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => removeEducation(edu.id)}
                      className="absolute top-4 right-4 text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Institution / University *</label>
                        <input
                          type="text"
                          required
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                          placeholder="e.g., University of Liberia / Cuttington University"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Degree / Qualification *</label>
                        <input
                          type="text"
                          required
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                          placeholder="e.g., Bachelor of Science (BSc) / Higher Diploma"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Field of Study *</label>
                        <input
                          type="text"
                          required
                          value={edu.fieldOfStudy}
                          onChange={(e) => updateEducation(edu.id, { fieldOfStudy: e.target.value })}
                          placeholder="e.g., Civil Engineering / Economics"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Start Year</label>
                        <input
                          type="number"
                          value={edu.startYear}
                          onChange={(e) => updateEducation(edu.id, { startYear: parseInt(e.target.value) || 2020 })}
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Graduation Year</label>
                        <input
                          type="number"
                          value={edu.endYear || 2024}
                          onChange={(e) => updateEducation(edu.id, { endYear: parseInt(e.target.value) || 2024 })}
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. SKILLS */}
        {activeTab === 'skills' && (
          <div className="space-y-5">
            <div className="border-b border-[#E8E4D9] pb-3">
              <h3 className="font-bold text-base text-[#132A13]">Key Competencies & Technical Skills</h3>
              <p className="text-xs text-[#606C38]">Categorize your core competencies with proficiency ratings.</p>
            </div>

            {/* Quick Add Skill Form */}
            <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] flex flex-wrap sm:flex-nowrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-bold text-[#283618] mb-1">Skill Name</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g., Fleet Management, QuickBooks, Heavy Machinery"
                  className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
                />
              </div>

              <div className="w-40">
                <label className="block text-[11px] font-bold text-[#283618] mb-1">Category</label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                >
                  <option value="Technical">Technical</option>
                  <option value="Operations">Operations</option>
                  <option value="Management">Management</option>
                  <option value="Finance">Finance & Accounting</option>
                  <option value="Health">Healthcare</option>
                  <option value="Engineering">Engineering</option>
                </select>
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-bold text-[#283618] mb-1">Proficiency (1-5)</label>
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(parseInt(e.target.value) as any)}
                  className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                >
                  <option value={5}>5 - Expert</option>
                  <option value={4}>4 - Advanced</option>
                  <option value={3}>3 - Intermediate</option>
                  <option value={2}>2 - Working</option>
                  <option value={1}>1 - Beginner</option>
                </select>
              </div>

              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add Skill
              </button>
            </div>

            {/* Render Skill Chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.skills.map((skill, sIdx) => {
                const isObj = typeof skill !== 'string';
                const skillName = isObj ? skill.name : skill;
                const skillLevel = isObj ? skill.level : 4;
                const skillKey = isObj && skill.id ? skill.id : `${skillName}-${sIdx}`;
                const removeId = isObj && skill.id ? skill.id : skillName;

                return (
                  <div
                    key={skillKey}
                    className="px-3 py-1.5 bg-[#ECF3E9] text-[#283618] rounded-xl border border-[#D9E3D5] text-xs font-semibold flex items-center gap-2"
                  >
                    <span>{skillName}</span>
                    {skillLevel && (
                      <span className="text-[10px] text-[#4F772D] font-bold">★ {skillLevel}/5</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSkill(removeId)}
                      className="text-stone-400 hover:text-red-600 cursor-pointer ml-1"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. CERTIFICATIONS */}
        {activeTab === 'certifications' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#132A13]">Certifications & Professional Licenses</h3>
                <p className="text-xs text-[#606C38]">Accredited licenses e.g., ALPO, LBR engineering licenses, PMP.</p>
              </div>
              <button
                type="button"
                onClick={addCertification}
                className="px-3 py-1.5 bg-[#ECF3E9] text-[#4F772D] hover:bg-[#D9E3D5] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Certification</span>
              </button>
            </div>

            {formData.certifications.length === 0 ? (
              <div className="p-8 text-center bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
                <ShieldCheck className="w-8 h-8 text-[#A3B18A] mx-auto mb-2" />
                <div className="text-xs font-bold text-[#283618]">No certifications added</div>
                <button
                  type="button"
                  onClick={addCertification}
                  className="mt-3 px-4 py-2 bg-[#4F772D] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add Certification
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.certifications.map((cert, idx) => (
                  <div key={cert.id || `cert-${idx}`} className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => removeCertification(cert.id)}
                      className="absolute top-4 right-4 text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Certification Title *</label>
                        <input
                          type="text"
                          required
                          value={cert.name}
                          onChange={(e) => updateCertification(cert.id, { name: e.target.value })}
                          placeholder="e.g., Certified Supply Chain Professional (CSCP)"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Issuing Authority *</label>
                        <input
                          type="text"
                          required
                          value={cert.issuingOrganization}
                          onChange={(e) => updateCertification(cert.id, { issuingOrganization: e.target.value })}
                          placeholder="e.g., APICS / Engineering Society of Liberia"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. LANGUAGES */}
        {activeTab === 'languages' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#132A13]">Languages Spoken</h3>
                <p className="text-xs text-[#606C38]">Liberian official, indigenous, and regional languages.</p>
              </div>
              <button
                type="button"
                onClick={addLanguage}
                className="px-3 py-1.5 bg-[#ECF3E9] text-[#4F772D] hover:bg-[#D9E3D5] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Language</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.languages.map((lang, idx) => (
                <div key={lang.id || lang.language || `lang-${idx}`} className="p-3 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={lang.language}
                      onChange={(e) => updateLanguage(lang.id, { language: e.target.value })}
                      placeholder="e.g., English, Kpelle, Bassa, Vai, Grebo, Gio, Mano"
                      className="w-full text-xs p-2 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                    />
                  </div>
                  <div className="w-40">
                    <select
                      value={lang.proficiency}
                      onChange={(e) => updateLanguage(lang.id, { proficiency: e.target.value as any })}
                      className="w-full text-xs p-2 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                    >
                      <option value="native">Native / Mother Tongue</option>
                      <option value="fluent">Fluent / Professional</option>
                      <option value="professional">Working Proficiency</option>
                      <option value="basic">Basic / Elementary</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang.id)}
                    className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. CV / RESUME UPLOAD */}
        {activeTab === 'cv' && (
          <div className="space-y-5">
            <div className="border-b border-[#E8E4D9] pb-3">
              <h3 className="font-bold text-base text-[#132A13]">Curriculum Vitae (CV) / Resume Document</h3>
              <p className="text-xs text-[#606C38]">Upload your full formatted PDF/DOC resume for direct job applications.</p>
            </div>

            {formData.cv ? (
              <div className="p-6 bg-[#ECF3E9] rounded-3xl border border-[#D9E3D5] space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-[#D9E3D5] flex items-center justify-center text-[#4F772D]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#132A13]">{formData.cv.fileName}</div>
                      <div className="text-xs text-[#606C38]">
                        Size: {formData.cv.fileSizeFormatted} • Uploaded: {new Date(formData.cv.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, cv: undefined, cvFileName: undefined })}
                    className="text-xs font-semibold text-red-700 hover:underline cursor-pointer"
                  >
                    Remove File
                  </button>
                </div>

                {formData.cv.summaryExtract && (
                  <p className="text-xs text-[#283618] bg-white/70 p-3 rounded-xl border border-[#D9E3D5] leading-relaxed">
                    {formData.cv.summaryExtract}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-[#D9E3D5] rounded-3xl text-center bg-[#F9F8F6] space-y-3">
                <Upload className="w-10 h-10 text-[#4F772D] mx-auto" />
                <div>
                  <div className="font-bold text-sm text-[#132A13]">Upload Curriculum Vitae (PDF, DOCX)</div>
                  <div className="text-xs text-[#606C38] mt-1">Maximum file size: 5MB</div>
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-full text-xs font-bold cursor-pointer shadow-md transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File from Device</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCvFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. PORTFOLIO & PROJECTS */}
        {activeTab === 'portfolio' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#132A13]">Portfolio & Project Showcase</h3>
                <p className="text-xs text-[#606C38]">Showcase public works, tenders completed, code repositories, or reports.</p>
              </div>
              <button
                type="button"
                onClick={addPortfolio}
                className="px-3 py-1.5 bg-[#ECF3E9] text-[#4F772D] hover:bg-[#D9E3D5] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Project</span>
              </button>
            </div>

            {formData.portfolio.length === 0 ? (
              <div className="p-8 text-center bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
                <FolderGit2 className="w-8 h-8 text-[#A3B18A] mx-auto mb-2" />
                <div className="text-xs font-bold text-[#283618]">No portfolio projects added yet</div>
                <button
                  type="button"
                  onClick={addPortfolio}
                  className="mt-3 px-4 py-2 bg-[#4F772D] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add First Project
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.portfolio.map((port, idx) => (
                  <div key={port.id || `port-${idx}`} className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => removePortfolio(port.id)}
                      className="absolute top-4 right-4 text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">Project Title *</label>
                        <input
                          type="text"
                          required
                          value={port.title}
                          onChange={(e) => updatePortfolio(port.id, { title: e.target.value })}
                          placeholder="e.g., Gbarnga Highway Drainage Assessment"
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#283618] mb-1">External Link / URL</label>
                        <input
                          type="url"
                          value={port.url || ''}
                          onChange={(e) => updatePortfolio(port.id, { url: e.target.value })}
                          placeholder="https://..."
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#283618] mb-1">Project Description & Role</label>
                      <textarea
                        rows={2}
                        value={port.description}
                        onChange={(e) => updatePortfolio(port.id, { description: e.target.value })}
                        placeholder="Overview of deliverables and institutional impact..."
                        className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#E8E4D9] outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 9. PRIVACY & ACCESS CONTROLS */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="border-b border-[#E8E4D9] pb-3">
              <h3 className="font-bold text-base text-[#132A13]">Candidate Privacy & Data Exposure Controls</h3>
              <p className="text-xs text-[#606C38]">
                You have strict control over who can discover your profile and access private contact info.
              </p>
            </div>

            <div className="space-y-4">
              {/* Profile Visibility */}
              <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-2">
                <label className="block text-xs font-bold text-[#283618]">Profile Discovery Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      value: 'public',
                      title: 'Public (Recommended)',
                      desc: 'Visible to verified employers and in talent marketplace search.'
                    },
                    {
                      value: 'anonymous',
                      title: 'Anonymous / Confidential',
                      desc: 'Name & contact masked as Candidate #ID until you explicitly apply.'
                    },
                    {
                      value: 'verified_employers_only',
                      title: 'Verified Employers Only',
                      desc: 'Only institutions with verified badges can discover you.'
                    },
                    {
                      value: 'hidden',
                      title: 'Hidden / Private',
                      desc: 'Hidden from talent search. Visible strictly when submitting job applications.'
                    }
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                        formData.privacySettings.profileVisibility === opt.value
                          ? 'bg-[#ECF3E9] border-[#4F772D] text-[#132A13]'
                          : 'bg-white border-[#E8E4D9] text-[#606C38] hover:bg-[#F9F8F4]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="profileVisibility"
                        value={opt.value}
                        checked={formData.privacySettings.profileVisibility === opt.value}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            privacySettings: {
                              ...formData.privacySettings,
                              profileVisibility: opt.value as any
                            }
                          })
                        }
                        className="mt-0.5 text-[#4F772D]"
                      />
                      <div>
                        <div className="font-bold text-[#132A13]">{opt.title}</div>
                        <div className="text-[11px] text-[#606C38] mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Contact Visibility */}
              <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-2">
                <label className="block text-xs font-bold text-[#283618]">Phone & Email Exposure</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      value: 'on_application_only',
                      title: 'Upon Direct Application',
                      desc: 'Exposed strictly to employers you apply to.'
                    },
                    {
                      value: 'public',
                      title: 'Public Contact',
                      desc: 'Visible on your public candidate profile.'
                    },
                    {
                      value: 'hidden',
                      title: 'Always Protected',
                      desc: 'Never exposed publicly.'
                    }
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2 transition-all ${
                        formData.privacySettings.contactVisibility === opt.value
                          ? 'bg-[#ECF3E9] border-[#4F772D] text-[#132A13]'
                          : 'bg-white border-[#E8E4D9] text-[#606C38] hover:bg-[#F9F8F4]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="contactVisibility"
                        value={opt.value}
                        checked={formData.privacySettings.contactVisibility === opt.value}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            privacySettings: {
                              ...formData.privacySettings,
                              contactVisibility: opt.value as any
                            }
                          })
                        }
                        className="mt-0.5 text-[#4F772D]"
                      />
                      <div>
                        <div className="font-bold text-[#132A13]">{opt.title}</div>
                        <div className="text-[11px] text-[#606C38] mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* CV Download Permission */}
              <div className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-2">
                <label className="block text-xs font-bold text-[#283618]">CV Download Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      value: 'applied_jobs_only',
                      title: 'Jobs Applied To Only',
                      desc: 'Only recruiters reviewing your active applications may download full CV file.'
                    },
                    {
                      value: 'all_employers',
                      title: 'All Registered Employers',
                      desc: 'Any verified recruiter on the platform can download your CV.'
                    }
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2 transition-all ${
                        formData.privacySettings.cvDownloadPermission === opt.value
                          ? 'bg-[#ECF3E9] border-[#4F772D] text-[#132A13]'
                          : 'bg-white border-[#E8E4D9] text-[#606C38] hover:bg-[#F9F8F4]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cvDownloadPermission"
                        value={opt.value}
                        checked={formData.privacySettings.cvDownloadPermission === opt.value}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            privacySettings: {
                              ...formData.privacySettings,
                              cvDownloadPermission: opt.value as any
                            }
                          })
                        }
                        className="mt-0.5 text-[#4F772D]"
                      />
                      <div>
                        <div className="font-bold text-[#132A13]">{opt.title}</div>
                        <div className="text-[11px] text-[#606C38] mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#E8E4D9] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#606C38] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#4F772D]" />
            <span>Changes are stored securely and synchronized in real-time.</span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#606C38] hover:text-[#283618] cursor-pointer"
              >
                Close
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile & Settings'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
