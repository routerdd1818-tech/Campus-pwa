//
//  AccountingModel.swift
//  Campus v1
//

import Foundation
import SwiftUI

// MARK: - 收支類型
public enum TransactionType: String, Codable, CaseIterable, Identifiable {
    case expense = "expense"
    case income = "income"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .expense: return "支出"
        case .income: return "收入"
        }
    }
    
    public var color: Color {
        switch self {
        case .expense: return .red
        case .income: return .green
        }
    }
}

// MARK: - 飲食細分類別 (三餐、宵夜、飲料)
public enum FoodMealType: String, CaseIterable, Identifiable, Codable {
    case breakfast = "早餐"
    case lunch = "中餐"
    case dinner = "晚餐"
    case supper = "宵夜"
    case drink = "飲料"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .breakfast: return "cup.and.saucer.fill"
        case .lunch: return "fork.knife"
        case .dinner: return "takeoutbag.and.cup.and.straw.fill"
        case .supper: return "moon.stars.fill"
        case .drink: return "mug.fill"
        }
    }
    
    public var colorHex: String {
        switch self {
        case .breakfast: return "#F59E0B"
        case .lunch: return "#10B981"
        case .dinner: return "#3B82F6"
        case .supper: return "#8B5CF6"
        case .drink: return "#EC4899"
        }
    }
    
    public var color: Color {
        Color(hex: colorHex)
    }
}

// MARK: - 記帳分類
public struct AccountingCategory: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var name: String
    public var type: TransactionType
    public var iconName: String // SF Symbol 或 Emoji
    public var colorHex: String
    public var isSystem: Bool
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case type
        case iconName = "icon_name"
        case colorHex = "color_hex"
        case isSystem = "is_system"
    }
    
    public init(
        id: UUID = UUID(),
        name: String,
        type: TransactionType = .expense,
        iconName: String = "cart.fill",
        colorHex: String = "#6366F1",
        isSystem: Bool = false
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.iconName = iconName
        self.colorHex = colorHex
        self.isSystem = isSystem
    }
    
    public var color: Color {
        Color(hex: colorHex)
    }
    
    // 預設系統內建分類 (細分餐飲：早餐、中餐、晚餐、宵夜、飲料)
    public static var defaultCategories: [AccountingCategory] {
        return defaultExpenseCategories + defaultIncomeCategories
    }
    
    public static var defaultExpenseCategories: [AccountingCategory] {
        [
            AccountingCategory(name: "早餐", type: .expense, iconName: "fork.knife", colorHex: "#F59E0B", isSystem: true),
            AccountingCategory(name: "中餐", type: .expense, iconName: "takeoutbag.and.cup.and.straw.fill", colorHex: "#F97316", isSystem: true),
            AccountingCategory(name: "晚餐", type: .expense, iconName: "frying.pan.fill", colorHex: "#EF4444", isSystem: true),
            AccountingCategory(name: "宵夜", type: .expense, iconName: "moon.stars.fill", colorHex: "#8B5CF6", isSystem: true),
            AccountingCategory(name: "飲料", type: .expense, iconName: "cup.and.saucer.fill", colorHex: "#06B6D4", isSystem: true),
            AccountingCategory(name: "交通出行", type: .expense, iconName: "car.fill", colorHex: "#3B82F6", isSystem: true),
            AccountingCategory(name: "休閒娛樂", type: .expense, iconName: "gamecontroller.fill", colorHex: "#8B5CF6", isSystem: true),
            AccountingCategory(name: "學習書籍", type: .expense, iconName: "book.closed.fill", colorHex: "#10B981", isSystem: true),
            AccountingCategory(name: "購物服裝", type: .expense, iconName: "bag.fill", colorHex: "#EC4899", isSystem: true),
            AccountingCategory(name: "居住租金", type: .expense, iconName: "house.fill", colorHex: "#6366F1", isSystem: true),
            AccountingCategory(name: "日常日用", type: .expense, iconName: "cart.fill", colorHex: "#14B8A6", isSystem: true),
            AccountingCategory(name: "醫療健康", type: .expense, iconName: "cross.case.fill", colorHex: "#EF4444", isSystem: true),
            AccountingCategory(name: "數位 3C", type: .expense, iconName: "laptopcomputer", colorHex: "#64748B", isSystem: true),
            AccountingCategory(name: "其他支出", type: .expense, iconName: "ellipsis.circle.fill", colorHex: "#94A3B8", isSystem: true)
        ]
    }
    
    public static var defaultIncomeCategories: [AccountingCategory] {
        [
            AccountingCategory(name: "工作薪資", type: .income, iconName: "dollarsign.circle.fill", colorHex: "#10B981", isSystem: true),
            AccountingCategory(name: "生活費 / 零用津貼", type: .income, iconName: "gift.fill", colorHex: "#F59E0B", isSystem: true),
            AccountingCategory(name: "獎學金", type: .income, iconName: "graduationcap.fill", colorHex: "#3B82F6", isSystem: true),
            AccountingCategory(name: "兼職打工", type: .income, iconName: "cup.and.saucer.fill", colorHex: "#06B6D4", isSystem: true),
            AccountingCategory(name: "投資理財", type: .income, iconName: "chart.line.uptrend.xyaxis", colorHex: "#8B5CF6", isSystem: true),
            AccountingCategory(name: "其他收入", type: .income, iconName: "arrow.down.circle.fill", colorHex: "#64748B", isSystem: true)
        ]
    }
}

// MARK: - 支付方式
public struct PaymentMethod: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var name: String
    public var iconName: String
    public var isSystem: Bool
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case iconName = "icon_name"
        case isSystem = "is_system"
    }
    
    public init(
        id: UUID = UUID(),
        name: String,
        iconName: String = "creditcard.fill",
        isSystem: Bool = false
    ) {
        self.id = id
        self.name = name
        self.iconName = iconName
        self.isSystem = isSystem
    }
    
    public static var defaultMethods: [PaymentMethod] {
        [
            PaymentMethod(name: "現金", iconName: "banknote.fill", isSystem: true),
            PaymentMethod(name: "信用卡", iconName: "creditcard.fill", isSystem: true),
            PaymentMethod(name: "LINE Pay / 行動支付", iconName: "iphone.radiowaves.left.and.right", isSystem: true),
            PaymentMethod(name: "銀行轉帳", iconName: "building.columns.fill", isSystem: true),
            PaymentMethod(name: "悠遊卡 / 一卡通", iconName: "wave.3.forward.circle.fill", isSystem: true),
            PaymentMethod(name: "其他", iconName: "ellipsis.circle", isSystem: true)
        ]
    }
}

// MARK: - 單筆收支交易
public struct TransactionItem: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var amount: Double
    public var type: TransactionType
    public var categoryId: UUID?
    public var categoryName: String
    public var categoryIcon: String
    public var categoryColorHex: String
    public var paymentMethodName: String
    public var date: Date
    public var notes: String
    public var valueScore: Int // 1~10 分 (花費價值評分：1=衝動浪費，5=日常必需，10=物超所值)
    public var peerRating: Double? // 好友評分 (1~10 分)
    public var peerFeedback: String? // 好友評語回饋
    public var isSharedWithFriends: Bool // 是否分享給好友審查 (預設為 true)
    public var relatedInstallmentId: UUID?
    public var relatedSplitBillId: UUID?
    public var createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case amount
        case type
        case categoryId = "category_id"
        case categoryName = "category_name"
        case categoryIcon = "category_icon"
        case categoryColorHex = "category_color_hex"
        case paymentMethodName = "payment_method_name"
        case date
        case notes
        case valueScore = "value_score"
        case peerRating = "peer_rating"
        case peerFeedback = "peer_feedback"
        case isSharedWithFriends = "is_shared_with_friends"
        case relatedInstallmentId = "related_installment_id"
        case relatedSplitBillId = "related_split_bill_id"
        case createdAt = "created_at"
    }
    
    public init(
        id: UUID = UUID(),
        amount: Double,
        type: TransactionType = .expense,
        categoryId: UUID? = nil,
        categoryName: String = "中餐",
        categoryIcon: String = "takeoutbag.and.cup.and.straw.fill",
        categoryColorHex: String = "#F97316",
        paymentMethodName: String = "現金",
        date: Date = Date(),
        notes: String = "",
        valueScore: Int = 8,
        peerRating: Double? = nil,
        peerFeedback: String? = nil,
        isSharedWithFriends: Bool = true,
        relatedInstallmentId: UUID? = nil,
        relatedSplitBillId: UUID? = nil,
        createdAt: Date? = Date()
    ) {
        self.id = id
        self.amount = amount
        self.type = type
        self.categoryId = categoryId
        self.categoryName = categoryName
        self.categoryIcon = categoryIcon
        self.categoryColorHex = categoryColorHex
        self.paymentMethodName = paymentMethodName
        self.date = date
        self.notes = notes
        self.valueScore = min(10, max(1, valueScore))
        self.peerRating = peerRating
        self.peerFeedback = peerFeedback
        self.isSharedWithFriends = isSharedWithFriends
        self.relatedInstallmentId = relatedInstallmentId
        self.relatedSplitBillId = relatedSplitBillId
        self.createdAt = createdAt
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        amount = try container.decode(Double.self, forKey: .amount)
        type = try container.decode(TransactionType.self, forKey: .type)
        categoryId = try container.decodeIfPresent(UUID.self, forKey: .categoryId)
        categoryName = try container.decodeIfPresent(String.self, forKey: .categoryName) ?? "其他"
        categoryIcon = try container.decodeIfPresent(String.self, forKey: .categoryIcon) ?? "cart.fill"
        categoryColorHex = try container.decodeIfPresent(String.self, forKey: .categoryColorHex) ?? "#6366F1"
        paymentMethodName = try container.decodeIfPresent(String.self, forKey: .paymentMethodName) ?? "現金"
        date = (try? container.decodeIfPresent(Date.self, forKey: .date)) ?? Date()
        notes = try container.decodeIfPresent(String.self, forKey: .notes) ?? ""
        valueScore = try container.decodeIfPresent(Int.self, forKey: .valueScore) ?? 8
        peerRating = try container.decodeIfPresent(Double.self, forKey: .peerRating)
        peerFeedback = try container.decodeIfPresent(String.self, forKey: .peerFeedback)
        isSharedWithFriends = try container.decodeIfPresent(Bool.self, forKey: .isSharedWithFriends) ?? true
        relatedInstallmentId = try container.decodeIfPresent(UUID.self, forKey: .relatedInstallmentId)
        relatedSplitBillId = try container.decodeIfPresent(UUID.self, forKey: .relatedSplitBillId)
        createdAt = (try? container.decodeIfPresent(Date.self, forKey: .createdAt)) ?? nil
    }
    
    public var color: Color {
        Color(hex: categoryColorHex)
    }
    
    /// 理性消費評語
    public var valueScoreLabel: String {
        switch valueScore {
        case 1...3: return "衝動浪費"
        case 4...6: return "平實合理"
        case 7...10: return "物超所值"
        default: return "正常開銷"
        }
    }
    
    public var valueScoreColor: Color {
        switch valueScore {
        case 1...3: return .red
        case 4...6: return .orange
        case 7...10: return .green
        default: return .secondary
        }
    }
}

// MARK: - 每月固定收支模型 (生活費、房租等)
public struct RecurringItem: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var title: String
    public var amount: Double
    public var type: TransactionType // 收入或支出
    public var categoryName: String
    public var categoryIcon: String
    public var categoryColorHex: String
    public var billingDay: Int // 每月幾號 (1...31)
    public var paymentMethodName: String
    public var notes: String
    public var isEnabled: Bool
    public var lastAppliedMonth: String? // 如 "2026-09"
    public var createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case amount
        case type
        case categoryName = "category_name"
        case categoryIcon = "category_icon"
        case categoryColorHex = "category_color_hex"
        case billingDay = "billing_day"
        case paymentMethodName = "payment_method_name"
        case notes
        case isEnabled = "is_enabled"
        case lastAppliedMonth = "last_applied_month"
        case createdAt = "created_at"
    }
    
    public init(
        id: UUID = UUID(),
        title: String,
        amount: Double,
        type: TransactionType = .income,
        categoryName: String = "生活費 / 零用津貼",
        categoryIcon: String = "gift.fill",
        categoryColorHex: String = "#F59E0B",
        billingDay: Int = 1,
        paymentMethodName: String = "銀行轉帳",
        notes: String = "",
        isEnabled: Bool = true,
        lastAppliedMonth: String? = nil,
        createdAt: Date? = Date()
    ) {
        self.id = id
        self.title = title
        self.amount = amount
        self.type = type
        self.categoryName = categoryName
        self.categoryIcon = categoryIcon
        self.categoryColorHex = categoryColorHex
        self.billingDay = billingDay
        self.paymentMethodName = paymentMethodName
        self.notes = notes
        self.isEnabled = isEnabled
        self.lastAppliedMonth = lastAppliedMonth
        self.createdAt = createdAt
    }
}

extension RecurringItem {
    public static var defaultMocks: [RecurringItem] {
        [
            RecurringItem(
                title: "每月家庭生活費",
                amount: 15000,
                type: .income,
                categoryName: "生活費 / 零用津貼",
                categoryIcon: "gift.fill",
                categoryColorHex: "#F59E0B",
                billingDay: 1,
                paymentMethodName: "銀行轉帳",
                notes: "每月月初爸媽匯款生活費"
            ),
            RecurringItem(
                title: "學生套房房租",
                amount: 7500,
                type: .expense,
                categoryName: "住屋租金",
                categoryIcon: "house.fill",
                categoryColorHex: "#EF4444",
                billingDay: 5,
                paymentMethodName: "銀行轉帳",
                notes: "每月 5 號前轉帳給房東"
            ),
            RecurringItem(
                title: "手機 5G 吃到飽電信費",
                amount: 499,
                type: .expense,
                categoryName: "通訊網路",
                categoryIcon: "antenna.radiowaves.left.and.right",
                categoryColorHex: "#3B82F6",
                billingDay: 15,
                paymentMethodName: "信用卡",
                notes: "中華電信學生優惠合約"
            )
        ]
    }
}

// MARK: - 分期付款模型
public struct InstallmentItem: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var title: String
    public var totalAmount: Double
    public var totalPeriods: Int
    public var paidPeriods: Int
    public var periodAmount: Double
    public var startDate: Date
    public var billingDay: Int
    public var paymentMethodName: String
    public var categoryName: String
    public var notes: String
    public var isCompleted: Bool
    public var createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case totalAmount = "total_amount"
        case totalPeriods = "total_periods"
        case paidPeriods = "paid_periods"
        case periodAmount = "period_amount"
        case startDate = "start_date"
        case billingDay = "billing_day"
        case paymentMethodName = "payment_method_name"
        case categoryName = "category_name"
        case notes
        case isCompleted = "is_completed"
        case createdAt = "created_at"
    }
    
    public init(
        id: UUID = UUID(),
        title: String,
        totalAmount: Double,
        totalPeriods: Int,
        paidPeriods: Int = 0,
        periodAmount: Double? = nil,
        startDate: Date = Date(),
        billingDay: Int = 15,
        paymentMethodName: String = "信用卡",
        categoryName: String = "數位 3C",
        notes: String = "",
        isCompleted: Bool = false,
        createdAt: Date? = Date()
    ) {
        self.id = id
        self.title = title
        self.totalAmount = totalAmount
        self.totalPeriods = max(1, totalPeriods)
        self.paidPeriods = paidPeriods
        self.periodAmount = periodAmount ?? (totalAmount / Double(max(1, totalPeriods)))
        self.startDate = startDate
        self.billingDay = billingDay
        self.paymentMethodName = paymentMethodName
        self.categoryName = categoryName
        self.notes = notes
        self.isCompleted = isCompleted || (paidPeriods >= totalPeriods)
        self.createdAt = createdAt
    }
    
    public var remainingPeriods: Int {
        max(0, totalPeriods - paidPeriods)
    }
    
    public var remainingAmount: Double {
        max(0, totalAmount - (Double(paidPeriods) * periodAmount))
    }
    
    public var progress: Double {
        Double(paidPeriods) / Double(totalPeriods)
    }
}

// MARK: - 墊錢分帳成員
public struct SplitMember: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var name: String
    public var amount: Double
    public var isPaid: Bool
    public var paidDate: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case amount
        case isPaid = "is_paid"
        case paidDate = "paid_date"
    }
    
    public init(
        id: UUID = UUID(),
        name: String,
        amount: Double,
        isPaid: Bool = false,
        paidDate: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.amount = amount
        self.isPaid = isPaid
        self.paidDate = paidDate
    }
}

// MARK: - 墊錢分帳紀錄
public struct SplitBill: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var title: String
    public var totalAmount: Double
    public var myAmount: Double
    public var members: [SplitMember]
    public var date: Date
    public var notes: String
    public var isSettled: Bool
    public var createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case totalAmount = "total_amount"
        case myAmount = "my_amount"
        case members
        case date
        case notes
        case isSettled = "is_settled"
        case createdAt = "created_at"
    }
    
    public init(
        id: UUID = UUID(),
        title: String,
        totalAmount: Double,
        myAmount: Double,
        members: [SplitMember],
        date: Date = Date(),
        notes: String = "",
        isSettled: Bool = false,
        createdAt: Date? = Date()
    ) {
        self.id = id
        self.title = title
        self.totalAmount = totalAmount
        self.myAmount = myAmount
        self.members = members
        self.date = date
        self.notes = notes
        self.isSettled = isSettled
        self.createdAt = createdAt
    }
    
    public var totalAdvanceAmount: Double {
        members.reduce(0) { $0 + $1.amount }
    }
    
    public var totalCollectedAmount: Double {
        members.filter { $0.isPaid }.reduce(0) { $0 + $1.amount }
    }
    
    public var pendingCollectionAmount: Double {
        totalAdvanceAmount - totalCollectedAmount
    }
    
    public var isAllMembersPaid: Bool {
        members.allSatisfy { $0.isPaid }
    }
}

// MARK: - 統計週期摘要模型
public struct AccountingPeriodStats {
    public var totalIncome: Double
    public var totalExpense: Double
    public var netBalance: Double {
        totalIncome - totalExpense
    }
    public var dailyAverageExpense: Double
    public var averageRationalScore: Double // 1~10 分理性消費平均分
    public var expenseByCategory: [CategoryExpenseSummary]
    public var incomeByCategory: [CategoryExpenseSummary]
    public var paymentMethodBreakdown: [PaymentMethodSummary]
    public var transactionCount: Int
    
    public init(
        totalIncome: Double = 0,
        totalExpense: Double = 0,
        dailyAverageExpense: Double = 0,
        averageRationalScore: Double = 8.0,
        expenseByCategory: [CategoryExpenseSummary] = [],
        incomeByCategory: [CategoryExpenseSummary] = [],
        paymentMethodBreakdown: [PaymentMethodSummary] = [],
        transactionCount: Int = 0
    ) {
        self.totalIncome = totalIncome
        self.totalExpense = totalExpense
        self.dailyAverageExpense = dailyAverageExpense
        self.averageRationalScore = averageRationalScore
        self.expenseByCategory = expenseByCategory
        self.incomeByCategory = incomeByCategory
        self.paymentMethodBreakdown = paymentMethodBreakdown
        self.transactionCount = transactionCount
    }
    
    public var rationalEvaluationText: String {
        switch averageRationalScore {
        case 8.0...10.0: return "消費非常理性，物超所值！"
        case 5.5..<8.0: return "整體開銷平實合理"
        case 0..<5.5: return "衝動開銷偏多，建議節制非必要支出"
        default: return "尚無評分數據"
        }
    }
    
    public var rationalBadgeColor: Color {
        switch averageRationalScore {
        case 8.0...10.0: return .green
        case 5.5..<8.0: return .orange
        default: return .red
        }
    }
}

public struct CategoryExpenseSummary: Identifiable, Equatable {
    public var id: String { name }
    public var name: String
    public var iconName: String
    public var colorHex: String
    public var amount: Double
    public var percentage: Double
    
    public var color: Color {
        Color(hex: colorHex)
    }
}

public struct PaymentMethodSummary: Identifiable, Equatable {
    public var id: String { name }
    public var name: String
    public var iconName: String
    public var amount: Double
    public var percentage: Double
}
