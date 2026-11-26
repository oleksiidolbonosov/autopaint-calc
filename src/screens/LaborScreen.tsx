import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { NumericInput } from '../components/NumericInput';
import { convertToUah } from '../engine/calculations';
import { TranslationDictionary } from '../i18n/translations';
import { formatUah } from '../services/currencyService';
import { CurrencyCode, LocaleCode, MasterLaborOperation } from '../types/models';

interface LaborScreenProps {
  laborPrices: MasterLaborOperation[];
  workshopId: string;
  exchangeRate: number;
  locale: LocaleCode;
  t: TranslationDictionary;
  onSaveOperation: (op: MasterLaborOperation) => void;
  onDeleteOperation: (id: string) => void;
}

export const LaborScreen: React.FC<LaborScreenProps> = ({
  laborPrices,
  workshopId,
  exchangeRate,
  locale,
  t,
  onSaveOperation,
  onDeleteOperation,
}) => {
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState(500);
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>('UAH');

  const handlePriceChange = (op: MasterLaborOperation, nextPrice: number) => {
    onSaveOperation({
      ...op,
      basePrice: Number.isFinite(nextPrice) && nextPrice >= 0 ? nextPrice : 0,
      isSample: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCurrencyToggle = (op: MasterLaborOperation, currency: CurrencyCode) => {
    onSaveOperation({
      ...op,
      currency,
      isSample: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || !Number.isFinite(newPrice) || newPrice < 0) return;

    onSaveOperation({
      id: `op_custom_${Date.now()}`,
      workshopId,
      operationType: 'custom',
      customName: trimmed,
      basePrice: newPrice,
      currency: newCurrency,
      isSample: false,
      updatedAt: new Date().toISOString(),
    });
    setNewName('');
    setNewPrice(500);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.labor.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.labor.subtitle}</p>
      </div>

      {/* Operations List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {laborPrices.map((op) => {
          const title =
            op.operationType === 'custom'
              ? op.customName || t.operations.custom
              : t.operations[op.operationType];
          const uahPreview = convertToUah(op.basePrice, op.currency, exchangeRate);

          return (
            <div
              key={op.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-num">
                  ≈ {formatUah(uahPreview, locale)}
                  {op.isSample ? ` · ${t.common.sampleLabel}` : ''}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <NumericInput
                  min={0}
                  value={op.basePrice}
                  onValueChange={(val) => handlePriceChange(op, val)}
                  className="w-28 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num font-semibold text-right text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                />
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  {(['UAH', 'USD'] as CurrencyCode[]).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => handleCurrencyToggle(op, curr)}
                      className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        op.currency === curr
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
                {op.operationType === 'custom' && (
                  <button
                    type="button"
                    onClick={() => onDeleteOperation(op.id)}
                    aria-label={t.common.delete}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Preset */}
      <form
        onSubmit={handleAddCustom}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
      >
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {t.labor.addCustomPreset}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.labor.operationLabel}
            className="sm:col-span-6 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <NumericInput
            min={0}
            value={newPrice}
            onValueChange={setNewPrice}
            placeholder={t.labor.basePriceLabel}
            className="sm:col-span-3 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-num text-slate-900 dark:text-white"
          />
          <select
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)}
            className="sm:col-span-3 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
          >
            <option value="UAH">UAH</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.common.add}</span>
        </button>
      </form>
    </div>
  );
};
