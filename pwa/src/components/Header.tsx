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
        {/* Left: Avatar & Greeting & User Click */}
        <div className="flex items-center space-x-2.5">
          <CalicoAvatar size={42} mood={catMood} onClick={cycleMood} />
          <div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="group flex items-center space-x-1.5 text-left active:opacity-75 transition-opacity"
              title="點擊切換或管理使用者帳戶"
            >
              <h1 className="text-base font-extrabold text-calico-cocoa dark:text-zinc-100 tracking-tight group-hover:text-calico-orange transition-colors">
                {getGreeting()}，{displayName}
              </h1>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-calico-orange/15 text-calico-orange font-bold flex items-center space-x-0.5">
                <User className="w-2.5 h-2.5" />
                <span className="text-[10px]">{currentUser ? `@${currentUser.username}` : '訪客'}</span>
              </span>
            </button>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 font-medium">
              {getFormattedDate()}
            </p>
          </div>
        </div>

        {/* Right: Actions (LINE Bot Push, Sync, Status) */}
        <div className="flex items-center space-x-1.5">
          {/* Friend Schedule / Calendar / Accounting Sharing */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 shadow-2xs hover:bg-indigo-100 active:scale-95 transition-all"
            title="開啟好友課表、行事曆與記帳共享中心"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* LINE Bot Dedicated Push Button */}
          <button
            onClick={() => setIsLineBotModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-[#06C755]/15 text-[#06C755] dark:text-[#25D366] font-bold text-xs hover:bg-[#06C755]/25 active:scale-95 transition-all shadow-2xs border border-[#06C755]/20"
            title="開啟個人 LINE Bot 獨立推播中心"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-[11px]">LINE 推播</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={() => syncWithSupabase()}
            disabled={isSyncing}
            className="p-1.5 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 shadow-ios-sm active:scale-95 transition-all text-calico-cocoa/80 dark:text-zinc-300 hover:text-calico-orange"
            title="手動同步 Supabase 雲端"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-calico-orange ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Connection Status Indicator */}
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
