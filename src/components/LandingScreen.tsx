import React from 'react';
import { UserRole } from '../types';
import { Briefcase, Building2, ShieldCheck, ArrowRight, Sparkles, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

interface LandingScreenProps {
  onEnterPortal: (selectedRole?: UserRole) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onEnterPortal }) => {
  const roleGroups = [
    {
      id: 'sell',
      title: 'Sell (Business M&A)',
      roleKey: 'business_seller' as UserRole,
      desc: 'List businesses, confidential M&A portfolios, and commercial assets for verified buyers.',
      icon: Building2,
      badge: 'Seller',
      color: 'bg-[#BC6C25]/10 text-[#BC6C25] border-[#BC6C25]/30'
    },
    {
      id: 'recruiter',
      title: 'Recruiter & Employer',
      roleKey: 'recruiter' as UserRole,
      desc: 'Post career opportunities, source vetted Liberian talent, and manage recruitment workflows.',
      icon: Briefcase,
      badge: 'Recruiter',
      color: 'bg-[#4F772D]/10 text-[#4F772D] border-[#4F772D]/30'
    },
    {
      id: 'buyer',
      title: 'Buyer & Investor',
      roleKey: 'buyer' as UserRole,
      desc: 'Browse verified business listings, request secure NDA access, and execute investments.',
      icon: TrendingUp,
      badge: 'Buyer',
      color: 'bg-[#9A551A]/10 text-[#9A551A] border-[#9A551A]/30'
    },
    {
      id: 'platform_admin',
      title: 'Platform Administrator',
      roleKey: 'platform_admin' as UserRole,
      desc: 'Full governance, user role assignments, audit log trails, and regulatory verification oversight.',
      icon: ShieldCheck,
      badge: 'SuperAdmin',
      color: 'bg-[#132A13]/10 text-[#132A13] border-[#132A13]/30'
    },
    {
      id: 'rest',
      title: 'Rest (Talent, Services & Verification)',
      roleKey: 'job_seeker' as UserRole,
      desc: 'Job seekers, professional service contractors, organization admins, and verification officers.',
      icon: Users,
      badge: 'General',
      color: 'bg-[#606C38]/10 text-[#606C38] border-[#606C38]/30'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#283618] flex flex-col selection:bg-[#4F772D] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#E8E4D9] sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#283618] flex items-center justify-center text-white font-serif font-bold text-xl shadow-md">
              L
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-[#132A13] tracking-tight block">
                Liberia Economic & Career Portal
              </span>
              <span className="text-[11px] text-[#606C38] font-medium block">
                Official Ministry of Labour & LBR Verified Gateway
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onEnterPortal('job_seeker')}
              className="px-5 py-2.5 bg-[#283618] hover:bg-[#386641] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Enter Main App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 px-6 bg-gradient-to-b from-[#FEFAE0]/60 to-[#FDFBF7] border-b border-[#E8E4D9]">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECF3E9] border border-[#D9E3D5] text-[#283618] text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#4F772D]" />
            <span>Republic of Liberia • Verified Enterprise & Labour Hub</span>
          </div>
          <h1 className="font-serif font-bold text-4xl md:text-6xl text-[#132A13] tracking-tight leading-tight">
            Connecting Talent, Enterprise, and Investment Across Liberia
          </h1>
          <p className="text-base md:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed font-sans">
            Welcome to the official economic marketplace. Choose your operational role below to enter the portal, or explore verified business listings and professional career opportunities.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => onEnterPortal('job_seeker')}
              className="px-6 py-3 bg-[#283618] hover:bg-[#386641] text-white rounded-2xl text-sm font-bold shadow-lg transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <span>Explore Marketplace & Careers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEnterPortal('platform_admin')}
              className="px-6 py-3 bg-white hover:bg-[#F9F8F6] text-[#283618] border border-[#E8E4D9] rounded-2xl text-sm font-bold shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#4F772D]" />
              <span>Platform Admin Gateway</span>
            </button>
          </div>
        </div>
      </section>

      {/* Role Selection Gateway */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full space-y-8 flex-1">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#606C38] uppercase tracking-wider">Role Selection Gateway</span>
          <h2 className="font-serif font-bold text-3xl text-[#132A13]">Select Your Portal Access Role</h2>
          <p className="text-sm text-stone-500">Choose how you wish to enter the platform:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roleGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.id}
                onClick={() => onEnterPortal(group.roleKey)}
                className="bg-white rounded-3xl p-6 border border-[#E8E4D9] hover:border-[#4F772D] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-[#F9F8F6] rounded-bl-full pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#ECF3E9] border border-[#D9E3D5] flex items-center justify-center text-[#4F772D] group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${group.color}`}>
                      {group.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#132A13] group-hover:text-[#4F772D] transition-colors">
                      {group.title}
                    </h3>
                    <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                      {group.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E8E4D9] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#283618] group-hover:text-[#4F772D] flex items-center gap-1.5 transition-colors">
                    <span>Enter as {group.badge}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-[#D9E3D5] group-hover:text-[#4F772D] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E8E4D9] py-8 px-6 text-center text-xs text-stone-500 space-y-2">
        <p>© 2026 Republic of Liberia Economic Portal. All rights reserved.</p>
        <p className="text-stone-400">Powered by Ministry of Labour & Liberia Business Registry (LBR) Compliance Standards.</p>
      </footer>
    </div>
  );
};
