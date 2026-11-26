import React, { useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { TranslationDictionary } from '../i18n/translations';

interface PWAInstallButtonProps {
  t: TranslationDictionary;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ t, compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
        <Smartphone className="w-4 h-4 shrink-0" />
        <span>{t.settings.pwaInstalled}</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{t.common.installApp}</span>
      </button>
    );
  }

  if (isIOS || !compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Share className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>{t.common.installApp}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 pb-safe shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.common.installIosTitle}
              </h3>
              <div className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>{t.common.installIosStep1}</p>
                <p>{t.common.installIosStep2}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
