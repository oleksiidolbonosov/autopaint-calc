import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { TranslationDictionary } from '../i18n/translations';

interface OfflineIndicatorProps {
  t: TranslationDictionary;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ t }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{t.common.offlineBanner}</span>
    </div>
  );
};
