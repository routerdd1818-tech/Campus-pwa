import React, { useState, useMemo } from 'react';
import {
  useApp,
  deduplicateCalendarEvents,
  deduplicateTodos,
  deduplicateCourses,
} from '../context/AppContext';
import { CalendarEvent, DayOfWeek, Todo, Course, Transaction, CountdownItem } from '../types';
import { EventModal } from '../components/EventModal';
import { ShareModal } from '../components/ShareModal';
import { TodoModal } from '../components/TodoModal';
import { CountdownModal } from '../components/CountdownModal';
import { CountdownCard } from '../components/CountdownCard';
import { fetchSharedScheduleByCode } from '../services/supabase';
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
  Users,
  RefreshCw,
  UserPlus,
  Hourglass,
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
    savedFriends,
    saveFriendRecord,
    settings,
    currentUser,
    countdowns,
    addCountdown,
    updateCountdown,
    deleteCountdown,
    togglePinCountdown,
  } = useApp();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const myShareCode = (currentUser?.shareCode || settings.shareCode || '').toUpperCase();

  // ⏳ 重要日子 (倒數日 & 持續紀念日) 狀態
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [countdownToEdit, setCountdownToEdit] = useState<CountdownItem | null>(null);
  const [countdownFilter, setCountdownFilter] = useState<'all' | 'countdown' | 'countup'>('all');

  const filteredCountdowns = useMemo(() => {
    const list = countdowns || [];
    if (countdownFilter === 'countdown') {
      return list.filter((c) => (c.mode || 'countdown') === 'countdown');
    }
    if (countdownFilter === 'countup') {
      return list.filter((c) => c.mode === 'countup');
    }
    return list;
  }, [countdowns, countdownFilter]);

  // Calendar Source Selection (自己行事曆 vs 共同行事曆) & Collapsible State
  const [showMineCalendar, setShowMineCalendar] = useState<boolean>(true);
  const [showSharedCalendar, setShowSharedCalendar] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number>(0);
  const [isRefreshingShared, setIsRefreshingShared] = useState<boolean>(false);

  // Active friend calculations for shared calendar
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

  // Compute displayed events based on calendar source selection (with deduplication)
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

  // Compute displayed todos based on calendar source selection (with deduplication)
  const displayedTodos = useMemo(() => {
    let list: Todo[] = [];
    if (showMineCalendar) {
      list = list.concat(todos);
    }
    if (showSharedCalendar) {
      // If personal calendar is hidden, only show personal shared todos
      if (!showMineCalendar) {
        const mySharedTodos = todos.filter((t) => t.isSharedToCalendar);
        list = list.concat(mySharedTodos);
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

  // Compute displayed courses based on calendar source selection (with deduplication)
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
  // 🌟 Japanese Planner Multi-Day Span Event & Period Todos Logic
  // -------------------------------------------------------------
  const getAllSpanItemsForDate = (dateStr: string): UnifiedSpanItem[] => {
    // 1. Calendar Events covering this date
    const eventItems: UnifiedSpanItem[] = displayedCalendarEvents
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
    const periodTodoItems: UnifiedSpanItem[] = displayedTodos
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
    const eventItems: UnifiedSpanItem[] = displayedCalendarEvents.map((e) => ({
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

    const singleDueTodos: UnifiedSpanItem[] = displayedTodos
      .filter((t) => !t.startDate && t.dueDate && !t.isCompleted)
      .map((t) => {
        const d = t.dueDate!.slice(0, 10);
        return {
          id: t.id,
          title: t.title,
          startDate: d,
          endDate: d,
          colorHex: t.colorHex || '#10B981',
          category: t.category,
          isAllDay: true,
          notes: t.notes,
          type: 'todo' as const,
          isCompleted: t.isCompleted,
        };
      });

    return [...eventItems, ...periodTodoItems, ...singleDueTodos];
  }, [displayedCalendarEvents, displayedTodos]);

  // Group month grid days into weeks of 7 for continuous ribbons
  const monthWeeks = useMemo(() => {
    const weeks: (typeof monthGridDays)[] = [];
    for (let i = 0; i < monthGridDays.length; i += 7) {
      weeks.push(monthGridDays.slice(i, i + 7));
    }
    return weeks;
  }, [monthGridDays]);

  interface WeekSegment {
    item: UnifiedSpanItem;
    startCol: number;
    endCol: number;
    span: number;
    isStart: boolean;
    isEnd: boolean;
  }

  const computeWeekTracks = (weekDays: typeof monthGridDays, allItems: UnifiedSpanItem[]) => {
    if (weekDays.length !== 7) return { tracks: [] as WeekSegment[][], dayOverflowCount: Array(7).fill(0) };
    const weekStartStr = weekDays[0].dateStr;
    const weekEndStr = weekDays[6].dateStr;

    // Items active during this week
    const weekItems = allItems.filter(
      (item) => item.startDate <= weekEndStr && (item.endDate || item.startDate) >= weekStartStr
    );

    const segments: WeekSegment[] = weekItems.map((item) => {
      const itemEnd = item.endDate || item.startDate;
      let startCol = 0;
      if (item.startDate >= weekStartStr) {
        const idx = weekDays.findIndex((d) => d.dateStr === item.startDate);
        startCol = idx >= 0 ? idx : 0;
      }
      let endCol = 6;
      if (itemEnd <= weekEndStr) {
        const idx = weekDays.findIndex((d) => d.dateStr === itemEnd);
        endCol = idx >= 0 ? idx : 6;
      }

      return {
        item,
        startCol,
        endCol,
        span: endCol - startCol + 1,
        isStart: item.startDate >= weekStartStr,
        isEnd: itemEnd <= weekEndStr,
      };
    });

    // Sort: multi-day first by span descending, then startCol ascending
    segments.sort((a, b) => {
      if (b.span !== a.span) return b.span - a.span;
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return a.item.startDate.localeCompare(b.item.startDate);
    });

    const maxTracks = 3;
    const tracks: WeekSegment[][] = [];
    const trackOccupied: boolean[][] = [];
    const unassigned: WeekSegment[] = [];

    for (const seg of segments) {
      let placed = false;
      for (let t = 0; t < maxTracks; t++) {
        if (!trackOccupied[t]) trackOccupied[t] = Array(7).fill(false);
        let conflict = false;
        for (let c = seg.startCol; c <= seg.endCol; c++) {
          if (trackOccupied[t][c]) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          for (let c = seg.startCol; c <= seg.endCol; c++) {
            trackOccupied[t][c] = true;
          }
          if (!tracks[t]) tracks[t] = [];
          tracks[t].push(seg);
          placed = true;
          break;
        }
      }
      if (!placed) {
        unassigned.push(seg);
      }
    }

    const dayOverflowCount = Array(7).fill(0);
    for (const u of unassigned) {
      for (let c = u.startCol; c <= u.endCol; c++) {
        dayOverflowCount[c]++;
      }
    }

    return { tracks, dayOverflowCount };
  };


  // -------------------------------------------------------------
  // ☀️ Today's Summary Data (Courses + Todos + Accounting)
  // -------------------------------------------------------------
  const todayDayOfWeek = (now.getDay() === 0 ? 7 : now.getDay()) as DayOfWeek;

  const todayCourses = useMemo(() => {
    return displayedCourses
      .filter((c) => c.dayOfWeek === todayDayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [displayedCourses, todayDayOfWeek]);

  const todayTodos = useMemo(() => {
    return displayedTodos.filter((t) => {
      // Due today or period active today
      if (t.dueDate && t.dueDate.slice(0, 10) === todayStr) return true;
      if (t.startDate && t.endDate && todayStr >= t.startDate && todayStr <= t.endDate) return true;
      return false;
    });
  }, [displayedTodos, todayStr]);

  const todaySpanItems = useMemo(() => {
    return getAllSpanItemsForDate(todayStr);
  }, [displayedCalendarEvents, displayedTodos, todayStr]);

  // Selected date events & items
  const selectedDateSpanItems = useMemo(() => {
    return getAllSpanItemsForDate(selectedDateStr);
  }, [selectedDateStr, displayedCalendarEvents, displayedTodos]);

  const selectedDateEvents = useMemo(() => {
    return selectedDateSpanItems.filter((item) => item.type === 'event');
  }, [selectedDateSpanItems]);

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

  const selectedDateTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.slice(0, 10) === selectedDateStr);
  }, [selectedDateStr, transactions]);

  return (
    <div className="space-y-4 pb-28">
      {/* 🌟 日式手帳行事曆頁首 */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1.5">
            <span>📅 日式手帳生活行事曆</span>
          </h2>
          <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
            {showMineCalendar && showSharedCalendar
              ? '個人日程與好友共享行事曆雙軌合併檢視'
              : showSharedCalendar
              ? '同步瀏覽好友行程與共同待辦，到期雙向推播！'
              : '個人日程、課堂與專屬待辦事項'}
          </p>
        </div>
      </div>

      {/* 🌟 行事曆來源選擇與折疊面板 (可自由選擇顯示自己行事曆或共同行事曆) */}
      <div className="rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios overflow-hidden transition-all">
        {/* 折疊收合標題列 */}
        <div
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="p-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  行事曆顯示來源
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-black/5 dark:bg-white/10 text-calico-cocoa/80 dark:text-zinc-300">
                  {showMineCalendar && showSharedCalendar
                    ? '🐱 我的 + 🤝 共同'
                    : showSharedCalendar
                    ? '🤝 共同行事曆'
                    : '🐱 我的行事曆'}
                </span>
              </div>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                點擊以{isFilterExpanded ? '收合' : '展開'}篩選（可切換個人 / 共同行事曆）
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-calico-orange flex items-center space-x-0.5">
              <span>{isFilterExpanded ? '收合' : '展開篩選'}</span>
              {isFilterExpanded ? (
                <ChevronUp className="w-4 h-4 text-calico-orange" />
              ) : (
                <ChevronDown className="w-4 h-4 text-calico-orange" />
              )}
            </span>
          </div>
        </div>

        {/* 展開後的篩選器與好友列表 */}
        {isFilterExpanded && (
          <div className="p-4 pt-1 border-t border-black/5 dark:border-white/5 space-y-3 animate-fade-in">
            {/* 快速切換捷徑按鈕 */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setShowMineCalendar(true);
                  setShowSharedCalendar(false);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  showMineCalendar && !showSharedCalendar
                    ? 'bg-calico-orange text-white shadow-xs font-black'
                    : 'bg-calico-cream dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange'
                }`}
              >
                🐱 僅自己
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMineCalendar(false);
                  setShowSharedCalendar(true);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  !showMineCalendar && showSharedCalendar
                    ? 'bg-calico-orange text-white shadow-xs font-black'
                    : 'bg-calico-cream dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange'
                }`}
              >
                🤝 僅共同
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMineCalendar(true);
                  setShowSharedCalendar(true);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  showMineCalendar && showSharedCalendar
                    ? 'bg-calico-orange text-white shadow-xs font-black'
                    : 'bg-calico-cream dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange'
                }`}
              >
                ✨ 全部合併
              </button>
            </div>

            {/* 自選來源多選勾選盒 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
              <label
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  showMineCalendar
                    ? 'bg-calico-orange/10 border-calico-orange/30 text-calico-cocoa dark:text-zinc-100'
                    : 'bg-calico-cream/50 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">🐱</span>
                  <div>
                    <span className="block font-black">自己的行事曆</span>
                    <span className="text-[10px] opacity-75 font-normal">個人行程、日常課表、專屬待辦</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showMineCalendar}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (!next && !showSharedCalendar) return;
                    setShowMineCalendar(next);
                  }}
                  className="accent-calico-orange w-4 h-4 rounded cursor-pointer"
                />
              </label>

              <label
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  showSharedCalendar
                    ? 'bg-calico-orange/10 border-calico-orange/30 text-calico-cocoa dark:text-zinc-100'
                    : 'bg-calico-cream/50 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">🤝</span>
                  <div>
                    <span className="block font-black">共同行事曆</span>
                    <span className="text-[10px] opacity-75 font-normal">好友共享活動、共同待辦任務</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showSharedCalendar}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (!next && !showMineCalendar) return;
                    setShowSharedCalendar(next);
                  }}
                  className="accent-calico-orange w-4 h-4 rounded cursor-pointer"
                />
              </label>
            </div>

            {/* 共同行事曆好友切換列 */}
            {showSharedCalendar && (
              <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
                <span className="text-[11px] font-black text-calico-cocoa/70 dark:text-zinc-400 block">
                  共同行事曆好友來源：
                </span>
                {savedFriends.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center justify-between">
                    <span>尚無已儲存的好友，輸入好友分享代碼開始共享！</span>
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-[11px] font-black shrink-0 ml-2 shadow-xs active:scale-95 transition-all"
                    >
                      加入好友
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                    {savedFriends.map((f, idx) => (
                      <button
                        type="button"
                        key={f.shareCode}
                        onClick={() => setSelectedFriendIndex(idx)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all ${
                          selectedFriendIndex === idx
                            ? 'bg-calico-orange text-white shadow-ios-sm font-black'
                            : 'bg-calico-cream dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-300 border border-black/5 dark:border-white/10'
                        }`}
                      >
                        <span>👥 {f.nickname || f.ownerName}</span>
                        <span className="text-[10px] opacity-75">({f.shareCode})</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={handleRefreshSharedCalendar}
                      disabled={isRefreshingShared}
                      className="p-1.5 rounded-xl bg-calico-cream dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange active:scale-95 transition-all shrink-0"
                      title="重新整理好友共享行事曆"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingShared ? 'animate-spin text-calico-orange' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="p-1.5 rounded-xl bg-calico-cream dark:bg-zinc-800 border border-dashed border-black/15 dark:border-white/15 text-calico-cocoa/50 dark:text-zinc-400 hover:text-calico-orange active:scale-95 transition-all shrink-0"
                      title="新增好友"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ⏳ 重要日子（倒數日 & 持續紀念日）專區 */}
      <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Hourglass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  重要日子
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0">
                  {filteredCountdowns.length} 個事件
                </span>
              </div>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold truncate">
                考試檢定倒數 · 戀愛交往與習慣持續天數 · 首頁連動
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* 篩選切換: 全部 / 倒數日 / 持續日 */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCountdownFilter('all')}
                className={`px-2 py-1 rounded-lg transition-all whitespace-nowrap ${
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
                className={`px-2 py-1 rounded-lg transition-all whitespace-nowrap ${
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
                className={`px-2 py-1 rounded-lg transition-all whitespace-nowrap ${
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
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增日子</span>
            </button>
          </div>
        </div>

        {/* 倒數日清單 */}
        {filteredCountdowns.length === 0 ? (
          <div className="py-6 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            目前無符合條件的重要日子，點擊上方「新增日子」建立倒數或持續紀念！
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCountdowns.map((cd) => (
              <CountdownCard
                key={cd.id}
                item={cd}
                onEdit={(item) => {
                  setCountdownToEdit(item);
                  setIsCountdownModalOpen(true);
                }}
                onDelete={(id) => deleteCountdown(id)}
                onTogglePin={(id) => togglePinCountdown(id)}
              />
            ))}
          </div>
        )}
      </div>

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
      {/* 📅 2. 月曆 檢視 (日式生活手帳特色風 Japanese Life Planner) */}
      {/* ======================================================== */}
      {calendarMode === 'month' && (
        <div className="p-3.5 sm:p-5 rounded-[28px] bg-white/95 dark:bg-calico-darkCard border border-amber-900/10 dark:border-white/10 shadow-ios space-y-3.5 transition-all">
          {/* Month Header Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 text-[11px] font-black tracking-wider">
                {year}
              </span>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                  {month + 1} 月
                </h3>
                <span className="text-xs text-calico-orange/80 font-bold select-none">
                  🐾
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200 hover:bg-calico-orange/20 active:scale-90 transition-all"
                title="上個月"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoToday}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-calico-orange text-white text-xs font-black shadow-2xs hover:brightness-105 active:scale-95 transition-all"
              >
                今天
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200 hover:bg-calico-orange/20 active:scale-90 transition-all"
                title="下個月"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names Header with Playful Bubbles (Sun Rose, Sat Sky, Weekdays Cocoa) */}
          <div className="grid grid-cols-7 gap-1 text-center pb-1 border-b border-amber-900/10 dark:border-white/5">
            {WEEKDAYS_HEADER.map((w, idx) => (
              <div
                key={w}
                className={`text-xs py-1 rounded-xl font-black transition-all ${
                  idx === 0
                    ? 'text-rose-500 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30'
                    : idx === 6
                    ? 'text-sky-500 dark:text-sky-400 bg-sky-50/80 dark:bg-sky-950/30'
                    : 'text-calico-cocoa/80 dark:text-zinc-300'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 7-Column Month Grid Table with Continuous Spanning Ribbons */}
          <div className="border border-amber-900/10 dark:border-white/10 rounded-2xl overflow-hidden bg-white/90 dark:bg-zinc-900/40 shadow-2xs">
            {monthWeeks.map((weekDays, wIdx) => {
              const { tracks, dayOverflowCount } = computeWeekTracks(weekDays, allSpanItems);

              return (
                <div
                  key={`week-${wIdx}`}
                  className="relative border-b last:border-b-0 border-amber-900/10 dark:border-white/10 min-h-[86px] sm:min-h-[100px] flex flex-col justify-start"
                >
                  {/* 1. Underlying 7-Day Background Cells (Clickable day slots) */}
                  <div className="absolute inset-0 grid grid-cols-7 w-full h-full">
                    {weekDays.map((cell) => {
                      const isSelected = cell.dateStr === selectedDateStr;
                      const isToday = cell.dateStr === todayStr;

                      return (
                        <div
                          key={`bg-${cell.dateStr}`}
                          onClick={() => setSelectedDateStr(cell.dateStr)}
                          className={`border-r last:border-r-0 border-amber-900/10 dark:border-white/10 h-full transition-all cursor-pointer relative select-none ${
                            isSelected
                              ? 'bg-calico-orange/10 ring-2 ring-inset ring-calico-orange z-10'
                              : isToday
                              ? 'bg-gradient-to-b from-amber-50/70 to-transparent dark:from-amber-950/20'
                              : !cell.isCurrentMonth
                              ? 'bg-black/[0.015] dark:bg-white/[0.015]'
                              : 'hover:bg-calico-orange/5'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* 2. Cell Header Row: Date numbers + indicators */}
                  <div className="relative z-20 grid grid-cols-7 w-full pointer-events-none p-1 sm:p-1.5 pb-0.5">
                    {weekDays.map((cell, colIdx) => {
                      const isToday = cell.dateStr === todayStr;
                      const cellDate = new Date(cell.dateStr);
                      const cellDayOfWeek = (cellDate.getDay() === 0 ? 7 : cellDate.getDay()) as DayOfWeek;
                      const dayCourses = displayedCourses.filter((c) => c.dayOfWeek === cellDayOfWeek);
                      const dayTodos = displayedTodos.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === cell.dateStr && !t.isCompleted);
                      const dayTxs = transactions.filter((t) => t.date.slice(0, 10) === cell.dateStr);

                      return (
                        <div key={`header-${cell.dateStr}`} className="flex items-center justify-between px-0.5">
                          {isToday ? (
                            <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-500 to-calico-orange text-white flex items-center justify-center font-black text-[11px] sm:text-xs shadow-xs ring-2 ring-amber-300/40">
                              {cell.dayNum}
                            </div>
                          ) : (
                            <span
                              className={`text-[11px] sm:text-xs font-bold leading-tight ${
                                !cell.isCurrentMonth
                                  ? colIdx === 0
                                    ? 'text-rose-300/60 dark:text-rose-900/40'
                                    : colIdx === 6
                                    ? 'text-sky-300/60 dark:text-sky-900/40'
                                    : 'text-zinc-300 dark:text-zinc-600'
                                  : colIdx === 0
                                  ? 'text-rose-500 font-extrabold'
                                  : colIdx === 6
                                  ? 'text-sky-500 font-extrabold'
                                  : 'text-calico-cocoa dark:text-zinc-200 font-bold'
                              }`}
                            >
                              {!cell.isCurrentMonth && (cell.dayNum === 1 || (wIdx === 0 && colIdx === 0))
                                ? `${new Date(cell.dateStr).getMonth() + 1}/${cell.dayNum}`
                                : cell.dayNum}
                            </span>
                          )}

                          {/* Status Micro-dots (Courses amber, Todos mint, Txs coral) */}
                          <div className="flex items-center space-x-0.5">
                            {dayCourses.length > 0 && cell.isCurrentMonth && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-2xs"
                                title={`${dayCourses.length} 門課程`}
                              />
                            )}
                            {dayTodos.length > 0 && cell.isCurrentMonth && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-2xs"
                                title={`${dayTodos.length} 項待辦`}
                              />
                            )}
                            {dayTxs.length > 0 && cell.isCurrentMonth && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-2xs"
                                title={`${dayTxs.length} 筆收支`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. Event Spanning Tracks (Continuous ribbons across columns) */}
                  <div className="relative z-20 w-full space-y-1 px-0.5 pb-1 mt-1">
                    {tracks.map((trackSegs, tIdx) => (
                      <div
                        key={`track-${wIdx}-${tIdx}`}
                        className="grid grid-cols-7 gap-x-0.5 h-5 sm:h-5.5 items-center relative"
                      >
                        {trackSegs.map((seg) => {
                          const isEvent = seg.item.type === 'event';
                          const color = seg.item.colorHex || '#FF6B00';

                          return (
                            <div
                              key={`seg-${seg.item.id}-${seg.startCol}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDateStr(seg.item.startDate);
                                if (isEvent) {
                                  const ev = calendarEvents.find((x) => x.id === seg.item.id);
                                  if (ev) {
                                    setEventToEdit(ev);
                                    setIsEventModalOpen(true);
                                  }
                                }
                              }}
                              style={{
                                gridColumnStart: seg.startCol + 1,
                                gridColumnEnd: seg.endCol + 2,
                                gridRowStart: 1,
                                backgroundColor: `${color}28`,
                                borderColor: `${color}66`,
                                color: color,
                              }}
                              className={`h-full flex items-center px-1.5 text-[9.5px] sm:text-[10px] font-black border truncate cursor-pointer hover:brightness-95 active:scale-[0.99] transition-all leading-tight shadow-2xs ${
                                seg.isStart ? 'rounded-l-full ml-0.5 pl-2' : 'rounded-l-none border-l-0 pl-1'
                              } ${
                                seg.isEnd ? 'rounded-r-full mr-0.5 pr-2' : 'rounded-r-none border-r-0 pr-1'
                              }`}
                              title={`${seg.item.title} (${seg.item.startDate} ~ ${seg.item.endDate})`}
                            >
                              {!seg.isStart && (
                                <span className="opacity-70 text-[8px] mr-0.5 shrink-0 select-none">◀</span>
                              )}
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0 mr-1 shadow-2xs"
                                style={{ backgroundColor: color }}
                              />
                              <span className="truncate">{seg.item.title}</span>
                              {!seg.isEnd && (
                                <span className="opacity-70 text-[8px] ml-auto pl-0.5 shrink-0 select-none">▶</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* 4. Overflow indicator row */}
                    {dayOverflowCount.some((cnt) => cnt > 0) && (
                      <div className="grid grid-cols-7 gap-x-0.5 pointer-events-none">
                        {dayOverflowCount.map((cnt, colIdx) => (
                          <div
                            key={`overflow-${colIdx}`}
                            style={{ gridColumnStart: colIdx + 1, gridRowStart: 1 }}
                            className="text-left px-1"
                          >
                            {cnt > 0 && (
                              <span className="text-[8px] sm:text-[8.5px] font-black px-1 py-0.2 rounded-md bg-calico-orange/15 text-calico-orange">
                                +{cnt} 更多
                              </span>
                            )}
                          </div>
                        ))}
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
              const dayCourses = displayedCourses.filter((c) => c.dayOfWeek === w.dayOfWeekNum);
              const dayTodos = displayedTodos.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === w.dateStr);

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
                        className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                          isToday
                            ? 'bg-gradient-to-r from-amber-500 to-calico-orange text-white shadow-2xs'
                            : w.dayOfWeekNum === 7
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500'
                            : w.dayOfWeekNum === 6
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-500'
                            : 'bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200'
                        }`}
                      >
                        {w.weekdayName}
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
      <div className="p-4 sm:p-5 rounded-[28px] bg-white/95 dark:bg-calico-darkCard border border-amber-900/10 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between border-b border-amber-900/10 dark:border-white/5 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1.5">
                <span>{selectedDateStr} 行程手帳</span>
              </h4>
              {selectedDateStr === todayStr && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-calico-orange text-white shadow-2xs">
                  今天
                </span>
              )}
            </div>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 mt-0.5">
              包含當日課表、跨天活動、待辦作業與收支
            </p>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsTodoModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-calico-sage/15 text-calico-sage text-xs font-black flex items-center space-x-1 hover:bg-calico-sage/25 active:scale-95 transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>加待辦</span>
            </button>
            <button
              onClick={() => {
                setEventToEdit(null);
                setIsEventModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-calico-orange text-white text-xs font-black flex items-center space-x-1 hover:brightness-105 active:scale-95 transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>加活動</span>
            </button>
          </div>
        </div>

        {/* 4.1 Multi-Day Span Items on Selected Date */}
        {selectedDateEvents.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
              <CalendarDays className="w-3.5 h-3.5 text-calico-orange" />
              <span>進行中的區間行程 ({selectedDateEvents.length})</span>
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
                className="p-3 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 border-l-4 flex items-center justify-between cursor-pointer hover:brightness-95 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <Tag className="w-3.5 h-3.5 text-calico-orange" />
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
            <div className="text-center py-10 rounded-2xl bg-calico-cream/30 dark:bg-zinc-800/20 border border-dashed border-amber-900/15 dark:border-white/10 space-y-2">
              <div className="text-2xl select-none">☕️🐾</div>
              <p className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                這天沒有排定行程或待辦，是個放鬆的美好日子！
              </p>
            </div>
          )}
      </div>

      {/* ======================================================== */}
      {/* 5. Modals */}
      {/* ======================================================== */}
      {/* Planner Span Event Modal */}
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

      {/* ⏳ Countdown & Count-up Modal */}
      <CountdownModal
        isOpen={isCountdownModalOpen}
        onClose={() => {
          setIsCountdownModalOpen(false);
          setCountdownToEdit(null);
        }}
        countdownToEdit={countdownToEdit}
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
