import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { X, Calendar, Clock, Tag, FileText, Trash2, Sparkles, Check, Users } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  event?: CalendarEvent | null;
  defaultDate?: string; // YYYY-MM-DD
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
}

const COLOR_PALETTE = [
  '#E67E22', // 活力橘
  '#F97316', // 暖陽橙
  '#F59E0B', // 琥珀金
  '#EAB308', // 檸檬黃
  '#84CC16', // 萊姆綠
  '#22C55E', // 翠綠
  '#10B981', // 薄荷綠
  '#14B8A6', // 湖水綠
  '#06B6D4', // 青天藍
  '#0EA5E9', // 天空藍
  '#3182CE', // 晴空藍
  '#3B82F6', // 皇家藍
  '#6366F1', // 靛藍
  '#805AD5', // 薰衣草紫
  '#8B5CF6', // 紫羅蘭
  '#A855F7', // 魅紫
  '#D53F8C', // 櫻花粉
  '#EC4899', // 玫瑰粉
  '#EF4444', // 珊瑚紅
  '#78716C', // 暖石灰
  '#3D2F2E', // 可可棕
];

const CATEGORIES = ['考試', '活動', '連假', '專案', '生活', '紀念日', '出遊'];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  event,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(defaultDate || todayStr);
  const [endDate, setEndDate] = useState(defaultDate || todayStr);
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [category, setCategory] = useState('活動');
  const [colorHex, setColorHex] = useState('#E67E22');
  const [notes, setNotes] = useState('');
  const [isSharedWithFriends, setIsSharedWithFriends] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitle(event.title);
        setStartDate(event.startDate);
        setEndDate(event.endDate || event.startDate);
        setIsAllDay(event.isAllDay);
        setStartTime(event.startTime || '09:00');
        setEndTime(event.endTime || '17:00');
        setCategory(event.category || '活動');
        setColorHex(event.colorHex || '#E67E22');
        setNotes(event.notes || '');
        setIsSharedWithFriends(event.isSharedWithFriends ?? true);
      } else {
        const d = defaultDate || todayStr;
        setTitle('');
        setStartDate(d);
        setEndDate(d);
        setIsAllDay(true);
        setStartTime('09:00');
        setEndTime('17:00');
        setCategory('活動');
        setColorHex('#E67E22');
        setNotes('');
        setIsSharedWithFriends(true);
      }
    }
  }, [isOpen, event, defaultDate, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    // Ensure endDate is not earlier than startDate
    const finalEndDate = endDate >= startDate ? endDate : startDate;

    onSave({
      id: event?.id || `event_${Date.now()}`,
      title: title.trim(),
      startDate,
      endDate: finalEndDate,
      isAllDay,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      category,
      colorHex,
      notes: notes.trim(),
      isSharedWithFriends,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                {event ? '編輯行事曆活動' : '新增行事曆區間活動'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                TimeTree 風格彩色時間區間橫幅
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              活動名稱 *
            </label>
            <input
              type="text"
              required
              placeholder="例如：期中考週、系大露營、專題展、台北旅行..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
          </div>

          {/* Date Range: Start Date & End Date */}
          <div className="p-3.5 rounded-2xl bg-calico-cream/40 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-calico-orange" />
                <span>時間區間（支援跨天連續橫幅）</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAllDay(!isAllDay)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  isAllDay
                    ? 'bg-calico-orange text-white'
                    : 'bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                {isAllDay ? '全天 / 跨天' : '指定具體時間'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 min-w-0 w-full">
              <div className="min-w-0">
                <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1">
                  開始日期
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full min-w-0 max-w-full px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold appearance-none [-webkit-appearance:none]"
                  style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1">
                  結束日期
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full min-w-0 max-w-full px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold appearance-none [-webkit-appearance:none]"
                  style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* If not all day, time pickers */}
            {!isAllDay && (
              <div className="grid grid-cols-2 gap-2 min-w-0 w-full pt-1">
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>開始時間</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full min-w-0 max-w-full px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold appearance-none [-webkit-appearance:none]"
                    style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>結束時間</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full min-w-0 max-w-full px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold appearance-none [-webkit-appearance:none]"
                    style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5" />
              <span>活動類別</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    category === cat
                      ? 'bg-calico-orange text-white shadow-xs'
                      : 'bg-calico-cream/60 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-400 hover:bg-calico-orange/15'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette (TimeTree Style & Custom Color) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400">
                橫幅代表色（點選預設或自訂顏色）
              </label>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-mono font-bold text-calico-cocoa/60 dark:text-zinc-400 uppercase">
                  {colorHex}
                </span>
                <div
                  className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-2xs"
                  style={{ backgroundColor: colorHex }}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none">
              {/* Custom Color Button */}
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

              {COLOR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColorHex(hex)}
                  style={{ backgroundColor: hex }}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center shrink-0 ${
                    colorHex === hex
                      ? 'scale-115 ring-2 ring-offset-2 ring-calico-orange shadow-sm'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {colorHex === hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>備註說明</span>
            </label>
            <textarea
              rows={2}
              placeholder="攜帶物品、行程細節或地點備忘..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50 resize-none"
            />
          </div>

          {/* Friend Sharing Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-calico-cream/40 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-calico-orange" />
              <div>
                <p className="text-xs font-bold text-calico-cocoa dark:text-zinc-200">好友共享可見</p>
                <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">輸入代碼的朋友可在行事曆看到此活動</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isSharedWithFriends}
              onChange={(e) => setIsSharedWithFriends(e.target.checked)}
              className="w-4 h-4 rounded text-calico-orange focus:ring-calico-orange/40"
            />
          </div>

          {/* Submit & Delete Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-calico-orange text-white font-extrabold shadow-ios active:scale-95 transition-all text-sm tracking-wide hover:brightness-105"
            >
              {event ? '儲存變更' : '建立區間活動'}
            </button>

            {event && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(event.id);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all text-xs flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除此活動</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
