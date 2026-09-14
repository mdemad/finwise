import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInvestments } from '../hooks/useInvestments';
import { useGoals } from '../hooks/useGoals';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import { formatCurrency, formatPercent, formatDate, CurrencyCode, currencies } from '../utils/formatters';
import {
  Holding,
  Transaction,
  AssetType,
  TransactionType,
  HoldingStatus,
} from '../types/investments';
import {
  PieChart as PieChartIcon,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Clock,
  Briefcase,
  AlertCircle,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  FileText,
  Building,
  Tag,
  HelpCircle,
  BarChart2,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stock / Equity',
  mutual_fund: 'Mutual Fund',
  etf: 'ETF',
  bond: 'Bond / Debt',
  crypto: 'Cryptocurrency',
  reit: 'REIT / Real Estate',
  other: 'Other Asset',
};

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: '#3b82f6',       // Blue
  mutual_fund: '#6366f1', // Indigo
  etf: '#0ea5e9',         // Sky
  bond: '#14b8a6',        // Teal
  crypto: '#ec4899',      // Pink
  reit: '#f97316',        // Orange
  other: '#71717a',       // Zinc
};

const TX_TYPE_COLORS: Record<TransactionType, { bg: string; text: string }> = {
  BUY: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  SELL: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  DIVIDEND: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
  FEE: { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' },
  SPLIT: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  TRANSFER_IN: { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400' },
  TRANSFER_OUT: { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
};

export const Portfolio: React.FC = () => {
  const { user } = useAuth();
  const { currency: userCurrency } = useCurrency();
  const {
    holdings,
    transactions,
    summary,
    loading,
    error: investmentsError,
    refresh: refreshInvestments,
    createHolding,
    updateHolding,
    deleteHolding,
    recordTransaction,
  } = useInvestments();
  const { goals, error: goalsError, refresh: refreshGoals } = useGoals();

  const error = investmentsError || goalsError;

  const handleRefresh = () => {
    refreshInvestments();
    refreshGoals();
  };

  // Tab State
  const [activeTab, setActiveTab] = useState<'holdings' | 'transactions' | 'analytics'>('holdings');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('ALL');
  const [selectedHoldingFilter, setSelectedHoldingFilter] = useState<string>('ALL');
  const [selectedTxTypeFilter, setSelectedTxTypeFilter] = useState<string>('ALL');

  // Modal States
  const [isAddHoldingOpen, setIsAddHoldingOpen] = useState(false);
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [selectedHoldingForTx, setSelectedHoldingForTx] = useState<Holding | null>(null);

  const [isUpdatePriceOpen, setIsUpdatePriceOpen] = useState(false);
  const [holdingToUpdatePrice, setHoldingToUpdatePrice] = useState<Holding | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetailHolding, setSelectedDetailHolding] = useState<Holding | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States - Add Holding
  const [addHoldingForm, setAddHoldingForm] = useState({
    symbol: '',
    name: '',
    assetType: 'stock' as AssetType,
    currency: userCurrency,
    brokerCode: 'MANUAL',
    currentPrice: '',
    initialQuantity: '',
    initialPrice: '',
    goalId: '',
    notes: '',
  });

  // Form States - Record Transaction
  const [recordTxForm, setRecordTxForm] = useState({
    holdingId: '',
    transactionType: 'BUY' as TransactionType,
    quantity: '',
    price: '',
    fees: '0',
    transactionDate: new Date().toISOString().slice(0, 16),
    externalTransactionId: '',
    notes: '',
  });

  // Form States - Price Update
  const [newMarketPrice, setNewMarketPrice] = useState('');

  // Analytics State
  const [projectionCAGR, setProjectionCAGR] = useState(12);
  const [projectionYears, setProjectionYears] = useState(10);
  const [projectionInflation, setProjectionInflation] = useState(6);

  // Goal ID edit in detail modal
  const [editGoalId, setEditGoalId] = useState('');

  // ---------------------------------------------------------------------------
  // Derived Calculation Helpers
  // ---------------------------------------------------------------------------
  const totalRealizedPnL = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
  }, [transactions]);

  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      const matchesSearch =
        h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedAssetType === 'ALL' || h.assetType === selectedAssetType;
      return matchesSearch && matchesType;
    });
  }, [holdings, searchTerm, selectedAssetType]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesHolding = selectedHoldingFilter === 'ALL' || t.holdingId === selectedHoldingFilter;
      const matchesType = selectedTxTypeFilter === 'ALL' || t.transactionType === selectedTxTypeFilter;
      return matchesHolding && matchesType;
    });
  }, [transactions, selectedHoldingFilter, selectedTxTypeFilter]);

  const topConcentrationHoldings = useMemo(() => {
    if (!summary || summary.totalValueBase === 0) return [];
    return [...holdings]
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
      .slice(0, 5)
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        valueBase: h.currentValue || 0,
        percentage: ((h.currentValue || 0) / summary.totalValueBase) * 100,
      }));
  }, [holdings, summary]);

  // ---------------------------------------------------------------------------
  // Phase 4D: Analytics Computations
  // ---------------------------------------------------------------------------

  // Growth projection data for chart
  const projectionData = useMemo(() => {
    if (!summary || summary.totalValueBase === 0) return [];
    const startValue = summary.totalValueBase;
    const nominalRate = projectionCAGR / 100;
    const inflRate = projectionInflation / 100;
    const realRate = (1 + nominalRate) / (1 + inflRate) - 1;
    const data = [];
    for (let y = 0; y <= projectionYears; y++) {
      const nominal = startValue * Math.pow(1 + nominalRate, y);
      const real = startValue * Math.pow(1 + realRate, y);
      const cost = summary.totalCostBasisBase * Math.pow(1 + inflRate, y);
      data.push({
        year: new Date().getFullYear() + y,
        nominal: Math.round(nominal),
        real: Math.round(real),
        inflationCost: Math.round(cost),
      });
    }
    return data;
  }, [summary, projectionCAGR, projectionYears, projectionInflation]);

  // Diversification & Risk Score (0-100)
  const analyticsScore = useMemo(() => {
    if (holdings.length === 0) return null;
    const allocation = summary?.allocationByAssetType || [];
    const numTypes = allocation.length;
    const numHoldings = holdings.length;

    // Concentration penalty: if top holding > 50%, penalise
    let concentrationScore = 100;
    if (summary && summary.totalValueBase > 0) {
      const topValue = Math.max(...holdings.map(h => h.currentValue || 0));
      const topPct = (topValue / summary.totalValueBase) * 100;
      if (topPct > 50) concentrationScore = Math.max(20, 100 - (topPct - 50) * 2);
      else if (topPct > 30) concentrationScore = Math.max(50, 100 - (topPct - 30));
    }

    // Type diversification: more types → better
    const typeScore = Math.min(100, numTypes * 18);

    // Holdings count score
    const holdingScore = Math.min(100, numHoldings * 12);

    // Volatility weight: crypto/stock heavy → higher risk
    let volatilityPenalty = 0;
    if (summary && summary.totalValueBase > 0) {
      const cryptoPct = (allocation.find(a => a.assetType === 'crypto')?.valueBase || 0) / summary.totalValueBase * 100;
      const stockPct = (allocation.find(a => a.assetType === 'stock')?.valueBase || 0) / summary.totalValueBase * 100;
      volatilityPenalty = Math.min(30, (cryptoPct * 0.3) + (stockPct * 0.1));
    }

    const diversificationScore = Math.round((concentrationScore * 0.4 + typeScore * 0.35 + holdingScore * 0.25));
    const riskScore = Math.min(100, Math.max(0, Math.round((allocation.find(a => a.assetType === 'crypto')?.percentage || 0) * 0.6 + (allocation.find(a => a.assetType === 'stock')?.percentage || 0) * 0.25 + volatilityPenalty)));

    const getRiskLabel = (score: number) => {
      if (score < 20) return { label: 'Low Risk', color: 'text-emerald-500', bg: 'bg-emerald-500' };
      if (score < 50) return { label: 'Moderate', color: 'text-amber-500', bg: 'bg-amber-500' };
      if (score < 75) return { label: 'High Risk', color: 'text-orange-500', bg: 'bg-orange-500' };
      return { label: 'Very High', color: 'text-red-500', bg: 'bg-red-500' };
    };

    const getDivLabel = (score: number) => {
      if (score >= 75) return { label: 'Well Diversified', color: 'text-emerald-500' };
      if (score >= 50) return { label: 'Moderately Diversified', color: 'text-amber-500' };
      if (score >= 25) return { label: 'Needs Diversification', color: 'text-orange-500' };
      return { label: 'Highly Concentrated', color: 'text-red-500' };
    };

    const riskInfo = getRiskLabel(riskScore);
    const divInfo = getDivLabel(diversificationScore);

    // Goal-linked holdings
    const goalTagged = holdings.filter(h => h.goalId);
    const goalGroups: Record<string, { goalName: string; holdings: Holding[]; totalValue: number }> = {};
    goalTagged.forEach(h => {
      const gId = h.goalId!;
      if (!goalGroups[gId]) {
        const goalObj = goals.find(g => g.id === gId);
        goalGroups[gId] = { goalName: goalObj ? goalObj.name : 'Unknown Goal', holdings: [], totalValue: 0 };
      }
      goalGroups[gId].holdings.push(h);
      goalGroups[gId].totalValue += h.currentValue || 0;
    });

    // Insights
    const insights: string[] = [];
    if (numHoldings < 5) insights.push('Add more holdings to improve diversification across asset classes.');
    if (riskScore > 60) insights.push('High crypto/stock concentration increases portfolio volatility.');
    if (numTypes < 3) insights.push('Consider adding bonds, REITs, or ETFs for better risk distribution.');
    if (concentrationScore < 60) insights.push('One position dominates your portfolio. Consider rebalancing.');
    if (insights.length === 0) insights.push('Your portfolio shows good diversification. Keep rebalancing quarterly.');

    return {
      diversificationScore,
      riskScore,
      riskInfo,
      divInfo,
      goalGroups,
      insights,
      numTypes,
    };
  }, [holdings, summary, goals]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleOpenRecordTx = (holding?: Holding) => {
    setFormError(null);
    if (holding) {
      setSelectedHoldingForTx(holding);
      setRecordTxForm((prev) => ({
        ...prev,
        holdingId: holding.id,
        price: String(holding.currentPrice || ''),
      }));
    } else if (holdings.length > 0) {
      const first = holdings[0];
      setSelectedHoldingForTx(first);
      setRecordTxForm((prev) => ({
        ...prev,
        holdingId: first.id,
        price: String(first.currentPrice || ''),
      }));
    }
    setIsRecordTxOpen(true);
  };

  const handleOpenUpdatePrice = (holding: Holding) => {
    setFormError(null);
    setHoldingToUpdatePrice(holding);
    setNewMarketPrice(String(holding.currentPrice));
    setIsUpdatePriceOpen(true);
  };

  const handleOpenDetail = (holding: Holding) => {
    setSelectedDetailHolding(holding);
    setIsDetailOpen(true);
  };

  const handleAddHoldingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!addHoldingForm.symbol || !addHoldingForm.name) {
      setFormError('Symbol and Name are required.');
      return;
    }

    setActionLoading(true);
    const res = await createHolding({
      symbol: addHoldingForm.symbol.trim().toUpperCase(),
      name: addHoldingForm.name.trim(),
      assetType: addHoldingForm.assetType,
      currency: addHoldingForm.currency,
      brokerCode: addHoldingForm.brokerCode,
      currentPrice: parseFloat(addHoldingForm.currentPrice) || 0,
      initialQuantity: addHoldingForm.initialQuantity ? parseFloat(addHoldingForm.initialQuantity) : undefined,
      initialPrice: addHoldingForm.initialPrice ? parseFloat(addHoldingForm.initialPrice) : undefined,
      notes: addHoldingForm.notes || undefined,
    });

    setActionLoading(false);
    if (res.success) {
      setIsAddHoldingOpen(false);
      setAddHoldingForm({
        symbol: '',
        name: '',
        assetType: 'stock',
        currency: userCurrency,
        brokerCode: 'MANUAL',
        currentPrice: '',
        initialQuantity: '',
        initialPrice: '',
        goalId: '',
        notes: '',
      });
    } else {
      setFormError(res.error || 'Failed to create holding');
    }
  };

  const handleRecordTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!recordTxForm.holdingId) {
      setFormError('Please select a holding.');
      return;
    }

    const qty = parseFloat(recordTxForm.quantity);
    const price = parseFloat(recordTxForm.price);
    const fees = parseFloat(recordTxForm.fees || '0');

    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be greater than 0.');
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError('Price must be non-negative.');
      return;
    }

    // Client-side SELL validation
    if (recordTxForm.transactionType === 'SELL') {
      const targetHolding = holdings.find((h) => h.id === recordTxForm.holdingId);
      if (targetHolding && qty > targetHolding.unitsHeld) {
        setFormError(`Cannot sell ${qty} units. Only ${targetHolding.unitsHeld} units available.`);
        return;
      }
    }

    setActionLoading(true);
    const res = await recordTransaction({
      holdingId: recordTxForm.holdingId,
      transactionType: recordTxForm.transactionType,
      quantity: qty,
      price: price,
      fees: fees,
      transactionDate: new Date(recordTxForm.transactionDate).toISOString(),
      externalTransactionId: recordTxForm.externalTransactionId || undefined,
      notes: recordTxForm.notes || undefined,
    });

    setActionLoading(false);
    if (res.success) {
      setIsRecordTxOpen(false);
      setRecordTxForm({
        holdingId: '',
        transactionType: 'BUY',
        quantity: '',
        price: '',
        fees: '0',
        transactionDate: new Date().toISOString().slice(0, 16),
        externalTransactionId: '',
        notes: '',
      });
    } else {
      setFormError(res.error || 'Failed to record transaction');
    }
  };

  const handleUpdatePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdingToUpdatePrice) return;
    setFormError(null);

    const price = parseFloat(newMarketPrice);
    if (isNaN(price) || price < 0) {
      setFormError('Price must be a valid non-negative number.');
      return;
    }

    setActionLoading(true);
    const res = await updateHolding(holdingToUpdatePrice.id, {
      currentPrice: price,
    });

    setActionLoading(false);
    if (res.success) {
      setIsUpdatePriceOpen(false);
      setHoldingToUpdatePrice(null);
    } else {
      setFormError(res.error || 'Failed to update market price');
    }
  };

  const handleToggleStatus = async (holding: Holding, newStatus: HoldingStatus) => {
    setActionLoading(true);
    const res = await updateHolding(holding.id, { status: newStatus });
    setActionLoading(false);
    if (res.success && selectedDetailHolding?.id === holding.id) {
      setSelectedDetailHolding({ ...selectedDetailHolding, status: newStatus });
    }
  };

  const handleDeleteHoldingClick = async (holdingId: string) => {
    if (!window.confirm('Are you sure you want to delete this holding?')) return;
    setActionLoading(true);
    const res = await deleteHolding(holdingId);
    setActionLoading(false);
    if (!res.success) {
      alert(res.error || 'Cannot delete holding');
    } else if (selectedDetailHolding?.id === holdingId) {
      setIsDetailOpen(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render Loading & Error Banners
  // ---------------------------------------------------------------------------
  // Only block with a spinner when a logged-in user's data is actively loading
  if (loading && user && !error && holdings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px] w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading Investment Portfolio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Guest Login Banner */}
      {!user && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Log in to track your investments</p>
              <p className="text-xs text-blue-500 dark:text-blue-400">Sign in to add holdings, record trades, and see your real portfolio data.</p>
            </div>
          </div>
          <Link
            to="/login"
            className="shrink-0 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors"
          >
            Log In
          </Link>
        </div>
      )}
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Investment Portfolio
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {userCurrency as string}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Track stocks, mutual funds, ETFs, crypto, and bonds with Weighted Average Cost (WAC) tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh Portfolio"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleOpenRecordTx()}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Record Trade</span>
          </CustomButton>

          <CustomButton
            variant="primary"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsAddHoldingOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Investment</span>
          </CustomButton>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={handleRefresh} className="underline font-bold cursor-pointer ml-4">Retry</button>
        </div>
      )}

      {/* -------------------------------------------------------------------
          1. Portfolio Summary Metric Cards
         ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Value */}
        <GlassCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Portfolio Value</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(summary?.totalValueBase || 0, userCurrency as CurrencyCode)}
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              Base Reporting Currency ({userCurrency as string})
            </div>
          </div>
        </GlassCard>

        {/* Card 2: Cost Basis */}
        <GlassCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Invested (Cost)</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(summary?.totalCostBasisBase || 0, userCurrency as CurrencyCode)}
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              Aggregate WAC Purchase Value
            </div>
          </div>
        </GlassCard>

        {/* Card 3: Unrealized P&L */}
        <GlassCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Unrealized P&L</span>
            {(summary?.totalUnrealizedPnLBase || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-extrabold flex items-center gap-1.5 ${
                (summary?.totalUnrealizedPnLBase || 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              <span>
                {(summary?.totalUnrealizedPnLBase || 0) >= 0 ? '+' : ''}
                {formatCurrency(summary?.totalUnrealizedPnLBase || 0, userCurrency as CurrencyCode)}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-current/10">
                {(summary?.unrealizedPnLPercent || 0) >= 0 ? '+' : ''}
                {formatPercent(summary?.unrealizedPnLPercent || 0)}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              Open Position Market Gains
            </div>
          </div>
        </GlassCard>

        {/* Card 4: Positions & Realized P&L */}
        <GlassCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Active Holdings</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summary?.holdingCount || 0} Positions
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
              <span>Realized P&L:</span>
              <span
                className={`font-bold ${
                  totalRealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {totalRealizedPnL >= 0 ? '+' : ''}
                {formatCurrency(totalRealizedPnL, userCurrency as CurrencyCode)}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* -------------------------------------------------------------------
          2. Allocation & Concentration Visualizations (if holdings exist)
         ------------------------------------------------------------------- */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Allocation Donut Chart */}
          <GlassCard className="lg:col-span-2 flex flex-col justify-between min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-500" />
                Asset Allocation Breakdown
              </h3>
            </div>

            {summary?.allocationByAssetType && summary.allocationByAssetType.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.allocationByAssetType}
                      dataKey="valueBase"
                      nameKey="assetType"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {summary.allocationByAssetType.map((entry) => (
                        <Cell
                          key={entry.assetType}
                          fill={ASSET_TYPE_COLORS[entry.assetType] || '#71717a'}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any) => [
                        formatCurrency(Number(val || 0), userCurrency as CurrencyCode),
                        'Value',
                      ]}
                      labelFormatter={(label) => ASSET_TYPE_LABELS[label as AssetType] || label}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {ASSET_TYPE_LABELS[value as AssetType] || value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 text-xs text-slate-400">
                No allocation data available
              </div>
            )}
          </GlassCard>

          {/* Concentration Top Holdings */}
          <GlassCard className="flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-500" />
              Top Position Concentration
            </h3>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {topConcentrationHoldings.map((h, idx) => (
                <div key={h.symbol} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200">
                      {idx + 1}. {h.symbol}
                    </span>
                    <span className="text-slate-500">{h.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, h.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* -------------------------------------------------------------------
          3. Main Navigation Tabs
         ------------------------------------------------------------------- */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`py-3 px-1 border-b-2 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'holdings'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Holdings ({filteredHoldings.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-3 px-1 border-b-2 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Trade History ({filteredTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-1 border-b-2 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Analytics & Goals
          </button>
        </div>

        {/* Action button inside tab bar */}
        <div className="pb-2">
          {activeTab === 'holdings' ? (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setFormError(null);
                setIsAddHoldingOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Add Holding</span>
            </CustomButton>
          ) : (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => handleOpenRecordTx()}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Record Trade</span>
            </CustomButton>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------
          TAB 1: Holdings View
         ------------------------------------------------------------------- */}
      {activeTab === 'holdings' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Asset Types</option>
                {Object.entries(ASSET_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Holdings Empty State */}
          {filteredHoldings.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {holdings.length === 0 ? 'No Investment Holdings Recorded' : 'No Matching Holdings'}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
                {holdings.length === 0
                  ? 'Start tracking your financial investments with automated Weighted Average Cost (WAC) calculations.'
                  : 'Try adjusting your search terms or asset type filters.'}
              </p>
              {holdings.length === 0 && (
                <CustomButton
                  variant="primary"
                  onClick={() => {
                    setFormError(null);
                    setIsAddHoldingOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Investment</span>
                </CustomButton>
              )}
            </GlassCard>
          ) : (
            <>
              {/* Desktop Responsive Table (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-100/50 dark:bg-slate-800/50">
                      <th className="py-3.5 px-4">Instrument</th>
                      <th className="py-3.5 px-4">Asset Type</th>
                      <th className="py-3.5 px-4 text-right">Units Held</th>
                      <th className="py-3.5 px-4 text-right">Avg Buy (WAC)</th>
                      <th className="py-3.5 px-4 text-right">Current Price</th>
                      <th className="py-3.5 px-4 text-right">Current Value</th>
                      <th className="py-3.5 px-4 text-right">Unrealized P&L</th>
                      <th className="py-3.5 px-4 text-center">Broker</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
                    {filteredHoldings.map((h) => {
                      const isProfit = (h.unrealizedPnL || 0) >= 0;
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800">
                                {h.symbol}
                              </span>
                              <span className="truncate max-w-[120px] font-medium text-slate-500 dark:text-slate-400">
                                {h.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ color: ASSET_TYPE_COLORS[h.assetType], borderColor: `${ASSET_TYPE_COLORS[h.assetType]}40`, backgroundColor: `${ASSET_TYPE_COLORS[h.assetType]}15` }}>
                              {ASSET_TYPE_LABELS[h.assetType]}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            {h.unitsHeld}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {formatCurrency(h.averageBuyPrice, h.currency as CurrencyCode)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {formatCurrency(h.currentPrice, h.currency as CurrencyCode)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold">
                            {formatCurrency(h.currentValue, h.currency as CurrencyCode)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className={`font-bold flex items-center justify-end gap-1 ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                              <span>{isProfit ? '+' : ''}{formatCurrency(h.unrealizedPnL, h.currency as CurrencyCode)}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-current/10">
                                {isProfit ? '+' : ''}{formatPercent(h.unrealizedPnLPercent)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {h.brokerCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenRecordTx(h)}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                title="Record Trade"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenUpdatePrice(h)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg cursor-pointer"
                                title="Update Market Price"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDetail(h)}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
                                title="View Details"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Position Cards (Visible on Mobile) */}
              <div className="md:hidden space-y-3">
                {filteredHoldings.map((h) => {
                  const isProfit = (h.unrealizedPnL || 0) >= 0;
                  return (
                    <GlassCard key={h.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800">
                            {h.symbol}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px]">
                            {h.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: ASSET_TYPE_COLORS[h.assetType], borderColor: `${ASSET_TYPE_COLORS[h.assetType]}40`, backgroundColor: `${ASSET_TYPE_COLORS[h.assetType]}15` }}>
                          {ASSET_TYPE_LABELS[h.assetType]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-200 dark:border-slate-800/80 py-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Value</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(h.currentValue, h.currency as CurrencyCode)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">Unrealized P&L</span>
                          <span className={`font-bold ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isProfit ? '+' : ''}{formatCurrency(h.unrealizedPnL, h.currency as CurrencyCode)} ({formatPercent(h.unrealizedPnLPercent)})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Units</span>
                          <span className="font-semibold">{h.unitsHeld}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">WAC / Price</span>
                          <span className="font-semibold">
                            {formatCurrency(h.averageBuyPrice, h.currency as CurrencyCode)} / {formatCurrency(h.currentPrice, h.currency as CurrencyCode)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <CustomButton variant="ghost" size="sm" onClick={() => handleOpenRecordTx(h)}>
                          Trade
                        </CustomButton>
                        <CustomButton variant="ghost" size="sm" onClick={() => handleOpenUpdatePrice(h)}>
                          Price
                        </CustomButton>
                        <CustomButton variant="ghost" size="sm" onClick={() => handleOpenDetail(h)}>
                          Details
                        </CustomButton>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------
          TAB 2: Transaction History Ledger View
         ------------------------------------------------------------------- */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedHoldingFilter}
                onChange={(e) => setSelectedHoldingFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Holdings</option>
                {holdings.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.symbol} - {h.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedTxTypeFilter}
                onChange={(e) => setSelectedTxTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {Object.keys(TX_TYPE_COLORS).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Transactions Recorded</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">Record buy, sell, or split events to build your immutable trade history ledger.</p>
              <CustomButton variant="primary" size="sm" onClick={() => handleOpenRecordTx()}>
                Record First Trade
              </CustomButton>
            </GlassCard>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-100/50 dark:bg-slate-800/50">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Holding</th>
                    <th className="py-3.5 px-4 text-right">Quantity</th>
                    <th className="py-3.5 px-4 text-right">Unit Price</th>
                    <th className="py-3.5 px-4 text-right">Fees</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 text-right">Realized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
                  {filteredTransactions.map((t) => {
                    const h = holdings.find((holding) => holding.id === t.holdingId);
                    const txColor = TX_TYPE_COLORS[t.transactionType] || { bg: 'bg-slate-800', text: 'text-slate-300' };
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 text-slate-400 font-medium whitespace-nowrap">
                          {formatDate(t.transactionDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${txColor.bg} ${txColor.text}`}>
                            {t.transactionType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          {h ? h.symbol : 'Holding'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {t.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {formatCurrency(t.price, t.currency as CurrencyCode)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          {formatCurrency(t.fees, t.currency as CurrencyCode)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          {formatCurrency(t.amount, t.currency as CurrencyCode)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {t.realizedPnL !== undefined && t.realizedPnL !== null ? (
                            <span className={`font-bold ${t.realizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {t.realizedPnL >= 0 ? '+' : ''}
                              {formatCurrency(t.realizedPnL, t.currency as CurrencyCode)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------
          TAB 3: Analytics & Goals
         ------------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {holdings.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart2 className="w-10 h-10 text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Holdings to Unlock Analytics</h3>
              <p className="text-xs text-slate-400 mt-1">Growth projections, diversification scores, and goal tracking will appear here.</p>
            </GlassCard>
          ) : (
            <>
              {/* ---- Row 1: Diversification & Risk Score ---- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Diversification Score */}
                <GlassCard className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Diversification Score</h3>
                  </div>
                  {analyticsScore && (
                    <>
                      <div className="flex items-end gap-3">
                        <span className="text-5xl font-extrabold text-slate-900 dark:text-white">{analyticsScore.diversificationScore}</span>
                        <span className={`text-sm font-bold mb-2 ${analyticsScore.divInfo.color}`}>{analyticsScore.divInfo.label}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                          style={{ width: `${analyticsScore.diversificationScore}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Across {analyticsScore.numTypes} asset class{analyticsScore.numTypes !== 1 ? 'es' : ''} · {holdings.length} position{holdings.length !== 1 ? 's' : ''}
                      </div>
                    </>
                  )}
                </GlassCard>

                {/* Risk Score */}
                <GlassCard className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Portfolio Risk Score</h3>
                  </div>
                  {analyticsScore && (
                    <>
                      <div className="flex items-end gap-3">
                        <span className="text-5xl font-extrabold text-slate-900 dark:text-white">{analyticsScore.riskScore}</span>
                        <span className={`text-sm font-bold mb-2 ${analyticsScore.riskInfo.color}`}>{analyticsScore.riskInfo.label}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${analyticsScore.riskInfo.bg}`}
                          style={{ width: `${analyticsScore.riskScore}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Based on asset class volatility weights
                      </div>
                    </>
                  )}
                </GlassCard>

                {/* AI Insights */}
                <GlassCard className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Portfolio Insights</h3>
                  </div>
                  {analyticsScore && (
                    <ul className="space-y-2">
                      {analyticsScore.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  )}
                </GlassCard>
              </div>

              {/* ---- Row 2: Growth Projection Simulator ---- */}
              <GlassCard>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Growth Projection Simulator</h3>
                    <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">Nominal vs Real Returns</span>
                  </div>
                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <label>CAGR %</label>
                      <input
                        type="number"
                        min={1} max={40}
                        value={projectionCAGR}
                        onChange={e => setProjectionCAGR(Math.max(1, Math.min(40, Number(e.target.value))))}
                        className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label>Inflation %</label>
                      <input
                        type="number"
                        min={0} max={20}
                        value={projectionInflation}
                        onChange={e => setProjectionInflation(Math.max(0, Math.min(20, Number(e.target.value))))}
                        className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label>Years</label>
                      <select
                        value={projectionYears}
                        onChange={e => setProjectionYears(Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        {[5, 10, 15, 20, 25, 30].map(y => <option key={y} value={y}>{y}Y</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Projected Values Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Nominal Value</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                      {projectionData.length > 0 && formatCurrency(projectionData[projectionData.length - 1].nominal, userCurrency as CurrencyCode)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">In {projectionYears} years at {projectionCAGR}% CAGR</div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Real Value</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                      {projectionData.length > 0 && formatCurrency(projectionData[projectionData.length - 1].real, userCurrency as CurrencyCode)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">Inflation-adjusted ({projectionInflation}%)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Net Real Gain</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                      {projectionData.length > 0 && formatCurrency(
                        projectionData[projectionData.length - 1].real - projectionData[0].real,
                        userCurrency as CurrencyCode
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">Above inflation-adjusted cost</div>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={v => {
                          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                          return String(v);
                        }}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          formatCurrency(Number(val), userCurrency as CurrencyCode),
                          name === 'nominal' ? 'Nominal Value' : name === 'real' ? 'Real Value (Inflation-adj)' : 'Cost Basis',
                        ]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Area type="monotone" dataKey="nominal" stroke="#10b981" strokeWidth={2} fill="url(#nominalGrad)" dot={false} />
                      <Area type="monotone" dataKey="real" stroke="#3b82f6" strokeWidth={2} fill="url(#realGrad)" dot={false} strokeDasharray="5 3" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 justify-center text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-emerald-500" /> Nominal</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed #3b82f6' }} /> Real (inflation-adj)</span>
                </div>
              </GlassCard>

              {/* ---- Row 3: Goal-Tagged Holdings ---- */}
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Goal-Linked Holdings</h3>
                  <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    Tag holdings in the Holdings tab → Details
                  </span>
                </div>

                {analyticsScore && Object.keys(analyticsScore.goalGroups).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(analyticsScore.goalGroups).map(([tag, group]) => (
                      <div key={tag} className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">{tag}</span>
                        </div>
                        <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mb-2">
                          {formatCurrency(group.totalValue, userCurrency as CurrencyCode)}
                        </div>
                        <div className="space-y-1">
                          {group.holdings.map(h => (
                            <div key={h.id} className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span>{h.symbol}</span>
                              <span>{formatCurrency(h.currentValue, userCurrency as CurrencyCode)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Target className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No goal-tagged holdings yet.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Open any holding's Details modal to assign a goal tag (e.g. "Dream Home", "Retirement").</p>
                  </div>
                )}
              </GlassCard>
            </>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODAL 1: Add Holding
         ------------------------------------------------------------------- */}
      {isAddHoldingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <GlassCard className="w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Add Investment Holding
              </h3>
              <button
                onClick={() => setIsAddHoldingOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddHoldingSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <CustomInput
                  label="Ticker Symbol *"
                  placeholder="e.g. AAPL, INFY, BTC"
                  value={addHoldingForm.symbol}
                  onChange={(e) => setAddHoldingForm({ ...addHoldingForm, symbol: e.target.value })}
                  required
                />
                <CustomInput
                  label="Instrument Name *"
                  placeholder="e.g. Apple Inc."
                  value={addHoldingForm.name}
                  onChange={(e) => setAddHoldingForm({ ...addHoldingForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">Asset Type *</label>
                  <select
                    value={addHoldingForm.assetType}
                    onChange={(e) => setAddHoldingForm({ ...addHoldingForm, assetType: e.target.value as AssetType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                  >
                    {Object.entries(ASSET_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">Currency</label>
                  <select
                    value={addHoldingForm.currency}
                    onChange={(e) => setAddHoldingForm({ ...addHoldingForm, currency: e.target.value as CurrencyCode })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {Object.keys(currencies).map((code) => (
                      <option key={code} value={code}>
                        {code} ({currencies[code as CurrencyCode].symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Goal selector row */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Linked Goal (Optional)</label>
                <select
                  value={addHoldingForm.goalId}
                  onChange={(e) => setAddHoldingForm({ ...addHoldingForm, goalId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">-- No Goal --</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CustomInput
                  label="Broker / Source Tag"
                  placeholder="MANUAL, ZERODHA"
                  value={addHoldingForm.brokerCode}
                  onChange={(e) => setAddHoldingForm({ ...addHoldingForm, brokerCode: e.target.value.toUpperCase() })}
                />
                <CustomInput
                  label="Current Price"
                  placeholder="0.00"
                  type="number"
                  step="any"
                  value={addHoldingForm.currentPrice}
                  onChange={(e) => setAddHoldingForm({ ...addHoldingForm, currentPrice: e.target.value })}
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-3">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  Optional Initial Purchase (Records first BUY trade)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <CustomInput
                    label="Initial Units"
                    placeholder="0"
                    type="number"
                    step="any"
                    value={addHoldingForm.initialQuantity}
                    onChange={(e) => setAddHoldingForm({ ...addHoldingForm, initialQuantity: e.target.value })}
                  />
                  <CustomInput
                    label="Initial Unit Price"
                    placeholder="0.00"
                    type="number"
                    step="any"
                    value={addHoldingForm.initialPrice}
                    onChange={(e) => setAddHoldingForm({ ...addHoldingForm, initialPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <CustomButton type="button" variant="ghost" onClick={() => setIsAddHoldingOpen(false)}>
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Create Holding'}
                </CustomButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODAL 2: Record Transaction
         ------------------------------------------------------------------- */}
      {isRecordTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <GlassCard className="w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Record Trade / Event
              </h3>
              <button onClick={() => setIsRecordTxOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordTxSubmit} className="space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Select Holding *</label>
                <select
                  value={recordTxForm.holdingId}
                  onChange={(e) => {
                    const h = holdings.find((holding) => holding.id === e.target.value);
                    setSelectedHoldingForTx(h || null);
                    setRecordTxForm({
                      ...recordTxForm,
                      holdingId: e.target.value,
                      price: h ? String(h.currentPrice) : recordTxForm.price,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choose Holding --</option>
                  {holdings.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.symbol} - {h.name} (Units: {h.unitsHeld})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Transaction Type *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'FEE', 'TRANSFER_IN', 'TRANSFER_OUT'] as TransactionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRecordTxForm({ ...recordTxForm, transactionType: t })}
                      className={`py-1.5 px-2 rounded-lg font-extrabold text-[10px] border cursor-pointer ${
                        recordTxForm.transactionType === t
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CustomInput
                  label="Quantity / Units *"
                  placeholder="0.0"
                  type="number"
                  step="any"
                  value={recordTxForm.quantity}
                  onChange={(e) => setRecordTxForm({ ...recordTxForm, quantity: e.target.value })}
                  required
                />
                <CustomInput
                  label={recordTxForm.transactionType === 'SPLIT' ? 'Split Ratio (e.g. 2 for 2:1) *' : 'Unit Price *'}
                  placeholder="0.00"
                  type="number"
                  step="any"
                  value={recordTxForm.price}
                  onChange={(e) => setRecordTxForm({ ...recordTxForm, price: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CustomInput
                  label="Fees / Brokerage"
                  placeholder="0.00"
                  type="number"
                  step="any"
                  value={recordTxForm.fees}
                  onChange={(e) => setRecordTxForm({ ...recordTxForm, fees: e.target.value })}
                />
                <CustomInput
                  label="Execution Date & Time"
                  type="datetime-local"
                  value={recordTxForm.transactionDate}
                  onChange={(e) => setRecordTxForm({ ...recordTxForm, transactionDate: e.target.value })}
                  required
                />
              </div>

              <CustomInput
                label="External Order ID (Optional)"
                placeholder="e.g. zerodha-trade-12345"
                value={recordTxForm.externalTransactionId}
                onChange={(e) => setRecordTxForm({ ...recordTxForm, externalTransactionId: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <CustomButton type="button" variant="ghost" onClick={() => setIsRecordTxOpen(false)}>
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? 'Recording...' : 'Submit Transaction'}
                </CustomButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODAL 3: Update Market Price
         ------------------------------------------------------------------- */}
      {isUpdatePriceOpen && holdingToUpdatePrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <GlassCard className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-500" />
                Update Price — {holdingToUpdatePrice.symbol}
              </h3>
              <button onClick={() => setIsUpdatePriceOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
              Prices are manually updated unless an external live market data feed is configured.
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdatePriceSubmit} className="space-y-4 text-xs">
              <CustomInput
                label={`New Market Price (${holdingToUpdatePrice.currency}) *`}
                type="number"
                step="any"
                value={newMarketPrice}
                onChange={(e) => setNewMarketPrice(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <CustomButton type="button" variant="ghost" onClick={() => setIsUpdatePriceOpen(false)}>
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? 'Updating...' : 'Save Price'}
                </CustomButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODAL 4: Holding Detail & Lifecycle Status
         ------------------------------------------------------------------- */}
      {isDetailOpen && selectedDetailHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <GlassCard className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                  {selectedDetailHolding.symbol}
                </span>
                <span className="text-xs font-semibold text-slate-400 truncate max-w-[150px]">
                  {selectedDetailHolding.name}
                </span>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-slate-400 block font-semibold">Asset Type</span>
                <span className="font-bold">{ASSET_TYPE_LABELS[selectedDetailHolding.assetType]}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Broker Code</span>
                <span className="font-bold">{selectedDetailHolding.brokerCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Units Held</span>
                <span className="font-bold">{selectedDetailHolding.unitsHeld}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">WAC Buy Price</span>
                <span className="font-bold">{formatCurrency(selectedDetailHolding.averageBuyPrice, selectedDetailHolding.currency as CurrencyCode)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Market Value</span>
                <span className="font-bold">{formatCurrency(selectedDetailHolding.currentValue, selectedDetailHolding.currency as CurrencyCode)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Unrealized P&L</span>
                <span className={`font-bold ${(selectedDetailHolding.unrealizedPnL || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(selectedDetailHolding.unrealizedPnL, selectedDetailHolding.currency as CurrencyCode)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 block">Position Status Lifecycle</span>
              <div className="flex gap-2">
                {(['active', 'closed', 'archived'] as HoldingStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleToggleStatus(selectedDetailHolding, st)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold capitalize border cursor-pointer ${
                      selectedDetailHolding.status === st
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal Tag Section */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-purple-500" /> Linked Goal</span>
              <div className="flex gap-2">
                <select
                  value={editGoalId || selectedDetailHolding.goalId || ''}
                  onChange={e => setEditGoalId(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">-- No Goal --</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <CustomButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (selectedDetailHolding) {
                      const res = await updateHolding(selectedDetailHolding.id, { goalId: editGoalId || undefined });
                      if (res.success) {
                        setSelectedDetailHolding({ ...selectedDetailHolding, goalId: editGoalId || undefined });
                      }
                    }
                  }}
                  className="text-purple-500 border-purple-500/30"
                >
                  Save
                </CustomButton>
              </div>
              {selectedDetailHolding.goalId && (
                <div className="flex items-center gap-1 text-[10px] text-purple-500 font-semibold">
                  <Tag className="w-3 h-3" /> Currently linked: {goals.find(g => g.id === selectedDetailHolding.goalId)?.name || 'Unknown'}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={() => handleDeleteHoldingClick(selectedDetailHolding.id)}
                className="text-xs text-red-500 hover:underline font-bold cursor-pointer"
              >
                Delete Holding (Empty Only)
              </button>

              <CustomButton variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>
                Close
              </CustomButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
