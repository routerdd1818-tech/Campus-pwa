import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Activity,
  ShieldCheck,
  Cpu,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Compass,
  Users,
  Network,
  BookOpen,
  Sparkles,
  Play,
  Pause,
} from 'lucide-react';
import {
  quantService,
  PremarketSentiment,
  ScreenerItem,
  RRGStockSnapshot,
  FinancialVerificationReport,
  AIDiagnosisReport,
  BrokerBranchResponse,
  SupplyChainDossier,
  BacktestLedgerSummary,
  NLStrategyBuildResult,
} from '../services/quantService';

interface QuantInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

type QuantTabId =
  | 'premarket'
  | 'screener'
  | 'rrg'
  | 'chip'
  | 'financials'
  | 'supplychain'
  | 'ledger'
  | 'ai';

export const QuantInsightModal: React.FC<QuantInsightModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = '2330',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<QuantTabId>('premarket');
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol);
  const [loading, setLoading] = useState(false);

  // Data states
  const [premarket, setPremarket] = useState<PremarketSentiment | null>(null);
  const [screenerList, setScreenerList] = useState<ScreenerItem[]>([]);
  const [rrgList, setRrgList] = useState<RRGStockSnapshot[]>([]);
  const [brokerData, setBrokerData] = useState<BrokerBranchResponse | null>(null);
  const [financials, setFinancials] = useState<FinancialVerificationReport | null>(null);
  const [supplyChain, setSupplyChain] = useState<SupplyChainDossier | null>(null);
  const [ledger, setLedger] = useState<BacktestLedgerSummary | null>(null);
  const [aiReport, setAiReport] = useState<AIDiagnosisReport | null>(null);

  // Natural Language Strategy Builder state
  const [nlPrompt, setNlPrompt] = useState('外資與投信連買、5日籌碼集中度>5%、PIT營收YoY>15%、均線多頭排列');
  const [nlResult, setNlResult] = useState<NLStrategyBuildResult | null>(null);
  const [nlBuilding, setNlBuilding] = useState(false);

  // RRG Trail Playback state (0..4, where 4 is latest point)
  const [trailStep, setTrailStep] = useState<number>(4);
  const [isPlayingTrail, setIsPlayingTrail] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (
      isOpen &&
      (activeSubTab === 'chip' ||
        activeSubTab === 'financials' ||
        activeSubTab === 'supplychain' ||
        activeSubTab === 'ai')
    ) {
      loadSymbolData(symbol);
    } else if (isOpen && activeSubTab === 'ledger' && !ledger) {
      quantService.getBacktestLedger().then((res) => setLedger(res));
    }
  }, [activeSubTab, symbol, isOpen]);

  useEffect(() => {
    if (!isPlayingTrail) return;
    const timer = window.setInterval(() => {
      setTrailStep((prev) => (prev >= 4 ? 0 : prev + 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, [isPlayingTrail]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pmData, scData, rrgData, ledgerData] = await Promise.all([
        quantService.getPremarketSentiment(),
        quantService.getScreener(12),
        quantService.getRRG('TAIEX'),
        quantService.getBacktestLedger(),
      ]);
      setPremarket(pmData);
      setScreenerList(scData);
      setRrgList(rrgData);
      setLedger(ledgerData);
    } finally {
      setLoading(false);
    }
  };

  const loadSymbolData = async (targetSym: string) => {
    setLoading(true);
    try {
      if (activeSubTab === 'chip') {
        const brk = await quantService.getBrokerBranches(targetSym);
        setBrokerData(brk);
      } else if (activeSubTab === 'financials') {
        const fin = await quantService.getFinancials(targetSym);
        setFinancials(fin);
      } else if (activeSubTab === 'supplychain') {
        const sc = await quantService.getSupplyChain(targetSym);
        setSupplyChain(sc);
      } else if (activeSubTab === 'ai') {
        const ai = await quantService.getAIDiagnosis(targetSym);
        setAiReport(ai);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      const sym = inputSymbol.trim().toUpperCase();
      setSymbol(sym);
      loadSymbolData(sym);
    }
  };

  const handleBuildNLStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlPrompt.trim()) return;
    setNlBuilding(true);
    try {
      const res = await quantService.buildNaturalLanguageStrategy(nlPrompt);
      setNlResult(res);
      if (res?.matched_stocks?.length) {
        setScreenerList(res.matched_stocks);
      }
    } finally {
      setNlBuilding(false);
    }
  };

  if (!isOpen) return null;

  const symbolTabs: QuantTabId[] = ['chip', 'financials', 'supplychain', 'ai'];
  const needsSymbolInput = symbolTabs.includes(activeSubTab);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#F6F7F9] dark:bg-[#0E1116] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#EAEDF2] dark:border-zinc-800">
        {/* Header */}
        <div className="px-5 py-3.5 bg-white dark:bg-[#161B22] border-b border-[#EAEDF2] dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] font-black text-sm">
              α
            </div>
            <div>
              <h2 className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8] leading-tight">
                AlphaMind 量化戰情中台
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">
                8 大開源專案全量整合 • 真實日K與三層財報勾稽
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (needsSymbolInput) {
                  loadSymbolData(symbol);
                } else {
                  loadInitialData();
                }
              }}
              className="p-2 text-zinc-400 hover:text-[#2563EB] transition-colors"
              title="重新整理"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="flex px-4 py-2 bg-white dark:bg-[#161B22] border-b border-[#EAEDF2] dark:border-zinc-800 gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'premarket', label: '盤前情緒', icon: Compass },
            { id: 'screener', label: 'PIT選股+AI策略', icon: TrendingUp },
            { id: 'rrg', label: 'RRG輪動軌跡', icon: Activity },
            { id: 'chip', label: '主力分點', icon: Users },
            { id: 'financials', label: '三層財報15指標', icon: ShieldCheck },
            { id: 'supplychain', label: '產業鏈圖譜', icon: Network },
            { id: 'ledger', label: 'T+1回測帳本', icon: BookOpen },
            { id: 'ai', label: 'AI+ML集成會診', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as QuantTabId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'bg-[#F2F4F8] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar for Symbol-specific tabs */}
        {needsSymbolInput && (
          <form
            onSubmit={handleSymbolSubmit}
            className="px-4 py-2.5 bg-white dark:bg-[#161B22] border-b border-[#EAEDF2] dark:border-zinc-800 flex gap-2"
          >
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value)}
              placeholder="輸入台股代號 (例: 2330, 2317, 2454, 3017)"
              className="flex-1 px-3 py-1.5 bg-[#F6F7F9] dark:bg-zinc-900 border border-[#EAEDF2] dark:border-zinc-700 rounded-xl text-xs font-semibold tabular-nums focus:outline-none focus:border-[#2563EB] text-[#191F28] dark:text-[#F2F4F8]"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              查詢 {symbol}
            </button>
          </form>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* TAB 1: 盤前情緒 */}
          {activeSubTab === 'premarket' && (
            <div className="space-y-3">
              {premarket ? (
                <>
                  <div
                    className={`p-4 rounded-2xl border ${
                      premarket.headwind_risk_flag
                        ? 'bg-red-50/70 border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
                        : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {String(premarket.night_session_bias).includes('順風')
                            ? '🚀'
                            : premarket.headwind_risk_flag
                            ? '⚠️'
                            : '⚖️'}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            夜盤風向評級：{premarket.night_session_bias}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{premarket.bias_reason}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black tabular-nums ${
                          premarket.headwind_risk_flag
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {(premarket.night_futures_change_pct ?? 0) > 0 ? '+' : ''}
                        {(premarket.night_futures_change_pct ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* ADR & Index Gap Card */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-zinc-500">
                      台積電 ADR (TSM) 換算平價與加權跳空試算
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[11px] text-zinc-500 block">TSM ADR 收盤 / 漲跌</span>
                        <span className="text-sm font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8]">
                          ${(premarket.tsm_adr_close ?? 0).toFixed(2)}{' '}
                          <span
                            className={
                              (premarket.tsm_adr_change_pct ?? 0) >= 0 ? 'text-red-500' : 'text-emerald-500'
                            }
                          >
                            ({(premarket.tsm_adr_change_pct ?? 0) > 0 ? '+' : ''}
                            {(premarket.tsm_adr_change_pct ?? 0).toFixed(2)}%)
                          </span>
                        </span>
                      </div>
                      <div className="p-3 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[11px] text-zinc-500 block">換算台股平價 (USD/TWD {(premarket.usd_twd_rate ?? 32.1).toFixed(2)})</span>
                        <span className="text-sm font-bold tabular-nums text-[#191F28] dark:text-[#F2F4F8]">
                          NT$ {(premarket.tsm_adr_parity_price ?? 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="p-3 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[11px] text-zinc-500 block">2330 預估開盤跳空缺口</span>
                        <span
                          className={`text-sm font-black tabular-nums ${
                            (premarket.expected_tsmc_gap_pct ?? 0) >= 0 ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {(premarket.expected_tsmc_gap_pct ?? 0) > 0 ? '+' : ''}
                          {(premarket.expected_tsmc_gap_pct ?? 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="p-3 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[11px] text-zinc-500 block">加權指數貢獻點數</span>
                        <span
                          className={`text-sm font-black tabular-nums ${
                            (premarket.expected_taiex_gap_points ?? 0) >= 0 ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {(premarket.expected_taiex_gap_points ?? 0) > 0 ? '+' : ''}
                          {(premarket.expected_taiex_gap_points ?? 0).toFixed(1)} 點
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* US Macro Benchmarks */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800">
                    <h4 className="text-xs font-bold text-zinc-500 mb-2">美股隔夜指標連動</h4>
                    <div className="flex justify-between items-center text-xs tabular-nums">
                      <div>
                        <span className="text-zinc-500">費半 (SOX)：</span>
                        <span
                          className={`font-bold ml-1 ${
                            (premarket.sox_change_pct ?? 0) >= 0 ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {(premarket.sox_change_pct ?? 0) > 0 ? '+' : ''}
                          {(premarket.sox_change_pct ?? 0).toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">那指 (NDX)：</span>
                        <span
                          className={`font-bold ml-1 ${
                            (premarket.nasdaq_change_pct ?? 0) >= 0 ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {(premarket.nasdaq_change_pct ?? 0) > 0 ? '+' : ''}
                          {(premarket.nasdaq_change_pct ?? 0).toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">VIX 恐慌：</span>
                        <span className="font-bold ml-1 text-[#191F28] dark:text-[#F2F4F8]">
                          {(premarket.vix_level ?? 16).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入盤前情緒中...</div>
              )}
            </div>
          )}

          {/* TAB 2: PIT 29 因子選股 + AI 自然語言策略生成器 */}
          {activeSubTab === 'screener' && (
            <div className="space-y-3">
              {/* Natural Language Strategy Builder Card */}
              <form
                onSubmit={handleBuildNLStrategy}
                className="bg-white dark:bg-[#161B22] p-3.5 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    AI 自然語言轉 29 因子量化選股策略
                  </span>
                  <span className="text-[10px] text-zinc-400">PIT 營收截止日合規</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nlPrompt}
                    onChange={(e) => setNlPrompt(e.target.value)}
                    placeholder="描述選股邏輯，例如：投信連買、營收YoY>20%、本益比<20"
                    className="flex-1 px-3 py-1.5 bg-[#F6F7F9] dark:bg-zinc-900 border border-[#EAEDF2] dark:border-zinc-700 rounded-xl text-xs text-[#191F28] dark:text-[#F2F4F8]"
                  />
                  <button
                    type="submit"
                    disabled={nlBuilding}
                    className="px-3 py-1.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold whitespace-nowrap hover:bg-blue-700 transition-colors"
                  >
                    {nlBuilding ? '生成中...' : '生成並選股'}
                  </button>
                </div>
                {nlResult && (
                  <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl text-[11px] space-y-1">
                    <div className="font-bold text-[#2563EB]">{nlResult.strategy.strategy_name}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {nlResult.strategy.parsed_rules.map((r, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-[#EAEDF2] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 tabular-nums"
                        >
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </form>

              <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
                <span>29 因子評分 × twstock 四大買賣點 (8規則)</span>
                <span className="tabular-nums">共 {screenerList.length} 檔</span>
              </div>
              {screenerList.length > 0 ? (
                screenerList.map((item) => {
                  const sig = item.signal || item.action || 'HOLD';
                  const score = Number(item.total_score ?? 0);
                  const closePx = Number(item.latest_close ?? 0);
                  const yoy = Number(item.revenue_yoy_pct ?? 0);
                  const conc = Number(item.chip_concentration_5d_pct ?? 0);
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => {
                        setSymbol(item.symbol);
                        setInputSymbol(item.symbol);
                        setActiveSubTab('ai');
                      }}
                      className="cursor-pointer bg-white dark:bg-[#161B22] p-3.5 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 flex items-center justify-between hover:border-[#2563EB] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                            {item.symbol}
                          </span>
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            {item.name || item.symbol}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              sig === 'STRONG_BUY' || sig === 'BUY'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                                : sig === 'SELL'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                                : 'bg-zinc-500/10 text-zinc-500'
                            }`}
                          >
                            {sig}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
                          <span>規則: {item.twstock_rule || '均線觀察'}</span>
                          <span>
                            PIT營收 YoY: {yoy >= 0 ? '+' : ''}
                            {yoy.toFixed(1)}%
                          </span>
                          <span>5D籌碼集中: {conc.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#2563EB] tabular-nums">
                          {score.toFixed(1)} 分
                        </div>
                        <div className="text-xs text-zinc-400 tabular-nums">
                          NT$ {closePx.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入選股清單中...</div>
              )}
            </div>
          )}

          {/* TAB 3: RRG 輪動 + 5日拖尾軌跡播放 */}
          {activeSubTab === 'rrg' && (
            <div className="space-y-3">
              {/* Interactive 2D RRG Scatter & Trail Canvas */}
              <div className="bg-white dark:bg-[#161B22] p-3.5 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                    RRG 相對強弱四象限雷達 (twstockrs rs_v1 雙階 Z-Score)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlayingTrail((p) => !p)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold"
                    >
                      {isPlayingTrail ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {isPlayingTrail ? '暫停軌跡' : '播放5日拖尾'}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      value={trailStep}
                      onChange={(e) => setTrailStep(Number(e.target.value))}
                      className="w-20 accent-[#2563EB]"
                    />
                    <span className="text-[11px] text-zinc-500 tabular-nums">T-{4 - trailStep}</span>
                  </div>
                </div>

                {/* SVG 4-Quadrant RRG Plot */}
                <svg viewBox="0 0 360 220" className="w-full h-48 rounded-xl bg-[#F6F7F9] dark:bg-zinc-900 border border-[#EAEDF2] dark:border-zinc-800">
                  {/* Quadrant dividers at (180, 110) = (100, 100) */}
                  <line x1="180" y1="0" x2="180" y2="220" stroke="#94A3B8" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="0" y1="110" x2="360" y2="110" stroke="#94A3B8" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="10" y="18" fontSize="9" fill="#2563EB" fontWeight="bold">Improving (轉強)</text>
                  <text x="275" y="18" fontSize="9" fill="#10B981" fontWeight="bold">Leading (領先)</text>
                  <text x="10" y="210" fontSize="9" fill="#EF4444" fontWeight="bold">Lagging (落後)</text>
                  <text x="265" y="210" fontSize="9" fill="#F59E0B" fontWeight="bold">Weakening (轉弱)</text>

                  {rrgList.map((snap) => {
                    const trail = snap.trail || snap.tail_points || [snap.current_point];
                    const maxIdx = Math.min(trail.length - 1, trailStep);
                    const visibleTrail = trail.slice(0, maxIdx + 1);
                    const toX = (rs: number) => Math.max(16, Math.min(344, 180 + rs * 50));
                    const toY = (mom: number) => Math.max(16, Math.min(204, 110 - mom * 34));
                    const pts = visibleTrail.map((p) => `${toX(p.rs_ratio)},${toY(p.rs_momentum)}`).join(' ');
                    const head = visibleTrail[visibleTrail.length - 1] || snap.current_point;
                    const hx = toX(head.rs_ratio);
                    const hy = toY(head.rs_momentum);
                    const color =
                      head.quadrant === 'Leading'
                        ? '#10B981'
                        : head.quadrant === 'Improving'
                        ? '#2563EB'
                        : head.quadrant === 'Weakening'
                        ? '#F59E0B'
                        : '#EF4444';
                    return (
                      <g key={snap.symbol}>
                        {visibleTrail.length > 1 && (
                          <polyline
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            strokeOpacity="0.65"
                            points={pts}
                          />
                        )}
                        <circle cx={hx} cy={hy} r="4.5" fill={color} />
                        <text x={hx + 6} y={hy + 3} fontSize="9" fontWeight="bold" fill="#191F28">
                          {snap.symbol} {snap.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {rrgList.length > 0 ? (
                rrgList.map((snap) => {
                  const cp = snap.current_point || { rs_ratio: 100, rs_momentum: 100, quadrant: 'Leading' };
                  const q = cp.quadrant;
                  const qColor =
                    q === 'Leading'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : q === 'Improving'
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                      : q === 'Weakening'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      : 'bg-red-500/10 text-red-600 border-red-500/30';

                  return (
                    <div
                      key={snap.symbol}
                      className="bg-white dark:bg-[#161B22] p-3.5 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                            {snap.symbol}
                          </span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">{snap.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${qColor}`}>
                            {q}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1 flex gap-3 tabular-nums">
                          <span>RS-Ratio: {Number(cp.rs_ratio ?? 100).toFixed(2)}</span>
                          <span>RS-Mom: {Number(cp.rs_momentum ?? 100).toFixed(2)}</span>
                          <span>角速度: {(Number(snap.velocity ?? 0) * 100).toFixed(2)}</span>
                        </div>
                      </div>
                      {snap.quadrant_transition && (
                        <div className="text-right text-[11px] text-[#2563EB] font-semibold">
                          {snap.quadrant_transition}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入 RRG 輪動清單中...</div>
              )}
            </div>
          )}

          {/* TAB 4: 主力分點與三大法人基準錨定存量 (voidful/tw-institutional-stocker) */}
          {activeSubTab === 'chip' && (
            <div className="space-y-3">
              {brokerData ? (
                <>
                  {/* Institutional Baseline Summary */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {brokerData.symbol} {brokerData.name} 三大法人基準錨定持股與分點集中度
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[#2563EB] text-[10px] font-bold">
                        {brokerData.broker_report.signal_label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">外資基準持股比</span>
                        <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {Number(brokerData.institutional_baseline.foreign_ratio_pct ?? 42).toFixed(2)}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">5日分點集中度</span>
                        <span className="text-sm font-bold text-[#2563EB]">
                          {Number(brokerData.broker_report.concentration_5d_pct ?? 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">20日分點集中度</span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          {Number(brokerData.broker_report.concentration_20d_pct ?? 0).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    {brokerData.broker_report.pricing_power_brokers.length > 0 && (
                      <div className="text-[11px] text-zinc-500">
                        定價權關鍵分點 (Pearson r ≥ 0.45)：
                        <span className="font-bold text-[#191F28] dark:text-[#F2F4F8] ml-1">
                          {brokerData.broker_report.pricing_power_brokers.join('、')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Top Buy Branches with Next-Day Win Rate & Pearson r */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2">
                    <h4 className="text-xs font-bold text-red-500">主力買超 Top 分點（含隔日勝率與 Pearson r）</h4>
                    {brokerData.broker_report.top_buy_branches.map((b) => (
                      <div
                        key={b.broker_id}
                        className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl flex items-center justify-between text-xs tabular-nums"
                      >
                        <div>
                          <div className="font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            {b.broker_name}{' '}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-[#2563EB]">
                              {b.role_tag}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            均價 ${b.avg_price.toFixed(1)} • 隔日勝率 {b.next_day_win_rate_pct.toFixed(1)}% • 60D r={b.pearson_r_60d.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-red-500">+{b.net_lots.toLocaleString()} 張</div>
                          <div className="text-[10px] text-zinc-400">佔成交 {b.share_of_volume_pct.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入主力分點與法人存量中...</div>
              )}
            </div>
          )}

          {/* TAB 5: 三層財報勾稽 + 15 項指標 */}
          {activeSubTab === 'financials' && (
            <div className="space-y-3">
              {financials ? (
                <>
                  <div
                    className={`p-4 rounded-2xl border ${
                      financials.cash_trap_warning
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
                        : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {financials.cash_trap_warning ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {financials.cash_trap_warning
                            ? '⚠️ 現金流勾稽預警：營業利益無實質現金支撐'
                            : '✅ 三層財報防偽與期末現金勾稽全數通過'}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                          CFO 佔淨利比率：{(Number(financials.cfo_to_net_income_ratio ?? 1) * 100).toFixed(1)}% • 資產負債表期末現金勾稽：{financials.ending_cash_reconciled !== false ? '吻合' : '異常'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expense & Profitability Grid */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {financials.symbol} 營業費用率細拆與核心獲利指標
                      </h4>
                      <span className="text-xs text-zinc-500 tabular-nums">{financials.season}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">營業毛利率</span>
                        <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          {Number(financials.gross_margin_pct ?? 40).toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">營業利益率</span>
                        <span className="text-sm font-bold text-[#2563EB]">
                          {Number(financials.operating_margin ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">單季 EPS</span>
                        <span className="text-sm font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          NT$ {Number(financials.eps ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">推銷+管理費率</span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          {Number(financials.sga_rate ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">研發費用率</span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          {Number(financials.rd_rate ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block">ROE / 負債比</span>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          {Number(financials.roe_pct ?? 18).toFixed(1)}% / {Number(financials.debt_ratio_pct ?? 38).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Layer 1 MOPS Direct Link Button */}
                  <a
                    href={financials.mops_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-white dark:bg-[#161B22] border border-[#2563EB] text-[#2563EB] rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                  >
                    <span>直連公開資訊觀測站 (MOPS) 原始財報簽證核驗</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入三層財報核驗中...</div>
              )}
            </div>
          )}

          {/* TAB 6: 78 大產業鏈力導向圖譜 + [[WikiLink]] 知識圖譜 */}
          {activeSubTab === 'supplychain' && (
            <div className="space-y-3">
              {supplyChain ? (
                <>
                  {/* Interactive SVG Force-Directed Topology */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                        {supplyChain.symbol} {supplyChain.name} 上中下游供應鏈拓樸圖
                      </h4>
                      <span className="text-[10px] text-zinc-400 tabular-nums">
                        節點 {supplyChain.graph.nodes.length} • 關聯邊 {supplyChain.graph.links.length}
                      </span>
                    </div>

                    <svg viewBox="0 0 380 210" className="w-full h-48 rounded-xl bg-[#F6F7F9] dark:bg-zinc-900 border border-[#EAEDF2] dark:border-zinc-800">
                      {(() => {
                        const nodes = supplyChain.graph.nodes;
                        const links = supplyChain.graph.links;
                        const posMap: Record<string, { x: number; y: number }> = {};
                        const upNodes = nodes.filter((n) => n.group === 'upstream');
                        const downNodes = nodes.filter((n) => n.group === 'downstream');
                        const otherNodes = nodes.filter(
                          (n) => n.id !== supplyChain.symbol && n.group !== 'upstream' && n.group !== 'downstream'
                        );

                        posMap[supplyChain.symbol] = { x: 190, y: 105 };
                        upNodes.forEach((n, i) => {
                          posMap[n.id] = { x: 65, y: 38 + i * (140 / Math.max(1, upNodes.length)) };
                        });
                        downNodes.forEach((n, i) => {
                          posMap[n.id] = { x: 315, y: 38 + i * (140 / Math.max(1, downNodes.length)) };
                        });
                        otherNodes.forEach((n, i) => {
                          const angle = (i / Math.max(1, otherNodes.length)) * Math.PI * 2;
                          posMap[n.id] = {
                            x: 190 + Math.cos(angle) * 75,
                            y: 105 + Math.sin(angle) * 68,
                          };
                        });

                        return (
                          <>
                            {links.map((lk, idx) => {
                              const s = posMap[lk.source] || { x: 190, y: 105 };
                              const t = posMap[lk.target] || { x: 190, y: 105 };
                              return (
                                <line
                                  key={idx}
                                  x1={s.x}
                                  y1={s.y}
                                  x2={t.x}
                                  y2={t.y}
                                  stroke="#94A3B8"
                                  strokeWidth="1.2"
                                  strokeOpacity="0.6"
                                />
                              );
                            })}
                            {nodes.map((nd) => {
                              const p = posMap[nd.id] || { x: 190, y: 105 };
                              const fill =
                                nd.id === supplyChain.symbol
                                  ? '#2563EB'
                                  : nd.group === 'upstream'
                                  ? '#10B981'
                                  : nd.group === 'downstream'
                                  ? '#F59E0B'
                                  : '#64748B';
                              return (
                                <g key={nd.id}>
                                  <circle cx={p.x} cy={p.y} r={nd.id === supplyChain.symbol ? 11 : 7} fill={fill} />
                                  <text
                                    x={p.x}
                                    y={p.y - 11}
                                    textAnchor="middle"
                                    fontSize="8.5"
                                    fontWeight="bold"
                                    fill="#191F28"
                                  >
                                    {nd.name}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Upstream / Midstream / Downstream & WikiLink */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-emerald-600">上游供應商：</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{supplyChain.upstream.join('、') || '無'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[#2563EB]">中游同業競爭：</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{supplyChain.midstream.join('、') || '無'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-600">下游客戶應用：</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{supplyChain.downstream.join('、') || '無'}</span>
                    </div>
                    {supplyChain.wiki_markdown && (
                      <pre className="mt-2 p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl text-[11px] text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap font-mono">
                        {supplyChain.wiki_markdown}
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入產業鏈圖譜中...</div>
              )}
            </div>
          )}

          {/* TAB 7: 嚴格 T+1 開盤價回測績效帳本 */}
          {activeSubTab === 'ledger' && (
            <div className="space-y-3">
              {ledger ? (
                <>
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 grid grid-cols-3 gap-2 text-center tabular-nums">
                    <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">T+1 實戰勝率</span>
                      <span className="text-sm font-black text-[#2563EB]">
                        {Number(ledger.win_rate_pct ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">累計淨報酬 (扣費稅)</span>
                      <span
                        className={`text-sm font-black ${
                          Number(ledger.cumulative_return_pct ?? 0) >= 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}
                      >
                        {Number(ledger.cumulative_return_pct ?? 0) >= 0 ? '+' : ''}
                        {Number(ledger.cumulative_return_pct ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                      <span className="text-[10px] text-zinc-500 block">獲利因子 PF</span>
                      <span className="text-sm font-black text-[#191F28] dark:text-[#F2F4F8]">
                        {Number(ledger.profit_factor ?? 1).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ledger.recent_records.map((rec, i) => (
                      <div
                        key={`${rec.code}-${i}`}
                        className="bg-white dark:bg-[#161B22] p-3.5 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 flex items-center justify-between text-xs tabular-nums"
                      >
                        <div>
                          <div className="font-bold text-[#191F28] dark:text-[#F2F4F8]">
                            {rec.code} {rec.name || ''} • 訊號日 {rec.signal_date}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            T+1 進場含滑價: ${Number(rec.entry_open_real ?? 0).toFixed(2)} • 出場原因: {rec.exit_reason}
                          </div>
                        </div>
                        <div
                          className={`text-sm font-black ${
                            Number(rec.final_net_return_pct ?? 0) >= 0 ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {Number(rec.final_net_return_pct ?? 0) >= 0 ? '+' : ''}
                          {Number(rec.final_net_return_pct ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入 T+1 回測帳本中...</div>
              )}
            </div>
          )}

          {/* TAB 8: Rule-First AI 診斷 + ML 三模型動態集成 */}
          {activeSubTab === 'ai' && (
            <div className="space-y-3">
              {aiReport ? (
                <>
                  {/* Rating Header */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-zinc-400">
                          Rule-First 護欄診斷 ({aiReport.llm_engine || 'Rule-First + ML Ensemble'})
                        </div>
                        <div className="text-xl font-black text-[#2563EB] mt-0.5">{aiReport.rating}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">綜合信心度</div>
                        <div className="text-base font-bold text-[#191F28] dark:text-[#F2F4F8] tabular-nums">
                          {aiReport.confidence_score} / 100
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      {aiReport.headline_summary}
                    </p>
                  </div>

                  {/* Guardrails Applied */}
                  {aiReport.guardrails_applied && aiReport.guardrails_applied.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">硬性量化護欄生效：</span>
                        {aiReport.guardrails_applied.join('、')}
                      </div>
                    </div>
                  )}

                  {/* ML Ensemble Breakdown (kerr20801 LightGBM + XGBoost + ARIMA) */}
                  {aiReport.ml_ensemble && (
                    <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#191F28] dark:text-[#F2F4F8]">
                          ML 三模型動態權重預測 (體制: {aiReport.ml_ensemble.dynamic_weights.regime_label})
                        </h4>
                        <span className="text-xs font-black text-[#2563EB] tabular-nums">
                          5日目標 ${aiReport.ml_ensemble.ensemble_target_price_5d.toFixed(1)} (
                          {aiReport.ml_ensemble.ensemble_return_5d_pct >= 0 ? '+' : ''}
                          {aiReport.ml_ensemble.ensemble_return_5d_pct.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {aiReport.ml_ensemble.models.map((m) => (
                          <div
                            key={m.model_name}
                            className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl flex items-center justify-between text-xs tabular-nums"
                          >
                            <div>
                              <div className="font-bold text-[#191F28] dark:text-[#F2F4F8]">
                                {m.model_name} • 權重 {(m.weight * 100).toFixed(0)}%
                              </div>
                              <div className="text-[11px] text-zinc-500">{m.rationale}</div>
                            </div>
                            <div
                              className={`font-black ${
                                m.expected_return_5d_pct >= 0 ? 'text-red-500' : 'text-emerald-500'
                              }`}
                            >
                              {m.expected_return_5d_pct >= 0 ? '+' : ''}
                              {m.expected_return_5d_pct.toFixed(2)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Execution Strategy */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2.5">
                    <h4 className="text-xs font-bold text-zinc-500">精確執行點位建議</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-zinc-500 text-[10px] block">進場參考價</span>
                        <span className="font-bold text-[#2563EB]">
                          ${aiReport.execution_strategy.suggested_entry_price}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-zinc-500 text-[10px] block">停利目標 (+10%)</span>
                        <span className="font-bold text-red-500">
                          ${aiReport.execution_strategy.take_profit_price}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#F6F7F9] dark:bg-zinc-900 rounded-xl">
                        <span className="text-zinc-500 text-[10px] block">停損防線 (-8%)</span>
                        <span className="font-bold text-emerald-500">
                          ${aiReport.execution_strategy.stop_loss_price}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnoses details */}
                  <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-[#EAEDF2] dark:border-zinc-800 space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-zinc-500">技術與買賣點：</span>
                      <span className="text-zinc-700 dark:text-zinc-300 ml-1">{aiReport.four_rules_diagnosis}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500">法人與主力分點：</span>
                      <span className="text-zinc-700 dark:text-zinc-300 ml-1">{aiReport.institutional_analysis}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500">三層財報誠信：</span>
                      <span className="text-zinc-700 dark:text-zinc-300 ml-1">{aiReport.financial_integrity_check}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">載入 AI 量化會診報告中...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
