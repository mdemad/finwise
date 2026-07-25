import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useCalculations, SavedCalculation } from '../hooks/useCalculations';
import { formatCurrency, formatPercent, currencies } from '../utils/formatters';
import { GlassCard, CustomButton } from '../components/UI';
import {
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Calculator,
  Bookmark,
  Coins,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { calculations } = useCalculations();

  // Dashboard Aggregates
  const [netWorth, setNetWorth] = useState(0);
  const [monthlyInvest, setMonthlyInvest] = useState(0);
  const [futureWealth, setFutureWealth] = useState(0);
  const [inflationCorpus, setInflationCorpus] = useState(0);

  // Financial Tips
  const tips = [
    "Compounding is the eighth wonder of the world. He who understands it, earns it; he who doesn't, pays it.",
    "Do not save what is left after spending, but spend what is left after saving. – Warren Buffett",
    "Rule No. 1: Never lose money. Rule No. 2: Never forget rule No. 1. – Warren Buffett",
    "An investment in knowledge pays the best interest. – Benjamin Franklin",
    "The emergency fund is the shield. The investment portfolio is the sword. You need both to win.",
    "Inflation is the silent thief. Keep your purchasing power by investing in inflation-beating assets."
  ];
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Compute stats based on saved calculations
  useEffect(() => {
    let computedNetWorth = 0;
    let computedMonthly = 0;
    let computedFuture = 0;
    let computedInflation = 0;

    if (calculations.length > 0) {
      // Net Worth check
      const netWorthCalc = calculations.find(c => c.calculatorType === 'net_worth');
      if (netWorthCalc && netWorthCalc.outputs?.netWorth) {
        computedNetWorth = netWorthCalc.outputs.netWorth;
      }

      // monthly invest check (SIP + Goal SIP + retirement monthly + FIRE SIP)
      let sipSum = 0;
      calculations.forEach((calc: SavedCalculation) => {
        if (calc.calculatorType === 'sip' && calc.inputs?.monthlyInvestment) {
          sipSum += calc.inputs.monthlyInvestment;
        } else if (calc.calculatorType === 'goal' && calc.outputs?.requiredMonthlySip) {
          sipSum += calc.outputs.requiredMonthlySip;
        } else if (calc.calculatorType === 'retirement' && calc.inputs?.monthlyInvestment) {
          sipSum += calc.inputs.monthlyInvestment;
        } else if (calc.calculatorType === 'fire' && calc.outputs?.requiredMonthlySip) {
          sipSum += calc.outputs.requiredMonthlySip;
        }
      });
      if (sipSum > 0) computedMonthly = sipSum;

      // Future values check
      let fvSum = 0;
      let infSum = 0;
      calculations.forEach((calc: SavedCalculation) => {
        if (calc.outputs?.finalCorpus) {
          fvSum += calc.outputs.finalCorpus;
          infSum += calc.outputs.inflationAdjustedCorpus || calc.outputs.finalCorpus;
        } else if (calc.outputs?.futureValue) {
          fvSum += calc.outputs.futureValue;
          infSum += calc.outputs.inflationAdjustedValue || calc.outputs.futureValue;
        } else if (calc.outputs?.futureGoalCost) {
          fvSum += calc.outputs.futureGoalCost;
          infSum += calc.outputs.futureGoalCost;
        } else if (calc.outputs?.retirementCorpus) {
          fvSum += calc.outputs.retirementCorpus;
          infSum += calc.outputs.retirementCorpus;
        }
      });
      if (fvSum > 0) {
        computedFuture = fvSum;
        computedInflation = infSum;
      }
    }

    setNetWorth(computedNetWorth);
    setMonthlyInvest(computedMonthly);
    setFutureWealth(computedFuture);
    setInflationCorpus(computedInflation);
  }, [calculations]);

  // General Dashboard growth chart (mock data or compilation of SIP growth)
  const dashboardChartData = (() => {
    const sipCalc = calculations.find(c => c.calculatorType === 'sip');
    if (sipCalc && sipCalc.outputs?.chartData) {
      return sipCalc.outputs.chartData;
    }
    return [];
  })();

  const quickActions = [
    { name: 'SIP Calculator', path: '/sip', desc: 'Calculate regular systematic wealth' },
    { name: 'Retirement Planner', path: '/retirement', desc: 'Estimate retirement corpus needs' },
    { name: 'Goal Planner', path: '/goal', desc: 'Calculate savings for custom life goals' },
    { name: 'Scenario Compare', path: '/scenario', desc: 'Compare multi-asset strategies' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Welcome back, {user?.name || 'Guest'} <Sparkles className="w-5 h-5 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            FinWise Overview. Check your financial trajectory, calculators, and plans.
          </p>
        </div>
        {!user && (
          <div className="flex gap-2">
            <Link to="/login">
              <CustomButton variant="ghost">Log In</CustomButton>
            </Link>
            <Link to="/signup">
              <CustomButton variant="primary">Register Account</CustomButton>
            </Link>
          </div>
        )}
      </div>

      {/* Aggregate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard hoverable className="border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400">CURRENT NET WORTH</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-2 text-slate-800 dark:text-slate-100">
            {formatCurrency(netWorth, currency)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
            Aggregated Assets - Liabilities
          </span>
        </GlassCard>

        <GlassCard hoverable className="border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400">MONTHLY INVESTMENT</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-2 text-slate-800 dark:text-slate-100">
            {formatCurrency(monthlyInvest, currency)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
            SIP + Goals + Retirement
          </span>
        </GlassCard>

        <GlassCard hoverable className="border-l-4 border-l-purple-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400">PROJECTED FUTURE WEALTH</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-2 text-slate-800 dark:text-slate-100">
            {formatCurrency(futureWealth, currency)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
            Target sum based on plans
          </span>
        </GlassCard>

        <GlassCard hoverable className="border-l-4 border-l-yellow-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400">INFLATION ADJUSTED</span>
            <Percent className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-black tracking-tight mt-2 text-slate-800 dark:text-slate-100">
            {formatCurrency(inflationCorpus, currency)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
            Real purchasing power future value
          </span>
        </GlassCard>
      </div>

      {/* Main Grid: Graph + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graph Card */}
        <GlassCard className="lg:col-span-2 border border-slate-200/50 dark:border-slate-800/40">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold">Wealth Accumulation Model</h2>
              <p className="text-xs text-slate-400 mt-0.5">Based on active SIP projection model</p>
            </div>
          </div>
          <div className="h-[280px]">
            {calculations.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardChartData}>
                  <defs>
                    <linearGradient id="colorFv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
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
                    name="Future Value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFv)"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalInvested"
                    name="Invested"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorInvest)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center p-6">
                <TrendingUp className="w-12 h-12 text-slate-400 dark:text-slate-650 mb-3 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">Compounding Projections</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
                  No saved plans found. Save your first projection in any calculator to visualize your wealth compounding curve here.
                </p>
                <Link to="/sip">
                  <CustomButton variant="primary" size="sm">
                    Open SIP Calculator
                  </CustomButton>
                </Link>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Sidebar Actions & Tip */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-slate-400" /> Quick Planners
            </h2>
            <div className="flex flex-col gap-3">
              {quickActions.map((act, i) => (
                <Link
                  key={i}
                  to={act.path}
                  className="p-3 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 rounded-xl hover:border-emerald-500/35 hover:scale-[1.01] transition-all flex justify-between items-center group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold">{act.name}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{act.desc}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </Link>
              ))}
            </div>
          </GlassCard>

          {/* Daily Finance Tip */}
          <GlassCard className="flex-1 bg-gradient-to-br from-emerald-950/20 to-blue-950/20 border border-emerald-500/10 p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 uppercase tracking-wider inline-block">
                Daily Finance Insight
              </span>
              <p className="text-sm font-semibold italic text-slate-700 dark:text-slate-300 leading-relaxed">
                "{tips[tipIndex]}"
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-4">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" /> Security First: Data stored locally.
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Calculator Section Header */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Bookmark className="w-4.5 h-4.5 text-slate-400" /> Recent Projections
        </h2>
        {calculations.length === 0 ? (
          <div className="text-center py-8 bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 font-medium text-sm">
            You haven't saved any calculations yet. Try creating a project in any calculator and save it.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {calculations.slice(0, 3).map(calc => (
              <GlassCard key={calc.id} hoverable className="border border-slate-200/50 dark:border-slate-800/40">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md capitalize">
                    {calc.calculatorType}
                  </span>
                  <Link to={`/${calc.calculatorType}`} className="text-xs text-emerald-500 font-bold flex items-center gap-0.5 hover:underline">
                    Open <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <h3 className="font-bold text-sm mt-3 truncate">{calc.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Created {new Date(calc.createdAt).toLocaleDateString()}
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
