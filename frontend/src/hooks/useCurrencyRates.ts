/**
 * useCurrencyRates — React hook for fetching live and historical exchange rates
 * from the FinWise backend (which proxies ExchangeRate-API / frankfurter.app).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CurrencyCode } from '../utils/formatters';

const getBackendBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return 'https://finwise-backend-sltu.onrender.com';
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RatesResult {
  base: CurrencyCode;
  rates: Record<string, number>;
  timestamp: string;
}

export interface HistoricalPoint {
  date: string;
  rate: number;
}

export interface HistoricalSummary {
  first_date: string;
  last_date: string;
  first_rate: number;
  last_rate: number;
  change_pct: number;
  direction: string;
  base_moved: string;
  target_moved: string;
}

export interface HistoricalResult {
  base: string;
  target: string;
  period: string;
  data_points: HistoricalPoint[];
  summary: HistoricalSummary;
}

export interface ConvertResult {
  from_currency: string;
  to_currency: string;
  amount: number;
  rate: number;
  converted_amount: number;
  timestamp: string;
}

export type Period = '1y' | '3y' | '5y' | '10y' | 'max';

// ---------------------------------------------------------------------------
// Hook: useCurrencyRates — current rates for a given base currency
// ---------------------------------------------------------------------------

export function useCurrencyRates(base: CurrencyCode) {
  const [data, setData] = useState<RatesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${getBackendBase()}/api/currency/rates?base=${base}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to load exchange rates.');
      }
      const json: RatesResult = await res.json();
      setData(json);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Unable to retrieve current exchange rates. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

// ---------------------------------------------------------------------------
// Hook: useCurrencyHistory — historical rate data for a base→target pair
// ---------------------------------------------------------------------------

export function useCurrencyHistory(
  base: CurrencyCode,
  target: CurrencyCode,
  period: Period
) {
  const [data, setData] = useState<HistoricalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async () => {
    if (base === target) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${getBackendBase()}/api/currency/historical?base=${base}&target=${target}&period=${period}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to load historical data.');
      }
      const json: HistoricalResult = await res.json();
      setData(json);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(
          e.message || 'Unable to retrieve historical exchange rate data. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [base, target, period]);

  useEffect(() => {
    fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

// ---------------------------------------------------------------------------
// Standalone utility: convert amount between currencies (one-shot fetch)
// ---------------------------------------------------------------------------

export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): Promise<ConvertResult> {
  const res = await fetch(
    `${getBackendBase()}/api/currency/convert?amount=${amount}&from_currency=${from}&to_currency=${to}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Conversion failed.');
  }
  return res.json();
}
