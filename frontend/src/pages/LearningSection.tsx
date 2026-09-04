import React, { useState } from 'react';
import { GlassCard } from '../components/UI';
import { BookOpen, HelpCircle, ChevronDown, ChevronUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LearningSection: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const guides = [
    {
      title: '1. Systematic Investment Plan (SIP)',
      desc: 'A Systematic Investment Plan (SIP) is a method of investing a fixed sum regularly (usually monthly) in assets like mutual funds or stocks. It benefits from rupee-cost averaging: you buy more units when prices are low and fewer units when prices are high, lowering your average purchase cost over time. Adding a Step-Up percentage increases your monthly contribution annually, boosting compounding gains significantly.',
      path: '/sip'
    },
    {
      title: '2. Lump Sum Compounding',
      desc: 'Lump Sum investing refers to depositing a single large payment into an investment asset at once. Compounding works by generating returns on your initial principal plus all previously accumulated returns. Over long terms, this creates an exponential growth curve. However, unlike SIPs, lump sums do not benefit from average cost smoothing and are sensitive to market entry timing.',
      path: '/lumpsum'
    },
    {
      title: '3. Inflation & Purchasing Power',
      desc: 'Inflation is the rate at which the general level of prices for goods and services rises, eroding the purchasing power of cash. A cash balance of $10,000 today will only buy $5,500 worth of goods in 10 years at a 6% inflation rate. To maintain wealth, investments must grow faster than the rate of inflation.',
      path: '/inflation'
    },
    {
      title: '4. Goal-Based Planning',
      desc: 'Goal planning calculates the future cost of a target purchase (like house down-payments or college degrees) by adjusting today\'s cost for inflation, then reverse-engineers the exact monthly SIP needed to build that target corpus based on an expected rate of return.',
      path: '/goal'
    },
    {
      title: '5. Retirement Planning & Decumulation',
      desc: 'Retirement planning is divided into two parts. Accumulation: saving and compounding your portfolio during your working years. Decumulation: withdrawing monthly expenses after retirement. The corpus must be large enough to sustain withdrawals, adjusting for inflation, while the remainder continues to earn interest.',
      path: '/retirement'
    },
    {
      title: '6. FIRE: Financial Independence Retire Early',
      desc: 'The FIRE movement aims at building a large portfolio early in life to live off withdrawals. Under the standard "4% Rule" (Trinity Study), a corpus equal to 25 times your annual expenses allows you to withdraw 4% annually without depleting your core portfolio, making you financially independent.',
      path: '/fire'
    },
    {
      title: '7. Emergency Fund Size',
      desc: 'An emergency fund is liquid cash set aside for unexpected crises like medical costs or job loss. Financial planners recommend storing 3 to 6 months of living expenses. Volatile jobs (freelancers/startup workers) or families with dependents should store up to 9 months of expenses for buffer safety.',
      path: '/emergency'
    },
    {
      title: '8. EMI & Amortization Schedules',
      desc: 'Equated Monthly Installment (EMI) calculations determine your loan payments. An amortization table reveals the split of each payment: early payments consist mostly of interest costs, while principal repayment increases progressively towards the end of the loan term.',
      path: '/emi'
    },
    {
      title: '9. Net Worth & Balance Sheet',
      desc: 'Net Worth is the single metric that evaluates your overall wealth. It is calculated by subtracting your total liabilities (loans, mortgages, credit card debt) from your total assets (cash, stocks, property, gold, crypto). Tracking net worth quarterly ensures you are building real wealth.',
      path: '/networth'
    }
  ];

  const faqs = [
    {
      q: 'What is the "4% Rule" in FIRE calculations?',
      a: 'The 4% Rule states that you can withdraw 4% from your investment portfolio in your first year of retirement, and adjust that amount for inflation each subsequent year, with a very high probability that your money will last at least 30 years. To use this rule, your target corpus must be 25 times your annual expenses.'
    },
    {
      q: 'Why should I use a Step-Up SIP?',
      a: 'A Step-Up SIP increases your monthly investment amount by a fixed percentage annually (e.g., 10% each year). As your salary increases, stepping up your SIP ensures your savings grow alongside your income. This simple action can easily double your final accumulated corpus over a 15-year horizon.'
    },
    {
      q: 'How does inflation affect my investments?',
      a: 'Inflation reduces the real purchasing power of your money. If your portfolio returns 10% p.a. and inflation is 6% p.a., your real rate of return is roughly 4%. Always evaluate your future goals in inflation-adjusted terms to avoid falling short of actual expenses.'
    },
    {
      q: 'What is a "Safe Withdrawal Rate" (SWR)?',
      a: 'Safe Withdrawal Rate (SWR) is the percentage of your total retirement fund that you can withdraw annually without running out of money before you die. While 4% is the standard rule of thumb, conservative planners in higher inflation economies often use 3% or 3.5%.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-8 h-8 text-emerald-500" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Financial Learning Center</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Build your financial literacy and understand the logic behind our calculators.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Modular Guides */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold">Calculator Guidebooks</h2>
          
          <div className="grid grid-cols-1 gap-6">
            {guides.map((g, i) => (
              <GlassCard key={i} className="border border-slate-200/50 dark:border-slate-800/40 p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{g.title}</h3>
                  <Link to={g.path} className="text-xs text-emerald-500 font-bold flex items-center gap-0.5 hover:underline">
                    Go to Calculator <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {g.desc}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Right Side: FAQs & Disclaimer */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-bold">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <GlassCard key={idx} className="border border-slate-200/50 dark:border-slate-800/40 p-4">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left flex justify-between items-center font-bold text-xs cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeFaq === idx && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2 animate-fadeIn">
                    {faq.a}
                  </p>
                )}
              </GlassCard>
            ))}
          </div>

          {/* Disclaimer Alert */}
          <GlassCard className="p-4 bg-red-500/5 border border-red-500/10 text-red-500 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Financial Disclaimer</span>
              <p className="text-[10px] text-slate-500 dark:text-red-400/80 leading-relaxed">
                Projections are generated for informational purposes using compounding mathematics. Actual returns depend on market variables, taxes, asset class performance, and currency fluctuations. Consult a certified financial advisor before committing real capital.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
