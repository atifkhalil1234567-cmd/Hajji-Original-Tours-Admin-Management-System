/**
 * Currency and Price Utility
 * Default currency is USD ($) across Hajji Original Tours Admin Management System
 * Production currencies table:
 *  ID 1 = USD
 *  ID 2 = SAR
 *  ID 3 = GBP
 *  ID 4 = EUR
 *  ID 5 = CAD
 *  ID 6 = PKR
 */

export const CURRENCY_ID_MAP: Record<string, number> = {
  USD: 1,
  SAR: 2,
  GBP: 3,
  EUR: 4,
  CAD: 5,
  PKR: 6,
};

export const CURRENCY_CODE_MAP: Record<number, string> = {
  1: 'USD',
  2: 'SAR',
  3: 'GBP',
  4: 'EUR',
  5: 'CAD',
  6: 'PKR',
};

export const CURRENCY_OPTIONS = [
  { id: 1, code: 'USD', label: '$ USD (US Dollar)', symbol: '$' },
  { id: 2, code: 'SAR', label: '﷼ SAR (Saudi Riyal)', symbol: '﷼' },
  { id: 3, code: 'GBP', label: '£ GBP (British Pound)', symbol: '£' },
  { id: 4, code: 'EUR', label: '€ EUR (Euro)', symbol: '€' },
  { id: 5, code: 'CAD', label: 'CA$ CAD (Canadian Dollar)', symbol: 'CA$' },
  { id: 6, code: 'PKR', label: '₨ PKR (Pakistani Rupee)', symbol: '₨' },
];

export function resolveCurrency(currencyId?: any, currencyCode?: any): { currency_id: number; currency: string } {
  const cId = Number(currencyId);
  const cCode = typeof currencyCode === 'string' ? currencyCode.trim().toUpperCase() : '';

  if (cId && CURRENCY_CODE_MAP[cId]) {
    const matchedCode = CURRENCY_CODE_MAP[cId];
    const finalCode = cCode && CURRENCY_ID_MAP[cCode] === cId ? cCode : matchedCode;
    return { currency_id: cId, currency: finalCode };
  }

  if (cCode && CURRENCY_ID_MAP[cCode]) {
    const matchedId = CURRENCY_ID_MAP[cCode];
    return { currency_id: matchedId, currency: cCode };
  }

  return { currency_id: 1, currency: 'USD' };
}

export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '$';
  const code = currency.trim().toUpperCase();
  switch (code) {
    case 'USD':
      return '$';
    case 'SAR':
      return '﷼';
    case 'GBP':
      return '£';
    case 'EUR':
      return '€';
    case 'PKR':
      return '₨';
    case 'AED':
      return 'AED ';
    default:
      return '$';
  }
}

export function formatPrice(amount: number | string | undefined | null, currency: string = 'USD'): string {
  const num = Number(amount) || 0;
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
