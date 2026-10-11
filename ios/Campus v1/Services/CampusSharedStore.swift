//
//  CampusSharedStore.swift
//  Campus v1
//
//  Created for Campus v1.
//

import Foundation

/// 跨進程（主 App 與 Widget Extension）共享資料儲存中心
public final class CampusSharedStore {
    public static let shared = CampusSharedStore()
    
    public static let appGroupId = "group.Router.Campus-v1"
    
    public let sharedDefaults: UserDefaults?
    public let sharedContainerURL: URL?
    private let diskWriteQueue = DispatchQueue(label: "group.Router.Campus-v1.diskWriteQueue", qos: .utility)
    
    private init() {
        self.sharedDefaults = UserDefaults(suiteName: Self.appGroupId)
        self.sharedContainerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroupId)
    }
    
    /// 儲存物件至 App Group UserDefaults、共享實體檔案，以及本地備援
    public func save<T: Encodable>(_ object: T, forKey key: String) {
        guard let data = try? JSONEncoder.robustEncoder.encode(object) else { return }
        
        // 1. App Group UserDefaults (記憶體快取優先，供 Widget 即時讀取)
        sharedDefaults?.set(data, forKey: key)
        
        // 2. 本地標準 UserDefaults 備援
        UserDefaults.standard.set(data, forKey: key)
        
        // 3. App Group 共享檔案目錄 (背景非同步寫入磁碟，避免阻塞主執行緒)
        if let containerURL = sharedContainerURL {
            let fileURL = containerURL.appendingPathComponent("\(key).json")
            diskWriteQueue.async {
                try? data.write(to: fileURL, options: .atomic)
            }
        }
    }
    
    /// 依序嘗試從 App Group UserDefaults、實體共享檔案與本地快取讀取
    public func load<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        // 1. 優先從 App Group UserDefaults 讀取
        if let defaults = sharedDefaults,
           let data = defaults.data(forKey: key),
           let decoded = try? JSONDecoder.robustDecoder.decode(type, from: data) {
            return decoded
        }
        
        // 2. 次要從 App Group 共享檔案讀取
        if let containerURL = sharedContainerURL {
            let fileURL = containerURL.appendingPathComponent("\(key).json")
            if let fileData = try? Data(contentsOf: fileURL),
               let decoded = try? JSONDecoder.robustDecoder.decode(type, from: fileData) {
                return decoded
            }
        }
        
        // 3. 備援從標準 UserDefaults 讀取
        if let localData = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder.robustDecoder.decode(type, from: localData) {
            return decoded
        }
        
        return nil
    }
}
