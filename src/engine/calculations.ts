import {
  CurrencyCode,
  DepositInfo,
  Estimate,
  EstimateLaborItem,
  EstimateMaterialItem,
  EstimateTotals,
  MaterialCatalogItem,
  MaterialUnit,
  PartQuickTemplate,
  PriceAdjustment,
  VehiclePartId,
} from '../types/models';
import {
  addScaled,
  divScaled,
  fromScaled,
  mulScaled,
  subScaled,
  toScaled,
} from './decimal';

/**
 * Converts an amount from UAH or USD into UAH using the provided USD/UAH exchange rate.
 */
export function convertToUahScaled(amount: number, currency: CurrencyCode, usdToUahRate: number): bigint {
  const amtScaled = toScaled(amount);
  if (currency === 'UAH') return amtScaled;
  const rateScaled = toScaled(usdToUahRate);
  return mulScaled(amtScaled, rateScaled);
}

export function convertToUah(amount: number, currency: CurrencyCode, usdToUahRate: number): number {
  return fromScaled(convertToUahScaled(amount, currency, usdToUahRate), 2);
}

/**
 * Converts a UAH amount into USD deterministically using the provided USD/UAH exchange rate.
 */
export function convertUahToUsdScaled(amountUah: number, usdToUahRate: number): bigint {
  if (!Number.isFinite(amountUah) || !Number.isFinite(usdToUahRate) || usdToUahRate <= 0) {
    return 0n;
  }
  return divScaled(toScaled(amountUah), toScaled(usdToUahRate));
}

export function convertUahToUsd(amountUah: number, usdToUahRate: number): number {
  return fromScaled(convertUahToUsdScaled(amountUah, usdToUahRate), 2);
}

/**
 * Normalizes unit quantities into comparable base units:
 * - mass ('g', 'kg') -> grams ('g')
 * - volume ('ml', 'l') -> milliliters ('ml')
 * - count ('pcs') -> pieces ('pcs')
 */
export function getUnitDimension(unit: MaterialUnit): 'mass' | 'volume' | 'count' {
  if (unit === 'g' || unit === 'kg') return 'mass';
  if (unit === 'ml' || unit === 'l') return 'volume';
  return 'count';
}

export function isUnitCompatible(a: MaterialUnit, b: MaterialUnit): boolean {
  return getUnitDimension(a) === getUnitDimension(b);
}

export function toBaseUnitScaled(quantity: number, unit: MaterialUnit): bigint {
  const qScaled = toScaled(quantity);
  if (unit === 'kg' || unit === 'l') {
    return mulScaled(qScaled, toScaled(1000));
  }
  return qScaled;
}

/**
 * Calculates total UAH cost for a single labor item (unitPrice * quantity, converted to UAH).
 */
export function calculateLaborItemTotalUahScaled(item: EstimateLaborItem, usdToUahRate: number): bigint {
  const unitUah = convertToUahScaled(item.unitPrice, item.currency, usdToUahRate);
  const qtyScaled = toScaled(Math.max(0, item.quantity));
  return mulScaled(unitUah, qtyScaled);
}

export function calculateLaborItemTotalUah(item: EstimateLaborItem, usdToUahRate: number): number {
  return fromScaled(calculateLaborItemTotalUahScaled(item, usdToUahRate), 2);
}

/**
 * Calculates proportional UAH cost for a material consumption item.
 * Example: 150 g consumed from a 1 kg (1000 g) pack costing 20 USD @ 41.50 = (150/1000) * 20 * 41.50 = 124.50 UAH.
 */
export function calculateMaterialItemCostUahScaled(
  item: Pick<EstimateMaterialItem, 'quantity' | 'unit' | 'packageSize' | 'packageUnit' | 'packagePrice' | 'currency'>,
  usdToUahRate: number
): bigint {
  if (item.quantity <= 0 || item.packageSize <= 0 || item.packagePrice <= 0) return 0n;

  const packUah = convertToUahScaled(item.packagePrice, item.currency, usdToUahRate);

  if (!isUnitCompatible(item.unit, item.packageUnit)) {
    // Fallback to direct ratio if mismatched custom units
    const ratio = divScaled(toScaled(item.quantity), toScaled(item.packageSize));
    return mulScaled(packUah, ratio);
  }

  const consumedBase = toBaseUnitScaled(item.quantity, item.unit);
  const packageBase = toBaseUnitScaled(item.packageSize, item.packageUnit);
  const ratio = divScaled(consumedBase, packageBase);
  return mulScaled(packUah, ratio);
}

export function calculateMaterialItemCostUah(
  item: Pick<EstimateMaterialItem, 'quantity' | 'unit' | 'packageSize' | 'packageUnit' | 'packagePrice' | 'currency'>,
  usdToUahRate: number
): number {
  return fromScaled(calculateMaterialItemCostUahScaled(item, usdToUahRate), 2);
}

/**
 * Prevents accidental duplicate operations for the same part.
 * Standard operations can only appear once per part; custom operations are checked by trimmed lowercase name.
 */
export function isDuplicateLaborOperation(
  existingItems: EstimateLaborItem[],
  partId: VehiclePartId,
  operationType: EstimateLaborItem['operationType'],
  customName?: string
): boolean {
  const partItems = existingItems.filter((item) => item.partId === partId);
  if (operationType !== 'custom') {
    return partItems.some((item) => item.operationType === operationType);
  }
  const normalized = (customName ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return partItems.some(
    (item) => item.operationType === 'custom' && (item.customName ?? '').trim().toLowerCase() === normalized
  );
}

/**
 * Generates quick-mode material items from configurable per-part templates and the material catalog.
 * Aggregates quantities cleanly per material so each material shows accurate total consumption.
 */
export function buildQuickMaterialsFromTemplates(
  selectedParts: VehiclePartId[],
  templates: PartQuickTemplate[],
  catalog: MaterialCatalogItem[],
  multiplier = 1,
  doubleSidedParts: VehiclePartId[] = []
): EstimateMaterialItem[] {
  const safeMultiplier = multiplier > 0 ? multiplier : 1;
  const catalogById = new Map(catalog.map((m) => [m.id, m]));
  const templateByPart = new Map(templates.map((t) => [t.partId, t]));
  const doubleSidedSet = new Set(doubleSidedParts);

  const aggregated = new Map<
    string,
    {
      material: MaterialCatalogItem;
      baseQtyScaled: bigint;
      displayUnit: MaterialUnit;
    }
  >();

  for (const partId of selectedParts) {
    const tpl = templateByPart.get(partId);
    if (!tpl) continue;
    const sideFactor = doubleSidedSet.has(partId) ? 2 : 1;

    for (const rule of tpl.rules) {
      const mat = catalogById.get(rule.materialId);
      if (!mat) continue;

      const ruleQtyScaled = mulScaled(
        toBaseUnitScaled(rule.quantity, rule.unit),
        toScaled(safeMultiplier * sideFactor)
      );
      const existing = aggregated.get(mat.id);
      if (existing && isUnitCompatible(existing.displayUnit, rule.unit)) {
        existing.baseQtyScaled = addScaled(existing.baseQtyScaled, ruleQtyScaled);
      } else if (!existing) {
        aggregated.set(mat.id, {
          material: mat,
          baseQtyScaled: ruleQtyScaled,
          displayUnit: rule.unit === 'kg' ? 'g' : rule.unit === 'l' ? 'ml' : rule.unit,
        });
      }
    }
  }

  const result: EstimateMaterialItem[] = [];
  for (const { material, baseQtyScaled, displayUnit } of aggregated.values()) {
    const qty = fromScaled(baseQtyScaled, displayUnit === 'pcs' ? 2 : 1);
    if (qty <= 0) continue;
    result.push({
      id: `quick_${material.id}`,
      materialId: material.id,
      name: material.name,
      category: material.category,
      quantity: qty,
      unit: displayUnit,
      packageSize: material.packageSize,
      packageUnit: material.packageUnit,
      packagePrice: material.packagePrice,
      currency: material.currency,
      isCustom: material.isCustom,
    });
  }

  return result;
}

/**
 * Computes discount or markup adjustment in scaled UAH.
 */
export function calculateAdjustmentScaled(subtotalScaled: bigint, adjustment: PriceAdjustment): bigint {
  if (adjustment.kind === 'none' || adjustment.value <= 0) return 0n;

  let deltaScaled = 0n;
  if (adjustment.valueType === 'percent') {
    const pctRatio = divScaled(toScaled(adjustment.value), toScaled(100));
    deltaScaled = mulScaled(subtotalScaled, pctRatio);
  } else {
    deltaScaled = toScaled(adjustment.value);
  }

  if (adjustment.kind === 'discount') {
    // Clamp discount so total never goes negative
    const clamped = deltaScaled > subtotalScaled ? subtotalScaled : deltaScaled;
    return -clamped;
  }
  return deltaScaled;
}

/**
 * Pure deterministic estimate totals calculation.
 * Strictly uses ONLY the active `materialsMode` list ('quick' OR 'detailed') to guarantee zero double-counting.
 * Strictly uses `estimate.exchangeRate.rate` (the frozen/estimate-specific rate).
 */
export function calculateEstimateTotals(
  input: Pick<
    Estimate,
    'laborItems' | 'materialsMode' | 'quickMaterials' | 'detailedMaterials' | 'adjustment' | 'exchangeRate'
  >
): EstimateTotals {
  const rate = input.exchangeRate.rate;

  let laborScaled = 0n;
  for (const item of input.laborItems) {
    // Round each line item deterministically at 2 decimals before summing to match itemized customer invoice
    const lineUah = toScaled(fromScaled(calculateLaborItemTotalUahScaled(item, rate), 2));
    laborScaled = addScaled(laborScaled, lineUah);
  }

  const activeMaterials = input.materialsMode === 'quick' ? input.quickMaterials : input.detailedMaterials;
  let materialsScaled = 0n;
  for (const item of activeMaterials) {
    const lineUah = toScaled(fromScaled(calculateMaterialItemCostUahScaled(item, rate), 2));
    materialsScaled = addScaled(materialsScaled, lineUah);
  }

  const subtotalScaled = addScaled(laborScaled, materialsScaled);
  const adjScaled = calculateAdjustmentScaled(subtotalScaled, input.adjustment);
  const totalScaled = addScaled(subtotalScaled, adjScaled);

  return {
    laborSubtotalUah: fromScaled(laborScaled, 2),
    materialsSubtotalUah: fromScaled(materialsScaled, 2),
    subtotalBeforeAdjustmentUah: fromScaled(subtotalScaled, 2),
    adjustmentAmountUah: fromScaled(adjScaled, 2),
    totalUah: fromScaled(totalScaled < 0n ? 0n : totalScaled, 2),
  };
}

export interface DepositBalanceSummary {
  expectedUah: number;
  receivedUah: number;
  remainingBalanceUah: number;
  depositShortfallUah: number;
  overpaidUah: number;
}

export function calculateDepositSummary(
  totalUah: number,
  deposit?: DepositInfo
): DepositBalanceSummary {
  const safeTotal = Math.max(0, fromScaled(toScaled(Number.isFinite(totalUah) ? totalUah : 0), 2));
  const expectedUah = Math.max(
    0,
    fromScaled(toScaled(Number.isFinite(deposit?.expectedUah) ? deposit!.expectedUah : 0), 2)
  );
  const receivedUah = Math.max(
    0,
    fromScaled(toScaled(Number.isFinite(deposit?.receivedUah) ? deposit!.receivedUah : 0), 2)
  );

  const totalScaled = toScaled(safeTotal);
  const expectedScaled = toScaled(expectedUah);
  const receivedScaled = toScaled(receivedUah);

  const remainingScaled = subScaled(totalScaled, receivedScaled);
  const shortfallScaled = subScaled(expectedScaled, receivedScaled);

  return {
    expectedUah,
    receivedUah,
    remainingBalanceUah: remainingScaled > 0n ? fromScaled(remainingScaled, 2) : 0,
    depositShortfallUah: shortfallScaled > 0n ? fromScaled(shortfallScaled, 2) : 0,
    overpaidUah: receivedScaled > totalScaled ? fromScaled(subScaled(receivedScaled, totalScaled), 2) : 0,
  };
}
