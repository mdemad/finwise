import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateEmergencyFund, EmergencyInputs } from '../utils/calculations';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { GlassCard, Slider, CustomInput, CustomButton } from '../components/UI';
import { ShieldCheck, Save, CheckCircle2, ArrowDownToLine, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportToCSV, triggerPrint } from '../utils/exporters';

export const EmergencyFund: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(50000);
  const [jobStability, setJobStability] = useState<'high' | 'medium' | 'low'>('high');
  const [dependents, setDependents] = useState<number>(0);
  const [hasLoanEmi, setHasLoanEmi] = useState<boolean>(false);

  const [planName, setPlanName] = useState('Emergency Buffer Plan');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const inputs: EmergencyInputs = useMemo(
    () => ({
      monthlyExpenses,
      dependents,
      jobStability,
    }),
    [monthlyExpenses, dependents, jobStability]
  );

  const result = useMemo(() => {
    return calculateEmergencyFund(inputs);
  }, [inputs]);

  const handleSave = async () => {
    if (!user || !result) return;
    setSavingPlan(true);
    const saved = await saveCalculation('emergency', planName, inputs, result);
    setSavingPlan(false);
    if (saved) {
      setSaveSuccess('Saved successfully to your dashboard!');
      setTimeout(() => setSaveSuccess(''), 3000);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const exportData = [
      {
        'Monthly Living Expenses': formatCurrency(monthlyExpenses, currency),
        'Job Volatility Profile': jobStability,
        'Number of Dependents': dependents,
        'Active Loan EMIs': hasLoanEmi ? 'Yes' : 'No',
        'Recommended Coverage': `${result.monthsCovered} Months`,
        'Total Required Buffer': formatCurrency(result.recommendedFund, currency),
      },
    ];
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_emergency_report`);
  };

  return (
    <div className="space-y-8 page-transition">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Emergency Fund Calculator <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Determine your ideal liquidity buffer based on expenses, job volatility, and dependents.
          </p>
        </div>

        {/* Export Buttons */}
        {result && (
          <div className="flex flex-wrap items-center gap-2">
            <CustomButton variant="ghost" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs font-semibold">
              <ArrowDownToLine className="w-4 h-4" /> CSV Report
            </CustomButton>
            <CustomButton variant="ghost" size="sm" onClick={triggerPrint} className="gap-1.5 text-xs font-semibold">
              <Printer className="w-4 h-4" /> Print PDF
            </CustomButton>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Inputs */}
        <div className="space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-6 space-y-6">
            <CustomInput
              label="Monthly Expenses"
              type="number"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            {/* Job Stability Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Job / Employment Volatility
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'high', label: 'Stable (Gov/MNC)' },
                  { id: 'medium', label: 'Moderate (Private)' },
                  { id: 'low', label: 'High (Freelance/Startup)' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setJobStability(st.id as any)}
                    className={`py-2 px-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                      jobStability === st.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label="Number of Dependents"
              min={0}
              max={8}
              step={1}
              value={dependents}
              onChange={setDependents}
            />

            <div className="flex items-center justify-between border-t border-slate-200/30 dark:border-slate-800/30 pt-4">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Active Loan EMIs / Debt Obligations
              </span>
              <input
                type="checkbox"
                checked={hasLoanEmi}
                onChange={(e) => setHasLoanEmi(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {user ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
                <CustomButton
                  onClick={handleSave}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  className="gap-2"
                >
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save Emergency Plan'}
                </CustomButton>
                {saveSuccess && (
                  <p className="text-[10px] text-emerald-500 font-bold text-center">
                    {saveSuccess}
                  </p>
                )}
              </div>
            ) : (
              <div className="border-t border-slate-200/30 dark:border-slate-800/30 pt-4 text-center">
                <p className="text-xs text-slate-400 font-medium">
                  Want to save these plans?{' '}
                  <Link to="/login" className="text-emerald-500 hover:underline">
                    Login / Sign up
                  </Link>
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Side Outputs */}
        <div className="lg:col-span-2 space-y-6">
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <GlassCard className="text-center p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex flex-col justify-center items-center">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  RECOMMENDED EMERGENCY FUND
                </span>
                <p className="text-2xl font-black mt-1 text-slate-900 dark:text-emerald-400">
                  {formatCurrency(result.recommendedFund, currency)}
                </p>
              </GlassCard>

              <GlassCard className="text-center p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-center items-center">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {result.monthsCovered} Months
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wider">
                  TOTAL COVERAGE DURATION
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Based on base expenses + job volatility + dependent adjustments.
                </p>
              </GlassCard>
            </div>
          )}

          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-4 uppercase text-slate-400 tracking-wider">
                Months Covered Breakdown
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                <div className="py-3 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Base Safety Reserve
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    3 Months ({formatCurrency(monthlyExpenses * 3, currency)})
                  </span>
                </div>
                <div className="py-3 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Job Volatility Adjustment ({jobStability})
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{jobStability === 'low' ? 3 : jobStability === 'medium' ? 1 : 0} Months
                  </span>
                </div>
                {dependents > 0 && (
                  <div className="py-3 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Dependents Buffer ({dependents} persons)
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{Math.min(3, dependents)} Months
                    </span>
                  </div>
                )}
                {hasLoanEmi && (
                  <div className="py-3 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Debt EMI Shield
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +1 Month
                    </span>
                  </div>
                )}
                <div className="py-3.5 flex justify-between items-center text-xs font-extrabold bg-slate-50/50 dark:bg-slate-900/30 px-3 rounded-xl mt-2">
                  <span className="text-slate-900 dark:text-white">Total Recommended Buffer</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                    {result.monthsCovered} Months ({formatCurrency(result.recommendedFund, currency)})
                  </span>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
