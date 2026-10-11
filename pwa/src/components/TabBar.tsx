import React from 'react';
import { CalendarDays, CheckSquare, Wallet, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TabItem {
  id: 'schedule' | 'todos' | 'accounting' | 'settings';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const TabBar: React.FC = () => {
  const { activeTab, setActiveTab, todos } = useApp();

  const uncompletedTodosCount = todos.filter((t) => !t.isCompleted).length;

  const tabs: TabItem[] = [
    { id: 'schedule', label: '課表', icon: CalendarDays },
    { id: 'todos', label: '待辦', icon: CheckSquare, badge: uncompletedTodosCount },
    { id: 'accounting', label: '記帳', icon: Wallet },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-safe pt-2 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="flex items-center justify-around px-3 py-2.5 rounded-full bg-white/85 dark:bg-calico-darkCard/90 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-ios-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'text-calico-orange scale-105 font-bold'
                    : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa active:scale-95 font-medium'
                }`}
              >
                {/* Active Indicator Glow Background */}
                {isActive && (
                  <span className="absolute inset-0 bg-calico-orange/10 dark:bg-calico-orange/20 rounded-2xl -z-10 animate-fade-in" />
                )}

                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {/* Badge */}
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-calico-orange text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {tab.badge! > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>

                <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
