import React, { useState } from 'react';
import { Transaction } from '../types';
import { X, Wallet, Tag, CreditCard, Sparkles } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (t: Transaction) => void;
}

const EXPENSE_CATEGORIES = [
  { name: '餐飲', icon: 'coffee', color: '#E67E22' },
  { name: '交通', icon: 'bus', color: '#48BB78' },
  { name: '學習', icon: 'book', color: '#3182CE' },
  { name: '生活', icon: 'shopping-cart', color: '#805AD5' },
  { name: '娛樂', icon: 'gamepad-2', color: '#D53F8C' },
  { name: '數位 3C', icon: 'laptop', color: '#3D2F2E' },
  { name: '其他', icon: 'more-horizontal', color: '#718096' },
];

const INCOME_CATEGORIES = [
  { name: '生活費', icon: 'home', color: '#48BB78' },
  { name: '薪資/家教', icon: 'briefcase', color: '#3182CE' },
  { name: '獎學金', icon: 'award', color: '#ECC94B' },
  { name: '其他收入', icon: 'dollar-sign', color: '#805AD5' },
];

const PAYMENT_METHODS = ['現金', 'LINE Pay', '悠遊卡', '信用卡', '街口支付', '帳戶轉帳'];
const QUICK_AMOUNTS = [50, 80, 100, 150, 200, 500];

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave }) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('餐飲');
  const [paymentMethod, setPaymentMethod] = useState<string>('LINE Pay');
  const [notes, setNotes] = useState<string>('');
  const [valueScore, setValueScore] = useState<number>(8);

  React.useEffect(() => {
    if (isOpen) {
      setType('expense');
      setAmount('');
      setCategoryName('餐飲');
      setPaymentMethod('LINE Pay');
      setNotes('');
      setValueScore(8);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const catObj = currentCategories.find((c) => c.name === categoryName) || currentCategories[0];

    onSave({
      id: `tx_${Date.now()}`,
      amount: numAmount,
      type,
      categoryName: catObj.name,
      categoryIcon: catObj.icon,
      categoryColorHex: catObj.color,
      paymentMethodName: paymentMethod,
      date: new Date().toISOString(),
      notes: notes.trim(),
      valueScore: type === 'expense' ? valueScore : undefined,
      isSharedWithFriends: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6">
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-calico-cocoa dark:text-zinc-100">
              記上一筆收支
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Expense / Income Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-calico-cream dark:bg-zinc-800 border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategoryName('餐飲');
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                type === 'expense'
                  ? 'bg-calico-orange text-white shadow-xs'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              支出 (Expense)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategoryName('生活費');
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                type === 'income'
                  ? 'bg-calico-sage text-white shadow-xs'
                  : 'text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              收入 (Income)
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              金額 (NTD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-calico-cocoa/40">
                $
              </span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-2xl font-black text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>

            {/* Quick amounts */}
            <div className="flex items-center space-x-1.5 mt-2 overflow-x-auto pb-1">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-xs font-bold text-calico-cocoa/75 dark:text-zinc-300 hover:bg-calico-orange/15 transition-all"
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5" />
              <span>消費類別</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {currentCategories.map((c) => {
                const isSelected = categoryName === c.name;
                return (
                  <button
                    type="button"
                    key={c.name}
                    onClick={() => setCategoryName(c.name)}
                    style={{
                      borderColor: isSelected ? c.color : 'transparent',
                    }}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-1 border transition-all ${
                      isSelected
                        ? 'bg-black/5 dark:bg-white/10 scale-105 shadow-xs font-black'
                        : 'bg-calico-cream/60 dark:bg-zinc-800/60 text-calico-cocoa/70 dark:text-zinc-400'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="truncate w-full text-center">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5 flex items-center space-x-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>支付方式</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  type="button"
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    paymentMethod === pm
                      ? 'bg-calico-cocoa text-white shadow-xs scale-105'
                      : 'bg-calico-cream/80 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-400'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* Value score rating (for expenses) */}
          {type === 'expense' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-calico-orange" />
                  <span>花費價值感評分</span>
                </label>
                <span className="text-xs font-extrabold text-calico-orange">
                  {valueScore} / 10 分
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={valueScore}
                onChange={(e) => setValueScore(Number(e.target.value))}
                className="w-full accent-calico-orange cursor-pointer"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              備註說明
            </label>
            <input
              type="text"
              placeholder="例如：午餐特餐、買文具"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-calico-orange text-white font-extrabold shadow-sm hover:brightness-105 active:scale-95 transition-all text-sm tracking-wide mt-2"
          >
            儲存收支記錄
          </button>
        </form>
      </div>
    </div>
  );
};
