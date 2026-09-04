import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateSip, SipInputs } from '../utils/calculations';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { GlassCard, Slider, CustomInput, CustomButton } from '../components/UI';
import { TrendingUp, Save, ArrowDownToLine, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToCSV, triggerPrint } from '../utils/exporters';

export const SIPCalculator: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // Inputs
  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(10000);
  const [expectedReturn, setExpectedReturn] = useState<number>(12);
  const [durationYears, setDurationYears] = useState<number>(10);
  const [annualStepUp, setAnnualStepUp] = useState<number>(0);

  // Inflation toggle
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(true);
  const [inflationRate, setInflationRate] = useState<number>(6);

  // Plan name & save state
  const [planName, setPlanName] = useState('My SIP Plan');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const inputs: SipInputs = useMemo(
    () => ({
      monthlyInvestment,
      expectedReturn,
      durationYears,
      stepUpPercent: annualStepUp,
      stepUpFrequency: 'yearly',
      inflationRate,
      adjustForInflation,
    }),
    [monthlyInvestment, expectedReturn, durationYears, annualStepUp, inflationRate, adjustForInflation]
  );

  const result = useMemo(() => {
    return calculateSip(inputs);
  }, [inputs]);

  const handleSave = async () => {
    if (!user || !result) return;
    setSavingPlan(true);
    const saved = await saveCalculation('sip', planName, inputs, result);
    setSavingPlan(false);
    if (saved) {
      setSaveSuccess('Saved successfully to your dashboard!');
      setTimeout(() => setSaveSuccess(''), 3000);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const exportData = result.chartData.map((pt) => ({
      Year: pt.label,
      'Total Invested': pt.totalInvested,
      'Future Value': pt.futureValue,
      'Purchasing Power': pt.inflationAdjusted || pt.futureValue,
    }));
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_sip_report`);
  };

  return (
    <div className="space-y-8 page-transition">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            SIP Calculator <TrendingUp className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Model your systematic investments with step-up compounding & inflation adjustments.
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

      {/* Main Grid: Inputs Left, Outputs Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Variables Card */}
        <div className="space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-6 space-y-6">
            <h2 className="text-lg font-bold">Adjust Variables</h2>

            <Slider
              label="Monthly Investment"
              min={500}
              max={1000000}
              step={500}
              value={monthlyInvestment}
              onChange={setMonthlyInvestment}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            <Slider
              label="Expected Return Rate (P.A.)"
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

            <Slider
              label="Annual Step-Up Rate"
              min={0}
              max={25}
              step={1}
              value={annualStepUp}
              onChange={setAnnualStepUp}
              suffixSymbol="%"
            />

            {/* Inflation Toggle */}
            <div className="border-t border-slate-200/30 dark:border-slate-800/30 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Adjust for Inflation</span>
                <input
                  type="checkbox"
                  checked={adjustForInflation}
                  onChange={(e) => setAdjustForInflation(e.target.checked)}
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

            {/* Save Plan Section */}
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
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save SIP Projections'}
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

        {/* Right Output & Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Metrics */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard className="text-center p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  TOTAL INVESTED
                </span>
                <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">
                  {formatCurrency(result.totalInvested, currency)}
                </p>
              </GlassCard>

              <GlassCard className="text-center p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  ESTIMATED RETURNS
                </span>
                <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(result.estimatedReturns, currency)}
                </p>
              </GlassCard>

              <GlassCard className="text-center p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  ESTIMATED CORPUS
                </span>
                <p className="text-xl font-black mt-1 text-slate-900 dark:text-emerald-400">
                  {formatCurrency(result.finalCorpus, currency)}
                </p>
              </GlassCard>
            </div>
          )}

          {/* Inflation Metrics overlay */}
          {result && adjustForInflation && (
            <GlassCard className="bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-600 dark:text-yellow-400 uppercase tracking-wider">
                  Purchasing Power Adjustment
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Real Value of Future Corpus
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Accounting for {inflationRate}% annual inflation, your target wealth will feel like the
                  amount below today.
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-amber-600 dark:text-yellow-400">
                  {formatCurrency(result.inflationAdjustedCorpus, currency)}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-1">
                  Inflation Impact: -
                  {formatCurrency(
                    Math.max(0, result.finalCorpus - result.inflationAdjustedCorpus),
                    currency
                  )}
                </span>
              </div>
            </GlassCard>
          )}

          {/* Compounding Chart Card */}
          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider">
                Wealth Growth Projections
              </h3>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="sipCorpus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="sipReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val / 1000}k`}
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
                      name="Future Value"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#sipCorpus)"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalInvested"
                      name="Invested"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={0}
                    />
                    {adjustForInflation && (
                      <Area
                        type="monotone"
                        dataKey="inflationAdjusted"
                        name="Purchasing Power"
                        stroke="#eab308"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#sipReal)"
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
