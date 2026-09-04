import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateInflation, InflationInputs } from '../utils/calculations';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { GlassCard, Slider, CustomInput, CustomButton } from '../components/UI';
import { Percent, Save, ArrowDownToLine, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToCSV, triggerPrint } from '../utils/exporters';

export const InflationCalculator: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  const [currentCost, setCurrentCost] = useState<number>(100000);
  const [inflationRate, setInflationRate] = useState<number>(6);
  const [durationYears, setDurationYears] = useState<number>(10);

  const [planName, setPlanName] = useState('Inflation Plan');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const inputs: InflationInputs = useMemo(
    () => ({
      currentCost,
      inflationRate,
      years: durationYears,
    }),
    [currentCost, inflationRate, durationYears]
  );

  const result = useMemo(() => {
    return calculateInflation(inputs);
  }, [inputs]);

  const handleSave = async () => {
    if (!user || !result) return;
    setSavingPlan(true);
    const saved = await saveCalculation('inflation', planName, inputs, result);
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
      'Future Cost': pt.futureValue,
      'Purchasing Power': pt.totalInvested,
    }));
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_inflation_report`);
  };

  return (
    <div className="space-y-8 page-transition">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Inflation Calculator <Percent className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Calculate the future cost of goods and find out how much value your cash loses over time.
          </p>
        </div>

        {/* Export Options */}
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
              label="Current Cost of Goods"
              min={1000}
              max={5000000}
              step={1000}
              value={currentCost}
              onChange={setCurrentCost}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            <Slider
              label="Inflation Rate (P.A.)"
              min={1}
              max={25}
              step={0.5}
              value={inflationRate}
              onChange={setInflationRate}
              suffixSymbol="%"
            />

            <Slider
              label="Duration"
              min={1}
              max={45}
              value={durationYears}
              onChange={setDurationYears}
              suffixSymbol=" Yrs"
            />

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
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save Inflation Plan'}
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

        {/* Outputs */}
        <div className="lg:col-span-2 space-y-6">
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard className="text-center p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  CURRENT COST
                </span>
                <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">
                  {formatCurrency(currentCost, currency)}
                </p>
              </GlassCard>

              <GlassCard className="text-center p-5 bg-red-50/50 dark:bg-red-950/20 border border-red-500/20">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  LOSS OF POWER
                </span>
                <p className="text-xl font-black mt-1 text-red-600 dark:text-red-400">
                  {formatCurrency(result.purchasingPowerLoss, currency)}
                </p>
              </GlassCard>

              <GlassCard className="text-center p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  FUTURE COST
                </span>
                <p className="text-xl font-black mt-1 text-slate-900 dark:text-emerald-400">
                  {formatCurrency(result.futureCost, currency)}
                </p>
              </GlassCard>
            </div>
          )}

          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider">
                Inflation Loss of Value
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="inflFuture" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="inflPower" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
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
                      dataKey="futureCost"
                      name="Future Cost of Goods"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#inflFuture)"
                    />
                    <Area
                      type="monotone"
                      dataKey="purchasingPower"
                      name="Purchasing Power"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#inflPower)"
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
