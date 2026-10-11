import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Course, DayOfWeek } from '../types';
import { CourseModal } from '../components/CourseModal';
import { OcrModal } from '../components/OcrModal';
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
  { id: 100, name: '中午', code: '中午', start: '12:10', end: '13:20', isNoon: true },
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
  const { courses, addCourse, updateCourse, deleteCourse } = useApp();

  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [includeWeekend, setIncludeWeekend] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);

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

  // Active displayed weekdays
  const displayedDays = useMemo(() => {
    return includeWeekend ? ALL_WEEKDAYS : ALL_WEEKDAYS.slice(0, 5);
  }, [includeWeekend]);

  // Today's DayOfWeek
  const todayDayOfWeek = useMemo(() => {
    const js = new Date().getDay();
    return (js === 0 ? 7 : js) as DayOfWeek;
  }, []);

  // Determine if a course matches a given period
  const matchesPeriod = (course: Course, period: PeriodDef): boolean => {
    const cStart = timeToMinutes(course.startTime);
    const cEnd = timeToMinutes(course.endTime);
    const pStart = timeToMinutes(period.start);
    const pEnd = timeToMinutes(period.end);

    if (period.isNoon) {
      // Allow flexible noon span 12:00~13:30
      const noonWindowStart = Math.min(pStart, 12 * 60);
      const noonWindowEnd = Math.max(pEnd, 13 * 60 + 30);
      const overlap = Math.min(cEnd, noonWindowEnd) - Math.max(cStart, noonWindowStart);
      return overlap >= 10 || (cStart >= 12 * 60 && cStart < 13 * 60 + 30);
    }

    return cStart < pEnd && cEnd > pStart;
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
    const todayCourses = courses
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
  }, [courses, selectedDay, todayDayOfWeek]);

  return (
    <div className="space-y-4 pb-24">
      {/* 頂部操作與視圖切換列 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* 週課表 vs 本日行程 */}
        <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              viewMode === 'week'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            週課表
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              viewMode === 'day'
                ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            本日行程
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2">
          {viewMode === 'week' && (
            <>
              {/* 5天 / 7天切換 */}
              <button
                onClick={() => setIncludeWeekend((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  includeWeekend
                    ? 'bg-calico-cocoa text-white border-calico-cocoa'
                    : 'bg-white/80 dark:bg-zinc-800 border-black/10 dark:border-white/10 text-calico-cocoa/80 dark:text-zinc-300'
                }`}
                title="切換是否顯示週六與週日"
              >
                {includeWeekend ? '含週末 (7天)' : '僅工作日 (5天)'}
              </button>

              {/* 全屏完整 vs 自由滾動 */}
              <button
                onClick={() => setFitToScreen((prev) => !prev)}
                className={`hidden sm:inline-flex px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  fitToScreen
                    ? 'bg-calico-orange/15 text-calico-orange border-calico-orange/30'
                    : 'bg-white/80 dark:bg-zinc-800 border-black/10 dark:border-white/10 text-calico-cocoa/80 dark:text-zinc-300'
                }`}
                title="切換適配螢幕或水平橫向滑動"
              >
                {fitToScreen ? '全屏完整' : '自由滾動'}
              </button>
            </>
          )}

          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-calico-orange/15 text-calico-orange font-bold text-xs hover:bg-calico-orange/20 active:scale-95 transition-all shadow-2xs"
            title="AI 課表辨識"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI 圖片辨識</span>
            <span className="sm:hidden">AI 辨識</span>
          </button>

          <button
            onClick={handleAddNewCourse}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
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
                <div className="flex flex-col items-center justify-center py-1 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/40 text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400">
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
                {PERIOD_SCHEDULE.map((period) => (
                  <div
                    key={period.id}
                    className={`grid gap-1 items-stretch ${
                      displayedDays.length === 7 ? 'grid-cols-8' : 'grid-cols-6'
                    } ${period.isNoon ? 'min-h-[46px]' : 'min-h-[52px]'}`}
                  >
                    {/* 節次編號與時間標籤 */}
                    <div
                      className={`flex flex-col items-center justify-center p-1 rounded-xl text-center border transition-colors ${
                        period.isNoon
                          ? 'bg-calico-orange/15 border-calico-orange/30 text-calico-orange font-bold'
                          : 'bg-calico-cream/70 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 text-calico-cocoa/80 dark:text-zinc-300'
                      }`}
                    >
                      <span className={`leading-none font-black ${period.isNoon ? 'text-[11px]' : 'text-xs'}`}>
                        {period.code}
                      </span>
                      <span className="text-[8px] opacity-75 mt-0.5 leading-none font-medium">
                        {period.start}
                      </span>
                    </div>

                    {/* 當節各星期的課程儲存格 */}
                    {displayedDays.map((w) => {
                      const dayCourses = courses.filter((c) => c.dayOfWeek === w.val);
                      const matchedCourse = dayCourses.find((c) => matchesPeriod(c, period));

                      if (matchedCourse) {
                        return (
                          <div
                            key={w.val}
                            onClick={() => handleEditCourse(matchedCourse)}
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
                          onClick={() => handleAddSlot(w.val, period.start, period.end)}
                          className="rounded-xl border border-dashed border-black/10 dark:border-white/10 hover:border-calico-orange/40 hover:bg-calico-orange/5 transition-all group flex items-center justify-center"
                          title={`點擊快速在此節次新增課程（${w.name} ${period.start}-${period.end}）`}
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
            {courses
              .filter((c) => c.dayOfWeek === selectedDay)
              .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleEditCourse(c)}
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
    </div>
  );
};
