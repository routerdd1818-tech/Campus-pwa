import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { DebtRecord, DebtType } from '../types';
import {
  CreditCard,
  X,
  Calendar,
  User,
  DollarSign,
  Layers,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit?: DebtRecord | null;
}

const QUICK_TITLES = ['無息分期付款', '活動門票代墊', '聚餐借支', '房租/水電借款', '日常生活借急'];

export const DebtModal: React.FC<DebtModalProps> = ({ isOpen, onClose, debtToEdit }) => {
  const { addDebt, updateDebt, savedFriends, settings } = useApp();

  const [type, setType] = useState<DebtType>('i_owe');
  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalPeriods, setTotalPeriods] = useState(3);
  const [paidPeriods, setPaidPeriods] = useState(0);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (debtToEdit) {
        setType(debtToEdit.type);
        setTitle(debtToEdit.title);
        setCounterparty(debtToEdit.counterparty);
        setTotalAmount(String(debtToEdit.totalAmount));
        setIsInstallment(Boolean(debtToEdit.totalPeriods && debtToEdit.totalPeriods > 1));
        setTotalPeriods(debtToEdit.totalPeriods || 3);
        setPaidPeriods(debtToEdit.paidPeriods || 0);
        setStartDate(debtToEdit.startDate.slice(0, 10));
        setDueDate(debtToEdit.dueDate ? debtToEdit.dueDate.slice(0, 10) : '');
        setNotes(debtToEdit.notes || '');
      } else {
        setType('i_owe');
        setTitle('');
        setCounterparty('');
        setTotalAmount('');
        setIsInstallment(false);
        setTotalPeriods(3);
        setPaidPeriods(0);
        setStartDate(new Date().toISOString().slice(0, 10));
        setDueDate('');
        setNotes('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, debtToEdit]);

  if (!isOpen) return null;

  const numAmount = parseFloat(totalAmount) || 0;
  const calculatedPeriodAmount = isInstallment && totalPeriods > 0
    ? Math.round(numAmount / totalPeriods)
    : numAmount;

  const handleApplyDueDateDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入款項/借貸名稱');
      return;
    }
    if (!counterparty.trim()) {
      setErrorMsg('請填寫往來對象（人名或機構）');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('請輸入大於 0 的金額');
      return;
    }

    if (debtToEdit) {
      const remaining = Math.max(0, numAmount - (debtToEdit.totalAmount - debtToEdit.remainingAmount));
      updateDebt({
        ...debtToEdit,
        type,
        title: title.trim(),
        counterparty: counterparty.trim(),
        totalAmount: numAmount,
        remainingAmount: remaining,
        isInstallment,
        totalPeriods: isInstallment ? totalPeriods : 1,
        paidPeriods: isInstallment ? paidPeriods : 0,
        periodAmount: isInstallment ? calculatedPeriodAmount : numAmount,
        startDate,
        dueDate: dueDate || undefined,
        notes: notes.trim(),
        isSettled: remaining === 0,
      });
    } else {
      const initialRemaining = isInstallment && paidPeriods > 0
        ? Math.max(0, numAmount - calculatedPeriodAmount * paidPeriods)
        : numAmount;

      addDebt({
        id: `debt_${Date.now()}`,
        type,
        title: title.trim(),
        counterparty: counterparty.trim(),
        totalAmount: numAmount,
        remainingAmount: initialRemaining,
        isInstallment,
        totalPeriods: isInstallment ? totalPeriods : 1,
        paidPeriods: isInstallment ? paidPeriods : 0,
        periodAmount: isInstallment ? calculatedPeriodAmount : numAmount,
        startDate,
        dueDate: dueDate || undefined,
        notes: notes.trim(),
        isSettled: initialRemaining === 0,
        repayments: [],
      });
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Fixed Non-Scrolling Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white dark:bg-calico-darkCard z-10">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2.5 rounded-2xl ${
                type === 'i_owe'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {debtToEdit ? '編輯借還與分期' : '記一筆借還與分期'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                記錄我欠別人或別人欠我 · 分期與還款時間
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

          {/* 1. Debt Type Segmented Switcher */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              借貸方向
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setType('i_owe')}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  type === 'i_owe'
                    ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-ios-sm font-black'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>我欠別人</span>
              </button>
              <button
                type="button"
                onClick={() => setType('they_owe')}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  type === 'they_owe'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-ios-sm font-black'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>別人欠我</span>
              </button>
            </div>
          </div>

          {/* 2. Amount Input */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              {isInstallment ? '分期總金額' : '借款/原始金額'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-calico-cocoa/40">
                $
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xl font-black text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
          </div>

          {/* 3. Title / Item */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              款項項目 / 事由
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：筆電分期、門票代墊、午餐借款..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
            {/* Quick Title Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {QUICK_TITLES.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setTitle(qt)}
                  className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-orange hover:bg-calico-orange/10 transition-colors"
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Counterparty (往來對象) */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              往來對象 (人名或銀行機構) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-calico-cocoa/40">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="例如：小明、室友阿豪、玉山信用卡、學貸分期..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
            {/* Quick Suggested Names Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <span className="text-[10px] text-calico-cocoa/40 font-bold">範例快捷：</span>
              {['小明', '室友阿豪', '玉山信用卡', '銀行分期'].map((suggested) => (
                <button
                  key={suggested}
                  type="button"
                  onClick={() => setCounterparty(suggested)}
                  className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-orange transition-colors"
                >
                  {suggested}
                </button>
              ))}
              {savedFriends.length > 0 &&
                savedFriends.map((f) => {
                  const name = f.nickname || f.ownerName || '好友';
                  return (
                    <button
                      key={f.shareCode}
                      type="button"
                      onClick={() => setCounterparty(name)}
                      className="px-2 py-0.5 rounded-lg bg-calico-orange/15 text-calico-orange text-[11px] font-bold hover:bg-calico-orange/25 transition-colors"
                    >
                      👤 {name}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 5. Installment Toggle & Options */}
          <div className="p-3.5 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-calico-orange" />
                <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200">
                  分期付款模式 (信用卡分期 / 分次歸還)
                </span>
              </div>
              <input
                type="checkbox"
                id="installmentToggle"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="w-4 h-4 rounded text-calico-orange focus:ring-calico-orange cursor-pointer"
              />
            </div>

            {isInstallment && (
              <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/5 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1">
                      總期數
                    </label>
                    <select
                      value={totalPeriods}
                      onChange={(e) => setTotalPeriods(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
                    >
                      {[2, 3, 6, 10, 12, 18, 24, 30, 36].map((p) => (
                        <option key={p} value={p}>
                          {p} 期
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1">
                      已繳期數
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalPeriods}
                      value={paidPeriods}
                      onChange={(e) => setPaidPeriods(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-center text-calico-cocoa dark:text-zinc-100"
                    />
                  </div>
                </div>

                {numAmount > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
                    <span>試算每期約：${calculatedPeriodAmount}</span>
                    <span>剩餘 {Math.max(0, totalPeriods - paidPeriods)} 期未還</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Dates: Start Date & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                借款/分期時間
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                預計還款日 (什麼時候還)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Quick Due Date Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-calico-cocoa/40 font-bold">快捷還款日：</span>
            <button
              type="button"
              onClick={() => handleApplyDueDateDays(7)}
              className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-400 hover:text-calico-orange"
            >
              1 週後
            </button>
            <button
              type="button"
              onClick={() => handleApplyDueDateDays(14)}
              className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-400 hover:text-calico-orange"
            >
              2 週後
            </button>
            <button
              type="button"
              onClick={() => handleApplyDueDateDays(30)}
              className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-400 hover:text-calico-orange"
            >
              1 個月後
            </button>
            <button
              type="button"
              onClick={() => handleApplyDueDateDays(90)}
              className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-400 hover:text-calico-orange"
            >
              3 個月後
            </button>
          </div>

          {/* 7. Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              備註說明 (選填)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：約定下個月領生活費還清..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-calico-orange text-white font-black text-sm shadow-ios hover:brightness-105 active:scale-95 transition-all mt-3"
          >
            {debtToEdit ? '儲存債務修改' : '儲存債務記錄'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
