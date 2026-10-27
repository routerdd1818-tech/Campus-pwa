import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Course, DayOfWeek, ClassPeriod, SavedFriendRecord, CourseWishlistItem } from '../types';
import { fetchSharedScheduleByCode } from '../services/supabase';
import { CourseModal } from '../components/CourseModal';
import { CourseWishlistModal } from '../components/CourseWishlistModal';
import { OcrModal } from '../components/OcrModal';
import { PeriodSettingsModal, DEFAULT_CLASS_PERIODS } from '../components/PeriodSettingsModal';
import { GradeCalculatorView } from '../components/GradeCalculatorView';
import { CategoryIcon } from '../components/CategoryIcon';
import {
  Plus,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  User,
  Coffee,
  CheckCircle2,
  CalendarDays,
  Compass,
  ArrowRight,
  Eye,
  Users,
} from 'lucide-react';

interface PeriodDef {
  id: number;
  name: string;
  code: string;
  start: string;
  end: string;
  isNoon: boolean;
}

const ALL_WEEKDAYS = [
  { val: 1 as DayOfWeek, name: '週一', short: '一' },
  { val: 2 as DayOfWeek, name: '週二', short: '二' },
  { val: 3 as DayOfWeek, name: '週三', short: '三' },
  { val: 4 as DayOfWeek, name: '週四', short: '四' },
  { val: 5 as DayOfWeek, name: '週五', short: '五' },
  { val: 6 as DayOfWeek, name: '週六', short: '六' },
  { val: 7 as DayOfWeek, name: '週日', short: '日' },
];

const PERIOD_SCHEDULE: PeriodDef[] = [
  { id: 1, name: '第 1 節', code: '1', start: '08:10', end: '09:00', isNoon: false },
  { id: 2, name: '第 2 節', code: '2', start: '09:10', end: '10:00', isNoon: false },
  { id: 3, name: '第 3 節', code: '3', start: '10:10', end: '11:00', isNoon: false },
  { id: 4, name: '第 4 節', code: '4', start: '11:10', end: '12:00', isNoon: false },
  { id: 100, name: '中午', code: '中午', start: '12:10', end: '13:10', isNoon: true },
  { id: 5, name: '第 5 節', code: '5', start: '13:20', end: '14:10', isNoon: false },
  { id: 6, name: '第 6 節', code: '6', start: '14:20', end: '15:10', isNoon: false },
  { id: 7, name: '第 7 節', code: '7', start: '15:30', end: '16:20', isNoon: false },
  { id: 8, name: '第 8 節', code: '8', start: '16:30', end: '17:20', isNoon: false },
  { id: 9, name: '第 9 節', code: '9', start: '17:30', end: '18:20', isNoon: false },
  { id: 10, name: '第 10 節', code: '10', start: '18:30', end: '19:20', isNoon: false },
];

// Helper: convert HH:mm to minutes from midnight
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Calculate Gregorian date string (e.g. "10/11") for a weekday in the current week
function getDateStringForWeekday(targetDay: DayOfWeek): string {
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const diffDays = targetDay - currentDay;
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffDays);
  return `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
}

export const ScheduleView: React.FC = () => {
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    classPeriods,
    isPeriodModalOpen,
    setIsPeriodModalOpen,
    savedFriends,
    saveFriendRecord,
    setIsShareModalOpen,
    courseWishlist,
    deleteWishlistCourse,
    convertWishlistToCourse,
  } = useApp();

  const [viewMode, setViewMode] = useState<'week' | 'day' | 'grades' | 'wishlist'>('week');
  const [includeWeekend, setIncludeWeekend] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);

  // 📋 待選心願單 / 模擬排課狀態
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<CourseWishlistItem | null>(null);
  const [selectedSemester, setSelectedSemester] = useState('115-2');
  const [wishlistViewType, setWishlistViewType] = useState<'cards' | 'grid'>('cards');

  // 目標學期清單（涵蓋 113 至 120 學年度，及心願單自訂學期）
  const availableWishlistSemesters = useMemo(() => {
    const semSet = new Set<string>();
    for (let y = 114; y <= 120; y++) {
      if (y === 114) {
        semSet.add('114-2');
      } else {
        semSet.add(`${y}-1`);
        semSet.add(`${y}-2`);
      }
    }
    (courseWishlist || []).forEach((w) => {
      if (w.targetSemester) semSet.add(w.targetSemester);
    });
    return Array.from(semSet).sort();
  }, [courseWishlist]);

  const filteredWishlist = useMemo(() => {
    if (selectedSemester === '全部') return courseWishlist || [];
    return (courseWishlist || []).filter((w) => w.targetSemester === selectedSemester);
  }, [courseWishlist, selectedSemester]);

  // 衝堂偵測 (Time Conflicts Check)
  const conflictsList = useMemo(() => {
    const conflicts: { dayName: string; courseA: string; courseB: string; timeA: string; timeB: string }[] = [];
    const list = filteredWishlist;

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.dayOfWeek === b.dayOfWeek) {
          const aStart = timeToMinutes(a.startTime);
          const aEnd = timeToMinutes(a.endTime);
          const bStart = timeToMinutes(b.startTime);
          const bEnd = timeToMinutes(b.endTime);

          if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
            const dayName = ALL_WEEKDAYS.find((d) => d.val === a.dayOfWeek)?.name || '週一';
            conflicts.push({
              dayName,
              courseA: a.name,
              courseB: b.name,
              timeA: `${a.startTime}-${a.endTime}`,
              timeB: `${b.startTime}-${b.endTime}`,
            });
          }
        }
      }
    }
    return conflicts;
  }, [filteredWishlist]);

  // Friend schedule viewing state
  const [viewingFriend, setViewingFriend] = useState<SavedFriendRecord | null>(null);
  const [friendCourses, setFriendCourses] = useState<Course[] | null>(null);
  const [isLoadingFriend, setIsLoadingFriend] = useState(false);

  const activeCourses = useMemo(() => {
    if (viewingFriend && friendCourses) return friendCourses;
    return courses;
  }, [viewingFriend, friendCourses, courses]);

  const handleSelectFriendSchedule = async (friend: SavedFriendRecord) => {
    setViewingFriend(friend);
    const cached = friend.cachedSchedule?.coursesData || (friend.cachedSchedule as any)?.courses;
    if (cached) {
      setFriendCourses(cached);
    }
    setIsLoadingFriend(true);
    try {
      const latest = await fetchSharedScheduleByCode(friend.shareCode);
      const latestCourses = latest?.coursesData || (latest as any)?.courses;
      if (latest && latestCourses) {
        setFriendCourses(latestCourses);
        saveFriendRecord({ ...friend, cachedSchedule: latest, lastViewedAt: new Date().toISOString() });
      }
    } catch {
      // Keep cached courses
    } finally {
      setIsLoadingFriend(false);
    }
  };


  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const jsDay = new Date().getDay();
    return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
  });

  const [modalCourse, setModalCourse] = useState<Course | null>(null);
  const [modalDefaults, setModalDefaults] = useState<{
    day?: DayOfWeek;
    startTime?: string;
    endTime?: string;
  }>({});
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  // Active periods to render based on customizable settings
  const periodsToRender = useMemo<ClassPeriod[]>(() => {
    if (classPeriods && classPeriods.length > 0) {
      return classPeriods;
    }
    return DEFAULT_CLASS_PERIODS;
  }, [classPeriods]);

  // Active displayed weekdays
  const displayedDays = useMemo(() => {
    return includeWeekend ? ALL_WEEKDAYS : ALL_WEEKDAYS.slice(0, 5);
  }, [includeWeekend]);

  // Today's DayOfWeek
  const todayDayOfWeek = useMemo(() => {
    const js = new Date().getDay();
    return (js === 0 ? 7 : js) as DayOfWeek;
  }, []);

  // Determine if a course matches a given period (獨立時段精確判定，避免第 5 節與中午重疊)
  const matchesPeriod = (course: Course, period: ClassPeriod): boolean => {
    const cStart = timeToMinutes(course.startTime);
    const cEnd = timeToMinutes(course.endTime);
    const pStart = timeToMinutes(period.startTime);
    const pEnd = timeToMinutes(period.endTime);

    // 每個時段皆為獨立區間：課程在該節次內重疊超過 10 分鐘，或課程完全落在該節次內
    const overlap = Math.min(cEnd, pEnd) - Math.max(cStart, pStart);
    if (overlap > 10) return true;
    if (cStart >= pStart && cEnd <= pEnd && overlap > 0) return true;
    return false;
  };

  // Open modal to edit existing course
  const handleEditCourse = (course: Course) => {
    setModalCourse(course);
    setModalDefaults({});
    setIsCourseModalOpen(true);
  };

  // Open modal to add new course with specific slot pre-filled
  const handleAddSlot = (day: DayOfWeek, startTime: string, endTime: string) => {
    setModalCourse(null);
    setModalDefaults({
      day,
      startTime,
      endTime,
    });
    setIsCourseModalOpen(true);
  };

  // Open generic add course modal
  const handleAddNewCourse = () => {
    setModalCourse(null);
    setModalDefaults({
      day: selectedDay,
      startTime: '09:10',
      endTime: '12:00',
    });
    setIsCourseModalOpen(true);
  };

  const handleImportOcrCourses = async (importedList: Course[]) => {
    for (const c of importedList) {
      await addCourse(c);
    }
  };

  // Live status for Today's view
  const liveStatus = useMemo(() => {
    if (selectedDay !== todayDayOfWeek) return null;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todayCourses = activeCourses
      .filter((c) => c.dayOfWeek === todayDayOfWeek)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    if (todayCourses.length === 0) {
      return { type: 'free', message: '今日無排定課程，放鬆享受自習或校園時光！' };
    }

    // 1. Is in class right now?
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

    // 2. Next upcoming class?
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

    // 3. All classes ended
    return { type: 'ended', message: '今日課程已全部結束，下課愉快！☕️' };
  }, [activeCourses, selectedDay, todayDayOfWeek]);

  return (
    <div className="space-y-3.5 pb-32">
      {/* 👥 好友課表快速切換列 (點擊即看，無須重新輸入分享碼) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1 px-0.5">
        <button
          type="button"
          onClick={() => {
            setViewingFriend(null);
            setFriendCourses(null);
          }}
          className={`px-3 py-1.5 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center space-x-1.5 shadow-2xs ${
            viewingFriend === null
              ? 'bg-calico-orange text-white ring-2 ring-calico-orange/30'
              : 'bg-white dark:bg-zinc-800 text-calico-cocoa/80 dark:text-zinc-300 border border-black/5 dark:border-white/5 hover:border-calico-orange/40'
          }`}
        >
          <span>🐾</span>
          <span>我的課表</span>
        </button>

        {savedFriends.map((friend) => {
          const isSelected = viewingFriend?.shareCode === friend.shareCode;
          return (
            <button
              type="button"
              key={friend.shareCode}
              onClick={() => handleSelectFriendSchedule(friend)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold shrink-0 transition-all flex items-center space-x-1.5 shadow-2xs border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/30'
                  : 'bg-white dark:bg-zinc-800 text-calico-cocoa/80 dark:text-zinc-300 border-black/5 dark:border-white/5 hover:border-indigo-400'
              }`}
            >
              <span>👤</span>
              <span>{friend.nickname || friend.ownerName}</span>
              <span className="font-mono text-[10px] opacity-75">({friend.shareCode})</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="px-2.5 py-1.5 rounded-2xl text-xs font-bold shrink-0 bg-calico-cream dark:bg-zinc-800/80 text-calico-orange border border-dashed border-calico-orange/40 hover:border-calico-orange transition-all flex items-center space-x-1"
          title="加入新好友或管理分享碼"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>加好友</span>
        </button>
      </div>

      {/* 好友共享課表查閱提示橫幅 */}
      {viewingFriend && (
        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              正在查看好友【{viewingFriend.nickname || viewingFriend.ownerName}】（代碼：{viewingFriend.shareCode}）的共享課表
              {isLoadingFriend && '（同步更新中...）'}
            </span>
          </div>
          <button
            onClick={() => {
              setViewingFriend(null);
              setFriendCourses(null);
            }}
            className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-[11px] font-extrabold hover:bg-indigo-700 active:scale-95 transition-all shrink-0 ml-2"
          >
            返回我的課表
          </button>
        </div>
      )}

      {/* 頂部操作與視圖切換列 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* 週課表 vs 本日行程 vs 待選心願單 vs 學分與成績 */}
        <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setViewMode('week')}
            className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
              viewMode === 'week'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            週課表
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
              viewMode === 'day'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            本日行程
          </button>
          <button
            onClick={() => setViewMode('wishlist')}
            className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center space-x-1 ${
              viewMode === 'wishlist'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            <span>📋</span>
            <span>待選心願單</span>
          </button>
          <button
            onClick={() => setViewMode('grades')}
            className={`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center space-x-1 ${
              viewMode === 'grades'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            <span>🎓</span>
            <span>學分與成績</span>
          </button>
        </div>

        {/* Buttons - Aligned Uniform Controls */}
        <div className="flex items-center space-x-1.5">
          {viewMode === 'week' && (
            <button
              onClick={() => setIncludeWeekend((prev) => !prev)}
              className={`h-8 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center ${
                includeWeekend
                  ? 'bg-calico-cocoa text-white border-calico-cocoa shadow-2xs'
                  : 'bg-white/80 dark:bg-zinc-800 border-black/10 dark:border-white/10 text-calico-cocoa/80 dark:text-zinc-300'
              }`}
              title="切換是否顯示週六與週日"
            >
              {includeWeekend ? '7天' : '5天'}
            </button>
          )}

          <button
            onClick={() => setIsPeriodModalOpen(true)}
            className="w-8 h-8 rounded-xl bg-white/80 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 flex items-center justify-center hover:border-calico-orange/40 hover:text-calico-orange active:scale-95 transition-all shadow-2xs"
            title="自訂每節課時間與節次"
          >
            <Clock className="w-4 h-4 text-calico-orange" />
          </button>

          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="w-8 h-8 rounded-xl bg-calico-orange/15 text-calico-orange flex items-center justify-center hover:bg-calico-orange/20 active:scale-95 transition-all shadow-2xs"
            title="AI 圖片課表自動辨識"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddNewCourse}
            className="h-8 flex items-center space-x-1 px-3 rounded-xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
          >
            <Plus className="w-4 h-4" />
            <span>加課</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. 週課表 網格視圖 (Weekly Grid View) */}
      {/* ======================================================== */}
      {viewMode === 'week' && (
        <div className="rounded-3xl bg-white/90 dark:bg-calico-darkCard/90 backdrop-blur-md p-3 border border-black/5 dark:border-white/10 shadow-ios overflow-hidden">
          {/* Scroll container */}
          <div className={fitToScreen ? 'w-full' : 'overflow-x-auto scrollbar-none'}>
            <div className={fitToScreen ? 'w-full' : 'min-w-[560px]'}>
              {/* 星期與公曆日期標題行 */}
              <div
                className={`grid gap-1 pb-2 border-b border-black/5 dark:border-white/5 text-center ${
                  displayedDays.length === 7 ? 'grid-cols-8' : 'grid-cols-6'
                }`}
              >
                {/* 節次欄位 */}
                <div
                  onClick={() => setIsPeriodModalOpen(true)}
                  className="flex flex-col items-center justify-center py-1 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/40 text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 cursor-pointer hover:text-calico-orange transition-colors"
                  title="點擊設定節次時間"
                >
                  <span>節次</span>
                </div>

                {/* 星期行 */}
                {displayedDays.map((w) => {
                  const isToday = w.val === todayDayOfWeek;
                  const dateStr = getDateStringForWeekday(w.val);
                  return (
                    <div
                      key={w.val}
                      className={`py-1.5 px-0.5 rounded-xl text-center transition-all ${
                        isToday
                          ? 'bg-calico-orange text-white shadow-xs font-black'
                          : 'bg-calico-cream/40 dark:bg-zinc-800/20 text-calico-cocoa/80 dark:text-zinc-300 font-extrabold'
                      }`}
                    >
                      <div className="text-[9px] opacity-80 leading-none">{dateStr}</div>
                      <div className="text-xs font-black mt-0.5">{w.name}</div>
                    </div>
                  );
                })}
              </div>

              {/* 節次與課程矩陣 */}
              <div className="mt-2 space-y-1.5">
                {periodsToRender.map((period) => (
                  <div
                    key={period.id}
                    className={`grid gap-1 items-stretch ${
                      displayedDays.length === 7 ? 'grid-cols-8' : 'grid-cols-6'
                    } ${period.isNoon ? 'min-h-[46px]' : 'min-h-[52px]'}`}
                  >
                    {/* 節次編號與時間標籤（點擊可自訂時間） */}
                    <div
                      onClick={() => setIsPeriodModalOpen(true)}
                      className={`flex flex-col items-center justify-center p-1 rounded-xl text-center border cursor-pointer hover:border-calico-orange/50 transition-colors ${
                        period.isNoon
                          ? 'bg-calico-orange/15 border-calico-orange/30 text-calico-orange font-bold'
                          : 'bg-calico-cream/70 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 text-calico-cocoa/80 dark:text-zinc-300'
                      }`}
                      title="點擊自訂節次起訖時間"
                    >
                      <span className={`leading-none font-black ${period.isNoon ? 'text-[11px]' : 'text-xs'}`}>
                        {period.displayCode || period.name}
                      </span>
                      <span className="text-[8px] opacity-75 mt-0.5 leading-none font-medium">
                        {period.startTime}
                      </span>
                    </div>

                    {/* 當節各星期的課程儲存格 */}
                    {displayedDays.map((w) => {
                      const dayCourses = activeCourses.filter((c) => c.dayOfWeek === w.val);
                      const matchedCourse = dayCourses.find((c) => matchesPeriod(c, period));

                      if (matchedCourse) {
                        return (
                          <div
                            key={w.val}
                            onClick={() => !viewingFriend && handleEditCourse(matchedCourse)}
                            style={{
                              backgroundColor: `${matchedCourse.colorHex}22`,
                              borderLeftColor: matchedCourse.colorHex,
                            }}
                            className="p-1 rounded-xl border-l-[3.5px] cursor-pointer hover:brightness-95 active:scale-95 transition-all flex flex-col justify-between overflow-hidden shadow-2xs group"
                            title={`${matchedCourse.name} (${matchedCourse.startTime}-${matchedCourse.endTime}) @ ${matchedCourse.classroom || '未定'}`}
                          >
                            <p
                              style={{ color: matchedCourse.colorHex }}
                              className="text-[10px] font-black leading-tight line-clamp-2 break-all"
                            >
                              {matchedCourse.name}
                            </p>
                            <p className="text-[8px] text-calico-cocoa/60 dark:text-zinc-400 truncate mt-0.5 font-medium">
                              {matchedCourse.classroom || matchedCourse.instructor || '課堂'}
                            </p>
                          </div>
                        );
                      }

                      // 空節次：點擊直接快速加課！
                      return (
                        <button
                          key={w.val}
                          type="button"
                          onClick={() => handleAddSlot(w.val, period.startTime, period.endTime)}
                          className="rounded-xl border border-dashed border-black/10 dark:border-white/10 hover:border-calico-orange/40 hover:bg-calico-orange/5 transition-all group flex items-center justify-center"
                          title={`點擊快速在此節次新增課程（${w.name} ${period.startTime}-${period.endTime}）`}
                        >
                          <Plus className="w-3 h-3 text-calico-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. 本日行程 視圖 (Day & Timeline View) */}
      {/* ======================================================== */}
      {viewMode === 'day' && (
        <div className="space-y-3.5">
          {/* 星期切換分頁列 */}
          <div className="flex items-center justify-between gap-1 p-1 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 shadow-ios-sm">
            {ALL_WEEKDAYS.map((w) => {
              const isSelected = selectedDay === w.val;
              const isToday = w.val === todayDayOfWeek;
              const hasClasses = courses.some((c) => c.dayOfWeek === w.val);
              const dateStr = getDateStringForWeekday(w.val);

              return (
                <button
                  key={w.val}
                  onClick={() => setSelectedDay(w.val)}
                  className={`flex-1 py-1.5 px-0.5 rounded-xl text-center transition-all relative ${
                    isSelected
                      ? 'bg-calico-orange text-white shadow-xs font-black'
                      : 'text-calico-cocoa/70 dark:text-zinc-300 hover:bg-calico-orange/10'
                  }`}
                >
                  <div className="text-[9px] opacity-80 leading-none">{dateStr}</div>
                  <div className="text-xs font-extrabold mt-0.5">{w.name}</div>
                  {/* 小圓點指示當天有課 */}
                  {hasClasses && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-calico-orange absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                  )}
                  {/* 今日小標籤 */}
                  {isToday && !isSelected && (
                    <span className="absolute -top-1 -right-0.5 text-[8px] px-1 rounded-full bg-calico-orange text-white">
                      今
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 即時上課狀態卡片 (Live Status Card - 選定今日才顯示) */}
          {liveStatus && (
            <div
              className={`p-4 rounded-3xl border shadow-ios flex items-center justify-between transition-all ${
                liveStatus.type === 'current'
                  ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-emerald-500/30'
                  : liveStatus.type === 'upcoming'
                  ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-500/30'
                  : 'bg-white/80 dark:bg-calico-darkCard border-black/5 dark:border-white/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2.5 rounded-2xl ${
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
                    <CalendarDays className="w-5 h-5" />
                  ) : (
                    <Coffee className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full ${
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
                        ? '⏱️ 下一節'
                        : '☕ 今日概況'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-calico-cocoa dark:text-zinc-100 mt-1">
                    {liveStatus.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 當日課程清單 (按時間由早至晚排序) */}
          <div className="space-y-2.5">
            {activeCourses
              .filter((c) => c.dayOfWeek === selectedDay)
              .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => !viewingFriend && handleEditCourse(c)}
                  className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios hover:shadow-ios-lg active:scale-98 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3.5">
                    {/* 彩色圓角長條 */}
                    <div
                      className="w-3.5 h-12 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: c.colorHex }}
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-extrabold text-calico-cocoa dark:text-zinc-100">
                          {c.name}
                        </h4>
                        {c.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-calico-cocoa/60 dark:text-zinc-400">
                            {c.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 mt-1.5 text-xs text-calico-cocoa/60 dark:text-zinc-400">
                        {c.classroom && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-calico-orange" />
                            <span>{c.classroom}</span>
                          </span>
                        )}
                        {c.instructor && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{c.instructor}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      style={{ color: c.colorHex }}
                      className="text-xs font-extrabold bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full inline-flex items-center space-x-1"
                    >
                      <Clock className="w-3 h-3" />
                      <span>
                        {c.startTime} - {c.endTime}
                      </span>
                    </span>
                  </div>
                </div>
              ))}

            {/* 空狀態 */}
            {courses.filter((c) => c.dayOfWeek === selectedDay).length === 0 && (
              <div className="text-center py-12 rounded-3xl bg-white/50 dark:bg-zinc-800/30 border border-dashed border-black/10 dark:border-white/10 space-y-3">
                <Coffee className="w-8 h-8 text-calico-cocoa/30 dark:text-zinc-500 mx-auto" />
                <p className="text-sm font-bold text-calico-cocoa/60 dark:text-zinc-400">
                  {ALL_WEEKDAYS.find((w) => w.val === selectedDay)?.name} 沒有排定課程，自習或休息時光！
                </p>
                <button
                  onClick={handleAddNewCourse}
                  className="inline-flex items-center space-x-1 px-4 py-2 rounded-xl bg-calico-orange text-white text-xs font-bold shadow-ios-sm active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>在此日新增課程</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2.5 學分進度與期中期末成績試算 (GPA & Credit Tracker) */}
      {/* ======================================================== */}
      {viewMode === 'grades' && <GradeCalculatorView />}

      {/* ======================================================== */}
      {/* 2.6 待選心願單 / 未來模擬排課 (Course Wishlist Planner) */}
      {/* ======================================================== */}
      {viewMode === 'wishlist' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* 頂部操作：學期篩選、檢視切換與新增 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-xl shrink-0">📋</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 truncate">
                    下學期待選心願單 & 模擬排課
                  </h3>
                  <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                    預先安排修課時間與教室地點 · 衝堂自動偵測 · 一鍵轉正式課表
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* 檢視切換 */}
                <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWishlistViewType('cards')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      wishlistViewType === 'cards'
                        ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    清單卡片
                  </button>
                  <button
                    type="button"
                    onClick={() => setWishlistViewType('grid')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      wishlistViewType === 'grid'
                        ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    模擬課表
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWishlistToEdit(null);
                    setIsWishlistModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all flex items-center space-x-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增待選課</span>
                </button>
              </div>
            </div>

            {/* 學期過濾標籤列 & 學分統計 */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-black/5 dark:border-white/5 text-xs">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1">
                <span className="text-[11px] font-bold text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap">
                  目標學期：
                </span>
                {['全部', ...availableWishlistSemesters.slice(0, 6)].map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                      selectedSemester === sem
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                        : 'bg-black/5 dark:bg-white/5 text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    {sem === '全部' ? '全部' : `${sem}`}
                  </button>
                ))}

                {/* 113~120 學年度全選下拉選單 */}
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="px-2 py-1 rounded-lg text-xs font-black bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 outline-none shrink-0"
                >
                  <option value="全部">全部學期</option>
                  {availableWishlistSemesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem} 學年度
                    </option>
                  ))}
                </select>
              </div>

              {/* 統計學分 */}
              <div className="flex items-center space-x-2 font-mono text-[11px] font-black text-calico-cocoa/80 dark:text-zinc-300">
                <span className="text-indigo-600 dark:text-indigo-400">
                  預選 {filteredWishlist.reduce((sum, w) => sum + w.credits, 0)} 學分
                </span>
                <span>(必 {filteredWishlist.filter((w) => w.category === 'required').reduce((sum, w) => sum + w.credits, 0)} / 選 {filteredWishlist.filter((w) => w.category === 'elective').reduce((sum, w) => sum + w.credits, 0)} / 通 {filteredWishlist.filter((w) => w.category === 'general').reduce((sum, w) => sum + w.credits, 0)})</span>
              </div>
            </div>
          </div>

          {/* 衝堂檢查警示 */}
          {conflictsList.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <span className="font-black flex items-center space-x-1">
                <span>⚠️ 發現 {conflictsList.length} 組預選時段衝堂衝突：</span>
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium">
                {conflictsList.map((c, i) => (
                  <li key={i}>
                    {c.dayName}：<strong>{c.courseA}</strong> ({c.timeA}) 與 <strong>{c.courseB}</strong> ({c.timeB}) 時間重疊！
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 卡片檢視 */}
          {wishlistViewType === 'cards' && (
            <div className="space-y-2.5">
              {filteredWishlist.length === 0 ? (
                <div className="py-8 text-center text-xs text-calico-cocoa/40 border border-dashed border-black/10 dark:border-white/10 rounded-3xl">
                  {selectedSemester} 尚無待選課程，點擊上方「新增待選課」規劃下學期修課吧！
                </div>
              ) : (
                filteredWishlist.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios hover:border-black/10 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <CategoryIcon iconKey={w.emoji} name={w.name} colorHex={w.colorHex || '#6366F1'} size="sm" />
                          <h4 className="text-base font-black text-calico-cocoa dark:text-zinc-100 truncate">
                            {w.name}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-lg font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                            {w.credits} 學分 · {w.category === 'required' ? '必修' : w.category === 'elective' ? '選修' : '通識'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400 whitespace-nowrap">
                            {w.targetSemester}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${
                              w.priority === 'must'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : w.priority === 'high'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-black/5 text-calico-cocoa/50'
                            }`}
                          >
                            {w.priority === 'must' ? '🔥 必搶 / 第一志願' : w.priority === 'high' ? '⭐ 高優先' : w.priority === 'medium' ? '👍 一般' : '備選'}
                          </span>
                        </div>

                        {w.notes && (
                          <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400 mt-1 font-medium">
                            {w.notes}
                          </p>
                        )}
                      </div>

                      {/* 狀態標籤 */}
                      {w.status === 'enrolled' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-black whitespace-nowrap shrink-0">
                          已選上課表 ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => convertWishlistToCourse(w.id)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-2xs transition-all whitespace-nowrap shrink-0 flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>正式選上轉入</span>
                        </button>
                      )}
                    </div>

                    {/* 下排資訊：星期幾、時間、地點教室、授課老師與操作 */}
                    <div className="pt-2.5 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-3 text-calico-cocoa/70 dark:text-zinc-300 flex-wrap gap-y-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-calico-cocoa/40" />
                          <span className="font-bold">
                            {ALL_WEEKDAYS.find((d) => d.val === w.dayOfWeek)?.name || '週一'} {w.startTime}-{w.endTime}
                          </span>
                        </div>
                        {w.classroom && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-calico-cocoa/40" />
                            <span className="font-medium">{w.classroom}</span>
                          </div>
                        )}
                        {w.instructor && (
                          <div className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-calico-cocoa/40" />
                            <span className="font-medium">{w.instructor}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-calico-cocoa/40">
                        <button
                          type="button"
                          onClick={() => {
                            setWishlistToEdit(w);
                            setIsWishlistModalOpen(true);
                          }}
                          className="hover:text-amber-600 font-bold text-xs"
                        >
                          編輯
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => deleteWishlistCourse(w.id)}
                          className="hover:text-rose-500 font-bold text-xs"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 模擬排課視覺課表 */}
          {wishlistViewType === 'grid' && (
            <div className="rounded-3xl bg-white dark:bg-calico-darkCard p-3 border border-black/5 dark:border-white/10 shadow-ios overflow-hidden">
              <div className="w-full">
                {/* 星期標題 */}
                <div className="grid grid-cols-6 gap-1 border-b border-black/5 pb-2 text-center text-xs font-black text-calico-cocoa/70 dark:text-zinc-300">
                  <div className="w-10">節次</div>
                  {ALL_WEEKDAYS.slice(0, 5).map((w) => (
                    <div key={w.val}>{w.name}</div>
                  ))}
                </div>

                {/* 節次行 */}
                <div className="space-y-1 pt-1.5">
                  {PERIOD_SCHEDULE.filter((p) => !p.isNoon).map((period) => (
                    <div key={period.id} className="grid grid-cols-6 gap-1 min-h-[50px] items-stretch">
                      <div className="text-[10px] font-bold text-calico-cocoa/40 text-center flex flex-col justify-center">
                        <span>{period.code}</span>
                        <span className="text-[8px] opacity-75">{period.start}</span>
                      </div>

                      {ALL_WEEKDAYS.slice(0, 5).map((day) => {
                        const matched = filteredWishlist.filter((w) => {
                          if (w.dayOfWeek !== day.val) return false;
                          const wStart = timeToMinutes(w.startTime);
                          const wEnd = timeToMinutes(w.endTime);
                          const pStart = timeToMinutes(period.start);
                          const pEnd = timeToMinutes(period.end);
                          return Math.max(wStart, pStart) < Math.min(wEnd, pEnd);
                        });

                        return (
                          <div
                            key={day.val}
                            className={`p-1 rounded-xl text-left border text-[10px] flex flex-col justify-between transition-all ${
                              matched.length > 1
                                ? 'bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-200'
                                : matched.length === 1
                                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-950 dark:text-indigo-200'
                                : 'bg-black/[0.02] dark:bg-white/[0.02] border-transparent'
                            }`}
                          >
                            {matched.map((m) => (
                              <div key={m.id} className="truncate">
                                <span className="font-black truncate block">{m.name}</span>
                                {m.classroom && <span className="text-[8px] opacity-75 block truncate">{m.classroom}</span>}
                              </div>
                            ))}
                            {matched.length > 1 && (
                              <span className="text-[8px] font-black text-rose-600 block">衝堂!</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. 課程新增 / 編輯 Modal */}
      {/* ======================================================== */}
      <CourseModal
        isOpen={isCourseModalOpen}
        course={modalCourse}
        defaultDay={modalDefaults.day || selectedDay}
        defaultStartTime={modalDefaults.startTime}
        defaultEndTime={modalDefaults.endTime}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={(saved) => {
          if (modalCourse) {
            updateCourse(saved);
          } else {
            addCourse(saved);
          }
        }}
        onDelete={deleteCourse}
      />

      {/* AI OCR 圖片辨識 Modal */}
      <OcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onImportCourses={handleImportOcrCourses}
      />

      {/* 📋 待選課程心願單 Modal */}
      <CourseWishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => {
          setIsWishlistModalOpen(false);
          setWishlistToEdit(null);
        }}
        wishlistToEdit={wishlistToEdit}
      />
    </div>
  );
};
