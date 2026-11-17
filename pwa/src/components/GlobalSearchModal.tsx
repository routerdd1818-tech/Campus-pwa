import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryIcon } from './CategoryIcon';
import {
  Search,
  X,
  Wallet,
  CheckSquare,
  BookOpen,
  Calendar,
  Sparkles,
  CheckCircle2,
  Circle,
  MapPin,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAY_NAMES = ['', '週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const {
    transactions,
    todos,
    courses,
    courseWishlist,
    countdowns,
    calendarEvents,
    toggleTodo,
    setActiveTab,
  } = useApp();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'tx' | 'todo' | 'course' | 'event'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setScope('all');
    }
  }, [isOpen]);

  // 支援 Cmd+K / Escape 快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const kw = query.trim().toLowerCase();

  // 1. 搜尋記帳紀錄 + 統計
  const matchedTransactions = useMemo(() => {
    if (!kw) return [];
    return transactions.filter(
      (tx) =>
        (tx.categoryName || '').toLowerCase().includes(kw) ||
        (tx.notes || '').toLowerCase().includes(kw) ||
        (tx.paymentMethodName || '').toLowerCase().includes(kw) ||
        String(tx.amount).includes(kw)
    );
  }, [transactions, kw]);

  const txStats = useMemo(() => {
    const expenseList = matchedTransactions.filter((t) => t.type === 'expense' && !t.isTransfer);
    const totalExpense = expenseList.reduce((s, t) => s + t.amount, 0);
    const totalIncome = matchedTransactions
      .filter((t) => t.type === 'income' && !t.isTransfer)
      .reduce((s, t) => s + t.amount, 0);
    const avgExpense = expenseList.length > 0 ? Math.round(totalExpense / expenseList.length) : 0;
    return { count: matchedTransactions.length, totalExpense, totalIncome, avgExpense };
  }, [matchedTransactions]);

  // 2. 搜尋待辦事項
  const matchedTodos = useMemo(() => {
    if (!kw) return [];
    return todos.filter(
      (t) =>
        (t.title || '').toLowerCase().includes(kw) ||
        (t.notes || '').toLowerCase().includes(kw) ||
        (t.category || '').toLowerCase().includes(kw)
    );
  }, [todos, kw]);

  // 3. 搜尋課程與心願單
  const matchedCourses = useMemo(() => {
    if (!kw) return [];
    return courses.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(kw) ||
        (c.classroom || '').toLowerCase().includes(kw) ||
        (c.instructor || '').toLowerCase().includes(kw)
    );
  }, [courses, kw]);

  const matchedWishlist = useMemo(() => {
    if (!kw) return [];
    return (courseWishlist || []).filter(
      (w) =>
        (w.name || '').toLowerCase().includes(kw) ||
        (w.classroom || '').toLowerCase().includes(kw) ||
        (w.instructor || '').toLowerCase().includes(kw)
    );
  }, [courseWishlist, kw]);

  // 4. 搜尋重要日子與行事曆行程
  const matchedCountdowns = useMemo(() => {
    if (!kw) return [];
    return (countdowns || []).filter(
      (cd) =>
        (cd.title || '').toLowerCase().includes(kw) ||
        (cd.notes || '').toLowerCase().includes(kw)
    );
  }, [countdowns, kw]);

  const matchedEvents = useMemo(() => {
    if (!kw) return [];
    return (calendarEvents || []).filter(
      (ev) =>
        (ev.title || '').toLowerCase().includes(kw) ||
        (ev.notes || '').toLowerCase().includes(kw) ||
        (ev.category || '').toLowerCase().includes(kw)
    );
  }, [calendarEvents, kw]);

  if (!isOpen) return null;

  const totalResults =
    matchedTransactions.length +
    matchedTodos.length +
    matchedCourses.length +
    matchedWishlist.length +
    matchedCountdowns.length +
    matchedEvents.length;

  const quickTags = ['早餐', '午餐', '晚餐', '飲料', 'LINE Pay', '現金', '期中', '報告'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/55 backdrop-blur-xs animate-fade-in">
      <div className="bg-calico-cream dark:bg-calico-darkCard w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border border-black/5 dark:border-white/10 flex flex-col max-h-[88dvh] overflow-hidden animate-sheet-up">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 rounded-full bg-calico-cocoa/15 dark:bg-white/15 mx-auto mb-3 sm:hidden shrink-0" />

        {/* Search Input Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-calico-orange absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋記帳品項、待辦任務、課程教室、重要日子..."
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/40 focus:outline-none focus:border-calico-orange"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-black text-calico-cocoa/70 dark:text-zinc-300 hover:bg-black/10 shrink-0"
          >
            關閉
          </button>
        </div>

        {/* Scope Filter Pills */}
        {kw && (
          <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-none shrink-0">
            {[
              { id: 'all', label: `全部 (${totalResults})` },
              { id: 'tx', label: `記帳 (${matchedTransactions.length})` },
              { id: 'todo', label: `待辦 (${matchedTodos.length})` },
              { id: 'course', label: `課表 (${matchedCourses.length + matchedWishlist.length})` },
              { id: 'event', label: `重要日子/行程 (${matchedCountdowns.length + matchedEvents.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap shrink-0 transition-all tabular-nums ${
                  scope === tab.id
                    ? 'bg-calico-orange text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-calico-cocoa/60 dark:text-zinc-400 border border-black/5 dark:border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-0.5">
          {!kw ? (
            <div className="py-6 space-y-4">
              <div>
                <p className="text-[11px] font-black text-calico-cocoa/50 dark:text-zinc-400 mb-2">
                  熱門快速檢索標籤（點擊立即統計歷史開銷或任務）：
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(tag)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-200 hover:border-calico-orange hover:text-calico-orange transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-1.5">
                <p className="text-xs font-black text-calico-cocoa dark:text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-calico-orange" />
                  <span>搜尋小撇步</span>
                </p>
                <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 leading-relaxed">
                  輸入「咖啡」、「火鍋」或「LINE Pay」，系統會自動幫你加總該關鍵字的**歷史累積消費次數與總金額**；輸入課名或教室可一鍵定位上課時段。
                </p>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-calico-cocoa/20 dark:text-zinc-600 mx-auto" />
              <p className="text-xs font-bold text-calico-cocoa/50 dark:text-zinc-400">
                找不到包含「{query}」的記帳、待辦或課程紀錄
              </p>
            </div>
          ) : (
            <>
              {/* 1. 記帳結果與統計卡 */}
              {(scope === 'all' || scope === 'tx') && matchedTransactions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-calico-orange" />
                      <span>記帳收支紀錄 ({matchedTransactions.length} 筆)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('accounting');
                        onClose();
                      }}
                      className="text-[11px] font-bold text-calico-orange hover:underline flex items-center gap-0.5"
                    >
                      <span>前往帳本</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 關鍵字消費統計看板 */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-calico-orange/15 to-amber-500/10 border border-calico-orange/25 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-calico-orange text-white flex items-center justify-center shrink-0">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block">
                          「{query}」累積消費統計
                        </span>
                        <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 tabular-nums">
                          共 {txStats.count} 筆 · 平均 ${txStats.avgExpense}/筆
                        </span>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block">
                        總支出金額
                      </span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                        ${txStats.totalExpense.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {matchedTransactions.slice(0, 8).map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => {
                          setActiveTab('accounting');
                          onClose();
                        }}
                        className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-calico-orange/40 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            style={{
                              backgroundColor: `${tx.categoryColorHex || '#E67E22'}20`,
                              color: tx.categoryColorHex || '#E67E22',
                            }}
                            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          >
                            <CategoryIcon
                              icon={tx.categoryIcon}
                              categoryName={tx.categoryName}
                              className="w-3.5 h-3.5"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-calico-cocoa dark:text-zinc-100 truncate">
                              {tx.categoryName} {tx.notes ? `· ${tx.notes}` : ''}
                            </p>
                            <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 tabular-nums">
                              {tx.date.slice(0, 10)} · {tx.paymentMethodName || '現金'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-mono font-black tabular-nums shrink-0 ml-2 ${
                            tx.isTransfer
                              ? 'text-blue-600'
                              : tx.type === 'expense'
                              ? 'text-rose-500'
                              : 'text-emerald-600'
                          }`}
                        >
                          {tx.isTransfer ? `⇄ $${tx.amount}` : tx.type === 'expense' ? `-$${tx.amount}` : `+$${tx.amount}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. 待辦事項結果 */}
              {(scope === 'all' || scope === 'todo') && matchedTodos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-calico-sage" />
                      <span>待辦事項 ({matchedTodos.length} 項)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('todos');
                        onClose();
                      }}
                      className="text-[11px] font-bold text-calico-orange hover:underline flex items-center gap-0.5"
                    >
                      <span>前往待辦</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {matchedTodos.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => toggleTodo(t.id)}
                        className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-calico-sage/40 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {t.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-calico-cocoa/30 shrink-0" />
                          )}
                          <span
                            className={`font-bold truncate ${
                              t.isCompleted ? 'line-through text-calico-cocoa/40' : 'text-calico-cocoa dark:text-zinc-100'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-bold shrink-0 ml-2">
                          {t.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. 課表與心願單結果 */}
              {(scope === 'all' || scope === 'course') &&
                (matchedCourses.length > 0 || matchedWishlist.length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-calico-orange" />
                        <span>課程與選課心願單 ({matchedCourses.length + matchedWishlist.length} 門)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('schedule');
                          onClose();
                        }}
                        className="text-[11px] font-bold text-calico-orange hover:underline flex items-center gap-0.5"
                      >
                        <span>前往課表</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {matchedCourses.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setActiveTab('schedule');
                            onClose();
                          }}
                          className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="font-black text-calico-cocoa dark:text-zinc-100 truncate">
                              {c.name}
                            </p>
                            <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-calico-orange" />
                              <span>{c.classroom || '未定教室'} · {c.instructor || '教師'}</span>
                            </p>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-calico-orange shrink-0 ml-2 tabular-nums">
                            {WEEKDAY_NAMES[c.dayOfWeek]} {c.startTime}-{c.endTime}
                          </span>
                        </div>
                      ))}
                      {matchedWishlist.map((w) => (
                        <div
                          key={w.id}
                          onClick={() => {
                            setActiveTab('schedule');
                            onClose();
                          }}
                          className="p-2.5 rounded-2xl bg-white/70 dark:bg-zinc-800/50 border border-dashed border-amber-500/40 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-calico-cocoa dark:text-zinc-100 truncate">
                              [待選心願] {w.name}
                            </p>
                            <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                              {w.targetSemester} 學期 · {w.credits} 學分
                            </p>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-amber-600 shrink-0 ml-2 tabular-nums">
                            {WEEKDAY_NAMES[w.dayOfWeek]} {w.startTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 4. 重要日子與行事曆行程 */}
              {(scope === 'all' || scope === 'event') &&
                (matchedCountdowns.length > 0 || matchedEvents.length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>重要日子與行程 ({matchedCountdowns.length + matchedEvents.length} 項)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('calendar');
                          onClose();
                        }}
                        className="text-[11px] font-bold text-calico-orange hover:underline flex items-center gap-0.5"
                      >
                        <span>前往行事曆</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {matchedCountdowns.map((cd) => (
                        <div
                          key={cd.id}
                          onClick={() => {
                            setActiveTab('calendar');
                            onClose();
                          }}
                          className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="font-black text-calico-cocoa dark:text-zinc-100 truncate">
                            {cd.title}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-amber-600 tabular-nums shrink-0 ml-2">
                            {cd.targetDate}
                          </span>
                        </div>
                      ))}
                      {matchedEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setActiveTab('calendar');
                            onClose();
                          }}
                          className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="font-bold text-calico-cocoa dark:text-zinc-100 truncate">
                            {ev.title}
                          </span>
                          <span className="text-[11px] font-mono text-calico-cocoa/60 dark:text-zinc-400 tabular-nums shrink-0 ml-2">
                            {ev.startDate}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
