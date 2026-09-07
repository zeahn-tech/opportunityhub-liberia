import React, { useEffect, useState } from 'react';
import { Application, CandidateProfile } from '../../types';
import {
  X,
  User,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  FileText,
  Download,
  FolderGit2,
  Calendar,
  Lock,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { subscriptionService } from '../../services/subscriptionService';

interface CandidateProfileDrawerProps {
  profile: CandidateProfile | null;
  application?: Application | null;
  onClose: () => void;
  onAdvanceStage?: (appId: string, stage: any) => void;
}

export const CandidateProfileDrawer: React.FC<CandidateProfileDrawerProps> = ({
  profile,
  application,
  onClose,
  onAdvanceStage
}) => {
  const { showToast } = useToast();
  const [canViewContact, setCanViewContact] = useState(true);
  
  useEffect(() => {
    const checkEntitlement = async () => {
      const session = authService.getSession();
      const orgId = session?.activeOrganization?.id;
      if (orgId) {
        const res = await subscriptionService.getEntitlements(orgId);
        if (res.data) {
          setCanViewContact(res.data.canViewCandidateContact);
        }
      }
    };
    checkEntitlement();
  }, []);

  if (!profile && !application) return null;

  const displayName = profile?.fullName || application?.applicantName || 'Candidate';
  const displayHeadline = profile?.headline || 'Professional Candidate';
  
  const displayEmail = canViewContact ? (profile?.email || application?.applicantEmail || 'Not provided') : 'Upgrade to view contact details';
  const displayPhone = canViewContact ? (profile?.phone || application?.applicantPhone || 'Not provided') : 'Upgrade to view contact details';
  const displayCounty = profile?.county || application?.applicantLocation || 'Montserrado';

  const handleDownloadCv = () => {
    if (profile?.cv?.fileDataUrl) {
      const link = document.createElement('a');
      link.href = profile.cv.fileDataUrl;
      link.download = profile.cv.fileName || 'Candidate_CV.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CV downloaded successfully.', 'success');
    } else if (profile?.cvFileName) {
      showToast(`Downloading verified resume: ${profile.cvFileName}`, 'info');
    } else {
      showToast('CV document not provided or restricted by candidate privacy settings.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#132A13]/60 backdrop-blur-xs flex items-center justify-end z-50 overflow-hidden">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-[#E8E4D9] overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 bg-[#ECF3E9] border-b border-[#D9E3D5] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#283618] text-white flex items-center justify-center font-bold text-base shadow-xs">
              {displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-serif font-bold text-[#132A13]">{displayName}</h3>
                <span className="px-2.5 py-0.5 bg-[#FEFAE0] text-[#BC6C25] text-[10px] font-bold rounded-md uppercase">
                  Verified Candidate
                </span>
              </div>
              <p className="text-xs text-[#606C38] mt-0.5">{displayHeadline}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#283618] border border-[#D9E3D5] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Profile Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-[#2D2D2D]">
          {/* Quick Contact & Location Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#4F772D] shrink-0" />
              <div>
                <div className="text-[10px] text-[#A3B18A] uppercase font-bold">Location</div>
                <div className="font-semibold text-[#283618]">{displayCounty} County</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4F772D] shrink-0" />
              <div>
                <div className="text-[10px] text-[#A3B18A] uppercase font-bold">Email</div>
                <div className="font-semibold text-[#283618] truncate max-w-[140px]">{displayEmail}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#4F772D] shrink-0" />
              <div>
                <div className="text-[10px] text-[#A3B18A] uppercase font-bold">Phone</div>
                <div className="font-semibold text-[#283618]">{displayPhone}</div>
              </div>
            </div>
          </div>

          {/* Bio / Summary */}
          {profile?.bio && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2">Executive Summary</h4>
              <p className="text-xs sm:text-sm text-[#2D2D2D] leading-relaxed bg-[#F9F8F4] p-4 rounded-2xl border border-[#E8E4D9]">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Curriculum Vitae (CV) Section */}
          {(profile?.cv || profile?.cvFileName) && (
            <div className="p-4 bg-[#ECF3E9] rounded-2xl border border-[#D9E3D5] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-[#4F772D]" />
                <div>
                  <div className="font-bold text-xs text-[#132A13]">{profile.cv?.fileName || profile.cvFileName}</div>
                  <div className="text-[11px] text-[#606C38]">Verified PDF / Document attached</div>
                </div>
              </div>

              {!canViewContact ? (
                <button
                  disabled
                  className="px-4 py-2 bg-[#D9E3D5] text-stone-500 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pro Plan Required</span>
                </button>
              ) : (
                <button
                  onClick={handleDownloadCv}
                  className="px-4 py-2 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CV</span>
                </button>
              )}
            </div>
          )}

          {/* Work Experience */}
          {profile?.experience && profile.experience.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-3 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Work Experience History</span>
              </h4>
              <div className="space-y-3">
                {profile.experience.map((exp, idx) => (
                  <div key={exp.id || `exp-${idx}`} className="p-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs sm:text-sm text-[#132A13]">{exp.jobTitle}</h5>
                      <span className="text-[10px] text-[#A3B18A] font-medium">
                        {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                      </span>
                    </div>
                    <div className="text-xs text-[#4F772D] font-semibold">{exp.companyName} • {exp.county}</div>
                    {exp.description && <p className="text-xs text-[#606C38] leading-relaxed pt-1">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile?.education && profile.education.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-3 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Education & Qualifications</span>
              </h4>
              <div className="space-y-3">
                {profile.education.map((edu, idx) => (
                  <div key={edu.id || `edu-${idx}`} className="p-3.5 bg-[#F9F8F6] rounded-2xl border border-[#E8E4D9]">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-[#132A13]">{edu.degree}</div>
                      <span className="text-[10px] text-[#A3B18A]">{edu.startYear} - {edu.endYear || 'Present'}</span>
                    </div>
                    <div className="text-xs text-[#606C38]">{edu.fieldOfStudy} • {edu.institution}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {profile?.skills && profile.skills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Competencies & Skills</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => {
                  const name = typeof skill === 'string' ? skill : skill.name;
                  const level = typeof skill === 'string' ? 4 : skill.level;
                  const skillKey = typeof skill === 'string' ? skill : (skill.id || skill.name || `sk-${idx}`);
                  return (
                    <span
                      key={skillKey}
                      className="px-3 py-1 bg-[#ECF3E9] text-[#283618] rounded-xl border border-[#D9E3D5] text-xs font-medium flex items-center gap-1.5"
                    >
                      <span>{name}</span>
                      <span className="text-[10px] text-[#4F772D] font-bold">★ {level}/5</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Languages */}
          {profile?.languages && profile.languages.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Languages</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {profile.languages.map((l, idx) => (
                  <div key={l.id || l.language || `lang-${idx}`} className="p-2.5 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs">
                    <div className="font-bold text-[#132A13]">{l.language}</div>
                    <div className="text-[10px] text-[#606C38] capitalize">{l.proficiency}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio */}
          {profile?.portfolio && profile.portfolio.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A3B18A] mb-2 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Portfolio & Public Works</span>
              </h4>
              <div className="space-y-2">
                {profile.portfolio.map((p, idx) => (
                  <div key={p.id || `port-${idx}`} className="p-3 bg-[#F9F8F6] rounded-xl border border-[#E8E4D9] text-xs">
                    <div className="font-bold text-[#132A13]">{p.title}</div>
                    <p className="text-[#606C38] mt-1">{p.description}</p>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4F772D] font-semibold underline text-[11px] mt-1 inline-block"
                      >
                        View Project Link →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-[#E8E4D9] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#283618] text-white rounded-full text-xs font-bold cursor-pointer"
          >
            Close Candidate Profile
          </button>
        </div>
      </div>
    </div>
  );
};
