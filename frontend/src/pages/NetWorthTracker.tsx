import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCalculations } from '../hooks/useCalculations';
import { calculateNetWorth, AssetEntry, LiabilityEntry, NetWorthResult } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { LineChart, Plus, Save, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NetWorthTracker: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { saveCalculation } = useCalculations();

  // Assets States
  const [cash, setCash] = useState(150000);
  const [stocks, setStocks] = useState(450000);
  const [mutualFunds, setMutualFunds] = useState(300000);
  const [gold, setGold] = useState(150000);
  const [realEstate, setRealEstate] = useState(2500000);
  const [crypto, setCrypto] = useState(50000);

  // Liabilities States
  const [loans, setLoans] = useState(150000);
  const [creditCards, setCreditCards] = useState(20000);
  const [mortgage, setMortgage] = useState(1200000);

  // Plan name
  const [planName, setPlanName] = useState('My Balance Sheet');
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Results
  const [result, setResult] = useState<NetWorthResult | null>(null);

  useEffect(() => {
    const assets: AssetEntry = { cash, stocks, mutualFunds, gold, realEstate, crypto };
    const liabilities: LiabilityEntry = { loans, creditCards, mortgage };
    const res = calculateNetWorth(assets, liabilities);
    setResult(res);
  }, [cash, stocks, mutualFunds, gold, realEstate, crypto, loans, creditCards, mortgage]);

  const handleSave = async () => {
    if (!user) return;
    setSavingPlan(true);
    setSaveSuccess('');
    const calc = await saveCalculation(
      'net_worth',
      planName,
      { cash, stocks, mutualFunds, gold, realEstate, crypto, loans, creditCards, mortgage },
      result
    );
    setSavingPlan(false);
    if (calc) {
      setSaveSuccess('Net worth tracking saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Net Worth Tracker <LineChart className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Map out your assets and liabilities to calculate your absolute financial value.
          </p>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
            <span className="text-[10px] font-bold text-slate-400">TOTAL ASSETS</span>
            <p className="text-2xl font-black mt-1 text-emerald-500">
              {formatCurrency(result.totalAssets, currency)}
            </p>
          </GlassCard>
          <GlassCard className="text-center p-5 bg-gradient-to-b from-slate-100/50 dark:from-slate-900/30">
            <span className="text-[10px] font-bold text-slate-400">TOTAL LIABILITIES</span>
            <p className="text-2xl font-black mt-1 text-red-500">
              {formatCurrency(result.totalLiabilities, currency)}
            </p>
          </GlassCard>
          <GlassCard className="text-center p-5 bg-gradient-to-b from-emerald-950/10 dark:from-emerald-950/20 border border-emerald-500/10">
            <span className="text-[10px] font-bold text-emerald-500">NET WORTH</span>
            <p className="text-2xl font-black mt-1 text-slate-850 dark:text-emerald-400">
              {formatCurrency(result.netWorth, currency)}
            </p>
          </GlassCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Assets Form */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-500">
              Assets (+)
            </h2>

            <CustomInput
              label="Cash & Bank Balance"
              type="number"
              value={cash}
              onChange={e => setCash(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <CustomInput
              label="Stocks / Equities"
              type="number"
              value={stocks}
              onChange={e => setStocks(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <CustomInput
              label="Mutual Funds"
              type="number"
              value={mutualFunds}
              onChange={e => setMutualFunds(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <CustomInput
              label="Gold / Precious Metals"
              type="number"
              value={gold}
              onChange={e => setGold(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <CustomInput
              label="Real Estate / Properties"
              type="number"
              value={realEstate}
              onChange={e => setRealEstate(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <CustomInput
              label="Crypto Assets"
              type="number"
              value={crypto}
              onChange={e => setCrypto(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />
          </GlassCard>
        </div>

        {/* Liabilities Form */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-red-500">
              Liabilities (-)
            </h2>

            <CustomInput
              label="Personal & Auto Loans"
              type="number"
              value={loans}
              onChange={e => setLoans(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <CustomInput
              label="Credit Card Outstanding"
              type="number"
              value={creditCards}
              onChange={e => setCreditCards(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            <CustomInput
              label="Home Mortgage"
              type="number"
              value={mortgage}
              onChange={e => setMortgage(Number(e.target.value))}
              prefixSymbol={currency === 'INR' ? '₹' : '$'}
            />

            {user ? (
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-5 space-y-3">
                <CustomInput
                  label="Plan Name"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                />
                <CustomButton onClick={handleSave} variant="secondary" size="sm" fullWidth className="gap-2">
                  <Save className="w-4.5 h-4.5" /> {savingPlan ? 'Saving...' : 'Save Balance Sheet'}
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

        {/* Visual Charts */}
        <div className="lg:col-span-1 space-y-6">
          {result && result.assetAllocation.length > 0 && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-4 text-center flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Asset Allocation</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val), currency)} />
                    <Pie
                      data={result.assetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {result.assetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-left px-2">
                {result.assetAllocation.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate">{item.name} ({Math.round(item.value / result.totalAssets * 100)}%)</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {result && result.liabilityAllocation.length > 0 && (
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-4 text-center flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Liability Allocation</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val), currency)} />
                    <Pie
                      data={result.liabilityAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {result.liabilityAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-left px-2">
                {result.liabilityAllocation.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate">{item.name} ({Math.round(item.value / result.totalLiabilities * 100)}%)</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
