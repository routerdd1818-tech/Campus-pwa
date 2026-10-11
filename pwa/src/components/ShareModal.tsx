import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  publishSharedSchedule,
  fetchSharedScheduleByCode,
} from '../services/supabase';
import { SavedFriendRecord, SharedScheduleData } from '../types';
import {
  Users,
  Copy,
  Check,
  Share2,
  Lock,
  CloudUpload,
  UserPlus,
  BookOpen,
  Calendar,
  Wallet,
  X,
  Trash2,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    settings,
    updateSettings,
    courses,
    todos,
    transactions,
    calendarEvents,
    savedFriends,
    saveFriendRecord,
    removeFriendRecord,
  } = useApp();

  const myShareCode = currentUser?.shareCode || settings.shareCode || 'CAMP88';
  const myOwnerName = currentUser?.displayName || settings.ownerName || '同學';

  const [copied, setCopied] = useState(false);
  const [ownerNameInput, setOwnerNameInput] = useState(myOwnerName);
  const [isShareCourses, setIsShareCourses] = useState(true);
  const [isShareAccounting, setIsShareAccounting] = useState(true);
  const [isShareCalendar, setIsShareCalendar] = useState(true);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  // Add friend inputs
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [friendNicknameInput, setFriendNicknameInput] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendErrorMessage, setFriendErrorMessage] = useState<string | null>(null);

  // Viewing friend details
  const [activeFriendSchedule, setActiveFriendSchedule] = useState<SharedScheduleData | null>(null);
  const [activeFriendName, setActiveFriendName] = useState<string>('');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myShareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishSchedule = async () => {
    setIsPublishing(true);
    setPublishMessage(null);

    const scheduleData: SharedScheduleData = {
      shareCode: myShareCode,
      ownerName: ownerNameInput.trim() || myOwnerName,
      isSharingEnabled: isShareCourses,
      coursesData: isShareCourses ? courses.filter((c) => c.isSharedWithFriends !== false) : [],
      todosData: isShareCalendar ? todos.filter((t) => t.isCompleted === false) : [],
      accountingData: isShareAccounting ? transactions.filter((t) => t.isSharedWithFriends !== false) : [],
      calendarEventsData: isShareCalendar ? calendarEvents.filter((e) => e.isSharedWithFriends !== false) : [],
      isExpenseSharingEnabled: isShareAccounting,
      updatedAt: new Date().toISOString(),
    };

    updateSettings({ ownerName: ownerNameInput.trim() || myOwnerName });

    const ok = await publishSharedSchedule(scheduleData);
    setIsPublishing(false);
    if (ok) {
      setPublishMessage(`課表、行事曆與記帳已成功同步發布至雲端！代碼：${myShareCode}`);
    } else {
      setPublishMessage('同步發布失敗，請確認網路連線');
    }
    setTimeout(() => setPublishMessage(null), 4000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = friendCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === myShareCode) {
      setFriendErrorMessage('不能加入自己的分享代碼喔！');
      return;
    }

    setIsAddingFriend(true);
    setFriendErrorMessage(null);

    try {
      const data = await fetchSharedScheduleByCode(cleanCode);
      if (!data) {
        setFriendErrorMessage('找不到此代碼的課表，可能代碼有誤或對方未開啟分享！');
        return;
      }

      const nickname = friendNicknameInput.trim() || data.ownerName || '好朋友';
      const record: SavedFriendRecord = {
        shareCode: cleanCode,
        ownerName: data.ownerName,
        nickname,
        lastViewedAt: new Date().toISOString(),
        cachedSchedule: data,
      };

      saveFriendRecord(record);
      setFriendCodeInput('');
      setFriendNicknameInput('');
      setActiveFriendSchedule(data);
      setActiveFriendName(nickname);
    } catch {
      setFriendErrorMessage('載入好友課表失敗，請檢查網路連線');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleOpenFriend = async (friend: SavedFriendRecord) => {
    setActiveFriendName(friend.nickname || friend.ownerName);
    // Fetch latest schedule
    const latest = await fetchSharedScheduleByCode(friend.shareCode);
    if (latest) {
      setActiveFriendSchedule(latest);
      saveFriendRecord({ ...friend, cachedSchedule: latest, lastViewedAt: new Date().toISOString() });
    } else if (friend.cachedSchedule) {
      setActiveFriendSchedule(friend.cachedSchedule);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                {activeFriendSchedule ? `好友：${activeFriendName}` : '行事曆與課表好友共享中心'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                {activeFriendSchedule ? '即時查看好友共享的課表、活動與記帳' : '課表、行事曆、記帳好友免帳號無縫互通'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (activeFriendSchedule) {
                setActiveFriendSchedule(null);
              } else {
                onClose();
              }
            }}
            className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If viewing a specific friend's schedule */}
        {activeFriendSchedule ? (
          <div className="mt-4 space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-black text-calico-orange px-2 py-0.5 rounded bg-calico-orange/15">
                  代碼：{activeFriendSchedule.shareCode}
                </span>
                <h4 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 mt-1">
                  {activeFriendName} ({activeFriendSchedule.ownerName})
                </h4>
              </div>
              <button
                onClick={() => setActiveFriendSchedule(null)}
                className="text-xs font-bold text-calico-orange underline"
              >
                返回名冊
              </button>
            </div>

            {/* Friend Courses */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-calico-orange" />
                <span>好友每週課表 ({activeFriendSchedule.coursesData?.length || 0} 門)</span>
              </h5>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {activeFriendSchedule.coursesData?.map((c) => (
                  <div
                    key={c.id}
                    style={{ borderLeftColor: c.colorHex }}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border-l-4 border shadow-2xs flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-extrabold text-calico-cocoa dark:text-zinc-100">{c.name}</span>
                      <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400">
                        週{['一','二','三','四','五','六','日'][c.dayOfWeek - 1]} · {c.classroom || '未定'}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-300">
                      {c.startTime} - {c.endTime}
                    </span>
                  </div>
                ))}
                {(!activeFriendSchedule.coursesData || activeFriendSchedule.coursesData.length === 0) && (
                  <p className="text-xs text-calico-cocoa/40 py-2 text-center">對方未公開課表</p>
                )}
              </div>
            </div>

            {/* Friend Calendar Events */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-calico-sage" />
                <span>好友近期活動 ({activeFriendSchedule.calendarEventsData?.length || 0} 項)</span>
              </h5>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activeFriendSchedule.calendarEventsData?.map((e) => (
                  <div
                    key={e.id}
                    style={{ borderLeftColor: e.colorHex }}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border-l-4 border shadow-2xs flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-extrabold text-calico-cocoa dark:text-zinc-100">{e.title}</span>
                      <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400">
                        {e.startDate} ~ {e.endDate}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-bold">
                      {e.category}
                    </span>
                  </div>
                ))}
                {(!activeFriendSchedule.calendarEventsData || activeFriendSchedule.calendarEventsData.length === 0) && (
                  <p className="text-xs text-calico-cocoa/40 py-2 text-center">對方無公開活動</p>
                )}
              </div>
            </div>

            {/* Friend Shared Expenses */}
            {activeFriendSchedule.isExpenseSharingEnabled && (
              <div className="space-y-2">
                <h5 className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-500" />
                  <span>好友公開記帳 ({activeFriendSchedule.accountingData?.length || 0} 筆)</span>
                </h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activeFriendSchedule.accountingData?.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-xl bg-white dark:bg-zinc-800 border flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-calico-cocoa dark:text-zinc-100">{t.categoryName}</span>
                        <span className="text-[10px] text-calico-cocoa/60 ml-1">{t.notes}</span>
                      </div>
                      <span className="font-mono font-black text-calico-orange">${t.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Main Sharing Control */
          <div className="mt-4 space-y-4">
            {publishMessage && (
              <div className="p-3 rounded-2xl bg-calico-sage/15 border border-calico-sage/30 text-xs font-bold text-calico-cocoa dark:text-zinc-100 animate-fade-in">
                {publishMessage}
              </div>
            )}

            {/* 1. My Share Code Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-calico-cream to-white dark:from-zinc-800 dark:to-zinc-800/60 border border-black/5 dark:border-white/10 shadow-ios space-y-3">
              <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block text-center">
                您的專屬 6 碼分享代碼（課表、行事曆、記帳通用）
              </span>

              <div className="flex items-center justify-center space-x-3">
                <span className="text-3xl font-black font-mono tracking-widest text-calico-orange">
                  {myShareCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-calico-orange/15 text-calico-orange hover:bg-calico-orange/25 active:scale-95 transition-all shadow-2xs"
                  title="複製代碼"
                >
                  {copied ? <Check className="w-5 h-5 text-calico-sage" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 mb-1">
                  您的課表暱稱
                </label>
                <input
                  type="text"
                  value={ownerNameInput}
                  onChange={(e) => setOwnerNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-center"
                />
              </div>

              {/* Privacy toggles */}
              <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-calico-cocoa/70 dark:text-zinc-300">允許他人查看課表</span>
                  <input
                    type="checkbox"
                    checked={isShareCourses}
                    onChange={(e) => setIsShareCourses(e.target.checked)}
                    className="w-4 h-4 rounded text-calico-orange focus:ring-calico-orange/40"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-calico-cocoa/70 dark:text-zinc-300">允許他人查看行事曆活動</span>
                  <input
                    type="checkbox"
                    checked={isShareCalendar}
                    onChange={(e) => setIsShareCalendar(e.target.checked)}
                    className="w-4 h-4 rounded text-calico-orange focus:ring-calico-orange/40"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-calico-cocoa/70 dark:text-zinc-300">允許他人查看共享記帳</span>
                  <input
                    type="checkbox"
                    checked={isShareAccounting}
                    onChange={(e) => setIsShareAccounting(e.target.checked)}
                    className="w-4 h-4 rounded text-calico-orange focus:ring-calico-orange/40"
                  />
                </div>
              </div>

              <button
                onClick={handlePublishSchedule}
                disabled={isPublishing}
                className="w-full py-2.5 px-4 rounded-xl bg-calico-orange text-white text-xs font-black shadow-ios-sm active:scale-95 transition-all flex items-center justify-center space-x-1.5 hover:brightness-105"
              >
                {isPublishing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>{isPublishing ? '發布同步中...' : '發布 / 同步最新資料至雲端'}</span>
              </button>
            </div>

            {/* 2. Add Friend by Share Code */}
            <form onSubmit={handleAddFriend} className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
              <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1.5">
                <UserPlus className="w-4 h-4 text-calico-orange" />
                <span>加入好友分享碼</span>
              </h4>

              {friendErrorMessage && (
                <p className="text-xs text-red-500 font-bold">{friendErrorMessage}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="好友 6 碼代碼"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                  className="px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-mono font-bold tracking-widest text-center"
                />
                <input
                  type="text"
                  placeholder="自訂好友暱稱"
                  value={friendNicknameInput}
                  onChange={(e) => setFriendNicknameInput(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={isAddingFriend}
                className="w-full py-2 px-3 rounded-xl bg-calico-cocoa/10 dark:bg-zinc-700 text-calico-cocoa dark:text-zinc-100 font-bold text-xs hover:bg-calico-orange hover:text-white transition-all active:scale-95 flex items-center justify-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAddingFriend ? '尋找並載入中...' : '加入並載入好友課表'}</span>
              </button>
            </form>

            {/* 3. Saved Friends List */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-calico-cocoa/70 dark:text-zinc-400 flex items-center justify-between">
                <span>好友名冊 ({savedFriends.length})</span>
                <span className="text-[10px] font-normal">免重複輸入代碼</span>
              </h4>

              <div className="space-y-1.5">
                {savedFriends.map((f) => (
                  <div
                    key={f.shareCode}
                    className="p-3 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between hover:border-calico-orange/30 transition-all cursor-pointer group"
                    onClick={() => handleOpenFriend(f)}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-calico-orange/15 text-calico-orange font-black text-xs flex items-center justify-center">
                        {f.nickname.slice(0, 1)}
                      </div>
                      <div>
                        <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 group-hover:text-calico-orange transition-colors">
                          {f.nickname}
                        </span>
                        <p className="text-[10px] font-mono text-calico-cocoa/50 dark:text-zinc-400">
                          {f.shareCode} · {f.ownerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFriendRecord(f.shareCode);
                        }}
                        className="p-1 rounded text-calico-cocoa/30 hover:text-red-500"
                        title="移除好友"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-calico-cocoa/40 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}

                {savedFriends.length === 0 && (
                  <p className="text-center text-xs text-calico-cocoa/40 py-4 rounded-2xl border border-dashed border-black/10">
                    尚無儲存的好友，輸入朋友的 6 碼代碼即可加入！
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
