//
//  TodoItem.swift
//  Campus v1
//

import Foundation
import SwiftUI

public enum TodoPriority: String, CaseIterable, Codable, Identifiable {
    case low = "low"
    case medium = "medium"
    case high = "high"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .low: return "低"
        case .medium: return "中"
        case .high: return "高"
        }
    }
    
    public var color: Color {
        switch self {
        case .low: return .gray
        case .medium: return .blue
        case .high: return .red
        }
    }
}

public enum ReadingStatus: String, CaseIterable, Codable, Identifiable {
    case unread = "未讀"
    case reading = "閱讀中"
    case completed = "已讀畢"
    
    public var id: String { rawValue }
    
    public var color: Color {
        switch self {
        case .unread: return .gray
        case .reading: return .blue
        case .completed: return .green
        }
    }
}

public enum TodoCategory: String, CaseIterable, Codable, Identifiable {
    case assignment = "作業"
    case exam = "考試"
    case paper = "待讀論文"
    case project = "專案"
    case todo = "待辦"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .assignment: return "book.closed.fill"
        case .exam: return "pencil.and.ruler.fill"
        case .paper: return "books.vertical.fill"
        case .project: return "folder.fill"
        case .todo: return "checklist"
        }
    }
    
    public var badgeColor: Color {
        switch self {
        case .assignment: return Color.indigo
        case .exam: return Color.orange
        case .paper: return Color.teal
        case .project: return Color.cyan
        case .todo: return Color.purple
        }
    }
}

public struct TodoItem: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var title: String
    public var notes: String
    public var startDate: Date? // 自訂週期開始時間
    public var dueDate: Date?   // 截止時間 / 自訂週期結束時間
    public var isCompleted: Bool
    public var priority: TodoPriority
    public var category: TodoCategory
    public var customCategoryName: String?
    public var customCategoryColorHex: String?
    public var completedAt: Date?
    public var courseId: UUID?
    public var paperAuthors: String?
    public var paperURL: String?
    public var readingStatus: ReadingStatus?
    public var createdAt: Date?
    public var isSharedWithFriends: Bool
    public var deviceId: String?
    public var hasReminder: Bool
    public var reminderDate: Date?
    public var remind1DayBefore: Bool
    public var remind3DaysBefore: Bool

    // MARK: - 自訂週期與時間區間輔助
    public var isPeriod: Bool {
        return startDate != nil && dueDate != nil
    }
    
    public var periodText: String? {
        guard let start = startDate, let due = dueDate else { return nil }
        let calendar = Calendar.current
        let df = DateFormatter()
        
        if calendar.isDate(start, inSameDayAs: due) {
            df.dateFormat = "M/d HH:mm"
            let startStr = df.string(from: start)
            let timeDf = DateFormatter()
            timeDf.dateFormat = "HH:mm"
            return "\(startStr) - \(timeDf.string(from: due))"
        } else {
            df.dateFormat = "M/d"
            return "\(df.string(from: start)) 至 \(df.string(from: due))"
        }
    }
    
    public var displayCategoryName: String {
        return customCategoryName ?? category.rawValue
    }
    
    public var displayCategoryColorHex: String {
        return customCategoryColorHex ?? {
            switch category {
            case .assignment: return "E74C3C"
            case .exam: return "E67E22"
            case .paper: return "3498DB"
            case .project: return "9B59B6"
            case .todo: return "95A5A6"
            }
        }()
    }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case notes
        case startDate = "start_date"
        case dueDate = "due_date"
        case isCompleted = "is_completed"
        case priority
        case category
        case customCategoryName = "custom_category_name"
        case customCategoryColorHex = "custom_category_color_hex"
        case completedAt = "completed_at"
        case courseId = "course_id"
        case paperAuthors = "paper_authors"
        case paperURL = "paper_url"
        case readingStatus = "reading_status"
        case createdAt = "created_at"
        case isSharedWithFriends = "is_shared_with_friends"
        case deviceId = "device_id"
        case hasReminder = "has_reminder"
        case reminderDate = "reminder_date"
        case remind1DayBefore = "remind_1_day_before"
        case remind3DaysBefore = "remind_3_days_before"
    }

    public init(
        id: UUID = UUID(),
        title: String,
        notes: String = "",
        startDate: Date? = nil,
        dueDate: Date? = nil,
        isCompleted: Bool = false,
        priority: TodoPriority = .medium,
        category: TodoCategory = .assignment,
        customCategoryName: String? = nil,
        customCategoryColorHex: String? = nil,
        completedAt: Date? = nil,
        courseId: UUID? = nil,
        paperAuthors: String? = nil,
        paperURL: String? = nil,
        readingStatus: ReadingStatus? = nil,
        createdAt: Date? = Date(),
        isSharedWithFriends: Bool = true,
        deviceId: String? = nil,
        hasReminder: Bool = false,
        reminderDate: Date? = nil,
        remind1DayBefore: Bool = true,
        remind3DaysBefore: Bool = true
    ) {
        self.id = id
        self.title = title
        self.notes = notes
        self.startDate = startDate
        self.dueDate = dueDate
        self.isCompleted = isCompleted
        self.priority = priority
        self.category = category
        self.customCategoryName = customCategoryName
        self.customCategoryColorHex = customCategoryColorHex
        self.completedAt = completedAt
        self.courseId = courseId
        self.paperAuthors = paperAuthors
        self.paperURL = paperURL
        self.readingStatus = readingStatus
        self.createdAt = createdAt
        self.isSharedWithFriends = isSharedWithFriends
        self.deviceId = deviceId
        self.hasReminder = hasReminder
        self.reminderDate = reminderDate
        self.remind1DayBefore = remind1DayBefore
        self.remind3DaysBefore = remind3DaysBefore
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        notes = try container.decodeIfPresent(String.self, forKey: .notes) ?? ""
        startDate = (try? container.decodeIfPresent(Date.self, forKey: .startDate)) ?? nil
        dueDate = (try? container.decodeIfPresent(Date.self, forKey: .dueDate)) ?? nil
        isCompleted = try container.decodeIfPresent(Bool.self, forKey: .isCompleted) ?? false
        priority = try container.decodeIfPresent(TodoPriority.self, forKey: .priority) ?? .medium
        category = try container.decodeIfPresent(TodoCategory.self, forKey: .category) ?? .assignment
        customCategoryName = try? container.decodeIfPresent(String.self, forKey: .customCategoryName)
        customCategoryColorHex = try? container.decodeIfPresent(String.self, forKey: .customCategoryColorHex)
        completedAt = (try? container.decodeIfPresent(Date.self, forKey: .completedAt)) ?? nil
        courseId = try container.decodeIfPresent(UUID.self, forKey: .courseId)
        paperAuthors = try container.decodeIfPresent(String.self, forKey: .paperAuthors)
        paperURL = try container.decodeIfPresent(String.self, forKey: .paperURL)
        readingStatus = try container.decodeIfPresent(ReadingStatus.self, forKey: .readingStatus)
        createdAt = (try? container.decodeIfPresent(Date.self, forKey: .createdAt)) ?? nil
        isSharedWithFriends = try container.decodeIfPresent(Bool.self, forKey: .isSharedWithFriends) ?? true
        deviceId = try? container.decodeIfPresent(String.self, forKey: .deviceId)
        hasReminder = try container.decodeIfPresent(Bool.self, forKey: .hasReminder) ?? false
        reminderDate = (try? container.decodeIfPresent(Date.self, forKey: .reminderDate)) ?? nil
        remind1DayBefore = (try? container.decodeIfPresent(Bool.self, forKey: .remind1DayBefore)) ?? true
        remind3DaysBefore = (try? container.decodeIfPresent(Bool.self, forKey: .remind3DaysBefore)) ?? true
    }
    
    // MARK: - 倒數日與週期狀態計算
    public var countdownDays: Int? {
        guard let dueDate = dueDate else { return nil }
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        let startOfDue = calendar.startOfDay(for: dueDate)
        let components = calendar.dateComponents([.day], from: startOfToday, to: startOfDue)
        return components.day
    }
    
    public var isOverdue: Bool {
        guard let days = countdownDays else { return false }
        return !isCompleted && days < 0
    }
    
    public var countdownBadgeText: String {
        guard let dueDate = dueDate else { return "無期限" }
        let now = Date()
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: now)
        let startOfDue = calendar.startOfDay(for: dueDate)
        
        if let start = startDate {
            let startOfStart = calendar.startOfDay(for: start)
            if startOfToday < startOfStart {
                let diff = calendar.dateComponents([.day], from: startOfToday, to: startOfStart).day ?? 0
                return "\(diff) 天後開始"
            } else if startOfToday <= startOfDue {
                let diff = calendar.dateComponents([.day], from: startOfToday, to: startOfDue).day ?? 0
                if diff == 0 {
                    return "今日結束"
                } else {
                    return "進行中 · 剩 \(diff) 天"
                }
            } else {
                let overdue = calendar.dateComponents([.day], from: startOfDue, to: startOfToday).day ?? 0
                return "已逾期 \(overdue) 天"
            }
        }
        
        guard let days = countdownDays else { return "無期限" }
        if days < 0 {
            return "逾期 \(-days) 天"
        } else if days == 0 {
            return "今天到期"
        } else if days == 1 {
            return "明天到期"
        } else {
            return "還有 \(days) 天"
        }
    }
    
    public var countdownColor: Color {
        if isCompleted { return .secondary }
        guard let dueDate = dueDate else { return .secondary }
        let now = Date()
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: now)
        let startOfDue = calendar.startOfDay(for: dueDate)
        
        if let start = startDate {
            let startOfStart = calendar.startOfDay(for: start)
            if startOfToday < startOfStart {
                return .blue
            } else if startOfToday <= startOfDue {
                let diff = calendar.dateComponents([.day], from: startOfToday, to: startOfDue).day ?? 0
                if diff == 0 { return .orange }
                return .indigo
            } else {
                return .red
            }
        }
        
        guard let days = countdownDays else { return .secondary }
        if days < 0 {
            return .red
        } else if days == 0 {
            return .orange
        } else if days <= 2 {
            return .yellow
        } else {
            return .indigo
        }
    }
}
