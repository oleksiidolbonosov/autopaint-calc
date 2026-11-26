import React, { useState } from 'react';
import { Download, Loader2, Printer, Share2, X } from 'lucide-react';
import {
  calculateDepositSummary,
  calculateEstimateTotals,
  calculateLaborItemTotalUah,
  calculateMaterialItemCostUah,
  convertUahToUsd,
} from '../engine/calculations';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateShort, formatDateTime, formatUah, formatUsd } from '../services/currencyService';
import {
  generateEstimatePdf,
  shareEstimatePdfDocument,
  triggerPdfDownload,
} from '../services/pdfExportService';
import { AppSettings, Estimate } from '../types/models';

interface CustomerEstimateModalProps {
  estimate: Estimate;
  settings: AppSettings;
  t: TranslationDictionary;
  onClose: () => void;
}

export const CustomerEstimateModal: React.FC<CustomerEstimateModalProps> = ({
  estimate,
  settings,
  t,
  onClose,
}) => {
  const [pdfAction, setPdfAction] = useState<'share' | 'download' | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const rate = estimate.exchangeRate.rate;
  const totals = calculateEstimateTotals(estimate);
  const activeMaterials =
    estimate.materialsMode === 'quick' ? estimate.quickMaterials : estimate.detailedMaterials;
  const isFinalPhase = estimate.orderPhase === 'final';
  const doubleSidedSet = new Set(estimate.doubleSidedParts ?? []);
  const depositSummary = calculateDepositSummary(totals.totalUah, estimate.deposit);
  const hasDeposit = depositSummary.expectedUah > 0 || depositSummary.receivedUah > 0;
  const formatClientMoney = (amountUah: number) =>
    isFinalPhase
      ? formatUah(amountUah, settings.locale)
      : formatUsd(convertUahToUsd(amountUah, rate), settings.locale);

  const handlePrint = () => {
    window.print();
  };

  const handleSharePdf = async () => {
    setPdfAction('share');
    setStatusMessage(null);
    try {
      const outcome = await shareEstimatePdfDocument(estimate, settings, t);
      if (outcome === 'downloaded_fallback') {
        setStatusMessage({
          type: 'ok',
          text: t.customerEstimate.shareFallbackDownloaded,
        });
      }
    } catch {
      setStatusMessage({
        type: 'err',
        text: t.customerEstimate.pdfError,
      });
    } finally {
      setPdfAction(null);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfAction('download');
    setStatusMessage(null);
    try {
      const { blob, filename } = await generateEstimatePdf(estimate, settings, t);
      triggerPdfDownload(blob, filename);
      setStatusMessage({
        type: 'ok',
        text: t.customerEstimate.pdfDownloaded,
      });
    } catch {
      setStatusMessage({
        type: 'err',
        text: t.customerEstimate.pdfError,
      });
    } finally {
      setPdfAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto p-0 sm:p-6 print:static print:bg-white print:p-0">
      <div className="min-h-screen sm:min-h-0 max-w-3xl mx-auto bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print-only-container">
        {/* Top action bar (hidden on print) */}
        <div className="no-print sticky top-0 z-10 px-4 sm:px-6 py-3 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {t.customerEstimate.estimateNo} {estimate.estimateNumber}
            </span>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSharePdf}
                disabled={pdfAction !== null}
                className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {pdfAction === 'share' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>
                  {pdfAction === 'share'
                    ? t.customerEstimate.generatingPdf
                    : t.customerEstimate.sharePdf}
                </span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfAction !== null}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {pdfAction === 'download' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{t.customerEstimate.downloadPdf}</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                aria-label={t.common.printPdf}
                title={t.common.printPdf}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.common.close}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`text-xs font-medium px-3 py-2 rounded-xl ${
                statusMessage.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Printable Document Body (always high-contrast clean paper aesthetic) */}
        <div className="p-5 sm:p-8 bg-white text-slate-900 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-slate-900">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{settings.workshopName}</h2>
              {settings.workshopAddress && (
                <p className="text-sm text-slate-600 mt-0.5">{settings.workshopAddress}</p>
              )}
              {settings.workshopPhone && (
                <p className="text-sm text-slate-600 font-mono-num">{settings.workshopPhone}</p>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                {isFinalPhase
                  ? t.customerEstimate.finalDocumentTitle
                  : t.customerEstimate.documentTitle}
              </div>
              <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
                {estimate.estimateNumber}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {t.customerEstimate.date}: {formatDateTime(estimate.createdAt, settings.locale)}
              </div>
              <div className="text-xs text-slate-600 mt-0.5 font-mono-num">
                {t.estimate.orderDate}:{' '}
                {estimate.orderDate
                  ? formatDateShort(estimate.orderDate, settings.locale)
                  : formatDateShort(estimate.createdAt, settings.locale)}
                {estimate.dueDate
                  ? ` · ${t.estimate.dueDate}: ${formatDateShort(estimate.dueDate, settings.locale)}`
                  : ''}
              </div>
            </div>
          </div>

          {/* Client & Vehicle Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">{t.customerEstimate.customer}</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {estimate.customerName || '—'}
              </div>
              {estimate.customerPhone && (
                <div className="text-sm text-slate-600 font-mono-num">{estimate.customerPhone}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500">
                {t.customerEstimate.vehicle} · {t.vehicleTypes[estimate.vehicleType ?? 'car']}
              </div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {[estimate.vehicleMake, estimate.vehicleModel, estimate.vehicleYear]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </div>
              {estimate.vehicleColor && (
                <div className="text-sm text-slate-600">{estimate.vehicleColor}</div>
              )}
            </div>
          </div>

          {/* Selected Parts Summary */}
          {estimate.selectedParts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1.5">
                {t.customerEstimate.partsTitle} ({estimate.selectedParts.length})
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">
                {estimate.selectedParts
                  .map((pid) =>
                    doubleSidedSet.has(pid)
                      ? `${t.parts[pid]} (${t.estimate.doubleSidedBadge})`
                      : t.parts[pid]
                  )
                  .join(' · ')}
              </p>
            </div>
          )}

          {/* Labor Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
              {t.customerEstimate.laborTableTitle}
            </h3>
            {estimate.laborItems.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">—</p>
            ) : (
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-2 font-medium w-8">#</th>
                    <th className="py-2 pr-2 font-medium">{t.customerEstimate.colPart}</th>
                    <th className="py-2 pr-2 font-medium">{t.customerEstimate.colItem}</th>
                    <th className="py-2 pr-2 text-right font-medium">{t.customerEstimate.colQty}</th>
                    <th className="py-2 text-right font-medium">
                      {isFinalPhase ? t.customerEstimate.colCostUah : t.customerEstimate.colCostUsd}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estimate.laborItems.map((item, idx) => {
                    const lineUah = calculateLaborItemTotalUah(item, rate);
                    const opLabel =
                      item.operationType === 'custom'
                        ? item.customName || t.operations.custom
                        : t.operations[item.operationType];
                    return (
                      <tr key={item.id}>
                        <td className="py-2 pr-2 font-mono-num text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 pr-2 text-slate-600">
                          {t.parts[item.partId]}
                          {doubleSidedSet.has(item.partId)
                            ? ` (${t.estimate.doubleSidedBadge})`
                            : ''}
                        </td>
                        <td className="py-2 pr-2 font-medium text-slate-900">{opLabel}</td>
                        <td className="py-2 pr-2 text-right font-mono-num text-slate-600">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-right font-mono-num font-semibold text-slate-900">
                          {formatClientMoney(lineUah)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Materials Table */}
          {activeMaterials.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
                {t.customerEstimate.materialsTableTitle}
              </h3>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-2 font-medium w-8">#</th>
                    <th className="py-2 pr-2 font-medium">{t.customerEstimate.colItem}</th>
                    <th className="py-2 pr-2 text-right font-medium">{t.customerEstimate.colQty}</th>
                    <th className="py-2 text-right font-medium">
                      {isFinalPhase ? t.customerEstimate.colCostUah : t.customerEstimate.colCostUsd}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeMaterials.map((mat, idx) => {
                    const lineUah = calculateMaterialItemCostUah(mat, rate);
                    return (
                      <tr key={mat.id}>
                        <td className="py-2 pr-2 font-mono-num text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 pr-2 font-medium text-slate-900">{mat.name}</td>
                        <td className="py-2 pr-2 text-right font-mono-num text-slate-600">
                          {mat.quantity} {t.units[mat.unit]}
                        </td>
                        <td className="py-2 text-right font-mono-num font-semibold text-slate-900">
                          {formatClientMoney(lineUah)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Box */}
          <div className="pt-4 border-t border-slate-200 space-y-2 max-w-sm ml-auto bg-slate-50 p-4 rounded-xl border">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t.estimate.laborSubtotal}</span>
              <span className="font-mono-num font-medium">
                {formatClientMoney(totals.laborSubtotalUah)}
              </span>
            </div>
            {(activeMaterials.length > 0 || totals.materialsSubtotalUah > 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t.estimate.materialsSubtotal}</span>
                <span className="font-mono-num font-medium">
                  {formatClientMoney(totals.materialsSubtotalUah)}
                </span>
              </div>
            )}
            {estimate.adjustment.kind !== 'none' && totals.adjustmentAmountUah !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {estimate.adjustment.kind === 'discount'
                    ? t.estimate.adjustmentDiscount
                    : t.estimate.adjustmentMarkup}{' '}
                  ({estimate.adjustment.value}
                  {estimate.adjustment.valueType === 'percent' ? '%' : ' ₴'})
                </span>
                <span className="font-mono-num font-medium">
                  {totals.adjustmentAmountUah > 0 ? '+' : ''}
                  {formatClientMoney(totals.adjustmentAmountUah)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-300">
              <span className="text-base font-bold text-slate-900">
                {isFinalPhase ? t.estimate.finalAmount : t.estimate.finalTotal}
              </span>
              <span className="text-xl font-bold font-mono-num text-blue-700">
                {formatClientMoney(totals.totalUah)}
              </span>
            </div>
            {estimate.preliminaryTotalUah !== undefined &&
              (isFinalPhase || estimate.preliminaryTotalUah !== totals.totalUah) && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{t.estimate.preliminaryAmount}</span>
                  <span className="font-mono-num font-medium">
                    {formatUsd(convertUahToUsd(estimate.preliminaryTotalUah, rate), settings.locale)}
                  </span>
                </div>
              )}
            {hasDeposit && (
              <div className="pt-2 border-t border-slate-200 space-y-1 text-sm">
                {depositSummary.expectedUah > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t.estimate.depositExpected}</span>
                    <span className="font-mono-num">
                      {formatClientMoney(depositSummary.expectedUah)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-700">
                  <span className="font-medium">{t.estimate.depositReceived}</span>
                  <span className="font-mono-num font-semibold">
                    -{formatClientMoney(depositSummary.receivedUah)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{t.estimate.depositBalanceDue}</span>
                  <span className="font-mono-num">
                    {formatClientMoney(depositSummary.remainingBalanceUah)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {estimate.notes && (
            <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="font-semibold text-slate-700">{t.estimate.notes}: </span>
              {estimate.notes}
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <p>
              {isFinalPhase
                ? t.customerEstimate.rateFootnote
                : t.customerEstimate.preliminaryRateFootnote}{' '}
              <span className="font-mono-num font-semibold text-slate-700">
                1 USD = {rate.toFixed(2)} UAH
              </span>
            </p>
            <p>{t.customerEstimate.thankYou}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
