import React, { useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Cloud,
  CloudOff,
  FileText,
  Layers,
  Loader2,
  Lock,
  LogIn,
  Paintbrush,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share2,
  Trash2,
  Truck,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { NumericInput } from '../components/NumericInput';
import { VehicleDiagramSvg } from '../components/VehicleDiagramSvg';
import {
  ALL_STANDARD_OPERATIONS,
  createDefaultStages,
} from '../data/seedData';
import {
  PART_GROUP_ORDER,
  VEHICLE_PARTS,
  VEHICLE_TYPE_MULTIPLIER,
} from '../data/vehicleParts';
import {
  buildQuickMaterialsFromTemplates,
  calculateDepositSummary,
  calculateEstimateTotals,
  calculateLaborItemTotalUah,
  calculateMaterialItemCostUah,
  convertUahToUsd,
  isDuplicateLaborOperation,
} from '../engine/calculations';
import { TranslationDictionary } from '../i18n/translations';
import {
  formatDateShort,
  formatDateTime,
  formatUah,
  formatUsd,
} from '../services/currencyService';
import { shareEstimatePdfDocument } from '../services/pdfExportService';
import { addDaysToDateString } from '../services/reminderService';
import {
  AdjustmentKind,
  AdjustmentValueType,
  AppSettings,
  CurrencyCode,
  DepositInfo,
  Estimate,
  EstimateLaborItem,
  EstimateMaterialItem,
  EstimateStageId,
  ExchangeRateSnapshot,
  LaborOperationType,
  LocaleCode,
  MasterLaborOperation,
  MaterialCatalogItem,
  MaterialCategory,
  MaterialUnit,
  OrderPhase,
  PartGroupCategory,
  PartQuickTemplate,
  VehiclePartDefinition,
  VehiclePartId,
  VehicleType,
  VehicleView,
} from '../types/models';

interface NewEstimateScreenProps {
  draft: Estimate;
  isEditingExisting: boolean;
  settings: AppSettings;
  masterLabor: MasterLaborOperation[];
  materialsCatalog: MaterialCatalogItem[];
  partTemplates: PartQuickTemplate[];
  currentWorkshopRate: ExchangeRateSnapshot;
  locale: LocaleCode;
  authUser: FirebaseUser | null;
  isSigningIn: boolean;
  cloudSyncState: 'idle' | 'syncing' | 'synced' | 'error';
  cloudError?: string | null;
  t: TranslationDictionary;
  onChangeDraft: (next: Estimate) => void;
  onSaveEstimate: (est: Estimate) => Promise<boolean>;
  onOpenCustomerView: (est: Estimate) => void;
  onSignInGoogle: () => void;
}

type EditorStep = 'client' | 'parts' | 'labor' | 'materials' | 'stages' | 'summary';

const VEHICLE_VIEWS: VehicleView[] = ['top', 'front', 'rear', 'left', 'right'];
const ALL_UNITS: MaterialUnit[] = ['g', 'kg', 'ml', 'l', 'pcs'];
const VEHICLE_TYPES: VehicleType[] = ['car', 'van', 'truck'];

export const NewEstimateScreen: React.FC<NewEstimateScreenProps> = ({
  draft,
  isEditingExisting,
  settings,
  masterLabor,
  materialsCatalog,
  partTemplates,
  currentWorkshopRate,
  locale,
  authUser,
  isSigningIn,
  cloudSyncState,
  cloudError,
  t,
  onChangeDraft,
  onSaveEstimate,
  onOpenCustomerView,
  onSignInGoogle,
}) => {
  const [activeStep, setActiveStep] = useState<EditorStep>('parts');
  const [vehicleView, setVehicleView] = useState<VehicleView>('top');
  const [partsUiMode, setPartsUiMode] = useState<'diagram' | 'list'>('diagram');
  const [partSearch, setPartSearch] = useState('');
  const [partGroupFilter, setPartGroupFilter] = useState<PartGroupCategory | 'all'>('all');
  const [lastTappedPart, setLastTappedPart] = useState<VehiclePartId | null>(null);
  const [customOpByPart, setCustomOpByPart] = useState<Record<string, string>>({});
  const [duplicateWarningPart, setDuplicateWarningPart] = useState<VehiclePartId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMode, setSavedMode] = useState<'cloud' | 'local' | null>(null);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Custom material form inside detailed mode
  const [showCustomMatForm, setShowCustomMatForm] = useState(false);
  const [customMatName, setCustomMatName] = useState('');
  const [customMatCategory, setCustomMatCategory] = useState<MaterialCategory>('other');
  const [customMatQty, setCustomMatQty] = useState(100);
  const [customMatUnit, setCustomMatUnit] = useState<MaterialUnit>('ml');
  const [customMatPackSize, setCustomMatPackSize] = useState(1000);
  const [customMatPackUnit, setCustomMatPackUnit] = useState<MaterialUnit>('ml');
  const [customMatPackPrice, setCustomMatPackPrice] = useState(500);
  const [customMatCurrency, setCustomMatCurrency] = useState<CurrencyCode>('UAH');

  const totals = useMemo(() => calculateEstimateTotals(draft), [draft]);
  const rate = draft.exchangeRate.rate;
  const orderPhase: OrderPhase = draft.orderPhase === 'final' ? 'final' : 'preliminary';
  const isFinalPhase = orderPhase === 'final';
  const doubleSidedParts = draft.doubleSidedParts ?? [];
  const doubleSidedSet = useMemo(() => new Set(doubleSidedParts), [doubleSidedParts]);
  const deposit: DepositInfo = draft.deposit ?? { expectedUah: 0, receivedUah: 0 };
  const depositSummary = useMemo(
    () => calculateDepositSummary(totals.totalUah, deposit),
    [totals.totalUah, deposit]
  );
  const formatPhaseMoney = (amountUah: number) =>
    isFinalPhase
      ? formatUah(amountUah, locale)
      : formatUsd(convertUahToUsd(amountUah, rate), locale);

  const updateDraftWithTotals = (partial: Partial<Estimate>) => {
    const merged: Estimate = {
      ...draft,
      ...partial,
    };
    merged.totals = calculateEstimateTotals(merged);
    onChangeDraft(merged);
  };

  const handleChangeOrderPhase = (nextPhase: OrderPhase) => {
    if (nextPhase === orderPhase) return;
    if (nextPhase === 'final') {
      const shouldAutoSnapshot =
        draft.preliminaryTotalUah === undefined || draft.preliminaryTotalUah === 0;
      updateDraftWithTotals({
        orderPhase: 'final',
        preliminaryTotalUah: shouldAutoSnapshot ? totals.totalUah : draft.preliminaryTotalUah,
        preliminaryLockedAt: shouldAutoSnapshot
          ? new Date().toISOString()
          : draft.preliminaryLockedAt,
      });
    } else {
      updateDraftWithTotals({ orderPhase: 'preliminary' });
    }
  };

  const handleLockPreliminary = () => {
    updateDraftWithTotals({
      preliminaryTotalUah: totals.totalUah,
      preliminaryLockedAt: new Date().toISOString(),
    });
  };

  const handleUpdateDeposit = (patch: Partial<DepositInfo>) => {
    const nextReceived =
      patch.receivedUah !== undefined ? Math.max(0, patch.receivedUah) : deposit.receivedUah;
    const nextExpected =
      patch.expectedUah !== undefined ? Math.max(0, patch.expectedUah) : deposit.expectedUah;
    const nextReceivedAt =
      patch.receivedAt !== undefined
        ? patch.receivedAt
        : nextReceived > 0 && patch.receivedUah !== undefined
          ? new Date().toISOString()
          : nextReceived === 0
            ? undefined
            : deposit.receivedAt;
    updateDraftWithTotals({
      deposit: {
        ...deposit,
        ...patch,
        expectedUah: nextExpected,
        receivedUah: nextReceived,
        receivedAt: nextReceivedAt,
      },
    });
  };

  const partOperationCounts = useMemo(() => {
    const map: Partial<Record<VehiclePartId, number>> = {};
    for (const item of draft.laborItems) {
      map[item.partId] = (map[item.partId] ?? 0) + 1;
    }
    return map;
  }, [draft.laborItems]);

  const stages = useMemo(
    () => (draft.stages && draft.stages.length > 0 ? draft.stages : createDefaultStages(0)),
    [draft.stages]
  );
  const completedStagesCount = stages.filter((s) => s.completed).length;
  const isFullResprayActive = draft.selectedParts.includes('full_respray');

  const handleChangeVehicleType = (nextType: VehicleType) => {
    const nextMult = VEHICLE_TYPE_MULTIPLIER[nextType];
    const nextQuickMaterials = buildQuickMaterialsFromTemplates(
      draft.selectedParts,
      partTemplates,
      materialsCatalog,
      nextMult,
      doubleSidedParts
    );
    updateDraftWithTotals({
      vehicleType: nextType,
      quickMaterialMultiplier: nextMult,
      quickMaterials: nextQuickMaterials,
    });
  };

  const handleToggleFullRespray = () => {
    setLastTappedPart('full_respray');
    const nextParts: VehiclePartId[] = isFullResprayActive ? [] : ['full_respray'];
    const nextLabor = draft.laborItems.filter((item) => nextParts.includes(item.partId));
    const nextQuickMaterials = buildQuickMaterialsFromTemplates(
      nextParts,
      partTemplates,
      materialsCatalog,
      draft.quickMaterialMultiplier,
      []
    );
    updateDraftWithTotals({
      selectedParts: nextParts,
      doubleSidedParts: [],
      laborItems: nextLabor,
      quickMaterials: nextQuickMaterials,
    });
  };

  const handleTogglePart = (partId: VehiclePartId) => {
    if (partId === 'full_respray') {
      handleToggleFullRespray();
      return;
    }
    setLastTappedPart(partId);
    const baseSelected: VehiclePartId[] = draft.selectedParts.filter(
      (id) => id !== 'full_respray'
    );
    const exists = baseSelected.includes(partId);
    const nextParts: VehiclePartId[] = exists
      ? baseSelected.filter((id) => id !== partId)
      : [...baseSelected, partId];

    const nextDoubleSided = doubleSidedParts.filter((id) => nextParts.includes(id));
    const nextLabor = draft.laborItems.filter((item) => nextParts.includes(item.partId));

    const nextQuickMaterials = buildQuickMaterialsFromTemplates(
      nextParts,
      partTemplates,
      materialsCatalog,
      draft.quickMaterialMultiplier,
      nextDoubleSided
    );

    updateDraftWithTotals({
      selectedParts: nextParts,
      doubleSidedParts: nextDoubleSided,
      laborItems: nextLabor,
      quickMaterials: nextQuickMaterials,
    });
  };

  const handleToggleDoubleSidedPart = (partId: VehiclePartId) => {
    if (partId === 'full_respray') return;
    const isCurrentlyDouble = doubleSidedSet.has(partId);
    const nextDoubleSided = isCurrentlyDouble
      ? doubleSidedParts.filter((id) => id !== partId)
      : [...doubleSidedParts, partId];

    const nextLabor = draft.laborItems.map((item) => {
      if (item.partId === partId && item.operationType === 'painting') {
        if (!isCurrentlyDouble && item.quantity === 1) {
          return { ...item, quantity: 2 };
        }
        if (isCurrentlyDouble && item.quantity === 2) {
          return { ...item, quantity: 1 };
        }
      }
      return item;
    });

    const nextQuickMaterials = buildQuickMaterialsFromTemplates(
      draft.selectedParts,
      partTemplates,
      materialsCatalog,
      draft.quickMaterialMultiplier,
      nextDoubleSided
    );

    updateDraftWithTotals({
      doubleSidedParts: nextDoubleSided,
      laborItems: nextLabor,
      quickMaterials: nextQuickMaterials,
    });
  };

  const handleToggleStage = (stageId: EstimateStageId) => {
    const nextStages = stages.map((st) => {
      if (st.id !== stageId) return st;
      const nextCompleted = !st.completed;
      return {
        ...st,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : undefined,
      };
    });
    updateDraftWithTotals({ stages: nextStages });
  };

  const handleClearParts = () => {
    updateDraftWithTotals({
      selectedParts: [],
      doubleSidedParts: [],
      laborItems: [],
      quickMaterials: [],
    });
  };

  const currentVehicleType: VehicleType = draft.vehicleType ?? 'car';

  const compatibleZoneParts = useMemo(
    () =>
      VEHICLE_PARTS.filter(
        (p) => p.category !== 'full' && p.vehicleTypes.includes(currentVehicleType)
      ),
    [currentVehicleType]
  );

  const selectedCountByGroup = useMemo(() => {
    const counts: Partial<Record<PartGroupCategory, number>> = {};
    for (const part of compatibleZoneParts) {
      if (draft.selectedParts.includes(part.id)) {
        counts[part.category] = (counts[part.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [compatibleZoneParts, draft.selectedParts]);

  const groupedParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    const groupsToShow =
      partGroupFilter === 'all' ? PART_GROUP_ORDER : [partGroupFilter];

    const sections: Array<{
      category: PartGroupCategory;
      parts: VehiclePartDefinition[];
    }> = [];

    for (const cat of groupsToShow) {
      const items = compatibleZoneParts.filter((p) => {
        if (p.category !== cat) return false;
        if (!q) return true;
        return t.parts[p.id].toLowerCase().includes(q);
      });
      if (items.length > 0) {
        sections.push({ category: cat, parts: items });
      }
    }

    return sections;
  }, [compatibleZoneParts, partGroupFilter, partSearch, t]);

  const getMasterOp = (opType: LaborOperationType, customName?: string): MasterLaborOperation | undefined => {
    if (opType !== 'custom') {
      return masterLabor.find((m) => m.operationType === opType);
    }
    return masterLabor.find(
      (m) => m.operationType === 'custom' && m.customName === customName
    );
  };

  const handleAddLaborOperation = (
    partId: VehiclePartId,
    opType: LaborOperationType,
    customName?: string
  ) => {
    if (isDuplicateLaborOperation(draft.laborItems, partId, opType, customName)) {
      setDuplicateWarningPart(partId);
      setTimeout(() => setDuplicateWarningPart(null), 2500);
      return;
    }

    const master = getMasterOp(opType, customName);
    const basePrice = master?.basePrice ?? 500;
    const currency = master?.currency ?? 'UAH';
    const defaultQuantity =
      opType === 'painting' && doubleSidedSet.has(partId) ? 2 : 1;

    const newItem: EstimateLaborItem = {
      id: `lab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      partId,
      operationType: opType,
      customName: opType === 'custom' ? customName?.trim() : undefined,
      unitPrice: basePrice,
      currency,
      quantity: defaultQuantity,
      isPriceOverridden: false,
      masterBasePrice: basePrice,
      masterCurrency: currency,
    };

    updateDraftWithTotals({
      laborItems: [...draft.laborItems, newItem],
    });
  };

  const handleToggleLaborOperation = (
    partId: VehiclePartId,
    opType: LaborOperationType,
    customName?: string
  ) => {
    if (isDuplicateLaborOperation(draft.laborItems, partId, opType, customName)) {
      const normalizedCustom = (customName ?? '').trim().toLowerCase();
      const nextLabor = draft.laborItems.filter((item) => {
        if (item.partId !== partId) return true;
        if (opType !== 'custom') {
          return item.operationType !== opType;
        }
        return !(
          item.operationType === 'custom' &&
          (item.customName ?? '').trim().toLowerCase() === normalizedCustom
        );
      });
      updateDraftWithTotals({ laborItems: nextLabor });
      return;
    }

    handleAddLaborOperation(partId, opType, customName);
  };

  const handleUpdateLaborItem = (id: string, patch: Partial<EstimateLaborItem>) => {
    const nextLabor = draft.laborItems.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, ...patch };
      const isOverridden =
        updated.masterBasePrice !== undefined &&
        (updated.unitPrice !== updated.masterBasePrice ||
          updated.currency !== updated.masterCurrency);
      return { ...updated, isPriceOverridden: isOverridden };
    });
    updateDraftWithTotals({ laborItems: nextLabor });
  };

  const handleRestoreLaborMaster = (id: string) => {
    const nextLabor = draft.laborItems.map((item) => {
      if (item.id !== id || item.masterBasePrice === undefined || !item.masterCurrency) return item;
      return {
        ...item,
        unitPrice: item.masterBasePrice,
        currency: item.masterCurrency,
        isPriceOverridden: false,
      };
    });
    updateDraftWithTotals({ laborItems: nextLabor });
  };

  const handleDeleteLaborItem = (id: string) => {
    updateDraftWithTotals({
      laborItems: draft.laborItems.filter((item) => item.id !== id),
    });
  };

  const handleQuickMultiplierChange = (mult: number) => {
    const safeMult = mult > 0 ? mult : 1;
    const nextQuick = buildQuickMaterialsFromTemplates(
      draft.selectedParts,
      partTemplates,
      materialsCatalog,
      safeMult,
      doubleSidedParts
    );
    updateDraftWithTotals({
      quickMaterialMultiplier: safeMult,
      quickMaterials: nextQuick,
    });
  };

  const handleRecalculateQuickFromTemplates = () => {
    const nextQuick = buildQuickMaterialsFromTemplates(
      draft.selectedParts,
      partTemplates,
      materialsCatalog,
      draft.quickMaterialMultiplier,
      doubleSidedParts
    );
    updateDraftWithTotals({ quickMaterials: nextQuick });
  };

  const handleSwitchMaterialsMode = (mode: 'quick' | 'detailed') => {
    if (mode === draft.materialsMode) return;
    if (mode === 'detailed' && draft.detailedMaterials.length === 0 && draft.quickMaterials.length > 0) {
      // Seed detailed list from quick list once for convenience (zero double counting because calculateEstimateTotals uses ONLY active mode)
      const seededDetailed = draft.quickMaterials.map((m) => ({
        ...m,
        id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }));
      updateDraftWithTotals({
        materialsMode: 'detailed',
        detailedMaterials: seededDetailed,
      });
      return;
    }
    updateDraftWithTotals({ materialsMode: mode });
  };

  const handleUpdateMaterialItem = (
    mode: 'quick' | 'detailed',
    id: string,
    patch: Partial<EstimateMaterialItem>
  ) => {
    if (mode === 'quick') {
      updateDraftWithTotals({
        quickMaterials: draft.quickMaterials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      });
    } else {
      updateDraftWithTotals({
        detailedMaterials: draft.detailedMaterials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      });
    }
  };

  const handleDeleteDetailedMaterial = (id: string) => {
    updateDraftWithTotals({
      detailedMaterials: draft.detailedMaterials.filter((m) => m.id !== id),
    });
  };

  const handleAddDetailedFromCatalog = (materialId: string) => {
    if (!materialId) return;
    const cat = materialsCatalog.find((m) => m.id === materialId);
    if (!cat) return;
    const defaultUnit: MaterialUnit =
      cat.packageUnit === 'l' ? 'ml' : cat.packageUnit === 'kg' ? 'g' : cat.packageUnit;
    const defaultQty = defaultUnit === 'pcs' ? 1 : 100;
    const item: EstimateMaterialItem = {
      id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      materialId: cat.id,
      name: cat.name,
      category: cat.category,
      quantity: defaultQty,
      unit: defaultUnit,
      packageSize: cat.packageSize,
      packageUnit: cat.packageUnit,
      packagePrice: cat.packagePrice,
      currency: cat.currency,
      isCustom: cat.isCustom,
    };
    updateDraftWithTotals({
      detailedMaterials: [...draft.detailedMaterials, item],
    });
  };

  const handleAddCustomDetailedMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMatName.trim()) return;
    const item: EstimateMaterialItem = {
      id: `det_custom_${Date.now()}`,
      name: customMatName.trim(),
      category: customMatCategory,
      quantity: customMatQty || 0,
      unit: customMatUnit,
      packageSize: customMatPackSize || 1,
      packageUnit: customMatPackUnit,
      packagePrice: customMatPackPrice || 0,
      currency: customMatCurrency,
      isCustom: true,
    };
    updateDraftWithTotals({
      detailedMaterials: [...draft.detailedMaterials, item],
    });
    setCustomMatName('');
    setShowCustomMatForm(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const syncedToCloud = await onSaveEstimate(draft);
      setSavedMode(syncedToCloud ? 'cloud' : 'local');
      window.setTimeout(() => setSavedMode(null), 3200);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSharePdfDirect = async () => {
    setIsSharingPdf(true);
    setShareFeedback(null);
    try {
      const outcome = await shareEstimatePdfDocument(draft, settings, t);
      if (outcome === 'downloaded_fallback') {
        setShareFeedback({ type: 'ok', text: t.customerEstimate.shareFallbackDownloaded });
      }
    } catch {
      setShareFeedback({ type: 'err', text: t.customerEstimate.pdfError });
    } finally {
      setIsSharingPdf(false);
    }
  };

  const steps: { id: EditorStep; label: string; icon: React.ReactNode }[] = [
    { id: 'parts', label: t.estimate.stepParts, icon: <Check className="w-3.5 h-3.5" /> },
    { id: 'labor', label: t.estimate.stepLabor, icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'materials', label: t.estimate.stepMaterials, icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'client', label: t.estimate.stepClient, icon: <User className="w-3.5 h-3.5" /> },
    { id: 'stages', label: t.estimate.stepStages, icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
    { id: 'summary', label: t.estimate.stepSummary, icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  const customMasterPresets = masterLabor.filter((m) => m.operationType === 'custom');

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header + Live Running Total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {isEditingExisting ? t.estimate.editTitle : t.estimate.newTitle}
          </h1>
          <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
            {draft.estimateNumber} · {t.vehicleTypes[draft.vehicleType ?? 'car']} · 1 USD = {rate.toFixed(2)} UAH
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFinalPhase ? t.estimate.finalAmount : t.estimate.phasePreliminary}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold font-mono-num text-blue-600 dark:text-blue-400">
              {formatPhaseMoney(totals.totalUah)}
            </div>
            {!isFinalPhase && (
              <div className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                ≈ {formatUah(totals.totalUah, locale)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Vehicle Class Switcher (Легковая / Бус / Фура) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 grid grid-cols-3 gap-1.5">
        {VEHICLE_TYPES.map((vt) => {
          const selected = (draft.vehicleType ?? 'car') === vt;
          return (
            <button
              key={vt}
              type="button"
              onClick={() => handleChangeVehicleType(vt)}
              className={`min-h-[44px] px-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                selected
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {vt === 'car' ? (
                <Car className="w-4 h-4 shrink-0" />
              ) : (
                <Truck className="w-4 h-4 shrink-0" />
              )}
              <span>{t.vehicleTypes[vt]}</span>
              <span className="font-mono-num opacity-75 text-[11px]">
                {VEHICLE_TYPE_MULTIPLIER[vt]}×
              </span>
            </button>
          );
        })}
      </div>

      {/* Persistent 2-Stage Order Phase Switcher (Preliminary Estimate -> Final Total) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex flex-col sm:flex-row sm:items-center gap-1.5">
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          {(
            [
              ['preliminary', t.estimate.phasePreliminary],
              ['final', t.estimate.phaseFinal],
            ] as [OrderPhase, string][]
          ).map(([phase, label]) => {
            const selected = orderPhase === phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => handleChangeOrderPhase(phase)}
                className={`min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  selected
                    ? phase === 'final'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {phase === 'final' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
        {draft.preliminaryTotalUah !== undefined && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-xs flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-slate-500 dark:text-slate-400">
              {t.estimate.preliminaryAmount}:
            </span>
            <span className="font-mono-num font-bold text-slate-900 dark:text-white">
              {formatUsd(convertUahToUsd(draft.preliminaryTotalUah, rate), locale)}
            </span>
          </div>
        )}
      </div>

      {/* Horizontal Scrollable Step Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {steps.map((step) => {
          const active = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {step.icon}
              <span>{step.label}</span>
              {step.id === 'parts' && draft.selectedParts.length > 0 && (
                <span className="font-mono-num opacity-80">({draft.selectedParts.length})</span>
              )}
              {step.id === 'labor' && draft.laborItems.length > 0 && (
                <span className="font-mono-num opacity-80">({draft.laborItems.length})</span>
              )}
              {step.id === 'stages' && (
                <span className="font-mono-num opacity-80">
                  ({completedStagesCount}/{stages.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* STEP: CLIENT, VEHICLE TYPE & DATES */}
      {activeStep === 'client' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
          {/* Vehicle Type Segmented Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t.estimate.vehicleType}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {VEHICLE_TYPES.map((vt) => {
                const selected = (draft.vehicleType ?? 'car') === vt;
                return (
                  <button
                    key={vt}
                    type="button"
                    onClick={() => handleChangeVehicleType(vt)}
                    className={`min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {vt === 'car' ? (
                      <Car className="w-4 h-4 shrink-0" />
                    ) : (
                      <Truck className="w-4 h-4 shrink-0" />
                    )}
                    <span>{t.vehicleTypes[vt]}</span>
                    <span className="text-[11px] font-mono-num opacity-70">
                      {VEHICLE_TYPE_MULTIPLIER[vt]}×
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order Date & Approximate Delivery Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.orderDate}
              </label>
              <input
                type="date"
                value={draft.orderDate ?? ''}
                onChange={(e) => updateDraftWithTotals({ orderDate: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.dueDate}
              </label>
              <input
                type="date"
                value={draft.dueDate ?? ''}
                onChange={(e) => updateDraftWithTotals({ dueDate: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {[2, 3, 5, 7, 14].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() =>
                      updateDraftWithTotals({
                        dueDate: addDaysToDateString(
                          draft.orderDate || new Date().toISOString().slice(0, 10),
                          days
                        ),
                      })
                    }
                    className="min-h-[32px] px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono-num font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    +{days}d
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {t.estimate.dueDateHint}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.customerName}
              </label>
              <input
                type="text"
                value={draft.customerName}
                onChange={(e) => updateDraftWithTotals({ customerName: e.target.value })}
                placeholder={t.estimate.customerNamePlaceholder}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.customerPhone}
              </label>
              <input
                type="tel"
                value={draft.customerPhone ?? ''}
                onChange={(e) => updateDraftWithTotals({ customerPhone: e.target.value })}
                placeholder={t.estimate.customerPhonePlaceholder}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.vehicleMake}
              </label>
              <input
                type="text"
                value={draft.vehicleMake}
                onChange={(e) => updateDraftWithTotals({ vehicleMake: e.target.value })}
                placeholder={t.estimate.vehicleMakePlaceholder}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.vehicleModel}
              </label>
              <input
                type="text"
                value={draft.vehicleModel}
                onChange={(e) => updateDraftWithTotals({ vehicleModel: e.target.value })}
                placeholder={t.estimate.vehicleModelPlaceholder}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.vehicleYear}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.vehicleYear ?? ''}
                onChange={(e) => updateDraftWithTotals({ vehicleYear: e.target.value })}
                placeholder="2020"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.estimate.vehicleColor}
              </label>
              <input
                type="text"
                value={draft.vehicleColor ?? ''}
                onChange={(e) => updateDraftWithTotals({ vehicleColor: e.target.value })}
                placeholder="LA7W / Silver"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.estimate.notes}
            </label>
            <textarea
              rows={3}
              value={draft.notes ?? ''}
              onChange={(e) => updateDraftWithTotals({ notes: e.target.value })}
              placeholder={t.estimate.notesPlaceholder}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          {/* Deposit / Prepayment Tracking */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t.estimate.depositSection}</span>
              </div>
              <div className="text-xs font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                {t.estimate.depositBalanceDue}:{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  {formatUah(depositSummary.remainingBalanceUah, locale)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.estimate.depositExpected}
                </label>
                <NumericInput
                  min={0}
                  value={deposit.expectedUah}
                  onValueChange={(val) => handleUpdateDeposit({ expectedUah: val })}
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
                    value={deposit.receivedUah}
                    onValueChange={(val) => handleUpdateDeposit({ receivedUah: val })}
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                  />
                  {deposit.expectedUah > 0 && deposit.receivedUah < deposit.expectedUah && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateDeposit({
                          receivedUah: deposit.expectedUah,
                          receivedAt: new Date().toISOString(),
                        })
                      }
                      className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      {t.estimate.depositMarkFull}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input
              type="text"
              value={deposit.note ?? ''}
              onChange={(e) => handleUpdateDeposit({ note: e.target.value })}
              placeholder={t.estimate.depositNotePlaceholder}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* STEP: VEHICLE PARTS SELECTION (SYNCHRONIZED SVG + SEARCHABLE LIST + FULL RESPRAY) */}
      {activeStep === 'parts' && (
        <div className="space-y-4">
          {/* 1-Tap Full Respray Card */}
          <button
            type="button"
            onClick={handleToggleFullRespray}
            className={`w-full min-h-[58px] px-4 py-2.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
              isFullResprayActive
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-900 dark:text-blue-100'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isFullResprayActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Paintbrush className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {t.estimate.fullResprayTitle}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {isFullResprayActive ? t.estimate.fullResprayActive : t.estimate.fullResprayDesc}
                </div>
              </div>
            </div>
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                isFullResprayActive
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {isFullResprayActive && <Check className="w-4 h-4" />}
            </span>
          </button>

          {/* Mobile mode switcher + Desktop side-by-side header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="lg:hidden grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPartsUiMode('diagram')}
                className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold cursor-pointer ${
                  partsUiMode === 'diagram'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.estimate.diagramTab}
              </button>
              <button
                type="button"
                onClick={() => setPartsUiMode('list')}
                className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold cursor-pointer ${
                  partsUiMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.estimate.listTab}
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span>
                {t.estimate.selectedCount}:{' '}
                <strong className="font-mono-num text-slate-900 dark:text-white">
                  {draft.selectedParts.length}
                </strong>
              </span>
              {draft.selectedParts.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearParts}
                  className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer min-h-[36px] px-1"
                >
                  {t.estimate.clearSelection}
                </button>
              )}
            </div>
          </div>

          {/* Selected Parts Removable Summary Bar */}
          {draft.selectedParts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {t.partGroups.selectedSummary} ({draft.selectedParts.length})
                </span>
                <button
                  type="button"
                  onClick={handleClearParts}
                  className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer min-h-[28px] px-1"
                >
                  {t.estimate.clearSelection}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {draft.selectedParts.map((partId) => {
                  const isDouble = doubleSidedSet.has(partId);
                  return (
                    <div
                      key={partId}
                      className="inline-flex items-center rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePart(partId)}
                        className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 text-xs font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                      >
                        <span className="truncate max-w-[180px]">{t.parts[partId]}</span>
                        {(partOperationCounts[partId] ?? 0) > 0 && (
                          <span className="font-mono-num text-[11px] opacity-75">
                            · {partOperationCounts[partId]}
                          </span>
                        )}
                        <X className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      </button>
                      {partId !== 'full_respray' && (
                        <button
                          type="button"
                          aria-pressed={isDouble}
                          onClick={() => handleToggleDoubleSidedPart(partId)}
                          title={t.estimate.doubleSidedPaint}
                          className={`min-h-[36px] px-2 text-[11px] font-semibold border-l border-blue-200 dark:border-blue-800/80 transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            isDouble
                              ? 'bg-blue-600 text-white'
                              : 'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              isDouble
                                ? 'border-white bg-white/20'
                                : 'border-blue-400 dark:border-blue-500'
                            }`}
                          >
                            {isDouble && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <span>{t.estimate.doubleSidedBadge}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Interactive SVG Diagram Panel */}
            <div
              className={`lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 ${
                partsUiMode === 'diagram' ? 'block' : 'hidden lg:block'
              }`}
            >
              {/* 5 Views Switcher */}
              <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {VEHICLE_VIEWS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVehicleView(v)}
                    className={`min-h-[38px] rounded-lg text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer truncate px-1 ${
                      vehicleView === v
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.views[v]}
                  </button>
                ))}
              </div>

              <div className="py-2">
                <VehicleDiagramSvg
                  view={vehicleView}
                  vehicleType={currentVehicleType}
                  selectedParts={draft.selectedParts}
                  onTogglePart={handleTogglePart}
                  partOperationCounts={partOperationCounts}
                  t={t}
                />
              </div>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                {lastTappedPart
                  ? `${t.parts[lastTappedPart]} — ${
                      draft.selectedParts.includes(lastTappedPart) ? '✓' : '—'
                    }`
                  : t.estimate.selectPartHint}
              </div>
            </div>

            {/* Synchronized Organized & Searchable List */}
            <div
              className={`lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 ${
                partsUiMode === 'list' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  placeholder={t.estimate.searchPartsPlaceholder}
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              {/* Body Zone Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setPartGroupFilter('all')}
                  className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    partGroupFilter === 'all'
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.partGroups.all}
                </button>
                {PART_GROUP_ORDER.map((group) => {
                  const hasAnyInClass = compatibleZoneParts.some((p) => p.category === group);
                  if (!hasAnyInClass) return null;
                  const active = partGroupFilter === group;
                  const countInGroup = selectedCountByGroup[group] ?? 0;
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setPartGroupFilter(group)}
                      className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-900 dark:bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{t.partGroups[group]}</span>
                      {countInGroup > 0 && (
                        <span className="font-mono-num opacity-80">({countInGroup})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Grouped Parts List */}
              <div className="max-h-[430px] overflow-y-auto space-y-3 pr-0.5">
                {groupedParts.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t.common.noResults}
                  </div>
                ) : (
                  groupedParts.map((section) => {
                    const selectedInSection = section.parts.filter((p) =>
                      draft.selectedParts.includes(p.id)
                    ).length;
                    return (
                      <div
                        key={section.category}
                        className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                      >
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            {t.partGroups[section.category]}
                          </span>
                          <span className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                            {selectedInSection}/{section.parts.length}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {section.parts.map((part) => {
                            const selected = draft.selectedParts.includes(part.id);
                            const opCount = partOperationCounts[part.id] ?? 0;
                            return (
                              <button
                                key={part.id}
                                type="button"
                                onClick={() => handleTogglePart(part.id)}
                                className={`w-full min-h-[48px] py-2.5 px-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-blue-50/70 dark:bg-blue-950/30'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`text-sm truncate ${
                                      selected
                                        ? 'font-semibold text-blue-700 dark:text-blue-400'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {t.parts[part.id]}
                                  </div>
                                  <div className="text-[11px] font-mono-num text-slate-400 dark:text-slate-500">
                                    k={part.defaultAreaFactor.toFixed(2)}
                                    {opCount > 0 ? ` · ${t.estimate.stepLabor.toLowerCase()}: ${opCount}` : ''}
                                  </div>
                                </div>
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                                    selected
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600'
                                  }`}
                                >
                                  {selected && <Check className="w-4 h-4" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {draft.selectedParts.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveStep('labor')}
                className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer"
              >
                {t.estimate.stepLabor} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP: LABOR OPERATIONS */}
      {activeStep === 'labor' && (
        <div className="space-y-4">
          {draft.selectedParts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t.estimate.noPartsSelected}
              </p>
              <button
                type="button"
                onClick={() => setActiveStep('parts')}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold cursor-pointer"
              >
                {t.estimate.stepParts}
              </button>
            </div>
          ) : (
            draft.selectedParts.map((partId) => {
              const partLabor = draft.laborItems.filter((l) => l.partId === partId);
              const customText = customOpByPart[partId] ?? '';

              return (
                <div
                  key={partId}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {t.parts[partId]}
                      </h3>
                      {partId !== 'full_respray' && (
                        <label
                          className={`inline-flex items-center gap-2 min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer select-none ${
                            doubleSidedSet.has(partId)
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={doubleSidedSet.has(partId)}
                            onChange={() => handleToggleDoubleSidedPart(partId)}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                          />
                          <span>{t.estimate.doubleSidedPaint}</span>
                        </label>
                      )}
                    </div>
                    <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400 shrink-0">
                      {formatUah(
                        partLabor.reduce(
                          (acc, item) => acc + calculateLaborItemTotalUah(item, rate),
                          0
                        ),
                        locale
                      )}
                    </span>
                  </div>

                  {/* Quick-Add / Toggle Standard Operations */}
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_STANDARD_OPERATIONS.map((opType) => {
                      const alreadyAdded = isDuplicateLaborOperation(
                        draft.laborItems,
                        partId,
                        opType
                      );
                      return (
                        <button
                          key={opType}
                          type="button"
                          aria-pressed={alreadyAdded}
                          onClick={() => handleToggleLaborOperation(partId, opType)}
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            alreadyAdded
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-transparent'
                          }`}
                        >
                          {alreadyAdded ? '✓ ' : '+ '}
                          {t.operations[opType]}
                        </button>
                      );
                    })}
                    {customMasterPresets.map((preset) => {
                      const alreadyAdded = isDuplicateLaborOperation(
                        draft.laborItems,
                        partId,
                        'custom',
                        preset.customName
                      );
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          aria-pressed={alreadyAdded}
                          onClick={() =>
                            handleToggleLaborOperation(partId, 'custom', preset.customName)
                          }
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            alreadyAdded
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-transparent'
                          }`}
                        >
                          {alreadyAdded ? '✓ ' : '+ '}
                          {preset.customName}
                        </button>
                      );
                    })}
                  </div>

                  {duplicateWarningPart === partId && (
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {t.estimate.duplicateWarning}
                    </div>
                  )}

                  {/* Configured Operations for this Part */}
                  {partLabor.length > 0 && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {partLabor.map((item) => {
                        const lineUah = calculateLaborItemTotalUah(item, rate);
                        const opTitle =
                          item.operationType === 'custom'
                            ? item.customName || t.operations.custom
                            : t.operations[item.operationType];

                        return (
                          <div key={item.id} className="py-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLaborItem(item.id, {
                                      completed: !item.completed,
                                      completedAt: !item.completed
                                        ? new Date().toISOString()
                                        : undefined,
                                    })
                                  }
                                  aria-label={opTitle}
                                  className="mt-0.5 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 cursor-pointer shrink-0"
                                >
                                  {item.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Circle className="w-5 h-5" />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <div
                                    className={`text-sm font-semibold ${
                                      item.completed
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {opTitle}
                                  </div>
                                  {item.isPriceOverridden && (
                                    <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2 mt-0.5">
                                      <span>{t.common.overridden}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreLaborMaster(item.id)}
                                        className="underline cursor-pointer"
                                      >
                                        {t.estimate.restoreMasterPrice}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                                  {formatUah(lineUah, locale)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLaborItem(item.id)}
                                  aria-label={t.common.delete}
                                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <NumericInput
                                min={0}
                                value={item.unitPrice}
                                onValueChange={(val) =>
                                  handleUpdateLaborItem(item.id, {
                                    unitPrice: val,
                                  })
                                }
                                className="w-28 min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-right text-slate-900 dark:text-white"
                              />
                              <select
                                value={item.currency}
                                onChange={(e) =>
                                  handleUpdateLaborItem(item.id, {
                                    currency: e.target.value as CurrencyCode,
                                  })
                                }
                                className="min-h-[40px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              >
                                <option value="UAH">UAH</option>
                                <option value="USD">USD</option>
                              </select>
                              <span className="text-xs text-slate-400">×</span>
                              <NumericInput
                                min={0.5}
                                fallbackValue={1}
                                value={item.quantity}
                                onValueChange={(val) =>
                                  handleUpdateLaborItem(item.id, {
                                    quantity: val,
                                  })
                                }
                                className="w-20 min-h-[40px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-center text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Custom Operation */}
                  <div className="pt-2 flex gap-2">
                    <input
                      type="text"
                      value={customText}
                      onChange={(e) =>
                        setCustomOpByPart((prev) => ({ ...prev, [partId]: e.target.value }))
                      }
                      placeholder={t.estimate.customOperationPlaceholder}
                      className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customText.trim()) return;
                        handleAddLaborOperation(partId, 'custom', customText);
                        setCustomOpByPart((prev) => ({ ...prev, [partId]: '' }));
                      }}
                      className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      + {t.estimate.addCustomOperation}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* STEP: MATERIALS (QUICK VS DETAILED, ZERO DOUBLE-COUNTING) */}
      {activeStep === 'materials' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => handleSwitchMaterialsMode('quick')}
                className={`min-h-[42px] px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  draft.materialsMode === 'quick'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.estimate.materialsModeQuick}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMaterialsMode('detailed')}
                className={`min-h-[42px] px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  draft.materialsMode === 'detailed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.estimate.materialsModeDetailed}
              </button>
            </div>

            {draft.materialsMode === 'quick' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.estimate.quickModeHint}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t.estimate.multiplierLabel}:
                    </span>
                    {[0.8, 1, 1.2, 1.4, 1.5, 2].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleQuickMultiplierChange(m)}
                        className={`min-h-[36px] px-2.5 rounded-lg text-xs font-mono-num font-semibold cursor-pointer ${
                          draft.quickMaterialMultiplier === m
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {m}×
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleRecalculateQuickFromTemplates}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.estimate.recalculateFromTemplates}</span>
                  </button>
                </div>

                {draft.quickMaterials.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                    {draft.selectedParts.length === 0
                      ? t.estimate.noPartsSelected
                      : materialsCatalog.length === 0
                        ? t.materials.templatesNoMaterialsHint
                        : t.materials.templateHint}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {draft.quickMaterials.map((mat) => {
                      const costUah = calculateMaterialItemCostUah(mat, rate);
                      return (
                        <div
                          key={mat.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {mat.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                              {mat.packageSize} {t.units[mat.packageUnit]} = {mat.packagePrice}{' '}
                              {mat.currency}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <NumericInput
                              min={0}
                              value={mat.quantity}
                              onValueChange={(val) =>
                                handleUpdateMaterialItem('quick', mat.id, {
                                  quantity: val,
                                })
                              }
                              className="w-20 min-h-[40px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-right text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-500 w-6">{t.units[mat.unit]}</span>
                            <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white min-w-[90px] text-right">
                              {formatUah(costUah, locale)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Detailed Materials Mode */
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.estimate.detailedModeHint}
                </p>

                <div className="flex flex-wrap gap-2">
                  <select
                    value=""
                    onChange={(e) => handleAddDetailedFromCatalog(e.target.value)}
                    className="flex-1 min-w-[200px] min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="">+ {t.estimate.addMaterialFromCatalog}</option>
                    {materialsCatalog.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.packagePrice} {m.currency})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomMatForm((v) => !v)}
                    className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    + {t.estimate.addCustomMaterial}
                  </button>
                </div>

                {showCustomMatForm && (
                  <form
                    onSubmit={handleAddCustomDetailedMaterial}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={customMatName}
                        onChange={(e) => setCustomMatName(e.target.value)}
                        placeholder={t.estimate.materialName}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                      />
                      <select
                        value={customMatCategory}
                        onChange={(e) => setCustomMatCategory(e.target.value as MaterialCategory)}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                      >
                        {(Object.keys(t.categories) as MaterialCategory[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {t.categories[cat]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <NumericInput
                        min={0}
                        value={customMatQty}
                        onValueChange={setCustomMatQty}
                        placeholder={t.estimate.quantity}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono-num"
                      />
                      <select
                        value={customMatUnit}
                        onChange={(e) => setCustomMatUnit(e.target.value as MaterialUnit)}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        {ALL_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {t.units[u]}
                          </option>
                        ))}
                      </select>
                      <NumericInput
                        min={0.01}
                        fallbackValue={1}
                        value={customMatPackSize}
                        onValueChange={setCustomMatPackSize}
                        placeholder={t.estimate.packSize}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono-num"
                      />
                      <select
                        value={customMatPackUnit}
                        onChange={(e) => setCustomMatPackUnit(e.target.value as MaterialUnit)}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        {ALL_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {t.units[u]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <NumericInput
                        min={0}
                        value={customMatPackPrice}
                        onValueChange={setCustomMatPackPrice}
                        placeholder={t.estimate.packPrice}
                        className="w-32 min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono-num"
                      />
                      <select
                        value={customMatCurrency}
                        onChange={(e) => setCustomMatCurrency(e.target.value as CurrencyCode)}
                        className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                      >
                        <option value="UAH">UAH</option>
                        <option value="USD">USD</option>
                      </select>
                      <button
                        type="submit"
                        className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold cursor-pointer"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        {t.common.add}
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {draft.detailedMaterials.map((mat) => {
                    const costUah = calculateMaterialItemCostUah(mat, rate);
                    return (
                      <div key={mat.id} className="py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {mat.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                              {mat.packageSize} {t.units[mat.packageUnit]} = {mat.packagePrice}{' '}
                              {mat.currency}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                              {formatUah(costUah, locale)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteDetailedMaterial(mat.id)}
                              aria-label={t.common.delete}
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <NumericInput
                            min={0}
                            value={mat.quantity}
                            onValueChange={(val) =>
                              handleUpdateMaterialItem('detailed', mat.id, {
                                quantity: val,
                              })
                            }
                            className="w-24 min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-right text-slate-900 dark:text-white"
                          />
                          <select
                            value={mat.unit}
                            onChange={(e) =>
                              handleUpdateMaterialItem('detailed', mat.id, {
                                unit: e.target.value as MaterialUnit,
                              })
                            }
                            className="min-h-[40px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                          >
                            {ALL_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {t.units[u]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t.estimate.materialsSubtotal}
              </span>
              <span className="text-base font-bold font-mono-num text-slate-900 dark:text-white">
                {formatUah(totals.materialsSubtotalUah, locale)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP: WORKFLOW STAGES COMPLETION CHECKLIST */}
      {activeStep === 'stages' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.estimate.stepStages}
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono-num">
                  <Calendar className="w-3.5 h-3.5" />
                  {t.estimate.orderDate}: {draft.orderDate ? formatDateShort(draft.orderDate, locale) : '—'}
                </span>
                <span>·</span>
                <span className="font-mono-num">
                  {t.estimate.dueDate}: {draft.dueDate ? formatDateShort(draft.dueDate, locale) : '—'}
                </span>
              </div>
            </div>
            <div className="text-sm font-bold font-mono-num text-blue-600 dark:text-blue-400 shrink-0">
              {completedStagesCount} / {stages.length}
            </div>
          </div>

          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{
                width: `${stages.length > 0 ? Math.round((completedStagesCount / stages.length) * 100) : 0}%`,
              }}
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stages.map((stage, idx) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleToggleStage(stage.id)}
                className="w-full min-h-[56px] py-3 px-2 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {stage.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-semibold ${
                        stage.completed
                          ? 'text-slate-500 dark:text-slate-400 line-through'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {idx + 1}. {t.stages[stage.id]}
                    </div>
                    {stage.completed && stage.completedAt && (
                      <div className="text-[11px] font-mono-num text-emerald-700 dark:text-emerald-400">
                        ✓ {formatDateTime(stage.completedAt, locale)}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: SUMMARY, ADJUSTMENT, RATE FREEZE & SAVE */}
      {activeStep === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 space-y-4">
            {/* Order Dates, Vehicle Type & Stage Progress Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500 dark:text-slate-400">{t.estimate.vehicleType}</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  {t.vehicleTypes[draft.vehicleType ?? 'car']}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">{t.estimate.stepStages}</div>
                <button
                  type="button"
                  onClick={() => setActiveStep('stages')}
                  className="text-sm font-semibold font-mono-num text-blue-600 dark:text-blue-400 hover:underline mt-0.5 cursor-pointer"
                >
                  {completedStagesCount} / {stages.length}
                </button>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">{t.estimate.orderDate}</div>
                <div className="text-sm font-mono-num font-semibold text-slate-900 dark:text-white mt-0.5">
                  {draft.orderDate ? formatDateShort(draft.orderDate, locale) : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">{t.estimate.dueDate}</div>
                <div className="text-sm font-mono-num font-semibold text-slate-900 dark:text-white mt-0.5">
                  {draft.dueDate ? formatDateShort(draft.dueDate, locale) : '—'}
                </div>
              </div>
            </div>

            {/* Discount / Markup */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.estimate.adjustmentRow}
              </h2>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(
                  [
                    ['none', t.estimate.adjustmentNone],
                    ['discount', t.estimate.adjustmentDiscount],
                    ['markup', t.estimate.adjustmentMarkup],
                  ] as [AdjustmentKind, string][]
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() =>
                      updateDraftWithTotals({
                        adjustment: { ...draft.adjustment, kind },
                      })
                    }
                    className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      draft.adjustment.kind === kind
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {draft.adjustment.kind !== 'none' && (
                <div className="flex items-center gap-2">
                  <NumericInput
                    min={0}
                    value={draft.adjustment.value}
                    onValueChange={(val) =>
                      updateDraftWithTotals({
                        adjustment: {
                          ...draft.adjustment,
                          value: val,
                        },
                      })
                    }
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {(
                      [
                        ['percent', t.estimate.percent],
                        ['fixed_uah', t.estimate.fixedUah],
                      ] as [AdjustmentValueType, string][]
                    ).map(([vt, label]) => (
                      <button
                        key={vt}
                        type="button"
                        onClick={() =>
                          updateDraftWithTotals({
                            adjustment: { ...draft.adjustment, valueType: vt },
                          })
                        }
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                          draft.adjustment.valueType === vt
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Exchange Rate Snapshot */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.estimate.appliedRate}
                </div>
                <div className="text-base font-bold font-mono-num text-slate-900 dark:text-white">
                  1 USD = {draft.exchangeRate.rate.toFixed(2)} UAH
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.estimate.frozenRateNotice}
                {draft.exchangeRate.frozenAt
                  ? ` (${formatDateTime(draft.exchangeRate.frozenAt, locale)})`
                  : ''}
              </p>
              {currentWorkshopRate.rate !== draft.exchangeRate.rate && (
                <button
                  type="button"
                  onClick={() =>
                    updateDraftWithTotals({
                      exchangeRate: { ...currentWorkshopRate, frozenAt: undefined },
                    })
                  }
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {t.estimate.refreshRateDraft} ({currentWorkshopRate.rate.toFixed(2)} ₴)
                  </span>
                </button>
              )}
            </div>
            {/* Order Phase: Preliminary Estimate vs Final Total */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.estimate.orderPhaseLabel}
                </h2>
                <button
                  type="button"
                  onClick={handleLockPreliminary}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t.estimate.lockPreliminaryBtn}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(
                  [
                    ['preliminary', t.estimate.phasePreliminary],
                    ['final', t.estimate.phaseFinal],
                  ] as [OrderPhase, string][]
                ).map(([phase, label]) => (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => handleChangeOrderPhase(phase)}
                    className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      orderPhase === phase
                        ? phase === 'final'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.preliminaryTotalUah !== undefined && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t.estimate.preliminaryAmount}
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatUsd(convertUahToUsd(draft.preliminaryTotalUah, rate), locale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t.estimate.finalAmount}
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatUah(totals.totalUah, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t.estimate.phaseDifference}
                    </span>
                    {(() => {
                      const diffUah = totals.totalUah - draft.preliminaryTotalUah;
                      const diffUsd =
                        convertUahToUsd(totals.totalUah, rate) -
                        convertUahToUsd(draft.preliminaryTotalUah, rate);
                      const diffValue = isFinalPhase ? diffUah : diffUsd;
                      return (
                        <span
                          className={`font-mono-num font-bold ${
                            diffValue > 0
                              ? 'text-amber-700 dark:text-amber-400'
                              : diffValue < 0
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {diffValue > 0 ? '+' : ''}
                          {isFinalPhase
                            ? formatUah(diffUah, locale)
                            : formatUsd(diffUsd, locale)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Deposit / Prepayment Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{t.estimate.depositSection}</span>
                </div>
                {deposit.expectedUah > 0 && deposit.receivedUah < deposit.expectedUah && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateDeposit({
                        receivedUah: deposit.expectedUah,
                        receivedAt: new Date().toISOString(),
                      })
                    }
                    className="min-h-[36px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {t.estimate.depositMarkFull}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.estimate.depositExpected}
                  </label>
                  <NumericInput
                    min={0}
                    value={deposit.expectedUah}
                    onValueChange={(val) => handleUpdateDeposit({ expectedUah: val })}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.estimate.depositReceived}
                  </label>
                  <NumericInput
                    min={0}
                    value={deposit.receivedUah}
                    onValueChange={(val) => handleUpdateDeposit({ receivedUah: val })}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <input
                type="text"
                value={deposit.note ?? ''}
                onChange={(e) => handleUpdateDeposit({ note: e.target.value })}
                placeholder={t.estimate.depositNotePlaceholder}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Financial Totals & Actions */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{t.estimate.laborSubtotal}</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                  {formatPhaseMoney(totals.laborSubtotalUah)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  {t.estimate.materialsSubtotal}
                </span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                  {formatPhaseMoney(totals.materialsSubtotalUah)}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-300">{t.estimate.subtotal}</span>
                <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                  {formatPhaseMoney(totals.subtotalBeforeAdjustmentUah)}
                </span>
              </div>
              {draft.adjustment.kind !== 'none' && totals.adjustmentAmountUah !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">
                    {draft.adjustment.kind === 'discount'
                      ? t.estimate.adjustmentDiscount
                      : t.estimate.adjustmentMarkup}
                  </span>
                  <span
                    className={`font-mono-num font-semibold ${
                      totals.adjustmentAmountUah < 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {totals.adjustmentAmountUah > 0 ? '+' : ''}
                    {formatPhaseMoney(totals.adjustmentAmountUah)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {isFinalPhase ? t.estimate.finalAmount : t.estimate.finalTotal}
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono-num text-blue-600 dark:text-blue-400">
                    {formatPhaseMoney(totals.totalUah)}
                  </div>
                  {!isFinalPhase && (
                    <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      ≈ {formatUah(totals.totalUah, locale)}
                    </div>
                  )}
                </div>
              </div>

              {draft.preliminaryTotalUah !== undefined &&
                (isFinalPhase || draft.preliminaryTotalUah !== totals.totalUah) && (
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{t.estimate.preliminaryAmount}</span>
                    <span className="font-mono-num font-medium">
                      {formatUsd(convertUahToUsd(draft.preliminaryTotalUah, rate), locale)}
                    </span>
                  </div>
                )}

              {(deposit.expectedUah > 0 || deposit.receivedUah > 0) && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  {deposit.expectedUah > 0 && (
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{t.estimate.depositExpected}</span>
                      <span className="font-mono-num font-medium">
                        {formatPhaseMoney(depositSummary.expectedUah)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {t.estimate.depositReceived}
                    </span>
                    <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                      -{formatPhaseMoney(depositSummary.receivedUah)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-sm font-bold text-slate-900 dark:text-white">
                    <span>{t.estimate.depositBalanceDue}</span>
                    <span className="font-mono-num text-base text-slate-900 dark:text-white">
                      {formatPhaseMoney(depositSummary.remainingBalanceUah)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Cloud Storage Status / Prompt */}
              {!authUser ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-amber-950 dark:text-amber-100 min-w-0 flex-1">
                    <CloudOff className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                    <span>{t.cloud.localOnlySaveHint}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onSignInGoogle}
                    disabled={isSigningIn}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isSigningIn ? t.cloud.signingIn : t.cloud.signInGoogle}</span>
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <Cloud className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {cloudSyncState === 'error'
                      ? t.cloud.syncError
                      : `${t.cloud.saveToCloudHint} (${authUser.email})`}
                  </span>
                </div>
              )}

              {cloudError && (
                <div className="text-xs font-medium text-rose-600 dark:text-rose-400 break-words">
                  {cloudError}
                </div>
              )}

              {savedMode && (
                <div
                  className={`text-xs font-semibold text-center ${
                    savedMode === 'cloud'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {savedMode === 'cloud' ? t.cloud.savedToCloudToast : t.estimate.savedToast}
                </div>
              )}

              {shareFeedback && (
                <div
                  className={`text-xs font-medium px-3 py-2 rounded-xl text-center ${
                    shareFeedback.type === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {shareFeedback.text}
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{t.estimate.saveEstimate}</span>
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenCustomerView(draft)}
                  className="w-full min-h-[48px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>{t.estimate.customerViewBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSharePdfDirect()}
                  disabled={isSharingPdf}
                  className="w-full min-h-[48px] px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isSharingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Share2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {isSharingPdf ? t.customerEstimate.generatingPdf : t.customerEstimate.sharePdf}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
