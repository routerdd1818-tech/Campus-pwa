import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { registerUserAccount, loginUserAccount } from '../services/supabase';
import {
  User,
  Lock,
  UserPlus,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Edit3,
  Check,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    setCurrentUser,
    updateCurrentUserDisplayName,
    logoutUser,
    settings,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Custom nickname state
  const [customNickname, setCustomNickname] = useState(
    currentUser?.displayName || settings.ownerName || ''
  );
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);
  const [nicknameSuccess, setNicknameSuccess] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setCustomNickname(currentUser?.displayName || settings.ownerName || '');
  }, [currentUser, settings.ownerName]);

  if (!isOpen) return null;

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNickname.trim()) return;
    setIsUpdatingNickname(true);
    try {
      await updateCurrentUserDisplayName(customNickname.trim());
      setNicknameSuccess(true);
      setTimeout(() => setNicknameSuccess(false), 2500);
    } catch {
      setErrorMessage('更新暱稱失敗，請確認網路狀態');
    } finally {
      setIsUpdatingNickname(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('請填寫完整帳號與密碼');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const res = await registerUserAccount(username, password, displayName);
        if (!res.ok || !res.user) {
          throw new Error(res.error || '註冊失敗');
        }

        setCurrentUser(res.user, rememberMe ? password : null);
        setSuccessMessage(`註冊成功！歡迎 ${res.user.displayName}，專屬課表代碼：${res.user.shareCode}`);
        setTimeout(() => onClose(), 1500);
      } else {
        const res = await loginUserAccount(username, password);
        if (!res.ok || !res.user) {
          throw new Error(res.error || '登入失敗');
        }

        setCurrentUser(res.user, rememberMe ? password : null);
        setSuccessMessage(`登入成功！歡迎回來，${res.user.displayName}`);
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '連線錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-28 sm:pb-6">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-2xl bg-calico-orange/15 text-calico-orange flex items-center justify-center font-black shadow-2xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                {currentUser ? '使用者帳戶中心' : '帳號與訪客管理'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                {currentUser ? `已登入：${currentUser.displayName}` : '支援多帳號切換與訪客模式'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 🌟 1. 自訂暱稱區塊 (任何帳號與訪客皆可直接編輯) */}
        <div className="mt-4 p-4 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 flex items-center space-x-1.5">
              <Edit3 className="w-3.5 h-3.5 text-calico-orange" />
              <span>自訂暱稱 (顯示名稱)</span>
            </span>
            {nicknameSuccess ? (
              <span className="text-[11px] text-calico-sage font-extrabold flex items-center space-x-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>已儲存！</span>
              </span>
            ) : (
              <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                即時同步問候與課表
              </span>
            )}
          </div>

          <form onSubmit={handleSaveNickname} className="flex items-center space-x-2">
            <input
              type="text"
              value={customNickname}
              onChange={(e) => setCustomNickname(e.target.value)}
              placeholder="請輸入您的暱稱..."
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-calico-orange shadow-2xs"
            />
            <button
              type="submit"
              disabled={isUpdatingNickname || !customNickname.trim()}
              className="px-3.5 py-2 rounded-xl bg-calico-orange text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs disabled:opacity-50 shrink-0"
            >
              {isUpdatingNickname ? '儲存中' : '儲存暱稱'}
            </button>
          </form>
        </div>

        {/* 🌟 2. 使用者帳號狀態 */}
        {currentUser ? (
          <div className="mt-4 space-y-4">
            {/* Account Details Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-calico-cocoa/60 dark:text-zinc-400">登入帳號</span>
                <span className="font-mono font-bold text-calico-cocoa dark:text-zinc-200">
                  @{currentUser.username}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-calico-cocoa/60 dark:text-zinc-400">課表專屬代碼</span>
                <span className="font-mono font-black text-calico-orange px-2 py-0.5 rounded-md bg-calico-orange/15">
                  {currentUser.shareCode}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-calico-cocoa/60 dark:text-zinc-400">LINE 推播綁定</span>
                <span className="font-mono text-calico-sage truncate max-w-[170px] font-bold">
                  {currentUser.lineUserId ? currentUser.lineUserId : '未綁定 (可由 LINE 頁綁定)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                logoutUser();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold flex items-center justify-center space-x-2 text-xs hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>切換 / 登出此帳號（回到訪客模式）</span>
            </button>
          </div>
        ) : (
          /* Login / Register Form */
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {/* Toggle Login / Register */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-calico-cream dark:bg-zinc-800 border border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  mode === 'login'
                    ? 'bg-calico-orange text-white shadow-xs'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                登入已有帳號
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  mode === 'register'
                    ? 'bg-calico-orange text-white shadow-xs'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                註冊新帳號
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-calico-sage/15 text-calico-sage text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                帳號 (Username) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-calico-cocoa/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="例如：student123、tommy"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
                />
              </div>
            </div>

            {/* Display Name (Only when registering) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                  初始姓名或暱稱
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-calico-cocoa/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="例如：小明、王同學"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                密碼 *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-calico-cocoa/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="請輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
                />
              </div>
            </div>

            {/* Remember Me / Auto-Login Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-calico-orange focus:ring-calico-orange cursor-pointer"
              />
              <label
                htmlFor="rememberMe"
                className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-300 cursor-pointer select-none"
              >
                記住密碼，下次開啟自動登入
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-calico-orange text-white font-black flex items-center justify-center space-x-2 shadow-sm hover:brightness-105 active:scale-95 transition-all text-xs tracking-wide mt-2"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{isLoading ? '處理中...' : mode === 'login' ? '立即登入' : '立即註冊新帳號'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
