import React, { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Cloud, CloudOff, Download, LogIn, LogOut, RefreshCw, RotateCcw, Upload } from 'lucide-react';
import { NumericInput } from '../components/NumericInput';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { exportBackupPayload, validateAndMigrateBackup } from '../db/indexedDb';
import { roundMoney } from '../engine/decimal';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateTime } from '../services/currencyService';
import { AppSettings, BackupPayload, LocaleCode, ThemeMode } from '../types/models';

interface SettingsScreenProps {
  settings: AppSettings;
  isSyncingRate: boolean;
  rateSyncMessage: string | null;
  authUser: User | null;
  isSigningIn: boolean;
  cloudSyncState: 'idle' | 'syncing' | 'synced' | 'error';
  cloudError: string | null;
  t: TranslationDictionary;
  onUpdateSettings: (next: AppSettings) => void;
  onSyncNbuRate: () => void;
  onImportBackup: (payload: BackupPayload) => Promise<void>;
  onResetSampleData: () => Promise<void>;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  onRefreshCloud: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  isSyncingRate,
  rateSyncMessage,
  authUser,
  isSigningIn,
  cloudSyncState,
  cloudError,
  t,
  onUpdateSettings,
  onSyncNbuRate,
  onImportBackup,
  onResetSampleData,
  onSignInGoogle,
  onSignOutGoogle,
  onRefreshCloud,
}) => {
  const [manualRateInput, setManualRateInput] = useState(
    settings.currentExchangeRate.rate
  );
  const [backupStatus, setBackupStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(
    null
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyManualRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = roundMoney(manualRateInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onUpdateSettings({
      ...settings,
      currentExchangeRate: {
        rate: parsed,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const handleExportBackup = async () => {
    const payload = await exportBackupPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `autopaint-calc-backup-${dateTag}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validation = validateAndMigrateBackup(text);
      if (!validation.valid || !validation.payload) {
        setBackupStatus({
          type: 'err',
          msg: `${t.settings.importError} (${validation.error ?? 'UNKNOWN'})`,
        });
        return;
      }
      await onImportBackup(validation.payload);
      setBackupStatus({ type: 'ok', msg: t.settings.importSuccess });
      setManualRateInput(validation.payload.settings.currentExchangeRate.rate);
    } catch {
      setBackupStatus({ type: 'err', msg: t.settings.importError });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.settings.title}</h1>

      {/* Cloud Cross-Device Sync */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                authUser
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
              }`}
            >
              {authUser ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.cloud.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {authUser
                  ? `${t.cloud.signedInAs}: ${authUser.email ?? authUser.uid} · ${
                      cloudSyncState === 'syncing'
                        ? t.cloud.syncing
                        : cloudSyncState === 'error'
                        ? t.cloud.syncError
                        : t.cloud.syncActive
                    }`
                  : t.cloud.syncDesc}
              </p>
            </div>
          </div>

          {!authUser ? (
            <button
              type="button"
              onClick={onSignInGoogle}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSigningIn ? t.cloud.signingIn : t.cloud.signInGoogle}</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRefreshCloud}
                disabled={cloudSyncState === 'syncing'}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-4 h-4 ${cloudSyncState === 'syncing' ? 'animate-spin' : ''}`}
                />
                <span>{t.cloud.refreshCloud}</span>
              </button>
              <button
                type="button"
                onClick={onSignOutGoogle}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.cloud.signOut}</span>
              </button>
            </div>
          )}
        </div>
        {cloudError && (
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium break-words">
            {cloudError}
          </div>
        )}
      </section>

      {/* Workshop Profile */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t.settings.workshopSection}
          </h2>
          <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
            {t.settings.workshopIdLabel}: {settings.workshopId}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.settings.workshopName}
            </label>
            <input
              type="text"
              value={settings.workshopName}
              onChange={(e) => onUpdateSettings({ ...settings, workshopName: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.settings.workshopPhone}
            </label>
            <input
              type="tel"
              value={settings.workshopPhone ?? ''}
              onChange={(e) => onUpdateSettings({ ...settings, workshopPhone: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            {t.settings.workshopAddress}
          </label>
          <input
            type="text"
            value={settings.workshopAddress ?? ''}
            onChange={(e) => onUpdateSettings({ ...settings, workshopAddress: e.target.value })}
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
          />
        </div>
      </section>

      {/* Appearance & Language */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {t.settings.appearanceSection}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t.settings.language}
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['uk', 'ru'] as LocaleCode[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, locale: loc })}
                  className={`min-h-[40px] rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    settings.locale === loc
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {loc === 'uk' ? 'Українська' : 'Русский'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t.settings.theme}
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(
                [
                  ['light', t.settings.themeLight],
                  ['dark', t.settings.themeDark],
                  ['system', t.settings.themeSystem],
                ] as [ThemeMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, theme: mode })}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    settings.theme === mode
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Currency Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t.settings.currencySection}
          </h2>
          <button
            type="button"
            onClick={onSyncNbuRate}
            disabled={isSyncingRate}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRate ? 'animate-spin' : ''}`} />
            <span>{isSyncingRate ? t.dashboard.fetchingNbu : t.dashboard.fetchNbu}</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t.estimate.appliedRate}:{' '}
          <span className="font-mono-num font-bold text-slate-900 dark:text-white">
            1 USD = {settings.currentExchangeRate.rate.toFixed(2)} UAH
          </span>{' '}
          · {formatDateTime(settings.currentExchangeRate.updatedAt, settings.locale)}
        </div>
        {rateSyncMessage && (
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            {rateSyncMessage}
          </div>
        )}

        <form onSubmit={handleApplyManualRate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.settings.manualRateLabel}
            </label>
            <NumericInput
              min={1}
              fallbackValue={settings.currentExchangeRate.rate}
              value={manualRateInput}
              onValueChange={setManualRateInput}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold hover:opacity-90 cursor-pointer"
          >
            {t.settings.applyManualRate}
          </button>
        </form>
      </section>

      {/* PWA Install Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t.settings.pwaSection}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            iPhone / Safari / Offline IndexedDB
          </p>
        </div>
        <PWAInstallButton t={t} />
      </section>

      {/* Backup & Reset */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {t.settings.backupSection}
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.settings.exportJson}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{t.settings.importJson}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.settings.resetSample}</span>
          </button>
        </div>

        {backupStatus && (
          <div
            className={`text-sm font-medium ${
              backupStatus.type === 'ok'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {backupStatus.msg}
          </div>
        )}
      </section>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 pb-safe shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.settings.resetConfirmTitle}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">
              {t.settings.resetConfirmDesc}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onResetSampleData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
