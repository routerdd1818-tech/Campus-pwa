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
  isSharedToCalendar?: boolean; // 同步分享至共同行事曆 (預設 false)
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

export type DebtType = 'i_owe' | 'they_owe';

export interface DebtRepayment {
  id: string;
  date: string;
  amount: number;
  remainingAfter: number;
  notes?: string;
}

export interface DebtRecord {
  id: string;
  userId?: string;
  type: DebtType; // 'i_owe' (我欠別人 / 分期 / 借入) | 'they_owe' (別人欠我 / 借出)
  title: string;
  counterparty: string; // 對象 (如：舒舒、榮豐、國泰世華銀行)
  totalAmount: number; // 原始金額 / 總借款
  remainingAmount: number; // 剩餘欠款 (還完剩多少)
  isInstallment?: boolean; // 是否為分期付款
  totalPeriods?: number; // 總期數 (如 12 期，或單次 1)
  paidPeriods?: number; // 已繳期數
  periodAmount?: number; // 每期金額
  startDate: string; // 借款/分期開始日期
  dueDate?: string; // 預計還款日期 (什麼時候還)
  notes?: string;
  isSettled: boolean; // 是否已結清
  repayments: DebtRepayment[]; // 還款記錄歷史
  createdAt?: string;
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

export interface SplitPayer {
  name: string; // 代墊/付款者名稱 (如：我、舒舒)
  amount: number; // 代墊金額
  paidAmount?: number; // 相容別名
}

export interface SplitParticipant {
  name: string; // 參與分攤者
  shareAmount: number; // 應付金額
  owedAmount?: number; // 相容別名
  isSettled: boolean; // 是否已付清
}

export interface SplitSettlement {
  from: string; // 應轉出人 (如：榮豐)
  to: string; // 應收進人 (如：我)
  amount: number; // 金額
  isSettled: boolean; // 是否已結清
}

export interface SplitBill {
  id: string;
  userId?: string;
  title: string; // 活動名稱 (如：火鍋聚餐、宜蘭包棟)
  totalAmount: number;
  myAmount?: number;
  members?: string[];
  payers: SplitPayer[]; // 多人先墊錢
  participants: SplitParticipant[]; // 多人分錢
  settlements: SplitSettlement[]; // 智慧計算結算流向
  splitMode: 'equal' | 'custom'; // 均分 或 自訂金額
  date: string;
  notes?: string;
  isSettled: boolean;
  createdAt?: string;
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
  // PWA Native Web Notifications
  pwaNotificationEnabled?: boolean;
  pwaTodoReminderEnabled?: boolean;
  pwaCalendarReminderEnabled?: boolean;
  pwaAccountingReminderEnabled?: boolean;
  pwaPeerRatingReminderEnabled?: boolean;
  pwaSharedCalendarNotifyEnabled?: boolean;
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

