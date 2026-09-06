import React from 'react';
import { ShieldCheck, MapPin } from 'lucide-react';

interface FooterProps {
  onOpenSafetyModal: () => void;
  onOpenVerification: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSafetyModal, onOpenVerification }) => {
  return (
    <footer className="bg-[#F2F2EC] border-t border-[#E8E4D9] px-4 sm:px-10 py-3 sm:py-0 sm:h-14 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-[11px] font-bold text-[#A3B18A] uppercase tracking-wider shrink-0 mt-auto">
      <div className="text-center sm:text-left">
        © 2026 OPPORTUNITY<span className="text-[#4F772D]">HUB</span> LIBERIA • ALL 15 COUNTIES
      </div>

      <div className="flex items-center gap-4 sm:gap-6 text-xs normal-case tracking-normal">
        <button
          onClick={onOpenSafetyModal}
          className="text-[#606C38] hover:text-[#283618] transition-colors"
        >
          Safety & Anti-Scam Policy
        </button>
        <button
          onClick={onOpenVerification}
          className="text-[#606C38] hover:text-[#283618] transition-colors"
        >
          LBR Verification Standards
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[#283618] font-semibold">
        <div className="w-2 h-2 bg-[#4F772D] rounded-full animate-pulse"></div>
        <span>SYSTEM OPERATIONAL (PORT 3000)</span>
      </div>
    </footer>
  );
};
