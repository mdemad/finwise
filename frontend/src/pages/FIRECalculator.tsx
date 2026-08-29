import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateFire, FireInputs, FireResult } from '../utils/calculations';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exporters';
import { GlassCard, Slider, CustomButton, CustomInput } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, ArrowDownToLine, Printer, Save, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FIRECalculator: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // Inputs
  const [monthlyExpenses, setMonthlyExpenses] = useState(50000);
  const [currentSavings, setCurrentSavings] = useState(1000000);
  const [currentAge, setCurrentAge] = useState(30);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [inflationRate, setInflationRate] = useState(6);

  // States
  const [planName, setPlanName] = useState('My FIRE Number Plan');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Synchronous memoized calculation results
  const result: FireResult = React.useMemo(() => {
    const inputs: FireInputs = {
      monthlyExpenses,
      currentSavings,
      currentAge,
      expectedReturn,
      inflationRate,
    };
    return calculateFire(inputs);
  }, [monthlyExpenses, currentSavings, currentAge, expectedReturn, inflationRate]);

  const handleSave = async () => {
    if (!user) return;
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'fire',
      planName,
      { monthlyExpenses, currentSavings, currentAge, expectedReturn, inflationRate },
      result
    );
    setSavingPlan(false);
    if (calc) {
      setSaveSuccess('FIRE projection saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const exportData = result.chartData.map(pt => ({
      Year: pt.year,
      'Total Invested': pt.totalInvested,
      'Accumulated Corpus': pt.futureValue,
      'Target FIRE Corpus': pt.inflationAdjusted,
    }));
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_fire_report`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            FIRE Calculator <Flame className="w-6 h-6 text-orange-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Financial Independence, Retire Early — calculate your target corpus and required monthly savings.
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
        {/* Left Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-6">
            <h2 className="text-lg font-bold">FIRE Parameters</h2>

            <Slider
              label="Monthly Expenses"
              min={10000}
              max={500000}
              step={5000}
              value={monthlyExpenses}
              onChange={setMonthlyExpenses}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            <Slider
              label="Current Savings"
              min={0}
              max={10000000}
              step={50000}
              value={currentSavings}
              onChange={setCurrentSavings}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            <CustomInput
              label="Current Age"
              type="number"
              value={currentAge}
              onChange={e => setCurrentAge(Number(e.target.value))}
              min={18}
              max={100}
            />

            <Slider
              label="Expected Portfolio Returns"
              min={1}
              max={25}
              step={0.5}
              value={expectedReturn}
              onChange={setExpectedReturn}
              suffixSymbol="%"
            />

            <Slider
              label="Long-Term Inflation"
              min={1}
              max={20}
              step={0.5}
              value={inflationRate}
              onChange={setInflationRate}
              suffixSymbol="%"
            />

            {user ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                />
                <CustomButton onClick={handleSave} variant="secondary" size="sm" fullWidth className="gap-2">
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save FIRE Calculation'}
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

        {/* Outputs */}
        <div className="lg:col-span-2 space-y-6">
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                <span className="text-[10px] font-bold text-slate-400">TARGET FIRE CORPUS (IN 15Y)</span>
                <p className="text-lg font-black mt-1 text-slate-800 dark:text-slate-100 font-bold">
                  {formatCurrency(result.targetFireCorpus, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                <span className="text-[10px] font-bold text-slate-400">REQUIRED MONTHLY SIP</span>
                <p className="text-lg font-black mt-1 text-emerald-500">
                  {formatCurrency(result.requiredMonthlySip, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-emerald-950/10 dark:from-emerald-950/20 border border-emerald-500/10">
                <span className="text-[10px] font-bold text-emerald-500 font-bold">RETIREMENT AGE</span>
                <p className="text-lg font-black mt-1 text-emerald-400">
                  Age {currentAge + result.yearsRemaining}
                </p>
              </GlassCard>
            </div>
          )}

          {/* Explanation box */}
          <GlassCard className="bg-gradient-to-r from-emerald-950/10 to-blue-950/10 border border-emerald-500/15 p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">The 4% Rule and FIRE</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standard FIRE calculates your target corpus as <strong>25 times your annual expenses</strong>. This is based on the 4% Safe Withdrawal Rate rule: withdrawing 4% annually from your portfolio to cover expenses, adjusting for inflation, yields a high probability that your savings will last indefinitely.
            </p>
          </GlassCard>

          {/* Chart */}
          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider">Early Retirement Timeline</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="fireCurve" x1="0" y1="0" x2="0" y2="1">
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
                      name="Your Projected Balance"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#fireCurve)"
                    />
                    <Area
                      type="monotone"
                      dataKey="inflationAdjusted"
                      name="Shifting FIRE Target"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
