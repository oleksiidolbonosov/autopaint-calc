import {
  buildDefaultPartTemplates,
  buildSampleEstimates,
  createDefaultStages,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_LABOR_OPERATIONS,
  DEFAULT_MATERIALS_CATALOG,
  DEFAULT_SEED_MATERIAL_IDS,
  DEFAULT_SETTINGS,
  DEFAULT_WORKSHOP_ID,
} from '../data/seedData';
import {
  AppSettings,
  BackupPayload,
  Estimate,
  MasterLaborOperation,
  MaterialCatalogItem,
  PartQuickTemplate,
} from '../types/models';

const DB_NAME = 'autopaint_calc_db';
const DB_VERSION = 2;

const STORES = {
  estimates: 'estimates',
  materials: 'materials',
  laborPrices: 'laborPrices',
  partTemplates: 'partTemplates',
  settings: 'settings',
  meta: 'meta',
} as const;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('IndexedDB open timed out.'));
      }
    }, 2500);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      window.clearTimeout(timer);
      reject(err instanceof Error ? err : new Error('Failed to open IndexedDB'));
      return;
    }

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORES.estimates)) {
          const estStore = db.createObjectStore(STORES.estimates, { keyPath: 'id' });
          estStore.createIndex('createdAt', 'createdAt', { unique: false });
          estStore.createIndex('workshopId', 'workshopId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.materials)) {
          db.createObjectStore(STORES.materials, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.laborPrices)) {
          db.createObjectStore(STORES.laborPrices, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta, { keyPath: 'key' });
        }
      }

      // v1 -> v2 schema migration: add configurable per-part templates store
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORES.partTemplates)) {
          db.createObjectStore(STORES.partTemplates, { keyPath: 'partId' });
        }
      }
    };

    request.onsuccess = () => {
      window.clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve(request.result);
      }
    };
    request.onblocked = () => {
      window.clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error('IndexedDB open blocked by another tab.'));
      }
    };
    request.onerror = () => {
      window.clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      }
    };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export interface HydratedDatabaseState {
  settings: AppSettings;
  estimates: Estimate[];
  materials: MaterialCatalogItem[];
  laborPrices: MasterLaborOperation[];
  partTemplates: PartQuickTemplate[];
}

function normalizeEstimate(est: Estimate): Estimate {
  const fallbackOrderDate =
    typeof est.createdAt === 'string' && est.createdAt.length >= 10
      ? est.createdAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  return {
    ...est,
    vehicleType: est.vehicleType ?? 'car',
    orderDate: est.orderDate || fallbackOrderDate,
    orderPhase: est.orderPhase ?? 'preliminary',
    doubleSidedParts: Array.isArray(est.doubleSidedParts) ? est.doubleSidedParts : [],
    deposit: est.deposit ?? { expectedUah: 0, receivedUah: 0 },
    stages:
      Array.isArray(est.stages) && est.stages.length > 0
        ? est.stages
        : createDefaultStages(0),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Initializes IndexedDB, runs migrations if needed, and seeds sample data only on first run.
 */
export async function initializeAndLoadDatabase(): Promise<HydratedDatabaseState> {
  const db = await openDatabase();

  const metaTx = db.transaction([STORES.meta, STORES.settings], 'readonly');
  const seededMeta = await reqToPromise<{ key: string; value: boolean } | undefined>(
    metaTx.objectStore(STORES.meta).get('seeded_v2')
  );
  const removedDefaultMatsMeta = await reqToPromise<{ key: string; value: boolean } | undefined>(
    metaTx.objectStore(STORES.meta).get('removed_default_materials_v1')
  );
  const existingSettings = await reqToPromise<AppSettings | undefined>(
    metaTx.objectStore(STORES.settings).get('app_settings')
  );
  await txDone(metaTx);

  if (!seededMeta || !existingSettings) {
    const seedTemplates = buildDefaultPartTemplates();
    const seedEstimates = buildSampleEstimates();

    const writeTx = db.transaction(
      [
        STORES.settings,
        STORES.laborPrices,
        STORES.materials,
        STORES.partTemplates,
        STORES.estimates,
        STORES.meta,
      ],
      'readwrite'
    );

    if (!existingSettings) {
      writeTx.objectStore(STORES.settings).put(DEFAULT_SETTINGS);
    } else if (!existingSettings.workshopId) {
      writeTx.objectStore(STORES.settings).put({
        ...existingSettings,
        workshopId: DEFAULT_WORKSHOP_ID,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });
    }

    const laborStore = writeTx.objectStore(STORES.laborPrices);
    const existingLaborCount = await reqToPromise(laborStore.count());
    if (existingLaborCount === 0) {
      for (const op of DEFAULT_LABOR_OPERATIONS) laborStore.put(op);
    }

    const matStore = writeTx.objectStore(STORES.materials);
    const existingMatCount = await reqToPromise(matStore.count());
    if (existingMatCount === 0) {
      for (const m of DEFAULT_MATERIALS_CATALOG) matStore.put(m);
    }

    const tplStore = writeTx.objectStore(STORES.partTemplates);
    const existingTplCount = await reqToPromise(tplStore.count());
    if (existingTplCount === 0) {
      for (const tpl of seedTemplates) tplStore.put(tpl);
    }

    const estStore = writeTx.objectStore(STORES.estimates);
    const existingEstCount = await reqToPromise(estStore.count());
    if (existingEstCount === 0 && !seededMeta) {
      for (const est of seedEstimates) estStore.put(est);
    }

    writeTx.objectStore(STORES.meta).put({
      key: 'seeded_v2',
      value: true,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    });
    writeTx.objectStore(STORES.meta).put({
      key: 'removed_default_materials_v1',
      value: true,
      updatedAt: new Date().toISOString(),
    });

    await txDone(writeTx);
  }

  const readTx = db.transaction(
    [
      STORES.settings,
      STORES.estimates,
      STORES.materials,
      STORES.laborPrices,
      STORES.partTemplates,
    ],
    'readonly'
  );

  let [settingsRes, estimatesRes, materialsRes, laborRes, templatesRes] = await Promise.all([
    reqToPromise<AppSettings | undefined>(readTx.objectStore(STORES.settings).get('app_settings')),
    reqToPromise<Estimate[]>(readTx.objectStore(STORES.estimates).getAll()),
    reqToPromise<MaterialCatalogItem[]>(readTx.objectStore(STORES.materials).getAll()),
    reqToPromise<MasterLaborOperation[]>(readTx.objectStore(STORES.laborPrices).getAll()),
    reqToPromise<PartQuickTemplate[]>(readTx.objectStore(STORES.partTemplates).getAll()),
  ]);

  await txDone(readTx);

  // One-time cleanup of old untouched default sample materials for existing users
  if (!removedDefaultMatsMeta) {
    const seedIdSet = new Set<string>(DEFAULT_SEED_MATERIAL_IDS);
    const removedIds = new Set(
      materialsRes
        .filter((m) => m.isSample === true && seedIdSet.has(m.id))
        .map((m) => m.id)
    );
    const cleanupTx = db.transaction([STORES.materials, STORES.partTemplates, STORES.meta], 'readwrite');
    if (removedIds.size > 0) {
      const mStore = cleanupTx.objectStore(STORES.materials);
      for (const id of removedIds) {
        mStore.delete(id);
      }
      materialsRes = materialsRes.filter((m) => !removedIds.has(m.id));
      const tStore = cleanupTx.objectStore(STORES.partTemplates);
      templatesRes = templatesRes.map((tpl) => {
        const filteredRules = tpl.rules.filter((r) => !removedIds.has(r.materialId));
        if (filteredRules.length !== tpl.rules.length) {
          const nextTpl = { ...tpl, rules: filteredRules };
          tStore.put(nextTpl);
          return nextTpl;
        }
        return tpl;
      });
    }
    cleanupTx.objectStore(STORES.meta).put({
      key: 'removed_default_materials_v1',
      value: true,
      updatedAt: new Date().toISOString(),
    });
    await txDone(cleanupTx);
  }

  // Ensure any newly introduced VehiclePartId entries get default templates without touching user edits
  const defaultTemplates = buildDefaultPartTemplates();
  const existingPartIds = new Set(templatesRes.map((tpl) => tpl.partId));
  const missingTemplates = defaultTemplates.filter((tpl) => !existingPartIds.has(tpl.partId));

  if (missingTemplates.length > 0) {
    const backfillTx = db.transaction(STORES.partTemplates, 'readwrite');
    const tplStore = backfillTx.objectStore(STORES.partTemplates);
    for (const tpl of missingTemplates) {
      tplStore.put(tpl);
      templatesRes.push(tpl);
    }
    await txDone(backfillTx);
  }

  db.close();

  const sortedEstimates = estimatesRes
    .map(normalizeEstimate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    settings: settingsRes ?? DEFAULT_SETTINGS,
    estimates: sortedEstimates,
    materials: materialsRes,
    laborPrices: laborRes,
    partTemplates: templatesRes,
  };
}

export async function saveSettingsToDb(settings: AppSettings): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.settings, 'readwrite');
  tx.objectStore(STORES.settings).put(settings);
  await txDone(tx);
  db.close();
}

export async function saveEstimateToDb(estimate: Estimate): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.estimates, 'readwrite');
  tx.objectStore(STORES.estimates).put(estimate);
  await txDone(tx);
  db.close();
}

export async function deleteEstimateFromDb(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.estimates, 'readwrite');
  tx.objectStore(STORES.estimates).delete(id);
  await txDone(tx);
  db.close();
}

export async function replaceEstimatesInDb(estimates: Estimate[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.estimates, 'readwrite');
  const store = tx.objectStore(STORES.estimates);
  store.clear();
  for (const est of estimates) store.put(est);
  await txDone(tx);
  db.close();
}

export async function replaceMaterialsInDb(materials: MaterialCatalogItem[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.materials, 'readwrite');
  const store = tx.objectStore(STORES.materials);
  store.clear();
  for (const mat of materials) store.put(mat);
  await txDone(tx);
  db.close();
}

export async function replaceLaborPricesInDb(ops: MasterLaborOperation[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.laborPrices, 'readwrite');
  const store = tx.objectStore(STORES.laborPrices);
  store.clear();
  for (const op of ops) store.put(op);
  await txDone(tx);
  db.close();
}

export async function replacePartTemplatesInDb(templates: PartQuickTemplate[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.partTemplates, 'readwrite');
  const store = tx.objectStore(STORES.partTemplates);
  store.clear();
  for (const tpl of templates) store.put(tpl);
  await txDone(tx);
  db.close();
}

export async function saveMaterialToDb(material: MaterialCatalogItem): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.materials, 'readwrite');
  tx.objectStore(STORES.materials).put(material);
  await txDone(tx);
  db.close();
}

export async function deleteMaterialFromDb(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.materials, 'readwrite');
  tx.objectStore(STORES.materials).delete(id);
  await txDone(tx);
  db.close();
}

export async function saveLaborOperationToDb(operation: MasterLaborOperation): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.laborPrices, 'readwrite');
  tx.objectStore(STORES.laborPrices).put(operation);
  await txDone(tx);
  db.close();
}

export async function deleteLaborOperationFromDb(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.laborPrices, 'readwrite');
  tx.objectStore(STORES.laborPrices).delete(id);
  await txDone(tx);
  db.close();
}

export async function savePartTemplateToDb(template: PartQuickTemplate): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.partTemplates, 'readwrite');
  tx.objectStore(STORES.partTemplates).put(template);
  await txDone(tx);
  db.close();
}

export async function exportBackupPayload(): Promise<BackupPayload> {
  const state = await initializeAndLoadDatabase();
  return {
    app: 'AutoPaintCalc',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workshopId: state.settings.workshopId,
    settings: state.settings,
    estimates: state.estimates,
    materials: state.materials,
    laborPrices: state.laborPrices,
    partTemplates: state.partTemplates,
  };
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  payload?: BackupPayload;
}

export function validateAndMigrateBackup(rawText: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { valid: false, error: 'INVALID_JSON' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'INVALID_STRUCTURE' };
  }

  const obj = parsed as Partial<BackupPayload>;
  if (obj.app !== 'AutoPaintCalc') {
    return { valid: false, error: 'INVALID_APP_SIGNATURE' };
  }

  if (
    !obj.settings ||
    !Array.isArray(obj.estimates) ||
    !Array.isArray(obj.materials) ||
    !Array.isArray(obj.laborPrices)
  ) {
    return { valid: false, error: 'MISSING_REQUIRED_COLLECTIONS' };
  }

  // Validate basic shapes of estimates & exchange rates
  for (const est of obj.estimates) {
    if (
      !est.id ||
      !est.estimateNumber ||
      !est.exchangeRate ||
      typeof est.exchangeRate.rate !== 'number' ||
      est.exchangeRate.rate <= 0
    ) {
      return { valid: false, error: 'CORRUPT_ESTIMATE_RECORD' };
    }
  }

  const workshopId = obj.workshopId || obj.settings.workshopId || DEFAULT_WORKSHOP_ID;

  // Migrate v1 backups that lack partTemplates or workshopId
  const migrated: BackupPayload = {
    app: 'AutoPaintCalc',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: obj.exportedAt ?? new Date().toISOString(),
    workshopId,
    settings: {
      ...DEFAULT_SETTINGS,
      ...obj.settings,
      id: 'app_settings',
      workshopId,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    estimates: obj.estimates.map((e) =>
      normalizeEstimate({
        ...e,
        workshopId: e.workshopId || workshopId,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    ),
    materials: obj.materials.map((m) => ({
      ...m,
      workshopId: m.workshopId || workshopId,
    })),
    laborPrices: obj.laborPrices.map((l) => ({
      ...l,
      workshopId: l.workshopId || workshopId,
    })),
    partTemplates:
      Array.isArray(obj.partTemplates) && obj.partTemplates.length > 0
        ? obj.partTemplates
        : buildDefaultPartTemplates(),
  };

  return { valid: true, payload: migrated };
}

export async function importBackupPayload(payload: BackupPayload): Promise<HydratedDatabaseState> {
  const db = await openDatabase();
  const tx = db.transaction(
    [
      STORES.settings,
      STORES.estimates,
      STORES.materials,
      STORES.laborPrices,
      STORES.partTemplates,
      STORES.meta,
    ],
    'readwrite'
  );

  tx.objectStore(STORES.settings).clear();
  tx.objectStore(STORES.estimates).clear();
  tx.objectStore(STORES.materials).clear();
  tx.objectStore(STORES.laborPrices).clear();
  tx.objectStore(STORES.partTemplates).clear();

  tx.objectStore(STORES.settings).put(payload.settings);
  for (const est of payload.estimates) tx.objectStore(STORES.estimates).put(est);
  for (const mat of payload.materials) tx.objectStore(STORES.materials).put(mat);
  for (const op of payload.laborPrices) tx.objectStore(STORES.laborPrices).put(op);
  for (const tpl of payload.partTemplates) tx.objectStore(STORES.partTemplates).put(tpl);

  tx.objectStore(STORES.meta).put({
    key: 'seeded_v2',
    value: true,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  });

  await txDone(tx);
  db.close();

  return initializeAndLoadDatabase();
}

export async function resetToSampleData(): Promise<HydratedDatabaseState> {
  const payload: BackupPayload = {
    app: 'AutoPaintCalc',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workshopId: DEFAULT_WORKSHOP_ID,
    settings: DEFAULT_SETTINGS,
    estimates: buildSampleEstimates(),
    materials: DEFAULT_MATERIALS_CATALOG,
    laborPrices: DEFAULT_LABOR_OPERATIONS,
    partTemplates: buildDefaultPartTemplates(),
  };
  return importBackupPayload(payload);
}
