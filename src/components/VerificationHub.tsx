import React, { useState } from 'react';
import { VerificationAudit, VerificationBadge } from '../types';
import { ShieldCheck, FileCheck, CheckCircle2, XCircle, Clock, UploadCloud, Building2, AlertCircle, FileText } from 'lucide-react';
import { LIBERIAN_COUNTIES } from '../data/seedData';
import { trustSafetyService } from '../services/trustSafetyService';

interface VerificationHubProps {
  audits: VerificationAudit[];
  onAuditDecision: (auditId: string, status: 'approved' | 'rejected') => void;
  onSubmitAudit: (newAudit: VerificationAudit) => void;
  currentUserId?: string;
}

export const VerificationHub: React.FC<VerificationHubProps> = ({
  audits,
  onAuditDecision,
  onSubmitAudit,
  currentUserId = 'user-employer-1'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'apply' | 'standards'>('apply');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Private Enterprise');
  const [county, setCounty] = useState('Montserrado');
  const [registryNumber, setRegistryNumber] = useState('');
  const [taxIdNumber, setTaxIdNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [badgeRequested, setBadgeRequested] = useState<VerificationBadge>('verified_company');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ fileName: string; urlOrData: string }>>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newDoc = {
        fileName: file.name,
        urlOrData: URL.createObjectURL(file)
      };
      setUploadedFiles((prev) => [...prev, newDoc]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !registryNumber) {
      setSubmissionError('Please fill out the organization name and LBR registration number.');
      return;
    }

    setSubmissionError('');
    setIsSubmitted(true);

    try {
      await trustSafetyService.submitVerificationRequest({
        entityType: orgType === 'Recruitment Agency' ? 'recruiter' : 'organization',
        entityId: `org-${Date.now()}`,
        entityName: orgName,
        submitterUserId: currentUserId,
        badgeRequested,
        registrationNumber: registryNumber,
        taxIdNumber,
        licenseNumber,
        county: county as any,
        evidenceDocuments: uploadedFiles.map((f, i) => ({
          id: `doc-${Date.now()}-${i}`,
          fileName: f.fileName,
          fileType: 'application/pdf',
          documentType: 'lbr_certificate',
          fileSize: 1200000,
          urlOrData: f.urlOrData,
          uploadedAt: new Date().toISOString()
        })),
        evidenceNotes
      });

      const audit: VerificationAudit = {
        id: `verif-${Date.now()}`,
        organizationName: orgName,
        organizationType: orgType,
        county: county as any,
        registryNumber,
        taxIdNumber: taxIdNumber || 'TIN-Pending',
        badgeRequested,
        submissionDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        documents: uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.fileName) : ['Liberia Business Registry Certificate.pdf']
      };

      onSubmitAudit(audit);

      setTimeout(() => {
        setIsSubmitted(false);
        setActiveSubTab('queue');
        setOrgName('');
        setRegistryNumber('');
        setUploadedFiles([]);
        setEvidenceNotes('');
      }, 1200);
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit verification request.');
      setIsSubmitted(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner in Natural Tones Forest Green */}
      <div className="bg-[#283618] p-6 sm:p-8 rounded-[32px] text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#A3B18A] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#4F772D]" />
            <span>Official Institutional Verification</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Trust & Verification Command Center
          </h2>
          <p className="text-xs sm:text-sm text-[#A3B18A] mt-1 max-w-xl">
            To eliminate fraud and ghost postings across Liberia, every badge is tied to verifiable statutory filings with the Liberia Business Registry (LBR) and line ministries.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10 text-xs">
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeSubTab === 'queue' ? 'bg-white text-[#283618]' : 'text-white/80 hover:text-white'
            }`}
          >
            Audit Queue ({audits.filter(a => a.status !== 'approved').length})
          </button>
          <button
            onClick={() => setActiveSubTab('apply')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeSubTab === 'apply' ? 'bg-white text-[#283618]' : 'text-white/80 hover:text-white'
            }`}
          >
            Apply for Badge
          </button>
          <button
            onClick={() => setActiveSubTab('standards')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeSubTab === 'standards' ? 'bg-white text-[#283618]' : 'text-white/80 hover:text-white'
            }`}
          >
            Standards
          </button>
        </div>
      </div>

      {/* View 1: Audit Queue for Verification Officers */}
      {activeSubTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#132A13] text-lg">Official Auditor Review Queue</h3>
            <span className="text-xs text-[#606C38]">Role: LBR / Ministry Verification Officer</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {audits.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E4D9] shadow-xs flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#283618]">{item.organizationName}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'approved'
                        ? 'bg-[#ECF3E9] text-[#4F772D]'
                        : item.status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-[#FEFAE0] text-[#BC6C25]'
                    }`}>
                      {item.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-[#606C38] flex flex-wrap items-center gap-2">
                    <span>{item.organizationType}</span>
                    <span>•</span>
                    <span>{item.county} County</span>
                    <span>•</span>
                    <span>LBR: <strong>{item.registryNumber}</strong></span>
                    <span>•</span>
                    <span>TIN: <strong>{item.taxIdNumber}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] font-semibold text-[#A3B18A]">Uploaded Filings:</span>
                    {item.documents.map((doc, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 bg-[#F9F8F4] border border-[#E8E4D9] rounded-md text-[#606C38]">
                        📄 {doc}
                      </span>
                    ))}
                  </div>
                </div>

                {item.status !== 'approved' && (
                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    <button
                      onClick={() => onAuditDecision(item.id, 'rejected')}
                      className="px-3.5 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold"
                    >
                      Reject Proof
                    </button>
                    <button
                      onClick={() => onAuditDecision(item.id, 'approved')}
                      className="px-4 py-2 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Grant Badge</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 2: Application for Badge */}
      {activeSubTab === 'apply' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-[32px] border border-[#E8E4D9] shadow-xs space-y-4 max-w-2xl">
          <h3 className="font-serif font-bold text-xl text-[#132A13]">
            Submit Enterprise Documentation for Verification
          </h3>
          <p className="text-xs text-[#606C38]">
            Enter your statutory Liberia Business Registry (LBR) details. Audits are processed within 48 business hours.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Organization Name *</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Buchanan Agro Logistics Inc."
                className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Entity Type</label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none font-medium text-[#283618]"
              >
                <option value="Private Enterprise">Private Enterprise (LLC/Corp)</option>
                <option value="Non-Governmental Organization">Registered NGO</option>
                <option value="Government Agency">Government Ministry / Agency</option>
                <option value="Recruitment Agency">Recruitment Agency</option>
                <option value="Small Business / Cooperative">Small Business / Farmers Coop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">LBR Registration Number *</label>
              <input
                type="text"
                required
                value={registryNumber}
                onChange={(e) => setRegistryNumber(e.target.value)}
                placeholder="e.g., LBR-CORP-2024-5519"
                className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#283618] mb-1">Tax Identification Number (TIN)</label>
              <input
                type="text"
                value={taxIdNumber}
                onChange={(e) => setTaxIdNumber(e.target.value)}
                placeholder="e.g., TIN-88001928"
                className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none focus:border-[#4F772D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#283618] mb-1">Primary County Location</label>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 bg-[#F9F8F4] rounded-xl border border-[#E8E4D9] outline-none text-[#283618]"
            >
              {LIBERIAN_COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c} County
                </option>
              ))}
            </select>
          </div>

          {submissionError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submissionError}</span>
            </div>
          )}

          <div className="p-4 border-2 border-dashed border-[#D9E3D5] rounded-2xl bg-[#F9F8F4] text-center space-y-2 relative">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <UploadCloud className="w-6 h-6 text-[#A3B18A] mx-auto" />
            <div className="text-xs font-semibold text-[#283618]">
              Click or drag to attach statutory proof documents (PDF or Scanned Images)
            </div>
            <div className="text-[11px] text-[#A3B18A]">
              Supported: LBR Business Certificate, LRA Tax Clearance, MOFA accreditation letter, Ministry of Labour HR Permit
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#283618]">Attached Dossier Documents:</span>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-[#ECF3E9] border border-[#D9E3D5] rounded-xl text-xs font-semibold text-[#4F772D] flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{file.fileName}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitted}
            className="w-full py-3 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            {isSubmitted ? 'Transmitting to Auditor Queue...' : 'Submit Documents for Verification'}
          </button>
        </form>
      )}

      {/* View 3: Standards and Badges Overview */}
      {activeSubTab === 'standards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-3xl border border-[#E8E4D9] space-y-2">
            <div className="inline-block px-3 py-1 bg-[#ECF3E9] text-[#4F772D] text-xs font-bold rounded-full uppercase">
              Verified Company
            </div>
            <h4 className="font-bold text-[#132A13] text-base">Private Enterprise Requirements</h4>
            <p className="text-xs text-[#606C38] leading-relaxed">
              Requires certified current business certificate from the Liberia Business Registry, article of incorporation, and valid LRA tax clearance.
            </p>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-[#E8E4D9] space-y-2">
            <div className="inline-block px-3 py-1 bg-[#FEFAE0] text-[#BC6C25] text-xs font-bold rounded-full uppercase">
              Verified NGO
            </div>
            <h4 className="font-bold text-[#132A13] text-base">Development Partner Requirements</h4>
            <p className="text-xs text-[#606C38] leading-relaxed">
              Requires official accreditation from the Ministry of Foreign Affairs (MOFA) and sector clearance from line ministries (e.g., Health, Education).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
