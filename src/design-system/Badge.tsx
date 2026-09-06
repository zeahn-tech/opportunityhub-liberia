import React, { ReactNode } from 'react';
import { CheckCircle2, ShieldCheck, Building2, Landmark, Briefcase } from 'lucide-react';
import { VerificationBadge } from '../types';

export interface BadgeProps {
  children?: ReactNode;
  variant?: 'olive' | 'sage' | 'ochre' | 'sand' | 'neutral';
  verificationBadge?: VerificationBadge;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'olive',
  verificationBadge,
  size = 'md',
  className = ''
}) => {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  if (verificationBadge) {
    let badgeText = 'Verified';
    let icon = <CheckCircle2 className="w-3 h-3 text-[#4F772D]" />;
    let style = 'bg-[#ECF3E9] text-[#283618] border-[#D5E4CF]';

    switch (verificationBadge) {
      case 'verified_government':
        badgeText = 'GOL Verified Ministry';
        icon = <Landmark className="w-3 h-3 text-[#132A13]" />;
        style = 'bg-[#E3EBDD] text-[#132A13] border-[#CBD8C4] font-semibold';
        break;
      case 'verified_ngo':
        badgeText = 'Accredited NGO';
        icon = <ShieldCheck className="w-3 h-3 text-[#4F772D]" />;
        style = 'bg-[#ECF3E9] text-[#283618] border-[#D5E4CF]';
        break;
      case 'verified_company':
        badgeText = 'LBR Verified Enterprise';
        icon = <Building2 className="w-3 h-3 text-[#606C38]" />;
        style = 'bg-[#F3EFE6] text-[#283618] border-[#E8E4D9]';
        break;
      case 'verified_recruiter':
        badgeText = 'Certified Recruiter';
        icon = <Briefcase className="w-3 h-3 text-[#BC6C25]" />;
        style = 'bg-[#FCF5ED] text-[#A35919] border-[#F2DFCD]';
        break;
      case 'verified_business':
        badgeText = 'Verified Asset';
        icon = <CheckCircle2 className="w-3 h-3 text-[#4F772D]" />;
        style = 'bg-[#ECF3E9] text-[#283618] border-[#D5E4CF]';
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border ${style} ${sizeStyles} font-medium ${className}`}
      >
        {icon}
        <span>{children || badgeText}</span>
      </span>
    );
  }

  let colorStyle = 'bg-[#ECF3E9] text-[#283618] border-[#D5E4CF]';
  if (variant === 'sage') {
    colorStyle = 'bg-[#F2F4EB] text-[#606C38] border-[#DFE4D3]';
  } else if (variant === 'ochre') {
    colorStyle = 'bg-[#FCF5ED] text-[#BC6C25] border-[#F2DFCD]';
  } else if (variant === 'sand') {
    colorStyle = 'bg-[#F3EFE6] text-[#283618] border-[#E8E4D9]';
  } else if (variant === 'neutral') {
    colorStyle = 'bg-white text-[#2D2D2D] border-[#E8E4D9]';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${colorStyle} ${sizeStyles} font-medium whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
};
