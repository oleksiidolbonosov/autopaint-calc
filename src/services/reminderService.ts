import { Estimate, EstimateStageId } from '../types/models';

export function getTodayDateString(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return getTodayDateString();
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return getTodayDateString(dt);
}

/**
 * Computes exact calendar day difference between today (local midnight) and dueDate (YYYY-MM-DD).
 * Returns 0 if due today, 2 if due in 2 days, negative if overdue.
 */
export function getDaysUntilDue(dueDate?: string, now = new Date()): number | null {
  if (!dueDate) return null;
  const parts = dueDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const dueLocal = new Date(y, m - 1, d);
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = dueLocal.getTime() - todayLocal.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const DEFAULT_STAGE_ORDER: EstimateStageId[] = [
  'disassembly',
  'bodywork',
  'prep',
  'painting',
  'polishing',
  'assembly',
];

export function isEstimateCompleted(estimate: Pick<Estimate, 'stages'>): boolean {
  if (!estimate.stages || estimate.stages.length === 0) return false;
  return estimate.stages.every((s) => s.completed);
}

export interface DueOrderAlert {
  estimate: Estimate;
  daysLeft: number;
}

/**
 * Returns incomplete estimates whose delivery dueDate is within the next 2 days (daysLeft <= 2) or overdue.
 */
export function getDueSoonEstimates(estimates: Estimate[], now = new Date()): DueOrderAlert[] {
  const alerts: DueOrderAlert[] = [];
  for (const est of estimates) {
    if (!est.dueDate) continue;
    if (isEstimateCompleted(est)) continue;
    const daysLeft = getDaysUntilDue(est.dueDate, now);
    if (daysLeft !== null && daysLeft <= 2) {
      alerts.push({ estimate: est, daysLeft });
    }
  }
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function isReminderSnoozed(snoozedUntilIso?: string, now = new Date()): boolean {
  if (!snoozedUntilIso) return false;
  const until = new Date(snoozedUntilIso).getTime();
  if (Number.isNaN(until)) return false;
  return now.getTime() < until;
}
