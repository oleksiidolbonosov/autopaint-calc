import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SEED_MATERIAL_IDS,
  DEFAULT_WORKSHOP_ID,
} from '../data/seedData';
import { HydratedDatabaseState } from '../db/indexedDb';
import {
  AppSettings,
  DepositInfo,
  Estimate,
  EstimateStageItem,
  ExchangeRateSnapshot,
  LaborOperationType,
  MasterLaborOperation,
  MaterialCatalogItem,
  MaterialCategory,
  MaterialUnit,
  PartQuickTemplate,
} from '../types/models';
import { db, handleFirestoreError, OperationType } from './firebaseClient';
import { getTodayDateString } from './reminderService';

const VALID_MATERIAL_CATEGORIES = new Set<MaterialCategory>([
  'basecoat',
  'clearcoat',
  'primer',
  'filler',
  'hardener',
  'thinner',
  'sandpaper',
  'masking',
  'other',
]);

const VALID_MATERIAL_UNITS = new Set<MaterialUnit>(['g', 'kg', 'ml', 'l', 'pcs']);

const VALID_LABOR_TYPES = new Set<LaborOperationType>([
  'removal',
  'installation',
  'disassembly',
  'assembly',
  'surface_prep',
  'painting',
  'dent_repair',
  'plastic_repair',
  'polishing',
  'custom',
]);

const ALLOWED_ESTIMATE_KEYS = new Set([
  'ownerId',
  'id',
  'estimateNumber',
  'workshopId',
  'schemaVersion',
  'clientCreatedAt',
  'clientUpdatedAt',
  'orderDate',
  'dueDate',
  'orderPhase',
  'preliminaryTotalUah',
  'preliminaryLockedAt',
  'deposit',
  'customerName',
  'customerPhone',
  'vehicleType',
  'vehicleMake',
  'vehicleModel',
  'vehicleYear',
  'vehicleColor',
  'notes',
  'selectedParts',
  'doubleSidedParts',
  'laborItems',
  'stages',
  'materialsMode',
  'quickMaterialMultiplier',
  'quickMaterials',
  'detailedMaterials',
  'adjustment',
  'exchangeRate',
  'totals',
  'isSample',
  'createdAt',
  'updatedAt',
]);

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function clampStr(value: unknown, maxLen: number, fallback = ''): string {
  const s = typeof value === 'string' ? value : fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function sanitizeId(value: unknown, fallback: string, maxLen = 128): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeExchangeRate(snap: ExchangeRateSnapshot): ExchangeRateSnapshot {
  const rate = Number.isFinite(snap.rate) && snap.rate > 0 ? Math.min(snap.rate, 10000) : 41.5;
  const source =
    snap.source === 'nbu' || snap.source === 'manual' || snap.source === 'cached'
      ? snap.source
      : 'manual';
  const updatedAt = clampStr(snap.updatedAt, 40, new Date().toISOString());
  const out: ExchangeRateSnapshot = { rate, source, updatedAt };
  if (snap.frozenAt) {
    out.frozenAt = clampStr(snap.frozenAt, 40);
  }
  return out;
}

function timestampToIso(value: unknown, fallbackIso: string): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return fallbackIso;
}

function sanitizeDeposit(deposit?: DepositInfo) {
  const nonNeg = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.min(n, 100000000) : 0;
  return {
    expectedUah: nonNeg(deposit?.expectedUah),
    receivedUah: nonNeg(deposit?.receivedUah),
    receivedAt: clampStr(deposit?.receivedAt ?? '', 40),
    note: clampStr(deposit?.note ?? '', 300),
  };
}

function sanitizeEstimateMutableFields(uid: string, est: Estimate) {
  const today = getTodayDateString();
  const safeOrderDate =
    typeof est.orderDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(est.orderDate)
      ? est.orderDate
      : today;

  const safeEstNo = (est.estimateNumber ?? '').trim() || est.id;
  const finiteOrZero = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
  const nonNeg = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.min(n, 100000000) : 0;

  return {
    estimateNumber: clampStr(safeEstNo, 64, est.id),
    workshopId: sanitizeId(est.workshopId, DEFAULT_WORKSHOP_ID, 64),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    clientUpdatedAt: clampStr(est.updatedAt || new Date().toISOString(), 40),
    orderDate: safeOrderDate,
    dueDate: clampStr(est.dueDate ?? '', 20),
    orderPhase: est.orderPhase === 'final' ? ('final' as const) : ('preliminary' as const),
    preliminaryTotalUah: nonNeg(est.preliminaryTotalUah),
    preliminaryLockedAt: clampStr(est.preliminaryLockedAt ?? '', 40),
    deposit: sanitizeDeposit(est.deposit),
    customerName: clampStr(est.customerName ?? '', 120),
    customerPhone: clampStr(est.customerPhone ?? '', 40),
    vehicleType:
      est.vehicleType === 'car' || est.vehicleType === 'van' || est.vehicleType === 'truck'
        ? est.vehicleType
        : 'car',
    vehicleMake: clampStr(est.vehicleMake ?? '', 80),
    vehicleModel: clampStr(est.vehicleModel ?? '', 80),
    vehicleYear: clampStr(est.vehicleYear ?? '', 12),
    vehicleColor: clampStr(est.vehicleColor ?? '', 80),
    notes: clampStr(est.notes ?? '', 1500),
    selectedParts: (est.selectedParts ?? [])
      .filter((p): p is Estimate['selectedParts'][number] => typeof p === 'string' && p.length > 0)
      .slice(0, 60),
    doubleSidedParts: (est.doubleSidedParts ?? [])
      .filter((p): p is NonNullable<Estimate['doubleSidedParts']>[number] => typeof p === 'string' && p.length > 0)
      .slice(0, 60),
    laborItems: stripUndefinedDeep((est.laborItems ?? []).slice(0, 250)),
    stages: stripUndefinedDeep((est.stages ?? []).slice(0, 12)),
    materialsMode: est.materialsMode === 'detailed' ? 'detailed' : 'quick',
    quickMaterialMultiplier: Math.min(
      20,
      Math.max(0.1, Number.isFinite(est.quickMaterialMultiplier) ? est.quickMaterialMultiplier : 1)
    ),
    quickMaterials: stripUndefinedDeep((est.quickMaterials ?? []).slice(0, 150)),
    detailedMaterials: stripUndefinedDeep((est.detailedMaterials ?? []).slice(0, 150)),
    adjustment: {
      kind:
        est.adjustment?.kind === 'discount' || est.adjustment?.kind === 'markup'
          ? est.adjustment.kind
          : 'none',
      valueType: est.adjustment?.valueType === 'fixed_uah' ? 'fixed_uah' : 'percent',
      value: Number.isFinite(est.adjustment?.value) ? est.adjustment.value : 0,
    },
    exchangeRate: sanitizeExchangeRate(est.exchangeRate),
    totals: {
      laborSubtotalUah: finiteOrZero(est.totals?.laborSubtotalUah),
      materialsSubtotalUah: finiteOrZero(est.totals?.materialsSubtotalUah),
      subtotalBeforeAdjustmentUah: finiteOrZero(est.totals?.subtotalBeforeAdjustmentUah),
      adjustmentAmountUah: finiteOrZero(est.totals?.adjustmentAmountUah),
      totalUah: finiteOrZero(est.totals?.totalUah),
    },
    isSample: Boolean(est.isSample),
    ownerId: uid,
  };
}

function needsLegacyEstimateRepair(
  existingData: Record<string, unknown>,
  uid: string,
  estId: string
): boolean {
  const hasUnexpectedKeys = Object.keys(existingData).some(
    (k) => !ALLOWED_ESTIMATE_KEYS.has(k)
  );
  return (
    typeof existingData.clientCreatedAt !== 'string' ||
    existingData.clientCreatedAt.length === 0 ||
    existingData.clientCreatedAt.length > 40 ||
    !(existingData.createdAt instanceof Timestamp) ||
    existingData.ownerId !== uid ||
    existingData.id !== estId ||
    typeof existingData.orderDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(existingData.orderDate) ||
    hasUnexpectedKeys
  );
}

function docToEstimate(raw: Record<string, unknown>): Estimate {
  const nowIso = new Date().toISOString();
  const createdAt = clampStr(
    raw.clientCreatedAt,
    40,
    timestampToIso(raw.createdAt, nowIso)
  );
  const updatedAt = clampStr(
    raw.clientUpdatedAt,
    40,
    timestampToIso(raw.updatedAt, createdAt)
  );
  const rawDeposit =
    raw.deposit && typeof raw.deposit === 'object'
      ? (raw.deposit as Record<string, unknown>)
      : null;
  const rawPrelimAt = raw.preliminaryLockedAt ? String(raw.preliminaryLockedAt) : undefined;
  const rawPrelimTotal =
    typeof raw.preliminaryTotalUah === 'number' && Number.isFinite(raw.preliminaryTotalUah)
      ? raw.preliminaryTotalUah
      : undefined;

  return {
    id: String(raw.id),
    estimateNumber: String(raw.estimateNumber ?? raw.id),
    workshopId: String(raw.workshopId ?? DEFAULT_WORKSHOP_ID),
    schemaVersion: Number(raw.schemaVersion ?? CURRENT_SCHEMA_VERSION),
    createdAt,
    updatedAt,
    orderDate: String(raw.orderDate ?? createdAt.slice(0, 10)),
    dueDate: raw.dueDate ? String(raw.dueDate) : undefined,
    orderPhase: raw.orderPhase === 'final' ? 'final' : 'preliminary',
    preliminaryTotalUah:
      rawPrelimTotal !== undefined && (rawPrelimTotal > 0 || Boolean(rawPrelimAt))
        ? rawPrelimTotal
        : undefined,
    preliminaryLockedAt: rawPrelimAt || undefined,
    deposit: rawDeposit
      ? {
          expectedUah: Number(rawDeposit.expectedUah ?? 0),
          receivedUah: Number(rawDeposit.receivedUah ?? 0),
          receivedAt: rawDeposit.receivedAt ? String(rawDeposit.receivedAt) : undefined,
          note: rawDeposit.note ? String(rawDeposit.note) : undefined,
        }
      : { expectedUah: 0, receivedUah: 0 },
    customerName: String(raw.customerName ?? ''),
    customerPhone: raw.customerPhone ? String(raw.customerPhone) : undefined,
    vehicleType: (raw.vehicleType as Estimate['vehicleType']) ?? 'car',
    vehicleMake: String(raw.vehicleMake ?? ''),
    vehicleModel: String(raw.vehicleModel ?? ''),
    vehicleYear: raw.vehicleYear ? String(raw.vehicleYear) : undefined,
    vehicleColor: raw.vehicleColor ? String(raw.vehicleColor) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    selectedParts: Array.isArray(raw.selectedParts) ? (raw.selectedParts as Estimate['selectedParts']) : [],
    doubleSidedParts: Array.isArray(raw.doubleSidedParts)
      ? (raw.doubleSidedParts as Estimate['doubleSidedParts'])
      : [],
    laborItems: Array.isArray(raw.laborItems) ? (raw.laborItems as Estimate['laborItems']) : [],
    stages: Array.isArray(raw.stages) ? (raw.stages as Estimate['stages']) : [],
    materialsMode: (raw.materialsMode as Estimate['materialsMode']) ?? 'quick',
    quickMaterialMultiplier: Number(raw.quickMaterialMultiplier ?? 1),
    quickMaterials: Array.isArray(raw.quickMaterials) ? (raw.quickMaterials as Estimate['quickMaterials']) : [],
    detailedMaterials: Array.isArray(raw.detailedMaterials)
      ? (raw.detailedMaterials as Estimate['detailedMaterials'])
      : [],
    adjustment: raw.adjustment as Estimate['adjustment'],
    exchangeRate: raw.exchangeRate as Estimate['exchangeRate'],
    totals: raw.totals as Estimate['totals'],
    isSample: Boolean(raw.isSample),
  };
}

async function getDocPreferServer(ref: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(ref);
  } catch {
    return await getDoc(ref);
  }
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const email = clampStr(user.email ?? '', 254);
  const displayName = clampStr(user.displayName ?? user.email ?? 'Workshop', 120);

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      currentOp = OperationType.CREATE;
      await setDoc(ref, {
        ownerId: user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const data = snap.data();
      if (
        data.ownerId !== user.uid ||
        typeof data.email !== 'string' ||
        typeof data.displayName !== 'string' ||
        !(data.createdAt instanceof Timestamp)
      ) {
        currentOp = OperationType.UPDATE;
        await setDoc(ref, {
          ownerId: user.uid,
          email,
          displayName,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (data.email !== email || data.displayName !== displayName) {
        currentOp = OperationType.UPDATE;
        await updateDoc(ref, {
          email,
          displayName,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

export async function syncEstimateToCloud(uid: string, est: Estimate): Promise<void> {
  const estId = sanitizeId(est.id, est.id, 128);
  const path = `users/${uid}/estimates/${estId}`;
  const ref = doc(db, 'users', uid, 'estimates', estId);
  const baseFields = sanitizeEstimateMutableFields(uid, est);

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      currentOp = OperationType.CREATE;
      await setDoc(ref, {
        ...baseFields,
        id: estId,
        clientCreatedAt: clampStr(est.createdAt || new Date().toISOString(), 40),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      currentOp = OperationType.UPDATE;
      const existingData = snap.data();
      if (needsLegacyEstimateRepair(existingData, uid, estId)) {
        await setDoc(ref, {
          ...baseFields,
          id: estId,
          clientCreatedAt: clampStr(
            typeof existingData.clientCreatedAt === 'string' && existingData.clientCreatedAt.length > 0
              ? existingData.clientCreatedAt
              : est.createdAt || new Date().toISOString(),
            40
          ),
          createdAt:
            existingData.createdAt instanceof Timestamp
              ? existingData.createdAt
              : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const { ownerId: _ignoredOwner, ...mutableOnly } = baseFields;
        await updateDoc(ref, {
          ...mutableOnly,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

export async function toggleEstimateStageInCloud(
  uid: string,
  estimateId: string,
  stages: EstimateStageItem[],
  clientUpdatedAt: string,
  fallbackEstimate?: Estimate
): Promise<void> {
  const estId = sanitizeId(estimateId, estimateId, 128);
  const path = `users/${uid}/estimates/${estId}`;
  const ref = doc(db, 'users', uid, 'estimates', estId);

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      if (fallbackEstimate) {
        await syncEstimateToCloud(uid, fallbackEstimate);
      }
      return;
    }
    if (fallbackEstimate && needsLegacyEstimateRepair(snap.data(), uid, estId)) {
      await syncEstimateToCloud(uid, fallbackEstimate);
      return;
    }
    currentOp = OperationType.UPDATE;
    await updateDoc(ref, {
      stages: stripUndefinedDeep(stages.slice(0, 12)),
      clientUpdatedAt: clampStr(clientUpdatedAt, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

export async function updateEstimateDepositInCloud(
  uid: string,
  estimateId: string,
  deposit: DepositInfo,
  clientUpdatedAt: string,
  fallbackEstimate?: Estimate
): Promise<void> {
  const estId = sanitizeId(estimateId, estimateId, 128);
  const path = `users/${uid}/estimates/${estId}`;
  const ref = doc(db, 'users', uid, 'estimates', estId);

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      if (fallbackEstimate) {
        await syncEstimateToCloud(uid, fallbackEstimate);
      }
      return;
    }
    if (fallbackEstimate && needsLegacyEstimateRepair(snap.data(), uid, estId)) {
      await syncEstimateToCloud(uid, fallbackEstimate);
      return;
    }
    currentOp = OperationType.UPDATE;
    await updateDoc(ref, {
      deposit: sanitizeDeposit(deposit),
      clientUpdatedAt: clampStr(clientUpdatedAt, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

export async function deleteEstimateFromCloud(uid: string, estimateId: string): Promise<void> {
  const estId = sanitizeId(estimateId, estimateId, 128);
  const path = `users/${uid}/estimates/${estId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'estimates', estId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncSettingsToCloud(uid: string, settings: AppSettings): Promise<void> {
  const path = `users/${uid}/settings/app_settings`;
  const ref = doc(db, 'users', uid, 'settings', 'app_settings');
  const mutable = {
    workshopId: sanitizeId(settings.workshopId, DEFAULT_WORKSHOP_ID, 64),
    workshopName: clampStr(settings.workshopName, 120),
    workshopPhone: clampStr(settings.workshopPhone ?? '', 40),
    workshopAddress: clampStr(settings.workshopAddress ?? '', 200),
    locale: settings.locale === 'ru' ? 'ru' : 'uk',
    theme:
      settings.theme === 'dark' || settings.theme === 'light' || settings.theme === 'system'
        ? settings.theme
        : 'system',
    currentExchangeRate: sanitizeExchangeRate(settings.currentExchangeRate),
    reminderSnoozedUntil: clampStr(settings.reminderSnoozedUntil ?? '', 40),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      currentOp = OperationType.CREATE;
      await setDoc(ref, {
        ownerId: uid,
        id: 'app_settings',
        ...mutable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      currentOp = OperationType.UPDATE;
      const existingData = snap.data();
      const needsRepair =
        existingData.ownerId !== uid ||
        existingData.id !== 'app_settings' ||
        !(existingData.createdAt instanceof Timestamp);
      if (needsRepair) {
        await setDoc(ref, {
          ownerId: uid,
          id: 'app_settings',
          ...mutable,
          createdAt:
            existingData.createdAt instanceof Timestamp
              ? existingData.createdAt
              : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

export async function syncMaterialToCloud(uid: string, mat: MaterialCatalogItem): Promise<void> {
  const matId = sanitizeId(mat.id, mat.id, 128);
  const path = `users/${uid}/materials/${matId}`;
  const ref = doc(db, 'users', uid, 'materials', matId);
  const safeName = clampStr((mat.name ?? '').trim() || matId, 140, matId);
  const safeCategory: MaterialCategory = VALID_MATERIAL_CATEGORIES.has(mat.category)
    ? mat.category
    : 'other';
  const safeUnit: MaterialUnit = VALID_MATERIAL_UNITS.has(mat.packageUnit)
    ? mat.packageUnit
    : 'pcs';
  const mutable = {
    workshopId: sanitizeId(mat.workshopId, DEFAULT_WORKSHOP_ID, 64),
    name: safeName,
    category: safeCategory,
    packageSize: Math.max(0.01, Number.isFinite(mat.packageSize) ? mat.packageSize : 1),
    packageUnit: safeUnit,
    packagePrice: Math.max(0, Number.isFinite(mat.packagePrice) ? mat.packagePrice : 0),
    currency: mat.currency === 'USD' ? 'USD' : 'UAH',
    isCustom: Boolean(mat.isCustom),
    isSample: Boolean(mat.isSample),
    clientUpdatedAt: clampStr(mat.updatedAt || new Date().toISOString(), 40),
  };

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      currentOp = OperationType.CREATE;
      await setDoc(ref, {
        ownerId: uid,
        id: matId,
        ...mutable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      currentOp = OperationType.UPDATE;
      const existingData = snap.data();
      const needsRepair =
        existingData.ownerId !== uid ||
        existingData.id !== matId ||
        !(existingData.createdAt instanceof Timestamp);
      if (needsRepair) {
        await setDoc(ref, {
          ownerId: uid,
          id: matId,
          ...mutable,
          createdAt:
            existingData.createdAt instanceof Timestamp
              ? existingData.createdAt
              : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

export async function deleteMaterialFromCloud(uid: string, id: string): Promise<void> {
  const matId = sanitizeId(id, id, 128);
  const path = `users/${uid}/materials/${matId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'materials', matId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncLaborOpToCloud(uid: string, op: MasterLaborOperation): Promise<void> {
  const opId = sanitizeId(op.id, op.id, 128);
  const path = `users/${uid}/laborPrices/${opId}`;
  const ref = doc(db, 'users', uid, 'laborPrices', opId);
  const safeOpType: LaborOperationType = VALID_LABOR_TYPES.has(op.operationType)
    ? op.operationType
    : 'custom';
  const mutable = {
    workshopId: sanitizeId(op.workshopId, DEFAULT_WORKSHOP_ID, 64),
    operationType: safeOpType,
    customName: clampStr(op.customName ?? '', 140),
    basePrice: Math.max(0, Number.isFinite(op.basePrice) ? op.basePrice : 0),
    currency: op.currency === 'USD' ? 'USD' : 'UAH',
    isSample: Boolean(op.isSample),
    clientUpdatedAt: clampStr(op.updatedAt || new Date().toISOString(), 40),
  };

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      currentOp = OperationType.CREATE;
      await setDoc(ref, {
        ownerId: uid,
        id: opId,
        ...mutable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      currentOp = OperationType.UPDATE;
      const existingData = snap.data();
      const needsRepair =
        existingData.ownerId !== uid ||
        existingData.id !== opId ||
        !(existingData.createdAt instanceof Timestamp);
      if (needsRepair) {
        await setDoc(ref, {
          ownerId: uid,
          id: opId,
          ...mutable,
          createdAt:
            existingData.createdAt instanceof Timestamp
              ? existingData.createdAt
              : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

export async function deleteLaborOpFromCloud(uid: string, id: string): Promise<void> {
  const opId = sanitizeId(id, id, 128);
  const path = `users/${uid}/laborPrices/${opId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'laborPrices', opId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncPartTemplateToCloud(
  uid: string,
  tpl: PartQuickTemplate
): Promise<void> {
  const partId = sanitizeId(tpl.partId, tpl.partId, 64);
  const path = `users/${uid}/partTemplates/${partId}`;
  const ref = doc(db, 'users', uid, 'partTemplates', partId);
  const safeRules = (tpl.rules ?? []).slice(0, 50).map((rule) => ({
    materialId: sanitizeId(rule.materialId, '', 128),
    quantity: Math.max(0, Number.isFinite(rule.quantity) ? rule.quantity : 0),
    unit: VALID_MATERIAL_UNITS.has(rule.unit) ? rule.unit : ('ml' as MaterialUnit),
  }));
  const mutable = {
    workshopId: sanitizeId(tpl.workshopId, DEFAULT_WORKSHOP_ID, 64),
    rules: stripUndefinedDeep(safeRules),
    clientUpdatedAt: clampStr(tpl.updatedAt || new Date().toISOString(), 40),
  };

  let currentOp = OperationType.GET;
  try {
    const snap = await getDocPreferServer(ref);
    if (!snap.exists()) {
      currentOp = OperationType.CREATE;
      await setDoc(ref, {
        ownerId: uid,
        partId,
        ...mutable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      currentOp = OperationType.UPDATE;
      const existingData = snap.data();
      const needsRepair =
        existingData.ownerId !== uid ||
        existingData.partId !== partId ||
        !(existingData.createdAt instanceof Timestamp);
      if (needsRepair) {
        await setDoc(ref, {
          ownerId: uid,
          partId,
          ...mutable,
          createdAt:
            existingData.createdAt instanceof Timestamp
              ? existingData.createdAt
              : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, currentOp, path);
  }
}

function isLocalNewer(localUpdatedAt: string, cloudUpdatedAt: string | undefined): boolean {
  if (cloudUpdatedAt === undefined) return true;
  const localTs = Date.parse(localUpdatedAt);
  const cloudTs = cloudUpdatedAt ? Date.parse(cloudUpdatedAt) : NaN;
  if (Number.isNaN(cloudTs)) return true;
  return !Number.isNaN(localTs) && localTs > cloudTs;
}

/**
 * Ensures user profile exists and pushes local non-sample / initial records to cloud
 * without clobbering newer orders that already exist on another device.
 */
export async function bootstrapCloudSync(
  user: User,
  localState: HydratedDatabaseState
): Promise<void> {
  const uid = user.uid;
  await ensureUserProfile(user);

  // 1. Settings
  let isFirstCloudInit = false;
  const settingsRef = doc(db, 'users', uid, 'settings', 'app_settings');
  try {
    const settingsSnap = await getDocPreferServer(settingsRef);
    if (!settingsSnap.exists()) {
      isFirstCloudInit = true;
      await syncSettingsToCloud(uid, localState.settings);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}/settings/app_settings`);
  }

  // 2. Estimates: upload local real estimates not yet in cloud or newer locally
  try {
    const cloudEstSnap = await getDocs(
      query(collection(db, 'users', uid, 'estimates'), where('ownerId', '==', uid))
    );
    const cloudEstMap = new Map<string, string>();
    cloudEstSnap.forEach((docSnap) => {
      const data = docSnap.data();
      cloudEstMap.set(docSnap.id, String(data.clientUpdatedAt ?? ''));
    });

    const isFreshCloudAccount = isFirstCloudInit && cloudEstMap.size === 0;
    for (const localEst of localState.estimates) {
      const cloudUpdatedAt = cloudEstMap.get(localEst.id);
      if (isFreshCloudAccount) {
        await syncEstimateToCloud(uid, localEst);
      } else if (!localEst.isSample && isLocalNewer(localEst.updatedAt, cloudUpdatedAt)) {
        await syncEstimateToCloud(uid, localEst);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/estimates`);
  }

  // 3. Materials, Labor Prices, Part Templates (seed cloud if empty; upload custom/newer local items)
  try {
    const [matSnap, laborSnap, tplSnap] = await Promise.all([
      getDocs(query(collection(db, 'users', uid, 'materials'), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'users', uid, 'laborPrices'), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'users', uid, 'partTemplates'), where('ownerId', '==', uid))),
    ]);

    const seedMaterialSet = new Set<string>(DEFAULT_SEED_MATERIAL_IDS);
    const staleSampleIds = matSnap.docs
      .filter((d) => {
        const data = d.data();
        return data.isSample === true && seedMaterialSet.has(d.id);
      })
      .map((d) => d.id);

    if (staleSampleIds.length > 0) {
      await Promise.all(staleSampleIds.map((id) => deleteMaterialFromCloud(uid, id)));
    }

    const matUpdatedMap = new Map<string, string>();
    for (const d of matSnap.docs) {
      if (!staleSampleIds.includes(d.id)) {
        matUpdatedMap.set(d.id, String(d.data().clientUpdatedAt ?? ''));
      }
    }

    if (matUpdatedMap.size === 0) {
      if (localState.materials.length > 0) {
        await Promise.all(localState.materials.map((m) => syncMaterialToCloud(uid, m)));
      }
    } else {
      for (const m of localState.materials) {
        const cloudUpdated = matUpdatedMap.get(m.id);
        if (cloudUpdated === undefined || (!m.isSample && isLocalNewer(m.updatedAt, cloudUpdated))) {
          await syncMaterialToCloud(uid, m);
        }
      }
    }

    if (laborSnap.empty) {
      await Promise.all(localState.laborPrices.map((op) => syncLaborOpToCloud(uid, op)));
    } else {
      const laborUpdatedMap = new Map<string, string>();
      laborSnap.docs.forEach((d) => {
        laborUpdatedMap.set(d.id, String(d.data().clientUpdatedAt ?? ''));
      });
      for (const op of localState.laborPrices) {
        const cloudUpdated = laborUpdatedMap.get(op.id);
        if (!op.isSample && (cloudUpdated === undefined || isLocalNewer(op.updatedAt, cloudUpdated))) {
          await syncLaborOpToCloud(uid, op);
        }
      }
    }

    if (tplSnap.empty) {
      await Promise.all(localState.partTemplates.map((tpl) => syncPartTemplateToCloud(uid, tpl)));
    } else {
      const tplUpdatedMap = new Map<string, string>();
      tplSnap.docs.forEach((d) => {
        tplUpdatedMap.set(d.id, String(d.data().clientUpdatedAt ?? ''));
      });
      for (const tpl of localState.partTemplates) {
        const cloudUpdated = tplUpdatedMap.get(tpl.partId);
        if (cloudUpdated === undefined || isLocalNewer(tpl.updatedAt, cloudUpdated)) {
          await syncPartTemplateToCloud(uid, tpl);
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/catalogs`);
  }
}

export interface CloudSyncCallbacks {
  onEstimates: (estimates: Estimate[]) => void;
  onSettings: (settings: AppSettings) => void;
  onMaterials: (materials: MaterialCatalogItem[]) => void;
  onLaborPrices: (laborPrices: MasterLaborOperation[]) => void;
  onPartTemplates: (templates: PartQuickTemplate[]) => void;
  onError?: (err: unknown) => void;
}

export function subscribeToWorkshopCloud(
  uid: string,
  currentSettings: AppSettings,
  callbacks: CloudSyncCallbacks
): () => void {
  const estPath = `users/${uid}/estimates`;
  const settingsPath = `users/${uid}/settings/app_settings`;
  const matPath = `users/${uid}/materials`;
  const laborPath = `users/${uid}/laborPrices`;
  const tplPath = `users/${uid}/partTemplates`;

  const reportErr = (err: unknown, op: OperationType, path: string) => {
    callbacks.onError?.(err);
    try {
      handleFirestoreError(err, op, path);
    } catch (wrapped) {
      console.error(wrapped);
    }
  };

  const unsubEst = onSnapshot(
    query(collection(db, 'users', uid, 'estimates'), where('ownerId', '==', uid)),
    (snap) => {
      const items = snap.docs
        .map((d) => docToEstimate(d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callbacks.onEstimates(items);
    },
    (err) => reportErr(err, OperationType.LIST, estPath)
  );

  const unsubSettings = onSnapshot(
    doc(db, 'users', uid, 'settings', 'app_settings'),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      callbacks.onSettings({
        ...currentSettings,
        id: 'app_settings',
        workshopId: String(d.workshopId ?? currentSettings.workshopId),
        workshopName: String(d.workshopName ?? currentSettings.workshopName),
        workshopPhone: d.workshopPhone ? String(d.workshopPhone) : undefined,
        workshopAddress: d.workshopAddress ? String(d.workshopAddress) : undefined,
        locale: (d.locale as AppSettings['locale']) ?? currentSettings.locale,
        theme: (d.theme as AppSettings['theme']) ?? currentSettings.theme,
        currentExchangeRate:
          (d.currentExchangeRate as AppSettings['currentExchangeRate']) ??
          currentSettings.currentExchangeRate,
        reminderSnoozedUntil: d.reminderSnoozedUntil ? String(d.reminderSnoozedUntil) : undefined,
        schemaVersion: Number(d.schemaVersion ?? CURRENT_SCHEMA_VERSION),
      });
    },
    (err) => reportErr(err, OperationType.GET, settingsPath)
  );

  const unsubMat = onSnapshot(
    query(collection(db, 'users', uid, 'materials'), where('ownerId', '==', uid)),
    (snap) => {
      const items: MaterialCatalogItem[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id),
          workshopId: String(d.workshopId ?? DEFAULT_WORKSHOP_ID),
          name: String(d.name ?? ''),
          category: d.category as MaterialCatalogItem['category'],
          packageSize: Number(d.packageSize ?? 1),
          packageUnit: d.packageUnit as MaterialCatalogItem['packageUnit'],
          packagePrice: Number(d.packagePrice ?? 0),
          currency: (d.currency as MaterialCatalogItem['currency']) ?? 'UAH',
          isCustom: Boolean(d.isCustom),
          isSample: Boolean(d.isSample),
          updatedAt: String(d.clientUpdatedAt ?? new Date().toISOString()),
        };
      });
      callbacks.onMaterials(items);
    },
    (err) => reportErr(err, OperationType.LIST, matPath)
  );

  const unsubLabor = onSnapshot(
    query(collection(db, 'users', uid, 'laborPrices'), where('ownerId', '==', uid)),
    (snap) => {
      if (snap.empty) return;
      const items: MasterLaborOperation[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id),
          workshopId: String(d.workshopId ?? DEFAULT_WORKSHOP_ID),
          operationType: d.operationType as MasterLaborOperation['operationType'],
          customName: d.customName ? String(d.customName) : undefined,
          basePrice: Number(d.basePrice ?? 0),
          currency: (d.currency as MasterLaborOperation['currency']) ?? 'UAH',
          isSample: Boolean(d.isSample),
          updatedAt: String(d.clientUpdatedAt ?? new Date().toISOString()),
        };
      });
      callbacks.onLaborPrices(items);
    },
    (err) => reportErr(err, OperationType.LIST, laborPath)
  );

  const unsubTpl = onSnapshot(
    query(collection(db, 'users', uid, 'partTemplates'), where('ownerId', '==', uid)),
    (snap) => {
      if (snap.empty) return;
      const items: PartQuickTemplate[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          partId: d.partId as PartQuickTemplate['partId'],
          workshopId: String(d.workshopId ?? DEFAULT_WORKSHOP_ID),
          rules: Array.isArray(d.rules) ? (d.rules as PartQuickTemplate['rules']) : [],
          updatedAt: String(d.clientUpdatedAt ?? new Date().toISOString()),
        };
      });
      callbacks.onPartTemplates(items);
    },
    (err) => reportErr(err, OperationType.LIST, tplPath)
  );

  return () => {
    unsubEst();
    unsubSettings();
    unsubMat();
    unsubLabor();
    unsubTpl();
  };
}

export async function fetchCloudEstimatesNow(uid: string): Promise<Estimate[]> {
  const path = `users/${uid}/estimates`;
  try {
    const snap = await getDocsFromServer(
      query(collection(db, 'users', uid, 'estimates'), where('ownerId', '==', uid))
    );
    return snap.docs
      .map((d) => docToEstimate(d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
