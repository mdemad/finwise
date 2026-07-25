import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateEmi, EmiInputs, EmiResult } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exporters';
import { GlassCard, Slider, CustomButton, CustomInput } from '../components/UI';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ArrowDownToLine, Printer, Save, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EMICalculator: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // Inputs
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [durationYears, setDurationYears] = useState(5);

  // Saved States
  const [planName, setPlanName] = useState('My Loan EMI');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Results
  const [result, setResult] = useState<EmiResult | null>(null);

  useEffect(() => {
    const inputs: EmiInputs = { loanAmount, interestRate, durationYears };
    const res = calculateEmi(inputs);
    setResult(res);
  }, [loanAmount, interestRate, durationYears]);

  const handleSave = async () => {
    if (!user) return;
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'emi',
      planName,
      { loanAmount, interestRate, durationYears },
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
    const exportData = result.amortizationTable.map(row => ({
      Month: row.month,
      'EMI Payment': row.emi,
      'Principal Paid': row.principalPaid,
      'Interest Paid': row.interestPaid,
      'Remaining Balance': row.remainingBalance,
    }));
    exportToCSV(exportData, `${planName.replace(/\s+/g, '_')}_amortization_table`);
  };

  // Pie chart data
  const pieData = result
    ? [
        { name: 'Principal Loan Amount', value: result.totalPrincipal, color: '#3b82f6' }, // blue
        { name: 'Total Interest Payable', value: result.totalInterest, color: '#f43f5e' }, // rose
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            EMI Calculator <Calculator className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Determine your Equated Monthly Installment payouts and visualize the total interest split.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomButton variant="ghost" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs font-semibold">
            <ArrowDownToLine className="w-4 h-4" /> CSV Schedule
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
            <h2 className="text-lg font-bold">Loan Details</h2>

            <Slider
              label="Loan Amount"
              min={10000}
              max={100000000}
              step={10000}
              value={loanAmount}
              onChange={setLoanAmount}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <Slider
              label="Interest Rate (p.a.)"
              min={1}
              max={20}
              step={0.1}
              value={interestRate}
              onChange={setInterestRate}
              suffixSymbol="%"
            />

            <Slider
              label="Loan Tenure"
              min={1}
              max={30}
              value={durationYears}
              onChange={setDurationYears}
              suffixSymbol=" Yrs"
            />

            {user ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                />
                <CustomButton onClick={handleSave} variant="secondary" size="sm" fullWidth className="gap-2">
                  <Save className="w-4 h-4" /> {savingPlan ? 'Saving...' : 'Save EMI Plan'}
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

        {/* Right Outputs & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <GlassCard className="text-center p-4 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400">MONTHLY EMI</span>
                <p className="text-lg font-black mt-1 text-emerald-500">
                  {formatCurrency(result.monthlyEmi, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-4 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400">PRINCIPAL PAID</span>
                <p className="text-lg font-black mt-1 text-slate-800 dark:text-slate-100 font-bold">
                  {formatCurrency(result.totalPrincipal, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-4 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400">INTEREST PAYABLE</span>
                <p className="text-lg font-black mt-1 text-red-500 font-bold">
                  {formatCurrency(result.totalInterest, currency)}
                </p>
              </GlassCard>
              <GlassCard className="text-center p-4 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400">TOTAL PAYABLE</span>
                <p className="text-lg font-black mt-1 text-blue-500 font-bold">
                  {formatCurrency(result.totalPayable, currency)}
                </p>
              </GlassCard>
            </div>
          )}

          {result && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Interest split Pie chart */}
              <GlassCard className="md:col-span-2 border border-slate-200/50 dark:border-slate-800/40 p-4 flex flex-col justify-between items-center text-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Total Cost Breakdown</h3>
                <div className="w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val), currency)} />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 mt-4 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 text-blue-500 justify-center">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span> Principal Amount ({Math.round(result.totalPrincipal / result.totalPayable * 100)}%)
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-500 justify-center">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Interest Cost ({Math.round(result.totalInterest / result.totalPayable * 100)}%)
                  </div>
                </div>
              </GlassCard>

              {/* Amortization Table (collapsible/scrollable list) */}
              <GlassCard className="md:col-span-3 border border-slate-200/50 dark:border-slate-800/40 p-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Repayment Schedule</h3>
                <div className="overflow-y-auto max-h-56 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {result.amortizationTable.map(row => (
                    <div key={row.month} className="py-2.5 flex justify-between items-center text-xs font-semibold hover:bg-slate-100/10 dark:hover:bg-slate-900/10 rounded px-1.5">
                      <span className="text-slate-400">Month {row.month}</span>
                      <div className="flex gap-4 text-right">
                        <div>
                          <span className="text-[10px] text-slate-400 block">PRINCIPAL</span>
                          <span className="text-slate-650 dark:text-slate-300">{formatCurrency(row.principalPaid, currency)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">INTEREST</span>
                          <span className="text-rose-500">{formatCurrency(row.interestPaid, currency)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">BALANCE</span>
                          <span className="text-slate-800 dark:text-slate-200">{formatCurrency(row.remainingBalance, currency)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
