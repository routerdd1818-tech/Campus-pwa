import React, { useState, useMemo } from 'react';
import {
  useApp,
  deduplicateCalendarEvents,
  deduplicateTodos,
  deduplicateCourses,
} from '../context/AppContext';
import { CalendarEvent, DayOfWeek, Todo, Course, CountdownItem } from '../types';
import { EventModal } from '../components/EventModal';
import { ShareModal } from '../components/ShareModal';
import { TodoModal } from '../components/TodoModal';
import { CountdownModal } from '../components/CountdownModal';
import { CountdownCard } from '../components/CountdownCard';
import { fetchSharedScheduleByCode } from '../services/supabase';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  BookOpen,
  CheckSquare,
  CalendarDays,
  Tag,
  RefreshCw,
  UserPlus,
  MapPin,
  Sparkles,
} from 'lucide-react';

const WEEKDAYS_HEADER = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_FULL = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

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
    calendarEvents,
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
    savedFriends,
    saveFriendRecord,
    settings,
    currentUser,
    countdowns,
    deleteCountdown,
    upcomingCountdownsCount,
  } = useApp();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const myShareCode = (currentUser?.shareCode || settings.shareCode || '').toUpperCase();

  // ⏳ 重要日子狀態
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [countdownToEdit, setCountdownToEdit] = useState<CountdownItem | null>(null);
  const [countdownFilter, setCountdownFilter] = useState<'all' | 'countdown' | 'countup'>('all');

  const filteredCountdowns = useMemo(() => {
    let list = [...(countdowns || [])];
    if (countdownFilter === 'countdown') {
      list = list.filter((c) => (c.mode || 'countdown') === 'countdown');
    } else if (countdownFilter === 'countup') {
      list = list.filter((c) => c.mode === 'countup');
    }
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
  }, [countdowns, countdownFilter]);

  // 行事曆顯示來源（個人 vs 共同）
  const [showMineCalendar, setShowMineCalendar] = useState<boolean>(true);
  const [showSharedCalendar, setShowSharedCalendar] = useState<boolean>(false);
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number>(0);
  const [isRefreshingShared, setIsRefreshingShared] = useState<boolean>(false);

  const activeFriend = savedFriends[selectedFriendIndex] || savedFriends[0];
  const friendSchedule = activeFriend?.cachedSchedule;
  const isViewingSelfAsFriend = Boolean(
    activeFriend && activeFriend.shareCode && activeFriend.shareCode.toUpperCase() === myShareCode
  );

  const handleRefreshSharedCalendar = async () => {
    if (!activeFriend) return;
    setIsRefreshingShared(true);
    try {
      const latest = await fetchSharedScheduleByCode(activeFriend.shareCode);
      if (latest) {
        saveFriendRecord({
          ...activeFriend,
          lastViewedAt: new Date().toISOString(),
          cachedSchedule: latest,
        });
      }
    } finally {
      setIsRefreshingShared(false);
    }
  };

  // 合併後的行事曆事件、待辦與課表
  const displayedCalendarEvents = useMemo(() => {
    let list: CalendarEvent[] = [];
    if (showMineCalendar) {
      list = list.concat(calendarEvents);
    }
    if (showSharedCalendar && !isViewingSelfAsFriend) {
      const friendEvents: CalendarEvent[] = (friendSchedule?.calendarEventsData || []).map((e) => ({
        ...e,
        userId: activeFriend?.shareCode,
        isSharedWithFriends: true,
      }));
      list = list.concat(friendEvents);
    }
    return deduplicateCalendarEvents(list);
  }, [showMineCalendar, showSharedCalendar, isViewingSelfAsFriend, calendarEvents, friendSchedule, activeFriend]);

  const displayedTodos = useMemo(() => {
    let list: Todo[] = [];
    if (showMineCalendar) {
      list = list.concat(todos);
    }
    if (showSharedCalendar) {
      if (!showMineCalendar) {
        list = list.concat(todos.filter((t) => t.isSharedToCalendar));
      }
      if (!isViewingSelfAsFriend) {
        const friendTodos: Todo[] = (friendSchedule?.todosData || [])
          .filter((t) => t.isSharedToCalendar || (t as any).isSharedWithFriends !== false)
          .map((t) => ({
            ...t,
            userId: activeFriend?.shareCode,
          }));
        list = list.concat(friendTodos);
      }
    }
    return deduplicateTodos(list);
  }, [showMineCalendar, showSharedCalendar, isViewingSelfAsFriend, todos, friendSchedule, activeFriend]);

  const displayedCourses = useMemo(() => {
    let list: Course[] = [];
    if (showMineCalendar) {
      list = list.concat(courses);
    }
    if (showSharedCalendar && !isViewingSelfAsFriend) {
      const friendCourses = (friendSchedule?.coursesData || []).map((c) => ({
        ...c,
        userId: activeFriend?.shareCode,
      }));
      list = list.concat(friendCourses);
    }
    return deduplicateCourses(list);
  }, [showMineCalendar, showSharedCalendar, isViewingSelfAsFriend, courses, friendSchedule, activeFriend]);

  // 視圖模式：月曆 vs 本週日程
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 計算月曆網格（補齊首尾週共 35 或 42 格）
  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dateStr: `${prevYear}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({
        dateStr: `${year}-${mStr}-${dStr}`,
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const mStr = String(nextMonth + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({
        dateStr: `${nextYear}-${mStr}-${dStr}`,
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // 計算當週 7 日
  const currentWeekDays = useMemo(() => {
    const sel = new Date(selectedDateStr);
    const dayOfWeek = sel.getDay();
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
        weekdayName: WEEKDAYS_FULL[i],
        dayOfWeekNum: i === 0 ? 7 : i,
      });
    }
    return weekDays;
  }, [selectedDateStr]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleGoToday = () => {
    setCurrentDate(new Date());
    setSelectedDateStr(todayStr);
  };

  // 取得指定日期的所有排程（活動 + 區間待辦）
  const getAllSpanItemsForDate = (dateStr: string): UnifiedSpanItem[] => {
    const eventItems: UnifiedSpanItem[] = displayedCalendarEvents
      .filter((e) => dateStr >= e.startDate && dateStr <= (e.endDate || e.startDate))
      .map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate || e.startDate,
        colorHex: e.colorHex || '#E67E22',
        category: e.category,
        isAllDay: e.isAllDay,
        notes: e.notes,
        type: 'event',
      }));

    const periodTodoItems: UnifiedSpanItem[] = displayedTodos
      .filter((t) => t.startDate && t.endDate && dateStr >= t.startDate && dateStr <= t.endDate)
      .map((t) => ({
        id: t.id,
        title: t.title,
        startDate: t.startDate!,
        endDate: t.endDate!,
        colorHex: t.colorHex || '#48BB78',
        category: t.category,
        isAllDay: true,
        notes: t.notes,
        type: 'todo',
        isCompleted: t.isCompleted,
      }));

    return [...eventItems, ...periodTodoItems];
  };

  // 選中日期的各項排程資料
  const selectedDateEvents = useMemo(
    () => getAllSpanItemsForDate(selectedDateStr).filter((i) => i.type === 'event'),
    [selectedDateStr, displayedCalendarEvents, displayedTodos]
  );

  const selectedDateCourses = useMemo(() => {
    const sel = new Date(selectedDateStr);
    const dayOfWeek = (sel.getDay() === 0 ? 7 : sel.getDay()) as DayOfWeek;
    return displayedCourses
      .filter((c) => c.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDateStr, displayedCourses]);

  const selectedDateTodos = useMemo(() => {
    return displayedTodos.filter((t) => {
      if (t.dueDate && t.dueDate.slice(0, 10) === selectedDateStr) return true;
      if (t.startDate && t.endDate && selectedDateStr >= t.startDate && selectedDateStr <= t.endDate) return true;
      return false;
    });
  }, [selectedDateStr, displayedTodos]);

  const selectedDateCountdowns = useMemo(() => {
    return (countdowns || []).filter((cd) => cd.targetDate === selectedDateStr);
  }, [countdowns, selectedDateStr]);

  const selectedDateFormatted = useMemo(() => {
    const d = new Date(selectedDateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS_FULL[d.getDay()]}`;
  }, [selectedDateStr]);

  const isViewingCurrentMonthAndToday =
    year === now.getFullYear() && month === now.getMonth() && selectedDateStr === todayStr;

  return (
    <div className="space-y-3.5 pb-28 animate-fade-in">
      {/* ======================================================== */}
      {/* 1. 頂部控制列：視圖切換 + 來源膠囊 + 快速新增 */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between gap-2">
        {/* 月曆 vs 本週日程 */}
        <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setCalendarMode('month')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              calendarMode === 'month'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            月曆
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode('week')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              calendarMode === 'week'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            週日程
          </button>
        </div>

        {/* 右側快速動作 */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsTodoModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-calico-sage text-white font-bold text-xs shadow-2xs active:scale-95 transition-all hover:brightness-105 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>加待辦</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-calico-orange text-white font-bold text-xs shadow-2xs active:scale-95 transition-all hover:brightness-105 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>新行程</span>
          </button>
        </div>
      </div>

      {/* 精簡來源切換膠囊列（僅個人 / 共同 / 合併 + 好友選擇） */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none py-0.5">
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowMineCalendar(true);
              setShowSharedCalendar(false);
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
              showMineCalendar && !showSharedCalendar
                ? 'bg-calico-cocoa text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                : 'bg-white/80 dark:bg-zinc-800/80 text-calico-cocoa/60 dark:text-zinc-400 border border-black/5 dark:border-white/5'
            }`}
          >
            我的行事曆
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMineCalendar(true);
              setShowSharedCalendar(true);
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
              showMineCalendar && showSharedCalendar
                ? 'bg-calico-cocoa text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                : 'bg-white/80 dark:bg-zinc-800/80 text-calico-cocoa/60 dark:text-zinc-400 border border-black/5 dark:border-white/5'
            }`}
          >
            + 好友共同
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMineCalendar(false);
              setShowSharedCalendar(true);
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
              !showMineCalendar && showSharedCalendar
                ? 'bg-calico-cocoa text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                : 'bg-white/80 dark:bg-zinc-800/80 text-calico-cocoa/60 dark:text-zinc-400 border border-black/5 dark:border-white/5'
            }`}
          >
            僅看好友
          </button>
        </div>

        {/* 圖例說明 */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-calico-orange" />
            <span>活動</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-calico-sage" />
            <span>待辦</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>課堂</span>
          </span>
        </div>
      </div>

      {/* 共同行事曆好友快速切換條 */}
      {showSharedCalendar && (
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none animate-fade-in">
          {savedFriends.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>尚未加入共享好友，點擊輸入分享碼</span>
            </button>
          ) : (
            <>
              {savedFriends.map((f, idx) => (
                <button
                  type="button"
                  key={f.shareCode}
                  onClick={() => setSelectedFriendIndex(idx)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                    selectedFriendIndex === idx
                      ? 'bg-indigo-600 text-white shadow-2xs font-black'
                      : 'bg-white dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-300 border border-black/5 dark:border-white/10'
                  }`}
                >
                  {f.nickname || f.ownerName}
                </button>
              ))}
              <button
                type="button"
                onClick={handleRefreshSharedCalendar}
                disabled={isRefreshingShared}
                className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-calico-cocoa/60 hover:text-calico-orange shrink-0"
                title="重新整理好友行程"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingShared ? 'animate-spin text-calico-orange' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-dashed border-black/15 dark:border-white/15 text-calico-cocoa/50 hover:text-calico-orange shrink-0"
                title="管理或新增好友"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. 簡約高可讀性月曆 (Minimalist Scannable Month Grid) */}
      {/* ======================================================== */}
      {calendarMode === 'month' && (
        <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
          {/* 月份導覽列 */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline space-x-2 tabular-nums">
              <h3 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {year} 年 {month + 1} 月
              </h3>
            </div>

            <div className="flex items-center space-x-1">
              {!isViewingCurrentMonthAndToday && (
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="px-2.5 py-1 rounded-xl bg-calico-orange/12 text-calico-orange text-xs font-black hover:bg-calico-orange/20 active:scale-95 transition-all mr-1"
                >
                  回今天
                </button>
              )}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-calico-cream/80 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange active:scale-95 transition-all"
                title="上個月"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-calico-cream/80 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange active:scale-95 transition-all"
                title="下個月"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 星期標題 */}
          <div className="grid grid-cols-7 gap-1 text-center pt-1">
            {WEEKDAYS_HEADER.map((w, idx) => (
              <div
                key={w}
                className={`text-[11px] font-black py-1 ${
                  idx === 0
                    ? 'text-rose-500/80 dark:text-rose-400'
                    : idx === 6
                    ? 'text-sky-500/80 dark:text-sky-400'
                    : 'text-calico-cocoa/45 dark:text-zinc-500'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 簡約日期格（清楚顯示活動膠囊條 + 待辦 + 課堂指示點） */}
          <div className="grid grid-cols-7 gap-1">
            {monthGridDays.map((cell, idx) => {
              const colIdx = idx % 7;
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;

              const cellDate = new Date(cell.dateStr);
              const cellDow = (cellDate.getDay() === 0 ? 7 : cellDate.getDay()) as DayOfWeek;

              const dayEvents = displayedCalendarEvents.filter(
                (e) => cell.dateStr >= e.startDate && cell.dateStr <= (e.endDate || e.startDate)
              );
              const dayTodos = displayedTodos.filter(
                (t) =>
                  !t.isCompleted &&
                  ((t.dueDate && t.dueDate.slice(0, 10) === cell.dateStr) ||
                    (t.startDate && t.endDate && cell.dateStr >= t.startDate && cell.dateStr <= t.endDate))
              );
              const dayCourses = displayedCourses.filter((c) => c.dayOfWeek === cellDow);
              const dayCountdowns = (countdowns || []).filter((cd) => cd.targetDate === cell.dateStr);

              // 合併成格子內最多 2 個精簡排程條，讓每格乾淨又看得見標題
              const previewChips: { id: string; label: string; color: string }[] = [];
              dayCountdowns.forEach((cd) =>
                previewChips.push({ id: `cd_${cd.id}`, label: cd.title, color: cd.colorHex || '#F59E0B' })
              );
              dayEvents.forEach((ev) =>
                previewChips.push({ id: `ev_${ev.id}`, label: ev.title, color: ev.colorHex || '#E67E22' })
              );
              dayTodos.forEach((td) =>
                previewChips.push({ id: `td_${td.id}`, label: td.title, color: td.colorHex || '#48BB78' })
              );

              const visibleChips = previewChips.slice(0, 2);
              const extraCount = previewChips.length - visibleChips.length;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[68px] sm:min-h-[78px] p-1 rounded-2xl flex flex-col items-stretch justify-between text-left transition-all relative ${
                    isSelected
                      ? 'bg-calico-orange/12 ring-2 ring-calico-orange shadow-2xs'
                      : isToday
                      ? 'bg-amber-50/80 dark:bg-amber-950/20'
                      : cell.isCurrentMonth
                      ? 'bg-calico-cream/40 dark:bg-zinc-800/35 hover:bg-calico-orange/5'
                      : 'opacity-35 hover:opacity-60'
                  }`}
                >
                  {/* 上排：日期數字 + 課堂點點 */}
                  <div className="flex items-center justify-between w-full px-0.5">
                    <span
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-black tabular-nums ${
                        isToday
                          ? 'bg-calico-orange text-white shadow-2xs'
                          : colIdx === 0
                          ? 'text-rose-500 dark:text-rose-400'
                          : colIdx === 6
                          ? 'text-sky-500 dark:text-sky-400'
                          : 'text-calico-cocoa dark:text-zinc-200'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {dayCourses.length > 0 && cell.isCurrentMonth && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                        title={`${dayCourses.length} 堂課`}
                      />
                    )}
                  </div>

                  {/* 中下排：精簡排程標題標籤 */}
                  <div className="w-full space-y-0.5 mt-1">
                    {visibleChips.map((chip) => (
                      <div
                        key={chip.id}
                        style={{
                          backgroundColor: `${chip.color}20`,
                          color: chip.color,
                        }}
                        className="w-full px-1 py-[1px] rounded text-[8.5px] font-black truncate leading-tight"
                      >
                        {chip.label}
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <div className="text-[8px] font-black text-calico-cocoa/50 dark:text-zinc-400 px-0.5 leading-none tabular-nums">
                        +{extraCount} 項
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. 本週日程時間軸視圖 (Clean 7-Day Timeline Overview) */}
      {/* ======================================================== */}
      {calendarMode === 'week' && (
        <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-2.5">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-calico-orange" />
              <span>本週完整排程</span>
            </h3>
            <span className="text-[11px] font-mono font-bold text-calico-cocoa/50 dark:text-zinc-400 tabular-nums">
              {currentWeekDays[0]?.dateStr.slice(5)} ~ {currentWeekDays[6]?.dateStr.slice(5)}
            </span>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/5">
            {currentWeekDays.map((w) => {
              const isSelected = w.dateStr === selectedDateStr;
              const isToday = w.dateStr === todayStr;

              const dayEvents = getAllSpanItemsForDate(w.dateStr);
              const dayCourses = displayedCourses
                .filter((c) => c.dayOfWeek === w.dayOfWeekNum)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              const dayTodos = displayedTodos.filter(
                (t) => t.dueDate && t.dueDate.slice(0, 10) === w.dateStr
              );
              const dayCountdowns = (countdowns || []).filter((cd) => cd.targetDate === w.dateStr);

              const hasAny =
                dayEvents.length > 0 ||
                dayCourses.length > 0 ||
                dayTodos.length > 0 ||
                dayCountdowns.length > 0;

              return (
                <div
                  key={w.dateStr}
                  onClick={() => setSelectedDateStr(w.dateStr)}
                  className={`py-3 px-2 rounded-2xl flex items-start gap-3 cursor-pointer transition-all ${
                    isSelected ? 'bg-calico-orange/8' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  {/* 左側日期塊 */}
                  <div className="w-12 shrink-0 text-center pt-0.5 tabular-nums">
                    <span
                      className={`text-[10px] font-black block ${
                        w.dayOfWeekNum === 7
                          ? 'text-rose-500'
                          : w.dayOfWeekNum === 6
                          ? 'text-sky-500'
                          : 'text-calico-cocoa/50 dark:text-zinc-400'
                      }`}
                    >
                      {w.weekdayName}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black mt-0.5 ${
                        isToday
                          ? 'bg-calico-orange text-white shadow-2xs'
                          : isSelected
                          ? 'bg-calico-cocoa text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'text-calico-cocoa dark:text-zinc-100'
                      }`}
                    >
                      {w.dayNum}
                    </span>
                  </div>

                  {/* 右側排程清單 */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {!hasAny ? (
                      <p className="text-[11px] text-calico-cocoa/35 dark:text-zinc-600 font-bold py-2">
                        無排定行程
                      </p>
                    ) : (
                      <>
                        {dayCountdowns.map((cd) => (
                          <div
                            key={cd.id}
                            className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-black flex items-center justify-between"
                          >
                            <span className="truncate">🎯 {cd.title}</span>
                            <span className="text-[10px] shrink-0 ml-2">重要日子</span>
                          </div>
                        ))}
                        {dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              backgroundColor: `${ev.colorHex}15`,
                              borderLeftColor: ev.colorHex,
                            }}
                            className="px-2.5 py-1.5 rounded-xl border-l-3 text-xs font-black text-calico-cocoa dark:text-zinc-100 flex items-center justify-between"
                          >
                            <span className="truncate">{ev.title}</span>
                            <span className="text-[10px] opacity-60 shrink-0 ml-2">{ev.category}</span>
                          </div>
                        ))}
                        {dayCourses.map((c) => (
                          <div
                            key={c.id}
                            className="px-2.5 py-1 rounded-xl bg-calico-cream/70 dark:bg-zinc-800/70 text-xs flex items-center justify-between"
                          >
                            <span className="font-bold text-calico-cocoa dark:text-zinc-200 truncate">
                              {c.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-calico-cocoa/60 dark:text-zinc-400 shrink-0 ml-2 tabular-nums">
                              {c.startTime}-{c.endTime}
                            </span>
                          </div>
                        ))}
                        {dayTodos.map((t) => (
                          <div
                            key={t.id}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-xs flex items-center gap-1.5"
                          >
                            {t.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-calico-sage shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-calico-sage/60 shrink-0" />
                            )}
                            <span
                              className={`font-bold truncate ${
                                t.isCompleted ? 'line-through opacity-50' : 'text-calico-cocoa dark:text-zinc-200'
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. 選取日期的清晰排程時間軸 (Selected Date Agenda) */}
      {/* ======================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 tabular-nums">
                {selectedDateFormatted}
              </h4>
              {selectedDateStr === todayStr && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-calico-orange text-white">
                  今天
                </span>
              )}
            </div>
            <p className="text-[11px] text-calico-cocoa/55 dark:text-zinc-400 mt-0.5 tabular-nums">
              {selectedDateEvents.length} 活動 · {selectedDateCourses.length} 堂課 · {selectedDateTodos.length} 待辦
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-calico-orange/12 text-calico-orange text-xs font-black flex items-center space-x-1 hover:bg-calico-orange hover:text-white active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>新增行程</span>
          </button>
        </div>

        {/* 當日命中的重要日子 */}
        {selectedDateCountdowns.length > 0 && (
          <div className="space-y-1.5">
            {selectedDateCountdowns.map((cd) => (
              <div
                key={cd.id}
                onClick={() => {
                  setCountdownToEdit(cd);
                  setIsCountdownModalOpen(true);
                }}
                className="p-3 rounded-2xl bg-amber-500/12 border border-amber-500/30 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200 truncate">
                    {cd.title}
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
                  {cd.mode === 'countup' ? '紀念起始日' : '目標日 D-Day'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 活動 / 跨日行程 */}
        {selectedDateEvents.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-calico-cocoa/50 dark:text-zinc-400 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-calico-orange" />
              <span>活動與區間行程</span>
            </span>
            {selectedDateEvents.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  const found = calendarEvents.find((e) => e.id === item.id);
                  if (found) {
                    setEventToEdit(found);
                    setIsEventModalOpen(true);
                  }
                }}
                style={{ borderLeftColor: item.colorHex }}
                className="p-3 rounded-2xl bg-calico-cream/55 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 border-l-4 flex items-center justify-between cursor-pointer hover:border-calico-orange/40 transition-all"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 truncate">
                      {item.title}
                    </span>
                    <span
                      style={{ color: item.colorHex }}
                      className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/10 font-bold shrink-0"
                    >
                      {item.category}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                      {item.notes}
                    </p>
                  )}
                </div>
                <span className="text-[11px] font-mono text-calico-cocoa/70 dark:text-zinc-300 font-bold tabular-nums shrink-0">
                  {item.startDate === item.endDate
                    ? '全天'
                    : `${item.startDate.slice(5)} ~ ${item.endDate.slice(5)}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 當日課表時段 */}
        {selectedDateCourses.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-calico-cocoa/50 dark:text-zinc-400 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-calico-orange" />
              <span>當日課表</span>
            </span>
            <div className="space-y-1.5">
              {selectedDateCourses.map((c) => (
                <div
                  key={c.id}
                  style={{ borderLeftColor: c.colorHex }}
                  className="p-2.5 px-3 rounded-2xl bg-calico-cream/55 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 border-l-4 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-black text-calico-cocoa dark:text-zinc-100 truncate">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-calico-orange shrink-0" />
                      <span>{c.classroom || '未定教室'} · {c.instructor || '教師'}</span>
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-calico-cocoa/80 dark:text-zinc-200 tabular-nums shrink-0">
                    {c.startTime} - {c.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 當日待辦任務 */}
        {selectedDateTodos.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-calico-cocoa/50 dark:text-zinc-400 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-calico-sage" />
              <span>當日待辦</span>
            </span>
            <div className="space-y-1.5">
              {selectedDateTodos.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTodo(t.id)}
                  className="p-2.5 px-3 rounded-2xl bg-calico-cream/55 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-calico-sage/40 transition-all"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {t.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-calico-cocoa/30 shrink-0" />
                    )}
                    <span
                      className={`truncate font-bold ${
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

        {/* 空狀態 */}
        {selectedDateCountdowns.length === 0 &&
          selectedDateEvents.length === 0 &&
          selectedDateCourses.length === 0 &&
          selectedDateTodos.length === 0 && (
            <div className="text-center py-8 rounded-2xl bg-calico-cream/35 dark:bg-zinc-800/25 border border-dashed border-black/10 dark:border-white/10">
              <p className="text-xs font-bold text-calico-cocoa/50 dark:text-zinc-400">
                這天沒有排定課程、活動或待辦，輕鬆自由安排！
              </p>
            </div>
          )}
      </div>

      {/* ======================================================== */}
      {/* 5. 重要日子（倒數日 & 持續紀念日）專區 */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
              重要日子
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0 tabular-nums">
              {filteredCountdowns.length} 個事件
            </span>
            {upcomingCountdownsCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center space-x-1 whitespace-nowrap shrink-0 animate-pulse tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{upcomingCountdownsCount} 個即將到期</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCountdownFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  countdownFilter === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-2xs font-black'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setCountdownFilter('countdown')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  countdownFilter === 'countdown'
                    ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-2xs font-black'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                倒數日
              </button>
              <button
                type="button"
                onClick={() => setCountdownFilter('countup')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  countdownFilter === 'countup'
                    ? 'bg-white dark:bg-zinc-800 text-pink-600 dark:text-pink-400 shadow-2xs font-black'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                持續日
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCountdownToEdit(null);
                setIsCountdownModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增日子</span>
            </button>
          </div>
        </div>

        {filteredCountdowns.length === 0 ? (
          <div className="py-6 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            目前無符合條件的重要日子，點擊上方「新增日子」建立倒數或持續紀念！
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredCountdowns.map((cd) => (
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
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. Modals */}
      {/* ======================================================== */}
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

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

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

      <CountdownModal
        isOpen={isCountdownModalOpen}
        onClose={() => {
          setIsCountdownModalOpen(false);
          setCountdownToEdit(null);
        }}
        countdownToEdit={countdownToEdit}
      />
    </div>
  );
};
