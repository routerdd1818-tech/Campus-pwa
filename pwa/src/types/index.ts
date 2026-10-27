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
  credits?: number;
  category?: CreditCategory;
  semester?: string;
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
  isCountdown?: boolean;        // 同步連動至重要日子倒數 (預設 false)
  linkedCountdownId?: string;   // 連動的重要日子 ID
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
  counterparty: string; // 對象 (如：小明、阿豪、玉山信用卡)
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

export interface RecurringItem {
  id: string;
  userId?: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  dayOfMonth: number;            // 扣款日 1-31
  categoryName: string;
  emoji: string;                 // 自訂 Emoji (例: 🏠, 🍿, 📱)
  colorHex: string;              // 主題色票
  paymentMethodName: string;
  isActive: boolean;
  autoRecord: boolean;
  lastRecordedMonth?: string;    // YYYY-MM
  notes?: string;
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
  emoji?: string;                 // 自訂 Emoji (例: 💻, 🛵, 📱)
  colorHex?: string;
  notes?: string;
  isCompleted: boolean;
}

export type CountdownMode = 'countdown' | 'countup'; // 'countdown': 倒數日 (目標日), 'countup': 持續日/紀念日 (起始日)

export interface CountdownTodoItem {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface CountdownItem {
  id: string;
  userId?: string;
  title: string;
  targetDate: string;            // YYYY-MM-DD (倒數日為目標日，持續日為起始日)
  mode?: CountdownMode;          // 預設為 'countdown'
  emoji: string;                 // 自訂 Emoji (例: 🎓, 🎂, ✈️, 💳, 💖)
  category: 'exam' | 'finance' | 'life' | 'anniversary' | 'other';
  colorHex: string;
  isPinned: boolean;             // 置頂釘選
  notes?: string;
  todos?: CountdownTodoItem[];   // 專屬待辦/備戰清單
  linkedTodoId?: string;         // 連動的主待辦任務 ID
}

export type FriendPeriodMode = 'daily' | 'weekly' | 'monthly';

export interface SplitPayer {
  name: string; // 代墊/付款者名稱 (如：我、小明)
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

// 🏺 夢想存錢筒存款明細
export interface SavingsDeposit {
  id: string;
  amount: number;
  date: string;         // YYYY-MM-DD
  note?: string;        // 例: 省下手搖飲、打工獎金
}

// 🏺 夢想存錢筒／願望清單主結構 (純 Emoji + 色票)
export interface SavingsJar {
  id: string;
  title: string;        // 例: iPad Air M3、日本畢旅
  emoji: string;        // 自訂 Emoji (例: ✈️, 💻, 🎸)
  colorHex: string;     // 主題色票
  targetAmount: number; // 目標金額
  currentAmount: number;// 已存金額
  targetDate?: string;  // 預計達成日 (YYYY-MM-DD)
  deposits: SavingsDeposit[];
  isCompleted: boolean;
  notes?: string;
}

// 🎓 學分分類與單科成績結構
export type CreditCategory = 'required' | 'elective' | 'general'; // 必修 | 選修 | 通識

export interface CourseGradeItem {
  id: string;
  semester: string;             // 例: '114-1'
  courseName: string;           // 科目名稱
  emoji: string;                // 自訂 Emoji (例: 💻, 📐, 📖)
  colorHex: string;
  credits: number;              // 學分數 (預設 2 或 3)
  category: CreditCategory;     // 必修 / 選修 / 通識
  // 配分權重 (總和 100)
  attendanceWeight: number;     // 平時佔比 (預設 30)
  midtermWeight: number;        // 期中佔比 (預設 30)
  finalWeight: number;          // 期末佔比 (預設 40)
  // 實得分數 (null 代表尚未公布/未考)
  attendanceScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  isPassed?: boolean;           // 是否已修過取得學分
}

// 🎓 畢業學分門檻設定
export interface GraduationTarget {
  totalTarget: number;          // 畢業總學分 (預設 128)
  requiredTarget: number;       // 必修門檻 (預設 72)
  electiveTarget: number;       // 選修門檻 (預設 36)
  generalTarget: number;        // 通識門檻 (預設 20)
}

// 🎓 GPA 制度
export type GpaScale = '4.3' | '4.0';

// 📈 股票與基金持股結構
export interface StockHoldingItem {
  id: string;
  symbol: string;             // 例: '2330.TW', '0050.TW', 'VOO', '00878.TW'
  name: string;               // 例: '台積電', '元大台灣50', '國泰永續高股息'
  shares: number;             // 持有股數 (例: 200, 1000)
  currentPrice: number;       // 當前每股價格 (TWD)
  currency?: 'TWD' | 'USD';
  costBasis?: number;         // 買進平均成本價
  lastPriceUpdated?: string;  // 最後更新時間 ISO
  isAutoQuote?: boolean;      // 是否支援報價系統連線
}

// 💰 資產帳戶 (現金、銀行存款、行動電子支付如 Line Pay、證券投資、其他)
export type AssetAccountType = 'cash' | 'bank' | 'stock' | 'digital_wallet' | 'other';

export interface AssetAccount {
  id: string;
  name: string;               // 帳戶名稱 (例: '錢包現金', '台新Richart', 'Line Pay', '街口支付')
  type: AssetAccountType;
  balance: number;            // 現金/存款/電子支付目前餘額 (證券戶則為所有持股總市值)
  stocks?: StockHoldingItem[];// 股票基金明細 (僅 type === 'stock')
  colorHex?: string;
  iconKey?: string;           // 記帳風格圖示 key (wallet, landmark, smartphone, etc.)
  emoji?: string;
  accountNumber?: string;     // 銀行後四碼等備註 (如 8812)
  updatedAt: string;
}

// ⚖️ 銷帳與對帳平帳紀錄
export interface BalanceAdjustmentRecord {
  id: string;
  date: string;               // YYYY-MM-DD
  accountId: string;
  accountName: string;
  beforeBalance: number;
  afterBalance: number;
  diffAmount: number;         // 差額 (正為盤盈/多出，負為盤虧/少記)
  reason: string;             // 銷帳原因 (例: '錢包零錢誤差', '發票漏記', '手動校準')
  createdAt: string;          // ISO
}

// 🐾 月底吃土生存試算設定
export interface SurvivalBudgetSettings {
  monthlyBudget: number;      // 每月預算基準 (預設 12000)
  emergencyReserve: number;   // 緊急預備金保留不可動用 (預設 3000)
  includeCash: boolean;       // 生存金計算是否納入現金 (預設 true)
  includeBank: boolean;       // 生存金計算是否納入銀行存款 (預設 true)
  includeReceivables: boolean;// 生存金計算是否納入別人欠款 (預設 false)
  includeStocks: boolean;     // 生存金計算是否納入股票基金市值 (預設 false)
}

// 📋 待選課程／未來排課心願單結構
export interface CourseWishlistItem {
  id: string;
  targetSemester: string;     // 預計修課學期 (例: '115-2', '116-1')
  name: string;               // 課程名稱
  credits: number;            // 學分數
  category: CreditCategory;   // 必修 / 選修 / 通識
  dayOfWeek: DayOfWeek;       // 1 = Mon ... 7 = Sun
  startTime: string;          // HH:mm
  endTime: string;            // HH:mm
  classroom?: string;         // 教室 / 地點
  instructor?: string;        // 授課教師
  colorHex: string;
  emoji: string;
  priority: 'must' | 'high' | 'medium' | 'low'; // 志願序 (第一志願/必搶/備選)
  status: 'wishlist' | 'enrolled' | 'dropped';   // 心願待選中 / 已選上轉正式 / 已放棄
  notes?: string;
  createdAt: string;
}

// 🌟 首頁「當日」板塊定義與自由排版設定
export type TodaySectionId =
  | 'status'       // 即時上課狀態
  | 'pomodoro'     // 伴讀番茄鐘專注捷徑
  | 'countdowns'   // 重要日子
  | 'courses'      // 今日排定課表
  | 'todos'        // 今日焦點待辦
  | 'events'       // 今日進行中活動
  | 'accounting';  // 今日記帳與花費

export interface TodayLayoutSettings {
  sectionOrder: TodaySectionId[];
  collapsedSections: Record<string, boolean>;
  hiddenSections: Record<string, boolean>;
}




