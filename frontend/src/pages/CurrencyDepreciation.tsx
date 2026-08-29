import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  Info,
  DollarSign,
  ChevronDown,
  BarChart2,
  Plus,
  X,
} from 'lucide-react';
import { GlassCard, CustomButton } from '../components/UI';
import { useCurrencyRates, useCurrencyHistory, Period } from '../hooks/useCurrencyRates';
import { currencies, CurrencyCode, formatCurrency, getCurrencySymbol } from '../utils/formatters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_CURRENCY_CODES = Object.keys(currencies) as CurrencyCode[];

const PERIODS: { label: string; value: Period }[] = [
  { label: '1 Year', value: '1y' },
  { label: '3 Years', value: '3y' },
  { label: '5 Years', value: '5y' },
  { label: '10 Years', value: '10y' },
];

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b'];
const COMPARE_COLORS = ['#3b82f6', '#f59e0b'];

function CurrencySelect({
  label,
  value,
  onChange,
  exclude = [],
  id,
}: {
  label: string;
  value: CurrencyCode;
  onChange: (v: CurrencyCode) => void;
  exclude?: CurrencyCode[];
  id: string;
}) {
  const available = ALL_CURRENCY_CODES.filter((c) => !exclude.includes(c));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as CurrencyCode)}
          className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition-all"
        >
          {available.map((code) => (
            <option key={code} value={code}>
              {code} — {currencies[code].name} ({currencies[code].symbol})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Historical Chart for a single pair
// ---------------------------------------------------------------------------

function HistoricalPairChart({
  base,
  target,
  period,
  color,
}: {
  base: CurrencyCode;
  target: CurrencyCode;
  period: Period;
  color: string;
}) {
  const { data, loading, error, refetch } = useCurrencyHistory(base, target, period);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading historical data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-amber-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{error}</p>
        <CustomButton variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </CustomButton>
      </div>
    );
  }

  if (!data || data.data_points.length === 0) return null;

  const { summary } = data;
  const changePositive = summary.change_pct > 0;
  const changeNeutral = summary.change_pct === 0;

  const ChangeIcon = changePositive ? TrendingUp : changeNeutral ? Minus : TrendingDown;
  const changeColor = changePositive
    ? 'text-emerald-500'
    : changeNeutral
    ? 'text-slate-400'
    : 'text-red-500';

  // Build merged chart data (keyed by date)
  const chartPoints = data.data_points.map((p) => ({
    date: p.date,
    rate: p.rate,
  }));

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            {summary.first_date.slice(0, 7)}
          </p>
          <p className="text-base font-black text-slate-700 dark:text-slate-200 mt-0.5">
            {summary.first_rate.toFixed(4)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Today</p>
          <p className="text-base font-black text-slate-700 dark:text-slate-200 mt-0.5">
            {summary.last_rate.toFixed(4)}
          </p>
        </div>
        <div
          className={`rounded-xl p-3 text-center border ${
            changePositive
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40'
              : changeNeutral
              ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40'
          }`}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase">Change</p>
          <p className={`text-base font-black mt-0.5 flex items-center justify-center gap-1 ${changeColor}`}>
            <ChangeIcon className="w-3.5 h-3.5" />
            {Math.abs(summary.change_pct).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Direction text */}
      <p className="text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-emerald-500/40 pl-3">
        {summary.direction}
      </p>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => v.slice(0, 7)}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => v.toFixed(2)}
              width={52}
            />
            <RechartTooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f8fafc',
                fontSize: '12px',
              }}
              formatter={(val: any) => [`${Number(val).toFixed(4)}`, `${base}/${target}`]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Combined multi-currency chart
// ---------------------------------------------------------------------------

function MultiCurrencyChart({
  base,
  targets,
  period,
}: {
  base: CurrencyCode;
  targets: CurrencyCode[];
  period: Period;
}) {
  const hist1 = useCurrencyHistory(base, targets[0], period);
  const hist2 = useCurrencyHistory(base, targets[1] ?? targets[0], period);

  const isLoading = hist1.loading || (targets.length > 1 && hist2.loading);
  const hasError = hist1.error || (targets.length > 1 && hist2.error);

  // Merge both series into one dataset keyed by date
  const merged = useMemo(() => {
    if (!hist1.data) return [];
    // Use a plain object type to avoid TS index signature conflicts
    const map = new Map<string, { date_: string; [key: string]: string | number }>();
    hist1.data.data_points.forEach((p) => {
      map.set(p.date, { date_: p.date, [targets[0]]: p.rate });
    });
    if (targets.length > 1 && hist2.data) {
      hist2.data.data_points.forEach((p) => {
        const existing = map.get(p.date) ?? { date_: p.date };
        existing[targets[1]] = p.rate;
        map.set(p.date, existing);
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.date_).localeCompare(String(b.date_))
    );
  }, [hist1.data, hist2.data, targets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-56 gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading chart data…</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertCircle className="w-7 h-7 text-amber-500" />
        <p className="text-sm text-slate-500">
          Unable to load chart data. Please try again.
        </p>
        <CustomButton variant="ghost" size="sm" onClick={hist1.refetch}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </CustomButton>
      </div>
    );
  }

  if (merged.length === 0) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
          <XAxis
            dataKey="date_"
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            tickFormatter={(v) => v.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            domain={['auto', 'auto']}
            width={55}
          />
          <RechartTooltip
            contentStyle={{
              backgroundColor: 'rgba(15,23,42,0.95)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f8fafc',
              fontSize: '12px',
            }}
            labelFormatter={(l) => `Date: ${l}`}
            formatter={(val: unknown, name: unknown) => [`${Number(val).toFixed(4)}`, `${base}/${String(name)}`]}
          />
          <Legend
            formatter={(value) => `${base}/${value}`}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          {targets.map((t, i) => (
            <Line
              key={t}
              type="monotone"
              dataKey={t}
              stroke={CHART_COLORS[i]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Currency Depreciation Page
// ---------------------------------------------------------------------------

export const CurrencyDepreciation: React.FC = () => {
  const [base, setBase] = useState<CurrencyCode>('USD');
  const [compare1, setCompare1] = useState<CurrencyCode>('INR');
  const [compare2, setCompare2] = useState<CurrencyCode>('AED');
  const [showThird, setShowThird] = useState(false);
  const [period, setPeriod] = useState<Period>('1y');
  const [convertAmount, setConvertAmount] = useState<string>('1000');

  // Current rates
  const { data: ratesData, loading: ratesLoading, error: ratesError, refetch: refetchRates } =
    useCurrencyRates(base);

  const compareTargets: CurrencyCode[] = showThird ? [compare1, compare2] : [compare1];

  const rate1 = ratesData?.rates[compare1];
  const rate2 = showThird ? ratesData?.rates[compare2] : undefined;

  const parsedAmount = parseFloat(convertAmount) || 0;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          Currency Depreciation
          <BarChart2 className="w-6 h-6 text-emerald-500" />
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          Compare live exchange rates, track historical currency depreciation and appreciation.
        </p>
      </div>

      {/* ── Currency Selectors ── */}
      <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
        <h2 className="text-base font-bold mb-5 text-slate-700 dark:text-slate-200">
          Select Currencies to Compare
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          <CurrencySelect
            id="base-currency"
            label="Base Currency"
            value={base}
            onChange={setBase}
            exclude={[compare1, ...(showThird ? [compare2] : [])]}
          />
          <div>
            <CurrencySelect
              id="compare-currency-1"
              label="Compare Currency"
              value={compare1}
              onChange={setCompare1}
              exclude={[base, ...(showThird ? [compare2] : [])]}
            />
          </div>
          {showThird ? (
            <div className="relative">
              <CurrencySelect
                id="compare-currency-2"
                label="Third Currency"
                value={compare2}
                onChange={setCompare2}
                exclude={[base, compare1]}
              />
              <button
                onClick={() => setShowThird(false)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                title="Remove third currency"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowThird(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer self-end"
            >
              <Plus className="w-4 h-4" />
              Add 3rd Currency
            </button>
          )}

          {/* Period selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Historical Period
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === p.value
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Live Rates ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Rates Card */}
        <GlassCard className="lg:col-span-1 border border-slate-200/50 dark:border-slate-800/40 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Live Rates
            </h2>
            <button
              onClick={refetchRates}
              disabled={ratesLoading}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh rates"
            >
              <RefreshCw className={`w-4 h-4 ${ratesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {ratesError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{ratesError}</span>
            </div>
          )}

          {ratesLoading && !ratesData && (
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Fetching live rates…</span>
            </div>
          )}

          {ratesData && (
            <>
              {/* Rate display blocks */}
              {[compare1, ...(showThird ? [compare2] : [])].map((target, i) => {
                const rate = ratesData.rates[target];
                return (
                  <div
                    key={target}
                    className="p-4 rounded-xl"
                    style={{ background: `${COMPARE_COLORS[i]}10`, border: `1px solid ${COMPARE_COLORS[i]}30` }}
                  >
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      1 {base} =
                    </p>
                    <p className="text-2xl font-black mt-1" style={{ color: COMPARE_COLORS[i] }}>
                      {rate != null ? rate.toFixed(4) : '—'} {target}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {getCurrencySymbol(target)} {currencies[target].name}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </GlassCard>

        {/* Amount Converter */}
        <GlassCard className="lg:col-span-2 border border-slate-200/50 dark:border-slate-800/40">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Amount Converter
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {getCurrencySymbol(base)}
                </span>
                <input
                  id="convert-amount"
                  type="text"
                  inputMode="numeric"
                  value={convertAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setConvertAmount(v);
                  }}
                  placeholder="1000"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <span className="text-sm font-bold text-slate-400">{base} converts to:</span>
            </div>

            {ratesData && parsedAmount > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {compareTargets.map((target, i) => {
                  const rate = ratesData.rates[target];
                  const converted = rate != null ? parsedAmount * rate : null;
                  return (
                    <div
                      key={target}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                    >
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        {currencies[target].name}
                      </p>
                      <p className="text-xl font-black" style={{ color: COMPARE_COLORS[i] }}>
                        {converted != null
                          ? formatCurrency(converted, target)
                          : '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Rate: 1 {base} = {rate?.toFixed(4) ?? '—'} {target}
                      </p>
                    </div>
                  );
                })}

                {/* Also show common currencies */}
                {(['EUR', 'GBP', 'JPY'] as CurrencyCode[])
                  .filter(c => c !== base && !compareTargets.includes(c))
                  .map(target => {
                    const rate = ratesData.rates[target];
                    const converted = rate != null ? parsedAmount * rate : null;
                    return (
                      <div
                        key={target}
                        className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20"
                      >
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                          {currencies[target].name}
                        </p>
                        <p className="text-xl font-black text-slate-600 dark:text-slate-300">
                          {converted != null ? formatCurrency(converted, target) : '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          1 {base} = {rate?.toFixed(4) ?? '—'} {target}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}

            {(!ratesData || parsedAmount <= 0) && !ratesLoading && (
              <p className="text-sm text-slate-400 italic">
                {parsedAmount <= 0
                  ? 'Enter an amount above to see conversions.'
                  : 'Loading rates…'}
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Combined Historical Chart ── */}
      <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
        <h2 className="text-base font-bold mb-2 text-slate-700 dark:text-slate-200">
          {base} vs {compareTargets.join(' vs ')} — Historical Rate Chart
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Showing {PERIODS.find(p => p.value === period)?.label ?? period} of exchange rate history.
        </p>
        <MultiCurrencyChart base={base} targets={compareTargets} period={period} />
      </GlassCard>

      {/* ── Per-Pair Detailed Analysis ── */}
      <div className={`grid grid-cols-1 ${showThird ? 'lg:grid-cols-2' : ''} gap-6`}>
        {compareTargets.map((target, i) => (
          <GlassCard key={target} className="border border-slate-200/50 dark:border-slate-800/40 space-y-5">
            <h3 className="text-base font-bold" style={{ color: COMPARE_COLORS[i] }}>
              {base} / {target} Analysis
            </h3>
            <HistoricalPairChart
              base={base}
              target={target}
              period={period}
              color={COMPARE_COLORS[i]}
            />
          </GlassCard>
        ))}
      </div>

      {/* ── Educational Section ── */}
      <GlassCard className="border border-slate-200/50 dark:border-slate-800/40">
        <div className="flex items-center gap-2 mb-5">
          <Info className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Understanding Currency Movements
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: <TrendingDown className="w-5 h-5 text-red-500" />,
              title: 'Currency Depreciation',
              body:
                'A currency depreciates when it loses value against another currency. Example: If 1 USD bought ₹75 last year but only ₹70 today, INR has appreciated (USD weakened).',
            },
            {
              icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
              title: 'Currency Appreciation',
              body:
                'A currency appreciates when it gains value. If the base currency rate increases, the base has strengthened. If it decreases, the base has weakened against the target.',
            },
            {
              icon: <BarChart2 className="w-5 h-5 text-blue-500" />,
              title: 'Exchange Rate Drivers',
              body:
                'Rates are influenced by interest rate differentials, inflation, trade balances, political stability, central bank policy, and global market sentiment.',
            },
            {
              icon: <DollarSign className="w-5 h-5 text-amber-500" />,
              title: 'Inflation & Currency',
              body:
                'High inflation in a country tends to weaken its currency over time. A country with lower inflation typically sees its currency appreciate relative to higher-inflation countries.',
            },
            {
              icon: <Info className="w-5 h-5 text-purple-500" />,
              title: 'Base vs. Quote Currency',
              body:
                'In a currency pair like USD/INR, USD is the base and INR is the quote. The rate tells you how many INR you need to buy 1 USD. Changing the base currency flips the perspective.',
            },
            {
              icon: <TrendingUp className="w-5 h-5 text-rose-500" />,
              title: 'Purchasing Power Impact',
              body:
                'Exchange rates directly affect international purchasing power. A stronger home currency means imports are cheaper and overseas travel costs less, but exports become more expensive.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800"
            >
              <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
          <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
            <strong>Note:</strong> Exchange rates shown are indicative and fetched from public data
            providers (ECB via Frankfurter or ExchangeRate-API). They may differ slightly from
            interbank or retail rates. Always verify with your bank or broker for actual transaction
            rates.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};
