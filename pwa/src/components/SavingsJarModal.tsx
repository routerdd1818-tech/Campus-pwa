import React, { useState, useEffect } from 'react';
import { SavingsJar } from '../types';
import { EmojiColorPicker, MODERN_PALETTE } from './EmojiColorPicker';

interface SavingsJarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (jar: SavingsJar) => void;
  initialData?: SavingsJar | null;
}

export const SavingsJarModal: React.FC<SavingsJarModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [colorHex, setColorHex] = useState(MODERN_PALETTE[1].hex);
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setEmoji(initialData.emoji || '✈️');
      setColorHex(initialData.colorHex || MODERN_PALETTE[1].hex);
      setTargetAmount(String(initialData.targetAmount));
      setCurrentAmount(String(initialData.currentAmount || 0));
      setTargetDate(initialData.targetDate || '');
      setNotes(initialData.notes || '');
    } else {
      setTitle('');
      setEmoji('✈️');
      setColorHex(MODERN_PALETTE[1].hex);
      setTargetAmount('');
      setCurrentAmount('0');
      setTargetDate('');
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const numTarget = Math.max(0, Number(targetAmount) || 0);
  const numCurrent = Math.max(0, Number(currentAmount) || 0);
  const remaining = Math.max(0, numTarget - numCurrent);

  let dailySuggested: number | null = null;
  if (targetDate && remaining > 0) {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const end = new Date(targetDate);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      dailySuggested = Math.ceil(remaining / diffDays);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || numTarget <= 0) return;

    const jar: SavingsJar = {
      id: initialData?.id || `jar_${Date.now()}`,
      title: title.trim(),
      emoji: emoji || '🏺',
      colorHex,
      targetAmount: numTarget,
      currentAmount: numCurrent,
      targetDate: targetDate || undefined,
      deposits: initialData?.deposits || (numCurrent > 0
        ? [{ id: `dep_init_${Date.now()}`, amount: numCurrent, date: new Date().toISOString().slice(0, 10), note: '初始儲蓄金' }]
        : []),
      isCompleted: numCurrent >= numTarget,
      notes: notes.trim(),
    };
    onSave(jar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-calico-darkCard border border-black/10 dark:border-white/10 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{emoji}</span>
            <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
              {initialData ? '編輯夢想存錢筒' : '新增夢想存錢筒／願望清單'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400 font-bold flex items-center justify-center hover:bg-black/10 transition-all shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 願望名稱 */}
          <div>
            <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
              夢想／願望目標名稱 *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：日本畢業旅行、iPad Air、演唱會門票"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
            />
          </div>

          {/* 目標金額 與 目前已存 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1 whitespace-nowrap">
                目標總金額 ($) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="25000"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1 whitespace-nowrap">
                目前已存金額 ($)
              </label>
              <input
                type="number"
                min={0}
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>
          </div>

          {/* 預計達成日期 */}
          <div>
            <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
              預計達成日期（選填，系統將自動試算每日存錢微目標）
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
            />
          </div>

          {/* 即時微目標試算預覽 */}
          {numTarget > 0 && (
            <div
              style={{
                backgroundColor: `${colorHex}15`,
                borderColor: `${colorHex}40`,
              }}
              className="p-3 rounded-2xl border flex items-center justify-between text-xs font-bold"
            >
              <span className="text-calico-cocoa dark:text-zinc-200">
                距離目標還差 <strong style={{ color: colorHex }}>${remaining.toLocaleString()}</strong>
              </span>
              {dailySuggested !== null && (
                <span className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-200 whitespace-nowrap shrink-0">
                  平均每天存 ${dailySuggested}
                </span>
              )}
            </div>
          )}

          {/* 純自訂 Emoji 與色票 */}
          <EmojiColorPicker
            selectedEmoji={emoji}
            onSelectEmoji={setEmoji}
            selectedColor={colorHex}
            onSelectColor={setColorHex}
            label="願望代表 Emoji 與主題色"
          />

          {/* 備註 */}
          <div>
            <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
              自我激勵備註（選填）
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：少喝手搖飲，暑假飛東京！"
              className="w-full px-3.5 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
            />
          </div>

          {/* 底部按鈕 */}
          <div className="flex items-center space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 text-xs font-black text-calico-cocoa/70 dark:text-zinc-300 hover:bg-black/10 transition-all whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="submit"
              style={{ backgroundColor: colorHex }}
              className="flex-1 py-2.5 rounded-2xl text-white text-xs font-black shadow-md hover:opacity-95 active:scale-98 transition-all whitespace-nowrap"
            >
              {initialData ? '儲存變更' : '建立夢想存錢筒'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
