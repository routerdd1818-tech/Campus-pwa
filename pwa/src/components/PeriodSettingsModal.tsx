import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClassPeriod } from '../types';
import { useApp } from '../context/AppContext';
import { X, Clock, Plus, Trash2, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';

interface PeriodSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DEFAULT_CLASS_PERIODS: ClassPeriod[] = [
  { id: 1, name: '第 1 節', displayCode: '1', startTime: '08:10', endTime: '09:00', isNoon: false },
  { id: 2, name: '第 2 節', displayCode: '2', startTime: '09:10', endTime: '10:00', isNoon: false },
  { id: 3, name: '第 3 節', displayCode: '3', startTime: '10:10', endTime: '11:00', isNoon: false },
  { id: 4, name: '第 4 節', displayCode: '4', startTime: '11:10', endTime: '12:00', isNoon: false },
  { id: 100, name: '中午', displayCode: '午', startTime: '12:10', endTime: '13:10', isNoon: true },
  { id: 5, name: '第 5 節', displayCode: '5', startTime: '13:20', endTime: '14:10', isNoon: false },
  { id: 6, name: '第 6 節', displayCode: '6', startTime: '14:20', endTime: '15:10', isNoon: false },
  { id: 7, name: '第 7 節', displayCode: '7', startTime: '15:30', endTime: '16:20', isNoon: false },
  { id: 8, name: '第 8 節', displayCode: '8', startTime: '16:30', endTime: '17:20', isNoon: false },
  { id: 9, name: '第 9 節', displayCode: '9', startTime: '17:30', endTime: '18:20', isNoon: false },
  { id: 10, name: '第 10 節', displayCode: '10', startTime: '18:30', endTime: '19:20', isNoon: false },
];

export const PeriodSettingsModal: React.FC<PeriodSettingsModalProps> = ({ isOpen, onClose }) => {
  const { classPeriods, updateClassPeriods } = useApp();

  const [periods, setPeriods] = useState<ClassPeriod[]>(classPeriods);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPeriods(classPeriods && classPeriods.length > 0 ? classPeriods : DEFAULT_CLASS_PERIODS);
      setSuccessMsg(null);
    }
  }, [isOpen, classPeriods]);

  if (!isOpen) return null;

  const handleTimeChange = (id: number, field: 'startTime' | 'endTime', value: string) => {
    setPeriods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleNameChange = (id: number, value: string) => {
    setPeriods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: value } : p))
    );
  };

  const handleAddPeriod = () => {
    const nextId = periods.length > 0 ? Math.max(...periods.map((p) => p.id)) + 1 : 1;
    const lastPeriod = periods[periods.length - 1];
    const newPeriod: ClassPeriod = {
      id: nextId,
      name: `第 ${periods.filter((p) => !p.isNoon).length + 1} 節`,
      displayCode: String(periods.filter((p) => !p.isNoon).length + 1),
      startTime: lastPeriod ? lastPeriod.endTime : '19:30',
      endTime: '20:20',
      isNoon: false,
    };
    setPeriods((prev) => [...prev, newPeriod]);
  };

  const handleDeletePeriod = (id: number) => {
    if (periods.length <= 1) return;
    setPeriods((prev) => prev.filter((p) => p.id !== id));
  };

  const handleResetDefaults = () => {
    setPeriods(DEFAULT_CLASS_PERIODS);
    setSuccessMsg('已載入標準預設課表時間！');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSave = () => {
    updateClassPeriods(periods);
    setSuccessMsg('節次時間已儲存並生效！');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 700);
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-lg bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-calico-cocoa dark:text-zinc-100">
                每節課自訂時間設定
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                依學校制度自訂各節次起訖時間，與帳號同步獨立
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-calico-sage/15 border border-calico-sage/30 text-calico-cocoa dark:text-zinc-100 text-xs font-bold flex items-center space-x-2 animate-fade-in">
            <Check className="w-4 h-4 text-calico-sage shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Presets row */}
        <div className="mt-3 flex items-center justify-between gap-1 flex-wrap">
          <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400">
            快速範本：
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold text-calico-cocoa/80 dark:text-zinc-300 hover:bg-calico-orange/15 hover:text-calico-orange transition-all flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>標準大專 (08:10起)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                // Apply 08:00 start template
                setPeriods(
                  DEFAULT_CLASS_PERIODS.map((p) => {
                    if (p.isNoon) return { ...p, startTime: '12:00', endTime: '13:10' };
                    const [sh, sm] = p.startTime.split(':').map(Number);
                    const [eh, em] = p.endTime.split(':').map(Number);
                    const newSh = sm === 10 ? sh : sh;
                    const newSm = (sm + 50) % 60; // -10 mins
                    const newEh = em === 0 ? eh - 1 : eh;
                    const newEm = (em + 50) % 60;
                    return {
                      ...p,
                      startTime: `${String(newSh).padStart(2, '0')}:00`,
                      endTime: `${String(newEh).padStart(2, '0')}:50`,
                    };
                  })
                );
                setSuccessMsg('已套用早八標準大學範本 (08:00起)！');
                setTimeout(() => setSuccessMsg(null), 2500);
              }}
              className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold text-calico-cocoa/80 dark:text-zinc-300 hover:bg-calico-orange/15 hover:text-calico-orange transition-all"
            >
              整點起 (08:00起)
            </button>
          </div>
        </div>

        {/* Periods List */}
        <div className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {periods.map((p, index) => (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                p.isNoon
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
                  : 'bg-calico-cream/50 dark:bg-zinc-800/50 border-black/5 dark:border-white/5'
              }`}
            >
              {/* Period Name & Tag */}
              <div className="flex items-center space-x-2 w-28 shrink-0">
                <span className="w-5 h-5 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-calico-cocoa/60 dark:text-zinc-400">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => handleNameChange(p.id, e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
                />
              </div>

              {/* Start & End Time Pickers */}
              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                <input
                  type="time"
                  value={p.startTime}
                  onChange={(e) => handleTimeChange(p.id, 'startTime', e.target.value)}
                  className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-center text-calico-cocoa dark:text-zinc-100"
                />
                <span className="text-xs font-bold text-calico-cocoa/40">~</span>
                <input
                  type="time"
                  value={p.endTime}
                  onChange={(e) => handleTimeChange(p.id, 'endTime', e.target.value)}
                  className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-center text-calico-cocoa dark:text-zinc-100"
                />
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDeletePeriod(p.id)}
                className="p-1 rounded-lg text-calico-cocoa/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0"
                title="刪除此節次"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Period Button */}
        <div className="mt-3">
          <button
            type="button"
            onClick={handleAddPeriod}
            className="w-full py-2.5 rounded-2xl border border-dashed border-calico-orange/40 hover:border-calico-orange text-calico-orange bg-calico-orange/5 hover:bg-calico-orange/10 text-xs font-black transition-all flex items-center justify-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>新增課表節次 (如夜間部第11節)</span>
          </button>
        </div>

        {/* Save Button */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-300 font-bold text-xs hover:bg-black/10 active:scale-95 transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-2xl bg-calico-orange text-white font-extrabold shadow-ios hover:brightness-105 active:scale-95 transition-all text-xs tracking-wide flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>儲存節次時間並套用</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
