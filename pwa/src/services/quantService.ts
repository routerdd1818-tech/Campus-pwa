/**
 * ⚡️ AlphaMind Quant Service Client (v2)
 * 連線至 AlphaMind 量化核心 RESTful API
 * 包含：即時報價、RRG 輪動、PIT 29 因子選股、主力分點與法人基準、T+1 績效帳本、
 * 盤前情緒、三層財報勾稽 15 指標、產業鏈力導向圖譜、ML 三模型集成與 Rule-First AI 診斷
 */

const API_BASE = import.meta.env.VITE_ALPHAMIND_API_URL || '';

export interface RealtimeQuote {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  yesterday_close: number;
  change: number;
  change_pct: number;
  volume: number;
  current_lot: number;
  vwap: number;
  limit_status: 'NORMAL' | 'LIMIT_UP' | 'LIMIT_DOWN';
  timestamp: string;
  bid_prices?: number[];
  bid_volumes?: number[];
  ask_prices?: number[];
  ask_volumes?: number[];
}

export interface RRGCoordinate {
  date: string;
  close?: number;
  rs_ratio: number;
  rs_momentum: number;
  quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
  distance?: number;
  heading_deg?: number;
}

export interface RRGStockSnapshot {
  symbol: string;
  name: string;
  benchmark_symbol: string;
  current_point: RRGCoordinate;
  tail_points: RRGCoordinate[];
  trail: RRGCoordinate[];
  quadrant_transition: string | null;
  velocity: number;
}

export interface ScreenerItem {
  symbol: string;
  name: string;
  action?: 'BUY' | 'WATCH' | 'HOLD' | 'SELL';
  signal: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'HOLD' | 'SELL';
  total_score: number;
  latest_close: number;
  twstock_rule: string;
  revenue_yoy_pct: number;
  chip_concentration_5d_pct: number;
  pe_ratio?: number;
  pb_ratio?: number;
  dividend_yield?: number;
  best_four_buy_reasons?: string[];
  best_four_sell_reasons?: string[];
  reason?: string;
}

export interface PremarketSentiment {
  timestamp: string;
  sox_change_pct: number;
  nasdaq_change_pct: number;
  vix_level: number;
  tsm_adr_close: number;
  tsm_adr_change_pct: number;
  usd_twd_rate: number;
  tsm_adr_parity_price: number;
  expected_tsmc_gap_pct: number;
  expected_taiex_gap_points: number;
  night_futures_change_pct: number;
  night_session_bias: '強力順風' | '中性震盪' | '逆風承壓' | string;
  bias_reason: string;
  headwind_risk_flag: boolean;
}

export interface FinancialVerificationReport {
  symbol: string;
  year: number;
  quarter?: number;
  season: string | number;
  gross_margin_pct?: number;
  operating_margin: number;
  net_margin_pct?: number;
  eps?: number;
  sga_rate: number;
  rd_rate: number;
  cfo_to_net_income_ratio: number;
  cfo_status: 'HEALTHY' | 'MODERATE' | 'WARNING_LOW_CFO' | 'DIVERGENCE_RISK' | 'DANGER_NEGATIVE_CFO';
  cash_trap_warning: boolean;
  passed_sanity_checks: boolean;
  ending_cash_reconciled?: boolean;
  roe_pct?: number;
  roa_pct?: number;
  current_ratio_pct?: number;
  quick_ratio_pct?: number;
  debt_ratio_pct?: number;
  receivable_turnover_days?: number;
  inventory_turnover_days?: number;
  overall_health_score?: number;
  mops_url: string;
  goodinfo_url?: string;
  notes: string[];
}

export interface SupplyChainNode {
  id: string;
  name: string;
  type: string;
  group?: string;
  tier?: string;
}

export interface SupplyChainLink {
  source: string;
  target: string;
  relation: string;
  detail?: string;
}

export interface SupplyChainDossier {
  symbol: string;
  name?: string;
  themes: string[];
  peers: string[];
  upstream: string[];
  midstream: string[];
  downstream: string[];
  top_customers: string[];
  top_suppliers: string[];
  wiki_markdown?: string;
  graph: {
    nodes: SupplyChainNode[];
    links: SupplyChainLink[];
  };
}

export interface BrokerBranchItem {
  broker_id: string;
  broker_name: string;
  buy_lots: number;
  sell_lots: number;
  net_lots: number;
  avg_price: number;
  share_of_volume_pct: number;
  next_day_win_rate_pct: number;
  pearson_r_15d: number;
  pearson_r_60d: number;
  estimated_profit_twd: number;
  role_tag: string;
}

export interface BrokerBranchResponse {
  symbol: string;
  name: string;
  broker_report: {
    symbol: string;
    as_of_date: string;
    concentration_5d_pct: number;
    concentration_20d_pct: number;
    net_whale_lots: number;
    top_buy_branches: BrokerBranchItem[];
    top_sell_branches: BrokerBranchItem[];
    pricing_power_brokers: string[];
    signal_label: string;
  };
  institutional_baseline: {
    date?: string;
    foreign_ratio_pct?: number;
    trust_ratio_pct?: number;
    dealer_ratio_pct?: number;
    total_inst_ratio_pct?: number;
    chip_concentration_5d_pct?: number;
    chip_concentration_20d_pct?: number;
    flow_corrupt_mask?: boolean;
  };
}

export interface ModelPredictionItem {
  model_name: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  expected_return_5d_pct: number;
  confidence: number;
  target_price_5d: number;
  weight: number;
  rationale: string;
}

export interface MLEnsembleReport {
  symbol: string;
  as_of_date: string;
  latest_close: number;
  ensemble_direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  ensemble_return_5d_pct: number;
  ensemble_target_price_5d: number;
  ensemble_confidence: number;
  agreement_score: number;
  dynamic_weights: {
    lightgbm_weight: number;
    xgboost_weight: number;
    arima_weight: number;
    volatility_5d_pct: number;
    volume_ratio_5d: number;
    rsi_14: number;
    trend_strength_adx: number;
    regime_label: string;
  };
  models: ModelPredictionItem[];
  feature_importance: Record<string, number>;
}

export interface AIDiagnosisReport {
  symbol: string;
  rating: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'HOLD' | 'SELL';
  confidence_score: number;
  llm_engine?: string;
  headline_summary: string;
  four_rules_diagnosis: string;
  institutional_analysis: string;
  financial_integrity_check: string;
  supply_chain_perspective: string;
  ml_ensemble_summary?: string;
  ml_ensemble?: MLEnsembleReport;
  execution_strategy: {
    action: string;
    suggested_entry_price: number;
    take_profit_price: number;
    stop_loss_price: number;
    risk_reward_ratio: number;
  };
  guardrails_applied: string[];
}

export interface BacktestLedgerRecord {
  code: string;
  name?: string;
  signal_date: string;
  entry_date?: string;
  entry_open_raw?: number;
  entry_open_real: number;
  status: string;
  exit_date?: string;
  exit_price_raw?: number;
  final_net_return_pct: number;
  exit_reason: string;
  holding_bars?: number;
}

export interface BacktestLedgerSummary {
  total_signals: number;
  closed_trades: number;
  open_trades?: number;
  win_rate_pct: number;
  avg_return_pct: number;
  cumulative_return_pct: number;
  profit_factor: number;
  max_win_pct: number;
  max_loss_pct: number;
  recent_records: BacktestLedgerRecord[];
}

export interface NLStrategyBuildResult {
  strategy: {
    strategy_name: string;
    natural_language_prompt: string;
    pit_compliance: string;
    entry_execution: string;
    exit_rules: { take_profit_pct: number; stop_loss_pct: number; max_holding_days: number };
    parsed_rules: Array<{ factor: string; operator: string; threshold: number | boolean | number[]; label: string }>;
    factor_weights: Record<string, number>;
  };
  matched_stocks: ScreenerItem[];
}

class QuantService {
  private buildUrl(base: string, path: string, params?: Record<string, string>): string {
    const url = new URL(`${base}${path}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    }
    return url.toString();
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T | null> {
    const bases = API_BASE ? [API_BASE] : ['', 'http://localhost:8888'];
    for (const base of bases) {
      try {
        const res = await fetch(this.buildUrl(base, path, params), {
          headers: { Accept: 'application/json' },
        });
        const ctype = res.headers.get('content-type') || '';
        if (res.ok && ctype.includes('application/json')) {
          return await res.json();
        }
      } catch {
        // try next fallback base
      }
    }
    return null;
  }

  private async post<T>(path: string, body: unknown): Promise<T | null> {
    const bases = API_BASE ? [API_BASE] : ['', 'http://localhost:8888'];
    for (const base of bases) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        });
        const ctype = res.headers.get('content-type') || '';
        if (res.ok && ctype.includes('application/json')) {
          return await res.json();
        }
      } catch {
        // try next fallback base
      }
    }
    return null;
  }

  async getRealtimeQuotes(symbols: string[]): Promise<Record<string, RealtimeQuote>> {
    if (!symbols.length) return {};
    const res = await this.get<{ quotes: Record<string, RealtimeQuote> }>('/api/v2/market/realtime', {
      symbols: symbols.join(','),
    });
    return res?.quotes || {};
  }

  async getRRG(benchmark: string = 'TAIEX', symbols?: string[]): Promise<RRGStockSnapshot[]> {
    const params: Record<string, string> = { benchmark };
    if (symbols?.length) params.symbols = symbols.join(',');
    const res = await this.get<{ snapshots: RRGStockSnapshot[] }>('/api/v2/quant/rrg', params);
    return res?.snapshots || [];
  }

  async getScreener(limit: number = 20): Promise<ScreenerItem[]> {
    const res = await this.get<{ results: ScreenerItem[] }>('/api/v2/quant/screener', {
      limit: String(limit),
    });
    return res?.results || [];
  }

  async getBacktestLedger(): Promise<BacktestLedgerSummary | null> {
    const res = await this.get<{ ledger: BacktestLedgerSummary }>('/api/v2/quant/backtest-ledger');
    return res?.ledger || null;
  }

  async getPremarketSentiment(): Promise<PremarketSentiment | null> {
    const res = await this.get<{ sentiment: PremarketSentiment }>('/api/v2/market/premarket');
    return res?.sentiment || null;
  }

  async getFinancials(symbol: string): Promise<FinancialVerificationReport | null> {
    const res = await this.get<{ report: FinancialVerificationReport }>('/api/v2/fundamental/financials', {
      symbol,
    });
    return res?.report || null;
  }

  async getSupplyChain(symbol: string): Promise<SupplyChainDossier | null> {
    const res = await this.get<{ dossier: SupplyChainDossier }>('/api/v2/graph/supply-chain', {
      symbol,
    });
    return res?.dossier || null;
  }

  async getBrokerBranches(symbol: string): Promise<BrokerBranchResponse | null> {
    return await this.get<BrokerBranchResponse>('/api/v2/chip/broker-branches', { symbol });
  }

  async getMLEnsemble(symbol: string): Promise<MLEnsembleReport | null> {
    const res = await this.get<{ ensemble: MLEnsembleReport }>('/api/v2/ml/ensemble', { symbol });
    return res?.ensemble || null;
  }

  async getAIDiagnosis(symbol: string): Promise<AIDiagnosisReport | null> {
    const res = await this.post<{ diagnosis: AIDiagnosisReport }>('/api/v2/ai/diagnosis', {
      symbol,
    });
    return res?.diagnosis || null;
  }

  async buildNaturalLanguageStrategy(prompt: string): Promise<NLStrategyBuildResult | null> {
    return await this.post<NLStrategyBuildResult>('/api/v2/ai/strategy-builder', { prompt });
  }
}

export const quantService = new QuantService();
