import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

export interface User {
  id: string;
  email: string;
  name: string;
  currency?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, currency: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || '';

const mapSupabaseUser = (sbUser: SupabaseUser): User => {
  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name:
      sbUser.user_metadata?.name ||
      sbUser.user_metadata?.full_name ||
      (sbUser.email ? sbUser.email.split('@')[0] : 'User'),
    currency: sbUser.user_metadata?.currency || 'USD',
    createdAt: sbUser.created_at,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user) {
            setUser(mapSupabaseUser(initialSession.user));
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to restore Supabase auth session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        if (currentSession?.user) {
          setUser(mapSupabaseUser(currentSession.user));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (sbError) throw sbError;
      if (data.session) {
        setSession(data.session);
        setUser(mapSupabaseUser(data.user));
      }
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: sbError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (sbError) throw sbError;
      if (data.user) {
        if (data.session) {
          setSession(data.session);
          setUser(mapSupabaseUser(data.user));
        }
      }
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    setError(null);
    try {
      const { error: sbError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (sbError) throw sbError;
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const updateProfile = async (name: string, currency: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error: sbError } = await supabase.auth.updateUser({
        data: { name, currency },
      });
      if (sbError) throw sbError;
      if (data.user) {
        setUser(mapSupabaseUser(data.user));
      }
      if (session?.access_token) {
        await fetch(`${API_URL}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ name, currency }),
        }).catch((err) => console.warn('Backend profile sync failed:', err));
      }
      return true;
    } catch (err: any) {
      console.error('Profile update failed:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateProfile,
      }}
    >
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
