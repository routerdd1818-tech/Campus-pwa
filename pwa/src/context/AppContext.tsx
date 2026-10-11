import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Course,
  Todo,
  Transaction,
  Installment,
  SplitBill,
  UserSettings,
  UserAccount,
  CalendarEvent,
  SavedFriendRecord,
  SharedScheduleData,
  CustomCategory,
} from '../types';
import {
  fetchCoursesFromSupabase,
  upsertCourseToSupabase,
  deleteCourseFromSupabase,
  fetchTodosFromSupabase,
  upsertTodoToSupabase,
  deleteTodoFromSupabase,
  fetchTransactionsFromSupabase,
  upsertTransactionToSupabase,
  deleteTransactionFromSupabase,
  fetchCalendarEventsFromSupabase,
  upsertCalendarEventToSupabase,
  deleteCalendarEventFromSupabase,
  publishSharedSchedule,
  fetchSharedScheduleByCode,
  loginUserAccount,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '../services/supabase';

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
    title: '✈️ 12/7~12/14 日本東京自由行 (出國度假)',
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
  theme: 'light',
  autoSyncEnabled: true,
  autoSyncTime: '23:00',
  autoSyncIntervalMinutes: 30,
};

interface BudgetInfo {
  todaySpent: number;
  effectiveLimit: number;
  remaining: number;
  daysUntilReset: number;
  totalMonthExpense: number;
}

interface AppContextType {
  activeTab: 'schedule' | 'calendar' | 'todos' | 'accounting' | 'settings';
  setActiveTab: (tab: 'schedule' | 'calendar' | 'todos' | 'accounting' | 'settings') => void;
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null, rememberPassword?: string | null) => void;
  logoutUser: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isLineBotModalOpen: boolean;
  setIsLineBotModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  isEventModalOpen: boolean;
  setIsEventModalOpen: (open: boolean) => void;
  eventToEdit: CalendarEvent | null;
  setEventToEdit: (e: CalendarEvent | null) => void;
  courses: Course[];
  todos: Todo[];
  transactions: Transaction[];
  calendarEvents: CalendarEvent[];
  installments: Installment[];
  splitBills: SplitBill[];
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
  syncWithSupabase: (targetUser?: UserAccount | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar' | 'todos' | 'accounting' | 'settings'>('schedule');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [catMood, setCatMood] = useState<'happy' | 'sleeping' | 'thinking' | 'proud'>('happy');

  // 👤 User Account & Modal State
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('campus_auth_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLineBotModalOpen, setIsLineBotModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  // Load from LocalStorage
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('campus_courses');
    return saved ? JSON.parse(saved) : INITIAL_COURSES;
  });

  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('campus_todos');
    return saved ? JSON.parse(saved) : INITIAL_TODOS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('campus_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('campus_calendar_events');
    return saved ? JSON.parse(saved) : INITIAL_CALENDAR_EVENTS;
  });

  const [savedFriends, setSavedFriends] = useState<SavedFriendRecord[]>(() => {
    const saved = localStorage.getItem('campus_saved_friends');
    return saved ? JSON.parse(saved) : [];
  });

  const [installments, setInstallments] = useState<Installment[]>(() => {
    const saved = localStorage.getItem('campus_installments');
    return saved ? JSON.parse(saved) : [];
  });

  const [splitBills, setSplitBills] = useState<SplitBill[]>(() => {
    const saved = localStorage.getItem('campus_split_bills');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('campus_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Custom categories state
  const [customExpenseCategories, setCustomExpenseCategories] = useState<CustomCategory[]>(() => {
    try {
      const saved = localStorage.getItem('campus_custom_expense_cats');
      return saved ? JSON.parse(saved) : DEFAULT_EXPENSE_CATEGORIES;
    } catch {
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  });

  const [customIncomeCategories, setCustomIncomeCategories] = useState<CustomCategory[]>(() => {
    try {
      const saved = localStorage.getItem('campus_custom_income_cats');
      return saved ? JSON.parse(saved) : DEFAULT_INCOME_CATEGORIES;
    } catch {
      return DEFAULT_INCOME_CATEGORIES;
    }
  });

  const [customTodoCategories, setCustomTodoCategories] = useState<CustomCategory[]>(() => {
    try {
      const saved = localStorage.getItem('campus_custom_todo_cats');
      return saved ? JSON.parse(saved) : DEFAULT_TODO_CATEGORIES;
    } catch {
      return DEFAULT_TODO_CATEGORIES;
    }
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('campus_last_synced_at') || null;
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

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('campus_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('campus_todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('campus_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('campus_calendar_events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem('campus_saved_friends', JSON.stringify(savedFriends));
  }, [savedFriends]);

  useEffect(() => {
    localStorage.setItem('campus_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('campus_custom_expense_cats', JSON.stringify(customExpenseCategories));
  }, [customExpenseCategories]);

  useEffect(() => {
    localStorage.setItem('campus_custom_income_cats', JSON.stringify(customIncomeCategories));
  }, [customIncomeCategories]);

  useEffect(() => {
    localStorage.setItem('campus_custom_todo_cats', JSON.stringify(customTodoCategories));
  }, [customTodoCategories]);

  // Initial and on-demand cloud sync
  const syncWithSupabase = async (targetUser?: UserAccount | null) => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    const activeUser = targetUser !== undefined ? targetUser : currentUser;
    const userKey = activeUser ? activeUser.id : undefined;

    try {
      const [cloudCourses, cloudTodos, cloudTx, cloudEvents] = await Promise.all([
        fetchCoursesFromSupabase(userKey),
        fetchTodosFromSupabase(userKey),
        fetchTransactionsFromSupabase(),
        fetchCalendarEventsFromSupabase(userKey),
      ]);

      if (cloudCourses.length > 0) setCourses(cloudCourses);
      if (cloudTodos.length > 0) setTodos(cloudTodos);
      if (cloudTx.length > 0) setTransactions(cloudTx);
      if (cloudEvents.length > 0) setCalendarEvents(cloudEvents);

      const nowIso = new Date().toISOString();
      setLastSyncedAt(nowIso);
      localStorage.setItem('campus_last_synced_at', nowIso);
    } catch (e) {
      console.warn('Cloud sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerManualUpload = async () => {
    await syncWithSupabase();
  };

  // Scheduled cloud upload & auto-sync timer
  const nextSyncDisplay = useMemo(() => {
    if (!settings.autoSyncEnabled) return '已停用定時上傳';
    if (settings.autoSyncTime) {
      return `每日 ${settings.autoSyncTime} 上傳`;
    }
    return `每 ${settings.autoSyncIntervalMinutes || 30} 分鐘自動同步`;
  }, [settings.autoSyncEnabled, settings.autoSyncTime, settings.autoSyncIntervalMinutes]);

  useEffect(() => {
    if (!settings.autoSyncEnabled) return;

    let lastTriggeredMinute = '';

    const intervalTimer = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Check fixed upload time (e.g., 23:00)
      if (settings.autoSyncTime && currentHHMM === settings.autoSyncTime && lastTriggeredMinute !== currentHHMM) {
        lastTriggeredMinute = currentHHMM;
        syncWithSupabase();
        return;
      }

      // Check periodic interval (e.g., every 30 mins)
      if (settings.autoSyncIntervalMinutes && settings.autoSyncIntervalMinutes > 0 && lastSyncedAt) {
        const lastTime = new Date(lastSyncedAt).getTime();
        const diffMins = (now.getTime() - lastTime) / (1000 * 60);
        if (diffMins >= settings.autoSyncIntervalMinutes) {
          syncWithSupabase();
        }
      }
    }, 25000);

    return () => clearInterval(intervalTimer);
  }, [settings.autoSyncEnabled, settings.autoSyncTime, settings.autoSyncIntervalMinutes, lastSyncedAt]);

  const setCurrentUser = (user: UserAccount | null, rememberPassword?: string | null) => {
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
    }
  };

  const logoutUser = () => {
    setCurrentUserState(null);
    localStorage.removeItem('campus_auth_session');
    localStorage.removeItem('campus_auth_cred');
    syncWithSupabase(null);
  };

  // Auto-login on startup
  useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        const savedCred = localStorage.getItem('campus_auth_cred');
        if (savedCred && !currentUser) {
          const { u, p } = JSON.parse(savedCred);
          if (u && p) {
            const res = await loginUserAccount(u, p);
            if (res.ok && res.user) {
              setCurrentUserState(res.user);
              localStorage.setItem('campus_auth_session', JSON.stringify(res.user));
              syncWithSupabase(res.user);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Auto login exception:', err);
      }
      syncWithSupabase();
    };

    attemptAutoLogin();
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

  // Actions
  const addCourse = async (course: Course) => {
    const enriched = { ...course, userId: currentUser?.id || course.userId };
    setCourses((prev) => [...prev, enriched]);
    await upsertCourseToSupabase(enriched, currentUser?.id);
    setCatMood('happy');
  };

  const updateCourse = async (course: Course) => {
    const enriched = { ...course, userId: currentUser?.id || course.userId };
    setCourses((prev) => prev.map((c) => (c.id === enriched.id ? enriched : c)));
    await upsertCourseToSupabase(enriched, currentUser?.id);
  };

  const deleteCourse = async (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    await deleteCourseFromSupabase(id);
  };

  const addTodo = async (todo: Todo) => {
    const enriched = { ...todo, userId: currentUser?.id || todo.userId };
    setTodos((prev) => [enriched, ...prev]);
    await upsertTodoToSupabase(enriched, currentUser?.id);
    setCatMood('thinking');
  };

  const updateTodo = async (todo: Todo) => {
    const enriched = { ...todo, userId: currentUser?.id || todo.userId };
    setTodos((prev) => prev.map((t) => (t.id === enriched.id ? enriched : t)));
    await upsertTodoToSupabase(enriched, currentUser?.id);
  };

  const toggleTodo = async (id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = { ...t, isCompleted: !t.isCompleted, userId: currentUser?.id || t.userId };
          upsertTodoToSupabase(next, currentUser?.id);
          if (next.isCompleted) setCatMood('proud');
          return next;
        }
        return t;
      })
    );
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await deleteTodoFromSupabase(id);
  };

  const addTransaction = async (t: Transaction) => {
    const enriched = { ...t, userId: currentUser?.id || t.userId };
    setTransactions((prev) => [enriched, ...prev]);
    await upsertTransactionToSupabase(enriched);
    setCatMood('happy');
  };

  const deleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await deleteTransactionFromSupabase(id);
  };

  const addCalendarEvent = async (e: CalendarEvent) => {
    const enriched = { ...e, userId: currentUser?.id || e.userId };
    setCalendarEvents((prev) => [...prev, enriched]);
    await upsertCalendarEventToSupabase(enriched, currentUser?.id);
    setCatMood('happy');
  };

  const updateCalendarEvent = async (e: CalendarEvent) => {
    const enriched = { ...e, userId: currentUser?.id || e.userId };
    setCalendarEvents((prev) => prev.map((item) => (item.id === enriched.id ? enriched : item)));
    await upsertCalendarEventToSupabase(enriched, currentUser?.id);
  };

  const deleteCalendarEvent = async (id: string) => {
    setCalendarEvents((prev) => prev.filter((item) => item.id !== id));
    await deleteCalendarEventFromSupabase(id);
  };

  const saveFriendRecord = (record: SavedFriendRecord) => {
    setSavedFriends((prev) => {
      const filtered = prev.filter((f) => f.shareCode !== record.shareCode);
      return [record, ...filtered];
    });
  };

  const removeFriendRecord = (shareCode: string) => {
    setSavedFriends((prev) => prev.filter((f) => f.shareCode !== shareCode));
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        logoutUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isLineBotModalOpen,
        setIsLineBotModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        isEventModalOpen,
        setIsEventModalOpen,
        eventToEdit,
        setEventToEdit,
        courses,
        todos,
        transactions,
        calendarEvents,
        installments,
        splitBills,
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
