import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import { Sparkles, ArrowRight, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { resetPassword, error } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    // Regardless of whether the user exists in auth.users, show the standard privacy-preserving confirmation
    setSubmitted(true);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-emerald flex items-center justify-center shadow-xl shadow-emerald-500/25 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
            Reset your password
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 text-center">
            {submitted
              ? 'Check your inbox for password reset instructions'
              : 'Enter your email address and we will send you a reset link'}
          </p>
        </div>

        <GlassCard className="border border-slate-200/60 dark:border-slate-800/60">
          {submitted ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset Link Dispatched
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  If an account exists with this email, we'll send you a password reset link.
                </p>
              </div>

              <div className="pt-2">
                <Link to="/login">
                  <CustomButton variant="primary" fullWidth>
                    <span className="flex items-center gap-1.5">
                      <ArrowLeft className="w-4 h-4" /> Return to Log In
                    </span>
                  </CustomButton>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-semibold">
                  {error}
                </div>
              )}

              <CustomInput
                label="Email Address"
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              <CustomButton
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading || !email}
                className="mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" /> Send Reset Link <ArrowRight className="w-4 h-4 ml-0.5" />
                  </span>
                )}
              </CustomButton>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
                </Link>
              </div>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
