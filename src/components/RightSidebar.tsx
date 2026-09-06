import React from 'react';
import { ShieldCheck, ArrowRight, Sparkles, Building, Briefcase, FileCheck, Check } from 'lucide-react';

interface RightSidebarProps {
  onOpenVerification: () => void;
  onOpenAiCopilot: () => void;
  onOpenBilling?: () => void;
  userRole?: string;
  activeCountiesCount?: number;
  openTendersCount?: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  onOpenVerification,
  onOpenAiCopilot,
  onOpenBilling,
  userRole,
  activeCountiesCount = 15,
  openTendersCount = 84
}) => {
  return (
    <aside className="flex flex-col gap-6 w-full">
      {/* Verification Hub Card (Dark Forest Green Container) */}
      <div className="bg-[#283618] p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#4F772D] opacity-20 rounded-full blur-2xl"></div>
        
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-[#A3B18A]" />
          <h3 className="text-lg font-bold text-white">Verification Hub</h3>
        </div>
        
        <p className="text-xs text-[#A3B18A] leading-relaxed mb-4">
          Build authentic trust across Liberia. Get your business, NGO, or recruitment agency verified through the official audit process.
        </p>

        <div className="space-y-2.5">
          <div className="flex items-center gap-3 bg-[#132A13] p-3 rounded-2xl border border-white/10">
            <div className="w-6 h-6 bg-[#4F772D] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Registered Enterprise</div>
              <div className="text-[10px] text-[#A3B18A]">Liberia Business Registry (LBR) & TIN audit</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#132A13] p-3 rounded-2xl border border-white/10">
            <div className="w-6 h-6 bg-[#BC6C25] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Accredited NGO</div>
              <div className="text-[10px] text-[#A3B18A]">Ministry of Foreign Affairs clearance</div>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenVerification}
          className="w-full mt-5 bg-white hover:bg-[#F9F8F6] text-[#283618] py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <span>Audit & Verification Desk</span>
          <ArrowRight className="w-4 h-4 text-[#4F772D]" />
        </button>
      </div>

      {/* Platform Statistics Card */}
      <div className="bg-white p-6 rounded-[32px] border border-[#E8E4D9] flex flex-col shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#132A13] text-base">Platform Pulse</h3>
          <span className="text-[10px] bg-[#ECF3E9] text-[#4F772D] px-2 py-0.5 rounded-full font-bold uppercase">
            Liberia Nationwide
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#F9F8F4] p-3.5 rounded-2xl border border-[#E8E4D9]">
            <div className="text-xl font-bold text-[#283618]">1,240+</div>
            <div className="text-[9px] uppercase font-bold text-[#A3B18A] tracking-wider mt-0.5">
              Verified Candidates
            </div>
          </div>
          <div className="bg-[#F9F8F4] p-3.5 rounded-2xl border border-[#E8E4D9]">
            <div className="text-xl font-bold text-[#283618]">{openTendersCount}</div>
            <div className="text-[9px] uppercase font-bold text-[#A3B18A] tracking-wider mt-0.5">
              Open Tenders & RFPs
            </div>
          </div>
          <div className="bg-[#F9F8F4] p-3.5 rounded-2xl border border-[#E8E4D9]">
            <div className="text-xl font-bold text-[#283618]">$4.2M</div>
            <div className="text-[9px] uppercase font-bold text-[#A3B18A] tracking-wider mt-0.5">
              M&A Asset Value
            </div>
          </div>
          <div className="bg-[#F9F8F4] p-3.5 rounded-2xl border border-[#E8E4D9]">
            <div className="text-xl font-bold text-[#283618]">{activeCountiesCount} / 15</div>
            <div className="text-[9px] uppercase font-bold text-[#A3B18A] tracking-wider mt-0.5">
              Counties Active
            </div>
          </div>
        </div>

        {/* Live notification ticker in Natural Tones cream/ochre */}
        <div className="p-3.5 bg-[#FEFAE0] rounded-2xl flex items-center gap-3 border border-[#E8E4D9]/60">
          <div className="w-2.5 h-2.5 bg-[#BC6C25] rounded-full animate-pulse shrink-0"></div>
          <span className="text-xs text-[#606C38] font-medium leading-tight">
            Live: New MPW road maintenance contract published in Nimba County
          </span>
        </div>

        {/* AI Copilot Teaser in Natural Tones style */}
        <div className="mt-4 pt-4 border-t border-[#E8E4D9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ECF3E9] flex items-center justify-center text-[#4F772D]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#132A13]">AI Opportunity Copilot</div>
              <div className="text-[10px] text-[#606C38]">CV matching & anti-scam shield</div>
            </div>
          </div>
          <button
            onClick={onOpenAiCopilot}
            className="text-xs font-bold text-[#BC6C25] hover:text-[#283618] px-2 py-1 rounded-lg hover:bg-[#FEFAE0] transition-colors"
          >
            Launch →
          </button>
        </div>

        {/* Subscription & Billing Teaser */}
        {(userRole === 'recruiter' || userRole === 'employer') && onOpenBilling && (
          <div className="mt-4 pt-4 border-t border-[#E8E4D9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEFAE0] flex items-center justify-center text-[#BC6C25]">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#132A13]">Subscription & Billing</div>
                <div className="text-[10px] text-[#606C38]">Manage plans & payments</div>
              </div>
            </div>
            <button
              onClick={onOpenBilling}
              className="text-xs font-bold text-[#4F772D] hover:text-[#283618] px-2 py-1 rounded-lg hover:bg-[#ECF3E9] transition-colors"
            >
              Manage →
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
