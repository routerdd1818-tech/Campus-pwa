import React from 'react';
import { CalicoAvatar } from './CalicoAvatar';
import { useApp } from '../context/AppContext';
import { RefreshCw, User, Share2, TrendingUp, Search } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    catMood,
    setCatMood,
    isOnline,
    isSyncing,
    syncWithSupabase,
    currentUser,
    setIsAuthModalOpen,
    setIsShareModalOpen,
    setIsQuantModalOpen,
    setIsGlobalSearchOpen,
    settings,
    nextSyncDisplay,
  } = useApp();

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
    const moods: Array<'happy' | 'thinking' | 'proud' | 'sleeping'> = [
      'happy',
      'thinking',
      'proud',
      'sleeping',
    ];
    const nextIndex = (moods.indexOf(catMood) + 1) % moods.length;
    setCatMood(moods[nextIndex]);
  };

  const displayName = currentUser?.displayName || settings.ownerName || '同學';

  return (
    <header className="sticky top-0 z-40 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2.5 bg-calico-cream/92 dark:bg-calico-darkBg/92 backdrop-blur-md border-b border-black/5 dark:border-white/5 transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Left: Avatar & Greeting */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div title="可樂管家（點擊切換心情）" className="shrink-0">
            <CalicoAvatar size={40} mood={catMood} onClick={cycleMood} />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-sm sm:text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight leading-tight truncate">
              {getGreeting()}，{displayName}
            </h1>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 font-bold leading-tight mt-0.5 tabular-nums truncate">
              {getFormattedDate()} · 可樂管家
            </p>
          </div>
        </div>

        {/* Right: Actions - Clean & Balanced in Calico Warm Style */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Global Spotlight Search Button */}
          <button
            type="button"
            onClick={() => setIsGlobalSearchOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-black/8 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 flex items-center justify-center hover:border-calico-orange hover:text-calico-orange active:scale-95 transition-all shadow-2xs"
            title="全域智慧搜尋（記帳統計、待辦、課表、行程）"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* AlphaMind Quant Center Quick Launch (Warm Calico Accent Pill) */}
          <button
            type="button"
            onClick={() => setIsQuantModalOpen(true)}
            className="h-9 px-2.5 rounded-2xl bg-calico-orange/15 dark:bg-calico-orange/20 border border-calico-orange/30 text-calico-orange font-black text-xs flex items-center gap-1 hover:bg-calico-orange hover:text-white active:scale-95 transition-all shadow-2xs shrink-0"
            title="一鍵開啟台股 AI 量化中台"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>量化</span>
          </button>

          {/* Friend Schedule & Calendar Sharing Button */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/90 dark:bg-zinc-800/90 text-calico-cocoa/80 dark:text-zinc-200 border border-black/8 dark:border-white/10 flex items-center justify-center hover:border-calico-orange hover:text-calico-orange active:scale-95 transition-all shadow-2xs"
            title="開啟好友課表、行事曆與記帳共享中心"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* User Account Button */}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-black/8 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 flex items-center justify-center hover:border-calico-orange hover:text-calico-orange active:scale-95 transition-all shadow-2xs relative"
            title={
              currentUser
                ? `已登入：${currentUser.displayName} (@${currentUser.username})`
                : '訪客模式（點擊登入/註冊）'
            }
          >
            <User className="w-4 h-4" />
            {currentUser && (
              <span className="w-2 h-2 rounded-full bg-calico-orange absolute top-1 right-1" />
            )}
          </button>

          {/* Cloud Sync Button with Connection Status Dot */}
          <button
            type="button"
            onClick={() => syncWithSupabase()}
            disabled={isSyncing}
            className="w-9 h-9 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-black/8 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 flex items-center justify-center hover:text-calico-orange active:scale-95 transition-all shadow-2xs relative"
            title={`雲端同步 (${nextSyncDisplay})`}
          >
            <RefreshCw className={`w-4 h-4 text-calico-orange ${isSyncing ? 'animate-spin' : ''}`} />
            <span
              className={`w-2 h-2 rounded-full absolute top-1 right-1 ${
                isOnline ? 'bg-calico-sage shadow-[0_0_6px_rgba(72,187,120,0.8)]' : 'bg-red-400'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
