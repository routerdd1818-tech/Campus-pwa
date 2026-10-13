import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { DebtRecord } from '../types';
import { CheckCircle2, X, DollarSign, Calendar, FileText, ArrowRight, Sparkles } from 'lucide-react';

interface RepayDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord | null;
}

export const RepayDebtModal: React.FC<RepayDebtModalProps> = ({ isOpen, onClose, debt }) => {
  const { repayDebt } = useApp();

  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && debt) {
      // Default to period amount if installment, otherwise remaining amount
      const defaultAmt = debt.periodAmount && debt.periodAmount < debt.remainingAmount
        ? debt.periodAmount
        : debt.remainingAmount;
      setRepayAmount(String(defaultAmt));
      setRepayDate(new Date().toISOString().slice(0, 10));
      setNote('');
      setErrorMsg(null);
    }
  }, [isOpen, debt]);

  if (!isOpen || !debt) return null;

  const numAmount = parseFloat(repayAmount) || 0;
  const remainingAfter = Math.max(0, debt.remainingAmount - numAmount);
  const willBeSettled = remainingAfter === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setErrorMsg('請輸入大於 0 的還款金額');
      return;
    }
    if (numAmount > debt.remainingAmount) {
      setErrorMsg(`還款金額不可超過剩餘欠款 $${debt.remainingAmount}`);
      return;
    }

    repayDebt(debt.id, numAmount, note.trim(), repayDate);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white dark:bg-calico-darkCard z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                記一次還款
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                記錄歸還金額、時間，精準計算還完剩多少
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-12 sm:pb-6">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-bold animate-fade-in">
              {errorMsg}
            </div>
          )}

          {/* Current Debt Card Info */}
          <div className="p-4 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                {debt.type === 'i_owe' ? '向此對象歸還：' : '從此對象收回：'}
              </span>
              <span className="text-xs font-extrabold text-calico-orange">
                {debt.counterparty}
              </span>
            </div>
            <div className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              {debt.title}
            </div>

            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400">
                當前剩餘欠款
              </span>
              <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                ${debt.remainingAmount}
              </span>
            </div>
          </div>

          {/* Amount to Repay */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400">
                本次還款金額
              </label>
              <div className="flex items-center gap-1.5">
                {debt.periodAmount && debt.periodAmount < debt.remainingAmount && (
                  <button
                    type="button"
                    onClick={() => setRepayAmount(String(debt.periodAmount))}
                    className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold text-calico-orange"
                  >
                    一期 ${debt.periodAmount}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRepayAmount(String(debt.remainingAmount))}
                  className="px-2 py-0.5 rounded-lg bg-calico-orange/15 text-[10px] font-bold text-calico-orange"
                >
                  全額還清 (${debt.remainingAmount})
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-calico-cocoa/40">
                $
              </span>
              <input
                type="number"
                min="1"
                max={debt.remainingAmount}
                step="any"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xl font-black text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
          </div>

          {/* Remaining Balance Live Preview */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              willBeSettled
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>本次還完後剩餘欠款</span>
              <span className="text-base font-black">
                ${remainingAfter}
              </span>
            </div>
            {willBeSettled ? (
              <div className="text-[11px] font-extrabold flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 mt-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>🎉 太棒了！本次還款完成後將全數結清！</span>
              </div>
            ) : (
              <p className="text-[10px] opacity-80 mt-1">
                已記錄進度，剩餘 ${remainingAfter} 元繼續按期歸還。
              </p>
            )}
          </div>

          {/* Repay Date */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              還款日期
            </label>
            <input
              type="date"
              value={repayDate}
              onChange={(e) => setRepayDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
            />
          </div>

          {/* Repay Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              還款備註 (選填)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：LINE Pay 轉帳、ATM 繳款..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-calico-orange text-white font-black text-sm shadow-ios hover:brightness-105 active:scale-95 transition-all mt-2"
          >
            確認登記還款 (${numAmount})
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
