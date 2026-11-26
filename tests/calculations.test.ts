import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultPartTemplates, createDefaultStages } from '../src/data/seedData';
import { VEHICLE_PARTS, VEHICLE_TYPE_MULTIPLIER } from '../src/data/vehicleParts';
import {
  buildQuickMaterialsFromTemplates,
  calculateDepositSummary,
  calculateEstimateTotals,
  calculateLaborItemTotalUah,
  calculateMaterialItemCostUah,
  convertToUah,
  convertUahToUsd,
  isDuplicateLaborOperation,
} from '../src/engine/calculations';
import { addMoney, mulMoney, percentOfMoney } from '../src/engine/decimal';
import { prepareEstimateForSave } from '../src/services/estimateGenerator';
import {
  getDaysUntilDue,
  getDueSoonEstimates,
  isEstimateCompleted,
  isReminderSnoozed,
} from '../src/services/reminderService';
import {
  Estimate,
  EstimateLaborItem,
  EstimateMaterialItem,
  MaterialCatalogItem,
  PartQuickTemplate,
} from '../src/types/models';

test('Decimal safety: eliminates IEEE-754 floating-point artifacts', () => {
  assert.equal(addMoney(0.1, 0.2), 0.3);
  assert.equal(mulMoney(19.99, 1.15), 22.99);
  assert.equal(percentOfMoney(1005, 5), 50.25);
});

test('Currency conversion: converts USD and UAH deterministically', () => {
  assert.equal(convertToUah(1500, 'UAH', 41.5), 1500);
  assert.equal(convertToUah(85, 'USD', 41.5), 3527.5);
  assert.equal(convertToUah(19.99, 'USD', 41.25), 824.59);
  assert.equal(convertUahToUsd(3527.5, 41.5), 85);
  assert.equal(convertUahToUsd(4150, 41.5), 100);
  assert.equal(convertUahToUsd(1000, 0), 0);
});

test('Material consumption: proportional cost across g/kg, ml/l, and pcs', () => {
  // 150g out of 1.5kg (1500g) pack @ 640 UAH => 64.00 UAH
  const filler: EstimateMaterialItem = {
    id: 'm1',
    name: 'Filler',
    category: 'filler',
    quantity: 150,
    unit: 'g',
    packageSize: 1.5,
    packageUnit: 'kg',
    packagePrice: 640,
    currency: 'UAH',
  };
  assert.equal(calculateMaterialItemCostUah(filler, 41.5), 64);

  // 250ml out of 1L (1000ml) clearcoat @ 34 USD @ 41.50 UAH/USD => 0.25 * 34 * 41.5 = 352.75 UAH
  const clearcoat: EstimateMaterialItem = {
    id: 'm2',
    name: 'Clearcoat',
    category: 'clearcoat',
    quantity: 250,
    unit: 'ml',
    packageSize: 1,
    packageUnit: 'l',
    packagePrice: 34,
    currency: 'USD',
  };
  assert.equal(calculateMaterialItemCostUah(clearcoat, 41.5), 352.75);

  // 3 pcs out of 10 pcs pack @ 320 UAH => 96 UAH
  const sandpaper: EstimateMaterialItem = {
    id: 'm3',
    name: 'Sandpaper',
    category: 'sandpaper',
    quantity: 3,
    unit: 'pcs',
    packageSize: 10,
    packageUnit: 'pcs',
    packagePrice: 320,
    currency: 'UAH',
  };
  assert.equal(calculateMaterialItemCostUah(sandpaper, 41.5), 96);
});

test('Labor calculations & duplicate operation prevention', () => {
  const labor: EstimateLaborItem[] = [
    {
      id: 'l1',
      partId: 'front_bumper',
      operationType: 'painting',
      unitPrice: 85,
      currency: 'USD',
      quantity: 1,
    },
    {
      id: 'l2',
      partId: 'front_bumper',
      operationType: 'removal',
      unitPrice: 600,
      currency: 'UAH',
      quantity: 1.5,
    },
    {
      id: 'l3',
      partId: 'front_bumper',
      operationType: 'custom',
      customName: 'Текстурування пластику',
      unitPrice: 400,
      currency: 'UAH',
      quantity: 1,
    },
  ];

  assert.equal(calculateLaborItemTotalUah(labor[0], 40.2), 3417);
  assert.equal(calculateLaborItemTotalUah(labor[1], 40.2), 900);

  // Duplicate checks
  assert.equal(isDuplicateLaborOperation(labor, 'front_bumper', 'painting'), true);
  assert.equal(isDuplicateLaborOperation(labor, 'front_bumper', 'polishing'), false);
  assert.equal(isDuplicateLaborOperation(labor, 'hood', 'painting'), false);
  assert.equal(
    isDuplicateLaborOperation(labor, 'front_bumper', 'custom', '  текстурування пластику '),
    true
  );
  assert.equal(
    isDuplicateLaborOperation(labor, 'front_bumper', 'custom', 'Шліфування фари'),
    false
  );
});

test('Discounts and markups (% and fixed UAH) compute exact totals', () => {
  const baseEstimate: Pick<
    Estimate,
    'laborItems' | 'materialsMode' | 'quickMaterials' | 'detailedMaterials' | 'adjustment' | 'exchangeRate'
  > = {
    laborItems: [
      { id: 'l1', partId: 'hood', operationType: 'surface_prep', unitPrice: 1000, currency: 'UAH', quantity: 1 },
      { id: 'l2', partId: 'hood', operationType: 'painting', unitPrice: 100, currency: 'USD', quantity: 1 },
    ],
    materialsMode: 'quick',
    quickMaterials: [
      {
        id: 'qm1',
        name: 'Basecoat',
        category: 'basecoat',
        quantity: 200,
        unit: 'ml',
        packageSize: 1000,
        packageUnit: 'ml',
        packagePrice: 50,
        currency: 'USD',
      },
    ],
    detailedMaterials: [],
    adjustment: { kind: 'none', valueType: 'percent', value: 0 },
    exchangeRate: { rate: 40, source: 'manual', updatedAt: '2026-11-01T00:00:00.000Z' },
  };

  // Labor = 1000 + 100*40 = 5000; Materials = (200/1000)*50*40 = 400; Subtotal = 5400
  const noAdj = calculateEstimateTotals(baseEstimate);
  assert.equal(noAdj.laborSubtotalUah, 5000);
  assert.equal(noAdj.materialsSubtotalUah, 400);
  assert.equal(noAdj.totalUah, 5400);

  // 10% discount => -540 => 4860
  const pctDiscount = calculateEstimateTotals({
    ...baseEstimate,
    adjustment: { kind: 'discount', valueType: 'percent', value: 10 },
  });
  assert.equal(pctDiscount.adjustmentAmountUah, -540);
  assert.equal(pctDiscount.totalUah, 4860);

  // 15% markup => +810 => 6210
  const pctMarkup = calculateEstimateTotals({
    ...baseEstimate,
    adjustment: { kind: 'markup', valueType: 'percent', value: 15 },
  });
  assert.equal(pctMarkup.adjustmentAmountUah, 810);
  assert.equal(pctMarkup.totalUah, 6210);

  // Fixed discount larger than subtotal clamps cleanly at 0
  const clampedDiscount = calculateEstimateTotals({
    ...baseEstimate,
    adjustment: { kind: 'discount', valueType: 'fixed_uah', value: 99999 },
  });
  assert.equal(clampedDiscount.totalUah, 0);
});

test('Quick vs Detailed mode switching never double-counts materials', () => {
  const catalog: MaterialCatalogItem[] = [
    {
      id: 'mat_1',
      workshopId: 'ws_1',
      name: 'Basecoat',
      category: 'basecoat',
      packageSize: 1000,
      packageUnit: 'ml',
      packagePrice: 1000,
      currency: 'UAH',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];
  const templates: PartQuickTemplate[] = [
    {
      partId: 'hood',
      workshopId: 'ws_1',
      rules: [{ materialId: 'mat_1', quantity: 250, unit: 'ml' }],
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  const quick = buildQuickMaterialsFromTemplates(['hood'], templates, catalog, 1);
  assert.equal(quick.length, 1);
  assert.equal(quick[0].quantity, 250);

  const detailed: EstimateMaterialItem[] = [
    {
      id: 'det_1',
      materialId: 'mat_1',
      name: 'Basecoat',
      category: 'basecoat',
      quantity: 400,
      unit: 'ml',
      packageSize: 1000,
      packageUnit: 'ml',
      packagePrice: 1000,
      currency: 'UAH',
    },
  ];

  const quickTotals = calculateEstimateTotals({
    laborItems: [],
    materialsMode: 'quick',
    quickMaterials: quick,
    detailedMaterials: detailed,
    adjustment: { kind: 'none', valueType: 'percent', value: 0 },
    exchangeRate: { rate: 41.5, source: 'manual', updatedAt: '2026-11-01T00:00:00.000Z' },
  });
  assert.equal(quickTotals.materialsSubtotalUah, 250);

  const detailedTotals = calculateEstimateTotals({
    laborItems: [],
    materialsMode: 'detailed',
    quickMaterials: quick,
    detailedMaterials: detailed,
    adjustment: { kind: 'none', valueType: 'percent', value: 0 },
    exchangeRate: { rate: 41.5, source: 'manual', updatedAt: '2026-11-01T00:00:00.000Z' },
  });
  assert.equal(detailedTotals.materialsSubtotalUah, 400);
});

test('Historical exchange rate is frozen on save and preserved independently of new rates', () => {
  const draft: Estimate = {
    id: 'est_hist_1',
    estimateNumber: 'EST-20261101-0001',
    workshopId: 'ws_1',
    schemaVersion: 3,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    orderDate: '2026-11-01',
    dueDate: '2026-11-06',
    customerName: 'Test Client',
    vehicleType: 'car',
    vehicleMake: 'Audi',
    vehicleModel: 'A4',
    selectedParts: ['hood'],
    laborItems: [
      { id: 'l1', partId: 'hood', operationType: 'painting', unitPrice: 100, currency: 'USD', quantity: 1 },
    ],
    stages: createDefaultStages(0),
    materialsMode: 'quick',
    quickMaterialMultiplier: 1,
    quickMaterials: [],
    detailedMaterials: [],
    adjustment: { kind: 'none', valueType: 'percent', value: 0 },
    exchangeRate: { rate: 39.5, source: 'nbu', updatedAt: '2026-11-01T09:00:00.000Z' },
    totals: { laborSubtotalUah: 0, materialsSubtotalUah: 0, subtotalBeforeAdjustmentUah: 0, adjustmentAmountUah: 0, totalUah: 0 },
  };

  const saved = prepareEstimateForSave(draft);
  assert.ok(saved.exchangeRate.frozenAt);
  assert.equal(saved.exchangeRate.rate, 39.5);
  assert.equal(saved.totals.totalUah, 3950);

  // Even if global workshop rate later jumps to 45.00, recalculating the saved historical estimate uses its frozen 39.50 rate
  const recomputedHistorical = calculateEstimateTotals(saved);
  assert.equal(recomputedHistorical.totalUah, 3950);
});

test('Vehicle type multipliers & full respray scale material consumption accurately', () => {
  const catalog: MaterialCatalogItem[] = [
    {
      id: 'mat_basecoat',
      workshopId: 'ws_1',
      name: 'Basecoat',
      category: 'basecoat',
      packageSize: 1000,
      packageUnit: 'ml',
      packagePrice: 2000,
      currency: 'UAH',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];
  const templates: PartQuickTemplate[] = [
    {
      partId: 'full_respray',
      workshopId: 'ws_1',
      rules: [{ materialId: 'mat_basecoat', quantity: 2500, unit: 'ml' }],
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  const carQuick = buildQuickMaterialsFromTemplates(
    ['full_respray'],
    templates,
    catalog,
    VEHICLE_TYPE_MULTIPLIER.car
  );
  const vanQuick = buildQuickMaterialsFromTemplates(
    ['full_respray'],
    templates,
    catalog,
    VEHICLE_TYPE_MULTIPLIER.van
  );
  const truckQuick = buildQuickMaterialsFromTemplates(
    ['full_respray'],
    templates,
    catalog,
    VEHICLE_TYPE_MULTIPLIER.truck
  );

  assert.equal(carQuick[0].quantity, 2500);
  assert.equal(vanQuick[0].quantity, 3500);
  assert.equal(truckQuick[0].quantity, 5000);
});

test('Due-soon reminder detects incomplete orders within 2 days and skips completed orders', () => {
  const refNow = new Date(2026, 10, 10, 12, 0, 0); // 2026-11-10 local noon

  assert.equal(getDaysUntilDue('2026-11-12', refNow), 2);
  assert.equal(getDaysUntilDue('2026-11-10', refNow), 0);
  assert.equal(getDaysUntilDue('2026-11-09', refNow), -1);
  assert.equal(getDaysUntilDue('2026-11-13', refNow), 3);

  const makeEst = (id: string, dueDate: string, completedStages: number): Estimate => ({
    id,
    estimateNumber: id,
    workshopId: 'ws_1',
    schemaVersion: 3,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    orderDate: '2026-11-01',
    dueDate,
    customerName: id,
    vehicleType: 'car',
    vehicleMake: 'VW',
    vehicleModel: 'Golf',
    selectedParts: ['hood'],
    laborItems: [],
    stages: createDefaultStages(completedStages),
    materialsMode: 'quick',
    quickMaterialMultiplier: 1,
    quickMaterials: [],
    detailedMaterials: [],
    adjustment: { kind: 'none', valueType: 'percent', value: 0 },
    exchangeRate: { rate: 41.5, source: 'manual', updatedAt: '2026-11-01T10:00:00.000Z' },
    totals: { laborSubtotalUah: 0, materialsSubtotalUah: 0, subtotalBeforeAdjustmentUah: 0, adjustmentAmountUah: 0, totalUah: 0 },
  });

  const completedDueTomorrow = makeEst('done', '2026-11-11', 6);
  const dueInTwoDays = makeEst('two_days', '2026-11-12', 2);
  const overdue = makeEst('overdue', '2026-11-09', 4);
  const futureOrder = makeEst('future', '2026-11-15', 0);

  assert.equal(isEstimateCompleted(completedDueTomorrow), true);
  assert.equal(isEstimateCompleted(dueInTwoDays), false);

  const alerts = getDueSoonEstimates(
    [completedDueTomorrow, dueInTwoDays, overdue, futureOrder],
    refNow
  );
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].estimate.id, 'overdue');
  assert.equal(alerts[1].estimate.id, 'two_days');

  assert.equal(isReminderSnoozed('2026-11-10T18:00:00.000Z', new Date('2026-11-10T16:00:00.000Z')), true);
  assert.equal(isReminderSnoozed('2026-11-10T14:00:00.000Z', new Date('2026-11-10T16:00:00.000Z')), false);
});

test('Dedicated Car, Van, and Truck parts have categories and default material templates', () => {
  const vanParts = VEHICLE_PARTS.filter((p) => p.vehicleTypes.includes('van'));
  const truckParts = VEHICLE_PARTS.filter((p) => p.vehicleTypes.includes('truck'));
  const carParts = VEHICLE_PARTS.filter((p) => p.vehicleTypes.includes('car'));

  assert.ok(carParts.some((p) => p.id === 'trunk_lid'));
  assert.ok(vanParts.some((p) => p.id === 'van_sliding_door_right'));
  assert.ok(vanParts.some((p) => p.id === 'van_high_roof'));
  assert.ok(truckParts.some((p) => p.id === 'truck_cab_roof'));
  assert.ok(truckParts.some((p) => p.id === 'truck_sleeper_left'));
  assert.ok(truckParts.some((p) => p.id === 'truck_side_fairing_right'));

  const templates = buildDefaultPartTemplates();
  assert.equal(templates.length, VEHICLE_PARTS.length);
  for (const part of VEHICLE_PARTS) {
    const tpl = templates.find((item) => item.partId === part.id);
    assert.ok(tpl, `Missing template for ${part.id}`);
    assert.ok(Array.isArray(tpl.rules), `Missing rules array for ${part.id}`);
  }
});

test('Double-sided parts double quick material consumption only for marked parts', () => {
  const catalog: MaterialCatalogItem[] = [
    {
      id: 'mat_base',
      workshopId: 'ws_1',
      name: 'Basecoat',
      category: 'basecoat',
      packageSize: 1000,
      packageUnit: 'ml',
      packagePrice: 1000,
      currency: 'UAH',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];
  const templates: PartQuickTemplate[] = [
    {
      partId: 'hood',
      workshopId: 'ws_1',
      rules: [{ materialId: 'mat_base', quantity: 200, unit: 'ml' }],
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      partId: 'front_bumper',
      workshopId: 'ws_1',
      rules: [{ materialId: 'mat_base', quantity: 150, unit: 'ml' }],
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  const oneSided = buildQuickMaterialsFromTemplates(['hood', 'front_bumper'], templates, catalog, 1, []);
  assert.equal(oneSided[0].quantity, 350);

  const hoodDoubleSided = buildQuickMaterialsFromTemplates(
    ['hood', 'front_bumper'],
    templates,
    catalog,
    1,
    ['hood']
  );
  // hood 200*2 + front_bumper 150*1 = 550
  assert.equal(hoodDoubleSided[0].quantity, 550);
});

test('Deposit summary computes remaining balance, shortfall, and overpayment accurately', () => {
  const partial = calculateDepositSummary(12500.55, {
    expectedUah: 4000,
    receivedUah: 2500.25,
  });
  assert.equal(partial.expectedUah, 4000);
  assert.equal(partial.receivedUah, 2500.25);
  assert.equal(partial.remainingBalanceUah, 10000.3);
  assert.equal(partial.depositShortfallUah, 1499.75);
  assert.equal(partial.overpaidUah, 0);

  const paidInFull = calculateDepositSummary(5000, {
    expectedUah: 2000,
    receivedUah: 5500,
  });
  assert.equal(paidInFull.remainingBalanceUah, 0);
  assert.equal(paidInFull.depositShortfallUah, 0);
  assert.equal(paidInFull.overpaidUah, 500);
});
