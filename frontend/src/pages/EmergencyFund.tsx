import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateEmergencyFund, EmergencyInputs, EmergencyResult } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exporters';
import { GlassCard, Slider, CustomButton, CustomInput } from '../components/UI';
import { ShieldAlert, Save, ShieldCheck, HelpCircle, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EmergencyFund: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // Inputs
  const [monthlyExpenses, setMonthlyExpenses] = useState(30000);
  const [dependents, setDependents] = useState(2);
  const [jobStability, setJobStability] = useState<'high' | 'medium' | 'low'>('medium');

  // Save Plan
  const [planName, setPlanName] = useState('My Emergency Safety Net');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Results
  const [result, setResult] = useState<EmergencyResult | null>(null);

  useEffect(() => {
    const inputs: EmergencyInputs = { monthlyExpenses, dependents, jobStability };
    const res = calculateEmergencyFund(inputs);
    setResult(res);
  }, [monthlyExpenses, dependents, jobStability]);

  const handleSave = async () => {
    if (!user) return;
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'emergency',
      planName,
      { monthlyExpenses, dependents, jobStability },
      result
    );
    setSavingPlan(false);
    if (calc) {
      setSaveSuccess('Calculation saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Emergency Fund <ShieldAlert className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Determine how much liquid cash you should store in low-risk profiles for financial crises.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomButton variant="ghost" size="sm" onClick={triggerPrint} className="gap-1.5 text-xs font-semibold">
            <Printer className="w-4 h-4" /> Print PDF
          </CustomButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-6">
            <h2 className="text-lg font-bold">Adjust Variables</h2>

            <Slider
              label="Monthly Expenses"
              min={1000}
              max={500000}
              step={1000}
              value={monthlyExpenses}
              onChange={setMonthlyExpenses}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <Slider
              label="Number of Dependents"
              min={0}
              max={10}
              value={dependents}
              onChange={setDependents}
            />

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Job/Income Stability</label>
              <select
                value={jobStability}
                onChange={e => setJobStability(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 text-sm font-medium focus:outline-none"
              >
                <option value="high">High (e.g. Tenured Gov Job, Safe Business)</option>
                <option value="medium">Medium (e.g. Standard Salaried IT)</option>
                <option value="low">Low (e.g. Freelancer, Startup, Commission)</option>
              </select>
            </div>

            {user ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                />
                <CustomButton onClick={handleSave} variant="secondary" size="sm" fullWidth className="gap-2">
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save Emergency Plan'}
                </CustomButton>
                {saveSuccess && (
                  <p className="text-[10px] text-emerald-500 font-bold text-center">{saveSuccess}</p>
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
              <GlassCard className="text-center p-5 bg-gradient-to-b from-emerald-950/10 dark:from-emerald-950/20 border border-emerald-500/10 flex flex-col justify-center items-center">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-400">RECOMMENDED EMERGENCY FUND</span>
                <p className="text-2xl font-black mt-1 text-slate-850 dark:text-emerald-400">
                  {formatCurrency(result.recommendedFund, currency)}
                </p>
              </GlassCard>

              <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30 flex flex-col justify-center items-center">
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                  {result.monthsCovered} Months
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-2">TOTAL COVERAGE DURATION</span>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Based on base expenses + job volatility + dependent adjustments.
                </p>
              </GlassCard>
            </div>
          )}

          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-4 uppercase text-slate-400 tracking-wider">Months Covered Breakdown</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                <div className="py-3.5 flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500 flex items-center gap-1">
                    Base Emergency Buffer{" "}
                    <span title="Standard recommended minimum coverage for any household">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </span>
                  <span>{result.factors.baseMonths} Months</span>
                </div>
                <div className="py-3.5 flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500 flex items-center gap-1">
                    Dependents Buffer{" "}
                    <span title="Adds 1 month per dependent (capped at 3 months) to secure school fees, food, etc.">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </span>
                  <span>+{result.factors.dependentMonths} Months</span>
                </div>
                <div className="py-3.5 flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500 flex items-center gap-1">
                    Job Volatility Buffer{" "}
                    <span title="Low stability (contractors/freelancers) requires up to 3 extra months buffer">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </span>
                  <span>+{result.factors.stabilityMonths} Months</span>
                </div>

                <div className="py-3.5 flex justify-between items-center text-sm font-bold text-emerald-500">
                  <span>Total Recommendation</span>
                  <span>{result.monthsCovered} Months ({formatCurrency(result.recommendedFund, currency)})</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Allocation Tips */}
          <GlassCard className="bg-slate-150/15 border border-slate-200/50 dark:bg-slate-900/10 dark:border-slate-800/40 p-5 space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Where to keep this fund?</h4>
            <ul className="text-xs space-y-2 text-slate-500 dark:text-slate-400 list-disc pl-4 leading-relaxed">
              <li><strong>Cash / Checking (10% - 20%):</strong> Immediate liquid availability for urgent cash needs.</li>
              <li><strong>High-Yield Savings / Flexi FD (50% - 60%):</strong> Earn decent returns while maintaining same-day access.</li>
              <li><strong>Liquid Mutual Funds (20% - 30%):</strong> Highly stable, inflation-beating yields, withdrawable in 24 hours.</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
