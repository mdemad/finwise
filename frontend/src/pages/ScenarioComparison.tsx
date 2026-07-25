import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { calculateSip, calculateLumpSum, calculateRetirement } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { GlassCard, Slider, CustomButton } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GitCompare, Award, TrendingUp, HelpCircle } from 'lucide-react';

export const ScenarioComparison: React.FC = () => {
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState<'sip' | 'lump' | 'retirement'>('sip');

  // SIP comparison state
  const [sipA_monthly, setSipA_monthly] = useState(10000);
  const [sipA_return, setSipA_return] = useState(12);
  const [sipB_monthly, setSipB_monthly] = useState(8000);
  const [sipB_return, setSipB_return] = useState(15);
  const [sip_years, setSip_years] = useState(15);

  // Lump Sum comparison state
  const [lumpA_amt, setLumpA_amt] = useState(100000);
  const [lumpA_return, setLumpA_return] = useState(12);
  const [lumpB_amt, setLumpB_amt] = useState(100000);
  const [lumpB_return, setLumpB_return] = useState(10);
  const [lump_years, setLump_years] = useState(10);

  // Retirement comparison state
  const [retA_age, setRetA_age] = useState(60);
  const [retA_invest, setRetA_invest] = useState(15000);
  const [retB_age, setRetB_age] = useState(55);
  const [retB_invest, setRetB_invest] = useState(25000);

  // Computed results
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'sip') {
      const resA = calculateSip({
        monthlyInvestment: sipA_monthly,
        expectedReturn: sipA_return,
        durationYears: sip_years,
        stepUpPercent: 0,
        stepUpFrequency: 'yearly',
        inflationRate: 6,
        adjustForInflation: false,
      });

      const resB = calculateSip({
        monthlyInvestment: sipB_monthly,
        expectedReturn: sipB_return,
        durationYears: sip_years,
        stepUpPercent: 0,
        stepUpFrequency: 'yearly',
        inflationRate: 6,
        adjustForInflation: false,
      });

      const winner = resA.finalCorpus >= resB.finalCorpus ? 'Plan A' : 'Plan B';
      const difference = Math.abs(resA.finalCorpus - resB.finalCorpus);

      // Merge chartData
      const chartData = resA.chartData.map((pt, i) => ({
        label: pt.label,
        valueA: pt.futureValue,
        valueB: resB.chartData[i]?.futureValue || 0,
      }));

      setComparison({
        valueA: resA.finalCorpus,
        investedA: resA.totalInvested,
        valueB: resB.finalCorpus,
        investedB: resB.totalInvested,
        winner,
        difference,
        chartData,
      });
    } else if (activeTab === 'lump') {
      const resA = calculateLumpSum({
        investmentAmount: lumpA_amt,
        expectedReturn: lumpA_return,
        durationYears: lump_years,
        inflationRate: 6,
      });

      const resB = calculateLumpSum({
        investmentAmount: lumpB_amt,
        expectedReturn: lumpB_return,
        durationYears: lump_years,
        inflationRate: 6,
      });

      const winner = resA.futureValue >= resB.futureValue ? 'Plan A' : 'Plan B';
      const difference = Math.abs(resA.futureValue - resB.futureValue);

      const chartData = resA.chartData.map((pt, i) => ({
        label: pt.label,
        valueA: pt.futureValue,
        valueB: resB.chartData[i]?.futureValue || 0,
      }));

      setComparison({
        valueA: resA.futureValue,
        investedA: lumpA_amt,
        valueB: resB.futureValue,
        investedB: lumpB_amt,
        winner,
        difference,
        chartData,
      });
    } else if (activeTab === 'retirement') {
      const resA = calculateRetirement({
        currentAge: 30,
        retirementAge: retA_age,
        currentSavings: 100000,
        monthlyInvestment: retA_invest,
        expectedReturnBeforeRetirement: 12,
        expectedReturnAfterRetirement: 8,
        inflationRate: 6,
        monthlyExpensePostRetirement: 50000,
      });

      const resB = calculateRetirement({
        currentAge: 30,
        retirementAge: retB_age,
        currentSavings: 100000,
        monthlyInvestment: retB_invest,
        expectedReturnBeforeRetirement: 12,
        expectedReturnAfterRetirement: 8,
        inflationRate: 6,
        monthlyExpensePostRetirement: 50000,
      });

      const winner = resA.retirementCorpus >= resB.retirementCorpus ? 'Plan A' : 'Plan B';
      const difference = Math.abs(resA.retirementCorpus - resB.retirementCorpus);

      // Take first 30 years of accumulation
      const len = Math.min(resA.chartData.length, resB.chartData.length);
      const chartData = [];
      for (let i = 0; i < len; i++) {
        if (resA.chartData[i].year > Math.max(retA_age, retB_age)) break;
        chartData.push({
          label: `Age ${resA.chartData[i].year}`,
          valueA: resA.chartData[i].futureValue,
          valueB: resB.chartData[i].futureValue,
        });
      }

      setComparison({
        valueA: resA.retirementCorpus,
        investedA: 100000 + (retA_age - 30) * retA_invest * 12,
        valueB: resB.retirementCorpus,
        investedB: 100000 + (retB_age - 30) * retB_invest * 12,
        winner,
        difference,
        chartData,
      });
    }
  }, [
    activeTab,
    sipA_monthly,
    sipA_return,
    sipB_monthly,
    sipB_return,
    sip_years,
    lumpA_amt,
    lumpA_return,
    lumpB_amt,
    lumpB_return,
    lump_years,
    retA_age,
    retA_invest,
    retB_age,
    retB_invest,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          Scenario Comparison <GitCompare className="w-6 h-6 text-emerald-500" />
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          Perform side-by-side modeling to compare variables and pick the optimal financial strategy.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('sip')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'sip'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Compare SIPs
        </button>
        <button
          onClick={() => setActiveTab('lump')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'lump'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Compare Lump Sums
        </button>
        <button
          onClick={() => setActiveTab('retirement')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'retirement'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Compare Retirements
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scenario Editor Forms A & B */}
        <div className="lg:col-span-1 space-y-6">
          {/* Plan A Form */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-200/30 dark:border-slate-800/30 pb-3">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              <h2 className="text-sm font-bold uppercase tracking-wider">Plan A Variable</h2>
            </div>

            {activeTab === 'sip' && (
              <>
                <Slider
                  label="Monthly SIP Amount"
                  min={1000}
                  max={500000}
                  step={1000}
                  value={sipA_monthly}
                  onChange={setSipA_monthly}
                  prefixSymbol={currency === 'INR' ? '₹' : '$'}
                />
                <Slider
                  label="Expected Return Rate"
                  min={1}
                  max={30}
                  step={0.5}
                  value={sipA_return}
                  onChange={setSipA_return}
                  suffixSymbol="%"
                />
              </>
            )}

            {activeTab === 'lump' && (
              <>
                <Slider
                  label="Lump Sum Amount"
                  min={5000}
                  max={5000000}
                  step={5000}
                  value={lumpA_amt}
                  onChange={setLumpA_amt}
                  prefixSymbol={currency === 'INR' ? '₹' : '$'}
                />
                <Slider
                  label="Expected Return Rate"
                  min={1}
                  max={30}
                  step={0.5}
                  value={lumpA_return}
                  onChange={setLumpA_return}
                  suffixSymbol="%"
                />
              </>
            )}

            {activeTab === 'retirement' && (
              <>
                <Slider
                  label="Retirement Age Target"
                  min={40}
                  max={75}
                  value={retA_age}
                  onChange={setRetA_age}
                  suffixSymbol=" Yrs"
                />
                <Slider
                  label="Monthly Contribution"
                  min={1000}
                  max={200000}
                  step={1000}
                  value={retA_invest}
                  onChange={setRetA_invest}
                  prefixSymbol={currency === 'INR' ? '₹' : '$'}
                />
              </>
            )}
          </GlassCard>

          {/* Plan B Form */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-200/30 dark:border-slate-800/30 pb-3">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
              <h2 className="text-sm font-bold uppercase tracking-wider">Plan B Variable</h2>
            </div>

            {activeTab === 'sip' && (
              <>
                <Slider
                  label="Monthly SIP Amount"
                  min={1000}
                  max={500000}
                  step={1000}
                  value={sipB_monthly}
                  onChange={setSipB_monthly}
                  prefixSymbol={currency === 'INR' ? '₹' : '$'}
                />
                <Slider
                  label="Expected Return Rate"
                  min={1}
                  max={30}
                  step={0.5}
                  value={sipB_return}
                  onChange={setSipB_return}
                  suffixSymbol="%"
                />
              </>
            )}

            {activeTab === 'lump' && (
              <>
                <Slider
                  label="Lump Sum Amount"
                  min={5000}
                  max={5000000}
                  step={5000}
                  value={lumpB_amt}
                  onChange={setLumpB_amt}
                  prefixSymbol={currency === 'INR' ? '₹' : '$'}
                />
                <Slider
                  label="Expected Return Rate"
                  min={1}
                  max={30}
                  step={0.5}
                  value={lumpB_return}
                  onChange={setLumpB_return}
                  suffixSymbol="%"
                />
              </>
            )}

            {activeTab === 'retirement' && (
              <>
                <Slider
                  label="Retirement Age Target"
                  min={40}
                  max={75}
                  value={retB_age}
                  onChange={setRetB_age}
                  suffixSymbol=" Yrs"
                />
                <Slider
                  label="Monthly Contribution"
                  min={1000}
                  max={200000}
                  step={1000}
                  value={retB_invest}
                  onChange={setRetB_invest}
                  prefixSymbol={currency === 'INR' ? '₹' : '$'}
                />
              </>
            )}
          </GlassCard>

          {/* Shared Tenure parameters */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-4">
            {activeTab === 'sip' && (
              <Slider
                label="Simulation Tenure"
                min={1}
                max={40}
                value={sip_years}
                onChange={setSip_years}
                suffixSymbol=" Yrs"
              />
            )}
            {activeTab === 'lump' && (
              <Slider
                label="Simulation Tenure"
                min={1}
                max={40}
                value={lump_years}
                onChange={setLump_years}
                suffixSymbol=" Yrs"
              />
            )}
            {activeTab === 'retirement' && (
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                💡 Standardized retirement projections starting from Age 30 with current balance {formatCurrency(100000, currency)}.
              </p>
            )}
          </GlassCard>
        </div>

        {/* Comparison Outputs & Winner Banner */}
        <div className="lg:col-span-2 space-y-6">
          {comparison && (
            <>
              {/* Winner highlights */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-500 animate-fadeIn">
                <Award className="w-10 h-10 flex-shrink-0 animate-bounce" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Winner Highlight: {comparison.winner}
                  </h3>
                  <p className="text-xs font-semibold text-slate-650 dark:text-emerald-400 mt-0.5">
                    {comparison.winner} generates an additional{' '}
                    <strong>{formatCurrency(comparison.difference, currency)}</strong> of final wealth over the other plan!
                  </p>
                </div>
              </div>

              {/* Comparison Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <GlassCard className="p-5 border border-slate-200/50 dark:border-slate-800/40 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block mb-2">PLAN A SUMMARY</span>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Total Cost:</span>
                    <p className="text-xs font-bold">{formatCurrency(comparison.investedA, currency)}</p>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">Final Corpus:</span>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                      {formatCurrency(comparison.valueA, currency)}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 border border-slate-200/50 dark:border-slate-800/40 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block mb-2">PLAN B SUMMARY</span>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Total Cost:</span>
                    <p className="text-xs font-bold">{formatCurrency(comparison.investedB, currency)}</p>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">Final Corpus:</span>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                      {formatCurrency(comparison.valueB, currency)}
                    </p>
                  </div>
                </GlassCard>
              </div>

              {/* Charts Overlay comparison */}
              <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
                <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-500" /> Comparison Growth Curves
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={comparison.chartData}>
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
                        dataKey="valueA"
                        name="Plan A Future Value"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="transparent"
                      />
                      <Area
                        type="monotone"
                        dataKey="valueB"
                        name="Plan B Future Value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="transparent"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
