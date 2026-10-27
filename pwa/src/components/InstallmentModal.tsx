import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Installment } from '../types';
import { EmojiColorPicker } from './EmojiColorPicker';
import { CreditCard, X, Calendar, DollarSign, Layers } from 'lucide-react';

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installmentToEdit?: Installment | null;
}

const QUICK_TEMPLATES = [
  { title: 'MacBook Air 筆電', total: 36000, periods: 12, emoji: '💻', color: '#6366F1', pay: '玉山信用卡' },
  { title: '智慧手機分期', total: 30000, periods: 12, emoji: '📱', color: '#3B82F6', pay: '台新信用卡' },
  { title: '機車購車無息分期', total: 72000, periods: 24, emoji: '🛵', color: '#E67E22', pay: '銀行無息分期' },
  { title: 'iPad 學習平板', total: 18000, periods: 6, emoji: '💻', color: '#8B5CF6', pay: '國泰信用卡' },
  { title: '專業檢定培訓費', total: 24000, periods: 6, emoji: '🎓', color: '#10B981', pay: '郵局分期扣款' },
];

export const InstallmentModal: React.FC<InstallmentModalProps> = ({
  isOpen,
  onClose,
  installmentToEdit,
}) => {
  const { addInstallment, updateInstallment } = useApp();

  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [totalPeriods, setTotalPeriods] = useState<number>(12);
  const [paidPeriods, setPaidPeriods] = useState<number>(0);
  const [periodAmount, setPeriodAmount] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billingDay, setBillingDay] = useState<number>(10);
  const [paymentMethodName, setPaymentMethodName] = useState('信用卡');
  const [emoji, setEmoji] = useState('💻');
  const [colorHex, setColorHex] = useState('#6366F1');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto calculate period amount when totalAmount or totalPeriods changes
  useEffect(() => {
    const total = Number(totalAmount);
    const periods = Number(totalPeriods);
    if (total > 0 && periods > 0) {
      setPeriodAmount(String(Math.round(total / periods)));
    }
  }, [totalAmount, totalPeriods]);

  useEffect(() => {
    if (isOpen) {
      if (installmentToEdit) {
        setTitle(installmentToEdit.title);
        setTotalAmount(String(installmentToEdit.totalAmount));
        setTotalPeriods(installmentToEdit.totalPeriods || 12);
        setPaidPeriods(installmentToEdit.paidPeriods || 0);
        setPeriodAmount(String(installmentToEdit.periodAmount));
        setStartDate(installmentToEdit.startDate.slice(0, 10));
        setBillingDay(installmentToEdit.billingDay || 10);
        setPaymentMethodName(installmentToEdit.paymentMethodName || '信用卡');
        setEmoji(installmentToEdit.emoji || '💻');
        setColorHex(installmentToEdit.colorHex || '#6366F1');
        setNotes(installmentToEdit.notes || '');
      } else {
        setTitle('');
        setTotalAmount('');
        setTotalPeriods(12);
        setPaidPeriods(0);
        setPeriodAmount('');
        setStartDate(new Date().toISOString().slice(0, 10));
        setBillingDay(10);
        setPaymentMethodName('信用卡');
        setEmoji('💻');
        setColorHex('#6366F1');
        setNotes('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, installmentToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入分期商品名稱');
      return;
    }
    const numTotal = Number(totalAmount);
    if (!numTotal || numTotal <= 0) {
      setErrorMsg('請輸入有效總金額');
      return;
    }
    const numPeriods = Number(totalPeriods);
    if (!numPeriods || numPeriods <= 0) {
      setErrorMsg('請輸入有效總期數');
      return;
    }
    const numPeriodAmount = Number(periodAmount) || Math.round(numTotal / numPeriods);

    if (installmentToEdit) {
      updateInstallment({
        ...installmentToEdit,
        title: title.trim(),
        totalAmount: numTotal,
        totalPeriods: numPeriods,
        paidPeriods: Math.min(numPeriods, Math.max(0, Number(paidPeriods) || 0)),
        periodAmount: numPeriodAmount,
        startDate,
        billingDay: Math.min(31, Math.max(1, Number(billingDay) || 1)),
        paymentMethodName: paymentMethodName.trim() || '信用卡',
        emoji,
        colorHex,
        notes: notes.trim() || undefined,
        isCompleted: paidPeriods >= numPeriods,
      });
    } else {
      addInstallment({
        id: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        totalAmount: numTotal,
        totalPeriods: numPeriods,
        paidPeriods: Math.min(numPeriods, Math.max(0, Number(paidPeriods) || 0)),
        periodAmount: numPeriodAmount,
        startDate,
        billingDay: Math.min(31, Math.max(1, Number(billingDay) || 1)),
        paymentMethodName: paymentMethodName.trim() || '信用卡',
        emoji,
        colorHex,
        notes: notes.trim() || undefined,
        isCompleted: paidPeriods >= numPeriods,
      });
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-calico-darkCard w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-ios-2xl border border-black/5 dark:border-white/10 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {installmentToEdit ? '編輯分期付款' : '新增分期付款計畫'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                筆電 3C · 機車大件 · 補習學費 · 每期自動試算進度
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-12 sm:pb-6">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-bold animate-fade-in">
              {errorMsg}
            </div>
          )}

          {/* Quick Templates */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              常用分期範本快速帶入
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => {
                    setTitle(tpl.title);
                    setTotalAmount(String(tpl.total));
                    setTotalPeriods(tpl.periods);
                    setPeriodAmount(String(Math.round(tpl.total / tpl.periods)));
                    setEmoji(tpl.emoji);
                    setColorHex(tpl.color);
                    setPaymentMethodName(tpl.pay);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-calico-orange/15 hover:text-calico-orange text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-300 transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  {tpl.emoji} {tpl.title} ({tpl.periods}期)
                </button>
              ))}
            </div>
          </div>

          {/* Title & Total Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                分期商品名稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：M3 MacBook Air"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                分期總金額 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="36000"
                  min="1"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
                />
                <DollarSign className="w-4 h-4 text-calico-cocoa/40 dark:text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Total periods, Paid periods, Period amount */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                總期數
              </label>
              <select
                value={totalPeriods}
                onChange={(e) => setTotalPeriods(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              >
                {[3, 6, 12, 18, 24, 30, 36].map((p) => (
                  <option key={p} value={p}>
                    {p} 期
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                已繳期數
              </label>
              <input
                type="number"
                value={paidPeriods}
                onChange={(e) => setPaidPeriods(Number(e.target.value))}
                min="0"
                max={totalPeriods}
                className="w-full px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                每期試算金額
              </label>
              <input
                type="number"
                value={periodAmount}
                onChange={(e) => setPeriodAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-calico-orange"
              />
            </div>
          </div>

          {/* Start Date, Billing Day, Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                起算日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                每月扣繳日
              </label>
              <select
                value={billingDay}
                onChange={(e) => setBillingDay(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              >
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    每月 {i + 1} 日
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                扣款管道
              </label>
              <input
                type="text"
                value={paymentMethodName}
                onChange={(e) => setPaymentMethodName(e.target.value)}
                placeholder="玉山信用卡、郵局等"
                className="w-full px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>
          </div>

          {/* Emoji & Color */}
          <EmojiColorPicker
            selectedEmoji={emoji}
            onSelectEmoji={setEmoji}
            selectedColor={colorHex}
            onSelectColor={setColorHex}
            label="自訂 Emoji 與色彩"
          />

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              備註說明 (選填)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：信用卡分期帳單第5期、無息零利率"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold text-xs hover:bg-black/10 transition-all whitespace-nowrap shrink-0"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs shadow-ios-md hover:from-indigo-600 hover:to-purple-700 transition-all whitespace-nowrap shrink-0"
            >
              {installmentToEdit ? '儲存變更' : '建立分期計畫'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
