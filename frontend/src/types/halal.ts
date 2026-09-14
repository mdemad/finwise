/**
 * halal.ts — Phase 5A Halal Foundation & Shariah Methodology Types
 *
 * Compliance Status Convention:
 *   - COMPLIANT: Passes verified screening rules for the specified methodology/version.
 *   - NON_COMPLIANT: Fails one or more verified screening rules.
 *   - NEEDS_REVIEW: Ambiguous classification, borderline metrics, or incomplete data requiring audit.
 *   - UNKNOWN: Insufficient data to perform an evaluation.
 */

export type ShariahComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' | 'UNKNOWN';

export type ShariahRuleType =
  | 'BUSINESS_ACTIVITY'
  | 'DEBT_RATIO'
  | 'CASH_RATIO'
  | 'RECEIVABLES_RATIO'
  | 'FUND_AGGREGATION'
  | 'OTHER';

export type ShariahOperator = 'LTE' | 'LT' | 'GTE' | 'GT' | 'EQ' | 'NEQ';

export type DenominatorType =
  | 'MARKET_CAP_AVG_36M'
  | 'MARKET_CAP_AVG_24M'
  | 'MARKET_CAP_CURRENT'
  | 'TOTAL_ASSETS'
  | 'TOTAL_REVENUE'
  | 'OTHER';

export interface Security {
  id: string;
  ticker: string;
  isin?: string;
  name: string;
  assetType: string;
  exchange: string;
  country: string;
  currency: string;
  sector?: string;
  industry?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShariahRuleThreshold {
  id: string;
  methodologyVersionId: string;
  ruleType: ShariahRuleType;
  metricName: string;
  operator: ShariahOperator;
  thresholdValue: number;
  denominatorType?: DenominatorType;
  description: string;
  verifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShariahMethodologyVersion {
  id: string;
  methodologyId: string;
  versionCode: string;
  releaseDate: string;
  documentationUrl?: string;
  isCurrentDefault: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  rules?: ShariahRuleThreshold[];
}

export interface ShariahMethodology {
  id: string;
  name: string;
  organization: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  versions?: ShariahMethodologyVersion[];
}
