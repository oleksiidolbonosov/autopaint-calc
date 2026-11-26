import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Calculator,
  Clock,
  Cloud,
  CloudOff,
  Home,
  Layers,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Wrench,
} from 'lucide-react';
import { CustomerEstimateModal } from './components/CustomerEstimateModal';
import { DeadlineReminderModal } from './components/DeadlineReminderModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  buildDefaultPartTemplates,
  buildSampleEstimates,
  createDefaultStages,
  DEFAULT_LABOR_OPERATIONS,
  DEFAULT_MATERIALS_CATALOG,
  DEFAULT_SETTINGS,
} from './data/seedData';
import { VEHICLE_TYPE_MULTIPLIER } from './data/vehicleParts';
import {
  deleteEstimateFromDb,
  deleteLaborOperationFromDb,
  deleteMaterialFromDb,
  importBackupPayload,
  initializeAndLoadDatabase,
  replaceEstimatesInDb,
  replaceLaborPricesInDb,
  replaceMaterialsInDb,
  replacePartTemplatesInDb,
  resetToSampleData,
  saveEstimateToDb,
  saveLaborOperationToDb,
  saveMaterialToDb,
  savePartTemplateToDb,
  saveSettingsToDb,
} from './db/indexedDb';
import { getTranslations } from './i18n/translations';
import { AppScreen, DashboardScreen } from './screens/DashboardScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { LaborScreen } from './screens/LaborScreen';
import { MaterialsScreen } from './screens/MaterialsScreen';
import { NewEstimateScreen } from './screens/NewEstimateScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import {
  bootstrapCloudSync,
  deleteEstimateFromCloud,
  deleteLaborOpFromCloud,
  deleteMaterialFromCloud,
  ensureUserProfile,
  fetchCloudEstimatesNow,
  subscribeToWorkshopCloud,
  syncEstimateToCloud,
  syncLaborOpToCloud,
  syncMaterialToCloud,
  syncPartTemplateToCloud,
  syncSettingsToCloud,
  toggleEstimateStageInCloud,
  updateEstimateDepositInCloud,
} from './services/cloudSyncService';
import { fetchNbuUsdRate } from './services/currencyService';
import {
  createNewEstimateDraft,
  duplicateEstimateDraft,
  prepareEstimateForSave,
} from './services/estimateGenerator';
import {
  auth,
  signInWithGooglePopup,
  signOutFromFirebase,
  testConnection,
} from './services/firebaseClient';
import { getDueSoonEstimates, isReminderSnoozed } from './services/reminderService';
import {
  AppSettings,
  BackupPayload,
  DepositInfo,
  Estimate,
  EstimateStageId,
  MasterLaborOperation,
  MaterialCatalogItem,
  PartQuickTemplate,
  VehicleType,
} from './types/models';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [materials, setMaterials] = useState<MaterialCatalogItem[]>([]);
  const [laborPrices, setLaborPrices] = useState<MasterLaborOperation[]>([]);
  const [partTemplates, setPartTemplates] = useState<PartQuickTemplate[]>([]);

  const [screen, setScreen] = useState<AppScreen>('dashboard');
  const [draft, setDraft] = useState<Estimate | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [customerViewEstimate, setCustomerViewEstimate] = useState<Estimate | null>(null);

  const [isSyncingRate, setIsSyncingRate] = useState(false);
  const [rateSyncMessage, setRateSyncMessage] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const localStateRef = useRef<{
    settings: AppSettings | null;
    estimates: Estimate[];
    materials: MaterialCatalogItem[];
    laborPrices: MasterLaborOperation[];
    partTemplates: PartQuickTemplate[];
  }>({
    settings: null,
    estimates: [],
    materials: [],
    laborPrices: [],
    partTemplates: [],
  });

  localStateRef.current = {
    settings,
    estimates,
    materials,
    laborPrices,
    partTemplates,
  };

  const ensuredProfileUidRef = useRef<string | null>(null);

  useEffect(() => {
    void testConnection();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        ensuredProfileUidRef.current = null;
        setCloudSyncState('idle');
        setCloudError(null);
      } else if (ensuredProfileUidRef.current !== user.uid) {
        ensuredProfileUidRef.current = null;
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    let mounted = true;
    initializeAndLoadDatabase()
      .then((data) => {
        if (!mounted) return;
        setSettings(data.settings);
        setEstimates(data.estimates);
        setMaterials(data.materials);
        setLaborPrices(data.laborPrices);
        setPartTemplates(data.partTemplates);
        setDraft(
          createNewEstimateDraft(data.settings.workshopId, data.settings.currentExchangeRate)
        );
        const initialAlerts = getDueSoonEstimates(data.estimates);
        if (
          initialAlerts.length > 0 &&
          !isReminderSnoozed(data.settings.reminderSnoozedUntil)
        ) {
          setShowReminderModal(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        const fallbackSettings = DEFAULT_SETTINGS;
        const fallbackEstimates = buildSampleEstimates();
        setSettings(fallbackSettings);
        setEstimates(fallbackEstimates);
        setMaterials(DEFAULT_MATERIALS_CATALOG);
        setLaborPrices(DEFAULT_LABOR_OPERATIONS);
        setPartTemplates(buildDefaultPartTemplates());
        setDraft(
          createNewEstimateDraft(
            fallbackSettings.workshopId,
            fallbackSettings.currentExchangeRate
          )
        );
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Cloud Firestore real-time synchronization once Auth & local DB are ready
  useEffect(() => {
    if (!authReady || loading || !authUser || !authUser.emailVerified) return;
    const snapshotSettings = localStateRef.current.settings;
    if (!snapshotSettings) return;

    let cancelled = false;
    let unsubCloud: (() => void) | null = null;

    setCloudSyncState('syncing');
    setCloudError(null);

    bootstrapCloudSync(authUser, {
      settings: snapshotSettings,
      estimates: localStateRef.current.estimates,
      materials: localStateRef.current.materials,
      laborPrices: localStateRef.current.laborPrices,
      partTemplates: localStateRef.current.partTemplates,
    })
      .then(() => {
        if (cancelled) return;
        unsubCloud = subscribeToWorkshopCloud(authUser.uid, snapshotSettings, {
          onEstimates: (cloudEstimates) => {
            setEstimates(cloudEstimates);
            setCloudSyncState('synced');
            void replaceEstimatesInDb(cloudEstimates).catch(() => undefined);
          },
          onSettings: (cloudSettings) => {
            setSettings(cloudSettings);
            void saveSettingsToDb(cloudSettings).catch(() => undefined);
          },
          onMaterials: (cloudMaterials) => {
            setMaterials(cloudMaterials);
            void replaceMaterialsInDb(cloudMaterials).catch(() => undefined);
          },
          onLaborPrices: (cloudLabor) => {
            setLaborPrices(cloudLabor);
            void replaceLaborPricesInDb(cloudLabor).catch(() => undefined);
          },
          onPartTemplates: (cloudTemplates) => {
            setPartTemplates(cloudTemplates);
            void replacePartTemplatesInDb(cloudTemplates).catch(() => undefined);
          },
          onError: (err) => {
            setCloudSyncState('error');
            setCloudError(err instanceof Error ? err.message : String(err));
          },
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setCloudSyncState('error');
        setCloudError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      unsubCloud?.();
    };
  }, [authReady, loading, authUser?.uid, authUser?.emailVerified]);

  // Automatically push any local pending changes when network comes back online
  useEffect(() => {
    if (!authReady || loading || !authUser || !authUser.emailVerified) return;
    const onOnline = () => {
      const snapSettings = localStateRef.current.settings;
      if (!snapSettings) return;
      setCloudSyncState('syncing');
      void bootstrapCloudSync(authUser, {
        settings: snapSettings,
        estimates: localStateRef.current.estimates,
        materials: localStateRef.current.materials,
        laborPrices: localStateRef.current.laborPrices,
        partTemplates: localStateRef.current.partTemplates,
      })
        .then(() => {
          setCloudSyncState('synced');
          setCloudError(null);
        })
        .catch((err) => {
          setCloudSyncState('error');
          setCloudError(err instanceof Error ? err.message : String(err));
        });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [authReady, loading, authUser]);

  // Apply light/dark theme to <html>
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const apply = (dark: boolean) => {
      root.classList.toggle('dark', dark);
    };
    if (settings.theme === 'dark') {
      apply(true);
    } else if (settings.theme === 'light') {
      apply(false);
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [settings?.theme]);

  const t = useMemo(
    () => getTranslations(settings?.locale ?? 'uk'),
    [settings?.locale]
  );

  const dueAlerts = useMemo(() => getDueSoonEstimates(estimates), [estimates]);

  // Regularly check for due-soon orders (every 15 mins + when returning to app)
  useEffect(() => {
    if (!settings) return;
    const checkReminder = () => {
      if (dueAlerts.length > 0 && !isReminderSnoozed(settings.reminderSnoozedUntil)) {
        setShowReminderModal(true);
      }
    };
    const intervalId = window.setInterval(checkReminder, 15 * 60 * 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkReminder();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dueAlerts.length, settings]);

  const runCloudTask = async (task: (uid: string) => Promise<void>): Promise<boolean> => {
    if (!authUser || !authUser.emailVerified) return false;
    const uid = authUser.uid;
    setCloudSyncState('syncing');
    try {
      if (ensuredProfileUidRef.current !== uid) {
        await ensureUserProfile(authUser);
        ensuredProfileUidRef.current = uid;
      }
      await task(uid);
      setCloudSyncState('synced');
      setCloudError(null);
      return true;
    } catch (err) {
      setCloudSyncState('error');
      setCloudError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const handleSignInGoogle = async () => {
    setIsSigningIn(true);
    setCloudError(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === 'auth/popup-blocked') {
        setCloudError(t.cloud.popupBlockedHint);
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setCloudError(t.cloud.unauthorizedDomainHint.replace('{host}', host));
      } else if (code !== 'auth/popup-closed-by-user') {
        setCloudError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRefreshCloud = async () => {
    if (!authUser || !authUser.emailVerified || !settings) return;
    setCloudSyncState('syncing');
    setCloudError(null);
    try {
      await bootstrapCloudSync(authUser, {
        settings,
        estimates: localStateRef.current.estimates,
        materials: localStateRef.current.materials,
        laborPrices: localStateRef.current.laborPrices,
        partTemplates: localStateRef.current.partTemplates,
      });
      const cloudEstimates = await fetchCloudEstimatesNow(authUser.uid);
      setEstimates(cloudEstimates);
      void replaceEstimatesInDb(cloudEstimates).catch(() => undefined);
      setCloudSyncState('synced');
    } catch (err) {
      setCloudSyncState('error');
      setCloudError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSignOutGoogle = async () => {
    await signOutFromFirebase();
  };

  const handleUpdateSettings = async (next: AppSettings) => {
    setSettings(next);
    await saveSettingsToDb(next);
    void runCloudTask((uid) => syncSettingsToCloud(uid, next));
  };

  const handleDismissReminder = async () => {
    setShowReminderModal(false);
    if (!settings) return;
    const snoozeUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await handleUpdateSettings({
      ...settings,
      reminderSnoozedUntil: snoozeUntil,
    });
  };

  const handleSyncNbuRate = async () => {
    if (!settings) return;
    setIsSyncingRate(true);
    setRateSyncMessage(null);
    try {
      const res = await fetchNbuUsdRate(settings.currentExchangeRate);
      const nextSettings: AppSettings = {
        ...settings,
        currentExchangeRate: res.snapshot,
      };
      await handleUpdateSettings(nextSettings);
      if (res.fromCache) {
        setRateSyncMessage(t.dashboard.nbuOfflineFallback);
      }
    } catch {
      setRateSyncMessage(t.dashboard.nbuOfflineFallback);
    } finally {
      setIsSyncingRate(false);
    }
  };

  const handleStartNewEstimate = (vehicleType: VehicleType = 'car') => {
    if (!settings) return;
    const nextDraft = createNewEstimateDraft(
      settings.workshopId,
      settings.currentExchangeRate
    );
    setDraft({
      ...nextDraft,
      vehicleType,
      quickMaterialMultiplier: VEHICLE_TYPE_MULTIPLIER[vehicleType],
    });
    setIsEditingExisting(false);
    setScreen('new_estimate');
  };

  const handleEditEstimate = (est: Estimate) => {
    setDraft(structuredClone(est));
    setIsEditingExisting(true);
    setScreen('new_estimate');
  };

  const handleDuplicateEstimate = (est: Estimate) => {
    if (!settings) return;
    const suffix = settings.locale === 'ru' ? '(Копия)' : '(Копія)';
    setDraft(duplicateEstimateDraft(est, settings.currentExchangeRate, suffix));
    setIsEditingExisting(false);
    setScreen('new_estimate');
  };

  const handleSaveEstimate = async (est: Estimate): Promise<boolean> => {
    const ready = prepareEstimateForSave(est);
    await saveEstimateToDb(ready).catch(() => undefined);
    setDraft(ready);
    setIsEditingExisting(true);
    setEstimates((prev) => {
      const exists = prev.some((e) => e.id === ready.id);
      const next = exists ? prev.map((e) => (e.id === ready.id ? ready : e)) : [ready, ...prev];
      return next.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    if (!authUser || !authUser.emailVerified) return false;
    return runCloudTask((uid) => syncEstimateToCloud(uid, ready));
  };

  const handleDeleteEstimate = async (id: string) => {
    await deleteEstimateFromDb(id).catch(() => undefined);
    setEstimates((prev) => prev.filter((e) => e.id !== id));
    void runCloudTask((uid) => deleteEstimateFromCloud(uid, id));
  };

  const handleToggleEstimateStage = async (estimateId: string, stageId: EstimateStageId) => {
    const target = estimates.find((e) => e.id === estimateId);
    if (!target) return;
    const baseStages =
      target.stages && target.stages.length > 0 ? target.stages : createDefaultStages(0);
    const nowIso = new Date().toISOString();
    const updatedStages = baseStages.map((s) => {
      if (s.id !== stageId) return s;
      const nextCompleted = !s.completed;
      return {
        ...s,
        completed: nextCompleted,
        completedAt: nextCompleted ? nowIso : undefined,
      };
    });
    const updatedEstimate: Estimate = {
      ...target,
      stages: updatedStages,
      updatedAt: nowIso,
    };
    await saveEstimateToDb(updatedEstimate).catch(() => undefined);
    setEstimates((prev) => prev.map((e) => (e.id === estimateId ? updatedEstimate : e)));
    setDraft((prev) => (prev && prev.id === estimateId ? updatedEstimate : prev));
    void runCloudTask((uid) =>
      toggleEstimateStageInCloud(uid, estimateId, updatedStages, nowIso, updatedEstimate)
    );
  };

  const handleUpdateEstimateDeposit = async (estimateId: string, deposit: DepositInfo) => {
    const target = estimates.find((e) => e.id === estimateId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const updatedEstimate: Estimate = {
      ...target,
      deposit,
      updatedAt: nowIso,
    };
    await saveEstimateToDb(updatedEstimate).catch(() => undefined);
    setEstimates((prev) => prev.map((e) => (e.id === estimateId ? updatedEstimate : e)));
    setDraft((prev) => (prev && prev.id === estimateId ? updatedEstimate : prev));
    void runCloudTask((uid) =>
      updateEstimateDepositInCloud(uid, estimateId, deposit, nowIso, updatedEstimate)
    );
  };

  const handleSaveMaterial = async (mat: MaterialCatalogItem) => {
    await saveMaterialToDb(mat).catch(() => undefined);
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === mat.id);
      return exists ? prev.map((m) => (m.id === mat.id ? mat : m)) : [...prev, mat];
    });
    void runCloudTask((uid) => syncMaterialToCloud(uid, mat));
  };

  const handleDeleteMaterial = async (id: string) => {
    await deleteMaterialFromDb(id).catch(() => undefined);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    void runCloudTask((uid) => deleteMaterialFromCloud(uid, id));
  };

  const handleSaveLaborOp = async (op: MasterLaborOperation) => {
    await saveLaborOperationToDb(op).catch(() => undefined);
    setLaborPrices((prev) => {
      const exists = prev.some((o) => o.id === op.id);
      return exists ? prev.map((o) => (o.id === op.id ? op : o)) : [...prev, op];
    });
    void runCloudTask((uid) => syncLaborOpToCloud(uid, op));
  };

  const handleDeleteLaborOp = async (id: string) => {
    await deleteLaborOperationFromDb(id).catch(() => undefined);
    setLaborPrices((prev) => prev.filter((o) => o.id !== id));
    void runCloudTask((uid) => deleteLaborOpFromCloud(uid, id));
  };

  const handleSavePartTemplate = async (tpl: PartQuickTemplate) => {
    await savePartTemplateToDb(tpl).catch(() => undefined);
    setPartTemplates((prev) => {
      const exists = prev.some((item) => item.partId === tpl.partId);
      return exists
        ? prev.map((item) => (item.partId === tpl.partId ? tpl : item))
        : [...prev, tpl];
    });
    void runCloudTask((uid) => syncPartTemplateToCloud(uid, tpl));
  };

  const handleImportBackup = async (payload: BackupPayload) => {
    const hydrated = await importBackupPayload(payload);
    setSettings(hydrated.settings);
    setEstimates(hydrated.estimates);
    setMaterials(hydrated.materials);
    setLaborPrices(hydrated.laborPrices);
    setPartTemplates(hydrated.partTemplates);
    void runCloudTask(async (uid) => {
      await syncSettingsToCloud(uid, hydrated.settings);
      await Promise.all([
        ...hydrated.estimates.map((e) => syncEstimateToCloud(uid, e)),
        ...hydrated.materials.map((m) => syncMaterialToCloud(uid, m)),
        ...hydrated.laborPrices.map((op) => syncLaborOpToCloud(uid, op)),
        ...hydrated.partTemplates.map((tpl) => syncPartTemplateToCloud(uid, tpl)),
      ]);
    });
  };

  const handleResetSampleData = async () => {
    const hydrated = await resetToSampleData();
    setSettings(hydrated.settings);
    setEstimates(hydrated.estimates);
    setMaterials(hydrated.materials);
    setLaborPrices(hydrated.laborPrices);
    setPartTemplates(hydrated.partTemplates);
    setDraft(
      createNewEstimateDraft(
        hydrated.settings.workshopId,
        hydrated.settings.currentExchangeRate
      )
    );
    void runCloudTask(async (uid) => {
      await syncSettingsToCloud(uid, hydrated.settings);
      await Promise.all([
        ...hydrated.estimates.map((e) => syncEstimateToCloud(uid, e)),
        ...hydrated.materials.map((m) => syncMaterialToCloud(uid, m)),
        ...hydrated.laborPrices.map((op) => syncLaborOpToCloud(uid, op)),
        ...hydrated.partTemplates.map((tpl) => syncPartTemplateToCloud(uid, tpl)),
      ]);
    });
  };

  if (loading || !settings || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B111A] text-slate-600 dark:text-slate-300 text-sm font-medium">
        AutoPaint Calc...
      </div>
    );
  }

  const navItems: { id: AppScreen; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t.nav.dashboard, icon: <Home className="w-5 h-5" /> },
    { id: 'new_estimate', label: t.nav.newEstimate, icon: <Calculator className="w-5 h-5" /> },
    { id: 'history', label: t.nav.history, icon: <Clock className="w-5 h-5" /> },
    { id: 'materials', label: t.nav.materials, icon: <Layers className="w-5 h-5" /> },
    { id: 'labor', label: t.nav.labor, icon: <Wrench className="w-5 h-5" /> },
    { id: 'settings', label: t.nav.settings, icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  // Mobile bottom bar uses 5 primary tabs (Dashboard, New Estimate, History, Materials/Labor, Settings)
  // Desktop top/side nav displays all 6 screens cleanly.
  const mobileNavItems = [
    navItems[0],
    navItems[1],
    navItems[2],
    navItems[3],
    navItems[5],
  ];

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleQuickTheme = () => {
    handleUpdateSettings({
      ...settings,
      theme: isDark ? 'light' : 'dark',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B111A] text-slate-900 dark:text-slate-100 flex flex-col">
      <OfflineIndicator t={t} />

      {/* Top Navigation Bar (Strict 3-zone contract on desktop, compact 52px on mobile) */}
      <header className="no-print sticky top-0 z-30 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pt-safe">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setScreen('dashboard')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            AutoPaint Calc
          </button>

          {/* Zone 2: Desktop Screen Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScreen(item.id)}
                className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
                  screen === item.id
                    ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Cloud Sync + Theme toggle / PWA Install */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => (authUser ? setScreen('settings') : void handleSignInGoogle())}
              disabled={isSigningIn}
              aria-label={t.cloud.title}
              className={`min-h-[38px] px-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                authUser
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80'
              }`}
            >
              {authUser ? (
                <Cloud className="w-4 h-4 shrink-0" />
              ) : (
                <CloudOff className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {authUser
                  ? cloudSyncState === 'syncing'
                    ? t.cloud.syncing
                    : 'Cloud'
                  : isSigningIn
                  ? t.cloud.signingIn
                  : t.cloud.signInGoogle}
              </span>
            </button>
            <div className="hidden sm:block">
              <PWAInstallButton t={t} compact />
            </div>
            <button
              type="button"
              onClick={toggleQuickTheme}
              aria-label={t.settings.theme}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-10">
        {screen === 'dashboard' && (
          <DashboardScreen
            settings={settings}
            estimates={estimates}
            dueAlerts={dueAlerts}
            isSyncingRate={isSyncingRate}
            rateSyncMessage={rateSyncMessage}
            authUser={authUser}
            isSigningIn={isSigningIn}
            cloudSyncState={cloudSyncState}
            cloudError={cloudError}
            t={t}
            onNavigate={setScreen}
            onNewEstimate={handleStartNewEstimate}
            onEditEstimate={handleEditEstimate}
            onViewCustomerEstimate={setCustomerViewEstimate}
            onSyncNbuRate={handleSyncNbuRate}
            onOpenReminderModal={() => setShowReminderModal(true)}
            onSignInGoogle={() => void handleSignInGoogle()}
          />
        )}

        {screen === 'new_estimate' && (
          <NewEstimateScreen
            draft={draft}
            isEditingExisting={isEditingExisting}
            settings={settings}
            masterLabor={laborPrices}
            materialsCatalog={materials}
            partTemplates={partTemplates}
            currentWorkshopRate={settings.currentExchangeRate}
            locale={settings.locale}
            authUser={authUser}
            isSigningIn={isSigningIn}
            cloudSyncState={cloudSyncState}
            cloudError={cloudError}
            t={t}
            onChangeDraft={setDraft}
            onSaveEstimate={handleSaveEstimate}
            onOpenCustomerView={setCustomerViewEstimate}
            onSignInGoogle={() => void handleSignInGoogle()}
          />
        )}

        {screen === 'history' && (
          <HistoryScreen
            estimates={estimates}
            settings={settings}
            locale={settings.locale}
            authUser={authUser}
            isSigningIn={isSigningIn}
            cloudSyncState={cloudSyncState}
            cloudError={cloudError}
            t={t}
            onNewEstimate={() => handleStartNewEstimate()}
            onEditEstimate={handleEditEstimate}
            onDuplicateEstimate={handleDuplicateEstimate}
            onDeleteEstimate={handleDeleteEstimate}
            onViewCustomerEstimate={setCustomerViewEstimate}
            onToggleStage={handleToggleEstimateStage}
            onUpdateDeposit={handleUpdateEstimateDeposit}
            onSignInGoogle={() => void handleSignInGoogle()}
            onRefreshCloud={() => void handleRefreshCloud()}
          />
        )}

        {(screen === 'materials' || screen === 'labor') && (
          <div className="md:hidden grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setScreen('materials')}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                screen === 'materials'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.nav.materials}
            </button>
            <button
              type="button"
              onClick={() => setScreen('labor')}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                screen === 'labor'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.nav.labor}
            </button>
          </div>
        )}

        {screen === 'materials' && (
          <MaterialsScreen
            materials={materials}
            partTemplates={partTemplates}
            workshopId={settings.workshopId}
            exchangeRate={settings.currentExchangeRate.rate}
            locale={settings.locale}
            t={t}
            onSaveMaterial={handleSaveMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onSavePartTemplate={handleSavePartTemplate}
          />
        )}

        {screen === 'labor' && (
          <LaborScreen
            laborPrices={laborPrices}
            workshopId={settings.workshopId}
            exchangeRate={settings.currentExchangeRate.rate}
            locale={settings.locale}
            t={t}
            onSaveOperation={handleSaveLaborOp}
            onDeleteOperation={handleDeleteLaborOp}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            isSyncingRate={isSyncingRate}
            rateSyncMessage={rateSyncMessage}
            authUser={authUser}
            isSigningIn={isSigningIn}
            cloudSyncState={cloudSyncState}
            cloudError={cloudError}
            t={t}
            onUpdateSettings={handleUpdateSettings}
            onSyncNbuRate={handleSyncNbuRate}
            onImportBackup={handleImportBackup}
            onResetSampleData={handleResetSampleData}
            onSignInGoogle={() => void handleSignInGoogle()}
            onSignOutGoogle={() => void handleSignOutGoogle()}
            onRefreshCloud={() => void handleRefreshCloud()}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (compact height <= 15% cap, >=44px touch targets) */}
      <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="grid grid-cols-5 items-center h-16">
          {mobileNavItems.map((item) => {
            const active =
              screen === item.id || (item.id === 'materials' && screen === 'labor');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setScreen(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center px-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.icon}
                <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Printable Customer Estimate Modal */}
      {customerViewEstimate && (
        <CustomerEstimateModal
          estimate={customerViewEstimate}
          settings={settings}
          t={t}
          onClose={() => setCustomerViewEstimate(null)}
        />
      )}

      {/* Dismissible 2-Day Order Delivery Reminder Popup */}
      {showReminderModal && dueAlerts.length > 0 && (
        <DeadlineReminderModal
          alerts={dueAlerts}
          locale={settings.locale}
          t={t}
          onOpenOrder={(est) => {
            setShowReminderModal(false);
            handleEditEstimate(est);
          }}
          onDismiss={handleDismissReminder}
        />
      )}
    </div>
  );
}
