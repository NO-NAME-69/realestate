-- prisma/migrations/00000000000000_init/migration.sql
-- Post-migration SQL: CHECK constraints, RLS policies, indexes

-- ━━━━━━━━━━ CHECK CONSTRAINTS ━━━━━━━━━━

-- Wallet balance can never go negative
ALTER TABLE wallets ADD CONSTRAINT chk_wallet_balance_non_negative CHECK (balance >= 0);

-- Transaction amount must be positive
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_amount_positive CHECK (amount > 0);

-- Investment amount must be positive
ALTER TABLE investments ADD CONSTRAINT chk_investment_amount_positive CHECK (amount > 0);

-- Plot price must be positive
ALTER TABLE plots ADD CONSTRAINT chk_plot_price_positive CHECK (price > 0);

-- Sale prices must be positive
ALTER TABLE sales ADD CONSTRAINT chk_sale_base_price_positive CHECK (base_price > 0);
ALTER TABLE sales ADD CONSTRAINT chk_sale_final_price_positive CHECK (final_price > 0);

-- Team member count non-negative
ALTER TABLE teams ADD CONSTRAINT chk_team_member_count_non_negative CHECK (member_count >= 0);

-- ━━━━━━━━━━ ROW LEVEL SECURITY ━━━━━━━━━━

-- Wallet RLS: users can only access their own wallet
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_user_policy ON wallets
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Investment RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY investment_user_policy ON investments
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ━━━━━━━━━━ AUDIT LOG PROTECTION ━━━━━━━━━━

-- Create a restricted role for the application
-- The app user should only INSERT into audit_logs, never UPDATE or DELETE
-- REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
-- GRANT INSERT ON audit_logs TO app_user;
-- (Run manually with correct role name)

-- ━━━━━━━━━━ ADDITIONAL INDEXES ━━━━━━━━━━

-- Composite index for referral code lookup during registration
CREATE INDEX IF NOT EXISTS idx_teams_referral_code ON teams (referral_code);

-- Partial index for active holds (only active holds queried frequently)
CREATE INDEX IF NOT EXISTS idx_plot_holds_active ON plot_holds (user_id, expires_at)
  WHERE status = 'ACTIVE';

-- Partial index for pending transactions
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions (reference_id)
  WHERE status = 'PENDING';

-- ━━━━━━━━━━ FUNCTIONS ━━━━━━━━━━

-- Trigger to prevent audit_logs UPDATE/DELETE at DB level
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only. Modifications are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_prevent_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();
