import React, { useState } from 'react';
import { DownloadCloud, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="ui-btn-soft min-h-[38px] md:min-h-[40px] px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <DownloadCloud className="w-4 h-4 ui-accent-text" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="ui-btn-soft min-h-[38px] md:min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Share className="w-3.5 h-3.5 ui-accent-text" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Install Invoqor on iOS"
          >
            <div
              className="ui-modal-surface w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-base font-semibold ui-text-primary">
                  Install Invoqor on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="ui-btn-soft min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs ui-text-secondary leading-relaxed">
                1. Tap the <strong className="ui-text-primary">Share</strong> button in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong className="ui-text-primary">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors cursor-pointer"
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
