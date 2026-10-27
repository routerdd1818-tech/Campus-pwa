import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CourseWishlistItem, CreditCategory, DayOfWeek } from '../types';
import { EmojiColorPicker, MODERN_PALETTE } from './EmojiColorPicker';
import { X, Calendar, Clock, MapPin, User, Bookmark } from 'lucide-react';

interface CourseWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistToEdit?: CourseWishlistItem | null;
}

const WEEKDAYS: { val: DayOfWeek; name: string }[] = [
  { val: 1, name: '週一' },
  { val: 2, name: '週二' },
  { val: 3, name: '週三' },
  { val: 4, name: '週四' },
  { val: 5, name: '週五' },
  { val: 6, name: '週六' },
  { val: 7, name: '週日' },
];

const PERIOD_PRESETS = [
  { label: '上午 1-2 節 (08:10-10:00)', start: '08:10', end: '10:00' },
  { label: '上午 2-4 節 (09:10-12:00)', start: '09:10', end: '12:00' },
  { label: '下午 5-6 節 (13:20-15:10)', start: '13:20', end: '15:10' },
  { label: '下午 5-7 節 (13:20-16:20)', start: '13:20', end: '16:20' },
  { label: '下午 7-8 節 (15:30-17:20)', start: '15:30', end: '17:20' },
  { label: '夜間 9-10 節 (17:30-19:20)', start: '17:30', end: '19:20' },
];

export const ALL_SEMESTERS_UP_TO_120: string[] = [];
for (let y = 113; y <= 120; y++) {
  ALL_SEMESTERS_UP_TO_120.push(`${y}-1`);
  ALL_SEMESTERS_UP_TO_120.push(`${y}-2`);
}

export const CourseWishlistModal: React.FC<CourseWishlistModalProps> = ({
  isOpen,
  onClose,
  wishlistToEdit,
}) => {
  const { addWishlistCourse, updateWishlistCourse } = useApp();

  const [name, setName] = useState('');
  const [targetSemester, setTargetSemester] = useState('115-2');
  const [credits, setCredits] = useState('3');
  const [category, setCategory] = useState<CreditCategory>('required');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(1);
  const [startTime, setStartTime] = useState('09:10');
  const [endTime, setEndTime] = useState('12:00');
  const [classroom, setClassroom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [priority, setPriority] = useState<CourseWishlistItem['priority']>('must');
  const [colorHex, setColorHex] = useState(MODERN_PALETTE[0].hex);
  const [emoji, setEmoji] = useState('book');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (wishlistToEdit) {
        setName(wishlistToEdit.name);
        setTargetSemester(wishlistToEdit.targetSemester || '115-2');
        setCredits(String(wishlistToEdit.credits));
        setCategory(wishlistToEdit.category || 'required');
        setDayOfWeek(wishlistToEdit.dayOfWeek || 1);
        setStartTime(wishlistToEdit.startTime || '09:10');
        setEndTime(wishlistToEdit.endTime || '12:00');
        setClassroom(wishlistToEdit.classroom || '');
        setInstructor(wishlistToEdit.instructor || '');
        setPriority(wishlistToEdit.priority || 'must');
        setColorHex(wishlistToEdit.colorHex || MODERN_PALETTE[0].hex);
        setEmoji(wishlistToEdit.emoji || 'book');
        setNotes(wishlistToEdit.notes || '');
      } else {
        setName('');
        setTargetSemester('115-2');
        setCredits('3');
        setCategory('required');
        setDayOfWeek(1);
        setStartTime('09:10');
        setEndTime('12:00');
        setClassroom('');
        setInstructor('');
        setPriority('must');
        setColorHex(MODERN_PALETTE[0].hex);
        setEmoji('book');
        setNotes('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, wishlistToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('請輸入待選課程名稱');
      return;
    }

    const payload: CourseWishlistItem = {
      id: wishlistToEdit?.id || `cw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      targetSemester: targetSemester.trim() || '115-2',
      credits: Math.max(0, Number(credits) || 0),
      category,
      dayOfWeek,
      startTime,
      endTime,
      classroom: classroom.trim() || undefined,
      instructor: instructor.trim() || undefined,
      colorHex,
      emoji,
      priority,
      status: wishlistToEdit?.status || 'wishlist',
      notes: notes.trim() || undefined,
      createdAt: wishlistToEdit?.createdAt || new Date().toISOString(),
    };

    if (wishlistToEdit) {
      updateWishlistCourse(payload);
    } else {
      addWishlistCourse(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-3xl bg-white dark:bg-calico-darkCard border border-black/10 dark:border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                {wishlistToEdit ? '編輯待選課程' : '新增未來待選課程'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                規劃下學期修課時間、地點教室、學分與搶課志願序
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400 font-bold flex items-center justify-center hover:bg-black/10 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-bold">
              {errorMsg}
            </div>
          )}

          {/* 課程名稱與學期 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                課程名稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：演算法、近代物理、經濟學"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                預計學期 (至120年)
              </label>
              <select
                value={ALL_SEMESTERS_UP_TO_120.includes(targetSemester) ? targetSemester : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setTargetSemester(e.target.value);
                  }
                }}
                className="w-full px-2.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
              >
                {ALL_SEMESTERS_UP_TO_120.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem} 學年度
                  </option>
                ))}
                <option value="custom">自訂學期...</option>
              </select>
            </div>
          </div>

          {/* 常用學期快捷標籤與自訂學期輸入 */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1">
              <span className="text-[10px] font-bold text-calico-cocoa/40 shrink-0">快捷學期:</span>
              {['115-2', '116-1', '116-2', '117-1', '118-1', '119-1', '120-1', '120-2'].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setTargetSemester(sem)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all shrink-0 ${
                    targetSemester === sem
                      ? 'bg-indigo-500 text-white shadow-2xs font-black'
                      : 'bg-black/5 dark:bg-white/5 text-calico-cocoa/60 hover:text-calico-cocoa'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="text-[10px] text-calico-cocoa/50">自訂:</span>
              <input
                type="text"
                value={targetSemester}
                onChange={(e) => setTargetSemester(e.target.value)}
                placeholder="115-2"
                className="w-16 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-center text-calico-cocoa dark:text-zinc-100 outline-none"
              />
            </div>
          </div>

          {/* 學分屬性 與 學分數 與 志願序 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                學分屬性
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CreditCategory)}
                className="w-full px-2.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
              >
                <option value="required">必修</option>
                <option value="elective">選修</option>
                <option value="general">通識</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                學分數
              </label>
              <input
                type="number"
                min={0}
                max={12}
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-full px-2.5 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-black text-center text-calico-cocoa dark:text-zinc-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                搶課志願序
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CourseWishlistItem['priority'])}
                className="w-full px-2 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
              >
                <option value="must">必搶 / 第一志願 🔥</option>
                <option value="high">高優先 ⭐</option>
                <option value="medium">一般考慮 👍</option>
                <option value="low">備選備案 🍃</option>
              </select>
            </div>
          </div>

          {/* 預計修課時間：星期幾與節次 */}
          <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 space-y-3">
            <label className="text-xs font-black text-calico-cocoa dark:text-zinc-100 block">
              🗓️ 預計上課時間與星期
            </label>

            {/* 星期幾切換按鈕 */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => {
                const isSelected = dayOfWeek === w.val;
                return (
                  <button
                    key={w.val}
                    type="button"
                    onClick={() => setDayOfWeek(w.val)}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-black/5 dark:bg-white/5 text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    {w.name}
                  </button>
                );
              })}
            </div>

            {/* 常用節次快速帶入 */}
            <div>
              <span className="text-[10px] font-bold text-calico-cocoa/40 dark:text-zinc-500 block mb-1">
                常用節次快速套用：
              </span>
              <div className="flex flex-wrap gap-1">
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setStartTime(p.start);
                      setEndTime(p.end);
                    }}
                    className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-indigo-500/15 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-300 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 開始與結束時間 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block mb-1">
                  開始時間
                </span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-center text-calico-cocoa dark:text-zinc-100 outline-none"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block mb-1">
                  結束時間
                </span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-center text-calico-cocoa dark:text-zinc-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 教室地點與授課教師 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                上課教室 / 地點
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  placeholder="例: 資工館201、博雅102"
                  className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-indigo-500"
                />
                <MapPin className="w-3.5 h-3.5 text-calico-cocoa/40 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                授課教師
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="例: 林教授、張老師"
                  className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-indigo-500"
                />
                <User className="w-3.5 h-3.5 text-calico-cocoa/40 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Emoji 與代表色 */}
          <EmojiColorPicker
            selectedEmoji={emoji}
            onSelectEmoji={setEmoji}
            selectedColor={colorHex}
            onSelectColor={setColorHex}
            label="課程代表 Emoji 與主題色"
          />

          {/* 備註與搶課加簽提醒 */}
          <div>
            <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
              選課備註與提醒 (選填)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例: 限大二以上、已寫信申請人工授權碼、開學第一週需出席"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-medium text-calico-cocoa dark:text-zinc-100 outline-none focus:border-indigo-500"
            />
          </div>

          {/* 底部按鈕 */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold text-xs hover:bg-black/10 transition-all whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-black text-xs shadow-md hover:from-indigo-600 hover:to-blue-700 transition-all whitespace-nowrap"
            >
              {wishlistToEdit ? '儲存變更' : '加入待選心願單'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
