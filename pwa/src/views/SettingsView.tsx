import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  bindLineFollower,
  sendTestLineMessage,
  resetSupabaseClient,
  publishSharedSchedule,
  fetchSharedScheduleByCode,
  testGeminiApiConnection,
  getGeminiApiKey,
  saveGeminiApiKey,
  fetchAppApiConfig,
  saveAppApiConfig,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '../services/supabase';
import { DEFAULT_CLASS_PERIODS } from '../components/PeriodSettingsModal';
import {
  CategoryIcon,
  AVAILABLE_CATEGORY_ICONS,
  EXTENDED_COLOR_PALETTE,
} from '../components/CategoryIcon';
import { ClassPeriod, SharedScheduleData } from '../types';
import {
  User,
  Clock,
  MessageCircle,
  Tag,
  DollarSign,
  Share2,
  Palette,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Plus,
  Check,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Send,
  UserCheck,
  LogIn,
  LogOut,
  Copy,
  Save,
  Moon,
  Sun,
  Laptop,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Key,
  Database,
  UtensilsCrossed,
  Timer,
  GraduationCap,
  ExternalLink,
  Bot,
  HelpCircle,
} from 'lucide-react';


export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    isSyncing,
    syncWithSupabase,
    currentUser,
    logoutUser,
    updateCurrentUserDisplayName,
    setIsAuthModalOpen,
    customExpenseCategories,
    customIncomeCategories,
    customTodoCategories,
    addCustomCategory,
    deleteCustomCategory,
    classPeriods,
    updateClassPeriods,
    savedFriends,
    saveFriendRecord,
    removeFriendRecord,
    courses,
    todos,
    transactions,
    calendarEvents,
    lastSyncedAt,
    nextSyncDisplay,
    triggerManualUpload,
    catMood,
    setCatMood,
    restoreBackupData,
    resetAllData,
    setIsFortuneModalOpen,
    setIsFoodRouletteOpen,
    setIsPomodoroOpen,
  } = useApp();

  // 1. Account & Profile
  const [ownerName, setOwnerName] = useState(currentUser?.displayName || settings.ownerName || '同學');
  const [shareCode, setShareCode] = useState(currentUser?.shareCode || settings.shareCode || 'CAMP88');

  // 2. Cloud & Auto-Sync
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(settings.autoSyncEnabled ?? true);
  const [autoSyncTime, setAutoSyncTime] = useState(settings.autoSyncTime || '23:00');
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(settings.autoSyncIntervalMinutes ?? 240);
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || DEFAULT_SUPABASE_URL);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY);
  const [showAdvancedSupabase, setShowAdvancedSupabase] = useState(false);

  // 3. LINE Bot
  const [lineUserId, setLineUserId] = useState(currentUser?.lineUserId || settings.lineUserId || '');
  const [pushHour, setPushHour] = useState(settings.linePushHour ?? 7);
  const [pushMinute, setPushMinute] = useState(settings.linePushMinute ?? 0);
  const [isLinePushEnabled, setIsLinePushEnabled] = useState(settings.isLinePushEnabled ?? true);
  const [isEveningPushEnabled, setIsEveningPushEnabled] = useState(settings.lineEveningPushEnabled ?? true);
  const [isTodoReminderEnabled, setIsTodoReminderEnabled] = useState(settings.lineTodoReminderEnabled ?? true);
  const [isClaimingLineId, setIsClaimingLineId] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);

  // 4. Class Periods
  const [periods, setPeriods] = useState<ClassPeriod[]>(classPeriods && classPeriods.length > 0 ? classPeriods : DEFAULT_CLASS_PERIODS);
  const [showPeriodsList, setShowPeriodsList] = useState(true);

  // 5. Custom Categories
  const [activeCategoryTab, setActiveCategoryTab] = useState<'expense' | 'income' | 'todo'>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(EXTENDED_COLOR_PALETTE[0]);
  const [newCatIcon, setNewCatIcon] = useState(AVAILABLE_CATEGORY_ICONS[0].id);

  // 6. Budget
  const [dailyLimit, setDailyLimit] = useState(settings.customDailyLimit ?? 300);
  const [resetDay, setResetDay] = useState(settings.accountingResetDay ?? 1);

  // 7. Friend Sharing
  const [isShareCourses, setIsShareCourses] = useState(settings.isShareCourses ?? true);
  const [isShareAccounting, setIsShareAccounting] = useState(settings.isShareAccounting ?? true);
  const [isShareCalendar, setIsShareCalendar] = useState(settings.isShareCalendar ?? true);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isPublishingShare, setIsPublishingShare] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // 8. Appearance & Mascot
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(settings.theme || 'light');

  // UI States
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [showLineGuide, setShowLineGuide] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 9. API Keys Vault (Gemini & LINE)
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [lineChannelToken, setLineChannelToken] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [isSavingLineToken, setIsSavingLineToken] = useState(false);

  // Load API keys on mount
  useEffect(() => {
    getGeminiApiKey().then((k) => setGeminiApiKey(k));
    fetchAppApiConfig('line_channel_access_token').then((t) => setLineChannelToken(t));
  }, []);

  // Keep in sync with currentUser
  useEffect(() => {
    if (currentUser) {
      setShareCode(currentUser.shareCode);
      setOwnerName(currentUser.displayName);
      if (currentUser.lineUserId) setLineUserId(currentUser.lineUserId);
    }
  }, [currentUser]);

  useEffect(() => {
    if (classPeriods && classPeriods.length > 0) {
      setPeriods(classPeriods);
    }
  }, [classPeriods]);

  const showNotification = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  // 💾 Save All Settings
  const handleSaveAllSettings = async () => {
    await updateCurrentUserDisplayName(ownerName);
    updateClassPeriods(periods);
    updateSettings({
      supabaseUrl,
      supabaseAnonKey,
      shareCode,
      ownerName,
      lineUserId,
      linePushHour: pushHour,
      linePushMinute: pushMinute,
      isLinePushEnabled,
      lineEveningPushEnabled: isEveningPushEnabled,
      lineTodoReminderEnabled: isTodoReminderEnabled,
      customDailyLimit: dailyLimit,
      accountingResetDay: resetDay,
      autoSyncEnabled,
      autoSyncTime,
      autoSyncIntervalMinutes,
      isShareCourses,
      isShareAccounting,
      isShareCalendar,
      theme,
    });
    resetSupabaseClient(supabaseUrl, supabaseAnonKey);
    showNotification('✅ 所有設定、課表節次與自訂稱呼已成功儲存！');
  };

  // 📋 Copy Share Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(shareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 🤖 Claim LINE Follower
  const handleClaimLineFollower = async () => {
    setIsClaimingLineId(true);
    try {
      const userKey = currentUser ? currentUser.id : 'device_local';
      const result = await bindLineFollower(shareCode, userKey);
      if (result && result.ok && result.line_user_id) {
        setLineUserId(result.line_user_id);
        updateSettings({ lineUserId: result.line_user_id });
        showNotification(`🎉 成功自動綁定 LINE ID：${result.line_user_id}`);
      } else {
        showNotification('尚未偵測到新好友事件，請先在 LINE 搜尋機器人加好友或傳送分享碼！');
      }
    } catch {
      showNotification('連線錯誤，請確認網路與 Supabase 連線狀態');
    } finally {
      setIsClaimingLineId(false);
    }
  };

  // 💬 Send Test Push
  const handleSendTestPush = async () => {
    if (!lineUserId) {
      showNotification('請先填入或自動認領 LINE User ID！');
      return;
    }
    setIsSendingTestPush(true);
    try {
      const ok = await sendTestLineMessage(
        lineUserId,
        `🐾 哈囉 ${ownerName}！這是來自 Campus 可樂校園的專屬推播測試！\n專屬課表代碼：${shareCode}\n今日花費限額：$${dailyLimit} 元。\n每日晨報將於 ${String(pushHour).padStart(2, '0')}:${String(pushMinute).padStart(2, '0')} 準時送達！`
      );
      if (ok) {
        showNotification('🚀 測試推播已發送，請檢查您的 LINE 聊天室！');
      } else {
        showNotification('發送失敗，請確認 Supabase app_api_configs 是否已儲存 line_channel_access_token');
      }
    } finally {
      setIsSendingTestPush(false);
    }
  };

  // ⏰ Period Time Changes
  const handlePeriodTimeChange = (id: number, field: 'startTime' | 'endTime', value: string) => {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handlePeriodNameChange = (id: number, value: string) => {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, name: value } : p)));
  };

  const handleAddPeriod = () => {
    const nextId = periods.length > 0 ? Math.max(...periods.map((p) => p.id)) + 1 : 1;
    const lastPeriod = periods[periods.length - 1];
    const newPeriod: ClassPeriod = {
      id: nextId,
      name: `第 ${periods.filter((p) => !p.isNoon).length + 1} 節`,
      displayCode: String(periods.filter((p) => !p.isNoon).length + 1),
      startTime: lastPeriod ? lastPeriod.endTime : '19:30',
      endTime: '20:20',
      isNoon: false,
    };
    const updated = [...periods, newPeriod];
    setPeriods(updated);
    updateClassPeriods(updated);
    showNotification('已新增節次！');
  };

  const handleDeletePeriod = (id: number) => {
    if (periods.length <= 1) return;
    const updated = periods.filter((p) => p.id !== id);
    setPeriods(updated);
    updateClassPeriods(updated);
  };

  const handleApplyTemplate = (type: 'default' | 'eight_am') => {
    if (type === 'default') {
      setPeriods(DEFAULT_CLASS_PERIODS);
      updateClassPeriods(DEFAULT_CLASS_PERIODS);
      showNotification('已載入大專標準課表範本 (08:10 起)！');
    } else {
      const template = DEFAULT_CLASS_PERIODS.map((p) => {
        if (p.isNoon) return { ...p, startTime: '12:00', endTime: '13:10' };
        const [sh] = p.startTime.split(':').map(Number);
        const [eh] = p.endTime.split(':').map(Number);
        return {
          ...p,
          startTime: `${String(sh).padStart(2, '0')}:00`,
          endTime: `${String(eh).padStart(2, '0')}:50`,
        };
      });
      setPeriods(template);
      updateClassPeriods(template);
      showNotification('已載入整點大學範本 (08:00 起)！');
    }
  };

  // 🏷️ Category Management
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCustomCategory(activeCategoryTab, {
      name: newCatName.trim(),
      colorHex: newCatColor,
      icon: newCatIcon,
    });
    setNewCatName('');
    showNotification(`已新增 ${activeCategoryTab === 'expense' ? '支出' : activeCategoryTab === 'income' ? '收入' : '待辦'} 分類！`);
  };

  // 🔑 Save API Keys
  const handleSaveGeminiApiKey = async () => {
    setIsSavingGeminiKey(true);
    try {
      const ok = await saveGeminiApiKey(geminiApiKey);
      if (ok) {
        showNotification('✅ Gemini API Key 已成功儲存！');
      } else {
        showNotification('✅ Gemini API Key 已儲存於本機！');
      }
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const handleSaveLineToken = async () => {
    setIsSavingLineToken(true);
    try {
      const ok = await saveAppApiConfig('line_channel_access_token', lineChannelToken);
      if (ok) {
        showNotification('✅ LINE Channel Access Token 已成功儲存至 Supabase 雲端！');
      } else {
        showNotification('⚠️ 儲存失敗，請確認 Supabase 連線狀態');
      }
    } finally {
      setIsSavingLineToken(false);
    }
  };

  // 🧠 Gemini AI Test
  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestStatus(null);
    try {
      if (geminiApiKey.trim()) {
        await saveGeminiApiKey(geminiApiKey.trim());
      }
      const res = await testGeminiApiConnection(geminiApiKey.trim());
      setGeminiTestStatus(res);
      if (res.ok) {
        showNotification(`🎉 Gemini AI 課表辨識測試成功！(${res.model || 'gemini-2.5-flash'})`);
      } else {
        showNotification(`⚠️ Gemini 測試失敗：${res.message}`);
      }
    } catch (e: any) {
      setGeminiTestStatus({ ok: false, message: e.message || '測試失敗' });
    } finally {
      setIsTestingGemini(false);
    }
  };

  // 📋 Copy Webhook URL
  const webhookUrl = `${supabaseUrl || DEFAULT_SUPABASE_URL}/functions/v1/line-webhook`;
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    showNotification('📋 已複製 LINE Webhook URL！');
  };


  // 🤝 Friend Sharing Operations
  const handlePublishSchedule = async () => {
    setIsPublishingShare(true);
    const scheduleData: SharedScheduleData = {
      shareCode,
      ownerName,
      isSharingEnabled: isShareCourses,
      coursesData: isShareCourses ? courses.filter((c) => c.isSharedWithFriends !== false) : [],
      todosData: isShareCalendar ? todos.filter((t) => t.isCompleted === false) : [],
      accountingData: isShareAccounting ? transactions.filter((t) => t.isSharedWithFriends !== false) : [],
      calendarEventsData: isShareCalendar ? calendarEvents.filter((e) => e.isSharedWithFriends !== false) : [],
      isExpenseSharingEnabled: isShareAccounting,
      updatedAt: new Date().toISOString(),
    };

    const ok = await publishSharedSchedule(scheduleData);
    setIsPublishingShare(false);
    if (ok) {
      showNotification(`課表與行事曆已成功同步至雲端共享中心！代碼：${shareCode}`);
    } else {
      showNotification('發布失敗，請確認網路連線');
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = friendCodeInput.trim().toUpperCase();
    if (!clean) return;
    if (clean === shareCode) {
      showNotification('不能加入自己的分享代碼喔！');
      return;
    }
    setIsAddingFriend(true);
    try {
      const data = await fetchSharedScheduleByCode(clean);
      if (!data) {
        showNotification('找不到此代碼的課表，可能對方未開啟共享');
      } else {
        saveFriendRecord({
          shareCode: clean,
          ownerName: data.ownerName || '同學',
          nickname: data.ownerName || '同學',
          lastViewedAt: new Date().toISOString(),
          cachedSchedule: data,
        });
        setFriendCodeInput('');
        showNotification(`成功加入好友【${data.ownerName}】(${clean})！`);
      }
    } catch {
      showNotification('連線查詢失敗，請稍後再試');
    } finally {
      setIsAddingFriend(false);
    }
  };

  // 💾 Export & Import JSON Backup
  const handleExportData = () => {
    const exportPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      courses,
      todos,
      transactions,
      calendarEvents,
      classPeriods: periods,
      customExpenseCategories,
      customIncomeCategories,
      customTodoCategories,
      savedFriends,
      settings: {
        ...settings,
        ownerName,
        shareCode,
        dailyLimit,
        resetDay,
        lineUserId,
        pushHour,
        pushMinute,
        isLinePushEnabled,
        autoSyncEnabled,
        autoSyncTime,
        autoSyncIntervalMinutes,
        theme,
      },
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('📦 資料已成功匯出備份 JSON！');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const ok = restoreBackupData(parsed);
        if (ok) {
          showNotification('🎉 備份檔案已成功還原並生效！');
        } else {
          showNotification('還原失敗：檔案格式不正確');
        }
      } catch {
        showNotification('解析 JSON 檔案失敗，請確認檔案格式');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    resetAllData();
    setShowResetConfirm(false);
    showNotification('⚠️ 已清除所有本機快取並重設為初始狀態！');
  };

  return (
    <div className="space-y-4 pb-32 animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
            系統與個人化設定中心
          </h2>
          <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 font-bold mt-0.5">
            所有帳號、課表節次、雲端同步與推播在此統一管理
          </p>
        </div>

        <button
          onClick={handleSaveAllSettings}
          className="px-3.5 py-2 rounded-2xl bg-calico-orange text-white font-black text-xs shadow-ios hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1 shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>儲存全部</span>
        </button>
      </div>

      {/* Alert Banner */}
      {alertMsg && (
        <div className="p-3.5 rounded-2xl bg-calico-sage/15 border border-calico-sage/30 text-calico-cocoa dark:text-zinc-100 text-xs font-bold flex items-center space-x-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. 👤 使用者帳戶與稱呼 (Account & Profile Hub) */}
      {/* ======================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                使用者帳戶與個人稱呼
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                {currentUser ? `已登入：@${currentUser.username}` : '訪客模式（未登入）'}
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
                <span>切換 / 登入其他帳號</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>登入 / 註冊帳號</span>
              </>
            )}
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2.5 text-xs">
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              自訂顯示稱呼 (暱稱)
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="例如：同學、小明..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
            <div>
              <span className="font-bold text-calico-cocoa/70 dark:text-zinc-400 block text-xs">
                專屬課表分享碼
              </span>
              <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-500">
                提供給朋友即可一鍵追蹤課表
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-black text-calico-orange px-2.5 py-1 rounded-lg bg-calico-orange/15 text-xs">
                {shareCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200 hover:bg-calico-orange/15 hover:text-calico-orange active:scale-95 transition-all"
                title="複製代碼"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-calico-sage" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {currentUser && (
            <div className="pt-1 border-t border-black/5 dark:border-white/5 flex justify-end">
              <button
                type="button"
                onClick={logoutUser}
                className="text-red-500 hover:text-red-600 text-xs font-bold flex items-center space-x-1 py-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>登出當前帳號</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. ☁️ 雲端資料庫與自動同步 (Supabase Cloud & Auto-Sync) */}
      {/* ======================================================== */}
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
                  背景定時同步週期
                </label>
                <select
                  value={autoSyncIntervalMinutes}
                  onChange={(e) => setAutoSyncIntervalMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
                >
                  <option value={240}>每 4 小時自動同步 (推薦)</option>
                  <option value={480}>每 8 小時自動同步</option>
                  <option value={720}>每 12 小時自動同步</option>
                  <option value={1440}>每 24 小時 (每日) 自動同步</option>
                  <option value={0}>僅在固定時間上傳</option>
                  <option value={60}>每 1 小時自動同步</option>
                  <option value={120}>每 2 小時自動同步</option>
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

            {/* Google Gemini AI OCR Configuration & Tester */}
            <div className="p-3.5 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-calico-orange/15 text-calico-orange">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-calico-cocoa dark:text-zinc-200 block text-xs">
                      Google Gemini AI 課表辨識設定
                    </span>
                    <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                      模型：gemini-2.5-flash (支援前端直連與雲端備援)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleTestGemini}
                    disabled={isTestingGemini}
                    className="px-2.5 py-1.5 rounded-xl bg-calico-orange/15 text-calico-orange font-bold hover:bg-calico-orange/25 active:scale-95 transition-all flex items-center space-x-1 disabled:opacity-50 text-[11px]"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingGemini ? 'animate-spin' : ''}`} />
                    <span>{isTestingGemini ? '測試中...' : '測試連線'}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                    <Key className="w-3 h-3 text-calico-orange" />
                    <span>Gemini API Key</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-calico-orange hover:underline font-bold flex items-center space-x-0.5"
                  >
                    <span>免費取得 API Key ↗</span>
                  </a>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="貼上您的 Gemini API Key (AIzaSy...)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="px-2 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 text-[11px] font-bold"
                  >
                    {showGeminiKey ? '隱藏' : '顯示'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGeminiApiKey}
                    disabled={isSavingGeminiKey}
                    className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSavingGeminiKey ? '儲存中...' : '儲存 Key'}
                  </button>
                </div>
              </div>

              {geminiTestStatus && (
                <div
                  className={`p-2 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 ${
                    geminiTestStatus.ok
                      ? 'bg-calico-sage/15 text-calico-sage border border-calico-sage/20'
                      : 'bg-red-500/15 text-red-500 border border-red-500/20'
                  }`}
                >
                  {geminiTestStatus.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{geminiTestStatus.message}</span>
                </div>
              )}
            </div>

            {/* Advanced Supabase settings toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvancedSupabase(!showAdvancedSupabase)}
                className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-orange flex items-center space-x-1"
              >
                <Database className="w-3.5 h-3.5" />
                <span>進階 Supabase 雲端資料庫連線</span>
                {showAdvancedSupabase ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showAdvancedSupabase && (
                <div className="mt-2 p-3 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2 text-xs animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-0.5">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-0.5">
                      Supabase Anon Public Key
                    </label>
                    <input
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSupabaseUrl(DEFAULT_SUPABASE_URL);
                      setSupabaseAnonKey(DEFAULT_SUPABASE_ANON_KEY);
                      showNotification('已恢復為預設 Supabase 伺服器！');
                    }}
                    className="text-[11px] text-calico-orange hover:underline font-bold"
                  >
                    恢復預設雲端伺服器
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. 🤖 LINE 官方帳號推播中心 (LINE Push Notification Center) */}
      {/* ======================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#06C755]/15 text-[#06C755] dark:text-[#25D366]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                LINE 官方推播中心 (每日晨報)
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                官方帳號：可樂小幫手 (@112mlifa)
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isLinePushEnabled}
              onChange={(e) => setIsLinePushEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06C755]"></div>
          </label>
        </div>

        {/* Bot Info & Quick Action Banner */}
        <div className="p-3.5 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#06C755] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                  可樂小幫手
                </span>
                <span className="font-mono text-[10px] bg-[#06C755]/20 text-[#06C755] dark:text-[#25D366] px-1.5 py-0.5 rounded font-black">
                  @112mlifa
                </span>
              </div>
              <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 truncate">
                每日晨報、課表代碼自動回覆與花費提醒
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <a
              href="https://line.me/R/ti/p/@112mlifa"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-[#06C755] text-white font-bold text-xs flex items-center space-x-1 shadow-xs hover:brightness-105 active:scale-95 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>加好友</span>
            </a>
          </div>
        </div>

        <div className="space-y-2.5 pt-1 border-t border-black/5 dark:border-white/5">
          {/* Push Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                每日晨報發送時間 (時)
              </label>
              <select
                value={pushHour}
                onChange={(e) => setPushHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')} 點
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                發送時間 (分)
              </label>
              <select
                value={pushMinute}
                onChange={(e) => setPushMinute(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
              >
                <option value={0}>00 分</option>
                <option value={15}>15 分</option>
                <option value={30}>30 分</option>
                <option value={45}>45 分</option>
              </select>
            </div>
          </div>

          {/* 🌆 晚間 18:00 叮嚀與收支推播 */}
          <div className="p-3 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 block">
                  🌆 晚間 18:00 收支與待辦叮嚀
                </span>
                <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                  平日推播今日花費與未完成待辦（若今日待辦皆完成則自動靜音不打擾）
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                <input
                  type="checkbox"
                  checked={isEveningPushEnabled}
                  onChange={(e) => setIsEveningPushEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06C755]"></div>
              </label>
            </div>
          </div>

          {/* 🔔 待辦事項到期通知開關 */}
          <div className="p-3 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 block">
                  🔔 待辦事項到期前 LINE 提醒
                </span>
                <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                  依各項待辦設定之提醒時間（例如 1 天前、3 小時前）發送專屬卡片
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                <input
                  type="checkbox"
                  checked={isTodoReminderEnabled}
                  onChange={(e) => setIsTodoReminderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06C755]"></div>
              </label>
            </div>
          </div>

          {/* LINE Channel Access Token Direct Configuration */}
          <div className="p-3.5 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-[#06C755]" />
                <span>LINE Channel Access Token (長期權限碼)</span>
              </label>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#06C755] hover:underline font-bold flex items-center space-x-0.5"
              >
                <span>LINE Developers 後台 ↗</span>
              </a>
            </div>
            <div className="flex items-center space-x-1.5">
              <input
                type={showLineToken ? 'text' : 'password'}
                value={lineChannelToken}
                onChange={(e) => setLineChannelToken(e.target.value)}
                placeholder="貼上 Messaging API 頁籤底部的 Channel access token"
                className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowLineToken(!showLineToken)}
                className="px-2 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 text-[11px] font-bold"
              >
                {showLineToken ? '隱藏' : '顯示'}
              </button>
              <button
                type="button"
                onClick={handleSaveLineToken}
                disabled={isSavingLineToken}
                className="px-3 py-1.5 rounded-xl bg-[#06C755] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSavingLineToken ? '儲存中...' : '儲存 Token'}
              </button>
            </div>
            <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400">
              貼上後點擊儲存，將直接寫入 Supabase 的 app_api_configs，雲端定時排程推播即可透過 LINE 官方伺服器發送訊息！
            </p>
          </div>

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
              className="flex-1 py-2 px-3 rounded-xl bg-[#06C755]/15 text-[#06C755] dark:text-[#25D366] text-xs font-bold flex items-center justify-center space-x-1 hover:bg-[#06C755]/25 active:scale-95 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isClaimingLineId ? '尋找新好友中...' : '一鍵自動認領 LINE ID'}</span>
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

          {/* Webhook & Setup Guide Accordion */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => setShowLineGuide(!showLineGuide)}
              className="text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400 hover:text-[#06C755] flex items-center justify-between w-full py-1"
            >
              <span className="flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#06C755]" />
                <span>LINE Bot 無法使用？查看設定檢查清單 (3 步驟)</span>
              </span>
              {showLineGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showLineGuide && (
              <div className="mt-2.5 p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-3 text-xs animate-fade-in">
                {/* Step 1 */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-calico-cocoa dark:text-zinc-200">
                    <span className="w-4 h-4 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>LINE Developers Console 設定 Webhook</span>
                  </div>
                  <p className="text-[11px] text-calico-cocoa/70 dark:text-zinc-400 pl-5.5">
                    前往 Messaging API 頁籤，將 Webhook URL 填入下方網址並點擊 Verify，確保「Use Webhook」開關為開啟（Enabled）：
                  </p>
                  <div className="pl-5.5 flex items-center space-x-1.5 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-[10px] font-mono text-calico-cocoa dark:text-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-[#06C755]/15 hover:text-[#06C755] text-xs font-bold flex items-center space-x-1 transition-all"
                    >
                      {copiedWebhook ? (
                        <Check className="w-3.5 h-3.5 text-calico-sage" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedWebhook ? '已複製' : '複製'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-1 border-t border-black/5 dark:border-white/5 pt-2">
                  <div className="flex items-center space-x-1.5 font-bold text-calico-cocoa dark:text-zinc-200">
                    <span className="w-4 h-4 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>LINE Official Account Manager (manager.line.biz) 回應設定</span>
                  </div>
                  <p className="text-[11px] text-calico-cocoa/70 dark:text-zinc-400 pl-5.5">
                    在官方帳號後台「設定」&gt;「回應設定」中：
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-calico-cocoa/70 dark:text-zinc-400 pl-6 space-y-0.5">
                    <li>開啟 <span className="font-bold text-calico-cocoa dark:text-zinc-200">「Webhook」</span></li>
                    <li>關閉 <span className="font-bold text-calico-cocoa dark:text-zinc-200">「自動回應訊息」</span>（停用後才不會被預設罐頭文字覆蓋）</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="space-y-1 border-t border-black/5 dark:border-white/5 pt-2">
                  <div className="flex items-center space-x-1.5 font-bold text-calico-cocoa dark:text-zinc-200">
                    <span className="w-4 h-4 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[10px]">3</span>
                    <span>加好友並傳送分享碼</span>
                  </div>
                  <p className="text-[11px] text-calico-cocoa/70 dark:text-zinc-400 pl-5.5">
                    加入官方帳號好友後，在對話框直接傳送自己的分享碼 <span className="font-mono font-bold text-calico-orange bg-calico-orange/10 px-1 rounded">{shareCode}</span>，機器人會立即回傳綁定成功訊息！接著返回此處點擊上方「一鍵自動認領 LINE ID」即可。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ======================================================== */}
      {/* 4. ⏰ 課表每節課時間與節次自訂 (Inline Class Period Times) */}
      {/* ======================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                課表每節課時間與節次自訂 ({periods.length} 節)
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                依學校鐘聲自訂各節次起訖時間，與帳號同步獨立
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPeriodsList(!showPeriodsList)}
            className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200"
          >
            {showPeriodsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showPeriodsList && (
          <div className="space-y-3 pt-1 border-t border-black/5 dark:border-white/5 animate-fade-in">
            {/* Quick Templates */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400">
                快速範本：
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('default')}
                  className="px-2.5 py-1 rounded-xl bg-calico-cream dark:bg-zinc-800 text-[11px] font-bold text-calico-cocoa/80 dark:text-zinc-300 hover:text-calico-orange transition-all"
                >
                  標準大專 (08:10起)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('eight_am')}
                  className="px-2.5 py-1 rounded-xl bg-calico-cream dark:bg-zinc-800 text-[11px] font-bold text-calico-cocoa/80 dark:text-zinc-300 hover:text-calico-orange transition-all"
                >
                  整點起 (08:00起)
                </button>
              </div>
            </div>

            {/* Period rows */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {periods.map((p, index) => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                    p.isNoon
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
                      : 'bg-calico-cream/60 dark:bg-zinc-800/60 border-black/5 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 w-24 shrink-0">
                    <span className="w-4 h-4 rounded-md bg-black/5 dark:bg-white/10 flex items-center justify-center text-[9px] font-black text-calico-cocoa/60 dark:text-zinc-400">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handlePeriodNameChange(p.id, e.target.value)}
                      className="w-full px-1.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold"
                    />
                  </div>

                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <input
                      type="time"
                      value={p.startTime}
                      onChange={(e) => handlePeriodTimeChange(p.id, 'startTime', e.target.value)}
                      className="flex-1 px-1.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-center"
                    />
                    <span className="text-xs font-bold text-calico-cocoa/40">~</span>
                    <input
                      type="time"
                      value={p.endTime}
                      onChange={(e) => handlePeriodTimeChange(p.id, 'endTime', e.target.value)}
                      className="flex-1 px-1.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePeriod(p.id)}
                    className="p-1 rounded-lg text-calico-cocoa/30 hover:text-red-500 shrink-0"
                    title="刪除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddPeriod}
              className="w-full py-2 rounded-2xl border border-dashed border-calico-orange/40 hover:border-calico-orange text-calico-orange bg-calico-orange/5 text-xs font-black transition-all flex items-center justify-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增課表節次 (如夜間部第 11 節)</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. 🏷️ 自訂記帳與待辦分類 (Custom Categories Manager) */}
      {/* ======================================================== */}
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
              自訂支出、收入與待辦項目的標籤與代表色
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
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
            支出 ({customExpenseCategories.length})
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
            收入 ({customIncomeCategories.length})
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
            待辦 ({customTodoCategories.length})
          </button>
        </div>

        {/* Tags List */}
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 rounded-2xl bg-calico-cream/40 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5">
          {(activeCategoryTab === 'expense'
            ? customExpenseCategories
            : activeCategoryTab === 'income'
            ? customIncomeCategories
            : customTodoCategories
          ).map((c) => (
            <div
              key={c.id || c.name}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 flex items-center space-x-1.5 text-xs font-bold shadow-2xs"
            >
              <CategoryIcon iconKey={c.icon} name={c.name} colorHex={c.colorHex} size="xs" />
              <span className="text-calico-cocoa dark:text-zinc-100">{c.name}</span>
              <button
                type="button"
                onClick={() => deleteCustomCategory(activeCategoryTab, c.id || c.name)}
                className="text-calico-cocoa/30 hover:text-red-500 transition-colors ml-1 p-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                title="刪除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={`輸入新${activeCategoryTab === 'expense' ? '支出' : activeCategoryTab === 'income' ? '收入' : '待辦'}名稱`}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold"
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-4 py-2 rounded-xl bg-calico-orange text-white text-xs font-black shadow-xs active:scale-95 disabled:opacity-40 transition-all flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增</span>
            </button>
          </div>

          {/* Icon Selector Grid */}
          <div>
            <span className="text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
              選擇類別專屬圖示 (16款)：
            </span>
            <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10">
              {AVAILABLE_CATEGORY_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = newCatIcon === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setNewCatIcon(item.id)}
                    title={item.label}
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-calico-orange text-white shadow-xs ring-2 ring-calico-orange/40 font-bold'
                        : 'text-calico-cocoa/60 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Palette & Custom Color Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400">
                選擇類別代表色 (18色或自訂)：
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-500 font-mono">
                  {newCatColor}
                </span>
                <label className="relative flex items-center cursor-pointer">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="sr-only"
                  />
                  <span
                    className="w-5 h-5 rounded-md border border-black/20 dark:border-white/20 shadow-2xs block"
                    style={{ backgroundColor: newCatColor }}
                    title="自訂調色盤"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10">
              {EXTENDED_COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewCatColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-md transition-all ${
                    newCatColor.toLowerCase() === c.toLowerCase()
                      ? 'ring-2 ring-calico-cocoa dark:ring-white scale-110 shadow-xs'
                      : 'opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>
        </form>
      </div>


      {/* ======================================================== */}
      {/* 6. 💰 記帳週期與花費限額 (Budget & Billing Cycle) */}
      {/* ======================================================== */}
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
              設定每月零用錢重置日與每日預算
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-black/5 dark:border-white/5">
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              每月重置日 (發薪日/生活費)
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

      {/* ======================================================== */}
      {/* 7. 🤝 好友共享代碼與權限管理 (Friend Sharing & Permissions) */}
      {/* ======================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                好友課表與記帳共享設定
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                自訂共享權限，互換代碼即可查看課表
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePublishSchedule}
            disabled={isPublishingShare}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:brightness-105 active:scale-95 transition-all flex items-center space-x-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isPublishingShare ? '同步發布中...' : '發布至雲端'}</span>
          </button>
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/5 text-xs font-bold">
          <label className="flex items-center justify-between p-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/60">
            <span className="text-calico-cocoa dark:text-zinc-200">開放好友查看課表</span>
            <input
              type="checkbox"
              checked={isShareCourses}
              onChange={(e) => setIsShareCourses(e.target.checked)}
              className="accent-calico-orange w-4 h-4 rounded cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between p-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/60">
            <span className="text-calico-cocoa dark:text-zinc-200">開放好友查看記帳總覽</span>
            <input
              type="checkbox"
              checked={isShareAccounting}
              onChange={(e) => setIsShareAccounting(e.target.checked)}
              className="accent-calico-orange w-4 h-4 rounded cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between p-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/60">
            <span className="text-calico-cocoa dark:text-zinc-200">開放好友查看行事曆</span>
            <input
              type="checkbox"
              checked={isShareCalendar}
              onChange={(e) => setIsShareCalendar(e.target.checked)}
              className="accent-calico-orange w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Add Friend Code Form */}
        <form onSubmit={handleAddFriend} className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder="輸入好友的分享碼 (如 CAMP88)"
            value={friendCodeInput}
            onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-bold uppercase"
          />
          <button
            type="submit"
            disabled={!friendCodeInput.trim() || isAddingFriend}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs active:scale-95 disabled:opacity-40"
          >
            {isAddingFriend ? '加入中...' : '加入好友'}
          </button>
        </form>

        {/* Saved Friends List */}
        {savedFriends.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block mb-1.5">
              已追蹤的好友課表 ({savedFriends.length})
            </span>
            <div className="space-y-1.5">
              {savedFriends.map((f) => (
                <div
                  key={f.shareCode}
                  className="p-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-calico-cocoa dark:text-zinc-200">{f.ownerName}</span>
                    <span className="font-mono text-calico-orange bg-calico-orange/10 px-1.5 py-0.5 rounded text-[10px]">
                      {f.shareCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFriendRecord(f.shareCode)}
                    className="text-calico-cocoa/30 hover:text-red-500"
                    title="移除好友"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 8. 🎨 系統外觀、主題與可樂管家設定 (Appearance & Mascot) */}
      {/* ======================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              外觀色彩與可樂管家偏好
            </h3>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              深淺主題模式與校園趣味功能快捷體驗
            </p>
          </div>
        </div>

        {/* Theme Segmented Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-calico-cream dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              updateSettings({ theme: 'light' });
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              theme === 'light'
                ? 'bg-white text-calico-cocoa shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>淺色模式</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              updateSettings({ theme: 'dark' });
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              theme === 'dark'
                ? 'bg-zinc-900 text-white shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>深色模式</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('system');
              updateSettings({ theme: 'system' });
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              theme === 'system'
                ? 'bg-calico-orange text-white shadow-xs font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>跟隨系統</span>
          </button>
        </div>

        {/* Mascot Mood Selector */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
            可樂管家當前心情
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'happy', label: '開心 😺' },
              { id: 'thinking', label: '認真 🧐' },
              { id: 'proud', label: '自豪 😎' },
              { id: 'sleeping', label: '放鬆 😴' },
            ].map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setCatMood(m.id as any)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                  catMood === m.id
                    ? 'bg-calico-orange/15 border-calico-orange text-calico-orange font-black shadow-2xs'
                    : 'bg-calico-cream/60 dark:bg-zinc-800/60 border-black/5 dark:border-white/5 text-calico-cocoa/70 dark:text-zinc-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campus Fun Features Launchpad */}
        <div className="pt-2">
          <span className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5">
            校園百寶箱小工具快速開啟
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setIsFortuneModalOpen(true)}
              className="p-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-[11px] font-bold text-calico-cocoa dark:text-zinc-200 hover:border-amber-400 transition-all flex flex-col items-center"
            >
              <span>🎋</span>
              <span className="mt-0.5">每日吉籤</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFoodRouletteOpen(true)}
              className="p-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-[11px] font-bold text-calico-cocoa dark:text-zinc-200 hover:border-calico-orange transition-all flex flex-col items-center"
            >
              <span>🍱</span>
              <span className="mt-0.5">吃啥轉盤</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPomodoroOpen(true)}
              className="p-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-[11px] font-bold text-calico-cocoa dark:text-zinc-200 hover:border-indigo-400 transition-all flex flex-col items-center"
            >
              <span>⏱️</span>
              <span className="mt-0.5">伴讀番茄</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 9. 💾 資料備份、還原與重置 (Data Backup, Restore & Reset) */}
      {/* ======================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-calico-cocoa/10 text-calico-cocoa dark:text-zinc-200">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              資料備份、匯入還原與清除
            </h3>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              完整的本機 JSON 匯出備份與還原機制
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={handleExportData}
            className="py-2.5 px-3 rounded-2xl bg-calico-cream/80 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-calico-orange/15 hover:text-calico-orange active:scale-95 transition-all shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>匯出備份 JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-2xl bg-calico-cream/80 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-calico-orange/15 hover:text-calico-orange active:scale-95 transition-all shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            <span>匯入還原 JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />
        </div>

        {/* Clear Data Reset Button */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5">
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清除本機快取並重設為初始狀態</span>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 space-y-2 animate-fade-in">
              <div className="flex items-center space-x-1.5 text-red-600 dark:text-red-400 text-xs font-black">
                <AlertTriangle className="w-4 h-4" />
                <span>確定要清除本機所有資料嗎？此動作無法復原！</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetAllData}
                  className="py-1.5 px-3 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 active:scale-95"
                >
                  確認重設
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="py-1.5 px-3 rounded-xl bg-black/5 dark:bg-white/10 text-calico-cocoa dark:text-zinc-200 text-xs font-bold"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2">
        <button
          onClick={handleSaveAllSettings}
          className="w-full py-4 px-6 rounded-2xl bg-calico-orange text-white font-black shadow-ios active:scale-95 transition-all flex items-center justify-center space-x-2 text-sm tracking-wide hover:brightness-105"
        >
          <Save className="w-4 h-4" />
          <span>儲存全部設定並生效</span>
        </button>
      </div>
    </div>
  );
};
