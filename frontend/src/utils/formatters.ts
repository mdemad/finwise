// FinWise — Centralized Currency Configuration & Formatters
// IMPORTANT: formatCurrency() does NOT convert between currencies.
// The value passed in is already in the selected currency denomination.
// The selected currency IS the calculation currency — not a conversion target.

export type CurrencyCode =
  | 'USD' | 'INR' | 'AED' | 'BHD' | 'EUR' | 'GBP' | 'SAR'
  | 'JPY' | 'CNY' | 'AUD' | 'CAD' | 'CHF' | 'SGD' | 'KWD'
  | 'OMR' | 'QAR' | 'IQD' | 'TRY' | 'PKR' | 'MYR' | 'LKR'
  | 'BRL' | 'NPR' | 'BTN' | 'BDT' | 'KRW' | 'THB' | 'IDR'
  | 'DKK' | 'NOK' | 'SEK';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  /** Number of decimal places for display */
  decimals: number;
}

/**
 * Centralized currency configuration.
 * Add new currencies here — they automatically appear everywhere in the app.
 */
export const currencies: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', name: 'US Dollar',           symbol: '$',   locale: 'en-US',    decimals: 0 },
  INR: { code: 'INR', name: 'Indian Rupee',         symbol: '₹',   locale: 'en-IN',    decimals: 0 },
  AED: { code: 'AED', name: 'UAE Dirham',           symbol: 'AED', locale: 'ar-AE',    decimals: 0 },
  BHD: { code: 'BHD', name: 'Bahraini Dinar',       symbol: 'BD',  locale: 'ar-BH',    decimals: 3 },
  EUR: { code: 'EUR', name: 'Euro',                 symbol: '€',   locale: 'de-DE',    decimals: 0 },
  GBP: { code: 'GBP', name: 'British Pound',        symbol: '£',   locale: 'en-GB',    decimals: 0 },
  SAR: { code: 'SAR', name: 'Saudi Riyal',          symbol: 'SAR', locale: 'ar-SA',    decimals: 0 },
  JPY: { code: 'JPY', name: 'Japanese Yen',         symbol: '¥',   locale: 'ja-JP',    decimals: 0 },
  CNY: { code: 'CNY', name: 'Chinese Yuan',         symbol: '¥',   locale: 'zh-CN',    decimals: 0 },
  AUD: { code: 'AUD', name: 'Australian Dollar',    symbol: 'A$',  locale: 'en-AU',    decimals: 0 },
  CAD: { code: 'CAD', name: 'Canadian Dollar',      symbol: 'C$',  locale: 'en-CA',    decimals: 0 },
  CHF: { code: 'CHF', name: 'Swiss Franc',          symbol: 'CHF', locale: 'de-CH',    decimals: 0 },
  SGD: { code: 'SGD', name: 'Singapore Dollar',     symbol: 'S$',  locale: 'en-SG',    decimals: 0 },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar',        symbol: 'KD',  locale: 'ar-KW',    decimals: 3 },
  OMR: { code: 'OMR', name: 'Omani Rial',           symbol: 'OMR', locale: 'ar-OM',    decimals: 3 },
  QAR: { code: 'QAR', name: 'Qatari Riyal',         symbol: 'QAR', locale: 'ar-QA',    decimals: 0 },
  IQD: { code: 'IQD', name: 'Iraqi Dinar',          symbol: 'IQD', locale: 'ar-IQ',    decimals: 0 },
  TRY: { code: 'TRY', name: 'Turkish Lira',         symbol: '₺',   locale: 'tr-TR',    decimals: 0 },
  PKR: { code: 'PKR', name: 'Pakistani Rupee',      symbol: '₨',   locale: 'ur-PK',    decimals: 0 },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit',    symbol: 'RM',  locale: 'ms-MY',    decimals: 0 },
  LKR: { code: 'LKR', name: 'Sri Lankan Rupee',     symbol: 'Rs',  locale: 'si-LK',    decimals: 0 },
  BRL: { code: 'BRL', name: 'Brazilian Real',       symbol: 'R$',  locale: 'pt-BR',    decimals: 0 },
  NPR: { code: 'NPR', name: 'Nepalese Rupee',       symbol: 'Rs',  locale: 'ne-NP',    decimals: 0 },
  BTN: { code: 'BTN', name: 'Bhutanese Ngultrum',   symbol: 'Nu',  locale: 'dz-BT',    decimals: 0 },
  BDT: { code: 'BDT', name: 'Bangladeshi Taka',     symbol: '৳',   locale: 'bn-BD',    decimals: 0 },
  KRW: { code: 'KRW', name: 'South Korean Won',     symbol: '₩',   locale: 'ko-KR',    decimals: 0 },
  THB: { code: 'THB', name: 'Thai Baht',            symbol: '฿',   locale: 'th-TH',    decimals: 0 },
  IDR: { code: 'IDR', name: 'Indonesian Rupiah',    symbol: 'Rp',  locale: 'id-ID',    decimals: 0 },
  DKK: { code: 'DKK', name: 'Danish Krone',         symbol: 'kr',  locale: 'da-DK',    decimals: 0 },
  NOK: { code: 'NOK', name: 'Norwegian Krone',      symbol: 'kr',  locale: 'nb-NO',    decimals: 0 },
  SEK: { code: 'SEK', name: 'Swedish Krona',        symbol: 'kr',  locale: 'sv-SE',    decimals: 0 },
};

/**
 * Returns the currency symbol for a given code.
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  return currencies[code]?.symbol ?? code;
}

/**
 * Formats a numeric value as a currency string in the selected denomination.
 *
 * IMPORTANT: This does NOT convert currencies.
 * The value is already in the selected currency.
 * e.g. formatCurrency(1000, 'INR') → '₹1,000'   (not USD→INR converted)
 *      formatCurrency(1000, 'USD') → '$1,000'
 */
export function formatCurrency(value: number, currencyCode: CurrencyCode = 'USD'): string {
  const config = currencies[currencyCode];
  if (!config) return `${value}`;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: config.decimals,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback for any locale/currency combination not supported by Intl
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: config.decimals,
      minimumFractionDigits: 0,
    }).format(value);
    return `${config.symbol}${formatted}`;
  }
}

/**
 * Formats a plain number with commas — no currency symbol.
 */
export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/**
 * Formats a percentage value for display.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a date string for display.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Parses a raw string input to a safe numeric value.
 * Strips any non-numeric characters (currency symbols, commas, spaces).
 * Returns NaN if the result is invalid.
 */
export function parseNumericInput(raw: string): number {
  // Remove currency symbols, commas, spaces
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-') return NaN;
  return parseFloat(cleaned);
}
