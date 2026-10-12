import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  X,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  GraduationCap,
  Heart,
  HelpCircle,
  Share2,
} from 'lucide-react';

interface CampusFortuneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FortuneCard {
  level: 'SSR 歐皇現世' | '大吉' | '中吉' | '小吉' | '平安歐趴';
  levelBadgeColor: string;
  avoidRollCallRate: number; // e.g. 98
  avoidRollCallDesc: string;
  examLuck: number; // 1-5
  examLuckDesc: string;
  luckyColor: string;
  luckyColorHex: string;
  luckyItem: string;
  butlerQuote: string;
}

const FORTUNES_POOL: FortuneCard[] = [
  {
    level: 'SSR 歐皇現世',
    levelBadgeColor: 'bg-amber-400 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.8)]',
    avoidRollCallRate: 99,
    avoidRollCallDesc: '點名力場全開！教授今天只顧著講 PPT，全場安然無恙喵！',
    examLuck: 5,
    examLuckDesc: '考神附體！選擇題猜的都會對，申論題下筆如有神助！',
    luckyColor: '可樂暖橘',
    luckyColorHex: '#E67E22',
    luckyItem: '校門口大冰奶',
    butlerQuote: '可樂管家認證：今天你是全校最幸運的歐皇，下課快去買刮刮樂喵！',
  },
  {
    level: '大吉',
    levelBadgeColor: 'bg-orange-500 text-white',
    avoidRollCallRate: 92,
    avoidRollCallDesc: '教授點名雷達離你十萬八千里，安全下莊！',
    examLuck: 5,
    examLuckDesc: '作業一寫就通，期中範圍看過一遍全記住！',
    luckyColor: '焦糖奶茶色',
    luckyColorHex: '#D97706',
    luckyItem: '降噪耳機',
    butlerQuote: '管家掐指一算，今天適合把待辦事項全清光，晚上大吃一頓喵～',
  },
  {
    level: '中吉',
    levelBadgeColor: 'bg-emerald-500 text-white',
    avoidRollCallRate: 85,
    avoidRollCallDesc: '點名前剛好進教室，或者同學幫你掩護成功！',
    examLuck: 4,
    examLuckDesc: '課堂抽問免疫結界開啟，老師剛好跳過你的學號！',
    luckyColor: '薄荷抹茶綠',
    luckyColorHex: '#10B981',
    luckyItem: '滿格的行動電源',
    butlerQuote: '早餐記得吃飽喵！腦袋有熱量，上早八微積分才不會靈魂出竅喵！',
  },
  {
    level: '小吉',
    levelBadgeColor: 'bg-blue-500 text-white',
    avoidRollCallRate: 78,
    avoidRollCallDesc: '建議坐第三排中間混入人群，別穿太鮮豔的衣服喵！',
    examLuck: 3,
    examLuckDesc: '只要有翻書就及格，小考剛好過門檻！',
    luckyColor: '天空晴朗藍',
    luckyColorHex: '#3B82F6',
    luckyItem: '筆袋底層的無辜橡皮擦',
    butlerQuote: '管家提醒：雖然是小吉，但今天別踩草皮或遲到太久，求穩就好喵！',
  },
  {
    level: '平安歐趴',
    levelBadgeColor: 'bg-indigo-500 text-white',
    avoidRollCallRate: 70,
    avoidRollCallDesc: '老師今天有備而來！乖乖坐在位子上滑手機最安全喵！',
    examLuck: 3,
    examLuckDesc: '考前十分鐘惡補的重點正好考出來，歐趴萬歲！',
    luckyColor: '神秘薰衣草紫',
    luckyColorHex: '#8B5CF6',
    luckyItem: '第二節下課的熱咖啡',
    butlerQuote: '平安就是福喵！只要學分能拿到，六十分就是神仙分數喵～',
  },
];

export const CampusFortuneModal: React.FC<CampusFortuneModalProps> = ({ isOpen, onClose }) => {
  const { catMood, setCatMood } = useApp();

  const [isShaking, setIsShaking] = useState(false);
  const [currentFortune, setCurrentFortune] = useState<FortuneCard | null>(null);
  const [copied, setCopied] = useState(false);

  // Load from local storage or pick daily based on date
  useEffect(() => {
    if (isOpen && !currentFortune) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(`campus_fortune_${todayStr}`);
      if (saved) {
        try {
          setCurrentFortune(JSON.parse(saved));
        } catch {}
      }
    }
  }, [isOpen, currentFortune]);

  if (!isOpen) return null;

  const handleDrawFortune = () => {
    setIsShaking(true);
    setCatMood('thinking');
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * FORTUNES_POOL.length);
      const fortune = FORTUNES_POOL[randomIndex];
      setCurrentFortune(fortune);
      setIsShaking(false);
      setCatMood('proud');
      const todayStr = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`campus_fortune_${todayStr}`, JSON.stringify(fortune));
    }, 1200);
  };

  const handleCopyFortune = () => {
    if (!currentFortune) return;
    const text = `🎋 可樂管家今日吉籤\n【${currentFortune.level}】\n🛡️ 點名迴避率：${currentFortune.avoidRollCallRate}%\n📚 考運指數：${'★'.repeat(currentFortune.examLuck)}\n🍀 幸運物：${currentFortune.luckyItem}\n💬 管家悄悄話：${currentFortune.butlerQuote}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6 relative overflow-hidden">
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-calico-orange to-rose-400" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                可樂管家校園每日吉籤
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                點名迴避率、考運神籤與管家今日悄悄話
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

        {/* Content Body */}
        {!currentFortune || isShaking ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            {/* Shaking Fortune Tube Visual */}
            <div
              className={`w-24 h-32 rounded-2xl bg-gradient-to-br from-amber-500 via-calico-orange to-amber-600 shadow-ios flex flex-col items-center justify-center text-white relative transition-all duration-300 ${
                isShaking ? 'animate-bounce scale-110 rotate-6' : 'hover:scale-105'
              }`}
            >
              <span className="text-2xl font-black mb-1">🎋</span>
              <span className="text-xs font-black tracking-widest uppercase bg-black/20 px-2 py-0.5 rounded-full">
                開運籤筒
              </span>
              <div className="absolute -top-3 w-4 h-8 bg-amber-200 rounded-t-sm shadow-xs border border-amber-400" />
            </div>

            <div>
              <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                {isShaking ? '可樂管家正在為您誠心搖籤中...' : '誠心搖一搖，測測今日校園運勢！'}
              </h4>
              <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-1">
                {isShaking ? '🐾 喵～歐皇力場集氣中，即將開籤！' : '每日免費抽籤一次，點名率、考運、幸運色一目了然'}
              </p>
            </div>

            <button
              onClick={handleDrawFortune}
              disabled={isShaking}
              className="py-3 px-6 rounded-2xl bg-calico-orange text-white font-extrabold text-sm shadow-ios hover:brightness-105 active:scale-95 transition-all flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isShaking ? '搖籤中...' : '立即搖動籤筒 · 抽取靈籤'}</span>
            </button>
          </div>
        ) : (
          /* Fortune Card Result View */
          <div className="mt-4 space-y-3.5 animate-fade-in">
            {/* Level Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 via-calico-cream to-amber-100/60 dark:from-zinc-800 dark:via-zinc-800/80 dark:to-zinc-900 border border-amber-300/40 dark:border-amber-500/20 shadow-ios text-center relative overflow-hidden">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${currentFortune.levelBadgeColor}`}
              >
                {currentFortune.level}
              </span>
              <h3 className="text-xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                今日校園運勢大發
              </h3>
              <p className="text-xs text-calico-cocoa/70 dark:text-zinc-300 font-bold mt-1 px-2">
                {currentFortune.butlerQuote}
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Roll call avoidance */}
              <div className="p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1">
                <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>避開點名率</span>
                </div>
                <div className="text-2xl font-mono font-black text-calico-cocoa dark:text-zinc-100">
                  {currentFortune.avoidRollCallRate}%
                </div>
                <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 leading-tight">
                  {currentFortune.avoidRollCallDesc}
                </p>
              </div>

              {/* Exam & Homework Luck */}
              <div className="p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1">
                <div className="flex items-center space-x-1 text-calico-orange text-xs font-bold">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>考運 / 作業運</span>
                </div>
                <div className="text-base font-black text-amber-500">
                  {'★'.repeat(currentFortune.examLuck)}
                  <span className="text-zinc-300 dark:text-zinc-600">
                    {'☆'.repeat(5 - currentFortune.examLuck)}
                  </span>
                </div>
                <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 leading-tight">
                  {currentFortune.examLuckDesc}
                </p>
              </div>
            </div>

            {/* Lucky Item & Color */}
            <div className="p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center space-x-2">
                <span className="text-calico-cocoa/60 dark:text-zinc-400">今日幸運色：</span>
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block shadow-2xs"
                  style={{ backgroundColor: currentFortune.luckyColorHex }}
                />
                <span className="text-calico-cocoa dark:text-zinc-200">
                  {currentFortune.luckyColor}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-calico-cocoa/60 dark:text-zinc-400">幸運物：</span>
                <span className="text-calico-orange font-black">
                  {currentFortune.luckyItem}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDrawFortune}
                className="py-2.5 px-3 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-300 font-bold text-xs hover:bg-black/10 active:scale-95 transition-all flex items-center space-x-1"
                title="重新抽籤"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>逆天改命</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFortune}
                className="py-2.5 px-3 rounded-2xl bg-calico-orange/15 text-calico-orange font-bold text-xs hover:bg-calico-orange/25 active:scale-95 transition-all flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製！' : '分享靈籤'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-calico-orange text-white font-extrabold text-xs shadow-ios hover:brightness-105 active:scale-95 transition-all flex items-center justify-center space-x-1"
              >
                <span>收下今日祝福</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
