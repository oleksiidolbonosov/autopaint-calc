import { ExchangeRateSnapshot, LocaleCode } from '../types/models';
import { roundMoney } from '../engine/decimal';

const NBU_USD_ENDPOINT = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json';

export interface NbuFetchResult {
  snapshot: ExchangeRateSnapshot;
  fromCache: boolean;
  error?: string;
}

/**
 * Fetches official USD/UAH exchange rate from the National Bank of Ukraine (NBU).
 * Falls back gracefully to the last cached rate if offline or unreachable.
 */
export async function fetchNbuUsdRate(cachedFallback?: ExchangeRateSnapshot): Promise<NbuFetchResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(NBU_USD_ENDPOINT, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Empty NBU response');
    }

    const entry = data[0] as { rate?: number; cc?: string; exchangedate?: string };
    const rateNum = typeof entry.rate === 'number' ? roundMoney(entry.rate) : NaN;
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      throw new Error('Invalid NBU rate value');
    }

    return {
      snapshot: {
        rate: rateNum,
        source: 'nbu',
        updatedAt: new Date().toISOString(),
      },
      fromCache: false,
    };
  } catch (err) {
    if (cachedFallback) {
      return {
        snapshot: {
          ...cachedFallback,
          source: cachedFallback.source === 'nbu' ? 'cached' : cachedFallback.source,
        },
        fromCache: true,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
    throw err;
  }
}

export function formatUah(amount: number, locale: LocaleCode = 'uk'): string {
  const safe = roundMoney(amount);
  const formatted = new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${formatted} ₴`;
}

export function formatUsd(amount: number, locale: LocaleCode = 'uk'): string {
  const safe = roundMoney(amount);
  const formatted = new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `$${formatted}`;
}

export function formatDateTime(iso: string, locale: LocaleCode = 'uk'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateShort(iso: string, locale: LocaleCode = 'uk'): string {
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  const date = ymdMatch
    ? new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]))
    : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
