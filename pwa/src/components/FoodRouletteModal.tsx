import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
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
  RefreshCw,
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

const QUICK_SUGGESTIONS = [
  '🍔 麥當勞套餐',
  '🥟 八方雲集鍋貼',
  '🍱 台式滷肉便當',
  '🍝 義大利麵',
  '🍗 肯德基炸雞',
  '🥪 Subway潛艇堡',
];

// Rich, high-contrast, cheerful wheel slice color palette
const WHEEL_COLORS = [
  '#F97316', // Orange
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EAB308', // Amber
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#84CC16', // Lime
];

// Parse emoji and title from raw food string
function parseFoodItem(raw: string) {
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji}|[\u2600-\u27BF])\s*(.*)$/u;
  const match = raw.match(emojiRegex);
  if (match) {
    return {
      emoji: match[1],
      title: match[2].trim() || match[1],
    };
  }

  // Automatic smart emoji assignment if none provided
  let autoEmoji = '🍽️';
  if (/飯|便當|丼|燴飯/.test(raw)) autoEmoji = '🍱';
  else if (/麵|拉麵|牛肉麵|烏龍|意麵/.test(raw)) autoEmoji = '🍜';
  else if (/水餃|鍋貼|湯包|小籠包/.test(raw)) autoEmoji = '🥟';
  else if (/鍋|火鍋|麻辣/.test(raw)) autoEmoji = '🍲';
  else if (/漢堡|堡|薯條/.test(raw)) autoEmoji = '🍔';
  else if (/披薩|pizza/i.test(raw)) autoEmoji = '🍕';
  else if (/三明治|土司|早午餐/.test(raw)) autoEmoji = '🥪';
  else if (/沙拉|輕食|健康餐|減脂/.test(raw)) autoEmoji = '🥗';
  else if (/咖哩/.test(raw)) autoEmoji = '🍛';
  else if (/手搖|奶茶|茶|咖啡|飲料/.test(raw)) autoEmoji = '🥤';
  else if (/超商|7-11|全家|萊爾富|OK/.test(raw)) autoEmoji = '🏪';
  else if (/甜點|蛋糕|鬆餅/.test(raw)) autoEmoji = '🍰';
  else if (/炸雞|雞排|鹹酥雞/.test(raw)) autoEmoji = '🍗';

  return {
    emoji: autoEmoji,
    title: raw.trim(),
  };
}

// Adaptive font size based on character count along radial spoke
function getSpokeFontSize(len: number): number {
  if (len <= 4) return 12.5;
  if (len <= 6) return 11;
  if (len <= 8) return 9.5;
  return 8.5;
}

// Ensure clean slice display without truncation up to 8 chars
function getSpokeDisplayTitle(title: string): string {
  if (title.length <= 8) return title;
  return title.slice(0, 7) + '…';
}

// Butler commentary based on selected food
function getButlerComment(foodName: string): string {
  if (/拉麵|麵/.test(foodName)) {
    return '可樂管家提醒：熱騰騰的麵條最療癒！大口吸麵補充下午戰鬥力喵！🍜';
  }
  if (/便當|飯|丼/.test(foodName)) {
    return '可樂管家提醒：便當營養均衡，吃飽飽下午上課才不會打瞌睡喵！🍱';
  }
  if (/火鍋|鍋/.test(foodName)) {
    return '可樂管家提醒：暖暖的鍋物最幸福！記得多夾點青菜補充維他命喵！🍲';
  }
  if (/漢堡|炸雞|速食/.test(foodName)) {
    return '可樂管家提醒：偶爾吃個速食快樂一下，身心舒暢下午滿血復活喵！🍔';
  }
  if (/健康|輕食|沙拉/.test(foodName)) {
    return '可樂管家提醒：健康自律的同學最帥氣！清爽無負擔，下午思緒超清晰喵！🥗';
  }
  if (/手搖|雞排/.test(foodName)) {
    return '可樂管家提醒：下午茶小確幸！享受美食的同時也要記得喝水唷喵！🥤';
  }
  if (/超商|7-11|全家/.test(foodName)) {
    return '可樂管家提醒：超商效率第一！省下的時間剛好小睡十分鐘充電喵！🏪';
  }
  return '可樂管家提醒：吃飽才有力氣面對期中考，今天中午要好好犒賞自己喵！🐾';
}

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

  const N = options.length;
  const sliceAngle = N > 0 ? 360 / N : 0;

  const handleSpin = () => {
    if (N < 2 || isSpinning) return;

    setIsSpinning(true);
    setSelectedOption(null);
    setAddedTxMsg(false);
    setCatMood('thinking');

    const randomIndex = Math.floor(Math.random() * N);

    // Target angle when slice midAngle lands at 12 o'clock (0° / 360°)
    const sliceMid = randomIndex * sliceAngle + sliceAngle / 2;
    const desiredMod = (360 - sliceMid) % 360;

    // Calculate forward angle from current rotation
    const currentMod = rotationDegrees % 360;
    let forwardAngle = desiredMod - currentMod;
    if (forwardAngle < 0) forwardAngle += 360;

    // 5 to 7 full 360° spins
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetDegree = fullSpins + forwardAngle;

    setRotationDegrees((prev) => prev + targetDegree);

    setTimeout(() => {
      const winner = options[randomIndex];
      setSelectedOption(winner);
      setIsSpinning(false);
      setCatMood('happy');

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#F97316', '#FBBF24', '#34D399', '#60A5FA', '#F472B6'],
        });
      } catch {
        // Fallback if confetti not supported
      }
    }, 3600);
  };

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFoodInput.trim();
    if (!trimmed) return;
    const parsed = parseFoodItem(trimmed);
    const formatted = `${parsed.emoji} ${parsed.title}`;
    if (!options.includes(formatted)) {
      setOptions((prev) => [...prev, formatted]);
    }
    setNewFoodInput('');
  };

  const handleAddQuickSuggestion = (item: string) => {
    if (!options.includes(item)) {
      setOptions((prev) => [...prev, item]);
    }
  };

  const handleDeleteFood = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddExpense = async () => {
    if (!selectedOption) return;
    const parsed = parseFoodItem(selectedOption);
    await addTransaction({
      id: `tx_${Date.now()}`,
      amount: 120,
      type: 'expense',
      categoryName: '餐飲',
      categoryIcon: 'coffee',
      categoryColorHex: '#E67E22',
      paymentMethodName: '現金/行動支付',
      date: new Date().toISOString(),
      notes: `可樂管家美食轉盤：${parsed.emoji} ${parsed.title}`,
      valueScore: 9,
    });
    setAddedTxMsg(true);
    setTimeout(() => setAddedTxMsg(false), 2500);
  };

  // SVG Geometry Calculation
  const CX = 160;
  const CY = 160;
  const R = 146; // Radius of wheel disc

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                午餐吃什麼？校園美食決策轉盤
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                一鍵拯救選擇困難症 · 可樂管家幫你做決定
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
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Top Pointer Needle (Fixed at 12 o'clock) */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-md">
              <svg width="32" height="38" viewBox="0 0 32 38" fill="none">
                <path
                  d="M 16 36 L 4 10 C 4 3 28 3 28 10 Z"
                  fill="#EF4444"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M 16 31 L 7 11 C 7 6 25 6 25 11 Z"
                  fill="#DC2626"
                />
                <circle cx="16" cy="11" r="4.5" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="14.8" cy="9.8" r="1.2" fill="#FEF08A" />
              </svg>
            </div>

            {/* Rotating Wheel Disc (SVG) */}
            <div
              onClick={handleSpin}
              className="w-full h-full relative cursor-pointer select-none flex items-center justify-center"
            >
              <svg
                viewBox="0 0 320 320"
                className="w-full h-full drop-shadow-lg overflow-visible"
              >
                <g
                  style={{
                    transform: `rotate(${rotationDegrees}deg)`,
                    transformOrigin: '160px 160px',
                    transformBox: 'view-box',
                    transition: isSpinning
                      ? 'transform 3600ms cubic-bezier(0.12, 0.8, 0.32, 1)'
                      : 'none',
                  }}
                >
                {/* Outer Wheel Bezel */}
                <circle
                  cx={CX}
                  cy={CY}
                  r="154"
                  fill="#1E293B"
                  stroke="#F8FAFC"
                  strokeWidth="4"
                  className="dark:fill-zinc-800 dark:stroke-zinc-700"
                />

                {/* Outer Rim Golden Dots */}
                {Array.from({ length: Math.max(N, 12) }).map((_, dotIdx) => {
                  const dotCount = Math.max(N, 12);
                  const dotAngle = (dotIdx * 360) / dotCount;
                  const rad = (dotAngle * Math.PI) / 180;
                  const dotX = CX + 151 * Math.sin(rad);
                  const dotY = CY - 151 * Math.cos(rad);
                  return (
                    <circle
                      key={`dot-${dotIdx}`}
                      cx={dotX}
                      cy={dotY}
                      r="2.2"
                      fill="#FEF08A"
                    />
                  );
                })}

                {/* Wedges */}
                {options.map((opt, i) => {
                  const startAngle = i * sliceAngle;
                  const endAngle = (i + 1) * sliceAngle;
                  const midAngle = startAngle + sliceAngle / 2;

                  const rad1 = (startAngle * Math.PI) / 180;
                  const rad2 = (endAngle * Math.PI) / 180;

                  const x1 = CX + R * Math.sin(rad1);
                  const y1 = CY - R * Math.cos(rad1);
                  const x2 = CX + R * Math.sin(rad2);
                  const y2 = CY - R * Math.cos(rad2);

                  const pathD =
                    N === 1
                      ? `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`
                      : `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${
                          sliceAngle > 180 ? 1 : 0
                        } 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

                  const parsed = parseFoodItem(opt);
                  const fontSize = getSpokeFontSize(parsed.title.length);
                  const displayTitle = getSpokeDisplayTitle(parsed.title);

                  return (
                    <g key={i}>
                      {/* Sector Wedge */}
                      <path
                        d={pathD}
                        fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                      />

                      {/* Content Oriented Along Wedge Centerline Spoke */}
                      <g transform={`rotate(${midAngle}, ${CX}, ${CY})`}>
                        {/* Emoji at Outer Edge */}
                        <text
                          x={CX}
                          y={36}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="18"
                          style={{ userSelect: 'none' }}
                        >
                          {parsed.emoji}
                        </text>

                        {/* Title Running Along the Radial Ray (Spoke) */}
                        <g transform={`translate(${CX}, 84) rotate(-90)`}>
                          <text
                            x={0}
                            y={0}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#FFFFFF"
                            fontWeight="800"
                            fontSize={fontSize}
                            letterSpacing="-0.2px"
                            style={{
                              filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.65))',
                              userSelect: 'none',
                            }}
                          >
                            {displayTitle}
                          </text>
                        </g>
                      </g>
                    </g>
                  );
                })}

                {/* Center Hub Outer Ring */}
                <circle
                  cx={CX}
                  cy={CY}
                  r="28"
                  fill="#FFFFFF"
                  stroke="#F97316"
                  strokeWidth="3.5"
                  className="dark:fill-zinc-900 shadow-sm"
                />
                {/* Center Hub Inner Circle */}
                <circle
                  cx={CX}
                  cy={CY}
                  r="21"
                  fill="#FFEDD5"
                  className="dark:fill-orange-950/40"
                />
                {/* Mascot Paw Center Pin */}
                <text
                  x={CX}
                  y={CY + 1}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fontSize="18"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  🐾
                </text>
                </g>
              </svg>
            </div>
          </div>

          {/* Spin Trigger Button */}
          <div className="mt-4 flex items-center space-x-2">
            <button
              onClick={handleSpin}
              disabled={isSpinning || N < 2}
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
              {isManagingList ? '關閉名單' : `自訂名單 (${N})`}
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
            <h4 className="text-xl font-black text-calico-cocoa dark:text-zinc-100 flex items-center justify-center space-x-2">
              <span>{selectedOption}</span>
            </h4>
            <p className="text-xs text-calico-cocoa/70 dark:text-zinc-300 font-bold px-2 leading-relaxed">
              {getButlerComment(selectedOption)}
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
                自訂轉盤美食清單 ({N})
              </h5>
              <button
                onClick={() => setOptions(DEFAULT_FOOD_OPTIONS)}
                className="text-[10px] text-calico-orange hover:underline font-bold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3 inline" />
                <span>恢復預設名單</span>
              </button>
            </div>

            {/* Add Input */}
            <form onSubmit={handleAddFood} className="flex items-center space-x-2">
              <input
                type="text"
                value={newFoodInput}
                onChange={(e) => setNewFoodInput(e.target.value)}
                placeholder="輸入想吃的美食（例如：大餛飩、二樓自助餐）..."
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/40"
              />
              <button
                type="submit"
                disabled={!newFoodInput.trim()}
                className="py-2 px-3 rounded-xl bg-calico-orange text-white text-xs font-extrabold shadow-2xs active:scale-95 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5 inline mr-0.5" />
                新增
              </button>
            </form>

            {/* Quick Suggestions Chips */}
            <div>
              <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block mb-1">
                快速加入校園熱門餐點：
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((item, qIdx) => {
                  const isAlreadyIn = options.includes(item);
                  return (
                    <button
                      key={qIdx}
                      type="button"
                      disabled={isAlreadyIn}
                      onClick={() => handleAddQuickSuggestion(item)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        isAlreadyIn
                          ? 'bg-black/5 dark:bg-white/5 text-calico-cocoa/30 dark:text-zinc-600 border-transparent cursor-default'
                          : 'bg-white dark:bg-zinc-900 text-calico-cocoa dark:text-zinc-200 border-black/10 dark:border-white/10 hover:border-calico-orange hover:text-calico-orange'
                      }`}
                    >
                      {item} {isAlreadyIn ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {options.map((opt, idx) => {
                const parsed = parseFoodItem(opt);
                return (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-xs font-bold flex items-center space-x-1 shadow-2xs"
                  >
                    <span className="text-calico-cocoa dark:text-zinc-200">
                      {parsed.emoji} {parsed.title}
                    </span>
                    <button
                      onClick={() => handleDeleteFood(idx)}
                      disabled={options.length <= 2}
                      className="text-calico-cocoa/30 hover:text-red-500 ml-1 disabled:opacity-20"
                      title={options.length <= 2 ? '至少需保留 2 個選項' : '刪除'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            {options.length <= 2 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                💡 轉盤至少需要 2 個美食選項才能開始旋轉唷！
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
