import React from 'react';
import { useOnlineStatus } from '../../pwa/useOnlineStatus';
import { WifiOff, AlertCircle } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      id="pwa-offline-indicator"
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-6 z-50 flex items-center gap-3 rounded-xl bg-amber-950/95 border border-amber-600/30 px-4 py-3 text-sm font-medium text-amber-100 shadow-xl backdrop-blur-md animate-fade-in max-w-sm"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
        <WifiOff className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-amber-200">Offline Mode Active</p>
        <p className="text-xs text-amber-300/80">Using cached offline-safe data. Clicks and submissions will sync once connection returns.</p>
      </div>
      <AlertCircle className="h-4 w-4 text-amber-400/60 shrink-0" />
    </div>
  );
};
