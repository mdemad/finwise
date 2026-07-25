import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface SavedCalculation {
  id: string;
  userId?: string;
  calculatorType: string; // 'sip' | 'lump_sum' | 'inflation' | 'goal' | 'retirement' | 'fire' | 'emergency' | 'emi' | 'net_worth'
  name: string;
  inputs: any;
  outputs: any;
  createdAt: string;
  favorite: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export function useCalculations() {
  const { user } = useAuth();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch calculations
  const fetchCalculations = async () => {
    if (!user) {
      setCalculations([]);
      return;
    }
    setLoading(true);
    try {
      if (API_URL) {
        const token = localStorage.getItem('finwise-token');
        const res = await fetch(`${API_URL}/api/calculations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCalculations(data);
        }
      } else {
        // Fallback local calculations
        const saved = localStorage.getItem('finwise-calculations') || '[]';
        const parsed = JSON.parse(saved) as SavedCalculation[];
        // Filter by current user
        const userCalcs = parsed.filter(c => c.userId === user.id);
        setCalculations(userCalcs);
      }
    } catch (err) {
      console.error('Failed to load calculations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculations();
  }, [user]);

  // Save a new calculation
  const saveCalculation = async (
    calculatorType: string,
    name: string,
    inputs: any,
    outputs: any
  ): Promise<SavedCalculation | null> => {
    if (!user) return null;

    const newCalc: Omit<SavedCalculation, 'id'> = {
      userId: user.id,
      calculatorType,
      name,
      inputs,
      outputs,
      createdAt: new Date().toISOString(),
      favorite: false,
    };

    try {
      if (API_URL) {
        const token = localStorage.getItem('finwise-token');
        const res = await fetch(`${API_URL}/api/calculations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newCalc),
        });
        if (res.ok) {
          const saved = await res.json();
          setCalculations(prev => [saved, ...prev]);
          return saved;
        }
      } else {
        // LocalStorage save
        const saved = localStorage.getItem('finwise-calculations') || '[]';
        const parsed = JSON.parse(saved) as SavedCalculation[];
        const item: SavedCalculation = {
          ...newCalc,
          id: Math.random().toString(36).substr(2, 9),
        };
        parsed.unshift(item);
        localStorage.setItem('finwise-calculations', JSON.stringify(parsed));
        setCalculations(prev => [item, ...prev]);
        return item;
      }
    } catch (err) {
      console.error('Failed to save calculation:', err);
    }
    return null;
  };

  // Toggle favorite status
  const toggleFavorite = async (id: string): Promise<boolean> => {
    try {
      if (API_URL) {
        const token = localStorage.getItem('finwise-token');
        const res = await fetch(`${API_URL}/api/calculations/${id}/favorite`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setCalculations(prev =>
            prev.map(c => (c.id === id ? { ...c, favorite: !c.favorite } : c))
          );
          return true;
        }
      } else {
        // LocalStorage update
        const saved = localStorage.getItem('finwise-calculations') || '[]';
        const parsed = JSON.parse(saved) as SavedCalculation[];
        const updated = parsed.map(c => (c.id === id ? { ...c, favorite: !c.favorite } : c));
        localStorage.setItem('finwise-calculations', JSON.stringify(updated));
        setCalculations(prev =>
          prev.map(c => (c.id === id ? { ...c, favorite: !c.favorite } : c))
        );
        return true;
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
    return false;
  };

  // Delete calculation
  const deleteCalculation = async (id: string): Promise<boolean> => {
    try {
      if (API_URL) {
        const token = localStorage.getItem('finwise-token');
        const res = await fetch(`${API_URL}/api/calculations/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setCalculations(prev => prev.filter(c => c.id !== id));
          return true;
        }
      } else {
        // LocalStorage delete
        const saved = localStorage.getItem('finwise-calculations') || '[]';
        const parsed = JSON.parse(saved) as SavedCalculation[];
        const filtered = parsed.filter(c => c.id !== id);
        localStorage.setItem('finwise-calculations', JSON.stringify(filtered));
        setCalculations(prev => prev.filter(c => c.id !== id));
        return true;
      }
    } catch (err) {
      console.error('Failed to delete calculation:', err);
    }
    return false;
  };

  return {
    calculations,
    loading,
    saveCalculation,
    toggleFavorite,
    deleteCalculation,
    refresh: fetchCalculations,
  };
}
