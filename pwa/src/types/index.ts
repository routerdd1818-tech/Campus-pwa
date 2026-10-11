export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ClassPeriod {
  id: number;
  name: string;
  displayCode: string;
  startTime: string;
  endTime: string;
  isNoon?: boolean;
}

export interface Course {
  id: string;
  userId?: string;
  name: string;
  code?: string;
  classroom?: string;
  instructor?: string;
  dayOfWeek: DayOfWeek; // 1 = Mon, 7 = Sun
  startTime: string;    // HH:mm (e.g. "09:00")
  endTime: string;      // HH:mm (e.g. "12:00")
  colorHex: string;
  periodId?: number;
  isSharedWithFriends?: boolean;
}

export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoCategory = '作業' | '考試' | '報告' | '生活' | '個人' | '論文閱讀';

export interface Todo {
  id: string;
  userId?: string;
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
  userId?: string;
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
  userId?: string;
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
  userId?: string;
  title: string;
  totalAmount: number;
  myAmount: number;
  members: string[];
  date: string;
  notes?: string;
  isSettled: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  shareCode: string;
  lineUserId?: string;
  linePushHour?: number;
  linePushMinute?: number;
  isLinePushEnabled?: boolean;
  createdAt?: string;
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

export interface CalendarEvent {
  id: string;
  userId?: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  colorHex: string;
  category: string;
  notes?: string;
  isSharedWithFriends?: boolean;
}

export interface SharedScheduleData {
  shareCode: string;
  ownerName: string;
  isSharingEnabled: boolean;
  coursesData: Course[];
  todosData: Todo[];
  accountingData: Transaction[];
  calendarEventsData: CalendarEvent[];
  isExpenseSharingEnabled: boolean;
  updatedAt?: string;
}

export interface SavedFriendRecord {
  shareCode: string;
  ownerName: string;
  nickname: string;
  lastViewedAt: string;
  cachedSchedule?: SharedScheduleData;
}
