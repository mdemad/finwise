import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import { Sparkles, ArrowRight } from 'lucide-react';

export const Signup: React.FC = () => {
  const { signup, error } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setLoading(true);
    const success = await signup(name, email, password);
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-emerald flex items-center justify-center shadow-xl shadow-emerald-500/25 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
            Create your account
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
            Start modeling your financial future today
          </p>
        </div>

        <GlassCard className="border border-slate-200/60 dark:border-slate-800/60">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-semibold">
                {error}
              </div>
            )}

            <CustomInput
              label="Full Name"
              type="text"
              placeholder="Alex Johnson"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <CustomInput
              label="Email Address"
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <CustomInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <CustomButton
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              className="mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center gap-1">
                  Get Started <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </CustomButton>
          </form>
        </GlassCard>

        <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-500 hover:text-emerald-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};
