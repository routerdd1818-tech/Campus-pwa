import React, { useState } from 'react';
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
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, isSyncing, syncWithSupabase } = useApp();

  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || DEFAULT_SUPABASE_URL);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [shareCode, setShareCode] = useState(settings.shareCode || 'CAMP88');
  const [ownerName, setOwnerName] = useState(settings.ownerName || '我的課表');
  const [lineUserId, setLineUserId] = useState(settings.lineUserId || '');
  const [pushHour, setPushHour] = useState(settings.linePushHour ?? 7);
  const [pushMinute, setPushMinute] = useState(settings.linePushMinute ?? 0);
  const [dailyLimit, setDailyLimit] = useState(settings.customDailyLimit ?? 300);
  const [resetDay, setResetDay] = useState(settings.accountingResetDay ?? 1);

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
    });
    resetSupabaseClient(supabaseUrl, supabaseAnonKey);
    setAlertMsg('設定已儲存！');
    setTimeout(() => setAlertMsg(null), 3000);
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
          雲端與系統設定
        </h2>
        <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400">
          Supabase 雲端資料庫、LINE Bot 晨報與記帳規則
        </p>
      </div>

      {alertMsg && (
        <div className="p-3.5 rounded-2xl bg-calico-sage/15 border border-calico-sage/30 text-calico-cocoa dark:text-zinc-100 text-xs font-bold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* 1. Supabase Cloud Vault Section */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              Supabase 雲端保險箱與同步
            </h3>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              無須在本地架伺服器，API 與資料庫全託管在 Supabase
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              課表 6 碼分享代碼
            </label>
            <input
              type="text"
              maxLength={6}
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-bold tracking-widest"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              顯示名稱
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 2. LINE Bot Settings */}
      <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-calico-sage/15 text-calico-sage">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              LINE 官方帳號每日晨報推播
            </h3>
            <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
              加好友自動綁定 User ID，每天早上準時推播今日課表與待辦
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              已綁定的 LINE User ID (U 開頭 33 碼)
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
              <span>{isClaimingLineId ? '尋找好友中...' : '自動認領加好友的 LINE ID'}</span>
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

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                每日推播小時 (0-23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={pushHour}
                onChange={(e) => setPushHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                每日推播分鐘 (0-59)
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={pushMinute}
                onChange={(e) => setPushMinute(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Budget Settings */}
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
