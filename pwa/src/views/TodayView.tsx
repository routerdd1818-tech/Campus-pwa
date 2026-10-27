import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Course, Todo, Transaction, CalendarEvent, DayOfWeek, CountdownItem, TodaySectionId } from '../types';
import { CourseModal } from '../components/CourseModal';
import { TodoModal } from '../components/TodoModal';
import { TransactionModal } from '../components/TransactionModal';
import { EventModal } from '../components/EventModal';
import { CountdownModal } from '../components/CountdownModal';
import { TodayLayoutModal } from '../components/TodayLayoutModal';
import {
  Sun,
  Clock,
  BookOpen,
  CheckSquare,
  Wallet,
  Calendar,
  Plus,
  CheckCircle2,
  Circle,
  MapPin,
  User,
  Coffee,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { CountdownCard } from '../components/CountdownCard';

export const TodayView: React.FC = () => {
  const {
    courses,
    todos,
    transactions,
    calendarEvents,
    budgetInfo,
    addCourse,
    updateCourse,
    deleteCourse,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    addTransaction,
    deleteTransaction,
    addCalendarEvent,
    catMood,
    setCatMood,
    setActiveTab,
    setIsFortuneModalOpen,
    setIsFoodRouletteOpen,
    setIsPomodoroOpen,
    countdowns,
    deleteCountdown,
    todaySectionsOrder,
    todaySectionsCollapsed,
    todaySectionsHidden,
    toggleTodaySectionCollapsed,
    upcomingCountdownsCount,
  } = useApp();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const jsDay = now.getDay();
  const todayDayOfWeek = (jsDay === 0 ? 7 : jsDay) as DayOfWeek;

  // Modals state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [countdownToEdit, setCountdownToEdit] = useState<CountdownItem | null>(null);
  const [isAllCountdownsExpanded, setIsAllCountdownsExpanded] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);

  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null);

  // Formatted date string (e.g. 10月11日 星期日)
  const formattedDate = useMemo(() => {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[jsDay]}`;
  }, [now, jsDay]);

  // Convert HH:mm to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // 1. 今日課表 (Today's Courses)
  const todayCourses = useMemo(() => {
    return courses
      .filter((c) => c.dayOfWeek === todayDayOfWeek)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [courses, todayDayOfWeek]);

  // 2. 即時上課狀態 (Live Class Status)
  const liveStatus = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (todayCourses.length === 0) {
      return { type: 'free', message: '可樂管家提醒：今日無排定課程，放鬆享受充電時光！' };
    }

    const currentClass = todayCourses.find((c) => {
      const s = timeToMinutes(c.startTime);
      const e = timeToMinutes(c.endTime);
      return nowMin >= s && nowMin < e;
    });

    if (currentClass) {
      const remainMin = Math.max(1, timeToMinutes(currentClass.endTime) - nowMin);
      return {
        type: 'current',
        course: currentClass,
        remainMin,
        message: `正在上課：${currentClass.name}（距離下課還有 ${remainMin} 分鐘）`,
      };
    }

    const nextClass = todayCourses.find((c) => timeToMinutes(c.startTime) > nowMin);
    if (nextClass) {
      const waitMin = timeToMinutes(nextClass.startTime) - nowMin;
      return {
        type: 'upcoming',
        course: nextClass,
        waitMin,
        message: `下一節課：${nextClass.name}（${nextClass.startTime} 開始，教室：${nextClass.classroom || '未定'}）`,
      };
    }

    return { type: 'ended', message: '可樂管家提醒：今日課程已全部結束，下課愉快！☕️' };
  }, [todayCourses, now]);

  // 3. 今日待辦事項 (Today's Todos)
  const todayTodos = useMemo(() => {
    return todos.filter((t) => {
      if (t.dueDate && t.dueDate.slice(0, 10) === todayStr) return true;
      if (t.startDate && t.endDate && todayStr >= t.startDate && todayStr <= t.endDate) return true;
      return false;
    });
  }, [todos, todayStr]);

  // 4. 今日行事曆活動 (Today's Events)
  const todayEvents = useMemo(() => {
    return calendarEvents.filter((e) => todayStr >= e.startDate && todayStr <= e.endDate);
  }, [calendarEvents, todayStr]);

  // 5. 今日記帳交易 (Today's Transactions)
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.slice(0, 10) === todayStr);
  }, [transactions, todayStr]);

  // Budget calculations
  const spentPercent = Math.min(
    100,
    Math.round((budgetInfo.todaySpent / budgetInfo.effectiveLimit) * 100)
  );

  // 6. 重要日子 (Countdowns & Countups)
  const sortedCountdowns = useMemo(() => {
    let list = [...(countdowns || [])];
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
  }, [countdowns]);

  const displayedCountdowns = useMemo(() => {
    if (isAllCountdownsExpanded || sortedCountdowns.length <= 3) {
      return sortedCountdowns;
    }
    return sortedCountdowns.slice(0, 3);
  }, [sortedCountdowns, isAllCountdownsExpanded]);

  // 即將到期重要日子清單
  const upcomingCountdowns = useMemo(() => {
    if (!countdowns || countdowns.length === 0) return [];
    const today = new Date(new Date().toISOString().slice(0, 10));
    return countdowns.filter((item) => {
      if (item.mode === 'countup') return false;
      const target = new Date(item.targetDate);
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    });
  }, [countdowns]);

  // ==========================================================
  // 🧩 各板塊動態渲染器 (Section Renderers)
  // ==========================================================

  // 1. 即時上課狀態卡片
  const renderStatusSection = () => {
    const isCollapsed = Boolean(todaySectionsCollapsed['status']);

    if (isCollapsed) {
      return (
        <div
          key="status"
          onClick={() => toggleTodaySectionCollapsed('status')}
          className="p-3.5 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between cursor-pointer hover:border-calico-orange/30 transition-all select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
            <div
              className={`p-1.5 rounded-xl shrink-0 ${
                liveStatus.type === 'current'
                  ? 'bg-emerald-500 text-white animate-pulse'
                  : 'bg-calico-orange/15 text-calico-orange'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 truncate">
              {liveStatus.message}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-calico-cocoa/40 dark:text-zinc-400 shrink-0">
            <span className="text-[10px] font-bold">展開</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    return (
      <div
        key="status"
        className={`p-4 rounded-3xl border shadow-ios flex items-center justify-between transition-all ${
          liveStatus.type === 'current'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : liveStatus.type === 'upcoming'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-white/90 dark:bg-calico-darkCard border-black/5 dark:border-white/10'
        }`}
      >
        <div className="flex items-center space-x-3.5 min-w-0 flex-1 mr-2">
          <div
            className={`p-2.5 rounded-2xl shrink-0 ${
              liveStatus.type === 'current'
                ? 'bg-emerald-500 text-white animate-pulse'
                : liveStatus.type === 'upcoming'
                ? 'bg-amber-500 text-white'
                : 'bg-calico-cocoa/10 text-calico-cocoa dark:text-zinc-300'
            }`}
          >
            {liveStatus.type === 'current' ? (
              <Clock className="w-5 h-5" />
            ) : liveStatus.type === 'upcoming' ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <Coffee className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                liveStatus.type === 'current'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : liveStatus.type === 'upcoming'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400'
              }`}
            >
              {liveStatus.type === 'current'
                ? '🟢 上課中'
                : liveStatus.type === 'upcoming'
                ? '⏱️ 下一節課預告'
                : '☕ 今日課程概況'}
            </span>
            <p className="text-xs font-bold text-calico-cocoa dark:text-zinc-100 mt-1 truncate">
              {liveStatus.message}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab('schedule')}
            className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5"
          >
            <span>週課表</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toggleTodaySectionCollapsed('status')}
            className="p-1 rounded-xl text-calico-cocoa/40 dark:text-zinc-400 hover:text-calico-cocoa hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            title="收合板塊"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // 2. 伴讀番茄鐘專注捷徑
  const renderPomodoroSection = () => {
    const isCollapsed = Boolean(todaySectionsCollapsed['pomodoro']);

    if (isCollapsed) {
      return (
        <div
          key="pomodoro"
          onClick={() => toggleTodaySectionCollapsed('pomodoro')}
          className="p-3.5 rounded-2xl bg-white/90 dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between cursor-pointer hover:border-indigo-400/40 transition-all select-none"
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
              伴讀番茄鐘 · 專注衝刺
            </span>
          </div>
          <div className="flex items-center space-x-1 text-calico-cocoa/40 dark:text-zinc-400 shrink-0">
            <span className="text-[10px] font-bold">展開</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    return (
      <div
        key="pomodoro"
        className="p-3 rounded-2xl bg-white/90 dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios-sm flex items-center justify-between hover:border-indigo-400/40 transition-all"
      >
        <button
          type="button"
          onClick={() => setIsPomodoroOpen(true)}
          className="flex items-center space-x-3 flex-1 min-w-0 text-left active:scale-98 transition-all group"
        >
          <span className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 block truncate">
              伴讀番茄鐘
            </span>
            <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-medium block truncate">
              25 分鐘專注衝刺 · 隨選專注白噪音
            </span>
          </div>
        </button>

        <div className="flex items-center space-x-2 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setIsPomodoroOpen(true)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5 hover:underline"
          >
            <span>開啟專注</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toggleTodaySectionCollapsed('pomodoro')}
            className="p-1 rounded-xl text-calico-cocoa/40 dark:text-zinc-400 hover:text-calico-cocoa hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            title="收合板塊"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // 3. 重要日子
  const renderCountdownsSection = () => {
    if (!countdowns || countdowns.length === 0) return null;
    const isCollapsed = Boolean(todaySectionsCollapsed['countdowns']);

    if (isCollapsed) {
      return (
        <div
          key="countdowns"
          onClick={() => toggleTodaySectionCollapsed('countdowns')}
          className="p-3.5 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between cursor-pointer hover:border-amber-400/40 transition-all select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
            <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 truncate">
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                重要日子 ({countdowns.length})
              </span>
              {sortedCountdowns.length > 0 && (
                <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 truncate hidden sm:inline">
                  最近：{sortedCountdowns[0].title}
                </span>
              )}
              {upcomingCountdowns.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-600 shrink-0 animate-pulse">
                  {upcomingCountdowns.length} 個即將到期
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 text-calico-cocoa/40 dark:text-zinc-400 shrink-0">
            <span className="text-[10px] font-bold">展開</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    return (
      <div
        key="countdowns"
        className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
              重要日子
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0">
              {countdowns.length} 個事件
            </span>
            {upcomingCountdowns.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center space-x-1 whitespace-nowrap shrink-0 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{upcomingCountdowns.length} 個即將到期</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCountdownToEdit(null);
                setIsCountdownModalOpen(true);
              }}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-0.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增</span>
            </button>
            <span className="text-calico-cocoa/20">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5 whitespace-nowrap"
            >
              <span>查看行事曆</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleTodaySectionCollapsed('countdowns')}
              className="p-1 rounded-xl text-calico-cocoa/40 dark:text-zinc-400 hover:text-calico-cocoa hover:bg-black/5 dark:hover:bg-white/5 transition-all ml-1"
              title="收合板塊"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 垂直完整卡片排版 */}
        <div className="space-y-2.5">
          {displayedCountdowns.map((cd) => (
            <CountdownCard
              key={cd.id}
              item={cd}
              onEdit={(item) => {
                setCountdownToEdit(item);
                setIsCountdownModalOpen(true);
              }}
              onDelete={(id) => deleteCountdown(id)}
            />
          ))}
        </div>

        {sortedCountdowns.length > 3 && (
          <button
            type="button"
            onClick={() => setIsAllCountdownsExpanded(!isAllCountdownsExpanded)}
            className="w-full py-1.5 text-center text-xs font-bold text-calico-orange hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            {isAllCountdownsExpanded
              ? '收合其餘日子 ⌃'
              : `展開其餘 ${sortedCountdowns.length - 3} 個重要日子 ⌄`}
          </button>
        )}
      </div>
    );
  };

  // 4. 今日排定課表清單
  const renderCoursesSection = () => {
    const isCollapsed = Boolean(todaySectionsCollapsed['courses']);

    if (isCollapsed) {
      return (
        <div
          key="courses"
          onClick={() => toggleTodaySectionCollapsed('courses')}
          className="p-3.5 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between cursor-pointer hover:border-calico-orange/30 transition-all select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
            <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 truncate">
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                今日排定課表 ({todayCourses.length} 堂)
              </span>
              {todayCourses.length > 0 && (
                <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 truncate">
                  首堂 {todayCourses[0].startTime} {todayCourses[0].name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 text-calico-cocoa/40 dark:text-zinc-400 shrink-0">
            <span className="text-[10px] font-bold">展開</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    return (
      <div
        key="courses"
        className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              今日排定課表 ({todayCourses.length} 堂)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setCourseToEdit(null);
                setIsCourseModalOpen(true);
              }}
              className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>加課</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTodaySectionCollapsed('courses')}
              className="p-1 rounded-xl text-calico-cocoa/40 dark:text-zinc-400 hover:text-calico-cocoa hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="收合板塊"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {todayCourses.length > 0 ? (
          <div className="space-y-2">
            {todayCourses.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setCourseToEdit(c);
                  setIsCourseModalOpen(true);
                }}
                className="p-3 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 hover:border-calico-orange/30 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                  <div
                    className="w-2.5 h-9 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: c.colorHex }}
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100 truncate">
                      {c.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-[10px] text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 font-medium truncate">
                      {c.classroom && (
                        <span className="flex items-center space-x-0.5 truncate">
                          <MapPin className="w-3 h-3 text-calico-orange shrink-0" />
                          <span className="truncate">{c.classroom}</span>
                        </span>
                      )}
                      {c.instructor && (
                        <span className="flex items-center space-x-0.5 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.instructor}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    style={{ color: c.colorHex }}
                    className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 whitespace-nowrap"
                  >
                    {c.startTime} - {c.endTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold space-y-1">
            <Coffee className="w-6 h-6 text-calico-cocoa/30 mx-auto" />
            <p>今天沒有課，享受自由學習或放鬆時光！</p>
          </div>
        )}
      </div>
    );
  };

  // 5. 今日待辦事項
  const renderTodosSection = () => {
    const isCollapsed = Boolean(todaySectionsCollapsed['todos']);
    const uncompletedCount = todayTodos.filter((t) => !t.isCompleted).length;

    if (isCollapsed) {
      return (
        <div
          key="todos"
          onClick={() => toggleTodaySectionCollapsed('todos')}
          className="p-3.5 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between cursor-pointer hover:border-calico-sage/40 transition-all select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
            <div className="p-1.5 rounded-xl bg-calico-sage/15 text-calico-sage shrink-0">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 truncate">
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                今日焦點待辦 ({uncompletedCount} 項未完成)
              </span>
              {uncompletedCount === 0 && todayTodos.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold shrink-0">
                  全數完成 🎉
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 text-calico-cocoa/40 dark:text-zinc-400 shrink-0">
            <span className="text-[10px] font-bold">展開</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    return (
      <div
        key="todos"
        className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-calico-sage/15 text-calico-sage">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              今日待辦事項 ({todayTodos.length} 項)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setTodoToEdit(null);
                setIsTodoModalOpen(true);
              }}
              className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>加待辦</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTodaySectionCollapsed('todos')}
              className="p-1 rounded-xl text-calico-cocoa/40 dark:text-zinc-400 hover:text-calico-cocoa hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="收合板塊"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {todayTodos.length > 0 ? (
          <div className="space-y-2">
            {todayTodos.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 flex items-center justify-between transition-all hover:bg-calico-orange/5"
              >
                <div
                  onClick={() => toggleTodo(t.id)}
                  className="flex items-center space-x-2.5 flex-1 min-w-0 cursor-pointer"
                >
                  {t.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-calico-cocoa/30 dark:text-zinc-500 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-bold truncate ${
                      t.isCompleted
                        ? 'line-through text-calico-cocoa/40 dark:text-zinc-500'
                        : 'text-calico-cocoa dark:text-zinc-100'
                    }`}
                  >
                    {t.title}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold whitespace-nowrap">
                    {t.category}
                  </span>
                  {t.priority === 'high' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-600 font-bold whitespace-nowrap">
                      高急
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold space-y-1">
            <CheckCircle2 className="w-6 h-6 text-calico-sage/40 mx-auto" />
            <p>太棒了！今天沒有任何未完成待辦！</p>
          </div>
        )}
      </div>
    );
  };

  // 6. 今日活動與跨日行程
  const renderEventsSection = () => {
    if (todayEvents.length === 0) return null;
    const isCollapsed = Boolean(todaySectionsCollapsed['events']);

    if (isCollapsed) {
      return (
        <div
          key="events"
          onClick={() => toggleTodaySectionCollapsed('events')}
          className="p-3.5 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between cursor-pointer hover:border-blue-400/40 transition-all select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
            <div className="p-1.5 rounded-xl bg-blue-500/15 text-blue-600 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 truncate">
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                今日進行中活動 ({todayEvents.length} 項)
              </span>
              <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 truncate">
                {todayEvents[0].title}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-calico-cocoa/40 dark:text-zinc-400 shrink-0">
            <span className="text-[10px] font-bold">展開</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    return (
      <div
        key="events"
        className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              今日進行中活動 ({todayEvents.length} 項)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('calendar')}
              className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5"
            >
              <span>月曆</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleTodaySectionCollapsed('events')}
              className="p-1 rounded-xl text-calico-cocoa/40 dark:text-zinc-400 hover:text-calico-cocoa hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="收合板塊"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {todayEvents.map((e) => (
            <div
              key={e.id}
              style={{ borderLeftColor: e.colorHex }}
              className="p-3 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 border-l-4 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1 mr-2">
                <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100 truncate">
                  {e.title}
                </h4>
                <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 font-medium mt-0.5 truncate">
                  {e.startDate} ~ {e.endDate} {e.notes ? `· ${e.notes}` : ''}
                </p>
              </div>
              <span
                style={{ color: e.colorHex }}
                className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-bold shrink-0 whitespace-nowrap"
              >
                {e.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 7. 今日收支記帳與花費總覽
  const renderAccountingSection = () => {
    const isCollapsed = Boolean(todaySectionsCollapsed['accounting']);

    if (isCollapsed) {
      return (
        <div
          key="accounting"
          onClick={() => toggleTodaySectionCollapsed('accounting')}
          className="p-3.5 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between cursor-pointer hover:border-calico-orange/30 transition-all select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
            <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 truncate">
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                今日已花費 ${budgetInfo.todaySpent}
              </span>
              <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-bold truncate">
                (剩餘額度 ${Math.max(0, budgetInfo.remaining)})
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-calico-cocoa/40 dark:text-zinc-400 shrink-0">
            <span className="text-[10px] font-bold">展開</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    return (
      <div
        key="accounting"
        className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-4 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                今日記帳花費總覽
              </h3>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-medium">
                每日限額 ${budgetInfo.effectiveLimit} · 剩餘額度 ${Math.max(0, budgetInfo.remaining)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('accounting')}
              className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5"
            >
              <span>明細</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleTodaySectionCollapsed('accounting')}
              className="p-1 rounded-xl text-calico-cocoa/40 dark:text-zinc-400 hover:text-calico-cocoa hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="收合板塊"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-calico-cocoa dark:text-zinc-200">
              今日已花費 ${budgetInfo.todaySpent}
            </span>
            <span
              className={spentPercent > 90 ? 'text-rose-500' : 'text-calico-orange font-mono'}
            >
              {spentPercent}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              style={{ width: `${spentPercent}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                spentPercent > 90
                  ? 'bg-rose-500'
                  : spentPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-calico-orange'
              }`}
            />
          </div>
        </div>

        {/* Today Transactions List */}
        {todayTransactions.length > 0 ? (
          <div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/5">
            {todayTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                  <div
                    style={{
                      backgroundColor: `${tx.categoryColorHex || '#E67E22'}25`,
                      color: tx.categoryColorHex || '#E67E22',
                    }}
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                  >
                    <CategoryIcon icon={tx.categoryIcon} categoryName={tx.categoryName} className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-calico-cocoa dark:text-zinc-100 truncate">
                      {tx.categoryName} {tx.notes ? `(${tx.notes})` : ''}
                    </p>
                    <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 truncate">
                      {tx.paymentMethodName || '現金'} · {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-mono font-black whitespace-nowrap ${
                      tx.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {tx.type === 'expense' ? `-$${tx.amount}` : `+$${tx.amount}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold">
            今日尚未記錄支出，點擊右上角「記一筆」快速登記！🌱
          </div>
        )}
      </div>
    );
  };

  // Section Dispatcher
  const renderSectionById = (id: TodaySectionId) => {
    if (todaySectionsHidden[id]) return null;
    switch (id) {
      case 'status':
        return renderStatusSection();
      case 'pomodoro':
        return renderPomodoroSection();
      case 'countdowns':
        return renderCountdownsSection();
      case 'courses':
        return renderCoursesSection();
      case 'todos':
        return renderTodosSection();
      case 'events':
        return renderEventsSection();
      case 'accounting':
        return renderAccountingSection();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      {/* ======================================================== */}
      {/* ☀️ Top Hero Card: 今日總覽與問候 */}
      {/* ======================================================== */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-calico-orange/20 via-calico-cream to-amber-100/40 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800/80 border border-calico-orange/30 shadow-ios relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center space-x-1.5 text-calico-orange text-xs font-black uppercase tracking-wider mb-0.5">
              <Sun className="w-4 h-4" />
              <span>今日重點 · 可樂管家隨行</span>
            </div>
            <h2 className="text-xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
              {formattedDate}
            </h2>
            <p className="text-xs text-calico-cocoa/70 dark:text-zinc-400 font-bold mt-1">
              今日課表 {todayCourses.length} 堂 · 待辦 {todayTodos.filter((t) => !t.isCompleted).length} 項未完成 · 今日花費 ${budgetInfo.todaySpent}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* ⚙️ 自訂排版順序按鈕 */}
            <button
              type="button"
              onClick={() => setIsLayoutModalOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-white/80 dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-200 font-bold text-xs shadow-2xs hover:bg-white active:scale-95 transition-all flex items-center space-x-1 border border-black/5 dark:border-white/10"
              title="自訂首頁板塊排列與顯示"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-calico-orange stroke-[2.2]" />
              <span className="hidden sm:inline">自訂排列</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTxModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-calico-orange text-white font-black text-xs shadow-ios hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>記一筆</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🧩 自由排序板塊列表 (Dynamically Reordered Sections) */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {todaySectionsOrder.map((sectionId) => renderSectionById(sectionId))}
      </div>

      {/* ======================================================== */}
      {/* Modals */}
      {/* ======================================================== */}
      <CourseModal
        isOpen={isCourseModalOpen}
        course={courseToEdit}
        defaultDay={todayDayOfWeek}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={(saved) => {
          if (courseToEdit) updateCourse(saved);
          else addCourse(saved);
        }}
        onDelete={deleteCourse}
      />

      <TodoModal
        isOpen={isTodoModalOpen}
        todo={todoToEdit}
        onClose={() => setIsTodoModalOpen(false)}
        onSave={(saved) => {
          if (todoToEdit) updateTodo(saved);
          else addTodo(saved);
        }}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={addTransaction}
      />

      {/* ⏳ 重要日子新增/編輯 Modal */}
      <CountdownModal
        isOpen={isCountdownModalOpen}
        onClose={() => {
          setIsCountdownModalOpen(false);
          setCountdownToEdit(null);
        }}
        countdownToEdit={countdownToEdit}
      />

      {/* ⚙️ 首頁板塊排版設定 Modal */}
      <TodayLayoutModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
      />
    </div>
  );
};
