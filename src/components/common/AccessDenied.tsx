import React from 'react';
import { ShieldAlert, ArrowLeft, Building2, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../routes/router';

export interface AccessDeniedProps {
  workspaceName?: string;
  title?: string;
  reason?: string;
  actionHint?: string;
  onReturnToBrowse?: () => void;
  onOpenAuthModal?: () => void;
  onOpenOrgModal?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  workspaceName = 'Workspace',
  title = 'Authorization Required',
  reason = "You don't have permission to access this workspace.",
  actionHint,
  onReturnToBrowse,
  onOpenAuthModal,
  onOpenOrgModal
}) => {
  const { user, isAuthenticated, activeOrganization } = useAuth();
  const { navigate } = useRouter();

  const handleBack = () => {
    if (onReturnToBrowse) {
      onReturnToBrowse();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 sm:p-12 bg-white rounded-3xl border border-[#E8E4D9] shadow-xs text-center space-y-6">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-2xl bg-[#BC6C25]/10 border border-[#BC6C25]/20 flex items-center justify-center mx-auto text-[#BC6C25]">
        <ShieldAlert className="w-8 h-8" />
      </div>

      {/* Header & Status */}
      <div className="space-y-2">
        <span className="inline-block px-3 py-1 bg-[#F9F8F4] border border-[#E8E4D9] rounded-full text-[11px] font-bold text-[#606C38] uppercase tracking-wider">
          {workspaceName} Security Boundary
        </span>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#132A13]">
          {title}
        </h2>
        <p className="text-base font-medium text-[#8C2F1B]">
          {reason}
        </p>
      </div>

      {/* Action Guidance */}
      <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E8E4D9] text-left text-xs sm:text-sm text-[#606C38] space-y-2">
        <div className="font-bold text-[#283618] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#BC6C25]" />
          <span>Access Guidance</span>
        </div>
        <p className="leading-relaxed">
          {actionHint ||
            'This workspace requires an authenticated user account with active organization membership or official platform credentials. Modifying resources or accessing talent pipelines requires verified authorization.'}
        </p>
        {activeOrganization && (
          <div className="pt-2 border-t border-[#E8E4D9] flex items-center gap-2 text-xs text-[#283618]">
            <Building2 className="w-3.5 h-3.5 text-[#606C38]" />
            <span>
              Current Active Workspace: <strong>{activeOrganization.name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Resolution Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {!isAuthenticated && onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#283618] hover:bg-[#132A13] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Your Account</span>
          </button>
        )}

        {isAuthenticated && onOpenOrgModal && (
          <button
            onClick={onOpenOrgModal}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#4F772D] hover:bg-[#283618] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Register or Link Organization</span>
          </button>
        )}

        <button
          onClick={handleBack}
          className="w-full sm:w-auto px-6 py-2.5 border border-[#E8E4D9] hover:bg-[#F9F8F4] text-[#283618] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Opportunity Marketplace</span>
        </button>
      </div>

      {/* Security Statement */}
      <div className="text-[11px] text-[#A3B18A] pt-4">
        OpportunityHub Liberia enforces statutory role-based security in accordance with the Decent Work Act and LBR regulations.
      </div>
    </div>
  );
};
