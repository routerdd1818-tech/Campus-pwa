import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Course, Todo, Transaction, Installment, SplitBill, UserSettings } from '../types';
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
};

interface BudgetInfo {
  todaySpent: number;
  effectiveLimit: number;
  remaining: number;
  daysUntilReset: number;
  totalMonthExpense: number;
}

interface AppContextType {
  activeTab: 'schedule' | 'todos' | 'accounting' | 'settings';
  setActiveTab: (tab: 'schedule' | 'todos' | 'accounting' | 'settings') => void;
  courses: Course[];
  todos: Todo[];
  transactions: Transaction[];
  installments: Installment[];
  splitBills: SplitBill[];
  settings: UserSettings;
  isSyncing: boolean;
  isOnline: boolean;
  budgetInfo: BudgetInfo;
  catMood: 'happy' | 'sleeping' | 'thinking' | 'proud';
  setCatMood: (mood: 'happy' | 'sleeping' | 'thinking' | 'proud') => void;
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addTodo: (todo: Todo) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateSettings: (s: Partial<UserSettings>) => void;
  syncWithSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'todos' | 'accounting' | 'settings'>('schedule');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [catMood, setCatMood] = useState<'happy' | 'sleeping' | 'thinking' | 'proud'>('happy');

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
    localStorage.setItem('campus_settings', JSON.stringify(settings));
  }, [settings]);

  // Initial cloud sync
  const syncWithSupabase = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      const [cloudCourses, cloudTodos, cloudTx] = await Promise.all([
        fetchCoursesFromSupabase(),
        fetchTodosFromSupabase(),
        fetchTransactionsFromSupabase(),
      ]);

      if (cloudCourses.length > 0) setCourses(cloudCourses);
      if (cloudTodos.length > 0) setTodos(cloudTodos);
      if (cloudTx.length > 0) setTransactions(cloudTx);
    } catch (e) {
      console.warn('Initial cloud sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncWithSupabase();
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

  // Actions
  const addCourse = async (course: Course) => {
    setCourses((prev) => [...prev, course]);
    await upsertCourseToSupabase(course);
    setCatMood('happy');
  };

  const updateCourse = async (course: Course) => {
    setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)));
    await upsertCourseToSupabase(course);
  };

  const deleteCourse = async (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    await deleteCourseFromSupabase(id);
  };

  const addTodo = async (todo: Todo) => {
    setTodos((prev) => [todo, ...prev]);
    await upsertTodoToSupabase(todo);
    setCatMood('thinking');
  };

  const toggleTodo = async (id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = { ...t, isCompleted: !t.isCompleted };
          upsertTodoToSupabase(next);
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
    setTransactions((prev) => [t, ...prev]);
    await upsertTransactionToSupabase(t);
    setCatMood('happy');
  };

  const deleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await deleteTransactionFromSupabase(id);
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        courses,
        todos,
        transactions,
        installments,
        splitBills,
        settings,
        isSyncing,
        isOnline,
        budgetInfo,
        catMood,
        setCatMood,
        addCourse,
        updateCourse,
        deleteCourse,
        addTodo,
        toggleTodo,
        deleteTodo,
        addTransaction,
        deleteTransaction,
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
