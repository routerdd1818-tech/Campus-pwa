import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { CountdownItem, CountdownMode } from '../types';
import { EmojiColorPicker } from './EmojiColorPicker';
import { Hourglass, X, Calendar, Pin, TrendingUp } from 'lucide-react';

interface CountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  countdownToEdit?: CountdownItem | null;
}

const TEMPLATES_COUNTDOWN = [
  '期末考週歐趴',
  '大學畢業典禮',
  '專案成果發表',
  '出國交換出發',
  '信用卡繳款日',
  '租屋房租繳納',
];

const TEMPLATES_COUNTUP = [
  '與另一半在一起',
  '戒手搖飲習慣打卡',
  '規律健身訓練',
  '大學入學至今',
  '養貓陪伴日子',
  '新專案啟動進行中',
];

const CATEGORIES: { key: CountdownItem['category']; label: string; icon: string }[] = [
  { key: 'exam', label: '考試檢定', icon: '📝' },
  { key: 'finance', label: '繳費財務', icon: '💳' },
  { key: 'life', label: '校園生活', icon: '🎓' },
  { key: 'anniversary', label: '紀念日', icon: '🎂' },
  { key: 'other', label: '其他事件', icon: '✨' },
];

export const CountdownModal: React.FC<CountdownModalProps> = ({
  isOpen,
  onClose,
  countdownToEdit,
}) => {
  const { addCountdown, updateCountdown } = useApp();

  const [mode, setMode] = useState<CountdownMode>('countdown');
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
        setMode(countdownToEdit.mode || 'countdown');
        setTitle(countdownToEdit.title);
        setTargetDate(countdownToEdit.targetDate);
        setCategory(countdownToEdit.category);
        setEmoji(countdownToEdit.emoji || (countdownToEdit.mode === 'countup' ? '💖' : '⏳'));
        setColorHex(countdownToEdit.colorHex || '#F59E0B');
        setIsPinned(Boolean(countdownToEdit.isPinned));
        setNotes(countdownToEdit.notes || '');
      } else {
        setMode('countdown');
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

  // 即時預覽計算
  const today = new Date(new Date().toISOString().slice(0, 10));
  const pickedDate = new Date(targetDate || new Date().toISOString().slice(0, 10));
  let livePreviewText = '';
  if (mode === 'countup') {
    const diff = today.getTime() - pickedDate.getTime();
    const passed = Math.floor(diff / (1000 * 60 * 60 * 24));
    livePreviewText = passed >= 0 ? `持續至今第 ${passed + 1} 天 (已滿 ${passed} 天)` : `將於 ${targetDate} 開始`;
  } else {
    const diff = Math.round((pickedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) livePreviewText = '今天就是 D-Day！';
    else if (diff > 0) livePreviewText = `距離目標還有 ${diff} 天 (D-${diff})`;
    else livePreviewText = `已逾期 ${Math.abs(diff)} 天 (D+${Math.abs(diff)})`;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入事件名稱');
      return;
    }
    if (!targetDate) {
      setErrorMsg('請選擇日期');
      return;
    }

    if (countdownToEdit) {
      updateCountdown({
        ...countdownToEdit,
        title: title.trim(),
        targetDate,
        mode,
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
        mode,
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
              {mode === 'countup' ? <TrendingUp className="w-5 h-5 text-pink-500" /> : <Hourglass className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {countdownToEdit ? '編輯重要日子' : '新增重要日子'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                支援「倒數日（算未來還有幾天）」與「持續幾日（算過去已過幾天）」
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

          {/* 🌟 兩種功能模式切換 (Mode Switcher) */}
          <div className="p-1 rounded-2xl bg-black/5 dark:bg-zinc-800 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('countdown');
                if (!countdownToEdit) {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  setTargetDate(d.toISOString().slice(0, 10));
                  setEmoji('🎓');
                  setColorHex('#F59E0B');
                }
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'countdown'
                  ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-300 shadow-ios-sm'
                  : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
              }`}
            >
              <span>⏳ 倒數日</span>
              <span className="text-[10px] opacity-75">(算距離目標還有幾天)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('countup');
                if (!countdownToEdit) {
                  const d = new Date();
                  d.setDate(d.getDate() - 100);
                  setTargetDate(d.toISOString().slice(0, 10));
                  setEmoji('💖');
                  setColorHex('#EC4899');
                  setCategory('anniversary');
                }
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'countup'
                  ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-300 shadow-ios-sm'
                  : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
              }`}
            >
              <span>📈 持續幾日</span>
              <span className="text-[10px] opacity-75">(算紀念日/已維持幾天)</span>
            </button>
          </div>

          {/* Quick template title chips based on mode */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
              常用範本快速點選
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(mode === 'countup' ? TEMPLATES_COUNTUP : TEMPLATES_COUNTDOWN).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTitle(t);
                    if (t.includes('在一起')) {
                      setCategory('anniversary');
                      setEmoji('💖');
                      setColorHex('#EC4899');
                    } else if (t.includes('手搖') || t.includes('健身')) {
                      setCategory('life');
                      setEmoji('🥤');
                      setColorHex('#10B981');
                    } else if (t.includes('期末考')) {
                      setCategory('exam');
                      setEmoji('📝');
                      setColorHex('#10B981');
                    } else if (t.includes('畢業')) {
                      setCategory('life');
                      setEmoji('🎓');
                      setColorHex('#F59E0B');
                    } else if (t.includes('繳款') || t.includes('房租')) {
                      setCategory('finance');
                      setEmoji('💳');
                      setColorHex('#3B82F6');
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
              {mode === 'countup' ? '紀念／持續事件名稱' : '倒數目標名稱'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'countup' ? '例如：與另一半在一起、堅持規律作息' : '例如：期末考週結束、畢業典禮'}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange transition-all"
            />
          </div>

          {/* Target/Start Date Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400">
                {mode === 'countup' ? '起始日期 (自哪天起算)' : '目標日期 (倒數至哪天)'} <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-black text-calico-orange">
                {livePreviewText}
              </span>
            </div>
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
            label="自訂代表 Emoji 與主題色"
          />

          {/* Pinned to Top Switch */}
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pin className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-xs font-extrabold text-calico-cocoa dark:text-zinc-100 block whitespace-nowrap">
                  釘選至首頁與行事曆頂端
                </span>
                <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block">
                  在首頁今日總覽與行事曆以常駐膠囊隨時提醒
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
              placeholder="例如：創客教室簡報、記得買禮物"
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
              {countdownToEdit ? '儲存變更' : mode === 'countup' ? '建立持續紀念日' : '建立倒數日'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
