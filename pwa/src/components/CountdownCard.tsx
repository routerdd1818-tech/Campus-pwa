import React, { useState } from 'react';
import { CountdownItem } from '../types';
import { Trash2, Edit3, ChevronDown, Plus, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

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
  const { toggleCountdownTodo, addCountdownTodo, deleteCountdownTodo } = useApp();
  const [isTodosExpanded, setIsTodosExpanded] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');

  const todos = item.todos || [];
  const completedCount = todos.filter((t) => t.isCompleted).length;
  const totalCount = todos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTodoTitle.trim()) return;
    addCountdownTodo(item.id, newTodoTitle.trim());
    setNewTodoTitle('');
  };

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
            {item.linkedTodoId && (
              <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300 whitespace-nowrap shrink-0">
                連動待辦
              </span>
            )}
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

      {/* 📋 備戰待辦清單區塊 (Integrated Checklist) */}
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsTodosExpanded(!isTodosExpanded)}
            className="flex items-center space-x-2 text-left group transition-all"
          >
            <span className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              備戰清單 {totalCount > 0 ? `(${completedCount}/${totalCount})` : ''}
            </span>
            {totalCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400">
                {progressPercent}%
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-calico-cocoa/40 transition-transform duration-200 ${
                isTodosExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {!isTodosExpanded && totalCount === 0 && (
            <button
              type="button"
              onClick={() => setIsTodosExpanded(true)}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>加入準備事項</span>
            </button>
          )}
        </div>

        {/* Progress Bar (Visible when there are items) */}
        {totalCount > 0 && (
          <div className="mt-2 w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Expanded Checklist View */}
        {isTodosExpanded && (
          <div className="mt-3 space-y-2 animate-fade-in">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleCountdownTodo(item.id, todo.id)}
                  className="flex items-center space-x-2.5 min-w-0 flex-1 text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      todo.isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-black/20 dark:border-white/20 hover:border-amber-500'
                    }`}
                  >
                    {todo.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs font-semibold truncate ${
                      todo.isCompleted
                        ? 'line-through text-calico-cocoa/40 dark:text-zinc-500'
                        : 'text-calico-cocoa dark:text-zinc-200'
                    }`}
                  >
                    {todo.title}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => deleteCountdownTodo(item.id, todo.id)}
                  title="刪除待辦"
                  className="p-1 rounded-lg text-calico-cocoa/30 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Quick Add Input */}
            <form onSubmit={handleAddTodo} className="flex items-center space-x-1.5 mt-2">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="新增準備事項（按 Enter 送出）..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/30 dark:placeholder:text-zinc-500 outline-none focus:border-amber-500 transition-all"
              />
              <button
                type="submit"
                disabled={!newTodoTitle.trim()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold disabled:opacity-40 disabled:pointer-events-none hover:bg-amber-600 transition-all shrink-0"
              >
                新增
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
