import React, { useState } from 'react';
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
} from 'lucide-react';

export const AccountingView: React.FC = () => {
  const { transactions, budgetInfo, addTransaction, deleteTransaction } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  const spentPercent = Math.min(
    100,
    Math.round((budgetInfo.todaySpent / budgetInfo.effectiveLimit) * 100)
  );

  return (
    <div className="space-y-4">
      {/* Today's Budget Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-white to-calico-cream/90 dark:from-calico-darkCard dark:to-zinc-900 border border-black/5 dark:border-white/10 shadow-ios relative overflow-hidden">
        {/* Subtle decorative cat paw watermark */}
        <div className="absolute -right-4 -bottom-4 text-7xl select-none opacity-5 dark:opacity-10 pointer-events-none">
          🐾
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
              今日剩餘預算
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
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
              距離結算重置日
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
              已花費 ${budgetInfo.todaySpent}
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

      {/* Action Row */}
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
          className="flex items-center space-x-1 px-3.5 py-2 rounded-2xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
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

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addTransaction}
      />
    </div>
  );
};
