import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  currency?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (name: string, currency: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API_URL is an optional absolute-URL override (e.g. for production deploys).
// When empty (local dev), requests use relative /api/... paths which the
// Vite dev-server proxy forwards to http://localhost:8000.
const API_URL = import.meta.env.VITE_API_URL || '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restore session from stored JWT token on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('finwise-token');
        if (token) {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            // Token is expired or invalid — clear it
            localStorage.removeItem('finwise-token');
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
        localStorage.removeItem('finwise-token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('finwise-token', data.token);
        setUser(data.user);
        setLoading(false);
        return true;
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      setLoading(false);
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('finwise-token', data.token);
        setUser(data.user);
        setLoading(false);
        return true;
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('finwise-token');
  };

  const updateProfile = async (name: string, currency: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const token = localStorage.getItem('finwise-token');
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, currency }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      }
    } catch (err) {
      console.error('Profile update failed:', err);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
