import { useState, useEffect, useCallback } from 'react';
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

export function useInvestments() {
  const { user, session } = useAuth();
  const { currency } = useCurrency();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LocalStorage fallback keys scoped strictly by user.id
  const storagePrefix = user ? `finwise-user-${user.id}` : '';
  const holdingsKey = user ? `${storagePrefix}-holdings` : '';
  const transactionsKey = user ? `${storagePrefix}-transactions` : '';

  const fetchData = useCallback(async () => {
    if (!user) {
      setHoldings([]);
      setTransactions([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [holdingsRes, txsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/investments/holdings`, { headers }),
        fetch(`${API_URL}/api/investments/transactions`, { headers }),
        fetch(`${API_URL}/api/investments/summary`, { headers }),
      ]);

      if (holdingsRes.ok && txsRes.ok && summaryRes.ok) {
        const [holdingsData, txsData, summaryData] = await Promise.all([
          holdingsRes.json(),
          txsRes.json(),
          summaryRes.json(),
        ]);

        setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
        setTransactions(Array.isArray(txsData) ? txsData : []);
        setSummary(summaryData);
        setLoading(false);
        return;
      }

      // Offline LocalStorage fallback for authenticated user
      const savedHoldings = localStorage.getItem(holdingsKey);
      const savedTxs = localStorage.getItem(transactionsKey);
      const parsedHoldings: Holding[] = savedHoldings ? JSON.parse(savedHoldings) : [];
      const parsedTxs: Transaction[] = savedTxs ? JSON.parse(savedTxs) : [];

      setHoldings(parsedHoldings);
      setTransactions(parsedTxs);
      
      // Calculate local summary fallback
      const totalVal = parsedHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
      const totalCost = parsedHoldings.reduce((sum, h) => sum + (h.costBasis || 0), 0);
      const unrealized = totalVal - totalCost;
      const pnlPct = totalCost > 0 ? (unrealized / totalCost) * 100 : 0;

      setSummary({
        totalValueBase: totalVal,
        totalCostBasisBase: totalCost,
        totalUnrealizedPnLBase: unrealized,
        unrealizedPnLPercent: pnlPct,
        holdingCount: parsedHoldings.length,
        userCurrency: currency,
        allocationByAssetType: [],
      });
    } catch (err) {
      console.error('Failed to fetch investment data:', err);
      setError('Unable to load investment data.');
    } finally {
      setLoading(false);
    }
  }, [user, session, holdingsKey, transactionsKey, currency]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Create Holding
  // ---------------------------------------------------------------------------
  const createHolding = async (
    payload: HoldingCreatePayload
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const token = session?.access_token;
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
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const token = session?.access_token;
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
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const token = session?.access_token;
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
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const token = session?.access_token;
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
