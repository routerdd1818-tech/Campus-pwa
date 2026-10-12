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
export type TodoRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom_period';
export type TodoCategory = string;

export interface CustomCategory {
  id: string;
  name: string;
  colorHex: string;
  icon?: string;
}

export interface Todo {
  id: string;
  userId?: string;
  title: string;
  notes?: string;
  dueDate?: string;     // ISO string (deadline)
  startDate?: string;   // YYYY-MM-DD (for period tasks like 12/7~12/14)
  endDate?: string;     // YYYY-MM-DD
  recurrence?: TodoRecurrence;
  isCompleted: boolean;
  priority: TodoPriority;
  category: string;     // supports custom category
  colorHex?: string;
  courseId?: string;
  paperUrl?: string;
  readingStatus?: '未讀' | '閱讀中' | '已讀畢';
  reminderAdvance?: 'none' | 'due' | '1h' | '3h' | '1d' | '2d' | '3d';
  reminderCustomDays?: number;
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
  peerRating?: number; // 1-5 顆星 (或 1-10 分) 好友評分
  peerFeedback?: string; // 好友評語留言
  peerRaterName?: string; // 評分好友名稱
  ratedAt?: string; // 評分時間 ISO
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
  lineEveningPushEnabled?: boolean;
  lineEveningPushHour?: number;
  lineEveningPushMinute?: number;
  lineTodoReminderEnabled?: boolean;
  theme: 'light' | 'dark' | 'system';
  // Scheduled cloud upload & auto-sync
  autoSyncEnabled: boolean;
  autoSyncTime: string; // e.g. "23:00"
  autoSyncIntervalMinutes: number; // 0 = only at fixed time, 15, 30, 60
  lastSyncedAt?: string;
  // Custom categories
  customExpenseCategories?: CustomCategory[];
  customIncomeCategories?: CustomCategory[];
  customTodoCategories?: CustomCategory[];
  // Customizable class period times
  classPeriods?: ClassPeriod[];
  // Friend sharing permissions
  isShareCourses?: boolean;
  isShareAccounting?: boolean;
  isShareCalendar?: boolean;
  // Campus fun features
  foodRouletteList?: string[];
  enableFortuneWidget?: boolean;
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
  courses?: Course[];
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

