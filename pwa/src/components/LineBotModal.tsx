import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  bindLineFollower,
  sendTestLineMessage,
  saveUserLineBotPushSettings,
} from '../services/supabase';
import {
  MessageCircle,
  X,
  UserCheck,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface LineBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LineBotModal: React.FC<LineBotModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, settings, updateSettings, courses, todos } = useApp();

  const userKey = currentUser ? currentUser.id : 'device_local';
  const shareCode = currentUser ? currentUser.shareCode : settings.shareCode;
  const userName = currentUser ? currentUser.displayName : settings.ownerName;

  const [lineUserId, setLineUserId] = useState(currentUser?.lineUserId || settings.lineUserId || '');
  const [pushHour, setPushHour] = useState(settings.linePushHour ?? 7);
  const [pushMinute, setPushMinute] = useState(settings.linePushMinute ?? 0);
  const [isEnabled, setIsEnabled] = useState(settings.isLinePushEnabled ?? true);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClaim = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await bindLineFollower(shareCode, userKey);
      if (res && res.ok && res.line_user_id) {
        setLineUserId(res.line_user_id);
        updateSettings({ lineUserId: res.line_user_id });
        setIsSuccess(true);
        setStatusMessage(`成功自動配對並綁定您的專屬 LINE ID：${res.line_user_id}`);
      } else {
        setIsSuccess(false);
        setStatusMessage('尚未收到新好友事件，請先在 LINE 點擊「加入機器人好友」或傳送您的分享碼！');
      }
    } catch {
      setIsSuccess(false);
      setStatusMessage('連線異常，請確認 Supabase 設定');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!lineUserId) {
      setIsSuccess(false);
      setStatusMessage('請先綁定 LINE User ID！');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const ok = await sendTestLineMessage(
        lineUserId,
        `🐾 哈囉 ${userName}！這是來自 Campus 專屬您的獨立推播測試！\n您的課表代碼為【${shareCode}】\n每日晨報將在每天早上 ${String(pushHour).padStart(2, '0')}:${String(pushMinute).padStart(2, '0')} 準時為您發送！`
      );
      if (ok) {
        setIsSuccess(true);
        setStatusMessage('測試訊息已成功發送至您的 LINE，請查看聊天室！');
      } else {
        setIsSuccess(false);
        setStatusMessage('推播失敗，請確認 Supabase 雲端 Token 是否正常');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      updateSettings({
        lineUserId,
        linePushHour: pushHour,
        linePushMinute: pushMinute,
        isLinePushEnabled: isEnabled,
      });

      const ok = await saveUserLineBotPushSettings(
        userKey,
        lineUserId,
        shareCode,
        userName,
        pushHour,
        pushMinute,
        isEnabled,
        courses,
        todos
      );

      setIsSuccess(true);
      setStatusMessage(ok ? '已成功儲存您的單人專屬推播排程！' : '已儲存至本機設定');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-28 sm:pb-6">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-calico-sage/15 text-calico-sage">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                LINE Bot 智慧晨報專區
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                每位使用者完全獨立隔離，不混淆推播
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-calico-cream/80 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-calico-orange" />
            <div>
              <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-100 block">
                專屬推播對象：{userName}
              </span>
              <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 font-mono">
                課表代碼：{shareCode}
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-calico-sage/15 text-calico-sage font-extrabold">
            獨立隔離
          </span>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              isSuccess
                ? 'bg-calico-sage/15 text-calico-sage'
                : 'bg-red-50 dark:bg-red-950/30 text-red-600'
            }`}
          >
            {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Step 1 & Step 2 Buttons */}
        <div className="mt-4 space-y-2.5">
          <a
            href="https://line.me/R/ti/p/@2011715565"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-[#06C755] text-white font-extrabold flex items-center justify-center space-x-2 shadow-sm hover:brightness-105 active:scale-95 transition-all text-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>步驟 1：點此加入可樂助教 LINE 好友</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleClaim}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-calico-orange/15 text-calico-orange font-extrabold flex items-center justify-center space-x-2 hover:bg-calico-orange/25 active:scale-95 transition-all text-xs"
          >
            <UserCheck className="w-4 h-4" />
            <span>步驟 2：自動認領並配對您的 LINE ID</span>
          </button>
        </div>

        {/* LINE User ID Field */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
            您的 LINE User ID (U 開頭 33 碼)
          </label>
          <input
            type="text"
            value={lineUserId}
            onChange={(e) => setLineUserId(e.target.value)}
            placeholder="加好友後點擊「步驟2」自動帶入"
            className="w-full px-3 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono"
          />
        </div>

        {/* Schedule Timing */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>每日晨報推播時間</span>
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="checkbox"
                id="enablePush"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-calico-orange focus:ring-calico-orange cursor-pointer"
              />
              <label htmlFor="enablePush" className="text-xs font-bold text-calico-cocoa select-none cursor-pointer">
                啟用定時推播
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-calico-cocoa/50 font-bold block mb-1">小時 (0-23)</span>
              <input
                type="number"
                min="0"
                max="23"
                value={pushHour}
                onChange={(e) => setPushHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-black text-center"
              />
            </div>
            <div>
              <span className="text-[10px] text-calico-cocoa/50 font-bold block mb-1">分鐘 (0-59)</span>
              <input
                type="number"
                min="0"
                max="59"
                value={pushMinute}
                onChange={(e) => setPushMinute(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-black text-center"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-2">
          <button
            onClick={handleSendTest}
            disabled={isLoading || !lineUserId}
            className="w-full py-3 rounded-xl bg-calico-cream dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-200 font-extrabold text-xs flex items-center justify-center space-x-1.5 border border-black/10 dark:border-white/10 hover:bg-black/5 active:scale-95 transition-all disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>發送單人測試推播至我的 LINE</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-calico-orange text-white font-black text-sm shadow-sm hover:brightness-105 active:scale-95 transition-all"
          >
            儲存個人推播設定
          </button>
        </div>
      </div>
    </div>
  );
};
