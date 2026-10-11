import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarEvent, DayOfWeek, Todo, Course, Transaction } from '../types';
import { EventModal } from '../components/EventModal';
import { ShareModal } from '../components/ShareModal';
import { TodoModal } from '../components/TodoModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  BookOpen,
  CheckSquare,
  Wallet,
  Clock,
  Sparkles,
  CalendarDays,
  Coffee,
  Tag,
} from 'lucide-react';

const WEEKDAYS_HEADER = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

interface UnifiedSpanItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  colorHex: string;
  category: string;
  isAllDay: boolean;
  notes?: string;
  type: 'event' | 'todo';
  isCompleted?: boolean;
}

export const CalendarView: React.FC = () => {
  const {
    courses,
    todos,
    transactions,
    calendarEvents,
    budgetInfo,
    addTodo,
    toggleTodo,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    isShareModalOpen,
    setIsShareModalOpen,
    isEventModalOpen,
    setIsEventModalOpen,
    eventToEdit,
    setEventToEdit,
  } = useApp();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Calendar View Mode: Month vs Week
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');

  // Month navigation state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  // Selected date (defaults to today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Today Summary Collapsible State (default open)
  const [isTodaySummaryOpen, setIsTodaySummaryOpen] = useState(true);

  // Todo modal state for quick add
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);

  // -------------------------------------------------------------
  // 📅 Month grid calculation
  // -------------------------------------------------------------
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = lastDayOfMonth.getDate();

    // Days from previous month to fill the first row
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        dateStr: prevDate.toISOString().slice(0, 10),
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({
        dateStr: `${year}-${mStr}-${dStr}`,
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Days in next month to fill remaining cells (up to complete 7-day rows)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const mStr = String(((month + 1) % 12) + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      const nextYear = month === 11 ? year + 1 : year;
      days.push({
        dateStr: `${nextYear}-${mStr}-${dStr}`,
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // -------------------------------------------------------------
  // 🗓️ Week View calculation
  // -------------------------------------------------------------
  const currentWeekDays = useMemo(() => {
    const sel = new Date(selectedDateStr);
    const dayOfWeek = sel.getDay(); // 0 (Sun) to 6 (Sat)
    // Sunday of the current week
    const sunday = new Date(sel);
    sunday.setDate(sel.getDate() - dayOfWeek);

    const weekDays: { dateStr: string; dayNum: number; weekdayName: string; dayOfWeekNum: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      weekDays.push({
        dateStr: `${y}-${m}-${day}`,
        dayNum: d.getDate(),
        weekdayName: WEEKDAYS_HEADER[i],
        dayOfWeekNum: i === 0 ? 7 : i, // 1 = Mon ... 7 = Sun
      });
    }
    return weekDays;
  }, [selectedDateStr]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
    setSelectedDateStr(todayStr);
  };

  // -------------------------------------------------------------
  // 🌟 TimeTree Multi-Day Span Event & Period Todos Logic
  // -------------------------------------------------------------
  const getAllSpanItemsForDate = (dateStr: string): UnifiedSpanItem[] => {
    // 1. Calendar Events covering this date
    const eventItems: UnifiedSpanItem[] = calendarEvents
      .filter((e) => dateStr >= e.startDate && dateStr <= e.endDate)
      .map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        colorHex: e.colorHex || '#E67E22',
        category: e.category,
        isAllDay: e.isAllDay,
        notes: e.notes,
        type: 'event',
      }));

    // 2. Todos with Period (e.g. 12/7~12/14 出國) covering this date
    const periodTodoItems: UnifiedSpanItem[] = todos
      .filter((t) => t.startDate && t.endDate && dateStr >= t.startDate && dateStr <= t.endDate)
      .map((t) => ({
        id: t.id,
        title: t.title,
        startDate: t.startDate!,
        endDate: t.endDate!,
        colorHex: t.colorHex || '#DD6B20',
        category: t.category,
        isAllDay: true,
        notes: t.notes,
        type: 'todo',
        isCompleted: t.isCompleted,
      }));

    return [...eventItems, ...periodTodoItems];
  };

  // Memoized all span items across calendar & period todos
  const allSpanItems = useMemo<UnifiedSpanItem[]>(() => {
    const eventItems: UnifiedSpanItem[] = calendarEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      colorHex: e.colorHex || '#E67E22',
      category: e.category,
      isAllDay: e.isAllDay,
      notes: e.notes,
      type: 'event',
    }));

    const periodTodoItems: UnifiedSpanItem[] = todos
      .filter((t) => t.startDate && t.endDate)
      .map((t) => ({
        id: t.id,
        title: t.title,
        startDate: t.startDate!,
        endDate: t.endDate!,
        colorHex: t.colorHex || '#DD6B20',
        category: t.category,
        isAllDay: true,
        notes: t.notes,
        type: 'todo',
        isCompleted: t.isCompleted,
      }));

    return [...eventItems, ...periodTodoItems];
  }, [calendarEvents, todos]);

  // Group month grid days into weeks of 7 for continuous ribbons
  const monthWeeks = useMemo(() => {
    const weeks: (typeof monthGridDays)[] = [];
    for (let i = 0; i < monthGridDays.length; i += 7) {
      weeks.push(monthGridDays.slice(i, i + 7));
    }
    return weeks;
  }, [monthGridDays]);

  // -------------------------------------------------------------
  // ☀️ Today's Summary Data (Courses + Todos + Accounting)
  // -------------------------------------------------------------
  const todayDayOfWeek = (now.getDay() === 0 ? 7 : now.getDay()) as DayOfWeek;

  const todayCourses = useMemo(() => {
    return courses
      .filter((c) => c.dayOfWeek === todayDayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [courses, todayDayOfWeek]);

  const todayTodos = useMemo(() => {
    return todos.filter((t) => {
      // Due today or period active today
      if (t.dueDate && t.dueDate.slice(0, 10) === todayStr) return true;
      if (t.startDate && t.endDate && todayStr >= t.startDate && todayStr <= t.endDate) return true;
      return false;
    });
  }, [todos, todayStr]);

  const todaySpanItems = useMemo(() => {
    return getAllSpanItemsForDate(todayStr);
  }, [calendarEvents, todos, todayStr]);

  // Selected date events & items
  const selectedDateSpanItems = useMemo(() => {
    return getAllSpanItemsForDate(selectedDateStr);
  }, [selectedDateStr, calendarEvents, todos]);

  const selectedDateCourses = useMemo(() => {
    const sel = new Date(selectedDateStr);
    const dayOfWeek = (sel.getDay() === 0 ? 7 : sel.getDay()) as DayOfWeek;
    return courses
      .filter((c) => c.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDateStr, courses]);

  const selectedDateTodos = useMemo(() => {
    return todos.filter((t) => {
      if (t.dueDate && t.dueDate.slice(0, 10) === selectedDateStr) return true;
      if (t.startDate && t.endDate && selectedDateStr >= t.startDate && selectedDateStr <= t.endDate) return true;
      return false;
    });
  }, [selectedDateStr, todos]);

  const selectedDateTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.slice(0, 10) === selectedDateStr);
  }, [selectedDateStr, transactions]);

  return (
    <div className="space-y-4 pb-28">
      {/* 頂部操作與視圖切換列 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* 月曆 vs 週曆 切換 */}
        <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
          <button
            onClick={() => setCalendarMode('month')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              calendarMode === 'month'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            月曆預覽
          </button>
          <button
            onClick={() => setCalendarMode('week')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              calendarMode === 'week'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            本週安排
          </button>
        </div>

        {/* Buttons (Today, Add Event, Share) */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleGoToday}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-extrabold text-calico-orange hover:bg-calico-orange/10 active:scale-95 transition-all shadow-2xs"
          >
            今天
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 active:scale-95 transition-all shadow-2xs border border-indigo-200 dark:border-indigo-800/40"
            title="行事曆、課表與記帳好友共享"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
          >
            <Plus className="w-4 h-4" />
            <span>新行程</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🌟 1. 當日的折疊 (Today's Collapsible Summary) */}
      {/* ======================================================== */}
      <div className="rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios overflow-hidden transition-all">
        {/* Collapsible Header */}
        <button
          onClick={() => setIsTodaySummaryOpen(!isTodaySummaryOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-calico-orange/15 text-calico-orange flex items-center justify-center font-black shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  今日總覽折疊卡
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-calico-orange text-white">
                  今天 {now.getMonth() + 1}/{now.getDate()}
                </span>
              </div>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 mt-0.5">
                {todayCourses.length} 門課 · {todayTodos.length} 項待辦 · 已支出 ${budgetInfo.todaySpent}
              </p>
            </div>
          </div>

          <div className="p-1 rounded-full text-calico-cocoa/40">
            {isTodaySummaryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {/* Collapsible Content */}
        {isTodaySummaryOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-black/5 dark:border-white/5 space-y-3.5 animate-fade-in">
            {/* 1.0 進行中的跨日行程與出國週期 */}
            {todaySpanItems.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-black text-calico-orange flex items-center space-x-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>進行中的跨日/區間行程 ({todaySpanItems.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {todaySpanItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: `${item.colorHex}18`,
                        borderColor: `${item.colorHex}40`,
                        color: item.colorHex,
                      }}
                      className="px-2.5 py-1 rounded-xl text-xs font-black border flex items-center space-x-1.5 shadow-2xs"
                    >
                      <span>{item.title}</span>
                      <span className="text-[10px] opacity-75">
                        ({item.startDate.slice(5)} ~ {item.endDate.slice(5)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1.1 今日課表 (Today Courses) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5 text-calico-orange" />
                  <span>今日課表 ({todayCourses.length})</span>
                </span>
              </div>

              {todayCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {todayCourses.map((c) => (
                    <div
                      key={c.id}
                      style={{ borderLeftColor: c.colorHex }}
                      className="p-2.5 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 border-l-4 flex items-center justify-between text-xs"
                    >
                      <div className="truncate">
                        <p className="font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">{c.name}</p>
                        <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 truncate">
                          {c.classroom || '未定教室'} · {c.instructor || '講師'}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-calico-cocoa/80 dark:text-zinc-300 shrink-0 ml-2">
                        {c.startTime}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-calico-cocoa/40 py-1.5 px-2 rounded-xl bg-calico-cream/30 dark:bg-zinc-800/30">
                  今天沒有排定課堂，自習或休息時光！☕️
                </p>
              )}
            </div>

            {/* 1.2 今日待辦 (Today Todos) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                  <CheckSquare className="w-3.5 h-3.5 text-calico-sage" />
                  <span>今日待辦 ({todayTodos.length})</span>
                </span>
                <button
                  onClick={() => setIsTodoModalOpen(true)}
                  className="text-[11px] font-bold text-calico-orange hover:underline"
                >
                  ＋ 加待辦
                </button>
              </div>

              {todayTodos.length > 0 ? (
                <div className="space-y-1.5">
                  {todayTodos.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => toggleTodo(t.id)}
                      className="p-2 rounded-xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer hover:bg-calico-orange/5 transition-colors"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {t.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-calico-cocoa/30 shrink-0" />
                        )}
                        <span
                          className={`truncate font-semibold ${
                            t.isCompleted ? 'line-through text-calico-cocoa/40' : 'text-calico-cocoa dark:text-zinc-100'
                          }`}
                        >
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 shrink-0 ml-2 font-bold">
                        {t.category}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-calico-cocoa/40 py-1.5 px-2 rounded-xl bg-calico-cream/30 dark:bg-zinc-800/30">
                  今天沒有待辦事項，輕鬆度過！✨
                </p>
              )}
            </div>

            {/* 1.3 今日記帳與花費 (Today Spending & Budget) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                  <Wallet className="w-3.5 h-3.5 text-calico-orange" />
                  <span>今日記帳花費 (${budgetInfo.todaySpent})</span>
                </span>
                <span className="text-[11px] text-calico-cocoa/60 font-bold">
                  剩餘預算: ${Math.max(0, budgetInfo.remaining)}
                </span>
              </div>

              {transactions.filter((t) => t.date.slice(0, 10) === todayStr).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {transactions
                    .filter((t) => t.date.slice(0, 10) === todayStr)
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="px-2.5 py-1 rounded-xl bg-calico-cream/70 dark:bg-zinc-800 border border-black/5 dark:border-white/5 flex items-center space-x-1.5 text-xs"
                      >
                        <span className="font-bold text-calico-cocoa dark:text-zinc-200">{tx.categoryName}</span>
                        <span className="font-mono font-black text-calico-orange">${tx.amount}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-calico-cocoa/40 py-1.5 px-2 rounded-xl bg-calico-cream/30 dark:bg-zinc-800/30">
                  今天尚無記帳支出，善用預算聰明理財！🌱
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 📅 2. 月曆 檢視 (Monthly Calendar - Image 3 Style) */}
      {/* ======================================================== */}
      {calendarMode === 'month' && (
        <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
          {/* Month Header Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-calico-orange" />
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                {year} 年 {month + 1} 月
              </h3>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-calico-orange/20 active:scale-95 transition-all"
                title="上個月"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoToday}
                className="px-2 py-1 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-calico-orange/20 text-xs font-bold text-calico-cocoa dark:text-zinc-200 active:scale-95 transition-all"
              >
                今天
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-calico-orange/20 active:scale-95 transition-all"
                title="下個月"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names Header (Image 3: Sunday Red, Saturday Blue, Weekdays Neutral) */}
          <div className="grid grid-cols-7 text-center pb-2 border-b border-black/5 dark:border-white/5">
            {WEEKDAYS_HEADER.map((w, idx) => (
              <div
                key={w}
                className={`text-xs font-black ${
                  idx === 0
                    ? 'text-red-500 dark:text-red-400'
                    : idx === 6
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-calico-cocoa/80 dark:text-zinc-300'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 7-Column Month Grid Table (Image 3 Style: Clean cells with compact pill tags) */}
          <div className="grid grid-cols-7 border-t border-l border-black/10 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/40 shadow-2xs">
            {monthGridDays.map((cell, idx) => {
              const colIdx = idx % 7; // 0 = Sun, 6 = Sat
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;

              const cellDate = new Date(cell.dateStr);
              const cellDayOfWeek = (cellDate.getDay() === 0 ? 7 : cellDate.getDay()) as DayOfWeek;

              // Items on this date:
              // 1. Events active on this day
              const dayEvents = calendarEvents.filter(
                (e) => cell.dateStr >= e.startDate && cell.dateStr <= (e.endDate || e.startDate)
              );

              // 2. Todos active on this day
              const dayTodos = todos.filter(
                (t) =>
                  !t.isCompleted &&
                  ((t.startDate && t.endDate && cell.dateStr >= t.startDate && cell.dateStr <= t.endDate) ||
                    (t.dueDate && t.dueDate.slice(0, 10) === cell.dateStr))
              );

              // 3. Courses on this weekday
              const dayCourses = courses.filter((c) => c.dayOfWeek === cellDayOfWeek);

              const totalItems = dayEvents.length + dayTodos.length;
              const maxPills = 3;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`border-r border-b border-black/10 dark:border-white/10 p-1 sm:p-1.5 min-h-[76px] sm:min-h-[92px] flex flex-col justify-start transition-all cursor-pointer relative select-none ${
                    isSelected
                      ? 'bg-calico-orange/10 ring-2 ring-inset ring-calico-orange z-10'
                      : isToday
                      ? 'bg-red-50/40 dark:bg-red-950/20'
                      : !cell.isCurrentMonth
                      ? 'bg-black/[0.02] dark:bg-white/[0.02]'
                      : 'hover:bg-calico-orange/5'
                  }`}
                >
                  {/* Top row of cell: date number */}
                  <div className="flex items-center justify-between mb-1">
                    {isToday ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-[11px] sm:text-xs shadow-xs">
                        {cell.dayNum}
                      </div>
                    ) : (
                      <span
                        className={`text-[11px] sm:text-xs font-bold leading-tight ${
                          !cell.isCurrentMonth
                            ? colIdx === 0
                              ? 'text-red-300 dark:text-red-900/50'
                              : colIdx === 6
                              ? 'text-blue-300 dark:text-blue-900/50'
                              : 'text-zinc-300 dark:text-zinc-600'
                            : colIdx === 0
                            ? 'text-red-500 font-extrabold'
                            : colIdx === 6
                            ? 'text-blue-500 font-extrabold'
                            : 'text-zinc-800 dark:text-zinc-200 font-bold'
                        }`}
                      >
                        {!cell.isCurrentMonth && (cell.dayNum === 1 || idx === 0)
                          ? `${new Date(cell.dateStr).getMonth() + 1}/${cell.dayNum}`
                          : cell.dayNum}
                      </span>
                    )}

                    {/* Subtle course count dot */}
                    {dayCourses.length > 0 && cell.isCurrentMonth && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                        title={`${dayCourses.length} 門課程`}
                      />
                    )}
                  </div>

                  {/* Stack of compact pill tags (Image 3 Style) */}
                  <div className="space-y-0.5 overflow-hidden w-full">
                    {/* Event pills */}
                    {dayEvents.slice(0, maxPills).map((ev) => (
                      <div
                        key={`ev-${ev.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateStr(cell.dateStr);
                          setEventToEdit(ev);
                          setIsEventModalOpen(true);
                        }}
                        style={{
                          backgroundColor: `${ev.colorHex}22`,
                          borderColor: `${ev.colorHex}55`,
                          color: ev.colorHex,
                        }}
                        className="w-full px-1 py-0.5 rounded text-[9px] sm:text-[9.5px] font-bold truncate border flex items-center space-x-1 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all leading-tight shadow-2xs"
                        title={`${ev.title} (${ev.startDate} ~ ${ev.endDate})`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.colorHex }}
                        />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}

                    {/* Todo pills */}
                    {dayTodos.slice(0, Math.max(0, maxPills - dayEvents.length)).map((td) => (
                      <div
                        key={`td-${td.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateStr(cell.dateStr);
                        }}
                        className="w-full px-1 py-0.5 rounded text-[9px] sm:text-[9.5px] font-bold truncate border border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all leading-tight shadow-2xs"
                        title={td.title}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                        <span className="truncate">{td.title}</span>
                      </div>
                    ))}

                    {/* Overflow count */}
                    {totalItems > maxPills && (
                      <div className="text-[8.5px] font-extrabold text-calico-cocoa/50 dark:text-zinc-400 pl-0.5 leading-none">
                        +{totalItems - maxPills} 更多
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🗓️ 3. 週曆 檢視 (Weekly Calendar View) */}
      {/* ======================================================== */}
      {calendarMode === 'week' && (
        <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1.5">
              <CalendarDays className="w-5 h-5 text-calico-orange" />
              <span>本週安排概覽</span>
            </h3>
            <span className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
              {currentWeekDays[0]?.dateStr} ~ {currentWeekDays[6]?.dateStr}
            </span>
          </div>

          {/* 7 Days of the Week */}
          <div className="space-y-2">
            {currentWeekDays.map((w) => {
              const isSelected = w.dateStr === selectedDateStr;
              const isToday = w.dateStr === todayStr;

              const daySpanItems = getAllSpanItemsForDate(w.dateStr);
              const dayCourses = courses.filter((c) => c.dayOfWeek === w.dayOfWeekNum);
              const dayTodos = todos.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === w.dateStr);

              return (
                <div
                  key={w.dateStr}
                  onClick={() => setSelectedDateStr(w.dateStr)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-calico-orange/15 border-calico-orange shadow-ios-sm'
                      : isToday
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40'
                      : 'bg-calico-cream/40 dark:bg-zinc-800/40 border-black/5 dark:border-white/5 hover:border-calico-orange/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          isToday
                            ? 'bg-calico-orange text-white'
                            : 'bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200'
                        }`}
                      >
                        週{w.weekdayName}
                      </span>
                      <span className="text-xs font-mono font-bold text-calico-cocoa/70 dark:text-zinc-300">
                        {w.dateStr.slice(5)}
                      </span>
                    </div>

                    <span className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                      {dayCourses.length} 門課 · {daySpanItems.length} 項活動/排程 · {dayTodos.length} 待辦
                    </span>
                  </div>

                  {/* Span Items on this day */}
                  {daySpanItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {daySpanItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: `${item.colorHex}20`,
                            color: item.colorHex,
                            borderColor: `${item.colorHex}40`,
                          }}
                          className="px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center space-x-1"
                        >
                          {item.type === 'todo' ? (
                            <CheckSquare className="w-2.5 h-2.5 shrink-0" />
                          ) : (
                            <Tag className="w-2.5 h-2.5 shrink-0" />
                          )}
                          <span>{item.title}</span>
                          <span className="text-[9px] opacity-75">
                            ({item.startDate.slice(5)} ~ {item.endDate.slice(5)})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📋 4. 選取日期詳細行程 (Selected Date Agenda) */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
          <div>
            <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1.5">
              <span>{selectedDateStr} 行程明細</span>
              {selectedDateStr === todayStr && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-calico-orange text-white">
                  今天
                </span>
              )}
            </h4>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              包含當日課表、跨天活動、待辦作業與收支
            </p>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsTodoModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-calico-sage/15 text-calico-sage text-xs font-bold flex items-center space-x-1 hover:bg-calico-sage/25 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>加待辦</span>
            </button>
            <button
              onClick={() => {
                setEventToEdit(null);
                setIsEventModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-calico-orange/15 text-calico-orange text-xs font-bold flex items-center space-x-1 hover:bg-calico-orange/25 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>加活動</span>
            </button>
          </div>
        </div>

        {/* 4.1 TimeTree Span Items on Selected Date */}
        {selectedDateSpanItems.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
              <CalendarDays className="w-3.5 h-3.5 text-calico-orange" />
              <span>進行中的區間行程 ({selectedDateSpanItems.length})</span>
            </span>
            {selectedDateSpanItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type === 'event') {
                    const found = calendarEvents.find((e) => e.id === item.id);
                    if (found) {
                      setEventToEdit(found);
                      setIsEventModalOpen(true);
                    }
                  }
                }}
                style={{ borderLeftColor: item.colorHex }}
                className="p-3 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 border-l-4 flex items-center justify-between cursor-pointer hover:brightness-95 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    {item.type === 'todo' ? (
                      <CheckSquare className="w-3.5 h-3.5 text-calico-orange" />
                    ) : (
                      <Tag className="w-3.5 h-3.5 text-calico-orange" />
                    )}
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100">{item.title}</span>
                    <span
                      style={{ color: item.colorHex }}
                      className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 font-bold"
                    >
                      {item.category}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 mt-0.5">{item.notes}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-calico-cocoa/70 dark:text-zinc-300 font-bold">
                    {item.startDate === item.endDate ? item.startDate : `${item.startDate} ~ ${item.endDate}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4.2 Courses on Selected Date */}
        {selectedDateCourses.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-calico-orange" />
              <span>當日課程 ({selectedDateCourses.length})</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedDateCourses.map((c) => (
                <div
                  key={c.id}
                  style={{ borderLeftColor: c.colorHex }}
                  className="p-2.5 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 border-l-4 flex items-center justify-between text-xs"
                >
                  <div className="truncate">
                    <p className="font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">{c.name}</p>
                    <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 truncate">
                      {c.classroom || '未定教室'} · {c.instructor || '講師'}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-calico-cocoa/80 dark:text-zinc-300 shrink-0 ml-2">
                    {c.startTime} - {c.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4.3 Todos on Selected Date */}
        {selectedDateTodos.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
              <CheckSquare className="w-3.5 h-3.5 text-calico-sage" />
              <span>當日待辦 ({selectedDateTodos.length})</span>
            </span>
            <div className="space-y-1.5">
              {selectedDateTodos.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTodo(t.id)}
                  className="p-2 rounded-xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer hover:bg-calico-orange/5 transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    {t.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-calico-cocoa/30 shrink-0" />
                    )}
                    <span
                      className={`truncate font-semibold ${
                        t.isCompleted ? 'line-through text-calico-cocoa/40' : 'text-calico-cocoa dark:text-zinc-100'
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 shrink-0 ml-2 font-bold">
                    {t.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4.4 Expenses on Selected Date */}
        {selectedDateTransactions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
              <span>當日收支 ({selectedDateTransactions.length})</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedDateTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="px-2.5 py-1 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/5 dark:border-white/5 flex items-center space-x-2 text-xs"
                >
                  <span className="font-bold text-calico-cocoa dark:text-zinc-200">{tx.categoryName}</span>
                  <span className="text-[10px] text-calico-cocoa/60">{tx.notes}</span>
                  <span className="font-mono font-black text-calico-orange">${tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for selected date */}
        {selectedDateSpanItems.length === 0 &&
          selectedDateCourses.length === 0 &&
          selectedDateTodos.length === 0 &&
          selectedDateTransactions.length === 0 && (
            <div className="text-center py-8 rounded-2xl bg-calico-cream/20 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10 space-y-2">
              <Coffee className="w-6 h-6 text-calico-cocoa/30 dark:text-zinc-500 mx-auto" />
              <p className="text-xs font-bold text-calico-cocoa/50 dark:text-zinc-400">
                此日尚無排定事件、課程或待辦，是個放鬆的日子！
              </p>
            </div>
          )}
      </div>

      {/* ======================================================== */}
      {/* 5. Modals */}
      {/* ======================================================== */}
      {/* TimeTree Span Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        event={eventToEdit}
        defaultDate={selectedDateStr}
        onClose={() => setIsEventModalOpen(false)}
        onSave={(ev) => {
          if (eventToEdit) {
            updateCalendarEvent(ev);
          } else {
            addCalendarEvent(ev);
          }
        }}
        onDelete={deleteCalendarEvent}
      />

      {/* Share Calendar / Schedule / Accounting Center */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Quick Add Todo Modal */}
      <TodoModal
        isOpen={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        onSave={(todo) => {
          addTodo({
            ...todo,
            dueDate: todo.dueDate || new Date(selectedDateStr + 'T23:59:00').toISOString(),
          });
        }}
      />

      {/* 🚀 Floating Quick Add Button (Image 3 Style FAB) */}
      <button
        onClick={() => {
          setEventToEdit(null);
          setIsEventModalOpen(true);
        }}
        className="fixed bottom-24 right-5 sm:bottom-10 sm:right-10 z-40 w-13 h-13 rounded-full bg-calico-orange text-white shadow-ios-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-orange-500/40 ring-4 ring-white/80 dark:ring-zinc-900/80"
        title="新增行事曆行程"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
