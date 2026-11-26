export type LocaleCode = 'uk' | 'ru';
export type ThemeMode = 'light' | 'dark' | 'system';
export type CurrencyCode = 'UAH' | 'USD';

export type VehicleType = 'car' | 'van' | 'truck';

export type VehicleView = 'top' | 'front' | 'rear' | 'left' | 'right';

export type VehiclePartId =
  | 'full_respray'
  | 'front_bumper'
  | 'rear_bumper'
  | 'hood'
  | 'hood_inner'
  | 'roof'
  | 'trunk_lid'
  | 'trunk_jamb'
  | 'front_left_fender'
  | 'front_right_fender'
  | 'rear_left_quarter'
  | 'rear_right_quarter'
  | 'front_left_door'
  | 'front_right_door'
  | 'rear_left_door'
  | 'rear_right_door'
  | 'front_left_jamb'
  | 'front_right_jamb'
  | 'rear_left_jamb'
  | 'rear_right_jamb'
  | 'left_a_pillar'
  | 'right_a_pillar'
  | 'left_c_pillar'
  | 'right_c_pillar'
  | 'front_left_arch'
  | 'front_right_arch'
  | 'rear_left_arch'
  | 'rear_right_arch'
  | 'left_mirror'
  | 'right_mirror'
  | 'left_sill'
  | 'right_sill'
  | 'front_grille'
  | 'rear_spoiler'
  | 'fuel_door'
  // Van-specific parts
  | 'van_high_roof'
  | 'van_sliding_door_left'
  | 'van_sliding_door_right'
  | 'van_left_upper_panel'
  | 'van_right_upper_panel'
  | 'van_rear_left_door'
  | 'van_rear_right_door'
  // Truck-specific parts
  | 'truck_cab_roof'
  | 'truck_visor'
  | 'truck_front_panel'
  | 'truck_sleeper_left'
  | 'truck_sleeper_right'
  | 'truck_side_fairing_left'
  | 'truck_side_fairing_right'
  | 'truck_fender_left'
  | 'truck_fender_right'
  | 'truck_step_left'
  | 'truck_step_right'
  | 'truck_rear_wall';

export type PartGroupCategory =
  | 'full'
  | 'front'
  | 'top'
  | 'side_left'
  | 'side_right'
  | 'rear'
  | 'openings';

export interface VehiclePartDefinition {
  id: VehiclePartId;
  category: PartGroupCategory;
  vehicleTypes: VehicleType[];
  views: VehicleView[];
  /** Relative painting area coefficient (1.0 = standard door/fender) */
  defaultAreaFactor: number;
}

export type EstimateStageId =
  | 'disassembly'
  | 'bodywork'
  | 'prep'
  | 'painting'
  | 'polishing'
  | 'assembly';

export interface EstimateStageItem {
  id: EstimateStageId;
  completed: boolean;
  completedAt?: string;
}

export type StandardLaborOperationType =
  | 'removal'
  | 'installation'
  | 'disassembly'
  | 'assembly'
  | 'surface_prep'
  | 'painting'
  | 'dent_repair'
  | 'plastic_repair'
  | 'polishing';

export type LaborOperationType = StandardLaborOperationType | 'custom';

export interface MasterLaborOperation {
  id: string;
  workshopId: string;
  operationType: LaborOperationType;
  /** Custom name when operationType === 'custom' or override display label */
  customName?: string;
  basePrice: number;
  currency: CurrencyCode;
  isSample?: boolean;
  updatedAt: string;
}

export interface EstimateLaborItem {
  id: string;
  partId: VehiclePartId;
  operationType: LaborOperationType;
  /** Required when operationType === 'custom' */
  customName?: string;
  /** Price in item's currency (can be overridden for this estimate without affecting master list) */
  unitPrice: number;
  currency: CurrencyCode;
  quantity: number;
  /** True if user manually overrode the master price for this estimate */
  isPriceOverridden?: boolean;
  masterBasePrice?: number;
  masterCurrency?: CurrencyCode;
  completed?: boolean;
  completedAt?: string;
}

export type MaterialCategory =
  | 'basecoat'
  | 'clearcoat'
  | 'primer'
  | 'filler'
  | 'hardener'
  | 'thinner'
  | 'sandpaper'
  | 'masking'
  | 'other';

export type MaterialUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export interface MaterialCatalogItem {
  id: string;
  workshopId: string;
  name: string;
  category: MaterialCategory;
  /** Package size in packageUnit (e.g. 1000 ml, 1 l, 500 g, 1 pcs) */
  packageSize: number;
  packageUnit: MaterialUnit;
  packagePrice: number;
  currency: CurrencyCode;
  isCustom?: boolean;
  isSample?: boolean;
  updatedAt: string;
}

export interface PartMaterialConsumptionRule {
  materialId: string;
  quantity: number;
  unit: MaterialUnit;
}

export interface PartQuickTemplate {
  partId: VehiclePartId;
  workshopId: string;
  rules: PartMaterialConsumptionRule[];
  updatedAt: string;
}

export type MaterialsCalculationMode = 'quick' | 'detailed';

export interface EstimateMaterialItem {
  id: string;
  materialId?: string;
  name: string;
  category: MaterialCategory;
  /** Consumption quantity in `unit` */
  quantity: number;
  unit: MaterialUnit;
  /** Package reference used for proportional cost calculation */
  packageSize: number;
  packageUnit: MaterialUnit;
  packagePrice: number;
  currency: CurrencyCode;
  /** Optional part association (used especially in quick mode) */
  partId?: VehiclePartId;
  isCustom?: boolean;
}

export type AdjustmentKind = 'none' | 'discount' | 'markup';
export type AdjustmentValueType = 'percent' | 'fixed_uah';

export interface PriceAdjustment {
  kind: AdjustmentKind;
  valueType: AdjustmentValueType;
  value: number;
}

export type ExchangeRateSource = 'nbu' | 'manual' | 'cached';

export interface ExchangeRateSnapshot {
  rate: number; // UAH per 1 USD
  source: ExchangeRateSource;
  updatedAt: string;
  frozenAt?: string;
}

export type OrderPhase = 'preliminary' | 'final';

export interface DepositInfo {
  /** Planned / agreed deposit in UAH */
  expectedUah: number;
  /** Actually received deposit in UAH */
  receivedUah: number;
  /** ISO date/time when actual deposit was received/updated */
  receivedAt?: string;
  /** Optional payment method or comment */
  note?: string;
}

export interface EstimateTotals {
  laborSubtotalUah: number;
  materialsSubtotalUah: number;
  subtotalBeforeAdjustmentUah: number;
  adjustmentAmountUah: number; // negative for discount, positive for markup
  totalUah: number;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  workshopId: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  /** Date order was accepted (YYYY-MM-DD) */
  orderDate: string;
  /** Planned completion / delivery date (YYYY-MM-DD) */
  dueDate?: string;
  /** Order workflow stage: preliminary estimate vs final total */
  orderPhase?: OrderPhase;
  /** Locked preliminary estimate total in UAH before final adjustments */
  preliminaryTotalUah?: number;
  /** ISO timestamp when preliminary estimate total was frozen */
  preliminaryLockedAt?: string;
  /** Prepayment / deposit tracking */
  deposit?: DepositInfo;
  customerName: string;
  customerPhone?: string;
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: string;
  vehicleColor?: string;
  notes?: string;
  selectedParts: VehiclePartId[];
  /** Parts requiring painting on both sides (doubles quick material usage & defaults painting qty to 2) */
  doubleSidedParts?: VehiclePartId[];
  laborItems: EstimateLaborItem[];
  stages: EstimateStageItem[];
  materialsMode: MaterialsCalculationMode;
  /** Quick mode multiplier (default 1.0, scaled for car/van/truck or metallic/SUV) */
  quickMaterialMultiplier: number;
  quickMaterials: EstimateMaterialItem[];
  detailedMaterials: EstimateMaterialItem[];
  adjustment: PriceAdjustment;
  /** Frozen exchange rate captured when estimate was saved */
  exchangeRate: ExchangeRateSnapshot;
  /** Stored totals computed deterministically with the frozen rate */
  totals: EstimateTotals;
  isSample?: boolean;
}

export interface AppSettings {
  id: 'app_settings';
  workshopId: string;
  workshopName: string;
  workshopPhone?: string;
  workshopAddress?: string;
  locale: LocaleCode;
  theme: ThemeMode;
  currentExchangeRate: ExchangeRateSnapshot;
  /** ISO timestamp until which the 2-day deadline reminder popup is snoozed */
  reminderSnoozedUntil?: string;
  schemaVersion: number;
}

export interface BackupPayload {
  app: 'AutoPaintCalc';
  schemaVersion: number;
  exportedAt: string;
  workshopId: string;
  settings: AppSettings;
  estimates: Estimate[];
  materials: MaterialCatalogItem[];
  laborPrices: MasterLaborOperation[];
  partTemplates: PartQuickTemplate[];
}
