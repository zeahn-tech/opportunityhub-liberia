import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useConfig();

  if (isOnline) return null;

  return (
    <div className="bg-[#283618] text-[#F9F8F6] px-4 py-2 text-xs border-b border-[#4F772D] flex items-center justify-between shadow-xs animate-in slide-in-from-top-1">
      <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-center">
        <WifiOff className="w-3.5 h-3.5 text-[#BC6C25] shrink-0" />
        <span>
          <strong>Offline Mode Active:</strong> You are browsing cached opportunities. Changes will synchronize automatically when your connection is restored.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#E8E4D9] hover:underline"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    </div>
  );
};
