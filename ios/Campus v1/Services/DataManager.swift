//
//  DataManager.swift
//  Campus v1
//

import Foundation
import SwiftUI
import Combine
import WidgetKit
import UserNotifications

public enum StatsRange: String, CaseIterable, Identifiable {
    case weekly = "一週統整"
    case monthly = "一個月統整"
    case yearly = "一年統整"
    
    public var id: String { rawValue }
}

@MainActor
public final class DataManager: ObservableObject {
    public static let shared = DataManager()
    
    // MARK: - 課表與待辦狀態
    @Published public var courses: [Course] = []
    @Published public var todos: [TodoItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var isUsingCloud: Bool = false
    
    // MARK: - 好友共用行事曆與記錄簿狀態
    @Published public var myShareCode: String = ""
    @Published public var myShareName: String = "我的課表"
    @Published public var isMySharingEnabled: Bool = true
    @Published public var friendSchedule: SharedSchedule? = nil
    @Published public var isViewingFriend: Bool = false
    @Published public var isFriendScheduleExpanded: Bool = false
    @Published public var shareSyncMessage: String? = nil
    
    /// 好友分享記錄簿（儲存所有查詢過或新增的好友 6 碼代碼與快取資料，課表與記帳共用，免重複輸入代碼）
    @Published public var savedFriends: [SavedFriendRecord] = []
    
    // MARK: - 記帳模組狀態
    @Published public var transactions: [TransactionItem] = []
    @Published public var categories: [AccountingCategory] = []
    @Published public var paymentMethods: [PaymentMethod] = []
    @Published public var installments: [InstallmentItem] = []
    @Published public var splitBills: [SplitBill] = []
    @Published public var recurringItems: [RecurringItem] = []
    
    // 好友理性審查與今日花費分享開關（預設為開啟）
    @Published public var isSharingTodayExpense: Bool = true
    
    private var isInitializing: Bool = true
    private var widgetSyncTask: Task<Void, Never>? = nil
    
    // MARK: - 記帳每日定時自動上傳設定（預設每天下午 13:30 與晚上 22:30 各自動上傳一次）
    @Published public var isAutoUploadAccountingEnabled: Bool = true {
        didSet {
            guard !isInitializing else { return }
            UserDefaults.standard.set(isAutoUploadAccountingEnabled, forKey: "campus_auto_upload_accounting_enabled")
            scheduleAutoAccountingUploadNotifications()
        }
    }
    @Published public var autoUploadSlot1Hour: Int = 13 {
        didSet {
            guard !isInitializing, oldValue != autoUploadSlot1Hour else { return }
            UserDefaults.standard.set(autoUploadSlot1Hour, forKey: "campus_auto_upload_slot1_hour")
            UserDefaults.standard.set("", forKey: "campus_auto_upload_slot1_last_date")
            scheduleAutoAccountingUploadNotifications()
        }
    }
    @Published public var autoUploadSlot1Minute: Int = 30 {
        didSet {
            guard !isInitializing, oldValue != autoUploadSlot1Minute else { return }
            UserDefaults.standard.set(autoUploadSlot1Minute, forKey: "campus_auto_upload_slot1_minute")
            UserDefaults.standard.set("", forKey: "campus_auto_upload_slot1_last_date")
            scheduleAutoAccountingUploadNotifications()
        }
    }
    @Published public var autoUploadSlot2Hour: Int = 22 {
        didSet {
            guard !isInitializing, oldValue != autoUploadSlot2Hour else { return }
            UserDefaults.standard.set(autoUploadSlot2Hour, forKey: "campus_auto_upload_slot2_hour")
            UserDefaults.standard.set("", forKey: "campus_auto_upload_slot2_last_date")
            scheduleAutoAccountingUploadNotifications()
        }
    }
    @Published public var autoUploadSlot2Minute: Int = 30 {
        didSet {
            guard !isInitializing, oldValue != autoUploadSlot2Minute else { return }
            UserDefaults.standard.set(autoUploadSlot2Minute, forKey: "campus_auto_upload_slot2_minute")
            UserDefaults.standard.set("", forKey: "campus_auto_upload_slot2_last_date")
            scheduleAutoAccountingUploadNotifications()
        }
    }
    @Published public var lastAutoUploadAccountingDate: Date? = nil
    @Published public var isUploadingAccounting: Bool = false
    private var accountingUploadTimer: Timer? = nil
    
    @Published public var customDailyLimit: Double = 300.0
    @Published public var accountingResetDay: Int = 1
    @Published public var isIncomeBasedDailyLimit: Bool = false
    public var deviceId: String = ""
    
    // MARK: - 好友記帳互評與折疊檢視狀態
    @Published public var friendAccounting: SharedSchedule? = nil
    @Published public var isViewingFriendAccounting: Bool = false
    @Published public var isFriendAccountingExpanded: Bool = false
    @Published public var friendAccountingMessage: String? = nil
    
    // 預先計算的記帳快取指標（極致加速開 App 與 View 渲染效能）
    @Published public var cachedTodayExpense: Double = 0
    @Published public var cachedTodayRationalScore: Double? = nil
    @Published public var cachedThisMonthExpense: Double = 0
    @Published public var cachedThisMonthIncome: Double = 0
    @Published public var cachedThisMonthBalance: Double = 0
    @Published public var cachedMonthRationalScore: Double? = nil
    
    // 本地快取金鑰
    private let coursesLocalKey = "campus_local_courses"
    private let todosLocalKey = "campus_local_todos"
    private let transactionsLocalKey = "campus_local_transactions"
    private let categoriesLocalKey = "campus_local_categories"
    private let paymentMethodsLocalKey = "campus_local_payment_methods"
    private let installmentsLocalKey = "campus_local_installments"
    private let splitBillsLocalKey = "campus_local_split_bills"
    private let recurringLocalKey = "campus_local_recurring"
    private let savedFriendsLocalKey = "campus_saved_friends_book"
    
    public init() {
        loadSharingPreferences()
        loadInitialData()
        // 自動刪除超過三天的已完成待辦事項
        let threeDaysAgo = Calendar.current.date(byAdding: .day, value: -3, to: Date()) ?? Date()
        self.todos.removeAll { todo in
            if todo.isCompleted, let completedAt = todo.completedAt {
                return completedAt < threeDaysAgo
            }
            return false
        }
        self.isInitializing = false
        
        // 延後非關鍵背景排程與通知註冊，讓首幀 UI 0 延遲渲染
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 800_000_000)
            self.requestNotificationPermission()
            self.scheduleAutoAccountingUploadNotifications()
            self.startAccountingAutoUploadScheduler()
        }
    }
    
    private func loadSharingPreferences() {
        if let savedCode = UserDefaults.standard.string(forKey: "campus_my_share_code"), !savedCode.isEmpty {
            self.myShareCode = savedCode
        } else {
            let newCode = Self.generateShareCode()
            self.myShareCode = newCode
            UserDefaults.standard.set(newCode, forKey: "campus_my_share_code")
        }
        
        self.myShareName = UserDefaults.standard.string(forKey: "campus_my_share_name") ?? "我的課表"
        self.isMySharingEnabled = UserDefaults.standard.object(forKey: "campus_my_sharing_enabled") as? Bool ?? true
        self.isSharingTodayExpense = UserDefaults.standard.object(forKey: "campus_share_today_expense") as? Bool ?? true
        
        // 載入記帳定時自動上傳設定（預設開啟：每天 13:30 與 22:30）
        self.isAutoUploadAccountingEnabled = UserDefaults.standard.object(forKey: "campus_auto_upload_accounting_enabled") as? Bool ?? true
        self.autoUploadSlot1Hour = UserDefaults.standard.object(forKey: "campus_auto_upload_slot1_hour") as? Int ?? 13
        self.autoUploadSlot1Minute = UserDefaults.standard.object(forKey: "campus_auto_upload_slot1_minute") as? Int ?? 30
        self.autoUploadSlot2Hour = UserDefaults.standard.object(forKey: "campus_auto_upload_slot2_hour") as? Int ?? 22
        self.autoUploadSlot2Minute = UserDefaults.standard.object(forKey: "campus_auto_upload_slot2_minute") as? Int ?? 30
        if let lastUpload = UserDefaults.standard.object(forKey: "campus_last_auto_upload_accounting_date") as? Date {
            self.lastAutoUploadAccountingDate = lastUpload
        }
        
        // 載入好友分享記錄簿
        if let friendsData = UserDefaults.standard.data(forKey: savedFriendsLocalKey),
           let decodedFriends = try? JSONDecoder().decode([SavedFriendRecord].self, from: friendsData) {
            self.savedFriends = decodedFriends
            if let firstCached = decodedFriends.first?.cachedSchedule {
                if self.friendSchedule == nil {
                    self.friendSchedule = firstCached
                }
                if self.friendAccounting == nil {
                    self.friendAccounting = firstCached
                }
            }
        }
        
        if let existingId = UserDefaults.standard.string(forKey: "campus_device_id") {
            self.deviceId = existingId
        } else {
            let newId = UUID().uuidString
            UserDefaults.standard.set(newId, forKey: "campus_device_id")
            self.deviceId = newId
        }
    }
    
    private static func generateShareCode() -> String {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return String((0..<6).map { _ in chars.randomElement()! })
    }
    
    // MARK: - 資料初始化 (極致快取優先，0 秒瞬間啟動)
    public func loadInitialData() {
        // 1. 同步從本地讀取所有資料 (耗時 < 2ms)
        loadLocalCoursesAndTodos()
        loadLocalAccountingData()
        
        let savedResetDay = UserDefaults.standard.integer(forKey: "accountingResetDay")
        self.accountingResetDay = savedResetDay == 0 ? 1 : savedResetDay
    
        let savedLimit = UserDefaults.standard.double(forKey: "customDailyLimit")
        self.customDailyLimit = savedLimit > 0 ? savedLimit : 300.0
        self.isIncomeBasedDailyLimit = UserDefaults.standard.bool(forKey: "isIncomeBasedDailyLimit")
        
        // 2. 立即重算記帳統計快取
        recalculateAccountingMetrics()
        
        // 3. 排程同步小工具 (防抖動合併執行，不阻塞首幀啟動動畫)
        scheduleWidgetSync(delayNanoseconds: 350_000_000)
        
        // 4. 背景非同步檢查 Supabase 雲端 (延後至首幀完成後執行，不搶佔主執行緒)
        if SupabaseConfig.shared.isConfigured {
            isUsingCloud = true
            Task(priority: .utility) {
                try? await Task.sleep(nanoseconds: 600_000_000)
                await fetchFromSupabase()
            }
        } else {
            isUsingCloud = false
        }
    }
    
    private func loadLocalCoursesAndTodos() {
        if let savedCoursesData = UserDefaults.standard.data(forKey: coursesLocalKey),
           let decodedCourses = try? JSONDecoder().decode([Course].self, from: savedCoursesData),
           !decodedCourses.isEmpty {
            self.courses = decodedCourses
        } else {
            self.courses = Self.defaultMockCourses()
            if let data = try? JSONEncoder().encode(self.courses) {
                UserDefaults.standard.set(data, forKey: coursesLocalKey)
            }
        }
        
        if let savedTodosData = UserDefaults.standard.data(forKey: todosLocalKey),
           let decodedTodos = try? JSONDecoder().decode([TodoItem].self, from: savedTodosData) {
            self.todos = decodedTodos
        } else {
            self.todos = Self.defaultMockTodos(courseIds: self.courses.map { $0.id })
            if let data = try? JSONEncoder().encode(self.todos) {
                UserDefaults.standard.set(data, forKey: todosLocalKey)
            }
        }
    }
    
    private func loadLocalAccountingData() {
        // 1. 分類
        if let data = UserDefaults.standard.data(forKey: categoriesLocalKey),
           let decoded = try? JSONDecoder().decode([AccountingCategory].self, from: data), !decoded.isEmpty {
            self.categories = decoded
        } else {
            self.categories = AccountingCategory.defaultCategories
            if let data = try? JSONEncoder().encode(self.categories) {
                UserDefaults.standard.set(data, forKey: categoriesLocalKey)
            }
        }
        
        // 自動補齊 5 大餐飲分類（早餐、中餐、晚餐、宵夜、飲料），以防舊使用者本地資料缺少
        let mealNames = ["早餐", "中餐", "晚餐", "宵夜", "飲料"]
        let defaultMeals = AccountingCategory.defaultExpenseCategories.filter { mealNames.contains($0.name) }
        var hasAddedMeal = false
        for meal in defaultMeals.reversed() {
            if !self.categories.contains(where: { $0.name == meal.name }) {
                self.categories.insert(meal, at: 0)
                hasAddedMeal = true
            }
        }
        if hasAddedMeal {
            if let data = try? JSONEncoder().encode(self.categories) {
                UserDefaults.standard.set(data, forKey: categoriesLocalKey)
            }
        }
        
        // 2. 支付方式
        if let data = UserDefaults.standard.data(forKey: paymentMethodsLocalKey),
           let decoded = try? JSONDecoder().decode([PaymentMethod].self, from: data), !decoded.isEmpty {
            self.paymentMethods = decoded
        } else {
            self.paymentMethods = PaymentMethod.defaultMethods
            if let data = try? JSONEncoder().encode(self.paymentMethods) {
                UserDefaults.standard.set(data, forKey: paymentMethodsLocalKey)
            }
        }
        
        // 3. 交易紀錄
        if let sharedTx = CampusSharedStore.shared.load([TransactionItem].self, forKey: transactionsLocalKey), !sharedTx.isEmpty {
            self.transactions = sharedTx.sorted { $0.date > $1.date }
        } else if let data = UserDefaults.standard.data(forKey: transactionsLocalKey),
           let decoded = try? JSONDecoder().decode([TransactionItem].self, from: data) {
            self.transactions = decoded.sorted { $0.date > $1.date }
        } else {
            self.transactions = Self.defaultMockTransactions()
            if let data = try? JSONEncoder().encode(self.transactions) {
                UserDefaults.standard.set(data, forKey: transactionsLocalKey)
            }
        }
        
        // 4. 分期付款
        if let data = UserDefaults.standard.data(forKey: installmentsLocalKey),
           let decoded = try? JSONDecoder().decode([InstallmentItem].self, from: data) {
            self.installments = decoded
        } else {
            self.installments = Self.defaultMockInstallments()
            if let data = try? JSONEncoder().encode(self.installments) {
                UserDefaults.standard.set(data, forKey: installmentsLocalKey)
            }
        }
        
        // 5. 墊錢分帳
        if let data = UserDefaults.standard.data(forKey: splitBillsLocalKey),
           let decoded = try? JSONDecoder().decode([SplitBill].self, from: data) {
            self.splitBills = decoded
        } else {
            self.splitBills = Self.defaultMockSplitBills()
            if let data = try? JSONEncoder().encode(self.splitBills) {
                UserDefaults.standard.set(data, forKey: splitBillsLocalKey)
            }
        }
        
        // 6. 每月固定收支
        if let data = UserDefaults.standard.data(forKey: recurringLocalKey),
           let decoded = try? JSONDecoder().decode([RecurringItem].self, from: data) {
            self.recurringItems = decoded
        } else {
            self.recurringItems = RecurringItem.defaultMocks
            if let data = try? JSONEncoder().encode(self.recurringItems) {
                UserDefaults.standard.set(data, forKey: recurringLocalKey)
            }
        }
    }
    
    // MARK: - 統計快取重算 (O(1) 效能核心)
    public func recalculateAccountingMetrics() {
        let calendar = Calendar.current
        let today = Date()
        
        // 今日支出
        let todayItems = transactions.filter {
            $0.type == .expense && calendar.isDate($0.date, inSameDayAs: today)
        }
        cachedTodayExpense = todayItems.reduce(0) { $0 + $1.amount }
        
        let scoredToday = todayItems.filter { $0.valueScore > 0 }
        cachedTodayRationalScore = scoredToday.isEmpty ? nil : (Double(scoredToday.reduce(0) { $0 + $1.valueScore }) / Double(scoredToday.count))
        
        // 當月收支 (根據發薪日計算)
        let resetDay = self.accountingResetDay
        let currentMonthStart = calendar.date(bySetting: .day, value: resetDay, of: today) ?? today
        let cycleStart: Date
        let cycleEnd: Date
        if today < currentMonthStart {
            cycleStart = calendar.date(byAdding: .month, value: -1, to: currentMonthStart) ?? today
            cycleEnd = calendar.date(byAdding: .day, value: -1, to: currentMonthStart) ?? today
        } else {
            cycleStart = currentMonthStart
            let nextMonthStart = calendar.date(byAdding: .month, value: 1, to: currentMonthStart) ?? today
            cycleEnd = calendar.date(byAdding: .day, value: -1, to: nextMonthStart) ?? today
        }
        
        let thisMonthItems = transactions.filter {
            let startOfItem = calendar.startOfDay(for: $0.date)
            let startOfCycle = calendar.startOfDay(for: cycleStart)
            let endOfCycle = calendar.startOfDay(for: cycleEnd)
            return startOfItem >= startOfCycle && startOfItem <= endOfCycle
        }
        cachedThisMonthExpense = thisMonthItems.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
        cachedThisMonthIncome = thisMonthItems.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
        cachedThisMonthBalance = cachedThisMonthIncome - cachedThisMonthExpense
        
        let scoredMonth = thisMonthItems.filter { $0.type == .expense && $0.valueScore > 0 }
        cachedMonthRationalScore = scoredMonth.isEmpty ? nil : (Double(scoredMonth.reduce(0) { $0 + $1.valueScore }) / Double(scoredMonth.count))
    }
    
    // MARK: - 本地儲存方法
    private func saveCoursesToLocal(syncCloudSettings: Bool = true) {
        if let data = try? JSONEncoder().encode(courses) {
            UserDefaults.standard.set(data, forKey: coursesLocalKey)
        }
        scheduleWidgetSync()
        if syncCloudSettings {
            Task(priority: .utility) { await LineBotService.shared.syncSettingsToSupabase() }
        }
    }
    
    private func saveTodosToLocal(syncCloudSettings: Bool = true) {
        if let data = try? JSONEncoder().encode(todos) {
            UserDefaults.standard.set(data, forKey: todosLocalKey)
        }
        scheduleWidgetSync()
        if syncCloudSettings {
            Task(priority: .utility) { await LineBotService.shared.syncSettingsToSupabase() }
        }
    }
    
    public func saveTransactionsToLocal() {
        UserDefaults.standard.set(accountingResetDay, forKey: "accountingResetDay")
        UserDefaults.standard.set(customDailyLimit, forKey: "customDailyLimit")
        UserDefaults.standard.set(isIncomeBasedDailyLimit, forKey: "isIncomeBasedDailyLimit")
        recalculateAccountingMetrics()
        // CampusSharedStore.save 已同時寫入 App Group 與 UserDefaults.standard，無需重複 encode
        CampusSharedStore.shared.save(transactions, forKey: transactionsLocalKey)
        scheduleWidgetSync()
    }
    
    public func reloadTransactionsFromShared() {
        if let sharedTx = CampusSharedStore.shared.load([TransactionItem].self, forKey: transactionsLocalKey), !sharedTx.isEmpty {
            if sharedTx != self.transactions {
                self.transactions = sharedTx.sorted { $0.date > $1.date }
                recalculateAccountingMetrics()
            }
        }
    }
    
    public func saveCategoriesToLocal() {
        if let data = try? JSONEncoder().encode(categories) {
            UserDefaults.standard.set(data, forKey: categoriesLocalKey)
        }
    }
    
    public func savePaymentMethodsToLocal() {
        if let data = try? JSONEncoder().encode(paymentMethods) {
            UserDefaults.standard.set(data, forKey: paymentMethodsLocalKey)
        }
    }
    
    public func saveInstallmentsToLocal() {
        if let data = try? JSONEncoder().encode(installments) {
            UserDefaults.standard.set(data, forKey: installmentsLocalKey)
        }
    }
    
    public func saveSplitBillsToLocal() {
        if let data = try? JSONEncoder().encode(splitBills) {
            UserDefaults.standard.set(data, forKey: splitBillsLocalKey)
        }
    }
    
    public func saveRecurringToLocal() {
        if let data = try? JSONEncoder().encode(recurringItems) {
            UserDefaults.standard.set(data, forKey: recurringLocalKey)
        }
    }
    
    // MARK: - 系統通知提醒管理 (UNUserNotificationCenter)
    public func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }
    
    public func scheduleTodoReminder(for todo: TodoItem) {
        cancelTodoReminder(for: todo.id)
        guard !todo.isCompleted else { return }
        let now = Date()
        let calendar = Calendar.current
        
        // 1. 前一天提醒 (預設截止前 1 天)
        if todo.remind1DayBefore, let dueDate = todo.dueDate {
            if let oneDayBefore = calendar.date(byAdding: .day, value: -1, to: dueDate), oneDayBefore > now {
                let content = UNMutableNotificationContent()
                content.title = "⏰ 待辦即將截止提醒 (還有 1 天)"
                content.body = "「\(todo.title)」將在明天到期，請把握時間完成！"
                content.sound = .default
                
                let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: oneDayBefore)
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let request = UNNotificationRequest(identifier: "campus_todo_\(todo.id.uuidString)_1day", content: content, trigger: trigger)
                UNUserNotificationCenter.current().add(request)
            }
        }
        
        // 2. 前三天提醒 (預設截止前 3 天)
        if todo.remind3DaysBefore, let dueDate = todo.dueDate {
            if let threeDaysBefore = calendar.date(byAdding: .day, value: -3, to: dueDate), threeDaysBefore > now {
                let content = UNMutableNotificationContent()
                content.title = "📅 待辦提早提醒 (還有 3 天)"
                content.body = "「\(todo.title)」將在 3 天後到期，記得提前準備喔！"
                content.sound = .default
                
                let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: threeDaysBefore)
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let request = UNNotificationRequest(identifier: "campus_todo_\(todo.id.uuidString)_3day", content: content, trigger: trigger)
                UNUserNotificationCenter.current().add(request)
            }
        }
        
        // 3. 自訂時間推播提醒
        if todo.hasReminder, let reminderDate = todo.reminderDate, reminderDate > now {
            let content = UNMutableNotificationContent()
            content.title = "可樂助手 待辦提醒"
            content.body = "「\(todo.title)」提醒時間到了，記得按時完成喔！"
            content.sound = .default
            
            let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: reminderDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let request = UNNotificationRequest(identifier: "campus_todo_\(todo.id.uuidString)_custom", content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request)
        }
    }
    
    public func cancelTodoReminder(for todoId: UUID) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [
            "campus_todo_\(todoId.uuidString)",
            "campus_todo_\(todoId.uuidString)_1day",
            "campus_todo_\(todoId.uuidString)_3day",
            "campus_todo_\(todoId.uuidString)_custom"
        ])
    }
    
    // MARK: - 課程關聯待辦查詢
    public func pendingTodos(for courseId: UUID) -> [TodoItem] {
        todos.filter { $0.courseId == courseId && !$0.isCompleted }
    }
    
    public func allTodos(for courseId: UUID) -> [TodoItem] {
        todos.filter { $0.courseId == courseId }
    }
    
    // MARK: - 好友理性評審與分享 (Peer Expense Rating)
    public func toggleShareTodayExpense(_ enabled: Bool) {
        isSharingTodayExpense = enabled
        UserDefaults.standard.set(enabled, forKey: "campus_share_today_expense")
    }
    
    public func rateFriendTransaction(id: UUID, rating: Double, feedback: String = "") {
        if let index = transactions.firstIndex(where: { $0.id == id }) {
            var updated = transactions[index]
            updated.peerRating = rating
            updated.peerFeedback = feedback
            transactions[index] = updated
            saveTransactionsToLocal()
            if SupabaseConfig.shared.isConfigured {
                Task { await syncTransactionToCloud(updated, isNew: false) }
            }
        }
    }
    
    public func shareTodayExpenseSummary() -> String {
        let items = transactions.filter {
            Calendar.current.isDate($0.date, inSameDayAs: Date()) && $0.type == .expense
        }
        var msg = "【\(myShareName) 今日花費明細】\n"
        msg += "總支出：NT$ \(Int(todayExpense))\n"
        if let score = todayRationalScore {
            msg += "自評理性分數：\(String(format: "%.1f", score)) / 10\n"
        }
        msg += "明細：\n"
        if items.isEmpty {
            msg += "今天尚無支出紀錄。\n"
        } else {
            for (idx, item) in items.enumerated() {
                let note = item.notes.isEmpty ? item.categoryName : item.notes
                msg += "\(idx + 1). \(note) NT$ \(Int(item.amount)) (\(item.paymentMethodName))\n"
            }
        }
        msg += "\n快來幫我的今日花費打分數吧（1~10 分）！"
        return msg
    }
    

    public func calculateTodayBudget() -> (effectiveLimit: Double, remaining: Double) {
        let calendar = Calendar.current
        let today = Date()
        
        let resetDay = self.accountingResetDay
        let currentMonthStart = calendar.date(bySetting: .day, value: resetDay, of: today) ?? today
        let cycleStart: Date
        let cycleEnd: Date
        if today < currentMonthStart {
            cycleStart = calendar.date(byAdding: .month, value: -1, to: currentMonthStart) ?? today
            cycleEnd = calendar.date(byAdding: .day, value: -1, to: currentMonthStart) ?? today
        } else {
            cycleStart = currentMonthStart
            let nextMonthStart = calendar.date(byAdding: .month, value: 1, to: currentMonthStart) ?? today
            cycleEnd = calendar.date(byAdding: .day, value: -1, to: nextMonthStart) ?? today
        }
        
        let cycleStartDay = calendar.startOfDay(for: cycleStart)
        let cycleEndDay = calendar.startOfDay(for: cycleEnd)
        let daysInCycle = calendar.dateComponents([.day], from: cycleStartDay, to: cycleEndDay).day ?? 30
        let daysInCycleTotal = daysInCycle + 1
        
        var totalIncome: Double = 0
        var dailyExpenseMap: [Date: Double] = [:]
        for tx in transactions {
            let txDay = calendar.startOfDay(for: tx.date)
            guard txDay >= cycleStartDay && txDay <= cycleEndDay else { continue }
            if tx.type == .income {
                totalIncome += tx.amount
            } else {
                dailyExpenseMap[txDay, default: 0] += tx.amount
            }
        }
        
        let safeCustomLimit = customDailyLimit > 0 ? customDailyLimit : 300.0
        let rawBaseLimit = isIncomeBasedDailyLimit ? (totalIncome / Double(max(1, daysInCycleTotal))) : safeCustomLimit
        let baseDailyLimit = rawBaseLimit > 0 ? rawBaseLimit : safeCustomLimit
        
        var carryover: Double = 0
        let todayStart = calendar.startOfDay(for: today)
        let passedDays = calendar.dateComponents([.day], from: cycleStartDay, to: todayStart).day ?? 0
        
        for dayOffset in 0..<max(0, passedDays) {
            guard let d = calendar.date(byAdding: .day, value: dayOffset, to: cycleStartDay) else { continue }
            let dailyExpenses = dailyExpenseMap[calendar.startOfDay(for: d)] ?? 0
            let limitForDay = baseDailyLimit + carryover
            let balance = limitForDay - dailyExpenses
            carryover = balance < 0 ? balance : 0
        }
        var effectiveLimit = baseDailyLimit + carryover
        if effectiveLimit <= 0 && carryover == 0 {
            effectiveLimit = safeCustomLimit
        } else if effectiveLimit < 0 {
            effectiveLimit = 0
        }
        
        let todayExpenses = dailyExpenseMap[todayStart] ?? 0
        let remaining = effectiveLimit - todayExpenses
        return (effectiveLimit, remaining)
    }

    // MARK: - 桌面與鎖定小工具資料同步 (WidgetKit Multi-Layer Sync)
    
    private static let widgetTimeFormatter: DateFormatter = {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.dateFormat = "HH:mm"
        return df
    }()
    
    private static let widgetDayNumFormatter: DateFormatter = {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.dateFormat = "d"
        return df
    }()
    
    private static let widgetDateFormatter: DateFormatter = {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.dateFormat = "yyyy-MM-dd"
        return df
    }()
    
    /// 防抖動排程小工具同步，合併短時間內的多次資料變更，避免主執行緒卡頓
    public func scheduleWidgetSync(delayNanoseconds: UInt64 = 200_000_000) {
        widgetSyncTask?.cancel()
        widgetSyncTask = Task { @MainActor [weak self] in
            if delayNanoseconds > 0 {
                try? await Task.sleep(nanoseconds: delayNanoseconds)
            }
            guard !Task.isCancelled, let self = self else { return }
            self.performSyncToWidgets()
        }
    }

    public func syncToWidgets() {
        scheduleWidgetSync(delayNanoseconds: 120_000_000)
    }
    
    private func performSyncToWidgets() {
        let today = Date()
        let calendar = Calendar.current
        let weekday = WeekDay.from(date: today).rawValue
        
        // 預先依星期幾分組課程 (O(N) 單次分組，取代迴圈內 38 次重複 filter)
        var coursesByWeekday: [Int: [Course]] = [:]
        for c in courses {
            coursesByWeekday[c.dayOfWeek, default: []].append(c)
        }
        for key in coursesByWeekday.keys {
            coursesByWeekday[key]?.sort { $0.startTime < $1.startTime }
        }
        
        let todayCoursesList = coursesByWeekday[weekday] ?? []
        let nowStr = Self.widgetTimeFormatter.string(from: today)
        let remainingCoursesList = todayCoursesList.filter { $0.endTime >= nowStr }
        let nextCourse = remainingCoursesList.first
        
        // 0. 今日詳細課表 (用於毛玻璃今日行程彩色豎條渲染)
        let todayDetails: [WidgetTodayCourseDetail] = todayCoursesList.map { c in
            WidgetTodayCourseDetail(
                id: c.id,
                name: c.name,
                classroom: c.classroom,
                startTime: c.startTime,
                endTime: c.endTime,
                colorHex: c.colorHex
            )
        }
        
        let pending = todos(for: today).filter { !$0.isCompleted }
        let todoDetails: [WidgetTodoItemDetail] = pending.map { t in
            WidgetTodoItemDetail(
                id: t.id,
                title: t.title,
                countdownText: t.dueDate != nil ? t.countdownBadgeText : "待完成",
                isPriority: t.priority == .high,
                categoryColorHex: t.displayCategoryColorHex,
                isCompleted: t.isCompleted
            )
        }
        
        // 生成週曆欄位 (日一二三四五六 排列)
        var weeklyColumns: [WidgetWeeklyDayColumn] = []
        let currentWeekday = calendar.component(.weekday, from: today) // 1=Sun..7=Sat
        let daysFromSunday = currentWeekday - 1
        let sundayDate = calendar.date(byAdding: .day, value: -daysFromSunday, to: calendar.startOfDay(for: today))!
        let weekdaysNames = ["日", "一", "二", "三", "四", "五", "六"]
        
        for i in 0..<7 {
            let colDate = calendar.date(byAdding: .day, value: i, to: sundayDate)!
            let calWeekday = calendar.component(.weekday, from: colDate) // 1=Sun..7=Sat
            let appWeekday = calWeekday == 1 ? 7 : calWeekday - 1
            let colCoursesList = coursesByWeekday[appWeekday] ?? []
            
            let colCourses: [WidgetWeeklyCourseItem] = colCoursesList.map { c in
                WidgetWeeklyCourseItem(
                    id: c.id,
                    name: c.name,
                    classroom: c.classroom,
                    timeSnippet: "\(c.startTime)-\(c.endTime)",
                    colorHex: c.colorHex,
                    weekday: appWeekday
                )
            }
            
            let dayTodos = todos(for: colDate).filter { !$0.isCompleted }
            let colTodos: [WidgetTodoItemDetail] = dayTodos.map { t in
                WidgetTodoItemDetail(
                    id: t.id,
                    title: t.title,
                    countdownText: t.countdownBadgeText,
                    isPriority: t.priority == .high,
                    categoryColorHex: t.displayCategoryColorHex,
                    isCompleted: t.isCompleted
                )
            }
            
            weeklyColumns.append(WidgetWeeklyDayColumn(
                weekday: calWeekday,
                weekdayName: weekdaysNames[i],
                dayNumberString: Self.widgetDayNumFormatter.string(from: colDate),
                dateString: Self.widgetDateFormatter.string(from: colDate),
                isToday: calendar.isDate(colDate, inSameDayAs: today),
                courses: colCourses,
                todos: colTodos
            ))
        }

        let scheduleEntry = WidgetScheduleEntry(
            date: today,
            courseName: nextCourse?.name ?? (todayCoursesList.isEmpty ? "今天無課程安排" : "今日課程已全部結束"),
            classroom: nextCourse?.classroom ?? "",
            time: nextCourse != nil ? "\(nextCourse!.startTime) - \(nextCourse!.endTime)" : "享受空堂時光",
            remainingCoursesCount: remainingCoursesList.count,
            todayCourses: todayDetails,
            weeklyColumns: weeklyColumns,
            reminders: todoDetails
        )
        CampusSharedStore.shared.save(scheduleEntry, forKey: "campus_widget_schedule")
        
        // 2. 待辦小工具快照 (CampusTodoWidget)
        let firstUrgent = pending.first
        let todoEntry = WidgetTodoEntry(
            date: today,
            urgentTodoTitle: firstUrgent?.title ?? "所有待辦與作業均已完成！",
            countdownText: firstUrgent?.dueDate != nil ? (firstUrgent?.countdownBadgeText ?? "待完成") : "無倒數",
            pendingTotalCount: pending.count,
            items: todoDetails
        )
        CampusSharedStore.shared.save(todoEntry, forKey: "campus_widget_todo")
        
        // 3. 記帳小工具快照 (CampusAccountingWidget)
        let budget = calculateTodayBudget()
        let accountingEntry = WidgetAccountingEntry(
            date: today,
            todayExpense: todayExpense,
            monthBalance: thisMonthBalance,
            dailyLimit: budget.effectiveLimit,
            dailyRemaining: budget.remaining
        )
        CampusSharedStore.shared.save(accountingEntry, forKey: "campus_widget_accounting")
        
        // 4. 月曆小工具快照 (CampusCalendarWidget)
        let year = calendar.component(.year, from: today)
        let month = calendar.component(.month, from: today)
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: today) ?? 1
        let isLeap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
        let totalDaysInYear = isLeap ? 366 : 365
        let yearProgressPercent = Int((Double(dayOfYear) / Double(totalDaysInYear)) * 100)
        let daysRemaining = totalDaysInYear - dayOfYear
        
        var widgetCalendarDays: [WidgetCalendarDay] = []
        if let monthInterval = calendar.dateInterval(of: .month, for: today),
           let daysRange = calendar.range(of: .day, in: .month, for: today) {
            let startOfMonth = monthInterval.start
            let firstWeekday = calendar.component(.weekday, from: startOfMonth) // 1=Sun..7=Sat
            let prefixCount = (firstWeekday - 1)
            
            for p in 0..<prefixCount {
                if let prevDate = calendar.date(byAdding: .day, value: -(prefixCount - p), to: startOfMonth) {
                    let dayNum = calendar.component(.day, from: prevDate)
                    widgetCalendarDays.append(WidgetCalendarDay(
                        dayNumber: dayNum,
                        isCurrentMonth: false,
                        isToday: false
                    ))
                }
            }
            
            for dayNum in 1...daysRange.count {
                if let targetDate = calendar.date(byAdding: .day, value: dayNum - 1, to: startOfMonth) {
                    let isToday = calendar.isDateInToday(targetDate)
                    let calW = calendar.component(.weekday, from: targetDate)
                    let appW = calW == 1 ? 7 : calW - 1
                    let dayCourseList = coursesByWeekday[appW] ?? []
                    let dayTodoList = todos(for: targetDate)
                    let hasCourse = !dayCourseList.isEmpty
                    let hasTodo = !dayTodoList.isEmpty
                    var tagSnippet: String? = nil
                    if hasCourse {
                        tagSnippet = dayCourseList.first?.name
                    } else if hasTodo {
                        tagSnippet = dayTodoList.first?.title
                    }
                    widgetCalendarDays.append(WidgetCalendarDay(
                        dayNumber: dayNum,
                        isCurrentMonth: true,
                        isToday: isToday,
                        hasCourse: hasCourse,
                        hasTodo: hasTodo,
                        eventTag: tagSnippet
                    ))
                }
            }
            
            var nextMonthDay = 1
            while widgetCalendarDays.count % 7 != 0 {
                widgetCalendarDays.append(WidgetCalendarDay(
                    dayNumber: nextMonthDay,
                    isCurrentMonth: false,
                    isToday: false
                ))
                nextMonthDay += 1
            }
        }
        
        let coursesSummary = todayCoursesList.isEmpty ? "今天無課程安排" : "今日 \(todayCoursesList.count) 堂課：\(todayCoursesList.map { $0.name }.joined(separator: "、"))"
        let todoSummary = pending.isEmpty ? "待辦作業已全數清空" : "剩餘 \(pending.count) 項：\(firstUrgent?.title ?? "")"
        
        let calendarEntry = WidgetCalendarEntry(
            date: today,
            year: year,
            month: month,
            monthTitle: "\(year)年\(month)月",
            yearProgressPercent: yearProgressPercent,
            daysRemainingInYear: daysRemaining,
            days: widgetCalendarDays,
            todayScheduleSummary: coursesSummary,
            todayTodoSummary: todoSummary,
            todayExpenseAmount: todayExpense,
            courses: todayDetails,
            todos: todoDetails
        )
        CampusSharedStore.shared.save(calendarEntry, forKey: "campus_widget_calendar")
        
        // 5. 一週課表小工具快照 (CampusWeeklyScheduleWidget)
        let weeklyEntry = WidgetWeeklyScheduleEntry(
            date: today,
            weekTitle: "一週課表全覽",
            currentWeekday: weekday,
            quote: todayDetails.isEmpty ? "今日無排課" : "今日 \(todayDetails.count) 堂課",
            columns: weeklyColumns,
            todayCourses: todayDetails,
            reminders: todoDetails
        )
        CampusSharedStore.shared.save(weeklyEntry, forKey: "campus_widget_weekly_schedule")
        
        WidgetCenter.shared.reloadAllTimelines()
    }
    
    // MARK: - 課程操作 (Course CRUD)
    public func addCourse(_ course: Course) {
        var course = course
        course.deviceId = self.deviceId
        courses.append(course)
        courses.sort { $0.startTime < $1.startTime }
        saveCoursesToLocal()
        if SupabaseConfig.shared.isConfigured {
            Task { await syncCourseToCloud(course, isNew: true) }
        }
    }
    
    public func updateCourse(_ course: Course) {
        var course = course
        course.deviceId = self.deviceId
        if let index = courses.firstIndex(where: { $0.id == course.id }) {
            courses[index] = course
            courses.sort { $0.startTime < $1.startTime }
            saveCoursesToLocal()
            if SupabaseConfig.shared.isConfigured {
                Task { await syncCourseToCloud(course, isNew: false) }
            }
        }
    }
    
    public func deleteCourse(id: UUID) {
        courses.removeAll { $0.id == id }
        saveCoursesToLocal()
        if SupabaseConfig.shared.isConfigured {
            Task { await deleteCourseFromCloud(id: id) }
        }
    }
    
    public func deleteCourse(_ course: Course) {
        deleteCourse(id: course.id)
    }
    
    public func courses(for dayOfWeek: Int) -> [Course] {
        return courses.filter { $0.dayOfWeek == dayOfWeek }
            .sorted { $0.startTime < $1.startTime }
    }
    
    public func courses(for weekday: WeekDay) -> [Course] {
        return courses(for: weekday.rawValue)
    }
    
    public func courses(for date: Date) -> [Course] {
        let weekday = WeekDay.from(date: date)
        return courses(for: weekday.rawValue)
    }
    
    public func activeCourses() -> [Course] {
        return courses
    }
    
    /// 取得目前選取好友在指定星期的課程（供「好友課表折疊匣」獨立顯示，不覆蓋本機課表）
    public func friendCourses(for dayOfWeek: Int) -> [Course] {
        guard let friendCourses = friendSchedule?.coursesData else { return [] }
        return friendCourses.filter { $0.dayOfWeek == dayOfWeek && $0.isSharedWithFriends }
            .sorted { $0.startTime < $1.startTime }
    }
    
    public func friendCourses(for weekday: WeekDay) -> [Course] {
        return friendCourses(for: weekday.rawValue)
    }
    
    // MARK: - 智慧課表時間自動修正與 Gemini OCR 批次匯入
    
    /// 自動根據最新節次作息時間表，修正並對齊所有現有課程的開始與結束時間（回傳修正的課程數量）
    @discardableResult
    public func autoCorrectAllCourseTimes(previousPeriods: [ClassPeriod]? = nil) -> Int {
        var correctedCount = 0
        var updatedCourses: [Course] = []
        
        for var course in courses {
            let result = PeriodScheduleManager.shared.calibrateCourseTime(
                rawStartTime: course.startTime,
                rawEndTime: course.endTime,
                explicitPeriodIds: [],
                referencePeriods: previousPeriods
            )
            if result.startTime != course.startTime || result.endTime != course.endTime {
                course.startTime = result.startTime
                course.endTime = result.endTime
                correctedCount += 1
                if SupabaseConfig.shared.isConfigured {
                    let courseToSync = course
                    Task { await syncCourseToCloud(courseToSync, isNew: false) }
                }
            }
            updatedCourses.append(course)
        }
        
        if correctedCount > 0 {
            self.courses = updatedCourses.sorted { $0.startTime < $1.startTime }
            saveCoursesToLocal()
        }
        return correctedCount
    }
    
    /// 將 Gemini OCR 辨識並校正後的課程批次匯入課表系統
    public func importOCRCourses(_ importedCourses: [Course], replaceExisting: Bool) {
        guard !importedCourses.isEmpty else { return }
        
        let preparedCourses: [Course] = importedCourses.map { c in
            var copy = c
            copy.deviceId = self.deviceId
            return copy
        }
        
        if replaceExisting {
            let oldCourseIds = self.courses.map { $0.id }
            self.courses = preparedCourses.sorted { $0.startTime < $1.startTime }
            saveCoursesToLocal()
            
            if SupabaseConfig.shared.isConfigured {
                Task {
                    for oldId in oldCourseIds {
                        await deleteCourseFromCloud(id: oldId)
                    }
                    for newCourse in preparedCourses {
                        await syncCourseToCloud(newCourse, isNew: true)
                    }
                }
            }
        } else {
            var merged = self.courses
            var newlyAdded: [Course] = []
            var updatedExisting: [Course] = []
            
            for newCourse in preparedCourses {
                // 若同一天已有同名或同起訖時間的課程，則更新該課程；否則新增
                if let existingIdx = merged.firstIndex(where: {
                    $0.dayOfWeek == newCourse.dayOfWeek &&
                    ($0.name == newCourse.name || ($0.startTime == newCourse.startTime && $0.endTime == newCourse.endTime))
                }) {
                    var updated = merged[existingIdx]
                    updated.name = newCourse.name
                    if !newCourse.code.isEmpty { updated.code = newCourse.code }
                    if !newCourse.classroom.isEmpty { updated.classroom = newCourse.classroom }
                    if !newCourse.instructor.isEmpty { updated.instructor = newCourse.instructor }
                    updated.startTime = newCourse.startTime
                    updated.endTime = newCourse.endTime
                    updated.colorHex = newCourse.colorHex
                    merged[existingIdx] = updated
                    updatedExisting.append(updated)
                } else {
                    merged.append(newCourse)
                    newlyAdded.append(newCourse)
                }
            }
            
            self.courses = merged.sorted { $0.startTime < $1.startTime }
            saveCoursesToLocal()
            
            if SupabaseConfig.shared.isConfigured {
                Task {
                    for c in newlyAdded {
                        await syncCourseToCloud(c, isNew: true)
                    }
                    for c in updatedExisting {
                        await syncCourseToCloud(c, isNew: false)
                    }
                }
            }
        }
    }
    
    // MARK: - 待辦事項操作 (Todo CRUD)
    public func addTodo(_ todo: TodoItem) {
        var todo = todo
        todo.deviceId = self.deviceId
        todos.append(todo)
        todos.sort { ($0.dueDate ?? Date.distantFuture) < ($1.dueDate ?? Date.distantFuture) }
        saveTodosToLocal()
        scheduleTodoReminder(for: todo)
        if SupabaseConfig.shared.isConfigured {
            Task { await syncTodoToCloud(todo, isNew: true) }
        }
    }
    
    public func updateTodo(_ todo: TodoItem) {
        var todo = todo
        todo.deviceId = self.deviceId
        if let index = todos.firstIndex(where: { $0.id == todo.id }) {
            todos[index] = todo
            saveTodosToLocal()
            scheduleTodoReminder(for: todo)
            if SupabaseConfig.shared.isConfigured {
                Task { await syncTodoToCloud(todo, isNew: false) }
            }
        }
    }
    
    public func toggleTodoCompletion(id: UUID) {
        if let index = todos.firstIndex(where: { $0.id == id }) {
            todos[index].isCompleted.toggle()
            if todos[index].isCompleted {
                todos[index].completedAt = Date()
            } else {
                todos[index].completedAt = nil
            }
            let updated = todos[index]
            saveTodosToLocal()
            if updated.isCompleted {
                cancelTodoReminder(for: id)
            } else {
                scheduleTodoReminder(for: updated)
            }
            if SupabaseConfig.shared.isConfigured {
                Task { await syncTodoToCloud(updated, isNew: false) }
            }
        }
    }
    
    public func toggleTodoCompletion(_ todo: TodoItem) {
        toggleTodoCompletion(id: todo.id)
    }
    
    public func deleteTodo(id: UUID) {
        cancelTodoReminder(for: id)
        todos.removeAll { $0.id == id }
        saveTodosToLocal()
        if SupabaseConfig.shared.isConfigured {
            Task { await deleteTodoFromCloud(id: id) }
        }
    }
    
    public func deleteTodo(_ todo: TodoItem) {
        deleteTodo(id: todo.id)
    }
    
    public func todos(for date: Date) -> [TodoItem] {
        let calendar = Calendar.current
        let targetDayStart = calendar.startOfDay(for: date)
        guard let targetDayEnd = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: date) else {
            return []
        }
        return todos.filter { todo in
            if let start = todo.startDate, let due = todo.dueDate {
                let s = calendar.startOfDay(for: start)
                let d = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: due) ?? due
                return targetDayStart <= d && targetDayEnd >= s
            } else if let dueDate = todo.dueDate {
                return calendar.isDate(dueDate, inSameDayAs: date)
            }
            return false
        }
    }
    
    public func thisWeekTodos() -> [TodoItem] {
        let calendar = Calendar.current
        let today = Date()
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: today) else {
            return todos
        }
        return todos.filter { todo in
            if let start = todo.startDate, let due = todo.dueDate {
                let s = calendar.startOfDay(for: start)
                let d = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: due) ?? due
                return !(d < weekInterval.start || s > weekInterval.end)
            } else if let dueDate = todo.dueDate {
                return dueDate >= weekInterval.start && dueDate <= weekInterval.end
            }
            return false
        }.sorted { ($0.dueDate ?? Date.distantFuture) < ($1.dueDate ?? Date.distantFuture) }
    }
    
    public func hasEvents(on date: Date) -> (hasCourse: Bool, hasTodo: Bool) {
        let hasCourse = !courses(for: date).isEmpty
        let hasTodo = !todos(for: date).isEmpty
        return (hasCourse, hasTodo)
    }
    
    // MARK: - LINE Bot 晨報資料彙整與即時發送
    public func fetchBriefingData(for date: Date = Date()) -> (
        todayCourses: [Course],
        todayTodos: [TodoItem],
        weekTodos: [TodoItem],
        weeklyRemainingCoursesCount: Int
    ) {
        let todayCoursesList = courses(for: date)
        
        // 今日到期或處於自訂週期且未完成待辦
        let todayTodosList = todos(for: date).filter { !$0.isCompleted }
        
        // 本週所有未完成待辦
        let weekTodosList = thisWeekTodos().filter { !$0.isCompleted }
        
        // 本週後續剩餘課堂數 (從今日含之後算起)
        let currentWeekday = WeekDay.from(date: date).rawValue
        let remainingCourses = courses.filter { course in
            course.dayOfWeek >= currentWeekday
        }
        
        return (todayCoursesList, todayTodosList, weekTodosList, remainingCourses.count)
    }
    
    public func sendLineBriefingNow() async throws {
        let briefing = fetchBriefingData(for: Date())
        try await LineBotService.shared.sendBriefingPush(
            date: Date(),
            todayCourses: briefing.todayCourses,
            todayTodos: briefing.todayTodos,
            weekTodos: briefing.weekTodos,
            weeklyRemainingCoursesCount: briefing.weeklyRemainingCoursesCount
        )
    }
    
    // MARK: - 記帳交易操作 (Transactions CRUD)
    public func addTransaction(_ item: TransactionItem) {
        transactions.insert(item, at: 0)
        transactions.sort { $0.date > $1.date }
        saveTransactionsToLocal()
        if SupabaseConfig.shared.isConfigured {
            Task { await syncTransactionToCloud(item, isNew: true) }
        }
    }
    
    public func updateTransaction(_ item: TransactionItem) {
        if let index = transactions.firstIndex(where: { $0.id == item.id }) {
            transactions[index] = item
            transactions.sort { $0.date > $1.date }
            saveTransactionsToLocal()
            if SupabaseConfig.shared.isConfigured {
                Task { await syncTransactionToCloud(item, isNew: false) }
            }
        }
    }
    
    public func deleteTransaction(id: UUID) {
        transactions.removeAll { $0.id == id }
        saveTransactionsToLocal()
        if SupabaseConfig.shared.isConfigured {
            Task { await deleteTransactionFromCloud(id: id) }
        }
    }
    
    public func quickRecordExpense(
        amount: Double,
        categoryName: String,
        icon: String,
        colorHex: String,
        notes: String = "",
        paymentMethod: String = "現金"
    ) {
        let item = TransactionItem(
            amount: amount,
            type: .expense,
            categoryName: categoryName,
            categoryIcon: icon,
            categoryColorHex: colorHex,
            paymentMethodName: paymentMethod,
            date: Date(),
            notes: notes
        )
        addTransaction(item)
    }
    
    public func quickRecordFoodExpense(
        mealType: FoodMealType,
        amount: Double,
        notes: String = "",
        paymentMethod: String = "現金",
        score: Int = 8
    ) {
        let item = TransactionItem(
            amount: amount,
            type: .expense,
            categoryName: mealType.rawValue,
            categoryIcon: mealType.iconName,
            categoryColorHex: mealType.colorHex,
            paymentMethodName: paymentMethod,
            date: Date(),
            notes: notes.isEmpty ? mealType.rawValue : notes,
            valueScore: score
        )
        addTransaction(item)
    }
    
    // MARK: - 自訂類別操作
    public func addCategory(_ cat: AccountingCategory) {
        categories.append(cat)
        saveCategoriesToLocal()
    }
    
    public func deleteCategory(id: UUID) {
        categories.removeAll { $0.id == id && !$0.isSystem }
        saveCategoriesToLocal()
    }
    
    // MARK: - 自訂支付方式操作
    public func addPaymentMethod(_ method: PaymentMethod) {
        paymentMethods.append(method)
        savePaymentMethodsToLocal()
    }
    
    public func deletePaymentMethod(id: UUID) {
        paymentMethods.removeAll { $0.id == id && !$0.isSystem }
        savePaymentMethodsToLocal()
    }
    
    // MARK: - 分期付款操作 (Installments CRUD)
    public func addInstallment(_ item: InstallmentItem) {
        installments.append(item)
        saveInstallmentsToLocal()
    }
    
    public func updateInstallment(_ item: InstallmentItem) {
        if let index = installments.firstIndex(where: { $0.id == item.id }) {
            installments[index] = item
            saveInstallmentsToLocal()
        }
    }
    
    public func deleteInstallment(id: UUID) {
        installments.removeAll { $0.id == id }
        saveInstallmentsToLocal()
    }
    
    public func payInstallmentPeriod(id: UUID) {
        guard let index = installments.firstIndex(where: { $0.id == id }) else { return }
        var inst = installments[index]
        if inst.paidPeriods < inst.totalPeriods {
            inst.paidPeriods += 1
            if inst.paidPeriods >= inst.totalPeriods {
                inst.isCompleted = true
            }
            installments[index] = inst
            saveInstallmentsToLocal()
            
            // 自動為本期產生一筆實質支出紀錄
            let item = TransactionItem(
                amount: inst.periodAmount,
                type: .expense,
                categoryName: inst.categoryName,
                categoryIcon: "creditcard.and.123",
                categoryColorHex: "#3B82F6",
                paymentMethodName: inst.paymentMethodName,
                date: Date(),
                notes: "分期繳納：\(inst.title) (第 \(inst.paidPeriods)/\(inst.totalPeriods) 期)",
                relatedInstallmentId: inst.id
            )
            addTransaction(item)
        }
    }
    
    // MARK: - 墊錢分帳操作 (Split Bills CRUD)
    public func addSplitBill(_ bill: SplitBill) {
        splitBills.insert(bill, at: 0)
        saveSplitBillsToLocal()
        
        // 我自己應付的部分列為我的實質支出
        if bill.myAmount > 0 {
            let item = TransactionItem(
                amount: bill.myAmount,
                type: .expense,
                categoryName: "餐飲美食",
                categoryIcon: "person.2.fill",
                categoryColorHex: "#F59E0B",
                paymentMethodName: "信用卡",
                date: bill.date,
                notes: "墊錢分帳自付額：\(bill.title)",
                relatedSplitBillId: bill.id
            )
            addTransaction(item)
        }
    }
    
    public func updateSplitBill(_ bill: SplitBill) {
        if let index = splitBills.firstIndex(where: { $0.id == bill.id }) {
            splitBills[index] = bill
            saveSplitBillsToLocal()
        }
    }
    
    public func deleteSplitBill(id: UUID) {
        splitBills.removeAll { $0.id == id }
        saveSplitBillsToLocal()
    }
    
    public func toggleMemberPaid(billId: UUID, memberId: UUID) {
        guard let billIndex = splitBills.firstIndex(where: { $0.id == billId }) else { return }
        if let memberIndex = splitBills[billIndex].members.firstIndex(where: { $0.id == memberId }) {
            splitBills[billIndex].members[memberIndex].isPaid.toggle()
            splitBills[billIndex].members[memberIndex].paidDate = splitBills[billIndex].members[memberIndex].isPaid ? Date() : nil
            splitBills[billIndex].isSettled = splitBills[billIndex].isAllMembersPaid
            saveSplitBillsToLocal()
        }
    }
    
    // MARK: - 每月固定收支操作 (Recurring Items CRUD)
    public func addRecurringItem(_ item: RecurringItem) {
        recurringItems.append(item)
        saveRecurringToLocal()
    }
    
    public func updateRecurringItem(_ item: RecurringItem) {
        if let index = recurringItems.firstIndex(where: { $0.id == item.id }) {
            recurringItems[index] = item
            saveRecurringToLocal()
        }
    }
    
    public func deleteRecurringItem(id: UUID) {
        recurringItems.removeAll { $0.id == id }
        saveRecurringToLocal()
    }
    
    public func applyRecurringItemNow(_ item: RecurringItem) {
        let tx = TransactionItem(
            amount: item.amount,
            type: item.type,
            categoryName: item.categoryName,
            categoryIcon: item.categoryIcon,
            categoryColorHex: item.categoryColorHex,
            paymentMethodName: item.paymentMethodName,
            date: Date(),
            notes: "每月固定\(item.type == .income ? "收入" : "支出")：\(item.title)",
            valueScore: item.type == .income ? 10 : 8
        )
        addTransaction(tx)
    }
    
    // MARK: - 統計與摘要計算 (Analytics & KPIs - 讀取極致快取)
    public var todayExpense: Double {
        cachedTodayExpense
    }
    
    public var todayRationalScore: Double? {
        cachedTodayRationalScore
    }
    
    public var thisMonthExpense: Double {
        cachedThisMonthExpense
    }
    
    public var thisMonthIncome: Double {
        cachedThisMonthIncome
    }
    
    public var thisMonthBalance: Double {
        cachedThisMonthBalance
    }
    
    public var monthRationalScore: Double? {
        cachedMonthRationalScore
    }
    
    public var totalPendingSplitAmount: Double {
        splitBills.filter { !$0.isSettled }.reduce(0) { $0 + $1.pendingCollectionAmount }
    }
    
    /// 多維度統計計算 (週 / 月 / 年)
    public func stats(for date: Date, range: StatsRange) -> AccountingPeriodStats {
        let calendar = Calendar.current
        var filtered: [TransactionItem] = []
        var daysCount: Int = 1
        
        switch range {
        case .weekly:
            guard let interval = calendar.dateInterval(of: .weekOfYear, for: date) else { break }
            filtered = transactions.filter { $0.date >= interval.start && $0.date <= interval.end }
            daysCount = 7
        case .monthly:
            guard let interval = calendar.dateInterval(of: .month, for: date) else { break }
            filtered = transactions.filter { $0.date >= interval.start && $0.date <= interval.end }
            let rangeOfDays = calendar.range(of: .day, in: .month, for: date)
            daysCount = rangeOfDays?.count ?? 30
        case .yearly:
            guard let interval = calendar.dateInterval(of: .year, for: date) else { break }
            filtered = transactions.filter { $0.date >= interval.start && $0.date <= interval.end }
            daysCount = 365
        }
        
        let expenses = filtered.filter { $0.type == .expense }
        let incomes = filtered.filter { $0.type == .income }
        
        let totalExpense = expenses.reduce(0) { $0 + $1.amount }
        let totalIncome = incomes.reduce(0) { $0 + $1.amount }
        let dailyAverage = totalExpense / Double(max(1, daysCount))
        
        // 理性消費平均分
        let scoredExpenses = expenses.filter { $0.valueScore > 0 }
        let avgRationalScore: Double = scoredExpenses.isEmpty ? 8.0 : (Double(scoredExpenses.reduce(0) { $0 + $1.valueScore }) / Double(scoredExpenses.count))
        
        // 支出分類聚合
        var expenseCategoryMap: [String: (amount: Double, icon: String, color: String)] = [:]
        for item in expenses {
            let curr = expenseCategoryMap[item.categoryName] ?? (0, item.categoryIcon, item.categoryColorHex)
            expenseCategoryMap[item.categoryName] = (curr.amount + item.amount, curr.icon, curr.color)
        }
        let expenseSummaries = expenseCategoryMap.map { key, val in
            CategoryExpenseSummary(
                name: key,
                iconName: val.icon,
                colorHex: val.color,
                amount: val.amount,
                percentage: totalExpense > 0 ? (val.amount / totalExpense) : 0
            )
        }.sorted { $0.amount > $1.amount }
        
        // 收入分類聚合
        var incomeCategoryMap: [String: (amount: Double, icon: String, color: String)] = [:]
        for item in incomes {
            let curr = incomeCategoryMap[item.categoryName] ?? (0, item.categoryIcon, item.categoryColorHex)
            incomeCategoryMap[item.categoryName] = (curr.amount + item.amount, curr.icon, curr.color)
        }
        let incomeSummaries = incomeCategoryMap.map { key, val in
            CategoryExpenseSummary(
                name: key,
                iconName: val.icon,
                colorHex: val.color,
                amount: val.amount,
                percentage: totalIncome > 0 ? (val.amount / totalIncome) : 0
            )
        }.sorted { $0.amount > $1.amount }
        
        // 支付方式聚合
        var paymentMap: [String: Double] = [:]
        for item in expenses {
            paymentMap[item.paymentMethodName, default: 0] += item.amount
        }
        let paymentSummaries = paymentMap.map { key, val in
            let icon = paymentMethods.first(where: { $0.name == key })?.iconName ?? "creditcard.fill"
            return PaymentMethodSummary(
                name: key,
                iconName: icon,
                amount: val,
                percentage: totalExpense > 0 ? (val / totalExpense) : 0
            )
        }.sorted { $0.amount > $1.amount }
        
        return AccountingPeriodStats(
            totalIncome: totalIncome,
            totalExpense: totalExpense,
            dailyAverageExpense: dailyAverage,
            averageRationalScore: avgRationalScore,
            expenseByCategory: expenseSummaries,
            incomeByCategory: incomeSummaries,
            paymentMethodBreakdown: paymentSummaries,
            transactionCount: filtered.count
        )
    }
    
    // MARK: - 課表分享 (支援 shared_schedules 與 line_bot_settings 雲端雙通道自動備援，免手動建表即可分享)
    
    private struct ShareFallbackMeta: Codable {
        var isSharingEnabled: Bool
        var isExpenseSharingEnabled: Bool
        var accountingData: [TransactionItem]
    }
    
    @MainActor
    public func publishMySchedule() async {
        guard SupabaseConfig.shared.isConfigured else {
            shareSyncMessage = "請先完成 Supabase 連線設定"
            return
        }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        
        let sharedCourses = courses.filter { $0.isSharedWithFriends }
        let sharedTodos = todos.filter { $0.isSharedWithFriends }
        let sharedExpenses = transactions.filter { $0.isSharedWithFriends }
        let nowDate = Date()
        let nowIso = ISO8601DateFormatter().string(from: nowDate)
        
        let payload = SharedSchedule(
            shareCode: myShareCode,
            ownerName: myShareName,
            isSharingEnabled: isMySharingEnabled,
            coursesData: sharedCourses,
            todosData: sharedTodos,
            accountingData: sharedExpenses,
            isExpenseSharingEnabled: isSharingTodayExpense,
            updatedAt: nowDate
        )
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        
        let coursesJson = (try? encoder.encode(sharedCourses)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? []
        let todosJson = (try? encoder.encode(sharedTodos)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? []
        
        var isSuccess = false
        
        // 通道 1：嘗試寫入標準 shared_schedules 表格 (完整欄位)
        if let url = URL(string: "\(baseURL)/rest/v1/shared_schedules?on_conflict=share_code") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
            req.httpBody = try? encoder.encode(payload)
            
            if let (_, response) = try? await URLSession.shared.data(for: req),
               let httpRes = response as? HTTPURLResponse {
                if (200...299).contains(httpRes.statusCode) {
                    isSuccess = true
                } else if httpRes.statusCode == 400 {
                    // 若使用者的 shared_schedules 表格為舊版結構（缺少 accounting_data 等新欄位），自動降級寫入核心欄位
                    let legacyBody: [String: Any] = [
                        "share_code": myShareCode,
                        "owner_name": myShareName,
                        "is_sharing_enabled": isMySharingEnabled,
                        "courses_data": coursesJson,
                        "updated_at": nowIso
                    ]
                    req.httpBody = try? JSONSerialization.data(withJSONObject: legacyBody)
                    if let (_, retryRes) = try? await URLSession.shared.data(for: req),
                       let retryHttp = retryRes as? HTTPURLResponse,
                       (200...299).contains(retryHttp.statusCode) {
                        isSuccess = true
                    }
                }
            }
        }
        
        // 通道 2：同步寫入已存在的 line_bot_settings 雲端表 (以 SHARE_<代碼> 作為獨立分享紀錄，免額外建立 shared_schedules 表格也能跨裝置分享課表、待辦與記帳！)
        if let fallbackURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?on_conflict=user_id") {
            let meta = ShareFallbackMeta(
                isSharingEnabled: isMySharingEnabled,
                isExpenseSharingEnabled: isSharingTodayExpense,
                accountingData: sharedExpenses
            )
            let metaJsonString: String = {
                guard let data = try? encoder.encode(meta),
                      let str = String(data: data, encoding: .utf8) else { return "" }
                return str
            }()
            
            let fallbackBody: [String: Any] = [
                "user_id": "SHARE_\(myShareCode)",
                "device_id": metaJsonString,
                "user_name": myShareName,
                "share_code": myShareCode,
                "channel_access_token": "SHARE_RECORD",
                "is_enabled": false,
                "push_hour": 7,
                "push_minute": 0,
                "courses_data": coursesJson,
                "todos_data": todosJson,
                "last_sent_date": "",
                "updated_at": nowIso
            ]
            
            var req = URLRequest(url: fallbackURL)
            req.httpMethod = "POST"
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
            req.httpBody = try? JSONSerialization.data(withJSONObject: fallbackBody)
            
            if let (_, response) = try? await URLSession.shared.data(for: req),
               let httpRes = response as? HTTPURLResponse,
               (200...299).contains(httpRes.statusCode) {
                isSuccess = true
            }
        }
        
        // 同步更新自己的 LINE 雲端排程快照
        Task {
            await LineBotService.shared.syncSettingsToSupabase()
        }
        
        if isSuccess {
            shareSyncMessage = "課表、待辦與記帳已成功發布分享！代碼：\(myShareCode)"
            friendAccountingMessage = "記帳與消費明細已同步至雲端！"
        } else {
            shareSyncMessage = "發布失敗，請檢查網路連線或 Supabase 設定"
        }
    }
    
    @MainActor
    public func publishMyAccounting() async {
        await publishMySchedule()
    }
    
    @MainActor
    public func toggleExpenseSharing(isEnabled: Bool) async {
        self.isSharingTodayExpense = isEnabled
        UserDefaults.standard.set(isEnabled, forKey: "campus_share_today_expense")
        await publishMySchedule()
    }
    
    @MainActor
    public func toggleSharing(isEnabled: Bool) async {
        self.isMySharingEnabled = isEnabled
        UserDefaults.standard.set(isEnabled, forKey: "campus_my_sharing_enabled")
        await publishMySchedule()
    }
    
    public struct CampusError: LocalizedError {
        public var errorDescription: String?
        public init(_ description: String) {
            self.errorDescription = description
        }
    }
    
    /// 從雲端讀取指定 6 碼分享代碼的課表（自動同時查詢 shared_schedules 與 line_bot_settings 備援通道）
    @MainActor
    private func fetchSharedScheduleFromCloud(shareCode: String) async throws -> SharedSchedule? {
        let code = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        let decoder = JSONDecoder.robustDecoder
        
        var primaryResult: SharedSchedule? = nil
        
        // 1. 優先嘗試從 shared_schedules 讀取
        if let url = URL(string: "\(baseURL)/rest/v1/shared_schedules?share_code=eq.\(code)&select=*") {
            var req = URLRequest(url: url)
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            if let (data, response) = try? await URLSession.shared.data(for: req),
               let httpRes = response as? HTTPURLResponse,
               (200...299).contains(httpRes.statusCode),
               let results = try? decoder.decode([SharedSchedule].self, from: data),
               let first = results.first {
                primaryResult = first
            }
        }
        
        // 2. 查詢 line_bot_settings 備援通道（支援未建立 shared_schedules 表格的環境）
        if let fallbackURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?share_code=eq.\(code)&select=*") {
            var req = URLRequest(url: fallbackURL)
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            if let (data, response) = try? await URLSession.shared.data(for: req),
               let httpRes = response as? HTTPURLResponse,
               (200...299).contains(httpRes.statusCode),
               let profiles = try? decoder.decode([LineBotUserProfile].self, from: data),
               !profiles.isEmpty {
                // 優先挑選專用 SHARE_<代碼> 紀錄，若無則取一般使用者紀錄
                let chosen = profiles.first(where: { $0.userId == "SHARE_\(code)" }) ?? profiles.first!
                
                var isSharing = true
                var isExpenseSharing = true
                var accData: [TransactionItem] = []
                
                if !chosen.deviceId.isEmpty,
                   let metaData = chosen.deviceId.data(using: .utf8),
                   let meta = try? decoder.decode(ShareFallbackMeta.self, from: metaData) {
                    isSharing = meta.isSharingEnabled
                    isExpenseSharing = meta.isExpenseSharingEnabled
                    accData = meta.accountingData
                }
                
                let fallbackSchedule = SharedSchedule(
                    shareCode: code,
                    ownerName: chosen.userName.isEmpty ? "好友的課表" : chosen.userName,
                    isSharingEnabled: isSharing,
                    coursesData: chosen.coursesData ?? [],
                    todosData: chosen.todosData ?? [],
                    accountingData: accData,
                    isExpenseSharingEnabled: isExpenseSharing,
                    updatedAt: Date()
                )
                
                if var existing = primaryResult {
                    if existing.todosData.isEmpty && !fallbackSchedule.todosData.isEmpty {
                        existing.todosData = fallbackSchedule.todosData
                    }
                    if existing.accountingData.isEmpty && !fallbackSchedule.accountingData.isEmpty {
                        existing.accountingData = fallbackSchedule.accountingData
                    }
                    return existing
                } else {
                    return fallbackSchedule
                }
            }
        }
        
        return primaryResult
    }

    // MARK: - 好友分享記錄簿管理 (課表與記帳共用，免每次重複輸入 6 碼代碼)
    private func saveFriendsBookToLocal() {
        if let data = try? JSONEncoder().encode(savedFriends) {
            UserDefaults.standard.set(data, forKey: savedFriendsLocalKey)
        }
    }
    
    @MainActor
    public func upsertSavedFriend(from schedule: SharedSchedule, customNickname: String? = nil) {
        let code = schedule.shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !code.isEmpty else { return }
        
        if let idx = savedFriends.firstIndex(where: { $0.shareCode == code }) {
            var existing = savedFriends[idx]
            existing.ownerName = schedule.ownerName
            if let nick = customNickname?.trimmingCharacters(in: .whitespacesAndNewlines), !nick.isEmpty {
                existing.nickname = nick
            }
            existing.coursesCount = schedule.coursesData.filter { $0.isSharedWithFriends }.count
            existing.accountingCount = schedule.accountingData.filter { $0.isSharedWithFriends }.count
            existing.lastViewedAt = Date()
            existing.cachedSchedule = schedule
            savedFriends.remove(at: idx)
            savedFriends.insert(existing, at: 0)
        } else {
            let record = SavedFriendRecord(
                shareCode: code,
                ownerName: schedule.ownerName,
                nickname: customNickname?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "",
                coursesCount: schedule.coursesData.filter { $0.isSharedWithFriends }.count,
                accountingCount: schedule.accountingData.filter { $0.isSharedWithFriends }.count,
                lastViewedAt: Date(),
                cachedSchedule: schedule
            )
            savedFriends.insert(record, at: 0)
        }
        saveFriendsBookToLocal()
    }
    
    @MainActor
    public func updateSavedFriendNickname(shareCode: String, nickname: String) {
        let code = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if let idx = savedFriends.firstIndex(where: { $0.shareCode == code }) {
            savedFriends[idx].nickname = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
            saveFriendsBookToLocal()
        }
    }
    
    @MainActor
    public func removeSavedFriend(shareCode: String) {
        let code = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        savedFriends.removeAll { $0.shareCode == code }
        saveFriendsBookToLocal()
    }
    
    /// 從好友記錄簿一鍵選取好友並顯示於「好友課表折疊匣」（先秒開快取，同時背景刷新雲端最新課表）
    @MainActor
    public func selectSavedFriendForSchedule(_ record: SavedFriendRecord) {
        if let cached = record.cachedSchedule {
            self.friendSchedule = cached
            self.isViewingFriend = true
            self.isFriendScheduleExpanded = true
        }
        Task {
            _ = await loadFriendSchedule(shareCode: record.shareCode, customNickname: record.nickname)
        }
    }
    
    /// 從好友記錄簿一鍵選取好友並顯示於「好友記帳折疊匣」（先秒開快取，同時背景刷新雲端最新記帳）
    @MainActor
    public func selectSavedFriendForAccounting(_ record: SavedFriendRecord) {
        if let cached = record.cachedSchedule {
            self.friendAccounting = cached
            self.isViewingFriendAccounting = true
            self.isFriendAccountingExpanded = true
        }
        Task {
            _ = await loadFriendAccounting(shareCode: record.shareCode, customNickname: record.nickname)
        }
    }

    @MainActor
    public func loadFriendSchedule(shareCode: String, customNickname: String? = nil) async -> Result<SharedSchedule, CampusError> {
        let code = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !code.isEmpty else { return .failure(CampusError("請輸入有效的 6 位分享代碼")) }
        
        guard SupabaseConfig.shared.isConfigured else {
            return .failure(CampusError("請先在設定中連線 Supabase"))
        }
        
        do {
            if let found = try await fetchSharedScheduleFromCloud(shareCode: code) {
                if !found.isSharingEnabled {
                    return .failure(CampusError("對方已設定為「不分享」"))
                }
                self.friendSchedule = found
                self.friendAccounting = found
                self.isViewingFriend = true
                self.isFriendScheduleExpanded = true
                self.upsertSavedFriend(from: found, customNickname: customNickname)
                return .success(found)
            } else {
                return .failure(CampusError("找不到此代碼的課表，請確認對方已點選「發布／更新雲端分享」"))
            }
        } catch {
            return .failure(CampusError("載入失敗：\(error.localizedDescription)"))
        }
    }
    
    public func exitFriendView() {
        self.isViewingFriend = false
        self.isFriendScheduleExpanded = false
    }
    
    // MARK: - 好友記帳載入與互評 (Peer Accounting Reviews)
    @MainActor
    public func loadFriendAccounting(shareCode: String, customNickname: String? = nil) async -> Result<SharedSchedule, CampusError> {
        let code = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !code.isEmpty else { return .failure(CampusError("請輸入有效的 6 位好友代碼")) }
        
        guard SupabaseConfig.shared.isConfigured else {
            return .failure(CampusError("請先在設定中連線 Supabase"))
        }
        
        do {
            if let found = try await fetchSharedScheduleFromCloud(shareCode: code) {
                if !found.isExpenseSharingEnabled {
                    return .failure(CampusError("對方目前已關閉記帳分享功能"))
                }
                self.friendAccounting = found
                self.friendSchedule = found
                self.isViewingFriendAccounting = true
                self.isFriendAccountingExpanded = true
                self.friendAccountingMessage = "已成功載入 \(found.ownerName) 的記帳狀況並存入好友記錄簿！"
                self.upsertSavedFriend(from: found, customNickname: customNickname)
                return .success(found)
            } else {
                return .failure(CampusError("找不到此代碼的記帳紀錄，請確認代碼是否正確"))
            }
        } catch {
            return .failure(CampusError("載入失敗：\(error.localizedDescription)"))
        }
    }
    
    public func exitFriendAccountingView() {
        self.isViewingFriendAccounting = false
        self.isFriendAccountingExpanded = false
    }
    
    public var lastAutoUploadAccountingString: String {
        guard let date = lastAutoUploadAccountingDate else {
            return "尚未自動上傳（將於排程時段自動執行）"
        }
        let df = DateFormatter()
        df.locale = Locale(identifier: "zh_Hant_TW")
        df.dateFormat = "MM/dd HH:mm"
        return df.string(from: date)
    }
    
    // MARK: - 記帳內容每日定時自動上傳 (預設每天 13:30 下午 1:30 與 22:30 晚上 10:30 各自動上傳一次)
    public func startAccountingAutoUploadScheduler() {
        accountingUploadTimer?.invalidate()
        accountingUploadTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { _ in
            Task { @MainActor in
                DataManager.shared.checkAndTriggerAutoAccountingUploadIfNeeded()
            }
        }
        checkAndTriggerAutoAccountingUploadIfNeeded()
    }
    
    private static func todayDateKey(for date: Date = Date()) -> String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.timeZone = TimeZone(identifier: "Asia/Taipei") ?? .current
        df.dateFormat = "yyyy-MM-dd"
        return df.string(from: date)
    }
    
    @MainActor
    public func checkAndTriggerAutoAccountingUploadIfNeeded() {
        guard isAutoUploadAccountingEnabled, SupabaseConfig.shared.isConfigured, !isUploadingAccounting else { return }
        
        let cal = Calendar.current
        let now = Date()
        let todayStr = Self.todayDateKey(for: now)
        let currentHour = cal.component(.hour, from: now)
        let currentMinute = cal.component(.minute, from: now)
        
        let lastSlot1Date = UserDefaults.standard.string(forKey: "campus_auto_upload_slot1_last_date") ?? ""
        let lastSlot2Date = UserDefaults.standard.string(forKey: "campus_auto_upload_slot2_last_date") ?? ""
        
        let isPastSlot1 = (currentHour > autoUploadSlot1Hour) || (currentHour == autoUploadSlot1Hour && currentMinute >= autoUploadSlot1Minute)
        let isPastSlot2 = (currentHour > autoUploadSlot2Hour) || (currentHour == autoUploadSlot2Hour && currentMinute >= autoUploadSlot2Minute)
        
        if isPastSlot2 && lastSlot2Date != todayStr {
            UserDefaults.standard.set(todayStr, forKey: "campus_auto_upload_slot2_last_date")
            if isPastSlot1 {
                UserDefaults.standard.set(todayStr, forKey: "campus_auto_upload_slot1_last_date")
            }
            Task {
                await uploadAllAccountingContentNow(reason: String(format: "每日 %02d:%02d 自動上傳", autoUploadSlot2Hour, autoUploadSlot2Minute))
            }
        } else if isPastSlot1 && lastSlot1Date != todayStr {
            UserDefaults.standard.set(todayStr, forKey: "campus_auto_upload_slot1_last_date")
            Task {
                await uploadAllAccountingContentNow(reason: String(format: "每日 %02d:%02d 自動上傳", autoUploadSlot1Hour, autoUploadSlot1Minute))
            }
        }
    }
    
    /// 完整上傳所有記帳明細與好友共用記帳快照至雲端
    @MainActor
    public func uploadAllAccountingContentNow(reason: String = "手動上傳") async {
        guard SupabaseConfig.shared.isConfigured else { return }
        isUploadingAccounting = true
        defer { isUploadingAccounting = false }
        
        // 1. 單次批次同步近期記帳交易至 accounting_transactions (取代 50 次逐筆序列請求，大幅降低主執行緒與網路負載)
        let recentTx = Array(transactions.prefix(50))
        if !recentTx.isEmpty {
            let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let anonKey = SupabaseConfig.shared.anonPublicKey
            if let batchURL = URL(string: "\(baseURL)/rest/v1/accounting_transactions?on_conflict=id") {
                var request = URLRequest(url: batchURL)
                request.httpMethod = "POST"
                request.setValue(anonKey, forHTTPHeaderField: "apikey")
                request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
                let encoder = JSONEncoder()
                encoder.dateEncodingStrategy = .iso8601
                request.httpBody = try? encoder.encode(recentTx)
                _ = try? await URLSession.shared.data(for: request)
            }
        }
        
        // 2. 發布最新記帳與課表至雙通道雲端 (shared_schedules + line_bot_settings SHARE_<代碼>)
        await publishMySchedule()
        
        let now = Date()
        self.lastAutoUploadAccountingDate = now
        UserDefaults.standard.set(now, forKey: "campus_last_auto_upload_accounting_date")
        self.friendAccountingMessage = "✅ 已完成記帳雲端上傳（\(reason)）"
    }
    
    public func scheduleAutoAccountingUploadNotifications() {
        let center = UNUserNotificationCenter.current()
        let ids = ["campus_accounting_auto_upload_slot1", "campus_accounting_auto_upload_slot2"]
        center.removePendingNotificationRequests(withIdentifiers: ids)
        
        guard isAutoUploadAccountingEnabled else { return }
        
        let slots: [(id: String, hour: Int, minute: Int, label: String)] = [
            ("campus_accounting_auto_upload_slot1", autoUploadSlot1Hour, autoUploadSlot1Minute, "下午定時同步"),
            ("campus_accounting_auto_upload_slot2", autoUploadSlot2Hour, autoUploadSlot2Minute, "晚間定時同步")
        ]
        
        for slot in slots {
            let content = UNMutableNotificationContent()
            content.title = String(format: "可樂記帳本・%02d:%02d 自動雲端備份", slot.hour, slot.minute)
            content.body = "今日記帳內容已排程自動上傳至雲端並更新好友分享！"
            content.sound = .default
            
            var comp = DateComponents()
            comp.hour = slot.hour
            comp.minute = slot.minute
            let trigger = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
            let req = UNNotificationRequest(identifier: slot.id, content: content, trigger: trigger)
            center.add(req, withCompletionHandler: nil)
        }
    }
    
    @MainActor
    public func submitPeerRating(targetShareCode: String, transactionId: UUID, rating: Double, feedback: String) async -> Bool {
        // 1. 本地若是檢視好友，先即時更新好友資料快取
        if var friend = self.friendAccounting, friend.shareCode == targetShareCode {
            if let idx = friend.accountingData.firstIndex(where: { $0.id == transactionId }) {
                friend.accountingData[idx].peerRating = rating
                friend.accountingData[idx].peerFeedback = feedback
                self.friendAccounting = friend
            }
        }
        
        // 2. 若恰好是評審自己或本地的項目，也同步更新
        if let idx = transactions.firstIndex(where: { $0.id == transactionId }) {
            transactions[idx].peerRating = rating
            transactions[idx].peerFeedback = feedback
            saveTransactionsToLocal()
        }
        
        guard SupabaseConfig.shared.isConfigured else { return true }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        
        // 3. 更新 Supabase shared_schedules 與 line_bot_settings 備援通道中的 accounting_data
        if let friend = self.friendAccounting, friend.shareCode == targetShareCode {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            if let rawData = try? encoder.encode(friend.accountingData),
               let jsonArray = try? JSONSerialization.jsonObject(with: rawData) {
                if let scheduleURL = URL(string: "\(baseURL)/rest/v1/shared_schedules?share_code=eq.\(targetShareCode)") {
                    var req = URLRequest(url: scheduleURL)
                    req.httpMethod = "PATCH"
                    req.setValue(anonKey, forHTTPHeaderField: "apikey")
                    req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    let body: [String: Any] = [
                        "accounting_data": jsonArray,
                        "updated_at": ISO8601DateFormatter().string(from: Date())
                    ]
                    req.httpBody = try? JSONSerialization.data(withJSONObject: body)
                    _ = try? await URLSession.shared.data(for: req)
                }
            }
            
            if let fallbackURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?user_id=eq.SHARE_\(targetShareCode)") {
                let meta = ShareFallbackMeta(
                    isSharingEnabled: friend.isSharingEnabled,
                    isExpenseSharingEnabled: friend.isExpenseSharingEnabled,
                    accountingData: friend.accountingData
                )
                if let metaData = try? encoder.encode(meta),
                   let metaStr = String(data: metaData, encoding: .utf8) {
                    var req = URLRequest(url: fallbackURL)
                    req.httpMethod = "PATCH"
                    req.setValue(anonKey, forHTTPHeaderField: "apikey")
                    req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    let body: [String: Any] = [
                        "device_id": metaStr,
                        "updated_at": ISO8601DateFormatter().string(from: Date())
                    ]
                    req.httpBody = try? JSONSerialization.data(withJSONObject: body)
                    _ = try? await URLSession.shared.data(for: req)
                }
            }
        }
        
        // 4. 更新 Supabase accounting_transactions 表中的 peer_rating 與 peer_feedback
        if let txURL = URL(string: "\(baseURL)/rest/v1/accounting_transactions?id=eq.\(transactionId.uuidString.lowercased())") {
            var req = URLRequest(url: txURL)
            req.httpMethod = "PATCH"
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body: [String: Any] = [
                "peer_rating": rating,
                "peer_feedback": feedback
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
            _ = try? await URLSession.shared.data(for: req)
        }
        
        return true
    }
    
    // MARK: - Supabase REST API 實作
    @MainActor
    public func fetchFromSupabase() async {
        guard SupabaseConfig.shared.isConfigured else {
            loadLocalCoursesAndTodos()
            return
        }
        
        isLoading = true
        errorMessage = nil
        isUsingCloud = true
        
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        
        guard let coursesURL = URL(string: "\(baseURL)/rest/v1/courses?device_id=eq.\(deviceId)&select=*&order=start_time.asc"),
              let todosURL = URL(string: "\(baseURL)/rest/v1/todos?device_id=eq.\(deviceId)&select=*&order=due_date.asc") else {
            errorMessage = "Supabase URL 格式不正確"
            isLoading = false
            return
        }
        
        var reqCourses = URLRequest(url: coursesURL)
        reqCourses.setValue(anonKey, forHTTPHeaderField: "apikey")
        reqCourses.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        let requestCourses = reqCourses
        
        var reqTodos = URLRequest(url: todosURL)
        reqTodos.setValue(anonKey, forHTTPHeaderField: "apikey")
        reqTodos.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        let requestTodos = reqTodos
        
        let decoder = JSONDecoder.robustDecoder
        
        do {
            async let coursesFetch: [Course] = {
                let (data, res) = try await URLSession.shared.data(for: requestCourses)
                if let http = res as? HTTPURLResponse, !(200...299).contains(http.statusCode) { return [] }
                return (try? decoder.decode([Course].self, from: data)) ?? []
            }()
            
            async let todosFetch: [TodoItem] = {
                let (data, res) = try await URLSession.shared.data(for: requestTodos)
                if let http = res as? HTTPURLResponse, !(200...299).contains(http.statusCode) { return [] }
                return (try? decoder.decode([TodoItem].self, from: data)) ?? []
            }()
            
            let (fetchedCourses, fetchedTodos) = try await (coursesFetch, todosFetch)
            
            if !fetchedCourses.isEmpty {
                if self.courses != fetchedCourses {
                    self.courses = fetchedCourses
                    saveCoursesToLocal(syncCloudSettings: false)
                }
            } else if self.courses.isEmpty {
                self.courses = Self.defaultMockCourses()
                saveCoursesToLocal(syncCloudSettings: false)
            }
            
            if !fetchedTodos.isEmpty {
                if self.todos != fetchedTodos {
                    self.todos = fetchedTodos
                    saveTodosToLocal(syncCloudSettings: false)
                }
            } else if self.todos.isEmpty {
                self.todos = Self.defaultMockTodos(courseIds: self.courses.map { $0.id })
                saveTodosToLocal(syncCloudSettings: false)
            }
            
            // 嘗試拉取雲端記帳資料
            await fetchAccountingFromSupabase()
            
            self.isLoading = false
        } catch {
            self.errorMessage = "Supabase 雲端載入異常：\(error.localizedDescription)，已切換至本機快取。"
            self.isLoading = false
        }
    }
    
    @MainActor
    private func fetchAccountingFromSupabase() async {
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let url = URL(string: "\(baseURL)/rest/v1/accounting_transactions?device_id=eq.\(deviceId)&select=*&order=date.desc") else { return }
        
        var req = URLRequest(url: url)
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        
        let decoder = JSONDecoder.robustDecoder
        
        if let (data, res) = try? await URLSession.shared.data(for: req),
           let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode),
           let remoteTx = try? decoder.decode([TransactionItem].self, from: data), !remoteTx.isEmpty {
            if self.transactions != remoteTx {
                self.transactions = remoteTx
                saveTransactionsToLocal()
            }
        }
    }
    
    private func syncCourseToCloud(_ course: Course, isNew: Bool) async {
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        let endpoint = isNew ? "\(baseURL)/rest/v1/courses" : "\(baseURL)/rest/v1/courses?id=eq.\(course.id.uuidString)"
        guard let url = URL(string: endpoint) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = isNew ? "POST" : "PATCH"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if isNew { request.setValue("return=representation", forHTTPHeaderField: "Prefer") }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try? encoder.encode(course)
        _ = try? await URLSession.shared.data(for: request)
    }
    
    private func deleteCourseFromCloud(id: UUID) async {
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let url = URL(string: "\(baseURL)/rest/v1/courses?id=eq.\(id.uuidString)") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        _ = try? await URLSession.shared.data(for: request)
    }
    
    private func syncTodoToCloud(_ todo: TodoItem, isNew: Bool) async {
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        let endpoint = isNew ? "\(baseURL)/rest/v1/todos" : "\(baseURL)/rest/v1/todos?id=eq.\(todo.id.uuidString)"
        guard let url = URL(string: endpoint) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = isNew ? "POST" : "PATCH"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if isNew { request.setValue("return=representation", forHTTPHeaderField: "Prefer") }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try? encoder.encode(todo)
        _ = try? await URLSession.shared.data(for: request)
    }
    
    private func deleteTodoFromCloud(id: UUID) async {
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let url = URL(string: "\(baseURL)/rest/v1/todos?id=eq.\(id.uuidString)") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        _ = try? await URLSession.shared.data(for: request)
    }
    
    private func syncTransactionToCloud(_ tx: TransactionItem, isNew: Bool) async {
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        let endpoint = isNew ? "\(baseURL)/rest/v1/accounting_transactions" : "\(baseURL)/rest/v1/accounting_transactions?id=eq.\(tx.id.uuidString)"
        guard let url = URL(string: endpoint) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = isNew ? "POST" : "PATCH"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if isNew { request.setValue("return=representation", forHTTPHeaderField: "Prefer") }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try? encoder.encode(tx)
        _ = try? await URLSession.shared.data(for: request)
    }
    
    private func deleteTransactionFromCloud(id: UUID) async {
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let url = URL(string: "\(baseURL)/rest/v1/accounting_transactions?id=eq.\(id.uuidString)") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        _ = try? await URLSession.shared.data(for: request)
    }
    
    // MARK: - 預設假資料 (Default Mocks)
    private static func defaultMockCourses() -> [Course] {
        [
            Course(name: "計算機概論", code: "CS101", classroom: "工三館 101", instructor: "李教授", dayOfWeek: 1, startTime: "09:10", endTime: "12:00", colorHex: "#4F46E5"),
            Course(name: "微積分 (一)", code: "MATH201", classroom: "教學大樓 302", instructor: "王教授", dayOfWeek: 1, startTime: "13:20", endTime: "15:10", colorHex: "#0EA5E9"),
            Course(name: "資料結構", code: "CS202", classroom: "電資大樓 405", instructor: "張教授", dayOfWeek: 2, startTime: "10:10", endTime: "12:00", colorHex: "#10B981"),
            Course(name: "數位邏輯設計", code: "EE105", classroom: "實驗大樓 201", instructor: "陳副教授", dayOfWeek: 3, startTime: "13:20", endTime: "16:20", colorHex: "#F59E0B"),
            Course(name: "線性代數", code: "MATH203", classroom: "教學大樓 201", instructor: "劉教授", dayOfWeek: 4, startTime: "09:10", endTime: "11:00", colorHex: "#EC4899"),
            Course(name: "人工智慧導論", code: "CS301", classroom: "工三館 205", instructor: "林客座教授", dayOfWeek: 5, startTime: "10:10", endTime: "12:00", colorHex: "#8B5CF6")
        ]
    }
    
    private static func defaultMockTodos(courseIds: [UUID]) -> [TodoItem] {
        let calendar = Calendar.current
        let today = Date()
        
        let dueTomorrow = calendar.date(byAdding: .day, value: 1, to: today)
        let dueInThreeDays = calendar.date(byAdding: .day, value: 3, to: today)
        let dueNextWeek = calendar.date(byAdding: .day, value: 7, to: today)
        let dueYesterday = calendar.date(byAdding: .day, value: -1, to: today)
        
        return [
            TodoItem(
                title: "計概 Homework 1 程式實作",
                notes: "使用 Python 實作演算法，並撰寫實驗報告",
                dueDate: dueTomorrow,
                isCompleted: false,
                priority: .high,
                category: .assignment,
                courseId: courseIds.first
            ),
            TodoItem(
                title: "微積分第三章課後習題 1-15 題",
                notes: "下週一課堂收取紙本作業",
                dueDate: dueInThreeDays,
                isCompleted: false,
                priority: .medium,
                category: .assignment
            ),
            TodoItem(
                title: "資料結構第一次期中考複習",
                notes: "範圍：Array, Linked List, Stack & Queue",
                dueDate: dueNextWeek,
                isCompleted: false,
                priority: .high,
                category: .exam
            ),
            TodoItem(
                title: "購買數位邏輯實驗用麵包板與線材",
                notes: "光華商場或學校合作社購買",
                dueDate: dueYesterday,
                isCompleted: true,
                priority: .low,
                category: .todo
            )
        ]
    }
    
    private static func defaultMockTransactions() -> [TransactionItem] {
        let calendar = Calendar.current
        let today = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today) ?? today
        let twoDaysAgo = calendar.date(byAdding: .day, value: -2, to: today) ?? today
        let fiveDaysAgo = calendar.date(byAdding: .day, value: -5, to: today) ?? today
        
        return [
            TransactionItem(amount: 85, type: .expense, categoryName: "餐飲美食", categoryIcon: "fork.knife", categoryColorHex: "#F59E0B", paymentMethodName: "現金", date: today, notes: "學餐排骨便當"),
            TransactionItem(amount: 60, type: .expense, categoryName: "餐飲美食", categoryIcon: "cup.and.saucer.fill", categoryColorHex: "#F59E0B", paymentMethodName: "LINE Pay / 行動支付", date: today, notes: "全家冰美式咖啡"),
            TransactionItem(amount: 150, type: .expense, categoryName: "交通出行", categoryIcon: "car.fill", categoryColorHex: "#3B82F6", paymentMethodName: "悠遊卡 / 一卡通", date: yesterday, notes: "捷運加值"),
            TransactionItem(amount: 450, type: .expense, categoryName: "學習書籍", categoryIcon: "book.closed.fill", categoryColorHex: "#10B981", paymentMethodName: "信用卡", date: twoDaysAgo, notes: "微積分課堂用書二手"),
            TransactionItem(amount: 12000, type: .income, categoryName: "兼職打工", categoryIcon: "cup.and.saucer.fill", categoryColorHex: "#06B6D4", paymentMethodName: "銀行轉帳", date: fiveDaysAgo, notes: "校內研究助理兼任薪資")
        ]
    }
    
    private static func defaultMockInstallments() -> [InstallmentItem] {
        let calendar = Calendar.current
        let today = Date()
        let twoMonthsAgo = calendar.date(byAdding: .month, value: -2, to: today) ?? today
        
        return [
            InstallmentItem(
                title: "iPad Air 5 代 + Apple Pencil",
                totalAmount: 21600,
                totalPeriods: 12,
                paidPeriods: 3,
                periodAmount: 1800,
                startDate: twoMonthsAgo,
                billingDay: 10,
                paymentMethodName: "信用卡",
                categoryName: "數位 3C",
                notes: "上課筆記必備利器"
            )
        ]
    }
    
    private static func defaultMockSplitBills() -> [SplitBill] {
        let calendar = Calendar.current
        let today = Date()
        let threeDaysAgo = calendar.date(byAdding: .day, value: -3, to: today) ?? today
        
        return [
            SplitBill(
                title: "期初迎新宿營慶功聚餐",
                totalAmount: 1600,
                myAmount: 400,
                members: [
                    SplitMember(name: "小明", amount: 400, isPaid: true, paidDate: Date()),
                    SplitMember(name: "阿華", amount: 400, isPaid: false),
                    SplitMember(name: "婷婷", amount: 400, isPaid: false)
                ],
                date: threeDaysAgo,
                notes: "我先用台新信用卡刷卡墊付",
                isSettled: false
            )
        ]
    }
}
