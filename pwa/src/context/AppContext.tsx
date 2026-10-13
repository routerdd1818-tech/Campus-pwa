import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  Course,
  Todo,
  Transaction,
  Installment,
  SplitBill,
  DebtRecord,
  DebtRepayment,
  UserSettings,
  UserAccount,
  CalendarEvent,
  SavedFriendRecord,
  SharedScheduleData,
  CustomCategory,
  ClassPeriod,
} from '../types';
import { DEFAULT_CLASS_PERIODS } from '../components/PeriodSettingsModal';

import {
  fetchCoursesFromSupabase,
  upsertCourseToSupabase,
  deleteCourseFromSupabase,
  batchUpsertCoursesToSupabase,
  fetchTodosFromSupabase,
  upsertTodoToSupabase,
  deleteTodoFromSupabase,
  batchUpsertTodosToSupabase,
  fetchTransactionsFromSupabase,
  upsertTransactionToSupabase,
  deleteTransactionFromSupabase,
  batchUpsertTransactionsToSupabase,
  fetchCalendarEventsFromSupabase,
  upsertCalendarEventToSupabase,
  deleteCalendarEventFromSupabase,
  batchUpsertCalendarEventsToSupabase,
  syncAllLocalDataToSupabase,
  saveUserLineBotPushSettings,
  publishSharedSchedule,
  fetchSharedScheduleByCode,
  loginUserAccount,
  updateUserAccountDisplayName,
  rateFriendTransaction,
  toUUID,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '../services/supabase';
import {
  startPwaNotificationScheduler,
  notifySharedCalendarChange,
} from '../services/notificationService';

// 預設示範課程資料
const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    name: '演算法分析與設計',
    code: 'CS301',
    classroom: '工程館 302',
    instructor: '陳教授',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '12:00',
    colorHex: '#E67E22',
  },
  {
    id: 'c2',
    name: '作業系統',
    code: 'CS305',
    classroom: '電資大樓 105',
    instructor: '林教授',
    dayOfWeek: 2,
    startTime: '13:30',
    endTime: '16:20',
    colorHex: '#3D2F2E',
  },
  {
    id: 'c3',
    name: '人工智慧導論',
    code: 'AI401',
    classroom: '資訊館 201',
    instructor: '黃教授',
    dayOfWeek: 3,
    startTime: '10:10',
    endTime: '12:00',
    colorHex: '#48BB78',
  },
  {
    id: 'c4',
    name: '軟體工程專題',
    code: 'CS410',
    classroom: '創客教室 A',
    instructor: '張教授',
    dayOfWeek: 4,
    startTime: '14:00',
    endTime: '17:00',
    colorHex: '#ED8936',
  },
  {
    id: 'c5',
    name: '電腦網路概論',
    code: 'CS308',
    classroom: '工程館 101',
    instructor: '李教授',
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    colorHex: '#4A3E3D',
  },
];

const INITIAL_TODOS: Todo[] = [
  {
    id: 't_travel',
    title: '12/7~12/14 日本東京自由行 (度假出遊)',
    startDate: '2026-12-07',
    endDate: '2026-12-14',
    dueDate: '2026-12-07T08:00:00.000Z',
    isCompleted: false,
    priority: 'high',
    category: '出國/旅遊',
    recurrence: 'custom_period',
    notes: '護照換日幣、成田特快 Skyliner 車票、Bic Camera 優惠券',
  },
  {
    id: 't1',
    title: '演算法作業二：動態規劃解題',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    isCompleted: false,
    priority: 'high',
    category: '作業',
  },
  {
    id: 't2',
    title: '作業系統小考範圍複習第 4-6 章',
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    isCompleted: false,
    priority: 'medium',
    category: '考試',
  },
  {
    id: 't3',
    title: '閱讀 Attention Is All You Need 論文',
    isCompleted: true,
    priority: 'low',
    category: '論文閱讀',
    readingStatus: '已讀畢',
  },
];


const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx1',
    amount: 120,
    type: 'expense',
    categoryName: '餐飲',
    categoryIcon: 'coffee',
    categoryColorHex: '#E67E22',
    paymentMethodName: 'LINE Pay',
    date: new Date().toISOString(),
    notes: '學餐排骨飯 + 綠茶',
    valueScore: 9,
  },
  {
    id: 'tx2',
    amount: 65,
    type: 'expense',
    categoryName: '交通',
    categoryIcon: 'bus',
    categoryColorHex: '#48BB78',
    paymentMethodName: '悠遊卡',
    date: new Date(Date.now() - 86400000).toISOString(),
    notes: '捷運通學來回',
    valueScore: 8,
  },
];

const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'e1',
    title: '期中考週 (Midterms)',
    startDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 8).toISOString().slice(0, 10),
    isAllDay: true,
    colorHex: '#E67E22',
    category: '考試',
    notes: '全校期中考週，自習室 24H 開放',
    isSharedWithFriends: true,
  },
  {
    id: 'e2',
    title: '系學會秋季露營 (Camping Trip)',
    startDate: new Date(Date.now() + 86400000 * 11).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 13).toISOString().slice(0, 10),
    isAllDay: true,
    colorHex: '#48BB78',
    category: '活動',
    notes: '南投清境農場，攜帶保暖衣物',
    isSharedWithFriends: true,
  },
  {
    id: 'e3',
    title: '軟體專題期末成果發表',
    startDate: new Date(Date.now() + 86400000 * 16).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 16).toISOString().slice(0, 10),
    startTime: '13:30',
    endTime: '17:00',
    isAllDay: false,
    colorHex: '#3182CE',
    category: '專案',
    notes: '創客教室 A，準備簡報與 Demo 影片',
    isSharedWithFriends: true,
  },
];

export const DEFAULT_EXPENSE_CATEGORIES: CustomCategory[] = [
  { id: 'cat_food', name: '餐飲', icon: 'coffee', colorHex: '#E67E22' },
  { id: 'cat_trans', name: '交通', icon: 'bus', colorHex: '#48BB78' },
  { id: 'cat_study', name: '學習', icon: 'book', colorHex: '#3182CE' },
  { id: 'cat_life', name: '生活', icon: 'shopping-cart', colorHex: '#805AD5' },
  { id: 'cat_ent', name: '娛樂', icon: 'gamepad-2', colorHex: '#D53F8C' },
  { id: 'cat_tech', name: '數位 3C', icon: 'laptop', colorHex: '#3D2F2E' },
  { id: 'cat_other', name: '其他', icon: 'more-horizontal', colorHex: '#718096' },
];

export const DEFAULT_INCOME_CATEGORIES: CustomCategory[] = [
  { id: 'inc_allowance', name: '生活費', icon: 'home', colorHex: '#48BB78' },
  { id: 'inc_salary', name: '薪資/家教', icon: 'briefcase', colorHex: '#3182CE' },
  { id: 'inc_scholarship', name: '獎學金', icon: 'award', colorHex: '#ECC94B' },
  { id: 'inc_other', name: '其他收入', icon: 'dollar-sign', colorHex: '#805AD5' },
];

export const DEFAULT_TODO_CATEGORIES: CustomCategory[] = [
  { id: 'todo_hw', name: '作業', colorHex: '#E67E22' },
  { id: 'todo_exam', name: '考試', colorHex: '#E53E3E' },
  { id: 'todo_report', name: '報告', colorHex: '#3182CE' },
  { id: 'todo_life', name: '生活', colorHex: '#48BB78' },
  { id: 'todo_personal', name: '個人', colorHex: '#805AD5' },
  { id: 'todo_paper', name: '論文閱讀', colorHex: '#3D2F2E' },
  { id: 'todo_trip', name: '出國/旅遊', colorHex: '#DD6B20' },
];

const DEFAULT_SETTINGS: UserSettings = {
  supabaseUrl: DEFAULT_SUPABASE_URL,
  supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
  shareCode: 'CAMP88',
  ownerName: '我的課表',
  accountingResetDay: 1,
  isIncomeBasedDailyLimit: false,
  customDailyLimit: 300,
  lineUserId: 'U13454cc9b1940c43887043382887308c',
  linePushHour: 7,
  linePushMinute: 0,
  isLinePushEnabled: true,
  lineEveningPushEnabled: true,
  lineEveningPushHour: 18,
  lineEveningPushMinute: 0,
  lineTodoReminderEnabled: true,
  theme: 'light',
  autoSyncEnabled: true,
  autoSyncTime: '23:00',
  autoSyncIntervalMinutes: 240, // 4小時為預設值，兼顧省電與雲端備份
  isShareCourses: true,
  isShareAccounting: true,
  isShareCalendar: true,
  enableFortuneWidget: true,
  pwaNotificationEnabled: true,
  pwaTodoReminderEnabled: true,
  pwaCalendarReminderEnabled: true,
  pwaAccountingReminderEnabled: true,
  pwaPeerRatingReminderEnabled: true,
  pwaSharedCalendarNotifyEnabled: true,
};

interface BudgetInfo {
  todaySpent: number;
  effectiveLimit: number;
  remaining: number;
  daysUntilReset: number;
  totalMonthExpense: number;
}

interface AppContextType {
  activeTab: 'today' | 'schedule' | 'calendar' | 'todos' | 'accounting' | 'settings';
  setActiveTab: (tab: 'today' | 'schedule' | 'calendar' | 'todos' | 'accounting' | 'settings') => void;
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null, rememberPassword?: string | null) => void;
  updateCurrentUserDisplayName: (newDisplayName: string) => Promise<boolean>;
  logoutUser: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isLineBotModalOpen: boolean;
  setIsLineBotModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  isEventModalOpen: boolean;
  setIsEventModalOpen: (open: boolean) => void;
  isPeriodModalOpen: boolean;
  setIsPeriodModalOpen: (open: boolean) => void;
  // Campus fun features modals
  isFortuneModalOpen: boolean;
  setIsFortuneModalOpen: (open: boolean) => void;
  isFoodRouletteOpen: boolean;
  setIsFoodRouletteOpen: (open: boolean) => void;
  isPomodoroOpen: boolean;
  setIsPomodoroOpen: (open: boolean) => void;
  restoreBackupData: (data: any) => boolean;
  resetAllData: () => void;
  eventToEdit: CalendarEvent | null;
  setEventToEdit: (e: CalendarEvent | null) => void;
  courses: Course[];
  todos: Todo[];
  transactions: Transaction[];
  calendarEvents: CalendarEvent[];
  classPeriods: ClassPeriod[];
  updateClassPeriods: (periods: ClassPeriod[]) => void;
  installments: Installment[];
  splitBills: SplitBill[];
  debts: DebtRecord[];
  addDebt: (debt: DebtRecord) => void;
  updateDebt: (debt: DebtRecord) => void;
  deleteDebt: (id: string) => void;
  repayDebt: (debtId: string, amount: number, note?: string, date?: string) => void;
  addSplitBill: (bill: SplitBill) => void;
  updateSplitBill: (bill: SplitBill) => void;
  deleteSplitBill: (id: string) => void;
  settleSplitParticipant: (billId: string, participantOrIndex: string | number) => void;
  settleEntireSplitBill: (billId: string) => void;
  savedFriends: SavedFriendRecord[];
  settings: UserSettings;
  isSyncing: boolean;
  isOnline: boolean;
  budgetInfo: BudgetInfo;
  catMood: 'happy' | 'sleeping' | 'thinking' | 'proud';
  setCatMood: (mood: 'happy' | 'sleeping' | 'thinking' | 'proud') => void;
  // Custom categories
  customExpenseCategories: CustomCategory[];
  customIncomeCategories: CustomCategory[];
  customTodoCategories: CustomCategory[];
  addCustomCategory: (type: 'expense' | 'income' | 'todo', cat: { name: string; colorHex: string; icon?: string }) => void;
  updateCustomCategory: (type: 'expense' | 'income' | 'todo', id: string, updates: { name?: string; colorHex?: string; icon?: string }) => void;
  reorderCustomCategories: (type: 'expense' | 'income' | 'todo', reordered: CustomCategory[]) => void;
  deleteCustomCategory: (type: 'expense' | 'income' | 'todo', idOrName: string) => void;
  // Scheduled cloud upload & auto-sync
  lastSyncedAt: string | null;
  nextSyncDisplay: string;
  triggerManualUpload: () => Promise<void>;
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addTodo: (todo: Todo) => Promise<void>;
  updateTodo: (todo: Todo) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCalendarEvent: (e: CalendarEvent) => Promise<void>;
  updateCalendarEvent: (e: CalendarEvent) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;
  saveFriendRecord: (record: SavedFriendRecord) => void;
  removeFriendRecord: (shareCode: string) => void;
  updateSettings: (s: Partial<UserSettings>) => void;
  rateFriendAccounting: (
    friendShareCode: string,
    transactionId: string,
    rating: number,
    feedback: string
  ) => Promise<boolean>;
  syncWithSupabase: (targetUser?: UserAccount | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);


export function deduplicateCourses(list: Course[]): Course[] {
  if (!list || !Array.isArray(list)) return [];
  const result: Course[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const item of list) {
    if (!item) continue;
    const rawId = String(item.id || '');
    const canonicalId = toUUID(rawId);
    const name = (item.name || '').trim().toLowerCase();
    const fp = `${name}|${item.dayOfWeek}|${item.startTime || ''}`;

    if (
      (rawId && seenIds.has(rawId)) ||
      (canonicalId && seenIds.has(canonicalId)) ||
      (name && seenFingerprints.has(fp))
    ) {
      continue;
    }

    if (rawId) seenIds.add(rawId);
    if (canonicalId) seenIds.add(canonicalId);
    if (name) seenFingerprints.add(fp);
    result.push({ ...item, id: canonicalId });
  }
  return result;
}

export function deduplicateTodos(list: Todo[]): Todo[] {
  if (!list || !Array.isArray(list)) return [];
  const result: Todo[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const item of list) {
    if (!item) continue;
    const rawId = String(item.id || '');
    const canonicalId = toUUID(rawId);
    const title = (item.title || '').trim().toLowerCase();
    let start = '';
    let due = '';
    if (item.startDate) {
      try { start = new Date(item.startDate).toISOString().slice(0, 10); } catch { start = String(item.startDate).slice(0, 10); }
    }
    if (item.dueDate) {
      try { due = new Date(item.dueDate).toISOString().slice(0, 10); } catch { due = String(item.dueDate).slice(0, 10); }
    }

    const isStarterDemo =
      rawId === 't_travel' ||
      rawId === 't1' ||
      rawId === 't2' ||
      rawId === 't3' ||
      rawId.endsWith('_t_travel') ||
      rawId.endsWith('_t1') ||
      rawId.endsWith('_t2') ||
      rawId.endsWith('_t3') ||
      title.includes('日本東京自由行') ||
      title.includes('演算法作業二') ||
      title.includes('作業系統小考範圍') ||
      title.includes('attention is all you need');

    const fp = isStarterDemo ? `starter_todo|${title}` : `${title}|${start}|${due}`;

    const isDuplicate =
      (rawId && seenIds.has(rawId)) ||
      (canonicalId && seenIds.has(canonicalId)) ||
      (title && seenFingerprints.has(fp));

    if (isDuplicate) {
      if (item.isCompleted) {
        const existing = result.find(
          (r) =>
            r.id === rawId ||
            r.id === canonicalId ||
            toUUID(r.id) === canonicalId ||
            ((r.title || '').trim().toLowerCase() === title)
        );
        if (existing) {
          existing.isCompleted = true;
        }
      }
      continue;
    }

    if (rawId) seenIds.add(rawId);
    if (canonicalId) seenIds.add(canonicalId);
    if (title) seenFingerprints.add(fp);
    result.push({ ...item, id: canonicalId });
  }
  return result;
}

export function deduplicateTransactions(list: Transaction[]): Transaction[] {
  if (!list || !Array.isArray(list)) return [];
  const result: Transaction[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const item of list) {
    if (!item) continue;
    const rawId = String(item.id || '');
    const canonicalId = toUUID(rawId);
    let normDate = '';
    if (item.date) {
      try {
        normDate = new Date(item.date).toISOString().slice(0, 10);
      } catch {
        normDate = String(item.date).slice(0, 10);
      }
    }
    const amount = Math.round(Number(item.amount) * 100) / 100;
    const notes = (item.notes || '').trim().toLowerCase();
    const cat = (item.categoryName || '').trim().toLowerCase();
    const type = item.type || 'expense';

    // Identify starter dummy transactions to prevent duplicates across date shifts
    const isStarterDemo =
      notes === '學餐排骨飯 + 綠茶' ||
      notes === '捷運通學來回' ||
      rawId === 'tx1' ||
      rawId === 'tx2' ||
      rawId.endsWith('_tx1') ||
      rawId.endsWith('_tx2');

    const fp = isStarterDemo
      ? `starter_tx|${type}|${amount}|${cat}|${notes}`
      : `${type}|${amount}|${normDate}|${cat}|${notes}`;

    const isDuplicate =
      (rawId && seenIds.has(rawId)) ||
      (canonicalId && seenIds.has(canonicalId)) ||
      seenFingerprints.has(fp);

    if (isDuplicate) {
      if (item.peerRating || item.peerFeedback) {
        const existing = result.find(
          (r) =>
            r.id === rawId ||
            r.id === canonicalId ||
            toUUID(r.id) === canonicalId ||
            (isStarterDemo && `${r.type || 'expense'}|${Math.round(Number(r.amount) * 100) / 100}|${(r.categoryName || '').trim().toLowerCase()}|${(r.notes || '').trim().toLowerCase()}` === `${type}|${amount}|${cat}|${notes}`) ||
            `${r.type || 'expense'}|${Math.round(Number(r.amount) * 100) / 100}|${(r.categoryName || '').trim().toLowerCase()}|${(r.notes || '').trim().toLowerCase()}` === `${type}|${amount}|${cat}|${notes}`
        );
        if (existing) {
          if (item.peerRating && !existing.peerRating) existing.peerRating = item.peerRating;
          if (item.peerFeedback && !existing.peerFeedback) existing.peerFeedback = item.peerFeedback;
          if (item.peerRaterName && !existing.peerRaterName) existing.peerRaterName = item.peerRaterName;
        }
      }
      continue;
    }

    if (rawId) seenIds.add(rawId);
    if (canonicalId) seenIds.add(canonicalId);
    seenFingerprints.add(fp);
    result.push({ ...item, id: canonicalId });
  }
  return result;
}

export function deduplicateCalendarEvents(list: CalendarEvent[]): CalendarEvent[] {
  if (!list || !Array.isArray(list)) return [];
  const result: CalendarEvent[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const item of list) {
    if (!item) continue;
    const rawId = String(item.id || '');
    const canonicalId = toUUID(rawId);
    const title = (item.title || '').trim().toLowerCase();
    let start = '';
    let end = '';
    if (item.startDate) {
      try { start = new Date(item.startDate).toISOString().slice(0, 10); } catch { start = String(item.startDate).slice(0, 10); }
    }
    if (item.endDate) {
      try { end = new Date(item.endDate).toISOString().slice(0, 10); } catch { end = String(item.endDate).slice(0, 10); }
    }

    const isStarterDemo =
      rawId === 'e1' ||
      rawId === 'e2' ||
      rawId === 'e3' ||
      rawId.endsWith('_e1') ||
      rawId.endsWith('_e2') ||
      rawId.endsWith('_e3') ||
      title.includes('期中考週') ||
      title.includes('秋季露營') ||
      title.includes('專題期末成果發表');

    const fp = isStarterDemo ? `starter_event|${title}` : `${title}|${start}|${end}`;

    if (
      (rawId && seenIds.has(rawId)) ||
      (canonicalId && seenIds.has(canonicalId)) ||
      (title && seenFingerprints.has(fp))
    ) {
      continue;
    }

    if (rawId) seenIds.add(rawId);
    if (canonicalId) seenIds.add(canonicalId);
    if (title) seenFingerprints.add(fp);
    result.push({ ...item, id: canonicalId });
  }
  return result;
}

function getScopedKey(userId: string | null | undefined, key: string): string {
  return userId ? `campus_user_${userId}_${key}` : `campus_guest_${key}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'schedule' | 'calendar' | 'todos' | 'accounting' | 'settings'>('today');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [catMood, setCatMood] = useState<'happy' | 'sleeping' | 'thinking' | 'proud'>('happy');

  // 👤 User Account & Modal State
  const initialUser: UserAccount | null = (() => {
    try {
      const saved = localStorage.getItem('campus_auth_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(initialUser);
  const activeUserIdRef = useRef<string | null>(initialUser?.id || null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLineBotModalOpen, setIsLineBotModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isFortuneModalOpen, setIsFortuneModalOpen] = useState(false);
  const [isFoodRouletteOpen, setIsFoodRouletteOpen] = useState(false);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  // Load from LocalStorage (Scoped strictly per user account, with fallback for guest / initial session)
  const [courses, setCourses] = useState<Course[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'courses')) || (!uid ? localStorage.getItem('campus_courses') : null);
    if (saved) {
      try { return deduplicateCourses(JSON.parse(saved)); } catch {}
    }
    return [];
  });

  const [todos, setTodos] = useState<Todo[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'todos')) || (!uid ? localStorage.getItem('campus_todos') : null);
    if (saved) {
      try { return deduplicateTodos(JSON.parse(saved)); } catch {}
    }
    return [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'transactions')) || (!uid ? localStorage.getItem('campus_transactions') : null);
    if (saved) {
      try { return deduplicateTransactions(JSON.parse(saved)); } catch {}
    }
    return [];
  });

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'calendar_events')) || (!uid ? localStorage.getItem('campus_calendar_events') : null);
    if (saved) {
      try { return deduplicateCalendarEvents(JSON.parse(saved)); } catch {}
    }
    return [];
  });

  const coursesRef = useRef(courses);
  coursesRef.current = courses;
  const todosRef = useRef(todos);
  todosRef.current = todos;
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const calendarEventsRef = useRef(calendarEvents);
  calendarEventsRef.current = calendarEvents;
  const isSyncingRef = useRef(false);

  const [classPeriods, setClassPeriods] = useState<ClassPeriod[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'class_periods'));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    if (!uid) {
      const legacy = localStorage.getItem('campus_class_periods');
      if (legacy) {
        try { return JSON.parse(legacy); } catch {}
      }
    }
    return DEFAULT_CLASS_PERIODS;
  });

  const [savedFriends, setSavedFriends] = useState<SavedFriendRecord[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'saved_friends'));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    if (!uid) {
      const legacy = localStorage.getItem('campus_saved_friends');
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  });

  const savedFriendsRef = useRef(savedFriends);
  savedFriendsRef.current = savedFriends;

  const [installments, setInstallments] = useState<Installment[]>(() => {
    const saved = localStorage.getItem('campus_installments');
    return saved ? JSON.parse(saved) : [];
  });

  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'debts')) || (!uid ? localStorage.getItem('campus_debts') : null);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [splitBills, setSplitBills] = useState<SplitBill[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'split_bills')) || (!uid ? localStorage.getItem('campus_split_bills') : null);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'debts'), JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'split_bills'), JSON.stringify(splitBills));
  }, [splitBills]);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const uid = initialUser?.id;
    let loaded: UserSettings;
    const saved = localStorage.getItem(getScopedKey(uid, 'settings'));
    if (saved) {
      try { loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch { loaded = DEFAULT_SETTINGS; }
    } else if (!uid) {
      const legacy = localStorage.getItem('campus_settings');
      loaded = legacy ? { ...DEFAULT_SETTINGS, ...JSON.parse(legacy) } : DEFAULT_SETTINGS;
    } else {
      loaded = {
        ...DEFAULT_SETTINGS,
        ownerName: initialUser?.displayName || (uid ? initialUser!.username : '我的課表'),
        shareCode: initialUser?.shareCode || DEFAULT_SETTINGS.shareCode,
        lineUserId: initialUser?.lineUserId || DEFAULT_SETTINGS.lineUserId,
      };
    }

    // Auto-migrate from old deleted Supabase project dxoobrrjzaovwpyagzgn
    if (loaded.supabaseUrl && (loaded.supabaseUrl.includes('dxoobrrjzaovwpyagzgn') || !loaded.supabaseUrl.startsWith('https://'))) {
      loaded.supabaseUrl = DEFAULT_SUPABASE_URL;
      loaded.supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;
      localStorage.removeItem('campus_supabase_url');
      localStorage.removeItem('campus_supabase_anon_key');
    }
    return loaded;
  });

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Custom categories state (scoped per user)
  const [customExpenseCategories, setCustomExpenseCategories] = useState<CustomCategory[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'custom_expense_cats'));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  });

  const [customIncomeCategories, setCustomIncomeCategories] = useState<CustomCategory[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'custom_income_cats'));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_INCOME_CATEGORIES;
  });

  const [customTodoCategories, setCustomTodoCategories] = useState<CustomCategory[]>(() => {
    const uid = initialUser?.id;
    const saved = localStorage.getItem(getScopedKey(uid, 'custom_todo_cats'));
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_TODO_CATEGORIES;
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem(getScopedKey(initialUser?.id, 'last_synced_at')) || null;
  });

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Theme effect (light / dark / system)
  useEffect(() => {
    const theme = settings.theme || 'light';
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Save to LocalStorage whenever state changes (strictly scoped to active user)
  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'courses'), JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'todos'), JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'transactions'), JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'calendar_events'), JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'class_periods'), JSON.stringify(classPeriods));
  }, [classPeriods]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'saved_friends'), JSON.stringify(savedFriends));
  }, [savedFriends]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'settings'), JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'custom_expense_cats'), JSON.stringify(customExpenseCategories));
  }, [customExpenseCategories]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'custom_income_cats'), JSON.stringify(customIncomeCategories));
  }, [customIncomeCategories]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'custom_todo_cats'), JSON.stringify(customTodoCategories));
  }, [customTodoCategories]);

  const updateClassPeriods = (periods: ClassPeriod[]) => {
    setClassPeriods(periods);
    const uid = activeUserIdRef.current;
    localStorage.setItem(getScopedKey(uid, 'class_periods'), JSON.stringify(periods));
    setSettings((prev) => ({ ...prev, classPeriods: periods }));
  };

  const switchUserData = (nextUser: UserAccount | null) => {
    const oldUid = activeUserIdRef.current;
    const newUid = nextUser?.id || null;

    if (oldUid === newUid) return;

    // 1. Flush memory data to old user's storage
    localStorage.setItem(getScopedKey(oldUid, 'courses'), JSON.stringify(courses));
    localStorage.setItem(getScopedKey(oldUid, 'todos'), JSON.stringify(todos));
    localStorage.setItem(getScopedKey(oldUid, 'transactions'), JSON.stringify(transactions));
    localStorage.setItem(getScopedKey(oldUid, 'calendar_events'), JSON.stringify(calendarEvents));
    localStorage.setItem(getScopedKey(oldUid, 'class_periods'), JSON.stringify(classPeriods));
    localStorage.setItem(getScopedKey(oldUid, 'saved_friends'), JSON.stringify(savedFriends));
    localStorage.setItem(getScopedKey(oldUid, 'settings'), JSON.stringify(settings));
    localStorage.setItem(getScopedKey(oldUid, 'custom_expense_cats'), JSON.stringify(customExpenseCategories));
    localStorage.setItem(getScopedKey(oldUid, 'custom_income_cats'), JSON.stringify(customIncomeCategories));
    localStorage.setItem(getScopedKey(oldUid, 'custom_todo_cats'), JSON.stringify(customTodoCategories));
    localStorage.setItem(getScopedKey(oldUid, 'debts'), JSON.stringify(debts));
    localStorage.setItem(getScopedKey(oldUid, 'split_bills'), JSON.stringify(splitBills));

    // 2. Switch active ref
    activeUserIdRef.current = newUid;

    // 3. Load next user's data from their scoped storage (cloud sync will fetch and merge latest real data)
    const rawCourses = localStorage.getItem(getScopedKey(newUid, 'courses'));
    if (rawCourses) {
      setCourses(deduplicateCourses(JSON.parse(rawCourses)));
    } else {
      setCourses([]);
    }

    const rawTodos = localStorage.getItem(getScopedKey(newUid, 'todos'));
    if (rawTodos) {
      setTodos(deduplicateTodos(JSON.parse(rawTodos)));
    } else {
      setTodos([]);
    }

    const rawTx = localStorage.getItem(getScopedKey(newUid, 'transactions'));
    if (rawTx) {
      setTransactions(deduplicateTransactions(JSON.parse(rawTx)));
    } else {
      setTransactions([]);
    }

    const rawEvents = localStorage.getItem(getScopedKey(newUid, 'calendar_events'));
    if (rawEvents) {
      setCalendarEvents(deduplicateCalendarEvents(JSON.parse(rawEvents)));
    } else {
      setCalendarEvents([]);
    }

    const rawPeriods = localStorage.getItem(getScopedKey(newUid, 'class_periods'));
    setClassPeriods(rawPeriods ? JSON.parse(rawPeriods) : DEFAULT_CLASS_PERIODS);

    const rawFriends = localStorage.getItem(getScopedKey(newUid, 'saved_friends'));
    setSavedFriends(rawFriends ? JSON.parse(rawFriends) : []);

    const rawSettings = localStorage.getItem(getScopedKey(newUid, 'settings'));
    if (rawSettings) {
      setSettings(JSON.parse(rawSettings));
    } else {
      setSettings({
        ...DEFAULT_SETTINGS,
        ownerName: nextUser?.displayName || (newUid ? nextUser!.username : '我的課表'),
        shareCode: nextUser?.shareCode || DEFAULT_SETTINGS.shareCode,
        lineUserId: nextUser?.lineUserId || DEFAULT_SETTINGS.lineUserId,
      });
    }

    const rawExpCats = localStorage.getItem(getScopedKey(newUid, 'custom_expense_cats'));
    setCustomExpenseCategories(rawExpCats ? JSON.parse(rawExpCats) : DEFAULT_EXPENSE_CATEGORIES);

    const rawIncCats = localStorage.getItem(getScopedKey(newUid, 'custom_income_cats'));
    setCustomIncomeCategories(rawIncCats ? JSON.parse(rawIncCats) : DEFAULT_INCOME_CATEGORIES);

    const rawTodoCats = localStorage.getItem(getScopedKey(newUid, 'custom_todo_cats'));
    setCustomTodoCategories(rawTodoCats ? JSON.parse(rawTodoCats) : DEFAULT_TODO_CATEGORIES);

    const rawDebts = localStorage.getItem(getScopedKey(newUid, 'debts'));
    setDebts(rawDebts ? JSON.parse(rawDebts) : []);

    const rawSplitBills = localStorage.getItem(getScopedKey(newUid, 'split_bills'));
    setSplitBills(rawSplitBills ? JSON.parse(rawSplitBills) : []);

    const rawSynced = localStorage.getItem(getScopedKey(newUid, 'last_synced_at'));
    setLastSyncedAt(rawSynced || null);
  };

  // Local-first cloud sync (以本機資料為準同步至雲端，避免清空本機資料)
  const syncWithSupabase = async (targetUser?: UserAccount | null) => {
    if (!navigator.onLine || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    const activeUser = targetUser !== undefined ? targetUser : currentUser;
    const userKey = activeUser ? activeUser.id : (currentUser?.id || 'guest');
    const currentSettings = settingsRef.current;

    try {
      // 1. 本機資料優先：先將手機上的所有課程、待辦、收支、行事曆推送到 Supabase
      const currentLocalData = {
        courses: deduplicateCourses(coursesRef.current),
        todos: deduplicateTodos(todosRef.current),
        transactions: deduplicateTransactions(transactionsRef.current),
        calendarEvents: deduplicateCalendarEvents(calendarEventsRef.current),
      };

      await syncAllLocalDataToSupabase(userKey, currentLocalData);

      // 同步更新好友分享排程與推播設定
      if (currentSettings.shareCode) {
        publishSharedSchedule({
          shareCode: currentSettings.shareCode,
          ownerName: currentSettings.ownerName || '我的課表',
          isSharingEnabled: true,
          coursesData: currentLocalData.courses,
          todosData: currentLocalData.todos,
          accountingData: currentLocalData.transactions,
          calendarEventsData: currentLocalData.calendarEvents,
          isExpenseSharingEnabled: true,
        }).catch(() => {});

        saveUserLineBotPushSettings(
          userKey,
          currentSettings.lineUserId || '',
          currentSettings.shareCode,
          currentSettings.ownerName || '我的課表',
          currentSettings.linePushHour ?? 7,
          currentSettings.linePushMinute ?? 0,
          currentSettings.isLinePushEnabled ?? true,
          currentLocalData.courses,
          currentLocalData.todos,
          currentSettings.lineEveningPushEnabled ?? true,
          currentSettings.lineEveningPushHour ?? 18,
          currentSettings.lineEveningPushMinute ?? 0,
          currentLocalData.transactions,
          currentSettings.lineTodoReminderEnabled ?? true
        ).catch(() => {});
      }

      // 2. 擷取雲端最新資料（透過智慧指紋去重合併補齊，絕不產生雙份重複紀錄）
      const [cloudCourses, cloudTodos, cloudTx, cloudEvents] = await Promise.all([
        fetchCoursesFromSupabase(userKey),
        fetchTodosFromSupabase(userKey),
        fetchTransactionsFromSupabase(userKey),
        fetchCalendarEventsFromSupabase(userKey),
      ]);

      // Guard: 確保在異步請求期間使用者帳號未切換
      if ((activeUser?.id || null) === activeUserIdRef.current) {
        if (cloudCourses.length > 0) {
          setCourses((prev) => deduplicateCourses([...prev, ...cloudCourses]));
        }
        if (cloudTodos.length > 0) {
          setTodos((prev) => deduplicateTodos([...prev, ...cloudTodos]));
        }
        if (cloudTx.length > 0) {
          setTransactions((prev) => deduplicateTransactions([...prev, ...cloudTx]));
        }
        if (cloudEvents.length > 0) {
          setCalendarEvents((prev) => deduplicateCalendarEvents([...prev, ...cloudEvents]));
        }
      }

      const nowIso = new Date().toISOString();
      setLastSyncedAt(nowIso);
      localStorage.setItem(getScopedKey(userKey, 'last_synced_at'), nowIso);
    } catch (e) {
      console.warn('Cloud sync error:', e);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  const syncWithSupabaseRef = useRef(syncWithSupabase);
  syncWithSupabaseRef.current = syncWithSupabase;

  const triggerManualUpload = async () => {
    await syncWithSupabase();
  };

  // Scheduled cloud upload & auto-sync timer
  const nextSyncDisplay = useMemo(() => {
    if (!settings.autoSyncEnabled) return '已停用定時上傳';
    const intervalMins = settings.autoSyncIntervalMinutes ?? 240;
    if (intervalMins === 0) {
      return settings.autoSyncTime ? `每日 ${settings.autoSyncTime} 上傳` : '僅手動同步';
    }
    if (intervalMins >= 60) {
      const hours = Math.round(intervalMins / 60);
      return `每 ${hours} 小時自動同步`;
    }
    return `每 ${intervalMins} 分鐘自動同步`;
  }, [settings.autoSyncEnabled, settings.autoSyncTime, settings.autoSyncIntervalMinutes]);

  useEffect(() => {
    if (!settings.autoSyncEnabled) return;

    let lastTriggeredMinute = '';

    const intervalTimer = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Check periodic interval (e.g. 240 mins = 4 hours, 480 mins = 8 hours)
      if (settings.autoSyncIntervalMinutes && settings.autoSyncIntervalMinutes > 0) {
        if (lastSyncedAt) {
          const lastTime = new Date(lastSyncedAt).getTime();
          const diffMins = (now.getTime() - lastTime) / (1000 * 60);
          if (diffMins >= settings.autoSyncIntervalMinutes) {
            syncWithSupabase();
            return;
          }
        }
      } else if (settings.autoSyncTime && currentHHMM === settings.autoSyncTime && lastTriggeredMinute !== currentHHMM) {
        // If interval is 0, only sync at fixed time (e.g. 23:00)
        lastTriggeredMinute = currentHHMM;
        syncWithSupabase();
        return;
      }
    }, 30000);

    return () => clearInterval(intervalTimer);
  }, [settings.autoSyncEnabled, settings.autoSyncTime, settings.autoSyncIntervalMinutes, lastSyncedAt]);

  // 🔔 啟動 PWA 系統推播通知背景輪詢排程 (行事曆、待辦即期、記帳打卡、好友評分)
  useEffect(() => {
    const stopScheduler = startPwaNotificationScheduler(() => ({
      todos: todosRef.current,
      calendarEvents: calendarEventsRef.current,
      transactions: transactionsRef.current,
      savedFriends: savedFriendsRef.current,
      isTodoReminderEnabled: settingsRef.current.pwaTodoReminderEnabled ?? true,
      isCalendarReminderEnabled: settingsRef.current.pwaCalendarReminderEnabled ?? true,
      isAccountingReminderEnabled: settingsRef.current.pwaAccountingReminderEnabled ?? true,
      isFriendRatingReminderEnabled: settingsRef.current.pwaPeerRatingReminderEnabled ?? true,
    }));

    return () => {
      stopScheduler();
    };
  }, []);

  // 🤝 週期性自動同步好友共享行事曆 (每 3 分鐘檢查是否有新增或刪除行程/待辦)
  useEffect(() => {
    if (!isOnline || savedFriends.length === 0) return;
    const interval = setInterval(async () => {
      for (const friend of savedFriendsRef.current) {
        try {
          const latest = await fetchSharedScheduleByCode(friend.shareCode);
          if (latest) {
            saveFriendRecord({
              ...friend,
              cachedSchedule: latest,
              lastViewedAt: new Date().toISOString(),
            });
          }
        } catch {
          // ignore background sync errors
        }
      }
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isOnline, savedFriends.length]);

  const updateCurrentUserDisplayName = async (newDisplayName: string): Promise<boolean> => {
    const cleanName = newDisplayName.trim() || '同學';
    if (currentUser) {
      const updatedUser: UserAccount = { ...currentUser, displayName: cleanName };
      setCurrentUserState(updatedUser);
      localStorage.setItem('campus_auth_session', JSON.stringify(updatedUser));
      await updateUserAccountDisplayName(currentUser.id, cleanName);
    }
    setSettings((prev) => ({ ...prev, ownerName: cleanName }));
    const key = getScopedKey(currentUser?.id, 'settings');
    const updatedSettings = { ...settings, ownerName: cleanName };
    localStorage.setItem(key, JSON.stringify(updatedSettings));
    return true;
  };

  const setCurrentUser = (user: UserAccount | null, rememberPassword?: string | null) => {
    switchUserData(user);
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('campus_auth_session', JSON.stringify(user));
      if (rememberPassword !== undefined) {
        if (rememberPassword) {
          localStorage.setItem('campus_auth_cred', JSON.stringify({ u: user.username, p: rememberPassword }));
        } else {
          localStorage.removeItem('campus_auth_cred');
        }
      }
      setSettings((prev) => ({
        ...prev,
        shareCode: user.shareCode || prev.shareCode,
        ownerName: user.displayName || prev.ownerName,
        lineUserId: user.lineUserId || prev.lineUserId,
      }));
      syncWithSupabase(user);
    } else {
      localStorage.removeItem('campus_auth_session');
      localStorage.removeItem('campus_auth_cred');
      syncWithSupabase(null);
    }
  };

  const logoutUser = () => {
    const oldUid = activeUserIdRef.current;
    if (oldUid) {
      localStorage.setItem(getScopedKey(oldUid, 'courses'), JSON.stringify(courses));
      localStorage.setItem(getScopedKey(oldUid, 'todos'), JSON.stringify(todos));
      localStorage.setItem(getScopedKey(oldUid, 'transactions'), JSON.stringify(transactions));
      localStorage.setItem(getScopedKey(oldUid, 'calendar_events'), JSON.stringify(calendarEvents));
    }
    localStorage.removeItem('campus_auth_session');
    localStorage.removeItem('campus_auth_cred');
    activeUserIdRef.current = null;
    setCurrentUserState(null);
    setCourses([]);
    setTodos([]);
    setTransactions([]);
    setCalendarEvents([]);
  };

  // 1. 每打開 PWA (初次啟動 / Cold Start) 自動登入並同步上傳本機資料至雲端
  useEffect(() => {
    let isMounted = true;
    const attemptAutoLoginAndSync = async () => {
      try {
        const savedCred = localStorage.getItem('campus_auth_cred');
        if (savedCred && !currentUser) {
          const { u, p } = JSON.parse(savedCred);
          if (u && p) {
            const res = await loginUserAccount(u, p);
            if (res.ok && res.user && isMounted) {
              switchUserData(res.user);
              setCurrentUserState(res.user);
              localStorage.setItem('campus_auth_session', JSON.stringify(res.user));
              await syncWithSupabase(res.user);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Auto login startup exception:', err);
      }
      if (isMounted) {
        await syncWithSupabase();
      }
    };

    attemptAutoLoginAndSync();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. 每次打開 / 返回 PWA (從背景喚醒、iPhone/Android 切換回 APP、分頁可見) 自動上傳同步至雲端
  useEffect(() => {
    let lastResumeSyncTime = Date.now();

    const handleAppOpenOrResume = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const now = Date.now();
        // 節流保護：至少間隔 15 秒才重複觸發喚醒同步，避免頻繁切換分頁重複洗板
        if (now - lastResumeSyncTime > 15000) {
          lastResumeSyncTime = now;
          syncWithSupabaseRef.current();
        }
      }
    };

    document.addEventListener('visibilitychange', handleAppOpenOrResume);
    window.addEventListener('pageshow', handleAppOpenOrResume);
    window.addEventListener('focus', handleAppOpenOrResume);

    return () => {
      document.removeEventListener('visibilitychange', handleAppOpenOrResume);
      window.removeEventListener('pageshow', handleAppOpenOrResume);
      window.removeEventListener('focus', handleAppOpenOrResume);
    };
  }, []);

  // Budget calculation
  const budgetInfo: BudgetInfo = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 今日花費
    const todaySpent = transactions
      .filter((t) => t.type === 'expense' && t.date.slice(0, 10) === todayStr)
      .reduce((acc, cur) => acc + cur.amount, 0);

    // 本月總支出
    const totalMonthExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, cur) => acc + cur.amount, 0);

    // 計算重置日倒數
    const resetDay = settings.accountingResetDay || 1;
    let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);
    if (now.getDate() >= resetDay) {
      nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
    }
    const daysUntilReset = Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const effectiveLimit = settings.customDailyLimit || 300;
    const remaining = effectiveLimit - todaySpent;

    return {
      todaySpent,
      effectiveLimit,
      remaining,
      daysUntilReset,
      totalMonthExpense,
    };
  }, [transactions, settings]);

  // Custom Category Methods
  const addCustomCategory = (
    type: 'expense' | 'income' | 'todo',
    cat: { name: string; colorHex: string; icon?: string }
  ) => {
    const newCat: CustomCategory = {
      id: `cat_${Date.now()}`,
      name: cat.name.trim(),
      colorHex: cat.colorHex,
      icon: cat.icon || 'tag',
    };
    if (type === 'expense') {
      setCustomExpenseCategories((prev) =>
        prev.some((c) => c.name === newCat.name) ? prev : [...prev, newCat]
      );
    } else if (type === 'income') {
      setCustomIncomeCategories((prev) =>
        prev.some((c) => c.name === newCat.name) ? prev : [...prev, newCat]
      );
    } else {
      setCustomTodoCategories((prev) =>
        prev.some((c) => c.name === newCat.name) ? prev : [...prev, newCat]
      );
    }
  };

  const deleteCustomCategory = (
    type: 'expense' | 'income' | 'todo',
    idOrName: string
  ) => {
    if (type === 'expense') {
      setCustomExpenseCategories((prev) =>
        prev.filter((c) => c.id !== idOrName && c.name !== idOrName)
      );
    } else if (type === 'income') {
      setCustomIncomeCategories((prev) =>
        prev.filter((c) => c.id !== idOrName && c.name !== idOrName)
      );
    } else {
      setCustomTodoCategories((prev) =>
        prev.filter((c) => c.id !== idOrName && c.name !== idOrName)
      );
    }
  };

  const updateCustomCategory = (
    type: 'expense' | 'income' | 'todo',
    id: string,
    updates: { name?: string; colorHex?: string; icon?: string }
  ) => {
    const updater = (prev: CustomCategory[]) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
    if (type === 'expense') setCustomExpenseCategories(updater);
    else if (type === 'income') setCustomIncomeCategories(updater);
    else setCustomTodoCategories(updater);
  };

  const reorderCustomCategories = (
    type: 'expense' | 'income' | 'todo',
    reordered: CustomCategory[]
  ) => {
    if (type === 'expense') setCustomExpenseCategories(reordered);
    else if (type === 'income') setCustomIncomeCategories(reordered);
    else setCustomTodoCategories(reordered);
  };

  // Actions
  const addCourse = async (course: Course) => {
    const canonicalId = toUUID(course.id || `course_${Date.now()}_${Math.random()}`);
    const enriched: Course = { ...course, id: canonicalId, userId: currentUser?.id || course.userId };
    setCourses((prev) => {
      const next = deduplicateCourses([...prev, enriched]);
      coursesRef.current = next;
      syncScheduleToCloud(next, todosRef.current, transactionsRef.current, calendarEventsRef.current);
      return next;
    });
    await upsertCourseToSupabase(enriched, currentUser?.id);
    setCatMood('happy');
  };

  const updateCourse = async (course: Course) => {
    const canonicalId = toUUID(course.id);
    const enriched: Course = { ...course, id: canonicalId, userId: currentUser?.id || course.userId };
    setCourses((prev) => {
      const next = prev.map((c) => (toUUID(c.id) === canonicalId ? enriched : c));
      coursesRef.current = next;
      syncScheduleToCloud(next, todosRef.current, transactionsRef.current, calendarEventsRef.current);
      return next;
    });
    await upsertCourseToSupabase(enriched, currentUser?.id);
  };

  const deleteCourse = async (id: string) => {
    const canonicalId = toUUID(id);
    setCourses((prev) => {
      const next = prev.filter((c) => toUUID(c.id) !== canonicalId);
      coursesRef.current = next;
      syncScheduleToCloud(next, todosRef.current, transactionsRef.current, calendarEventsRef.current);
      return next;
    });
    await deleteCourseFromSupabase(id);
  };

  // Real-time synchronization helper to publish shared schedule
  const syncScheduleToCloud = (
    cList = coursesRef.current,
    tList = todosRef.current,
    txList = transactionsRef.current,
    evList = calendarEventsRef.current
  ) => {
    const sCode = currentUser?.shareCode || settingsRef.current.shareCode;
    if (!sCode) return;
    publishSharedSchedule({
      shareCode: sCode,
      ownerName: currentUser?.displayName || settingsRef.current.ownerName || '同學',
      isSharingEnabled: true,
      coursesData: cList,
      todosData: tList,
      accountingData: txList,
      calendarEventsData: evList,
      isExpenseSharingEnabled: true,
    }).catch(() => {});
  };

  const addTodo = async (todo: Todo) => {
    const canonicalId = toUUID(todo.id || `todo_${Date.now()}_${Math.random()}`);
    const enriched: Todo = { ...todo, id: canonicalId, userId: currentUser?.id || todo.userId };
    setTodos((prev) => {
      const next = deduplicateTodos([enriched, ...prev]);
      todosRef.current = next;
      syncScheduleToCloud(coursesRef.current, next, transactionsRef.current, calendarEventsRef.current);
      return next;
    });
    await upsertTodoToSupabase(enriched, currentUser?.id);
    setCatMood('thinking');
  };

  const updateTodo = async (todo: Todo) => {
    const canonicalId = toUUID(todo.id);
    const enriched: Todo = { ...todo, id: canonicalId, userId: currentUser?.id || todo.userId };
    setTodos((prev) => {
      const next = prev.map((t) => (toUUID(t.id) === canonicalId ? enriched : t));
      todosRef.current = next;
      syncScheduleToCloud(coursesRef.current, next, transactionsRef.current, calendarEventsRef.current);
      return next;
    });
    await upsertTodoToSupabase(enriched, currentUser?.id);
  };

  const toggleTodo = async (id: string) => {
    const canonicalId = toUUID(id);
    setTodos((prev) => {
      const next = prev.map((t) => {
        if (toUUID(t.id) === canonicalId) {
          const updated: Todo = { ...t, isCompleted: !t.isCompleted, userId: currentUser?.id || t.userId };
          upsertTodoToSupabase(updated, currentUser?.id);
          if (updated.isCompleted) setCatMood('proud');
          return updated;
        }
        return t;
      });
      todosRef.current = next;
      syncScheduleToCloud(coursesRef.current, next, transactionsRef.current, calendarEventsRef.current);
      return next;
    });
  };

  const deleteTodo = async (id: string) => {
    const canonicalId = toUUID(id);
    setTodos((prev) => {
      const next = prev.filter((t) => toUUID(t.id) !== canonicalId);
      todosRef.current = next;
      syncScheduleToCloud(coursesRef.current, next, transactionsRef.current, calendarEventsRef.current);
      return next;
    });
    await deleteTodoFromSupabase(id);
  };

  const addTransaction = async (t: Transaction) => {
    const canonicalId = toUUID(t.id || `tx_${Date.now()}_${Math.random()}`);
    const enriched: Transaction = { ...t, id: canonicalId, userId: currentUser?.id || t.userId };
    setTransactions((prev) => {
      const next = deduplicateTransactions([enriched, ...prev]);
      transactionsRef.current = next;
      // Real-time publish to shared_schedules for friends
      syncScheduleToCloud(coursesRef.current, todosRef.current, next, calendarEventsRef.current);
      return next;
    });
    await upsertTransactionToSupabase(enriched, currentUser?.id);
    setCatMood('happy');
  };

  const deleteTransaction = async (id: string) => {
    const canonicalId = toUUID(id);
    setTransactions((prev) => {
      const next = prev.filter((t) => toUUID(t.id) !== canonicalId);
      transactionsRef.current = next;
      syncScheduleToCloud(coursesRef.current, todosRef.current, next, calendarEventsRef.current);
      return next;
    });
    await deleteTransactionFromSupabase(id);
  };

  const rateFriendAccounting = async (
    friendShareCode: string,
    transactionId: string,
    rating: number,
    feedback: string
  ): Promise<boolean> => {
    const raterName = currentUser?.displayName || settings.ownerName || '好友';
    const ok = await rateFriendTransaction(friendShareCode, transactionId, rating, feedback, raterName);
    if (ok) {
      // Update local cached friend record immediately
      setSavedFriends((prev) =>
        prev.map((f) => {
          if (f.shareCode.toUpperCase() === friendShareCode.toUpperCase() && f.cachedSchedule) {
            const currentList = Array.isArray(f.cachedSchedule.accountingData)
              ? f.cachedSchedule.accountingData
              : [];
            const targetUuid = toUUID(transactionId);
            const updatedTxList = currentList.map((tx) => {
              if (tx.id === transactionId || toUUID(tx.id) === targetUuid) {
                return {
                  ...tx,
                  peerRating: rating,
                  peerFeedback: feedback,
                  peerRaterName: raterName,
                  ratedAt: new Date().toISOString(),
                };
              }
              return tx;
            });
            return {
              ...f,
              cachedSchedule: {
                ...f.cachedSchedule,
                accountingData: updatedTxList,
              },
            };
          }
          return f;
        })
      );
    }
    return ok;
  };

  const addCalendarEvent = async (e: CalendarEvent) => {
    const canonicalId = toUUID(e.id || `event_${Date.now()}_${Math.random()}`);
    const enriched: CalendarEvent = { ...e, id: canonicalId, userId: currentUser?.id || e.userId };
    setCalendarEvents((prev) => {
      const next = deduplicateCalendarEvents([...prev, enriched]);
      calendarEventsRef.current = next;
      syncScheduleToCloud(coursesRef.current, todosRef.current, transactionsRef.current, next);
      return next;
    });
    await upsertCalendarEventToSupabase(enriched, currentUser?.id);
    setCatMood('happy');
  };

  const updateCalendarEvent = async (e: CalendarEvent) => {
    const canonicalId = toUUID(e.id);
    const enriched: CalendarEvent = { ...e, id: canonicalId, userId: currentUser?.id || e.userId };
    setCalendarEvents((prev) => {
      const next = prev.map((item) => (toUUID(item.id) === canonicalId ? enriched : item));
      calendarEventsRef.current = next;
      syncScheduleToCloud(coursesRef.current, todosRef.current, transactionsRef.current, next);
      return next;
    });
    await upsertCalendarEventToSupabase(enriched, currentUser?.id);
  };

  const deleteCalendarEvent = async (id: string) => {
    const canonicalId = toUUID(id);
    setCalendarEvents((prev) => {
      const next = prev.filter((item) => toUUID(item.id) !== canonicalId);
      calendarEventsRef.current = next;
      syncScheduleToCloud(coursesRef.current, todosRef.current, transactionsRef.current, next);
      return next;
    });
    await deleteCalendarEventFromSupabase(id);
  };

  // --------------------------------------------------------------------------
  // 🤝 往來債務 (Debts, Loans & Installments)
  // --------------------------------------------------------------------------
  const addDebt = (debt: DebtRecord) => {
    const canonicalId = toUUID(debt.id || `debt_${Date.now()}_${Math.random()}`);
    const newDebt: DebtRecord = {
      ...debt,
      id: canonicalId,
      userId: currentUser?.id || debt.userId,
      remainingAmount: debt.remainingAmount !== undefined ? debt.remainingAmount : debt.totalAmount,
      isSettled: (debt.remainingAmount !== undefined ? debt.remainingAmount : debt.totalAmount) <= 0,
      repayments: debt.repayments || [],
      createdAt: debt.createdAt || new Date().toISOString(),
    };
    setDebts((prev) => [newDebt, ...prev]);
    setCatMood('happy');
  };

  const updateDebt = (debt: DebtRecord) => {
    setDebts((prev) => prev.map((d) => (d.id === debt.id ? debt : d)));
  };

  const deleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const repayDebt = (debtId: string, amount: number, note?: string, date?: string) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtId) return d;
        const repayAmount = Math.max(0, Number(amount));
        const newRemaining = Math.max(0, d.remainingAmount - repayAmount);
        const repayment: DebtRepayment = {
          id: `repay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          date: date || new Date().toISOString(),
          amount: repayAmount,
          remainingAfter: newRemaining,
          notes: note || '',
        };
        const nextPaidPeriods = (d.paidPeriods || 0) + 1;
        return {
          ...d,
          remainingAmount: newRemaining,
          paidPeriods: nextPaidPeriods,
          isSettled: newRemaining === 0,
          repayments: [repayment, ...(d.repayments || [])],
        };
      })
    );
    setCatMood('proud');
  };

  // --------------------------------------------------------------------------
  // 👥 多人分帳與代墊款 (Split Bills)
  // --------------------------------------------------------------------------
  const addSplitBill = (bill: SplitBill) => {
    const canonicalId = toUUID(bill.id || `split_${Date.now()}_${Math.random()}`);
    const newBill: SplitBill = {
      ...bill,
      id: canonicalId,
      userId: currentUser?.id || bill.userId,
      createdAt: bill.createdAt || new Date().toISOString(),
    };
    setSplitBills((prev) => [newBill, ...prev]);
    setCatMood('happy');
  };

  const updateSplitBill = (bill: SplitBill) => {
    setSplitBills((prev) => prev.map((b) => (b.id === bill.id ? bill : b)));
  };

  const deleteSplitBill = (id: string) => {
    setSplitBills((prev) => prev.filter((b) => b.id !== id));
  };

  const settleSplitParticipant = (billId: string, participantOrIndex: string | number) => {
    setSplitBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        let updatedParticipants = [...(b.participants || [])];
        let updatedSettlements = [...(b.settlements || [])];

        if (typeof participantOrIndex === 'number') {
          if (updatedSettlements[participantOrIndex]) {
            const nextStatus = !updatedSettlements[participantOrIndex].isSettled;
            updatedSettlements[participantOrIndex] = {
              ...updatedSettlements[participantOrIndex],
              isSettled: nextStatus,
            };
          }
        } else {
          updatedParticipants = updatedParticipants.map((p) =>
            p.name === participantOrIndex ? { ...p, isSettled: !p.isSettled } : p
          );
        }

        const allSettlementsSettled = updatedSettlements.length > 0 && updatedSettlements.every((s) => s.isSettled);
        const allParticipantsSettled = updatedParticipants.length > 0 && updatedParticipants.every((p) => p.isSettled);
        const isSettled = allSettlementsSettled || allParticipantsSettled;

        return {
          ...b,
          participants: updatedParticipants,
          settlements: updatedSettlements,
          isSettled,
        };
      })
    );
    setCatMood('proud');
  };

  const settleEntireSplitBill = (billId: string) => {
    setSplitBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        const nextSettled = !b.isSettled;
        return {
          ...b,
          isSettled: nextSettled,
          participants: (b.participants || []).map((p) => ({ ...p, isSettled: nextSettled })),
          settlements: (b.settlements || []).map((s) => ({ ...s, isSettled: nextSettled })),
        };
      })
    );
    setCatMood('proud');
  };

  const saveFriendRecord = (record: SavedFriendRecord) => {
    // 檢查是否有共享行事曆異動 (新增或刪除行程/待辦)
    const existing = savedFriendsRef.current.find(
      (f) => f.shareCode.toUpperCase() === record.shareCode.toUpperCase()
    );

    if (
      existing &&
      existing.cachedSchedule &&
      record.cachedSchedule &&
      settingsRef.current.pwaSharedCalendarNotifyEnabled !== false
    ) {
      const friendName = record.nickname || record.ownerName || '好友';
      const oldEvents = existing.cachedSchedule.calendarEventsData || [];
      const newEvents = record.cachedSchedule.calendarEventsData || [];

      // 檢查新增行程
      const addedEvent = newEvents.find((ne) => !oldEvents.some((oe) => oe.id === ne.id));
      if (addedEvent) {
        notifySharedCalendarChange('added', '行程', addedEvent.title, friendName);
      }
      // 檢查刪除行程
      const deletedEvent = oldEvents.find((oe) => !newEvents.some((ne) => ne.id === oe.id));
      if (deletedEvent) {
        notifySharedCalendarChange('deleted', '行程', deletedEvent.title, friendName);
      }

      // 檢查新增/刪除共享待辦
      const oldSharedTodos = (existing.cachedSchedule.todosData || []).filter((t) => t.isSharedToCalendar);
      const newSharedTodos = (record.cachedSchedule.todosData || []).filter((t) => t.isSharedToCalendar);

      const addedTodo = newSharedTodos.find((nt) => !oldSharedTodos.some((ot) => ot.id === nt.id));
      if (addedTodo) {
        notifySharedCalendarChange('added', '待辦', addedTodo.title, friendName);
      }
      const deletedTodo = oldSharedTodos.find((ot) => !newSharedTodos.some((nt) => nt.id === ot.id));
      if (deletedTodo) {
        notifySharedCalendarChange('deleted', '待辦', deletedTodo.title, friendName);
      }
    }

    setSavedFriends((prev) => {
      const filtered = prev.filter((f) => f.shareCode !== record.shareCode);
      const updated = [record, ...filtered];
      savedFriendsRef.current = updated;
      return updated;
    });
  };

  const removeFriendRecord = (shareCode: string) => {
    setSavedFriends((prev) => prev.filter((f) => f.shareCode !== shareCode));
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const restoreBackupData = (imported: any): boolean => {
    try {
      if (!imported || typeof imported !== 'object') return false;
      const uid = activeUserIdRef.current;

      if (Array.isArray(imported.courses)) {
        setCourses(imported.courses);
        localStorage.setItem(getScopedKey(uid, 'courses'), JSON.stringify(imported.courses));
      }
      if (Array.isArray(imported.todos)) {
        setTodos(imported.todos);
        localStorage.setItem(getScopedKey(uid, 'todos'), JSON.stringify(imported.todos));
      }
      if (Array.isArray(imported.transactions)) {
        setTransactions(imported.transactions);
        localStorage.setItem(getScopedKey(uid, 'transactions'), JSON.stringify(imported.transactions));
      }
      if (Array.isArray(imported.calendarEvents)) {
        setCalendarEvents(imported.calendarEvents);
        localStorage.setItem(getScopedKey(uid, 'calendar_events'), JSON.stringify(imported.calendarEvents));
      }
      if (Array.isArray(imported.classPeriods)) {
        setClassPeriods(imported.classPeriods);
        localStorage.setItem(getScopedKey(uid, 'class_periods'), JSON.stringify(imported.classPeriods));
      }
      if (Array.isArray(imported.customExpenseCategories)) {
        setCustomExpenseCategories(imported.customExpenseCategories);
        localStorage.setItem(getScopedKey(uid, 'custom_expense_cats'), JSON.stringify(imported.customExpenseCategories));
      }
      if (Array.isArray(imported.customIncomeCategories)) {
        setCustomIncomeCategories(imported.customIncomeCategories);
        localStorage.setItem(getScopedKey(uid, 'custom_income_cats'), JSON.stringify(imported.customIncomeCategories));
      }
      if (Array.isArray(imported.customTodoCategories)) {
        setCustomTodoCategories(imported.customTodoCategories);
        localStorage.setItem(getScopedKey(uid, 'custom_todo_cats'), JSON.stringify(imported.customTodoCategories));
      }
      if (imported.settings && typeof imported.settings === 'object') {
        const nextSettings = { ...DEFAULT_SETTINGS, ...imported.settings };
        setSettings(nextSettings);
        localStorage.setItem(getScopedKey(uid, 'settings'), JSON.stringify(nextSettings));
      }
      return true;
    } catch (e) {
      console.error('Failed to restore backup data:', e);
      return false;
    }
  };

  const resetAllData = () => {
    const uid = activeUserIdRef.current;
    setCourses(INITIAL_COURSES);
    setTodos(INITIAL_TODOS);
    setTransactions(INITIAL_TRANSACTIONS);
    setCalendarEvents(INITIAL_CALENDAR_EVENTS);
    setClassPeriods(DEFAULT_CLASS_PERIODS);
    setCustomExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    setCustomIncomeCategories(DEFAULT_INCOME_CATEGORIES);
    setCustomTodoCategories(DEFAULT_TODO_CATEGORIES);
    setSettings(DEFAULT_SETTINGS);
    setSavedFriends([]);

    localStorage.removeItem(getScopedKey(uid, 'courses'));
    localStorage.removeItem(getScopedKey(uid, 'todos'));
    localStorage.removeItem(getScopedKey(uid, 'transactions'));
    localStorage.removeItem(getScopedKey(uid, 'calendar_events'));
    localStorage.removeItem(getScopedKey(uid, 'class_periods'));
    localStorage.removeItem(getScopedKey(uid, 'saved_friends'));
    localStorage.removeItem(getScopedKey(uid, 'settings'));
    localStorage.removeItem(getScopedKey(uid, 'custom_expense_cats'));
    localStorage.removeItem(getScopedKey(uid, 'custom_income_cats'));
    localStorage.removeItem(getScopedKey(uid, 'custom_todo_cats'));
    localStorage.removeItem(getScopedKey(uid, 'debts'));
    localStorage.removeItem(getScopedKey(uid, 'split_bills'));
    setDebts([]);
    setSplitBills([]);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        updateCurrentUserDisplayName,
        logoutUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isLineBotModalOpen,
        setIsLineBotModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        isEventModalOpen,
        setIsEventModalOpen,
        isPeriodModalOpen,
        setIsPeriodModalOpen,
        isFortuneModalOpen,
        setIsFortuneModalOpen,
        isFoodRouletteOpen,
        setIsFoodRouletteOpen,
        isPomodoroOpen,
        setIsPomodoroOpen,
        restoreBackupData,
        resetAllData,
        eventToEdit,
        setEventToEdit,
        courses,
        todos,
        transactions,
        calendarEvents,
        classPeriods,
        updateClassPeriods,
        installments,
        splitBills,
        debts,
        addDebt,
        updateDebt,
        deleteDebt,
        repayDebt,
        addSplitBill,
        updateSplitBill,
        deleteSplitBill,
        settleSplitParticipant,
        settleEntireSplitBill,
        savedFriends,
        settings,
        isSyncing,
        isOnline,
        budgetInfo,
        catMood,
        setCatMood,
        customExpenseCategories,
        customIncomeCategories,
        customTodoCategories,
        addCustomCategory,
        updateCustomCategory,
        reorderCustomCategories,
        deleteCustomCategory,
        lastSyncedAt,
        nextSyncDisplay,
        triggerManualUpload,
        addCourse,
        updateCourse,
        deleteCourse,
        addTodo,
        updateTodo,
        toggleTodo,
        deleteTodo,
        addTransaction,
        deleteTransaction,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        saveFriendRecord,
        removeFriendRecord,
        updateSettings,
        rateFriendAccounting,
        syncWithSupabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
