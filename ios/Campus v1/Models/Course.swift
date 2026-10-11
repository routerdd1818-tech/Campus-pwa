//
//  Course.swift
//  Campus v1
//

import Foundation
import SwiftUI

public enum WeekDay: Int, CaseIterable, Codable, Identifiable {
    case monday = 1
    case tuesday = 2
    case wednesday = 3
    case thursday = 4
    case friday = 5
    case saturday = 6
    case sunday = 7
    
    public var id: Int { rawValue }
    
    public var shortName: String {
        switch self {
        case .monday: return "週一"
        case .tuesday: return "週二"
        case .wednesday: return "週三"
        case .thursday: return "週四"
        case .friday: return "週五"
        case .saturday: return "週六"
        case .sunday: return "週日"
        }
    }
    
    public var englishShort: String {
        switch self {
        case .monday: return "Mon"
        case .tuesday: return "Tue"
        case .wednesday: return "Wed"
        case .thursday: return "Thu"
        case .friday: return "Fri"
        case .saturday: return "Sat"
        case .sunday: return "Sun"
        }
    }
    
    /// 取得指定日期的 WeekDay (Calendar 預設週日為 1，此處轉換為週一=1 ... 週日=7)
    public static func from(date: Date) -> WeekDay {
        let calendar = Calendar.current
        let weekdayIndex = calendar.component(.weekday, from: date)
        // Apple Calendar: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
        switch weekdayIndex {
        case 1: return .sunday
        case 2: return .monday
        case 3: return .tuesday
        case 4: return .wednesday
        case 5: return .thursday
        case 6: return .friday
        case 7: return .saturday
        default: return .monday
        }
    }
}

public struct Course: Identifiable, Codable, Equatable, Hashable {
    public var id: UUID
    public var name: String
    public var code: String
    public var classroom: String
    public var instructor: String
    public var dayOfWeek: Int // 1...7
    public var startTime: String // "09:00"
    public var endTime: String // "10:50"
    public var colorHex: String
    public var createdAt: Date?
    public var isSharedWithFriends: Bool
    public var deviceId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case code
        case classroom
        case instructor
        case dayOfWeek = "day_of_week"
        case startTime = "start_time"
        case endTime = "end_time"
        case colorHex = "color_hex"
        case createdAt = "created_at"
        case isSharedWithFriends = "is_shared_with_friends"
        case deviceId = "device_id"
    }

    public init(
        id: UUID = UUID(),
        name: String,
        code: String = "",
        classroom: String = "",
        instructor: String = "",
        dayOfWeek: Int = 1,
        startTime: String = "09:00",
        endTime: String = "10:50",
        colorHex: String = "#4F46E5",
        createdAt: Date? = Date(),
        isSharedWithFriends: Bool = true,
        deviceId: String? = nil
    ) {
        self.id = id
        self.name = name
        self.code = code
        self.classroom = classroom
        self.instructor = instructor
        self.dayOfWeek = dayOfWeek
        self.startTime = startTime
        self.endTime = endTime
        self.colorHex = colorHex
        self.createdAt = createdAt
        self.isSharedWithFriends = isSharedWithFriends
        self.deviceId = deviceId
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        code = try container.decodeIfPresent(String.self, forKey: .code) ?? ""
        classroom = try container.decodeIfPresent(String.self, forKey: .classroom) ?? ""
        instructor = try container.decodeIfPresent(String.self, forKey: .instructor) ?? ""
        dayOfWeek = try container.decode(Int.self, forKey: .dayOfWeek)
        startTime = try container.decode(String.self, forKey: .startTime)
        endTime = try container.decode(String.self, forKey: .endTime)
        colorHex = (try? container.decodeIfPresent(String.self, forKey: .colorHex)) ?? "#4F46E5"
        createdAt = (try? container.decodeIfPresent(Date.self, forKey: .createdAt)) ?? nil
        isSharedWithFriends = try container.decodeIfPresent(Bool.self, forKey: .isSharedWithFriends) ?? true
        deviceId = try? container.decodeIfPresent(String.self, forKey: .deviceId)
    }
    
    public var weekday: WeekDay {
        WeekDay(rawValue: dayOfWeek) ?? .monday
    }
    
    public var color: Color {
        Color(hex: colorHex)
    }
}
