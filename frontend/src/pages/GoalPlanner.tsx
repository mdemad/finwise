import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateGoal, GoalInputs, GoalResult } from '../utils/calculations';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exporters';
import { GlassCard, Slider, CustomButton, CustomInput } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownToLine, Printer, Save, Goal } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GoalPlanner: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // State Inputs
  const [goalName, setGoalName] = useState('Dream Home');
  const [currentCost, setCurrentCost] = useState(5000000);
  const [yearsRemaining, setYearsRemaining] = useState(10);
  const [inflationRate, setInflationRate] = useState(6);
  const [expectedReturn, setExpectedReturn] = useState(12);

  // Saved States
  const [planName, setPlanName] = useState('My Goal Projections');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Synchronous memoized calculation result
  const result: GoalResult = React.useMemo(() => {
    const inputs: GoalInputs = {
      goalName,
      currentCost,
      yearsRemaining,
      inflationRate,
      expectedReturn,
    };
    return calculateGoal(inputs);
  }, [goalName, currentCost, yearsRemaining, inflationRate, expectedReturn]);

  const handleSave = async () => {
    if (!user) return;
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'goal',
      planName,
      { goalName, currentCost, yearsRemaining, inflationRate, expectedReturn },
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
      'Accumulated Wealth': pt.futureValue,
      'Target Goal Cost': pt.inflationAdjusted,
    }));
    exportToCSV(exportData, `${goalName.replace(/\s+/g, '_')}_goal_report`);
  };

  // Mock savings percentage (for the progress circle)
  // Let's assume user starts with 10% progress or we show a standard 100% target progress representation
  const targetMetPercent = 100; // Since this calculator computes the "Required SIP" to hit 100% of the target, progress to start is represented as 100% met under planning

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Goal Planner <Goal className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Determine how much to invest monthly to buy your dream house, car, or plan vacations.
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
        {/* Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-6">
            <h2 className="text-lg font-bold">Goal Details</h2>

            <CustomInput
              label="Goal Name"
              type="text"
              value={goalName}
              onChange={e => setGoalName(e.target.value)}
            />

            <Slider
              label="Current Cost of Goal"
              min={10000}
              max={100000000}
              step={10000}
              value={currentCost}
              onChange={setCurrentCost}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            <Slider
              label="Time Horizon"
              min={1}
              max={35}
              value={yearsRemaining}
              onChange={setYearsRemaining}
              suffixSymbol=" Yrs"
            />

            <Slider
              label="Expected Rate of Return"
              min={1}
              max={25}
              step={0.5}
              value={expectedReturn}
              onChange={setExpectedReturn}
              suffixSymbol="%"
            />

            <Slider
              label="Expected Inflation Rate"
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
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save Goal Plan'}
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
                <span className="text-[10px] font-bold text-slate-400">TODAY'S COST</span>
                <p className="text-lg font-black mt-1 text-slate-800 dark:text-slate-200">
                  {formatCurrency(currentCost, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-yellow-500/5 dark:from-yellow-950/15 border border-yellow-500/10">
                <span className="text-[10px] font-bold text-yellow-500">FUTURE COST</span>
                <p className="text-lg font-black mt-1 text-yellow-500">
                  {formatCurrency(result.futureGoalCost, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-5 bg-gradient-to-b from-emerald-950/10 dark:from-emerald-950/20 border border-emerald-500/10">
                <span className="text-[10px] font-bold text-emerald-500">REQUIRED MONTHLY SIP</span>
                <p className="text-lg font-black mt-1 text-emerald-400">
                  {formatCurrency(result.requiredMonthlySip, currency)}
                </p>
              </GlassCard>
            </div>
          )}

          {/* Progress Circular visual card */}
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="flex flex-col items-center justify-center p-6 border border-slate-200/50 dark:border-slate-800/40 text-center">
                <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">Funding Target Analysis</h3>
                
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* SVG Circle representing completion rate */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(226, 232, 240, 0.2)" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="8" fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - targetMetPercent / 100)}`}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">100%</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Plan Feasible</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed max-w-[200px]">
                  Setting up a monthly SIP of <strong>{formatCurrency(result.requiredMonthlySip, currency)}</strong> will cover the full projected future cost of <strong>{formatCurrency(result.futureGoalCost, currency)}</strong> in {yearsRemaining} years.
                </p>
              </GlassCard>

              {/* Tips or detailed projection numbers */}
              <GlassCard className="p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase">Goal Timeline Planning</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-semibold text-slate-500">Goal Term</span>
                      <span className="text-xs font-bold">{yearsRemaining} Years ({yearsRemaining * 12} Months)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-semibold text-slate-500">Compounding Rate</span>
                      <span className="text-xs font-bold text-emerald-500">{expectedReturn}% p.a.</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-semibold text-slate-500">Inflation Rate</span>
                      <span className="text-xs font-bold text-yellow-500">{inflationRate}% p.a.</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl mt-4">
                  <p className="text-[10px] leading-relaxed text-blue-400 font-semibold">
                    💡 Starting 1 year earlier reduces the required monthly SIP by up to 12% due to compounding!
                  </p>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Timeline Chart */}
          {result && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider">SIP vs Inflation-Shifted Goal</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="goalCorpus" x1="0" y1="0" x2="0" y2="1">
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
                      name="Accumulating Wealth"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#goalCorpus)"
                    />
                    <Area
                      type="monotone"
                      dataKey="inflationAdjusted"
                      name="Goal Cost Trajectory"
                      stroke="#eab308"
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
