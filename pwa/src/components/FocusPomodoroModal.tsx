import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  X,
  Sparkles,
  Coffee,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface FocusPomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusPomodoroModal: React.FC<FocusPomodoroModalProps> = ({ isOpen, onClose }) => {
  const { courses, todos, setCatMood } = useApp();

  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(() => {
    return parseInt(localStorage.getItem('campus_pomodoro_fish_count') || '0', 10);
  });
  const [subject, setSubject] = useState('專心讀書/寫作業');

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Completed session!
      if (mode === 'work') {
        const nextFish = completedSessions + 1;
        setCompletedSessions(nextFish);
        localStorage.setItem('campus_pomodoro_fish_count', String(nextFish));
        setMode('break');
        setTimeLeft(5 * 60);
        setCatMood('proud');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } else {
        setMode('work');
        setTimeLeft(25 * 60);
        setCatMood('thinking');
        if (navigator.vibrate) navigator.vibrate(300);
      }
      setIsRunning(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, mode, completedSessions, setCatMood]);

  if (!isOpen) return null;

  const handleToggleTimer = () => {
    if (!isRunning) {
      setCatMood(mode === 'work' ? 'thinking' : 'happy');
    }
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const handleSwitchMode = (targetMode: 'work' | 'break') => {
    setIsRunning(false);
    setMode(targetMode);
    setTimeLeft(targetMode === 'work' ? 25 * 60 : 5 * 60);
    setCatMood(targetMode === 'work' ? 'thinking' : 'sleeping');
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = mode === 'work' ? 25 * 60 : 5 * 60;
  const progressPercent = Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                可樂管家伴讀番茄鐘
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                25 分鐘專注衝刺，管家在身邊默默陪你
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

        {/* Mode Switcher */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-calico-cream dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleSwitchMode('work')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              mode === 'work'
                ? 'bg-calico-orange text-white shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>專注讀書 (25m)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('break')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              mode === 'break'
                ? 'bg-calico-sage text-white shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>吸貓休息 (5m)</span>
          </button>
        </div>

        {/* Subject Picker */}
        <div className="mt-3">
          <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1">
            當前專注科目 / 目標
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
          >
            <option value="專心讀書/寫作業">📖 自訂專注目標</option>
            {courses.map((c) => (
              <option key={c.id} value={c.name}>
                📚 課程：{c.name}
              </option>
            ))}
            {todos.filter((t) => !t.isCompleted).map((t) => (
              <option key={t.id} value={t.title}>
                ✅ 待辦：{t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Big Circular Countdown Display */}
        <div className="py-6 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-black/5 dark:stroke-white/5 fill-none"
                strokeWidth="7"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`${
                  mode === 'work' ? 'stroke-calico-orange' : 'stroke-calico-sage'
                } fill-none transition-all duration-500`}
                strokeWidth="7"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * progressPercent) / 100}
                strokeLinecap="round"
              />
            </svg>

            {/* Time Center */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono tracking-tight text-calico-cocoa dark:text-zinc-100">
                {formattedTime}
              </span>
              <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mt-0.5">
                {isRunning ? (mode === 'work' ? '🐾 管家伴讀中...' : '☕ 摸魚休息中') : '準備就緒'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={handleToggleTimer}
              className={`py-3 px-7 rounded-2xl font-black text-sm text-white shadow-ios active:scale-95 transition-all flex items-center space-x-1.5 ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : mode === 'work'
                  ? 'bg-calico-orange hover:brightness-105'
                  : 'bg-calico-sage hover:brightness-105'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? '暫停計時' : '開始專注'}</span>
            </button>

            <button
              onClick={handleResetTimer}
              className="p-3 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-300 hover:bg-black/10 active:scale-95 transition-all"
              title="重設"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Butler Achievement Footer */}
        <div className="p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-calico-orange" />
            <span className="text-calico-cocoa dark:text-zinc-200">
              今日已完成專注：{completedSessions} 輪
            </span>
          </div>
          <span className="text-calico-orange font-mono font-black">
            🐟 累積小魚乾 x{completedSessions}
          </span>
        </div>
      </div>
    </div>
  );
};
