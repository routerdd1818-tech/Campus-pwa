import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { AuthModal } from './components/AuthModal';
import { LineBotModal } from './components/LineBotModal';
import { TodayView } from './views/TodayView';
import { CalendarView } from './views/CalendarView';
import { ScheduleView } from './views/ScheduleView';
import { TodosView } from './views/TodosView';
import { AccountingView } from './views/AccountingView';
import { SettingsView } from './views/SettingsView';
import { ShareModal } from './components/ShareModal';
import { PeriodSettingsModal } from './components/PeriodSettingsModal';
import { FocusPomodoroModal } from './components/FocusPomodoroModal';
import { QuantInsightModal } from './components/QuantInsightModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';

const MainContent: React.FC = () => {
  const {
    activeTab,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isLineBotModalOpen,
    setIsLineBotModalOpen,
    isShareModalOpen,
    setIsShareModalOpen,
    isPeriodModalOpen,
    setIsPeriodModalOpen,
    isPomodoroOpen,
    setIsPomodoroOpen,
    isQuantModalOpen,
    setIsQuantModalOpen,
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
  } = useApp();

  // 全域 Cmd+K / Ctrl+K 開啟智慧搜尋
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsGlobalSearchOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-calico-cream dark:bg-calico-darkBg text-calico-cocoa dark:text-zinc-100 transition-colors">
      {/* Top Header */}
      <Header />

      {/* PWA "Add to Home Screen" Banner */}
      <PwaInstallBanner />

      {/* Main View Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-2 pb-28">
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'todos' && <TodosView />}
        {activeTab === 'accounting' && <AccountingView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Floating Bottom TabBar */}
      <TabBar />

      {/* 👤 User Auth & Multi-User Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 🤖 LINE Bot Dedicated Push Center Modal */}
      <LineBotModal
        isOpen={isLineBotModalOpen}
        onClose={() => setIsLineBotModalOpen(false)}
      />

      {/* 🤝 Friend Calendar & Schedule Sharing Center Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* ⏰ Class Period Customizable Times Modal */}
      <PeriodSettingsModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
      />

      {/* ⏱️ 可樂管家伴讀番茄鐘 Modal */}
      <FocusPomodoroModal
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
      />

      {/* 📈 台股 AI 量化中台 Modal */}
      <QuantInsightModal
        isOpen={isQuantModalOpen}
        onClose={() => setIsQuantModalOpen(false)}
      />

      {/* 🔍 全域關鍵字搜尋與統計 Spotlight Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
