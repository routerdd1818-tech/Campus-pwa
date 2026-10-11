import React, { useState, useMemo } from 'react';
import { Course, DayOfWeek } from '../types';
import { useApp } from '../context/AppContext';
import { X, Trash2, Clock, MapPin, User, BookOpen, Sparkles } from 'lucide-react';

interface CourseModalProps {
  course?: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: Course) => void;
  onDelete?: (id: string) => void;
  defaultDay?: DayOfWeek;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

const COLOR_PRESETS = [
  '#E67E22', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3182CE', '#3B82F6',
  '#6366F1', '#805AD5', '#8B5CF6', '#A855F7',
  '#D53F8C', '#EC4899', '#EF4444', '#78716C', '#3D2F2E',
];

const WEEKDAY_NAMES = [
  { val: 1, label: '週一' },
  { val: 2, label: '週二' },
  { val: 3, label: '週三' },
  { val: 4, label: '週四' },
  { val: 5, label: '週五' },
  { val: 6, label: '週六' },
  { val: 7, label: '週日' },
];

const PERIOD_PRESETS = [
  { label: '第1節', start: '08:10', end: '09:00' },
  { label: '第2節', start: '09:10', end: '10:00' },
  { label: '第3節', start: '10:10', end: '11:00' },
  { label: '第4節', start: '11:10', end: '12:00' },
  { label: '中午', start: '12:10', end: '13:20' },
  { label: '第5節', start: '13:20', end: '14:10' },
  { label: '第6節', start: '14:20', end: '15:10' },
  { label: '第7節', start: '15:30', end: '16:20' },
  { label: '第8節', start: '16:30', end: '17:20' },
  { label: '第9節', start: '17:30', end: '18:20' },
  { label: '第10節', start: '18:30', end: '19:20' },
];

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultDay = 1,
  defaultStartTime,
  defaultEndTime,
}) => {
  const { classPeriods } = useApp();
  const presets = useMemo(() => {
    if (classPeriods && classPeriods.length > 0) {
      return classPeriods.map((p) => ({
        label: p.name,
        start: p.startTime,
        end: p.endTime,
      }));
    }
    return PERIOD_PRESETS;
  }, [classPeriods]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [classroom, setClassroom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(defaultDay);
  const [startTime, setStartTime] = useState(defaultStartTime || '09:10');
  const [endTime, setEndTime] = useState(defaultEndTime || '12:00');
  const [colorHex, setColorHex] = useState('#E67E22');

  React.useEffect(() => {
    if (isOpen) {
      setName(course?.name || '');
      setCode(course?.code || '');
      setClassroom(course?.classroom || '');
      setInstructor(course?.instructor || '');
      setDayOfWeek(course?.dayOfWeek || defaultDay);
      setStartTime(course?.startTime || defaultStartTime || '09:10');
      setEndTime(course?.endTime || defaultEndTime || '12:00');
      setColorHex(course?.colorHex || '#E67E22');
    }
  }, [isOpen, course, defaultDay, defaultStartTime, defaultEndTime]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: course?.id || `course_${Date.now()}`,
      name: name.trim(),
      code: code.trim(),
      classroom: classroom.trim(),
      instructor: instructor.trim(),
      dayOfWeek,
      startTime,
      endTime,
      colorHex,
      isSharedWithFriends: true,
    });
    onClose();
  };

  const applyPeriodPreset = (p: { start: string; end: string }) => {
    setStartTime(p.start);
    setEndTime(p.end);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <h3 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-calico-orange" />
            <span>{course ? '編輯課程' : '新增課程'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Course Name */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              課程名稱 *
            </label>
            <input
              type="text"
              required
              placeholder="例如：演算法、經濟學原理"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
          </div>

          {/* Classroom & Instructor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>上課教室</span>
              </label>
              <input
                type="text"
                placeholder="例如：綜三 101"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5" />
                <span>授課教授</span>
              </label>
              <input
                type="text"
                placeholder="例如：陳教授"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              上課星期
            </label>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_NAMES.map((w) => (
                <button
                  type="button"
                  key={w.val}
                  onClick={() => setDayOfWeek(w.val as DayOfWeek)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    dayOfWeek === w.val
                      ? 'bg-calico-orange text-white shadow-sm scale-105'
                      : 'bg-calico-cream/80 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-400 hover:bg-calico-orange/10'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period quick preset chips */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>節次快捷設定</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => applyPeriodPreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[11px] font-bold text-calico-cocoa/75 dark:text-zinc-300 hover:bg-calico-orange/20 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>開始時間</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>結束時間</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
          </div>

          {/* Color Presets & Custom Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400">
                課程主題色彩（預設或自訂）
              </label>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-mono font-bold text-calico-cocoa/60 dark:text-zinc-400 uppercase">
                  {colorHex}
                </span>
                <div
                  className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20"
                  style={{ backgroundColor: colorHex }}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none">
              <label
                className="relative flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed border-calico-orange/60 bg-calico-orange/10 cursor-pointer shrink-0 hover:scale-105 active:scale-95 transition-all shadow-2xs"
                title="點擊自訂任意顏色"
              >
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <Sparkles className="w-3.5 h-3.5 text-calico-orange" />
              </label>

              {COLOR_PRESETS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setColorHex(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full transition-transform shrink-0 ${
                    colorHex === color
                      ? 'ring-3 ring-calico-orange ring-offset-2 scale-110 shadow-sm'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons (Generous bottom spacing so never blocked by TabBar!) */}
          <div className="pt-4 flex items-center space-x-3">
            {course && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(course.id);
                  onClose();
                }}
                className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 active:scale-95 transition-all shrink-0"
                title="刪除課程"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 rounded-xl bg-calico-orange text-white font-extrabold shadow-sm hover:brightness-105 active:scale-95 transition-all text-sm tracking-wide"
            >
              {course ? '儲存變更' : '新增至課表'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
