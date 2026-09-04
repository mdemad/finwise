import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { calculateSip, calculateLumpSum, calculateRetirement, calculateGoal } from '../utils/calculations';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { GlassCard, Slider } from '../components/UI';
import { Compass, HelpCircle } from 'lucide-react';

export const WhatIfSimulator: React.FC = () => {
  const { currency } = useCurrency();

  // Global Simulator Sliders
  const [globalInflation, setGlobalInflation] = useState(6);
  const [globalReturn, setGlobalReturn] = useState(12);
  const [globalMonthly, setGlobalMonthly] = useState(10000);
  const [globalYears, setGlobalYears] = useState(15);

  // Synchronously compute all 4 models in a single memoized calculation pass
  const { sipOut, lumpOut, retOut, goalOut } = React.useMemo(() => {
    // 1. SIP Projections
    const sip = calculateSip({
      monthlyInvestment: globalMonthly,
      expectedReturn: globalReturn,
      durationYears: globalYears,
      stepUpPercent: 0,
      stepUpFrequency: 'yearly',
      inflationRate: globalInflation,
      adjustForInflation: true,
    });

    // 2. Lump Sum Projections
    const lump = calculateLumpSum({
      investmentAmount: globalMonthly * 10,
      expectedReturn: globalReturn,
      durationYears: globalYears,
      inflationRate: globalInflation,
    });

    // 3. Retirement Projections
    const ret = calculateRetirement({
      currentAge: 30,
      retirementAge: 30 + globalYears,
      currentSavings: 100000,
      monthlyInvestment: globalMonthly,
      expectedReturnBeforeRetirement: globalReturn,
      expectedReturnAfterRetirement: Math.max(1, globalReturn - 3),
      inflationRate: globalInflation,
      monthlyExpensePostRetirement: globalMonthly * 3,
    });

    // 4. Goal Projections
    const goal = calculateGoal({
      goalName: 'Global Simulation Goal',
      currentCost: globalMonthly * 100,
      yearsRemaining: globalYears,
      inflationRate: globalInflation,
      expectedReturn: globalReturn,
    });

    return { sipOut: sip, lumpOut: lump, retOut: ret, goalOut: goal };
  }, [globalInflation, globalReturn, globalMonthly, globalYears]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          What-If Simulator <Compass className="w-6 h-6 text-emerald-500 animate-spin" style={{ animationDuration: '20s' }} />
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          Tweak global sliders to immediately simulate and observe changes across all calculator models at once.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Global Controls */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-6">
            <h2 className="text-lg font-bold">Global Variables</h2>

            <Slider
              label="Global Monthly Saving"
              min={1000}
              max={200000}
              step={1000}
              value={globalMonthly}
              onChange={setGlobalMonthly}
              prefixSymbol={getCurrencySymbol(currency)}
            />

            <Slider
              label="Expected Annual Return"
              min={1}
              max={25}
              step={0.5}
              value={globalReturn}
              onChange={setGlobalReturn}
              suffixSymbol="%"
            />

            <Slider
              label="Simulation Years"
              min={1}
              max={35}
              value={globalYears}
              onChange={setGlobalYears}
              suffixSymbol=" Yrs"
            />

            <Slider
              label="Annual Inflation"
              min={1}
              max={20}
              step={0.5}
              value={globalInflation}
              onChange={setGlobalInflation}
              suffixSymbol="%"
            />
          </GlassCard>

          <GlassCard className="p-4 bg-slate-100/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/40">
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
              <HelpCircle className="w-4 h-4 text-emerald-500" /> Compounding Power
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Tweak Return or Years to notice how compounding gains scale exponentially in the long term. A small 2% increase in rate of return can yield up to 30% more final corpus over 15 years.
            </p>
          </GlassCard>
        </div>

        {/* Sync Outputs Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* SIP Projections Card */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <h3 className="font-bold text-sm">SIP Projections</h3>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Active</span>
            </div>
            {sipOut && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Invested:</span>
                  <span>{formatCurrency(sipOut.totalInvested, currency)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Future Value:</span>
                  <span className="text-emerald-500">{formatCurrency(sipOut.finalCorpus, currency)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold border-t border-dashed border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-slate-500">Purchasing Power:</span>
                  <span className="text-yellow-500">{formatCurrency(sipOut.inflationAdjustedCorpus, currency)}</span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Lump Sum Projections Card */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <h3 className="font-bold text-sm">Lump Sum Projections</h3>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Active</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold italic">Based on one-time investment of {formatCurrency(globalMonthly * 10, currency)}</p>
            {lumpOut && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Future Value:</span>
                  <span className="text-emerald-500">{formatCurrency(lumpOut.futureValue, currency)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Inflation Adjusted:</span>
                  <span className="text-yellow-500">{formatCurrency(lumpOut.inflationAdjustedValue, currency)}</span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Retirement Projections Card */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <h3 className="font-bold text-sm">Retirement Projections</h3>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Active</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold italic">Retiring at age {30 + globalYears}</p>
            {retOut && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Retirement Corpus:</span>
                  <span className="text-emerald-500">{formatCurrency(retOut.retirementCorpus, currency)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold border-t border-dashed border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-slate-500">Sustainability:</span>
                  <span className={retOut.isSustainable ? 'text-emerald-500' : 'text-red-500'}>
                    {retOut.yearsSustained >= 50 ? '50+ Years' : `${retOut.yearsSustained} Years`}
                  </span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Goal Projections Card */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <h3 className="font-bold text-sm">Goal Planner (SIP Target)</h3>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Active</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold italic">Target Goal Cost: {formatCurrency(globalMonthly * 100, currency)}</p>
            {goalOut && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Future Goal Cost:</span>
                  <span className="text-yellow-500">{formatCurrency(goalOut.futureGoalCost, currency)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold border-t border-dashed border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-slate-500">Required Monthly SIP:</span>
                  <span className="text-emerald-500">{formatCurrency(goalOut.requiredMonthlySip, currency)}</span>
                </div>
              </div>
            )}
          </GlassCard>

        </div>
      </div>
    </div>
  );
};
