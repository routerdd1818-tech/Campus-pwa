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
  ShieldCheck,
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

  // Custom nickname state (for logged-in user profile view)
  const [customNickname, setCustomNickname] = useState(
    currentUser?.displayName || settings.ownerName || ''
  );
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);
  const [nicknameSuccess, setNicknameSuccess] = useState(false);

  // Switch account state (when already logged in)
  const [showSwitchForm, setShowSwitchForm] = useState(false);

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

        // Always pass password when rememberMe is true to maintain auto-login
        setCurrentUser(res.user, rememberMe ? password : null);
        setSuccessMessage(`🎉 註冊成功！歡迎 ${res.user.displayName}，專屬課表代碼：${res.user.shareCode}`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const res = await loginUserAccount(username, password);
        if (!res.ok || !res.user) {
          throw new Error(res.error || '登入失敗');
        }

        setCurrentUser(res.user, rememberMe ? password : null);
        setSuccessMessage(`🐾 登入成功！歡迎回來，${res.user.displayName}`);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '連線錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-28 sm:pb-6 relative overflow-hidden">
        {/* Top Decorative Color Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-calico-orange via-amber-400 to-calico-sage" />

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-calico-orange/15 text-calico-orange flex items-center justify-center font-black shadow-2xs text-lg">
              🐾
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {currentUser ? '使用者帳戶中心' : '歡迎使用 Campus 可樂管家'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400 font-bold">
                {currentUser
                  ? `已登入：${currentUser.displayName} (@${currentUser.username})`
                  : '請先登入或註冊，確保個人課表與記帳完全獨立'}
              </p>
            </div>
          </div>

          {/* Only allow closing if already logged in */}
          {currentUser && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa transition-all"
              title="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* 🌟 SCENARIO A: Already Logged In (Profile View & Switcher) */}
        {/* ======================================================== */}
        {currentUser && !showSwitchForm ? (
          <div className="mt-4 space-y-4 animate-fade-in">
            {/* Account Details Card */}
            <div className="p-4 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/10 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-calico-cocoa/60 dark:text-zinc-400">登入帳號</span>
                <span className="font-mono font-black text-calico-cocoa dark:text-zinc-200">
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
                  {currentUser.lineUserId ? currentUser.lineUserId : '未綁定 (可由設定頁自動認領)'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold border-t border-black/5 dark:border-white/5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>已自動保持登入 · 資料與其他帳號完全隔離</span>
              </div>
            </div>

            {/* Custom Nickname Edit */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 flex items-center space-x-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-calico-orange" />
                  <span>自訂顯示稱呼 (暱稱)</span>
                </span>
                {nicknameSuccess && (
                  <span className="text-[11px] text-calico-sage font-extrabold flex items-center space-x-1 animate-fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>已儲存！</span>
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveNickname} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customNickname}
                  onChange={(e) => setCustomNickname(e.target.value)}
                  placeholder="請輸入您的稱呼..."
                  className="flex-1 px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={isUpdatingNickname || !customNickname.trim()}
                  className="px-3.5 py-2 rounded-xl bg-calico-orange text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs disabled:opacity-50 shrink-0"
                >
                  {isUpdatingNickname ? '儲存中' : '更新暱稱'}
                </button>
              </form>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowSwitchForm(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-calico-cream/80 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-200 font-bold text-xs hover:bg-calico-orange/15 hover:text-calico-orange transition-all flex items-center justify-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>切換為其他帳號</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  logoutUser();
                  setShowSwitchForm(false);
                }}
                className="py-2.5 px-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-100 transition-colors flex items-center space-x-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>登出</span>
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 🌟 SCENARIO B: First-time / Logged-out Login & Register Gate */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 animate-fade-in">
            {/* Friendly Announcement Banner */}
            {!currentUser && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 font-bold flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  歡迎來到 Campus！登入或註冊後將為您建立專屬獨立空間，系統會自動保持登入，確保課表與記帳不與他人重疊。
                </span>
              </div>
            )}

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

            {/* Cancel Switch Account Button if already logged in */}
            {currentUser && showSwitchForm && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSwitchForm(false)}
                  className="text-xs text-calico-orange font-bold hover:underline"
                >
                  ← 返回目前帳號
                </button>
              </div>
            )}

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-calico-sage/15 text-calico-sage text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Username Input */}
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

            {/* Display Name Input (Only on Register) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                  初始姓名或自訂稱呼 (暱稱)
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

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                密碼 (Password) *
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

            {/* Auto-Login Option (Checked by default) */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-calico-orange accent-calico-orange cursor-pointer"
              />
              <label
                htmlFor="rememberMe"
                className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-300 cursor-pointer select-none"
              >
                自動保持登入 (推薦，下次開啟免重輸)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-calico-orange text-white font-black flex items-center justify-center space-x-2 shadow-ios hover:brightness-105 active:scale-95 transition-all text-sm tracking-wide mt-2 disabled:opacity-50"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{isLoading ? '處理中...' : mode === 'login' ? '立即登入並進入課表' : '立即註冊並啟用帳號'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
