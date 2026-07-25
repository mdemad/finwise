import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCalculations } from '../hooks/useCalculations';
import { CurrencyCode, currencies, formatDate } from '../utils/formatters';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import { User, Settings, Clock, Star, Trash2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { calculations, toggleFavorite, deleteCalculation } = useCalculations();

  const [name, setName] = useState(user?.name || '');
  const [profileCurrency, setProfileCurrency] = useState<CurrencyCode>(currency);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setSuccessMsg('');
    const ok = await updateProfile(name, profileCurrency);
    if (ok) {
      setCurrency(profileCurrency);
      setSuccessMsg('Profile settings updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
    setUpdating(false);
  };

  const getCalculatorLabel = (type: string) => {
    switch (type) {
      case 'sip': return 'SIP';
      case 'lump_sum': return 'Lump Sum';
      case 'inflation': return 'Inflation';
      case 'goal': return 'Goal Planner';
      case 'retirement': return 'Retirement';
      case 'fire': return 'FIRE';
      case 'emergency': return 'Emergency Fund';
      case 'emi': return 'EMI';
      case 'net_worth': return 'Net Worth';
      default: return type;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Account Profile</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details and saved financial calculations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Account Details */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
            <div className="flex flex-col items-center py-4 border-b border-slate-200/50 dark:border-slate-800/40 mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-3xl text-emerald-500 mb-3 shadow-inner">
                {user?.name[0].toUpperCase()}
              </div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">{user?.email}</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-xl font-semibold">
                  {successMsg}
                </div>
              )}

              <CustomInput
                label="Display Name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Preferred Currency
                </label>
                <select
                  value={profileCurrency}
                  onChange={e => setProfileCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-sm font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none cursor-pointer"
                >
                  {Object.keys(currencies).map(code => (
                    <option key={code} value={code}>
                      {code} ({currencies[code as CurrencyCode].symbol})
                    </option>
                  ))}
                </select>
              </div>

              <CustomButton type="submit" variant="primary" fullWidth disabled={updating} className="mt-4">
                {updating ? 'Updating...' : 'Save Settings'}
              </CustomButton>
            </form>
          </GlassCard>

          {/* Quick Metrics */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> System Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                <span className="text-[10px] font-bold text-slate-400">SAVED FORMULAS</span>
                <p className="text-lg font-bold text-emerald-500 mt-1">{calculations.length}</p>
              </div>
              <div className="p-3 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                <span className="text-[10px] font-bold text-slate-400">FAVORITES</span>
                <p className="text-lg font-bold text-blue-500 mt-1">
                  {calculations.filter(c => c.favorite).length}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: History List */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800/40 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-slate-400" /> Saved Calculations
              </h2>
            </div>

            {calculations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                No saved calculations found. Use any of the calculators to plan and save your projections.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto pr-2">
                {calculations.map(calc => (
                  <div key={calc.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0 hover:bg-slate-100/20 dark:hover:bg-slate-900/10 px-2 rounded-xl transition-all duration-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/${calc.calculatorType}`}
                          className="font-bold text-sm hover:text-emerald-500 truncate"
                        >
                          {calc.name}
                        </Link>
                        <span className="text-[10px] font-semibold bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
                          {getCalculatorLabel(calc.calculatorType)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Saved on {formatDate(calc.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavorite(calc.id)}
                        className={`p-2 rounded-lg border border-slate-200/30 dark:border-slate-800/30 cursor-pointer ${
                          calc.favorite
                            ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'
                            : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-500/5'
                        }`}
                        title={calc.favorite ? 'Remove Favorite' : 'Mark Favorite'}
                      >
                        <Star className={`w-4 h-4 ${calc.favorite ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        onClick={() => deleteCalculation(calc.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg border border-slate-200/30 dark:border-slate-800/30 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
