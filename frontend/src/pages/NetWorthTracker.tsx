import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useNetWorth } from '../hooks/useNetWorth';
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  MACRO_GROUPS,
  AssetItem,
  LiabilityItem,
} from '../utils/wealthConfig';
import { formatCurrency, formatPercent, getCurrencySymbol } from '../utils/formatters';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from 'recharts';
import {
  LineChart,
  Plus,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Coins,
  Building,
  Wallet,
  CheckCircle2,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  Camera,
  Scale,
  Sparkles,
  Info,
  Clock,
  X,
  CreditCard,
  Building2,
  Percent,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type ActiveTab = 'overview' | 'assets' | 'liabilities' | 'history';

export const NetWorthTracker: React.FC = () => {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const {
    assets,
    liabilities,
    snapshots,
    summary,
    loading,
    addAsset,
    updateAsset,
    deleteAsset,
    addLiability,
    updateLiability,
    deleteLiability,
    recordSnapshot,
  } = useNetWorth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Modal States for Assets
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('cash_bank');
  const [assetCurrentValue, setAssetCurrentValue] = useState<number | ''>('');
  const [assetPurchaseValue, setAssetPurchaseValue] = useState<number | ''>('');
  const [assetPurchaseDate, setAssetPurchaseDate] = useState('');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetNotes, setAssetNotes] = useState('');

  // Modal States for Liabilities
  const [liabModalOpen, setLiabModalOpen] = useState(false);
  const [editingLiab, setEditingLiab] = useState<LiabilityItem | null>(null);
  const [liabName, setLiabName] = useState('');
  const [liabCategory, setLiabCategory] = useState('home_loan');
  const [liabOutstanding, setLiabOutstanding] = useState<number | ''>('');
  const [liabOriginal, setLiabOriginal] = useState<number | ''>('');
  const [liabInterest, setLiabInterest] = useState<number | ''>('');
  const [liabEmi, setLiabEmi] = useState<number | ''>('');
  const [liabTenure, setLiabTenure] = useState<number | ''>('');
  const [liabNotes, setLiabNotes] = useState('');

  // Snapshot recording state
  const [snapshotSuccess, setSnapshotSuccess] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Asset Filter
  const [assetFilterGroup, setAssetFilterGroup] = useState<string>('all');

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    if (assetFilterGroup === 'all') return assets;
    return assets.filter(a => {
      const cfg = ASSET_CATEGORIES[a.category] || ASSET_CATEGORIES.custom;
      return cfg.group === assetFilterGroup;
    });
  }, [assets, assetFilterGroup]);

  // Open Add Asset Modal
  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    setAssetName('');
    setAssetCategory('cash_bank');
    setAssetCurrentValue('');
    setAssetPurchaseValue('');
    setAssetPurchaseDate('');
    setAssetQuantity('');
    setAssetNotes('');
    setAssetModalOpen(true);
  };

  // Open Edit Asset Modal
  const handleOpenEditAsset = (asset: AssetItem) => {
    setEditingAsset(asset);
    setAssetName(asset.name);
    setAssetCategory(asset.category);
    setAssetCurrentValue(asset.currentValue);
    setAssetPurchaseValue(asset.purchaseValue !== undefined ? asset.purchaseValue : '');
    setAssetPurchaseDate(asset.purchaseDate || '');
    setAssetQuantity(asset.quantity || '');
    setAssetNotes(asset.notes || '');
    setAssetModalOpen(true);
  };

  // Submit Asset (Add or Edit)
  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || assetCurrentValue === '' || Number(assetCurrentValue) <= 0) return;

    const payload = {
      name: assetName.trim(),
      category: assetCategory,
      currentValue: Number(assetCurrentValue),
      purchaseValue: assetPurchaseValue !== '' ? Number(assetPurchaseValue) : undefined,
      purchaseDate: assetPurchaseDate || undefined,
      quantity: assetQuantity.trim() || undefined,
      currency: currency,
      notes: assetNotes.trim() || undefined,
    };

    if (editingAsset) {
      await updateAsset(editingAsset.id, payload);
    } else {
      await addAsset(payload);
    }
    setAssetModalOpen(false);
  };

  // Open Add Liability Modal
  const handleOpenAddLiab = () => {
    setEditingLiab(null);
    setLiabName('');
    setLiabCategory('home_loan');
    setLiabOutstanding('');
    setLiabOriginal('');
    setLiabInterest('');
    setLiabEmi('');
    setLiabTenure('');
    setLiabNotes('');
    setLiabModalOpen(true);
  };

  // Open Edit Liability Modal
  const handleOpenEditLiab = (liab: LiabilityItem) => {
    setEditingLiab(liab);
    setLiabName(liab.name);
    setLiabCategory(liab.category);
    setLiabOutstanding(liab.outstandingAmount);
    setLiabOriginal(liab.originalAmount !== undefined ? liab.originalAmount : '');
    setLiabInterest(liab.interestRate !== undefined ? liab.interestRate : '');
    setLiabEmi(liab.emi !== undefined ? liab.emi : '');
    setLiabTenure(liab.remainingTenureMonths !== undefined ? liab.remainingTenureMonths : '');
    setLiabNotes(liab.notes || '');
    setLiabModalOpen(true);
  };

  // Submit Liability (Add or Edit)
  const handleSubmitLiab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liabName.trim() || liabOutstanding === '' || Number(liabOutstanding) < 0) return;

    const payload = {
      name: liabName.trim(),
      category: liabCategory,
      outstandingAmount: Number(liabOutstanding),
      originalAmount: liabOriginal !== '' ? Number(liabOriginal) : undefined,
      interestRate: liabInterest !== '' ? Number(liabInterest) : undefined,
      emi: liabEmi !== '' ? Number(liabEmi) : undefined,
      remainingTenureMonths: liabTenure !== '' ? Number(liabTenure) : undefined,
      currency: currency,
      notes: liabNotes.trim() || undefined,
    };

    if (editingLiab) {
      await updateLiability(editingLiab.id, payload);
    } else {
      await addLiability(payload);
    }
    setLiabModalOpen(false);
  };

  // Record Snapshot
  const handleRecordSnapshot = async () => {
    setSnapshotLoading(true);
    setSnapshotSuccess('');
    const snap = await recordSnapshot();
    setSnapshotLoading(false);
    if (snap) {
      setSnapshotSuccess('Net worth snapshot recorded successfully!');
      setTimeout(() => setSnapshotSuccess(''), 4000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Net Worth & Wealth Diversification
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Track 16 asset categories, debts, liquidity ratios, and deterministic diversification scores.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <CustomButton onClick={handleOpenAddAsset} variant="primary" size="sm" className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add Asset
          </CustomButton>
          <CustomButton onClick={handleOpenAddLiab} variant="secondary" size="sm" className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add Liability
          </CustomButton>
          <CustomButton
            onClick={handleRecordSnapshot}
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={snapshotLoading}
          >
            <Camera className="w-4 h-4 text-emerald-500" /> {snapshotLoading ? 'Saving...' : 'Log Snapshot'}
          </CustomButton>
        </div>
      </div>

      {snapshotSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {snapshotSuccess}
        </div>
      )}

      {/* Primary KPI Header Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Net Worth */}
        <GlassCard hoverable className="border-l-4 border-l-emerald-500 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              TOTAL NET WORTH
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-2xl lg:text-3xl font-black tracking-tight ${
                summary.netWorth >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {formatCurrency(summary.netWorth, currency)}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400">
              <span>{summary.assetCount} Assets</span>
              <span>•</span>
              <span>{summary.liabilityCount} Liabilities</span>
            </div>
          </div>
        </GlassCard>

        {/* Total Assets */}
        <GlassCard hoverable className="border-l-4 border-l-blue-500 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              TOTAL ASSETS
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.totalAssets, currency)}
            </p>
            <span className="text-xs font-bold text-slate-400 mt-1 block">
              Spread over {summary.categoryCount} categories
            </span>
          </div>
        </GlassCard>

        {/* Total Liabilities */}
        <GlassCard hoverable className="border-l-4 border-l-red-500 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              TOTAL LIABILITIES
            </span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-red-500">
              {formatCurrency(summary.totalLiabilities, currency)}
            </p>
            <span className="text-xs font-bold text-slate-400 mt-1 block">
              Debt-to-Asset: {summary.debtToAssetRatio}%
            </span>
          </div>
        </GlassCard>

        {/* Diversification Score KPI */}
        <GlassCard hoverable className="border-l-4 border-l-purple-500 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              DIVERSIFICATION SCORE
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400">
                {summary.diversificationScore.score}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 100</span>
            </div>
            <span className="text-xs font-bold text-slate-400 mt-1 block">
              {summary.diversificationScore.score >= 75
                ? '🟢 Highly Diversified'
                : summary.diversificationScore.score >= 50
                ? '🟡 Moderately Diversified'
                : '🔴 Concentrated Risk'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Diversification & Allocation
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'assets'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Assets Portfolio ({assets.length})
        </button>

        <button
          onClick={() => setActiveTab('liabilities')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'liabilities'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Liabilities & Debt ({liabilities.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> Net Worth History ({snapshots.length})
        </button>
      </div>

      {/* ===================================================================
          TAB 1: DIVERSIFICATION & ALLOCATION OVERVIEW
          =================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Concentration Warning Banner */}
          <GlassCard
            className={`border-l-4 p-5 ${
              summary.isConcentrated
                ? 'border-l-amber-500 bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/20'
                : 'border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  summary.isConcentrated
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-emerald-500/10 text-emerald-500'
                }`}
              >
                {summary.isConcentrated ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    CONCENTRATION ANALYSIS
                  </span>
                  {summary.largestCategory && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Largest: {summary.largestCategory.name} ({summary.largestCategory.percentage}%)
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {summary.concentrationMessage}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Allocation & Score Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Donut Chart & Category Breakdown */}
            <GlassCard className="lg:col-span-2 border border-slate-200/50 dark:border-slate-800/40 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-emerald-500" /> Asset Allocation by Category
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Visual distribution across your {summary.categoryCount} active asset classes
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {formatCurrency(summary.totalAssets, currency)} Total
                  </span>
                </div>

                {summary.categoryAllocation.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Donut Chart */}
                    <div className="md:col-span-5 h-56 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                            formatter={(val: any) => [formatCurrency(Number(val), currency), 'Value']}
                          />
                          <Pie
                            data={summary.categoryAllocation}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {summary.categoryAllocation.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Total</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {summary.categoryCount} Classes
                        </span>
                      </div>
                    </div>

                    {/* Category List with Bars */}
                    <div className="md:col-span-7 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {summary.categoryAllocation.map(cat => (
                        <div key={cat.categoryId} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {cat.name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                ({cat.count})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 font-extrabold">
                              <span className="text-slate-800 dark:text-slate-200">
                                {formatCurrency(cat.value, currency)}
                              </span>
                              <span className="text-[11px] text-emerald-500 w-11 text-right">
                                {cat.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${cat.percentage}%`,
                                backgroundColor: cat.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <Coins className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold">No assets added yet.</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Right: FinWise Diversification Scorecard */}
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-purple-500" /> FinWise Diversification Score
                  </h2>
                  <span className="text-[10px] font-black uppercase text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Proprietary Model
                  </span>
                </div>

                {/* Big Score Meter */}
                <div className="text-center p-4 bg-gradient-to-b from-purple-500/5 to-transparent rounded-2xl border border-purple-500/10 mb-4">
                  <div className="inline-flex items-baseline gap-1">
                    <span className="text-4xl font-black text-purple-600 dark:text-purple-400">
                      {summary.diversificationScore.score}
                    </span>
                    <span className="text-sm font-bold text-slate-400">/ 100</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">
                    {summary.diversificationScore.score >= 75
                      ? 'Excellent Portfolio Resilience'
                      : summary.diversificationScore.score >= 50
                      ? 'Moderate Diversification Spread'
                      : 'High Concentration Exposure'}
                  </p>
                </div>

                {/* Score Pillars Factor Breakdown */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Transparent Factor Breakdown
                  </span>
                  <div className="space-y-1.5">
                    {summary.diversificationScore.factors.map((f, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {f.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{f.note}</p>
                        </div>
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md flex-shrink-0 ${
                            f.pts >= 20
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : f.pts >= 10
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          +{f.pts} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Liquid vs Illiquid Wealth + Macro Groups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Liquid vs Illiquid */}
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wallet className="w-4.5 h-4.5 text-blue-500" /> Liquid vs Illiquid Wealth
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cash & stocks vs physical properties, gold & business equity
                  </p>
                </div>
              </div>

              {/* Progress split bar */}
              <div className="space-y-4">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${summary.liquidPercent}%` }}
                    title={`Liquid: ${summary.liquidPercent}%`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${summary.illiquidPercent}%` }}
                    title={`Illiquid: ${summary.illiquidPercent}%`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Liquid Card */}
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                        Liquid Wealth
                      </span>
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-2">
                      {formatCurrency(summary.liquidAssets, currency)}
                    </p>
                    <span className="text-xs font-bold text-emerald-500">
                      {summary.liquidPercent}% of portfolio
                    </span>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Cash, checking, listed stocks, mutual funds, FDs & liquid bonds
                    </p>
                  </div>

                  {/* Illiquid Card */}
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                        Illiquid Wealth
                      </span>
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-2">
                      {formatCurrency(summary.illiquidAssets, currency)}
                    </p>
                    <span className="text-xs font-bold text-amber-500">
                      {summary.illiquidPercent}% of portfolio
                    </span>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Real estate, land, physical gold, vehicles & private equity
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Macro Group Allocation */}
            <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-emerald-500" /> Macro Asset Groups
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Growth vs Defensive vs Real Assets distribution
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {summary.groupAllocation.map(grp => (
                  <div
                    key={grp.groupId}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: grp.color }}
                        />
                        {grp.name}
                      </span>
                      <div className="flex items-center gap-2 font-black">
                        <span>{formatCurrency(grp.value, currency)}</span>
                        <span className="text-emerald-500 w-11 text-right">{grp.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${grp.percentage}%`, backgroundColor: grp.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 2: ASSETS PORTFOLIO MANAGEMENT
          =================================================================== */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Filter by macro group */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-400 flex-shrink-0">Filter:</span>
              <button
                onClick={() => setAssetFilterGroup('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  assetFilterGroup === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({assets.length})
              </button>
              {Object.values(MACRO_GROUPS).map(g => (
                <button
                  key={g.id}
                  onClick={() => setAssetFilterGroup(g.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    assetFilterGroup === g.id
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <CustomButton onClick={handleOpenAddAsset} variant="primary" size="sm" className="gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" /> Add Asset
            </CustomButton>
          </div>

          {/* Assets Grid */}
          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Coins className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No assets found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {assetFilterGroup === 'all'
                  ? 'Add your first asset across cash, stocks, gold, land, or crypto to begin tracking.'
                  : 'No assets match this category filter.'}
              </p>
              <CustomButton onClick={handleOpenAddAsset} variant="primary" size="sm" className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" /> Add Asset Now
              </CustomButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssets.map(asset => {
                const catCfg = ASSET_CATEGORIES[asset.category] || ASSET_CATEGORIES.custom;
                const hasPurch = asset.purchaseValue !== undefined && asset.purchaseValue > 0;
                const gainLoss = hasPurch ? asset.currentValue - (asset.purchaseValue || 0) : 0;
                const gainLossPct = hasPurch
                  ? ((asset.currentValue - (asset.purchaseValue || 0)) / (asset.purchaseValue || 1)) * 100
                  : 0;

                return (
                  <GlassCard
                    key={asset.id}
                    hoverable
                    className="border border-slate-200/50 dark:border-slate-800/40 p-5 flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Category Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: catCfg.color }}
                          />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {catCfg.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditAsset(asset)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAsset(asset.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Asset Title */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
                        {asset.name}
                      </h3>

                      {asset.quantity && (
                        <span className="inline-block mt-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {asset.quantity}
                        </span>
                      )}

                      {asset.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {asset.notes}
                        </p>
                      )}
                    </div>

                    {/* Asset Pricing & Return */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3.5 mt-4 space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 font-bold">Current Value:</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(asset.currentValue, currency)}
                        </span>
                      </div>

                      {hasPurch && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">
                            Purchased: {formatCurrency(asset.purchaseValue || 0, currency)}
                          </span>
                          <span
                            className={`font-black flex items-center gap-0.5 ${
                              gainLoss >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}
                          >
                            {gainLoss >= 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {gainLoss >= 0 ? '+' : ''}
                            {gainLossPct.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          TAB 3: LIABILITIES & DEBT MANAGEMENT
          =================================================================== */}
      {activeTab === 'liabilities' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Debt & Liabilities</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Total outstanding debt: {formatCurrency(summary.totalLiabilities, currency)}
              </p>
            </div>
            <CustomButton onClick={handleOpenAddLiab} variant="secondary" size="sm" className="gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" /> Add Liability
            </CustomButton>
          </div>

          {liabilities.length === 0 ? (
            <div className="p-12 text-center bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Zero Liabilities Recorded</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No debts or loans logged. You are debt-free or haven't entered mortgages yet.
              </p>
              <CustomButton onClick={handleOpenAddLiab} variant="secondary" size="sm" className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" /> Add Liability
              </CustomButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {liabilities.map(liab => {
                const catCfg = LIABILITY_CATEGORIES[liab.category] || LIABILITY_CATEGORIES.custom;

                return (
                  <GlassCard
                    key={liab.id}
                    hoverable
                    className="border border-slate-200/50 dark:border-slate-800/40 p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: catCfg.color }}
                          />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {catCfg.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditLiab(liab)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Liability"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteLiability(liab.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Liability"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
                        {liab.name}
                      </h3>

                      {liab.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {liab.notes}
                        </p>
                      )}
                    </div>

                    {/* Liability details */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3.5 mt-4 space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 font-bold">Outstanding:</span>
                        <span className="text-lg font-black text-red-500">
                          {formatCurrency(liab.outstandingAmount, currency)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {liab.interestRate !== undefined && (
                          <div>
                            <span className="text-slate-400">Interest: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {liab.interestRate}% p.a.
                            </span>
                          </div>
                        )}
                        {liab.emi !== undefined && (
                          <div className="text-right">
                            <span className="text-slate-400">EMI: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {formatCurrency(liab.emi, currency)}/mo
                            </span>
                          </div>
                        )}
                        {liab.remainingTenureMonths !== undefined && (
                          <div>
                            <span className="text-slate-400">Tenure: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {liab.remainingTenureMonths} mos
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          TAB 4: HISTORICAL NET WORTH TIMELINE
          =================================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-emerald-500" /> Historical Net Worth Progression
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Periodic snapshots of your wealth accumulation curve over time
              </p>
            </div>
            <CustomButton
              onClick={handleRecordSnapshot}
              variant="primary"
              size="sm"
              className="gap-1.5 shadow-sm"
              disabled={snapshotLoading}
            >
              <Camera className="w-4 h-4" /> Capture Today's Snapshot
            </CustomButton>
          </div>

          {/* Historical Chart */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-6">
            <div className="h-72 w-full">
              {snapshots.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshots}>
                    <defs>
                      <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={value => `${value / 1000}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [formatCurrency(Number(val), currency), '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      name="Net Worth"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorNw)"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalAssets"
                      name="Total Assets"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      fillOpacity={1}
                      fill="url(#colorAssets)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No snapshots recorded yet. Click "Capture Today's Snapshot" to log your first data point.
                </div>
              )}
            </div>
          </GlassCard>

          {/* Historical Log Table */}
          <GlassCard className="border border-slate-200/50 dark:border-slate-800/40 p-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 px-2">Snapshot Ledger</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {snapshots.map(snap => (
                <div
                  key={snap.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-800 dark:text-slate-200 w-24">
                      {snap.date}
                    </span>
                    <span className="text-slate-400">
                      Assets: {formatCurrency(snap.totalAssets, currency)}
                    </span>
                    <span className="text-slate-400">
                      Liabilities: {formatCurrency(snap.totalLiabilities, currency)}
                    </span>
                  </div>
                  <div className="font-black text-sm text-emerald-500">
                    Net Worth: {formatCurrency(snap.netWorth, currency)}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ===================================================================
          MODAL: ADD / EDIT ASSET
          =================================================================== */}
      {assetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" />
                {editingAsset ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <button
                onClick={() => setAssetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAsset} className="space-y-4">
              {/* Category Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Asset Category *
                </label>
                <select
                  value={assetCategory}
                  onChange={e => setAssetCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {Object.values(ASSET_CATEGORIES).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.liquidity === 'liquid' ? 'Liquid' : 'Illiquid'} — {MACRO_GROUPS[cat.group]?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Name */}
              <CustomInput
                label="Asset Name *"
                placeholder="e.g. 24K Sovereign Gold, Nifty 50 ETF, Downtown Apartment"
                value={assetName}
                onChange={e => setAssetName(e.target.value)}
                required
              />

              {/* Current Value */}
              <CustomInput
                label="Current Market Value *"
                type="number"
                placeholder="0"
                value={assetCurrentValue}
                onChange={e => setAssetCurrentValue(e.target.value === '' ? '' : Number(e.target.value))}
                prefixSymbol={getCurrencySymbol(currency)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Purchase Value */}
                <CustomInput
                  label="Purchase Price (Optional)"
                  type="number"
                  placeholder="Original cost"
                  value={assetPurchaseValue}
                  onChange={e => setAssetPurchaseValue(e.target.value === '' ? '' : Number(e.target.value))}
                  prefixSymbol={getCurrencySymbol(currency)}
                />

                {/* Purchase Date */}
                <CustomInput
                  label="Purchase Date (Optional)"
                  type="date"
                  value={assetPurchaseDate}
                  onChange={e => setAssetPurchaseDate(e.target.value)}
                />
              </div>

              {/* Quantity */}
              <CustomInput
                label="Quantity / Units (Optional)"
                placeholder="e.g. 50 grams, 120 shares, 1500 sq ft"
                value={assetQuantity}
                onChange={e => setAssetQuantity(e.target.value)}
              />

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any reference details or notes"
                  value={assetNotes}
                  onChange={e => setAssetNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <CustomButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAssetModalOpen(false)}
                >
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="primary" size="sm">
                  {editingAsset ? 'Save Changes' : 'Add Asset'}
                </CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: ADD / EDIT LIABILITY
          =================================================================== */}
      {liabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-500" />
                {editingLiab ? 'Edit Liability' : 'Add New Liability'}
              </h2>
              <button
                onClick={() => setLiabModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLiab} className="space-y-4">
              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Liability Category *
                </label>
                <select
                  value={liabCategory}
                  onChange={e => setLiabCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {Object.values(LIABILITY_CATEGORIES).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <CustomInput
                label="Liability Name *"
                placeholder="e.g. HDFC Home Loan, Auto Financing, Rewards Card"
                value={liabName}
                onChange={e => setLiabName(e.target.value)}
                required
              />

              {/* Outstanding Amount */}
              <CustomInput
                label="Outstanding Balance *"
                type="number"
                placeholder="0"
                value={liabOutstanding}
                onChange={e => setLiabOutstanding(e.target.value === '' ? '' : Number(e.target.value))}
                prefixSymbol={getCurrencySymbol(currency)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original Amount */}
                <CustomInput
                  label="Original Loan Amount (Optional)"
                  type="number"
                  placeholder="Sanctioned amount"
                  value={liabOriginal}
                  onChange={e => setLiabOriginal(e.target.value === '' ? '' : Number(e.target.value))}
                  prefixSymbol={getCurrencySymbol(currency)}
                />

                {/* Interest Rate */}
                <CustomInput
                  label="Interest Rate % p.a. (Optional)"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 8.5"
                  value={liabInterest}
                  onChange={e => setLiabInterest(e.target.value === '' ? '' : Number(e.target.value))}
                  suffixSymbol="%"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Monthly EMI */}
                <CustomInput
                  label="Monthly EMI (Optional)"
                  type="number"
                  placeholder="Monthly payment"
                  value={liabEmi}
                  onChange={e => setLiabEmi(e.target.value === '' ? '' : Number(e.target.value))}
                  prefixSymbol={getCurrencySymbol(currency)}
                />

                {/* Remaining Tenure */}
                <CustomInput
                  label="Remaining Months (Optional)"
                  type="number"
                  placeholder="e.g. 180"
                  value={liabTenure}
                  onChange={e => setLiabTenure(e.target.value === '' ? '' : Number(e.target.value))}
                  suffixSymbol="mo"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any repayment terms or loan account details"
                  value={liabNotes}
                  onChange={e => setLiabNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <CustomButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLiabModalOpen(false)}
                >
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="secondary" size="sm">
                  {editingLiab ? 'Save Changes' : 'Add Liability'}
                </CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
