import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { NumericInput } from '../components/NumericInput';
import { PART_GROUP_ORDER, VEHICLE_PARTS } from '../data/vehicleParts';
import { convertToUah } from '../engine/calculations';
import { TranslationDictionary } from '../i18n/translations';
import { formatUah } from '../services/currencyService';
import {
  CurrencyCode,
  LocaleCode,
  MaterialCatalogItem,
  MaterialCategory,
  MaterialUnit,
  PartQuickTemplate,
  VehiclePartId,
} from '../types/models';

interface MaterialsScreenProps {
  materials: MaterialCatalogItem[];
  partTemplates: PartQuickTemplate[];
  workshopId: string;
  exchangeRate: number;
  locale: LocaleCode;
  t: TranslationDictionary;
  onSaveMaterial: (mat: MaterialCatalogItem) => void;
  onDeleteMaterial: (id: string) => void;
  onSavePartTemplate: (tpl: PartQuickTemplate) => void;
}

const CATEGORIES: MaterialCategory[] = [
  'basecoat',
  'clearcoat',
  'primer',
  'filler',
  'hardener',
  'thinner',
  'sandpaper',
  'masking',
  'other',
];

const UNITS: MaterialUnit[] = ['g', 'kg', 'ml', 'l', 'pcs'];

export const MaterialsScreen: React.FC<MaterialsScreenProps> = ({
  materials,
  partTemplates,
  workshopId,
  exchangeRate,
  locale,
  t,
  onSaveMaterial,
  onDeleteMaterial,
  onSavePartTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'templates'>('catalog');
  const [search, setSearch] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<MaterialCatalogItem | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<VehiclePartId>('front_bumper');

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || t.categories[m.category].toLowerCase().includes(q)
    );
  }, [materials, search, t]);

  const currentTemplate = useMemo(
    () =>
      partTemplates.find((tpl) => tpl.partId === selectedPartId) ?? {
        partId: selectedPartId,
        workshopId,
        rules: [],
        updatedAt: new Date().toISOString(),
      },
    [partTemplates, selectedPartId, workshopId]
  );

  const openNewMaterialModal = () => {
    setEditingMaterial({
      id: `mat_${Date.now()}`,
      workshopId,
      name: '',
      category: 'basecoat',
      packageSize: 1000,
      packageUnit: 'ml',
      packagePrice: 500,
      currency: 'UAH',
      isCustom: true,
      isSample: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterial.name.trim()) return;
    onSaveMaterial({
      ...editingMaterial,
      name: editingMaterial.name.trim(),
      isSample: false,
      updatedAt: new Date().toISOString(),
    });
    setEditingMaterial(null);
  };

  const handleRuleQuantityChange = (index: number, qty: number) => {
    const updatedRules = currentTemplate.rules.map((r, i) =>
      i === index ? { ...r, quantity: Number.isFinite(qty) && qty >= 0 ? qty : 0 } : r
    );
    onSavePartTemplate({
      ...currentTemplate,
      rules: updatedRules,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRuleUnitChange = (index: number, unit: MaterialUnit) => {
    const updatedRules = currentTemplate.rules.map((r, i) =>
      i === index ? { ...r, unit } : r
    );
    onSavePartTemplate({
      ...currentTemplate,
      rules: updatedRules,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteRule = (index: number) => {
    const updatedRules = currentTemplate.rules.filter((_, i) => i !== index);
    onSavePartTemplate({
      ...currentTemplate,
      rules: updatedRules,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddRuleToTemplate = (materialId: string) => {
    if (!materialId) return;
    if (currentTemplate.rules.some((r) => r.materialId === materialId)) return;
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return;
    const defaultUnit: MaterialUnit =
      mat.packageUnit === 'l' ? 'ml' : mat.packageUnit === 'kg' ? 'g' : mat.packageUnit;
    onSavePartTemplate({
      ...currentTemplate,
      rules: [...currentTemplate.rules, { materialId, quantity: 100, unit: defaultUnit }],
      updatedAt: new Date().toISOString(),
    });
  };

  const availableForTemplate = materials.filter(
    (m) => !currentTemplate.rules.some((r) => r.materialId === m.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.materials.title}</h1>
        {activeTab === 'catalog' && (
          <button
            type="button"
            onClick={openNewMaterialModal}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.materials.addMaterial}</span>
          </button>
        )}
      </div>

      {/* Segmented Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t.materials.catalogTab}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t.materials.templatesTab}
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.search}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {search.trim() ? t.common.noResults : t.materials.emptyTitle}
              </p>
              {!search.trim() && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {t.materials.emptyDesc}
                  </p>
                  <button
                    type="button"
                    onClick={openNewMaterialModal}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.materials.addMaterial}</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMaterials.map((mat) => {
                const packUah = convertToUah(mat.packagePrice, mat.currency, exchangeRate);
                return (
                  <div
                    key={mat.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {mat.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.categories[mat.category]} · {mat.packageSize} {t.units[mat.packageUnit]} ·{' '}
                        <span className="font-mono-num">
                          {mat.packagePrice} {mat.currency} ({formatUah(packUah, locale)})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMaterial({ ...mat })}
                        aria-label={t.common.edit}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(mat.id)}
                        aria-label={t.common.delete}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Quick-Mode Part Templates Editor */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.materials.templateHint}</p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t.materials.templatePartSelect}
            </label>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value as VehiclePartId)}
              className="w-full sm:max-w-sm min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white"
            >
              <optgroup label={t.partGroups.full}>
                {VEHICLE_PARTS.filter((p) => p.category === 'full').map((p) => (
                  <option key={p.id} value={p.id}>
                    {t.parts[p.id]}
                  </option>
                ))}
              </optgroup>
              {PART_GROUP_ORDER.map((group) => (
                <optgroup key={group} label={t.partGroups[group]}>
                  {VEHICLE_PARTS.filter((p) => p.category === group).map((p) => (
                    <option key={p.id} value={p.id}>
                      {t.parts[p.id]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {currentTemplate.rules.map((rule, idx) => {
              const mat = materials.find((m) => m.id === rule.materialId);
              if (!mat) return null;
              return (
                <div key={rule.materialId} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 min-w-[160px]">
                    {mat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      min={0}
                      value={rule.quantity}
                      onValueChange={(val) => handleRuleQuantityChange(idx, val)}
                      className="w-24 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-right text-slate-900 dark:text-white"
                    />
                    <select
                      value={rule.unit}
                      onChange={(e) => handleRuleUnitChange(idx, e.target.value as MaterialUnit)}
                      className="min-h-[44px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {t.units[u]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(idx)}
                      aria-label={t.common.delete}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {materials.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
              <span>{t.materials.templatesNoMaterialsHint}</span>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="min-h-[36px] px-3 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
              >
                {t.materials.catalogTab}
              </button>
            </div>
          ) : (
            availableForTemplate.length > 0 && (
              <div className="pt-2">
                <select
                  value=""
                  onChange={(e) => handleAddRuleToTemplate(e.target.value)}
                  className="w-full sm:max-w-sm min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200"
                >
                  <option value="">+ {t.materials.addTemplateRule}</option>
                  {availableForTemplate.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>
      )}

      {/* Material Edit/Create Modal */}
      {editingMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setEditingMaterial(null)}
        >
          <form
            onSubmit={handleSaveModal}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 pb-safe shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {materials.some((m) => m.id === editingMaterial.id)
                  ? t.materials.editMaterial
                  : t.materials.addMaterial}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.materials.nameLabel}
              </label>
              <input
                type="text"
                required
                value={editingMaterial.name}
                onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.materials.categoryLabel}
              </label>
              <select
                value={editingMaterial.category}
                onChange={(e) =>
                  setEditingMaterial({
                    ...editingMaterial,
                    category: e.target.value as MaterialCategory,
                  })
                }
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t.categories[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.materials.packageSizeLabel}
                </label>
                <NumericInput
                  min={0.01}
                  fallbackValue={1}
                  required
                  value={editingMaterial.packageSize}
                  onValueChange={(val) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      packageSize: val,
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.materials.packageUnitLabel}
                </label>
                <select
                  value={editingMaterial.packageUnit}
                  onChange={(e) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      packageUnit: e.target.value as MaterialUnit,
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t.units[u]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.materials.packagePriceLabel}
                </label>
                <NumericInput
                  min={0}
                  required
                  value={editingMaterial.packagePrice}
                  onValueChange={(val) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      packagePrice: val,
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.materials.currencyLabel}
                </label>
                <select
                  value={editingMaterial.currency}
                  onChange={(e) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      currency: e.target.value as CurrencyCode,
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                >
                  <option value="UAH">UAH</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer"
              >
                {t.common.save}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
