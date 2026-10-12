// ============================================================================
// 🔔 PWA Web Notifications API & Service Worker Notification Center
// ============================================================================
import { Todo, CalendarEvent, Transaction, SavedFriendRecord } from '../types';

export interface NotificationDataContext {
  todos: Todo[];
  calendarEvents: CalendarEvent[];
  transactions: Transaction[];
  savedFriends: SavedFriendRecord[];
  isTodoReminderEnabled?: boolean;
  isCalendarReminderEnabled?: boolean;
  isAccountingReminderEnabled?: boolean;
  isFriendRatingReminderEnabled?: boolean;
}

const NOTIFIED_STORAGE_KEY = 'campus_pwa_notified_tags';

/**
 * 檢查當前瀏覽器是否支援 Web Notifications API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * 取得當前通知授權狀態 ('default' | 'granted' | 'denied')
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * 請求使用者授予系統推播通知權限
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('[PWA Notification] Request permission error:', err);
    return 'denied';
  }
}

/**
 * 取得已發送通知的標記集合（防重複推播）
 */
function getNotifiedTags(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const clean: Record<string, number> = {};
    // 保留最近 7 天內的標記
    for (const [tag, timestamp] of Object.entries(parsed)) {
      if (typeof timestamp === 'number' && now - timestamp < 7 * 86400000) {
        clean[tag] = timestamp;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function markTagAsNotified(tag: string) {
  try {
    const tags = getNotifiedTags();
    tags[tag] = Date.now();
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(tags));
  } catch {}
}

export function isTagNotified(tag: string): boolean {
  const tags = getNotifiedTags();
  return Boolean(tags[tag]);
}

/**
 * 發送原生 PWA 系統推播通知
 * 優先使用 Service Worker registration.showNotification，在背景或關閉時依然可彈出
 */
export async function sendPwaNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const tag = options?.tag;
  if (tag && isTagNotified(tag)) {
    return false; // 已發送過此標記，避免重複騷擾
  }

  const notificationOptions: any = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [120, 60, 120],
    ...options,
  };

  try {
    // 1. 優先使用 Service Worker 的 showNotification
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, notificationOptions);
          if (tag) markTagAsNotified(tag);
          return true;
        }
      } catch (swErr) {
        console.warn('[PWA Notification] SW registration.showNotification fallback to window:', swErr);
      }
    }

    // 2. 降級至傳統 Window Notification API
    new Notification(title, notificationOptions);
    if (tag) markTagAsNotified(tag);
    return true;
  } catch (err) {
    console.error('[PWA Notification] Failed to show notification:', err);
    return false;
  }
}

/**
 * 輪詢檢查並觸發所有 PWA 提醒
 */
export function runNotificationChecks(ctx: NotificationDataContext) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = now.toISOString().slice(0, 10);

  // --------------------------------------------------------------------------
  // 1. 📌 待辦事項到期提醒（個人待辦 + 共同行事曆待辦雙向同步提醒）
  // --------------------------------------------------------------------------
  if (ctx.isTodoReminderEnabled !== false) {
    // 收集所有需要提醒的待辦（自己的未完成待辦 + 好友共同行事曆的待辦）
    const allTodosToWatch: { todo: Todo; isShared: boolean; ownerName?: string }[] = [];

    // (A) 使用者自己的未完成待辦
    ctx.todos
      .filter((t) => !t.isCompleted && t.dueDate)
      .forEach((t) => allTodosToWatch.push({ todo: t, isShared: Boolean(t.isSharedToCalendar) }));

    // (B) 來自好友共同行事曆之待辦（且勾選了分享至共同行事曆）
    ctx.savedFriends.forEach((f) => {
      const friendSchedule = f.cachedSchedule;
      if (friendSchedule && Array.isArray(friendSchedule.todosData)) {
        friendSchedule.todosData
          .filter((t) => !t.isCompleted && t.dueDate && t.isSharedToCalendar)
          .forEach((t) =>
            allTodosToWatch.push({
              todo: t,
              isShared: true,
              ownerName: f.nickname || f.ownerName,
            })
          );
      }
    });

    allTodosToWatch.forEach(({ todo, isShared, ownerName }) => {
      if (!todo.dueDate) return;
      const dueTime = new Date(todo.dueDate).getTime();
      const diffMs = dueTime - nowMs;

      const advance = todo.reminderAdvance || '1d';
      let shouldAlert = false;
      let alertReason = '';

      if (advance === 'due' && diffMs <= 15 * 60 * 1000 && diffMs >= -30 * 60 * 1000) {
        shouldAlert = true;
        alertReason = '已到截止時間！';
      } else if (advance === '1h' && diffMs <= 60 * 60 * 1000 && diffMs >= 0) {
        shouldAlert = true;
        alertReason = '即將於 1 小時內截止！';
      } else if (advance === '3h' && diffMs <= 3 * 3600 * 1000 && diffMs >= 0) {
        shouldAlert = true;
        alertReason = '即將於 3 小時內截止！';
      } else if (advance === '1d' && diffMs <= 24 * 3600 * 1000 && diffMs >= 0) {
        shouldAlert = true;
        alertReason = '即將於 1 天內截止！';
      } else if (advance === '2d' && diffMs <= 48 * 3600 * 1000 && diffMs >= 0) {
        shouldAlert = true;
        alertReason = '即將於 2 天內截止！';
      } else if (advance === '3d' && diffMs <= 72 * 3600 * 1000 && diffMs >= 0) {
        shouldAlert = true;
        alertReason = '即將於 3 天內截止！';
      }

      if (shouldAlert) {
        const tag = `todo_pwa_${todo.id}_${advance}`;
        const title = isShared
          ? `🤝 共同行事曆待辦即期提醒`
          : `📌 待辦任務即期提醒`;
        const body = ownerName
          ? `【${ownerName} 與你共同的任務】${todo.title}\n⏰ ${alertReason}請把握時間完成！`
          : `任務：${todo.title}\n⏰ ${alertReason}請把握時間完成！`;

        sendPwaNotification(title, {
          body,
          tag,
          data: { type: 'todo', id: todo.id },
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. 📅 行事曆日程開始提醒
  // --------------------------------------------------------------------------
  if (ctx.isCalendarReminderEnabled !== false) {
    const allEventsToWatch: CalendarEvent[] = [...ctx.calendarEvents];

    // 同步納入好友共享行事曆中今日之行程
    ctx.savedFriends.forEach((f) => {
      if (f.cachedSchedule && Array.isArray(f.cachedSchedule.calendarEventsData)) {
        allEventsToWatch.push(...f.cachedSchedule.calendarEventsData);
      }
    });

    allEventsToWatch.forEach((ev) => {
      if (ev.startDate <= todayStr && ev.endDate >= todayStr) {
        if (ev.startTime) {
          const [h, m] = ev.startTime.split(':').map(Number);
          const eventTime = new Date(now);
          eventTime.setHours(h, m, 0, 0);
          const diffMs = eventTime.getTime() - nowMs;

          // 行程開始前 15 分鐘提醒
          if (diffMs <= 15 * 60 * 1000 && diffMs >= 0) {
            const tag = `cal_event_${ev.id}_${todayStr}`;
            sendPwaNotification(`📅 行事曆行程即將開始`, {
              body: `「${ev.title}」將於 ${ev.startTime} 開始，地點/備註：${ev.notes || '無'}`,
              tag,
              data: { type: 'calendar', id: ev.id },
            });
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. 💰 每日晚間記帳提醒 (Evening Accounting Reminder)
  // --------------------------------------------------------------------------
  if (ctx.isAccountingReminderEnabled !== false) {
    const hour = now.getHours();
    const minute = now.getMinutes();

    // 晚間 21:00 之後檢查今天是否已有記帳
    if (hour >= 21) {
      const hasTodayExpense = ctx.transactions.some(
        (t) => t.date.slice(0, 10) === todayStr
      );

      if (!hasTodayExpense) {
        const tag = `accounting_evening_${todayStr}`;
        sendPwaNotification(`💰 今日記帳打卡提醒 🐾`, {
          body: `今天過得如何呢？別忘了記下一天的開銷，讓可樂三花貓陪你養成儲蓄好習慣！`,
          tag,
          data: { type: 'accounting' },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4. ⭐️ 好友消費評分提醒 (Peer Rating Reminder)
  // --------------------------------------------------------------------------
  if (ctx.isFriendRatingReminderEnabled !== false) {
    ctx.savedFriends.forEach((f) => {
      const friendSchedule = f.cachedSchedule;
      if (friendSchedule && Array.isArray(friendSchedule.accountingData)) {
        const unratedTxs = friendSchedule.accountingData.filter(
          (tx) => !tx.peerRating && (tx.type === 'expense' || !tx.type)
        );

        if (unratedTxs.length > 0) {
          const latestTx = unratedTxs[0];
          const tag = `peer_rating_pwa_${f.shareCode}_${latestTx.id}`;
          sendPwaNotification(`⭐️ 好友消費待評分提醒`, {
            body: `${f.nickname || f.ownerName} 新增了消費「${latestTx.notes || latestTx.categoryName}」$${latestTx.amount}，快去好友帳本打個星級評分吧！`,
            tag,
            data: { type: 'peer_rating', shareCode: f.shareCode },
          });
        }
      }
    });
  }
}

/**
 * 啟動 PWA 通知背景輪詢排程（每 60 秒執行一次）
 */
export function startPwaNotificationScheduler(
  getData: () => NotificationDataContext
): () => void {
  // 啟動時先執行一次
  runNotificationChecks(getData());

  const intervalId = setInterval(() => {
    try {
      runNotificationChecks(getData());
    } catch (err) {
      console.warn('[PWA Notification] Scheduler loop error:', err);
    }
  }, 60 * 1000);

  return () => {
    clearInterval(intervalId);
  };
}

/**
 * 發送共享行事曆內容異動系統推播（新增或刪除）
 */
export function notifySharedCalendarChange(
  action: 'added' | 'deleted',
  itemType: '行程' | '待辦',
  title: string,
  friendName: string
) {
  const icon = action === 'added' ? '📅' : '🗑️';
  const actionText = action === 'added' ? '新增了' : '移除了';
  sendPwaNotification(`${icon} 共享行事曆異動通知`, {
    body: `${friendName} ${actionText}${itemType}「${title}」，共同行事曆已同步更新！`,
    tag: `shared_change_${Date.now()}`,
  });
}
