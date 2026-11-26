import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowRight,
  Bell,
  Calculator,
  Car,
  Cloud,
  CloudOff,
  FileText,
  Layers,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  Share2,
  Truck,
  Wrench,
} from 'lucide-react';
import { calculateDepositSummary, convertUahToUsd } from '../engine/calculations';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateShort, formatDateTime, formatUah, formatUsd } from '../services/currencyService';
import { shareEstimatePdfDocument } from '../services/pdfExportService';
import { DueOrderAlert } from '../services/reminderService';
import { AppSettings, Estimate, VehicleType } from '../types/models';

export type AppScreen =
  | 'dashboard'
  | 'new_estimate'
  | 'history'
  | 'materials'
  | 'labor'
  | 'settings';

interface DashboardScreenProps {
  settings: AppSettings;
  estimates: Estimate[];
  dueAlerts: DueOrderAlert[];
  isSyncingRate: boolean;
  rateSyncMessage: string | null;
  authUser: User | null;
  isSigningIn: boolean;
  cloudSyncState: 'idle' | 'syncing' | 'synced' | 'error';
  cloudError?: string | null;
  t: TranslationDictionary;
  onNavigate: (screen: AppScreen) => void;
  onNewEstimate: (vehicleType?: VehicleType) => void;
  onEditEstimate: (est: Estimate) => void;
  onViewCustomerEstimate: (est: Estimate) => void;
  onSyncNbuRate: () => void;
  onOpenReminderModal: () => void;
  onSignInGoogle: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  settings,
  estimates,
  dueAlerts,
  isSyncingRate,
  rateSyncMessage,
  authUser,
  isSigningIn,
  cloudSyncState,
  cloudError,
  t,
  onNavigate,
  onNewEstimate,
  onEditEstimate,
  onViewCustomerEstimate,
  onSyncNbuRate,
  onOpenReminderModal,
  onSignInGoogle,
}) => {
  const [sharingEstimateId, setSharingEstimateId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleQuickSharePdf = async (est: Estimate) => {
    setSharingEstimateId(est.id);
    setShareToast(null);
    try {
      const outcome = await shareEstimatePdfDocument(est, settings, t);
      if (outcome === 'downloaded_fallback') {
        setShareToast({ type: 'ok', text: t.customerEstimate.shareFallbackDownloaded });
      }
    } catch {
      setShareToast({ type: 'err', text: t.customerEstimate.pdfError });
    } finally {
      setSharingEstimateId(null);
    }
  };

  const totalVolumeUah = estimates.reduce((acc, est) => acc + est.totals.totalUah, 0);
  const avgTicketUah = estimates.length > 0 ? totalVolumeUah / estimates.length : 0;

  const rateSourceLabel =
    settings.currentExchangeRate.source === 'nbu'
      ? t.dashboard.sourceNbu
      : settings.currentExchangeRate.source === 'cached'
      ? t.dashboard.sourceCached
      : t.dashboard.sourceManual;

  return (
    <div className="space-y-6">
      {/* Clickable 2-Day Due Reminder Banner */}
      {dueAlerts.length > 0 && (
        <button
          type="button"
          onClick={onOpenReminderModal}
          className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-3 text-left hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100 truncate">
              {t.reminder.bannerText}{' '}
              <span className="font-mono-num font-bold">{dueAlerts.length}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap shrink-0">
            {t.reminder.viewOrders} →
          </span>
        </button>
      )}

      {/* Cross-Device Cloud Sync Prompt (when signed out) / Synced indicator */}
      {!authUser ? (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <CloudOff className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {t.cloud.syncOfflinePrompt}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {t.cloud.syncDesc}
              </div>
              {cloudError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1 break-words">
                  {cloudError}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onSignInGoogle}
            disabled={isSigningIn}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>{isSigningIn ? t.cloud.signingIn : t.cloud.signInGoogle}</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium min-w-0">
            <Cloud className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {cloudSyncState === 'syncing'
                ? t.cloud.syncing
                : cloudSyncState === 'error'
                ? t.cloud.syncError
                : t.cloud.ordersStoredInCloud}{' '}
              · {authUser.email}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.settings}
          </button>
        </div>
      )}

      {/* Primary Hero Action + Exchange Rate Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-slate-900 dark:bg-slate-800/90 text-white rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 border border-slate-800 dark:border-slate-700">
          <div>
            <div className="text-xs font-medium text-slate-300">
              {settings.workshopName}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-balance">
              {t.dashboard.subtitle}
            </h1>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNewEstimate('car')}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span>{t.dashboard.createEstimateCta}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>{t.nav.history}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['car', 'van', 'truck'] as VehicleType[]).map((vt) => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => onNewEstimate(vt)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {vt === 'car' ? (
                    <Car className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{t.vehicleTypes[vt]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* USD / UAH Rate Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.dashboard.exchangeRateTitle}
              </div>
              <div className="text-3xl font-bold font-mono-num text-slate-900 dark:text-white mt-1">
                {settings.currentExchangeRate.rate.toFixed(2)} ₴
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {rateSourceLabel} · {t.dashboard.updatedAt}{' '}
                {formatDateTime(settings.currentExchangeRate.updatedAt, settings.locale)}
              </div>
            </div>
            <button
              type="button"
              onClick={onSyncNbuRate}
              disabled={isSyncingRate}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRate ? 'animate-spin' : ''}`} />
              <span>{isSyncingRate ? t.dashboard.fetchingNbu : t.dashboard.fetchNbu}</span>
            </button>
          </div>

          {rateSyncMessage && (
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {rateSyncMessage}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">1 USD = {settings.currentExchangeRate.rate.toFixed(2)} UAH</span>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer min-h-[32px] px-1"
            >
              {t.dashboard.manualRate}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {t.dashboard.totalEstimates}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-num text-slate-900 dark:text-white mt-1">
            {estimates.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {t.dashboard.totalVolume}
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono-num text-slate-900 dark:text-white mt-1 truncate">
            {formatUah(totalVolumeUah, settings.locale)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {t.dashboard.avgTicket}
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono-num text-slate-900 dark:text-white mt-1 truncate">
            {formatUah(avgTicketUah, settings.locale)}
          </div>
        </div>
      </div>

      {/* Quick Links + Recent Estimates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t.dashboard.recentEstimates}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline min-h-[36px] px-2 cursor-pointer"
            >
              {t.dashboard.viewAll}
            </button>
          </div>

          {estimates.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t.history.emptyDesc}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {shareToast && (
                <div
                  className={`px-5 py-2.5 text-xs font-medium ${
                    shareToast.type === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {shareToast.text}
                </div>
              )}
              {estimates.slice(0, 5).map((est) => {
                const isFinalPhase = est.orderPhase === 'final';
                const depositSummary = calculateDepositSummary(est.totals.totalUah, est.deposit);
                const hasDeposit =
                  depositSummary.expectedUah > 0 || depositSummary.receivedUah > 0;
                return (
                <div
                  key={est.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onEditEstimate(est)}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {est.customerName || est.estimateNumber}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                          isFinalPhase
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isFinalPhase ? t.estimate.phaseFinal : t.estimate.phasePreliminary}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {t.vehicleTypes[est.vehicleType ?? 'car']} ·{' '}
                      {[est.vehicleMake, est.vehicleModel].filter(Boolean).join(' ') || '—'} ·{' '}
                      {est.selectedParts.length} {t.history.partsShort} ·{' '}
                      {est.dueDate
                        ? formatDateShort(est.dueDate, settings.locale)
                        : formatDateShort(est.createdAt, settings.locale)}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right mr-1">
                      <div className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                        {isFinalPhase
                          ? formatUah(est.totals.totalUah, settings.locale)
                          : formatUsd(
                              convertUahToUsd(est.totals.totalUah, est.exchangeRate.rate),
                              settings.locale
                            )}
                      </div>
                      <div className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                        {hasDeposit
                          ? `${t.estimate.depositQuickBtn}: ${
                              isFinalPhase
                                ? formatUah(depositSummary.receivedUah, settings.locale)
                                : formatUsd(
                                    convertUahToUsd(
                                      depositSummary.receivedUah,
                                      est.exchangeRate.rate
                                    ),
                                    settings.locale
                                  )
                            }`
                          : `${est.exchangeRate.rate.toFixed(2)} ₴/$`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewCustomerEstimate(est)}
                      title={t.common.printPdf}
                      aria-label={t.common.printPdf}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQuickSharePdf(est)}
                      disabled={sharingEstimateId === est.id}
                      title={t.customerEstimate.sharePdf}
                      aria-label={t.customerEstimate.sharePdf}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {sharingEstimateId === est.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Catalog Shortcuts */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-1">
            {t.dashboard.quickActions}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('materials')}
            className="w-full min-h-[64px] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-500/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.materials.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t.materials.templatesTab}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('labor')}
            className="w-full min-h-[64px] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-500/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.labor.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  UAH / USD
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onNewEstimate('car')}
            className="w-full min-h-[64px] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-500/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.estimate.newTitle}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t.estimate.diagramTab}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
