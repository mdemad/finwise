// Formatters for Currency, Numbers, and Percentages

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rate: number; // Conversion rate relative to USD
}

export const currencies: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', rate: 1.0 },
  INR: { code: 'INR', symbol: '₹', rate: 83.5 }, // approximate conversion rate
  EUR: { code: 'EUR', symbol: '€', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.78 },
};

// Formats a number to currency format based on selected currency code
export function formatCurrency(value: number, currencyCode: CurrencyCode = 'USD'): string {
  const config = currencies[currencyCode];
  const convertedValue = value * config.rate;

  let locale = 'en-US';
  if (currencyCode === 'INR') locale = 'en-IN';
  else if (currencyCode === 'EUR') locale = 'de-DE';
  else if (currencyCode === 'GBP') locale = 'en-GB';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(convertedValue);
}

// Formats a plain number with commas
export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

// Formats decimal percentages to readable display (e.g. 0.06 -> 6%)
export function formatPercent(value: number): string {
  return `${value}%`;
}

// Formats date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
