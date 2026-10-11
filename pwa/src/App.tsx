import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { ScheduleView } from './views/ScheduleView';
import { TodosView } from './views/TodosView';
import { AccountingView } from './views/AccountingView';
import { SettingsView } from './views/SettingsView';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-calico-cream dark:bg-calico-darkBg text-calico-cocoa dark:text-zinc-100 transition-colors">
      {/* iOS style Top Header */}
      <Header />

      {/* PWA "Add to Home Screen" Banner */}
      <PwaInstallBanner />

      {/* Main View Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-2 pb-28">
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'todos' && <TodosView />}
        {activeTab === 'accounting' && <AccountingView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* iOS Floating Bottom TabBar */}
      <TabBar />
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
