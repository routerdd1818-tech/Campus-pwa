import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Transaction } from '../types';
import { TransactionModal } from '../components/TransactionModal';
import {
  Plus,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Trash2,
  Calendar,
  Sparkles,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Filter,
  BarChart3,
  Layers,
} from 'lucide-react';

export const AccountingView: React.FC = () => {
  const { transactions, budgetInfo, addTransaction, deleteTransaction, customExpenseCategories } = useApp();

  // Primary view mode: 'ledger' (今日與明細) vs 'monthly' (每月統計分析)
  const [viewMode, setViewMode] = useState<'ledger' | 'monthly'>('ledger');

  // Ledger filter: 'all' | 'expense' | 'income'
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --------------------------------------------------------------------------
  // 📊 Monthly Analytics State & Calculations
  // --------------------------------------------------------------------------
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const currentYearMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Change Month
  const handlePrevMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedYearMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedYearMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  // Transactions for selected month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.slice(0, 7) === selectedYearMonth);
  }, [transactions, selectedYearMonth]);

  // Monthly sums
  const monthlyStats = useMemo(() => {
    let expense = 0;
    let income = 0;
    const catMap: Record<string, { amount: number; colorHex: string; count: number }> = {};
    let totalScore = 0;
    let scoreCount = 0;

    monthlyTransactions.forEach((t) => {
      if (t.type === 'expense') {
        expense += t.amount;
        if (!catMap[t.categoryName]) {
          catMap[t.categoryName] = { amount: 0, colorHex: t.categoryColorHex || '#E67E22', count: 0 };
        }
        catMap[t.categoryName].amount += t.amount;
        catMap[t.categoryName].count += 1;

        if (t.valueScore) {
          totalScore += t.valueScore;
          scoreCount += 1;
        }
      } else {
        income += t.amount;
      }
    });

    const net = income - expense;

    // Convert category map to sorted array with percentages
    const categories = Object.entries(catMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        colorHex: data.colorHex,
        count: data.count,
        percent: expense > 0 ? Math.round((data.amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Days in that month
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dailyAvg = Math.round(expense / daysInMonth);
    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : null;

    return {
      expense,
      income,
      net,
      categories,
      dailyAvg,
      avgScore,
      txCount: monthlyTransactions.length,
    };
  }, [monthlyTransactions, selectedYearMonth]);

  // Display Year Month title (e.g. 2026 年 10 月)
  const displayYearMonthText = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-');
    return `${y} 年 ${parseInt(m, 10)} 月`;
  }, [selectedYearMonth]);

  // --------------------------------------------------------------------------
  // 💳 Ledger filtered list
  // --------------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (selectedCategoryFilter !== 'all' && t.categoryName !== selectedCategoryFilter) return false;
      return true;
    });
  }, [transactions, filterType, selectedCategoryFilter]);

  const spentPercent = Math.min(
    100,
    Math.round((budgetInfo.todaySpent / budgetInfo.effectiveLimit) * 100)
  );

  return (
    <div className="space-y-4">
      {/* Top View Mode Segmented Switcher */}
      <div className="p-1 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center gap-1 text-xs font-bold shadow-2xs">
        <button
          onClick={() => setViewMode('ledger')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            viewMode === 'ledger'
              ? 'bg-white dark:bg-calico-darkCard text-calico-orange shadow-ios-sm font-black'
              : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>今日收支流水帳</span>
        </button>

        <button
          onClick={() => setViewMode('monthly')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            viewMode === 'monthly'
              ? 'bg-white dark:bg-calico-darkCard text-calico-orange shadow-ios-sm font-black'
              : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>每月統計分析</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 📊 MODE A: 每月統計分析 (MONTHLY ANALYTICS) */}
      {/* ========================================================================= */}
      {viewMode === 'monthly' ? (
        <div className="space-y-4 animate-fade-in">
          {/* Month Navigator Header */}
          <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-calico-cocoa/60 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
              title="上個月"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                  {displayYearMonthText}
                </h3>
                {selectedYearMonth === currentYearMonthStr ? (
                  <span className="text-[10px] bg-calico-orange/15 text-calico-orange font-bold px-2 py-0.5 rounded-full">
                    本月
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedYearMonth(currentYearMonthStr)}
                    className="text-[10px] bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-full hover:bg-calico-orange/15 hover:text-calico-orange transition-all"
                  >
                    回到本月
                  </button>
                )}
              </div>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-medium mt-0.5">
                共記錄 {monthlyStats.txCount} 筆收支
              </p>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-calico-cocoa/60 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
              title="下個月"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Monthly KPI Dashboard Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Expense Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-rose-200/50 dark:border-zinc-700/40 shadow-ios">
              <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 text-xs font-bold mb-1">
                <ArrowDownRight className="w-4 h-4" />
                <span>本月總支出</span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                ${monthlyStats.expense}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                日均支出約 ${monthlyStats.dailyAvg} / 天
              </p>
            </div>

            {/* Total Income Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-emerald-200/50 dark:border-zinc-700/40 shadow-ios">
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>本月總收入</span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                ${monthlyStats.income}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                {monthlyStats.income > 0 ? '薪資/生活費已入帳' : '尚未記錄本月收入'}
              </p>
            </div>
          </div>

          {/* Net Savings & Value Score Summary */}
          <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                本月淨結餘 (收支差額)
              </span>
              <p
                className={`text-xl font-black mt-0.5 ${
                  monthlyStats.net >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {monthlyStats.net >= 0 ? `+$${monthlyStats.net}` : `-$${Math.abs(monthlyStats.net)}`}
              </p>
            </div>

            {monthlyStats.avgScore && (
              <div className="text-right">
                <span className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400 block">
                  支出價值感均分
                </span>
                <span className="inline-flex items-center space-x-1 mt-0.5 px-2.5 py-1 rounded-xl bg-calico-orange/15 text-calico-orange font-black text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>★ {monthlyStats.avgScore} / 10 分</span>
                </span>
              </div>
            )}
          </div>

          {/* Category Breakdown (支出分類佔比長條圖) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange">
                  <PieChart className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  支出類別比例分析
                </h4>
              </div>
              <span className="text-xs font-bold text-calico-cocoa/40 dark:text-zinc-400">
                共 {monthlyStats.categories.length} 個類別
              </span>
            </div>

            {monthlyStats.categories.length > 0 ? (
              <div className="space-y-3 pt-1">
                {monthlyStats.categories.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: c.colorHex }}
                        />
                        <span className="text-calico-cocoa dark:text-zinc-200">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-500 font-semibold">
                          ({c.count} 筆)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-calico-cocoa dark:text-zinc-100">
                          ${c.amount}
                        </span>
                        <span className="text-calico-cocoa/50 dark:text-zinc-400 font-mono w-9 text-right">
                          {c.percent}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div
                        style={{
                          width: `${c.percent}%`,
                          backgroundColor: c.colorHex,
                        }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold">
                此月份尚無任何支出記錄 🍃
              </div>
            )}
          </div>

          {/* Monthly Transaction History Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-calico-cocoa/60 dark:text-zinc-400 uppercase tracking-wider px-1">
              {displayYearMonthText} 收支記錄清單
            </h4>

            {monthlyTransactions.length > 0 ? (
              monthlyTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      style={{ backgroundColor: `${tx.categoryColorHex}20` }}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    >
                      <span
                        style={{ color: tx.categoryColorHex }}
                        className="font-bold text-sm"
                      >
                        {tx.categoryName.slice(0, 1)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                          {tx.categoryName}
                        </h5>
                        {tx.valueScore && (
                          <span className="text-[10px] bg-calico-orange/15 text-calico-orange px-1.5 py-0.2 rounded-md font-bold shrink-0">
                            ★ {tx.valueScore}分
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                        {tx.notes || tx.paymentMethodName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 text-right shrink-0">
                    <div>
                      <p
                        className={`text-sm font-black ${
                          tx.type === 'expense'
                            ? 'text-calico-cocoa dark:text-zinc-100'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {tx.type === 'expense' ? `-$${tx.amount}` : `+$${tx.amount}`}
                      </p>
                      <p className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400">
                        {tx.date.slice(5, 10)}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1 rounded-lg text-calico-cocoa/20 hover:text-red-500 transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold">
                本月份無交易記錄
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 💳 MODE B: 今日收支流水帳 (DAILY LEDGER) */
        /* ========================================================================= */
        <div className="space-y-4 animate-fade-in">
          {/* Today's Budget Hero Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-white via-white to-calico-cream/90 dark:from-calico-darkCard dark:to-zinc-900 border border-black/5 dark:border-white/10 shadow-ios relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-7xl select-none opacity-5 dark:opacity-10 pointer-events-none">
              🐾
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                  今日剩餘預算
                </span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className="text-3xl font-black tracking-tight text-calico-cocoa dark:text-zinc-100">
                    ${Math.max(0, budgetInfo.remaining)}
                  </span>
                  <span className="text-xs font-bold text-calico-cocoa/50 dark:text-zinc-400">
                    / ${budgetInfo.effectiveLimit} 元
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block">
                  距每月結算日
                </span>
                <span className="inline-block mt-0.5 px-2.5 py-1 rounded-full bg-calico-orange/15 text-calico-orange text-xs font-extrabold">
                  剩 {budgetInfo.daysUntilReset} 天
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-calico-cocoa/70 dark:text-zinc-400">
                  今日已花費 ${budgetInfo.todaySpent}
                </span>
                <span
                  className={`font-black ${
                    spentPercent > 90 ? 'text-red-500' : 'text-calico-orange'
                  }`}
                >
                  {spentPercent}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden p-0.5">
                <div
                  style={{ width: `${spentPercent}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    spentPercent > 90
                      ? 'bg-red-500'
                      : spentPercent > 70
                      ? 'bg-amber-500'
                      : 'bg-calico-orange'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action Row & Category Filters */}
          <div className="flex items-center justify-between gap-2">
            {/* Filter Segmented Control */}
            <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'expense'
                    ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                支出
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'income'
                    ? 'bg-white dark:bg-zinc-800 text-calico-sage shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                收入
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-1 px-4 py-2 rounded-2xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
            >
              <Plus className="w-4 h-4" />
              <span>記一筆</span>
            </button>
          </div>

          {/* Transaction List */}
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between"
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div
                    style={{ backgroundColor: `${tx.categoryColorHex}20` }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  >
                    <span
                      style={{ color: tx.categoryColorHex }}
                      className="font-bold text-sm"
                    >
                      {tx.categoryName.slice(0, 1)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                        {tx.categoryName}
                      </h4>
                      {tx.valueScore && (
                        <span className="text-[10px] bg-calico-orange/15 text-calico-orange px-1.5 py-0.2 rounded-md font-bold shrink-0">
                          ★ {tx.valueScore}分
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                      {tx.notes || tx.paymentMethodName}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Delete */}
                <div className="flex items-center space-x-3 text-right shrink-0">
                  <div>
                    <p
                      className={`text-base font-black ${
                        tx.type === 'expense'
                          ? 'text-calico-cocoa dark:text-zinc-100'
                          : 'text-calico-sage'
                      }`}
                    >
                      {tx.type === 'expense' ? `-$${tx.amount}` : `+$${tx.amount}`}
                    </p>
                    <p className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400">
                      {new Date(tx.date).toLocaleDateString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    className="p-1 rounded-lg text-calico-cocoa/20 hover:text-red-500 transition-colors"
                    title="刪除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="text-center py-12 rounded-3xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                <p className="text-sm font-bold text-calico-cocoa/60 dark:text-zinc-400">
                  目前尚無收支記錄，點擊上方「記一筆」開始吧！
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addTransaction}
      />
    </div>
  );
};
