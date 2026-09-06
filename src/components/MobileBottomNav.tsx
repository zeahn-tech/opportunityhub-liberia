import React, { useState } from 'react';
import { 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  UserCheck, 
  MessageSquare, 
  MoreHorizontal, 
  X, 
  Zap, 
  CreditCard 
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { PWAInstallButton } from './pwa/PWAInstallButton';

interface MobileBottomNavProps {
  activeTab: 'opportunities' | 'businesses' | 'verification' | 'recruiter' | 'candidate' | 'ai-studio' | 'billing' | 'messages' | 'admin';
  setActiveTab: (tab: 'opportunities' | 'businesses' | 'verification' | 'recruiter' | 'candidate' | 'ai-studio' | 'billing' | 'messages' | 'admin') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { isLowBandwidthMode, toggleLowBandwidthMode } = useConfig();

  // Primary 4 tabs shown directly in the bottom bar
  const primaryItems = [
    { id: 'opportunities', label: 'Discover', icon: Briefcase },
    { id: 'candidate', label: 'My Career', icon: UserCheck },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'businesses', label: 'M&A', icon: Building2 },
  ] as const;

  // Secondary items shown in the "More" slide-up panel
  const secondaryItems = [
    { id: 'ai-studio', label: 'AI Copilot Studio', icon: Sparkles, color: 'text-orange-600' },
    { id: 'recruiter', label: 'Recruiter Workspace', icon: Users, color: 'text-[#4F772D]' },
    { id: 'verification', label: 'Verification Hub', icon: ShieldCheck, color: 'text-blue-600' },
    { id: 'billing', label: 'SaaS Subscriptions', icon: CreditCard, color: 'text-purple-600' },
    { id: 'admin', label: 'Trust & Safety Center', icon: ShieldCheck, color: 'text-red-600' },
  ] as const;

  const handleTabSelect = (tab: 'opportunities' | 'businesses' | 'verification' | 'recruiter' | 'candidate' | 'ai-studio' | 'billing' | 'messages' | 'admin') => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  const isPrimaryActive = primaryItems.some(item => item.id === activeTab);

  return (
    <>
      {/* Primary Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-stone-950 border-t border-[#E8E4D9] dark:border-stone-900 px-3 py-2 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
        <div className="flex w-full items-center justify-around">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all min-w-[64px] min-h-[48px] cursor-pointer ${
                  isActive 
                    ? 'text-[#283618] dark:text-stone-100 font-bold' 
                    : 'text-[#606C38] dark:text-stone-400 hover:text-[#283618]'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#ECF3E9] dark:bg-emerald-950/40 text-[#283618] dark:text-emerald-400' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              </button>
            );
          })}

          {/* "More" Trigger Tab */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all min-w-[64px] min-h-[48px] cursor-pointer ${
              !isPrimaryActive 
                ? 'text-[#283618] dark:text-stone-100 font-bold' 
                : 'text-[#606C38] dark:text-stone-400 hover:text-[#283618]'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${!isPrimaryActive ? 'bg-[#ECF3E9] dark:bg-emerald-950/40 text-[#283618] dark:text-emerald-400' : ''}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">More</span>
          </button>
        </div>
      </div>

      {/* "More" Bottom Sheet/Drawer overlay */}
      {showMoreMenu && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-stone-950 rounded-t-3xl p-6 shadow-2xl border-t border-stone-200 dark:border-stone-900 animate-slide-up select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-900">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">Workspace Services</h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">OpportunityHub Liberia Services Menu</p>
              </div>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full bg-stone-100 dark:bg-stone-900 text-stone-500 hover:text-stone-700 dark:text-stone-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Links Grid */}
            <div className="grid grid-cols-1 gap-2.5 py-5">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id)}
                    className={`flex items-center gap-3.5 w-full p-3 rounded-xl text-left transition-all min-h-[48px] cursor-pointer ${
                      isActive 
                        ? 'bg-[#ECF3E9] dark:bg-emerald-950/30 text-[#283618] dark:text-emerald-400 font-semibold' 
                        : 'hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-stone-50 dark:bg-stone-900 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Performance Optimizer & Low-Bandwidth Mode */}
            <div className="border-t border-stone-100 dark:border-stone-900 pt-4 pb-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/40 dark:border-orange-900/20">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-orange-100/50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 mt-0.5 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Low-Bandwidth Mode</p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">Optimizes performance, disables heavy layouts, saves cellular data.</p>
                  </div>
                </div>
                <button
                  onClick={toggleLowBandwidthMode}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isLowBandwidthMode ? 'bg-orange-600' : 'bg-stone-200 dark:bg-stone-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isLowBandwidthMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* PWA Direct Installation Banner */}
            <div className="pt-3 pb-2">
              <PWAInstallButton className="w-full py-3 justify-center text-sm" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
