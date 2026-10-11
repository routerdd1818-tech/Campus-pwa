import React, { useState } from 'react';
import { Course, DayOfWeek } from '../types';
import { X, Trash2, Clock, MapPin, User, BookOpen } from 'lucide-react';

interface CourseModalProps {
  course?: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: Course) => void;
  onDelete?: (id: string) => void;
}

const COLOR_PRESETS = [
  '#E67E22', // Calico Orange
  '#3D2F2E', // Calico Cocoa
  '#48BB78', // Sage Green
  '#3182CE', // Sky Blue
  '#805AD5', // Royal Purple
  '#D53F8C', // Berry Pink
  '#DD6B20', // Amber Terracotta
  '#319795', // Teal
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

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(course?.name || '');
  const [code, setCode] = useState(course?.code || '');
  const [classroom, setClassroom] = useState(course?.classroom || '');
  const [instructor, setInstructor] = useState(course?.instructor || '');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(course?.dayOfWeek || 1);
  const [startTime, setStartTime] = useState(course?.startTime || '09:00');
  const [endTime, setEndTime] = useState(course?.endTime || '12:00');
  const [colorHex, setColorHex] = useState(course?.colorHex || '#E67E22');

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <h3 className="text-lg font-extrabold text-calico-cocoa dark:text-zinc-100 flex items-center space-x-2">
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
            <div className="grid grid-cols-7 gap-1.5">
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

          {/* Color Presets */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              課程主題色彩
            </label>
            <div className="flex items-center space-x-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setColorHex(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    colorHex === color ? 'ring-3 ring-calico-orange ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center space-x-3">
            {course && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(course.id);
                  onClose();
                }}
                className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 active:scale-95 transition-all"
                title="刪除課程"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-calico-orange text-white font-extrabold shadow-sm hover:brightness-105 active:scale-95 transition-all text-sm tracking-wide"
            >
              {course ? '儲存變更' : '新增至課表'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
