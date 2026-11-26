import { calculateEstimateTotals, buildQuickMaterialsFromTemplates } from '../engine/calculations';
import { addDaysToDateString, DEFAULT_STAGE_ORDER, getTodayDateString } from '../services/reminderService';
import {
  AppSettings,
  Estimate,
  EstimateStageItem,
  LaborOperationType,
  MasterLaborOperation,
  MaterialCatalogItem,
  PartQuickTemplate,
  VehiclePartId,
} from '../types/models';
import { VEHICLE_PARTS } from './vehicleParts';

export const DEFAULT_WORKSHOP_ID = 'ws_local_kyiv_01';
export const CURRENT_SCHEMA_VERSION = 3;

const SEED_TIME = '2026-11-01T09:00:00.000Z';

export function createDefaultStages(completedCount = 0): EstimateStageItem[] {
  return DEFAULT_STAGE_ORDER.map((id, idx) => ({
    id,
    completed: idx < completedCount,
    completedAt: idx < completedCount ? SEED_TIME : undefined,
  }));
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app_settings',
  workshopId: DEFAULT_WORKSHOP_ID,
  workshopName: 'АвтоМаляр Сервіс (Зразок)',
  workshopPhone: '+380 67 000 00 00',
  workshopAddress: 'м. Київ, вул. Промислова, 12',
  locale: 'uk',
  theme: 'light',
  currentExchangeRate: {
    rate: 41.5,
    source: 'manual',
    updatedAt: SEED_TIME,
  },
  schemaVersion: CURRENT_SCHEMA_VERSION,
};

export const DEFAULT_LABOR_OPERATIONS: MasterLaborOperation[] = [
  { id: 'op_removal', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'removal', basePrice: 600, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_installation', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'installation', basePrice: 600, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_disassembly', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'disassembly', basePrice: 450, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_assembly', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'assembly', basePrice: 450, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_surface_prep', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'surface_prep', basePrice: 1400, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_painting', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'painting', basePrice: 85, currency: 'USD', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_dent_repair', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'dent_repair', basePrice: 1800, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_plastic_repair', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'plastic_repair', basePrice: 1200, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
  { id: 'op_polishing', workshopId: DEFAULT_WORKSHOP_ID, operationType: 'polishing', basePrice: 700, currency: 'UAH', isSample: true, updatedAt: SEED_TIME },
];

export const DEFAULT_SEED_MATERIAL_IDS = [
  'mat_basecoat',
  'mat_clearcoat',
  'mat_hardener',
  'mat_primer',
  'mat_filler',
  'mat_thinner',
  'mat_sandpaper',
  'mat_masking',
  'mat_degreaser',
] as const;

export const DEFAULT_MATERIALS_CATALOG: MaterialCatalogItem[] = [];

export function buildDefaultPartTemplates(): PartQuickTemplate[] {
  return VEHICLE_PARTS.map((part) => ({
    partId: part.id,
    workshopId: DEFAULT_WORKSHOP_ID,
    updatedAt: SEED_TIME,
    rules: [],
  }));
}

export function buildSampleEstimates(): Estimate[] {
  const today = getTodayDateString();
  const dueInTwoDays = addDaysToDateString(today, 2);
  const orderThreeDaysAgo = addDaysToDateString(today, -3);

  // Sample 1: Historical estimate saved at an earlier frozen rate (40.20 UAH/USD), completed all stages
  const parts1: VehiclePartId[] = ['front_bumper', 'front_left_fender'];
  const est1Base: Omit<Estimate, 'totals'> = {
    id: 'est_sample_001',
    estimateNumber: 'EST-20261028-1001',
    workshopId: DEFAULT_WORKSHOP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: '2026-10-28T11:20:00.000Z',
    updatedAt: '2026-10-28T11:35:00.000Z',
    orderDate: '2026-10-28',
    dueDate: '2026-11-02',
    orderPhase: 'final',
    deposit: { expectedUah: 3000, receivedUah: 3000, receivedAt: '2026-10-28T11:35:00.000Z' },
    customerName: 'Олександр Коваленко [Зразок]',
    customerPhone: '+380 50 123 45 67',
    vehicleType: 'car',
    vehicleMake: 'Volkswagen',
    vehicleModel: 'Passat B8',
    vehicleYear: '2019',
    vehicleColor: 'LC9X Deep Black',
    notes: 'Демонстраційний розрахунок із зафіксованим історичним курсом 40.20 ₴/$.',
    selectedParts: parts1,
    doubleSidedParts: [],
    laborItems: [
      { id: 'l_1', partId: 'front_bumper', operationType: 'removal', unitPrice: 600, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_2', partId: 'front_bumper', operationType: 'plastic_repair', unitPrice: 1200, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_3', partId: 'front_bumper', operationType: 'surface_prep', unitPrice: 1400, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_4', partId: 'front_bumper', operationType: 'painting', unitPrice: 85, currency: 'USD', quantity: 1, completed: true },
      { id: 'l_5', partId: 'front_bumper', operationType: 'installation', unitPrice: 600, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_6', partId: 'front_left_fender', operationType: 'surface_prep', unitPrice: 1400, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_7', partId: 'front_left_fender', operationType: 'painting', unitPrice: 80, currency: 'USD', quantity: 1, isPriceOverridden: true, masterBasePrice: 85, masterCurrency: 'USD', completed: true },
    ],
    stages: createDefaultStages(6),
    materialsMode: 'quick',
    quickMaterialMultiplier: 1,
    quickMaterials: [],
    detailedMaterials: [],
    adjustment: { kind: 'discount', valueType: 'percent', value: 5 },
    exchangeRate: {
      rate: 40.2,
      source: 'nbu',
      updatedAt: '2026-10-28T09:00:00.000Z',
      frozenAt: '2026-10-28T11:35:00.000Z',
    },
    isSample: true,
  };

  const est1Total = calculateEstimateTotals(est1Base);
  const est1: Estimate = {
    ...est1Base,
    preliminaryTotalUah: est1Total.totalUah,
    preliminaryLockedAt: '2026-10-28T11:35:00.000Z',
    totals: est1Total,
  };

  // Sample 2: Active Van/Bus order due in 2 days with 3/6 stages completed (triggers 2-day reminder demo)
  const parts2: VehiclePartId[] = ['rear_right_door', 'rear_right_quarter'];
  const est2Base: Omit<Estimate, 'totals'> = {
    id: 'est_sample_002',
    estimateNumber: 'EST-20261114-1002',
    workshopId: DEFAULT_WORKSHOP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: '2026-11-14T14:10:00.000Z',
    updatedAt: '2026-11-14T14:30:00.000Z',
    orderDate: orderThreeDaysAgo,
    dueDate: dueInTwoDays,
    orderPhase: 'preliminary',
    deposit: { expectedUah: 5000, receivedUah: 2000, receivedAt: '2026-11-14T14:30:00.000Z' },
    customerName: 'Ірина Савченко [Зразок]',
    customerPhone: '+380 93 555 12 34',
    vehicleType: 'van',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'Sprinter',
    vehicleYear: '2021',
    vehicleColor: '9147 Arctic White',
    notes: 'Розрахунок для буса, здача замовлення через 2 дні.',
    selectedParts: parts2,
    doubleSidedParts: [],
    laborItems: [
      { id: 'l_21', partId: 'rear_right_door', operationType: 'disassembly', unitPrice: 450, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_22', partId: 'rear_right_door', operationType: 'dent_repair', unitPrice: 1800, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_23', partId: 'rear_right_door', operationType: 'painting', unitPrice: 115, currency: 'USD', quantity: 1, isPriceOverridden: true, masterBasePrice: 85, masterCurrency: 'USD', completed: false },
      { id: 'l_24', partId: 'rear_right_door', operationType: 'assembly', unitPrice: 450, currency: 'UAH', quantity: 1, completed: false },
      { id: 'l_25', partId: 'rear_right_quarter', operationType: 'surface_prep', unitPrice: 1400, currency: 'UAH', quantity: 1, completed: true },
      { id: 'l_26', partId: 'rear_right_quarter', operationType: 'painting', unitPrice: 115, currency: 'USD', quantity: 1, isPriceOverridden: true, masterBasePrice: 85, masterCurrency: 'USD', completed: false },
      { id: 'l_27', partId: 'rear_right_quarter', operationType: 'polishing', unitPrice: 700, currency: 'UAH', quantity: 1, completed: false },
    ],
    stages: createDefaultStages(3),
    materialsMode: 'quick',
    quickMaterialMultiplier: 1.4,
    quickMaterials: [],
    detailedMaterials: [],
    adjustment: { kind: 'none', valueType: 'percent', value: 0 },
    exchangeRate: {
      rate: 41.5,
      source: 'manual',
      updatedAt: SEED_TIME,
      frozenAt: '2026-11-14T14:30:00.000Z',
    },
    isSample: true,
  };

  const est2: Estimate = {
    ...est2Base,
    totals: calculateEstimateTotals(est2Base),
  };

  return [est2, est1];
}

export const ALL_STANDARD_OPERATIONS: LaborOperationType[] = [
  'removal',
  'installation',
  'disassembly',
  'assembly',
  'surface_prep',
  'painting',
  'dent_repair',
  'plastic_repair',
  'polishing',
];
