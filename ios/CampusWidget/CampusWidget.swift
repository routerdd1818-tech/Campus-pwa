//
//  CampusWidget.swift
//  CampusWidget
//
//  Created for Campus v1 (可樂助手).
//

import SwiftUI
import WidgetKit
import AppIntents

// MARK: - 輔助 Color Hex 擴展
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Widget 共享快照資料結構 (跨 App 與 Widget 共享)

public struct WidgetTodayCourseDetail: Codable, Identifiable {
    public var id: UUID
    public let name: String
    public let classroom: String
    public let startTime: String
    public let endTime: String
    public let colorHex: String
    
    public init(id: UUID = UUID(), name: String, classroom: String, startTime: String, endTime: String, colorHex: String = "#4F46E5") {
        self.id = id
        self.name = name
        self.classroom = classroom
        self.startTime = startTime
        self.endTime = endTime
        self.colorHex = colorHex
    }
}

public struct WidgetTodoItemDetail: Codable, Identifiable {
    public var id: UUID
    public let title: String
    public let countdownText: String
    public let isPriority: Bool
    public let categoryColorHex: String
    public let isCompleted: Bool
    
    public init(id: UUID = UUID(), title: String, countdownText: String, isPriority: Bool = false, categoryColorHex: String = "3498DB", isCompleted: Bool = false) {
        self.id = id
        self.title = title
        self.countdownText = countdownText
        self.isPriority = isPriority
        self.categoryColorHex = categoryColorHex
        self.isCompleted = isCompleted
    }
}


public struct WidgetScheduleEntry: TimelineEntry, Codable {
    public let date: Date
    public let courseName: String
    public let classroom: String
    public let time: String
    public let remainingCoursesCount: Int
    public let todayCourses: [WidgetTodayCourseDetail]
    public let weeklyColumns: [WidgetWeeklyDayColumn]
    public let reminders: [WidgetTodoItemDetail]
    
    public init(
        date: Date = Date(),
        courseName: String = "計算機概論",
        classroom: String = "C204",
        time: String = "10:00 - 12:00",
        remainingCoursesCount: Int = 2,
        todayCourses: [WidgetTodayCourseDetail] = [],
        weeklyColumns: [WidgetWeeklyDayColumn] = [],
        reminders: [WidgetTodoItemDetail] = []
    ) {
        self.date = date
        self.courseName = courseName
        self.classroom = classroom
        self.time = time
        self.remainingCoursesCount = remainingCoursesCount
        self.todayCourses = todayCourses
        self.weeklyColumns = weeklyColumns
        self.reminders = reminders
    }
}

public struct WidgetTodoEntry: TimelineEntry, Codable {
    public let date: Date
    public let urgentTodoTitle: String
    public let countdownText: String
    public let pendingTotalCount: Int
    public let items: [WidgetTodoItemDetail]
    
    public init(
        date: Date = Date(),
        urgentTodoTitle: String = "微積分作業",
        countdownText: String = "明天到期",
        pendingTotalCount: Int = 3,
        items: [WidgetTodoItemDetail] = []
    ) {
        self.date = date
        self.urgentTodoTitle = urgentTodoTitle
        self.countdownText = countdownText
        self.pendingTotalCount = pendingTotalCount
        self.items = items
    }
}

public struct WidgetAccountingEntry: TimelineEntry, Codable {
    public let date: Date
    public let todayExpense: Double
    public let monthBalance: Double
    public let dailyLimit: Double
    public let dailyRemaining: Double
    
    public init(
        date: Date = Date(),
        todayExpense: Double = 145,
        monthBalance: Double = 8400,
        dailyLimit: Double = 300,
        dailyRemaining: Double = 180
    ) {
        self.date = date
        self.todayExpense = todayExpense
        self.monthBalance = monthBalance
        self.dailyLimit = dailyLimit
        self.dailyRemaining = dailyRemaining
    }
}

public struct WidgetCalendarDay: Codable, Identifiable {
    public var id: UUID
    public let dayNumber: Int
    public let isCurrentMonth: Bool
    public let isToday: Bool
    public let hasCourse: Bool
    public let hasTodo: Bool
    public let eventTag: String?
    
    public init(id: UUID = UUID(), dayNumber: Int, isCurrentMonth: Bool, isToday: Bool = false, hasCourse: Bool = false, hasTodo: Bool = false, eventTag: String? = nil) {
        self.id = id
        self.dayNumber = dayNumber
        self.isCurrentMonth = isCurrentMonth
        self.isToday = isToday
        self.hasCourse = hasCourse
        self.hasTodo = hasTodo
        self.eventTag = eventTag
    }
}

public struct WidgetCalendarEntry: TimelineEntry, Codable {
    public let date: Date
    public let year: Int
    public let month: Int
    public let monthTitle: String
    public let yearProgressPercent: Int
    public let daysRemainingInYear: Int
    public let days: [WidgetCalendarDay]
    public let todayScheduleSummary: String
    public let todayTodoSummary: String
    public let todayExpenseAmount: Double
    public let courses: [WidgetTodayCourseDetail]
    public let todos: [WidgetTodoItemDetail]
    
    public init(
        date: Date = Date(),
        year: Int = 2026,
        month: Int = 9,
        monthTitle: String = "2026年9月",
        yearProgressPercent: Int = 72,
        daysRemainingInYear: Int = 102,
        days: [WidgetCalendarDay] = [],
        todayScheduleSummary: String = "今日課程安排",
        todayTodoSummary: String = "待辦作業追蹤",
        todayExpenseAmount: Double = 185,
        courses: [WidgetTodayCourseDetail] = [],
        todos: [WidgetTodoItemDetail] = []
    ) {
        self.date = date
        self.year = year
        self.month = month
        self.monthTitle = monthTitle
        self.yearProgressPercent = yearProgressPercent
        self.daysRemainingInYear = daysRemainingInYear
        self.days = days
        self.todayScheduleSummary = todayScheduleSummary
        self.todayTodoSummary = todayTodoSummary
        self.todayExpenseAmount = todayExpenseAmount
        self.courses = courses
        self.todos = todos
    }
}

public struct WidgetWeeklyCourseItem: Codable, Identifiable {
    public var id: UUID
    public let name: String
    public let classroom: String
    public let timeSnippet: String
    public let colorHex: String
    public let weekday: Int
    
    public init(id: UUID = UUID(), name: String, classroom: String, timeSnippet: String, colorHex: String, weekday: Int) {
        self.id = id
        self.name = name
        self.classroom = classroom
        self.timeSnippet = timeSnippet
        self.colorHex = colorHex
        self.weekday = weekday
    }
}

public struct WidgetWeeklyDayColumn: Codable, Identifiable {
    public var id: String { "\(weekday)_\(dateString)" }
    public let weekday: Int
    public let weekdayName: String
    public let dayNumberString: String
    public let dateString: String
    public let isToday: Bool
    public let courses: [WidgetWeeklyCourseItem]
    public let todos: [WidgetTodoItemDetail]
    
    public init(
        weekday: Int,
        weekdayName: String,
        dayNumberString: String = "",
        dateString: String,
        isToday: Bool,
        courses: [WidgetWeeklyCourseItem],
        todos: [WidgetTodoItemDetail] = []
    ) {
        self.weekday = weekday
        self.weekdayName = weekdayName
        self.dayNumberString = dayNumberString
        self.dateString = dateString
        self.isToday = isToday
        self.courses = courses
        self.todos = todos
    }
    
    enum CodingKeys: String, CodingKey {
        case weekday, weekdayName, dayNumberString, dateString, isToday, courses, todos
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        weekday = try container.decode(Int.self, forKey: .weekday)
        weekdayName = try container.decode(String.self, forKey: .weekdayName)
        dayNumberString = try container.decodeIfPresent(String.self, forKey: .dayNumberString) ?? ""
        dateString = try container.decodeIfPresent(String.self, forKey: .dateString) ?? ""
        isToday = try container.decodeIfPresent(Bool.self, forKey: .isToday) ?? false
        courses = try container.decodeIfPresent([WidgetWeeklyCourseItem].self, forKey: .courses) ?? []
        todos = try container.decodeIfPresent([WidgetTodoItemDetail].self, forKey: .todos) ?? []
    }
}


public struct WidgetWeeklyScheduleEntry: TimelineEntry, Codable {
    public let date: Date
    public let weekTitle: String
    public let currentWeekday: Int
    public let quote: String
    public let columns: [WidgetWeeklyDayColumn]
    public let todayCourses: [WidgetTodayCourseDetail]
    public let reminders: [WidgetTodoItemDetail]
    
    public init(
        date: Date = Date(),
        weekTitle: String = "一週課表全覽",
        currentWeekday: Int = 1,
        quote: String = "",
        columns: [WidgetWeeklyDayColumn] = [],
        todayCourses: [WidgetTodayCourseDetail] = [],
        reminders: [WidgetTodoItemDetail] = []
    ) {
        self.date = date
        self.weekTitle = weekTitle
        self.currentWeekday = currentWeekday
        self.quote = quote
        self.columns = columns
        self.todayCourses = todayCourses
        self.reminders = reminders
    }
}

// MARK: - AppIntent: 小工具直接快速記帳 (支援一鍵按鈕、無須跳轉即可記錄)
public struct QuickAddExpenseIntent: AppIntent {
    public static var title: LocalizedStringResource = "快速記帳"
    public static var description = IntentDescription("在桌面小工具一鍵直接記錄飲食與花費")
    
    @Parameter(title: "類別名稱")
    public var mealName: String
    
    @Parameter(title: "金額")
    public var amount: Double
    
    public init() {
        self.mealName = "午餐"
        self.amount = 100
    }
    
    public init(mealName: String, amount: Double) {
        self.mealName = mealName
        self.amount = amount
    }
    
    public func perform() async throws -> some IntentResult {
        var icon = "takeoutbag.and.cup.and.straw.fill"
        var color = "#F97316"
        switch mealName {
        case "早餐":
            icon = "cup.and.saucer.fill"
            color = "#F59E0B"
        case "中餐", "午餐":
            icon = "fork.knife"
            color = "#10B981"
        case "晚餐":
            icon = "frying.pan.fill"
            color = "#EF4444"
        case "宵夜":
            icon = "moon.stars.fill"
            color = "#8B5CF6"
        case "飲料":
            icon = "cup.and.saucer.fill"
            color = "#06B6D4"
        default:
            icon = "cart.fill"
            color = "#6366F1"
        }
        
        let item = WidgetSupabaseService.WidgetTransactionItem(
            id: UUID(),
            amount: amount,
            type: "expense",
            categoryId: nil,
            categoryName: mealName,
            categoryIcon: icon,
            categoryColorHex: color,
            paymentMethodName: "現金",
            date: Date(),
            notes: "小工具快速記錄",
            valueScore: 8,
            peerRating: nil,
            peerFeedback: nil,
            isSharedWithFriends: true,
            relatedInstallmentId: nil,
            relatedSplitBillId: nil,
            createdAt: Date()
        )
        
        var currentTx = CampusSharedStore.shared.load([WidgetSupabaseService.WidgetTransactionItem].self, forKey: "campus_local_transactions") ?? []
        currentTx.insert(item, at: 0)
        CampusSharedStore.shared.save(currentTx, forKey: "campus_local_transactions")
        
        let calendar = Calendar.current
        let todayExpenses = currentTx.filter {
            $0.type == "expense" && calendar.isDateInToday($0.date)
        }.reduce(0.0) { $0 + $1.amount }
        
        let existingAcc = CampusSharedStore.shared.load(WidgetAccountingEntry.self, forKey: "campus_widget_accounting")
        let effectiveLimit = existingAcc?.dailyLimit ?? 300
        let updatedAccounting = WidgetAccountingEntry(
            date: Date(),
            todayExpense: todayExpenses,
            monthBalance: (existingAcc?.monthBalance ?? 8500) - amount,
            dailyLimit: effectiveLimit,
            dailyRemaining: effectiveLimit - todayExpenses
        )
        CampusSharedStore.shared.save(updatedAccounting, forKey: "campus_widget_accounting")
        
        if let calEntry = CampusSharedStore.shared.load(WidgetCalendarEntry.self, forKey: "campus_widget_calendar") {
            let updatedCal = WidgetCalendarEntry(
                date: calEntry.date,
                year: calEntry.year,
                month: calEntry.month,
                monthTitle: calEntry.monthTitle,
                yearProgressPercent: calEntry.yearProgressPercent,
                daysRemainingInYear: calEntry.daysRemainingInYear,
                days: calEntry.days,
                todayScheduleSummary: calEntry.todayScheduleSummary,
                todayTodoSummary: calEntry.todayTodoSummary,
                todayExpenseAmount: todayExpenses,
                courses: calEntry.courses,
                todos: calEntry.todos
            )
            CampusSharedStore.shared.save(updatedCal, forKey: "campus_widget_calendar")
        }
        
        Task {
            await WidgetSupabaseService.shared.insertTransaction(item)
        }
        
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - 🐱 iOS 27 Liquid Glass × 三花貓（可樂）小工具視覺設計系統

public struct CalicoWidgetTheme {
    /// 三花貓暖橘主色 (Warm Calico Orange)
    public static let warmOrange = Color(hex: "#E67E22")
    /// 焦糖琥珀 (Caramel Amber)
    public static let caramel = Color(hex: "#F39C12")
    /// 三花貓深焙可可 (Cocoa Patch Brown)
    public static let cocoaBrown = Color(hex: "#5C3D2E")
    /// 貓咪肉球珊瑚粉 (Paw Pad Pink)
    public static let pawPink = Color(hex: "#F0788C")
    /// 溫暖鼠尾草綠 (Cozy Sage Green)
    public static let sageGreen = Color(hex: "#2E9E7B")
    /// 天空冰晶藍
    public static let crystalBlue = Color(hex: "#4A90E2")
    
    /// iOS 27 三花貓主色流體漸層
    public static var accentGradient: LinearGradient {
        LinearGradient(
            colors: [Color(hex: "#F39C12"), Color(hex: "#E67E22"), Color(hex: "#EC7063")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    /// iOS 27 Liquid Glass 鏡面折射邊框漸層
    public static var glassBorderGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color.white.opacity(0.92),
                warmOrange.opacity(0.30),
                pawPink.opacity(0.22),
                Color.white.opacity(0.55)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    /// 桌面小工具空間溫暖基底色（支援淺色奶油米白 / 深色溫暖深可可）
    public static var spatialBaseColor: Color {
        Color(UIColor { trait in
            if trait.userInterfaceStyle == .dark {
                return UIColor(red: 0.10, green: 0.09, blue: 0.08, alpha: 1.0)
            } else {
                return UIColor(red: 0.988, green: 0.972, blue: 0.948, alpha: 1.0) // #FCF8F2 溫暖奶茶象牙底
            }
        })
    }
    
    /// 內部毛玻璃次級卡片填充色
    public static var glassCardFill: Color {
        Color(UIColor { trait in
            if trait.userInterfaceStyle == .dark {
                return UIColor(red: 0.18, green: 0.15, blue: 0.14, alpha: 0.82)
            } else {
                return UIColor(red: 1.0, green: 0.996, blue: 0.99, alpha: 0.78)
            }
        })
    }
    
    /// 非本月日期或次要區塊燕麥玻璃色
    public static var nonCurrentMonthFill: Color {
        Color(UIColor { trait in
            if trait.userInterfaceStyle == .dark {
                return UIColor(red: 0.22, green: 0.19, blue: 0.17, alpha: 0.65)
            } else {
                return UIColor(red: 0.945, green: 0.915, blue: 0.875, alpha: 0.65)
            }
        })
    }
}

// MARK: - 🐾 小工具專用三花貓（可樂）向量頭像 (WidgetCalicoCatAvatar)
private struct WidgetCatEarShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        path.move(to: CGPoint(x: w * 0.5, y: 0))
        path.addQuadCurve(to: CGPoint(x: w, y: h), control: CGPoint(x: w * 0.92, y: h * 0.35))
        path.addQuadCurve(to: CGPoint(x: 0, y: h), control: CGPoint(x: w * 0.5, y: h * 0.88))
        path.addQuadCurve(to: CGPoint(x: w * 0.5, y: 0), control: CGPoint(x: w * 0.08, y: h * 0.35))
        path.closeSubpath()
        return path
    }
}

public struct WidgetCalicoCatAvatar: View {
    public var size: CGFloat = 20
    public var isHappy: Bool = false
    
    public init(size: CGFloat = 20, isHappy: Bool = false) {
        self.size = size
        self.isHappy = isHappy
    }
    
    public var body: some View {
        ZStack {
            // iOS 27 立體玻璃外環底盤
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#FFF3E4"), Color(hex: "#FAD7B8"), Color(hex: "#F8C8A0")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .overlay(
                    Circle()
                        .strokeBorder(
                            LinearGradient(
                                colors: [Color.white.opacity(0.95), CalicoWidgetTheme.warmOrange.opacity(0.45), CalicoWidgetTheme.pawPink.opacity(0.35)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: max(1.0, size * 0.05)
                        )
                )
            
            // 左耳（三花暖橘）
            WidgetCatEarShape()
                .fill(CalicoWidgetTheme.warmOrange)
                .frame(width: size * 0.34, height: size * 0.34)
                .rotationEffect(.degrees(-24))
                .offset(x: -size * 0.22, y: -size * 0.24)
            
            // 右耳（三花可可深褐）
            WidgetCatEarShape()
                .fill(CalicoWidgetTheme.cocoaBrown)
                .frame(width: size * 0.34, height: size * 0.34)
                .rotationEffect(.degrees(24))
                .offset(x: size * 0.22, y: -size * 0.24)
            
            // 貓臉主體（溫暖奶油白）
            Circle()
                .fill(Color(hex: "#FFFDF9"))
                .frame(width: size * 0.68, height: size * 0.64)
                .offset(y: size * 0.04)
                .overlay(
                    ZStack {
                        // 左上三花暖橘斑塊
                        Circle()
                            .fill(CalicoWidgetTheme.warmOrange.opacity(0.9))
                            .frame(width: size * 0.34, height: size * 0.30)
                            .offset(x: -size * 0.18, y: -size * 0.16)
                        // 右上三花可可斑塊
                        Circle()
                            .fill(CalicoWidgetTheme.cocoaBrown.opacity(0.9))
                            .frame(width: size * 0.32, height: size * 0.28)
                            .offset(x: size * 0.18, y: -size * 0.15)
                    }
                    .clipShape(Circle().scale(0.68).offset(y: size * 0.04))
                )
            
            // 雙眼與粉紅小鼻
            HStack(spacing: size * 0.16) {
                Circle()
                    .fill(Color(hex: "#2C221E"))
                    .frame(width: size * 0.09, height: isHappy ? size * 0.04 : size * 0.09)
                Circle()
                    .fill(Color(hex: "#2C221E"))
                    .frame(width: size * 0.09, height: isHappy ? size * 0.04 : size * 0.09)
            }
            .offset(y: size * 0.03)
            
            // 肉球粉鼻頭
            Circle()
                .fill(CalicoWidgetTheme.pawPink)
                .frame(width: size * 0.07, height: size * 0.055)
                .offset(y: size * 0.10)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - 🌌 iOS 27 小工具液態玻璃背景與容器修飾

public struct CalicoWidgetSpatialBackground: View {
    public init() {}
    public var body: some View {
        ZStack {
            CalicoWidgetTheme.spatialBaseColor
            
            GeometryReader { geo in
                ZStack {
                    // 右上三花暖橘流體柔光
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [CalicoWidgetTheme.warmOrange.opacity(0.20), CalicoWidgetTheme.caramel.opacity(0.07), .clear],
                                center: .center,
                                startRadius: 4,
                                endRadius: max(geo.size.width, geo.size.height) * 0.65
                            )
                        )
                        .frame(width: geo.size.width * 0.9, height: geo.size.width * 0.9)
                        .offset(x: geo.size.width * 0.34, y: -geo.size.height * 0.22)
                    
                    // 左下肉球珊瑚粉流體柔光
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [CalicoWidgetTheme.pawPink.opacity(0.15), CalicoWidgetTheme.warmOrange.opacity(0.04), .clear],
                                center: .center,
                                startRadius: 4,
                                endRadius: max(geo.size.width, geo.size.height) * 0.6
                            )
                        )
                        .frame(width: geo.size.width * 0.85, height: geo.size.width * 0.85)
                        .offset(x: -geo.size.width * 0.32, y: geo.size.height * 0.28)
                }
                .drawingGroup()
            }
            
            // iOS 27 頂部微光折射層
            LinearGradient(
                colors: [Color.white.opacity(0.42), Color.clear, CalicoWidgetTheme.warmOrange.opacity(0.03)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

/// 桌面小工具 iOS 27 Liquid Glass × 三花貓溫暖空間容器修飾（統一標準 12pt 邊距，確保所有桌面小工具內外框對齊一致）
struct WhiteWidgetContainerModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(CalicoWidgetSpatialBackground())
            .containerBackground(for: .widget) {
                CalicoWidgetSpatialBackground()
            }
    }
}

/// 待辦事項滿版專用修飾（與桌面小工具保持完全一致的 12pt 對齊邊距）
struct TodoWidgetFullBleedModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(CalicoWidgetSpatialBackground())
            .containerBackground(for: .widget) {
                CalicoWidgetSpatialBackground()
            }
    }
}

/// 鎖定畫面 iOS 27 液態毛玻璃矩形卡片修飾 (強制統一滿版尺寸與內距，確保左右並排小工具 100% 等高對齊)
struct LockscreenFrostedModifier: ViewModifier {
    var deepLink: String = "campus://schedule"
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(.horizontal, 9)
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                ZStack {
                    AccessoryWidgetBackground()
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.22), lineWidth: 0.8)
                }
            )
            .widgetURL(URL(string: deepLink))
            .containerBackground(for: .widget) {
                Color.clear
            }
    }
}

/// 鎖定畫面圓形小工具標準毛玻璃容器修飾
struct LockscreenCircularModifier: ViewModifier {
    var deepLink: String = "campus://schedule"
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetURL(URL(string: deepLink))
            .containerBackground(for: .widget) {
                AccessoryWidgetBackground()
            }
    }
}

/// 鎖定畫面頂部單行小工具標準容器修飾
struct LockscreenInlineModifier: ViewModifier {
    var deepLink: String = "campus://schedule"
    func body(content: Content) -> some View {
        content
            .widgetURL(URL(string: deepLink))
            .containerBackground(for: .widget) {
                Color.clear
            }
    }
}

/// 小工具內部 Liquid Glass 玻璃子卡片修飾
struct WidgetGlassSubCardModifier: ViewModifier {
    var cornerRadius: CGFloat = 10
    var tint: Color? = nil
    
    func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(CalicoWidgetTheme.glassCardFill)
                    if let tint = tint {
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(tint.opacity(0.10))
                    }
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [Color.white.opacity(0.45), Color.clear],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.85),
                                (tint ?? CalicoWidgetTheme.warmOrange).opacity(0.26),
                                Color.white.opacity(0.40)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 0.9
                    )
            )
    }
}

extension View {
    func whiteWidgetStyle() -> some View {
        self.modifier(WhiteWidgetContainerModifier())
    }
    
    func todoWidgetFullBleedStyle() -> some View {
        self.modifier(TodoWidgetFullBleedModifier())
    }
    
    func lockscreenFrostedStyle(deepLink: String = "campus://schedule") -> some View {
        self.modifier(LockscreenFrostedModifier(deepLink: deepLink))
    }
    
    func lockscreenCircularStyle(deepLink: String = "campus://schedule") -> some View {
        self.modifier(LockscreenCircularModifier(deepLink: deepLink))
    }
    
    func lockscreenInlineStyle(deepLink: String = "campus://schedule") -> some View {
        self.modifier(LockscreenInlineModifier(deepLink: deepLink))
    }
    
    func glassWidgetStyle() -> some View {
        self.modifier(WhiteWidgetContainerModifier())
    }
    
    func widgetGlassSubCard(cornerRadius: CGFloat = 10, tint: Color? = nil) -> some View {
        self.modifier(WidgetGlassSubCardModifier(cornerRadius: cornerRadius, tint: tint))
    }
}


// MARK: - 1. 課表與行程小工具 (CampusScheduleWidget) — iOS 27 三花貓液態玻璃風格
public struct ScheduleWidgetEntryView: View {
    public var entry: WidgetScheduleEntry
    @Environment(\.widgetFamily) var family
    
    public init(entry: WidgetScheduleEntry) {
        self.entry = entry
    }
    
    private var primaryCourseColor: Color {
        if let first = entry.todayCourses.first {
            return Color(hex: first.colorHex)
        }
        return CalicoWidgetTheme.warmOrange
    }
    
    private var lockscreenStatusTitle: String {
        if entry.todayCourses.isEmpty || entry.courseName == "今天無課程安排" {
            return "今日無課"
        } else if entry.remainingCoursesCount == 0 || entry.courseName.contains("結束") {
            return "今日已下課"
        } else {
            return "下一堂課"
        }
    }
    
    private var lockscreenBadgeText: String {
        if entry.remainingCoursesCount > 0 {
            return "剩 \(entry.remainingCoursesCount) 堂"
        } else if !entry.todayCourses.isEmpty {
            return "共 \(entry.todayCourses.count) 堂"
        } else {
            return "空堂"
        }
    }
    
    public var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 0) {
                // 第 1 列（固定高度 14pt）：三花貓圖示 + 狀態標頭 + 右側膠囊標籤
                HStack(spacing: 4) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 8.5, weight: .bold))
                        .widgetAccentable()
                    Text(lockscreenStatusTitle)
                        .font(.system(size: 9.5, weight: .heavy, design: .rounded))
                        .lineLimit(1)
                    Spacer(minLength: 2)
                    Text(lockscreenBadgeText)
                        .font(.system(size: 8, weight: .heavy, design: .rounded))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.primary.opacity(0.18)))
                        .widgetAccentable()
                }
                .foregroundColor(.secondary)
                .frame(height: 14)
                
                Spacer(minLength: 0)
                
                // 第 2 列（固定高度 17pt）：主課程名稱（與左側記帳小工具主金額基準線完全對齊）
                HStack(spacing: 5) {
                    RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                        .fill(Color.primary)
                        .frame(width: 3, height: 12)
                        .widgetAccentable()
                    Text(entry.courseName)
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .frame(height: 17)
                
                Spacer(minLength: 0)
                
                // 第 3 列（固定高度 12pt）：底部上課時段與教室
                HStack(spacing: 5) {
                    HStack(spacing: 2.5) {
                        Image(systemName: "clock.fill")
                            .font(.system(size: 7.5))
                        Text(entry.time)
                            .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                            .lineLimit(1)
                    }
                    if !entry.classroom.isEmpty {
                        Text("📍\(entry.classroom)")
                            .font(.system(size: 8.5, weight: .bold, design: .rounded))
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .foregroundColor(.secondary)
                .frame(height: 12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .lockscreenFrostedStyle(deepLink: "campus://schedule")
            
        case .accessoryCircular:
            let total = max(1, entry.todayCourses.count)
            let done = max(0, entry.todayCourses.count - entry.remainingCoursesCount)
            let progress = entry.todayCourses.isEmpty ? 1.0 : Double(done) / Double(total)
            ZStack {
                AccessoryWidgetBackground()
                Circle()
                    .stroke(Color.primary.opacity(0.22), lineWidth: 3.5)
                    .padding(3.5)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.primary, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(3.5)
                    .widgetAccentable()
                VStack(spacing: 0) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 8, weight: .bold))
                        .widgetAccentable()
                    Text("\(entry.remainingCoursesCount)")
                        .font(.system(size: 13.5, weight: .heavy, design: .rounded))
                    Text("剩餘課")
                        .font(.system(size: 6.5, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                }
            }
            .lockscreenCircularStyle(deepLink: "campus://schedule")
            
        case .accessoryInline:
            Text(entry.classroom.isEmpty ? "🐾 \(entry.courseName) \(entry.time)" : "🐾 \(entry.courseName) 📍\(entry.classroom)")
                .lockscreenInlineStyle(deepLink: "campus://schedule")
            
        case .systemSmall:
            Link(destination: URL(string: "campus://schedule")!) {
                VStack(alignment: .leading, spacing: 6) {
                    // 頂部三花貓毛玻璃標頭（固定高度 20pt）
                    HStack(spacing: 5) {
                        WidgetCalicoCatAvatar(size: 18, isHappy: entry.remainingCoursesCount == 0)
                        Text("今日課表")
                            .font(.system(size: 11.5, weight: .heavy, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                        Spacer(minLength: 0)
                        if entry.remainingCoursesCount > 0 {
                            Text("剩 \(entry.remainingCoursesCount) 堂")
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(CalicoWidgetTheme.accentGradient)
                                .clipShape(Capsule())
                        } else {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 9))
                                .foregroundColor(CalicoWidgetTheme.warmOrange)
                        }
                    }
                    .frame(height: 20)
                    
                    // 主課程毛玻璃卡片（滿版對齊底部）
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .top, spacing: 6) {
                            RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                                .fill(primaryCourseColor)
                                .frame(width: 4, height: 34)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.courseName)
                                    .font(.system(size: 13.5, weight: .heavy, design: .rounded))
                                    .lineLimit(2)
                                    .foregroundColor(.primary)
                                
                                if !entry.classroom.isEmpty {
                                    HStack(spacing: 2) {
                                        Image(systemName: "location.fill")
                                            .font(.system(size: 8))
                                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                                        Text(entry.classroom)
                                            .font(.system(size: 9.5, weight: .semibold, design: .rounded))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                            }
                        }
                        
                        Spacer(minLength: 2)
                        
                        // 時段膠囊標籤
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.system(size: 8.5))
                                .foregroundColor(CalicoWidgetTheme.warmOrange)
                            Text(entry.time)
                                .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3.5)
                        .background(CalicoWidgetTheme.warmOrange.opacity(0.10))
                        .clipShape(Capsule())
                    }
                    .padding(9)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .widgetGlassSubCard(cornerRadius: 12, tint: primaryCourseColor)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        case .systemMedium:
            Link(destination: URL(string: "campus://schedule")!) {
                HStack(spacing: 8) {
                    // 左側：今日課表玻璃卡
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 5) {
                            WidgetCalicoCatAvatar(size: 18, isHappy: entry.todayCourses.isEmpty)
                            Text("今日課表")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            Spacer(minLength: 0)
                            if entry.remainingCoursesCount > 0 {
                                Text("剩 \(entry.remainingCoursesCount) 堂")
                                    .font(.system(size: 8.5, weight: .bold, design: .rounded))
                                    .foregroundColor(CalicoWidgetTheme.warmOrange)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1.5)
                                    .background(CalicoWidgetTheme.warmOrange.opacity(0.14))
                                    .clipShape(Capsule())
                            }
                        }
                        .frame(height: 20)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            if entry.todayCourses.isEmpty {
                                Spacer(minLength: 0)
                                Text(entry.courseName)
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundColor(.primary)
                                Text("和可樂一起享受空堂時光 🐾")
                                    .font(.system(size: 9.5, weight: .medium, design: .rounded))
                                    .foregroundColor(.secondary)
                                Spacer(minLength: 0)
                            } else {
                                ForEach(entry.todayCourses.prefix(2)) { c in
                                    HStack(spacing: 6) {
                                        RoundedRectangle(cornerRadius: 2, style: .continuous)
                                            .fill(Color(hex: c.colorHex))
                                            .frame(width: 3.5, height: 24)
                                        VStack(alignment: .leading, spacing: 1) {
                                            Text(c.name)
                                                .font(.system(size: 10.5, weight: .bold, design: .rounded))
                                                .lineLimit(1)
                                            HStack(spacing: 4) {
                                                Text("\(c.startTime)-\(c.endTime)")
                                                    .font(.system(size: 8.5, weight: .medium, design: .monospaced))
                                                if !c.classroom.isEmpty {
                                                    Text("📍\(c.classroom)")
                                                        .font(.system(size: 8.5, weight: .medium, design: .rounded))
                                                        .lineLimit(1)
                                                }
                                            }
                                            .foregroundColor(.secondary)
                                        }
                                        Spacer(minLength: 0)
                                    }
                                    .padding(.vertical, 1)
                                }
                                Spacer(minLength: 0)
                            }
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                        .widgetGlassSubCard(cornerRadius: 10, tint: CalicoWidgetTheme.warmOrange)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    
                    // 右側：待辦事項玻璃卡
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 4) {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 9.5))
                                .foregroundColor(CalicoWidgetTheme.pawPink)
                            Text("今日待辦")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            Spacer(minLength: 0)
                            Text("\(entry.reminders.count)")
                                .font(.system(size: 8.5, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.pawPink)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1.5)
                                .background(CalicoWidgetTheme.pawPink.opacity(0.15))
                                .clipShape(Capsule())
                        }
                        .frame(height: 20)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            if entry.reminders.isEmpty {
                                Spacer(minLength: 0)
                                HStack(spacing: 4) {
                                    Image(systemName: "sparkles")
                                        .font(.system(size: 11))
                                        .foregroundColor(CalicoWidgetTheme.warmOrange)
                                    Text("今天沒有待辦事項 🎉")
                                        .font(.system(size: 10.5, weight: .medium, design: .rounded))
                                        .foregroundColor(.secondary)
                                }
                                Spacer(minLength: 0)
                            } else {
                                ForEach(entry.reminders.prefix(3)) { todo in
                                    HStack(spacing: 5) {
                                        Circle()
                                            .fill(todo.isPriority ? CalicoWidgetTheme.pawPink : Color(hex: todo.categoryColorHex))
                                            .frame(width: 6, height: 6)
                                        Text(todo.title)
                                            .font(.system(size: 10.5, weight: .semibold, design: .rounded))
                                            .lineLimit(1)
                                            .foregroundColor(.primary)
                                        Spacer(minLength: 0)
                                    }
                                    .padding(.vertical, 1.5)
                                }
                                if entry.reminders.count > 3 {
                                    Text("還有 \(entry.reminders.count - 3) 項待辦...")
                                        .font(.system(size: 8.5, weight: .medium, design: .rounded))
                                        .foregroundColor(.secondary)
                                }
                                Spacer(minLength: 0)
                            }
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                        .widgetGlassSubCard(cornerRadius: 10, tint: CalicoWidgetTheme.pawPink)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        case .systemLarge:
            Link(destination: URL(string: "campus://schedule")!) {
                VStack(alignment: .leading, spacing: 8) {
                    // 頂部三花貓標頭
                    HStack(spacing: 6) {
                        WidgetCalicoCatAvatar(size: 22, isHappy: entry.todayCourses.isEmpty)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("今日課表與行程")
                                .font(.system(size: 13, weight: .heavy, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            Text("可樂助手 · 每日學習總覽")
                                .font(.system(size: 8.5, weight: .medium, design: .rounded))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        if entry.remainingCoursesCount > 0 {
                            Text("剩餘 \(entry.remainingCoursesCount) 堂課")
                                .font(.system(size: 9.5, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(CalicoWidgetTheme.accentGradient)
                                .clipShape(Capsule())
                        } else {
                            Text("今日已無排課 🐾")
                                .font(.system(size: 9.5, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.warmOrange)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(CalicoWidgetTheme.warmOrange.opacity(0.14))
                                .clipShape(Capsule())
                        }
                    }
                    
                    if entry.todayCourses.isEmpty {
                        VStack(spacing: 6) {
                            Spacer()
                            WidgetCalicoCatAvatar(size: 38, isHappy: true)
                            Text("今天無課程安排，享受充實的一天！")
                                .font(.system(size: 11.5, weight: .semibold, design: .rounded))
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .widgetGlassSubCard(cornerRadius: 12, tint: CalicoWidgetTheme.warmOrange)
                    } else {
                        VStack(spacing: 5) {
                            ForEach(entry.todayCourses.prefix(4)) { c in
                                HStack(spacing: 8) {
                                    RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                                        .fill(Color(hex: c.colorHex))
                                        .frame(width: 4, height: 28)
                                    VStack(alignment: .leading, spacing: 1.5) {
                                        Text(c.name)
                                            .font(.system(size: 12, weight: .bold, design: .rounded))
                                            .lineLimit(1)
                                        HStack(spacing: 6) {
                                            Text("\(c.startTime) - \(c.endTime)")
                                                .font(.system(size: 9.5, weight: .semibold, design: .monospaced))
                                            if !c.classroom.isEmpty {
                                                Text("📍 \(c.classroom)")
                                                    .font(.system(size: 9.5, weight: .medium, design: .rounded))
                                            }
                                        }
                                        .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                }
                                .padding(.horizontal, 9)
                                .padding(.vertical, 5)
                                .widgetGlassSubCard(cornerRadius: 9, tint: Color(hex: c.colorHex))
                            }
                        }
                    }
                    
                    // 底部待辦事項玻璃區塊
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 4) {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 9.5))
                                .foregroundColor(CalicoWidgetTheme.pawPink)
                            Text("待辦與作業")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            Spacer()
                            Text("\(entry.reminders.count) 項待完成")
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.pawPink)
                        }
                        
                        if entry.reminders.isEmpty {
                            Text("待辦事項已全數清空 ✨")
                                .font(.system(size: 10.5, weight: .medium, design: .rounded))
                                .foregroundColor(.secondary)
                        } else {
                            ForEach(entry.reminders.prefix(3)) { todo in
                                HStack(spacing: 6) {
                                    Circle()
                                        .fill(todo.isPriority ? CalicoWidgetTheme.pawPink : Color(hex: todo.categoryColorHex))
                                        .frame(width: 5.5, height: 5.5)
                                    Text(todo.title)
                                        .font(.system(size: 10.5, weight: .semibold, design: .rounded))
                                        .lineLimit(1)
                                    Spacer()
                                    Text(todo.countdownText)
                                        .font(.system(size: 8.5, weight: .bold, design: .rounded))
                                        .foregroundColor(CalicoWidgetTheme.warmOrange)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1)
                                        .background(CalicoWidgetTheme.warmOrange.opacity(0.12))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    .padding(9)
                    .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.pawPink)
                    
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        default:
            EmptyView()
        }
    }
}

// MARK: - 2. 一週課表全覽小工具 (CampusWeeklyScheduleWidget) — iOS 27 三花貓液態玻璃風格
public struct CampusWeeklyScheduleWidgetView: View {
    public var entry: WidgetWeeklyScheduleEntry
    @Environment(\.widgetFamily) var family
    
    public init(entry: WidgetWeeklyScheduleEntry) { self.entry = entry }
    
    public var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 0) {
                // Row 1: 頂部標題列 (14pt)
                HStack(spacing: 4) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 8.5, weight: .bold))
                        .widgetAccentable()
                    Text("一週課表全覽")
                        .font(.system(size: 9.5, weight: .heavy, design: .rounded))
                    Spacer(minLength: 2)
                    Text(entry.todayCourses.isEmpty ? "今日無課" : "今日 \(entry.todayCourses.count) 堂")
                        .font(.system(size: 8, weight: .heavy, design: .rounded))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.primary.opacity(0.18)))
                        .widgetAccentable()
                }
                .foregroundColor(.secondary)
                .frame(height: 14)
                
                Spacer(minLength: 0)
                
                // Row 2: 7 日迷你課表進度矩陣 (17pt)
                if !entry.columns.isEmpty {
                    HStack(spacing: 3) {
                        ForEach(entry.columns) { col in
                            VStack(spacing: 0.5) {
                                Text(col.weekdayName)
                                    .font(.system(size: 7, weight: col.isToday ? .heavy : .semibold, design: .rounded))
                                Text(col.courses.isEmpty ? "·" : "\(col.courses.count)")
                                    .font(.system(size: 7.5, weight: .bold, design: .rounded))
                                    .foregroundColor(col.isToday ? .primary : .secondary)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 4, style: .continuous)
                                    .fill(col.isToday ? Color.primary.opacity(0.24) : Color.primary.opacity(0.06))
                            )
                        }
                    }
                    .frame(height: 17)
                }
                
                Spacer(minLength: 0)
                
                // Row 3: 底部今日課程預覽 (12pt)
                HStack(spacing: 4) {
                    if let first = entry.todayCourses.first {
                        Text("📚 \(first.name)")
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        Text("\(first.startTime)-\(first.endTime)")
                            .font(.system(size: 8, weight: .semibold, design: .monospaced))
                            .foregroundColor(.secondary)
                    } else {
                        Text("🐾 今天沒有排課，好好放鬆！")
                            .font(.system(size: 8.5, weight: .medium, design: .rounded))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                }
                .frame(height: 12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lockscreenFrostedStyle(deepLink: "campus://schedule")
            
        case .systemMedium, .systemLarge:
            Link(destination: URL(string: "campus://schedule")!) {
                VStack(alignment: .leading, spacing: 6) {
                    // 標題列：三花貓頭像 + 膠囊統計 (統一 20pt 高)
                    HStack(spacing: 6) {
                        WidgetCalicoCatAvatar(size: 18, isHappy: entry.todayCourses.isEmpty)
                        Text(entry.weekTitle)
                            .font(.system(size: 11.5, weight: .heavy, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                        Spacer()
                        HStack(spacing: 3) {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 8))
                            Text(entry.todayCourses.isEmpty ? "今日無課" : "今日 \(entry.todayCourses.count) 堂課")
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                        }
                        .foregroundColor(entry.todayCourses.isEmpty ? CalicoWidgetTheme.sageGreen : CalicoWidgetTheme.warmOrange)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background((entry.todayCourses.isEmpty ? CalicoWidgetTheme.sageGreen : CalicoWidgetTheme.warmOrange).opacity(0.14))
                        .clipShape(Capsule())
                    }
                    .frame(height: 20)
                    
                    // 日 一 二 三 四 五 六 7天液態玻璃欄位
                    HStack(alignment: .top, spacing: 3.5) {
                        ForEach(entry.columns) { col in
                            VStack(spacing: 3) {
                                // 星期與日期標頭（今日以三花貓流體暖橘漸層凸顯）
                                VStack(spacing: 0.5) {
                                    Text(col.weekdayName)
                                        .font(.system(size: 8.5, weight: .bold, design: .rounded))
                                        .foregroundColor(col.isToday ? .white : (col.weekdayName == "日" || col.weekdayName == "六" ? CalicoWidgetTheme.pawPink : CalicoWidgetTheme.cocoaBrown))
                                    Text(col.dayNumberString)
                                        .font(.system(size: 8, weight: .bold, design: .rounded))
                                        .foregroundColor(col.isToday ? .white.opacity(0.95) : .secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 25)
                                .background(
                                    Group {
                                        if col.isToday {
                                            RoundedRectangle(cornerRadius: 7, style: .continuous)
                                                .fill(CalicoWidgetTheme.accentGradient)
                                        } else {
                                            RoundedRectangle(cornerRadius: 7, style: .continuous)
                                                .fill(CalicoWidgetTheme.glassCardFill)
                                        }
                                    }
                                )
                                
                                // 課程卡片
                                if col.courses.isEmpty {
                                    Text("—")
                                        .font(.system(size: 8, weight: .bold, design: .rounded))
                                        .foregroundColor(.secondary.opacity(0.35))
                                        .frame(maxWidth: .infinity)
                                        .padding(.top, 4)
                                } else {
                                    ForEach(col.courses.prefix(family == .systemLarge ? 5 : 2)) { course in
                                        let cColor = Color(hex: course.colorHex)
                                        VStack(alignment: .leading, spacing: 1) {
                                            Text(course.name)
                                                .font(.system(size: 8, weight: .bold, design: .rounded))
                                                .lineLimit(1)
                                                .foregroundColor(cColor)
                                            if family == .systemLarge && !course.classroom.isEmpty {
                                                Text(course.classroom)
                                                    .font(.system(size: 6.8, weight: .medium, design: .rounded))
                                                    .foregroundColor(.secondary)
                                                    .lineLimit(1)
                                            }
                                        }
                                        .padding(.horizontal, 3)
                                        .padding(.vertical, 2.5)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(
                                            RoundedRectangle(cornerRadius: 5, style: .continuous)
                                                .fill(cColor.opacity(0.15))
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 5, style: .continuous)
                                                .strokeBorder(cColor.opacity(0.32), lineWidth: 0.7)
                                        )
                                    }
                                    if col.courses.count > (family == .systemLarge ? 5 : 2) {
                                        Text("+\(col.courses.count - (family == .systemLarge ? 5 : 2))")
                                            .font(.system(size: 7, weight: .bold, design: .rounded))
                                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                                    }
                                }
                                Spacer(minLength: 0)
                            }
                            .padding(.vertical, 2)
                            .padding(.horizontal, 1.5)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(col.isToday ? CalicoWidgetTheme.warmOrange.opacity(0.08) : Color.clear)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .strokeBorder(col.isToday ? CalicoWidgetTheme.warmOrange.opacity(0.28) : Color.clear, lineWidth: 0.8)
                            )
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        default:
            EmptyView()
        }
    }
}

// MARK: - 3. 一週待辦周曆小工具 (CampusWeeklyTodoWidget) — iOS 27 三花貓液態玻璃風格
public struct CampusWeeklyTodoWidgetView: View {
    public var entry: WidgetWeeklyScheduleEntry
    @Environment(\.widgetFamily) var family
    
    public init(entry: WidgetWeeklyScheduleEntry) { self.entry = entry }
    
    public var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 0) {
                // Row 1: 頂部標題列 (14pt)
                HStack(spacing: 4) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 8.5, weight: .bold))
                        .widgetAccentable()
                    Text("一週待辦周曆")
                        .font(.system(size: 9.5, weight: .heavy, design: .rounded))
                    Spacer(minLength: 2)
                    Text(entry.reminders.isEmpty ? "全數完成" : "剩 \(entry.reminders.count) 項")
                        .font(.system(size: 8, weight: .heavy, design: .rounded))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.primary.opacity(0.18)))
                        .widgetAccentable()
                }
                .foregroundColor(.secondary)
                .frame(height: 14)
                
                Spacer(minLength: 0)
                
                // Row 2: 7 日迷你待辦進度矩陣 (17pt)
                if !entry.columns.isEmpty {
                    HStack(spacing: 3) {
                        ForEach(entry.columns) { col in
                            VStack(spacing: 0.5) {
                                Text(col.weekdayName)
                                    .font(.system(size: 7, weight: col.isToday ? .heavy : .semibold, design: .rounded))
                                Text(col.todos.isEmpty ? "·" : "\(col.todos.count)")
                                    .font(.system(size: 7.5, weight: .bold, design: .rounded))
                                    .foregroundColor(col.isToday ? .primary : .secondary)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 4, style: .continuous)
                                    .fill(col.isToday ? Color.primary.opacity(0.24) : Color.primary.opacity(0.06))
                            )
                        }
                    }
                    .frame(height: 17)
                }
                
                Spacer(minLength: 0)
                
                // Row 3: 底部緊急待辦預覽 (12pt)
                HStack(spacing: 4) {
                    if let first = entry.reminders.first {
                        Image(systemName: first.isPriority ? "exclamationmark.circle.fill" : "circle")
                            .font(.system(size: 8))
                        Text(first.title)
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        Text(first.countdownText)
                            .font(.system(size: 8, weight: .semibold, design: .rounded))
                            .foregroundColor(.secondary)
                    } else {
                        Text("🐾 本週待辦與作業均已完成！")
                            .font(.system(size: 8.5, weight: .medium, design: .rounded))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                }
                .frame(height: 12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lockscreenFrostedStyle(deepLink: "campus://tasks")
            
        case .systemMedium, .systemLarge:
            Link(destination: URL(string: "campus://tasks")!) {
                VStack(alignment: .leading, spacing: 6) {
                    // 標題列 (統一 20pt 高)
                    HStack(spacing: 6) {
                        WidgetCalicoCatAvatar(size: 18, isHappy: entry.reminders.isEmpty)
                        Text("一週待辦周曆")
                            .font(.system(size: 11.5, weight: .heavy, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                        Spacer()
                        HStack(spacing: 3) {
                            Image(systemName: "checklist")
                                .font(.system(size: 8))
                            Text("\(entry.reminders.count) 項待辦")
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(CalicoWidgetTheme.accentGradient)
                        .clipShape(Capsule())
                    }
                    .frame(height: 20)
                    
                    // 日 一 二 三 四 五 六 欄位
                    HStack(alignment: .top, spacing: 3.5) {
                        ForEach(entry.columns) { col in
                            VStack(spacing: 3) {
                                // 星期與日期標頭
                                VStack(spacing: 0.5) {
                                    Text(col.weekdayName)
                                        .font(.system(size: 8.5, weight: .bold, design: .rounded))
                                        .foregroundColor(col.isToday ? .white : (col.weekdayName == "日" || col.weekdayName == "六" ? CalicoWidgetTheme.pawPink : CalicoWidgetTheme.cocoaBrown))
                                    Text(col.dayNumberString)
                                        .font(.system(size: 8, weight: .bold, design: .rounded))
                                        .foregroundColor(col.isToday ? .white.opacity(0.95) : .secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 25)
                                .background(
                                    Group {
                                        if col.isToday {
                                            RoundedRectangle(cornerRadius: 7, style: .continuous)
                                                .fill(CalicoWidgetTheme.accentGradient)
                                        } else {
                                            RoundedRectangle(cornerRadius: 7, style: .continuous)
                                                .fill(CalicoWidgetTheme.glassCardFill)
                                        }
                                    }
                                )
                                
                                // 待辦卡片
                                if col.todos.isEmpty {
                                    Text("—")
                                        .font(.system(size: 8, weight: .bold, design: .rounded))
                                        .foregroundColor(.secondary.opacity(0.35))
                                        .frame(maxWidth: .infinity)
                                        .padding(.top, 4)
                                } else {
                                    ForEach(col.todos.prefix(family == .systemLarge ? 4 : 2)) { todo in
                                        let tColor = Color(hex: todo.categoryColorHex)
                                        HStack(spacing: 2) {
                                            RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                                                .fill(tColor)
                                                .frame(width: 2.5, height: 11)
                                            Text(todo.title)
                                                .font(.system(size: 7.5, weight: .bold, design: .rounded))
                                                .lineLimit(1)
                                                .foregroundColor(.primary)
                                        }
                                        .padding(.horizontal, 2.5)
                                        .padding(.vertical, 2.5)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(
                                            RoundedRectangle(cornerRadius: 5, style: .continuous)
                                                .fill(CalicoWidgetTheme.glassCardFill)
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 5, style: .continuous)
                                                .strokeBorder(tColor.opacity(0.35), lineWidth: 0.7)
                                        )
                                    }
                                    if col.todos.count > (family == .systemLarge ? 4 : 2) {
                                        Text("+\(col.todos.count - (family == .systemLarge ? 4 : 2))")
                                            .font(.system(size: 7, weight: .bold, design: .rounded))
                                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                                    }
                                }
                                Spacer(minLength: 0)
                            }
                            .padding(.vertical, 2)
                            .padding(.horizontal, 1.5)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(col.isToday ? CalicoWidgetTheme.warmOrange.opacity(0.08) : Color.clear)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .strokeBorder(col.isToday ? CalicoWidgetTheme.warmOrange.opacity(0.28) : Color.clear, lineWidth: 0.8)
                            )
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        default:
            EmptyView()
        }
    }
}

// MARK: - 4. 待辦事項小工具 (CampusTodoWidget) — iOS 27 三花貓液態玻璃風格
public struct TodoWidgetEntryView: View {
    public var entry: WidgetTodoEntry
    @Environment(\.widgetFamily) var family
    
    public init(entry: WidgetTodoEntry) { self.entry = entry }
    
    public var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 0) {
                // Row 1: 頂部標題列 (14pt)
                HStack(spacing: 4) {
                    Image(systemName: entry.items.isEmpty ? "checkmark.seal.fill" : "pawprint.fill")
                        .font(.system(size: 8.5, weight: .bold))
                        .widgetAccentable()
                    Text("可樂待辦清單")
                        .font(.system(size: 9.5, weight: .heavy, design: .rounded))
                    Spacer(minLength: 2)
                    Text(entry.pendingTotalCount > 0 ? "\(entry.pendingTotalCount)項待辦" : "已完成")
                        .font(.system(size: 8, weight: .heavy, design: .rounded))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.primary.opacity(0.18)))
                        .widgetAccentable()
                }
                .foregroundColor(.secondary)
                .frame(height: 14)
                
                Spacer(minLength: 0)
                
                // Row 2: 第一項待辦或完成狀態 (17pt)
                if let first = entry.items.first {
                    HStack(spacing: 4) {
                        Image(systemName: first.isPriority ? "exclamationmark.circle.fill" : "circle")
                            .font(.system(size: 9, weight: .bold))
                        Text(first.title)
                            .font(.system(size: 11.5, weight: .bold, design: .rounded))
                            .lineLimit(1)
                        Spacer(minLength: 2)
                        Text(first.countdownText)
                            .font(.system(size: 8.5, weight: .semibold, design: .rounded))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    .frame(height: 17)
                } else {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 10.5, weight: .bold))
                        Text(entry.pendingTotalCount > 0 ? entry.urgentTodoTitle : "全部待辦已完成 🐾")
                            .font(.system(size: 11.5, weight: .bold, design: .rounded))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .frame(height: 17)
                }
                
                Spacer(minLength: 0)
                
                // Row 3: 第二項待辦或底部狀態 (12pt)
                if entry.items.count > 1 {
                    let second = entry.items[1]
                    HStack(spacing: 4) {
                        Image(systemName: second.isPriority ? "exclamationmark.circle.fill" : "circle")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundColor(.secondary)
                        Text(second.title)
                            .font(.system(size: 9.5, weight: .semibold, design: .rounded))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Spacer(minLength: 2)
                        Text(second.countdownText)
                            .font(.system(size: 8, weight: .medium, design: .rounded))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    .frame(height: 12)
                } else {
                    HStack(spacing: 4) {
                        Text(entry.items.isEmpty ? "和可樂一起享受輕鬆時光 ✨" : "完成後點擊可快速勾選 🐾")
                            .font(.system(size: 8.5, weight: .semibold, design: .rounded))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .frame(height: 12)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lockscreenFrostedStyle(deepLink: "campus://tasks")
            
        case .accessoryInline:
            Group {
                if entry.pendingTotalCount > 0 {
                    Label("\(entry.pendingTotalCount)項待辦 · \(entry.urgentTodoTitle)", systemImage: "pawprint.fill")
                } else {
                    Label("待辦事項已全數完成", systemImage: "checkmark.circle.fill")
                }
            }
            .lockscreenInlineStyle(deepLink: "campus://tasks")
            
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Circle()
                    .stroke(Color.primary.opacity(0.22), lineWidth: 3.5)
                    .padding(3.5)
                if entry.pendingTotalCount == 0 {
                    Circle()
                        .stroke(Color.primary, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                        .padding(3.5)
                } else {
                    Circle()
                        .trim(from: 0, to: max(0.15, min(0.9, 1.0 - Double(min(entry.pendingTotalCount, 8)) / 10.0)))
                        .stroke(Color.primary, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .padding(3.5)
                }
                VStack(spacing: 0) {
                    Image(systemName: entry.pendingTotalCount == 0 ? "checkmark" : "pawprint.fill")
                        .font(.system(size: 8.5, weight: .bold))
                    Text("\(entry.pendingTotalCount)")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                    Text("待辦")
                        .font(.system(size: 7, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                }
            }
            .lockscreenCircularStyle(deepLink: "campus://tasks")
            
        case .systemSmall:
            Link(destination: URL(string: "campus://tasks")!) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 5) {
                        WidgetCalicoCatAvatar(size: 18, isHappy: entry.items.isEmpty)
                        Text("待辦事項")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                        Spacer()
                        Text("\(entry.pendingTotalCount)")
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .padding(.horizontal, 6.5)
                            .padding(.vertical, 1.5)
                            .background(CalicoWidgetTheme.accentGradient)
                            .clipShape(Capsule())
                    }
                    .frame(height: 20)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        if entry.items.isEmpty {
                            Spacer(minLength: 0)
                            VStack(spacing: 4) {
                                WidgetCalicoCatAvatar(size: 30, isHappy: true)
                                Text("全部完成 🐾")
                                    .font(.system(size: 11.5, weight: .bold, design: .rounded))
                                    .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            }
                            .frame(maxWidth: .infinity)
                            Spacer(minLength: 0)
                        } else {
                            ForEach(entry.items.prefix(3)) { item in
                                let cColor = Color(hex: item.categoryColorHex)
                                HStack(spacing: 5) {
                                    Circle()
                                        .strokeBorder(item.isPriority ? CalicoWidgetTheme.pawPink : cColor, lineWidth: 1.8)
                                        .frame(width: 8.5, height: 8.5)
                                    Text(item.title)
                                        .font(.system(size: 10.5, weight: .semibold, design: .rounded))
                                        .lineLimit(1)
                                        .foregroundColor(.primary)
                                    Spacer(minLength: 0)
                                }
                                .padding(.vertical, 1.5)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.pawPink)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        case .systemMedium, .systemLarge:
            Link(destination: URL(string: "campus://tasks")!) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        WidgetCalicoCatAvatar(size: 18, isHappy: entry.items.isEmpty)
                        Text("待辦事項與作業追蹤")
                            .font(.system(size: 11.5, weight: .heavy, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                        Spacer()
                        HStack(spacing: 3) {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 8))
                            Text("\(entry.pendingTotalCount) 項未完成")
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(CalicoWidgetTheme.accentGradient)
                        .clipShape(Capsule())
                    }
                    .frame(height: 20)
                    
                    if entry.items.isEmpty {
                        VStack(spacing: 6) {
                            Spacer()
                            WidgetCalicoCatAvatar(size: 34, isHappy: true)
                            Text("所有待辦與作業均已完成！🎉")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.pawPink)
                    } else {
                        VStack(spacing: 4) {
                            ForEach(entry.items.prefix(family == .systemLarge ? 7 : 3)) { item in
                                let cColor = Color(hex: item.categoryColorHex)
                                HStack(spacing: 7) {
                                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                                        .fill(item.isPriority ? CalicoWidgetTheme.pawPink : cColor)
                                        .frame(width: 3.5, height: 16)
                                    
                                    Circle()
                                        .strokeBorder(item.isPriority ? CalicoWidgetTheme.pawPink : cColor.opacity(0.75), lineWidth: 1.5)
                                        .frame(width: 10, height: 10)
                                    
                                    Text(item.title)
                                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                                        .lineLimit(1)
                                        .foregroundColor(.primary)
                                    
                                    Spacer()
                                    
                                    Text(item.countdownText)
                                        .font(.system(size: 8.5, weight: .bold, design: .rounded))
                                        .foregroundColor(item.isPriority ? CalicoWidgetTheme.pawPink : CalicoWidgetTheme.warmOrange)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 1.5)
                                        .background((item.isPriority ? CalicoWidgetTheme.pawPink : CalicoWidgetTheme.warmOrange).opacity(0.13))
                                        .clipShape(Capsule())
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .widgetGlassSubCard(cornerRadius: 8, tint: cColor)
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        default:
            EmptyView()
        }
    }
}

// MARK: - 5. 行事曆小工具 (CampusCalendarWidget) — iOS 27 三花貓液態玻璃風格
public struct CampusCalendarWidgetView: View {
    public var entry: WidgetCalendarEntry
    @Environment(\.widgetFamily) var family
    
    public init(entry: WidgetCalendarEntry) { self.entry = entry }
    
    public var body: some View {
        switch family {
        case .accessoryRectangular:
            let todayDayNum = entry.days.first(where: { $0.isToday })?.dayNumber ?? Calendar.current.component(.day, from: entry.date)
            VStack(alignment: .leading, spacing: 0) {
                // Row 1: 頂部日期與年進度標頭 (14pt)
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 8.5, weight: .bold))
                        .widgetAccentable()
                    Text("\(entry.month)月\(todayDayNum)日 · 可樂日曆")
                        .font(.system(size: 9.5, weight: .heavy, design: .rounded))
                    Spacer(minLength: 2)
                    Text("年進度 \(entry.yearProgressPercent)%")
                        .font(.system(size: 8, weight: .heavy, design: .rounded))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.primary.opacity(0.18)))
                        .widgetAccentable()
                }
                .foregroundColor(.secondary)
                .frame(height: 14)
                
                Spacer(minLength: 0)
                
                // Row 2: 今日課程摘要 (17pt)
                HStack(spacing: 4) {
                    Image(systemName: "book.fill")
                        .font(.system(size: 9, weight: .bold))
                    Text(entry.todayScheduleSummary)
                        .font(.system(size: 11.5, weight: .bold, design: .rounded))
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .frame(height: 17)
                
                Spacer(minLength: 0)
                
                // Row 3: 待辦與今日花費 (12pt)
                HStack(spacing: 4) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 8))
                        .foregroundColor(.secondary)
                    Text(entry.todayTodoSummary)
                        .font(.system(size: 9, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    Spacer(minLength: 2)
                    Text("花費 $\(Int(entry.todayExpenseAmount))")
                        .font(.system(size: 8.5, weight: .heavy, design: .rounded))
                        .foregroundColor(.secondary)
                }
                .frame(height: 12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lockscreenFrostedStyle(deepLink: "campus://calendar")
            
        case .accessoryCircular:
            let todayDayNum = entry.days.first(where: { $0.isToday })?.dayNumber ?? Calendar.current.component(.day, from: entry.date)
            ZStack {
                AccessoryWidgetBackground()
                Circle()
                    .stroke(Color.primary.opacity(0.22), lineWidth: 3)
                    .padding(3.5)
                Circle()
                    .trim(from: 0, to: CGFloat(min(100, max(5, entry.yearProgressPercent))) / 100.0)
                    .stroke(Color.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(3.5)
                VStack(spacing: -1) {
                    Text("\(entry.month)月")
                        .font(.system(size: 7.5, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                    Text("\(todayDayNum)")
                        .font(.system(size: 15, weight: .heavy, design: .rounded))
                }
            }
            .lockscreenCircularStyle(deepLink: "campus://calendar")
            
        case .accessoryInline:
            let todayDayNum = entry.days.first(where: { $0.isToday })?.dayNumber ?? Calendar.current.component(.day, from: entry.date)
            Label("\(entry.month)月\(todayDayNum)日 · \(entry.todayScheduleSummary)", systemImage: "calendar")
                .lockscreenInlineStyle(deepLink: "campus://calendar")
            
        case .systemSmall:
            Link(destination: URL(string: "campus://calendar")!) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(alignment: .center, spacing: 4) {
                        Text("\(entry.month)月")
                            .font(.system(size: 13, weight: .heavy, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                        Text("\(entry.year)")
                            .font(.system(size: 9.5, weight: .semibold, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown.opacity(0.75))
                        Spacer()
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 9))
                            .foregroundColor(CalicoWidgetTheme.pawPink)
                    }
                    .frame(height: 20)
                    
                    // 星期與日期網格
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 1), count: 7), spacing: 1.5) {
                        ForEach(["日","一","二","三","四","五","六"], id: \.self) { d in
                            Text(d)
                                .font(.system(size: 8, weight: .bold, design: .rounded))
                                .foregroundColor(d == "日" || d == "六" ? CalicoWidgetTheme.pawPink : CalicoWidgetTheme.cocoaBrown.opacity(0.75))
                        }
                        
                        ForEach(entry.days, id: \.id) { day in
                            ZStack {
                                if !day.isCurrentMonth {
                                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                                        .fill(CalicoWidgetTheme.nonCurrentMonthFill)
                                }
                                if day.isToday {
                                    Circle()
                                        .fill(CalicoWidgetTheme.accentGradient)
                                        .frame(width: 14, height: 14)
                                }
                                Text("\(max(1, day.dayNumber))")
                                    .font(.system(size: 8, weight: day.isToday ? .heavy : .semibold, design: .rounded))
                                    .foregroundColor(day.isToday ? .white : (day.isCurrentMonth ? .primary : .secondary))
                            }
                            .frame(height: 14)
                        }
                    }
                    .padding(5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.warmOrange)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        case .systemMedium:
            Link(destination: URL(string: "campus://calendar")!) {
                HStack(spacing: 8) {
                    // 左半部：月曆網格玻璃卡 (非本月溫暖燕麥底、正常顯示日期)
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(alignment: .center, spacing: 4) {
                            WidgetCalicoCatAvatar(size: 16)
                            Text("\(entry.month)月")
                                .font(.system(size: 13, weight: .heavy, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.warmOrange)
                            Text("\(entry.year)")
                                .font(.system(size: 9.5, weight: .semibold, design: .rounded))
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .frame(height: 20)
                        
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 1), count: 7), spacing: 1.5) {
                            ForEach(["日","一","二","三","四","五","六"], id: \.self) { d in
                                Text(d)
                                    .font(.system(size: 8, weight: .bold, design: .rounded))
                                    .foregroundColor(d == "日" || d == "六" ? CalicoWidgetTheme.pawPink : CalicoWidgetTheme.cocoaBrown.opacity(0.75))
                            }
                            
                            ForEach(entry.days, id: \.id) { day in
                                ZStack {
                                    if !day.isCurrentMonth {
                                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                                            .fill(CalicoWidgetTheme.nonCurrentMonthFill)
                                    }
                                    if day.isToday {
                                        Circle()
                                            .fill(CalicoWidgetTheme.accentGradient)
                                            .frame(width: 14, height: 14)
                                    }
                                    Text("\(max(1, day.dayNumber))")
                                        .font(.system(size: 8, weight: day.isToday ? .heavy : .semibold, design: .rounded))
                                        .foregroundColor(day.isToday ? .white : (day.isCurrentMonth ? .primary : .secondary))
                                }
                                .frame(height: 14)
                            }
                        }
                        .padding(5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .widgetGlassSubCard(cornerRadius: 10, tint: CalicoWidgetTheme.warmOrange)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    
                    // 右半部：今日課程、待辦與花費玻璃卡 (同樣加上 20pt 頂部標頭使左右玻璃卡完全對齊)
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 4) {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 9))
                                .foregroundColor(CalicoWidgetTheme.pawPink)
                            Text("今日概況")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            Spacer(minLength: 0)
                            Text("$\(Int(entry.todayExpenseAmount))")
                                .font(.system(size: 8.5, weight: .heavy, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.warmOrange)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1.5)
                                .background(CalicoWidgetTheme.warmOrange.opacity(0.14))
                                .clipShape(Capsule())
                        }
                        .frame(height: 20)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            // 今日排課
                            HStack(spacing: 3) {
                                Image(systemName: "book.fill")
                                    .font(.system(size: 8))
                                    .foregroundColor(CalicoWidgetTheme.warmOrange)
                                Text("今日排課")
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                                    .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            }
                            if entry.courses.isEmpty {
                                Text("今日無課 🐾")
                                    .font(.system(size: 9, weight: .medium, design: .rounded))
                                    .foregroundColor(.secondary)
                            } else {
                                ForEach(entry.courses.prefix(2)) { c in
                                    HStack(spacing: 4) {
                                        RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                                            .fill(Color(hex: c.colorHex))
                                            .frame(width: 2.5, height: 10)
                                        Text(c.name)
                                            .font(.system(size: 9, weight: .bold, design: .rounded))
                                            .lineLimit(1)
                                    }
                                }
                            }
                            
                            Divider().opacity(0.35)
                            
                            // 待辦事項
                            HStack(spacing: 3) {
                                Image(systemName: "checklist")
                                    .font(.system(size: 8))
                                    .foregroundColor(CalicoWidgetTheme.pawPink)
                                Text("待辦事項")
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                                    .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            }
                            if entry.todos.isEmpty {
                                Text("全數完成 ✨")
                                    .font(.system(size: 9, weight: .medium, design: .rounded))
                                    .foregroundColor(.secondary)
                            } else {
                                ForEach(entry.todos.prefix(1)) { t in
                                    HStack(spacing: 3.5) {
                                        Circle()
                                            .fill(t.isPriority ? CalicoWidgetTheme.pawPink : Color(hex: t.categoryColorHex))
                                            .frame(width: 4.5, height: 4.5)
                                        Text(t.title)
                                            .font(.system(size: 9, weight: .semibold, design: .rounded))
                                            .lineLimit(1)
                                    }
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(7)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                        .widgetGlassSubCard(cornerRadius: 10, tint: CalicoWidgetTheme.pawPink)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        case .systemLarge:
            Link(destination: URL(string: "campus://calendar")!) {
                VStack(alignment: .leading, spacing: 6) {
                    // 上半部：完整月曆標頭與網格
                    HStack(alignment: .center, spacing: 6) {
                        WidgetCalicoCatAvatar(size: 18)
                        Text("\(entry.month)月")
                            .font(.system(size: 16, weight: .heavy, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                        Text("\(entry.year)")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("年進度 \(entry.yearProgressPercent)% · 剩 \(entry.daysRemainingInYear) 天")
                            .font(.system(size: 8.5, weight: .bold, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background(CalicoWidgetTheme.warmOrange.opacity(0.13))
                            .clipShape(Capsule())
                    }
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 1.5), count: 7), spacing: 2) {
                        ForEach(["日","一","二","三","四","五","六"], id: \.self) { d in
                            Text(d)
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .foregroundColor(d == "日" || d == "六" ? CalicoWidgetTheme.pawPink : CalicoWidgetTheme.cocoaBrown.opacity(0.75))
                        }
                        
                        ForEach(entry.days, id: \.id) { day in
                            ZStack {
                                if !day.isCurrentMonth {
                                    RoundedRectangle(cornerRadius: 3.5, style: .continuous)
                                        .fill(CalicoWidgetTheme.nonCurrentMonthFill)
                                }
                                if day.isToday {
                                    Circle()
                                        .fill(CalicoWidgetTheme.accentGradient)
                                        .frame(width: 17, height: 17)
                                }
                                Text("\(max(1, day.dayNumber))")
                                    .font(.system(size: 9.5, weight: day.isToday ? .heavy : .semibold, design: .rounded))
                                    .foregroundColor(day.isToday ? .white : (day.isCurrentMonth ? .primary : .secondary))
                            }
                            .frame(height: 17)
                        }
                    }
                    .padding(6)
                    .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.warmOrange)
                    
                    // 下半部：今日排課方塊
                    HStack(spacing: 4) {
                        Image(systemName: "book.fill")
                            .font(.system(size: 9.5))
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                        Text("今日排課")
                            .font(.system(size: 10.5, weight: .bold, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                    }
                    
                    if entry.courses.isEmpty {
                        Text("今日無課程安排，好好休息 🐾")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .widgetGlassSubCard(cornerRadius: 8, tint: CalicoWidgetTheme.warmOrange)
                    } else {
                        HStack(spacing: 5) {
                            ForEach(entry.courses.prefix(3)) { c in
                                let cColor = Color(hex: c.colorHex)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(c.name)
                                        .font(.system(size: 10, weight: .bold, design: .rounded))
                                        .lineLimit(1)
                                        .foregroundColor(cColor)
                                    Text("\(c.startTime)-\(c.endTime)")
                                        .font(.system(size: 8, weight: .medium, design: .monospaced))
                                        .foregroundColor(.secondary)
                                }
                                .padding(6)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .widgetGlassSubCard(cornerRadius: 8, tint: cColor)
                            }
                        }
                    }
                    
                    // 今日待辦事項
                    HStack(spacing: 4) {
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 9.5))
                            .foregroundColor(CalicoWidgetTheme.pawPink)
                        Text("待辦事項")
                            .font(.system(size: 10.5, weight: .bold, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                    }
                    
                    if entry.todos.isEmpty {
                        Text("無待辦事項 ✨")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(.secondary)
                    } else {
                        VStack(spacing: 3) {
                            ForEach(entry.todos.prefix(2)) { t in
                                HStack(spacing: 5) {
                                    Circle()
                                        .fill(t.isPriority ? CalicoWidgetTheme.pawPink : Color(hex: t.categoryColorHex))
                                        .frame(width: 5, height: 5)
                                    Text(t.title)
                                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                                        .lineLimit(1)
                                    Spacer()
                                    Text(t.countdownText)
                                        .font(.system(size: 8, weight: .bold, design: .rounded))
                                        .foregroundColor(CalicoWidgetTheme.warmOrange)
                                }
                            }
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .widgetGlassSubCard(cornerRadius: 8, tint: CalicoWidgetTheme.pawPink)
                    }
                    
                    Spacer(minLength: 0)
                    
                    // 今日累計花費 (放置在最底下玻璃膠囊列)
                    HStack {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.system(size: 10.5))
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                        Text("今日累計花費")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                        Spacer()
                        Text("$\(Int(entry.todayExpenseAmount))")
                            .font(.system(size: 12, weight: .heavy, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                    }
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .widgetGlassSubCard(cornerRadius: 9, tint: CalicoWidgetTheme.caramel)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        default:
            EmptyView()
        }
    }
}

// MARK: - 6. 記帳小工具 (CampusAccountingWidget) — iOS 27 三花貓液態玻璃風格
public struct AccountingQuickWidgetView: View {
    public var entry: WidgetAccountingEntry
    @Environment(\.widgetFamily) var family
    
    public init(entry: WidgetAccountingEntry) { self.entry = entry }
    
    private func expenseURL() -> URL {
        return URL(string: "campus://quick-expense")!
    }
    
    private var effectiveDailyLimit: Double {
        entry.dailyLimit > 0 ? entry.dailyLimit : 300.0
    }
    
    private var isOverLimit: Bool {
        entry.todayExpense > effectiveDailyLimit
    }
    
    public var body: some View {
        switch family {
        case .accessoryRectangular:
            let limit = effectiveDailyLimit
            let ratio = min(1.0, max(0.0, entry.todayExpense / limit))
            let rem = Int(limit - entry.todayExpense)
            VStack(alignment: .leading, spacing: 0) {
                // Row 1: 頂部標題列 (與下一堂課 14pt 完全對齊)
                HStack(spacing: 4) {
                    Image(systemName: isOverLimit ? "exclamationmark.triangle.fill" : "pawprint.fill")
                        .font(.system(size: 8.5, weight: .bold))
                        .widgetAccentable()
                    Text("可樂今日花費")
                        .font(.system(size: 9.5, weight: .heavy, design: .rounded))
                    Spacer(minLength: 2)
                    Text(rem >= 0 ? "尚餘 $\(rem)" : "超支 $\(abs(rem))")
                        .font(.system(size: 8, weight: .heavy, design: .rounded))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.primary.opacity(0.18)))
                        .widgetAccentable()
                }
                .foregroundColor(.secondary)
                .frame(height: 14)
                
                Spacer(minLength: 0)
                
                // Row 2: 中間主金額列 (與下一堂課 17pt 完全對齊)
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("$\(Int(entry.todayExpense))")
                        .font(.system(size: 13.5, weight: .heavy, design: .rounded))
                        .lineLimit(1)
                    Text("/ $\(Int(limit))")
                        .font(.system(size: 9.5, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    Spacer(minLength: 2)
                    Text("月餘 $\(Int(entry.monthBalance))")
                        .font(.system(size: 8.5, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                .frame(height: 17)
                
                Spacer(minLength: 0)
                
                // Row 3: 底部進度條與百分比列 (與下一堂課 12pt 完全對齊)
                HStack(spacing: 5) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Color.primary.opacity(0.2))
                                .frame(height: 4.5)
                            Capsule()
                                .fill(Color.primary)
                                .frame(width: max(4.5, geo.size.width * ratio), height: 4.5)
                        }
                        .frame(maxHeight: .infinity, alignment: .center)
                    }
                    .frame(height: 12)
                    
                    Text("\(Int(ratio * 100))%")
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                }
                .frame(height: 12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lockscreenFrostedStyle(deepLink: "campus://quick-expense")
            
        case .accessoryInline:
            Label("今日花費 $\(Int(entry.todayExpense)) / $\(Int(effectiveDailyLimit))", systemImage: "pawprint.fill")
                .lockscreenInlineStyle(deepLink: "campus://quick-expense")
            
        case .accessoryCircular:
            let limit = effectiveDailyLimit
            let ratio = min(1.0, max(0.05, entry.todayExpense / limit))
            ZStack {
                AccessoryWidgetBackground()
                Circle()
                    .stroke(Color.primary.opacity(0.22), lineWidth: 3.5)
                    .padding(3.5)
                Circle()
                    .trim(from: 0, to: ratio)
                    .stroke(Color.primary, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(3.5)
                VStack(spacing: 0) {
                    Image(systemName: isOverLimit ? "exclamationmark.triangle.fill" : "pawprint.fill")
                        .font(.system(size: 8, weight: .bold))
                    Text("$\(Int(entry.todayExpense))")
                        .font(.system(size: 11, weight: .heavy, design: .rounded))
                        .minimumScaleFactor(0.65)
                        .lineLimit(1)
                        .padding(.horizontal, 4)
                    Text("今日")
                        .font(.system(size: 6.5, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                }
            }
            .lockscreenCircularStyle(deepLink: "campus://quick-expense")
            
        case .systemSmall:
            let limit = effectiveDailyLimit
            Link(destination: expenseURL()) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 5) {
                        WidgetCalicoCatAvatar(size: 18, isHappy: !isOverLimit)
                        Text("可樂記帳")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                        Spacer()
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 9))
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                    }
                    .frame(height: 20)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("今日花費")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundColor(.secondary)
                        
                        Text("$\(Int(entry.todayExpense))")
                            .font(.system(size: 24, weight: .heavy, design: .rounded))
                            .foregroundColor(isOverLimit ? Color(hex: "#EF4444") : CalicoWidgetTheme.cocoaBrown)
                            .minimumScaleFactor(0.75)
                            .lineLimit(1)
                        
                        Spacer(minLength: 0)
                        
                        // iOS 27 流體玻璃進度條
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(CalicoWidgetTheme.warmOrange.opacity(0.14))
                                    .frame(height: 5)
                                Capsule()
                                    .fill(
                                        isOverLimit
                                        ? LinearGradient(colors: [Color(hex: "#EF4444"), Color(hex: "#F97316")], startPoint: .leading, endPoint: .trailing)
                                        : CalicoWidgetTheme.accentGradient
                                    )
                                    .frame(width: min(geo.size.width, geo.size.width * (entry.todayExpense / limit)), height: 5)
                            }
                        }
                        .frame(height: 5)
                        
                        HStack {
                            Text("限額 $\(Int(limit))")
                                .font(.system(size: 8.5, weight: .semibold, design: .rounded))
                                .foregroundColor(.secondary)
                            Spacer()
                            HStack(spacing: 2) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 8.5))
                                Text("記帳")
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                            }
                            .foregroundColor(CalicoWidgetTheme.warmOrange)
                        }
                    }
                    .padding(9)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.warmOrange)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        case .systemMedium:
            let limit = effectiveDailyLimit
            let rem = Int(limit - entry.todayExpense)
            Link(destination: expenseURL()) {
                HStack(spacing: 8) {
                    // 左側：今日花費與進度玻璃卡
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 5) {
                            WidgetCalicoCatAvatar(size: 18, isHappy: !isOverLimit)
                            Text("可樂記帳")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            Spacer()
                        }
                        .frame(height: 20)
                        
                        VStack(alignment: .leading, spacing: 3) {
                            Text("今日花費")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundColor(.secondary)
                            
                            Text("$\(Int(entry.todayExpense))")
                                .font(.system(size: 24, weight: .heavy, design: .rounded))
                                .foregroundColor(isOverLimit ? Color(hex: "#EF4444") : CalicoWidgetTheme.cocoaBrown)
                                .minimumScaleFactor(0.75)
                                .lineLimit(1)
                            
                            Spacer(minLength: 0)
                            
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(CalicoWidgetTheme.warmOrange.opacity(0.14))
                                        .frame(height: 5)
                                    Capsule()
                                        .fill(
                                            isOverLimit
                                            ? LinearGradient(colors: [Color(hex: "#EF4444"), Color(hex: "#F97316")], startPoint: .leading, endPoint: .trailing)
                                            : CalicoWidgetTheme.accentGradient
                                        )
                                        .frame(width: min(geo.size.width, geo.size.width * (entry.todayExpense / limit)), height: 5)
                                }
                            }
                            .frame(height: 5)
                            
                            Text("每日限額 $\(Int(limit))")
                                .font(.system(size: 9, weight: .semibold, design: .rounded))
                                .foregroundColor(.secondary)
                        }
                        .padding(9)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                        .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.warmOrange)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    
                    // 右側：月結餘與快速記帳玻璃卡 (同樣加上 20pt 頂部標頭使左右玻璃卡上下完全對齊)
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 4) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 9))
                                .foregroundColor(CalicoWidgetTheme.sageGreen)
                            Text("本月結餘")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoWidgetTheme.cocoaBrown)
                            Spacer(minLength: 0)
                            Text(rem >= 0 ? "尚餘 $\(rem)" : "超支 $\(abs(rem))")
                                .font(.system(size: 8.5, weight: .bold, design: .rounded))
                                .foregroundColor(rem >= 0 ? CalicoWidgetTheme.sageGreen : Color(hex: "#EF4444"))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1.5)
                                .background((rem >= 0 ? CalicoWidgetTheme.sageGreen : Color(hex: "#EF4444")).opacity(0.14))
                                .clipShape(Capsule())
                        }
                        .frame(height: 20)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("月累積結餘")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundColor(.secondary)
                            
                            Text("$\(Int(entry.monthBalance))")
                                .font(.system(size: 22, weight: .heavy, design: .rounded))
                                .foregroundColor(entry.monthBalance >= 0 ? CalicoWidgetTheme.sageGreen : Color(hex: "#EF4444"))
                                .minimumScaleFactor(0.75)
                                .lineLimit(1)
                            
                            Spacer(minLength: 0)
                            
                            // 三花貓漸層膠囊按鈕置於同高玻璃卡底部
                            HStack(spacing: 4) {
                                Image(systemName: "pawprint.fill")
                                    .font(.system(size: 9))
                                Text("點擊快速記帳")
                                    .font(.system(size: 10, weight: .bold, design: .rounded))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 5)
                            .background(CalicoWidgetTheme.accentGradient)
                            .clipShape(Capsule())
                        }
                        .padding(9)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                        .widgetGlassSubCard(cornerRadius: 11, tint: CalicoWidgetTheme.sageGreen)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .whiteWidgetStyle()
            
        default:
            EmptyView()
        }
    }
}

public struct ScheduleTimelineProvider: TimelineProvider {
    public init() {}
    public func placeholder(in context: Context) -> WidgetScheduleEntry {
        CampusSharedStore.shared.load(WidgetScheduleEntry.self, forKey: "campus_widget_schedule") ?? WidgetScheduleEntry()
    }
    
    public func getSnapshot(in context: Context, completion: @escaping (WidgetScheduleEntry) -> Void) {
        let entry = CampusSharedStore.shared.load(WidgetScheduleEntry.self, forKey: "campus_widget_schedule") ?? WidgetScheduleEntry()
        completion(entry)
    }
    
    public func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetScheduleEntry>) -> Void) {
        let cal = Calendar(identifier: .gregorian)
        let today = Date()
        let nextMidnight = cal.nextDate(after: today, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) ?? today.addingTimeInterval(3600)
        let refreshDate = min(today.addingTimeInterval(900), nextMidnight)
        
        if let originalEntry = CampusSharedStore.shared.load(WidgetScheduleEntry.self, forKey: "campus_widget_schedule") {
            let dfDate = DateFormatter()
            dfDate.dateFormat = "yyyy-MM-dd"
            let curCalWeekday = cal.component(.weekday, from: today)
            
            let updatedColumns = originalEntry.weeklyColumns.map { col in
                let isColToday: Bool
                if let colDate = dfDate.date(from: col.dateString) {
                    isColToday = cal.isDate(colDate, inSameDayAs: today)
                } else {
                    isColToday = (col.weekday == curCalWeekday)
                }
                return WidgetWeeklyDayColumn(
                    weekday: col.weekday,
                    weekdayName: col.weekdayName,
                    dayNumberString: col.dayNumberString,
                    dateString: col.dateString,
                    isToday: isColToday,
                    courses: col.courses,
                    todos: col.todos
                )
            }
            
            let resolvedTodayCourses: [WidgetTodayCourseDetail]
            if cal.isDate(originalEntry.date, inSameDayAs: today) {
                resolvedTodayCourses = originalEntry.todayCourses
            } else if let todayCol = updatedColumns.first(where: { $0.isToday }) ?? updatedColumns.first(where: { $0.weekday == curCalWeekday }) {
                resolvedTodayCourses = todayCol.courses.map { c in
                    let parts = c.timeSnippet.split(separator: "-").map { String($0).trimmingCharacters(in: .whitespaces) }
                    let st = parts.first ?? "08:10"
                    let et = parts.count > 1 ? parts[1] : "10:00"
                    return WidgetTodayCourseDetail(
                        id: c.id,
                        name: c.name,
                        classroom: c.classroom,
                        startTime: st,
                        endTime: et,
                        colorHex: c.colorHex
                    )
                }.sorted { $0.startTime < $1.startTime }
            } else {
                resolvedTodayCourses = originalEntry.todayCourses
            }
            
            let df = DateFormatter()
            df.dateFormat = "HH:mm"
            let nowStr = df.string(from: today)
            let remainingCourses = resolvedTodayCourses.filter { $0.endTime >= nowStr }
            let nextCourse = remainingCourses.first
            
            let entry = WidgetScheduleEntry(
                date: today,
                courseName: nextCourse?.name ?? (resolvedTodayCourses.isEmpty ? "今天無課程安排" : "今日課程已結束"),
                classroom: nextCourse?.classroom ?? "",
                time: nextCourse != nil ? "\(nextCourse!.startTime) - \(nextCourse!.endTime)" : "享受空堂時光",
                remainingCoursesCount: remainingCourses.count,
                todayCourses: resolvedTodayCourses,
                weeklyColumns: updatedColumns,
                reminders: originalEntry.reminders
            )
            
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
            return
        }
        
        // 本地無快照時，非同步從 Supabase 雲端獲取
        Task {
            let remoteCourses = await WidgetSupabaseService.shared.fetchCourses()
            let remoteTodos = await WidgetSupabaseService.shared.fetchTodos()
            
            let weekday = WeekDayHelper.from(date: today)
            let todayRemote = remoteCourses.filter { $0.day_of_week == weekday }
            
            let todayDetails: [WidgetTodayCourseDetail] = todayRemote.map { c in
                WidgetTodayCourseDetail(
                    id: c.id,
                    name: c.name,
                    classroom: c.classroom ?? "",
                    startTime: c.start_time,
                    endTime: c.end_time,
                    colorHex: c.color_hex ?? "#4F46E5"
                )
            }
            
            let todoDetails: [WidgetTodoItemDetail] = remoteTodos.map { t in
                WidgetTodoItemDetail(
                    id: t.id,
                    title: t.title,
                    countdownText: "待完成",
                    isPriority: t.priority == "high"
                )
            }
            
            let df = DateFormatter()
            df.dateFormat = "HH:mm"
            let nowStr = df.string(from: Date())
            let remainingCoursesRemote = todayRemote.filter { ($0.end_time ?? "") >= nowStr }
            let firstCourse = remainingCoursesRemote.first
            let entry = WidgetScheduleEntry(
                date: today,
                courseName: firstCourse?.name ?? (todayRemote.isEmpty ? "今天無課程安排" : "今日課程已結束"),
                classroom: firstCourse?.classroom ?? "",
                time: firstCourse != nil ? "\(firstCourse!.start_time) - \(firstCourse!.end_time)" : "享受空堂時光",
                remainingCoursesCount: remainingCoursesRemote.count,
                todayCourses: todayDetails,
                weeklyColumns: [],
                reminders: todoDetails
            )
            CampusSharedStore.shared.save(entry, forKey: "campus_widget_schedule")
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }
}

public struct WeeklyScheduleTimelineProvider: TimelineProvider {
    public init() {}
    public func placeholder(in context: Context) -> WidgetWeeklyScheduleEntry {
        CampusSharedStore.shared.load(WidgetWeeklyScheduleEntry.self, forKey: "campus_widget_weekly_schedule") ?? WidgetWeeklyScheduleEntry()
    }
    
    public func getSnapshot(in context: Context, completion: @escaping (WidgetWeeklyScheduleEntry) -> Void) {
        let entry = CampusSharedStore.shared.load(WidgetWeeklyScheduleEntry.self, forKey: "campus_widget_weekly_schedule") ?? WidgetWeeklyScheduleEntry()
        completion(entry)
    }
    
    public func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetWeeklyScheduleEntry>) -> Void) {
        let cal = Calendar(identifier: .gregorian)
        let today = Date()
        let nextMidnight = cal.nextDate(after: today, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) ?? today.addingTimeInterval(3600)
        let refreshDate = min(today.addingTimeInterval(900), nextMidnight)
        
        if let originalEntry = CampusSharedStore.shared.load(WidgetWeeklyScheduleEntry.self, forKey: "campus_widget_weekly_schedule") {
            let dfDate = DateFormatter()
            dfDate.dateFormat = "yyyy-MM-dd"
            let curWeekday = cal.component(.weekday, from: today)
            
            let updatedColumns = originalEntry.columns.map { col in
                let isColToday: Bool
                if let colDate = dfDate.date(from: col.dateString) {
                    isColToday = cal.isDate(colDate, inSameDayAs: today)
                } else {
                    isColToday = (col.weekday == curWeekday)
                }
                return WidgetWeeklyDayColumn(
                    weekday: col.weekday,
                    weekdayName: col.weekdayName,
                    dayNumberString: col.dayNumberString,
                    dateString: col.dateString,
                    isToday: isColToday,
                    courses: col.courses,
                    todos: col.todos
                )
            }
            
            let resolvedTodayCourses: [WidgetTodayCourseDetail]
            if cal.isDate(originalEntry.date, inSameDayAs: today) {
                resolvedTodayCourses = originalEntry.todayCourses
            } else if let todayCol = updatedColumns.first(where: { $0.isToday }) ?? updatedColumns.first(where: { $0.weekday == curWeekday }) {
                resolvedTodayCourses = todayCol.courses.map { c in
                    let parts = c.timeSnippet.split(separator: "-").map { String($0).trimmingCharacters(in: .whitespaces) }
                    let st = parts.first ?? "08:10"
                    let et = parts.count > 1 ? parts[1] : "10:00"
                    return WidgetTodayCourseDetail(
                        id: c.id,
                        name: c.name,
                        classroom: c.classroom,
                        startTime: st,
                        endTime: et,
                        colorHex: c.colorHex
                    )
                }.sorted { $0.startTime < $1.startTime }
            } else {
                resolvedTodayCourses = originalEntry.todayCourses
            }
            
            let updatedEntry = WidgetWeeklyScheduleEntry(
                date: today,
                weekTitle: originalEntry.weekTitle,
                currentWeekday: WeekDayHelper.from(date: today),
                quote: originalEntry.quote,
                columns: updatedColumns,
                todayCourses: resolvedTodayCourses,
                reminders: originalEntry.reminders
            )
            let timeline = Timeline(entries: [updatedEntry], policy: .after(refreshDate))
            completion(timeline)
            return
        }
        
        Task {
            let remoteCourses = await WidgetSupabaseService.shared.fetchCourses()
            let remoteTodos = await WidgetSupabaseService.shared.fetchTodos()
            
            // 取得本週日的日期 (日一二三四五六 排列)
            let currentWeekdayComp = cal.component(.weekday, from: today) // 1=Sun..7=Sat
            let daysFromSunday = currentWeekdayComp - 1
            let sundayDate = cal.date(byAdding: .day, value: -daysFromSunday, to: cal.startOfDay(for: today)) ?? today
            
            let weekdaysNames = ["日", "一", "二", "三", "四", "五", "六"]
            let dfDate = DateFormatter()
            dfDate.dateFormat = "yyyy-MM-dd"
            let dfDayNum = DateFormatter()
            dfDayNum.dateFormat = "d"
            
            var columns: [WidgetWeeklyDayColumn] = []
            for i in 0..<7 {
                let colDate = cal.date(byAdding: .day, value: i, to: sundayDate) ?? today
                let calWeekday = cal.component(.weekday, from: colDate) // 1=Sun..7=Sat
                // 轉換為 WeekDay rawValue (1=Mon..7=Sun)
                let appWeekday = calWeekday == 1 ? 7 : calWeekday - 1
                let colCourses = remoteCourses.filter { $0.day_of_week == appWeekday }.map { c in
                    WidgetWeeklyCourseItem(
                        id: c.id,
                        name: c.name,
                        classroom: c.classroom ?? "",
                        timeSnippet: "\(c.start_time)-\(c.end_time)",
                        colorHex: c.color_hex ?? "#4F46E5",
                        weekday: appWeekday
                    )
                }
                
                // 該日之待辦 (支援單日到期與自訂週期)
                let colDateStr = dfDate.string(from: colDate)
                let dayTodos = remoteTodos.filter { t in
                    guard t.is_completed != true else { return false }
                    if let start = t.start_date, let due = t.due_date {
                        let startPrefix = String(start.prefix(10))
                        let duePrefix = String(due.prefix(10))
                        return colDateStr >= startPrefix && colDateStr <= duePrefix
                    } else if let due = t.due_date {
                        return due.contains(colDateStr)
                    }
                    return false
                }
                let colTodos: [WidgetTodoItemDetail] = dayTodos.map { t in
                    WidgetTodoItemDetail(
                        id: t.id,
                        title: t.title,
                        countdownText: t.start_date != nil ? "進行中" : "待辦",
                        isPriority: t.priority == "high",
                        categoryColorHex: t.custom_category_color_hex ?? "#4F46E5",
                        isCompleted: false
                    )
                }
                
                columns.append(WidgetWeeklyDayColumn(
                    weekday: calWeekday,
                    weekdayName: weekdaysNames[i],
                    dayNumberString: dfDayNum.string(from: colDate),
                    dateString: colDateStr,
                    isToday: cal.isDate(colDate, inSameDayAs: today),
                    courses: colCourses,
                    todos: colTodos
                ))
            }
            
            let currentWeekday = WeekDayHelper.from(date: today)
            let todayRemote = remoteCourses.filter { $0.day_of_week == currentWeekday }
            let todayDetails: [WidgetTodayCourseDetail] = todayRemote.map { c in
                WidgetTodayCourseDetail(
                    id: c.id,
                    name: c.name,
                    classroom: c.classroom ?? "",
                    startTime: c.start_time,
                    endTime: c.end_time,
                    colorHex: c.color_hex ?? "#4F46E5"
                )
            }
            
            let todoDetails: [WidgetTodoItemDetail] = remoteTodos.map { t in
                WidgetTodoItemDetail(
                    id: t.id,
                    title: t.title,
                    countdownText: "待完成",
                    isPriority: t.priority == "high"
                )
            }
            
            let entry = WidgetWeeklyScheduleEntry(
                date: today,
                weekTitle: "一週課表全覽",
                currentWeekday: currentWeekday,
                quote: "",
                columns: columns,
                todayCourses: todayDetails,
                reminders: todoDetails
            )
            CampusSharedStore.shared.save(entry, forKey: "campus_widget_weekly_schedule")
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }
}

public struct TodoTimelineProvider: TimelineProvider {
    public init() {}
    public func placeholder(in context: Context) -> WidgetTodoEntry {
        CampusSharedStore.shared.load(WidgetTodoEntry.self, forKey: "campus_widget_todo") ?? WidgetTodoEntry()
    }
    public func getSnapshot(in context: Context, completion: @escaping (WidgetTodoEntry) -> Void) {
        let entry = CampusSharedStore.shared.load(WidgetTodoEntry.self, forKey: "campus_widget_todo") ?? WidgetTodoEntry()
        completion(entry)
    }
    public func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetTodoEntry>) -> Void) {
        if let entry = CampusSharedStore.shared.load(WidgetTodoEntry.self, forKey: "campus_widget_todo") {
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
            completion(timeline)
            return
        }
        
        Task {
            let remoteTodos = await WidgetSupabaseService.shared.fetchTodos()
            let todoDetails: [WidgetTodoItemDetail] = remoteTodos.map { t in
                WidgetTodoItemDetail(
                    id: t.id,
                    title: t.title,
                    countdownText: "待完成",
                    isPriority: t.priority == "high"
                )
            }
            let first = todoDetails.first
            let entry = WidgetTodoEntry(
                date: Date(),
                urgentTodoTitle: first?.title ?? "待辦事項已全數完成",
                countdownText: first?.countdownText ?? "無倒數",
                pendingTotalCount: todoDetails.count,
                items: todoDetails
            )
            CampusSharedStore.shared.save(entry, forKey: "campus_widget_todo")
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
            completion(timeline)
        }
    }
}

public struct AccountingTimelineProvider: TimelineProvider {
    public init() {}
    public func placeholder(in context: Context) -> WidgetAccountingEntry {
        CampusSharedStore.shared.load(WidgetAccountingEntry.self, forKey: "campus_widget_accounting") ?? WidgetAccountingEntry()
    }
    public func getSnapshot(in context: Context, completion: @escaping (WidgetAccountingEntry) -> Void) {
        let entry = CampusSharedStore.shared.load(WidgetAccountingEntry.self, forKey: "campus_widget_accounting") ?? WidgetAccountingEntry()
        completion(entry)
    }
    public func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetAccountingEntry>) -> Void) {
        let entry = CampusSharedStore.shared.load(WidgetAccountingEntry.self, forKey: "campus_widget_accounting") ?? WidgetAccountingEntry()
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
        completion(timeline)
    }
}

public struct CalendarTimelineProvider: TimelineProvider {
    public init() {}
    
    public static func generateCalendarDays(for date: Date, entry: WidgetCalendarEntry? = nil) -> [WidgetCalendarDay] {
        let cal = Calendar(identifier: .gregorian)
        guard let monthInterval = cal.dateInterval(of: .month, for: date),
              let daysRange = cal.range(of: .day, in: .month, for: date) else {
            return []
        }
        let startOfMonth = monthInterval.start
        let firstWeekday = cal.component(.weekday, from: startOfMonth) // 1=Sun..7=Sat
        let prefixCount = (firstWeekday - 1)
        
        var result: [WidgetCalendarDay] = []
        
        // 上個月底部的補齊日期（灰底，但數字正常顯示）
        for p in 0..<prefixCount {
            if let prevDate = cal.date(byAdding: .day, value: -(prefixCount - p), to: startOfMonth) {
                let dayNum = cal.component(.day, from: prevDate)
                result.append(WidgetCalendarDay(
                    dayNumber: max(1, dayNum),
                    isCurrentMonth: false,
                    isToday: false
                ))
            }
        }
        
        // 當月所有日期
        let currentDayNum = cal.component(.day, from: date)
        let isSameMonthAsToday = cal.isDate(date, equalTo: Date(), toGranularity: .month)
        
        for dayNum in 1...daysRange.count {
            let isToday = isSameMonthAsToday && (dayNum == currentDayNum)
            let existingDay = entry?.days.first(where: { $0.isCurrentMonth && $0.dayNumber == dayNum })
            result.append(WidgetCalendarDay(
                dayNumber: dayNum,
                isCurrentMonth: true,
                isToday: isToday,
                hasCourse: existingDay?.hasCourse ?? false,
                hasTodo: existingDay?.hasTodo ?? false,
                eventTag: existingDay?.eventTag
            ))
        }
        
        // 下個月開頭的補齊日期（灰底，正常接續 1, 2, 3, 4...）
        var nextMonthDay = 1
        while result.count % 7 != 0 {
            result.append(WidgetCalendarDay(
                dayNumber: nextMonthDay,
                isCurrentMonth: false,
                isToday: false
            ))
            nextMonthDay += 1
        }
        
        return result
    }
    
    private func sanitizeEntry(_ raw: WidgetCalendarEntry, date: Date) -> WidgetCalendarEntry {
        let cal = Calendar(identifier: .gregorian)
        let currentMonth = cal.component(.month, from: date)
        let currentYear = cal.component(.year, from: date)
        let currentDayNum = cal.component(.day, from: date)
        
        let needsRegenerate = raw.days.isEmpty ||
                              raw.days.contains(where: { $0.dayNumber <= 0 }) ||
                              raw.month != currentMonth ||
                              raw.year != currentYear
                              
        let validDays: [WidgetCalendarDay]
        if needsRegenerate {
            validDays = Self.generateCalendarDays(for: date, entry: raw)
        } else {
            validDays = raw.days.map { day in
                let isDayToday = (day.isCurrentMonth && day.dayNumber == currentDayNum)
                return WidgetCalendarDay(
                    id: day.id,
                    dayNumber: max(1, day.dayNumber),
                    isCurrentMonth: day.isCurrentMonth,
                    isToday: isDayToday,
                    hasCourse: day.hasCourse,
                    hasTodo: day.hasTodo,
                    eventTag: day.eventTag
                )
            }
        }
        
        return WidgetCalendarEntry(
            date: date,
            year: currentYear,
            month: currentMonth,
            monthTitle: "\(currentYear)年\(currentMonth)月",
            yearProgressPercent: raw.yearProgressPercent,
            daysRemainingInYear: raw.daysRemainingInYear,
            days: validDays,
            todayScheduleSummary: raw.todayScheduleSummary,
            todayTodoSummary: raw.todayTodoSummary,
            todayExpenseAmount: raw.todayExpenseAmount,
            courses: raw.courses,
            todos: raw.todos
        )
    }
    
    public func placeholder(in context: Context) -> WidgetCalendarEntry {
        let raw = CampusSharedStore.shared.load(WidgetCalendarEntry.self, forKey: "campus_widget_calendar") ?? WidgetCalendarEntry()
        return sanitizeEntry(raw, date: Date())
    }
    
    public func getSnapshot(in context: Context, completion: @escaping (WidgetCalendarEntry) -> Void) {
        let raw = CampusSharedStore.shared.load(WidgetCalendarEntry.self, forKey: "campus_widget_calendar") ?? WidgetCalendarEntry()
        completion(sanitizeEntry(raw, date: Date()))
    }
    
    public func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetCalendarEntry>) -> Void) {
        let cal = Calendar(identifier: .gregorian)
        let today = Date()
        let nextMidnight = cal.nextDate(after: today, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) ?? today.addingTimeInterval(3600)
        let refreshDate = min(today.addingTimeInterval(900), nextMidnight)
        
        let raw = CampusSharedStore.shared.load(WidgetCalendarEntry.self, forKey: "campus_widget_calendar") ?? WidgetCalendarEntry()
        let updatedEntry = sanitizeEntry(raw, date: today)
        CampusSharedStore.shared.save(updatedEntry, forKey: "campus_widget_calendar")
        
        let timeline = Timeline(entries: [updatedEntry], policy: .after(refreshDate))
        completion(timeline)
    }
}

// MARK: - 星期輔助計算
private enum WeekDayHelper {
    static func from(date: Date) -> Int {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)
        switch weekday {
        case 2: return 1
        case 3: return 2
        case 4: return 3
        case 5: return 4
        case 6: return 5
        case 7: return 6
        case 1: return 7
        default: return 1
        }
    }
}

// MARK: - Widget Configurations (支援一週課表、一週待辦、今日行程、行事曆與記帳)

public struct CampusScheduleWidget: Widget {
    public let kind: String = "CampusScheduleWidget"
    public init() {}
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ScheduleTimelineProvider()) { entry in
            ScheduleWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("課表與今日行程")
        .description("在桌面或鎖定畫面查看今日課程安排、上課時段與教室。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryCircular, .accessoryInline])
        .contentMarginsDisabled()
    }
}

public struct CampusWeeklyScheduleWidget: Widget {
    public let kind: String = "CampusWeeklyScheduleWidget"
    public init() {}
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeeklyScheduleTimelineProvider()) { entry in
            CampusWeeklyScheduleWidgetView(entry: entry)
        }
        .configurationDisplayName("一週課表全覽")
        .description("桌面全覽週日至週六 7 天課表，鎖定畫面顯示 7 日排課熱度矩陣。")
        .supportedFamilies([.systemMedium, .systemLarge, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

public struct CampusWeeklyTodoWidget: Widget {
    public let kind: String = "CampusWeeklyTodoWidget"
    public init() {}
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeeklyScheduleTimelineProvider()) { entry in
            CampusWeeklyTodoWidgetView(entry: entry)
        }
        .configurationDisplayName("一週待辦周曆")
        .description("總覽週日至週六 7 天作業與考試待辦，鎖定畫面顯示 7 日待辦矩陣。")
        .supportedFamilies([.systemMedium, .systemLarge, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

public struct CampusTodoWidget: Widget {
    public let kind: String = "CampusTodoWidget"
    public init() {}
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodoTimelineProvider()) { entry in
            TodoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("提醒事項與作業")
        .description("在桌面或鎖定畫面追蹤未完成作業、待辦與倒數。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline, .accessoryCircular])
        .contentMarginsDisabled()
    }
}

public struct CampusAccountingWidget: Widget {
    public let kind: String = "CampusAccountingWidget"
    public init() {}
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AccountingTimelineProvider()) { entry in
            AccountingQuickWidgetView(entry: entry)
        }
        .configurationDisplayName("今日開銷與記帳")
        .description("掌握今日花費與當月結餘，支援自訂限額與點擊記帳。")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline, .accessoryCircular])
        .contentMarginsDisabled()
    }
}

public struct CampusCalendarWidget: Widget {
    public let kind: String = "CampusCalendarWidget"
    public init() {}
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CalendarTimelineProvider()) { entry in
            CampusCalendarWidgetView(entry: entry)
        }
        .configurationDisplayName("月曆與年進度")
        .description("總覽整月日程、非本月灰底顯示，整合今日排課、待辦與花費。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryCircular, .accessoryInline])
        .contentMarginsDisabled()
    }
}

// MARK: - Widget Bundle
@main
public struct CampusWidgetsBundle: WidgetBundle {
    public init() {}
    public var body: some Widget {
        CampusWeeklyScheduleWidget()
        CampusWeeklyTodoWidget()
        CampusScheduleWidget()
        CampusTodoWidget()
        CampusCalendarWidget()
        CampusAccountingWidget()
    }
}
