import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateSip, SipInputs, SipResult } from '../utils/calculations';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exporters';
import { GlassCard, Slider, CustomButton, CustomInput } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownToLine, Printer, Save, Sparkles, TrendingUp, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SIPCalculator: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // 1. SIP State Inputs
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [durationYears, setDurationYears] = useState(10);
  const [stepUpPercent, setStepUpPercent] = useState(10);
  const [stepUpFrequency, setStepUpFrequency] = useState<'monthly' | 'quarterly' | 'half-yearly' | 'yearly'>('yearly');
  const [inflationRate, setInflationRate] = useState(6);
  const [adjustForInflation, setAdjustForInflation] = useState(true);

  // Saved Plan State Name
  const [planName, setPlanName] = useState('My SIP Plan');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Synchronous, memoized calculation results (prevents extra re-renders on every input change)
  const result: SipResult = React.useMemo(() => {
    const inputs: SipInputs = {
      monthlyInvestment,
      expectedReturn,
      durationYears,
      stepUpPercent,
      stepUpFrequency,
      inflationRate,
      adjustForInflation,
    };
    return calculateSip(inputs);
  }, [monthlyInvestment, expectedReturn, durationYears, stepUpPercent, stepUpFrequency, inflationRate, adjustForInflation]);

  const handleSave = async () => {
    if (!user) {
      alert('Please log in or sign up to save calculations!');
      return;
    }
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'sip',
      planName,
      { monthlyInvestment, expectedReturn, durationYears, stepUpPercent, stepUpFrequency, inflationRate },
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
      Year: pt.year,
      'Total Invested': pt.totalInvested,
      'Future Value': pt.futureValue,
      'Inflation Adjusted Corpus': pt.inflationAdjusted,
    }));
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_report`);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            SIP Calculator <TrendingUp className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Plan your Systematic Investment Plan with step-up capability and inflation models.
          </p>
        </div>

        {/* Toolbar */}
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
        {/* Left Input Section */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-6">
            <h2 className="text-lg font-bold">Adjust Variables</h2>

            <Slider
              label="Monthly Investment"
              min={1000}
              max={1000000}
              step={1000}
              value={monthlyInvestment}
              onChange={setMonthlyInvestment}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            <Slider
              label="Expected Return Rate (p.a.)"
              min={1}
              max={30}
              step={0.5}
              value={expectedReturn}
              onChange={setExpectedReturn}
              suffixSymbol="%"
            />

            <Slider
              label="Investment Duration"
              min={1}
              max={40}
              value={durationYears}
              onChange={setDurationYears}
              suffixSymbol=" Yrs"
            />

            <div className="border-t border-slate-200/30 dark:border-slate-800/30 pt-5 space-y-5">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider">ANNUAL STEP-UP (OPTIONAL)</h3>
              
              <Slider
                label="Step-Up Percentage"
                min={0}
                max={50}
                value={stepUpPercent}
                onChange={setStepUpPercent}
                suffixSymbol="%"
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Step-Up Frequency</label>
                <select
                  value={stepUpFrequency}
                  onChange={e => setStepUpFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 text-sm font-medium focus:outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half-yearly">Half-Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200/30 dark:border-slate-800/30 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">Adjust for Inflation</span>
                  <span title="Calculates purchasing power of future corpus based on average inflation rate">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={adjustForInflation}
                  onChange={e => setAdjustForInflation(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {adjustForInflation && (
                <Slider
                  label="Inflation Rate"
                  min={1}
                  max={20}
                  step={0.5}
                  value={inflationRate}
                  onChange={setInflationRate}
                  suffixSymbol="%"
                />
              )}
            </div>

            {/* Save Calculation Block */}
            {user ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                />
                <CustomButton onClick={handleSave} variant="secondary" size="sm" fullWidth className="gap-2">
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save SIP Projections'}
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

        {/* Right Output & Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Metrics */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                <span className="text-[10px] font-bold text-slate-400">TOTAL INVESTED</span>
                <p className="text-xl font-black mt-1 text-slate-800 dark:text-slate-100">
                  {formatCurrency(result.totalInvested, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                <span className="text-[10px] font-bold text-slate-400">ESTIMATED RETURNS</span>
                <p className="text-xl font-black mt-1 text-emerald-500">
                  {formatCurrency(result.estimatedReturns, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-emerald-950/10 dark:from-emerald-950/20 border border-emerald-500/10">
                <span className="text-[10px] font-bold text-emerald-500">ESTIMATED CORPUS</span>
                <p className="text-xl font-black mt-1 text-slate-850 dark:text-emerald-400">
                  {formatCurrency(result.finalCorpus, currency)}
                </p>
              </GlassCard>
            </div>
          )}

          {/* Inflation Metrics overlay */}
          {result && adjustForInflation && (
            <GlassCard className="bg-slate-100/30 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-yellow-500 uppercase">Purchasing Power Adjustment</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Real Inflation-Adjusted Wealth
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Adjusting for {inflationRate}% annual inflation, your final corpus will have the equivalent purchasing power of the corpus below.
                </p>
              </div>
              <div className="text-right sm:text-right">
                <p className="text-2xl font-black text-yellow-500">
                  {formatCurrency(result.inflationAdjustedCorpus, currency)}
                </p>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  Inflation Value Gap: {formatCurrency(result.realWealthLoss, currency)}
                </span>
              </div>
            </GlassCard>
          )}

          {/* Chart Display */}
          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider">SIP Growth Trajectory</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="sipCorpus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="sipInvest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={value => `${value / 1000}k`}
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
                      name="Projected Value"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#sipCorpus)"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalInvested"
                      name="Invested Amount"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#sipInvest)"
                    />
                    {adjustForInflation && (
                      <Area
                        type="monotone"
                        dataKey="inflationAdjusted"
                        name="Real Wealth (Infl. Adjusted)"
                        stroke="#eab308"
                        strokeWidth={1.5}
                        fill="transparent"
                      />
                    )}
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
