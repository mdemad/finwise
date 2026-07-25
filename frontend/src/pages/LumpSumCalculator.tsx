import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateLumpSum, LumpSumInputs, LumpSumResult } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exporters';
import { GlassCard, Slider, CustomButton, CustomInput } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownToLine, Printer, Save, Coins, Coins as LumpIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LumpSumCalculator: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // Inputs
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [durationYears, setDurationYears] = useState(10);
  const [inflationRate, setInflationRate] = useState(6);
  const [adjustForInflation, setAdjustForInflation] = useState(true);

  // Save Plan States
  const [planName, setPlanName] = useState('My Lump Sum Plan');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Results
  const [result, setResult] = useState<LumpSumResult | null>(null);

  useEffect(() => {
    const inputs: LumpSumInputs = {
      investmentAmount,
      expectedReturn,
      durationYears,
      inflationRate,
    };
    const res = calculateLumpSum(inputs);
    setResult(res);
  }, [investmentAmount, expectedReturn, durationYears, inflationRate]);

  const handleSave = async () => {
    if (!user) return;
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'lump_sum',
      planName,
      { investmentAmount, expectedReturn, durationYears, inflationRate },
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
      'Inflation Adjusted Value': pt.inflationAdjusted,
    }));
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_report`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Lump Sum Calculator <LumpIcon className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Calculate the compounding future value of your one-time investments.
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
            <h2 className="text-lg font-bold">Adjust Variables</h2>

            <Slider
              label="Investment Amount"
              min={5000}
              max={10000000}
              step={5000}
              value={investmentAmount}
              onChange={setInvestmentAmount}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
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
              label="Duration"
              min={1}
              max={40}
              value={durationYears}
              onChange={setDurationYears}
              suffixSymbol=" Yrs"
            />

            <div className="border-t border-slate-200/30 dark:border-slate-800/30 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Adjust for Inflation</span>
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

            {user ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                />
                <CustomButton onClick={handleSave} variant="secondary" size="sm" fullWidth className="gap-2">
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save Lump Sum Plan'}
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
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                <span className="text-[10px] font-bold text-slate-400">TOTAL INVESTED</span>
                <p className="text-xl font-black mt-1 text-slate-850 dark:text-slate-100">
                  {formatCurrency(investmentAmount, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
                <span className="text-[10px] font-bold text-slate-400">ESTIMATED RETURNS</span>
                <p className="text-xl font-black mt-1 text-emerald-500">
                  {formatCurrency(Math.max(0, result.futureValue - investmentAmount), currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-emerald-950/10 dark:from-emerald-950/20 border border-emerald-500/10">
                <span className="text-[10px] font-bold text-emerald-500">FUTURE VALUE</span>
                <p className="text-xl font-black mt-1 text-slate-850 dark:text-emerald-400">
                  {formatCurrency(result.futureValue, currency)}
                </p>
              </GlassCard>
            </div>
          )}

          {result && adjustForInflation && (
            <GlassCard className="bg-slate-100/30 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-yellow-500">Inflation Adjusted Value</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Real Purchasing Power</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  With {inflationRate}% inflation, your future wealth buys what the value below does today.
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-yellow-500">
                  {formatCurrency(result.inflationAdjustedValue, currency)}
                </p>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  Inflation Loss: {formatCurrency(Math.max(0, result.futureValue - result.inflationAdjustedValue), currency)}
                </span>
              </div>
            </GlassCard>
          )}

          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider">Compounding Curve</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="lumpCorpus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                      fill="url(#lumpCorpus)"
                    />
                    {adjustForInflation && (
                      <Area
                        type="monotone"
                        dataKey="inflationAdjusted"
                        name="Purchasing Power"
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
