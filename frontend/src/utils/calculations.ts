// FinWise Math Engine - Financial Calculations

export interface ChartDataPoint {
  label: string; // e.g. "Year 1", "Month 12"
  year: number;
  totalInvested: number;
  futureValue: number;
  inflationAdjusted?: number;
  realWealth?: number;
  interestPaid?: number;
  principalPaid?: number;
  remainingBalance?: number;
}

// 1. SIP Calculator
export interface SipInputs {
  monthlyInvestment: number;
  expectedReturn: number;
  durationYears: number;
  stepUpPercent: number;
  stepUpFrequency: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  inflationRate: number;
  adjustForInflation: boolean;
}

export interface SipResult {
  totalInvested: number;
  estimatedReturns: number;
  finalCorpus: number;
  inflationAdjustedCorpus: number;
  realWealthLoss: number;
  chartData: ChartDataPoint[];
}

export function calculateSip(inputs: SipInputs): SipResult {
  const {
    monthlyInvestment,
    expectedReturn,
    durationYears,
    stepUpPercent,
    stepUpFrequency,
    inflationRate,
  } = inputs;

  const totalMonths = durationYears * 12;
  const monthlyReturnRate = expectedReturn / 12 / 100;
  const monthlyInflationRate = inflationRate / 12 / 100;

  let currentMonthlyInvestment = monthlyInvestment;
  let finalCorpus = 0;
  let totalInvested = 0;
  let inflationAdjustedCorpus = 0;

  const chartData: ChartDataPoint[] = [];

  let stepUpMonths = 12;
  if (stepUpFrequency === 'monthly') stepUpMonths = 1;
  else if (stepUpFrequency === 'quarterly') stepUpMonths = 3;
  else if (stepUpFrequency === 'half-yearly') stepUpMonths = 6;

  for (let m = 1; m <= totalMonths; m++) {
    if (m > 1 && (m - 1) % stepUpMonths === 0) {
      currentMonthlyInvestment = currentMonthlyInvestment * (1 + stepUpPercent / 100);
    }

    finalCorpus = (finalCorpus + currentMonthlyInvestment) * (1 + monthlyReturnRate);
    totalInvested += currentMonthlyInvestment;

    inflationAdjustedCorpus = finalCorpus / Math.pow(1 + monthlyInflationRate, m);

    if (m % 12 === 0 || m === totalMonths) {
      const year = Math.ceil(m / 12);
      chartData.push({
        label: `Yr ${year}`,
        year,
        totalInvested: Math.round(totalInvested),
        futureValue: Math.round(finalCorpus),
        inflationAdjusted: Math.round(inflationAdjustedCorpus),
        realWealth: Math.round(inflationAdjustedCorpus),
      });
    }
  }

  const estimatedReturns = Math.max(0, finalCorpus - totalInvested);
  const realWealthLoss = Math.max(0, finalCorpus - inflationAdjustedCorpus);

  return {
    totalInvested: Math.round(totalInvested),
    estimatedReturns: Math.round(estimatedReturns),
    finalCorpus: Math.round(finalCorpus),
    inflationAdjustedCorpus: Math.round(inflationAdjustedCorpus),
    realWealthLoss: Math.round(realWealthLoss),
    chartData,
  };
}

// 2. Lump Sum Calculator
export interface LumpSumInputs {
  investmentAmount: number;
  expectedReturn: number;
  durationYears: number;
  inflationRate: number;
}

export interface LumpSumResult {
  futureValue: number;
  inflationAdjustedValue: number;
  realReturns: number;
  chartData: ChartDataPoint[];
}

export function calculateLumpSum(inputs: LumpSumInputs): LumpSumResult {
  const { investmentAmount, expectedReturn, durationYears, inflationRate } = inputs;

  const r = expectedReturn / 100;
  const inf = inflationRate / 100;

  const futureValue = investmentAmount * Math.pow(1 + r, durationYears);
  const inflationAdjustedValue = futureValue / Math.pow(1 + inf, durationYears);
  const realReturns = Math.max(0, inflationAdjustedValue - investmentAmount);

  const chartData: ChartDataPoint[] = [];
  for (let y = 1; y <= durationYears; y++) {
    const fv = investmentAmount * Math.pow(1 + r, y);
    const infVal = fv / Math.pow(1 + inf, y);
    chartData.push({
      label: `Yr ${y}`,
      year: y,
      totalInvested: investmentAmount,
      futureValue: Math.round(fv),
      inflationAdjusted: Math.round(infVal),
    });
  }

  return {
    futureValue: Math.round(futureValue),
    inflationAdjustedValue: Math.round(inflationAdjustedValue),
    realReturns: Math.round(realReturns),
    chartData,
  };
}

// 3. Inflation Calculator
export interface InflationInputs {
  currentCost: number;
  inflationRate: number;
  years: number;
}

export interface InflationResult {
  futureCost: number;
  purchasingPowerLoss: number;
  chartData: ChartDataPoint[];
}

export function calculateInflation(inputs: InflationInputs): InflationResult {
  const { currentCost, inflationRate, years } = inputs;
  const inf = inflationRate / 100;

  const futureCost = currentCost * Math.pow(1 + inf, years);
  const rawPurchasingPower = currentCost / Math.pow(1 + inf, years);
  const purchasingPowerLoss = Math.max(0, currentCost - rawPurchasingPower);

  const chartData: ChartDataPoint[] = [];
  for (let y = 1; y <= years; y++) {
    const fc = currentCost * Math.pow(1 + inf, y);
    const pp = currentCost / Math.pow(1 + inf, y);
    chartData.push({
      label: `Yr ${y}`,
      year: y,
      totalInvested: Math.round(pp),
      futureValue: Math.round(fc),
    });
  }

  return {
    futureCost: Math.round(futureCost),
    purchasingPowerLoss: Math.round(purchasingPowerLoss),
    chartData,
  };
}

// 4. Goal Planner
export interface GoalInputs {
  goalName: string;
  currentCost: number;
  yearsRemaining: number;
  inflationRate: number;
  expectedReturn: number;
}

export interface GoalResult {
  futureGoalCost: number;
  requiredMonthlySip: number;
  chartData: ChartDataPoint[];
}

export function calculateGoal(inputs: GoalInputs): GoalResult {
  const { currentCost, yearsRemaining, inflationRate, expectedReturn } = inputs;

  const futureGoalCost = currentCost * Math.pow(1 + inflationRate / 100, yearsRemaining);
  const totalMonths = yearsRemaining * 12;
  const r = expectedReturn / 12 / 100;

  let requiredMonthlySip = 0;
  if (r > 0) {
    requiredMonthlySip = (futureGoalCost * r) / (Math.pow(1 + r, totalMonths) - 1);
  } else {
    requiredMonthlySip = futureGoalCost / totalMonths;
  }

  const chartData: ChartDataPoint[] = [];
  let currentCorpus = 0;
  let totalInvested = 0;

  for (let y = 1; y <= yearsRemaining; y++) {
    const targetAtYear = currentCost * Math.pow(1 + inflationRate / 100, y);
    
    for (let m = 1; m <= 12; m++) {
      currentCorpus = (currentCorpus + requiredMonthlySip) * (1 + r);
      totalInvested += requiredMonthlySip;
    }

    chartData.push({
      label: `Yr ${y}`,
      year: y,
      totalInvested: Math.round(totalInvested),
      futureValue: Math.round(currentCorpus),
      inflationAdjusted: Math.round(targetAtYear),
    });
  }

  return {
    futureGoalCost: Math.round(futureGoalCost),
    requiredMonthlySip: Math.round(requiredMonthlySip),
    chartData,
  };
}

// 5. Retirement Planner
export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyInvestment: number;
  expectedReturnBeforeRetirement: number;
  expectedReturnAfterRetirement: number;
  inflationRate: number;
  monthlyExpensePostRetirement: number;
}

export interface RetirementResult {
  retirementCorpus: number;
  monthlyIncomeSupported: number;
  yearsSustained: number;
  isSustainable: boolean;
  chartData: ChartDataPoint[];
}

export function calculateRetirement(inputs: RetirementInputs): RetirementResult {
  const {
    currentAge,
    retirementAge,
    currentSavings,
    monthlyInvestment,
    expectedReturnBeforeRetirement,
    expectedReturnAfterRetirement,
    inflationRate,
    monthlyExpensePostRetirement,
  } = inputs;

  const yearsToRetire = retirementAge - currentAge;
  const monthlyReturnBefore = expectedReturnBeforeRetirement / 12 / 100;
  const monthlyReturnAfter = expectedReturnAfterRetirement / 12 / 100;

  let corpus = currentSavings;
  const totalMonthsAccumulation = yearsToRetire * 12;
  const chartData: ChartDataPoint[] = [];

  let totalInvestedAccum = currentSavings;

  for (let m = 1; m <= totalMonthsAccumulation; m++) {
    corpus = (corpus + monthlyInvestment) * (1 + monthlyReturnBefore);
    totalInvestedAccum += monthlyInvestment;

    if (m % 12 === 0) {
      const year = Math.ceil(m / 12);
      chartData.push({
        label: `Age ${currentAge + year}`,
        year: currentAge + year,
        totalInvested: Math.round(totalInvestedAccum),
        futureValue: Math.round(corpus),
      });
    }
  }

  const retirementCorpus = corpus;

  let inflatedExpense = monthlyExpensePostRetirement * Math.pow(1 + inflationRate / 100, yearsToRetire);
  let decumulationCorpus = retirementCorpus;
  let monthsSustained = 0;
  const maxYears = 50;

  const decumulationChart: ChartDataPoint[] = [];
  
  for (let y = 1; y <= maxYears; y++) {
    if (decumulationCorpus <= 0) break;

    for (let m = 1; m <= 12; m++) {
      if (decumulationCorpus <= 0) break;
      decumulationCorpus -= inflatedExpense;
      if (decumulationCorpus < 0) {
        decumulationCorpus = 0;
        break;
      }
      decumulationCorpus *= (1 + monthlyReturnAfter);
      monthsSustained++;
    }

    inflatedExpense *= (1 + inflationRate / 100);

    decumulationChart.push({
      label: `Age ${retirementAge + y}`,
      year: retirementAge + y,
      totalInvested: 0,
      futureValue: Math.round(decumulationCorpus),
    });
  }

  const monthlyIncomeSupported = (retirementCorpus * 0.04) / 12;
  const yearsSustained = Math.round((monthsSustained / 12) * 10) / 10;
  const isSustainable = yearsSustained >= 30;

  return {
    retirementCorpus: Math.round(retirementCorpus),
    monthlyIncomeSupported: Math.round(monthlyIncomeSupported),
    yearsSustained,
    isSustainable,
    chartData: [...chartData, ...decumulationChart].slice(0, 40),
  };
}

// 6. FIRE Calculator
export interface FireInputs {
  monthlyExpenses: number;
  currentSavings: number;
  currentAge: number;
  expectedReturn: number;
  inflationRate: number;
}

export interface FireResult {
  targetFireCorpus: number;
  yearsRemaining: number;
  requiredMonthlySip: number;
  chartData: ChartDataPoint[];
}

export function calculateFire(inputs: FireInputs): FireResult {
  const { monthlyExpenses, currentSavings, expectedReturn, inflationRate } = inputs;

  const annualExpenses = monthlyExpenses * 12;
  const baseFireCorpus = annualExpenses * 25;

  const yearsRemaining = 15;
  const totalMonths = yearsRemaining * 12;
  const r = expectedReturn / 12 / 100;
  const inf = inflationRate / 100;

  const targetFireCorpus = baseFireCorpus * Math.pow(1 + inf, yearsRemaining);
  const fvSavings = currentSavings * Math.pow(1 + expectedReturn / 100, yearsRemaining);
  const remainingGap = Math.max(0, targetFireCorpus - fvSavings);

  let requiredMonthlySip = 0;
  if (remainingGap > 0) {
    requiredMonthlySip = (remainingGap * r) / (Math.pow(1 + r, totalMonths) - 1);
  }

  const chartData: ChartDataPoint[] = [];
  let currentCorpus = currentSavings;
  for (let y = 1; y <= yearsRemaining; y++) {
    for (let m = 1; m <= 12; m++) {
      currentCorpus = (currentCorpus + requiredMonthlySip) * (1 + r);
    }
    const targetAtYear = baseFireCorpus * Math.pow(1 + inf, y);
    chartData.push({
      label: `Yr ${y}`,
      year: y,
      totalInvested: Math.round(currentSavings + requiredMonthlySip * 12 * y),
      futureValue: Math.round(currentCorpus),
      inflationAdjusted: Math.round(targetAtYear),
    });
  }

  return {
    targetFireCorpus: Math.round(targetFireCorpus),
    yearsRemaining,
    requiredMonthlySip: Math.round(requiredMonthlySip),
    chartData,
  };
}

// 7. Emergency Fund
export interface EmergencyInputs {
  monthlyExpenses: number;
  dependents: number;
  jobStability: 'high' | 'medium' | 'low';
}

export interface EmergencyResult {
  recommendedFund: number;
  monthsCovered: number;
  factors: {
    baseMonths: number;
    dependentMonths: number;
    stabilityMonths: number;
  };
}

export function calculateEmergencyFund(inputs: EmergencyInputs): EmergencyResult {
  const { monthlyExpenses, dependents, jobStability } = inputs;

  const baseMonths = 3;
  const dependentMonths = Math.min(3, dependents * 1);
  
  let stabilityMonths = 0;
  if (jobStability === 'medium') stabilityMonths = 1;
  else if (jobStability === 'low') stabilityMonths = 3;

  const monthsCovered = baseMonths + dependentMonths + stabilityMonths;
  const recommendedFund = monthlyExpenses * monthsCovered;

  return {
    recommendedFund,
    monthsCovered,
    factors: {
      baseMonths,
      dependentMonths,
      stabilityMonths,
    },
  };
}

// 8. Assets / Liabilities structures (already calculated inside components or inline)
export interface AssetEntry {
  cash: number;
  stocks: number;
  mutualFunds: number;
  gold: number;
  realEstate: number;
  crypto: number;
}

export interface LiabilityEntry {
  loans: number;
  creditCards: number;
  mortgage: number;
}

export interface NetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetAllocation: { name: string; value: number; color: string }[];
  liabilityAllocation: { name: string; value: number; color: string }[];
}

export function calculateNetWorth(assets: AssetEntry, liabilities: LiabilityEntry): NetWorthResult {
  const totalAssets = assets.cash + assets.stocks + assets.mutualFunds + assets.gold + assets.realEstate + assets.crypto;
  const totalLiabilities = liabilities.loans + liabilities.creditCards + liabilities.mortgage;
  const netWorth = totalAssets - totalLiabilities;

  const assetColors = ['#10b981', '#3b82f6', '#8b5cf6', '#eab308', '#f97316', '#ec4899'];
  const liabilityColors = ['#f43f5e', '#ef4444', '#b91c1c'];

  const assetAllocation = [
    { name: 'Cash', value: assets.cash, color: assetColors[0] },
    { name: 'Stocks', value: assets.stocks, color: assetColors[1] },
    { name: 'Mutual Funds', value: assets.mutualFunds, color: assetColors[2] },
    { name: 'Gold', value: assets.gold, color: assetColors[3] },
    { name: 'Real Estate', value: assets.realEstate, color: assetColors[4] },
    { name: 'Crypto', value: assets.crypto, color: assetColors[5] },
  ].filter(item => item.value > 0);

  const liabilityAllocation = [
    { name: 'Loans', value: liabilities.loans, color: liabilityColors[0] },
    { name: 'Credit Cards', value: liabilities.creditCards, color: liabilityColors[1] },
    { name: 'Mortgage', value: liabilities.mortgage, color: liabilityColors[2] },
  ].filter(item => item.value > 0);

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    assetAllocation,
    liabilityAllocation,
  };
}

// 9. EMI Calculator
export interface EmiInputs {
  loanAmount: number;
  interestRate: number;
  durationYears: number;
}

export interface EmiResult {
  monthlyEmi: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayable: number;
  amortizationTable: {
    month: number;
    emi: number;
    principalPaid: number;
    interestPaid: number;
    remainingBalance: number;
  }[];
  chartData: ChartDataPoint[];
}

export function calculateEmi(inputs: EmiInputs): EmiResult {
  const { loanAmount, interestRate, durationYears } = inputs;

  const totalMonths = durationYears * 12;
  const r = interestRate / 12 / 100;

  let monthlyEmi = 0;
  if (r > 0) {
    monthlyEmi = (loanAmount * r * Math.pow(1 + r, totalMonths)) / (Math.pow(1 + r, totalMonths) - 1);
  } else {
    monthlyEmi = loanAmount / totalMonths;
  }

  const amortizationTable = [];
  const chartData: ChartDataPoint[] = [];
  let remainingBalance = loanAmount;
  let accumulatedInterest = 0;
  let accumulatedPrincipal = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const interestPaid = remainingBalance * r;
    const principalPaid = Math.min(remainingBalance, monthlyEmi - interestPaid);
    remainingBalance = Math.max(0, remainingBalance - principalPaid);

    accumulatedInterest += interestPaid;
    accumulatedPrincipal += principalPaid;

    amortizationTable.push({
      month: m,
      emi: Math.round(monthlyEmi),
      principalPaid: Math.round(principalPaid),
      interestPaid: Math.round(interestPaid),
      remainingBalance: Math.round(remainingBalance),
    });

    if (m % 12 === 0 || m === totalMonths) {
      const year = Math.ceil(m / 12);
      chartData.push({
        label: `Yr ${year}`,
        year,
        totalInvested: Math.round(accumulatedPrincipal),
        futureValue: Math.round(accumulatedPrincipal + accumulatedInterest),
        interestPaid: Math.round(accumulatedInterest),
        principalPaid: Math.round(accumulatedPrincipal),
        remainingBalance: Math.round(remainingBalance),
      });
    }
  }

  return {
    monthlyEmi: Math.round(monthlyEmi),
    totalPrincipal: Math.round(loanAmount),
    totalInterest: Math.round(accumulatedInterest),
    totalPayable: Math.round(loanAmount + accumulatedInterest),
    amortizationTable,
    chartData,
  };
}
