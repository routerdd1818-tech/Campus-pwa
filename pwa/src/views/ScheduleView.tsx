import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Course, DayOfWeek } from '../types';
import { CourseModal } from '../components/CourseModal';
import { OcrModal } from '../components/OcrModal';
import { Plus, Sparkles, Calendar, ListFilter, MapPin, User, Clock } from 'lucide-react';

const WEEKDAYS = [
  { val: 1, name: '週一', short: '一' },
  { val: 2, name: '週二', short: '二' },
  { val: 3, name: '週三', short: '三' },
  { val: 4, name: '週四', short: '四' },
  { val: 5, name: '週五', short: '五' },
  { val: 6, name: '週六', short: '六' },
  { val: 7, name: '週日', short: '日' },
];

const PERIOD_HOURS = [
  { p: 1, start: '08:10', end: '09:00' },
  { p: 2, start: '09:10', end: '10:00' },
  { p: 3, start: '10:20', end: '11:10' },
  { p: 4, start: '11:20', end: '12:10' },
  { p: 5, start: '13:30', end: '14:20' },
  { p: 6, start: '14:30', end: '15:20' },
  { p: 7, start: '15:30', end: '16:20' },
  { p: 8, start: '16:30', end: '17:20' },
  { p: 9, start: '17:30', end: '18:20' },
];

export const ScheduleView: React.FC = () => {
  const { courses, addCourse, updateCourse, deleteCourse } = useApp();
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const jsDay = new Date().getDay();
    return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
  });

  const [modalCourse, setModalCourse] = useState<Course | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const handleEditCourse = (course: Course) => {
    setModalCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleAddNewCourse = () => {
    setModalCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleImportOcrCourses = async (importedList: Course[]) => {
    for (const c of importedList) {
      await addCourse(c);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-2">
        {/* Toggle Mode Segmented Control */}
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
          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-2xl bg-calico-orange/15 text-calico-orange font-bold text-xs hover:bg-calico-orange/20 active:scale-95 transition-all shadow-ios-sm"
            title="AI 課表辨識"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI 圖片辨識</span>
            <span className="sm:hidden">AI 辨識</span>
          </button>

          <button
            onClick={handleAddNewCourse}
            className="flex items-center space-x-1 px-3 py-2 rounded-2xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
          >
            <Plus className="w-4 h-4" />
            <span>加課</span>
          </button>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="rounded-3xl bg-white/80 dark:bg-calico-darkCard/80 backdrop-blur-md p-3.5 border border-black/5 dark:border-white/10 shadow-ios overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-6 gap-1 text-center pb-2 border-b border-black/5 dark:border-white/5">
            <div className="text-[11px] font-bold text-calico-cocoa/40 py-1">節次</div>
            {WEEKDAYS.slice(0, 5).map((w) => {
              const isToday =
                new Date().getDay() === (w.val === 7 ? 0 : w.val);
              return (
                <div
                  key={w.val}
                  className={`py-1 rounded-xl text-xs font-extrabold ${
                    isToday
                      ? 'bg-calico-orange text-white shadow-xs'
                      : 'text-calico-cocoa/80 dark:text-zinc-300'
                  }`}
                >
                  {w.name}
                </div>
              );
            })}
          </div>

          {/* Time & Courses Matrix */}
          <div className="mt-2 space-y-1.5">
            {PERIOD_HOURS.map((period) => (
              <div key={period.p} className="grid grid-cols-6 gap-1 min-h-[46px] items-stretch">
                {/* Period column */}
                <div className="flex flex-col items-center justify-center py-1 text-center rounded-xl bg-calico-cream/60 dark:bg-zinc-800/40">
                  <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
                    {period.p}
                  </span>
                  <span className="text-[9px] text-calico-cocoa/50 font-medium">
                    {period.start}
                  </span>
                </div>

                {/* Day 1 - 5 columns */}
                {[1, 2, 3, 4, 5].map((dayNum) => {
                  const dayCourses = courses.filter((c) => c.dayOfWeek === dayNum);
                  // Find course active at this time
                  const currentCourse = dayCourses.find((c) => {
                    const startH = parseInt(c.startTime.split(':')[0], 10);
                    const periodH = parseInt(period.start.split(':')[0], 10);
                    const endH = parseInt(c.endTime.split(':')[0], 10);
                    return periodH >= startH && periodH < endH;
                  });

                  if (currentCourse) {
                    return (
                      <div
                        key={dayNum}
                        onClick={() => handleEditCourse(currentCourse)}
                        style={{
                          backgroundColor: `${currentCourse.colorHex}20`,
                          borderLeftColor: currentCourse.colorHex,
                        }}
                        className="p-1.5 rounded-xl border-l-4 cursor-pointer hover:brightness-95 active:scale-95 transition-all flex flex-col justify-between overflow-hidden shadow-2xs"
                      >
                        <p
                          style={{ color: currentCourse.colorHex }}
                          className="text-[11px] font-black leading-tight truncate"
                        >
                          {currentCourse.name}
                        </p>
                        <p className="text-[9px] text-calico-cocoa/60 dark:text-zinc-400 truncate">
                          {currentCourse.classroom || '教室未定'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={dayNum}
                      className="rounded-xl border border-dashed border-black/5 dark:border-white/5 hover:border-calico-orange/30 transition-colors"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day List View */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {/* Weekday Switcher Tabs */}
          <div className="flex items-center justify-between gap-1 p-1 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-black/5 dark:border-white/10 shadow-ios-sm">
            {WEEKDAYS.map((w) => {
              const isSelected = selectedDay === w.val;
              const hasClasses = courses.some((c) => c.dayOfWeek === w.val);
              return (
                <button
                  key={w.val}
                  onClick={() => setSelectedDay(w.val as DayOfWeek)}
                  className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all relative ${
                    isSelected
                      ? 'bg-calico-orange text-white shadow-xs'
                      : 'text-calico-cocoa/70 dark:text-zinc-400 hover:bg-calico-orange/10'
                  }`}
                >
                  <span>{w.name}</span>
                  {hasClasses && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-calico-orange absolute bottom-1 left-1/2 -translate-x-1/2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Classes on Selected Day */}
          <div className="space-y-2.5">
            {courses
              .filter((c) => c.dayOfWeek === selectedDay)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleEditCourse(c)}
                  className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios hover:shadow-ios-lg active:scale-98 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className="w-3.5 h-12 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: c.colorHex }}
                    />
                    <div>
                      <h4 className="text-base font-extrabold text-calico-cocoa dark:text-zinc-100">
                        {c.name}
                      </h4>
                      <div className="flex items-center space-x-3 mt-1 text-xs text-calico-cocoa/60 dark:text-zinc-400">
                        {c.classroom && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5" />
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

                  <div className="text-right">
                    <span
                      style={{ color: c.colorHex }}
                      className="text-xs font-extrabold bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full inline-flex items-center space-x-1"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{c.startTime} - {c.endTime}</span>
                    </span>
                  </div>
                </div>
              ))}

            {courses.filter((c) => c.dayOfWeek === selectedDay).length === 0 && (
              <div className="text-center py-12 rounded-3xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                <p className="text-sm font-bold text-calico-cocoa/60 dark:text-zinc-400">
                  今天沒有排定課程，盡情享受自習或休息時光！☕️
                </p>
                <button
                  onClick={handleAddNewCourse}
                  className="mt-3 inline-flex items-center space-x-1 px-4 py-2 rounded-xl bg-calico-orange text-white text-xs font-bold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增課程</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CourseModal
        isOpen={isCourseModalOpen}
        course={modalCourse}
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

      <OcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onImportCourses={handleImportOcrCourses}
      />
    </div>
  );
};
