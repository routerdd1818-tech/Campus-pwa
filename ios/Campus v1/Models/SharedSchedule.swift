//
//  SharedSchedule.swift
//  Campus v1
//

import Foundation

public struct SharedSchedule: Identifiable, Codable, Equatable {
    public var id: String { shareCode }
    public var shareCode: String
    public var ownerName: String
    public var isSharingEnabled: Bool
    public var coursesData: [Course]
    public var todosData: [TodoItem]
    public var accountingData: [TransactionItem]
    public var isExpenseSharingEnabled: Bool
    public var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case shareCode = "share_code"
        case ownerName = "owner_name"
        case isSharingEnabled = "is_sharing_enabled"
        case coursesData = "courses_data"
        case todosData = "todos_data"
        case accountingData = "accounting_data"
        case isExpenseSharingEnabled = "is_expense_sharing_enabled"
        case updatedAt = "updated_at"
    }
    
    public init(
        shareCode: String,
        ownerName: String,
        isSharingEnabled: Bool = true,
        coursesData: [Course] = [],
        todosData: [TodoItem] = [],
        accountingData: [TransactionItem] = [],
        isExpenseSharingEnabled: Bool = true,
        updatedAt: Date? = Date()
    ) {
        self.shareCode = shareCode
        self.ownerName = ownerName
        self.isSharingEnabled = isSharingEnabled
        self.coursesData = coursesData
        self.todosData = todosData
        self.accountingData = accountingData
        self.isExpenseSharingEnabled = isExpenseSharingEnabled
        self.updatedAt = updatedAt
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        shareCode = try container.decode(String.self, forKey: .shareCode)
        ownerName = try container.decode(String.self, forKey: .ownerName)
        isSharingEnabled = (try? container.decodeIfPresent(Bool.self, forKey: .isSharingEnabled)) ?? true
        
        if let courses = try? container.decodeIfPresent([Course].self, forKey: .coursesData) {
            coursesData = courses
        } else if let jsonStr = try? container.decodeIfPresent(String.self, forKey: .coursesData),
                  let data = jsonStr.data(using: .utf8),
                  let courses = try? JSONDecoder().decode([Course].self, from: data) {
            coursesData = courses
        } else {
            coursesData = []
        }
        
        if let todos = try? container.decodeIfPresent([TodoItem].self, forKey: .todosData) {
            todosData = todos
        } else if let jsonStr = try? container.decodeIfPresent(String.self, forKey: .todosData),
                  let data = jsonStr.data(using: .utf8),
                  let todos = try? JSONDecoder().decode([TodoItem].self, from: data) {
            todosData = todos
        } else {
            todosData = []
        }
        
        if let acc = try? container.decodeIfPresent([TransactionItem].self, forKey: .accountingData) {
            accountingData = acc
        } else if let jsonStr = try? container.decodeIfPresent(String.self, forKey: .accountingData),
                  let data = jsonStr.data(using: .utf8),
                  let acc = try? JSONDecoder().decode([TransactionItem].self, from: data) {
            accountingData = acc
        } else {
            accountingData = []
        }
        
        isExpenseSharingEnabled = (try? container.decodeIfPresent(Bool.self, forKey: .isExpenseSharingEnabled)) ?? true
        updatedAt = try? container.decodeIfPresent(Date.self, forKey: .updatedAt)
    }
}

// MARK: - 好友分享記錄簿項目 (免重複輸入 6 碼分享代碼，課表與記帳共用)
public struct SavedFriendRecord: Identifiable, Codable, Equatable {
    public var id: String { shareCode }
    public var shareCode: String
    public var ownerName: String
    public var nickname: String
    public var coursesCount: Int
    public var accountingCount: Int
    public var lastViewedAt: Date
    public var cachedSchedule: SharedSchedule?
    
    public var displayName: String {
        let trimmedNick = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedNick.isEmpty {
            return trimmedNick
        }
        let trimmedOwner = ownerName.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmedOwner.isEmpty ? "好友 (\(shareCode))" : trimmedOwner
    }
    
    public init(
        shareCode: String,
        ownerName: String,
        nickname: String = "",
        coursesCount: Int = 0,
        accountingCount: Int = 0,
        lastViewedAt: Date = Date(),
        cachedSchedule: SharedSchedule? = nil
    ) {
        self.shareCode = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        self.ownerName = ownerName
        self.nickname = nickname
        self.coursesCount = coursesCount
        self.accountingCount = accountingCount
        self.lastViewedAt = lastViewedAt
        self.cachedSchedule = cachedSchedule
    }
}

