//
//  CampusSharedStore.swift
//  CampusWidget
//
//  Created for Campus v1.
//

import Foundation

/// 跨進程（主 App 與 Widget Extension）共享資料儲存中心
public final class CampusSharedStore {
    public static let shared = CampusSharedStore()
    public static let appGroupId = "group.Router.Campus-v1"
    
    private init() {}
    
    public var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: Self.appGroupId)
    }
    
    public var sharedContainerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroupId)
    }
    
    public func save<T: Encodable>(_ object: T, forKey key: String) {
        guard let data = try? JSONEncoder.robustEncoder.encode(object) else { return }
        if let defaults = sharedDefaults {
            defaults.set(data, forKey: key)
        }
        if let containerURL = sharedContainerURL {
            let fileURL = containerURL.appendingPathComponent("\(key).json")
            try? data.write(to: fileURL, options: .atomic)
        }
        UserDefaults.standard.set(data, forKey: key)
    }
    
    public func load<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        // 1. App Group UserDefaults
        if let defaults = sharedDefaults,
           let data = defaults.data(forKey: key),
           let decoded = try? JSONDecoder.robustDecoder.decode(type, from: data) {
            return decoded
        }
        
        // 2. App Group File Container
        if let containerURL = sharedContainerURL {
            let fileURL = containerURL.appendingPathComponent("\(key).json")
            if let fileData = try? Data(contentsOf: fileURL),
               let decoded = try? JSONDecoder.robustDecoder.decode(type, from: fileData) {
                return decoded
            }
        }
        
        // 3. Local standard UserDefaults fallback
        if let localData = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder.robustDecoder.decode(type, from: localData) {
            return decoded
        }
        
        return nil
    }
}

/// Widget 專用 Supabase 雲端備援查詢服務（當本地 App Group 未同步時自動從雲端獲取最新課程與待辦）
public final class WidgetSupabaseService {
    public static let shared = WidgetSupabaseService()
    
    private let projectURL = "https://dxoobrrjzaovwpyagzgn.supabase.co"
    private let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4b29icnJqemFvdndweWFnemduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDAxNDksImV4cCI6MjEwNDYxNjE0OX0.MRF3i5yXveFpalZOPcquDtsbCa7lg_fDRWMZsA8uXm0"
    
    private init() {}
    
    public struct RemoteCourse: Codable {
        public let id: UUID
        public let name: String
        public let code: String?
        public let classroom: String?
        public let instructor: String?
        public let day_of_week: Int
        public let start_time: String
        public let end_time: String
        public let color_hex: String?
    }
    
    public struct RemoteTodo: Codable {
        public let id: UUID
        public let title: String
        public let notes: String?
        public let start_date: String?
        public let due_date: String?
        public let is_completed: Bool?
        public let priority: String?
        public let category: String?
        public let custom_category_name: String?
        public let custom_category_color_hex: String?
    }
    
    public struct WidgetTransactionItem: Identifiable, Codable {
        public var id: UUID
        public var amount: Double
        public var type: String
        public var categoryId: UUID?
        public var categoryName: String
        public var categoryIcon: String
        public var categoryColorHex: String
        public var paymentMethodName: String
        public var date: Date
        public var notes: String
        public var valueScore: Int
        public var peerRating: Double?
        public var peerFeedback: String?
        public var isSharedWithFriends: Bool
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
            type: String = "expense",
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
            self.valueScore = valueScore
            self.peerRating = peerRating
            self.peerFeedback = peerFeedback
            self.isSharedWithFriends = isSharedWithFriends
            self.relatedInstallmentId = relatedInstallmentId
            self.relatedSplitBillId = relatedSplitBillId
            self.createdAt = createdAt
        }
    }
    
    public func fetchCourses() async -> [RemoteCourse] {
        guard let url = URL(string: "\(projectURL)/rest/v1/courses?select=*&order=start_time.asc") else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 4.0
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                return (try? JSONDecoder.robustDecoder.decode([RemoteCourse].self, from: data)) ?? []
            }
        } catch {
            print("WidgetSupabaseService courses fetch error: \(error)")
        }
        return []
    }
    
    public func fetchTodos() async -> [RemoteTodo] {
        guard let url = URL(string: "\(projectURL)/rest/v1/todos?select=*&is_completed=eq.false&order=due_date.asc") else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 4.0
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                return (try? JSONDecoder.robustDecoder.decode([RemoteTodo].self, from: data)) ?? []
            }
        } catch {
            print("WidgetSupabaseService todos fetch error: \(error)")
        }
        return []
    }
    
    public func insertTransaction(_ item: WidgetTransactionItem) async {
        guard let url = URL(string: "\(projectURL)/rest/v1/accounting_transactions") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.timeoutInterval = 4.0
        
        guard let postData = try? JSONEncoder.robustEncoder.encode(item) else { return }
        request.httpBody = postData
        _ = try? await URLSession.shared.data(for: request)
    }
}

extension JSONDecoder {
    public static var robustDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            if let dateStr = try? container.decode(String.self) {
                let isoFractional = ISO8601DateFormatter()
                isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = isoFractional.date(from: dateStr) {
                    return date
                }
                
                let isoStandard = ISO8601DateFormatter()
                isoStandard.formatOptions = [.withInternetDateTime]
                if let date = isoStandard.date(from: dateStr) {
                    return date
                }
                
                let df = DateFormatter()
                df.locale = Locale(identifier: "en_US_POSIX")
                let formats = [
                    "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZZZZZ",
                    "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ",
                    "yyyy-MM-dd'T'HH:mm:ssZZZZZ",
                    "yyyy-MM-dd'T'HH:mm:ss",
                    "yyyy-MM-dd HH:mm:ss",
                    "yyyy-MM-dd"
                ]
                for format in formats {
                    df.dateFormat = format
                    if let date = df.date(from: dateStr) {
                        return date
                    }
                }
                
                return Date()
            }
            
            if let timestamp = try? container.decode(Double.self) {
                if timestamp > 1_000_000_000_000 {
                    return Date(timeIntervalSince1970: timestamp / 1000.0)
                }
                return Date(timeIntervalSince1970: timestamp)
            }
            
            return Date()
        }
        return decoder
    }
}

extension JSONEncoder {
    public static var robustEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}
