-- FinWise Phase 4D — Financial Goals Migration
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(20, 2) NOT NULL CHECK (target_amount >= 0),
    target_date DATE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'abandoned')),
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);

ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS goal_id UUID NULL REFERENCES financial_goals(id) ON DELETE SET NULL;
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS goal_id UUID NULL REFERENCES financial_goals(id) ON DELETE SET NULL;

ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Goals user isolation" ON financial_goals;
CREATE POLICY "Goals user isolation" ON financial_goals FOR ALL USING (auth.uid() = user_id);
