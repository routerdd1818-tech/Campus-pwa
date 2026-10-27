import React from 'react';
import { CountdownItem } from '../types';
import { Trash2, Edit3 } from 'lucide-react';

interface CountdownCardProps {
  item: CountdownItem;
  onEdit?: (item: CountdownItem) => void;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  compact?: boolean;
}

const CATEGORY_NAMES: Record<CountdownItem['category'], string> = {
  exam: '考試檢定',
  finance: '繳費財務',
  life: '校園生活',
  anniversary: '紀念日',
  other: '其他事件',
};

export const CountdownCard: React.FC<CountdownCardProps> = ({
  item,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const isCountUp = item.mode === 'countup';
  const today = new Date(new Date().toISOString().slice(0, 10));
  const target = new Date(item.targetDate);

  let badgeText = '';
  let subText = '';
  let badgeStyle = '';
  let dayNumber = 0;
  let passedDays = 0;
  let diffDays = 0;

  if (isCountUp) {
    // 📈 持續幾日 (Count-up / 紀念日 / 習慣養成)
    const diffTime = today.getTime() - target.getTime();
    passedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    dayNumber = Math.max(1, passedDays + 1); // 當日起算為第 1 天

    badgeText = `第 ${dayNumber} 天`;
    subText = passedDays >= 0 ? `已持續 ${passedDays} 天` : `將於 ${item.targetDate} 開始`;
    badgeStyle = 'bg-pink-500/15 text-pink-700 dark:text-pink-300 font-black';
  } else {
    // ⏳ 倒數日 (Countdown / 目標日)
    const diffTime = target.getTime() - today.getTime();
    diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      badgeText = 'D-Day';
      subText = '今天就是目標日！';
      badgeStyle = 'bg-rose-500 text-white animate-pulse font-black';
    } else if (diffDays < 0) {
      badgeText = `D+${Math.abs(diffDays)}`;
      subText = `已逾期 ${Math.abs(diffDays)} 天`;
      badgeStyle = 'bg-black/5 dark:bg-white/10 text-calico-cocoa/50 dark:text-zinc-400 font-bold';
    } else {
      badgeText = `D-${diffDays}`;
      subText = `還有 ${diffDays} 天`;
      badgeStyle = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black';
    }
  }

  // Compact Pill Display (for top ribbon in Calendar & Today views)
  if (compact) {
    return (
      <div className="flex items-center space-x-2 py-1.5 px-3 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-2xs shrink-0 hover:border-black/15 transition-all">
        <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-100 max-w-[120px] truncate whitespace-nowrap">
          {item.title}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0 ${badgeStyle}`}>
          {badgeText}
        </span>
      </div>
    );
  }

  // Full Card Display (Redesigned for clarity, large date & no clutter)
  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios transition-all hover:border-black/10 dark:hover:border-white/20">
      {/* Top Row: Title + Category Pill on Left, Actions on Right */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h4 className="text-base sm:text-lg font-black text-calico-cocoa dark:text-zinc-100 truncate">
              {item.title}
            </h4>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shrink-0 ${
                isCountUp
                  ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }`}
            >
              {isCountUp ? '持續日' : '倒數日'} · {CATEGORY_NAMES[item.category] || '生活'}
            </span>
          </div>
          {item.notes && (
            <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400 mt-1 line-clamp-1 font-medium">
              {item.notes}
            </p>
          )}
        </div>

        {/* Action icons: Edit & Delete only */}
        <div className="flex items-center space-x-1 shrink-0 text-calico-cocoa/30 dark:text-zinc-500">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              title="編輯"
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              title="刪除"
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Big Date on Left, Big Days Counter on Right */}
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-end justify-between gap-3">
        {/* Left: Prominent Target/Start Date */}
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block mb-0.5">
            {isCountUp ? '起始日期' : '目標日期'}
          </span>
          <span className="text-lg sm:text-xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight whitespace-nowrap">
            {item.targetDate}
          </span>
        </div>

        {/* Right: Big Impactful Days Counter */}
        <div className="text-right shrink-0">
          {isCountUp ? (
            <div>
              <div className="flex items-baseline justify-end space-x-1">
                <span className="text-sm font-extrabold text-pink-600/75 dark:text-pink-400">第</span>
                <span className="text-4xl sm:text-5xl font-black text-pink-600 dark:text-pink-400 tracking-tighter leading-none font-mono">
                  {dayNumber}
                </span>
                <span className="text-sm font-extrabold text-pink-600/75 dark:text-pink-400">天</span>
              </div>
              <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400 font-bold mt-1.5 whitespace-nowrap">
                {subText}
              </p>
            </div>
          ) : diffDays === 0 ? (
            <div>
              <span className="text-3xl sm:text-4xl font-black text-rose-500 tracking-tight leading-none animate-pulse">
                D-Day
              </span>
              <p className="text-xs text-rose-500/80 font-bold mt-1.5 whitespace-nowrap">
                今天就是目標日！
              </p>
            </div>
          ) : diffDays < 0 ? (
            <div>
              <div className="flex items-baseline justify-end space-x-1">
                <span className="text-3xl sm:text-4xl font-black text-calico-cocoa/50 dark:text-zinc-400 tracking-tighter leading-none font-mono">
                  D+{Math.abs(diffDays)}
                </span>
                <span className="text-sm font-extrabold text-calico-cocoa/50">天</span>
              </div>
              <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400 font-bold mt-1.5 whitespace-nowrap">
                {subText}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-end space-x-1">
                <span className="text-sm font-extrabold text-amber-600/75 dark:text-amber-400">還有</span>
                <span className="text-4xl sm:text-5xl font-black text-amber-600 dark:text-amber-400 tracking-tighter leading-none font-mono">
                  {diffDays}
                </span>
                <span className="text-sm font-extrabold text-amber-600/75 dark:text-amber-400">天</span>
              </div>
              <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400 font-bold mt-1.5 whitespace-nowrap">
                目標倒數中 · D-{diffDays}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
