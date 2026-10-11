import React, { useState } from 'react';
import { Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { X, Wallet, Tag, CreditCard, Sparkles, Plus, Check } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (t: Transaction) => void;
}

const PAYMENT_METHODS = ['現金', 'LINE Pay', '悠遊卡', '信用卡', '街口支付', '帳戶轉帳'];
const QUICK_AMOUNTS = [50, 80, 100, 150, 200, 500, 1000];
const PALETTE = ['#E67E22', '#48BB78', '#3182CE', '#805AD5', '#D53F8C', '#ED8936', '#3D2F2E', '#38B2AC'];

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave }) => {
  const { customExpenseCategories, customIncomeCategories, addCustomCategory } = useApp();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('餐飲');
  const [paymentMethod, setPaymentMethod] = useState<string>('LINE Pay');
  const [notes, setNotes] = useState<string>('');
  const [valueScore, setValueScore] = useState<number>(8);

  // Inline custom category creation
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);

  const currentCategories = type === 'expense' ? customExpenseCategories : customIncomeCategories;

  React.useEffect(() => {
    if (isOpen) {
      setType('expense');
      setAmount('');
      setCategoryName(customExpenseCategories[0]?.name || '餐飲');
      setPaymentMethod('LINE Pay');
      setNotes('');
      setValueScore(8);
      setIsCreatingCategory(false);
      setNewCatName('');
    }
  }, [isOpen, customExpenseCategories]);

  if (!isOpen) return null;

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const catName = newCatName.trim();
    addCustomCategory(type, {
      name: catName,
      colorHex: newCatColor,
      icon: 'tag',
    });
    setCategoryName(catName);
    setNewCatName('');
    setIsCreatingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const catObj = currentCategories.find((c) => c.name === categoryName) || {
      name: categoryName,
      icon: 'tag',
      colorHex: '#E67E22',
    };

    onSave({
      id: `tx_${Date.now()}`,
      amount: numAmount,
      type,
      categoryName: catObj.name,
      categoryIcon: catObj.icon || 'tag',
      categoryColorHex: catObj.colorHex,
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
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-calico-cocoa dark:text-zinc-100">
                記上一筆收支
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                即時掌握預算與花費價值感
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Expense / Income Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-calico-cream dark:bg-zinc-800 border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategoryName(customExpenseCategories[0]?.name || '餐飲');
                setIsCreatingCategory(false);
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                type === 'expense'
                  ? 'bg-calico-orange text-white shadow-xs'
                  : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
              }`}
            >
              支出 (Expense)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategoryName(customIncomeCategories[0]?.name || '生活費');
                setIsCreatingCategory(false);
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                type === 'income'
                  ? 'bg-calico-sage text-white shadow-xs'
                  : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
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
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-calico-cocoa/40 dark:text-zinc-500">
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
            <div className="flex items-center space-x-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold text-calico-cocoa/75 dark:text-zinc-300 hover:bg-calico-orange/15 hover:text-calico-orange transition-all shrink-0 active:scale-95"
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* Category selection & Custom Category Creator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5" />
                <span>{type === 'expense' ? '消費類別' : '收入類別'}</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>自訂新種類</span>
              </button>
            </div>

            {/* Inline Category Creator Panel */}
            {isCreatingCategory && (
              <div className="mb-2.5 p-3 rounded-2xl bg-calico-cream dark:bg-zinc-800/80 border border-calico-orange/30 animate-fade-in space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="輸入新種類名稱 (如：下午茶、健身)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCatName.trim()}
                    className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-xs font-extrabold shadow-xs active:scale-95 disabled:opacity-40 transition-all flex items-center space-x-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>新增</span>
                  </button>
                </div>
                {/* Color swatches */}
                <div className="flex items-center space-x-1.5 pt-0.5">
                  <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 font-bold">顏色：</span>
                  {PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        newCatColor === c ? 'scale-125 ring-2 ring-calico-cocoa dark:ring-white' : 'opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
              {currentCategories.map((c) => {
                const isSelected = categoryName === c.name;
                return (
                  <button
                    type="button"
                    key={c.id || c.name}
                    onClick={() => setCategoryName(c.name)}
                    style={{
                      borderColor: isSelected ? c.colorHex : 'transparent',
                    }}
                    className={`py-2 px-1.5 rounded-2xl text-xs font-bold flex flex-col items-center justify-center space-y-1 border transition-all ${
                      isSelected
                        ? 'bg-black/5 dark:bg-white/10 scale-105 shadow-xs font-black'
                        : 'bg-calico-cream/60 dark:bg-zinc-800/60 text-calico-cocoa/70 dark:text-zinc-400 hover:bg-black/5'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.colorHex }} />
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
                      ? 'bg-calico-cocoa text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs scale-105'
                      : 'bg-calico-cream/80 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-400 hover:bg-calico-orange/10'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* Value score rating (for expenses) */}
          {type === 'expense' && (
            <div className="p-3.5 rounded-2xl bg-calico-cream/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-calico-orange" />
                  <span>花費價值感評分</span>
                </label>
                <span className="text-xs font-extrabold text-calico-orange px-2 py-0.5 rounded-md bg-calico-orange/15">
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
              <div className="flex justify-between text-[10px] text-calico-cocoa/40 dark:text-zinc-500 font-bold px-0.5">
                <span>1分 (衝動後悔)</span>
                <span>5分 (日常基本)</span>
                <span>10分 (超值投資)</span>
              </div>
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
            className="w-full py-3.5 px-4 rounded-2xl bg-calico-orange text-white font-extrabold shadow-ios hover:brightness-105 active:scale-95 transition-all text-sm tracking-wide mt-2"
          >
            儲存收支記錄
          </button>
        </form>
      </div>
    </div>
  );
};
