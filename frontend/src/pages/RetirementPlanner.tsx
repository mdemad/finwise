import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateRetirement, RetirementInputs, RetirementResult } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exporters';
import { GlassCard, Slider, CustomButton, CustomInput } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownToLine, Printer, Save, FolderLock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RetirementPlanner: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // Inputs
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(60);
  const [currentSavings, setCurrentSavings] = useState(200000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(15000);
  const [expectedReturnBefore, setExpectedReturnBefore] = useState(12);
  const [expectedReturnAfter, setExpectedReturnAfter] = useState(8); // conservative post-retirement return
  const [inflationRate, setInflationRate] = useState(6);
  const [monthlyExpensePost, setMonthlyExpensePost] = useState(50000);

  // Save Plan states
  const [planName, setPlanName] = useState('My Retirement Plan');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Result
  const [result, setResult] = useState<RetirementResult | null>(null);

  useEffect(() => {
    // Prevent invalid ages
    if (retirementAge <= currentAge) {
      setResult(null);
      return;
    }
    const inputs: RetirementInputs = {
      currentAge,
      retirementAge,
      currentSavings,
      monthlyInvestment,
      expectedReturnBeforeRetirement: expectedReturnBefore,
      expectedReturnAfterRetirement: expectedReturnAfter,
      inflationRate,
      monthlyExpensePostRetirement: monthlyExpensePost,
    };
    const res = calculateRetirement(inputs);
    setResult(res);
  }, [currentAge, retirementAge, currentSavings, monthlyInvestment, expectedReturnBefore, expectedReturnAfter, inflationRate, monthlyExpensePost]);

  const handleSave = async () => {
    if (!user) return;
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'retirement',
      planName,
      { currentAge, retirementAge, currentSavings, monthlyInvestment, expectedReturnBefore, expectedReturnAfter, inflationRate, monthlyExpensePost },
      result
    );
    setSavingPlan(false);
    if (calc) {
      setSaveSuccess('Calculation saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const exportData = result.chartData.map(pt => ({
      Age: pt.year,
      'Projected Value': pt.futureValue,
    }));
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_report`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Retirement Planner <FolderLock className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Map out your wealth accumulation and decumulation trajectory post-retirement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomButton variant="ghost" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs font-semibold">
            <ArrowDownToLine className="w-4 h-4" /> CSV Report
          </CustomButton>
          <CustomButton variant="ghost" size="sm" onClick={triggerPrint} className="gap-1.5 text-xs font-semibold">
            <Printer className="w-4 h-4" /> Print PDF
          </CustomButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-6">
            <h2 className="text-lg font-bold">Retirement Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <CustomInput
                label="Current Age"
                type="number"
                value={currentAge}
                onChange={e => setCurrentAge(Number(e.target.value))}
                min={18}
                max={100}
              />
              <CustomInput
                label="Retirement Age"
                type="number"
                value={retirementAge}
                onChange={e => setRetirementAge(Number(e.target.value))}
                min={18}
                max={100}
              />
            </div>
            {retirementAge <= currentAge && (
              <span className="text-xs text-red-500 font-bold block">
                ⚠️ Retirement age must be greater than current age.
              </span>
            )}

            <Slider
              label="Current Savings"
              min={0}
              max={10000000}
              step={10000}
              value={currentSavings}
              onChange={setCurrentSavings}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <Slider
              label="Monthly Investment"
              min={1000}
              max={500000}
              step={1000}
              value={monthlyInvestment}
              onChange={setMonthlyInvestment}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <Slider
              label="Monthly Expenses Needed (Post-Ret.)"
              min={5000}
              max={1000000}
              step={5000}
              value={monthlyExpensePost}
              onChange={setMonthlyExpensePost}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <div className="grid grid-cols-2 gap-4 border-t border-slate-200/30 dark:border-slate-800/30 pt-4">
              <CustomInput
                label="Pre-Ret Return %"
                type="number"
                value={expectedReturnBefore}
                onChange={e => setExpectedReturnBefore(Number(e.target.value))}
                step={0.5}
              />
              <CustomInput
                label="Post-Ret Return %"
                type="number"
                value={expectedReturnAfter}
                onChange={e => setExpectedReturnAfter(Number(e.target.value))}
                step={0.5}
              />
            </div>

            <Slider
              label="Inflation Rate"
              min={1}
              max={20}
              step={0.5}
              value={inflationRate}
              onChange={setInflationRate}
              suffixSymbol="%"
            />

            {user && retirementAge > currentAge ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                />
                <CustomButton onClick={handleSave} variant="secondary" size="sm" fullWidth className="gap-2">
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save Retirement Plan'}
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

        {/* Right Side: Outputs */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Output cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                  <span className="text-[10px] font-bold text-slate-400">TARGET CORPUS</span>
                  <p className="text-lg font-black mt-1 text-slate-800 dark:text-slate-100">
                    {formatCurrency(result.retirementCorpus, currency)}
                  </p>
                </GlassCard>
                <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                  <span className="text-[10px] font-bold text-slate-400">SAFE MONTHLY SWR</span>
                  <p className="text-lg font-black mt-1 text-emerald-500">
                    {formatCurrency(result.monthlyIncomeSupported, currency)}
                  </p>
                </GlassCard>
                <GlassCard className={`text-center p-5 border ${
                  result.isSustainable
                    ? 'bg-emerald-500/5 border-emerald-500/10'
                    : 'bg-red-500/5 border-red-500/10'
                }`}>
                  <span className="text-[10px] font-bold text-slate-400">CORPUS SUSTAINABILITY</span>
                  <p className={`text-lg font-black mt-1 ${result.isSustainable ? 'text-emerald-500' : 'text-red-500'}`}>
                    {result.yearsSustained >= 50 ? '50+ Years' : `${result.yearsSustained} Years`}
                  </p>
                </GlassCard>
              </div>

              {/* Banner for Sustainability Alert */}
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                result.isSustainable
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
                {result.isSustainable ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <div className="text-xs font-semibold">
                      Your retirement corpus is sustainable! The savings and compounding growth should cover your expenses for at least 30 years post-retirement.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="text-xs font-semibold">
                      Action Required: Your corpus is projected to sustain you for only {result.yearsSustained} years. Consider increasing monthly investments, delaying retirement age, or lowering post-retirement expenses.
                    </div>
                  </>
                )}
              </div>

              {/* Chart */}
              <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
                <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider">
                  Accumulation & Decumulation Curve
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.chartData}>
                      <defs>
                        <linearGradient id="retirementCurve" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={value => `${value / 1000000}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                        }}
                      formatter={(val: any) => [formatCurrency(Number(val), currency), '']}
                      />
                      <Area
                        type="monotone"
                        dataKey="futureValue"
                        name="Corpus Balance"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#retirementCurve)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center bg-slate-100/40 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-medium">
              Awaiting valid retirement inputs...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
