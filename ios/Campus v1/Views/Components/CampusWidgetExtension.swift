//
//  CampusWidgetExtension.swift
//  Campus v1
//
//  Created for Campus v1 (可樂助手).
//

import SwiftUI
import WidgetKit

// MARK: - 輔助 Color Hex 擴展 (若未定義)
extension Color {
    fileprivate init(widgetHex: String) {
        let hex = widgetHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
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

// MARK: - Widget 共享快照資料結構 (與 CampusWidget 保持完全一致)

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
