import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  Holding,
  HoldingCreatePayload,
  HoldingUpdatePayload,
  Transaction,
  TransactionCreatePayload,
  InvestmentSummary,
} from '../types/investments';

const API_URL = import.meta.env.VITE_API_URL || '';
const FETCH_TIMEOUT_MS = 25000;

export function useInvestments() {
  const { user, session, loading: authLoading } = useAuth();
  const { currency } = useCurrency();
  const userId = user?.id;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  // Start false — we only show loading when actively fetching for a logged-in user
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setHoldings([]);
      setTransactions([]);
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const token = sessionRef.current?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [holdingsRes, txsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/investments/holdings`, { headers, signal: controller.signal }),
        fetch(`${API_URL}/api/investments/transactions`, { headers, signal: controller.signal }),
        fetch(`${API_URL}/api/investments/summary`, { headers, signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      if (holdingsRes.ok && txsRes.ok && summaryRes.ok) {
        const [holdingsData, txsData, summaryData] = await Promise.all([
          holdingsRes.json(),
          txsRes.json(),
          summaryRes.json(),
        ]);

        setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
        setTransactions(Array.isArray(txsData) ? txsData : []);
        setSummary(summaryData);
        setError(null);
        setLoading(false);
        return;
      }

      // If backend responded with non-200 (e.g. 503 or 401)
      setError("We couldn't load your investment data right now. The server may be waking up. Please try again.");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. The server may be waking up. Please try again.');
      } else {
        console.error('Failed to fetch investment data:', err);
        setError("We couldn't load your investment data right now. The server may be waking up. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // While auth is still resolving, don't fetch (avoids unauthenticated API calls)
    if (authLoading) return;
    fetchData();
  }, [fetchData, authLoading]);

  // ---------------------------------------------------------------------------
  // Create Holding
  // ---------------------------------------------------------------------------
  const createHolding = async (
    payload: HoldingCreatePayload
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    try {
      const token = sessionRef.current?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_URL}/api/investments/holdings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        return { success: true };
      }

      const errData = await res.json().catch(() => ({}));
      const msg = errData.detail || 'Failed to create holding';
      return { success: false, error: msg };
    } catch (err) {
      console.error('Create holding error:', err);
      return { success: false, error: 'Network error creating holding' };
    }
  };

  // ---------------------------------------------------------------------------
  // Update Holding
  // ---------------------------------------------------------------------------
  const updateHolding = async (
    id: string,
    payload: HoldingUpdatePayload
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    try {
      const token = sessionRef.current?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_URL}/api/investments/holdings/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        return { success: true };
      }

      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Failed to update holding' };
    } catch (err) {
      console.error('Update holding error:', err);
      return { success: false, error: 'Network error updating holding' };
    }
  };

  // ---------------------------------------------------------------------------
  // Delete Holding
  // ---------------------------------------------------------------------------
  const deleteHolding = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    try {
      const token = sessionRef.current?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_URL}/api/investments/holdings/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        await fetchData();
        return { success: true };
      }

      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Failed to delete holding' };
    } catch (err) {
      console.error('Delete holding error:', err);
      return { success: false, error: 'Network error deleting holding' };
    }
  };

  // ---------------------------------------------------------------------------
  // Record Transaction
  // ---------------------------------------------------------------------------
  const recordTransaction = async (
    payload: TransactionCreatePayload
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    try {
      const token = sessionRef.current?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_URL}/api/investments/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        return { success: true };
      }

      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Failed to record transaction' };
    } catch (err) {
      console.error('Record transaction error:', err);
      return { success: false, error: 'Network error recording transaction' };
    }
  };

  return {
    holdings,
    transactions,
    summary,
    loading,
    error,
    refresh: fetchData,
    createHolding,
    updateHolding,
    deleteHolding,
    recordTransaction,
  };
}
