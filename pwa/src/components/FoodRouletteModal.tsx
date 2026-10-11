import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  UtensilsCrossed,
  X,
  RotateCw,
  Plus,
  Trash2,
  Wallet,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface FoodRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FOOD_OPTIONS = [
  '🍱 經典排骨便當',
  '🍜 熱騰騰日式拉麵',
  '🥟 鍋貼水餃配酸辣湯',
  '🥪 活力早午餐三明治',
  '🥗 減脂輕食健康餐',
  '🍛 濃郁日式咖哩飯',
  '🍲 暖心百元小火鍋',
  '🍔 美式漢堡加薯條',
  '🥤 喝杯手搖 + 雞排',
  '🏪 7-11/全家便利超商',
];

const BUTLER_FOOD_COMMENTS: Record<string, string> = {
  default: '可樂管家提醒：吃飽才有力氣面對期中考，中午要好好犒賞自己喵！🐾',
};

export const FoodRouletteModal: React.FC<FoodRouletteModalProps> = ({ isOpen, onClose }) => {
  const { addTransaction, setCatMood } = useApp();

  const [options, setOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('campus_food_roulette_items');
    return saved ? JSON.parse(saved) : DEFAULT_FOOD_OPTIONS;
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [newFoodInput, setNewFoodInput] = useState('');
  const [isManagingList, setIsManagingList] = useState(false);
  const [addedTxMsg, setAddedTxMsg] = useState(false);

  useEffect(() => {
    localStorage.setItem('campus_food_roulette_items', JSON.stringify(options));
  }, [options]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (options.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedOption(null);
    setAddedTxMsg(false);
    setCatMood('thinking');

    const randomIndex = Math.floor(Math.random() * options.length);
    const sliceAngle = 360 / options.length;
    // Extra 4 to 6 full spins + target slice angle
    const extraSpins = (4 + Math.floor(Math.random() * 3)) * 360;
    const targetDegree = extraSpins + (360 - (randomIndex * sliceAngle + sliceAngle / 2));

    setRotationDegrees((prev) => prev + targetDegree);

    setTimeout(() => {
      setSelectedOption(options[randomIndex]);
      setIsSpinning(false);
      setCatMood('happy');
    }, 3200);
  };

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodInput.trim()) return;
    setOptions((prev) => [...prev, newFoodInput.trim()]);
    setNewFoodInput('');
  };

  const handleDeleteFood = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddExpense = async () => {
    if (!selectedOption) return;
    await addTransaction({
      id: `tx_${Date.now()}`,
      amount: 120,
      type: 'expense',
      categoryName: '餐飲',
      categoryIcon: 'coffee',
      categoryColorHex: '#E67E22',
      paymentMethodName: '現金/行動支付',
      date: new Date().toISOString(),
      notes: `美食轉盤推薦：${selectedOption}`,
      valueScore: 9,
    });
    setAddedTxMsg(true);
    setTimeout(() => setAddedTxMsg(false), 2500);
  };

  // Pastel Color palette for wheel slices
  const COLORS = ['#F6AD55', '#48BB78', '#63B3ED', '#9F7AEA', '#ED64A6', '#ECC94B', '#4FD1C5', '#F56565'];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                午餐吃什麼？校園美食決策轉盤
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                一鍵拯救選擇困難症，可樂管家幫你做決定
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

        {/* Roulette Visual Wheel Section */}
        <div className="py-4 flex flex-col items-center justify-center">
          {/* Wheel Container with Pointer */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            {/* Pointer (fixed at 12 o'clock) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-rose-500 drop-shadow-md" />

            {/* Rotating Wheel Disc */}
            <div
              className="w-52 h-52 rounded-full border-4 border-white dark:border-zinc-800 shadow-ios relative overflow-hidden transition-transform duration-[3200ms] cubic-bezier(0.15, 0.9, 0.25, 1)"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                background: `conic-gradient(${options
                  .map((_, i) => `${COLORS[i % COLORS.length]} ${(i / options.length) * 100}% ${((i + 1) / options.length) * 100}%`)
                  .join(', ')})`,
              }}
            >
              {/* Wheel Slice Text Labels */}
              {options.map((opt, i) => {
                const angle = (i * 360) / options.length + 360 / (options.length * 2);
                return (
                  <div
                    key={i}
                    className="absolute top-0 left-0 w-full h-full flex justify-center text-white font-extrabold text-[10px] tracking-tight drop-shadow-sm select-none"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: '50% 50%',
                    }}
                  >
                    <span className="pt-2 max-w-[85px] truncate block">{opt}</span>
                  </div>
                );
              })}
            </div>

            {/* Center Cat Hub Pin */}
            <div
              onClick={handleSpin}
              className={`absolute z-10 w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border-2 border-calico-orange shadow-ios flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform ${
                isSpinning ? 'animate-pulse' : 'hover:scale-105'
              }`}
            >
              <span className="text-base font-black">🐾</span>
            </div>
          </div>

          {/* Spin Trigger Button */}
          <div className="mt-4 flex items-center space-x-2">
            <button
              onClick={handleSpin}
              disabled={isSpinning || options.length === 0}
              className="py-3 px-6 rounded-2xl bg-calico-orange text-white font-black text-sm shadow-ios hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? '命運轉動中...' : '開始旋轉 · 命中注定'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsManagingList(!isManagingList)}
              className="py-3 px-3.5 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200 text-xs font-bold hover:bg-black/10 active:scale-95 transition-all"
            >
              {isManagingList ? '關閉自訂' : '自訂名單'}
            </button>
          </div>
        </div>

        {/* Winner Announcement Card */}
        {selectedOption && !isSpinning && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-calico-orange/15 via-calico-cream to-amber-100/40 dark:from-zinc-800 dark:via-zinc-800/80 dark:to-zinc-900 border border-calico-orange/30 shadow-ios space-y-2 animate-fade-in text-center">
            <div className="flex items-center justify-center space-x-1.5 text-calico-orange text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>命運今日降臨</span>
            </div>
            <h4 className="text-xl font-black text-calico-cocoa dark:text-zinc-100">
              {selectedOption}
            </h4>
            <p className="text-xs text-calico-cocoa/70 dark:text-zinc-300 font-bold px-2">
              {BUTLER_FOOD_COMMENTS.default}
            </p>

            <div className="pt-2 flex items-center justify-center space-x-2">
              <button
                onClick={handleQuickAddExpense}
                disabled={addedTxMsg}
                className="py-2 px-3.5 rounded-xl bg-calico-orange text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs hover:brightness-105 active:scale-95 transition-all"
              >
                {addedTxMsg ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Wallet className="w-4 h-4" />}
                <span>{addedTxMsg ? '已記下一筆 $120！' : '記一筆這頓午餐 ($120)'}</span>
              </button>
              <button
                onClick={handleSpin}
                className="py-2 px-3 rounded-xl bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200 text-xs font-bold hover:bg-black/10 active:scale-95 transition-all"
              >
                不服，再轉一次！
              </button>
            </div>
          </div>
        )}

        {/* Custom Food Options List Manager */}
        {isManagingList && (
          <div className="mt-4 p-4 rounded-3xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
                自訂轉盤美食清單 ({options.length})
              </h5>
              <button
                onClick={() => setOptions(DEFAULT_FOOD_OPTIONS)}
                className="text-[10px] text-calico-orange hover:underline font-bold"
              >
                恢復預設名單
              </button>
            </div>

            {/* Add Input */}
            <form onSubmit={handleAddFood} className="flex items-center space-x-2">
              <input
                type="text"
                value={newFoodInput}
                onChange={(e) => setNewFoodInput(e.target.value)}
                placeholder="例如：學校後門乾麵、二樓自助餐..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold"
              />
              <button
                type="submit"
                disabled={!newFoodInput.trim()}
                className="py-1.5 px-3 rounded-xl bg-calico-orange text-white text-xs font-extrabold shadow-2xs active:scale-95 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5 inline mr-0.5" />
                新增
              </button>
            </form>

            {/* List */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-xs font-bold flex items-center space-x-1"
                >
                  <span className="text-calico-cocoa dark:text-zinc-200">{opt}</span>
                  <button
                    onClick={() => handleDeleteFood(idx)}
                    className="text-calico-cocoa/30 hover:text-red-500 ml-1"
                    title="刪除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
