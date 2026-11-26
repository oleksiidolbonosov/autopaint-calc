import React from 'react';
import { Bell, Calendar, CheckCircle2, X } from 'lucide-react';
import { TranslationDictionary } from '../i18n/translations';
import { DueOrderAlert } from '../services/reminderService';
import { formatDateShort } from '../services/currencyService';
import { Estimate, LocaleCode } from '../types/models';

interface DeadlineReminderModalProps {
  alerts: DueOrderAlert[];
  locale: LocaleCode;
  t: TranslationDictionary;
  onOpenOrder: (est: Estimate) => void;
  onDismiss: () => void;
}

export const DeadlineReminderModal: React.FC<DeadlineReminderModalProps> = ({
  alerts,
  locale,
  t,
  onOpenOrder,
  onDismiss,
}) => {
  if (alerts.length === 0) return null;

  const formatDaysLabel = (daysLeft: number) => {
    if (daysLeft === 0) return t.reminder.dueToday;
    if (daysLeft === 1) return t.reminder.dueTomorrow;
    if (daysLeft > 1) return t.reminder.dueInDays.replace('{n}', String(daysLeft));
    return t.reminder.overdueDays.replace('{n}', String(Math.abs(daysLeft)));
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deadline-reminder-title"
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 pb-safe shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden shrink-0" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="deadline-reminder-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                {t.reminder.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t.reminder.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.common.close}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 -mx-2 px-2">
          {alerts.map(({ estimate, daysLeft }) => {
            const doneCount = estimate.stages?.filter((s) => s.completed).length ?? 0;
            const totalStages = estimate.stages?.length ?? 0;
            const isUrgent = daysLeft <= 0;

            return (
              <div
                key={estimate.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span
                      className={`font-semibold ${
                        isUrgent
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {formatDaysLabel(daysLeft)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono-num text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {estimate.dueDate ? formatDateShort(estimate.dueDate, locale) : '—'}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                    {estimate.customerName || estimate.estimateNumber}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {t.vehicleTypes[estimate.vehicleType ?? 'car']} ·{' '}
                    {[estimate.vehicleMake, estimate.vehicleModel].filter(Boolean).join(' ') || '—'}{' '}
                    ·{' '}
                    <span className="inline-flex items-center gap-1 font-mono-num">
                      <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      {doneCount}/{totalStages}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenOrder(estimate)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.reminder.openOrder}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0"
        >
          {t.reminder.dismissWork}
        </button>
      </div>
    </div>
  );
};
