import { createDefaultStages, CURRENT_SCHEMA_VERSION } from '../data/seedData';
import { calculateEstimateTotals } from '../engine/calculations';
import { addDaysToDateString, getTodayDateString } from './reminderService';
import { Estimate, ExchangeRateSnapshot } from '../types/models';

export function generateEstimateId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `est_${Date.now()}_${random}`;
}

export function generateEstimateNumber(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `EST-${yyyy}${mm}${dd}-${suffix}`;
}

export function createNewEstimateDraft(
  workshopId: string,
  currentRate: ExchangeRateSnapshot
): Estimate {
  const now = new Date().toISOString();
  const today = getTodayDateString();
  const base: Omit<Estimate, 'totals'> = {
    id: generateEstimateId(),
    estimateNumber: generateEstimateNumber(),
    workshopId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    orderDate: today,
    dueDate: addDaysToDateString(today, 5),
    orderPhase: 'preliminary',
    deposit: { expectedUah: 0, receivedUah: 0 },
    customerName: '',
    customerPhone: '',
    vehicleType: 'car',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    notes: '',
    selectedParts: [],
    doubleSidedParts: [],
    laborItems: [],
    stages: createDefaultStages(0),
    materialsMode: 'quick',
    quickMaterialMultiplier: 1,
    quickMaterials: [],
    detailedMaterials: [],
    adjustment: { kind: 'none', valueType: 'percent', value: 0 },
    exchangeRate: {
      ...currentRate,
    },
  };
  return {
    ...base,
    totals: calculateEstimateTotals(base),
  };
}

/**
 * Prepares an estimate for saving, freezing its exchange rate timestamp and recalculating deterministic totals.
 */
export function prepareEstimateForSave(estimate: Estimate): Estimate {
  const now = new Date().toISOString();
  const frozenRate: ExchangeRateSnapshot = {
    ...estimate.exchangeRate,
    frozenAt: estimate.exchangeRate.frozenAt ?? now,
  };
  const next: Estimate = {
    ...estimate,
    orderPhase: estimate.orderPhase ?? 'preliminary',
    doubleSidedParts: estimate.doubleSidedParts ?? [],
    deposit: {
      expectedUah: estimate.deposit?.expectedUah ?? 0,
      receivedUah: estimate.deposit?.receivedUah ?? 0,
      receivedAt: estimate.deposit?.receivedAt,
      note: estimate.deposit?.note,
    },
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exchangeRate: frozenRate,
    totals: calculateEstimateTotals({
      ...estimate,
      exchangeRate: frozenRate,
    }),
  };
  return next;
}

/**
 * Duplicates an existing estimate into a brand-new draft with a fresh ID, date, and current workshop rate.
 */
export function duplicateEstimateDraft(
  source: Estimate,
  currentRate: ExchangeRateSnapshot,
  copySuffix = '(Копія)'
): Estimate {
  const now = new Date().toISOString();
  const today = getTodayDateString();
  const clonedBase: Omit<Estimate, 'totals'> = {
    ...structuredClone(source),
    id: generateEstimateId(),
    estimateNumber: generateEstimateNumber(),
    createdAt: now,
    updatedAt: now,
    orderDate: today,
    dueDate: addDaysToDateString(today, 5),
    orderPhase: 'preliminary',
    preliminaryTotalUah: undefined,
    preliminaryLockedAt: undefined,
    deposit: { expectedUah: 0, receivedUah: 0 },
    stages: createDefaultStages(0),
    laborItems: source.laborItems.map((l) => ({
      ...l,
      completed: false,
      completedAt: undefined,
    })),
    customerName: source.customerName ? `${source.customerName} ${copySuffix}` : '',
    isSample: false,
    exchangeRate: {
      ...currentRate,
      frozenAt: undefined,
    },
  };
  return {
    ...clonedBase,
    totals: calculateEstimateTotals(clonedBase),
  };
}
