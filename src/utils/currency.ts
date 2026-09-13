/**
 * Currency and Price Utility
 * Default currency is USD ($) across Hajji Original Tours Admin Management System
 */

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
