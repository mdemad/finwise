import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Goal, GoalCreate, GoalUpdate, GoalsSummary } from '../types/goals';

const API_URL = import.meta.env.VITE_API_URL || '';
const FETCH_TIMEOUT_MS = 25000;

export function useGoals() {
  const { user, session } = useAuth();
  const { currency } = useCurrency();
  const userId = user?.id;

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const currencyRef = useRef(currency);
  currencyRef.current = currency;
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setGoals([]);
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

      const [goalsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/goals`, { headers, signal: controller.signal }),
        fetch(`${API_URL}/api/goals/summary`, { headers, signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      if (goalsRes.ok && summaryRes.ok) {
        const goalsData = await goalsRes.json();
        const summaryData = await summaryRes.json();
        setGoals(Array.isArray(goalsData) ? goalsData : []);
        setSummary(summaryData);
        setError(null);
      } else {
        setError("We couldn't load your goals right now. The server may be waking up. Please try again.");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. The server may be waking up. Please try again.');
      } else {
        console.error('Failed to fetch goals:', err);
        setError("We couldn't load your goals right now. The server may be waking up. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (data: GoalCreate): Promise<Goal | null> => {
    if (!userId) return null;
    try {
      const token = sessionRef.current?.access_token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`${API_URL}/api/goals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, currency: data.currency || currencyRef.current })
      });

      if (res.ok) {
        const newGoal = await res.json();
        setGoals(prev => [newGoal, ...prev]);
        fetchGoals(); // refresh summary
        return newGoal;
      }
      return null;
    } catch (err) {
      console.error('Failed to create goal:', err);
      return null;
    }
  };

  const updateGoal = async (id: string, updates: GoalUpdate): Promise<boolean> => {
    if (!userId) return false;
    try {
      const token = sessionRef.current?.access_token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`${API_URL}/api/goals/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const updatedGoal = await res.json();
        setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
        fetchGoals(); // refresh summary
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update goal:', err);
      return false;
    }
  };

  const deleteGoal = async (id: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const token = sessionRef.current?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_URL}/api/goals/${id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setGoals(prev => prev.filter(g => g.id !== id));
        fetchGoals(); // refresh summary
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete goal:', err);
      return false;
    }
  };

  return {
    goals,
    summary,
    loading,
    error,
    addGoal,
    updateGoal,
    deleteGoal,
    refresh: fetchGoals
  };
}
