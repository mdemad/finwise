import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  AssetItem,
  LiabilityItem,
  NetWorthSnapshot,
  WealthSummary,
  calculateWealthSummary,
} from '../utils/wealthConfig';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useNetWorth() {
  const { user, session } = useAuth();
  const { currency } = useCurrency();

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Storage keys strictly scoped to authenticated user ID (never shared across users)
  const storageKeyPrefix = user ? `finwise-user-${user.id}` : '';
  const assetsKey = user ? `${storageKeyPrefix}-assets` : '';
  const liabsKey = user ? `${storageKeyPrefix}-liabilities` : '';
  const snapsKey = user ? `${storageKeyPrefix}-snapshots` : '';

  // Helper to remove any legacy guest financial storage keys
  const clearLegacyGuestStorage = () => {
    const legacyKeys = [
      'finwise-guest-assets',
      'finwise-guest-liabilities',
      'finwise-guest-snapshots',
      'finwise_assets',
      'finwise_liabilities',
      'finwise_snapshots',
      'finwise-sample-loaded',
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
  };

  // Fetch / restore all data for the authenticated user
  const fetchData = useCallback(async () => {
    // Purge legacy guest storage keys
    clearLegacyGuestStorage();

    // Guard: Unauthenticated users must NEVER see cached/guest financial data
    if (!user) {
      setAssets([]);
      setLiabilities([]);
      setSnapshots([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = session?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [assetsRes, liabsRes, snapsRes] = await Promise.all([
        fetch(`${API_URL}/api/net-worth/assets`, { headers }),
        fetch(`${API_URL}/api/net-worth/liabilities`, { headers }),
        fetch(`${API_URL}/api/net-worth/history`, { headers }),
      ]);

      if (assetsRes.ok && liabsRes.ok && snapsRes.ok) {
        const [assetsData, liabsData, snapsData] = await Promise.all([
          assetsRes.json(),
          liabsRes.json(),
          snapsRes.json(),
        ]);

        setAssets(Array.isArray(assetsData) ? assetsData : []);
        setLiabilities(Array.isArray(liabsData) ? liabsData : []);
        setSnapshots(Array.isArray(snapsData) ? snapsData : []);
        setLoading(false);
        return;
      }

      // User-specific LocalStorage fallback (only for authenticated users)
      const savedAssets = localStorage.getItem(assetsKey);
      const savedLiabs = localStorage.getItem(liabsKey);
      const savedSnaps = localStorage.getItem(snapsKey);

      setAssets(savedAssets ? JSON.parse(savedAssets) : []);
      setLiabilities(savedLiabs ? JSON.parse(savedLiabs) : []);
      setSnapshots(savedSnaps ? JSON.parse(savedSnaps) : []);
    } catch (err) {
      console.error('Failed to fetch net worth data:', err);
      setError('Unable to load wealth data.');
      setAssets([]);
      setLiabilities([]);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, [user, session, assetsKey, liabsKey, snapsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived overall wealth metrics
  const summary: WealthSummary = useMemo(() => {
    return calculateWealthSummary(assets, liabilities);
  }, [assets, liabilities]);

  // ---------------------------------------------------------------------------
  // Assets CRUD Actions
  // ---------------------------------------------------------------------------
  const addAsset = async (assetData: Omit<AssetItem, 'id'>): Promise<AssetItem | null> => {
    if (!user) return null;

    try {
      const newAsset: AssetItem = {
        ...assetData,
        id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        currency: assetData.currency || currency,
        createdAt: new Date().toISOString(),
      };

      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_URL}/api/net-worth/assets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(assetData),
      });
      if (res.ok) {
        const created = await res.json();
        setAssets((prev) => [created, ...prev]);
        return created;
      }

      const updated = [newAsset, ...assets];
      setAssets(updated);
      localStorage.setItem(assetsKey, JSON.stringify(updated));
      return newAsset;
    } catch (err) {
      console.error('Failed to add asset:', err);
      return null;
    }
  };

  const updateAsset = async (id: string, updates: Partial<AssetItem>): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_URL}/api/net-worth/assets/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updatedItem = await res.json();
        setAssets((prev) => prev.map((a) => (a.id === id ? updatedItem : a)));
        return true;
      }

      const updated = assets.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      );
      setAssets(updated);
      localStorage.setItem(assetsKey, JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Failed to update asset:', err);
      return false;
    }
  };

  const deleteAsset = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/net-worth/assets/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        return true;
      }

      const updated = assets.filter((a) => a.id !== id);
      setAssets(updated);
      localStorage.setItem(assetsKey, JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Failed to delete asset:', err);
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // Liabilities CRUD Actions
  // ---------------------------------------------------------------------------
  const addLiability = async (liabData: Omit<LiabilityItem, 'id'>): Promise<LiabilityItem | null> => {
    if (!user) return null;

    try {
      const newLiab: LiabilityItem = {
        ...liabData,
        id: `liab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        currency: liabData.currency || currency,
        createdAt: new Date().toISOString(),
      };

      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_URL}/api/net-worth/liabilities`, {
        method: 'POST',
        headers,
        body: JSON.stringify(liabData),
      });
      if (res.ok) {
        const created = await res.json();
        setLiabilities((prev) => [created, ...prev]);
        return created;
      }

      const updated = [newLiab, ...liabilities];
      setLiabilities(updated);
      localStorage.setItem(liabsKey, JSON.stringify(updated));
      return newLiab;
    } catch (err) {
      console.error('Failed to add liability:', err);
      return null;
    }
  };

  const updateLiability = async (id: string, updates: Partial<LiabilityItem>): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_URL}/api/net-worth/liabilities/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updatedItem = await res.json();
        setLiabilities((prev) => prev.map((l) => (l.id === id ? updatedItem : l)));
        return true;
      }

      const updated = liabilities.map((l) =>
        l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
      );
      setLiabilities(updated);
      localStorage.setItem(liabsKey, JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Failed to update liability:', err);
      return false;
    }
  };

  const deleteLiability = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/net-worth/liabilities/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setLiabilities((prev) => prev.filter((l) => l.id !== id));
        return true;
      }

      const updated = liabilities.filter((l) => l.id !== id);
      setLiabilities(updated);
      localStorage.setItem(liabsKey, JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Failed to delete liability:', err);
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // Snapshots & History
  // ---------------------------------------------------------------------------
  const recordSnapshot = async (dateLabel?: string): Promise<NetWorthSnapshot | null> => {
    if (!user) return null;

    const label =
      dateLabel ||
      new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const newSnapshot: NetWorthSnapshot = {
      id: `snap-${Date.now()}`,
      date: label,
      totalAssets: summary.totalAssets,
      totalLiabilities: summary.totalLiabilities,
      netWorth: summary.netWorth,
      createdAt: new Date().toISOString(),
    };

    try {
      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_URL}/api/net-worth/history`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          date: newSnapshot.date,
          totalAssets: newSnapshot.totalAssets,
          totalLiabilities: newSnapshot.totalLiabilities,
          netWorth: newSnapshot.netWorth,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSnapshots((prev) => [...prev, created]);
        return created;
      }

      const updated = [...snapshots, newSnapshot];
      setSnapshots(updated);
      localStorage.setItem(snapsKey, JSON.stringify(updated));
      return newSnapshot;
    } catch (err) {
      console.error('Failed to record snapshot:', err);
      return null;
    }
  };

  return {
    assets,
    liabilities,
    snapshots,
    summary,
    loading,
    error,
    addAsset,
    updateAsset,
    deleteAsset,
    addLiability,
    updateLiability,
    deleteLiability,
    recordSnapshot,
    refresh: fetchData,
  };
}
