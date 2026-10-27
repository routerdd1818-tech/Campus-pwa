import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AssetAccount, StockHoldingItem, SurvivalBudgetSettings } from '../types';
import { POPULAR_STOCKS } from '../services/stockService';
import {
  X,
  Wallet,
  TrendingUp,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Check,
  ShieldCheck,
  Settings,
  History,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface AssetReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetReconciliationModal: React.FC<AssetReconciliationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    assetAccounts,
    adjustAccountBalance,
    balanceAdjustments,
    addStockHolding,
    updateStockHolding,
    deleteStockHolding,
    refreshStockPrices,
    survivalSettings,
    updateSurvivalSettings,
    debts,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'reconcile' | 'settings'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 對帳表單狀態
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => assetAccounts[0]?.id || '');
  const [actualBalanceInput, setActualBalanceInput] = useState<string>('');
  const [reconcileReason, setReconcileReason] = useState<string>('日常零錢盤點誤差');
  const [reconcileSuccessMsg, setReconcileSuccessMsg] = useState<string | null>(null);

  // 股票新增/編輯狀態
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<StockHoldingItem | null>(null);
  const [stockSymbol, setStockSymbol] = useState('0050.TW');
  const [stockName, setStockName] = useState('元大台灣50');
  const [stockShares, setStockShares] = useState('100');
  const [stockPrice, setStockPrice] = useState('195.5');

  // 生存預算設定暫存
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState(String(survivalSettings.monthlyBudget));
  const [emergencyReserveInput, setEmergencyReserveInput] = useState(String(survivalSettings.emergencyReserve));
  const [includeCash, setIncludeCash] = useState(survivalSettings.includeCash);
  const [includeBank, setIncludeBank] = useState(survivalSettings.includeBank);
  const [includeReceivables, setIncludeReceivables] = useState(survivalSettings.includeReceivables);
  const [includeStocks, setIncludeStocks] = useState(survivalSettings.includeStocks);

  if (!isOpen) return null;

  // 總資產分類匯總
  const cashTotal = assetAccounts.filter((a) => a.type === 'cash').reduce((sum, a) => sum + a.balance, 0);
  const bankTotal = assetAccounts.filter((a) => a.type === 'bank').reduce((sum, a) => sum + a.balance, 0);
  const stockAccount = assetAccounts.find((a) => a.type === 'stock');
  const stockTotal = stockAccount?.stocks?.reduce((sum, s) => sum + s.shares * s.currentPrice, 0) || 0;

  // 別人欠款總計 (they_owe 尚待還清之應收帳款)
  const receivablesTotal = debts
    .filter((d) => d.type === 'they_owe' && !d.isSettled)
    .reduce((sum, d) => sum + (d.remainingAmount ?? 0), 0);

  // 總淨資產 (Net Worth)
  const netWorthTotal = cashTotal + bankTotal + stockTotal + receivablesTotal;

  // 待對帳帳戶資訊
  const currentReconcileAccount = assetAccounts.find((a) => a.id === selectedAccountId) || assetAccounts[0];
  const actualVal = Number(actualBalanceInput);
  const diffAmount = !isNaN(actualVal) && actualBalanceInput !== ''
    ? Math.round((actualVal - (currentReconcileAccount?.balance || 0)) * 10) / 10
    : 0;

  // 刷新即時行情報價
  const handleRefreshQuotes = async () => {
    setIsRefreshing(true);
    await refreshStockPrices();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // 執行平帳銷帳
  const handlePerformReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReconcileAccount || isNaN(actualVal) || actualBalanceInput === '') return;

    adjustAccountBalance(currentReconcileAccount.id, actualVal, reconcileReason);
    setReconcileSuccessMsg(`已成功將「${currentReconcileAccount.name}」校正為 $${actualVal.toLocaleString()}（差額 $${diffAmount > 0 ? `+${diffAmount}` : diffAmount}）`);
    setActualBalanceInput('');
    setTimeout(() => setReconcileSuccessMsg(null), 4000);
  };

  // 儲存股票持股
  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAccount) return;
    const sharesNum = Math.max(0, Number(stockShares) || 0);
    const priceNum = Math.max(0, Number(stockPrice) || 0);
    if (sharesNum <= 0) return;

    if (editingStock) {
      updateStockHolding(stockAccount.id, {
        ...editingStock,
        symbol: stockSymbol.trim().toUpperCase(),
        name: stockName.trim() || stockSymbol.trim(),
        shares: sharesNum,
        currentPrice: priceNum,
        lastPriceUpdated: new Date().toISOString(),
      });
    } else {
      addStockHolding(stockAccount.id, {
        id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        symbol: stockSymbol.trim().toUpperCase(),
        name: stockName.trim() || stockSymbol.trim(),
        shares: sharesNum,
        currentPrice: priceNum,
        currency: 'TWD',
        lastPriceUpdated: new Date().toISOString(),
      });
    }

    setIsStockModalOpen(false);
    setEditingStock(null);
  };

  // 儲存生存試算設定
  const handleSaveSurvivalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const mb = Math.max(1000, Number(monthlyBudgetInput) || 12000);
    const er = Math.max(0, Number(emergencyReserveInput) || 0);

    updateSurvivalSettings({
      monthlyBudget: mb,
      emergencyReserve: er,
      includeCash,
      includeBank,
      includeReceivables,
      includeStocks,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-3xl bg-white dark:bg-calico-darkCard border border-black/10 dark:border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                資產盤點與對帳銷帳
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                身上總額、股票報價、銷帳平帳與月底生存試算設定
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400 font-bold flex items-center justify-center hover:bg-black/10 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-black/5 dark:bg-zinc-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center justify-center space-x-1 ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              <span>💼 資產盤點</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reconcile')}
              className={`py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center justify-center space-x-1 ${
                activeTab === 'reconcile'
                  ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              <span>⚖️ 對帳銷帳</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center justify-center space-x-1 ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              <span>⚙️ 吃土設定</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ========================================================= */}
          {/* TAB 1: 資產盤點與股票基金持股 */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              {/* 身家總額看板 */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                    💰 身上錢與投資總淨值
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    即時盤點
                  </span>
                </div>
                <div className="text-3xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight font-mono">
                  ${Math.round(netWorthTotal).toLocaleString()}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-500/15 text-xs">
                  <div>
                    <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">💵 現金</span>
                    <strong className="text-calico-cocoa dark:text-zinc-200 font-mono">${Math.round(cashTotal).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">🏦 存款</span>
                    <strong className="text-calico-cocoa dark:text-zinc-200 font-mono">${Math.round(bankTotal).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">📈 股票基金</span>
                    <strong className="text-calico-cocoa dark:text-zinc-200 font-mono">${Math.round(stockTotal).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">🤝 別人欠款</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">${Math.round(receivablesTotal).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* 現金與銀行帳戶明細 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
                    💳 現金與存款帳戶
                  </span>
                  <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                    記帳收支時自動加減
                  </span>
                </div>
                <div className="space-y-2">
                  {assetAccounts.filter((a) => a.type !== 'stock').map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-black/10 transition-all"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl">{acc.emoji || (acc.type === 'cash' ? '💵' : '🏦')}</span>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                              {acc.name}
                            </span>
                            {acc.accountNumber && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-calico-cocoa/50 dark:text-zinc-400 font-mono">
                                *{acc.accountNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-500">
                            {acc.type === 'cash' ? '實體皮夾與零錢' : '銀行活存帳戶'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-calico-cocoa dark:text-zinc-100 font-mono">
                          ${Math.round(acc.balance).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            setActiveTab('reconcile');
                          }}
                          className="block text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold mt-0.5 ml-auto"
                        >
                          對帳平帳
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 📈 股票與基金 (上報價系統與持股計算) */}
              <div className="space-y-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
                      📈 股票與基金持股 (報價系統連動)
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshQuotes}
                      disabled={isRefreshing}
                      title="刷新即時行情"
                      className="p-1 rounded-lg text-calico-cocoa/40 hover:text-amber-600 hover:bg-black/5 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStock(null);
                      setStockSymbol('0050.TW');
                      setStockName('元大台灣50');
                      setStockShares('100');
                      setStockPrice('195.5');
                      setIsStockModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增持股</span>
                  </button>
                </div>

                {stockAccount?.stocks && stockAccount.stocks.length > 0 ? (
                  <div className="space-y-2">
                    {stockAccount.stocks.map((stock) => {
                      const totalVal = Math.round(stock.shares * stock.currentPrice);
                      return (
                        <div
                          key={stock.id}
                          className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-black/10 transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 truncate">
                                {stock.name}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono">
                                {stock.symbol}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStock(stock);
                                  setStockSymbol(stock.symbol);
                                  setStockName(stock.name);
                                  setStockShares(String(stock.shares));
                                  setStockPrice(String(stock.currentPrice));
                                  setIsStockModalOpen(true);
                                }}
                                className="p-1 rounded-lg text-calico-cocoa/30 hover:text-amber-600 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => stockAccount && deleteStockHolding(stockAccount.id, stock.id)}
                                className="p-1 rounded-lg text-calico-cocoa/30 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center space-x-2 text-[11px] text-calico-cocoa/60 dark:text-zinc-400 font-medium">
                              <span>持有 <strong className="font-mono text-calico-cocoa dark:text-zinc-200">{stock.shares}</strong> 股</span>
                              <span>×</span>
                              <span>單價 <strong className="font-mono text-calico-cocoa dark:text-zinc-200">${stock.currentPrice}</strong></span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                                市值 ${totalVal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-calico-cocoa/40 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                    尚無股票基金紀錄，點擊上方「新增持股」記錄 0050、00878、台積電等標的！
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 對帳與銷帳平帳 (Reconciliation Adjustment) */}
          {/* ========================================================= */}
          {activeTab === 'reconcile' && (
            <div className="space-y-4 animate-fade-in">
              {reconcileSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center space-x-2 animate-fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{reconcileSuccessMsg}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 text-xs text-calico-cocoa/70 dark:text-zinc-300 space-y-1">
                <span className="font-black text-calico-cocoa dark:text-zinc-100 block">
                  💡 為什麼需要對帳銷帳？
                </span>
                <p className="text-[11px] leading-relaxed">
                  買飲料找零漏記、發票忘記拿，常導致記帳總額與皮夾現金對不上。
                  在此輸入「目前錢包或帳戶實際餘額」，系統將自動產生一筆「銷帳調整紀錄」補平差額！
                </p>
              </div>

              <form onSubmit={handlePerformReconciliation} className="space-y-3.5">
                {/* 選擇對帳帳戶 */}
                <div>
                  <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                    選擇欲對帳的帳戶
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                  >
                    {assetAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji || '💼'} {a.name}（目前系統帳面: ${Math.round(a.balance).toLocaleString()}）
                      </option>
                    ))}
                  </select>
                </div>

                {/* 輸入實際清點金額 */}
                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                    <span>系統目前紀錄帳面</span>
                    <span className="font-black font-mono text-calico-cocoa dark:text-zinc-100">
                      ${Math.round(currentReconcileAccount?.balance || 0).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-calico-cocoa/80 dark:text-zinc-300 block mb-1">
                      實體目前「真實清點餘額」 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={actualBalanceInput}
                      onChange={(e) => setActualBalanceInput(e.target.value)}
                      placeholder={`例如清點後有 $${Math.round(currentReconcileAccount?.balance || 0)}`}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-amber-500"
                    />
                  </div>

                  {actualBalanceInput !== '' && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-black/5 dark:border-white/5 font-bold">
                      <span>自動計算對帳差額</span>
                      <span
                        className={`font-mono text-sm font-black ${
                          diffAmount === 0
                            ? 'text-emerald-600'
                            : diffAmount > 0
                            ? 'text-emerald-600'
                            : 'text-rose-500'
                        }`}
                      >
                        {diffAmount === 0 ? '帳目吻合無差額 ✓' : diffAmount > 0 ? `+${diffAmount} (盤盈/多出)` : `${diffAmount} (盤虧/少記)`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 銷帳原因 */}
                <div>
                  <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                    銷帳平帳說明
                  </label>
                  <input
                    type="text"
                    value={reconcileReason}
                    onChange={(e) => setReconcileReason(e.target.value)}
                    placeholder="例: 發票遺漏、零錢找錯、對帳校正"
                    className="w-full px-3 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-medium text-calico-cocoa dark:text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actualBalanceInput === ''}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 transition-all whitespace-nowrap"
                >
                  確認銷帳平帳（同步修正餘額）
                </button>
              </form>

              {/* 對帳銷帳歷史清單 */}
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 block">
                  📜 銷帳調帳歷史紀錄
                </span>
                {balanceAdjustments.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {balanceAdjustments.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-calico-cocoa dark:text-zinc-200">
                              {rec.accountName}
                            </span>
                            <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-500 font-mono">
                              {rec.date}
                            </span>
                          </div>
                          <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 block mt-0.5">
                            {rec.reason} (${rec.beforeBalance} → ${rec.afterBalance})
                          </span>
                        </div>
                        <span
                          className={`font-black font-mono text-xs ${
                            rec.diffAmount >= 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {rec.diffAmount >= 0 ? `+${rec.diffAmount}` : rec.diffAmount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-calico-cocoa/40 py-2 text-center">
                    目前尚無銷帳調整紀錄
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 吃土生存試算設定 */}
          {/* ========================================================= */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSurvivalSettings} className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 text-xs text-calico-cocoa/70 dark:text-zinc-300 space-y-1">
                <span className="font-black text-calico-cocoa dark:text-zinc-100 block">
                  ⚙️ 月底吃土生存金計算邏輯
                </span>
                <p className="text-[11px] leading-relaxed">
                  系統每日將依據你的「每月可花費預算」或「指定納入的身上流動資產」，扣除固定支出、分期與緊急預備金後，自動平攤至月底剩餘天數！
                </p>
              </div>

              {/* 每月預算基準 */}
              <div>
                <label className="text-xs font-bold text-calico-cocoa/80 dark:text-zinc-300 block mb-1">
                  每月份總花費預算 (月預算基準) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-calico-cocoa/40">$</span>
                  <input
                    type="number"
                    min={1000}
                    step={100}
                    value={monthlyBudgetInput}
                    onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 緊急預備金保留 */}
              <div>
                <label className="text-xs font-bold text-calico-cocoa/80 dark:text-zinc-300 block mb-1">
                  緊急預備金保留（不納入每日生存金消耗）
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-calico-cocoa/40">$</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={emergencyReserveInput}
                    onChange={(e) => setEmergencyReserveInput(e.target.value)}
                    placeholder="例如 3,000 元"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-500 block mt-1">
                  保留於銀行戶頭的最後防線，試算時自動扣除以防見底
                </span>
              </div>

              {/* 納入生存金資產範圍勾選 */}
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 block">
                  流動資產納入生存金範圍
                </span>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200">
                      💵 現金錢包餘額 (目前 ${Math.round(cashTotal).toLocaleString()})
                    </span>
                    <input
                      type="checkbox"
                      checked={includeCash}
                      onChange={(e) => setIncludeCash(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200">
                      🏦 銀行活存帳戶 (目前 ${Math.round(bankTotal).toLocaleString()})
                    </span>
                    <input
                      type="checkbox"
                      checked={includeBank}
                      onChange={(e) => setIncludeBank(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200">
                      🤝 別人欠我的未還款 (目前 ${Math.round(receivablesTotal).toLocaleString()})
                    </span>
                    <input
                      type="checkbox"
                      checked={includeReceivables}
                      onChange={(e) => setIncludeReceivables(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200">
                      📈 股票基金市值 (目前 ${Math.round(stockTotal).toLocaleString()})
                    </span>
                    <input
                      type="checkbox"
                      checked={includeStocks}
                      onChange={(e) => setIncludeStocks(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md hover:from-amber-600 hover:to-orange-600 transition-all whitespace-nowrap"
                >
                  儲存吃土生存試算設定
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 內嵌新增/編輯股票持股 Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
              <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                {editingStock ? '編輯持股紀錄' : '新增股票 / 基金持股'}
              </h4>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 text-xs font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-3">
              {/* 常用標的快速點選 */}
              <div>
                <label className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block mb-1">
                  常用熱門標的快速選取
                </label>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_STOCKS.slice(0, 6).map((p) => (
                    <button
                      key={p.symbol}
                      type="button"
                      onClick={() => {
                        setStockSymbol(p.symbol);
                        setStockName(p.name);
                        setStockPrice(String(p.defaultPrice));
                      }}
                      className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-amber-500/15 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-300"
                    >
                      {p.name} ({p.symbol.split('.')[0]})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                  股票/基金代號
                </label>
                <input
                  type="text"
                  required
                  value={stockSymbol}
                  onChange={(e) => setStockSymbol(e.target.value)}
                  placeholder="例如: 0050.TW, 2330.TW, VOO"
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                  標的名稱
                </label>
                <input
                  type="text"
                  required
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  placeholder="例如: 元大台灣50"
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                    持有股數
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={stockShares}
                    onChange={(e) => setStockShares(e.target.value)}
                    placeholder="股數 (例: 100)"
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                    每股單價 (TWD)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    required
                    value={stockPrice}
                    onChange={(e) => setStockPrice(e.target.value)}
                    placeholder="單價 (例: 195.5)"
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 text-xs flex items-center justify-between font-black text-amber-900 dark:text-amber-200">
                <span>試算總市值：</span>
                <span className="font-mono text-sm">
                  ${Math.round((Number(stockShares) || 0) * (Number(stockPrice) || 0)).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-black"
                >
                  {editingStock ? '儲存變更' : '新增持股'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
