import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  bindLineFollower,
  sendTestLineMessage,
  resetSupabaseClient,
  DEFAULT_SUPABASE_URL,
} from '../services/supabase';
import {
  Cloud,
  MessageCircle,
  Calendar,
  Save,
  CheckCircle2,
  RefreshCw,
  Send,
  UserCheck,
  ShieldCheck,
  DollarSign,
  Download,
  User,
  LogOut,
  LogIn,
  ExternalLink,
  Sparkles,
  Clock,
  Tag,
  Plus,
  Trash2,
  Layers,
  Palette,
} from 'lucide-react';

const PALETTE = ['#E67E22', '#48BB78', '#3182CE', '#805AD5', '#D53F8C', '#ED8936', '#E53E3E', '#3D2F2E', '#38B2AC'];

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    isSyncing,
    syncWithSupabase,
    currentUser,
    logoutUser,
    setIsAuthModalOpen,
    setIsLineBotModalOpen,
    setIsPeriodModalOpen,
    customExpenseCategories,
    customIncomeCategories,
    customTodoCategories,
    addCustomCategory,
    deleteCustomCategory,
    lastSyncedAt,
    nextSyncDisplay,
    triggerManualUpload,
  } = useApp();

  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || DEFAULT_SUPABASE_URL);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [shareCode, setShareCode] = useState(currentUser?.shareCode || settings.shareCode || 'CAMP88');
  const [ownerName, setOwnerName] = useState(currentUser?.displayName || settings.ownerName || '我的課表');
  const [lineUserId, setLineUserId] = useState(currentUser?.lineUserId || settings.lineUserId || '');
  const [pushHour, setPushHour] = useState(settings.linePushHour ?? 7);
  const [pushMinute, setPushMinute] = useState(settings.linePushMinute ?? 0);
  const [dailyLimit, setDailyLimit] = useState(settings.customDailyLimit ?? 300);
  const [resetDay, setResetDay] = useState(settings.accountingResetDay ?? 1);

  // Scheduled Cloud Upload & Sync states
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(settings.autoSyncEnabled ?? true);
  const [autoSyncTime, setAutoSyncTime] = useState(settings.autoSyncTime || '23:00');
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(settings.autoSyncIntervalMinutes ?? 30);

  // Category Manager Tab
  const [activeCategoryTab, setActiveCategoryTab] = useState<'expense' | 'income' | 'todo'>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setShareCode(currentUser.shareCode);
      setOwnerName(currentUser.displayName);
      if (currentUser.lineUserId) setLineUserId(currentUser.lineUserId);
    }
  }, [currentUser]);

  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [isClaimingLineId, setIsClaimingLineId] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);

  const handleSaveSettings = () => {
    updateSettings({
      supabaseUrl,
      supabaseAnonKey,
      shareCode,
      ownerName,
      lineUserId,
      linePushHour: pushHour,
      linePushMinute: pushMinute,
      customDailyLimit: dailyLimit,
      accountingResetDay: resetDay,
      autoSyncEnabled,
      autoSyncTime,
      autoSyncIntervalMinutes,
    });
    resetSupabaseClient(supabaseUrl, supabaseAnonKey);
    setAlertMsg('設定已儲存成功！');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCustomCategory(activeCategoryTab, {
      name: newCatName.trim(),
      colorHex: newCatColor,
      icon: 'tag',
    });
    setNewCatName('');
    setAlertMsg(`已新增 ${activeCategoryTab === 'expense' ? '支出' : activeCategoryTab === 'income' ? '收入' : '待辦'} 分類！`);
    setTimeout(() => setAlertMsg(null), 2500);
  };

  const handleClaimLineFollower = async () => {
    setIsClaimingLineId(true);
    try {
      const result = await bindLineFollower(shareCode, 'pwa_browser_client');
      if (result && result.ok && result.line_user_id) {
        setLineUserId(result.line_user_id);
        updateSettings({ lineUserId: result.line_user_id });
        setAlertMsg(`成功自動綁定 LINE ID: ${result.line_user_id}`);
      } else {
        setAlertMsg('尚未偵測到新加入好友的使用者，請先在 LINE 點擊加入機器人好友或傳送代碼！');
      }
    } catch {
      setAlertMsg('連線錯誤，請確認 Supabase 設定與網路狀態');
    } finally {
      setIsClaimingLineId(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleSendTestPush = async () => {
    if (!lineUserId) {
      setAlertMsg('請先填入或自動綁定 LINE User ID！');
      return;
    }
    setIsSendingTestPush(true);
    try {
      const ok = await sendTestLineMessage(
        lineUserId,
        `🐾 哈囉！這是來自 Campus 可樂校園 PWA 的測試推播！\n您設定的課表分享碼為：${shareCode}\n今日預算為：$${dailyLimit} 元。`
      );
      if (ok) {
        setAlertMsg('測試推播已發送，請檢查您的 LINE 聊天室！');
      } else {
        setAlertMsg('發送失敗，請確認 Supabase app_api_configs 是否已儲存 line_channel_access_token');
      }
    } finally {
      setIsSendingTestPush(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleExportData = () => {
    const data = {
      courses: localStorage.getItem('campus_courses'),
      todos: localStorage.getItem('campus_todos'),
      transactions: localStorage.getItem('campus_transactions'),
      calendarEvents: localStorage.getItem('campus_calendar_events'),
      settings: localStorage.getItem('campus_settings'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-28">
      <div>
        <h2 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
          雲端與系統設定
        </h2>
        <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400">
          固定上傳時間、自訂分類種類、LINE 推播與帳號管理
        </p>
      </div>

      {alertMsg && (
        <div className="p-3.5 rounded-2xl bg-calico-sage/15 border border-calico-sage/30 text-calico-cocoa dark:text-zinc-100 text-xs font-bold flex items-center space-x-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* 0. 👤 User Account & Profile Center */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                使用者帳戶中心
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                {currentUser ? `登入身分：@${currentUser.username}` : '訪客模式（未登入）'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-calico-orange/15 text-calico-orange hover:bg-calico-orange/25 active:scale-95 transition-all text-xs font-bold flex items-center space-x-1"
          >
            {currentUser ? (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>切換帳號</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>登入 / 註冊</span>
              </>
            )}
          </button>
        </div>

        {currentUser ? (
          <div className="p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-calico-cocoa/60 dark:text-zinc-400">顯示姓名</span>
              <span className="font-black text-calico-cocoa dark:text-zinc-200">{currentUser.displayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-calico-cocoa/60 dark:text-zinc-400">專屬課表分享碼</span>
              <span className="font-mono font-black text-calico-orange px-2 py-0.5 rounded-md bg-calico-orange/15">
                {currentUser.shareCode}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <span>註冊或登入後，課表、行事曆與待辦會自動依帳號雲端保存！</span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] shrink-0 ml-2 shadow-xs"
            >
              馬上註冊
            </button>
          </div>
        )}
      </div>

      {/* 1. ⏰ Scheduled Cloud Upload & Sync Section (固定上傳時間) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                固定自動上傳與雲端同步
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                {nextSyncDisplay}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-calico-orange"></div>
          </label>
        </div>

        {autoSyncEnabled && (
          <div className="space-y-3 pt-1 border-t border-black/5 dark:border-white/5 animate-fade-in">
            {/* Fixed Daily Time Picker (e.g. 23:00) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                  每日固定上傳時間
                </label>
                <input
                  type="time"
                  value={autoSyncTime}
                  onChange={(e) => setAutoSyncTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                  定期背景同步頻率
                </label>
                <select
                  value={autoSyncIntervalMinutes}
                  onChange={(e) => setAutoSyncIntervalMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
                >
                  <option value={0}>僅在固定時間上傳</option>
                  <option value={15}>每 15 分鐘自動同步</option>
                  <option value={30}>每 30 分鐘自動同步</option>
                  <option value={60}>每 1 小時自動同步</option>
                </select>
              </div>
            </div>

            {/* Sync Status Banner & Manual Button */}
            <div className="p-3 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 block font-medium">
                  上次同步成功時間
                </span>
                <span className="font-mono font-bold text-calico-cocoa dark:text-zinc-200">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : '尚未同步'}
                </span>
              </div>

              <button
                onClick={triggerManualUpload}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-xs font-bold flex items-center space-x-1 shadow-xs active:scale-95 transition-all hover:brightness-105 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '同步上傳中...' : '立即手動同步'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. ⏰ 課表每節課時間設定 (自訂起訖時間) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              課表每節課時間自訂
            </h3>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              自訂各節次起訖時間、新增夜間部節次，與帳號同步獨立
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPeriodModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-calico-orange/15 text-calico-orange font-bold text-xs hover:bg-calico-orange/20 active:scale-95 transition-all shadow-2xs shrink-0"
        >
          自訂節次
        </button>
      </div>

      {/* 3. 🏷️ 自訂記帳與待辦分類種類 (Custom Categories Manager) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-calico-sage/15 text-calico-sage">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              自訂記帳與待辦種類
            </h3>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              自訂各項標籤、分類名稱與專屬代表色
            </p>
          </div>
        </div>

        {/* Tab Switcher for Categories */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-calico-cream dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveCategoryTab('expense')}
            className={`py-1.5 rounded-xl transition-all ${
              activeCategoryTab === 'expense'
                ? 'bg-calico-orange text-white shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            支出種類 ({customExpenseCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryTab('income')}
            className={`py-1.5 rounded-xl transition-all ${
              activeCategoryTab === 'income'
                ? 'bg-calico-sage text-white shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            收入種類 ({customIncomeCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryTab('todo')}
            className={`py-1.5 rounded-xl transition-all ${
              activeCategoryTab === 'todo'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            待辦標籤 ({customTodoCategories.length})
          </button>
        </div>

        {/* Existing categories list */}
        <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
          {(activeCategoryTab === 'expense'
            ? customExpenseCategories
            : activeCategoryTab === 'income'
            ? customIncomeCategories
            : customTodoCategories
          ).map((c) => (
            <div
              key={c.id || c.name}
              className="px-3 py-1.5 rounded-xl bg-calico-cream/80 dark:bg-zinc-800 border border-black/5 dark:border-white/5 flex items-center space-x-2 text-xs font-bold"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.colorHex }} />
              <span className="text-calico-cocoa dark:text-zinc-100">{c.name}</span>
              <button
                type="button"
                onClick={() => deleteCustomCategory(activeCategoryTab, c.id || c.name)}
                className="text-calico-cocoa/30 hover:text-red-500 transition-colors ml-1"
                title="刪除此分類"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Inline Add Category form */}
        <form onSubmit={handleCreateCategory} className="p-3 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={`輸入新${activeCategoryTab === 'expense' ? '支出' : activeCategoryTab === 'income' ? '收入' : '待辦'}名稱`}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-xs font-extrabold shadow-xs active:scale-95 disabled:opacity-40 transition-all flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增種類</span>
            </button>
          </div>

          {/* Color swatches */}
          <div className="flex items-center space-x-2 pt-0.5">
            <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 font-bold">挑選顏色：</span>
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setNewCatColor(c)}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full transition-transform ${
                  newCatColor === c ? 'scale-125 ring-2 ring-calico-cocoa dark:ring-white' : 'opacity-70'
                }`}
              />
            ))}
          </div>
        </form>
      </div>

      {/* 3. LINE Bot Settings */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-calico-sage/15 text-calico-sage">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                LINE 官方帳號每日推播
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                推播獨立區隔，加好友自動綁定 User ID
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLineBotModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#06C755]/15 text-[#06C755] dark:text-[#25D366] text-xs font-bold flex items-center space-x-1 hover:bg-[#06C755]/25 active:scale-95 transition-all shrink-0 ml-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>推播中心</span>
          </button>
        </div>

        <div className="space-y-2.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              已綁定的 LINE User ID
            </label>
            <input
              type="text"
              value={lineUserId}
              onChange={(e) => setLineUserId(e.target.value)}
              placeholder="加好友後點擊下方按鈕自動帶入"
              className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={handleClaimLineFollower}
              disabled={isClaimingLineId}
              className="flex-1 py-2 px-3 rounded-xl bg-calico-sage/15 text-calico-sage text-xs font-bold flex items-center justify-center space-x-1 hover:bg-calico-sage/25 active:scale-95 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isClaimingLineId ? '尋找好友中...' : '自動認領 LINE ID'}</span>
            </button>

            <button
              onClick={handleSendTestPush}
              disabled={isSendingTestPush || !lineUserId}
              className="py-2 px-3 rounded-xl bg-calico-orange/15 text-calico-orange text-xs font-bold flex items-center justify-center space-x-1 hover:bg-calico-orange/25 active:scale-95 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>測試推播</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Budget & Cycle Settings */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-calico-cocoa/10 text-calico-cocoa dark:text-zinc-200">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              記帳週期與花費限額
            </h3>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              設定每月發薪/零用錢重置日與每日預算
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              每月重置日 (發薪日)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={resetDay}
              onChange={(e) => setResetDay(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              每日花費限額 (元)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2 flex items-center space-x-3">
        <button
          onClick={handleExportData}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold text-xs flex items-center space-x-1.5 shadow-ios-sm active:scale-95 transition-all"
          title="備份匯出 JSON"
        >
          <Download className="w-4 h-4" />
          <span>備份</span>
        </button>

        <button
          onClick={handleSaveSettings}
          className="flex-1 py-3.5 px-4 rounded-2xl bg-calico-orange text-white font-black shadow-ios active:scale-95 transition-all flex items-center justify-center space-x-2 text-sm tracking-wide hover:brightness-105"
        >
          <Save className="w-4 h-4" />
          <span>儲存所有設定</span>
        </button>
      </div>
    </div>
  );
};
