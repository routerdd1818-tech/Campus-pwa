import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { RecurringItem } from '../types';
import { EmojiColorPicker } from './EmojiColorPicker';
import { RefreshCw, X, Calendar, DollarSign, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringToEdit?: RecurringItem | null;
}

const EXPENSE_TEMPLATES = [
  { title: '租屋套房房租', amount: 8500, day: 5, cat: '居住房租', emoji: '🏠', color: '#3B82F6', pay: '郵局轉帳' },
  { title: '電信手機網路費', amount: 499, day: 15, cat: '數位 3C', emoji: '📱', color: '#6366F1', pay: '自動扣繳' },
  { title: 'Netflix 家庭方案', amount: 130, day: 15, cat: '休閒娛樂', emoji: '🍿', color: '#EF4444', pay: '信用卡' },
  { title: 'Spotify 音樂串流', amount: 80, day: 20, cat: '休閒娛樂', emoji: '🎵', color: '#10B981', pay: '信用卡' },
  { title: '健身房月費', amount: 888, day: 1, cat: '生活日常', emoji: '🏋️', color: '#F59E0B', pay: '信用卡' },
];

const INCOME_TEMPLATES = [
  { title: '每月生活費', amount: 10000, day: 1, cat: '生活費', emoji: '🏠', color: '#10B981', pay: '郵局轉帳' },
  { title: '校內助理助學金', amount: 6000, day: 20, cat: '薪資收入', emoji: '🎓', color: '#3B82F6', pay: '銀行帳戶' },
  { title: '家教薪資', amount: 4800, day: 10, cat: '薪資收入', emoji: '💼', color: '#8B5CF6', pay: '現金支付' },
];

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  recurringToEdit,
}) => {
  const { addRecurringItem, updateRecurringItem } = useApp();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [categoryName, setCategoryName] = useState('生活支出');
  const [paymentMethodName, setPaymentMethodName] = useState('郵局轉帳');
  const [emoji, setEmoji] = useState('🏠');
  const [colorHex, setColorHex] = useState('#3B82F6');
  const [isActive, setIsActive] = useState(true);
  const [autoRecord, setAutoRecord] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (recurringToEdit) {
        setType(recurringToEdit.type);
        setTitle(recurringToEdit.title);
        setAmount(String(recurringToEdit.amount));
        setDayOfMonth(recurringToEdit.dayOfMonth);
        setCategoryName(recurringToEdit.categoryName);
        setPaymentMethodName(recurringToEdit.paymentMethodName || '郵局轉帳');
        setEmoji(recurringToEdit.emoji || (recurringToEdit.type === 'expense' ? '🏠' : '💰'));
        setColorHex(recurringToEdit.colorHex || '#3B82F6');
        setIsActive(recurringToEdit.isActive !== false);
        setAutoRecord(Boolean(recurringToEdit.autoRecord));
        setNotes(recurringToEdit.notes || '');
      } else {
        setType('expense');
        setTitle('');
        setAmount('');
        setDayOfMonth(5);
        setCategoryName('居住房租');
        setPaymentMethodName('郵局轉帳');
        setEmoji('🏠');
        setColorHex('#3B82F6');
        setIsActive(true);
        setAutoRecord(false);
        setNotes('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, recurringToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入固定收支名稱');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('請輸入有效金額 (大於 0)');
      return;
    }

    if (recurringToEdit) {
      updateRecurringItem({
        ...recurringToEdit,
        title: title.trim(),
        amount: numAmount,
        type,
        dayOfMonth: Math.min(31, Math.max(1, Number(dayOfMonth) || 1)),
        categoryName: categoryName.trim() || (type === 'expense' ? '固定支出' : '固定收入'),
        paymentMethodName: paymentMethodName.trim() || '銀行帳戶',
        emoji,
        colorHex,
        isActive,
        autoRecord,
        notes: notes.trim() || undefined,
      });
    } else {
      addRecurringItem({
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        amount: numAmount,
        type,
        dayOfMonth: Math.min(31, Math.max(1, Number(dayOfMonth) || 1)),
        categoryName: categoryName.trim() || (type === 'expense' ? '固定支出' : '固定收入'),
        paymentMethodName: paymentMethodName.trim() || '銀行帳戶',
        emoji,
        colorHex,
        isActive,
        autoRecord,
        notes: notes.trim() || undefined,
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
            <div
              className={`p-2.5 rounded-2xl ${
                type === 'expense'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {recurringToEdit ? '編輯固定收支項目' : '新增每月固定收支'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                套房房租 · 電信上網 · 串流家庭號 · 每月生活費
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

          {/* 1. Type Switcher: 支出 vs 收入 */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              收支類型
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategoryName('居住房租');
                  setEmoji('🏠');
                  setColorHex('#3B82F6');
                }}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap shrink-0 ${
                  type === 'expense'
                    ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-ios-sm font-black'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>每月固定支出</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategoryName('薪資收入');
                  setEmoji('🎓');
                  setColorHex('#10B981');
                }}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap shrink-0 ${
                  type === 'income'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-ios-sm font-black'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>每月固定收入</span>
              </button>
            </div>
          </div>

          {/* 2. Quick Templates */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              常用快速帶入
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(type === 'expense' ? EXPENSE_TEMPLATES : INCOME_TEMPLATES).map((tpl) => (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => {
                    setTitle(tpl.title);
                    setAmount(String(tpl.amount));
                    setDayOfMonth(tpl.day);
                    setCategoryName(tpl.cat);
                    setEmoji(tpl.emoji);
                    setColorHex(tpl.color);
                    setPaymentMethodName(tpl.pay);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-calico-orange/15 hover:text-calico-orange text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-300 transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  {tpl.emoji} {tpl.title} (${tpl.amount})
                </button>
              ))}
            </div>
          </div>

          {/* 3. Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                項目名稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：套房房租、Netflix"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                每月金額 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
                />
                <DollarSign className="w-4 h-4 text-calico-cocoa/40 dark:text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 4. Day of Month & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                每月扣款日
              </label>
              <div className="relative">
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange appearance-none transition-all"
                >
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      每月 {i + 1} 日
                    </option>
                  ))}
                </select>
                <Calendar className="w-4 h-4 text-calico-cocoa/40 dark:text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                記帳分類
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="居住房租、娛樂等"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
                支付管道
              </label>
              <input
                type="text"
                value={paymentMethodName}
                onChange={(e) => setPaymentMethodName(e.target.value)}
                placeholder="郵局、信用卡等"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
              />
            </div>
          </div>

          {/* 5. Emoji & Color */}
          <EmojiColorPicker
            selectedEmoji={emoji}
            onSelectEmoji={setEmoji}
            selectedColor={colorHex}
            onSelectColor={setColorHex}
            label="自訂 Emoji 與色彩標籤"
          />

          {/* 6. Active switch & Notes */}
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-calico-cocoa dark:text-zinc-100 block whitespace-nowrap">
                啟用此固定項目
              </span>
              <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block">
                啟用後將納入每月吃土生存試算自動預留額度
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              備註說明 (選填)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：每月匯款戶頭後5碼、室友名單"
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
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-calico-orange to-amber-500 text-white font-black text-xs shadow-ios-md hover:from-calico-orange/90 hover:to-amber-500/90 transition-all whitespace-nowrap shrink-0"
            >
              {recurringToEdit ? '儲存變更' : '建立固定收支'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
