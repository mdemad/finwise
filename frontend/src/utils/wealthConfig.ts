// FinWise — Centralized Wealth & Net Worth Configuration
// Contains 16 Asset Categories, 8 Liability Categories,
// Macro Asset Groups, Liquidity Classifications, and Deterministic Scoring Engine.

import { CurrencyCode } from './formatters';

export type LiquidityType = 'liquid' | 'illiquid';

export type MacroGroupId = 'growth' | 'defensive' | 'real_assets' | 'cash_liquidity' | 'alternative';

export interface AssetCategoryConfig {
  id: string;
  name: string;
  shortName: string;
  liquidity: LiquidityType;
  group: MacroGroupId;
  color: string;
  description: string;
  iconName: string;
  unitLabel?: string; // e.g. "Grams", "Shares", "Coins", "Sq Ft"
}

export interface LiabilityCategoryConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  description: string;
  iconName: string;
}

export interface MacroGroupConfig {
  id: MacroGroupId;
  name: string;
  color: string;
  description: string;
}

export const MACRO_GROUPS: Record<MacroGroupId, MacroGroupConfig> = {
  growth: {
    id: 'growth',
    name: 'Growth Assets',
    color: '#3b82f6', // Blue
    description: 'Equities, high-growth vehicles & business equity for capital appreciation',
  },
  defensive: {
    id: 'defensive',
    name: 'Defensive / Store-of-Value',
    color: '#eab308', // Amber/Gold
    description: 'Gold, silver, bonds & fixed deposits providing stability & capital preservation',
  },
  real_assets: {
    id: 'real_assets',
    name: 'Real Assets',
    color: '#f97316', // Orange
    description: 'Tangible property, land, real estate, and physical vehicles',
  },
  cash_liquidity: {
    id: 'cash_liquidity',
    name: 'Cash / Liquidity',
    color: '#10b981', // Emerald
    description: 'Instant liquidity in bank checking, savings, and cash holdings',
  },
  alternative: {
    id: 'alternative',
    name: 'Alternative Assets',
    color: '#8b5cf6', // Violet
    description: 'Collectibles, custom investments, and specialized wealth holdings',
  },
};

export const ASSET_CATEGORIES: Record<string, AssetCategoryConfig> = {
  cash_bank: {
    id: 'cash_bank',
    name: 'Cash / Bank',
    shortName: 'Cash',
    liquidity: 'liquid',
    group: 'cash_liquidity',
    color: '#10b981',
    description: 'Checking, savings accounts and physical cash',
    iconName: 'Wallet',
  },
  stocks: {
    id: 'stocks',
    name: 'Stocks & Equities',
    shortName: 'Stocks',
    liquidity: 'liquid',
    group: 'growth',
    color: '#3b82f6',
    description: 'Direct company shares and listed equities',
    iconName: 'TrendingUp',
    unitLabel: 'Shares',
  },
  mutual_funds: {
    id: 'mutual_funds',
    name: 'Mutual Funds & ETFs',
    shortName: 'Mutual Funds',
    liquidity: 'liquid',
    group: 'growth',
    color: '#6366f1',
    description: 'Index funds, ETFs, and managed mutual portfolios',
    iconName: 'Layers',
    unitLabel: 'Units',
  },
  gold: {
    id: 'gold',
    name: 'Gold (Physical/Digital)',
    shortName: 'Gold',
    liquidity: 'illiquid',
    group: 'defensive',
    color: '#eab308',
    description: 'Sovereign gold, bullion, 24K/22K physical jewellery',
    iconName: 'Coins',
    unitLabel: 'Grams',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    shortName: 'Silver',
    liquidity: 'illiquid',
    group: 'defensive',
    color: '#94a3b8',
    description: 'Physical silver bars, coins, and utensils',
    iconName: 'Disc',
    unitLabel: 'Grams / Kg',
  },
  precious_assets: {
    id: 'precious_assets',
    name: 'Diamonds / Precious Assets',
    shortName: 'Precious Assets',
    liquidity: 'illiquid',
    group: 'defensive',
    color: '#a855f7',
    description: 'Diamonds, gemstones, fine jewelry & luxury timepieces',
    iconName: 'Gem',
    unitLabel: 'Items',
  },
  land: {
    id: 'land',
    name: 'Land & Plots',
    shortName: 'Land',
    liquidity: 'illiquid',
    group: 'real_assets',
    color: '#84cc16',
    description: 'Agricultural land, residential plots, and undeveloped terrain',
    iconName: 'MapPin',
    unitLabel: 'Sq Ft / Acres',
  },
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate / Property',
    shortName: 'Real Estate',
    liquidity: 'illiquid',
    group: 'real_assets',
    color: '#f97316',
    description: 'Residential apartments, commercial buildings, rental properties',
    iconName: 'Building',
    unitLabel: 'Units',
  },
  fixed_deposits: {
    id: 'fixed_deposits',
    name: 'Fixed Deposits (FD/CD)',
    shortName: 'Fixed Deposits',
    liquidity: 'liquid',
    group: 'cash_liquidity',
    color: '#06b6d4',
    description: 'Bank term deposits, certificates of deposit & recurring deposits',
    iconName: 'Lock',
  },
  bonds: {
    id: 'bonds',
    name: 'Bonds & Treasuries',
    shortName: 'Bonds',
    liquidity: 'liquid',
    group: 'defensive',
    color: '#14b8a6',
    description: 'Government bonds, corporate debentures, and sovereign debt',
    iconName: 'FileText',
    unitLabel: 'Bonds',
  },
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin (BTC)',
    shortName: 'Bitcoin',
    liquidity: 'liquid',
    group: 'growth',
    color: '#f59e0b',
    description: 'Bitcoin held on exchanges or cold storage',
    iconName: 'Bitcoin',
    unitLabel: 'BTC',
  },
  crypto: {
    id: 'crypto',
    name: 'Cryptocurrency / Web3',
    shortName: 'Crypto',
    liquidity: 'liquid',
    group: 'growth',
    color: '#ec4899',
    description: 'Ethereum, altcoins, stablecoins & decentralized digital assets',
    iconName: 'Cpu',
    unitLabel: 'Tokens',
  },
  vehicles: {
    id: 'vehicles',
    name: 'Vehicles & Automobiles',
    shortName: 'Vehicles',
    liquidity: 'illiquid',
    group: 'real_assets',
    color: '#64748b',
    description: 'Personal cars, electric vehicles, motorcycles & commercial fleet',
    iconName: 'Car',
    unitLabel: 'Vehicles',
  },
  business: {
    id: 'business',
    name: 'Business Ownership / Equity',
    shortName: 'Business',
    liquidity: 'illiquid',
    group: 'growth',
    color: '#8b5cf6',
    description: 'Private company shares, startup equity, partnership stakes',
    iconName: 'Briefcase',
    unitLabel: '% Share',
  },
  other: {
    id: 'other',
    name: 'Other Assets',
    shortName: 'Other',
    liquidity: 'illiquid',
    group: 'alternative',
    color: '#71717a',
    description: 'Art, collectibles, intellectual property, pension balances',
    iconName: 'Package',
  },
  custom: {
    id: 'custom',
    name: 'Custom Asset',
    shortName: 'Custom',
    liquidity: 'illiquid',
    group: 'alternative',
    color: '#0ea5e9',
    description: 'User-specified asset class',
    iconName: 'PlusCircle',
  },
};

export const LIABILITY_CATEGORIES: Record<string, LiabilityCategoryConfig> = {
  home_loan: {
    id: 'home_loan',
    name: 'Home Loan / Mortgage',
    shortName: 'Mortgage',
    color: '#ef4444',
    description: 'Primary or secondary residential mortgage loan',
    iconName: 'Home',
  },
  personal_loan: {
    id: 'personal_loan',
    name: 'Personal Loan',
    shortName: 'Personal',
    color: '#f43f5e',
    description: 'Unsecured personal loan from banks or lending institutions',
    iconName: 'UserCheck',
  },
  education_loan: {
    id: 'education_loan',
    name: 'Education / Student Loan',
    shortName: 'Education',
    color: '#fb7185',
    description: 'University and vocational study debt',
    iconName: 'GraduationCap',
  },
  vehicle_loan: {
    id: 'vehicle_loan',
    name: 'Vehicle / Auto Loan',
    shortName: 'Auto Loan',
    color: '#e11d48',
    description: 'Car, bike, or commercial vehicle financing balance',
    iconName: 'Car',
  },
  credit_card: {
    id: 'credit_card',
    name: 'Credit Card Outstanding',
    shortName: 'Credit Card',
    color: '#b91c1c',
    description: 'Revolving balance on all active credit cards',
    iconName: 'CreditCard',
  },
  business_loan: {
    id: 'business_loan',
    name: 'Business Loan',
    shortName: 'Business Loan',
    color: '#991b1b',
    description: 'Commercial lines of credit and enterprise borrowing',
    iconName: 'Building2',
  },
  other_debt: {
    id: 'other_debt',
    name: 'Other Debt / Informal',
    shortName: 'Other Debt',
    color: '#7f1d1d',
    description: 'Family loans, peer-to-peer debts, medical liabilities',
    iconName: 'Receipt',
  },
  custom: {
    id: 'custom',
    name: 'Custom Liability',
    shortName: 'Custom',
    color: '#dc2626',
    description: 'Custom user-specified liability category',
    iconName: 'MinusCircle',
  },
};

// Data Interfaces
export interface AssetItem {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: string;
  quantity?: string;
  currency: CurrencyCode;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiabilityItem {
  id: string;
  name: string;
  category: string;
  outstandingAmount: number;
  originalAmount?: number;
  interestRate?: number;
  emi?: number;
  remainingTenureMonths?: number;
  currency: CurrencyCode;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NetWorthSnapshot {
  id: string;
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  createdAt: string;
}

export interface CategoryAllocation {
  categoryId: string;
  name: string;
  shortName: string;
  value: number;
  percentage: number;
  color: string;
  liquidity: LiquidityType;
  group: MacroGroupId;
  count: number;
}

export interface GroupAllocation {
  groupId: MacroGroupId;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface DiversificationFactor {
  name: string;
  pts: number;
  note: string;
}

export interface DiversificationScore {
  score: number;
  maxScore: number;
  factors: DiversificationFactor[];
  categoryPoints: number;
  concentrationPoints: number;
  groupPoints: number;
  liquidityPoints: number;
}

export interface WealthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  debtToAssetRatio: number;
  liquidAssets: number;
  liquidPercent: number;
  illiquidAssets: number;
  illiquidPercent: number;
  assetCount: number;
  liabilityCount: number;
  categoryCount: number;
  categoryAllocation: CategoryAllocation[];
  groupAllocation: GroupAllocation[];
  liabilityAllocation: {
    categoryId: string;
    name: string;
    value: number;
    percentage: number;
    color: string;
    count: number;
  }[];
  largestCategory: {
    id: string;
    name: string;
    value: number;
    percentage: number;
  } | null;
  concentrationMessage: string;
  isConcentrated: boolean;
  diversificationScore: DiversificationScore;
}

/**
 * Deterministic Wealth & Diversification Calculation Engine
 */
export function calculateWealthSummary(
  assets: AssetItem[],
  liabilities: LiabilityItem[]
): WealthSummary {
  const totalAssets = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + (Number(l.outstandingAmount) || 0),
    0
  );
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio =
    totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 1000) / 10 : 0;

  // 1. Group by Category
  const catMap: Record<string, { value: number; count: number }> = {};
  let liquidAssets = 0;
  let illiquidAssets = 0;

  const groupMap: Record<MacroGroupId, number> = {
    growth: 0,
    defensive: 0,
    real_assets: 0,
    cash_liquidity: 0,
    alternative: 0,
  };

  assets.forEach(a => {
    const val = Number(a.currentValue) || 0;
    const catId = a.category in ASSET_CATEGORIES ? a.category : 'custom';
    const catCfg = ASSET_CATEGORIES[catId];

    if (!catMap[catId]) {
      catMap[catId] = { value: 0, count: 0 };
    }
    catMap[catId].value += val;
    catMap[catId].count += 1;

    if (catCfg.liquidity === 'liquid') {
      liquidAssets += val;
    } else {
      illiquidAssets += val;
    }

    groupMap[catCfg.group] = (groupMap[catCfg.group] || 0) + val;
  });

  // Build Category Allocations
  const categoryAllocation: CategoryAllocation[] = Object.entries(catMap)
    .map(([catId, data]) => {
      const cfg = ASSET_CATEGORIES[catId] || ASSET_CATEGORIES.custom;
      const percentage =
        totalAssets > 0 ? Math.round((data.value / totalAssets) * 1000) / 10 : 0;
      return {
        categoryId: catId,
        name: cfg.name,
        shortName: cfg.shortName,
        value: data.value,
        percentage,
        color: cfg.color,
        liquidity: cfg.liquidity,
        group: cfg.group,
        count: data.count,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Build Group Allocations
  const groupAllocation: GroupAllocation[] = Object.entries(groupMap)
    .filter(([_, val]) => val > 0)
    .map(([grpId, val]) => {
      const gCfg = MACRO_GROUPS[grpId as MacroGroupId];
      const percentage =
        totalAssets > 0 ? Math.round((val / totalAssets) * 1000) / 10 : 0;
      return {
        groupId: grpId as MacroGroupId,
        name: gCfg.name,
        value: val,
        percentage,
        color: gCfg.color,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Group Liabilities by Category
  const liabMap: Record<string, { value: number; count: number }> = {};
  liabilities.forEach(l => {
    const val = Number(l.outstandingAmount) || 0;
    const catId = l.category in LIABILITY_CATEGORIES ? l.category : 'custom';
    if (!liabMap[catId]) {
      liabMap[catId] = { value: 0, count: 0 };
    }
    liabMap[catId].value += val;
    liabMap[catId].count += 1;
  });

  const liabilityAllocation = Object.entries(liabMap)
    .map(([catId, data]) => {
      const cfg = LIABILITY_CATEGORIES[catId] || LIABILITY_CATEGORIES.custom;
      const percentage =
        totalLiabilities > 0
          ? Math.round((data.value / totalLiabilities) * 1000) / 10
          : 0;
      return {
        categoryId: catId,
        name: cfg.name,
        value: data.value,
        percentage,
        color: cfg.color,
        count: data.count,
      };
    })
    .sort((a, b) => b.value - a.value);

  const liquidPercent =
    totalAssets > 0 ? Math.round((liquidAssets / totalAssets) * 1000) / 10 : 0;
  const illiquidPercent =
    totalAssets > 0 ? Math.round((illiquidAssets / totalAssets) * 1000) / 10 : 0;

  // Largest Category & Concentration
  const largestCat = categoryAllocation[0] || null;
  const isConcentrated = largestCat ? largestCat.percentage >= 40.0 : false;
  let concentrationMessage = '';

  if (categoryAllocation.length === 0) {
    concentrationMessage = 'Add your assets to analyze diversification and concentration risk.';
  } else if (categoryAllocation.length === 1 && largestCat) {
    concentrationMessage = `100% of your current assets are concentrated in ${largestCat.name}. Adding additional asset categories over time can help build diversification resilience.`;
  } else if (isConcentrated && largestCat) {
    concentrationMessage = `Your portfolio has a relatively high concentration in ${largestCat.name} (${largestCat.percentage}%). This may reduce liquidity and increase exposure to ${largestCat.name.toLowerCase()} market conditions.`;
  } else if (largestCat) {
    concentrationMessage = `Your assets are distributed across ${categoryAllocation.length} categories with the largest (${largestCat.name}) at ${largestCat.percentage}%, reflecting a balanced allocation spread.`;
  }

  // FinWise Diversification Scoring
  const categoryCount = categoryAllocation.length;
  const maxConcentrationPct = largestCat ? largestCat.percentage : 0;
  const groupCount = groupAllocation.length;

  const factors: DiversificationFactor[] = [];

  // Pillar 1: Category Breadth (0-25 pts)
  let catPts = 0;
  if (categoryCount >= 5) {
    catPts = 25;
    factors.push({ name: 'Broad Category Spread', pts: 25, note: '5+ distinct asset categories held' });
  } else if (categoryCount === 4) {
    catPts = 20;
    factors.push({ name: 'Good Category Spread', pts: 20, note: '4 distinct asset categories held' });
  } else if (categoryCount === 3) {
    catPts = 15;
    factors.push({ name: 'Moderate Category Spread', pts: 15, note: '3 distinct asset categories held' });
  } else if (categoryCount === 2) {
    catPts = 10;
    factors.push({ name: 'Basic Category Spread', pts: 10, note: '2 distinct asset categories held' });
  } else if (categoryCount === 1) {
    catPts = 5;
    factors.push({ name: 'Single Category Exposure', pts: 5, note: 'Only 1 asset category held' });
  } else {
    catPts = 0;
    factors.push({ name: 'No Assets Recorded', pts: 0, note: 'Add assets to begin scoring' });
  }

  // Pillar 2: Concentration Risk Balance (0-30 pts)
  let concPts = 0;
  if (categoryCount === 0) {
    concPts = 0;
  } else if (maxConcentrationPct <= 25.0) {
    concPts = 30;
    factors.push({
      name: 'Well-Balanced Allocation',
      pts: 30,
      note: `Largest category is ${maxConcentrationPct}% (<= 25%)`,
    });
  } else if (maxConcentrationPct <= 40.0) {
    concPts = 25;
    factors.push({
      name: 'Moderate Concentration',
      pts: 25,
      note: `Largest category is ${maxConcentrationPct}% (<= 40%)`,
    });
  } else if (maxConcentrationPct <= 55.0) {
    concPts = 18;
    factors.push({
      name: 'Elevated Concentration',
      pts: 18,
      note: `Largest category is ${maxConcentrationPct}% (<= 55%)`,
    });
  } else if (maxConcentrationPct <= 70.0) {
    concPts = 10;
    factors.push({
      name: 'High Single-Asset Exposure',
      pts: 10,
      note: `Largest category is ${maxConcentrationPct}% (<= 70%)`,
    });
  } else {
    concPts = 4;
    factors.push({
      name: 'Heavy Asset Concentration',
      pts: 4,
      note: `Largest category is ${maxConcentrationPct}% (> 70%)`,
    });
  }

  // Pillar 3: Macro Group Spread (0-25 pts)
  let grpPts = 0;
  if (groupCount >= 3) {
    grpPts = 25;
    factors.push({
      name: 'Multi-Group Diversification',
      pts: 25,
      note: `${groupCount} macro asset groups represented`,
    });
  } else if (groupCount === 2) {
    grpPts = 15;
    factors.push({
      name: 'Dual-Group Spread',
      pts: 15,
      note: '2 macro asset groups represented',
    });
  } else if (groupCount === 1) {
    grpPts = 5;
    factors.push({
      name: 'Single Macro Group',
      pts: 5,
      note: 'Assets belong to only 1 macro group',
    });
  }

  // Pillar 4: Liquidity Health (0-20 pts)
  let liqPts = 0;
  if (categoryCount === 0) {
    liqPts = 0;
  } else if (liquidPercent >= 15.0 && liquidPercent <= 85.0) {
    liqPts = 20;
    factors.push({
      name: 'Optimal Liquidity Ratio',
      pts: 20,
      note: `${liquidPercent}% liquid assets (healthy 15-85% band)`,
    });
  } else if (liquidPercent < 15.0) {
    liqPts = 8;
    factors.push({
      name: 'Low Liquidity Buffer',
      pts: 8,
      note: `${liquidPercent}% liquid assets (below 15% safety threshold)`,
    });
  } else {
    liqPts = 12;
    factors.push({
      name: 'High Liquidity Concentration',
      pts: 12,
      note: `${liquidPercent}% liquid assets (potential cash drag)`,
    });
  }

  const score = Math.min(100, Math.max(0, catPts + concPts + grpPts + liqPts));

  const diversificationScore: DiversificationScore = {
    score,
    maxScore: 100,
    factors,
    categoryPoints: catPts,
    concentrationPoints: concPts,
    groupPoints: grpPts,
    liquidityPoints: liqPts,
  };

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    debtToAssetRatio,
    liquidAssets,
    liquidPercent,
    illiquidAssets,
    illiquidPercent,
    assetCount: assets.length,
    liabilityCount: liabilities.length,
    categoryCount,
    categoryAllocation,
    groupAllocation,
    liabilityAllocation,
    largestCategory: largestCat
      ? {
          id: largestCat.categoryId,
          name: largestCat.name,
          value: largestCat.value,
          percentage: largestCat.percentage,
        }
      : null,
    concentrationMessage,
    isConcentrated,
    diversificationScore,
  };
}
