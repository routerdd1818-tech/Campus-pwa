import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AssetAccount, AssetAccountType, StockHoldingItem, SurvivalBudgetSettings } from '../types';
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
  Landmark,
  Smartphone,
  CreditCard,
  QrCode,
  HandCoins,
  PiggyBank,
  Scale,
  Briefcase,
  ChevronRight,
} from 'lucide-react';

interface AssetReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ACCOUNTS = [
  { name: 'LINE Pay', type: 'digital_wallet' as AssetAccountType, iconKey: 'smartphone', colorHex: '#06C755', desc: '行動支付' },
  { name: '街口支付', type: 'digital_wallet' as AssetAccountType, iconKey: 'smartphone', colorHex: '#E60012', desc: '電子支付' },
  { name: '悠遊卡 / 一卡通', type: 'digital_wallet' as AssetAccountType, iconKey: 'credit-card', colorHex: '#008CD6', desc: '電子票證' },
  { name: '台新 Richart', type: 'bank' as AssetAccountType, iconKey: 'landmark', colorHex: '#3B82F6', desc: '數位銀行' },
  { name: '玉山銀行', type: 'bank' as AssetAccountType, iconKey: 'landmark', colorHex: '#14B8A6', desc: '銀行存款' },
  { name: '國泰世華', type: 'bank' as AssetAccountType, iconKey: 'landmark', colorHex: '#009944', desc: '銀行活存' },
  { name: '郵局儲金', type: 'bank' as AssetAccountType, iconKey: 'landmark', colorHex: '#00873C', desc: '郵局活存' },
  { name: '錢包現金', type: 'cash' as AssetAccountType, iconKey: 'wallet', colorHex: '#10B981', desc: '實體皮夾' },
];

const ACCOUNT_ICONS = [
  { key: 'wallet', label: '皮夾', icon: Wallet },
  { key: 'landmark', label: '銀行', icon: Landmark },
  { key: 'smartphone', label: '手機支付', icon: Smartphone },
  { key: 'credit-card', label: '卡片', icon: CreditCard },
  { key: 'qr-code', label: '掃碼', icon: QrCode },
  { key: 'piggy-bank', label: '儲蓄', icon: PiggyBank },
];

const COLOR_OPTIONS = [
  '#06C755', // LINE Pay 綠
  '#10B981', // 翡翠綠
  '#3B82F6', // 湛藍
  '#14B8A6', // 蒂芬妮綠
  '#E60012', // 街口紅
  '#008CD6', // 悠遊藍
  '#F59E0B', // 琥珀黃
  '#8B5CF6', // 紫羅蘭
  '#EC4899', // 玫瑰粉
  '#64748B', // 石板灰
];

export const AssetReconciliationModal: React.FC<AssetReconciliationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    assetAccounts,
    addAssetAccount,
    updateAssetAccount,
    deleteAssetAccount,
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

  // 帳戶新增/編輯 Modal 狀態
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AssetAccount | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AssetAccountType>('digital_wallet');
  const [accNumber, setAccNumber] = useState('');
  const [accBalance, setAccBalance] = useState('0');
  const [accColor, setAccColor] = useState('#06C755');
  const [accIconKey, setAccIconKey] = useState('smartphone');
  const [accErrorMsg, setAccErrorMsg] = useState<string | null>(null);

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
  const digitalWalletTotal = assetAccounts.filter((a) => a.type === 'digital_wallet').reduce((sum, a) => sum + a.balance, 0);
  const otherTotal = assetAccounts.filter((a) => a.type === 'other').reduce((sum, a) => sum + a.balance, 0);
  const stockAccount = assetAccounts.find((a) => a.type === 'stock');
  const stockTotal = stockAccount?.stocks?.reduce((sum, s) => sum + s.shares * s.currentPrice, 0) || 0;

  // 別人欠款總計 (they_owe 尚待還清之應收帳款)
  const receivablesTotal = debts
    .filter((d) => d.type === 'they_owe' && !d.isSettled)
    .reduce((sum, d) => sum + (d.remainingAmount ?? 0), 0);

  // 總淨資產 (Net Worth)
  const netWorthTotal = cashTotal + bankTotal + digitalWalletTotal + otherTotal + stockTotal + receivablesTotal;

  // 待對帳帳戶資訊
  const currentReconcileAccount = assetAccounts.find((a) => a.id === selectedAccountId) || assetAccounts[0];
  const actualVal = Number(actualBalanceInput);
  const diffAmount = !isNaN(actualVal) && actualBalanceInput !== ''
    ? Math.round((actualVal - (currentReconcileAccount?.balance || 0)) * 10) / 10
    : 0;

  // 取得帳戶對應 Lucide Icon
  const getAccountIconComponent = (acc: AssetAccount) => {
    if (acc.iconKey === 'wallet' || acc.type === 'cash') return Wallet;
    if (acc.iconKey === 'landmark' || acc.type === 'bank') return Landmark;
    if (acc.iconKey === 'smartphone' || acc.type === 'digital_wallet') return Smartphone;
    if (acc.iconKey === 'trending-up' || acc.type === 'stock') return TrendingUp;
    if (acc.iconKey === 'credit-card') return CreditCard;
    if (acc.iconKey === 'qr-code') return QrCode;
    if (acc.iconKey === 'piggy-bank') return PiggyBank;
    return Wallet;
  };

  const getAccountTypeLabel = (type: AssetAccountType) => {
    switch (type) {
      case 'cash':
        return '實體皮夾與零錢';
      case 'digital_wallet':
        return '行動支付 · LINE Pay/街口';
      case 'bank':
        return '銀行活存帳戶';
      case 'stock':
        return '投資證券戶';
      case 'other':
        return '其他資產帳戶';
      default:
        return '資產帳戶';
    }
  };

  // 開啟新增帳戶
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('digital_wallet');
    setAccNumber('');
    setAccBalance('0');
    setAccColor('#06C755');
    setAccIconKey('smartphone');
    setAccErrorMsg(null);
    setIsAccountModalOpen(true);
  };

  // 開啟編輯帳戶
  const handleOpenEditAccount = (acc: AssetAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccNumber(acc.accountNumber || '');
    setAccBalance(String(acc.balance));
    setAccColor(acc.colorHex || '#3B82F6');
    setAccIconKey(acc.iconKey || (acc.type === 'cash' ? 'wallet' : acc.type === 'bank' ? 'landmark' : 'smartphone'));
    setAccErrorMsg(null);
    setIsAccountModalOpen(true);
  };

  // 儲存帳戶 (新增或修改)
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      setAccErrorMsg('請輸入帳戶名稱');
      return;
    }

    const balNum = Number(accBalance) || 0;

    if (editingAccount) {
      updateAssetAccount({
        ...editingAccount,
        name: accName.trim(),
        type: accType,
        accountNumber: accNumber.trim() || undefined,
        balance: balNum,
        colorHex: accColor,
        iconKey: accIconKey,
      });
    } else {
      addAssetAccount({
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: accName.trim(),
        type: accType,
        accountNumber: accNumber.trim() || undefined,
        balance: balNum,
        colorHex: accColor,
        iconKey: accIconKey,
        updatedAt: new Date().toISOString(),
      });
    }

    setIsAccountModalOpen(false);
    setEditingAccount(null);
  };

  // 刪除帳戶
  const handleDeleteAccount = (accId: string) => {
    if (assetAccounts.length <= 1) {
      alert('至少需保留一個資產帳戶');
      return;
    }
    if (window.confirm('確定要刪除此帳戶嗎？此動作將移除該帳戶餘額紀錄。')) {
      deleteAssetAccount(accId);
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    }
  };

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
    alert('已成功儲存月底吃土設定！');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                  資產盤點與對帳銷帳
                </h3>
                <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-medium">
                  身上總額盤點 · 支援 LINE Pay/活存自訂 · 一鍵差額平帳
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 三大功能切換 Segmented Control */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-black/5 dark:bg-zinc-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center justify-center space-x-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>資產盤點</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reconcile')}
              className={`py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center justify-center space-x-1.5 ${
                activeTab === 'reconcile'
                  ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>對帳銷帳</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center justify-center space-x-1.5 ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>吃土設定</span>
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
              <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                    <Wallet className="w-3.5 h-3.5 text-amber-600" />
                    <span>身上錢與投資總淨值</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    即時盤點
                  </span>
                </div>
                <div className="text-3xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight font-mono">
                  ${Math.round(netWorthTotal).toLocaleString()}
                </div>

                {/* 4 格分類概況（純 SVG 記帳風格） */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-500/15 text-xs">
                  <div className="p-2 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold leading-tight">現金</span>
                      <strong className="text-xs text-calico-cocoa dark:text-zinc-200 font-mono truncate block">${Math.round(cashTotal).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="p-2 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Landmark className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold leading-tight">存款 / 支付</span>
                      <strong className="text-xs text-calico-cocoa dark:text-zinc-200 font-mono truncate block">${Math.round(bankTotal + digitalWalletTotal).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="p-2 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold leading-tight">股票基金</span>
                      <strong className="text-xs text-calico-cocoa dark:text-zinc-200 font-mono truncate block">${Math.round(stockTotal).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="p-2 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <HandCoins className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold leading-tight">別人欠款</span>
                      <strong className="text-xs text-teal-600 dark:text-teal-400 font-mono truncate block">${Math.round(receivablesTotal).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 現金、存款與行動支付帳戶明細 (可編輯與新增) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
                      現金、存款與行動支付帳戶
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddAccount}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-black text-xs transition-all flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增帳戶</span>
                  </button>
                </div>

                {/* 帳戶卡片列表 */}
                <div className="space-y-2">
                  {assetAccounts.filter((a) => a.type !== 'stock').map((acc) => {
                    const IconComp = getAccountIconComponent(acc);
                    return (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-black/10 transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: `${acc.colorHex || '#10B981'}18`,
                              color: acc.colorHex || '#10B981',
                              border: `1px solid ${acc.colorHex || '#10B981'}30`,
                            }}
                          >
                            <IconComp className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                                {acc.name}
                              </span>
                              {acc.accountNumber && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-calico-cocoa/50 dark:text-zinc-400 font-mono">
                                  *{acc.accountNumber}
                                </span>
                              )}
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-bold"
                                style={{
                                  backgroundColor: `${acc.colorHex || '#10B981'}15`,
                                  color: acc.colorHex || '#10B981',
                                }}
                              >
                                {acc.type === 'cash' ? '現金' : acc.type === 'digital_wallet' ? '行動支付' : acc.type === 'bank' ? '活存' : '其他'}
                              </span>
                            </div>
                            <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-500 font-medium block">
                              {getAccountTypeLabel(acc.type)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-calico-cocoa dark:text-zinc-100 font-mono block">
                            ${Math.round(acc.balance).toLocaleString()}
                          </span>
                          <div className="flex items-center space-x-2 justify-end mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAccount(acc)}
                              className="text-[10px] text-calico-cocoa/50 hover:text-calico-orange font-bold transition-colors"
                            >
                              編輯
                            </button>
                            <span className="text-[8px] text-black/20 dark:text-white/20">·</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountId(acc.id);
                                setActiveTab('reconcile');
                              }}
                              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                            >
                              對帳平帳
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 股票與基金 (上報價系統與持股計算) */}
              <div className="space-y-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
                      股票與基金持股 (報價連動)
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
                  買飲料找零漏記、發票忘記拿，常導致記帳總額與皮夾或 LINE Pay 現金對不上。
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
                        [{getAccountTypeLabel(a.type)}] {a.name}（目前系統帳面: ${Math.round(a.balance).toLocaleString()}）
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
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* 差額即時運算預覽 */}
                  {actualBalanceInput !== '' && !isNaN(actualVal) && (
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-zinc-900/60 flex items-center justify-between text-xs">
                      <span className="font-bold text-calico-cocoa/60 dark:text-zinc-400">
                        {diffAmount >= 0 ? '✨ 帳面盤盈（多出）：' : '⚠️ 帳面盤虧（短少）：'}
                      </span>
                      <span
                        className={`font-black font-mono text-sm ${
                          diffAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {diffAmount >= 0 ? `+$${diffAmount.toLocaleString()}` : `-$${Math.abs(diffAmount).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 銷帳原因 */}
                <div>
                  <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                    銷帳平帳備註原因
                  </label>
                  <input
                    type="text"
                    value={reconcileReason}
                    onChange={(e) => setReconcileReason(e.target.value)}
                    placeholder="例如: 買飲料零錢誤差、忘記拿發票、定期校準"
                    className="w-full px-3 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actualBalanceInput === '' || isNaN(actualVal)}
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black text-xs shadow-ios active:scale-98 transition-all flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>確認平帳 · 自動校正餘額</span>
                </button>
              </form>

              {/* 銷帳歷史紀錄 */}
              <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                <span className="text-xs font-black text-calico-cocoa dark:text-zinc-300 flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>最近銷帳校正歷史</span>
                </span>

                {balanceAdjustments && balanceAdjustments.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {balanceAdjustments.slice(0, 10).map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-calico-cocoa dark:text-zinc-100">
                              {rec.accountName}
                            </span>
                            <span className="text-[10px] text-calico-cocoa/40 font-mono">
                              {rec.date}
                            </span>
                          </div>
                          <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block mt-0.5">
                            {rec.reason}
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

              {/* 納入生存金資產範圍勾選 (純 SVG 記帳風格) */}
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 block">
                  流動資產納入生存金範圍
                </span>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                        <Wallet className="w-3.5 h-3.5" />
                      </span>
                      <span>現金錢包餘額 (目前 ${Math.round(cashTotal).toLocaleString()})</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={includeCash}
                      onChange={(e) => setIncludeCash(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                        <Landmark className="w-3.5 h-3.5" />
                      </span>
                      <span>銀行存款與支付 (目前 ${Math.round(bankTotal + digitalWalletTotal).toLocaleString()})</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={includeBank}
                      onChange={(e) => setIncludeBank(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center">
                        <HandCoins className="w-3.5 h-3.5" />
                      </span>
                      <span>別人欠款 (應收帳款，目前 ${Math.round(receivablesTotal).toLocaleString()})</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={includeReceivables}
                      onChange={(e) => setIncludeReceivables(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </span>
                      <span>股票與基金持股市值 (目前 ${Math.round(stockTotal).toLocaleString()})</span>
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

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-ios active:scale-98 transition-all"
              >
                儲存吃土設定
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 帳戶新增 / 編輯 Modal */}
      {/* ========================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-4 sm:p-5 space-y-3.5 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  {editingAccount ? '編輯資產帳戶' : '新增資產與支付帳戶'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {accErrorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">
                {accErrorMsg}
              </div>
            )}

            {/* 快速常用範本 (僅在新增時展示) */}
            {!editingAccount && (
              <div>
                <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block mb-1">
                  快速套用常見帳戶：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ACCOUNTS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setAccName(p.name);
                        setAccType(p.type);
                        setAccColor(p.colorHex);
                        setAccIconKey(p.iconKey);
                      }}
                      className="px-2 py-1 rounded-xl bg-black/5 dark:bg-zinc-800 hover:bg-amber-500/15 hover:text-amber-700 text-[11px] font-bold text-calico-cocoa/80 dark:text-zinc-300 transition-all"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveAccount} className="space-y-3">
              {/* 帳戶名稱 */}
              <div>
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                  帳戶名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="例如: LINE Pay, 街口支付, 國泰世華"
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>

              {/* 帳戶類型 */}
              <div>
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                  帳戶屬性分類
                </label>
                <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-zinc-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setAccType('digital_wallet');
                      setAccIconKey('smartphone');
                    }}
                    className={`py-1.5 rounded-lg transition-all text-center ${
                      accType === 'digital_wallet'
                        ? 'bg-white dark:bg-zinc-700 text-emerald-600 font-black shadow-2xs'
                        : 'text-calico-cocoa/60'
                    }`}
                  >
                    行動支付
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccType('bank');
                      setAccIconKey('landmark');
                    }}
                    className={`py-1.5 rounded-lg transition-all text-center ${
                      accType === 'bank'
                        ? 'bg-white dark:bg-zinc-700 text-blue-600 font-black shadow-2xs'
                        : 'text-calico-cocoa/60'
                    }`}
                  >
                    銀行活存
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccType('cash');
                      setAccIconKey('wallet');
                    }}
                    className={`py-1.5 rounded-lg transition-all text-center ${
                      accType === 'cash'
                        ? 'bg-white dark:bg-zinc-700 text-amber-600 font-black shadow-2xs'
                        : 'text-calico-cocoa/60'
                    }`}
                  >
                    實體現金
                  </button>
                </div>
              </div>

              {/* 帳號後碼與目前餘額 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                    帳號末四碼 (選填)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    placeholder="例如: 8812"
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-calico-cocoa dark:text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                    目前金額 (元)
                  </label>
                  <input
                    type="number"
                    required
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>

              {/* 圖示選擇 (純記帳 SVG 風格) */}
              <div>
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                  帳戶圖示徽章
                </label>
                <div className="flex items-center gap-1.5">
                  {ACCOUNT_ICONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = accIconKey === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setAccIconKey(item.key)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-2xs scale-105'
                            : 'bg-black/5 dark:bg-zinc-800 text-calico-cocoa/60 hover:text-calico-cocoa'
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 色票選擇 */}
              <div>
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                  主題色票
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccColor(c)}
                      className={`w-6 h-6 rounded-full shrink-0 transition-transform ${
                        accColor === c ? 'scale-125 ring-2 ring-offset-2 ring-amber-500' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center space-x-2 pt-2">
                {editingAccount && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(editingAccount.id)}
                    className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-bold transition-colors"
                  >
                    刪除帳戶
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold text-calico-cocoa/70"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-ios active:scale-95 transition-all"
                >
                  {editingAccount ? '儲存變更' : '建立帳戶'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 股票持股新增 / 編輯 Modal */}
      {/* ========================================================= */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-4 sm:p-5 space-y-3.5 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  {editingStock ? '編輯持股' : '新增股票/基金持股'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-3">
              {/* 熱門標的快速選取 */}
              <div>
                <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block mb-1">
                  熱門標的快速帶入：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_STOCKS.slice(0, 6).map((pop) => (
                    <button
                      key={pop.symbol}
                      type="button"
                      onClick={() => {
                        setStockSymbol(pop.symbol);
                        setStockName(pop.name);
                        setStockPrice(String(pop.defaultPrice));
                      }}
                      className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-zinc-800 hover:bg-amber-500/15 hover:text-amber-700 text-[10px] font-mono font-bold text-calico-cocoa/80 dark:text-zinc-300 transition-all"
                    >
                      {pop.name}
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
