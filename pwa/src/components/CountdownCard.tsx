import React from 'react';
import { CountdownItem } from '../types';
import { Pin, Trash2, Edit3, Calendar } from 'lucide-react';

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
  onTogglePin,
  compact = false,
}) => {
  const isCountUp = item.mode === 'countup';
  const today = new Date(new Date().toISOString().slice(0, 10));
  const target = new Date(item.targetDate);

  let badgeText = '';
  let subText = '';
  let badgeStyle = '';

  if (isCountUp) {
    // 📈 持續幾日 (Count-up / 紀念日 / 習慣養成)
    const diffTime = today.getTime() - target.getTime();
    const passedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const dayNumber = Math.max(1, passedDays + 1); // 當日起算為第 1 天

    badgeText = `第 ${dayNumber} 天`;
    subText = passedDays >= 0 ? `已持續 ${passedDays} 天` : `將於 ${item.targetDate} 開始`;
    badgeStyle = 'bg-pink-500/15 text-pink-700 dark:text-pink-300 font-black';
  } else {
    // ⏳ 倒數日 (Countdown / 目標日)
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

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
      <div className="flex items-center space-x-2 py-1 px-3 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-2xs shrink-0 hover:border-black/15 transition-all">
        <div
          style={{
            backgroundColor: `${item.colorHex || '#F59E0B'}25`,
            borderColor: `${item.colorHex || '#F59E0B'}50`,
          }}
          className="w-6 h-6 rounded-lg border flex items-center justify-center text-xs shrink-0"
        >
          {item.emoji || (isCountUp ? '💖' : '⏳')}
        </div>
        <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-100 max-w-[110px] truncate whitespace-nowrap">
          {item.title}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0 ${badgeStyle}`}>
          {badgeText}
        </span>
      </div>
    );
  }

  // Full Card Display
  return (
    <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between gap-3 transition-all hover:border-black/10 dark:hover:border-white/20">
      {/* Left: Emoji badge & Details */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div
          style={{
            backgroundColor: `${item.colorHex || '#F59E0B'}20`,
            borderColor: `${item.colorHex || '#F59E0B'}40`,
          }}
          className="w-11 h-11 rounded-2xl border flex items-center justify-center text-xl shrink-0 shadow-2xs"
        >
          {item.emoji || (isCountUp ? '💖' : '⏳')}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <h5 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 truncate">
              {item.title}
            </h5>
            {item.isPinned && (
              <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-md font-black whitespace-nowrap shrink-0">
                📌 置頂
              </span>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold whitespace-nowrap shrink-0 ${
                isCountUp
                  ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300'
                  : 'bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              {isCountUp ? '持續日' : '倒數日'} · {CATEGORY_NAMES[item.category] || '生活'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-calico-cocoa/50 dark:text-zinc-400 mt-1 truncate font-semibold">
            <Calendar className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="whitespace-nowrap shrink-0">
              {isCountUp ? `起始於 ${item.targetDate}` : `目標於 ${item.targetDate}`}
            </span>
            {item.notes && <span className="truncate">· {item.notes}</span>}
          </div>
        </div>
      </div>

      {/* Right: Days Badge & Actions */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="text-right shrink-0">
          <span
            className={`text-xs sm:text-sm px-2.5 py-1 rounded-xl inline-block whitespace-nowrap shadow-2xs ${badgeStyle}`}
          >
            {badgeText}
          </span>
          <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-bold mt-0.5 whitespace-nowrap">
            {subText}
          </p>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1 shrink-0">
          {onTogglePin && (
            <button
              type="button"
              onClick={() => onTogglePin(item.id)}
              title={item.isPinned ? '取消置頂' : '釘選至頂部'}
              className={`p-1.5 rounded-xl transition-all ${
                item.isPinned
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  : 'text-calico-cocoa/30 hover:text-calico-cocoa dark:hover:text-zinc-300'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              title="編輯"
              className="p-1.5 rounded-xl text-calico-cocoa/30 hover:text-calico-cocoa dark:hover:text-zinc-300 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              title="刪除"
              className="p-1.5 rounded-xl text-calico-cocoa/20 hover:text-rose-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
