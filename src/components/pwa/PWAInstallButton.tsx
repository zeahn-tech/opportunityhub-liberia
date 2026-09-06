import React, { useState } from 'react';
import { usePWAInstall } from '../../pwa/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Android / Chrome desktop installable flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-700 active:scale-95 transition-all cursor-pointer ${className}`}
      >
        <Download className="h-4 w-4" />
        <span>Install OppHub App</span>
      </button>
    );
  }

  // iOS Safari specific guide
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-200 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-800 active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <Download className="h-4 w-4 text-orange-600" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div 
            id="ios-install-guide"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowIOSGuide(false)}
          >
            <div 
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-950 p-6 shadow-2xl animate-slide-up border border-stone-100 dark:border-stone-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-white">Install OpportunityHub</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Add OppHub to your iPhone / iPad home screen</p>
                </div>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600 shrink-0">
                    <Share className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">1. Tap the Share icon</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Located in the Safari browser toolbar at the bottom.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600 shrink-0">
                    <PlusSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">2. Select "Add to Home Screen"</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Scroll down the share sheet options to find this action.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-stone-900 dark:bg-stone-100 py-3 text-sm font-semibold text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-all cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
