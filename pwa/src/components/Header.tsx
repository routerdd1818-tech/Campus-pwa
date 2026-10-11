import React from 'react';
import { CalicoAvatar } from './CalicoAvatar';
import { useApp } from '../context/AppContext';
import { RefreshCw, MessageCircle, User, Share2 } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    catMood,
    setCatMood,
    isOnline,
    isSyncing,
    syncWithSupabase,
    currentUser,
    setIsAuthModalOpen,
    setIsLineBotModalOpen,
    setIsShareModalOpen,
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
    const moods: Array<'happy' | 'thinking' | 'proud' | 'sleeping'> = ['happy', 'thinking', 'proud', 'sleeping'];
    const nextIndex = (moods.indexOf(catMood) + 1) % moods.length;
    setCatMood(moods[nextIndex]);
  };

  const displayName = currentUser?.displayName || settings.ownerName || '同學';

  return (
    <header className="sticky top-0 z-40 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2.5 bg-calico-cream/90 dark:bg-calico-darkBg/90 backdrop-blur-md border-b border-black/5 dark:border-white/5 transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Avatar & Greeting */}
        <div className="flex items-center space-x-3">
          <CalicoAvatar size={42} mood={catMood} onClick={cycleMood} />
          <div className="flex flex-col justify-center">
            <h1 className="text-sm sm:text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight leading-tight">
              {getGreeting()}，{displayName}
            </h1>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 font-bold leading-tight mt-0.5">
              {getFormattedDate()}
            </p>
          </div>
        </div>

        {/* Right: Actions - Uniform 36x36 Icon Buttons with Perfect Alignment */}
        <div className="flex items-center space-x-2">
          {/* User Account Button */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-9 h-9 rounded-2xl bg-calico-cream/80 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 flex items-center justify-center hover:bg-calico-orange/15 hover:text-calico-orange active:scale-95 transition-all shadow-2xs relative"
            title={currentUser ? `已登入：${currentUser.displayName} (@${currentUser.username})` : '訪客模式（點擊登入/註冊）'}
          >
            <User className="w-4 h-4" />
            {currentUser && (
              <span className="w-2 h-2 rounded-full bg-calico-orange absolute top-1 right-1" />
            )}
          </button>

          {/* LINE Bot Dedicated Push Button (Icon only) */}
          <button
            onClick={() => setIsLineBotModalOpen(true)}
            className="w-9 h-9 rounded-2xl bg-[#06C755]/15 border border-[#06C755]/30 text-[#06C755] dark:text-[#25D366] flex items-center justify-center hover:bg-[#06C755]/25 active:scale-95 transition-all shadow-2xs"
            title="開啟個人 LINE Bot 獨立推播中心"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          {/* Friend Schedule & Calendar Sharing Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center hover:bg-indigo-100 active:scale-95 transition-all shadow-2xs"
            title="開啟好友課表、行事曆與記帳共享中心"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Cloud Sync Button with Connection Status Dot */}
          <button
            onClick={() => syncWithSupabase()}
            disabled={isSyncing}
            className="w-9 h-9 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 flex items-center justify-center hover:text-calico-orange active:scale-95 transition-all shadow-2xs relative"
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
