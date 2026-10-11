export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Course {
  id: string;
  name: string;
  code?: string;
  classroom?: string;
  instructor?: string;
  dayOfWeek: DayOfWeek; // 1 = Mon, 7 = Sun
  startTime: string;    // HH:mm (e.g. "09:00")
  endTime: string;      // HH:mm (e.g. "12:00")
  colorHex: string;
  isSharedWithFriends?: boolean;
}

export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoCategory = '作業' | '考試' | '報告' | '生活' | '個人' | '論文閱讀';

export interface Todo {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string; // ISO string
  isCompleted: boolean;
  priority: TodoPriority;
  category: TodoCategory;
  courseId?: string;
  paperUrl?: string;
  readingStatus?: '未讀' | '閱讀中' | '已讀畢';
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  categoryName: string;
  categoryIcon: string;
  categoryColorHex: string;
  paymentMethodName: string;
  date: string; // ISO string
  notes?: string;
  valueScore?: number; // 1-10
  isSharedWithFriends?: boolean;
}

export interface Installment {
  id: string;
  title: string;
  totalAmount: number;
  totalPeriods: number;
  paidPeriods: number;
  periodAmount: number;
  startDate: string;
  billingDay: number;
  paymentMethodName: string;
  notes?: string;
  isCompleted: boolean;
}

export interface SplitBill {
  id: string;
  title: string;
  totalAmount: number;
  myAmount: number;
  members: string[];
  date: string;
  notes?: string;
  isSettled: boolean;
}

export interface UserSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  shareCode: string;
  ownerName: string;
  accountingResetDay: number;
  isIncomeBasedDailyLimit: boolean;
  customDailyLimit: number;
  lineUserId: string;
  linePushHour: number;
  linePushMinute: number;
  isLinePushEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}
