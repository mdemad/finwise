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

const DEFAULT_SAMPLE_ASSETS: AssetItem[] = [
  {
    id: 'sample-asset-1',
    name: 'Main Bank Savings',
    category: 'cash_bank',
    currentValue: 150000,
    purchaseValue: 150000,
    currency: 'USD',
    notes: 'Emergency liquidity & checking',
  },
  {
    id: 'sample-asset-2',
    name: 'US Tech Index & Blue Chips',
    category: 'stocks',
    currentValue: 450000,
    purchaseValue: 350000,
    purchaseDate: '2024-01-15',
    quantity: '120 shares',
    currency: 'USD',
    notes: 'Broad market equities portfolio',
  },
  {
    id: 'sample-asset-3',
    name: 'Global Diversified Index ETF',
    category: 'mutual_funds',
    currentValue: 300000,
    purchaseValue: 240000,
    purchaseDate: '2023-06-10',
    quantity: '250 units',
    currency: 'USD',
    notes: 'Long-term retirement compounding',
  },
  {
    id: 'sample-asset-4',
    name: '24K Physical Gold Bar',
    category: 'gold',
    currentValue: 200000,
    purchaseValue: 160000,
    purchaseDate: '2022-11-20',
    quantity: '50 grams',
    currency: 'USD',
    notes: 'Hedge against currency depreciation',
  },
  {
    id: 'sample-asset-5',
    name: 'Residential Apartment',
    category: 'real_estate',
    currentValue: 1200000,
    purchaseValue: 950000,
    purchaseDate: '2021-04-01',
    currency: 'USD',
    notes: 'Primary residential property',
  },
  {
    id: 'sample-asset-6',
    name: 'Bitcoin Cold Storage',
    category: 'bitcoin',
    currentValue: 100000,
    purchaseValue: 60000,
    purchaseDate: '2023-01-10',
    quantity: '1.2 BTC',
    currency: 'USD',
    notes: 'Long-term asymmetric store of value',
  },
];

const DEFAULT_SAMPLE_LIABILITIES: LiabilityItem[] = [
  {
    id: 'sample-liab-1',
    name: 'Primary Home Mortgage',
    category: 'home_loan',
    outstandingAmount: 650000,
    originalAmount: 800000,
    interestRate: 6.5,
    emi: 4200,
    remainingTenureMonths: 180,
    currency: 'USD',
    notes: '15-year fixed mortgage',
  },
  {
    id: 'sample-liab-2',
    name: 'Premium Rewards Card',
    category: 'credit_card',
    outstandingAmount: 25000,
    interestRate: 18.0,
    emi: 1200,
    currency: 'USD',
    notes: 'Paid off monthly',
  },
  {
    id: 'sample-liab-3',
    name: 'Electric Vehicle Financing',
    category: 'vehicle_loan',
    outstandingAmount: 45000,
    originalAmount: 60000,
    interestRate: 5.2,
    emi: 850,
    remainingTenureMonths: 36,
    currency: 'USD',
    notes: 'Auto loan balance',
  },
];

const DEFAULT_SAMPLE_SNAPSHOTS: NetWorthSnapshot[] = [
  {
    id: 'snap-1',
    date: 'Jan 2026',
    totalAssets: 2100000,
    totalLiabilities: 780000,
    netWorth: 1320000,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'snap-2',
    date: 'Apr 2026',
    totalAssets: 2280000,
    totalLiabilities: 750000,
    netWorth: 1530000,
    createdAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'snap-3',
    date: 'Aug 2026',
    totalAssets: 2400000,
    totalLiabilities: 720000,
    netWorth: 1680000,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
];

export function useNetWorth() {
  const { user, session } = useAuth();
  const { currency } = useCurrency();

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Storage keys scoped to user
  const storageKeyPrefix = user ? `finwise-user-${user.id}` : 'finwise-guest';
  const assetsKey = `${storageKeyPrefix}-assets`;
  const liabsKey = `${storageKeyPrefix}-liabilities`;
  const snapsKey = `${storageKeyPrefix}-snapshots`;

  // Fetch / restore all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
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

          if (assetsData.length === 0 && liabsData.length === 0) {
            setAssets(DEFAULT_SAMPLE_ASSETS);
            setLiabilities(DEFAULT_SAMPLE_LIABILITIES);
            setSnapshots(DEFAULT_SAMPLE_SNAPSHOTS);
          } else {
            setAssets(assetsData);
            setLiabilities(liabsData);
            setSnapshots(snapsData);
          }
          setLoading(false);
          return;
        }
      }

      // LocalStorage fallback
      const savedAssets = localStorage.getItem(assetsKey);
      const savedLiabs = localStorage.getItem(liabsKey);
      const savedSnaps = localStorage.getItem(snapsKey);

      if (savedAssets || savedLiabs) {
        setAssets(savedAssets ? JSON.parse(savedAssets) : []);
        setLiabilities(savedLiabs ? JSON.parse(savedLiabs) : []);
        setSnapshots(savedSnaps ? JSON.parse(savedSnaps) : DEFAULT_SAMPLE_SNAPSHOTS);
      } else {
        setAssets(DEFAULT_SAMPLE_ASSETS);
        setLiabilities(DEFAULT_SAMPLE_LIABILITIES);
        setSnapshots(DEFAULT_SAMPLE_SNAPSHOTS);
      }
    } catch (err) {
      console.error('Failed to fetch net worth data:', err);
      setError('Unable to load wealth data. Using local cache.');
      setAssets(DEFAULT_SAMPLE_ASSETS);
      setLiabilities(DEFAULT_SAMPLE_LIABILITIES);
      setSnapshots(DEFAULT_SAMPLE_SNAPSHOTS);
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
    try {
      const newAsset: AssetItem = {
        ...assetData,
        id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        currency: assetData.currency || currency,
        createdAt: new Date().toISOString(),
      };

      if (user) {
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
    try {
      if (user) {
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
    try {
      if (user) {
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
    try {
      const newLiab: LiabilityItem = {
        ...liabData,
        id: `liab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        currency: liabData.currency || currency,
        createdAt: new Date().toISOString(),
      };

      if (user) {
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
    try {
      if (user) {
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
    try {
      if (user) {
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
      if (user) {
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
