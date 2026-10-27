import React from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  Clock,
  Sparkles,
  BookOpen,
  CheckSquare,
  Calendar,
  Wallet,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TodaySectionId } from '../types';

interface TodayLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_CONFIG: Record<
  TodaySectionId,
  { title: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  status: {
    title: '即時上課狀態',
    desc: '提示當前上課中、下課剩餘時間或下一節課預告',
    icon: Clock,
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  pomodoro: {
    title: '伴讀番茄鐘',
    desc: '25 分鐘專注衝刺與白噪音專注捷徑',
    icon: Clock,
    color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  },
  countdowns: {
    title: '重要日子',
    desc: '大考倒數、放假、紀念日與備戰專屬待辦',
    icon: Sparkles,
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  courses: {
    title: '今日排定課表',
    desc: '當日課堂節次、授課教師與上課教室',
    icon: BookOpen,
    color: 'bg-calico-orange/15 text-calico-orange',
  },
  todos: {
    title: '今日焦點待辦',
    desc: '今天到期的作業、任務清單與完成勾選',
    icon: CheckSquare,
    color: 'bg-calico-sage/15 text-calico-sage',
  },
  events: {
    title: '今日進行中活動',
    desc: '行事曆跨日行程、重要校園活動與日程安排',
    icon: Calendar,
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  accounting: {
    title: '今日收支記帳',
    desc: '每日吃土預算額度進度與今日消費紀錄',
    icon: Wallet,
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
};

export const TodayLayoutModal: React.FC<TodayLayoutModalProps> = ({ isOpen, onClose }) => {
  const {
    todaySectionsOrder,
    setTodaySectionsOrder,
    todaySectionsHidden,
    toggleTodaySectionHidden,
    resetTodayLayout,
  } = useApp();

  if (!isOpen) return null;

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...todaySectionsOrder];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setTodaySectionsOrder(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= todaySectionsOrder.length - 1) return;
    const updated = [...todaySectionsOrder];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setTodaySectionsOrder(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-calico-darkCard w-full max-w-md rounded-[32px] p-5 shadow-2xl border border-black/5 dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-calico-orange/15 text-calico-orange flex items-center justify-center font-black">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                自訂首頁板塊排版
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                自由調整板塊上下順序，或隱藏不需要的卡片
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-calico-cocoa/60 dark:text-zinc-400 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {todaySectionsOrder.map((sectionId, index) => {
            const config = SECTION_CONFIG[sectionId];
            if (!config) return null;
            const Icon = config.icon;
            const isHidden = Boolean(todaySectionsHidden[sectionId]);
            const isFirst = index === 0;
            const isLast = index === todaySectionsOrder.length - 1;

            return (
              <div
                key={sectionId}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                  isHidden
                    ? 'bg-black/[0.02] dark:bg-white/[0.02] border-dashed border-black/10 dark:border-white/10 opacity-60'
                    : 'bg-calico-cream/40 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 shadow-2xs'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                  <span className="text-[11px] font-mono font-black text-calico-cocoa/30 dark:text-zinc-600 w-4 shrink-0 text-center">
                    {index + 1}
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100 truncate">
                        {config.title}
                      </h4>
                      {isHidden && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/50 font-bold">
                          已隱藏
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 truncate">
                      {config.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMoveUp(index)}
                    className="p-1.5 rounded-xl bg-white dark:bg-zinc-700 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange hover:bg-calico-orange/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-inherit shadow-2xs transition-all active:scale-95"
                    title="上移順序"
                  >
                    <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMoveDown(index)}
                    className="p-1.5 rounded-xl bg-white dark:bg-zinc-700 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange hover:bg-calico-orange/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-inherit shadow-2xs transition-all active:scale-95"
                    title="下移順序"
                  >
                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Toggle Show / Hide */}
                  <button
                    type="button"
                    onClick={() => toggleTodaySectionHidden(sectionId)}
                    className={`p-1.5 rounded-xl transition-all shadow-2xs active:scale-95 ${
                      isHidden
                        ? 'bg-black/5 dark:bg-white/10 text-calico-cocoa/40 dark:text-zinc-500 hover:text-calico-cocoa'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                    }`}
                    title={isHidden ? '點擊顯示板塊' : '點擊隱藏板塊'}
                  >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={resetTodayLayout}
            className="px-3 py-2 rounded-xl text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-orange hover:bg-calico-orange/5 active:scale-95 transition-all flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢復預設順序</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-calico-orange text-white text-xs font-black shadow-ios active:scale-95 transition-all hover:brightness-105 flex items-center space-x-1"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>套用排版</span>
          </button>
        </div>
      </div>
    </div>
  );
};
