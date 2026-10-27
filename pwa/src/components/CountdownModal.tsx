import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { CountdownItem } from '../types';
import { EmojiColorPicker } from './EmojiColorPicker';
import { Hourglass, X, Calendar, Pin } from 'lucide-react';

interface CountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  countdownToEdit?: CountdownItem | null;
}

const QUICK_TITLES = ['期末考週歐趴', '大學畢業典禮', '專案成果發表', '出國交換出發', '信用卡繳款日', '重要紀念日'];

const CATEGORIES: { key: CountdownItem['category']; label: string; icon: string }[] = [
  { key: 'exam', label: '考試檢定', icon: '📝' },
  { key: 'finance', label: '繳費財務', icon: '💳' },
  { key: 'life', label: '校園生活', icon: '🎓' },
  { key: 'anniversary', label: '紀念日', icon: '🎂' },
  { key: 'other', label: '其他倒數', icon: '⏳' },
];

export const CountdownModal: React.FC<CountdownModalProps> = ({
  isOpen,
  onClose,
  countdownToEdit,
}) => {
  const { addCountdown, updateCountdown } = useApp();

  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [category, setCategory] = useState<CountdownItem['category']>('exam');
  const [emoji, setEmoji] = useState('🎓');
  const [colorHex, setColorHex] = useState('#F59E0B');
  const [isPinned, setIsPinned] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (countdownToEdit) {
        setTitle(countdownToEdit.title);
        setTargetDate(countdownToEdit.targetDate);
        setCategory(countdownToEdit.category);
        setEmoji(countdownToEdit.emoji || '⏳');
        setColorHex(countdownToEdit.colorHex || '#F59E0B');
        setIsPinned(Boolean(countdownToEdit.isPinned));
        setNotes(countdownToEdit.notes || '');
      } else {
        setTitle('');
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setTargetDate(d.toISOString().slice(0, 10));
        setCategory('exam');
        setEmoji('🎓');
        setColorHex('#F59E0B');
        setIsPinned(false);
        setNotes('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, countdownToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入倒數日名稱');
      return;
    }
    if (!targetDate) {
      setErrorMsg('請選擇目標日期');
      return;
    }

    if (countdownToEdit) {
      updateCountdown({
        ...countdownToEdit,
        title: title.trim(),
        targetDate,
        category,
        emoji,
        colorHex,
        isPinned,
        notes: notes.trim() || undefined,
      });
    } else {
      addCountdown({
        id: `cd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        targetDate,
        category,
        emoji,
        colorHex,
        isPinned,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-calico-darkCard w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-ios-2xl border border-black/5 dark:border-white/10 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {countdownToEdit ? '編輯校園倒數日' : '新增校園倒數日'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                期中期末考 · 畢業典禮 · 財務繳費 · 重要約定
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-12 sm:pb-6">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-bold animate-fade-in">
              {errorMsg}
            </div>
          )}

          {/* Quick template title chips */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              常用範本快速套用
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTitle(t);
                    if (t.includes('期末考')) {
                      setCategory('exam');
                      setEmoji('📝');
                      setColorHex('#10B981');
                    } else if (t.includes('畢業')) {
                      setCategory('life');
                      setEmoji('🎓');
                      setColorHex('#F59E0B');
                    } else if (t.includes('繳款')) {
                      setCategory('finance');
                      setEmoji('💳');
                      setColorHex('#3B82F6');
                    } else if (t.includes('出國')) {
                      setCategory('life');
                      setEmoji('✈️');
                      setColorHex('#06B6D4');
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-calico-orange/15 hover:text-calico-orange text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-300 transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              倒數事件名稱 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：期末考週結束、畢業典禮"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
            />
          </div>

          {/* Target Date Input */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              目標日期 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
              />
              <Calendar className="w-4 h-4 text-calico-cocoa/40 dark:text-zinc-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              分類標籤
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={`p-2 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 font-black shadow-ios-sm'
                        : 'bg-black/5 dark:bg-white/5 border-transparent text-calico-cocoa/60 dark:text-zinc-400 font-bold'
                    }`}
                  >
                    <span className="text-base block">{c.icon}</span>
                    <span className="text-[11px] block mt-0.5 whitespace-nowrap">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emoji & Color Badges */}
          <EmojiColorPicker
            selectedEmoji={emoji}
            onSelectEmoji={setEmoji}
            selectedColor={colorHex}
            onSelectColor={setColorHex}
            label="自訂 Emoji 與主題色票"
          />

          {/* Pinned to Top Switch */}
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pin className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-xs font-extrabold text-calico-cocoa dark:text-zinc-100 block whitespace-nowrap">
                  釘選至首頁頂端
                </span>
                <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block">
                  在記帳頁頂端以醒目膠囊常駐提醒
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              備註說明 (選填)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：創客教室簡報、記得帶准考證"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold text-xs hover:bg-black/10 transition-all whitespace-nowrap shrink-0"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-ios-md hover:from-amber-600 hover:to-orange-600 transition-all whitespace-nowrap shrink-0"
            >
              {countdownToEdit ? '儲存變更' : '建立倒數日'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
