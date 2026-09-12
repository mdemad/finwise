import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import { Sparkles, ArrowRight, ArrowLeft, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const { updatePassword, session, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if there is an active session or a recovery token in the URL
    const checkRecoveryContext = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const hasRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token=');
      const hasCode = search.includes('code=');

      if (session) {
        setHasValidSession(true);
        return;
      }

      if (hasRecoveryHash || hasCode) {
        // Wait briefly for Supabase client to parse URL parameters and establish the recovery session
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setHasValidSession(true);
            return;
          }
        } catch {
          // Ignore and continue checking auth listener
        }
      }

      if (!authLoading) {
        setHasValidSession(!!session || hasRecoveryHash || hasCode);
      }
    };

    checkRecoveryContext();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && currentSession)) {
        setHasValidSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!newPassword) {
      setValidationError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (loading) return;

    setLoading(true);
    const ok = await updatePassword(newPassword);
    setLoading(false);

    if (ok) {
      setSuccess(true);
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
            Set New Password
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 text-center">
            Create a strong, secure password for your FinWise account
          </p>
        </div>

        <GlassCard className="border border-slate-200/60 dark:border-slate-800/60">
          {authLoading && hasValidSession === null ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Verifying reset token...</span>
            </div>
          ) : hasValidSession === false ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Link Invalid or Expired
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  This password reset link is invalid or has expired.
                </p>
              </div>

              <div className="pt-2">
                <Link to="/forgot-password">
                  <CustomButton variant="primary" fullWidth>
                    <span className="flex items-center gap-1.5">
                      Request New Reset Link <ArrowRight className="w-4 h-4 ml-0.5" />
                    </span>
                  </CustomButton>
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Password Updated Successfully
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your password has been changed. You can now log in with your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <Link to="/login">
                  <CustomButton variant="primary" fullWidth>
                    <span className="flex items-center gap-1.5">
                      Proceed to Log In <ArrowRight className="w-4 h-4 ml-0.5" />
                    </span>
                  </CustomButton>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {(validationError || authError) && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-semibold">
                  {validationError || authError}
                </div>
              )}

              <CustomInput
                label="New Password"
                type="password"
                placeholder="•••••••• (min. 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />

              <CustomInput
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />

              <CustomButton
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading || !newPassword || !confirmPassword}
                className="mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> Update Password <ArrowRight className="w-4 h-4 ml-0.5" />
                  </span>
                )}
              </CustomButton>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Log In
                </Link>
              </div>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
