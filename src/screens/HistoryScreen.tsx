import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Cloud,
  CloudOff,
  Copy,
  FileText,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Wallet,
} from 'lucide-react';
import { NumericInput } from '../components/NumericInput';
import { createDefaultStages } from '../data/seedData';
import { calculateDepositSummary, convertUahToUsd } from '../engine/calculations';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateShort, formatDateTime, formatUah, formatUsd } from '../services/currencyService';
import { shareEstimatePdfDocument } from '../services/pdfExportService';
import { getDaysUntilDue, isEstimateCompleted } from '../services/reminderService';
import { AppSettings, DepositInfo, Estimate, EstimateStageId, LocaleCode } from '../types/models';

interface HistoryScreenProps {
  estimates: Estimate[];
  settings: AppSettings;
  locale: LocaleCode;
  authUser: User | null;
  isSigningIn: boolean;
  cloudSyncState: 'idle' | 'syncing' | 'synced' | 'error';
  cloudError?: string | null;
  t: TranslationDictionary;
  onNewEstimate: () => void;
  onEditEstimate: (est: Estimate) => void;
  onDuplicateEstimate: (est: Estimate) => void;
  onDeleteEstimate: (id: string) => void;
  onViewCustomerEstimate: (est: Estimate) => void;
  onToggleStage: (estId: string, stageId: EstimateStageId) => void;
  onUpdateDeposit: (estId: string, deposit: DepositInfo) => void;
  onSignInGoogle: () => void;
  onRefreshCloud: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  estimates,
  settings,
  locale,
  authUser,
  isSigningIn,
  cloudSyncState,
  cloudError,
  t,
  onNewEstimate,
  onEditEstimate,
  onDuplicateEstimate,
  onDeleteEstimate,
  onViewCustomerEstimate,
  onToggleStage,
  onUpdateDeposit,
  onSignInGoogle,
  onRefreshCloud,
}) => {
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null);
  const [depositTarget, setDepositTarget] = useState<Estimate | null>(null);
  const [depositExpected, setDepositExpected] = useState(0);
  const [depositReceived, setDepositReceived] = useState(0);
  const [depositNote, setDepositNote] = useState('');
  const [expandedStagesId, setExpandedStagesId] = useState<string | null>(null);
  const [sharingEstimateId, setSharingEstimateId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const openDepositModal = (est: Estimate) => {
    setDepositTarget(est);
    setDepositExpected(est.deposit?.expectedUah ?? 0);
    setDepositReceived(est.deposit?.receivedUah ?? 0);
    setDepositNote(est.deposit?.note ?? '');
  };

  const handleSaveDepositModal = () => {
    if (!depositTarget) return;
    onUpdateDeposit(depositTarget.id, {
      expectedUah: Math.max(0, depositExpected),
      receivedUah: Math.max(0, depositReceived),
      receivedAt:
        depositReceived > 0
          ? depositTarget.deposit?.receivedAt || new Date().toISOString()
          : undefined,
      note: depositNote.trim() || undefined,
    });
    setDepositTarget(null);
  };

  const handleQuickSharePdf = async (est: Estimate) => {
    setSharingEstimateId(est.id);
    setShareToast(null);
    try {
      const outcome = await shareEstimatePdfDocument(est, settings, t);
      if (outcome === 'downloaded_fallback') {
        setShareToast({
          type: 'ok',
          text: t.customerEstimate.shareFallbackDownloaded,
        });
      }
    } catch {
      setShareToast({
        type: 'err',
        text: t.customerEstimate.pdfError,
      });
    } finally {
      setSharingEstimateId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return estimates;
    return estimates.filter((e) => {
      const text = [
        e.estimateNumber,
        e.customerName,
        e.customerPhone,
        e.vehicleMake,
        e.vehicleModel,
        t.vehicleTypes[e.vehicleType ?? 'car'],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [estimates, query, t]);

  const formatDaysLabel = (daysLeft: number) => {
    if (daysLeft === 0) return t.reminder.dueToday;
    if (daysLeft === 1) return t.reminder.dueTomorrow;
    if (daysLeft > 1) return t.reminder.dueInDays.replace('{n}', String(daysLeft));
    return t.reminder.overdueDays.replace('{n}', String(Math.abs(daysLeft)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.history.title}</h1>
        <button
          type="button"
          onClick={onNewEstimate}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{t.dashboard.createEstimateCta}</span>
        </button>
      </div>

      {/* Cloud Storage Status / Sign-In Banner */}
      {!authUser ? (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <CloudOff className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100">
                {t.cloud.localOnlyWarning}
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
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
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
            onClick={onRefreshCloud}
            disabled={cloudSyncState === 'syncing'}
            className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncState === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{t.cloud.refreshCloud}</span>
          </button>
        </div>
      )}

      {cloudError && authUser && (
        <div className="text-xs font-medium px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 break-words">
          {cloudError}
        </div>
      )}

      {shareToast && (
        <div
          className={`text-xs font-medium px-3.5 py-2.5 rounded-xl border ${
            shareToast.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
          }`}
        >
          {shareToast.text}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.history.searchPlaceholder}
          className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {query ? t.common.noResults : t.history.emptyTitle}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.history.emptyDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((est) => {
            const stages =
              est.stages && est.stages.length > 0 ? est.stages : createDefaultStages(0);
            const doneCount = stages.filter((s) => s.completed).length;
            const completed = isEstimateCompleted(est);
            const daysLeft = getDaysUntilDue(est.dueDate);
            const isDueSoon = !completed && daysLeft !== null && daysLeft <= 2;
            const isExpanded = expandedStagesId === est.id;
            const isFinalPhase = est.orderPhase === 'final';
            const formatCardMoney = (amountUah: number) =>
              isFinalPhase
                ? formatUah(amountUah, locale)
                : formatUsd(convertUahToUsd(amountUah, est.exchangeRate.rate), locale);
            const depositSummary = calculateDepositSummary(est.totals.totalUah, est.deposit);
            const hasDeposit =
              depositSummary.expectedUah > 0 || depositSummary.receivedUah > 0;

            return (
              <div
                key={est.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-num text-slate-500 dark:text-slate-400">
                        <span>
                          {est.estimateNumber} · {formatDateTime(est.createdAt, locale)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-sans font-semibold ${
                            isFinalPhase
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isFinalPhase ? t.estimate.phaseFinal : t.estimate.phasePreliminary}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                        {est.customerName || '—'}
                      </h3>
                      <div className="text-sm text-slate-600 dark:text-slate-300 truncate">
                        {t.vehicleTypes[est.vehicleType ?? 'car']} ·{' '}
                        {[est.vehicleMake, est.vehicleModel, est.vehicleYear]
                          .filter(Boolean)
                          .join(' ') || '—'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold font-mono-num text-blue-600 dark:text-blue-400">
                        {formatCardMoney(est.totals.totalUah)}
                      </div>
                      <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                        {t.history.rateLabel}: {est.exchangeRate.rate.toFixed(2)} ₴
                      </div>
                    </div>
                  </div>

                  {/* Order Date & Approximate Delivery Due Date + Urgency */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-mono-num">
                      <Calendar className="w-3.5 h-3.5" />
                      {t.estimate.orderDate}:{' '}
                      {est.orderDate
                        ? formatDateShort(est.orderDate, locale)
                        : formatDateShort(est.createdAt, locale)}
                    </span>
                    {est.dueDate && (
                      <span
                        className={`font-mono-num font-medium ${
                          isDueSoon
                            ? daysLeft !== null && daysLeft <= 0
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-amber-700 dark:text-amber-400 font-semibold'
                            : ''
                        }`}
                      >
                        {t.estimate.dueDate}: {formatDateShort(est.dueDate, locale)}
                        {isDueSoon && daysLeft !== null ? ` (${formatDaysLabel(daysLeft)})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {est.selectedParts.length} {t.history.partsShort} ·{' '}
                    {est.materialsMode === 'quick'
                      ? t.estimate.materialsModeQuick
                      : t.estimate.materialsModeDetailed}{' '}
                    · {t.history.frozenBadge}
                  </div>

                  {hasDeposit && (
                    <div className="mt-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium font-mono-num">
                        {t.estimate.depositQuickBtn}: {formatCardMoney(depositSummary.receivedUah)}
                        {depositSummary.expectedUah > 0
                          ? ` / ${formatCardMoney(depositSummary.expectedUah)}`
                          : ''}
                      </span>
                      <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                        {t.estimate.depositBalanceDue}:{' '}
                        {formatCardMoney(depositSummary.remainingBalanceUah)}
                      </span>
                    </div>
                  )}

                  {/* Expandable Stage Progress Bar & Checklist */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStagesId((prev) => (prev === est.id ? null : est.id))
                      }
                      className="w-full min-h-[36px] flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            completed
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                        <span>{t.estimate.stepStages}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono-num">
                        <span>
                          {doneCount}/{stages.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </span>
                    </button>

                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          completed ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${stages.length > 0 ? Math.round((doneCount / stages.length) * 100) : 0}%`,
                        }}
                      />
                    </div>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-1">
                        {stages.map((stage) => (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => onToggleStage(est.id, stage.id)}
                            className="w-full min-h-[40px] px-2 py-1.5 flex items-center gap-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
                          >
                            {stage.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                            )}
                            <span
                              className={`text-xs font-medium ${
                                stage.completed
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {t.stages[stage.id]}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewCustomerEstimate(est)}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{t.common.printPdf}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQuickSharePdf(est)}
                      disabled={sharingEstimateId === est.id}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {sharingEstimateId === est.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      <span>
                        {sharingEstimateId === est.id
                          ? t.customerEstimate.generatingPdf
                          : t.customerEstimate.sharePdf}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openDepositModal(est)}
                      aria-label={t.estimate.depositQuickBtn}
                      title={t.estimate.depositQuickBtn}
                      className="min-h-[44px] min-w-[44px] px-2 flex items-center justify-center gap-1 rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditEstimate(est)}
                      aria-label={t.common.edit}
                      title={t.common.edit}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateEstimate(est)}
                      aria-label={t.common.duplicate}
                      title={t.common.duplicate}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(est)}
                      aria-label={t.common.delete}
                      title={t.common.delete}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Bottom Sheet / Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 pb-safe shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.history.deleteConfirmTitle}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">
              {t.history.deleteConfirmDesc}
            </p>
            <p className="text-xs font-mono-num text-slate-500 mt-2">
              {deleteTarget.estimateNumber} · {deleteTarget.customerName}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEstimate(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-sm font-semibold text-white cursor-pointer"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Deposit / Prepayment Modal */}
      {depositTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setDepositTarget(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 pb-safe shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.estimate.depositSection}
              </h3>
              <p className="text-xs font-mono-num text-slate-500 mt-0.5">
                {depositTarget.estimateNumber} · {depositTarget.customerName || '—'} ·{' '}
                {formatUah(depositTarget.totals.totalUah, locale)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.estimate.depositExpected}
                </label>
                <NumericInput
                  min={0}
                  value={depositExpected}
                  onValueChange={setDepositExpected}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.estimate.depositReceived}
                </label>
                <div className="flex items-center gap-2">
                  <NumericInput
                    min={0}
                    value={depositReceived}
                    onValueChange={setDepositReceived}
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                  />
                  {depositExpected > 0 && depositReceived < depositExpected && (
                    <button
                      type="button"
                      onClick={() => setDepositReceived(depositExpected)}
                      className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      {t.estimate.depositMarkFull}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder={t.estimate.depositNotePlaceholder}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>{t.estimate.depositBalanceDue}</span>
                <span className="font-mono-num text-blue-600 dark:text-blue-400">
                  {formatUah(
                    calculateDepositSummary(depositTarget.totals.totalUah, {
                      expectedUah: depositExpected,
                      receivedUah: depositReceived,
                    }).remainingBalanceUah,
                    locale
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDepositTarget(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveDepositModal}
                className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white cursor-pointer"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
