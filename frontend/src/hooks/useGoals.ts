import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Goal, GoalCreate, GoalUpdate, GoalsSummary } from '../types/goals';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useGoals() {
  const { user, session } = useAuth();
  const { currency } = useCurrency();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = session?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [goalsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/goals`, { headers }),
        fetch(`${API_URL}/api/goals/summary`, { headers })
      ]);

      if (goalsRes.ok && summaryRes.ok) {
        const goalsData = await goalsRes.json();
        const summaryData = await summaryRes.json();
        setGoals(goalsData);
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      setError('Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (data: GoalCreate): Promise<Goal | null> => {
    if (!user) return null;
    try {
      const token = session?.access_token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`${API_URL}/api/goals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, currency: data.currency || currency })
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
    if (!user) return false;
    try {
      const token = session?.access_token;
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
    if (!user) return false;
    try {
      const token = session?.access_token;
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
