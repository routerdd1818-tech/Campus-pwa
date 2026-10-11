import React from 'react';
import { CalicoAvatar } from './CalicoAvatar';
import { useApp } from '../context/AppContext';
import { Cloud, CloudOff, RefreshCw, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { catMood, setCatMood, isOnline, isSyncing, syncWithSupabase, settings } = useApp();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return '早安';
    if (hour >= 11 && hour < 14) return '午安';
    if (hour >= 14 && hour < 18) return '下午好';
    return '晚安';
  };

  const getFormattedDate = () => {
    const now = new Date();
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = weekdays[now.getDay()];
    return `${month}月${date}日 ${day}`;
  };

  const cycleMood = () => {
    const moods: Array<'happy' | 'thinking' | 'proud' | 'sleeping'> = ['happy', 'thinking', 'proud', 'sleeping'];
    const nextIndex = (moods.indexOf(catMood) + 1) % moods.length;
    setCatMood(moods[nextIndex]);
  };

  return (
    <header className="sticky top-0 z-40 px-4 pt-safe pb-2 bg-calico-cream/80 dark:bg-calico-darkBg/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Avatar & Greeting */}
        <div className="flex items-center space-x-3">
          <CalicoAvatar size={42} mood={catMood} onClick={cycleMood} />
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-extrabold text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {getGreeting()}，{settings.ownerName || '同學'}
              </h1>
              <span className="inline-block animate-bounce">🐾</span>
            </div>
            <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 font-medium">
              {getFormattedDate()}
            </p>
          </div>
        </div>

        {/* Right: Cloud Sync & Status */}
        <div className="flex items-center space-x-2">
          <button
            onClick={syncWithSupabase}
            disabled={isSyncing}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-white/70 dark:bg-zinc-800/70 border border-black/5 dark:border-white/10 shadow-ios-sm active:scale-95 transition-all text-xs font-semibold text-calico-cocoa/80 dark:text-zinc-300"
            title="手動同步 Supabase 雲端"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-calico-orange ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? '同步中' : '雲端同步'}</span>
          </button>

          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isOnline ? 'bg-calico-sage shadow-[0_0_8px_rgba(72,187,120,0.6)]' : 'bg-red-400'
            }`}
            title={isOnline ? '雲端連線正常' : '離線模式'}
          />
        </div>
      </div>
    </header>
  );
};
