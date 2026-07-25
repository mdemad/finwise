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

const API_URL = import.meta.env.VITE_API_URL || '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if session exists (API or LocalStorage)
    const checkAuth = async () => {
      try {
        if (API_URL) {
          const token = localStorage.getItem('finwise-token');
          if (token) {
            const res = await fetch(`${API_URL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setUser(data);
            } else {
              localStorage.removeItem('finwise-token');
            }
          }
        } else {
          // LocalStorage fallback
          const session = localStorage.getItem('finwise-session');
          if (session) {
            setUser(JSON.parse(session));
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
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
      if (API_URL) {
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
      } else {
        // LocalStorage fallback check
        const users = JSON.parse(localStorage.getItem('finwise-users') || '[]');
        const found = users.find((u: any) => u.email === email && u.password === password);
        if (found) {
          const sessionUser: User = {
            id: found.id,
            email: found.email,
            name: found.name,
            currency: found.currency || 'USD',
            createdAt: found.createdAt,
          };
          localStorage.setItem('finwise-session', JSON.stringify(sessionUser));
          setUser(sessionUser);
          setLoading(false);
          return true;
        } else {
          throw new Error('Invalid email or password');
        }
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
      if (API_URL) {
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
      } else {
        // LocalStorage register
        const users = JSON.parse(localStorage.getItem('finwise-users') || '[]');
        if (users.some((u: any) => u.email === email)) {
          throw new Error('Email is already registered');
        }

        const newUser = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          password, // note: stored in plain text for client-side local demonstration fallback
          currency: 'USD',
          createdAt: new Date().toISOString(),
        };
        users.push(newUser);
        localStorage.setItem('finwise-users', JSON.stringify(users));

        const sessionUser: User = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          currency: newUser.currency,
          createdAt: newUser.createdAt,
        };
        localStorage.setItem('finwise-session', JSON.stringify(sessionUser));
        setUser(sessionUser);
        setLoading(false);
        return true;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    if (API_URL) {
      localStorage.removeItem('finwise-token');
    } else {
      localStorage.removeItem('finwise-session');
    }
  };

  const updateProfile = async (name: string, currency: string): Promise<boolean> => {
    if (!user) return false;
    try {
      if (API_URL) {
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
      } else {
        // LocalStorage profile update
        const users = JSON.parse(localStorage.getItem('finwise-users') || '[]');
        const updatedUsers = users.map((u: any) => {
          if (u.id === user.id) {
            return { ...u, name, currency };
          }
          return u;
        });
        localStorage.setItem('finwise-users', JSON.stringify(updatedUsers));

        const updatedUser = { ...user, name, currency };
        localStorage.setItem('finwise-session', JSON.stringify(updatedUser));
        setUser(updatedUser);
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
