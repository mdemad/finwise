-- FinWise Phase 5A — Halal Foundation, Security Master & Methodology Framework Migration
-- All tables created in this migration represent shared/master reference data.
-- Read access is public; write access is restricted to service-role/admin processes.

-- 1. Create security_master table
CREATE TABLE IF NOT EXISTS security_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker TEXT NOT NULL,
    isin TEXT NULL UNIQUE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'reit', 'sukuk', 'other')),
    exchange TEXT NOT NULL,
    country TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    sector TEXT NULL,
    industry TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Unique constraint: A ticker is unique within a specific exchange (e.g. AAPL on NASDAQ vs AAPL on secondary listings)
CREATE UNIQUE INDEX IF NOT EXISTS uq_security_exchange_ticker ON security_master (exchange, ticker);

-- Additional lookup indexes for security_master
CREATE INDEX IF NOT EXISTS idx_security_master_ticker ON security_master(ticker);
CREATE INDEX IF NOT EXISTS idx_security_master_isin ON security_master(isin) WHERE isin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_master_asset_type ON security_master(asset_type);
CREATE INDEX IF NOT EXISTS idx_security_master_is_active ON security_master(is_active);

-- 2. Create shariah_methodologies table
CREATE TABLE IF NOT EXISTS shariah_methodologies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shariah_methodologies_active ON shariah_methodologies(is_active);

-- 3. Create shariah_methodology_versions table
CREATE TABLE IF NOT EXISTS shariah_methodology_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    methodology_id TEXT NOT NULL REFERENCES shariah_methodologies(id) ON DELETE CASCADE,
    version_code TEXT NOT NULL,
    release_date DATE NOT NULL,
    documentation_url TEXT NULL,
    is_current_default BOOLEAN NOT NULL DEFAULT false,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Unique constraint: (methodology_id, version_code) must be unique
CREATE UNIQUE INDEX IF NOT EXISTS uq_methodology_version_code ON shariah_methodology_versions (methodology_id, version_code);
CREATE INDEX IF NOT EXISTS idx_methodology_versions_methodology ON shariah_methodology_versions(methodology_id);

-- 4. Create shariah_rule_thresholds table (Data-driven, configurable rules)
CREATE TABLE IF NOT EXISTS shariah_rule_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    methodology_version_id UUID NOT NULL REFERENCES shariah_methodology_versions(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('BUSINESS_ACTIVITY', 'DEBT_RATIO', 'CASH_RATIO', 'RECEIVABLES_RATIO', 'FUND_AGGREGATION', 'OTHER')),
    metric_name TEXT NOT NULL,
    operator TEXT NOT NULL CHECK (operator IN ('LTE', 'LT', 'GTE', 'GT', 'EQ', 'NEQ')),
    threshold_value NUMERIC(12, 6) NOT NULL,
    denominator_type TEXT NULL CHECK (denominator_type IS NULL OR denominator_type IN ('MARKET_CAP_AVG_36M', 'MARKET_CAP_AVG_24M', 'MARKET_CAP_CURRENT', 'TOTAL_ASSETS', 'TOTAL_REVENUE', 'OTHER')),
    description TEXT NOT NULL,
    verified_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shariah_rules_version ON shariah_rule_thresholds(methodology_version_id);
CREATE INDEX IF NOT EXISTS idx_shariah_rules_rule_type ON shariah_rule_thresholds(rule_type);

-- 5. Enable Row Level Security (RLS) on all master tables
ALTER TABLE security_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE shariah_methodologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shariah_methodology_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shariah_rule_thresholds ENABLE ROW LEVEL SECURITY;

-- 6. Public read policies (Master reference data is publicly readable by all authenticated/anonymous users)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'security_master' AND policyname = 'Public read security_master'
    ) THEN
        CREATE POLICY "Public read security_master" ON security_master FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'shariah_methodologies' AND policyname = 'Public read shariah_methodologies'
    ) THEN
        CREATE POLICY "Public read shariah_methodologies" ON shariah_methodologies FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'shariah_methodology_versions' AND policyname = 'Public read shariah_methodology_versions'
    ) THEN
        CREATE POLICY "Public read shariah_methodology_versions" ON shariah_methodology_versions FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'shariah_rule_thresholds' AND policyname = 'Public read shariah_rule_thresholds'
    ) THEN
        CREATE POLICY "Public read shariah_rule_thresholds" ON shariah_rule_thresholds FOR SELECT USING (true);
    END IF;
END $$;

-- Note: No INSERT / UPDATE / DELETE policies are granted to authenticated/anon roles.
-- Writes must be performed strictly via service-role / migration scripts.
