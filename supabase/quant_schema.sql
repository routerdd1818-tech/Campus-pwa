-- ==============================================================================
-- AlphaMind Neo — Supabase Quant Engine Master Schema
-- 專門儲存台股量化系統核心資料表：
-- 1. 全市場標的檔與概念股 (tw_equities)
-- 2. 三大法人基準錨定與主力籌碼 (tw_institutional_holdings)
-- 3. PIT 29 因子量化選股歷史快照 (tw_quant_screener_snapshots)
-- 4. 嚴格 T+1 開盤價回測績效帳本 (tw_signal_backtest_ledger)
-- 5. 三層財報勾稽防偽快取 (tw_financial_verifications)
-- 6. 08:00 盤前市場情緒與跳空預測記錄 (tw_premarket_sentiment_logs)
-- ==============================================================================

-- 1. 全台股基本資料表
CREATE TABLE IF NOT EXISTS tw_equities (
    symbol VARCHAR(16) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    market VARCHAR(16) NOT NULL DEFAULT 'TSE', -- TSE / OTC
    shares BIGINT DEFAULT 0,
    market_cap NUMERIC DEFAULT 0,
    industry VARCHAR(64) DEFAULT '',
    theme_tags TEXT[] DEFAULT '{}',
    latest_close NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 三大法人基準持股與籌碼集中度表
CREATE TABLE IF NOT EXISTS tw_institutional_holdings (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL REFERENCES tw_equities(symbol) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    baseline_shares NUMERIC DEFAULT 0,
    trust_shares NUMERIC DEFAULT 0,
    dealer_shares NUMERIC DEFAULT 0,
    dealer_self_shares NUMERIC DEFAULT 0,
    dealer_hedge_shares NUMERIC DEFAULT 0,
    foreign_ratio NUMERIC DEFAULT 0,
    three_inst_ratio NUMERIC DEFAULT 0,
    corrupt_flag BOOLEAN DEFAULT FALSE,
    chip_concentration_5d NUMERIC DEFAULT 0,
    chip_concentration_10d NUMERIC DEFAULT 0,
    chip_concentration_20d NUMERIC DEFAULT 0,
    ratio_change_5d NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_symbol_trade_date UNIQUE (symbol, trade_date)
);

-- 3. PIT 29 因子量化選股歷史快照表
CREATE TABLE IF NOT EXISTS tw_quant_screener_snapshots (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    name VARCHAR(64) NOT NULL,
    signal VARCHAR(16) NOT NULL, -- BUY, WATCH, HOLD, SELL
    total_score NUMERIC NOT NULL,
    twstock_rule VARCHAR(64) DEFAULT '',
    revenue_yoy_pct NUMERIC DEFAULT 0,
    chip_concentration_5d_pct NUMERIC DEFAULT 0,
    latest_close NUMERIC DEFAULT 0,
    factors JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 嚴格 T+1 開盤價回測績效帳本表
CREATE TABLE IF NOT EXISTS tw_signal_backtest_ledger (
    trade_id VARCHAR(64) PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL,
    signal_name VARCHAR(64) NOT NULL,
    signal_date DATE NOT NULL,
    entry_date DATE NOT NULL,
    entry_price NUMERIC NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED
    exit_date DATE,
    exit_price NUMERIC,
    net_pnl_pct NUMERIC DEFAULT 0,
    exit_reason VARCHAR(64),
    target_tp_price NUMERIC,
    stop_loss_price NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 三層財報勾稽防偽檢視快取表
CREATE TABLE IF NOT EXISTS tw_financial_verifications (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL,
    year INT NOT NULL,
    season INT NOT NULL,
    operating_margin NUMERIC DEFAULT 0,
    sga_rate NUMERIC DEFAULT 0,
    rd_rate NUMERIC DEFAULT 0,
    cfo_to_net_income_ratio NUMERIC DEFAULT 0,
    cfo_status VARCHAR(32) DEFAULT 'HEALTHY',
    cash_trap_warning BOOLEAN DEFAULT FALSE,
    passed_sanity_checks BOOLEAN DEFAULT TRUE,
    mops_url TEXT DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_symbol_year_season UNIQUE (symbol, year, season)
);

-- 6. 08:00 盤前市場情緒與跳空預測記錄表
CREATE TABLE IF NOT EXISTS tw_premarket_sentiment_logs (
    trade_date DATE PRIMARY KEY,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sox_change_pct NUMERIC DEFAULT 0,
    nasdaq_change_pct NUMERIC DEFAULT 0,
    vix_level NUMERIC DEFAULT 0,
    tsm_adr_close NUMERIC DEFAULT 0,
    tsm_adr_change_pct NUMERIC DEFAULT 0,
    usd_twd_rate NUMERIC DEFAULT 32.2,
    tsm_adr_parity_price NUMERIC DEFAULT 0,
    expected_tsmc_gap_pct NUMERIC DEFAULT 0,
    expected_taiex_gap_points NUMERIC DEFAULT 0,
    night_futures_change_pct NUMERIC DEFAULT 0,
    night_session_bias VARCHAR(32) NOT NULL,
    headwind_risk_flag BOOLEAN DEFAULT FALSE,
    summary TEXT DEFAULT ''
);

-- 7. 效能索引
CREATE INDEX IF NOT EXISTS idx_tw_inst_symbol_date ON tw_institutional_holdings(symbol, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_tw_screener_date_score ON tw_quant_screener_snapshots(snapshot_date DESC, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_tw_ledger_symbol_entry ON tw_signal_backtest_ledger(symbol, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_tw_ledger_status ON tw_signal_backtest_ledger(status);

-- 8. Row Level Security (RLS) 設定
ALTER TABLE tw_equities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tw_institutional_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tw_quant_screener_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tw_signal_backtest_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE tw_financial_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tw_premarket_sentiment_logs ENABLE ROW LEVEL SECURITY;

-- 允許所有人 (anon & authenticated) 讀取公開量化資料
DROP POLICY IF EXISTS "Public can read tw_equities" ON tw_equities;
CREATE POLICY "Public can read tw_equities" ON tw_equities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read tw_institutional_holdings" ON tw_institutional_holdings;
CREATE POLICY "Public can read tw_institutional_holdings" ON tw_institutional_holdings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read tw_quant_screener_snapshots" ON tw_quant_screener_snapshots;
CREATE POLICY "Public can read tw_quant_screener_snapshots" ON tw_quant_screener_snapshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read tw_signal_backtest_ledger" ON tw_signal_backtest_ledger;
CREATE POLICY "Public can read tw_signal_backtest_ledger" ON tw_signal_backtest_ledger FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read tw_financial_verifications" ON tw_financial_verifications;
CREATE POLICY "Public can read tw_financial_verifications" ON tw_financial_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read tw_premarket_sentiment_logs" ON tw_premarket_sentiment_logs;
CREATE POLICY "Public can read tw_premarket_sentiment_logs" ON tw_premarket_sentiment_logs FOR SELECT USING (true);

-- 允許後端同步引擎寫入 (支援 service_role 與授權 API 金鑰同步)
DROP POLICY IF EXISTS "Service can write tw_equities" ON tw_equities;
CREATE POLICY "Service can write tw_equities" ON tw_equities FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can write tw_institutional_holdings" ON tw_institutional_holdings;
CREATE POLICY "Service can write tw_institutional_holdings" ON tw_institutional_holdings FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can write tw_quant_screener_snapshots" ON tw_quant_screener_snapshots;
CREATE POLICY "Service can write tw_quant_screener_snapshots" ON tw_quant_screener_snapshots FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can write tw_signal_backtest_ledger" ON tw_signal_backtest_ledger;
CREATE POLICY "Service can write tw_signal_backtest_ledger" ON tw_signal_backtest_ledger FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can write tw_financial_verifications" ON tw_financial_verifications;
CREATE POLICY "Service can write tw_financial_verifications" ON tw_financial_verifications FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can write tw_premarket_sentiment_logs" ON tw_premarket_sentiment_logs;
CREATE POLICY "Service can write tw_premarket_sentiment_logs" ON tw_premarket_sentiment_logs FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true);
