-- FinWise Phase 4A — Investment Data Foundation Migration
-- 1. Create investment_holdings table
CREATE TABLE IF NOT EXISTS investment_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'reit', 'other')),
    currency TEXT NOT NULL DEFAULT 'USD',
    broker_code TEXT NOT NULL DEFAULT 'MANUAL',
    external_holding_id TEXT NULL,
    units_held NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (units_held >= 0),
    average_buy_price NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (average_buy_price >= 0),
    current_price NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (current_price >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for investment_holdings
CREATE INDEX IF NOT EXISTS idx_investment_holdings_user ON investment_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_user_status ON investment_holdings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_asset_type ON investment_holdings(asset_type);

-- 2. Create investment_transactions table (Immutable Ledger)
CREATE TABLE IF NOT EXISTS investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    holding_id UUID NOT NULL REFERENCES investment_holdings(id) ON DELETE RESTRICT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'FEE', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT')),
    quantity NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    price NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (price >= 0),
    amount NUMERIC(20, 4) NOT NULL DEFAULT 0,
    fees NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (fees >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    external_transaction_id TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for investment_transactions
CREATE INDEX IF NOT EXISTS idx_investment_transactions_user ON investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_holding ON investment_transactions(holding_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(transaction_date DESC);

-- Unique index for external_transaction_id per user (safely ignoring NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_external_tx_id 
ON investment_transactions (user_id, external_transaction_id) 
WHERE external_transaction_id IS NOT NULL;

-- Enable Row Level Security (RLS) policies as secondary defense layer
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investment_holdings' AND policyname = 'Holdings user isolation'
    ) THEN
        CREATE POLICY "Holdings user isolation" ON investment_holdings FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investment_transactions' AND policyname = 'Transactions user isolation'
    ) THEN
        CREATE POLICY "Transactions user isolation" ON investment_transactions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Atomic Transaction Processing RPC Function
CREATE OR REPLACE FUNCTION process_investment_transaction(
    p_user_id UUID,
    p_holding_id UUID,
    p_transaction_type TEXT,
    p_quantity NUMERIC,
    p_price NUMERIC,
    p_amount NUMERIC,
    p_fees NUMERIC,
    p_currency TEXT,
    p_transaction_date TIMESTAMPTZ,
    p_external_transaction_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_holding RECORD;
    v_old_units NUMERIC;
    v_old_wac NUMERIC;
    v_new_units NUMERIC;
    v_new_wac NUMERIC;
    v_total_cost NUMERIC;
    v_transfer_cost NUMERIC;
    v_split_ratio NUMERIC;
    v_realized_pnl NUMERIC := NULL;
    v_tx_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_calc_amount NUMERIC;
BEGIN
    -- 0. Non-negative Parameter Validation
    IF p_quantity < 0 OR p_price < 0 OR p_fees < 0 THEN
        RAISE EXCEPTION 'Quantity, price, and fees must be non-negative' USING ERRCODE = 'P0001';
    END IF;

    -- 1. Ownership & Holding Lookup (with row-level lock)
    SELECT * INTO v_holding
    FROM investment_holdings
    WHERE id = p_holding_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Holding not found or access denied' USING ERRCODE = 'P0002';
    END IF;

    -- 2. Duplicate external_transaction_id check
    IF p_external_transaction_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM investment_transactions
        WHERE user_id = p_user_id AND external_transaction_id = p_external_transaction_id
    ) THEN
        RAISE EXCEPTION 'Transaction with this external_transaction_id already exists.' USING ERRCODE = '23505';
    END IF;

    v_old_units := v_holding.units_held;
    v_old_wac := v_holding.average_buy_price;
    v_calc_amount := p_amount;

    -- 3. Accounting & WAC Calculation
    IF p_transaction_type = 'BUY' THEN
        v_new_units := v_old_units + p_quantity;
        v_total_cost := (v_old_units * v_old_wac) + (p_quantity * p_price) + p_fees;
        IF v_new_units > 0 THEN
            v_new_wac := v_total_cost / v_new_units;
        ELSE
            v_new_wac := 0;
        END IF;
        IF v_calc_amount = 0 THEN
            v_calc_amount := (p_quantity * p_price) + p_fees;
        END IF;

    ELSIF p_transaction_type = 'SELL' THEN
        IF p_quantity > v_old_units THEN
            RAISE EXCEPTION 'Insufficient units to sell. Available: %, Requested: %', v_old_units, p_quantity USING ERRCODE = 'P0001';
        END IF;
        v_new_units := v_old_units - p_quantity;
        v_new_wac := v_old_wac;
        v_realized_pnl := (p_price - v_old_wac) * p_quantity - p_fees;
        IF v_calc_amount = 0 THEN
            v_calc_amount := (p_quantity * p_price) - p_fees;
        END IF;

    ELSIF p_transaction_type = 'SPLIT' THEN
        IF p_price > 0 THEN
            v_split_ratio := p_price;
        ELSE
            v_split_ratio := p_quantity;
        END IF;
        IF v_split_ratio <= 0 THEN
            RAISE EXCEPTION 'Split ratio must be greater than 0' USING ERRCODE = 'P0001';
        END IF;
        v_new_units := v_old_units * v_split_ratio;
        IF v_split_ratio > 0 THEN
            v_new_wac := v_old_wac / v_split_ratio;
        ELSE
            v_new_wac := 0;
        END IF;

    ELSIF p_transaction_type = 'TRANSFER_IN' THEN
        v_new_units := v_old_units + p_quantity;
        v_transfer_cost := (p_quantity * p_price) + p_fees;
        v_total_cost := (v_old_units * v_old_wac) + v_transfer_cost;
        IF v_new_units > 0 THEN
            v_new_wac := v_total_cost / v_new_units;
        ELSE
            v_new_wac := 0;
        END IF;

    ELSIF p_transaction_type = 'TRANSFER_OUT' THEN
        IF p_quantity > v_old_units THEN
            RAISE EXCEPTION 'Insufficient units for transfer out. Available: %, Requested: %', v_old_units, p_quantity USING ERRCODE = 'P0001';
        END IF;
        v_new_units := v_old_units - p_quantity;
        v_new_wac := v_old_wac;

    ELSIF p_transaction_type = 'DIVIDEND' THEN
        v_new_units := v_old_units;
        v_new_wac := v_old_wac;
        IF v_calc_amount = 0 AND p_quantity > 0 AND p_price > 0 THEN
            v_calc_amount := p_quantity * p_price;
        END IF;

    ELSIF p_transaction_type = 'FEE' THEN
        v_new_units := v_old_units;
        IF p_quantity = 0 AND p_fees > 0 AND v_old_units > 0 THEN
            v_new_wac := v_old_wac + (p_fees / v_old_units);
        ELSE
            v_new_wac := v_old_wac;
        END IF;

    ELSE
        RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type USING ERRCODE = 'P0001';
    END IF;

    -- 4. Update Holding Projection State
    UPDATE investment_holdings
    SET units_held = ROUND(v_new_units, 8),
        average_buy_price = ROUND(v_new_wac, 8),
        updated_at = v_now
    WHERE id = p_holding_id AND user_id = p_user_id;

    -- 5. Insert Transaction into Immutable Ledger
    INSERT INTO investment_transactions (
        id,
        user_id,
        holding_id,
        transaction_type,
        quantity,
        price,
        amount,
        fees,
        currency,
        transaction_date,
        external_transaction_id,
        notes,
        created_at
    ) VALUES (
        v_tx_id,
        p_user_id,
        p_holding_id,
        p_transaction_type,
        ROUND(p_quantity, 8),
        ROUND(p_price, 8),
        ROUND(v_calc_amount, 4),
        ROUND(p_fees, 4),
        p_currency,
        p_transaction_date,
        p_external_transaction_id,
        p_notes,
        v_now
    );

    RETURN jsonb_build_object(
        'id', v_tx_id,
        'userId', p_user_id,
        'holdingId', p_holding_id,
        'transactionType', p_transaction_type,
        'quantity', p_quantity,
        'price', p_price,
        'amount', v_calc_amount,
        'fees', p_fees,
        'currency', p_currency,
        'transactionDate', p_transaction_date,
        'externalTransactionId', p_external_transaction_id,
        'notes', p_notes,
        'createdAt', v_now,
        'realizedPnL', v_realized_pnl,
        'unitsHeld', ROUND(v_new_units, 8),
        'averageBuyPrice', ROUND(v_new_wac, 8)
    );
END;
$$;

-- 4. Restrict RPC Execution to Service Role Only (FastAPI Backend Gateway)
REVOKE EXECUTE ON FUNCTION process_investment_transaction(
    UUID,
    UUID,
    TEXT,
    NUMERIC,
    NUMERIC,
    NUMERIC,
    NUMERIC,
    TEXT,
    TIMESTAMPTZ,
    TEXT,
    TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION process_investment_transaction(
    UUID,
    UUID,
    TEXT,
    NUMERIC,
    NUMERIC,
    NUMERIC,
    NUMERIC,
    TEXT,
    TIMESTAMPTZ,
    TEXT,
    TEXT
) TO service_role;


